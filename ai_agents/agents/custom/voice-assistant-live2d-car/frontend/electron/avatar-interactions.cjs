function getAvatarInteractionCss() {
  return `
    html,
    body,
    #__next,
    main,
    main * {
      -webkit-app-region: no-drag !important;
    }
  `;
}

function installAvatarWindowInteractions(avatarWindow) {
  avatarWindow.webContents.on("did-finish-load", () => {
    avatarWindow.webContents
      .insertCSS(getAvatarInteractionCss())
      .catch((error) => {
        console.warn("Failed to inject avatar interaction CSS:", error);
      });
  });
}

module.exports = {
  getAvatarInteractionCss,
  installAvatarWindowInteractions,
};
