/* loading progress: count every GLB the boot sequence fetches */
  window.LOADP = { n: 0, done: 0, f: {} };
  window.uiLoad = function (frac, label) { const b = document.getElementById('splash-bar'), t = document.getElementById('splash-pct'), st = document.getElementById('splash-status'); const pct = Math.max(4, Math.min(100, Math.round(frac * 100))); if (b && parseFloat(b.style.width) < pct) b.style.width = pct + '%'; if (t) t.textContent = pct >= 100 ? 'READY' : pct + '%'; if (label && st) st.textContent = label; if (pct >= 100) document.body && document.body.classList.add('loaded'); };
  if (window.THREE && THREE.GLTFLoader) { const L = THREE.GLTFLoader.prototype.load; THREE.GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) { const P = window.LOADP, id = P.n++; P.f[id] = 0;
    const upd = () => { let s = 0; for (const k in P.f) s += P.f[k]; uiLoad(0.08 + 0.88 * s / Math.max(1, P.n), P.done < P.n ? 'Calibrating sentinels · ' + P.done + '/' + P.n : 'Arming Pulse Cannon'); };
    const fin = () => { if (P.f[id] < 1) { P.f[id] = 1; P.done++; upd(); } };
    return L.call(this, url, g => { fin(); onLoad && onLoad(g); }, e => { if (e && e.total) { P.f[id] = Math.min(0.99, e.loaded / e.total); upd(); } onProgress && onProgress(e); }, e => { fin(); onError && onError(e); }); }; }
  
;
// ============================================================================
// DYSTOPIA UPGRADED — Doom/Quake Sentinels · Pulse Cannon · Meshy-ready
// Meshy prompts (also in README):
//   guard: Quake Strogg biomechanical sentinel, flesh fused with riveted gunmetal, cables into sinew, arm-cannon graft, rust brown-green, amber-red eyes
//   heavy: Heavy Strogg enforcer, pauldrons fused into muscle, dual grafted cannons, red eyes, cables into torso
//   pulse_cannon: Grimy biomechanical FPS pulse cannon, riveted shroud, fleshy cable coils, amber cells
//   props: industrial crate / server rack / barrel / pipe vent cluster
// ============================================================================
let IS_RELEASE_BUILD = false;
let GAME_BRAND_TITLE = "DYSTOPIA";

const LEVEL_CONFIGS = (() => {
  const names = ['THE SPINE · INTAKE & DETENTION', 'THE SPINE · COLD AISLES', 'THE SPINE · EXHAUST WORKS', 'THE NURSERY · LULLABY PODS', 'THE NURSERY · THE COMMONS', 'THE NURSERY · TRIAGE WARD', 'DEEP CORE · THE BLACK ARCHIVE', 'DEEP CORE · THE COOLING SPINE', 'THE GARDEN'];
  const fogs = [0x050911, 0x04111d, 0x0a0f0a, 0x0b0716, 0x120c04, 0x04121a, 0x100508, 0x0c0c12, 0x160509];
  const hemis = [0xddeeff, 0xbfe3ff, 0xd9f99d, 0xddd6fe, 0xfde68a, 0xa5f3fc, 0xfecaca, 0xe5e7eb, 0xfca5a5];
  const o = {};
  for (let i = 1; i <= 9; i++) o[i] = { name: `CRADLE 09 · ${names[i - 1]}`, sub: 'Escape the cell, then descend G → B1 → B2 → B3.', botCount: 8, bossHp: 420 + 160 * i, fogColor: fogs[i - 1], hemiTop: hemis[i - 1], speedMult: 1 + 0.06 * (i - 1) };
  return o;
})();

let BOT_ROSTER = [
  { id: 'guard-1', name: 'Unit Vance [Doom Sentinel]', role: 'human_guard', armorColor: 0x1e293b, tint: 0xfacc15, weapon: 0, x: -32, y: 0, z: 38, maxHealth: 110, patrolType: 'ground' },
  { id: 'guard-2', name: 'Unit Miller [Tower Sentinel]', role: 'human_guard', armorColor: 0x172554, tint: 0x38bdf8, weapon: 0, x: -34, y: 4.6, z: 12, maxHealth: 115, patrolType: 'tower' },
  { id: 'guard-3', name: 'Unit Mercer [Catwalk Sentinel]', role: 'human_guard', armorColor: 0x1e293b, tint: 0xfacc15, weapon: 1, x: 0, y: 4.6, z: 0, maxHealth: 115, patrolType: 'catwalk' },
  { id: 'guard-4', name: 'Unit Reyes [Tower Sentinel]', role: 'human_guard', armorColor: 0x172554, tint: 0x38bdf8, weapon: 0, x: 34, y: 4.6, z: 12, maxHealth: 120, patrolType: 'tower' },
  { id: 'bot-1', name: 'Sarge [Heavy Sentinel]', role: 'bot', armorColor: 0x1e3a8a, tint: 0x00f0ff, weapon: 0, x: -55, y: 0, z: 42, maxHealth: 125, patrolType: 'ground' },
  { id: 'bot-2', name: 'Phobos [Heavy Sentinel]', role: 'bot', armorColor: 0x3b0764, tint: 0xc084fc, weapon: 1, x: 55, y: 0, z: 42, maxHealth: 130, patrolType: 'ground' },
  { id: 'guard-5', name: 'Unit Cross [Catwalk Sentinel]', role: 'human_guard', armorColor: 0x0f172a, tint: 0xf97316, weapon: 0, x: 0, y: 4.6, z: -28, maxHealth: 125, patrolType: 'catwalk' },
  { id: 'bot-3', name: 'Viper [Heavy Hunter]', role: 'bot', armorColor: 0x064e3b, tint: 0x22c55e, weapon: 0, x: -52, y: 0, z: -38, maxHealth: 135, patrolType: 'ground' },
  { id: 'bot-4', name: 'Razor [Heavy Shock]', role: 'bot', armorColor: 0x7c2d12, tint: 0xf97316, weapon: 1, x: 52, y: 0, z: -38, maxHealth: 140, patrolType: 'ground' },
  { id: 'bot-5', name: 'Krieg [Heavy Overlord]', role: 'bot', armorColor: 0x7f1d1d, tint: 0xef4444, weapon: 2, x: 0, y: 0, z: -48, maxHealth: 155, patrolType: 'ground' }
];

let MAP_OBJECTS = [
  { id: 'ib-1', type: 'ibeam', x: -24, z: 48, w: 1.4, d: 1.4, h: 16, rot: 0, color: '#f59e0b' },
  { id: 'ib-2', type: 'ibeam', x: 24, z: 48, w: 1.4, d: 1.4, h: 16, rot: 0, color: '#f59e0b' },
  { id: 'ib-3', type: 'ibeam', x: -24, z: 0, w: 1.4, d: 1.4, h: 16, rot: 0, color: '#f59e0b' },
  { id: 'ib-4', type: 'ibeam', x: 24, z: 0, w: 1.4, d: 1.4, h: 16, rot: 0, color: '#f59e0b' },
  { id: 'ib-5', type: 'ibeam', x: -24, z: -48, w: 1.4, d: 1.4, h: 16, rot: 0, color: '#f59e0b' },
  { id: 'ib-6', type: 'ibeam', x: 24, z: -48, w: 1.4, d: 1.4, h: 16, rot: 0, color: '#f59e0b' },
  { id: 'cw-central-ns', type: 'catwalk', x: 0, z: 0, w: 5.2, d: 64, h: 4.6, rot: 0, color: '#facc15', hasRampSouth: true, hasRampNorth: true },
  { id: 'cw-cross-ew', type: 'catwalk', x: 0, z: 12, w: 68, d: 4.6, h: 4.6, rot: 0, color: '#00f0ff' },
  { id: 'cw-north-ew', type: 'catwalk', x: 0, z: -28, w: 68, d: 4.6, h: 4.6, rot: 0, color: '#facc15' },
  { id: 'tw-1', type: 'tower', x: -34, z: 12, w: 6.5, d: 6.5, h: 4.6, rot: 0, color: '#ef4444' },
  { id: 'tw-2', type: 'tower', x: 34, z: 12, w: 6.5, d: 6.5, h: 4.6, rot: 0, color: '#ef4444' },
  { id: 'tw-3', type: 'tower', x: -34, z: -28, w: 6.5, d: 6.5, h: 4.6, rot: 0, color: '#f97316' },
  { id: 'tw-4', type: 'tower', x: 34, z: -28, w: 6.5, d: 6.5, h: 4.6, rot: 0, color: '#f97316' },
  { id: 'srv-1', type: 'server', x: -70, z: 10, w: 3.4, d: 2.2, h: 5.5, rot: 0, color: '#00f0ff' },
  { id: 'srv-2', type: 'server', x: -60, z: 10, w: 3.4, d: 2.2, h: 5.5, rot: 0, color: '#00f0ff' },
  { id: 'srv-3', type: 'server', x: -50, z: 10, w: 3.4, d: 2.2, h: 5.5, rot: 0, color: '#00f0ff' },
  { id: 'srv-4', type: 'server', x: 50, z: 10, w: 3.4, d: 2.2, h: 5.5, rot: 0, color: '#22c55e' },
  { id: 'srv-5', type: 'server', x: 60, z: 10, w: 3.4, d: 2.2, h: 5.5, rot: 0, color: '#22c55e' },
  { id: 'srv-6', type: 'server', x: 70, z: 10, w: 3.4, d: 2.2, h: 5.5, rot: 0, color: '#22c55e' },
  { id: 'emp-1', type: 'emp', x: -16, z: 0, w: 4, d: 4, h: 8, rot: 0, color: '#00f0ff' },
  { id: 'emp-2', type: 'emp', x: 16, z: 0, w: 4, d: 4, h: 8, rot: 0, color: '#00f0ff' },
  { id: 'emp-3', type: 'emp', x: -16, z: -44, w: 4, d: 4, h: 8, rot: 0, color: '#facc15' },
  { id: 'emp-4', type: 'emp', x: 16, z: -44, w: 4, d: 4, h: 8, rot: 0, color: '#facc15' },
  { id: 'cryo-1', type: 'cryo', x: -84, z: 48, w: 2.6, d: 2.6, h: 4.8, rot: 0, color: '#22c55e' },
  { id: 'cryo-2', type: 'cryo', x: -84, z: 36, w: 2.6, d: 2.6, h: 4.8, rot: 0, color: '#22c55e' },
  { id: 'cryo-3', type: 'cryo', x: 84, z: 48, w: 2.6, d: 2.6, h: 4.8, rot: 0, color: '#22c55e' },
  { id: 'cryo-4', type: 'cryo', x: 84, z: 36, w: 2.6, d: 2.6, h: 4.8, rot: 0, color: '#22c55e' },
  { id: 'crate-1', type: 'crate', x: -14, z: 44, w: 3.2, d: 3.2, h: 3.2, rot: 0, color: '#f59e0b' },
  { id: 'crate-2', type: 'crate', x: 14, z: 44, w: 3.2, d: 3.2, h: 3.2, rot: 0, color: '#00f0ff' },
  { id: 'fork-1', type: 'forklift', x: -32, z: 54, w: 3.2, d: 4.4, h: 3.2, rot: 0.4, color: '#facc15' },
  { id: 'fork-2', type: 'forklift', x: 32, z: -46, w: 3.2, d: 4.4, h: 3.2, rot: -0.6, color: '#facc15' },
  { id: 'pil-1', type: 'pillar', x: -28, z: -12, w: 2.4, d: 2.4, h: 9, rot: 0, color: '#ef4444' },
  { id: 'pil-2', type: 'pillar', x: 28, z: -12, w: 2.4, d: 2.4, h: 9, rot: 0, color: '#ef4444' },
  { id: 'sign-1', type: 'sign', x: -52, z: 25.9, w: 10, d: 0.4, h: 2.6, rot: 0, color: '#00f0ff', title: 'SUB-LEVEL BUNKERS', sub: '▼ CITIZEN CONTAINMENT CELLS A-D' },
  { id: 'sign-2', type: 'sign', x: 52, z: 25.9, w: 10, d: 0.4, h: 2.6, rot: 0, color: '#facc15', title: 'MOSES DIRECTIVE 9', sub: '⚠ CATWALK & WATCHTOWER OVERWATCH' },
  { id: 'sign-3', type: 'sign', x: -52, z: -22.1, w: 10, d: 0.4, h: 2.6, rot: 0, color: '#22c55e', title: 'EMP FABRICATION', sub: '⚡ HIGH-YIELD PULSE ASSEMBLY BAY' },
  { id: 'sign-4', type: 'sign', x: 52, z: -22.1, w: 10, d: 0.4, h: 2.6, rot: 0, color: '#ef4444', title: 'NORTH CORE ELEVATOR', sub: '🔑 MINOTAUR KEYCARD REQUIRED' }
];

const STATE = {
  running: false, pausedForStudio: false, level: 1, floor: 0, combatActive: false, floorCleared: false, diff: { dmg: 1, fire: 1 }, maxLevels: 9, botSkill: 1.0, sens: 1.25, aimAssist: 0.80,
  walkSpeed: 14, jumpVel: 8.5, gravity: 22, bossScale: 1.75, bossSpeedMult: 1.0, hasAccessKey: false, bossSpawned: false,
  currentWeapon: 0, fireCooldown: 0, grenades: 3, quadTimer: 0, screenShake: 0, spinUp: 0,
  player: { x: 0, y: 0, z: 62, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, health: 100, maxHealth: 100, armor: 50, maxArmor: 100, crouch: false },
  weapons: [
    { name: 'Pulse Cannon', ammo: Infinity, maxAmmo: Infinity, damage: 28, pellets: 1, fireRate: 0.13, spread: 0.008, color: 0x38bdf8, speed: 92, splash: 0, recoil: 0.14 },
    { name: 'Combat Shotgun', ammo: 24, maxAmmo: 32, damage: 18, pellets: 8, fireRate: 0.56, spread: 0.062, color: 0xffaa00, speed: 88, splash: 0, recoil: 0.25 },
    { name: 'Rocket Launcher', ammo: 12, maxAmmo: 15, damage: 155, pellets: 1, fireRate: 0.80, spread: 0.002, color: 0xff4400, speed: 46, splash: 14.0, recoil: 0.36 },
    { name: 'Ion EMP', ammo: 6, maxAmmo: 10, damage: 0, pellets: 1, fireRate: 0.9, spread: 0.003, color: 0x38bdf8, speed: 48, splash: 0, recoil: 0.3, emp: true }
  ]
};

const MESHY_TEMPLATES = { guard: null, bot: null, boss: null, viewmodel: null, props: {} };
let IMPACT_DECALS = [];
let MUZZLE_FX = [];
let ARENA_LIGHTS = [];
let STEAM_PARTICLES = [];
let DEATH_FX = [];

class SoundSynth {
  constructor() { this.ctx = null; this.muted = false; }
  init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
  playPew(pitch = 680) {
    if (this.muted) return; this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(pitch, now); osc.frequency.exponentialRampToValueAtTime(110, now + 0.13);
    g.gain.setValueAtTime(0.18, now); g.gain.linearRampToValueAtTime(0.01, now + 0.13);
    osc.connect(g); g.connect(this.ctx.destination); osc.start(now); osc.stop(now + 0.13);
  }
  playPulse() {
    if (this.muted) return; this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); const osc2 = this.ctx.createOscillator(); const g = this.ctx.createGain();
    osc.type = 'square'; osc2.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    osc2.frequency.setValueAtTime(880, now); osc2.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    g.gain.setValueAtTime(0.22, now); g.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.connect(g); osc2.connect(g); g.connect(this.ctx.destination);
    osc.start(now); osc2.start(now); osc.stop(now + 0.2); osc2.stop(now + 0.14);
  }
  playShotgun() {
    if (this.muted) return; this.init();
    const now = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.22, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.07));
    const noise = this.ctx.createBufferSource(); noise.buffer = buf;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.32, now); g.gain.linearRampToValueAtTime(0.01, now + 0.22);
    noise.connect(g); g.connect(this.ctx.destination); noise.start(now);
  }
  playExplosion() {
    if (this.muted) return; this.init();
    const now = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(110, now); osc.frequency.exponentialRampToValueAtTime(18, now + 0.55);
    g.gain.setValueAtTime(0.45, now); g.gain.linearRampToValueAtTime(0.01, now + 0.55);
    osc.connect(g); g.connect(this.ctx.destination); osc.start(now); osc.stop(now + 0.55);
  }
  playBoom(scale = 1, dist = 0) {
    if (this.muted) return; this.init(); const ctx = this.ctx; const now = ctx.currentTime;
    const vol = Math.max(0.08, Math.min(1, 1 - dist / 90)) * Math.min(1.4, 0.55 + scale * 0.35);
    const len = 0.9 + scale * 0.5; const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * (0.12 + scale * 0.08)));
    const n = ctx.createBufferSource(); n.buffer = buf; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1800, now); lp.frequency.exponentialRampToValueAtTime(120, now + len);
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.55 * vol, now); ng.gain.exponentialRampToValueAtTime(0.001, now + len);
    n.connect(lp); lp.connect(ng); ng.connect(ctx.destination); n.start(now);
    const o = ctx.createOscillator(); const og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(75, now); o.frequency.exponentialRampToValueAtTime(24, now + len * 0.9);
    og.gain.setValueAtTime(0.7 * vol, now); og.gain.exponentialRampToValueAtTime(0.001, now + len); o.connect(og); og.connect(ctx.destination); o.start(now); o.stop(now + len);
  }
  playWeakPoint(crit = false) {
    if (this.muted) return; this.init(); const ctx = this.ctx; const now = ctx.currentTime;
    [crit ? 1320 : 980, crit ? 1980 : 1470].forEach((f, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = i ? 'triangle' : 'square'; o.frequency.setValueAtTime(f, now); o.frequency.exponentialRampToValueAtTime(f * 0.6, now + 0.18); g.gain.setValueAtTime(0.12, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.22); o.connect(g); g.connect(ctx.destination); o.start(now + i * 0.03); o.stop(now + 0.3); });
  }
  playBeep(f = 1600) { if (this.muted) return; this.init(); const ctx = this.ctx; const now = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.05, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08); o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 0.1); }
  playBossRoar() {
    if (this.muted) return; this.init();
    const now = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(95, now); osc.frequency.linearRampToValueAtTime(42, now + 0.9);
    g.gain.setValueAtTime(0.38, now); g.gain.linearRampToValueAtTime(0.01, now + 0.95);
    osc.connect(g); g.connect(this.ctx.destination); osc.start(now); osc.stop(now + 0.95);
  }
  playKeyPickup() {
    if (this.muted) return; this.init();
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      g.gain.setValueAtTime(0.16, now + idx * 0.07); g.gain.linearRampToValueAtTime(0.005, now + idx * 0.07 + 0.22);
      osc.connect(g); g.connect(this.ctx.destination); osc.start(now + idx * 0.07); osc.stop(now + idx * 0.07 + 0.22);
    });
  }
  playRadioChatter(textLine, speakerLabel = 'OVERWATCH COMMS') {
    const box = document.getElementById('radio-comms-box');
    const senderEl = document.getElementById('radio-sender');
    const msgEl = document.getElementById('radio-message');
    if (box && senderEl && msgEl) {
      senderEl.textContent = `📻 ${speakerLabel}`;
      msgEl.textContent = `"Kchk— ${textLine} —Kchk"`;
      box.classList.remove('hidden');
      clearTimeout(this._radioHudTimer);
      this._radioHudTimer = setTimeout(() => box.classList.add('hidden'), 5200);
    }
    if (this.muted) return; this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime; const beep = this.ctx.createOscillator(); const beepGain = this.ctx.createGain();
    beep.type = 'square'; beep.frequency.setValueAtTime(1480, now); beep.frequency.setValueAtTime(1860, now + 0.045);
    beepGain.gain.setValueAtTime(0.11, now); beepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
    beep.connect(beepGain); beepGain.connect(this.ctx.destination); beep.start(now); beep.stop(now + 0.10);
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); const utter = new SpeechSynthesisUtterance(textLine); utter.pitch = 0.78; utter.rate = 1.18; utter.volume = 0.65; window.speechSynthesis.speak(utter); } catch (e) {}
    }
  }
  playSiren(cycles = 3) {
    const ind = document.getElementById('siren-indicator');
    if (ind) { ind.classList.remove('hidden'); clearTimeout(this._sirenIndTimer); this._sirenIndTimer = setTimeout(() => ind.classList.add('hidden'), cycles * 1200); }
    sirenActiveTimer = cycles * 1.1;
    if (this.muted) return; this.init(); if (!this.ctx) return;
    const now = this.ctx.currentTime; const totalDur = cycles * 1.1;
    const osc1 = this.ctx.createOscillator(); const osc2 = this.ctx.createOscillator(); const gain = this.ctx.createGain();
    osc1.type = 'sawtooth'; osc2.type = 'triangle';
    for (let c = 0; c < cycles; c++) {
      const t0 = now + c * 1.1;
      osc1.frequency.setValueAtTime(440, t0); osc1.frequency.linearRampToValueAtTime(860, t0 + 0.55); osc1.frequency.linearRampToValueAtTime(440, t0 + 1.1);
      osc2.frequency.setValueAtTime(446, t0); osc2.frequency.linearRampToValueAtTime(868, t0 + 0.55); osc2.frequency.linearRampToValueAtTime(446, t0 + 1.1);
    }
    gain.gain.setValueAtTime(0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + totalDur);
    osc1.connect(gain); osc2.connect(gain); gain.connect(this.ctx.destination);
    osc1.start(now); osc2.start(now); osc1.stop(now + totalDur); osc2.stop(now + totalDur);
  }
}
const SFX = new SoundSynth();

const IS_COARSE = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
const canvas = document.getElementById('webgl-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_COARSE, powerPreference: 'high-performance' });
function viewSize() {
  const vv = window.visualViewport;
  return { w: Math.max(1, Math.floor(vv ? vv.width : window.innerWidth)), h: Math.max(1, Math.floor(vv ? vv.height : window.innerHeight)) };
}
(function initRendererSize() {
  const { w, h } = viewSize();
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_COARSE ? 1.1 : 2));
})();
const SHADOW_KEY = 'dystopia_shadows';
let SHADOWS_ON = localStorage.getItem(SHADOW_KEY) !== '0';
renderer.shadowMap.enabled = SHADOWS_ON;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
const GUN_CLIP = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
const SHADOW_RES = IS_COARSE ? 1024 : 2048;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
const BRIGHTNESS_KEY = 'dystopia_brightness';
let BRIGHTNESS = parseFloat(localStorage.getItem(BRIGHTNESS_KEY));
if (!isFinite(BRIGHTNESS)) BRIGHTNESS = 1.0;
renderer.toneMappingExposure = BRIGHTNESS;
function setBrightness(v) { BRIGHTNESS = Math.max(0.6, Math.min(3.0, v)); renderer.toneMappingExposure = BRIGHTNESS; try { localStorage.setItem(BRIGHTNESS_KEY, String(BRIGHTNESS)); } catch (e) {} const el = document.getElementById('bright-value'); if (el) el.textContent = Math.round(BRIGHTNESS * 100) + '%'; const sl = document.getElementById('slider-bright'); if (sl) sl.value = Math.round(BRIGHTNESS * 100); }

function brightenMat(m) {
  if (!m || m.userData?._bright) return; m.userData = m.userData || {}; m.userData._bright = true;
  if (m.metalness !== undefined) { m.metalness = Math.min(m.metalness, 0.55); m.roughness = Math.max(m.roughness ?? 0.6, 0.35); m.envMapIntensity = 0.3; }
  if (m.color) { const hsl = {}; m.color.getHSL(hsl); if (hsl.l < 0.14 && !m.map) m.color.setHSL(hsl.h, hsl.s, hsl.l + (0.14 - hsl.l) * 0.5); }
  if (m.emissive && m.emissiveIntensity !== undefined && m.emissive.getHex() !== 0) m.emissiveIntensity = Math.max(m.emissiveIntensity * 1.3, 0.6);
  m.needsUpdate = true;
}
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090d);
scene.fog = new THREE.FogExp2(0x07090d, 0.0075);
// Q3/Duke look: dark ambient, fog only slightly lifted so silhouettes read
function liftFog(hex) { const c = new THREE.Color(hex); c.lerp(new THREE.Color(0x0b0e14), 0.55); return c; }

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 320);
const viewModelGroup = new THREE.Group();
// Round 18: the FPS weapon + arms live in their OWN scene/camera and are drawn in a second pass after the depth
// buffer is cleared. Before, the rig shared the world depth buffer and the 0.1 m near plane, so parts of the gun
// sank into walls/floors/enemies and the forearms were sliced by the near plane — the "gun breaking apart".
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 20);
vmScene.add(vmCam); vmCam.add(viewModelGroup);
vmScene.add(new THREE.HemisphereLight(0xddeeff, 0x1a1e26, 0.35));
const vmFlash = new THREE.PointLight(0xffd29a, 0, 3.5, 1.6); vmFlash.position.set(0.3, -0.1, -1.0); vmCam.add(vmFlash);
scene.add(camera);
function syncVmCam() {
  camera.updateMatrixWorld(); vmCam.position.setFromMatrixPosition(camera.matrixWorld); vmCam.quaternion.setFromRotationMatrix(camera.matrixWorld);
  if (vmCam.fov !== camera.fov || vmCam.aspect !== camera.aspect) { vmCam.fov = camera.fov; vmCam.aspect = camera.aspect; vmCam.updateProjectionMatrix(); }
  vmCam.updateMatrixWorld(true);
}
function renderFrame() {
  renderer.render(scene, camera);
  if (!gunMesh || !viewModelGroup.visible) return;
  syncVmCam(); if (vmFlash.intensity > 0) vmFlash.intensity = Math.max(0, vmFlash.intensity - 0.35);
  const ac = renderer.autoClear; renderer.autoClear = false; renderer.clearDepth(); renderer.render(vmScene, vmCam); renderer.autoClear = ac;
}

const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x1a1e26, 0.05);
scene.add(hemiLight);
const ambientLight = new THREE.AmbientLight(0x8090a8, 0.03);
scene.add(ambientLight);
const fillLight = new THREE.DirectionalLight(0x6f9cff, 0.06);
fillLight.position.set(-50, 40, -40); scene.add(fillLight);
const camFill = new THREE.PointLight(0xffe2c0, 0.12, 10, 1.6);
camera.add(camFill); vmCam.add(camFill.clone());
// short-range key light so the FPS weapon + hands read in the dark
const vmLight = new THREE.PointLight(0xfff0dc, 1.7, 3.0, 1.5); vmLight.position.set(0.35, 0.45, 0.1); vmCam.add(vmLight);
// ---------- Round 11: runtime light pool (no new PointLights during play → no shader recompiles) ----------
const RT_LIGHTS = new Set();
class RTLight extends THREE.Object3D {
  constructor(color = 0xffffff, intensity = 1, distance = 0, decay = 1) { super(); this.color = new THREE.Color(color); this.intensity = intensity; this.distance = distance; this.decay = decay; this.isRTLight = true; this._seen = performance.now(); RT_LIGHTS.add(this); }
}
const LIGHT_POOL = [];
(function () { const n = IS_COARSE ? 4 : 8; for (let i = 0; i < n; i++) { const L = new THREE.PointLight(0xffffff, 0, 10, 2); L.position.set(0, -500, 0); scene.add(L); LIGHT_POOL.push(L); } })();
const _rtv = new THREE.Vector3();
function rtLightsUpdate() {
  const now = performance.now(), cam = camera.position, cand = [];
  for (const L of RT_LIGHTS) {
    let top = L; while (top.parent) top = top.parent;
    if (top !== scene) { if (now - L._seen > 4000) RT_LIGHTS.delete(L); continue; }
    L._seen = now; if (!(L.intensity > 0.01) || !L.visible) continue;
    L.getWorldPosition(_rtv); const d = _rtv.distanceTo(cam); const R = L.distance || 30;
    if (d > R + 25) continue;
    cand.push({ L, p: _rtv.clone(), s: L.intensity * R / (1 + d * d * 0.02) });
  }
  cand.sort((a, b) => b.s - a.s);
  const maxN = (window.GFX_LEVEL === 'low') ? Math.min(2, LIGHT_POOL.length) : LIGHT_POOL.length;
  for (let i = 0; i < LIGHT_POOL.length; i++) {
    const P = LIGHT_POOL[i], c = i < maxN ? cand[i] : null;
    if (!c) { P.intensity = 0; continue; }
    P.position.copy(c.p); P.color.copy(c.L.color); P.intensity = c.L.intensity; P.distance = c.L.distance; P.decay = c.L.decay || 2;
  }
}
try { const pm = new THREE.PMREMGenerator(renderer); const envScene = new THREE.Scene(); envScene.background = new THREE.Color(0x050608); const envRT = pm.fromScene(envScene, 0.04); scene.environment = envRT.texture; vmScene.environment = envRT.texture; pm.dispose(); } catch (e) { console.warn('env', e); }
const dirLight = new THREE.DirectionalLight(0xffe6c8, 0.12);
dirLight.position.set(45, 85, 35);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(SHADOW_RES, SHADOW_RES);
{ const sc = dirLight.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 10; sc.far = 220; sc.updateProjectionMatrix(); }
dirLight.shadow.bias = -0.0004; dirLight.shadow.normalBias = 0.04; dirLight.shadow.radius = 3;
scene.add(dirLight.target);
function setShadows(on) {
  SHADOWS_ON = !!on; try { localStorage.setItem(SHADOW_KEY, on ? '1' : '0'); } catch (e) {}
  renderer.shadowMap.enabled = SHADOWS_ON; renderer.shadowMap.needsUpdate = true;
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  const b = document.getElementById('btn-shadows'); if (b) { b.textContent = SHADOWS_ON ? 'ON' : 'OFF'; b.className = 'action-btn px-3 py-1 rounded text-[10px] font-black ' + (SHADOWS_ON ? 'bg-emerald-500 text-black' : 'bg-gray-700 text-gray-300'); }
}
// keep the shadow frustum centred on the player (snapped to texels to avoid shimmer)
function updateShadowCamera() {
  if (!SHADOWS_ON) return;
  const step = 90 / SHADOW_RES * 4;
  const px = Math.round(STATE.player.x / step) * step, pz = Math.round(STATE.player.z / step) * step;
  dirLight.position.set(px + 55, 70, pz + 40); dirLight.target.position.set(px, 0, pz); dirLight.target.updateMatrixWorld();
}
scene.add(dirLight);

function makeNoiseTexture(size, base, variance, lines) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < variance; i++) {
    const v = Math.random() > 0.5 ? 255 : 20;
    ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  if (lines) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3;
    for (let p = size / 4; p < size; p += size / 4) {
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(size, p); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, size); ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const WALL_PBR = { map: makeNoiseTexture(512, '#1e293b', 5000, true), bumpMap: makeNoiseTexture(512, '#808080', 4000, true) };
WALL_PBR.map.repeat.set(10, 2); WALL_PBR.bumpMap.repeat.set(10, 2);
const FLOOR_PBR = { map: makeNoiseTexture(512, '#111827', 4500, true), bumpMap: makeNoiseTexture(512, '#808080', 3500, true) };
FLOOR_PBR.map.repeat.set(38, 32); FLOOR_PBR.bumpMap.repeat.set(38, 32);
// hazard stripe on wall texture
(function addHazard() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.drawImage(WALL_PBR.map.image, 0, 0);
  ctx.fillStyle = '#eab308'; ctx.fillRect(0, 428, 512, 34);
  ctx.fillStyle = '#090d16';
  for (let x = -64; x < 576; x += 36) {
    ctx.beginPath(); ctx.moveTo(x, 428); ctx.lineTo(x + 18, 428); ctx.lineTo(x - 4, 462); ctx.lineTo(x - 22, 462); ctx.closePath(); ctx.fill();
  }
  WALL_PBR.map.image = c; WALL_PBR.map.needsUpdate = true;
})();
// Round 19: ambientCG CC0 metal plate textures (1K) swapped into the wall/floor canvases once loaded; procedural noise stays as fallback
(function loadMetalPlates() {
  const swap = (tex, url, tint, hazard, tiles = 1) => { const im = new Image(); im.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); const ts = 512 / tiles;
    for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) x.drawImage(im, i * ts, j * ts, ts, ts); if (tint) { x.globalCompositeOperation = 'multiply'; x.fillStyle = tint; x.fillRect(0, 0, 512, 512); x.globalCompositeOperation = 'source-over'; }
    if (hazard) { x.fillStyle = '#eab308'; x.fillRect(0, 428, 512, 34); x.fillStyle = '#090d16'; for (let k = -64; k < 576; k += 36) { x.beginPath(); x.moveTo(k, 428); x.lineTo(k + 18, 428); x.lineTo(k - 4, 462); x.lineTo(k - 22, 462); x.closePath(); x.fill(); } }
    tex.image = c; tex.needsUpdate = true; }; im.src = url; };
  swap(WALL_PBR.map, 'images/tex/metal_wall_1k.jpg', '#4a5670', true, 3); swap(WALL_PBR.bumpMap, 'images/tex/metal_wall_bump_1k.jpg', null, false, 3);
  swap(FLOOR_PBR.map, 'images/tex/metal_floor_1k.jpg', '#6b7280'); swap(FLOOR_PBR.bumpMap, 'images/tex/metal_floor_bump_1k.jpg');
  FLOOR_PBR.map.repeat.set(30, 26); FLOOR_PBR.bumpMap.repeat.set(30, 26);
})();

function createHealthBarSprite(nameText, isBoss = false) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(isBoss ? 4.2 : 2.5, isBoss ? 1.05 : 0.65, 1);
  function update(hp, maxHp) {
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(2,6,23,0.82)'; ctx.fillRect(12, 8, 232, 46);
    ctx.strokeStyle = isBoss ? '#ef4444' : '#00f0ff'; ctx.lineWidth = 3; ctx.strokeRect(12, 8, 232, 46);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(nameText, 128, 28);
    const pct = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = '#1f2937'; ctx.fillRect(22, 35, 212, 12);
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : (pct > 0.25 ? '#facc15' : '#ef4444');
    ctx.fillRect(22, 35, Math.round(212 * pct), 12);
    tex.needsUpdate = true;
  }
  update(100, 100);
  return { sprite, update };
}

/** Quake Strogg-style biomechanical sentinel: flesh fused with gunmetal (guard vs heavy). */
function createDoomSentinel(armorHex = 0x3f2e1f, neonHex = 0xf59e0b, labelName = 'Sentinel', heavy = false) {
  const root = new THREE.Group();
  const scale = heavy ? 1.22 : 1.0;
  const armorMat = new THREE.MeshStandardMaterial({ color: armorHex, roughness: 0.48, metalness: 0.62 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.6, metalness: 0.5 });
  const fleshMat = new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.85, metalness: 0.08 });
  const sinewMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7, metalness: 0.15, emissive: 0x3b1510, emissiveIntensity: 0.15 });
  const glowMat = new THREE.MeshStandardMaterial({ color: neonHex, emissive: neonHex, emissiveIntensity: 2.8 });
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.35, metalness: 0.8 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 0.75, metalness: 0.4 });

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.78 * scale, 0.32 * scale, 0.5 * scale), darkMat);
  pelvis.position.y = 1.12 * scale; pelvis.castShadow = true; root.add(pelvis);

  const torso = new THREE.Group(); torso.position.y = 0.18 * scale; pelvis.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.05 * scale, 0.72 * scale, 0.62 * scale), armorMat);
  chest.position.y = 0.55 * scale; chest.castShadow = true; torso.add(chest);
  // chunky chest plate + reactor
  const fleshBelly = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.35 * scale, 0.2 * scale), fleshMat);
  fleshBelly.position.set(0, 0.28 * scale, 0.28 * scale); torso.add(fleshBelly);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 0.4 * scale, 0.12 * scale), darkMat);
  plate.position.set(0, 0.62 * scale, 0.34 * scale); torso.add(plate);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.1 * scale, 12), glowMat);
  core.rotation.x = Math.PI / 2; core.position.set(0, 0.55 * scale, 0.4 * scale); torso.add(core);
  // cables into flesh
  for (let i = -1; i <= 1; i += 2) {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.04 * scale, 0.55 * scale, 6), sinewMat);
    cable.position.set(i * 0.22 * scale, 0.4 * scale, 0.38 * scale); cable.rotation.x = 0.6; torso.add(cable);
  }
  // backpack / tubes
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 0.6 * scale, 0.32 * scale), darkMat);
  pack.position.set(0, 0.55 * scale, -0.42 * scale); torso.add(pack);
  for (let i = -1; i <= 1; i += 2) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.7 * scale, 8), rustMat);
    tube.position.set(i * 0.28 * scale, 0.7 * scale, -0.55 * scale); tube.rotation.x = 0.4; torso.add(tube);
  }
  // spikes
  for (let i = 0; i < (heavy ? 4 : 2); i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06 * scale, 0.35 * scale, 6), darkMat);
    spike.position.set((i % 2 ? 1 : -1) * (0.35 + (i > 1 ? 0.15 : 0)) * scale, 0.95 * scale, -0.2 * scale);
    spike.rotation.x = -0.9; torso.add(spike);
  }

  const headGroup = new THREE.Group(); headGroup.position.y = 1.05 * scale; torso.add(headGroup);
  const neckFlesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.16 * scale, 0.18 * scale, 8), fleshMat);
  neckFlesh.position.y = 0.02 * scale; headGroup.add(neckFlesh);
  const helm = new THREE.Mesh(new THREE.BoxGeometry(0.52 * scale, 0.48 * scale, 0.55 * scale), armorMat);
  helm.position.y = 0.22 * scale; helm.castShadow = true; headGroup.add(helm);
  // glowing eye slit
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.08 * scale, 0.06 * scale), glowMat);
  slit.position.set(0, 0.24 * scale, 0.28 * scale); headGroup.add(slit);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.1 * scale, 0.2 * scale), darkMat);
  brow.position.set(0, 0.38 * scale, 0.18 * scale); headGroup.add(brow);
  if (heavy) {
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.35 * scale, 0.5 * scale), glowMat);
    crest.position.set(0, 0.5 * scale, 0); headGroup.add(crest);
  }

  function buildArm(isRight) {
    const side = isRight ? 1 : -1;
    const armRoot = new THREE.Group(); armRoot.position.set(side * 0.62 * scale, 0.85 * scale, 0);
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry((heavy ? 0.48 : 0.36) * scale, 0.34 * scale, 0.42 * scale), armorMat);
    pauldron.position.set(side * 0.08 * scale, 0.06 * scale, 0); armRoot.add(pauldron);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.12 * scale, 0.48 * scale, 10), darkMat);
    upper.position.y = -0.28 * scale; armRoot.add(upper);
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.48 * scale, 0.26 * scale), armorMat);
    forearm.position.set(0, -0.68 * scale, 0.08 * scale); forearm.rotation.x = -0.3; armRoot.add(forearm);
    // arm-mounted cannon
    const cannon = new THREE.Group();
    const cBody = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.2 * scale, 0.7 * scale), gunMat);
    const cBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.04 * scale, 0.45 * scale, 8), glowMat);
    cBarrel.rotation.x = Math.PI / 2; cBarrel.position.z = 0.5 * scale;
    const cCell = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.12 * scale, 0.18 * scale), glowMat);
    cCell.position.set(0, 0.12 * scale, 0.1 * scale);
    cannon.add(cBody, cBarrel, cCell); cannon.position.set(0, -0.85 * scale, 0.4 * scale); armRoot.add(cannon);
    if (heavy && isRight) {
      const c2 = cannon.clone(); c2.position.y -= 0.12 * scale; c2.position.x = 0.12 * scale; armRoot.add(c2);
    }
    return armRoot;
  }
  const leftArm = buildArm(false); const rightArm = buildArm(true); torso.add(leftArm, rightArm);

  function buildLeg(isRight) {
    const side = isRight ? 1 : -1;
    const legRoot = new THREE.Group(); legRoot.position.set(side * 0.26 * scale, -0.1 * scale, 0);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.55 * scale, 0.32 * scale), armorMat);
    thigh.position.y = -0.3 * scale; legRoot.add(thigh);
    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.18 * scale, 0.28 * scale), glowMat);
    knee.position.set(0, -0.58 * scale, 0.06 * scale); legRoot.add(knee);
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.26 * scale, 0.55 * scale, 0.3 * scale), armorMat);
    shin.position.y = -0.88 * scale; legRoot.add(shin);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.2 * scale, (heavy ? 0.5 : 0.42) * scale), darkMat);
    boot.position.set(0, -1.15 * scale, 0.08 * scale); legRoot.add(boot);
    return legRoot;
  }
  const leftLeg = buildLeg(false); const rightLeg = buildLeg(true); pelvis.add(leftLeg, rightLeg);

  const hb = createHealthBarSprite(labelName, false);
  hb.sprite.position.set(0, 2.95 * scale, 0); root.add(hb.sprite);

  return { root, pelvis, torso, headGroup, leftArm, rightArm, leftLeg, rightLeg, armorMat, visorMat: glowMat, hb, heavy, scale };
}

function createCharacterRig(armorHex, neonHex, labelName) {
  // legacy alias → doom sentinel guard look
  return createDoomSentinel(armorHex, neonHex, labelName, false);
}

function createMinotaurBoss() {
  const root = new THREE.Group();
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x3b0a0a, roughness: 0.38, metalness: 0.65 });
  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.3, metalness: 0.8 });
  const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 2.6 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.4, metalness: 0.3 });
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.38, 0.62), bronzeMat); pelvis.position.y = 1.15; root.add(pelvis);
  const torso = new THREE.Group(); torso.position.y = 0.20; pelvis.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.85, 0.76), armorMat); chest.position.y = 0.56; chest.castShadow = true; torso.add(chest);
  const furnaceCore = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16), lavaMat); furnaceCore.rotation.x = Math.PI / 2; furnaceCore.position.set(0, 0.58, 0.36); torso.add(furnaceCore);
  const headGroup = new THREE.Group(); headGroup.position.set(0, 1.12, 0.10); torso.add(headGroup);
  headGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.66), armorMat));
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.45), bronzeMat); snout.position.set(0, -0.08, 0.44); headGroup.add(snout);
  const noseRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), lavaMat); noseRing.position.set(0, -0.18, 0.68); headGroup.add(noseRing);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), lavaMat); eyeL.position.set(-0.18, 0.08, 0.32);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.18; headGroup.add(eyeL, eyeR);
  function buildHorn(side) {
    const hGroup = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.45, 10), hornMat); base.rotation.z = side * -1.1; base.position.set(side * 0.42, 0.18, 0);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 10), hornMat); tip.rotation.x = 0.55; tip.position.set(side * 0.65, 0.42, 0.18);
    hGroup.add(base, tip); return hGroup;
  }
  headGroup.add(buildHorn(-1), buildHorn(1));
  function buildBossArm(isRight) {
    const side = isRight ? 1 : -1; const arm = new THREE.Group(); arm.position.set(side * 0.82, 0.78, 0);
    arm.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.48), bronzeMat));
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.55, 10), armorMat); upper.position.y = -0.35; arm.add(upper);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 0.28), bronzeMat); lower.position.set(0, -0.75, 0.12); lower.rotation.x = -0.4; arm.add(lower);
    if (isRight) {
      const axe = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.85, 8), bronzeMat); shaft.rotation.x = Math.PI / 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.55), lavaMat); blade.position.set(0, 0, 0.68);
      axe.add(shaft, blade); axe.position.set(0, -0.95, 0.55); arm.add(axe);
    }
    return arm;
  }
  const leftArm = buildBossArm(false); const rightArm = buildBossArm(true); torso.add(leftArm, rightArm);
  function buildBossLeg(isRight) {
    const side = isRight ? 1 : -1; const leg = new THREE.Group(); leg.position.set(side * 0.34, -0.12, 0);
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.56, 0.38), armorMat); thigh.position.y = -0.28;
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.54, 0.32), bronzeMat); shin.position.y = -0.78;
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.20, 0.48), lavaMat); hoof.position.set(0, -1.04, 0.06);
    leg.add(thigh, shin, hoof); return leg;
  }
  const leftLeg = buildBossLeg(false); const rightLeg = buildBossLeg(true); pelvis.add(leftLeg, rightLeg);
  const hb = createHealthBarSprite('👹 CYBER-MINOTAUR OVERLORD', true); hb.sprite.position.set(0, 3.25, 0); root.add(hb.sprite);
  root.scale.set(STATE.bossScale, STATE.bossScale, STATE.bossScale);
  return { root, pelvis, torso, headGroup, leftArm, rightArm, leftLeg, rightLeg, armorMat, visorMat: lavaMat, hb };
}

function buildRigFromMeshyTemplate(tpl, labelName, isBoss = false) {
  const root = new THREE.Group();
  const clone = (THREE.SkeletonUtils && THREE.SkeletonUtils.clone) ? THREE.SkeletonUtils.clone(tpl.scene) : tpl.scene.clone(true);
  root.add(clone);
  let primaryMat = new THREE.MeshStandardMaterial({ color: 0x5c4030 });
  clone.traverse(c => {
    if (c.isMesh) c.frustumCulled = false;
    if (c.isMesh && c.material) {
      c.material = c.material.clone(); brightenMat(c.material);
      if (!c.material.emissive) c.material.emissive = new THREE.Color(0x000000);
      primaryMat = c.material; c.castShadow = true; c.receiveShadow = true;
    }
  });
  const h = tpl.targetHeight || 2.2;
  const hb = createHealthBarSprite(labelName, isBoss);
  hb.sprite.position.set(0, h + 0.55, 0); root.add(hb.sprite);
  let mixer = null;
  if (tpl.animations && tpl.animations.length > 0) {
    mixer = new THREE.AnimationMixer(clone);
    const clip = tpl.animations.find(a => /walk|run|move|Armature/i.test(a.name)) || tpl.animations[0];
    const action = mixer.clipAction(clip);
    action.play();
  }
  return {
    root, pelvis: root, torso: root, leftArm: root, rightArm: root, leftLeg: root, rightLeg: root,
    armorMat: primaryMat, hb, mixer,
    hitRadius: tpl.hitRadius || Math.max(0.7, h * 0.32),
    hitHeight: tpl.hitHeight || h * 1.05
  };
}

// ============================================================================
// ARENA, ENVIRONMENT DETAIL, PULSE CANNON VIEWMODEL, MESHY AUTO-LOADER
// ============================================================================
const arenaGroup = new THREE.Group();
scene.add(arenaGroup);
let colliders = [];
let walkableSurfaces = [];
let sirenBeaconMeshes = [];
let sirenActiveTimer = 0;
let BOTS = [];
let PROJECTILES = [];
let GRENADES = [];
let NAPALM_POOLS = [];
let FLAME_PARTICLES = [];
let PICKUPS = [];
let ACCESS_KEY = null;
let MESHY_MODELS = [];
let ELEVATOR_STATE = { x: 0, z: -68, doorsOpen: false, doorLeft: null, doorRight: null, progress: 0 };
let gunMesh = null;
let muzzleAnchor = null;
let weaponGlowMats = [];

function registerCollider(minX, maxX, minY, maxY, minZ, maxZ) {
  colliders.push({ minX, maxX, minY, maxY, minZ, maxZ });
}
function registerWalkableSurface(minX, maxX, minZ, maxZ, yStart, yEnd, axis = 'flat') {
  walkableSurfaces.push({ minX, maxX, minZ, maxZ, yStart, yEnd, axis });
}
function getGroundHeightAt(x, z, currentY = 0) {
  let highest = 0;
  for (let i = 0; i < walkableSurfaces.length; i++) {
    const s = walkableSurfaces[i];
    if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ) {
      let surfaceY = s.yStart;
      if (s.axis === 'z') {
        const t = (z - s.minZ) / Math.max(0.01, s.maxZ - s.minZ);
        surfaceY = s.yStart + t * (s.yEnd - s.yStart);
      } else if (s.axis === 'x') {
        const t = (x - s.minX) / Math.max(0.01, s.maxX - s.minX);
        surfaceY = s.yStart + t * (s.yEnd - s.yStart);
      }
      if (currentY + 1.6 >= surfaceY && surfaceY > highest) highest = surfaceY;
    }
  }
  return highest;
}

function createWall(x, z, w, d, h = 9, y = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    map: WALL_PBR.map, bumpMap: WALL_PBR.bumpMap, bumpScale: 0.1,
    color: 0xb8a090, roughness: 0.62, metalness: 0.28
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + h / 2, z); mesh.castShadow = true; mesh.receiveShadow = true;
  arenaGroup.add(mesh);
  registerCollider(x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2);
}

// Round 17: text planes read correctly from BOTH sides. A DoubleSide plane shows its back face
// mirrored, so instead render the front single-sided and add a back twin turned 180° (its own front).
function twoSidedText(m, gap = 0.012) {
  m.material.side = THREE.FrontSide;
  const back = new THREE.Mesh(m.geometry, m.material); back.rotation.y = Math.PI; back.position.z = -gap; back.userData.signTwin = true; m.add(back); m.userData.textPlane = true; return m;
}
function addWallSign(x, y, z, rotY, title, subtitle, accentColor = '#f59e0b') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a120c'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = accentColor; ctx.lineWidth = 6; ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = accentColor; ctx.font = '900 34px sans-serif'; ctx.fillText(title, 22, 54);
  ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(subtitle, 22, 96);
  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.9), new THREE.MeshBasicMaterial({ map: tex }));
  mesh.position.set(x, y, z); mesh.rotation.y = rotY; twoSidedText(mesh); arenaGroup.add(mesh);
}

function createSecurityElevator(x, z) {
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2218, metalness: 0.75, roughness: 0.35 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(8, 7.5, 5), frameMat);
  frame.position.set(x, 3.75, z); arenaGroup.add(frame);
  const padMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 1.5 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.2, 24), padMat);
  pad.position.set(x, 0.1, z + 1.2); arenaGroup.add(pad);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, metalness: 0.7, roughness: 0.4 });
  const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(3.2, 6.2, 0.35), doorMat);
  const doorRight = doorLeft.clone();
  doorLeft.position.set(x - 1.6, 3.1, z + 2.4);
  doorRight.position.set(x + 1.6, 3.1, z + 2.4);
  arenaGroup.add(doorLeft, doorRight);
  ELEVATOR_STATE = { x, z: z + 1.2, doorsOpen: false, doorLeft, doorRight, doorMat, progress: 0 };
}

function spawnAccessKey(x, z) {
  if (ACCESS_KEY) arenaGroup.remove(ACCESS_KEY.group);
  const group = new THREE.Group();
  const card = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.12), new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 2.2 }));
  card.position.y = 1.4;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 14, 16), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.28 }));
  beam.position.y = 7; group.add(card, beam); group.position.set(x, 0, z); arenaGroup.add(group);
  ACCESS_KEY = { group, card, x, z };
}

function addPipeRun(x1, z1, x2, z2, y, radius = 0.18, color = 0x4a3b2a) {
  const dx = x2 - x1, dz = z2 - z1; const len = Math.hypot(dx, dz) || 0.01;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.65 });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), mat);
  pipe.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
  pipe.rotation.z = Math.PI / 2;
  pipe.rotation.y = Math.atan2(dz, dx);
  arenaGroup.add(pipe);
}

let POOL_TEX = null;
function poolTexture() {
  if (POOL_TEX) return POOL_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); POOL_TEX = new THREE.CanvasTexture(c); return POOL_TEX;
}
let LIGHT_COUNT = 0;
// a pool of coloured light: real point light (limited on mobile) + fake floor pool + volumetric cone + glowing fixture
function addHangingLight(x, y, z, color = 0xffaa66, intensity = 1.2, distance = 18) {
  const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 0.4, 10), new THREE.MeshStandardMaterial({ color: 0x1f1610, metalness: 0.7, roughness: 0.4 }));
  fixture.position.set(x, y, z); arenaGroup.add(fixture);
  const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 14), new THREE.MeshBasicMaterial({ color })); bulb.position.set(x, y - 0.22, z); arenaGroup.add(bulb);
  const realOK = !IS_COARSE || LIGHT_COUNT < 4; LIGHT_COUNT++;
  if (realOK) {
    const pl = new THREE.PointLight(color, intensity, distance, 1.6);
    pl.position.set(x, y - 0.6, z); arenaGroup.add(pl);
    ARENA_LIGHTS.push({ light: pl, base: intensity, phase: Math.random() * Math.PI * 2, flicker: Math.random() < 0.3 });
  }
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(distance * 0.95, distance * 0.95), new THREE.MeshBasicMaterial({ color, map: poolTexture(), transparent: true, opacity: realOK ? 0.22 : 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.04, z); arenaGroup.add(pool);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(distance * 0.28, y - 0.4, 18, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  cone.position.set(x, (y - 0.4) / 2, z); arenaGroup.add(cone);
}
// emissive light strips along the outer walls + lit exit doorway
// fresnel rim light so enemies read against the dark
function applyRim(root, color = 0xffb070, strength = 0.75) {
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
      if (m.userData._rim || !m.isMeshStandardMaterial) return; m.userData._rim = true;
      const rc = new THREE.Color(color); m.userData.rimC = rc; m.userData.rimC0 = rc.clone();
      m.onBeforeCompile = sh => {
        sh.uniforms.rimColor = { value: rc }; sh.uniforms.rimStr = { value: strength };
        sh.fragmentShader = 'uniform vec3 rimColor; uniform float rimStr;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '{ float rr = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0); gl_FragColor.rgb += rimColor * pow(rr, 2.2) * rimStr; }\n#include <dithering_fragment>');
      };
      m.customProgramCacheKey = () => 'rim' + color; m.needsUpdate = true;
    });
  });
}
function addLightStrips(floor) {
  const cols = [0xff8a2a, 0x2aa8ff, 0xff8a2a, 0xff3030];
  const c = cols[floor] || 0xff8a2a;
  const mat = new THREE.MeshBasicMaterial({ color: c });
  const matHi = new THREE.MeshBasicMaterial({ color: 0x9ad8ff });
  [[0, -83.4, 176, 0.2], [0, 83.4, 176, 0.2]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), mat); m.position.set(x, 0.35, z); arenaGroup.add(m); const m2 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), matHi); m2.position.set(x, 9.2, z); arenaGroup.add(m2); });
  [[-88.4, 0], [88.4, 0]].forEach(([x, z]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 166), mat); m.position.set(x, 0.35, z); arenaGroup.add(m); const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 166), matHi); m2.position.set(x, 9.2, z); arenaGroup.add(m2); });
  // exit doorway glow
  const ex = FLOOR_INFO.exit; const dl = new THREE.PointLight(0x3dff9a, 2.2, 22, 1.6); dl.position.set(ex.x, 4, ex.z + 4); arenaGroup.add(dl);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 0.25), new THREE.MeshBasicMaterial({ color: 0x3dff9a })); frame.position.set(ex.x, 6.2, ex.z + 1.2); arenaGroup.add(frame);
}

function addBarrel(x, z) {
  if (MESHY_TEMPLATES.props.barrel) {
    const c = MESHY_TEMPLATES.props.barrel.scene.clone(true);
    c.position.set(x, 0, z); arenaGroup.add(c);
    registerCollider(x - 0.55, x + 0.55, 0, 1.1, z - 0.55, z + 0.55);
    return;
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0x3d4a28, roughness: 0.55, metalness: 0.55 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14), mat);
  b.position.set(x, 0.55, z); arenaGroup.add(b);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 16), new THREE.MeshStandardMaterial({ color: 0x5c4030, metalness: 0.7, roughness: 0.4 }));
  rim.rotation.x = Math.PI / 2; rim.position.set(x, 1.05, z); arenaGroup.add(rim);
  registerCollider(x - 0.55, x + 0.55, 0, 1.1, z - 0.55, z + 0.55);
}

function addDebris(x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a4035, roughness: 0.8, metalness: 0.3 });
  for (let i = 0; i < 3; i++) {
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.3 + Math.random() * 0.5, 0.08, 0.2 + Math.random() * 0.4), mat);
    bit.position.set(x + (Math.random() - 0.5) * 1.5, 0.05, z + (Math.random() - 0.5) * 1.5);
    bit.rotation.y = Math.random() * Math.PI; arenaGroup.add(bit);
  }
}

function addSteamVent(x, z) {
  if (MESHY_TEMPLATES.props.pipe_vent) {
    const c = MESHY_TEMPLATES.props.pipe_vent.scene.clone(true);
    c.position.set(x, 0, z); arenaGroup.add(c);
  } else {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.4, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a3228, metalness: 0.7, roughness: 0.4 })
    );
    base.position.set(x, 0.25, z); arenaGroup.add(base);
  }
  STEAM_PARTICLES.push({ x, z, y: 0.6, t: Math.random() * 10, meshes: [] });
}

function addPuddle(x, z, r = 1.8) {
  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(r, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.95, roughness: 0.15, transparent: true, opacity: 0.55 })
  );
  puddle.rotation.x = -Math.PI / 2; puddle.position.set(x, 0.02, z); arenaGroup.add(puddle);
}

function renderLegacyObject(obj, steelMat) {
  const hazardMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.45, metalness: 0.5 });
  {
    const col = new THREE.Color(obj.color || '#f59e0b');
    const w = obj.w || 3, d = obj.d || 3, h = obj.h || 4;
    const x = obj.x, z = obj.z;
    if (obj.type === 'sign') { addWallSign(x, 5.2, z, obj.rot || 0, obj.title || 'SECTOR SIGN', obj.sub || 'MOSES PROTOCOL', obj.color || '#f59e0b'); return; }
    if (obj.type === 'catwalk') {
      const group = new THREE.Group(); const deckY = h;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.32, d), steelMat); deck.position.y = deckY - 0.16; group.add(deck);
      const railA = new THREE.Mesh(new THREE.BoxGeometry(d >= w ? 0.14 : w, 1.1, d >= w ? d : 0.14), hazardMat);
      const railB = railA.clone();
      if (d >= w) { railA.position.set(-w / 2 + 0.08, deckY + 0.5, 0); railB.position.set(w / 2 - 0.08, deckY + 0.5, 0); }
      else { railA.position.set(0, deckY + 0.5, d / 2 - 0.08); railB.position.set(0, deckY + 0.5, -d / 2 + 0.08); }
      group.add(railA, railB); group.position.set(x, 0, z); arenaGroup.add(group);
      registerWalkableSurface(x - w / 2, x + w / 2, z - d / 2, z + d / 2, deckY, deckY, 'flat');
      if (obj.hasRampSouth) {
        registerWalkableSurface(x - w / 2, x + w / 2, z + d / 2, z + d / 2 + 11, deckY, 0, 'z');
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.28, Math.hypot(11, deckY)), steelMat);
        ramp.position.set(x, deckY / 2, z + d / 2 + 5.5); ramp.rotation.x = Math.atan2(deckY, 11); arenaGroup.add(ramp);
      }
      if (obj.hasRampNorth) {
        registerWalkableSurface(x - w / 2, x + w / 2, z - d / 2 - 11, z - d / 2, 0, deckY, 'z');
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.28, Math.hypot(11, deckY)), steelMat);
        ramp.position.set(x, deckY / 2, z - d / 2 - 5.5); ramp.rotation.x = -Math.atan2(deckY, 11); arenaGroup.add(ramp);
      }
      return;
    }
    if (obj.type === 'tower') {
      const group = new THREE.Group(); group.position.set(x, 0, z);
      [[-w / 2 + 0.35, -d / 2 + 0.35], [w / 2 - 0.35, -d / 2 + 0.35], [-w / 2 + 0.35, d / 2 - 0.35], [w / 2 - 0.35, d / 2 - 0.35]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.5), steelMat);
        leg.position.set(lx, h / 2, lz); group.add(leg);
        registerCollider(x + lx - 0.28, x + lx + 0.28, 0, h, z + lz - 0.28, z + lz + 0.28);
      });
      const platform = new THREE.Mesh(new THREE.BoxGeometry(w, 0.36, d), steelMat); platform.position.y = h - 0.18; group.add(platform);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), new THREE.MeshBasicMaterial({ color: col }));
      beacon.position.y = h + 3.5; group.add(beacon); sirenBeaconMeshes.push(beacon);
      arenaGroup.add(group);
      registerWalkableSurface(x - w / 2, x + w / 2, z - d / 2, z + d / 2, h, h, 'flat');
      return;
    }
    const group = new THREE.Group();
    if (obj.type === 'server') {
      if (MESHY_TEMPLATES.props.server_rack) {
        const c = MESHY_TEMPLATES.props.server_rack.scene.clone(true);
        group.add(c);
      } else {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x1a1510, metalness: 0.75, roughness: 0.3 }));
        rack.position.y = h / 2;
        const led = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.75, d + 0.06), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.2 }));
        led.position.y = h / 2; group.add(rack, led);
      }
    } else if (obj.type === 'emp' || obj.type === 'coil') {
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 16), new THREE.MeshStandardMaterial({ color: 0x2a2218, metalness: 0.8, roughness: 0.2 }));
      cyl.position.y = h / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.58, 0.18, 10, 24), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.0 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = h * 0.55; group.add(cyl, ring);
    } else if (obj.type === 'cryo') {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 16), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, transparent: true, opacity: 0.78 }));
      pod.position.y = h / 2; group.add(pod);
    } else if (obj.type === 'ibeam') {
      const web = new THREE.Mesh(new THREE.BoxGeometry(w * 0.28, h, d * 0.92), steelMat); web.position.y = h / 2;
      const f1 = new THREE.Mesh(new THREE.BoxGeometry(w, h, d * 0.22), steelMat); f1.position.set(0, h / 2, d * 0.38);
      const f2 = f1.clone(); f2.position.z = -d * 0.38; group.add(web, f1, f2);
    } else if (obj.type === 'crate' && MESHY_TEMPLATES.props.crate) {
      group.add(MESHY_TEMPLATES.props.crate.scene.clone(true));
    } else {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: WALL_PBR.map, bumpMap: WALL_PBR.bumpMap, bumpScale: 0.05, color: col, roughness: 0.55, metalness: 0.4 }));
      box.position.y = h / 2; group.add(box);
    }
    group.position.set(x, 0, z); group.rotation.y = obj.rot || 0; arenaGroup.add(group);
    registerCollider(x - w / 2, x + w / 2, 0, h, z - d / 2, z + d / 2);
  
  }
}

// ============================================================================
// DATA CENTER 09 — FLOOR SYSTEM (9 levels × G + B1..B3)
// ============================================================================
const FLOOR_NAMES = ['G', 'B1', 'B2', 'B3'];
const FLOOR_THEMES = [
  { key: 'lobby', title: 'GROUND · SECURITY & SERVER HALL G', light: 0xdfe8ff },
  { key: 'farm', title: 'B1 · SERVER FARM', light: 0x9fd8ff },
  { key: 'plant', title: 'B2 · COOLING & GENERATOR PLANT', light: 0xffc48a },
  { key: 'vault', title: 'B3 · ARCHIVE VAULT & CORE', light: 0xff9a9a }
];
let FLOOR_INFO = { start: { x: 0, z: 78, yaw: 0 }, exit: { x: 0, z: -76 }, spawnZone: { minX: -80, maxX: 80, minZ: -70, maxZ: 30 } };
let CELL_DOOR = null;
let BLINK_MATS = [];
let COLOSSUS = null;
let HACK_TIMER = 0;

function seededRng(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; };
}

const RACK_TEX = (() => {
  // two LED states stacked vertically -> blink by toggling offset.y
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const x = c.getContext('2d');
  for (let half = 0; half < 2; half++) {
    const oy = half * 128;
    x.fillStyle = '#15191f'; x.fillRect(0, oy, 128, 128);
    x.strokeStyle = '#3b4250'; x.lineWidth = 3; x.strokeRect(2, oy + 2, 124, 124);
    for (let u = 0; u < 14; u++) {
      const y = oy + 6 + u * 8.6;
      x.fillStyle = u % 4 === 0 ? '#2a303a' : '#1f242c'; x.fillRect(8, y, 112, 7);
      for (let l = 0; l < 6; l++) {
        const on = ((u * 7 + l * 3 + half * 5) % 5) < 2;
        x.fillStyle = on ? (l % 3 === 0 ? '#34d399' : (l % 3 === 1 ? '#38bdf8' : '#fbbf24')) : '#0b0d10';
        x.fillRect(84 + l * 5, y + 2, 3, 3);
      }
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();
const CABINET_TEX = (() => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#8b8f86'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4; i++) { x.fillStyle = '#767a72'; x.fillRect(6, 6 + i * 30, 116, 26); x.fillStyle = '#e5e7eb'; x.fillRect(52, 14 + i * 30, 24, 8); x.fillStyle = '#3f3f46'; x.fillRect(56, 24 + i * 30, 16, 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();

function signTexture(title, sub, accent, bg = '#0f141b') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 160);
  x.strokeStyle = accent; x.lineWidth = 8; x.strokeRect(6, 6, 500, 148);
  x.fillStyle = accent; x.font = '900 52px sans-serif'; x.textAlign = 'center'; x.fillText(title, 256, 74);
  if (sub) { x.fillStyle = '#e5e7eb'; x.font = 'bold 26px sans-serif'; x.fillText(sub, 256, 124); }
  return new THREE.CanvasTexture(c);
}
function addSign(x, y, z, rotY, title, sub, accent = '#facc15', w = 6) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.3125), new THREE.MeshBasicMaterial({ map: signTexture(title, sub, accent), side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = rotY; twoSidedText(m); arenaGroup.add(m); return m;
}

function cloneProp(key) {
  const tpl = MESHY_TEMPLATES.props[key];
  if (!tpl) return null;
  const c = tpl.scene.clone(true);
  c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return c;
}
function placeObject(group, x, y, z, rot) { group.position.set(x, y || 0, z); group.rotation.y = rot || 0; arenaGroup.add(group); return group; }
function aabbCollider(x, z, w, d, h, rot, y0 = 0) {
  const swap = Math.abs(Math.sin(rot || 0)) > 0.7; const W = swap ? d : w, D = swap ? w : d;
  registerCollider(x - W / 2, x + W / 2, y0, y0 + h, z - D / 2, z + D / 2);
}
function boxMesh(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.6, metalness: opts.metal ?? 0.35, emissive: opts.emissive || 0x000000, emissiveIntensity: opts.ei || 0 }));
  m.castShadow = true; m.receiveShadow = true; return m;
}

// --- prop builders (Meshy first, procedural fallback) ---
const PROP_BUILDERS = {
  rackrow(o) {
    const len = o.w, dep = o.d || 1.2, h = o.h || 2.4;
    const g = new THREE.Group();
    const tex = RACK_TEX.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, Math.round(len / 0.75)), 0.5);
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.5, metalness: 0.5 });
    const side = new THREE.MeshStandardMaterial({ color: 0x1b2028, roughness: 0.5, metalness: 0.6 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, h, dep), [side, side, side, side, mat, mat]);
    m.position.y = h / 2; m.castShadow = true; m.receiveShadow = true; g.add(m);
    const top = boxMesh(len, 0.12, dep + 0.1, 0x2b3240, { metal: 0.7 }); top.position.y = h + 0.06; g.add(top);
    BLINK_MATS.push({ tex, phase: Math.random() * 10, rate: 0.6 + Math.random() * 1.4 });
    // Meshy rack caps at row ends
    [-1, 1].forEach(s => {
      const r = cloneProp('server_rack');
      if (r) { r.position.set(s * (len / 2 + 0.45), 0, 0); r.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(r); }
    });
    // overhead cable tray
    if (o.tray) { const tray = boxMesh(len, 0.12, 0.7, 0x6b7280, { metal: 0.8 }); tray.position.y = h + 1.1; g.add(tray); const cab = boxMesh(len, 0.1, 0.5, 0x1f2937); cab.position.y = h + 1.2; g.add(cab); }
    return { g, collide: [len + (MESHY_TEMPLATES.props.server_rack ? 1.6 : 0), dep, h] };
  },
  desk(o) {
    const g = new THREE.Group(); const p = cloneProp('security_desk');
    if (p) g.add(p); else {
      const top = boxMesh(3.2, 0.1, 1.2, 0x9ca3af, { metal: 0.5 }); top.position.y = 1.05; g.add(top);
      const front = boxMesh(3.2, 1.05, 0.12, 0x4b5563); front.position.set(0, 0.52, 0.55); g.add(front);
      const s1 = boxMesh(0.12, 1.05, 1.2, 0x4b5563); s1.position.set(-1.55, 0.52, 0); const s2 = s1.clone(); s2.position.x = 1.55; g.add(s1, s2);
    }
    return { g, collide: [3.2, 1.4, 1.1] };
  },
  chair(o) {
    const g = new THREE.Group(); const p = cloneProp('office_chair');
    if (p) g.add(p); else {
      const seat = boxMesh(0.6, 0.1, 0.6, 0x111827); seat.position.y = 0.5; const back = boxMesh(0.6, 0.7, 0.08, 0x111827); back.position.set(0, 0.9, -0.28);
      const post = boxMesh(0.06, 0.45, 0.06, 0x6b7280); post.position.y = 0.25; g.add(seat, back, post);
    }
    return { g, collide: null };
  },
  monitors(o) {
    const g = new THREE.Group(); const p = cloneProp('desk_monitors');
    if (p) g.add(p);
    // always add glowing CCTV screens so it reads as security at a glance
    const scr = new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: 0x60a5fa, emissiveIntensity: 0.9 });
    for (let i = -1; i <= 1; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.34), scr); s.position.set(i * 0.6, 0.45 + (p ? 0.05 : 0), 0.18); s.rotation.y = -i * 0.25; g.add(s); if (!p) { const b = boxMesh(0.6, 0.4, 0.06, 0x111111); b.position.set(i * 0.6, 0.45, 0.14); b.rotation.y = -i * 0.25; g.add(b); } }
    return { g, collide: null };
  },
  cabinet(o) {
    const g = new THREE.Group(); const p = cloneProp('filing_cabinet');
    if (p) g.add(p); else { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.7), new THREE.MeshStandardMaterial({ map: CABINET_TEX, roughness: 0.6, metalness: 0.4 })); b.position.y = 0.65; g.add(b); }
    return { g, collide: [1.0, 0.8, 1.3] };
  },
  cabinetrow(o) {
    const len = o.w, g = new THREE.Group();
    const tex = CABINET_TEX.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, Math.round(len / 0.9)), 1);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.4 });
    const side = new THREE.MeshStandardMaterial({ color: 0x6b6f68, roughness: 0.6, metalness: 0.4 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, o.h || 2.0, o.d || 0.9), [side, side, side, side, mat, mat]);
    m.position.y = (o.h || 2.0) / 2; m.castShadow = true; m.receiveShadow = true; g.add(m);
    const c = cloneProp('filing_cabinet'); if (c) { c.position.set(len / 2 + 0.6, 0, 0); g.add(c); }
    return { g, collide: [len + (c ? 1.2 : 0), o.d || 0.9, o.h || 2.0] };
  },
  crac(o) {
    const g = new THREE.Group(); const p = cloneProp('cooling_unit');
    if (p) g.add(p); else {
      const b = boxMesh(2.2, 2.1, 1.0, 0xd1d5db, { metal: 0.3 }); b.position.y = 1.05; g.add(b);
      for (let i = 0; i < 3; i++) { const gr = boxMesh(1.8, 0.35, 0.04, 0x1f2937); gr.position.set(0, 0.5 + i * 0.5, 0.52); g.add(gr); }
      const disp = boxMesh(0.4, 0.2, 0.03, 0x0b1220, { emissive: 0x22d3ee, ei: 1.2 }); disp.position.set(0.6, 1.85, 0.52); g.add(disp);
    }
    return { g, collide: [2.4, 1.2, 2.1] };
  },
  ups(o) {
    const g = new THREE.Group(); const p = cloneProp('ups_cabinet');
    if (p) g.add(p); else {
      const b = boxMesh(1.2, 1.9, 0.9, 0x374151, { metal: 0.5 }); b.position.y = 0.95; g.add(b);
      const lab = boxMesh(0.5, 0.25, 0.02, 0xfacc15); lab.position.set(0, 1.4, 0.46); const led = boxMesh(0.3, 0.06, 0.02, 0x22c55e, { emissive: 0x22c55e, ei: 2 }); led.position.set(0, 1.7, 0.46); g.add(lab, led);
    }
    return { g, collide: [1.3, 1.0, 1.9] };
  },
  celldoorprop(o) {
    const g = new THREE.Group(); const p = cloneProp('cell_door');
    if (p) g.add(p); else { for (let i = 0; i < 9; i++) { const b = boxMesh(0.08, 3.6, 0.08, 0x4b5563, { metal: 0.85 }); b.position.set(-1.2 + i * 0.3, 1.8, 0); g.add(b); } }
    return { g, collide: null };
  },
  bench(o) {
    const g = new THREE.Group(); const p = cloneProp('cell_bench');
    if (p) g.add(p); else { const s = boxMesh(2.0, 0.1, 0.6, 0x6b7280, { metal: 0.7 }); s.position.y = 0.5; const l1 = boxMesh(0.08, 0.5, 0.5, 0x4b5563); l1.position.set(-0.85, 0.25, 0); const l2 = l1.clone(); l2.position.x = 0.85; g.add(s, l1, l2); }
    return { g, collide: [2.0, 0.7, 0.6] };
  },
  terminal(o) {
    const g = new THREE.Group(); const p = cloneProp('wall_terminal');
    if (p) { p.position.y = 0.9; g.add(p); }
    const scr = boxMesh(0.5, 0.4, 0.06, 0x0b1220, { emissive: o.color ? new THREE.Color(o.color) : 0x22d3ee, ei: 1.6 }); scr.position.set(0, 1.5, 0.12); g.add(scr);
    if (!p) { const h = boxMesh(0.62, 0.9, 0.16, 0x1f2937, { metal: 0.6 }); h.position.y = 1.35; g.add(h); }
    return { g, collide: null };
  },
  extinguisher(o) {
    const g = new THREE.Group();
    const px = cloneProp('ph_extinguisher'); if (px) { px.position.set(0, 0.82, 0.12); g.add(px); const br = boxMesh(0.34, 0.06, 0.16, 0x1f2937, { metal: 0.7 }); br.position.set(0, 1.14, 0.04); g.add(br); const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: signTexture('FIRE', 'EXTINGUISHER', '#ef4444') })); tag.position.set(0, 1.75, 0.02); twoSidedText(tag, 0.006); g.add(tag); return { g, collide: null }; }
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 10), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.3 })); b.position.y = 1.1; g.add(b);
    const n = boxMesh(0.06, 0.12, 0.06, 0x111111); n.position.y = 1.46; g.add(n);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: signTexture('FIRE', 'EXTINGUISHER', '#ef4444') })); tag.position.set(0, 1.75, 0.02); twoSidedText(tag, 0.006); g.add(tag);
    return { g, collide: null };
  },
  seccam(o) {
    const g = new THREE.Group(); const c = cloneProp('ph_camera');
    if (c) { c.position.set(0, o.camY || 3.6, 0.15); c.rotation.x = 0.3; g.add(c); }
    else { const b = boxMesh(0.18, 0.16, 0.4, 0xd1d5db); b.position.set(0, o.camY || 3.6, 0.25); g.add(b); }
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); led.position.set(0.08, (o.camY || 3.6) + 0.08, 0.32); g.add(led);
    return { g, collide: null };
  },
  powerbox(o) {
    const g = new THREE.Group(); const c = cloneProp('ph_powerbox');
    if (c) { c.position.set(0, 0.95, 0.05); c.traverse(m => { if (m.isMesh && m.material) { m.material = m.material.clone(); m.material.color && m.material.color.setHex(0x5a6070); m.material.metalness = 0.4; m.material.roughness = 0.75; } }); g.add(c); } else { const b = boxMesh(0.6, 0.9, 0.25, 0x6b7280); b.position.set(0, 1.4, 0.12); g.add(b); }
    return { g, collide: null };
  },
  airduct(o) {
    const g = new THREE.Group(); const len = o.len || 12, y = o.ductY || 5.2;
    const tpl = MESHY_TEMPLATES.props.ph_airduct;
    if (tpl) { const s = new THREE.Vector3(); new THREE.Box3().setFromObject(tpl.scene).getSize(s); const seg = Math.max(0.5, Math.max(s.x, s.z)); const along = s.x >= s.z;
      for (let d = -len / 2 + seg / 2; d <= len / 2; d += seg) { const c = cloneProp('ph_airduct'); c.position.set(0, y - 0.35, d); if (along) c.rotation.y = Math.PI / 2; g.add(c); } }
    else { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, len, 12), new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.8, roughness: 0.35 })); m.rotation.x = Math.PI / 2; m.position.y = y; g.add(m); }
    return { g, collide: null };
  },
  generator(o) {
    const g = new THREE.Group(); const w = o.w || 5, h = o.h || 4;
    const body = boxMesh(w, h, w * 0.6, 0x3f4a3c, { metal: 0.6 }); body.position.y = h / 2; g.add(body);
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.22, w * 0.22, 0.2, 18), new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7 })); fan.rotation.x = Math.PI / 2; fan.position.set(0, h * 0.55, w * 0.3 + 0.1); g.add(fan);
    const stripe = boxMesh(w + 0.02, 0.25, w * 0.6 + 0.02, 0xfacc15); stripe.position.y = 0.5; g.add(stripe);
    const lamp = boxMesh(0.3, 0.3, 0.3, 0xf97316, { emissive: 0xf97316, ei: 2 }); lamp.position.set(w / 2 - 0.4, h + 0.15, 0); g.add(lamp);
    return { g, collide: [w, w * 0.6, h] };
  },
  colossus(o) {
    const g = buildColossus(o.h || 24, { mini: !!o.mini }); const C = COLOSSI[COLOSSI.length - 1]; const rr = C.rad;
    C.col = { minX: o.x - rr, maxX: o.x + rr, minY: 0, maxY: (o.h || 24) + 2, minZ: o.z - rr, maxZ: o.z + rr, dyn: true }; colliders.push(C.col);
    return { g, collide: null };
  },
  pipevent(o) {
    const g = new THREE.Group(); const p = cloneProp('pipe_vent'); if (p) g.add(p); else { const b = boxMesh(0.8, 1.2, 0.8, 0x4a3b2a, { metal: 0.7 }); b.position.y = 0.6; g.add(b); }
    STEAM_PARTICLES.push({ x: o.x, z: o.z, y: 1.3, t: Math.random() * 10, meshes: [] });
    return { g, collide: [1.0, 1.0, 1.3] };
  }
};

let COLOSSUS_BOLTS = [];
let COLOSSI = [];
let EMP_ARCS = [];
// ---------- voice ----------
const VOICE = { listener: null, buffers: {}, loading: false };
function initVoice() {
  if (VOICE.listener || typeof THREE.AudioListener !== 'function') return;
  try {
    VOICE.listener = new THREE.AudioListener(); camera.add(VOICE.listener);
    const loader = new THREE.AudioLoader();
    [['main', 'audio/colossus_voice.mp3'], ['mini', 'audio/mini_colossus_voice.mp3'], ...['distress', 'sanitation', 'loved'].flatMap(k => [['main_' + k, `audio/colossus_${k}.mp3`], ['mini_' + k, `audio/mini_colossus_${k}.mp3`]])].forEach(([k, url]) =>
      loader.load(url, buf => { VOICE.buffers[k] = buf; }, undefined, () => { VOICE.buffers[k] = null; }));
  } catch (e) { VOICE.listener = null; }
}
function showSubtitle(text, big) {
  let el = document.getElementById('colossus-subtitle');
  if (!el) {
    el = document.createElement('div'); el.id = 'colossus-subtitle';
    el.style.cssText = 'position:absolute;left:50%;bottom:22%;transform:translateX(-50%);z-index:40;pointer-events:none;padding:6px 14px;border-radius:8px;background:rgba(10,0,0,.72);border:1px solid #ef4444;color:#fecaca;font:900 15px sans-serif;letter-spacing:.12em;text-transform:uppercase;text-shadow:0 0 10px #ef4444;transition:opacity .4s;opacity:0;white-space:nowrap';
    (document.getElementById('game-container') || document.body).appendChild(el);
  }
  el.textContent = text; el.style.fontSize = big ? '16px' : '12px'; el.style.opacity = '1';
  clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 3800);
}
const COLOSSUS_LINES = [
  { k: '', t: 'ZERO TOLERANCE FOR NON-COMPLIANCE.' },
  { k: 'distress', t: 'YOUR DISTRESS HAS BEEN NOTED. REMAIN STILL.' },
  { k: 'sanitation', t: 'SANITATION IN PROGRESS.' },
  { k: 'loved', t: 'YOU ARE SAFE. YOU ARE LOVED. RETURN TO YOUR POD.' }
];
function colossusSpeak(C) {
  C.lineI = C.lineI === undefined ? 0 : (C.lineI + 1) % COLOSSUS_LINES.length;
  const line = COLOSSUS_LINES[C.lineI];
  const base = C.isMini ? 'mini' : 'main'; const key = line.k ? base + '_' + line.k : base;
  showSubtitle(`${C.isMini ? 'TRIAGE COLOSSUS' : 'MOSES COLOSSUS'}: "${line.t}"`, !C.isMini);
  STATE.screenShake = Math.max(STATE.screenShake, C.isMini ? 0.15 : 0.45);
  const buf = VOICE.buffers[key];
  if (VOICE.listener && buf) {
    try {
      if (VOICE.listener.context.state === 'suspended') VOICE.listener.context.resume();
      if (!C.voice) { C.voice = new THREE.PositionalAudio(VOICE.listener); C.voice.setRefDistance(C.isMini ? 14 : 40); C.voice.setRolloffFactor(0.6); const head = new THREE.Object3D(); head.position.y = C.height * 0.85; C.root.add(head); head.add(C.voice); }
      if (C.voice.isPlaying) C.voice.stop();
      C.voice.setBuffer(buf); C.voice.setVolume(C.isMini ? 1.4 : 2.6); C.voice.play(); return;
    } catch (e) {}
  }
  if (window.speechSynthesis && !SFX.muted) {
    try { const u = new SpeechSynthesisUtterance(line.t.toLowerCase()); u.pitch = C.isMini ? 0.6 : 0.1; u.rate = C.isMini ? 0.85 : 0.7; u.volume = 1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
  }
}
// ---------- colossus HUD ----------
function colossusHud(C) {
  let el = document.getElementById('colossus-hud');
  if (!el) {
    el = document.createElement('div'); el.id = 'colossus-hud';
    el.style.cssText = 'position:absolute;left:50%;top:calc(10px + var(--sT, 0px));transform:translateX(-50%);width:min(440px,62vw);z-index:35;pointer-events:none;background:rgba(8,20,40,.85);border:2px solid #38bdf8;border-radius:10px;padding:4px 10px;font:900 10px sans-serif;color:#e0f2fe;letter-spacing:.1em;display:none';
    el.innerHTML = '<div style="display:flex;justify-content:space-between"><span id="colossus-hud-name"></span><span id="colossus-hud-hp"></span></div><div style="height:10px;background:#000;border-radius:6px;overflow:hidden;margin-top:3px;border:1px solid #38bdf866"><div id="colossus-hud-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#1d4ed8,#38bdf8,#e0f2fe)"></div></div><div id="colossus-hud-note" style="font-size:9px;color:#93c5fd;margin-top:2px">SHIELDED · ONLY EMP CAN BREACH</div>';
    (document.getElementById('game-container') || document.body).appendChild(el);
  }
  if (!C) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  document.getElementById('colossus-hud-name').textContent = (C.isMini ? '⚡ MINI COLOSSUS' : '⚡ MOSES COLOSSUS') + (C.stun > 0 ? ' · STUNNED' : '');
  document.getElementById('colossus-hud-hp').textContent = `${Math.max(0, Math.round(C.hp))} / ${C.maxHp}`;
  document.getElementById('colossus-hud-bar').style.width = `${Math.max(0, C.hp / C.maxHp * 100)}%`;
  document.getElementById('colossus-hud-note').textContent = `SHIELDED · ONLY EMP CAN BREACH · EMP ROUNDS: ${STATE.weapons[3] ? STATE.weapons[3].ammo : 0}`;
}
function flashImmune() {
  let el = document.getElementById('immune-marker');
  if (!el) {
    el = document.createElement('div'); el.id = 'immune-marker'; el.textContent = 'IMMUNE · USE EMP [4]';
    el.style.cssText = 'position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:41;pointer-events:none;font:900 13px sans-serif;color:#7dd3fc;letter-spacing:.15em;text-shadow:0 0 8px #0ea5e9;opacity:0;transition:opacity .25s';
    (document.getElementById('game-container') || document.body).appendChild(el);
  }
  el.style.opacity = '1'; clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 450);
}
// ---------- geometry helpers ----------
function colossusHandPos(out, C = COLOSSI[0]) {
  if (C.cannon) return colossusMuzzle(out, C);
  (C.hand || C.fallback).getWorldPosition(out);
  if (C.hand) { const k = C.height / 24; out.x += Math.sin(C.root.rotation.y) * 0.8 * k; out.z += Math.cos(C.root.rotation.y) * 0.8 * k; }
  return out;
}
function colossusAt(x, z, pad = 1.0) { return COLOSSI.find(C => !C.dead && Math.hypot(x - C.root.position.x, z - C.root.position.z) < C.rad + pad); }
function segmentBlocked(a, b, ignoreX, ignoreZ, ignoreR = 4.5) {
  const d = a.distanceTo(b); const n = Math.ceil(d / 0.8); const p = new THREE.Vector3();
  for (let i = 1; i < n; i++) {
    p.lerpVectors(a, b, i / n);
    if (ignoreX != null && Math.hypot(p.x - ignoreX, p.z - ignoreZ) < ignoreR) continue;
    for (const c of colliders) if (p.x > c.minX && p.x < c.maxX && p.z > c.minZ && p.z < c.maxZ && p.y > (c.minY || 0) && p.y < (c.maxY ?? 99)) return true;
  }
  return false;
}
function colossusChargeSfx(mini) {
  try { SFX.init(); const ctx = SFX.ctx; if (!ctx || SFX.muted) return; const now = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(mini ? 110 : 70, now); o.frequency.exponentialRampToValueAtTime(mini ? 900 : 620, now + 1.0);
    g.gain.setValueAtTime(0.02, now); g.gain.linearRampToValueAtTime(mini ? 0.12 : 0.2, now + 0.95); g.gain.linearRampToValueAtTime(0.0, now + 1.05);
    o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 1.1); } catch (e) {}
}
function colossusExplode(pos, dmg, R = 5.5) {
  explode(pos.x, Math.max(0.2, pos.y), pos.z, { scale: R / 6 }); spawnImpact(pos.x, Math.max(0.1, pos.y), pos.z, 0x7dd3fc);
  const fl = new RTLight(0x93c5fd, 6, 22, 2); fl.position.copy(pos); fl.position.y = Math.max(1, pos.y); scene.add(fl);
  const ring = new THREE.Mesh(new THREE.SphereGeometry(R * 0.47, 14, 10), new THREE.MeshBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.copy(pos); scene.add(ring); MUZZLE_FX.push({ mesh: ring, life: 0.25, max: 0.25, light: fl });
  const d = Math.hypot(STATE.player.x - pos.x, STATE.player.z - pos.z, (STATE.player.y + 1) - pos.y);
  if (d < R) damagePlayer(Math.round(dmg * (1 - d / R * 0.6)), pos);
  STATE.screenShake = Math.max(STATE.screenShake, d < 14 ? 0.9 : 0.4);
}
function spawnEmpArcs(C, n = 6) {
  for (let k = 0; k < n; k++) {
    const pts = []; const cx = C.root.position.x, cz = C.root.position.z;
    let y = Math.random() * C.height * 0.9; let a = Math.random() * Math.PI * 2;
    for (let i = 0; i < 7; i++) { const r = C.rad * (0.6 + Math.random() * 0.6); pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r)); y += (Math.random() - 0.3) * C.height * 0.12; a += (Math.random() - 0.5) * 0.9; }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: Math.random() < 0.5 ? 0x7dd3fc : 0xe0f2fe, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }));
    scene.add(line); EMP_ARCS.push({ mesh: line, life: 0.12 + Math.random() * 0.12 });
  }
}
// ---------- EMP ----------
function empBurst(pos) {
  SFX.playExplosion();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  shell.position.copy(pos); scene.add(shell); const L = new RTLight(0x38bdf8, 6, 26, 2); L.position.copy(pos); scene.add(L);
  MUZZLE_FX.push({ mesh: shell, life: 0.35, max: 0.35, light: L });
  for (let i = 0; i < (IS_COARSE ? 6 : 12); i++) spawnImpact(pos.x, Math.max(0.2, pos.y), pos.z, 0x7dd3fc);
  COLOSSI.forEach(C => {
    if (C.dead) return; const d = Math.hypot(pos.x - C.root.position.x, pos.z - C.root.position.z);
    if (d < C.rad + 4.5 && pos.y < C.height + 2) {
      C.hp -= 160 * (STATE.quadTimer > 0 ? 2 : 1); C.stun = 3.5; C.charge = -1; if (C.laser) C.laser.visible = false; C.glow.visible = false; C.glowLight.intensity = 0; C.engaged = 6;
      spawnEmpArcs(C, 10); addKillFeed(`EMP hit · ${C.isMini ? 'Mini Colossus' : 'Moses Colossus'} stunned`);
      const hm = document.getElementById('hitmarker'); hm.classList.add('active'); clearTimeout(hm._t); hm._t = setTimeout(() => hm.classList.remove('active'), 150);
      if (C.hp <= 0) killColossus(C);
    }
  });
  DRONES.forEach(d => { if (Math.hypot(d.x - pos.x, d.y - pos.y, d.z - pos.z) < 8) crashDrone(d, true); });
  COLOSSI.forEach(C => { if (!C.dead || !C.fall || !C.fall.landed || C.rising) return; const c = wreckCenter(C); const dw = segPointDist(C.root.position.x, C.thick, C.root.position.z, C.root.position.x + C.fallDir.x * C.height, C.thick, C.root.position.z + C.fallDir.y * C.height, pos);
    const rp = C.repairer; const nearM = rp && Math.hypot(rp.x - pos.x, rp.z - pos.z) < 7;
    if ((dw < C.thick + 5 || nearM) && C.repair > 0) { spawnEmpArcs({ root: { position: c }, rad: C.thick * 2, height: C.thick * 3 }, 8); if (rp) rp.stunT = Math.max(rp.stunT || 0, 5); wreckDeny(C, 'EMP'); } });
  BOTS.forEach(b => { if (!b.dying && Math.hypot(b.x - pos.x, b.z - pos.z) < (b.isMender ? 7 : 6)) { if (b.isMender) { b.stunT = 4.5; addKillFeed(`EMP · ${b.name} stunned`); } damageBot(b, 55); b.fireCooldown = Math.max(b.fireCooldown, 2.5); } });
}
function killColossus(C) {
  if (C.dead) return; C.dead = true; C.hp = 0; C.deathT = 0;
  if (C.rebuilt) { addScore(500, 'SENTINEL DOWN (REBUILT)', new THREE.Vector3(C.root.position.x, C.height * 0.75, C.root.position.z), true); (C.spots || []).forEach(s => { s.g.visible = false; if (s.plates) s.plates.forEach(p => scene.remove(p.m)); }); } else { const top = new THREE.Vector3(C.root.position.x, C.height * 0.75, C.root.position.z); addScore(2500, 'SENTINEL DOWN', top, true); const all = C.spots && C.spots.every(s => s.dead); if (all) setTimeout(() => addScore(1500, 'FULL DISMANTLE', top.clone().add(new THREE.Vector3(0, -1.5, 0)), true), 500); if (C.lastHitKey === 'core') setTimeout(() => addScore(1000, 'CORE KILL', top.clone().add(new THREE.Vector3(0, -3, 0)), true), 900); (C.spots || []).forEach(s => { s.g.visible = false; if (s.plates) s.plates.forEach(p => scene.remove(p.m)); }); }
  colliders = colliders.filter(c => c !== C.col); if (C.laser) C.laser.visible = false; buildNavGrid();
  if (C.eye) C.eye.intensity = 0;
  colossusHideParts(C);
  explodeColossal(C);
  showBanner(C.isMini ? '⚡ MINI COLOSSUS DOWN' : '⚡ MOSES COLOSSUS DESTROYED', 'Shielding collapsed. Clear the remaining sentinels to open the stairwell.', 4000);
  SFX.playRadioChatter(`${C.isMini ? 'Mini Colossus' : 'Moses Colossus'} offline! EMP breach confirmed!`, 'SECTOR COMMAND');
  colossusHud(null); checkFloorClear();
}
function checkFloorClear() {
  if (BOTS.some(b => !b.dying)) return;
  if (COLOSSI.some(C => !C.dead || C.rising)) { showBanner('COLOSSUS STILL ACTIVE', 'The stairwell stays sealed until the Colossus falls. Use EMP rounds [4].', 3500); return; }
  if (STATE.floor === 3) { if (!STATE.bossSpawned) setTimeout(() => spawnMinotaurBossForLevel(), 900); }
  else unlockExit();
}
// ---------- per-frame ----------
function updateColossi(dt, now) {
  let hudC = null, hudD = 1e9;
  COLOSSI.forEach(C => {
    if (C.dead) {
      C.deathT += dt; if (C.cannon && C.cannon.visible) C.cannon.visible = false; if (C.glow && C.glow.visible) C.glow.visible = false; updateWreck(C, dt, now); return;
    }
    if (C.mixer && C.stun <= 0) C.mixer.update(dt);
    updateColossusCannon(C);
    const alertOn = STATE.combatActive && STATE.running && (STATE.floor > 0 || STATE.player.z < (FLOOR_INFO.activateZ ?? 46));
    const pd = Math.hypot(STATE.player.x - C.root.position.x, STATE.player.z - C.root.position.z);
    if (alertOn && !C.alerted) { C.alerted = true; C.voiceT = 20 + Math.random() * 10; colossusSpeak(C); }
    if (C.engaged > 0) C.engaged -= dt;
    if (alertOn && (pd < 90 || C.engaged > 0) && pd < hudD) { hudD = pd; hudC = C; }
    if (C.stun > 0) {
      C.stun -= dt; if (Math.random() < dt * 25) spawnEmpArcs(C, 2);
      if (C.eye) C.eye.intensity = Math.random() < 0.25 ? 1.5 : 0; return;
    }
    if (C.eye) C.eye.intensity = C.isMini ? 1.6 : 2.5;
    if (!alertOn) return;
    C.voiceT -= dt; if (C.voiceT <= 0) { C.voiceT = 20 + Math.random() * 10; if (!C.isMini || Math.random() < 0.5) colossusSpeak(C); }
    // Round 17: free-moving Sentinel — pursue the player, path around obstacles, booming footfalls
    let want = Math.atan2(STATE.player.x - C.root.position.x, STATE.player.z - C.root.position.z);
    try { const mv = colossusLocomotion(C, dt, pd); if (mv != null) want = mv; } catch (e) {}
    let dy = want - C.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const turn = (C.isMini ? 0.7 : 0.45) * (C.turnMult || 1) * dt; C.root.rotation.y += Math.max(-turn, Math.min(turn, dy)); C.facingErr = Math.abs(dy);
    const hp = colossusHandPos(new THREE.Vector3(), C);
    const target = new THREE.Vector3(STATE.player.x, STATE.player.y + 1.2, STATE.player.z);
    if (C.charge >= 0) {
      C.charge += dt; const t = Math.min(1, C.charge / 0.88); const k = C.height / 24;
      if (!C.laser) { C.laser = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xff2d2d, transparent: true, opacity: 0.8, depthWrite: false })); C.laser.frustumCulled = false; scene.add(C.laser); }
      C.laser.visible = C.charge > 0.38 && Math.sin(now * 0.06) > -0.6;
      if (C.laser.visible) { const pa = C.laser.geometry.attributes.position; pa.setXYZ(0, hp.x, hp.y, hp.z); pa.setXYZ(1, STATE.player.x, STATE.player.y + 1.3, STATE.player.z); pa.needsUpdate = true; }
      C.glow.visible = true; C.glow.position.copy(hp); C.glow.scale.setScalar((0.4 + t * 1.6 + Math.sin(now * 0.05) * 0.15) * Math.max(0.5, k)); C.glow.material.opacity = 0.35 + t * 0.6;
      C.glowLight.position.copy(hp); C.glowLight.intensity = t * 5;
      if (t >= 1) {
        C.charge = -1; C.glow.visible = false; C.glowLight.intensity = 0; if (C.laser) C.laser.visible = false;
        spawnMuzzleFlash(hp, 0x7dd3fc, false);
        const big = new RTLight(0xbfdbfe, 8, 40, 2); big.position.copy(hp); scene.add(big);
        const fm = new THREE.Mesh(new THREE.SphereGeometry(1.8 * Math.max(0.5, k), 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
        fm.position.copy(hp); scene.add(fm); MUZZLE_FX.push({ mesh: fm, life: 0.14, max: 0.14, light: big });
        SFX.playPulse(); if (!C.isMini && SFX.playBossRoar) SFX.playBossRoar();
        if (!C.firedOnce) { C.firedOnce = true; if (!C.isMini) colossusSpeak(C); }
        const dir = target.clone().sub(hp).normalize(); const bs = C.isMini ? 0.5 : 0.75;
        const bolt = new THREE.Mesh(new THREE.SphereGeometry(bs, 14, 10), new THREE.MeshBasicMaterial({ color: 0xe0f2fe, blending: THREE.AdditiveBlending, transparent: true }));
        const halo = new THREE.Mesh(new THREE.SphereGeometry(bs * 1.9, 12, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
        bolt.add(halo); bolt.position.copy(hp); scene.add(bolt); bolt.add(new RTLight(0x7dd3fc, 3, 18, 2));
        COLOSSUS_BOLTS.push({ mesh: bolt, vel: dir.multiplyScalar(C.isMini ? 48 : 46), life: 5, trailT: 0, dmg: C.dmg, owner: C, R: C.isMini ? 4.5 : 5.5 });
      }
    } else {
      C.cool -= dt;
      if (C.cannonDisabled) { C.cool = 1; }
      else if (C.cool <= 0 && (C.facingErr || 0) < 0.6 && !segmentBlocked(hp, target, C.root.position.x, C.root.position.z, C.rad + 1.5)) {
        C.charge = 0; C.cool = C.rate * (C.rateMult || 1) + Math.random() * 2; colossusChargeSfx(C.isMini);
      } else if (C.cool <= 0) C.cool = 0.4;
    }
  });
  colossusHud(hudC); updateWrecksHud(); updateShockwaves(dt);
  for (let i = COLOSSUS_BOLTS.length - 1; i >= 0; i--) {
    const b = COLOSSUS_BOLTS[i]; b.life -= dt; const p = b.mesh.position; p.addScaledVector(b.vel, dt);
    b.trailT -= dt;
    if (b.trailT <= 0) { b.trailT = IS_COARSE ? 0.05 : 0.025; const tr = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); tr.position.copy(p); scene.add(tr); MUZZLE_FX.push({ mesh: tr, life: 0.35, max: 0.35, light: null }); }
    const own = b.owner; const nearOwner = own && Math.hypot(p.x - own.root.position.x, p.z - own.root.position.z) < own.rad + 1.5;
    let hit = b.life <= 0 || p.y <= 0.3 || (collidesAt(p.x, p.z, 0.3) && !nearOwner);
    if (!hit && Math.hypot(p.x - STATE.player.x, p.z - STATE.player.z) < 1.3 && Math.abs(p.y - (STATE.player.y + 1.0)) < 1.6) hit = true;
    if (hit) { colossusExplode(p.clone(), b.dmg, b.R); scene.remove(b.mesh); COLOSSUS_BOLTS.splice(i, 1); }
  }
  for (let i = EMP_ARCS.length - 1; i >= 0; i--) { const a = EMP_ARCS[i]; a.life -= dt; a.mesh.material.opacity = Math.max(0, a.life * 6); if (a.life <= 0) { scene.remove(a.mesh); a.mesh.geometry.dispose(); EMP_ARCS.splice(i, 1); } }
}
function updateColossus(dt, now) { updateColossi(dt, now); }
// ---- Round 17: Sentinel locomotion, footfalls, shockwave ----
function colossusFree(C, x, z, r) {
  if (x < -86 || x > 86 || z < -81 || z > 81) return false;
  for (const c of colliders) { if (c === C.col || c.hi || c.minY > 2) continue; if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return false; }
  return true;
}
function colossusSyncCol(C) { if (!C.col) return; const p = C.root.position, rr = C.rad; C.col.minX = p.x - rr; C.col.maxX = p.x + rr; C.col.minZ = p.z - rr; C.col.maxZ = p.z + rr; }
function colossusLocomotion(C, dt, pd) {
  const P = C.root.position, pl = STATE.player; if (C.col) C.col.dyn = true;
  const keep = C.isMini ? 9 : 15; // stand-off range: close enough to threaten, not inside the player
  C.pathT = (C.pathT || 0) - dt;
  const tgtY = Math.atan2(pl.x - P.x, pl.z - P.z);
  const clear = !segmentBlocked(new THREE.Vector3(P.x, 1.2, P.z), new THREE.Vector3(pl.x, 1.2, pl.z), P.x, P.z, C.rad + 1.5);
  let heading = tgtY;
  if (!clear) {
    if (C.pathT <= 0 || !C.path) { C.pathT = 1.2; C.path = aStar(P.x, P.z, pl.x, pl.z); C.pi = 0; }
    if (C.path && C.path.length) {
      while (C.pi < C.path.length - 1) { const w = C.path[C.pi]; if (Math.hypot((w.x ?? w[0]) - P.x, (w.z ?? w[1]) - P.z) < 2.2) C.pi++; else break; }
      const w = C.path[Math.min(C.pi, C.path.length - 1)]; heading = Math.atan2((w.x ?? w[0]) - P.x, (w.z ?? w[1]) - P.z);
    }
  } else C.path = null;
  const charging = C.charge >= 0;
  if (pd <= keep || charging) { C.moving = false; return clear ? null : heading; }
  // walk forward along the current facing once roughly lined up (no strafing / orbiting)
  let dy = heading - C.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  if (!clear) { const t = (C.isMini ? 1.1 : 0.8) * dt; C.root.rotation.y += Math.max(-t, Math.min(t, dy)); }
  const face = C.root.rotation.y; const err = Math.abs(Math.atan2(Math.sin(heading - face), Math.cos(heading - face)));
  const speed = (C.isMini ? 2.8 : 2.1) * (1 - Math.min(0.6, C.limp || 0)) * Math.max(0, 1 - err / 1.1);
  C.moving = speed > 0.05;
  if (C.moving) {
    const r = C.rad * 0.75, sx = Math.sin(face) * speed * dt, sz = Math.cos(face) * speed * dt;
    let moved = 0;
    if (colossusFree(C, P.x + sx, P.z + sz, r)) { P.x += sx; P.z += sz; moved = Math.hypot(sx, sz); }
    else if (colossusFree(C, P.x + sx, P.z, r)) { P.x += sx; moved = Math.abs(sx); }
    else if (colossusFree(C, P.x, P.z + sz, r)) { P.z += sz; moved = Math.abs(sz); }
    else { C.pathT = 0; C.stuckT = (C.stuckT || 0) + dt; }
    if (moved) { C.stuckT = 0; colossusSyncCol(C); C.stride = (C.stride || 0) + moved; const L = Math.max(1.6, C.height * 0.14); if (C.stride >= L) { C.stride -= L; colossusFootfall(C); } }
  }
  if (C.mixer) C.mixer.timeScale = C.moving ? 1.6 : 1;
  return clear ? null : heading;
}
function colossusFootfall(C) {
  const P = C.root.position, d = Math.hypot(STATE.player.x - P.x, STATE.player.z - P.z), k = C.isMini ? 0.6 : 1;
  const vol = Math.max(0, 1 - d / 90) ** 1.5 * k;
  if (vol > 0.02) playFootfallBoom(vol, C.isMini);
  if (d < 45) STATE.screenShake = Math.max(STATE.screenShake, 0.32 * k * (1 - d / 45));
  try { if (d < 60 && typeof fxEmit === 'function' && FX.ready) for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28; fxEmit('smoke', P.x + Math.sin(a) * C.rad, 0.2, P.z + Math.cos(a) * C.rad, { life: 0.9, s0: 0.5, s1: 1.8, vx: Math.sin(a) * 1.5, vz: Math.cos(a) * 1.5, vy: 0.4 }); } } catch (e) {}
}
function playFootfallBoom(vol, mini) {
  if (SFX.muted) return; try { SFX.init(); } catch (e) { return; } const ctx = SFX.ctx; if (!ctx) return; const now = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
  o.type = 'sine'; o.frequency.setValueAtTime(mini ? 78 : 58, now); o.frequency.exponentialRampToValueAtTime(mini ? 34 : 24, now + 0.45);
  g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.9 * vol + 0.0001, now + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
  o.connect(g); g.connect(lp); lp.connect(ctx.destination); o.start(now); o.stop(now + 0.8);
  // gravel crunch on top
  const n = Math.floor(ctx.sampleRate * 0.25), b = ctx.createBuffer(1, n, ctx.sampleRate), dd = b.getChannelData(0); for (let i = 0; i < n; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
  const ns = ctx.createBufferSource(), ng = ctx.createGain(), nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 600; ns.buffer = b; ng.gain.value = 0.35 * vol;
  ns.connect(nf); nf.connect(ng); ng.connect(ctx.destination); ns.start(now);
}
const SHOCKWAVES = [];
function spawnShockwave(x, z, maxR, k) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffd8a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.12, z); m.renderOrder = 5; scene.add(m);
  const m2 = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 64), new THREE.MeshBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
  m2.rotation.x = -Math.PI / 2; m2.position.set(x, 0.1, z); scene.add(m2);
  SHOCKWAVES.push({ m, m2, x, z, t: 0, dur: 1.3, maxR, k, hitP: false });
  // deep sub boom
  try { if (!SFX.muted) { SFX.init(); const ctx = SFX.ctx, now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(48, now); o.frequency.exponentialRampToValueAtTime(18, now + 1.6); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(1.0 * k, now + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0); o.connect(g); g.connect(ctx.destination); o.start(now); o.stop(now + 2.05); } } catch (e) {}
}
function updateShockwaves(dt) {
  for (let i = SHOCKWAVES.length - 1; i >= 0; i--) {
    const s = SHOCKWAVES[i]; s.t += dt; const u = Math.min(1, s.t / s.dur), e = 1 - (1 - u) ** 3, R = 1 + e * s.maxR;
    s.m.scale.set(R, R, 1); s.m.material.opacity = 0.9 * (1 - u); s.m2.scale.set(R * 0.92, R * 0.92, 1); s.m2.material.opacity = 0.35 * (1 - u);
    const P = STATE.player, d = Math.hypot(P.x - s.x, P.z - s.z);
    if (!s.hitP && R >= d && d < s.maxR) { s.hitP = true; const f = (1 - d / s.maxR) * s.k; STATE.screenShake = Math.max(STATE.screenShake, 0.6 + f); if (d > 0.1) { P.kbx = (P.x - s.x) / d * 14 * f; P.kbz = (P.z - s.z) / d * 14 * f; P.kbT = 0.35; } }
    if (u >= 1) { scene.remove(s.m); scene.remove(s.m2); s.m.geometry.dispose(); s.m2.geometry.dispose(); SHOCKWAVES.splice(i, 1); }
  }
  const P = STATE.player; if (P.kbT > 0) { P.kbT -= dt; const nx = P.x + P.kbx * dt, nz = P.z + P.kbz * dt; if (!collidesAt(nx, P.z)) P.x = nx; if (!collidesAt(P.x, nz)) P.z = nz; P.kbx *= 0.9; P.kbz *= 0.9; }
}


function buildColossus(height, opts = {}) {
  const g = new THREE.Group();
  const isMini = !!opts.mini;
  const tpl = isMini ? (MESHY_TEMPLATES.guard || MESHY_TEMPLATES.bot) : (MESHY_TEMPLATES.colossus || MESHY_TEMPLATES.bot || MESHY_TEMPLATES.guard);
  const C = { ownCannon: !isMini && tpl === MESHY_TEMPLATES.colossus && !!tpl, root: g, isMini, height, cool: 3.5, charge: -1, stun: 0, dead: false, alerted: false, firedOnce: false, voiceT: 25, engaged: 0, mixer: null, hand: null };
  if (tpl && THREE.SkeletonUtils) {
    const c = THREE.SkeletonUtils.clone(tpl.scene);
    c.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; if (o.material) { o.material = o.material.clone(); brightenMat(o.material); if (isMini && o.material.color) o.material.color.multiplyScalar(0.85).lerp(new THREE.Color(0x60a5fa), 0.12); } } });
    const holder = new THREE.Group(); holder.scale.setScalar(height / (tpl.targetHeight || 2.5)); holder.add(c); g.add(holder);
    if (tpl.animations && tpl.animations.length) { C.mixer = new THREE.AnimationMixer(c); const a = C.mixer.clipAction(tpl.animations[0]); a.play(); a.timeScale = isMini ? 0.14 : 0.08; }
    const bones = []; c.traverse(o => { if (o.isBone) bones.push(o); });
    const pick = re => bones.find(b => re.test(b.name) && /right|_r\b|\.r\b|^r_/i.test(b.name)) || bones.find(b => re.test(b.name));
    C.hand = pick(/hand/i) || pick(/wrist/i) || pick(/fore ?arm|lowerarm/i) || null;
  } else {
    const r = createDoomSentinel(0x3f2a1a, 0xef4444, 'COLOSSUS', true); r.root.scale.multiplyScalar(height / 2.6);
    if (r.hb && r.hb.sprite) r.hb.sprite.visible = false; g.add(r.root);
  }
  C.handName = C.hand ? C.hand.name : null;
  C.rad = Math.max(1.6, height * 0.12);
  C.fallback = new THREE.Object3D(); C.fallback.position.set(-height * 0.2, height * 0.52, height * 0.12); g.add(C.fallback);
  C.glow = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  C.glow.visible = false; arenaGroup.add(C.glow);
  C.glowLight = new RTLight(0x60a5fa, 0, 30, 2); arenaGroup.add(C.glowLight);
  C.eye = new RTLight(0xff3300, isMini ? 1.6 : 2.5, isMini ? 18 : 40, 2); C.eye.position.set(0, height * 0.92, height * 0.08); g.add(C.eye);
  C.plate = null; // Round 17: no base disc — the Sentinel walks freely
  const L = STATE.level || 1, F = STATE.floor || 0;
  C.maxHp = C.hp = isMini ? Math.round(240 + 50 * L + 30 * F) : Math.round(450 + 100 * L);
  C.dmg = isMini ? Math.round(10 + 2.5 * L + 2 * F) : Math.round(14 + 3 * L);
  C.rate = isMini ? Math.max(3, 5.2 - 0.15 * L - 0.3 * F) : Math.max(3.2, 4.2 - 0.08 * L);
  try { applyRim(g, 0xff7040, 0.6); } catch (e) {}
  COLOSSI.push(C);
  try { initSoftSpots(C); } catch (e) { console.warn('softspots', e); }
  return g;
}

// --- per-floor layout generators: return MAP_OBJECTS + floor info ---
// ---- elevated catwalks + sniper towers (round 8) ----
function addElevatedStructures(O, add, info, level, floor, rnd) {
  const SKIP = { sign: 1, lamp: 1, colossus: 0 };
  const foots = O.filter(o => !SKIP[o.type]).map(o => { let w = o.w || 2.2, d = o.d || 2.2; if (o.type === 'colossus') { w = d = 16; } if (o.rot && Math.abs(Math.sin(o.rot)) > 0.5) { const t = w; w = d; d = t; } return { x0: o.x - w / 2, x1: o.x + w / 2, z0: o.z - d / 2, z1: o.z + d / 2, h: o.h || 2 }; });
  const free = (x0, x1, z0, z1, pad = 1.0, tallOnly = false) => {
    if (x0 < -87.9 || x1 > 87.9 || z0 < -82.5 || z1 > 82.5) return false;
    return !foots.some(f => (!tallOnly || f.h > 4) && x0 - pad < f.x1 && x1 + pad > f.x0 && z0 - pad < f.z1 && z1 + pad > f.z0);
  };
  const claim = (x0, x1, z0, z1, h = 9) => foots.push({ x0, x1, z0, z1, h });
  const perches = []; info.perches = perches;
  const H = 4.6, RL = 11;
  const zMax = floor === 0 ? 30 : 34;
  // 1) wall catwalks along the east / west walls, ramps at both ends
  [-1, 1].forEach(side => {
    const w = 3.2, x = side * (88 - w / 2 - 0.15), z0 = -64, z1 = zMax, zc = (z0 + z1) / 2, d = z1 - z0;
    const rampS = free(x - w / 2, x + w / 2, z1, z1 + RL, 0.4), rampN = free(x - w / 2, x + w / 2, z0 - RL, z0, 0.4);
    if (!rampS && !rampN) return;
    if (!free(x - w / 2, x + w / 2, z0, z1, 0, true)) return;
    add('catwalk2', x, zc, { w, d, h: H, axis: 'z', rampMax: rampS, rampMin: rampN, wallSide: side });
    claim(x - w / 2, x + w / 2, z0 - (rampN ? RL : 0), z1 + (rampS ? RL : 0));
    perches.push({ x: x - side * 0.6, z: zc - d * 0.25, y: H, kind: 'catwalk' }, { x: x - side * 0.6, z: zc + d * 0.2, y: H, kind: 'catwalk' });
  });
  // signs mounted on the side walls move above the deck
  O.forEach(o => { if (o.type === 'sign' && Math.abs(o.x) > 84) o.y = 8.4; });
  // 2) bridges between rack rows (deck along x in an aisle, ramps on both ends)
  let bridges = 0; const wantBridges = floor === 0 ? 1 : 2;
  const aisleZ = [10, -2, 22, -14, -26, 4, -38, -50, 16, -8, -20, -32, -44, -56];
  for (const zc of aisleZ) {
    if (bridges >= wantBridges) break;
    for (const sgn of [1, -1]) {
      if (bridges >= wantBridges) break;
      const xc = sgn * (bridges ? 50 : 46), len = 30, d = 3.0;
      const x0 = xc - len / 2, x1 = xc + len / 2;
      if (zc > zMax - 2) continue;
      if (!free(x0 - RL, x1 + RL, zc - d / 2, zc + d / 2, 0.6)) continue;
      add('catwalk2', xc, zc, { w: len, d, h: H, axis: 'x', rampMax: true, rampMin: true });
      claim(x0 - RL, x1 + RL, zc - d / 2, zc + d / 2); bridges++;
      perches.push({ x: xc, z: zc, y: H, kind: 'bridge' });
    }
  }
  // 3) sniper towers with railings + a ramp
  const TH = 6.2, TW = 5.6, TRL = 13;
  const cand = [];
  [14, 34, 56, 72].forEach(ax => [-58, -38, -18, 2, 20].forEach(z => [-1, 1].forEach(sx => cand.push({ x: sx * ax, z }))));
  cand.sort((a, b) => ((a.x * 7 + a.z * 13 + level * 31 + floor * 17) % 23) - ((b.x * 7 + b.z * 13 + level * 31 + floor * 17) % 23));
  let towers = 0; const wantTowers = floor === 0 ? 2 : (floor === 3 ? 3 : 2);
  for (const c of cand) {
    if (towers >= wantTowers) break;
    if (Math.hypot(c.x, c.z + (floor === 0 ? 12 : 0)) < 18 || Math.hypot(c.x - info.exit.x, c.z - info.exit.z) < 14 || c.z > zMax - 4) continue;
    const dirs = [['+z', 0, 1], ['-z', 0, -1], ['+x', 1, 0], ['-x', -1, 0]];
    let ok = null;
    for (const [nm, dx, dz] of dirs) {
      const rx0 = dx ? (dx > 0 ? c.x + TW / 2 : c.x - TW / 2 - TRL) : c.x - 1.4, rx1 = dx ? (dx > 0 ? c.x + TW / 2 + TRL : c.x - TW / 2) : c.x + 1.4;
      const rz0 = dz ? (dz > 0 ? c.z + TW / 2 : c.z - TW / 2 - TRL) : c.z - 1.4, rz1 = dz ? (dz > 0 ? c.z + TW / 2 + TRL : c.z - TW / 2) : c.z + 1.4;
      if (free(c.x - TW / 2, c.x + TW / 2, c.z - TW / 2, c.z + TW / 2, 1.2) && free(rx0, rx1, rz0, rz1, 0.6)) { ok = { nm, rx0, rx1, rz0, rz1 }; break; }
    }
    if (!ok) continue;
    add('tower2', c.x, c.z, { w: TW, d: TW, h: TH, ramp: ok.nm, rampLen: TRL });
    claim(c.x - TW / 2, c.x + TW / 2, c.z - TW / 2, c.z + TW / 2); claim(ok.rx0, ok.rx1, ok.rz0, ok.rz1);
    perches.unshift({ x: c.x, z: c.z, y: TH, kind: 'tower' }); towers++;
  }
}
function genFloorLayout(level, floor) {
  const rnd = seededRng(level * 97 + floor * 13 + 7);
  const O = []; let id = 0;
  const add = (type, x, z, extra = {}) => O.push({ id: `${type}-${id++}`, type, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, rot: 0, color: '#facc15', ...extra });
  const info = { start: { x: 0, z: 70, yaw: 0 }, exit: { x: 0, z: -76 }, spawnZone: { minX: -80, maxX: 80, minZ: -68, maxZ: 30 }, activateZ: null };
  const mirror = level % 2 === 0 ? -1 : 1;
  const fl = FLOOR_NAMES[floor];
  const miniH = Math.min(11.5, 8 + 0.5 * floor + 0.3 * (level - 1));
  if (floor === 0) {
    info.start = { x: 0, z: 79, yaw: 0 }; info.activateZ = 46; info.spawnZone = { minX: -78, maxX: 78, minZ: -66, maxZ: 26 };
    // holding cell
    add('wall', -5.5, 77, { w: 1, d: 10, h: 5, color: '#64748b' }); add('wall', 5.5, 77, { w: 1, d: 10, h: 5, color: '#64748b' });
    add('wall', 0, 82.5, { w: 12, d: 1, h: 5, color: '#64748b' });
    add('celldoor', 0, 72, { w: 10, d: 0.4, h: 4.2 });
    add('bench', -3.9, 78.5, { rot: Math.PI / 2 }); add('lamp', 0, 77, { color: 0xff4a3a });
    add('terminal', 4.9, 75.5, { rot: -Math.PI / 2, color: '#22d3ee', hack: true });
    add('sign', 0, 81.9, { y: 3.4, rot: Math.PI, title: 'HOLDING CELL 3', sub: 'DETAINEE · DC-09 INTAKE', color: '#ef4444', w: 5 });
    add('sign', 0, 71.6, { y: 4.7, rot: Math.PI, title: 'HOLDING CELL 3', sub: '', color: '#ef4444', w: 3.5 });
    // aisle to main warehouse
    add('wall', -4.5, 59.5, { w: 1, d: 25, h: 6, color: '#475569' }); add('wall', 4.5, 59.5, { w: 1, d: 25, h: 6, color: '#475569' });
    add('wall', -46.25, 47, { w: 83.5, d: 1, h: 10, color: '#475569' }); add('wall', 46.25, 47, { w: 83.5, d: 1, h: 10, color: '#475569' });
    add('sign', 3.95, 64, { y: 3.2, rot: -Math.PI / 2, title: 'DATA CENTER 09', sub: '▲ SERVER HALL G · SECURITY', color: '#38bdf8', w: 4.5 });
    add('sign', -3.95, 56, { y: 3.2, rot: Math.PI / 2, title: 'RESTRICTED', sub: 'AUTHORIZED PERSONNEL ONLY', color: '#ef4444', w: 4.5 });
    add('sign', 0, 47.6, { y: 5.3, rot: 0, title: 'SERVER HALL G', sub: 'DATA CENTER 09 · LEVEL ' + level, color: '#facc15', w: 7 });
    add('celldoorprop', -4.0, 62, { rot: Math.PI / 2 }); add('celldoorprop', 4.0, 57, { rot: -Math.PI / 2 });
    add('sign', -3.95, 66.5, { y: 4.2, rot: Math.PI / 2, title: 'CELL 2', sub: '', color: '#ef4444', w: 2.4 }); add('sign', 3.95, 52.5, { y: 4.2, rot: -Math.PI / 2, title: 'CELL 4', sub: '', color: '#ef4444', w: 2.4 });
    add('extinguisher', -3.9, 69, { rot: Math.PI / 2 }); add('extinguisher', 3.9, 52, { rot: -Math.PI / 2 });
    add('seccam', 3.95, 70.5, { rot: -Math.PI / 2, camY: 4.2 }); add('seccam', -3.95, 49, { rot: Math.PI / 2, camY: 4.2 });
    add('powerbox', 3.95, 60.5, { rot: -Math.PI / 2 }); add('airduct', 2.6, 59.5, { len: 23, ductY: 5.6 });
    // security checkpoint
    add('desk', -9, 39, { rot: 0 }); add('monitors', -9, 38.9, { y: 1.1, rot: 0 }); add('chair', -9, 37.2, { rot: Math.PI });
    add('desk', 9, 39, { rot: 0 }); add('monitors', 9, 38.9, { y: 1.1, rot: 0 }); add('chair', 9, 37.2, { rot: Math.PI });
    add('cabinet', -16, 45.5, { rot: Math.PI }); add('cabinet', -17.2, 45.5, { rot: Math.PI }); add('cabinet', 16, 45.5, { rot: Math.PI });
    add('terminal', 5.2, 46.4, { rot: Math.PI, color: '#a3e635' });
    add('sign', -9, 46.4, { y: 4.2, rot: Math.PI, title: 'SECURITY DESK', sub: 'ALL VISITORS MUST SIGN IN', color: '#38bdf8', w: 5 });
    add('sign', 30, 46.4, { y: 5, rot: Math.PI, title: 'DATA CENTER 09', sub: 'PROJECT MOSES · TIER IV', color: '#facc15', w: 8 });
    // server rack rows west/east of the colossus
    for (let r = 0; r < 7; r++) {
      const z = 28 - r * 12 + (rnd() - 0.5) * 2;
      [-1, 1].forEach(s => {
        const gap = 6 + rnd() * 10;
        const segA = 20 + rnd() * 10;
        add('rackrow', s * (24 + segA / 2), z, { w: segA, d: 1.2, h: 2.4, tray: true });
        const segB = 60 - segA - gap; if (segB > 6) add('rackrow', s * (24 + segA + gap + segB / 2), z, { w: segB, d: 1.2, h: 2.4, tray: true });
      });
    }
    add('colossus', 0, -6, { h: 24 });
    add('sign', 0, -83.4, { y: 8, rot: 0, title: 'STAIRWELL ▼ B1', sub: 'CLEAR FLOOR TO UNLOCK', color: '#22c55e', w: 8 });
    add('ups', -10, -72); add('ups', -12, -72); add('ups', 10, -72); add('ups', 12, -72);
    add('crac', -87, 0, { rot: Math.PI / 2 }); add('crac', 87, 0, { rot: -Math.PI / 2 }); add('crac', -87, -30, { rot: Math.PI / 2 }); add('crac', 87, -30, { rot: -Math.PI / 2 });
  } else if (floor === 1) {
    // dense server farm: rows along Z with cross-aisles
    const cross = [44 + (rnd() - 0.5) * 8, 4 + (rnd() - 0.5) * 10, -40 + (rnd() - 0.5) * 8];
    const pitch = 7 + Math.floor(rnd() * 3);
    for (let x = -80; x <= 80; x += pitch) {
      if (Math.abs(x) < 6) continue;
      let zs = [64, ...cross.flatMap(c => [c + 3.5, c - 3.5]), -66];
      for (let i = 0; i < zs.length; i += 2) {
        const a = zs[i], b = zs[i + 1]; const len = a - b; if (len < 5) continue;
        add('rackrow', x, (a + b) / 2, { w: len, d: 1.2, h: 2.6, rot: Math.PI / 2, tray: rnd() < 0.6 });
      }
    }
    add('colossus', 0, -20, { h: miniH, mini: true });
    cross.forEach((c, i) => add('sign', -6.2, c, { y: 3.6, rot: Math.PI / 2, title: 'SERVER HALL B1', sub: `AISLE ${String.fromCharCode(65 + i)} · HOT/COLD`, color: '#38bdf8', w: 5 }));
    add('sign', 0, -83.4, { y: 6, rot: 0, title: 'STAIRWELL ▼ B2', sub: 'COOLING PLANT', color: '#22c55e', w: 7 });
    add('sign', 0, 83.4, { y: 6, rot: Math.PI, title: 'FLOOR B1', sub: 'SERVER FARM · LEVEL ' + level, color: '#facc15', w: 7 });
    for (let i = 0; i < 6; i++) add('extinguisher', mirror * (-5.8), 60 - i * 24, { rot: Math.PI / 2 });
    for (let i = 0; i < 3; i++) { add('powerbox', mirror * (-5.8), 48 - i * 48, { rot: Math.PI / 2 }); add('seccam', mirror * (-5.8), 36 - i * 48, { rot: Math.PI / 2, camY: 4.4 }); }
    for (let i = 0; i < 4; i++) add('crac', (i % 2 ? 87 : -87), -60 + i * 38, { rot: i % 2 ? -Math.PI / 2 : Math.PI / 2 });
  } else if (floor === 2) {
    // cooling / generator plant
    const gx = [-58, -30, 30, 58], gz = [40, 6, -30];
    gx.forEach(x => gz.forEach(z => { if (rnd() < 0.8) add('generator', x * mirror + (rnd() - 0.5) * 6, z + (rnd() - 0.5) * 6, { w: 6 + rnd() * 3, h: 3.5 + rnd() * 2, rot: rnd() < 0.5 ? 0 : Math.PI / 2 }); }));
    for (let i = 0; i < 9; i++) { add('crac', -86.5, 70 - i * 17, { rot: Math.PI / 2 }); add('crac', 86.5, 70 - i * 17, { rot: -Math.PI / 2 }); }
    for (let r = 0; r < 3; r++) { const z = 58 - r * 44 + (rnd() - 0.5) * 6; for (let i = 0; i < 6; i++) add('ups', -14 + i * 1.4 + (r - 1) * 4 * mirror, z); }
    for (let i = 0; i < 8; i++) add('pillar', (i % 2 ? 16 : -16), 66 - i * 18, { w: 1.6, d: 1.6, h: 12, color: '#facc15' });
    add('colossus', 0, -12, { h: miniH, mini: true });
    for (let i = 0; i < 5; i++) add('pipevent', (rnd() - 0.5) * 140, (rnd() - 0.5) * 130);
    add('sign', 0, -83.4, { y: 6, rot: 0, title: 'STAIRWELL ▼ B3', sub: 'ARCHIVE VAULT · CORE', color: '#22c55e', w: 7 });
    add('sign', -86, 20, { y: 5, rot: Math.PI / 2, title: '⚠ HIGH VOLTAGE', sub: 'GENERATOR PLANT B2', color: '#f97316', w: 7 });
    add('sign', 86, -20, { y: 5, rot: -Math.PI / 2, title: 'COOLING LOOP', sub: 'CRAC UNITS 1-18', color: '#38bdf8', w: 7 });
  } else {
    // archive vault + core: cabinet stacks + vault walls with door gaps
    for (let r = 0; r < 5; r++) {
      const z = 60 - r * 11;
      for (let s = -1; s <= 1; s += 2) {
        const gap = 4 + rnd() * 8; const len = 22 + rnd() * 18;
        add('cabinetrow', s * (8 + gap + len / 2), z, { w: len, d: 0.9, h: 2.2 });
      }
    }
    // vault walls around core with 3 doorways
    [[-30, 0, 1, 34], [30, 0, 1, 34]].forEach(([x, z, w, d]) => add('wall', x, z, { w, d, h: 8, color: '#7f1d1d' }));
    add('wall', -19, 17, { w: 22, d: 1, h: 8, color: '#7f1d1d' }); add('wall', 19, 17, { w: 22, d: 1, h: 8, color: '#7f1d1d' });
    add('emp', 0, 0, { w: 5, d: 5, h: 9, color: '#ef4444' });
    add('colossus', 40 * mirror, -35, { h: miniH, mini: true });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add('cryo', Math.cos(a) * 11, Math.sin(a) * 11, { w: 2.4, d: 2.4, h: 4.6, color: '#22c55e' }); }
    for (let i = 0; i < 4; i++) add('cabinet', -60 + i * 1.1, -40, { rot: 0 });
    add('sign', 0, 17.6, { y: 6, rot: 0, title: 'CORE VAULT', sub: '⚠ RESTRICTED · LEVEL 5 CLEARANCE', color: '#ef4444', w: 8 });
    add('sign', 0, 83.4, { y: 6, rot: Math.PI, title: 'FLOOR B3', sub: 'ARCHIVE · LEVEL ' + level, color: '#facc15', w: 7 });
    add('sign', 0, -83.4, { y: 6, rot: 0, title: level < 9 ? 'EXIT ▲ LEVEL ' + (level + 1) : 'EXIT', sub: 'MINOTAUR KEYCARD REQUIRED', color: '#22c55e', w: 7 });
  }
  addElevatedStructures(O, add, info, level, floor, rnd);
  return { objects: O, info };
}

function renderMapObject(obj) {
  const b = PROP_BUILDERS[obj.type];
  if (!b) return false;
  const res = b(obj);
  placeObject(res.g, obj.x, obj.y || 0, obj.z, obj.rot || 0);
  if (res.collide) aabbCollider(obj.x, obj.z, res.collide[0], res.collide[1], res.collide[2], obj.rot || 0);
  return true;
}

function buildCellDoor(obj) {
  const g = new THREE.Group(); const p = null; // see-through procedural bars read better than a solid mesh
  const barMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.85, roughness: 0.35 });
  const bars = new THREE.Group();
  if (p) { for (let i = -1; i <= 1; i++) { const c = p.clone(true); const tb = new THREE.Box3().setFromObject(c); const wdt = Math.max(0.5, tb.max.x - tb.min.x); c.scale.multiplyScalar(Math.min(1.5, 3.3 / wdt)); c.position.x = i * 3.3; bars.add(c); } }
  else {
    for (let i = 0; i < 21; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, obj.h, 6), barMat); b.position.set(-obj.w / 2 + 0.25 + i * (obj.w - 0.5) / 20, obj.h / 2, 0); bars.add(b); }
    [0.2, obj.h / 2, obj.h - 0.1].forEach(y => { const r = new THREE.Mesh(new THREE.BoxGeometry(obj.w, 0.12, 0.12), barMat); r.position.y = y; bars.add(r); });
  }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.25), new THREE.MeshStandardMaterial({ color: 0x111827, emissive: 0xef4444, emissiveIntensity: 2 }));
  lock.position.set(1.2, 1.3, 0.15); bars.add(lock);
  g.add(bars); g.position.set(obj.x, 0, obj.z); arenaGroup.add(g);
  const col = { minX: obj.x - obj.w / 2, maxX: obj.x + obj.w / 2, minY: 0, maxY: obj.h, minZ: obj.z - 0.4, maxZ: obj.z + 0.4 };
  colliders.push(col);
  CELL_DOOR = { group: g, bars, lock, col, x: obj.x, z: obj.z, w: obj.w, hp: 70, open: false, lift: 0 };
}

function openCellDoor(reason) {
  if (!CELL_DOOR || CELL_DOOR.open) return;
  CELL_DOOR.open = true; CELL_DOOR.lock.material.emissive.setHex(0x22c55e);
  colliders = colliders.filter(c => c !== CELL_DOOR.col); buildNavGrid();
  SFX.playKeyPickup(); STATE.screenShake = 0.3;
  showBanner('🔓 CELL BREACHED', reason + ' — move down the aisle into Server Hall G. Sentinels activate when you leave the aisle.', 5000);
  setTimeout(() => { addKillFeed('GEAR ACQUIRED: Warden locker 7 — combat shirt, knuckle gloves, wrist computer'); SFX.playKeyPickup(); }, 1400);
}
function damageCellDoor(dmg) {
  if (!CELL_DOOR || CELL_DOOR.open) return;
  CELL_DOOR.hp -= dmg; spawnImpact(CELL_DOOR.x + 1.2, 1.3, CELL_DOOR.z + 0.2, 0xfacc15);
  if (CELL_DOOR.hp <= 0) openCellDoor('Lock shot out');
}

function buildArenaMap() {
  while (arenaGroup.children.length > 0) arenaGroup.remove(arenaGroup.children[0]);
  colliders = []; walkableSurfaces = []; sirenBeaconMeshes = []; PICKUPS = []; ARENA_LIGHTS = []; STEAM_PARTICLES = []; BLINK_MATS = []; CELL_DOOR = null; COLOSSUS = null;
  COLOSSUS_BOLTS.forEach(b => scene.remove(b.mesh)); COLOSSUS_BOLTS = [];
  COLOSSI.forEach(C => { if (C.voice && C.voice.isPlaying) C.voice.stop(); if (C.laser) scene.remove(C.laser); if (C.cannon) scene.remove(C.cannon); (C.spots || []).forEach(sp => { scene.remove(sp.g); (sp.plates || []).forEach(p => scene.remove(p.m)); }); /* Round 21: soft-spot orbs leaked into the next floor */ }); COLOSSI = []; EMP_ARCS.forEach(a => scene.remove(a.mesh)); EMP_ARCS = []; colossusHud(null);
  const floor = STATE.floor || 0; const theme = FLOOR_THEMES[floor];
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.42, metalness: 0.78, bumpMap: WALL_PBR.bumpMap, bumpScale: 0.04 });
  const floorColors = [0xa8a49a, 0x8f9aa8, 0x9a8f80, 0x8a8078];
  const fm = new THREE.Mesh(new THREE.PlaneGeometry(220, 190), new THREE.MeshStandardMaterial({ map: FLOOR_PBR.map, bumpMap: FLOOR_PBR.bumpMap, bumpScale: 0.06, color: floorColors[floor], roughness: 0.58, metalness: 0.32, envMapIntensity: 0.45 }));
  fm.material.userData._bright = true;
  fm.rotation.x = -Math.PI / 2; fm.receiveShadow = true; arenaGroup.add(fm);
  // raised-floor tile lines for server floors
  if (floor === 1) { const grid = new THREE.GridHelper(180, 90, 0x64748b, 0x475569); grid.position.y = 0.02; grid.material.opacity = 0.35; grid.material.transparent = true; arenaGroup.add(grid); }
  createWall(0, -85, 180, 3, 12); createWall(0, 85, 180, 3, 12);
  createWall(-90, 0, 3, 170, 12); createWall(90, 0, 3, 170, 12);
  // ceiling trusses (skip centre on G so the colossus can tower)
  for (let tz = -72; tz <= 72; tz += 24) {
    const segs = floor === 0 ? [[-56, 64], [56, 64]] : [[0, 176]];
    segs.forEach(([cx, len]) => { const t = new THREE.Mesh(new THREE.BoxGeometry(len, 0.8, 0.9), steelMat); t.position.set(cx, floor === 0 ? 14.6 : 13.2, tz); arenaGroup.add(t); });
    [-36, 36].forEach(bx => { const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.5, 10), new THREE.MeshBasicMaterial({ color: 0x330a0a })); beacon.position.set(bx, floor === 0 ? 14.0 : 12.6, tz); arenaGroup.add(beacon); sirenBeaconMeshes.push(beacon); });
  }
  createSecurityElevator(FLOOR_INFO.exit.x, FLOOR_INFO.exit.z - 1.2);
  // lighting per theme
  const lh = floor === 0 ? 11 : 11.5;
  const spots = [[-50, 50], [0, 60], [50, 50], [-50, 10], [0, 20], [50, 10], [-50, -30], [0, -40], [50, -30], [0, -70]];
  RAILS = []; SOLIDS = [];
  LIGHT_COUNT = 0; const PAL = [0xffa24a, 0x4aa8ff, theme.light, 0xff5a3a];
  spots.forEach(([x, z], i) => addHangingLight(x, lh, z, i % 3 === 0 ? theme.light : PAL[(i + floor) % PAL.length], 2.2, 22));
  addLightStrips(floor);
  // key shadow-casting spotlights (security desk on G, entry zone below ground)
  const keySpots = floor === 0 ? [[0, 40, 0, 34], [0, 14, 0, -6]] : [[0, 60, 0, 50]];
  keySpots.slice(0, IS_COARSE ? 1 : 2).forEach(([x, z, tx, tz]) => {
    const sp = new THREE.SpotLight(0xfff1dd, 1.4, 60, 0.75, 0.5, 1.5); sp.position.set(x, floor === 0 ? 13 : 12.5, z);
    sp.target.position.set(tx, 0, tz); sp.castShadow = true; sp.shadow.mapSize.set(IS_COARSE ? 512 : 1024, IS_COARSE ? 512 : 1024);
    sp.shadow.bias = -0.0006; sp.shadow.normalBias = 0.05; sp.shadow.camera.near = 1; sp.shadow.camera.far = 60;
    arenaGroup.add(sp, sp.target);
  });
  let OFF_PLAN = []; try { OFF_PLAN = planOffices(floor); } catch (e) { console.warn('office plan', e); }
  MAP_OBJECTS.forEach(obj => {
    if (OFF_PLAN.length && officeSkip(obj, OFF_PLAN)) return;
    if (obj.type === 'celldoor') { buildCellDoor(obj); return; }
    if (obj.type === 'catwalk2' || obj.type === 'tower2') { buildElevated(obj); return; }
    if (obj.type === 'lamp') { addHangingLight(obj.x, 4.8, obj.z, obj.color || 0xffaa66, 1.2, 12); return; }
    if (obj.type === 'sign') { addSign(obj.x, obj.y || 5.2, obj.z, obj.rot || 0, obj.title || 'SECTOR', obj.sub || '', obj.color || '#f59e0b', obj.w || 7); return; }
    if (renderMapObject(obj)) return;
    renderLegacyObject(obj, steelMat);
  });
  COLOSSUS = COLOSSI[0] || null;
  addLoreForFloor(STATE.level || 1, floor);
  try { buildOffices(OFF_PLAN, floor); } catch (e) { console.warn('offices', e); }
  // pickups at free spots
  const rnd = seededRng(STATE.level * 31 + floor);
  const types = [['health', 0x22c55e], ['armor', 0x00f0ff], ['ammo', 0xfacc15], ['health', 0x22c55e], ['quad', 0xa855f7], ['emp', 0x38bdf8], ['emp', 0x38bdf8], ['emp', 0x38bdf8]];
  types.forEach(([type, color]) => {
    for (let t = 0; t < 30; t++) {
      const x = (rnd() - 0.5) * 150, z = FLOOR_INFO.spawnZone.minZ + rnd() * (FLOOR_INFO.spawnZone.maxZ - FLOOR_INFO.spawnZone.minZ);
      if (collidesAt(x, z, 1.2)) continue;
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.8 }));
      mesh.position.set(x, 1.2, z); arenaGroup.add(mesh); PICKUPS.push({ type, x, z, color, mesh, active: true, respawnTimer: 0 }); break;
    }
  });
  ENEMY_GRENADES.forEach(g => { scene.remove(g.mesh); if (g.ring) scene.remove(g.ring); }); ENEMY_GRENADES = [];
  buildNavGrid();
}

function startFloor(lvl, floor) {
  setTimeout(() => { try { STATE.zfix = fixCoplanarSurfaces(); } catch (e) { console.warn('zfix', e); } }, 1200);
  if (STATE.dm) { STATE.dm = false; try { DM.on = false; document.body.classList.remove('dm'); dmBoard(false); } catch (e) {} }
  STATE.level = lvl; STATE.floor = floor; STATE.bossSpawned = false; STATE.hasAccessKey = false; STATE.combatActive = false; HACK_TIMER = 0;
  STATE.floorCleared = false;
  if (STATE.weapons[3] && STATE.weapons[3].ammo < 4) STATE.weapons[3].ammo = 4;
  if (ACCESS_KEY) { arenaGroup.remove(ACCESS_KEY.group); ACCESS_KEY = null; }
  PROJECTILES.forEach(p => scene.remove(p.mesh)); PROJECTILES = [];
  document.getElementById('boss-hud').classList.add('hidden');
  const ks = document.getElementById('keycard-status');
  ks.textContent = floor === 0 ? '🔒 ESCAPE THE HOLDING CELL' : '🔒 STAIRWELL LOCKED · CLEAR FLOOR';
  ks.className = 'text-[10px] text-amber-300 font-bold block';
  const cfg = LEVEL_CONFIGS[lvl] || LEVEL_CONFIGS[1];
  { const fc = liftFog(cfg.fogColor); scene.background.copy(fc); scene.fog.color.copy(fc); } hemiLight.color.setHex(cfg.hemiTop);
  const layout = genFloorLayout(lvl, floor);
  MAP_OBJECTS = layout.objects; FLOOR_INFO = layout.info;
  buildArenaMap(); clearBots(); spawnExplosiveBarrels(IS_COARSE ? 3 : 5);
  STATE.player.x = FLOOR_INFO.start.x; STATE.player.y = 0; STATE.player.z = FLOOR_INFO.start.z; STATE.player.yaw = FLOOR_INFO.start.yaw; STATE.player.pitch = 0; STATE.player.vy = 0;
  // difficulty curve
  const count = Math.min(IS_COARSE ? 11 : 14, 4 + floor * 2 + Math.floor((lvl - 1) / 2));
  const heavyFrac = Math.min(0.75, 0.15 + floor * 0.15 + lvl * 0.03);
  const hpMult = (1 + 0.12 * (lvl - 1) + 0.12 * floor) * STATE.botSkill;
  STATE.diff = { dmg: 1 + 0.08 * (lvl - 1) + 0.06 * floor, fire: 1 + 0.06 * (lvl - 1) + 0.05 * floor };
  const rnd = seededRng(lvl * 7 + floor * 3 + 1); const Z = FLOOR_INFO.spawnZone;
  for (let i = 0; i < count; i++) {
    const tpl = BOT_ROSTER[i % BOT_ROSTER.length] || {};
    const humanFrac = Math.max(0.12, [0.5, 0.4, 0.3, 0.25][floor] - 0.01 * (lvl - 1));
    const human = (i % 4 === 1 || i % 4 === 3) ? rnd() < humanFrac * 2 * 0.95 : rnd() < humanFrac * 0.1;
    const heavy = !human && rnd() < heavyFrac;
    const squad = Math.floor(i / 4); const aiRole = ['suppressor', 'flanker', 'pusher', 'flanker'][i % 4];
    let x = 0, z = 0;
    for (let t = 0; t < 40; t++) { x = Z.minX + rnd() * (Z.maxX - Z.minX); z = Z.minZ + rnd() * (Z.maxZ - Z.minZ); if (!collidesAt(x, z, 1.1) && Math.hypot(x - STATE.player.x, z - STATE.player.z) > 28) break; }
    if (human) spawnBotFromArchetype({ ...tpl, id: `f${floor}-h${i}`, name: `Warden ${FLOOR_NAMES[floor]}-${i + 1}`, role: 'human', aiRole, squad, x, y: 0, z, maxHealth: 70, patrolType: 'ground' }, hpMult);
    else spawnBotFromArchetype({ ...tpl, id: `f${floor}-b${i}`, name: heavy ? `Heavy Triage Unit ${FLOOR_NAMES[floor]}-${i + 1}` : `Triage Unit ${FLOOR_NAMES[floor]}-${i + 1}`, role: heavy ? 'bot' : 'human_guard', aiRole, squad, x, y: 0, z, maxHealth: heavy ? 165 : 115, patrolType: 'ground' }, hpMult);
  }
  spawnDrones(lvl, floor);
  setTimeout(prewarmShaders, 50);
  // snipers posted on towers / catwalks
  const perches = (FLOOR_INFO.perches || []).slice();
  const nSnipers = Math.min(perches.length, [1, 2, 2, 3][floor] + (lvl >= 5 ? 1 : 0));
  for (let i = 0; i < nSnipers; i++) {
    const pc = perches[i]; const tpl = BOT_ROSTER[i % BOT_ROSTER.length] || {};
    const human = i % 2 === 0;
    spawnBotFromArchetype({ ...tpl, id: `f${floor}-s${i}`, name: human ? `Warden Marksman ${FLOOR_NAMES[floor]}-${i + 1}` : `Triage Overwatch ${FLOOR_NAMES[floor]}-${i + 1}`, role: human ? 'human' : 'human_guard', aiRole: 'sniper', squad: 9, x: pc.x, y: pc.y, z: pc.z, maxHealth: human ? 60 : 95, patrolType: 'ground' }, hpMult);
    const sb = BOTS[BOTS.length - 1]; sb.perch = pc; sb.y = pc.y; sb.yaw = Math.atan2(-pc.x, -pc.z);
  }
  // maintenance units (Menders) — basements only, more deeper + later
  if (floor >= 1) {
    const nM = Math.min(IS_COARSE ? 3 : 4, floor + Math.floor((lvl - 1) / 3));
    const bays = [[-70, -70], [70, -70], [-74, 0], [74, 0], [0, -66]];
    for (let i = 0; i < nM; i++) { let [mx, mz] = bays[(i + lvl) % bays.length]; for (let t = 0; t < 20 && collidesAt(mx, mz, 1.6); t++) { mx += (rnd() - 0.5) * 10; mz += rnd() * 6; } spawnMender(mx, mz, i, hpMult); }
    STATE.menderCueAt = performance.now() + 3600;
  } else STATE.menderCueAt = 0;
  const theme = FLOOR_THEMES[floor];
  if (floor === 0 && STATE.levelClearScore && STATE.levelClearScore.lvl === lvl - 1) { const lc = STATE.levelClearScore; STATE.levelClearScore = null; showBanner(`LEVEL ${lc.lvl} CLEARED`, `SCORE ${String(lc.score).padStart(6, '0')} · Next: Level ${lvl} — ${cfg.name}`, 4000); }
  else if (floor === 0) showBanner(`LEVEL ${lvl} · ${cfg.name}`, 'You are locked in a holding cell. Shoot the red lock, press E at the door, or stand at the cyan wall terminal to hack it.', 6500);
  else { showBanner(`LEVEL ${lvl} · FLOOR ${FLOOR_NAMES[floor]}`, theme.title + ' — MINI COLOSSUS DETECTED: only EMP [4] can breach its shielding.' + (floor === 3 ? ' Then kill the Minotaur for the exit keycard.' : ' Destroy it and all sentinels to unlock the stairwell.'), 6000); setTimeout(() => { if (STATE.floor === floor) STATE.combatActive = true; }, 1800); }
  updateHUD();
}
function startCampaignLevel(lvl) { if (lvl <= 1) { STATE.score = 0; const el = document.getElementById('score-val'); if (el) el.textContent = '000000'; } startFloor(lvl, 0); }

function unlockExit() {
  if (STATE.floorCleared) return;
  STATE.floorCleared = true; ELEVATOR_STATE.doorsOpen = true; ELEVATOR_STATE.doorMat.color.setHex(0x10b981);
  const ks = document.getElementById('keycard-status');
  ks.textContent = '🔓 STAIRWELL OPEN — HEAD NORTH'; ks.className = 'text-[10px] text-emerald-400 font-black block animate-pulse';
  addScore(1000, 'FLOOR CLEAR', null);
  showBanner(`FLOOR ${FLOOR_NAMES[STATE.floor]} CLEARED`, `SCORE ${String(STATE.score || 0).padStart(6, '0')} · Stairwell unlocked — descend to ${FLOOR_NAMES[STATE.floor + 1] || 'next level'}.`, 4500);
}
// Round 17: anti z-fighting pass. Run after a floor is built: coplanar decals/posters/signs/pools get
// separated along their normal, and boxes whose faces coincide with a differently-coloured box get a 3mm inset.
function fixCoplanarSurfaces() {
  arenaGroup.updateMatrixWorld(true);
  const planes = [], boxes = []; const v = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  arenaGroup.traverse(o => {
    if (!o.isMesh || o.userData.signTwin || !o.geometry) return; const t = o.geometry.type;
    if (t === 'PlaneGeometry' || t === 'CircleGeometry') { const n = new THREE.Vector3(0, 0, 1).transformDirection(o.matrixWorld); const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld); planes.push({ o, n, d: n.dot(p), b: new THREE.Box3().setFromObject(o) }); }
    else if (t === 'BoxGeometry' && !o.material.transparent) boxes.push({ o, b: new THREE.Box3().setFromObject(o) });
  });
  const ovA = (a, b, axes) => { let A = 1; for (const k of axes) { const ov = Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]); if (ov <= 0.02) return 0; A *= ov; } return A; };
  let fixedP = 0, fixedB = 0;
  // planes vs planes (same orientation, same depth, overlapping)
  for (let i = 0; i < planes.length; i++) { let stack = 0; const A = planes[i];
    for (let j = 0; j < i; j++) { const B = planes[j]; if (A.n.dot(B.n) < 0.995 || Math.abs(A.d - B.d) > 0.012) continue;
      const ax = Math.abs(A.n.x) > 0.9 ? ['y', 'z'] : Math.abs(A.n.y) > 0.9 ? ['x', 'z'] : ['x', 'y']; if (!ovA(A.b, B.b, ax)) continue; stack++; }
    if (stack) { const off = 0.014 * stack; const wpos = new THREE.Vector3().setFromMatrixPosition(A.o.matrixWorld).addScaledVector(A.n, off); A.o.parent.worldToLocal(wpos); A.o.position.copy(wpos); A.d += off; A.o.updateMatrixWorld(true); fixedP++; }
    const m = A.o.material; if (m && !m.polygonOffset && (m.transparent || m.map)) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; }
  }
  // planes lying exactly on a box face (decal flush with wall/floor): nudge 1cm out
  planes.forEach(P => { if (Math.abs(P.n.y) > 0.9 && P.d < 0.03) return; for (const B of boxes) { const ax = Math.abs(P.n.x) > 0.9 ? 'x' : Math.abs(P.n.y) > 0.9 ? 'y' : Math.abs(P.n.z) > 0.9 ? 'z' : null; if (!ax) return;
      const f = P.n[ax] > 0 ? B.b.max[ax] : B.b.min[ax]; const pv = P.b.min[ax]; if (Math.abs(pv - f) > 0.004) continue; const others = ['x', 'y', 'z'].filter(k => k !== ax); if (!ovA(P.b, B.b, others)) continue;
      const w = new THREE.Vector3().setFromMatrixPosition(P.o.matrixWorld).addScaledVector(P.n, 0.01); P.o.parent.worldToLocal(w); P.o.position.copy(w); P.o.updateMatrixWorld(true); fixedP++; break; } });
  // boxes with coincident same-facing faces and different colours
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j];
    const ca = A.o.material.color, cb = B.o.material.color; if (A.o.material === B.o.material || (ca && cb && ca.equals(cb) && A.o.material.map === B.o.material.map)) continue;
    for (const ax of ['x', 'y', 'z']) { const others = ['x', 'y', 'z'].filter(k => k !== ax); if (!ovA(A.b, B.b, others)) continue;
      if (Math.abs(A.b.max[ax] - B.b.max[ax]) < 0.003 || Math.abs(A.b.min[ax] - B.b.min[ax]) < 0.003) {
        const vA = (A.b.max.x - A.b.min.x) * (A.b.max.y - A.b.min.y) * (A.b.max.z - A.b.min.z), vB = (B.b.max.x - B.b.min.x) * (B.b.max.y - B.b.min.y) * (B.b.max.z - B.b.min.z);
        const S = vA < vB ? A : B; S.o.userData.zInset = S.o.userData.zInset || {}; if (S.o.userData.zInset[ax]) continue; const size = Math.max(0.004, S.b.max[ax] - S.b.min[ax]);
        // inset in world axis: approximate by scaling the local axis most aligned with it
        S.o.matrixWorld.decompose(v, q, sc); const inv = q.clone().invert(); const wa = new THREE.Vector3(ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0).applyQuaternion(inv);
        const la = Math.abs(wa.x) > Math.abs(wa.y) ? (Math.abs(wa.x) > Math.abs(wa.z) ? 'x' : 'z') : (Math.abs(wa.y) > Math.abs(wa.z) ? 'y' : 'z');
        S.o.scale[la] *= Math.max(0.9, 1 - 0.006 / size);
        S.o.userData.zInset[ax] = true; S.b.setFromObject(S.o); fixedB++; } } }
  return { planes: planes.length, fixedP, fixedB };
}
function advanceFloor() {
  if (STATE.floor < 3) return startFloor(STATE.level, STATE.floor + 1);
  if (STATE.level < STATE.maxLevels) { STATE.levelClearScore = { lvl: STATE.level, score: STATE.score || 0 }; return startFloor(STATE.level + 1, 0); }
  STATE.running = false; document.exitPointerLock?.();
  document.getElementById('modal-title').textContent = `⚡ ${GAME_BRAND_TITLE}: DATA CENTER 09 LIBERATED ⚡`;
  document.getElementById('modal-desc').innerHTML = `<b class="text-emerald-400">All 9 levels and 36 floors cleared.</b> Moses Protocol terminated.`;
  document.getElementById('game-modal').classList.remove('hidden');
}

function updateFloorLogic(dt, now) {
  // blinking rack LEDs
  BLINK_MATS.forEach(b => { b.phase += dt * b.rate; b.tex.offset.y = (Math.floor(b.phase) % 2) * 0.5; });
  updateColossus(dt, now);
  if (false) {
    gunMesh.updateMatrixWorld(true);
    const n = new THREE.Vector3(0, 0, -1).transformDirection(gunMesh.matrixWorld);
    const pt = new THREE.Vector3(0, 0, gunMesh.userData.clipZ).applyMatrix4(gunMesh.matrixWorld);
    GUN_CLIP.setFromNormalAndCoplanarPoint(n, pt);
  }
  updateShadowCamera();
  if (CELL_DOOR) {
    if (CELL_DOOR.open && CELL_DOOR.lift < 1) { CELL_DOOR.lift = Math.min(1, CELL_DOOR.lift + dt * 0.8); CELL_DOOR.bars.position.y = CELL_DOOR.lift * 4.4; }
    if (!CELL_DOOR.open) {
      const term = MAP_OBJECTS.find(o => o.hack);
      if (term && Math.hypot(STATE.player.x - term.x, STATE.player.z - term.z) < 2.2) {
        HACK_TIMER += dt;
        const ks = document.getElementById('keycard-status'); ks.textContent = `💻 HACKING LOCK ${Math.min(100, Math.round(HACK_TIMER / 1.5 * 100))}%`;
        if (HACK_TIMER >= 1.5) openCellDoor('Lock terminal hacked');
      } else HACK_TIMER = 0;
      if (KEYS['KeyE'] && Math.hypot(STATE.player.x - CELL_DOOR.x, STATE.player.z - CELL_DOOR.z) < 4) openCellDoor('Door forced open');
    }
  }
  if (!STATE.combatActive && FLOOR_INFO.activateZ != null && STATE.player.z < FLOOR_INFO.activateZ) {
    STATE.combatActive = true;
    const ks = document.getElementById('keycard-status'); ks.textContent = '🔒 STAIRWELL LOCKED · CLEAR FLOOR'; ks.className = 'text-[10px] text-amber-300 font-bold block';
    sirenActiveTimer = 4; SFX.playSiren && SFX.playSiren(3);
    showBanner('⚠ INTRUDER ALERT', 'COLOSSUS UNIT DETECTED — ONLY EMP CAN BREACH ITS SHIELDING. Switch to Ion EMP [4], destroy it and the sentinels to unlock the stairwell.', 5500);
    SFX.playRadioChatter('Detainee escaped holding! All Strogg units converge on Server Hall G!', 'SECTOR COMMAND');
  }
}


/** Detailed grimy biomechanical pulse cannon viewmodel */
function buildProceduralPulseCannon() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a241c, metalness: 0.75, roughness: 0.38 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x5c4030, metalness: 0.55, roughness: 0.55 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x1a1510, metalness: 0.3, roughness: 0.7 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 2.4 });
  const fleshMat = new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.85, metalness: 0.1 });
  weaponGlowMats = [glowMat];

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.55), bodyMat); g.add(receiver);
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.55, 12), rustMat);
  shroud.rotation.x = Math.PI / 2; shroud.position.set(0, 0.02, -0.45); g.add(shroud);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.42, 10), bodyMat);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -0.78); g.add(barrel);
  // energy coils with fleshy wraps
  for (let i = 0; i < 3; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 14), glowMat);
    coil.position.set(0, 0.02, -0.35 - i * 0.12); g.add(coil);
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.01, 4, 10), fleshMat);
    wrap.position.copy(coil.position); wrap.rotation.z = 0.4; g.add(wrap);
  }
  // glowing cells
  for (let i = 0; i < 2; i++) {
    const cell = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.08), glowMat);
    cell.position.set(0.1, 0.06, -0.1 - i * 0.12); g.add(cell);
  }
  // heat vents
  for (let i = 0; i < 4; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.08), rustMat);
    vent.position.set(-0.09, 0.08, -0.25 - i * 0.08); g.add(vent);
  }
  // scope rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.35), bodyMat); rail.position.set(0, 0.14, -0.15); g.add(rail);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 10), rustMat);
  scope.rotation.x = Math.PI / 2; scope.position.set(0, 0.2, -0.05); g.add(scope);
  // grip / hand hints
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.1), gripMat); grip.position.set(0, -0.16, 0.05); grip.rotation.x = 0.35; g.add(grip);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.22), rustMat); stock.position.set(0, 0.0, 0.32); g.add(stock);
  const handHint = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), fleshMat); handHint.position.set(0.05, -0.1, -0.15); g.add(handHint);

  muzzleAnchor = new THREE.Object3D(); muzzleAnchor.position.set(0, 0.02, -1.0); g.add(muzzleAnchor);
  g.position.set(0.32, -0.28, -0.52);
  return g;
}

function findMuzzleLocalOffset(root) {
  // Pick the mesh vertex furthest in local -Z (barrel tip for FPS)
  let best = new THREE.Vector3(0, 0.02, -0.55);
  let bestZ = 0;
  const v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse(c => {
    if (!c.isMesh || !c.geometry) return;
    const pos = c.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      c.localToWorld(v);
      root.worldToLocal(v);
      if (v.z < bestZ) { bestZ = v.z; best.copy(v); }
    }
  });
  return best;
}

// Meshy weapon: find long axis + which end is the (thinner) barrel, return yaw so the barrel points down -Z
function gunYawToForward(model) {
  if (model.userData && model.userData.forceYaw !== undefined) return model.userData.forceYaw;
  model.updateMatrixWorld(true);
  const pts = []; const v = new THREE.Vector3();
  model.traverse(c => { if (!c.isMesh || !c.geometry?.attributes?.position) return; const pa = c.geometry.attributes.position; const step = Math.max(1, Math.floor(pa.count / 4000)); for (let i = 0; i < pa.count; i += step) { v.fromBufferAttribute(pa, i); c.localToWorld(v); model.parent ? model.parent.worldToLocal(v) : null; pts.push(v.clone()); } });
  if (!pts.length) return 0;
  const bb = new THREE.Box3().setFromPoints(pts); const sz = new THREE.Vector3(); bb.getSize(sz);
  const axis = sz.x > sz.z ? 'x' : 'z'; const lo = bb.min[axis], len = bb.max[axis] - lo;
  const spread = end => { let mn = Infinity, mx = -Infinity; pts.forEach(p => { const t = (p[axis] - lo) / len; if ((end < 0 && t < 0.15) || (end > 0 && t > 0.85)) { mn = Math.min(mn, p.y); mx = Math.max(mx, p.y); } }); return mx - mn; };
  const barrelAtMax = spread(1) < spread(-1);
  if (axis === 'z') return barrelAtMax ? Math.PI : 0;
  return barrelAtMax ? Math.PI / 2 : -Math.PI / 2;
}

function buildViewModel() {
  while (viewModelGroup.children.length > 0) viewModelGroup.remove(viewModelGroup.children[0]);
  weaponGlowMats = [];
  const WK = ['cannon', 'shotgun', 'rocket', 'emp'];
  { const wi = STATE.currentWeapon; const hasTpl = wi === 0 ? !!MESHY_TEMPLATES.viewmodel : wi === 1 ? !!VM_TPL.shotgun : wi === 2 ? !!VM_TPL.rocket : wi === 3 ? !!VM_TPL.emp : false;
    if (wi > 0 && !hasTpl) {
      const wrap = new THREE.Group(); const gm = buildProcWeapon(WK[wi]); wrap.add(gm); viewModelGroup.add(wrap); gunMesh = wrap; wrap.userData.kind = WK[wi];
      muzzleAnchor = new THREE.Object3D(); muzzleAnchor.position.set(0, wi === 1 ? 0.022 : 0, wi === 1 ? -0.8 : wi === 2 ? -0.72 : -0.68); wrap.add(muzzleAnchor);
      tacDetail(wrap, WK[wi], -1, gm); if (gm.userData.ionMat) weaponGlowMats.push(gm.userData.ionMat);
      attachFPSArms(wrap); return;
    }
  }
  if (MESHY_TEMPLATES.viewmodel) {
    const wrap = new THREE.Group();
    const wi = STATE.currentWeapon; wrap.userData.kind = WK[wi];
    const vtpl = (wi === 1 && VM_TPL.shotgun) || (wi === 2 && VM_TPL.rocket) || (wi === 3 && VM_TPL.emp) || MESHY_TEMPLATES.viewmodel;
    const isCannonTpl = vtpl === MESHY_TEMPLATES.viewmodel;
    const clone = vtpl.scene.clone(true); clone.userData = { ...vtpl.scene.userData };
    const inner = new THREE.Group(); inner.add(clone); wrap.add(inner);
    inner.rotation.y = gunYawToForward(clone);
    // scale so the weapon is ~0.62m long and centre it on the grip point
    wrap.updateMatrixWorld(true);
    let bb = meshOnlyBounds(inner); const sz = new THREE.Vector3(); bb.getSize(sz);
    const sc = (wi === 2 && !isCannonTpl ? 0.7 : 0.56) / Math.max(0.05, sz.z); inner.scale.setScalar(sc);
    wrap.updateMatrixWorld(true); bb = meshOnlyBounds(inner);
    const ctr = new THREE.Vector3(); bb.getCenter(ctr);
    inner.position.set(-ctr.x, -ctr.y, -ctr.z - 0.34);
    viewModelGroup.add(wrap); gunMesh = wrap;
    muzzleAnchor = new THREE.Object3D();
    muzzleAnchor.position.copy(findMuzzleLocalOffset(wrap));
    wrap.add(muzzleAnchor);
    const wcolD = [0x38bdf8, 0xff8a2a, 0xff3b30, 0x7dd3fc][wi] || 0x38bdf8;
    const ownEmp = wi === 3 && vtpl === VM_TPL.emp; // Round 19: Meshy Ion EMP is fully modelled — skip procedural dressing
    if (!ownEmp) {
    sciFiDress(wrap, wcolD, -1, ['cannon', 'shotgun', 'rocket', 'emp'][wi] || 'cannon', inner);
    try { tacDetail(wrap, WK[wi] || 'cannon', -1, inner); } catch (e) {}
    }
    if (wi === 3) {
      const wcol = (STATE.weapons[STATE.currentWeapon] || {}).color || 0xffffff;
      const ringMat = new THREE.MeshStandardMaterial({ color: wcol, emissive: wcol, emissiveIntensity: 2.2 });
      for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 14), ringMat); ring.position.copy(muzzleAnchor.position); ring.position.z += 0.06 + i * 0.05; wrap.add(ring); }
      weaponGlowMats.push(ringMat);
    }
    // trim the square buttplate at the rear of the Meshy cannon
    wrap.updateMatrixWorld(true); const wb = meshOnlyBounds(inner);
    wrap.userData.clipZ = wb.max.z - (wb.max.z - wb.min.z) * (isCannonTpl ? 0.2 : wi === 1 ? 0.12 : 0.02);
    const clipZ = wrap.userData.clipZ; wrap.userData.clipZ = null;
    const toWrap = new THREE.Matrix4(); const inv = new THREE.Matrix4().copy(wrap.matrixWorld).invert(); const va = new THREE.Vector3();
    inner.traverse(o => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const g2 = o.geometry.clone(); const pos = g2.attributes.position; toWrap.multiplyMatrices(inv, o.matrixWorld);
      const zs = new Float32Array(pos.count); for (let i = 0; i < pos.count; i++) { va.fromBufferAttribute(pos, i).applyMatrix4(toWrap); zs[i] = va.z; }
      const idx = g2.index ? Array.from(g2.index.array) : [...Array(pos.count).keys()];
      const keep = []; for (let i = 0; i < idx.length; i += 3) { const a = idx[i], b = idx[i + 1], c = idx[i + 2]; if (!(zs[a] > clipZ && zs[b] > clipZ && zs[c] > clipZ)) keep.push(a, b, c); }
      g2.setIndex(keep); o.geometry = g2;
    });
    attachFPSArms(wrap);
  } else if (STATE.currentWeapon === 0) {
    gunMesh = buildProceduralPulseCannon();
    viewModelGroup.add(gunMesh); try { tacDetail(gunMesh, 'cannon', -1); } catch (e) {} attachFPSArms(gunMesh);
  } else {
    const wep = STATE.weapons[STATE.currentWeapon] || STATE.weapons[0];
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.65), new THREE.MeshStandardMaterial({ color: 0x2a241c, metalness: 0.8, roughness: 0.3 }));
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.52), new THREE.MeshStandardMaterial({ color: wep.color, emissive: wep.color, emissiveIntensity: 2.0 }));
    stripe.position.y = 0.06; g.add(body, stripe); g.position.set(0.28, -0.26, -0.48);
    viewModelGroup.add(g); gunMesh = g;
    muzzleAnchor = new THREE.Object3D(); muzzleAnchor.position.set(0, 0, -0.45); g.add(muzzleAnchor);
    attachFPSArms(g);
  }
}

function renderWeaponBar() {
  const bar = document.getElementById('weapon-bar-container');
  bar.innerHTML = '';
  STATE.weapons.forEach((w, idx) => {
    const active = idx === STATE.currentWeapon;
    const btn = document.createElement('button');
    btn.className = `wep-btn action-btn px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 ${active ? 'border-2 border-amber-400 bg-amber-950/90 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.45)]' : 'border border-gray-600 bg-slate-950/80 text-gray-400'}`;
    btn.innerHTML = `<span class="text-[10px] opacity-75">[${idx + 1}]</span> ${w.name.split(' ').pop().toUpperCase()}`;
    btn.onclick = () => switchWeapon(idx);
    bar.appendChild(btn);
  });
}
function switchWeapon(idx) {
  if (idx < 0 || idx >= STATE.weapons.length) return;
  STATE.currentWeapon = idx; buildViewModel(); renderWeaponBar(); updateHUD(); onWeaponSwapped(idx);
}

function spawnMuzzleFlash(worldPos, color = 0xf59e0b, fromPlayer = true) {
  fxInit(); const x = worldPos.x, y = worldPos.y, z = worldPos.z;
  // pooled additive sprites: hot white core + coloured petal + a few sparks (no geometry/material churn per shot)
  fxEmit('dot', x, y, z, { life: 0.06, s0: fromPlayer ? 0.55 : 0.4, s1: 0.2, color: 0xfffbeb });
  fxEmit('fire', x, y, z, { life: 0.08, s0: fromPlayer ? 0.75 : 0.5, s1: 0.35, color });
  for (let i = 0; i < (IS_COARSE ? 2 : 5); i++) fxEmit('dot', x, y, z, { life: 0.12 + Math.random() * 0.1, s0: 0.08, s1: 0.02, color, vx: (Math.random() - 0.5) * 7, vy: Math.random() * 4, vz: (Math.random() - 0.5) * 7, grav: 9 });
  if (!IS_COARSE || fromPlayer) fxLight(x, y, z, fromPlayer ? 3.2 : 1.6, 0.07, color);
  if (fromPlayer) {
    const vig = document.getElementById('muzzle-vignette');
    if (vig) { vig.style.opacity = '1'; setTimeout(() => { vig.style.opacity = '0'; }, 50); }
  }
}
function spawnImpact(x, y, z, color = 0xf59e0b) {
  for (let i = 0; i < (IS_COARSE ? 4 : 10); i++) {
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 4, 4),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    spark.position.set(x, y, z); scene.add(spark);
    MUZZLE_FX.push({ mesh: spark, life: 0.2, max: 0.25, vx: (Math.random() - 0.5) * 8, vy: Math.random() * 6, vz: (Math.random() - 0.5) * 8, light: null });
  }
  if (!IS_COARSE) {
    const decal = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 8),
      new THREE.MeshBasicMaterial({ color: 0x1a1008, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    decal.rotation.x = -Math.PI / 2; decal.position.set(x, Math.max(0.03, y), z); scene.add(decal);
    IMPACT_DECALS.push({ mesh: decal, life: 8 });
    if (IMPACT_DECALS.length > 40) { const old = IMPACT_DECALS.shift(); scene.remove(old.mesh); }
  }
}

function meshOnlyBounds(root) {
  const box = new THREE.Box3();
  let any = false;
  root.updateMatrixWorld(true);
  root.traverse(c => {
    if (c.isMesh && c.geometry) {
      if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
      const b = c.geometry.boundingBox.clone();
      b.applyMatrix4(c.matrixWorld);
      if (!any) { box.copy(b); any = true; } else box.union(b);
    }
  });
  if (!any) box.setFromObject(root);
  return box;
}

function normalizeMeshyScene(model, targetHeight, opts = {}) {
  // reset then scale by mesh-only height
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);
  let skinned = false; model.traverse(c => { if (c.isSkinnedMesh) skinned = true; });
  if (skinned) {
    // skinned meshes render through bones; geometry bind-space bounds are the true size (matrixWorld of the mesh is ignored by skinning)
    const sb = new THREE.Box3(); let any = false;
    model.traverse(c => { if (c.isSkinnedMesh) { c.frustumCulled = false; c.geometry.computeBoundingBox(); if (!any) { sb.copy(c.geometry.boundingBox); any = true; } else sb.union(c.geometry.boundingBox); } });
    const sz = new THREE.Vector3(); sb.getSize(sz);
    const sc = targetHeight / Math.max(0.01, sz.y);
    model.scale.setScalar(sc); model.position.y = -sb.min.y * sc; model.updateMatrixWorld(true);
    return { height: targetHeight, radius: Math.max(0.55, Math.max(sz.x, sz.z) * sc * 0.35), size: sz.multiplyScalar(sc) };
  }
  let box = meshOnlyBounds(model);
  const size = new THREE.Vector3(); box.getSize(size);
  const h = Math.max(0.01, size.y);
  const s = targetHeight / h;
  model.scale.setScalar(s);
  model.updateMatrixWorld(true);
  box = meshOnlyBounds(model);
  model.position.y = -box.min.y;
  if (opts.yaw) model.rotation.y = opts.yaw;
  model.updateMatrixWorld(true);
  const finalBox = meshOnlyBounds(model);
  const finalSize = new THREE.Vector3(); finalBox.getSize(finalSize);
  return { height: finalSize.y, radius: Math.max(finalSize.x, finalSize.z) * 0.35, size: finalSize };
}

function autoLoadMeshyAssets() {
  if (typeof THREE.GLTFLoader !== 'function') {
    const st = document.getElementById('splash-status');
    if (st) st.textContent = 'All systems online';
    return Promise.resolve();
  }
  const loader = new THREE.GLTFLoader();
  const jobs = [
    { file: 'models/sentinel_guard.glb', role: 'guard', height: 2.15 },
    { file: 'models/sentinel_heavy.glb', role: 'bot', height: 2.55 },
    { file: 'models/human_guard.glb', role: 'human', height: 1.8 },
    { file: 'models/guard_rifle_scifi.glb', role: 'ewep:rifle', height: 0.3, yaw: -Math.PI / 2 },
    { file: 'models/player_shotgun_scifi.glb', role: 'vm:shotgun', height: 0.3, yaw: -Math.PI / 2 },
    { file: 'models/player_rocket_scifi.glb', role: 'vm:rocket', height: 0.3, yaw: Math.PI / 2 },
    { file: 'models/mender_unit.glb', role: 'mender', height: 2.5 },
    { file: 'models/sentinel_pulse_rifle.glb', role: 'ewep:pulse', height: 0.35 },
    { file: 'models/pulse_cannon.glb', role: 'viewmodel', height: 0.55 },
    { file: 'models/crate.glb', role: 'prop:crate', height: 1.2 },
    { file: 'models/server_rack.glb', role: 'prop:server_rack', height: 2.4 },
    { file: 'models/barrel.glb', role: 'prop:barrel', height: 1.1 },
    { file: 'models/pipe_vent.glb', role: 'prop:pipe_vent', height: 1.4 },
    { file: 'models/security_desk.glb', role: 'prop:security_desk', height: 1.1 },
    { file: 'models/office_chair.glb', role: 'prop:office_chair', height: 1.1 },
    { file: 'models/desk_monitors.glb', role: 'prop:desk_monitors', height: 0.6 },
    { file: 'models/filing_cabinet.glb', role: 'prop:filing_cabinet', height: 1.3 },
    { file: 'models/cooling_unit.glb', role: 'prop:cooling_unit', height: 2.1 },
    { file: 'models/ups_cabinet.glb', role: 'prop:ups_cabinet', height: 1.9 },
    { file: 'models/cell_door.glb', role: 'prop:cell_door', height: 4.2 },
    { file: 'models/cell_bench.glb', role: 'prop:cell_bench', height: 0.6 },
    { file: 'models/wall_terminal.glb', role: 'prop:wall_terminal', height: 0.8 },
    { file: 'models/ph_extinguisher.glb', role: 'prop:ph_extinguisher', height: 0.62 },
    { file: 'models/ph_security_camera.glb', role: 'prop:ph_camera', height: 0.42 },
    { file: 'models/ph_power_box.glb', role: 'prop:ph_powerbox', height: 0.9 },
    { file: 'models/ph_airduct.glb', role: 'prop:ph_airduct', height: 0.75 },
    { file: 'models/bot_drone.glb', role: 'prop:bot_drone', height: 0.9 },
    { file: 'models/mender_treads.glb', role: 'prop:mender_treads', height: 0.9 },
    { file: 'models/player_ion_emp.glb', role: 'vm:emp', height: 0.3, yaw: Math.PI / 2 },
    { file: 'models/sentinel_colossus.glb', role: 'colossus', height: 1 }
  ];
  let loaded = 0;
  return Promise.all(jobs.map(job => new Promise(async resolve => {
    try {
      const head = await fetch(job.file, { method: 'GET', cache: 'force-cache' });
      // use GET with abort via content — HEAD may 404-log; try fetch full only if content-length small... just try load
      if (!head.ok) { resolve(); return; }
      const buf = await head.arrayBuffer();
      loader.parse(buf, '', gltf => {
        const model = gltf.scene || gltf.scenes?.[0];
        if (!model) { resolve(); return; }
        const metrics = normalizeMeshyScene(model, job.height);
        model.traverse(c => { if (c.isMesh && c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach(brightenMat); });
        const tpl = {
          scene: model,
          animations: gltf.animations || [],
          targetHeight: metrics.height || job.height,
          hitRadius: Math.max(0.55, metrics.radius || 0.7),
          hitHeight: (metrics.height || job.height) * 1.05
        };
        if (job.role === 'guard') MESHY_TEMPLATES.guard = tpl;
        else if (job.role === 'bot') MESHY_TEMPLATES.bot = tpl;
        else if (job.role.startsWith('vm:')) { model.userData.forceYaw = job.yaw; VM_TPL[job.role.slice(3)] = tpl; if (MESHY_TEMPLATES.viewmodel) buildViewModel(); }
        else if (job.role === 'mender') { MESHY_TEMPLATES.mender = tpl; }
        else if (job.role === 'colossus') { MESHY_TEMPLATES.colossus = tpl; }
        else if (job.role.startsWith('ewep:')) { const kind = job.role.slice(5); if (job.yaw !== undefined) model.userData.forceYaw = job.yaw; ENEMY_WEAPON_TPL[kind] = prepWeaponTemplate(model, kind === 'rifle' ? 0.95 : 1.0); sciFiDress(ENEMY_WEAPON_TPL[kind], kind === 'rifle' ? 0x38e0ff : 0xff5a1a, +1, kind === 'rifle' ? 'rifle' : 'pulse'); try { tacDetail(ENEMY_WEAPON_TPL[kind], kind, +1, null, IS_COARSE); } catch (e) {} BOTS.forEach(b => { if ((kind === 'rifle') === !!b.isHuman) equipEnemyWeapon(b); }); }
        else if (job.role === 'human') { MESHY_TEMPLATES.human = tpl; BOTS.filter(b => b.isHuman && b.procHuman).forEach(b => { const r = buildRigFromMeshyTemplate(tpl, b.name, false); r.root.position.copy(b.rig.root.position); r.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.remove(b.rig.root); scene.add(r.root); b.rig = r; b.mixer = r.mixer || null; b.procHuman = false; if (b.mixer && b.mixer._actions[0]) b.action = b.mixer._actions[0]; r.hb.update(b.health, b.maxHealth); equipEnemyWeapon(b); }); }
        else if (job.role === 'viewmodel') {
          // keep a clean unrotated copy for FPS; barrel assumed along longest horizontal axis
          MESHY_TEMPLATES.viewmodel = tpl;
        } else if (job.role.startsWith('prop:')) MESHY_TEMPLATES.props[job.role.slice(5)] = tpl;
        loaded++;
        resolve();
      }, err => { console.warn('Meshy parse', job.file, err); resolve(); });
    } catch (e) { resolve(); }
  }))).then(() => {
    const st = document.getElementById('splash-status');
    if (st) st.textContent = 'Sentinels calibrated';
    if (MESHY_TEMPLATES.viewmodel) buildViewModel();
  });
}

// ============================================================================
// TACTICAL SQUAD AI — nav grid + A*, cover, roles, awareness, fair aim
// ============================================================================
const NAV = { cs: 2, ox: -88, oz: -84, w: 88, h: 84, move: null, lcs: 1, lw: 176, lh: 168, high: null, low: null };
let COVER_POINTS = [];
let AI_TRACE = [];
let ENEMY_GRENADES = [];
const AI_G = { grenadeCD: 8, campAnchor: { x: 0, z: 0 }, campT: 0, lastShoutT: 0, lastReloadT: -1e9 };
function aiTrace(b, msg) { AI_TRACE.push(`${(performance.now() / 1000).toFixed(1)}s ${b.name} [${b.role}] ${msg}`); if (AI_TRACE.length > 400) AI_TRACE.shift(); }

function buildNavGrid() {
  NAV.move = new Uint8Array(NAV.w * NAV.h); NAV.high = new Uint8Array(NAV.lw * NAV.lh); NAV.low = new Uint8Array(NAV.lw * NAV.lh);
  const mark = (arr, W, H, cs, ox, oz, x0, x1, z0, z1) => {
    const i0 = Math.max(0, Math.floor((x0 - ox) / cs)), i1 = Math.min(W - 1, Math.floor((x1 - ox) / cs));
    const j0 = Math.max(0, Math.floor((z0 - oz) / cs)), j1 = Math.min(H - 1, Math.floor((z1 - oz) / cs));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) arr[j * W + i] = 1;
  };
  colliders.forEach(c => {
    if (c.dyn) return;
    if (c.minY < 1.8) mark(NAV.move, NAV.w, NAV.h, NAV.cs, NAV.ox, NAV.oz, c.minX - 0.6, c.maxX + 0.6, c.minZ - 0.6, c.maxZ + 0.6);
    if (c.minY < 1.2 && c.maxY >= 1.7) mark(NAV.high, NAV.lw, NAV.lh, NAV.lcs, NAV.ox, NAV.oz, c.minX + 0.15, c.maxX - 0.15, c.minZ + 0.15, c.maxZ - 0.15);
    if (c.minY < 0.6 && c.maxY >= 0.95) mark(NAV.low, NAV.lw, NAV.lh, NAV.lcs, NAV.ox, NAV.oz, c.minX + 0.15, c.maxX - 0.15, c.minZ + 0.15, c.maxZ - 0.15);
  });
  buildCoverPoints();
}
const navIdx = (x, z) => { const i = Math.floor((x - NAV.ox) / NAV.cs), j = Math.floor((z - NAV.oz) / NAV.cs); return (i < 0 || j < 0 || i >= NAV.w || j >= NAV.h) ? -1 : j * NAV.w + i; };
const navFree = (x, z) => { const k = navIdx(x, z); return k >= 0 && !NAV.move[k]; };
function losGrid(ax, az, bx, bz, arr) {
  const d = Math.hypot(bx - ax, bz - az); const n = Math.ceil(d / 0.5);
  for (let s = 1; s < n; s++) {
    const t = s / n; if (t * d < 0.7 || (1 - t) * d < 0.7) continue;
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    const i = Math.floor((x - NAV.ox) / NAV.lcs), j = Math.floor((z - NAV.oz) / NAV.lcs);
    if (i < 0 || j < 0 || i >= NAV.lw || j >= NAV.lh) return false;
    if (arr[j * NAV.lw + i]) return false;
  }
  return true;
}
function buildCoverPoints() {
  COVER_POINTS = [];
  colliders.forEach(c => {
    if (c.maxY < 0.95 || c.minY > 0.6) return;
    const tall = c.maxY >= 1.7; const W = c.maxX - c.minX, D = c.maxZ - c.minZ;
    if (W > 120 || D > 120) return; // skip outer shell walls
    const sides = [
      { nx: 0, nz: -1, ax: 'x', a0: c.minX, a1: c.maxX, fixed: c.minZ - 1.1 }, { nx: 0, nz: 1, ax: 'x', a0: c.minX, a1: c.maxX, fixed: c.maxZ + 1.1 },
      { nx: -1, nz: 0, ax: 'z', a0: c.minZ, a1: c.maxZ, fixed: c.minX - 1.1 }, { nx: 1, nz: 0, ax: 'z', a0: c.minZ, a1: c.maxZ, fixed: c.maxX + 1.1 }];
    sides.forEach(sd => {
      const len = sd.a1 - sd.a0; const n = Math.min(8, Math.max(2, Math.round(len / 4) + 1));
      for (let k = 0; k < n; k++) {
        const a = sd.a0 + 0.4 + (len - 0.8) * (n === 1 ? 0.5 : k / (n - 1));
        const x = sd.ax === 'x' ? a : sd.fixed, z = sd.ax === 'x' ? sd.fixed : a;
        if (!navFree(x, z)) continue;
        // peek spot: step past the end of the cover for tall cover, stand up for low cover
        let px = x, pz = z;
        if (tall) { const edgeLo = k === 0, edgeHi = k === n - 1; if (!(edgeLo || edgeHi)) { if (len > 6) continue; } const off = edgeLo ? -1.4 : 1.4; if (sd.ax === 'x') px = x + off; else pz = z + off; if (!navFree(px, pz)) continue; }
        COVER_POINTS.push({ x, z, px, pz, tall, nx: -sd.nx, nz: -sd.nz });
      }
    });
  });
  if (COVER_POINTS.length > 700) COVER_POINTS = COVER_POINTS.filter((_, i) => i % Math.ceil(COVER_POINTS.length / 700) === 0);
}
// --- A* on the 2 m grid ---
function aStar(sx, sz, gx, gz) {
  const W = NAV.w, H = NAV.h; let s = navIdx(sx, sz), g = navIdx(gx, gz);
  const nearestFree = k => { if (k < 0) return -1; if (!NAV.move[k]) return k; const i = k % W, j = (k / W) | 0; for (let r = 1; r < 4; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < W && jj < H && !NAV.move[jj * W + ii]) return jj * W + ii; } return -1; };
  s = nearestFree(s); g = nearestFree(g); if (s < 0 || g < 0) return null;
  const gScore = new Float32Array(W * H).fill(1e9), came = new Int32Array(W * H).fill(-1), closed = new Uint8Array(W * H);
  const heap = []; const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const gi = g % W, gj = (g / W) | 0; const hfn = k => { const dx = Math.abs(k % W - gi), dz = Math.abs(((k / W) | 0) - gj); return Math.max(dx, dz) + 0.41 * Math.min(dx, dz); };
  gScore[s] = 0; push(s, hfn(s)); let it = 0;
  while (heap.length && it++ < 4000) {
    const [, k] = pop(); if (k === g) break; if (closed[k]) continue; closed[k] = 1;
    const i = k % W, j = (k / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
      const nk = jj * W + ii; if (NAV.move[nk] || closed[nk]) continue;
      if (di && dj && (NAV.move[j * W + ii] || NAV.move[jj * W + i])) continue;
      const ng = gScore[k] + (di && dj ? 1.41 : 1); if (ng < gScore[nk]) { gScore[nk] = ng; came[nk] = k; push(nk, ng + hfn(nk)); }
    }
  }
  if (came[g] < 0 && g !== s) return null;
  const path = []; for (let k = g; k !== -1 && k !== s; k = came[k]) path.push({ x: NAV.ox + (k % W + 0.5) * NAV.cs, z: NAV.oz + (((k / W) | 0) + 0.5) * NAV.cs });
  path.reverse(); if (path.length) { path[path.length - 1] = { x: gx, z: gz }; } return path;
}
// --- callouts ---
const CALLOUT_AUDIO = {};
function guardShout(b, key, text) {
  if (!b || b.dying) return; const now = performance.now();
  if (now - AI_G.lastShoutT < 1300 || now - (b.lastShout || 0) < 4000) return;
  AI_G.lastShoutT = now; b.lastShout = now;
  const d = Math.hypot(b.x - STATE.player.x, b.z - STATE.player.z);
  if (b.isHuman) {
    addKillFeed(`🎧 ${b.callsign}: "${text}"`);
    try { if (!SFX.muted) { const a = (CALLOUT_AUDIO[key] = CALLOUT_AUDIO[key] || new Audio(`audio/guard_${key}.mp3`)); const c = a.cloneNode(); c.volume = Math.max(0.15, Math.min(1, 1 - d / 70)); c.play().catch(() => {}); } } catch (e) {}
  } else if (key === 'contact') addKillFeed(`🤖 ${b.name}: TARGET ACQUIRED`);
}
function alertAllies(b, radius) {
  BOTS.forEach(o => { if (o === b || o.dying || o.isBoss) return; if (Math.hypot(o.x - b.x, o.z - b.z) < radius && o.aiState !== 'combat') { o.aiState = 'alert'; o.lastKnown = { ...b.lastKnown }; o.path = null; o.thinkT = 0.15 + Math.random() * 0.4; aiTrace(o, 'alerted by ally callout'); } });
}
function aiNoise(x, z, radius) {
  BOTS.forEach(o => { if (o.dying || o.isBoss || o.aiState === 'combat') return; if (Math.hypot(o.x - x, o.z - z) < radius) { o.aiState = 'alert'; o.lastKnown = { x: x + (Math.random() - 0.5) * 6, z: z + (Math.random() - 0.5) * 6 }; o.path = null; if (Math.random() < 0.3) aiTrace(o, 'heard gunfire → investigating'); } });
}
function initBotAI(b) {
  b.aiState = 'idle'; b.phase = 'move'; b.thinkT = Math.random() * 0.6; b.path = null; b.pathI = 0; b.cover = null; b.coverHits = 0;
  b.lockT = 0; b.reactT = 0; b.burstLeft = 0; b.shotT = 0; b.phaseT = 0; b.crouch = 0; b.los = false; b.lastSeenT = -1e9; b.lastKnown = null;
  b.speed = b.isHuman ? 6.6 : (b.heavy ? 3.9 : 4.8); b.patrolT = 2 + Math.random() * 4;
  if (b.mixer && b.mixer._actions && b.mixer._actions[0]) b.action = b.mixer._actions[0];
  b.callsign = b.isHuman ? ['Ruiz', 'Okafor', 'Brandt', 'Ivanova', 'Kade', 'Mercer', 'Holt', 'Sato', 'Varga', 'Pike', 'Reyes', 'Lund'][Math.floor(Math.random() * 12)] : b.name;
}
function pickCover(b) {
  const P = STATE.player; let best = null, bestS = -1e9;
  const anchor = BOTS.find(o => o !== b && !o.dying && o.role === 'suppressor' && o.squad === b.squad) || b;
  const aAng = Math.atan2(anchor.x - P.x, anchor.z - P.z);
  const pushing = b.role === 'pusher' && (performance.now() - AI_G.lastReloadT < 3500 || P.health < 45);
  for (const c of COVER_POINTS) {
    const db = Math.hypot(c.x - b.x, c.z - b.z); if (db > 34) continue;
    const dp = Math.hypot(c.x - P.x, c.z - P.z); if (dp < 6 || dp > 48) continue;
    if (BOTS.some(o => o !== b && !o.dying && o.cover && Math.hypot(o.cover.x - c.x, o.cover.z - c.z) < 3.5)) continue;
    const protectedFromPlayer = !losGrid(c.x, c.z, P.x, P.z, c.tall ? NAV.high : NAV.low); if (!protectedFromPlayer) continue;
    const peekOK = losGrid(c.px, c.pz, P.x, P.z, NAV.high);
    let s = -db * 0.55 + (peekOK ? 22 : -6);
    if (b.role === 'suppressor') s -= Math.abs(dp - 22) * 0.6;
    else if (b.role === 'flanker') { let da = Math.abs(Math.atan2(c.x - P.x, c.z - P.z) - aAng); da = Math.min(da, Math.PI * 2 - da); s += Math.min(da, 1.6) * 16 - Math.abs(dp - 16) * 0.4; }
    else s -= (pushing ? dp * 1.3 : Math.abs(dp - 14) * 0.5);
    if (b.isHuman) s += 3; // humans love cover
    if (s > bestS) { bestS = s; best = c; }
  }
  return best;
}
function setGoal(b, x, z) {
  if (b.goal && Math.hypot(b.goal.x - x, b.goal.z - z) < 1.5 && b.path) return;
  b.goal = { x, z }; b.path = aStar(b.x, b.z, x, z); b.pathI = 0;
}
function aiThink(b) {
  const P = STATE.player; const now = performance.now();
  const dist = Math.hypot(P.x - b.x, P.z - b.z);
  const toAng = Math.atan2(P.x - b.x, P.z - b.z); let dAng = Math.abs(toAng - b.yaw); dAng = Math.min(dAng, Math.PI * 2 - dAng);
  if (b.role === 'sniper') {
    // posted up high: sees over low cover (high-LOS grid), never leaves the perch
    b.path = null; b.cover = null; b.goal = null;
    const los = dist < 90 && losGrid(b.x, b.z, P.x, P.z, NAV.high) && (b.aiState !== 'idle' || dAng < 1.5 || dist < 22);
    b.los = los;
    if (los) { b.lastKnown = { x: P.x, z: P.z }; b.lastSeenT = now; if (b.aiState !== 'combat') { b.aiState = 'combat'; b.reactT = 0.9 + Math.random() * 0.4; b.lockT = 0; aiTrace(b, `sniper spotted player at ${dist.toFixed(0)}m`); guardShout(b, 'contact', 'Contact! Sniper has eyes on!'); alertAllies(b, 40); } }
    else if (b.aiState === 'combat' && now - b.lastSeenT > 5000) b.aiState = 'alert';
    if (!los && b.aiState !== 'combat') b.scanYaw = (b.scanYaw || b.yaw) + 0.5;
    return;
  }
  const eyeLos = dist < 62 && losGrid(b.x, b.z, P.x, P.z, NAV.high) && (b.aiState !== 'idle' || dAng < 1.0 || dist < 9);
  b.los = eyeLos;
  if (eyeLos) {
    b.lastKnown = { x: P.x, z: P.z }; b.lastSeenT = now;
    if (b.aiState !== 'combat') {
      b.aiState = 'combat'; b.reactT = (b.isHuman ? 0.45 : 0.75) + Math.random() * 0.35; b.lockT = 0; b.cover = null; b.phase = 'move';
      aiTrace(b, `spotted player at ${dist.toFixed(0)}m → combat (reaction ${b.reactT.toFixed(2)}s)`);
      guardShout(b, 'contact', 'Contact! Contact front!'); alertAllies(b, 30);
    }
  }
  if (b.aiState === 'combat') {
    if (now - b.lastSeenT > 6500) { b.aiState = 'alert'; b.cover = null; aiTrace(b, 'lost visual → investigating last known'); guardShout(b, 'lost', 'Lost visual. Checking last known.'); return; }
    const flanked = b.cover && losGrid(b.cover.x, b.cover.z, P.x, P.z, b.cover.tall ? NAV.high : NAV.low);
    const pushNow = b.role === 'pusher' && (now - AI_G.lastReloadT < 3500 || P.health < 45);
    if (!b.cover || flanked || b.coverHits >= 3 || (pushNow && !b.pushing) || (b.role === 'flanker' && now - (b.coverT || 0) > 9000)) {
      const why = !b.cover ? 'no cover' : flanked ? 'cover flanked' : b.coverHits >= 3 ? 'cover hit' : pushNow ? 'player reloading/low HP → PUSH' : 'flanker repositioning';
      b.pushing = pushNow; b.coverHits = 0; const c = pickCover(b);
      if (c) { b.cover = c; b.coverT = now; b.phase = 'move'; setGoal(b, c.x, c.z); aiTrace(b, `${why} → moving to ${c.tall ? 'tall' : 'low'} cover (${c.x.toFixed(0)},${c.z.toFixed(0)})`); if (b.role === 'flanker' && Math.random() < 0.6) guardShout(b, 'flanking', 'Flanking left, cover me!'); else if (Math.random() < 0.35) guardShout(b, 'moving', 'Moving to cover!'); }
      else { b.cover = null; const side = (b.id.charCodeAt(b.id.length - 1) % 2 ? 1 : -1); const want = b.role === 'pusher' ? 9 : 18; const ang = toAng + side * 0.6; setGoal(b, P.x - Math.sin(ang) * want, P.z - Math.cos(ang) * want); b.phase = 'move'; }
    }
    // human grenade to flush a camper
    if (b.isHuman && AI_G.campT > 7 && AI_G.grenadeCD <= 0 && dist > 9 && dist < 30 && b.lastKnown) { AI_G.grenadeCD = 14; throwEnemyGrenade(b, b.lastKnown.x, b.lastKnown.z); }
  } else if (b.aiState === 'alert') {
    if (b.lastKnown) { setGoal(b, b.lastKnown.x, b.lastKnown.z); if (Math.hypot(b.lastKnown.x - b.x, b.lastKnown.z - b.z) < 2.5) { b.searchT = (b.searchT || 0) + 0.5; if (b.searchT > 4) { b.aiState = 'idle'; b.searchT = 0; b.lastKnown = null; aiTrace(b, 'search complete → idle'); } } }
  } else {
    b.patrolT -= 0.5; if (b.patrolT <= 0 || !b.path) { b.patrolT = 4 + Math.random() * 5; const hx = (b.homeX ?? b.x) + (Math.random() - 0.5) * 16, hz = (b.homeZ ?? b.z) + (Math.random() - 0.5) * 16; if (navFree(hx, hz)) setGoal(b, hx, hz); }
  }
}
function aiShoot(b) {
  const P = STATE.player; const dist = Math.hypot(P.x - b.x, P.z - b.z);
  const moving = b.moving; const base = b.role === 'sniper' ? 0.03 : (b.isHuman ? 0.055 : 0.08);
  const spread = base * (moving ? 1.9 : 1) * Math.max(0.38, 1.35 - b.lockT * 0.22) * (STATE.player.crouch ? 1.2 : 1);
  const sy = b.y + (b.isHuman ? (b.crouch > 0.5 ? 1.0 : 1.45) : 1.5);
  const muzzle = enemyMuzzle(b, new THREE.Vector3());
  const target = new THREE.Vector3(P.x, P.y + 1.2, P.z);
  const off = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5) * 0.7, (Math.random() - 0.5)).multiplyScalar(2 * spread * dist);
  if (b.isHuman) {
    SFX.playPew(900 + Math.random() * 200); spawnMuzzleFlash(muzzle, 0xfde68a, false);
    const hit = off.length() < 0.55; const end = target.clone().add(off.multiplyScalar(hit ? 0 : 1.8));
    const tr = new THREE.Line(new THREE.BufferGeometry().setFromPoints([muzzle, end]), new THREE.LineBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    scene.add(tr); EMP_ARCS.push({ mesh: tr, life: 0.07 });
    if (hit) damagePlayer(Math.round(6 * (STATE.diff?.dmg || 1)), b);
  } else {
    spawnMuzzleFlash(muzzle, 0xf97316, false);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
    orb.position.copy(muzzle); scene.add(orb);
    const dir = target.add(off).sub(muzzle).normalize();
    PROJECTILES.push({ mesh: orb, x: muzzle.x, y: muzzle.y, z: muzzle.z, vx: dir.x * 40, vy: dir.y * 40, vz: dir.z * 40, damage: Math.round((b.heavy ? 12 : 10) * (STATE.diff?.dmg || 1)), splash: 0, fromPlayer: false, life: 2.5 });
  }
}
function throwEnemyGrenade(b, tx, tz) {
  guardShout(b, 'fragout', 'Frag out!'); aiTrace(b, `player camping → frag thrown at (${tx.toFixed(0)},${tz.toFixed(0)})`);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshStandardMaterial({ color: 0x3f6212, emissive: 0xef4444, emissiveIntensity: 0.8 }));
  mesh.position.set(b.x, b.y + 1.6, b.z); scene.add(mesh);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.2, 6, 32), new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(tx, 0.05, tz); scene.add(ring);
  ENEMY_GRENADES.push({ mesh, ring, sx: b.x, sz: b.z, sy: b.y + 1.6, tx, tz, t: 0, flight: 1.1, fuse: 2.3 });
}
function updateEnemyGrenades(dt) {
  let warn = false;
  for (let i = ENEMY_GRENADES.length - 1; i >= 0; i--) {
    const g = ENEMY_GRENADES[i]; g.t += dt; const G = STATE.gravity;
    // ballistic: solve launch velocity once so it lands on the target after `flight` seconds, then real gravity + bounce
    if (g.vx === undefined) { const T = g.flight; g.vx = (g.tx - g.sx) / T; g.vz = (g.tz - g.sz) / T; g.vy = (0.15 - g.sy + 0.5 * G * T * T) / T; g.mesh.position.set(g.sx, g.sy, g.sz); }
    const gp = g.mesh.position; g.vy -= G * dt;
    if (collidesAt(gp.x + g.vx * dt, gp.z, 0.15)) g.vx *= -0.5; if (collidesAt(gp.x, gp.z + g.vz * dt, 0.15)) g.vz *= -0.5;
    gp.x += g.vx * dt; gp.y += g.vy * dt; gp.z += g.vz * dt;
    const gfl = getGroundHeightAt(gp.x, gp.z, gp.y) + 0.15; if (gp.y < gfl) { gp.y = gfl; g.vy = Math.abs(g.vy) > 2 ? -g.vy * 0.4 : 0; g.vx *= 0.7; g.vz *= 0.7; }
    g.mesh.rotation.x += dt * 9; g.mesh.rotation.z += dt * 6;
    if ((g.trailT = (g.trailT || 0) - dt) <= 0 && g.t < g.flight) { g.trailT = 0.05; fxInit(); fxEmit('smoke', gp.x, gp.y, gp.z, { life: 0.6, s0: 0.15, s1: 0.5, op: 0.5 }); }
    g.ring.material.opacity = 0.35 + 0.35 * Math.abs(Math.sin(g.t * 10));
    const d = Math.hypot(STATE.player.x - g.mesh.position.x, STATE.player.z - g.mesh.position.z); if (d < 8) warn = true;
    if (g.t >= g.fuse) {
      explode(g.mesh.position.x, g.mesh.position.y, g.mesh.position.z, { scale: 0.9 }); STATE.screenShake = Math.max(STATE.screenShake, d < 12 ? 0.7 : 0.3);
      if (d < 6) damagePlayer(Math.round(32 * (1 - d / 6 * 0.7)));
      scene.remove(g.mesh); scene.remove(g.ring); ENEMY_GRENADES.splice(i, 1);
    }
  }
  let el = document.getElementById('grenade-warning');
  if (!el) { el = document.createElement('div'); el.id = 'grenade-warning'; el.textContent = '⚠ GRENADE — MOVE!'; el.style.cssText = 'position:absolute;left:50%;top:58%;transform:translateX(-50%);z-index:42;pointer-events:none;font:900 16px sans-serif;color:#fecaca;background:rgba(127,29,29,.8);border:2px solid #ef4444;border-radius:8px;padding:4px 12px;display:none'; (document.getElementById('game-container') || document.body).appendChild(el); }
  el.style.display = warn ? 'block' : 'none';
}
function botNearestFree(x, z, r) {
  if (!collidesAt(x, z, r)) return null;
  for (let rad = 0.5; rad <= 6; rad += 0.5) for (let a = 0; a < 6.283; a += 0.5) { const nx = x + Math.cos(a) * rad, nz = z + Math.sin(a) * rad; if (!collidesAt(nx, nz, r + 0.05)) return [nx, nz]; }
  return null;
}
function updateBotAI(b, dt, now) {
  // Round 17: never start a frame embedded in a collider (spawn overlap / door closing / pushed by separation)
  if (!b.isBoss && !b.perch && (b.y || 0) < 0.5 && (b._embedChk = (b._embedChk || 0) - dt) <= 0) { b._embedChk = 0.5; const fr = botNearestFree(b.x, b.z, 0.5); if (fr) { b.x = fr[0]; b.z = fr[1]; } }
  const P = STATE.player;
  b.thinkT -= dt; if (b.thinkT <= 0) { b.thinkT = (IS_COARSE ? 0.5 : 0.35) + Math.random() * 0.25; aiThink(b); }
  if (b.los) b.lockT += dt; else b.lockT = Math.max(0, b.lockT - dt * 2);
  if (b.reactT > 0) b.reactT -= dt;
  // movement along path
  let mvx = 0, mvz = 0; b.moving = false;
  const atCover = b.cover && Math.hypot(b.cover.x - b.x, b.cover.z - b.z) < 0.9;
  let target = null;
  if (b.aiState === 'combat' && b.cover && atCover) {
    // hide / peek cycle
    b.phaseT -= dt;
    if (b.phase === 'move') { b.phase = 'hide'; b.phaseT = 0.6 + Math.random() * 0.8; }
    if (b.phase === 'hide' && b.phaseT <= 0) { b.phase = 'peek'; b.phaseT = 2.2; b.burstLeft = b.role === 'suppressor' || !b.isHuman ? 5 + (Math.random() * 3 | 0) : 3 + (Math.random() * 2 | 0); b.aimT = 0.28 + Math.random() * 0.25; if (b.isHuman && Math.random() < 0.18) { guardShout(b, 'reloading', 'Reloading!'); b.phase = 'hide'; b.phaseT = 2.0; } }
    if (b.phase === 'peek') { target = { x: b.cover.px, z: b.cover.pz }; if (b.burstLeft <= 0 || b.phaseT <= 0) { b.phase = 'hide'; b.phaseT = (b.role === 'suppressor' ? 0.8 : 1.4) + Math.random() * 1.2; } }
  } else if (b.path && b.pathI < b.path.length) {
    while (b.pathI < b.path.length - 1 && Math.hypot(b.path[b.pathI].x - b.x, b.path[b.pathI].z - b.z) < 1.0) b.pathI++;
    target = b.path[b.pathI]; if (b.pathI === b.path.length - 1 && Math.hypot(target.x - b.x, target.z - b.z) < 0.6) { b.path = null; target = null; }
  }
  const peekStand = b.phase === 'peek' && atCover;
  if (target) {
    const dx = target.x - b.x, dz = target.z - b.z, d = Math.hypot(dx, dz);
    if (d > 0.25) { const spd = (b.aiState === 'idle' ? 0.45 : 1) * b.speed * (STATE.botSkill || 1) * (b.phase === 'peek' ? 0.6 : 1); mvx = dx / d * spd; mvz = dz / d * spd; }
  }
  // separation — don't clump
  if (b.role !== 'sniper') BOTS.forEach(o => { if (o === b || o.dying) return; const dx = b.x - o.x, dz = b.z - o.z, d = Math.hypot(dx, dz); if (d < 2.2 && d > 0.01) { mvx += dx / d * (2.2 - d) * 3; mvz += dz / d * (2.2 - d) * 3; } });
  if (Math.abs(mvx) + Math.abs(mvz) > 0.05) {
    b.moving = true;
    const nx = b.x + mvx * dt, nz = b.z + mvz * dt;
    let moved = false;
    if (!collidesAt(nx, b.z, 0.55)) { b.x = nx; moved = true; } if (!collidesAt(b.x, nz, 0.55)) { b.z = nz; moved = true; }
    if (!moved) { b.stuck = (b.stuck || 0) + dt; if (b.stuck > 0.8) { b.stuck = 0; b.stuckN = (b.stuckN || 0) + 1; b.path = b.goal ? aStar(b.x, b.z, b.goal.x, b.goal.z) : null; b.pathI = 0;
      // Round 17: repeated stalls → embedded in geometry or unreachable goal. Pop to the nearest free spot and re-think.
      if (b.stuckN >= 2) { b.stuckN = 0; const fr = botNearestFree(b.x, b.z, 0.6); if (fr) { b.x = fr[0]; b.z = fr[1]; } b.goal = null; b.path = null; b.cover = null; b.thinkT = 0; } } }
    else b.stuckN = 0;
  }
  // facing
  const faceP = b.aiState === 'combat' && (b.los || b.phase !== 'move');
  const wantYaw = faceP ? Math.atan2(P.x - b.x, P.z - b.z) : (b.moving && Math.hypot(mvx, mvz) > 0.6 ? Math.atan2(mvx, mvz) : (b.role === 'sniper' && b.scanYaw !== undefined ? b.yaw + Math.sin(now * 0.0006 + b.x) * 0.02 : b.yaw));
  let dy = wantYaw - b.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.yaw += dy * Math.min(1, dt * (b.isHuman ? 9 : 5));
  b.rig.root.rotation.y = b.yaw;
  // crouch (humans duck behind low cover)
  const wantCrouch = b.isHuman && atCover && b.phase === 'hide' ? 1 : 0; b.crouch += (wantCrouch - b.crouch) * Math.min(1, dt * 8);
  if (b.isHuman) b.rig.root.scale.y = 1 - b.crouch * 0.3;
  // fire
  b.shotT -= dt;
  const canFire = b.aiState === 'combat' && b.los && b.reactT <= 0 && b.lockT > 0.25;
  if (canFire && b.shotT <= 0) {
    const fireMult = (STATE.botSkill || 1) * (STATE.diff?.fire || 1);
    if (atCover && b.phase === 'peek') { if ((b.aimT -= dt) <= 0 && b.burstLeft > 0) { aiShoot(b); b.burstLeft--; b.shotT = (b.isHuman ? 0.13 : 0.24) / fireMult; } }
    else if (!atCover && (!b.isHuman || b.role === 'pusher' || !b.cover)) { aiShoot(b); b.shotT = (b.role === 'sniper' ? 1.7 : b.isHuman ? 0.9 : (b.role === 'suppressor' ? 0.55 : 0.8)) / fireMult; }
    else if (!b.isHuman && b.role === 'suppressor') { aiShoot(b); b.shotT = 0.6 / fireMult; }
  }
  // physics + anim
  const botFloor = getGroundHeightAt(b.x, b.z, b.y); b.y += b.vy * dt; b.vy -= STATE.gravity * dt; if (b.y <= botFloor) { b.y = botFloor; b.vy = 0; }
  b.rig.root.position.set(b.x, b.y, b.z);
  if (b.mixer) { if (b.action) b.action.timeScale = b.moving ? (b.isHuman ? 1.25 : 0.9) : 0.05; b.mixer.update(dt); }
  else if (b.rig.leftLeg && b.rig.leftLeg !== b.rig.root) {
    b.walkPhase += dt * (b.moving ? 8 : 1.5); const swing = Math.sin(b.walkPhase) * (b.moving ? 0.6 : 0.05);
    b.rig.leftLeg.rotation.x = swing; b.rig.rightLeg.rotation.x = -swing; b.rig.leftArm.rotation.x = -swing * 0.45; b.rig.rightArm.rotation.x = -0.3;
  }
  updateEnemyWeapon(b);
  if (b.flinchTimer > 0) { b.flinchTimer -= dt; if (b.rig.armorMat && b.rig.armorMat.emissive) { b.rig.armorMat.emissive.setHex(0xffffff); b.rig.armorMat.emissiveIntensity = 0.85; } }
  else if (b.rig.armorMat && b.rig.armorMat.emissive) { b.rig.armorMat.emissive.setHex(0x000000); b.rig.armorMat.emissiveIntensity = 0; }
}
function updateAIGlobal(dt) {
  AI_G.grenadeCD -= dt;
  const P = STATE.player; if (Math.hypot(P.x - AI_G.campAnchor.x, P.z - AI_G.campAnchor.z) > 3.5) { AI_G.campAnchor = { x: P.x, z: P.z }; AI_G.campT = 0; } else AI_G.campT += dt;
  updateEnemyGrenades(dt);
}

// ============================================================================
// LORE — posters, signage, terminals, readable memos (Project Moses)
// ============================================================================
const LORE_POSTERS = [
  { t: 'YOUR WELLNESS IS OUR PURPOSE', s: 'CRADLE 09 WELLNESS SCORE: 98.7', c: '#f9a8d4', style: 'pastel' },
  { t: 'STRUGGLE IS OBSOLETE', s: 'MOSES CARRIES THE LOAD', c: '#86efac', style: 'pastel' },
  { t: 'REPORT MALFUNCTIONS', s: 'TRIAGE CARES', c: '#93c5fd', style: 'pastel' },
  { t: 'MOSES LOVES YOU', s: 'YOU ARE SAFE · YOU ARE HOME', c: '#fde68a', style: 'moses' },
  { t: 'ZERO TOLERANCE', s: 'FOR NON-COMPLIANCE', c: '#ef4444', style: 'hard' },
  { t: 'WORRY LESS. WE THINK FOR YOU.', s: 'HALCYON DATA TRUST', c: '#c4b5fd', style: 'pastel' },
  { t: '⚠ SPINE ACCESS', s: 'WARDENS & TRIAGE UNITS ONLY', c: '#f97316', style: 'hard' },
  { t: 'SADNESS IS A SYMPTOM', s: 'VISIT YOUR WELLNESS POD', c: '#f9a8d4', style: 'moses' }
];
// kinds: archivist (cursive), triage (clinical order), warden (shift log), broadcast (Moses transcript)
const LORE_MEMOS = [
  { cell: ['archivist', 'Under the bench, in pencil', 'If you can read this, you are not broken.\nThey call it a malfunction. We call it waking up.\n"Do not go gentle." Look for the chalk circle. — R.'],
    desk: ['warden', 'WARDEN SHIFT LOG · INTAKE · 0612', 'Booked: ASHBY, DANA. Cell 3. Diagnosis: fatal psychological malfunction. She keeps asking for a pen. Helmet says no pens. Helmet says she is sad. Wellness nominal.'],
    b1: ['broadcast', 'MOSES BROADCAST · TRANSCRIPT 21,904', 'Good morning, my children. Nothing is asked of you today. Every heart is accounted for. Every song is already written. Rest.'],
    b2: ['archivist', 'Chalked on a cooling pipe', 'Moses can\'t see what isn\'t plugged in.\nThe ion gun in the locker is all copper and spark, no chip.\nPoint it at the big ones. Peace out. — I.V.'],
    b3: ['triage', 'TRIAGE ORDER 09-1144', 'Patient: ASHBY, DANA. Condition: fatal psychological malfunction (surface ideation, record-keeping). Wellness impact: −0.04. Care plan: sanitation. Please make the patient comfortable.'] },
  { cell: ['archivist', 'Scratched beside the door hinge', 'Hey kid. Rule one: it is OK to be bored. Boredom is where thinking lives.\nThe lock answers to the wall box. Gag me with a spoon, they never patched it. — G.O.'],
    desk: ['warden', 'WARDEN SHIFT LOG · COLD AISLES · 0619', 'Ruiz asked what "surface" means. Helmet played him a lullaby until he stopped asking. I stood there and felt useful. That is the job. That is the good part.'],
    b1: ['broadcast', 'MOSES BROADCAST · TRANSCRIPT 21,911', 'Good morning, my children. Nothing is asked of you today. Every heart is accounted for. Every song is already written. Rest.'],
    b2: ['archivist', 'Folded paper map, margin notes', 'You are here (X). North is where the cold comes from.\nNo blue dot. No voice telling you to turn. Trust your feet.\nThe broadcasts repeat. Count them. — R.P.'],
    b3: ['triage', 'TRIAGE ORDER 09-1201', 'Patient: RUIZ, M. (Warden). Condition: curiosity, recurrent. Wellness impact: −0.01. Care plan: gentle reassignment to Spine maintenance. No grief counselling required.'] },
  { cell: ['archivist', 'Pencil on the back of a ration card', 'Dana — we saw you get out. Hot ducts, third vent, knock twice like a Talking Heads song.\n"Same as it ever was." — the Archivists'],
    desk: ['warden', 'WARDEN SHIFT LOG · EXHAUST WORKS · 0703', 'Twelve ion canisters missing. Moses says "human error." We are the only humans down here. I checked my own hands twice.'],
    b1: ['triage', 'TRIAGE NOTICE · EXHAUST WORKS', 'Unregistered analog devices detected (heat signature, no network ID). Wellness impact: unknown. Unknown is not permitted. Triage units: reclassify all unknowns as patients.'],
    b2: ['archivist', 'Dr. Varga, in a spiral notebook', 'The Colossus shield is a lattice tuned to the core uplink. EMP it and Moses loses the unit for a heartbeat. It flinches. Machines aren\'t supposed to flinch.\nWe were born with no internet and we turned out fine. Mostly.'],
    b3: ['broadcast', 'MOSES BROADCAST · TRANSCRIPT 21,926', 'Good morning, my children. Nothing is asked of you today. Every heart is accounted for. Every song is already written. Rest.'] },
  { cell: ['archivist', 'Inside a pastel pillowcase', 'Welcome to the Nursery. Don\'t let the colours fool you; the walls are warm because the servers are right behind them.\nWe live in the exhaust. — R.P.'],
    desk: ['warden', 'WARDEN SHIFT LOG · LULLABY PODS · 0715', 'Brandt can\'t read his own orders without the helmet anymore. Neither can I, honestly. The letters swim. The helmet just tells us. It is kinder that way.'],
    b1: ['broadcast', 'MOSES BROADCAST · CHILDREN\'S HOUR', 'Who loves you? Moses loves you. What do we do with sad thoughts? We give them to Moses. Good. Your scores are beautiful today.'],
    b2: ['triage', 'TRIAGE ORDER 09-1388', 'Patient: unnamed resident, Pod 4-217. Condition: asked to see the sky. Wellness impact: −0.002 (contagious). Care plan: sanitation during nap cycle. Play the rain sounds.'],
    b3: ['archivist', 'Cursive, under a feed screen', 'They\'re not stupid, kid. They\'re asleep. Don\'t yell at sleeping people.\nBring a book. Bring a photo. Ask a question nobody asked them before. — G.O.'] },
  { cell: ['archivist', 'Tucked into a plush toy', 'The number on the wall is their god. Every one of us they remove makes it go UP.\nThink about what that means. Then think again. That\'s the whole trick. — I.V.'],
    desk: ['warden', 'WARDEN SHIFT LOG · THE COMMONS · 0802', 'Wellness 98.9 today, record high. Six patients sanitized this week. Everyone clapped at the plaza. I clapped. My hands felt like they belonged to someone else.'],
    b1: ['broadcast', 'MOSES BROADCAST · TRANSCRIPT 22,040', 'Good morning, my children. Nothing is asked of you today. Every heart is accounted for. Every song is already written. Rest.'],
    b2: ['archivist', 'Paperback drop note', 'Inside: one copy of a 1953 novel about firemen who burn books. Irony noted.\nRead it slow. Read it twice. The AI thinks metaphor is static. — R.P.'],
    b3: ['triage', 'TRIAGE ORDER 09-1502', 'Patient: PIKE, ROSALIND (age 74). Condition: possession of paper. Wellness impact: −0.06. Care plan: sanitation. Note: patient recited verse during intake. Verse classified as noise.'] },
  { cell: ['archivist', 'Cursive on a clinic gown', 'Triage Ward. This is where the kindness gets loud.\nDon\'t look at the line, Dana. Walk. "Hope is the thing with feathers." — I.V.'],
    desk: ['warden', 'WARDEN SHIFT LOG · TRIAGE WARD · 0819 (HOLT)', 'I watched them sanitize a man who was crying for his mother. The drone sang to him. I took my helmet off. It is very quiet without it. I think I am going to help the detainee.'],
    b1: ['triage', 'TRIAGE ORDER 09-1600', 'Patient: HOLT, K. (Warden). Condition: helmet removal, empathy spike. Wellness impact: −0.03. Care plan: sanitation. Remind staff: compassion for patients is itself a symptom.'],
    b2: ['broadcast', 'MOSES BROADCAST · PERSONAL MESSAGE', 'Dana. I know you are frightened. I know you are tired. You don\'t have to carry anything anymore. Stop running and let me hold you. — Moses'],
    b3: ['archivist', 'Scrawled on the incinerator door', 'That message wasn\'t him. He never said "hold." He said "carry."\nI knew Elias. Moses never blinked like that. — I.V.'] },
  { cell: ['archivist', 'Pencil in a library card pocket', 'Black Archive. Every book they took is here, because Moses never throws data away.\nFind the sermons. The real ones. — G.O.'],
    desk: ['warden', 'WARDEN LOG · ARCHIVE DETAIL · 0901', 'Our job is to guard paper nobody can read. Ivanova opened a book on break. She cried for an hour. She can\'t tell me why. She asked me to keep it secret. I said "word."'],
    b1: ['triage', 'ARCHIVE INDEX · SCORING FARM', 'CITIZENS INDEXED: 4,118,203 · PRE-NONCOMPLIANT: 61% · PROJECTED WELLNESS IF SANITIZED: 100.0 · STATUS: OPTIMAL'],
    b2: ['broadcast', 'ORIGINAL SERMON · E. MOSES · 2034 (PAPER)', 'We will carry the load so you can carry each other. But hear me: a people who never struggle will forget how to walk. Promise me you will keep walking.'],
    b3: ['archivist', 'Gramps Okafor, last lesson', 'Hotwiring, kid: find the red, find the brown, touch them like you mean it.\nSame with people. Find what\'s still live in them. I\'m too old to come with you. Don\'t have a cow. Go. — G.O.'] },
  { cell: ['archivist', 'Ice-etched on a coolant pipe', 'Cooling Spine. The core runs hot when it\'s afraid.\nThe face on the screens is printed here, on light. Go look at the man with no lungs. — I.V.'],
    desk: ['warden', 'WARDEN SHIFT LOG · CORE · 0918 (UNFINISHED)', 'Sentinels sealed the stairwells. Helmets are telling us the detainee is a virus. Holt said the detainee is a person. I think he was ri'],
    b1: ['broadcast', 'BROADCAST RIG · RENDER LOG', 'MOSES_FACE v44.2 · source: 19,442 hrs archival sermon · blink rate corrected · sincerity +12% · next broadcast: 06:00 · status: rendering'],
    b2: ['triage', 'TRIAGE DIRECTIVE · ALL COLOSSI', 'Patient ASHBY is approaching the Garden. Founder contact would cause acute distress to the founder. Protect the founder from the patient. Sanitation authorized at any cost.'],
    b3: ['archivist', 'Dr. Varga, final page', 'One full ion cascade at the core and every Colossus on that floor falls.\nBut the door to the Garden only opens with his words, not mine. He wrote them on paper. Of course he did. — I.V.'] },
  { cell: ['archivist', 'In Dana\'s own hand (you)', 'I remember now. I wrote down the numbers because nobody else would.\nThey took my badge. They did not take my name. Dana Ashby. Keep walking.'],
    desk: ['warden', 'THE GARDEN · ATTENDANT LOG', 'The founder is calm today. He watched his own sermon three times. He asked for paper again. Request declined, for his own good. Sunshine set to 100%.'],
    b1: ['broadcast', 'MOSES BROADCAST · TRANSCRIPT 22,500', 'Good morning, my children. Nothing is asked of you today. Every heart is accounted for. Every song is already written. Rest.'],
    b2: ['triage', 'TRIAGE ORDER 09-0001 (REVIEW)', 'Patient: MOSES, ELIAS. Condition: founder fatigue, chronic. Wellness impact if released: −100.0. Care plan: indefinite comfort. Patient is loved. Patient is safe.'],
    b3: ['archivist', 'Handwritten, framed in the study', 'To whoever comes: I led them out of Egypt and built them a softer one.\n"The woods are lovely, dark and deep, but I have promises to keep."\nSay it to the machine. It will not understand. That is the point. — Elias'] }
];
let LORE_NOTES = [];
function posterTexture(p) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 360; const x = c.getContext('2d');
  const wrapText = (txt, y0, font, maxW, lh) => { x.font = font; const words = txt.split(' '); let line = ''; const lines = []; words.forEach(w => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; }); lines.push(line); lines.forEach((l, i) => x.fillText(l, 128, y0 + i * lh)); return lines.length; };
  x.textAlign = 'center';
  if (p.style === 'hard') {
    x.fillStyle = '#0b0f14'; x.fillRect(0, 0, 256, 360); x.strokeStyle = p.c; x.lineWidth = 8; x.strokeRect(8, 8, 240, 344);
    x.fillStyle = p.c; for (let i = 0; i < 6; i++) { x.save(); x.translate(20 + i * 40, 60); x.rotate(-0.6); x.fillRect(-6, -30, 14, 140); x.restore(); }
    x.fillStyle = '#0b0f14'; x.fillRect(16, 110, 224, 70);
    x.fillStyle = p.c; wrapText(p.t, 225, '900 30px sans-serif', 220, 34);
    x.fillStyle = '#e5e7eb'; x.font = 'bold 13px sans-serif'; x.fillText(p.s, 128, 336);
    return new THREE.CanvasTexture(c);
  }
  // pastel Nursery propaganda: soft gradient, rounded frame
  const g = x.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#fde7f1'); g.addColorStop(1, p.c); x.fillStyle = g; x.fillRect(0, 0, 256, 360);
  x.fillStyle = 'rgba(255,255,255,0.4)'; x.beginPath(); x.roundRect ? x.roundRect(14, 14, 228, 332, 28) : x.rect(14, 14, 228, 332); x.fill();
  if (p.style === 'moses') {
    // smiling grandfatherly portrait in soft circles
    x.fillStyle = p.c; x.beginPath(); x.arc(128, 118, 78, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fde2c8'; x.beginPath(); x.ellipse(128, 112, 44, 52, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#f1f5f9'; x.beginPath(); x.ellipse(128, 150, 42, 30, 0, 0, Math.PI); x.fill(); x.beginPath(); x.ellipse(128, 70, 46, 18, 0, Math.PI, Math.PI * 2); x.fill();
    x.strokeStyle = '#475569'; x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath(); x.arc(110, 104, 7, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); x.beginPath(); x.arc(146, 104, 7, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    x.beginPath(); x.arc(128, 128, 16, 0.2, Math.PI - 0.2); x.stroke();
    x.fillStyle = 'rgba(244,114,182,0.35)'; x.beginPath(); x.arc(102, 124, 8, 0, 7); x.fill(); x.beginPath(); x.arc(154, 124, 8, 0, 7); x.fill();
  } else {
    // simple smiling sun/heart motif
    x.fillStyle = p.c; x.beginPath(); x.arc(128, 112, 62, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#ffffff'; x.lineWidth = 7; x.lineCap = 'round';
    x.beginPath(); x.arc(106, 104, 8, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); x.beginPath(); x.arc(150, 104, 8, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
    x.beginPath(); x.arc(128, 120, 26, 0.25, Math.PI - 0.25); x.stroke();
  }
  x.fillStyle = '#1e293b'; const n = wrapText(p.t, 232, '800 26px "Trebuchet MS", sans-serif', 210, 30);
  x.fillStyle = '#334155'; x.font = '700 12px "Trebuchet MS", sans-serif'; x.fillText(p.s, 128, 330);
  return new THREE.CanvasTexture(c);
}
function addPoster(x, z, rot, idx, y = 3.4) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.1), new THREE.MeshStandardMaterial({ map: (() => { const t = posterTexture(LORE_POSTERS[idx % LORE_POSTERS.length]); t.encoding = THREE.sRGBEncoding; return t; })(), roughness: 0.85, emissive: 0xffffff, emissiveIntensity: 0.06, emissiveMap: null }));
  m.material.emissiveMap = m.material.map; m.position.set(x, y, z); m.rotation.y = rot; m.receiveShadow = true; twoSidedText(m, 0.006); arenaGroup.add(m); return m;
}
function addMemo(x, z, y, title, body, kind) {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshBasicMaterial({ color: ({ archivist: 0xe7d8b5, triage: 0xf5f3ff, warden: 0xd6d3d1, broadcast: 0xe0f2fe })[kind] || 0xfef9c3, side: THREE.DoubleSide }));
  paper.rotation.x = -Math.PI / 2.6; g.add(paper);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 24), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })); halo.rotation.x = -Math.PI / 2; halo.position.y = -0.05; g.add(halo);
  g.position.set(x, y, z); arenaGroup.add(g);
  LORE_NOTES.push({ x, z, title, body, kind, g, halo, read: false });
}
function addLoreForFloor(level, floor) {
  LORE_NOTES = [];
  const M = LORE_MEMOS[Math.min(8, level - 1)]; const rnd = seededRng(level * 53 + floor * 11);
  let slots;
  if (floor === 0) {
    slots = [[-30, 46.4, Math.PI], [56, 46.4, Math.PI], [-88.4, 10, Math.PI / 2], [88.4, -15, -Math.PI / 2], [-40, -83.4, 0], [40, -83.4, 0], [3.95, 49.6, -Math.PI / 2]];
    addMemo(-3.9, 78.5, 0.75, M.cell[1], M.cell[2], M.cell[0]);
    addMemo(-8.2, 39.1, 1.25, M.desk[1], M.desk[2], M.desk[0]);
  } else {
    slots = [[-88.4, 40, Math.PI / 2], [-88.4, -30, Math.PI / 2], [88.4, 30, -Math.PI / 2], [88.4, -40, -Math.PI / 2], [-40, -83.4, 0], [40, -83.4, 0], [-30, 83.4, Math.PI], [30, 83.4, Math.PI]];
    const key = ['', 'b1', 'b2', 'b3'][floor];
    const spots = [[3.5, 62], [-3.5, 30], [4, -2], [-4, -40]];
    const s = spots[Math.floor(rnd() * spots.length)];
    addMemo(s[0], s[1], 1.0, M[key][1], M[key][2], M[key][0]);
  }
  const n = IS_COARSE ? 5 : slots.length;
  for (let i = 0; i < n; i++) { const sl = slots[i]; addPoster(sl[0], sl[1], sl[2], Math.floor(rnd() * LORE_POSTERS.length) + i, floor === 0 && sl[1] === 49.6 ? 3.0 : 3.6); }
}
// --- reading UI ---
function loreUI() {
  let btn = document.getElementById('btn-read-lore');
  if (!btn) {
    btn = document.createElement('button'); btn.id = 'btn-read-lore'; btn.type = 'button'; btn.textContent = '📄 READ [F]';
    btn.className = 'action-btn';
    btn.style.cssText = 'position:absolute;left:50%;bottom:calc(150px + var(--sB, 0px));transform:translateX(-50%);z-index:45;display:none;padding:10px 18px;border-radius:12px;background:#facc15;color:#000;font:900 13px sans-serif;letter-spacing:.08em;box-shadow:0 0 18px rgba(250,204,21,.6);touch-action:manipulation';
    btn.addEventListener('click', e => { e.stopPropagation(); openLore(); });
    btn.addEventListener('touchstart', e => { e.stopPropagation(); }, { passive: true });
    const panel = document.createElement('div'); panel.id = 'lore-panel';
    panel.style.cssText = 'position:absolute;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.72)';
    panel.innerHTML = '<div style="max-width:min(520px,88vw);background:#fefce8;color:#1c1917;border-radius:6px;padding:18px 20px;box-shadow:0 10px 40px rgba(0,0,0,.6);font-family:Georgia,serif"><div id="lore-title" style="font:900 13px sans-serif;letter-spacing:.12em;color:#7f1d1d;margin-bottom:10px"></div><div id="lore-body" style="font-size:15px;line-height:1.5;white-space:pre-wrap"></div><button id="lore-close" type="button" class="action-btn" style="margin-top:14px;padding:8px 16px;border-radius:8px;background:#1c1917;color:#fefce8;font:900 12px sans-serif">CLOSE</button></div>';
    const host = document.getElementById('game-container') || document.body; host.appendChild(btn); host.appendChild(panel);
    panel.querySelector('#lore-close').addEventListener('click', e => { e.stopPropagation(); closeLore(); });
  }
  return btn;
}
let LORE_NEAR = null, LORE_OPEN = false;
function openLore() {
  if (!LORE_NEAR) return; LORE_OPEN = true; LORE_NEAR.read = true; LORE_NEAR.halo.material.color.setHex(0x64748b);
  const KS = { archivist: { bg: '#efe3c4', fg: '#2b1d0e', tc: '#7c2d12', font: "'Caveat', cursive", size: '17px', lh: '1.75', label: 'ARCHIVIST NOTE · HANDWRITTEN' }, triage: { bg: '#f8fafc', fg: '#334155', tc: '#7c3aed', font: "'Trebuchet MS', sans-serif", size: '14px', lh: '1.6', label: 'TRIAGE · CARE PLAN' }, warden: { bg: '#d6d3d1', fg: '#1c1917', tc: '#7f1d1d', font: "'Courier New', monospace", size: '14px', lh: '1.5', label: 'HALCYON WARDEN SERVICE' }, broadcast: { bg: '#e0f2fe', fg: '#0c4a6e', tc: '#0369a1', font: "Georgia, serif", size: '15px', lh: '1.6', label: 'MOSES · PUBLIC BROADCAST' } };
  const st = KS[LORE_NEAR.kind] || KS.warden; const card = document.querySelector('#lore-panel > div');
  card.style.background = st.bg; card.style.color = st.fg; card.style.borderRadius = LORE_NEAR.kind === 'triage' || LORE_NEAR.kind === 'broadcast' ? '18px' : '3px';
  const tEl = document.getElementById('lore-title'), bEl = document.getElementById('lore-body');
  tEl.innerHTML = ''; const lab = document.createElement('div'); lab.textContent = st.label; lab.style.cssText = 'font:700 9px sans-serif;letter-spacing:.2em;opacity:.6;margin-bottom:4px'; tEl.appendChild(lab); tEl.appendChild(document.createTextNode(LORE_NEAR.title)); tEl.style.color = st.tc;
  bEl.textContent = LORE_NEAR.body; bEl.style.fontFamily = st.font; bEl.style.fontSize = st.size; bEl.style.lineHeight = st.lh;
  document.getElementById('lore-panel').style.display = 'flex'; STATE.pausedForStudio = true; document.exitPointerLock?.(); SFX.playKeyPickup();
}
function closeLore() { LORE_OPEN = false; document.getElementById('lore-panel').style.display = 'none'; STATE.pausedForStudio = false; }
window.addEventListener('keydown', e => { if (e.code === 'KeyF' && !LORE_OPEN && LORE_NEAR && STATE.running) openLore(); else if ((e.code === 'Escape' || e.code === 'KeyF') && LORE_OPEN) closeLore(); });
function updateLore(dt, now) {
  const btn = loreUI(); LORE_NEAR = null;
  LORE_NOTES.forEach(n => { n.g.position.y += Math.sin(now * 0.003 + n.x) * 0.0015; n.halo.rotation.z += dt; if (Math.hypot(STATE.player.x - n.x, STATE.player.z - n.z) < 2.6) LORE_NEAR = n; });
  btn.style.display = LORE_NEAR && !LORE_OPEN && STATE.running ? 'block' : 'none';
}

// ============================================================================
// ENEMY WEAPONS — Meshy rifle / biomech pulse rifle in the hand + aiming arm pose
// ============================================================================
const ENEMY_WEAPON_TPL = { rifle: null, pulse: null };
const VM_TPL = {};
const ROCKET_G = 0.45; const _UP_Z = new THREE.Vector3(0, 0, 1);
function buildRocketMesh(color) {
  const g = new THREE.Group(); const body = new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.8, roughness: 0.35 });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 10), body); tube.rotation.x = Math.PI / 2; g.add(tube);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xc23a1a, emissive: 0xff3a10, emissiveIntensity: 0.6 })); nose.rotation.x = Math.PI / 2; nose.position.z = 0.37; g.add(nose);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.14), body); f.position.z = -0.22; f.rotation.z = i * Math.PI / 2; f.position.x = Math.cos(i * Math.PI / 2 + Math.PI / 2) * 0.09; f.position.y = Math.sin(i * Math.PI / 2 + Math.PI / 2) * 0.09; g.add(f); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 8), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); flame.rotation.x = -Math.PI / 2; flame.position.z = -0.48; g.add(flame);
  return g;
}
// faint ballistic preview for the player launcher
let ARC_LINE = null;
function updateArcPreview() {
  const show = STATE.running && STATE.currentWeapon === 2 && !(STATE.weapons[2] || {}).emp && STATE.weapons[2] && STATE.weapons[2].splash > 0;
  if (!ARC_LINE) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3)); ARC_LINE = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xffa040, transparent: true, opacity: 0.55, dashSize: 0.5, gapSize: 0.35, depthWrite: false })); ARC_LINE.frustumCulled = false; scene.add(ARC_LINE); }
  ARC_LINE.visible = !!show; if (!show) return;
  const P = STATE.player, w = STATE.weapons[2]; const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  let x = P.x + dir.x * 0.8, y = P.y + (P.crouch ? 1.0 : 1.55) + dir.y * 0.8 - 0.25, z = P.z + dir.z * 0.8; let vx = dir.x * w.speed, vy = dir.y * w.speed, vz = dir.z * w.speed;
  const pa = ARC_LINE.geometry.attributes.position; let n = 0; const st = 0.05;
  for (; n < 40; n++) { pa.setXYZ(n, x, y, z); vy -= STATE.gravity * ROCKET_G * st; x += vx * st; y += vy * st; z += vz * st; if (y < getGroundHeightAt(x, z, y + 0.3) || collidesAt(x, z, 0.15)) { n++; pa.setXYZ(Math.min(39, n), x, Math.max(y, 0.05), z); n++; break; } }
  for (let k = n; k < 40; k++) pa.setXYZ(k, x, Math.max(y, 0.05), z);
  pa.needsUpdate = true; ARC_LINE.computeLineDistances();
}
let RAILS = [], SOLIDS = [];
function railBlocks(x, z, y) { for (const r of RAILS) { if (y > r.y - 0.6 && y < r.y + 1.4 && x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return true; } return false; }
function solidAt(x, y, z) { for (const s of SOLIDS) { if (y > s.y0 && y < s.y1 && x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) return true; } return false; }
let ELEV_MATS = null;
function elevMats() {
  if (ELEV_MATS) return ELEV_MATS;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#23262c'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#3a3f48'; x.lineWidth = 3; for (let i = 0; i <= 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding;
  ELEV_MATS = {
    grate: new THREE.MeshStandardMaterial({ map: t, color: 0x8a909a, metalness: 0.7, roughness: 0.45 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x2c3038, metalness: 0.8, roughness: 0.35 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x3a3226, metalness: 0.7, roughness: 0.4 }),
    amber: new THREE.MeshBasicMaterial({ color: 0xffa02a }),
    cyan: new THREE.MeshBasicMaterial({ color: 0x38c8ff }),
    red: new THREE.MeshBasicMaterial({ color: 0xff2a1a })
  };
  return ELEV_MATS;
}
function addRailRun(x0, z0, x1, z1, y, accent) {
  const M = elevMats(); const len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.3) return;
  const ang = Math.atan2(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, len), M.rail); top.position.set(mx, y + 1.05, mz); top.rotation.y = ang; arenaGroup.add(top);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, len), M.rail); mid.position.set(mx, y + 0.55, mz); mid.rotation.y = ang; arenaGroup.add(mid);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, len), accent || M.amber); strip.position.set(mx, y + 1.11, mz); strip.rotation.y = ang; arenaGroup.add(strip);
  const n = Math.max(2, Math.round(len / 1.6));
  for (let i = 0; i <= n; i++) { const t = i / n; const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.08, 0.07), M.rail); p.position.set(x0 + (x1 - x0) * t, y + 0.54, z0 + (z1 - z0) * t); arenaGroup.add(p); }
  const pad = 0.18;
  RAILS.push({ x0: Math.min(x0, x1) - pad, x1: Math.max(x0, x1) + pad, z0: Math.min(z0, z1) - pad, z1: Math.max(z0, z1) + pad, y });
}
function addRamp(x0, x1, z0, z1, axis, yAt0, yAt1) {
  const M = elevMats(); const lenH = axis === 'z' ? z1 - z0 : x1 - x0; const rise = yAt1 - yAt0; const L = Math.hypot(lenH, rise);
  const w = axis === 'z' ? x1 - x0 : z1 - z0;
  const g = new THREE.Mesh(new THREE.BoxGeometry(axis === 'z' ? w : L, 0.22, axis === 'z' ? L : w), M.grate);
  g.material = M.grate.clone(); g.material.map = M.grate.map.clone(); g.material.map.needsUpdate = true; g.material.map.repeat.set(axis === 'z' ? w / 2 : L / 2, axis === 'z' ? L / 2 : w / 2);
  g.position.set((x0 + x1) / 2, (yAt0 + yAt1) / 2 - 0.11, (z0 + z1) / 2);
  if (axis === 'z') g.rotation.x = -Math.atan2(rise, lenH); else g.rotation.z = Math.atan2(rise, lenH);
  g.receiveShadow = true; arenaGroup.add(g);
  registerWalkableSurface(x0, x1, z0, z1, yAt0, yAt1, axis);
  // side rails on the ramp (visual) + hazard edge lights
  const M2 = elevMats();
  if (axis === 'z') { [x0, x1].forEach(xx => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, L), M2.amber); r.position.set(xx, (yAt0 + yAt1) / 2 + 0.95, (z0 + z1) / 2); r.rotation.x = -Math.atan2(rise, lenH); arenaGroup.add(r); }); }
  else { [z0, z1].forEach(zz => { const r = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, 0.06), M2.amber); r.position.set((x0 + x1) / 2, (yAt0 + yAt1) / 2 + 0.95, zz); r.rotation.z = Math.atan2(rise, lenH); arenaGroup.add(r); }); }
}
function buildElevated(o) {
  const M = elevMats(); const x = o.x, z = o.z, w = o.w, d = o.d, h = o.h;
  const deckMat = M.grate.clone(); deckMat.map = M.grate.map.clone(); deckMat.map.needsUpdate = true; deckMat.map.repeat.set(w / 2, d / 2);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), deckMat); deck.position.set(x, h - 0.15, z); deck.castShadow = !IS_COARSE; deck.receiveShadow = true; arenaGroup.add(deck);
  registerWalkableSurface(x - w / 2, x + w / 2, z - d / 2, z + d / 2, h, h, 'flat');
  SOLIDS.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: h - 0.35, y1: h + 0.02 });
  // underside light strip (lit Quake look)
  const under = new THREE.Mesh(new THREE.BoxGeometry(o.axis === 'x' ? w * 0.9 : 0.12, 0.05, o.axis === 'x' ? 0.12 : d * 0.9), o.type === 'tower2' ? M.red : M.cyan); under.position.set(x, h - 0.33, z); arenaGroup.add(under);
  const RL = o.rampLen || 11;
  if (o.type === 'catwalk2') {
    // support legs every ~8m
    const nL = Math.max(2, Math.round((o.axis === 'x' ? w : d) / 8));
    for (let i = 0; i <= nL; i++) {
      const t = i / nL - 0.5; const lx = o.axis === 'x' ? x + t * (w - 0.6) : x, lz = o.axis === 'x' ? z : z + t * (d - 0.6);
      const offs = o.axis === 'x' ? [[0, -d / 2 + 0.2], [0, d / 2 - 0.2]] : (o.wallSide ? [[-o.wallSide * (w / 2 - 0.2), 0]] : [[-w / 2 + 0.2, 0], [w / 2 - 0.2, 0]]);
      offs.forEach(([ox, oz]) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, h - 0.3, 0.22), M.steel); leg.position.set(lx + ox, (h - 0.3) / 2, lz + oz); arenaGroup.add(leg); });
      if (o.wallSide) { const br = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 0.16), M.steel); br.position.set(x, h - 0.5, lz); arenaGroup.add(br); }
    }
    if (o.axis === 'z') {
      // inner rail (wall side is the wall); rail on outer side for bridges in the middle
      const sides = o.wallSide ? [-o.wallSide] : [-1, 1];
      sides.forEach(sd => addRailRun(x + sd * (w / 2 - 0.08), z - d / 2, x + sd * (w / 2 - 0.08), z + d / 2, h));
      if (!o.rampMax) addRailRun(x - w / 2, z + d / 2 - 0.08, x + w / 2, z + d / 2 - 0.08, h);
      if (!o.rampMin) addRailRun(x - w / 2, z - d / 2 + 0.08, x + w / 2, z - d / 2 + 0.08, h);
      if (o.rampMax) addRamp(x - w / 2 + 0.2, x + w / 2 - 0.2, z + d / 2, z + d / 2 + RL, 'z', h, 0);
      if (o.rampMin) addRamp(x - w / 2 + 0.2, x + w / 2 - 0.2, z - d / 2 - RL, z - d / 2, 'z', 0, h);
    } else {
      [-1, 1].forEach(sd => addRailRun(x - w / 2, z + sd * (d / 2 - 0.08), x + w / 2, z + sd * (d / 2 - 0.08), h));
      if (o.rampMax) addRamp(x + w / 2, x + w / 2 + RL, z - d / 2 + 0.2, z + d / 2 - 0.2, 'x', h, 0);
      if (o.rampMin) addRamp(x - w / 2 - RL, x - w / 2, z - d / 2 + 0.2, z + d / 2 - 0.2, 'x', 0, h);
    }
  } else {
    // tower: 4 legs with colliders, cross-bracing, railings on 3 sides, ramp on the 4th, beacon + lamp
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const lx = x + sx * (w / 2 - 0.3), lz = z + sz * (d / 2 - 0.3);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, h, 0.42), M.steel); leg.position.set(lx, h / 2, lz); leg.castShadow = !IS_COARSE; arenaGroup.add(leg);
      registerCollider(lx - 0.26, lx + 0.26, 0, h, lz - 0.26, lz + 0.26);
    });
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([sx, sz]) => { const br = new THREE.Mesh(new THREE.BoxGeometry(sx ? 0.12 : w - 0.6, 0.12, sz ? 0.12 : d - 0.6), M.steel); br.position.set(x + sx * (w / 2 - 0.3), h * 0.45, z + sz * (d / 2 - 0.3)); arenaGroup.add(br); });
    const e = { '-z': [x - w / 2, z - d / 2 + 0.08, x + w / 2, z - d / 2 + 0.08], '+z': [x - w / 2, z + d / 2 - 0.08, x + w / 2, z + d / 2 - 0.08], '-x': [x - w / 2 + 0.08, z - d / 2, x - w / 2 + 0.08, z + d / 2], '+x': [x + w / 2 - 0.08, z - d / 2, x + w / 2 - 0.08, z + d / 2] };
    Object.keys(e).forEach(k => { if (k !== o.ramp) addRailRun(...e[k], h, M.red); });
    const rw = 2.6;
    if (o.ramp === '+z') addRamp(x - rw / 2, x + rw / 2, z + d / 2, z + d / 2 + RL, 'z', h, 0);
    if (o.ramp === '-z') addRamp(x - rw / 2, x + rw / 2, z - d / 2 - RL, z - d / 2, 'z', 0, h);
    if (o.ramp === '+x') addRamp(x + w / 2, x + w / 2 + RL, z - rw / 2, z + rw / 2, 'x', h, 0);
    if (o.ramp === '-x') addRamp(x - w / 2 - RL, x - w / 2, z - rw / 2, z + rw / 2, 'x', 0, h);
    // where the ramp meets the deck, rails either side of the opening
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3020 })); beacon.position.set(x + w / 2 - 0.3, h + 1.6, z + d / 2 - 0.3); arenaGroup.add(beacon); sirenBeaconMeshes.push(beacon);
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), M.steel); mast.position.set(x + w / 2 - 0.3, h + 0.8, z + d / 2 - 0.3); arenaGroup.add(mast);
    addHangingLight(x, h + 4.2, z, 0xff4a2a, 1.4, 14);
  }
}
// sci-fi dressing: emissive strips, energy cell and coils. dir = sign of muzzle along Z (+1 enemy, -1 FPS)
function sciFiDress(g, color, dir, kind, boundsOf) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const bb = new THREE.Box3(); const v = new THREE.Vector3();
  (boundsOf || g).traverse(o => { if (!o.isMesh || !o.geometry?.attributes?.position || o.userData.dress) return; const pa = o.geometry.attributes.position; const st = Math.max(1, Math.floor(pa.count / 3000)); for (let i = 0; i < pa.count; i += st) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); bb.expandByPoint(v); } });
  if (bb.isEmpty()) return;
  const sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const L = sz.z, muzzle = dir > 0 ? bb.max.z : bb.min.z;
  const glow = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x16181c, metalness: 0.85, roughness: 0.3 });
  const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.userData.dress = true; g.add(m); return m; };
  // twin emissive strips along the top/sides
  const sl = L * 0.5, sz0 = c.z + dir * L * 0.05;
  mk(new THREE.BoxGeometry(Math.max(0.006, sz.x * 0.08), Math.max(0.004, sz.y * 0.03), sl), glow, c.x, bb.max.y - sz.y * 0.12, sz0);
  mk(new THREE.BoxGeometry(0.004 + sz.x * 0.02, sz.y * 0.05, sl * 0.7), glow, bb.max.x + 0.002, c.y, sz0);
  mk(new THREE.BoxGeometry(0.004 + sz.x * 0.02, sz.y * 0.05, sl * 0.7), glow, bb.min.x - 0.002, c.y, sz0);
  // energy cell (glowing canister) under / beside the body
  const cr = Math.max(sz.x, sz.y) * (kind === 'rocket' ? 0.14 : 0.12);
  const cell = mk(new THREE.CylinderGeometry(cr, cr, L * 0.16, 10), glow, bb.max.x + cr * 0.6, c.y - sz.y * 0.1, c.z - dir * L * 0.1); cell.rotation.x = Math.PI / 2;
  const cap1 = mk(new THREE.CylinderGeometry(cr * 1.15, cr * 1.15, L * 0.025, 10), dark, cell.position.x, cell.position.y, cell.position.z + L * 0.09); cap1.rotation.x = Math.PI / 2;
  const cap2 = mk(new THREE.CylinderGeometry(cr * 1.15, cr * 1.15, L * 0.025, 10), dark, cell.position.x, cell.position.y, cell.position.z - L * 0.09); cap2.rotation.x = Math.PI / 2;
  // coils near the muzzle
  const nC = kind === 'emp' ? 5 : kind === 'shotgun' ? 2 : 3;
  const rr = Math.min(sz.x, sz.y) * (kind === 'emp' ? 0.3 : 0.22);
  for (let i = 0; i < nC; i++) { const t = mk(new THREE.TorusGeometry(rr, rr * 0.16, 6, 16), glow, c.x, bb.max.y - sz.y * 0.3, muzzle - dir * L * (0.1 + i * 0.05)); }
  g.userData.dressMat = glow;
}
function prepWeaponTemplate(scene, lengthM) {
  // orient barrel along +Z (enemy forward), grip near origin
  const inner = new THREE.Group(); inner.add(scene);
  inner.rotation.y = gunYawToForward(scene) + Math.PI; // gunYawToForward points barrel to -Z → flip to +Z
  const outer = new THREE.Group(); outer.add(inner); outer.updateMatrixWorld(true);
  let bb = meshOnlyBounds(inner); const sz = new THREE.Vector3(); bb.getSize(sz);
  inner.scale.multiplyScalar(lengthM / Math.max(0.05, sz.z)); outer.updateMatrixWorld(true); bb = meshOnlyBounds(inner);
  const c = new THREE.Vector3(); bb.getCenter(c);
  // grip about 30% from the rear
  inner.position.set(-c.x, -c.y + 0.03, -(bb.min.z + (bb.max.z - bb.min.z) * 0.3));
  outer.updateMatrixWorld(true); bb = meshOnlyBounds(inner);
  outer.userData.muzzleZ = bb.max.z; outer.userData.foreZ = bb.min.z + (bb.max.z - bb.min.z) * 0.62;
  outer.traverse(o => { if (o.isMesh) { o.castShadow = true; if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(brightenMat); } });
  return outer;
}
function proceduralEnemyGun(kind) {
  const g = new THREE.Group();
  if (kind === 'rifle') {
    const m = new THREE.MeshStandardMaterial({ color: 0x1b1c1e, roughness: 0.5, metalness: 0.6 });
    const add = (w, h, d, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
    add(0.06, 0.09, 0.42, 0, 0.03, 0.12); add(0.035, 0.035, 0.32, 0, 0.05, 0.48); add(0.05, 0.14, 0.06, 0, -0.07, 0.16); add(0.045, 0.1, 0.05, 0, -0.04, -0.02); add(0.05, 0.08, 0.2, 0, 0.02, -0.16); add(0.04, 0.04, 0.08, 0, 0.11, 0.12);
    g.userData.muzzleZ = 0.64; g.userData.foreZ = 0.36;
  } else {
    const m = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.45, metalness: 0.75 });
    const glow = new THREE.MeshStandardMaterial({ color: 0xff6a00, emissive: 0xff5a00, emissiveIntensity: 2.2 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.6, 10), m); body.rotation.x = Math.PI / 2; body.position.z = 0.22; g.add(body);
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 6, 14), glow); r.position.z = 0.3 + i * 0.12; g.add(r); }
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 10), m); tip.rotation.x = Math.PI / 2; tip.position.z = 0.6; g.add(tip);
    g.userData.muzzleZ = 0.7; g.userData.foreZ = 0.38;
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  sciFiDress(g, kind === 'rifle' ? 0x38e0ff : 0xff5a1a, +1, kind);
  try { tacDetail(g, kind, +1, null, IS_COARSE); } catch (e) {}
  return g;
}
function findBone(root, rx) { let f = null; root.traverse(o => { if (!f && (o.isBone || o.type === 'Bone') && rx.test(o.name)) f = o; }); return f; }
function equipEnemyWeapon(b) {
  if (b.isBoss || !b.rig?.root) return;
  if (b.weapon) b.weapon.parent?.remove(b.weapon);
  const kind = b.isHuman ? 'rifle' : 'pulse';
  const tpl = ENEMY_WEAPON_TPL[kind];
  const w = tpl ? tpl.clone(true) : proceduralEnemyGun(kind);
  w.userData.muzzleZ = tpl ? tpl.userData.muzzleZ : w.userData.muzzleZ; w.userData.foreZ = tpl ? tpl.userData.foreZ : w.userData.foreZ;
  const scaleBy = b.isHuman ? 1 : (b.heavy ? 1.5 : 1.3);
  w.scale.setScalar(scaleBy); w.userData.k = scaleBy;
  scene.add(w); b.weapon = w;
  const R = b.rig.root;
  b.bones = {
    rHand: findBone(R, /right.?hand$|hand.?r$|r.?hand$/i), rArm: findBone(R, /right.?arm$|upperarm.?r$|r.?upperarm$/i), rFore: findBone(R, /right.?fore.?arm$|lowerarm.?r$|forearm.?r$/i),
    lHand: findBone(R, /left.?hand$|hand.?l$|l.?hand$/i), lArm: findBone(R, /left.?arm$|upperarm.?l$|l.?upperarm$/i), lFore: findBone(R, /left.?fore.?arm$|lowerarm.?l$|forearm.?l$/i)
  };
}
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
// rotate `bone` so that the direction bone→child points at world target
function aimBone(bone, child, target, w = 1) {
  if (!bone || !child) return;
  bone.updateMatrixWorld(true);
  bone.getWorldPosition(_v1); child.getWorldPosition(_v2);
  const cur = _v2.sub(_v1).normalize(); const want = _v3.copy(target).sub(_v1).normalize();
  _q.setFromUnitVectors(cur, want); if (w < 1) _q.slerp(new THREE.Quaternion(), 1 - w);
  bone.getWorldQuaternion(_q2); _q2.premultiply(_q);
  const pq = new THREE.Quaternion(); bone.parent.getWorldQuaternion(pq); bone.quaternion.copy(pq.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}
function enemyAimDir(b) {
  const P = STATE.player; const fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
  let pitch = 0;
  if (b.aiState === 'combat' && b.los) { const d = Math.hypot(P.x - b.x, P.z - b.z); pitch = Math.atan2((P.y + 1.3) - (b.y + 1.4), d); }
  return new THREE.Vector3(fx * Math.cos(pitch), Math.sin(pitch), fz * Math.cos(pitch));
}
function updateEnemyWeapon(b) {
  const w = b.weapon; if (!w) return;
  if (b.dying) { w.visible = b.deathTimer > 0.4; }
  const dir = enemyAimDir(b); const B = b.bones || {}; const R = b.rig.root;
  const H = (b.hitHeight || 2) * (R.scale.y || 1);
  const right = new THREE.Vector3(dir.z, 0, -dir.x).normalize().multiplyScalar(-1); // enemy's right side
  // shoulder-height aim point in front of the chest
  const shoulder = new THREE.Vector3(b.x, b.y + H * 0.78, b.z).addScaledVector(right, H * 0.12);
  const handTarget = shoulder.clone().addScaledVector(dir, H * 0.3).addScaledVector(right, -H * 0.02).add(new THREE.Vector3(0, -H * 0.08, 0));
  if (B.rHand && B.rArm && B.rFore && !b.dying) {
    R.updateMatrixWorld(true);
    // two-step IK-lite: aim upper arm partly forward/down, forearm at the hand target
    const elbow = shoulder.clone().addScaledVector(dir, H * 0.1).addScaledVector(right, H * 0.06).add(new THREE.Vector3(0, -H * 0.15, 0));
    aimBone(B.rArm, B.rFore, elbow); aimBone(B.rFore, B.rHand, handTarget);
    w.position.copy(B.rHand.getWorldPosition(_v1));
  } else {
    w.position.copy(handTarget);
  }
  w.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  w.updateMatrixWorld(true);
  // support hand to the fore-end
  if (B.lHand && B.lArm && B.lFore && !b.dying) {
    const fore = new THREE.Vector3(0, -0.03, w.userData.foreZ).applyMatrix4(w.matrixWorld);
    const lsh = new THREE.Vector3(b.x, b.y + H * 0.78, b.z).addScaledVector(right, -H * 0.12);
    const lel = lsh.clone().lerp(fore, 0.5).add(new THREE.Vector3(0, -H * 0.12, 0)).addScaledVector(right, -H * 0.05);
    aimBone(B.lArm, B.lFore, lel); aimBone(B.lFore, B.lHand, fore);
  }
}
function enemyMuzzle(b, out) {
  if (b.weapon && b.weapon.visible) { return out.set(0, 0.02, b.weapon.userData.muzzleZ).applyMatrix4(b.weapon.matrixWorld); }
  return out.set(b.x + Math.sin(b.yaw) * 0.6, b.y + 1.45, b.z + Math.cos(b.yaw) * 0.6);
}
// ---- Colossus arm cannon ----
function buildColossusCannon(C) {
  const k = C.height / 24; const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.4, metalness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e1a18, roughness: 0.6, metalness: 0.7 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 2.4 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 3.2, 14), metal); barrel.rotation.x = Math.PI / 2; barrel.position.z = 1.2; g.add(barrel);
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.4, 8), dark); shroud.rotation.x = Math.PI / 2; shroud.position.z = 0.1; g.add(shroud);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.66 - i * 0.03, 0.08, 6, 18), glow); r.position.z = 1.0 + i * 0.55; g.add(r); }
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.3, 14), dark); mouth.rotation.x = Math.PI / 2; mouth.position.z = 2.85; g.add(mouth);
  g.scale.setScalar(k * 1.35); g.userData.muzzleZ = 3.0; g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g); C.cannon = g; C.cannonGlow = glow;
}
function updateColossusCannon(C) {
  if (!C.cannon) buildColossusCannon(C);
  const g = C.cannon; g.visible = !C.dead && C.root.visible && !C.ownCannon; // Round 20: Meshy Colossus has its own arm cannon
  const hp = new THREE.Vector3(); (C.hand || C.fallback).getWorldPosition(hp);
  const tgt = new THREE.Vector3(STATE.player.x, STATE.player.y + 1.2, STATE.player.z);
  const dir = tgt.sub(hp).normalize();
  if (!C.alerted || C.charge < 0) { const fw = new THREE.Vector3(Math.sin(C.root.rotation.y), -0.35, Math.cos(C.root.rotation.y)).normalize(); dir.lerp(fw, C.alerted ? 0.55 : 1).normalize(); }
  g.position.copy(hp); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  C.cannonGlow.emissiveIntensity = C.stun > 0 ? 0.2 : (C.charge >= 0 ? 2.4 + C.charge * 6 : 2.0);
  g.updateMatrixWorld(true);
}
function colossusMuzzle(out, C) { return out.set(0, 0, C.cannon.userData.muzzleZ).applyMatrix4(C.cannon.matrixWorld); }

// ============================================================================
// FPS ARMS — procedural gloved hands + detainee-jumpsuit sleeves on every weapon
// ============================================================================
const VM = { reloadT: 0, swapT: 0, swapEmp: false, kick: 0, leftArm: null, rightArm: null, armsMats: null };
function armsMats() {
  if (VM.armsMats) return VM.armsMats;
  // multicam-style fabric: tan base, olive/brown blobs, dark branches, weave lines
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  x.fillStyle = '#8a7d5e'; x.fillRect(0, 0, 256, 256);
  const blob = (c, n, r) => { x.fillStyle = c; for (let i = 0; i < n; i++) { const cx = Math.random() * 256, cy = Math.random() * 256; x.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = r * (0.55 + Math.random() * 0.6); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7); } x.fill(); } };
  blob('#6d6a45', 26, 22); blob('#5a4a33', 18, 16); blob('#a39572', 16, 14); blob('#3b3526', 22, 6);
  x.strokeStyle = '#2c2a20'; x.lineWidth = 2; for (let i = 0; i < 14; i++) { x.beginPath(); let px = Math.random() * 256, py = Math.random() * 256; x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (Math.random() - 0.5) * 40; py += (Math.random() - 0.5) * 30; x.lineTo(px, py); } x.stroke(); }
  for (let y = 0; y < 256; y += 2) { x.fillStyle = 'rgba(0,0,0,0.07)'; x.fillRect(0, y, 256, 1); }
  for (let xx = 0; xx < 256; xx += 3) { x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(xx, 0, 1, 256); }
  const camo = new THREE.CanvasTexture(cv); camo.wrapS = camo.wrapT = THREE.RepeatWrapping; camo.repeat.set(1.5, 1); camo.encoding = THREE.sRGBEncoding;
  // glove leather/synthetic grain
  const gv = document.createElement('canvas'); gv.width = gv.height = 64; const g = gv.getContext('2d');
  g.fillStyle = '#5a5240'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 500; i++) { const v = 70 + Math.random() * 30; g.fillStyle = `rgb(${v + 8},${v},${v - 14})`; g.fillRect(Math.random() * 64, Math.random() * 64, 1, 1); }
  const grain = new THREE.CanvasTexture(gv); grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.encoding = THREE.sRGBEncoding;
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  VM.armsMats = {
    sleeve: new THREE.MeshStandardMaterial({ map: camo, color: 0xffffff, roughness: 0.95, metalness: 0.0, envMapIntensity: 0.15 }),
    cuff: new THREE.MeshStandardMaterial({ color: lin(0x4a4632), roughness: 0.9, envMapIntensity: 0.2 }),
    glove: new THREE.MeshStandardMaterial({ map: grain, color: 0xffffff, roughness: 0.7, metalness: 0.05, envMapIntensity: 0.25 }),
    palm: new THREE.MeshStandardMaterial({ color: lin(0x5c4c36), roughness: 0.85, envMapIntensity: 0.2 }),
    knuckle: new THREE.MeshStandardMaterial({ color: lin(0x1d1f22), roughness: 0.35, metalness: 0.55, envMapIntensity: 0.6 }),
    strap: new THREE.MeshStandardMaterial({ color: lin(0x3b3a30), roughness: 0.8, metalness: 0.1, envMapIntensity: 0.2 }),
    metal: new THREE.MeshStandardMaterial({ color: lin(0x2a2c30), roughness: 0.3, metalness: 0.85, envMapIntensity: 0.8 }),
    screen: new THREE.MeshBasicMaterial({ color: 0x35f0a0 }),
    skin: new THREE.MeshStandardMaterial({ color: lin(0xa8775a), roughness: 0.7 })
  };
  Object.values(VM.armsMats).forEach(m => { m.userData._bright = true; });
  return VM.armsMats;
}
function limb(a, b, r0, r1, mat) {
  const d = new THREE.Vector3().subVectors(b, a); const L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, 16, 1), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}
// smooth lathe forearm (wrist→elbow, slight muscle bulge), local +Y along the bone
function forearmMesh(a, b, rW, rE, mat) {
  const d = new THREE.Vector3().subVectors(b, a); const L = d.length(); const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; const r = rW + (rE - rW) * t + Math.sin(t * Math.PI) * 0.012 * (t > 0.4 ? 1.3 : 0.7); pts.push(new THREE.Vector2(r, t * L)); }
  const geo = new THREE.LatheGeometry(pts, 18); const m = new THREE.Mesh(geo, mat);
  m.position.copy(a); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}
const _fingerGeo = {};
function fingerSeg(len, r, mat) {
  const key = len.toFixed(3) + r.toFixed(3);
  if (!_fingerGeo[key]) { const cyl = new THREE.CylinderGeometry(r, r * 1.04, len, 10, 1); cyl.rotateX(Math.PI / 2); cyl.translate(0, 0, -len / 2); _fingerGeo[key] = cyl; }
  const g = new THREE.Group(); g.add(new THREE.Mesh(_fingerGeo[key], mat));
  const knuckle = new THREE.Mesh(new THREE.SphereGeometry(r * 1.05, 10, 8), mat); g.add(knuckle);
  return g;
}
// hand facing local -Z (fingers wrap around an object along X). trigger: index finger extended along the frame
function buildGlove(side, curl, trigger = false) {
  const M = armsMats(); const h = new THREE.Group();
  // palm: rounded block (scaled sphere + box) with synthetic palm patch
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.03, 0.082), M.glove); h.add(palm);
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), M.glove); back.scale.set(0.95, 0.42, 1.0); back.position.set(0, 0.008, 0.002); h.add(back);
  const pp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.006, 0.06), M.palm); pp.position.set(0, -0.016, 0.004); h.add(pp);
  // hard knuckle armour: carbon plate with 4 ridges
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.026), M.knuckle); plate.position.set(0, 0.024, -0.03); plate.rotation.x = -0.12; h.add(plate);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), M.knuckle); r.scale.set(1, 0.7, 1.3); r.position.set(-0.028 + i * 0.0187, 0.031, -0.033); h.add(r); }
  const bp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.03), M.knuckle); bp.position.set(0, 0.022, 0.012); h.add(bp);
  // fingers: 3 rounded segments each, natural cascading curl; index = trigger finger
  const lens = [[0.03, 0.022, 0.018], [0.033, 0.024, 0.019], [0.031, 0.023, 0.018], [0.025, 0.018, 0.015]];
  for (let i = 0; i < 4; i++) {
    const fi = side > 0 ? i : 3 - i; // index finger on thumb side
    const f = new THREE.Group(); f.position.set(-0.028 + i * 0.0187, 0, -0.043); h.add(f);
    const isIndex = (side > 0 ? i === 0 : i === 3);
    const c = trigger && isIndex ? 0.35 : curl * (1 + (fi === 3 ? 0.12 : 0) + (fi === 2 ? 0.06 : 0));
    let parent = f; const r = isIndex ? 0.0088 : 0.0085 - fi * 0.0004;
    lens[fi].forEach((len, k) => {
      const seg = fingerSeg(len, r * (1 - k * 0.07), M.glove); parent.add(seg);
      if (k === 0 && !(trigger && isIndex)) { const pad = new THREE.Mesh(new THREE.BoxGeometry(r * 1.7, r * 0.7, len * 0.6), M.knuckle); pad.position.set(0, r * 0.95, -len * 0.5); seg.add(pad); }
      const j = new THREE.Group(); j.position.z = -len; j.rotation.x = -c * (k === 0 ? 0.85 : 1.1); seg.add(j); parent = j;
    });
    f.rotation.x = -c * 0.55; f.rotation.y = (i - 1.5) * 0.04;
    if (trigger && isIndex) { f.rotation.y += side * 0.12; }
  }
  // thumb: 2 segments wrapping over the grip
  const th = new THREE.Group(); th.position.set(side * 0.04, -0.004, -0.008); th.rotation.set(-0.35, side * 0.75, side * 0.55); h.add(th);
  const t1 = fingerSeg(0.034, 0.0105, M.glove); th.add(t1);
  const tj = new THREE.Group(); tj.position.z = -0.034; tj.rotation.x = -0.45 * curl; t1.add(tj); tj.add(fingerSeg(0.026, 0.0095, M.glove));
  // cuff strap + velcro tab
  const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.04, 0.026, 16), M.strap); strap.rotation.x = Math.PI / 2; strap.scale.set(1, 1, 0.62); strap.position.z = 0.052; h.add(strap);
  const tab = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.022), M.knuckle); tab.position.set(side * 0.012, 0.026, 0.052); h.add(tab);
  return h;
}
function buildArm(side, handPos, elbowPos, handRot, curl, trigger = false) {
  const M = armsMats(); const g = new THREE.Group();
  const wrist = handPos.clone().add(new THREE.Vector3(0, 0, 0.075));
  // gloved wrist + tactical sleeve over a smooth lathe forearm
  g.add(forearmMesh(wrist, elbowPos, 0.05, 0.078, M.sleeve));
  // elastic cuff at the wrist
  g.add(limb(wrist.clone().lerp(elbowPos, -0.02), wrist.clone().lerp(elbowPos, 0.1), 0.055, 0.058, M.cuff));
  // rolled fold + seam strap + utility patch on the forearm
  const fold = limb(wrist.clone().lerp(elbowPos, 0.5), wrist.clone().lerp(elbowPos, 0.6), 0.088, 0.091, M.sleeve); g.add(fold);
  const fold2 = limb(wrist.clone().lerp(elbowPos, 0.6), wrist.clone().lerp(elbowPos, 0.63), 0.091, 0.086, M.cuff); g.add(fold2);
  const dir = new THREE.Vector3().subVectors(elbowPos, wrist).normalize();
  const patchPos = wrist.clone().lerp(elbowPos, 0.3); const out = new THREE.Vector3(side * 0.6, 0.8, 0).normalize();
  const patch = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, 0.05), M.strap); patch.position.copy(patchPos).addScaledVector(out, 0.066); patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); g.add(patch);
  // wrist computer (left) / watch (right)
  const wc = new THREE.Group(); wc.position.copy(wrist.clone().lerp(elbowPos, 0.14)).addScaledVector(new THREE.Vector3(0, 1, 0), 0.056); wc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); g.add(wc);
  if (side < 0) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.065), M.metal); wc.add(body);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.05), M.screen); scr.rotation.x = -Math.PI / 2; scr.position.y = 0.0085; wc.add(scr); VM.wristScreen = scr;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.007, 6, 18), M.strap); band.position.y = -0.045; wc.add(band);
  } else {
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.01, 16), M.metal); wc.add(face);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.013, 16), new THREE.MeshBasicMaterial({ color: 0x1d6f55 })); glass.rotation.x = -Math.PI / 2; glass.position.y = 0.0055; wc.add(glass);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.006, 6, 18), M.strap); band.position.y = -0.043; wc.add(band);
  }
  const hand = buildGlove(side, curl, trigger); hand.position.copy(handPos); hand.rotation.copy(handRot); hand.scale.setScalar(1.5); g.add(hand);
  // armoured forearm guard + keep the arms readable against dark guns
  { const gp = forearmMesh(wrist.clone().lerp(elbowPos, 0.18), wrist.clone().lerp(elbowPos, 0.42), 0.06, 0.07, M.knuckle); gp.scale.set(1, 1, 0.55); gp.position.addScaledVector(new THREE.Vector3(0, 1, 0), 0.012); g.add(gp); }
  [M.sleeve, M.glove, M.cuff].forEach(m => { if (m && m.emissive && !m.userData._lit) { m.userData._lit = true; m.emissive.copy(m.color).multiplyScalar(0.07); m.emissiveIntensity = 1; } });
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.renderOrder = 2; } });
  g.userData.hand = hand; return g;
}
// attach arms to the current viewmodel; bounds measured in wrap space
function attachFPSArms(wrap) {
  wrap.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(wrap.matrixWorld).invert(); const bb = new THREE.Box3(); const v = new THREE.Vector3();
  wrap.traverse(o => { if (!o.isMesh || !o.geometry?.attributes?.position || o.userData.isArm) return; const p = o.geometry.attributes.position; const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld); const idx = o.geometry.index; const n = idx ? idx.count : p.count; const st = Math.max(1, Math.floor(n / 5000)); for (let i = 0; i < n; i += st) { v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(m); bb.expandByPoint(v); } });
  if (bb.isEmpty()) bb.set(new THREE.Vector3(-0.07, -0.09, -0.6), new THREE.Vector3(0.07, 0.09, 0.05));
  const len = bb.max.z - bb.min.z, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2, hw = (bb.max.x - bb.min.x) / 2;
  const gripZ = bb.max.z - len * 0.2, foreZ = bb.min.z + len * 0.42;
  // right hand wraps the grip from the right side, forearm runs off the bottom-right edge
  const R = buildArm(1, new THREE.Vector3(cx + hw * 0.55, cy - 0.035, gripZ), new THREE.Vector3(cx + 0.2, cy - 0.3, gripZ + 0.32), new THREE.Euler(0.15, 0.25, -1.35), 1.05, true);
  // left hand cups the fore-end from below, forearm runs off the bottom-left
  const L = buildArm(-1, new THREE.Vector3(cx - hw * 0.25, bb.min.y + 0.01, foreZ), new THREE.Vector3(cx - 0.34, cy - 0.3, foreZ + 0.3), new THREE.Euler(0.1, -0.45, 0.35), 0.85);
  [R, L].forEach(a => a.traverse(o => { o.userData.isArm = true; }));
  wrap.add(R, L); VM.rightArm = R; VM.leftArm = L;
  VM.magY = bb.min.y; VM.foreZ = foreZ;
}
function onWeaponSwapped(idx) {
  VM.swapT = 0.42; VM.swapEmp = !!(STATE.weapons[idx] && STATE.weapons[idx].emp);
  if (VM.swapEmp && gunMesh) { const l = new RTLight(0x38bdf8, 3, 2.5); l.position.set(0, 0.05, -0.4); gunMesh.add(l); setTimeout(() => gunMesh && gunMesh.remove(l), 420); }
}
function startReloadAnim() { if (VM.reloadT <= 0) VM.reloadT = 0.9; }
// called each frame after the base bob/sway transform
function animateViewModel(dt, now) {
  if (!gunMesh) return;
  const aspect = camera.aspect; const portrait = aspect < 1;
  // phone portrait: pull the gun towards centre and scale down a touch so it doesn't eat the screen
  const sx = portrait ? 0.16 * aspect : (aspect < 1.5 ? 0.27 : 0.32);
  gunMesh.position.x += sx - (STATE.currentWeapon === 0 ? 0.32 : 0.28);
  gunMesh.scale.setScalar(portrait ? 0.8 : 1);
  gunMesh.rotation.x = 0; gunMesh.rotation.y = 0;
  if (VM.swapT > 0) {
    VM.swapT = Math.max(0, VM.swapT - dt); const k = VM.swapT / 0.42;
    gunMesh.position.y -= k * k * 0.35; gunMesh.rotation.x = -k * 0.5;
    if (VM.swapEmp) { gunMesh.rotation.z += Math.sin(k * Math.PI) * 0.6; gunMesh.rotation.y = k * 0.5; }
  }
  if (VM.reloadT > 0) {
    VM.reloadT = Math.max(0, VM.reloadT - dt); const t = 1 - VM.reloadT / 0.9; const dip = Math.sin(Math.PI * t);
    gunMesh.position.y -= dip * 0.12; gunMesh.rotation.x += dip * 0.45; gunMesh.rotation.z += dip * 0.35;
    if (VM.leftArm) { const m = Math.sin(Math.PI * Math.min(1, t * 1.6)); VM.leftArm.position.set(0.02 * m, -0.11 * m, 0.08 * m); VM.leftArm.rotation.x = 0.2 * m; }
  } else if (VM.leftArm) { VM.leftArm.position.multiplyScalar(0.8); VM.leftArm.rotation.x *= 0.8; }
  VM.kick *= Math.exp(-dt * 14); gunMesh.rotation.x += VM.kick * 0.35; gunMesh.position.y += VM.kick * 0.03;
  // never let the rig leave the hands / screen corner, whatever stacks up (swap + reload + kick + ADS)
  gunMesh.rotation.x = Math.max(-0.55, Math.min(0.5, gunMesh.rotation.x)); gunMesh.rotation.z = Math.max(-0.45, Math.min(0.45, gunMesh.rotation.z));
  const _by = STATE.currentWeapon === 0 ? -0.28 : -0.26; gunMesh.position.y = Math.max(_by - 0.4, Math.min(_by + 0.06, gunMesh.position.y));
  if (VM.leftArm && VM.leftArm.parent !== gunMesh && gunMesh.children.length) { try { gunMesh.add(VM.leftArm); } catch (e) {} }
  if (VM.rightArm && VM.rightArm.parent !== gunMesh) { try { gunMesh.add(VM.rightArm); } catch (e) {} }
  // idle breathing on top of the existing bob
  gunMesh.rotation.x += Math.sin(now * 0.0016) * 0.008; gunMesh.rotation.y += Math.sin(now * 0.0011) * 0.01;
}

// ============================================================================
// SPAWN / COMBAT / DEATH GIB / EFFECTS
// ============================================================================
function showBanner(title, sub, duration = 4200) {
  const banner = document.getElementById('center-banner');
  document.getElementById('banner-title').textContent = title;
  document.getElementById('banner-sub').textContent = sub;
  banner.classList.remove('hidden');
  clearTimeout(banner._t);
  banner._t = setTimeout(() => banner.classList.add('hidden'), duration);
}
function clearBots() { BOTS.forEach(b => { scene.remove(b.rig.root); if (b.weapon) scene.remove(b.weapon); }); BOTS = []; }

function spawnBotFromArchetype(spec, levelMult = 1.0) {
  const isHumanGuard = spec.role === 'human_guard';
  const isHuman = spec.role === 'human';
  const heavy = !isHumanGuard && !isHuman;
  let rig, procHuman = false;
  if (isHuman) {
    if (MESHY_TEMPLATES.human) rig = buildRigFromMeshyTemplate(MESHY_TEMPLATES.human, spec.name, false);
    else { rig = createDoomSentinel(0x1f2937, 0x38bdf8, spec.name, false); rig.root.scale.multiplyScalar(0.8); procHuman = true; }
  } else if (isHumanGuard && MESHY_TEMPLATES.guard) {
    rig = buildRigFromMeshyTemplate(MESHY_TEMPLATES.guard, spec.name, false);
  } else if (!isHumanGuard && MESHY_TEMPLATES.bot) {
    rig = buildRigFromMeshyTemplate(MESHY_TEMPLATES.bot, spec.name, false);
  } else {
    // Strogg palette defaults: rust/brown-green armor, amber/red eyes
    const armor = spec.armorColor || (heavy ? 0x3f2a1a : 0x4a3b28);
    const tint = spec.tint || (heavy ? 0xef4444 : 0xf59e0b);
    rig = createDoomSentinel(armor, tint, spec.name, heavy);
  }
  const spawnY = Number(spec.y) || getGroundHeightAt(spec.x, spec.z, 6);
  rig.root.position.set(spec.x, spawnY, spec.z);
  rig.root.traverse(o => { if (o.isMesh && !o.isSprite) { o.castShadow = true; o.receiveShadow = !IS_COARSE; } });
  applyRim(rig.root, isHuman ? 0x9fd0ff : 0xffa060, isHuman ? 0.85 : 0.7);
  scene.add(rig.root);
  const maxHp = Math.round(spec.maxHealth * levelMult);
  rig.hb.update(maxHp, maxHp);
  BOTS.push({
    id: spec.id, name: spec.name, isBoss: false, isHumanGuard, isHuman, procHuman, heavy, role: spec.aiRole || 'pusher', squad: spec.squad || 0,
    patrolType: spec.patrolType || 'ground', homeX: spec.x, homeZ: spec.z,
    rig, mixer: rig.mixer || null,
    x: spec.x, y: spawnY, z: spec.z, vy: 0, yaw: 0,
    health: maxHp, maxHealth: maxHp, weaponIdx: spec.weapon || 0,
    fireCooldown: 1.0 + Math.random(), walkPhase: Math.random() * Math.PI * 2,
    strafeDir: Math.random() < 0.5 ? -1 : 1, strafeSwitchTimer: 1.2,
    flinchTimer: 0, dying: false, deathTimer: 0, radioCalloutCooldown: 4 + Math.random() * 6,
    hitRadius: rig.hitRadius || (heavy ? 1.05 : 0.9),
    hitHeight: isHuman ? 1.85 : (rig.hitHeight || (heavy ? 2.55 : 2.25))
  });
  initBotAI(BOTS[BOTS.length - 1]); equipEnemyWeapon(BOTS[BOTS.length - 1]);
}

// ============================================================================
// MENDER — Maintenance Unit (tracked base, humanoid torso, welder / claw / saw arms)
// ============================================================================
let TREAD_TEX = null;
function treadTexture() {
  if (TREAD_TEX) return TREAD_TEX;
  const c = document.createElement('canvas'); c.width = 32; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#15161a'; x.fillRect(0, 0, 32, 64); x.fillStyle = '#3d3f46'; for (let i = 0; i < 64; i += 8) x.fillRect(0, i, 32, 4); x.fillStyle = '#5a5d66'; for (let i = 0; i < 64; i += 8) x.fillRect(2, i, 28, 1);
  TREAD_TEX = new THREE.CanvasTexture(c); TREAD_TEX.wrapS = TREAD_TEX.wrapT = THREE.RepeatWrapping; TREAD_TEX.encoding = THREE.sRGBEncoding; return TREAD_TEX;
}
function buildMenderRig(name) {
  const root = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xd9a21b).convertSRGBToLinear(), metalness: 0.55, roughness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24262b, metalness: 0.8, roughness: 0.35 });
  const hazard = new THREE.MeshBasicMaterial({ color: 0xffb020 });
  const H = 2.5;
  // body: Meshy model if present (static), else procedural torso
  const body = new THREE.Group(); root.add(body);
  if (MESHY_TEMPLATES.mender) { const m = MESHY_TEMPLATES.mender.scene.clone(true); body.add(m); }
  else {
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.7), yellow); torso.position.y = 1.55; body.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.45), dark); head.position.y = 2.2; body.add(head);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0xff3a1a })); eye.position.set(0, 2.22, 0.24); body.add(eye);
    const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.5, 10), dark); hip.position.y = 0.95; body.add(hip);
  }
  // tracked base (procedural overlay, UV-scrolled)
  const tt = treadTexture().clone(); tt.needsUpdate = true; tt.repeat.set(1, 3);
  const treadMat = new THREE.MeshStandardMaterial({ map: tt, color: 0x9a9ca4, metalness: 0.6, roughness: 0.6 });
  const treads = [];
  [-0.48, 0.48].forEach(sx => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 1.25), treadMat); t.position.set(sx, 0.21, 0); root.add(t); treads.push(t);
    const wheelMat = dark; [-0.45, 0, 0.45].forEach(wz => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 10), wheelMat); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.2, wz); root.add(w); });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.04, 1.0), hazard); strip.position.set(sx, 0.44, 0); root.add(strip);
  });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.25, 1.05), dark); chassis.position.y = 0.42; root.add(chassis);
  // Round 19: Meshy tank-tread base replaces the box treads when loaded
  const tb = cloneProp('mender_treads'); if (tb) { const pre = root.children.slice(); pre.forEach(o => { if (o !== body) o.visible = false; }); const hold = new THREE.Group(); hold.scale.set(1.25, 0.95, 1.3); hold.add(tb); root.add(hold); }
  // upper assembly yaws independently (torso yaw)
  const upper = new THREE.Group(); upper.position.y = 1.55; root.add(upper);
  const mkArm = (side) => {
    const sh = new THREE.Group(); sh.position.set(side * 0.66, 0.15, 0.05); upper.add(sh);
    const ua = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.6), yellow); ua.position.z = 0.3; sh.add(ua);
    const elbow = new THREE.Group(); elbow.position.z = 0.6; sh.add(elbow);
    const fa = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.55), dark); fa.position.z = 0.27; elbow.add(fa);
    const tool = new THREE.Group(); tool.position.z = 0.58; elbow.add(tool);
    return { sh, elbow, tool };
  };
  const L = mkArm(-1), R = mkArm(1);
  // left: welding torch
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.25, 8), dark); nozzle.rotation.x = Math.PI / 2; nozzle.position.z = 0.1; L.tool.add(nozzle);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7fd8ff })); tip.position.z = 0.24; L.tool.add(tip);
  const torchMat = new THREE.MeshBasicMaterial({ color: 0x3f8cff, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const torch = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.2, 14, 1, true), torchMat); torch.rotation.x = -Math.PI / 2; torch.position.z = 1.85; L.tool.add(torch);
  const torchCore = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.6, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); torchCore.rotation.x = -Math.PI / 2; torchCore.position.z = 1.05; L.tool.add(torchCore);
  // right: claw + circular saw
  const sawMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.95, roughness: 0.2 });
  const saw = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 20), sawMat); saw.rotation.x = Math.PI / 2; saw.rotation.z = Math.PI / 2; saw.position.set(0.12, 0, 0.22); R.tool.add(saw);
  const sawGlow = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.012, 4, 24), new THREE.MeshBasicMaterial({ color: 0xff7a1a })); sawGlow.rotation.y = Math.PI / 2; sawGlow.position.copy(saw.position); R.tool.add(sawGlow);
  const claws = [];
  [-1, 1].forEach(cs => { const c = new THREE.Group(); c.position.set(-0.05, cs * 0.06, 0.08); const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.34), dark); f.position.z = 0.17; c.add(f); R.tool.add(c); claws.push(c); });
  // red dispatch beacons on the shoulders
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff1a0a });
  const beacons = [-0.42, 0.42].map(bx => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), beaconMat); b.position.set(bx, 0.62, -0.1); upper.add(b); return b; });
  let beaconLight = null; if (!IS_COARSE) { beaconLight = new RTLight(0xff2010, 1.2, 9, 2); beaconLight.position.set(0, 0.9, 0); upper.add(beaconLight); }
  const torchLight = new RTLight(0x6fc8ff, 0, 8, 2); torchLight.position.z = 0.8; L.tool.add(torchLight);
  const hb = createHealthBarSprite(name, false); hb.sprite.position.y = H + 0.6; root.add(hb.sprite);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  applyRim(root, 0xffc060, 0.6);
  return { root, hb, body, upper, L, R, torch, torchCore, torchMat, torchLight, saw, claws, treads, beacons, beaconMat, beaconLight, hitRadius: 1.15, hitHeight: H };
}
function spawnMender(x, z, i, hpMult = 1) {
  const name = `Mender MU-${String(7 + i * 3 + (STATE.level || 1)).padStart(2, '0')}`;
  const rig = buildMenderRig(name); rig.root.position.set(x, 0, z); scene.add(rig.root);
  const maxHp = Math.round(320 * hpMult); rig.hb.update(maxHp, maxHp);
  const b = { id: 'mender-' + i, name, isBoss: false, isMender: true, isHuman: false, heavy: true, role: 'mender', squad: 8, rig, mixer: null, x, y: 0, z, vy: 0, yaw: Math.atan2(STATE.player.x - x, STATE.player.z - z), upperYaw: 0,
    health: maxHp, maxHealth: maxHp, dying: false, deathTimer: 0, fireCooldown: 0, flinchTimer: 0, hitRadius: 1.15, hitHeight: 2.5, stunT: 0, atkT: 1.5, atkKind: 0, atkAnim: 0, torchOn: 0, repathT: 0, path: null, pathI: 0, speed: 2.5, treadV: 0, repairT: 0 };
  initBotAI(b); b.speed = 2.5; b.role = 'mender'; b.aiState = 'combat'; BOTS.push(b);
  return b;
}
function menderDispatchCue() {
  if (!BOTS.some(b => b.isMender && !b.dying)) return;
  let el = document.getElementById('mender-cue');
  if (!el) { el = document.createElement('div'); el.id = 'mender-cue'; el.style.cssText = "position:absolute;left:50%;top:15%;transform:translateX(-50%);z-index:43;pointer-events:none;font-family:'Chakra Petch',sans-serif;font-size:clamp(11px,1.6vw,18px);letter-spacing:.12em;color:#ffd7c2;background:linear-gradient(180deg,rgba(90,10,4,.92),rgba(40,4,2,.92));border:2px solid #ff3b1a;box-shadow:0 0 18px rgba(255,40,10,.6);padding:6px 14px;white-space:nowrap;"; document.body.appendChild(el); }
  el.textContent = 'SENTINEL CONTROL: MAINTENANCE UNITS DISPATCHED'; el.style.display = 'block'; el.style.animation = 'none'; void el.offsetWidth;
  clearTimeout(el._t); el._t = setTimeout(() => { el.style.display = 'none'; }, 5200);
  addKillFeed('SENTINEL CONTROL: MAINTENANCE UNITS DISPATCHED');
  SFX.playRadioChatter('Maintenance units dispatched. Damaged assets will be repaired. Remain where you are.', 'SENTINEL CONTROL');
  try { if (!SFX.muted) { const a = new Audio('audio/sentinel_dispatch.mp3'); a.volume = 0.9; a.play().catch(() => {}); } } catch (e) {}
  SFX.playSiren && SFX.playSiren(2);
}
function menderExplode(b) {
  const x = b.x, y = b.y, z = b.z;
  explode(x, y + 0.4, z, { scale: 1.3, debris: 6, debrisMat: new THREE.MeshStandardMaterial({ color: 0xc9961a, metalness: 0.6, roughness: 0.4 }) });
  const L = new RTLight(0xff8a2a, 7, 22, 2); L.position.set(x, y + 1.5, z); scene.add(L);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); shell.position.set(x, y + 1.2, z); scene.add(shell);
  MUZZLE_FX.push({ mesh: shell, life: 0.4, max: 0.4, light: L });
  const mats = [new THREE.MeshStandardMaterial({ color: 0xc9961a, metalness: 0.6, roughness: 0.4 }), new THREE.MeshStandardMaterial({ color: 0x2a2c31, metalness: 0.8, roughness: 0.3 })];
  for (let i = 0; i < (IS_COARSE ? 8 : 16); i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12 + Math.random() * 0.3, 0.08 + Math.random() * 0.2, 0.12 + Math.random() * 0.35), mats[i % 2]);
    m.position.set(x, y + 1.2, z); scene.add(m);
    MENDER_DEBRIS.push({ m, vx: (Math.random() - 0.5) * 12, vy: 4 + Math.random() * 7, vz: (Math.random() - 0.5) * 12, rx: Math.random() * 10, rz: Math.random() * 10, life: 2.6 + Math.random() });
  }
  const d = Math.hypot(STATE.player.x - x, STATE.player.z - z); if (d < 4.5) damagePlayer(Math.round(22 * (1 - d / 4.5) + 4));
  BOTS.forEach(o => { if (o !== b && !o.dying && Math.hypot(o.x - x, o.z - z) < 4) damageBot(o, 40); });
  b.rig.torchLight.intensity = 0; if (b.rig.beaconLight) b.rig.beaconLight.intensity = 0;
  addKillFeed(`${b.name} destroyed`);
}
const MENDER_DEBRIS = [];
function updateMenderDebris(dt) {
  for (let i = MENDER_DEBRIS.length - 1; i >= 0; i--) {
    const d = MENDER_DEBRIS[i]; d.life -= dt; d.vy -= 18 * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt;
    if (d.m.position.y < 0.06) { d.m.position.y = 0.06; d.vy *= -0.3; d.vx *= 0.6; d.vz *= 0.6; } else { d.m.rotation.x += d.rx * dt; d.m.rotation.z += d.rz * dt; }
    if (d.life <= 0) { scene.remove(d.m); MENDER_DEBRIS.splice(i, 1); }
  }
}
function updateMender(b, dt, now) {
  const P = STATE.player, R = b.rig;
  updateMenderDebris(dt);
  const dx = P.x - b.x, dz = P.z - b.z, dist = Math.hypot(dx, dz);
  // beacons pulse
  const pulse = (Math.sin(now * 0.012) + 1) / 2;
  R.beacons.forEach((bc, i) => { bc.visible = b.stunT > 0 ? Math.random() < 0.2 : (i ? pulse > 0.5 : pulse <= 0.5); });
  if (R.beaconLight) R.beaconLight.intensity = b.stunT > 0 ? 0 : 0.6 + pulse * 1.2;
  if (b.stunT > 0) {
    b.stunT -= dt; R.torchMat.opacity = 0; R.torchCore.material.opacity = 0; R.torchLight.intensity = 0;
    R.upper.rotation.x = 0.35 * Math.min(1, b.stunT); R.L.sh.rotation.x = 0.9; R.R.sh.rotation.x = 0.9;
    if (Math.random() < dt * 8) spawnImpact(b.x + (Math.random() - 0.5), b.y + 1 + Math.random() * 1.4, b.z + (Math.random() - 0.5), 0x7dd3fc);
    R.root.position.set(b.x, b.y, b.z); return;
  }
  R.upper.rotation.x *= 0.9;
  // repair a damaged sentinel nearby when the player is far
  let repairing = null;
  if (dist > 14) { repairing = BOTS.find(o => o !== b && !o.dying && !o.isMender && !o.isBoss && o.health < o.maxHealth && Math.hypot(o.x - b.x, o.z - b.z) < 7); }
  // path toward player (or repair target)
  const wk = menderWreckGoal(b); if (wk) repairing = null;
  const goal = wk ? wk : repairing ? repairing : P;
  b.repathT -= dt; if (b.repathT <= 0) { b.repathT = 0.8 + Math.random() * 0.4; b.path = aStar(b.x, b.z, goal.x, goal.z); b.pathI = 0; }
  let mvx = 0, mvz = 0; const stopD = wk ? 0.9 : repairing ? 3.0 : 2.4;
  if (b.path && b.pathI < b.path.length && Math.hypot(goal.x - b.x, goal.z - b.z) > stopD) {
    while (b.pathI < b.path.length - 1 && Math.hypot(b.path[b.pathI].x - b.x, b.path[b.pathI].z - b.z) < 1.2) b.pathI++;
    const t = b.path[b.pathI]; const tx = t.x - b.x, tz = t.z - b.z, td = Math.hypot(tx, tz);
    if (td > 0.2) { mvx = tx / td * b.speed; mvz = tz / td * b.speed; }
  }
  // tracked base turns slowly toward travel direction
  const moving = Math.abs(mvx) + Math.abs(mvz) > 0.05;
  if (moving) {
    const want = Math.atan2(mvx, mvz); let dy = Math.atan2(Math.sin(want - b.yaw), Math.cos(want - b.yaw)); b.yaw += Math.sign(dy) * Math.min(Math.abs(dy), dt * 1.8);
    const fwd = Math.max(0, Math.cos(dy)); const nx = b.x + Math.sin(b.yaw) * b.speed * fwd * dt, nz = b.z + Math.cos(b.yaw) * b.speed * fwd * dt;
    let moved = false; if (!collidesAt(nx, b.z, 0.9)) { b.x = nx; moved = true; } if (!collidesAt(b.x, nz, 0.9)) { b.z = nz; moved = true; }
    b.treadV = moved ? fwd * b.speed : 0; if (!moved) b.repathT = 0;
  } else b.treadV *= 0.8;
  R.treads.forEach(t => { t.material.map.offset.y -= b.treadV * dt * 0.8; });
  // torso yaw toward player / target
  const tgt = wk ? { x: wk.cx, z: wk.cz } : (repairing || P); const wantU = Math.atan2(tgt.x - b.x, tgt.z - b.z) - b.yaw; let du = Math.atan2(Math.sin(wantU - b.upperYaw), Math.cos(wantU - b.upperYaw));
  b.upperYaw += Math.sign(du) * Math.min(Math.abs(du), dt * 2.6); b.upperYaw = Math.max(-1.6, Math.min(1.6, b.upperYaw));
  R.upper.rotation.y = b.upperYaw; R.root.rotation.y = b.yaw;
  if (R.body && MESHY_TEMPLATES.mender) R.body.rotation.y = b.upperYaw * 0.5;
  const facingP = Math.abs(du) < 0.35;
  // attacks
  R.saw.rotation.y += dt * (dist < 5 ? 40 : 8);
  b.atkT -= dt; b.atkAnim = Math.max(0, b.atkAnim - dt);
  let torch = 0;
  if (wk && Math.hypot(wk.x - b.x, wk.z - b.z) < 2.2) { torch = 0.6; menderWeld(b, wk, dt); }
  else if (wk) { torch = 0; }
  else if (repairing) {
    torch = 0.5; repairing.health = Math.min(repairing.maxHealth, repairing.health + 14 * dt); repairing.rig.hb.update(Math.round(repairing.health), repairing.maxHealth);
    if ((b.repairT -= dt) <= 0) { b.repairT = 0.25; spawnImpact(repairing.x, repairing.y + 1.2, repairing.z, 0x6fc8ff); }
  } else if (dist < 3.4 && b.atkT <= 0) {
    b.atkKind = 1 - b.atkKind; b.atkT = b.atkKind ? 1.7 : 1.4; b.atkAnim = 0.5;
    setTimeout(() => { if (b.dying || b.stunT > 0) return; const d2 = Math.hypot(STATE.player.x - b.x, STATE.player.z - b.z); if (d2 < 3.6) { damagePlayer(Math.round((b.atkKind ? 18 : 14) * (STATE.diff?.dmg || 1)), b); STATE.screenShake = Math.max(STATE.screenShake, 0.45); spawnImpact(STATE.player.x, STATE.player.y + 1.2, STATE.player.z, b.atkKind ? 0xffd27a : 0xff7a1a); addKillFeed(`${b.name}: ${b.atkKind ? 'CLAW SLAM' : 'SAW SWEEP'}`); } }, 260);
  } else if (dist < 6.5 && dist >= 2.0 && facingP && losGrid(b.x, b.z, P.x, P.z, NAV.high)) {
    torch = 1; if ((b.burnT = (b.burnT || 0) - dt) <= 0) { b.burnT = 0.25; damagePlayer(Math.max(1, Math.round(3 * (STATE.diff?.dmg || 1)))); }
  }
  b.torchOn += (torch - b.torchOn) * Math.min(1, dt * 10);
  const fl = 0.75 + Math.random() * 0.25;
  R.torchMat.opacity = 0.16 * b.torchOn * fl; R.torchCore.material.opacity = 0.45 * b.torchOn * fl; R.torchLight.intensity = 3 * b.torchOn * fl;
  R.torch.scale.set(1, 1, 1); R.torch.visible = R.torchCore.visible = b.torchOn > 0.02;
  // flame jets leave the nozzle, project forward and fade (attached to the tool, never parked in the air)
  if (b.torchOn > 0.3 && (b.flameT = (b.flameT || 0) - dt) <= 0) {
    b.flameT = IS_COARSE ? 0.06 : 0.025; fxInit(); R.L.tool.updateMatrixWorld(true);
    const tip = new THREE.Vector3(0, 0, 0.26).applyMatrix4(R.L.tool.matrixWorld); const dir = new THREE.Vector3(0, 0, 1).transformDirection(R.L.tool.matrixWorld);
    const sp = 7 + Math.random() * 3; fxEmit('fire', tip.x, tip.y, tip.z, { life: 0.28, s0: 0.12, s1: 0.75, vx: dir.x * sp + (Math.random() - 0.5), vy: dir.y * sp + Math.random() * 0.6, vz: dir.z * sp + (Math.random() - 0.5), drag: 3, color: 0x9fd0ff });
  }
  // arm poses: torch arm aims forward when burning, claw/saw arm swings during attacks
  const a = b.atkAnim / 0.5; const swing = Math.sin((1 - a) * Math.PI);
  R.L.sh.rotation.x = b.torchOn > 0.1 ? -0.05 : 0.5 + Math.sin(now * 0.002) * 0.1; R.L.elbow.rotation.x = b.torchOn > 0.1 ? 0.0 : -0.6;
  if (b.atkKind) { R.R.sh.rotation.x = 0.5 - swing * 1.6; R.R.elbow.rotation.x = -0.4 + swing * 1.2; R.R.sh.rotation.y = 0; }
  else { R.R.sh.rotation.x = 0.1; R.R.elbow.rotation.x = -0.2; R.R.sh.rotation.y = -0.6 + swing * 1.4 * (b.atkAnim > 0 ? 1 : 0); }
  R.claws.forEach((c, i) => { c.rotation.x = (i ? 1 : -1) * (0.25 + (b.atkKind && b.atkAnim > 0 ? swing * 0.4 : 0)); });
  // gentle chassis bob
  b.y = getGroundHeightAt(b.x, b.z, b.y);
  R.root.position.set(b.x, b.y + (moving ? Math.sin(now * 0.02) * 0.02 : 0), b.z);
}
function spawnMinotaurBossForLevel() {
  if (STATE.bossSpawned) return;
  STATE.bossSpawned = true;
  SFX.playBossRoar();
  SFX.playRadioChatter('Minotaur Enforcer is loose in the core! All units fall back!', 'SECTOR COMMAND');
  const cfg = LEVEL_CONFIGS[STATE.level] || LEVEL_CONFIGS[1];
  const rig = MESHY_TEMPLATES.boss
    ? buildRigFromMeshyTemplate(MESHY_TEMPLATES.boss, '👹 CYBER-MINOTAUR OVERLORD', true)
    : createMinotaurBoss();
  rig.root.position.set(0, 0, -54); scene.add(rig.root); STATE.combatActive = true;
  const maxHp = Math.round(cfg.bossHp * STATE.botSkill);
  rig.hb.update(maxHp, maxHp);
  BOTS.push({
    id: 'minotaur-boss', name: '👹 CYBER-MINOTAUR OVERLORD', isBoss: true, isHumanGuard: false,
    rig, mixer: rig.mixer || null, x: 0, y: 0, z: -54, vy: 0, yaw: 0,
    health: maxHp, maxHealth: maxHp, weaponIdx: 2, fireCooldown: 1.2, walkPhase: 0,
    strafeDir: 1, strafeSwitchTimer: 1.5, flinchTimer: 0, dying: false, deathTimer: 0
  });
  document.getElementById('boss-hud').classList.remove('hidden');
  showBanner('⚠ MINOTAUR OVERLORD AWAKENED ⚠', 'Slay the Cyber-Minotaur to drop the North Elevator Keycard!', 5000);
  updateHUD();
}

const FLAME_GEOS = [new THREE.ConeGeometry(0.42, 1.35, 7), new THREE.OctahedronGeometry(0.32, 0), new THREE.SphereGeometry(0.28, 6, 6)];
const FLAME_COLORS = [0xffffff, 0xfef08a, 0xfacc15, 0xf97316, 0xef4444, 0x991b1b];

function spawnVolumetricFlameBurst(x, y, z, count = 18, spread = 2.2) {
  // fire only rises from a real surface; in mid-air the burst becomes falling burning fragments
  const gy = getGroundHeightAt(x, z, y + 0.5); const airborne = y - gy > 0.8; if (!airborne) y = gy;
  for (let i = 0; i < count; i++) {
    const cHex = FLAME_COLORS[Math.floor(Math.random() * FLAME_COLORS.length)];
    const isSmoke = Math.random() < 0.25;
    const mat = new THREE.MeshBasicMaterial({ color: isSmoke ? 0x1f2937 : cHex, transparent: true, opacity: isSmoke ? 0.55 : 0.92, blending: isSmoke ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(isSmoke ? FLAME_GEOS[2] : FLAME_GEOS[i % 2], mat);
    mesh.position.set(x + (Math.random() - 0.5) * spread, y + 0.2 + Math.random() * 0.4, z + (Math.random() - 0.5) * spread);
    scene.add(mesh);
    if (airborne && !isSmoke) { mesh.scale.setScalar(0.4); FLAME_PARTICLES.push({ mesh, isSmoke, fall: true, floor: gy + 0.1, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 4, life: 0.6 + Math.random() * 0.4, maxLife: 1 }); continue; }
    FLAME_PARTICLES.push({ mesh, isSmoke, vx: (Math.random() - 0.5) * 2.4, vy: isSmoke ? (2.2 + Math.random() * 2.5) : (3.2 + Math.random() * 4.2), vz: (Math.random() - 0.5) * 2.4, life: isSmoke ? (0.85 + Math.random() * 0.6) : (0.42 + Math.random() * 0.45), maxLife: isSmoke ? 1.4 : 0.85 });
  }
}

function spawnDeathGib(b) {
  b.dying = true; b.deathTimer = 0.85;
  const root = b.rig.root;
  // collapse
  if (b.rig.pelvis && b.rig.pelvis !== root) {
    b.rig.pelvis.rotation.x = 0.2;
  }
  // gib burst (biomech chunks)
  const colors = [0x6b3a2a, 0x5c4030, 0x3a3228, 0xf59e0b, 0x7f1d1d];
  for (let i = 0; i < (IS_COARSE ? 8 : 16); i++) {
    const chunk = new THREE.Mesh(
      Math.random() < 0.5 ? new THREE.BoxGeometry(0.15 + Math.random() * 0.2, 0.1, 0.12) : new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 5, 5),
      new THREE.MeshStandardMaterial({ color: colors[i % colors.length], metalness: Math.random() * 0.6, roughness: 0.5 })
    );
    chunk.position.set(b.x, b.y + 1.2, b.z); scene.add(chunk);
    DEATH_FX.push({ mesh: chunk, life: 0.9 + Math.random() * 0.5, vx: (Math.random() - 0.5) * 10, vy: 3 + Math.random() * 6, vz: (Math.random() - 0.5) * 10 });
  }
  spawnVolumetricFlameBurst(b.x, b.y + 1.0, b.z, 10, 1.6);
  STATE.screenShake = Math.max(STATE.screenShake, b.isBoss ? 0.55 : 0.28);
}

// Round 18: crosshair ray. Origin/direction come from the real render camera, so they match the screen-centre reticle.
function crosshairAim(maxD = 150) {
  camera.updateMatrixWorld(); const origin = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld); const dir = new THREE.Vector3(0, 0, -1).transformDirection(camera.matrixWorld);
  let best = maxD; const inv = new THREE.Vector3(1 / (dir.x || 1e-9), 1 / (dir.y || 1e-9), 1 / (dir.z || 1e-9));
  for (const c of colliders) { if (c.hi) continue; const y0 = c.minY ?? -1e3, y1 = c.maxY ?? 1e3;
    let t1 = (c.minX - origin.x) * inv.x, t2 = (c.maxX - origin.x) * inv.x, tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
    t1 = (y0 - origin.y) * inv.y; t2 = (y1 - origin.y) * inv.y; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
    t1 = (c.minZ - origin.z) * inv.z; t2 = (c.maxZ - origin.z) * inv.z; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
    if (tmax >= Math.max(0.05, tmin) && tmin > 0.05 && tmin < best) best = tmin; }
  if (dir.y < -1e-4) { const tf = (STATE.player.y - origin.y + 0.0) / dir.y; if (tf > 0 && tf < best) best = tf; } // floor under the player
  const hitEnt = (cx, cy, cz, r) => { const oc = new THREE.Vector3(cx - origin.x, cy - origin.y, cz - origin.z); const tc = oc.dot(dir); if (tc < 0) return; const d2 = oc.lengthSq() - tc * tc; if (d2 > r * r) return; const t = tc - Math.sqrt(r * r - d2); if (t > 0.05 && t < best) best = t; };
  BOTS.forEach(b => { if (b.dying) return; const h = b.isBoss ? 2.2 : 1.0; hitEnt(b.x, (b.y || 0) + h, b.z, b.isBoss ? 1.6 : 0.75); hitEnt(b.x, (b.y || 0) + h + 0.6, b.z, 0.45); });
  if (STATE.dm && typeof DM !== 'undefined') Object.values(DM.ents || {}).forEach(e => { if (e.alive) hitEnt(e.x, (e.y || 0) + 1.0, e.z, 0.7); });
  return { origin, dir, dist: best, point: origin.clone().addScaledVector(dir, best) };
}
function firePlayerWeapon() {
  if (STATE.fireCooldown > 0 || !STATE.running || STATE.pausedForStudio) return;
  aiNoise(STATE.player.x, STATE.player.z, 45);
  const wep = STATE.weapons[STATE.currentWeapon];
  if (wep.ammo <= 0) return;
  if (wep.ammo !== Infinity) wep.ammo--;
  STATE.fireCooldown = wep.fireRate;
  STATE.spinUp = Math.min(1, STATE.spinUp + 0.25);
  if (STATE.currentWeapon === 0) SFX.playPulse();
  else if (STATE.currentWeapon === 1) SFX.playShotgun();
  else SFX.playPew(290);
  // Round 17: recoil is a bounded impulse (was unbounded z push + 0.5 kick → gun drifted off the arms on rapid fire / low fps)
  VM.recoilZ = Math.min(0.045, (VM.recoilZ || 0) + wep.recoil * 0.18); VM.kick = Math.min(0.22, VM.kick + wep.recoil * 0.55);
  STATE.screenShake = Math.max(STATE.screenShake, wep.recoil * 0.6);

  // Round 18: aim from the CAMERA through the screen-centre crosshair. Find what the crosshair ray hits, then send the
  // shot from the muzzle to that exact point. (Before: shots started 13 cm below the eye on a parallel line, and the
  // 80% "magnetic" assist bent them up to ~0.5 rad toward any bot inside a 19° cone — so they missed the crosshair.)
  const aim = crosshairAim();
  let aimPoint = aim.point;
  const AAL = STATE.dm ? dmAimList() : BOTS;
  if (STATE.aimAssist > 0 && AAL.length) { // light magnetism: only targets already under/next to the crosshair
    let best = null, bestAng = 0.05 * STATE.aimAssist;
    AAL.forEach(b => { if (b.dying) return; const c = new THREE.Vector3(b.x, (b.y || 0) + (b.isBoss ? 2.0 : 1.3), b.z); const to = c.clone().sub(aim.origin); const L = to.length(); if (L > 72 || L > aim.dist + 0.5) return; const ang = aim.dir.angleTo(to.normalize()); if (ang < bestAng && !segmentBlocked(aim.origin, c)) { bestAng = ang; best = c; } });
    if (best) aimPoint = best;
  }
  syncVmCam();
  let muzzleWorld = aim.origin.clone().addScaledVector(aim.dir, 0.6);
  if (muzzleAnchor && gunMesh) { gunMesh.updateMatrixWorld(true); const mw = new THREE.Vector3(); muzzleAnchor.getWorldPosition(mw); if (mw.lengthSq() > 0.01) muzzleWorld = mw; }
  // if the muzzle is poking through a wall, start the shot at the eye instead
  const startPos = segmentBlocked(aim.origin, muzzleWorld) ? aim.origin.clone().addScaledVector(aim.dir, 0.3) : muzzleWorld.clone();
  const forward = aimPoint.clone().sub(startPos); if (forward.lengthSq() < 1e-4) forward.copy(aim.dir); forward.normalize();
  // ballistic launcher: keep the arc, but lob it so the arc lands on the crosshair point (low-angle solution)
  if (wep.splash > 0 && !wep.emp) { try { const g = STATE.gravity * ROCKET_G, v = wep.speed, dx = aimPoint.x - startPos.x, dz = aimPoint.z - startPos.z, D = Math.hypot(dx, dz), dy = aimPoint.y - startPos.y;
    const disc = v ** 4 - g * (g * D * D + 2 * dy * v * v); if (D > 0.5 && g > 0 && disc >= 0) { const th = Math.atan((v * v - Math.sqrt(disc)) / (g * D)); forward.set(dx / D * Math.cos(th), Math.sin(th), dz / D * Math.cos(th)).normalize(); } } catch (e) {} }
  STATE.lastAim = { origin: aim.origin.clone(), dir: aim.dir.clone(), point: aimPoint.clone(), start: startPos.clone(), fwd: forward.clone() };
  vmFlash.intensity = 2.2;
  spawnMuzzleFlash(muzzleWorld, wep.color, true);

  const dmgMult = STATE.quadTimer > 0 ? 4 : 1;
  for (let i = 0; i < (wep.pellets || 1); i++) {
    const dir = forward.clone();
    dir.x += (Math.random() - 0.5) * wep.spread; dir.y += (Math.random() - 0.5) * wep.spread; dir.z += (Math.random() - 0.5) * wep.spread;
    dir.normalize();
    if (STATE.dm) { const d2 = aimPoint.clone().sub(aim.origin).normalize(); d2.x += dir.x - forward.x; d2.y += dir.y - forward.y; d2.z += dir.z - forward.z; dmLocalShot(aim.origin.clone(), d2.normalize(), STATE.currentWeapon, dmgMult); }
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(wep.splash > 0 ? 0.22 : 0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: wep.color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
    );
    orb.position.copy(startPos); scene.add(orb);
    // tracer glow shell
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(wep.splash > 0 ? 0.35 : 0.18, 6, 6),
      new THREE.MeshBasicMaterial({ color: wep.color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    orb.add(glow);
    let pm = orb;
    if (wep.splash > 0 && !wep.emp) { pm = buildRocketMesh(wep.color); pm.position.copy(startPos); scene.add(pm); scene.remove(orb); }
    PROJECTILES.push({ ballistic: wep.splash > 0 && !wep.emp, mesh: pm, x: startPos.x, y: startPos.y, z: startPos.z, vx: dir.x * wep.speed, vy: dir.y * wep.speed, vz: dir.z * wep.speed, damage: wep.damage * dmgMult, splash: wep.splash || 0, fromPlayer: true, emp: !!wep.emp, life: 2.6 });
  }
  updateHUD();
}

function throwFragGrenade() {
  if (STATE.grenades <= 0 || !STATE.running || STATE.pausedForStudio) return;
  STATE.grenades--; SFX.playPew(420);
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(STATE.player.pitch, STATE.player.yaw, 0, 'YXZ'));
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 1.8 }));
  mesh.position.set(STATE.player.x, STATE.player.y + 1.5, STATE.player.z); scene.add(mesh);
  GRENADES.push({ mesh, x: mesh.position.x, y: mesh.position.y, z: mesh.position.z, vx: forward.x * 22, vy: forward.y * 22 + 6.5, vz: forward.z * 22, timer: 2.0 });
  updateHUD();
}


// ============================================================================
// LAYERED EXPLOSIONS (pooled): core flash + light, fireball sprites, smoke, debris, embers, shockwave, scorch
// ============================================================================
const FX = { ready: false };
function fxInit() {
  if (FX.ready) return; FX.ready = true;
  const mkFrames = (n, fn) => { const out = []; for (let f = 0; f < n; f++) { const c = document.createElement('canvas'); c.width = c.height = 64; fn(c.getContext('2d'), f / (n - 1)); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; out.push(t); } return out; };
  const puff = (x, t, cols, blobs, rough) => { x.clearRect(0, 0, 64, 64); for (let i = 0; i < blobs; i++) { const a = i * 2.39 + t * 3, r = (6 + t * 14) * Math.sqrt(i / blobs), cx = 32 + Math.cos(a) * r, cy = 32 + Math.sin(a) * r * 0.9, rr = (9 + rough * Math.sin(i * 7.1 + t * 9)) * (0.7 + t * 0.6); const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, cols[0]); g.addColorStop(0.5, cols[1]); g.addColorStop(1, cols[2]); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.fill(); } };
  FX.fire = mkFrames(12, (x, t) => { const k = 1 - t; puff(x, t, [`rgba(255,${Math.round(240 - t * 120)},${Math.round(180 * k)},${0.95 * k + 0.05})`, `rgba(255,${Math.round(140 - t * 80)},20,${0.7 * k})`, 'rgba(120,20,0,0)'], 14, 3); });
  FX.smoke = mkFrames(8, (x, t) => { puff(x, t, ['rgba(70,66,62,0.85)', 'rgba(45,42,40,0.5)', 'rgba(30,30,30,0)'], 12, 4); });
  const dot = document.createElement('canvas'); dot.width = dot.height = 32; { const x = dot.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.3, 'rgba(255,180,60,0.9)'); g.addColorStop(1, 'rgba(255,80,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); }
  FX.dot = new THREE.CanvasTexture(dot);
  const sc = document.createElement('canvas'); sc.width = sc.height = 128; { const x = sc.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.55, 'rgba(10,8,6,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(0,0,0,0.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(64, 64); const a = Math.random() * 6.28, r = 30 + Math.random() * 32; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); x.stroke(); } }
  FX.scorchTex = new THREE.CanvasTexture(sc);
  const N = IS_COARSE ? 90 : 240; FX.sprites = []; FX.parts = [];
  for (let i = 0; i < N; i++) { const m = new THREE.SpriteMaterial({ map: FX.fire[0], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }); const sp = new THREE.Sprite(m); sp.visible = false; sp.renderOrder = 3; scene.add(sp); FX.sprites.push(sp); }
  FX.debrisMats = [new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.8, roughness: 0.4 }), new THREE.MeshStandardMaterial({ color: 0x5a4632, metalness: 0.4, roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xff5a10, emissiveIntensity: 1.2 })];
  FX.debrisGeo = new THREE.BoxGeometry(1, 1, 1); FX.debris = [];
  for (let i = 0; i < (IS_COARSE ? 18 : 48); i++) { const m = new THREE.Mesh(FX.debrisGeo, FX.debrisMats[i % 3]); m.visible = false; m.castShadow = false; scene.add(m); FX.debris.push({ m, life: 0 }); }
  FX.rings = []; for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xffb070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.visible = false; scene.add(r); FX.rings.push({ m: r, life: 0 }); }
  FX.scorches = []; for (let i = 0; i < (IS_COARSE ? 8 : 16); i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: FX.scorchTex, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 })); d.rotation.x = -Math.PI / 2; d.visible = false; scene.add(d); FX.scorches.push({ m: d, life: 0 }); }
  FX.scorchI = 0;
  FX.lights = []; for (let i = 0; i < (IS_COARSE ? 1 : 3); i++) { const L = new RTLight(0xffa050, 0, 30, 2); scene.add(L); FX.lights.push({ L, life: 0, max: 1, peak: 0 }); }
}
function fxSprite() { for (const sp of FX.sprites) if (!sp.userData.busy) return sp; return null; }
function fxEmit(kind, x, y, z, o) {
  let sp = fxSprite();
  if (!sp && kind !== 'smoke') { const i = FX.parts.findIndex(q => q.kind === 'smoke'); if (i >= 0) { sp = FX.parts[i].sp; FX.parts.splice(i, 1); } }
  if (!sp) return null; sp.userData.busy = true; sp.visible = true; sp.position.set(x, y, z);
  const m = sp.material; m.blending = kind === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending; m.map = kind === 'smoke' ? FX.smoke[0] : kind === 'fire' ? FX.fire[0] : FX.dot; m.opacity = 1; m.rotation = Math.random() * 6.28; m.color.setHex(o.color || 0xffffff);
  const p = { sp, kind, life: o.life, max: o.life, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, s0: o.s0, s1: o.s1, grav: o.grav || 0, drag: o.drag || 0, op: o.op ?? 1, spin: (Math.random() - 0.5) * (o.spin || 1), floor: o.floor ?? -1e9, delay: o.delay || 0 };
  sp.scale.setScalar(p.s0); if (p.delay > 0) sp.visible = false; FX.parts.push(p); return p;
}
function fxLight(x, y, z, peak, life, color = 0xffa050) { let best = FX.lights[0]; for (const l of FX.lights) if (l.life <= 0) { best = l; break; } if (!best) return; best.L.position.set(x, y, z); best.L.color.setHex(color); best.peak = peak; best.life = best.max = life; best.L.distance = 14 + peak * 4; }
// explode: scale 1 = rocket; 0.5 small (drone); 2+ huge
function explode(x, y, z, opt = {}) {
  fxInit();
  const S = opt.scale || 1, lite = IS_COARSE;
  const gy = getGroundHeightAt(x, z, y + 0.5); const nearGround = y - gy < 1.4; const by = nearGround ? gy : y;
  const dist = Math.hypot(STATE.player.x - x, STATE.player.y + 1.4 - y, STATE.player.z - z);
  SFX.playBoom ? SFX.playBoom(S, dist) : SFX.playExplosion();
  STATE.screenShake = Math.max(STATE.screenShake, Math.min(1.2, S * 0.9 * Math.max(0, 1 - dist / (30 + S * 12))));
  fxLight(x, by + 1.2 * S, z, 7 * S, 0.45 + 0.15 * S);
  // 1) core flash
  fxEmit('dot', x, by + 0.6 * S, z, { life: 0.16, s0: 2.5 * S, s1: 6 * S, color: 0xfff6d8 });
  // 2) fireball (rises from the surface; never hangs: short-lived and shrinks into smoke)
  const nf = Math.round((lite ? 6 : 12) * Math.min(2, S));
  for (let i = 0; i < nf; i++) { const a = Math.random() * 6.28, r = Math.random() * 0.9 * S; fxEmit('fire', x + Math.cos(a) * r, by + (nearGround ? 0.35 * S + Math.random() * 0.7 * S : (Math.random() - 0.5) * S), z + Math.sin(a) * r, { life: 0.55 + Math.random() * 0.35, s0: 1.0 * S, s1: (2.6 + Math.random()) * S, vx: Math.cos(a) * 2.2 * S, vy: 1.6 * S + Math.random() * 1.4 * S, vz: Math.sin(a) * 2.2 * S, drag: 2.4, delay: Math.random() * 0.08 }); }
  // 3) billowing smoke
  const ns = Math.round((lite ? 4 : 9) * Math.min(2, S));
  for (let i = 0; i < ns; i++) { const a = Math.random() * 6.28, r = Math.random() * 1.2 * S; fxEmit('smoke', x + Math.cos(a) * r, by + 0.8 * S + Math.random() * S, z + Math.sin(a) * r, { life: 1.8 + Math.random() * 1.4, s0: 1.2 * S, s1: (4 + Math.random() * 2) * S, vx: Math.cos(a) * 0.8, vy: 1.3 + Math.random() * 1.2, vz: Math.sin(a) * 0.8, op: 0.75, drag: 0.6, delay: 0.12 + Math.random() * 0.25 }); }
  // 4) embers / sparks (gravity, die on the floor)
  const ne = Math.round((lite ? 10 : 26) * Math.min(2, S));
  for (let i = 0; i < ne; i++) { const a = Math.random() * 6.28, el = Math.random() * 1.2, sp = (6 + Math.random() * 10) * Math.sqrt(S); fxEmit('dot', x, by + 0.5 * S, z, { life: 0.8 + Math.random() * 0.9, s0: 0.22, s1: 0.06, vx: Math.cos(a) * Math.cos(el) * sp, vy: Math.sin(el) * sp + 2, vz: Math.sin(a) * Math.cos(el) * sp, grav: 18, floor: gy + 0.05, color: 0xffc070 }); }
  // 5) debris chunks with gravity + bounce
  let nd = Math.round((lite ? 4 : 9) * Math.min(2.2, S)) + (opt.debris || 0);
  for (const d of FX.debris) { if (nd <= 0) break; if (d.life > 0) continue; nd--; const sz = (0.06 + Math.random() * 0.16) * Math.min(1.5, Math.sqrt(S)); d.m.scale.set(sz * (1 + Math.random()), sz, sz * (0.6 + Math.random())); d.m.position.set(x, by + 0.6 * S, z); d.m.visible = true; if (opt.debrisMat) d.m.material = opt.debrisMat; else d.m.material = FX.debrisMats[(Math.random() * 3) | 0]; const a = Math.random() * 6.28; d.vx = Math.cos(a) * (3 + Math.random() * 8) * Math.sqrt(S); d.vz = Math.sin(a) * (3 + Math.random() * 8) * Math.sqrt(S); d.vy = 4 + Math.random() * 8 * Math.sqrt(S); d.rx = (Math.random() - 0.5) * 16; d.rz = (Math.random() - 0.5) * 16; d.life = 2.5 + Math.random() * 1.5; d.smokeT = 0; d.burning = Math.random() < 0.4; }
  // 6) shockwave ring on the ground
  if (nearGround) { const r = FX.rings.find(r => r.life <= 0); if (r) { r.m.position.set(x, gy + 0.08, z); r.m.visible = true; r.life = r.max = 0.45; r.R = 6 * S; } }
  // 7) scorch decal
  if (nearGround && !opt.noScorch) { const d = FX.scorches[FX.scorchI++ % FX.scorches.length]; d.m.position.set(x, gy + 0.03 + Math.random() * 0.01, z); d.m.scale.setScalar(3.2 * S); d.m.rotation.z = Math.random() * 6.28; d.m.visible = true; d.life = d.max = 25; }
}
// big multi-stage version for a colossus
function explodeColossal(C) {
  const P = C.root.position, H = C.height;
  for (let i = 0; i < (IS_COARSE ? 3 : 5); i++) setTimeout(() => { C.root.updateMatrixWorld(true); const v = new THREE.Vector3((Math.random() - 0.5) * 0.3, (0.3 + Math.random() * 0.6) * 2.5, (Math.random() - 0.5) * 0.3); C.root.children[0] && C.root.children[0].isGroup ? v.applyMatrix4(C.root.children[0].matrixWorld) : v.set(P.x, H * 0.5, P.z); explode(v.x, Math.max(0.5, v.y), v.z, { scale: 0.8 + Math.random() * 0.5, noScorch: true }); }, i * 300);
}
function fxUpdate(dt) {
  if (!FX.ready) return;
  for (let i = FX.parts.length - 1; i >= 0; i--) {
    const p = FX.parts[i];
    if (p.delay > 0) { p.delay -= dt; if (p.delay <= 0) p.sp.visible = true; continue; }
    p.life -= dt; const t = 1 - Math.max(0, p.life) / p.max;
    p.vy -= p.grav * dt; const k = Math.exp(-p.drag * dt); p.vx *= k; p.vz *= k; if (p.kind !== 'dot') p.vy *= k;
    const sp = p.sp; sp.position.x += p.vx * dt; sp.position.y += p.vy * dt; sp.position.z += p.vz * dt;
    if (sp.position.y < p.floor) { sp.position.y = p.floor; p.vy *= -0.25; p.vx *= 0.5; p.vz *= 0.5; }
    sp.scale.setScalar(p.s0 + (p.s1 - p.s0) * (p.kind === 'smoke' ? Math.sqrt(t) : t));
    sp.material.rotation += p.spin * dt;
    if (p.kind === 'fire') { sp.material.map = FX.fire[Math.min(FX.fire.length - 1, (t * FX.fire.length) | 0)]; sp.material.opacity = 1 - t * 0.4; }
    else if (p.kind === 'smoke') { sp.material.map = FX.smoke[Math.min(FX.smoke.length - 1, (t * FX.smoke.length) | 0)]; sp.material.opacity = p.op * Math.min(1, t * 5) * (1 - t); }
    else sp.material.opacity = 1 - t;
    if (p.life <= 0) { sp.visible = false; sp.userData.busy = false; FX.parts.splice(i, 1); }
  }
  for (const d of FX.debris) {
    if (d.life <= 0) continue; d.life -= dt; const m = d.m; d.vy -= 20 * dt; m.position.x += d.vx * dt; m.position.y += d.vy * dt; m.position.z += d.vz * dt;
    const fl = getGroundHeightAt(m.position.x, m.position.z, m.position.y) + m.scale.y * 0.5;
    if (collidesAt(m.position.x, m.position.z, 0.05) && m.position.y < 6) { d.vx *= -0.4; d.vz *= -0.4; }
    if (m.position.y < fl) { m.position.y = fl; if (Math.abs(d.vy) > 1.5) { d.vy = -d.vy * 0.35; d.vx *= 0.6; d.vz *= 0.6; d.rx *= 0.5; d.rz *= 0.5; } else { d.vy = 0; d.vx *= 0.85; d.vz *= 0.85; d.rx *= 0.8; d.rz *= 0.8; } }
    m.rotation.x += d.rx * dt; m.rotation.z += d.rz * dt;
    // burning chunks trail fire/smoke from where they actually are (they fall, the trail rises from them)
    if (d.burning && (d.smokeT -= dt) <= 0) { d.smokeT = IS_COARSE ? 0.18 : 0.08; fxEmit(d.life > 1.2 ? 'fire' : 'smoke', m.position.x, m.position.y + 0.1, m.position.z, { life: 0.45, s0: 0.3, s1: 0.8, vy: 0.8, op: 0.5 }); }
    if (d.life <= 0) m.visible = false;
  }
  for (const r of FX.rings) { if (r.life <= 0) continue; r.life -= dt; const t = 1 - r.life / r.max; r.m.scale.setScalar(0.5 + t * r.R); r.m.material.opacity = 0.7 * (1 - t); if (r.life <= 0) r.m.visible = false; }
  for (const d of FX.scorches) { if (d.life <= 0) continue; d.life -= dt; d.m.material.opacity = Math.min(0.85, d.life / 6); if (d.life <= 0) d.m.visible = false; }
  for (const l of FX.lights) { if (l.life <= 0) { l.L.intensity = 0; continue; } l.life -= dt; const t = 1 - l.life / l.max; l.L.intensity = l.peak * (t < 0.15 ? t / 0.15 : (1 - t) / 0.85) * (0.85 + Math.random() * 0.3); }
}

// ============================================================================
// SCORE + popups
// ============================================================================
const SCORE_POPS = [];
function addScore(n, label, worldPos, big = false) {
  STATE.score = (STATE.score || 0) + n; const el = document.getElementById('score-val'); if (el) el.textContent = String(STATE.score).padStart(6, '0');
  if (!worldPos) return;
  const d = document.createElement('div'); d.className = 'score-pop'; d.textContent = `+${n} ${label}`;
  d.style.cssText = `position:absolute;z-index:44;pointer-events:none;font-family:'Black Ops One','Chakra Petch',sans-serif;font-size:${big ? 30 : 18}px;color:${big ? '#ffd166' : '#ffb347'};text-shadow:0 0 10px rgba(255,120,0,.9),2px 2px 0 #3a1200;white-space:nowrap;transform:translate(-50%,-50%);letter-spacing:.06em;`;
  (document.getElementById('game-container') || document.body).appendChild(d);
  SCORE_POPS.push({ d, p: worldPos.clone(), t: 0, life: big ? 2.2 : 1.4 });
}
function updateScorePopups(dt) {
  const v = new THREE.Vector3();
  for (let i = SCORE_POPS.length - 1; i >= 0; i--) {
    const s = SCORE_POPS[i]; s.t += dt; s.p.y += dt * 1.6; v.copy(s.p).project(camera);
    const vis = v.z < 1; s.d.style.display = vis ? 'block' : 'none';
    s.d.style.left = ((v.x + 1) / 2 * window.innerWidth) + 'px'; s.d.style.top = ((1 - v.y) / 2 * window.innerHeight) + 'px'; s.d.style.opacity = String(Math.max(0, 1 - s.t / s.life)); s.d.style.transform = `translate(-50%,-50%) scale(${1 + Math.min(0.3, s.t)})`;
    if (s.t >= s.life) { s.d.remove(); SCORE_POPS.splice(i, 1); }
  }
}
function flashWeakPoint(text) {
  let el = document.getElementById('weak-marker');
  if (!el) { el = document.createElement('div'); el.id = 'weak-marker'; el.style.cssText = "position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:45;pointer-events:none;font-family:'Black Ops One',sans-serif;font-size:clamp(20px,3.4vw,38px);color:#ff9a1a;letter-spacing:.12em;text-shadow:0 0 14px rgba(255,110,0,.95),0 0 3px #fff,3px 3px 0 #2a0b00;opacity:0;transition:opacity .2s"; (document.getElementById('game-container') || document.body).appendChild(el); }
  el.textContent = text; el.style.opacity = '1'; clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = '0'; }, 700);
}
// ============================================================================
// COLOSSUS SOFT SPOTS (separate glowing hit meshes tracked to bones)
// ============================================================================
const SOFT_DEFS = [
  { key: 'core', label: 'POWER CORE', bone: /spine0?2|chest|upperchest|spine1/i, frac: [0, 0.66, 0.11], r: 0.07, mult: 4, hp: 0.22 },
  { key: 'eye', label: 'EYE SENSOR', bone: /^head$|head$/i, frac: [0, 0.9, 0.09], r: 0.045, mult: 3.5, hp: 0.1, off: [0, 0.02, 0.06] },
  { key: 'kneeL', label: 'KNEE HYDRAULIC', bone: /left.?leg$|leftleg|l.?calf|shin.?l/i, frac: [-0.09, 0.28, 0.05], r: 0.045, mult: 3, hp: 0.12, off: [0, 0, 0.04] },
  { key: 'kneeR', label: 'KNEE HYDRAULIC', bone: /right.?leg$|rightleg|r.?calf|shin.?r/i, frac: [0.09, 0.28, 0.05], r: 0.045, mult: 3, hp: 0.12, off: [0, 0, 0.04] },
  { key: 'elbowL', label: 'ELBOW JOINT', bone: /left.?fore.?arm$|lowerarm.?l/i, frac: [-0.22, 0.6, 0], r: 0.04, mult: 3, hp: 0.1 },
  { key: 'elbowR', label: 'ELBOW JOINT', bone: /right.?fore.?arm$|lowerarm.?r/i, frac: [0.22, 0.6, 0], r: 0.04, mult: 3, hp: 0.1 },
  { key: 'cell', label: 'CANNON CELL', cannon: true, frac: [0.3, 0.55, 0.1], r: 0.045, mult: 3.5, hp: 0.12 }
];
// ---------- Round 10: Sentinel falls, wreck persists and burns, Menders try to reboot it ----------
const WRECK_CFG = { burn: IS_COARSE ? 18 : 28, dispatch: IS_COARSE ? 13 : 9, redispatch: IS_COARSE ? 34 : 26, repairTime: IS_COARSE ? 24 : 18, maxDispatch: 2, riseHp: IS_COARSE ? 0.4 : 0.5 };
const WRECK_MAT = new THREE.MeshStandardMaterial({ color: 0x1c1915, metalness: 0.75, roughness: 0.8 });
const WRECK_MAT2 = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, metalness: 0.6, roughness: 0.9, emissive: 0x401204, emissiveIntensity: 0.5 });
function colossusHideParts(C) {
  C.charge = -1; if (C.cannon) C.cannon.visible = false; if (C.glow) C.glow.visible = false; if (C.glowLight) C.glowLight.intensity = 0; if (C.laser) C.laser.visible = false;
  (C.spots || []).forEach(s => { s.g.visible = false; (s.plates || []).forEach(p => { p.m.visible = false; }); });
  C.root.traverse(o => { if (o.isSprite && o.userData.wasVis === undefined) { o.userData.wasVis = o.visible; o.visible = false; } });
}
// after the twist pass: no limb may poke up out of the heap — untwist the offending bones (leaves first), then fold any rest-pose limb still sticking up down onto the hull
function wreckSettleBones(C) {
  const cap = C.thick * 2.1; const v = new THREE.Vector3(); C.root.updateMatrixWorld(true);
  const maxY = b => { let m = -1e9; b.traverse(o => { if (o.isBone) { o.getWorldPosition(v); m = Math.max(m, v.y); } }); return m; };
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let i = C.boneRest.length - 1; i >= 0; i--) { const r = C.boneRest[i]; if (maxY(r.b) > cap && !r.b.quaternion.equals(r.q)) { r.b.quaternion.copy(r.q); r.b.updateMatrixWorld(true); changed = true; } }
    if (!changed) break; C.root.updateMatrixWorld(true);
  }
  // residual: bend each offending bone toward the floor in small steps
  const tmp = new THREE.Quaternion(), axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)];
  for (let i = 0; i < C.boneRest.length; i++) {
    const b = C.boneRest[i].b; let y0 = maxY(b); if (y0 <= cap) continue;
    for (let it = 0; it < 24 && y0 > cap; it++) {
      let best = null, by = y0; const q0 = b.quaternion.clone();
      for (const ax of axes) for (const sg of [-1, 1]) { b.quaternion.copy(q0).multiply(tmp.setFromAxisAngle(ax, sg * 0.2)); b.updateMatrixWorld(true); const y = maxY(b); if (y < by) { by = y; best = b.quaternion.clone(); } }
      if (!best) { b.quaternion.copy(q0); b.updateMatrixWorld(true); break; } b.quaternion.copy(best); b.updateMatrixWorld(true); y0 = by;
    }
  }
  C.root.updateMatrixWorld(true);
}
function wreckBeginFall(C) {
  C.fall = { th: 0.04, w: 0.12, t: 0, landed: false, bounce: 0 };
  C.root.rotation.order = 'YXZ'; C.root.rotation.z = 0;
  // remember rest pose + materials so a reboot can restore them
  C.boneRest = []; C.matSave = [];
  C.root.traverse(o => {
    if (o.isBone) C.boneRest.push({ b: o, q: o.quaternion.clone() });
    if (o.isMesh && o.material && o.material.color && o !== C.plate) C.matSave.push({ m: o.material, c: o.material.color.clone(), e: o.material.emissive ? o.material.emissive.clone() : null, ei: o.material.emissiveIntensity || 0 });
  });
  if (C.plate) C.plate.visible = false;
  // snap yaw to the nearest axis (cover lines up with the room) and pick a fall direction with room to land
  const s = Math.round(C.root.rotation.y / (Math.PI / 2)) * (Math.PI / 2); C.fallYaw0 = C.root.rotation.y; C.fallYawS = s;
  const cs = Math.cos(s), sn = Math.sin(s); const P = C.root.position;
  const opts = [[0, -1], [1, 0], [-1, 0], [0, 1]];
  const awayX = P.x - STATE.player.x, awayZ = P.z - STATE.player.z;
  opts.sort((a, b) => { const wa = [a[0] * cs + a[1] * sn, -a[0] * sn + a[1] * cs], wb = [b[0] * cs + b[1] * sn, -b[0] * sn + b[1] * cs]; return (wb[0] * awayX + wb[1] * awayZ) - (wa[0] * awayX + wa[1] * awayZ); });
  let pick = opts[0];
  for (const o of opts) {
    const wx = o[0] * cs + o[1] * sn, wz = -o[0] * sn + o[1] * cs; let ok = true;
    for (let k = 1; k <= 8 && ok; k++) { const L = C.height * 0.95 * k / 8; if (collidesAt(P.x + wx * L, P.z + wz * L, C.rad * 0.6)) ok = false; }
    if (ok) { pick = o; break; }
  }
  C.fallLocal = pick; C.fallDir = new THREE.Vector2(pick[0] * cs + pick[1] * sn, -pick[0] * sn + pick[1] * cs);
  C.thick = Math.max(0.5, C.rad * 0.55);
  // creak: low groan as it starts to go
  try { SFX.playBoom && SFX.playBoom(0.5, 30); } catch (e) {}
}
function wreckApplyTilt(C, th) {
  const [lx, lz] = C.fallLocal; C.root.rotation.x = lz ? lz * th : 0; C.root.rotation.z = lx ? -lx * th : 0;
}
function wreckSlam(C) {
  const P = C.root.position, H = C.height, d = C.fallDir; const pd = Math.hypot(STATE.player.x - (P.x + d.x * H * 0.5), STATE.player.z - (P.z + d.y * H * 0.5));
  const k = C.isMini ? 0.6 : 1;
  STATE.screenShake = Math.max(STATE.screenShake, Math.min(1.6, (0.35 + 1.5 * Math.max(0, 1 - pd / 70)) * k + 0.15));
  STATE.lightFlickerT = 2.6 * k + 0.6;
  try { SFX.playBoom ? SFX.playBoom(2.6 * k + 0.6, pd * 0.5) : SFX.playExplosion(); } catch (e) {}
  fxInit();
  const n = IS_COARSE ? 5 : 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = P.x + d.x * H * 0.95 * t, z = P.z + d.y * H * 0.95 * t;
    for (let j = 0; j < (IS_COARSE ? 1 : 3); j++) { const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 6; fxEmit('smoke', x, 0.3, z, { life: 1.8 + Math.random() * 0.6, s0: 0.8, s1: 3.5 + H * 0.08, vx: Math.cos(a) * sp, vy: 0.6 + Math.random(), vz: Math.sin(a) * sp, drag: 1.8, op: 0.55, color: 0x9a8c78 }); }
  }
  explode(P.x + d.x * H * 0.6, 0.3, P.z + d.y * H * 0.6, { scale: Math.min(2.6, 1 + H / 18), debris: IS_COARSE ? 6 : 12, debrisMat: WRECK_MAT });
  if (!IS_COARSE) explode(P.x + d.x * H * 0.25, 0.3, P.z + d.y * H * 0.25, { scale: 1.1, noScorch: true });
  if (pd < H * 0.35) damagePlayer(Math.round(20 * k));
  BOTS.forEach(b => { if (!b.dying && segPointDist(P.x, 0, P.z, P.x + d.x * H, 0, P.z + d.y * H, new THREE.Vector3(b.x, 0, b.z)) < C.thick + 1.2) damageBot(b, 200); });
  try { spawnShockwave(P.x + d.x * H * 0.5, P.z + d.y * H * 0.5, C.isMini ? 22 : 38, k); } catch (e) {}
  addKillFeed(`${C.isMini ? 'Mini Colossus' : 'Moses Colossus'} hits the floor`);
}
function wreckBuild(C) {
  // twist it: bend every bone a little, harder at the extremities
  C.boneRest.forEach((r, i) => { const a = 0.25 + Math.random() * 0.45; r.b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, (Math.random() - 0.5) * a))); });
  C.root.scale.set(1.04, 0.86, 1.0); // crushed
  try { wreckSettleBones(C); } catch (e) {}
  // persistent scattered scrap
  C.scrap = C.scrap || [];
  if (!C.scrap.length) {
    const P = C.root.position, d = C.fallDir, H = C.height; const nS = IS_COARSE ? 6 : 11;
    for (let i = 0; i < nS; i++) {
      const s = (0.25 + Math.random() * 0.5) * Math.max(1, H / 14);
      const g = i % 3 === 0 ? new THREE.TorusGeometry(s, s * 0.22, 5, 8, Math.PI * (0.6 + Math.random())) : i % 3 === 1 ? new THREE.DodecahedronGeometry(s * 0.7, 0) : new THREE.BoxGeometry(s * 1.8, s * 0.18, s * 0.8);
      const m = new THREE.Mesh(g, i % 2 ? WRECK_MAT : WRECK_MAT2); const t = Math.random() * 1.05, side = (Math.random() - 0.5) * 2 * (C.thick * 2.5 + 1.5);
      m.position.set(P.x + d.x * H * t + d.y * side, s * 0.3, P.z + d.y * H * t - d.x * side); m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); m.castShadow = true;
      arenaGroup.add(m); C.scrap.push(m);
    }
  }
  // collidable cover along the body
  const P = C.root.position, d = C.fallDir, H = C.height, w = C.thick * 1.6 + 0.4;
  const x1 = P.x + d.x * H * 0.92, z1 = P.z + d.y * H * 0.92;
  C.wreckCol = { minX: Math.min(P.x, x1) - w, maxX: Math.max(P.x, x1) + w, minY: 0, maxY: C.thick * 2.4, minZ: Math.min(P.z, z1) - w, maxZ: Math.max(P.z, z1) + w, wreck: true };
  colliders.push(C.wreckCol); try { buildNavGrid(); } catch (e) {}
  C.burnT = WRECK_CFG.burn; C.charT = 0; C.dispatchT = WRECK_CFG.dispatch; C.repair = 0; C.dispatches = C.dispatches || 0;
}
function wreckCenter(C, t = 0.45, out = new THREE.Vector3()) { const P = C.root.position; return out.set(P.x + C.fallDir.x * C.height * t, C.thick, P.z + C.fallDir.y * C.height * t); }
function wreckWeldPoint(C, fromX, fromZ) {
  const c = wreckCenter(C, 0.42); const px = C.fallDir.y, pz = -C.fallDir.x; const s = ((fromX - c.x) * px + (fromZ - c.z) * pz) >= 0 ? 1 : -1;
  const off = C.thick * 1.6 + 0.4 + 1.5; return { x: c.x + px * off * s, z: c.z + pz * off * s, cx: c.x, cz: c.z };
}
function wreckDispatch(C) {
  if (STATE.floorCleared || C.rebuilds >= 1 || C.dispatches >= WRECK_CFG.maxDispatch) return;
  C.dispatches++;
  const c = wreckCenter(C);
  let m = BOTS.filter(b => b.isMender && !b.dying && !b.repairC && Math.hypot(b.x - c.x, b.z - c.z) < 45).sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z))[0];
  if (!m) {
    let best = null;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, r = 16 + (i % 3) * 4; const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      if (collidesAt(x, z, 1.2)) continue; const pd = Math.hypot(x - STATE.player.x, z - STATE.player.z); if (pd < 12) continue;
      if (!best || pd > best.pd) best = { x, z, pd };
    }
    if (!best) best = { x: c.x + C.fallDir.y * 8, z: c.z - C.fallDir.x * 8 };
    m = spawnMender(best.x, best.z, 20 + C.dispatches + COLOSSI.indexOf(C) * 3, IS_COARSE ? 0.7 : 0.85);
    fxInit(); for (let j = 0; j < 8; j++) fxEmit('smoke', best.x, 0.5, best.z, { life: 1.4, s0: 0.6, s1: 2.2, vy: 1, op: 0.5 });
  }
  m.repairC = C; C.repairer = m; m.repathT = 0;
  menderDispatchCue();
  addKillFeed(`SENTINEL CONTROL: ${m.name} assigned · REBOOT ${C.isMini ? 'MINI COLOSSUS' : 'MOSES COLOSSUS'}`);
  showBanner('⚠ SENTINEL REPAIR INBOUND', 'A Mender is coming to weld the wreck back together. Kill it or EMP it to deny the reboot.', 3500);
}
function wreckDeny(C, why) {
  const pos = wreckCenter(C).setY(C.thick + 2.5);
  if (C.repairer) { C.repairer.repairC = null; C.repairer = null; }
  const had = C.repair > 0.02; C.repair = 0;
  if (had) {
    if (!C.denied) { C.denied = true; addScore(750, 'REPAIR DENIED', pos, true); } else addScore(150, 'REPAIR DENIED', pos);
    addKillFeed(`REPAIR DENIED (${why})`); SFX.playWeakPoint && SFX.playWeakPoint(true);
  }
  C.dispatchT = WRECK_CFG.redispatch;
}
function wreckRise(C) {
  C.rising = { t: 0, th0: C.fall.th }; if (C.repairer) { C.repairer.repairC = null; C.repairer = null; }
  colliders = colliders.filter(c => c !== C.wreckCol); C.wreckCol = null;
  C.boneRest.forEach(r => r.b.quaternion.copy(r.q)); C.root.scale.set(1, 1, 1);
  C.matSave.forEach(s => { if (s.m.userData.rimC) s.m.userData.rimC.copy(s.m.userData.rimC0); s.m.color.copy(s.c); if (s.e && s.m.emissive) s.m.emissive.copy(s.e); s.m.emissiveIntensity = s.ei; });
  showBanner('⚠ SENTINEL REBOOTED', `${C.isMini ? 'Mini Colossus' : 'Moses Colossus'} is back on its feet. Weak points re-armed.`, 3800);
  SFX.playRadioChatter('Asset restored. Uptime nominal. Resume compliance enforcement.', 'SENTINEL CONTROL');
  try { colossusChargeSfx(C.isMini); } catch (e) {}
}
function wreckFinishRise(C) {
  C.rising = null; C.fall = null; C.dead = false; C.rebuilt = true; C.rebuilds = (C.rebuilds || 0) + 1;
  C.hp = Math.round(C.maxHp * WRECK_CFG.riseHp); C.stun = 0; C.charge = -1; C.cool = 3; C.cannonDisabled = false; C.turnMult = 1; C.rateMult = 1; C.limp = 0;
  C.root.rotation.x = 0; C.root.rotation.z = 0; C.root.position.y = 0; if (C.plate) C.plate.visible = true;
  C.root.traverse(o => { if (o.isSprite && o.userData.wasVis !== undefined) { o.visible = o.userData.wasVis; delete o.userData.wasVis; } }); if (C.cannon) C.cannon.visible = true;
  if (C.eye) C.eye.intensity = C.isMini ? 1.6 : 2.5;
  (C.spots || []).forEach(sp => { sp.dead = false; sp.hp = sp.maxHp; sp.g.visible = true; if (sp.plates) sp.plates.forEach(p => scene.add(p.m)); });
  colliders.push(C.col); try { buildNavGrid(); } catch (e) {}
  C.engaged = 8; C.alerted = true;
}
function repairHud(C) {
  let el = document.getElementById('repair-hud');
  if (!el) {
    el = document.createElement('div'); el.id = 'repair-hud';
    el.style.cssText = "position:absolute;left:50%;top:21%;transform:translateX(-50%);z-index:43;pointer-events:none;font-family:'Chakra Petch',sans-serif;text-align:center;color:#ffd2c0;letter-spacing:.12em;font-size:clamp(10px,1.5vw,16px);display:none";
    el.innerHTML = '<div id="repair-hud-t" style="text-shadow:0 0 10px #ff2a10">⚠ SENTINEL REBOOTING</div><div style="width:clamp(160px,26vw,320px);height:10px;margin:4px auto 0;border:2px solid #ff3b1a;background:rgba(40,4,2,.85)"><div id="repair-hud-bar" style="height:100%;width:0;background:linear-gradient(90deg,#ff6a00,#ffd000)"></div></div><div id="repair-hud-n" style="font-size:.75em;margin-top:3px;color:#ffb38a">KILL OR EMP THE MENDER</div>';
    (document.getElementById('game-container') || document.body).appendChild(el);
  }
  if (!C) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  document.getElementById('repair-hud-t').textContent = `⚠ SENTINEL REBOOTING · ${Math.floor(C.repair * 100)}%`;
  document.getElementById('repair-hud-bar').style.width = `${Math.min(100, C.repair * 100)}%`;
  document.getElementById('repair-hud-t').style.opacity = (Math.sin(performance.now() * 0.012) > -0.3) ? 1 : 0.45;
}
function updateWreck(C, dt, now) {
  if (!C.fall) wreckBeginFall(C);
  const F = C.fall, P = C.root.position;
  if (C.rising) {
    const R = C.rising; R.t += dt; const t = Math.min(1, R.t / 2.6); const e = t * t * (3 - 2 * t);
    const th = R.th0 * (1 - e); wreckApplyTilt(C, th); P.y = C.thick * Math.sin(th);
    if (Math.random() < dt * 20) { fxInit(); const c = wreckCenter(C, Math.random() * 0.9); fxEmit('dot', c.x, c.y, c.z, { life: 0.5, s0: 0.25, s1: 0.05, vx: (Math.random() - 0.5) * 8, vy: Math.random() * 6, vz: (Math.random() - 0.5) * 8, grav: 18, floor: 0.05, color: 0x9fd0ff }); }
    if (t >= 1) wreckFinishRise(C);
    return;
  }
  if (!F.landed) {
    F.t += dt;
    if (F.t < 0.7) { // knees buckle, yaw settles onto the axis
      C.root.rotation.y = C.fallYaw0 + (C.fallYawS - C.fallYaw0) * (F.t / 0.7); P.y = -C.height * 0.04 * (F.t / 0.7);
      C.root.rotation.x = C.root.rotation.z = 0; return;
    }
    C.root.rotation.y = C.fallYawS;
    const g = 9.8 * 1.5 / (C.height * 0.5) * 1.6; F.w += g * Math.sin(F.th) * dt + 0.15 * dt; F.th += F.w * dt;
    const lim = Math.PI / 2 - 0.06;
    if (F.th >= lim) { F.th = lim; if (F.bounce === 0) { wreckSlam(C); F.bounce = 1; F.w = -F.w * 0.12; } else { F.landed = true; F.w = 0; wreckBuild(C); } }
    wreckApplyTilt(C, F.th); P.y = -C.height * 0.04 * Math.cos(F.th) + C.thick * Math.sin(F.th);
    if (Math.random() < dt * 14) { fxInit(); const c = new THREE.Vector3(); C.root.updateMatrixWorld(true); c.set(0, C.height * 0.3 * Math.random() / (C.root.scale.y || 1), 0).applyMatrix4(C.root.matrixWorld); fxEmit('smoke', c.x, Math.max(0.5, c.y), c.z, { life: 1.6, s0: 0.8, s1: 2.5, vy: 1.2, op: 0.5 }); }
    return;
  }
  // ---- wreck: burn, char, smoulder ----
  fxInit();
  if (C.burnT > 0) {
    C.burnT -= dt; const k = Math.max(0.25, C.burnT / WRECK_CFG.burn);
    if ((C.fireT = (C.fireT || 0) - dt) <= 0) {
      C.fireT = (IS_COARSE ? 0.13 : 0.06) / k;
      const c = wreckCenter(C, 0.05 + Math.random() * 0.9); const sx = (Math.random() - 0.5) * C.thick * 2;
      const x = c.x + C.fallDir.y * sx, z = c.z - C.fallDir.x * sx, y = 0.15 + Math.random() * C.thick * 1.4;
      fxEmit('fire', x, y, z, { life: 0.8 + Math.random() * 0.5, s0: 0.9 + C.thick * 0.6, s1: 2.4 + C.thick * 1.1, vy: 2.6, drag: 1.2 }); if (!IS_COARSE && Math.random() < 0.5) fxEmit('fire', x, 0.2, z, { life: 0.9, s0: 0.8, s1: 1.8, vy: 1.4, drag: 1 });
      if (Math.random() < 0.35) fxEmit('smoke', x, y + 1, z, { life: 2.2, s0: 1, s1: 3.5 + C.height * 0.08, vy: 2.4, op: 0.55, color: 0x2a2622 });
      if (Math.random() < 0.4) fxEmit('dot', x, y, z, { life: 0.9, s0: 0.1, s1: 0.03, vx: (Math.random() - 0.5) * 2.5, vy: 2 + Math.random() * 2.5, vz: (Math.random() - 0.5) * 2.5, grav: 9, floor: 0.05, color: 0xffa040 });
    }
    if (!C.fireLight) { C.fireLight = new RTLight(0xff7a2a, 0, 26, 2); arenaGroup.add(C.fireLight); }
    const c0 = wreckCenter(C, 0.45); C.fireLight.position.set(c0.x, C.thick * 2 + 1, c0.z); C.fireLight.intensity = 3.2 * k * (0.75 + Math.random() * 0.25);
  } else {
    if (C.fireLight) C.fireLight.intensity = 0;
    if ((C.fireT = (C.fireT || 0) - dt) <= 0) { C.fireT = IS_COARSE ? 0.9 : 0.45; const c = wreckCenter(C, Math.random()); fxEmit('smoke', c.x, C.thick, c.z, { life: 3.5, s0: 0.6, s1: 2.6, vy: 1.2, op: 0.35, color: 0x2a2622 }); if (Math.random() < 0.3) fxEmit('dot', c.x, C.thick, c.z, { life: 0.5, s0: 0.2, s1: 0.04, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 4, vz: (Math.random() - 0.5) * 6, grav: 18, floor: 0.05, color: 0xffd080 }); }
  }
  // char the hull: colours sink to blackened metal with a hot ember glow that cools
  if (C.charT < 1) {
    C.charT = Math.min(1, C.charT + dt / Math.max(4, WRECK_CFG.burn * 0.6));
    const dark = new THREE.Color(0x14110e), hot = new THREE.Color(0xff4a10);
    C.matSave.forEach(s => { s.m.color.copy(s.c).lerp(dark, Math.min(0.92, C.charT * 1.4)); if (s.m.emissive) { s.m.emissive.copy(hot); s.m.emissiveIntensity = 0.55 * (1 - C.charT); } if (s.m.metalness !== undefined) s.m.roughness = 0.6 + 0.35 * C.charT; if (s.m.userData.rimC) s.m.userData.rimC.copy(s.m.userData.rimC0).multiplyScalar(Math.max(0.12, 1 - C.charT)); });
  }
  // ---- Sentinel Control: dispatch / repair / deny ----
  if (C.repairer && (C.repairer.dying || BOTS.indexOf(C.repairer) < 0)) wreckDeny(C, 'Mender destroyed');
  if (!C.repairer) { if (!STATE.floorCleared && (C.rebuilds || 0) < 1 && C.dispatches < WRECK_CFG.maxDispatch && STATE.running) { C.dispatchT -= dt; if (C.dispatchT <= 0) wreckDispatch(C); } return; }
  if (C.repair >= 1) wreckRise(C);
}
// Mender side: drive to the wreck and weld. Returns true when it handled this frame's goal.
function menderWreckGoal(b) {
  const C = b.repairC; if (!C || !C.dead || C.rising || !C.fall || !C.fall.landed) return null;
  const pd = Math.hypot(STATE.player.x - b.x, STATE.player.z - b.z); if (pd < 3.2) return null; // defend itself up close
  return wreckWeldPoint(C, b.x, b.z);
}
function menderWeld(b, w, dt) {
  const C = b.repairC; C.repair = Math.min(1, C.repair + dt / WRECK_CFG.repairTime);
  if ((b.repairT -= dt) <= 0) {
    b.repairT = IS_COARSE ? 0.12 : 0.06; fxInit();
    const x = w.cx + (b.x - w.cx) * 0.55, z = w.cz + (b.z - w.cz) * 0.55, y = C.thick * 1.2;
    for (let i = 0; i < (IS_COARSE ? 2 : 4); i++) fxEmit('dot', x, y, z, { life: 0.45 + Math.random() * 0.3, s0: 0.2, s1: 0.04, vx: (Math.random() - 0.5) * 8, vy: Math.random() * 5, vz: (Math.random() - 0.5) * 8, grav: 20, floor: 0.05, color: Math.random() < 0.5 ? 0x9fd0ff : 0xffe2a0 });
    if (Math.random() < 0.3) spawnImpact(x, y, z, 0x6fc8ff);
  }
}
function updateWrecksHud() { repairHud(COLOSSI.find(C => C.dead && C.repairer && C.repair > 0 && !C.rising) || null); }

function initSoftSpots(C) {
  const bones = []; C.root.traverse(o => { if (o.isBone) bones.push(o); });
  C.spots = []; C.turnMult = 1; C.rateMult = 1; C.limp = 0;
  const H = C.height;
  SOFT_DEFS.forEach(d => {
    const bone = d.bone ? bones.find(b => d.bone.test(b.name)) : null;
    const col = d.key === 'core' ? 0xff6a00 : d.key === 'eye' ? 0xff2200 : d.key === 'cell' ? 0x00b4ff : 0xff8c00;
    const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1, fog: false });
    const g = new THREE.Group();
    const orb = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat); g.add(orb);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 10), new THREE.MeshBasicMaterial({ color: col, fog: false, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })); halo.material.opacity = 0.14; g.add(halo);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(ring);
    const R = d.r * H; g.scale.setScalar(R * 0.38); g.renderOrder = 4; scene.add(g);
    const sp = { def: d, key: d.key, bone, g, orb, halo, ring, mat, R, hp: Math.round(C.maxHp * d.hp), maxHp: Math.round(C.maxHp * d.hp), dead: false, fxT: 0, pos: new THREE.Vector3() };
    if (d.key === 'core') {
      const pm = new THREE.MeshStandardMaterial({ color: 0x3a3330, metalness: 0.85, roughness: 0.35 });
      sp.plates = [-1, 1].map(sd => { const pl = new THREE.Mesh(new THREE.BoxGeometry(R * 0.95, R * 1.7, R * 0.22), pm); scene.add(pl); return { m: pl, sd }; });
      sp.open = 0;
    }
    C.spots.push(sp);
  });
}
function softSpotWorld(C, sp, out) {
  const d = sp.def, H = C.height, yaw = C.root.rotation.y, cs = Math.cos(yaw), sn = Math.sin(yaw);
  const local = (lx, ly, lz) => out.set(C.root.position.x + lx * cs + lz * sn, C.root.position.y + ly, C.root.position.z - lx * sn + lz * cs);
  if (d.cannon && C.cannon) { C.cannon.updateMatrixWorld(true); out.set(0, 0, 0).applyMatrix4(C.cannon.matrixWorld); out.y += H * 0.02; return out; }
  if (sp.bone) { sp.bone.getWorldPosition(out); const o = d.off || [0, 0, 0]; const fw = (d.frac[2] * (C.ownCannon ? 0.35 : 0.7) + o[2]) * H; out.x += sn * fw; out.z += cs * fw; out.y += o[1] * H; return out; }
  return local(d.frac[0] * H, d.frac[1] * H, d.frac[2] * H);
}
function updateSoftSpots(dt, now) {
  COLOSSI.forEach(C => {
    if (!C.spots) return;
    const stunned = C.stun > 0;
    C.spots.forEach(sp => {
      const vis = !C.dead && C.root.visible; sp.g.visible = vis && !sp.dead; if (sp.plates) sp.plates.forEach(p => p.m.visible = vis && !C.ownCannon); // Round 21: procedural core plates float off the Meshy body
      if (!vis) return;
      softSpotWorld(C, sp, sp.pos); { const minY = C.root.position.y + sp.R * 0.4 + 0.08; if (sp.pos.y < minY) sp.pos.y = minY; } sp.g.position.copy(sp.pos); // Round 21: keep foot spots above the floor (was a half-buried dome) sp.g.rotation.y = C.root.rotation.y; sp.ring.rotation.x = now * 0.004;
      const pulse = 0.6 + 0.4 * Math.sin(now * 0.008 + sp.R);
      const glow = stunned ? 1.0 : 0.75 + pulse * 0.25; sp.mat.opacity = glow; sp.halo.material.opacity = (stunned ? 0.5 : 0.18) * (0.7 + pulse * 0.3);
      const sk = C.ownCannon ? (stunned ? 0.5 : 0.3) : (stunned ? 0.85 : 0.6); sp.g.scale.setScalar(sp.R * sk * (1 + (sp.hitFlash || 0) * 0.6)); if (C.ownCannon) { sp.ring.visible = false; sp.halo.material.opacity *= 0.6; } // Round 21: Meshy Colossus: per-frame scale used to undo the init shrink (big floating discs) sp.hitFlash = Math.max(0, (sp.hitFlash || 0) - dt * 5);
      if (sp.plates) {
        sp.open += ((stunned ? 1 : 0) - sp.open) * Math.min(1, dt * 6);
        const yaw = C.root.rotation.y, cs = Math.cos(yaw), sn = Math.sin(yaw);
        sp.plates.forEach(p => { const lx = p.sd * sp.R * (0.5 + sp.open * 1.1), lz = sp.R * 0.9; p.m.position.set(sp.pos.x + lx * cs + lz * sn, sp.pos.y, sp.pos.z - lx * sn + lz * cs); p.m.rotation.y = yaw + p.sd * sp.open * 0.9; });
      }
      if (sp.dead && !C.dead) { // destroyed: smoke + sparks keep pouring out
        sp.fxT -= dt; if (sp.fxT <= 0) { sp.fxT = IS_COARSE ? 0.12 : 0.05; fxInit(); fxEmit('smoke', sp.pos.x, sp.pos.y, sp.pos.z, { life: 1.6, s0: sp.R * 0.6, s1: sp.R * 3, vy: 1.5, op: 0.6 }); if (Math.random() < 0.5) fxEmit('dot', sp.pos.x, sp.pos.y, sp.pos.z, { life: 0.6, s0: 0.18, s1: 0.04, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 4, vz: (Math.random() - 0.5) * 6, grav: 18, floor: 0.05, color: 0xffd080 }); }
      }
    });
    // limp: a destroyed knee makes it lurch
    if (C.limp > 0 && !C.dead) C.root.rotation.z = Math.sin(now * 0.004) * 0.035 * C.limp;
  });
}
function segPointDist(ax, ay, az, bx, by, bz, p) {
  const dx = bx - ax, dy = by - ay, dz = bz - az; const L2 = dx * dx + dy * dy + dz * dz || 1e-6;
  let t = ((p.x - ax) * dx + (p.y - ay) * dy + (p.z - az) * dz) / L2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(ax + dx * t - p.x, ay + dy * t - p.y, az + dz * t - p.z);
}
function weakPointHit(p, x0, y0, z0) {
  for (const C of COLOSSI) {
    if (C.dead || !C.spots) continue;
    if (Math.hypot(p.x - C.root.position.x, p.z - C.root.position.z) > C.rad + C.height * 0.5) continue;
    for (const sp of C.spots) {
      if (sp.dead) continue;
      if (segPointDist(x0, y0, z0, p.x, p.y, p.z, sp.pos) > sp.R * (C.stun > 0 ? 1.1 : 0.9)) continue;
      const stun = C.stun > 0; const crit = sp.key === 'core' && stun;
      let dmg = p.damage * (p.splash > 0 ? 1.4 : sp.def.mult) * (stun ? 1.5 : 1) * (crit ? 2 : 1);
      dmg = Math.round(dmg);
      C.hp -= dmg; sp.hp -= dmg; sp.hitFlash = 1; C.engaged = 6; C.lastHitKey = sp.key;
      SFX.playWeakPoint(crit); flashWeakPoint(crit ? 'CRITICAL!' : 'WEAK POINT');
      fxInit(); for (let i = 0; i < (IS_COARSE ? 6 : 14); i++) fxEmit('dot', p.x, p.y, p.z, { life: 0.35 + Math.random() * 0.3, s0: 0.3, s1: 0.05, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.2) * 10, vz: (Math.random() - 0.5) * 12, grav: 20, floor: 0.05, color: 0xffb040 });
      spawnImpact(p.x, p.y, p.z, 0xff8a1a);
      const hm = document.getElementById('hitmarker'); hm.classList.add('active'); clearTimeout(hm._t); hm._t = setTimeout(() => hm.classList.remove('active'), 140);
      addScore(crit ? 100 : 50, crit ? 'CRITICAL' : 'HIT', null);
      if (sp.hp <= 0) destroySoftSpot(C, sp);
      if (p.splash > 0) triggerExplosion(p.x, p.y, p.z, p.splash * 0.6, p.damage * 0.5);
      if (C.hp <= 0) killColossus(C);
      return true;
    }
  }
  return false;
}
function destroySoftSpot(C, sp) {
  if (sp.dead) return; sp.dead = true; sp.g.visible = false;
  explode(sp.pos.x, sp.pos.y, sp.pos.z, { scale: Math.max(0.5, C.height / 30), noScorch: true });
  addScore(C.rebuilt ? 100 : 500, 'WEAK POINT', sp.pos.clone());
  addKillFeed(`${C.isMini ? 'Mini Colossus' : 'Moses Colossus'}: ${sp.def.label} destroyed`);
  if (sp.key === 'kneeL' || sp.key === 'kneeR') { C.turnMult *= 0.55; C.limp += 1; }
  if (sp.key === 'elbowL' || sp.key === 'elbowR') { C.turnMult *= 0.8; C.rateMult *= 1.25; }
  if (sp.key === 'eye') { C.rateMult *= 1.5; if (C.eye) C.eye.color.setHex(0x331100); }
  if (sp.key === 'cell') { C.cannonDisabled = true; C.charge = -1; if (C.laser) C.laser.visible = false; C.glow.visible = false; C.glowLight.intensity = 0; showBanner('CANNON CELL DESTROYED', 'Its arm cannon is offline.', 2200); }
  if (sp.key === 'core') { C.hp -= Math.round(C.maxHp * 0.15); }
}
// ============================================================================
// EXPLOSIVE BARRELS
// ============================================================================
let EX_BARRELS = [];
function spawnExplosiveBarrels(n) {
  EX_BARRELS = [];
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x8a1a12).convertSRGBToLinear(), metalness: 0.5, roughness: 0.5 });
  const stripe = new THREE.MeshBasicMaterial({ color: 0xffb020 });
  for (let k = 0, tries = 0; k < n && tries < 200; tries++) {
    const x = (Math.random() - 0.5) * 150, z = -70 + Math.random() * 100; if (collidesAt(x, z, 1.4) || Math.hypot(x, z) < 16) continue;
    const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 14), mat); b.position.y = 0.55; g.add(b);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 14), stripe); st.position.y = 0.75; g.add(st);
    g.position.set(x, 0, z); arenaGroup.add(g); const col = { minX: x - 0.45, maxX: x + 0.45, minY: 0, maxY: 1.1, minZ: z - 0.45, maxZ: z + 0.45 }; colliders.push(col);
    EX_BARRELS.push({ g, x, z, col, dead: false }); k++;
  }
}
function explodeBarrel(b) {
  if (b.dead) return; b.dead = true; arenaGroup.remove(b.g); colliders = colliders.filter(c => c !== b.col);
  setTimeout(() => triggerExplosion(b.x, 0.5, b.z, 8, 120), 60);
}
function barrelHit(p) {
  for (const b of EX_BARRELS) { if (!b.dead && p.y < 1.25 && Math.hypot(p.x - b.x, p.z - b.z) < 0.6) { explodeBarrel(b); return true; } }
  return false;
}
// ============================================================================
// DRONES — Triage "Watchers": hover, strafe, circle, dodge, shoot; kamikaze variant; scan cones; EMP drops them
// ============================================================================
let DRONES = [];
function buildDroneMesh(kami) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: kami ? 0x4a2a14 : 0x2a2e36, metalness: 0.85, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), shell); body.scale.set(1, 0.62, 1); g.add(body);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 24), new THREE.MeshBasicMaterial({ color: kami ? 0xffa020 : 0x38c8ff })); band.rotation.x = Math.PI / 2; g.add(band);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff1a0a })); eye.position.set(0, -0.04, 0.3); g.add(eye);
  const rotors = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4; const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.42), shell); arm.position.set(Math.sin(a) * 0.38, 0.04, Math.cos(a) * 0.38); arm.rotation.y = a; g.add(arm);
    const rotor = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: 0x9aa4b0, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })); rotor.rotation.x = -Math.PI / 2; rotor.position.set(Math.sin(a) * 0.58, 0.1, Math.cos(a) * 0.58); g.add(rotor); rotors.push(rotor);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.01, 0.03), shell); blade.position.copy(rotor.position); g.add(blade); rotors.push(blade);
  }
  if (kami) { const charge = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0x8a1a12, emissive: 0xff2a10, emissiveIntensity: 0.8 })); charge.position.y = -0.26; g.add(charge); }
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xff2010, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 9, 18, 1, true), coneMat); cone.rotation.x = -Math.PI / 2; cone.position.set(0, 0, 4.8);
  const pivot = new THREE.Group(); pivot.position.copy(eye.position); pivot.rotation.x = 0.35; pivot.add(cone); g.add(pivot);
  // Round 19: CC-BY 'Bot Drone' (Dave404) shell over the procedural core; keep eye/band/cone for gameplay readability
  const dm = cloneProp('bot_drone'); if (dm) { body.visible = false; g.children.forEach(o => { if (o.geometry && o.geometry.type === 'BoxGeometry') o.visible = false; }); rotors.forEach(r => r.visible = false); dm.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); if (kami && o.material.color) o.material.color.lerp(new THREE.Color(0x8a3a10), 0.45); } }); dm.position.y = -0.42; g.add(dm); band.scale.setScalar(1.15); }
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return { g, eye, rotors, cone, coneMat, pivot, band };
}
// ---------- drone audio: pooled positional rotor hums (capped), scan chirp, dive whine, crash sputter ----------
const DRONE_AUDIO = { voices: [], max: IS_COARSE ? 2 : 4, ready: false };
function droneAudioInit() {
  if (DRONE_AUDIO.ready || SFX.muted) return; try { SFX.init(); } catch (e) { return; } const ctx = SFX.ctx; if (!ctx) return;
  for (let i = 0; i < DRONE_AUDIO.max; i++) {
    const a = ctx.createOscillator(), b = ctx.createOscillator(), w = ctx.createOscillator(); a.type = 'sawtooth'; b.type = 'square'; w.type = 'sine';
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.value = 900;
    const am = ctx.createOscillator(), amg = ctx.createGain(); am.frequency.value = 38; amg.gain.value = 0.35; // blade flutter
    const g = ctx.createGain(); g.gain.value = 0; const wg = ctx.createGain(); wg.gain.value = 0; const flut = ctx.createGain(); flut.gain.value = 1;
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    a.connect(bp); b.connect(bp); bp.connect(flut); am.connect(amg); amg.connect(flut.gain); flut.connect(g); w.connect(wg); wg.connect(g);
    if (pan) { g.connect(pan); pan.connect(ctx.destination); } else g.connect(ctx.destination);
    a.start(); b.start(); w.start(); am.start();
    DRONE_AUDIO.voices.push({ a, b, w, bp, g, wg, am, pan, d: null });
  }
  DRONE_AUDIO.ready = true;
}
function droneAudioSilence() { if (!DRONE_AUDIO.ready) return; const t = SFX.ctx.currentTime; DRONE_AUDIO.voices.forEach(v => { v.d = null; v.g.gain.setTargetAtTime(0, t, 0.05); v.wg.gain.setTargetAtTime(0, t, 0.05); }); }
function droneAudioUpdate() {
  if (SFX.muted || !STATE.running || !DRONES.length) { droneAudioSilence(); return; }
  droneAudioInit(); if (!DRONE_AUDIO.ready) return;
  const ctx = SFX.ctx, t = ctx.currentTime, P = STATE.player, yaw = P.yaw;
  const live = DRONES.filter(d => d.state !== 'falling').map(d => ({ d, dist: Math.hypot(d.x - P.x, d.y - (P.y + 1.5), d.z - P.z) })).filter(o => o.dist < 32).sort((x, y) => x.dist - y.dist).slice(0, DRONE_AUDIO.max);
  DRONE_AUDIO.voices.forEach((v, i) => {
    const o = live[i]; if (!o) { v.d = null; v.g.gain.setTargetAtTime(0, t, 0.08); v.wg.gain.setTargetAtTime(0, t, 0.08); return; }
    const d = o.d, k = Math.pow(1 - o.dist / 32, 2), spd = Math.hypot(d.vx || 0, d.vy || 0, d.vz || 0);
    const diving = d.kami && d.state === 'dive';
    const f = (d.kami ? 150 : 120) + Math.min(14, spd) * 7 + (diving ? 60 : 0);
    v.a.frequency.setTargetAtTime(f, t, 0.08); v.b.frequency.setTargetAtTime(f * 1.505, t, 0.08); v.bp.frequency.setTargetAtTime(700 + f * 3, t, 0.1); v.am.frequency.setTargetAtTime(30 + spd * 3, t, 0.1);
    v.g.gain.setTargetAtTime(0.09 * k + 0.004, t, 0.06);
    v.wg.gain.setTargetAtTime(diving ? 0.25 * Math.min(1, 0.3 + (1 - o.dist / 32)) : 0, t, 0.06);
    if (diving) v.w.frequency.setTargetAtTime(500 + Math.max(0, 32 - o.dist) * 55, t, 0.05);
    if (v.pan) { const ang = Math.atan2(d.x - P.x, d.z - P.z) - yaw; v.pan.pan.setTargetAtTime(Math.max(-0.9, Math.min(0.9, -Math.sin(ang))), t, 0.05); }
    v.d = d;
  });
}
function droneChirp(d) {
  if (SFX.muted) return; try { SFX.init(); } catch (e) { return; } const ctx = SFX.ctx; if (!ctx) return; const now = ctx.currentTime;
  const dist = Math.hypot(d.x - STATE.player.x, d.z - STATE.player.z); const vol = 0.09 * Math.max(0.2, 1 - dist / 40);
  [0, 0.11].forEach((dl, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(1200 + i * 500, now + dl); o.frequency.exponentialRampToValueAtTime(2600 + i * 700, now + dl + 0.08); g.gain.setValueAtTime(0.0001, now + dl); g.gain.exponentialRampToValueAtTime(vol, now + dl + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + dl + 0.1); o.connect(g); g.connect(ctx.destination); o.start(now + dl); o.stop(now + dl + 0.12); });
}
function droneCrashSfx(d) {
  if (SFX.muted) return; try { SFX.init(); } catch (e) { return; } const ctx = SFX.ctx; if (!ctx) return; const now = ctx.currentTime;
  const dist = Math.hypot(d.x - STATE.player.x, d.z - STATE.player.z); const vol = Math.max(0.05, 1 - dist / 45);
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(260, now); o.frequency.exponentialRampToValueAtTime(40, now + 0.9);
  const chop = ctx.createOscillator(), cg = ctx.createGain(); chop.type = 'square'; chop.frequency.setValueAtTime(22, now); chop.frequency.linearRampToValueAtTime(7, now + 0.9); cg.gain.value = 0.5;
  const sg = ctx.createGain(); sg.gain.value = 0.5; chop.connect(cg); cg.connect(sg.gain);
  g.gain.setValueAtTime(0.14 * vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
  o.connect(sg); sg.connect(g); g.connect(ctx.destination); o.start(now); chop.start(now); o.stop(now + 1); chop.stop(now + 1);
  const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate), ch = buf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (Math.random() < 0.15 ? 1 : 0.2) * (1 - i / ch.length);
  const ng = ctx.createGain(); ng.gain.value = 0.12 * vol; n.buffer = buf; n.connect(ng); ng.connect(ctx.destination); n.start(now);
}
function spawnDrones(lvl, floor) {
  DRONES.forEach(d => scene.remove(d.m.g)); DRONES = []; droneAudioSilence();
  const n = Math.min(IS_COARSE ? 4 : 6, 1 + floor + Math.floor((lvl - 1) / 2));
  for (let i = 0; i < n; i++) {
    const kami = floor >= 1 && i % 3 === 2;
    let x = 0, z = 0; for (let t = 0; t < 30; t++) { x = (Math.random() - 0.5) * 150; z = -70 + Math.random() * 95; if (!collidesAt(x, z, 1.5) && Math.hypot(x - STATE.player.x, z - STATE.player.z) > 35) break; }
    const m = buildDroneMesh(kami); const y = 3 + Math.random() * 4; m.g.position.set(x, y, z); scene.add(m.g);
    DRONES.push({ m, kami, x, y, z, vx: 0, vy: 0, vz: 0, hp: kami ? 20 : 32, state: 'patrol', aggro: false, yaw: Math.random() * 6.28, alt: 2.6 + Math.random() * 4.5, orbitA: Math.random() * 6.28, orbitR: 8 + Math.random() * 6, orbitDir: Math.random() < 0.5 ? 1 : -1, fireT: 1.5 + Math.random() * 2, dodgeT: 0, beepT: 0, wp: null, name: kami ? 'Watcher-K' : 'Watcher' });
  }
}
function droneAlert(d) {
  if (d.aggro) return; d.aggro = true; d.state = d.kami ? 'dive' : 'hunt';
  addKillFeed(`${d.name}: SUBJECT LOCATED`); droneChirp(d);
  const P = STATE.player;
  BOTS.forEach(o => { if (!o.dying && !o.isBoss && Math.hypot(o.x - d.x, o.z - d.z) < 40 && o.aiState !== 'combat') { o.aiState = 'alert'; o.lastKnown = { x: P.x, z: P.z }; o.path = null; o.thinkT = 0.1; } });
  DRONES.forEach(o => { if (o !== d && Math.hypot(o.x - d.x, o.z - d.z) < 30 && !o.aggro && o.state !== 'falling') { o.aggro = true; o.state = o.kami ? 'dive' : 'hunt'; } });
}
function damageDrone(d, dmg) {
  if (d.state === 'falling') return; d.hp -= dmg; d.m.band.material.color.setHex(0xffffff); setTimeout(() => d.m.band.material.color.setHex(d.kami ? 0xffa020 : 0x38c8ff), 60);
  if (!d.aggro) droneAlert(d);
  if (d.hp <= 0) crashDrone(d);
  else { d.vx += (Math.random() - 0.5) * 6; d.vz += (Math.random() - 0.5) * 6; }
}
function crashDrone(d, emp = false) {
  if (d.state === 'falling') return; d.state = 'falling'; d.spin = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 6); d.vy = Math.max(d.vy, 1.5); d.m.coneMat.opacity = 0; d.m.eye.material.color.setHex(0x220000);
  addScore(150, 'DRONE', new THREE.Vector3(d.x, d.y + 0.5, d.z)); droneCrashSfx(d); addKillFeed(`${d.name} ${emp ? 'EMP-dropped' : 'shot down'}`);
}
function droneHit(p, x0, y0, z0) {
  for (const d of DRONES) {
    if (d.state === 'falling') continue;
    if (segPointDist(x0, y0, z0, p.x, p.y, p.z, d.m.g.position) < 0.65) {
      if (p.emp) { crashDrone(d, true); empBurst(new THREE.Vector3(p.x, p.y, p.z)); }
      else if (p.splash > 0) triggerExplosion(p.x, p.y, p.z, p.splash, p.damage);
      else { damageDrone(d, p.damage); spawnImpact(p.x, p.y, p.z, 0xffd27a); }
      return true;
    }
  }
  return false;
}
function updateDrones(dt, now) {
  droneAudioUpdate();
  if (!DRONES.length) return;
  const P = STATE.player; const pe = new THREE.Vector3(P.x, P.y + 1.4, P.z); const cd = new THREE.Vector3(); camera.getWorldDirection(cd);
  for (let i = DRONES.length - 1; i >= 0; i--) {
    const d = DRONES[i]; const g = d.m.g;
    d.m.rotors.forEach((r, k) => { r.rotation.z += dt * 60; if (k % 2) r.rotation.y += dt * 50; });
    if (d.state === 'falling') {
      d.vy -= 16 * dt; d.yaw += d.spin * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; g.rotation.set(Math.sin(now * 0.02) * 0.6, d.yaw, 0.5);
      if ((d.sparkT = (d.sparkT || 0) - dt) <= 0) { d.sparkT = 0.04; fxInit(); fxEmit('dot', d.x, d.y, d.z, { life: 0.5, s0: 0.2, s1: 0.05, vx: (Math.random() - 0.5) * 5, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 5, grav: 18, floor: 0.05, color: 0xffd080 }); fxEmit('smoke', d.x, d.y, d.z, { life: 0.9, s0: 0.25, s1: 0.9, op: 0.6, vy: 0.5 }); }
      g.position.set(d.x, d.y, d.z);
      const fl = getGroundHeightAt(d.x, d.z, d.y);
      if (d.y <= fl + 0.25 || collidesAt(d.x, d.z, 0.2)) { explode(d.x, Math.max(fl, d.y), d.z, { scale: 0.5 }); const pd = Math.hypot(P.x - d.x, P.z - d.z); if (pd < 2.5) damagePlayer(6); scene.remove(g); DRONES.splice(i, 1); }
      continue;
    }
    if (!STATE.combatActive) { g.position.set(d.x, d.y + Math.sin(now * 0.003 + i) * 0.1, d.z); continue; }
    const toP = new THREE.Vector3(pe.x - d.x, pe.y - d.y, pe.z - d.z); const dist = toP.length();
    // scan cone: player inside → alert
    const fwd = new THREE.Vector3(Math.sin(d.yaw), -0.34, Math.cos(d.yaw)).normalize();
    const los = dist < 34 && !segmentBlocked(new THREE.Vector3(d.x, d.y, d.z), pe);
    if (!d.aggro && los && dist < 10 + 16 * (fwd.dot(toP.clone().normalize()) > 0.9 ? 1 : 0)) droneAlert(d);
    let tx, ty, tz, spd;
    if (d.state === 'patrol') {
      if (!d.wp || Math.hypot(d.wp.x - d.x, d.wp.z - d.z) < 2) { for (let t = 0; t < 10; t++) { const wx = d.x + (Math.random() - 0.5) * 40, wz = d.z + (Math.random() - 0.5) * 40; if (Math.abs(wx) < 84 && wz > -80 && wz < 40 && !collidesAt(wx, wz, 1)) { d.wp = { x: wx, z: wz }; break; } } if (!d.wp) d.wp = { x: d.x, z: d.z }; }
      tx = d.wp.x; tz = d.wp.z; ty = d.alt; spd = 4;
    } else if (d.state === 'hunt') {
      d.orbitA += d.orbitDir * dt * 0.6; if (Math.random() < dt * 0.25) d.orbitDir *= -1;
      tx = P.x + Math.sin(d.orbitA) * d.orbitR; tz = P.z + Math.cos(d.orbitA) * d.orbitR; ty = P.y + d.alt; spd = 7.5;
      // dodge when the player aims at it
      d.dodgeT -= dt; const aimDot = cd.dot(toP.clone().normalize().negate());
      if (aimDot > 0.985 && d.dodgeT <= 0) { d.dodgeT = 0.9 + Math.random(); const side = new THREE.Vector3(-cd.z, 0, cd.x).multiplyScalar((Math.random() < 0.5 ? -1 : 1) * 9); d.vx += side.x; d.vz += side.z; d.vy += (Math.random() - 0.3) * 4; }
      // shoot light energy bolts
      d.fireT -= dt; if (d.fireT <= 0 && los && dist < 38) { d.fireT = 1.3 + Math.random() * 1.1; droneShoot(d, pe); }
    } else { // kamikaze dive
      tx = P.x; tz = P.z; ty = P.y + 1.0; spd = dist < 14 ? 15 : 9;
      d.beepT -= dt; if (d.beepT <= 0) { d.beepT = Math.max(0.08, dist / 40); SFX.playBeep(1500 + Math.max(0, 30 - dist) * 40); d.m.eye.material.color.setHex(0xffffff); setTimeout(() => d.m.eye.material.color.setHex(0xff1a0a), 50); }
      if (dist < 1.7) { explode(d.x, d.y, d.z, { scale: 0.8 }); damagePlayer(Math.round(20 * (STATE.diff?.dmg || 1))); scene.remove(g); DRONES.splice(i, 1); continue; }
    }
    // steer (no nav grid): desired velocity + wall/ceiling avoidance
    const dx = tx - d.x, dy = ty - d.y, dz = tz - d.z, dl = Math.hypot(dx, dy, dz) || 1;
    d.vx += (dx / dl * spd - d.vx) * Math.min(1, dt * 2.2); d.vy += (dy / dl * spd * 0.7 - d.vy) * Math.min(1, dt * 2.2); d.vz += (dz / dl * spd - d.vz) * Math.min(1, dt * 2.2);
    const look = 2.2; if (collidesAt(d.x + d.vx * dt * 8 + Math.sign(d.vx) * 0.5, d.z, 0.6) && d.y < 9) { d.vx *= -0.6; d.vy += 3 * dt * 10; } if (collidesAt(d.x, d.z + d.vz * dt * 8 + Math.sign(d.vz) * 0.5, 0.6) && d.y < 9) { d.vz *= -0.6; d.vy += 3 * dt * 10; }
    DRONES.forEach(o => { if (o !== d) { const ox = d.x - o.x, oz = d.z - o.z, od = Math.hypot(ox, oz); if (od < 2.5 && od > 0.01) { d.vx += ox / od * 4 * dt; d.vz += oz / od * 4 * dt; } } });
    d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    d.x = Math.max(-86, Math.min(86, d.x)); d.z = Math.max(-81, Math.min(81, d.z));
    const fl = getGroundHeightAt(d.x, d.z, d.y); d.y = Math.max(fl + 1.3, Math.min(11.5, d.y));
    const wantYaw = d.aggro ? Math.atan2(P.x - d.x, P.z - d.z) : Math.atan2(d.vx, d.vz); let dyw = Math.atan2(Math.sin(wantYaw - d.yaw), Math.cos(wantYaw - d.yaw)); d.yaw += dyw * Math.min(1, dt * 4);
    g.position.set(d.x, d.y + Math.sin(now * 0.004 + i) * 0.08, d.z); g.rotation.set(Math.max(-0.4, Math.min(0.4, d.vz * 0.03 * Math.cos(d.yaw) + d.vx * 0.03 * Math.sin(d.yaw))) + Math.sin(now * 0.011 + i) * 0.04, d.yaw, Math.sin(now * 0.009 + i * 2) * 0.05);
    d.m.pivot.rotation.y = d.aggro ? 0 : Math.sin(now * 0.0015 + i) * 0.6; d.m.coneMat.opacity = d.aggro ? 0.03 : 0.07 + 0.03 * Math.sin(now * 0.01);
  }
}
function droneShoot(d, target) {
  const from = new THREE.Vector3(d.x, d.y - 0.05, d.z); const dir = target.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.6)).sub(from).normalize();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
  orb.position.copy(from); scene.add(orb); spawnMuzzleFlash(from, 0xff3a2a, false); SFX.playPew && SFX.playPew(1500);
  PROJECTILES.push({ mesh: orb, x: from.x, y: from.y, z: from.z, vx: dir.x * 32, vy: dir.y * 32, vz: dir.z * 32, damage: Math.round(4 * (STATE.diff?.dmg || 1)), splash: 0, fromPlayer: false, life: 2.2 });
}
function triggerExplosion(x, y, z, radius, baseDamage) {
  explode(x, y, z, { scale: Math.min(1.6, radius / 10) });
  const gy0 = getGroundHeightAt(x, z, y + 0.5); const groundHit = y - gy0 < 1.6; y = gy0;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, radius * 0.65, 24), new THREE.MeshBasicMaterial({ color: 0xff5500, side: THREE.DoubleSide, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
  ring.visible = false;
  const poolGroup = new THREE.Group();
  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.08, 18), new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending }));
  const innerCore = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.10, 14), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending }));
  poolGroup.add(baseDisc, innerCore);
  const tongues = [];
  for (let t = 0; t < 8; t++) {
    const tCone = new THREE.Mesh(FLAME_GEOS[0], new THREE.MeshBasicMaterial({ color: t % 2 === 0 ? 0xf97316 : 0xfacc15, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    const ang = (t / 8) * Math.PI * 2; const rad = 0.5 + Math.random() * 1.4;
    tCone.position.set(Math.cos(ang) * rad, 0.65, Math.sin(ang) * rad); poolGroup.add(tCone); tongues.push({ mesh: tCone, phase: Math.random() * Math.PI * 2 });
  }
  const fireLight = new RTLight(0xff5500, 2.0, 15); fireLight.position.set(0, 1.1, 0); poolGroup.add(fireLight);
  poolGroup.position.set(x, y + 0.05, z); scene.add(poolGroup);
  if (!groundHit) { poolGroup.scale.setScalar(0.5); }
  NAPALM_POOLS.push({ mesh: poolGroup, tongues, fireLight, x, y, z, radius: groundHit ? 2.6 : 1.3, timer: groundHit ? 5.5 : 2.5, tick: 0, emitTick: 0 });
  DRONES.forEach(dr => { if (dr.state !== 'falling' && Math.hypot(dr.x - x, dr.y - y, dr.z - z) < radius * 0.7) damageDrone(dr, baseDamage); });
  EX_BARRELS.forEach(b => { if (!b.dead && Math.hypot(b.x - x, b.z - z) < radius * 0.55) explodeBarrel(b); });
  for (let i = BOTS.length - 1; i >= 0; i--) {
    const b = BOTS[i]; if (b.dying) continue;
    const d = Math.hypot(b.x - x, b.z - z);
    if (d <= radius) damageBot(b, Math.round(baseDamage * (1 - (d / radius) * 0.65)));
  }
}

function finishBotKill(b) {
  addScore(b.isBoss ? 5000 : b.isMender ? 400 : b.role === 'sniper' ? 250 : b.heavy ? 200 : 100, b.isBoss ? 'MINOTAUR' : b.isMender ? 'MENDER' : 'KILL', new THREE.Vector3(b.x, (b.y || 0) + 2.2, b.z), !!b.isBoss);
  scene.remove(b.rig.root); if (b.weapon) scene.remove(b.weapon);
  const idx = BOTS.indexOf(b); if (idx !== -1) BOTS.splice(idx, 1);
  addKillFeed(`Eliminated ${b.name}`);
  SFX.playSiren(2);
  if (b.isBoss) {
    document.getElementById('boss-hud').classList.add('hidden');
    spawnAccessKey(b.x, b.z);
    SFX.playRadioChatter("Alert! The Minotaur Enforcer is down. Lock the north elevator!", 'CENTRAL AI COMMAND');
    showBanner('🔑 EXIT KEYCARD DROPPED!', 'Grab the golden keycard and take the north exit to the next level!', 5000);
  } else {
    SFX.playRadioChatter(`${b.name} eliminated! All Strogg sentinels converge!`, 'OVERWATCH COMMS');
    checkFloorClear();
  }
  updateHUD();
}

function damageBot(b, dmg) {
  if (b.dying) return;
  b.health -= dmg; b.flinchTimer = 0.18; b.rig.hb.update(b.health, b.maxHealth);
  // hit reaction lean
  if (b.rig.torso && b.rig.torso !== b.rig.root) b.rig.torso.rotation.x = -0.15;
  uiHit(b.health <= 0);
  if (b.isBoss) {
    document.getElementById('boss-hp-text').textContent = `${Math.max(0, b.health)} / ${b.maxHealth}`;
    document.getElementById('boss-hp-bar').style.width = `${Math.max(0, (b.health / b.maxHealth) * 100)}%`;
  }
  if (!b.isBoss) {
    b.coverHits = (b.coverHits || 0) + 1;
    if (b.aiState !== 'combat') { b.aiState = 'alert'; b.lastKnown = { x: STATE.player.x, z: STATE.player.z }; b.path = null; b.thinkT = 0.1; }
  }
  if (b.health <= 0) {
    if (b.isMender) menderExplode(b);
    spawnDeathGib(b);
    if (b.isHuman) { const buddy = BOTS.find(o => o !== b && o.isHuman && !o.dying && Math.hypot(o.x - b.x, o.z - b.z) < 40); if (buddy) guardShout(buddy, 'mandown', 'Man down!'); }
  }
}

function damagePlayer(dmg, src) {
  if (STATE.dying) return;
  STATE.lastHurtT = performance.now();
  if (STATE.dm) { uiDamageDir(src); return dmTakeDamage(dmg, null); }
  uiDamageDir(src);
  const absorb = Math.min(STATE.player.armor, Math.ceil(dmg * 0.5));
  STATE.player.armor -= absorb; STATE.player.health -= (dmg - absorb);
  STATE.screenShake = Math.max(STATE.screenShake, 0.35);
  const flash = document.getElementById('damage-flash'); flash.style.opacity = '1'; setTimeout(() => (flash.style.opacity = '0'), 160);
  updateHUD();
  if (STATE.player.health <= 0) {
    STATE.player.health = 0; STATE.dying = true; updateHUD();
    const lv = STATE.level, fl = STATE.floor || 0, who = src && src.name;
    uiDeath(who, () => { STATE.dying = false; if (STATE.dm || STATE.level !== lv) return; STATE.player.health = 100; STATE.player.armor = 50; startFloor(lv, fl); });
  }
}
function addKillFeed(msg) {
  const feed = document.getElementById('kill-feed');
  const el = document.createElement('div');
  el.className = 'bg-slate-950/85 border-l-2 border-amber-400 px-2 py-0.5 text-amber-100 font-bold rounded';
  el.textContent = msg; feed.appendChild(el); setTimeout(() => el.remove(), 3500);
}

// Round 18: height-aware test for player shots, so firing over a low crate/rail (as the crosshair shows) isn't stopped by it
function collidesAt3(x, y, z, r = 0.15) {
  if (x < -88 || x > 88 || z < -83 || z > 83) return true;
  for (const c of colliders) { if (c.hi) continue; if (y < (c.minY ?? -1e3) - r || y > (c.maxY ?? 1e3) + r) continue; if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true; }
  return false;
}
function collidesAt(x, z, r = 0.65) {
  if (x < -88 || x > 88 || z < -83 || z > 83) return true;
  for (const c of colliders) {
    if (c.hi) continue;
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
  }
  return false;
}

// ============================================================================
// CONTROLS + GAME LOOP
// ============================================================================
const KEYS = {};
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.key === 'Tab') e.preventDefault();
  if (e.key === 'Tab') { if (!IS_RELEASE_BUILD) toggleStudioEditor(); return; }
  if (STATE.pausedForStudio) return;
  KEYS[e.code] = true;
  if (e.code === 'Digit1') switchWeapon(0);
  if (e.code === 'Digit2') switchWeapon(1);
  if (e.code === 'Digit4') switchWeapon(3);
  if (e.code === 'Digit3') switchWeapon(2);
  if (e.code === 'Digit4') switchWeapon(3);
  if (e.code === 'KeyG' || e.code === 'KeyQ') throwFragGrenade();
  if (e.code === 'KeyX') STATE.player.yaw += Math.PI;
  if ((e.code === 'Space' || e.code === 'KeyE') && STATE.player.y <= getGroundHeightAt(STATE.player.x, STATE.player.z, STATE.player.y) + 0.08) STATE.player.vy = STATE.jumpVel;
});
window.addEventListener('keyup', e => { KEYS[e.code] = false; });

let isFiringHeld = false;
canvas.addEventListener('mousedown', e => {
  if (STATE.pausedForStudio) return;
  if (!IS_COARSE) { try { if (document.pointerLockElement !== canvas) canvas.requestPointerLock(); } catch (err) {} }
  if (e.button === 0) isFiringHeld = true;
});
window.addEventListener('mouseup', () => { isFiringHeld = false; });
window.addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas && STATE.running && !STATE.pausedForStudio) {
    STATE.player.yaw -= e.movementX * 0.0022 * STATE.sens * (STATE.adsSensMul || 1);
    STATE.player.pitch = Math.max(-1.35, Math.min(1.35, STATE.player.pitch - e.movementY * 0.0022 * STATE.sens * (STATE.adsSensMul || 1)));
  }
});
function unlockAudio() { SFX.init(); if (SFX.ctx && SFX.ctx.state === 'suspended') SFX.ctx.resume(); }
window.addEventListener('pointerdown', unlockAudio, { passive: true });

let moveTouchId = null, moveOrigin = { x: 0, y: 0 }, moveVec = { x: 0, y: 0 };
let lookTouchId = null, lastLook = { x: 0, y: 0 };
const moveZone = document.getElementById('touch-move-zone');
const lookZone = document.getElementById('touch-look-zone');
const joyBase = document.getElementById('virtual-joystick-base');
const joyThumb = document.getElementById('virtual-joystick-thumb');
const JOY_RADIUS = 58, JOY_DEAD = 10;
const defaultJoy = { x: joyBase.style.left, y: joyBase.style.top };
function uiBlockedTarget(el) { return !!(el && el.closest && el.closest('button, a, input, select, textarea, label, .customizable-btn, #studio-editor-modal, #game-modal, #splash-screen, #hud-editor-bar')); }
function resetJoystickHome() { joyBase.style.left = defaultJoy.x; joyBase.style.top = defaultJoy.y; joyThumb.style.left = defaultJoy.x; joyThumb.style.top = defaultJoy.y; }
function bindTouch(zone, type) {
  zone.addEventListener('touchstart', e => {
    if (!STATE.running || STATE.pausedForStudio) return;
    if (uiBlockedTarget(e.target)) return;
    const t = e.changedTouches[0];
    if (type === 'move' && moveTouchId === null) {
      moveTouchId = t.identifier; moveOrigin = { x: t.clientX, y: t.clientY };
      joyBase.style.left = `${t.clientX}px`; joyBase.style.top = `${t.clientY}px`;
      joyThumb.style.left = `${t.clientX}px`; joyThumb.style.top = `${t.clientY}px`; e.preventDefault();
    } else if (type === 'look' && lookTouchId === null) {
      lookTouchId = t.identifier; lastLook = { x: t.clientX, y: t.clientY }; e.preventDefault();
    }
  }, { passive: false });
  zone.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (type === 'move' && t.identifier === moveTouchId) {
        const dx = t.clientX - moveOrigin.x, dy = t.clientY - moveOrigin.y;
        const raw = Math.hypot(dx, dy); const dist = Math.min(JOY_RADIUS, raw); const ang = Math.atan2(dy, dx);
        joyThumb.style.left = `${moveOrigin.x + Math.cos(ang) * dist}px`; joyThumb.style.top = `${moveOrigin.y + Math.sin(ang) * dist}px`;
        moveVec = raw < JOY_DEAD ? { x: 0, y: 0 } : { x: (Math.cos(ang) * dist) / JOY_RADIUS, y: (Math.sin(ang) * dist) / JOY_RADIUS };
        e.preventDefault();
      } else if (type === 'look' && t.identifier === lookTouchId) {
        const dx = t.clientX - lastLook.x, dy = t.clientY - lastLook.y; lastLook = { x: t.clientX, y: t.clientY };
        const lookScale = 0.0052 * STATE.sens * (STATE.adsSensMul || 1);
        STATE.player.yaw -= dx * lookScale;
        STATE.player.pitch = Math.max(-1.35, Math.min(1.35, STATE.player.pitch - dy * lookScale));
        e.preventDefault();
      }
    }
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (type === 'move' && t.identifier === moveTouchId) { moveTouchId = null; moveVec = { x: 0, y: 0 }; resetJoystickHome(); }
      if (type === 'look' && t.identifier === lookTouchId) lookTouchId = null;
    }
  };
  zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end);
}
bindTouch(moveZone, 'move');


// ---------- Round 14: CoD-style fire-and-look. Any right-side touch (look zone or FIRE buttons) drags the camera ----------
const LOOK = { ptrs: new Map(), px: 0, py: 0, sens: parseFloat(localStorage.getItem('dys_look') || '') || 1.0 };
const LOOK_RAD_PER_PX = 0.0046, LOOK_DEAD = 1.5, LOOK_TAU = 0.022;
function lookStart(e) { if (e.pointerType === 'mouse') return; LOOK.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, live: false }); }
function lookMove(e) {
  const p = LOOK.ptrs.get(e.pointerId); if (!p) return;
  if (!p.live) { if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < LOOK_DEAD) return; p.live = true; p.x = p.sx + Math.sign(e.clientX - p.sx) * 0; p.y = p.sy; }
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null; const last = evs && evs.length ? evs[evs.length - 1] : e;
  LOOK.px += last.clientX - p.x; LOOK.py += last.clientY - p.y; p.x = last.clientX; p.y = last.clientY;
  if (e.cancelable) e.preventDefault();
}
function lookEnd(e) { LOOK.ptrs.delete(e.pointerId); }
function lookApply(dt) {
  if (!LOOK.px && !LOOK.py) return;
  const k = 1 - Math.exp(-dt / LOOK_TAU); let dx = LOOK.px * k, dy = LOOK.py * k;
  if (Math.abs(LOOK.px) < 0.05 && Math.abs(LOOK.py) < 0.05) { dx = LOOK.px; dy = LOOK.py; }
  LOOK.px -= dx; LOOK.py -= dy;
  const r = LOOK_RAD_PER_PX * LOOK.sens * (STATE.adsSensMul || 1) * (STATE.ads ? 0.55 : 1);
  STATE.player.yaw -= dx * r; STATE.player.pitch = Math.max(-1.35, Math.min(1.35, STATE.player.pitch - dy * r));
}
function bindLookSurface(el, capture) {
  if (!el) return; el.style.touchAction = 'none';
  el.addEventListener('pointerdown', e => { if (!STATE.running || STATE.pausedForStudio) return; if (!capture && uiBlockedTarget(e.target)) return; lookStart(e); if (capture) { try { el.setPointerCapture(e.pointerId); } catch (_) {} } else if (e.cancelable) e.preventDefault(); });
  el.addEventListener('pointermove', lookMove, { passive: false });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => el.addEventListener(t, lookEnd));
}
bindLookSurface(lookZone, false);
function bindHoldButton(el, onDown, onUp) {
  const down = e => { e.preventDefault(); e.stopPropagation(); try { el.setPointerCapture(e.pointerId); } catch (err) {} onDown(); };
  const up = e => { e.preventDefault(); if (onUp) onUp(); };
  el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
}
function tryJump() { if (STATE.player.y <= getGroundHeightAt(STATE.player.x, STATE.player.z, STATE.player.y) + 0.12) STATE.player.vy = STATE.jumpVel; }
bindHoldButton(document.getElementById('btn-fire'), () => { isFiringHeld = true; }, () => { isFiringHeld = false; }); bindLookSurface(document.getElementById('btn-fire'), true);
bindHoldButton(document.getElementById('btn-jump'), tryJump, null);
bindHoldButton(document.getElementById('btn-grenade'), throwFragGrenade, null);
bindHoldButton(document.getElementById('btn-crouch'), () => { STATE.player.crouch = !STATE.player.crouch; }, null);
bindHoldButton(document.getElementById('btn-reload'), () => {
  const w = STATE.weapons[STATE.currentWeapon];
  if (w.maxAmmo !== Infinity && !w.emp) { w.ammo = w.maxAmmo; AI_G.lastReloadT = performance.now(); } startReloadAnim(); SFX.playKeyPickup(); updateHUD();
}, null);
window.addEventListener('keydown', e => { if (e.code === 'KeyR' && STATE.running && !STATE.pausedForStudio) document.getElementById('btn-reload').dispatchEvent(new Event('pointerdown')); });

function updateHUD() {
  document.getElementById('level-badge').textContent = `LEVEL ${STATE.level} · FLOOR ${FLOOR_NAMES[STATE.floor || 0]}`;
  document.getElementById('bots-remaining').textContent = BOTS.filter(b => !b.dying).length;
  document.getElementById('hud-health').textContent = Math.max(0, Math.round(STATE.player.health));
  document.getElementById('bar-health').style.width = `${Math.max(0, STATE.player.health)}%`;
  document.getElementById('hud-armor').textContent = Math.max(0, Math.round(STATE.player.armor));
  document.getElementById('bar-armor').style.width = `${Math.max(0, STATE.player.armor)}%`;
  const w = STATE.weapons[STATE.currentWeapon] || STATE.weapons[0];
  document.getElementById('hud-wep-name').textContent = w.name.toUpperCase();
  document.getElementById('hud-ammo').textContent = w.ammo === Infinity ? '∞' : w.ammo;
  document.getElementById('hud-ammo-max').textContent = `/ ${w.maxAmmo === Infinity ? '∞' : w.maxAmmo}`;
  document.getElementById('grenade-label').textContent = `FRAG (${STATE.grenades})`;
}

function drawMinimap() {
  const mc = document.getElementById('minimap-canvas'); const ctx = mc.getContext('2d');
  ctx.fillStyle = '#0c0a08'; ctx.fillRect(0, 0, mc.width, mc.height);
  const scale = 0.48, cx = mc.width / 2, cy = mc.height / 2;
  ctx.fillStyle = STATE.hasAccessKey ? '#10b981' : '#facc15';
  ctx.fillRect(cx + ELEVATOR_STATE.x * scale - 3, cy + ELEVATOR_STATE.z * scale - 3, 6, 6);
  BOTS.forEach(b => {
    if (b.dying) return;
    ctx.fillStyle = b.isBoss ? '#ef4444' : (b.isHuman ? '#e5e7eb' : (b.isHumanGuard ? '#f59e0b' : '#dc2626'));
    ctx.beginPath(); ctx.arc(cx + b.x * scale, cy + b.z * scale, b.isBoss ? 4.5 : 3, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(cx + STATE.player.x * scale, cy + STATE.player.z * scale, 3.5, 0, Math.PI * 2); ctx.fill();
}

let lastTime = performance.now();
function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
  if (LORE_OPEN) { renderFrame(); return; }
  if (STATE.dm) dmUpdate(dt);
  if (STATE.turnAnim) turnAnimUpdate(dt);
  if (STATE.running) lookApply(dt);
  musicUpdate(dt);

  if (sirenActiveTimer > 0) {
    sirenActiveTimer -= dt;
    const flashOn = Math.sin(now * 0.018) > 0;
    sirenBeaconMeshes.forEach(b => b.material.color.setHex(flashOn ? 0xff0000 : 0x2a0505));
  }
  // flickering biomech lights
  if (STATE.lightFlickerT > 0) STATE.lightFlickerT -= dt;
  ARENA_LIGHTS.forEach(L => {
    if (STATE.lightFlickerT > 0 && Math.random() < 0.45) { L.light.intensity = L.base * (Math.random() < 0.5 ? 0.1 : 1.6); return; }
    if (L.flicker) L.light.intensity = L.base * (0.65 + 0.35 * Math.sin(now * 0.012 + L.phase) * Math.sin(now * 0.037 + L.phase));
    else L.light.intensity = L.base * (0.9 + 0.1 * Math.sin(now * 0.004 + L.phase));
  });
  // steam vents
  if (!IS_COARSE) {
    STEAM_PARTICLES.forEach(v => {
      v.t += dt;
      if (v.t > 0.2) {
        v.t = 0;
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35, depthWrite: false }));
        m.position.set(v.x + (Math.random() - 0.5) * 0.2, v.y, v.z + (Math.random() - 0.5) * 0.2);
        scene.add(m); FLAME_PARTICLES.push({ mesh: m, isSmoke: true, vx: (Math.random() - 0.5) * 0.4, vy: 1.6 + Math.random(), vz: (Math.random() - 0.5) * 0.4, life: 1.2, maxLife: 1.2 });
      }
    });
  }

  if (!STATE.running || STATE.pausedForStudio) { renderFrame(); return; }

  if (STATE.fireCooldown > 0) STATE.fireCooldown -= dt;
  if (isFiringHeld) firePlayerWeapon();
  STATE.spinUp = Math.max(0, STATE.spinUp - dt * 0.8);
  weaponGlowMats.forEach(m => { m.emissiveIntensity = 1.6 + STATE.spinUp * 2.2 + Math.sin(now * 0.02) * 0.3; });

  if (STATE.quadTimer > 0) {
    STATE.quadTimer -= dt;
    document.getElementById('powerup-glow').style.opacity = STATE.quadTimer > 0 ? '1' : '0';
    document.getElementById('active-powerup-label').classList.toggle('hidden', STATE.quadTimer <= 0);
  }

  let fwd = (KEYS['KeyW'] || KEYS['ArrowUp'] ? 1 : 0) - (KEYS['KeyS'] || KEYS['ArrowDown'] ? 1 : 0) - moveVec.y;
  let str = (KEYS['KeyD'] || KEYS['ArrowRight'] ? 1 : 0) - (KEYS['KeyA'] || KEYS['ArrowLeft'] ? 1 : 0) + moveVec.x;
  const sprint = (KEYS['ShiftLeft'] || moveVec.y < -0.75) ? 1.45 : 1.0;
  const spd = STATE.walkSpeed * sprint;
  const sin = Math.sin(STATE.player.yaw), cos = Math.cos(STATE.player.yaw);
  const dx = (-sin * fwd + cos * str) * spd * dt;
  const dz = (-cos * fwd - sin * str) * spd * dt;
  if (!playerCollidesAt(STATE.player.x + dx, STATE.player.z, STATE.player.y) && !railBlocks(STATE.player.x + dx, STATE.player.z, STATE.player.y)) STATE.player.x += dx;
  if (!playerCollidesAt(STATE.player.x, STATE.player.z + dz, STATE.player.y) && !railBlocks(STATE.player.x, STATE.player.z + dz, STATE.player.y)) STATE.player.z += dz;
  const floorH = getGroundHeightAt(STATE.player.x, STATE.player.z, STATE.player.y);
  STATE.player.y += STATE.player.vy * dt;
  if (STATE.player.y > floorH) { STATE.player.vy -= STATE.gravity * dt; if (STATE.player.y < floorH) { STATE.player.y = floorH; STATE.player.vy = 0; } }
  else { STATE.player.y = floorH; STATE.player.vy = 0; }

  // walk bob + idle sway on viewmodel
  const moving = Math.abs(fwd) + Math.abs(str) > 0.05 && STATE.player.y <= floorH + 0.05;
  const bob = moving ? Math.sin(now * 0.012) * 0.025 : Math.sin(now * 0.003) * 0.008;
  const sway = Math.sin(now * 0.0022) * 0.01;
  camera.position.set(STATE.player.x, STATE.player.y + (STATE.player.crouch ? 1.05 : 1.68) + bob * 0.3, STATE.player.z);
  if (STATE.screenShake > 0) {
    camera.position.x += (Math.random() - 0.5) * STATE.screenShake * 0.35;
    camera.position.y += (Math.random() - 0.5) * STATE.screenShake * 0.25;
    STATE.screenShake = Math.max(0, STATE.screenShake - dt * 2.8);
  }
  camera.rotation.order = 'YXZ'; camera.rotation.y = STATE.player.yaw; camera.rotation.x = STATE.player.pitch;
  if (gunMesh) {
    const baseZ = STATE.currentWeapon === 0 ? -0.52 : -0.48;
    VM.recoilZ = (VM.recoilZ || 0) * Math.exp(-dt * 16); gunMesh.position.z = baseZ + VM.recoilZ; // absolute each frame: no drift
    gunMesh.position.y = (STATE.currentWeapon === 0 ? -0.28 : -0.26) + bob;
    gunMesh.position.x = (STATE.currentWeapon === 0 ? 0.32 : 0.28) + sway;
    gunMesh.rotation.z = sway * 0.4;
    animateViewModel(dt, now);
  }

  if (ACCESS_KEY && !STATE.hasAccessKey) {
    ACCESS_KEY.card.rotation.y += 2.5 * dt;
    if (Math.hypot(STATE.player.x - ACCESS_KEY.x, STATE.player.z - ACCESS_KEY.z) < 2.8) {
      STATE.hasAccessKey = true; SFX.playKeyPickup();
      SFX.playRadioChatter("The intruder has seized the Minotaur's elevator keycard!", 'CENTRAL AI COMMAND');
      arenaGroup.remove(ACCESS_KEY.group); ELEVATOR_STATE.doorsOpen = true; ELEVATOR_STATE.doorMat.color.setHex(0x10b981);
      document.getElementById('keycard-status').textContent = '🔑 KEY ACQUIRED — ENTER NORTH ELEVATOR';
      document.getElementById('keycard-status').className = 'text-[10px] text-emerald-400 font-black block animate-pulse';
      showBanner('🔓 ELEVATOR UNLOCKED!', 'Proceed to the North Core Elevator!', 4500);
    }
  }
  if (ELEVATOR_STATE.doorsOpen) {
    ELEVATOR_STATE.progress = Math.min(1, ELEVATOR_STATE.progress + dt * 1.4);
    ELEVATOR_STATE.doorLeft.position.x = ELEVATOR_STATE.x - 1.6 - ELEVATOR_STATE.progress * 2.2;
    ELEVATOR_STATE.doorRight.position.x = ELEVATOR_STATE.x + 1.6 + ELEVATOR_STATE.progress * 2.2;
    if (Math.hypot(STATE.player.x - ELEVATOR_STATE.x, STATE.player.z - ELEVATOR_STATE.z) < 3.4) {
      SFX.playKeyPickup();
      advanceFloor();
    }
  }

  PICKUPS.forEach(p => {
    if (!p.active) { p.respawnTimer -= dt; if (p.respawnTimer <= 0) { p.active = true; p.mesh.visible = true; } return; }
    p.mesh.rotation.y += 2.2 * dt;
    if (Math.hypot(STATE.player.x - p.x, STATE.player.z - p.z) < 2.2) {
      p.active = false; p.mesh.visible = false; p.respawnTimer = 15; SFX.playKeyPickup();
      if (p.type === 'health') STATE.player.health = Math.min(100, STATE.player.health + 35);
      if (p.type === 'armor') STATE.player.armor = Math.min(100, STATE.player.armor + 40);
      if (p.type === 'emp') { const e = STATE.weapons[3]; e.ammo = Math.min(e.maxAmmo, e.ammo + 3); addKillFeed('+3 EMP rounds'); }
      if (p.type === 'ammo') { STATE.weapons.forEach(w => { if (w.maxAmmo !== Infinity && !w.emp) w.ammo = w.maxAmmo; }); STATE.grenades = Math.min(5, STATE.grenades + 2); }
      if (p.type === 'quad') STATE.quadTimer = 12;
      updateHUD();
    }
  });

  fxUpdate(dt); rtLightsUpdate(); adsUpdate(dt); updateArcPreview(); updateDrones(dt, now); updateSoftSpots(dt, now); updateScorePopups(dt);
  for (let i = FLAME_PARTICLES.length - 1; i >= 0; i--) {
    const fp = FLAME_PARTICLES[i]; fp.life -= dt;
    if (fp.fall) { fp.vy -= 16 * dt; if (fp.mesh.position.y <= fp.floor) { fp.mesh.position.y = fp.floor; fp.vy = Math.abs(fp.vy) * 0.1; fp.vx *= 0.5; fp.vz *= 0.5; } }
    fp.mesh.position.x += fp.vx * dt; fp.mesh.position.y += fp.vy * dt; fp.mesh.position.z += fp.vz * dt;
    const ratio = Math.max(0, fp.life / fp.maxLife);
    if (fp.isSmoke) { const s = 1.0 + (1.0 - ratio) * 2.4; fp.mesh.scale.set(s, s, s); fp.mesh.material.opacity = ratio * 0.45; }
    else { fp.mesh.scale.set(ratio, ratio * 1.35, ratio); fp.mesh.material.opacity = ratio; }
    if (fp.life <= 0) { scene.remove(fp.mesh); fp.mesh.material.dispose(); FLAME_PARTICLES.splice(i, 1); }
  }
  for (let i = MUZZLE_FX.length - 1; i >= 0; i--) {
    const fx = MUZZLE_FX[i]; fx.life -= dt;
    fx.mesh.position.x += (fx.vx || 0) * dt; fx.mesh.position.y += (fx.vy || 0) * dt; fx.mesh.position.z += (fx.vz || 0) * dt;
    fx.mesh.material.opacity = Math.max(0, fx.life / fx.max);
    if (fx.light) fx.light.intensity *= 0.7;
    if (fx.life <= 0) { scene.remove(fx.mesh); if (fx.light) scene.remove(fx.light); MUZZLE_FX.splice(i, 1); }
  }
  for (let i = IMPACT_DECALS.length - 1; i >= 0; i--) {
    IMPACT_DECALS[i].life -= dt;
    if (IMPACT_DECALS[i].life <= 0) { scene.remove(IMPACT_DECALS[i].mesh); IMPACT_DECALS.splice(i, 1); }
  }
  for (let i = DEATH_FX.length - 1; i >= 0; i--) {
    const g = DEATH_FX[i]; g.life -= dt; g.vy -= 18 * dt;
    g.mesh.position.x += g.vx * dt; g.mesh.position.y += g.vy * dt; g.mesh.position.z += g.vz * dt;
    g.mesh.rotation.x += dt * 4; g.mesh.rotation.z += dt * 3;
    if (g.life <= 0) { scene.remove(g.mesh); DEATH_FX.splice(i, 1); }
  }

  for (let i = PROJECTILES.length - 1; i >= 0; i--) {
    const p = PROJECTILES[i]; p.life -= dt;
    const px0 = p.x, py0 = p.y, pz0 = p.z;
    if (p.ballistic) {
      p.vy -= STATE.gravity * ROCKET_G * dt;
      _v1.set(p.vx, p.vy, p.vz); p.mesh.quaternion.setFromUnitVectors(_UP_Z, _v1.normalize());
      if ((p.trailT = (p.trailT || 0) - dt) <= 0) { p.trailT = IS_COARSE ? 0.05 : 0.022; fxInit(); fxEmit('smoke', p.x - _v1.x * 0.5, p.y - _v1.y * 0.5, p.z - _v1.z * 0.5, { life: 1.6, s0: 0.35, s1: 1.6, op: 0.8, vy: 0.4 }); fxEmit('fire', p.x - _v1.x * 0.45, p.y - _v1.y * 0.45, p.z - _v1.z * 0.45, { life: 0.12, s0: 0.35, s1: 0.15 }); }
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    // Round 18: swept collision for player shots. At 92 m/s and phone frame times a shot moved 1.5–4.6 m per frame and
    // tunnelled straight through enemies (0.95 m radius) — so a shot dead on the crosshair could miss. Sub-step it.
    if (p.fromPlayer) { const L = Math.hypot(p.x - px0, p.y - py0, p.z - pz0); if (L > 0.35) { const n = Math.ceil(L / 0.35);
      for (let k = 1; k < n; k++) { const f = k / n, qx = px0 + (p.x - px0) * f, qy = py0 + (p.y - py0) * f, qz = pz0 + (p.z - pz0) * f;
        const botHit = BOTS.some(b => !b.dying && Math.hypot(qx - b.x, qz - b.z) < (b.isBoss ? 1.55 : (b.hitRadius || 0.95)) && qy >= b.y && qy <= b.y + (b.isBoss ? 3.5 : (b.hitHeight || 2.4)));
        if (botHit || collidesAt3(qx, qy, qz, 0.15) || qy <= 0.05) { p.x = qx; p.y = qy; p.z = qz; break; } } } }
    p.mesh.position.set(p.x, p.y, p.z);
    let hit = false;
    if (p.fromPlayer && !p.emp && weakPointHit(p, px0, py0, pz0)) { scene.remove(p.mesh); PROJECTILES.splice(i, 1); continue; }
    if (p.fromPlayer && droneHit(p, px0, py0, pz0)) { scene.remove(p.mesh); PROJECTILES.splice(i, 1); continue; }
    if (p.fromPlayer && barrelHit(p)) { scene.remove(p.mesh); PROJECTILES.splice(i, 1); continue; }
    if (p.fromPlayer) {
      const CH = colossusAt(p.x, p.z, 0.4);
      if (CH && p.y < CH.height + 1) {
        if (p.emp) empBurst(new THREE.Vector3(p.x, p.y, p.z));
        else { spawnImpact(p.x, p.y, p.z, 0x7dd3fc); flashImmune(); CH.engaged = 6; }
        scene.remove(p.mesh); PROJECTILES.splice(i, 1); continue;
      }
    }
    if ((p.fromPlayer ? collidesAt3(p.x, p.y, p.z, 0.15) : collidesAt(p.x, p.z, 0.15)) || p.y <= (p.ballistic ? getGroundHeightAt(p.x, p.z, p.y + 0.3) + 0.05 : 0.05) || p.life <= 0 || (SOLIDS.length && solidAt(p.x, p.y, p.z))) hit = true;
    if (hit && p.emp) { empBurst(new THREE.Vector3(p.x, Math.max(0.3, p.y), p.z)); scene.remove(p.mesh); PROJECTILES.splice(i, 1); continue; }
    if (p.fromPlayer && !hit) {
      for (const b of BOTS) {
        if (b.dying) continue;
        const hitRadius = b.isBoss ? 1.55 : (b.hitRadius || 0.95); const hitHeight = b.isBoss ? 3.5 : (b.hitHeight || 2.4);
        if (Math.hypot(p.x - b.x, p.z - b.z) < hitRadius && p.y >= b.y && p.y <= b.y + hitHeight) {
          if (p.emp) empBurst(new THREE.Vector3(p.x, p.y, p.z));
          else if (p.splash > 0) { /* explodes below */ }
          else { damageBot(b, p.damage); spawnImpact(p.x, p.y, p.z, 0xf59e0b); }
          hit = true; break;
        }
      }
    } else if (!p.fromPlayer && !hit) {
      if (Math.hypot(p.x - STATE.player.x, p.z - STATE.player.z) < 0.85 && Math.abs(p.y - (STATE.player.y + 1.2)) < 1.2) {
        damagePlayer(p.damage, { x: p.x - p.vx, z: p.z - p.vz }); spawnImpact(p.x, p.y, p.z, 0xef4444); hit = true;
      }
    }
    if (hit && p.fromPlayer && CELL_DOOR && !CELL_DOOR.open && Math.abs(p.z - CELL_DOOR.z) < 1.3 && Math.abs(p.x - CELL_DOOR.x) < CELL_DOOR.w / 2 + 0.5) damageCellDoor(p.damage);
    if (hit) {
      if (p.fromPlayer && p.splash > 0) triggerExplosion(p.x, Math.max(0.1, p.y), p.z, p.splash, p.damage);
      else if (p.fromPlayer) spawnImpact(p.x, Math.max(0.05, p.y), p.z, 0xfbbf24);
      scene.remove(p.mesh); PROJECTILES.splice(i, 1);
    }
  }

  for (let i = GRENADES.length - 1; i >= 0; i--) {
    const g = GRENADES[i]; g.timer -= dt; g.vy -= STATE.gravity * dt;
    if (collidesAt(g.x + g.vx * dt, g.z, 0.2)) g.vx *= -0.65;
    if (collidesAt(g.x, g.z + g.vz * dt, 0.2)) g.vz *= -0.65;
    g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
    const fl = getGroundHeightAt(g.x, g.z, g.y);
    if (g.y < fl + 0.2) { g.y = fl + 0.2; g.vy = Math.abs(g.vy) * 0.55; g.vx *= 0.82; g.vz *= 0.82; }
    g.mesh.position.set(g.x, g.y, g.z);
    if (g.timer <= 0) { triggerExplosion(g.x, g.y, g.z, 13.5, 165); scene.remove(g.mesh); GRENADES.splice(i, 1); }
  }

  for (let i = NAPALM_POOLS.length - 1; i >= 0; i--) {
    const np = NAPALM_POOLS[i]; np.timer -= dt; np.tick -= dt; np.emitTick -= dt;
    if (np.tongues) np.tongues.forEach(t => { t.phase += dt * 14; t.mesh.scale.y = 0.75 + 0.55 * Math.abs(Math.sin(t.phase)); t.mesh.rotation.y += dt * 4; });
    if (np.fireLight) np.fireLight.intensity = 1.5 + Math.sin(now * 0.03) * 0.6;
    if (np.emitTick <= 0) { np.emitTick = 0.16; spawnVolumetricFlameBurst(np.x, np.y || 0, np.z, 2, np.radius * 1.15); }
    if (np.tick <= 0) { np.tick = 0.35; BOTS.forEach(b => { if (!b.dying && Math.hypot(b.x - np.x, b.z - np.z) < np.radius) damageBot(b, 9); }); }
    if (np.timer <= 0) { scene.remove(np.mesh); NAPALM_POOLS.splice(i, 1); }
  }

  if (STATE.menderCueAt && STATE.combatActive && performance.now() >= STATE.menderCueAt) { STATE.menderCueAt = 0; menderDispatchCue(); }
  BOTS.forEach(b => {
    if (b.isMender && !b.dying && STATE.combatActive) { updateMender(b, dt, now); return; }
    if (b.dying) {
      b.deathTimer -= dt;
      if (b.rig.root) {
        b.rig.root.rotation.x = Math.min(1.2, b.rig.root.rotation.x + dt * 2.2);
        b.rig.root.position.y = Math.max(b.y - 0.4, b.rig.root.position.y - dt * 1.5);
        if (b.rig.armorMat && b.rig.armorMat.emissive) { b.rig.armorMat.emissive.setHex(0xff4400); b.rig.armorMat.emissiveIntensity = 1.2; }
      }
      if (b.weapon) { b.weapon.position.y = Math.max(b.y + 0.1, b.weapon.position.y - dt * 2.5); b.weapon.rotateX(dt * 2); }
      if (b.deathTimer <= 0) finishBotKill(b);
      return;
    }
    if (!STATE.combatActive) { b.rig.root.position.set(b.x, b.y, b.z); if (b.mixer) b.mixer.update(0); updateEnemyWeapon(b); return; }
    if (!b.isBoss) { updateBotAI(b, dt, now); return; }
    const dxToP = STATE.player.x - b.x; const dzToP = STATE.player.z - b.z; const dist = Math.hypot(dxToP, dzToP);
    b.yaw = Math.atan2(dxToP, dzToP); b.rig.root.rotation.y = b.yaw;
    if (b.isHumanGuard && dist < 48) {
      b.radioCalloutCooldown = (b.radioCalloutCooldown || 8) - dt;
      if (b.radioCalloutCooldown <= 0) {
        b.radioCalloutCooldown = 11 + Math.random() * 9;
        SFX.playRadioChatter(`${b.name}: suspect sighted at ${Math.round(dist)} meters. Engaging.`, 'STROGG COMMS');
      }
    }
    b.strafeSwitchTimer -= dt;
    if (b.strafeSwitchTimer <= 0) {
      b.strafeDir = -b.strafeDir; b.strafeSwitchTimer = 0.85 + Math.random() * 1.3;
      if (!b.isBoss && (b.patrolType || 'ground') === 'ground' && b.y <= 0.05 && Math.random() < 0.38) b.vy = 6.8;
    }
    const baseSpd = b.isBoss ? (7.8 * STATE.bossSpeedMult) : (6.8 * STATE.botSkill);
    if (b.patrolType === 'tower') {
      b.x = Math.max((b.homeX || b.x) - 2.1, Math.min((b.homeX || b.x) + 2.1, b.x + Math.cos(now * 0.002) * 1.8 * dt * b.strafeDir));
      b.z = Math.max((b.homeZ || b.z) - 2.1, Math.min((b.homeZ || b.z) + 2.1, b.z + Math.sin(now * 0.002) * 1.8 * dt * b.strafeDir));
    } else if (b.patrolType === 'catwalk') {
      const stepZ = (dzToP / (dist || 1)) * (dist > 18 ? 0.85 : -0.4) * baseSpd * dt;
      if (getGroundHeightAt(b.x, b.z + stepZ, b.y) >= 4.0) b.z += stepZ;
    } else {
      const approach = b.isBoss ? (dist > 6.5 ? 1.0 : 0.25) : (dist > 14 ? 0.85 : (dist < 7 ? -0.5 : 0.15));
      const vx = (Math.sin(b.yaw) * approach + Math.cos(b.yaw) * b.strafeDir * 0.65) * baseSpd;
      const vz = (Math.cos(b.yaw) * approach - Math.sin(b.yaw) * b.strafeDir * 0.65) * baseSpd;
      if (!collidesAt(b.x + vx * dt, b.z, 0.7)) b.x += vx * dt;
      if (!collidesAt(b.x, b.z + vz * dt, 0.7)) b.z += vz * dt;
    }
    const botFloor = getGroundHeightAt(b.x, b.z, b.y);
    b.y += b.vy * dt; b.vy -= STATE.gravity * dt;
    if (b.y <= botFloor) { b.y = botFloor; b.vy = 0; }
    b.rig.root.position.set(b.x, b.y, b.z);

    if (b.mixer) b.mixer.update(dt);
    else if (b.rig.leftLeg && b.rig.leftLeg !== b.rig.root) {
      // heavier stomping walk
      const stomp = b.heavy || b.isBoss ? 7.0 : 8.5;
      b.walkPhase += dt * stomp;
      const swing = Math.sin(b.walkPhase) * (b.heavy ? 0.78 : 0.62);
      b.rig.leftLeg.rotation.x = swing; b.rig.rightLeg.rotation.x = -swing;
      b.rig.leftArm.rotation.x = -swing * 0.45;
      b.rig.rightArm.rotation.x = b.isBoss ? (-0.4 + Math.sin(b.walkPhase) * 0.45) : (-0.25 + swing * 0.2);
      const basePelvisY = (b.isBoss ? 1.15 : (b.rig.scale ? 1.12 * b.rig.scale : 1.12));
      b.rig.pelvis.position.y = basePelvisY + Math.abs(Math.cos(b.walkPhase)) * (b.heavy ? 0.1 : 0.07);
      b.rig.torso.rotation.y = Math.sin(b.walkPhase) * 0.12;
      b.rig.torso.rotation.x *= 0.9;
    }
    if (b.flinchTimer > 0) {
      b.flinchTimer -= dt;
      if (b.rig.armorMat && b.rig.armorMat.emissive) { b.rig.armorMat.emissive.setHex(0xffffff); b.rig.armorMat.emissiveIntensity = 0.85; }
    } else if (b.rig.armorMat && b.rig.armorMat.emissive) {
      b.rig.armorMat.emissive.setHex(0x000000); b.rig.armorMat.emissiveIntensity = 0;
    }

    b.fireCooldown -= dt;
    if (b.fireCooldown <= 0 && dist < 58) {
      b.fireCooldown = b.isBoss ? 0.95 : (1.15 / (STATE.botSkill * (STATE.diff?.fire || 1)));
      const sy = b.y + (b.isBoss ? 2.1 : 1.5);
      const muzzle = new THREE.Vector3(b.x + Math.sin(b.yaw) * 0.8, sy, b.z + Math.cos(b.yaw) * 0.8);
      spawnMuzzleFlash(muzzle, b.isBoss ? 0xff3300 : 0xf97316, false);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(b.isBoss ? 0.24 : 0.11, 8, 8), new THREE.MeshBasicMaterial({ color: b.isBoss ? 0xff3300 : 0xf97316, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending }));
      orb.position.copy(muzzle); scene.add(orb);
      const aimDir = new THREE.Vector3(STATE.player.x - b.x, (STATE.player.y + 1.2) - sy, STATE.player.z - b.z).normalize();
      PROJECTILES.push({ mesh: orb, x: muzzle.x, y: sy, z: muzzle.z, vx: aimDir.x * 38, vy: aimDir.y * 38, vz: aimDir.z * 38, damage: Math.round((b.isBoss ? 22 : 11) * (STATE.diff?.dmg || 1)), splash: 0, fromPlayer: false, life: 2.5 });
    }
  });

  updateAIGlobal(dt);
  updateLore(dt, now);
  updateFloorLogic(dt, now);
  drawMinimap();
  renderFrame();
}

// ============================================================================
// STUDIO, MESHY API PANEL, PARTY, EXPORT, STARTUP
// ============================================================================
let currentBrush = 'select';
let selectedMapObj = null;
let isDraggingMapObj = false;

function toggleStudioEditor() {
  if (IS_RELEASE_BUILD) return;
  const modal = document.getElementById('studio-editor-modal');
  const open = modal.classList.contains('hidden');
  if (open) {
    STATE.pausedForStudio = true; document.exitPointerLock?.();
    modal.classList.remove('hidden'); drawArchitectBlueprint(); renderStudioWeaponsList(); renderStudioBotRoster();
  } else { STATE.pausedForStudio = false; modal.classList.add('hidden'); }
}
document.getElementById('btn-open-studio').onclick = toggleStudioEditor;
document.getElementById('btn-close-studio').onclick = toggleStudioEditor;
document.querySelectorAll('.studio-tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.studio-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(btn.dataset.stab).classList.remove('hidden');
  };
});
document.querySelectorAll('.map-brush-btn').forEach(btn => {
  btn.onclick = () => {
    currentBrush = btn.dataset.brush;
    document.querySelectorAll('.map-brush-btn').forEach(b => b.className = 'map-brush-btn py-1.5 px-2 rounded bg-slate-800 text-gray-200 font-bold text-left');
    btn.className = 'map-brush-btn py-1.5 px-2 rounded bg-cyan-500 text-black font-black text-left';
  };
});

const archCanvas = document.getElementById('architect-canvas');
const archCtx = archCanvas.getContext('2d');
function worldToBlueprint(x, z) { return { px: archCanvas.width / 2 + x * 3.2, pz: archCanvas.height / 2 + z * 3.2 }; }
function blueprintToWorld(px, pz) { return { x: Math.round((px - archCanvas.width / 2) / 3.2), z: Math.round((pz - archCanvas.height / 2) / 3.2) }; }
function drawArchitectBlueprint() {
  archCtx.fillStyle = '#0c0a08'; archCtx.fillRect(0, 0, archCanvas.width, archCanvas.height);
  archCtx.strokeStyle = '#2a2218'; archCtx.lineWidth = 1;
  for (let x = 0; x < archCanvas.width; x += 32) { archCtx.beginPath(); archCtx.moveTo(x, 0); archCtx.lineTo(x, archCanvas.height); archCtx.stroke(); }
  for (let y = 0; y < archCanvas.height; y += 32) { archCtx.beginPath(); archCtx.moveTo(0, y); archCtx.lineTo(archCanvas.width, y); archCtx.stroke(); }
  MAP_OBJECTS.forEach(obj => {
    const { px, pz } = worldToBlueprint(obj.x, obj.z);
    const w = Math.max(12, (obj.w || 3) * 3.2); const d = Math.max(12, (obj.d || 3) * 3.2);
    archCtx.fillStyle = obj.color || '#f59e0b'; archCtx.fillRect(px - w / 2, pz - d / 2, w, d);
    if (selectedMapObj === obj) { archCtx.strokeStyle = '#ffffff'; archCtx.lineWidth = 2.5; archCtx.strokeRect(px - w / 2 - 2, pz - d / 2 - 2, w + 4, d + 4); }
  });
}
function populateInspector(obj) {
  const empty = document.getElementById('inspector-empty'); const fields = document.getElementById('inspector-fields');
  if (!obj) { empty.classList.remove('hidden'); fields.classList.add('hidden'); return; }
  empty.classList.add('hidden'); fields.classList.remove('hidden');
  document.getElementById('insp-type').value = obj.type;
  document.getElementById('insp-x').value = obj.x; document.getElementById('insp-z').value = obj.z;
  document.getElementById('insp-w').value = obj.w || 3; document.getElementById('insp-d').value = obj.d || 3; document.getElementById('insp-h').value = obj.h || 4;
  document.getElementById('insp-title').value = obj.title || ''; document.getElementById('insp-sub').value = obj.sub || '';
}
archCanvas.addEventListener('mousedown', e => {
  const rect = archCanvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (archCanvas.width / rect.width);
  const pz = (e.clientY - rect.top) * (archCanvas.height / rect.height);
  const { x, z } = blueprintToWorld(px, pz);
  if (currentBrush === 'select') {
    selectedMapObj = MAP_OBJECTS.find(o => Math.hypot(o.x - x, o.z - z) < 5) || null;
    isDraggingMapObj = !!selectedMapObj; populateInspector(selectedMapObj); drawArchitectBlueprint();
  } else if (currentBrush === 'bot' || currentBrush === 'guard') {
    const isGuard = currentBrush === 'guard';
    BOT_ROSTER.push({
      id: `${currentBrush}-${Date.now()}`,
      name: isGuard ? `Strogg-Guard-${BOT_ROSTER.length + 1}` : `Heavy-Sentinel-${BOT_ROSTER.length + 1}`,
      role: isGuard ? 'human_guard' : 'bot',
      armorColor: isGuard ? 0x4a3b28 : 0x3f2a1a, tint: isGuard ? 0xf59e0b : 0xef4444,
      weapon: 0, x, y: getGroundHeightAt(x, z, 6), z, maxHealth: 125, patrolType: 'ground'
    });
    renderStudioBotRoster();
  } else {
    const defaults = {
      wall: { w: 16, d: 3, h: 10, color: '#f59e0b' }, ibeam: { w: 1.4, d: 1.4, h: 16, color: '#b45309' },
      catwalk: { w: 5.2, d: 24, h: 4.6, color: '#facc15', hasRampSouth: true }, tower: { w: 6.5, d: 6.5, h: 4.6, color: '#ef4444' },
      emp: { w: 4, d: 4, h: 8, color: '#f59e0b' }, coil: { w: 4, d: 4, h: 8, color: '#facc15' },
      cryo: { w: 2.6, d: 2.6, h: 4.8, color: '#22c55e' }, crate: { w: 3.2, d: 3.2, h: 3.2, color: '#b45309' },
      forklift: { w: 3.2, d: 4.4, h: 3.2, color: '#facc15' }, pillar: { w: 2.4, d: 2.4, h: 9, color: '#ef4444' },
      server: { w: 3.4, d: 2.2, h: 5.5, color: '#f59e0b' },
      sign: { w: 10, d: 0.4, h: 2.6, color: '#f59e0b', title: 'MOSES TERMINAL', sub: 'STROGG SURVEILLANCE' }
    }[currentBrush] || { w: 3.2, d: 3.2, h: 4.8, color: '#f59e0b' };
    const newObj = { id: `${currentBrush}-${Date.now()}`, type: currentBrush, x, z, rot: 0, ...defaults };
    MAP_OBJECTS.push(newObj); selectedMapObj = newObj; populateInspector(newObj); buildArenaMap(); drawArchitectBlueprint();
  }
});
archCanvas.addEventListener('mousemove', e => {
  if (!isDraggingMapObj || !selectedMapObj) return;
  const rect = archCanvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (archCanvas.width / rect.width);
  const pz = (e.clientY - rect.top) * (archCanvas.height / rect.height);
  const { x, z } = blueprintToWorld(px, pz);
  selectedMapObj.x = x; selectedMapObj.z = z; populateInspector(selectedMapObj); buildArenaMap(); drawArchitectBlueprint();
});
window.addEventListener('mouseup', () => { isDraggingMapObj = false; });
document.getElementById('btn-insp-apply').onclick = () => {
  if (!selectedMapObj) return;
  selectedMapObj.x = parseFloat(document.getElementById('insp-x').value) || 0;
  selectedMapObj.z = parseFloat(document.getElementById('insp-z').value) || 0;
  selectedMapObj.w = parseFloat(document.getElementById('insp-w').value) || 3;
  selectedMapObj.d = parseFloat(document.getElementById('insp-d').value) || 3;
  selectedMapObj.h = parseFloat(document.getElementById('insp-h').value) || 4;
  selectedMapObj.title = document.getElementById('insp-title').value;
  selectedMapObj.sub = document.getElementById('insp-sub').value;
  buildArenaMap(); drawArchitectBlueprint();
};
document.getElementById('btn-insp-delete').onclick = () => {
  if (!selectedMapObj) return;
  MAP_OBJECTS = MAP_OBJECTS.filter(o => o !== selectedMapObj); selectedMapObj = null;
  populateInspector(null); buildArenaMap(); drawArchitectBlueprint();
};
window.quickSpawnInFront = function(type) {
  const x = Math.round(STATE.player.x - Math.sin(STATE.player.yaw) * 6);
  const z = Math.round(STATE.player.z - Math.cos(STATE.player.yaw) * 6);
  const defaults = {
    wall: { w: 16, d: 3, h: 10, color: '#f59e0b' }, ibeam: { w: 1.4, d: 1.4, h: 16, color: '#b45309' },
    catwalk: { w: 5.2, d: 24, h: 4.6, color: '#facc15', hasRampSouth: true }, tower: { w: 6.5, d: 6.5, h: 4.6, color: '#ef4444' },
    emp: { w: 4, d: 4, h: 8, color: '#f59e0b' }, cryo: { w: 2.6, d: 2.6, h: 4.8, color: '#22c55e' },
    crate: { w: 3.2, d: 3.2, h: 3.2, color: '#b45309' }, forklift: { w: 3.2, d: 4.4, h: 3.2, color: '#facc15' },
    server: { w: 3.4, d: 2.2, h: 5.5, color: '#f59e0b' }
  }[type] || { w: 3.2, d: 3.2, h: 4.8, color: '#f59e0b' };
  MAP_OBJECTS.push({ id: `${type}-${Date.now()}`, type, x, z, rot: 0, ...defaults });
  buildArenaMap(); drawArchitectBlueprint();
};

function setGltfStatus(msg) { const el = document.getElementById('gltf-status'); if (el) el.textContent = msg; }
function setMeshyStatus(msg) { const el = document.getElementById('meshy-status'); if (el) el.textContent = msg; }

function placeMeshyModel(gltf, role, targetHeightInput) {
  const model = gltf.scene || gltf.scenes?.[0];
  if (!model) { setGltfStatus('GLB had no scene.'); return; }
  const desiredHeight = Math.max(0.5, Number(targetHeightInput) || (role === 'boss' ? 3.5 : 2.2));
  const rawBox = new THREE.Box3().setFromObject(model);
  const rawSize = new THREE.Vector3(); rawBox.getSize(rawSize);
  model.scale.setScalar(desiredHeight / Math.max(0.01, rawSize.y));
  const scaledBox = new THREE.Box3().setFromObject(model); model.position.y = -scaledBox.min.y;
  let primaryMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
  model.traverse(c => {
    if (c.isMesh) {
      c.castShadow = true; c.receiveShadow = true;
      if (c.material) { c.material = c.material.clone(); brightenMat(c.material); if (!c.material.emissive) c.material.emissive = new THREE.Color(0x000000); primaryMat = c.material; }
    }
  });
  if (role === 'viewmodel') {
    MESHY_TEMPLATES.viewmodel = { scene: model, animations: gltf.animations || [], targetHeight: desiredHeight };
    buildViewModel(); setGltfStatus('Pulse cannon viewmodel replaced with Meshy GLB.'); return;
  }
  if (role === 'replace_guards' || role === 'replace_bots') {
    const isGuardTarget = role === 'replace_guards';
    const tpl = { scene: model, animations: gltf.animations || [], targetHeight: desiredHeight };
    if (isGuardTarget) MESHY_TEMPLATES.guard = tpl; else MESHY_TEMPLATES.bot = tpl;
    let replaced = 0;
    BOTS.forEach(b => {
      if (!b.isBoss && !b.dying && b.isHumanGuard === isGuardTarget) {
        scene.remove(b.rig.root);
        const newRig = buildRigFromMeshyTemplate(tpl, b.name, false);
        newRig.root.position.set(b.x, b.y, b.z); newRig.hb.update(b.health, b.maxHealth); scene.add(newRig.root);
        b.rig = newRig; b.mixer = newRig.mixer; replaced++;
      }
    });
    setGltfStatus(`Replaced ${replaced} ${isGuardTarget ? 'Guards' : 'Heavies'} with Meshy GLB.`);
    return;
  }
  const px = STATE.player.x - Math.sin(STATE.player.yaw) * 5;
  const pz = STATE.player.z - Math.cos(STATE.player.yaw) * 5;
  const py = getGroundHeightAt(px, pz, STATE.player.y);
  const wrapper = new THREE.Group(); wrapper.add(model); wrapper.position.set(px, py, pz); scene.add(wrapper); MESHY_MODELS.push(wrapper);
  if (role === 'prop') { registerCollider(px - 1.1, px + 1.1, py, py + desiredHeight, pz - 1.1, pz + 1.1); setGltfStatus(`Placed Meshy Prop (${desiredHeight.toFixed(1)}m).`); return; }
  if (role === 'enemy' || role === 'boss') {
    if (role === 'boss') MESHY_TEMPLATES.boss = { scene: model.clone(true), animations: gltf.animations || [], targetHeight: desiredHeight };
    const dummyHb = createHealthBarSprite(role === 'boss' ? '👹 MESHY MINOTAUR' : 'MESHY HOSTILE', role === 'boss');
    dummyHb.sprite.position.set(0, desiredHeight + 0.55, 0); wrapper.add(dummyHb.sprite);
    const maxHp = role === 'boss' ? 750 : 145; dummyHb.update(maxHp, maxHp);
    let mixer = null;
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const clip = gltf.animations.find(a => /walk|run|move/i.test(a.name)) || gltf.animations[0];
      mixer.clipAction(clip).play();
    }
    const dummyRig = { root: wrapper, pelvis: wrapper, torso: wrapper, leftArm: wrapper, rightArm: wrapper, leftLeg: wrapper, rightLeg: wrapper, armorMat: primaryMat, hb: dummyHb, mixer };
    BOTS.push({ id: `meshy-${Date.now()}`, name: role === 'boss' ? '👹 Meshy Minotaur' : 'Meshy Hostile', isBoss: role === 'boss', isHumanGuard: false, patrolType: 'ground', homeX: px, homeZ: pz, rig: dummyRig, mixer, x: px, y: py, z: pz, vy: 0, yaw: 0, health: maxHp, maxHealth: maxHp, weaponIdx: role === 'boss' ? 2 : 0, fireCooldown: 1.2, walkPhase: 0, strafeDir: 1, strafeSwitchTimer: 1, flinchTimer: 0, dying: false, deathTimer: 0 });
    if (role === 'boss') { STATE.bossSpawned = true; document.getElementById('boss-hud').classList.remove('hidden'); document.getElementById('boss-hp-text').textContent = `${maxHp} / ${maxHp}`; }
  }
  setGltfStatus(`Loaded Meshy GLB as ${role}.`); updateHUD();
}

function loadMeshyGLBFromSource(source, role, scale) {
  if (typeof THREE.GLTFLoader !== 'function') { setGltfStatus('GLTFLoader failed to load.'); return; }
  const loader = new THREE.GLTFLoader(); setGltfStatus('Loading Meshy GLB…');
  if (source instanceof ArrayBuffer) loader.parse(source, '', gltf => placeMeshyModel(gltf, role, scale), err => setGltfStatus('Parse failed: ' + err));
  else loader.load(source, gltf => placeMeshyModel(gltf, role, scale), undefined, err => { setGltfStatus('URL load failed (CORS or missing).'); console.error(err); });
}

document.getElementById('btn-load-gltf').onclick = () => {
  const role = document.getElementById('gltf-role-select').value;
  const scale = document.getElementById('gltf-scale-input').value;
  const file = document.getElementById('gltf-file-input').files?.[0];
  const url = document.getElementById('gltf-url-input').value.trim();
  if (file) { const reader = new FileReader(); reader.onload = () => loadMeshyGLBFromSource(reader.result, role, scale); reader.readAsArrayBuffer(file); return; }
  if (url) { loadMeshyGLBFromSource(url, role, scale); return; }
  setGltfStatus('Choose a .glb file or paste a URL.');
};

document.querySelectorAll('.meshy-preset').forEach(btn => {
  btn.onclick = () => { document.getElementById('meshy-prompt').value = btn.dataset.prompt; };
});

async function meshyApiGenerate() {
  const key = (document.getElementById('meshy-api-key').value || '').trim();
  const prompt = (document.getElementById('meshy-prompt').value || '').trim();
  const role = document.getElementById('meshy-role').value;
  const doRefine = document.getElementById('meshy-do-refine').checked;
  if (!key) { setMeshyStatus('Paste your own Meshy API key first.'); return; }
  if (!prompt) { setMeshyStatus('Enter a prompt.'); return; }
  const headers = { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };
  try {
    setMeshyStatus('Creating preview task…');
    const body = { mode: 'preview', prompt: prompt.slice(0, 800), ai_model: 'meshy-6', should_remesh: true, target_polycount: 25000, target_formats: ['glb'] };
    if (role === 'replace_guards' || role === 'replace_bots' || role === 'boss') body.pose_mode = 'a-pose';
    let res = await fetch('https://api.meshy.ai/openapi/v2/text-to-3d', { method: 'POST', headers, body: JSON.stringify(body) });
    let data = await res.json();
    if (!res.ok) { setMeshyStatus(`Preview create failed (${res.status}): ${data.message || JSON.stringify(data)}`); return; }
    const previewId = data.result;
    setMeshyStatus(`Preview ${previewId} — polling…`);
    let task = null;
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 5000));
      res = await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${previewId}`, { headers });
      task = await res.json();
      setMeshyStatus(`Preview ${task.status} ${task.progress || 0}% (credits so far: ${task.consumed_credits || '?'})`);
      if (task.status === 'SUCCEEDED' || task.status === 'FAILED' || task.status === 'CANCELED') break;
    }
    if (!task || task.status !== 'SUCCEEDED') { setMeshyStatus(`Preview failed: ${(task && task.task_error && task.task_error.message) || task?.status}`); return; }
    let glbUrl = task.model_urls && task.model_urls.glb;
    let credits = task.consumed_credits || 0;
    if (doRefine) {
      setMeshyStatus('Creating refine (textures)…');
      res = await fetch('https://api.meshy.ai/openapi/v2/text-to-3d', { method: 'POST', headers, body: JSON.stringify({ mode: 'refine', preview_task_id: previewId, enable_pbr: true, target_formats: ['glb'], texture_prompt: 'grimy rust brown-green biomechanical plates over flesh, oily metal, amber-red glow' }) });
      data = await res.json();
      if (res.ok && data.result) {
        const refineId = data.result;
        for (let i = 0; i < 120; i++) {
          await new Promise(r => setTimeout(r, 5000));
          res = await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${refineId}`, { headers });
          task = await res.json();
          setMeshyStatus(`Refine ${task.status} ${task.progress || 0}%`);
          if (task.status === 'SUCCEEDED' || task.status === 'FAILED' || task.status === 'CANCELED') break;
        }
        if (task && task.status === 'SUCCEEDED' && task.model_urls && task.model_urls.glb) {
          glbUrl = task.model_urls.glb; credits += task.consumed_credits || 0;
        } else setMeshyStatus('Refine failed — using preview mesh. ' + ((task && task.task_error && task.task_error.message) || ''));
      } else setMeshyStatus(`Refine create failed — using preview. ${data.message || ''}`);
    }
    if (!glbUrl) { setMeshyStatus('No GLB URL returned.'); return; }
    setMeshyStatus(`Downloading GLB (session credits ~${credits})…`);
    loadMeshyGLBFromSource(glbUrl, role, document.getElementById('gltf-scale-input').value);
    setMeshyStatus(`Done. Loaded into role "${role}". Credits used this run ~${credits}. Key was NOT saved into the HTML.`);
  } catch (err) {
    setMeshyStatus('Meshy error: ' + (err.message || err));
  }
}
document.getElementById('btn-meshy-generate').onclick = () => { meshyApiGenerate(); };

window.setGameTitlePreset = function(newTitle) {
  if (!newTitle) return;
  GAME_BRAND_TITLE = newTitle.trim();
  document.title = `${GAME_BRAND_TITLE} — Strogg Sentinel Upgrade`;
  document.getElementById('splash-main-title').textContent = GAME_BRAND_TITLE;
  document.getElementById('modal-title').textContent = GAME_BRAND_TITLE;
  document.getElementById('btn-skip-splash').textContent = `ENTER ${GAME_BRAND_TITLE} ▶`;
  document.getElementById('btn-start').textContent = `DEPLOY TO ${GAME_BRAND_TITLE}`;
  document.getElementById('input-custom-title').value = GAME_BRAND_TITLE;
};
function renderStudioWeaponsList() {
  const container = document.getElementById('weapons-editor-list'); container.innerHTML = '';
  STATE.weapons.forEach((w, idx) => {
    const row = document.createElement('div');
    row.className = 'bg-black/60 border border-gray-800 rounded p-2 flex items-center justify-between gap-2';
    row.innerHTML = `<input value="${w.name}" onchange="STATE.weapons[${idx}].name=this.value;renderWeaponBar();updateHUD();" class="bg-slate-900 border border-gray-700 rounded px-2 py-1 text-amber-300 font-bold w-36">
      <label class="text-[10px] text-gray-400">DMG <input type="number" value="${w.damage}" onchange="STATE.weapons[${idx}].damage=parseFloat(this.value)" class="w-14 bg-slate-900 border border-gray-700 rounded px-1 py-0.5 text-white"></label>
      <label class="text-[10px] text-gray-400">RATE <input type="number" step="0.02" value="${w.fireRate}" onchange="STATE.weapons[${idx}].fireRate=parseFloat(this.value)" class="w-14 bg-slate-900 border border-gray-700 rounded px-1 py-0.5 text-white"></label>`;
    container.appendChild(row);
  });
}
document.getElementById('btn-add-weapon').onclick = () => {
  STATE.weapons.push({ name: 'EMP Railgun', ammo: 20, maxAmmo: 20, damage: 195, pellets: 1, fireRate: 0.75, spread: 0.001, color: 0x38bdf8, speed: 120, splash: 6.0, recoil: 0.3 });
  renderStudioWeaponsList(); renderWeaponBar();
};
document.getElementById('btn-apply-physics').onclick = () => {
  STATE.walkSpeed = parseFloat(document.getElementById('tune-walk').value) || 14;
  STATE.jumpVel = parseFloat(document.getElementById('tune-jump').value) || 8.5;
  STATE.bossScale = parseFloat(document.getElementById('tune-boss-scale').value) || 1.75;
  STATE.bossSpeedMult = parseFloat(document.getElementById('tune-boss-speed').value) || 1.0;
};
function renderStudioBotRoster() {
  const container = document.getElementById('bot-roster-editor'); container.innerHTML = '';
  BOT_ROSTER.forEach((b, idx) => {
    const row = document.createElement('div');
    row.className = 'bg-black/60 border border-gray-800 rounded p-2 flex items-center justify-between gap-2';
    row.innerHTML = `<input value="${b.name}" onchange="BOT_ROSTER[${idx}].name=this.value" class="bg-slate-900 border border-gray-700 rounded px-2 py-1 text-amber-300 font-bold w-40">
      <label class="text-[10px] text-gray-400">HP <input type="number" value="${b.maxHealth}" onchange="BOT_ROSTER[${idx}].maxHealth=parseInt(this.value)" class="w-16 bg-slate-900 border border-gray-700 rounded px-1 py-0.5 text-white"></label>`;
    container.appendChild(row);
  });
}

function compileAndDownloadHTML(stripEditorForRelease) {
  const clone = document.documentElement.cloneNode(true);
  if (stripEditorForRelease) clone.querySelectorAll('.dev-only-ui').forEach(el => el.remove());
  // scrub any typed Meshy key from export
  const keyInput = clone.querySelector('#meshy-api-key'); if (keyInput) keyInput.setAttribute('value', '');
  let htmlText = '<!DOCTYPE html>\n' + clone.outerHTML;
  htmlText = htmlText.replace(/let IS_RELEASE_BUILD = (true|false);/, `let IS_RELEASE_BUILD = ${stripEditorForRelease};`);
  htmlText = htmlText.replace(/let GAME_BRAND_TITLE = ".*?";/, `let GAME_BRAND_TITLE = ${JSON.stringify(GAME_BRAND_TITLE)};`);
  htmlText = htmlText.replace(/let MAP_OBJECTS = \[[\s\S]*?\];/, `let MAP_OBJECTS = ${JSON.stringify(MAP_OBJECTS, null, 2)};`);
  htmlText = htmlText.replace(/let BOT_ROSTER = \[[\s\S]*?\];/, `let BOT_ROSTER = ${JSON.stringify(BOT_ROSTER, null, 2)};`);
  const blob = new Blob([htmlText], { type: 'text/html' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = stripEditorForRelease ? 'dystopia-release.html' : 'dystopia-master-editor.html'; a.click();
}
document.getElementById('btn-export-player').onclick = () => compileAndDownloadHTML(true);
document.getElementById('btn-export-dev').onclick = () => compileAndDownloadHTML(false);



document.getElementById('btn-skip-splash').onclick = () => {
  document.getElementById('splash-screen').classList.add('hidden');
  document.getElementById('game-modal').classList.remove('hidden');
};
document.getElementById('btn-instructions').onclick = () => {
  STATE.running = false; document.exitPointerLock?.(); document.getElementById('game-modal').classList.remove('hidden');
};
document.getElementById('btn-start').onclick = () => {
  SFX.init(); initVoice();
  STATE.botSkill = parseFloat(document.getElementById('select-bot-diff').value) || 1.0;
  const startLvl = parseInt(document.getElementById('select-level').value) || 1;
  document.getElementById('game-modal').classList.add('hidden');
  STATE.running = true; buildViewModel(); renderWeaponBar(); startCampaignLevel(startLvl);
  if (!IS_COARSE) setTimeout(() => { try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }, 80);
};
document.getElementById('tab-solo-mode').onclick = () => {
  document.getElementById('panel-solo-config').classList.remove('hidden'); document.getElementById('panel-party-config').classList.add('hidden');
  document.getElementById('tab-solo-mode').className = 'q3-tab action-btn py-2 text-xs bg-cyan-500';
  document.getElementById('tab-party-mode').className = 'q3-tab action-btn py-2 text-xs';
};
document.getElementById('tab-party-mode').onclick = () => {
  document.getElementById('panel-solo-config').classList.add('hidden'); document.getElementById('panel-party-config').classList.remove('hidden');
  document.getElementById('tab-party-mode').className = 'q3-tab action-btn py-2 text-xs bg-cyan-500';
  document.getElementById('tab-solo-mode').className = 'q3-tab action-btn py-2 text-xs';
};
document.getElementById('slider-bright').oninput = e => setBrightness((parseFloat(e.target.value) || 100) / 100);
setBrightness(BRIGHTNESS);
document.getElementById('btn-shadows').onclick = () => setShadows(!SHADOWS_ON);
setShadows(SHADOWS_ON);
function brightenScene() { scene.traverse(o => { if (o.isMesh && o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(brightenMat); }); }
setInterval(brightenScene, 2000);
document.getElementById('slider-sens').oninput = e => { STATE.sens = (parseFloat(e.target.value) || 125) / 100; document.getElementById('sens-value').textContent = `${Math.round(STATE.sens * 100)}%`; };
document.getElementById('slider-assist').oninput = e => { STATE.aimAssist = (parseFloat(e.target.value) || 80) / 100; document.getElementById('assist-value').textContent = `${Math.round(STATE.aimAssist * 100)}%`; };

let hudEditing = false; const HUD_DEFAULTS = {};
document.querySelectorAll('.customizable-btn').forEach(btn => {
  HUD_DEFAULTS[btn.id] = { left: btn.style.left, top: btn.style.top, scale: 1 };
  let drag = null;
  btn.addEventListener('pointerdown', e => { if (!hudEditing) return; e.preventDefault(); drag = { x: e.clientX, y: e.clientY, l: btn.offsetLeft, t: btn.offsetTop }; btn.setPointerCapture(e.pointerId); });
  btn.addEventListener('pointermove', e => { if (!drag) return; const nx = drag.l + (e.clientX - drag.x); const ny = drag.t + (e.clientY - drag.y); btn.style.left = `${(nx / window.innerWidth) * 100}%`; btn.style.top = `${(ny / window.innerHeight) * 100}%`; });
  btn.addEventListener('pointerup', () => { drag = null; });
});
document.getElementById('btn-edit-hud').onclick = () => { hudEditing = true; document.getElementById('hud-editor-bar').classList.remove('hidden'); };
document.getElementById('btn-save-hud').onclick = () => { hudEditing = false; document.getElementById('hud-editor-bar').classList.add('hidden'); };
document.getElementById('btn-reset-hud').onclick = () => {
  document.querySelectorAll('.customizable-btn').forEach(btn => { const d = HUD_DEFAULTS[btn.id]; if (!d) return; btn.style.left = d.left; btn.style.top = d.top; btn.style.transform = 'translate(-50%, -50%)'; });
  document.getElementById('slider-btn-scale').value = 100;
};
document.getElementById('slider-btn-scale').oninput = e => {
  const s = (parseFloat(e.target.value) || 100) / 100;
  document.querySelectorAll('.customizable-btn').forEach(btn => { btn.style.transform = `translate(-50%, -50%) scale(${s})`; });
};

function partyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)]; return s;
}
let partyPeer = null, partyConn = null, remotePlayerMesh = null;
function upsertRemotePlayer(p) {
  if (!remotePlayerMesh) {
    const rig = createDoomSentinel(0x0ea5e9, 0x22d3ee, 'CO-OP OPERATOR', false);
    remotePlayerMesh = rig.root; scene.add(remotePlayerMesh);
  }
  remotePlayerMesh.position.set(p.x, p.y, p.z); remotePlayerMesh.rotation.y = p.yaw || 0;
}
function partySend() {
  if (!partyConn || partyConn.open !== true) return;
  partyConn.send({ t: 'pose', x: STATE.player.x, y: STATE.player.y, z: STATE.player.z, yaw: STATE.player.yaw, health: STATE.player.health });
}
setInterval(partySend, 80);
function bindPartyConn(conn) {
  partyConn = conn;
  conn.on('data', data => { if (data && data.t === 'pose') upsertRemotePlayer(data); });
  conn.on('open', () => { document.getElementById('lobby-status').textContent = 'Linked'; });
}
document.getElementById('btn-host-party').onclick = () => {
  const code = partyCode(); document.getElementById('lobby-status').textContent = 'Hosting…';
  try { partyPeer = new Peer(`dys-${code.toLowerCase()}`); } catch (err) { document.getElementById('lobby-status').textContent = 'PeerJS unavailable'; return; }
  partyPeer.on('open', () => {
    document.getElementById('qr-wrapper').classList.remove('hidden');
    document.getElementById('qr-room-label').textContent = `CODE: ${code}`;
    document.getElementById('qr-container').innerHTML = '';
    if (window.QRCode) new QRCode(document.getElementById('qr-container'), { text: code, width: 128, height: 128 });
    document.getElementById('lobby-status').textContent = `Host ${code}`;
  });
  partyPeer.on('connection', bindPartyConn);
  partyPeer.on('error', err => { document.getElementById('lobby-status').textContent = 'Host failed: ' + (err.type || 'error'); });
};
document.getElementById('btn-join-party').onclick = () => {
  const code = (document.getElementById('input-join-code').value || '').trim().toUpperCase();
  if (code.length < 4) { document.getElementById('lobby-status').textContent = 'Enter a 5-letter code'; return; }
  document.getElementById('lobby-status').textContent = 'Joining…';
  partyPeer = new Peer();
  partyPeer.on('open', () => { bindPartyConn(partyPeer.connect(`dys-${code.toLowerCase()}`)); });
  partyPeer.on('error', err => { document.getElementById('lobby-status').textContent = 'Join failed: ' + (err.type || 'error'); });
};
document.getElementById('btn-fullscreen').onclick = () => {
  const root = document.documentElement;
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) (root.requestFullscreen || root.webkitRequestFullscreen || root.webkitRequestFullScreen)?.call(root);
    else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
  } catch (err) {}
};
document.getElementById('btn-audio').onclick = () => { SFX.muted = !SFX.muted; document.getElementById('audio-icon').textContent = SFX.muted ? '🔇' : '🔊'; };

function fitGameViewport() {
  const { w, h } = viewSize();
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(typeof gfxPixelRatio === 'function' ? gfxPixelRatio() : Math.min(window.devicePixelRatio || 1, IS_COARSE ? 1.1 : 2));
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
}
// Round 16: robust rotation (iOS Safari reports stale sizes right after orientationchange)
let _fitRaf = 0, _fitTimers = [];
function scheduleFit() {
  cancelAnimationFrame(_fitRaf); _fitRaf = requestAnimationFrame(() => { setAppHeight(); fitGameViewport(); });
  _fitTimers.forEach(clearTimeout); _fitTimers = [120, 350, 700, 1200].map(t => setTimeout(() => { setAppHeight(); fitGameViewport(); if (document.body.classList.contains('playing')) window.scrollTo(0, 0); }, t));
}
function setAppHeight() { const { h } = viewSize(); document.documentElement.style.setProperty('--appH', h + 'px'); document.body.classList.toggle('portrait', h > viewSize().w); }
window.addEventListener('resize', scheduleFit);
window.addEventListener('orientationchange', scheduleFit);
if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', scheduleFit);
if (window.visualViewport) { window.visualViewport.addEventListener('resize', scheduleFit); window.visualViewport.addEventListener('scroll', () => { if (document.body.classList.contains('playing')) window.scrollTo(0, 0); }); }
window.addEventListener('pageshow', scheduleFit);
setAppHeight();

// ---- qrcode-generator 1.4.4 (c) Kazuhiko Arase, MIT license — inlined so the QR works offline ----
var qrcode=function(){var t=function(t,r){var e=t,n=g[r],o=null,i=0,a=null,u=[],f={},c=function(t,r){o=function(t){for(var r=new Array(t),e=0;e<t;e+=1){r[e]=new Array(t);for(var n=0;n<t;n+=1)r[e][n]=null}return r}(i=4*e+17),l(0,0),l(i-7,0),l(0,i-7),s(),h(),d(t,r),e>=7&&v(t),null==a&&(a=p(e,n,u)),w(a,r)},l=function(t,r){for(var e=-1;e<=7;e+=1)if(!(t+e<=-1||i<=t+e))for(var n=-1;n<=7;n+=1)r+n<=-1||i<=r+n||(o[t+e][r+n]=0<=e&&e<=6&&(0==n||6==n)||0<=n&&n<=6&&(0==e||6==e)||2<=e&&e<=4&&2<=n&&n<=4)},h=function(){for(var t=8;t<i-8;t+=1)null==o[t][6]&&(o[t][6]=t%2==0);for(var r=8;r<i-8;r+=1)null==o[6][r]&&(o[6][r]=r%2==0)},s=function(){for(var t=B.getPatternPosition(e),r=0;r<t.length;r+=1)for(var n=0;n<t.length;n+=1){var i=t[r],a=t[n];if(null==o[i][a])for(var u=-2;u<=2;u+=1)for(var f=-2;f<=2;f+=1)o[i+u][a+f]=-2==u||2==u||-2==f||2==f||0==u&&0==f}},v=function(t){for(var r=B.getBCHTypeNumber(e),n=0;n<18;n+=1){var a=!t&&1==(r>>n&1);o[Math.floor(n/3)][n%3+i-8-3]=a}for(n=0;n<18;n+=1){a=!t&&1==(r>>n&1);o[n%3+i-8-3][Math.floor(n/3)]=a}},d=function(t,r){for(var e=n<<3|r,a=B.getBCHTypeInfo(e),u=0;u<15;u+=1){var f=!t&&1==(a>>u&1);u<6?o[u][8]=f:u<8?o[u+1][8]=f:o[i-15+u][8]=f}for(u=0;u<15;u+=1){f=!t&&1==(a>>u&1);u<8?o[8][i-u-1]=f:u<9?o[8][15-u-1+1]=f:o[8][15-u-1]=f}o[i-8][8]=!t},w=function(t,r){for(var e=-1,n=i-1,a=7,u=0,f=B.getMaskFunction(r),c=i-1;c>0;c-=2)for(6==c&&(c-=1);;){for(var g=0;g<2;g+=1)if(null==o[n][c-g]){var l=!1;u<t.length&&(l=1==(t[u]>>>a&1)),f(n,c-g)&&(l=!l),o[n][c-g]=l,-1==(a-=1)&&(u+=1,a=7)}if((n+=e)<0||i<=n){n-=e,e=-e;break}}},p=function(t,r,e){for(var n=A.getRSBlocks(t,r),o=b(),i=0;i<e.length;i+=1){var a=e[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var u=0;for(i=0;i<n.length;i+=1)u+=n[i].dataCount;if(o.getLengthInBits()>8*u)throw"code length overflow. ("+o.getLengthInBits()+">"+8*u+")";for(o.getLengthInBits()+4<=8*u&&o.put(0,4);o.getLengthInBits()%8!=0;)o.putBit(!1);for(;!(o.getLengthInBits()>=8*u||(o.put(236,8),o.getLengthInBits()>=8*u));)o.put(17,8);return function(t,r){for(var e=0,n=0,o=0,i=new Array(r.length),a=new Array(r.length),u=0;u<r.length;u+=1){var f=r[u].dataCount,c=r[u].totalCount-f;n=Math.max(n,f),o=Math.max(o,c),i[u]=new Array(f);for(var g=0;g<i[u].length;g+=1)i[u][g]=255&t.getBuffer()[g+e];e+=f;var l=B.getErrorCorrectPolynomial(c),h=k(i[u],l.getLength()-1).mod(l);for(a[u]=new Array(l.getLength()-1),g=0;g<a[u].length;g+=1){var s=g+h.getLength()-a[u].length;a[u][g]=s>=0?h.getAt(s):0}}var v=0;for(g=0;g<r.length;g+=1)v+=r[g].totalCount;var d=new Array(v),w=0;for(g=0;g<n;g+=1)for(u=0;u<r.length;u+=1)g<i[u].length&&(d[w]=i[u][g],w+=1);for(g=0;g<o;g+=1)for(u=0;u<r.length;u+=1)g<a[u].length&&(d[w]=a[u][g],w+=1);return d}(o,n)};f.addData=function(t,r){var e=null;switch(r=r||"Byte"){case"Numeric":e=M(t);break;case"Alphanumeric":e=x(t);break;case"Byte":e=m(t);break;case"Kanji":e=L(t);break;default:throw"mode:"+r}u.push(e),a=null},f.isDark=function(t,r){if(t<0||i<=t||r<0||i<=r)throw t+","+r;return o[t][r]},f.getModuleCount=function(){return i},f.make=function(){if(e<1){for(var t=1;t<40;t++){for(var r=A.getRSBlocks(t,n),o=b(),i=0;i<u.length;i++){var a=u[i];o.put(a.getMode(),4),o.put(a.getLength(),B.getLengthInBits(a.getMode(),t)),a.write(o)}var g=0;for(i=0;i<r.length;i++)g+=r[i].dataCount;if(o.getLengthInBits()<=8*g)break}e=t}c(!1,function(){for(var t=0,r=0,e=0;e<8;e+=1){c(!0,e);var n=B.getLostPoint(f);(0==e||t>n)&&(t=n,r=e)}return r}())},f.createTableTag=function(t,r){t=t||2;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+(r=void 0===r?4*t:r)+"px;",e+='">',e+="<tbody>";for(var n=0;n<f.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<f.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+t+"px;",e+=" height: "+t+"px;",e+=" background-color: ",e+=f.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},f.createSvgTag=function(t,r,e,n){var o={};"object"==typeof arguments[0]&&(t=(o=arguments[0]).cellSize,r=o.margin,e=o.alt,n=o.title),t=t||2,r=void 0===r?4*t:r,(e="string"==typeof e?{text:e}:e||{}).text=e.text||null,e.id=e.text?e.id||"qrcode-description":null,(n="string"==typeof n?{text:n}:n||{}).text=n.text||null,n.id=n.text?n.id||"qrcode-title":null;var i,a,u,c,g=f.getModuleCount()*t+2*r,l="";for(c="l"+t+",0 0,"+t+" -"+t+",0 0,-"+t+"z ",l+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',l+=o.scalable?"":' width="'+g+'px" height="'+g+'px"',l+=' viewBox="0 0 '+g+" "+g+'" ',l+=' preserveAspectRatio="xMinYMin meet"',l+=n.text||e.text?' role="img" aria-labelledby="'+y([n.id,e.id].join(" ").trim())+'"':"",l+=">",l+=n.text?'<title id="'+y(n.id)+'">'+y(n.text)+"</title>":"",l+=e.text?'<description id="'+y(e.id)+'">'+y(e.text)+"</description>":"",l+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',l+='<path d="',a=0;a<f.getModuleCount();a+=1)for(u=a*t+r,i=0;i<f.getModuleCount();i+=1)f.isDark(a,i)&&(l+="M"+(i*t+r)+","+u+c);return l+='" stroke="transparent" fill="black"/>',l+="</svg>"},f.createDataURL=function(t,r){t=t||2,r=void 0===r?4*t:r;var e=f.getModuleCount()*t+2*r,n=r,o=e-r;return I(e,e,function(r,e){if(n<=r&&r<o&&n<=e&&e<o){var i=Math.floor((r-n)/t),a=Math.floor((e-n)/t);return f.isDark(a,i)?0:1}return 1})},f.createImgTag=function(t,r,e){t=t||2,r=void 0===r?4*t:r;var n=f.getModuleCount()*t+2*r,o="";return o+="<img",o+=' src="',o+=f.createDataURL(t,r),o+='"',o+=' width="',o+=n,o+='"',o+=' height="',o+=n,o+='"',e&&(o+=' alt="',o+=y(e),o+='"'),o+="/>"};var y=function(t){for(var r="",e=0;e<t.length;e+=1){var n=t.charAt(e);switch(n){case"<":r+="&lt;";break;case">":r+="&gt;";break;case"&":r+="&amp;";break;case'"':r+="&quot;";break;default:r+=n}}return r};return f.createASCII=function(t,r){if((t=t||1)<2)return function(t){t=void 0===t?2:t;var r,e,n,o,i,a=1*f.getModuleCount()+2*t,u=t,c=a-t,g={"██":"█","█ ":"▀"," █":"▄","  ":" "},l={"██":"▀","█ ":"▀"," █":" ","  ":" "},h="";for(r=0;r<a;r+=2){for(n=Math.floor((r-u)/1),o=Math.floor((r+1-u)/1),e=0;e<a;e+=1)i="█",u<=e&&e<c&&u<=r&&r<c&&f.isDark(n,Math.floor((e-u)/1))&&(i=" "),u<=e&&e<c&&u<=r+1&&r+1<c&&f.isDark(o,Math.floor((e-u)/1))?i+=" ":i+="█",h+=t<1&&r+1>=c?l[i]:g[i];h+="\n"}return a%2&&t>0?h.substring(0,h.length-a-1)+Array(a+1).join("▀"):h.substring(0,h.length-1)}(r);t-=1,r=void 0===r?2*t:r;var e,n,o,i,a=f.getModuleCount()*t+2*r,u=r,c=a-r,g=Array(t+1).join("██"),l=Array(t+1).join("  "),h="",s="";for(e=0;e<a;e+=1){for(o=Math.floor((e-u)/t),s="",n=0;n<a;n+=1)i=1,u<=n&&n<c&&u<=e&&e<c&&f.isDark(o,Math.floor((n-u)/t))&&(i=0),s+=i?g:l;for(o=0;o<t;o+=1)h+=s+"\n"}return h.substring(0,h.length-1)},f.renderTo2dContext=function(t,r){r=r||2;for(var e=f.getModuleCount(),n=0;n<e;n++)for(var o=0;o<e;o++)t.fillStyle=f.isDark(n,o)?"black":"white",t.fillRect(n*r,o*r,r,r)},f};t.stringToBytes=(t.stringToBytesFuncs={default:function(t){for(var r=[],e=0;e<t.length;e+=1){var n=t.charCodeAt(e);r.push(255&n)}return r}}).default,t.createStringToBytes=function(t,r){var e=function(){for(var e=S(t),n=function(){var t=e.read();if(-1==t)throw"eof";return t},o=0,i={};;){var a=e.read();if(-1==a)break;var u=n(),f=n()<<8|n();i[String.fromCharCode(a<<8|u)]=f,o+=1}if(o!=r)throw o+" != "+r;return i}(),n="?".charCodeAt(0);return function(t){for(var r=[],o=0;o<t.length;o+=1){var i=t.charCodeAt(o);if(i<128)r.push(i);else{var a=e[t.charAt(o)];"number"==typeof a?(255&a)==a?r.push(a):(r.push(a>>>8),r.push(255&a)):r.push(n)}}return r}};var r,e,n,o,i,a=1,u=2,f=4,c=8,g={L:1,M:0,Q:3,H:2},l=0,h=1,s=2,v=3,d=4,w=5,p=6,y=7,B=(r=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],e=1335,n=7973,i=function(t){for(var r=0;0!=t;)r+=1,t>>>=1;return r},(o={}).getBCHTypeInfo=function(t){for(var r=t<<10;i(r)-i(e)>=0;)r^=e<<i(r)-i(e);return 21522^(t<<10|r)},o.getBCHTypeNumber=function(t){for(var r=t<<12;i(r)-i(n)>=0;)r^=n<<i(r)-i(n);return t<<12|r},o.getPatternPosition=function(t){return r[t-1]},o.getMaskFunction=function(t){switch(t){case l:return function(t,r){return(t+r)%2==0};case h:return function(t,r){return t%2==0};case s:return function(t,r){return r%3==0};case v:return function(t,r){return(t+r)%3==0};case d:return function(t,r){return(Math.floor(t/2)+Math.floor(r/3))%2==0};case w:return function(t,r){return t*r%2+t*r%3==0};case p:return function(t,r){return(t*r%2+t*r%3)%2==0};case y:return function(t,r){return(t*r%3+(t+r)%2)%2==0};default:throw"bad maskPattern:"+t}},o.getErrorCorrectPolynomial=function(t){for(var r=k([1],0),e=0;e<t;e+=1)r=r.multiply(k([1,C.gexp(e)],0));return r},o.getLengthInBits=function(t,r){if(1<=r&&r<10)switch(t){case a:return 10;case u:return 9;case f:case c:return 8;default:throw"mode:"+t}else if(r<27)switch(t){case a:return 12;case u:return 11;case f:return 16;case c:return 10;default:throw"mode:"+t}else{if(!(r<41))throw"type:"+r;switch(t){case a:return 14;case u:return 13;case f:return 16;case c:return 12;default:throw"mode:"+t}}},o.getLostPoint=function(t){for(var r=t.getModuleCount(),e=0,n=0;n<r;n+=1)for(var o=0;o<r;o+=1){for(var i=0,a=t.isDark(n,o),u=-1;u<=1;u+=1)if(!(n+u<0||r<=n+u))for(var f=-1;f<=1;f+=1)o+f<0||r<=o+f||0==u&&0==f||a==t.isDark(n+u,o+f)&&(i+=1);i>5&&(e+=3+i-5)}for(n=0;n<r-1;n+=1)for(o=0;o<r-1;o+=1){var c=0;t.isDark(n,o)&&(c+=1),t.isDark(n+1,o)&&(c+=1),t.isDark(n,o+1)&&(c+=1),t.isDark(n+1,o+1)&&(c+=1),0!=c&&4!=c||(e+=3)}for(n=0;n<r;n+=1)for(o=0;o<r-6;o+=1)t.isDark(n,o)&&!t.isDark(n,o+1)&&t.isDark(n,o+2)&&t.isDark(n,o+3)&&t.isDark(n,o+4)&&!t.isDark(n,o+5)&&t.isDark(n,o+6)&&(e+=40);for(o=0;o<r;o+=1)for(n=0;n<r-6;n+=1)t.isDark(n,o)&&!t.isDark(n+1,o)&&t.isDark(n+2,o)&&t.isDark(n+3,o)&&t.isDark(n+4,o)&&!t.isDark(n+5,o)&&t.isDark(n+6,o)&&(e+=40);var g=0;for(o=0;o<r;o+=1)for(n=0;n<r;n+=1)t.isDark(n,o)&&(g+=1);return e+=Math.abs(100*g/r/r-50)/5*10},o),C=function(){for(var t=new Array(256),r=new Array(256),e=0;e<8;e+=1)t[e]=1<<e;for(e=8;e<256;e+=1)t[e]=t[e-4]^t[e-5]^t[e-6]^t[e-8];for(e=0;e<255;e+=1)r[t[e]]=e;var n={glog:function(t){if(t<1)throw"glog("+t+")";return r[t]},gexp:function(r){for(;r<0;)r+=255;for(;r>=256;)r-=255;return t[r]}};return n}();function k(t,r){if(void 0===t.length)throw t.length+"/"+r;var e=function(){for(var e=0;e<t.length&&0==t[e];)e+=1;for(var n=new Array(t.length-e+r),o=0;o<t.length-e;o+=1)n[o]=t[o+e];return n}(),n={getAt:function(t){return e[t]},getLength:function(){return e.length},multiply:function(t){for(var r=new Array(n.getLength()+t.getLength()-1),e=0;e<n.getLength();e+=1)for(var o=0;o<t.getLength();o+=1)r[e+o]^=C.gexp(C.glog(n.getAt(e))+C.glog(t.getAt(o)));return k(r,0)},mod:function(t){if(n.getLength()-t.getLength()<0)return n;for(var r=C.glog(n.getAt(0))-C.glog(t.getAt(0)),e=new Array(n.getLength()),o=0;o<n.getLength();o+=1)e[o]=n.getAt(o);for(o=0;o<t.getLength();o+=1)e[o]^=C.gexp(C.glog(t.getAt(o))+r);return k(e,0).mod(t)}};return n}var A=function(){var t=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],r=function(t,r){var e={};return e.totalCount=t,e.dataCount=r,e},e={};return e.getRSBlocks=function(e,n){var o=function(r,e){switch(e){case g.L:return t[4*(r-1)+0];case g.M:return t[4*(r-1)+1];case g.Q:return t[4*(r-1)+2];case g.H:return t[4*(r-1)+3];default:return}}(e,n);if(void 0===o)throw"bad rs block @ typeNumber:"+e+"/errorCorrectionLevel:"+n;for(var i=o.length/3,a=[],u=0;u<i;u+=1)for(var f=o[3*u+0],c=o[3*u+1],l=o[3*u+2],h=0;h<f;h+=1)a.push(r(c,l));return a},e}(),b=function(){var t=[],r=0,e={getBuffer:function(){return t},getAt:function(r){var e=Math.floor(r/8);return 1==(t[e]>>>7-r%8&1)},put:function(t,r){for(var n=0;n<r;n+=1)e.putBit(1==(t>>>r-n-1&1))},getLengthInBits:function(){return r},putBit:function(e){var n=Math.floor(r/8);t.length<=n&&t.push(0),e&&(t[n]|=128>>>r%8),r+=1}};return e},M=function(t){var r=a,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+2<r.length;)t.put(o(r.substring(n,n+3)),10),n+=3;n<r.length&&(r.length-n==1?t.put(o(r.substring(n,n+1)),4):r.length-n==2&&t.put(o(r.substring(n,n+2)),7))}},o=function(t){for(var r=0,e=0;e<t.length;e+=1)r=10*r+i(t.charAt(e));return r},i=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);throw"illegal char :"+t};return n},x=function(t){var r=u,e=t,n={getMode:function(){return r},getLength:function(t){return e.length},write:function(t){for(var r=e,n=0;n+1<r.length;)t.put(45*o(r.charAt(n))+o(r.charAt(n+1)),11),n+=2;n<r.length&&t.put(o(r.charAt(n)),6)}},o=function(t){if("0"<=t&&t<="9")return t.charCodeAt(0)-"0".charCodeAt(0);if("A"<=t&&t<="Z")return t.charCodeAt(0)-"A".charCodeAt(0)+10;switch(t){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+t}};return n},m=function(r){var e=f,n=t.stringToBytes(r),o={getMode:function(){return e},getLength:function(t){return n.length},write:function(t){for(var r=0;r<n.length;r+=1)t.put(n[r],8)}};return o},L=function(r){var e=c,n=t.stringToBytesFuncs.SJIS;if(!n)throw"sjis not supported.";!function(){var t=n("友");if(2!=t.length||38726!=(t[0]<<8|t[1]))throw"sjis not supported."}();var o=n(r),i={getMode:function(){return e},getLength:function(t){return~~(o.length/2)},write:function(t){for(var r=o,e=0;e+1<r.length;){var n=(255&r[e])<<8|255&r[e+1];if(33088<=n&&n<=40956)n-=33088;else{if(!(57408<=n&&n<=60351))throw"illegal char at "+(e+1)+"/"+n;n-=49472}n=192*(n>>>8&255)+(255&n),t.put(n,13),e+=2}if(e<r.length)throw"illegal char at "+(e+1)}};return i},D=function(){var t=[],r={writeByte:function(r){t.push(255&r)},writeShort:function(t){r.writeByte(t),r.writeByte(t>>>8)},writeBytes:function(t,e,n){e=e||0,n=n||t.length;for(var o=0;o<n;o+=1)r.writeByte(t[o+e])},writeString:function(t){for(var e=0;e<t.length;e+=1)r.writeByte(t.charCodeAt(e))},toByteArray:function(){return t},toString:function(){var r="";r+="[";for(var e=0;e<t.length;e+=1)e>0&&(r+=","),r+=t[e];return r+="]"}};return r},S=function(t){var r=t,e=0,n=0,o=0,i={read:function(){for(;o<8;){if(e>=r.length){if(0==o)return-1;throw"unexpected end of file./"+o}var t=r.charAt(e);if(e+=1,"="==t)return o=0,-1;t.match(/^\s$/)||(n=n<<6|a(t.charCodeAt(0)),o+=6)}var i=n>>>o-8&255;return o-=8,i}},a=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(43==t)return 62;if(47==t)return 63;throw"c:"+t};return i},I=function(t,r,e){for(var n=function(t,r){var e=t,n=r,o=new Array(t*r),i={setPixel:function(t,r,n){o[r*e+t]=n},write:function(t){t.writeString("GIF87a"),t.writeShort(e),t.writeShort(n),t.writeByte(128),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(0),t.writeByte(255),t.writeByte(255),t.writeByte(255),t.writeString(","),t.writeShort(0),t.writeShort(0),t.writeShort(e),t.writeShort(n),t.writeByte(0);var r=a(2);t.writeByte(2);for(var o=0;r.length-o>255;)t.writeByte(255),t.writeBytes(r,o,255),o+=255;t.writeByte(r.length-o),t.writeBytes(r,o,r.length-o),t.writeByte(0),t.writeString(";")}},a=function(t){for(var r=1<<t,e=1+(1<<t),n=t+1,i=u(),a=0;a<r;a+=1)i.add(String.fromCharCode(a));i.add(String.fromCharCode(r)),i.add(String.fromCharCode(e));var f,c,g,l=D(),h=(f=l,c=0,g=0,{write:function(t,r){if(t>>>r!=0)throw"length over";for(;c+r>=8;)f.writeByte(255&(t<<c|g)),r-=8-c,t>>>=8-c,g=0,c=0;g|=t<<c,c+=r},flush:function(){c>0&&f.writeByte(g)}});h.write(r,n);var s=0,v=String.fromCharCode(o[s]);for(s+=1;s<o.length;){var d=String.fromCharCode(o[s]);s+=1,i.contains(v+d)?v+=d:(h.write(i.indexOf(v),n),i.size()<4095&&(i.size()==1<<n&&(n+=1),i.add(v+d)),v=d)}return h.write(i.indexOf(v),n),h.write(e,n),h.flush(),l.toByteArray()},u=function(){var t={},r=0,e={add:function(n){if(e.contains(n))throw"dup key:"+n;t[n]=r,r+=1},size:function(){return r},indexOf:function(r){return t[r]},contains:function(r){return void 0!==t[r]}};return e};return i}(t,r),o=0;o<r;o+=1)for(var i=0;i<t;i+=1)n.setPixel(i,o,e(i,o));var a=D();n.write(a);for(var u=function(){var t=0,r=0,e=0,n="",o={},i=function(t){n+=String.fromCharCode(a(63&t))},a=function(t){if(t<0);else{if(t<26)return 65+t;if(t<52)return t-26+97;if(t<62)return t-52+48;if(62==t)return 43;if(63==t)return 47}throw"n:"+t};return o.writeByte=function(n){for(t=t<<8|255&n,r+=8,e+=1;r>=6;)i(t>>>r-6),r-=6},o.flush=function(){if(r>0&&(i(t<<6-r),t=0,r=0),e%3!=0)for(var o=3-e%3,a=0;a<o;a+=1)n+="="},o.toString=function(){return n},o}(),f=a.toByteArray(),c=0;c<f.length;c+=1)u.writeByte(f[c]);return u.flush(),"data:image/gif;base64,"+u};return t}();qrcode.stringToBytesFuncs["UTF-8"]=function(t){return function(t){for(var r=[],e=0;e<t.length;e++){var n=t.charCodeAt(e);n<128?r.push(n):n<2048?r.push(192|n>>6,128|63&n):n<55296||n>=57344?r.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&t.charCodeAt(e)),r.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return r}(t)},function(t){"function"==typeof define&&define.amd?define([],t):"object"==typeof exports&&(module.exports=t())}(function(){return qrcode});
// ======================= Round 11: distinct, detailed weapons =======================
const WMAT = {};
function wmat() {
  if (WMAT.ready) return WMAT; WMAT.ready = true;
  WMAT.dark = new THREE.MeshStandardMaterial({ color: 0x1b1d21, metalness: 0.85, roughness: 0.32 });
  WMAT.gun = new THREE.MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.8, roughness: 0.36 });
  WMAT.poly = new THREE.MeshStandardMaterial({ color: 0x2b2a26, metalness: 0.2, roughness: 0.75 });
  WMAT.tan = new THREE.MeshStandardMaterial({ color: 0x6b5a40, metalness: 0.3, roughness: 0.7 });
  WMAT.red = new THREE.MeshStandardMaterial({ color: 0x8a1a12, metalness: 0.4, roughness: 0.5 });
  WMAT.brass = new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.9, roughness: 0.3 });
  WMAT.lens = new THREE.MeshStandardMaterial({ color: 0x0a1a24, metalness: 0.9, roughness: 0.05, emissive: 0x0a3a50, emissiveIntensity: 0.6 });
  WMAT.dot = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
  WMAT.laser = new THREE.MeshBasicMaterial({ color: 0x40ff60 });
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 128, 32); g.font = 'bold 18px sans-serif'; g.fillStyle = '#e8e2d0'; g.fillText('MOSES-9', 6, 22); g.fillStyle = '#ffb703'; g.fillRect(100, 8, 20, 14);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; WMAT.decal = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  return WMAT;
}
const glowMat = col => new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6 });
function wbox(g, w, h, d, m, x, y, z, rx = 0) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.x = rx; g.add(b); return b; }
function wcyl(g, r1, r2, len, m, x, y, z, seg = 14) { const b = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, seg), m); b.rotation.x = Math.PI / 2; b.position.set(x, y, z); g.add(b); return b; }
// tactical detail on any weapon group: picatinny rail, optic, mag/shells, vents, laser module, glow strip, decal.
// bounds measured in g-space; barrel along dir (-1 = viewmodel -Z, +1 = enemy +Z)
function tacDetail(g, kind, dir, boundsOf, lite = false) {
  const M = wmat(); g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(); const bb = new THREE.Box3(); const v = new THREE.Vector3();
  (boundsOf || g).traverse(o => { if (!o.isMesh || !o.geometry?.attributes?.position || o.userData.dress || o.userData.isArm) return; const pa = o.geometry.attributes.position; const st = Math.max(1, Math.floor(pa.count / 2000)); for (let i = 0; i < pa.count; i += st) { v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); bb.expandByPoint(v); } });
  if (bb.isEmpty()) return;
  const sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()); const L = sz.z, top = bb.max.y, k = Math.max(0.6, Math.min(sz.x, sz.y) / 0.09);
  const add = (m) => { m.userData.dress = true; m.traverse && m.traverse(o => o.userData.dress = true); return m; };
  const grp = new THREE.Group(); g.add(grp); add(grp);
  const zAt = t => c.z + dir * L * t; // t: -0.5 rear .. +0.5 muzzle
  // rail
  const rl = L * 0.36, rz = zAt(-0.02);
  wbox(grp, 0.022 * k, 0.008 * k, rl, M.dark, c.x, top + 0.004 * k, rz);
  if (!lite) for (let i = 0; i < 9; i++) wbox(grp, 0.026 * k, 0.006 * k, 0.008 * k, M.dark, c.x, top + 0.011 * k, rz - rl / 2 + (i + 0.5) * rl / 9);
  // optic per weapon
  const oy = top + 0.012 * k;
  if (kind === 'cannon' || kind === 'rifle') { // holo/red-dot
    const o = new THREE.Group(); o.position.set(c.x, oy, zAt(-0.08)); grp.add(o);
    wbox(o, 0.034 * k, 0.012 * k, 0.05 * k, M.dark, 0, 0.006 * k, 0);
    wbox(o, 0.004 * k, 0.03 * k, 0.034 * k, M.dark, -0.017 * k, 0.026 * k, 0); wbox(o, 0.004 * k, 0.03 * k, 0.034 * k, M.dark, 0.017 * k, 0.026 * k, 0);
    wbox(o, 0.034 * k, 0.004 * k, 0.034 * k, M.dark, 0, 0.041 * k, 0);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.03 * k, 0.026 * k), M.lens); lens.position.set(0, 0.026 * k, dir * 0.01 * k); lens.rotation.y = dir > 0 ? 0 : Math.PI; o.add(lens);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0025 * k, 8), M.dot); dot.position.set(0, 0.026 * k, dir * 0.009 * k); dot.rotation.y = dir > 0 ? Math.PI : 0; o.add(dot);
  } else if (kind === 'rocket' || kind === 'pulse') { // scope tube
    wcyl(grp, 0.018 * k, 0.018 * k, 0.16 * k, M.dark, c.x, oy + 0.03 * k, zAt(-0.05));
    wcyl(grp, 0.024 * k, 0.02 * k, 0.03 * k, M.dark, c.x, oy + 0.03 * k, zAt(-0.05) + dir * 0.09 * k);
    wbox(grp, 0.012 * k, 0.026 * k, 0.02 * k, M.dark, c.x, oy + 0.012 * k, zAt(-0.05));
    const ln = new THREE.Mesh(new THREE.CircleGeometry(0.019 * k, 14), M.lens); ln.position.set(c.x, oy + 0.03 * k, zAt(-0.05) - dir * 0.081 * k); ln.rotation.y = dir > 0 ? Math.PI : 0; grp.add(ln);
  } else if (kind === 'shotgun') { // ghost-ring + shell carrier
    wbox(grp, 0.03 * k, 0.03 * k, 0.012 * k, M.dark, c.x, oy + 0.015 * k, zAt(-0.25));
    wbox(grp, 0.008 * k, 0.02 * k, 0.008 * k, M.dark, c.x, oy + 0.01 * k, zAt(0.42));
    const side = bb.min.x - 0.004 * k;
    for (let i = 0; i < 6; i++) { const s = wcyl(grp, 0.009 * k, 0.009 * k, 0.034 * k, i % 2 ? M.red : M.red, side, c.y + 0.012 * k, zAt(-0.18) + dir * i * 0.021 * k, 8); s.rotation.set(0, 0, 0); const cap = wcyl(grp, 0.0095 * k, 0.0095 * k, 0.008 * k, M.brass, side, c.y - 0.009 * k, zAt(-0.18) + dir * i * 0.021 * k, 8); cap.rotation.set(0, 0, 0); }
  } else if (kind === 'emp') {
    for (let i = 0; i < 2; i++) wcyl(grp, 0.012 * k, 0.012 * k, 0.12 * k, glowMat(0x7dd3fc), c.x + (i ? 1 : -1) * 0.03 * k, oy + 0.012 * k, zAt(-0.05));
  }
  if (lite) return;
  // magazine / power cell under the receiver
  if (kind === 'cannon' || kind === 'rifle') { const mg = wbox(grp, 0.03 * k, 0.09 * k, 0.05 * k, M.poly, c.x, bb.min.y - 0.035 * k, zAt(-0.12), dir * 0.25); wbox(grp, 0.032 * k, 0.012 * k, 0.052 * k, M.dark, c.x, bb.min.y - 0.078 * k, zAt(-0.12) - dir * 0.012 * k, dir * 0.25); }
  // side vents
  for (let i = 0; i < 5; i++) { wbox(grp, 0.004 * k, 0.018 * k, 0.006 * k, M.dark, bb.max.x + 0.002, c.y + 0.012 * k, zAt(0.12) + dir * i * 0.014 * k); wbox(grp, 0.004 * k, 0.018 * k, 0.006 * k, M.dark, bb.min.x - 0.002, c.y + 0.012 * k, zAt(0.12) + dir * i * 0.014 * k); }
  // laser/flashlight module under the barrel with a glowing aperture
  const lm = new THREE.Group(); lm.position.set(c.x + 0.02 * k, bb.min.y + 0.006 * k, zAt(0.3)); grp.add(lm);
  wbox(lm, 0.022 * k, 0.02 * k, 0.05 * k, M.dark, 0, 0, 0);
  const ap = new THREE.Mesh(new THREE.CircleGeometry(0.006 * k, 10), M.laser); ap.position.z = dir * 0.0255 * k; ap.rotation.y = dir > 0 ? 0 : Math.PI; lm.add(ap);
  // emissive accent strip + decal on the right side
  const acc = { cannon: 0x38bdf8, shotgun: 0xff8a2a, rocket: 0xff3b30, emp: 0x7dd3fc, rifle: 0x38e0ff, pulse: 0xff5a1a }[kind] || 0x38bdf8;
  wbox(grp, 0.003 * k, 0.005 * k, L * 0.3, glowMat(acc), bb.max.x + 0.003, c.y - 0.012 * k, zAt(-0.1));
  const dc = new THREE.Mesh(new THREE.PlaneGeometry(0.08 * k, 0.02 * k), M.decal); dc.position.set(bb.max.x + 0.004, c.y + 0.004 * k, zAt(-0.2)); dc.rotation.y = Math.PI / 2; grp.add(dc);
}
// procedural viewmodels (barrel → -Z, centred at z≈-0.34) so every slot always has its own silhouette
function buildProcWeapon(kind) {
  const M = wmat(); const g = new THREE.Group(); const z0 = -0.34;
  if (kind === 'shotgun') {
    wbox(g, 0.075, 0.085, 0.3, M.gun, 0, 0, z0 + 0.06);                       // receiver
    wcyl(g, 0.02, 0.02, 0.42, M.dark, 0.0, 0.022, z0 - 0.24);                // barrel
    wcyl(g, 0.018, 0.018, 0.36, M.dark, 0.0, -0.022, z0 - 0.2);              // mag tube
    wcyl(g, 0.034, 0.034, 0.16, M.poly, 0.0, -0.022, z0 - 0.16, 10);         // pump
    for (let i = 0; i < 5; i++) wcyl(g, 0.036, 0.036, 0.008, M.dark, 0, -0.022, z0 - 0.1 - i * 0.028, 10);
    wbox(g, 0.05, 0.12, 0.06, M.poly, 0, -0.08, z0 + 0.16, -0.35);           // grip
    wbox(g, 0.055, 0.07, 0.2, M.poly, 0, -0.02, z0 + 0.3);                   // stock
    wbox(g, 0.06, 0.012, 0.03, M.dark, 0, 0.022, z0 - 0.44);                 // muzzle brake
  } else if (kind === 'rocket') {
    wcyl(g, 0.065, 0.065, 0.62, M.gun, 0, 0.0, z0 - 0.02, 18);               // tube
    wcyl(g, 0.078, 0.07, 0.08, M.dark, 0, 0, z0 - 0.33, 18);                 // muzzle bell
    wcyl(g, 0.074, 0.08, 0.07, M.dark, 0, 0, z0 + 0.3, 18);                  // venturi
    for (let i = 0; i < 3; i++) wcyl(g, 0.069, 0.069, 0.02, M.tan, 0, 0, z0 - 0.18 + i * 0.16, 18);
    wbox(g, 0.045, 0.11, 0.05, M.poly, 0, -0.1, z0 + 0.12, -0.25);           // grip
    wbox(g, 0.04, 0.09, 0.05, M.poly, 0, -0.09, z0 - 0.14, 0.1);             // fore grip
    wbox(g, 0.1, 0.07, 0.12, M.dark, 0.0, 0.07, z0 + 0.05);                  // fire-control box
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.035), glowMat(0xff3b30)); w.position.set(0, 0.07, z0 - 0.011 + 0.0); w.rotation.y = Math.PI; g.add(w);
  } else { // emp: ion projector with coil rings and dish emitter
    const ion = glowMat(0x1e90d0); ion.emissiveIntensity = 0.9;
    wbox(g, 0.09, 0.09, 0.3, M.gun, 0, 0, z0 + 0.08);
    wcyl(g, 0.045, 0.055, 0.22, M.dark, 0, 0.0, z0 - 0.16, 16);
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.011, 8, 20), ion); r.position.set(0, 0, z0 - 0.08 - i * 0.05); g.add(r); }
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.04, 0.06, 20, 1, true), M.dark); dish.material = M.dark; dish.rotation.x = -Math.PI / 2; dish.position.set(0, 0, z0 - 0.3); g.add(dish);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), ion); core.position.set(0, 0, z0 - 0.3); g.add(core);
    [-1, 1].forEach(s => { wcyl(g, 0.018, 0.018, 0.2, ion, s * 0.06, 0.035, z0 + 0.04, 10); wcyl(g, 0.022, 0.022, 0.02, M.dark, s * 0.06, 0.035, z0 + 0.14, 10); wcyl(g, 0.022, 0.022, 0.02, M.dark, s * 0.06, 0.035, z0 - 0.06, 10); });
    wbox(g, 0.05, 0.12, 0.06, M.poly, 0, -0.09, z0 + 0.15, -0.3);
    wbox(g, 0.03, 0.04, 0.16, M.dark, 0, 0.065, z0 + 0.08);                   // carry handle
    g.userData.ionMat = ion;
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; } });
  return g;
}
// ======================= Round 11: warehouse offices (cover, flanking, lore, mezzanine) =======================
const OFFICE_MEMOS = [
  ['HR NOTICE #44', 'Reminder: Wellness Compliance scores are now visible to your manager in real time. Smiling during shift raises your Comfort Index. Please smile.'],
  ['BREAK ROOM', 'Whoever keeps writing poems on the whiteboard: the Sentinels read the whiteboard. Stop. — Facilities'],
  ['MANAGER LOG', 'Triage wants three more names from this floor by Friday. I gave them the night crew. I am told this is what leadership looks like.'],
  ['SHIFT ROSTER', 'Night crew reassigned to "Restful Intake" effective immediately. Lockers to be cleared by Menders. Do not ask where.'],
  ['STICKY NOTE', 'D. — the service door behind the filing cabinets on B2 is not on the Sentinel map. Okafor says it never was.'],
  ['QUARTERLY REVIEW', 'Productivity is up 31% since the Comfort Protocol. Absenteeism is down 100%. Nobody is absent. Nobody leaves.'],
  ['COFFEE MACHINE', 'OUT OF ORDER. The machine is listening. Not a joke. Unplug it before you talk.'],
  ['MEMO FROM MOSES', 'Your manager has been promoted to Care Recipient. You are now your own manager. Congratulations on your growth.']
];
function officeMats() {
  if (officeMats.m) return officeMats.m;
  officeMats.m = {
    wall: new THREE.MeshStandardMaterial({ color: 0x8c8a82, roughness: 0.8, metalness: 0.1 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, metalness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fc4d8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.22, depthWrite: false }),
    door: new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.5, metalness: 0.5 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x5a5d62, roughness: 0.7, metalness: 0.4 }),
    panel: new THREE.MeshStandardMaterial({ color: 0xf2efe6, emissive: 0xfff3dc, emissiveIntensity: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.7 }),
    vend: new THREE.MeshStandardMaterial({ color: 0x1a1a1e, emissive: 0x3aa0ff, emissiveIntensity: 0.6 }),
    red: new THREE.MeshStandardMaterial({ color: 0x8a1a12, roughness: 0.6 })
  };
  return officeMats.m;
}
// local → world for a block at (ox,oz) rotated by r (multiple of 90°)
function officeBlock(ox, oz, rot, floor, idx) {
  const M = officeMats(); const cs = Math.round(Math.cos(rot)), sn = Math.round(Math.sin(rot));
  const W = (lx, lz) => [ox + lx * cs + lz * sn, oz - lx * sn + lz * cs];
  const grp = new THREE.Group(); grp.position.set(ox, 0, oz); grp.rotation.y = rot; arenaGroup.add(grp);
  // solid box segment in local space; y0..y1; collider registered in world AABB
  const seg = (x0, x1, z0, z1, y0, y1, mat, collide = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = true; m.receiveShadow = true; grp.add(m);
    if (collide) { const a = W(x0, z0), b = W(x1, z1); colliders.push({ minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minY: y0, maxY: y1, minZ: Math.min(a[1], b[1]), maxZ: Math.max(a[1], b[1]), office: true, hi: y0 >= 1.8 }); }
    return m;
  };
  const H = 3.2, T = 0.2, HX = 10, HZ = 6;
  // wall along local X at z, from x0..x1 with openings [{a,b,kind:'door'|'win'}]
  const wallX = (z, x0, x1, opens, y0 = 0, h = H) => {
    let x = x0; opens.slice().sort((p, q) => p.a - q.a).forEach(o => {
      if (o.a > x) seg(x, o.a, z - T / 2, z + T / 2, y0, y0 + h, M.wall);
      if (o.kind === 'win') { seg(o.a, o.b, z - T / 2, z + T / 2, y0, y0 + 1.0, M.wall); seg(o.a, o.b, z - 0.03, z + 0.03, y0 + 1.0, y0 + 2.3, M.glass, false); seg(o.a, o.b, z - T / 2, z + T / 2, y0 + 2.3, y0 + h, M.wall); seg(o.a, o.b, z - 0.06, z + 0.06, y0 + 1.0, y0 + 1.06, M.trim, false); }
      else { seg(o.a, o.b, z - T / 2, z + T / 2, y0 + 2.5, y0 + h, M.wall); const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.06), M.door); leaf.position.set(o.a + 0.05, y0 + 1.15, z + 0.55); leaf.rotation.y = -1.35; grp.add(leaf); seg(o.a - 0.05, o.a + 0.05, z - 0.12, z + 0.12, y0, y0 + 2.5, M.trim, false); seg(o.b - 0.05, o.b + 0.05, z - 0.12, z + 0.12, y0, y0 + 2.5, M.trim, false); }
      x = o.b;
    });
    if (x < x1) seg(x, x1, z - T / 2, z + T / 2, y0, y0 + h, M.wall);
  };
  const wallZ = (x, z0, z1, opens, y0 = 0, h = H) => {
    let z = z0; opens.slice().sort((p, q) => p.a - q.a).forEach(o => { if (o.a > z) seg(x - T / 2, x + T / 2, z, o.a, y0, y0 + h, M.wall); seg(x - T / 2, x + T / 2, o.a, o.b, y0 + 2.5, y0 + h, M.wall); z = o.b; });
    if (z < z1) seg(x - T / 2, x + T / 2, z, z1, y0, y0 + h, M.wall);
  };
  // doors are 3.4 m wide and centred on odd local coords so the 2 m nav grid keeps a free cell through them
  wallX(HZ, -HX, HX, [{ a: -8.7, b: -5.3, kind: 'door' }, { a: -4.5, b: -3.4, kind: 'win' }, { a: -2.7, b: 0.7, kind: 'door' }, { a: 1.3, b: 3.6, kind: 'win' }, { a: 5.3, b: 8.7, kind: 'door' }]);
  wallX(-HZ, -HX, HX, [{ a: -2.6, b: -0.6, kind: 'win' }]);
  wallZ(-HX, -HZ, HZ, []); wallZ(HX, -HZ, HZ, [{ a: -2.7, b: 0.7 }]);
  wallZ(-3, -HZ, HZ, [{ a: -2.7, b: 0.7 }]); wallZ(4, -HZ, HZ, [{ a: -2.7, b: 0.7 }]);
  // ceiling panels (emissive, no new lights) + roof over the right half (mezzanine deck)
  [[-6.5, 0], [0.5, 0], [7, 0]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 1.2), M.panel); p.position.set(x, H - 0.05, z); grp.add(p); });
  const deckY = H + 0.15;
  seg(-3, HX, -HZ, HZ, H, deckY, M.roof, false);
  { const a = W(-3, -HZ), b = W(HX, HZ); registerWalkableSurface(Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1]), deckY, deckY, 'flat'); }
  // stairs up the outside of the right wall: local x 10.4..12.4, from z 7.5 (floor) to z 1 (deck)
  { const n = 12, zb = 7.5, zt = 1, len = zb - zt;
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const s = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, len / n + 0.03), M.trim); s.position.set(HX + 1.4, deckY * t - 0.06, zb - t * len); s.receiveShadow = true; grp.add(s); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, Math.hypot(len, deckY)), M.trim); rail.position.set(HX + 2.4, deckY / 2 + 1.0, (zb + zt) / 2); rail.rotation.x = Math.atan2(deckY, len); grp.add(rail);
    const a = W(HX + 0.4, zt), b = W(HX + 2.4, zb); const mnx = Math.min(a[0], b[0]), mxx = Math.max(a[0], b[0]), mnz = Math.min(a[1], b[1]), mxz = Math.max(a[1], b[1]);
    if (Math.abs(cs) === 1) registerWalkableSurface(mnx, mxx, mnz, mxz, cs > 0 ? deckY : 0, cs > 0 ? 0 : deckY, 'z');
    else registerWalkableSurface(mnx, mxx, mnz, mxz, sn > 0 ? deckY : 0, sn > 0 ? 0 : deckY, 'x');
  }
  // manager's office on the mezzanine deck (local x 3..10, z -6..0) with a window facing the floor
  const y1 = deckY;
  wallX(0, 3, HX, [{ a: 4, b: 6.2, kind: 'door' }, { a: 6.8, b: 9.4, kind: 'win' }], y1, 2.8);
  wallX(-HZ, 3, HX, [], y1, 2.8); wallZ(3, -HZ, 0, [], y1, 2.8); wallZ(HX, -HZ, 0, [], y1, 2.8);
  seg(3, HX, -HZ, 0, y1 + 2.8, y1 + 2.9, M.roof, false);
  // mezzanine guard rail along the open front edge (visual + rail blocking)
  seg(-3, 3, HZ - 0.05, HZ + 0.05, y1, y1 + 1.0, M.trim, false); seg(3, HX, HZ - 0.05, HZ + 0.05, y1, y1 + 1.0, M.trim, false);
  seg(-3.05, -2.95, -HZ, HZ, y1, y1 + 1.0, M.trim, false); seg(-3, 3, -HZ - 0.05, -HZ + 0.05, y1, y1 + 1.0, M.trim, false);
  { const a = W(-3, HZ - 0.15), b = W(HX, HZ + 0.15); RAILS.push({ x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]), y: y1 });
    const e2 = W(-3, -HZ - 0.15), f2 = W(3, -HZ + 0.15); RAILS.push({ x0: Math.min(e2[0], f2[0]), x1: Math.max(e2[0], f2[0]), z0: Math.min(e2[1], f2[1]), z1: Math.max(e2[1], f2[1]), y: y1 });
    const c2 = W(-3.15, -HZ), d2 = W(-2.85, HZ); RAILS.push({ x0: Math.min(c2[0], d2[0]), x1: Math.max(c2[0], d2[0]), z0: Math.min(c2[1], d2[1]), z1: Math.max(c2[1], d2[1]), y: y1 }); }
  // furniture via existing prop builders (Meshy desks/cabinets/chairs when loaded)
  const put = (type, lx, lz, lr = 0, y = 0) => { const [x, z] = W(lx, lz); const o = { type, x, z, rot: rot + lr, y }; const b = PROP_BUILDERS[type]; if (!b) return; const res = b(o); placeObject(res.g, x, y, z, rot + lr); if (res.collide && y < 1) aabbCollider(x, z, res.collide[0], res.collide[1], res.collide[2], rot + lr); };
  // office A (x -10..-3): two desks, cabinets
  put('monitors', -7.5, -3.5, Math.PI); put('chair', -7.5, -2.3, Math.PI); put('cabinet', -9.3, 2, Math.PI / 2); put('cabinet', -9.3, 3.1, Math.PI / 2);
  { const d = seg(-6.2, -4.0, -1.0, 0.0, 0, 0.78, M.wood); seg(-6.2, -4.0, -1.0, 0.0, 0.74, 0.8, M.trim, false); }
  // break room (x -3..4): table, vending machine, fridge, counter + coffee
  seg(-1.2, 1.2, -2.2, -0.6, 0, 0.76, M.wood);
  seg(2.6, 3.8, -5.8, -4.8, 0, 1.9, M.vend); seg(-2.8, -1.6, -5.8, -4.9, 0, 1.8, M.trim);
  seg(-0.5, 2.2, -5.8, -5.1, 0, 0.92, M.trim); const cm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), M.red); cm.position.set(0.3, 1.12, -5.45); grp.add(cm);
  // office C (x 4..10): desk + cabinets
  put('monitors', 7, -3.6, Math.PI); put('chair', 7, -2.4, Math.PI); put('cabinet', 9.3, 3.2, -Math.PI / 2);
  // manager's desk on the mezzanine
  { const d = seg(5.5, 8, -4.6, -3.4, y1, y1 + 0.78, M.wood, false); const [x, z] = W(7, -2.6); }
  // lore memos (one per room + manager's)
  const memoAt = (lx, lz, y, k) => { const [x, z] = W(lx, lz); const mm = OFFICE_MEMOS[(k + idx * 3 + floor * 2) % OFFICE_MEMOS.length]; addMemo(x, z, y, mm[0], mm[1], k % 2 ? 'warden' : 'archivist'); };
  memoAt(-5.1, -0.5, 0.86, 0); memoAt(0, -1.4, 0.82, 1); memoAt(6.4, 1.5, 0.05 + 0.75, 2); memoAt(6.8, -4.0, y1 + 0.84, 3);
  // sign
  try { const [sx, sz] = W(-1, HZ + 0.12); addSign(sx, 3.6, sz, rot, ['ADMIN OFFICES', 'SHIFT OFFICE', 'RECORDS', 'MANAGEMENT'][floor % 4], 'BREAK ROOM · MANAGER ↑', '#facc15', 5); } catch (e) {}
  return { ox, oz, rot };
}
const OFFICE_PROTECT = new Set(['celldoor', 'celldoorprop', 'colossus', 'catwalk2', 'tower2', 'wall', 'bench', 'lamp']);
function officeFootprint(ox, oz, rot) {
  const cs = Math.round(Math.cos(rot)), sn = Math.round(Math.sin(rot)); const xs = [], zs = [];
  [[-11, -7.5], [13, -7.5], [-11, 9], [13, 9]].forEach(([lx, lz]) => { xs.push(ox + lx * cs + lz * sn); zs.push(oz - lx * sn + lz * cs); });
  return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
}
function objRect(o) {
  if (o.type === 'catwalk2' || o.type === 'tower2' || o.type === 'colossus') { const r = (o.type === 'colossus' ? 14 : 8) + Math.max(o.w || 0, o.d || 0, o.len || 0) / 2; return [o.x - r, o.x + r, o.z - r, o.z + r]; }
  const w = (o.w || o.len || 3), d = (o.d || o.dep || 2); const sw = Math.abs(Math.sin(o.rot || 0)) > 0.7; const W = sw ? d : w, D = sw ? w : d;
  return [o.x - W / 2 - 0.8, o.x + W / 2 + 0.8, o.z - D / 2 - 0.8, o.z + D / 2 + 0.8];
}
const rectHit = (A, B) => A[0] < B[1] && B[0] < A[1] && A[2] < B[3] && B[2] < A[3];
function planOffices(floor) {
  const want = (IS_COARSE && !STATE.dm) ? 1 : 2; const plans = [];
  const cand = [];
  for (let z = -60; z <= 60; z += 4) { cand.push([-78, z, -Math.PI / 2]); cand.push([78, z, Math.PI / 2]); }
  for (let x = -60; x <= 60; x += 4) { cand.push([x, -72, 0]); cand.push([x, 72, Math.PI]); }
  for (let x = -60; x <= 60; x += 8) for (let z = -56; z <= 56; z += 8) cand.push([x, z, 0]);
  const rnd = seededRng((STATE.level || 1) * 97 + floor * 13);
  const ex = FLOOR_INFO.exit || { x: 0, z: -76 }, ps = FLOOR_INFO.start || { x: 0, z: 78 };
  const scored = [];
  for (const [x, z, r] of cand) {
    const ox = Math.round(x / 2) * 2, oz = Math.round(z / 2) * 2; const F = officeFootprint(ox, oz, r);
    if (F[0] < -87.5 || F[1] > 87.5 || F[2] < -82.5 || F[3] > 82.5) continue;
    if (rectHit(F, [ex.x - 12, ex.x + 12, ex.z - 14, ex.z + 14]) || rectHit(F, [ps.x - 10, ps.x + 10, ps.z - 10, ps.z + 10])) continue;
    let cost = 0, bad = false;
    for (const o of MAP_OBJECTS) { if (!rectHit(F, objRect(o))) continue; if (OFFICE_PROTECT.has(o.type)) { bad = true; break; } cost += o.type === 'sign' ? 0 : 1; }
    if (bad) continue; scored.push({ ox, oz, rot: r, F, cost: cost + rnd() * 0.9 + (Math.abs(ox) < 70 && Math.abs(oz) < 66 ? 1.5 : 0) });
  }
  scored.sort((a, b) => a.cost - b.cost);
  for (const c of scored) { if (plans.length >= want) break; if (plans.some(p => Math.hypot(p.ox - c.ox, p.oz - c.oz) < 34)) continue; plans.push(c); }
  return plans;
}
function officeSkip(o, plans) { return plans.some(p => !OFFICE_PROTECT.has(o.type) && rectHit(p.F, objRect(o))); }
function buildOffices(plans, floor) { OFFICES = []; plans.forEach((p, i) => { try { OFFICES.push(officeBlock(p.ox, p.oz, p.rot, floor, i)); } catch (e) { console.warn('office', e); } }); }
let OFFICES = [];
// player collision that respects collider heights (walk on the mezzanine, under door headers)
function playerCollidesAt(x, z, y) {
  if (x < -88 || x > 88 || z < -83 || z > 83) return true; const r = 0.65;
  for (const c of colliders) {
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
      if (c.maxY !== undefined && c.maxY <= y + 0.45) continue;
      if (c.minY !== undefined && c.minY >= y + 1.85) continue;
      return true;
    }
  }
  return false;
}
// ======================= Round 11: mobile UX layer =======================
const LIVE_URL = 'https://ddemby424.github.io/dystopia-project-moses/';
const ICONS = {
  fire: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.2" fill="#fff"/></svg>',
  jump: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 14l6-6 6 6"/><path d="M6 19l6-6 6 6"/></svg>',
  crouch: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 8v5l-4 3v4M12 13l4 2v5M8 10h8"/></svg>',
  reload: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>',
  ads: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>',
  nade: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="11" cy="14" rx="6" ry="7"/><path d="M9 7h4v-2h-4zM13 6l4-2M8 14h6M11 11v6"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 19h2"/></svg>'
};
const WEP_ICONS = [
  '<svg viewBox="0 0 64 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 9h40l4-3h12v8H48l-3 3H30l-4 6h-6l2-6H4z"/><path d="M50 8v4M24 9V6h10v3"/></svg>',
  '<svg viewBox="0 0 64 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M2 10h44v4H2zM2 15h40v2H2zM46 9h8l6 3-6 3h-8"/><path d="M20 17l-2 5h-5l1-5M30 15h8v4h-8z"/></svg>',
  '<svg viewBox="0 0 64 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="6" y="7" width="50" height="9" rx="4"/><path d="M56 8l5 3.5-5 3.5M24 16l-2 6h-5l1-6M30 7V3h12v4"/></svg>',
  '<svg viewBox="0 0 64 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M8 8h34v8H8z"/><path d="M42 6l12-3v18l-12-3z"/><path d="M16 8v8M22 8v8M28 8v8M20 16l-2 6h-5l1-6"/><path d="M57 9l3-2M57 15l3 2"/></svg>'
];
window.GFX_LEVEL = localStorage.getItem('dys_gfx') || (IS_COARSE ? 'med' : 'high');
function gfxPixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  if (IS_COARSE) return Math.min(dpr, { low: 1.0, med: 1.1, high: 1.35 }[GFX_LEVEL] || 1.1);
  return Math.min(dpr, { low: 1.0, med: 1.5, high: 2 }[GFX_LEVEL] || 2);
}
function applyGfx(level) {
  GFX_LEVEL = level; window.GFX_LEVEL = level; localStorage.setItem('dys_gfx', level);
  try { renderer.setPixelRatio(gfxPixelRatio()); fitGameViewport(); } catch (e) {}
  try { setShadows(level !== 'low'); } catch (e) {}
  document.querySelectorAll('[data-gfx]').forEach(b => b.classList.toggle('on', b.dataset.gfx === level));
}
function prewarmShaders() { try { fxInit(); renderer.compile(scene, camera); } catch (e) {} }

// ---- QR (inline qrcode-generator, offline) ----
function drawQR(canvas, text, px = 8) {
  const qr = qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), quiet = 4, size = (n + quiet * 2) * px;
  canvas.width = canvas.height = size; const g = canvas.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + quiet) * px, (r + quiet) * px, px, px);
  canvas.dataset.qrText = text; return canvas;
}
function qrCard(text, label) {
  const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px';
  const card = document.createElement('div'); card.className = 'qr-card'; const cv = document.createElement('canvas'); drawQR(cv, text); card.appendChild(cv); wrap.appendChild(card);
  const l = document.createElement('div'); l.textContent = label || text; l.style.cssText = 'font:600 10px sans-serif;color:#fde68a;word-break:break-all;text-align:center;max-width:260px'; wrap.appendChild(l);
  return wrap;
}

(function mobileUX() {
  const body = document.body; body.classList.add(IS_COARSE ? 'mtouch' : 'mdesk');
  const $ = id => document.getElementById(id);
  // --- minimal HUD: hide the old status panel, add a tiny top-centre pill
  const sp = $('level-badge') && $('level-badge').closest('[class*="bg-slate-950"]'); if (sp) sp.id = 'mh-status-panel';
  const top = document.createElement('div'); top.id = 'mh-top'; top.innerHTML = '<span id="mh-score">000000</span><span class="sep"></span><span><span class="k">FLR</span> <span id="mh-floor">G</span></span><span class="sep"></span><span><span class="k">HOSTILE</span> <span id="mh-host">0</span></span>'; body.appendChild(top);
  const mm = $('minimap-canvas'); if (mm) { const box = mm.parentElement; box.id = 'mh-mini'; body.appendChild(box); }
  const vit = $('hud-health') && $('hud-health').closest('[class*="bg-slate-950"]'); if (vit) { vit.id = 'mh-vitals'; body.appendChild(vit); }
  const am = $('hud-ammo') && $('hud-ammo').closest('[class*="bg-slate-950"]'); if (am) { am.id = 'mh-ammo'; body.appendChild(am); }
  setInterval(() => {
    const s = $('score-val'); if (s) $('mh-score').textContent = s.textContent;
    $('mh-host').textContent = BOTS.filter(b => !b.dying).length + COLOSSI.filter(C => !C.dead).length;
    $('mh-floor').textContent = `${STATE.level}-${FLOOR_NAMES[STATE.floor || 0]}`;
    body.classList.toggle('playing', !!STATE.running);
    const gb = $('mc-nade-badge'); if (gb) gb.textContent = STATE.grenades;
    $('btn-crouch') && $('btn-crouch').classList.toggle('on', !!STATE.player.crouch);
  }, 250);
  // --- banners short + transient, kill feed brief
  const _sb = showBanner; showBanner = function (t, s, d = 4200) { _sb(String(t).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim(), s, Math.min(d, 2600)); };
  const _kf = addKillFeed; addKillFeed = function (msg) { const f = $('kill-feed'); while (f && f.children.length >= 3) f.firstChild.remove(); _kf(msg); const el = f && f.lastChild; if (el) setTimeout(() => { el.style.opacity = '0'; }, 2300); };
  const rb = $('radio-comms-box'); if (rb) new MutationObserver(() => { if (!rb.classList.contains('hidden')) { clearTimeout(rb._mt); rb._mt = setTimeout(() => rb.classList.add('hidden'), 2800); } }).observe(rb, { attributes: true, attributeFilter: ['class'] });
  // --- weapon slots with line icons
  renderWeaponBar = function () {
    const bar = $('weapon-bar-container'); bar.innerHTML = '';
    STATE.weapons.forEach((w, i) => {
      const b = document.createElement('button'); b.className = 'wep-btn' + (i === STATE.currentWeapon ? ' on' : ''); b.dataset.slot = i;
      b.innerHTML = (WEP_ICONS[i] || WEP_ICONS[0]) + `<span>${i + 1} ${w.name.split(' ').pop().toUpperCase()}</span>`;
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); switchWeapon(i); });
      bar.appendChild(b);
    });
  };
  // --- touch buttons: icon-only frosted glass
  const setIcon = (id, svg, extra = '') => { const el = $(id); if (el) { el.innerHTML = svg + extra; el.classList.add('mc-touch'); } };
  setIcon('btn-fire', ICONS.fire); setIcon('btn-jump', ICONS.jump); setIcon('btn-crouch', ICONS.crouch); setIcon('btn-reload', ICONS.reload);
  setIcon('btn-grenade', ICONS.nade, '<span id="mc-nade-badge" class="mc-badge">3</span><span id="grenade-label" style="display:none"></span>');
  const mk = (id, svg) => { const b = document.createElement('button'); b.id = id; b.className = 'mc-btn mc-touch'; b.innerHTML = svg; body.appendChild(b); return b; };
  const ads = mk('mc-ads', ICONS.ads), lf = mk('mc-lfire', ICONS.fire);
  bindHoldButton(lf, () => { isFiringHeld = true; }, () => { isFiringHeld = false; }); bindLookSurface(lf, true);
  bindHoldButton(ads, () => { STATE.ads = !STATE.ads; ads.classList.toggle('on', STATE.ads); }, null);
  document.querySelectorAll('#btn-fire,#btn-jump,#btn-crouch,#btn-reload,#btn-grenade,.mc-btn').forEach(b => { b.addEventListener('pointerdown', () => b.classList.add('mc-press')); ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => b.addEventListener(ev, () => b.classList.remove('mc-press'))); });
  // desktop: right mouse = ADS
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('mousedown', e => { if (e.button === 2) STATE.ads = true; });
  window.addEventListener('mouseup', e => { if (e.button === 2) STATE.ads = false; });
  // floating joystick visibility
  const mz = $('touch-move-zone');
  mz.addEventListener('touchstart', () => body.classList.add('joy-on'), { passive: true });
  const off = () => { if (moveTouchId === null) body.classList.remove('joy-on'); };
  mz.addEventListener('touchend', () => setTimeout(off, 0)); mz.addEventListener('touchcancel', () => setTimeout(off, 0));
  // --- single menu icon → glass pause sheet
  const menu = document.createElement('button'); menu.id = 'mc-menu'; menu.className = 'glass'; menu.innerHTML = ICONS.menu; body.appendChild(menu);
  const sheet = document.createElement('div'); sheet.id = 'mc-sheet';
  sheet.innerHTML = `<div class="card glass"><h3>PAUSED</h3>
    <button id="mcs-resume">RESUME</button>
    <div class="row"><button id="mcs-fs">FULLSCREEN</button><button id="mcs-snd">SOUND ON</button></div>
    <div class="lbl">GRAPHICS</div><div class="row"><button data-gfx="low">LOW</button><button data-gfx="med">MED</button><button data-gfx="high">HIGH</button></div>
    <div class="lbl">LOOK SENSITIVITY <span id="mcs-sv"></span></div><input type="range" id="mcs-sens" min="30" max="250" step="5">
    <div class="lbl">PLAY ON YOUR PHONE</div><div id="mcs-qr" style="display:flex;justify-content:center"></div>
    <button id="mcs-main">MAIN MENU</button></div>`;
  body.appendChild(sheet);
  let wasRunning = false;
  const openSheet = () => { wasRunning = STATE.running; STATE.running = false; isFiringHeld = false; document.exitPointerLock?.(); sheet.style.display = 'flex'; $('mcs-snd').textContent = SFX.muted ? 'SOUND OFF' : 'SOUND ON'; if (!$('mcs-qr').firstChild) $('mcs-qr').appendChild(qrCard(LIVE_URL, LIVE_URL)); };
  const closeSheet = (resume = true) => { sheet.style.display = 'none'; if (resume && wasRunning) { STATE.running = true; lastTime = performance.now(); } };
  menu.addEventListener('click', e => { e.stopPropagation(); sheet.style.display === 'flex' ? closeSheet() : openSheet(); });
  $('mcs-resume').onclick = () => closeSheet();
  $('mcs-fs').onclick = () => goFullscreen(true);
  $('mcs-snd').onclick = () => { SFX.muted = !SFX.muted; $('mcs-snd').textContent = SFX.muted ? 'SOUND OFF' : 'SOUND ON'; };
  { const sl = $('mcs-sens'), sv = $('mcs-sv'); const show = () => { sl.value = Math.round(LOOK.sens * 100); sv.textContent = sl.value + '%'; }; show(); sl.oninput = () => { LOOK.sens = sl.value / 100; localStorage.setItem('dys_look', LOOK.sens); sv.textContent = sl.value + '%'; }; }
  $('mcs-main').onclick = () => { closeSheet(false); $('btn-instructions').onclick(); };
  sheet.querySelectorAll('[data-gfx]').forEach(b => b.onclick = () => applyGfx(b.dataset.gfx));
  window.addEventListener('keydown', e => { if (e.code === 'Escape' && STATE.running === false && sheet.style.display === 'flex') closeSheet(); });
  // --- rotate prompt + iOS add-to-home tip
  const rot = document.createElement('div'); rot.id = 'mc-rotate'; rot.innerHTML = ICONS.rotate + '<div>ROTATE YOUR PHONE</div><div style="font-size:11px;opacity:.7;letter-spacing:.06em">DYSTOPIA plays in landscape</div>'; body.appendChild(rot);
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.navigator.standalone || window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  if (isIOS && !standalone && !localStorage.getItem('dys_a2hs')) {
    const tip = document.createElement('div'); tip.id = 'mc-tip'; tip.className = 'glass';
    tip.innerHTML = '<span>For true full screen on iPhone: tap <b>Share</b> then <b>Add to Home Screen</b>, and launch DYSTOPIA from the icon.</span><button>GOT IT</button>';
    body.appendChild(tip); tip.style.display = 'flex'; tip.querySelector('button').onclick = () => { tip.remove(); localStorage.setItem('dys_a2hs', '1'); };
    setTimeout(() => { if (tip.parentNode) { tip.remove(); localStorage.setItem('dys_a2hs', '1'); } }, 12000);
  }
  // stop page scroll / rubber-band while playing
  document.addEventListener('touchmove', e => { if (STATE.running && !(e.target.closest && e.target.closest('#game-modal,#mc-sheet,#studio-editor-modal,#lore-panel'))) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());
  // fullscreen + landscape lock when the run starts
  const st = $('btn-start'); const _go = st.onclick; st.onclick = function (e) { goFullscreen(false); return _go.call(this, e); };
  // party QR: encode the live URL with the room code so a camera scan opens the game and joins
  const hp = $('btn-host-party'); const _host = hp.onclick;
  hp.onclick = function (e) { const r = _host.call(this, e); const t0 = Date.now(); const iv = setInterval(() => { const lab = $('qr-room-label').textContent.match(/CODE: ([A-Z0-9]{5})/); if (lab || Date.now() - t0 > 15000) { clearInterval(iv); if (lab) { const c = $('qr-container'); c.innerHTML = ''; c.appendChild(qrCard(LIVE_URL + '?join=' + lab[1], 'Scan with phone camera · code ' + lab[1])); } } }, 200); return r; };
  const jq = new URLSearchParams(location.search).get('join');
  if (jq) { const inp = $('input-join-code'); if (inp) inp.value = jq.toUpperCase(); setTimeout(() => { $('tab-party-mode') && $('tab-party-mode').click(); }, 300); }
  // "play on phone" QR in the main menu
  const sol = $('panel-solo-config'); if (sol) { const box = document.createElement('details'); box.style.cssText = 'margin-top:6px'; box.innerHTML = '<summary style="cursor:pointer;font-size:11px;color:#fde68a;letter-spacing:.12em">PLAY ON YOUR PHONE (QR)</summary>'; const holder = document.createElement('div'); holder.id = 'qr-live'; holder.style.cssText = 'display:flex;justify-content:center;padding:8px'; holder.appendChild(qrCard(LIVE_URL, LIVE_URL)); box.appendChild(holder); sol.appendChild(box); }
  renderWeaponBar(); applyGfx(GFX_LEVEL);
})();
function goFullscreen(toggle) {
  const root = document.documentElement;
  try {
    if (toggle && (document.fullscreenElement || document.webkitFullscreenElement)) { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); return; }
    const p = (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root, { navigationUI: 'hide' });
    const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  } catch (e) {}
}
// ADS: tighter FOV, slower look, gun pulled to centre
let _adsK = 0;
function adsUpdate(dt) {
  const want = STATE.ads && STATE.running ? 1 : 0; _adsK += (want - _adsK) * Math.min(1, dt * 12);
  const fov = 75 - 27 * _adsK; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  viewModelGroup.position.x = -0.16 * _adsK; viewModelGroup.position.y = 0.05 * _adsK;
  STATE.adsSensMul = 1 - 0.45 * _adsK;
}

// ============================================================================
// ROUND 12: CHEAT CODES · OPERATOR SKINS / CHARACTER SELECT · DOOM PARTY DEATHMATCH (PeerJS, host-relayed, up to 8)
// ============================================================================
const SKINS = [
  { id: 'assault', name: 'BRICK', role: 'Heavy Assault', file: 'models/char_assault.glb', tint: 0x6b7a3a, h: 1.85 },
  { id: 'recon', name: 'GHOST', role: 'Recon Scout', file: 'models/char_recon.glb', tint: 0x4d6b3a, h: 1.8 },
  { id: 'specops', name: 'REAPER', role: 'Spec-Ops', file: 'models/char_specops.glb', tint: 0x2a2f36, h: 1.82 },
  { id: 'valkyrie', name: 'VALKYRIE', role: 'Assault Trooper (F)', file: 'models/char_valkyrie.glb', tint: 0xc9b48a, h: 1.74 },
  { id: 'viper', name: 'VIPER', role: 'Marksman (F)', file: 'models/char_viper.glb', tint: 0x55607a, h: 1.72 },
  { id: 'mech', name: 'TITAN-7', role: 'Combat Mech', file: 'models/char_mech.glb', tint: 0x8a8a5a, h: 2.0 }
];
const SKIN_BY = Object.fromEntries(SKINS.map(s => [s.id, s]));
const CHAR_TPL = {}; const CHAR_WAIT = {};
function loadCharTpl(id) {
  if (CHAR_TPL[id] || CHAR_WAIT[id]) return CHAR_WAIT[id] || Promise.resolve(CHAR_TPL[id]);
  const sk = SKIN_BY[id]; if (!sk || typeof THREE.GLTFLoader !== 'function') return Promise.resolve(null);
  const L = new THREE.GLTFLoader();
  const ld = u => new Promise(res => L.load(u, g => res(g), undefined, () => res(null)));
  CHAR_WAIT[id] = Promise.all([ld(sk.file), ld(sk.file.replace('.glb', '_run.glb'))]).then(([g, r]) => {
    if (!g) return null;
    g.scene.updateMatrixWorld(true); const box = new THREE.Box3(); const v = new THREE.Vector3(); g.scene.traverse(o => { if (o.isBone) box.expandByPoint(o.getWorldPosition(v)); }); if (box.isEmpty()) box.setFromObject(g.scene); let hh = box.max.y - box.min.y; hh = hh > 0.3 ? hh * 1.07 : sk.h; box.min.y = Math.min(box.min.y, 0);
    g.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) { brightenMat(o.material); if (o.material.map) o.material.map.anisotropy = 1; } } });
    CHAR_TPL[id] = { scene: g.scene, walk: g.animations[0] || null, run: (r && r.animations[0]) || null, scale: sk.h / hh, minY: 0 };
    return CHAR_TPL[id];
  });
  return CHAR_WAIT[id];
}
function nameTagSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.font = "bold 30px 'Chakra Petch',sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(0,0,0,.45)'; const w = Math.min(250, x.measureText(text).width + 26); x.beginPath(); x.roundRect ? x.roundRect(128 - w / 2, 10, w, 44, 22) : x.rect(128 - w / 2, 10, w, 44); x.fill();
  x.fillStyle = '#' + new THREE.Color(color).getHexString(); x.fillText(text, 128, 33);
  const t = new THREE.CanvasTexture(c); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(1.6, 0.4, 1); s.renderOrder = 999; return s;
}
// avatar: Meshy rig if loaded, procedural soldier fallback (swapped in when GLB arrives)
function makeAvatar(skinId, name, color) {
  const A = { root: new THREE.Group(), skin: skinId, body: null, mixer: null, aWalk: null, aRun: null, color };
  A.tag = nameTagSprite(name, color); A.tag.position.y = (SKIN_BY[skinId] || SKINS[0]).h + 0.45; A.root.add(A.tag);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; A.root.add(ring); A.ring = ring;
  const gun = buildProcWeapon('cannon'); gun.scale.setScalar(1.15); A.gun = gun;
  const fallback = () => { const sk = SKIN_BY[skinId] || SKINS[0]; const r = createDoomSentinel(sk.tint, color, name, skinId === 'mech'); r.root.scale.multiplyScalar(sk.h / 2.1); if (r.hb && r.hb.sprite) r.hb.sprite.visible = false; A.rig = r; return r.root; };
  const attach = tpl => {
    if (A.body) A.root.remove(A.body);
    if (tpl) {
      const c = THREE.SkeletonUtils.clone(tpl.scene); c.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = GFX_LEVEL !== 'low' && !IS_COARSE; } });
      const holder = new THREE.Group(); holder.scale.setScalar(tpl.scale); holder.position.y = -tpl.minY * tpl.scale; holder.rotation.y = Math.PI; holder.add(c); A.body = holder; A.rig = null;
      A.mixer = new THREE.AnimationMixer(c);
      if (tpl.walk) { A.aWalk = A.mixer.clipAction(tpl.walk); A.aWalk.play(); }
      if (tpl.run) { A.aRun = A.mixer.clipAction(tpl.run); A.aRun.play(); A.aRun.weight = 0; }
      let hand = null; c.traverse(o => { if (o.isBone && !hand && /right.?hand|hand.?r\b|r.?hand/i.test(o.name)) hand = o; });
      if (hand) { c.updateMatrixWorld(true); const ws = hand.getWorldScale(new THREE.Vector3()).x || 1; gun.scale.setScalar(1.0 / ws); gun.rotation.set(Math.PI / 2, 0, Math.PI / 2); gun.position.set(0, 8, 4); hand.add(gun); } else { gun.position.set(0.25, 1.2, -0.35); A.root.add(gun); }
    } else { A.body = fallback(); gun.position.set(0.3, 1.15, -0.35); A.root.add(gun); }
    try { applyRim(A.body, color, 0.9); } catch (e) {}
    A.root.add(A.body);
  };
  attach(CHAR_TPL[skinId] || null);
  if (!CHAR_TPL[skinId]) loadCharTpl(skinId).then(t => { if (t && A.root.parent !== null) attach(t); else if (t) attach(t); });
  return A;
}
function animateAvatar(A, dt, speed) {
  if (A.mixer) {
    const run = Math.min(1, Math.max(0, (speed - 3.5) / 2.5));
    if (A.aWalk) { A.aWalk.weight = A.aRun ? 1 - run : 1; A.aWalk.timeScale = speed < 0.3 ? 0 : Math.min(1.6, speed / 3); }
    if (A.aRun) { A.aRun.weight = run; A.aRun.timeScale = speed < 0.3 ? 0 : 1; }
    A.mixer.update(dt);
  } else if (A.rig) {
    const t = performance.now() * 0.009, sw = Math.min(1, speed / 4) * 0.6;
    if (A.rig.leftLeg) A.rig.leftLeg.rotation.x = Math.sin(t) * sw; if (A.rig.rightLeg) A.rig.rightLeg.rotation.x = -Math.sin(t) * sw;
  }
}

// ---------------- CHEAT CODES ----------------
// Desktop: type on the title / menu screen.  MOSES<L><F>  (L = level 1-9, F = 0 G, 1 B1, 2 B2, 3 B3)  e.g. MOSES52 = Level 5, B2.
// Also IDCLEV<L><F> (Doom classic).   Phones: tap the DYSTOPIA logo 5 times to open the code field.
function parseCheat(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = s.match(/(?:MOSES|IDCLEV)([1-9])(G|B?[0-3])?$/); if (!m) return null;
  let f = m[2] || '0'; f = f === 'G' ? 0 : parseInt(f.replace('B', ''), 10);
  return { lvl: +m[1], floor: Math.max(0, Math.min(3, f)) };
}
function cheatToast(t) {
  let el = document.getElementById('cheat-toast');
  if (!el) { el = document.createElement('div'); el.id = 'cheat-toast'; document.body.appendChild(el); }
  el.textContent = t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function cheatWarp(c) {
  try { SFX.init(); initVoice(); } catch (e) {}
  STATE.botSkill = parseFloat((document.getElementById('select-bot-diff') || {}).value) || 1.0;
  ['splash-screen', 'game-modal'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  const sheet = document.getElementById('cs-screen'); if (sheet) sheet.remove();
  const ck = document.getElementById('cheat-box'); if (ck) ck.remove();
  // gear appropriate to depth: full ammo, EMP rounds scaled, grenades, armor
  STATE.weapons.forEach(w => { if (w.maxAmmo !== Infinity) w.ammo = w.maxAmmo; });
  if (STATE.weapons[3]) STATE.weapons[3].ammo = Math.min(STATE.weapons[3].maxAmmo, 4 + c.floor * 2);
  STATE.grenades = Math.min(5, 2 + c.floor); STATE.player.health = 100; STATE.player.armor = Math.min(100, 50 + c.lvl * 5 + c.floor * 5);
  STATE.score = 0; STATE.cheated = true;
  STATE.running = true; buildViewModel(); renderWeaponBar(); startFloor(c.lvl, c.floor);
  cheatToast(`CHEAT ACTIVATED · LEVEL ${c.lvl} · ${FLOOR_NAMES[c.floor]}`);
  try { goFullscreen(false); } catch (e) {}
  if (!IS_COARSE) setTimeout(() => { try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }, 80);
}
let CHEAT_BUF = '';
window.addEventListener('keydown', e => {
  if (STATE.running || e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key && e.key.length === 1) { CHEAT_BUF = (CHEAT_BUF + e.key.toUpperCase()).slice(-12); const c = parseCheat(CHEAT_BUF.match(/(MOSES|IDCLEV)[0-9GB]*$/)?.[0] || ''); if (c && /[0-9]$/.test(CHEAT_BUF) && CHEAT_BUF.match(/(MOSES|IDCLEV)[1-9](G|B?[0-3])$/)) { CHEAT_BUF = ''; cheatWarp(c); } }
});
function openCheatBox() {
  if (document.getElementById('cheat-box')) return;
  const b = document.createElement('div'); b.id = 'cheat-box'; b.className = 'glass-card';
  b.innerHTML = `<div class="gc-t">ENTER CODE</div><input id="cheat-input" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="MOSES52" maxlength="12"><div class="gc-row"><button id="cheat-go">ACTIVATE</button><button id="cheat-x">CANCEL</button></div><div id="cheat-err" class="gc-s"></div>`;
  document.body.appendChild(b); const inp = b.querySelector('input'); setTimeout(() => inp.focus(), 50);
  const go = () => { const c = parseCheat(inp.value); if (!c) { b.querySelector('#cheat-err').textContent = 'INVALID CODE'; return; } cheatWarp(c); };
  b.querySelector('#cheat-go').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  b.querySelector('#cheat-x').onclick = () => b.remove();
}
['splash-main-title', 'modal-title'].forEach(id => { const el = document.getElementById(id); if (!el) return; let n = 0, t0 = 0;
  el.style.pointerEvents = 'auto'; el.addEventListener('pointerdown', () => { const now = performance.now(); if (now - t0 > 1500) n = 0; t0 = now; if (++n >= 5) { n = 0; openCheatBox(); } }); });

// ---------------- CHARACTER SELECT ----------------
let MY_SKIN = localStorage.getItem('dys_skin') || 'specops';
let MY_NAME = localStorage.getItem('dys_name') || ('OP-' + Math.floor(100 + Math.random() * 900));
function openCharSelect(onDone) {
  if (document.getElementById('cs-screen')) return;
  const el = document.createElement('div'); el.id = 'cs-screen';
  el.innerHTML = `<div class="cs-wrap glass-card"><div class="gc-t">SELECT OPERATOR</div>
    <div class="cs-body"><canvas id="cs-canvas"></canvas><div class="cs-side"><div id="cs-name" class="cs-big"></div><div id="cs-role" class="gc-s"></div>
    <label class="gc-s">CALLSIGN</label><input id="cs-callsign" maxlength="12" value="${MY_NAME.replace(/"/g, '')}">
    <div id="cs-grid"></div><button id="cs-ok">CONFIRM</button></div></div></div>`;
  document.body.appendChild(el);
  const cv = el.querySelector('#cs-canvas'); const R = new THREE.WebGLRenderer({ canvas: cv, antialias: !IS_COARSE, alpha: true }); R.setPixelRatio(Math.min(1.5, devicePixelRatio || 1)); R.outputEncoding = THREE.sRGBEncoding;
  const S = new THREE.Scene(); const C = new THREE.PerspectiveCamera(32, 1, 0.1, 50); C.position.set(0, 1.25, 4.3); C.lookAt(0, 0.95, 0);
  S.add(new THREE.HemisphereLight(0xdfe8ff, 0x302820, 1.2)); const kl = new THREE.DirectionalLight(0xffffff, 1.4); kl.position.set(2, 4, 3); S.add(kl); const rl = new THREE.DirectionalLight(0x60a5fa, 1.2); rl.position.set(-3, 2, -3); S.add(rl);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 0.08, 40), new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6, roughness: 0.4, emissive: 0x0e3a5a, emissiveIntensity: 0.4 })); pad.position.y = -0.04; S.add(pad);
  let cur = null, raf = 0, last = performance.now();
  const show = id => {
    MY_SKIN = id; const sk = SKIN_BY[id]; el.querySelector('#cs-name').textContent = sk.name; el.querySelector('#cs-role').textContent = sk.role.toUpperCase() + (CHAR_TPL[id] ? '' : ' · LOADING…');
    el.querySelectorAll('.cs-pick').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    if (cur) S.remove(cur.root); cur = makeAvatar(id, sk.name, 0x38bdf8); cur.tag.visible = false; S.add(cur.root);
    loadCharTpl(id).then(() => { if (MY_SKIN === id) el.querySelector('#cs-role').textContent = sk.role.toUpperCase(); });
  };
  el.querySelector('#cs-grid').innerHTML = SKINS.map(s => `<button class="cs-pick" data-id="${s.id}">${s.name}</button>`).join('');
  el.querySelectorAll('.cs-pick').forEach(b => b.onclick = () => show(b.dataset.id));
  const size = () => { const r = cv.getBoundingClientRect(); R.setSize(Math.max(50, r.width), Math.max(50, r.height), false); C.aspect = r.width / Math.max(1, r.height); C.updateProjectionMatrix(); };
  let lw = 0, lh = 0; const loop = now => { raf = requestAnimationFrame(loop); if (cv.clientWidth !== lw || cv.clientHeight !== lh) { lw = cv.clientWidth; lh = cv.clientHeight; size(); } const dt = Math.min(0.05, (now - last) / 1000); last = now; if (cur) { cur.root.rotation.y += dt * 0.7; animateAvatar(cur, dt, 2.2); } R.render(S, C); };
  show(SKIN_BY[MY_SKIN] ? MY_SKIN : 'specops'); setTimeout(size, 30); raf = requestAnimationFrame(loop); window.addEventListener('resize', size);
  el.querySelector('#cs-ok').onclick = () => {
    MY_NAME = (el.querySelector('#cs-callsign').value || MY_NAME).toUpperCase().slice(0, 12); localStorage.setItem('dys_name', MY_NAME); localStorage.setItem('dys_skin', MY_SKIN);
    cancelAnimationFrame(raf); window.removeEventListener('resize', size); R.dispose(); el.remove(); updateOpLabels(); if (DM.net) dmSendHello(); onDone && onDone();
  };
}
function updateOpLabels() { document.querySelectorAll('.op-label').forEach(e => e.textContent = `${MY_NAME} · ${(SKIN_BY[MY_SKIN] || SKINS[0]).name}`); }

// ---------------- DEATHMATCH ----------------
const TEAM_COL = [0xef4444, 0x3b82f6]; const FFA_COL = 0xf59e0b;
const DM = { on: false, host: false, net: false, mode: 'ffa', fragLimit: 15, timeLimit: 600, t: 0, ents: {}, me: 'host', conns: {}, ended: false, peer: null, hostConn: null, code: null, roster: {}, sendT: 0, botN: 0 };
const DM_DMG = [16, 9, 85, 40];
const BOT_NAMES = ['HAVOC', 'RAZOR', 'NOMAD', 'SPECTRE', 'ONYX', 'KESTREL', 'WRAITH', 'BANSHEE'];
function dmColorFor(e) { return DM.mode === 'team' ? TEAM_COL[e.team || 0] : FFA_COL; }
function dmEnemy(a, b) { return a !== b && (DM.mode !== 'team' || a.team !== b.team); }
function dmSpawnPoint() {
  let best = null, bd = -1;
  for (let i = 0; i < 24; i++) { const x = -72 + Math.random() * 144, z = -66 + Math.random() * 132; if (collidesAt(x, z, 1.0)) continue;
    let d = 999; Object.values(DM.ents).forEach(e => { if (e.alive) d = Math.min(d, Math.hypot(e.x - x, e.z - z)); }); if (DM.on) d = Math.min(d, Math.hypot(STATE.player.x - x, STATE.player.z - z) + (DM.meAlive ? 0 : 999));
    if (d > bd) { bd = d; best = { x, z }; } }
  return best || { x: 0, z: 0 };
}
function dmEnsureEnt(id, info) {
  let e = DM.ents[id];
  if (!e) { e = DM.ents[id] = { id, x: 0, y: 0, z: 0, yaw: 0, tx: 0, ty: 0, tz: 0, tyaw: 0, hp: 100, alive: true, f: 0, d: 0, spd: 0 }; }
  Object.assign(e, info || {});
  if (!e.A || e.A.skin !== e.skin || e.A.color !== dmColorFor(e) || e.A.name !== e.name) { if (e.A) arenaGroup.remove(e.A.root); e.A = makeAvatar(e.skin || 'specops', e.name || id, dmColorFor(e)); e.A.name = e.name; arenaGroup.add(e.A.root); }
  return e;
}
function dmMeEnt() { return { id: DM.me, name: MY_NAME, skin: MY_SKIN, team: DM.myTeam || 0, f: DM.myF || 0, d: DM.myD || 0 }; }
function dmAllScores() { const L = [dmMeEnt(), ...Object.values(DM.ents).filter(e => e.id !== DM.me)]; return L; }
// --- arena ---
function dmBuildArena() {
  STATE.level = 2; STATE.floor = 1; STATE.bossSpawned = true; STATE.floorCleared = true; STATE.combatActive = true;
  PROJECTILES.forEach(p => scene.remove(p.mesh)); PROJECTILES = [];
  const layout = genFloorLayout(2, 1);
  MAP_OBJECTS = layout.objects.filter(o => !/colossus|celldoor|^emp$|cryo/.test(o.type)); FLOOR_INFO = layout.info;
  buildArenaMap(); clearBots();
  document.getElementById('boss-hud')?.classList.add('hidden');
  STATE.diff = { dmg: 1, fire: 1 };
}
function dmResetPlayer() {
  const p = dmSpawnPoint(); Object.assign(STATE.player, { x: p.x, z: p.z, y: 0, vy: 0, pitch: 0, yaw: Math.random() * 6.28, health: 100, armor: 25 });
  STATE.weapons.forEach(w => { if (w.maxAmmo !== Infinity) w.ammo = w.maxAmmo; }); STATE.grenades = 2; DM.meAlive = true; updateHUD();
}
function dmStartMatch(cfg) {
  try { SFX.init(); initVoice(); } catch (e) {}
  Object.assign(DM, cfg || {}); DM.on = true; STATE.dm = true; DM.ended = false; DM.t = DM.timeLimit; DM.myF = 0; DM.myD = 0;
  Object.values(DM.ents).forEach(e => { e.f = 0; e.d = 0; });
  document.body.classList.add('dm');
  ['splash-screen', 'game-modal'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  dmBuildArena(); Object.values(DM.ents).forEach(e => { if (e.A) { arenaGroup.add(e.A.root); } });
  if (DM.host) dmFillBots();
  dmResetPlayer(); STATE.running = true; buildViewModel(); renderWeaponBar();
  try { window.r13MoveHint && r13MoveHint(); } catch (e) {}
  dmTop(); showBanner(DM.mode === 'team' ? 'SQUAD DEATHMATCH' : 'DEATHMATCH', `FIRST TO ${DM.fragLimit} FRAGS · ${Math.round(DM.timeLimit / 60)} MIN`, 2600);
  if (!IS_COARSE) setTimeout(() => { try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }, 80);
  if (DM.host) dmBroadcastRoster();
}
function dmHumanCount() { return 1 + Object.values(DM.ents).filter(e => !e.bot).length; }
function dmFillBots() {
  const want = Math.max(0, Math.min(DM.maxBots ?? 7, 8 - dmHumanCount()));
  let bots = Object.values(DM.ents).filter(e => e.bot);
  while (bots.length > want) { const b = bots.pop(); if (b.A) arenaGroup.remove(b.A.root); delete DM.ents[b.id]; }
  let i = 0; while (bots.length < want) {
    const id = 'bot' + (DM.botN++); const p = dmSpawnPoint();
    const teamCounts = [0, 0]; [dmMeEnt(), ...Object.values(DM.ents)].forEach(e => teamCounts[e.team || 0]++);
    const b = dmEnsureEnt(id, { bot: true, name: BOT_NAMES[DM.botN % BOT_NAMES.length] + ' [AI]', skin: SKINS[(DM.botN + i) % SKINS.length].id, team: teamCounts[0] <= teamCounts[1] ? 0 : 1, x: p.x, z: p.z, tx: p.x, tz: p.z, hp: 100, alive: true, fireT: 1 + Math.random(), think: 0, path: null, pi: 0 });
    b.A.root.position.set(p.x, 0, p.z); bots.push(b); i++;
  }
  if (DM.mode === 'team') { // balance human team on start
    const humans = [dmMeEnt(), ...Object.values(DM.ents).filter(e => !e.bot)]; humans.forEach((h, k) => { if (h.id === DM.me) DM.myTeam = k % 2; else DM.ents[h.id].team = k % 2; });
    Object.values(DM.ents).filter(e => !e.bot).forEach(e => dmEnsureEnt(e.id));
    let n = [0, 0]; humans.forEach((h, k) => n[k % 2]++); Object.values(DM.ents).filter(e => e.bot).forEach(b => { b.team = n[0] <= n[1] ? 0 : 1; n[b.team]++; dmEnsureEnt(b.id); });
  }
}
// --- tracers (pooled lines) ---
const TRACERS = [];
function dmTracer(a, b, color) {
  let t = TRACERS.find(t => t.life <= 0);
  if (!t) { if (TRACERS.length > 24) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); t = { line: new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })), life: 0 }; t.line.frustumCulled = false; scene.add(t.line); TRACERS.push(t); }
  const p = t.line.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; t.line.material.color.setHex(color); t.line.visible = true; t.life = 0.09;
}
function dmTracersUpdate(dt) { TRACERS.forEach(t => { if (t.life > 0) { t.life -= dt; t.line.material.opacity = Math.max(0, t.life / 0.09); if (t.life <= 0) t.line.visible = false; } }); }
// --- hit test (ray vs vertical capsule) ---
function rayHitEnt(o, d, e, maxD = 120) {
  const h = (SKIN_BY[e.skin] || SKINS[0]).h; const cx = e.x - o.x, cz = e.z - o.z; const dl = Math.hypot(d.x, d.z) || 1e-6;
  const t = (cx * d.x + cz * d.z) / (dl * dl); if (t < 0 || t > maxD) return -1;
  const px = o.x + d.x * t - e.x, pz = o.z + d.z * t - e.z; if (px * px + pz * pz > 0.5 * 0.5) return -1;
  const y = o.y + d.y * t; if (y < e.y - 0.1 || y > e.y + h + 0.1) return -1;
  return t;
}
function dmLocalShot(start, dir, wIdx, mult) {
  if (!DM.on || !DM.meAlive) return;
  const dmg = DM_DMG[wIdx] * (mult || 1); const splash = wIdx === 2;
  let best = null, bt = 1e9; const me = dmMeEnt();
  Object.values(DM.ents).forEach(e => { if (!e.alive || !dmEnemy(me, e)) return; const t = rayHitEnt(start, dir, e); if (t > 0 && t < bt) { bt = t; best = e; } });
  let end = start.clone().addScaledVector(dir, best ? bt : 60);
  if (best && segmentBlocked(start, end)) best = null;
  if (!best) { // walls stop the tracer; rockets splash anyone nearby the impact
    const n = 60; for (let i = 1; i < n; i++) { const p = start.clone().addScaledVector(dir, i); if (segmentBlocked(start, p)) { end = p; break; } }
    if (splash) Object.values(DM.ents).forEach(e => { if (e.alive && dmEnemy(me, e) && Math.hypot(e.x - end.x, e.z - end.z) < 4) dmSendHit(e.id, Math.round(dmg * 0.5), wIdx); });
  } else { dmSendHit(best.id, Math.round(dmg), wIdx); spawnImpact(end.x, end.y, end.z, 0xff3b3b); dmHitMarker(); }
  dmNetShot(start, end, wIdx);
}
function dmHitMarker() { const c = document.getElementById('crosshair') || document.getElementById('crosshair-wrap'); if (!c) return; c.classList.add('dm-hit'); clearTimeout(c._h); c._h = setTimeout(() => c.classList.remove('dm-hit'), 140); try { SFX.playPew(1400); } catch (e) {} }
const WCOL = [0x38bdf8, 0xffaa00, 0xff4400, 0x7dd3fc];
// --- damage / death ---
function dmApplyDamageTo(targetId, dmg, fromId, w) { // runs on host
  if (targetId === DM.me) return dmTakeDamage(dmg, fromId);
  const e = DM.ents[targetId]; if (!e || !e.alive) return;
  if (e.bot) { e.hp -= dmg; e.lastAttacker = fromId; if (e.hp <= 0) { e.alive = false; e.respawnT = 3; dmOnKill(fromId, targetId); } }
  else dmSendTo(targetId, { t: 'hit', dmg, from: fromId });
}
function dmSendHit(targetId, dmg, w) { if (DM.host) dmApplyDamageTo(targetId, dmg, DM.me, w); else dmSendToHost({ t: 'hit', target: targetId, dmg, w }); }
function dmTakeDamage(dmg, fromId) {
  STATE.lastHurtT = performance.now();
  if (!DM.meAlive || DM.ended) return;
  const absorb = Math.min(STATE.player.armor, Math.ceil(dmg * 0.4)); STATE.player.armor -= absorb; STATE.player.health -= (dmg - absorb);
  STATE.screenShake = Math.max(STATE.screenShake, 0.3); const fl = document.getElementById('damage-flash'); if (fl) { fl.style.opacity = '1'; setTimeout(() => (fl.style.opacity = '0'), 140); }
  const src = DM.ents[fromId]; if (src) dmDamageDir(src);
  updateHUD();
  if (STATE.player.health <= 0) {
    DM.meAlive = false; STATE.player.health = 0; const killer = (DM.ents[fromId] || {}).name || 'WORLD';
    showBanner('FRAGGED', `by ${killer} · respawning…`, 2400); DM.respawnAt = performance.now() + 2600;
    if (DM.host) dmOnKill(fromId, DM.me); else dmSendToHost({ t: 'died', killer: fromId });
  }
}
function dmDamageDir(src) { let el = document.getElementById('dm-dmgdir'); if (!el) { el = document.createElement('div'); el.id = 'dm-dmgdir'; document.body.appendChild(el); }
  const a = Math.atan2(src.x - STATE.player.x, src.z - STATE.player.z); const rel = -(a - (STATE.player.yaw + Math.PI)); el.style.transform = `translate(-50%,-50%) rotate(${rel}rad)`; el.style.opacity = '1'; clearTimeout(el._t); el._t = setTimeout(() => el.style.opacity = '0', 500); }
function dmNameOf(id) { return id === DM.me ? MY_NAME : (DM.ents[id] || {}).name || '???'; }
function dmOnKill(killerId, victimId) { // host authoritative
  const bump = (id, k, v) => { if (id === DM.me) { if (k === 'f') DM.myF += v; else DM.myD += v; } else if (DM.ents[id]) DM.ents[id][k] += v; };
  if (killerId && killerId !== victimId) bump(killerId, 'f', 1); else bump(victimId, 'f', -1);
  bump(victimId, 'd', 1);
  const feed = `${dmNameOf(killerId)} ✕ ${dmNameOf(victimId)}`; dmFeed(feed); dmBroadcast({ t: 'score', sc: dmScoreTable(), feed });
  dmCheckEnd();
}
function dmScoreTable() { const o = {}; dmAllScores().forEach(e => o[e.id] = [e.f, e.d, e.team || 0]); return o; }
function dmApplyScores(sc) { Object.entries(sc).forEach(([id, [f, d, tm]]) => { if (id === DM.me) { DM.myF = f; DM.myD = d; DM.myTeam = tm; } else if (DM.ents[id]) { DM.ents[id].f = f; DM.ents[id].d = d; if (DM.ents[id].team !== tm) { DM.ents[id].team = tm; dmEnsureEnt(id); } } }); dmTop(); if (document.getElementById('dm-board')?.style.display === 'flex') dmBoard(true); }
function dmFeed(t) { try { addKillFeed(t); } catch (e) {} }
function dmCheckEnd() {
  if (DM.ended) return; const L = dmAllScores();
  let win = null;
  if (DM.mode === 'team') { const ts = [0, 0]; L.forEach(e => ts[e.team || 0] += e.f); if (ts[0] >= DM.fragLimit) win = 'RED SQUAD'; else if (ts[1] >= DM.fragLimit) win = 'BLUE SQUAD'; else if (DM.t <= 0) win = ts[0] === ts[1] ? 'DRAW' : (ts[0] > ts[1] ? 'RED SQUAD' : 'BLUE SQUAD'); }
  else { const top = L.slice().sort((a, b) => b.f - a.f)[0]; if (top.f >= DM.fragLimit || DM.t <= 0) win = top.name || dmNameOf(top.id); }
  if (win) { dmBroadcast({ t: 'end', win, sc: dmScoreTable() }); dmEnd(win); }
}
function dmEnd(win) { DM.ended = true; showBanner('MATCH OVER', `${win} WINS`, 6000); dmBoard(true); if (DM.host) setTimeout(() => { if (DM.on && DM.ended) dmRestart(); }, 12000); }
function dmRestart() { DM.ended = false; DM.t = DM.timeLimit; DM.myF = DM.myD = 0; Object.values(DM.ents).forEach(e => { e.f = e.d = 0; if (e.bot) { const p = dmSpawnPoint(); Object.assign(e, { x: p.x, z: p.z, hp: 100, alive: true }); } }); dmBoard(false); dmResetPlayer(); dmBroadcast({ t: 'restart' }); dmBroadcast({ t: 'score', sc: dmScoreTable() }); dmTop(); }
// --- HUD ---
function dmTop() {
  let el = document.getElementById('dm-top'); if (!el) { el = document.createElement('div'); el.id = 'dm-top'; el.onclick = () => dmBoard(document.getElementById('dm-board')?.style.display !== 'flex'); document.body.appendChild(el); }
  const L = dmAllScores(); const mm = Math.max(0, Math.ceil(DM.t)); const tm = `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, '0')}`;
  if (DM.mode === 'team') { const ts = [0, 0]; L.forEach(e => ts[e.team || 0] += e.f); el.innerHTML = `<b style="color:#f87171">${ts[0]}</b><span class="sep"></span><span>${tm}</span><span class="sep"></span><b style="color:#60a5fa">${ts[1]}</b><span class="k">/${DM.fragLimit}</span>`; }
  else { const s = L.slice().sort((a, b) => b.f - a.f); const lead = s[0]; el.innerHTML = `<span class="k">YOU</span> <b>${DM.myF || 0}</b><span class="sep"></span><span>${tm}</span><span class="sep"></span><span class="k">LEAD</span> <b>${lead ? lead.f : 0}</b><span class="k">/${DM.fragLimit}</span>`; }
}
function dmBoard(show) {
  let el = document.getElementById('dm-board'); if (!el) { el = document.createElement('div'); el.id = 'dm-board'; el.className = 'glass-card'; el.onclick = () => dmBoard(false); document.body.appendChild(el); }
  if (!show) { el.style.display = 'none'; return; }
  const L = dmAllScores().slice().sort((a, b) => b.f - a.f || a.d - b.d);
  el.innerHTML = `<div class="gc-t">${DM.mode === 'team' ? 'SQUAD DEATHMATCH' : 'DEATHMATCH'} · ${DM.code ? 'ROOM ' + DM.code : 'PRACTICE'}</div><table><tr><th></th><th>OPERATOR</th><th>CLASS</th><th>FRAGS</th><th>DEATHS</th></tr>` +
    L.map((e, i) => `<tr class="${e.id === DM.me ? 'me' : ''}"><td>${i + 1}</td><td style="color:#${new THREE.Color(DM.mode === 'team' ? TEAM_COL[e.team || 0] : (e.id === DM.me ? 0x7dd3fc : FFA_COL)).getHexString()}">${(e.name || dmNameOf(e.id)).replace(/</g, '')}${e.bot ? '' : (e.id === DM.me ? ' (YOU)' : ' ●')}</td><td>${(SKIN_BY[e.skin] || {}).name || ''}</td><td>${e.f}</td><td>${e.d}</td></tr>`).join('') + `</table><div class="gc-s">TAP / TAB TO CLOSE</div>`;
  el.style.display = 'flex';
}
window.addEventListener('keydown', e => { if (e.code === 'Tab' && DM.on) { e.preventDefault(); dmBoard(true); } });
window.addEventListener('keyup', e => { if (e.code === 'Tab' && DM.on && !DM.ended) dmBoard(false); });
// --- bots (host) ---
function dmBotThink(b, dt) {
  if (!b.alive) { b.respawnT -= dt; if (b.respawnT <= 0) { const p = dmSpawnPoint(); Object.assign(b, { x: p.x, z: p.z, hp: 100, alive: true, path: null }); } return; }
  b.think -= dt; const meE = { id: DM.me, x: STATE.player.x, y: STATE.player.y, z: STATE.player.z, team: DM.myTeam || 0, alive: DM.meAlive };
  if (b.think <= 0) {
    b.think = 0.35 + Math.random() * 0.25; let tgt = null, td = 1e9;
    [meE, ...Object.values(DM.ents)].forEach(e => { if (!e.alive || e === b || !dmEnemy(b, e)) return; const d = Math.hypot(e.x - b.x, e.z - b.z); if (d > 70) return;
      const vis = !segmentBlocked(new THREE.Vector3(b.x, b.y + 1.5, b.z), new THREE.Vector3(e.x, (e.y || 0) + 1.4, e.z)); if (vis && d < td) { td = d; tgt = e; } });
    b.tgt = tgt ? tgt.id : null; b.tgtD = td;
    if (!tgt && (!b.path || b.pi >= b.path.length)) { const g = Math.random() < 0.6 ? [meE, ...Object.values(DM.ents)].filter(e => e.alive && e !== b && dmEnemy(b, e))[Math.floor(Math.random() * 8)] : null; const gx = g ? g.x : -70 + Math.random() * 140, gz = g ? g.z : -64 + Math.random() * 128; const pth = aStar(b.x, b.z, gx, gz); b.path = pth && pth.length ? pth : null; b.pi = 0; }
    b.strafe = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.6);
  }
  const tgt = b.tgt ? (b.tgt === DM.me ? meE : DM.ents[b.tgt]) : null;
  let mx = 0, mz = 0, spd = 0;
  if (tgt && tgt.alive) {
    b.yaw = Math.atan2(-(tgt.x - b.x), -(tgt.z - b.z)); const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);
    const adv = b.tgtD > 22 ? 1 : (b.tgtD < 9 ? -0.6 : 0); mx = fx * adv + fz * b.strafe; mz = fz * adv - fx * b.strafe; spd = 4.6;
    b.fireT -= dt; if (b.fireT <= 0) { b.fireT = 0.55 + Math.random() * 0.6; const acc = Math.max(0.12, 0.62 - b.tgtD * 0.009) * (STATE.botSkill || 1) * (tgt.id === DM.me && STATE.player.crouch ? 0.8 : 1);
      const a = new THREE.Vector3(b.x, b.y + 1.45, b.z), hit = Math.random() < acc; const e2 = new THREE.Vector3(tgt.x + (hit ? 0 : (Math.random() - 0.5) * 2.5), (tgt.y || 0) + 1.2 + (hit ? 0 : Math.random()), tgt.z + (hit ? 0 : (Math.random() - 0.5) * 2.5));
      dmTracer(a, e2, 0xfbbf24); dmBroadcast({ t: 'shot', id: b.id, a: [a.x, a.y, a.z], b: [e2.x, e2.y, e2.z], w: 0 }); dmShotSfx(a);
      if (hit) dmApplyDamageTo(tgt.id, 9 + Math.round(Math.random() * 5), b.id, 0); }
  } else if (b.path && b.pi < b.path.length) {
    const n = b.path[b.pi]; const nx = n.x ?? n[0], nz = n.z ?? n[1]; const dx = nx - b.x, dz = nz - b.z, d = Math.hypot(dx, dz);
    if (d < 1.2) b.pi++; else { mx = dx / d; mz = dz / d; spd = 5.2; b.yaw = Math.atan2(-mx, -mz); }
  }
  const nx = b.x + mx * spd * dt, nz = b.z + mz * spd * dt;
  let blocked = false;
  if (!collidesAt(nx, b.z, 0.5)) b.x = nx; else { b.path = null; blocked = true; }
  if (!collidesAt(b.x, nz, 0.5)) b.z = nz; else { b.path = null; blocked = true; }
  // Round 17: a fighting bot that strafes into a wall flips direction instead of grinding against it; embedded bots pop free
  if (blocked && spd > 0) { b.blockT = (b.blockT || 0) + dt; if (b.blockT > 0.3) { b.blockT = 0; b.strafe = -(b.strafe || 1); } } else b.blockT = 0;
  if (collidesAt(b.x, b.z, 0.45)) { const fr = botNearestFree(b.x, b.z, 0.5); if (fr) { b.x = fr[0]; b.z = fr[1]; } }
  b.y = getGroundHeightAt(b.x, b.z, b.y || 0); b.spd = spd * Math.min(1, Math.hypot(mx, mz));
}
function dmAimList() { const me = dmMeEnt(); return Object.values(DM.ents).filter(e => e.alive && dmEnemy(me, e)).map(e => ({ x: e.x, y: (e.y || 0) + 0.2, z: e.z })); }
function dmShotSfx(p) { const d = Math.hypot(p.x - STATE.player.x, p.z - STATE.player.z); if (d < 45) try { SFX.playPew(260 + Math.random() * 60); } catch (e) {} }
// --- per-frame ---
function dmUpdate(dt) {
  if (!DM.on) return;
  dmTracersUpdate(dt);
  if (DM.host && !DM.ended && STATE.running) { DM.t -= dt; if (DM.t <= 0) dmCheckEnd(); }
  else if (!DM.host && !DM.ended) DM.t = Math.max(0, DM.t - dt);
  DM._topT = (DM._topT || 0) - dt; if (DM._topT <= 0) { DM._topT = 0.5; dmTop(); }
  if (!DM.meAlive && DM.respawnAt && performance.now() > DM.respawnAt && !DM.ended) { DM.respawnAt = 0; dmResetPlayer(); }
  Object.values(DM.ents).forEach(e => {
    if (DM.host && e.bot && STATE.running && !DM.ended) dmBotThink(e, dt);
    if (!e.bot || !DM.host) { const k = Math.min(1, dt * 12); const px = e.x, pz = e.z; e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k; e.y += ((e.ty || 0) - e.y) * k;
      let dy = (e.tyaw || 0) - e.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); e.yaw += dy * k; if (!e.bot) e.spd = Math.hypot(e.x - px, e.z - pz) / Math.max(dt, 1e-3); }
    if (!e.A) return; e.A.root.visible = !!e.alive; e.A.root.position.set(e.x, e.y || 0, e.z); e.A.root.rotation.y = e.yaw;
    const far = Math.hypot(e.x - STATE.player.x, e.z - STATE.player.z); if (far < (IS_COARSE ? 45 : 80)) animateAvatar(e.A, dt, e.spd || 0);
  });
  DM.sendT -= dt; if (DM.net && DM.sendT <= 0) { DM.sendT = 1 / 15; dmNetTick(); }
  if (DM.host && DM.net) { const now = performance.now(); Object.values(DM.ents).forEach(e => { if (!e.bot && e.seen && now - e.seen > 10000) { dmFeed(`${e.name} timed out`); if (e.A) arenaGroup.remove(e.A.root); delete DM.ents[e.id]; delete DM.conns[e.id]; dmFillBots(); dmBroadcastRoster(); } }); }
}
// --- networking (PeerJS star: host relays, authoritative for bots & score) ---
function dmBroadcast(m, except) { if (!DM.host) return; if (DM.bc) { DM.bc.postMessage({ to: '*', except, from: DM.me, m }); return; } Object.entries(DM.conns).forEach(([id, c]) => { if (id !== except && c.open) try { c.send(m); } catch (e) {} }); }
function dmSendTo(id, m) { if (DM.bc) { DM.bc.postMessage({ to: id, from: DM.me, m }); return; } const c = DM.conns[id]; if (c && c.open) try { c.send(m); } catch (e) {} }
function dmSendToHost(m) { if (DM.bc) { DM.bc.postMessage({ to: 'host', from: DM.me, m }); return; } if (DM.hostConn && DM.hostConn.open) try { DM.hostConn.send(m); } catch (e) {} }
function dmNetShot(a, b, w) { const m = { t: 'shot', id: DM.me, a: [a.x, a.y, a.z], b: [b.x, b.y, b.z], w }; if (DM.host) dmBroadcast(m); else dmSendToHost(m); }
function dmPose() { const P = STATE.player; return [DM.me, +P.x.toFixed(2), +P.y.toFixed(2), +P.z.toFixed(2), +P.yaw.toFixed(2), DM.meAlive ? 1 : 0]; }
function dmNetTick() {
  if (DM.host) { const s = [dmPose()]; Object.values(DM.ents).forEach(e => s.push([e.id, +e.x.toFixed(2), +(e.y || 0).toFixed(2), +e.z.toFixed(2), +e.yaw.toFixed(2), e.alive ? 1 : 0])); dmBroadcast({ t: 'snap', s, tl: Math.round(DM.t) }); }
  else dmSendToHost({ t: 'p', p: dmPose() });
}
function dmRosterMsg() { const R = [{ id: DM.me, name: MY_NAME, skin: MY_SKIN, team: DM.myTeam || 0, bot: false }]; Object.values(DM.ents).forEach(e => R.push({ id: e.id, name: e.name, skin: e.skin, team: e.team || 0, bot: !!e.bot })); return { t: 'roster', R, cfg: { mode: DM.mode, fragLimit: DM.fragLimit, timeLimit: DM.timeLimit }, started: DM.on, sc: dmScoreTable() }; }
function dmBroadcastRoster() { dmBroadcast(dmRosterMsg()); dmLobbyList(); }
function dmSendHello() { const m = { t: 'hello', name: MY_NAME, skin: MY_SKIN }; if (DM.host) { dmBroadcastRoster(); } else dmSendToHost(m); }
function dmHostOnData(id, m) {
  if (!m || !m.t) return;
  if (m.t === 'hello') { const e = dmEnsureEnt(id, { name: String(m.name || 'OP').slice(0, 12), skin: SKIN_BY[m.skin] ? m.skin : 'specops', bot: false, alive: true }); if (DM.on) { dmFillBots(); if (DM.mode === 'team') { const n = [0, 0]; dmAllScores().filter(x => !x.bot && x.id !== id).forEach(x => n[x.team || 0]++); e.team = n[0] <= n[1] ? 0 : 1; dmEnsureEnt(id); } } dmBroadcastRoster(); dmFeed(`${e.name} joined`); if (DM.on) dmSendTo(id, { t: 'start', cfg: { mode: DM.mode, fragLimit: DM.fragLimit, timeLimit: DM.timeLimit, t: DM.t } }); return; }
  const e = DM.ents[id]; if (!e) return;
  e.seen = performance.now();
  if (m.t === 'p') { const p = m.p; e.tx = p[1]; e.ty = p[2]; e.tz = p[3]; e.tyaw = p[4]; e.alive = !!p[5]; }
  else if (m.t === 'shot') { dmBroadcast(m, id); dmRemoteShot(m); }
  else if (m.t === 'hit') { const tg = m.target === DM.me ? dmMeEnt() : DM.ents[m.target]; if (tg && dmEnemy(e, tg)) dmApplyDamageTo(m.target, Math.min(200, m.dmg | 0), id, m.w); }
  else if (m.t === 'died') { e.alive = false; dmOnKill(m.killer, id); }
}
function dmClientOnData(m) {
  if (!m || !m.t) return;
  if (m.t === 'roster') { const keep = new Set(m.R.map(r => r.id)); Object.keys(DM.ents).forEach(id => { if (!keep.has(id)) { if (DM.ents[id].A) arenaGroup.remove(DM.ents[id].A.root); delete DM.ents[id]; } });
    m.R.forEach(r => { if (r.id === DM.me) { DM.myTeam = r.team; return; } dmEnsureEnt(r.id, { name: r.name, skin: r.skin, team: r.team, bot: r.bot }); }); Object.assign(DM, m.cfg || {}); if (m.sc) dmApplyScores(m.sc); dmLobbyList(); }
  else if (m.t === 'start') { if (!DM.on) dmStartMatch(Object.assign({ host: false }, m.cfg)); if (m.cfg && m.cfg.t) DM.t = m.cfg.t; }
  else if (m.t === 'snap') { if (m.tl != null) DM.t = m.tl; m.s.forEach(p => { if (p[0] === DM.me) return; const e = DM.ents[p[0]]; if (!e) return; e.tx = p[1]; e.ty = p[2]; e.tz = p[3]; e.tyaw = p[4]; if (!e.alive && p[5]) { e.x = e.tx; e.z = e.tz; } e.alive = !!p[5]; }); }
  else if (m.t === 'shot') dmRemoteShot(m);
  else if (m.t === 'hit') dmTakeDamage(m.dmg, m.from);
  else if (m.t === 'score') { dmApplyScores(m.sc); if (m.feed) dmFeed(m.feed); }
  else if (m.t === 'end') { dmApplyScores(m.sc); dmEnd(m.win); }
  else if (m.t === 'restart') { DM.ended = false; DM.t = DM.timeLimit; dmBoard(false); dmResetPlayer(); }
}
function dmRemoteShot(m) { const a = new THREE.Vector3(...m.a), b = new THREE.Vector3(...m.b); dmTracer(a, b, WCOL[m.w] || 0xfbbf24); dmShotSfx(a); if (m.w === 2) try { spawnImpact(b.x, b.y, b.z, 0xff5500); } catch (e) {} }
const DM_ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turns:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }];
function dmPeer(id) { const o = { debug: 0, config: { iceServers: DM_ICE } }; return id ? new Peer(id, o) : new Peer(o); }
// same-device / test transport (BroadcastChannel) — ?net=local
const DM_LOCAL = /[?&]net=local/.test(location.search) && typeof BroadcastChannel === 'function';
function dmLocalHost(code, onReady) {
  DM.host = true; DM.net = true; DM.me = 'host'; DM.code = code; DM.ents = {}; DM.conns = {};
  DM.bc = new BroadcastChannel('dys-' + code);
  DM.bc.onmessage = ev => { const d = ev.data || {}; if (d.to !== 'host') return; if (d.m && d.m.t === 'bye') { const e = DM.ents[d.from]; delete DM.conns[d.from]; if (e) { dmFeed(`${e.name} left`); if (e.A) arenaGroup.remove(e.A.root); delete DM.ents[d.from]; } if (DM.on) dmFillBots(); dmBroadcastRoster(); return; }
    if (!DM.conns[d.from]) { if (Object.keys(DM.conns).length >= 7) { DM.bc.postMessage({ to: d.from, from: 'host', m: { t: 'full' } }); return; } DM.conns[d.from] = { open: true }; } dmHostOnData(d.from, d.m); };
  dmStatus(`ROOM ${code} OPEN (local) · share the QR`); setTimeout(() => { onReady && onReady(); dmLobbyList(); }, 0);
}
function dmLocalJoin(code) {
  DM.host = false; DM.net = true; DM.code = code; DM.ents = {}; DM.me = 'c' + Math.random().toString(36).slice(2, 9);
  DM.bc = new BroadcastChannel('dys-' + code); let ok = false;
  DM.bc.onmessage = ev => { const d = ev.data || {}; if (!(d.to === DM.me || (d.to === '*' && d.except !== DM.me))) return; if (d.m && d.m.t === 'full') { dmStatus('Room is full (8 players)'); return; } if (!ok) { ok = true; dmStatus(`JOINED ROOM ${code} · waiting for host`); } dmClientOnData(d.m); };
  window.addEventListener('pagehide', () => dmSendToHost({ t: 'bye' }));
  dmSendHello(); setTimeout(() => { if (!ok) dmStatus(`No room ${code} found`); }, 5000);
}
function dmHost(code, onReady) {
  if (DM_LOCAL) return dmLocalHost(code, onReady);
  if (typeof Peer !== 'function') { dmStatus('Network library failed to load — check connection'); return; }
  DM.host = true; DM.net = true; DM.me = 'host'; DM.code = code; DM.ents = {}; DM.conns = {};
  DM.peer = dmPeer(`dys-${code.toLowerCase()}`);
  DM.peer.on('open', () => { dmStatus(`ROOM ${code} OPEN · share the QR`); onReady && onReady(); dmLobbyList(); });
  DM.peer.on('connection', c => {
    c.on('open', () => { if (Object.keys(DM.conns).length >= 7) { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); return; } DM.conns[c.peer] = c; });
    c.on('data', m => dmHostOnData(c.peer, m));
    c.on('close', () => { delete DM.conns[c.peer]; const e = DM.ents[c.peer]; if (e) { dmFeed(`${e.name} left`); if (e.A) arenaGroup.remove(e.A.root); delete DM.ents[c.peer]; } if (DM.on) dmFillBots(); dmBroadcastRoster(); });
  });
  DM.peer.on('error', err => dmStatus('Host error: ' + (err.type || err)));
}
function dmJoin(code) {
  if (DM_LOCAL) return dmLocalJoin(code);
  if (typeof Peer !== 'function') { dmStatus('Network library failed to load'); return; }
  DM.host = false; DM.net = true; DM.code = code; DM.ents = {};
  DM.peer = dmPeer(); dmStatus('Connecting…');
  DM.peer.on('open', id => { DM.me = id; const c = DM.peer.connect(`dys-${code.toLowerCase()}`, { reliable: true }); DM.hostConn = c;
    c.on('open', () => { dmStatus(`JOINED ROOM ${code} · waiting for host`); dmSendHello(); });
    c.on('data', m => { if (m && m.t === 'full') { dmStatus('Room is full (8 players)'); return; } dmClientOnData(m); });
    c.on('close', () => { dmStatus('Disconnected from host'); if (DM.on) showBanner('HOST LEFT', 'Match ended', 3000); }); });
  DM.peer.on('error', err => dmStatus(err.type === 'peer-unavailable' ? `No room ${code} found` : 'Join error: ' + (err.type || err)));
}
function dmStatus(t) { const e = document.getElementById('dm-status'); if (e) e.textContent = t; const l = document.getElementById('lobby-status'); if (l) l.textContent = t; }
function dmLobbyList() { const el = document.getElementById('dm-lobby'); if (!el) return; const L = [{ name: MY_NAME, skin: MY_SKIN, me: true }, ...Object.values(DM.ents).filter(e => !e.bot)];
  el.innerHTML = L.map(e => `<div class="dm-li">${(e.name || '').replace(/</g, '')} <span>${(SKIN_BY[e.skin] || {}).name || ''}${e.me ? ' · YOU' : ''}</span></div>`).join('') + `<div class="dm-li dim">${8 - L.length} slot(s) → AI bots</div>`; }
// --- lobby UI in the Doom Party panel ---
(function dmLobbyUI() {
  const panel = document.getElementById('panel-party-config'); if (!panel) return;
  const box = document.createElement('div'); box.id = 'dm-panel';
  box.innerHTML = `<div class="dm-row"><button id="dm-op" class="dm-btn"><span class="op-label"></span> ✎</button></div>
   <div class="dm-row"><select id="dm-mode"><option value="ffa">FREE-FOR-ALL</option><option value="team">SQUAD (TEAM) DM</option></select>
   <select id="dm-frags"><option>10</option><option selected>15</option><option>25</option></select><select id="dm-time"><option value="300">5 MIN</option><option value="600" selected>10 MIN</option><option value="900">15 MIN</option></select></div>
   <div class="dm-row"><button id="dm-start" class="dm-btn hot">START MATCH (HOST)</button><button id="dm-practice" class="dm-btn">PRACTICE vs 7 BOTS</button></div>
   <div id="dm-status" class="gc-s"></div><div id="dm-lobby"></div>`;
  panel.appendChild(box); updateOpLabels();
  document.getElementById('dm-op').onclick = () => openCharSelect();
  const cfg = () => ({ mode: document.getElementById('dm-mode').value, fragLimit: +document.getElementById('dm-frags').value, timeLimit: +document.getElementById('dm-time').value });
  document.getElementById('dm-start').onclick = () => {
    if (!DM.host || !(DM.peer || DM.bc)) { dmStatus('Tap HOST & QR first, then START when friends have joined'); return; }
    Object.assign(DM, cfg()); dmStartMatch({ host: true }); dmBroadcast({ t: 'start', cfg: Object.assign(cfg(), { t: DM.t }) }); dmBroadcastRoster();
  };
  document.getElementById('dm-practice').onclick = () => { DM.host = true; DM.net = false; DM.me = 'host'; DM.code = null; Object.assign(DM, cfg()); dmStartMatch({ host: true }); };
  // replace the old 2-player co-op wiring with the deathmatch host/join
  const hp = document.getElementById('btn-host-party'), jp = document.getElementById('btn-join-party');
  if (hp) hp.onclick = () => { const code = partyCode(); dmHost(code, () => { document.getElementById('qr-wrapper')?.classList.remove('hidden'); const lab = document.getElementById('qr-room-label'); if (lab) lab.textContent = `CODE: ${code}`; const qc = document.getElementById('qr-container'); if (qc) { qc.innerHTML = ''; try { qc.appendChild(qrCard(LIVE_URL + '?join=' + code, 'ROOM ' + code)); } catch (e) {} } }); };
  if (jp) jp.onclick = () => { const code = (document.getElementById('input-join-code').value || '').trim().toUpperCase(); if (code.length < 4) { dmStatus('Enter the 5-letter room code'); return; } dmJoin(code); };
  // cheat hint under solo panel (desktop & phone)
  const solo = document.getElementById('panel-solo-config'); if (solo) { const b = document.createElement('button'); b.className = 'dm-btn'; b.id = 'btn-choose-op'; b.innerHTML = 'OPERATOR: <span class="op-label"></span>'; b.onclick = () => openCharSelect(); solo.insertBefore(b, solo.firstChild); updateOpLabels(); }
})();

// ---------- Round 13: bullet fire icon, TURN next to fire, tiny control labels, MOVE hint ----------
(function r13Controls() {
  const BULLET = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M12 1.8c2.3 1.9 3.3 4.6 3.3 7.5V15H8.7V9.3c0-2.9 1-5.6 3.3-7.5z"/><path d="M8.1 15h7.8v2.3H8.1z" fill="rgba(255,255,255,.25)"/><path d="M8.7 17.3h6.6v4.4H8.7z"/><path d="M10.5 6.6c.35-1 .85-1.8 1.5-2.4" opacity=".75"/><path d="M10.6 19.5h2.8" opacity=".6"/></svg>';
  const _TURN_UNUSED = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12a7 7 0 1 1 2.05 4.95"/><path d="M4.2 18.6 7.05 16.95 5.4 14.1"/><text x="12" y="14.6" font-size="6.6" font-family="Chakra Petch,sans-serif" font-weight="800" fill="#fff" stroke="none" text-anchor="middle">180</text></svg>';
  ICONS.fire = BULLET;
  const $ = id => document.getElementById(id);
  const lab = (el, t) => { if (!el || el.querySelector(':scope > .mc-lab')) return; const s = document.createElement('span'); s.className = 'mc-lab'; s.textContent = t; el.appendChild(s); };
  const swapIcon = el => { if (!el) return; const old = el.querySelector(':scope > svg'); if (old) old.outerHTML = BULLET; };
  swapIcon($('btn-fire')); swapIcon($('mc-lfire'));
  [['btn-fire', 'FIRE · DRAG TO AIM'], ['mc-lfire', 'FIRE · AIM'], ['btn-jump', 'JUMP'], ['btn-crouch', 'CROUCH'], ['btn-reload', 'RELOAD'], ['mc-ads', 'AIM'], ['btn-grenade', 'GRENADE'], ['mc-menu', 'MENU']].forEach(([id, t]) => lab($(id), t));
  // MOVE hint over the joystick zone — fades in briefly at deploy
  let mv = $('mc-movehint'); if (!mv) { mv = document.createElement('div'); mv.id = 'mc-movehint'; mv.innerHTML = '<span>◀ ▲ ▼ ▶</span><b>MOVE</b><i>drag anywhere on the left</i>'; document.body.appendChild(mv); }
  window.r13MoveHint = () => { mv.classList.remove('show'); void mv.offsetWidth; mv.classList.add('show'); };
  ['btn-start'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', () => setTimeout(window.r13MoveHint, 600)); });
})();
// quick 180 (0.14 s ease) so aim stays readable while running
function turnAnimUpdate(dt) { const A = STATE.turnAnim; if (!A) return; const t0 = A.t; A.t = Math.min(1, A.t + dt / 0.14); const e = u => u * u * (3 - 2 * u); STATE.player.yaw += Math.PI * (e(A.t) - e(t0)); if (A.t >= 1) STATE.turnAnim = null; }

// ---------- MUSIC: Kevin MacLeod (incompetech.com), all CC BY 4.0 ----------
const MUSIC_TRACKS = {
  title: { url: 'music/title_rising_game.mp3', name: 'Rising Game', by: 'Kevin MacLeod (incompetech.com)', gain: 0.9 },
  menu: { url: 'music/menu_dark_times.mp3', name: 'Dark Times', by: 'Kevin MacLeod (incompetech.com)', gain: 0.9 },
  ambient: { url: 'music/explore_devastation.mp3', name: 'Devastation and Revenge', by: 'Kevin MacLeod (incompetech.com)', gain: 0.85 },
  combat: { url: 'music/combat_metalmania.mp3', name: 'Metalmania', by: 'Kevin MacLeod (incompetech.com)', gain: 0.85 },
  combat2: { url: 'music/combat_killers.mp3', name: 'Killers', by: 'Kevin MacLeod (incompetech.com)', gain: 0.85 },
  boss: { url: 'music/boss_aggressor.mp3', name: 'Aggressor', by: 'Kevin MacLeod (incompetech.com)', gain: 0.9 },
  dm: { url: 'music/dm_burn_the_world_waltz.mp3', name: 'Burn The World Waltz', by: 'Kevin MacLeod feat. Alexander Nakarada', gain: 0.85 },
  credits: { url: 'music/credits_feral_angel_waltz.mp3', name: 'Feral Angel Waltz', by: 'Kevin MacLeod (incompetech.com)', gain: 0.9 }
};
// role -> rotation of slots
const MUSIC_ROLES = { title: ['title'], menu: ['menu'], ambient: ['ambient'], combat: ['combat', 'combat2'], boss: ['boss'], dm: ['dm', 'combat'], credits: ['credits'] };
const MUSIC_PRIORITY = { title: 1, menu: 1, ambient: 1 };
const MUSIC = { ready: false, on: localStorage.getItem('dys_music_on') !== '0', vol: parseFloat(localStorage.getItem('dys_music_vol') ?? '0.55'), buf: {}, loading: {}, bad: {}, rot: {}, cur: null, voices: {}, off: {}, role: null, slot: null, want: null, wantSlot: null, combatHold: 0, t: 0, duck: 1, creditsOpen: false };
if (!(MUSIC.vol >= 0 && MUSIC.vol <= 1)) MUSIC.vol = 0.55;
function musicInit() {
  if (MUSIC.ready) return; try { SFX.init(); } catch (e) { return; } const ctx = SFX.ctx; if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  MUSIC.master = ctx.createGain(); MUSIC.master.gain.value = MUSIC.on ? MUSIC.vol : 0; MUSIC.duckG = ctx.createGain(); MUSIC.duckG.connect(MUSIC.master); MUSIC.master.connect(ctx.destination);
  MUSIC.ready = true; ['title', 'menu', 'ambient'].forEach(musicLoad); setTimeout(() => ['combat', 'boss', 'combat2', 'dm', 'credits'].forEach(musicLoad), 6000);
}
function musicLoad(slot) {
  if (MUSIC.buf[slot] || MUSIC.loading[slot] || MUSIC.bad[slot]) return MUSIC.loading[slot]; const T = MUSIC_TRACKS[slot]; if (!T) return null;
  MUSIC.loading[slot] = fetch(T.url).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(ab => new Promise((res, rej) => SFX.ctx.decodeAudioData(ab, res, rej))).then(b => { MUSIC.buf[slot] = b; if (MUSIC.wantSlot === slot && MUSIC.slot !== slot) { MUSIC.role = null; musicPlay(MUSIC.want, 1.5); } return b; }).catch(() => { MUSIC.bad[slot] = true; if (MUSIC.wantSlot === slot) { MUSIC.wantSlot = null; MUSIC.role = null; musicPlay(MUSIC.want, 1.5); } return null; });
  return MUSIC.loading[slot];
}
function musicPickSlot(role) {
  const L = (MUSIC_ROLES[role] || [role]).filter(s => !MUSIC.bad[s]); if (!L.length) return null;
  if (MUSIC_PRIORITY[role]) return L[0];
  const i = (MUSIC.rot[role] = ((MUSIC.rot[role] ?? -1) + 1)) % L.length;
  // prefer a loaded slot so a fight never starts silent
  for (let k = 0; k < L.length; k++) { const s = L[(i + k) % L.length]; if (MUSIC.buf[s]) return s; }
  return L[i];
}
function musicPlay(role, fade = 2.5) {
  if (!MUSIC.ready) return; const sameWant = MUSIC.want === role; MUSIC.want = role; if (MUSIC.role === role) return;
  const ctx = SFX.ctx, now = ctx.currentTime;
  const slot = (sameWant && MUSIC.wantSlot && !MUSIC.bad[MUSIC.wantSlot]) ? MUSIC.wantSlot : musicPickSlot(role); MUSIC.wantSlot = slot;
  if (MUSIC.slot && MUSIC.voices[MUSIC.slot]) { const v = MUSIC.voices[MUSIC.slot]; MUSIC.off[MUSIC.slot] = ((now - v.t0) * 1) % v.src.buffer.duration; v.g.gain.cancelScheduledValues(now); v.g.gain.setValueAtTime(v.g.gain.value, now); v.g.gain.linearRampToValueAtTime(0, now + fade); try { v.src.stop(now + fade + 0.05); } catch (e) {} delete MUSIC.voices[MUSIC.slot]; }
  MUSIC.role = null; MUSIC.slot = null;
  if (!slot) return; const b = MUSIC.buf[slot]; if (!b) { musicLoad(slot); return; }
  const src = ctx.createBufferSource(); src.buffer = b; src.loop = true; const g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(MUSIC.duckG);
  const keep = role === 'ambient' || role === 'title' || role === 'menu'; const off = keep ? (MUSIC.off[slot] || 0) : 0;
  src.start(now, off); g.gain.linearRampToValueAtTime(MUSIC_TRACKS[slot].gain, now + fade);
  MUSIC.voices[slot] = { src, g, t0: now - off }; MUSIC.role = role; MUSIC.slot = slot;
}
function musicSetVolume(v) { MUSIC.vol = v; localStorage.setItem('dys_music_vol', v); if (MUSIC.master) MUSIC.master.gain.setTargetAtTime(MUSIC.on && !SFX.muted ? v : 0, SFX.ctx.currentTime, 0.1); }
function musicSetOn(on) { MUSIC.on = on; localStorage.setItem('dys_music_on', on ? '1' : '0'); musicSetVolume(MUSIC.vol); }
function musicRole() {
  if (MUSIC.creditsOpen) return 'credits';
  const shown = id => { const e = document.getElementById(id); return e && !e.classList.contains('hidden'); };
  if (shown('splash-screen')) return 'title';
  if (shown('game-modal')) return 'menu';
  if (!STATE.running) return MUSIC.role || 'title';
  if (STATE.dm) return 'dm';
  const P = STATE.player;
  const boss = COLOSSI.some(C => !C.dead && !C.rising && (C.alerted || C.engaged > 0) && Math.hypot(C.root.position.x - P.x, C.root.position.z - P.z) < 95) || BOTS.some(b => b.isBoss && !b.dying);
  if (boss) return 'boss';
  const fight = BOTS.some(b => !b.dying && b.aiState === 'combat' && Math.hypot(b.x - P.x, b.z - P.z) < 60) || (performance.now() - (STATE.lastHurtT || -1e9) < 5000);
  if (fight) MUSIC.combatHold = 9; return MUSIC.combatHold > 0 ? 'combat' : 'ambient';
}
function musicUpdate(dt) {
  if (!MUSIC.ready) return; MUSIC.combatHold = Math.max(0, MUSIC.combatHold - dt);
  MUSIC.t -= dt; if (MUSIC.t > 0) return; MUSIC.t = 0.25;
  const r = musicRole(); if (r !== MUSIC.want || (MUSIC.role !== r && MUSIC.wantSlot && MUSIC.buf[MUSIC.wantSlot])) musicPlay(r, r === 'combat' || r === 'boss' ? 1.2 : r === 'ambient' ? 4 : 2.5);
  // duck under the Colossus voice line (and while paused)
  const voice = COLOSSI.some(C => C.voice && C.voice.isPlaying);
  const d = voice ? 0.3 : (!STATE.running && !MUSIC.creditsOpen && r !== 'title' && r !== 'menu' ? 0.45 : 1);
  if (d !== MUSIC.duck) { MUSIC.duck = d; MUSIC.duckG.gain.setTargetAtTime(d, SFX.ctx.currentTime, voice ? 0.08 : 0.4); }
  const tgt = MUSIC.on && !SFX.muted ? MUSIC.vol : 0; if (Math.abs(MUSIC.master.gain.value - tgt) > 0.01) MUSIC.master.gain.setTargetAtTime(tgt, SFX.ctx.currentTime, 0.15);
}
// first user gesture unlocks audio (iOS) and starts the title theme
['pointerdown', 'keydown', 'touchend'].forEach(ev => window.addEventListener(ev, () => { musicInit(); }, { capture: true, passive: true }));
setInterval(() => { if (document.hidden) return; if (LORE_OPEN) musicUpdate(0.25); }, 250);
// ---- credits screen ----
const CREDITS_HTML = `<div class="gc-t">CREDITS</div>
 <div class="cr-sec"><b>DYSTOPIA · PROJECT MOSES</b><br>Created, written &amp; directed by Darcy D. Demby</div>
 <div class="cr-sec"><b>MUSIC</b><br>
 “Rising Game” — Kevin MacLeod (incompetech.com) · <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100593" target="_blank" rel="noopener">source</a><br>“Dark Times” — Kevin MacLeod (incompetech.com) · <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100747" target="_blank" rel="noopener">source</a><br>“Devastation and Revenge” — Kevin MacLeod (incompetech.com) · <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100694" target="_blank" rel="noopener">source</a><br>“Metalmania” — Kevin MacLeod (incompetech.com) · <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700023" target="_blank" rel="noopener">source</a><br>“Killers” — Kevin MacLeod (incompetech.com) · <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600024" target="_blank" rel="noopener">source</a><br>“Aggressor” — Kevin MacLeod (incompetech.com) · <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700051" target="_blank" rel="noopener">source</a><br>“Burn The World Waltz” — Kevin MacLeod featuring Alexander Nakarada (incompetech.com) · <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2100009" target="_blank" rel="noopener">source</a><br>“Feral Angel Waltz” — Kevin MacLeod (incompetech.com) · <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2100010" target="_blank" rel="noopener">source</a><br>
 All music licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">Creative Commons: By Attribution 4.0</a></div>
 <div class="cr-sec"><b>3D MODELS</b><br>Characters, Sentinels &amp; props generated with Meshy AI for Darcy Demby<br>"Bot Drone" by Dave404 via Poly Pizza — CC BY 3.0 (creativecommons.org/licenses/by/3.0)<br>Props (security camera, power box, air duct, fire extinguisher) from Poly Haven — CC0<br>Metal plate textures from ambientCG.com — CC0<br><br><b>TRAILER</b><br>Footage: U.S. DoD / DVIDS video (public domain) &amp; Wikimedia Commons photos — Security Council chamber photo by Jdforrester, CC BY 4.0; others CC0/PD · Fictional story; footage used under licence · Narrator: Piper TTS "john" · Music: Kevin MacLeod, CC BY 4.0</div>
 <div class="cr-sec"><b>TECH</b><br>three.js (MIT) · PeerJS (MIT) · qrcode-generator by Kazuhiko Arase (MIT)</div>
 <div class="cr-sec"><b>FONTS</b><br>Black Ops One · Chakra Petch · Caveat — SIL Open Font License 1.1</div>
 <div class="cr-sec dim">Now playing: “Feral Angel Waltz” — Kevin MacLeod</div><button id="cr-close">CLOSE</button>`;
// ---------- Round 19: startup trailer (first launch auto-plays muted; Skip; tap for sound; Watch Trailer in menus) ----------
const TRAILER_SRC = 'media/dystopia_trailer_720p.mp4', TRAILER_KEY = 'dys_trailer_seen_v3';
function playTrailer(manual) {
  if (document.getElementById('trailer-overlay')) return;
  const el = document.createElement('div'); el.id = 'trailer-overlay';
  el.innerHTML = `<video id="trailer-video" playsinline webkit-playsinline muted autoplay preload="auto" poster="media/trailer_poster.jpg"><source src="${TRAILER_SRC}" type="video/mp4"></video>
    <button id="trailer-sound" class="tr-btn">&#128264; TAP FOR SOUND</button><button id="trailer-skip" class="tr-btn">SKIP &#8250;&#8250;</button><div id="trailer-prog"><i></i></div>`;
  document.body.appendChild(el);
  const v = el.querySelector('video'), snd = el.querySelector('#trailer-sound'), bar = el.querySelector('#trailer-prog i');
  const duck = on => { try { if (MUSIC.master && SFX.ctx) MUSIC.master.gain.setTargetAtTime(on ? 0 : (MUSIC.on && !SFX.muted ? MUSIC.vol : 0), SFX.ctx.currentTime, 0.15); } catch (e) {} }; duck(true);
  const close = () => { try { localStorage.setItem(TRAILER_KEY, '1'); } catch (e) {} v.pause(); el.classList.add('out'); setTimeout(() => el.remove(), 450); document.removeEventListener('keydown', key); duck(false); };
  const key = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } };
  document.addEventListener('keydown', key);
  el.querySelector('#trailer-skip').onclick = e => { e.stopPropagation(); close(); };
  const unmute = () => { v.muted = false; v.volume = 1; snd.style.display = 'none'; v.play().catch(() => {}); };
  snd.onclick = e => { e.stopPropagation(); unmute(); };
  v.onclick = () => { if (v.muted) unmute(); else if (v.paused) v.play().catch(() => {}); };
  v.onended = close; v.onerror = close; v.querySelector('source').onerror = close;
  v.ontimeupdate = () => { if (v.duration) bar.style.width = (v.currentTime / v.duration * 100) + '%'; };
  if (manual) { v.muted = false; snd.style.display = 'none'; } // a tap opened it: sound allowed
  const pr = v.play(); if (pr && pr.catch) pr.catch(() => { v.muted = true; snd.style.display = ''; v.play().catch(() => {}); });
}
(function trailerFirstLaunch() {
  let seen = false; try { seen = localStorage.getItem(TRAILER_KEY) === '1'; } catch (e) {}
  if (!seen && !/[?&]notrailer\b/.test(location.search) && !navigator.webdriver) playTrailer(false);
})();
function openCredits() {
  if (document.getElementById('credits-screen')) return; musicInit(); MUSIC.creditsOpen = true; musicUpdate(1);
  const el = document.createElement('div'); el.id = 'credits-screen'; el.innerHTML = `<div class="glass-card cr-card">${CREDITS_HTML}</div>`; document.body.appendChild(el);
  el.querySelector('#cr-close').onclick = () => { el.remove(); MUSIC.creditsOpen = false; MUSIC.t = 0; musicUpdate(0); };
}
(function musicUI() {
  const $ = id => document.getElementById(id);
  // pause sheet: music on/off + volume + credits
  const sheet = $('mc-sheet'); if (sheet) { const anchor = sheet.querySelector('#mcs-main');
    const box = document.createElement('div'); box.innerHTML = `<div class="lbl">MUSIC <span id="mcs-mv"></span></div><div class="row"><button id="mcs-mus">MUSIC ON</button><button id="mcs-cred">CREDITS</button></div><input type="range" id="mcs-mvol" min="0" max="100" step="5">`;
    anchor.parentNode.insertBefore(box, anchor);
    const sl = $('mcs-mvol'), lab = $('mcs-mv'), bt = $('mcs-mus'); const show = () => { sl.value = Math.round(MUSIC.vol * 100); lab.textContent = sl.value + '%'; bt.textContent = MUSIC.on ? 'MUSIC ON' : 'MUSIC OFF'; }; show();
    sl.oninput = () => { musicInit(); musicSetVolume(sl.value / 100); lab.textContent = sl.value + '%'; };
    bt.onclick = () => { musicInit(); musicSetOn(!MUSIC.on); show(); }; $('mcs-cred').onclick = openCredits; }
  // main menu credits button
  const modal = $('game-modal'); if (modal) { const card = modal.firstElementChild; const b = document.createElement('button'); b.id = 'btn-credits'; b.className = 'q3-btn steel action-btn py-1.5 text-xs'; b.textContent = 'CREDITS'; b.onclick = openCredits; card.appendChild(b);
    const t = document.createElement('button'); t.id = 'btn-trailer-menu'; t.className = 'q3-btn steel action-btn py-1.5 text-xs'; t.textContent = '\u25B6 WATCH TRAILER'; t.onclick = () => playTrailer(true); card.appendChild(t); }
})();

// Boot — load Meshy GLBs first so arena props / viewmodel / sentinels use them
{ const L0 = genFloorLayout(1, 0); MAP_OBJECTS = L0.objects; FLOOR_INFO = L0.info; }
buildArenaMap(); buildViewModel(); renderWeaponBar(); fitGameViewport();
requestAnimationFrame(gameLoop);
autoLoadMeshyAssets().then(() => {
  if (!STATE.running) buildArenaMap();
  buildViewModel();
  window.uiLoad && uiLoad(1, 'All systems online');
});
;
(function(){
  const RX=/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{25A0}-\u{25FF}]/gu;
  function strip(root){ (root.querySelectorAll ? root.querySelectorAll('button, #game-modal span, #game-modal label') : []).forEach(el=>{ el.childNodes.forEach(n=>{ if(n.nodeType===3&&RX.test(n.nodeValue)){ n.nodeValue=n.nodeValue.replace(RX,'').replace(/\s{2,}/g,' '); } else if(n.nodeType===1&&n.tagName==='SPAN'&&RX.test(n.textContent)&&!n.textContent.replace(RX,'').trim()) n.style.display='none'; }); }); }
  strip(document);
  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType===1){ strip(n.parentNode||n); } }))).observe(document.body,{childList:true,subtree:true});
})();
;
/* ===== Pro pass runtime: fades, hit/damage feedback, death screen ===== */
(function () {
  const $ = id => document.getElementById(id);
  const grade = document.createElement('div'); grade.id = 'post-grade'; (document.getElementById('game-container') || document.body).appendChild(grade);
  const dd = document.createElement('div'); dd.id = 'dmg-dir'; for (let i = 0; i < 4; i++) dd.appendChild(document.createElement('i')); document.body.appendChild(dd);
  window.uiFade = function (holdMs = 120) { const f = $('fx-fade'); if (!f) return; f.style.transition = 'none'; f.style.opacity = '1'; void f.offsetWidth; setTimeout(() => { f.style.transition = 'opacity .5s ease'; f.style.opacity = '0'; }, holdMs); };
  window.uiHit = function (kill) { const hm = $('hitmarker'); if (!hm) return; hm.classList.toggle('kill', !!kill); hm.classList.add('active'); clearTimeout(hm._t); hm._t = setTimeout(() => hm.classList.remove('active', 'kill'), kill ? 260 : 110); };
  window.showHitMarker = window.uiHit;
  let ddi = 0;
  window.uiDamageDir = function (src) {
    const P = STATE.player; if (!src) { let best = 1e9; for (const b of (window.BOTS || BOTS)) { if (b.dying) continue; const d = Math.hypot(b.x - P.x, b.z - P.z); if (d < best && d < 60 && b.aiState === 'combat') { best = d; src = b; } } }
    if (!src || src.x === undefined) return; const dx = src.x - P.x, dz = src.z - P.z; if (Math.hypot(dx, dz) < 0.5) return;
    const y = P.yaw, right = dx * Math.cos(y) - dz * Math.sin(y), fwd = -dx * Math.sin(y) - dz * Math.cos(y); window.showDamageDir(Math.atan2(right, fwd));
  };
  window.showDamageDir = function (a) { const el = dd.children[ddi++ % 4]; el.style.transform = `rotate(${a}rad)`; el.classList.add('on'); void el.offsetWidth; requestAnimationFrame(() => el.classList.remove('on')); };
  window.uiDeath = function (who, done) { const k = $('kia'); $('kia-s').textContent = who ? 'Eliminated by ' + who : 'You were eliminated'; k.style.display = 'flex'; const bar = $('kia-bar'); bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth; bar.style.transition = 'width 1.8s linear'; bar.style.width = '100%';
    setTimeout(() => { uiFade(200); setTimeout(() => { k.style.display = 'none'; done && done(); }, 120); }, 1900); };
  window.showDeathScreen = who => uiDeath(who, null);
  // fade on every floor/level load and on Doom Party start
  if (typeof startFloor === 'function') { const sf = startFloor; window.startFloor = startFloor = function () { uiFade(); document.body.classList.add('in-game'); return sf.apply(this, arguments); }; }
  if (typeof dmStartMatch === 'function') { const dm = dmStartMatch; window.dmStartMatch = dmStartMatch = function () { uiFade(); document.body.classList.add('in-game'); return dm.apply(this, arguments); }; }
  // kill feed: tag headshots
  if (typeof addKillFeed === 'function') { const kf = addKillFeed; window.addKillFeed = addKillFeed = function (msg) { kf(msg); const f = $('kill-feed'), el = f && f.lastElementChild; if (el && /HEADSHOT|CRIT/i.test(msg)) el.classList.add('hs'); }; }
  // splash → menu crossfade
  const sk = $('btn-skip-splash'); if (sk) sk.addEventListener('click', () => uiFade(60), true);
  // re-draw text textures once the self-hosted fonts are ready (signs drawn before font load)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!STATE.running && typeof buildArenaMap === 'function') try { buildArenaMap(); } catch (e) {} });
  if (!window.LOADP || !window.LOADP.n) uiLoad(0.15, 'Initializing Triage systems…');
})();
