import assert from "node:assert/strict";

function clampAudioSample(sample) {
  return Math.max(-1, Math.min(1, sample));
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeWavFromAudioBuffer(buffer, bitDepth) {
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

function sanitizeExportFilename(filename) {
  const cleanName = filename
    .trim()
    .replace(/\.wav$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase();

  return `${cleanName || "studio-export"}.wav`;
}

function getExportBounds(project, form) {
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

function audibleExportItems(project, form) {
  const bounds = getExportBounds(project, form);
  const hasSolo = project.tracks.some((track) => track.solo);

  return project.tracks
    .filter((track) => form.range !== "track" || track.id === form.trackId)
    .filter((track) => !track.muted && !project.masterMuted)
    .filter((track) => !hasSolo || track.solo)
    .flatMap((track) =>
      track.clips
        .filter((clip) => !clip.muted)
        .filter((clip) => bounds && clip.startTime < bounds.end && clip.startTime + clip.duration > bounds.start)
        .map((clip) => ({ clip, track })),
    );
}

function createMockAudioBuffer({ channels, length, sampleRate }) {
  const data = Array.from({ length: channels }, (_, channelIndex) =>
    Float32Array.from({ length }, (_, sampleIndex) =>
      channelIndex === 0 ? sampleIndex / length : -sampleIndex / length,
    ),
  );

  return {
    getChannelData: (index) => data[index],
    length,
    numberOfChannels: channels,
    sampleRate,
  };
}

const wav16 = await encodeWavFromAudioBuffer(
  createMockAudioBuffer({ channels: 2, length: 480, sampleRate: 48000 }),
  16,
).arrayBuffer();
const view16 = new DataView(wav16);
assert.equal(String.fromCharCode(...new Uint8Array(wav16, 0, 4)), "RIFF");
assert.equal(String.fromCharCode(...new Uint8Array(wav16, 8, 4)), "WAVE");
assert.equal(view16.getUint16(20, true), 1);
assert.equal(view16.getUint16(22, true), 2);
assert.equal(view16.getUint32(24, true), 48000);
assert.equal(view16.getUint16(34, true), 16);
assert.equal(view16.getUint32(40, true), 480 * 2 * 2);

const wav24 = await encodeWavFromAudioBuffer(
  createMockAudioBuffer({ channels: 1, length: 10, sampleRate: 44100 }),
  24,
).arrayBuffer();
const view24 = new DataView(wav24);
assert.equal(view24.getUint16(34, true), 24);
assert.equal(view24.getUint32(40, true), 10 * 1 * 3);

const wavFloat = await encodeWavFromAudioBuffer(
  createMockAudioBuffer({ channels: 2, length: 10, sampleRate: 96000 }),
  32,
).arrayBuffer();
const viewFloat = new DataView(wavFloat);
assert.equal(viewFloat.getUint16(20, true), 3);
assert.equal(viewFloat.getUint16(34, true), 32);

assert.equal(sanitizeExportFilename("  Mitt Avsnitt?.wav "), "mitt-avsnitt-.wav");
assert.equal(sanitizeExportFilename(""), "studio-export.wav");

const project = {
  duration: 20,
  masterMuted: false,
  selectionEnd: 9,
  selectionStart: 3,
  tracks: [
    {
      id: "huvud",
      muted: false,
      solo: true,
      clips: [
        { duration: 5, id: "a", muted: false, sourceOffset: 1, startTime: 2 },
        { duration: 4, id: "b", muted: true, sourceOffset: 0, startTime: 10 },
      ],
    },
    {
      id: "musik",
      muted: false,
      solo: false,
      clips: [{ duration: 8, id: "c", muted: false, sourceOffset: 0, startTime: 1 }],
    },
  ],
};

assert.deepEqual(getExportBounds(project, { range: "selection" }), { end: 9, start: 3 });
assert.deepEqual(getExportBounds(project, { range: "track", trackId: "huvud" }), { end: 14, start: 0 });
assert.deepEqual(getExportBounds(project, { range: "project" }), { end: 20, start: 0 });
assert.deepEqual(
  audibleExportItems(project, { range: "project" }).map((item) => item.clip.id),
  ["a"],
);
assert.deepEqual(
  audibleExportItems({ ...project, tracks: project.tracks.map((track) => ({ ...track, solo: false })) }, { range: "track", trackId: "musik" }).map((item) => item.clip.id),
  ["c"],
);
assert.deepEqual(
  audibleExportItems({ ...project, masterMuted: true }, { range: "project" }),
  [],
);

console.log("Studio WAV-export: header, bitdjup, omfång och mute/solo verifierade.");
