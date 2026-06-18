const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  buildElectronLaunch,
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
