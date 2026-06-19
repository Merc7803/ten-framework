const assert = require("node:assert/strict");
const test = require("node:test");

const {
  applyCarCommands,
  createDefaultCarState,
} = require("../src/lib/car-dashboard.js");

test("createDefaultCarState starts the demo cockpit in a safe idle state", () => {
  assert.deepEqual(createDefaultCarState(), {
    climate: {
      ac: false,
      temperature: 24,
      fan: 1,
    },
    media: {
      volume: 35,
      playing: false,
    },
    navigation: {
      destination: "",
    },
    lights: {
      headlights: false,
      cabin: false,
    },
    locks: {
      doorsLocked: true,
    },
    windows: {
      driver: 0,
      passenger: 0,
    },
  });
});

test("applyCarCommands updates climate controls from assistant command events", () => {
  const nextState = applyCarCommands(createDefaultCarState(), [
    { target: "climate.ac", action: "set", value: true },
    { target: "climate.temperature", action: "set", value: 21 },
    { target: "climate.fan", action: "set", value: 4 },
  ]);

  assert.equal(nextState.climate.ac, true);
  assert.equal(nextState.climate.temperature, 21);
  assert.equal(nextState.climate.fan, 4);
});

test("applyCarCommands updates lock, lights, media, navigation, and windows", () => {
  const nextState = applyCarCommands(createDefaultCarState(), [
    { target: "locks.doors", action: "set", value: false },
    { target: "lights.headlights", action: "set", value: true },
    { target: "lights.cabin", action: "set", value: true },
    { target: "media.volume", action: "set", value: 70 },
    { target: "media.playback", action: "set", value: true },
    { target: "navigation.destination", action: "set", value: "Ho Guom" },
    { target: "windows.driver", action: "set", value: 60 },
    { target: "windows.passenger", action: "set", value: 40 },
  ]);

  assert.equal(nextState.locks.doorsLocked, false);
  assert.equal(nextState.lights.headlights, true);
  assert.equal(nextState.lights.cabin, true);
  assert.equal(nextState.media.volume, 70);
  assert.equal(nextState.media.playing, true);
  assert.equal(nextState.navigation.destination, "Ho Guom");
  assert.equal(nextState.windows.driver, 60);
  assert.equal(nextState.windows.passenger, 40);
});

test("applyCarCommands ignores unsupported targets and clamps numeric values", () => {
  const nextState = applyCarCommands(createDefaultCarState(), [
    { target: "climate.temperature", action: "set", value: 99 },
    { target: "media.volume", action: "set", value: -20 },
    { target: "windows.driver", action: "set", value: 150 },
    { target: "engine.start", action: "set", value: true },
  ]);

  assert.equal(nextState.climate.temperature, 30);
  assert.equal(nextState.media.volume, 0);
  assert.equal(nextState.windows.driver, 100);
  assert.equal(nextState.climate.ac, false);
});
