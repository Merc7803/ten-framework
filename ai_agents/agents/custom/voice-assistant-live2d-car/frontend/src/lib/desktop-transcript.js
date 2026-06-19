const DESKTOP_TRANSCRIPT_CHANNEL = "desktop-transcript";
const DESKTOP_TRANSCRIPT_MESSAGE_TYPE = "desktop-transcript-message";

function serializeDesktopTranscriptMessage(message) {
  return {
    type: DESKTOP_TRANSCRIPT_MESSAGE_TYPE,
    message: {
      ...message,
      timestamp:
        message.timestamp instanceof Date
          ? message.timestamp.toISOString()
          : new Date(message.timestamp).toISOString(),
      isFinal: message.isFinal ?? true,
    },
  };
}

function parseDesktopTranscriptMessage(data) {
  if (data?.type !== DESKTOP_TRANSCRIPT_MESSAGE_TYPE || !data.message) {
    return null;
  }

  const message = data.message;
  if (!message.id || !message.text) {
    return null;
  }

  return {
    ...message,
    timestamp: new Date(message.timestamp),
    isUser: Boolean(message.isUser),
    isFinal: message.isFinal ?? true,
  };
}

function publishDesktopTranscriptMessage(
  message,
  BroadcastChannelCtor = globalThis.BroadcastChannel
) {
  if (typeof BroadcastChannelCtor !== "function") {
    return;
  }

  const channel = new BroadcastChannelCtor(DESKTOP_TRANSCRIPT_CHANNEL);
  channel.postMessage(serializeDesktopTranscriptMessage(message));
  channel.close();
}

function subscribeDesktopTranscriptMessages(
  onMessage,
  BroadcastChannelCtor = globalThis.BroadcastChannel
) {
  if (typeof BroadcastChannelCtor !== "function") {
    return () => {};
  }

  const channel = new BroadcastChannelCtor(DESKTOP_TRANSCRIPT_CHANNEL);
  channel.onmessage = (event) => {
    const message = parseDesktopTranscriptMessage(event.data);
    if (message) {
      onMessage(message);
    }
  };

  return () => channel.close();
}

function connectDesktopTranscriptSources({
  onMessage,
  subscribeBroadcast = subscribeDesktopTranscriptMessages,
  subscribeIpc,
  notifyReady,
}) {
  const unsubscribeBroadcast = subscribeBroadcast(onMessage);
  const unsubscribeIpc = subscribeIpc?.(onMessage);
  notifyReady?.();

  return () => {
    unsubscribeBroadcast?.();
    unsubscribeIpc?.();
  };
}

module.exports = {
  DESKTOP_TRANSCRIPT_CHANNEL,
  connectDesktopTranscriptSources,
  parseDesktopTranscriptMessage,
  publishDesktopTranscriptMessage,
  serializeDesktopTranscriptMessage,
  subscribeDesktopTranscriptMessages,
};
