"use client";

import Link from "next/link";
import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Columns3,
  Copy,
  Download,
  FileAudio,
  FileText,
  Headphones,
  Maximize2,
  Mic,
  MoreHorizontal,
  MousePointer2,
  Music,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Scissors,
  Search,
  SlidersHorizontal,
  Square,
  Trash2,
  Undo2,
  Waves,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Podcast = {
  id: string;
  name: string;
};

type PodcastMemberRow = {
  podcast_id: string;
  podcasts: Podcast | Podcast[] | null;
};

type Episode = {
  id: string;
  title: string;
};

type PodcastMember = {
  avatar_url?: string | null;
  display_name: string | null;
  email: string;
  role: string;
  user_id: string;
};

type TrackType = "microphone" | "imported_audio" | "music" | "sound_effect";
type ChannelMode = "mono" | "stereo";

type StudioClip = {
  blobUrl?: string;
  id: string;
  localRecordingId?: string;
  trackId: string;
  name: string;
  sourceFileId: string;
  sourceUrl: string;
  startTime: number;
  sourceOffset: number;
  duration: number;
  gain: number;
  fadeIn: number;
  fadeOut: number;
  locked: boolean;
  muted: boolean;
  uploadStatus: "uploaded" | "failed" | "local_only";
  waveformPeaks: number[];
};

type StudioTrack = {
  id: string;
  name: string;
  type: TrackType;
  assignedUserId: string;
  inputDeviceId: string;
  outputDeviceId: string;
  channelMode: ChannelMode;
  inputGain: number;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  monitoring: boolean;
  inputPeak: number;
  outputPeak: number;
  clipping: boolean;
  lowSignal: boolean;
  order: number;
  height: number;
  clips: StudioClip[];
};

type StudioMarker = {
  id: string;
  positionSeconds: number;
  title: string;
};

type StudioProject = {
  id: string;
  remoteUpdatedAt: string;
  podcastId: string;
  episodeId: string;
  name: string;
  tracks: StudioTrack[];
  selectedTrackId: string;
  selectedClipId: string;
  selectionEnd: number | null;
  selectionStart: number | null;
  playheadSeconds: number;
  zoom: number;
  sampleRate: number;
  version: number;
  duration: number;
  masterVolume: number;
  masterMuted: boolean;
  mediaFiles: StudioMediaFile[];
  markers: StudioMarker[];
  outputDeviceId: string;
  recordingStatus: "ready" | "recording" | "paused" | "stopped";
  isDirty: boolean;
};

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "local" | "error";
type ExportRange = "project" | "selection" | "track";
type ExportBitDepth = 16 | 24 | 32;
type ExportForm = {
  bitDepth: ExportBitDepth;
  filename: string;
  range: ExportRange;
  sampleRate: number;
  trackId: string;
  uploadToProduction: boolean;
};

type StudioProjectContextValue = {
  canEdit: boolean;
  executeEditingCommand: (updater: (project: StudioProject) => StudioProject) => void;
  inputDevices: MediaDeviceInfo[];
  members: PodcastMember[];
  outputDevices: MediaDeviceInfo[];
  outputSelectionSupported: boolean;
  project: StudioProject | null;
  pushUndoSnapshot: (snapshot: StudioProject) => void;
  selectTrack: (trackId: string) => void;
  seekPlayback: (seconds: number) => void;
  setMessage: (message: string) => void;
  setProject: (updater: (project: StudioProject) => StudioProject) => void;
};

type AddTrackForm = {
  assignedUserId: string;
  channelMode: ChannelMode;
  inputDeviceId: string;
  name: string;
  outputDeviceId: string;
  type: TrackType;
};

type StudioProjectRow = {
  channel_mode: string;
  duration_seconds: number | string | null;
  episode_id: string;
  id: string;
  master_muted: boolean | null;
  master_volume: number | string | null;
  name: string;
  output_device_id: string | null;
  playhead_seconds: number | string | null;
  podcast_id: string;
  recording_status: string | null;
  sample_rate: number | string | null;
  selection_end: number | string | null;
  selection_start: number | string | null;
  updated_at: string;
  zoom: number | string | null;
  version: number | null;
};

type StudioPresence = {
  avatarUrl: string;
  clipId: string;
  name: string;
  trackId: string;
  userId: string;
};

type StudioTrackRow = {
  armed: boolean | null;
  assigned_user_id: string | null;
  channel_mode: string | null;
  height: number | null;
  id: string;
  input_gain: number | string | null;
  input_device_id: string | null;
  input_peak: number | string | null;
  low_signal: boolean | null;
  monitoring: boolean | null;
  muted: boolean | null;
  name: string;
  output_device_id: string | null;
  output_peak: number | string | null;
  pan: number | string | null;
  clipping: boolean | null;
  project_id: string;
  solo: boolean | null;
  track_order: number | null;
  type: string | null;
  volume: number | string | null;
};

type StudioClipRow = {
  duration: number | string | null;
  gain: number | string | null;
  fade_in: number | string | null;
  fade_out: number | string | null;
  id: string;
  local_recording_id: string | null;
  locked: boolean | null;
  muted: boolean | null;
  name: string;
  source_file_id: string | null;
  source_offset: number | string | null;
  start_time: number | string | null;
  track_id: string;
  upload_status: string | null;
  waveform_peaks: number[] | null;
};

type StudioFileRow = {
  category?: string | null;
  content_type?: string | null;
  created_at?: string | null;
  duration_seconds?: number | string | null;
  filename?: string | null;
  id: string;
  file_path?: string | null;
  public_url: string | null;
  sample_rate?: number | string | null;
  size_bytes?: number | string | null;
  waveform_peaks?: number[] | null;
};

type StudioMediaFile = {
  category: "recordings" | "imported" | "music" | "sound-effects" | "exports";
  contentType: string;
  createdAt: string;
  durationSeconds: number;
  filename: string;
  id: string;
  publicUrl: string;
  sampleRate: number;
  sizeBytes: number;
  waveformPeaks: number[];
};

type StudioMarkerRow = {
  id: string;
  position_seconds: number | string | null;
  title: string;
};

type LocalStudioRecord = {
  project: StudioProject;
  savedAt: string;
};

type LocalRecordingRecord = {
  audioBuffer?: AudioBuffer;
  blob: Blob;
  clip: StudioClip;
  createdAt: string;
  duration: number;
  episodeId: string;
  filename: string;
  id: string;
  mimeType: string;
  objectUrl?: string;
  podcastId: string;
  projectId: string;
  sizeBytes: number;
  storagePath: string;
  trackId: string;
  uploadStatus: StudioClip["uploadStatus"];
  waveformPeaks: number[];
};

type SavedRecordingRecord = {
  blob: Blob;
  clip: Omit<StudioClip, "blobUrl" | "sourceUrl"> & { sourceUrl?: string };
  createdAt: string;
  durationSeconds: number;
  episodeId: string;
  filename: string;
  id: string;
  mimeType: string;
  podcastId: string;
  projectId: string;
  sizeBytes: number;
  storagePath: string;
  trackId: string;
  uploadStatus: StudioClip["uploadStatus"];
  waveformPeaks: number[];
};

type LocalRecordingRecovery = {
  activeDuration: number;
  episodeId: string;
  id: string;
  mimeType: string;
  paused: boolean;
  projectId: string;
  recordingId: string;
  startPosition: number;
  startedAt: string;
  trackId: string;
  waveformPeaks: number[];
  sizeBytes?: number;
};

type RecordingClock = {
  accumulatedMs: number;
  runningSince: number;
};

// Projektgräns: serialiserbart Studio-tillstånd och rena tillståndsövergångar.

const StudioProjectContext = createContext<StudioProjectContextValue | null>(
  null,
);

const mediaSections = [
  { category: "project", icon: Columns3, label: "Projekt" },
  { category: "recordings", icon: FileAudio, label: "Inspelningar" },
  { category: "imported", icon: Waves, label: "Importerat ljud" },
  { category: "music", icon: Music, label: "Musik" },
  { category: "sound-effects", icon: SlidersHorizontal, label: "Ljudeffekter" },
  { category: "exports", icon: Download, label: "Exporter" },
];

const trackTypeLabels: Record<TrackType, string> = {
  imported_audio: "Importerat ljud",
  microphone: "Mikrofon",
  music: "Musik",
  sound_effect: "Ljudeffekt",
};

const channelModeLabels: Record<ChannelMode, string> = {
  mono: "Mono",
  stereo: "Stereo",
};

const TRACK_HEADER_WIDTH = 220;
const TRACK_ROW_HEIGHT = 104;
const TIMELINE_BASE_PIXELS_PER_SECOND = 12;
const TIMELINE_RULER_INTERVAL_SECONDS = 15;
const RECORDING_TIMESLICE_MS = 3000;

function createId() {
  return crypto.randomUUID();
}

function formatTimer(seconds: number) {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}:${remainingSeconds}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(0, bytes / 1024).toFixed(1)} kB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function studioSaveLabel(
  isLoading: boolean,
  project: StudioProject | null,
  saveStatus: SaveStatus,
) {
  if (isLoading) {
    return "Laddar";
  }

  if (!project) {
    return "Välj avsnitt";
  }

  if (saveStatus === "saving") {
    return "Sparar…";
  }

  if (saveStatus === "error") {
    return "Kunde inte spara i molnet";
  }

  if (saveStatus === "local") {
    return "Sparat lokalt";
  }

  if (project.isDirty || saveStatus === "dirty") {
    return "Ej sparat";
  }

  return "Sparat";
}

function createInitialTrack(): StudioTrack {
  return {
    armed: true,
    assignedUserId: "",
    channelMode: "mono",
    clipping: false,
    clips: [],
    height: TRACK_ROW_HEIGHT,
    id: createId(),
    inputGain: 1,
    inputDeviceId: "",
    inputPeak: 0,
    lowSignal: false,
    muted: false,
    monitoring: false,
    name: "Huvudspår",
    order: 0,
    outputDeviceId: "",
    outputPeak: 0,
    pan: 0,
    solo: false,
    type: "microphone",
    volume: 1,
  };
}

function asNumber(value: number | string | null | undefined, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function isTrackType(value: string | null | undefined): value is TrackType {
  return (
    value === "microphone" ||
    value === "imported_audio" ||
    value === "music" ||
    value === "sound_effect"
  );
}

function isChannelMode(value: string | null | undefined): value is ChannelMode {
  return value === "mono" || value === "stereo";
}

function toStudioTrack(row: StudioTrackRow, clips: StudioClipRow[]) {
  return {
    armed: Boolean(row.armed),
    assignedUserId: row.assigned_user_id || "",
    channelMode: isChannelMode(row.channel_mode) ? row.channel_mode : "mono",
    clipping: false,
    clips: clips
      .filter((clip) => clip.track_id === row.id)
      .map((clip) => {
        const uploadStatus: StudioClip["uploadStatus"] =
          clip.upload_status === "failed" || clip.upload_status === "local_only"
            ? clip.upload_status
            : "uploaded";

        return {
          duration: asNumber(clip.duration),
          fadeIn: asNumber(clip.fade_in),
          fadeOut: asNumber(clip.fade_out),
          gain: asNumber(clip.gain, 1),
          id: clip.id,
          localRecordingId: clip.local_recording_id || "",
          locked: Boolean(clip.locked),
          muted: Boolean(clip.muted),
          name: clip.name,
          sourceFileId: clip.source_file_id || "",
          sourceOffset: asNumber(clip.source_offset),
          sourceUrl: clip.source_file_id || "",
          startTime: asNumber(clip.start_time),
          trackId: clip.track_id,
          uploadStatus,
          waveformPeaks: Array.isArray(clip.waveform_peaks)
            ? clip.waveform_peaks
            : [],
        };
      }),
    height: Math.min(320, Math.max(96, row.height || TRACK_ROW_HEIGHT)),
    id: row.id,
    inputGain: asNumber(row.input_gain, 1),
    inputDeviceId:
      row.input_device_id && row.input_device_id !== "standard"
        ? row.input_device_id
        : "",
    inputPeak: 0,
    lowSignal: false,
    muted: Boolean(row.muted),
    monitoring: Boolean(row.monitoring),
    name: row.name,
    order: row.track_order || 0,
    outputDeviceId:
      row.output_device_id && row.output_device_id !== "standard"
        ? row.output_device_id
        : "",
    outputPeak: 0,
    pan: asNumber(row.pan),
    solo: Boolean(row.solo),
    type: isTrackType(row.type) ? row.type : "microphone",
    volume: asNumber(row.volume, 1),
  };
}

function toStudioProject(
  projectRow: StudioProjectRow,
  trackRows: StudioTrackRow[],
  clipRows: StudioClipRow[],
  fileRows: StudioFileRow[] = [],
  markerRows: StudioMarkerRow[] = [],
) {
  const fileUrls = new Map(
    fileRows.map((file) => [file.id, file.public_url || ""]),
  );
  const mediaFiles = fileRows
    .filter((file) =>
      file.category === "recordings" ||
      file.category === "imported" ||
      file.category === "music" ||
      file.category === "sound-effects" ||
      file.category === "exports",
    )
    .map((file) => ({
      category: file.category as StudioMediaFile["category"],
      contentType: file.content_type || "",
      createdAt: file.created_at || "",
      durationSeconds: asNumber(file.duration_seconds),
      filename: file.filename || "Ljudfil",
      id: file.id,
      publicUrl: file.public_url || "",
      sampleRate: asNumber(file.sample_rate),
      sizeBytes: asNumber(file.size_bytes),
      waveformPeaks: Array.isArray(file.waveform_peaks) ? file.waveform_peaks : [],
    }));
  const tracks = trackRows
    .map((track) => {
      const nextTrack = toStudioTrack(track, clipRows);

      return {
        ...nextTrack,
        clips: nextTrack.clips.map((clip) => ({
          ...clip,
          sourceUrl: fileUrls.get(clip.sourceFileId) || clip.sourceUrl,
        })),
      };
    })
    .sort((first, second) => first.order - second.order);
  const fallbackTrack = createInitialTrack();
  const nextTracks = tracks.length > 0 ? tracks : [fallbackTrack];
  const recordingStatus: StudioProject["recordingStatus"] =
    projectRow.recording_status === "recording" ||
    projectRow.recording_status === "paused" ||
    projectRow.recording_status === "stopped"
      ? projectRow.recording_status
      : "ready";

  return {
    duration: getProjectDuration(nextTracks),
    episodeId: projectRow.episode_id,
    id: projectRow.id,
    isDirty: false,
    masterMuted: Boolean(projectRow.master_muted),
    masterVolume: asNumber(projectRow.master_volume, 1),
    mediaFiles,
    markers: markerRows.map((marker) => ({
      id: marker.id,
      positionSeconds: asNumber(marker.position_seconds),
      title: marker.title,
    })),
    name: projectRow.name,
    outputDeviceId:
      projectRow.output_device_id && projectRow.output_device_id !== "standard"
        ? projectRow.output_device_id
        : "",
    playheadSeconds: asNumber(projectRow.playhead_seconds),
    podcastId: projectRow.podcast_id,
    recordingStatus,
    remoteUpdatedAt: projectRow.updated_at,
    sampleRate: asNumber(projectRow.sample_rate, 48000),
    selectedClipId: "",
    selectionEnd:
      projectRow.selection_end === null ? null : asNumber(projectRow.selection_end),
    selectionStart:
      projectRow.selection_start === null ? null : asNumber(projectRow.selection_start),
    selectedTrackId: nextTracks[0]?.id || "",
    tracks: nextTracks,
    version: projectRow.version || 1,
    zoom: asNumber(projectRow.zoom, 120),
  };
}

function openStudioDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("podd-studio", 4);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("projects")) {
        request.result.createObjectStore("projects", { keyPath: "episodeId" });
      }

      if (!request.result.objectStoreNames.contains("recordings")) {
        request.result.createObjectStore("recordings", { keyPath: "id" });
      }

      if (!request.result.objectStoreNames.contains("recordingChunks")) {
        const chunksStore = request.result.createObjectStore("recordingChunks", {
          keyPath: "id",
        });

        chunksStore.createIndex("recordingId", "recordingId", {
          unique: false,
        });
      } else {
        const transaction = request.transaction;
        const chunksStore = transaction?.objectStore("recordingChunks");

        if (chunksStore && !chunksStore.indexNames.contains("recordingId")) {
          chunksStore.createIndex("recordingId", "recordingId", {
            unique: false,
          });
        }
      }

      if (!request.result.objectStoreNames.contains("recordingRecovery")) {
        request.result.createObjectStore("recordingRecovery", { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Persistensgräns: endast validerade, serialiserbara poster får nå IndexedDB.

function assertIndexedDBSerializable(value: unknown, path = "record"): void {
  if (typeof value === "function") throw new TypeError(`${path} contains a function`);
  if (typeof value === "string" && value.startsWith("blob:")) {
    throw new TypeError(`${path} contains an object URL`);
  }
  if (value === null || value === undefined || typeof value !== "object") return;
  if (value instanceof Blob || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return;
  const forbidden = [
    typeof AudioBuffer !== "undefined" ? AudioBuffer : null,
    typeof AudioContext !== "undefined" ? AudioContext : null,
    typeof MediaStream !== "undefined" ? MediaStream : null,
    typeof MediaRecorder !== "undefined" ? MediaRecorder : null,
    typeof AudioNode !== "undefined" ? AudioNode : null,
    typeof HTMLAudioElement !== "undefined" ? HTMLAudioElement : null,
  ].filter(Boolean) as Array<new (...args: never[]) => object>;
  if (forbidden.some((constructor) => value instanceof constructor)) {
    throw new TypeError(`${path} contains a Web Audio or media object`);
  }
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${path} contains a class instance`);
  }
  Object.entries(value).forEach(([key, child]) =>
    assertIndexedDBSerializable(child, `${path}.${key}`),
  );
}

function serializeClipForIndexedDB(clip: StudioClip) {
  return {
    duration: clip.duration,
    fadeIn: clip.fadeIn,
    fadeOut: clip.fadeOut,
    gain: clip.gain,
    id: clip.id,
    locked: clip.locked,
    localRecordingId: clip.localRecordingId,
    muted: clip.muted,
    name: clip.name,
    sourceFileId: clip.sourceFileId,
    sourceOffset: clip.sourceOffset,
    sourceUrl: clip.sourceUrl.startsWith("blob:") ? undefined : clip.sourceUrl,
    startTime: clip.startTime,
    trackId: clip.trackId,
    uploadStatus: clip.uploadStatus,
    waveformPeaks: [...clip.waveformPeaks],
  };
}

function serializeRecordingForIndexedDB(
  recording: LocalRecordingRecord,
): SavedRecordingRecord {
  const saved: SavedRecordingRecord = {
    blob: recording.blob,
    clip: serializeClipForIndexedDB(recording.clip),
    createdAt: recording.createdAt,
    durationSeconds: recording.duration,
    episodeId: recording.episodeId,
    filename: recording.filename,
    id: recording.id,
    mimeType: recording.mimeType,
    podcastId: recording.podcastId,
    projectId: recording.projectId,
    sizeBytes: recording.sizeBytes,
    storagePath: recording.storagePath,
    trackId: recording.trackId,
    uploadStatus: recording.uploadStatus,
    waveformPeaks: [...recording.waveformPeaks],
  };
  assertIndexedDBSerializable(saved);
  return saved;
}

function peaksFromAudioBuffer(buffer: AudioBuffer, peakCount = 240) {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) =>
    buffer.getChannelData(index),
  );
  const sampleLength = channels[0]?.length || 0;
  const blockSize = Math.max(1, Math.floor(sampleLength / peakCount));
  const sampleStride = Math.max(1, Math.floor(sampleLength / (peakCount * 256)));
  const peaks: number[] = [];
  for (let offset = 0; offset < sampleLength; offset += blockSize) {
    let peak = 0;
    for (const channel of channels) {
      for (
        let index = offset;
        index < Math.min(offset + blockSize, sampleLength);
        index += sampleStride
      ) {
        peak = Math.max(peak, Math.abs(channel[index]));
      }
    }
    peaks.push(Number(peak.toFixed(3)));
  }
  return peaks;
}

function summarizePeaks(peaks: number[], targetCount: number) {
  if (peaks.length <= targetCount) return peaks;
  const blockSize = peaks.length / targetCount;
  return Array.from({ length: targetCount }, (_, blockIndex) => {
    const start = Math.floor(blockIndex * blockSize);
    const end = Math.min(peaks.length, Math.ceil((blockIndex + 1) * blockSize));
    let peak = 0;
    for (let index = start; index < end; index += 1) peak = Math.max(peak, peaks[index] || 0);
    return peak;
  });
}

function clampAudioSample(sample: number) {
  return Math.max(-1, Math.min(1, sample));
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeWavFromAudioBuffer(buffer: AudioBuffer, bitDepth: ExportBitDepth) {
  const channelCount = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const bytesPerSample = bitDepth === 24 ? 3 : bitDepth / 8;
  const dataSize = buffer.length * channelCount * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  const isFloat = bitDepth === 32;

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, isFloat ? 3 : 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channelCount * bytesPerSample, true);
  view.setUint16(32, channelCount * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const channels = Array.from({ length: channelCount }, (_, index) =>
    buffer.getChannelData(Math.min(index, buffer.numberOfChannels - 1)),
  );
  let offset = 44;

  for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
      const sample = clampAudioSample(channels[channelIndex][sampleIndex] || 0);
      if (bitDepth === 16) {
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      } else if (bitDepth === 24) {
        const intSample = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
        view.setUint8(offset, intSample & 0xff);
        view.setUint8(offset + 1, (intSample >> 8) & 0xff);
        view.setUint8(offset + 2, (intSample >> 16) & 0xff);
        offset += 3;
      } else {
        view.setFloat32(offset, sample, true);
        offset += 4;
      }
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function sanitizeExportFilename(filename: string) {
  const cleanName = filename
    .trim()
    .replace(/\.wav$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase();

  return `${cleanName || "studio-export"}.wav`;
}

function getExportBounds(project: StudioProject, form: ExportForm) {
  if (form.range === "selection") {
    const start = Math.min(project.selectionStart ?? 0, project.selectionEnd ?? 0);
    const end = Math.max(project.selectionStart ?? 0, project.selectionEnd ?? 0);

    return end > start ? { start, end } : null;
  }

  if (form.range === "track") {
    const track = project.tracks.find((currentTrack) => currentTrack.id === form.trackId);
    const end = Math.max(
      0,
      ...(track?.clips || []).map((clip) => clip.startTime + clip.duration),
    );

    return end > 0 ? { start: 0, end } : null;
  }

  return project.duration > 0 ? { start: 0, end: project.duration } : null;
}

async function hydrateRecordingFromIndexedDB(
  savedRecording: SavedRecordingRecord,
): Promise<LocalRecordingRecord> {
  if (!(savedRecording?.blob instanceof Blob)) throw new TypeError("Missing recording Blob");
  const objectUrl = URL.createObjectURL(savedRecording.blob);
  let audioBuffer: AudioBuffer | undefined;
  let waveformPeaks = Array.isArray(savedRecording.waveformPeaks)
    ? savedRecording.waveformPeaks.filter((peak) => Number.isFinite(peak))
    : [];
  if (waveformPeaks.length === 0) {
    const context = new AudioContext();
    try {
      audioBuffer = await context.decodeAudioData(await savedRecording.blob.arrayBuffer());
      waveformPeaks = peaksFromAudioBuffer(audioBuffer);
    } finally {
      await context.close().catch(() => undefined);
    }
  }
  const clip = { ...savedRecording.clip, sourceUrl: objectUrl, blobUrl: objectUrl, waveformPeaks };
  return {
    audioBuffer,
    blob: savedRecording.blob,
    clip,
    createdAt: savedRecording.createdAt,
    duration: savedRecording.durationSeconds,
    episodeId: savedRecording.episodeId,
    filename: savedRecording.filename,
    id: savedRecording.id,
    mimeType: savedRecording.mimeType,
    objectUrl,
    podcastId: savedRecording.podcastId,
    projectId: savedRecording.projectId,
    sizeBytes: savedRecording.sizeBytes,
    storagePath: savedRecording.storagePath,
    trackId: savedRecording.trackId,
    uploadStatus: savedRecording.uploadStatus,
    waveformPeaks,
  };
}

async function saveLocalProject(project: StudioProject) {
  const database = await openStudioDatabase();
  const savedProject = {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => serializeClipForIndexedDB(clip)),
    })),
  } as StudioProject;
  const record = {
      episodeId: project.episodeId,
      project: savedProject,
      savedAt: new Date().toISOString(),
  };
  try {
    assertIndexedDBSerializable(record);
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("projects", "readwrite");
      transaction.objectStore("projects").put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

async function getLocalProject(episodeId: string) {
  const database = await openStudioDatabase();
  const record = await new Promise<LocalStudioRecord | undefined>(
    (resolve, reject) => {
      const transaction = database.transaction("projects", "readonly");
      const store = transaction.objectStore("projects");
      const request = store.get(episodeId);

      request.onsuccess = () => resolve(request.result as LocalStudioRecord);
      request.onerror = () => reject(request.error);
    },
  );

  database.close();

  return record;
}

async function saveLocalRecording(recording: LocalRecordingRecord) {
  let database: IDBDatabase | null = null;
  const saved = serializeRecordingForIndexedDB(recording);
  try {
    database = await openStudioDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database!.transaction("recordings", "readwrite");
      transaction.objectStore("recordings").put(saved);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    console.error("IndexedDB recording save failed", {
      name: failure.name,
      message: failure.message,
      recordingId: recording.id,
      fields: Object.keys(saved),
    });
    throw failure;
  } finally {
    database?.close();
  }
}

async function getLocalRecordings(projectId: string) {
  const database = await openStudioDatabase();
  try {
    return await new Promise<SavedRecordingRecord[]>((resolve, reject) => {
      const request = database.transaction("recordings", "readonly").objectStore("recordings").getAll();
      request.onsuccess = () => resolve((request.result as SavedRecordingRecord[]).filter((item) => item?.projectId === projectId));
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

async function deleteLocalRecording(id: string) {
  const database = await openStudioDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("recordings", "readwrite");
      transaction.objectStore("recordings").delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

async function deleteLocalRecordingArtifacts(id: string) {
  await Promise.all([
    deleteLocalRecording(id),
    deleteRecordingRecovery(id),
  ]);
}

async function saveRecordingChunk(recordingId: string, index: number, blob: Blob) {
  const database = await openStudioDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("recordingChunks", "readwrite");
    const store = transaction.objectStore("recordingChunks");

    const record = {
      blob,
      id: `${recordingId}:${index.toString().padStart(8, "0")}`,
      index,
      recordingId,
      savedAt: new Date().toISOString(),
    };
    assertIndexedDBSerializable(record);
    store.put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();
}

async function saveRecordingRecovery(recovery: LocalRecordingRecovery) {
  const database = await openStudioDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("recordingRecovery", "readwrite");
    const store = transaction.objectStore("recordingRecovery");

    assertIndexedDBSerializable(recovery);
    store.put(recovery);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();
}

async function getRecordingRecovery(id: string) {
  const database = await openStudioDatabase();
  const recovery = await new Promise<LocalRecordingRecovery | undefined>(
    (resolve, reject) => {
      const transaction = database.transaction("recordingRecovery", "readonly");
      const store = transaction.objectStore("recordingRecovery");
      const request = store.get(id);

      request.onsuccess = () =>
        resolve(request.result as LocalRecordingRecovery | undefined);
      request.onerror = () => reject(request.error);
    },
  );

  database.close();

  return recovery;
}

async function getRecordingChunks(recordingId: string) {
  const database = await openStudioDatabase();
  const chunks = await new Promise<Blob[]>((resolve, reject) => {
    const transaction = database.transaction("recordingChunks", "readonly");
    const store = transaction.objectStore("recordingChunks");
    const chunksByIndex: Array<{ blob: Blob; index: number }> = [];
    const request = store.index("recordingId").openCursor(IDBKeyRange.only(recordingId));

    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        resolve(
          chunksByIndex
            .sort((first, second) => first.index - second.index)
            .map((record) => record.blob),
        );
        return;
      }

      const value = cursor.value as { blob: Blob; index: number };

      chunksByIndex.push({ blob: value.blob, index: value.index });
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });

  database.close();

  return chunks;
}

async function deleteRecordingRecovery(recordingId: string) {
  const database = await openStudioDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      ["recordingChunks", "recordingRecovery"],
      "readwrite",
    );
    const chunksStore = transaction.objectStore("recordingChunks");
    const recoveryStore = transaction.objectStore("recordingRecovery");
    const request = chunksStore
      .index("recordingId")
      .openCursor(IDBKeyRange.only(recordingId));

    request.onsuccess = () => {
      const cursor = request.result;

      if (!cursor) {
        recoveryStore.delete(recordingId);
        return;
      }

      chunksStore.delete(cursor.primaryKey);
      cursor.continue();
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  database.close();
}

function projectToDatabase(project: StudioProject) {
  return {
    duration_seconds: project.duration,
    master_muted: project.masterMuted,
    master_volume: project.masterVolume,
    name: project.name,
    output_device_id: project.outputDeviceId,
    playhead_seconds: project.playheadSeconds,
    recording_status: project.recordingStatus,
    sample_rate: project.sampleRate,
    selection_end: project.selectionEnd,
    selection_start: project.selectionStart,
    zoom: project.zoom,
  };
}

function trackToDatabase(projectId: string, track: StudioTrack) {
  return {
    armed: track.armed,
    assigned_user_id: track.assignedUserId || null,
    channel_mode: track.channelMode,
    clipping: track.clipping,
    height: track.height,
    id: track.id,
    input_gain: track.inputGain,
    input_device_id: track.inputDeviceId,
    input_peak: track.inputPeak,
    low_signal: track.lowSignal,
    monitoring: track.monitoring,
    muted: track.muted,
    name: track.name,
    output_device_id: track.outputDeviceId,
    output_peak: track.outputPeak,
    pan: track.pan,
    project_id: projectId,
    solo: track.solo,
    track_order: track.order,
    type: track.type,
    volume: track.volume,
  };
}

function useStudioProject() {
  const context = useContext(StudioProjectContext);

  if (!context) {
    throw new Error("StudioProjectProvider saknas");
  }

  return context;
}

function memberLabel(member: PodcastMember | undefined) {
  if (!member) {
    return "Ingen ansvarig";
  }

  return member.display_name || member.email || "Medlem";
}

function getSupportedRecordingMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function fileExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "m4a";
  }

  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  return "webm";
}

function recordingStatusLabel(status: StudioProject["recordingStatus"]) {
  if (status === "recording") {
    return "Spelar in";
  }

  if (status === "paused") {
    return "Pausad";
  }

  if (status === "stopped") {
    return "Stoppad";
  }

  return "Redo";
}

function getRecordingActiveSeconds(clock: RecordingClock) {
  const runningMs = clock.runningSince
    ? performance.now() - clock.runningSince
    : 0;

  return (clock.accumulatedMs + runningMs) / 1000;
}

function describeStudioError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;

    return {
      code: record.code,
      details: record.details,
      hint: record.hint,
      message: record.message,
      name: record.name,
      raw: JSON.stringify(record),
    };
  }

  return { message: String(error) };
}

function isStudioVersionConflict(error: unknown) {
  if (error instanceof Error) {
    return error.message.includes("studio_project_version_conflict");
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return String(record.message || record.details || "").includes("studio_project_version_conflict");
  }

  return String(error).includes("studio_project_version_conflict");
}

// Inspelningsgräns: MediaRecorder, mikrofonström, mätning och återställning.

async function requestWakeLock() {
  const navigatorWithWakeLock = navigator as Navigator & {
    wakeLock?: {
      request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
    };
  };

  if (!navigatorWithWakeLock.wakeLock) {
    return null;
  }

  try {
    return await navigatorWithWakeLock.wakeLock.request("screen");
  } catch (error) {
    console.warn("Kunde inte aktivera skärmlås:", error);
    return null;
  }
}

function StudioProjectProvider({
  canEdit,
  children,
  executeEditingCommand,
  inputDevices,
  members,
  outputDevices,
  outputSelectionSupported,
  project,
  pushUndoSnapshot,
  setMessage,
  setProject,
  seekPlayback,
}: {
  canEdit: boolean;
  children: ReactNode;
  executeEditingCommand: (updater: (project: StudioProject) => StudioProject) => void;
  inputDevices: MediaDeviceInfo[];
  members: PodcastMember[];
  outputDevices: MediaDeviceInfo[];
  outputSelectionSupported: boolean;
  project: StudioProject | null;
  pushUndoSnapshot: (snapshot: StudioProject) => void;
  setMessage: (message: string) => void;
  setProject: (updater: (project: StudioProject) => StudioProject) => void;
  seekPlayback: (seconds: number) => void;
}) {
  function selectTrack(trackId: string) {
    setProject((currentProject) => ({
      ...currentProject,
      selectedTrackId: trackId,
    }));
  }

  return (
    <StudioProjectContext.Provider
      value={{
        canEdit,
        executeEditingCommand,
        inputDevices,
        members,
        outputDevices,
        outputSelectionSupported,
        project,
        pushUndoSnapshot,
        selectTrack,
        seekPlayback,
        setMessage,
        setProject,
      }}
    >
      {children}
    </StudioProjectContext.Provider>
  );
}

function updateTrackInProject(
  project: StudioProject,
  trackId: string,
  patch: Partial<StudioTrack>,
) {
  return {
    ...project,
    isDirty: true,
    tracks: project.tracks.map((track) =>
      track.id === trackId ? { ...track, ...patch } : track,
    ),
  };
}

function reorderTracks(tracks: StudioTrack[]) {
  return tracks.map((track, index) => ({ ...track, order: index }));
}

function getProjectDuration(tracks: StudioTrack[]) {
  return tracks.reduce(
    (furthestEnd, track) =>
      Math.max(
        furthestEnd,
        ...track.clips.map((clip) => clip.startTime + clip.duration),
      ),
    0,
  );
}

function updateClipInProject(
  project: StudioProject,
  clipId: string,
  patch: Partial<StudioClip>,
) {
  return {
    ...project,
    duration: Math.max(
      project.duration,
      ...project.tracks.flatMap((track) =>
        track.clips.map((clip) =>
          clip.id === clipId
            ? (patch.startTime ?? clip.startTime) + (patch.duration ?? clip.duration)
            : clip.startTime + clip.duration,
        ),
      ),
      0,
    ),
    isDirty: true,
    selectedClipId: clipId,
    selectedTrackId:
      patch.trackId ||
      project.tracks.find((track) =>
        track.clips.some((clip) => clip.id === clipId),
      )?.id ||
      project.selectedTrackId,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips
        .filter((clip) => clip.id !== clipId || !patch.trackId || patch.trackId === track.id)
        .map((clip) => (clip.id === clipId ? { ...clip, ...patch } : clip)),
    })),
  };
}

function moveClipToTrack(
  project: StudioProject,
  clipId: string,
  targetTrackId: string,
  patch: Partial<StudioClip>,
) {
  const sourceTrack = project.tracks.find((track) =>
    track.clips.some((clip) => clip.id === clipId),
  );
  const clip = sourceTrack?.clips.find((currentClip) => currentClip.id === clipId);

  if (!clip) {
    return project;
  }

  const nextClip = { ...clip, ...patch, trackId: targetTrackId };

  return {
    ...project,
    duration: Math.max(project.duration, nextClip.startTime + nextClip.duration),
    isDirty: true,
    selectedClipId: clipId,
    selectedTrackId: targetTrackId,
    tracks: project.tracks.map((track) => {
      if (track.id === sourceTrack?.id) {
        return {
          ...track,
          clips: track.clips.filter((currentClip) => currentClip.id !== clipId),
        };
      }

      if (track.id === targetTrackId) {
        return { ...track, clips: [...track.clips, nextClip] };
      }

      return track;
    }),
  };
}

function StudioPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [members, setMembers] = useState<PodcastMember[]>([]);
  const [selectedPodcastId, setSelectedPodcastId] = useState("");
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const [project, setProjectState] = useState<StudioProject | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [conflictServerVersion, setConflictServerVersion] = useState<number | null>(null);
  const [studioPresence, setStudioPresence] = useState<StudioPresence[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [isMediaCollapsed, setIsMediaCollapsed] = useState(false);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingSizeBytes, setRecordingSizeBytes] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [retryRecording, setRetryRecording] =
    useState<LocalRecordingRecord | null>(null);
  const [recoveryRecording, setRecoveryRecording] =
    useState<LocalRecordingRecovery | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState("");
  const saveTimerRef = useRef<number | null>(null);
  const versionPendingRef = useRef(false);
  const cloudSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const ignoreRealtimeUntilRef = useRef(0);
  const saveProjectVersionRef = useRef<
    (project?: StudioProject | null) => Promise<boolean>
  >(async () => false);
  const isLoadingProjectRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStopRequestedRef = useRef(false);
  const recordingFinalizingRef = useRef(false);
  const recordingSizeBytesRef = useRef(0);
  const microphoneDisconnectedHandlerRef = useRef<(() => void) | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const pendingChunkWritesRef = useRef<Array<Promise<void>>>([]);
  const recordingClockRef = useRef<RecordingClock>({
    accumulatedMs: 0,
    runningSince: 0,
  });
  const recordingChunkIndexRef = useRef(0);
  const recordingIdRef = useRef("");
  const recordingTrackIdRef = useRef("");
  const recordingStartPositionRef = useRef(0);
  const recordingStartedAtRef = useRef("");
  const recordingTimerRef = useRef<number | null>(null);
  const recordingWaveformPeaksRef = useRef<number[]>([]);
  const lastWaveformPeakAtRef = useRef(0);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const liveAudioContextRef = useRef<AudioContext | null>(null);
  const liveAnalyserRef = useRef<AnalyserNode | null>(null);
  const liveAnimationRef = useRef<number | null>(null);
  const monitoringElementRef = useRef<HTMLAudioElement | null>(null);
  const meterPeakHoldRef = useRef<Map<string, { peak: number; heldAt: number }>>(new Map());
  const lowSignalStartedAtRef = useRef<Map<string, number>>(new Map());
  const projectRef = useRef<StudioProject | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackOutputElementRef = useRef<HTMLAudioElement | null>(null);
  const playbackSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const playbackTimerRef = useRef<number | null>(null);
  const playbackStartedAtRef = useRef(0);
  const playbackStartPositionRef = useRef(0);
  const playbackLastStateUpdateRef = useRef(0);
  const clipBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const clipObjectUrlsRef = useRef<Set<string>>(new Set());
  const undoStackRef = useRef<StudioProject[]>([]);
  const redoStackRef = useRef<StudioProject[]>([]);
  const clipboardRef = useRef<StudioClip[]>([]);
  const playbackRangeEndRef = useRef<number | null>(null);
  const playbackLoopRef = useRef(false);
  const exportCancelRef = useRef(false);
  const [loopSelection, setLoopSelection] = useState(false);
  const outputSelectionSupported =
    typeof HTMLMediaElement !== "undefined" &&
    "setSinkId" in HTMLMediaElement.prototype;

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const timelineMetrics = useMemo(() => {
    const zoom = project?.zoom || 120;
    const pixelsPerSecond = TIMELINE_BASE_PIXELS_PER_SECOND * (zoom / 120);
    const duration = Math.max(project?.duration || 0, 60);
    const contentWidth = Math.max(900, (duration + 30) * pixelsPerSecond);

    return {
      contentWidth,
      pixelsPerSecond,
      rulerColumnWidth: pixelsPerSecond * TIMELINE_RULER_INTERVAL_SECONDS,
    };
  }, [project?.duration, project?.zoom]);
  const filteredSections = mediaSections.filter((section) =>
    section.label.toLowerCase().includes(mediaSearch.toLowerCase()),
  );
  const mediaSectionsWithMeta = filteredSections.map((section) => {
    if (section.category === "project") {
      return {
        ...section,
        meta: project ? `${project.tracks.length} spår` : "0 spår",
      };
    }

    const count =
      project?.mediaFiles.filter((file) => file.category === section.category).length || 0;

    return {
      ...section,
      meta: `${count} ${count === 1 ? "fil" : "filer"}`,
    };
  });

  function setProject(updater: (currentProject: StudioProject) => StudioProject) {
    setProjectState((currentProject) => {
      if (!currentProject) {
        return currentProject;
      }

      const updatedProject = updater(currentProject);
      const nextProject = {
        ...updatedProject,
        duration: getProjectDuration(updatedProject.tracks),
      };
      const isOnlySelectionChange =
        nextProject.tracks === currentProject.tracks &&
        nextProject.name === currentProject.name &&
        nextProject.zoom === currentProject.zoom &&
        nextProject.duration === currentProject.duration &&
        nextProject.playheadSeconds === currentProject.playheadSeconds &&
        nextProject.selectedClipId === currentProject.selectedClipId &&
        nextProject.selectedTrackId !== currentProject.selectedTrackId;

      if (!isOnlySelectionChange) {
        versionPendingRef.current = true;
        setSaveStatus("dirty");
        saveLocalProject(nextProject)
          .then(() => setSaveStatus((status) => (status === "dirty" ? "local" : status)))
          .catch((error) => {
            console.error("Kunde inte spara lokal studiokopia:", error);
          });
      }

      return nextProject;
    });
  }

  function pushUndoSnapshot(snapshot: StudioProject) {
    undoStackRef.current = [...undoStackRef.current.slice(-19), snapshot];
    redoStackRef.current = [];
  }

  async function persistCompletedCommand(
    previousProject: StudioProject,
    nextProject: StudioProject,
  ) {
    if (!canEdit) return;
    ignoreRealtimeUntilRef.current = Date.now() + 2500;
    const previousTrackIds = new Set(previousProject.tracks.map((track) => track.id));
    const nextTrackIds = new Set(nextProject.tracks.map((track) => track.id));
    const removedTrackIds = [...previousTrackIds].filter((id) => !nextTrackIds.has(id));
    const previousClipIds = new Set(
      previousProject.tracks.flatMap((track) => track.clips.map((clip) => clip.id)),
    );
    const nextClips = nextProject.tracks.flatMap((track) => track.clips);
    const nextClipIds = new Set(nextClips.map((clip) => clip.id));
    const removedClipIds = [...previousClipIds].filter((id) => !nextClipIds.has(id));

    try {
      let { data: savedProject, error: projectError } = await supabase.rpc(
        "save_studio_project_if_version",
        {
          expected_version: nextProject.version,
          project_patch: projectToDatabase(nextProject),
          target_project_id: nextProject.id,
        },
      );
      if (projectError && isStudioVersionConflict(projectError)) {
        const latest = await supabase.rpc("get_studio_project_for_episode", {
          target_episode_id: nextProject.episodeId,
        });
        const serverVersion = Number(
          (latest.data?.[0] as { project?: { version?: number } } | undefined)
            ?.project?.version || nextProject.version + 1,
        );
        const retry = await supabase.rpc("save_studio_project_if_version", {
          expected_version: serverVersion,
          project_patch: projectToDatabase({ ...nextProject, version: serverVersion }),
          target_project_id: nextProject.id,
        });
        savedProject = retry.data;
        projectError = retry.error;
      }
      if (projectError) throw projectError;
      const savedVersion =
        (savedProject as { version?: number } | null)?.version || nextProject.version + 1;
      if (projectRef.current?.id === nextProject.id) {
        projectRef.current = { ...projectRef.current, version: savedVersion };
        setProjectState((current) =>
          current?.id === nextProject.id ? { ...current, version: savedVersion } : current,
        );
      }
      if (removedClipIds.length > 0) {
        const { error } = await supabase.from("studio_clips").delete().in("id", removedClipIds);
        if (error) throw error;
      }
      if (removedTrackIds.length > 0) {
        const { error } = await supabase.from("studio_tracks").delete().in("id", removedTrackIds);
        if (error) throw error;
      }
      const { error: trackError } = await supabase
        .from("studio_tracks")
        .upsert(nextProject.tracks.map((track) => trackToDatabase(nextProject.id, track)));
      if (trackError) throw trackError;
      if (nextClips.length > 0) {
        const { error: clipError } = await supabase.from("studio_clips").upsert(
          nextClips.map((clip, index) => ({
            clip_order: index,
            created_by: currentUserId,
            duration: clip.duration,
            fade_in: clip.fadeIn,
            fade_out: clip.fadeOut,
            gain: clip.gain,
            id: clip.id,
            local_recording_id: clip.localRecordingId || null,
            locked: clip.locked,
            muted: clip.muted,
            name: clip.name,
            project_id: nextProject.id,
            source_file_id: clip.sourceFileId || null,
            source_offset: clip.sourceOffset,
            start_time: clip.startTime,
            track_id: clip.trackId,
            upload_status: clip.uploadStatus,
            waveform_peaks: clip.waveformPeaks,
          })),
        );
        if (clipError) {
          console.error("Kunde inte spara studioklipp:", describeStudioError(clipError));
          throw clipError;
        }
      }
      const previousMarkerIds = new Set((previousProject.markers || []).map((marker) => marker.id));
      const nextMarkerIds = new Set((nextProject.markers || []).map((marker) => marker.id));
      const removedMarkerIds = [...previousMarkerIds].filter((id) => !nextMarkerIds.has(id));
      if (removedMarkerIds.length > 0) {
        const { error } = await supabase.from("studio_markers").delete().in("id", removedMarkerIds);
        if (error) throw error;
      }
      if ((nextProject.markers || []).length > 0) {
        const { error } = await supabase.from("studio_markers").upsert(
          nextProject.markers.map((marker) => ({
            id: marker.id,
            position_seconds: marker.positionSeconds,
            project_id: nextProject.id,
            title: marker.title,
          })),
        );
        if (error) throw error;
      }
      const { error: activityError } = await supabase.from("studio_activity").insert({
        action_type: "project_edited",
        description: "Studioprojektet redigerades",
        metadata: { version: savedVersion },
        podcast_id: nextProject.podcastId,
        project_id: nextProject.id,
        user_id: currentUserId,
      });
      if (activityError) throw activityError;
      setSaveStatus("saved");
    } catch (error) {
      if (isStudioVersionConflict(error)) {
        setSaveStatus("local");
        setMessage("Projektet sparades lokalt och synkas igen.");
        return;
      }
      console.error("Kunde inte spara redigeringskommando:", describeStudioError(error));
      setSaveStatus("error");
      setMessage("Redigeringen kunde inte synkroniseras.");
    }
  }

  function executeEditingCommand(
    updater: (currentProject: StudioProject) => StudioProject,
    addToHistory = true,
  ) {
    const currentProject = projectRef.current;
    if (!currentProject || !canEdit) {
      if (!canEdit) setMessage("Du har endast läsbehörighet.");
      return;
    }
    const updatedProject = updater(currentProject);
    const nextProject = {
      ...updatedProject,
      duration: getProjectDuration(updatedProject.tracks),
      isDirty: true,
    };
    if (addToHistory) {
      undoStackRef.current = [...undoStackRef.current.slice(-49), currentProject];
      redoStackRef.current = [];
    }
    projectRef.current = nextProject;
    setProjectState(nextProject);
    setSaveStatus("saving");
    void saveLocalProject(nextProject).catch((error) => {
      console.error("Kunde inte spara redigering lokalt:", error);
      setMessage("Redigeringen kunde inte sparas lokalt.");
    });
    cloudSaveQueueRef.current = cloudSaveQueueRef.current.then(() =>
      persistCompletedCommand(currentProject, nextProject),
    );
  }

  function undoLastClipEdit() {
    const previousProject = undoStackRef.current.pop();

    if (!previousProject || !project) {
      setMessage("Inget att ångra.");
      return;
    }

    redoStackRef.current = [...redoStackRef.current, project];
    executeEditingCommand(() => previousProject, false);
  }

  function redoLastClipEdit() {
    const nextProject = redoStackRef.current.pop();

    if (!nextProject || !project) {
      setMessage("Inget att göra om.");
      return;
    }

    undoStackRef.current = [...undoStackRef.current, project];
    executeEditingCommand(() => nextProject, false);
  }

  function deleteSelectedClip() {
    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }
    if (!project?.selectedClipId) {
      setMessage("Välj ett ljudklipp att ta bort.");
      return;
    }

    if (!window.confirm("Ta bort valt ljudklipp?")) {
      return;
    }

    const clipId = project.selectedClipId;
    executeEditingCommand((currentProject) => ({
      ...currentProject,
      selectedClipId: "",
      tracks: currentProject.tracks.map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => clip.id !== clipId),
      })),
    }));
    setMessage("Klippet är borttaget utan att originalfilen ändrades.");
  }

  function selectedRange(currentProject = projectRef.current) {
    if (
      !currentProject ||
      currentProject.selectionStart === null ||
      currentProject.selectionEnd === null
    ) return null;
    const start = Math.min(currentProject.selectionStart, currentProject.selectionEnd);
    const end = Math.max(currentProject.selectionStart, currentProject.selectionEnd);
    return end - start >= 0.001 ? { end, start } : null;
  }

  function splitSelectedClipAt(times: number[]) {
    const currentProject = projectRef.current;
    const selected = currentProject?.tracks
      .flatMap((track) => track.clips)
      .find((clip) => clip.id === currentProject.selectedClipId);
    if (!currentProject || !selected || selected.locked) {
      setMessage(selected?.locked ? "Klippet är låst." : "Välj ett klipp att dela.");
      return;
    }
    const splitTimes = [...new Set(times)]
      .filter((time) => time > selected.startTime + 0.1 && time < selected.startTime + selected.duration - 0.1)
      .sort((a, b) => a - b);
    if (splitTimes.length === 0) {
      setMessage("Ingen giltig delningspunkt finns i klippet.");
      return;
    }
    executeEditingCommand((projectToEdit) => ({
      ...projectToEdit,
      selectedClipId: "",
      tracks: projectToEdit.tracks.map((track) => ({
        ...track,
        clips: track.clips.flatMap((clip) => {
          if (clip.id !== selected.id) return [clip];
          const boundaries = [clip.startTime, ...splitTimes, clip.startTime + clip.duration];
          return boundaries.slice(0, -1).map((start, index) => ({
            ...clip,
            duration: boundaries[index + 1] - start,
            fadeIn: index === 0 ? clip.fadeIn : 0,
            fadeOut: index === boundaries.length - 2 ? clip.fadeOut : 0,
            id: createId(),
            name: `${clip.name} ${index + 1}`,
            sourceOffset: clip.sourceOffset + start - clip.startTime,
            startTime: start,
          }));
        }),
      })),
    }));
    setMessage("Klippet är delat.");
  }

  function copySelection() {
    const currentProject = projectRef.current;
    if (!currentProject) return;
    const range = selectedRange(currentProject);
    const selected = currentProject.tracks
      .flatMap((track) => track.clips)
      .filter((clip) =>
        range
          ? clip.startTime < range.end && clip.startTime + clip.duration > range.start
          : clip.id === currentProject.selectedClipId,
      );
    clipboardRef.current = selected.map((clip) => ({ ...clip }));
    setMessage(selected.length ? "Kopierat." : "Inget klipp eller intervall är valt.");
  }

  function pasteClipboard() {
    const currentProject = projectRef.current;
    if (!currentProject || clipboardRef.current.length === 0) {
      setMessage("Urklipp är tomt.");
      return;
    }
    const origin = Math.min(...clipboardRef.current.map((clip) => clip.startTime));
    const targetTrackId = currentProject.selectedTrackId || currentProject.tracks[0]?.id;
    const pastedClips = clipboardRef.current.map((clip) => ({
      ...clip,
      id: createId(),
      locked: false,
      startTime: currentProject.playheadSeconds + clip.startTime - origin,
      trackId:
        clipboardRef.current.length === 1 && targetTrackId
          ? targetTrackId
          : clip.trackId,
    }));
    executeEditingCommand((projectToEdit) => ({
      ...projectToEdit,
      selectedClipId: pastedClips[0]?.id || projectToEdit.selectedClipId,
      selectedTrackId: pastedClips[0]?.trackId || projectToEdit.selectedTrackId,
      tracks: projectToEdit.tracks.map((track) => ({
        ...track,
        clips: [
          ...track.clips,
          ...pastedClips.filter((clip) => clip.trackId === track.id),
        ],
      })),
    }));
    setMessage(`${pastedClips.length} klipp inklistrat.`);
  }

  function cutSelection() {
    copySelection();
    const range = selectedRange();
    if (range) deleteMarkedRange();
    else deleteSelectedClip();
  }

  function deleteMarkedRange(keepOnly = false) {
    const range = selectedRange();
    if (!range) {
      setMessage("Markera ett tidsintervall först.");
      return;
    }
    executeEditingCommand((projectToEdit) => ({
      ...projectToEdit,
      selectedClipId: "",
      tracks: projectToEdit.tracks.map((track) => ({
        ...track,
        clips: track.clips.flatMap((clip) => {
          if (clip.locked) return [clip];
          const clipEnd = clip.startTime + clip.duration;
          if (keepOnly) {
            const start = Math.max(clip.startTime, range.start);
            const end = Math.min(clipEnd, range.end);
            return end - start >= 0.1
              ? [{ ...clip, duration: end - start, sourceOffset: clip.sourceOffset + start - clip.startTime, startTime: start }]
              : [];
          }
          if (clipEnd <= range.start || clip.startTime >= range.end) return [clip];
          const parts: StudioClip[] = [];
          if (range.start - clip.startTime >= 0.1) parts.push({ ...clip, duration: range.start - clip.startTime, fadeOut: 0 });
          if (clipEnd - range.end >= 0.1) parts.push({
            ...clip,
            fadeIn: 0,
            id: parts.length ? createId() : clip.id,
            duration: clipEnd - range.end,
            sourceOffset: clip.sourceOffset + range.end - clip.startTime,
            startTime: range.end,
          });
          return parts;
        }),
      })),
    }));
    setMessage(keepOnly ? "Endast markeringen behölls." : "Det markerade intervallet är borttaget.");
  }

  function duplicateSelectedClip() {
    const currentProject = projectRef.current;
    const selected = currentProject?.tracks.flatMap((track) => track.clips).find((clip) => clip.id === currentProject.selectedClipId);
    if (!selected) return setMessage("Välj ett klipp att duplicera.");
    executeEditingCommand((projectToEdit) => ({
      ...projectToEdit,
      tracks: projectToEdit.tracks.map((track) => ({
        ...track,
        clips:
          track.id === selected.trackId
            ? [...track.clips, { ...selected, id: createId(), locked: false, startTime: selected.startTime + selected.duration }]
            : track.clips,
      })),
    }));
    setMessage("Klippet är duplicerat.");
  }

  function applySelectedClipMetadata(patch: Partial<StudioClip>, message: string) {
    const currentProject = projectRef.current;
    const selected = currentProject?.tracks.flatMap((track) => track.clips).find((clip) => clip.id === currentProject.selectedClipId);
    if (!selected || selected.locked) return setMessage(selected?.locked ? "Klippet är låst." : "Välj ett klipp först.");
    executeEditingCommand((projectToEdit) => updateClipInProject(projectToEdit, selected.id, patch));
    setMessage(message);
  }

  function trimSelectedClip(edge: "start" | "end") {
    const currentProject = projectRef.current;
    const clip = currentProject?.tracks.flatMap((track) => track.clips).find((item) => item.id === currentProject.selectedClipId);
    if (!currentProject || !clip || clip.locked) return setMessage(clip?.locked ? "Klippet är låst." : "Välj ett klipp först.");
    const time = currentProject.playheadSeconds;
    if (time <= clip.startTime || time >= clip.startTime + clip.duration) return setMessage("Spelhuvudet måste vara inne i klippet.");
    applySelectedClipMetadata(
      edge === "start"
        ? { duration: clip.duration - (time - clip.startTime), sourceOffset: clip.sourceOffset + time - clip.startTime, startTime: time }
        : { duration: time - clip.startTime },
      edge === "start" ? "Klippets början är trimmad." : "Klippets slut är trimmat.",
    );
  }

  function renameSelectedClip() {
    const currentProject = projectRef.current;
    const clip = currentProject?.tracks.flatMap((track) => track.clips).find((item) => item.id === currentProject.selectedClipId);
    if (!clip) return setMessage("Välj ett klipp först.");
    const name = window.prompt("Byt namn på klipp", clip.name)?.trim();
    if (name) applySelectedClipMetadata({ name }, "Klippet har bytt namn.");
  }

  function changeSelectedGain() {
    const currentProject = projectRef.current;
    const clip = currentProject?.tracks.flatMap((track) => track.clips).find((item) => item.id === currentProject.selectedClipId);
    if (!clip) return setMessage("Välj ett klipp först.");
    const value = window.prompt("Klippförstärkning", String(clip.gain));
    if (value === null) return;
    const gain = Number(value);
    if (!Number.isFinite(gain) || gain < 0) return setMessage("Ange en giltig förstärkning.");
    applySelectedClipMetadata({ gain }, "Klippförstärkningen är ändrad.");
  }

  function splitAtSelectionBounds() {
    const range = selectedRange();
    if (!range) return setMessage("Markera ett tidsintervall först.");
    splitSelectedClipAt([range.start, range.end]);
  }

  function playSelectedRange(loop = loopSelection) {
    const range = selectedRange();
    if (!range) return setMessage("Markera ett tidsintervall först.");
    setLoopSelection(loop);
    void startPlayback(range.start, range.end, loop).catch((error) => {
      console.error("Kunde inte spela markeringen:", error);
      setMessage("Markeringen kunde inte spelas upp.");
    });
  }

  function selectPodcast(podcastId: string) {
      setSelectedPodcastId(podcastId);
      setSelectedEpisodeId("");
      setProjectState(null);
      setRecoveryRecording(null);
      setSaveStatus("idle");
  }

  async function openEpisode(episodeId: string) {
    setSelectedEpisodeId(episodeId);

    if (episodeId && selectedPodcastId) {
      await loadStudioProject(selectedPodcastId, episodeId);
    } else {
      setProjectState(null);
      setRecoveryRecording(null);
      setSaveStatus("idle");
    }
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setMessage("Webbläsaren stöder inte ljudenheter.");
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();

    const nextInputs = devices.filter((device) => device.kind === "audioinput");
    const nextOutputs = devices.filter((device) => device.kind === "audiooutput");

    setInputDevices(nextInputs);
    setOutputDevices(nextOutputs);
    if (nextInputs.some((device) => Boolean(device.label))) {
      setHasMicrophonePermission(true);
    }

    const currentProject = projectRef.current;
    const missingInput = currentProject?.tracks.find(
      (track) =>
        track.type === "microphone" &&
        track.inputDeviceId &&
        !nextInputs.some((device) => device.deviceId === track.inputDeviceId),
    );
    const missingOutput = currentProject?.tracks.find(
      (track) =>
        track.outputDeviceId &&
        !nextOutputs.some((device) => device.deviceId === track.outputDeviceId),
    );

    if (missingInput) {
      setMessage(`Den valda mikrofonen för ${missingInput.name} är inte längre ansluten. Välj en ny mikrofon.`);
    } else if (missingOutput) {
      setMessage(`Den valda ljudutgången för ${missingOutput.name} är inte längre ansluten. Välj en ny ljudutgång.`);
    }
  }

  async function requestMicrophonePermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Webbläsaren stöder inte mikrofoninspelning.");
      return null;
    }

    try {
      setMessage("Mikrofonåtkomst behövs för att visa enhetsnamn och spela in ljud.");
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      setHasMicrophonePermission(true);
      await refreshDevices();
      stream.getTracks().forEach((track) => track.stop());

      return true;
    } catch (error) {
      console.error("Mikrofonbehörighet nekades:", error);
      setHasMicrophonePermission(false);
      const errorName = error instanceof DOMException ? error.name : "";
      setMessage(
        errorName === "NotFoundError"
          ? "Ingen mikrofon hittades."
          : errorName === "NotReadableError"
            ? "Mikrofonen används av ett annat program."
            : "Mikrofonbehörighet krävs för inspelning.",
      );

      return null;
    }
  }

  function getArmedTrack(currentProject = project) {
    return currentProject?.tracks.find((track) => track.armed) || null;
  }

  function cleanupLiveRecordingGraph() {
    if (liveAnimationRef.current) {
      cancelAnimationFrame(liveAnimationRef.current);
      liveAnimationRef.current = null;
    }

    liveAudioContextRef.current?.close().catch(() => undefined);
    liveAudioContextRef.current = null;
    liveAnalyserRef.current = null;
    monitoringElementRef.current?.pause();
    if (monitoringElementRef.current) monitoringElementRef.current.srcObject = null;
    monitoringElementRef.current = null;
    const stream = mediaStreamRef.current;
    if (stream && microphoneDisconnectedHandlerRef.current) {
      stream.removeEventListener("inactive", microphoneDisconnectedHandlerRef.current);
    }
    stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    microphoneDisconnectedHandlerRef.current = null;
    mediaStreamRef.current = null;
    meterPeakHoldRef.current.clear();
    lowSignalStartedAtRef.current.clear();
    setProjectState((currentProject) =>
      currentProject
        ? {
            ...currentProject,
            tracks: currentProject.tracks.map((track) => ({
              ...track,
              clipping: false,
              inputPeak: 0,
              lowSignal: false,
              outputPeak: 0,
            })),
          }
        : currentProject,
    );
  }

  async function warnIfLocalStorageIsLow() {
    if (!navigator.storage?.estimate) return;
    try {
      const { quota = 0, usage = 0 } = await navigator.storage.estimate();
      const remaining = Math.max(0, quota - usage);
      const warningThreshold = Math.max(100 * 1024 * 1024, quota * 0.05);
      if (quota > 0 && remaining <= warningThreshold) {
        setMessage(`Lokalt lagringsutrymme börjar ta slut. Cirka ${formatFileSize(remaining)} återstår.`);
      }
    } catch (error) {
      console.warn("Kunde inte kontrollera lokalt lagringsutrymme:", error);
    }
  }

  function updateTrackMeter(trackId: string, peak: number) {
    const now = performance.now();
    const previousHold = meterPeakHoldRef.current.get(trackId);
    const peakHold =
      !previousHold || peak >= previousHold.peak || now - previousHold.heldAt > 1200
        ? { peak, heldAt: now }
        : previousHold;
    meterPeakHoldRef.current.set(trackId, peakHold);
    const lowStartedAt = lowSignalStartedAtRef.current.get(trackId);
    if (peak < 0.03 && lowStartedAt === undefined) {
      lowSignalStartedAtRef.current.set(trackId, now);
    } else if (peak >= 0.03) {
      lowSignalStartedAtRef.current.delete(trackId);
    }
    setProjectState((currentProject) => {
      if (!currentProject) {
        return currentProject;
      }

      return {
        ...currentProject,
        tracks: currentProject.tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                clipping: peak >= 0.98,
                inputPeak: Math.max(peak, track.inputPeak * 0.82),
                lowSignal:
                  peak < 0.03 &&
                  lowSignalStartedAtRef.current.has(trackId) &&
                  now - (lowSignalStartedAtRef.current.get(trackId) || now) >= 3000,
                outputPeak: peakHold.peak,
              }
            : track,
        ),
      };
    });
  }

  function saveActiveRecordingRecovery(paused: boolean) {
    if (!project || !recordingIdRef.current) {
      return;
    }

    const recovery: LocalRecordingRecovery = {
      activeDuration: getRecordingActiveSeconds(recordingClockRef.current),
      episodeId: project.episodeId,
      id: recordingIdRef.current,
      mimeType: mediaRecorderRef.current?.mimeType || "audio/webm",
      paused,
      projectId: project.id,
      recordingId: recordingIdRef.current,
      startPosition: recordingStartPositionRef.current,
      startedAt: recordingStartedAtRef.current || new Date().toISOString(),
      trackId: recordingTrackIdRef.current,
      waveformPeaks: recordingWaveformPeaksRef.current,
      sizeBytes: recordingSizeBytesRef.current,
    };

    saveRecordingRecovery(recovery).catch((error) => {
      console.error("Kunde inte uppdatera inspelningsåterställning:", error);
    });
    saveRecordingRecovery({ ...recovery, id: project.id }).catch((error) => {
      console.error("Kunde inte uppdatera projektåterställning:", error);
    });
  }

  function startLiveMeter(trackId: string) {
    const analyser = liveAnalyserRef.current;

    if (!analyser) {
      return;
    }

    const analyserNode = analyser;
    const values = new Uint8Array(analyserNode.fftSize);

    function tick() {
      analyserNode.getByteTimeDomainData(values);
      let peak = 0;

      values.forEach((value) => {
        peak = Math.max(peak, Math.abs((value - 128) / 128));
      });

      updateTrackMeter(trackId, peak);
      if (performance.now() - lastWaveformPeakAtRef.current >= 500) {
        recordingWaveformPeaksRef.current.push(Number(peak.toFixed(3)));
        lastWaveformPeakAtRef.current = performance.now();
      }
      liveAnimationRef.current = requestAnimationFrame(tick);
    }

    tick();
  }

  async function startRecording() {
    if (!project || !canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }

    if (isPlaying) {
      setMessage("Stoppa uppspelningen innan du spelar in.");
      return;
    }

    const armedTrack = getArmedTrack(project);

    if (!armedTrack) {
      setMessage("Välj ett inspelningsspår först.");
      return;
    }

    let availableInputs = inputDevices;
    if (!hasMicrophonePermission) {
      const granted = await requestMicrophonePermission();

      if (!granted) {
        return;
      }
      availableInputs = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === "audioinput",
      );
    }

    if (!armedTrack.inputDeviceId) {
      setMessage("Välj en mikrofon för det armerade spåret.");
      return;
    }

    if (!availableInputs.some((device) => device.deviceId === armedTrack.inputDeviceId)) {
      setMessage("Den valda mikrofonen är inte ansluten. Välj en ny mikrofon.");
      return;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      setMessage("En inspelning pågår redan.");
      return;
    }

    const constraints: MediaStreamConstraints = {
      audio: {
        channelCount: { exact: armedTrack.channelMode === "mono" ? 1 : 2 },
        deviceId: { exact: armedTrack.inputDeviceId },
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const gain = audioContext.createGain();
      const analyser = audioContext.createAnalyser();

      gain.gain.value = armedTrack.inputGain;
      analyser.fftSize = 1024;
      source.connect(gain);
      gain.connect(analyser);

      if (armedTrack.monitoring) {
        const monitoringDestination = audioContext.createMediaStreamDestination();
        const monitoringElement = new Audio();
        gain.connect(monitoringDestination);
        monitoringElement.srcObject = monitoringDestination.stream;
        if (armedTrack.outputDeviceId) {
          if (!outputSelectionSupported) {
            throw new Error("Val av ljudutgång stöds inte i den här webbläsaren");
          }
          if (!outputDevices.some((device) => device.deviceId === armedTrack.outputDeviceId)) {
            throw new Error("Den valda ljudutgången är inte ansluten");
          }
          await (
            monitoringElement as HTMLAudioElement & {
              setSinkId?: (sinkId: string) => Promise<void>;
            }
          ).setSinkId?.(armedTrack.outputDeviceId);
        }
        await monitoringElement.play();
        monitoringElementRef.current = monitoringElement;
      }

      const mimeType = getSupportedRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaStreamRef.current = stream;
      liveAudioContextRef.current = audioContext;
      liveAnalyserRef.current = analyser;
      mediaRecorderRef.current = recorder;
      recordingStopRequestedRef.current = false;
      recordingFinalizingRef.current = false;
      recordingSizeBytesRef.current = 0;
      pendingChunkWritesRef.current = [];
      recordingChunkIndexRef.current = 0;
      recordingIdRef.current = createId();
      recordingTrackIdRef.current = armedTrack.id;
      recordingStartPositionRef.current = project.playheadSeconds;
      recordingStartedAtRef.current = new Date().toISOString();
      recordingClockRef.current = {
        accumulatedMs: 0,
        runningSince: performance.now(),
      };
      recordingWaveformPeaksRef.current = [];
      lastWaveformPeakAtRef.current = 0;
      setRecordingSeconds(0);
      setRecordingSizeBytes(0);
      wakeLockRef.current = await requestWakeLock();

      const handleMicrophoneDisconnected = () => {
        if (recordingStopRequestedRef.current) return;
        recordingStopRequestedRef.current = true;
        setMessage("Mikrofonen kopplades från. Inspelningen avslutas och sparas lokalt.");
        setProject((currentProject) => ({
          ...currentProject,
          isDirty: true,
          recordingStatus: "stopped",
        }));
        const activeRecorder = mediaRecorderRef.current;
        if (activeRecorder && activeRecorder.state !== "inactive") activeRecorder.stop();
      };
      microphoneDisconnectedHandlerRef.current = handleMicrophoneDisconnected;
      stream.addEventListener("inactive", handleMicrophoneDisconnected, { once: true });
      stream.getAudioTracks().forEach((track) => {
        track.onended = handleMicrophoneDisconnected;
      });

      const configureRecorder = (activeRecorder: MediaRecorder) => {
      activeRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const chunkIndex = recordingChunkIndexRef.current;

          recordingChunkIndexRef.current += 1;
          recordingSizeBytesRef.current += event.data.size;
          setRecordingSizeBytes(recordingSizeBytesRef.current);
          if (chunkIndex % 10 === 0) void warnIfLocalStorageIsLow();
          const chunkWrite = saveRecordingChunk(
            recordingIdRef.current,
            chunkIndex,
            event.data,
          ).catch((error) => {
            console.error("Kunde inte spara inspelningschunk:", error);
            setMessage("En del av inspelningen kunde inte sparas lokalt.");
          });

          pendingChunkWritesRef.current.push(chunkWrite);
          void chunkWrite.finally(
            () =>
              (pendingChunkWritesRef.current =
                pendingChunkWritesRef.current.filter(
                  (writePromise) => writePromise !== chunkWrite,
                )),
          );
          saveActiveRecordingRecovery(activeRecorder.state === "paused");
        }
      };
      activeRecorder.onerror = (event) => {
        console.error("MediaRecorder-fel:", event);
        setMessage("Ett inspelningsfel inträffade. Ljudet bevaras lokalt.");
        saveActiveRecordingRecovery(activeRecorder.state === "paused");
      };
      activeRecorder.onstop = () => {
        if (!recordingStopRequestedRef.current && stream.active) {
          try {
            const replacement = new MediaRecorder(
              stream,
              mimeType ? { mimeType } : undefined,
            );
            configureRecorder(replacement);
            mediaRecorderRef.current = replacement;
            replacement.start(RECORDING_TIMESLICE_MS);
            setMessage("Inspelningen fortsätter.");
            return;
          } catch (error) {
            console.error("Kunde inte fortsätta inspelningen:", error);
            setMessage("Inspelningen avbröts. Ljudet finns kvar lokalt.");
          }
        }
        void finishRecording(armedTrack.id).catch((error) => {
          console.error("Kunde inte färdigställa inspelningen:", error);
          setMessage("Inspelningen kunde inte färdigställas. Lokala delar finns kvar.");
        });
      };
      };

      configureRecorder(recorder);

      recorder.start(RECORDING_TIMESLICE_MS);
      saveActiveRecordingRecovery(false);
      startLiveMeter(armedTrack.id);
      setProject((currentProject) => ({
        ...currentProject,
        isDirty: true,
        recordingStatus: "recording",
      }));
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(getRecordingActiveSeconds(recordingClockRef.current));
      }, 1000);
      setMessage("Spelar in");
    } catch (error) {
      console.error("Kunde inte starta inspelning:", error);
      const errorName = error instanceof DOMException ? error.name : "";
      const errorMessage = error instanceof Error ? error.message : "";
      setMessage(
        errorMessage.includes("ljudutgång")
          ? errorMessage
          : errorName === "OverconstrainedError"
            ? "Den valda mikrofonen stöder inte vald kanaltyp. Välj mono eller en annan mikrofon."
            : errorName === "NotAllowedError"
              ? "Mikrofonbehörighet nekades. Tillåt mikrofonåtkomst för att spela in."
              : "Kunde inte starta inspelningen med den valda mikrofonen.",
      );
      cleanupLiveRecordingGraph();
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current?.state !== "recording") {
      setMessage("Ingen aktiv inspelning kan pausas.");
      return;
    }

    mediaRecorderRef.current.requestData();
    mediaRecorderRef.current.pause();
    recordingClockRef.current = {
      accumulatedMs:
        recordingClockRef.current.accumulatedMs +
        (performance.now() - recordingClockRef.current.runningSince),
      runningSince: 0,
    };
    saveActiveRecordingRecovery(true);
    setProject((currentProject) => ({
      ...currentProject,
      isDirty: true,
      recordingStatus: "paused",
    }));
    setMessage("Pausad");
  }

  function resumeRecording() {
    if (mediaRecorderRef.current?.state !== "paused") {
      setMessage("Ingen pausad inspelning finns.");
      return;
    }

    mediaRecorderRef.current.resume();
    recordingClockRef.current = {
      ...recordingClockRef.current,
      runningSince: performance.now(),
    };
    saveActiveRecordingRecovery(false);
    setProject((currentProject) => ({
      ...currentProject,
      isDirty: true,
      recordingStatus: "recording",
    }));
    setMessage("Spelar in");
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      setMessage("Ingen inspelning pågår.");
      return;
    }

    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (recorder.state === "recording") {
      recordingClockRef.current = {
        accumulatedMs:
          recordingClockRef.current.accumulatedMs +
          (performance.now() - recordingClockRef.current.runningSince),
        runningSince: 0,
      };
    }
    setRecordingSeconds(getRecordingActiveSeconds(recordingClockRef.current));
    saveActiveRecordingRecovery(recorder.state === "paused");
    recordingStopRequestedRef.current = true;
    recorder.requestData();
    recorder.stop();
    setProject((currentProject) => ({
      ...currentProject,
      isDirty: true,
      recordingStatus: "stopped",
    }));
    setMessage("Sparar ljudfil…");
  }

  async function deleteCurrentTake() {
    const recorder = mediaRecorderRef.current;
    const recordingId = recordingIdRef.current;

    if (!recorder || recorder.state === "inactive" || !recordingId) {
      await deleteSelectedClip();
      return;
    }
    if (!window.confirm("Radera den pågående tagningen?")) return;

    recordingStopRequestedRef.current = true;
    recordingFinalizingRef.current = true;
    recorder.ondataavailable = null;
    recorder.onstop = null;
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    recorder.stop();
    await Promise.allSettled(pendingChunkWritesRef.current);
    pendingChunkWritesRef.current = [];
    await deleteLocalRecordingArtifacts(recordingId).catch((error) => {
      console.error("Kunde inte radera lokal tagning:", error);
      setMessage("Tagningen kunde inte raderas helt.");
    });
    if (project?.id) {
      await deleteRecordingRecovery(project.id).catch((error) => {
        console.error("Kunde inte radera återställningsdata:", error);
      });
    }
    mediaRecorderRef.current = null;
    cleanupLiveRecordingGraph();
    await wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
    recordingIdRef.current = "";
    recordingSizeBytesRef.current = 0;
    setRecordingSizeBytes(0);
    setRecordingSeconds(0);
    setProject((currentProject) => ({
      ...currentProject,
      isDirty: true,
      recordingStatus: "ready",
    }));
    setMessage("Tagningen är raderad.");
  }

  async function finishRecording(trackId: string) {
    if (recordingFinalizingRef.current) return;
    recordingFinalizingRef.current = true;
    const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
    const recordingId = recordingIdRef.current || createId();
    const duration = getRecordingActiveSeconds(recordingClockRef.current);
    const waveformPeaks = [...recordingWaveformPeaksRef.current];

    mediaRecorderRef.current = null;
    cleanupLiveRecordingGraph();
    wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;

    await Promise.allSettled(pendingChunkWritesRef.current);
    pendingChunkWritesRef.current = [];
    const chunks = await getRecordingChunks(recordingId);

    if (chunks.length === 0 || !project) {
      setMessage("Ingen inspelning sparades.");
      return;
    }

    const blob = new Blob(chunks, { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);

    clipObjectUrlsRef.current.add(objectUrl);

    const clip: StudioClip = {
      blobUrl: objectUrl,
      duration,
      fadeIn: 0,
      fadeOut: 0,
      gain: 1,
      id: createId(),
      locked: false,
      localRecordingId: recordingId,
      muted: false,
      name: `Tagning ${new Date().toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      sourceFileId: "",
      sourceOffset: 0,
      sourceUrl: objectUrl,
      startTime: recordingStartPositionRef.current,
      trackId,
      uploadStatus: "local_only",
      waveformPeaks,
    };

    const nextRecording: LocalRecordingRecord = {
      blob,
      clip,
      createdAt: new Date().toISOString(),
      duration,
      episodeId: project.episodeId,
      filename: `${recordingId}.${fileExtensionFromMimeType(mimeType)}`,
      id: recordingId,
      mimeType,
      objectUrl,
      podcastId: project.podcastId,
      projectId: project.id,
      sizeBytes: blob.size,
      storagePath: "",
      trackId,
      uploadStatus: "local_only",
      waveformPeaks,
    };

    try {
      await saveLocalRecording(nextRecording);
    } catch {
      setMessage("Inspelningen kunde inte sparas lokalt.");
    }
    setRetryRecording(nextRecording);
    setProject((currentProject) => ({
      ...currentProject,
      duration: Math.max(
        currentProject.duration,
        clip.startTime + clip.duration,
      ),
      isDirty: true,
      recordingStatus: "ready",
      tracks: currentProject.tracks.map((track) =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, clip] }
          : track,
      ),
    }));

    const uploaded = await uploadRecording(nextRecording);
    if (uploaded) {
      await deleteRecordingRecovery(recordingId).catch((error) => {
        console.error("Kunde inte rensa inspelningsåterställning:", error);
      });
      await deleteRecordingRecovery(project.id).catch((error) => {
        console.error("Kunde inte rensa projektåterställning:", error);
      });
      setRecoveryRecording(null);
    }
    setUploadProgress(null);
  }

  async function recoverLocalRecording(recovery: LocalRecordingRecovery) {
    if (!project) {
      return;
    }

    const recordingId = recovery.recordingId || recovery.id;
    const chunks = await getRecordingChunks(recordingId);

    if (chunks.length === 0) {
      setMessage("Det fanns inga lokala ljudchunks att återställa.");
      setRecoveryRecording(null);
      await deleteRecordingRecovery(recovery.id);
      return;
    }

    const targetTrack =
      project.tracks.find((track) => track.id === recovery.trackId) ||
      project.tracks[0];

    if (!targetTrack) {
      setMessage("Kunde inte hitta ett spår för återställningen.");
      return;
    }

    const blob = new Blob(chunks, { type: recovery.mimeType || "audio/webm" });
    const objectUrl = URL.createObjectURL(blob);

    clipObjectUrlsRef.current.add(objectUrl);

    const clip: StudioClip = {
      blobUrl: objectUrl,
      duration: recovery.activeDuration,
      fadeIn: 0,
      fadeOut: 0,
      gain: 1,
      id: createId(),
      locked: false,
      localRecordingId: recordingId,
      muted: false,
      name: `Återställd tagning ${new Date(
        recovery.startedAt,
      ).toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      sourceFileId: "",
      sourceOffset: 0,
      sourceUrl: objectUrl,
      startTime: recovery.startPosition || 0,
      trackId: targetTrack.id,
      uploadStatus: "local_only",
      waveformPeaks: [...recovery.waveformPeaks],
    };
    const nextRecording: LocalRecordingRecord = {
      blob,
      clip,
      createdAt: new Date().toISOString(),
      duration: clip.duration,
      episodeId: project.episodeId,
      filename: `${recordingId}.${fileExtensionFromMimeType(recovery.mimeType || "audio/webm")}`,
      id: recordingId,
      mimeType: recovery.mimeType || "audio/webm",
      objectUrl,
      podcastId: project.podcastId,
      projectId: project.id,
      sizeBytes: blob.size,
      storagePath: "",
      trackId: targetTrack.id,
      uploadStatus: "local_only",
      waveformPeaks: clip.waveformPeaks,
    };

    try {
      await saveLocalRecording(nextRecording);
    } catch {
      setMessage("Inspelningen kunde inte sparas lokalt.");
    }
    setRetryRecording(nextRecording);
    setRecoveryRecording(null);
    setProject((currentProject) => ({
      ...currentProject,
      duration: Math.max(
        currentProject.duration,
        clip.startTime + clip.duration,
      ),
      isDirty: true,
      recordingStatus: "ready",
      selectedClipId: clip.id,
      selectedTrackId: targetTrack.id,
      tracks: currentProject.tracks.map((track) =>
        track.id === targetTrack.id
          ? { ...track, clips: [...track.clips, clip] }
          : track,
      ),
    }));
    setMessage("Lokal inspelning återställd. Ladda upp när du är redo.");
  }

  async function discardRecoveredRecording(recovery: LocalRecordingRecovery) {
    await deleteRecordingRecovery(recovery.recordingId || recovery.id);
    await deleteRecordingRecovery(recovery.projectId);
    setRecoveryRecording(null);
    setMessage("Lokal återställning kastades.");
  }

  async function uploadRecording(recording: LocalRecordingRecord) {
    const currentProject = project;

    if (!currentProject) {
      return false;
    }

    setMessage("Sparar ljudfil…");
    setUploadProgress(0);
    ignoreRealtimeUntilRef.current = Date.now() + 5000;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const extension = fileExtensionFromMimeType(recording.blob.type);
      const filename = `${recording.clip.name
        .toLowerCase()
        .replaceAll(" ", "-")}-${recording.id}.${extension}`;
      const filePath = `${currentProject.podcastId}/${currentProject.episodeId}/recordings/${filename}`;

      setUploadProgress(15);
      const { error: uploadError } = await supabase.storage
        .from("studio-files")
        .upload(filePath, recording.blob, {
          contentType: recording.blob.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(75);
      const { data: publicUrlData } = supabase.storage
        .from("studio-files")
        .getPublicUrl(filePath);
      const { data: fileRow, error: fileError } = await supabase
        .from("studio_files")
        .insert({
          category: "recordings",
          channel_count: 1,
          content_type: recording.blob.type,
          duration_seconds: recording.duration,
          episode_id: currentProject.episodeId,
          file_path: filePath,
          filename,
          podcast_id: currentProject.podcastId,
          project_id: currentProject.id,
          public_url: publicUrlData.publicUrl,
          recorded_at: new Date().toISOString(),
          sample_rate: 48000,
          size_bytes: recording.blob.size,
          upload_status: "uploaded",
          uploaded_by: user?.id || null,
          waveform_peaks: recording.waveformPeaks,
        })
        .select("id,public_url")
        .single();

      if (fileError) {
        throw fileError;
      }

      setUploadProgress(90);
      const { data: clipRow, error: clipError } = await supabase
        .from("studio_clips")
        .insert({
          clip_order: currentProject.tracks.reduce(
            (count, track) => count + track.clips.length,
            0,
          ),
          created_by: user?.id || null,
          duration: recording.duration,
          fade_in: recording.clip.fadeIn,
          fade_out: recording.clip.fadeOut,
          gain: 1,
          local_recording_id: recording.id,
          locked: false,
          muted: false,
          name: recording.clip.name,
          project_id: currentProject.id,
          source_file_id: (fileRow as StudioFileRow).id,
          source_offset: 0,
          start_time: recording.clip.startTime,
          track_id: recording.trackId,
          upload_status: "uploaded",
          waveform_peaks: recording.waveformPeaks,
        })
        .select("id")
        .single();

      if (clipError) {
        throw clipError;
      }

      setProject((currentProjectValue) => ({
        ...currentProjectValue,
        isDirty: true,
        tracks: currentProjectValue.tracks.map((track) =>
          track.id === recording.trackId
            ? {
                ...track,
                clips: track.clips.map((clip) =>
                  clip.localRecordingId === recording.id
                    ? {
                        ...clip,
                        blobUrl: undefined,
                        id: (clipRow as { id: string }).id,
                        sourceFileId: (fileRow as StudioFileRow).id,
                        sourceUrl:
                          (fileRow as StudioFileRow).public_url ||
                          publicUrlData.publicUrl,
                        uploadStatus: "uploaded",
                      }
                    : clip,
                ),
              }
            : track,
        ),
      }));
      if (recording.objectUrl) {
        URL.revokeObjectURL(recording.objectUrl);
        clipObjectUrlsRef.current.delete(recording.objectUrl);
      }
      await deleteLocalRecordingArtifacts(recording.id).catch((error) => {
        console.error("Kunde inte rensa uppladdad lokal inspelning:", error);
      });
      setRetryRecording(null);
      setUploadProgress(100);
      setMessage("Inspelningen är sparad");
      window.setTimeout(() => setUploadProgress(null), 1200);
      return true;
    } catch (error) {
      console.error("Kunde inte ladda upp inspelning:", error);
      setRetryRecording(recording);
      setUploadProgress(null);
      setProject((currentProjectValue) => ({
        ...currentProjectValue,
        tracks: currentProjectValue.tracks.map((track) =>
          track.id === recording.trackId
            ? {
                ...track,
                clips: track.clips.map((clip) =>
                  clip.localRecordingId === recording.id
                    ? { ...clip, uploadStatus: "failed" }
                    : clip,
                ),
              }
            : track,
        ),
      }));
      setMessage("Inspelningen är sparad lokalt men inte uppladdad");
      return false;
    }
  }

  function stopPlayback(preservePosition = false) {
    const context = playbackContextRef.current;
    if (preservePosition && context) {
      const position =
        playbackStartPositionRef.current +
        (context.currentTime - playbackStartedAtRef.current);
      setProjectState((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              playheadSeconds: Math.min(currentProject.duration, Math.max(0, position)),
            }
          : currentProject,
      );
    }
    playbackSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Källan kan redan vara stoppad.
      }
    });
    playbackSourcesRef.current = [];

    if (playbackTimerRef.current) {
      cancelAnimationFrame(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }

    playbackContextRef.current?.close().catch(() => undefined);
    playbackContextRef.current = null;
    playbackOutputElementRef.current?.pause();
    playbackOutputElementRef.current = null;
    setIsPlaying(false);
  }

  // Uppspelningsgräns: avkodning, Web Audio-graf och transportklocka.

  async function getClipBuffer(clip: StudioClip) {
    const cached = clipBufferCacheRef.current.get(clip.id);

    if (cached) {
      return cached;
    }

    if (!clip.sourceUrl) {
      throw new Error("Ljudkällan saknas");
    }

    const response = await fetch(clip.sourceUrl);
    if (!response.ok) {
      throw new Error(`Ljudkällan svarade med ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    const context = new AudioContextClass();
    let buffer: AudioBuffer;
    try {
      buffer = await context.decodeAudioData(arrayBuffer);
    } finally {
      await context.close().catch(() => undefined);
    }
    clipBufferCacheRef.current.set(clip.id, buffer);

    if (clip.waveformPeaks.length === 0) {
      const peakCount = Math.min(2000, Math.max(200, Math.ceil(buffer.duration * 8)));
      const waveformPeaks = peaksFromAudioBuffer(buffer, peakCount);
      setProject((currentProject) => ({
        ...currentProject,
        tracks: currentProject.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((currentClip) =>
            currentClip.id === clip.id ? { ...currentClip, waveformPeaks } : currentClip,
          ),
        })),
      }));
      if (canEdit && clip.sourceFileId) {
        void supabase
          .from("studio_clips")
          .update({ waveform_peaks: waveformPeaks })
          .eq("id", clip.id)
          .then(({ error }) => {
            if (error) console.error("Kunde inte spara vågform:", error);
          });
      }
    }

    return buffer;
  }

  async function renderProjectExport(form: ExportForm) {
    const currentProject = projectRef.current;

    if (!currentProject) {
      throw new Error("Välj ett projekt först.");
    }

    const bounds = getExportBounds(currentProject, form);

    if (!bounds || bounds.end <= bounds.start) {
      throw new Error("Det finns inget ljud att exportera.");
    }

    const duration = bounds.end - bounds.start;
    const frameCount = Math.max(1, Math.ceil(duration * form.sampleRate));
    const context = new OfflineAudioContext(2, frameCount, form.sampleRate);
    const masterGain = context.createGain();
    const hasSolo = currentProject.tracks.some((track) => track.solo);
    const tracksToExport = currentProject.tracks.filter((track) => {
      if (form.range === "track" && track.id !== form.trackId) return false;
      if (track.muted || currentProject.masterMuted) return false;
      if (hasSolo && !track.solo) return false;
      return true;
    });
    const exportItems = tracksToExport.flatMap((track) =>
      track.clips
        .filter((clip) => !clip.muted)
        .filter((clip) => clip.startTime < bounds.end && clip.startTime + clip.duration > bounds.start)
        .map((clip) => ({ clip, track })),
    );

    if (exportItems.length === 0) {
      throw new Error("Det finns inget hörbart ljud att exportera.");
    }

    masterGain.gain.value = currentProject.masterVolume;
    masterGain.connect(context.destination);
    setExportProgress(10);
    setExportStatus("Läser ljudklipp…");

    const decodedItems = await Promise.allSettled(
      exportItems.map(async ({ clip, track }) => ({
        buffer: await getClipBuffer(clip),
        clip,
        track,
      })),
    );

    if (exportCancelRef.current) {
      throw new Error("Exporten avbröts.");
    }

    let scheduledCount = 0;

    decodedItems.forEach((result, index) => {
      if (result.status === "rejected") {
        const failedClip = exportItems[index].clip;
        console.error(`Kunde inte exportera ljudklippet ${failedClip.id}:`, result.reason);
        setMessage(`Ljudklippet ”${failedClip.name}” kunde inte läsas och hoppades över.`);
        return;
      }

      const { buffer, clip, track } = result.value;
      const timelineOffset = Math.max(0, bounds.start - clip.startTime);
      const sourceOffset = clip.sourceOffset + timelineOffset;
      const clipEndInRange = Math.min(clip.startTime + clip.duration, bounds.end);
      const playDuration = Math.min(
        clipEndInRange - Math.max(clip.startTime, bounds.start),
        Math.max(0, buffer.duration - sourceOffset),
      );
      const startAt = Math.max(0, clip.startTime - bounds.start);

      if (playDuration <= 0) return;

      const source = context.createBufferSource();
      const gain = context.createGain();
      const panner =
        "createStereoPanner" in context ? context.createStereoPanner() : null;
      const baseGain = clip.gain * track.volume;

      source.buffer = buffer;
      gain.gain.setValueAtTime(baseGain, startAt);
      if (clip.fadeIn > 0 && timelineOffset < clip.fadeIn) {
        const initialGain = baseGain * (timelineOffset / clip.fadeIn);
        gain.gain.setValueAtTime(initialGain, startAt);
        gain.gain.linearRampToValueAtTime(
          baseGain,
          Math.min(startAt + clip.fadeIn - timelineOffset, startAt + playDuration),
        );
      }

      const fadeOutStart = Math.max(0, clip.duration - clip.fadeOut);
      if (clip.fadeOut > 0 && timelineOffset + playDuration > fadeOutStart) {
        const rampStart = startAt + Math.max(0, fadeOutStart - timelineOffset);
        gain.gain.setValueAtTime(baseGain, rampStart);
        gain.gain.linearRampToValueAtTime(0, startAt + playDuration);
      }

      source.connect(gain);
      if (panner) {
        panner.pan.value = track.pan / 100;
        gain.connect(panner);
        panner.connect(masterGain);
      } else {
        gain.connect(masterGain);
      }
      source.start(startAt, sourceOffset, playDuration);
      scheduledCount += 1;
    });

    if (scheduledCount === 0) {
      throw new Error("Inga ljudklipp kunde exporteras.");
    }

    setExportProgress(45);
    setExportStatus("Renderar WAV…");
    const renderedBuffer = await context.startRendering();

    if (exportCancelRef.current) {
      throw new Error("Exporten avbröts.");
    }

    setExportProgress(75);
    setExportStatus("Kodar WAV-fil…");

    return {
      blob: encodeWavFromAudioBuffer(renderedBuffer, form.bitDepth),
      durationSeconds: duration,
      peaks: peaksFromAudioBuffer(renderedBuffer, Math.min(2000, Math.max(240, Math.ceil(duration * 8)))),
    };
  }

  async function uploadExportToStudioFiles(
    blob: Blob,
    form: ExportForm,
    durationSeconds: number,
    waveformPeaks: number[],
  ) {
    const currentProject = projectRef.current;

    if (!currentProject) {
      throw new Error("Välj ett projekt först.");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const filename = sanitizeExportFilename(form.filename);
    const filePath = `${currentProject.podcastId}/${currentProject.episodeId}/exports/${Date.now()}-${filename}`;
    const { error: uploadError } = await supabase.storage
      .from("studio-files")
      .upload(filePath, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("studio-files")
      .getPublicUrl(filePath);
    const { data: fileRow, error: fileError } = await supabase.from("studio_files").insert({
        category: "exports",
        channel_count: 2,
        content_type: blob.type,
        duration_seconds: durationSeconds,
        episode_id: currentProject.episodeId,
        file_path: filePath,
        filename,
        podcast_id: currentProject.podcastId,
        project_id: currentProject.id,
        public_url: publicUrlData.publicUrl,
        sample_rate: form.sampleRate,
        size_bytes: blob.size,
        upload_status: "uploaded",
        uploaded_by: user?.id || null,
        waveform_peaks: waveformPeaks,
      })
      .select("id,public_url")
      .single();

    if (fileError) throw fileError;

    const { error: activityError } = await supabase.from("studio_activity").insert({
      action_type: "export_created",
      description: "WAV-export skapades",
      metadata: {
        bitDepth: form.bitDepth,
        durationSeconds,
        filename,
        range: form.range,
        sampleRate: form.sampleRate,
        sizeBytes: blob.size,
      },
      podcast_id: currentProject.podcastId,
      project_id: currentProject.id,
      user_id: currentUserId,
    });

    if (activityError) throw activityError;

    setProjectState((current) =>
      current?.id === currentProject.id
        ? {
            ...current,
            mediaFiles: [
              {
                category: "exports",
                contentType: blob.type,
                createdAt: new Date().toISOString(),
                durationSeconds,
                filename,
                id: (fileRow as StudioFileRow).id,
                publicUrl: (fileRow as StudioFileRow).public_url || publicUrlData.publicUrl,
                sampleRate: form.sampleRate,
                sizeBytes: blob.size,
                waveformPeaks,
              },
              ...(current.mediaFiles || []),
            ],
          }
        : current,
    );
  }

  async function importStudioMediaFile(file: File, category: StudioMediaFile["category"] = "imported") {
    const currentProject = projectRef.current;

    if (!currentProject) {
      setMessage("Välj ett projekt först.");
      return;
    }

    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }

    if (!file.type.startsWith("audio/")) {
      setMessage("Välj en ljudfil.");
      return;
    }

    setUploadProgress(0);
    setMessage("Importerar ljudfil…");
    ignoreRealtimeUntilRef.current = Date.now() + 5000;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const arrayBuffer = await file.arrayBuffer();
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      const context = new AudioContextClass();
      let durationSeconds = 0;
      let sampleRate = 0;
      let waveformPeaks: number[] = [];

      try {
        const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
        durationSeconds = buffer.duration;
        sampleRate = buffer.sampleRate;
        waveformPeaks = peaksFromAudioBuffer(buffer, Math.min(2000, Math.max(240, Math.ceil(buffer.duration * 8))));
      } finally {
        await context.close().catch(() => undefined);
      }

      const safeName = sanitizeExportFilename(file.name).replace(/\.wav$/i, "");
      const extension = file.name.split(".").pop()?.toLowerCase() || "audio";
      const filename = `${safeName}-${Date.now()}.${extension}`;
      const filePath = `${currentProject.podcastId}/${currentProject.episodeId}/${category}/${filename}`;
      setUploadProgress(25);
      const { error: uploadError } = await supabase.storage
        .from("studio-files")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);
      const { data: publicUrlData } = supabase.storage
        .from("studio-files")
        .getPublicUrl(filePath);
      const { data: fileRow, error: fileError } = await supabase
        .from("studio_files")
        .insert({
          category,
          channel_count: 2,
          content_type: file.type,
          duration_seconds: durationSeconds,
          episode_id: currentProject.episodeId,
          file_path: filePath,
          filename: file.name,
          podcast_id: currentProject.podcastId,
          project_id: currentProject.id,
          public_url: publicUrlData.publicUrl,
          sample_rate: sampleRate,
          size_bytes: file.size,
          upload_status: "uploaded",
          uploaded_by: user?.id || null,
          waveform_peaks: waveformPeaks,
        })
        .select("id,public_url")
        .single();

      if (fileError) throw fileError;

      const selectedTrackId = currentProject.selectedTrackId || currentProject.tracks[0]?.id;
      const selectedTrack = currentProject.tracks.find((track) => track.id === selectedTrackId);
      if (!selectedTrackId || !selectedTrack) {
        setMessage("Skapa eller välj ett spår först.");
        return;
      }

      const nextClip: StudioClip = {
        duration: durationSeconds,
        fadeIn: 0,
        fadeOut: 0,
        gain: 1,
        id: createId(),
        localRecordingId: "",
        locked: false,
        muted: false,
        name: file.name.replace(/\.[^.]+$/, ""),
        sourceFileId: (fileRow as StudioFileRow).id,
        sourceOffset: 0,
        sourceUrl: (fileRow as StudioFileRow).public_url || publicUrlData.publicUrl,
        startTime: currentProject.playheadSeconds,
        trackId: selectedTrackId,
        uploadStatus: "uploaded",
        waveformPeaks,
      };
      setUploadProgress(90);
      executeEditingCommand((projectToEdit) => ({
        ...projectToEdit,
        isDirty: true,
        mediaFiles: [
          {
            category,
            contentType: file.type,
            createdAt: new Date().toISOString(),
            durationSeconds,
            filename: file.name,
            id: (fileRow as StudioFileRow).id,
            publicUrl: nextClip.sourceUrl,
            sampleRate,
            sizeBytes: file.size,
            waveformPeaks,
          },
          ...(projectToEdit.mediaFiles || []),
        ],
        selectedClipId: nextClip.id,
        selectedTrackId,
        tracks: projectToEdit.tracks.map((track) =>
          track.id === selectedTrackId
            ? { ...track, clips: [...track.clips, nextClip] }
            : track,
        ),
      }));

      const { error: activityError } = await supabase.from("studio_activity").insert({
        action_type: "media_imported",
        description: "Ljudfil importerades",
        metadata: {
          category,
          filename: file.name,
          sizeBytes: file.size,
        },
        podcast_id: currentProject.podcastId,
        project_id: currentProject.id,
        user_id: currentUserId,
      });
      if (activityError) console.error("Kunde inte logga mediaimport:", describeStudioError(activityError));

      setUploadProgress(100);
      setMessage("Ljudfilen är importerad.");
      window.setTimeout(() => setUploadProgress(null), 1200);
    } catch (error) {
      console.error("Kunde inte importera media:", describeStudioError(error));
      setUploadProgress(null);
      setMessage("Ljudfilen kunde inte importeras.");
    }
  }

  async function deleteStudioMediaFile(file: StudioMediaFile) {
    const currentProject = projectRef.current;

    if (!currentProject) {
      setMessage("Välj ett projekt först.");
      return;
    }

    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }

    if (!window.confirm(`Ta bort ${file.filename}?`)) return;

    try {
      setMessage("Tar bort mediafil…");
      ignoreRealtimeUntilRef.current = Date.now() + 5000;
      const relatedClipIds = currentProject.tracks
        .flatMap((track) => track.clips)
        .filter((clip) => clip.sourceFileId === file.id)
        .map((clip) => clip.id);

      if (relatedClipIds.length > 0) {
        const { error: clipError } = await supabase
          .from("studio_clips")
          .delete()
          .in("id", relatedClipIds);
        if (clipError) throw clipError;
      }

      const { data: fileRows, error: readError } = await supabase
        .from("studio_files")
        .select("file_path")
        .eq("id", file.id)
        .limit(1);
      if (readError) throw readError;
      const filePath = (fileRows as Array<{ file_path: string | null }> | null)?.[0]?.file_path || "";

      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from("studio-files")
          .remove([filePath]);
        if (storageError) throw storageError;
      }

      const { error: fileError } = await supabase
        .from("studio_files")
        .delete()
        .eq("id", file.id);
      if (fileError) throw fileError;

      setProjectState((current) =>
        current?.id === currentProject.id
          ? {
              ...current,
              isDirty: true,
              mediaFiles: current.mediaFiles.filter((mediaFile) => mediaFile.id !== file.id),
              tracks: current.tracks.map((track) => ({
                ...track,
                clips: track.clips.filter((clip) => clip.sourceFileId !== file.id),
              })),
            }
          : current,
      );
      setMessage("Mediafilen är borttagen.");
    } catch (error) {
      console.error("Kunde inte ta bort mediafil:", describeStudioError(error));
      setMessage("Mediafilen kunde inte tas bort.");
    }
  }

  async function exportProjectAudio(form: ExportForm) {
    if (!projectRef.current) {
      setMessage("Välj ett projekt först.");
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setMessage("Stoppa inspelningen innan du exporterar.");
      return;
    }

    exportCancelRef.current = false;
    setExportProgress(2);
    setExportStatus("Förbereder export…");

    try {
      const { blob, durationSeconds, peaks } = await renderProjectExport(form);
      if (exportCancelRef.current) throw new Error("Exporten avbröts.");
      const filename = sanitizeExportFilename(form.filename);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setExportProgress(85);

      if (form.uploadToProduction) {
        if (!canEdit) {
          setMessage("Du har endast läsbehörighet.");
        } else {
          setExportStatus("Laddar upp export…");
          await uploadExportToStudioFiles(blob, form, durationSeconds, peaks);
        }
      }

      setExportProgress(100);
      setExportStatus("Exporten är klar.");
      setMessage(form.uploadToProduction ? "Exporten är klar och synkad." : "Exporten är klar.");
      window.setTimeout(() => {
        setExportProgress(null);
        setExportStatus("");
      }, 1400);
    } catch (error) {
      console.error("Kunde inte exportera WAV:", error);
      setExportProgress(null);
      setExportStatus("");
      setMessage(error instanceof Error ? error.message : "Exporten misslyckades.");
    } finally {
      exportCancelRef.current = false;
    }
  }

  async function startPlayback(
    fromSeconds?: number,
    rangeEnd?: number,
    loopRange = false,
  ) {
    if (!project) {
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setMessage("Stoppa inspelningen innan du spelar upp.");
      return;
    }

    stopPlayback();
    const startPosition = Math.min(
      project.duration,
      Math.max(0, fromSeconds ?? project.playheadSeconds),
    );
    playbackRangeEndRef.current = rangeEnd ?? project.duration;
    playbackLoopRef.current = loopRange;

    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    const context = new AudioContextClass();
    const masterGain = context.createGain();
    const masterAnalyser = context.createAnalyser();
    const hasSolo = project.tracks.some((track) => track.solo);

    masterGain.gain.value = project.masterMuted ? 0 : project.masterVolume;
    masterGain.connect(masterAnalyser);
    if (
      outputSelectionSupported &&
      project.outputDeviceId &&
      project.outputDeviceId
    ) {
      const destination = context.createMediaStreamDestination();
      const outputElement = new Audio();

      masterAnalyser.connect(destination);
      outputElement.srcObject = destination.stream;
      await (
        outputElement as HTMLAudioElement & {
          setSinkId?: (sinkId: string) => Promise<void>;
        }
      ).setSinkId?.(project.outputDeviceId);
      await outputElement.play();
      playbackOutputElementRef.current = outputElement;
    } else {
      masterAnalyser.connect(context.destination);
    }
    playbackContextRef.current = context;
    const clipsToDecode = project.tracks.flatMap((track) =>
      track.muted || (hasSolo && !track.solo)
        ? []
        : track.clips
            .filter(
              (clip) =>
                !clip.muted && startPosition < clip.startTime + clip.duration,
            )
            .map((clip) => ({ clip, track })),
    );
    const decodedClips = await Promise.allSettled(
      clipsToDecode.map(async ({ clip, track }) => ({
        buffer: await getClipBuffer(clip),
        clip,
        track,
      })),
    );
    const scheduleAnchor = context.currentTime + 0.03;
    playbackStartedAtRef.current = scheduleAnchor;
    playbackStartPositionRef.current = startPosition;
    playbackLastStateUpdateRef.current = 0;

    decodedClips.forEach((result, index) => {
      if (result.status === "rejected") {
        const clip = clipsToDecode[index].clip;
        console.error(`Kunde inte läsa ljudklippet ${clip.id}:`, result.reason);
        setMessage(`Ljudklippet ”${clip.name}” kunde inte läsas. Övriga klipp spelas upp.`);
        return;
      }
      const { buffer, clip, track } = result.value;
      if (!buffer) return;

        const source = context.createBufferSource();
        const gain = context.createGain();
        const panner =
          "createStereoPanner" in context ? context.createStereoPanner() : null;
        const timelineOffset = Math.max(0, startPosition - clip.startTime);
        const offset = clip.sourceOffset + timelineOffset;
        const delay = Math.max(0, clip.startTime - startPosition);
        const playDuration = Math.min(
          clip.duration - timelineOffset,
          Math.max(0, buffer.duration - offset),
        );
        if (playDuration <= 0) return;
        const startAt = scheduleAnchor + delay;
        const baseGain = clip.gain * track.volume;

        source.buffer = buffer;
        gain.gain.setValueAtTime(baseGain, startAt);
        if (clip.fadeIn > 0 && timelineOffset < clip.fadeIn) {
          const initialGain = baseGain * (timelineOffset / clip.fadeIn);
          gain.gain.setValueAtTime(initialGain, startAt);
          gain.gain.linearRampToValueAtTime(baseGain, startAt + clip.fadeIn - timelineOffset);
        }
        const fadeOutStart = Math.max(0, clip.duration - clip.fadeOut);
        if (clip.fadeOut > 0 && timelineOffset + playDuration > fadeOutStart) {
          const rampStart = startAt + Math.max(0, fadeOutStart - timelineOffset);
          gain.gain.setValueAtTime(baseGain, rampStart);
          gain.gain.linearRampToValueAtTime(0, startAt + playDuration);
        }

        if (panner) {
          panner.pan.value = track.pan / 100;
          source.connect(gain);
          gain.connect(panner);
          panner.connect(masterGain);
        } else {
          source.connect(gain);
          gain.connect(masterGain);
        }

        source.start(startAt, offset, playDuration);
        playbackSourcesRef.current.push(source);
    });

    setIsPlaying(true);
    setMessage("Spelar");
    const updatePlayhead = () => {
      const nextPosition = Math.max(
        playbackStartPositionRef.current,
        playbackStartPositionRef.current +
          (context.currentTime - playbackStartedAtRef.current),
      );

      const playbackEnd = playbackRangeEndRef.current ?? project.duration;
      if (playbackEnd > 0 && nextPosition >= playbackEnd) {
        if (playbackLoopRef.current) {
          void startPlayback(playbackStartPositionRef.current, playbackEnd, true);
          return;
        }
        setProjectState((currentProject) =>
          currentProject
            ? { ...currentProject, playheadSeconds: playbackEnd }
            : currentProject,
        );
        stopPlayback();
        setMessage("Uppspelningen är klar.");
        return;
      }

      const playhead = document.querySelector<HTMLElement>("[data-studio-playhead]");
      if (playhead) playhead.style.left = `${nextPosition * timelineMetrics.pixelsPerSecond}px`;
      const scroller = document.querySelector<HTMLElement>("[data-studio-timeline-scroll]");
      if (scroller && playhead) {
        const playheadX = nextPosition * timelineMetrics.pixelsPerSecond;
        const rightEdge = scroller.scrollLeft + scroller.clientWidth - 80;
        if (playheadX > rightEdge) scroller.scrollLeft = Math.max(0, playheadX - scroller.clientWidth * 0.35);
      }
      const now = performance.now();
      if (now - playbackLastStateUpdateRef.current >= 100) {
        playbackLastStateUpdateRef.current = now;
        setProjectState((currentProject) =>
          currentProject
            ? { ...currentProject, playheadSeconds: Math.min(nextPosition, currentProject.duration) }
            : currentProject,
        );
      }
      playbackTimerRef.current = requestAnimationFrame(updatePlayhead);
    };
    playbackTimerRef.current = requestAnimationFrame(updatePlayhead);
  }

  function togglePlayback() {
    if (isPlaying) {
      stopPlayback(true);
      setMessage("Pausad");
      return;
    }

    void startPlayback().catch((error) => {
      console.error("Kunde inte spela upp ljud:", error);
      stopPlayback();
      setMessage("Kunde inte spela upp ljudet.");
    });
  }

  function stopTransport() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      stopRecording();
      return;
    }
    if (isPlaying) {
      stopPlayback(true);
      setMessage("Uppspelningen är stoppad.");
      return;
    }
    setMessage("Ingen inspelning eller uppspelning pågår.");
  }

  function movePlayhead(seconds: number) {
    if (!project) {
      setMessage("Välj ett projekt först.");
      return;
    }
    seekPlayback(project.playheadSeconds + seconds);
  }

  function seekPlayback(seconds: number) {
    if (!project) return;
    const position = Math.min(project.duration, Math.max(0, seconds));
    const shouldResume = isPlaying;
    stopPlayback();
    setProjectState((currentProject) =>
      currentProject ? { ...currentProject, playheadSeconds: position } : currentProject,
    );
    if (shouldResume) {
      void startPlayback(position).catch((error) => {
        console.error("Kunde inte fortsätta uppspelningen efter sökning:", error);
        setMessage("Kunde inte fortsätta uppspelningen från den valda positionen.");
      });
    }
  }

  function goToStart() {
    if (!project) {
      setMessage("Välj ett projekt först.");
      return;
    }
    seekPlayback(0);
  }

  function goToEnd() {
    if (!project) {
      setMessage("Välj ett projekt först.");
      return;
    }
    seekPlayback(project.duration);
  }

  const loadStudioProject = useCallback(
    async (podcastId: string, episodeId: string) => {
      isLoadingProjectRef.current = true;
      setSaveStatus("idle");
      setMessage("");

      try {
        let projectResponse = await supabase.rpc(
          "get_studio_project_for_episode",
          {
            target_episode_id: episodeId,
          },
        );

        if (projectResponse.error) {
          console.error("Kunde inte hämta studioprojekt:", projectResponse.error);
          setMessage("Kunde inte hämta studioprojekt.");
        }

        if (!projectResponse.data || projectResponse.data.length === 0) {
          const { error: createError } = await supabase.rpc(
            "create_studio_project",
            {
              project_name: null,
              target_episode_id: episodeId,
              target_podcast_id: podcastId,
            },
          );

          if (createError) {
            console.error("Kunde inte skapa studioprojekt:", createError);
            setMessage("Kunde inte skapa studioprojekt.");
            setProjectState(null);
            return;
          }

          projectResponse = await supabase.rpc("get_studio_project_for_episode", {
            target_episode_id: episodeId,
          });
        }

        const payload = projectResponse.data?.[0] as
          | {
              clips: StudioClipRow[];
              files: StudioFileRow[];
              markers: StudioMarkerRow[];
              project: StudioProjectRow;
              tracks: StudioTrackRow[];
            }
          | undefined;

        if (!payload?.project) {
          setProjectState(null);
          return;
        }

        const remoteProject = toStudioProject(
          payload.project,
          payload.tracks || [],
          payload.clips || [],
          payload.files || [],
          payload.markers || [],
        );
        const localRecord = await getLocalProject(episodeId).catch((error) => {
          console.error("Kunde inte hämta lokal studiokopia:", error);
          return undefined;
        });
        const localProject = localRecord?.project;
        const localIsNewer =
          localProject &&
          localProject.isDirty &&
          new Date(localRecord.savedAt).getTime() >
            new Date(remoteProject.remoteUpdatedAt).getTime();

        if (localProject && localIsNewer) {
          setProjectState({
            ...localProject,
            isDirty: true,
            markers: localProject.markers || remoteProject.markers,
            selectionEnd: localProject.selectionEnd ?? null,
            selectionStart: localProject.selectionStart ?? null,
            version: localProject.version || remoteProject.version,
          });
          setSaveStatus("dirty");
          setMessage("Lokal version är nyare än Supabase.");
        } else {
          setProjectState(remoteProject);
          setSaveStatus("saved");
          await saveLocalProject(remoteProject).catch((error) => {
            console.error("Kunde inte spara lokal studiokopia:", error);
          });
        }

        const savedRecordings = await getLocalRecordings(remoteProject.id).catch(
          (error) => {
            console.error("Kunde inte läsa lokala inspelningar:", error);
            return [];
          },
        );
        const hydratedRecordings: LocalRecordingRecord[] = [];
        for (const savedRecording of savedRecordings) {
          try {
            const hydrated = await hydrateRecordingFromIndexedDB(savedRecording);
            hydratedRecordings.push(hydrated);
          } catch (error) {
            console.error("Ogiltig lokal inspelning hoppades över:", error);
            if (savedRecording?.id) await deleteLocalRecording(savedRecording.id).catch(() => undefined);
          }
        }
        if (hydratedRecordings.length > 0) {
          hydratedRecordings.forEach((recording) => {
            if (recording.objectUrl) clipObjectUrlsRef.current.add(recording.objectUrl);
          });
          setRetryRecording(hydratedRecordings.at(-1) || null);
          setProjectState((currentProject) => {
            if (!currentProject) return currentProject;
            const knownIds = new Set(currentProject.tracks.flatMap((track) => track.clips.map((clip) => clip.localRecordingId)));
            return {
              ...currentProject,
              tracks: currentProject.tracks.map((track) => ({
                ...track,
                clips: [
                  ...track.clips,
                  ...hydratedRecordings
                    .filter((recording) => recording.trackId === track.id && !knownIds.has(recording.id))
                    .map((recording) => recording.clip),
                ],
              })),
            };
          });
        }

        const recovery = await getRecordingRecovery(remoteProject.id).catch(
          (error) => {
            console.error("Kunde inte kontrollera inspelningsåterställning:", error);
            return undefined;
          },
        );

        if (recovery) {
          setRecoveryRecording(recovery);
          setMessage("En avbruten inspelning hittades");
        } else {
          setRecoveryRecording(null);
        }
      } finally {
        isLoadingProjectRef.current = false;
      }
    },
    [],
  );

  const saveStudioProject = useCallback(
    async (projectToSave: StudioProject) => {
      if (!canEdit) {
        return;
      }

      setSaveStatus("saving");

      try {
        let { data: updatedProject, error: projectError } = await supabase.rpc(
          "save_studio_project_if_version",
          {
            expected_version: projectToSave.version,
            project_patch: projectToDatabase(projectToSave),
            target_project_id: projectToSave.id,
          },
        );

        if (projectError) {
          if (isStudioVersionConflict(projectError)) {
            const latest = await supabase.rpc("get_studio_project_for_episode", {
              target_episode_id: projectToSave.episodeId,
            });
            const serverVersion = Number(
              (latest.data?.[0] as { project?: { version?: number } } | undefined)
                ?.project?.version || projectToSave.version + 1,
            );
            const retry = await supabase.rpc("save_studio_project_if_version", {
              expected_version: serverVersion,
              project_patch: projectToDatabase({ ...projectToSave, version: serverVersion }),
              target_project_id: projectToSave.id,
            });
            updatedProject = retry.data;
            projectError = retry.error;
            if (projectError && isStudioVersionConflict(projectError)) {
              setConflictServerVersion(serverVersion);
              setMessage("Projektet har ändrats av Arvid");
            }
          }
          if (projectError) throw projectError;
        }

        const { data: existingTracks, error: trackReadError } = await supabase
          .from("studio_tracks")
          .select("id")
          .eq("project_id", projectToSave.id);

        if (trackReadError) {
          throw trackReadError;
        }

        const nextTrackIds = new Set(
          projectToSave.tracks.map((track) => track.id),
        );
        const removedTrackIds = ((existingTracks as { id: string }[] | null) || [])
          .map((track) => track.id)
          .filter((trackId) => !nextTrackIds.has(trackId));

        if (removedTrackIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("studio_tracks")
            .delete()
            .in("id", removedTrackIds);

          if (deleteError) {
            throw deleteError;
          }
        }

        const { error: upsertError } = await supabase
          .from("studio_tracks")
          .upsert(
            projectToSave.tracks.map((track) =>
              trackToDatabase(projectToSave.id, track),
            ),
          );

        if (upsertError) {
          throw upsertError;
        }

        const nextProject = {
          ...projectToSave,
          isDirty: false,
          remoteUpdatedAt:
            (updatedProject as { updated_at?: string } | null)?.updated_at ||
            new Date().toISOString(),
          version:
            (updatedProject as { version?: number } | null)?.version ||
            projectToSave.version + 1,
        };

        setProjectState(nextProject);
        await saveLocalProject(nextProject);
        setSaveStatus("saved");
      } catch (error) {
        if (isStudioVersionConflict(error)) {
          setSaveStatus("local");
          setMessage("Projektet sparades lokalt och synkas igen.");
          return;
        }
        console.error("Kunde inte spara studioprojekt:", describeStudioError(error));
        setSaveStatus("error");
        const isConflict = isStudioVersionConflict(error);
        setMessage(isConflict ? "Projektet har ändrats av Arvid" : "Kunde inte spara i molnet");
      }
    },
    [canEdit],
  );

  async function saveProjectVersion(projectToVersion = projectRef.current) {
    if (!projectToVersion || !canEdit) return false;
    ignoreRealtimeUntilRef.current = Date.now() + 2500;
    const snapshot = {
      ...projectToVersion,
      tracks: projectToVersion.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => ({
          ...serializeClipForIndexedDB(clip),
          sourceUrl: clip.sourceUrl.startsWith("blob:") ? "" : clip.sourceUrl,
        })),
      })),
    };
    const { data, error } = await supabase.rpc("save_studio_project_version", {
      project_snapshot: snapshot,
      target_project_id: projectToVersion.id,
    });
    if (error) {
      console.error("Kunde inte spara studioversion:", error);
      setMessage("Kunde inte spara en ny projektversion.");
      return false;
    }
    const versionNumber = (data as { version_number?: number } | null)?.version_number;
    if (versionNumber && projectRef.current?.id === projectToVersion.id) {
      const projectVersion = Math.max(projectRef.current.version, versionNumber);
      projectRef.current = { ...projectRef.current, version: projectVersion };
      setProjectState((current) =>
        current?.id === projectToVersion.id ? { ...current, version: projectVersion } : current,
      );
    }
    versionPendingRef.current = false;
    return true;
  }
  saveProjectVersionRef.current = saveProjectVersion;

  function manualSaveProject() {
    const currentProject = projectRef.current;
    if (!currentProject) return;
    void saveStudioProject({ ...currentProject, isDirty: true });
  }

  function keepLocalConflictChanges() {
    const currentProject = projectRef.current;
    if (!currentProject || conflictServerVersion === null) return;
    const rebasedProject = {
      ...currentProject,
      isDirty: true,
      version: conflictServerVersion,
    };
    projectRef.current = rebasedProject;
    setProjectState(rebasedProject);
    setConflictServerVersion(null);
    void saveStudioProject(rebasedProject);
  }

  async function saveConflictAsVersion() {
    const saved = await saveProjectVersion();
    if (!saved || !projectRef.current) return;
    const { podcastId, episodeId } = projectRef.current;
    setConflictServerVersion(null);
    await loadStudioProject(podcastId, episodeId);
    setMessage("Dina ändringar sparades som en ny version.");
  }

  useEffect(() => {
    let isMounted = true;

    async function loadPodcasts() {
      setIsLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (userError || !user) {
        setPodcasts([]);
        setSelectedPodcastId("");
        setCurrentUserId("");
        setIsLoading(false);
        setMessage("Logga in för att öppna studion.");
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("podcast_members")
        .select("podcast_id,podcasts(id,name)")
        .eq("user_id", user.id);

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Kunde inte hämta poddar till studion:", error);
        setMessage("Kunde inte hämta poddar.");
        setPodcasts([]);
        setSelectedPodcastId("");
        setIsLoading(false);
        return;
      }

      const nextPodcasts = ((data as PodcastMemberRow[] | null) || [])
        .map((row) =>
          Array.isArray(row.podcasts) ? row.podcasts[0] : row.podcasts,
        )
        .filter(Boolean) as Podcast[];
      const storedPodcastId = localStorage.getItem("activePodcastId");
      const nextPodcastId =
        nextPodcasts.find((podcast) => podcast.id === storedPodcastId)?.id ||
        nextPodcasts[0]?.id ||
        "";

      setPodcasts(nextPodcasts);
      setSelectedPodcastId(nextPodcastId);
      setIsLoading(false);
    }

    loadPodcasts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    window.setTimeout(() => {
      void refreshDevices();
    }, 0);

    navigator.mediaDevices?.addEventListener("devicechange", refreshDevices);

    return () => {
      navigator.mediaDevices?.removeEventListener("devicechange", refreshDevices);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoLastClipEdit();
        } else {
          undoLastClipEdit();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelection();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "x") {
        event.preventDefault();
        cutSelection();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        manualSaveProject();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (selectedRange()) deleteMarkedRange();
        else deleteSelectedClip();
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        splitSelectedClipAt([projectRef.current?.playheadSeconds || 0]);
        return;
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        void startRecording();
        return;
      }
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        const recorder = mediaRecorderRef.current;
        if (recorder?.state === "recording") pauseRecording();
        else if (recorder?.state === "paused") resumeRecording();
        else togglePlayback();
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        goToStart();
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        goToEnd();
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        togglePlayback();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  useEffect(
    () => () => {
      recordingStopRequestedRef.current = true;
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        try {
          recorder.requestData();
          recorder.stop();
        } catch (error) {
          console.warn("Kunde inte stoppa inspelaren vid stängning:", error);
        }
      }
      mediaRecorderRef.current = null;
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
      stopPlayback();
      cleanupLiveRecordingGraph();
      clipObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      clipObjectUrlsRef.current.clear();
    },
    [],
  );

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPodcastData() {
      if (!selectedPodcastId) {
        setEpisodes([]);
        setMembers([]);
        setSelectedEpisodeId("");
        setProjectState(null);
        setCanEdit(false);
        return;
      }

      const [{ data: episodeData, error: episodeError }, memberResponse] =
        await Promise.all([
          supabase
            .from("episodes")
            .select("id,title")
            .eq("podcast_id", selectedPodcastId)
            .order("created_at", { ascending: false }),
          supabase.rpc("get_podcast_members", {
            target_podcast_id: selectedPodcastId,
          }),
        ]);

      if (!isMounted) {
        return;
      }

      if (episodeError) {
        console.error("Kunde inte hämta avsnitt till studion:", episodeError);
        setMessage("Kunde inte hämta avsnitt.");
        setEpisodes([]);
        setSelectedEpisodeId("");
        return;
      }

      if (memberResponse.error) {
        console.error("Kunde inte hämta medlemmar till studion:", memberResponse.error);
        setMembers([]);
        setCanEdit(false);
      } else {
        const nextMembers = (memberResponse.data as PodcastMember[] | null) || [];
        const currentMember = nextMembers.find(
          (member) => member.user_id === currentUserId,
        );

        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id,avatar_url")
          .in("id", nextMembers.map((member) => member.user_id));
        const avatarByUser = new Map(
          ((profileRows as Array<{ id: string; avatar_url: string | null }> | null) || [])
            .map((profile) => [profile.id, profile.avatar_url]),
        );
        setMembers(
          nextMembers.map((member) => ({
            ...member,
            avatar_url: avatarByUser.get(member.user_id) || null,
          })),
        );
        setCanEdit(
          currentMember?.role === "owner" ||
            currentMember?.role === "admin" ||
            currentMember?.role === "editor",
        );
      }

      const nextEpisodes = (episodeData as Episode[] | null) || [];
      const nextEpisodeId = nextEpisodes[0]?.id || "";

      setEpisodes(nextEpisodes);
      setSelectedEpisodeId(nextEpisodeId);
      if (nextEpisodeId) {
        await loadStudioProject(selectedPodcastId, nextEpisodeId);
      } else {
        setProjectState(null);
        setSaveStatus("idle");
      }
    }

    loadPodcastData();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, loadStudioProject, selectedPodcastId]);

  useEffect(() => {
    if (
      !project ||
      !project.isDirty ||
      !canEdit ||
      isLoadingProjectRef.current
    ) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveStudioProject(project);
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [canEdit, project, saveStudioProject]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (versionPendingRef.current && projectRef.current && canEdit) {
        void saveProjectVersionRef.current(projectRef.current);
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [canEdit]);

  useEffect(() => {
    const activeProject = projectRef.current;
    if (!activeProject) {
      return;
    }

    const channel = supabase
      .channel(`studio-project:${activeProject.id}`, {
        config: { presence: { key: currentUserId } },
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<StudioPresence>();
        setStudioPresence(
          Object.values(state)
            .flat()
            .filter((presence) => presence.userId !== currentUserId),
        );
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `id=eq.${activeProject.id}`,
          schema: "public",
          table: "studio_projects",
        },
        (payload) => {
          const updatedBy = (payload.new as { updated_by?: string } | null)?.updated_by;
          if (updatedBy === currentUserId) return;
          if (projectRef.current?.isDirty) {
            const serverVersion = Number(
              (payload.new as { version?: number } | null)?.version ||
                (projectRef.current.version + 1),
            );
            setConflictServerVersion(serverVersion);
            setMessage("Projektet har ändrats av Arvid");
            return;
          }

          void loadStudioProject(activeProject.podcastId, activeProject.episodeId).then(() =>
            setMessage("Projektet har ändrats av Arvid"),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `project_id=eq.${activeProject.id}`,
          schema: "public",
          table: "studio_tracks",
        },
        async () => {
          if (Date.now() < ignoreRealtimeUntilRef.current) return;
          if (projectRef.current?.isDirty) {
            setMessage("Spåret ändrades av en annan teammedlem");
            return;
          }

          await loadStudioProject(activeProject.podcastId, activeProject.episodeId);
          setMessage("Spåret ändrades av en annan teammedlem");
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `project_id=eq.${activeProject.id}`,
          schema: "public",
          table: "studio_clips",
        },
        () => {
          if (Date.now() < ignoreRealtimeUntilRef.current) return;
          if (projectRef.current?.isDirty) {
            setMessage("Projektet har ändrats av en annan teammedlem.");
            return;
          }

          loadStudioProject(activeProject.podcastId, activeProject.episodeId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `project_id=eq.${activeProject.id}`,
          schema: "public",
          table: "studio_markers",
        },
        () => {
          if (Date.now() < ignoreRealtimeUntilRef.current) return;
          if (projectRef.current?.isDirty) {
            setMessage("Projektet har ändrats av en annan teammedlem.");
            return;
          }

          loadStudioProject(activeProject.podcastId, activeProject.episodeId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `project_id=eq.${activeProject.id}`,
          schema: "public",
          table: "studio_files",
        },
        () => {
          if (Date.now() < ignoreRealtimeUntilRef.current) return;
          if (projectRef.current?.isDirty) {
            setMessage("Projektet har ändrats av en annan teammedlem.");
            return;
          }

          loadStudioProject(activeProject.podcastId, activeProject.episodeId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `project_id=eq.${activeProject.id}`,
          schema: "public",
          table: "studio_versions",
        },
        () => {
          if (Date.now() < ignoreRealtimeUntilRef.current) return;
          if (!projectRef.current?.isDirty) {
            loadStudioProject(activeProject.podcastId, activeProject.episodeId);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `project_id=eq.${activeProject.id}`,
          schema: "public",
          table: "studio_activity",
        },
        () => undefined,
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        const member = members.find((item) => item.user_id === currentUserId);
        void channel.track({
          avatarUrl: member?.avatar_url || "",
          clipId: activeProject.selectedClipId,
          name: member?.display_name || member?.email || "Teammedlem",
          trackId: activeProject.selectedTrackId,
          userId: currentUserId,
        });
      });

    return () => {
      supabase.removeChannel(channel);
      setStudioPresence([]);
    };
  }, [
    currentUserId,
    loadStudioProject,
    members,
    project?.id,
    project?.selectedClipId,
    project?.selectedTrackId,
  ]);

  return (
    <StudioProjectProvider
      canEdit={canEdit}
      executeEditingCommand={executeEditingCommand}
      inputDevices={inputDevices}
      members={members}
      outputDevices={outputDevices}
      outputSelectionSupported={outputSelectionSupported}
      project={project}
      pushUndoSnapshot={pushUndoSnapshot}
      seekPlayback={seekPlayback}
      setMessage={setMessage}
      setProject={setProject}
    >
      <StudioShell>
        <section className="flex h-screen flex-col overflow-hidden min-[1100px]:hidden">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-900 bg-[#0b0b0b] px-3">
            <Link className="inline-flex items-center gap-1 text-xs font-bold text-zinc-400" href="/">
              <ChevronLeft size={15} /> Tillbaka
            </Link>
            <p className="text-sm font-semibold text-white">Studio</p>
          </div>
          <div className="grid shrink-0 gap-2 border-b border-zinc-900 bg-[#0d0d0d] p-3">
            <select
              className="h-9 min-w-0 rounded border border-zinc-800 bg-black px-2 text-xs text-white"
              disabled={podcasts.length === 0}
              onChange={(event) => selectPodcast(event.target.value)}
              value={selectedPodcastId}
            >
              {podcasts.length === 0 ? <option value="">Ingen podd</option> : null}
              {podcasts.map((podcast) => <option key={podcast.id} value={podcast.id}>{podcast.name}</option>)}
            </select>
            <select
              className="h-9 min-w-0 rounded border border-zinc-800 bg-black px-2 text-xs text-white"
              disabled={episodes.length === 0}
              onChange={(event) => openEpisode(event.target.value)}
              value={selectedEpisodeId}
            >
              {episodes.length === 0 ? <option value="">Inga avsnitt</option> : null}
              {episodes.map((episode) => <option key={episode.id} value={episode.id}>{episode.title}</option>)}
            </select>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
            <div className="font-mono text-3xl font-semibold text-[#1DB954]">
              {formatTimer(project?.recordingStatus === "recording" || project?.recordingStatus === "paused" ? recordingSeconds : project?.playheadSeconds || 0)}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <TransportButton icon={Circle} label="Spela in" onClick={startRecording} tone="record" alwaysShowLabel />
              <TransportButton icon={Square} label="Stoppa" onClick={stopTransport} alwaysShowLabel />
              <TransportButton icon={Pause} label="Pausa" onClick={pauseRecording} alwaysShowLabel />
              <TransportButton icon={Play} label="Fortsätt" onClick={resumeRecording} alwaysShowLabel />
              <TransportButton icon={Play} label={isPlaying ? "Pausa" : "Spela"} onClick={togglePlayback} alwaysShowLabel />
            </div>
            {message ? <p className="max-w-md text-xs text-zinc-400">{message}</p> : null}
            <p className="text-sm font-semibold text-zinc-500">
              Avancerad redigering fungerar bäst på dator
            </p>
          </div>
        </section>

        <section className="hidden h-screen min-w-[1100px] flex-col overflow-hidden min-[1100px]:flex">
          <header className="flex h-11 shrink-0 items-center border-b border-zinc-900 bg-[#090909] text-sm">
            <div className="flex h-full w-[160px] shrink-0 items-center gap-1 border-r border-zinc-900 px-1.5">
              <Link
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-bold text-zinc-400 transition hover:bg-[#181818] hover:text-white"
                href="/"
                title="Tillbaka till poddpanelen"
              >
                <ChevronLeft size={16} />
                Tillbaka
              </Link>
              <div className="h-5 w-px bg-zinc-800" />
              <p className="truncate font-semibold text-white">Studio</p>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
              <select
                className="h-7 w-32 min-w-0 rounded border border-zinc-800 bg-[#141414] px-2 text-[11px] font-semibold text-white outline-none focus:border-[#1DB954] min-[1440px]:w-44"
                disabled={podcasts.length === 0}
                onChange={(event) => selectPodcast(event.target.value)}
                value={selectedPodcastId}
              >
                {podcasts.length === 0 ? (
                  <option value="">Ingen podd</option>
                ) : null}
                {podcasts.map((podcast) => (
                  <option key={podcast.id} value={podcast.id}>
                    {podcast.name}
                  </option>
                ))}
              </select>

              <select
                className="h-7 w-40 min-w-0 rounded border border-zinc-800 bg-[#141414] px-2 text-[11px] font-semibold text-white outline-none focus:border-[#1DB954] min-[1440px]:w-56"
                disabled={episodes.length === 0}
                onChange={(event) => openEpisode(event.target.value)}
                value={selectedEpisodeId}
              >
                {episodes.length === 0 ? (
                  <option value="">Inga avsnitt</option>
                ) : null}
                {episodes.map((episode) => (
                  <option key={episode.id} value={episode.id}>
                    {episode.title}
                  </option>
                ))}
              </select>

              <div className="min-w-0 flex-1" />

              <div className="shrink-0 rounded bg-black px-2 py-1 font-mono text-xs font-semibold text-[#1DB954] ring-1 ring-zinc-800">
                {formatTimer(
                  project?.recordingStatus === "recording" ||
                    project?.recordingStatus === "paused"
                    ? recordingSeconds
                    : project?.playheadSeconds || 0,
                )}
              </div>
              {project?.recordingStatus === "recording" ||
              project?.recordingStatus === "paused" ? (
                <span className="hidden shrink-0 text-[10px] font-semibold text-zinc-400 min-[1440px]:inline">
                  Cirka {formatFileSize(recordingSizeBytes)}
                </span>
              ) : null}

              <div className="hidden items-center -space-x-1 min-[1280px]:flex">
                {studioPresence.slice(0, 4).map((presence) => (
                  <span
                    className="flex size-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 bg-cover bg-center text-[9px] font-bold text-white"
                    key={presence.userId}
                    style={presence.avatarUrl ? { backgroundImage: `url(${presence.avatarUrl})` } : undefined}
                    title={`${presence.name} · ${presence.clipId ? "valt klipp" : presence.trackId ? "valt spår" : "i Studio"}`}
                  >
                    {presence.avatarUrl ? null : presence.name.slice(0, 1).toUpperCase()}
                  </span>
                ))}
              </div>
              <button
                className="shrink-0 text-right text-[10px] leading-3 text-zinc-500 hover:text-white"
                onClick={manualSaveProject}
                title="Spara projekt"
                type="button"
              >
                <p>{studioSaveLabel(isLoading, project, saveStatus)}</p>
              </button>
            </div>

            <div className="flex h-full items-center gap-1 border-l border-zinc-900 px-2">
              <UnavailableButton icon={Maximize2} label="Helskärm" compact />
            </div>
          </header>

          <nav className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-zinc-900 bg-[#101010] px-1.5 [scrollbar-width:thin]">
            <TransportButton
              shortcut="R"
              icon={Circle}
              label="Spela in"
              onClick={startRecording}
              tone="record"
            />
            <TransportButton shortcut="Esc" icon={Square} label="Stoppa" onClick={stopTransport} />
            <TransportButton shortcut="P" icon={Pause} label="Pausa" onClick={pauseRecording} />
            <TransportButton shortcut="P" icon={Play} label="Fortsätt" onClick={resumeRecording} />
            <TransportButton
              shortcut="Space"
              icon={Play}
              label={isPlaying ? "Pausa" : "Spela"}
              onClick={togglePlayback}
            />
            <TransportButton
              shortcut="Home"
              icon={RotateCcw}
              label="Början"
              onClick={goToStart}
            />
            <TransportButton shortcut="End" icon={RotateCw} label="Slutet" onClick={goToEnd} />
            <TransportButton
              shortcut="← 5 s"
              icon={ChevronLeft}
              label="Bakåt 5 s"
              onClick={() => movePlayhead(-5)}
            />
            <TransportButton
              shortcut="→ 5 s"
              icon={ChevronRight}
              label="Framåt 5 s"
              onClick={() => movePlayhead(5)}
            />
            <div className="mx-1 h-7 w-px bg-zinc-800" />

            <TransportButton shortcut="⌘Z" icon={Undo2} label="Ångra" onClick={undoLastClipEdit} />
            <TransportButton shortcut="⌘⇧Z" icon={Redo2} label="Gör om" onClick={redoLastClipEdit} />

            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#1DB954] text-xs font-bold text-black ring-1 ring-zinc-800 min-[1600px]:w-auto min-[1600px]:gap-1.5 min-[1600px]:px-2"
              title="Markeringsverktyg"
            >
              <MousePointer2 size={15} />
              <span className="hidden min-[1600px]:inline">Markera</span>
            </span>
            <TransportButton shortcut="S" icon={Columns3} label="Dela" onClick={() => splitSelectedClipAt([project?.playheadSeconds || 0])} />
            <TransportButton shortcut="⌘X" icon={Scissors} label="Klipp ut" onClick={cutSelection} />
            <UnavailableButton icon={Waves} label="Fäst" />

            <button
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#1DB954] text-xs font-bold text-black min-[1600px]:w-auto min-[1600px]:gap-1.5 min-[1600px]:px-2"
              disabled={!canEdit}
              onClick={() =>
                canEdit
                  ? setIsAddTrackOpen(true)
                  : setMessage("Du har endast läsbehörighet.")
              }
              title={canEdit ? "Lägg till spår" : "Du har endast läsbehörighet"}
              type="button"
            >
              <Plus size={15} />
              <span className="hidden min-[1600px]:inline">Lägg till spår</span>
            </button>

            <div className="ml-auto flex items-center gap-1">
              <button
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded bg-[#181818] px-2 text-[11px] font-bold text-zinc-300 ring-1 ring-zinc-800 transition hover:text-white"
                onClick={manualSaveProject}
                title="Spara projekt (⌘S)"
                type="button"
              >
                <Save size={15} />
                Spara
              </button>
              <button
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded bg-[#1DB954] px-2 text-[11px] font-bold text-black transition hover:bg-[#22d760]"
                onClick={() => setIsExportOpen(true)}
                title="Exportera och ladda ner podden"
                type="button"
              >
                <Download size={15} />
                Export
              </button>
              <button
                className="rounded-md bg-[#181818] p-2 text-zinc-300 ring-1 ring-zinc-800 transition hover:text-white"
                onClick={() =>
                  setProject((currentProject) => ({
                    ...currentProject,
                    isDirty: true,
                    zoom: Math.max(80, currentProject.zoom - 10),
                  }))
                }
                title="Zooma ut"
                type="button"
              >
                <ZoomOut size={15} />
              </button>
              <span className="hidden w-12 text-center text-[10px] font-bold text-zinc-400 min-[1440px]:inline">
                {project?.zoom || 120}%
              </span>
              <button
                className="rounded-md bg-[#181818] p-2 text-zinc-300 ring-1 ring-zinc-800 transition hover:text-white"
                onClick={() =>
                  setProject((currentProject) => ({
                    ...currentProject,
                    isDirty: true,
                    zoom: Math.min(260, currentProject.zoom + 10),
                  }))
                }
                title="Zooma in"
                type="button"
              >
                <ZoomIn size={15} />
              </button>
            </div>
            <ToolbarOverflow
              editingActions={[
                { label: "Dela vid markeringens gränser", onClick: splitAtSelectionBounds },
                { label: "Spela markering", onClick: () => playSelectedRange(false) },
                { label: loopSelection ? "Stoppa loop" : "Loopa markering", onClick: () => {
                  if (loopSelection) {
                    playbackLoopRef.current = false;
                    setLoopSelection(false);
                    stopPlayback(true);
                    setMessage("Loop är stoppad.");
                  } else {
                    playSelectedRange(true);
                  }
                } },
                { label: "Rensa markering", onClick: () => setProject((currentProject) => ({ ...currentProject, selectionEnd: null, selectionStart: null })) },
                { label: "Ta bort markerat intervall", onClick: () => deleteMarkedRange(false) },
                { label: "Behåll endast markerat", onClick: () => deleteMarkedRange(true) },
                { label: "Kopiera", onClick: copySelection },
                { label: "Klistra in", onClick: pasteClipboard },
                { label: "Duplicera klipp", onClick: duplicateSelectedClip },
                { label: "Trimma början", onClick: () => trimSelectedClip("start") },
                { label: "Trimma slutet", onClick: () => trimSelectedClip("end") },
                { label: "Tona in", onClick: () => applySelectedClipMetadata({ fadeIn: 1 }, "Toning in är tillagd.") },
                { label: "Tona ut", onClick: () => applySelectedClipMetadata({ fadeOut: 1 }, "Toning ut är tillagd.") },
                { label: "Ändra förstärkning", onClick: changeSelectedGain },
                { label: "Lås eller lås upp klipp", onClick: () => {
                  const clip = project?.tracks.flatMap((track) => track.clips).find((item) => item.id === project.selectedClipId);
                  if (clip) applySelectedClipMetadata({ locked: !clip.locked }, clip.locked ? "Klippet är upplåst." : "Klippet är låst.");
                } },
                { label: "Byt namn på klipp", onClick: renameSelectedClip },
              ]}
              onDeleteRecording={deleteCurrentTake}
              onExport={() => setIsExportOpen(true)}
              onSaveProject={manualSaveProject}
            />
          </nav>

          {message ? (
            <div className="flex min-h-7 shrink-0 items-center gap-2 border-b border-zinc-900 bg-[#111111] px-2 py-1 text-[11px] text-zinc-400">
              <span>{message}</span>
              {uploadProgress !== null ? (
                <span className="flex min-w-32 items-center gap-2 text-zinc-300">
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                    <span
                      className="block h-full rounded-full bg-[#1DB954]"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </span>
                  {uploadProgress}%
                </span>
              ) : null}
              {exportProgress !== null ? (
                <span className="flex min-w-40 items-center gap-2 text-zinc-300">
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                    <span
                      className="block h-full rounded-full bg-[#1DB954]"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </span>
                  {exportStatus || "Exporterar"} {exportProgress}%
                </span>
              ) : null}
              {recoveryRecording ? (
                <>
                  <button
                    className="rounded-full bg-[#1DB954] px-3 py-1 font-bold text-black"
                    onClick={() => recoverLocalRecording(recoveryRecording)}
                    type="button"
                  >
                    Återställ
                  </button>
                  <button
                    className="rounded-full bg-zinc-800 px-3 py-1 font-bold text-zinc-200"
                    onClick={() => discardRecoveredRecording(recoveryRecording)}
                    type="button"
                  >
                    Ta bort
                  </button>
                </>
              ) : null}
              {retryRecording ? (
                <button
                  className="rounded-full bg-[#1DB954] px-3 py-1 font-bold text-black"
                  onClick={() => uploadRecording(retryRecording)}
                  type="button"
                >
                  Försök igen
                </button>
              ) : null}
              {conflictServerVersion !== null ? (
                <>
                  <button className="rounded bg-zinc-800 px-2 py-1 font-bold text-white" onClick={() => project && loadStudioProject(project.podcastId, project.episodeId).then(() => setConflictServerVersion(null))} type="button">Ladda senaste</button>
                  <button className="rounded bg-[#1DB954] px-2 py-1 font-bold text-black" onClick={keepLocalConflictChanges} type="button">Behåll mina ändringar</button>
                  <button className="rounded bg-zinc-800 px-2 py-1 font-bold text-white" onClick={() => void saveConflictAsVersion()} type="button">Spara som ny version</button>
                </>
              ) : null}
            </div>
          ) : null}

          <section className="grid min-h-0 flex-1 bg-[#060606] [grid-template-columns:auto_minmax(0,1fr)_auto] max-[1279px]:[grid-template-columns:40px_minmax(0,1fr)_40px]">
            <MediaBrowser
              mediaFiles={project?.mediaFiles || []}
              sections={mediaSectionsWithMeta}
              onDeleteFile={deleteStudioMediaFile}
              onImportFile={importStudioMediaFile}
              isCollapsed={isMediaCollapsed}
              mediaSearch={mediaSearch}
              onSearchChange={setMediaSearch}
              onToggleCollapse={() =>
                setIsMediaCollapsed((current) => !current)
              }
            />

            <section className="flex min-h-0 flex-col overflow-hidden">
              <div className="flex h-9 shrink-0 items-center border-b border-zinc-900 bg-[#0b0b0b] px-3 text-xs">
                <p className="font-bold text-white">Tidslinje</p>
                <span className="ml-3 text-zinc-600">Verktyg: markering</span>
                <span className="ml-auto text-zinc-600">
                  Status: {recordingStatusLabel(project?.recordingStatus || "ready")} ·
                  Spår: {project?.tracks.length || 0}
                </span>
              </div>

              <TimelineEditor metrics={timelineMetrics} />
            </section>

            <InspectorPanel
              isCollapsed={isInspectorCollapsed}
              onToggleCollapse={() =>
                setIsInspectorCollapsed((current) => !current)
              }
            />
          </section>

          <footer className="grid h-7 shrink-0 grid-cols-6 border-t border-zinc-900 bg-[#0b0b0b] px-2 text-[10px] font-semibold text-zinc-500">
            <span className="flex items-center">
              Markörposition: {formatTimer(project?.playheadSeconds || 0)}
            </span>
            <span className="flex items-center">
              Projektlängd: {formatTimer(project?.duration || 0)}
            </span>
            <span className="flex items-center">Zoom: {project?.zoom || 120}%</span>
            <span className="flex items-center">Start: {formatTimer(Math.min(project?.selectionStart ?? 0, project?.selectionEnd ?? 0))}</span>
            <span className="flex items-center">Slut: {formatTimer(Math.max(project?.selectionStart ?? 0, project?.selectionEnd ?? 0))}</span>
            <span className="flex items-center">Längd: {formatTimer(Math.abs((project?.selectionEnd ?? 0) - (project?.selectionStart ?? 0)))}</span>
          </footer>
        </section>

        {isAddTrackOpen ? (
          <AddTrackDialog onClose={() => setIsAddTrackOpen(false)} />
        ) : null}
        {isExportOpen && project ? (
          <ExportDialog
            exportProgress={exportProgress}
            exportStatus={exportStatus}
            onCancel={() => {
              exportCancelRef.current = true;
              setExportStatus("Avbryter export…");
            }}
            onClose={() => setIsExportOpen(false)}
            onExport={exportProjectAudio}
            project={project}
          />
        ) : null}
      </StudioShell>
    </StudioProjectProvider>
  );
}

function StudioShell({ children }: { children: ReactNode }) {
  return (
    <main className="h-screen overflow-hidden bg-[#050505] text-zinc-100">
      {children}
    </main>
  );
}

// UI-gräns: visuella kontroller delegerar till projekt-, inspelnings- och uppspelningsmotorerna.

function UnavailableButton({
  compact = false,
  icon: Icon,
  label,
  tone,
}: {
  compact?: boolean;
  icon: typeof Circle;
  label: string;
  tone?: string;
}) {
  return (
    <span title="Inte tillgängligt ännu">
      <button
        className={`inline-flex h-8 items-center justify-center rounded text-[11px] font-bold opacity-55 ring-1 ring-zinc-800 ${
          compact
            ? "w-8 shrink-0 px-0"
            : "w-8 shrink-0 px-0 min-[1600px]:w-auto min-[1600px]:px-2"
        } ${
          tone === "record"
            ? "bg-[#1DB954] text-black"
            : "bg-[#181818] text-zinc-400"
        }`}
        disabled
        type="button"
      >
        <Icon size={15} />
        {compact ? (
          <span className="sr-only">{label}</span>
        ) : (
          <span className="hidden min-[1600px]:ml-1.5 min-[1600px]:inline">{label}</span>
        )}
      </button>
    </span>
  );
}

function TransportButton({
  alwaysShowLabel = false,
  icon: Icon,
  label,
  onClick,
  shortcut,
  tone,
}: {
  alwaysShowLabel?: boolean;
  icon: typeof Circle;
  label: string;
  onClick: () => void;
  shortcut?: string;
  tone?: "record";
}) {
  return (
    <button
      className={`inline-flex h-8 shrink-0 items-center justify-center rounded px-2 text-[11px] font-bold ring-1 ring-zinc-800 transition ${
        alwaysShowLabel ? "gap-1.5" : "gap-1.5"
      } ${
        tone === "record"
          ? "bg-[#1DB954] text-black hover:bg-[#22d760]"
          : "bg-[#181818] text-zinc-300 hover:text-white"
      }`}
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      type="button"
    >
      <Icon size={15} />
      <span className="inline max-[1500px]:max-w-[62px] max-[1500px]:truncate max-[1280px]:max-w-[48px]">
        {label}
      </span>
      {shortcut ? (
        <span className="hidden rounded bg-black/40 px-1 font-mono text-[9px] text-zinc-500 min-[1600px]:inline">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

function ToolbarOverflow({
  editingActions,
  onDeleteRecording,
  onExport,
  onSaveProject,
}: {
  editingActions: Array<{ label: string; onClick: () => void }>;
  onDeleteRecording: () => void;
  onExport: () => void;
  onSaveProject: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ right: 8, top: 96 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeMenu(event: MouseEvent) {
      const target = event.target as Node;

      if (buttonRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("mousedown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="shrink-0">
      <button
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#181818] px-2 text-[11px] font-bold text-zinc-300 ring-1 ring-zinc-800 hover:text-white"
        onClick={() => {
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) {
            setMenuPosition({
              right: Math.max(8, window.innerWidth - rect.right),
              top: rect.bottom + 6,
            });
          }
          setIsOpen((current) => !current);
        }}
        ref={buttonRef}
        title="Mer: redigering, export och radera tagning"
        type="button"
      >
        <MoreHorizontal size={16} />
        Mer
      </button>
      {isOpen ? (
        <div
          className="fixed z-[9999] max-h-[70vh] w-72 overflow-y-auto rounded-lg border border-zinc-700 bg-[#181818] text-xs shadow-2xl shadow-black/80"
          style={{ right: menuPosition.right, top: menuPosition.top }}
        >
          <div className="border-b border-zinc-800 px-3 py-2 font-bold uppercase tracking-[0.14em] text-[#1DB954]">
            Mer
          </div>
          {editingActions.map((item) => (
            <button
              className="flex w-full items-center px-3 py-2 text-left font-semibold text-zinc-300 hover:bg-[#222] hover:text-white"
              key={item.label}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
          <div className="h-px bg-zinc-800" />
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-zinc-300 hover:bg-[#222] hover:text-white"
            onClick={() => {
              onSaveProject();
              setIsOpen(false);
            }}
            type="button"
          >
            <Save size={14} />
            Spara projekt
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-zinc-300 hover:bg-[#222] hover:text-white"
            onClick={() => {
              onExport();
              setIsOpen(false);
            }}
            type="button"
          >
            <Download size={14} />
            Exportera WAV
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-zinc-300 hover:bg-[#222] hover:text-white"
            onClick={() => {
              onDeleteRecording();
              setIsOpen(false);
            }}
            type="button"
          >
            <Trash2 size={14} />
            Radera tagning
          </button>
          <span className="flex items-center gap-2 px-3 py-2 font-semibold text-zinc-600" title="Inte tillgängligt ännu">
            <Maximize2 size={14} />
            Helskärm
          </span>
        </div>
      ) : null}
    </div>
  );
}

function MediaBrowser({
  isCollapsed,
  mediaFiles,
  mediaSearch,
  onDeleteFile,
  onImportFile,
  onSearchChange,
  onToggleCollapse,
  sections,
}: {
  isCollapsed: boolean;
  mediaFiles: StudioMediaFile[];
  mediaSearch: string;
  onDeleteFile: (file: StudioMediaFile) => void;
  onImportFile: (file: File) => void;
  onSearchChange: (value: string) => void;
  onToggleCollapse: () => void;
  sections: Array<(typeof mediaSections)[number] & { meta: string }>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const visibleFiles = mediaFiles
    .filter((file) => file.filename.toLowerCase().includes(mediaSearch.toLowerCase()))
    .slice(0, 8);

  function importFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onImportFile(file);
  }

  return (
    <aside
      className={`min-h-0 overflow-hidden border-r border-zinc-900 bg-[#0c0c0c] max-[1279px]:w-9 max-[1279px]:min-w-9 ${
        isCollapsed ? "w-9" : "w-[210px] min-w-[200px] max-w-[220px]"
      }`}
    >
      <div className="flex h-9 items-center justify-between border-b border-zinc-900 px-2">
        {!isCollapsed ? (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1DB954]">
            Medier
          </p>
        ) : null}
        <button
          className="rounded p-1 text-zinc-500 hover:bg-[#181818] hover:text-white"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Visa medier" : "Dölj medier"}
          type="button"
        >
          <Columns3 size={16} />
        </button>
      </div>

      {!isCollapsed ? (
        <div className="flex h-[calc(100%-2.25rem)] flex-col max-[1279px]:hidden">
          <label className="relative m-2 block">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600"
              size={15}
            />
            <input
              className="h-8 w-full rounded-md border border-zinc-800 bg-black pl-8 pr-2 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-[#1DB954]"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Sök medier"
              type="search"
              value={mediaSearch}
            />
          </label>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {sections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  className="grid w-full grid-cols-[24px_1fr_auto] items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-[#181818]"
                  key={section.label}
                  onClick={() => {
                    if (section.category === "imported") fileInputRef.current?.click();
                  }}
                  title={section.category === "imported" ? "Importera ljudfil" : section.label}
                  type="button"
                >
                  <Icon className="text-zinc-500" size={15} />
                  <span>
                    <span className="block font-semibold text-zinc-200">
                      {section.label}
                    </span>
                    <span className="text-zinc-600">{section.meta}</span>
                  </span>
                  <span className="text-zinc-700">{section.category === "imported" ? "+" : ""}</span>
                </button>
              );
            })}
            {visibleFiles.length > 0 ? (
              <div className="mt-2 border-t border-zinc-900 pt-2">
                {visibleFiles.map((file) => (
                  <div
                    className="grid w-full grid-cols-[1fr_auto_auto] gap-1 rounded-md px-2 py-1.5 text-xs hover:bg-[#181818]"
                    key={file.id}
                    title="Öppna eller ladda ner"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-zinc-300">{file.filename}</span>
                      <span className="text-zinc-600">{formatFileSize(file.sizeBytes)}</span>
                    </span>
                    <a
                      className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                      href={file.publicUrl}
                      rel="noreferrer"
                      target="_blank"
                      title="Ladda ner"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      className="rounded p-1 text-zinc-500 hover:bg-red-950 hover:text-red-200"
                      onClick={() => onDeleteFile(file)}
                      title="Ta bort"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border-t border-zinc-900 p-2">
            <input
              accept="audio/*"
              className="hidden"
              onChange={(event) => {
                importFiles(event.target.files);
                event.currentTarget.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />
            <button
              className="w-full rounded-md border border-dashed border-zinc-800 bg-black/50 px-3 py-4 text-center text-xs hover:border-[#1DB954] hover:bg-[#0f1b14]"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                importFiles(event.dataTransfer.files);
              }}
              title="Importera ljudfil"
              type="button"
            >
              <span className="block font-semibold text-zinc-300">
                Dra filer hit
              </span>
              <span className="mt-1 block text-zinc-600">
                Importera ljud till Studio
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function TimelineEditor({
  metrics,
}: {
  metrics: {
    contentWidth: number;
    pixelsPerSecond: number;
    rulerColumnWidth: number;
  };
}) {
  // Tidslinjegräns: layout, markör och klippinteraktion utan ljudobjekt.
  const { project, seekPlayback, setProject } = useStudioProject();
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const orderedTracks = useMemo(
    () =>
      project?.tracks
        .slice()
        .sort((first, second) => first.order - second.order) || [],
    [project?.tracks],
  );
  const totalHeight = orderedTracks.reduce((height, track) => height + track.height, 0);
  const rulerMarks = useMemo(() => {
    const duration = Math.max(project?.duration || 0, 60) + 30;
    const markCount =
      Math.ceil(duration / TIMELINE_RULER_INTERVAL_SECONDS) + 1;

    return Array.from({ length: markCount }, (_, index) => {
      const seconds = index * TIMELINE_RULER_INTERVAL_SECONDS;
      const minutes = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
      const remainingSeconds = (seconds % 60).toString().padStart(2, "0");

      return { label: `${minutes}:${remainingSeconds}`, seconds };
    });
  }, [project?.duration]);

  if (!project) {
    return (
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[#030303]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(63,63,70,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(39,39,42,0.45)_1px,transparent_1px)] bg-[size:86px_100%,100%_48px]" />
        <div className="relative text-center">
          <Waves className="mx-auto text-zinc-700" size={42} />
          <h2 className="mt-4 text-xl font-semibold text-white">
            Välj ett avsnitt
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid min-h-0 flex-1 overflow-hidden bg-black"
      style={{ gridTemplateColumns: `${TRACK_HEADER_WIDTH}px minmax(0, 1fr)` }}
    >
      <div className="min-h-0 overflow-hidden border-r border-zinc-900 bg-[#0d0d0d]">
        <div className="h-9 border-b border-zinc-800 bg-[#0b0b0b] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
          Spår
        </div>
        <div
          className="overflow-y-auto"
          onScroll={(event) => {
            if (timelineScrollRef.current) {
              timelineScrollRef.current.scrollTop = event.currentTarget.scrollTop;
            }
          }}
          ref={headerScrollRef}
          style={{ height: "calc(100% - 2.25rem)" }}
        >
          {orderedTracks.map((track) => (
            <TrackHeader key={track.id} track={track} />
          ))}
        </div>
      </div>

      <div
        data-studio-timeline-scroll
        className="min-w-0 overflow-auto"
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target as HTMLElement).closest("[data-studio-clip]")) return;
          const scroller = event.currentTarget;
          const pointerId = event.pointerId;
          const rect = scroller.getBoundingClientRect();
          const pointerToSeconds = (clientX: number) =>
            Math.max(0, (clientX - rect.left + scroller.scrollLeft) / metrics.pixelsPerSecond);
          if ((event.target as HTMLElement).closest("[data-studio-ruler]")) {
            scroller.setPointerCapture(pointerId);
            const updatePlayhead = (clientX: number) => {
              const seconds = pointerToSeconds(clientX);
              setProject((currentProject) => ({
                ...currentProject,
                playheadSeconds: Math.min(Math.max(currentProject.duration, 60), seconds),
              }));
            };
            updatePlayhead(event.clientX);
            const movePlayhead = (pointerEvent: PointerEvent) => updatePlayhead(pointerEvent.clientX);
            const finishScrub = (pointerEvent: PointerEvent) => {
              scroller.removeEventListener("pointermove", movePlayhead);
              scroller.removeEventListener("pointerup", finishScrub);
              if (scroller.hasPointerCapture(pointerId)) scroller.releasePointerCapture(pointerId);
              seekPlayback(pointerToSeconds(pointerEvent.clientX));
            };
            scroller.addEventListener("pointermove", movePlayhead);
            scroller.addEventListener("pointerup", finishScrub, { once: true });
            return;
          }
          const start = Math.max(0, (event.clientX - rect.left + scroller.scrollLeft) / metrics.pixelsPerSecond);
          let moved = false;
          scroller.setPointerCapture(pointerId);
          setProject((currentProject) => ({ ...currentProject, selectionEnd: start, selectionStart: start }));
          const move = (pointerEvent: PointerEvent) => {
            moved = true;
            const end = Math.max(0, (pointerEvent.clientX - rect.left + scroller.scrollLeft) / metrics.pixelsPerSecond);
            setProject((currentProject) => ({ ...currentProject, selectionEnd: end, selectionStart: start }));
          };
          const up = () => {
            scroller.removeEventListener("pointermove", move);
            scroller.removeEventListener("pointerup", up);
            if (scroller.hasPointerCapture(pointerId)) scroller.releasePointerCapture(pointerId);
            if (moved) document.body.dataset.studioSelectionCompleted = "true";
          };
          scroller.addEventListener("pointermove", move);
          scroller.addEventListener("pointerup", up, { once: true });
        }}
        onScroll={(event) => {
          if (headerScrollRef.current) {
            headerScrollRef.current.scrollTop = event.currentTarget.scrollTop;
          }
        }}
        ref={timelineScrollRef}
      >
        <div
          className="relative min-h-full"
          style={{
            height: Math.max(totalHeight + 36, 420),
            width: metrics.contentWidth,
          }}
        >
          <div
            data-studio-ruler
            className="sticky top-0 z-30 h-9 border-b border-zinc-800 bg-black text-[11px] font-semibold text-zinc-500"
            style={{ width: metrics.contentWidth }}
          >
            {rulerMarks.map((mark) => (
              <span
                className="absolute top-0 h-full border-l border-zinc-900 px-2 py-2"
                key={mark.seconds}
                style={{ left: mark.seconds * metrics.pixelsPerSecond }}
              >
                {mark.label}
              </span>
            ))}
          </div>

          <div
            data-studio-playhead
            className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-[#1DB954]"
            style={{
              left: project.playheadSeconds * metrics.pixelsPerSecond,
            }}
          >
            <span className="absolute -left-2 top-8 size-4 rotate-45 rounded-sm bg-[#1DB954]" />
          </div>
          <div
            data-studio-snap-guide
            className="pointer-events-none absolute bottom-0 top-9 z-20 hidden w-px bg-sky-400"
          />
          {project.selectionStart !== null && project.selectionEnd !== null ? (
            <div
              className="pointer-events-none absolute top-9 z-10 bg-sky-400/15 ring-1 ring-inset ring-sky-400/60"
              style={{
                height: totalHeight,
                left: Math.min(project.selectionStart, project.selectionEnd) * metrics.pixelsPerSecond,
                width: Math.abs(project.selectionEnd - project.selectionStart) * metrics.pixelsPerSecond,
              }}
            />
          ) : null}

          <div className="absolute left-0 right-0 top-9">
            {orderedTracks.map((track) => (
              <TrackLane
                key={track.id}
                metrics={metrics}
                track={track}
                tracks={orderedTracks}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackHeader({ track }: { track: StudioTrack }) {
  const {
    canEdit,
    executeEditingCommand,
    inputDevices,
    members,
    outputDevices,
    outputSelectionSupported,
    project,
    selectTrack,
    setMessage,
  } = useStudioProject();
  const isSelected = project?.selectedTrackId === track.id;

  function updateTrack(patch: Partial<StudioTrack>) {
    executeEditingCommand((currentProject) =>
      updateTrackInProject(currentProject, track.id, patch),
    );
  }

  function armTrack() {
    executeEditingCommand((currentProject) => ({
      ...currentProject,
      isDirty: true,
      selectedTrackId: track.id,
      tracks: currentProject.tracks.map((currentTrack) => ({
        ...currentTrack,
        armed: currentTrack.id === track.id,
      })),
    }));
  }

  function renameTrack() {
    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }

    const nextName = window.prompt("Byt namn på spår", track.name)?.trim();

    if (!nextName) {
      return;
    }

    updateTrack({ name: nextName });
  }

  function duplicateTrack() {
    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }

    executeEditingCommand((currentProject) => {
      const duplicateId = createId();
      const duplicate: StudioTrack = {
        ...track,
        armed: false,
        clips: [],
        id: duplicateId,
        name: `${track.name} kopia`,
        order: track.order + 1,
      };
      const tracks = currentProject.tracks.flatMap((currentTrack) =>
        currentTrack.id === track.id ? [currentTrack, duplicate] : [currentTrack],
      );
      return {
        ...currentProject,
        isDirty: true,
        selectedTrackId: duplicateId,
        tracks: reorderTracks(tracks),
      };
    });
  }

  function startTrackResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }
    const startY = event.clientY;
    const startHeight = track.height;

    function handlePointerMove(pointerEvent: PointerEvent) {
      const height = Math.min(320, Math.max(96, startHeight + pointerEvent.clientY - startY));
      executeEditingCommand((currentProject) =>
        updateTrackInProject(currentProject, track.id, { height }),
      );
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  function moveTrack(direction: -1 | 1) {
    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }

    executeEditingCommand((currentProject) => {
      const orderedTracks = currentProject.tracks
        .slice()
        .sort((first, second) => first.order - second.order);
      const currentIndex = orderedTracks.findIndex(
        (currentTrack) => currentTrack.id === track.id,
      );
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0 || nextIndex >= orderedTracks.length) {
        setMessage("Spåret kan inte flyttas längre.");
        return currentProject;
      }

      const nextTracks = orderedTracks.slice();
      [nextTracks[currentIndex], nextTracks[nextIndex]] = [
        nextTracks[nextIndex],
        nextTracks[currentIndex],
      ];

      return {
        ...currentProject,
        isDirty: true,
        tracks: reorderTracks(nextTracks),
      };
    });
  }

  function deleteTrack() {
    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }

    executeEditingCommand((currentProject) => {
      if (currentProject.tracks.length === 1) {
        setMessage("Minst ett spår krävs.");
        return currentProject;
      }

      if (
        track.clips.length > 0 &&
        !window.confirm("Spåret innehåller ljudklipp. Ta bort ändå?")
      ) {
        return currentProject;
      }

      const nextTracks = reorderTracks(
        currentProject.tracks.filter(
          (currentTrack) => currentTrack.id !== track.id,
        ),
      );

      return {
        ...currentProject,
        isDirty: true,
        selectedTrackId:
          currentProject.selectedTrackId === track.id
            ? nextTracks[0]?.id || ""
            : currentProject.selectedTrackId,
        tracks: nextTracks,
      };
    });
  }

  return (
    <div
      className={`relative overflow-hidden border-b border-zinc-900 px-2 py-1 ${
        isSelected ? "bg-[#102318]" : "bg-[#0d0d0d]"
      }`}
      onClick={() => selectTrack(track.id)}
      style={{ height: track.height }}
    >
      <div className="flex items-center gap-2">
        <button
          className={`size-2 rounded-full ${
            isSelected ? "bg-[#1DB954]" : "bg-zinc-600"
          }`}
          onClick={() => selectTrack(track.id)}
          title="Välj aktivt spår"
          type="button"
        />
        <input
          className="min-w-0 flex-1 rounded bg-transparent text-sm font-semibold text-white outline-none focus:bg-black/30"
          readOnly={!canEdit}
          onChange={(event) => updateTrack({ name: event.target.value })}
          value={track.name}
        />
        {canEdit ? (
          <TrackMenu
            onDelete={deleteTrack}
            onDuplicate={duplicateTrack}
            onMoveDown={() => moveTrack(1)}
            onMoveUp={() => moveTrack(-1)}
            onRename={renameTrack}
          />
        ) : null}
      </div>

      <div className="mt-1 grid grid-cols-3 gap-1">
        <select
          className="h-5 min-w-0 rounded border border-zinc-800 bg-black px-1 text-[9px] text-zinc-300"
          disabled={!canEdit}
          onChange={(event) => updateTrack({ assignedUserId: event.target.value })}
          title="Ansvarig teammedlem"
          value={track.assignedUserId}
        >
          <option value="">Ingen ansvarig</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>
          ))}
        </select>
        <select
          className="h-5 min-w-0 rounded border border-zinc-800 bg-black px-1 text-[9px] text-zinc-300"
          disabled={!canEdit || track.type !== "microphone"}
          onChange={(event) => updateTrack({ inputDeviceId: event.target.value })}
          title="Ljudingång"
          value={track.inputDeviceId}
        >
          <option disabled value="">Välj ingång</option>
          {inputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>{device.label || "Mikrofon"}</option>
          ))}
        </select>
        <select
          className="h-5 min-w-0 rounded border border-zinc-800 bg-black px-1 text-[9px] text-zinc-300"
          disabled={!canEdit || !outputSelectionSupported}
          onChange={(event) => updateTrack({ outputDeviceId: event.target.value })}
          title="Ljudutgång"
          value={track.outputDeviceId}
        >
          <option value="">Standardutgång</option>
          {outputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>{device.label || "Ljudutgång"}</option>
          ))}
        </select>
      </div>

      <div className="mt-1 flex items-center gap-1">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800" title="Verklig ingångsnivå">
          <span
            className={`block h-full transition-[width] duration-75 ${
              track.clipping ? "bg-red-500" : "bg-[#1DB954]"
            }`}
            style={{ width: `${Math.min(100, track.inputPeak * 100)}%` }}
          />
          <span
            className="absolute inset-y-0 w-px bg-white"
            style={{ left: `${Math.min(100, track.outputPeak * 100)}%` }}
          />
        </div>
        {track.clipping ? (
          <span className="text-[9px] font-bold text-red-400">Klippning</span>
        ) : track.lowSignal ? (
          <span className="text-[9px] font-bold text-yellow-300">Låg signal</span>
        ) : null}
      </div>

      <div className="mt-1 grid grid-cols-3 gap-1">
        <button
          className={`rounded px-2 py-1 text-[10px] font-bold ring-1 ring-zinc-800 ${
            track.armed ? "bg-[#1DB954] text-black" : "bg-[#181818] text-zinc-300"
          }`}
          disabled={!canEdit}
          onClick={armTrack}
          title="Aktivera inspelning"
          type="button"
        >
          Spela in
        </button>
        <button
          className={`rounded px-2 py-1 text-[10px] font-bold ring-1 ring-zinc-800 ${
            track.muted ? "bg-yellow-400 text-black" : "bg-[#181818] text-zinc-300"
          }`}
          disabled={!canEdit}
          onClick={() => updateTrack({ muted: !track.muted })}
          type="button"
        >
          Tysta
        </button>
        <button
          className={`rounded px-2 py-1 text-[10px] font-bold ring-1 ring-zinc-800 ${
            track.solo ? "bg-sky-400 text-black" : "bg-[#181818] text-zinc-300"
          }`}
          disabled={!canEdit}
          onClick={() => updateTrack({ solo: !track.solo })}
          type="button"
        >
          Solo
        </button>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2">
        <label className="flex min-w-0 items-center gap-1 text-[9px] text-zinc-500" title={`Volym ${Math.round(track.volume * 100)} procent`}>
          Vol
          <input className="min-w-0 flex-1" disabled={!canEdit} max="1.5" min="0" onChange={(event) => updateTrack({ volume: Number(event.target.value) })} step="0.01" type="range" value={track.volume} />
        </label>
        <label className="flex min-w-0 items-center gap-1 text-[9px] text-zinc-500" title={`Panorering ${track.pan}`}>
          Pan
          <input className="min-w-0 flex-1" disabled={!canEdit} max="100" min="-100" onChange={(event) => updateTrack({ pan: Number(event.target.value) })} step="1" type="range" value={track.pan} />
        </label>
      </div>

      <button
        aria-label="Ändra spårhöjd"
        className="absolute inset-x-0 bottom-0 h-1 cursor-row-resize bg-transparent hover:bg-[#1DB954]/60"
        disabled={!canEdit}
        onPointerDown={startTrackResize}
        title="Dra för att ändra spårhöjd"
        type="button"
      />

    </div>
  );
}

function TrackMenu({
  onDelete,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRename,
}: {
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRename: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function run(action: () => void) {
    action();
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        className="rounded p-1 text-zinc-500 hover:bg-black/30 hover:text-white"
        onClick={() => setIsOpen((current) => !current)}
        title="Spårmeny"
        type="button"
      >
        <MoreHorizontal size={15} />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-7 z-50 w-40 overflow-hidden rounded-lg border border-zinc-800 bg-[#181818] text-xs shadow-2xl shadow-black/60">
          {[
            { icon: FileText, label: "Byt namn", onClick: onRename },
            { icon: Copy, label: "Duplicera", onClick: onDuplicate },
            { icon: ChevronUp, label: "Flytta upp", onClick: onMoveUp },
            { icon: ChevronDown, label: "Flytta ned", onClick: onMoveDown },
            { icon: Trash2, label: "Ta bort", onClick: onDelete },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-semibold text-zinc-300 hover:bg-[#222] hover:text-white"
                key={item.label}
                onClick={() => run(item.onClick)}
                type="button"
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TrackLane({
  metrics,
  track,
  tracks,
}: {
  metrics: {
    contentWidth: number;
    pixelsPerSecond: number;
    rulerColumnWidth: number;
  };
  track: StudioTrack;
  tracks: StudioTrack[];
}) {
  const { project, seekPlayback, selectTrack, setProject } = useStudioProject();
  const isSelected = project?.selectedTrackId === track.id;

  return (
    <div
      className={`relative overflow-hidden bg-black text-left ${
        isSelected ? "ring-1 ring-inset ring-[#1DB954]" : ""
      }`}
      onClick={(event) => {
        if (document.body.dataset.studioSelectionCompleted) {
          delete document.body.dataset.studioSelectionCompleted;
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const position = Math.max(
          0,
          (event.clientX - rect.left) / metrics.pixelsPerSecond,
        );

        selectTrack(track.id);
        setProject((currentProject) => ({
          ...currentProject,
          selectedClipId: "",
          selectedTrackId: track.id,
          selectionEnd: null,
          selectionStart: null,
        }));
        seekPlayback(position);
      }}
      data-studio-track-id={track.id}
      style={{ height: track.height, width: metrics.contentWidth }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(39,39,42,0.55)_1px,transparent_1px)] bg-[size:86px_100%]" />
      {track.clips.length === 0 ? (
        <div className="relative flex h-full items-center px-6 text-xs font-semibold text-zinc-700">
          Inga ljudklipp
        </div>
      ) : (
        track.clips.map((clip) => (
          <InteractiveClip
            clip={clip}
            key={clip.id}
            metrics={metrics}
            track={track}
            tracks={tracks}
          />
        ))
      )}
    </div>
  );
}

function InteractiveClip({
  clip,
  metrics,
  track,
  tracks,
}: {
  clip: StudioClip;
  metrics: {
    contentWidth: number;
    pixelsPerSecond: number;
    rulerColumnWidth: number;
  };
  track: StudioTrack;
  tracks: StudioTrack[];
}) {
  const { canEdit, project, pushUndoSnapshot, setMessage, setProject } =
    useStudioProject();
  const [dragInfo, setDragInfo] = useState("");
  const frameRef = useRef<number | null>(null);
  const previousProjectRef = useRef<StudioProject | null>(null);
  const isSelected = project?.selectedClipId === clip.id;
  const clipWidth = Math.max(48, clip.duration * metrics.pixelsPerSecond);
  const visibleWaveformPeaks = useMemo(() => {
    const maxBars = Math.min(600, Math.max(16, Math.floor((clipWidth - 24) / 3)));
    return summarizePeaks(clip.waveformPeaks, maxBars);
  }, [clip.waveformPeaks, clipWidth]);

  function showSnapGuide(seconds: number | null) {
    const guide = document.querySelector<HTMLElement>("[data-studio-snap-guide]");
    if (!guide) return;
    if (seconds === null) {
      guide.classList.add("hidden");
      return;
    }
    guide.style.left = `${seconds * metrics.pixelsPerSecond}px`;
    guide.classList.remove("hidden");
  }

  function snapTime(value: number, event: PointerEvent | React.PointerEvent) {
    if (event.altKey) {
      showSnapGuide(null);
      return { guide: null, value: Math.max(0, value) };
    }

    const snapPoints = [
      project?.playheadSeconds || 0,
      ...tracks.flatMap((currentTrack) =>
        currentTrack.clips
          .filter((currentClip) => currentClip.id !== clip.id)
          .flatMap((currentClip) => [
            currentClip.startTime,
            currentClip.startTime + currentClip.duration,
          ]),
      ),
    ];
    const gridSize = 1;
    const gridValue = Math.round(value / gridSize) * gridSize;
    const snapThreshold = Math.max(0.04, 8 / metrics.pixelsPerSecond);
    let snapped = value;
    let guide: number | null = null;
    let closestDistance = Math.abs(value - gridValue);
    if (closestDistance <= snapThreshold) {
      snapped = gridValue;
      guide = gridValue;
    } else {
      closestDistance = Number.POSITIVE_INFINITY;
    }

    snapPoints.forEach((point) => {
      const distance = Math.abs(value - point);

      if (distance < closestDistance && distance <= snapThreshold) {
        snapped = point;
        guide = point;
        closestDistance = distance;
      }
    });

    showSnapGuide(guide);
    return { guide, value: Math.max(0, snapped) };
  }

  async function persist(nextClip: StudioClip, previousProject: StudioProject) {
    const { error } = await supabase
      .from("studio_clips")
      .update({
        duration: nextClip.duration,
        source_offset: nextClip.sourceOffset,
        start_time: nextClip.startTime,
        track_id: nextClip.trackId,
      })
      .eq("id", nextClip.id);

    if (error) {
      console.error("Kunde inte spara klippändring:", error);
      setProject(() => previousProject);
      setMessage("Kunde inte spara klippändringen.");
      return;
    }

    setMessage("Klippändringen är sparad.");
  }

  function startInteraction(
    event: React.PointerEvent<HTMLDivElement>,
    mode: "move" | "resize-left" | "resize-right",
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (!project || !canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }
    if (clip.locked) {
      setMessage("Klippet är låst.");
      return;
    }

    previousProjectRef.current = project;
    pushUndoSnapshot(project);
    const startX = event.clientX;
    const originalClip = clip;
    let latestClip = clip;

    document.body.style.userSelect = "none";
    const captureTarget = event.currentTarget;
    const pointerId = event.pointerId;
    captureTarget.setPointerCapture(pointerId);
    setProject((currentProject) => ({
      ...currentProject,
      selectedClipId: clip.id,
      selectedTrackId: track.id,
    }));

    function applyMove(pointerEvent: PointerEvent) {
      const deltaSeconds = (pointerEvent.clientX - startX) / metrics.pixelsPerSecond;
      const trackElement = document
        .elementsFromPoint(pointerEvent.clientX, pointerEvent.clientY)
        .find((element) => element instanceof HTMLElement && element.dataset.studioTrackId) as HTMLElement | undefined;
      const targetTrack =
        tracks.find((currentTrack) => currentTrack.id === trackElement?.dataset.studioTrackId) || track;
      let nextClip: StudioClip = originalClip;

      if (mode === "move") {
        const rawStart = Math.max(0, originalClip.startTime + deltaSeconds);
        const startSnap = snapTime(rawStart, pointerEvent);
        const endSnap = snapTime(rawStart + originalClip.duration, pointerEvent);
        const useEndSnap =
          endSnap.guide !== null &&
          (startSnap.guide === null ||
            Math.abs(endSnap.value - (rawStart + originalClip.duration)) <
              Math.abs(startSnap.value - rawStart));
        nextClip = {
          ...originalClip,
          startTime: useEndSnap
            ? Math.max(0, endSnap.value - originalClip.duration)
            : startSnap.value,
          trackId: targetTrack.id,
        };
        showSnapGuide(useEndSnap ? endSnap.guide : startSnap.guide);
        setDragInfo(`Start: ${formatTimer(nextClip.startTime)}`);
      }

      if (mode === "resize-left") {
        const rawStart = snapTime(
          originalClip.startTime + deltaSeconds,
          pointerEvent,
        ).value;
        const maxStart =
          originalClip.startTime + originalClip.duration - 0.1;
        const nextStart = Math.min(Math.max(0, rawStart), maxStart);
        const startDelta = nextStart - originalClip.startTime;

        nextClip = {
          ...originalClip,
          duration: Math.max(0.1, originalClip.duration - startDelta),
          sourceOffset: Math.max(0, originalClip.sourceOffset + startDelta),
          startTime: nextStart,
        };
        setDragInfo(`Längd: ${formatTimer(nextClip.duration)}`);
      }

      if (mode === "resize-right") {
        const nextEnd = snapTime(
          originalClip.startTime + originalClip.duration + deltaSeconds,
          pointerEvent,
        ).value;

        nextClip = {
          ...originalClip,
          duration: Math.max(0.1, nextEnd - originalClip.startTime),
        };
        setDragInfo(`Längd: ${formatTimer(nextClip.duration)}`);
      }

      latestClip = nextClip;
      setProject((currentProject) =>
        mode === "move" && nextClip.trackId !== track.id
          ? moveClipToTrack(currentProject, clip.id, nextClip.trackId, nextClip)
          : updateClipInProject(currentProject, clip.id, nextClip),
      );
    }

    function handlePointerMove(pointerEvent: PointerEvent) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        applyMove(pointerEvent);
      });
    }

    function handlePointerUp() {
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      if (captureTarget.hasPointerCapture(pointerId)) {
        captureTarget.releasePointerCapture(pointerId);
      }
      setDragInfo("");
      showSnapGuide(null);

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      if (previousProjectRef.current) {
        void persist(latestClip, previousProjectRef.current);
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerUp, { once: true });
  }

  return (
    <div
      data-studio-clip={clip.id}
      className={`absolute top-4 max-h-[calc(100%-1rem)] cursor-grab overflow-hidden rounded-md border bg-[#1DB954]/15 px-3 py-2 text-xs font-semibold text-white active:cursor-grabbing ${
        isSelected ? "border-[#1DB954] ring-2 ring-[#1DB954]" : "border-[#1DB954]/50"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        setProject((currentProject) => ({
          ...currentProject,
          selectedClipId: clip.id,
          selectedTrackId: clip.trackId,
        }));
      }}
      onPointerDown={(event) => startInteraction(event, "move")}
      style={{
        left: clip.startTime * metrics.pixelsPerSecond,
        width: clipWidth,
      }}
    >
      <div
        className="absolute inset-y-0 left-0 z-20 w-2 cursor-ew-resize bg-white/10"
        onPointerDown={(event) => startInteraction(event, "resize-left")}
      />
      <div
        className="absolute inset-y-0 right-0 z-20 w-2 cursor-ew-resize bg-white/10"
        onPointerDown={(event) => startInteraction(event, "resize-right")}
      />
      <span className="relative z-10 block truncate">{clip.name}</span>
      {dragInfo ? (
        <span className="relative z-10 mt-1 block rounded bg-black/60 px-2 py-1 text-[10px] text-[#1DB954]">
          {dragInfo}
        </span>
      ) : null}
      <div className="mt-2 flex h-10 w-full items-center gap-px overflow-hidden">
        {visibleWaveformPeaks.map((peak, index) => (
          <span
            className="min-w-px flex-1 rounded-full bg-[#1DB954]/70"
            key={`${clip.id}-${index}`}
            style={{ height: `${Math.max(8, peak * 38)}px` }}
          />
        ))}
      </div>
      {clip.uploadStatus !== "uploaded" ? (
        <span className="relative z-10 mt-1 block text-[10px] text-yellow-300">
          Ej uppladdad
        </span>
      ) : null}
    </div>
  );
}

function AddTrackDialog({ onClose }: { onClose: () => void }) {
  const {
    executeEditingCommand,
    inputDevices,
    members,
    outputDevices,
    outputSelectionSupported,
    project,
  } = useStudioProject();
  const [form, setForm] = useState<AddTrackForm>({
    assignedUserId: "",
    channelMode: "mono",
    inputDeviceId: "",
    name: "",
    outputDeviceId: "",
    type: "microphone",
  });

  function updateForm(patch: Partial<AddTrackForm>) {
    setForm((currentForm) => ({ ...currentForm, ...patch }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!project) {
      return;
    }

    const nextName = form.name.trim() || `Spår ${project.tracks.length + 1}`;

    executeEditingCommand((currentProject) => {
      const nextTrack: StudioTrack = {
        armed: false,
        assignedUserId: form.assignedUserId,
        channelMode: form.channelMode,
        clipping: false,
        clips: [],
        height: TRACK_ROW_HEIGHT,
        id: createId(),
        inputGain: 1,
        inputDeviceId: form.inputDeviceId,
        inputPeak: 0,
        lowSignal: false,
        muted: false,
        monitoring: false,
        name: nextName,
        order: currentProject.tracks.length,
        outputDeviceId: form.outputDeviceId,
        outputPeak: 0,
        pan: 0,
        solo: false,
        type: form.type,
        volume: 1,
      };

      return {
        ...currentProject,
        isDirty: true,
        selectedTrackId: nextTrack.id,
        tracks: [...currentProject.tracks, nextTrack],
      };
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#111111] p-5 shadow-2xl shadow-black/70"
        onSubmit={submit}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Lägg till spår</h2>
          <button
            className="rounded-full px-3 py-1 text-sm font-bold text-zinc-400 hover:bg-[#181818] hover:text-white"
            onClick={onClose}
            type="button"
          >
            Stäng
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-zinc-300">Spårnamn</span>
            <input
              className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
              onChange={(event) => updateForm({ name: event.target.value })}
              placeholder="Exempel: Intervju"
              value={form.name}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-300">Spårtyp</span>
              <select
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                onChange={(event) =>
                  updateForm({ type: event.target.value as TrackType })
                }
                value={form.type}
              >
                {Object.entries(trackTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-300">
                Ansvarig teammedlem
              </span>
              <select
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                onChange={(event) =>
                  updateForm({ assignedUserId: event.target.value })
                }
                value={form.assignedUserId}
              >
                <option value="">Ingen ansvarig</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {memberLabel(member)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-300">
                Ljudingång
              </span>
              <select
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                onChange={(event) =>
                  updateForm({ inputDeviceId: event.target.value })
                }
                value={form.inputDeviceId}
              >
                <option disabled value="">Välj mikrofon</option>
                {inputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || "Mikrofonnamn visas efter behörighet"}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-300">
                Ljudutgång
              </span>
              <select
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                disabled={!outputSelectionSupported}
                onChange={(event) =>
                  updateForm({ outputDeviceId: event.target.value })
                }
                value={form.outputDeviceId}
              >
                <option value="">
                  {outputSelectionSupported
                    ? "Webbläsarens standardutgång"
                    : "Val av ljudutgång stöds inte i den här webbläsaren"}
                </option>
                {outputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || "Ljudutgång utan tillgängligt namn"}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-zinc-300">
                Kanaltyp
              </span>
              <select
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                onChange={(event) =>
                  updateForm({ channelMode: event.target.value as ChannelMode })
                }
                value={form.channelMode}
              >
                {Object.entries(channelModeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <button
          className="mt-6 rounded-full bg-[#1DB954] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#22d760]"
          type="submit"
        >
          Skapa spår
        </button>
      </form>
    </div>
  );
}

function ExportDialog({
  exportProgress,
  exportStatus,
  onCancel,
  onClose,
  onExport,
  project,
}: {
  exportProgress: number | null;
  exportStatus: string;
  onCancel: () => void;
  onClose: () => void;
  onExport: (form: ExportForm) => Promise<void>;
  project: StudioProject;
}) {
  const selectedTrack = project.tracks.find((track) => track.id === project.selectedTrackId);
  const hasSelection =
    project.selectionStart !== null &&
    project.selectionEnd !== null &&
    Math.abs(project.selectionEnd - project.selectionStart) > 0;
  const [form, setForm] = useState<ExportForm>({
    bitDepth: 24,
    filename: `${project.name || "studio-export"}.wav`,
    range: hasSelection ? "selection" : "project",
    sampleRate: project.sampleRate || 48000,
    trackId: selectedTrack?.id || project.tracks[0]?.id || "",
    uploadToProduction: true,
  });
  const isExporting = exportProgress !== null;
  const bounds = getExportBounds(project, form);

  function updateForm(patch: Partial<ExportForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void onExport(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <form
        className="w-full max-w-md rounded-lg border border-zinc-800 bg-[#111111] p-4 text-xs shadow-2xl shadow-black/70"
        onSubmit={submit}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Exportera WAV</h2>
          <button
            className="rounded px-2 py-1 font-bold text-zinc-400 hover:bg-[#181818] hover:text-white"
            disabled={isExporting}
            onClick={onClose}
            type="button"
          >
            Stäng
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-zinc-400">
            Filnamn
            <input
              className="rounded border border-zinc-800 bg-black px-2 py-2 text-white outline-none focus:border-[#1DB954]"
              disabled={isExporting}
              onChange={(event) => updateForm({ filename: event.target.value })}
              value={form.filename}
            />
          </label>

          <label className="grid gap-1 text-zinc-400">
            Format
            <select
              className="rounded border border-zinc-800 bg-black px-2 py-2 text-white outline-none focus:border-[#1DB954]"
              disabled={isExporting}
              value="wav"
              onChange={() => undefined}
            >
              <option value="wav">WAV</option>
              <option disabled value="mp3">MP3 kräver encoder</option>
              <option disabled value="aac">AAC kräver encoder</option>
              <option disabled value="flac">FLAC kräver encoder</option>
            </select>
          </label>

          <label className="grid gap-1 text-zinc-400">
            Omfång
            <select
              className="rounded border border-zinc-800 bg-black px-2 py-2 text-white outline-none focus:border-[#1DB954]"
              disabled={isExporting}
              onChange={(event) => updateForm({ range: event.target.value as ExportRange })}
              value={form.range}
            >
              <option value="project">Hela projektet</option>
              <option disabled={!hasSelection} value="selection">
                Markerat intervall
              </option>
              <option value="track">Valt spår</option>
            </select>
          </label>

          {form.range === "track" ? (
            <label className="grid gap-1 text-zinc-400">
              Spår
              <select
                className="rounded border border-zinc-800 bg-black px-2 py-2 text-white outline-none focus:border-[#1DB954]"
                disabled={isExporting}
                onChange={(event) => updateForm({ trackId: event.target.value })}
                value={form.trackId}
              >
                {project.tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-zinc-400">
              Samplingsfrekvens
              <select
                className="rounded border border-zinc-800 bg-black px-2 py-2 text-white outline-none focus:border-[#1DB954]"
                disabled={isExporting}
                onChange={(event) => updateForm({ sampleRate: Number(event.target.value) })}
                value={form.sampleRate}
              >
                {[44100, 48000, 88200, 96000].map((sampleRate) => (
                  <option key={sampleRate} value={sampleRate}>
                    {sampleRate} Hz
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-zinc-400">
              Bitdjup
              <select
                className="rounded border border-zinc-800 bg-black px-2 py-2 text-white outline-none focus:border-[#1DB954]"
                disabled={isExporting}
                onChange={(event) => updateForm({ bitDepth: Number(event.target.value) as ExportBitDepth })}
                value={form.bitDepth}
              >
                <option value={16}>16-bit PCM</option>
                <option value={24}>24-bit PCM</option>
                <option value={32}>32-bit float</option>
              </select>
            </label>
          </div>

          <label className="flex items-center justify-between rounded border border-zinc-800 bg-black px-3 py-2 text-zinc-300">
            Ladda upp till Produktion
            <input
              checked={form.uploadToProduction}
              disabled={isExporting}
              onChange={(event) => updateForm({ uploadToProduction: event.target.checked })}
              type="checkbox"
            />
          </label>

          <p className="rounded bg-black px-3 py-2 text-zinc-500">
            Längd: {bounds ? formatTimer(bounds.end - bounds.start) : "Inget ljud"}
          </p>

          {isExporting ? (
            <div className="grid gap-2 rounded border border-zinc-800 bg-black p-3">
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <span
                  className="block h-full rounded-full bg-[#1DB954]"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-zinc-300">{exportStatus || "Exporterar"} {exportProgress}%</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          {isExporting ? (
            <button
              className="rounded bg-zinc-800 px-4 py-2 font-bold text-white hover:bg-zinc-700"
              onClick={onCancel}
              type="button"
            >
              Avbryt
            </button>
          ) : null}
          <button
            className="rounded bg-[#1DB954] px-4 py-2 font-bold text-black hover:bg-[#22d760] disabled:opacity-50"
            disabled={isExporting || !bounds}
            type="submit"
          >
            Exportera WAV
          </button>
        </div>
      </form>
    </div>
  );
}

function InspectorPanel({
  isCollapsed,
  onToggleCollapse,
}: {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const {
    canEdit,
    executeEditingCommand,
    inputDevices,
    members,
    outputDevices,
    outputSelectionSupported,
    project,
    setMessage,
    setProject,
  } = useStudioProject();
  const track = project?.tracks.find(
    (currentTrack) => currentTrack.id === project.selectedTrackId,
  );
  const selectedClip = project?.tracks
    .flatMap((currentTrack) => currentTrack.clips)
    .find((clip) => clip.id === project.selectedClipId);
  const assignedMember = members.find(
    (member) => member.user_id === track?.assignedUserId,
  );

  function updateSelectedTrack(patch: Partial<StudioTrack>) {
    if (!track) {
      return;
    }

    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }

    executeEditingCommand((currentProject) =>
      updateTrackInProject(currentProject, track.id, patch),
    );
  }

  function updateSelectedClip(patch: Partial<StudioClip>) {
    if (!selectedClip || !project) return;
    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }
    const normalizedPatch: Partial<StudioClip> = {
      ...patch,
      ...(patch.startTime !== undefined ? { startTime: Math.max(0, patch.startTime) } : {}),
      ...(patch.sourceOffset !== undefined ? { sourceOffset: Math.max(0, patch.sourceOffset) } : {}),
      ...(patch.duration !== undefined ? { duration: Math.max(0.1, patch.duration) } : {}),
      ...(patch.gain !== undefined ? { gain: Math.max(0, patch.gain) } : {}),
      ...(patch.fadeIn !== undefined ? { fadeIn: Math.max(0, patch.fadeIn) } : {}),
      ...(patch.fadeOut !== undefined ? { fadeOut: Math.max(0, patch.fadeOut) } : {}),
    };
    const previousProject = project;
    executeEditingCommand((currentProject) =>
      normalizedPatch.trackId && normalizedPatch.trackId !== selectedClip.trackId
        ? moveClipToTrack(currentProject, selectedClip.id, normalizedPatch.trackId, normalizedPatch)
        : updateClipInProject(currentProject, selectedClip.id, normalizedPatch),
    );
    const databasePatch: Record<string, string | number | boolean> = {};
    if (normalizedPatch.name !== undefined) databasePatch.name = normalizedPatch.name;
    if (normalizedPatch.trackId !== undefined) databasePatch.track_id = normalizedPatch.trackId;
    if (normalizedPatch.startTime !== undefined) databasePatch.start_time = normalizedPatch.startTime;
    if (normalizedPatch.sourceOffset !== undefined) databasePatch.source_offset = normalizedPatch.sourceOffset;
    if (normalizedPatch.duration !== undefined) databasePatch.duration = normalizedPatch.duration;
    if (normalizedPatch.gain !== undefined) databasePatch.gain = normalizedPatch.gain;
    if (normalizedPatch.fadeIn !== undefined) databasePatch.fade_in = normalizedPatch.fadeIn;
    if (normalizedPatch.fadeOut !== undefined) databasePatch.fade_out = normalizedPatch.fadeOut;
    if (normalizedPatch.locked !== undefined) databasePatch.locked = normalizedPatch.locked;
    void supabase
      .from("studio_clips")
      .update(databasePatch)
      .eq("id", selectedClip.id)
      .then(({ error }) => {
        if (!error) return;
        console.error("Kunde inte spara klippegenskap:", error);
        setProject(() => previousProject);
        setMessage("Klippegenskapen kunde inte sparas.");
      });
  }

  function updateMaster(patch: Partial<StudioProject>) {
    if (!canEdit) {
      setMessage("Du har endast läsbehörighet.");
      return;
    }

    setProject((currentProject) => ({
      ...currentProject,
      ...patch,
      isDirty: true,
    }));
  }

  return (
    <aside
      className={`min-h-0 overflow-hidden border-l border-zinc-900 bg-[#0c0c0c] max-[1279px]:w-9 max-[1279px]:min-w-9 ${
        isCollapsed ? "w-9" : "w-[280px] min-w-[260px] max-w-[290px]"
      }`}
    >
      <div className="flex h-9 items-center justify-between border-b border-zinc-900 px-2">
        {!isCollapsed ? (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1DB954]">
            Egenskaper
          </p>
        ) : null}
        <button
          className="rounded p-1 text-zinc-500 hover:bg-[#181818] hover:text-white"
          onClick={onToggleCollapse}
          title={isCollapsed ? "Visa egenskaper" : "Dölj egenskaper"}
          type="button"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {!isCollapsed ? (
        <div className="h-[calc(100%-2.25rem)] overflow-y-auto p-2 text-xs max-[1279px]:hidden">
          {track ? (
            <div className="space-y-3">
              <section>
                <h2 className="text-sm font-semibold text-white">
                  {track.name}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {trackTypeLabels[track.type]} · {memberLabel(assignedMember)}
                </p>
              </section>

              {selectedClip ? (
                <section className="grid gap-2 border-t border-zinc-900 pt-4 text-xs">
                  <h3 className="font-bold uppercase tracking-[0.16em] text-[#1DB954]">
                    Valt ljudklipp
                  </h3>
                  <label className="grid gap-1 text-zinc-500">
                    Namn
                    <input className="rounded border border-zinc-800 bg-black px-2 py-1 text-white" disabled={!canEdit} onChange={(event) => updateSelectedClip({ name: event.target.value })} value={selectedClip.name} />
                  </label>
                  <label className="grid gap-1 text-zinc-500">
                    Spår
                    <select className="rounded border border-zinc-800 bg-black px-2 py-1 text-white" disabled={!canEdit || selectedClip.locked} onChange={(event) => updateSelectedClip({ trackId: event.target.value })} value={selectedClip.trackId}>
                      {project?.tracks.map((projectTrack) => <option key={projectTrack.id} value={projectTrack.id}>{projectTrack.name}</option>)}
                    </select>
                  </label>
                  {[
                    ["Start", "startTime", selectedClip.startTime, 0, 0.001],
                    ["Källoffset", "sourceOffset", selectedClip.sourceOffset, 0, 0.001],
                    ["Längd", "duration", selectedClip.duration, 0.1, 0.001],
                    ["Förstärkning", "gain", selectedClip.gain, 0, 0.01],
                    ["Tona in", "fadeIn", selectedClip.fadeIn, 0, 0.01],
                    ["Tona ut", "fadeOut", selectedClip.fadeOut, 0, 0.01],
                  ].map(([label, field, value, min, step]) => (
                    <label className="grid grid-cols-[1fr_92px] items-center gap-2 text-zinc-500" key={String(field)}>
                      {label}
                      <input
                        className="rounded border border-zinc-800 bg-black px-2 py-1 text-right text-white"
                        disabled={!canEdit || selectedClip.locked}
                        min={Number(min)}
                        onChange={(event) => updateSelectedClip({ [String(field)]: Number(event.target.value) } as Partial<StudioClip>)}
                        step={Number(step)}
                        type="number"
                        value={Number(value)}
                      />
                    </label>
                  ))}
                  <label className="flex items-center justify-between text-zinc-500">
                    Låst
                    <input checked={selectedClip.locked} disabled={!canEdit} onChange={(event) => updateSelectedClip({ locked: event.target.checked })} type="checkbox" />
                  </label>
                </section>
              ) : null}

              <section className="grid gap-3 border-t border-zinc-900 pt-4">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Kanaltyp
                  </span>
                  <select
                    className="rounded-md border border-zinc-800 bg-black px-2 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                    disabled={!canEdit}
                    onChange={(event) =>
                      updateSelectedTrack({ channelMode: event.target.value as ChannelMode })
                    }
                    value={track.channelMode}
                  >
                    <option value="mono">Mono</option>
                    <option value="stereo">Stereo</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Spårnamn
                  </span>
                  <input
                    className="rounded-md border border-zinc-800 bg-black px-2 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                    readOnly={!canEdit}
                    onChange={(event) =>
                      updateSelectedTrack({ name: event.target.value })
                    }
                    value={track.name}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Ansvarig
                  </span>
                  <select
                    className="rounded-md border border-zinc-800 bg-black px-2 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                    disabled={!canEdit}
                    onChange={(event) =>
                      updateSelectedTrack({ assignedUserId: event.target.value })
                    }
                    value={track.assignedUserId}
                  >
                    <option value="">Ingen ansvarig</option>
                    {members.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {memberLabel(member)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={`rounded-md px-3 py-2 text-xs font-bold ring-1 ring-zinc-800 ${
                    track.monitoring
                      ? "bg-[#1DB954] text-black"
                      : "bg-[#181818] text-zinc-300"
                  }`}
                  disabled={!canEdit}
                  onClick={() =>
                    updateSelectedTrack({ monitoring: !track.monitoring })
                  }
                  type="button"
                >
                  Medhörning {track.monitoring ? "på" : "av"}
                </button>
                {!outputSelectionSupported ? (
                  <p className="text-xs text-yellow-300">
                    Val av ljudutgång stöds inte i den här webbläsaren
                  </p>
                ) : null}
              </section>

              <section className="grid gap-3 border-t border-zinc-900 pt-4">
                {[
                  ["Volym", track.volume, 0, 1.5, 0.01],
                  ["Ingångsförstärkning", track.inputGain, 0, 2, 0.01],
                  ["Panorering", track.pan, -100, 100, 1],
                ].map(([label, value, min, max, step]) => (
                  <label className="grid gap-2" key={label}>
                    <span className="flex justify-between text-xs font-semibold text-zinc-300">
                      <span>{label}</span>
                      <span>{label === "Volym" ? `${Math.round(Number(value) * 100)}%` : value}</span>
                    </span>
                    <input
                      max={Number(max)}
                      min={Number(min)}
                      disabled={!canEdit}
                      onChange={(event) =>
                        updateSelectedTrack(
                          label === "Volym"
                            ? { volume: Number(event.target.value) }
                            : label === "Ingångsförstärkning"
                              ? { inputGain: Number(event.target.value) }
                              : { pan: Number(event.target.value) },
                        )
                      }
                      step={Number(step)}
                      type="range"
                      value={Number(value)}
                    />
                  </label>
                ))}
              </section>

              <section className="grid gap-3 border-t border-zinc-900 pt-4">
                <label className="grid gap-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    <Mic size={14} />
                    Ljudingång
                  </span>
                  <select
                    className="rounded-md border border-zinc-800 bg-black px-2 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                    disabled={!canEdit}
                    onChange={(event) =>
                      updateSelectedTrack({ inputDeviceId: event.target.value })
                    }
                    value={track.inputDeviceId}
                  >
                    <option disabled value="">Välj mikrofon</option>
                    {inputDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || "Mikrofonnamn visas efter behörighet"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    <Headphones size={14} />
                    Ljudutgång
                  </span>
                  <select
                    className="rounded-md border border-zinc-800 bg-black px-2 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                    disabled={!canEdit || !outputSelectionSupported}
                    onChange={(event) =>
                      updateSelectedTrack({ outputDeviceId: event.target.value })
                    }
                    value={track.outputDeviceId}
                  >
                    <option value="">
                      {outputSelectionSupported
                        ? "Webbläsarens standardutgång"
                        : "Val av ljudutgång stöds inte i den här webbläsaren"}
                    </option>
                    {outputDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || "Ljudutgång utan tillgängligt namn"}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="grid gap-3 border-t border-zinc-900 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Masterkanal
                </h3>
                <label className="grid gap-2">
                  <span className="flex justify-between text-xs font-semibold text-zinc-300">
                    <span>Mastervolym</span>
                    <span>{Math.round((project?.masterVolume || 1) * 100)}%</span>
                  </span>
                  <input
                    disabled={!canEdit}
                    max="1.5"
                    min="0"
                    onChange={(event) =>
                      updateMaster({ masterVolume: Number(event.target.value) })
                    }
                    step="0.01"
                    type="range"
                    value={project?.masterVolume || 1}
                  />
                </label>
                <button
                  className={`rounded-md px-3 py-2 text-xs font-bold ring-1 ring-zinc-800 ${
                    project?.masterMuted
                      ? "bg-yellow-400 text-black"
                      : "bg-[#181818] text-zinc-300"
                  }`}
                  disabled={!canEdit}
                  onClick={() =>
                    updateMaster({ masterMuted: !(project?.masterMuted || false) })
                  }
                  type="button"
                >
                  Tysta master
                </button>
                <select
                  className="rounded-md border border-zinc-800 bg-black px-2 py-2 text-sm text-white outline-none focus:border-[#1DB954]"
                  disabled={!canEdit || !outputSelectionSupported}
                  onChange={(event) =>
                    updateMaster({ outputDeviceId: event.target.value })
                  }
                  value={project?.outputDeviceId || ""}
                >
                  <option value="">
                    {outputSelectionSupported
                      ? "Webbläsarens standardutgång"
                      : "Val av ljudutgång stöds inte i den här webbläsaren"}
                  </option>
                  {outputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || "Ljudutgång utan tillgängligt namn"}
                    </option>
                  ))}
                </select>
              </section>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Inget spår valt</p>
          )}
        </div>
      ) : null}
    </aside>
  );
}

export default StudioPage;
