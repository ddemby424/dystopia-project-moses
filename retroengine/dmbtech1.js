/* =====================================================================
   DMB Tech 1 v1.1.0 — standalone first-person engine for the browser.
   ES module. Peer dependency: Three.js r128 (do not bundle).
   See README.md for the public API, .retro format, and import map.
   DMB Tech 1 — Darcy D. Demby, Chief Software Architect,
   DembySoftwareSystems. Making cool tools with AI...
   ===================================================================== */
import * as THREE_NS from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'three/addons/utils/SkeletonUtils.js';
// Module namespace objects are immutable; the runtime attaches loaders on THREE like the classic build did.
const THREE = Object.assign({}, THREE_NS, { GLTFLoader, SkeletonUtils });

export const VERSION = '1.1.0';

export function createRuntime() {
'use strict';
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
const DEFAULT_SETTINGS = { sens: 1.25, invertY: false, fov: 75, volume: 0.8, sfx: 0.9, music: 0.5, quality: 'auto', showFps: false, touchScale: 1.0, bob: true, difficulty: 'normal', haptics: true, aimAssist: 0.80, aimAssistMouse: false, playerModel: 'george' };
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
  door_yellow:  { name: 'Yellow Key Door', rough: 0.64, metal: 0.55, bump: 2.2, glow: true, door: true },
  sidewalk:        { name: 'Sidewalk',          rough: 0.93, metal: 0.0,  bump: 2.4 },
  curb:            { name: 'Curb',              rough: 0.9,  metal: 0.0,  bump: 2.8 },
  fence:           { name: 'Chain-Link Fence',  rough: 0.55, metal: 0.7,  bump: 1.6, alpha: true },
  brick_weathered: { name: 'Weathered Brick',   rough: 0.92, metal: 0.0,  bump: 3.4 },
  asphalt_lines:   { name: 'Asphalt (Lines)',   rough: 0.95, metal: 0.0,  bump: 2.4 },
  riveted:         { name: 'Riveted Bulkhead',  rough: 0.7,  metal: 0.55, bump: 3.0 },
  vent:            { name: 'Vent Grille',       rough: 0.62, metal: 0.65, bump: 3.2 },
  stained:         { name: 'Stained Concrete',  rough: 0.96, metal: 0.0,  bump: 2.6 },
  chevron:         { name: 'Hazard Chevrons',   rough: 0.7,  metal: 0.25, bump: 1.8 },
  lab_panel:       { name: 'Lab Wall Panels',   rough: 0.42, metal: 0.08, bump: 1.2, clean: true },
  office_wall:     { name: 'Office Wall',       rough: 0.55, metal: 0.0,  bump: 1.0, clean: true },
  med_wall:        { name: 'Med-Bay Wall',      rough: 0.45, metal: 0.05, bump: 1.3, clean: true },
  polished_tile:   { name: 'Polished Tile',     rough: 0.22, metal: 0.05, bump: 1.4, clean: true },
  clean_metal:     { name: 'Brushed Aluminium', rough: 0.35, metal: 0.7,  bump: 1.6, clean: true },
  bright_panel:    { name: 'Bright Ceiling Lights', rough: 0.35, metal: 0.08, bump: 0.8, glow: true, clean: true }
};
const WALL_TEXTURES = ['concrete', 'concrete_dark', 'brick', 'brick_weathered', 'metal_panel', 'tech', 'rust', 'hazard', 'tile', 'tile_dark', 'wood', 'server', 'grate', 'plate', 'fence', 'sidewalk', 'curb', 'riveted', 'vent', 'stained', 'lab_panel', 'office_wall', 'med_wall', 'clean_metal'];
const FLOOR_TEXTURES = ['concrete', 'tile', 'tile_dark', 'plate', 'grate', 'asphalt', 'asphalt_lines', 'sidewalk', 'curb', 'wood', 'rust', 'metal_panel', 'hazard', 'concrete_dark', 'brick', 'brick_weathered', 'stained', 'chevron', 'polished_tile', 'clean_metal', 'lab_panel'];
const CEIL_TEXTURES = ['ceiling', 'light_panel', 'bright_panel', 'concrete', 'metal_panel', 'grate', 'rust', 'concrete_dark', 'clean_metal', 'lab_panel', 'sky'];

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
    asphalt: [46, 46, 48], asphalt_lines: [46, 46, 48], sidewalk: [126, 124, 116], curb: [132, 128, 118],
    fence: [70, 74, 76], brick_weathered: [118, 48, 36], wood: [112, 78, 46], ceiling: [128, 128, 122], light_panel: [100, 102, 104], server: [26, 28, 32],
    door: [84, 88, 92], door_red: [84, 80, 80], door_blue: [78, 84, 92], door_yellow: [88, 86, 76],
    riveted: [86, 90, 96], vent: [58, 62, 66], stained: [86, 80, 70], chevron: [64, 64, 62],
    lab_panel: [214, 218, 222], office_wall: [208, 206, 200], med_wall: [214, 222, 228],
    polished_tile: [200, 206, 212], clean_metal: [168, 174, 180], bright_panel: [230, 234, 238]
  }[id] || [100, 100, 100];
  for (let i = 0; i < S * S; i++) {
    let k = 0.75 + (n1[i] - 0.5) * 0.7 + (n2[i] - 0.5) * 0.35;
    if (id === 'rust') { const r2 = n2[i] > 0.62 ? 0.55 : 1; k *= r2; }
    if (id === 'asphalt' || id === 'asphalt_lines' || id === 'concrete' || id === 'concrete_dark' || id === 'sidewalk' || id === 'curb' || id === 'stained') { if (Math.random() < 0.06) k *= 0.75 + Math.random() * 0.5; }
    d[i * 4] = clamp(base[0] * k, 0, 255); d[i * 4 + 1] = clamp(base[1] * k, 0, 255); d[i * 4 + 2] = clamp(base[2] * k, 0, 255); d[i * 4 + 3] = (id === 'fence') ? 0 : 255;
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
    case 'sidewalk':
      // Large worn concrete slabs with dark seams, cracks, and oil stains.
      line(0, 0, 64, 0, 'rgba(30,28,24,.8)', 2.2); line(0, 32, 64, 32, 'rgba(30,28,24,.75)', 2.0);
      line(0, 0, 0, 64, 'rgba(30,28,24,.8)', 2.2); line(32, 0, 32, 64, 'rgba(30,28,24,.7)', 1.8);
      line(1, 1, 63, 1, 'rgba(255,255,255,.08)', 0.7); line(1, 33, 63, 33, 'rgba(255,255,255,.06)', 0.6);
      for (let i = 0; i < 5; i++) { let x = 4 + R() * 56, y = 4 + R() * 56; c.strokeStyle = 'rgba(25,22,18,.45)'; c.lineWidth = u * 0.7; c.beginPath(); c.moveTo(x * u, y * u); for (let j = 0; j < 7; j++) { x += rand(-6, 6); y += rand(1, 6); c.lineTo(x * u, y * u); } c.stroke(); }
      for (let i = 0; i < 4; i++) rect(R() * 64, R() * 64, 6 + R() * 10, 3 + R() * 5, 'rgba(20,18,12,.18)');
      for (let i = 0; i < 8; i++) rect(R() * 64, 0, 1 + R(), 64, 'rgba(30,25,20,.07)');
      break;
    case 'curb':
      // Concrete lip: darker gutter at the bottom, worn painted edge, chips.
      rect(0, 40, 64, 24, 'rgba(20,20,18,.35)');
      rect(0, 28, 64, 8, 'rgba(200, 190, 60, .28)');
      line(0, 28, 64, 28, 'rgba(40,36,20,.7)', 1.2);
      line(0, 36, 64, 36, 'rgba(255,255,255,.1)', 0.7);
      line(0, 18, 64, 18, 'rgba(0,0,0,.25)', 1.0);
      for (let i = 0; i < 10; i++) rect(R() * 64, 26 + R() * 10, 2 + R() * 4, 1 + R() * 2, 'rgba(40,40,30,.45)');
      for (let i = 0; i < 6; i++) { let x = R() * 64, y = R() * 28; c.strokeStyle = 'rgba(20,20,18,.4)'; c.lineWidth = u * .5; c.beginPath(); c.moveTo(x * u, y * u); c.lineTo((x + rand(-8, 8)) * u, (y + rand(2, 8)) * u); c.stroke(); }
      break;
    case 'fence': {
      // See-through chain-link with rusted posts and razor wire along the top (alpha-tested).
      c.clearRect(0, 0, S, S);
      const steel = 'rgba(150, 156, 152, 0.95)', rust = 'rgba(120, 70, 36, 0.9)', dark = 'rgba(40, 42, 44, 0.95)';
      // posts
      rect(0, 0, 5, 64, dark); rect(59, 0, 5, 64, dark);
      rect(1, 0, 3, 64, steel); rect(60, 0, 3, 64, steel);
      for (let y = 8; y < 64; y += 16) { rivet(2, y); rivet(61, y); }
      // mid and top rails
      rect(0, 20, 64, 2.2, dark); rect(0, 20.4, 64, 1.2, steel);
      rect(0, 10, 64, 2.4, dark); rect(0, 10.4, 64, 1.2, rust);
      // diamond mesh
      c.strokeStyle = 'rgba(170, 176, 172, 0.92)'; c.lineWidth = Math.max(1, 0.9 * u);
      c.beginPath();
      for (let y = -8; y < 72; y += 8) {
        for (let x = -8; x < 72; x += 8) {
          const odd = ((x + y) / 8) & 1;
          if (odd) continue;
          c.moveTo((x + 4) * u, y * u); c.lineTo((x + 8) * u, (y + 4) * u);
          c.lineTo((x + 4) * u, (y + 8) * u); c.lineTo(x * u, (y + 4) * u); c.closePath();
        }
      }
      c.stroke();
      // razor-wire coils along the top
      c.strokeStyle = 'rgba(190, 196, 188, 0.95)'; c.lineWidth = Math.max(1, 1.1 * u);
      for (let x = 6; x < 58; x += 6) {
        c.beginPath(); c.arc((x + 3) * u, 6 * u, 3.2 * u, 0, 7); c.stroke();
        c.beginPath(); c.moveTo((x + 1) * u, 3 * u); c.lineTo((x + 5) * u, 9 * u); c.stroke();
        c.beginPath(); c.moveTo((x + 5) * u, 3 * u); c.lineTo((x + 1) * u, 9 * u); c.stroke();
      }
      break;
    }
    case 'brick_weathered':
      // Outdoor red brick: irregular mortar, spalled corners, dirt streaks.
      for (let row = 0; row < 8; row++) {
        const off = (row % 2) * 8;
        line(0, row * 8, 64, row * 8, 'rgba(70, 62, 52, .95)', 1.6);
        for (let b = 0; b < 5; b++) {
          const x = (b * 16 + off) % 64;
          line(x, row * 8, x, row * 8 + 8, 'rgba(70, 62, 52, .95)', 1.6);
          const rr = 90 + R() * 70 | 0, gg = 28 + R() * 28 | 0, bb = 22 + R() * 16 | 0;
          rect(x + 1, row * 8 + 1, 14, 6, `rgba(${rr},${gg},${bb},${0.18 + R() * 0.22})`);
          if (R() < 0.2) rect(x + 1, row * 8 + 1, 3 + R() * 5, 2 + R() * 3, 'rgba(90,80,70,.35)'); // spall
        }
      }
      for (let i = 0; i < 7; i++) rect(R() * 64, 0, 1 + R() * 2, 64, 'rgba(20, 24, 16, .14)');
      rect(0, 48, 64, 16, 'rgba(10, 12, 8, .22)');
      break;
    case 'asphalt_lines':
      for (let i = 0; i < 120; i++) rect(R() * 64, R() * 64, 0.8, 0.8, `rgba(${150 + R() * 60 | 0},${150 + R() * 60 | 0},${150 + R() * 60 | 0},.35)`);
      // Worn painted lane / stall lines (faded white and yellow).
      rect(4, 2, 56, 3.2, 'rgba(230, 225, 200, .42)');
      rect(4, 30, 56, 2.4, 'rgba(210, 190, 50, .32)');
      rect(4, 58, 56, 3.2, 'rgba(230, 225, 200, .38)');
      for (let i = 0; i < 8; i++) rect(6 + i * 7, 12, 3, 14, 'rgba(230, 225, 200, .28)'); // stall ticks
      for (let i = 0; i < 18; i++) rect(R() * 64, R() * 64, 2 + R() * 6, 1 + R(), 'rgba(20,20,18,.35)'); // chips in the paint
      for (let i = 0; i < 4; i++) { let x = R() * 64, y = R() * 64; c.strokeStyle = 'rgba(15,15,15,.5)'; c.lineWidth = u * .6; c.beginPath(); c.moveTo(x * u, y * u); for (let j = 0; j < 6; j++) { x += rand(-8, 8); y += rand(2, 8); c.lineTo(x * u, y * u); } c.stroke(); }
      break;
    case 'riveted':
      // Heavy steel bulkhead plates with rows of rivets — industrial corridor walls.
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) {
        const x = col * 32, y = row * 16;
        rect(x + 1, y + 1, 30, 14, 'rgba(0,0,0,.22)');
        line(x, y, x + 32, y, 'rgba(0,0,0,.7)', 1.4);
        line(x, y, x, y + 16, 'rgba(0,0,0,.7)', 1.4);
        line(x + 1, y + 1, x + 31, y + 1, 'rgba(255,255,255,.16)', 0.7);
        [[4, 4], [16, 4], [28, 4], [4, 12], [16, 12], [28, 12]].forEach(p => rivet(x + p[0], y + p[1]));
      }
      break;
    case 'vent':
      rect(0, 0, 64, 64, 'rgba(0,0,0,.35)');
      line(0, 0, 64, 0, 'rgba(160,164,168,.55)', 2);
      line(0, 63, 64, 63, 'rgba(20,20,22,.8)', 2);
      for (let i = 0; i < 10; i++) {
        rect(3, 4 + i * 6, 58, 3.2, 'rgba(90,96,102,.9)');
        line(3, 4 + i * 6, 61, 4 + i * 6, 'rgba(200,205,210,.28)', 0.7);
        line(3, 7.2 + i * 6, 61, 7.2 + i * 6, 'rgba(0,0,0,.55)', 0.8);
      }
      rivet(3, 3); rivet(61, 3); rivet(3, 61); rivet(61, 61);
      break;
    case 'stained':
      line(0, 32, 64, 32, 'rgba(0,0,0,.3)', 0.8); line(32, 0, 32, 64, 'rgba(0,0,0,.22)', 0.6);
      for (let i = 0; i < 7; i++) { let x = R() * 64, y = R() * 64; c.strokeStyle = 'rgba(20,16,12,.45)'; c.lineWidth = u * .7; c.beginPath(); c.moveTo(x * u, y * u); for (let j = 0; j < 7; j++) { x += rand(-6, 6); y += rand(2, 8); c.lineTo(x * u, y * u); } c.stroke(); }
      for (let i = 0; i < 5; i++) rect(R() * 50, R() * 50, 8 + R() * 16, 6 + R() * 14, 'rgba(30, 22, 10, .28)'); // oil
      for (let i = 0; i < 8; i++) rect(R() * 64, 0, 1 + R() * 2.5, 64, 'rgba(20,16,10,.16)'); // streaks
      break;
    case 'chevron':
      for (let i = -2; i < 10; i++) {
        const y = i * 10;
        c.fillStyle = i % 2 ? 'rgba(220, 190, 30, .85)' : 'rgba(18, 18, 16, .88)';
        c.beginPath(); c.moveTo(0, y * u); c.lineTo(64 * u, (y + 20) * u); c.lineTo(64 * u, (y + 30) * u); c.lineTo(0, (y + 10) * u); c.closePath(); c.fill();
      }
      rect(0, 0, 64, 2, 'rgba(0,0,0,.35)');
      break;
    case 'lab_panel':
      for (let row = 0; row < 4; row++) for (let col = 0; col < 2; col++) {
        const x = col * 32, y = row * 16;
        rect(x + 1, y + 1, 30, 14, 'rgba(255,255,255,.28)');
        line(x, y, x + 32, y, 'rgba(140,148,156,.55)', 0.9);
        line(x, y, x, y + 16, 'rgba(140,148,156,.55)', 0.9);
        line(x + 1, y + 1, x + 31, y + 1, 'rgba(255,255,255,.55)', 0.6);
        rivet(x + 3, y + 3); rivet(x + 29, y + 3); rivet(x + 3, y + 13); rivet(x + 29, y + 13);
      }
      break;
    case 'office_wall':
      // Clean painted wall with a subtle dado rail and faint vertical joins.
      line(0, 44, 64, 44, 'rgba(150,148,142,.45)', 1.2);
      rect(0, 45, 64, 19, 'rgba(20,18,16,.06)');
      for (let i = 1; i < 4; i++) line(i * 16, 0, i * 16, 64, 'rgba(130,128,122,.2)', 0.6);
      break;
    case 'med_wall':
      // Pale clinical wall: large clean tiles above a darker wipe-down dado.
      for (let row = 0; row < 5; row++) {
        const off = (row % 2) * 10;
        line(0, row * 9, 64, row * 9, 'rgba(150,166,176,.45)', 0.8);
        for (let b = 0; b < 5; b++) line((b * 20 + off) % 64, row * 9, (b * 20 + off) % 64, row * 9 + 9, 'rgba(150,166,176,.4)', 0.8);
      }
      rect(0, 46, 64, 18, 'rgba(180, 198, 210, .35)');
      line(0, 46, 64, 46, 'rgba(120,140,155,.5)', 1.2);
      break;
    case 'polished_tile':
      for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
        const x = col * 16, y = row * 16;
        line(x, y, x + 16, y, 'rgba(90,100,110,.35)', 0.7);
        line(x, y, x, y + 16, 'rgba(90,100,110,.35)', 0.7);
        // soft highlight in the upper-left of each tile so the floor reads as polished
        rect(x + 1, y + 1, 7, 5, 'rgba(255,255,255,.22)');
        rect(x + 2, y + 2, 4, 2.5, 'rgba(255,255,255,.12)');
      }
      break;
    case 'clean_metal':
      for (let i = 0; i < 32; i++) rect(0, i * 2, 64, 1, i % 2 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)'); // brushed grain
      for (let i = 0; i <= 2; i++) { line(i * 32, 0, i * 32, 64, 'rgba(80,88,96,.4)', 1.0); line(0, i * 32, 64, i * 32, 'rgba(80,88,96,.35)', 0.8); }
      rivet(4, 4); rivet(32, 4); rivet(60, 4); rivet(4, 60); rivet(32, 60); rivet(60, 60);
      break;
    case 'bright_panel':
      for (let i = 0; i <= 2; i++) { rect(i * 32 - 1, 0, 2, 64, 'rgba(70,76,84,.75)'); rect(0, i * 32 - 1, 64, 2, 'rgba(70,76,84,.75)'); }
      glowRect(5, 5, 22, 22, '#ffffff'); glowRect(37, 5, 22, 22, '#ffffff');
      glowRect(5, 37, 22, 22, '#f4f8ff'); glowRect(37, 37, 22, 22, '#ffffff');
      break;
  }
  // 3) final grime pass: darken with large-scale noise so nothing looks clean & plastic
  // Clean lab / office / med-bay materials skip this so well-lit rooms stay bright.
  if (!def.clean) {
  const im2 = c.getImageData(0, 0, S, S), e = im2.data;
  for (let i = 0; i < S * S; i++) {
    if (e[i * 4 + 3] < 8) continue;
    const y = (i / S) | 0, k = 0.82 + n1[(i + S * 7) % (S * S)] * 0.28 - (y / S) * 0.06;
    e[i * 4] *= k; e[i * 4 + 1] *= k; e[i * 4 + 2] *= k;
  }
  c.putImageData(im2, 0, 0);
  }
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
  m.normalScale.set(0.9, 0.9); m.onBeforeCompile = aoShader; m.customProgramCacheKey = () => 'ao' + (def.alpha ? 'A' : '');
  if (def.alpha) { m.alphaTest = 0.5; m.transparent = false; m.side = THREE.DoubleSide; m.depthWrite = true; }
  if (cv.glow) { m.emissiveMap = canvasTex(cv.glow, true); m.emissive = new THREE.Color(0xffffff); m.emissiveIntensity = id === 'bright_panel' ? 0.8 : id === 'light_panel' ? 0.42 : 0.95; }
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
  sandbags:  { name: 'Sandbags',       solid: 0.42 },
  console:   { name: 'Control Console', solid: 0.4 },
  med_cabinet:{ name: 'Med Cabinet',    solid: 0.28 },
  lab_bench: { name: 'Lab Bench',      solid: 0.38 },
  vat:       { name: 'Chem Vat',       solid: 0.36 },
  fan:       { name: 'Industrial Fan', solid: 0.3 },
  extinguisher:{ name: 'Extinguisher', solid: 0.1 },
  vent:      { name: 'Vent Grille',    solid: 0.28 },
  shelves:   { name: 'Metal Shelves',  solid: 0.36 }
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
    case 'console': {
      const body = mat(0x2a3038, { metal: 0.55, rough: 0.45 }), pale = mat(0x4a5560, { metal: 0.5, rough: 0.4 });
      box(g, 0.95, 0.08, 0.55, pale, 0, 0.72, 0);
      box(g, 0.9, 0.64, 0.5, body, 0, 0.36, 0);
      box(g, 0.42, 0.28, 0.04, darkS, -0.22, 0.98, -0.08).rotation.x = -0.35;
      box(g, 0.38, 0.24, 0.01, glowMat(0x3ad0ff), -0.22, 0.98, -0.055).rotation.x = -0.35;
      box(g, 0.32, 0.22, 0.04, darkS, 0.24, 0.94, -0.06).rotation.x = -0.3;
      box(g, 0.28, 0.18, 0.01, glowMat(0x7cff6a), 0.24, 0.94, -0.04).rotation.x = -0.3;
      for (let i = 0; i < 6; i++) box(g, 0.05, 0.02, 0.05, i % 2 ? glowMat(0xffb020) : pale, -0.35 + i * 0.12, 0.78, 0.16);
      break;
    }
    case 'med_cabinet': {
      const white = mat(0xd8dee4, { metal: 0.15, rough: 0.35, noMap: true });
      box(g, 0.5, 1.15, 0.32, white, 0, 0.58, 0);
      box(g, 0.44, 0.5, 0.02, mat(0xb8c4cc, { metal: 0.2, rough: 0.25, noMap: true }), 0, 0.82, 0.16);
      box(g, 0.08, 0.02, 0.01, darkS, 0.14, 0.72, 0.17);
      box(g, 0.16, 0.03, 0.02, glowMat(0xff3b3b), 0, 1.08, 0.165); // red cross bar
      box(g, 0.03, 0.16, 0.02, glowMat(0xff3b3b), 0, 1.08, 0.165);
      box(g, 0.44, 0.4, 0.28, mat(0xc8d0d6, { metal: 0.2, rough: 0.4, noMap: true }), 0, 0.28, 0);
      break;
    }
    case 'lab_bench': {
      const top = mat(0xc8c2b6, { metal: 0.05, rough: 0.4, noMap: true }), leg = mat(0x3a4048, { metal: 0.6, rough: 0.4 });
      box(g, 1.05, 0.06, 0.5, mat(0x4a5560, { metal: 0.25, rough: 0.45, noMap: true }), 0, 0.62, 0);
      [[-0.46, -0.2], [0.46, -0.2], [-0.46, 0.2], [0.46, 0.2]].forEach(p => box(g, 0.05, 0.62, 0.05, leg, p[0], 0.31, p[1]));
      box(g, 0.22, 0.18, 0.18, mat(0x8aa0aa, { metal: 0.3, rough: 0.35, noMap: true }), -0.3, 0.76, 0); // sample box
      cyl(g, 0.04, 0.04, 0.16, 8, glowMat(0x7ec8ff), 0.1, 0.76, 0.05); // vial
      box(g, 0.2, 0.14, 0.02, glowMat(0x3ad0ff), 0.34, 0.76, -0.08).rotation.x = -0.2;
      break;
    }
    case 'vat': {
      const tank = mat(0x4a5850, { metal: 0.55, rough: 0.45 }), band = mat(0xc8a020, { metal: 0.3, rough: 0.5 });
      cyl(g, 0.32, 0.32, 0.95, 12, tank, 0, 0.5, 0);
      cyl(g, 0.33, 0.33, 0.08, 12, band, 0, 0.35, 0);
      cyl(g, 0.33, 0.33, 0.08, 12, band, 0, 0.72, 0);
      cyl(g, 0.12, 0.12, 0.08, 8, steel, 0, 1.02, 0);
      cyl(g, 0.04, 0.04, 0.3, 8, steel, 0.28, 1.0, 0).rotation.z = 0.6;
      box(g, 0.08, 0.1, 0.01, glowMat(0x9dff3a), 0, 0.55, 0.33);
      break;
    }
    case 'fan': {
      const cage = mat(0x3e4650, { metal: 0.65, rough: 0.4 });
      box(g, 0.16, 0.7, 0.16, darkS, 0, 0.35, 0);
      cyl(g, 0.34, 0.34, 0.08, 12, cage, 0, 0.85, 0).rotation.x = Math.PI / 2;
      cyl(g, 0.06, 0.06, 0.1, 8, steel, 0, 0.85, 0.02).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        const b = box(g, 0.08, 0.28, 0.02, steel, 0, 0.85, 0.04);
        b.rotation.z = i * Math.PI / 2; b.position.set(Math.cos(i * Math.PI / 2) * 0.12, 0.85, 0.04);
      }
      break;
    }
    case 'extinguisher': {
      const red = mat(0x9a1c18, { metal: 0.35, rough: 0.45 });
      cyl(g, 0.08, 0.09, 0.48, 10, red, 0, 0.3, 0);
      cyl(g, 0.03, 0.03, 0.12, 8, steel, 0.06, 0.58, 0).rotation.z = 0.7;
      box(g, 0.04, 0.06, 0.04, darkS, 0, 0.56, 0);
      box(g, 0.1, 0.04, 0.02, glowMat(0xffd21f), 0, 0.38, 0.085);
      break;
    }
    case 'vent': {
      box(g, 0.7, 0.45, 0.14, darkS, 0, 0.35, 0);
      for (let i = 0; i < 5; i++) box(g, 0.62, 0.03, 0.04, steel, 0, 0.18 + i * 0.08, 0.06);
      break;
    }
    case 'shelves': {
      box(g, 0.8, 0.05, 0.36, steel, 0, 0.08, 0);
      box(g, 0.8, 0.05, 0.36, steel, 0, 0.4, 0);
      box(g, 0.8, 0.05, 0.36, steel, 0, 0.72, 0);
      box(g, 0.06, 0.76, 0.36, darkS, -0.37, 0.38, 0);
      box(g, 0.06, 0.76, 0.36, darkS, 0.37, 0.38, 0);
      break;
    }
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
  } else if (idx === 5) { // rocket launcher
    cyl(inner, 0.07, 0.07, 0.6, 10, body, 0.02, 0.02, -0.2).rotation.x = Math.PI / 2; cyl(inner, 0.075, 0.075, 0.04, 10, acc, 0.02, 0.02, -0.5).rotation.x = Math.PI / 2;
    box(inner, 0.05, 0.13, 0.05, dark, 0, -0.1, -0.08).rotation.x = 0.3; box(inner, 0.03, 0.05, 0.1, dark, 0.02, 0.1, -0.18); mz = -0.52;
  } else { // custom slot from registerWeapon: a simple glowing rifle
    box(inner, 0.055, 0.07, 0.36, body, 0, 0, -0.14);
    cyl(inner, 0.014, 0.014, 0.22, 8, dark, 0, 0.01, -0.4).rotation.x = Math.PI / 2;
    box(inner, 0.045, 0.11, 0.05, dark, 0, -0.08, -0.02).rotation.x = 0.3;
    box(inner, 0.058, 0.01, 0.2, acc, 0, 0.042, -0.16); mz = -0.5;
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
function normalizeModel(scene, height, centered, spec) {
  spec = spec || {};
  const holder = new THREE.Group(), model = cloneSkinned(scene); holder.add(model);
  if (spec.rot) model.rotation.set(spec.rot[0] || 0, spec.rot[1] || 0, spec.rot[2] || 0);
  model.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(model); if (b.isEmpty()) return null;
  const size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  let s = (spec.h || height) / Math.max(size.y, 1e-4);
  if (spec.maxW) s = Math.min(s, spec.maxW / Math.max(size.x, size.z, 1e-4));
  if (spec.scale) s = spec.scale;
  model.scale.multiplyScalar(s);
  model.position.set(-c.x * s, centered ? -c.y * s : -b.min.y * s + (spec.lift || 0), -c.z * s);
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
  { id: 'griphop', file: 'assets/music/griphop.mp3', title: 'Griphop', artist: 'Kevin MacLeod', genre: 'Hip-hop', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100413' },
  { id: 'hitman', file: 'assets/music/hitman.mp3', title: 'Hitman', artist: 'Kevin MacLeod', genre: 'Industrial', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?Search=Hitman' },
  { id: 'volatile_reaction', file: 'assets/music/volatile_reaction.mp3', title: 'Volatile Reaction', artist: 'Kevin MacLeod', genre: 'Industrial rock', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?Search=Volatile+Reaction' },
  { id: 'industrial_revolution', file: 'assets/music/industrial_revolution.mp3', title: 'Industrial Revolution', artist: 'Kevin MacLeod', genre: 'Industrial', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?Search=Industrial+Revolution' },
  { id: 'crypto', file: 'assets/music/crypto.mp3', title: 'Crypto', artist: 'Kevin MacLeod', genre: 'Dark synth', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?Search=Crypto' },
  { id: 'danger_storm', file: 'assets/music/danger_storm.mp3', title: 'Danger Storm', artist: 'Kevin MacLeod', genre: 'Action industrial', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?Search=Danger+Storm' }
];
const LIGHT_PRESETS = {
  gritty:     { name: 'Gritty',         ambient: '#8a93a8', ambientI: 0.55, fogColor: '#0a0d14', fog: 0.045 },
  clean:      { name: 'Clean bright',   ambient: '#b4bec8', ambientI: 0.86, fogColor: '#3a424c', fog: 0.01 },
  emergency:  { name: 'Emergency red',  ambient: '#c04a3a', ambientI: 0.72, fogColor: '#1a0606', fog: 0.05 }
};

const HOSTED_BASE = 'https://ddemby424.github.io/dystopia-project-moses/retroengine/';
const ENEMY_CLIPS = { idle: ['Idle_Gun', 'Idle'], move: ['Run', 'Walk'], shoot: ['Gun_Shoot', 'Idle_Gun_Shoot', 'Shoot', 'Attack'], hit: ['HitRecieve', 'HitReact', 'HitRecieve_1'], death: ['Death', 'Dead'] };
const PLAYER_CLIPS = { idle: ['Idle_Gun', 'Idle_Gun_Pointing', 'Idle', 'Idle_Neutral'], move: ['Walk_Holding', 'Run_Holding', 'Walk', 'Run', 'Walk_Tall', 'Run_Tall'], shoot: ['Shoot', 'Gun_Shoot', 'Idle_Gun_Shoot', 'Punch'], hit: ['HitRecieve_1', 'HitRecieve', 'HitReact', 'HitRecieve_2'], death: ['Death', 'Dead'] };
// Third-person roster. GLBs are lazy-loaded in createRemotePlayer (and the picker never prefetches them).
const PLAYER_MODELS = {
  george: { id: 'george', name: 'George', src: 'assets/models/player_george.glb', h: 1.38, tintColor: '#3ec8ff', license: 'CC0 1.0' },
  leela:  { id: 'leela',  name: 'Leela',  src: 'assets/models/player_leela.glb',  h: 1.28, tintColor: '#ff8a28', license: 'CC0 1.0' },
  mike:   { id: 'mike',   name: 'Mike',   src: 'assets/models/player_mike.glb',   h: 1.32, tintColor: '#ff3d55', license: 'CC0 1.0' },
  stan:   { id: 'stan',   name: 'Stan',   src: 'assets/models/player_stan.glb',   h: 1.4,  tintColor: '#c8e222', license: 'CC0 1.0' },
  swat:   { id: 'swat',   name: 'SWAT',   src: 'assets/models/soldier_swat.glb',  h: 1.22, tintColor: '#b57cff', license: 'CC0 1.0' },
  scifi:  { id: 'scifi',  name: 'Sci Fi Character', src: 'assets/models/player_scifi.glb', h: 1.22, tintColor: '#ff4ad6', license: 'CC-BY' }
};

const ASSET_PACK = {
  enemy_grunt: { src: 'assets/models/soldier_swat.glb', h: 1.12, tint: 0.72 },
  enemy_drone: { src: 'assets/models/robot_flying_gun.glb', h: 0.46, tint: 0.7 },
  enemy_heavy: { src: 'assets/models/robot_legs_gun.glb', h: 1.3, tint: 0.62 },
  enemy_titan: { src: 'assets/models/robot_large_gun.glb', h: 1.45, tint: 0.55 },
  weapon_2: { src: 'assets/models/gun_shotgun.glb', len: 0.66 },
  weapon_3: { src: 'assets/models/gun_rifle.glb', len: 0.64 },
  weapon_4: { src: 'assets/models/gun_scifi_rifle.glb', len: 0.58 },
  weapon_5: { src: 'assets/models/gun_rocket.glb', len: 0.5, flip: true, off: [0.06, -0.05, 0.02] },
  // Environment props: Quaternius Sci-Fi Essentials Kit + Modular Sci-Fi MegaKit (Standard), CC0.
  // Procedural buildPropMesh stays visible until the GLB loads (and if it fails).
  prop_crate: { src: 'assets/models/prop_crate.glb', tint: 1, h: 0.7, maxW: 0.85 },
  prop_crate_tall: { src: 'assets/models/prop_crate_tall.glb', tint: 1, h: 1.05, maxW: 1.35 },
  prop_barrel: { src: 'assets/models/prop_barrel.glb', tint: 1, h: 0.75, maxW: 0.55 },
  prop_desk: { src: 'assets/models/prop_desk.glb', tint: 1, h: 0.75, maxW: 1.15 },
  prop_lab_bench: { src: 'assets/models/prop_lab_bench.glb', tint: 1, h: 0.7, maxW: 1.15 },
  prop_locker: { src: 'assets/models/prop_locker.glb', tint: 1, h: 1.4, maxW: 0.7 },
  prop_server: { src: 'assets/models/prop_server.glb', tint: 1, h: 1.4, maxW: 0.95 },
  prop_shelves: { src: 'assets/models/prop_shelves.glb', tint: 1, h: 0.95, maxW: 0.95 },
  prop_pillar: { src: 'assets/models/prop_pillar.glb', tint: 1, h: 1.5, maxW: 0.45 },
  prop_pipes: { src: 'assets/models/prop_pipes.glb', tint: 1, h: 1.5, maxW: 0.55 },
  prop_terminal: { src: 'assets/models/prop_terminal.glb', tint: 1, h: 1.05, maxW: 0.6 },
  prop_console: { src: 'assets/models/prop_console.glb', tint: 1, h: 1.15, maxW: 0.9 },
  prop_vat: { src: 'assets/models/prop_vat.glb', tint: 1, h: 1.0, maxW: 0.65 },
  prop_fan: { src: 'assets/models/prop_fan.glb', tint: 1, h: 0.85, maxW: 0.8 },
  prop_vent: { src: 'assets/models/prop_vent.glb', tint: 1, h: 0.7, maxW: 1.0, rot: [Math.PI / 2, 0, 0] }
};
function cloneSkinned(o) { return (THREE.SkeletonUtils && THREE.SkeletonUtils.clone) ? THREE.SkeletonUtils.clone(o) : o.clone(true); }
function findClip(anims, names) { for (const n of names) { const c = anims.find(a => a.name.split('|').pop().toLowerCase() === n.toLowerCase()); if (c) return c; } return null; }
function playHolderAnim(holder, name) {
  const ud = holder.userData, acts = ud.acts; if (!acts) return;
  if (!acts[name]) name = name === 'death' ? '' : (acts.idle ? 'idle' : (acts.move ? 'move' : ''));
  if (!name || ud.anim === name) return;
  const next = acts[name], prev = acts[ud.anim];
  next.reset(); next.setEffectiveWeight(1); next.setEffectiveTimeScale(name === 'move' ? 1.1 : 1); next.play();
  if (prev) prev.crossFadeTo(next, name === 'death' ? 0.1 : 0.2, false);
  ud.anim = name;
}
function applyTeamTint(root, hex) {
  const team = new THREE.Color(hex || '#ffffff');
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    o.material = o.material.clone();
    const m = o.material;
    if (m.color) m.color.lerp(team, 0.32);
    if (m.emissive) m.emissive.copy(team).multiplyScalar(0.08);
    if (m.map) m.map.encoding = THREE.sRGBEncoding;
    o.frustumCulled = false;
  });
}
function buildPlayerFallback(def) {
  const team = new THREE.Color((def && def.tintColor) || '#8899aa');
  const hull = mat(team.clone().multiplyScalar(0.72).getHex(), { metal: 0.55, rough: 0.45, noMap: true, emissive: 0x0d0f14 });
  const dark = mat(team.clone().multiplyScalar(0.22).getHex(), { metal: 0.65, rough: 0.5, noMap: true, emissive: 0x060709 });
  const glow = glowMat(team.getHex());
  const id = def && def.id;
  let g;
  if (id === 'swat' || id === 'scifi') {
    g = new THREE.Group();
    const h = (def && def.h) || 1.22;
    box(g, 0.28, 0.38, 0.18, hull, 0, 0.85, 0);
    box(g, 0.16, 0.16, 0.16, hull, 0, 1.12, 0.02);
    box(g, 0.12, 0.04, 0.02, glow, 0, 1.13, 0.11);
    box(g, 0.08, 0.32, 0.08, dark, -0.2, 0.82, 0);
    box(g, 0.08, 0.32, 0.08, dark, 0.2, 0.82, 0);
    const legs = [];
    legs.push(box(g, 0.1, 0.4, 0.1, dark, -0.08, 0.22, 0));
    legs.push(box(g, 0.1, 0.4, 0.1, dark, 0.08, 0.22, 0));
    g.userData.legs = legs;
  } else {
    const heavy = id === 'george' || id === 'stan';
    g = heavy ? buildTitan(hull, dark, glow) : buildScoutMech(hull, dark, glow, id === 'mike');
  }
  g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g), size = b.getSize(new THREE.Vector3());
  const sc = ((def && def.h) || 1.35) / Math.max(size.y, 1e-4);
  g.scale.multiplyScalar(sc);
  g.position.y = -b.min.y * sc;
  return g;
}
let activeSession = null;
function createRemotePlayer(modelId, opts) {
  opts = opts || {};
  const def = PLAYER_MODELS[modelId] || PLAYER_MODELS[S.playerModel] || PLAYER_MODELS.george;
  const sess = opts.session || activeSession;
  const world = opts.world || (sess && sess.world);
  if (!world) throw new Error('DMB Tech 1: createRemotePlayer needs an active play session (or opts.world)');
  const assetBase = opts.assetBase !== undefined ? opts.assetBase : ((sess && sess.assetBase) || '');
  const remotes = (sess && sess.remotes) || null;
  const root = new THREE.Group();
  const fallback = buildPlayerFallback(def);
  root.add(fallback);
  root.userData.proc = fallback;
  root.userData.modelId = def.id;
  world.add(root);
  const rp = {
    id: def.id, name: def.name, mesh: root, x: 0, y: 0, z: 0, yaw: 0, anim: 'idle', ready: null, _phase: 0, _gone: false,
    setPose(x, y, z, yaw, anim) {
      this.x = x; this.y = y; if (z != null) this.z = z;
      if (yaw != null) this.yaw = yaw;
      root.position.set(this.x, this.z, this.y);
      // Same convention as enemies: yaw 0 faces map +Y (model forward is +Z).
      root.rotation.y = Math.atan2(Math.cos(this.yaw), Math.sin(this.yaw));
      if (anim) { this.anim = anim; playHolderAnim(root, anim); }
    },
    update(dt) {
      const ud = root.userData;
      if (ud.mixer) ud.mixer.update(dt);
      else if (ud.proc && ud.proc.userData.legs && this.anim === 'move') {
        this._phase += dt * 8;
        ud.proc.userData.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(this._phase + i * Math.PI) * 0.5; });
      }
    },
    dispose() {
      if (this._gone) return;
      this._gone = true;
      if (root.parent) root.parent.remove(root);
      if (remotes) { const i = remotes.indexOf(this); if (i >= 0) remotes.splice(i, 1); }
      root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
  };
  rp.setPose(opts.x || 0, opts.y || 0, opts.z || 0, opts.yaw || 0, opts.anim || 'idle');
  const load = (opts.assets === false) ? Promise.resolve(null) : loadGlb(assetBase + def.src);
  rp.ready = load.then(gltf => {
    if (!gltf || (sess && sess.destroyed) || rp._gone) return rp;
    const m = normalizeModel(gltf.scene, def.h || 1.35, false, def); if (!m) return rp;
    applyTeamTint(m, def.tintColor);
    fallback.visible = false;
    root.add(m);
    root.userData.glb = m;
    if (gltf.animations && gltf.animations.length) {
      const mixer = new THREE.AnimationMixer(m.children[0]), acts = {};
      Object.keys(PLAYER_CLIPS).forEach(k => { const c = findClip(gltf.animations, PLAYER_CLIPS[k]); if (c) acts[k] = mixer.clipAction(c); });
      if (!acts.idle && !acts.move) acts.move = mixer.clipAction(gltf.animations[0]);
      ['shoot', 'hit', 'death'].forEach(k => { if (acts[k]) { acts[k].setLoop(THREE.LoopOnce, 1); acts[k].clampWhenFinished = true; } });
      root.userData.mixer = mixer; root.userData.acts = acts; root.userData.anim = '';
      playHolderAnim(root, rp.anim || (acts.idle ? 'idle' : 'move'));
    }
    rp.setPose(rp.x, rp.y, rp.z, rp.yaw, rp.anim);
    return rp;
  });
  if (remotes) remotes.push(rp);
  return rp;
}

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
.dfg-panel.dfg-wide{width:min(640px,94vw)}
.dfg-char-label{font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.8;margin:10px 0 6px}
.dfg-char-label span{text-transform:none;letter-spacing:0;opacity:.75;margin-left:6px}
.dfg-chars{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 12px}
.dfg-char{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#e8edf5;cursor:pointer;font:inherit;text-transform:none}
.dfg-char:hover{background:rgba(255,255,255,.1)}
.dfg-char.on{border-color:var(--tint,#ff8a3d);background:rgba(255,138,61,.16);box-shadow:0 0 0 1px var(--tint,#ff8a3d)}
.dfg-char-sw{width:26px;height:26px;border-radius:50%;box-shadow:0 0 0 2px rgba(0,0,0,.4)}
.dfg-char b{font-size:12px;letter-spacing:.03em;text-align:center}
.dfg-char i{font-style:normal;font-size:10px;opacity:.65}

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
  const remotes = [];
  const session = { get world() { return G && G.world; }, get scene() { return G && G.scene; }, get assetBase() { return assetBase; }, get destroyed() { return destroyed; }, remotes };
  activeSession = session;

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
    const preset = P.lightPreset || '';
    const hemiGround = preset === 'clean' ? 0.42 : 0.3;
    const hemiI = Math.min(P.ambientI, preset === 'clean' ? 1.25 : 1.2) * 1.75;
    const hemi = new THREE.HemisphereLight(amb, amb.clone().multiplyScalar(hemiGround), hemiI); scene.add(hemi);
    const moonI = preset === 'clean' ? 0.28 : 0.25;
    const moon = new THREE.DirectionalLight(new THREE.Color(SKIES[P.sky] ? SKIES[P.sky].glow : '#ffffff'), moonI); moon.position.set(-0.4, 1, 0.3); scene.add(moon);
    const pool = []; for (let i = 0; i < Q().lights; i++) { const pl = new THREE.PointLight(0xffffff, 0, 6, 2); scene.add(pl); pool.push(pl); }
    const bodyCol = preset === 'emergency' ? 0xff4030 : (preset === 'clean' ? 0xd0d8e4 : 0xc8d4ff);
    const bodyI = preset === 'clean' ? 0.28 : (preset === 'emergency' ? 0.4 : 0.22);
    const bodyLight = new THREE.PointLight(bodyCol, bodyI, preset === 'clean' ? 5 : 3, 2); scene.add(bodyLight);     // keeps your surroundings readable
    const muzzle = new THREE.PointLight(0xffb060, 0, 2.4, 2); scene.add(muzzle);
    const fxLight = new THREE.PointLight(0xff8a30, 0, 7, 2); scene.add(fxLight);
    const flash = new THREE.SpotLight(0xfff1d6, 0, 14, 0.42, 0.45, 1.4); scene.add(flash); scene.add(flash.target);
    const g = {
      L, index, W, H: Hh, scene, world, sky, pool, bodyLight, muzzle, fxLight, flash, flashOn: false,
      px: L.spawn.x, py: L.spawn.y, pz: L.fh[Math.floor(L.spawn.y) * W + Math.floor(L.spawn.x)] || 0, vz: 0, onGround: true,
      yaw: L.spawn.r || 0, pitch: 0, vx: 0, vy: 0, bob: 0, stepT: 0,
      hp: 100, armor: 0, ammo: { bullets: 50, shells: 0, cells: 0, rockets: 0 }, owned: [true, true, false, false, false, false], cur: 1, cd: 0, switchT: 0, recoil: 0, mag: MAG_SIZE.slice(), reloadT: 0, reloadMax: 1,
      keys: {}, doors: new Map(), enemies: [], pickups: [], props: [], lights: [], exits: [], projectiles: [], particles: null, fireballs: [],
      kills: 0, totalEnemies: 0, secrets: 0, totalSecrets: 0, items: 0, totalItems: 0, time: 0, flow: null, flowCell: -1, flowT: 0,
      dmgFlash: 0, pickFlash: 0, hitT: 0, msgs: [], scriptH: {}, lightT: 0, noise: null,
      playerModel: S.playerModel || 'george'
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
    remotes.slice().forEach(r => { try { r.dispose(); } catch (e) {} });
    G.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    G.projectiles.forEach(p => p.mesh && G.scene.remove(p.mesh));
    G = null;
  }
  // Swap a procedural model for a custom GLB if the project assigns one to this slot.
  function attachModel(holder, slot, height, centered) {
    const spec = slotSrc(slot); if (!spec) return;
    loadGlb(spec.src).then(gltf => {
      if (!gltf || destroyed) return;
      const m = normalizeModel(gltf.scene, spec.h || height || 1, centered, spec); if (!m) return;
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
  function playAnim(holder, name) { playHolderAnim(holder, name); }

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
    G.scriptApi = api;
    try { new Function('api', src)(api); } catch (e) { msg('Script error: ' + e.message); console.warn('DMB Tech 1 script error', e); }
  }
  function fire(ev, arg) { const hs = G && G.scriptH[ev]; if (hs) hs.forEach(f => { try { f(arg); } catch (e) { msg('Script error: ' + e.message); } }); if (opts.onEvent) { try { opts.onEvent(ev, arg); } catch (e) {} } }

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
    if (!w.melee) { wMuzzle.intensity = 0.45; weaponMeshes[G.cur].userData.flash.visible = true; makeNoise(10); }
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
      // Start ahead of the viewmodel / near plane so the pulse halo isn't a screen-filling box on the gun.
      spawnProj('player', w.proj, G.px + cyaw * 0.85, G.py + syaw * 0.85, eyeZ - 0.05, pdx, pdy, pdz, w.speed, w.dmg, w.splash || 0);
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
  const projGeo = new THREE.SphereGeometry(0.05, 12, 10);
  function scaleProjMesh(mesh, baseScale, x, y, z) {
    const dist = Math.hypot(x - G.px, y - G.py, z - (G.pz + EYE));
    const vis = Math.min(1, Math.max(0, (dist - 0.85) / 1.35));
    mesh.visible = vis > 0.02;
    mesh.scale.setScalar((baseScale || 1) * (vis > 0.02 ? Math.max(vis, 0.15) : 0.15));
  }
  function spawnProj(owner, kind, x, y, z, dx, dy, dz, speed, dmg, splash) {
    const color = kind === 'plasma' ? 0x7cff4f : kind === 'pulse' ? 0x38bdf8 : kind === 'rocket' ? 0xffa040 : 0xff3b1f;
    const mesh = new THREE.Mesh(projGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    const baseScale = kind === 'rocket' ? 1.6 : kind === 'plasma' ? 1.3 : kind === 'pulse' ? 1.15 : 1.1;
    mesh.userData.baseScale = baseScale;
    mesh.scale.setScalar(baseScale);
    const halo = new THREE.Mesh(projGeo, mesh.material.clone()); halo.material.opacity = 0.28; halo.scale.setScalar(kind === 'pulse' ? 1.7 : 2.6); mesh.add(halo);
    mesh.position.set(x, z, y);
    // Keep the mesh small near the camera so an additive halo (player pulse or incoming bolt)
    // doesn't read as a white cube on the first-person gun.
    scaleProjMesh(mesh, baseScale, x, y, z);
    G.scene.add(mesh);
    G.projectiles.push({ owner, kind, x, y, z, vx: dx * speed, vy: dy * speed, vz: dz * speed, dmg, splash, mesh, life: 5, baseScale });
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
      scaleProjMesh(p.mesh, p.baseScale || p.mesh.userData.baseScale || 1, p.x, p.y, p.z);
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
    { const md = 1.8, cp = Math.cos(G.pitch); G.muzzle.position.set(G.px + Math.cos(G.yaw) * cp * md, G.pz + EYE + Math.sin(G.pitch) * md, G.py + Math.sin(G.yaw) * cp * md); }
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
  function characterPickerHtml() {
    const cur = PLAYER_MODELS[S.playerModel] ? S.playerModel : 'george';
    return '<div class="dfg-char-label">Player model <span>how others see you · models load when used</span></div><div class="dfg-chars">' +
      Object.keys(PLAYER_MODELS).map(id => {
        const d = PLAYER_MODELS[id];
        return `<button type="button" class="dfg-char${id === cur ? ' on' : ''}" style="--tint:${d.tintColor}" data-a="pickchar" data-id="${id}"><span class="dfg-char-sw" style="background:${d.tintColor}"></span><b>${esc(d.name)}</b><i>${esc(d.license || 'CC0 1.0')}</i></button>`;
      }).join('') + '</div>';
  }
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
        ${characterPickerHtml()}${opts.onMultiplayer ? '<button class="dfg-btn" data-a="multiplayer">Multiplayer</button>' : ''}<button class="dfg-btn" data-a="settings">Settings</button>${ctrl}`;
    } else if (kind === 'start') {
      h = `<h1>${esc(L.name)}</h1><h2>Level ${G.index + 1} of ${levels.length}</h2>${characterPickerHtml()}${ctrl}<button class="dfg-btn pri" data-a="go">${isTouch ? 'Tap' : 'Click'} to start</button>${opts.onMultiplayer ? '<button class="dfg-btn" data-a="multiplayer">Multiplayer</button>' : ''}${opts.onQuit ? '<button class="dfg-btn" data-a="quit">Back to editor</button>' : ''}`;
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
        ${characterPickerHtml()}
        <p style="font-size:11px;opacity:.6">Quality changes to lights & textures apply on the next level load. Player models load only when a third-person / remote player uses them.</p><button class="dfg-btn pri" data-a="back">Back</button>`;
    } else if (kind === 'dead') {
      h = `<h1 style="color:#ff3b30">YOU DIED</h1><h2>${esc(L.name)}</h2>${stats()}<button class="dfg-btn pri" data-a="restart">Try again</button><button class="dfg-btn" data-a="quit">${opts.onQuit ? 'Back to editor' : 'Quit to title'}</button>`;
    } else if (kind === 'won') {
      const lastOne = G.index >= levels.length - 1;
      h = `<h1 style="color:#2dffb0">${lastOne ? 'CAMPAIGN COMPLETE' : 'LEVEL COMPLETE'}</h1><h2>${esc(L.name)}</h2>${stats()}${lastOne ? '' : '<button class="dfg-btn pri" data-a="next">Next level</button>'}<button class="dfg-btn${lastOne ? ' pri' : ''}" data-a="restart">Replay level</button><button class="dfg-btn" data-a="quit">${opts.onQuit ? 'Back to editor' : 'Quit to title'}</button>`;
    }
    if (isTouch && (kind === 'start' || kind === 'title' || kind === 'pause')) h += `<div class="dfg-rot">Tip: turn your phone sideways for the best view</div>${FS.ok() && !FS.el() ? '<button class="dfg-btn" data-a="fs">Full screen</button>' : ''}`;
    const wide = (kind === 'start' || kind === 'title' || kind === 'settings');
    menu.innerHTML = `<div class="dfg-panel dfg-glass${wide ? ' dfg-wide' : ''}">${h}</div>`; refreshPortraitTip();
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
    else if (a === 'multiplayer') { if (opts.onMultiplayer) opts.onMultiplayer(); }
    else if (a === 'pickchar') {
      const id = b.dataset.id;
      if (PLAYER_MODELS[id]) { S.playerModel = id; saveSettings(); if (G) G.playerModel = id; }
      menu.querySelectorAll('.dfg-char').forEach(el => el.classList.toggle('on', el === b));
    }
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
    if (G) { remotes.forEach(r => r.update(dt)); updateParticles(dt); updateLights(dt, time); updateHud(dt); render(time, dt); }
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
  if (opts.autoPlay) begin();
  raf = requestAnimationFrame(frame);

  const handle = {
    get game() { return G; }, get state() { return state; }, camera, renderer, begin, pause, loadLevel, selectWeapon, shoot: () => shoot(), startReload: () => startReload(), weaponMeshes, music: TP, get dynScale() { return dynScale; }, set dynScale(v) { dynScale = v; resize(); }, toggleFullscreen, damagePlayer, levelComplete,
    createRemotePlayer(modelId, o) { return createRemotePlayer(modelId, Object.assign({}, o, { session })); },
    destroy() {
      destroyed = true; if (activeSession === session) activeSession = null; remotes.slice().forEach(r => { try { r.dispose(); } catch (e) {} }); cancelAnimationFrame(raf); Sound.music(false); if (TP.audio) { TP.audio.pause(); TP.audio.removeAttribute('src'); }
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
  if (!THREE) { host.innerHTML = '<p style="color:#fff;font:16px sans-serif;padding:20px">Could not load Three.js from the internet. Connect once and reload.</p>'; return; }
  return play(host, project, { title: true });
}

/* ---------- .retro pack / unpack (no editor dependency) ---------- */
const RETRO_FORMAT = 'retroengine-level', RETRO_VERSION = 1;
const GRID_KEYS = ['wall', 'kind', 'floor', 'ceil', 'fh'];
function rle(a) { const o = []; for (let i = 0; i < a.length;) { let j = i; while (j < a.length && a[j] === a[i]) j++; o.push(j - i === 1 ? [a[i]] : [a[i], j - i]); i = j; } return o; }
function unrle(r, n) { const o = []; if (!Array.isArray(r)) throw new Error('grid data damaged'); for (const run of r) { const c = Math.min(n, (run && run[1]) | 0 || 1); for (let k = 0; k < c; k++) o.push(run[0]); if (o.length > n) break; } if (o.length !== n) throw new Error('grid size mismatch'); return o; }
const MODEL_SRC_OK = v => /^https?:\/\/[^\s"'<>]+$/i.test(v) || /^data:(model\/gltf-binary|application\/octet-stream)?;base64,[A-Za-z0-9+/=]+$/.test(v);
function packLevel(lv, models) {
  const L = JSON.parse(JSON.stringify(lv)), grid = {};
  GRID_KEYS.forEach(k => { grid[k] = rle(L[k] || []); delete L[k]; });
  L.ents = (L.ents || []).map(e => { const c = Object.assign({}, e); delete c.id; return c; });
  if (L.props) delete L.props.scriptPending;
  const out = { format: RETRO_FORMAT, version: RETRO_VERSION, app: 'DMB Tech 1 ' + VERSION, level: L, grid };
  if (models && typeof models === 'object' && Object.keys(models).length) out.assets = { models };
  return out;
}
function unpackLevel(o) {
  if (!o || typeof o !== 'object') throw new Error('not a DMB Tech 1 level');
  if (Array.isArray(o.levels)) return { project: { name: o.name || 'Untitled', levels: o.levels.map(normalizeLevel), models: Object.assign({}, o.models || {}) } };
  if (o.format !== RETRO_FORMAT) throw new Error('not a DMB Tech 1 level file');
  if ((o.version | 0) > RETRO_VERSION) throw new Error('made with a newer DMB Tech 1 (format v' + o.version + ')');
  const L = Object.assign({}, o.level || {}), w = L.w | 0, h = L.h | 0;
  if (w < 8 || h < 8 || w > 128 || h > 128) throw new Error('level size must be 8–128 cells');
  GRID_KEYS.forEach(k => { if (o.grid && o.grid[k]) L[k] = unrle(o.grid[k], w * h); });
  const T = ['enemy', 'pickup', 'prop', 'light', 'exit'];
  L.ents = (Array.isArray(L.ents) ? L.ents : []).filter(e => e && T.includes(e.t) && isFinite(e.x) && isFinite(e.y) && e.x >= 0 && e.y >= 0 && e.x <= w && e.y <= h).slice(0, 3000);
  const lv = normalizeLevel(L), models = {}, am = (o.assets && o.assets.models) || {};
  Object.keys(am).forEach(k => { if (/^(enemy|prop)_[a-z_]+$/.test(k) && MODEL_SRC_OK(String(am[k]))) models[k] = String(am[k]); });
  return { level: lv, models };
}

function registerWeapon(def) {
  if (!def || typeof def !== 'object') throw new Error('weapon def required');
  const w = {
    id: def.id || ('w' + WEAPON_DEFS.length),
    name: def.name || def.id || 'Custom',
    ammo: def.ammo === undefined ? null : def.ammo,
    cd: def.cd == null ? 0.2 : +def.cd,
    dmg: def.dmg == null ? 12 : +def.dmg,
    pellets: def.pellets == null ? 1 : +def.pellets,
    spread: def.spread == null ? 0.02 : +def.spread,
    auto: !!def.auto,
    recoil: def.recoil == null ? 0.1 : +def.recoil,
    snd: def.snd || 'shoot'
  };
  if (def.proj) w.proj = def.proj;
  if (def.speed != null) w.speed = +def.speed;
  if (def.splash != null) w.splash = +def.splash;
  if (def.melee) { w.melee = true; w.range = def.range == null ? 1.15 : +def.range; }
  const i = WEAPON_DEFS.findIndex(x => x.id === w.id);
  if (i >= 0) { WEAPON_DEFS[i] = Object.assign({}, WEAPON_DEFS[i], w); return i; }
  WEAPON_DEFS.push(w);
  MAG_SIZE.push(def.mag == null ? 0 : +def.mag);
  RELOAD_TIME.push(def.reload == null ? 0 : +def.reload);
  return WEAPON_DEFS.length - 1;
}
function registerEnemy(def) {
  if (!def || !def.id) throw new Error('enemy def needs an id');
  ENEMY_DEFS[def.id] = Object.assign({}, ENEMY_DEFS[def.id] || {}, def);
  return def.id;
}

return {
  VERSION, HOSTED_BASE, MUSIC_TRACKS, LIGHT_PRESETS, ASSET_PACK, PLAYER_MODELS, PLAYER_CLIPS, createRemotePlayer, play, boot, Sound, S, saveSettings,
  TEX_DEFS, WALL_TEXTURES, FLOOR_TEXTURES, CEIL_TEXTURES, SKIES, ENEMY_DEFS, WEAPON_DEFS, PICKUP_DEFS, PROP_DEFS, KEY_COLORS, THREE,
  getThumb, newLevel, normalizeLevel, validateLevel, defaultProps, STEP_H,
  packLevel, unpackLevel, registerWeapon, registerEnemy, RETRO_FORMAT, GRID_KEYS, rle, unrle
};
} /* end of DFRuntime */


/* ---------- public factory for third-party pages ---------- */
function resolveTarget(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) throw new Error('DMB Tech 1: container not found');
  if (el.tagName === 'CANVAS') {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:100%;height:100%;';
    el.replaceWith(wrap);
    el.style.display = 'none';
    wrap.appendChild(el);
    return wrap;
  }
  return el;
}

export function createEngine(target, options) {
  options = options || {};
  const runtime = createRuntime();
  if (options.settings) Object.assign(runtime.S, options.settings);
  ['sens', 'aimAssist', 'aimAssistMouse', 'volume', 'fov', 'invertY', 'difficulty', 'quality', 'showFps', 'playerModel'].forEach(k => {
    if (options[k] !== undefined) runtime.S[k] = options[k];
  });
  const container = resolveTarget(target);
  const listeners = Object.create(null);
  let handle = null;
  let emitReady = false;
  const queuedEvents = [];

  function emit(ev, arg) {
    // play() fires 'start' before it returns the handle. Queue host listeners until loadMap assigns it
    // so engine.game / engine.api are available. Map scripts still run immediately inside the runtime.
    if (!emitReady) { queuedEvents.push([ev, arg]); return; }
    const hs = listeners[ev];
    if (!hs) return;
    hs.slice().forEach(fn => { try { fn(arg); } catch (e) { console.warn('DMB Tech 1 listener', e); } });
  }
  function flushEvents() {
    emitReady = true;
    while (queuedEvents.length) {
      const rec = queuedEvents.shift();
      emit(rec[0], rec[1]);
    }
  }
  function toProject(data) {
    if (!data || typeof data !== 'object') throw new Error('DMB Tech 1: unrecognized map');
    if (Array.isArray(data.levels)) {
      return { name: data.name || 'Untitled', levels: data.levels, models: data.models || {}, useAssetPack: data.useAssetPack, assetBase: data.assetBase };
    }
    if (data.format === 'retroengine-level' || (data.level && data.grid)) {
      const u = runtime.unpackLevel(data);
      return { name: (u.level && u.level.name) || 'Untitled', levels: [u.level], models: u.models || {} };
    }
    if (data.w && data.h) return { name: data.name || 'Untitled', levels: [data], models: {} };
    throw new Error('DMB Tech 1: unrecognized map');
  }

  const engine = {
    VERSION,
    get runtime() { return runtime; },
    get handle() { return handle; },
    get game() { return handle && handle.game; },
    get state() { return handle ? handle.state : 'idle'; },
    get api() { return handle && handle.game && handle.game.scriptApi; },
    async loadMap(src) {
      if (handle) { try { handle.destroy(); } catch (e) {} handle = null; }
      let data = src;
      if (typeof src === 'string') {
        const t = src.trim();
        if (t.charAt(0) === '{' || t.charAt(0) === '[') data = JSON.parse(t);
        else {
          const res = await fetch(src);
          if (!res.ok) throw new Error('DMB Tech 1: could not load map ' + src + ' (' + res.status + ')');
          data = await res.json();
        }
      }
      const project = toProject(data);
      const playOpts = {
        assets: options.assets,
        assetBase: options.assetBase,
        autoPlay: false,
        onEvent: (ev, arg) => emit(ev, arg)
      };
      handle = runtime.play(container, project, playOpts);
      flushEvents();
      if (options.autoPlay) engine.start();
      return engine;
    },
    start() {
      if (!handle || handle.nogl) throw new Error('DMB Tech 1: load a map first');
      if (handle.begin) handle.begin();
      return engine;
    },
    pause() { if (handle && handle.pause) handle.pause(); return engine; },
    resume() { if (handle && handle.begin) handle.begin(); return engine; },
    stop() { if (handle) { try { handle.destroy(); } catch (e) {} handle = null; } return engine; },
    dispose() { return engine.stop(); },
    on(ev, fn) {
      if (typeof fn !== 'function') throw new Error('DMB Tech 1: on() needs a function');
      (listeners[ev] = listeners[ev] || []).push(fn);
      return () => { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); };
    },
    setOption(key, value) {
      if (key && typeof key === 'object') Object.keys(key).forEach(k => { runtime.S[k] = key[k]; });
      else runtime.S[key] = value;
      if (runtime.saveSettings) runtime.saveSettings();
      return engine;
    },
    registerWeapon(def) { return runtime.registerWeapon(def); },
    registerEnemy(def) { return runtime.registerEnemy(def); },
    createRemotePlayer(modelId, opts) { return runtime.createRemotePlayer(modelId, opts); },
    get PLAYER_MODELS() { return runtime.PLAYER_MODELS; },
    shoot() { if (handle && handle.shoot) handle.shoot(); },
    packLevel(level, models) { return runtime.packLevel(level, models); },
    unpackLevel(obj) { return runtime.unpackLevel(obj); }
  };
  return engine;
}

export const DMBTech1 = { VERSION, createEngine, createRuntime };
export default DMBTech1;
