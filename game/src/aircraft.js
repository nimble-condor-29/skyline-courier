// Skyline Courier — the courier aircraft, built from primitives.
// One clear job: build the plane mesh and pose it from the flight state.
var SKY_AIRCRAFT = null;

function buildAircraft(scene) {
  var plane = new THREE.Group();
  var paint = new THREE.MeshLambertMaterial({ color: 0xff7a1a });
  var cream = new THREE.MeshLambertMaterial({ color: 0xf7ead2 });
  var dark = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  var glass = new THREE.MeshLambertMaterial({ color: 0x9fd8ef, emissive: 0x224455 });

  // Fuselage: a tapered cylinder pointing +Z (the nose direction).
  var fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.75, 7.2, 12), paint);
  fuselage.rotation.x = Math.PI / 2;
  plane.add(fuselage);
  var nose = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.8, 12), cream);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 4.5;
  plane.add(nose);
  // Cabin hump with windows.
  var cabin = new THREE.Mesh(new THREE.SphereGeometry(1.25, 12, 10), glass);
  cabin.scale.set(0.95, 0.75, 1.7);
  cabin.position.set(0, 0.75, 0.9);
  plane.add(cabin);
  // High wing and tailplane.
  var wing = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.28, 2.4), cream);
  wing.position.set(0, 0.95, 0.4);
  plane.add(wing);
  var tailWing = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), cream);
  tailWing.position.set(0, 0.35, -3.4);
  plane.add(tailWing);
  var fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.2, 1.8), paint);
  fin.position.set(0, 1.1, -3.5);
  plane.add(fin);
  // Struts, landing gear and a cargo pod under the belly.
  var strutGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.2, 6);
  for (var s = -1; s <= 1; s += 2) {
    var strut = new THREE.Mesh(strutGeo, dark);
    strut.position.set(s * 2.6, 0.1, 0.4);
    strut.rotation.z = s * 0.5;
    plane.add(strut);
  }
  var wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (var w = -1; w <= 1; w += 2) {
    var wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(w * 1.5, -1.25, 1.2);
    plane.add(wheel);
  }
  var pod = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 3.2), dark);
  pod.position.set(0, -1.05, -0.6);
  plane.add(pod);
  // Propeller: two blades plus a translucent spin disc.
  var prop = new THREE.Group();
  var bladeGeo = new THREE.BoxGeometry(0.35, 4.6, 0.12);
  var blade = new THREE.Mesh(bladeGeo, dark);
  prop.add(blade);
  var blade2 = new THREE.Mesh(bladeGeo, dark);
  blade2.rotation.z = Math.PI / 2;
  prop.add(blade2);
  var spinner = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.0, 10), cream);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.4;
  prop.add(spinner);
  var disc = new THREE.Mesh(
    new THREE.CircleGeometry(2.3, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.10, side: THREE.DoubleSide })
  );
  prop.add(disc);
  prop.position.z = 5.5;
  plane.add(prop);
  // Navigation lights: red port, green starboard, white tail.
  function navLight(color, x, y, z) {
    var light = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 8, 6),
      new THREE.MeshBasicMaterial({ color: color })
    );
    light.position.set(x, y, z);
    plane.add(light);
    return light;
  }
  var lightPort = navLight(0xff2222, -6.7, 0.95, 0.4);
  var lightStarboard = navLight(0x22ff44, 6.7, 0.95, 0.4);
  var lightTail = navLight(0xffffff, 0, 2.1, -3.9);
  scene.add(plane);
  SKY_AIRCRAFT = { group: plane, prop: prop, lights: [lightPort, lightStarboard, lightTail] };
  return SKY_AIRCRAFT;
}

// Pose the plane from flight state: heading (rad, 0 = +X), pitch, roll.
function poseAircraft(state, timeSeconds) {
  var plane = SKY_AIRCRAFT.group;
  plane.position.set(state.x, state.y, state.z);
  plane.rotation.order = 'YXZ';
  plane.rotation.y = -state.heading;
  plane.rotation.x = -state.pitch;
  plane.rotation.z = state.roll;
  SKY_AIRCRAFT.prop.rotation.z = timeSeconds * (6 + state.throttle * 34);
  // Blink the tail light once a second.
  var blink = (timeSeconds % 1) < 0.12;
  SKY_AIRCRAFT.lights[2].visible = blink;
}
