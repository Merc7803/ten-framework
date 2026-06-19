const DEFAULT_REMOTE_MODELS_BASE_URL =
  "https://ten-framework-assets.s3.amazonaws.com/live2d-models";

/**
 * @typedef {import("../components/Live2DCharacter").MouthConfig} MouthConfig
 * @typedef {import("../components/Live2DCharacter").ExpressionConfig} ExpressionConfig
 * @typedef {import("../components/Live2DCharacter").MotionConfig} MotionConfig
 *
 * @typedef {object} DesktopCharacter
 * @property {string} id
 * @property {string} name
 * @property {string} path
 * @property {"male" | "female"} voiceType
 * @property {MouthConfig} mouthConfig
 * @property {ExpressionConfig[]} expressions
 * @property {MotionConfig[]} motions
 * @property {string} agentGreeting
 */

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || DEFAULT_REMOTE_MODELS_BASE_URL).replace(/\/$/, "");
}

function buildRemoteModelAssetPath(baseUrl, folder, fileName) {
  return `${normalizeBaseUrl(baseUrl)}/${folder}/${fileName}`;
}

/**
 * @param {string} [baseUrl]
 * @returns {DesktopCharacter}
 */
function getKevinDesktopCharacter(baseUrl = DEFAULT_REMOTE_MODELS_BASE_URL) {
  return {
    id: "kevin",
    name: "Kevin the Marmot",
    path: buildRemoteModelAssetPath(baseUrl, "marmot", "L065.model3.json"),
    voiceType: "male",
    mouthConfig: {
      type: "open",
      openId: "ParamMouthOpenY",
      min: 0,
      max: 1,
    },
    expressions: [
      { name: "neutral", label: "Relaxed", default: true },
      { name: "greet", label: "Big Smile", onSpeaking: true },
    ],
    motions: [
      { name: "Idle", group: "Idle", index: 0, autoPlay: true, priority: 1 },
      { name: "Tap", group: "TapBody", index: 0, onSpeakingStart: true },
    ],
    agentGreeting:
      "My name is Kevin the Marmot! Ready to hustle, snack, or plan something fun together?",
  };
}

module.exports = {
  DEFAULT_REMOTE_MODELS_BASE_URL,
  buildRemoteModelAssetPath,
  getKevinDesktopCharacter,
};
