// Skyline Courier — seeded random numbers and deterministic value noise.
// One clear job: every random choice in the world comes from a fixed seed,
// so the same seed always builds the same islands, trees and clouds.
function makeSeededRandom(seed) {
  var state = seed >>> 0;
  function nextRandom() {
    state = (state + 0x6D2B79F5) >>> 0;
    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return nextRandom;
}

// Deterministic 2D hash: returns a stable pseudo-random value in [0, 1)
// for integer lattice point (ix, iz) under the given seed.
function hashNoise2D(ix, iz, seed) {
  var h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function smoothStep(t) {
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  return t * t * (3 - 2 * t);
}

// Smooth value noise in [0, 1): bilinear interpolation of lattice hashes.
function valueNoise2D(x, z, seed) {
  var ix = Math.floor(x), iz = Math.floor(z);
  var fx = x - ix, fz = z - iz;
  var a = hashNoise2D(ix, iz, seed);
  var b = hashNoise2D(ix + 1, iz, seed);
  var c = hashNoise2D(ix, iz + 1, seed);
  var d = hashNoise2D(ix + 1, iz + 1, seed);
  var u = smoothStep(fx), v = smoothStep(fz);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

// Fractal (multi-octave) noise in roughly [0, 1).
function fractalNoise2D(x, z, seed, octaves) {
  var total = 0, amp = 0.5, freq = 1, norm = 0;
  for (var i = 0; i < octaves; i += 1) {
    total += amp * valueNoise2D(x * freq, z * freq, seed + i * 101);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return total / norm;
}
