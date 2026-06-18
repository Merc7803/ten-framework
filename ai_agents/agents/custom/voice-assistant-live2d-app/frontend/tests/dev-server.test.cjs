const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getCandidateDevServerUrls,
  normalizeServerUrl,
} = require("../electron/dev-server.cjs");

test("normalizeServerUrl trims whitespace and trailing slash", () => {
  assert.equal(
    normalizeServerUrl(" http://localhost:3001/ "),
    "http://localhost:3001"
  );
});

test("getCandidateDevServerUrls respects explicit desktop dev server URL", () => {
  assert.deepEqual(
    getCandidateDevServerUrls({
      DESKTOP_DEV_SERVER_URL: "http://localhost:3001/",
    }),
    ["http://localhost:3001"]
  );
});

test("getCandidateDevServerUrls checks common Next dev ports by default", () => {
  assert.deepEqual(getCandidateDevServerUrls({}), [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ]);
});
