// Skyline Courier — procedural sound: engine hum and event beeps.
// One clear job: all audio is generated in code with WebAudio; no files.
var SKY_AUDIO = { ctx: null, engineOsc: null, engineGain: null, muted: false, started: false };

function initAudio() {
  SKY_AUDIO.ctx = null;
  SKY_AUDIO.started = false;
}

function startAudio() {
  if (SKY_AUDIO.started) return;
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    var ctx = new Ctx();
    var osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    var gain = ctx.createGain();
    gain.gain.value = 0.0;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    SKY_AUDIO.ctx = ctx;
    SKY_AUDIO.engineOsc = osc;
    SKY_AUDIO.engineGain = gain;
    SKY_AUDIO.started = true;
  } catch (err) {
    SKY_AUDIO.started = false;
  }
}

// Engine pitch and volume follow throttle and speed; silent when muted.
function updateEngineSound(state) {
  if (!SKY_AUDIO.started || !SKY_AUDIO.ctx) return;
  if (SKY_AUDIO.muted) {
    SKY_AUDIO.engineGain.gain.value = 0;
    return;
  }
  var target = 0.015 + state.throttle * 0.05 + (state.onGround ? 0 : 0.008);
  SKY_AUDIO.engineGain.gain.setTargetAtTime(target, SKY_AUDIO.ctx.currentTime, 0.1);
  SKY_AUDIO.engineOsc.frequency.setTargetAtTime(48 + state.throttle * 70 + state.speed * 0.35, SKY_AUDIO.ctx.currentTime, 0.1);
}

// A short beep: frequency in Hz, duration in seconds, volume 0..1.
function playBeep(freq, duration, volume) {
  if (!SKY_AUDIO.started || !SKY_AUDIO.ctx || SKY_AUDIO.muted) return;
  try {
    var ctx = SKY_AUDIO.ctx;
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) { /* sound is optional */ }
}

function playRingChime() { playBeep(880, 0.18, 0.14); setTimeout(function () { playBeep(1320, 0.25, 0.12); }, 90); }
function playWarningBeep() { playBeep(220, 0.3, 0.12); }
function playLandingThud() { playBeep(90, 0.25, 0.18); }

function toggleMute() {
  SKY_AUDIO.muted = !SKY_AUDIO.muted;
  return SKY_AUDIO.muted;
}
