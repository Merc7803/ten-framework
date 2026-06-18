const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  buildElectronLaunch,
  buildElectronRuntimeEnv,
  resolveElectronExecutable,
} = require("../scripts/run-electron.cjs");

test("resolveElectronExecutable uses the electron package executable path in Node", () => {
  assert.equal(
    resolveElectronExecutable("C:\\tools\\electron.exe"),
    "C:\\tools\\electron.exe"
  );
});

test("buildElectronLaunch starts the app with Electron instead of Node", () => {
  const launch = buildElectronLaunch({
    electronModule: "C:\\tools\\electron.exe",
    projectRoot: "D:\\app\\frontend",
  });

  assert.equal(launch.command, "C:\\tools\\electron.exe");
  assert.deepEqual(launch.args, [
    path.join("D:\\app\\frontend", "electron", "main.cjs"),
  ]);
});

test("buildElectronRuntimeEnv removes ELECTRON_RUN_AS_NODE so Electron APIs are available", () => {
  const env = buildElectronRuntimeEnv({
    ELECTRON_RUN_AS_NODE: "1",
    PATH: "C:\\tools",
  });

  assert.equal(env.ELECTRON_RUN_AS_NODE, undefined);
  assert.equal(env.PATH, "C:\\tools");
});
