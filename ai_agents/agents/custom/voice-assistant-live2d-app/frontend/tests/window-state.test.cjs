const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AVATAR_DEFAULT_SIZE,
  clampAvatarBounds,
  getDefaultAvatarBounds,
} = require("../electron/window-state.cjs");

test("getDefaultAvatarBounds places the avatar at the bottom right of the primary display", () => {
  const bounds = getDefaultAvatarBounds({
    workArea: { x: 0, y: 0, width: 1920, height: 1080 },
  });

  assert.deepEqual(bounds, {
    width: AVATAR_DEFAULT_SIZE.width,
    height: AVATAR_DEFAULT_SIZE.height,
    x: 1920 - AVATAR_DEFAULT_SIZE.width - 24,
    y: 1080 - AVATAR_DEFAULT_SIZE.height - 24,
  });
});

test("clampAvatarBounds keeps part of the avatar reachable when dragged outside the screen", () => {
  const bounds = clampAvatarBounds(
    { x: 2100, y: -500, width: 300, height: 420 },
    { workArea: { x: 0, y: 0, width: 1920, height: 1080 } }
  );

  assert.deepEqual(bounds, {
    x: 1920 - 72,
    y: 72 - 420,
    width: 300,
    height: 420,
  });
});
