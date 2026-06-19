const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DESKTOP_TRANSCRIPT_IPC_CHANNEL,
  createTranscriptRelay,
  relayTranscriptMessageToWindow,
} = require("../electron/transcript-relay.cjs");

test("relayTranscriptMessageToWindow sends transcript messages to the transcript window", () => {
  const sent = [];
  const transcriptWindow = {
    isDestroyed: () => false,
    webContents: {
      send: (channel, message) => sent.push({ channel, message }),
    },
  };
  const message = {
    id: "assistant-1",
    text: "Hello from Kevin",
    timestamp: new Date("2026-06-17T05:25:00.000Z"),
    isUser: false,
  };

  assert.equal(relayTranscriptMessageToWindow(transcriptWindow, message), true);
  assert.deepEqual(sent, [
    {
      channel: DESKTOP_TRANSCRIPT_IPC_CHANNEL,
      message,
    },
  ]);
});

test("relayTranscriptMessageToWindow ignores missing or destroyed transcript windows", () => {
  assert.equal(relayTranscriptMessageToWindow(null, { id: "m1" }), false);
  assert.equal(
    relayTranscriptMessageToWindow(
      {
        isDestroyed: () => true,
        webContents: {
          send: () => {
            throw new Error("should not send");
          },
        },
      },
      { id: "m2" }
    ),
    false
  );
});

test("createTranscriptRelay replays buffered messages when the transcript window becomes ready", () => {
  const relay = createTranscriptRelay({ maxBufferedMessages: 3 });
  const sent = [];
  const transcriptWindow = {
    isDestroyed: () => false,
    webContents: {
      send: (channel, message) => sent.push({ channel, message }),
    },
  };

  relay.publish({ id: "m1", text: "first" });
  relay.publish({ id: "m2", text: "second" });

  assert.equal(sent.length, 0);

  relay.attachWindow(transcriptWindow);

  assert.deepEqual(sent, [
    {
      channel: DESKTOP_TRANSCRIPT_IPC_CHANNEL,
      message: { id: "m1", text: "first" },
    },
    {
      channel: DESKTOP_TRANSCRIPT_IPC_CHANNEL,
      message: { id: "m2", text: "second" },
    },
  ]);
});

test("createTranscriptRelay keeps only the newest buffered messages", () => {
  const relay = createTranscriptRelay({ maxBufferedMessages: 2 });
  const sent = [];
  const transcriptWindow = {
    isDestroyed: () => false,
    webContents: {
      send: (_channel, message) => sent.push(message.id),
    },
  };

  relay.publish({ id: "m1" });
  relay.publish({ id: "m2" });
  relay.publish({ id: "m3" });
  relay.attachWindow(transcriptWindow);

  assert.deepEqual(sent, ["m2", "m3"]);
});
