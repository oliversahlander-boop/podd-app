"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, LinkIcon, Plus, Settings } from "lucide-react";
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

export default function Home() {
  const [activePodcastId, setActivePodcastId] = useState("");
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);

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
        return;
      }

      const [{ data: podcastData }, { data: episodeData }] =
        await Promise.all([
          supabase
            .from("podcasts")
            .select("id,name,thumbnail_url")
            .eq("id", activePodcastId)
            .single(),
          supabase
            .from("episodes")
            .select("id,title,status,created_at,links")
            .eq("podcast_id", activePodcastId)
            .order("created_at", { ascending: false }),
        ]);

      if (!isMounted) {
        return;
      }

      setPodcast(podcastData);
      setEpisodes((episodeData as Episode[] | null) || []);
    }

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, [activePodcastId]);

  const latestEpisodes = episodes.slice(0, 5);
  const fileCount = useMemo(
    () =>
      episodes.reduce((total, episode) => total + getFileCount(episode.links), 0),
    [episodes],
  );
  const recentMaterial = useMemo(
    () => getRecentMaterial(episodes).slice(0, 5),
    [episodes],
  );

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-zinc-100 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-6 border-b border-zinc-900 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-end gap-6">
            {podcast?.thumbnail_url ? (
              <img
                alt=""
                className="size-28 rounded-lg object-cover shadow-2xl sm:size-36"
                src={podcast.thumbnail_url}
              />
            ) : (
              <div className="flex size-28 items-center justify-center rounded-lg bg-[#181818] text-5xl font-bold text-zinc-300 shadow-2xl sm:size-36">
                {(podcast?.name || "P").charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold tracking-[0.2em] text-[#1DB954] uppercase">
                Start
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                {podcast?.name || "Podd"}
              </h1>
              <p className="mt-4 text-sm text-zinc-400">
                {episodes.length} avsnitt · {fileCount} filer ·{" "}
                {recentMaterial.length} material
              </p>
            </div>
          </div>
        </header>

        <section>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-white">
              Senaste avsnitt
            </h2>
            <Link
              className="text-sm font-bold text-[#1DB954] hover:text-[#22d760]"
              href="/episodes"
            >
              Visa alla
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {latestEpisodes.map((episode) => {
              const thumbnail = getThumbnail(episode.links);

              return (
                <Link
                  className="rounded-lg bg-[#181818] p-3 transition hover:bg-[#202020]"
                  href={`/episodes/${episode.id}`}
                  key={episode.id}
                >
                  {thumbnail ? (
                    <img
                      alt=""
                      className="aspect-square w-full rounded object-cover"
                      src={thumbnail}
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded bg-[#111111] text-3xl font-bold text-zinc-500">
                      {episode.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <h3 className="mt-4 truncate text-sm font-semibold text-white">
                    {episode.title}
                  </h3>
                  <p className="mt-2 truncate text-xs font-medium text-zinc-500">
                    {episode.status || "Idé"}
                  </p>
                </Link>
              );
            })}
          </div>

          {latestEpisodes.length === 0 ? (
            <p className="text-sm text-zinc-500">Inga avsnitt ännu.</p>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-2xl font-semibold text-white">Snabbstart</h2>
            <div className="mt-5 grid gap-3">
              <Link
                className="flex items-center justify-between rounded-lg bg-[#181818] px-4 py-4 text-sm font-semibold text-white transition hover:bg-[#202020]"
                href="/episodes"
              >
                <span className="flex items-center gap-3">
                  <Plus size={18} strokeWidth={2} />
                  Skapa avsnitt
                </span>
                <ArrowRight size={18} strokeWidth={2} />
              </Link>
              <Link
                className="flex items-center justify-between rounded-lg bg-[#181818] px-4 py-4 text-sm font-semibold text-white transition hover:bg-[#202020]"
                href="/episodes"
              >
                <span className="flex items-center gap-3">
                  <FileText size={18} strokeWidth={2} />
                  Gå till avsnitt
                </span>
                <ArrowRight size={18} strokeWidth={2} />
              </Link>
              <Link
                className="flex items-center justify-between rounded-lg bg-[#181818] px-4 py-4 text-sm font-semibold text-white transition hover:bg-[#202020]"
                href="/settings"
              >
                <span className="flex items-center gap-3">
                  <Settings size={18} strokeWidth={2} />
                  Inställningar
                </span>
                <ArrowRight size={18} strokeWidth={2} />
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white">
              Material nyligen
            </h2>
            <div className="mt-5 space-y-3">
              {recentMaterial.map((item: MaterialItem) => (
                <a
                  className="flex items-center justify-between gap-4 rounded-lg bg-[#181818] px-4 py-4 transition hover:bg-[#202020]"
                  href={item.url}
                  key={`${item.episodeId}-${item.url}-${item.name}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {item.type === "file" ? (
                      <FileText
                        className="shrink-0 text-[#1DB954]"
                        size={18}
                        strokeWidth={2}
                      />
                    ) : (
                      <LinkIcon
                        className="shrink-0 text-[#1DB954]"
                        size={18}
                        strokeWidth={2}
                      />
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
                  <ArrowRight
                    className="shrink-0 text-zinc-500"
                    size={18}
                    strokeWidth={2}
                  />
                </a>
              ))}
            </div>

            {recentMaterial.length === 0 ? (
              <p className="mt-5 text-sm text-zinc-500">
                Inget material sparat ännu.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
