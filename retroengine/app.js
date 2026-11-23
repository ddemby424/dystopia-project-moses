/* =====================================================================
   RetroEngine v2.0 — app.js
   Browser 3D FPS game maker (Three.js r128).
   Sections:  1) DFRuntime  — the game engine (also copied into exports)
              2) Data       — room/building templates + starter levels
              3) Editor     — 2D map editor UI
   ===================================================================== */
/* =====================================================================
   RETROENGINE RUNTIME  —  the actual game engine.
   Everything the game needs lives inside this ONE function, so the
   editor can copy its source code (DFRuntime.toString()) into the
   standalone HTML it exports. Rule: no code in here may use anything
   from the editor.

   3D basics used below (Three.js r128):
   - A "scene" holds meshes and lights. A "camera" looks into it. The
     "renderer" draws the scene from the camera onto a <canvas>.
   - A Mesh = Geometry (the shape) + Material (how the surface reacts
     to light). MeshStandardMaterial is "PBR": roughness = how blurry
     reflections are, metalness = how metal-like it is.
   - Map coordinates: map x -> three.js x, map y -> three.js z,
     three.js y is UP (height). One grid cell = 1 unit (about 2 m).
   ===================================================================== */
function DFRuntime() {
'use strict';
const THREE = window.THREE;
const VERSION = '1.1.0';
const EYE = 0.62;            // eye height above the floor
const PLAYER_R = 0.22;       // player collision radius (in cells)
const STEP_H = 0.36;         // max height you can walk up without jumping
const GRAV = 11;             // gravity (units / s^2)

/* ---------- small helpers ---------- */
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
function seeded(seed) {             // repeatable random numbers (xorshift)
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function hexToRgb(h) { h = (h || '#888888').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

/* ---------- settings (saved in the browser) ---------- */
const SETTINGS_KEY = 'retroengine.settings.v1';
// One-time migration: copy saves made under the old DOOMFORGE name to the new RetroEngine keys.
try { [['doomforge.settings.v2', SETTINGS_KEY], ['doomforge.autosave.v2', 'retroengine.autosave.v1'], ['doomforge.slots.v2', 'retroengine.slots.v1'], ['doomforge.seenHelp.v2', 'retroengine.seenHelp.v1']]
  .forEach(([o, n]) => { const v = localStorage.getItem(o); if (v !== null && localStorage.getItem(n) === null) localStorage.setItem(n, v); }); } catch (e) { /* storage blocked */ }
const DEFAULT_SETTINGS = { sens: 1.25, invertY: false, fov: 75, volume: 0.8, sfx: 0.9, music: 0.5, quality: 'auto', showFps: false, touchScale: 1.0, bob: true, difficulty: 'normal', haptics: true, aimAssist: 0.80, aimAssistMouse: false };
const S = Object.assign({}, DEFAULT_SETTINGS);
try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  Object.assign(S, saved);
  // First 1.1.0 load: pick up the freer-movement and aim-assist defaults if this device still has the old 1.0.2 settings.
  if (saved.aimAssist === undefined) {
    S.aimAssist = 0.80;
    if (saved.sens === undefined || saved.sens === 1) S.sens = 1.25;
    if (saved.aimAssistMouse === undefined) S.aimAssistMouse = false;
  }
} catch (e) { /* private mode: keep defaults */ }
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(S)); } catch (e) {} }
const QUALITY = {
  low:    { ratio: 0.6,  lights: 4, tex: 128, aa: false },
  medium: { ratio: 1.0,  lights: 6, tex: 256, aa: false },
  high:   { ratio: 1.75, lights: 8, tex: 256, aa: true }
};
// 'auto' picks a tier from the device, then the game adjusts render resolution live to hold the frame rate.
const AUTO_TIER = (function () {
  try {
    const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    if (mem <= 2 || cores <= 2 || (coarse && (mem <= 3 || cores <= 4))) return 'low';
    return coarse || cores < 8 ? 'medium' : 'high';
  } catch (e) { return 'medium'; }
})();
function Q() { return QUALITY[S.quality === 'auto' ? AUTO_TIER : S.quality] || QUALITY.medium; }
function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'))); }
  catch (e) { return false; }
}
const buzz = ms => { try { if (S.haptics && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
const FS = {   // fullscreen with vendor prefixes; iPhone Safari has none, so the button hides there
  ok: () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
  el: () => document.fullscreenElement || document.webkitFullscreenElement || null,
  enter: e => { try { const r = (e.requestFullscreen || e.webkitRequestFullscreen).call(e); if (r && r.catch) r.catch(() => {}); } catch (x) {} },
  exit: () => { try { const r = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (r && r.catch) r.catch(() => {}); } catch (x) {} }
};

/* =====================================================================
   SOUND — everything is synthesized live with WebAudio (no audio files,
   so nothing copyrighted). Noise bursts = gunshots/explosions,
   oscillators = beeps, lasers and the ambient music drone.
   ===================================================================== */
const Sound = (function () {
  let ctx = null, master, sfxG, musG, noiseBuf, musicNodes = null, musicTimer = null;
  function init() {
    if (ctx) { if (ctx.state !== 'running') { try { const r = ctx.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxG = ctx.createGain(); sfxG.connect(master);
    musG = ctx.createGain(); musG.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolume();
  }
  function applyVolume() { if (!ctx) return; master.gain.value = S.volume; sfxG.gain.value = S.sfx; musG.gain.value = S.music * 0.35; }
  // Filtered noise burst with a fast-decay envelope
  function noise(dur, freq, q, gain, type, delay) {
    const t = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxG);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  // Oscillator sweep from f0 to f1
  function tone(dur, f0, f1, type, gain, delay) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(); o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + dur + 0.05);
  }
  function play(name, vol) {
    if (!ctx || ctx.state !== 'running') return;
    const v = vol === undefined ? 1 : vol;
    if (v < 0.02) return;
    switch (name) {
      case 'pistol': noise(0.18, 2200, 0.7, 0.5 * v); tone(0.08, 300, 60, 'square', 0.18 * v); break;
      case 'pulse': tone(0.18, 220, 55, 'square', 0.22 * v); tone(0.12, 880, 140, 'sawtooth', 0.16 * v); break;
      case 'rifle': noise(0.11, 3000, 0.8, 0.38 * v); tone(0.05, 420, 90, 'sawtooth', 0.12 * v); break;
      case 'shotgun': noise(0.42, 1200, 0.6, 0.8 * v); tone(0.2, 160, 40, 'square', 0.3 * v); noise(0.1, 4000, 1, 0.2 * v, 'highpass', 0.35); break;
      case 'rocket': noise(0.6, 600, 0.5, 0.5 * v); tone(0.5, 200, 50, 'sawtooth', 0.2 * v); break;
      case 'plasma': tone(0.16, 1400, 300, 'sawtooth', 0.16 * v); tone(0.12, 900, 2000, 'sine', 0.1 * v); break;
      case 'wrench': noise(0.08, 900, 2, 0.25 * v, 'bandpass'); break;
      case 'hit': tone(0.05, 1800, 1200, 'square', 0.06 * v); break;
      case 'explode': noise(1.1, 420, 0.4, 1.0 * v); tone(0.7, 90, 25, 'sine', 0.6 * v); break;
      case 'bolt': tone(0.22, 700, 160, 'sawtooth', 0.12 * v); break;
      case 'alert': tone(0.12, 220, 440, 'square', 0.1 * v); tone(0.12, 440, 330, 'square', 0.1 * v, 0.13); break;
      case 'pain': tone(0.15, 180, 90, 'sawtooth', 0.18 * v); noise(0.1, 700, 1, 0.15 * v, 'bandpass'); break;
      case 'edie': noise(0.7, 900, 0.6, 0.5 * v); tone(0.6, 400, 40, 'sawtooth', 0.25 * v); break;
      case 'hurt': tone(0.2, 140, 70, 'square', 0.25 * v); noise(0.12, 500, 1, 0.2 * v); break;
      case 'pickup': tone(0.08, 660, 990, 'square', 0.12 * v); tone(0.1, 990, 1320, 'square', 0.1 * v, 0.07); break;
      case 'weapon': tone(0.1, 300, 600, 'square', 0.14 * v); noise(0.2, 2000, 1, 0.15 * v, 'bandpass', 0.08); break;
      case 'key': [880, 1100, 1320, 1760].forEach((f, i) => tone(0.09, f, f, 'triangle', 0.12 * v, i * 0.07)); break;
      case 'door': noise(0.9, 260, 3, 0.3 * v, 'bandpass'); tone(0.9, 70, 55, 'sawtooth', 0.08 * v); break;
      case 'locked': tone(0.15, 180, 180, 'square', 0.15 * v); tone(0.15, 140, 140, 'square', 0.15 * v, 0.17); break;
      case 'empty': tone(0.04, 1200, 1100, 'square', 0.06 * v); break;
      case 'step': noise(0.06, 300 + Math.random() * 120, 1.5, 0.05 * v, 'bandpass'); break;
      case 'reload': noise(0.05, 1800, 3, 0.22 * v, 'bandpass'); noise(0.07, 900, 2, 0.25 * v, 'bandpass', 0.28); break;
      case 'reload2': noise(0.05, 2400, 3, 0.25 * v, 'bandpass'); noise(0.04, 1400, 3, 0.2 * v, 'bandpass', 0.07); break;
      case 'jump': noise(0.08, 500, 1, 0.08 * v, 'bandpass'); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(0.25, f, f, 'triangle', 0.15 * v, i * 0.12)); break;
      case 'ui': tone(0.04, 900, 900, 'sine', 0.06 * v); break;
    }
  }
  // Generative dark ambient music: two detuned drones + random minor-key blips.
  function music(on) {
    if (!ctx) return;
    if (!on) {
      if (musicNodes) { musicNodes.forEach(n => { try { n.stop(); } catch (e) {} }); musicNodes = null; }
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      return;
    }
    if (musicNodes) return;
    musicNodes = [];
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.connect(musG);
    [55, 55.4, 82.4].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.25 : 0.35; o.connect(g); g.connect(lp); o.start(); musicNodes.push(o);
    });
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 140;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); musicNodes.push(lfo);
    const scale = [220, 261.6, 293.7, 329.6, 392, 440, 523.3];
    musicTimer = setInterval(() => {
      if (!ctx || Math.random() < 0.45) return;
      const f = scale[(Math.random() * scale.length) | 0] * (Math.random() < 0.3 ? 0.5 : 1);
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      o.connect(g); g.connect(musG); o.start(t); o.stop(t + 1.7);
    }, 520);
  }
  // iOS/Safari and some webviews only start audio inside a touch/click: resume and play one silent sample then.
  let remade = 0;
  function unlock(fresh) {
    // Gecko (Firefox) can leave a context made during a touch's pointerup suspended for good, while one
    // created inside the click that follows starts fine: so if it is still stuck, rebuild it in that gesture.
    if (fresh && ctx && ctx.state === 'suspended' && !musicNodes && remade < 3) { remade++; try { ctx.close(); } catch (e) {} ctx = null; }
    init(); if (!ctx) return false;
    try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
    return ctx.state === 'running';
  }
  return { init, unlock, play, music, applyVolume, get ctx() { return ctx; } };
})();
if (!window.__reAudioUnlock) {
  window.__reAudioUnlock = true;
  const evs = ['touchend', 'pointerup', 'mousedown', 'keydown', 'click'];
  const un = e => { if (Sound.unlock(e.type === 'click')) evs.forEach(n => document.removeEventListener(n, un, true)); };
  evs.forEach(e => document.addEventListener(e, un, true));
}

/* =====================================================================
   PROCEDURAL TEXTURES — painted pixel-by-pixel on <canvas>.
   Each texture gives: an albedo (color) image, a normal map (fake bumps
   that catch the light, computed from brightness), and optionally an
   emissive image (parts that glow in the dark, e.g. LEDs, light strips).
   They tile seamlessly because the noise "wraps" around the edges.
   ===================================================================== */
// Tileable value noise: random values on a coarse grid, smoothly blended.
function valueNoise(S, cells, seed) {
  const r = seeded(seed), g = new Float32Array(cells * cells), out = new Float32Array(S * S);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const k = cells / S;
  for (let y = 0; y < S; y++) {
    const fy = y * k, y0 = fy | 0, ty = fy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % cells;
    for (let x = 0; x < S; x++) {
      const fx = x * k, x0 = fx | 0, tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % cells;
      const a = g[y0 * cells + x0], b = g[y0 * cells + x1], c = g[y1 * cells + x0], d = g[y1 * cells + x1];
      out[y * S + x] = (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
    }
  }
  return out;
}
// Fractal noise: several noise layers, each finer and quieter (looks like grime / stone).
function fbm(S, seed, base, oct) {
  const out = new Float32Array(S * S); let amp = 1, tot = 0, cells = base;
  for (let o = 0; o < oct; o++) {
    const n = valueNoise(S, Math.min(cells, S), seed + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    tot += amp; amp *= 0.5; cells *= 2;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

const TEX_DEFS = {
  concrete:     { name: 'Concrete',        rough: 0.92, metal: 0.0,  bump: 2.2 },
  concrete_dark:{ name: 'Bunker Concrete', rough: 0.95, metal: 0.0,  bump: 2.6 },
  brick:        { name: 'Grimy Brick',     rough: 0.9,  metal: 0.0,  bump: 3.2 },
  metal_panel:  { name: 'Steel Panels',    rough: 0.72, metal: 0.4,  bump: 2.0 },
  tech:         { name: 'Tech Wall',       rough: 0.66, metal: 0.45, bump: 2.0, glow: true },
  rust:         { name: 'Rusted Steel',    rough: 0.85, metal: 0.35, bump: 2.8 },
  grate:        { name: 'Floor Grate',     rough: 0.7,  metal: 0.6,  bump: 3.5 },
  hazard:       { name: 'Hazard Stripes',  rough: 0.7,  metal: 0.3,  bump: 1.6 },
  tile:         { name: 'Ceramic Tile',    rough: 0.58, metal: 0.0,  bump: 1.8 },
  tile_dark:    { name: 'Industrial Tile', rough: 0.64, metal: 0.0,  bump: 1.8 },
  plate:        { name: 'Tread Plate',     rough: 0.64, metal: 0.6,  bump: 3.0 },
  asphalt:      { name: 'Asphalt',         rough: 0.95, metal: 0.0,  bump: 2.4 },
  wood:         { name: 'Wood Planks',     rough: 0.8,  metal: 0.0,  bump: 2.4 },
  ceiling:      { name: 'Ceiling Panels',  rough: 0.9,  metal: 0.0,  bump: 1.4 },
  light_panel:  { name: 'Ceiling Lights',  rough: 0.6,  metal: 0.1,  bump: 1.0, glow: true },
  server:       { name: 'Server Racks',    rough: 0.6,  metal: 0.6,  bump: 1.8, glow: true },
  door:         { name: 'Blast Door',      rough: 0.64, metal: 0.55, bump: 2.2, glow: true, door: true },
  door_red:     { name: 'Red Key Door',    rough: 0.64, metal: 0.55, bump: 2.2, glow: true, door: true },
  door_blue:    { name: 'Blue Key Door',   rough: 0.64, metal: 0.55, bump: 2.2, glow: true, door: true },
  door_yellow:  { name: 'Yellow Key Door', rough: 0.64, metal: 0.55, bump: 2.2, glow: true, door: true }
};
const WALL_TEXTURES = ['concrete', 'concrete_dark', 'brick', 'metal_panel', 'tech', 'rust', 'hazard', 'tile', 'tile_dark', 'wood', 'server', 'grate', 'plate'];
const FLOOR_TEXTURES = ['concrete', 'tile', 'tile_dark', 'plate', 'grate', 'asphalt', 'wood', 'rust', 'metal_panel', 'hazard', 'concrete_dark', 'brick'];
const CEIL_TEXTURES = ['ceiling', 'light_panel', 'concrete', 'metal_panel', 'grate', 'rust', 'concrete_dark', 'sky'];

// Paints one texture. Returns { color: canvas, glow: canvas|null }.
function paintTexture(id, S) {
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d', { willReadFrequently: true });
  const img = c.createImageData(S, S), d = img.data;
  const seed = id.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const n1 = fbm(S, seed, 4, 5), n2 = fbm(S, seed + 9, 16, 3);
  let glow = null, gc = null;
  const def = TEX_DEFS[id] || {};
  if (def.glow) { glow = document.createElement('canvas'); glow.width = glow.height = S; gc = glow.getContext('2d'); gc.fillStyle = '#000'; gc.fillRect(0, 0, S, S); }
  // 1) base color from noise
  const base = {
    concrete: [118, 116, 110], concrete_dark: [78, 80, 80], brick: [110, 56, 42], metal_panel: [92, 100, 110], tech: [44, 50, 60],
    rust: [112, 62, 34], grate: [52, 55, 58], hazard: [70, 70, 70], tile: [150, 152, 146], tile_dark: [70, 84, 80], plate: [112, 116, 122],
    asphalt: [46, 46, 48], wood: [112, 78, 46], ceiling: [128, 128, 122], light_panel: [100, 102, 104], server: [26, 28, 32],
    door: [84, 88, 92], door_red: [84, 80, 80], door_blue: [78, 84, 92], door_yellow: [88, 86, 76]
  }[id] || [100, 100, 100];
  for (let i = 0; i < S * S; i++) {
    let k = 0.75 + (n1[i] - 0.5) * 0.7 + (n2[i] - 0.5) * 0.35;
    if (id === 'rust') { const r2 = n2[i] > 0.62 ? 0.55 : 1; k *= r2; }
    if (id === 'asphalt' || id === 'concrete' || id === 'concrete_dark') { if (Math.random() < 0.06) k *= 0.75 + Math.random() * 0.5; }
    d[i * 4] = clamp(base[0] * k, 0, 255); d[i * 4 + 1] = clamp(base[1] * k, 0, 255); d[i * 4 + 2] = clamp(base[2] * k, 0, 255); d[i * 4 + 3] = 255;
    if (id === 'rust' && n1[i] < 0.38) { d[i * 4] = 70 * k; d[i * 4 + 1] = 74 * k; d[i * 4 + 2] = 80 * k; } // bare steel showing through
  }
  c.putImageData(img, 0, 0);
  const u = S / 64; // drawing unit: shapes below are designed on a 64px grid
  const R = seeded(seed + 3);
  const line = (x1, y1, x2, y2, col, w) => { c.strokeStyle = col; c.lineWidth = (w || 1) * u; c.beginPath(); c.moveTo(x1 * u, y1 * u); c.lineTo(x2 * u, y2 * u); c.stroke(); };
  const rect = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x * u, y * u, w * u, h * u); };
  const rivet = (x, y) => { c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(x * u + u * .4, y * u + u * .4, u * 1.1, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(x * u, y * u, u * 0.9, 0, 7); c.fill(); };
  const glowRect = (x, y, w, h, col) => { if (!gc) return; gc.fillStyle = col; gc.fillRect(x * u, y * u, w * u, h * u); rect(x, y, w, h, col); };
  // 2) per-material details
  switch (id) {
    case 'concrete': case 'concrete_dark':
      line(0, 32, 64, 32, 'rgba(0,0,0,.25)', 0.8); line(32, 0, 32, 64, 'rgba(0,0,0,.18)', 0.6);
      if (id === 'concrete_dark') [[16, 16], [48, 16], [16, 48], [48, 48]].forEach(p => rivet(p[0], p[1]));
      for (let i = 0; i < 4; i++) { let x = R() * 64, y = R() * 64; c.strokeStyle = 'rgba(20,20,20,.35)'; c.lineWidth = u * .6; c.beginPath(); c.moveTo(x * u, y * u); for (let j = 0; j < 6; j++) { x += rand(-5, 5); y += rand(2, 7); c.lineTo(x * u, y * u); } c.stroke(); }
      for (let i = 0; i < 6; i++) rect(R() * 64, 0, 1 + R() * 2, 64, 'rgba(30,25,20,.08)'); // water streaks
      break;
    case 'brick':
      for (let row = 0; row < 8; row++) {
        const off = (row % 2) * 8;
        line(0, row * 8, 64, row * 8, 'rgba(40,36,32,.9)', 1.4);
        for (let b = 0; b < 5; b++) { const x = (b * 16 + off) % 64; line(x, row * 8, x, row * 8 + 8, 'rgba(40,36,32,.9)', 1.4); rect(x + 1, row * 8 + 1, 14, 6, `rgba(${R() * 60 | 0},${R() * 20 | 0},0,${0.12 + R() * 0.15})`); }
      }
      rect(0, 46, 64, 18, 'rgba(10,10,10,.25)'); // grime near the floor
      break;
    case 'metal_panel': case 'rust':
      line(0, 0, 64, 0, 'rgba(0,0,0,.6)', 1.6); line(0, 32, 64, 32, 'rgba(0,0,0,.55)', 1.2); line(0, 0, 0, 64, 'rgba(0,0,0,.6)', 1.6); line(32, 0, 32, 64, 'rgba(0,0,0,.5)', 1.2);
      line(0, 1.4, 64, 1.4, 'rgba(255,255,255,.12)', 0.6); line(0, 33.4, 64, 33.4, 'rgba(255,255,255,.1)', 0.6);
      [[3, 3], [29, 3], [3, 29], [29, 29], [35, 3], [61, 3], [35, 29], [61, 29], [3, 35], [29, 35], [3, 61], [29, 61], [35, 35], [61, 35], [35, 61], [61, 61]].forEach(p => rivet(p[0], p[1]));
      for (let i = 0; i < 14; i++) { const x = R() * 64, y = R() * 64; line(x, y, x + rand(-8, 8), y + rand(-2, 2), 'rgba(255,255,255,.08)', 0.4); }
      if (id === 'rust') for (let i = 0; i < 8; i++) rect(R() * 64, R() * 30, 1.2, 10 + R() * 30, 'rgba(90,40,10,.25)');
      break;
    case 'tech':
      rect(4, 4, 56, 24, 'rgba(0,0,0,.25)'); rect(4, 36, 26, 24, 'rgba(0,0,0,.28)'); rect(34, 36, 26, 24, 'rgba(0,0,0,.28)');
      for (let i = 0; i < 6; i++) line(8, 40 + i * 3.5, 26, 40 + i * 3.5, 'rgba(0,0,0,.6)', 1.2);  // vents
      glowRect(6, 30.5, 52, 2.4, '#29d3ff');                     // cyan light strip
      glowRect(40, 42, 4, 3, '#ff3b30'); glowRect(48, 42, 4, 3, '#33ff88');
      [[6, 6], [58, 6], [6, 58], [58, 58]].forEach(p => rivet(p[0], p[1]));
      break;
    case 'grate':
      rect(0, 0, 64, 64, 'rgba(0,0,0,.35)');
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) rect(x * 8 + 1.6, y * 8 + 1.6, 4.8, 4.8, 'rgba(5,6,8,.85)');
      line(0, 0, 64, 0, 'rgba(255,255,255,.15)', 1); line(0, 0, 0, 64, 'rgba(255,255,255,.15)', 1);
      break;
    case 'hazard':
      c.save(); c.beginPath(); c.rect(0, 0, S, S); c.clip();
      for (let i = -64; i < 128; i += 16) { c.fillStyle = 'rgba(230,170,20,.85)'; c.beginPath(); c.moveTo(i * u, 0); c.lineTo((i + 8) * u, 0); c.lineTo((i + 8 - 64) * u, S); c.lineTo((i - 64) * u, S); c.fill(); }
      c.restore();
      for (let i = 0; i < 40; i++) rect(R() * 64, R() * 64, R() * 4, R() * 2, 'rgba(40,40,40,.5)'); // chipped paint
      break;
    case 'tile': case 'tile_dark':
      for (let i = 0; i <= 8; i++) { line(i * 8, 0, i * 8, 64, id === 'tile' ? 'rgba(70,70,60,.7)' : 'rgba(20,24,22,.8)', 0.9); line(0, i * 8, 64, i * 8, id === 'tile' ? 'rgba(70,70,60,.7)' : 'rgba(20,24,22,.8)', 0.9); }
      for (let i = 0; i < 18; i++) rect((R() * 8 | 0) * 8 + .5, (R() * 8 | 0) * 8 + .5, 7, 7, `rgba(${R() * 40 | 0},${R() * 30 | 0},10,${0.1 + R() * 0.15})`);
      break;
    case 'plate':
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const cx = x * 8 + 4 + (y % 2) * 4, cy = y * 8 + 4; c.save(); c.translate(cx * u, cy * u); c.rotate((x + y) % 2 ? 0.8 : -0.8); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(-2.6 * u, -0.7 * u, 5.2 * u, 1.4 * u); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-2.6 * u, 0.7 * u, 5.2 * u, 0.6 * u); c.restore(); }
      break;
    case 'asphalt':
      for (let i = 0; i < 120; i++) rect(R() * 64, R() * 64, 0.8, 0.8, `rgba(${150 + R() * 60 | 0},${150 + R() * 60 | 0},${150 + R() * 60 | 0},.35)`);
      break;
    case 'wood':
      for (let i = 0; i < 4; i++) { line(0, i * 16, 64, i * 16, 'rgba(30,18,8,.8)', 1.2); for (let k = 0; k < 10; k++) line(0, i * 16 + R() * 16, 64, i * 16 + R() * 16, 'rgba(60,36,16,.25)', 0.5); rivet(4, i * 16 + 8); rivet(60, i * 16 + 8); }
      break;
    case 'ceiling':
      for (let i = 0; i <= 2; i++) { rect(i * 32 - 1, 0, 2, 64, 'rgba(50,50,50,.7)'); rect(0, i * 32 - 1, 64, 2, 'rgba(50,50,50,.7)'); }
      for (let i = 0; i < 160; i++) rect(R() * 64, R() * 64, .6, .6, 'rgba(0,0,0,.25)');
      rect(36, 40, 18, 14, 'rgba(90,70,30,.25)'); // water stain
      break;
    case 'light_panel':
      for (let i = 0; i <= 2; i++) { rect(i * 32 - 1, 0, 2, 64, 'rgba(40,40,40,.8)'); rect(0, i * 32 - 1, 64, 2, 'rgba(40,40,40,.8)'); }
      glowRect(6, 10, 20, 44, '#fff3d6'); glowRect(38, 10, 20, 44, '#fff3d6');
      for (let i = 0; i < 5; i++) { rect(6, 14 + i * 9, 20, 1, 'rgba(120,120,110,.6)'); rect(38, 14 + i * 9, 20, 1, 'rgba(120,120,110,.6)'); }
      break;
    case 'server':
      for (let r = 0; r < 8; r++) {
        rect(3, r * 8 + 1, 58, 6.4, 'rgba(60,64,72,.85)'); rect(4, r * 8 + 2, 30, 4.4, 'rgba(10,10,12,.9)');
        for (let k = 0; k < 6; k++) { const on = R() > 0.3; glowRect(38 + k * 3.6, r * 8 + 3, 1.6, 1.6, on ? (R() > 0.85 ? '#ff4b2b' : (R() > 0.5 ? '#38f2ff' : '#48ff7a')) : '#111'); }
        for (let k = 0; k < 10; k++) rect(6 + k * 2.8, r * 8 + 3, 1.2, 2.4, 'rgba(70,74,80,.9)');
      }
      line(1.5, 0, 1.5, 64, 'rgba(120,124,130,.8)', 1.4); line(62.5, 0, 62.5, 64, 'rgba(120,124,130,.8)', 1.4);
      break;
    case 'door': case 'door_red': case 'door_blue': case 'door_yellow': {
      const kc = { door: '#ffb020', door_red: '#ff2d2d', door_blue: '#2d8bff', door_yellow: '#ffd21f' }[id];
      rect(0, 0, 64, 64, 'rgba(0,0,0,.15)'); line(32, 0, 32, 64, 'rgba(0,0,0,.8)', 1.2);
      for (let i = 0; i < 4; i++) { rect(4, 6 + i * 14, 24, 9, 'rgba(0,0,0,.22)'); rect(36, 6 + i * 14, 24, 9, 'rgba(0,0,0,.22)'); }
      c.save(); c.beginPath(); c.rect(0, 56 * u, S, 8 * u); c.clip(); for (let i = -8; i < 72; i += 8) { c.fillStyle = 'rgba(230,170,20,.8)'; c.fillRect(i * u, 56 * u, 4 * u, 8 * u); } c.restore();
      glowRect(28, 4, 8, 3, kc); glowRect(28, 30, 8, 4, kc);
      if (id !== 'door') { glowRect(2, 2, 3, 52, kc); glowRect(59, 2, 3, 52, kc); }
      break;
    }
  }
  // 3) final grime pass: darken with large-scale noise so nothing looks clean & plastic
  const im2 = c.getImageData(0, 0, S, S), e = im2.data;
  for (let i = 0; i < S * S; i++) {
    const y = (i / S) | 0, k = 0.82 + n1[(i + S * 7) % (S * S)] * 0.28 - (y / S) * 0.06;
    e[i * 4] *= k; e[i * 4 + 1] *= k; e[i * 4 + 2] *= k;
  }
  c.putImageData(im2, 0, 0);
  return { color: cv, glow };
}

// Normal map from brightness (Sobel filter): bright = raised, dark = sunken.
function normalFromCanvas(cv, strength) {
  const S = cv.width, src = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, S, S).data;
  const h = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) h[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255;
  const out = document.createElement('canvas'); out.width = out.height = S;
  const oc = out.getContext('2d'), img = oc.createImageData(S, S), d = img.data;
  const at = (x, y) => h[((y + S) % S) * S + ((x + S) % S)];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength, dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    const len = Math.sqrt(dx * dx + dy * dy + 1), i = (y * S + x) * 4;
    d[i] = (-dx / len * 0.5 + 0.5) * 255; d[i + 1] = (dy / len * 0.5 + 0.5) * 255; d[i + 2] = (1 / len * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
  return out;
}

const texCache = {}, matCache = {};
function getTexCanvases(id, size) {
  const key = id + '@' + size;
  if (!texCache[key]) texCache[key] = paintTexture(TEX_DEFS[id] ? id : 'concrete', size);
  return texCache[key];
}
// Small preview images for the editor palette / 2D map
const thumbCache = {};
function getThumb(id, size) {
  size = size || 32; const key = id + ':' + size;
  if (thumbCache[key]) return thumbCache[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d');
  if (id === 'sky') { const g = c.createLinearGradient(0, 0, 0, size); g.addColorStop(0, '#0b1a33'); g.addColorStop(1, '#3a4a66'); c.fillStyle = g; c.fillRect(0, 0, size, size); c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) c.fillRect(Math.random() * size, Math.random() * size * .6, 1, 1); }
  else c.drawImage(getTexCanvases(id, 64).color, 0, 0, size, size);
  return (thumbCache[key] = cv);
}
// Turns a canvas into a GPU texture. RepeatWrapping lets one texture tile over big surfaces.
function canvasTex(cv, srgb) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (srgb) t.encoding = THREE.sRGBEncoding;
  return t;
}
/* Lighting look: dark but readable. Cheap "ambient occlusion" darkens floors/ceilings next to walls
   (a tiny wall-occupancy texture, bilinear-filtered) and the bottom/top of walls, so corners read as shadowed. */
const AO_U = { occ: { value: null }, size: { value: new THREE.Vector2(1, 1) }, wallH: { value: 1.5 } };
function setAoLevel(L) {
  const W = L.w, H = L.h, d = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { const v = L.wall[i] && !L.kind[i] ? 255 : 0; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  if (AO_U.occ.value) AO_U.occ.value.dispose(); AO_U.occ.value = t; AO_U.size.value.set(W, H); AO_U.wallH.value = L.props.wallH;
}
function aoShader(sh) {
  sh.uniforms.reOcc = AO_U.occ; sh.uniforms.reOccSize = AO_U.size; sh.uniforms.reWallH = AO_U.wallH;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vReW;\nvarying float vReNy;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvec4 reWp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nreWp = instanceMatrix * reWp;\n#endif\nreWp = modelMatrix * reWp; vReW = reWp.xyz; vReNy = abs((modelMatrix * vec4(objectNormal, 0.0)).y);');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D reOcc; uniform vec2 reOccSize; uniform float reWallH; varying vec3 vReW; varying float vReNy;')
    .replace('#include <tonemapping_fragment>', `float reAO = 1.0;
if (vReNy > 0.5) { float o = texture2D(reOcc, vReW.xz / reOccSize).r; reAO = 1.0 - 0.62 * smoothstep(0.0, 0.8, o); }
else { reAO = mix(0.42, 1.0, smoothstep(0.0, 0.6, vReW.y)) * mix(0.62, 1.0, smoothstep(0.0, 0.45, reWallH - vReW.y)); }
gl_FragColor.rgb *= reAO;
#include <tonemapping_fragment>`);
}
// Rim light: a cool fresnel edge so enemies separate from dark walls at any distance.
function addRim(m, color, k) {
  m.onBeforeCompile = sh => {
    sh.uniforms.reRim = { value: new THREE.Color(color) }; sh.uniforms.reRimK = { value: k };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 reRim; uniform float reRimK;')
      .replace('#include <tonemapping_fragment>', 'float reF = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.2);\ngl_FragColor.rgb += reRim * reF * reRimK;\n#include <tonemapping_fragment>');
  };
  m.customProgramCacheKey = () => 'rim' + k; m.needsUpdate = true; return m;
}
function getMaterial(id) {
  const size = Q().tex, key = id + '@' + size;
  if (matCache[key]) return matCache[key];
  const def = TEX_DEFS[id] || TEX_DEFS.concrete, cv = getTexCanvases(id, size);
  const m = new THREE.MeshStandardMaterial({
    map: canvasTex(cv.color, true),
    normalMap: canvasTex(normalFromCanvas(cv.color, def.bump), false),
    roughness: def.rough, metalness: def.metal
  });
  m.normalScale.set(0.9, 0.9); m.onBeforeCompile = aoShader; m.customProgramCacheKey = () => 'ao';
  if (cv.glow) { m.emissiveMap = canvasTex(cv.glow, true); m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = id === 'light_panel' ? 0.42 : 0.95; }
  return (matCache[key] = m);
}

/* =====================================================================
   GAME DEFINITIONS — tweak these numbers to rebalance the game.
   ===================================================================== */
const ENEMY_DEFS = {
  grunt:  { name: 'Soldier',       hp: 45,  speed: 1.7, range: 9,  dmg: 8,  cd: 1.5, shots: 1, h: 1.0,  r: 0.28, score: 100, proj: 'bolt' },
  drone:  { name: 'Gun Drone',     hp: 25,  speed: 2.6, range: 8,  dmg: 5,  cd: 1.0, shots: 1, h: 0.36, r: 0.22, score: 80,  proj: 'bolt', hover: 0.62 },
  heavy:  { name: 'Heavy Walker',   hp: 120, speed: 1.2, range: 8,  dmg: 6,  cd: 2.0, shots: 3, h: 1.15, r: 0.32, score: 250, proj: 'bolt' },
  turret: { name: 'Sentry Turret', hp: 70,  speed: 0,   range: 12, dmg: 5,  cd: 0.5, shots: 1, h: 0.72, r: 0.3,  score: 150, proj: 'bolt' },
  titan:  { name: 'Titan (Boss)',  hp: 650, speed: 1.0, range: 14, dmg: 22, cd: 1.9, shots: 2, h: 1.3,  r: 0.45, score: 2000, proj: 'rocket' }
};
const WEAPON_DEFS = [
  { id: 'wrench',  name: 'Wrench',          ammo: null,      cd: 0.45, dmg: 30, melee: true, range: 1.15, snd: 'wrench' },
  { id: 'pistol',  name: 'Pulse Cannon',    ammo: null,    cd: 0.13, dmg: 28, pellets: 1, spread: 0.008, auto: true, proj: 'pulse', speed: 22, recoil: 0.14, snd: 'pulse' },
  { id: 'shotgun', name: 'Combat Shotgun',  ammo: 'shells',  cd: 0.85, dmg: 9,  pellets: 8, spread: 0.085, snd: 'shotgun' },
  { id: 'rifle',   name: 'Assault Rifle',     ammo: 'bullets', cd: 0.095,dmg: 10, pellets: 1, spread: 0.03, auto: true, snd: 'rifle' },
  { id: 'plasma',  name: 'Plasma Caster',   ammo: 'cells',   cd: 0.12, dmg: 20, proj: 'plasma', speed: 15, auto: true, snd: 'plasma' },
  { id: 'rocket',  name: 'Rocket Launcher', ammo: 'rockets', cd: 0.9,  dmg: 110, proj: 'rocket', speed: 9, splash: 1.9, snd: 'rocket' }
];
const MAG_SIZE = [0, 0, 6, 30, 40, 1], RELOAD_TIME = [0, 0, 1.7, 1.5, 1.4, 1.9];
const AMMO_MAX = { bullets: 300, shells: 60, cells: 300, rockets: 30 };
const PICKUP_DEFS = {
  health:       { name: 'Stimpack',        give: { hp: 20 } },
  medkit:       { name: 'Medkit',          give: { hp: 50 } },
  armor:        { name: 'Armor Vest',      give: { armor: 50 } },
  armor_heavy:  { name: 'Heavy Armor',     give: { armor: 100 } },
  ammo_bullets: { name: 'Bullet Box',      give: { bullets: 30 } },
  ammo_shells:  { name: 'Shell Box',       give: { shells: 10 } },
  ammo_cells:   { name: 'Energy Cells',    give: { cells: 40 } },
  ammo_rockets: { name: 'Rockets',         give: { rockets: 4 } },
  key_red:      { name: 'Red Keycard',     give: { key: 'red' } },
  key_blue:     { name: 'Blue Keycard',    give: { key: 'blue' } },
  key_yellow:   { name: 'Yellow Keycard',  give: { key: 'yellow' } },
  w_shotgun:    { name: 'Combat Shotgun',  give: { weapon: 2, shells: 8 } },
  w_rifle:      { name: 'Assault Rifle',     give: { weapon: 3, bullets: 40 } },
  w_plasma:     { name: 'Plasma Caster',   give: { weapon: 4, cells: 40 } },
  w_rocket:     { name: 'Rocket Launcher', give: { weapon: 5, rockets: 5 } },
  chip:         { name: 'Data Chip (secret)', give: { secret: 1 } }
};
const PROP_DEFS = {
  crate:     { name: 'Supply Crate',   solid: 0.32 },
  crate_tall:{ name: 'Crate Stack',    solid: 0.34 },
  barrel:    { name: 'Explosive Barrel', solid: 0.22, hp: 20 },
  pillar:    { name: 'Steel Pillar',   solid: 0.26 },
  desk:      { name: 'Desk',           solid: 0.36 },
  terminal:  { name: 'Terminal',       solid: 0.25 },
  server:    { name: 'Server Rack',    solid: 0.4 },
  pipes:     { name: 'Pipe Cluster',   solid: 0.25 },
  generator: { name: 'Generator',      solid: 0.45 },
  locker:    { name: 'Lockers',        solid: 0.3 },
  lamp:      { name: 'Floor Lamp',     solid: 0.12 },
  cone:      { name: 'Traffic Cone',   solid: 0 },
  debris:    { name: 'Debris',         solid: 0 },
  sandbags:  { name: 'Sandbags',       solid: 0.42 }
};
const KEY_COLORS = { red: '#ff2d2d', blue: '#2d8bff', yellow: '#ffd21f' };

/* =====================================================================
   PROCEDURAL 3D MODELS — built from boxes & cylinders, so the game
   works with zero model files. Each model faces +Z with its feet at y=0.
   ===================================================================== */
let grimeTexture = null;
function grime() { if (!grimeTexture) grimeTexture = canvasTex(getTexCanvases('concrete', 128).color, true); return grimeTexture; }
function mat(color, o) {
  o = o || {};
  return new THREE.MeshStandardMaterial({ color, map: o.noMap ? null : grime(), roughness: o.rough !== undefined ? o.rough : 0.7, metalness: o.metal !== undefined ? o.metal : 0.45, flatShading: true, emissive: new THREE.Color(o.emissive || 0) });
}
const glowMat = (color) => new THREE.MeshBasicMaterial({ color });
function box(parent, w, h, d, m, x, y, z) { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x || 0, y || 0, z || 0); parent.add(me); return me; }
function cyl(parent, rt, rb, h, seg, m, x, y, z) { const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.position.set(x || 0, y || 0, z || 0); parent.add(me); return me; }

function buildScoutMech(hull, dark, glow, heavy) {
  // Two-legged mech with "backwards knee" legs and twin arm cannons.
  const g = new THREE.Group(), legs = [];
  [-1, 1].forEach(side => {
    const hip = new THREE.Group(); hip.position.set(side * 0.13, 0.52, 0); g.add(hip);
    box(hip, 0.09, 0.26, 0.11, hull, 0, -0.12, 0.02).rotation.x = -0.25;
    const knee = new THREE.Group(); knee.position.set(0, -0.24, 0.06); hip.add(knee);
    box(knee, 0.07, 0.26, 0.08, dark, 0, -0.12, -0.03).rotation.x = 0.35;
    box(knee, 0.12, 0.04, 0.2, dark, 0, -0.26, 0.0);
    cyl(hip, 0.055, 0.055, 0.1, 6, dark).rotation.z = Math.PI / 2;
    legs.push(hip);
  });
  box(g, 0.34, 0.1, 0.22, dark, 0, 0.56, 0);
  box(g, 0.42, 0.26, 0.3, hull, 0, 0.72, 0.01).rotation.x = 0.06;
  box(g, 0.3, 0.08, 0.06, dark, 0, 0.66, 0.17);
  const head = box(g, 0.2, 0.11, 0.18, hull, 0, 0.9, 0.06);
  box(head, 0.16, 0.035, 0.02, glow, 0, 0.005, 0.095);
  cyl(g, 0.008, 0.008, 0.16, 4, dark, -0.08, 1.0, -0.02);
  [-1, 1].forEach(side => {
    box(g, 0.12, 0.08, 0.2, hull, side * 0.27, 0.82, 0);
    box(g, 0.08, 0.16, 0.1, dark, side * 0.28, 0.7, 0.02).rotation.x = -0.2;
    cyl(g, 0.035, 0.04, 0.3, 6, dark, side * 0.28, 0.63, 0.17).rotation.x = Math.PI / 2;
    cyl(g, 0.02, 0.02, 0.02, 6, glow, side * 0.28, 0.63, 0.33).rotation.x = Math.PI / 2;
    if (heavy) { box(g, 0.18, 0.14, 0.26, hull, side * 0.3, 0.93, -0.02).rotation.z = side * 0.25; box(g, 0.1, 0.1, 0.1, dark, side * 0.12, 0.92, -0.16); }
  });
  if (heavy) box(g, 0.3, 0.22, 0.14, dark, 0, 0.8, -0.2);
  g.userData.legs = legs;
  return g;
}
function buildDrone(hull, dark, glow) {
  // Hovering sentry: body is centered at y=0, hover height is added in the game loop.
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), hull); body.scale.set(1.15, 0.8, 1.15); g.add(body);
  box(g, 0.2, 0.05, 0.08, dark, 0, -0.01, 0.13);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glow); eye.position.set(0, 0, 0.17); g.add(eye);
  const rotor = new THREE.Group(); rotor.position.y = 0.06;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.022, 4, 16), dark); ring.rotation.x = Math.PI / 2; rotor.add(ring);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; box(rotor, 0.24, 0.02, 0.03, hull, Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13).rotation.y = -a; cyl(rotor, 0.06, 0.06, 0.012, 8, dark, Math.cos(a) * 0.25, 0.03, Math.sin(a) * 0.25); }
  g.add(rotor);
  cyl(g, 0.018, 0.024, 0.2, 6, dark, 0, -0.12, 0.08).rotation.x = Math.PI / 2;
  g.userData.rotor = rotor;
  return g;
}
function buildTitan(hull, dark, glow) {
  const g = new THREE.Group(), legs = [];
  [-1, 1].forEach(side => {
    const hip = new THREE.Group(); hip.position.set(side * 0.22, 0.62, 0); g.add(hip);
    box(hip, 0.16, 0.32, 0.18, hull, 0, -0.14, 0);
    const knee = new THREE.Group(); knee.position.set(0, -0.3, 0.04); hip.add(knee);
    box(knee, 0.13, 0.28, 0.14, dark, 0, -0.12, 0); box(knee, 0.24, 0.07, 0.32, dark, 0, -0.285, 0.03); box(knee, 0.15, 0.1, 0.06, hull, 0, 0, 0.1);
    legs.push(hip);
  });
  box(g, 0.5, 0.14, 0.3, dark, 0, 0.66, 0); box(g, 0.7, 0.36, 0.42, hull, 0, 0.9, 0); box(g, 0.56, 0.12, 0.36, dark, 0, 1.1, -0.02);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), glow); core.position.set(0, 0.9, 0.22); g.add(core);
  const head = box(g, 0.22, 0.12, 0.2, hull, 0, 1.2, 0.08); box(head, 0.18, 0.035, 0.02, glow, 0, 0, 0.105);
  [-1, 1].forEach(side => {
    box(g, 0.2, 0.18, 0.3, hull, side * 0.45, 1.05, 0);
    cyl(g, 0.06, 0.07, 0.46, 6, dark, side * 0.45, 1.13, 0.2).rotation.x = Math.PI / 2;
    cyl(g, 0.04, 0.04, 0.02, 6, glow, side * 0.45, 1.13, 0.44).rotation.x = Math.PI / 2;
    box(g, 0.13, 0.36, 0.15, dark, side * 0.44, 0.74, 0.04).rotation.x = -0.15;
    box(g, 0.16, 0.12, 0.2, hull, side * 0.44, 0.54, 0.1);
  });
  g.userData.legs = legs; g.userData.core = core;
  return g;
}
function buildTurret(hull, dark, glow) {
  const g = new THREE.Group();
  cyl(g, 0.3, 0.36, 0.12, 8, dark, 0, 0.06, 0); cyl(g, 0.1, 0.14, 0.36, 8, hull, 0, 0.3, 0);
  const head = new THREE.Group(); head.position.y = 0.55; g.add(head);
  box(head, 0.36, 0.2, 0.3, hull, 0, 0, 0); box(head, 0.3, 0.05, 0.02, glow, 0, 0.04, 0.16);
  [-0.09, 0.09].forEach(x => { cyl(head, 0.03, 0.035, 0.36, 6, dark, x, -0.03, 0.3).rotation.x = Math.PI / 2; });
  box(head, 0.08, 0.1, 0.14, dark, 0.2, 0, -0.04);
  g.userData.head = head;
  return g;
}
function buildEnemyMesh(sub) {
  const pal = { grunt: [0x6b7280, 0x2b2f38, 0xff3b1f], drone: [0x55606e, 0x22262e, 0x38f2ff], heavy: [0x7a2e24, 0x2a1e1c, 0xffaa00], turret: [0x5a6148, 0x24271f, 0xff2222], titan: [0x7a5a3a, 0x2a2420, 0xff6a00] }[sub] || [0x6b7280, 0x2b2f38, 0xff3b1f];
  const hull = mat(pal[0], { metal: 0.55, rough: 0.62, emissive: 0x0d0f14 }), dark = mat(pal[1], { metal: 0.6, rough: 0.6, emissive: 0x060709 }), glow = glowMat(pal[2]);
  let m;
  if (sub === 'drone') m = buildDrone(hull, dark, glow);
  else if (sub === 'titan') m = buildTitan(hull, dark, glow);
  else if (sub === 'turret') m = buildTurret(hull, dark, glow);
  else { m = buildScoutMech(hull, dark, glow, sub === 'heavy'); if (sub === 'heavy') m.scale.setScalar(1.12); }
  const root = new THREE.Group(); root.add(m);
  addRim(hull, 0x9fc4ff, 0.42); addRim(dark, 0x9fc4ff, 0.42);
  root.userData = { proc: m, mats: [hull, dark], glow, phase: Math.random() * 6 };
  return root;
}

function buildPropMesh(sub) {
  const g = new THREE.Group();
  const wood = mat(0x7a5530, { rough: 0.85, metal: 0 }), steel = mat(0x5b6472, { metal: 0.65, rough: 0.5 }), darkS = mat(0x2a2e35, { metal: 0.6, rough: 0.55 });
  switch (sub) {
    case 'crate': box(g, 0.6, 0.6, 0.6, wood, 0, 0.3, 0); box(g, 0.62, 0.06, 0.62, steel, 0, 0.57, 0); box(g, 0.62, 0.06, 0.62, steel, 0, 0.03, 0); box(g, 0.08, 0.6, 0.62, steel, 0, 0.3, 0); break;
    case 'crate_tall': box(g, 0.64, 0.6, 0.64, wood, 0, 0.3, 0); box(g, 0.5, 0.5, 0.5, mat(0x3f5a2a, { rough: 0.8 }), 0.02, 0.85, 0.02).rotation.y = 0.3; box(g, 0.66, 0.05, 0.66, steel, 0, 0.6, 0); break;
    case 'barrel': { const red = mat(0x8f1d1a, { metal: 0.4, rough: 0.55 }); cyl(g, 0.21, 0.21, 0.62, 12, red, 0, 0.31, 0); cyl(g, 0.215, 0.215, 0.04, 12, steel, 0, 0.2, 0); cyl(g, 0.215, 0.215, 0.04, 12, steel, 0, 0.45, 0); cyl(g, 0.12, 0.12, 0.012, 10, glowMat(0x9dff3a), 0, 0.626, 0); box(g, 0.12, 0.1, 0.01, glowMat(0xffc21a), 0, 0.33, 0.212); break; }
    case 'pillar': cyl(g, 0.2, 0.24, 1.6, 8, steel, 0, 0.8, 0); box(g, 0.54, 0.12, 0.54, darkS, 0, 0.06, 0); box(g, 0.05, 0.6, 0.02, glowMat(0x38bdf8), 0, 0.8, 0.22); break;
    case 'desk': box(g, 0.9, 0.05, 0.5, steel, 0, 0.42, 0); [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]].forEach(p => box(g, 0.05, 0.42, 0.05, darkS, p[0], 0.21, p[1])); box(g, 0.32, 0.2, 0.03, darkS, 0.1, 0.56, -0.1).rotation.x = -0.2; box(g, 0.28, 0.16, 0.01, glowMat(0x1aa7ff), 0.1, 0.56, -0.08).rotation.x = -0.2; break;
    case 'terminal': box(g, 0.44, 0.9, 0.34, darkS, 0, 0.45, 0); box(g, 0.36, 0.26, 0.02, glowMat(0x22ff99), 0, 0.68, 0.17); box(g, 0.4, 0.06, 0.2, steel, 0, 0.45, 0.22).rotation.x = 0.4; break;
    case 'server': { box(g, 0.7, 1.3, 0.6, darkS, 0, 0.65, 0); for (let i = 0; i < 8; i++) { box(g, 0.6, 0.11, 0.02, steel, 0, 0.18 + i * 0.14, 0.305); box(g, 0.04, 0.03, 0.01, glowMat(i % 3 ? 0x38f2ff : 0x48ff7a), 0.22, 0.18 + i * 0.14, 0.32); } break; }
    case 'pipes': [-0.12, 0.05, 0.16].forEach((x, i) => { cyl(g, 0.06 + i * 0.015, 0.06 + i * 0.015, 1.6, 8, i === 1 ? mat(0x7b4a1e, { metal: 0.5 }) : steel, x, 0.8, (i % 2) * 0.08); }); box(g, 0.4, 0.06, 0.25, darkS, 0, 0.5, 0.04); break;
    case 'generator': box(g, 0.9, 0.6, 0.6, mat(0x5d6a2c, { metal: 0.4, rough: 0.7 }), 0, 0.3, 0); cyl(g, 0.2, 0.2, 0.7, 10, steel, 0, 0.75, 0); box(g, 0.3, 0.12, 0.02, glowMat(0xffb020), 0.2, 0.42, 0.31); box(g, 0.94, 0.05, 0.64, darkS, 0, 0.62, 0); break;
    case 'locker': for (let i = 0; i < 3; i++) { box(g, 0.25, 1.2, 0.4, mat(0x3c4f66, { metal: 0.6 }), -0.27 + i * 0.27, 0.6, 0); box(g, 0.12, 0.02, 0.01, darkS, -0.27 + i * 0.27, 1.05, 0.205); } break;
    case 'lamp': cyl(g, 0.025, 0.035, 1.1, 6, steel, 0, 0.55, 0); box(g, 0.26, 0.04, 0.26, darkS, 0, 0.02, 0); { const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glowMat(0xffd08a)); b.position.y = 1.14; g.add(b); } break;
    case 'cone': { const o = mat(0xff6a00, { metal: 0, rough: 0.6 }); cyl(g, 0.02, 0.12, 0.34, 10, o, 0, 0.19, 0); box(g, 0.28, 0.03, 0.28, o, 0, 0.015, 0); cyl(g, 0.07, 0.085, 0.05, 10, glowMat(0xffffff), 0, 0.22, 0); break; }
    case 'debris': for (let i = 0; i < 6; i++) { const b = box(g, rand(0.08, 0.22), rand(0.04, 0.1), rand(0.08, 0.2), i % 2 ? mat(0x6b6b66, { metal: 0 }) : darkS, rand(-0.3, 0.3), 0.04, rand(-0.3, 0.3)); b.rotation.set(rand(-0.4, 0.4), rand(0, 3), rand(-0.4, 0.4)); } break;
    case 'sandbags': { const s = mat(0x6e6448, { metal: 0, rough: 0.95 }); for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) { const b = box(g, 0.32, 0.14, 0.22, s, -0.32 + i * 0.32 + (r % 2) * 0.08, 0.07 + r * 0.14, 0); b.scale.set(1, 1, 1); } break; }
    default: box(g, 0.4, 0.4, 0.4, steel, 0, 0.2, 0);
  }
  return g;
}

function buildWeaponMesh(idx) {
  // First-person weapon, in camera space, barrel pointing down -Z.
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const body = mat(0x272a30, { metal: 0.8, rough: 0.5, emissive: 0x0c0d10 }), dark = mat(0x1b1e24, { metal: 0.6, rough: 0.5, emissive: 0x0a0b0e });
  const acc = glowMat([0xffb020, 0x38bdf8, 0xf97316, 0x22d3ee, 0x7cff4f, 0xff3b30][idx] || 0xffffff);
  let mz = -0.3;
  if (idx === 0) { // wrench
    box(inner, 0.035, 0.035, 0.34, mat(0x8a8f98, { metal: 0.9, rough: 0.3 }), 0, 0, -0.12);
    box(inner, 0.1, 0.03, 0.06, mat(0x8a8f98, { metal: 0.9, rough: 0.3 }), 0, 0, -0.3); box(inner, 0.04, 0.04, 0.12, mat(0xaa2222, { metal: 0.1 }), 0, 0, 0.02); mz = -0.32;
  } else if (idx === 1) { // Pulse Cannon — procedural port of early DYSTOPIA v2 default (commit 16322b7)
    const rust = mat(0x5c4030, { metal: 0.55, rough: 0.55 }), grip = mat(0x1a1510, { metal: 0.3, rough: 0.7 });
    const coilM = glowMat(0xf59e0b), flesh = mat(0x6b3a2a, { metal: 0.1, rough: 0.85 }), bodyP = mat(0x2a241c, { metal: 0.75, rough: 0.38 });
    box(inner, 0.07, 0.084, 0.24, bodyP, 0, 0, -0.02);
    cyl(inner, 0.038, 0.046, 0.24, 12, rust, 0, 0.01, -0.2).rotation.x = Math.PI / 2;
    cyl(inner, 0.015, 0.017, 0.18, 10, bodyP, 0, 0.01, -0.34).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.008, 6, 14), coilM);
      coil.position.set(0, 0.01, -0.14 - i * 0.05); inner.add(coil);
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.004, 4, 10), flesh);
      wrap.position.copy(coil.position); wrap.rotation.z = 0.4; inner.add(wrap);
    }
    box(inner, 0.026, 0.042, 0.034, coilM, 0.044, 0.025, -0.04);
    box(inner, 0.026, 0.042, 0.034, coilM, 0.044, 0.025, -0.09);
    for (let i = 0; i < 4; i++) box(inner, 0.01, 0.017, 0.034, rust, -0.038, 0.034, -0.1 - i * 0.034);
    box(inner, 0.017, 0.013, 0.15, bodyP, 0, 0.058, -0.06);
    cyl(inner, 0.015, 0.015, 0.07, 10, rust, 0, 0.084, -0.02).rotation.x = Math.PI / 2;
    box(inner, 0.03, 0.076, 0.042, grip, 0, -0.067, 0.02).rotation.x = 0.35;
    box(inner, 0.034, 0.042, 0.092, rust, 0, 0, 0.13);
    box(inner, 0.012, 0.008, 0.04, acc, 0, 0.05, -0.08);
    inner.scale.setScalar(0.62); // keep the v2 silhouette, but at a compact first-person size
    mz = -0.27;
  } else if (idx === 2) { // shotgun
    box(inner, 0.07, 0.08, 0.32, body, 0, 0, -0.12); cyl(inner, 0.022, 0.022, 0.36, 8, dark, -0.017, 0.015, -0.38).rotation.x = Math.PI / 2; cyl(inner, 0.022, 0.022, 0.36, 8, dark, 0.017, 0.015, -0.38).rotation.x = Math.PI / 2;
    box(inner, 0.06, 0.05, 0.14, mat(0x5a3a1e, { metal: 0 }), 0, -0.035, -0.34); box(inner, 0.05, 0.13, 0.05, dark, 0, -0.09, -0.02).rotation.x = 0.3; box(inner, 0.072, 0.012, 0.16, acc, 0, 0.044, -0.12); mz = -0.56;
  } else if (idx === 3) { // pulse rifle
    box(inner, 0.06, 0.09, 0.42, body, 0, 0, -0.18); box(inner, 0.05, 0.12, 0.05, dark, 0, -0.09, -0.06).rotation.x = 0.3; box(inner, 0.04, 0.12, 0.06, dark, 0, -0.09, -0.24);
    cyl(inner, 0.016, 0.016, 0.2, 6, dark, 0, 0.005, -0.48).rotation.x = Math.PI / 2; box(inner, 0.03, 0.04, 0.12, dark, 0, 0.065, -0.16); box(inner, 0.062, 0.012, 0.24, acc, 0, 0.047, -0.22); mz = -0.58;
  } else if (idx === 4) { // plasma
    box(inner, 0.09, 0.1, 0.34, body, 0, 0, -0.14); const coil = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12), acc);
    [-0.2, -0.27, -0.34].forEach(z => { const c2 = coil.clone(); c2.position.z = z; inner.add(c2); }); cyl(inner, 0.025, 0.03, 0.22, 8, dark, 0, 0, -0.32).rotation.x = Math.PI / 2;
    box(inner, 0.05, 0.12, 0.05, dark, 0, -0.09, -0.03).rotation.x = 0.3; mz = -0.46;
  } else { // rocket launcher
    cyl(inner, 0.07, 0.07, 0.6, 10, body, 0.02, 0.02, -0.2).rotation.x = Math.PI / 2; cyl(inner, 0.075, 0.075, 0.04, 10, acc, 0.02, 0.02, -0.5).rotation.x = Math.PI / 2;
    box(inner, 0.05, 0.13, 0.05, dark, 0, -0.1, -0.08).rotation.x = 0.3; box(inner, 0.03, 0.05, 0.1, dark, 0.02, 0.1, -0.18); mz = -0.52;
  }
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), new THREE.MeshBasicMaterial({ color: idx === 4 ? 0x9dff6a : idx === 1 ? 0x7dd3fc : 0xffd27a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  flash.position.set(0, 0.01, mz - 0.03); flash.scale.set(1, 1, 2.2); flash.visible = false; g.add(flash);
  g.userData = { flash, inner };
  g.scale.setScalar(0.72);
  return g;
}

function buildPickupMesh(sub) {
  const g = new THREE.Group(), inner = new THREE.Group(); inner.position.y = 0.24; g.add(inner);
  const white = mat(0xd9dde2, { metal: 0.1, rough: 0.5 });
  if (sub === 'health' || sub === 'medkit') {
    const s = sub === 'medkit' ? 1.4 : 1;
    box(inner, 0.24 * s, 0.16 * s, 0.16 * s, white); const red = glowMat(0xff2a2a); box(inner, 0.12 * s, 0.04 * s, 0.17 * s, red); box(inner, 0.04 * s, 0.12 * s, 0.17 * s, red);
  } else if (sub.indexOf('armor') === 0) {
    const c = sub === 'armor' ? 0x2f8f3a : 0x2d6cdf; box(inner, 0.3, 0.32, 0.1, mat(c, { metal: 0.5, rough: 0.4 })); box(inner, 0.1, 0.12, 0.12, mat(c, { metal: 0.5 }), -0.15, 0.12, 0); box(inner, 0.1, 0.12, 0.12, mat(c, { metal: 0.5 }), 0.15, 0.12, 0); box(inner, 0.12, 0.04, 0.11, glowMat(0x9dffb0), 0, 0.02, 0);
  } else if (sub.indexOf('ammo_') === 0) {
    const col = { ammo_bullets: 0x4b5d23, ammo_shells: 0x7a2a1a, ammo_cells: 0x1d4f6b, ammo_rockets: 0x5a5a5a }[sub];
    box(inner, 0.26, 0.15, 0.17, mat(col, { metal: 0.3 })); box(inner, 0.27, 0.03, 0.18, glowMat(sub === 'ammo_cells' ? 0x38f2ff : 0xffc21a), 0, 0.03, 0);
  } else if (sub.indexOf('key_') === 0) {
    const col = new THREE.Color(KEY_COLORS[sub.slice(4)]); box(inner, 0.2, 0.13, 0.02, glowMat(col)); box(inner, 0.06, 0.03, 0.025, glowMat(0x111111), -0.05, 0.03, 0);
  } else if (sub.indexOf('w_') === 0) {
    const idx = { w_shotgun: 2, w_rifle: 3, w_plasma: 4, w_rocket: 5 }[sub]; const w = buildWeaponMesh(idx); w.scale.setScalar(1.0); w.rotation.y = Math.PI / 2; w.position.x = -0.25; inner.add(w);
  } else {
    inner.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0e7490, roughness: 0.2, metalness: 0.3, flatShading: true })));
  }
  // soft glow disc under every pickup so it reads in the dark
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 20), new THREE.MeshBasicMaterial({ color: sub.indexOf('key_') === 0 ? KEY_COLORS[sub.slice(4)] : (sub.indexOf('health') === 0 || sub === 'medkit' ? 0xff4040 : 0xffc21a), transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; g.add(ring);
  g.userData.spin = inner;
  return g;
}
function buildExitMesh() {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.05, 20), mat(0x22303a, { metal: 0.7 })); pad.position.y = 0.025; g.add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 24), glowMat(0x2dffb0)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.2, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x2dffb0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.position.y = 0.65; g.add(beam); g.userData.beam = beam;
  return g;
}
function buildLightFixture(color, onCeiling) {
  const g = new THREE.Group();
  const housing = mat(0x23272e, { metal: 0.7 });
  if (onCeiling) { box(g, 0.3, 0.05, 0.12, housing, 0, 0.03, 0); box(g, 0.26, 0.02, 0.08, glowMat(color), 0, 0, 0); cyl(g, 0.006, 0.006, 0.2, 3, housing, 0, 0.12, 0); }
  else { const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), glowMat(color)); g.add(b); cyl(g, 0.05, 0.03, 0.05, 8, housing, 0, 0.05, 0); cyl(g, 0.008, 0.008, 1.2, 4, housing, 0, -0.6, 0); }
  return g;
}

/* ---------- Optional GLB models (custom uploads / URLs) ----------
   If a project assigns a model to a "slot" (e.g. enemy_grunt), we load it
   and auto-size it with a bounding box (Box3) so it stands ON the floor:
   position.y = -min.y * scale   (lifts the lowest point to y = 0). */
const glbCache = {};
function loadGlb(src) {
  if (!THREE.GLTFLoader || !src) return Promise.resolve(null);
  if (!glbCache[src]) glbCache[src] = new Promise(res => {
    // Many exported models carry their own sun lights/cameras (Blender exports). Strip them, or every
    // enemy/prop copy adds a bright white light to the level and blows the scene out.
    const strip = g => { const rm = []; g.scene.traverse(o => { if (o.isLight || o.isCamera) rm.push(o); }); rm.forEach(o => o.parent && o.parent.remove(o)); return g; };
    try { new THREE.GLTFLoader().load(src, g => res(strip(g)), undefined, err => { console.warn('RetroEngine: model failed to load', String(src).slice(0, 80), err && err.message); res(null); }); }
    catch (e) { res(null); }
  });
  return glbCache[src];
}
function normalizeModel(scene, height, centered) {
  const holder = new THREE.Group(), model = cloneSkinned(scene); holder.add(model);
  model.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(model); if (b.isEmpty()) return null;
  const size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  const s = height / Math.max(size.y, 1e-4);
  model.scale.multiplyScalar(s);
  model.position.set(-c.x * s, centered ? -c.y * s : -b.min.y * s, -c.z * s);
  model.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material && o.material.map) o.material.map.encoding = THREE.sRGBEncoding; } });
  return holder;
}

/* ---------- Built-in asset pack (CC0 models by Quaternius, see CREDITS.md) ----------
   Rigged characters: a SkinnedMesh bends its vertices with a skeleton of "bones".
   An AnimationClip stores bone keyframes (walk, shoot, die...). An AnimationMixer
   plays clips and cross-fades between them every frame with mixer.update(dt).
   Skinned meshes must be cloned with SkeletonUtils.clone so each enemy gets its
   OWN skeleton (a plain clone would make every copy share one set of bones).
   If a file can't load (offline / opened from file://) the procedural model stays. */
// Music player playlist (assets/music). All CC BY 4.0 — credits are shown in-game and in CREDITS.md.
const MUSIC_TRACKS = [
  { id: 'metalmania', file: 'assets/music/metalmania.mp3', title: 'Metalmania', artist: 'Kevin MacLeod', genre: 'Metal', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700023' },
  { id: 'seismic', file: 'assets/music/seismic.mp3', title: 'Seismic', artist: 'Shane Ivers', genre: 'Trap', license: 'CC BY 4.0', url: 'https://www.silvermansound.com/free-music/seismic' },
  { id: 'aggressor', file: 'assets/music/aggressor.mp3', title: 'Aggressor', artist: 'Kevin MacLeod', genre: 'Orchestral metal', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700051' },
  { id: 'lewis_and_dekalb', file: 'assets/music/lewis_and_dekalb.mp3', title: 'Lewis and Dekalb', artist: 'Kevin MacLeod', genre: 'Trap', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600027' },
  { id: 'griphop', file: 'assets/music/griphop.mp3', title: 'Griphop', artist: 'Kevin MacLeod', genre: 'Hip-hop', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100413' }
];
const HOSTED_BASE = 'https://ddemby424.github.io/dystopia-project-moses/retroengine/';
const ENEMY_CLIPS = { idle: ['Idle_Gun', 'Idle'], move: ['Run', 'Walk'], shoot: ['Gun_Shoot', 'Idle_Gun_Shoot', 'Shoot', 'Attack'], hit: ['HitRecieve', 'HitReact', 'HitRecieve_1'], death: ['Death', 'Dead'] };
const ASSET_PACK = {
  enemy_grunt: { src: 'assets/models/soldier_swat.glb', h: 1.12, tint: 0.72 },
  enemy_drone: { src: 'assets/models/robot_flying_gun.glb', h: 0.46, tint: 0.7 },
  enemy_heavy: { src: 'assets/models/robot_legs_gun.glb', h: 1.3, tint: 0.62 },
  enemy_titan: { src: 'assets/models/robot_large_gun.glb', h: 1.45, tint: 0.55 },
  weapon_2: { src: 'assets/models/gun_shotgun.glb', len: 0.66 },
  weapon_3: { src: 'assets/models/gun_rifle.glb', len: 0.64 },
  weapon_4: { src: 'assets/models/gun_scifi_rifle.glb', len: 0.58 },
  weapon_5: { src: 'assets/models/gun_rocket.glb', len: 0.5, flip: true, off: [0.06, -0.05, 0.02] }
};
function cloneSkinned(o) { return (THREE.SkeletonUtils && THREE.SkeletonUtils.clone) ? THREE.SkeletonUtils.clone(o) : o.clone(true); }
function findClip(anims, names) { for (const n of names) { const c = anims.find(a => a.name.split('|').pop().toLowerCase() === n.toLowerCase()); if (c) return c; } return null; }
// Gritty pass for bright low-poly assets: darker albedo, rougher/more metallic surfaces.
function grittify(root, tint, metal) {
  const mats = [];
  root.traverse(o => { if (!o.isMesh || !o.material) return; o.material = o.material.clone(); const m = o.material;
    if (m.color) m.color.multiplyScalar(tint || 0.75); if ('roughness' in m) { m.roughness = Math.max(0.55, m.roughness * 0.9); m.metalness = Math.max(metal || 0.3, m.metalness); }
    if (m.emissive && !m.emissiveMap) m.emissive.setRGB(0, 0, 0); mats.push(m); o.castShadow = false; o.frustumCulled = false; });
  return mats;
}
// First-person gun from a static GLB: lay its longest axis along -Z (barrel away from the camera).
function buildGunFromGlb(scene, spec) {
  const obj = new THREE.Group(), model = scene.clone(true), pivot = new THREE.Group(); pivot.add(model); obj.add(pivot);
  let b = new THREE.Box3().setFromObject(model); if (b.isEmpty()) return null;
  let sz = b.getSize(new THREE.Vector3());
  if (sz.x > sz.z) pivot.rotation.y = Math.PI / 2;           // long axis X -> Z
  if (spec.flip) pivot.rotation.y += Math.PI;                // barrel was pointing at the camera
  pivot.updateMatrixWorld(true); b = new THREE.Box3().setFromObject(pivot); sz = b.getSize(new THREE.Vector3());
  const s = spec.len / Math.max(sz.z, 1e-4); pivot.scale.setScalar(s);
  pivot.updateMatrixWorld(true); b = new THREE.Box3().setFromObject(pivot); const c = b.getCenter(new THREE.Vector3());
  const o = spec.off || [0, 0, 0]; pivot.position.set(-c.x + o[0], -c.y + o[1], -c.z - spec.len * 0.22 + o[2]);
  grittify(model, 0.85, 0.55);
  return { obj, muzzleZ: -spec.len * 0.72 - 0.02, muzzleY: (b.max.y - c.y) * 0.4 };
}

/* ---------- In-game UI styles (injected once; shared by playtest and exported games) ---------- */
const GAME_CSS = `
.dfg-root{position:absolute;inset:0;overflow:hidden;background:#000;font-family:'Chakra Petch','Segoe UI',system-ui,sans-serif;color:#e8edf5;user-select:none;-webkit-user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent}
.dfg-root canvas.dfg-view{position:absolute;inset:0;width:100%;height:100%;display:block}
.dfg-hud{position:absolute;inset:0;pointer-events:none}.dfg-root .dfg-hud,.dfg-root .dfg-touch{top:env(safe-area-inset-top,0px);right:env(safe-area-inset-right,0px);bottom:env(safe-area-inset-bottom,0px);left:env(safe-area-inset-left,0px)}.dfg-root .dfg-topbtns{top:calc(12px + env(safe-area-inset-top,0px));right:calc(154px + env(safe-area-inset-right,0px))}.dfg-root .dfg-menu{padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}.dfg-rot{display:none;margin-top:10px;font-size:12px;color:#ffc21a;opacity:.9}.dfg-root.nogl .dfg-panel{max-width:440px;padding:20px;background:rgba(14,18,26,.92);border-radius:16px}.dfg-root,.dfg-root *{-webkit-touch-callout:none}
.dfg-glass{background:rgba(10,14,22,.62);border:1px solid rgba(255,255,255,.09);border-radius:12px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 6px 24px rgba(0,0,0,.35)}
.dfg-tl{position:absolute;left:12px;top:10px;padding:8px 12px;max-width:46%}
.dfg-lvl{font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#ffb35c}
.dfg-obj{font-size:12px;opacity:.85;margin-top:2px}
.dfg-mini{position:absolute;right:12px;top:10px;width:132px;height:132px;border-radius:50%;border:2px solid rgba(255,255,255,.14);background:rgba(4,6,10,.65);box-shadow:0 0 0 4px rgba(0,0,0,.25)}
.dfg-topbtns{position:absolute;right:154px;top:12px;display:flex;gap:8px;pointer-events:auto}
.dfg-ibtn{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:16px;color:#fff;cursor:pointer;border:1px solid rgba(255,255,255,.12);background:rgba(10,14,22,.6)}
.dfg-ibtn svg{width:18px;height:18px}
.dfg-msgs{position:absolute;left:50%;top:18%;transform:translateX(-50%);text-align:center;font-size:15px;font-weight:700;text-shadow:0 2px 6px #000;letter-spacing:.5px}
.dfg-msgs div{animation:dfgfade 3s forwards;margin:4px 0}
@keyframes dfgfade{0%{opacity:0;transform:translateY(6px)}8%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}
.dfg-cross{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px}
.dfg-cross:before,.dfg-cross:after{content:'';position:absolute;background:rgba(255,255,255,.85);box-shadow:0 0 3px #000}
.dfg-cross:before{left:10px;top:2px;width:2px;height:18px;clip-path:polygon(0 0,100% 0,100% 30%,0 30%,0 70%,100% 70%,100% 100%,0 100%)}
.dfg-cross:after{top:10px;left:2px;height:2px;width:18px;clip-path:polygon(0 0,30% 0,30% 100%,0 100%,0 0,70% 0,100% 0,100% 100%,70% 100%)}
.dfg-hit{position:absolute;left:50%;top:50%;width:30px;height:30px;margin:-15px 0 0 -15px;opacity:0;transition:opacity .15s;background:
linear-gradient(45deg,transparent 46%,#ff5a3c 46%,#ff5a3c 54%,transparent 54%),linear-gradient(-45deg,transparent 46%,#ff5a3c 46%,#ff5a3c 54%,transparent 54%);-webkit-mask:radial-gradient(circle,transparent 7px,#000 8px);mask:radial-gradient(circle,transparent 7px,#000 8px)}
.dfg-bottom{position:absolute;left:12px;right:12px;bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;gap:10px}
.dfg-stat{padding:8px 12px;min-width:118px}
.dfg-stat .lab{font-size:10px;letter-spacing:1.5px;opacity:.7;text-transform:uppercase}
.dfg-stat .val{font-size:26px;font-weight:700;line-height:1}
.dfg-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.12);margin-top:5px;overflow:hidden}
.dfg-bar i{display:block;height:100%;width:50%;background:linear-gradient(90deg,#ff3b3b,#ff8a3d);transition:width .2s}
.dfg-bar.arm i{background:linear-gradient(90deg,#2d8bff,#2de2ff)}
.dfg-left{display:flex;gap:8px;align-items:flex-end}
.dfg-keys{display:flex;gap:5px;padding:8px}
.dfg-keys b{width:14px;height:20px;border-radius:3px;opacity:.15;border:1px solid rgba(255,255,255,.4)}
.dfg-keys b.on{opacity:1;box-shadow:0 0 10px currentColor}
.dfg-ammo{text-align:right}
.dfg-ammo .wn{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#ffb35c}
.dfg-wslots{display:flex;gap:4px;justify-content:flex-end;margin-top:5px}
.dfg-wslots span{font-size:10px;width:16px;height:16px;border-radius:4px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);opacity:.25}
.dfg-wslots span.own{opacity:.75}.dfg-wslots span.cur{background:#ff7a1a;color:#111;opacity:1}
.dfg-vig{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,transparent 45%,rgba(200,0,0,.65) 100%)}
.dfg-pick{position:absolute;inset:0;pointer-events:none;opacity:0;background:rgba(255,210,120,.18)}
.dfg-fps{position:absolute;left:12px;top:64px;font-size:11px;opacity:.7;display:none}
.dfg-big{position:absolute;inset:0;background:rgba(0,0,0,.78);display:none;align-items:center;justify-content:center;pointer-events:auto}
.dfg-big canvas{max-width:92%;max-height:86%;image-rendering:pixelated;border-radius:10px;border:1px solid rgba(255,255,255,.15)}
.dfg-menu{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(10,12,18,.55),rgba(0,0,0,.85));pointer-events:auto;z-index:20}
.dfg-panel{width:min(420px,92vw);max-height:88%;overflow:auto;padding:20px 20px 16px}
.dfg-panel h1{margin:0 0 4px;font-size:26px;letter-spacing:3px;color:#ff8a3d;text-shadow:0 0 18px rgba(255,120,40,.35);font-weight:700}
.dfg-panel h2{margin:0 0 12px;font-size:13px;opacity:.75;font-weight:600;letter-spacing:1px}
.dfg-panel p{font-size:13px;opacity:.85;line-height:1.45;margin:8px 0}
.dfg-btn{display:block;width:100%;margin:8px 0;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font:inherit;font-size:14px;font-weight:700;letter-spacing:1px;cursor:pointer;text-transform:uppercase}
.dfg-btn:hover{background:rgba(255,255,255,.12)}
.dfg-tracks{display:flex;flex-direction:column;gap:6px;margin:8px 0;max-height:46vh;overflow:auto}.dfg-trk{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#e8edf5;font:inherit;text-align:left;cursor:pointer}.dfg-trk b{font-size:14px}.dfg-trk span{font-size:11px;opacity:.65}.dfg-trk.on{border-color:#ff8a3d;background:rgba(255,138,61,.14)}
.dfg-btn.pri{background:linear-gradient(180deg,#ff8a3d,#e0561a);border-color:#ff9d5c;color:#160800}
.dfg-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:9px 0;font-size:13px}
.dfg-row input[type=range]{flex:1;max-width:55%;accent-color:#ff7a1a}
.dfg-row select{background:#121722;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:6px;font:inherit}
.dfg-stats{display:grid;grid-template-columns:1fr auto;gap:6px 12px;font-size:14px;margin:12px 0}
.dfg-stats b{color:#ffb35c;text-align:right}
.dfg-ctrl{font-size:12px;opacity:.8;display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:10px 0}
.dfg-ctrl kbd{background:rgba(255,255,255,.1);border-radius:4px;padding:1px 6px;font-family:inherit}
.dfg-touch{position:absolute;inset:0;display:none;pointer-events:none}
.dfg-touch.on{display:block}
.dfg-zone{position:absolute;top:0;bottom:0;pointer-events:auto}
.dfg-joy{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:2px solid rgba(255,255,255,.22);background:rgba(255,255,255,.06);display:none}
.dfg-joy i{position:absolute;left:50%;top:50%;width:50px;height:50px;margin:-25px 0 0 -25px;border-radius:50%;background:rgba(255,255,255,.45)}
.dfg-tb{position:absolute;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;letter-spacing:1px;color:#fff;border:2px solid rgba(255,255,255,.3);background:rgba(12,16,24,.55);pointer-events:auto;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.dfg-tb.down{background:rgba(255,122,26,.75);color:#120800}
.dfg-tb.fire{width:84px;height:84px;right:22px;bottom:84px;background:rgba(255,90,40,.5);font-size:14px}
.dfg-tb.jump{width:58px;height:58px;right:118px;bottom:40px}
.dfg-tb.use{width:58px;height:58px;right:22px;bottom:180px}
.dfg-tb.swap{width:50px;height:50px;right:124px;bottom:112px;font-size:10px}
.dfg-tb.reload{width:50px;height:50px;right:186px;bottom:112px;font-size:10px}
.dfg-tb.run{width:50px;height:50px;left:22px;bottom:170px;font-size:10px}
.dfg-tb.run.on{background:rgba(45,226,255,.6);color:#001}
.dfg-start-hint{position:absolute;left:0;right:0;bottom:22%;text-align:center;font-size:13px;opacity:.6}
.dfg-root.touch .dfg-bottom{bottom:auto;top:62px;left:12px;right:auto;flex-direction:column;align-items:flex-start;transform:scale(.82);transform-origin:top left}
.dfg-root.touch .dfg-ammo{text-align:left}.dfg-root.touch .dfg-wslots{justify-content:flex-start}@media (max-height:500px) and (max-width:640px){.dfg-root.touch .dfg-bottom{transform:translateX(-50%) scale(.52)!important;left:calc(50% - 44px)!important}}@media (max-height:340px){.dfg-root.touch .dfg-mini{width:70px!important;height:70px!important}.dfg-root.touch .dfg-topbtns{right:calc(90px + env(safe-area-inset-right,0px))!important}}@media (max-height:500px){.dfg-root.touch .dfg-bottom{top:auto;bottom:6px;left:50%;right:auto;flex-direction:row;align-items:flex-end;transform:translateX(-50%) scale(.64);transform-origin:bottom center;flex-wrap:nowrap}.dfg-root.touch .dfg-left{flex-wrap:nowrap}.dfg-root.touch .dfg-mini{width:84px;height:84px}.dfg-root.touch .dfg-topbtns{right:calc(106px + env(safe-area-inset-right,0px));top:calc(8px + env(safe-area-inset-top,0px))}.dfg-root.touch .dfg-tl{transform:scale(.82);transform-origin:top left}.dfg-root.touch .dfg-tb.use{bottom:172px}.dfg-root.touch .dfg-tb.run{bottom:150px}}
@media (max-width:520px){.dfg-mini{width:96px;height:96px}.dfg-topbtns{right:116px}.dfg-root .dfg-topbtns{right:calc(12px + env(safe-area-inset-right,0px));top:calc(114px + env(safe-area-inset-top,0px));flex-direction:column}.dfg-tl{max-width:calc(100% - 300px);min-width:120px}.dfg-tl .dfg-lvl,.dfg-tl>*{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dfg-lvl{font-size:12px;letter-spacing:1px}.dfg-stat .val{font-size:20px}.dfg-stat{min-width:90px}}
`;
function injectCss() {
  if (document.getElementById('dfg-style')) return;
  const st = document.createElement('style'); st.id = 'dfg-style'; st.textContent = GAME_CSS; document.head.appendChild(st);
}
const ICON = {
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/></svg>',
  fs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/></svg>'
};

/* =====================================================================
   LEVEL HELPERS (also used by the editor)
   A level is a grid. Each cell index i = y * w + x has:
     wall[i]  texture id of a solid wall, or ''  (empty = walkable)
     kind[i]  ''  normal | 'door' | 'red' | 'blue' | 'yellow' (locked doors)
     floor[i] floor texture ('' = level default)
     ceil[i]  ceiling texture ('' = default, 'sky' = open air)
     fh[i]    floor height (0 = ground, 0.15 steps = stairs, 0.6 = catwalk)
   ===================================================================== */
const SKIES = {
  night:    { name: 'Night City',   top: '#03050b', mid: '#0c1322', hor: '#3a2c2a', glow: '#ff7a2a', stars: true },
  dusk:     { name: 'Red Dusk',     top: '#140a14', mid: '#3b1620', hor: '#b2492a', glow: '#ff9a40', stars: false },
  overcast: { name: 'Overcast',     top: '#2b3036', mid: '#4a5058', hor: '#6e737a', glow: '#8a8f96', stars: false },
  toxic:    { name: 'Toxic Haze',   top: '#06120a', mid: '#14301a', hor: '#4d6b1e', glow: '#a6ff3a', stars: false },
  void:     { name: 'Black Void',   top: '#000000', mid: '#020203', hor: '#08080a', glow: '#101014', stars: true }
};
function defaultProps() {
  return { ambient: '#8a93a8', ambientI: 0.55, sky: 'night', fogColor: '#0a0d14', fog: 0.045, wallH: 1.5, floorTex: 'concrete', ceilTex: 'ceiling', music: true, script: '', par: 180 };
}
function newLevel(name, w, h) {
  w = w || 40; h = h || 32; const n = w * h;
  return { name: name || 'New Level', w, h, wall: new Array(n).fill(''), kind: new Array(n).fill(''), floor: new Array(n).fill(''), ceil: new Array(n).fill(''), fh: new Array(n).fill(0), ents: [], spawn: { x: 2.5, y: 2.5, r: 0 }, props: defaultProps() };
}
// Makes sure any level (old or hand-edited) has every field, so the game never crashes on bad data.
function normalizeLevel(L) {
  L = L || {}; const w = clamp(L.w | 0 || 40, 8, 128), h = clamp(L.h | 0 || 32, 8, 128), n = w * h;
  const arr = (a, def) => { const o = new Array(n); for (let i = 0; i < n; i++) o[i] = (a && a[i] !== undefined && a[i] !== null) ? a[i] : def; return o; };
  const out = { name: L.name || 'Level', w, h, wall: arr(L.wall, ''), kind: arr(L.kind, ''), floor: arr(L.floor, ''), ceil: arr(L.ceil, ''), fh: arr(L.fh, 0).map(v => clamp(+v || 0, 0, 1)), ents: Array.isArray(L.ents) ? L.ents.filter(e => e && isFinite(e.x) && isFinite(e.y)) : [], spawn: Object.assign({ x: 2.5, y: 2.5, r: 0 }, L.spawn || {}), props: Object.assign(defaultProps(), L.props || {}) };
  out.ents.forEach((e, i) => { if (!e.id) e.id = 'e' + Date.now().toString(36) + i; });
  return out;
}
function cellIsSolidStatic(L, x, y) { if (x < 0 || y < 0 || x >= L.w || y >= L.h) return true; const i = y * L.w + x; return !!L.wall[i] && !L.kind[i]; }
// Checks a level for problems. Returns a list of { level: 'error'|'warn', msg }.
function validateLevel(L) {
  const out = [], W = L.w, H = L.h;
  const sx = Math.floor(L.spawn.x), sy = Math.floor(L.spawn.y);
  if (cellIsSolidStatic(L, sx, sy) || L.kind[sy * W + sx]) out.push({ level: 'error', msg: 'Player start is inside a wall or door.' });
  const exits = L.ents.filter(e => e.t === 'exit');
  if (!exits.length) out.push({ level: 'warn', msg: 'No exit pad — the level can only be finished by a script.' });
  L.ents.forEach(e => { const x = Math.floor(e.x), y = Math.floor(e.y); if (cellIsSolidStatic(L, x, y)) out.push({ level: 'warn', msg: `${e.t} "${e.s || ''}" at ${x},${y} is inside a wall.` }); });
  // Flood fill from the start, picking up keys as we go, to see if the exit is reachable.
  const keys = {}; let changed = true, seen;
  while (changed) {
    changed = false; seen = new Uint8Array(W * H); const q = [sy * W + sx]; seen[q[0]] = 1;
    while (q.length) {
      const c = q.pop(), x = c % W, y = (c / W) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
        const nx = x + d[0], ny = y + d[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
        const ni = ny * W + nx; if (seen[ni]) return;
        if (L.wall[ni] && !L.kind[ni]) return;
        const k = L.kind[ni]; if (k && k !== 'door' && !keys[k]) return;
        if (L.fh[ni] - L.fh[c] > STEP_H + 0.001) return;
        seen[ni] = 1; q.push(ni);
      });
    }
    L.ents.forEach(e => { if (e.t === 'pickup' && e.s && e.s.indexOf('key_') === 0) { const k = e.s.slice(4); if (!keys[k] && seen[Math.floor(e.y) * W + Math.floor(e.x)]) { keys[k] = 1; changed = true; } } });
  }
  exits.forEach(e => { if (!seen[Math.floor(e.y) * W + Math.floor(e.x)]) out.push({ level: 'error', msg: `Exit at ${Math.floor(e.x)},${Math.floor(e.y)} can't be reached from the start (check walls, keys, stairs).` }); });
  // Open cells touching the map edge let you see "outside" the world.
  let edge = 0; for (let x = 0; x < W; x++) { if (!L.wall[x]) edge++; if (!L.wall[(H - 1) * W + x]) edge++; } for (let y = 0; y < H; y++) { if (!L.wall[y * W]) edge++; if (!L.wall[y * W + W - 1]) edge++; }
  const reachEdge = []; for (let i = 0; i < W * H; i++) { const x = i % W, y = (i / W) | 0; if (seen[i] && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) reachEdge.push(i); }
  if (reachEdge.length) out.push({ level: 'warn', msg: `The player can reach the map edge (${reachEdge.length} cells). Surround the playable area with walls.` });
  const en = L.ents.filter(e => e.t === 'enemy').length; if (!en) out.push({ level: 'warn', msg: 'No enemies placed.' });
  return { issues: out, reachable: seen, keysFound: Object.keys(keys) };
}

/* ---------- Sky dome: a big inside-out sphere with a painted gradient ---------- */
function makeSky(key) {
  const s = SKIES[key] || SKIES.night, cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256;
  const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, s.top); g.addColorStop(0.42, s.mid); g.addColorStop(0.5, s.hor); g.addColorStop(0.56, '#050505'); g.addColorStop(1, '#020202');
  c.fillStyle = g; c.fillRect(0, 0, 1024, 256);
  if (s.stars) { const r = seeded(5); for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.6})`; c.fillRect(r() * 1024, r() * 110, 1, 1); } }
  // distant city skyline silhouette with glowing windows
  const r2 = seeded(11); let x = 0;
  while (x < 1024) { const bw = 8 + r2() * 26, bh = 6 + r2() * 30; c.fillStyle = '#07080b'; c.fillRect(x, 128 - bh, bw, bh + 6); for (let k = 0; k < bw * bh / 30; k++) if (r2() < 0.35) { c.fillStyle = r2() < 0.5 ? s.glow : '#ffe2a0'; c.globalAlpha = 0.25 + r2() * 0.5; c.fillRect(x + 1 + r2() * (bw - 3), 128 - bh + 1 + r2() * (bh - 2), 1.5, 1); c.globalAlpha = 1; } x += bw + r2() * 4; }
  const hg = c.createLinearGradient(0, 100, 0, 135); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(1, s.glow + '33'); c.fillStyle = hg; c.fillRect(0, 100, 1024, 35);
  const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
  const m = new THREE.Mesh(new THREE.SphereGeometry(45, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -10;
  return m;
}

/* ---------- Build all static level geometry ----------
   Thousands of identical boxes are drawn with InstancedMesh: ONE draw call
   for every wall that shares a texture. That keeps phones fast. */
function buildLevelMeshes(L, group) {
  const W = L.w, H = L.h, wh = L.props.wallH, P = L.props;
  const isWallCell = (x, y) => x < 0 || y < 0 || x >= W || y >= H || (L.wall[y * W + x] && !L.kind[y * W + x]);
  const groups = {}; const add = (k, i) => { (groups[k] = groups[k] || []).push(i); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (L.wall[i] && !L.kind[i]) {
      if (isWallCell(x - 1, y) && isWallCell(x + 1, y) && isWallCell(x, y - 1) && isWallCell(x, y + 1)) continue; // hidden: skip
      add('w|' + L.wall[i], i);
    } else {
      const ft = L.floor[i] || P.floorTex, fh = L.fh[i] || 0;
      add((fh > 0.001 ? 'r|' : 'f|') + ft, i);
      const ct = L.ceil[i] || P.ceilTex; if (ct !== 'sky') add('c|' + ct, i);
    }
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  // Box UVs go 0..1 on every face; scale the side UVs by the height so textures aren't stretched.
  const wallGeo = new THREE.BoxGeometry(1, wh, 1); scaleBoxSideUV(wallGeo, wh);
  const floorGeo = new THREE.PlaneGeometry(1, 1); floorGeo.rotateX(-Math.PI / 2);
  const ceilGeo = new THREE.PlaneGeometry(1, 1); ceilGeo.rotateX(Math.PI / 2);
  const riseGeo = new THREE.BoxGeometry(1, 1, 1); riseGeo.translate(0, 0.5, 0);
  Object.keys(groups).forEach(key => {
    const [type, tex] = key.split('|'), cells = groups[key];
    const geo = type === 'w' ? wallGeo : type === 'f' ? floorGeo : type === 'c' ? ceilGeo : riseGeo;
    const mesh = new THREE.InstancedMesh(geo, getMaterial(tex), cells.length);
    cells.forEach((i, n) => {
      const x = i % W, y = (i / W) | 0;
      pos.set(x + 0.5, type === 'w' ? wh / 2 : type === 'c' ? wh : 0, y + 0.5); sc.set(1, type === 'r' ? Math.max(0.02, L.fh[i]) : 1, 1);
      m4.compose(pos, q, sc); mesh.setMatrixAt(n, m4);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });
}
function scaleBoxSideUV(geo, h) {
  const uv = geo.attributes.uv, nrm = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) if (Math.abs(nrm.getY(i)) < 0.5) uv.setY(i, uv.getY(i) * h);
  uv.needsUpdate = true;
}

/* =====================================================================
   THE GAME.  play(container, project, options) starts a game inside any
   element. Returns a handle with destroy(). Used by the editor's
   Playtest button AND by exported standalone games.
   ===================================================================== */
function play(container, project, opts) {
  opts = opts || {};
  injectCss();
  const levels = (project.levels || []).map(normalizeLevel);
  if (!levels.length) levels.push(newLevel());
  const models = project.models || {};
  // Asset pack lives next to the page (assets/...). Exported games get an absolute base URL.
  // file:// pages can't fetch local files, so fall back to the hosted copy of the asset pack.
  const assetBase = opts.assetBase !== undefined ? opts.assetBase : (project.assetBase || (location.protocol === 'file:' ? HOSTED_BASE : ''));
  const usePack = opts.assets !== false && project.useAssetPack !== false && !!THREE.GLTFLoader;
  const DIFF = { easy: { hp: 0.75, dmg: 0.55, cd: 1.35, speed: 0.9, react: 1.5, flank: 0.15 }, normal: { hp: 1, dmg: 1, cd: 1, speed: 1, react: 1, flank: 0.4 }, hard: { hp: 1.3, dmg: 1.45, cd: 0.72, speed: 1.15, react: 0.6, flank: 0.65 } };
  const diff = () => DIFF[S.difficulty] || DIFF.normal;
  /* ---------- music player: streams tracks from assets/music, synth ambient as fallback ---------- */
  const TP = { audio: null, i: Math.floor(Math.random() * MUSIC_TRACKS.length), cur: null, failed: false, pick: null };
  function music(on) {
    const want = !!on && !!G && G.L.props.music !== false;
    const tr = TP.pick !== null ? TP.pick : (G && G.L.props.track) || '';
    const useTracks = want && usePack && tr !== 'synth' && MUSIC_TRACKS.length > 0 && !TP.failed;
    if (!useTracks) { if (TP.audio) TP.audio.pause(); Sound.music(want); return; }
    Sound.music(false);
    if (!TP.audio) {
      TP.audio = new Audio(); TP.audio.preload = 'auto';
      TP.audio.addEventListener('ended', () => nextTrack(1));
      TP.audio.addEventListener('error', () => { TP.failed = true; TP.cur = null; if (state === 'playing') Sound.music(true); });
    }
    const fixed = MUSIC_TRACKS.findIndex(t => t.id === tr);
    if (fixed >= 0 && TP.cur !== MUSIC_TRACKS[fixed].id) loadTrack(fixed); else if (!TP.cur) loadTrack(TP.i);
    TP.audio.volume = clamp(S.volume * S.music, 0, 1); const pr = TP.audio.play(); if (pr && pr.catch) pr.catch(() => {});
  }
  function loadTrack(i) { TP.i = (i + MUSIC_TRACKS.length) % MUSIC_TRACKS.length; const t = MUSIC_TRACKS[TP.i]; TP.cur = t.id; TP.audio.src = assetBase + t.file; }
  function nextTrack(d) { if (!TP.audio || TP.failed) return; loadTrack(TP.i + d); TP.pick = TP.pick === 'synth' ? null : TP.pick !== null ? MUSIC_TRACKS[TP.i].id : null; const pr = TP.audio.play(); if (pr && pr.catch) pr.catch(() => {}); }
  function slotSrc(slot) { if (models[slot]) return { src: models[slot] }; const p = usePack && ASSET_PACK[slot]; return p ? Object.assign({}, p, { src: assetBase + p.src }) : null; }
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  /* ---------- DOM ---------- */
  const root = el('div', 'dfg-root' + (isTouch ? ' touch' : ''));
  container.appendChild(root);
  let renderer = null;
  if (hasWebGL()) { try { renderer = new THREE.WebGLRenderer({ antialias: Q().aa, powerPreference: 'high-performance' }); } catch (e) { renderer = null; } }
  if (!renderer) {   // no WebGL at all (blocked, very old phone, or GPU blocklisted): explain instead of a blank screen
    root.classList.add('nogl');
    root.innerHTML = `<div class="dfg-menu" style="display:flex"><div class="dfg-panel"><h1>3D NOT AVAILABLE</h1><h2>This browser could not start WebGL</h2><p style="font-size:13px;line-height:1.5;opacity:.85">RetroEngine needs WebGL to draw the 3D game. Try: update your browser, open this page in Chrome, Safari, Firefox or Samsung Internet instead of an in-app browser, turn off battery saver or "lite" mode, and enable hardware acceleration. The level editor still works.</p>${opts.onQuit ? '<button class="dfg-btn pri" data-a="quit">Back to editor</button>' : ''}</div></div>`;
    const qb = root.querySelector('[data-a="quit"]'); if (qb) qb.addEventListener('click', () => opts.onQuit());
    return { nogl: true, game: null, state: 'nogl', destroy() { root.remove(); } };
  }
  let dynScale = 1, adT = 0, adN = 0;  // live resolution scale for quality 'auto'
  renderer.outputEncoding = THREE.sRGBEncoding;            // correct gamma for colors
  renderer.toneMapping = THREE.ACESFilmicToneMapping;       // film-like contrast, nice highlights
  renderer.toneMappingExposure = 1.0;          // ACES filmic; lights are capped below so nothing clips to white
  renderer.autoClear = false;
  renderer.domElement.className = 'dfg-view';
  root.appendChild(renderer.domElement);
  const hud = el('div', 'dfg-hud', `
    <div class="dfg-tl dfg-glass"><div class="dfg-lvl"></div><div class="dfg-obj"></div></div>
    <canvas class="dfg-mini" width="132" height="132"></canvas>
    <div class="dfg-msgs"></div><div class="dfg-cross"></div><div class="dfg-hit"></div>
    <div class="dfg-bottom">
      <div class="dfg-left">
        <div class="dfg-stat dfg-glass"><div class="lab">Health</div><div class="val hp">100</div><div class="dfg-bar"><i class="hpb"></i></div></div>
        <div class="dfg-stat dfg-glass"><div class="lab">Armor</div><div class="val ar">0</div><div class="dfg-bar arm"><i class="arb"></i></div></div>
        <div class="dfg-keys dfg-glass"><b style="color:${KEY_COLORS.red};background:${KEY_COLORS.red}"></b><b style="color:${KEY_COLORS.blue};background:${KEY_COLORS.blue}"></b><b style="color:${KEY_COLORS.yellow};background:${KEY_COLORS.yellow}"></b></div>
      </div>
      <div class="dfg-stat dfg-glass dfg-ammo"><div class="wn"></div><div class="val am">--</div><div class="dfg-wslots"></div></div>
    </div>
    <div class="dfg-vig"></div><div class="dfg-pick"></div><div class="dfg-fps"></div>`);
  root.appendChild(hud);
  const topBtns = el('div', 'dfg-topbtns', `<div class="dfg-ibtn" data-b="light" title="Flashlight (F)">${ICON.light}</div><div class="dfg-ibtn" data-b="map" title="Map (M)">${ICON.map}</div>${FS.ok() ? `<div class="dfg-ibtn" data-b="fs" title="Full screen">${ICON.fs}</div>` : ''}<div class="dfg-ibtn" data-b="pause" title="Pause (Esc)">${ICON.pause}</div>`);
  root.appendChild(topBtns);
  const bigMap = el('div', 'dfg-big', '<canvas></canvas>'); root.appendChild(bigMap);
  const touch = el('div', 'dfg-touch' + (isTouch ? ' on' : ''), `
    <div class="dfg-zone" data-z="move" style="left:0;width:45%"></div><div class="dfg-zone" data-z="look" style="left:45%;right:0"></div>
    <div class="dfg-joy"><i></i></div>
    <div class="dfg-tb run" data-t="run">RUN</div><div class="dfg-tb fire" data-t="fire">FIRE</div><div class="dfg-tb jump" data-t="jump">JUMP</div><div class="dfg-tb use" data-t="use">USE</div><div class="dfg-tb swap" data-t="swap">SWAP</div><div class="dfg-tb reload" data-t="reload">RLD</div>`);
  root.appendChild(touch);
  const menu = el('div', 'dfg-menu'); root.appendChild(menu);
  const $ = s => root.querySelector(s);
  const H_ = { lvl: $('.dfg-lvl'), obj: $('.dfg-obj'), msgs: $('.dfg-msgs'), hit: $('.dfg-hit'), hp: $('.hp'), ar: $('.ar'), hpb: $('.hpb'), arb: $('.arb'), keys: root.querySelectorAll('.dfg-keys b'), wn: $('.wn'), am: $('.am'), ws: $('.dfg-wslots'), vig: $('.dfg-vig'), pick: $('.dfg-pick'), fps: $('.dfg-fps'), mini: $('.dfg-mini') };
  H_.ws.innerHTML = WEAPON_DEFS.map((w, i) => `<span>${i + 1}</span>`).join('');
  if (isTouch) touch.querySelectorAll('.dfg-tb').forEach(b => { b.style.transform = `scale(${S.touchScale})`; });

  /* ---------- 3D scene objects that live for the whole session ---------- */
  const camera = new THREE.PerspectiveCamera(S.fov, 1, 0.03, 90);
  camera.rotation.order = 'YXZ';        // yaw first, then pitch (FPS style, no roll)
  const wScene = new THREE.Scene();      // separate mini-scene for the gun so it never clips into walls
  const wCam = new THREE.PerspectiveCamera(62, 1, 0.01, 5);
  wScene.add(new THREE.HemisphereLight(0xb8c4d8, 0x2a2622, 0.55));
  const wSun = new THREE.DirectionalLight(0xffffff, 0.6); wSun.position.set(0.5, 1, 0.6); wScene.add(wSun);
  const wMuzzle = new THREE.PointLight(0xffc070, 0, 2); wMuzzle.position.set(0.1, 0, -0.6); wScene.add(wMuzzle);
  const weaponMeshes = WEAPON_DEFS.map((w, i) => { const m = buildWeaponMesh(i); m.visible = false; wScene.add(m); return m; });
  weaponMeshes.forEach((wm, i) => { const spec = slotSrc('weapon_' + i); if (!spec) return;
    loadGlb(spec.src).then(gltf => { if (!gltf || destroyed) return; const gun = buildGunFromGlb(gltf.scene, Object.assign({ len: 0.5 }, spec)); if (!gun) return;
      wm.userData.inner.visible = false; wm.add(gun.obj); wm.userData.flash.position.set(0, gun.muzzleY, gun.muzzleZ); wm.userData.glb = gun.obj; }); });
  // Ejected shell casings: a small pool of meshes animated in camera space (cheap, never clip walls).
  const shellGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.022, 6), brass = new THREE.MeshStandardMaterial({ color: 0xc89a3c, metalness: 0.9, roughness: 0.3 }), redShell = new THREE.MeshStandardMaterial({ color: 0x8a1d14, metalness: 0.2, roughness: 0.6 });
  const shells = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(shellGeo, brass); m.visible = false; wScene.add(m); shells.push({ m, v: new THREE.Vector3(), life: 0 }); }
  let shellI = 0;
  function ejectShell(big) { const sh = shells[shellI++ % shells.length]; sh.m.material = big ? redShell : brass; sh.m.scale.setScalar(big ? 1.6 : 1);
    sh.m.position.set(0.17, -0.1, -0.42); sh.v.set(rand(0.5, 0.9), rand(0.7, 1.1), rand(0.05, 0.25)); sh.life = 0.7; sh.m.visible = true; sh.m.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); }
  function updateShells(dt) { shells.forEach(sh => { if (sh.life <= 0) return; sh.life -= dt; sh.v.y -= 3.2 * dt; sh.m.position.addScaledVector(sh.v, dt); sh.m.rotation.x += dt * 14; sh.m.rotation.z += dt * 9; if (sh.life <= 0) sh.m.visible = false; }); }

  let G = null;        // current level's game state (rebuilt on every level load)
  let state = 'menu';  // 'menu' | 'playing' | 'paused' | 'dead' | 'won'
  let raf = 0, last = performance.now(), fpsAcc = 0, fpsN = 0, destroyed = false;
  const carry = { hp: 100, armor: 0, ammo: { bullets: 50, shells: 0, cells: 0, rockets: 0 }, owned: [true, true, false, false, false, false], cur: 1 };
  const input = { keys: {}, mdx: 0, mdy: 0, fire: false, joyX: 0, joyY: 0, run: false, autoRun: false, dragLook: false, touchAim: false };
  let lookTouch = null, moveTouch = null, fireTouch = null;

  /* ---------- level loading ---------- */
  function loadLevel(index, keepInventory) {
    if (G) disposeLevel();
    const L = levels[clamp(index, 0, levels.length - 1)], W = L.w, Hh = L.h, P = L.props;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(new THREE.Color(P.fogColor), P.fog);
    scene.background = new THREE.Color(P.fogColor);
    const world = new THREE.Group(); scene.add(world);
    buildLevelMeshes(L, world);
    const sky = makeSky(P.sky); scene.add(sky);
    // Lights: soft "ambient" sky/ground light + a pool of point lights moved to the lights nearest you.
    setAoLevel(L);
    const amb = new THREE.Color(P.ambient).convertSRGBToLinear();   // editor colors are sRGB; lights work in linear
    const hemi = new THREE.HemisphereLight(amb, amb.clone().multiplyScalar(0.3), Math.min(P.ambientI, 1.2) * 1.75); scene.add(hemi);
    const moon = new THREE.DirectionalLight(new THREE.Color(SKIES[P.sky] ? SKIES[P.sky].glow : '#ffffff'), 0.25); moon.position.set(-0.4, 1, 0.3); scene.add(moon);
    const pool = []; for (let i = 0; i < Q().lights; i++) { const pl = new THREE.PointLight(0xffffff, 0, 6, 2); scene.add(pl); pool.push(pl); }
    const bodyLight = new THREE.PointLight(0xc8d4ff, 0.22, 3, 2); scene.add(bodyLight);     // keeps your surroundings readable
    const muzzle = new THREE.PointLight(0xffb060, 0, 5, 2); scene.add(muzzle);
    const fxLight = new THREE.PointLight(0xff8a30, 0, 7, 2); scene.add(fxLight);
    const flash = new THREE.SpotLight(0xfff1d6, 0, 14, 0.42, 0.45, 1.4); scene.add(flash); scene.add(flash.target);
    const g = {
      L, index, W, H: Hh, scene, world, sky, pool, bodyLight, muzzle, fxLight, flash, flashOn: false,
      px: L.spawn.x, py: L.spawn.y, pz: L.fh[Math.floor(L.spawn.y) * W + Math.floor(L.spawn.x)] || 0, vz: 0, onGround: true,
      yaw: L.spawn.r || 0, pitch: 0, vx: 0, vy: 0, bob: 0, stepT: 0,
      hp: 100, armor: 0, ammo: { bullets: 50, shells: 0, cells: 0, rockets: 0 }, owned: [true, true, false, false, false, false], cur: 1, cd: 0, switchT: 0, recoil: 0, mag: MAG_SIZE.slice(), reloadT: 0, reloadMax: 1,
      keys: {}, doors: new Map(), enemies: [], pickups: [], props: [], lights: [], exits: [], projectiles: [], particles: null, fireballs: [],
      kills: 0, totalEnemies: 0, secrets: 0, totalSecrets: 0, items: 0, totalItems: 0, time: 0, flow: null, flowCell: -1, flowT: 0,
      dmgFlash: 0, pickFlash: 0, hitT: 0, msgs: [], scriptH: {}, lightT: 0, noise: null
    };
    G = g;
    if (keepInventory && carry.mag) g.mag = carry.mag.slice();
    if (keepInventory) { g.hp = carry.hp; g.armor = carry.armor; g.ammo = Object.assign({}, carry.ammo); g.owned = carry.owned.slice(); g.cur = carry.cur; }
    // Doors: separate meshes so they can slide up into the ceiling.
    for (let i = 0; i < W * Hh; i++) {
      const k = L.kind[i]; if (!k) continue;
      const x = i % W, y = (i / W) | 0;
      const horiz = cellIsSolidStatic(L, x - 1, y) || cellIsSolidStatic(L, x + 1, y);  // walls left/right => door spans X
      const tex = k === 'door' ? (L.wall[i] && TEX_DEFS[L.wall[i]] && TEX_DEFS[L.wall[i]].door ? L.wall[i] : 'door') : 'door_' + k;
      const geo = new THREE.BoxGeometry(horiz ? 1 : 0.2, P.wallH, horiz ? 0.2 : 1); scaleBoxSideUV(geo, P.wallH);
      const mesh = new THREE.Mesh(geo, getMaterial(tex)); mesh.position.set(x + 0.5, P.wallH / 2, y + 0.5); world.add(mesh);
      g.doors.set(i, { i, x, y, key: k === 'door' ? '' : k, open: 0, target: 0, timer: 0, mesh });
    }
    // Entities
    L.ents.forEach(e => {
      const fh = L.fh[Math.floor(e.y) * W + Math.floor(e.x)] || 0;
      if (e.t === 'enemy') {
        const def = ENEMY_DEFS[e.s] || ENEMY_DEFS.grunt, mesh = buildEnemyMesh(e.s);
        mesh.position.set(e.x, fh + (def.hover || 0), e.y); world.add(mesh);
        const en = { sub: e.s in ENEMY_DEFS ? e.s : 'grunt', def, x: e.x, y: e.y, z: fh, hp: def.hp * diff().hp, state: 'idle', t: 0, cd: rand(0.5, 1.5), ang: e.r || 0, mesh, moving: false, deadT: 0, flashT: 0, strafe: Math.random() < 0.5 ? 1 : -1, strafeT: rand(0.8, 2), flank: def.speed > 0 && e.s !== 'titan' && Math.random() < diff().flank ? (Math.random() < 0.5 ? 1 : -1) : 0, coverT: 0, hurtT: 0 };
        g.enemies.push(en); attachModel(mesh, 'enemy_' + en.sub, def.h, !!def.hover);
      } else if (e.t === 'pickup') {
        const mesh = buildPickupMesh(e.s); mesh.position.set(e.x, fh, e.y); world.add(mesh);
        g.pickups.push({ sub: e.s, x: e.x, y: e.y, z: fh, mesh, taken: false });
        if (e.s === 'chip') g.totalSecrets++; else g.totalItems++;
      } else if (e.t === 'prop') {
        const def = PROP_DEFS[e.s] || PROP_DEFS.crate, mesh = buildPropMesh(e.s); mesh.position.set(e.x, fh, e.y); mesh.rotation.y = e.r || 0; world.add(mesh);
        g.props.push({ sub: e.s, x: e.x, y: e.y, z: fh, r: def.solid, hp: def.hp || 0, mesh, dead: false });
        attachModel(mesh, 'prop_' + e.s, mesh ? new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3()).y : 0.6, false);
      } else if (e.t === 'light') {
        const ci = Math.floor(e.y) * W + Math.floor(e.x), sky = (L.ceil[ci] || P.ceilTex) === 'sky';
        const h = e.h !== undefined ? +e.h : (sky ? 1.2 : P.wallH - 0.06);
        const fx = buildLightFixture(new THREE.Color(e.color || '#ffd9a0'), !sky && e.h === undefined); fx.position.set(e.x, fh + h, e.y); world.add(fx);
        g.lights.push({ x: e.x, y: e.y, z: fh + h - 0.1, color: new THREE.Color(e.color || '#ffd9a0').convertSRGBToLinear(), radius: +e.radius || 6, intensity: e.intensity !== undefined ? +e.intensity : 1.4, flicker: !!e.flicker, seed: Math.random() * 100 });
      } else if (e.t === 'exit') {
        const mesh = buildExitMesh(); mesh.position.set(e.x, fh, e.y); world.add(mesh); g.exits.push({ x: e.x, y: e.y, mesh });
      }
    });
    g.totalEnemies = g.enemies.length;
    // Particle system: one Points object, re-used for sparks / smoke / explosions.
    const NP = 500, pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
    pgeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
    const pts = new THREE.Points(pgeo, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts.frustumCulled = false; scene.add(pts);
    g.particles = { pts, list: [], N: NP };
    buildMinimapBase();
    runScript();
    fire('start');
    H_.lvl.textContent = L.name;
    music(state === 'playing');
  }
  function disposeLevel() {
    G.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    G.projectiles.forEach(p => p.mesh && G.scene.remove(p.mesh));
    G = null;
  }
  // Swap a procedural model for a custom GLB if the project assigns one to this slot.
  function attachModel(holder, slot, height, centered) {
    const spec = slotSrc(slot); if (!spec) return;
    loadGlb(spec.src).then(gltf => {
      if (!gltf || destroyed) return;
      const m = normalizeModel(gltf.scene, spec.h || height || 1, centered); if (!m) return;
      const mats = grittify(m, spec.tint || 1, 0.3);
      if (/^enemy_/.test(slot)) mats.forEach(mm => { if (mm.isMeshStandardMaterial || mm.isMeshPhysicalMaterial) addRim(mm, 0x9fc4ff, 0.42); });
      if (holder.userData.proc) holder.userData.proc.visible = false; else holder.children.forEach(c => { c.visible = false; });
      holder.add(m); holder.userData.glb = m; holder.userData.glbMats = mats;
      if (gltf.animations && gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(m.children[0]), acts = {};
        Object.keys(ENEMY_CLIPS).forEach(k => { const c = findClip(gltf.animations, ENEMY_CLIPS[k]); if (c) acts[k] = mixer.clipAction(c); });
        if (!acts.idle && !acts.move) acts.move = mixer.clipAction(gltf.animations.find(a => /walk|run|move/i.test(a.name)) || gltf.animations[0]);
        ['shoot', 'hit', 'death'].forEach(k => { if (acts[k]) { acts[k].setLoop(THREE.LoopOnce, 1); acts[k].clampWhenFinished = true; } });
        holder.userData.mixer = mixer; holder.userData.acts = acts; holder.userData.anim = '';
        playAnim(holder, acts.idle ? 'idle' : 'move');
      }
    });
  }
  // Cross-fade to a named animation (idle / move / shoot / hit / death) if the model has it.
  function playAnim(holder, name) {
    const ud = holder.userData, acts = ud.acts; if (!acts) return;
    if (!acts[name]) name = name === 'death' ? '' : name === 'move' || name === 'hit' || name === 'shoot' ? (acts.idle ? 'idle' : 'move') : (acts.idle ? 'idle' : 'move');
    if (!name || ud.anim === name) return;
    const next = acts[name], prev = acts[ud.anim];
    next.reset(); next.setEffectiveWeight(1); next.setEffectiveTimeScale(name === 'move' ? 1.1 : 1); next.play();
    if (prev) prev.crossFadeTo(next, name === 'death' ? 0.1 : 0.2, false);
    ud.anim = name;
  }

  /* ---------- level scripting: tiny event API for custom logic ---------- */
  function runScript() {
    const src = G.L.props.script; G.scriptH = {};
    if (!src || !src.trim()) return;
    const api = {
      on: (ev, fn) => { (G.scriptH[ev] = G.scriptH[ev] || []).push(fn); },
      message: (t) => msg(String(t)),
      get player() { return { x: G.px, y: G.py, hp: G.hp, armor: G.armor, keys: Object.keys(G.keys) }; },
      heal: n => { G.hp = clamp(G.hp + (+n || 0), 0, 200); },
      giveArmor: n => { G.armor = clamp(G.armor + (+n || 0), 0, 200); },
      giveAmmo: (type, n) => { if (type in G.ammo) G.ammo[type] = Math.min(AMMO_MAX[type], G.ammo[type] + (+n || 0)); },
      openDoor: (x, y) => { const d = G.doors.get((y | 0) * G.W + (x | 0)); if (d) openDoor(d, true); },
      enemiesLeft: () => G.enemies.filter(e => e.state !== 'dead').length,
      kills: () => G.kills, time: () => G.time,
      win: () => levelComplete(), sound: n => Sound.play(n)
    };
    try { new Function('api', src)(api); } catch (e) { msg('Script error: ' + e.message); console.warn('RetroEngine script error', e); }
  }
  function fire(ev, arg) { const hs = G && G.scriptH[ev]; if (!hs) return; hs.forEach(f => { try { f(arg); } catch (e) { msg('Script error: ' + e.message); } }); }

  function msg(t) { const d = el('div'); d.textContent = t; H_.msgs.appendChild(d);
    const later = () => { if (destroyed) return; if (state === 'playing') setTimeout(() => d.remove(), 3000); else setTimeout(later, 250); }; later();   // messages wait until the menu is gone
    while (H_.msgs.children.length > 4) H_.msgs.firstChild.remove(); }

  /* =====================================================================
     COLLISION & GRID QUERIES (2D: x/y on the map, z = height)
     ===================================================================== */
  function solid(cx, cy) {
    if (cx < 0 || cy < 0 || cx >= G.W || cy >= G.H) return true;
    const i = cy * G.W + cx;
    if (!G.L.wall[i] && !G.L.kind[i]) return false;
    const d = G.doors.get(i); if (d) return d.open < 0.75;
    return true;
  }
  const fhAt = (cx, cy) => (cx < 0 || cy < 0 || cx >= G.W || cy >= G.H) ? 0 : (G.L.fh[cy * G.W + cx] || 0);
  // Is a circle of radius r at (x,y) with feet at z blocked by walls, high ledges or solid props?
  function blocked(x, y, z, r, ignoreHeight, self) {
    for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) {
      if (solid(cx, cy)) return true;
      if (!ignoreHeight && fhAt(cx, cy) - z > STEP_H) return true;
    }
    for (const p of G.props) if (!p.dead && p.r > 0 && Math.abs(p.x - x) < p.r + r && Math.abs(p.y - y) < p.r + r) { if (!ignoreHeight || z < p.z + 0.6) return true; }
    if (self !== G) { const dx = G.px - x, dy = G.py - y; if (dx * dx + dy * dy < (r + PLAYER_R) * (r + PLAYER_R)) return true; }
    return false;
  }
  function groundAt(x, y, r) {
    let g = 0;
    for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) if (!solid(cx, cy)) g = Math.max(g, fhAt(cx, cy));
    return g;
  }
  // Walk along a ray through the grid until we hit a solid cell (DDA algorithm). Returns the distance.
  function rayDist(ox, oy, dx, dy, max) {
    let mx = Math.floor(ox), my = Math.floor(oy);
    const ddx = Math.abs(1 / (dx || 1e-9)), ddy = Math.abs(1 / (dy || 1e-9)), sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
    let tx = (dx < 0 ? ox - mx : mx + 1 - ox) * ddx, ty = (dy < 0 ? oy - my : my + 1 - oy) * ddy, t = 0;
    while (t < max) {
      if (tx < ty) { t = tx; tx += ddx; mx += sx; } else { t = ty; ty += ddy; my += sy; }
      if (solid(mx, my)) return t;
    }
    return max;
  }
  function los(x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy); if (d < 0.01) return true; return rayDist(x1, y1, dx / d, dy / d, d) >= d - 0.05; }

  /* ---------- doors ---------- */
  function openDoor(d, force) {
    if (d.key && !G.keys[d.key] && !force) { if (d.msgT === undefined || G.time - d.msgT > 1.2) { msg(`You need the ${d.key.toUpperCase()} keycard`); Sound.play('locked'); d.msgT = G.time; } return false; }
    if (d.target < 1) { d.target = 1; Sound.play('door', distVol(d.x + 0.5, d.y + 0.5)); fire('door', { x: d.x, y: d.y }); if (d.key) d.key = ''; }
    d.timer = 4;
    return true;
  }
  function updateDoors(dt) {
    G.doors.forEach(d => {
      if (d.target > 0) { d.timer -= dt; const occupied = (Math.floor(G.px) === d.x && Math.floor(G.py) === d.y) || G.enemies.some(e => e.state !== 'dead' && Math.floor(e.x) === d.x && Math.floor(e.y) === d.y); if (d.timer <= 0 && !occupied) { d.target = 0; Sound.play('door', distVol(d.x + 0.5, d.y + 0.5) * 0.7); } }
      d.open = clamp(d.open + (d.target ? 1 : -1) * dt * 1.6, 0, 1);
      d.mesh.position.y = G.L.props.wallH / 2 + d.open * G.L.props.wallH * 0.96;
    });
  }
  const distVol = (x, y) => clamp(1 - Math.hypot(x - G.px, y - G.py) / 16, 0, 1);

  /* =====================================================================
     PLAYER
     ===================================================================== */
  function updatePlayer(dt) {
    const k = input.keys;
    // Look: mouse / touch deltas are accumulated between frames
    const sens = 0.0022 * S.sens; // default S.sens is 1.25 so turning is quicker than the old 1.0 default
    G.yaw += input.mdx * sens; G.pitch = clamp(G.pitch - input.mdy * sens * (S.invertY ? -1 : 1), -1.35, 1.35);
    input.mdx = input.mdy = 0;
    if (k.ArrowLeft) G.yaw -= 2.8 * dt; if (k.ArrowRight) G.yaw += 2.8 * dt;
    // Move: forward = (cos yaw, sin yaw) on the map, right = (-sin yaw, cos yaw)
    let f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - input.joyY;
    let s = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + input.joyX;
    const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
    const running = k.ShiftLeft || k.ShiftRight || input.run || input.autoRun;
    const sp = 3.1 * (running ? 1.6 : 1);
    const cy = Math.cos(G.yaw), sy = Math.sin(G.yaw);
    const tvx = (cy * f - sy * s) * sp, tvy = (sy * f + cy * s) * sp;
    // Same lerp as before, but snappier (was 14 ground / 3 air) so starts, stops and strafes with less stiffness.
    const a = 1 - Math.exp(-dt * (G.onGround ? 28 : 8));
    G.vx = lerp(G.vx, tvx, a); G.vy = lerp(G.vy, tvy, a);
    const nx = G.px + G.vx * dt, ny = G.py + G.vy * dt;
    if (!blocked(nx, G.py, G.pz, PLAYER_R, false, G)) G.px = nx; else bumpDoor(nx, G.py);
    if (!blocked(G.px, ny, G.pz, PLAYER_R, false, G)) G.py = ny; else bumpDoor(G.px, ny);
    // Gravity / jumping / stairs
    const ground = groundAt(G.px, G.py, PLAYER_R * 0.7);
    if ((k.Space || input.jump) && G.onGround) { G.vz = 3.6; G.onGround = false; Sound.play('jump'); }
    input.jump = false;
    if (G.pz < ground) { G.pz = Math.min(ground, G.pz + dt * 4); G.vz = 0; G.onGround = true; }   // step up smoothly
    else { G.vz -= GRAV * dt; G.pz += G.vz * dt; if (G.pz <= ground) { if (G.vz < -4) Sound.play('step', 1); G.pz = ground; G.vz = 0; G.onGround = true; } else G.onGround = G.pz - ground < 0.01; }
    // Head bob & footsteps
    const speed = Math.hypot(G.vx, G.vy);
    if (G.onGround && speed > 0.5) { G.bob += dt * speed * 3.2; G.stepT -= dt * speed; if (G.stepT <= 0) { G.stepT = 1.25; Sound.play('step'); } }
    // Use key / button
    if (input.use) { input.use = false; useFront(); }
    // pickups & exits
    for (const p of G.pickups) if (!p.taken && Math.abs(p.x - G.px) < 0.45 && Math.abs(p.y - G.py) < 0.45 && Math.abs(p.z - G.pz) < 0.6) tryPickup(p);
    for (const e of G.exits) if (Math.hypot(e.x - G.px, e.y - G.py) < 0.42) { levelComplete(); return; }
    // weapons
    G.cd -= dt; G.switchT = Math.max(0, G.switchT - dt); G.recoil = Math.max(0, G.recoil - dt * 6);
    const w = WEAPON_DEFS[G.cur];
    if (input.reload) { input.reload = false; startReload(); }
    if (G.reloadT > 0) { G.reloadT -= dt; if (G.reloadT <= 0) { G.reloadT = 0; G.mag[G.cur] = Math.min(MAG_SIZE[G.cur], G.ammo[w.ammo] || 0); Sound.play('reload2'); } }
    else if (w.ammo && G.mag[G.cur] <= 0 && G.ammo[w.ammo] > 0 && G.cd <= 0) startReload();
    // quick taps/clicks can start and end inside one frame on a slow phone: a latched tap still fires (buffered ~0.35 s)
    const tapped = input.fireTap && performance.now() - input.fireTap < 350;
    if ((input.fire || input.mouseFire || tapped) && G.switchT <= 0 && G.cd <= 0 && G.reloadT <= 0) { shoot(); input.fireTap = 0; if (!w.auto) { input.mouseFire = false; } }
  }
  function bumpDoor(x, y) {
    const cx = Math.floor(x + Math.sign(x - G.px) * PLAYER_R), cy = Math.floor(y + Math.sign(y - G.py) * PLAYER_R);
    const d = G.doors.get(cy * G.W + cx) || G.doors.get(Math.floor(y) * G.W + Math.floor(x)); if (d && d.target < 1) openDoor(d);
  }
  function useFront() {
    const fx = G.px + Math.cos(G.yaw) * 0.9, fy = G.py + Math.sin(G.yaw) * 0.9;
    const d = G.doors.get(Math.floor(fy) * G.W + Math.floor(fx)); if (d) { openDoor(d); return; }
    fire('use', { x: Math.floor(fx), y: Math.floor(fy) });
  }
  function tryPickup(p) {
    const def = PICKUP_DEFS[p.sub]; if (!def) return; const gv = def.give; let used = false;
    if (gv.hp) { if (G.hp < 100 || p.sub === 'medkit' && G.hp < 100) { G.hp = Math.min(100, G.hp + gv.hp); used = true; } }
    if (gv.armor) { if (G.armor < (gv.armor > 50 ? 200 : 100)) { G.armor = Math.min(gv.armor > 50 ? 200 : 100, G.armor + gv.armor); used = true; } }
    ['bullets', 'shells', 'cells', 'rockets'].forEach(t => { if (gv[t] && G.ammo[t] < AMMO_MAX[t]) { G.ammo[t] = Math.min(AMMO_MAX[t], G.ammo[t] + gv[t]); used = true; } });
    if (gv.weapon !== undefined) { if (!G.owned[gv.weapon]) { G.owned[gv.weapon] = true; selectWeapon(gv.weapon); } used = true; }
    if (gv.key) { G.keys[gv.key] = true; used = true; }
    if (gv.secret) { G.secrets++; used = true; msg('SECRET FOUND!'); }
    if (!used) return;
    p.taken = true; p.mesh.visible = false; if (!gv.secret) G.items++;
    msg(def.name); G.pickFlash = 0.25;
    Sound.play(gv.key ? 'key' : gv.weapon !== undefined ? 'weapon' : 'pickup');
    fire('pickup', p.sub);
  }
  function selectWeapon(i) {
    if (i === G.cur || !G.owned[i]) return;
    G.cur = i; G.switchT = 0.3; G.cd = Math.max(G.cd, 0.25); G.reloadT = 0; Sound.play('ui');
  }
  // Reload: refill the magazine from reserve ammo (ammo counts every round you carry, mag the loaded ones).
  function startReload() {
    const i = G.cur, w = WEAPON_DEFS[i]; if (!w.ammo || G.reloadT > 0 || G.switchT > 0) return;
    if (G.mag[i] >= Math.min(MAG_SIZE[i], G.ammo[w.ammo])) return;
    G.reloadT = G.reloadMax = RELOAD_TIME[i]; Sound.play('reload');
  }
  function cycleWeapon(dir) {
    for (let n = 1; n <= WEAPON_DEFS.length; n++) { const i = (G.cur + dir * n + WEAPON_DEFS.length * 2) % WEAPON_DEFS.length; if (G.owned[i] && hasAmmo(i)) { selectWeapon(i); return; } }
  }
  const hasAmmo = i => { const w = WEAPON_DEFS[i]; return !w.ammo || G.ammo[w.ammo] > 0; };

  /* ---------- shooting ---------- */
  // Shot magnetism from early DYSTOPIA v2 (combat.js, commit 16322b7): snap the shot toward the
  // nearest unblocked enemy already inside a tight cone (0.05 * strength rad, ~2.3° at 0.80).
  function aimAssistDir(dx, dy, dz, eyeZ) {
    G.lastAimAssist = false;
    const assist = S.aimAssist || 0;
    if (assist <= 0) return null;
    const touch = !!(lookTouch || fireTouch || moveTouch || input.touchAim);
    if (!touch && !S.aimAssistMouse) return null;
    let best = null, bestAng = 0.08 * assist; // light cone (~3.7° at the 0.80 default)
    G.enemies.forEach(e => {
      if (e.state === 'dead') return;
      const tx = e.x - G.px, ty = e.y - G.py, tz = (e.z + (e.def.hover || 0) + e.def.h * 0.55) - eyeZ;
      const L = Math.hypot(tx, ty, tz);
      if (L < 0.4 || L > 28) return;
      const nx = tx / L, ny = ty / L, nz = tz / L;
      const ang = Math.acos(Math.max(-1, Math.min(1, nx * dx + ny * dy + nz * dz)));
      if (ang < bestAng && los(G.px, G.py, e.x, e.y)) { bestAng = ang; best = { x: nx, y: ny, z: nz }; }
    });
    if (best) G.lastAimAssist = true;
    return best;
  }
  function shoot() {
    const w = WEAPON_DEFS[G.cur];
    if (w.ammo && G.ammo[w.ammo] <= 0) { Sound.play('empty'); G.cd = 0.3; input.mouseFire = false; for (let i = WEAPON_DEFS.length - 1; i >= 0; i--) if (G.owned[i] && hasAmmo(i) && i !== G.cur) { selectWeapon(i); break; } return; }
    if (w.ammo) { const i = G.cur; if (G.mag[i] > G.ammo[w.ammo]) G.mag[i] = G.ammo[w.ammo]; if (G.reloadT > 0) return; if (G.mag[i] <= 0) { startReload(); return; } G.mag[i]--; }
    if (w.ammo) G.ammo[w.ammo]--;
    G.cd = w.cd; G.recoil = 1; Sound.play(w.snd);
    { const kick = [0, 0.014, 0.035, 0.007, 0.006, 0.045][G.cur] || 0; G.pitch = Math.min(1.4, G.pitch + kick * rand(0.8, 1.2)); G.yaw += kick * rand(-0.3, 0.3); G.kickT = 1; }
    if (w.ammo === 'bullets' || w.ammo === 'shells') ejectShell(w.ammo === 'shells');
    { const fl = weaponMeshes[G.cur].userData.flash, r = rand(0.8, 1.35); fl.rotation.z = rand(0, Math.PI); fl.scale.set(r * 1.3, r * 1.3, 2.4 * r); }
    const eyeZ = G.pz + EYE;
    if (!w.melee) { G.muzzle.intensity = 2.2; wMuzzle.intensity = 2; weaponMeshes[G.cur].userData.flash.visible = true; makeNoise(10); }
    const cyaw = Math.cos(G.yaw), syaw = Math.sin(G.yaw);
    if (w.melee) {
      let best = null, bd = w.range;
      G.enemies.forEach(e => { if (e.state === 'dead') return; const dx = e.x - G.px, dy = e.y - G.py, d = Math.hypot(dx, dy); if (d < bd + e.def.r && (dx * cyaw + dy * syaw) / d > 0.6) { best = e; bd = d; } });
      if (best) { damageEnemy(best, w.dmg); Sound.play('hit'); }
      else { const wd = rayDist(G.px, G.py, cyaw, syaw, w.range); if (wd < w.range) sparks(G.px + cyaw * wd, eyeZ - 0.1, G.py + syaw * wd, 8, 0xffd080); }
      G.props.forEach(p => { if (p.hp && !p.dead && Math.hypot(p.x - G.px, p.y - G.py) < w.range + 0.2) damageProp(p, w.dmg); });
      return;
    }
    if (w.proj) {
      const cp = Math.cos(G.pitch);
      let pdx = cyaw * cp, pdy = syaw * cp, pdz = Math.sin(G.pitch);
      const aa = aimAssistDir(pdx, pdy, pdz, eyeZ);
      if (aa) { pdx = aa.x; pdy = aa.y; pdz = aa.z; }
      if (w.spread) {
        const sa = (Math.random() - 0.5) * 2 * w.spread, sp = (Math.random() - 0.5) * 2 * w.spread;
        const cy2 = Math.cos(Math.atan2(pdy, pdx) + sa), sy2 = Math.sin(Math.atan2(pdy, pdx) + sa);
        const cp2 = Math.cos(Math.asin(Math.max(-1, Math.min(1, pdz))) + sp), sp2 = Math.sin(Math.asin(Math.max(-1, Math.min(1, pdz))) + sp);
        pdx = cy2 * cp2; pdy = sy2 * cp2; pdz = sp2;
      }
      spawnProj('player', w.proj, G.px + cyaw * 0.3, G.py + syaw * 0.3, eyeZ - 0.08, pdx, pdy, pdz, w.speed, w.dmg, w.splash || 0);
      return;
    }
    let anyHit = false;
    let hyaw = G.yaw, hpt = G.pitch;
    { const cp = Math.cos(G.pitch), aa = aimAssistDir(cyaw * cp, syaw * cp, Math.sin(G.pitch), eyeZ);
      if (aa) { hyaw = Math.atan2(aa.y, aa.x); hpt = Math.asin(Math.max(-1, Math.min(1, aa.z))); } }
    for (let n = 0; n < (w.pellets || 1); n++) {
      const a = hyaw + rand(-w.spread, w.spread), pt = hpt + rand(-w.spread, w.spread) * 0.6;
      const dx = Math.cos(a), dy = Math.sin(a), tp = Math.tan(pt);
      const wd = rayDist(G.px, G.py, dx, dy, 40);
      let best = null, bt = wd;
      const test = (o, r, z0, z1) => { const rx = o.x - G.px, ry = o.y - G.py, t = rx * dx + ry * dy; if (t <= 0 || t >= bt) return false; const perp = Math.abs(rx * dy - ry * dx); if (perp > r) return false; const z = eyeZ + tp * t; if (z < z0 || z > z1) return false; bt = t; return true; };
      G.enemies.forEach(e => { if (e.state === 'dead') return; const base = e.z + (e.def.hover || 0) - (e.def.hover ? 0.22 : 0); if (test(e, e.def.r, base, base + (e.def.hover ? 0.44 : e.def.h))) best = e; });
      G.props.forEach(p => { if (!p.dead && p.r > 0 && test(p, p.r, p.z, p.z + 1)) best = p; });
      const hx = G.px + dx * bt, hy = G.py + dy * bt, hz = eyeZ + tp * bt;
      if (best && best.def) { damageEnemy(best, w.dmg); anyHit = true; sparks(hx, hz, hy, 5, 0xff5a2a); }
      else if (best) { if (best.hp) damageProp(best, w.dmg); sparks(hx, hz, hy, 4, 0xffd080); }
      else { sparks(hx - dx * 0.02, clamp(hz, 0.02, G.L.props.wallH), hy - dy * 0.02, 6, 0xffd080); smoke(hx - dx * 0.05, hz, hy - dy * 0.05, 2); }
    }
    if (anyHit) { G.hitT = 0.12; Sound.play('hit'); }
  }
  function makeNoise(r) { G.enemies.forEach(e => { if (e.state === 'idle') { const d = Math.hypot(e.x - G.px, e.y - G.py); if (d < r * 0.6 || (d < r && los(e.x, e.y, G.px, G.py))) alert(e); } }); }
  function alert(e) {
    if (e.state !== 'idle') return; e.state = 'chase'; e.cd = rand(0.4, 1.0) * diff().react; Sound.play('alert', distVol(e.x, e.y) * 0.8);
    // radio call-out: idle allies that can see or hear this one join the fight
    G.enemies.forEach(o => { if (o !== e && o.state === 'idle') { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < 4 || (d < 9 && los(o.x, o.y, e.x, e.y))) { o.alertT = rand(0.2, 0.7); } } });
  }
  // Cover: a nearby open cell the enemy can walk to in a straight line but the player can't see.
  function findCover(e) {
    const cx = Math.floor(e.x), cy = Math.floor(e.y); let best = null, bd = 1e9;
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) {
      if (x < 1 || y < 1 || x >= G.W - 1 || y >= G.H - 1 || cellIsSolidStatic(G.L, x, y) || G.doors.get(y * G.W + x)) continue;
      const px = x + 0.5, py = y + 0.5, d = Math.hypot(px - e.x, py - e.y);
      if (d < 1 || d > 4.5 || d >= bd || !los(e.x, e.y, px, py)) continue;
      // must be properly hidden: from the spot itself and a body-width around it (not just a pixel-perfect corner)
      if ([[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].some(o => los(px + o[0], py + o[1], G.px, G.py))) continue;
      if (Math.abs(groundAt(px, py, 0.1) - e.z) > 0.2) continue;
      best = { x: px, y: py }; bd = d;
    }
    return best;
  }

  function damageEnemy(e, dmg) {
    if (e.state === 'dead') return;
    e.hp -= dmg; e.flashT = 0.1; e.hurtT = (e.hurtT || 0) + dmg;
    if (e.state === 'idle') alert(e);
    if (e.hp <= 0) {
      e.state = 'dead'; e.deadT = 0; G.kills++; Sound.play('edie', distVol(e.x, e.y));
      sparks(e.x, e.z + e.def.h * 0.6, e.y, 30, 0xff8030); smoke(e.x, e.z + 0.5, e.y, 8);
      if (e.sub === 'titan') explode(e.x, e.y, e.z + 0.8, 0, 2.5, 'enemy');
      if (e.mesh.userData.glow) e.mesh.userData.glow.color.set(0x222222);
      fire('kill', e.sub);
      if (G.kills === G.totalEnemies && G.totalEnemies > 0) msg('AREA CLEAR — all hostiles down');
    } else if (e.sub !== 'titan' && e.sub !== 'turret' && Math.random() < 0.35) { e.state = 'pain'; e.t = 0.22; Sound.play('pain', distVol(e.x, e.y) * 0.6); }
  }
  function damageProp(p, dmg) { p.hp -= dmg; if (p.hp <= 0 && !p.dead) { p.dead = true; p.mesh.visible = false; setTimeout(() => G && explode(p.x, p.y, p.z + 0.35, 70, 1.8, 'barrel'), 60); } }
  function damagePlayer(dmg, fromX, fromY) {
    buzz(dmg >= 25 ? 60 : 25);
    if (state !== 'playing') return;
    if (G.armor > 0) { const absorb = Math.min(G.armor, dmg * 0.4); G.armor -= absorb; dmg -= absorb; }
    G.hp -= dmg; G.dmgFlash = Math.min(1, G.dmgFlash + 0.35 + dmg / 60); Sound.play('hurt');
    if (G.hp <= 0) { G.hp = 0; playerDie(); }
  }
  function explode(x, y, z, dmg, rad, owner) {
    Sound.play('explode', distVol(x, y));
    sparks(x, z, y, 60, 0xff9030); smoke(x, z, y, 14);
    G.fxLight.position.set(x, z + 0.2, y); G.fxLight.intensity = 4;
    const fb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    fb.position.set(x, z, y); G.scene.add(fb); G.fireballs.push({ mesh: fb, t: 0, rad });
    if (!dmg) return;
    G.enemies.forEach(e => { if (e.state === 'dead') return; const d = Math.hypot(e.x - x, e.y - y); if (d < rad && los(x, y, e.x, e.y)) damageEnemy(e, dmg * (1 - d / rad * 0.6)); });
    G.props.forEach(p => { if (!p.dead && p.hp) { const d = Math.hypot(p.x - x, p.y - y); if (d < rad) damageProp(p, dmg); } });
    const pd = Math.hypot(G.px - x, G.py - y); if (pd < rad && los(x, y, G.px, G.py)) damagePlayer(dmg * (1 - pd / rad * 0.7) * (owner === 'player' ? 0.5 : 1), x, y);
  }

  /* ---------- projectiles ---------- */
  const projGeo = new THREE.SphereGeometry(0.05, 8, 6);
  function spawnProj(owner, kind, x, y, z, dx, dy, dz, speed, dmg, splash) {
    const color = kind === 'plasma' ? 0x7cff4f : kind === 'pulse' ? 0x38bdf8 : kind === 'rocket' ? 0xffa040 : 0xff3b1f;
    const mesh = new THREE.Mesh(projGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    mesh.scale.setScalar(kind === 'rocket' ? 1.6 : kind === 'plasma' ? 1.3 : kind === 'pulse' ? 1.15 : 1.1);
    const halo = new THREE.Mesh(projGeo, mesh.material.clone()); halo.material.opacity = 0.25; halo.scale.setScalar(2.6); mesh.add(halo);
    G.scene.add(mesh);
    G.projectiles.push({ owner, kind, x, y, z, vx: dx * speed, vy: dy * speed, vz: dz * speed, dmg, splash, mesh, life: 5 });
  }
  function updateProjectiles(dt) {
    for (let i = G.projectiles.length - 1; i >= 0; i--) {
      const p = G.projectiles[i]; let hit = false;
      const steps = Math.max(3, Math.ceil(Math.hypot(p.vx, p.vy, p.vz) * dt / 0.12)); // sub-steps so fast shots don't skip thin targets
      for (let s = 0; s < steps && !hit; s++) {
        p.x += p.vx * dt / steps; p.y += p.vy * dt / steps; p.z += p.vz * dt / steps;
        const cx = Math.floor(p.x), cy = Math.floor(p.y);
        if (solid(cx, cy) || p.z < fhAt(cx, cy) || p.z > G.L.props.wallH) hit = true;
        if (p.owner === 'player') {
          for (const e of G.enemies) { if (e.state === 'dead') continue; const base = e.z + (e.def.hover ? e.def.hover - 0.22 : 0), top = base + (e.def.hover ? 0.44 : e.def.h); if (Math.hypot(e.x - p.x, e.y - p.y) < e.def.r + 0.06 && p.z > base && p.z < top) { if (!p.splash) damageEnemy(e, p.dmg); hit = true; break; } }
          for (const pr of G.props) if (!pr.dead && pr.r > 0 && Math.abs(pr.x - p.x) < pr.r && Math.abs(pr.y - p.y) < pr.r && p.z < pr.z + 1) { if (pr.hp && !p.splash) damageProp(pr, p.dmg); hit = true; }
        } else if (Math.hypot(G.px - p.x, G.py - p.y) < PLAYER_R + 0.08 && p.z > G.pz - 0.05 && p.z < G.pz + 0.8) { if (!p.splash) damagePlayer(p.dmg, p.x, p.y); hit = true; }
      }
      p.life -= dt; if (p.kind === 'rocket' && Math.random() < 0.7) smoke(p.x, p.z, p.y, 1);
      if (hit || p.life <= 0) {
        if (p.splash) explode(p.x - p.vx * 0.01, p.y - p.vy * 0.01, p.z, p.dmg, p.splash, p.owner);
        else sparks(p.x, p.z, p.y, 8, p.kind === 'plasma' ? 0x7cff4f : 0xff6a30);
        G.scene.remove(p.mesh); p.mesh.material.dispose(); G.projectiles.splice(i, 1); continue;
      }
      p.mesh.position.set(p.x, p.z, p.y);
    }
  }
  /* ---------- particles ---------- */
  function sparks(x, z, y, n, color) { const c = new THREE.Color(color); for (let i = 0; i < n; i++) addParticle(x, z, y, rand(-2, 2), rand(0, 2.5), rand(-2, 2), rand(0.2, 0.5), c, 9); }
  function smoke(x, z, y, n) { const c = new THREE.Color(0x30302c); for (let i = 0; i < n; i++) addParticle(x + rand(-.1, .1), z, y + rand(-.1, .1), rand(-.3, .3), rand(0.2, 0.8), rand(-.3, .3), rand(0.6, 1.4), c, -0.5); }
  function addParticle(x, z, y, vx, vz, vy, life, color, grav) { const P = G.particles; if (P.list.length >= P.N) P.list.shift(); P.list.push({ x, y, z, vx, vy, vz, life, max: life, color, grav }); }
  function updateParticles(dt) {
    const P = G.particles, pos = P.pts.geometry.attributes.position, col = P.pts.geometry.attributes.color;
    let n = 0;
    for (let i = P.list.length - 1; i >= 0; i--) { const p = P.list[i]; p.life -= dt; if (p.life <= 0) { P.list.splice(i, 1); continue; } p.vz -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.z < 0) { p.z = 0; p.vz *= -0.3; } }
    for (const p of P.list) { const k = p.life / p.max; pos.setXYZ(n, p.x, p.z, p.y); col.setXYZ(n, p.color.r * k, p.color.g * k, p.color.b * k); n++; }
    P.pts.geometry.setDrawRange(0, n); pos.needsUpdate = true; col.needsUpdate = true;
    for (let i = G.fireballs.length - 1; i >= 0; i--) { const f = G.fireballs[i]; f.t += dt; f.mesh.scale.setScalar(1 + f.t * f.rad * 5); f.mesh.material.opacity = Math.max(0, 0.9 - f.t * 2.4); if (f.t > 0.4) { G.scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); G.fireballs.splice(i, 1); } }
    G.fxLight.intensity = Math.max(0, G.fxLight.intensity - dt * 10);
  }

  /* =====================================================================
     ENEMY AI:  idle -> (sees/hears you) -> chase -> attack -> chase ...
                 pain = short stagger when hit, dead = falls over.
     Path finding uses a "flow field": a breadth-first search from the
     player's cell gives every cell its walking distance to you; enemies
     simply step to the neighbor cell with a smaller number.
     ===================================================================== */
  function updateFlow(dt) {
    G.flowT -= dt; const pc = Math.floor(G.py) * G.W + Math.floor(G.px);
    if (G.flow && pc === G.flowCell && G.flowT > 0) return;
    G.flowT = 0.5; G.flowCell = pc;
    const W = G.W, n = W * G.H, dist = G.flow || new Int32Array(n); dist.fill(-1); dist[pc] = 0;
    const q = new Int32Array(n); let h = 0, t = 0; q[t++] = pc;
    while (h < t) {
      const c = q[h++], x = c % W, y = (c / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= W || ny >= G.H) continue; const ni = ny * W + nx; if (dist[ni] >= 0) continue;
        if (G.L.wall[ni] && !G.L.kind[ni]) continue; const door = G.doors.get(ni); if (door && door.key) continue;
        if ((G.L.fh[c] || 0) - (G.L.fh[ni] || 0) > STEP_H) continue; // enemy would have to climb from ni up to c
        dist[ni] = dist[c] + 1; q[t++] = ni;
      }
    }
    G.flow = dist;
  }
  function updateEnemies(dt, time) {
    updateFlow(dt);
    for (const e of G.enemies) {
      const m = e.mesh, ud = m.userData, def = e.def;
      if (ud.acts) {
        playAnim(m, e.state === 'dead' ? 'death' : e.state === 'attack' ? 'shoot' : e.state === 'pain' ? 'hit' : e.moving ? 'move' : 'idle');
        // animation LOD (phones): skinning is CPU work, so far/idle enemies update less often and corpses freeze
        const d2 = (e.x - G.px) * (e.x - G.px) + (e.y - G.py) * (e.y - G.py);
        ud.animAcc = (ud.animAcc || 0) + dt;
        const every = e.state === 'dead' && e.deadT > 2.5 ? 1e9 : d2 > 400 && e.state === 'idle' ? 0.25 : d2 > 144 ? 0.033 : 0;
        if (ud.animAcc >= every) { ud.mixer.update(ud.animAcc); ud.animAcc = 0; }
      }
      else if (ud.mixer) ud.mixer.update(dt * (e.moving ? 1 : 0.3));
      if (e.alertT > 0) { e.alertT -= dt; if (e.alertT <= 0) alert(e); }
      if (e.state === 'dead') {   // death animation: tip over and sink a little
        e.deadT += dt; const k = Math.min(1, e.deadT / 0.6);
        if (def.hover) { m.position.y = Math.max(e.z + 0.1, e.z + def.hover - e.deadT * 2.5); m.rotation.z = k * 1.2; }
        else { ud.proc.rotation.x = -k * 1.35 * (e.sub === 'turret' ? 0.3 : 1); m.position.y = e.z - k * 0.05; if (ud.glb && !(ud.acts && ud.acts.death)) ud.glb.rotation.x = -k * 1.35; }
        ud.mats.forEach(mm => mm.color.lerp(new THREE.Color(0x1a1a1a), dt * 1.5));
        continue;
      }
      const dx = G.px - e.x, dy = G.py - e.y, dist = Math.hypot(dx, dy);
      const see = dist < 18 && los(e.x, e.y, G.px, G.py);
      e.flashT = Math.max(0, e.flashT - dt); e.cd -= dt; e.moving = false;
      if (e.state === 'idle') { if ((dist < 2.5 + (input.run ? 2.5 : 0) && Math.hypot(G.vx, G.vy) > 1.1 && los(e.x, e.y, G.px, G.py) || dist < 1.5) || see && (dist < 6 || ((dx * Math.cos(e.ang) + dy * Math.sin(e.ang)) / dist > -0.2 && dist < 15))) alert(e); }
      else if (e.state === 'pain') { e.t -= dt; if (e.t <= 0) e.state = 'chase'; }
      else if (e.state === 'cover') {   // run to cover, wait, then pop out and fight again
        e.coverT -= dt; const cx = e.cover.x - e.x, cy = e.cover.y - e.y, cl = Math.hypot(cx, cy);
        if (cl > 0.15 && def.speed > 0) { const sp = def.speed * diff().speed * 1.25 * dt, fly = !!def.hover; e.ang = Math.atan2(cy, cx);
          const nx = e.x + cx / cl * Math.min(sp, cl), ny = e.y + cy / cl * Math.min(sp, cl); if (!blocked(nx, e.y, e.z, def.r * 0.8, fly, e)) e.x = nx; if (!blocked(e.x, ny, e.z, def.r * 0.8, fly, e)) e.y = ny; e.moving = true; }
        else if (see) e.ang = Math.atan2(dy, dx);
        if (see && cl <= 0.15 && e.coverT > 0 && !e.recover) { const c = findCover(e); e.recover = true; if (c) { e.cover = c; continue; } }   // spot got flanked: one retry
        if (e.coverT <= 0 || (see && cl <= 0.15)) { e.state = 'chase'; e.recover = false; e.cd = Math.min(e.cd, 0.3); }
      }
      else if (e.state === 'attack') {
        e.t -= dt; e.ang = Math.atan2(dy, dx);
        if (e.t <= 0) {
          const mz = e.z + (def.hover || def.h * 0.62);
          for (let s = 0; s < def.shots; s++) {
            const tz = G.pz + 0.45, d3 = Math.hypot(dx, dy, tz - mz), sp = def.proj === 'rocket' ? 5.5 : 6.5;
            const spr = def.shots > 1 ? (s - (def.shots - 1) / 2) * 0.12 : rand(-0.04, 0.04), a = Math.atan2(dy, dx) + spr;
            const off = e.sub === 'titan' ? (s ? 0.45 : -0.45) : 0;
            spawnProj('enemy', def.proj, e.x + Math.cos(a) * 0.35 - Math.sin(a) * off, e.y + Math.sin(a) * 0.35 + Math.cos(a) * off, mz + (e.sub === 'titan' ? 0.4 : 0), Math.cos(a) * dist / d3, Math.sin(a) * dist / d3, (tz - mz) / d3, sp, def.dmg * diff().dmg, def.proj === 'rocket' ? 1.4 : 0);
          }
          Sound.play(def.proj === 'rocket' ? 'rocket' : 'bolt', distVol(e.x, e.y));
          e.cd = def.cd * diff().cd * rand(0.8, 1.3); e.state = 'chase';
        }
      } else if (e.state === 'chase') {
        if (see) e.ang = Math.atan2(dy, dx);
        // badly hurt (or just took a big hit on Hard) -> look for cover
        if (def.speed > 0 && e.sub !== 'titan' && e.hurtT > def.hp * diff().hp * (S.difficulty === 'hard' ? 0.25 : 0.4)) { e.hurtT = 0; const c = findCover(e); if (c) { e.state = 'cover'; e.recover = false; e.cover = c; e.coverT = rand(1.4, 2.6); } }
        e.strafeT -= dt; if (e.strafeT <= 0) { if (!e.flank) e.strafe = -e.strafe; e.strafeT = rand(0.7, 1.8); }
        if (e.flank && e.strafe !== e.flank && e.strafeT > 0.3) e.strafe = e.flank;
        if (see && dist < def.range && e.cd <= 0) { e.state = 'attack'; e.t = def.proj === 'rocket' ? 0.6 : 0.4; }
        else if (def.speed > 0 && see && dist < def.range && e.sub !== 'titan') {
          // in range but reloading: strafe sideways (and keep a little distance) instead of standing still
          const px = -dy / dist, py = dx / dist, back = dist < 2.5 ? -0.7 : e.flank ? (dist > 3.5 ? 0.3 : 0) : dist > def.range * 0.7 ? 0.5 : 0;
          const mx = px * e.strafe + dx / dist * back, my = py * e.strafe + dy / dist * back, ml = Math.hypot(mx, my) || 1, sp = def.speed * diff().speed * 0.7 * dt, fly = !!def.hover;
          const nx = e.x + mx / ml * sp, ny = e.y + my / ml * sp; let moved = false;
          if (!blocked(nx, e.y, e.z, def.r * 0.8, fly, e)) { e.x = nx; moved = true; } if (!blocked(e.x, ny, e.z, def.r * 0.8, fly, e)) { e.y = ny; moved = true; }
          if (!moved) { e.strafe = -e.strafe; e.strafeT = 0.6; } e.moving = moved;   // blocked: flankers swap sides for a moment
        }
        else if (def.speed > 0 && dist > (see ? 1.6 : 0.6)) {
          let tx = G.px, ty = G.py;
          // flankers swing wide to come at the player from the side
          let flanking = false;
          if (e.flank && see && dist > 3.5) { const fx = tx - dy / dist * e.flank * 2.2, fy = ty + dx / dist * e.flank * 2.2; if (!cellIsSolidStatic(G.L, Math.floor(fx), Math.floor(fy)) && los(e.x, e.y, fx, fy)) { tx = fx; ty = fy; flanking = true; } }
          if (!flanking && !(see && dist < 5)) {        // follow the flow field around walls
            const cx = Math.floor(e.x), cy = Math.floor(e.y), here = G.flow[cy * G.W + cx];
            let best = here < 0 ? 1e9 : here, bx = -1, by = -1;
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { const nx = cx + d[0], ny = cy + d[1]; if (nx < 0 || ny < 0 || nx >= G.W || ny >= G.H) return; const v = G.flow[ny * G.W + nx]; if (v >= 0 && v < best) { best = v; bx = nx; by = ny; } });
            if (bx >= 0) { tx = bx + 0.5; ty = by + 0.5; const door = G.doors.get(by * G.W + bx); if (door && !door.key && door.target < 1) openDoor(door); }
            else if (!see) { tx = e.x; ty = e.y; }
          }
          const mx = tx - e.x, my = ty - e.y, ml = Math.hypot(mx, my);
          if (ml > 0.01) {
            const sp = def.speed * diff().speed * dt, nx = e.x + mx / ml * sp, ny = e.y + my / ml * sp;
            if (!see) e.ang = Math.atan2(my, mx);
            const fly = !!def.hover;
            if (!blocked(nx, e.y, e.z, def.r * 0.8, fly, e)) e.x = nx;
            if (!blocked(e.x, ny, e.z, def.r * 0.8, fly, e)) e.y = ny;
            e.moving = true;
          }
          // keep enemies from stacking inside each other
          for (const o of G.enemies) if (o !== e && o.state !== 'dead') { const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy), min = def.r + o.def.r; if (od > 0.001 && od < min) { const push = (min - od) * 0.5; const px = e.x + ox / od * push, py = e.y + oy / od * push; if (!blocked(px, py, e.z, def.r * 0.8, !!def.hover, e)) { e.x = px; e.y = py; } } }
        }
      }
      // ground the enemy on the floor (or hover height for drones)
      const gz = groundAt(e.x, e.y, 0.1); e.z = lerp(e.z, gz, Math.min(1, dt * 10));
      m.position.set(e.x, e.z + (def.hover ? def.hover + Math.sin(time * 2.2 + ud.phase) * 0.06 : 0), e.y);
      // face the direction we are looking: model faces +Z, so rotation.y = atan2(dirX, dirZ)
      const want = Math.atan2(Math.cos(e.ang), Math.sin(e.ang));
      let dAng = want - m.rotation.y; while (dAng > Math.PI) dAng -= Math.PI * 2; while (dAng < -Math.PI) dAng += Math.PI * 2;
      m.rotation.y += dAng * Math.min(1, dt * 10);
      // animation
      ud.phase += dt * (e.moving ? def.speed * 5 : 1);
      if (ud.proc.userData.legs) ud.proc.userData.legs.forEach((leg, i) => { leg.rotation.x = e.moving ? Math.sin(ud.phase + i * Math.PI) * 0.5 : 0; });
      if (ud.proc.userData.rotor) ud.proc.userData.rotor.rotation.y += dt * 18;
      if (ud.proc.userData.core) ud.proc.userData.core.rotation.y += dt * 3;
      if (!e.moving && !def.hover) ud.proc.position.y = Math.sin(time * 1.6 + ud.phase) * 0.006;
      const charge = e.state === 'attack' ? 0.6 + Math.sin(time * 40) * 0.4 : 0;
      ud.mats.forEach(mm => mm.emissive.setRGB(e.flashT > 0 ? 0.9 : charge * 0.35, e.flashT > 0 ? 0.9 : charge * 0.08, e.flashT > 0 ? 0.9 : 0));
      if (ud.glbMats) ud.glbMats.forEach(mm => mm.emissive && mm.emissive.setRGB(e.flashT > 0 ? 0.55 : 0, e.flashT > 0 ? 0.35 : 0, e.flashT > 0 ? 0.3 : 0));
    }
  }

  /* ---------- dynamic lights: give the light pool to the lights closest to you ---------- */
  function updateLights(dt, time) {
    G.lightT -= dt;
    if (G.lightT <= 0) {
      G.lightT = 0.25;
      G.activeLights = G.lights.map(l => ({ l, d: Math.hypot(l.x - G.px, l.y - G.py) - l.radius * 0.5 })).sort((a, b) => a.d - b.d).slice(0, G.pool.length).map(o => o.l);
    }
    const act = G.activeLights || [];
    G.pool.forEach((pl, i) => {
      const l = act[i];
      if (!l) { pl.intensity = 0; return; }
      pl.position.set(l.x, l.z, l.y); pl.color.copy(l.color); pl.distance = l.radius;
      let k = Math.min(l.intensity, 2.2) * 1.45;   // capped: close-up walls never blow out to white
      if (l.flicker) { const f = Math.sin(time * 13 + l.seed) * Math.sin(time * 7.3 + l.seed * 2); k *= f > 0.75 ? 0.25 : 0.85 + f * 0.15; }
      pl.intensity = k;
    });
    G.bodyLight.position.set(G.px, G.pz + 0.9, G.py);
    G.muzzle.position.set(G.px + Math.cos(G.yaw) * 0.4, G.pz + EYE, G.py + Math.sin(G.yaw) * 0.4);
    G.muzzle.intensity = Math.max(0, G.muzzle.intensity - dt * 30); wMuzzle.intensity = Math.max(0, wMuzzle.intensity - dt * 30);
    G.flash.intensity = G.flashOn ? 2.2 : 0;
  }

  /* =====================================================================
     RENDER, HUD, MENUS, INPUT, MAIN LOOP
     ===================================================================== */
  function resize() {
    const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight);
    renderer.setPixelRatio(Math.max(0.35, Math.min(window.devicePixelRatio || 1, Q().ratio) * (S.quality === 'auto' ? dynScale : 1)));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = S.fov; camera.updateProjectionMatrix();
    wCam.aspect = w / h; wCam.updateProjectionMatrix();
  }
  const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(root); window.addEventListener('resize', resize);
  // phones: the address bar and rotation change the viewport after the event fires, so resize again a bit later
  const onOrient = () => { resize(); setTimeout(resize, 250); setTimeout(resize, 700); if (state === 'menu' || state === 'paused') refreshPortraitTip(); };
  window.addEventListener('orientationchange', onOrient);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onOrient);
  const refreshPortraitTip = () => { const t = menu.querySelector('.dfg-rot'); if (t) t.style.display = isTouch && window.innerHeight > window.innerWidth * 1.1 ? 'block' : 'none'; };
  // block iOS pinch / double-tap zoom on the game (Safari ignores user-scalable=no)
  ['gesturestart', 'gesturechange', 'dblclick'].forEach(e => root.addEventListener(e, ev => ev.preventDefault(), { passive: false }));
  renderer.domElement.addEventListener('webglcontextlost', ev => { ev.preventDefault(); if (destroyed || !G) return; if (state === 'playing') pause(); msg('Graphics were reset by the phone, tap Resume'); });

  function render(time, dt) {
    dt = dt || 0.016;
    if (!G) return;
    // camera: map (x,y) + height -> three (x, height, y)
    const bob = S.bob && G.onGround ? Math.sin(G.bob) * 0.025 * Math.min(1, Math.hypot(G.vx, G.vy) / 3) : 0;
    const deadDrop = state === 'dead' ? -0.45 : 0;
    camera.position.set(G.px, G.pz + EYE + bob + deadDrop, G.py);
    camera.rotation.set(G.pitch, -G.yaw - Math.PI / 2, state === 'dead' ? 0.4 : 0);
    G.sky.position.copy(camera.position);
    // flashlight follows the view
    G.flash.position.copy(camera.position);
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    G.flash.target.position.copy(camera.position).add(fwd);
    // spinning pickups, exit beam
    G.pickups.forEach(p => { if (!p.taken) { p.mesh.userData.spin.rotation.y = time * 1.8; p.mesh.userData.spin.position.y = 0.24 + Math.sin(time * 2.5 + p.x) * 0.04; } });
    G.exits.forEach(e => { e.mesh.userData.beam.material.opacity = 0.1 + Math.sin(time * 3) * 0.05; });
    // first-person weapon: bob, recoil, raise/lower when switching
    weaponMeshes.forEach((m, i) => { m.visible = i === G.cur && state !== 'dead'; });
    const wm = weaponMeshes[G.cur];
    // weapon sway: the gun lags slightly behind where you look, then settles (feels heavy)
    if (G.prevYaw === undefined) { G.prevYaw = G.yaw; G.prevPitch = G.pitch; G.swX = 0; G.swY = 0; }
    let dYaw = G.yaw - G.prevYaw; if (dYaw > Math.PI) dYaw -= Math.PI * 2; if (dYaw < -Math.PI) dYaw += Math.PI * 2;
    const k = Math.min(1, dt * 9); G.swX += (clamp(-dYaw * 1.6, -0.05, 0.05) - G.swX) * k; G.swY += (clamp((G.pitch - G.prevPitch) * 1.6, -0.04, 0.04) - G.swY) * k;
    G.prevYaw = G.yaw; G.prevPitch = G.pitch;
    const sway = Math.sin(G.bob * 0.5) * 0.012 + G.swX, lift = Math.abs(Math.cos(G.bob * 0.5)) * 0.01 - G.swY;
    wm.position.set(0.14 + sway, -0.15 - lift - G.switchT * 0.8 - G.recoil * 0.01, -0.36 + G.recoil * 0.05);
    wm.rotation.set(G.recoil * 0.12 + (G.cur === 0 && G.recoil > 0 ? G.recoil * -0.9 : 0) + G.swY * 2, G.swX * 3, -G.swX * 2);
    const rl = G.reloadT > 0 ? Math.sin(Math.PI * (1 - G.reloadT / G.reloadMax)) : 0;   // dip + tilt while reloading
    if (rl) { wm.position.y -= rl * 0.13; wm.rotation.x -= rl * 0.35; wm.rotation.z = rl * 0.6; }
    updateShells(dt);
    if (wm.userData.flash.visible && G.recoil < 0.7) wm.userData.flash.visible = false;
    wMuzzle.position.set(0.16, -0.12, -0.7);
    renderer.clear();
    renderer.render(G.scene, camera);
    renderer.clearDepth();
    renderer.render(wScene, wCam);
  }

  /* ---------- HUD ---------- */
  const hudCache = {};
  const setT = (k, node, v) => { if (hudCache[k] !== v) { hudCache[k] = v; node.textContent = v; } };
  function updateHud(dt) {
    setT('hp', H_.hp, Math.ceil(G.hp)); setT('ar', H_.ar, Math.ceil(G.armor));
    H_.hpb.style.width = clamp(G.hp, 0, 100) + '%'; H_.arb.style.width = clamp(G.armor / 2, 0, 100) + '%';
    const w = WEAPON_DEFS[G.cur]; setT('wn', H_.wn, w.name + (G.reloadT > 0 ? ' · RELOADING' : '')); setT('am', H_.am, w.ammo ? Math.min(G.mag[G.cur], G.ammo[w.ammo]) + ' / ' + Math.max(0, G.ammo[w.ammo] - Math.min(G.mag[G.cur], G.ammo[w.ammo])) : '∞');
    const ws = G.owned.map((o, i) => (o ? 'own' : '') + (i === G.cur ? ' cur' : '')).join(',');
    if (hudCache.ws !== ws) { hudCache.ws = ws; [...H_.ws.children].forEach((s, i) => { s.className = (G.owned[i] ? 'own' : '') + (i === G.cur ? ' cur' : ''); }); }
    ['red', 'blue', 'yellow'].forEach((k, i) => H_.keys[i].classList.toggle('on', !!G.keys[k]));
    const left = G.enemies.filter(e => e.state !== 'dead').length;
    setT('obj', H_.obj, `Hostiles ${left}/${G.totalEnemies}` + (G.totalSecrets ? ` · Secrets ${G.secrets}/${G.totalSecrets}` : '') + ` · ${fmtTime(G.time)}`);
    G.dmgFlash = Math.max(0, G.dmgFlash - dt * 1.5); H_.vig.style.opacity = Math.max(G.dmgFlash, G.hp < 25 ? 0.35 + Math.sin(G.time * 5) * 0.1 : 0);
    G.pickFlash = Math.max(0, G.pickFlash - dt); H_.pick.style.opacity = G.pickFlash * 3;
    G.hitT = Math.max(0, G.hitT - dt); H_.hit.style.opacity = G.hitT > 0 ? 1 : 0;
    drawMinimap();
  }
  const fmtTime = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  let miniBase = null;
  function buildMinimapBase() {
    const L = G.L, s = 4; miniBase = document.createElement('canvas'); miniBase.width = L.w * s; miniBase.height = L.h * s;
    const c = miniBase.getContext('2d'); c.fillStyle = 'rgba(20,26,36,.9)'; c.fillRect(0, 0, miniBase.width, miniBase.height);
    for (let i = 0; i < L.w * L.h; i++) { const x = i % L.w, y = (i / L.w) | 0; if (L.kind[i]) { c.fillStyle = L.kind[i] === 'door' ? '#d08a30' : KEY_COLORS[L.kind[i]]; c.fillRect(x * s, y * s, s, s); } else if (L.wall[i]) { c.fillStyle = '#8a96aa'; c.fillRect(x * s, y * s, s, s); } else if (L.fh[i] > 0) { c.fillStyle = `rgba(120,140,170,${0.15 + L.fh[i] * 0.4})`; c.fillRect(x * s, y * s, s, s); } }
    G.exits.forEach(e => { c.fillStyle = '#2dffb0'; c.fillRect(e.x * s - 3, e.y * s - 3, 6, 6); });
  }
  function drawMinimap() {
    const c = H_.mini.getContext('2d'), R = 66, sc = 6;   // 6 px per cell, about 22 cells across
    c.clearRect(0, 0, 132, 132); c.save(); c.beginPath(); c.arc(R, R, R, 0, 7); c.clip();
    c.translate(R, R); c.rotate(-G.yaw - Math.PI / 2); c.scale(sc / 4, sc / 4); c.translate(-G.px * 4, -G.py * 4);
    c.drawImage(miniBase, 0, 0);
    c.fillStyle = '#ff3b30'; G.enemies.forEach(e => { if (e.state !== 'dead' && (e.state !== 'idle' || Math.hypot(e.x - G.px, e.y - G.py) < 8)) { c.beginPath(); c.arc(e.x * 4, e.y * 4, 2.6, 0, 7); c.fill(); } });
    c.fillStyle = '#ffc21a'; G.pickups.forEach(p => { if (!p.taken) c.fillRect(p.x * 4 - 1.2, p.y * 4 - 1.2, 2.4, 2.4); });
    c.restore();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(R, R - 7); c.lineTo(R - 5, R + 5); c.lineTo(R + 5, R + 5); c.fill();
  }
  function showBigMap(on) {
    bigMap.style.display = on ? 'flex' : 'none'; if (!on) return;
    const cv = bigMap.querySelector('canvas'), s = Math.max(4, Math.floor(Math.min(root.clientWidth * 0.9 / G.W, root.clientHeight * 0.85 / G.H)));
    cv.width = G.W * s; cv.height = G.H * s; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(miniBase, 0, 0, cv.width, cv.height);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(G.px * s, G.py * s, s * 0.45, 0, 7); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(G.px * s, G.py * s); c.lineTo((G.px + Math.cos(G.yaw)) * s, (G.py + Math.sin(G.yaw)) * s); c.stroke();
  }

  /* ---------- menus ---------- */
  function showMenu(kind) {
    menu.style.display = kind ? 'flex' : 'none';
    if (!kind) return;
    const L = G.L; let h = '';
    const ctrl = isTouch ? `<div class="dfg-ctrl"><span>Left side</span><span>drag to move</span><span>Right side</span><span>drag to look</span><span>FIRE</span><span>hold to shoot (drag to aim)</span><span>USE</span><span>open doors</span></div>`
      : `<div class="dfg-ctrl"><kbd>WASD</kbd><span>move · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump</span><kbd>Mouse</kbd><span>look · click to shoot</span><kbd>E</kbd><span>use / open doors</span><kbd>1-6</kbd><span>weapons · wheel / Q to cycle</span><kbd>F</kbd><span>flashlight · <kbd>M</kbd> map · <kbd>Esc</kbd> pause</span></div>`;
    if (kind === 'title') {
      h = `<h1>${esc(project.name || 'RetroEngine')}</h1><h2>${levels.length} level${levels.length > 1 ? 's' : ''} · made with RetroEngine</h2>
        <button class="dfg-btn pri" data-a="start0">Start campaign</button>
        ${levels.length > 1 ? `<div class="dfg-row"><span>Level</span><select data-s="lvl">${levels.map((l, i) => `<option value="${i}">${i + 1}. ${esc(l.name)}</option>`).join('')}</select></div><button class="dfg-btn" data-a="startSel">Play selected level</button>` : ''}
        <button class="dfg-btn" data-a="settings">Settings</button>${ctrl}`;
    } else if (kind === 'start') {
      h = `<h1>${esc(L.name)}</h1><h2>Level ${G.index + 1} of ${levels.length}</h2>${ctrl}<button class="dfg-btn pri" data-a="go">${isTouch ? 'Tap' : 'Click'} to start</button>${opts.onQuit ? '<button class="dfg-btn" data-a="quit">Back to editor</button>' : ''}`;
    } else if (kind === 'pause') {
      h = `<h1>PAUSED</h1><h2>${esc(L.name)}</h2><button class="dfg-btn pri" data-a="resume">Resume</button><button class="dfg-btn" data-a="restart">Restart level</button><button class="dfg-btn" data-a="settings">Settings</button><button class="dfg-btn" data-a="musicui">Music player</button><button class="dfg-btn" data-a="quit">${opts.onQuit ? 'Back to editor' : 'Quit to title'}</button>`;
    } else if (kind === 'music') {
      const curId = TP.pick === 'synth' || TP.failed || !usePack ? 'synth' : TP.cur;
      h = `<h1>MUSIC</h1><h2>${TP.failed || !usePack ? 'Tracks unavailable offline — using synth' : 'Tap a track to play it'}</h2><div class="dfg-tracks">` +
        MUSIC_TRACKS.map((t, i) => `<button class="dfg-trk${curId === t.id ? ' on' : ''}" data-a="track" data-i="${i}"><b>${esc(t.title)}</b><span>${esc(t.artist)} · ${esc(t.genre)} · ${esc(t.license)}</span></button>`).join('') +
        `<button class="dfg-trk${curId === 'synth' ? ' on' : ''}" data-a="track" data-i="-1"><b>Synth ambient</b><span>RetroEngine generative music · built in</span></button></div>` +
        `<p style="font-size:11px;opacity:.6;line-height:1.5">Music licensed under Creative Commons Attribution 4.0 (creativecommons.org/licenses/by/4.0). Kevin MacLeod — incompetech.com · Shane Ivers — silvermansound.com</p><button class="dfg-btn pri" data-a="back">Back</button>`;
    } else if (kind === 'settings') {
      const r = (k, lab, min, max, step) => `<div class="dfg-row"><span>${lab}</span><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${S[k]}"></div>`;
      const c = (k, lab) => `<div class="dfg-row"><span>${lab}</span><input type="checkbox" data-k="${k}" ${S[k] ? 'checked' : ''}></div>`;
      h = `<h1>SETTINGS</h1><h2>Saved on this device</h2>${r('sens', 'Look sensitivity', 0.2, 3, 0.05)}${r('fov', 'Field of view', 60, 100, 1)}${r('volume', 'Master volume', 0, 1, 0.05)}${r('sfx', 'Effects volume', 0, 1, 0.05)}${r('music', 'Music volume', 0, 1, 0.05)}${isTouch ? r('touchScale', 'Touch button size', 0.7, 1.4, 0.05) : ''}
        <div class="dfg-row"><span>Graphics quality</span><select data-k="quality"><option value="auto">Auto (adapts to device)</option><option value="low">Low (fastest)</option><option value="medium">Medium</option><option value="high">High</option></select></div>
        <div class="dfg-row"><span>Difficulty</span><select data-k="difficulty"><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></div>
        ${c('invertY', 'Invert look up/down')}${c('bob', 'Head bob')}${c('showFps', 'Show FPS')}${isTouch && navigator.vibrate ? c('haptics', 'Vibrate on hits') : ''}
        <p style="font-size:11px;opacity:.6">Quality changes to lights & textures apply on the next level load.</p><button class="dfg-btn pri" data-a="back">Back</button>`;
    } else if (kind === 'dead') {
      h = `<h1 style="color:#ff3b30">YOU DIED</h1><h2>${esc(L.name)}</h2>${stats()}<button class="dfg-btn pri" data-a="restart">Try again</button><button class="dfg-btn" data-a="quit">${opts.onQuit ? 'Back to editor' : 'Quit to title'}</button>`;
    } else if (kind === 'won') {
      const lastOne = G.index >= levels.length - 1;
      h = `<h1 style="color:#2dffb0">${lastOne ? 'CAMPAIGN COMPLETE' : 'LEVEL COMPLETE'}</h1><h2>${esc(L.name)}</h2>${stats()}${lastOne ? '' : '<button class="dfg-btn pri" data-a="next">Next level</button>'}<button class="dfg-btn${lastOne ? ' pri' : ''}" data-a="restart">Replay level</button><button class="dfg-btn" data-a="quit">${opts.onQuit ? 'Back to editor' : 'Quit to title'}</button>`;
    }
    if (isTouch && (kind === 'start' || kind === 'title' || kind === 'pause')) h += `<div class="dfg-rot">Tip: turn your phone sideways for the best view</div>${FS.ok() && !FS.el() ? '<button class="dfg-btn" data-a="fs">Full screen</button>' : ''}`;
    menu.innerHTML = `<div class="dfg-panel dfg-glass">${h}</div>`; refreshPortraitTip();
    menu.dataset.kind = kind;
    const q = menu.querySelector('[data-k="quality"]'); if (q) q.value = S.quality;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function stats() { return `<div class="dfg-stats"><span>Time</span><b>${fmtTime(G.time)}</b><span>Kills</span><b>${G.kills} / ${G.totalEnemies}</b><span>Items</span><b>${G.items} / ${G.totalItems}</b><span>Secrets</span><b>${G.secrets} / ${G.totalSecrets}</b></div>`; }
  let menuBack = 'pause';
  menu.addEventListener('click', ev => {
    const b = ev.target.closest('[data-a]'); if (!b) return; Sound.init(); Sound.play('ui');
    const a = b.dataset.a;
    if (a === 'fs') { toggleFullscreen(); b.remove(); return; }
    if (a === 'go' || a === 'resume') begin();
    else if (a === 'start0') { loadLevel(0, false); begin(); }
    else if (a === 'startSel') { loadLevel(+menu.querySelector('[data-s="lvl"]').value, false); begin(); }
    else if (a === 'restart') { loadLevel(G.index, G.index > 0); begin(); }
    else if (a === 'next') { saveCarry(); loadLevel(G.index + 1, true); begin(); }
    else if (a === 'settings') { menuBack = menu.dataset.kind; showMenu('settings'); }
    else if (a === 'back') { music(false); showMenu(menuBack); }
    else if (a === 'musicui') { menuBack = menu.dataset.kind; showMenu('music'); }
    else if (a === 'track') { const i = +b.dataset.i; TP.pick = i < 0 ? 'synth' : MUSIC_TRACKS[i].id; Sound.init(); if (i >= 0 && TP.audio) TP.cur = null; music(true); showMenu('music'); }
    else if (a === 'quit') { if (opts.onQuit) opts.onQuit(); else { state = 'menu'; music(false); showMenu('title'); } }
  });
  menu.addEventListener('input', ev => {
    const k = ev.target.dataset.k; if (!k) return;
    S[k] = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.tagName === 'SELECT' ? ev.target.value : +ev.target.value;
    saveSettings(); Sound.applyVolume(); if (TP.audio) TP.audio.volume = clamp(S.volume * S.music, 0, 1); resize(); H_.fps.style.display = S.showFps ? 'block' : 'none';
    if (k === 'touchScale') touch.querySelectorAll('.dfg-tb').forEach(b => { b.style.transform = `scale(${S.touchScale})`; });
  });
  function saveCarry() { carry.hp = Math.max(G.hp, 50); carry.armor = G.armor; carry.ammo = Object.assign({}, G.ammo); carry.owned = G.owned.slice(); carry.cur = G.cur; carry.mag = G.mag.slice(); }

  function begin() {
    Sound.init(); state = 'playing'; showMenu(null); last = performance.now();
    music(true);
    if (!isTouch) lockPointer();
  }
  function pause() { if (state !== 'playing') return; state = 'paused'; showMenu('pause'); input.fire = input.mouseFire = false; input.fireTap = 0; music(false); if (document.pointerLockElement) document.exitPointerLock(); }
  function playerDie() { state = 'dead'; music(false); input.fire = input.mouseFire = false; setTimeout(() => { if (state === 'dead' && !destroyed) { showMenu('dead'); if (document.pointerLockElement) document.exitPointerLock(); } }, 1200); }
  function levelComplete() {
    if (state !== 'playing') return; state = 'won'; Sound.play('win'); music(false); fire('exit');
    input.fire = input.mouseFire = false; if (document.pointerLockElement) document.exitPointerLock();
    showMenu('won'); if (opts.onEvent) opts.onEvent('won', G.index);
  }
  function lockPointer() { try { const p = renderer.domElement.requestPointerLock && renderer.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }

  /* ---------- keyboard & mouse ---------- */
  const onKey = ev => {
    const down = ev.type === 'keydown';
    if (ev.target && /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return;
    input.keys[ev.code] = down;
    if (!down || !G) return;
    if (ev.code === 'KeyE') input.use = true;
    if (ev.code === 'KeyR') input.reload = true;           // latch taps so a quick press is never missed
    if (ev.code === 'Space') input.jump = true;
    if (ev.code === 'Escape' || ev.code === 'KeyP') { if (state === 'playing') pause(); else if (state === 'paused' && ev.code === 'KeyP') begin(); }
    if (state !== 'playing') return;
    if (/^Digit[1-6]$/.test(ev.code)) selectWeapon(+ev.code.slice(5) - 1);
    if (ev.code === 'KeyQ') cycleWeapon(1);
    if (ev.code === 'KeyF') { G.flashOn = !G.flashOn; Sound.play('ui'); }
    if (ev.code === 'KeyM' || ev.code === 'Tab') { showBigMap(bigMap.style.display !== 'flex'); ev.preventDefault(); }
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(ev.code)) ev.preventDefault();
  };
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey);
  const cv = renderer.domElement;
  let dragging = false, lx = 0, ly = 0;
  cv.addEventListener('mousedown', ev => {
    if (state !== 'playing') return;
    if (!document.pointerLockElement) lockPointer();
    if (ev.button === 0) { input.mouseFire = true; input.fireTap = performance.now(); }
    dragging = true; lx = ev.clientX; ly = ev.clientY;
  });
  const onMove = ev => {
    if (state !== 'playing') return;
    if (document.pointerLockElement === cv) { input.mdx += ev.movementX || 0; input.mdy += ev.movementY || 0; }
    else if (dragging) { input.mdx += ev.clientX - lx; input.mdy += ev.clientY - ly; lx = ev.clientX; ly = ev.clientY; } // fallback: drag to look
  };
  const onUp = () => { input.mouseFire = false; dragging = false; };
  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  cv.addEventListener('wheel', ev => { if (state === 'playing') { cycleWeapon(ev.deltaY > 0 ? 1 : -1); ev.preventDefault(); } }, { passive: false });
  const onLockChange = () => { if (!document.pointerLockElement && state === 'playing' && !isTouch && lockedOnce) pause(); if (document.pointerLockElement) lockedOnce = true; };
  let lockedOnce = false;
  document.addEventListener('pointerlockchange', onLockChange);
  topBtns.addEventListener('click', ev => { const b = ev.target.closest('[data-b]'); if (!b || !G) return; const k = b.dataset.b; if (k === 'pause') { if (state === 'playing') pause(); } else if (k === 'map') showBigMap(bigMap.style.display !== 'flex'); else if (k === 'light') G.flashOn = !G.flashOn; else if (k === 'fs') toggleFullscreen(); });
  // Full screen hides the phone's address bar. On Android also try to lock landscape (ignored where unsupported).
  function toggleFullscreen() {
    if (!FS.ok()) return false;
    if (FS.el()) { FS.exit(); return true; }
    FS.enter(container);
    if (isTouch) setTimeout(() => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) {} }, 200);
    return true;
  }
  bigMap.addEventListener('click', () => showBigMap(false));

  /* ---------- touch controls: floating joystick (left), drag-to-look (right), buttons ---------- */
  const joy = touch.querySelector('.dfg-joy'), knob = joy.querySelector('i');
  function tStart(ev) {
    if (state !== 'playing') return;
    input.touchAim = true;
    for (const t of ev.changedTouches) {
      const tgt = document.elementFromPoint(t.clientX, t.clientY) || t.target;
      const btn = tgt.closest && tgt.closest('.dfg-tb');
      if (btn) {
        const k = btn.dataset.t; btn.classList.add('down');
        if (k === 'fire') { input.fire = true; input.fireTap = performance.now(); fireTouch = { id: t.identifier, x: t.clientX, y: t.clientY, btn }; }
        else if (k === 'jump') input.jump = true; else if (k === 'use') input.use = true; else if (k === 'swap') cycleWeapon(1); else if (k === 'reload') input.reload = true;
        else if (k === 'run') { input.run = !input.run; btn.classList.toggle('on', input.run); }
        if (k !== 'fire') setTimeout(() => btn.classList.remove('down'), 120);
        continue;
      }
      const zone = tgt.closest && tgt.closest('.dfg-zone');
      if (zone && zone.dataset.z === 'move' && !moveTouch) { const r = root.getBoundingClientRect(); moveTouch = { id: t.identifier, ox: t.clientX, oy: t.clientY }; joy.style.display = 'block'; joy.style.left = (t.clientX - r.left) + 'px'; joy.style.top = (t.clientY - r.top) + 'px'; knob.style.transform = ''; }
      else if (zone && !lookTouch) lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
    }
    ev.preventDefault();
  }
  function tMove(ev) {
    for (const t of ev.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) {
        let dx = t.clientX - moveTouch.ox, dy = t.clientY - moveTouch.oy;
        const d = Math.hypot(dx, dy), max = 56, dead = 8;
        if (d < dead) { input.joyX = input.joyY = 0; input.autoRun = false; knob.style.transform = ''; }
        else {
          if (d > max) { dx = dx / d * max; dy = dy / d * max; }
          input.joyX = dx / max; input.joyY = dy / max; knob.style.transform = `translate(${dx}px,${dy}px)`;
          input.autoRun = !input.run && input.joyY < -0.72;
        }
      } else if (lookTouch && t.identifier === lookTouch.id) { input.mdx += (t.clientX - lookTouch.x) * 2.0; input.mdy += (t.clientY - lookTouch.y) * 2.0; lookTouch.x = t.clientX; lookTouch.y = t.clientY; }
      else if (fireTouch && t.identifier === fireTouch.id) { input.mdx += (t.clientX - fireTouch.x) * 2.0; input.mdy += (t.clientY - fireTouch.y) * 2.0; fireTouch.x = t.clientX; fireTouch.y = t.clientY; }
    }
    ev.preventDefault();
  }
  function tEnd(ev) {
    for (const t of ev.changedTouches) {
      if (moveTouch && t.identifier === moveTouch.id) { moveTouch = null; input.joyX = input.joyY = 0; input.autoRun = false; joy.style.display = 'none'; }
      if (lookTouch && t.identifier === lookTouch.id) lookTouch = null;
      if (fireTouch && t.identifier === fireTouch.id) { input.fire = false; fireTouch.btn.classList.remove('down'); fireTouch = null; }
    }
  }
  touch.addEventListener('touchstart', tStart, { passive: false }); touch.addEventListener('touchmove', tMove, { passive: false });
  touch.addEventListener('touchend', tEnd); touch.addEventListener('touchcancel', tEnd);
  const onVis = () => { if (document.hidden) pause(); };
  document.addEventListener('visibilitychange', onVis);

  /* ---------- main loop ---------- */
  let adLast = performance.now();
  function frame(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const time = now / 1000;
    if (G && state === 'playing') {
      G.time += dt;
      updatePlayer(dt);
      if (state === 'playing') { updateDoors(dt); updateEnemies(dt, time); updateProjectiles(dt); fire('tick', dt); }
    } else if (G && state === 'dead') { updateEnemies(dt, time); updateProjectiles(dt); }
    if (G) { updateParticles(dt); updateLights(dt, time); updateHud(dt); render(time, dt); }
    if (S.quality === 'auto' && state === 'playing') {
      adT += (now - adLast) / 1000; adN++;
      if (adT >= 2) { const f = adN / adT, o = dynScale;
        if (f < 45) dynScale = Math.max(0.5, dynScale - (f < 30 ? 0.2 : 0.1)); else if (f > 57) dynScale = Math.min(1, dynScale + 0.05);
        if (o !== dynScale) resize(); adT = adN = 0; }
    } else adT = adN = 0;
    adLast = now;
    fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { H_.fps.textContent = Math.round(fpsN / fpsAcc) + ' FPS'; fpsAcc = 0; fpsN = 0; }
  }

  /* ---------- start ---------- */
  resize();
  H_.fps.style.display = S.showFps ? 'block' : 'none';
  loadLevel(opts.level || 0, false);
  if (opts.title) { state = 'menu'; showMenu('title'); } else showMenu('start');
  raf = requestAnimationFrame(frame);

  const handle = {
    get game() { return G; }, get state() { return state; }, camera, renderer, begin, pause, loadLevel, selectWeapon, shoot: () => shoot(), startReload: () => startReload(), weaponMeshes, music: TP, get dynScale() { return dynScale; }, set dynScale(v) { dynScale = v; resize(); }, toggleFullscreen, damagePlayer, levelComplete,
    destroy() {
      destroyed = true; cancelAnimationFrame(raf); Sound.music(false); if (TP.audio) { TP.audio.pause(); TP.audio.removeAttribute('src'); }
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
      window.removeEventListener('resize', resize); window.removeEventListener('orientationchange', onOrient); if (window.visualViewport) window.visualViewport.removeEventListener('resize', onOrient); if (FS.el()) FS.exit(); document.removeEventListener('pointerlockchange', onLockChange); document.removeEventListener('visibilitychange', onVis);
      if (ro) ro.disconnect(); if (document.pointerLockElement) document.exitPointerLock();
      if (G) disposeLevel(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {}
      root.remove();
    }
  };
  // test hook: step the AI deterministically (the game itself never calls this)
  window.RETROENGINE_DEBUG = { handle, THREE, input, los: (a, b, c, d) => los(a, b, c, d), findCover: e => findCover(e), damageEnemy: (e, d) => damageEnemy(e, d), diff: () => diff(),
    step(dt, n) { for (let i = 0; i < (n || 1); i++) { G.time += dt; updateEnemies(dt, G.time); updateProjectiles(dt); updateDoors(dt); } } };
  return handle;
}


/* Exported game boot: full-screen title menu. */
function boot(project) {
  document.body.style.margin = '0';
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset:0';
  document.body.appendChild(host);
  if (!window.THREE) { host.innerHTML = '<p style="color:#fff;font:16px sans-serif;padding:20px">Could not load Three.js from the internet. Connect once and reload.</p>'; return; }
  return play(host, project, { title: true });
}
return {
  VERSION, HOSTED_BASE, MUSIC_TRACKS, ASSET_PACK, play, boot, Sound, S, saveSettings,
  TEX_DEFS, WALL_TEXTURES, FLOOR_TEXTURES, CEIL_TEXTURES, SKIES, ENEMY_DEFS, WEAPON_DEFS, PICKUP_DEFS, PROP_DEFS, KEY_COLORS,
  getThumb, newLevel, normalizeLevel, validateLevel, defaultProps, STEP_H
};
} /* end of DFRuntime */

/* =====================================================================
   EDITOR DATA: text legend, building & room templates.
   Templates are drawn as text so you can easily add your own:
   every character is one grid cell (see TEMPLATE_LEGEND below).
   ===================================================================== */
const DEFAULT_LEGEND = {
  '#': { wall: 'concrete' }, '%': { wall: 'metal_panel' }, '&': { wall: 'brick' }, 'S': { wall: 'server' },
  '.': { floor: '', ceil: '' }, ',': { floor: 'tile', ceil: 'light_panel' }, '~': { floor: 'asphalt', ceil: 'sky' },
  ';': { floor: 'hazard', ceil: '' }, ':': { floor: 'grate', ceil: 'metal_panel' }
};
// Characters that place things (they also become floor, copying the floor to their left)
const ENTITY_CHARS = {
  '@': ['spawn'], 'X': ['exit'],
  'L': ['light', '#ffd9a0', 6, 1.4, false], 'F': ['light', '#ff8a3a', 5, 1.5, true], 'C': ['light', '#4ad8ff', 6, 1.3, false], 'V': ['light', '#ff3030', 5, 1.4, true],
  'g': ['enemy', 'grunt'], 'd': ['enemy', 'drone'], 'H': ['enemy', 'heavy'], 't': ['enemy', 'turret'], 'T': ['enemy', 'titan'],
  'h': ['pickup', 'health'], 'm': ['pickup', 'medkit'], 'a': ['pickup', 'armor'], 'A': ['pickup', 'armor_heavy'], 'u': ['pickup', 'ammo_bullets'], 's': ['pickup', 'ammo_shells'],
  'c': ['pickup', 'ammo_cells'], 'k': ['pickup', 'ammo_rockets'], 'R': ['pickup', 'key_red'], 'B': ['pickup', 'key_blue'], 'Y': ['pickup', 'key_yellow'],
  'w': ['pickup', 'w_shotgun'], 'q': ['pickup', 'w_rifle'], 'p': ['pickup', 'w_plasma'], 'z': ['pickup', 'w_rocket'], '$': ['pickup', 'chip'],
  'o': ['prop', 'barrel'], 'x': ['prop', 'crate'], 'K': ['prop', 'crate_tall'], 'P': ['prop', 'pillar'], 'e': ['prop', 'desk'], 'n': ['prop', 'terminal'], 'N': ['prop', 'server'],
  'i': ['prop', 'pipes'], 'G': ['prop', 'generator'], 'l': ['prop', 'locker'], 'f': ['prop', 'lamp'], 'v': ['prop', 'cone'], 'j': ['prop', 'debris'], 'Z': ['prop', 'sandbags']
};
const DOOR_CHARS = { 'D': 'door', 'r': 'red', 'b': 'blue', 'y': 'yellow' };
const HEIGHT_CHARS = { '1': 0.15, '2': 0.3, '3': 0.45, '4': 0.6, '5': 0.75 };
const TEMPLATE_LEGEND_HELP = 'Walls: # % & S · Floors: . , ~(sky) ; : · Doors: D, r/b/y = keycard doors · Heights 1-4 = stairs/catwalk, 5 = cover block · @ start · X exit · L F C V lights · g d H t T enemies · h m a A u s c k pickups · R B Y keys · w q p z weapons · $ secret · o x K P e n N i G l f v j Z props';

const TEMPLATES = [
  { id: 'small_room', name: 'Small Room', cat: 'Rooms', desc: '5x5 room, one door', rows: [
    '#######', '#L...x#', '#.....#', '#..g..#', '#.....#', '#h...L#', '###D###'] },
  { id: 'junction', name: 'Junction Room', cat: 'Rooms', desc: 'Doors on all 4 sides', rows: [
    '####D####', '#L.....L#', '#..x.x..#', '#.......#', 'D...g...D', '#.......#', '#..x.x..#', '#L.....L#', '####D####'] },
  { id: 'arena', name: 'Combat Arena', cat: 'Rooms', desc: 'Pillars, cover and raised corners', legend: { '#': { wall: 'concrete_dark' }, '.': { floor: 'plate', ceil: '' } }, rows: [
    '###############', '#F.....D.....F#', '#.22.......22.#', '#.22..P.P..22.#', '#.............#', '#..P...5...P..#', '#....g...g....#', 'D..5..hLa..5..D',
    '#....g...g....#', '#..P...5...P..#', '#.............#', '#.22..P.P..22.#', '#.22.......22.#', '#F.....D.....F#', '###############'] },
  { id: 'server_room', name: 'Server Room', cat: 'Rooms', desc: 'Glowing rack aisles', legend: { '%': { wall: 'tech' }, '.': { floor: 'grate', ceil: 'metal_panel' } }, rows: [
    '%%%%%D%%%%%', '%C.......C%', '%.SS.S.SS.%', '%.SS.S.SS.%', '%....d....%', '%.SS.S.SS.%', '%.SS.S.SS.%', '%C...n...C%', '%%%%%%%%%%%'] },
  { id: 'warehouse', name: 'Warehouse', cat: 'Rooms', desc: 'Crate stacks & barrels', legend: { '%': { wall: 'rust' }, '.': { floor: 'concrete', ceil: 'grate' } }, rows: [
    '%%%%%%%D%%%%%%%', '%L....x.x....L%', '%.xx.......Kx.%', '%.xK..ooo..xx.%', '%.............%', 'D.....g.......D', '%.............%', '%.Kx.......xx.%', '%.xx...u...xK.%', '%L...........L%', '%%%%%%%D%%%%%%%'] },
  { id: 'reactor', name: 'Reactor Chamber', cat: 'Rooms', desc: 'Hazard ring around a core', legend: { '%': { wall: 'tech' }, '.': { floor: 'plate', ceil: '' } }, rows: [
    '%%%%%D%%%%%', '%F.......F%', '%.;;;;;;;.%', '%.;i...i;.%', '%.;.555.;.%', 'D.;.5G5.;.D', '%.;.555.;.%', '%.;i...i;.%', '%.;;;;;;;.%', '%F...c...F%', '%%%%%D%%%%%'] },
  { id: 'office', name: 'Office', cat: 'Rooms', desc: 'Desks, terminals, lockers', legend: { '.': { floor: 'tile_dark', ceil: 'light_panel' } }, rows: [
    '###########', '#L..e..e.L#', '#.........#', 'D..e..e..n#', '#.........#', '#l.h..g..f#', '#####D#####'] },
  { id: 'lockers', name: 'Locker Room', cat: 'Rooms', desc: 'Tiled, with a hidden secret', legend: { '#': { wall: 'tile' }, '.': { floor: 'tile', ceil: 'light_panel' } }, rows: [
    '#########', '#lllllll#', '#.......#', '#L.....L#', '#..m....#', '#.......#', '#lllllll#', '#...$...#', '####D####'] },
  { id: 'key_vault', name: 'Red Key Vault', cat: 'Rooms', desc: 'Locked with a red keycard door', legend: { '#': { wall: 'concrete_dark' } }, rows: [
    '###r###', '#V...V#', '#.....#', '#..m..#', '#.....#', '#.o.o.#', '#######'] },
  { id: 'exit_lift', name: 'Exit Lift', cat: 'Rooms', desc: 'Small room with the exit pad', rows: [
    '&&&&&', '&C.C&', '&.X.&', '&...&', '&&D&&'] },
  { id: 'corridor', name: 'Corridor', cat: 'Halls', desc: 'Open ends — butt it against a door', rows: [
    '%%%%%%%%%%%', '.L.......L.', '...........', '.....o.....', '%%%%%%%%%%%'] },
  { id: 'corridor_v', name: 'Corridor (N-S)', cat: 'Halls', desc: 'Vertical 3-wide hall', rows: [
    '%...%', '%L..%', '%...%', '%...%', '%...%', '%..L%', '%...%'] },
  { id: 'l_hall', name: 'L-Hall', cat: 'Halls', desc: 'Corner hallway', rows: [
    '%%%%%%%%%', '.L......%', '........%', '......L.%', '%%%%%...%', '    %...%', '    %...%', '    %.L.%', '    %...%'] },
  { id: 't_junction', name: 'T-Junction', cat: 'Halls', desc: 'Three-way split', rows: [
    '%%%%%%%%%%%', '.....L.....', '...........', '...........', '%%%%...%%%%', '   %...%   ', '   %...%   '] },
  { id: 'stairs', name: 'Stairs Up', cat: 'Halls', desc: 'Rises 0.6 — leads onto catwalks', rows: [
    '%...%', '%444%', '%333%', '%222%', '%111%', '%.L.%', '%...%'] },
  { id: 'bunker', name: 'Bunker', cat: 'Buildings', desc: 'Thick concrete, sandbags, heavy mech', legend: { '#': { wall: 'concrete_dark' } }, rows: [
    '###########', '#F.......F#', '#.Z.....Z.#', '#....H....#', '#.l.....l.#', '#Z.......Z#', '#.........#', '#A..s.u...#', '#####D#####'] },
  { id: 'tower', name: 'Guard Tower', cat: 'Buildings', desc: 'Two levels: stairs to a catwalk ring', legend: { '#': { wall: 'concrete_dark' }, '.': { floor: 'grate', ceil: '' } }, rows: [
    '#########', '#t.....t#', '#.......#', '#...L...#', '#...x...#', '#.......#', '#.......#', '#d.....d#', '####D####'], hrows: [
    '.........', '.4444444.', '.4.....4.', '.4.....4.', '.4.....4.', '.4.....4.', '.4.....4.', '.4321234.', '.........'] },
  { id: 'mezzanine', name: 'Mezzanine Hall', cat: 'Buildings', desc: 'Raised balcony with turrets', legend: { '.': { floor: 'plate', ceil: '' } }, rows: [
    '%%%%%%%%%%%', '%t.......t%', '%.........%', '%.........%', '%...g.....%', '%.L.....L.%', '%%%%%D%%%%%'], hrows: [
    '...........', '.444444444.', '.444444444.', '.3.......3.', '.2.......2.', '.1.......1.', '...........'] },
  { id: 'courtyard', name: 'Courtyard', cat: 'Buildings', desc: 'Open sky, planters, street lamps', rows: [
    '&&&&&&D&&&&&&', '&f~~~~~~~~~f&', '&~55~~~~~55~&', '&~55~~j~~55~&', '&~~~~~~~~~~~&', 'D~~~~~d~~~~~D', '&~~~v~~~v~~~&', '&~55~~~~~55~&', '&~55~~h~~55~&', '&f~~~~~~~~~f&', '&&&&&&D&&&&&&'] },
  { id: 'hangar', name: 'Hangar', cat: 'Buildings', desc: 'Huge open-roof bay with cargo', legend: { '%': { wall: 'rust' } }, rows: [
    '%%%%%%%%%%%%%%%%%', '%F~~~~~~~~~~~~~F%', '%~~~~~~~~~~~~~~~%', '%~~xxK~~~~~Kxx~~%', '%~~xx~~~~~~~xx~~%', '%~~~~~~~G~~~~~~~%', 'D~~~~~~~~~~~~~~~D', '%~~~~~~~o~~~~~~~%', '%~~xx~~~~~~~xx~~%', '%~~Kxx~~~~~xxK~~%', '%~~~~~~d~d~~~~~~%', '%F~~~~~~~~~~~~~F%', '%%%%%%%%D%%%%%%%%'] },
  { id: 'guard_hut', name: 'Guard Hut', cat: 'Buildings', desc: 'Tiny prefab checkpoint', legend: { '%': { wall: 'metal_panel' } }, rows: [
    '%%D%%', '%f.u%', '%...%', '%h.g%', '%%%%%'] },
  { id: 'start_room', name: 'Start Room', cat: 'Set pieces', desc: 'Player start + supplies', rows: [
    '#######', '#L...L#', '#.u.h.#', '#..@..#', '#.....#', '#.....#', '###D###'] }
];

/* Turn text rows into a list of cell changes and entities.
   rot = 0..3 quarter turns clockwise (R key while stamping). */
function parseTemplate(tpl, rot) {
  rot = rot || 0;
  const legend = Object.assign({}, DEFAULT_LEGEND, tpl.legend || {});
  const rows = tpl.rows, H = rows.length, W = Math.max.apply(null, rows.map(r => r.length));
  const cells = [], ents = []; let spawn = null;
  const rotP = (x, y) => { let px = x, py = y, w = W, h = H; for (let r = 0; r < rot; r++) { const nx = h - 1 - py, ny = px; px = nx; py = ny; const t = w; w = h; h = t; } return [px, py]; };
  for (let y = 0; y < H; y++) {
    let lastFloor = '.';
    for (let x = 0; x < W; x++) {
      const ch = rows[y][x] || ' '; if (ch === ' ') continue;
      const hch = tpl.hrows && tpl.hrows[y] ? tpl.hrows[y][x] : '.';
      const [px, py] = rotP(x, y);
      const c = { x: px, y: py };
      const lg = legend[ch];
      if (lg && lg.wall) { c.wall = lg.wall; c.kind = ''; }
      else if (DOOR_CHARS[ch]) { c.wall = 'door'; c.kind = DOOR_CHARS[ch]; }
      else {
        let fl = lg && lg.floor !== undefined ? ch : (HEIGHT_CHARS[ch] !== undefined || ENTITY_CHARS[ch] ? lastFloor : '.');
        if (lg && lg.floor !== undefined) lastFloor = ch;
        const L2 = legend[fl] || legend['.'];
        c.wall = ''; c.kind = ''; c.floor = L2.floor || ''; c.ceil = L2.ceil || ''; c.fh = HEIGHT_CHARS[ch] !== undefined ? HEIGHT_CHARS[ch] : (HEIGHT_CHARS[hch] || 0);
        const ed = ENTITY_CHARS[ch];
        if (ed) {
          if (ed[0] === 'spawn') spawn = { x: px + 0.5, y: py + 0.5 };
          else if (ed[0] === 'light') ents.push({ t: 'light', x: px + 0.5, y: py + 0.5, color: ed[1], radius: ed[2], intensity: ed[3], flicker: ed[4] });
          else ents.push({ t: ed[0], s: ed[1], x: px + 0.5, y: py + 0.5, r: ed[0] === 'enemy' ? Math.PI / 2 : 0 });
        }
      }
      cells.push(c);
    }
  }
  const w = rot % 2 ? H : W, h = rot % 2 ? W : H;
  return { w, h, cells, ents, spawn };
}
// Build a full level from a text-drawn starter level.
function levelFromAscii(def, RT) {
  const H = def.rows.length, W = def.rows[0].length, L = RT.newLevel(def.name, W, H);
  Object.assign(L.props, def.props || {});
  const p = parseTemplate({ rows: def.rows, hrows: def.hrows, legend: def.legend });
  p.cells.forEach(c => { const i = c.y * W + c.x; L.wall[i] = c.wall || ''; L.kind[i] = c.kind || ''; if (c.floor !== undefined) { L.floor[i] = c.floor; L.ceil[i] = c.ceil; L.fh[i] = c.fh || 0; } });
  L.ents = p.ents.map((e, i) => Object.assign({ id: 'e' + i.toString(36) + Math.random().toString(36).slice(2, 6) }, e));
  if (p.spawn) L.spawn = { x: p.spawn.x, y: p.spawn.y, r: def.spawnR || 0 };
  // Enemies start facing the player start so they look alive.
  L.ents.forEach(e => { if (e.t === 'enemy') e.r = Math.atan2(L.spawn.y - e.y, L.spawn.x - e.x); });
  return L;
}

/* Starter levels, drawn as text. Each character is one cell — see TEMPLATE_LEGEND. hrows = floor heights. */
const DF_STARTER_LEVELS = [
 {
  "name": "E1M1: Outpost Breach",
  "rows": [
   "&&&&&&&&&&##########################",
   "&~~~~~~~~&############.............#",
   "&~L~~~hx~&%%%%%%%%%%%%.h.........F.#",
   "&~~~~~~~~&,,,,,,,g,,,%......g......#",
   "&~~@~~~~~D,,L,,,,,L,,D...P.....P...#",
   "&~~~~~~~~&,,,,,o,,,,,%...ZZ....ZZ..#",
   "&~x~~~uL~&%%%%%%%%%%%%.....dL......#",
   "&~~~~~~~~&############..g......g...#",
   "&&&&&&&&&&############...P.....P...#",
   "######################........g..x.#",
   "######################.ws.......xx.#",
   "######################.............#",
   "&&&&&&&&&&###########%%%%%%%D%%%%%%%",
   "&........&,,q,,,,,,,,%;;;;;;g;;;;;;%",
   "&.$......&,,,,,,,,,m,%;;;;;;;;;;;a;%",
   "&........&,,e,,e,,e,,%;;;L;;;;;g;;;%",
   "&........&,,,,,,,,,,,%;;;;xx;;;;;;;%",
   "&...C....b,,,L,,,,,,,D;;;;K;;;;;;;;%",
   "&........&,,,,,,,,,,,%;;ZZ;;;;;ZZ;;%",
   "&...X....&,,,,g,,,,,,%;;;g;;;;xx;;;%",
   "&........&,,n,,,,,L,,%;;;;;;d;;;;;;%",
   "&l.....F.&,u,,,,H,,,,%;oo;;;;;;L;B;%",
   "&l.......&,,,,,,,,,,,%;;;;;;;;;;;;;%",
   "&&&&&&&&&&###########%%%%%%%%%%%%%%%"
  ],
  "spawnR": 0,
  "legend": {
   "#": {
    "wall": "concrete"
   },
   "%": {
    "wall": "metal_panel"
   },
   "&": {
    "wall": "brick"
   },
   ".": {
    "floor": "concrete"
   },
   ",": {
    "floor": "tile_dark",
    "ceil": "light_panel"
   },
   "~": {
    "floor": "asphalt",
    "ceil": "sky"
   },
   ";": {
    "floor": "plate",
    "ceil": "grate"
   }
  },
  "props": {
   "sky": "night",
   "ambient": "#8d96ad",
   "ambientI": 0.55,
   "fogColor": "#0a0d14",
   "fog": 0.04,
   "wallH": 1.5,
   "floorTex": "concrete",
   "ceilTex": "ceiling",
   "track": "seismic",
   "script": "api.on('start', () => api.message('OUTPOST BREACH — find the BLUE keycard, reach the exit lift'));\napi.on('pickup', t => { if (t === 'w_rifle') api.message('Assault rifle: hold fire, R to reload'); if (t === 'key_blue') api.message('Blue keycard — the lift is west'); });\napi.on('kill', () => { if (api.enemiesLeft() === 0) api.message('Outpost clear'); });"
  }
 },
 {
  "name": "E1M2: Server Hall G",
  "rows": [
   "%%%%%%%%%%%#############################",
   "%,,,,,,,,,%#############################",
   "%,,,,L,,h,%#############################",
   "%,,,,,,,,,%................#############",
   "%,,@,,,,,,D...C.....g..Cg..#############",
   "%,,,,,,,,,%..............o.#############",
   "%,,,,,,,,,%SSSSSSSDSSSSSSSSSSSSS%%%%%%%%",
   "%,e,,L,,n,%:::::::::::::::::::RS;;;;;;m%",
   "%,,,,,,,,,%:sC:::d::::C::::::::S;;d;;;;%",
   "%%%%%D%%%%%:::SS:::SS:::SS:::::S;;;;;d;%",
   "#........#S:::SS:::SS:::SS:d:::r;;;G;;;%",
   "#l.....u.#S:::SS:::SS:::SS:::t:S;;;;;;;%",
   "#l.......#S::::ZZ:::::::ZZ:::::S;;;;H;;%",
   "#.L......#S::::::C::::::::C::::S;F;;;Y;%",
   "#...q....#S:::::::::::g::::::::S;;;;;;;%",
   "#......L.#S:::SS:::SS:::SS:::::S%%%%%%%%",
   "#...g....#S:::SS:::SS:::SS:::::S########",
   "#.a..s.u.#S:::SS:::SS:::SS:::::S########",
   "#........#S:g:::::::::::::g::::S########",
   "##########S::C::::::::C::::::::S########",
   "##########S:h:::::::::::::::::FS########",
   "##########SSSSSSSSSSDSSSSSSSSSSS########",
   "##########&i..................i&,,,,,,,#",
   "##########&...........oo.......&,,C,,,,#",
   "##########&...g......ZZ........&,,,,,,,#",
   "##########&....L.........H.....&,,,,X,,#",
   "##########&....................y,,,,,,,#",
   "##########&.zk......g....L...t.&,,,,,V,#",
   "##########&....................&,,,,,,$#",
   "##########&&&&&&&&&&&&&&&&&&&&&&########"
  ],
  "hrows": [
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   "............................444.........",
   ".............................33.........",
   ".............................22.........",
   ".............................11.........",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................"
  ],
  "spawnR": 0,
  "legend": {
   "#": {
    "wall": "concrete"
   },
   "%": {
    "wall": "tech"
   },
   "&": {
    "wall": "rust"
   },
   "S": {
    "wall": "server"
   },
   ".": {
    "floor": "concrete"
   },
   ",": {
    "floor": "tile",
    "ceil": "light_panel"
   },
   ":": {
    "floor": "grate",
    "ceil": "metal_panel"
   },
   ";": {
    "floor": "plate",
    "ceil": "grate"
   }
  },
  "props": {
   "sky": "void",
   "ambient": "#7f93b8",
   "ambientI": 0.5,
   "fogColor": "#05070c",
   "fog": 0.05,
   "wallH": 1.6,
   "floorTex": "concrete",
   "ceilTex": "ceiling",
   "track": "griphop",
   "script": "api.on('start', () => api.message('SERVER HALL G — the RED key is up on the catwalk'));\napi.on('pickup', t => { if (t === 'key_red') api.message('Red keycard acquired'); if (t === 'key_yellow') api.message('Yellow keycard — the archive is open'); });"
  }
 },
 {
  "name": "E1M3: Foundry Core",
  "rows": [
   "&&&&&&&&&&&&&&&&########################",
   "&~~~~~~~~~~~~~~&#########&&&&&&&&&&&&&&&",
   "&~f~~~~~~~~~~h~&.........&.............&",
   "&~~~~~L~~~~d~u~&....L..c.&.t.........t.&",
   "&~~~~~~~Z~~~~~~&..Z......&......V......&",
   "&~~@~~~~~~~~~~~D.....H...&.............&",
   "&~~~~~~~Z~~~~~~&..Z......&.............&",
   "&~~~~~~~~~~~~~~&AF.....p.&...P.....P...&",
   "&~~~~~~~~~L~d~~&.........&.............&",
   "&~~~~vv~~~~~~f~&#########&.............&",
   "&~~~~~~~~~~~~~~&#########&..F...T...F..&",
   "&&&&&&&D&&&&&&&&%%%%%%%%%%.............&",
   "%;;;;;;;;;;;;;;;;;;;;;;;;%.............&",
   "%;;;;;;;;;;;;;;;F;;;k;;t;%...P.....P...&",
   "%;;;;G;;;;;;;;;;;;g;;;;;;%.............&",
   "%;;;;;;;;;;;g;;;;;;;;;;;;%.m.........a.&",
   "%;;;;;F;;;;;L;;;;;;;;;;;;y.............&",
   "%;;;;;;;;;;;;;;;;;;;;;;;;%.............&",
   "%;;;;G;;;;;;;;;;;;;;g;;;;%.............&",
   "%;Y;;;;;;;;;oo;;;;;;;;Fs;%...P.....P...&",
   "%;;;;;;;;;;;;;;;;;;;;;;;;%..g...L...g..&",
   "%%%%%%%%%%%%D%%%%%%%%%%%%%.............&",
   "#,,,,lll,,,,,,,,,,,,,,,,,&.............&",
   "#,,,,,,ZZ,,,,,,,,,,,g,,,,&.............&",
   "#,,,,,,,,,,,,,,,,,g,,,z,,&.k.........k.&",
   "#,,,,,L,,,g,,,,,L,,,,,,,,&..L.......L..&",
   "#,,,,,,,,,,,,,,,,,,,,,,,,&.............&",
   "#,,m,,,,,,,,,,,,,,,,m,,,,&&&&&&&D&&&&&&&",
   "#$,,,,,,,,,,,,,,,,,,,,,,,##%,,C,,,,X,%##",
   "###########################%%%%%%%%%%%##"
  ],
  "hrows": [
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "............................5.......5...",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   ".........122222.........................",
   ".........122222.........................",
   ".........122222.................55......",
   ".........122222.........................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "...............................5..5.....",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................",
   "........................................"
  ],
  "spawnR": 0,
  "legend": {
   "#": {
    "wall": "concrete_dark"
   },
   "%": {
    "wall": "rust"
   },
   "&": {
    "wall": "brick"
   },
   ".": {
    "floor": "concrete"
   },
   ",": {
    "floor": "tile",
    "ceil": "light_panel"
   },
   "~": {
    "floor": "asphalt",
    "ceil": "sky"
   },
   ";": {
    "floor": "plate",
    "ceil": "metal_panel"
   }
  },
  "props": {
   "sky": "dusk",
   "ambient": "#a08a80",
   "ambientI": 0.55,
   "fogColor": "#120a0a",
   "fog": 0.045,
   "wallH": 1.7,
   "floorTex": "concrete",
   "ceilTex": "concrete_dark",
   "track": "metalmania",
   "script": "api.on('start', () => api.message('FOUNDRY CORE — something huge is waiting in the core'));\napi.on('kill', t => { if (t === 'titan') { api.message('TITAN DOWN — get to the exit'); api.heal(25); } });"
  }
 }
];

/* =====================================================================
   RetroEngine — THE EDITOR
   Everything below runs only in the editor (it is NOT copied into
   exported games). It edits a "project": { name, levels: [...], models }.
   ===================================================================== */
(function () {
'use strict';
const RT = DFRuntime();                 // one shared copy of the engine (textures, defs, play())
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const icon = n => `<svg class="i"><use href="#i-${n}"/></svg>`;
const AUTOSAVE_KEY = 'retroengine.autosave.v1', SLOTS_KEY = 'retroengine.slots.v1', SEEN_KEY = 'retroengine.seenHelp.v1';

/* ---------- editor state ---------- */
const ED = {
  project: null, li: 0,                  // current project & level index
  tool: 'wall', brush: { wall: 'concrete', floor: 'tile', ceil: 'ceiling', fh: 0.3, door: 'door', rect: 'room', size: 1, thing: { t: 'enemy', s: 'grunt' }, light: { color: '#ffd9a0', radius: 6, intensity: 1.4, flicker: false } },
  view: { cs: 22, ox: 20, oy: 20 },     // cs = pixels per cell, ox/oy = screen offset of cell (0,0)
  layers: { walls: true, floors: true, ceil: false, heights: true, things: true, lightRadius: true, grid: true, reach: false },
  sel: new Set(), region: null, clipboard: null, stamp: null, hover: null,
  undo: [], redo: [], reach: null, tab: 'build', snap: true
};
const L = () => ED.project.levels[ED.li];
const idx = (x, y) => y * L().w + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < L().w && y < L().h;

/* ---------- toasts & modals ---------- */
function toast(msg, kind) {
  const root = $('#toast-root'), last = root.lastElementChild;
  if (last && last.textContent === msg) { clearTimeout(last._t); last._t = setTimeout(() => last.remove(), 2600); return; } // merge repeats
  while (root.children.length >= 3) root.firstElementChild.remove();                    // never more than 3 on screen
  const t = document.createElement('div'); t.className = 'toast ' + (kind || ''); t.textContent = msg;
  root.appendChild(t); t._t = setTimeout(() => t.remove(), 2600);
}
// modal({ title, body (html), wide, buttons: [{ label, cls, value }] }) -> Promise(value)
function modal(o) {
  return new Promise(res => {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal ${o.wide ? 'wide' : ''}"><header>${esc(o.title)}<button class="tb sm x" data-v="__close">✕</button></header><div class="body">${o.body || ''}</div>${o.buttons ? `<footer>${o.buttons.map((b, i) => `<button class="tb ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</footer>` : ''}</div>`;
    document.body.appendChild(back);
    const close = v => { back.remove(); document.removeEventListener('keydown', onK, true); res(v); };
    const onK = e => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } };
    document.addEventListener('keydown', onK, true);
    back.addEventListener('click', e => {
      if (e.target === back || e.target.closest('[data-v="__close"]')) return close(null);
      const b = e.target.closest('footer [data-i]'); if (b) { const bt = o.buttons[+b.dataset.i]; close(typeof bt.value === 'function' ? bt.value(back) : bt.value); }
    });
    if (o.onOpen) o.onOpen(back, close);
  });
}
const confirmBox = (title, msg, okLabel, danger) => modal({ title, body: `<p class="note" style="font-size:13px">${esc(msg)}</p>`, buttons: [{ label: 'Cancel', value: false }, { label: okLabel || 'OK', cls: danger ? 'danger' : 'primary', value: true }] });
function promptBox(title, label, value) {
  return modal({ title, body: `<div class="row"><label>${esc(label)}</label><input type="text" class="inp" id="pr-in" value="${esc(value || '')}"></div>`,
    buttons: [{ label: 'Cancel', value: null }, { label: 'OK', cls: 'primary', value: b => $('#pr-in', b).value }],
    onOpen: (b, close) => { const i = $('#pr-in', b); i.focus(); i.select(); i.addEventListener('keydown', e => { if (e.key === 'Enter') close(i.value); }); } });
}

/* ---------- project creation & storage ---------- */
function starterProject() {
  return { format: 'retroengine-project', version: 2, name: 'Operation Forge', levels: DF_STARTER_LEVELS.map(d => levelFromAscii(d, RT)), models: {}, customTemplates: [] };
}
function blankLevel(name, w, h) {
  const lv = RT.newLevel(name, w || 40, h || 32);
  for (let x = 0; x < lv.w; x++) { lv.wall[x] = 'concrete'; lv.wall[(lv.h - 1) * lv.w + x] = 'concrete'; }
  for (let y = 0; y < lv.h; y++) { lv.wall[y * lv.w] = 'concrete'; lv.wall[y * lv.w + lv.w - 1] = 'concrete'; }
  lv.spawn = { x: 3.5, y: 3.5, r: 0 };
  return lv;
}
function normalizeProject(p) {
  if (p && p.project && /-project-file$/.test(p.format || '')) p = p.project;
  if (p && p.mapData && Array.isArray(p.mapData)) p = convertV1(p);          // old DOOMFORGE save
  if (!p || !Array.isArray(p.levels) || !p.levels.length) throw new Error('Not a RetroEngine (or DOOMFORGE) project');
  return { format: 'retroengine-project', version: 2, name: String(p.name || 'Untitled'), levels: p.levels.map(RT.normalizeLevel), models: Object.assign({}, p.models || {}), customTemplates: Array.isArray(p.customTemplates) ? p.customTemplates : [] };
}
// Converts the original DOOMFORGE (v1) JSON — mapData/lightsData/entitiesData — into the new format.
function convertV1(o) {
  const n = o.mapData.length, w = o.mapData[0].length, lv = RT.newLevel('Imported level', w, n);
  const texMap = { brick: 'brick', tech: 'tech', stone: 'concrete', wood: 'wood', hazard: 'hazard', door: 'door', gothic: 'concrete_dark', hellstone: 'rust' };
  o.mapData.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return; const i = y * w + x;
    if (c.type === 'door') { lv.wall[i] = 'door'; lv.kind[i] = 'door'; }
    else if (c.type === 'locked_door') { lv.wall[i] = 'door'; lv.kind[i] = 'yellow'; }
    else if (c.type === 'exit') { lv.ents.push({ id: uid(), t: 'exit', x: x + 0.5, y: y + 0.5 }); }
    else lv.wall[i] = texMap[c.texture] || 'concrete';
  }));
  const subMap = { imp: 'grunt', drone: 'drone', boss: 'titan' };
  (o.entitiesData || []).forEach(e => {
    if (e.kind === 'enemy') lv.ents.push({ id: uid(), t: 'enemy', s: subMap[e.sub] || 'grunt', x: e.x + 0.5, y: e.y + 0.5, r: 0 });
    else if (e.kind === 'pickup') lv.ents.push({ id: uid(), t: 'pickup', s: e.sub === 'ammo' ? 'ammo_bullets' : e.sub === 'key' ? 'key_yellow' : e.sub === 'gem' ? 'chip' : 'health', x: e.x + 0.5, y: e.y + 0.5 });
    else lv.ents.push({ id: uid(), t: 'prop', s: ({ table: 'desk', lamp: 'lamp', barrel: 'barrel', pillar: 'pillar' })[e.sub] || 'crate', x: e.x + 0.5, y: e.y + 0.5, r: 0 });
  });
  (o.lightsData || []).forEach(l => lv.ents.push({ id: uid(), t: 'light', x: l.x, y: l.y, color: l.color, radius: l.radius, intensity: l.intensity, flicker: !!l.flicker }));
  if (o.playerSpawn) lv.spawn = { x: o.playerSpawn.x + 0.5, y: o.playerSpawn.y + 0.5, r: o.playerSpawn.dir || 0 };
  if (o.worldSettings) { lv.props.ambientI = clamp((o.worldSettings.ambient || 0.4) * 1.3, 0.1, 1.5); lv.props.fog = o.worldSettings.fogDensity || 0.04; }
  return { name: 'Imported DOOMFORGE map', levels: [lv] };
}
let saveTimer = 0;
function markDirty() { clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 600); $('#st-save').textContent = 'Saving…'; }
function autosave() {
  try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(ED.project)); $('#st-save').textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch (e) { $('#st-save').textContent = 'Not saved (storage full)'; toast('Browser storage is full — use Menu → Export JSON to keep your work', 'bad'); }
}
function loadSlots() { try { return JSON.parse(localStorage.getItem(SLOTS_KEY) || '{}'); } catch (e) { return {}; } }
function saveSlots(s) { localStorage.setItem(SLOTS_KEY, JSON.stringify(s)); }

/* ---------- undo / redo (whole-level snapshots, cheap enough for grid maps) ---------- */
function snapshot() { return JSON.stringify(L()); }
function pushUndo() { ED.undo.push({ li: ED.li, s: snapshot() }); if (ED.undo.length > 80) ED.undo.shift(); ED.redo.length = 0; updateUndoBtns(); }
function applySnap(stackFrom, stackTo) {
  const it = stackFrom.pop(); if (!it) return;
  if (it.li !== ED.li && ED.project.levels[it.li]) ED.li = it.li;
  stackTo.push({ li: ED.li, s: snapshot() });
  ED.project.levels[ED.li] = RT.normalizeLevel(JSON.parse(it.s));
  ED.sel.clear(); afterChange(true);
}
function undo() { if (!ED.undo.length) return toast('Nothing to undo'); applySnap(ED.undo, ED.redo); }
function redo() { if (!ED.redo.length) return toast('Nothing to redo'); applySnap(ED.redo, ED.undo); }
function updateUndoBtns() { $('[data-cmd="undo"]').disabled = !ED.undo.length; $('[data-cmd="redo"]').disabled = !ED.redo.length; }
// Call after any edit: redraw, refresh panel bits, autosave.
function afterChange(full) { ED.reach = null; requestDraw(); markDirty(); updateStatus(); if (full) { refreshLevelSelect(); renderPanel(); } else if (ED.tab === 'things') renderInspector(); updateUndoBtns(); }

/* =====================================================================
   2D MAP DRAWING (canvas). Screen = cell * cs + offset.
   ===================================================================== */
const cvs = $('#grid'), ctx = cvs.getContext('2d');
const THING_STYLE = {
  enemy: { grunt: ['#ff4b3a', 'G'], drone: ['#ff7a3a', 'D'], heavy: ['#d8263a', 'H'], turret: ['#ff9a3a', 'T'], titan: ['#ff2050', 'B'] },
  pickup: { health: ['#ff6b6b', '+'], medkit: ['#ff3b3b', '+'], armor: ['#37c25a', 'A'], armor_heavy: ['#2d7bff', 'A'], ammo_bullets: ['#d6b23a', 'b'], ammo_shells: ['#d8823a', 's'], ammo_cells: ['#3ad6ff', 'c'], ammo_rockets: ['#b0b0b0', 'r'],
    key_red: ['#ff2d2d', 'K'], key_blue: ['#2d8bff', 'K'], key_yellow: ['#ffd21f', 'K'], w_shotgun: ['#ffc21a', '3'], w_rifle: ['#ffc21a', '4'], w_plasma: ['#9dff4f', '5'], w_rocket: ['#ffc21a', '6'], chip: ['#2de2ff', '$'] },
  prop: { _: ['#8b95a8', ''] }, light: { _: ['#ffd9a0', ''] }, exit: { _: ['#2dffb0', 'X'] }
};
function thingStyle(e) { const g = THING_STYLE[e.t] || {}; return g[e.s] || g._ || ['#fff', '?']; }
let drawQueued = false;
function requestDraw() { if (!drawQueued) { drawQueued = true; requestAnimationFrame(draw); } }
function resizeCanvas() {
  const r = $('#stage').getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  ED.vw = r.width; ED.vh = r.height; cvs.width = Math.max(1, r.width * dpr); cvs.height = Math.max(1, r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); requestDraw();
}
const toCell = (sx, sy) => ({ fx: (sx - ED.view.ox) / ED.view.cs, fy: (sy - ED.view.oy) / ED.view.cs });

function draw() {
  drawQueued = false;
  const lv = L(), W = lv.w, H = lv.h, cs = ED.view.cs, ox = ED.view.ox, oy = ED.view.oy;
  const vw = ED.vw || 800, vh = ED.vh || 600;
  ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, vw, vh);
  const x0 = clamp(Math.floor(-ox / cs), 0, W), x1 = clamp(Math.ceil((vw - ox) / cs), 0, W), y0 = clamp(Math.floor(-oy / cs), 0, H), y1 = clamp(Math.ceil((vh - oy) / cs), 0, H);
  ctx.imageSmoothingEnabled = cs < 24;
  const showCeil = ED.layers.ceil || ED.tool === 'ceil';
  // board shadow
  ctx.fillStyle = '#0b0e15'; ctx.fillRect(ox - 4, oy - 4, W * cs + 8, H * cs + 8);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * W + x, px = ox + x * cs, py = oy + y * cs, wall = lv.wall[i], kind = lv.kind[i];
    if (wall && !kind) {
      if (ED.layers.walls) { ctx.drawImage(RT.getThumb(wall, 32), px, py, cs, cs); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(px, py, cs, Math.max(1, cs * 0.12)); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1); }
      else { ctx.fillStyle = '#2a3140'; ctx.fillRect(px, py, cs, cs); }
      continue;
    }
    if (ED.layers.floors) {
      const t = showCeil ? (lv.ceil[i] || lv.props.ceilTex) : (lv.floor[i] || lv.props.floorTex);
      ctx.drawImage(RT.getThumb(t, 32), px, py, cs, cs);
      ctx.fillStyle = showCeil ? 'rgba(10,14,30,.35)' : 'rgba(5,7,11,.5)'; ctx.fillRect(px, py, cs, cs);
    } else { ctx.fillStyle = '#10141c'; ctx.fillRect(px, py, cs, cs); }
    if (!showCeil && (lv.ceil[i] || lv.props.ceilTex) === 'sky') { ctx.fillStyle = 'rgba(60,110,200,.16)'; ctx.fillRect(px, py, cs, cs); }
    const fh = lv.fh[i];
    if (fh > 0 && ED.layers.heights) {
      ctx.fillStyle = fh > RT.STEP_H * 2 ? `rgba(255,140,60,${0.12 + fh * 0.3})` : `rgba(140,200,255,${0.1 + fh * 0.45})`; ctx.fillRect(px, py, cs, cs);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.strokeRect(px + 1.5, py + 1.5, cs - 3, cs - 3);
      if (cs >= 20) { ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.floor(cs * 0.34)}px Chakra Petch, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fh.toFixed(2).replace(/0$/, ''), px + cs / 2, py + cs / 2); }
    }
    if (kind) {
      ctx.drawImage(RT.getThumb(kind === 'door' ? 'door' : 'door_' + kind, 32), px, py, cs, cs);
      ctx.fillStyle = kind === 'door' ? '#ffb020' : RT.KEY_COLORS[kind]; const vert = (lv.wall[i - 1] && !lv.kind[i - 1]) || (lv.wall[i + 1] && !lv.kind[i + 1]);
      if (vert) ctx.fillRect(px, py + cs * 0.42, cs, cs * 0.16); else ctx.fillRect(px + cs * 0.42, py, cs * 0.16, cs);
    }
  }
  // reachability overlay (from Validate)
  if (ED.layers.reach) {
    if (!ED.reach) ED.reach = RT.validateLevel(lv).reachable;
    ctx.fillStyle = 'rgba(45,255,176,.13)';
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (ED.reach[y * W + x]) ctx.fillRect(ox + x * cs, oy + y * cs, cs, cs);
  }
  // grid lines
  if (ED.layers.grid && cs >= 9) {
    ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = x0; x <= x1; x++) { ctx.moveTo(ox + x * cs + 0.5, oy + y0 * cs); ctx.lineTo(ox + x * cs + 0.5, oy + y1 * cs); }
    for (let y = y0; y <= y1; y++) { ctx.moveTo(ox + x0 * cs, oy + y * cs + 0.5); ctx.lineTo(ox + x1 * cs, oy + y * cs + 0.5); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.beginPath();
    for (let x = Math.ceil(x0 / 8) * 8; x <= x1; x += 8) { ctx.moveTo(ox + x * cs + 0.5, oy + y0 * cs); ctx.lineTo(ox + x * cs + 0.5, oy + y1 * cs); }
    for (let y = Math.ceil(y0 / 8) * 8; y <= y1; y += 8) { ctx.moveTo(ox + x0 * cs, oy + y * cs + 0.5); ctx.lineTo(ox + x1 * cs, oy + y * cs + 0.5); }
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,122,26,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(ox, oy, W * cs, H * cs);
  // things
  if (ED.layers.things) lv.ents.forEach(e => drawThing(e, ox + e.x * cs, oy + e.y * cs, cs, ED.sel.has(e.id), 1));
  // player start arrow
  drawSpawn(ox + lv.spawn.x * cs, oy + lv.spawn.y * cs, cs, lv.spawn.r, 1);
  // selection region
  if (ED.region) { const r = normRect(ED.region); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#2de2ff'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(45,226,255,.08)'; ctx.fillRect(ox + r.x1 * cs, oy + r.y1 * cs, (r.x2 - r.x1 + 1) * cs, (r.y2 - r.y1 + 1) * cs); ctx.strokeRect(ox + r.x1 * cs, oy + r.y1 * cs, (r.x2 - r.x1 + 1) * cs, (r.y2 - r.y1 + 1) * cs); ctx.setLineDash([]); }
  // rectangle tool preview
  if (drag && drag.rect) { const r = normRect(drag.rect); ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(255,122,26,.12)'; ctx.fillRect(ox + r.x1 * cs, oy + r.y1 * cs, (r.x2 - r.x1 + 1) * cs, (r.y2 - r.y1 + 1) * cs); ctx.strokeRect(ox + r.x1 * cs, oy + r.y1 * cs, (r.x2 - r.x1 + 1) * cs, (r.y2 - r.y1 + 1) * cs); label(`${r.x2 - r.x1 + 1} × ${r.y2 - r.y1 + 1}`, ox + (r.x2 + 1) * cs + 4, oy + r.y1 * cs); }
  // stamp ghost
  if (ED.stamp && ED.hover) drawStampGhost();
  // hover cell
  if (ED.hover && !ED.stamp && inb(ED.hover.x, ED.hover.y)) {
    const s = ['wall', 'floor', 'ceil', 'height', 'erase'].includes(ED.tool) ? ED.brush.size : 1, o = Math.floor((s - 1) / 2);
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.strokeRect(ox + (ED.hover.x - o) * cs + 1, oy + (ED.hover.y - o) * cs + 1, s * cs - 2, s * cs - 2);
  }
}
function label(t, x, y) { ctx.font = '700 12px Chakra Petch, sans-serif'; const w = ctx.measureText(t).width + 10; ctx.fillStyle = 'rgba(10,13,20,.85)'; ctx.fillRect(x, y, w, 20); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x + 5, y + 10); }
function drawThing(e, sx, sy, cs, selected, alpha) {
  const [col, ch] = thingStyle(e); ctx.globalAlpha = alpha;
  if (e.t === 'light') {
    if (ED.layers.lightRadius) { const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, (e.radius || 6) * cs * 0.5); g.addColorStop(0, hexA(e.color || '#ffd9a0', 0.28)); g.addColorStop(1, hexA(e.color || '#ffd9a0', 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, (e.radius || 6) * cs * 0.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = e.color || '#ffd9a0'; ctx.beginPath(); ctx.arc(sx, sy, Math.max(3, cs * 0.18), 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
    if (e.flicker && cs > 14) { ctx.fillStyle = '#000'; ctx.font = `700 ${cs * 0.22}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('~', sx, sy); }
  } else if (e.t === 'prop') {
    const r = Math.max(4, cs * 0.3); ctx.fillStyle = '#5b6578'; ctx.strokeStyle = '#c3cad6'; ctx.lineWidth = 1.5; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); ctx.strokeRect(sx - r, sy - r, r * 2, r * 2);
    if (cs >= 18) { ctx.fillStyle = '#fff'; ctx.font = `700 ${cs * 0.26}px Chakra Petch, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((RT.PROP_DEFS[e.s] || { name: '?' }).name.slice(0, 2).toUpperCase(), sx, sy + 1); }
  } else if (e.t === 'exit') {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, cs * 0.1); ctx.beginPath(); ctx.arc(sx, sy, cs * 0.36, 0, 7); ctx.stroke();
    ctx.fillStyle = col; ctx.font = `700 ${Math.max(9, cs * 0.34)}px Chakra Petch, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT', sx, sy + 1);
  } else {
    const r = Math.max(4, cs * (e.t === 'enemy' ? (e.s === 'titan' ? 0.45 : 0.34) : 0.26));
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(sx, sy, r, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (e.t === 'enemy') { const a = e.r || 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * r * 1.5, sy + Math.sin(a) * r * 1.5); ctx.stroke(); }
    if (cs >= 14) { ctx.fillStyle = '#0a0a0a'; ctx.font = `700 ${r * 1.1}px Chakra Petch, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, sx, sy + 1); }
  }
  if (selected) { ctx.strokeStyle = '#2de2ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(sx, sy, cs * 0.5, 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function drawSpawn(sx, sy, cs, a, alpha) {
  ctx.globalAlpha = alpha; ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
  const r = Math.max(6, cs * 0.42); ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r * 0.65); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r * 0.7, r * 0.65); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore(); ctx.globalAlpha = 1;
}
function hexA(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function normRect(r) { return { x1: Math.min(r.x1, r.x2), y1: Math.min(r.y1, r.y2), x2: Math.max(r.x1, r.x2), y2: Math.max(r.y1, r.y2) }; }
function drawStampGhost() {
  const st = ED.stamp, p = st.data, cs = ED.view.cs, ox = ED.view.ox, oy = ED.view.oy, bx = ED.hover.x, by = ED.hover.y;
  const fits = bx >= 0 && by >= 0 && bx + p.w <= L().w && by + p.h <= L().h;
  ctx.globalAlpha = 0.75;
  p.cells.forEach(c => {
    const px = ox + (bx + c.x) * cs, py = oy + (by + c.y) * cs;
    if (c.kind) ctx.drawImage(RT.getThumb(c.kind === 'door' ? 'door' : 'door_' + c.kind, 32), px, py, cs, cs);
    else if (c.wall) ctx.drawImage(RT.getThumb(c.wall, 32), px, py, cs, cs);
    else { ctx.drawImage(RT.getThumb(c.floor || L().props.floorTex, 32), px, py, cs, cs); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px, py, cs, cs); if (c.fh) { ctx.fillStyle = `rgba(140,200,255,${0.15 + c.fh * 0.4})`; ctx.fillRect(px, py, cs, cs); } }
  });
  ctx.globalAlpha = 1;
  p.ents.forEach(e => drawThing(e, ox + (bx + e.x) * cs, oy + (by + e.y) * cs, cs, false, 0.85));
  if (p.spawn) drawSpawn(ox + (bx + p.spawn.x) * cs, oy + (by + p.spawn.y) * cs, cs, 0, 0.85);
  ctx.strokeStyle = fits ? '#2dffb0' : '#ff4d4d'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(ox + bx * cs, oy + by * cs, p.w * cs, p.h * cs); ctx.setLineDash([]);
  label(`${st.name} ${p.w}×${p.h}${fits ? '' : ' — doesn\'t fit'}`, ox + bx * cs, oy + by * cs - 24);
}

/* =====================================================================
   TOOLS & INPUT — mouse, touch (1 finger = tool, 2 fingers = pan/zoom)
   ===================================================================== */
const TOOLS = [
  ['select', 'Select', 'select', 'V', 'Tap a thing to select it, drag to move. Drag on empty space to select an area (copy, cut, save as template).'],
  ['pan', 'Pan', 'pan', 'H', 'Drag to move the map. Pinch or mouse-wheel to zoom.'], '-',
  ['wall', 'Wall', 'wall', 'B', 'Paint solid walls with the chosen texture.'],
  ['floor', 'Floor', 'floor', 'F', 'Paint floor texture (also carves through walls).'],
  ['ceil', 'Ceiling', 'ceil', 'C', 'Paint ceiling texture. Pick "Sky" for open air.'],
  ['height', 'Height', 'height', 'U', 'Raise floors: 0.15 steps = stairs, 0.6 = catwalk, 0.75 = cover block (can\'t climb).'],
  ['rect', 'Rect', 'rect', 'R', 'Drag a rectangle: room, solid block, carve floor or outline.'],
  ['fill', 'Fill', 'fill', 'G', 'Flood-fill a connected area that has the same texture.'],
  ['erase', 'Erase', 'erase', 'E', 'Erase things first, then walls, then floor details.'], '-',
  ['door', 'Door', 'door', 'D', 'Place doors. Keycard doors need the matching key.'],
  ['thing', 'Thing', 'thing', 'T', 'Place the chosen enemy, pickup, prop, light or exit (Things tab).'],
  ['spawn', 'Start', 'spawn', 'S', 'Set where the player starts. Tap it again to turn 90°.'],
  ['pick', 'Picker', 'pick', 'I', 'Tap a cell to copy its textures into your brushes.'], '-',
  ['rooms', 'Rooms', 'stamp', '', 'Open the building & room template library.']
];
function buildToolbar() {
  $('#toolbar').innerHTML = TOOLS.map(t => t === '-' ? '<div class="sep"></div>' : `<button class="tool" data-tool="${t[0]}" title="${esc(t[1])}${t[3] ? ' (' + t[3] + ')' : ''} — ${esc(t[4])}">${icon(t[2])}<span>${t[1]}</span></button>`).join('');
  $('#toolbar').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (!b) return; if (b.dataset.tool === 'rooms') { openTab('templates', true); return; } setTool(b.dataset.tool); });
}
function setTool(t, keepStamp) {
  if (!keepStamp) cancelStamp();
  ED.tool = t;
  $$('.tool').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  $('#stage').classList.toggle('pan', t === 'pan');
  const def = TOOLS.find(x => x[0] === t); $('#hint').textContent = def ? def[4] : '';
  if (['wall', 'floor', 'ceil', 'height', 'rect', 'fill', 'door'].includes(t) && ED.tab !== 'build' && innerWidth > 720) openTab('build');
  if (t === 'thing' && ED.tab !== 'things' && innerWidth > 720) openTab('things');
  updateStatus(); requestDraw();
  if (ED.tab === 'build') renderPanel();
}

/* ---------- view: zoom & pan ---------- */
function setZoom(cs, ax, ay) {
  cs = clamp(cs, 4, 90);
  if (ax === undefined) { ax = (ED.vw || 600) / 2; ay = (ED.vh || 400) / 2; }
  const k = cs / ED.view.cs; ED.view.ox = ax - (ax - ED.view.ox) * k; ED.view.oy = ay - (ay - ED.view.oy) * k; ED.view.cs = cs;
  $('#zoom-lbl').textContent = Math.round(cs / 22 * 100) + '%'; requestDraw();
}
function fitView() {
  const lv = L(), vw = ED.vw || 600, vh = ED.vh || 400, cs = clamp(Math.floor(Math.min((vw - 30) / lv.w, (vh - 30) / lv.h)), 4, 40);
  ED.view.cs = cs; ED.view.ox = (vw - lv.w * cs) / 2; ED.view.oy = (vh - lv.h * cs) / 2; setZoom(cs);
}

/* ---------- editing operations ---------- */
const thingsAt = (x, y) => L().ents.filter(e => Math.floor(e.x) === x && Math.floor(e.y) === y);
function removeThingsAt(x, y, keepLights) { const lv = L(); lv.ents = lv.ents.filter(e => !(Math.floor(e.x) === x && Math.floor(e.y) === y) || (keepLights && e.t === 'light')); }
const isSpawnCell = (x, y) => Math.floor(L().spawn.x) === x && Math.floor(L().spawn.y) === y;
function setWall(x, y, tex) { if (!inb(x, y) || isSpawnCell(x, y)) return false; const i = idx(x, y), lv = L(); lv.wall[i] = tex; lv.kind[i] = ''; lv.fh[i] = 0; removeThingsAt(x, y); return true; }
function carve(x, y, floorTex) { if (!inb(x, y)) return; const i = idx(x, y), lv = L(); lv.wall[i] = ''; lv.kind[i] = ''; if (floorTex !== undefined) lv.floor[i] = floorTex; }
function paintCell(x, y) {
  const s = ED.brush.size, o = Math.floor((s - 1) / 2), lv = L();
  for (let yy = y - o; yy < y - o + s; yy++) for (let xx = x - o; xx < x - o + s; xx++) {
    if (!inb(xx, yy)) continue; const i = idx(xx, yy);
    switch (ED.tool) {
      case 'wall': setWall(xx, yy, ED.brush.wall); break;
      case 'floor': carve(xx, yy, ED.brush.floor === lv.props.floorTex ? '' : ED.brush.floor); break;
      case 'ceil': if (!lv.wall[i] || lv.kind[i]) lv.ceil[i] = ED.brush.ceil === lv.props.ceilTex ? '' : ED.brush.ceil; break;
      case 'height': if (!lv.wall[i]) lv.fh[i] = ED.brush.fh; break;
      case 'erase':
        if (thingsAt(xx, yy).length) removeThingsAt(xx, yy);
        else if (lv.wall[i]) { lv.wall[i] = ''; lv.kind[i] = ''; }
        else { lv.fh[i] = 0; lv.floor[i] = ''; lv.ceil[i] = ''; }
        break;
    }
  }
}
function applyRect(r) {
  r = normRect(r); const mode = ED.brush.rect; let hitSpawn = false;
  for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) {
    if (!inb(x, y)) continue;
    const border = x === r.x1 || x === r.x2 || y === r.y1 || y === r.y2, i = idx(x, y);
    if (mode === 'solid' || ((mode === 'room' || mode === 'outline') && border)) { if (L().kind[i] && mode !== 'solid') continue; if (!setWall(x, y, ED.brush.wall)) hitSpawn = true; }
    else if (mode === 'room' || mode === 'floor') carve(x, y, ED.brush.floor === L().props.floorTex ? '' : ED.brush.floor);
  }
  if (hitSpawn) toast('Skipped the player start cell');
}
function floodFill(x, y) {
  const lv = L(), W = lv.w, start = idx(x, y), isWall = lv.wall[start] && !lv.kind[start];
  const showCeil = ED.layers.ceil;
  const key = i => isWall ? (lv.wall[i] && !lv.kind[i] ? lv.wall[i] : null) : (lv.wall[i] && !lv.kind[i] ? null : (showCeil ? (lv.ceil[i] || '') : (lv.floor[i] || '')));
  const target = key(start), newVal = isWall ? ED.brush.wall : showCeil ? (ED.brush.ceil === lv.props.ceilTex ? '' : ED.brush.ceil) : (ED.brush.floor === lv.props.floorTex ? '' : ED.brush.floor);
  if (target === newVal) return 0;
  const seen = new Uint8Array(W * lv.h), q = [start]; seen[start] = 1; let n = 0;
  while (q.length && n < 20000) {
    const c = q.pop(); n++;
    if (isWall) lv.wall[c] = newVal; else if (showCeil) lv.ceil[c] = newVal; else lv.floor[c] = newVal;
    const cx = c % W, cy = (c / W) | 0;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { const nx = cx + d[0], ny = cy + d[1]; if (!inb(nx, ny)) return; const ni = ny * W + nx; if (!seen[ni] && key(ni) === target) { seen[ni] = 1; q.push(ni); } });
  }
  return n;
}
function placeThing(fx, fy) {
  const x = Math.floor(fx), y = Math.floor(fy), lv = L();
  if (!inb(x, y)) return;
  if (lv.wall[idx(x, y)]) { toast('Things go on open floor, not inside walls or doors'); return; }
  const px = ED.snap ? x + 0.5 : Math.round(fx * 4) / 4, py = ED.snap ? y + 0.5 : Math.round(fy * 4) / 4;
  const b = ED.brush.thing, e = { id: uid(), t: b.t, x: px, y: py };
  if (b.t !== 'light' && b.t !== 'exit') e.s = b.s;
  if (b.t === 'enemy') e.r = Math.atan2(lv.spawn.y - py, lv.spawn.x - px);
  if (b.t === 'prop') e.r = 0;
  if (b.t === 'light') Object.assign(e, ED.brush.light);
  if (b.t === 'pickup' || b.t === 'exit') lv.ents = lv.ents.filter(o => !(o.t === b.t && Math.floor(o.x) === x && Math.floor(o.y) === y));
  lv.ents.push(e); ED.sel.clear(); ED.sel.add(e.id);
}
function setSpawn(x, y) {
  const lv = L(); if (!inb(x, y)) return;
  if (lv.wall[idx(x, y)]) { toast('The start must be on open floor'); return; }
  if (isSpawnCell(x, y)) lv.spawn.r = ((lv.spawn.r || 0) + Math.PI / 2) % (Math.PI * 2);
  else { lv.spawn.x = x + 0.5; lv.spawn.y = y + 0.5; }
}
function pickAt(x, y) {
  if (!inb(x, y)) return; const lv = L(), i = idx(x, y);
  if (lv.wall[i] && !lv.kind[i]) { ED.brush.wall = lv.wall[i]; setTool('wall'); toast('Wall brush: ' + RT.TEX_DEFS[lv.wall[i]].name); }
  else { ED.brush.floor = lv.floor[i] || lv.props.floorTex; ED.brush.ceil = lv.ceil[i] || lv.props.ceilTex; ED.brush.fh = lv.fh[i] || ED.brush.fh; setTool('floor'); toast('Floor: ' + (RT.TEX_DEFS[ED.brush.floor] || { name: ED.brush.floor }).name + ' · Ceiling: ' + (ED.brush.ceil === 'sky' ? 'Sky' : (RT.TEX_DEFS[ED.brush.ceil] || {}).name)); }
}
function hitThing(fx, fy) {
  const lv = L(), rad = Math.max(0.45, 12 / ED.view.cs); let best = null, bd = rad;
  lv.ents.forEach(e => { const d = Math.hypot(e.x - fx, e.y - fy); if (d < bd) { bd = d; best = e; } });
  if (!best && Math.hypot(lv.spawn.x - fx, lv.spawn.y - fy) < rad) return 'spawn';
  return best;
}

/* ---------- region: copy / cut / templates ---------- */
function regionData(r) {
  r = normRect(r); const lv = L(), cells = [], ents = [];
  for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) { if (!inb(x, y)) continue; const i = idx(x, y); cells.push({ x: x - r.x1, y: y - r.y1, wall: lv.wall[i], kind: lv.kind[i], floor: lv.floor[i], ceil: lv.ceil[i], fh: lv.fh[i] }); }
  lv.ents.forEach(e => { if (e.x >= r.x1 && e.x < r.x2 + 1 && e.y >= r.y1 && e.y < r.y2 + 1) { const c = JSON.parse(JSON.stringify(e)); delete c.id; c.x -= r.x1; c.y -= r.y1; ents.push(c); } });
  const sp = lv.spawn.x >= r.x1 && lv.spawn.x < r.x2 + 1 && lv.spawn.y >= r.y1 && lv.spawn.y < r.y2 + 1 ? { x: lv.spawn.x - r.x1, y: lv.spawn.y - r.y1 } : null;
  return { w: r.x2 - r.x1 + 1, h: r.y2 - r.y1 + 1, cells, ents, spawn: sp };
}
function clearRegion(r, thingsOnly) {
  r = normRect(r); const lv = L();
  lv.ents = lv.ents.filter(e => !(e.x >= r.x1 && e.x < r.x2 + 1 && e.y >= r.y1 && e.y < r.y2 + 1));
  if (thingsOnly) return;
  for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) if (inb(x, y)) { const i = idx(x, y); lv.wall[i] = ''; lv.kind[i] = ''; lv.floor[i] = ''; lv.ceil[i] = ''; lv.fh[i] = 0; }
}
function rotateData(d) {
  // 90° clockwise: cell (x,y) -> (h-1-y, x); points (x,y) -> (h-y, x)
  return { w: d.h, h: d.w, cells: d.cells.map(c => Object.assign({}, c, { x: d.h - 1 - c.y, y: c.x })), ents: d.ents.map(e => Object.assign({}, e, { x: d.h - e.y, y: e.x, r: e.r !== undefined ? e.r + Math.PI / 2 : e.r })), spawn: d.spawn ? { x: d.h - d.spawn.y, y: d.spawn.x } : null };
}
function startStamp(name, data) {
  ED.stamp = { name, data: JSON.parse(JSON.stringify(data)) }; ED.region = null; ED.sel.clear();
  if (!ED.hover) { const c = toCell((ED.vw || 600) / 2, (ED.vh || 400) / 2); ED.hover = { x: Math.floor(c.fx - data.w / 2), y: Math.floor(c.fy - data.h / 2) }; }
  const bar = $('#stamp-bar'); bar.classList.remove('hidden');
  bar.innerHTML = `<b style="padding:0 6px">${esc(name)}</b><button class="tb sm" data-s="rot">⟳ Rotate (R)</button><button class="tb sm primary" data-s="place">Place here</button><button class="tb sm" data-s="cancel">Done (Esc)</button>`;
  $('#hint').textContent = 'Move over the map and tap/click to stamp. Stamp as many times as you like.';
  if (innerWidth <= 720) document.body.classList.remove('sheet');
  updateSelBar(); requestDraw();
}
function cancelStamp() { if (!ED.stamp) return; ED.stamp = null; $('#stamp-bar').classList.add('hidden'); requestDraw(); }
function rotateStamp() { if (ED.stamp) { ED.stamp.data = rotateData(ED.stamp.data); requestDraw(); } }
function placeStamp(bx, by) {
  ED.stats.stamps++;
  const d = ED.stamp.data, lv = L();
  if (bx < 0 || by < 0 || bx + d.w > lv.w || by + d.h > lv.h) { toast('Template doesn\'t fit there — move it inside the map', 'bad'); return; }
  pushUndo();
  d.cells.forEach(c => {
    const x = bx + c.x, y = by + c.y, i = idx(x, y);
    if (c.wall && !c.kind) { if (isSpawnCell(x, y) && !d.spawn) return; lv.wall[i] = c.wall; lv.kind[i] = ''; lv.fh[i] = 0; removeThingsAt(x, y); }
    else if (c.kind) { lv.wall[i] = c.wall || 'door'; lv.kind[i] = c.kind; removeThingsAt(x, y); }
    else { lv.wall[i] = ''; lv.kind[i] = ''; if (c.floor !== undefined) { lv.floor[i] = c.floor || ''; lv.ceil[i] = c.ceil || ''; lv.fh[i] = c.fh || 0; } }
  });
  const cx = bx + d.w / 2, cy = by + d.h / 2;
  d.ents.forEach(e => { const n = Object.assign({}, e, { id: uid(), x: bx + e.x, y: by + e.y }); if (n.t === 'enemy') n.r = Math.atan2(cy - n.y, cx - n.x) + (Math.random() - 0.5) * 0.6; lv.ents.push(n); });
  if (d.spawn) { lv.spawn.x = bx + d.spawn.x; lv.spawn.y = by + d.spawn.y; }
  afterChange(); toast('Stamped ' + ED.stamp.name, 'ok');
}
function updateSelBar() {
  const bar = $('#sel-bar'), r = ED.region, n = ED.sel.size;
  if (ED.stamp || (!r && !n)) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  if (r) { const q = normRect(r); bar.innerHTML = `<b style="padding:0 6px">${q.x2 - q.x1 + 1}×${q.y2 - q.y1 + 1}</b><button class="tb sm" data-r="copy">Copy</button><button class="tb sm" data-r="cut">Cut</button><button class="tb sm" data-r="walls">Walls</button><button class="tb sm" data-r="carve">Floor</button><button class="tb sm" data-r="clearThings">Del things</button><button class="tb sm" data-r="tpl">Save template</button><button class="tb sm" data-r="none">✕</button>`; }
  else bar.innerHTML = `<b style="padding:0 6px">${n} selected</b><button class="tb sm" data-r="dup">Duplicate</button><button class="tb sm" data-r="rotT">Rotate</button><button class="tb sm danger" data-r="del">Delete</button><button class="tb sm" data-r="none">✕</button>`;
}
async function regionAction(a) {
  const lv = L(), r = ED.region;
  if (a === 'none') { ED.region = null; ED.sel.clear(); }
  else if (a === 'copy') { ED.clipboard = regionData(r); toast('Copied — press Paste (Ctrl+V)', 'ok'); }
  else if (a === 'cut') { ED.clipboard = regionData(r); pushUndo(); clearRegion(r); ED.region = null; afterChange(); toast('Cut to clipboard'); }
  else if (a === 'walls') { pushUndo(); const q = normRect(r); for (let y = q.y1; y <= q.y2; y++) for (let x = q.x1; x <= q.x2; x++) setWall(x, y, ED.brush.wall); afterChange(); }
  else if (a === 'carve') { pushUndo(); const q = normRect(r); for (let y = q.y1; y <= q.y2; y++) for (let x = q.x1; x <= q.x2; x++) carve(x, y, ED.brush.floor === lv.props.floorTex ? '' : ED.brush.floor); afterChange(); }
  else if (a === 'clearThings') { pushUndo(); clearRegion(r, true); afterChange(); }
  else if (a === 'tpl') { const name = await promptBox('Save as template', 'Name', 'My Room'); if (name) { ED.project.customTemplates.push({ id: uid(), name, cat: 'My templates', desc: 'Saved from a selection', data: regionData(r) }); markDirty(); toast('Template saved — find it in Rooms', 'ok'); if (ED.tab === 'templates') renderPanel(); } }
  else if (a === 'del') { pushUndo(); lv.ents = lv.ents.filter(e => !ED.sel.has(e.id)); ED.sel.clear(); afterChange(); }
  else if (a === 'dup') { pushUndo(); const add = []; lv.ents.forEach(e => { if (ED.sel.has(e.id)) { const c = Object.assign({}, e, { id: uid(), x: Math.min(lv.w - 0.5, e.x + 1) }); add.push(c); } }); lv.ents.push(...add); ED.sel = new Set(add.map(e => e.id)); afterChange(); }
  else if (a === 'rotT') { pushUndo(); lv.ents.forEach(e => { if (ED.sel.has(e.id)) e.r = ((e.r || 0) + Math.PI / 4) % (Math.PI * 2); }); afterChange(); }
  updateSelBar(); requestDraw(); if (ED.tab === 'things') renderInspector();
}
$('#sel-bar').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) regionAction(b.dataset.r); });
$('#stamp-bar').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; const a = b.dataset.s; if (a === 'rot') rotateStamp(); else if (a === 'cancel') cancelStamp(); else if (a === 'place' && ED.hover) placeStamp(ED.hover.x, ED.hover.y); });

/* ---------- pointer events ---------- */
const pointers = new Map(); let drag = null, pinch = null, spaceHeld = false;
function evPos(e) { const r = cvs.getBoundingClientRect(); return { sx: e.clientX - r.left, sy: e.clientY - r.top }; }
function hoverFrom(sx, sy) {
  const c = toCell(sx, sy);
  if (ED.stamp) ED.hover = { x: Math.round(c.fx - ED.stamp.data.w / 2), y: Math.round(c.fy - ED.stamp.data.h / 2) };
  else ED.hover = { x: Math.floor(c.fx), y: Math.floor(c.fy) };
  const x = Math.floor(c.fx), y = Math.floor(c.fy);
  $('#st-cell').innerHTML = inb(x, y) ? `Cell <b>${x}, ${y}</b>` : 'Cell -';
}
cvs.addEventListener('pointerdown', e => {
  cvs.setPointerCapture(e.pointerId);
  const p = evPos(e); pointers.set(e.pointerId, p);
  if (pointers.size === 2) {           // second finger: cancel the stroke and start pinch-zoom
    if (drag && drag.undoPushed) { const it = ED.undo.pop(); if (it) ED.project.levels[it.li] = RT.normalizeLevel(JSON.parse(it.s)); updateUndoBtns(); }
    drag = null; const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.sx - b.sx, a.sy - b.sy), cx: (a.sx + b.sx) / 2, cy: (a.sy + b.sy) / 2, cs: ED.view.cs, ox: ED.view.ox, oy: ED.view.oy }; requestDraw(); return;
  }
  if (pointers.size > 2) return;
  hoverFrom(p.sx, p.sy);
  const c = toCell(p.sx, p.sy), x = Math.floor(c.fx), y = Math.floor(c.fy);
  if (e.button === 1 || e.button === 2 || spaceHeld || ED.tool === 'pan') { drag = { pan: true, sx: p.sx, sy: p.sy, ox: ED.view.ox, oy: ED.view.oy }; return; }
  if (ED.stamp) { drag = { stamp: true }; requestDraw(); return; }
  switch (ED.tool) {
    case 'wall': case 'floor': case 'ceil': case 'height': case 'erase':
      pushUndo(); paintCell(x, y); drag = { paint: true, lx: x, ly: y, undoPushed: true }; afterChange(); break;
    case 'rect': drag = { rect: { x1: x, y1: y, x2: x, y2: y } }; break;
    case 'fill': if (inb(x, y)) { pushUndo(); const n = floodFill(x, y); if (!n) { ED.undo.pop(); toast('Already that texture'); } afterChange(); } break;
    case 'door': if (inb(x, y)) { if (isSpawnCell(x, y)) { toast('Move the player start first'); break; } pushUndo(); const lv = L(), i = idx(x, y); lv.wall[i] = 'door'; lv.kind[i] = ED.brush.door; lv.fh[i] = 0; removeThingsAt(x, y); afterChange(); } break;
    case 'thing': pushUndo(); placeThing(c.fx, c.fy); afterChange(); updateSelBar(); break;
    case 'spawn': pushUndo(); setSpawn(x, y); afterChange(); break;
    case 'pick': pickAt(x, y); break;
    case 'select': {
      const hit = hitThing(c.fx, c.fy);
      if (hit === 'spawn') { drag = { moveSpawn: true, moved: false }; }
      else if (hit) {
        if (e.shiftKey) { if (ED.sel.has(hit.id)) ED.sel.delete(hit.id); else ED.sel.add(hit.id); }
        else if (!ED.sel.has(hit.id)) { ED.sel.clear(); ED.sel.add(hit.id); }
        ED.region = null;
        drag = { move: true, fx: c.fx, fy: c.fy, start: L().ents.filter(o => ED.sel.has(o.id)).map(o => ({ o, x: o.x, y: o.y })), moved: false };
      } else { ED.sel.clear(); drag = { region: true, x, y, moved: false }; ED.region = null; }
      updateSelBar(); if (ED.tab === 'things') renderInspector(); requestDraw(); break;
    }
  }
});
cvs.addEventListener('pointermove', e => {
  const p = evPos(e); if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.sx - b.sx, a.sy - b.sy), cx = (a.sx + b.sx) / 2, cy = (a.sy + b.sy) / 2;
    const cs = clamp(pinch.cs * d / Math.max(10, pinch.d), 4, 90), k = cs / pinch.cs;
    ED.view.cs = cs; ED.view.ox = cx - (pinch.cx - pinch.ox) * k; ED.view.oy = cy - (pinch.cy - pinch.oy) * k; setZoom(cs, cx, cy); return;
  }
  hoverFrom(p.sx, p.sy);
  if (!drag) { requestDraw(); return; }
  const c = toCell(p.sx, p.sy), x = Math.floor(c.fx), y = Math.floor(c.fy);
  if (drag.pan) { ED.view.ox = drag.ox + p.sx - drag.sx; ED.view.oy = drag.oy + p.sy - drag.sy; }
  else if (drag.paint) {   // draw a line of cells from the last point so fast strokes have no gaps
    let x0 = drag.lx, y0 = drag.ly; const dx = Math.abs(x - x0), dy = Math.abs(y - y0), sx = x0 < x ? 1 : -1, sy = y0 < y ? 1 : -1; let err = dx - dy, guard = 0;
    while (!(x0 === x && y0 === y) && guard++ < 400) { const e2 = err * 2; if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; } paintCell(x0, y0); }
    drag.lx = x; drag.ly = y; afterChange();
  }
  else if (drag.rect) { drag.rect.x2 = x; drag.rect.y2 = y; }
  else if (drag.region) { if (x !== drag.x || y !== drag.y) drag.moved = true; if (drag.moved) { ED.region = { x1: drag.x, y1: drag.y, x2: clamp(x, 0, L().w - 1), y2: clamp(y, 0, L().h - 1) }; } }
  else if (drag.move) {
    if (!drag.moved) { pushUndo(); drag.moved = true; }
    const dx = c.fx - drag.fx, dy = c.fy - drag.fy;
    drag.start.forEach(s => { let nx = s.x + dx, ny = s.y + dy; if (ED.snap && !e.shiftKey) { nx = Math.floor(nx) + 0.5; ny = Math.floor(ny) + 0.5; } s.o.x = clamp(nx, 0.25, L().w - 0.25); s.o.y = clamp(ny, 0.25, L().h - 0.25); });
  }
  else if (drag.moveSpawn) { if (!drag.moved) { pushUndo(); drag.moved = true; } if (inb(x, y) && !L().wall[idx(x, y)]) { L().spawn.x = x + 0.5; L().spawn.y = y + 0.5; } }
  requestDraw();
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
  if (!drag) return;
  const d = drag; drag = null;
  if (d.rect) { pushUndo(); applyRect(d.rect); afterChange(); }
  else if (d.region) { if (!d.moved) ED.region = null; updateSelBar(); }
  else if (d.move) { if (d.moved) { L().ents.forEach(o => { if (ED.sel.has(o.id) && L().wall[idx(Math.floor(o.x), Math.floor(o.y))]) { toast('Moved a thing into a wall — undo or move it out', 'bad'); } }); afterChange(); } }
  else if (d.moveSpawn) { if (d.moved) afterChange(); }
  else if (d.stamp && ED.stamp && ED.hover) placeStamp(ED.hover.x, ED.hover.y);
  requestDraw();
}
cvs.addEventListener('pointerup', endPointer); cvs.addEventListener('pointercancel', endPointer);
cvs.addEventListener('pointerleave', () => { if (!drag && !ED.stamp) { ED.hover = null; requestDraw(); } });
cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('wheel', e => { e.preventDefault(); const p = evPos(e); if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) setZoom(ED.view.cs * Math.exp(-e.deltaY * 0.0015), p.sx, p.sy); else { ED.view.ox -= e.deltaX; requestDraw(); } }, { passive: false });

/* ---------- keyboard shortcuts ---------- */
document.addEventListener('keydown', e => {
  if ($('#play-host').classList.contains('on') || $('.modal-back')) return;
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (mod && k === 'c') { if (ED.region) regionAction('copy'); else if (ED.sel.size) { ED.clipboard = { w: 1, h: 1, cells: [], ents: L().ents.filter(o => ED.sel.has(o.id)).map(o => { const c = Object.assign({}, o); delete c.id; c.x -= Math.floor(o.x); c.y -= Math.floor(o.y); return c; }) }; toast('Copied things'); } e.preventDefault(); return; }
  if (mod && k === 'x') { if (ED.region) regionAction('cut'); e.preventDefault(); return; }
  if (mod && k === 'v') { if (ED.clipboard) startStamp('Clipboard', ED.clipboard); else toast('Clipboard is empty — select an area and Copy'); e.preventDefault(); return; }
  if (mod && k === 's') { e.preventDefault(); autosave(); toast('Saved in this browser', 'ok'); return; }
  if (mod) return;
  if (k === ' ') { spaceHeld = true; e.preventDefault(); return; }
  if (k === 'escape') { if (ED.stamp) cancelStamp(); ED.region = null; ED.sel.clear(); drag = null; updateSelBar(); requestDraw(); return; }
  if (k === 'delete' || k === 'backspace') { if (ED.sel.size) regionAction('del'); else if (ED.region) { pushUndo(); clearRegion(ED.region); afterChange(); } return; }
  if (k === 'r' && ED.stamp) { rotateStamp(); return; }
  if (k === '+' || k === '=') return setZoom(ED.view.cs * 1.2);
  if (k === '-') return setZoom(ED.view.cs / 1.2);
  if (k === '0') return fitView();
  if (k === 'p') return playtest();
  if (k === '[' || k === ']') { const list = ED.tool === 'floor' ? RT.FLOOR_TEXTURES : ED.tool === 'ceil' ? RT.CEIL_TEXTURES : RT.WALL_TEXTURES, key = ED.tool === 'floor' ? 'floor' : ED.tool === 'ceil' ? 'ceil' : 'wall'; const i = list.indexOf(ED.brush[key]); ED.brush[key] = list[(i + (k === ']' ? 1 : -1) + list.length) % list.length]; toast('Brush: ' + (RT.TEX_DEFS[ED.brush[key]] || { name: 'Sky' }).name); renderPanel(); return; }
  const t = TOOLS.find(x => x !== '-' && x[3] && x[3].toLowerCase() === k); if (t) setTool(t[0]);
  if (k === '?' || k === 'f1') openHelp();
});
document.addEventListener('keyup', e => { if (e.key === ' ') spaceHeld = false; });

/* =====================================================================
   SIDE PANEL — Build / Things / Rooms / Level / Project tabs
   ===================================================================== */
function openTab(t, showSheet) {
  ED.tab = t; $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); renderPanel();
  if (showSheet && innerWidth <= 720) document.body.classList.add('sheet');
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) openTab(b.dataset.tab); });
const body = $('#panel-body');
function swatchGrid(list, cur, attr) {
  return `<div class="swatches">${list.map(id => `<button class="sw ${id === cur ? 'on' : ''}" data-${attr}="${id}" title="${esc(id === 'sky' ? 'Sky (open air)' : RT.TEX_DEFS[id].name)}"><canvas data-thumb="${id}" width="48" height="48"></canvas><span class="nm">${esc(id === 'sky' ? 'Sky' : RT.TEX_DEFS[id].name)}</span></button>`).join('')}</div>`;
}
function paintThumbs(root) { $$('canvas[data-thumb]', root).forEach(c => { c.getContext('2d').drawImage(RT.getThumb(c.dataset.thumb, 48), 0, 0); }); }
const seg = (name, opts, cur) => `<div class="seg" data-seg="${name}">${opts.map(o => `<button class="${o[0] === cur ? 'on' : ''}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;

function renderPanel() {
  const t = ED.tab, lv = L();
  if (t === 'build') {
    body.innerHTML = `
      <div class="sec"><h4>Wall texture <span>${esc(RT.TEX_DEFS[ED.brush.wall].name)}</span></h4>${swatchGrid(RT.WALL_TEXTURES, ED.brush.wall, 'wall')}</div>
      <div class="sec"><h4>Floor texture <span>${esc(RT.TEX_DEFS[ED.brush.floor].name)}</span></h4>${swatchGrid(RT.FLOOR_TEXTURES, ED.brush.floor, 'floor')}</div>
      <div class="sec"><h4>Ceiling <span>${ED.brush.ceil === 'sky' ? 'Sky' : esc(RT.TEX_DEFS[ED.brush.ceil].name)}</span></h4>${swatchGrid(RT.CEIL_TEXTURES, ED.brush.ceil, 'ceil')}</div>
      <div class="sec"><h4>Floor height</h4>${seg('fh', [[0, '0'], [0.15, '.15'], [0.3, '.30'], [0.45, '.45'], [0.6, '.60'], [0.75, 'Block']], ED.brush.fh)}<p class="note">Steps of 0.15 make stairs (you can climb up to ${RT.STEP_H}). 0.60 = catwalk. "Block" = waist-high cover you can't climb.</p></div>
      <div class="sec"><h4>Door type</h4>${seg('door', [['door', 'Door'], ['red', 'Red key'], ['blue', 'Blue key'], ['yellow', 'Yellow key']], ED.brush.door)}</div>
      <div class="sec"><h4>Rectangle mode</h4>${seg('rect', [['room', 'Room'], ['solid', 'Solid'], ['floor', 'Carve'], ['outline', 'Outline']], ED.brush.rect)}</div>
      <div class="sec"><h4>Brush size</h4>${seg('size', [[1, '1×1'], [2, '2×2'], [3, '3×3'], [5, '5×5']], ED.brush.size)}</div>`;
    paintThumbs(body);
  } else if (t === 'things') {
    const grp = (title, items) => `<div class="sec"><h4>${title}</h4><div class="things">${items.map(it => { const on = ED.brush.thing.t === it.t && (ED.brush.thing.s || '') === (it.s || ''); const st = thingStyle(it); return `<button class="thing ${on ? 'on' : ''}" data-t="${it.t}" data-s="${it.s || ''}"><span class="dot" style="background:${st[0]};${it.t === 'prop' ? 'border-radius:4px' : ''}">${esc(st[1])}</span>${esc(it.name)}</button>`; }).join('')}</div></div>`;
    const P = RT.PICKUP_DEFS, picks = s => s.map(k => ({ t: 'pickup', s: k, name: P[k].name }));
    body.innerHTML = `<div id="inspector"></div>` +
      grp('Enemies', Object.keys(RT.ENEMY_DEFS).map(k => ({ t: 'enemy', s: k, name: RT.ENEMY_DEFS[k].name }))) +
      grp('Health & armor', picks(['health', 'medkit', 'armor', 'armor_heavy'])) +
      grp('Ammo', picks(['ammo_bullets', 'ammo_shells', 'ammo_cells', 'ammo_rockets'])) +
      grp('Weapons', picks(['w_shotgun', 'w_rifle', 'w_plasma', 'w_rocket'])) +
      grp('Keys & goals', [...picks(['key_red', 'key_blue', 'key_yellow', 'chip']), { t: 'exit', name: 'Exit pad' }]) +
      grp('Props', Object.keys(RT.PROP_DEFS).map(k => ({ t: 'prop', s: k, name: RT.PROP_DEFS[k].name }))) +
      `<div class="sec"><h4>Light</h4><div class="things"><button class="thing ${ED.brush.thing.t === 'light' ? 'on' : ''}" data-t="light" data-s=""><span class="dot" style="background:${ED.brush.light.color}"></span>Light</button></div>
        <div class="row"><label>Color</label><input type="color" data-light="color" value="${ED.brush.light.color}"><div class="btns">${['#ffd9a0', '#ff8a3a', '#4ad8ff', '#ff3030', '#9dff4f', '#ffffff'].map(c => `<button class="tb sm" data-lc="${c}" style="background:${c};width:24px;min-width:24px;padding:0"></button>`).join('')}</div></div>
        <div class="row"><label>Radius</label><input type="range" min="2" max="14" step="0.5" data-light="radius" value="${ED.brush.light.radius}"><output>${ED.brush.light.radius}</output></div>
        <div class="row"><label>Brightness</label><input type="range" min="0.2" max="3" step="0.1" data-light="intensity" value="${ED.brush.light.intensity}"><output>${ED.brush.light.intensity}</output></div>
        <label class="check"><input type="checkbox" data-light="flicker" ${ED.brush.light.flicker ? 'checked' : ''}> Flicker (broken / alarm light)</label></div>
      <label class="check"><input type="checkbox" id="snap" ${ED.snap ? 'checked' : ''}> Snap things to cell centers</label>`;
    renderInspector();
  } else if (t === 'templates') {
    const all = TEMPLATES.map(x => ({ id: x.id, name: x.name, cat: x.cat, desc: x.desc, tpl: x })).concat(ED.project.customTemplates.map(x => ({ id: x.id, name: x.name, cat: 'My templates', desc: x.desc, data: x.data, custom: true })));
    const cats = [...new Set(all.map(x => x.cat))];
    body.innerHTML = `<p class="note">Tap a template, then tap the map to stamp it. <kbd>R</kbd> or ⟳ rotates. Select an area with the Select tool and press "Save template" to make your own.</p>` +
      cats.map(c => `<div class="sec"><h4>${esc(c)}</h4><div class="card-grid">${all.filter(x => x.cat === c).map(x => `<button class="tcard" data-tpl="${x.id}"><canvas width="160" height="123" data-prev="${x.id}"></canvas><b>${esc(x.name)}</b><small>${esc(x.desc || '')}</small>${x.custom ? `<span class="tb sm danger" data-deltpl="${x.id}" style="margin-top:4px">Delete</span>` : ''}</button>`).join('')}</div></div>`).join('') +
      `<div class="sec"><h4>Text legend (for adding your own in app.js)</h4><p class="note">${esc(TEMPLATE_LEGEND_HELP)}</p></div>`;
    all.forEach(x => { const c = $(`canvas[data-prev="${x.id}"]`, body); if (c) drawPreview(c, x.data || tplData(x.tpl)); });
  } else if (t === 'level') {
    const P = lv.props, opt = (list, cur, names) => list.map(id => `<option value="${id}" ${id === cur ? 'selected' : ''}>${esc(names ? names(id) : id)}</option>`).join('');
    const texName = id => id === 'sky' ? 'Sky (open air)' : RT.TEX_DEFS[id].name;
    body.innerHTML = `
      <div class="sec"><h4>Level</h4>
        <div class="row"><label>Name</label><input type="text" data-lp="name" value="${esc(lv.name)}"></div>
        <div class="row"><label>Size</label><input type="number" id="lv-w" min="8" max="128" value="${lv.w}"> × <input type="number" id="lv-h" min="8" max="128" value="${lv.h}"><button class="tb sm" data-act="resize">Apply</button></div>
        <div class="row"><label>Par time (s)</label><input type="number" data-p="par" min="0" value="${P.par || 0}"></div></div>
      <div class="sec"><h4>Atmosphere</h4>
        <div class="row"><label>Sky</label><select data-p="sky">${opt(Object.keys(RT.SKIES), P.sky, k => RT.SKIES[k].name)}</select></div>
        <div class="row"><label>Ambient light</label><input type="color" data-p="ambient" value="${P.ambient}"><input type="range" min="0.05" max="1.5" step="0.05" data-p="ambientI" value="${P.ambientI}"><output>${P.ambientI}</output></div>
        <div class="row"><label>Fog</label><input type="color" data-p="fogColor" value="${P.fogColor}"><input type="range" min="0" max="0.15" step="0.005" data-p="fog" value="${P.fog}"><output>${P.fog}</output></div>
        <div class="row"><label>Wall height</label><input type="range" min="1.2" max="3" step="0.1" data-p="wallH" value="${P.wallH}"><output>${P.wallH}</output></div>
        <div class="row"><label>Default floor</label><select data-p="floorTex">${opt(RT.FLOOR_TEXTURES, P.floorTex, texName)}</select></div>
        <div class="row"><label>Default ceiling</label><select data-p="ceilTex">${opt(RT.CEIL_TEXTURES, P.ceilTex, texName)}</select></div>
        <label class="check"><input type="checkbox" data-p="music" ${P.music !== false ? 'checked' : ''}> Music on</label>
        <div class="row"><label>Track</label><select data-p="track"><option value="" ${!P.track ? 'selected' : ''}>Playlist (shuffle all)</option><option value="synth" ${P.track === 'synth' ? 'selected' : ''}>Synth ambient (built in)</option>${RT.MUSIC_TRACKS.map(t => `<option value="${t.id}" ${P.track === t.id ? 'selected' : ''}>${esc(t.title)} — ${esc(t.artist)} (${t.genre})</option>`).join('')}</select></div></div>
      <div class="sec"><h4>Share this level</h4><div class="btns"><button class="tb sm accent" data-act="shareLink">Share link</button><button class="tb sm" data-act="exportLevel">Export .retro</button><button class="tb sm" data-act="importLevel">Import level</button></div>
        <p class="note">A link holds the whole level, so opening it loads the level and starts playing. Big levels use a .retro file instead. You can also drag a .retro file onto the editor.</p></div>
      <div class="sec"><h4>Logic</h4>${P.scriptPending ? '<div class="issue warn">This imported level has a script that is <b>switched off</b>. Only turn it on if you trust its author: open <b>Edit level script</b>, review it, then press Apply.</div>' : ''}<div class="btns"><button class="tb sm" data-act="script">Edit level script</button><button class="tb sm" data-act="validate">Check level</button></div>
        <p class="note">Scripts react to events: start, tick, kill, pickup, door, use, exit. Example: <code>api.on('kill', () => { if (api.enemiesLeft() === 0) api.openDoor(10, 4); });</code></p></div>
      <div class="sec"><h4>Custom 3D models (.glb)</h4>${modelsUI()}</div>`;
  } else if (t === 'project') {
    body.innerHTML = `
      <div class="sec"><h4>Project <button class="tb sm" data-act="renameProject">Rename</button></h4><div class="note" style="font-size:13px;color:var(--text)">${esc(ED.project.name)}</div></div>
      <div class="sec"><h4>Levels (play in this order)</h4>${ED.project.levels.map((l, i) => `<div class="lvl-item ${i === ED.li ? 'on' : ''}"><span class="nm" data-lvl="${i}">${i + 1}. ${esc(l.name)}</span><button class="tb sm" data-lup="${i}" title="Move up">↑</button><button class="tb sm" data-ldup="${i}" title="Duplicate">⧉</button><button class="tb sm danger" data-ldel="${i}" title="Delete">✕</button></div>`).join('')}
        <div class="btns"><button class="tb sm" data-act="newLevel">+ Empty level</button><button class="tb sm" data-act="newStarter">+ Starter level</button></div></div>
      <div class="sec"><h4>Map layers (view only)</h4>${[['walls', 'Walls'], ['floors', 'Floor textures'], ['ceil', 'Show ceilings instead of floors'], ['heights', 'Floor heights'], ['things', 'Things'], ['lightRadius', 'Light radius glow'], ['grid', 'Grid lines'], ['reach', 'Reachable area (green)']].map(l => `<label class="check"><input type="checkbox" data-layer="${l[0]}" ${ED.layers[l[0]] ? 'checked' : ''}> ${l[1]}</label>`).join('')}</div>
      <div class="sec"><h4>Stats</h4><p class="note">${statsText()}</p></div>`;
  }
}
function statsText() { const lv = L(), c = t => lv.ents.filter(e => e.t === t).length; return `${lv.w}×${lv.h} cells · ${lv.wall.filter((w, i) => w && !lv.kind[i]).length} walls · ${lv.kind.filter(Boolean).length} doors · ${c('enemy')} enemies · ${c('pickup')} pickups · ${c('prop')} props · ${c('light')} lights · ${c('exit')} exits`; }
const tplCache = {};
function tplData(tpl) { return tplCache[tpl.id] || (tplCache[tpl.id] = parseTemplate(tpl, 0)); }
function drawPreview(c, d) {
  const g = c.getContext('2d'), s = Math.min(c.width / d.w, c.height / d.h), ox = (c.width - d.w * s) / 2, oy = (c.height - d.h * s) / 2;
  g.fillStyle = '#05070b'; g.fillRect(0, 0, c.width, c.height);
  d.cells.forEach(cl => { const t = cl.kind ? (cl.kind === 'door' ? 'door' : 'door_' + cl.kind) : cl.wall ? cl.wall : (cl.floor || 'concrete'); g.drawImage(RT.getThumb(t, 32), ox + cl.x * s, oy + cl.y * s, s + 0.5, s + 0.5); if (!cl.wall && !cl.kind) { g.fillStyle = cl.ceil === 'sky' ? 'rgba(10,30,80,.45)' : 'rgba(0,0,0,.5)'; g.fillRect(ox + cl.x * s, oy + cl.y * s, s + 0.5, s + 0.5); if (cl.fh) { g.fillStyle = `rgba(140,200,255,${0.15 + cl.fh * 0.5})`; g.fillRect(ox + cl.x * s, oy + cl.y * s, s + 0.5, s + 0.5); } } });
  d.ents.forEach(e => { const st = thingStyle(e); g.fillStyle = e.t === 'light' ? (e.color || '#ffd9a0') : e.t === 'prop' ? '#8b95a8' : st[0]; g.beginPath(); g.arc(ox + e.x * s, oy + e.y * s, Math.max(1.5, s * 0.3), 0, 7); g.fill(); });
  if (d.spawn) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ox + d.spawn.x * s, oy + d.spawn.y * s, s * 0.4, 0, 7); g.fill(); }
}
// Inspector: edit the selected thing(s)
function renderInspector() {
  const box = $('#inspector'); if (!box) return;
  const lv = L(), sel = lv.ents.filter(e => ED.sel.has(e.id));
  if (!sel.length) { box.innerHTML = ''; return; }
  if (sel.length > 1) { box.innerHTML = `<div class="sec"><h4>Selection</h4><p class="note">${sel.length} things selected.</p><div class="btns"><button class="tb sm" data-r="dup">Duplicate</button><button class="tb sm danger" data-r="del">Delete</button></div></div>`; return; }
  const e = sel[0];
  const subs = e.t === 'enemy' ? RT.ENEMY_DEFS : e.t === 'pickup' ? RT.PICKUP_DEFS : e.t === 'prop' ? RT.PROP_DEFS : null;
  box.innerHTML = `<div class="sec" style="padding:10px;border:1px solid rgba(45,226,255,.35);border-radius:12px;background:rgba(45,226,255,.05)"><h4>Selected ${esc(e.t)} <button class="tb sm danger" data-r="del">Delete</button></h4>
    ${subs ? `<div class="row"><label>Type</label><select data-ep="s">${Object.keys(subs).map(k => `<option value="${k}" ${k === e.s ? 'selected' : ''}>${esc(subs[k].name)}</option>`).join('')}</select></div>` : ''}
    <div class="row"><label>Position</label><input type="number" step="0.25" data-ep="x" value="${e.x}"><input type="number" step="0.25" data-ep="y" value="${e.y}"></div>
    ${e.t === 'enemy' || e.t === 'prop' ? `<div class="row"><label>Facing</label><input type="range" min="0" max="360" step="15" data-ep="rdeg" value="${Math.round(((e.r || 0) * 180 / Math.PI + 360) % 360)}"><output>${Math.round(((e.r || 0) * 180 / Math.PI + 360) % 360)}°</output></div>` : ''}
    ${e.t === 'light' ? `<div class="row"><label>Color</label><input type="color" data-ep="color" value="${e.color || '#ffd9a0'}"></div><div class="row"><label>Radius</label><input type="range" min="2" max="14" step="0.5" data-ep="radius" value="${e.radius || 6}"><output>${e.radius || 6}</output></div><div class="row"><label>Brightness</label><input type="range" min="0.2" max="3" step="0.1" data-ep="intensity" value="${e.intensity || 1.4}"><output>${e.intensity || 1.4}</output></div><label class="check"><input type="checkbox" data-ep="flicker" ${e.flicker ? 'checked' : ''}> Flicker</label>` : ''}
  </div>`;
}
let inspUndo = false;
body.addEventListener('pointerdown', () => { inspUndo = false; });
body.addEventListener('input', ev => {
  const t = ev.target;
  if (t.dataset.ep) {      // inspector field
    const e = L().ents.find(o => ED.sel.has(o.id)); if (!e) return;
    if (!inspUndo) { pushUndo(); inspUndo = true; }
    const k = t.dataset.ep;
    if (k === 'rdeg') { e.r = +t.value * Math.PI / 180; t.nextElementSibling.textContent = t.value + '°'; }
    else if (k === 'flicker') e.flicker = t.checked;
    else if (k === 'x' || k === 'y') e[k] = clamp(+t.value || 0, 0.25, (k === 'x' ? L().w : L().h) - 0.25);
    else if (k === 'radius' || k === 'intensity') { e[k] = +t.value; t.nextElementSibling.textContent = t.value; }
    else e[k] = t.value;
    requestDraw(); markDirty(); return;
  }
  if (t.dataset.light) { const k = t.dataset.light; ED.brush.light[k] = k === 'flicker' ? t.checked : k === 'color' ? t.value : +t.value; if (t.nextElementSibling && t.nextElementSibling.tagName === 'OUTPUT') t.nextElementSibling.textContent = t.value; return; }
  if (t.id === 'snap') { ED.snap = t.checked; return; }
  if (t.dataset.layer) { ED.layers[t.dataset.layer] = t.checked; if (t.dataset.layer === 'reach') ED.reach = null; requestDraw(); return; }
  if (t.dataset.lp === 'name') { L().name = t.value || 'Level'; refreshLevelSelect(); markDirty(); return; }
  if (t.dataset.p) {       // level property
    const k = t.dataset.p, P = L().props;
    P[k] = t.type === 'checkbox' ? t.checked : (t.type === 'range' || t.type === 'number') ? +t.value : t.value;
    if (t.nextElementSibling && t.nextElementSibling.tagName === 'OUTPUT') t.nextElementSibling.textContent = t.value;
    requestDraw(); markDirty();
  }
});
body.addEventListener('click', async ev => {
  const b = ev.target.closest('button, [data-lvl], [data-deltpl]'); if (!b) return;
  const d = b.dataset;
  if (d.deltpl) { ev.stopPropagation(); if (await confirmBox('Delete template', 'Delete this saved template?', 'Delete', true)) { ED.project.customTemplates = ED.project.customTemplates.filter(x => x.id !== d.deltpl); markDirty(); renderPanel(); } return; }
  if (d.wall) { ED.brush.wall = d.wall; setTool('wall'); renderPanel(); return; }
  if (d.floor) { ED.brush.floor = d.floor; setTool('floor'); renderPanel(); return; }
  if (d.ceil) { ED.brush.ceil = d.ceil; setTool('ceil'); renderPanel(); return; }
  if (d.lc) { ED.brush.light.color = d.lc; ED.brush.thing = { t: 'light' }; setTool('thing'); renderPanel(); return; }
  const sg = b.closest('[data-seg]');
  if (sg && d.v !== undefined) { const k = sg.dataset.seg, v = ['fh', 'size'].includes(k) ? +d.v : d.v; ED.brush[k] = v; setTool(k === 'fh' ? 'height' : k === 'door' ? 'door' : k === 'rect' ? 'rect' : ED.tool); renderPanel(); return; }
  if (b.classList.contains('thing')) { ED.brush.thing = { t: d.t, s: d.s || undefined }; setTool('thing'); renderPanel(); if (innerWidth <= 720) document.body.classList.remove('sheet'); return; }
  if (d.r) { regionAction(d.r); return; }
  if (d.tpl) { const custom = ED.project.customTemplates.find(x => x.id === d.tpl), tpl = TEMPLATES.find(x => x.id === d.tpl); startStamp(custom ? custom.name : tpl.name, custom ? custom.data : tplData(tpl)); return; }
  if (d.lvl !== undefined) { switchLevel(+d.lvl); return; }
  if (d.lup !== undefined) { const i = +d.lup; if (i > 0) { const a = ED.project.levels; [a[i - 1], a[i]] = [a[i], a[i - 1]]; if (ED.li === i) ED.li--; else if (ED.li === i - 1) ED.li++; ED.undo = []; ED.redo = []; afterChange(true); } return; }
  if (d.ldup !== undefined) { const c = RT.normalizeLevel(JSON.parse(JSON.stringify(ED.project.levels[+d.ldup]))); c.name += ' (copy)'; ED.project.levels.splice(+d.ldup + 1, 0, c); switchLevel(+d.ldup + 1); return; }
  if (d.ldel !== undefined) { if (ED.project.levels.length < 2) return toast('A project needs at least one level'); if (await confirmBox('Delete level', `Delete "${ED.project.levels[+d.ldel].name}"? (Can't be undone)`, 'Delete', true)) { ED.project.levels.splice(+d.ldel, 1); ED.undo = []; ED.redo = []; switchLevel(Math.min(ED.li, ED.project.levels.length - 1)); } return; }
  if (d.act) runAct(d.act, b);
  if (d.slot) modelAction(d.slot, d.ma);
});
async function runAct(a) {
  const lv = L();
  if (a === 'resize') {
    const w = clamp(+$('#lv-w').value | 0, 8, 128), h = clamp(+$('#lv-h').value | 0, 8, 128); if (w === lv.w && h === lv.h) return;
    pushUndo(); const n = RT.newLevel(lv.name, w, h); n.props = lv.props; n.spawn = { x: Math.min(lv.spawn.x, w - 0.5), y: Math.min(lv.spawn.y, h - 0.5), r: lv.spawn.r };
    for (let y = 0; y < Math.min(h, lv.h); y++) for (let x = 0; x < Math.min(w, lv.w); x++) { const a2 = y * lv.w + x, b2 = y * w + x; ['wall', 'kind', 'floor', 'ceil', 'fh'].forEach(k => { n[k][b2] = lv[k][a2]; }); }
    n.ents = lv.ents.filter(e => e.x < w && e.y < h); ED.project.levels[ED.li] = n; fitView(); afterChange(true); toast(`Resized to ${w}×${h}`);
  } else if (a === 'script') openCode('script');
  else if (a === 'shareLink') shareLink(); else if (a === 'exportLevel') exportLevelFile(); else if (a === 'importLevel') $('#file-retro').click();
  else if (a === 'validate') openValidate();
  else if (a === 'renameProject') { const n = await promptBox('Rename project', 'Name', ED.project.name); if (n) { ED.project.name = n; markDirty(); renderPanel(); updateProjectBtn(); } }
  else if (a === 'newLevel') { ED.project.levels.push(blankLevel('Level ' + (ED.project.levels.length + 1))); switchLevel(ED.project.levels.length - 1); }
  else if (a === 'newStarter') {
    const pick = await modal({ title: 'Add a starter level', body: DF_STARTER_LEVELS.map((d, i) => `<button class="tb" style="width:100%;margin:4px 0;justify-content:flex-start" data-i2="${i}">${esc(d.name)}</button>`).join(''), onOpen: (bk, close) => bk.addEventListener('click', e => { const t = e.target.closest('[data-i2]'); if (t) close(+t.dataset.i2); }) });
    if (pick !== null && pick !== undefined) { ED.project.levels.push(levelFromAscii(DF_STARTER_LEVELS[pick], RT)); switchLevel(ED.project.levels.length - 1); }
  }
}
function switchLevel(i) { ED.li = clamp(i, 0, ED.project.levels.length - 1); ED.sel.clear(); ED.region = null; cancelStamp(); fitView(); afterChange(true); }
function refreshLevelSelect() { $('#level-select').innerHTML = ED.project.levels.map((l, i) => `<option value="${i}" ${i === ED.li ? 'selected' : ''}>${i + 1}. ${esc(l.name)}</option>`).join(''); }
$('#level-select').addEventListener('change', e => switchLevel(+e.target.value));
function updateProjectBtn() { $('#btn-project').textContent = ED.project.name; }
function updateStatus() {
  const def = TOOLS.find(x => x !== '-' && x[0] === ED.tool);
  $('#st-tool').innerHTML = `Tool <b>${def ? def[1] : ''}</b>`;
  const lv = L(); $('#st-count').textContent = `${lv.ents.filter(e => e.t === 'enemy').length} enemies · ${lv.ents.filter(e => e.t === 'pickup').length} pickups · ${lv.ents.filter(e => e.t === 'light').length} lights`;
}

/* ---------- custom GLB model slots ---------- */
const MODEL_SLOTS = [['enemy_grunt', 'Soldier'], ['enemy_drone', 'Gun Drone'], ['enemy_heavy', 'Heavy Walker'], ['enemy_turret', 'Sentry Turret'], ['enemy_titan', 'Titan boss'], ['prop_crate', 'Crate'], ['prop_barrel', 'Barrel'], ['prop_server', 'Server rack'], ['prop_desk', 'Desk'], ['prop_terminal', 'Terminal'], ['prop_pillar', 'Pillar'], ['prop_generator', 'Generator']];
const DYSTOPIA_BASE = 'https://ddemby424.github.io/dystopia-project-moses/';
const DYSTOPIA_PACK = { enemy_grunt: 'models/sentinel_guard.glb', enemy_drone: 'models/bot_drone.glb', enemy_titan: 'models/sentinel_colossus.glb', prop_barrel: 'models/barrel.glb', prop_crate: 'models/crate.glb', prop_desk: 'models/security_desk.glb', prop_server: 'models/server_rack.glb', prop_pillar: 'models/cooling_unit.glb' };
function modelsUI() {
  const m = ED.project.models;
  return `<p class="note">Optional. Every enemy and prop already has a built-in 3D model. You can swap in your own .glb (auto-sized and placed on the floor). Uploads are stored inside the project (keep files small, under ~2 MB).</p>` +
    MODEL_SLOTS.map(s => `<div class="row"><label>${s[1]}</label><span class="note" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m[s[0]] ? (m[s[0]].startsWith('data:') ? 'Uploaded file' : esc(m[s[0]].split('/').pop())) : 'Built-in'}</span><button class="tb sm" data-slot="${s[0]}" data-ma="file">File</button><button class="tb sm" data-slot="${s[0]}" data-ma="url">URL</button>${m[s[0]] ? `<button class="tb sm danger" data-slot="${s[0]}" data-ma="clear">✕</button>` : ''}</div>`).join('') +
    `<div class="btns"><button class="tb sm" data-slot="*" data-ma="dystopia">Use Dystopia pack (online)</button><button class="tb sm" data-slot="*" data-ma="none">All built-in</button></div>`;
}
let glbSlot = null;
async function modelAction(slot, a) {
  const m = ED.project.models;
  if (a === 'file') { glbSlot = slot; $('#file-glb').click(); return; }
  if (a === 'url') { const u = await promptBox('Model URL', '.glb link', m[slot] && !m[slot].startsWith('data:') ? m[slot] : 'https://'); if (u && /^https?:\/\//.test(u)) m[slot] = u.trim(); }
  if (a === 'clear') delete m[slot];
  if (a === 'dystopia') Object.keys(DYSTOPIA_PACK).forEach(k => { m[k] = DYSTOPIA_BASE + DYSTOPIA_PACK[k]; });
  if (a === 'none') Object.keys(m).forEach(k => delete m[k]);
  markDirty(); renderPanel();
}
$('#file-glb').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !glbSlot) return;
  if (f.size > 6e6) { toast('That model is over 6 MB — too big to store in the project', 'bad'); return; }
  const r = new FileReader(); r.onload = () => { ED.project.models[glbSlot] = r.result; markDirty(); renderPanel(); toast('Model added — Playtest to see it', 'ok'); }; r.readAsDataURL(f);
});

/* =====================================================================
   PLAYTEST · EXPORT · PROJECT FILES · CODE EDITOR · HELP
   ===================================================================== */
let playHandle = null;
function playtest(levelIndex) {
  if (playHandle) return;
  const v = RT.validateLevel(L()).issues.filter(i => i.level === 'error' && /start/i.test(i.msg));
  if (v.length) { toast(v[0].msg, 'bad'); return; }
  const host = $('#play-host'); host.classList.add('on'); document.body.classList.remove('sheet');
  const proj = JSON.parse(JSON.stringify(ED.project));
  playHandle = RT.play(host, proj, { level: levelIndex === undefined ? ED.li : levelIndex, onQuit: stopPlaytest });
}
function stopPlaytest() { if (!playHandle) return; playHandle.destroy(); playHandle = null; $('#play-host').classList.remove('on'); resizeCanvas(); }

/* ---------- standalone HTML export: engine source + your project in one file ---------- */
function buildStandaloneHtml() {
  const p = JSON.parse(JSON.stringify(ED.project));
  delete p.customTemplates;
  const usesModels = true;   // built-in asset pack (falls back to procedural models when offline)
  // Exported games load the asset pack from wherever this editor is hosted (or the public RetroEngine copy).
  if (!p.assetBase) p.assetBase = /^https?:/.test(location.protocol) ? new URL('.', location.href).href : RT.HOSTED_BASE;
  const json = JSON.stringify(p).replace(/</g, '\\u003c');        // so a closing script tag can never appear inside the data
  const title = esc(p.name || 'RetroEngine game');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">\n' +
    `<title>${title}</title>\n` +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;700&display=swap">\n' +
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></' + 'script>\n' +
    (usesModels ? '<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></' + 'script>\n<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js"></' + 'script>\n' : '') +
    '<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}</style>\n</head>\n<body>\n<script>\n' +
    `/* ${title} — made with RetroEngine v${RT.VERSION}. Textures and sounds are generated by code; 3D models: CC0 asset pack by Quaternius (see CREDITS.md). */\n` +
    'var DF_PROJECT = ' + json + ';\n' +
    'var DFRuntime = ' + DFRuntime.toString() + ';\n' +
    'DFRuntime().boot(DF_PROJECT);\n</' + 'script>\n</body>\n</html>\n';
}
// Saving files: phones that can share files (Android Chrome/Samsung, iOS Safari 15+) get the share sheet
// ("Save to Files", Drive, messengers), which also works inside in-app browsers that ignore downloads.
async function download(name, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain' });
  try {
    const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (coarse && window.File && navigator.canShare && navigator.share) {
      const f = new File([blob], name, { type: blob.type });
      if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return 'shared'; }
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'downloaded';
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {} ta.remove(); return ok; }
}
const safeName = s => (s || 'game').replace(/[^a-z0-9\-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'game';
async function openExport() {
  const issues = ED.project.levels.map((l, i) => RT.validateLevel(l).issues.filter(x => x.level === 'error').map(x => `Level ${i + 1}: ${x.msg}`)).flat();
  const html = buildStandaloneHtml(), kb = Math.round(html.length / 1024);
  const v = await modal({ title: 'Export standalone game', body: `
    <p class="note" style="font-size:13px">Creates <b>one .html file</b> with all ${ED.project.levels.length} level(s), the engine and settings. Open it in any browser — share it, host it on GitHub Pages, or play it offline once Three.js has been cached. Size: <b>${kb} KB</b>.</p>
    ${issues.length ? `<div class="issue error">${issues.map(esc).join('<br>')}</div>` : '<div class="issue ok">All levels passed the checks.</div>'}
    <p class="note">On a phone/Spck: use <b>Copy HTML</b>, make a new file <code>${safeName(ED.project.name)}.html</code> and paste.</p>`,
    buttons: [{ label: 'Copy HTML', value: 'copy' }, { label: 'Preview', value: 'preview' }, { label: 'Download .html', cls: 'primary', value: 'dl' }] });
  if (v === 'dl') { download(safeName(ED.project.name) + '.html', html, 'text/html'); toast('Downloaded ' + safeName(ED.project.name) + '.html', 'ok'); }
  else if (v === 'copy') { const ok = await copyText(html); toast(ok ? 'Game HTML copied to clipboard' : 'Copy blocked by the browser — use Download', ok ? 'ok' : 'bad'); }
  else if (v === 'preview') { const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank'); if (!w) toast('Pop-up blocked — use Download instead', 'bad'); }
}
function exportJson() { download(safeName(ED.project.name) + '.retroengine.json', JSON.stringify(ED.project, null, 1), 'application/json'); toast('Project file downloaded', 'ok'); }
$('#file-json').addEventListener('change', e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try { const p = normalizeProject(JSON.parse(r.result)); if (await confirmBox('Open project', `Open "${p.name}" (${p.levels.length} levels)? Your current project stays in Projects if you saved it there.`, 'Open')) loadProject(p); }
    catch (err) { toast('Could not read that file: ' + err.message, 'bad'); }
  };
  r.readAsText(f);
});
function loadProject(p) { ED.project = p; ED.li = 0; ED.undo = []; ED.redo = []; ED.sel.clear(); ED.region = null; cancelStamp(); updateProjectBtn(); fitView(); afterChange(true); toast('Opened ' + p.name, 'ok'); }

/* ---------- Projects (named save slots in this browser) ---------- */
async function openProjects() {
  const render = () => { const s = loadSlots(), keys = Object.keys(s).sort((a, b) => s[b].time - s[a].time); return (keys.length ? keys.map(k => `<div class="slot"><div class="nm"><b>${esc(k)}</b><small>${new Date(s[k].time).toLocaleString()} · ${s[k].levels} level(s)</small></div><button class="tb sm" data-open="${esc(k)}">Open</button><button class="tb sm danger" data-del="${esc(k)}">✕</button></div>`).join('') : '<p class="note">No saved projects yet.</p>') + `<div class="btns" style="margin-top:12px"><button class="tb" data-saveas>Save current as…</button><button class="tb" data-new>New empty project</button><button class="tb" data-starter>New from starter campaign</button></div>`; };
  await modal({ title: 'Projects', body: `<div id="slots">${render()}</div>`, onOpen: (bk, close) => bk.addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t || !t.closest('#slots')) return; const s = loadSlots();
    if (t.dataset.open) { try { loadProject(normalizeProject(JSON.parse(s[t.dataset.open].data))); close(); } catch (err) { toast('That save is damaged', 'bad'); } }
    else if (t.dataset.del) { if (await confirmBox('Delete save', `Delete "${t.dataset.del}"?`, 'Delete', true)) { delete s[t.dataset.del]; saveSlots(s); $('#slots', bk).innerHTML = render(); } }
    else if (t.dataset.saveas !== undefined) { const n = await promptBox('Save project as', 'Name', ED.project.name); if (n) { try { s[n] = { time: Date.now(), levels: ED.project.levels.length, data: JSON.stringify(ED.project) }; saveSlots(s); ED.project.name = n; updateProjectBtn(); markDirty(); toast('Saved "' + n + '"', 'ok'); } catch (err) { toast('Browser storage is full — export JSON instead', 'bad'); } $('#slots', bk).innerHTML = render(); } }
    else if (t.dataset.new !== undefined) { if (await confirmBox('New project', 'Start a new empty project? (Save the current one first if you want to keep it.)', 'New project')) { loadProject({ format: 'retroengine-project', version: 2, name: 'New Project', levels: [blankLevel('Level 1')], models: {}, customTemplates: [] }); close(); } }
    else if (t.dataset.starter !== undefined) { loadProject(starterProject()); close(); }
  }) });
}

/* ---------- sharing maps: .retro level files and #map= share links ----------
   .retro = small versioned JSON: the level, its grids run-length encoded, plus custom model
   references (and embedded uploads in files). Links deflate that JSON (CompressionStream)
   and base64url it into the URL hash, which never reaches a server. */
const RETRO_FORMAT = 'retroengine-level', RETRO_VERSION = 1, LINK_MAX = 7500;
const GRID_KEYS = ['wall', 'kind', 'floor', 'ceil', 'fh'];
function rle(a) { const o = []; for (let i = 0; i < a.length;) { let j = i; while (j < a.length && a[j] === a[i]) j++; o.push(j - i === 1 ? [a[i]] : [a[i], j - i]); i = j; } return o; }
function unrle(r, n) { const o = []; if (!Array.isArray(r)) throw new Error('grid data damaged'); for (const run of r) { const c = Math.min(n, (run && run[1]) | 0 || 1); for (let k = 0; k < c; k++) o.push(run[0]); if (o.length > n) break; } if (o.length !== n) throw new Error('grid size mismatch'); return o; }
function packLevel(lv, withUploads) {
  const L = JSON.parse(JSON.stringify(lv)), grid = {};
  GRID_KEYS.forEach(k => { grid[k] = rle(L[k] || []); delete L[k]; });
  L.ents = (L.ents || []).map(e => { const c = Object.assign({}, e); delete c.id; return c; });
  if (L.props) delete L.props.scriptPending;
  const out = { format: RETRO_FORMAT, version: RETRO_VERSION, app: 'RetroEngine ' + RT.VERSION, level: L, grid };
  const m = ED.project.models || {}, models = {};
  Object.keys(m).forEach(k => { if (withUploads || !String(m[k]).startsWith('data:')) models[k] = m[k]; });
  if (Object.keys(models).length) out.assets = { models };
  return out;
}
const MODEL_SRC_OK = v => /^https?:\/\/[^\s"'<>]+$/i.test(v) || /^data:(model\/gltf-binary|application\/octet-stream)?;base64,[A-Za-z0-9+/=]+$/.test(v);
function unpackLevel(o) {
  if (!o || typeof o !== 'object') throw new Error('not a RetroEngine level');
  if (Array.isArray(o.levels)) return { project: normalizeProject(o) };              // a whole project file also works
  if (o.format !== RETRO_FORMAT) throw new Error('not a RetroEngine level file');
  if ((o.version | 0) > RETRO_VERSION) throw new Error('made with a newer RetroEngine (format v' + o.version + ')');
  const L = Object.assign({}, o.level || {}), w = L.w | 0, h = L.h | 0;
  if (w < 8 || h < 8 || w > 128 || h > 128) throw new Error('level size must be 8–128 cells');
  GRID_KEYS.forEach(k => { if (o.grid && o.grid[k]) L[k] = unrle(o.grid[k], w * h); });
  const T = ['enemy', 'pickup', 'prop', 'light', 'exit'];
  L.ents = (Array.isArray(L.ents) ? L.ents : []).filter(e => e && T.includes(e.t) && isFinite(e.x) && isFinite(e.y) && e.x >= 0 && e.y >= 0 && e.x <= w && e.y <= h).slice(0, 3000);
  const lv = RT.normalizeLevel(L), models = {}, am = (o.assets && o.assets.models) || {};
  Object.keys(am).forEach(k => { if (/^(enemy|prop)_[a-z_]+$/.test(k) && MODEL_SRC_OK(String(am[k]))) models[k] = String(am[k]); });
  return { level: lv, models };
}
async function deflateBytes(str) {
  if (!window.CompressionStream) return null;
  try { const s = new Blob([new TextEncoder().encode(str)]).stream().pipeThrough(new CompressionStream('deflate-raw')); return new Uint8Array(await new Response(s).arrayBuffer()); } catch (e) { return null; }
}
// Tiny raw-DEFLATE decoder (RFC 1951), used only when the browser has no DecompressionStream (older Safari/Firefox/Samsung).
function inflateRaw(src) {
  let pos = 0, bit = 0, out = new Uint8Array(Math.max(1024, src.length * 4)), op = 0;
  const need = n => { if (op + n > out.length) { const o = new Uint8Array(Math.max(out.length * 2, op + n)); o.set(out); out = o; } };
  const bits = n => { let v = 0; for (let i = 0; i < n; i++) { if (pos >= src.length) throw new Error('link data is cut off'); v |= ((src[pos] >> bit) & 1) << i; if (++bit === 8) { bit = 0; pos++; } } return v; };
  const table = lens => { const cnt = new Uint16Array(16), offs = new Uint16Array(16), sym = new Uint16Array(lens.length);
    lens.forEach(l => cnt[l]++); cnt[0] = 0; for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + cnt[i - 1];
    lens.forEach((l, s) => { if (l) sym[offs[l]++] = s; }); return { cnt, sym }; };
  const decode = t => { let code = 0, first = 0, idx = 0; for (let l = 1; l < 16; l++) { code |= bits(1); const c = t.cnt[l]; if (code - c < first) return t.sym[idx + code - first]; idx += c; first = (first + c) << 1; code <<= 1; } throw new Error('bad link data'); };
  const LB = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258], LE = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const DB = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577], DE = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  let fixL = null, fixD = null, last = 0;
  do {
    last = bits(1); const type = bits(2);
    if (type === 0) { if (bit) { bit = 0; pos++; } const len = src[pos] | (src[pos + 1] << 8); pos += 4; need(len); out.set(src.subarray(pos, pos + len), op); op += len; pos += len; continue; }
    let lt, dt;
    if (type === 1) { if (!fixL) { const l = new Array(288); for (let i = 0; i < 288; i++) l[i] = i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8; fixL = table(l); fixD = table(new Array(30).fill(5)); } lt = fixL; dt = fixD; }
    else if (type === 2) {
      const hl = bits(5) + 257, hd = bits(5) + 1, hc = bits(4) + 4, ord = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15], cl = new Array(19).fill(0);
      for (let i = 0; i < hc; i++) cl[ord[i]] = bits(3);
      const ct = table(cl), ls = [];
      while (ls.length < hl + hd) { const s = decode(ct); if (s < 16) ls.push(s); else if (s === 16) { const p = ls[ls.length - 1], r = 3 + bits(2); for (let i = 0; i < r; i++) ls.push(p); } else { const r = s === 17 ? 3 + bits(3) : 11 + bits(7); for (let i = 0; i < r; i++) ls.push(0); } }
      lt = table(ls.slice(0, hl)); dt = table(ls.slice(hl, hl + hd));
    } else throw new Error('bad link data');
    for (;;) {
      const s = decode(lt); if (s === 256) break;
      if (s < 256) { need(1); out[op++] = s; continue; }
      const li = s - 257, len = LB[li] + bits(LE[li]), di = decode(dt), d = DB[di] + bits(DE[di]);
      if (d > op) throw new Error('bad link data'); need(len); for (let i = 0; i < len; i++, op++) out[op] = out[op - d];
      if (op > 16e6) throw new Error('link is too large');
    }
  } while (!last);
  return out.subarray(0, op);
}
async function inflateBytes(u8) {
  if (!window.DecompressionStream || window.__RE_FORCE_JS_INFLATE) return new TextDecoder().decode(inflateRaw(u8));
  try { const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return await new Response(s).text(); }
  catch (e) { return new TextDecoder().decode(inflateRaw(u8)); }   // e.g. 'deflate-raw' unsupported in that build
}
const b64u = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
async function encodeMap(obj) { const json = JSON.stringify(obj), z = await deflateBytes(json); return z ? 'z' + b64u(z) : 'j' + b64u(new TextEncoder().encode(json)); }
async function decodeMap(code) {
  const k = code[0], u = unb64u(code.slice(1).replace(/[^A-Za-z0-9\-_]/g, ''));
  if (u.length > 2e6) throw new Error('link is too large');
  const txt = k === 'z' ? await inflateBytes(u) : k === 'j' ? new TextDecoder().decode(u) : null;
  if (txt === null) throw new Error('unknown link format'); if (txt.length > 8e6) throw new Error('link is too large');
  return JSON.parse(txt);
}
function exportLevelFile() {
  const pk = packLevel(L(), true); pk.created = new Date().toISOString();
  download(safeName(L().name) + '.retro', JSON.stringify(pk), 'application/json').then(r => r !== 'cancelled' && toast('Saved ' + safeName(L().name) + '.retro — send it to a friend, they open it with Import level', 'ok'));
}
async function shareLink() {
  const lv = L(), code = await encodeMap(packLevel(lv, false)), url = location.href.split('#')[0] + '#map=' + code;
  ED.lastShareUrl = url;
  if (url.length > LINK_MAX) {
    const v = await modal({ title: 'Too big for a link', body: `<p class="note" style="font-size:13px">This level needs a <b>${(url.length / 1024).toFixed(1)} KB</b> link, and many apps cut links longer than about ${Math.round(LINK_MAX / 1024)} KB. Share the <b>.retro file</b> instead. It works everywhere and includes uploaded models.</p>`, buttons: [{ label: 'Cancel', value: 0 }, { label: 'Export .retro file', cls: 'primary', value: 1 }] });
    if (v) exportLevelFile(); return url;
  }
  const local = location.protocol === 'file:' || /^(localhost|127\.)/.test(location.hostname);
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title: lv.name + ' — RetroEngine level', text: 'Play my RetroEngine level "' + lv.name + '"', url }); toast('Shared!', 'ok'); return url; }
    catch (e) { if (e && e.name === 'AbortError') return url; }
  }
  const copied = await copyText(url);
  modal({ title: 'Share link', body: `<p class="note" style="font-size:13px">${copied ? '<b>Link copied.</b> ' : ''}Anyone who opens this link gets <b>${esc(lv.name)}</b> in RetroEngine, ready to play.${local ? '<br><b>Heads up:</b> RetroEngine is running from this device, so the link only works here. Host it (for example on GitHub Pages) to share links with friends.' : ''}</p>
    <textarea class="share-url" readonly>${esc(url)}</textarea><p class="note">${(url.length / 1024).toFixed(1)} KB link${code[0] === 'z' ? ' (compressed)' : ''}. Custom models you uploaded are only included in .retro files.</p>`,
    buttons: [{ label: 'Copy', value: () => { copyText(url).then(ok => toast(ok ? 'Copied' : 'Select the text and copy it', ok ? 'ok' : 'bad')); return null; } }, { label: 'Done', cls: 'primary', value: 1 }],
    onOpen: bk => { const ta = $('.share-url', bk); ta.addEventListener('focus', () => ta.select()); } });
  return url;
}
// Add an imported/linked level to the project. Scripts from other people stay OFF until reviewed.
async function importMapObject(o, how) {
  const r = unpackLevel(o);
  if (r.project) { if (await confirmBox('Open project', `This file is a whole project: "${esc(r.project.name)}" (${r.project.levels.length} levels). Open it? Save your current one in Projects first if you want to keep it.`, 'Open')) loadProject(r.project); return null; }
  const lv = r.level; let scriptOff = false;
  // Official same-origin pack maps keep their script. Imported files and share links stay off until reviewed.
  if (how !== 'pack' && lv.props.script && lv.props.script.trim()) { lv.props.scriptPending = lv.props.script; lv.props.script = ''; scriptOff = true; }
  let addedModels = 0; Object.keys(r.models).forEach(k => { if (!ED.project.models[k]) { ED.project.models[k] = r.models[k]; addedModels++; } });
  pushUndo(); ED.project.levels.push(lv); switchLevel(ED.project.levels.length - 1); markDirty();
  const errs = RT.validateLevel(lv).issues.filter(i => i.level === 'error');
  const note = scriptOff ? 'Its level script is <b>switched off</b> for safety. Review it in Level → Logic before turning it on.' : '';
  if (how === 'link' || how === 'pack') { toast(`${how === 'pack' ? 'Loaded trial map' : 'Opened shared level'} "${lv.name}"${scriptOff ? ' (script off)' : ''}`, 'ok'); if (!errs.length) playtest(); return lv; }
  const v = await modal({ title: 'Level imported', body: `<p class="note" style="font-size:13px"><b>${esc(lv.name)}</b> (${lv.w}×${lv.h}) was added as level ${ED.project.levels.length}.${addedModels ? ` ${addedModels} custom model(s) added.` : ''}</p>${errs.length ? `<div class="issue error">${errs.map(e => esc(e.msg)).join('<br>')}</div>` : '<div class="issue ok">Level checks passed.</div>'}${note ? `<p class="note">${note}</p>` : ''}`,
    buttons: [{ label: 'Edit it', value: 'edit' }, { label: 'Play now', cls: 'primary', value: 'play' }] });
  if (v === 'play') playtest();
  return lv;
}
async function importLevelText(text, name) {
  if (text.length > 30e6) { toast('That file is too large (max 30 MB)', 'bad'); return; }
  let o; try { o = JSON.parse(text); } catch (e) { toast(`"${name || 'file'}" is not a RetroEngine .retro or .json file`, 'bad'); return; }
  try { await importMapObject(o, 'file'); } catch (e) { toast('Could not import: ' + e.message, 'bad'); }
}
function readFileThen(f, cb) { const r = new FileReader(); r.onload = () => cb(String(r.result)); r.onerror = () => toast('Could not read that file', 'bad'); r.readAsText(f); }
async function openFromHash() {
  const m = /^#map=([A-Za-z0-9\-_]+)/.exec(location.hash); if (!m) return false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
  try { const o = await decodeMap(m[1]); await importMapObject(o, 'link'); return true; }
  catch (e) { toast('That share link is broken or incomplete: ' + e.message, 'bad'); return false; }
}
// Official trial maps hosted next to this app: #pack=maps/name.retro (same origin only).
const PACK_PATH = /^(?:maps|packs)\/[A-Za-z0-9][A-Za-z0-9._-]*\.retro$/;
async function openFromPack() {
  const raw = /^#pack=([^#]+)/.exec(location.hash); if (!raw) return false;
  const path = decodeURIComponent(raw[1]);
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
  if (!PACK_PATH.test(path)) { toast('That map pack link is not valid', 'bad'); return false; }
  try {
    const url = new URL(path, location.href);
    if (url.origin !== location.origin) throw new Error('pack must be on this site');
    const res = await fetch(url.href);
    if (!res.ok) throw new Error('could not load ' + path + ' (' + res.status + ')');
    const text = await res.text();
    if (text.length > 30e6) throw new Error('file too large');
    const o = JSON.parse(text);
    await importMapObject(o, 'pack');
    return true;
  } catch (e) { toast('Could not load that trial map: ' + e.message, 'bad'); return false; }
}
$('#file-retro').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) readFileThen(f, t => importLevelText(t, f.name)); });
// drag & drop a .retro / .json file anywhere on the editor
let dragDepth = 0;
window.addEventListener('dragenter', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) { dragDepth++; document.body.classList.add('dropping'); e.preventDefault(); } });
window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('dropping'); });
window.addEventListener('dragover', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
window.addEventListener('drop', e => {
  if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); dragDepth = 0; document.body.classList.remove('dropping');
  const f = e.dataTransfer.files[0];
  if (!/\.(retro|json)$/i.test(f.name)) { toast('Drop a .retro level or .json project file', 'bad'); return; }
  readFileThen(f, t => importLevelText(t, f.name));
});
window.addEventListener('hashchange', () => { if (playHandle) return; if (/^#map=/.test(location.hash)) openFromHash(); else if (/^#pack=/.test(location.hash)) openFromPack(); });

/* ---------- main menu ---------- */
async function openMenu() {
  const items = [['projects', 'Projects (save / open)'], ['import', 'Import project file (.json)'], ['exportJson', 'Export project file (.json)'], ['export', 'Export playable game (.html)'], ['exportLevel', 'Export this level (.retro)'], ['importLevel', 'Import level (.retro)'], ['shareLink', 'Share level link'], ['code', 'Code editor (level.json / script)'], ['validate', 'Check level for problems'], ['playFirst', 'Play campaign from level 1'], ['tutorial', 'Tutorial: build your first level'], ['docsTutorial', 'Tutorial'], ['mapPack', 'Trial map pack'], ['help', 'Help & manual'], ['settings', 'Game settings'], ['about', 'About & credits']];
  const v = await modal({ title: 'Menu', body: `<div class="menu-list">${items.map(i => `<button class="tb" data-m="${i[0]}">${esc(i[1])}</button>`).join('')}</div>`, onOpen: (bk, close) => bk.addEventListener('click', e => { const t = e.target.closest('[data-m]'); if (t) close(t.dataset.m); }) });
  if (v === 'projects') openProjects(); else if (v === 'import') $('#file-json').click(); else if (v === 'exportJson') exportJson(); else if (v === 'export') openExport(); else if (v === 'exportLevel') exportLevelFile(); else if (v === 'importLevel') $('#file-retro').click(); else if (v === 'shareLink') shareLink();
  else if (v === 'code') openCode('level'); else if (v === 'validate') openValidate(); else if (v === 'playFirst') playtest(0); else if (v === 'help') openHelp(); else if (v === 'tutorial') startTutorial(); else if (v === 'docsTutorial') { location.href = new URL('tutorial/', location.href).href; } else if (v === 'mapPack') { location.href = new URL('maps/', location.href).href; } else if (v === 'about') openAbout(); else if (v === 'settings') openGameSettings();
}
function openGameSettings() {
  const S = RT.S, r = (k, lab, a, b, st) => `<div class="row"><label>${lab}</label><input type="range" min="${a}" max="${b}" step="${st}" data-gs="${k}" value="${S[k]}"><output>${S[k]}</output></div>`;
  modal({ title: 'Game settings (this device)', body: r('sens', 'Look sensitivity', 0.2, 3, 0.05) + r('fov', 'Field of view', 60, 100, 1) + r('volume', 'Volume', 0, 1, 0.05) + r('music', 'Music', 0, 1, 0.05) +
    `<div class="row"><label>Aim assist</label><input type="range" min="0" max="1" step="0.05" data-gs="aimAssist" value="${S.aimAssist}"><output>${Math.round((S.aimAssist || 0) * 100)}%</output></div>` +
    `<div class="row"><label>Quality</label><select data-gs="quality">${['low', 'medium', 'high'].map(q => `<option ${S.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select></div><label class="check"><input type="checkbox" data-gs="invertY" ${S.invertY ? 'checked' : ''}> Invert look up/down</label><label class="check"><input type="checkbox" data-gs="aimAssistMouse" ${S.aimAssistMouse ? 'checked' : ''}> Also use aim assist with mouse</label><label class="check"><input type="checkbox" data-gs="showFps" ${S.showFps ? 'checked' : ''}> Show FPS</label>`,
    buttons: [{ label: 'Done', cls: 'primary', value: 1 }],
    onOpen: bk => bk.addEventListener('input', e => { const t = e.target, k = t.dataset.gs; if (!k) return; S[k] = t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' ? t.value : +t.value; if (t.nextElementSibling) t.nextElementSibling.textContent = k === 'aimAssist' ? Math.round(S[k] * 100) + '%' : t.value; RT.saveSettings(); }) });
}
const MODEL_CREDITS = [
  ['Soldier (SWAT)', 'enemy', 'https://poly.pizza/m/Btfn3G5Xv4'], ['Robot Enemy Flying Gun (Gun Drone)', 'enemy', 'https://poly.pizza/m/UDTM6X1y9a'],
  ['Robot Enemy Legs Gun (Heavy Walker)', 'enemy', 'https://poly.pizza/m/lFZfDh2hzP'], ['Robot Enemy Large Gun (Titan)', 'enemy', 'https://poly.pizza/m/mWojM4i2IH'],
  ['Pistol', 'weapon', 'https://poly.pizza/m/J3i9KDQ3kt'], ['Shotgun', 'weapon', 'https://poly.pizza/m/ZmPTnh7njL'], ['Assault Rifle', 'weapon', 'https://poly.pizza/m/Bgvuu4CUMV'],
  ['Sci-fi Assault Rifle (Plasma Caster)', 'weapon', 'https://poly.pizza/m/j40c8VDdAQ'], ['Rocket Launcher', 'weapon', 'https://poly.pizza/m/GCqUvqleqN']];
function openAbout() {
  const link = (u, t) => `<a href="${u}" target="_blank" rel="noopener">${esc(t || u.replace(/^https?:\/\//, ''))}</a>`;
  modal({ title: 'About & credits', wide: true, body: `<div class="about">
    <div class="about-hero"><div class="about-logo"><span>&#9670;</span> Retro<b>Engine</b></div><div class="note">Version ${RT.VERSION} · a browser game maker for retro first-person shooters · formerly DOOMFORGE IDE</div></div>
    <h4>3D models: Quaternius (CC0 1.0, public domain)</h4><p class="note">Rigged, animated characters and weapons by <b>Quaternius</b> (quaternius.com), downloaded from Poly Pizza. CC0 means no attribution is required. We credit them anyway.</p>
    <ul class="cred">${MODEL_CREDITS.map(c => `<li><b>${esc(c[0])}</b> <span>${c[1]} · CC0 1.0 · ${link(c[2])}</span></li>`).join('')}</ul>
    <h4>Music (CC BY 4.0)</h4><ul class="cred">${RT.MUSIC_TRACKS.map(t => `<li><b>"${esc(t.title)}"</b> <span>${esc(t.artist)} · ${esc(t.genre)} · ${t.license} · ${link(t.url)}</span></li>`).join('')}</ul>
    <p class="note">Kevin MacLeod (incompetech.com) and Shane Ivers (silvermansound.com). Licensed under Creative Commons: By Attribution 4.0 — ${link('https://creativecommons.org/licenses/by/4.0/')}. Tracks were re-encoded to 112 kbps for size; nothing else was changed.</p>
    <h4>Code &amp; fonts</h4><ul class="cred"><li><b>Three.js r128</b> <span>MIT License · ${link('https://threejs.org')}</span></li><li><b>GLTFLoader, SkeletonUtils</b> <span>Three.js examples · MIT</span></li><li><b>Chakra Petch</b> <span>SIL Open Font License · Google Fonts</span></li></ul>
    <h4>Made by RetroEngine</h4><p class="note">Textures (20 procedural PBR materials), the props, pickups, turret, sound effects and synth music are all generated by code in this app. The editor, engine and starter levels are original work. Custom uploads are your responsibility: use CC0 or CC-BY assets and credit their authors. The full list is in CREDITS.md.</p></div>`,
    buttons: [{ label: 'Close', value: 1 }] });
}
async function openValidate() {
  const res = RT.validateLevel(L()); ED.layers.reach = true; ED.reach = res.reachable; requestDraw();
  await modal({ title: 'Check level: ' + L().name, body: (res.issues.length ? res.issues.map(i => `<div class="issue ${i.level}">${i.level === 'error' ? 'Problem' : 'Tip'}: ${esc(i.msg)}</div>`).join('') : '<div class="issue ok">Looks good! The exit is reachable and there are no problems.</div>') + `<p class="note">The reachable area is now tinted green on the map (turn it off in Project → Map layers). Keys found on the way: ${res.keysFound.length ? res.keysFound.join(', ') : 'none'}.</p>`, buttons: [{ label: 'Close', value: 1 }, { label: 'Playtest', cls: 'primary', value: 'play' }] }).then(v => { if (v === 'play') playtest(); });
}

/* ---------- code editor: level.json (editable), script.js (editable), project.json (view) ---------- */
function highlight(src, mode) {
  let h = esc(src);
  if (mode === 'script') h = h.replace(/(\/\/.*$)/gm, '<span class="tok-c">$1</span>').replace(/(&#39;[^&#\n]*?&#39;|&quot;[^\n]*?&quot;|`[^`]*`)/g, '<span class="tok-s">$1</span>').replace(/\b(const|let|var|function|return|if|else|for|while|true|false|null|new|of|in)\b/g, '<span class="tok-k">$1</span>').replace(/\b(api)\b/g, '<span class="tok-p">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-n">$1</span>');
  else h = h.replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?/g, (m, s, c) => c ? `<span class="tok-k">${s}</span>${c}` : `<span class="tok-s">${s}</span>`).replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="tok-n">$1</span>').replace(/\b(true|false|null)\b/g, '<span class="tok-p">$1</span>');
  return h + '\n';
}
const SCRIPT_EXAMPLE = `// Level script — runs when the level starts.
// Events: 'start', 'tick'(dt), 'kill'(enemyType), 'pickup'(itemType), 'door'({x,y}), 'use'({x,y}), 'exit'
// api: message(text), heal(n), giveArmor(n), giveAmmo(type, n), openDoor(x, y),
//      enemiesLeft(), kills(), time(), win(), sound(name), player {x, y, hp, armor, keys}
api.on('start', () => api.message('Find the exit. Stay alive.'));
api.on('kill', () => {
  if (api.enemiesLeft() === 0) api.message('Sector clear!');
});
`;
function openCode(which) {
  let tab = which === 'script' ? 'script' : which === 'project' ? 'project' : 'level';
  const content = t => t === 'script' ? (L().props.script || L().props.scriptPending || SCRIPT_EXAMPLE) : t === 'project' ? JSON.stringify(ED.project, null, 1).slice(0, 400000) : JSON.stringify(L(), (k, v) => Array.isArray(v) && v.length > 50 && typeof v[0] !== 'object' ? '@@' + JSON.stringify(v) + '@@' : v, 1).replace(/"@@(.*?)@@"/g, (m, s) => s.replace(/\\"/g, '"'));
  modal({ title: 'Code editor', wide: true, body: `<div style="display:flex;flex-direction:column;height:100%;gap:8px"><div class="code-tabs">${[['level', 'level.json'], ['script', 'script.js'], ['project', 'project.json (read-only)']].map(t => `<button class="tb sm ${t[0] === tab ? 'accent' : ''}" data-ct="${t[0]}">${t[1]}</button>`).join('')}<span class="spacer"></span><span class="note" id="code-msg"></span></div>
    <div class="code-wrap" style="flex:1"><div class="code-gutter"></div><div class="code-area"><pre></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off"></textarea></div></div></div>`,
    buttons: [{ label: 'Copy', value: b => { copyText($('textarea', b).value); toast('Copied'); return null; } }, { label: 'Close', value: null }, { label: 'Apply', cls: 'primary', value: b => ({ tab: b.dataset.tab, text: $('textarea', b).value }) }],
    onOpen: (bk) => {
      const ta = $('textarea', bk), pre = $('pre', bk), gut = $('.code-gutter', bk);
      const sync = () => { pre.innerHTML = highlight(ta.value, tab); const n = ta.value.split('\n').length; let g = ''; for (let i = 1; i <= n; i++) g += i + '\n'; gut.textContent = g; };
      const load = t => { tab = t; bk.dataset.tab = t; ta.value = content(t); ta.readOnly = t === 'project'; sync(); $$('[data-ct]', bk).forEach(b => b.classList.toggle('accent', b.dataset.ct === t)); $('#code-msg', bk).textContent = t === 'level' ? 'Edit, then Apply. Bad JSON is rejected safely.' : t === 'script' ? 'JavaScript run by the game. Apply saves it.' : ''; };
      ta.addEventListener('input', sync);
      ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gut.scrollTop = ta.scrollTop; });
      ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; sync(); } });
      bk.addEventListener('click', e => { const t = e.target.closest('[data-ct]'); if (t) load(t.dataset.ct); });
      load(tab);
    } }).then(r => {
    if (!r) return;
    if (r.tab === 'level') { try { const lv = RT.normalizeLevel(JSON.parse(r.text)); pushUndo(); ED.project.levels[ED.li] = lv; afterChange(true); toast('level.json applied', 'ok'); } catch (e) { toast('JSON error: ' + e.message, 'bad'); } }
    else if (r.tab === 'script') { try { new Function('api', r.text); pushUndo(); L().props.script = r.text; delete L().props.scriptPending; afterChange(); toast('Script saved — Playtest to run it', 'ok'); } catch (e) { toast('Script syntax error: ' + e.message, 'bad'); } }
  });
}

/* ---------- help / onboarding ---------- */
// The manual text is shared with help.html (the build injects help_content.html here).
const HELP_HTML = "<section id=\"h-start\"><h2>Getting started<\/h2>\n<p>RetroEngine is a game maker for retro-style first-person shooters. You draw levels on a top-down grid, drop in enemies, weapons, keys and lights, then press <b>Play<\/b> to walk through them in 3D. When you're happy, <b>Export<\/b> turns your project into one HTML file anyone can play in a browser.<\/p>\n<ol><li><b>Take the first-level tutorial.<\/b> Menu \u2192 <b>Tutorial: build your first level<\/b>. It takes about 5 minutes.<\/li>\n<li><b>Or open the Tutorial.<\/b> Menu \u2192 <b>Tutorial<\/b> (also at <a href=\"tutorial/\">tutorial/<\/a>) teaches adding maps, saving files, putting assets in code, changing engine knobs, and \u2014 in the advanced lessons \u2014 writing scripts and calling APIs.<\/li>\n<li><b>Or open a starter level.<\/b> The level picker in the top bar has three finished levels (E1M1\u2013E1M3). Play them, then take them apart to see how they work.<\/li>\n<li><b>Save often.<\/b> Work autosaves in this browser. Use Menu \u2192 <b>Projects<\/b> for named saves, and <b>Export project file (.json)<\/b> for real backups.<\/li><\/ol><\/section>\n\n<section id=\"h-tutorial\"><h2>Tutorial<\/h2>\n<p>Menu \u2192 <b>Tutorial<\/b> opens the Tinkerer tutorial: adding maps, saving and sharing files, loading assets in code, and changing engine knobs, with an advanced section on level scripts and APIs. You can also open <a href=\"tutorial/tutorial.html\">tutorial/tutorial.html<\/a> (or just <a href=\"tutorial/\">tutorial/<\/a>) directly. For a five-minute first level inside the editor, use Menu \u2192 <b>Tutorial: build your first level<\/b>.<\/p><\/section>\n\n<section id=\"h-ui\"><h2>The editor screen<\/h2>\n<ul><li><b>Top bar:<\/b> level picker, undo/redo, <b>Play<\/b>, <b>Export<\/b> and the <b>Menu<\/b>.<\/li>\n<li><b>Tool bar<\/b> (left on tablets and desktop, bottom on phones): the drawing tools.<\/li>\n<li><b>Panel<\/b> (right; a slide-up sheet on folded phones, opened with the panel button): <b>Build<\/b> (textures, door types, heights), <b>Things<\/b> (enemies, items, props, lights), <b>Rooms<\/b> (template library), <b>Level<\/b> (sky, fog, lighting, music, script) and <b>Project<\/b> (levels, models, map layers).<\/li>\n<li><b>Map:<\/b> one finger or the mouse uses the current tool. Two fingers pan and pinch-zoom; on desktop use Space+drag and the mouse wheel. <b>Fit<\/b> frames the whole level.<\/li><\/ul><\/section>\n\n<section id=\"h-tools\"><h2>Tools<\/h2>\n<table><tr><th>Tool<\/th><th>Key<\/th><th>What it does<\/th><\/tr>\n<tr><td>Select<\/td><td>V<\/td><td>Tap a thing to select and inspect it, drag to move it. Drag on empty space to select an area, then Copy / Cut / Delete / Save as template.<\/td><\/tr>\n<tr><td>Pan<\/td><td>H<\/td><td>Drag to move the view.<\/td><\/tr>\n<tr><td>Wall<\/td><td>B<\/td><td>Paint solid walls with the chosen texture.<\/td><\/tr>\n<tr><td>Floor<\/td><td>F<\/td><td>Paint floor texture. Painting floor also removes walls.<\/td><\/tr>\n<tr><td>Ceiling<\/td><td>C<\/td><td>Paint ceiling texture. Choose <b>Sky<\/b> for outdoor areas.<\/td><\/tr>\n<tr><td>Height<\/td><td>U<\/td><td>Raise floors: 0.15 per step makes stairs, 0.6 a catwalk, 0.75 a cover block the player can't climb.<\/td><\/tr>\n<tr><td>Rect<\/td><td>R<\/td><td>Drag a rectangle: a room with walls, a solid block, a carved floor or an outline.<\/td><\/tr>\n<tr><td>Fill<\/td><td>G<\/td><td>Flood-fill a connected area that has the same texture.<\/td><\/tr>\n<tr><td>Erase<\/td><td>E<\/td><td>Removes things first, then walls, then floor details.<\/td><\/tr>\n<tr><td>Door<\/td><td>D<\/td><td>Place doors in wall gaps. Red, blue and yellow doors need the matching keycard.<\/td><\/tr>\n<tr><td>Thing<\/td><td>T<\/td><td>Place whatever is chosen in the Things tab.<\/td><\/tr>\n<tr><td>Start<\/td><td>S<\/td><td>Set the player start. Tap it again to turn it 90\u00b0.<\/td><\/tr>\n<tr><td>Picker<\/td><td>I<\/td><td>Copy a cell's textures into your brushes.<\/td><\/tr><\/table>\n<p>Shortcuts: <kbd>Ctrl+Z<\/kbd>/<kbd>Ctrl+Y<\/kbd> undo/redo \u00b7 <kbd>Ctrl+C<\/kbd>/<kbd>X<\/kbd>/<kbd>V<\/kbd> copy/cut/paste an area \u00b7 <kbd>Del<\/kbd> delete \u00b7 <kbd>[<\/kbd> <kbd>]<\/kbd> cycle textures \u00b7 <kbd>0<\/kbd> fit \u00b7 <kbd>P<\/kbd> playtest \u00b7 <kbd>?<\/kbd> help \u00b7 <kbd>Esc<\/kbd> cancel.<\/p><\/section>\n\n<section id=\"h-build\"><h2>Building good levels<\/h2>\n<ul><li><b>Start with rooms.<\/b> The <b>Rooms<\/b> tab has 22 rotatable templates: rooms, corridors, stairs and buildings such as Bunker, Guard Tower, Mezzanine, Courtyard, Hangar and Server Room. Tap one, tap the map, and press <kbd>R<\/kbd> or \u27f3 to rotate.<\/li>\n<li><b>Connect rooms with doors.<\/b> Use a plain door for flow and keycard doors to gate progress. Put the key somewhere the player must fight through.<\/li>\n<li><b>Use height.<\/b> Catwalks and raised platforms give enemies firing positions, and stairs let the player reach them.<\/li>\n<li><b>Light it.<\/b> Coloured light fixtures (Things \u2192 Light) set the mood. Flickering lights make horror corners. Keep the level's ambient light low for a gritty look.<\/li>\n<li><b>Give cover.<\/b> Crates, sandbags and barrels block bullets. The smarter enemies hide behind them, and barrels explode.<\/li>\n<li><b>Check it.<\/b> Menu \u2192 <b>Check level<\/b> confirms the exit can be reached and that keys come before their doors.<\/li><\/ul><\/section>\n\n<section id=\"h-things\"><h2>Enemies, items and props<\/h2>\n<table><tr><th>Enemy<\/th><th>Behaviour<\/th><\/tr>\n<tr><td>Soldier<\/td><td>Fast rifleman. Strafes while reloading, flanks, and calls in nearby allies.<\/td><\/tr>\n<tr><td>Gun Drone<\/td><td>Hovering, fast and fragile. Hard to hit.<\/td><\/tr>\n<tr><td>Heavy Walker<\/td><td>Slow armoured walker that fires 3-shot bursts.<\/td><\/tr>\n<tr><td>Sentry Turret<\/td><td>Never moves. Rapid fire with long sight lines.<\/td><\/tr>\n<tr><td>Titan (Boss)<\/td><td>Huge HP and twin rockets. Explodes when it dies.<\/td><\/tr><\/table>\n<p><b>How enemies think:<\/b> they stand idle until they <b>see<\/b> you (line of sight, roughly in front of them) or <b>hear<\/b> you (gunfire carries far; running footsteps carry a short way). An alerted enemy radios nearby allies. In a fight they strafe between shots, some swing wide to flank, and badly hurt ones run to cover and pop back out. They path around walls and open plain doors themselves. Difficulty (Easy / Normal / Hard, in game Settings) changes their health, damage, fire rate, speed and reaction time.<\/p>\n<p><b>Pickups:<\/b> health, medkit, armor, ammo (bullets, shells, cells, rockets), weapon pickups (shotgun, rifle, plasma, rockets; you start with the wrench and pistol), the three keycards, and data chips (secrets). <b>Props:<\/b> crates, barrels (explosive), lockers, server racks, terminals, desks, pillars, generators, sandbags, lamps, cones and debris.<\/p><\/section>\n\n<section id=\"h-play\"><h2>Playing<\/h2>\n<table><tr><th><\/th><th>Keyboard &amp; mouse<\/th><th>Touch<\/th><\/tr>\n<tr><td>Move<\/td><td>WASD \u00b7 Shift to run<\/td><td>Drag anywhere on the left half<\/td><\/tr>\n<tr><td>Look<\/td><td>Mouse (click the game to lock the pointer, or drag if your browser blocks that)<\/td><td>Drag on the right half<\/td><\/tr>\n<tr><td>Shoot<\/td><td>Left click<\/td><td>Hold FIRE (drag it to aim)<\/td><\/tr>\n<tr><td>Reload<\/td><td>R (reloads automatically when empty)<\/td><td>RLD<\/td><\/tr>\n<tr><td>Use / open<\/td><td>E<\/td><td>USE<\/td><\/tr>\n<tr><td>Jump<\/td><td>Space<\/td><td>JUMP<\/td><\/tr>\n<tr><td>Weapons<\/td><td>1\u20136, Q or mouse wheel<\/td><td>SWAP<\/td><\/tr>\n<tr><td>Map \u00b7 flashlight \u00b7 pause<\/td><td>M \u00b7 F \u00b7 Esc<\/td><td>Buttons at the top<\/td><\/tr><\/table>\n<p><b>Weapons:<\/b> Wrench (melee), Pulse Cannon (default starting gun, infinite ammo, automatic cyan pulses, tight spread), Combat Shotgun (6 shells, spread), Assault Rifle (30 rounds, automatic), Plasma Caster (40 cells, projectiles) and Rocket Launcher (1 rocket, big splash). The HUD shows <i>loaded / reserve<\/i> ammo, or \u221e when a gun does not use ammo. Touch aim assist is on by default; you can change its strength in Game settings.<\/p><\/section>\n\n<section id=\"h-levelprops\"><h2>Level settings &amp; music<\/h2>\n<p>The <b>Level<\/b> tab sets the name, sky (Night City, Red Dusk, Overcast, Toxic Haze, Black Void), fog, ambient light, wall height, default textures, par time and music. <b>Music:<\/b> pick <i>Playlist<\/i> to shuffle the bundled tracks, a single track, or <i>Synth ambient<\/i>, the built-in generative music that works offline. During play, open Pause \u2192 <b>Music player<\/b> to switch tracks and see their credits. To add your own music, put MP3s in <code>assets/music/<\/code> and list them in <code>MUSIC_TRACKS<\/code> near the top of <code>app.js<\/code>. Only use music you have the rights to, and credit it.<\/p><\/section>\n\n<section id=\"h-script\"><h2>Level scripting<\/h2>\n<p>Menu \u2192 Code editor \u2192 <b>script.js<\/b>. Scripts react to events: <code>start<\/code>, <code>tick<\/code>(dt), <code>kill<\/code>(type), <code>pickup<\/code>(type), <code>door<\/code>, <code>use<\/code>({x,y}) and <code>exit<\/code>.<\/p>\n<pre>api.on('start', () =&gt; api.message('Find the red keycard.'));\napi.on('kill', () =&gt; { if (api.enemiesLeft() === 0) { api.message('Vault unlocked'); api.openDoor(20, 8); } });\napi.on('use', c =&gt; { if (c.x === 5 &amp;&amp; c.y === 9) api.giveAmmo('rockets', 2); });<\/pre>\n<p>API: <code>message(t)<\/code>, <code>heal(n)<\/code>, <code>giveArmor(n)<\/code>, <code>giveAmmo(type, n)<\/code>, <code>openDoor(x, y)<\/code>, <code>enemiesLeft()<\/code>, <code>kills()<\/code>, <code>time()<\/code>, <code>win()<\/code>, <code>sound(name)<\/code> and <code>player<\/code> {x, y, hp, armor, keys}.<\/p><\/section>\n\n<section id=\"h-share\"><h2>Saving, exporting &amp; publishing<\/h2>\n<ul><li><b>Projects:<\/b> Menu \u2192 Projects keeps named save slots in this browser.<\/li>\n<li><b>Backups:<\/b> Export project file (.json) and Import project file. Old DOOMFORGE projects and saves are imported automatically.<\/li>\n<li><b>Export game:<\/b> makes one .html file with your levels. The 3D models and music load from where RetroEngine is hosted. Offline, the game falls back to built-in models and synth music, so it always works.<\/li>\n<li><b>Publish:<\/b> put the whole <code>retroengine/<\/code> folder (with <code>assets/<\/code>) on any static host, such as GitHub Pages, Netlify or itch.io (HTML5), and share the link.<\/li><\/ul><\/section>\n\n<section id=\"h-sharemaps\"><h2>Sharing your maps<\/h2>\n<p>Send a single level to a friend in one of two ways. Find both in the <b>Level<\/b> tab under <i>Share this level<\/i>, or in the Menu.<\/p>\n<ul><li><b>Share link:<\/b> the whole level is compressed into the link itself (the part after <code>#map=<\/code>), so no server or account is needed. On a phone, the share sheet opens (Messages, WhatsApp, Discord\u2026). On a computer, the link is copied. Opening the link loads the level and drops you straight into Playtest. Press <i>Back to editor<\/i> to look at how it was built, and it is added to your project as a new level.<\/li>\n<li><b>Export .retro file:<\/b> a small file holding the level plus any custom models (including uploaded .glb files). Use it when a level is too big for a link (about 7 KB). RetroEngine tells you when that happens. To open one, use Menu \u2192 <b>Import level (.retro)<\/b>, or drag the file onto the editor. On phones you pick it from Files, Drive or Downloads.<\/li><\/ul>\n<p><b>Safety:<\/b> level scripts from other people are <b>switched off<\/b> when you import. The Level tab shows a warning, and you can review the code in <i>Edit level script<\/i> and press Apply to turn it on. Imported files are checked for size, map dimensions and valid entities. A whole project .json also works with Import level.<\/p>\n<p><b>Tip:<\/b> links only work for others when RetroEngine is hosted (for example on GitHub Pages). A copy opened from a file on your own device makes links that only work there.<\/p><\/section>\n\n<section id=\"h-mobile\"><h2>Phones &amp; tablets<\/h2>\n<ul><li>Works in Chrome, Samsung Internet, Firefox, Safari (iPhone/iPad) and in-app browsers. Everything is touch-first: no mouse, keyboard or pointer lock needed.<\/li>\n<li><b>Editor:<\/b> one finger uses the tool, two fingers pan and pinch-zoom the map. The <i>Panel<\/i> button opens the side panel as a sheet.<\/li>\n<li><b>Game:<\/b> use the <b>Full screen<\/b> button (where the browser supports it) to hide the address bar. Turn the phone sideways for the best view. Sound starts on your first tap (a phone rule).<\/li>\n<li><b>Graphics quality: Auto<\/b> (the default) picks settings for your device and lowers the resolution on the fly to keep the game smooth. Choose Low/Medium/High in Settings to fix it.<\/li>\n<li>If a phone can't run 3D (no WebGL), Playtest explains why and the editor keeps working. Try another browser, or turn off battery saver.<\/li><\/ul><\/section>\n\n<section id=\"h-models\"><h2>Custom 3D models<\/h2>\n<p>Project \u2192 <b>Custom 3D models<\/b> lets you replace any enemy or prop with your own <code>.glb<\/code> file or URL. Models are auto-scaled and placed on the floor. Animated models use clips named Idle, Walk/Run, Shoot/Attack, HitReact and Death. Use only CC0 or CC-BY models, credit the authors, and keep files under about 2 MB because uploads are stored in the project.<\/p><\/section>\n\n<section id=\"h-trouble\"><h2>Troubleshooting<\/h2>\n<ul><li><b>Black screen or \"needs Three.js\":<\/b> the 3D engine loads from a CDN the first time, so connect to the internet once.<\/li>\n<li><b>Enemies look like simple robots and the music is synth:<\/b> the asset pack couldn't load. That happens when the page is opened straight from a file (file://) with no internet. Open it through a web server, or from the hosted link.<\/li>\n<li><b>Mouse look doesn't lock:<\/b> some in-app browsers block pointer lock. Drag to look instead.<\/li>\n<li><b>Slow on a phone:<\/b> keep Graphics quality on Auto, or choose Low. Close other apps, and turn off battery saver (it limits the frame rate).<\/li>\n<li><b>Share link does nothing:<\/b> some in-app browsers block the share sheet and clipboard. Select the link text in the box and copy it, or export a .retro file.<\/li>\n<li><b>\"3D not available\":<\/b> the browser has WebGL turned off or blocked. Open the page in a full browser (not an in-app one) and enable hardware acceleration.<\/li>\n<li><b>Storage full:<\/b> browser storage is about 5\u201310 MB. Remove uploaded models, or export a JSON backup and start a new project.<\/li><\/ul><\/section>\n";
function openHelp(first) {
  const touch = matchMedia('(pointer: coarse)').matches;
  const quick = `<div class="help-steps">
    <div><i>1</i><span><b>Build.</b> Pick <b>Wall</b> or <b>Rect</b> in the tool bar and paint on the map. The <b>Build</b> tab has textures, door types and floor heights (stairs & catwalks).</span></div>
    <div><i>2</i><span><b>Stamp rooms.</b> Open <b>Rooms</b> for ready-made buildings: arena, server room, warehouse, bunker, guard tower and more. Tap one, then tap the map. Press ⟳ to rotate.</span></div>
    <div><i>3</i><span><b>Add things.</b> In <b>Things</b>, choose soldiers, drones, walkers, health, ammo, weapons, keys, props and lights. Every level needs a <b>Start</b> and an <b>Exit pad</b>.</span></div>
    <div><i>4</i><span><b>Play & share.</b> Press <b>Play</b> to test. <b>Export</b> makes a single .html game file. Your work autosaves in this browser.</span></div></div>
    <div class="keys">${touch ? '<span>1 finger</span><span>use the tool</span><span>2 fingers</span><span>pan & pinch-zoom</span><span>Panel button</span><span>show / hide the side panel</span>' : ''}
    <kbd>V H B F C U R G E D T S I</kbd><span>tools: select, pan, wall, floor, ceiling, height, rect, fill, erase, door, thing, start, picker</span>
    <kbd>Ctrl+Z / Ctrl+Y</kbd><span>undo / redo</span><kbd>Ctrl+C / X / V</kbd><span>copy, cut, paste an area (Select tool)</span><kbd>Del</kbd><span>delete selection</span>
    <kbd>Space + drag</kbd><span>pan · wheel = zoom · <kbd>0</kbd> fit</span><kbd>[ ]</kbd><span>previous / next texture</span><kbd>P</kbd><span>playtest</span><kbd>Esc</kbd><span>cancel</span></div>`;
  const manual = `<div class="help-doc">${HELP_HTML || '<p>Open help.html for the full manual.</p>'}</div>`;
  modal({ title: first ? 'Welcome to RetroEngine' : 'Help', wide: true,
    body: `<div class="help-tabs"><button class="tb sm accent" data-ht="quick">Quick start</button><button class="tb sm" data-ht="manual">Full manual</button><a class="tb sm" href="tutorial/" target="_blank" rel="noopener">Tutorial ↗</a><a class="tb sm" href="help.html" target="_blank" rel="noopener">help.html ↗</a></div>
      <div class="tut-cta"><div><b>New here?</b><span>Build and play your first level in about 5 minutes, step by step.</span></div><button class="tb primary" data-tut="1">Start tutorial</button></div>
      <div class="help-body">${quick}</div>`,
    buttons: [{ label: first ? 'Skip for now' : 'Close', value: 1 }],
    onOpen: (bk, close) => bk.addEventListener('click', e => {
      const t = e.target.closest('[data-ht]'); if (t) { $$('[data-ht]', bk).forEach(b => b.classList.toggle('accent', b === t)); $('.help-body', bk).innerHTML = t.dataset.ht === 'quick' ? quick : manual; $('.help-body', bk).scrollTop = 0; }
      if (e.target.closest('[data-tut]')) { close(0); startTutorial(); }
    }) });
  try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
}

/* ---------- interactive tutorial: "build your first level" (coach marks) ----------
   Each step highlights a control and waits until you have done the action (check()). */
ED.stats = { stamps: 0 };
const TUT = { i: -1, el: null, ring: null, timer: 0, base: null };
function tutCount(pred) { return L().ents.filter(pred).length; }
const TUT_STEPS = [
  { t: 'Your first level', d: 'We made you a fresh, empty level called <b>My First Level</b>. In the next few minutes you will build rooms, add enemies and play it. Tap <b>Next</b>.', aim: () => ({ el: $('[data-ta="next"]', TUT.el) }) },
  { t: 'Draw a room', d: 'Pick the <b>Rect</b> tool, then drag a rectangle on the map (follow the arrow). That builds a room with walls around it.', check: () => L().wall.filter(Boolean).length > TUT.base.walls + 6,
    aim: () => ED.tool !== 'rect' ? { el: '[data-tool="rect"]' } : tutDrag() },
  { t: 'Stamp a building', d: 'Open the <b>Rooms</b> library, tap any room (try <b>Bunker</b> or <b>Server Room</b>), then tap an empty part of the map to stamp it.', check: () => ED.stats.stamps > TUT.base.stamps,
    aim: () => ED.stamp ? tutCell((x, y, lv) => tutFree(lv, x, y, 3) ? 10 - Math.abs(x - lv.w * 0.65) - Math.abs(y - lv.h * 0.5) : null)
      : tutShown($('[data-tpl]')) ? { el: '[data-tpl]' } : { el: '[data-tool="rooms"]' } },
  { t: 'Add a door', d: 'Pick the <b>Door</b> tool and tap a wall between two rooms (the arrow shows a good spot).', check: () => L().kind.filter(Boolean).length > TUT.base.doors,
    aim: () => ED.tool !== 'door' ? { el: '[data-tool="door"]' } : tutCell((x, y, lv) => {
      const w = (a, b) => a < 0 || b < 0 || a >= lv.w || b >= lv.h || !!lv.wall[b * lv.w + a];
      if (!w(x, y) || lv.kind[y * lv.w + x] || isSpawnCell(x, y)) return null;
      if (x === 0 || y === 0 || x === lv.w - 1 || y === lv.h - 1) return (x === 0 || x === lv.w - 1) && (y === 0 || y === lv.h - 1) ? null : 0.5 - Math.abs(x - lv.w / 2) / 1000;
      return (!w(x - 1, y) && !w(x + 1, y)) || (!w(x, y - 1) && !w(x, y + 1)) ? 10 : 1; }) },
  { t: 'Place the player', d: 'Pick the <b>Start</b> tool and tap where the player should begin. Tap again to turn them.', check: () => L().spawn.x !== TUT.base.sx || L().spawn.y !== TUT.base.sy,
    aim: () => ED.tool !== 'spawn' ? { el: '[data-tool="spawn"]' } : tutFloor(d => d > 2.5 && d < 9 ? 10 - d : null) },
  { t: 'Add enemies', d: 'Pick the <b>Thing</b> tool. We selected the <b>Soldier</b>. Tap the map 2–3 times to place enemies (not too close to the start).', enter: () => { ED.brush.thing = { t: 'enemy', s: 'grunt' }; }, check: () => tutCount(e => e.t === 'enemy') >= TUT.base.enemies + 2,
    aim: () => ED.tool !== 'thing' ? { el: '[data-tool="thing"]' } : tutFloor((d, x, y) => d > 6 && !tutThingAt(x, y) ? 20 - Math.abs(d - 10) : null) },
  { t: 'Give the player supplies', d: 'Now we selected <b>Ammo</b>. Tap to drop a box or two near the start. You can pick health, armor and weapons in the <b>Things</b> tab.', enter: () => { ED.brush.thing = { t: 'pickup', s: 'ammo_bullets' }; if (ED.tool !== 'thing') setTool('thing'); }, check: () => tutCount(e => e.t === 'pickup') > TUT.base.pickups,
    aim: () => ED.tool !== 'thing' ? { el: '[data-tool="thing"]' } : tutFloor((d, x, y) => d > 1.2 && d < 4 && !tutThingAt(x, y) ? 10 - d : null) },
  { t: 'Add the exit', d: 'Every level needs a way out. We selected the <b>Exit pad</b>. Tap the far end of your level.', enter: () => { ED.brush.thing = { t: 'exit', s: '' }; if (ED.tool !== 'thing') setTool('thing'); }, check: () => tutCount(e => e.t === 'exit') > 0,
    aim: () => ED.tool !== 'thing' ? { el: '[data-tool="thing"]' } : tutFloor((d, x, y) => !tutThingAt(x, y) ? d : null) },
  { t: 'Play it!', d: 'Press <b>Play</b>. Fight to the exit pad. Use WASD + mouse, or the touch sticks. Come back with Pause → Back to editor.', check: () => TUT.played, aim: () => ({ el: '[data-cmd="play"]' }) },
  { t: 'You made a game', d: 'Nice work! Next steps: add lights and props, try keycard doors, set the sky and music in the <b>Level</b> tab, then share it: the <b>Level</b> tab → <b>Share link</b> sends the level in a link that opens straight into the game, and <b>Export</b> makes a playable .html. Help (Menu → Help) has the full manual.', aim: () => ({ el: '[data-cmd="export"]' }) }
];
/* --- tutorial pointer helpers: aim at the exact element or map cell the player must touch next --- */
function tutShown(el) { // visible on screen and not covered by something else
  if (!el) return false; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false;
  const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
  const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t));
}
function tutCellXY(x, y) { const D = ED.view, r = $('#grid').getBoundingClientRect(); return [r.left + D.ox + (x + 0.5) * D.cs, r.top + D.oy + (y + 0.5) * D.cs]; }
function tutOnMap(x, y) { const p = tutCellXY(x, y); if (p[0] < 0 || p[1] < 0 || p[0] > innerWidth || p[1] > innerHeight) return false; const t = document.elementFromPoint(p[0], p[1]); return !!t && t.id === 'grid'; }
function tutFree(lv, x, y, r) { for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) { if (i < 1 || j < 1 || i >= lv.w - 1 || j >= lv.h - 1 || lv.wall[j * lv.w + i]) return false; } return true; }
function tutThingAt(x, y) { return (L().ents || []).some(e => Math.floor(e.x) === x && Math.floor(e.y) === y); }
function tutCell(score) { // best visible map cell by score(x, y, lv); null score = not allowed
  const lv = L(); let best = null, bs = -1e9;
  for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) { const s = score(x, y, lv); if (s == null || s <= bs || !tutOnMap(x, y)) continue; bs = s; best = [x, y]; }
  return best ? { cell: best } : (document.body.classList.contains('sheet') ? { el: '[data-cmd="sheet"]' } : null);
}
function tutFloor(f) { const lv = L(), sp = lv.spawn; return tutCell((x, y) => lv.wall[y * lv.w + x] ? null : f(Math.hypot(x + 0.5 - sp.x, y + 0.5 - sp.y), x, y)); }
function tutDrag() { // an empty patch to drag a rectangle across
  const lv = L(); let a = null;
  for (const sz of [6, 5, 4, 3]) { const c = tutCell((x, y) => x + sz < lv.w - 1 && y + sz < lv.h - 1 && tutFree(lv, x + (sz >> 1), y + (sz >> 1), sz >> 1) && tutOnMap(x + sz, y + sz) ? -Math.abs(x - 3) - Math.abs(y - 4) : null); if (c && c.cell) { a = c.cell; a.push(sz); break; } }
  return a ? { cell: [a[0], a[1]], to: [a[0] + a[2], a[1] + a[2]] } : tutCell((x, y) => lv.wall[y * lv.w + x] ? null : 0);
}
const TUT_ARROW = '<svg viewBox="0 0 24 32" width="30" height="40" aria-hidden="true"><path d="M2 2 L2 25 L8 19.5 L12 29 L16.5 27 L12.5 18 L20.5 18 Z" fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>';
function startTutorial() {
  stopTutorial();
  ED.project.levels.push(blankLevel('My First Level', 28, 20)); switchLevel(ED.project.levels.length - 1); fitView();
  TUT.played = false; TUT.el = document.createElement('div'); TUT.el.id = 'tut'; TUT.ring = document.createElement('div'); TUT.ring.id = 'tut-ring';
  TUT.hand = document.createElement('div'); TUT.hand.id = 'tut-hand'; TUT.hand.innerHTML = `<div class="mv"><div class="fl"><div class="bob">${TUT_ARROW}</div></div></div>`;
  document.body.appendChild(TUT.ring); document.body.appendChild(TUT.el); document.body.appendChild(TUT.hand);
  TUT.el.addEventListener('click', e => { const a = e.target.closest('[data-ta]'); if (!a) return; const v = a.dataset.ta; if (v === 'next' || v === 'skip') tutGo(TUT.i + 1); else if (v === 'back') tutGo(TUT.i - 1); else stopTutorial(); });
  TUT.onAct = () => { TUT.act = Date.now(); }; TUT.onResize = () => setTimeout(tutTick, 60);
  document.addEventListener('pointerdown', TUT.onAct, true); document.addEventListener('keydown', TUT.onAct, true);
  window.addEventListener('resize', TUT.onResize); window.addEventListener('orientationchange', TUT.onResize);
  tutGo(0); TUT.timer = setInterval(tutTick, 250);
}
function tutGo(i) {
  if (i >= TUT_STEPS.length) { stopTutorial(); toast('Tutorial complete — have fun building!', 'ok'); return; }
  TUT.i = Math.max(0, i); const st = TUT_STEPS[TUT.i], lv = L();
  TUT.base = { walls: lv.wall.filter(Boolean).length, doors: lv.kind.filter(Boolean).length, stamps: ED.stats.stamps, sx: lv.spawn.x, sy: lv.spawn.y, enemies: tutCount(e => e.t === 'enemy'), pickups: tutCount(e => e.t === 'pickup') };
  if (st.enter) st.enter();
  TUT.act = TUT.t0 = Date.now(); TUT.lastEl = null;
  TUT.el.innerHTML = `<div class="tut-top"><span class="tut-n">Step ${TUT.i + 1} of ${TUT_STEPS.length}</span><button class="tut-x" data-ta="close" title="Close tutorial">✕</button></div><h3>${st.t}</h3><p>${st.d}</p>
    <div class="tut-dots">${TUT_STEPS.map((_, k) => `<i class="${k < TUT.i ? 'done' : k === TUT.i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="tut-btns">${TUT.i ? '<button class="tb sm" data-ta="back">Back</button>' : ''}<span class="tut-wait">${st.check ? 'Waiting for you…' : ''}</span><button class="tb sm" data-ta="skip" hidden>Skip step</button><button class="tb sm primary" data-ta="next" ${st.check ? 'disabled' : ''}>${TUT.i === TUT_STEPS.length - 1 ? 'Finish' : 'Next'}</button></div>`;
  tutTick();
}
function tutTick() {
  if (!TUT.el) return; const st = TUT_STEPS[TUT.i];
  const playing = $('#play-host').classList.contains('on'); if (playing) TUT.played = true;
  const hide = playing || !!$('.modal-back');
  TUT.el.style.display = TUT.ring.style.display = TUT.hand.style.display = hide ? 'none' : '';
  const nb = $('[data-ta="next"]', TUT.el), sk = $('[data-ta="skip"]', TUT.el);
  if (st.check && nb && nb.disabled && st.check()) { nb.disabled = false; if (sk) sk.hidden = true; const w = $('.tut-wait', TUT.el); w.textContent = '✓ Done!'; w.classList.add('ok'); Sound_ok(); setTimeout(() => { if (TUT_STEPS[TUT.i] === st) tutGo(TUT.i + 1); }, 900); }
  const now = Date.now(), idle = now - (TUT.act || now) > 6000;
  if (sk && nb && nb.disabled && now - TUT.t0 > 25000 && idle) sk.hidden = false; // never trap the player on a step
  if (hide) return;
  // where should the player touch next?
  let a = null; try { a = st.aim && st.aim(); } catch (e) { a = null; }
  let rect = null, tip = null, to = null;
  if (a && a.el) {
    let el = typeof a.el === 'string' ? $(a.el) : a.el;
    if (el && !tutShown(el) && el !== TUT.lastEl && el.scrollIntoView) { el.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    if (el) TUT.lastEl = el;
    if (el && !el.getBoundingClientRect().width) el = $('[data-cmd="menu"]'); // hidden inside a collapsed menu: point at its opener
    if (el) { const r = el.getBoundingClientRect(); rect = { l: r.left, t: r.top, w: r.width, h: r.height }; tip = [r.left + r.width * 0.62, r.top + r.height * 0.62]; }
  } else if (a && a.cell) {
    const cs = ED.view.cs, p = tutCellXY(a.cell[0], a.cell[1]); rect = { l: p[0] - cs / 2, t: p[1] - cs / 2, w: cs, h: cs }; tip = p;
    if (a.to) to = tutCellXY(a.to[0], a.to[1]);
  }
  if (rect) Object.assign(TUT.ring.style, { left: rect.l - 4 + 'px', top: rect.t - 4 + 'px', width: rect.w + 8 + 'px', height: rect.h + 8 + 'px', opacity: 1 });
  else TUT.ring.style.opacity = 0;
  const H = TUT.hand;
  if (!tip) { H.style.opacity = 0; return; }
  H.style.opacity = 1; H.style.left = tip[0] + 'px'; H.style.top = tip[1] + 'px';
  // flip the arrow so it stays on screen (it points up-left by default, body below-right of the tip)
  H.classList.toggle('fx', tip[0] > innerWidth - 44); H.classList.toggle('fy', tip[1] > innerHeight - 56);
  H.classList.toggle('idle', idle); H.classList.toggle('drag', !!to);
  if (to) { H.style.setProperty('--dx', to[0] - tip[0] + 'px'); H.style.setProperty('--dy', to[1] - tip[1] + 'px'); }
  H.dataset.x = Math.round(tip[0]); H.dataset.y = Math.round(tip[1]); if (to) { H.dataset.tx = Math.round(to[0]); H.dataset.ty = Math.round(to[1]); } else { delete H.dataset.tx; delete H.dataset.ty; }
}
function Sound_ok() { try { RT.Sound.init(); RT.Sound.play('pickup'); } catch (e) {} }
function stopTutorial() {
  clearInterval(TUT.timer); if (TUT.el) TUT.el.remove(); if (TUT.ring) TUT.ring.remove(); if (TUT.hand) TUT.hand.remove();
  if (TUT.onAct) { document.removeEventListener('pointerdown', TUT.onAct, true); document.removeEventListener('keydown', TUT.onAct, true); window.removeEventListener('resize', TUT.onResize); window.removeEventListener('orientationchange', TUT.onResize); }
  TUT.el = TUT.ring = TUT.hand = TUT.onAct = null; TUT.i = -1;
}

/* ---------- top bar commands ---------- */
$('#topbar').addEventListener('click', e => {
  const b = e.target.closest('[data-cmd]'); if (b) runCmd(b.dataset.cmd);
});
$('#zoom-dock').addEventListener('click', e => { const b = e.target.closest('[data-cmd]'); if (b) runCmd(b.dataset.cmd); });
$('#btn-project').addEventListener('click', openProjects);
function runCmd(c) {
  if (c === 'undo') undo(); else if (c === 'redo') redo(); else if (c === 'play') playtest(); else if (c === 'export') openExport(); else if (c === 'menu') openMenu();
  else if (c === 'zoomIn') setZoom(ED.view.cs * 1.25); else if (c === 'zoomOut') setZoom(ED.view.cs / 1.25); else if (c === 'fit') fitView();
  else if (c === 'sheet') document.body.classList.toggle('sheet');
}

/* ---------- start the editor ---------- */
function boot() {
  try { const s = localStorage.getItem(AUTOSAVE_KEY); ED.project = s ? normalizeProject(JSON.parse(s)) : starterProject(); }
  catch (e) { console.warn('RetroEngine: autosave unreadable, loading starter project', e); ED.project = starterProject(); }
  buildToolbar(); setTool('select'); updateProjectBtn(); refreshLevelSelect(); renderPanel(); updateUndoBtns();
  resizeCanvas(); fitView(); updateStatus();
  const sp = document.getElementById('splash'); if (sp) { sp.style.opacity = '0'; setTimeout(() => sp.remove(), 450); }
  window.addEventListener('resize', () => { resizeCanvas(); });
  if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe($('#stage'));
  // phones: address bar / rotation / keyboard change the visible area; iOS ignores user-scalable=no, so block page pinch
  const later = () => { resizeCanvas(); setTimeout(resizeCanvas, 300); };
  window.addEventListener('orientationchange', later); if (window.visualViewport) window.visualViewport.addEventListener('resize', later);
  ['gesturestart', 'gesturechange'].forEach(e => document.addEventListener(e, ev => ev.preventDefault(), { passive: false }));
  let seen = false; try { seen = !!localStorage.getItem(SEEN_KEY); } catch (e) {}
  if (/^#map=/.test(location.hash)) openFromHash(); else if (/^#pack=/.test(location.hash)) openFromPack(); else if (!seen) openHelp(true);
  // Debug / test hook (used by the automated tests)
  window.RETROENGINE = window.DOOMFORGE_IDE = { packLevel, unpackLevel, encodeMap, decodeMap, inflateRaw, shareLink, exportLevelFile, importLevelText, openFromHash, openFromPack, ED, RT, L, setTool, startTutorial, stopTutorial, tutGo, openHelp, openAbout, get tut() { return TUT; }, placeStamp, startStamp, playtest, stopPlaytest, buildStandaloneHtml, loadProject, normalizeProject, undo, redo, regionData, fitView, get play() { return playHandle; }, TEMPLATES, tplData, autosave };
}
if (!window.THREE) { document.body.innerHTML = '<p style="padding:20px;color:#fff;font:15px sans-serif">RetroEngine needs Three.js from the internet (cdnjs). Connect to the internet and reload.</p>'; }
else boot();
})();
