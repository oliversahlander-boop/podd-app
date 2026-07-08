"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Cropper, { Area } from "react-easy-crop";
import {
  ExternalLink,
  FileText,
  Headphones,
  ImageIcon,
  LinkIcon,
  Upload,
  Video,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Episode = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  notes: string | null;
  links: string | null;
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

const sections = ["Översikt", "Checklista"];
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

function getFileLabel(file: MaterialFile) {
  if (isImage(file.type)) {
    return "Bild";
  }

  if (isVideo(file.type)) {
    return "Video";
  }

  if (isAudio(file.type)) {
    return "Ljud";
  }

  if (isPdf(file.type, file.name)) {
    return "PDF";
  }

  return "Fil";
}

function getFileIcon(file: MaterialFile) {
  if (isImage(file.type)) {
    return <ImageIcon size={18} />;
  }

  if (isVideo(file.type)) {
    return <Video size={18} />;
  }

  if (isAudio(file.type)) {
    return <Headphones size={18} />;
  }

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
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [isEditingEpisode, setIsEditingEpisode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("Idé");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingEpisode, setIsSavingEpisode] = useState(false);
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

  useEffect(() => {
    let isMounted = true;

    supabase
      .from("episodes")
      .select("id,title,description,status,notes,links")
      .eq("id", params.id)
      .single()
      .then(({ data, error }) => {
        if (isMounted && !error && data) {
          setEpisode(data);
          setNotes(data.notes || "");
          setLinks(data.links || "");
          setEditTitle(data.title);
          setEditDescription(data.description || "");
          setEditStatus(data.status || "Idé");
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

  function startEditingEpisode() {
    if (!episode) {
      return;
    }

    setEditTitle(episode.title);
    setEditDescription(episode.description || "");
    setEditStatus(episode.status || "Idé");
    setIsEditingEpisode(true);
  }

  async function saveEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!episode || !editTitle.trim()) {
      return;
    }

    setIsSavingEpisode(true);

    const nextEpisode = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      status: editStatus,
    };
    const { error } = await supabase
      .from("episodes")
      .update(nextEpisode)
      .eq("id", episode.id);

    if (!error) {
      setEpisode({ ...episode, ...nextEpisode });
      setIsEditingEpisode(false);
    }

    setIsSavingEpisode(false);
  }

  async function addExternalLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!episode || !linkInput.trim()) {
      return;
    }

    setIsSavingLinks(true);

    const nextLinks = [...materialLines, linkInput.trim()].join("\n");
    const { error } = await supabase
      .from("episodes")
      .update({ links: nextLinks })
      .eq("id", episode.id);

    if (!error && episode) {
      setLinks(nextLinks);
      setLinkInput("");
      setEpisode({ ...episode, links: nextLinks });
    }

    setIsSavingLinks(false);
  }

  async function saveMaterialLines(nextLines: string[]) {
    if (!episode) {
      return;
    }

    const nextLinks = nextLines.join("\n");
    const { error } = await supabase
      .from("episodes")
      .update({ links: nextLinks })
      .eq("id", episode.id);

    if (error) {
      console.error("Saving material failed:", error);
      return;
    }

    setLinks(nextLinks);
    setEpisode({ ...episode, links: nextLinks });
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
    if (!episode) {
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
    const nextLinks = nextLines.join("\n");
    const { error: updateError } = await supabase
      .from("episodes")
      .update({ links: nextLinks })
      .eq("id", episode.id);

    if (updateError) {
      console.error("Saving uploaded file failed:", updateError);
      setIsUploading(false);
      return;
    }

    setLinks(nextLinks);
    setEpisode({ ...episode, links: nextLinks });
    setIsUploading(false);
  }

  function chooseThumbnail(file: File) {
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
    if (!thumbnail) {
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
    if (!pendingCrop || !croppedArea) {
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

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-zinc-100 sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="overflow-hidden rounded-lg bg-[#111111]">
          <div className="relative h-80 bg-[#181818]">
            {thumbnail ? (
              <img
                alt=""
                className="h-full w-full object-contain"
                src={thumbnail}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-700">
                <ImageIcon size={54} />
              </div>
            )}
            <Link
              className="absolute left-6 top-6 rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:text-white"
              href="/episodes"
            >
              Tillbaka till avsnitt
            </Link>
            <div className="absolute bottom-6 right-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full bg-black/70 px-4 py-3 text-sm font-bold text-zinc-200 transition hover:text-white disabled:text-zinc-500"
                disabled={!thumbnail}
                onClick={cropCurrentThumbnail}
                type="button"
              >
                Beskär
              </button>
              {thumbnail ? (
                <button
                  className="rounded-full bg-black/70 px-4 py-3 text-sm font-bold text-zinc-200 transition hover:text-white"
                  onClick={removeThumbnail}
                  type="button"
                >
                  Ta bort
                </button>
              ) : null}
              <label className="flex cursor-pointer items-center gap-2 rounded-full bg-[#1DB954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#22d760]">
                <Upload size={16} />
                {thumbnail ? "Byt thumbnail" : "Thumbnail"}
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
          </div>

          <div className="p-6 sm:p-8">
            {isEditingEpisode ? (
              <form className="flex max-w-3xl flex-col gap-4" onSubmit={saveEpisode}>
                <select
                  className="w-fit rounded-full border border-zinc-800 bg-[#181818] px-3 py-1 text-xs font-bold text-white outline-none focus:border-[#1DB954]"
                  onChange={(event) => setEditStatus(event.target.value)}
                  value={editStatus}
                >
                  {statusOptions.map((option) => (
                    <option className="bg-[#181818] text-white" key={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-lg border border-zinc-800 bg-[#181818] px-4 py-3 text-3xl font-semibold tracking-tight text-white outline-none focus:border-[#1DB954] sm:text-5xl"
                  onChange={(event) => setEditTitle(event.target.value)}
                  placeholder="Titel"
                  type="text"
                  value={editTitle}
                />
                <textarea
                  className="min-h-28 rounded-lg border border-zinc-800 bg-[#181818] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                  onChange={(event) => setEditDescription(event.target.value)}
                  placeholder="Beskrivning"
                  value={editDescription}
                />
                <div className="flex gap-2">
                  <button
                    className="rounded-full bg-[#1DB954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSavingEpisode}
                    type="submit"
                  >
                    {isSavingEpisode ? "Sparar" : "Spara"}
                  </button>
                  <button
                    className="rounded-full bg-[#181818] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                    onClick={() => setIsEditingEpisode(false)}
                    type="button"
                  >
                    Avbryt
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full bg-[#1DB954] px-3 py-1 text-xs font-bold text-black">
                    {episode?.status || "Planering"}
                  </span>
                  <button
                    className="rounded-full bg-[#181818] px-4 py-2 text-xs font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                    onClick={startEditingEpisode}
                    type="button"
                  >
                    Redigera
                  </button>
                </div>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {episode?.title || "Avsnitt"}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                  {episode?.description || "Ingen beskrivning ännu."}
                </p>
              </>
            )}
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg bg-[#181818] p-6">
            <h2 className="text-xl font-semibold text-white">Anteckningar</h2>
            <form className="mt-4 flex flex-col gap-4" onSubmit={saveNotes}>
              <textarea
                className="min-h-52 rounded-lg border border-zinc-800 bg-[#111111] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
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

          <article className="rounded-lg bg-[#181818] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-white">Material</h2>
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full bg-[#1DB954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#22d760]">
                <Upload size={16} />
                Ladda upp
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
            </div>

            {isUploading ? (
              <p className="mt-3 text-sm text-zinc-500">Laddar upp...</p>
            ) : null}

            <form
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"
              onSubmit={addExternalLink}
            >
              <input
                className="rounded-lg border border-zinc-800 bg-[#111111] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
                onChange={(event) => setLinkInput(event.target.value)}
                placeholder="Lägg till extern länk"
                type="url"
                value={linkInput}
              />
              <button
                className="rounded-full bg-[#111111] px-5 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingLinks}
                type="submit"
              >
                {isSavingLinks ? "Sparar" : "Lägg till"}
              </button>
            </form>

            {savedLinks.length > 0 ? (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-white">Links</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {savedLinks.map((url) => (
                    <div
                      className="flex items-center justify-between gap-4 rounded-lg bg-[#111111] p-4 transition hover:bg-[#202020]"
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
                        <button
                          aria-label="Ta bort länk"
                          className="rounded-full bg-[#181818] p-2 text-zinc-400 transition hover:text-white"
                          onClick={() => removeMaterial(url)}
                          type="button"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {savedFiles.length > 0 ? (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-white">Files</h3>
                <div className="mt-3 grid gap-3">
                  {savedFiles.map((file) => (
                    <div
                      className="rounded-lg bg-[#111111] p-4"
                      key={file.url}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <a
                          className="flex min-w-0 items-center gap-3"
                          href={file.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <span className="text-[#1DB954]">
                            {getFileIcon(file)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-zinc-200">
                              {file.name}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {getFileLabel(file)}
                            </span>
                          </span>
                        </a>
                        {isImage(file.type) ? (
                          <button
                            className="rounded-full bg-[#181818] px-4 py-2 text-xs font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                            onClick={() => setLightboxImage(file)}
                            type="button"
                          >
                            Öppna
                          </button>
                        ) : null}
                        <button
                          aria-label="Ta bort fil"
                          className="rounded-full bg-[#181818] p-2 text-zinc-400 transition hover:text-white"
                          onClick={() => removeMaterial(file.line)}
                          type="button"
                        >
                          <X size={14} />
                        </button>
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
            ) : null}
          </article>

          {sections.map((section) => (
            <article
              className="rounded-lg bg-[#181818] p-6"
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

      {pendingCrop ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
          <div className="w-full max-w-2xl rounded-lg bg-[#181818] p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">
                Beskär thumbnail
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

            <div className="relative mt-5 h-96 overflow-hidden rounded-lg bg-black">
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
                Spara thumbnail
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lightboxImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
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
