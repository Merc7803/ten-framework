const {
  DEFAULT_LANGUAGE_MODE,
  buildLanguageModeStartProperties,
  getLanguageModeOption,
} = require("./language-mode.js");

const DEFAULT_DESKTOP_GRAPH_NAME = "voice_assistant_live2d";
const DEFAULT_DESKTOP_VOICE_TYPE = /** @type {"male"} */ ("male");

function buildDesktopTokenRequest({ requestId, uid, channel }) {
  return {
    request_id: requestId,
    uid,
    channel_name: channel,
  };
}

function parseDesktopAgoraCredentials(responseData) {
  const credentials = responseData?.data || responseData || {};
  return {
    appId: credentials.appId || credentials.app_id,
    channel: credentials.channel_name,
    token: credentials.token,
    uid: credentials.uid,
  };
}

/**
 * @param {object} input
 * @param {string} input.channel
 * @param {number} input.userId
 * @param {string} input.greeting
 * @param {number} input.httpPort
 * @param {string} [input.graphName]
 * @param {string} [input.languageMode]
 * @param {"male" | "female"} [input.voiceType]
 * @returns {{
 *   channel: string,
 *   userId: number,
 *   graphName: string,
 *   language: string,
 *   voiceType: "male" | "female",
 *   properties: Record<string, unknown>
 * }}
 */
function buildDesktopAgentStartConfig({
  channel,
  userId,
  greeting,
  httpPort,
  graphName = DEFAULT_DESKTOP_GRAPH_NAME,
  languageMode = DEFAULT_LANGUAGE_MODE,
  voiceType = DEFAULT_DESKTOP_VOICE_TYPE,
}) {
  const languageOption = getLanguageModeOption(languageMode);

  return {
    channel,
    userId,
    graphName,
    language: languageOption.startLanguage,
    voiceType,
    properties: buildLanguageModeStartProperties({
      mode: languageOption.id,
      agentGreeting: greeting,
      httpControlPort: httpPort,
    }),
  };
}

module.exports = {
  buildDesktopAgentStartConfig,
  buildDesktopTokenRequest,
  parseDesktopAgoraCredentials,
};
