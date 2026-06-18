const DEFAULT_LANGUAGE_MODE = "vi";

const LANGUAGE_MODE_OPTIONS = [
  {
    id: "vi",
    label: "Tiếng Việt",
    startLanguage: "vi",
    sttLanguage: "vi",
    ttsLanguage: "vi",
    prompt:
      "You are a warm Live2D voice assistant. Always reply in Vietnamese. Use natural, friendly tiếng Việt.",
  },
  {
    id: "en",
    label: "English",
    startLanguage: "en",
    sttLanguage: "en-US",
    ttsLanguage: "en",
    prompt:
      "You are a warm Live2D voice assistant. Always reply in English.",
  },
  {
    id: "bilingual",
    label: "Cả 2",
    startLanguage: "bilingual",
    sttLanguage: "multi",
    ttsLanguage: "vi",
    prompt:
      "You are a warm Live2D voice assistant. Reply in the same language as the user. If the user sends mixed Vietnamese and English in one message, reply in Vietnamese.",
  },
];

function getLanguageModeOption(mode) {
  return (
    LANGUAGE_MODE_OPTIONS.find((option) => option.id === mode) ||
    LANGUAGE_MODE_OPTIONS.find((option) => option.id === DEFAULT_LANGUAGE_MODE)
  );
}

function getLanguageModeGreeting(mode, characterName, fallbackGreeting) {
  const option = getLanguageModeOption(mode);
  if (option.id === "vi") {
    return `Xin chào, mình là ${characterName}. Mình có thể giúp gì cho bạn hôm nay?`;
  }
  if (option.id === "bilingual") {
    return `Xin chào, mình là ${characterName}. Bạn có thể nói tiếng Việt hoặc English với mình.`;
  }
  return fallbackGreeting;
}

function buildLanguageModeStartProperties({
  mode = DEFAULT_LANGUAGE_MODE,
  agentGreeting,
  httpControlPort,
}) {
  const option = getLanguageModeOption(mode);

  return {
    stt: {
      params: {
        language: option.sttLanguage,
      },
    },
    llm: {
      prompt: option.prompt,
      greeting: agentGreeting,
    },
    main_control: {
      greeting: agentGreeting,
    },
    tts: {
      params: {
        lang: option.ttsLanguage,
      },
    },
    http_server_python: {
      listen_port: httpControlPort,
    },
  };
}

module.exports = {
  DEFAULT_LANGUAGE_MODE,
  LANGUAGE_MODE_OPTIONS,
  buildLanguageModeStartProperties,
  getLanguageModeGreeting,
  getLanguageModeOption,
};
