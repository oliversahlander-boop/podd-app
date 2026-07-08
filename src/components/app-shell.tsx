"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Search } from "lucide-react";
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
  display_name: string | null;
};

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [activePodcastId, setActivePodcastId] = useState("");
  const [podcastName, setPodcastName] = useState("");
  const [isCreatingPodcast, setIsCreatingPodcast] = useState(false);
  const [isLoadingPodcasts, setIsLoadingPodcasts] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const isLoginPage = pathname === "/login";
  const profileLabel = profile?.display_name || user?.email || "Profil";
  const avatarLetter = profileLabel.charAt(0).toUpperCase();

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
      .select("id,display_name")
      .eq("id", currentUser.id)
      .maybeSingle();

    setProfile(data);
  }, []);

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
          display_name?: string | null;
        }>
      ).detail;

      if (detail?.id === currentUser.id) {
        setProfile({
          id: currentUser.id,
          display_name: detail.display_name || null,
        });
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

  async function signOut() {
    await supabase.auth.signOut();
    setIsProfileMenuOpen(false);
    clearActivePodcast();
    router.replace("/login");
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
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-900 bg-[#050505] px-6 py-8 lg:block">
        <Link
          className="text-sm font-semibold tracking-[0.2em] text-[#1DB954] uppercase"
          href="/"
        >
          Podd
        </Link>

        <nav className="mt-10 flex flex-col gap-2">
          <Link
            className="rounded-lg px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-[#111111] hover:text-white"
            href="/"
          >
            Start
          </Link>
          <Link
            className="rounded-lg px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-[#111111] hover:text-white"
            href="/episodes"
          >
            Avsnitt
          </Link>
          <Link
            className="rounded-lg px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-[#111111] hover:text-white"
            href="/settings"
          >
            Inställningar
          </Link>
        </nav>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
            Podcasts
          </p>
          <div className="mt-3 flex flex-col gap-1">
            {podcasts.map((podcast) => {
              const isActive = podcast.id === activePodcastId;

              return (
                <button
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                    isActive
                      ? "bg-[#111111] text-white"
                      : "text-zinc-400 hover:bg-[#111111] hover:text-white"
                  }`}
                  key={podcast.id}
                  onClick={() => setActivePodcast(podcast.id)}
                  type="button"
                >
                  {podcast.thumbnail_url ? (
                    <img
                      alt=""
                      className="size-8 shrink-0 rounded object-cover"
                      src={podcast.thumbnail_url}
                    />
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded bg-[#181818] text-xs font-bold text-zinc-300">
                      {podcast.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="truncate">{podcast.name}</span>
                </button>
              );
            })}
          </div>

          <form className="mt-4 flex flex-col gap-2" onSubmit={createPodcast}>
            <input
              className="rounded-md border border-zinc-900 bg-[#111111] px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-[#1DB954]"
              onChange={(event) => setPodcastName(event.target.value)}
              placeholder="Ny podd"
              type="text"
              value={podcastName}
            />
            <button
              className="rounded-full bg-[#111111] px-4 py-2 text-left text-sm font-bold text-zinc-200 ring-1 ring-zinc-900 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCreatingPodcast}
              type="submit"
            >
              {isCreatingPodcast ? "Skapar..." : "+ Ny podd"}
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-20 items-center justify-between border-b border-zinc-900 bg-[#050505] px-6 sm:px-10 lg:px-16">
          <h1 className="text-lg font-semibold text-white">Podd</h1>

          <div className="flex items-center gap-3">
            <label className="hidden h-10 w-72 items-center gap-3 rounded-full bg-[#111111] px-4 text-zinc-500 ring-1 ring-zinc-900 sm:flex">
              <Search size={18} strokeWidth={2} />
              <input
                className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
                placeholder="Sök"
                type="search"
              />
            </label>

            <button
              aria-label="Notiser"
              className="flex size-10 items-center justify-center rounded-full bg-[#111111] text-zinc-300 ring-1 ring-zinc-900 transition hover:text-white"
              type="button"
            >
              <Bell size={18} strokeWidth={2} />
            </button>

            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-full bg-[#111111] p-1 pr-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-900 transition hover:text-white"
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-[#1DB954] text-sm font-bold text-black">
                  {avatarLetter}
                </span>
                <ChevronDown size={16} strokeWidth={2} />
              </button>

              {isProfileMenuOpen ? (
                <div className="absolute right-0 top-12 z-20 w-72 rounded-lg bg-[#181818] p-2 shadow-2xl ring-1 ring-zinc-800">
                  <div className="border-b border-zinc-800 px-3 py-3">
                    <p className="truncate text-sm font-semibold text-white">
                      {profile?.display_name || "Ingen profilnamn"}
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

        {children}
      </div>
    </div>
  );
}
