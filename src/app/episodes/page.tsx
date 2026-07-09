"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ImageIcon, MoreHorizontal, StickyNote } from "lucide-react";
import { createNotification } from "@/lib/notifications";
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

function statusTone(status: string | null) {
  if (status === "Publicerad") {
    return "bg-[#1DB954] text-black";
  }

  if (status === "Klar för publicering") {
    return "bg-[#1DB954]/20 text-[#1DB954]";
  }

  return "bg-zinc-800 text-zinc-300";
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
  const [currentRole, setCurrentRole] = useState("");
  const [message, setMessage] = useState("");
  const [activePodcastId, setActivePodcastId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem("activePodcastId") || "";
  });
  const canManageEpisodes = ["owner", "admin", "editor"].includes(
    currentRole,
  );

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

    if (error) {
      console.error("Kunde inte hämta avsnitt:", error);
      setMessage(`Kunde inte hämta avsnitt: ${error.message}`);
      return;
    }

    if (data) {
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

    async function loadEpisodesAndRole() {
      if (!activePodcastId) {
        setCurrentRole("");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const [{ data: episodeData, error }, { data: memberData }] =
        await Promise.all([
          supabase
            .from("episodes")
            .select("*")
            .eq("podcast_id", activePodcastId)
            .order("created_at", { ascending: false }),
          userData.user
            ? supabase
                .from("podcast_members")
                .select("role")
                .eq("podcast_id", activePodcastId)
                .eq("user_id", userData.user.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

      if (isMounted && error) {
        console.error("Kunde inte hämta avsnitt:", error);
        setMessage(`Kunde inte hämta avsnitt: ${error.message}`);
      }

      if (isMounted && !error && episodeData) {
        setEpisodes(episodeData);
      }

      if (isMounted) {
        setCurrentRole(
          (memberData as { role: string } | null)?.role === "member"
            ? "viewer"
            : (memberData as { role: string } | null)?.role || "",
        );
      }
    }

    loadEpisodesAndRole();

    return () => {
      isMounted = false;
    };
  }, [activePodcastId]);

  async function createEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !activePodcastId || !canManageEpisodes) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { error } = await supabase.from("episodes").insert({
      title: title.trim(),
      description: description.trim(),
      podcast_id: activePodcastId,
      status: status.trim(),
    });

    if (error) {
      console.error("Kunde inte skapa avsnitt:", error);
      setMessage(`Kunde inte skapa avsnitt: ${error.message}`);
    } else {
      await createNotification({
        body: title.trim(),
        podcastId: activePodcastId,
        targetUrl: "/episodes",
        title: "Nytt avsnitt skapat",
        type: "episode_created",
      });
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

    if (!editingId || !editTitle.trim() || !canManageEpisodes) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("episodes")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim(),
        status: editStatus.trim(),
      })
      .eq("id", editingId)
      .eq("podcast_id", activePodcastId);

    if (error) {
      console.error("Kunde inte spara avsnitt:", error);
      setMessage(`Kunde inte spara avsnitt: ${error.message}`);
    } else {
      const updatedTitle = editTitle.trim();

      setEpisodes((currentEpisodes) =>
        currentEpisodes.map((episode) =>
          episode.id === editingId
            ? {
                ...episode,
                description: editDescription.trim(),
                status: editStatus.trim(),
                title: updatedTitle,
              }
            : episode,
        ),
      );
      await createNotification({
        body: updatedTitle,
        podcastId: activePodcastId,
        targetUrl: `/episodes/${editingId}`,
        title: "Avsnitt uppdaterat",
        type: "episode_updated",
      });
      cancelEditing();
      await fetchEpisodes();
    }

    setIsSaving(false);
  }

  async function deleteEpisode(id: string) {
    if (!canManageEpisodes) {
      return;
    }

    setMessage("");

    const { error } = await supabase
      .from("episodes")
      .delete()
      .eq("id", id)
      .eq("podcast_id", activePodcastId);

    if (error) {
      console.error("Kunde inte ta bort avsnitt:", error);
      setMessage(`Kunde inte ta bort avsnitt: ${error.message}`);
    } else {
      await fetchEpisodes();
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] px-4 py-5 text-zinc-100 sm:px-10 sm:py-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-9">
        <header className="flex flex-col gap-6 border-b border-zinc-900 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1DB954]">
              Bibliotek
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-6xl">
              Avsnitt
            </h1>
            <p className="mt-4 text-sm text-zinc-400">
              Planera, uppdatera och fortsätt arbetet med poddens avsnitt.
            </p>
          </div>
        </header>

        {canManageEpisodes ? (
          <form
            className="grid gap-3 rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:gap-4 sm:p-5 md:grid-cols-[1fr_1fr_220px_auto]"
            onSubmit={createEpisode}
          >
            <input
              className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/10"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titel"
              type="text"
              value={title}
            />
            <input
              className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/10"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Beskrivning"
              type="text"
              value={description}
            />
            <select
              className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/10"
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
              className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition duration-200 hover:scale-[1.02] hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Sparar" : "Skapa nästa avsnitt"}
            </button>
          </form>
        ) : null}

        {message ? (
          <p className="rounded-2xl bg-[#111111] p-4 text-sm text-zinc-400 ring-1 ring-zinc-900">
            {message}
          </p>
        ) : null}

        <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
          {episodes.map((episode) => {
            const thumbnail = getThumbnail(episode.links);
            const fileCount = getFileCount(episode.links);
            const noteCount = episode.notes?.trim() ? 1 : 0;

            return (
              <article
                className="group relative rounded-xl bg-[#181818] p-2.5 shadow-lg shadow-black/20 transition duration-200 hover:-translate-y-1 hover:bg-[#202020] sm:rounded-2xl sm:p-3"
                key={episode.id}
              >
                {editingId === episode.id && canManageEpisodes ? (
                  <form
                    className="flex flex-col gap-3 rounded-xl bg-[#111111] p-3"
                    onSubmit={updateEpisode}
                  >
                  <input
                    className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                    onChange={(event) => setEditTitle(event.target.value)}
                    placeholder="Titel"
                    type="text"
                    value={editTitle}
                  />
                  <input
                    className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                    onChange={(event) =>
                      setEditDescription(event.target.value)
                    }
                    placeholder="Beskrivning"
                    type="text"
                    value={editDescription}
                  />
                  <select
                    className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
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
                  {canManageEpisodes ? (
                  <details className="absolute right-4 top-4 z-10 opacity-100 transition duration-200 md:right-5 md:top-5 md:opacity-0 md:group-hover:opacity-100">
                    <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full bg-black/70 text-zinc-200 shadow-lg backdrop-blur transition hover:scale-105 hover:text-white [&::-webkit-details-marker]:hidden">
                      <MoreHorizontal size={18} />
                    </summary>
                    <div className="absolute right-0 mt-2 w-40 rounded-xl bg-[#282828] p-1.5 shadow-2xl shadow-black/50 ring-1 ring-black/30">
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
                  ) : null}

                  <Link className="block" href={`/episodes/${episode.id}`}>
                    <div className="aspect-square overflow-hidden rounded-xl bg-[#111111] shadow-md shadow-black/30">
                      {thumbnail ? (
                        <img
                          alt=""
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                          src={thumbnail}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-700">
                          <ImageIcon size={40} />
                        </div>
                      )}
                    </div>

                    <h2 className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-white sm:mt-4 sm:text-sm">
                      {episode.title}
                    </h2>
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(
                          episode.status,
                        )}`}
                      >
                        {episode.status || "Planering"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-1.5 border-t border-zinc-800/70 pt-3 text-[11px] text-zinc-500 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-xs">
                      <span className="flex items-center gap-1.5">
                        <StickyNote size={14} />
                        {noteCount} anteckningar
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileText size={14} />
                        {fileCount} filer
                      </span>
                    </div>
                  </Link>
                </>
              )}
            </article>
            );
          })}
        </section>
        {episodes.length === 0 ? (
          <section className="rounded-2xl bg-[#111111] p-6 text-center shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-10">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#181818] text-[#1DB954]">
              <FileText size={24} />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white sm:text-2xl">
              Inga avsnitt ännu
            </h2>
            <p className="mt-3 text-sm text-zinc-500">
              Skapa ditt första avsnitt för att börja bygga biblioteket.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
