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
      language: "en",
      voiceType: "male",
      properties: {
        llm: {
          greeting: "Hello from Kevin",
        },
        main_control: {
          greeting: "Hello from Kevin",
        },
        http_server_python: {
          listen_port: 8070,
        },
      },
    }
  );
});
