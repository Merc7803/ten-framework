const fs = require("node:fs");
const path = require("node:path");

const AVATAR_DEFAULT_SIZE = Object.freeze({ width: 300, height: 420 });
const DEFAULT_SCREEN_MARGIN = 24;
const MIN_VISIBLE_PIXELS = 72;

function getWorkArea(display) {
  if (!display?.workArea) {
    throw new Error("display.workArea is required");
  }
  return display.workArea;
}

function getDefaultAvatarBounds(display) {
  const workArea = getWorkArea(display);
  return {
    width: AVATAR_DEFAULT_SIZE.width,
    height: AVATAR_DEFAULT_SIZE.height,
    x:
      workArea.x +
      workArea.width -
      AVATAR_DEFAULT_SIZE.width -
      DEFAULT_SCREEN_MARGIN,
    y:
      workArea.y +
      workArea.height -
      AVATAR_DEFAULT_SIZE.height -
      DEFAULT_SCREEN_MARGIN,
  };
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampAvatarBounds(bounds, display) {
  const workArea = getWorkArea(display);
  const width = bounds.width || AVATAR_DEFAULT_SIZE.width;
  const height = bounds.height || AVATAR_DEFAULT_SIZE.height;

  return {
    x: clampNumber(
      bounds.x,
      workArea.x + MIN_VISIBLE_PIXELS - width,
      workArea.x + workArea.width - MIN_VISIBLE_PIXELS
    ),
    y: clampNumber(
      bounds.y,
      workArea.y + MIN_VISIBLE_PIXELS - height,
      workArea.y + workArea.height - MIN_VISIBLE_PIXELS
    ),
    width,
    height,
  };
}

function loadAvatarBounds(filePath, display) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return clampAvatarBounds(parsed.avatarBounds, display);
  } catch {
    return getDefaultAvatarBounds(display);
  }
}

function saveAvatarBounds(filePath, bounds) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify({ avatarBounds: bounds }, null, 2),
    "utf8"
  );
}

module.exports = {
  AVATAR_DEFAULT_SIZE,
  DEFAULT_SCREEN_MARGIN,
  MIN_VISIBLE_PIXELS,
  clampAvatarBounds,
  getDefaultAvatarBounds,
  loadAvatarBounds,
  saveAvatarBounds,
};
