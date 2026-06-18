const fs = require("node:fs/promises");
const path = require("node:path");

const { REMOTE_LIVE2D_MODELS_BASE_URL } = require("./live2d-assets.js");

const LOCAL_MODELS_ROOT = path.join(process.cwd(), "public", "models");
const DEFAULT_REMOTE_FETCH_TIMEOUT_MS = 8000;

function sanitizeAssetPath(assetPath) {
  return assetPath.filter((segment) => segment && segment !== "." && segment !== "..");
}

function buildRemoteAssetUrl(assetPath) {
  const safePath = sanitizeAssetPath(assetPath).map(encodeURIComponent).join("/");
  return `${REMOTE_LIVE2D_MODELS_BASE_URL}/${safePath}`;
}

function getContentType(assetPath) {
  const fileName = assetPath[assetPath.length - 1] || "";

  if (fileName.endsWith(".json")) {
    return "application/json";
  }
  if (fileName.endsWith(".png")) {
    return "image/png";
  }
  if (fileName.endsWith(".moc3")) {
    return "application/octet-stream";
  }

  return "application/octet-stream";
}

function buildAssetHeaders(contentType) {
  const headers = new Headers();
  headers.set("cache-control", "public, max-age=3600");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  return headers;
}

async function readLocalAsset(assetPath, root = LOCAL_MODELS_ROOT) {
  const safePath = sanitizeAssetPath(assetPath);
  const resolvedRoot = path.resolve(root);
  const resolvedAssetPath = path.resolve(path.join(resolvedRoot, ...safePath));

  if (
    resolvedAssetPath !== resolvedRoot &&
    !resolvedAssetPath.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    return null;
  }

  try {
    return await fs.readFile(resolvedAssetPath);
  } catch (_error) {
    return null;
  }
}

function createTimeoutPromise(timeoutMs, abortController) {
  let timeoutId;
  const promise = new Promise((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      abortController.abort();
      reject(new Error(`Live2D asset fetch timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  return {
    promise,
    cancel: () => clearTimeout(timeoutId),
  };
}

async function createLive2DAssetResponse(assetPath, dependencies = {}) {
  const safePath = sanitizeAssetPath(assetPath);
  const readAsset = dependencies.readLocalAsset || readLocalAsset;
  const fetchAsset = dependencies.fetchRemoteAsset || fetch;
  const logError = dependencies.logError || console.error;
  const remoteFetchTimeoutMs =
    dependencies.remoteFetchTimeoutMs || DEFAULT_REMOTE_FETCH_TIMEOUT_MS;
  const contentType = getContentType(safePath);
  const localAsset = await readAsset(safePath);

  if (localAsset) {
    return new Response(localAsset, {
      status: 200,
      headers: buildAssetHeaders(contentType),
    });
  }

  let response;
  const abortController = new AbortController();
  const remoteFetchPromise = fetchAsset(buildRemoteAssetUrl(safePath), {
    cache: "force-cache",
    signal: abortController.signal,
  });
  const timeout = createTimeoutPromise(remoteFetchTimeoutMs, abortController);

  try {
    response = await Promise.race([remoteFetchPromise, timeout.promise]);
  } catch (error) {
    logError("Live2D asset remote fetch failed", {
      assetPath: safePath.join("/"),
      error,
    });
    return new Response(`Live2D asset unavailable: ${safePath.join("/")}`, {
      status: 502,
    });
  } finally {
    timeout.cancel();
  }

  if (!response.ok) {
    return new Response(`Live2D asset not found: ${safePath.join("/")}`, {
      status: response.status,
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: buildAssetHeaders(response.headers.get("content-type") || contentType),
  });
}

module.exports = {
  buildRemoteAssetUrl,
  createLive2DAssetResponse,
  getContentType,
  readLocalAsset,
  sanitizeAssetPath,
};
