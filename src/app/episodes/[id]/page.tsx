"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Cropper, { Area } from "react-easy-crop";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  LinkIcon,
  Trash2,
  Upload,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

type ChecklistState = Record<string, boolean>;

type PublishingChecklistState = Record<string, boolean>;

type PublishHistoryItem = {
  action: string;
  at: string;
  by: string;
  status: string;
};

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
  checklist: ChecklistState | null;
  checklist_state: ChecklistState | null;
  responsible_person: string | null;
  recording_date: string | null;
  spotify_url: string | null;
  spotify_link: string | null;
  youtube_url: string | null;
  youtube_link: string | null;
  tiktok_url: string | null;
  tiktok_link: string | null;
  publish_date: string | null;
  publish_status: string | null;
  apple_podcasts_link: string | null;
  rss_status: string | null;
  final_artwork_url: string | null;
  episode_duration: string | null;
  publishing_checklist: PublishingChecklistState | null;
  publish_history: PublishHistoryItem[] | null;
};

type PendingCrop = {
  file: File;
  originalName: string;
  url: string;
};

type ProductionFile = {
  category: ProductionCategory;
  content_type: string | null;
  created_at: string;
  file_path: string;
  filename: string;
  id: string;
  public_url: string;
  size_bytes: number;
};

type ProductionCategory = "raw" | "edited" | "final";

type MaterialKind = "image" | "video" | "file" | "link";

type EpisodeMaterial = {
  content_type: string | null;
  created_at: string;
  file_path: string | null;
  id: string;
  kind: MaterialKind;
  name: string;
  size_bytes: number;
  url: string;
};

const thumbnailPrefix = "thumbnail|";
const productionCategories: Array<{
  key: ProductionCategory;
  title: string;
}> = [
  { key: "raw", title: "Råinspelning" },
  { key: "edited", title: "Redigerad version" },
  { key: "final", title: "Slutfil" },
];
const productionStages = [
  "Idea",
  "Research",
  "Script",
  "Recording",
  "Editing",
  "Approved",
  "Published",
];
const checklistItems = [
  "Research klar",
  "Manus klart",
  "Material klart",
  "Inspelat",
  "Redigerat",
  "Publicerat",
];
const publishingChecklistItems = [
  "Finalt ljud exporterat",
  "Omslagsbild klar",
  "Beskrivning granskad",
  "Länkar kontrollerade",
  "RSS kontrollerad",
  "Redo att publicera",
];

const materialGroups: Array<{
  accept?: string;
  icon: typeof ImageIcon;
  key: MaterialKind;
  title: string;
}> = [
  { accept: "image/*", icon: ImageIcon, key: "image", title: "Bilder" },
  { accept: "video/*", icon: Video, key: "video", title: "Videor" },
  {
    accept: ".pdf,application/pdf,.doc,.docx,.txt,.zip",
    icon: FileText,
    key: "file",
    title: "PDF/filer",
  },
  { icon: LinkIcon, key: "link", title: "Länkar" },
];

function normalizeStage(status: string | null) {
  if (status === "Idé") return "Idea";
  if (status === "Manus") return "Script";
  if (status === "Inspelning") return "Recording";
  if (status === "Redigering") return "Editing";
  if (status === "Klar för publicering") return "Approved";
  if (status === "Publicerad") return "Published";
  if (status && productionStages.includes(status)) return status;

  return "Idea";
}

function stageLabel(stage: string) {
  if (stage === "Idea") return "Idé";
  if (stage === "Research") return "Research";
  if (stage === "Script") return "Manus";
  if (stage === "Recording") return "Inspelning";
  if (stage === "Editing") return "Redigering";
  if (stage === "Approved") return "Godkänt";
  if (stage === "Published") return "Publicerat";

  return stage;
}

function publishStatusLabel(status: string | null) {
  if (status === "published") return "Publicerad";
  if (status === "scheduled") return "Schemalagd";
  if (status === "ready") return "Redo";

  return "Utkast";
}

function getFileName(url: string) {
  return decodeURIComponent(url.split("/").pop() || url);
}

function isAudioType(type: string | null) {
  return (type || "").startsWith("audio/");
}

function getMaterialKind(file: File): Exclude<MaterialKind, "link"> {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";

  return "file";
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(date: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function safeStorageName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
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
  const [status, setStatus] = useState("Idea");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [recordingDate, setRecordingDate] = useState("");
  const [script, setScript] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentTitle, setSegmentTitle] = useState("");
  const [segmentNotes, setSegmentNotes] = useState("");
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState("");
  const [checklistState, setChecklistState] = useState<ChecklistState>({});
  const [spotifyLink, setSpotifyLink] = useState("");
  const [applePodcastsLink, setApplePodcastsLink] = useState("");
  const [youtubeLink, setYoutubeLink] = useState("");
  const [tiktokLink, setTiktokLink] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [publishStatus, setPublishStatus] = useState("draft");
  const [rssStatus, setRssStatus] = useState("not_ready");
  const [finalArtworkUrl, setFinalArtworkUrl] = useState("");
  const [episodeDuration, setEpisodeDuration] = useState("");
  const [publishingChecklist, setPublishingChecklist] =
    useState<PublishingChecklistState>({});
  const [publishHistory, setPublishHistory] = useState<PublishHistoryItem[]>([]);
  const [currentRole, setCurrentRole] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingCategory, setUploadingCategory] =
    useState<ProductionCategory | null>(null);
  const [productionFiles, setProductionFiles] = useState<ProductionFile[]>([]);
  const [episodeMaterials, setEpisodeMaterials] = useState<EpisodeMaterial[]>(
    [],
  );
  const [externalLinkName, setExternalLinkName] = useState("");
  const [externalLinkUrl, setExternalLinkUrl] = useState("");
  const [uploadingMaterialKind, setUploadingMaterialKind] =
    useState<MaterialKind | null>(null);
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
  const canManageEpisode = ["owner", "admin", "editor"].includes(currentRole);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from("episodes")
      .select(
        "id,title,description,status,notes,links,podcast_id,script,segments,checklist,checklist_state,responsible_person,recording_date,spotify_url,spotify_link,apple_podcasts_link,youtube_url,youtube_link,tiktok_url,tiktok_link,publish_date,publish_status,rss_status,final_artwork_url,episode_duration,publishing_checklist,publish_history",
      )
      .eq("id", params.id)
      .maybeSingle()
      .then(({ data, error, status, statusText }) => {
        if (isMounted && error) {
          console.error("Kunde inte hämta avsnitt:", {
            data,
            error,
            status,
            statusText,
          });
          setMessage(
            [
              "Kunde inte hämta avsnitt.",
              error.message ? `Meddelande: ${error.message}` : null,
              error.code ? `Kod: ${error.code}` : null,
              error.details ? `Detaljer: ${error.details}` : null,
            ]
              .filter(Boolean)
              .join(" "),
          );
          return;
        }

        if (isMounted && !data) {
          console.error("Avsnitt hittades inte:", {
            data,
            error,
            status,
            statusText,
          });
          setEpisode(null);
          setMessage("Avsnittet hittades inte.");
          return;
        }

        if (isMounted && data) {
          const nextEpisode = data as Episode;

          setEpisode(nextEpisode);
          setTitle(nextEpisode.title);
          setDescription(nextEpisode.description || "");
          setStatus(normalizeStage(nextEpisode.status));
          setResponsiblePerson(nextEpisode.responsible_person || "");
          setRecordingDate(nextEpisode.recording_date || "");
          setScript(nextEpisode.script || "");
          setSegments(nextEpisode.segments || []);
          setNotes(nextEpisode.notes || "");
          setLinks(nextEpisode.links || "");
          setChecklistState(
            nextEpisode.checklist || nextEpisode.checklist_state || {},
          );
          setSpotifyLink(nextEpisode.spotify_url || nextEpisode.spotify_link || "");
          setApplePodcastsLink(nextEpisode.apple_podcasts_link || "");
          setYoutubeLink(nextEpisode.youtube_url || nextEpisode.youtube_link || "");
          setTiktokLink(nextEpisode.tiktok_url || nextEpisode.tiktok_link || "");
          setPublishDate(nextEpisode.publish_date || "");
          setPublishStatus(nextEpisode.publish_status || "draft");
          setRssStatus(nextEpisode.rss_status || "not_ready");
          setFinalArtworkUrl(nextEpisode.final_artwork_url || "");
          setEpisodeDuration(nextEpisode.episode_duration || "");
          setPublishingChecklist(nextEpisode.publishing_checklist || {});
          setPublishHistory(nextEpisode.publish_history || []);
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

  useEffect(() => {
    if (!episode?.id) {
      return;
    }

    let isMounted = true;

    async function loadProductionFiles() {
      const { data, error } = await supabase
        .from("production_files")
        .select(
          "id,category,filename,file_path,public_url,content_type,size_bytes,created_at",
        )
        .eq("episode_id", episode?.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Kunde inte hämta produktionsfiler:", error);
        setMessage(`Kunde inte hämta produktionsfiler: ${error.message}`);
        return;
      }

      if (isMounted) {
        setProductionFiles((data as ProductionFile[] | null) || []);
      }
    }

    loadProductionFiles();

    const channel = supabase
      .channel(`production-files:${episode.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `episode_id=eq.${episode.id}`,
          schema: "public",
          table: "production_files",
        },
        () => {
          loadProductionFiles();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [episode?.id]);

  useEffect(() => {
    if (!episode?.id) {
      return;
    }

    let isMounted = true;

    async function loadEpisodeMaterials() {
      const { data, error } = await supabase
        .from("episode_materials")
        .select(
          "id,kind,name,url,file_path,content_type,size_bytes,created_at",
        )
        .eq("episode_id", episode?.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Kunde inte hämta material:", error);
        setMessage(`Kunde inte hämta material: ${error.message}`);
        return;
      }

      if (isMounted) {
        setEpisodeMaterials((data as EpisodeMaterial[] | null) || []);
      }
    }

    loadEpisodeMaterials();

    const channel = supabase
      .channel(`episode-materials:${episode.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `episode_id=eq.${episode.id}`,
          schema: "public",
          table: "episode_materials",
        },
        () => {
          loadEpisodeMaterials();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [episode?.id]);

  async function saveEpisodeFields(
    values: Partial<Omit<Episode, "id" | "podcast_id">>,
    successMessage: string,
  ) {
    if (!episode || !canManageEpisode) {
      return false;
    }

    setIsSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("episodes")
      .update(values)
      .eq("id", episode.id)
      .eq("podcast_id", episode.podcast_id);

    if (error) {
      console.error("Kunde inte spara avsnitt:", error);
      setMessage(`Kunde inte spara avsnitt: ${error.message}`);
      setIsSaving(false);
      return false;
    } else {
      setEpisode({ ...episode, ...values });
      setMessage(successMessage);
    }

    setIsSaving(false);
    return true;
  }

  async function saveOverview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const saved = await saveEpisodeFields(
      {
        description: description.trim(),
        recording_date: recordingDate || null,
        responsible_person: responsiblePerson.trim() || null,
        status,
        title: title.trim(),
      },
      "Översikt sparad.",
    );

    if (saved) {
      await createNotification({
        body: title.trim(),
        podcastId: episode?.podcast_id || null,
        targetUrl: `/episodes/${params.id}`,
        title: "Avsnitt uppdaterat",
        type: "episode_updated",
      });
    }
  }

  async function saveScript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await saveEpisodeFields({ script }, "Manus sparat.");

    if (saved) {
      await createNotification({
        body: title,
        podcastId: episode?.podcast_id || null,
        targetUrl: `/episodes/${params.id}`,
        title: "Manus uppdaterat",
        type: "episode_updated",
      });
    }
  }

  async function saveSegments(nextSegments: Segment[]) {
    const saved = await saveEpisodeFields(
      { segments: nextSegments },
      "Segment sparade.",
    );

    if (saved) {
      setSegments(nextSegments);
      await createNotification({
        body: title,
        podcastId: episode?.podcast_id || null,
        targetUrl: `/episodes/${params.id}`,
        title: "Segment uppdaterade",
        type: "episode_updated",
      });
    }
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
    const saved = await saveEpisodeFields({ notes }, "Anteckningar sparade.");

    if (saved) {
      await createNotification({
        body: title,
        podcastId: episode?.podcast_id || null,
        targetUrl: `/episodes/${params.id}`,
        title: "Anteckningar uppdaterade",
        type: "episode_updated",
      });
    }
  }

  async function savePublishing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const saved = await saveEpisodeFields(
      {
        apple_podcasts_link: applePodcastsLink.trim() || null,
        episode_duration: episodeDuration.trim() || null,
        final_artwork_url: finalArtworkUrl.trim() || null,
        publish_date: publishDate || null,
        publish_status: publishStatus,
        publishing_checklist: publishingChecklist,
        rss_status: rssStatus,
        spotify_url: spotifyLink.trim() || null,
        spotify_link: spotifyLink.trim() || null,
        tiktok_url: tiktokLink.trim() || null,
        tiktok_link: tiktokLink.trim() || null,
        youtube_url: youtubeLink.trim() || null,
        youtube_link: youtubeLink.trim() || null,
      },
      "Publicering sparad.",
    );

    if (saved) {
      await createNotification({
        body: title,
        podcastId: episode?.podcast_id || null,
        targetUrl: `/episodes/${params.id}`,
        title: "Publicering uppdaterad",
        type: "episode_updated",
      });
    }
  }

  async function togglePublishingChecklistItem(item: string) {
    if (!canManageEpisode) {
      return;
    }

    const nextPublishingChecklist = {
      ...publishingChecklist,
      [item]: !publishingChecklist[item],
    };

    const saved = await saveEpisodeFields(
      { publishing_checklist: nextPublishingChecklist },
      "Publiceringschecklista sparad.",
    );

    if (saved) {
      setPublishingChecklist(nextPublishingChecklist);
    }
  }

  async function uploadFinalArtwork(file: File | null) {
    if (!file || !episode?.id || !episode.podcast_id || !canManageEpisode) {
      return;
    }

    setIsUploading(true);
    setMessage("");

    const filePath = `episodes/${episode.id}/publishing/final-artwork-${file.lastModified}-${safeStorageName(
      file.name,
    )}`;
    const { error: uploadError } = await supabase.storage
      .from("episodes-material")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Kunde inte ladda upp publiceringsbild:", uploadError);
      setMessage(`Kunde inte ladda upp publiceringsbild: ${uploadError.message}`);
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("episodes-material")
      .getPublicUrl(filePath);
    const saved = await saveEpisodeFields(
      { final_artwork_url: publicUrlData.publicUrl },
      "Slutlig omslagsbild sparad.",
    );

    if (saved) {
      setFinalArtworkUrl(publicUrlData.publicUrl);
    }

    setIsUploading(false);
  }

  async function publishEpisode() {
    if (!episode || !canManageEpisode) {
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const nextHistory = [
      {
        action: "published",
        at: new Date().toISOString(),
        by: userData.user?.email || "Okänd användare",
        status: "Publicerad",
      },
      ...publishHistory,
    ];
    const nextPublishingChecklist = {
      ...publishingChecklist,
      "Redo att publicera": true,
    };
    const saved = await saveEpisodeFields(
      {
        publish_history: nextHistory,
        publish_status: "published",
        publishing_checklist: nextPublishingChecklist,
        status: "Published",
      },
      "Avsnittet är publicerat.",
    );

    if (saved) {
      setPublishHistory(nextHistory);
      setPublishStatus("published");
      setPublishingChecklist(nextPublishingChecklist);
      setStatus("Published");
      await createNotification({
        body: title,
        podcastId: episode.podcast_id,
        targetUrl: `/episodes/${episode.id}`,
        title: "Avsnitt publicerat",
        type: "episode_updated",
      });
    }
  }

  async function toggleChecklistItem(item: string) {
    if (!canManageEpisode) {
      return;
    }

    const nextChecklistState = {
      ...checklistState,
      [item]: !checklistState[item],
    };

    const saved = await saveEpisodeFields(
      { checklist: nextChecklistState, checklist_state: nextChecklistState },
      "Checklista sparad.",
    );

    if (saved) {
      setChecklistState(nextChecklistState);
      await createNotification({
        body: title,
        podcastId: episode?.podcast_id || null,
        targetUrl: `/episodes/${params.id}`,
        title: "Checklista uppdaterad",
        type: "episode_updated",
      });
    }
  }

  async function saveMaterialLines(nextLines: string[]) {
    if (!episode || !canManageEpisode) {
      return false;
    }

    const nextLinks = nextLines.join("\n");
    const { error } = await supabase
      .from("episodes")
      .update({ links: nextLinks })
      .eq("id", episode.id)
      .eq("podcast_id", episode.podcast_id);

    if (error) {
      console.error("Kunde inte spara material:", error);
      setMessage(`Kunde inte spara material: ${error.message}`);
      return false;
    }

    setLinks(nextLinks);
    setEpisode({ ...episode, links: nextLinks });
    setMessage("Material sparat.");
    return true;
  }

  async function removeThumbnail() {
    const saved = await saveMaterialLines(
      materialLines.filter((line) => !line.startsWith(thumbnailPrefix)),
    );

    if (saved) {
      await createNotification({
        body: title,
        podcastId: episode?.podcast_id || null,
        targetUrl: `/episodes/${params.id}`,
        title: "Omslagsbild ändrad",
        type: "thumbnail_changed",
      });
    }
  }

  async function uploadProductionFile(
    file: File | null,
    category: ProductionCategory,
  ) {
    if (!file || !episode?.id || !episode.podcast_id || !canManageEpisode) {
      return;
    }

    setUploadingCategory(category);
    setMessage("");

    const filePath = `episodes/${episode.id}/production/${category}/${file.lastModified}-${safeStorageName(
      file.name,
    )}`;
    const { error: uploadError } = await supabase.storage
      .from("episodes-material")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Kunde inte ladda upp produktionsfil:", uploadError);
      setMessage(`Kunde inte ladda upp fil: ${uploadError.message}`);
      setUploadingCategory(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("episodes-material")
      .getPublicUrl(filePath);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      console.error("Kunde inte hämta användare för produktionsfil:", userError);
      setMessage("Kunde inte spara filmetadata.");
      setUploadingCategory(null);
      return;
    }

    const { data, error } = await supabase
      .from("production_files")
      .insert({
        category,
        content_type: file.type || null,
        episode_id: episode.id,
        file_path: filePath,
        filename: file.name,
        podcast_id: episode.podcast_id,
        public_url: publicUrlData.publicUrl,
        size_bytes: file.size,
        uploaded_by: userData.user.id,
      })
      .select(
        "id,category,filename,file_path,public_url,content_type,size_bytes,created_at",
      )
      .single();

    if (error) {
      console.error("Kunde inte spara produktionsfil:", error);
      setMessage(`Kunde inte spara filmetadata: ${error.message}`);
      setUploadingCategory(null);
      return;
    }

    setProductionFiles((currentFiles) => [
      data as ProductionFile,
      ...currentFiles,
    ]);
    setMessage("Produktionsfil uppladdad.");
    setUploadingCategory(null);

    await createNotification({
      body: file.name,
      podcastId: episode.podcast_id,
      targetUrl: `/episodes/${episode.id}`,
      title: "Produktionsfil uppladdad",
      type: "material_uploaded",
    });
  }

  async function deleteProductionFile(file: ProductionFile) {
    if (!episode?.podcast_id || !canManageEpisode) {
      return;
    }

    setMessage("");

    const { error: storageError } = await supabase.storage
      .from("episodes-material")
      .remove([file.file_path]);

    if (storageError) {
      console.error("Kunde inte ta bort produktionsfil från Storage:", storageError);
      setMessage(`Kunde inte ta bort fil: ${storageError.message}`);
      return;
    }

    const { error } = await supabase
      .from("production_files")
      .delete()
      .eq("id", file.id)
      .eq("episode_id", episode.id);

    if (error) {
      console.error("Kunde inte ta bort produktionsfil:", error);
      setMessage(`Kunde inte ta bort filmetadata: ${error.message}`);
      return;
    }

    setProductionFiles((currentFiles) =>
      currentFiles.filter((currentFile) => currentFile.id !== file.id),
    );
    setMessage("Produktionsfil borttagen.");

    await createNotification({
      body: file.filename,
      podcastId: episode.podcast_id,
      targetUrl: `/episodes/${episode.id}`,
      title: "Produktionsfil borttagen",
      type: "material_deleted",
    });
  }

  async function uploadEpisodeMaterial(file: File | null) {
    if (!file || !episode?.id || !episode.podcast_id || !canManageEpisode) {
      return;
    }

    const kind = getMaterialKind(file);

    setUploadingMaterialKind(kind);
    setMessage("");

    const filePath = `episodes/${episode.id}/materials/${kind}/${file.lastModified}-${safeStorageName(
      file.name,
    )}`;
    const { error: uploadError } = await supabase.storage
      .from("episodes-material")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Kunde inte ladda upp material:", uploadError);
      setMessage(`Kunde inte ladda upp material: ${uploadError.message}`);
      setUploadingMaterialKind(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("episodes-material")
      .getPublicUrl(filePath);
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      console.error("Kunde inte hämta användare för material:", userError);
      setMessage("Kunde inte spara materialmetadata.");
      setUploadingMaterialKind(null);
      return;
    }

    const { data, error } = await supabase
      .from("episode_materials")
      .insert({
        content_type: file.type || null,
        created_by: userData.user.id,
        episode_id: episode.id,
        file_path: filePath,
        kind,
        name: file.name,
        podcast_id: episode.podcast_id,
        size_bytes: file.size,
        url: publicUrlData.publicUrl,
      })
      .select("id,kind,name,url,file_path,content_type,size_bytes,created_at")
      .single();

    if (error) {
      console.error("Kunde inte spara material:", error);
      setMessage(`Kunde inte spara materialmetadata: ${error.message}`);
      setUploadingMaterialKind(null);
      return;
    }

    setEpisodeMaterials((currentMaterials) => [
      data as EpisodeMaterial,
      ...currentMaterials,
    ]);
    setMessage("Material uppladdat.");
    setUploadingMaterialKind(null);

    await createNotification({
      body: file.name,
      podcastId: episode.podcast_id,
      targetUrl: `/episodes/${episode.id}`,
      title: "Material uppladdat",
      type: "material_uploaded",
    });
  }

  async function addExternalLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !episode?.id ||
      !episode.podcast_id ||
      !canManageEpisode ||
      !externalLinkUrl.trim()
    ) {
      return;
    }

    setMessage("");

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      console.error("Kunde inte hämta användare för länk:", userError);
      setMessage("Kunde inte spara länk.");
      return;
    }

    const linkName = externalLinkName.trim() || externalLinkUrl.trim();
    const { data, error } = await supabase
      .from("episode_materials")
      .insert({
        content_type: "text/uri-list",
        created_by: userData.user.id,
        episode_id: episode.id,
        file_path: null,
        kind: "link",
        name: linkName,
        podcast_id: episode.podcast_id,
        size_bytes: 0,
        url: externalLinkUrl.trim(),
      })
      .select("id,kind,name,url,file_path,content_type,size_bytes,created_at")
      .single();

    if (error) {
      console.error("Kunde inte spara länk:", error);
      setMessage(`Kunde inte spara länk: ${error.message}`);
      return;
    }

    setEpisodeMaterials((currentMaterials) => [
      data as EpisodeMaterial,
      ...currentMaterials,
    ]);
    setExternalLinkName("");
    setExternalLinkUrl("");
    setMessage("Länk sparad.");

    await createNotification({
      body: linkName,
      podcastId: episode.podcast_id,
      targetUrl: `/episodes/${episode.id}`,
      title: "Material uppladdat",
      type: "material_uploaded",
    });
  }

  async function deleteEpisodeMaterial(material: EpisodeMaterial) {
    if (!episode?.podcast_id || !canManageEpisode) {
      return;
    }

    setMessage("");

    if (material.file_path) {
      const { error: storageError } = await supabase.storage
        .from("episodes-material")
        .remove([material.file_path]);

      if (storageError) {
        console.error("Kunde inte ta bort material från Storage:", storageError);
        setMessage(`Kunde inte ta bort material: ${storageError.message}`);
        return;
      }
    }

    const { error } = await supabase
      .from("episode_materials")
      .delete()
      .eq("id", material.id)
      .eq("episode_id", episode.id);

    if (error) {
      console.error("Kunde inte ta bort material:", error);
      setMessage(`Kunde inte ta bort materialmetadata: ${error.message}`);
      return;
    }

    setEpisodeMaterials((currentMaterials) =>
      currentMaterials.filter((currentMaterial) => currentMaterial.id !== material.id),
    );
    setMessage("Material borttaget.");

    await createNotification({
      body: material.name,
      podcastId: episode.podcast_id,
      targetUrl: `/episodes/${episode.id}`,
      title: "Material borttaget",
      type: "material_deleted",
    });
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
      console.error("Kunde inte ladda upp fil:", error);
      setMessage(`Kunde inte ladda upp fil: ${error.message}`);
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

    const saved = await saveMaterialLines(nextLines);

    if (saved) {
      await createNotification({
        body: file.name,
        podcastId: episode.podcast_id,
        targetUrl: `/episodes/${params.id}`,
        title:
          kind === "thumbnail" ? "Omslagsbild ändrad" : "Material uppladdat",
        type: kind === "thumbnail" ? "thumbnail_changed" : "material_uploaded",
      });
    }

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

  async function changeStage(nextStage: string) {
    if (!episode || !canManageEpisode || nextStage === status) {
      return;
    }

    setMessage("");

    const { error } = await supabase
      .from("episodes")
      .update({ status: nextStage })
      .eq("id", episode.id)
      .eq("podcast_id", episode.podcast_id);

    if (error) {
      console.error("Kunde inte uppdatera steg:", error);
      setMessage(`Kunde inte uppdatera steg: ${error.message}`);
      return;
    }

    setStatus(nextStage);
    setEpisode({ ...episode, status: nextStage });
    setMessage("Steg uppdaterat.");

    await createNotification({
      body: `${episode.title}: ${stageLabel(nextStage)}`,
      podcastId: episode.podcast_id,
      targetUrl: `/episodes/${episode.id}`,
      title: "Steg ändrat",
      type: "episode_updated",
    });
  }

  function renderProductionTimeline() {
    const activeIndex = productionStages.indexOf(status);

    return (
      <div className="w-full overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-2">
          {productionStages.map((stage, index) => {
            const isCompleted = index < activeIndex;
            const isActive = index === activeIndex;

            return (
              <button
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition ${
                  isCompleted
                    ? "bg-[#1DB954] text-black"
                    : isActive
                      ? "bg-[#1DB954]/20 text-[#1DB954] ring-1 ring-[#1DB954]/40"
                      : "bg-[#181818] text-zinc-500 ring-1 ring-zinc-800"
                } disabled:cursor-default`}
                disabled={!canManageEpisode}
                key={stage}
                onClick={() => changeStage(stage)}
                type="button"
              >
                <span
                  className={`size-2 rounded-full ${
                    isCompleted || isActive ? "bg-[#1DB954]" : "bg-zinc-600"
                  }`}
                />
                {stageLabel(stage)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderProductionCategory(category: ProductionCategory, titleText: string) {
    const files = productionFiles.filter((file) => file.category === category);
    const isCategoryUploading = uploadingCategory === category;
  
    return (
      <div className="rounded-xl bg-[#181818] p-4" key={category}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-white">{titleText}</h3>
          {canManageEpisode ? (
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full bg-[#1DB954] px-4 py-2 text-xs font-bold text-black transition hover:bg-[#22d760] has-disabled:cursor-not-allowed has-disabled:opacity-60">
              <Upload size={14} />
              {isCategoryUploading ? "Laddar upp..." : "Ladda upp"}
              <input
                className="hidden"
                disabled={isUploading || isCategoryUploading}
                onChange={(event) => {
                  uploadProductionFile(event.target.files?.[0] || null, category);
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3">
          {files.map((file) => (
            <div className="rounded-xl bg-[#111111] p-4" key={file.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {file.filename}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatUploadDate(file.created_at)} ·{" "}
                    {formatFileSize(file.size_bytes)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    className="inline-flex items-center gap-2 rounded-full bg-[#181818] px-4 py-2 text-xs font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                    download
                    href={file.public_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Download size={14} />
                    Ladda ner
                  </a>
                  {canManageEpisode ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-[#181818] px-4 py-2 text-xs font-bold text-zinc-300 ring-1 ring-zinc-800 transition hover:text-white"
                      onClick={() => deleteProductionFile(file)}
                      type="button"
                    >
                      <Trash2 size={14} />
                      Ta bort
                    </button>
                  ) : null}
                </div>
              </div>

              {isAudioType(file.content_type) ? (
                <audio
                  className="mt-4 w-full"
                  controls
                  src={file.public_url}
                >
                  <track kind="captions" />
                </audio>
              ) : null}
            </div>
          ))}

          {files.length === 0 ? (
            <p className="rounded-xl bg-[#111111] p-4 text-sm text-zinc-500">
              Ingen fil uppladdad ännu.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  function renderMaterialGroup(group: (typeof materialGroups)[number]) {
    const materials = episodeMaterials.filter(
      (material) => material.kind === group.key,
    );
    const Icon = group.icon;
    const isGroupUploading = uploadingMaterialKind === group.key;

    return (
      <div className="rounded-xl bg-[#181818] p-4" key={group.key}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Icon size={16} />
            {group.title}
          </h3>
          {canManageEpisode && group.key !== "link" ? (
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full bg-[#1DB954] px-4 py-2 text-xs font-bold text-black transition hover:bg-[#22d760] has-disabled:cursor-not-allowed has-disabled:opacity-60">
              <Upload size={14} />
              {isGroupUploading ? "Laddar upp..." : "Ladda upp"}
              <input
                accept={group.accept}
                className="hidden"
                disabled={isUploading || isGroupUploading}
                onChange={(event) => {
                  uploadEpisodeMaterial(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
          ) : null}
        </div>

        {canManageEpisode && group.key === "link" ? (
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={addExternalLink}>
            <input
              className="rounded-xl border border-zinc-800 bg-[#111111] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
              onChange={(event) => setExternalLinkName(event.target.value)}
              placeholder="Länknamn"
              value={externalLinkName}
            />
            <input
              className="rounded-xl border border-zinc-800 bg-[#111111] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954]"
              onChange={(event) => setExternalLinkUrl(event.target.value)}
              placeholder="https://"
              type="url"
              value={externalLinkUrl}
            />
            <button
              className="rounded-full bg-[#1DB954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#22d760]"
              type="submit"
            >
              Lägg till länk
            </button>
          </form>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {materials.map((material) => (
            <div className="rounded-xl bg-[#111111] p-4" key={material.id}>
              {material.kind === "image" ? (
                <img
                  alt=""
                  className="mb-4 aspect-video w-full rounded-lg bg-black object-cover"
                  src={material.url}
                />
              ) : null}

              {material.kind === "video" ? (
                <video
                  className="mb-4 aspect-video w-full rounded-lg bg-black"
                  controls
                  src={material.url}
                >
                  <track kind="captions" />
                </video>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {material.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {group.title} · {formatUploadDate(material.created_at)}
                    {material.size_bytes > 0
                      ? ` · ${formatFileSize(material.size_bytes)}`
                      : ""}
                  </p>
                </div>
                <Icon className="shrink-0 text-zinc-500" size={18} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  className="inline-flex items-center gap-2 rounded-full bg-[#181818] px-4 py-2 text-xs font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:text-white"
                  href={material.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink size={14} />
                  Öppna
                </a>
                {canManageEpisode ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-[#181818] px-4 py-2 text-xs font-bold text-zinc-300 ring-1 ring-zinc-800 transition hover:text-white"
                    onClick={() => deleteEpisodeMaterial(material)}
                    type="button"
                  >
                    <Trash2 size={14} />
                    Ta bort
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {materials.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[#111111] p-4 text-sm text-zinc-500">
            Inget material ännu.
          </p>
        ) : null}
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
              {renderProductionTimeline()}
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
              {renderProductionTimeline()}
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
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Produktion
          </h2>

          <div className="mt-6 grid gap-4">
            {productionCategories.map((category) =>
              renderProductionCategory(category.key, category.title),
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            Material
          </h2>

          <div className="mt-6 grid gap-4">
            {materialGroups.map((group) => renderMaterialGroup(group))}
          </div>
        </section>

        <section className="rounded-2xl bg-[#111111] p-4 shadow-xl shadow-black/20 ring-1 ring-zinc-900 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1DB954]">
                Publiceringscenter
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                Publicering
              </h2>
            </div>
            <span className="w-fit rounded-full bg-[#181818] px-3 py-1 text-xs font-bold text-zinc-300">
              {publishStatusLabel(publishStatus)}
            </span>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-xl bg-[#181818] p-4">
              <h3 className="text-sm font-semibold text-white">
                Slutlig omslagsbild
              </h3>
              <div className="mt-4 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#111111]">
                {finalArtworkUrl ? (
                  <img
                    alt=""
                    className="h-full w-full object-contain"
                    src={finalArtworkUrl}
                  />
                ) : (
                  <ImageIcon className="text-zinc-700" size={56} />
                )}
              </div>
              {canManageEpisode ? (
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#1DB954] px-5 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] has-disabled:cursor-not-allowed has-disabled:opacity-60">
                  <Upload size={16} />
                  {isUploading ? "Laddar upp..." : "Ladda upp slutlig omslagsbild"}
                  <input
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(event) => {
                      uploadFinalArtwork(event.target.files?.[0] || null);
                      event.target.value = "";
                    }}
                    type="file"
                  />
                </label>
              ) : null}
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={savePublishing}>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Publiceringsdatum
                </span>
                <input
                  className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none focus:border-[#1DB954] disabled:opacity-60"
                  disabled={!canManageEpisode}
                  onChange={(event) => setPublishDate(event.target.value)}
                  type="date"
                  value={publishDate}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Publiceringsstatus
                </span>
                <select
                  className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none focus:border-[#1DB954] disabled:opacity-60"
                  disabled={!canManageEpisode}
                  onChange={(event) => setPublishStatus(event.target.value)}
                  value={publishStatus}
                >
                  <option className="bg-[#181818] text-white" value="draft">
                    Utkast
                  </option>
                  <option className="bg-[#181818] text-white" value="ready">
                    Redo
                  </option>
                  <option className="bg-[#181818] text-white" value="scheduled">
                    Schemalagd
                  </option>
                  <option className="bg-[#181818] text-white" value="published">
                    Publicerad
                  </option>
                </select>
              </label>

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
                onChange={(event) => setApplePodcastsLink(event.target.value)}
                placeholder="Apple Podcasts-länk"
                type="url"
                value={applePodcastsLink}
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

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  RSS-status
                </span>
                <select
                  className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none focus:border-[#1DB954] disabled:opacity-60"
                  disabled={!canManageEpisode}
                  onChange={(event) => setRssStatus(event.target.value)}
                  value={rssStatus}
                >
                  <option className="bg-[#181818] text-white" value="not_ready">
                    Inte redo
                  </option>
                  <option className="bg-[#181818] text-white" value="valid">
                    Redo
                  </option>
                  <option className="bg-[#181818] text-white" value="published">
                    Publicerad
                  </option>
                </select>
              </label>

              <input
                className="rounded-xl border border-zinc-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#1DB954] disabled:opacity-60"
                disabled={!canManageEpisode}
                onChange={(event) => setEpisodeDuration(event.target.value)}
                placeholder="Avsnittslängd, t.ex. 42:15"
                type="text"
                value={episodeDuration}
              />

              {canManageEpisode ? (
                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <button
                    className="rounded-full bg-[#181818] px-6 py-3 text-sm font-bold text-zinc-200 ring-1 ring-zinc-800 transition hover:bg-[#202020] hover:text-white disabled:opacity-60"
                    disabled={isSaving}
                    type="submit"
                  >
                    Spara publicering
                  </button>
                  <button
                    className="rounded-full bg-[#1DB954] px-6 py-3 text-sm font-bold text-black transition hover:bg-[#22d760] disabled:opacity-60"
                    disabled={isSaving || publishStatus === "published"}
                    onClick={publishEpisode}
                    type="button"
                  >
                    Publicera
                  </button>
                </div>
              ) : null}
            </form>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-[#181818] p-4">
              <h3 className="text-sm font-semibold text-white">
                Publiceringschecklista
              </h3>
              <div className="mt-4 grid gap-3">
                {publishingChecklistItems.map((item) => (
                  <button
                    className="flex items-center justify-between rounded-xl bg-[#111111] p-4 text-left transition hover:bg-[#202020] disabled:cursor-default"
                    disabled={!canManageEpisode}
                    key={item}
                    onClick={() => togglePublishingChecklistItem(item)}
                    type="button"
                  >
                    <span className="text-sm font-semibold text-white">
                      {item}
                    </span>
                    <span
                      className={`flex size-7 items-center justify-center rounded-full ${
                        publishingChecklist[item]
                          ? "bg-[#1DB954] text-black"
                          : "bg-[#181818] text-zinc-600"
                      }`}
                    >
                      <CheckCircle2 size={16} />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-[#181818] p-4">
              <h3 className="text-sm font-semibold text-white">
                Publiceringshistorik
              </h3>
              <div className="mt-4 grid gap-3">
                {publishHistory.map((historyItem) => (
                  <div
                    className="rounded-xl bg-[#111111] p-4"
                    key={`${historyItem.action}-${historyItem.at}`}
                  >
                    <p className="text-sm font-semibold text-white">
                      {stageLabel(historyItem.status)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatUploadDate(historyItem.at)} · {historyItem.by}
                    </p>
                  </div>
                ))}
              </div>

              {publishHistory.length === 0 ? (
                <p className="mt-4 rounded-xl bg-[#111111] p-4 text-sm text-zinc-500">
                  Ingen publiceringshistorik ännu.
                </p>
              ) : null}
            </div>
          </div>
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
    </main>
  );
}
