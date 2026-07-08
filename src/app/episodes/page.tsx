"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ImageIcon, MoreHorizontal, StickyNote } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Episode = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  notes: string | null;
  links: string | null;
  podcast_id: string | null;
};

const filePrefix = "file|";
const thumbnailPrefix = "thumbnail|";

const statusOptions = [
  "Idé",
  "Research",
  "Manus",
  "Inspelning",
  "Redigering",
  "Klar för publicering",
  "Publicerad",
];

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

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Idé");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activePodcastId, setActivePodcastId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem("activePodcastId") || "";
  });

  async function fetchEpisodes() {
    if (!activePodcastId) {
      setEpisodes([]);
      return;
    }

    const { data, error } = await supabase
      .from("episodes")
      .select("*")
      .eq("podcast_id", activePodcastId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEpisodes(data);
    }
  }

  useEffect(() => {
    function loadActivePodcastId() {
      const nextPodcastId = localStorage.getItem("activePodcastId") || "";

      setActivePodcastId(nextPodcastId);
    }

    window.addEventListener("active-podcast-changed", loadActivePodcastId);

    return () => {
      window.removeEventListener("active-podcast-changed", loadActivePodcastId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!activePodcastId) {
      return;
    }

    supabase
      .from("episodes")
      .select("*")
      .eq("podcast_id", activePodcastId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (isMounted && !error && data) {
          setEpisodes(data);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activePodcastId]);

  async function createEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !activePodcastId) {
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("episodes").insert({
      title: title.trim(),
      description: description.trim(),
      podcast_id: activePodcastId,
      status: status.trim(),
    });

    if (!error) {
      setTitle("");
      setDescription("");
      setStatus("Idé");
      await fetchEpisodes();
    }

    setIsSaving(false);
  }

  function startEditing(episode: Episode) {
    setEditingId(episode.id);
    setEditTitle(episode.title);
    setEditDescription(episode.description || "");
    setEditStatus(episode.status || "Idé");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditStatus("");
  }

  async function updateEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId || !editTitle.trim()) {
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("episodes")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim(),
        status: editStatus.trim(),
      })
      .eq("id", editingId);

    if (!error) {
      cancelEditing();
      await fetchEpisodes();
    }

    setIsSaving(false);
  }

  async function deleteEpisode(id: string) {
    const { error } = await supabase.from("episodes").delete().eq("id", id);

    if (!error) {
      await fetchEpisodes();
    }
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-zinc-100 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-6 border-b border-zinc-900 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-[#1DB954] uppercase">
              Podd-app
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Avsnitt
            </h1>
          </div>
        </header>

        <form
          className="grid gap-4 rounded-lg border border-zinc-900 bg-[#111111] p-6 md:grid-cols-[1fr_1fr_220px_auto]"
          onSubmit={createEpisode}
        >
          <input
            className="rounded-lg border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titel"
            type="text"
            value={title}
          />
          <input
            className="rounded-lg border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Beskrivning"
            type="text"
            value={description}
          />
          <select
            className="rounded-lg border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            {statusOptions.map((option) => (
              <option className="bg-[#181818] text-white" key={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Sparar" : "Skapa nästa avsnitt"}
          </button>
        </form>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {episodes.map((episode) => {
            const thumbnail = getThumbnail(episode.links);
            const fileCount = getFileCount(episode.links);
            const noteCount = episode.notes?.trim() ? 1 : 0;

            return (
              <article
                className="group relative rounded-lg bg-[#181818] p-4 transition hover:bg-[#202020]"
                key={episode.id}
              >
                {editingId === episode.id ? (
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={updateEpisode}
                  >
                  <input
                    className="rounded-lg border border-zinc-800 bg-[#111111] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="Titel"
                    type="text"
                    value={editTitle}
                  />
                  <input
                    className="rounded-lg border border-zinc-800 bg-[#111111] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                    onChange={(event) =>
                      setEditDescription(event.target.value)
                    }
                    placeholder="Beskrivning"
                    type="text"
                    value={editDescription}
                  />
                  <select
                    className="rounded-lg border border-zinc-800 bg-[#111111] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                    onChange={(event) => setEditStatus(event.target.value)}
                    value={editStatus}
                  >
                    {statusOptions.map((option) => (
                      <option className="bg-[#111111] text-white" key={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      className="rounded-full bg-[#1DB954] px-4 py-2 text-xs font-bold text-black transition hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSaving}
                      type="submit"
                    >
                      Spara
                    </button>
                    <button
                      className="rounded-full bg-[#111111] px-4 py-2 text-xs font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                      onClick={cancelEditing}
                      type="button"
                    >
                      Avbryt
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <details className="absolute right-5 top-5 z-10">
                    <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full bg-black/70 text-zinc-200 transition hover:text-white [&::-webkit-details-marker]:hidden">
                      <MoreHorizontal size={18} />
                    </summary>
                    <div className="absolute right-0 mt-2 w-36 rounded-lg bg-[#282828] p-1 shadow-xl ring-1 ring-black/30">
                      <button
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-[#333333] hover:text-white"
                        onClick={() => startEditing(episode)}
                        type="button"
                      >
                        Redigera
                      </button>
                      <button
                        className="block w-full rounded-md px-3 py-2 text-left text-sm text-zinc-400 transition hover:bg-[#333333] hover:text-white"
                        onClick={() => deleteEpisode(episode.id)}
                        type="button"
                      >
                        Ta bort
                      </button>
                    </div>
                  </details>

                  <Link className="block" href={`/episodes/${episode.id}`}>
                    <div className="aspect-square overflow-hidden rounded-md bg-[#111111]">
                      {thumbnail ? (
                        <img
                          alt=""
                          className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                          src={thumbnail}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-700">
                          <ImageIcon size={40} />
                        </div>
                      )}
                    </div>

                    <h2 className="mt-4 line-clamp-2 text-base font-semibold leading-6 text-white">
                      {episode.title}
                    </h2>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full bg-[#1DB954] px-2.5 py-1 text-[11px] font-bold text-black">
                        {episode.status || "Planering"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <StickyNote size={14} />
                        {noteCount} Notes
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} />
                        {fileCount} Files
                      </span>
                    </div>
                  </Link>
                </>
              )}
            </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
