// Skyline Courier — Three.js renderer, sky, lights and chase camera.
// One clear job: own the scene/camera/renderer and draw each frame.
var SKY_RENDER = null;

function makeSkyTexture() {
  return makeCanvasTexture(512, function (ctx, s) {
    var g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#2f7fd0');
    g.addColorStop(0.45, '#7db8e8');
    g.addColorStop(0.62, '#cfe8f7');
    g.addColorStop(0.66, '#f7e8c8');
    g.addColorStop(1, '#e8d9b0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // A soft sun glow near the top.
    var sun = ctx.createRadialGradient(s * 0.72, s * 0.2, 4, s * 0.72, s * 0.2, 120);
    sun.addColorStop(0, 'rgba(255,244,200,0.95)');
    sun.addColorStop(1, 'rgba(255,244,200,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, s, s);
  });
}

function initRenderer() {
  var canvas = document.getElementById('game');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  var scene = new THREE.Scene();
  scene.background = makeSkyTexture();
  scene.fog = new THREE.Fog(0xcfe0ee, 700, 3400);
  var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 6000);
  camera.position.set(-30, 40, -30);

  var sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
  sun.position.set(900, 700, 400);
  scene.add(sun);
  var hemi = new THREE.HemisphereLight(0xbfd9ff, 0x4a6b3a, 0.85);
  scene.add(hemi);

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  SKY_RENDER = { renderer: renderer, scene: scene, camera: camera, camPos: new THREE.Vector3(-30, 40, -30), camLook: new THREE.Vector3() };
  return SKY_RENDER;
}

// Smooth chase camera: behind and above the plane, looking ahead of it.
function updateChaseCamera(state, dt) {
  var cam = SKY_RENDER.camera;
  var dist = SKY_CONFIG.cameraDistance;
  var backX = state.x - Math.cos(state.heading) * dist;
  var backZ = state.z - Math.sin(state.heading) * dist;
  var targetPos = new THREE.Vector3(backX, state.y + SKY_CONFIG.cameraHeight + state.speed * 0.02, backZ);
  if (SKY_GAME && SKY_GAME.shot) {
    // Screenshot staging: snap the camera at once, never mid-lerp, so the
    // captured frame does not depend on how many frames ran before it.
    SKY_RENDER.camPos.copy(targetPos);
  } else {
    var k = 1 - Math.pow(0.0015, dt); // frame-rate independent smoothing
    SKY_RENDER.camPos.lerp(targetPos, k);
  }
  cam.position.copy(SKY_RENDER.camPos);
  var lookX = state.x + Math.cos(state.heading) * 26;
  var lookZ = state.z + Math.sin(state.heading) * 26;
  SKY_RENDER.camLook.set(lookX, state.y + 1.5 + state.pitch * 12, lookZ);
  cam.lookAt(SKY_RENDER.camLook);
  // Roll the camera a little with the plane so banks feel real.
  cam.rotateZ(state.roll * 0.35);
}

function renderFrame(state, timeSeconds, dt) {
  poseAircraft(state, timeSeconds);
  updateChaseCamera(state, dt);
  // Pulse the next ring and drift the clouds.
  if (SKY_WORLD) {
    for (var i = 0; i < SKY_WORLD.rings.length; i += 1) {
      var ring = SKY_WORLD.rings[i];
      if (i === state.ringIndex) {
        var s = 1 + Math.sin(timeSeconds * 3) * 0.05;
        ring.scale.set(s, s, s);
      } else {
        ring.scale.set(1, 1, 1);
      }
    }
    for (var c = 0; c < SKY_WORLD.clouds.length; c += 1) {
      var cloud = SKY_WORLD.clouds[c];
      cloud.position.x += cloud.userData.drift * dt;
      if (cloud.position.x > 1750) cloud.position.x = -1750;
    }
  }
  SKY_RENDER.renderer.render(SKY_RENDER.scene, SKY_RENDER.camera);
}
