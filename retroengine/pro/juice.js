/*
 * juice.js — Pro 1.6.0 "modern feel" layer on top of DMB Tech 1.
 *
 *   1. Gun feel: hitmarker tick + flash, bigger arm-cannon kick, impact sparks, directional red damage flash.
 *   2. Thruster dash: Shift or Q (and a DASH touch button). Short burst, 0.9 s cooldown, speed-line flash.
 *   3. Combo rush: DOUBLE/TRIPLE KILL callouts, kill feed, shatter burst, health/shield orbs from the fallen.
 *   4. Pro HUD: slim health/shield bars, ammo pips under the crosshair, a top compass bar with the
 *      objective marker, and a waypoint arrow with the distance so you never get lost.
 *   5. Audio punch: Web Audio SFX made in code (no files): ring-cannon fire + recharge, thruster hum
 *      near hovering enemies, hitmarker tick, dash whoosh, and a low thump when you take a heavy hit.
 *
 * Everything is DOM + a few cheap sparks; one requestAnimationFrame loop drives it, and DOM writes only
 * happen when a value changes, so it stays smooth on phones.
 */

const NAMES = { trooper: 'Twin-cannon trooper', ddrone: 'Dystopia drone', sentinel: 'Ballisticus sentinel', warden: 'The Warden',
  minotaur: 'The Minotaur', grunt: 'Soldier', heavy: 'Heavy walker', turret: 'Sentry turret', titan: 'Titan', drone: 'Gun drone' };
const STREAK = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'RAMPAGE'];   // index = kills in a row
const STREAK_WINDOW = 2.6;                                       // seconds between kills to keep a streak going
const TAU = Math.PI * 2;
const wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };   // angle into -PI..PI

/* ---------- 5. tiny Web Audio synth (all SFX are generated, nothing to download) ---------- */
function makeSfx(RT) {
  let ctx = null, out = null, noise = null, hum = null;
  function vol() { const S = RT.S || {}; return (S.volume == null ? 0.8 : S.volume) * (S.sfx == null ? 0.9 : S.sfx); }
  function init() {                                              // needs a user gesture on phones
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); out = ctx.createGain(); out.gain.value = vol(); out.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);      // half a second of white noise, reused
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  // one oscillator "blip": type, start/end frequency, length, peak gain
  function tone(type, f0, f1, len, g, delay) {
    if (!ctx) return; const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), a = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len);
    a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(g, t + 0.006); a.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(a); a.connect(out); o.start(t); o.stop(t + len + 0.02);
  }
  // filtered noise burst: filter type, start/end frequency, length, gain
  function hiss(ftype, f0, f1, len, g) {
    if (!ctx) return; const t = ctx.currentTime;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), a = ctx.createGain(); s.buffer = noise;
    f.type = ftype; f.Q.value = 1.2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + len);
    a.gain.setValueAtTime(g, t); a.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(a); a.connect(out); s.start(t); s.stop(t + len + 0.02);
  }
  const api = {
    init, get ctx() { return ctx; }, played: {},                 // played: counts per sound (test hook)
    fire() { tone('sine', 1500, 420, 0.09, 0.16); tone('triangle', 240, 110, 0.06, 0.12); hiss('highpass', 4000, 2500, 0.04, 0.05); api.played.fire = (api.played.fire || 0) + 1; },
    charge() { tone('sine', 520, 1500, 0.16, 0.04); tone('sine', 1040, 3000, 0.16, 0.015); api.played.charge = (api.played.charge || 0) + 1; },
    tick(kill) { tone('square', 2600, 2400, 0.03, 0.06); if (kill) tone('square', 1800, 1700, 0.05, 0.07, 0.045); api.played.tick = (api.played.tick || 0) + 1; },
    whoosh() { hiss('bandpass', 2200, 380, 0.26, 0.35); tone('sine', 180, 90, 0.2, 0.05); api.played.whoosh = (api.played.whoosh || 0) + 1; },
    thump() { tone('sine', 72, 34, 0.28, 0.55); hiss('lowpass', 400, 80, 0.15, 0.2); api.played.thump = (api.played.thump || 0) + 1; },
    orb() { tone('sine', 880, 1320, 0.1, 0.05); tone('sine', 1320, 1760, 0.1, 0.04, 0.06); },
    // continuous low thruster hum; level 0..1 follows how close hovering enemies are
    hum(level) {
      if (!ctx) return;
      if (!hum) {
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o1.type = 'sawtooth'; o1.frequency.value = 54; o2.type = 'sawtooth'; o2.frequency.value = 81.5;   // two detuned saws
        f.type = 'lowpass'; f.frequency.value = 340; g.gain.value = 0;
        lfo.frequency.value = 7; lg.gain.value = 60; lfo.connect(lg); lg.connect(f.frequency);              // flutter
        o1.connect(f); o2.connect(f); f.connect(g); g.connect(out); o1.start(); o2.start(); lfo.start();
        hum = { g, o: [o1, o2, lfo] };
      }
      hum.g.gain.setTargetAtTime(Math.min(0.09, level * 0.09), ctx.currentTime, 0.12);
      api.humLevel = level;
    },
    setVolume() { if (out) out.gain.value = vol(); },
    stopHum() { if (hum && ctx) hum.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); api.humLevel = 0; }
  };
  return api;
}

/* ---------- glowing reward orb mesh (health = red, shield = cyan) ---------- */
let glowTex = null;
function orbMesh(THREE, color) {
  if (!glowTex) {                                                // one soft radial sprite texture, shared
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(c);
  }
  const root = new THREE.Group(), spin = new THREE.Group(); root.add(spin); root.userData.spin = spin;   // engine bobs/spins userData.spin
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.scale.setScalar(0.42); spin.add(core); spin.add(halo);
  return root;
}

export function installJuice(RT, opts) {
  const THREE = RT.THREE, sfx = makeSfx(RT);
  // reward pickups: small top-ups so aggressive play pays off
  RT.PICKUP_DEFS.orb_hp = { name: 'Health orb +10', give: { hp: 10 } };
  RT.PICKUP_DEFS.orb_shield = { name: 'Shield orb +10', give: { armor: 10 } };
  let H = null, G0 = null, raf = 0, ui = null;
  const st = { streak: 0, lastKill: -99, best: 0, lastRecoil: 0, lastShot: -99, charged: true, feed: [], orbs: 0, hits: 0, kills: 0, dashes: 0 };
  const now = () => performance.now() / 1000;

  /* ---- DOM overlay, inserted inside the engine's root so its pause menu stays on top ---- */
  function build(root) {
    const el = document.createElement('div'); el.className = 'pj';
    el.innerHTML = `
      <div class="pj-compass"><div class="pj-strip"></div><i class="pj-mark"></i><div class="pj-objline"><b class="pj-obj"></b><span class="pj-dist"></span></div></div>
      <div class="pj-way"><i></i></div>
      <div class="pj-ch"><span class="pj-lvl"></span><span class="pj-host"></span></div>
      <div class="pj-feed"></div>
      <div class="pj-hit"></div>
      <div class="pj-pips"></div><div class="pj-wn"></div>
      <div class="pj-bars"><div class="pj-bar hp"><i></i><b></b></div><div class="pj-bar sh"><i></i><b></b></div><div class="pj-keys"></div></div>
      <div class="pj-streak"></div>
      <div class="pj-dmg"></div><div class="pj-speed"></div>
      <div class="pj-track" aria-live="polite"><i>♪</i><span><small></small><b></b></span></div>
      <div class="pj-dash" role="button" aria-label="Dash">DASH<i></i></div>
      <div class="pj-pts"><small>PTS</small><b>0</b><span class="pj-pop"></span></div>
      <div class="pj-regen"><i></i>REGEN</div>
      <div class="pj-ready"><small>STAGING POINT · OUT OF SIGHT</small><b>GET READY</b><span></span></div>
      <div class="pj-visor"></div>`;
    root.insertBefore(el, root.querySelector('.dfg-menu'));
    root.classList.add('pro-juice');                             // pro.css hides the engine's stock bottom HUD
    const q = s => el.querySelector(s);
    // compass ticks: one label every 45 degrees, laid out over 2 turns so it can scroll seamlessly
    const strip = q('.pj-strip'), labels = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    for (let k = -8; k < 16; k++) { const t = document.createElement('span'); t.textContent = labels[(k % 8 + 8) % 8]; t.style.left = (k * 45 * PX_DEG) + 'px'; if (t.textContent.length === 1) t.className = 'big'; strip.appendChild(t); }
    const dash = q('.pj-dash');
    dash.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); sfx.init(); doDash(); });
    return { el, q, strip, mark: q('.pj-mark'), obj: q('.pj-obj'), dist: q('.pj-dist'), way: q('.pj-way'), wayI: q('.pj-way i'), lvl: q('.pj-lvl'), host: q('.pj-host'),
      feed: q('.pj-feed'), hit: q('.pj-hit'), pips: q('.pj-pips'), wn: q('.pj-wn'), hpI: q('.pj-bar.hp i'), hpB: q('.pj-bar.hp b'), shI: q('.pj-bar.sh i'), shB: q('.pj-bar.sh b'),
      pts: q('.pj-pts b'), pop: q('.pj-pop'), regen: q('.pj-regen'), ready: q('.pj-ready'), readyN: q('.pj-ready span'), hpBar: q('.pj-bar.hp'),
      keys: q('.pj-keys'), track: q('.pj-track'), streak: q('.pj-streak'), dmg: q('.pj-dmg'), speed: q('.pj-speed'), dash, dashI: q('.pj-dash i'), cache: {} };
  }
  const PX_DEG = 2.2;                                            // compass: pixels per degree of turn
  function set(key, node, prop, val) { if (ui.cache[key] !== val) { ui.cache[key] = val; if (prop === 'text') node.textContent = val; else if (prop === 'html') node.innerHTML = val; else node.style[prop] = val; } }

  /* ---- 2. dash ---- */
  function doDash() { if (H && H.dash && H.dash()) { st.dashes++; return true; } return false; }
  function onKey(e) {
    if (e.repeat || !H || H.state !== 'playing') return;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyQ') { sfx.init(); doDash(); }   // Shift still runs while held
  }
  function onGesture() { sfx.init(); }

  /* ---- what the player should head for right now ---- */
  function objective(G) {
    const lv = opts.levels()[G.index] || {}, g = lv.goal || {};
    const near = list => { let b = null, bd = 1e9; for (const o of list) { const d = Math.hypot(o.x - G.px, o.y - G.py); if (d < bd) { bd = d; b = o; } } return b; };
    if (g.type === 'key' && !G.keys[g.key]) { const k = near(G.pickups.filter(p => !p.taken && p.sub === 'key_' + g.key)); if (k) return { x: k.x, y: k.y, label: g.key.toUpperCase() + ' KEY' }; }
    if (g.type === 'kill') { const t = near(G.enemies.filter(e => e.sub === g.enemy && e.state !== 'dead')); if (t) return { x: t.x, y: t.y, label: (NAMES[g.enemy] || g.enemy).toUpperCase() }; }
    if (g.type === 'boss') { const b = G.enemies.find(e => e.def && e.def.boss && e.state !== 'dead'); if (b) return { x: b.x, y: b.y, label: 'THE MINOTAUR' }; }
    const ex = near(G.exits || []); return ex ? { x: ex.x, y: ex.y, label: 'EXIT' } : null;
  }

  /* ---- per-frame update ---- */
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!H || !ui) return;
    const G = H.game, playing = H.state === 'playing';
    set('vis', ui.el, 'display', G && playing ? 'block' : 'none');
    if (!G) return;
    if (G !== G0) { G0 = G; st.lastRecoil = 0; }                 // new level inside the same play session
    if (!playing) { sfx.stopHum(); return; }
    const t = now();
    // 4. bars (health red, shield cyan) and keys
    set('hpw', ui.hpI, 'width', Math.max(0, Math.min(100, G.hp)) + '%'); set('hpt', ui.hpB, 'text', String(Math.ceil(Math.max(0, G.hp))));
    set('shw', ui.shI, 'width', Math.min(100, G.armor / 2) + '%'); set('sht', ui.shB, 'text', String(Math.ceil(G.armor)));
    set('low', ui.hpI, 'background', G.hp < 30 ? '#ff2b2b' : '');
    set('keys', ui.keys, 'html', ['red', 'blue', 'yellow'].filter(k => G.keys[k]).map(k => `<b class="${k}"></b>`).join(''));
    // 1.6.3: points, health regen glow, "get ready" countdown
    set('pts', ui.pts, 'text', String(G.points || 0));
    const rg = !!G.regenOn; if (ui.cache.rg !== rg) { ui.cache.rg = rg; ui.regen.classList.toggle('on', rg); ui.hpBar.classList.toggle('regen', rg); }
    const gr = Math.max(0, G.graceT || 0); set('rdy', ui.ready, 'display', gr > 0 ? 'flex' : 'none'); set('rdyn', ui.readyN, 'text', gr > 0 ? Math.ceil(gr) + ' · move or fire to go' : '');
    // ammo pips under the crosshair: magazine rounds, or a 6-segment recharge bar for the endless cannon
    const W = RT.WEAPON_DEFS[G.cur] || {}, mag = (RT.MAG_SIZE || [])[G.cur] || 0;
    let pipHtml;
    if (W.ammo) { const inMag = Math.min(G.mag ? G.mag[G.cur] : 0, G.ammo[W.ammo]), n = mag || Math.min(10, G.ammo[W.ammo]); pipHtml = Array.from({ length: Math.min(n, 30) }, (_, i) => `<i class="${i < inMag ? 'on' : ''}"></i>`).join('') + `<em>${G.ammo[W.ammo] - inMag}</em>`; }
    else { const ready = W.cd ? 1 - Math.max(0, G.cd) / W.cd : 1, k = Math.round(ready * 6); pipHtml = Array.from({ length: 6 }, (_, i) => `<i class="cy${i < k ? ' on' : ''}"></i>`).join('') + '<em>∞</em>'; }
    set('pips', ui.pips, 'html', pipHtml); set('wn', ui.wn, 'text', (W.name || '') + (G.reloadT > 0 ? ' · RELOAD' : '') + '  ◆' + G.nades);
    // chapter + hostiles
    set('lvl', ui.lvl, 'text', (G.L && G.L.name) || ''); set('host', ui.host, 'text', 'HOSTILES ' + G.enemies.filter(e => e.state !== 'dead').length);
    // compass strip: heading 0 = map +x (east); north is map -y
    const head = wrap(G.yaw) * 180 / Math.PI;                  // yaw keeps growing as you spin, so wrap it
    set('strip', ui.strip, 'transform', `translateX(${(-head * PX_DEG).toFixed(1)}px)`);
    const ob = objective(G);
    if (ob) {
      const rel = wrap(Math.atan2(ob.y - G.py, ob.x - G.px) - G.yaw), deg = rel * 180 / Math.PI, d = Math.hypot(ob.x - G.px, ob.y - G.py);
      const clampDeg = Math.max(-58, Math.min(58, deg));         // pin the marker to the compass edge when it's behind you
      set('mk', ui.mark, 'transform', `translateX(${(clampDeg * PX_DEG).toFixed(1)}px) rotate(45deg)`);
      set('mke', ui.mark, 'opacity', Math.abs(deg) > 58 ? '0.5' : '1');
      set('ob', ui.obj, 'text', ob.label); set('od', ui.dist, 'text', Math.round(d) + ' m');
      set('way', ui.wayI, 'transform', `rotate(${deg.toFixed(0)}deg)`);   // the arrow points the way, 0 = straight ahead
      set('wayv', ui.way, 'opacity', d < 2.2 ? '0' : '1');
    }
    st.obj = ob;
    // 1. recharge chirp once the cannon has been quiet for a moment after a burst
    if (!st.charged && t - st.lastShot > 0.35) { st.charged = true; if (!W.ammo) sfx.charge(); }
    // 5. thruster hum from hovering enemies close by
    let hum = 0; for (const e of G.enemies) { if (e.state === 'dead' || !e.def || !(e.def.lift || e.def.hover)) continue; const d = Math.hypot(e.x - G.px, e.y - G.py); if (d < 8) hum += (1 - d / 8) * (e.def.lift ? 1 : 0.6); }
    sfx.hum(Math.min(1, hum)); sfx.setVolume();
    // 2. dash button cooldown fill
    const cd = Math.max(0, G.dashCd || 0) / ((RT.DASH && RT.DASH.cd) || 0.9);
    set('dcd', ui.dashI, 'transform', `scaleY(${cd.toFixed(2)})`); set('dcl', ui.dash, 'opacity', cd > 0 ? '0.55' : '1');
    // 3. streak timeout + kill feed ageing
    if (st.streak && t - st.lastKill > STREAK_WINDOW) st.streak = 0;
    if (st.feed.length && t - st.feed[0].t > 3.2) { st.feed.shift(); renderFeed(); }
  }
  function renderFeed() { ui.feed.innerHTML = st.feed.map(f => `<div class="${f.boss ? 'boss' : ''}">✕ ${f.name}</div>`).join(''); }
  function flash(node, cls, ms) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); clearTimeout(node._t); node._t = setTimeout(() => node.classList.remove(cls), ms); }

  /* ---- engine events ---- */
  function onEvent(ev, a) {
    if (!H || !ui) return;
    const G = H.game; if (!G) return;
    if (ev === 'hit') {
      st.hits++; sfx.tick(a.kill);
      ui.hit.classList.toggle('kill', !!a.kill); flash(ui.hit, 'on', a.kill ? 240 : 130);   // white X, red on a kill
      H.sparks(a.x, a.y, a.z, a.kill ? 4 : 7, 0x9ff4ff);        // bright cyan-white impact sparks
      if (a.kill) kill(a);
    } else if (ev === 'hurt') {
      const big = a.dmg >= 14; if (big) sfx.thump();
      if (a.fromX != null) {                                     // red wedge on the side the shot came from
        const rel = wrap(Math.atan2(a.fromY - G.py, a.fromX - G.px) - G.yaw) * 180 / Math.PI;
        ui.dmg.style.transform = `rotate(${rel.toFixed(0)}deg)`; ui.dmg.style.setProperty('--a', Math.min(1, 0.45 + a.dmg / 30).toFixed(2));
        flash(ui.dmg, 'on', 520); st.lastHurtAngle = rel;
      }
    } else if (ev === 'shot') {                                  // 1. crisper arm-cannon kick + ring fire sound
      G.recoil = 1.55;                                             // engine set 1; the view model kicks further back
      if (!(RT.WEAPON_DEFS[a] || {}).ammo) sfx.fire();
      st.lastShot = now(); st.charged = false;
    } else if (ev === 'track') {                                 // 1.6.2: music switched (Bass Angel when you meet a boss)
      ui.track.querySelector('small').textContent = a.boss ? 'Boss music · now playing' : 'Now playing';
      ui.track.querySelector('b').textContent = a.title + (a.artist ? ' — ' + a.artist : '');
      ui.track.classList.toggle('boss', !!a.boss); flash(ui.track, 'on', 3600); st.lastTrack = a.title;
    } else if (ev === 'dash') {
      sfx.whoosh(); flash(ui.speed, 'on', 280);
    } else if (ev === 'kill') { /* counted from 'hit' (has the position) */ }
    else if (ev === 'points') {                                  // 1.6.3: "+150 KILL" pops beside the score
      ui.pop.textContent = '+' + a.n + (a.why ? ' ' + String(a.why).toUpperCase() : ''); flash(ui.pop, 'on', 900); flash(ui.pts, 'bump', 260);
      st.lastPoints = a;
    } else if (ev === 'pack') { if (a.what === 'add') sfx.orb(); st.lastPack = a; }
    else if (ev === 'suit') { flash(ui.hpBar.parentNode.querySelector('.pj-bar.sh'), 'rebuild', 1600); }
  }
  function kill(a) {
    const t = now(); st.kills++;
    st.streak = t - st.lastKill <= STREAK_WINDOW ? st.streak + 1 : 1; st.lastKill = t; st.best = Math.max(st.best, st.streak);
    if (st.streak >= 2) { ui.streak.textContent = STREAK[Math.min(st.streak, 5)] + (st.streak > 5 ? ' ×' + st.streak : ''); flash(ui.streak, 'on', 1300); st.lastCallout = ui.streak.textContent; }
    st.feed.push({ name: NAMES[a.sub] || a.sub, boss: a.boss, t }); if (st.feed.length > 3) st.feed.shift(); renderFeed();
    // shatter: a crimson + white spark burst on top of the engine's own death sparks
    H.sparks(a.x, a.y, a.z, 14, 0xff2436); H.sparks(a.x, a.y, a.z, 6, 0xffffff);
    // orbs: troopers/sentinels/bosses always drop, others 55% of the time; the stick of luck is seeded by position
    const G = H.game, floor = a.floor || 0, sure = /trooper|sentinel|warden|minotaur/.test(a.sub);
    const drops = sure ? (a.boss ? 4 : 2) : (Math.random() < 0.55 ? 1 : 0);
    for (let i = 0; i < drops; i++) {
      const ang = Math.random() * TAU, r = 0.35 + Math.random() * 0.3;
      let x = a.x + Math.cos(ang) * r, y = a.y + Math.sin(ang) * r;
      if (!H.lineClear(a.x, a.y, x, y)) { x = a.x; y = a.y; }   // never pop an orb into a wall
      const sub = (i + (G.hp < 60 ? 0 : 1)) % 2 ? 'orb_shield' : 'orb_hp';   // hurt players get health first
      const p = H.spawnPickup(sub, x, y, floor, orbMesh(THREE, sub === 'orb_hp' ? 0xff3a4a : 0x3ad8ff));
      if (p) { st.orbs++; popIn(p.mesh); }
    }
  }
  function popIn(m) { const t0 = now(); m.scale.setScalar(0.01); const step = () => { const k = Math.min(1, (now() - t0) / 0.25); m.scale.setScalar(0.01 + k * (1.25 - 0.25 * k)); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
  // play the orb chime when one is collected
  function onPickup(sub) { if (/^orb_/.test(sub)) sfx.orb(); }

  return {
    sfx, stats: st,
    attach(handle, root) {
      if (ui) { ui.el.remove(); ui = null; }                    // a previous run left its overlay
      H = handle; G0 = null; ui = build(root); st.feed = []; st.streak = 0;
      window.addEventListener('keydown', onKey); root.addEventListener('pointerdown', onGesture, true); window.addEventListener('keydown', onGesture, true);
      if (!raf) raf = requestAnimationFrame(frame);
    },
    detach() {
      window.removeEventListener('keydown', onKey); window.removeEventListener('keydown', onGesture, true);
      if (ui) ui.el.remove(); ui = null; H = null; sfx.stopHum();
    },
    onEvent(ev, a) { try { if (ev === 'pickup') onPickup(a); else onEvent(ev, a); } catch (e) { console.warn('Pro juice', e && e.stack || e); } }
  };
}
