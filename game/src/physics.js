// Skyline Courier — arcade flight physics and mission rules.
// One clear job: step the flight state forward and report what happened
// (ring passed, landing, crash, fuel out, mission complete).
var EVENT_NONE = 0;
var EVENT_RING = 1;
var EVENT_LANDED = 2;
var EVENT_CRASHED = 4;
var EVENT_COMPLETE = 8;
var EVENT_PICKUP = 16;
var EVENT_GATE = 32;
var EVENT_DELIVERED = 64;

// Fresh flight state for the chosen mission, sitting on Home Field.
function createFlightState(missionId) {
  var home = SKY_RUNWAYS[0];
  return {
    missionId: missionId,
    x: home.x, y: home.alt + 2.2, z: home.z,
    heading: home.heading * Math.PI / 180,
    pitch: 0, roll: 0,
    speed: 0, throttle: 0, flaps: false,
    fuel: SKY_CONFIG.fuelCapacity,
    damage: 0,
    score: 0,
    elapsed: 0,
    ringIndex: 0,
    landingsDone: 0,
    courierStage: 0, // 0 pickup, 1 gate, 2 deliver, 3 return home
    landed: false,
    onGround: true,
    verticalSpeed: 0,
    message: '',
    messageTimer: 0
  };
}

function clampNumber(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

function distance3D(ax, ay, az, bx, by, bz) {
  return Math.hypot(ax - bx, ay - by, az - bz);
}

// The next objective for the HUD arrow: position + label.
function nextObjective(state) {
  if (state.missionId === 'rings') {
    if (state.ringIndex >= SKY_RING_COURSE.length) return null;
    var r = SKY_RING_COURSE[state.ringIndex];
    return { x: r.x, y: r.y, z: r.z, label: 'RING ' + (state.ringIndex + 1) + '/' + SKY_RING_COURSE.length };
  }
  if (state.missionId === 'islands') {
    var order = [SKY_RUNWAYS[1], SKY_RUNWAYS[2], SKY_RUNWAYS[0]];
    if (state.landingsDone >= order.length) return null;
    var rw = order[state.landingsDone];
    return { x: rw.x, y: rw.alt + 6, z: rw.z, label: 'LAND: ' + rw.name.toUpperCase() };
  }
  // Courier Run stages.
  if (state.courierStage === 0) return { x: SKY_RUNWAYS[0].x, y: SKY_RUNWAYS[0].alt + 6, z: SKY_RUNWAYS[0].z, label: 'PICK UP — HOME' };
  if (state.courierStage === 1) {
    var g = SKY_RING_COURSE[3];
    return { x: g.x, y: g.y, z: g.z, label: 'FLY THE GATE' };
  }
  if (state.courierStage === 2) return { x: SKY_RUNWAYS[1].x, y: SKY_RUNWAYS[1].alt + 6, z: SKY_RUNWAYS[1].z, label: 'DELIVER — NORTH' };
  return { x: SKY_RUNWAYS[0].x, y: SKY_RUNWAYS[0].alt + 6, z: SKY_RUNWAYS[0].z, label: 'RETURN HOME' };
}

function isOverRunway(state, runway) {
  var dx = state.x - runway.x, dz = state.z - runway.z;
  var along = dx * Math.cos(runway.heading * Math.PI / 180) + dz * Math.sin(runway.heading * Math.PI / 180);
  var across = -dx * Math.sin(runway.heading * Math.PI / 180) + dz * Math.cos(runway.heading * Math.PI / 180);
  return Math.abs(along) < runway.length / 2 && Math.abs(across) < runway.width / 2 + 6;
}

function stepFlight(state, input, dt) {
  var events = EVENT_NONE;
  state.elapsed += dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;

  // Throttle and flaps.
  state.throttle = clampNumber(state.throttle + input.throttleDelta * dt, 0, 1);
  if (input.flapsToggle) state.flaps = !state.flaps;

  // Speed: throttle pulls toward its target, drag and flaps bleed speed.
  var target = state.throttle * SKY_CONFIG.maxSpeed;
  var accel = SKY_CONFIG.accel - SKY_CONFIG.drag * state.speed * 0.12;
  if (state.speed < target) state.speed = Math.min(target, state.speed + accel * dt);
  else {
    // Drag bleeds speed; descending trades altitude for speed, so a
    // power-off glide can still reach a strip (fuel-out landings work).
    var diveGain = Math.max(0, -Math.sin(state.pitch)) * 6;
    state.speed = Math.max(target, state.speed - (1.4 + (state.flaps ? 2.0 : 0)) * dt + diveGain * dt);
  }
  var stallSpeed = state.flaps ? SKY_CONFIG.stallSpeed - 3 : SKY_CONFIG.stallSpeed;

  // Roll and pitch from the stick; the nose drops below stall speed.
  var rollTarget = input.roll * 0.85;
  state.roll += (rollTarget - state.roll) * Math.min(1, SKY_CONFIG.rollRate * dt * 2.2);
  var pitchTarget = input.pitch * 0.42;
  if (state.speed < stallSpeed && !state.onGround) pitchTarget = -0.38; // stall: nose drops
  state.pitch += (pitchTarget - state.pitch) * Math.min(1, SKY_CONFIG.pitchRate * dt * 2.4);

  // Turn: banked flight turns the heading; a level turn is gentle.
  state.heading += -state.roll * SKY_CONFIG.turnRate * (0.45 + 0.55 * state.speed / SKY_CONFIG.maxSpeed) * dt;
  state.heading = (state.heading + Math.PI * 2) % (Math.PI * 2);

  // Move: forward speed plus climb from pitch, minus sink when stalled.
  var climb = Math.sin(state.pitch) * state.speed * SKY_CONFIG.climbRate;
  if (state.speed < stallSpeed && !state.onGround) climb -= (stallSpeed - state.speed) * 0.9;
  state.verticalSpeed = climb;
  state.x += Math.cos(state.heading) * Math.cos(state.pitch) * state.speed * dt;
  state.z += Math.sin(state.heading) * Math.cos(state.pitch) * state.speed * dt;
  state.y += climb * dt;

  // Keep the plane inside the map; the sea breeze pushes it back.
  var half = SKY_CONFIG.worldSize / 2 - 60;
  state.x = clampNumber(state.x, -half, half);
  state.z = clampNumber(state.z, -half, half);
  if (state.y > 420) { state.y = 420; state.pitch = Math.min(state.pitch, 0); }

  // Fuel: throttle burns it; empty means gliding on whatever speed is left.
  var burn = SKY_CONFIG.fuelBurnIdle + (SKY_CONFIG.fuelBurn - SKY_CONFIG.fuelBurnIdle) * state.throttle;
  state.fuel = Math.max(0, state.fuel - burn * dt);
  if (state.fuel <= 0 && state.throttle > 0) {
    state.throttle = 0;
    state.message = 'FUEL EMPTY — GLIDE TO A STRIP';
    state.messageTimer = 3;
  }

  // Ground contact.
  var ground = terrainHeightAt(state.x, state.z);
  var gearHeight = 2.2;
  if (state.y <= ground + gearHeight) {
    state.y = ground + gearHeight;
    var runway = null;
    for (var i = 0; i < SKY_RUNWAYS.length; i += 1) {
      if (isOverRunway(state, SKY_RUNWAYS[i])) runway = SKY_RUNWAYS[i];
    }
    var sink = -state.verticalSpeed;
    if (runway && state.speed <= SKY_CONFIG.maxLandingSpeed && sink < 9 && Math.abs(state.pitch) < 0.3) {
      // Touchdown: roll out on the strip. Braking only when the throttle
      // is low — with power on, the plane keeps rolling toward takeoff.
      if (!state.onGround) {
        state.onGround = true;
        state.speed = Math.min(state.speed, SKY_CONFIG.maxLandingSpeed);
        events |= EVENT_LANDED;
        state.message = 'TOUCHDOWN — ' + runway.name.toUpperCase();
        state.messageTimer = 3;
      }
      state.roll *= 0.5;
      if (state.throttle < 0.5) state.speed = Math.max(0, state.speed - 14 * dt);
      if (state.speed < 2) state.pitch = 0;
    } else if (state.onGround && runway) {
      if (state.throttle < 0.5) state.speed = Math.max(0, state.speed - 14 * dt);
    } else {
      // Off-strip or too fast / too steep: scrape or crash. A slow,
      // shallow contact is a rough-field scrape, not a crash.
      if ((sink > 7 && state.speed > 25) || sink > 12 || state.speed > 40) {
        state.damage = 100;
        events |= EVENT_CRASHED;
        state.message = 'CRASHED — TERRAIN IMPACT';
      } else if (state.speed > 5) {
        // Moving over rough ground: a scrape that costs damage and speed.
        state.damage = Math.min(100, state.damage + 12 * dt);
        state.speed = Math.max(0, state.speed - 30 * dt);
        state.message = 'ROUGH GROUND — DAMAGE RISING';
        state.messageTimer = 2;
        if (state.damage >= 100) { events |= EVENT_CRASHED; state.message = 'CRASHED — AIRFRAME LOST'; }
      } else {
        // Crawling or stopped on rough ground: the plane digs in and
        // stops instead of grinding itself to pieces at walking pace.
        state.speed = Math.max(0, state.speed - 10 * dt);
      }
      state.onGround = true;
    }
  } else {
    state.onGround = false;
  }
  if (state.onGround && state.speed > 0.5 && state.throttle < 0.55) {
    state.speed = Math.max(0, state.speed - 6 * dt);
  }
  // Take off again once fast enough on a strip.
  if (state.onGround && state.speed > 26 && state.pitch > 0.05 && state.throttle > 0.6) {
    state.onGround = false;
  }

  // Mission progress.
  if (state.missionId === 'rings' && !state.onGround) {
    if (state.ringIndex < SKY_RING_COURSE.length) {
      var ring = SKY_RING_COURSE[state.ringIndex];
      if (distance3D(state.x, state.y, state.z, ring.x, ring.y, ring.z) < SKY_CONFIG.ringRadius + 10) {
        state.ringIndex += 1;
        state.score += 100 + Math.round(state.speed);
        events |= EVENT_RING;
        state.message = 'RING ' + state.ringIndex + ' / ' + SKY_RING_COURSE.length;
        state.messageTimer = 2;
        if (state.ringIndex >= SKY_RING_COURSE.length) {
          events |= EVENT_COMPLETE;
          state.score += Math.max(0, Math.round((SKY_CONFIG.ringRushTime - state.elapsed) * 5));
        }
      }
    }
  }
  if (state.missionId === 'islands' && (events & EVENT_LANDED)) {
    var order = [SKY_RUNWAYS[1], SKY_RUNWAYS[2], SKY_RUNWAYS[0]];
    var want = order[state.landingsDone];
    if (want && isOverRunway(state, want)) {
      state.landingsDone += 1;
      state.score += 250;
      state.fuel = SKY_CONFIG.fuelCapacity;
      state.damage = 0;
      state.message = 'LANDED ' + state.landingsDone + '/3 — REFUELLED & REPAIRED';
      state.messageTimer = 3;
      if (state.landingsDone >= 3) events |= EVENT_COMPLETE;
    } else {
      state.message = 'WRONG STRIP — FLY TO ' + (want ? want.name.toUpperCase() : '');
      state.messageTimer = 3;
    }
  }
  if (state.missionId === 'courier') {
    if (state.courierStage === 0 && state.onGround && isOverRunway(state, SKY_RUNWAYS[0]) && state.speed < 2) {
      state.courierStage = 1; state.score += 100;
      events |= EVENT_PICKUP;
      state.message = 'PARCEL ABOARD — FLY THE GATE';
      state.messageTimer = 3;
    } else if (state.courierStage === 1 && !state.onGround) {
      var gate = SKY_RING_COURSE[3];
      if (distance3D(state.x, state.y, state.z, gate.x, gate.y, gate.z) < SKY_CONFIG.ringRadius + 10) {
        state.courierStage = 2; state.score += 150;
        events |= EVENT_GATE;
        state.message = 'GATE FLOWN — DELIVER AT NORTH STRIP';
        state.messageTimer = 3;
      }
    } else if (state.courierStage === 2 && (events & EVENT_LANDED) && isOverRunway(state, SKY_RUNWAYS[1])) {
      state.courierStage = 3; state.score += 250;
      state.fuel = SKY_CONFIG.fuelCapacity;
      events |= EVENT_DELIVERED;
      state.message = 'DELIVERED — NOW FLY HOME';
      state.messageTimer = 3;
    } else if (state.courierStage === 3 && (events & EVENT_LANDED) && isOverRunway(state, SKY_RUNWAYS[0])) {
      events |= EVENT_COMPLETE;
      state.score += 300 + Math.max(0, Math.round((SKY_CONFIG.courierTime - state.elapsed) * 2));
    }
  }

  // Time limits.
  var limit = state.missionId === 'rings' ? SKY_CONFIG.ringRushTime
    : state.missionId === 'islands' ? SKY_CONFIG.islandHopTime : SKY_CONFIG.courierTime;
  if (state.elapsed > limit && !(events & EVENT_COMPLETE)) {
    state.damage = 100;
    events |= EVENT_CRASHED;
    state.message = 'OUT OF TIME';
  }
  if (state.damage >= 100 && !(events & EVENT_CRASHED)) events |= EVENT_CRASHED;
  return events;
}

// Score rating for the end screen: S / A / B / C from time and damage.
function missionRating(state, completed) {
  if (!completed) return '—';
  var limit = state.missionId === 'rings' ? SKY_CONFIG.ringRushTime
    : state.missionId === 'islands' ? SKY_CONFIG.islandHopTime : SKY_CONFIG.courierTime;
  var ratio = state.elapsed / limit;
  if (ratio < 0.55 && state.damage < 20) return 'S';
  if (ratio < 0.75 && state.damage < 40) return 'A';
  if (ratio < 0.95) return 'B';
  return 'C';
}
