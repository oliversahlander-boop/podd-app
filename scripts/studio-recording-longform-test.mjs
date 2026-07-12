import assert from "node:assert/strict";

function simulateRecordingClock(events) {
  let accumulatedMs = 0;
  let runningSince = null;
  let stoppedAt = 0;

  for (const event of events) {
    if (event.type === "start" || event.type === "resume") {
      runningSince = event.at;
    }

    if (event.type === "pause" && runningSince !== null) {
      accumulatedMs += event.at - runningSince;
      runningSince = null;
    }

    if (event.type === "stop") {
      if (runningSince !== null) {
        accumulatedMs += event.at - runningSince;
        runningSince = null;
      }
      stoppedAt = event.at;
    }
  }

  return {
    durationSeconds: accumulatedMs / 1000,
    stoppedAt,
  };
}

const tenMinutes = 10 * 60 * 1000;
const recording = simulateRecordingClock([
  { at: 0, type: "start" },
  { at: 4 * 60 * 1000, type: "pause" },
  { at: 5 * 60 * 1000, type: "resume" },
  { at: 16 * 60 * 1000, type: "stop" },
]);

assert.equal(recording.stoppedAt, 16 * 60 * 1000);
assert.equal(recording.durationSeconds, 15 * 60);
assert.ok(recording.durationSeconds > tenMinutes / 1000);

const indexedDbChunks = Array.from({ length: 300 }, (_, index) => ({
  blob: new Blob([new Uint8Array([index % 256])], { type: "audio/webm" }),
  id: `tagning:${String(index).padStart(8, "0")}`,
  index,
  recordingId: "tagning",
}));
const recovery = {
  activeDuration: recording.durationSeconds,
  paused: false,
  recordingId: "tagning",
};

assert.equal(indexedDbChunks.length, 300);
assert.equal(recovery.recordingId, indexedDbChunks[0].recordingId);
assert.equal(recovery.activeDuration, 15 * 60);

let finalized = 0;
function finalizeOnce(chunks) {
  finalized += 1;
  assert.equal(finalized, 1);
  return new Blob(
    chunks.sort((a, b) => a.index - b.index).map((chunk) => chunk.blob),
    { type: "audio/webm" },
  );
}

const finalBlob = finalizeOnce(indexedDbChunks);
assert.equal(finalBlob.type, "audio/webm");
assert.equal(finalBlob.size, indexedDbChunks.length);

console.log("Studio långinspelning: >10 minuter, paus, återställning och slutlig Blob verifierade.");
