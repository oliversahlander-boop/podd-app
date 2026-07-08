"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Episode = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
};

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
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
      setStatus("");
      await fetchEpisodes();
    }

    setIsSaving(false);
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
          <input
            className="rounded-lg border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
            onChange={(event) => setStatus(event.target.value)}
            placeholder="Status"
            type="text"
            value={status}
          />
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
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
