/* DYSTOPIA candidate — player input and locomotion.
   This file is what the release page runs. The legacy page still uses game.js.
   Change keys, look, and the walk/jump step here. Speeds and the weapon list are in tuning.js.
*/
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
bindHoldButton(document.getElementById('btn-grenade'), () => throwFragGrenade(), null);
bindHoldButton(document.getElementById('btn-crouch'), () => { STATE.player.crouch = !STATE.player.crouch; }, null);
bindHoldButton(document.getElementById('btn-reload'), () => {
  const w = STATE.weapons[STATE.currentWeapon];
  if (w.maxAmmo !== Infinity && !w.emp) { w.ammo = w.maxAmmo; AI_G.lastReloadT = performance.now(); } startReloadAnim(); SFX.playKeyPickup(); updateHUD();
}, null);
window.addEventListener('keydown', e => { if (e.code === 'KeyR' && STATE.running && !STATE.pausedForStudio) document.getElementById('btn-reload').dispatchEvent(new Event('pointerdown')); });

function rcPlayerStep(dt, now) {
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
    if (STATE.rcReduced) STATE.screenShake = 0;
    else {
      camera.position.x += (Math.random() - 0.5) * STATE.screenShake * 0.35;
      camera.position.y += (Math.random() - 0.5) * STATE.screenShake * 0.25;
      STATE.screenShake = Math.max(0, STATE.screenShake - dt * 2.8);
    }
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
}
function rcPlayerPickups(dt, now) {
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
}
window.RC = window.RC || {};
RC.core = RC.core || {};
RC.core.player = { step: rcPlayerStep, pickups: rcPlayerPickups };

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
