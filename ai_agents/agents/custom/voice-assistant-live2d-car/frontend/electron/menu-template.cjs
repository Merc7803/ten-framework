function buildAvatarContextMenuTemplate(state) {
  return [
    {
      id: "toggle-transcript",
      label: state.transcriptVisible
        ? "Hide Live Transcript"
        : "Open Live Transcript",
    },
    {
      id: "toggle-connection",
      label: state.connected ? "Disconnect" : "Connect",
    },
    {
      id: "toggle-microphone",
      label: state.muted ? "Unmute microphone" : "Mute microphone",
    },
    {
      id: "toggle-always-on-top",
      label: `Always on top: ${state.alwaysOnTop ? "On" : "Off"}`,
    },
    {
      id: "quit",
      label: "Quit",
    },
  ];
}

module.exports = {
  buildAvatarContextMenuTemplate,
};
