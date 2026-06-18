const assert = require("node:assert/strict");
const test = require("node:test");

const { getKevinDesktopCharacter } = require("../src/lib/desktop-character.js");

test("getKevinDesktopCharacter returns the Kevin the Marmot desktop model config", () => {
  const character = getKevinDesktopCharacter(
    "https://ten-framework-assets.s3.amazonaws.com/live2d-models"
  );

  assert.equal(character.id, "kevin");
  assert.equal(character.name, "Kevin the Marmot");
  assert.equal(
    character.path,
    "https://ten-framework-assets.s3.amazonaws.com/live2d-models/marmot/L065.model3.json"
  );
  assert.equal(character.voiceType, "male");
  assert.equal(character.mouthConfig.openId, "ParamMouthOpenY");
});
