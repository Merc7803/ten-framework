const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_LANGUAGE_MODE,
  buildLanguageModeStartProperties,
  getLanguageModeOption,
} = require("../src/lib/language-mode.js");
const { buildDesktopAgentStartConfig } = require("../src/lib/desktop-session.js");

test("defaults the Live2D app to Vietnamese mode", () => {
  assert.equal(DEFAULT_LANGUAGE_MODE, "vi");
  assert.equal(getLanguageModeOption(undefined).id, "vi");
});

test("buildLanguageModeStartProperties configures Vietnamese speech by default", () => {
  const properties = buildLanguageModeStartProperties({
    mode: "vi",
    agentGreeting: "Xin chao Kevin",
    httpControlPort: 8070,
  });

  assert.equal(properties.stt.params.language, "vi");
  assert.equal(properties.tts.params.lang, "vi");
  assert.equal(properties.llm.greeting, "Xin chao Kevin");
  assert.match(properties.llm.prompt, /Vietnamese/);
  assert.match(properties.llm.prompt, /tiếng Việt/i);
});

test("buildLanguageModeStartProperties configures English-only speech", () => {
  const properties = buildLanguageModeStartProperties({
    mode: "en",
    agentGreeting: "Hello Kevin",
    httpControlPort: 8070,
  });

  assert.equal(properties.stt.params.language, "en-US");
  assert.equal(properties.tts.params.lang, "en");
  assert.match(properties.llm.prompt, /English/);
});

test("buildLanguageModeStartProperties configures bilingual mode with mixed input falling back to Vietnamese", () => {
  const properties = buildLanguageModeStartProperties({
    mode: "bilingual",
    agentGreeting: "Xin chao Kevin",
    httpControlPort: 8070,
  });

  assert.equal(properties.stt.params.language, "multi");
  assert.equal(properties.tts.params.lang, "vi");
  assert.match(properties.llm.prompt, /same language/i);
  assert.match(properties.llm.prompt, /mixed/i);
  assert.match(properties.llm.prompt, /Vietnamese/);
});

test("desktop agent start config defaults to Vietnamese mode", () => {
  const config = buildDesktopAgentStartConfig({
    channel: "desktop-channel",
    userId: 123,
    greeting: "Xin chao Kevin",
    httpPort: 8070,
  });

  assert.equal(config.language, "vi");
  assert.equal(config.properties.stt.params.language, "vi");
  assert.equal(config.properties.tts.params.lang, "vi");
  assert.equal(config.properties.llm.greeting, "Xin chao Kevin");
  assert.match(config.properties.llm.prompt, /Vietnamese/);
});

test("desktop agent start config applies selected bilingual mode", () => {
  const config = buildDesktopAgentStartConfig({
    channel: "desktop-channel",
    userId: 123,
    greeting: "Xin chao Kevin",
    httpPort: 8070,
    languageMode: "bilingual",
  });

  assert.equal(config.language, "bilingual");
  assert.equal(config.properties.stt.params.language, "multi");
  assert.equal(config.properties.tts.params.lang, "vi");
  assert.match(config.properties.llm.prompt, /mixed/i);
});
