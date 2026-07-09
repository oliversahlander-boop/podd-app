"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Home, Library, Search, Settings } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Podcast = {
  id: string;
  name: string;
  thumbnail_url: string | null;
};

type PodcastMemberRow = {
  podcast_id: string;
  podcasts: Podcast | Podcast[] | null;
};

type Profile = {
  id: string;
  avatar_url: string | null;
  display_name: string | null;
  theme: string | null;
};

type AppNotification = {
  actor_id: string | null;
  body: string | null;
  created_at: string;
  id: string;
  isRead: boolean;
  target_url: string | null;
  title: string;
  type: string;
};

type SearchResult = {
  href: string;
  id: string;
  label: string;
  meta: string;
};

type SearchEpisode = {
  description: string | null;
  id: string;
  links: string | null;
  notes: string | null;
  script: string | null;
  status: string | null;
  title: string;
};

type SearchMember = {
  display_name: string | null;
  email: string;
  role: string;
  user_id: string;
};

const filePrefix = "file|";

function fileNameFromUrl(url: string) {
  return decodeURIComponent(url.split("/").pop() || url);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [episodeCounts, setEpisodeCounts] = useState<Record<string, number>>({});
  const [activePodcastId, setActivePodcastId] = useState("");
  const [podcastName, setPodcastName] = useState("");
  const [isCreatingPodcast, setIsCreatingPodcast] = useState(false);
  const [isLoadingPodcasts, setIsLoadingPodcasts] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const isLoginPage = pathname === "/login";
  const activePodcast = podcasts.find((podcast) => podcast.id === activePodcastId);
  const profileLabel = profile?.display_name || user?.email || "Profil";
  const avatarLetter = profileLabel.charAt(0).toUpperCase();
  const unreadCount = notifications.filter((notification) => !notification.isRead)
    .length;

  const setActivePodcast = useCallback((id: string) => {
    setActivePodcastId(id);
    localStorage.setItem("activePodcastId", id);
    window.dispatchEvent(new CustomEvent("active-podcast-changed"));
  }, []);

  const clearActivePodcast = useCallback(() => {
    setActivePodcastId("");
    localStorage.removeItem("activePodcastId");
    window.dispatchEvent(new CustomEvent("active-podcast-changed"));
  }, []);

  const loadProfile = useCallback(async (currentUser: User) => {
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,theme")
      .eq("id", currentUser.id)
      .maybeSingle();

    setProfile(data);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!activePodcastId || !user) {
      setNotifications([]);
      return;
    }

    const [{ data: notificationData, error }, { data: readData }] =
      await Promise.all([
        supabase
          .from("notifications")
          .select("id,actor_id,type,title,body,target_url,created_at")
          .eq("podcast_id", activePodcastId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("notification_reads")
          .select("notification_id")
          .eq("user_id", user.id),
      ]);

    if (error) {
      console.error("Kunde inte hämta notiser:", error);
      return;
    }

    const readIds = new Set(
      ((readData as { notification_id: string }[] | null) || []).map(
        (read) => read.notification_id,
      ),
    );

    setNotifications(
      ((notificationData as Omit<AppNotification, "isRead">[] | null) || []).map(
        (notification) => ({
          ...notification,
          isRead: readIds.has(notification.id),
        }),
      ),
    );
  }, [activePodcastId, user]);

  const loadPodcasts = useCallback(async (currentUser: User) => {
    setIsLoadingPodcasts(true);

    const { data, error } = await supabase
      .from("podcast_members")
      .select("podcast_id,podcasts(id,name,thumbnail_url)")
      .eq("user_id", currentUser.id);

    if (error) {
      setPodcasts([]);
      clearActivePodcast();
      setIsLoadingPodcasts(false);
      return;
    }

    const nextPodcasts = ((data as PodcastMemberRow[] | null) || [])
      .map((row) =>
        Array.isArray(row.podcasts) ? row.podcasts[0] : row.podcasts,
      )
      .filter(Boolean) as Podcast[];
    const storedPodcastId = localStorage.getItem("activePodcastId");
    const nextActivePodcast =
      nextPodcasts.find((podcast) => podcast.id === storedPodcastId)?.id ||
      nextPodcasts[0]?.id ||
      "";

    setPodcasts(nextPodcasts);

    if (nextPodcasts.length > 0) {
      const { data: episodeRows } = await supabase
        .from("episodes")
        .select("podcast_id")
        .in(
          "podcast_id",
          nextPodcasts.map((podcast) => podcast.id),
        );

      const nextEpisodeCounts: Record<string, number> = {};

      nextPodcasts.forEach((podcast) => {
        nextEpisodeCounts[podcast.id] = 0;
      });

      ((episodeRows as { podcast_id: string | null }[] | null) || []).forEach(
        (episode) => {
          if (episode.podcast_id) {
            nextEpisodeCounts[episode.podcast_id] =
              (nextEpisodeCounts[episode.podcast_id] || 0) + 1;
          }
        },
      );

      setEpisodeCounts(nextEpisodeCounts);
    } else {
      setEpisodeCounts({});
    }

    if (nextActivePodcast) {
      setActivePodcast(nextActivePodcast);
    } else {
      clearActivePodcast();
    }

    setIsLoadingPodcasts(false);
  }, [clearActivePodcast, setActivePodcast]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setIsLoading(false);

      if (data.user) {
        loadPodcasts(data.user);
        loadProfile(data.user);
      } else {
        setIsLoadingPodcasts(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        loadPodcasts(session.user);
        loadProfile(session.user);
      } else {
        setPodcasts([]);
        setProfile(null);
        clearActivePodcast();
        setIsLoadingPodcasts(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [clearActivePodcast, loadPodcasts, loadProfile]);

  useEffect(() => {
    if (!user) {
      return;
    }

    function handlePodcastsChanged(event: Event) {
      const detail = (
        event as CustomEvent<{
          id?: string;
          name?: string;
          thumbnail_url?: string | null;
        }>
      ).detail;

      if (detail?.id) {
        setPodcasts((currentPodcasts) =>
          currentPodcasts.map((podcast) =>
            podcast.id === detail.id
              ? {
                  ...podcast,
                  ...(detail.name ? { name: detail.name } : {}),
                  ...(detail.thumbnail_url !== undefined
                    ? { thumbnail_url: detail.thumbnail_url }
                    : {}),
                }
              : podcast,
          ),
        );
      }

      loadPodcasts(user as User);
    }

    window.addEventListener("podcasts-changed", handlePodcastsChanged);

    return () => {
      window.removeEventListener("podcasts-changed", handlePodcastsChanged);
    };
  }, [loadPodcasts, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const currentUser = user;

    function handleProfileChanged(event: Event) {
      const detail = (
        event as CustomEvent<{
          id?: string;
          avatar_url?: string | null;
          display_name?: string | null;
          theme?: string | null;
        }>
      ).detail;

      if (detail?.id === currentUser.id) {
        setProfile((currentProfile) => ({
          id: currentUser.id,
          avatar_url:
            detail.avatar_url !== undefined
              ? detail.avatar_url
              : currentProfile?.avatar_url || null,
          display_name:
            detail.display_name !== undefined
              ? detail.display_name
              : currentProfile?.display_name || null,
          theme:
            detail.theme !== undefined
              ? detail.theme
              : currentProfile?.theme || "dark",
        }));
        return;
      }

      loadProfile(currentUser);
    }

    window.addEventListener("profile-changed", handleProfileChanged);

    return () => {
      window.removeEventListener("profile-changed", handleProfileChanged);
    };
  }, [loadProfile, user]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (user && isLoginPage) {
      router.replace("/");
    }
  }, [isLoading, isLoginPage, router, user]);

  useEffect(() => {
    if (!activePodcastId || !user) {
      return;
    }

    void Promise.resolve().then(() => {
      loadNotifications();
    });

    const channel = supabase
      .channel(`notifications:${activePodcastId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `podcast_id=eq.${activePodcastId}`,
          schema: "public",
          table: "notifications",
        },
        () => {
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePodcastId, loadNotifications, user]);

  useEffect(() => {
    let isMounted = true;

    async function runSearch() {
      const query = searchQuery.trim().toLowerCase();

      if (!query || !activePodcastId) {
        setSearchResults([]);
        return;
      }

      const [{ data: episodeData, error }, { data: memberData }] =
        await Promise.all([
          supabase
            .from("episodes")
            .select("id,title,description,status,notes,script,links")
            .eq("podcast_id", activePodcastId),
          supabase.rpc("get_podcast_members", {
            target_podcast_id: activePodcastId,
          }),
        ]);

      if (error) {
        console.error("Kunde inte söka:", error);
      }

      if (!isMounted) {
        return;
      }

      const results: SearchResult[] = [];

      ((episodeData as SearchEpisode[] | null) || []).forEach((episode) => {
        const searchableText = [
          episode.title,
          episode.description,
          episode.status,
          episode.notes,
          episode.script,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (searchableText.includes(query)) {
          results.push({
            href: `/episodes/${episode.id}`,
            id: `episode-${episode.id}`,
            label: episode.title,
            meta: "Avsnitt",
          });
        }

        (episode.links || "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((line, index) => {
            const [, url, name, type] = line.split("|");
            const materialName = line.startsWith(filePrefix)
              ? name || fileNameFromUrl(url || line)
              : line.replace(/^https?:\/\//, "").split("/")[0] || "Länk";

            if (
              [materialName, type, url || line]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query)
            ) {
              results.push({
                href: `/episodes/${episode.id}`,
                id: `material-${episode.id}-${index}`,
                label: materialName,
                meta: `Material i ${episode.title}`,
              });
            }
          });
      });

      ((memberData as SearchMember[] | null) || []).forEach((member) => {
        const memberText = [member.email, member.display_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (memberText.includes(query)) {
          results.push({
            href: "/settings",
            id: `member-${member.user_id}`,
            label: member.display_name || member.email,
            meta: "Medlem",
          });
        }
      });

      setSearchResults(results.slice(0, 8));
    }

    runSearch();

    return () => {
      isMounted = false;
    };
  }, [activePodcastId, searchQuery]);

  async function signOut() {
    await supabase.auth.signOut();
    setIsProfileMenuOpen(false);
    setIsNotificationMenuOpen(false);
    clearActivePodcast();
    router.replace("/login");
  }

  async function openNotification(notification: AppNotification) {
    if (!user) {
      return;
    }

    if (!notification.isRead) {
      const { error } = await supabase.from("notification_reads").upsert({
        notification_id: notification.id,
        user_id: user.id,
      });

      if (error) {
        console.error("Kunde inte markera notis som läst:", error);
      } else {
        setNotifications((currentNotifications) =>
          currentNotifications.map((currentNotification) =>
            currentNotification.id === notification.id
              ? { ...currentNotification, isRead: true }
              : currentNotification,
          ),
        );
      }
    }

    setIsNotificationMenuOpen(false);

    if (notification.target_url) {
      router.push(notification.target_url);
    }
  }

  async function createPodcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !podcastName.trim()) {
      return;
    }

    setIsCreatingPodcast(true);

    const { data: podcast, error } = await supabase
      .from("podcasts")
      .insert({
        name: podcastName.trim(),
        created_by: user.id,
      })
      .select("id,name,thumbnail_url")
      .single();

    if (!error && podcast) {
      const { error: memberError } = await supabase
        .from("podcast_members")
        .insert({
          podcast_id: podcast.id,
          role: "owner",
          user_id: user.id,
        });

      if (!memberError) {
        const nextPodcasts = [...podcasts, podcast];

        setPodcasts(nextPodcasts);
        setPodcastName("");
        setActivePodcast(podcast.id);
      }
    }

    setIsCreatingPodcast(false);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm text-zinc-500">
        Laddar...
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  if (isLoadingPodcasts) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] text-sm text-zinc-500">
        Laddar...
      </div>
    );
  }

  if (podcasts.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-zinc-100">
        <section className="w-full max-w-md rounded-lg bg-[#111111] p-8">
          <p className="text-sm font-semibold tracking-[0.2em] text-[#1DB954] uppercase">
            Podd
          </p>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">
            Skapa podcast
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Skapa första podcasten för att fortsätta.
          </p>

          <form className="mt-8 flex flex-col gap-4" onSubmit={createPodcast}>
            <input
              className="rounded-lg border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
              onChange={(event) => setPodcastName(event.target.value)}
              placeholder="Podcastnamn"
              type="text"
              value={podcastName}
            />
            <button
              className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreatingPodcast}
              type="submit"
            >
              {isCreatingPodcast ? "Skapar..." : "Skapa podcast"}
            </button>
          </form>

          <button
            className="mt-4 rounded-full bg-[#181818] px-6 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
            onClick={signOut}
            type="button"
          >
            Logga ut
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#050505] md:flex-row">
      <aside className="hidden w-72 shrink-0 border-r border-zinc-900 bg-[#050505] px-5 py-6 md:block">
        <Link
          className="block px-3 text-sm font-semibold tracking-[0.22em] text-[#1DB954] uppercase"
          href="/"
        >
          Podd
        </Link>

        <nav className="mt-8 flex flex-col gap-1.5">
          <Link
            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition duration-200 ${
              pathname === "/"
                ? "bg-[#181818] text-white shadow-lg shadow-black/20"
                : "text-zinc-300 hover:bg-[#111111] hover:text-white"
            }`}
            href="/"
          >
            <Home size={18} strokeWidth={2} />
            Start
          </Link>
          <Link
            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition duration-200 ${
              pathname.startsWith("/episodes")
                ? "bg-[#181818] text-white shadow-lg shadow-black/20"
                : "text-zinc-300 hover:bg-[#111111] hover:text-white"
            }`}
            href="/episodes"
          >
            <Library size={18} strokeWidth={2} />
            Avsnitt
          </Link>
          <Link
            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition duration-200 ${
              pathname === "/settings"
                ? "bg-[#181818] text-white shadow-lg shadow-black/20"
                : "text-zinc-300 hover:bg-[#111111] hover:text-white"
            }`}
            href="/settings"
          >
            <Settings size={18} strokeWidth={2} />
            Inställningar
          </Link>
        </nav>

        <div className="mt-10">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
            Podcaster
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            {podcasts.map((podcast) => {
              const isActive = podcast.id === activePodcastId;

              return (
                <button
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition duration-200 ${
                    isActive
                      ? "bg-[#181818] text-white shadow-lg shadow-black/20"
                      : "text-zinc-400 hover:bg-[#111111] hover:text-white"
                  }`}
                  key={podcast.id}
                  onClick={() => setActivePodcast(podcast.id)}
                  type="button"
                >
                  {podcast.thumbnail_url ? (
                    <img
                      alt=""
                      className="size-11 shrink-0 rounded-lg object-cover shadow-md shadow-black/30"
                      src={podcast.thumbnail_url}
                    />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#181818] text-sm font-bold text-zinc-300 shadow-md shadow-black/30">
                      {podcast.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {podcast.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {episodeCounts[podcast.id] || 0} avsnitt
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <form className="mt-5 flex flex-col gap-2 px-1" onSubmit={createPodcast}>
            <input
              className="rounded-xl border border-zinc-900 bg-[#111111] px-3.5 py-2.5 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/10"
              onChange={(event) => setPodcastName(event.target.value)}
              placeholder="Ny podd"
              type="text"
              value={podcastName}
            />
            <button
              className="rounded-full bg-[#181818] px-4 py-2.5 text-left text-sm font-bold text-zinc-200 ring-1 ring-zinc-900 transition duration-200 hover:scale-[1.01] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreatingPodcast}
              type="submit"
            >
              {isCreatingPodcast ? "Skapar..." : "+ Ny podd"}
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-zinc-900 bg-[#050505]/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="relative shrink-0">
              <button
                className="flex size-10 items-center justify-center rounded-full bg-[#111111] text-sm font-bold text-zinc-200 ring-1 ring-zinc-900"
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                {profile?.avatar_url ? (
                  <img
                    alt=""
                    className="size-10 rounded-full object-cover"
                    src={profile.avatar_url}
                  />
                ) : (
                  avatarLetter
                )}
              </button>

              {isProfileMenuOpen ? (
                <div className="absolute left-0 top-12 z-20 w-72 rounded-xl bg-[#181818] p-2 shadow-2xl shadow-black/50 ring-1 ring-zinc-800">
                  <div className="border-b border-zinc-800 px-3 py-4">
                    <p className="truncate text-sm font-semibold text-white">
                      {profile?.display_name || "Inget profilnamn"}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {user.email}
                    </p>
                  </div>
                  <Link
                    className="mt-2 block rounded-md px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-[#222222] hover:text-white"
                    href="/profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    Profil
                  </Link>
                  <Link
                    className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-[#222222] hover:text-white"
                    href="/settings"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    Inställningar
                  </Link>
                  <button
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-200 transition hover:bg-[#222222] hover:text-white"
                    onClick={signOut}
                    type="button"
                  >
                    Logga ut
                  </button>
                </div>
              ) : null}
            </div>

            <div className="min-w-0 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Aktiv podcast
              </p>
              <h1 className="truncate text-sm font-semibold text-white">
                {activePodcast?.name || "Podd"}
              </h1>
            </div>

            <div className="relative shrink-0">
              <button
                aria-label="Notiser"
                className="relative flex size-10 items-center justify-center rounded-full bg-[#111111] text-zinc-300 ring-1 ring-zinc-900 transition hover:bg-[#181818] hover:text-white"
                onClick={() =>
                  setIsNotificationMenuOpen((isOpen) => !isOpen)
                }
                type="button"
              >
                <Bell size={17} strokeWidth={2} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[#1DB954] px-1.5 text-[10px] font-bold text-black">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {isNotificationMenuOpen ? (
                <div className="absolute right-0 top-12 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-[#181818] p-2 shadow-2xl shadow-black/50 ring-1 ring-zinc-800">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Notiser
                  </p>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <button
                        className="block w-full rounded-lg px-3 py-3 text-left transition hover:bg-[#222222]"
                        key={notification.id}
                        onClick={() => openNotification(notification)}
                        type="button"
                      >
                        <span className="flex items-start gap-2">
                          <span
                            className={`mt-1 size-2 rounded-full ${
                              notification.isRead
                                ? "bg-zinc-700"
                                : "bg-[#1DB954]"
                            }`}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-white">
                              {notification.title}
                            </span>
                            {notification.body ? (
                              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                                {notification.body}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    ))}
                    {notifications.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-zinc-500">
                        Inga notiser
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {podcasts.map((podcast) => {
              const isActive = podcast.id === activePodcastId;

              return (
                <button
                  className={`flex min-w-44 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${
                    isActive
                      ? "bg-[#181818] text-white"
                      : "bg-[#0c0c0c] text-zinc-400"
                  }`}
                  key={podcast.id}
                  onClick={() => setActivePodcast(podcast.id)}
                  type="button"
                >
                  {podcast.thumbnail_url ? (
                    <img
                      alt=""
                      className="size-9 shrink-0 rounded-lg object-cover"
                      src={podcast.thumbnail_url}
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#181818] text-xs font-bold text-zinc-300">
                      {podcast.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">
                      {podcast.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500">
                      {episodeCounts[podcast.id] || 0} avsnitt
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative mt-3 flex h-10 items-center gap-3 rounded-full bg-[#111111] px-4 text-zinc-500 ring-1 ring-zinc-900 focus-within:ring-[#1DB954]/40">
            <Search size={16} strokeWidth={2} />
            <input
              className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Sök"
              type="search"
              value={searchQuery}
            />
            {searchQuery.trim() ? (
              <div className="absolute left-0 top-12 z-20 w-full rounded-xl bg-[#181818] p-2 shadow-2xl shadow-black/50 ring-1 ring-zinc-800">
                {searchResults.map((result) => (
                  <Link
                    className="block rounded-lg px-3 py-3 transition hover:bg-[#222222]"
                    href={result.href}
                    key={result.id}
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                  >
                    <span className="block truncate text-sm font-semibold text-white">
                      {result.label}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {result.meta}
                    </span>
                  </Link>
                ))}
                {searchResults.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-zinc-500">
                    Inga resultat
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <header className="sticky top-0 z-30 hidden h-20 items-center justify-between border-b border-zinc-900 bg-[#050505]/95 px-10 backdrop-blur md:flex lg:px-14">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
              Aktiv podcast
            </p>
            <h1 className="mt-1 truncate text-lg font-semibold text-white">
              {activePodcast?.name || "Podd"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-80 items-center gap-3 rounded-full bg-[#111111] px-4 text-zinc-500 ring-1 ring-zinc-900 transition duration-200 focus-within:ring-[#1DB954]/40">
              <Search size={18} strokeWidth={2} />
              <input
                className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Sök"
                type="search"
                value={searchQuery}
              />
              {searchQuery.trim() ? (
                <div className="absolute left-0 top-14 z-20 w-full rounded-xl bg-[#181818] p-2 shadow-2xl shadow-black/50 ring-1 ring-zinc-800">
                  {searchResults.map((result) => (
                    <Link
                      className="block rounded-lg px-3 py-3 transition hover:bg-[#222222]"
                      href={result.href}
                      key={result.id}
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                    >
                      <span className="block truncate text-sm font-semibold text-white">
                        {result.label}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {result.meta}
                      </span>
                    </Link>
                  ))}
                  {searchResults.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-zinc-500">
                      Inga resultat
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                aria-label="Notiser"
                className="relative flex size-11 items-center justify-center rounded-full bg-[#111111] text-zinc-300 ring-1 ring-zinc-900 transition duration-200 hover:scale-[1.03] hover:bg-[#181818] hover:text-white"
                onClick={() =>
                  setIsNotificationMenuOpen((isOpen) => !isOpen)
                }
                type="button"
              >
                <Bell size={18} strokeWidth={2} />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[#1DB954] px-1.5 text-[10px] font-bold text-black">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {isNotificationMenuOpen ? (
                <div className="absolute right-0 top-14 z-20 w-80 rounded-xl bg-[#181818] p-2 shadow-2xl shadow-black/50 ring-1 ring-zinc-800">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Notiser
                  </p>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <button
                        className="block w-full rounded-lg px-3 py-3 text-left transition hover:bg-[#222222]"
                        key={notification.id}
                        onClick={() => openNotification(notification)}
                        type="button"
                      >
                        <span className="flex items-start gap-2">
                          <span
                            className={`mt-1 size-2 rounded-full ${
                              notification.isRead
                                ? "bg-zinc-700"
                                : "bg-[#1DB954]"
                            }`}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-white">
                              {notification.title}
                            </span>
                            {notification.body ? (
                              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                                {notification.body}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    ))}
                    {notifications.length === 0 ? (
                      <p className="px-3 py-6 text-sm text-zinc-500">
                        Inga notiser
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-full bg-[#111111] p-1 pr-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-900 transition duration-200 hover:scale-[1.02] hover:bg-[#181818] hover:text-white"
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                {profile?.avatar_url ? (
                  <img
                    alt=""
                    className="size-9 rounded-full object-cover"
                    src={profile.avatar_url}
                  />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#1DB954] text-sm font-bold text-black">
                    {avatarLetter}
                  </span>
                )}
                <ChevronDown size={16} strokeWidth={2} />
              </button>

              {isProfileMenuOpen ? (
                <div className="absolute right-0 top-14 z-20 w-80 rounded-xl bg-[#181818] p-2 shadow-2xl shadow-black/50 ring-1 ring-zinc-800 transition duration-200">
                  <div className="border-b border-zinc-800 px-3 py-4">
                    <p className="truncate text-sm font-semibold text-white">
                      {profile?.display_name || "Inget profilnamn"}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {user.email}
                    </p>
                  </div>

                  <Link
                    className="mt-2 block rounded-md px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-[#222222] hover:text-white"
                    href="/profile"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    Profil
                  </Link>
                  <Link
                    className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-[#222222] hover:text-white"
                    href="/settings"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    Inställningar
                  </Link>
                  <button
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-200 transition hover:bg-[#222222] hover:text-white"
                    onClick={signOut}
                    type="button"
                  >
                    Logga ut
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="pb-24 md:pb-0">{children}</div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900 bg-[#050505]/95 px-4 pb-4 pt-2 backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-3 gap-2 rounded-2xl bg-[#111111] p-1.5 shadow-2xl shadow-black/50 ring-1 ring-zinc-900">
            <Link
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
                pathname === "/"
                  ? "bg-[#1DB954] text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
              href="/"
            >
              <Home size={18} strokeWidth={2} />
              Start
            </Link>
            <Link
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
                pathname.startsWith("/episodes")
                  ? "bg-[#1DB954] text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
              href="/episodes"
            >
              <Library size={18} strokeWidth={2} />
              Avsnitt
            </Link>
            <Link
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${
                pathname === "/settings"
                  ? "bg-[#1DB954] text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
              href="/settings"
            >
              <Settings size={18} strokeWidth={2} />
              Inställningar
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
