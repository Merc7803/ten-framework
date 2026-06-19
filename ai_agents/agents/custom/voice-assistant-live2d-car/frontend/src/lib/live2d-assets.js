const REMOTE_LIVE2D_MODELS_BASE_URL =
  "https://ten-framework-assets.s3.amazonaws.com/live2d-models";
const LOCAL_LIVE2D_MODELS_PROXY_BASE_URL = "/live2d-assets";

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || LOCAL_LIVE2D_MODELS_PROXY_BASE_URL).replace(/\/$/, "");
}

function resolveLive2DModelsBaseUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized === REMOTE_LIVE2D_MODELS_BASE_URL
    ? LOCAL_LIVE2D_MODELS_PROXY_BASE_URL
    : normalized;
}

module.exports = {
  LOCAL_LIVE2D_MODELS_PROXY_BASE_URL,
  REMOTE_LIVE2D_MODELS_BASE_URL,
  resolveLive2DModelsBaseUrl,
};
