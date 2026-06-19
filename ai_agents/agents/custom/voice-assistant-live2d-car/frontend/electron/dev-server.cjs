const http = require("node:http");
const https = require("node:https");

const DEFAULT_DEV_SERVER_PORTS = ["3000", "3001", "3002"];

function normalizeServerUrl(url) {
  return String(url || "").trim().replace(/\/$/, "");
}

function getCandidateDevServerUrls(env = process.env) {
  const explicitUrl = normalizeServerUrl(env.DESKTOP_DEV_SERVER_URL);
  if (explicitUrl) {
    return [explicitUrl];
  }

  const ports = String(
    env.DESKTOP_DEV_SERVER_PORTS || DEFAULT_DEV_SERVER_PORTS.join(",")
  )
    .split(",")
    .map((port) => port.trim())
    .filter(Boolean);

  return ports.map((port) => `http://localhost:${port}`);
}

function canReachUrl(baseUrl, path = "/desktop/avatar", timeoutMs = 800) {
  return new Promise((resolve) => {
    const targetUrl = new URL(path, `${baseUrl}/`);
    const client = targetUrl.protocol === "https:" ? https : http;
    const request = client.request(
      targetUrl,
      { method: "GET", timeout: timeoutMs },
      (response) => {
        response.resume();
        resolve(Boolean(response.statusCode));
      }
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
    request.end();
  });
}

async function resolveDesktopDevServerUrl(options = {}) {
  const env = options.env || process.env;
  const candidates = options.candidates || getCandidateDevServerUrls(env);
  const timeoutMs = options.timeoutMs || 800;

  for (const candidate of candidates) {
    if (await canReachUrl(candidate, "/desktop/avatar", timeoutMs)) {
      return candidate;
    }
  }

  return candidates[0];
}

module.exports = {
  DEFAULT_DEV_SERVER_PORTS,
  canReachUrl,
  getCandidateDevServerUrls,
  normalizeServerUrl,
  resolveDesktopDevServerUrl,
};
