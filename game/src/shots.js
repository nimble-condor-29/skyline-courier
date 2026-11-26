// Skyline Courier — screenshot staging (?shot= presets).
// One clear job: place the plane, camera and HUD for each named photo so
// every screenshot is a real render of the live game, deterministically.
var SHOT_PRESETS = ['start', 'flight', 'approach', 'complete'];

function parseShotParam() {
  var params = new URLSearchParams(window.location.search);
  var shot = params.get('shot') || '';
  if (SHOT_PRESETS.indexOf(shot) < 0) return null;
  var seed = parseInt(params.get('seed') || '1', 10);
  return { shot: shot, seed: isNaN(seed) ? 1 : seed };
}

// Put the game into the named staged scene and return the screen to show.
function stageShot(shotName, game) {
  var state = game.state;
  if (shotName === 'start') {
    // Title screen over a slow orbit view of Home Field.
    state.x = 120; state.y = 55; state.z = -160;
    state.heading = Math.PI * 0.32; state.pitch = -0.06; state.roll = 0.12;
    state.speed = 34; state.throttle = 0.62; state.onGround = false;
    game.screen = 'title';
    showTitleScreen(0);
    return;
  }
  if (shotName === 'flight') {
    // Mid-air chase view: lined up through the ring course, HUD lit.
    state.missionId = 'rings';
    game.mission = missionById('rings');
    state.ringIndex = 0;
    state.x = 60; state.y = terrainHeightAt(60, 260) + 62; state.z = 260;
    state.heading = Math.atan2(120 - 260, 260 - 60);
    state.pitch = 0.02; state.roll = -0.08;
    state.speed = 44; state.throttle = 0.72; state.onGround = false;
    state.fuel = 78; state.damage = 6; state.score = 214; state.elapsed = 38;
    paintRings(SKY_WORLD.rings, state.ringIndex);
    hideOverlay();
    game.screen = 'fly';
    return;
  }
  if (shotName === 'approach') {
    // On final to Home Field: strip ahead, gear down, flaps down.
    state.missionId = 'islands';
    game.mission = missionById('islands');
    state.landingsDone = 2;
    state.x = 10; state.y = terrainHeightAt(10, 500) + 40; state.z = 500;
    state.heading = Math.PI * 1.5; // flying -Z toward the strip at origin
    state.pitch = -0.07; state.roll = 0.02;
    state.speed = 38; state.throttle = 0.45; state.flaps = true; state.onGround = false;
    state.fuel = 52; state.damage = 12; state.score = 486; state.elapsed = 132;
    hideOverlay();
    game.screen = 'fly';
    return;
  }
  // complete: mission-complete overlay over a parked plane on Home Field.
  state.missionId = 'rings';
  state.ringIndex = SKY_RING_COURSE.length;
  state.x = 0; state.y = SKY_RUNWAYS[0].alt + 2.2; state.z = 0;
  state.heading = SKY_RUNWAYS[0].heading * Math.PI / 180;
  state.speed = 0; state.throttle = 0; state.onGround = true;
  state.fuel = 41; state.damage = 8; state.score = 1240; state.elapsed = 118;
  paintRings(SKY_WORLD.rings, state.ringIndex);
  showEndScreen(state, SKY_MISSIONS[0], true);
  document.getElementById('hud').classList.remove('hidden');
  game.screen = 'complete';
}
