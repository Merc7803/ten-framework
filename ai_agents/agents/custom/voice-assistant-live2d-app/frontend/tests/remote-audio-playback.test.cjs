const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("AgoraService delegates remote audio playback to the Live2D component", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/services/agora.ts"),
    "utf8"
  );

  assert.doesNotMatch(source, /remoteAudioTrack\.play\(/);
  assert.match(source, /onRemoteAudioTrack\?\.\(this\.remoteAudioTrack\)/);
});
