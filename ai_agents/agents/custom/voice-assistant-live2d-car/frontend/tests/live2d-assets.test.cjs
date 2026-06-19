const assert = require("node:assert/strict");
const test = require("node:test");

const {
  LOCAL_LIVE2D_MODELS_PROXY_BASE_URL,
  REMOTE_LIVE2D_MODELS_BASE_URL,
  resolveLive2DModelsBaseUrl,
} = require("../src/lib/live2d-assets.js");

test("resolveLive2DModelsBaseUrl maps the default remote S3 URL to the local proxy", () => {
  assert.equal(
    resolveLive2DModelsBaseUrl(REMOTE_LIVE2D_MODELS_BASE_URL),
    LOCAL_LIVE2D_MODELS_PROXY_BASE_URL
  );
});

test("resolveLive2DModelsBaseUrl keeps custom model hosts unchanged", () => {
  assert.equal(
    resolveLive2DModelsBaseUrl("http://localhost:3000/models/"),
    "http://localhost:3000/models"
  );
});
