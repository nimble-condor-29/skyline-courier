// Skyline Courier — keyboard and mouse input.
// One clear job: turn keys and mouse drags into a per-frame control input.
var SKY_INPUT = {
  keys: {},
  mouseDown: false,
  mouseX: 0, mouseY: 0,
  dragPitch: 0, dragRoll: 0,
  flapsPressed: false
};

function initInput() {
  window.addEventListener('keydown', function (e) {
    SKY_INPUT.keys[e.code] = true;
    if (e.code === 'KeyF' && !e.repeat) SKY_INPUT.flapsPressed = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { SKY_INPUT.keys[e.code] = false; });
  window.addEventListener('mousedown', function (e) {
    SKY_INPUT.mouseDown = true;
    SKY_INPUT.mouseX = e.clientX; SKY_INPUT.mouseY = e.clientY;
  });
  window.addEventListener('mouseup', function () { SKY_INPUT.mouseDown = false; SKY_INPUT.dragPitch = 0; SKY_INPUT.dragRoll = 0; });
  window.addEventListener('mousemove', function (e) {
    if (!SKY_INPUT.mouseDown) return;
    SKY_INPUT.dragRoll = clampNumber((e.clientX - SKY_INPUT.mouseX) / 220, -1, 1);
    SKY_INPUT.dragPitch = clampNumber((SKY_INPUT.mouseY - e.clientY) / 220, -1, 1);
  });
  window.addEventListener('blur', function () { SKY_INPUT.keys = {}; SKY_INPUT.mouseDown = false; });
}

function keyDown(code) { return !!SKY_INPUT.keys[code]; }

// Build this frame's control input from keys + mouse drag.
function readControls() {
  var pitch = 0, roll = 0, throttleDelta = 0;
  if (keyDown('ArrowUp') || keyDown('KeyW')) pitch += 1;
  if (keyDown('ArrowDown') || keyDown('KeyS')) pitch -= 1;
  if (keyDown('ArrowLeft') || keyDown('KeyA')) roll -= 1;
  if (keyDown('ArrowRight') || keyDown('KeyD')) roll += 1;
  if (keyDown('ShiftLeft') || keyDown('ShiftRight')) throttleDelta += 0.55;
  if (keyDown('ControlLeft') || keyDown('ControlRight')) throttleDelta -= 0.55;
  if (SKY_INPUT.mouseDown) {
    pitch += SKY_INPUT.dragPitch * 0.8;
    roll += SKY_INPUT.dragRoll * 0.8;
  }
  var flapsToggle = SKY_INPUT.flapsPressed;
  SKY_INPUT.flapsPressed = false;
  return {
    pitch: clampNumber(pitch, -1, 1),
    roll: clampNumber(roll, -1, 1),
    throttleDelta: throttleDelta,
    flapsToggle: flapsToggle
  };
}
