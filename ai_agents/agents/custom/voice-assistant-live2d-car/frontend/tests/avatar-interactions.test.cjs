const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getAvatarInteractionCss,
  installAvatarWindowInteractions,
} = require("../electron/avatar-interactions.cjs");

test("getAvatarInteractionCss disables Electron drag regions so right click reaches the app", () => {
  const css = getAvatarInteractionCss();

  assert.match(css, /-webkit-app-region:\s*no-drag\s*!important/);
});

test("installAvatarWindowInteractions injects interaction CSS after the avatar page loads", () => {
  const listeners = new Map();
  const insertedCss = [];
  const fakeWindow = {
    webContents: {
      on(eventName, listener) {
        listeners.set(eventName, listener);
      },
      insertCSS(css) {
        insertedCss.push(css);
        return Promise.resolve();
      },
    },
  };

  installAvatarWindowInteractions(fakeWindow);
  listeners.get("did-finish-load")();

  assert.equal(insertedCss.length, 1);
  assert.match(insertedCss[0], /-webkit-app-region:\s*no-drag\s*!important/);
});
