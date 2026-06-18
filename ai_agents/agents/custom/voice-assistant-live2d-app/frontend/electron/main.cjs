const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain, Menu, screen } = require("electron");
const { installAvatarWindowInteractions } = require("./avatar-interactions.cjs");
const { buildAvatarContextMenuTemplate } = require("./menu-template.cjs");
const { resolveDesktopDevServerUrl } = require("./dev-server.cjs");
const {
  DESKTOP_TRANSCRIPT_IPC_CHANNEL,
  createTranscriptRelay,
} = require("./transcript-relay.cjs");
const {
  clampAvatarBounds,
  getDefaultAvatarBounds,
  loadAvatarBounds,
  saveAvatarBounds,
} = require("./window-state.cjs");

let avatarWindow;
let transcriptWindow;
let desktopDevServerUrl = "http://localhost:3000";
let activeDrag;
const transcriptRelay = createTranscriptRelay();
const desktopState = {
  transcriptVisible: false,
  connected: false,
  muted: false,
  alwaysOnTop: true,
};

function getStatePath() {
  return path.join(app.getPath("userData"), "desktop-window-state.json");
}

function getPrimaryDisplay() {
  return screen.getPrimaryDisplay();
}

function createAvatarWindow() {
  const initialBounds = loadAvatarBounds(getStatePath(), getPrimaryDisplay());
  avatarWindow = new BrowserWindow({
    ...initialBounds,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    show: false,
    alwaysOnTop: desktopState.alwaysOnTop,
    backgroundColor: "#00000000",
    hasShadow: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  installAvatarWindowInteractions(avatarWindow);
  avatarWindow.loadURL(`${desktopDevServerUrl}/desktop/avatar`);
  avatarWindow.once("ready-to-show", () => avatarWindow.show());
  avatarWindow.webContents.on("context-menu", () => showAvatarMenu());
  avatarWindow.on("moved", persistAvatarBounds);
  avatarWindow.on("close", persistAvatarBounds);
}

function createTranscriptWindow() {
  transcriptWindow = new BrowserWindow({
    width: 460,
    height: 620,
    show: false,
    alwaysOnTop: desktopState.alwaysOnTop,
    backgroundColor: "#f8fafc",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  transcriptWindow.loadURL(`${desktopDevServerUrl}/desktop/transcript`);
  transcriptRelay.attachWindow(transcriptWindow);
  transcriptWindow.webContents.on("did-finish-load", () => {
    transcriptRelay.replay();
  });
  transcriptWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      hideTranscriptWindow();
    }
  });
}

function persistAvatarBounds() {
  if (!avatarWindow || avatarWindow.isDestroyed()) {
    return;
  }
  const bounds = avatarWindow.getBounds();
  const clamped = clampAvatarBounds(
    bounds,
    screen.getDisplayMatching(bounds) || getPrimaryDisplay()
  );
  if (bounds.x !== clamped.x || bounds.y !== clamped.y) {
    avatarWindow.setBounds(clamped);
  }
  saveAvatarBounds(getStatePath(), clamped);
}

function getClampedAvatarBounds(bounds) {
  return clampAvatarBounds(
    bounds,
    screen.getDisplayMatching(bounds) || getPrimaryDisplay()
  );
}

function startAvatarDrag() {
  if (!avatarWindow || avatarWindow.isDestroyed()) {
    return;
  }
  activeDrag = {
    cursor: screen.getCursorScreenPoint(),
    bounds: avatarWindow.getBounds(),
  };
}

function moveAvatarDrag() {
  if (!activeDrag || !avatarWindow || avatarWindow.isDestroyed()) {
    return;
  }
  const cursor = screen.getCursorScreenPoint();
  const nextBounds = getClampedAvatarBounds({
    ...activeDrag.bounds,
    x: activeDrag.bounds.x + cursor.x - activeDrag.cursor.x,
    y: activeDrag.bounds.y + cursor.y - activeDrag.cursor.y,
  });
  avatarWindow.setBounds(nextBounds);
}

function endAvatarDrag() {
  if (!activeDrag) {
    return;
  }
  activeDrag = null;
  persistAvatarBounds();
}

function placeTranscriptNextToAvatar() {
  if (!avatarWindow || !transcriptWindow) {
    return;
  }

  const avatarBounds = avatarWindow.getBounds();
  const transcriptBounds = transcriptWindow.getBounds();
  const currentDisplay = screen.getDisplayMatching(avatarBounds);
  const workArea = currentDisplay.workArea;
  const gap = 12;
  const preferredX = avatarBounds.x - transcriptBounds.width - gap;
  const fallbackX = avatarBounds.x + avatarBounds.width + gap;
  const x =
    preferredX >= workArea.x
      ? preferredX
      : Math.min(fallbackX, workArea.x + workArea.width - transcriptBounds.width);
  const y = Math.min(
    Math.max(avatarBounds.y, workArea.y),
    workArea.y + workArea.height - transcriptBounds.height
  );

  transcriptWindow.setBounds({ ...transcriptBounds, x, y });
}

function showTranscriptWindow() {
  placeTranscriptNextToAvatar();
  transcriptWindow.show();
  desktopState.transcriptVisible = true;
}

function hideTranscriptWindow() {
  transcriptWindow.hide();
  desktopState.transcriptVisible = false;
}

function toggleTranscriptWindow() {
  if (desktopState.transcriptVisible) {
    hideTranscriptWindow();
  } else {
    showTranscriptWindow();
  }
}

function sendActionToAvatar(action) {
  avatarWindow?.webContents.send("desktop:menu-action", action);
}

function showBackendHelpDialog() {
  dialog.showMessageBox(avatarWindow, {
    type: "warning",
    title: "Backend not running",
    message: "Backend not running",
    detail:
      "Start the local TEN services first:\n\ncd ai_agents/agents/custom/voice-assistant-live2d-app\ntask run",
    buttons: ["OK"],
  });
}

function handleMenuAction(action) {
  switch (action) {
    case "toggle-transcript":
      toggleTranscriptWindow();
      break;
    case "toggle-always-on-top":
      desktopState.alwaysOnTop = !desktopState.alwaysOnTop;
      avatarWindow?.setAlwaysOnTop(desktopState.alwaysOnTop);
      transcriptWindow?.setAlwaysOnTop(desktopState.alwaysOnTop);
      break;
    case "quit":
      app.isQuitting = true;
      app.quit();
      break;
    default:
      sendActionToAvatar(action);
  }
}

function showAvatarMenu() {
  const template = buildAvatarContextMenuTemplate(desktopState).map((item) => ({
    ...item,
    click: () => handleMenuAction(item.id),
  }));
  Menu.buildFromTemplate(template).popup({ window: avatarWindow });
}

app.whenReady().then(async () => {
  desktopDevServerUrl = await resolveDesktopDevServerUrl();
  createAvatarWindow();
  createTranscriptWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("desktop:set-menu-state", (_event, state) => {
  Object.assign(desktopState, state);
});

ipcMain.on("desktop:show-avatar-menu", showAvatarMenu);
ipcMain.on("desktop:drag-start", startAvatarDrag);
ipcMain.on("desktop:drag-move", moveAvatarDrag);
ipcMain.on("desktop:drag-end", endAvatarDrag);
ipcMain.on("desktop:show-backend-help", showBackendHelpDialog);
ipcMain.on("desktop:transcript-ready", () => {
  transcriptRelay.replay();
});
ipcMain.on(DESKTOP_TRANSCRIPT_IPC_CHANNEL, (_event, message) => {
  transcriptRelay.publish(message);
});
