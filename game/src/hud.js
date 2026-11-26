// Skyline Courier — HUD and screens (DOM overlay).
// One clear job: show the instruments and the title / end screens.
var SKY_HUD = null;

function buildHud() {
  var hud = document.getElementById('hud');
  hud.innerHTML =
    '<div class="hud-top">' +
      '<div class="hud-box"><div class="hud-label">SPD</div><div class="hud-big" id="hud-spd">0</div><div class="hud-unit">KT</div></div>' +
      '<div class="hud-box"><div class="hud-label">ALT</div><div class="hud-big" id="hud-alt">0</div><div class="hud-unit">FT</div></div>' +
      '<div class="hud-box"><div class="hud-label">HDG</div><div class="hud-big" id="hud-hdg">090</div><div class="hud-unit">DEG</div></div>' +
      '<div class="hud-box"><div class="hud-label">THR</div><div class="hud-big" id="hud-thr">0%</div><div class="hud-unit" id="hud-flaps">FLAPS UP</div></div>' +
    '</div>' +
    '<div class="hud-compass"><div class="compass-strip" id="hud-compass"></div><div class="compass-needle">▲</div></div>' +
    '<div class="hud-left">' +
      '<div class="horizon"><div class="horizon-inner" id="hud-horizon"><div class="horizon-sky"></div><div class="horizon-ground"></div></div><div class="horizon-fixed">— ✈ —</div></div>' +
      '<div class="gauge"><div class="gauge-label">FUEL <span id="hud-fuel-num">100</span></div><div class="gauge-bar"><div class="gauge-fill fuel" id="hud-fuel"></div></div></div>' +
      '<div class="gauge"><div class="gauge-label">DMG <span id="hud-dmg-num">0</span></div><div class="gauge-bar"><div class="gauge-fill dmg" id="hud-dmg"></div></div></div>' +
    '</div>' +
    '<div class="hud-right">' +
      '<div class="objective"><div class="obj-label">NEXT</div><div class="obj-name" id="hud-obj">—</div>' +
      '<div class="obj-row"><span class="obj-arrow" id="hud-arrow">➤</span><span id="hud-dist">0 m</span></div></div>' +
      '<div class="mission-line" id="hud-mission">RING RUSH</div>' +
      '<div class="mission-line dim" id="hud-rings">RINGS 0/8</div>' +
      '<div class="mission-line dim" id="hud-score">SCORE 0</div>' +
      '<div class="timer" id="hud-timer">2:30</div>' +
    '</div>' +
    '<div class="hud-message" id="hud-message"></div>' +
    '<div class="hud-help">↑↓ pitch · ←→ bank · SHIFT throttle up · CTRL throttle down · F flaps · P pause · R restart · M mute</div>';
  // Compass ticks: N E S W every 30 degrees.
  var strip = document.getElementById('hud-compass');
  var html = '';
  for (var d = 0; d < 360; d += 10) {
    var label = d === 0 ? 'N' : d === 90 ? 'E' : d === 180 ? 'S' : d === 270 ? 'W' : (d % 30 === 0 ? String(d / 10) : '·');
    html += '<span class="tick" data-deg="' + d + '">' + label + '</span>';
  }
  strip.innerHTML = html + html; // doubled so the strip can scroll seamlessly
  SKY_HUD = {
    spd: document.getElementById('hud-spd'),
    alt: document.getElementById('hud-alt'),
    hdg: document.getElementById('hud-hdg'),
    thr: document.getElementById('hud-thr'),
    flaps: document.getElementById('hud-flaps'),
    compass: strip,
    horizon: document.getElementById('hud-horizon'),
    fuel: document.getElementById('hud-fuel'),
    fuelNum: document.getElementById('hud-fuel-num'),
    dmg: document.getElementById('hud-dmg'),
    dmgNum: document.getElementById('hud-dmg-num'),
    obj: document.getElementById('hud-obj'),
    arrow: document.getElementById('hud-arrow'),
    dist: document.getElementById('hud-dist'),
    mission: document.getElementById('hud-mission'),
    rings: document.getElementById('hud-rings'),
    score: document.getElementById('hud-score'),
    timer: document.getElementById('hud-timer'),
    message: document.getElementById('hud-message')
  };
  return SKY_HUD;
}

function formatClock(seconds) {
  var s = Math.max(0, Math.ceil(seconds));
  var m = Math.floor(s / 60);
  var r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}

// Bearing from the plane to a target, in degrees (0 = +X east, 90 = +Z south).
function bearingTo(state, target) {
  var b = Math.atan2(target.z - state.z, target.x - state.x) * 180 / Math.PI;
  return (b + 360) % 360;
}

function updateHud(state, mission) {
  if (!SKY_HUD) return;
  var knots = Math.round(state.speed * 1.944);
  SKY_HUD.spd.textContent = knots;
  SKY_HUD.alt.textContent = Math.round(state.y * 3.281);
  var hdgDeg = Math.round((state.heading * 180 / Math.PI + 360) % 360);
  SKY_HUD.hdg.textContent = ('00' + hdgDeg).slice(-3);
  SKY_HUD.thr.textContent = Math.round(state.throttle * 100) + '%';
  SKY_HUD.flaps.textContent = state.flaps ? 'FLAPS DOWN' : 'FLAPS UP';
  // Compass strip scrolls so the current heading stays centred.
  var tickWidth = 34;
  SKY_HUD.compass.style.transform = 'translateX(' + (-(hdgDeg * tickWidth / 10) + 170) + 'px)';
  // Artificial horizon: roll rotates, pitch shifts.
  SKY_HUD.horizon.style.transform =
    'translateY(' + clampNumber(state.pitch * 120, -60, 60) + 'px) rotate(' + (-state.roll * 57.3) + 'deg)';
  SKY_HUD.fuel.style.width = state.fuel + '%';
  SKY_HUD.fuelNum.textContent = Math.round(state.fuel);
  SKY_HUD.dmg.style.width = state.damage + '%';
  SKY_HUD.dmgNum.textContent = Math.round(state.damage);
  SKY_HUD.fuel.classList.toggle('low', state.fuel < 25);
  var obj = nextObjective(state);
  if (obj) {
    SKY_HUD.obj.textContent = obj.label;
    var dist = Math.round(Math.hypot(obj.x - state.x, obj.y - state.y, obj.z - state.z));
    SKY_HUD.dist.textContent = dist + ' m';
    var rel = (bearingTo(state, obj) - hdgDeg + 360) % 360;
    SKY_HUD.arrow.style.transform = 'rotate(' + (rel - 90) + 'deg)';
  } else {
    SKY_HUD.obj.textContent = 'COMPLETE';
    SKY_HUD.dist.textContent = '—';
  }
  SKY_HUD.mission.textContent = mission.short;
  SKY_HUD.mission.style.color = mission.colour;
  SKY_HUD.rings.textContent = state.missionId === 'rings'
    ? 'RINGS ' + state.ringIndex + '/' + SKY_RING_COURSE.length
    : state.missionId === 'islands'
      ? 'LANDINGS ' + state.landingsDone + '/3'
      : 'STAGE ' + (state.courierStage + 1) + '/4';
  SKY_HUD.score.textContent = 'SCORE ' + state.score;
  var remaining = mission.timeLimit - state.elapsed;
  SKY_HUD.timer.textContent = formatClock(remaining);
  SKY_HUD.timer.classList.toggle('urgent', remaining < 30);
  SKY_HUD.message.textContent = state.messageTimer > 0 ? state.message : '';
}

function showTitleScreen(bestScore) {
  var overlay = document.getElementById('overlay');
  var cards = '';
  for (var i = 0; i < SKY_MISSIONS.length; i += 1) {
    var m = SKY_MISSIONS[i];
    cards += '<div class="mission-card" data-mission="' + m.id + '" style="--mc:' + m.colour + '">' +
      '<div class="card-key">' + (i + 1) + '</div>' +
      '<div class="card-name">' + m.name + '</div>' +
      '<div class="card-tag">' + m.tagline + '</div>' +
      '<div class="card-time">⏱ ' + formatClock(m.timeLimit) + ' · fuel &amp; damage matter</div></div>';
  }
  overlay.innerHTML =
    '<div class="title-wrap">' +
    '<div class="title-kicker">A 3D BUSH-PILOT COURIER GAME</div>' +
    '<h1 class="title-main">SKYLINE<br>COURIER</h1>' +
    '<div class="title-sub">Three island strips. One battered little plane. Fly the rings, hop the islands, run the mail — and mind your fuel.</div>' +
    '<div class="mission-cards">' + cards + '</div>' +
    '<div class="title-controls">↑↓ pitch &nbsp;·&nbsp; ←→ bank &nbsp;·&nbsp; SHIFT / CTRL throttle &nbsp;·&nbsp; F flaps &nbsp;·&nbsp; drag mouse to steer &nbsp;·&nbsp; P pause &nbsp;·&nbsp; R restart &nbsp;·&nbsp; M mute</div>' +
    (bestScore > 0 ? '<div class="title-best">BEST SCORE THIS SESSION: ' + bestScore + '</div>' : '') +
    '<div class="title-hint">Click a mission — or press 1, 2 or 3</div>' +
    '</div>';
  overlay.className = 'overlay show';
  document.getElementById('hud').classList.add('hidden');
}

function showEndScreen(state, mission, completed) {
  var overlay = document.getElementById('overlay');
  var rating = missionRating(state, completed);
  var title = completed ? 'MISSION COMPLETE' : 'FLIGHT OVER';
  var reason = completed ? mission.goal : (state.message || 'The sortie ended here.');
  overlay.innerHTML =
    '<div class="end-wrap">' +
    '<div class="end-kicker">' + mission.name.toUpperCase() + '</div>' +
    '<h1 class="end-title" style="color:' + (completed ? '#37d67a' : '#ff5a4e') + '">' + title + '</h1>' +
    '<div class="end-reason">' + reason + '</div>' +
    '<div class="end-stats">' +
    '<div class="end-stat"><div class="end-num">' + state.score + '</div><div class="end-lab">SCORE</div></div>' +
    '<div class="end-stat"><div class="end-num">' + formatClock(state.elapsed) + '</div><div class="end-lab">TIME</div></div>' +
    '<div class="end-stat"><div class="end-num">' + rating + '</div><div class="end-lab">RATING</div></div>' +
    '<div class="end-stat"><div class="end-num">' + Math.round(state.fuel) + '%</div><div class="end-lab">FUEL LEFT</div></div>' +
    '</div>' +
    '<div class="end-hint">Press R or click to fly again — 1 Ring Rush · 2 Island Hop · 3 Courier Run</div>' +
    '</div>';
  overlay.className = 'overlay show';
}

function hideOverlay() {
  var overlay = document.getElementById('overlay');
  overlay.className = 'overlay';
  overlay.innerHTML = '';
  document.getElementById('hud').classList.remove('hidden');
}
