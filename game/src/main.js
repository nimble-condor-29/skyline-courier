// Skyline Courier — bootstrap and game loop.
// One clear job: start the world, run the frame loop, and switch screens.
var SKY_GAME = {
  screen: 'title', // title | fly | paused | complete | crashed
  state: null,
  mission: SKY_MISSIONS[0],
  bestScore: 0,
  timeSeconds: 0,
  lastRingIndex: 0,
  shot: null
};

function missionById(id) {
  for (var i = 0; i < SKY_MISSIONS.length; i += 1) {
    if (SKY_MISSIONS[i].id === id) return SKY_MISSIONS[i];
  }
  return SKY_MISSIONS[0];
}

function startMission(missionId) {
  SKY_GAME.mission = missionById(missionId);
  SKY_GAME.state = createFlightState(missionId);
  SKY_GAME.lastRingIndex = 0;
  paintRings(SKY_WORLD.rings, 0);
  hideOverlay();
  SKY_GAME.screen = 'fly';
  startAudio();
  updateEngineSound(SKY_GAME.state);
}

function restartMission() {
  startMission(SKY_GAME.mission.id);
}

function backToTitle() {
  SKY_GAME.state = createFlightState(SKY_GAME.mission.id);
  SKY_GAME.screen = 'title';
  showTitleScreen(SKY_GAME.bestScore);
}

function endFlight(completed) {
  var state = SKY_GAME.state;
  if (state.score > SKY_GAME.bestScore) SKY_GAME.bestScore = state.score;
  SKY_GAME.screen = completed ? 'complete' : 'crashed';
  showEndScreen(state, SKY_GAME.mission, completed);
  document.getElementById('hud').classList.remove('hidden');
  updateHud(state, SKY_GAME.mission);
}

function handleFlightEvents(events) {
  var state = SKY_GAME.state;
  if (events & EVENT_RING) playRingChime();
  if (events & EVENT_PICKUP) playRingChime();
  if (events & EVENT_GATE) playRingChime();
  if (events & EVENT_DELIVERED) playRingChime();
  if (events & EVENT_LANDED) playLandingThud();
  if (state.ringIndex !== SKY_GAME.lastRingIndex) {
    SKY_GAME.lastRingIndex = state.ringIndex;
    paintRings(SKY_WORLD.rings, state.ringIndex);
  }
  if (events & EVENT_CRASHED) {
    playWarningBeep();
    endFlight(false);
  } else if (events & EVENT_COMPLETE) {
    playRingChime();
    endFlight(true);
  }
}

function togglePause() {
  if (SKY_GAME.screen === 'fly') {
    SKY_GAME.screen = 'paused';
    var overlay = document.getElementById('overlay');
    overlay.innerHTML = '<div class="end-wrap"><h1 class="end-title">PAUSED</h1>' +
      '<div class="end-reason">Press P to keep flying, or R to restart.</div></div>';
    overlay.className = 'overlay show';
  } else if (SKY_GAME.screen === 'paused') {
    hideOverlay();
    SKY_GAME.screen = 'fly';
  }
}

function initGlobalKeys() {
  window.addEventListener('keydown', function (e) {
    startAudio();
    if (e.code === 'KeyM') { toggleMute(); return; }
    if (e.code === 'KeyP') { togglePause(); return; }
    if (e.code === 'KeyR') {
      if (SKY_GAME.screen === 'fly' || SKY_GAME.screen === 'complete' || SKY_GAME.screen === 'crashed' || SKY_GAME.screen === 'paused') restartMission();
      return;
    }
    if (SKY_GAME.screen === 'title' || SKY_GAME.screen === 'complete' || SKY_GAME.screen === 'crashed') {
      if (e.code === 'Digit1') startMission('rings');
      if (e.code === 'Digit2') startMission('islands');
      if (e.code === 'Digit3') startMission('courier');
    }
  });
  document.getElementById('overlay').addEventListener('click', function (e) {
    startAudio();
    var card = e.target.closest ? e.target.closest('.mission-card') : null;
    if (card) { startMission(card.getAttribute('data-mission')); return; }
    if (SKY_GAME.screen === 'complete' || SKY_GAME.screen === 'crashed') backToTitle();
  });
  document.getElementById('game').addEventListener('mousedown', function () { startAudio(); });
}

function gameLoop(nowMs) {
  requestAnimationFrame(gameLoop);
  var dt = Math.min(0.05, (nowMs - (gameLoop.last || nowMs)) / 1000 || 0.016);
  gameLoop.last = nowMs;
  SKY_GAME.timeSeconds += dt;
  var state = SKY_GAME.state;
  if (!state) return;
  if (SKY_GAME.shot) {
    // Screenshot staging: freeze the frame exactly as staged — no physics,
    // no drift — so the capture is the same every run.
    renderFrame(state, SKY_GAME.timeSeconds, dt);
    return;
  }
  if (SKY_GAME.screen === 'title') {
    // A gentle demo flight behind the title screen.
    state.heading += 0.045 * dt;
    state.x += Math.cos(state.heading) * state.speed * dt;
    state.z += Math.sin(state.heading) * state.speed * dt;
    state.y = terrainHeightAt(state.x, state.z) + 48;
    state.roll = 0.12;
    renderFrame(state, SKY_GAME.timeSeconds, dt);
    return;
  }
  if (SKY_GAME.screen === 'fly') {
    var input = readControls();
    var events = stepFlight(state, input, dt);
    handleFlightEvents(events);
    updateHud(state, SKY_GAME.mission);
    updateEngineSound(state);
  }
  if (SKY_GAME.screen === 'complete' || SKY_GAME.screen === 'crashed' || SKY_GAME.screen === 'paused') {
    updateEngineSound(state);
  }
  renderFrame(state, SKY_GAME.timeSeconds, dt);
}

function bootSkylineCourier() {
  initRenderer();
  buildWorld(SKY_RENDER.scene);
  buildAircraft(SKY_RENDER.scene);
  buildHud();
  initInput();
  initAudio();
  initGlobalKeys();
  SKY_GAME.state = createFlightState('rings');
  SKY_GAME.shot = parseShotParam();
  if (SKY_GAME.shot) {
    stageShot(SKY_GAME.shot.shot, SKY_GAME);
    if (SKY_GAME.shot.shot !== 'start') {
      updateHud(SKY_GAME.state, SKY_GAME.mission);
    }
  } else {
    SKY_GAME.state.speed = 34;
    SKY_GAME.state.throttle = 0.6;
    SKY_GAME.state.heading = Math.PI * 0.32;
    showTitleScreen(0);
  }
  requestAnimationFrame(gameLoop);
}

window.addEventListener('load', bootSkylineCourier);
