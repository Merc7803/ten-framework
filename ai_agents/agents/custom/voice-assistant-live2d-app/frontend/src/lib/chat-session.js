function normalizeChatText(text) {
  return String(text ?? "").trim();
}

function createUserChatMessage({ id, text, now = new Date() }) {
  return {
    id,
    text: normalizeChatText(text),
    timestamp: now,
    isUser: true,
    isFinal: true,
  };
}

function isChatSubmittable(text, isConnected) {
  return Boolean(isConnected && normalizeChatText(text));
}

function buildTextMessageRequest({ requestId, channel, text }) {
  return {
    request_id: requestId,
    channel_name: channel,
    text: normalizeChatText(text),
  };
}

function buildHttpControlMessageRequest({ requestId, channel, text }) {
  return {
    name: "message",
    payload: buildTextMessageRequest({ requestId, channel, text }),
  };
}

function buildTranscriptMessageId(payload, fallbackMessageId) {
  const stableMessageId = normalizeChatText(payload?.message_id);
  return stableMessageId || fallbackMessageId;
}

const DUPLICATE_USER_TRANSCRIPT_WINDOW_MS = 2_000;

function normalizeTranscriptText(text) {
  return normalizeChatText(text).replace(/\s+/g, " ").toLowerCase();
}

function toTimestampMs(timestamp) {
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function isLikelyDuplicateUserTranscript(first, second) {
  if (!first?.isUser || !second?.isUser) {
    return false;
  }

  const firstText = normalizeTranscriptText(first.text);
  const secondText = normalizeTranscriptText(second.text);
  if (!firstText || firstText !== secondText) {
    return false;
  }

  const delta = Math.abs(
    toTimestampMs(first.timestamp) - toTimestampMs(second.timestamp)
  );
  return delta <= DUPLICATE_USER_TRANSCRIPT_WINDOW_MS;
}

function mergeTranscriptMessage(messages, message) {
  const existingIndex = messages.findIndex((entry) => entry.id === message.id);
  const duplicateIndex =
    existingIndex === -1
      ? messages.findIndex((entry) =>
          isLikelyDuplicateUserTranscript(entry, message)
        )
      : existingIndex;

  if (duplicateIndex === -1) {
    return [...messages, message];
  }

  const next = [...messages];
  const existing = next[duplicateIndex];
  next[duplicateIndex] = existing?.isFinal && !message.isFinal ? existing : message;
  return next;
}

async function sendTextMessage({ post, requestId, channel, httpPort = 8070, text }) {
  const response = await post(
    "/api/agents/text",
    buildTextMessageRequest({ requestId, channel, text })
  );
  return response.data || {};
}

async function submitChatMessage({
  post,
  requestId,
  messageId,
  channel,
  httpPort,
  text,
  isConnected,
  now = new Date(),
}) {
  if (!isChatSubmittable(text, isConnected)) {
    return { sent: false, message: null, response: null };
  }

  const message = createUserChatMessage({
    id: messageId,
    text,
    now,
  });
  const response = await sendTextMessage({
    post,
    requestId,
    channel,
    httpPort,
    text,
  });

  return { sent: true, message, response };
}

module.exports = {
  buildHttpControlMessageRequest,
  buildTextMessageRequest,
  buildTranscriptMessageId,
  createUserChatMessage,
  isChatSubmittable,
  isLikelyDuplicateUserTranscript,
  mergeTranscriptMessage,
  normalizeChatText,
  normalizeTranscriptText,
  sendTextMessage,
  submitChatMessage,
};
