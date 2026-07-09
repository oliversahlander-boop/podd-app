"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LinkIcon,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Podcast = {
  id: string;
  name: string;
  thumbnail_url: string | null;
};

type Episode = {
  id: string;
  title: string;
  status: string | null;
  created_at: string;
  links: string | null;
  notes: string | null;
};

type Member = {
  email: string;
  role: string;
  user_id: string;
};

type MaterialItem = {
  episodeId: string;
  episodeTitle: string;
  name: string;
  type: "file" | "link";
  url: string;
};

const filePrefix = "file|";
const thumbnailPrefix = "thumbnail|";

function getThumbnail(links: string | null) {
  return links
    ?.split("\n")
    .find((line) => line.startsWith(thumbnailPrefix))
    ?.split("|")[1];
}

function getFileCount(links: string | null) {
  return (
    links
      ?.split("\n")
      .filter((line) => line.startsWith(filePrefix))
      .length || 0
  );
}

function getRecentMaterial(episodes: Episode[]) {
  return episodes.flatMap((episode) =>
    (episode.links || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith(thumbnailPrefix))
      .map((line) => {
        if (line.startsWith(filePrefix)) {
          const [, url, name] = line.split("|");

          return {
            episodeId: episode.id,
            episodeTitle: episode.title,
            name: name || "Fil",
            type: "file" as const,
            url,
          };
        }

        return {
          episodeId: episode.id,
          episodeTitle: episode.title,
          name: line.replace(/^https?:\/\//, "").split("/")[0] || "Länk",
          type: "link" as const,
          url: line,
        };
      }),
  );
}

function statusTone(status: string | null) {
  if (status === "Publicerad") {
    return "bg-[#1DB954] text-black";
  }

  if (status === "Klar för publicering") {
    return "bg-[#1DB954]/20 text-[#1DB954]";
  }

  return "bg-zinc-800 text-zinc-300";
}

function roleLabel(role: string) {
  if (role === "owner") return "Ägare";
  if (role === "admin") return "Administratör";
  if (role === "editor") return "Redaktör";

  return "Läsbehörighet";
}

export default function Home() {
  const [activePodcastId, setActivePodcastId] = useState("");
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    function loadActivePodcastId() {
      setActivePodcastId(localStorage.getItem("activePodcastId") || "");
    }

    loadActivePodcastId();
    window.addEventListener("active-podcast-changed", loadActivePodcastId);
    window.addEventListener("podcasts-changed", loadActivePodcastId);

    return () => {
      window.removeEventListener("active-podcast-changed", loadActivePodcastId);
      window.removeEventListener("podcasts-changed", loadActivePodcastId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      if (!activePodcastId) {
        setPodcast(null);
        setEpisodes([]);
        setMembers([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const [
        { data: podcastData },
        { data: episodeData },
        { data: memberData },
      ] = await Promise.all([
        supabase
          .from("podcasts")
          .select("id,name,thumbnail_url")
          .eq("id", activePodcastId)
          .single(),
        supabase
          .from("episodes")
          .select("id,title,status,created_at,links,notes")
          .eq("podcast_id", activePodcastId)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_podcast_members", {
          target_podcast_id: activePodcastId,
        }),
      ]);

      if (!isMounted) {
        return;
      }

      setPodcast(podcastData);
      setEpisodes((episodeData as Episode[] | null) || []);
      setMembers((memberData as Member[] | null) || []);
      setIsLoading(false);
    }

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, [activePodcastId]);

  const latestEpisodes = episodes.slice(0, 5);
  const continueEpisodes = episodes
    .filter((episode) => episode.status !== "Publicerad")
    .slice(0, 3);
  const recentMaterial = useMemo(
    () => getRecentMaterial(episodes).slice(0, 4),
    [episodes],
  );
  const fileCount = useMemo(
    () =>
      episodes.reduce((total, episode) => total + getFileCount(episode.links), 0),
    [episodes],
  );
  const publishedCount = episodes.filter(
    (episode) => episode.status === "Publicerad",
  ).length;

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-zinc-100 sm:px-10 sm:py-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-10">
        <header className="rounded-2xl bg-[#111111] p-4 shadow-2xl shadow-black/30 ring-1 ring-zinc-900 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
              {podcast?.thumbnail_url ? (
                <img
                  alt=""
                  className="size-24 rounded-2xl object-cover shadow-2xl shadow-black/50 sm:size-36"
                  src={podcast.thumbnail_url}
                />
              ) : (
                <div className="flex size-24 items-center justify-center rounded-2xl bg-[#181818] text-4xl font-bold text-zinc-300 shadow-2xl shadow-black/40 sm:size-36 sm:text-6xl">
                  {(podcast?.name || "P").charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1DB954]">
                  Podcastöversikt
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-6xl">
                  {podcast?.name || "Podd"}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                  Överblick över produktion, material och nästa steg.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-96 sm:gap-3">
              {[
                ["Avsnitt", episodes.length],
                ["Publicerade", publishedCount],
                ["Material", fileCount],
              ].map(([label, value]) => (
                <div
                  className="rounded-xl bg-[#181818] p-3 ring-1 ring-zinc-900 sm:p-4"
                  key={label}
                >
                  <p className="text-xl font-semibold text-white sm:text-2xl">{value}</p>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {isLoading ? (
          <section className="grid gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                className="h-48 animate-pulse rounded-2xl bg-[#111111]"
                key={item}
              />
            ))}
          </section>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl bg-[#111111] p-6 shadow-xl shadow-black/20 ring-1 ring-zinc-900">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-semibold text-white">
                    Fortsätt arbeta
                  </h2>
                  <Clock3 className="text-zinc-500" size={20} />
                </div>

                <div className="mt-6 grid gap-3">
                  {continueEpisodes.map((episode) => (
                    <Link
                      className="group flex items-center gap-4 rounded-xl bg-[#181818] p-3 transition duration-200 hover:-translate-y-0.5 hover:bg-[#202020]"
                      href={`/episodes/${episode.id}`}
                      key={episode.id}
                    >
                      {getThumbnail(episode.links) ? (
                        <img
                          alt=""
                          className="size-14 rounded-lg object-cover"
                          src={getThumbnail(episode.links)}
                        />
                      ) : (
                        <div className="flex size-14 items-center justify-center rounded-lg bg-[#111111] text-lg font-bold text-zinc-500">
                          {episode.title.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">
                          {episode.title}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500">
                          {episode.status || "Idé"}
                        </span>
                      </span>
                      <ArrowRight
                        className="text-zinc-600 transition group-hover:text-white"
                        size={18}
                      />
                    </Link>
                  ))}
                </div>

                {continueEpisodes.length === 0 ? (
                  <div className="mt-6 rounded-xl bg-[#181818] p-6 text-sm text-zinc-500">
                    Inget pågående arbete just nu.
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl bg-[#111111] p-6 shadow-xl shadow-black/20 ring-1 ring-zinc-900">
                <h2 className="text-2xl font-semibold text-white">
                  Senaste aktivitet
                </h2>
                <div className="mt-6 space-y-4">
                  {latestEpisodes.slice(0, 4).map((episode) => (
                    <div className="flex gap-3" key={episode.id}>
                      <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#181818] text-[#1DB954]">
                        <CheckCircle2 size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {episode.title}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Status: {episode.status || "Idé"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold text-white">
                  Senaste avsnitt
                </h2>
                <Link
                  className="text-sm font-bold text-[#1DB954] transition hover:text-[#22d760]"
                  href="/episodes"
                >
                  Visa alla
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {latestEpisodes.map((episode) => (
                  <Link
                    className="group rounded-2xl bg-[#181818] p-3 shadow-lg shadow-black/20 transition duration-200 hover:-translate-y-1 hover:bg-[#202020]"
                    href={`/episodes/${episode.id}`}
                    key={episode.id}
                  >
                    {getThumbnail(episode.links) ? (
                      <img
                        alt=""
                        className="aspect-square w-full rounded-xl object-cover shadow-lg shadow-black/30 transition duration-300 group-hover:scale-[1.02]"
                        src={getThumbnail(episode.links)}
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-[#111111] text-3xl font-bold text-zinc-500">
                        {episode.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h3 className="mt-4 truncate text-sm font-semibold text-white">
                      {episode.title}
                    </h3>
                    <span
                      className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(
                        episode.status,
                      )}`}
                    >
                      {episode.status || "Idé"}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl bg-[#111111] p-6 shadow-xl shadow-black/20 ring-1 ring-zinc-900">
                <h2 className="text-2xl font-semibold text-white">
                  Snabbåtgärder
                </h2>
                <div className="mt-6 grid gap-3">
                  {[
                    ["Skapa avsnitt", "/episodes", Plus],
                    ["Gå till avsnitt", "/episodes", FileText],
                    ["Inställningar", "/settings", Settings],
                  ].map(([label, href, Icon]) => (
                    <Link
                      className="flex items-center justify-between rounded-xl bg-[#181818] px-4 py-4 text-sm font-semibold text-white transition duration-200 hover:bg-[#202020]"
                      href={href as string}
                      key={label as string}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={18} />
                        {label as string}
                      </span>
                      <ArrowRight size={18} />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#111111] p-6 shadow-xl shadow-black/20 ring-1 ring-zinc-900">
                <h2 className="flex items-center gap-2 text-2xl font-semibold text-white">
                  <Users size={22} />
                  Medlemmar
                </h2>
                <div className="mt-6 space-y-3">
                  {members.slice(0, 5).map((member) => (
                    <div
                      className="flex items-center gap-3 rounded-xl bg-[#181818] p-3"
                      key={member.user_id}
                    >
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#1DB954] text-sm font-bold text-black">
                        {member.email.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">
                          {member.email}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {roleLabel(member.role)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#111111] p-6 shadow-xl shadow-black/20 ring-1 ring-zinc-900">
                <h2 className="flex items-center gap-2 text-2xl font-semibold text-white">
                  <CalendarDays size={22} />
                  Kommande uppgifter
                </h2>
                <div className="mt-6 space-y-3">
                  {[
                    "Välj nästa avsnitt att spela in",
                    "Gå igenom material",
                    "Uppdatera anteckningar",
                  ].map((task) => (
                    <div
                      className="flex items-center gap-3 rounded-xl bg-[#181818] p-3 text-sm font-medium text-zinc-300"
                      key={task}
                    >
                      <span className="size-2 rounded-full bg-[#1DB954]" />
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-[#111111] p-6 shadow-xl shadow-black/20 ring-1 ring-zinc-900">
              <h2 className="text-2xl font-semibold text-white">
                Senast uppladdat material
              </h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {recentMaterial.map((item: MaterialItem) => (
                  <a
                    className="flex items-center justify-between gap-4 rounded-xl bg-[#181818] px-4 py-4 transition duration-200 hover:bg-[#202020]"
                    href={item.url}
                    key={`${item.episodeId}-${item.url}-${item.name}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {item.type === "file" ? (
                        <FileText className="shrink-0 text-[#1DB954]" size={18} />
                      ) : (
                        <LinkIcon className="shrink-0 text-[#1DB954]" size={18} />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">
                          {item.name}
                        </span>
                        <span className="mt-1 block truncate text-xs text-zinc-500">
                          {item.episodeTitle}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="shrink-0 text-zinc-500" size={18} />
                  </a>
                ))}
              </div>

              {recentMaterial.length === 0 ? (
                <p className="mt-5 rounded-xl bg-[#181818] p-5 text-sm text-zinc-500">
                  Inget material uppladdat ännu.
                </p>
              ) : null}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
