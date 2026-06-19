const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronDesktop", {
  onMenuAction(callback) {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on("desktop:menu-action", listener);
    return () => ipcRenderer.removeListener("desktop:menu-action", listener);
  },
  setMenuState(state) {
    ipcRenderer.send("desktop:set-menu-state", state);
  },
  showAvatarMenu() {
    ipcRenderer.send("desktop:show-avatar-menu");
  },
  startAvatarDrag() {
    ipcRenderer.send("desktop:drag-start");
  },
  moveAvatarDrag() {
    ipcRenderer.send("desktop:drag-move");
  },
  endAvatarDrag() {
    ipcRenderer.send("desktop:drag-end");
  },
  showBackendHelp() {
    ipcRenderer.send("desktop:show-backend-help");
  },
  publishTranscriptMessage(message) {
    ipcRenderer.send("desktop:transcript-message", message);
  },
  onTranscriptMessage(callback) {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on("desktop:transcript-message", listener);
    return () =>
      ipcRenderer.removeListener("desktop:transcript-message", listener);
  },
  notifyTranscriptReady() {
    ipcRenderer.send("desktop:transcript-ready");
  },
});
