const assert = require("node:assert/strict");
const test = require("node:test");

const { buildAvatarContextMenuTemplate } = require("../electron/menu-template.cjs");

test("buildAvatarContextMenuTemplate exposes the minimum phase 1 avatar actions", () => {
  const template = buildAvatarContextMenuTemplate({
    transcriptVisible: false,
    connected: false,
    muted: false,
    alwaysOnTop: true,
  });

  assert.deepEqual(
    template.map((item) => item.label),
    [
      "Open Live Transcript",
      "Connect",
      "Mute microphone",
      "Always on top: On",
      "Quit",
    ]
  );
});

test("buildAvatarContextMenuTemplate reflects active desktop state", () => {
  const template = buildAvatarContextMenuTemplate({
    transcriptVisible: true,
    connected: true,
    muted: true,
    alwaysOnTop: false,
  });

  assert.deepEqual(
    template.map((item) => item.label),
    [
      "Hide Live Transcript",
      "Disconnect",
      "Unmute microphone",
      "Always on top: Off",
      "Quit",
    ]
  );
});
