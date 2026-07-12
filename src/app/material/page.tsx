"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileAudio,
  FileText,
  ImageIcon,
  LinkIcon,
  Search,
  Video,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Episode = {
  id: string;
  title: string;
};

type EpisodeMaterial = {
  content_type: string | null;
  created_at: string;
  episode_id: string;
  file_path: string | null;
  id: string;
  kind: "image" | "video" | "file" | "link";
  name: string;
  url: string;
};

type ProductionFile = {
  content_type: string | null;
  created_at: string;
  episode_id: string;
  filename: string;
  id: string;
  public_url: string;
};

type MaterialItem = {
  created_at: string;
  episodeId: string;
  episodeTitle: string;
  id: string;
  kind: "image" | "video" | "file" | "link" | "audio";
  name: string;
  typeLabel: string;
  url: string;
};

const filters = [
  { key: "all", label: "Alla" },
  { key: "image", label: "Bilder" },
  { key: "video", label: "Videor" },
  { key: "file", label: "Filer" },
  { key: "link", label: "Länkar" },
  { key: "audio", label: "Ljud" },
] as const;

function kindLabel(kind: MaterialItem["kind"]) {
  if (kind === "image") return "Bild";
  if (kind === "video") return "Video";
  if (kind === "file") return "Fil";
  if (kind === "link") return "Länk";

  return "Ljud";
}

function MaterialIcon({ kind }: { kind: MaterialItem["kind"] }) {
  if (kind === "image") return <ImageIcon size={24} />;
  if (kind === "video") return <Video size={24} />;
  if (kind === "audio") return <FileAudio size={24} />;
  if (kind === "link") return <LinkIcon size={24} />;

  return <FileText size={24} />;
}

export default function MaterialPage() {
  const [activePodcastId, setActivePodcastId] = useState("");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [materials, setMaterials] = useState<EpisodeMaterial[]>([]);
  const [productionFiles, setProductionFiles] = useState<ProductionFile[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<(typeof filters)[number]["key"]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    function loadActivePodcastId() {
      setActivePodcastId(localStorage.getItem("activePodcastId") || "");
    }

    loadActivePodcastId();
    window.addEventListener("active-podcast-changed", loadActivePodcastId);

    return () => {
      window.removeEventListener("active-podcast-changed", loadActivePodcastId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMaterial() {
      if (!activePodcastId) {
        setEpisodes([]);
        setMaterials([]);
        setProductionFiles([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setMessage("");

      const [
        { data: episodeData, error: episodeError },
        { data: materialData, error: materialError },
        { data: productionData, error: productionError },
      ] = await Promise.all([
        supabase
          .from("episodes")
          .select("id,title")
          .eq("podcast_id", activePodcastId),
        supabase
          .from("episode_materials")
          .select("id,episode_id,kind,name,url,file_path,content_type,created_at")
          .eq("podcast_id", activePodcastId)
          .order("created_at", { ascending: false }),
        supabase
          .from("production_files")
          .select("id,episode_id,filename,public_url,content_type,created_at")
          .eq("podcast_id", activePodcastId)
          .order("created_at", { ascending: false }),
      ]);

      if (!isMounted) {
        return;
      }

      if (episodeError) {
        console.error("Kunde inte hämta avsnitt:", episodeError);
        setMessage(`Kunde inte hämta avsnitt: ${episodeError.message}`);
      }

      if (materialError) {
        console.error("Kunde inte hämta material:", materialError);
        setMessage(`Kunde inte hämta material: ${materialError.message}`);
      }

      if (productionError) {
        console.error("Kunde inte hämta ljud:", productionError);
        setMessage(`Kunde inte hämta ljud: ${productionError.message}`);
      }

      setEpisodes((episodeData as Episode[] | null) || []);
      setMaterials((materialData as EpisodeMaterial[] | null) || []);
      setProductionFiles((productionData as ProductionFile[] | null) || []);
      setIsLoading(false);
    }

    loadMaterial();

    return () => {
      isMounted = false;
    };
  }, [activePodcastId]);

  const items = useMemo(() => {
    const episodeTitleById = new Map(
      episodes.map((episode) => [episode.id, episode.title]),
    );

    const materialItems: MaterialItem[] = materials.map((material) => ({
      created_at: material.created_at,
      episodeId: material.episode_id,
      episodeTitle: episodeTitleById.get(material.episode_id) || "Avsnitt",
      id: `material-${material.id}`,
      kind: material.kind,
      name: material.name,
      typeLabel: kindLabel(material.kind),
      url: material.url,
    }));

    const audioItems: MaterialItem[] = productionFiles.map((file) => ({
      created_at: file.created_at,
      episodeId: file.episode_id,
      episodeTitle: episodeTitleById.get(file.episode_id) || "Avsnitt",
      id: `audio-${file.id}`,
      kind: "audio",
      name: file.filename,
      typeLabel: "Ljud",
      url: file.public_url,
    }));

    return [...materialItems, ...audioItems].sort(
      (first, second) =>
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime(),
    );
  }, [episodes, materials, productionFiles]);

  const filteredItems = items.filter((item) => {
    const matchesFilter = activeFilter === "all" || item.kind === activeFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [item.name, item.episodeTitle, item.typeLabel]
        .join(" ")
        .toLowerCase()
        .includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] px-4 py-5 text-zinc-100 sm:px-10 sm:py-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-9">
        <header className="flex flex-col gap-6 border-b border-zinc-900 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1DB954]">
              Bibliotek
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-6xl">
              Materialbibliotek
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
              Hitta bilder, videor, filer, länkar och ljud från den aktiva
              podcasten.
            </p>
          </div>

          <label className="flex h-11 w-full items-center gap-3 rounded-full bg-[#111111] px-4 text-zinc-500 ring-1 ring-zinc-900 lg:w-80">
            <Search size={18} />
            <input
              className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Sök i material"
              type="search"
              value={searchQuery}
            />
          </label>
        </header>

        {message ? (
          <p className="rounded-2xl bg-[#111111] p-4 text-sm text-zinc-400 ring-1 ring-zinc-900">
            {message}
          </p>
        ) : null}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                activeFilter === filter.key
                  ? "bg-[#1DB954] text-black"
                  : "bg-[#111111] text-zinc-300 ring-1 ring-zinc-900 hover:text-white"
              }`}
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
              <div
                className="h-64 animate-pulse rounded-2xl bg-[#111111]"
                key={item}
              />
            ))}
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredItems.map((item) => (
              <article
                className="rounded-2xl bg-[#181818] p-3 shadow-lg shadow-black/20 transition duration-200 hover:-translate-y-1 hover:bg-[#202020]"
                key={item.id}
              >
                <Link className="block" href={`/episodes/${item.episodeId}`}>
                  <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-[#111111] text-[#1DB954]">
                    {item.kind === "image" ? (
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={item.url}
                      />
                    ) : item.kind === "video" ? (
                      <video
                        className="h-full w-full object-cover"
                        muted
                        src={item.url}
                      >
                        <track kind="captions" />
                      </video>
                    ) : (
                      <MaterialIcon kind={item.kind} />
                    )}
                  </div>

                  <h2 className="mt-4 truncate text-sm font-semibold text-white">
                    {item.name}
                  </h2>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {item.episodeTitle}
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-[#111111] px-2.5 py-1 text-[11px] font-bold text-zinc-300">
                    {item.typeLabel}
                  </span>
                </Link>

                <a
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-xs font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                  href={item.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={14} />
                  Öppna
                </a>
              </article>
            ))}
          </section>
        )}

        {!isLoading && filteredItems.length === 0 ? (
          <section className="rounded-2xl bg-[#111111] p-8 text-center shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-10">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#181818] text-[#1DB954]">
              <FileText size={24} />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white sm:text-2xl">
              Inget material hittades
            </h2>
            <p className="mt-3 text-sm text-zinc-500">
              Ladda upp material från ett avsnitt för att se det här.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
