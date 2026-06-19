const path = require("node:path");
const { spawn } = require("node:child_process");

function resolveElectronExecutable(electronModule = require("electron")) {
  if (typeof electronModule === "string" && electronModule.trim()) {
    return electronModule;
  }

  if (electronModule && typeof electronModule === "object" && electronModule.app) {
    return process.execPath;
  }

  throw new Error("Unable to resolve Electron executable");
}

function buildElectronLaunch({
  electronModule = require("electron"),
  projectRoot = path.join(__dirname, ".."),
} = {}) {
  return {
    command: resolveElectronExecutable(electronModule),
    args: [path.join(projectRoot, "electron", "main.cjs")],
  };
}

function run() {
  const launch = buildElectronLaunch();
  const child = spawn(launch.command, launch.args, {
    env: process.env,
    stdio: "inherit",
    windowsHide: false,
  });

  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

if (require.main === module) {
  run();
}

module.exports = {
  buildElectronLaunch,
  resolveElectronExecutable,
};
