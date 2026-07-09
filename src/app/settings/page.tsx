"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";
import { Trash2, Upload, Users } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { createNotification } from "@/lib/notifications";
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

const roleOptions = ["owner", "admin", "editor", "viewer"];

function roleValue(role: string) {
  return role === "member" ? "viewer" : role;
}

function roleLabel(role: string) {
  const normalizedRole = roleValue(role);

  if (normalizedRole === "owner") return "Ägare";
  if (normalizedRole === "admin") return "Administratör";
  if (normalizedRole === "editor") return "Redaktör";

  return "Läsbehörighet";
}

function roleTone(role: string) {
  const normalizedRole = roleValue(role);

  if (normalizedRole === "owner") {
    return "bg-[#1DB954] text-black";
  }

  if (normalizedRole === "admin") {
    return "bg-[#1DB954]/20 text-[#1DB954]";
  }

  if (normalizedRole === "editor") {
    return "bg-zinc-700 text-zinc-100";
  }

  return "bg-zinc-800 text-zinc-400";
}

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
  const canManagePodcast =
    currentMember?.role === "owner" || currentMember?.role === "admin";
  const canAddMembers =
    currentMember?.role === "owner" || currentMember?.role === "admin";

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

    if (!activePodcastId || !podcastName.trim() || !canManagePodcast) {
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
      await createNotification({
        body: data.name,
        podcastId: activePodcastId,
        targetUrl: "/settings",
        title: "Podcastnamn ändrat",
        type: "podcast_renamed",
      });
      window.dispatchEvent(
        new CustomEvent("podcasts-changed", {
          detail: { id: data.id, name: data.name },
        }),
      );
    }

    setIsSavingPodcast(false);
  }

  async function uploadPodcastThumbnail(file: File | null) {
    if (!file || !activePodcastId || !podcast || !canManagePodcast) {
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

    const { data, error } = await supabase
      .from("podcasts")
      .update({ thumbnail_url: publicUrlData.publicUrl })
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

    if (!activePodcastId || !email.trim() || !canAddMembers) {
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
      await createNotification({
        body: email.trim(),
        podcastId: activePodcastId,
        targetUrl: "/settings",
        title: "Medlem tillagd",
        type: "member_added",
      });
      await fetchMembers(activePodcastId);
    }

    setIsSaving(false);
  }

  async function removeMember(member: PodcastMember) {
    if (
      !activePodcastId ||
      member.user_id === user?.id ||
      !isOwner
    ) {
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

  async function updateMemberRole(member: PodcastMember, nextRole: string) {
    if (!activePodcastId || !isOwner || member.user_id === user?.id) {
      return;
    }

    setMessage("");

    const { error } = await supabase
      .from("podcast_members")
      .update({ role: nextRole })
      .eq("podcast_id", activePodcastId)
      .eq("user_id", member.user_id);

    if (error) {
      console.error("Member role update failed:", error);
      setMessage(error.message);
      return;
    }

    setMembers((currentMembers) =>
      currentMembers.map((currentMember) =>
        currentMember.user_id === member.user_id
          ? { ...currentMember, role: nextRole }
          : currentMember,
      ),
    );
    setMessage("Roll sparad.");
    await createNotification({
      body: `${member.email} är nu ${roleLabel(nextRole)}`,
      podcastId: activePodcastId,
      targetUrl: "/settings",
      title: "Roll ändrad",
      type: "role_changed",
    });
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
    <main className="min-h-screen overflow-x-hidden bg-[#050505] px-4 py-5 text-zinc-100 sm:px-10 sm:py-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
        <header className="border-b border-zinc-900 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1DB954]">
            Arbetsyta
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-6xl">
            Inställningar
          </h1>
          <p className="mt-4 text-sm text-zinc-400">
            Hantera podcastens namn, omslagsbild, medlemmar och åtkomst.
          </p>
        </header>

        {message ? (
          <p className="rounded-2xl bg-[#111111] p-4 text-sm text-zinc-400 ring-1 ring-zinc-900">
            {message}
          </p>
        ) : null}

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <aside className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
            {podcast?.thumbnail_url ? (
              <img
                alt=""
                className="mx-auto aspect-square w-full max-w-64 rounded-2xl object-cover shadow-2xl shadow-black/40 lg:max-w-none"
                src={podcast.thumbnail_url}
              />
            ) : (
              <div className="mx-auto flex aspect-square w-full max-w-64 items-center justify-center rounded-2xl bg-[#181818] text-5xl font-bold text-zinc-400 lg:max-w-none lg:text-6xl">
                {(podcast?.name || "P").charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="mt-5 truncate text-xl font-semibold text-white sm:text-2xl">
              {podcast?.name || "Podcast"}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Ägare: {owner?.email || "Okänd"}
            </p>
          </aside>

          <div className="grid gap-6">
            <section className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">Allmänt</h2>
              <form
                className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]"
                onSubmit={renamePodcast}
              >
                <input
                  className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/10 disabled:opacity-60"
                  disabled={!canManagePodcast}
                  onChange={(event) => setPodcastName(event.target.value)}
                  placeholder="Podcastnamn"
                  type="text"
                  value={podcastName || podcast?.name || ""}
                />
                <button
                  className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition duration-200 hover:scale-[1.02] hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canManagePodcast || isSavingPodcast}
                  type="submit"
                >
                  {isSavingPodcast ? "Sparar..." : "Spara namn"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">Omslagsbild</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Visas på startsidan och i podcast-listan.
              </p>
              <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#181818] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition duration-200 hover:bg-[#202020] hover:text-white has-disabled:cursor-not-allowed has-disabled:opacity-60">
                <Upload size={16} />
                {isUploadingThumbnail ? "Laddar upp..." : "Ladda upp bild"}
                <input
                  accept="image/*"
                  className="sr-only"
                  disabled={!canManagePodcast || isUploadingThumbnail}
                  onChange={(event) =>
                    uploadPodcastThumbnail(event.target.files?.[0] || null)
                  }
                  type="file"
                />
              </label>
            </section>
          </div>
        </section>

        <section className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
                <Users size={20} />
                Medlemmar
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Lägg till och hantera teamet.
              </p>
            </div>
            {!isOwner ? (
              <button
                className="rounded-full bg-[#181818] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                onClick={leavePodcast}
                type="button"
              >
                Lämna podcast
              </button>
            ) : null}
          </div>

          {canAddMembers ? (
            <form
              className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]"
              onSubmit={addMember}
            >
              <input
                className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#1DB954] focus:ring-2 focus:ring-[#1DB954]/10"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-post"
                type="email"
                value={email}
              />
              <button
                className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition duration-200 hover:scale-[1.02] hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Lägger till..." : "Lägg till medlem"}
              </button>
            </form>
          ) : null}

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {members.map((member) => (
              <div
                className="flex flex-col gap-4 rounded-xl bg-[#181818] p-4 sm:flex-row sm:items-center sm:justify-between"
                key={member.user_id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#1DB954] text-sm font-bold text-black">
                    {member.email.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {member.email}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${roleTone(
                        member.role,
                      )}`}
                    >
                      {roleLabel(member.role)}
                    </span>
                  </div>
                </div>
                {isOwner ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      className="rounded-full border border-zinc-800 bg-[#111111] px-3 py-2 text-xs font-bold text-zinc-200 outline-none transition focus:border-[#1DB954] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={member.user_id === user?.id}
                      onChange={(event) =>
                        updateMemberRole(member, event.target.value)
                      }
                      value={roleValue(member.role)}
                    >
                      {roleOptions.map((role) => (
                        <option
                          className="bg-[#111111] text-white"
                          key={role}
                          value={role}
                        >
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-full bg-[#111111] px-4 py-2 text-xs font-bold text-zinc-300 ring-1 ring-zinc-800 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={member.user_id === user?.id}
                      onClick={() => removeMember(member)}
                      type="button"
                    >
                      Ta bort
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-red-950/50 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
            <Trash2 size={22} />
            Riskzon
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Detta tar bort podcasten, alla medlemmar och alla avsnitt i
            podcasten.
          </p>

          {isOwner && showDeleteConfirm ? (
            <div className="mt-6 rounded-xl bg-[#181818] p-5 ring-1 ring-red-900/40">
              <p className="text-sm font-medium text-white">
                Är du säker på att du vill ta bort podcasten?
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
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
            </div>
          ) : isOwner ? (
            <button
              className="mt-6 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => setShowDeleteConfirm(true)}
              type="button"
            >
              Ta bort podcast
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}
