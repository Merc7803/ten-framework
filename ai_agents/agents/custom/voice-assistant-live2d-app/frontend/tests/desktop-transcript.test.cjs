const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DESKTOP_TRANSCRIPT_CHANNEL,
  connectDesktopTranscriptSources,
  parseDesktopTranscriptMessage,
  publishDesktopTranscriptMessage,
  serializeDesktopTranscriptMessage,
} = require("../src/lib/desktop-transcript.js");

test("serializeDesktopTranscriptMessage makes transcript messages safe for BroadcastChannel", () => {
  assert.deepEqual(
    serializeDesktopTranscriptMessage({
      id: "m1",
      text: "Hello",
      timestamp: new Date("2026-06-17T05:00:00.000Z"),
      isUser: false,
      isFinal: true,
    }),
    {
      type: "desktop-transcript-message",
      message: {
        id: "m1",
        text: "Hello",
        timestamp: "2026-06-17T05:00:00.000Z",
        isUser: false,
        isFinal: true,
      },
    }
  );
});

test("parseDesktopTranscriptMessage restores timestamp dates and ignores unknown payloads", () => {
  assert.equal(parseDesktopTranscriptMessage({ type: "other" }), null);
  assert.deepEqual(
    parseDesktopTranscriptMessage({
      type: "desktop-transcript-message",
      message: {
        id: "m2",
        text: "Hi",
        timestamp: "2026-06-17T05:01:00.000Z",
        isUser: true,
      },
    }),
    {
      id: "m2",
      text: "Hi",
      timestamp: new Date("2026-06-17T05:01:00.000Z"),
      isUser: true,
      isFinal: true,
    }
  );
});

test("publishDesktopTranscriptMessage posts to the desktop transcript channel", () => {
  const posted = [];
  class FakeBroadcastChannel {
    constructor(name) {
      this.name = name;
      this.closed = false;
    }
    postMessage(message) {
      posted.push({ name: this.name, message });
    }
    close() {
      this.closed = true;
    }
  }

  publishDesktopTranscriptMessage(
    {
      id: "m3",
      text: "Broadcast me",
      timestamp: new Date("2026-06-17T05:02:00.000Z"),
      isUser: false,
    },
    FakeBroadcastChannel
  );

  assert.equal(posted[0].name, DESKTOP_TRANSCRIPT_CHANNEL);
  assert.equal(posted[0].message.message.text, "Broadcast me");
});

test("connectDesktopTranscriptSources marks the transcript ready after listeners are subscribed", () => {
  const events = [];

  const unsubscribe = connectDesktopTranscriptSources({
    onMessage: () => {},
    subscribeBroadcast: () => {
      events.push("broadcast");
      return () => events.push("unsubscribe-broadcast");
    },
    subscribeIpc: () => {
      events.push("ipc");
      return () => events.push("unsubscribe-ipc");
    },
    notifyReady: () => events.push("ready"),
  });

  assert.deepEqual(events, ["broadcast", "ipc", "ready"]);

  unsubscribe();

  assert.deepEqual(events, [
    "broadcast",
    "ipc",
    "ready",
    "unsubscribe-broadcast",
    "unsubscribe-ipc",
  ]);
});
