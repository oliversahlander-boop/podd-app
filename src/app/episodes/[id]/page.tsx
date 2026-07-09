"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Cropper, { Area } from "react-easy-crop";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Headphones,
  ImageIcon,
  LinkIcon,
  Upload,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ChecklistState = Record<string, boolean>;

type Segment = {
  id: string;
  notes: string;
  title: string;
};

type Episode = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  notes: string | null;
  links: string | null;
  podcast_id: string | null;
  script: string | null;
  segments: Segment[] | null;
  checklist_state: ChecklistState | null;
  responsible_person: string | null;
  recording_date: string | null;
  spotify_link: string | null;
  youtube_link: string | null;
  tiktok_link: string | null;
  publish_date: string | null;
};

type MaterialFile = {
  line: string;
  name: string;
  type: string;
  url: string;
};

type PendingCrop = {
  file: File;
  originalName: string;
  url: string;
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
const checklistItems = [
  "Research klar",
  "Manus klart",
  "Material klart",
  "Inspelat",
  "Redigerat",
  "Publicerat",
];

function getFileName(url: string) {
  return decodeURIComponent(url.split("/").pop() || url);
}

function getHost(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Länk";
  }
}

function parseMaterialFile(line: string): MaterialFile {
  const [, url, name, type] = line.split("|");

  return {
    line,
    name: name || getFileName(url || line),
    type: type || "Fil",
    url: url || line,
  };
}

function isImage(type: string) {
  return type.startsWith("image/");
}

function isVideo(type: string) {
  return type.startsWith("video/");
}

function isAudio(type: string) {
  return type.startsWith("audio/");
}

function isPdf(type: string, name: string) {
  return type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
}

function materialIcon(file: MaterialFile) {
  if (isImage(file.type)) return <ImageIcon size={18} />;
  if (isVideo(file.type)) return <Video size={18} />;
  if (isAudio(file.type)) return <Headphones size={18} />;
  return <FileText size={18} />;
}

function createImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = url;
  });
}

async function getCroppedImage(file: File, imageUrl: string, crop: Area) {
  const image = await createImage(imageUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  canvas.width = crop.width;
  canvas.height = crop.height;
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return new Promise<File>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(file);
          return;
        }

        resolve(new File([blob], file.name, { type: file.type }));
      },
      file.type,
      0.92,
    );
  });
}

export default function EpisodeDetailPage() {
  const params = useParams<{ id: string }>();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Idé");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [recordingDate, setRecordingDate] = useState("");
  const [script, setScript] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentTitle, setSegmentTitle] = useState("");
  const [segmentNotes, setSegmentNotes] = useState("");
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [spotifyLink, setSpotifyLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [tiktokLink, setTiktokLink] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<MaterialFile | null>(null);
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const materialLines = links
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const thumbnail = materialLines
    .find((line) => line.startsWith(thumbnailPrefix))
    ?.split("|")[1];
  const savedFiles = materialLines
    .filter((line) => line.startsWith(filePrefix))
    .map(parseMaterialFile);
  const savedLinks = materialLines.filter(
    (line) =>
      !line.startsWith(filePrefix) && !line.startsWith(thumbnailPrefix),
  );
  const imageFiles = savedFiles.filter((file) => isImage(file.type));
  const pdfFiles = savedFiles.filter((file) => isPdf(file.type, file.name));
  const videoFiles = savedFiles.filter((file) => isVideo(file.type));
  const audioFiles = savedFiles.filter((file) => isAudio(file.type));
  const otherFiles = savedFiles.filter(
    (file) =>
      !isImage(file.type) &&
      !isPdf(file.type, file.name) &&
      !isVideo(file.type) &&
      !isAudio(file.type),
  );
  const canManageEpisode = ["owner", "admin", "editor"].includes(currentRole);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from("episodes")
      .select(
        "id,title,description,status,notes,links,podcast_id,script,segments,checklist_state,responsible_person,recording_date,spotify_link,youtube_link,tiktok_link,publish_date",
      )
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (isMounted && error) {
          console.error("Kunde inte hämta avsnitt:", error);
          setMessage(`Kunde inte hämta avsnitt: ${error.message}`);
          return;
        }

        if (isMounted && data) {
          const nextEpisode = data as Episode;

          setEpisode(nextEpisode);
          setTitle(nextEpisode.title);
          setDescription(nextEpisode.description || "");
          setStatus(nextEpisode.status || "Idé");
          setResponsiblePerson(nextEpisode.responsible_person || "");
          setRecordingDate(nextEpisode.recording_date || "");
          setScript(nextEpisode.script || "");
          setSegments(nextEpisode.segments || []);
          setNotes(nextEpisode.notes || "");
          setLinks(nextEpisode.links || "");
          setChecklistState(nextEpisode.checklist_state || {});
          setSpotifyLink(nextEpisode.spotify_link || "");
          setYoutubeLink(nextEpisode.youtube_link || "");
          setTiktokLink(nextEpisode.tiktok_link || "");
          setPublishDate(nextEpisode.publish_date || "");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      if (!episode?.podcast_id) {
        setCurrentRole("");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setCurrentRole("");
        return;
      }

      const { data, error } = await supabase
        .from("podcast_members")
        .select("role")
        .eq("podcast_id", episode.podcast_id)
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (isMounted) {
        if (error) {
          console.error("Kunde inte hämta behörighet:", error);
          setMessage(`Kunde inte hämta behörighet: ${error.message}`);
          setCurrentRole("");
          return;
        }

        const role = (data as { role: string } | null)?.role || "";
        setCurrentRole(role === "member" ? "viewer" : role);
      }
    }

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [episode?.podcast_id]);

  async function saveEpisodeFields(
    values: Partial<Omit<Episode, "id" | "podcast_id">>,
    successMessage: string,
  ) {
    if (!episode || !canManageEpisode) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("episodes")
      .update(values)
      .eq("id", episode.id)
      .eq("podcast_id", episode.podcast_id);

    if (error) {
      console.error("Episode save failed:", error);
      setMessage(error.message);
    } else {
      setEpisode({ ...episode, ...values });
      setMessage(successMessage);
    }

    setIsSaving(false);
  }

  async function saveOverview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await saveEpisodeFields(
      {
        description: description.trim(),
        recording_date: recordingDate || null,
        responsible_person: responsiblePerson.trim() || null,
        status,
        title: title.trim(),
      },
      "Översikt sparad.",
    );
  }

  async function saveScript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveEpisodeFields({ script }, "Manus sparat.");
  }

  async function saveSegments(nextSegments: Segment[]) {
    setSegments(nextSegments);
    await saveEpisodeFields({ segments: nextSegments }, "Segment sparade.");
  }

  async function saveSegment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManageEpisode || !segmentTitle.trim()) {
      return;
    }

    const nextSegment = {
      id: editingSegmentId || crypto.randomUUID(),
      notes: segmentNotes.trim(),
      title: segmentTitle.trim(),
    };
    const nextSegments = editingSegmentId
      ? segments.map((segment) =>
          segment.id === editingSegmentId ? nextSegment : segment,
        )
      : [...segments, nextSegment];

    setSegmentTitle("");
    setSegmentNotes("");
    setEditingSegmentId(null);
    await saveSegments(nextSegments);
  }

  function editSegment(segment: Segment) {
    setEditingSegmentId(segment.id);
    setSegmentTitle(segment.title);
    setSegmentNotes(segment.notes);
  }

  async function deleteSegment(segmentId: string) {
    if (!canManageEpisode) {
      return;
    }

    await saveSegments(segments.filter((segment) => segment.id !== segmentId));
  }

  async function saveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveEpisodeFields({ notes }, "Anteckningar sparade.");
  }

  async function savePublishing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await saveEpisodeFields(
      {
        publish_date: publishDate || null,
        spotify_link: spotifyLink.trim() || null,
        tiktok_link: tiktokLink.trim() || null,
        youtube_link: youtubeLink.trim() || null,
      },
      "Publicering sparad.",
    );
  }

  async function toggleChecklistItem(item: string) {
    if (!canManageEpisode) {
      return;
    }

    const nextChecklistState = {
      ...checklistState,
      [item]: !checklistState[item],
    };

    setChecklistState(nextChecklistState);
    await saveEpisodeFields(
      { checklist_state: nextChecklistState },
      "Checklista sparad.",
    );
  }

  async function addExternalLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!episode || !linkInput.trim() || !canManageEpisode) {
      return;
    }

    setIsSavingLinks(true);

    const nextLinks = [...materialLines, linkInput.trim()].join("\n");
    const { error } = await supabase
      .from("episodes")
      .update({ links: nextLinks })
      .eq("id", episode.id)
      .eq("podcast_id", episode.podcast_id);

    if (!error) {
      setLinks(nextLinks);
      setLinkInput("");
      setEpisode({ ...episode, links: nextLinks });
      setMessage("Länk sparad.");
    } else {
      console.error("Saving link failed:", error);
      setMessage(error.message);
    }

    setIsSavingLinks(false);
  }

  async function saveMaterialLines(nextLines: string[]) {
    if (!episode || !canManageEpisode) {
      return;
    }

    const nextLinks = nextLines.join("\n");
    const { error } = await supabase
      .from("episodes")
      .update({ links: nextLinks })
      .eq("id", episode.id)
      .eq("podcast_id", episode.podcast_id);

    if (error) {
      console.error("Saving material failed:", error);
      setMessage(error.message);
      return;
    }

    setLinks(nextLinks);
    setEpisode({ ...episode, links: nextLinks });
    setMessage("Material sparat.");
  }

  async function removeMaterial(lineToRemove: string) {
    await saveMaterialLines(
      materialLines.filter((line) => line !== lineToRemove),
    );
  }

  async function removeThumbnail() {
    await saveMaterialLines(
      materialLines.filter((line) => !line.startsWith(thumbnailPrefix)),
    );
  }

  async function uploadFile(file: File, kind: "file" | "thumbnail") {
    if (!episode || !canManageEpisode) {
      return;
    }

    setIsUploading(true);

    const filePath =
      kind === "thumbnail"
        ? `episodes/${episode.id}/thumbnail-${file.name}`
        : `episodes/${episode.id}/${file.name}`;
    const { error } = await supabase.storage
      .from("episodes-material")
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error("Upload failed:", error);
      setMessage(error.message);
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage
      .from("episodes-material")
      .getPublicUrl(filePath);
    const nextLine = [
      kind === "thumbnail" ? "thumbnail" : "file",
      data.publicUrl,
      file.name,
      file.type || "Fil",
    ].join("|");
    const nextLines =
      kind === "thumbnail"
        ? [
            ...materialLines.filter(
              (line) => !line.startsWith(thumbnailPrefix),
            ),
            nextLine,
          ]
        : [...materialLines, nextLine];

    await saveMaterialLines(nextLines);
    setIsUploading(false);
  }

  function chooseThumbnail(file: File) {
    if (!canManageEpisode) {
      return;
    }

    setPendingCrop({
      file,
      originalName: file.name,
      url: URL.createObjectURL(file),
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
  }

  async function cropCurrentThumbnail() {
    if (!thumbnail || !canManageEpisode) {
      return;
    }

    const response = await fetch(thumbnail);
    const blob = await response.blob();
    const name = getFileName(thumbnail) || "thumbnail.jpg";
    const file = new File([blob], name, {
      type: blob.type || "image/jpeg",
    });

    chooseThumbnail(file);
  }

  function closeCrop() {
    if (pendingCrop) {
      URL.revokeObjectURL(pendingCrop.url);
    }

    setPendingCrop(null);
  }

  async function saveCroppedThumbnail() {
    if (!pendingCrop || !croppedArea || !canManageEpisode) {
      return;
    }

    const croppedFile = await getCroppedImage(
      pendingCrop.file,
      pendingCrop.url,
      croppedArea,
    );
    const thumbnailFile = new File([croppedFile], pendingCrop.originalName, {
      type: croppedFile.type,
    });

    closeCrop();
    await uploadFile(thumbnailFile, "thumbnail");
  }

  function renderFiles(titleText: string, files: MaterialFile[]) {
    if (files.length === 0) {
      return null;
    }

    return (
      <div>
        <h3 className="text-sm font-semibold text-white">{titleText}</h3>
        <div className="mt-3 grid gap-3">
          {files.map((file) => (
            <div className="rounded-xl bg-[#111111] p-4" key={file.url}>
              <div className="flex items-center justify-between gap-4">
                <a
                  className="flex min-w-0 items-center gap-3"
                  href={file.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="text-[#1DB954]">{materialIcon(file)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-200">
                      {file.name}
                    </span>
                    <span className="text-xs text-zinc-500">{titleText}</span>
                  </span>
                </a>
                <div className="flex shrink-0 items-center gap-2">
                  {isImage(file.type) ? (
                    <button
                      className="rounded-full bg-[#181818] px-4 py-2 text-xs font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                      onClick={() => setLightboxImage(file)}
                      type="button"
                    >
                      Öppna
                    </button>
                  ) : null}
                  {canManageEpisode ? (
                    <button
                      aria-label="Ta bort fil"
                      className="rounded-full bg-[#181818] p-2 text-zinc-400 transition hover:text-white"
                      onClick={() => removeMaterial(file.line)}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              </div>

              {isPdf(file.type, file.name) ? (
                <iframe
                  className="mt-4 h-72 w-full rounded-lg border border-zinc-800 bg-black"
                  src={file.url}
                  title={file.name}
                />
              ) : null}

              {isVideo(file.type) ? (
                <video
                  className="mt-4 w-full rounded-lg bg-black"
                  controls
                  src={file.url}
                />
              ) : null}

              {isAudio(file.type) ? (
                <audio className="mt-4 w-full" controls src={file.url}>
                  <track kind="captions" />
                </audio>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] px-4 py-5 text-zinc-100 sm:px-10 sm:py-10 lg:px-14">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-8">
        <Link
          className="w-fit rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-zinc-300 ring-1 ring-zinc-900 transition hover:bg-[#181818] hover:text-white"
          href="/episodes"
        >
          Tillbaka till avsnitt
        </Link>

        <header className="grid gap-5 rounded-2xl bg-[#111111] p-4 shadow-2xl shadow-black/30 ring-1 ring-zinc-900 sm:gap-8 sm:p-6 lg:grid-cols-[0.7fr_1.3fr] lg:p-8">
          <div>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[#181818] shadow-2xl shadow-black/50">
              {thumbnail ? (
                <img
                  alt=""
                  className="h-full w-full object-contain"
                  src={thumbnail}
                />
              ) : (
                <ImageIcon className="text-zinc-700" size={64} />
              )}
            </div>

            {canManageEpisode ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className="rounded-full bg-[#181818] px-4 py-2.5 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:bg-[#202020] hover:text-white disabled:text-zinc-500"
                  disabled={!thumbnail}
                  onClick={cropCurrentThumbnail}
                  type="button"
                >
                  Beskär
                </button>
                {thumbnail ? (
                  <button
                    className="rounded-full bg-[#181818] px-4 py-2.5 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:bg-[#202020] hover:text-white"
                    onClick={removeThumbnail}
                    type="button"
                  >
                    Ta bort
                  </button>
                ) : null}
                <label className="flex cursor-pointer items-center gap-2 rounded-full bg-[#1DB954] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#22d760]">
                  <Upload size={16} />
                  {thumbnail ? "Byt omslagsbild" : "Omslagsbild"}
                  <input
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      if (file) {
                        chooseThumbnail(file);
                      }

                      event.target.value = "";
                    }}
                    type="file"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col justify-end">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1DB954]">
              Avsnittsarbetsyta
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-6xl">
              {episode?.title || "Avsnitt"}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-zinc-400 sm:text-base">
              {episode?.description || "Ingen beskrivning ännu."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-zinc-400">
              <span className="rounded-full bg-[#1DB954] px-3 py-1 font-bold text-black">
                {episode?.status || "Idé"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#181818] px-3 py-1">
                <UserRound size={14} />
                {episode?.responsible_person || "Ingen ansvarig"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#181818] px-3 py-1">
                <CalendarDays size={14} />
                {episode?.recording_date || "Inget inspelningsdatum"}
              </span>
            </div>
          </div>
        </header>

        {message ? (
          <p className="rounded-2xl bg-[#111111] p-4 text-sm text-zinc-400 ring-1 ring-zinc-900">
            {message}
          </p>
        ) : null}

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Översikt</h2>
            <form className="mt-6 grid gap-4" onSubmit={saveOverview}>
              <input
                className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954] disabled:opacity-60"
                disabled={!canManageEpisode}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Titel"
                value={title}
              />
              <textarea
                className="min-h-28 rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954] disabled:opacity-60"
                disabled={!canManageEpisode}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Beskrivning"
                value={description}
              />
              <select
                className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none focus:border-[#1DB954] disabled:opacity-60"
                disabled={!canManageEpisode}
                onChange={(event) => setStatus(event.target.value)}
                value={status}
              >
                {statusOptions.map((option) => (
                  <option className="bg-[#181818] text-white" key={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954] disabled:opacity-60"
                disabled={!canManageEpisode}
                onChange={(event) => setResponsiblePerson(event.target.value)}
                placeholder="Ansvarig person"
                value={responsiblePerson}
              />
              <input
                className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none focus:border-[#1DB954] disabled:opacity-60"
                disabled={!canManageEpisode}
                onChange={(event) => setRecordingDate(event.target.value)}
                type="date"
                value={recordingDate}
              />
              {canManageEpisode ? (
                <button
                  className="w-fit rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  Spara översikt
                </button>
              ) : null}
            </form>
          </article>

          <article className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Manus</h2>
            <form className="mt-6 flex flex-col gap-4" onSubmit={saveScript}>
              <textarea
                className="min-h-72 rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954] disabled:opacity-60 sm:min-h-96"
                disabled={!canManageEpisode}
                onChange={(event) => setScript(event.target.value)}
                placeholder="Skriv manus här."
                value={script}
              />
              {canManageEpisode ? (
                <button
                  className="w-fit rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  Spara manus
                </button>
              ) : null}
            </form>
          </article>

          <article className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">Segment</h2>
              <span className="rounded-full bg-[#181818] px-3 py-1 text-xs font-bold text-zinc-400">
                {segments.length} segment
              </span>
            </div>

            {canManageEpisode ? (
              <form className="mt-6 grid gap-3" onSubmit={saveSegment}>
                <input
                  className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                  onChange={(event) => setSegmentTitle(event.target.value)}
                  placeholder="Segmenttitel"
                  value={segmentTitle}
                />
                <textarea
                  className="min-h-24 rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                  onChange={(event) => setSegmentNotes(event.target.value)}
                  placeholder="Segmentanteckningar"
                  value={segmentNotes}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    className="w-fit rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:opacity-60"
                    disabled={isSaving}
                    type="submit"
                  >
                    {editingSegmentId ? "Spara segment" : "Lägg till segment"}
                  </button>
                  {editingSegmentId ? (
                    <button
                      className="rounded-full bg-[#181818] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                      onClick={() => {
                        setEditingSegmentId(null);
                        setSegmentTitle("");
                        setSegmentNotes("");
                      }}
                      type="button"
                    >
                      Avbryt
                    </button>
                  ) : null}
                </div>
              </form>
            ) : null}

            <div className="mt-6 grid gap-3">
              {segments.map((segment, index) => (
                <div
                  className="rounded-xl bg-[#181818] p-4 ring-1 ring-zinc-900"
                  key={segment.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1DB954]">
                        Segment {index + 1}
                      </p>
                      <h3 className="mt-2 truncate text-base font-semibold text-white">
                        {segment.title}
                      </h3>
                    </div>
                    {canManageEpisode ? (
                      <div className="flex shrink-0 gap-2">
                        <button
                          className="rounded-full bg-[#111111] px-3 py-2 text-xs font-bold text-zinc-300 ring-1 ring-zinc-800 transition hover:text-white"
                          onClick={() => editSegment(segment)}
                          type="button"
                        >
                          Redigera
                        </button>
                        <button
                          className="rounded-full bg-[#111111] px-3 py-2 text-xs font-bold text-zinc-400 ring-1 ring-zinc-800 transition hover:text-white"
                          onClick={() => deleteSegment(segment.id)}
                          type="button"
                        >
                          Ta bort
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {segment.notes ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {segment.notes}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {segments.length === 0 ? (
              <p className="mt-6 rounded-xl bg-[#181818] p-5 text-sm text-zinc-500">
                Inga segment ännu.
              </p>
            ) : null}
          </article>

          <article className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Anteckningar</h2>
            <form className="mt-6 flex flex-col gap-4" onSubmit={saveNotes}>
              <textarea
                className="min-h-72 rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954] disabled:opacity-60"
                disabled={!canManageEpisode}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Skriv anteckningar här."
                value={notes}
              />
              {canManageEpisode ? (
                <button
                  className="w-fit rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  Spara anteckningar
                </button>
              ) : null}
            </form>
          </article>

          <article className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Checklista</h2>
            <div className="mt-6 grid gap-3">
              {checklistItems.map((item) => (
                <button
                  className="flex items-center justify-between rounded-xl bg-[#181818] p-4 text-left transition hover:bg-[#202020] disabled:cursor-default"
                  disabled={!canManageEpisode}
                  key={item}
                  onClick={() => toggleChecklistItem(item)}
                  type="button"
                >
                  <span className="text-sm font-semibold text-white">
                    {item}
                  </span>
                  <span
                    className={`flex size-7 items-center justify-center rounded-full ${
                      checklistState[item]
                        ? "bg-[#1DB954] text-black"
                        : "bg-[#111111] text-zinc-600"
                    }`}
                  >
                    <CheckCircle2 size={16} />
                  </span>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">Material</h2>
            {canManageEpisode ? (
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full bg-[#1DB954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#22d760]">
                <Upload size={16} />
                {isUploading ? "Laddar upp..." : "Ladda upp"}
                <input
                  accept="application/pdf,image/*,video/*,audio/*"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      uploadFile(file, "file");
                    }

                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
            ) : null}
          </div>

          {canManageEpisode ? (
            <form
              className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]"
              onSubmit={addExternalLink}
            >
              <input
                className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                onChange={(event) => setLinkInput(event.target.value)}
                placeholder="Lägg till extern länk"
                type="url"
                value={linkInput}
              />
              <button
                className="rounded-full bg-[#181818] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white disabled:opacity-60"
                disabled={isSavingLinks}
                type="submit"
              >
                Lägg till
              </button>
            </form>
          ) : null}

          <div className="mt-6 grid gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-2">
            {renderFiles("Bilder", imageFiles)}
            {renderFiles("PDF-filer", pdfFiles)}
            {renderFiles("Videor", videoFiles)}
            {renderFiles("Ljud", audioFiles)}
            {renderFiles("Filer", otherFiles)}

            {savedLinks.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-white">Länkar</h3>
                <div className="mt-3 grid gap-3">
                  {savedLinks.map((url) => (
                    <div
                      className="flex items-center justify-between gap-4 rounded-xl bg-[#111111] p-4 transition hover:bg-[#202020]"
                      key={url}
                    >
                      <a
                        className="flex min-w-0 items-center gap-3"
                        href={url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <LinkIcon
                          className="shrink-0 text-[#1DB954]"
                          size={18}
                        />
                        <span className="truncate text-sm font-medium text-zinc-200">
                          {getHost(url)}
                        </span>
                      </a>
                      <div className="flex shrink-0 items-center gap-2">
                        <ExternalLink className="text-zinc-500" size={16} />
                        {canManageEpisode ? (
                          <button
                            aria-label="Ta bort länk"
                            className="rounded-full bg-[#181818] p-2 text-zinc-400 transition hover:text-white"
                            onClick={() => removeMaterial(url)}
                            type="button"
                          >
                            <X size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {savedFiles.length === 0 && savedLinks.length === 0 ? (
            <p className="mt-6 rounded-xl bg-[#181818] p-5 text-sm text-zinc-500">
              Inget material uppladdat ännu.
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Publicering</h2>
          <form
            className="mt-6 grid gap-4 md:grid-cols-2"
            onSubmit={savePublishing}
          >
            <input
              className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954] disabled:opacity-60"
              disabled={!canManageEpisode}
              onChange={(event) => setSpotifyLink(event.target.value)}
              placeholder="Spotify-länk"
              type="url"
              value={spotifyLink}
            />
            <input
              className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954] disabled:opacity-60"
              disabled={!canManageEpisode}
              onChange={(event) => setYoutubeLink(event.target.value)}
              placeholder="YouTube-länk"
              type="url"
              value={youtubeLink}
            />
            <input
              className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954] disabled:opacity-60"
              disabled={!canManageEpisode}
              onChange={(event) => setTiktokLink(event.target.value)}
              placeholder="TikTok-länk"
              type="url"
              value={tiktokLink}
            />
            <input
              className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none focus:border-[#1DB954] disabled:opacity-60"
              disabled={!canManageEpisode}
              onChange={(event) => setPublishDate(event.target.value)}
              type="date"
              value={publishDate}
            />
            {canManageEpisode ? (
              <button
                className="w-fit rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                Spara publicering
              </button>
            ) : null}
          </form>
        </section>
      </div>

      {pendingCrop ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-6">
          <div className="w-full max-w-2xl rounded-lg bg-[#181818] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">
                Beskär omslagsbild
              </h2>
              <button
                aria-label="Stäng"
                className="rounded-full bg-[#111111] p-2 text-zinc-300 transition hover:text-white"
                onClick={closeCrop}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative mt-5 h-72 overflow-hidden rounded-lg bg-black sm:h-96">
              <Cropper
                aspect={1}
                crop={crop}
                image={pendingCrop.url}
                onCropChange={setCrop}
                onCropComplete={(_, croppedAreaPixels) =>
                  setCroppedArea(croppedAreaPixels)
                }
                onZoomChange={setZoom}
                zoom={zoom}
              />
            </div>

            <input
              className="mt-5 w-full accent-[#1DB954]"
              max={3}
              min={1}
              onChange={(event) => setZoom(Number(event.target.value))}
              step={0.1}
              type="range"
              value={zoom}
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-full bg-[#111111] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                onClick={closeCrop}
                type="button"
              >
                Avbryt
              </button>
              <button
                className="rounded-full bg-[#1DB954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#22d760]"
                onClick={saveCroppedThumbnail}
                type="button"
              >
                Spara omslagsbild
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lightboxImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-6">
          <button
            aria-label="Stäng"
            className="absolute right-6 top-6 rounded-full bg-[#181818] p-3 text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
            onClick={() => setLightboxImage(null)}
            type="button"
          >
            <X size={20} />
          </button>
          <img
            alt={lightboxImage.name}
            className="max-h-full max-w-full rounded-lg object-contain"
            src={lightboxImage.url}
          />
        </div>
      ) : null}
    </main>
  );
}
