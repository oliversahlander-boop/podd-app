"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Episode = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  notes: string | null;
};

const sections = ["Översikt", "Material", "Checklista"];

export default function EpisodeDetailPage() {
  const params = useParams<{ id: string }>();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from("episodes")
      .select("id,title,description,status,notes")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (isMounted && !error && data) {
          setEpisode(data);
          setNotes(data.notes || "");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  async function saveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSaving(true);

    const { error } = await supabase
      .from("episodes")
      .update({ notes })
      .eq("id", params.id);

    if (!error && episode) {
      setEpisode({ ...episode, notes });
    }

    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-zinc-100 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="border-b border-zinc-900 pb-6">
          <Link
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
            href="/episodes"
          >
            Tillbaka till avsnitt
          </Link>

          <div className="mt-8">
            <span className="rounded-full bg-[#1DB954] px-3 py-1 text-xs font-bold text-black">
              {episode?.status || "Planering"}
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {episode?.title || "Avsnitt"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              {episode?.description || "Ingen beskrivning ännu."}
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-[#181818] p-6">
            <h2 className="text-xl font-semibold text-white">Anteckningar</h2>
            <form className="mt-4 flex flex-col gap-4" onSubmit={saveNotes}>
              <textarea
                className="min-h-40 rounded-lg border border-zinc-800 bg-[#111111] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Skriv anteckningar här."
                value={notes}
              />
              <button
                className="w-fit rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Sparar" : "Spara anteckningar"}
              </button>
            </form>
          </article>

          {sections.map((section) => (
            <article
              className="rounded-lg border border-zinc-800 bg-[#181818] p-6"
              key={section}
            >
              <h2 className="text-xl font-semibold text-white">{section}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Kommer senare.
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
