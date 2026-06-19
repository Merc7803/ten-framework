import type { TranscriptMessage } from "@/types";

export {};

declare global {
  interface Window {
    electronDesktop?: {
      onMenuAction: (callback: (action: string) => void) => () => void;
      setMenuState: (state: {
        transcriptVisible?: boolean;
        connected?: boolean;
        muted?: boolean;
        alwaysOnTop?: boolean;
      }) => void;
      showAvatarMenu: () => void;
      startAvatarDrag: () => void;
      moveAvatarDrag: () => void;
      endAvatarDrag: () => void;
      showBackendHelp: () => void;
      publishTranscriptMessage: (message: TranscriptMessage) => void;
      onTranscriptMessage: (
        callback: (message: TranscriptMessage) => void
      ) => () => void;
      notifyTranscriptReady: () => void;
    };
  }
}
