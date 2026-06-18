const assert = require("node:assert/strict");
const test = require("node:test");

const {
  LOCAL_LIVE2D_MODELS_PROXY_BASE_URL,
  REMOTE_LIVE2D_MODELS_BASE_URL,
  resolveLive2DModelsBaseUrl,
} = require("../src/lib/live2d-assets.js");
const {
  createLive2DAssetResponse,
} = require("../src/lib/live2d-asset-proxy.js");
const {
  collectLive2DModelFiles,
} = require("../scripts/download-kevin-model.cjs");

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

test("createLive2DAssetResponse returns 502 instead of throwing when remote fetch times out", async () => {
  const response = await createLive2DAssetResponse(
    ["marmot", "L065.8192", "texture_00.png"],
    {
      readLocalAsset: async () => null,
      fetchRemoteAsset: async () => {
        throw new Error("Connect Timeout Error");
      },
      logError: () => {},
    }
  );

  assert.equal(response.status, 502);
  assert.match(await response.text(), /Live2D asset unavailable/);
});

test("createLive2DAssetResponse aborts stalled remote fetches", async () => {
  const startedAt = Date.now();
  let sawSignal = false;
  let sawAbort = false;
  const response = await createLive2DAssetResponse(
    ["marmot", "L065.8192", "texture_00.png"],
    {
      readLocalAsset: async () => null,
      fetchRemoteAsset: async (_url, options) =>
        new Promise((_resolve, reject) => {
          sawSignal = Boolean(options.signal);
          options.signal.addEventListener("abort", () => {
            sawAbort = true;
            reject(new Error("aborted"));
          });
        }),
      logError: () => {},
      remoteFetchTimeoutMs: 10,
    }
  );

  assert.equal(response.status, 502);
  assert.equal(sawSignal, true);
  assert.equal(sawAbort, true);
  assert.ok(Date.now() - startedAt < 500);
});

test("createLive2DAssetResponse serves local assets before remote fetch", async () => {
  let remoteFetchCalled = false;
  const response = await createLive2DAssetResponse(
    ["marmot", "L065.model3.json"],
    {
      readLocalAsset: async () => Buffer.from('{"Version":3}'),
      fetchRemoteAsset: async () => {
        remoteFetchCalled = true;
        return new Response("remote");
      },
    }
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"Version":3}');
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(remoteFetchCalled, false);
});

test("collectLive2DModelFiles extracts all Kevin model dependencies from model3 json", () => {
  const model = {
    FileReferences: {
      Moc: "L065.moc3",
      Textures: ["L065.8192/texture_00.png"],
      Physics: "L065.physics3.json",
      Expressions: [{ Name: "angry", File: "1.exp3.json" }],
      Motions: {
        Idle: [{ File: "motions/idle.motion3.json" }],
        Tap: [{ File: "motions/tap.motion3.json" }],
      },
    },
  };

  assert.deepEqual(collectLive2DModelFiles(model), [
    "1.exp3.json",
    "L065.8192/texture_00.png",
    "L065.moc3",
    "L065.model3.json",
    "L065.physics3.json",
    "motions/idle.motion3.json",
    "motions/tap.motion3.json",
  ]);
});
