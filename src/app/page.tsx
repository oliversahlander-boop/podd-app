"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileAudio,
  FileText,
  Flame,
  Plus,
  Upload,
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
  description: string | null;
  status: string | null;
  created_at: string;
  links: string | null;
  notes: string | null;
  recording_date: string | null;
  publish_date: string | null;
};

type Notification = {
  body: string | null;
  created_at: string;
  id: string;
  target_url: string | null;
  title: string;
  type: string;
};

type ProductionFile = {
  category: string;
  content_type: string | null;
  created_at: string;
  episode_id: string;
  filename: string;
  id: string;
  public_url: string;
  size_bytes: number;
};

const thumbnailPrefix = "thumbnail|";
const productionStages = [
  "Idea",
  "Research",
  "Script",
  "Recording",
  "Editing",
  "Approved",
  "Published",
];

function getThumbnail(links: string | null) {
  return links
    ?.split("\n")
    .find((line) => line.startsWith(thumbnailPrefix))
    ?.split("|")[1];
}

function normalizeStage(status: string | null) {
  if (status === "Idé") return "Idea";
  if (status === "Manus") return "Script";
  if (status === "Inspelning") return "Recording";
  if (status === "Redigering") return "Editing";
  if (status === "Klar för publicering") return "Approved";
  if (status === "Publicerad") return "Published";
  if (status && productionStages.includes(status)) return status;

  return "Idea";
}

function stageLabel(stage: string) {
  if (stage === "Idea") return "Idé";
  if (stage === "Research") return "Research";
  if (stage === "Script") return "Manus";
  if (stage === "Recording") return "Inspelning";
  if (stage === "Editing") return "Redigering";
  if (stage === "Approved") return "Godkänt";
  if (stage === "Published") return "Publicerat";

  return stage;
}

function getProgress(status: string | null) {
  const stageIndex = productionStages.indexOf(normalizeStage(status));

  if (stageIndex < 0) {
    return 0;
  }

  return Math.round(((stageIndex + 1) / productionStages.length) * 100);
}

function formatDate(date: string | null) {
  if (!date) {
    return "Inget datum";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatRelativeDate(date: string) {
  const days = Math.ceil(
    (new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0) {
    return "Försenad";
  }

  if (days === 0) {
    return "Idag";
  }

  if (days === 1) {
    return "Imorgon";
  }

  return `Om ${days} dagar`;
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function statusTone(status: string | null) {
  const stage = normalizeStage(status);

  if (stage === "Published") {
    return "bg-[#1DB954] text-black";
  }

  if (stage === "Approved") {
    return "bg-[#1DB954]/20 text-[#1DB954]";
  }

  return "bg-zinc-800 text-zinc-300";
}

function getCategoryLabel(category: string) {
  if (category === "raw") return "Råinspelning";
  if (category === "edited") return "Redigerad version";
  if (category === "final") return "Slutfil";

  return "Produktionsfil";
}

export default function Home() {
  const [activePodcastId, setActivePodcastId] = useState("");
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [productionFiles, setProductionFiles] = useState<ProductionFile[]>([]);
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

  const loadOverview = useCallback(async (showLoading = true) => {
    if (!activePodcastId) {
      setPodcast(null);
      setEpisodes([]);
      setNotifications([]);
      setProductionFiles([]);
      setIsLoading(false);
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }

    const [
      { data: podcastData, error: podcastError },
      { data: episodeData, error: episodeError },
      { data: notificationData, error: notificationError },
      { data: productionFileData, error: productionFileError },
    ] = await Promise.all([
      supabase
        .from("podcasts")
        .select("id,name,thumbnail_url")
        .eq("id", activePodcastId)
        .maybeSingle(),
      supabase
        .from("episodes")
        .select(
          "id,title,description,status,created_at,links,notes,recording_date,publish_date",
        )
        .eq("podcast_id", activePodcastId)
        .order("created_at", { ascending: false }),
      supabase
        .from("notifications")
        .select("id,type,title,body,target_url,created_at")
        .eq("podcast_id", activePodcastId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("production_files")
        .select(
          "id,episode_id,category,filename,public_url,content_type,size_bytes,created_at",
        )
        .eq("podcast_id", activePodcastId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    if (podcastError) {
      console.error("Kunde inte hämta podcast:", podcastError);
    }

    if (episodeError) {
      console.error("Kunde inte hämta avsnitt:", episodeError);
    }

    if (notificationError) {
      console.error("Kunde inte hämta aktivitet:", notificationError);
    }

    if (productionFileError) {
      console.error("Kunde inte hämta uppladdningar:", productionFileError);
    }

    setPodcast(podcastData);
    setEpisodes((episodeData as Episode[] | null) || []);
    setNotifications((notificationData as Notification[] | null) || []);
    setProductionFiles((productionFileData as ProductionFile[] | null) || []);
    setIsLoading(false);
  }, [activePodcastId]);

  useEffect(() => {
    let isMounted = true;

    async function guardedLoadOverview() {
      await loadOverview();
    }

    if (isMounted) {
      void Promise.resolve().then(guardedLoadOverview);
    }

    return () => {
      isMounted = false;
    };
  }, [loadOverview]);

  useEffect(() => {
    if (!activePodcastId) {
      return;
    }

    const channel = supabase
      .channel(`dashboard:${activePodcastId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `podcast_id=eq.${activePodcastId}`,
          schema: "public",
          table: "episodes",
        },
        () => {
          loadOverview(false);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `podcast_id=eq.${activePodcastId}`,
          schema: "public",
          table: "notifications",
        },
        () => {
          loadOverview(false);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `podcast_id=eq.${activePodcastId}`,
          schema: "public",
          table: "production_files",
        },
        () => {
          loadOverview(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePodcastId, loadOverview]);

  const latestEpisodes = episodes.slice(0, 5);
  const continueEpisodes = episodes
    .filter((episode) => normalizeStage(episode.status) !== "Published")
    .sort((first, second) => getProgress(second.status) - getProgress(first.status))
    .slice(0, 4);
  const upcomingDeadlines = useMemo(
    () =>
      episodes
        .flatMap((episode) => [
          {
            date: episode.recording_date,
            episodeId: episode.id,
            episodeTitle: episode.title,
            label: "Inspelning",
          },
          {
            date: episode.publish_date,
            episodeId: episode.id,
            episodeTitle: episode.title,
            label: "Publicering",
          },
        ])
        .filter((deadline) => deadline.date)
        .sort(
          (first, second) =>
            new Date(first.date || "").getTime() -
            new Date(second.date || "").getTime(),
        )
        .slice(0, 5),
    [episodes],
  );
  const averageProgress =
    episodes.length === 0
      ? 0
      : Math.round(
          episodes.reduce(
            (total, episode) => total + getProgress(episode.status),
            0,
          ) / episodes.length,
        );
  const publishedCount = episodes.filter(
    (episode) => normalizeStage(episode.status) === "Published",
  ).length;
  const inProductionCount = episodes.filter(
    (episode) => normalizeStage(episode.status) !== "Published",
  ).length;
  const totalFileSize = productionFiles.reduce(
    (total, file) => total + file.size_bytes,
    0,
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] px-4 py-5 text-zinc-100 sm:px-10 sm:py-10 lg:px-14">
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
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-6xl">
                  {podcast?.name || "Podd"}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                  En levande överblick över produktion, deadlines och
                  uppladdningar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-96 sm:gap-3">
              {[
                ["Avsnitt", episodes.length],
                ["Progress", `${averageProgress}%`],
                ["Filer", productionFiles.length],
              ].map(([label, value]) => (
                <div
                  className="rounded-xl bg-[#181818] p-3 ring-1 ring-zinc-900 sm:p-4"
                  key={label}
                >
                  <p className="text-xl font-semibold text-white sm:text-2xl">
                    {value}
                  </p>
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
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div
                className="h-48 animate-pulse rounded-2xl bg-[#111111]"
                key={item}
              />
            ))}
          </section>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    Continue Working
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
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#111111]">
                          <span
                            className="block h-full rounded-full bg-[#1DB954]"
                            style={{ width: `${getProgress(episode.status)}%` }}
                          />
                        </span>
                      </span>
                      <span className="text-xs font-bold text-zinc-500">
                        {getProgress(episode.status)}%
                      </span>
                    </Link>
                  ))}
                </div>

                {continueEpisodes.length === 0 ? (
                  <div className="mt-6 rounded-xl bg-[#181818] p-4 text-sm text-zinc-500 sm:p-6">
                    Inget pågående arbete just nu.
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    Recent Activity
                  </h2>
                  <Bell className="text-zinc-500" size={20} />
                </div>
                <div className="mt-6 space-y-4">
                  {notifications.map((notification) => (
                    <Link
                      className="flex gap-3 rounded-xl p-2 transition hover:bg-[#181818]"
                      href={notification.target_url || "/"}
                      key={notification.id}
                    >
                      <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#181818] text-[#1DB954]">
                        <CheckCircle2 size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-white">
                          {notification.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-zinc-500">
                          {notification.body || formatDate(notification.created_at)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>

                {notifications.length === 0 ? (
                  <p className="mt-6 rounded-xl bg-[#181818] p-5 text-sm text-zinc-500">
                    Ingen aktivitet ännu.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    Upcoming Deadlines
                  </h2>
                  <CalendarDays className="text-zinc-500" size={20} />
                </div>

                <div className="mt-6 grid gap-3">
                  {upcomingDeadlines.map((deadline) => (
                    <Link
                      className="flex items-center justify-between gap-4 rounded-xl bg-[#181818] p-4 transition hover:bg-[#202020]"
                      href={`/episodes/${deadline.episodeId}`}
                      key={`${deadline.episodeId}-${deadline.label}-${deadline.date}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">
                          {deadline.episodeTitle}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-500">
                          {deadline.label} · {formatDate(deadline.date)}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[#111111] px-3 py-1 text-xs font-bold text-[#1DB954]">
                        {formatRelativeDate(deadline.date || "")}
                      </span>
                    </Link>
                  ))}
                </div>

                {upcomingDeadlines.length === 0 ? (
                  <p className="mt-6 rounded-xl bg-[#181818] p-5 text-sm text-zinc-500">
                    Inga deadlines planerade.
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    Latest Uploads
                  </h2>
                  <Upload className="text-zinc-500" size={20} />
                </div>

                <div className="mt-6 grid gap-3">
                  {productionFiles.slice(0, 5).map((file) => (
                    <a
                      className="flex items-center justify-between gap-4 rounded-xl bg-[#181818] p-4 transition hover:bg-[#202020]"
                      href={file.public_url}
                      key={file.id}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#111111] text-[#1DB954]">
                          <FileAudio size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">
                            {file.filename}
                          </span>
                          <span className="mt-1 block truncate text-xs text-zinc-500">
                            {getCategoryLabel(file.category)} ·{" "}
                            {formatFileSize(file.size_bytes)}
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="shrink-0 text-zinc-500" size={18} />
                    </a>
                  ))}
                </div>

                {productionFiles.length === 0 ? (
                  <p className="mt-6 rounded-xl bg-[#181818] p-5 text-sm text-zinc-500">
                    Inga uppladdningar ännu.
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    Production Statistics
                  </h2>
                  <BarChart3 className="text-zinc-500" size={20} />
                </div>

                <div className="mt-6 grid gap-3">
                  {[
                    ["Pågående", inProductionCount],
                    ["Publicerade", publishedCount],
                    ["Total filstorlek", formatFileSize(totalFileSize)],
                  ].map(([label, value]) => (
                    <div
                      className="rounded-xl bg-[#181818] p-4"
                      key={label}
                    >
                      <p className="text-2xl font-semibold text-white">
                        {value}
                      </p>
                      <p className="mt-1 text-xs font-medium text-zinc-500">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  Episode Progress
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
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#111111]">
                      <span
                        className="block h-full rounded-full bg-[#1DB954]"
                        style={{ width: `${getProgress(episode.status)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(
                          episode.status,
                        )}`}
                      >
                        {stageLabel(normalizeStage(episode.status))}
                      </span>
                      <span className="text-xs font-bold text-zinc-500">
                        {getProgress(episode.status)}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {latestEpisodes.length === 0 ? (
                <div className="rounded-2xl bg-[#111111] p-8 text-sm text-zinc-500 ring-1 ring-zinc-900">
                  Inga avsnitt ännu.
                </div>
              ) : null}
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    Snabbstart
                  </h2>
                  <Flame className="text-zinc-500" size={20} />
                </div>

                <div className="mt-6 grid gap-3">
                  {[
                    ["Skapa avsnitt", "/episodes", Plus],
                    ["Gå till avsnitt", "/episodes", FileText],
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

              <div className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  Produktionsfaser
                </h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {productionStages.map((stage) => {
                    const count = episodes.filter(
                      (episode) => normalizeStage(episode.status) === stage,
                    ).length;

                    return (
                      <div
                        className="rounded-xl bg-[#181818] p-4"
                        key={stage}
                      >
                        <p className="text-sm font-semibold text-white">
                          {stageLabel(stage)}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[#1DB954]">
                          {count}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
