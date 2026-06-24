const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_LANGUAGE_MODE,
  buildLanguageModeStartProperties,
  getLanguageModeOption,
} = require("../src/lib/language-mode.js");

test("defaults the Live2D app to Vietnamese mode", () => {
  assert.equal(DEFAULT_LANGUAGE_MODE, "vi");
  assert.equal(getLanguageModeOption(undefined).id, "vi");
});

test("buildLanguageModeStartProperties configures Vietnamese conversation with Vietnamese STT", () => {
  const properties = buildLanguageModeStartProperties({
    mode: "vi",
    agentGreeting: "Xin chao Kevin",
    httpControlPort: 8070,
  });

  assert.equal(properties.stt.params.language, "vi");
  assert.equal(properties.tts.params.lang, "vi");
  assert.equal(properties.llm.greeting, "Xin chao Kevin");
  assert.match(properties.llm.prompt, /Vietnamese/);
  assert.match(properties.llm.prompt, /general-purpose assistant/i);
  assert.match(properties.llm.prompt, /car control is only one extra capability/i);
  assert.match(
    properties.llm.prompt,
    /Do not present car controls as your only capabilities/i
  );
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
