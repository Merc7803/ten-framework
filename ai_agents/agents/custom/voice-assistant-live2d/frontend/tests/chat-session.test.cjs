const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildTextMessageRequest,
  buildTranscriptMessageId,
  createUserChatMessage,
  isChatSubmittable,
  mergeTranscriptMessage,
  sendTextMessage,
  submitChatMessage,
} = require("../src/lib/chat-session.js");

test("createUserChatMessage trims text and creates a final user transcript message", () => {
  const message = createUserChatMessage({
    id: "chat-1",
    text: "  hello avatar  ",
    now: new Date("2026-06-16T03:00:00.000Z"),
  });

  assert.deepEqual(message, {
    id: "chat-1",
    text: "hello avatar",
    timestamp: new Date("2026-06-16T03:00:00.000Z"),
    isUser: true,
    isFinal: true,
  });
});

test("isChatSubmittable only allows non-empty text while connected", () => {
  assert.equal(isChatSubmittable("hello", true), true);
  assert.equal(isChatSubmittable("  hello  ", true), true);
  assert.equal(isChatSubmittable("", true), false);
  assert.equal(isChatSubmittable("   ", true), false);
  assert.equal(isChatSubmittable("hello", false), false);
});

test("buildTextMessageRequest trims text and targets the active channel", () => {
  const request = buildTextMessageRequest({
    requestId: "request-1",
    channel: "test-channel",
    text: "  what can you do?  ",
  });

  assert.deepEqual(request, {
    request_id: "request-1",
    channel_name: "test-channel",
    text: "what can you do?",
  });
});

test("mergeTranscriptMessage replaces streaming updates with the same message id", () => {
  const first = {
    id: "assistant-1",
    text: "Hello",
    timestamp: new Date("2026-06-16T03:00:00.000Z"),
    isUser: false,
    isFinal: false,
  };
  const final = {
    id: "assistant-1",
    text: "Hello there",
    timestamp: new Date("2026-06-16T03:00:01.000Z"),
    isUser: false,
    isFinal: true,
  };

  const messages = mergeTranscriptMessage([first], final);

  assert.deepEqual(messages, [final]);
});

test("buildTranscriptMessageId prefers a stable payload message id over the transport chunk id", () => {
  assert.equal(
    buildTranscriptMessageId(
      {
        message_id: "assistant-session-100-turn-3",
        role: "assistant",
        text: "Hello",
      },
      "chunk-abc"
    ),
    "assistant-session-100-turn-3"
  );
});

test("sendTextMessage posts trimmed text to the Live2D graph HTTP control endpoint", async () => {
  const calls = [];
  const post = async (url, body) => {
    calls.push({ url, body });
    return { data: { code: "0", msg: "success" } };
  };

  const response = await sendTextMessage({
    post,
    requestId: "request-1",
    channel: "test-channel",
    httpPort: 8123,
    text: "  hello from chat  ",
  });

  assert.deepEqual(calls, [
    {
      url: "/proxy/8123/cmd",
      body: {
        name: "message",
        payload: {
          request_id: "request-1",
          channel_name: "test-channel",
          text: "hello from chat",
        },
      },
    },
  ]);
  assert.deepEqual(response, { code: "0", msg: "success" });
});

test("submitChatMessage creates an optimistic user message and sends it", async () => {
  const calls = [];
  const result = await submitChatMessage({
    post: async (url, body) => {
      calls.push({ url, body });
      return { data: { code: "0" } };
    },
    requestId: "request-2",
    messageId: "chat-2",
    channel: "test-channel",
    httpPort: 8123,
    text: "  please speak this  ",
    isConnected: true,
    now: new Date("2026-06-16T04:00:00.000Z"),
  });

  assert.equal(result.sent, true);
  assert.deepEqual(result.message, {
    id: "chat-2",
    text: "please speak this",
    timestamp: new Date("2026-06-16T04:00:00.000Z"),
    isUser: true,
    isFinal: true,
  });
  assert.deepEqual(calls, [
    {
      url: "/proxy/8123/cmd",
      body: {
        name: "message",
        payload: {
          request_id: "request-2",
          channel_name: "test-channel",
          text: "please speak this",
        },
      },
    },
  ]);
});

test("submitChatMessage does not send while disconnected", async () => {
  let called = false;
  const result = await submitChatMessage({
    post: async () => {
      called = true;
    },
    requestId: "request-3",
    messageId: "chat-3",
    channel: "test-channel",
    text: "hello",
    isConnected: false,
  });

  assert.equal(result.sent, false);
  assert.equal(result.message, null);
  assert.equal(called, false);
});
