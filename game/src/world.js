// Skyline Courier — world building: terrain, sea, river, runways, rings,
// trees, houses and clouds. One clear job: build the visible world once
// from the fixed seed, and answer terrainHeightAt(x, z) for physics.
var SKY_WORLD = null;

// Height of the ground at (x, z), in metres. Sea level is 0.
function terrainHeightAt(x, z) {
  var half = SKY_CONFIG.worldSize / 2;
  var edge = Math.max(Math.abs(x), Math.abs(z));
  var n = fractalNoise2D(x * 0.0016 + 31.7, z * 0.0016 + 11.3, SKY_CONFIG.seed, 4);
  var ridge = fractalNoise2D(x * 0.004 + 7.1, z * 0.004 + 3.9, SKY_CONFIG.seed + 50, 3);
  var h = 6 + n * 55 + Math.pow(ridge, 2.2) * 95;
  // A mountain massif in the north-west corner.
  var dm = Math.hypot(x + 1300, z + 1150);
  h += 90 * Math.max(0, 1 - dm / 700);
  // A low bay in the south-east: water laps the shore there.
  var db = Math.hypot(x - 1250, z - 1050);
  h -= 26 * Math.max(0, 1 - db / 650);
  // Fade the rim down toward the sea so the map reads as islands.
  h -= 30 * smoothStep((edge - half * 0.55) / (half * 0.45));
  // Flatten the ground under each runway strip.
  for (var i = 0; i < SKY_RUNWAYS.length; i += 1) {
    var r = SKY_RUNWAYS[i];
    var dx = x - r.x, dz = z - r.z;
    var along = dx * Math.cos(r.heading * Math.PI / 180) + dz * Math.sin(r.heading * Math.PI / 180);
    var across = -dx * Math.sin(r.heading * Math.PI / 180) + dz * Math.cos(r.heading * Math.PI / 180);
    var dAlong = Math.max(0, Math.abs(along) - r.length / 2);
    var dAcross = Math.max(0, Math.abs(across) - r.width / 2 - 40);
    var d = Math.hypot(dAlong, dAcross);
    var w = 1 - smoothStep(Math.min(1, d / 160));
    h = h * (1 - w) + r.alt * w;
  }
  // Keep the ring course flyable: lower the ground near each ring so a
  // pilot holding ring altitude never meets a hill on the course line.
  for (var k = 0; k < SKY_RING_COURSE.length; k += 1) {
    var rp = SKY_RING_COURSE[k];
    var dr = Math.hypot(x - rp.x, z - rp.z);
    if (dr < 220) {
      var wr = 1 - smoothStep(dr / 220);
      var cap = rp.y - 30;
      h = h * (1 - wr) + Math.min(h, cap) * wr;
    }
  }
  return h;
}

// Colour of the ground at height h with slope s (0 flat, 1 steep).
function groundColourAt(h, slope) {
  var c = { r: 0.32, g: 0.55, b: 0.22 };
  if (h < 3) { c = { r: 0.85, g: 0.78, b: 0.55 }; }          // sand
  else if (h < 45) { c = { r: 0.30, g: 0.52, b: 0.20 }; }   // grass
  else if (h < 80) { c = { r: 0.36, g: 0.48, b: 0.24 }; }   // high meadow
  else if (h < 120) { c = { r: 0.45, g: 0.40, b: 0.34 }; }  // rock
  else { c = { r: 0.92, g: 0.93, b: 0.95 }; }               // snow
  if (slope > 0.55 && h < 120) { c = { r: 0.42, g: 0.38, b: 0.33 }; }
  var jitter = 0.92 + hashNoise2D(Math.round(h * 13), Math.round(slope * 977), 5) * 0.16;
  return { r: c.r * jitter, g: c.g * jitter, b: c.b * jitter };
}

function makeCanvasTexture(size, draw) {
  var canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  draw(canvas.getContext('2d'), size);
  var tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function buildTerrainMesh(scene) {
  var size = SKY_CONFIG.worldSize, seg = 128;
  var geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  var pos = geo.attributes.position;
  var colours = new Float32Array(pos.count * 3);
  for (var i = 0; i < pos.count; i += 1) {
    var x = pos.getX(i), z = pos.getZ(i);
    var h = terrainHeightAt(x, z);
    pos.setY(i, h);
    var hx = terrainHeightAt(x + 6, z) - terrainHeightAt(x - 6, z);
    var hz = terrainHeightAt(x, z + 6) - terrainHeightAt(x, z - 6);
    var slope = Math.min(1, Math.hypot(hx, hz) / 24);
    var col = groundColourAt(h, slope);
    colours[i * 3] = col.r; colours[i * 3 + 1] = col.g; colours[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  var mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = false;
  scene.add(mesh);
  return mesh;
}

function buildSeaAndRiver(scene) {
  var sea = new THREE.Mesh(
    new THREE.PlaneGeometry(SKY_CONFIG.worldSize * 1.6, SKY_CONFIG.worldSize * 1.6),
    new THREE.MeshLambertMaterial({ color: 0x1f6fb2, transparent: true, opacity: 0.88 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SKY_CONFIG.seaLevel + 0.6;
  scene.add(sea);
  // A winding river from the north-west hills to the south bay.
  var pts = [];
  for (var t = 0; t <= 1.0001; t += 0.05) {
    var x = -1400 + t * 2600 + Math.sin(t * 9) * 160;
    var z = -1200 + t * 2300;
    pts.push(new THREE.Vector3(x, 1.2, z));
  }
  var curve = new THREE.CatmullRomCurve3(pts);
  var river = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 64, 16, 6, false),
    new THREE.MeshLambertMaterial({ color: 0x2f8fd0 })
  );
  river.scale.y = 0.12;
  scene.add(river);
}

function buildRunwayStrip(scene, runway) {
  var group = new THREE.Group();
  var alt = runway.alt;
  var strip = new THREE.Mesh(
    new THREE.BoxGeometry(runway.length, 1.2, runway.width),
    new THREE.MeshLambertMaterial({ color: 0x2b2f36 })
  );
  strip.position.y = alt + 0.4;
  group.add(strip);
  // Centre-line dashes.
  var dashGeo = new THREE.BoxGeometry(14, 0.4, 2.2);
  var dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (var d = -runway.length / 2 + 20; d < runway.length / 2 - 10; d += 34) {
    var dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.set(d, alt + 1.2, 0);
    group.add(dash);
  }
  // Threshold bars at both ends.
  var barGeo = new THREE.BoxGeometry(3, 0.4, runway.width * 0.8);
  for (var e = -1; e <= 1; e += 2) {
    var bar = new THREE.Mesh(barGeo, dashMat);
    bar.position.set(e * (runway.length / 2 - 8), alt + 1.2, 0);
    group.add(bar);
  }
  // Windsock: pole + orange cone that points downwind.
  var pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 14, 6),
    new THREE.MeshLambertMaterial({ color: 0xdddddd })
  );
  pole.position.set(runway.length / 2 + 18, alt + 7, runway.width / 2 + 12);
  group.add(pole);
  var sock = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 7, 8),
    new THREE.MeshLambertMaterial({ color: 0xff6a00 })
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(runway.length / 2 + 22, alt + 13, runway.width / 2 + 12);
  group.add(sock);
  group.position.set(runway.x, 0, runway.z);
  group.rotation.y = -runway.heading * Math.PI / 180;
  scene.add(group);
  return group;
}

function buildRings(scene) {
  var rings = [];
  for (var i = 0; i < SKY_RING_COURSE.length; i += 1) {
    var p = SKY_RING_COURSE[i];
    var mat = new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.92 });
    var ring = new THREE.Mesh(new THREE.TorusGeometry(SKY_CONFIG.ringRadius, 1.6, 10, 40), mat);
    ring.position.set(p.x, p.y, p.z);
    // Face the ring along the course: its opening points at the pilot
    // flying in from the previous ring (or from Home Field for ring 1).
    var prev = i === 0 ? { x: 0, z: 0 } : SKY_RING_COURSE[i - 1];
    ring.rotation.y = Math.atan2(p.x - prev.x, p.z - prev.z);
    ring.userData.index = i;
    scene.add(ring);
    // A small beacon light under each ring so the course reads at a glance.
    var beacon = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffb02e })
    );
    beacon.position.set(p.x, p.y - SKY_CONFIG.ringRadius - 6, p.z);
    scene.add(beacon);
    rings.push(ring);
  }
  return rings;
}

function buildTreesAndHouses(scene) {
  var rand = makeSeededRandom(SKY_CONFIG.seed * 31 + 7);
  var trunkGeo = new THREE.CylinderGeometry(0.9, 1.3, 7, 6);
  var coneGeo = new THREE.ConeGeometry(5.5, 16, 7);
  var trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
  var leafMat = new THREE.MeshLambertMaterial({ color: 0x247a30 });
  var treeCount = 260;
  var trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  var crowns = new THREE.InstancedMesh(coneGeo, leafMat, treeCount);
  var dummy = new THREE.Object3D();
  var placed = 0, guard = 0;
  while (placed < treeCount && guard < 4000) {
    guard += 1;
    var x = (rand() - 0.5) * SKY_CONFIG.worldSize * 0.94;
    var z = (rand() - 0.5) * SKY_CONFIG.worldSize * 0.94;
    var h = terrainHeightAt(x, z);
    if (h < 4 || h > 70) continue;
    var nearStrip = false;
    for (var r = 0; r < SKY_RUNWAYS.length; r += 1) {
      if (Math.hypot(x - SKY_RUNWAYS[r].x, z - SKY_RUNWAYS[r].z) < 220) nearStrip = true;
    }
    if (nearStrip) continue;
    var s = 0.8 + rand() * 0.9;
    dummy.position.set(x, h + 3 * s, z);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = h + (7 + 8) * s;
    dummy.updateMatrix();
    crowns.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  trunks.count = placed; crowns.count = placed;
  scene.add(trunks); scene.add(crowns);
  // A little village of low-poly houses beside Home Field.
  var houseCount = 34;
  for (var i = 0; i < houseCount; i += 1) {
    var hx = 320 + (rand() - 0.5) * 420;
    var hz = 340 + (rand() - 0.5) * 300;
    var hh = terrainHeightAt(hx, hz);
    if (hh < 4) continue;
    var house = new THREE.Group();
    var wallColour = [0xf2e3c6, 0xe8b4a0, 0xcfe0f2, 0xf7f0dd][i % 4];
    var walls = new THREE.Mesh(
      new THREE.BoxGeometry(14, 8, 12),
      new THREE.MeshLambertMaterial({ color: wallColour })
    );
    walls.position.y = 4;
    house.add(walls);
    var roof = new THREE.Mesh(
      new THREE.ConeGeometry(11, 6, 4),
      new THREE.MeshLambertMaterial({ color: 0xb3402e })
    );
    roof.position.y = 11;
    roof.rotation.y = Math.PI / 4;
    house.add(roof);
    house.position.set(hx, hh, hz);
    house.rotation.y = rand() * Math.PI;
    scene.add(house);
  }
}

function buildClouds(scene) {
  var tex = makeCanvasTexture(128, function (ctx, s) {
    ctx.clearRect(0, 0, s, s);
    for (var i = 0; i < 9; i += 1) {
      var cx = 24 + Math.random() * 80, cy = 44 + Math.random() * 40, r = 18 + Math.random() * 22;
      var g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.85)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  });
  var rand = makeSeededRandom(SKY_CONFIG.seed * 7 + 3);
  var clouds = [];
  var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false });
  for (var i = 0; i < 26; i += 1) {
    var sprite = new THREE.Sprite(mat);
    var sc = 120 + rand() * 160;
    sprite.scale.set(sc, sc * 0.42, 1);
    sprite.position.set((rand() - 0.5) * 3200, 190 + rand() * 120, (rand() - 0.5) * 3200);
    sprite.userData.drift = 2 + rand() * 3;
    scene.add(sprite);
    clouds.push(sprite);
  }
  return clouds;
}

// Highlight ring `nextIndex` in bright amber, passed rings green, later ones dim.
function paintRings(rings, nextIndex) {
  for (var i = 0; i < rings.length; i += 1) {
    var mat = rings[i].material;
    if (i < nextIndex) { mat.color.setHex(0x37d67a); mat.opacity = 0.85; }
    else if (i === nextIndex) { mat.color.setHex(0xffb02e); mat.opacity = 1.0; }
    else { mat.color.setHex(0x8a97a8); mat.opacity = 0.55; }
  }
}

function buildWorld(scene) {
  buildTerrainMesh(scene);
  buildSeaAndRiver(scene);
  for (var i = 0; i < SKY_RUNWAYS.length; i += 1) buildRunwayStrip(scene, SKY_RUNWAYS[i]);
  var rings = buildRings(scene);
  buildTreesAndHouses(scene);
  var clouds = buildClouds(scene);
  SKY_WORLD = { rings: rings, clouds: clouds };
  return SKY_WORLD;
}
