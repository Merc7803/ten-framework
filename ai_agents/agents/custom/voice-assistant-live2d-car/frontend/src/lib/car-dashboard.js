function createDefaultCarState() {
  return {
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
  };
}

function clampNumber(value, min, max) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return min;
  }
  return Math.min(max, Math.max(min, numericValue));
}

function cloneCarState(state) {
  return {
    climate: { ...state.climate },
    media: { ...state.media },
    navigation: { ...state.navigation },
    lights: { ...state.lights },
    locks: { ...state.locks },
    windows: { ...state.windows },
  };
}

function applyCarCommand(state, command) {
  if (!command || command.action !== "set") {
    return state;
  }

  switch (command.target) {
    case "climate.ac":
      state.climate.ac = Boolean(command.value);
      break;
    case "climate.temperature":
      state.climate.temperature = clampNumber(command.value, 16, 30);
      break;
    case "climate.fan":
      state.climate.fan = clampNumber(command.value, 0, 5);
      break;
    case "media.volume":
      state.media.volume = clampNumber(command.value, 0, 100);
      break;
    case "media.playback":
      state.media.playing = Boolean(command.value);
      break;
    case "navigation.destination":
      state.navigation.destination = String(command.value || "");
      break;
    case "lights.headlights":
      state.lights.headlights = Boolean(command.value);
      break;
    case "lights.cabin":
      state.lights.cabin = Boolean(command.value);
      break;
    case "locks.doors":
      state.locks.doorsLocked = Boolean(command.value);
      break;
    case "windows.driver":
      state.windows.driver = clampNumber(command.value, 0, 100);
      break;
    case "windows.passenger":
      state.windows.passenger = clampNumber(command.value, 0, 100);
      break;
    default:
      break;
  }

  return state;
}

function applyCarCommands(state, commands) {
  const nextState = cloneCarState(state);
  if (!Array.isArray(commands)) {
    return nextState;
  }

  for (const command of commands) {
    applyCarCommand(nextState, command);
  }

  return nextState;
}

module.exports = {
  applyCarCommands,
  createDefaultCarState,
};
