const DESKTOP_TRANSCRIPT_IPC_CHANNEL = "desktop:transcript-message";
const DEFAULT_MAX_BUFFERED_MESSAGES = 100;

function relayTranscriptMessageToWindow(transcriptWindow, message) {
  if (!transcriptWindow || transcriptWindow.isDestroyed?.()) {
    return false;
  }

  transcriptWindow.webContents.send(DESKTOP_TRANSCRIPT_IPC_CHANNEL, message);
  return true;
}

function createTranscriptRelay({
  maxBufferedMessages = DEFAULT_MAX_BUFFERED_MESSAGES,
} = {}) {
  let transcriptWindow = null;
  const bufferedMessages = [];

  function trimBuffer() {
    while (bufferedMessages.length > maxBufferedMessages) {
      bufferedMessages.shift();
    }
  }

  function replay() {
    if (!transcriptWindow || transcriptWindow.isDestroyed?.()) {
      return;
    }

    for (const message of bufferedMessages) {
      relayTranscriptMessageToWindow(transcriptWindow, message);
    }
  }

  return {
    attachWindow(window) {
      transcriptWindow = window;
      replay();
    },
    publish(message) {
      bufferedMessages.push(message);
      trimBuffer();
      relayTranscriptMessageToWindow(transcriptWindow, message);
    },
    replay,
  };
}

module.exports = {
  DESKTOP_TRANSCRIPT_IPC_CHANNEL,
  createTranscriptRelay,
  relayTranscriptMessageToWindow,
};
