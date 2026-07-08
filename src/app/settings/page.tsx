"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Podcast = {
  id: string;
  name: string;
  thumbnail_url: string | null;
};

type PodcastMember = {
  podcast_id: string;
  user_id: string;
  role: string;
  email: string;
};

export default function SettingsPage() {
  const [activePodcastId, setActivePodcastId] = useState("");
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [podcastName, setPodcastName] = useState("");
  const [members, setMembers] = useState<PodcastMember[]>([]);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPodcast, setIsSavingPodcast] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isDeletingPodcast, setIsDeletingPodcast] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentMember = members.find((member) => member.user_id === user?.id);
  const owner = members.find((member) => member.role === "owner");
  const isOwner = currentMember?.role === "owner";

  async function fetchPodcast(podcastId: string) {
    const { data, error } = await supabase
      .from("podcasts")
      .select("id,name,thumbnail_url")
      .eq("id", podcastId)
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setPodcast(data);
    setPodcastName(data.name);
  }

  async function fetchMembers(podcastId: string) {
    const { data, error } = await supabase.rpc("get_podcast_members", {
      target_podcast_id: podcastId,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMembers((data as PodcastMember[] | null) || []);
  }

  useEffect(() => {
    function loadActivePodcastId() {
      const podcastId = localStorage.getItem("activePodcastId") || "";

      setActivePodcastId(podcastId);

      if (podcastId) {
        fetchPodcast(podcastId);
        fetchMembers(podcastId);
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    loadActivePodcastId();
    window.addEventListener("active-podcast-changed", loadActivePodcastId);

    return () => {
      window.removeEventListener("active-podcast-changed", loadActivePodcastId);
    };
  }, []);

  async function renamePodcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activePodcastId || !podcastName.trim() || !isOwner) {
      return;
    }

    setIsSavingPodcast(true);
    setMessage("");

    const nextName = podcastName.trim();
    const { data, error } = await supabase
      .from("podcasts")
      .update({ name: nextName })
      .eq("id", activePodcastId)
      .select("id,name,thumbnail_url")
      .single();

    if (error) {
      console.error("Podcast rename failed:", error);
      setMessage(error.message);
    } else {
      setPodcast(data);
      setPodcastName(data.name);
      setMessage("Podcastnamn sparat.");
      window.dispatchEvent(
        new CustomEvent("podcasts-changed", {
          detail: { id: data.id, name: data.name },
        }),
      );
    }

    setIsSavingPodcast(false);
  }

  async function uploadPodcastThumbnail(file: File | null) {
    if (!file || !activePodcastId || !podcast || !isOwner) {
      return;
    }

    setIsUploadingThumbnail(true);
    setMessage("");

    const filePath = `podcasts/${activePodcastId}/thumbnail-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("episodes-material")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Podcast thumbnail upload failed:", uploadError);
      setMessage(uploadError.message);
      setIsUploadingThumbnail(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("episodes-material")
      .getPublicUrl(filePath);

    const thumbnailUrl = publicUrlData.publicUrl;
    const { data, error } = await supabase
      .from("podcasts")
      .update({ thumbnail_url: thumbnailUrl })
      .eq("id", activePodcastId)
      .select("id,name,thumbnail_url")
      .single();

    if (error) {
      console.error("Podcast thumbnail save failed:", error);
      setMessage(error.message);
    } else {
      setPodcast(data);
      setMessage("Podcastbild sparad.");
      window.dispatchEvent(
        new CustomEvent("podcasts-changed", {
          detail: {
            id: data.id,
            name: data.name,
            thumbnail_url: data.thumbnail_url,
          },
        }),
      );
    }

    setIsUploadingThumbnail(false);
  }

  async function deletePodcast() {
    if (!activePodcastId || !isOwner) {
      return;
    }

    setIsDeletingPodcast(true);
    setMessage("");

    const { error } = await supabase.rpc("delete_podcast", {
      target_podcast_id: activePodcastId,
    });

    if (error) {
      setMessage(error.message);
      setIsDeletingPodcast(false);
      return;
    }

    localStorage.removeItem("activePodcastId");
    window.dispatchEvent(new CustomEvent("podcasts-changed"));
    window.dispatchEvent(new CustomEvent("active-podcast-changed"));
    setIsDeletingPodcast(false);
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activePodcastId || !email.trim()) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("add_podcast_member_by_email", {
      target_email: email.trim(),
      target_podcast_id: activePodcastId,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setEmail("");
      setMessage("Medlem tillagd.");
      await fetchMembers(activePodcastId);
    }

    setIsSaving(false);
  }

  async function removeMember(member: PodcastMember) {
    if (!activePodcastId || member.user_id === user?.id || !isOwner) {
      return;
    }

    const { error } = await supabase
      .from("podcast_members")
      .delete()
      .eq("podcast_id", activePodcastId)
      .eq("user_id", member.user_id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await fetchMembers(activePodcastId);
  }

  async function leavePodcast() {
    if (!activePodcastId || !user || isOwner) {
      return;
    }

    const { error } = await supabase
      .from("podcast_members")
      .delete()
      .eq("podcast_id", activePodcastId)
      .eq("user_id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    localStorage.removeItem("activePodcastId");
    window.dispatchEvent(new CustomEvent("podcasts-changed"));
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-zinc-100 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="border-b border-zinc-900 pb-6">
          <p className="text-sm font-semibold tracking-[0.2em] text-[#1DB954] uppercase">
            Podd
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Inställningar
          </h1>
        </header>

        <section className="rounded-lg bg-[#181818] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Podcast Settings
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Owner: {owner?.email || "Okänd"}
              </p>
            </div>
            {!isOwner ? (
              <button
                className="rounded-full bg-[#111111] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                onClick={leavePodcast}
                type="button"
              >
                Lämna podcast
              </button>
            ) : null}
          </div>

          <form
            className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={renamePodcast}
          >
            <input
              className="rounded-lg border border-zinc-800 bg-[#111111] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954] disabled:opacity-60"
              disabled={!isOwner}
              onChange={(event) => setPodcastName(event.target.value)}
              placeholder="Podcastnamn"
              type="text"
              value={podcastName || podcast?.name || ""}
            />
            <button
              className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!isOwner || isSavingPodcast}
              type="submit"
            >
              {isSavingPodcast ? "Sparar..." : "Spara namn"}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            {podcast?.thumbnail_url ? (
              <img
                alt=""
                className="size-20 rounded-lg object-cover"
                src={podcast.thumbnail_url}
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-lg bg-[#111111] text-2xl font-bold text-zinc-300">
                {(podcast?.name || "P").charAt(0).toUpperCase()}
              </div>
            )}

            <label className="inline-flex w-fit cursor-pointer rounded-full bg-[#111111] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white has-disabled:cursor-not-allowed has-disabled:opacity-60">
              {isUploadingThumbnail ? "Laddar upp..." : "Ladda upp bild"}
              <input
                accept="image/*"
                className="sr-only"
                disabled={!isOwner || isUploadingThumbnail}
                onChange={(event) =>
                  uploadPodcastThumbnail(event.target.files?.[0] || null)
                }
                type="file"
              />
            </label>
          </div>

          {isOwner ? (
            <div className="mt-4">
              <button
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500"
                onClick={() => setShowDeleteConfirm(true)}
                type="button"
              >
                Ta bort podcast
              </button>
            </div>
          ) : null}
        </section>

        {showDeleteConfirm ? (
          <section className="rounded-lg bg-[#181818] p-6 ring-1 ring-red-900/40">
            <h2 className="text-xl font-semibold text-white">
              Bekräfta borttagning
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Detta tar bort podcasten, alla medlemmar och alla avsnitt i
              podcasten.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeletingPodcast}
                onClick={deletePodcast}
                type="button"
              >
                {isDeletingPodcast ? "Tar bort..." : "Ja, ta bort podcast"}
              </button>
              <button
                className="rounded-full bg-[#111111] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                disabled={isDeletingPodcast}
                onClick={() => setShowDeleteConfirm(false)}
                type="button"
              >
                Avbryt
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-lg bg-[#181818] p-6">
          <h2 className="text-xl font-semibold text-white">Members</h2>

          {isOwner ? (
            <form
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"
              onSubmit={addMember}
            >
              <input
                className="rounded-lg border border-zinc-800 bg-[#111111] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-post"
                type="email"
                value={email}
              />
              <button
                className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Lägger till..." : "Lägg till medlem"}
              </button>
            </form>
          ) : null}

          {message ? (
            <p className="mt-4 text-sm leading-6 text-zinc-400">{message}</p>
          ) : null}

          <div className="mt-8 space-y-3">
            {members.map((member) => (
              <div
                className="flex items-center justify-between gap-4 rounded-lg bg-[#111111] p-4"
                key={member.user_id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {member.email}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                    {member.role}
                  </p>
                </div>
                {isOwner ? (
                  <button
                    className="rounded-full bg-[#181818] px-4 py-2 text-xs font-bold text-zinc-300 ring-1 ring-zinc-800 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={member.user_id === user?.id}
                    onClick={() => removeMember(member)}
                    type="button"
                  >
                    Ta bort
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
