// Skyline Courier — game configuration: tuning, missions, world layout.
// One clear job: every number the rest of the game reads lives here.
var SKY_CONFIG = {
  seed: 7,
  worldSize: 3600,
  seaLevel: 0,
  maxSpeed: 58,          // m/s at full throttle (about 113 kt)
  cruiseSpeed: 42,
  stallSpeed: 17,        // below this the nose drops
  minLandingSpeed: 34,   // touchdown faster than this on a strip is a hard landing
  maxLandingSpeed: 46,
  accel: 9,
  drag: 0.35,
  climbRate: 1.0,
  turnRate: 0.85,        // heading change per second at full bank
  pitchRate: 0.5,
  rollRate: 1.6,
  fuelCapacity: 100,
  fuelBurn: 0.55,        // per second at full throttle
  fuelBurnIdle: 0.12,
  damageCrash: 100,
  ringRadius: 16,
  ringCount: 8,
  ringRushTime: 150,
  courierTime: 420,
  islandHopTime: 360,
  cameraDistance: 16,
  cameraHeight: 5.2
};

// Mission definitions: id, name, tagline, goal text, time limit, colour.
var SKY_MISSIONS = [
  {
    id: 'rings', name: 'Ring Rush', short: 'RING RUSH',
    tagline: 'Thread 8 glowing rings in order — beat the 150 s clock.',
    goal: 'Fly through every ring in order before the clock runs out.',
    timeLimit: 150, colour: '#ffb02e'
  },
  {
    id: 'islands', name: 'Island Hop', short: 'ISLAND HOP',
    tagline: 'Land on all three island strips, in order. Touch down gentle.',
    goal: 'Land on each strip in order. Landing refuels and repairs.',
    timeLimit: 360, colour: '#37d67a'
  },
  {
    id: 'courier', name: 'Courier Run', short: 'COURIER RUN',
    tagline: 'Pick up the parcel, thread the gate, deliver, and come home.',
    goal: 'Pick up at Home, fly the gate, deliver at North Strip, return home.',
    timeLimit: 420, colour: '#4fc3ff'
  }
];

// Runway definitions: position, heading (deg, 0 = +X east), altitude, name.
var SKY_RUNWAYS = [
  { id: 'home',  name: 'Home Field',  x: 0,    z: 0,    heading: 90, alt: 8,  length: 280, width: 28 },
  { id: 'north', name: 'North Strip', x: 950,  z: -650, heading: 40, alt: 14, length: 240, width: 24 },
  { id: 'west',  name: 'West Strip',  x: -850, z: 750,  heading: 130, alt: 18, length: 240, width: 24 }
];

// Ring course: fixed positions (x, altitude, z) forming a scenic loop.
var SKY_RING_COURSE = [
  { x: 260,  y: 95,  z: 120 },
  { x: 520,  y: 120, z: -80 },
  { x: 700,  y: 150, z: -420 },
  { x: 520,  y: 130, z: -700 },
  { x: 120,  y: 100, z: -620 },
  { x: -260, y: 85,  z: -420 },
  { x: -420, y: 110, z: -60 },
  { x: -180, y: 90,  z: 220 }
];
