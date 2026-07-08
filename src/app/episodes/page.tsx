"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Episode = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
};

const statusOptions = [
  "Idé",
  "Research",
  "Manus",
  "Inspelning",
  "Redigering",
  "Klar för publicering",
  "Publicerad",
];

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

  async function fetchEpisodes() {
    const { data, error } = await supabase
      .from("episodes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEpisodes(data);
    }
  }

  useEffect(() => {
    let isMounted = true;

    supabase
      .from("episodes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (isMounted && !error && data) {
          setEpisodes(data);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function createEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("episodes").insert({
      title: title.trim(),
      description: description.trim(),
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

        <section className="grid gap-4 md:grid-cols-3">
          {episodes.map((episode) => (
            <article
              className="rounded-lg border border-zinc-800 bg-[#181818] p-6"
              key={episode.id}
            >
              {editingId === episode.id ? (
                <form className="flex flex-col gap-3" onSubmit={updateEpisode}>
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
                  <Link className="block" href={`/episodes/${episode.id}`}>
                    <div className="flex items-center gap-4">
                      <span className="rounded-full bg-[#1DB954] px-3 py-1 text-xs font-bold text-black">
                        {episode.status || "Planering"}
                      </span>
                    </div>

                    <h2 className="mt-6 text-xl font-semibold text-white">
                      {episode.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {episode.description || "Ingen beskrivning ännu."}
                    </p>
                  </Link>

                  <div className="mt-6 flex gap-2">
                    <button
                      className="rounded-full bg-[#111111] px-4 py-2 text-xs font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                      onClick={() => startEditing(episode)}
                      type="button"
                    >
                      Redigera
                    </button>
                    <button
                      className="rounded-full bg-[#111111] px-4 py-2 text-xs font-bold text-zinc-400 ring-1 ring-zinc-800 transition hover:text-white"
                      onClick={() => deleteEpisode(episode.id)}
                      type="button"
                    >
                      Ta bort
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
