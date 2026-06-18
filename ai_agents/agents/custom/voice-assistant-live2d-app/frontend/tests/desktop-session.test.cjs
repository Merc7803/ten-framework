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

test("buildDesktopAgentStartConfig starts the Live2D graph with Vietnamese conversation defaults", () => {
  const config = buildDesktopAgentStartConfig({
    channel: "desktop-channel",
    userId: 123,
    greeting: "Xin chao Kevin",
    httpPort: 8070,
  });

  assert.equal(config.channel, "desktop-channel");
  assert.equal(config.userId, 123);
  assert.equal(config.graphName, "voice_assistant_live2d");
  assert.equal(config.language, "vi");
  assert.equal(config.voiceType, "male");
  assert.equal(config.properties.stt.params.language, "vi");
  assert.equal(config.properties.tts.params.lang, "vi");
  assert.equal(config.properties.llm.greeting, "Xin chao Kevin");
  assert.equal(config.properties.main_control.greeting, "Xin chao Kevin");
  assert.equal(config.properties.http_server_python.listen_port, 8070);
});

test("buildDesktopAgentStartConfig can start English-only mode", () => {
  const config = buildDesktopAgentStartConfig({
    channel: "desktop-channel",
    userId: 123,
    greeting: "Hello Kevin",
    httpPort: 8070,
    languageMode: "en",
  });

  assert.equal(config.language, "en");
  assert.equal(config.properties.stt.params.language, "en-US");
  assert.equal(config.properties.tts.params.lang, "en");
});
