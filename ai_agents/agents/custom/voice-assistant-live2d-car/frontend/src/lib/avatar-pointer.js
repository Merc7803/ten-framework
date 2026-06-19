function shouldStartAvatarDrag(button) {
  return button === 0;
}

function isPrimaryButtonDragging(buttons) {
  return (buttons & 1) === 1;
}

module.exports = {
  isPrimaryButtonDragging,
  shouldStartAvatarDrag,
};
