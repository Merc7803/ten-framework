const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isPrimaryButtonDragging,
  shouldStartAvatarDrag,
} = require("../src/lib/avatar-pointer.js");

test("shouldStartAvatarDrag only starts dragging for the primary mouse button", () => {
  assert.equal(shouldStartAvatarDrag(0), true);
  assert.equal(shouldStartAvatarDrag(2), false);
});

test("isPrimaryButtonDragging detects an active left-button drag", () => {
  assert.equal(isPrimaryButtonDragging(1), true);
  assert.equal(isPrimaryButtonDragging(0), false);
  assert.equal(isPrimaryButtonDragging(2), false);
});
