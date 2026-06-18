const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildDesktopAgentStartConfig,
  buildDesktopTokenRequest,
  parseDesktopAgoraCredentials,
} = require("../src/lib/desktop-session.js");

test("buildDesktopTokenRequest creates a token request for the desktop channel", () => {
  assert.deepEqual(
    buildDesktopTokenRequest({
      requestId: "token-1",
      uid: 123,
      channel: "desktop-channel",
    }),
    {
      request_id: "token-1",
      uid: 123,
      channel_name: "desktop-channel",
    }
  );
});

test("parseDesktopAgoraCredentials supports wrapped agent server responses", () => {
  assert.deepEqual(
    parseDesktopAgoraCredentials({
      data: {
        appId: "app-id",
        channel_name: "desktop-channel",
        token: "token",
        uid: 123,
      },
    }),
    {
      appId: "app-id",
      channel: "desktop-channel",
      token: "token",
      uid: 123,
    }
  );
});

test("buildDesktopAgentStartConfig starts the Live2D graph with HTTP control enabled", () => {
  assert.deepEqual(
    buildDesktopAgentStartConfig({
      channel: "desktop-channel",
      userId: 123,
      greeting: "Hello from Kevin",
      httpPort: 8070,
    }),
    {
      channel: "desktop-channel",
      userId: 123,
      graphName: "voice_assistant_live2d",
      language: "vi",
      voiceType: "male",
      properties: {
        stt: {
          params: {
            language: "vi",
          },
        },
        llm: {
          greeting: "Hello from Kevin",
          prompt:
            "You are a warm Live2D voice assistant. Always reply in Vietnamese. Use natural, friendly tiếng Việt.",
        },
        main_control: {
          greeting: "Hello from Kevin",
        },
        tts: {
          params: {
            lang: "vi",
          },
        },
        http_server_python: {
          listen_port: 8070,
        },
      },
    }
  );
});
