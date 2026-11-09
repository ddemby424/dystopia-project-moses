/* DYSTOPIA candidate — enemies.
   This file is what the release page runs. The legacy page still uses game.js.
   The per-frame bot tick, damage, spawns, and the guard think functions live here. Colossus, drones, and the nav grid are still in engine.js.
*/
function initBotAI(b) {
  b.aiState = 'idle'; b.phase = 'move'; b.thinkT = Math.random() * 0.6; b.path = null; b.pathI = 0; b.cover = null; b.coverHits = 0;
  b.lockT = 0; b.reactT = 0; b.burstLeft = 0; b.shotT = 0; b.phaseT = 0; b.crouch = 0; b.los = false; b.lastSeenT = -1e9; b.lastKnown = null;
  b.speed = b.isHuman ? 6.6 : (b.heavy ? 3.9 : 4.8); b.patrolT = 2 + Math.random() * 4;
  if (b.clips) b.action = null;
  else if (b.mixer && b.mixer._actions && b.mixer._actions[0]) b.action = b.mixer._actions[0];
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
  // separation — don't clump. A wider bubble than the old 2.2 m pack.
  if (b.role !== 'sniper') BOTS.forEach(o => { if (o === b || o.dying) return; const dx = b.x - o.x, dz = b.z - o.z, d = Math.hypot(dx, dz); if (d < 3.1 && d > 0.01) { mvx += dx / d * (3.1 - d) * 4.2; mvz += dz / d * (3.1 - d) * 4.2; } });
  /* Strafe while shooting in the open, so a pack does not stack on one line. */
  if (b.aiState === 'combat' && b.los && !atCover && b.role !== 'sniper') {
    if ((b._strafeT = (b._strafeT || 1.6) - dt) <= 0) { b._strafe = -(b._strafe || 1); b._strafeT = 1.2 + Math.random() * 0.8; }
    const side = b._strafe || 1;
    mvx += Math.cos(b.yaw) * side * b.speed * 0.45;
    mvz += -Math.sin(b.yaw) * side * b.speed * 0.45;
  }
  b._moved = 0;
  if (Math.abs(mvx) + Math.abs(mvz) > 0.05) {
    b.moving = true;
    const faceP0 = b.aiState === 'combat' && (b.los || b.phase !== 'move');
    const want0 = faceP0 ? Math.atan2(P.x - b.x, P.z - b.z) : Math.atan2(mvx, mvz);
    let err = want0 - b.yaw; err = Math.atan2(Math.sin(err), Math.cos(err));
    /* Turn before sliding. A large facing error cuts speed so the feet are not skating sideways. */
    const turnCut = Math.abs(err) > 0.9 ? 0.22 : (Math.abs(err) > 0.45 ? 0.55 : 1);
    const ox = b.x, oz = b.z;
    const nx = b.x + mvx * turnCut * dt, nz = b.z + mvz * turnCut * dt;
    if (!collidesAt(nx, b.z, 0.55)) b.x = nx;
    if (!collidesAt(b.x, nz, 0.55)) b.z = nz;
    const progressed = Math.hypot(b.x - ox, b.z - oz);
    b._moved = dt > 0 ? progressed / dt : 0;
    const wanted = Math.hypot(mvx, mvz) * turnCut * dt;
    if (wanted > 0.03 && progressed < wanted * 0.3) {
      b.stuck = (b.stuck || 0) + dt;
      if (b.stuck > 0.55) {
        b.stuck = 0; b.stuckN = (b.stuckN || 0) + 1;
        b.path = b.goal ? aStar(b.x, b.z, b.goal.x, b.goal.z) : null; b.pathI = 0;
        aiTrace(b, 'stuck, repath');
        if (b.stuckN >= 2) { b.stuckN = 0; const fr = botNearestFree(b.x, b.z, 0.6); if (fr) { b.x = fr[0]; b.z = fr[1]; } b.goal = null; b.path = null; b.cover = null; b.thinkT = 0; }
      }
    } else if (progressed > 0.02) b.stuck = 0;
  }
  // facing
  const faceP = b.aiState === 'combat' && (b.los || b.phase !== 'move');
  const wantYaw = faceP ? Math.atan2(P.x - b.x, P.z - b.z) : (b.moving && Math.hypot(mvx, mvz) > 0.6 ? Math.atan2(mvx, mvz) : (b.role === 'sniper' && b.scanYaw !== undefined ? b.yaw + Math.sin(now * 0.0006 + b.x) * 0.02 : b.yaw));
  let dy = wantYaw - b.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.yaw += dy * Math.min(1, dt * (b.isHuman ? 9 : 5));
  if (!b.clips) b.rig.root.rotation.y = b.yaw;
  // crouch (humans duck behind low cover)
  const wantCrouch = b.isHuman && atCover && b.phase === 'hide' ? 1 : 0; b.crouch += (wantCrouch - b.crouch) * Math.min(1, dt * 8);
  if (b.isHuman) b.rig.root.scale.y = 1 - b.crouch * 0.3;
  // fire
  b.shotT -= dt;
  const canFire = b.aiState === 'combat' && b.los && b.reactT <= 0 && b.lockT > 0.25;
  if (canFire && b.shotT <= 0) {
    const fireMult = (STATE.botSkill || 1) * (STATE.diff?.fire || 1);
    if (atCover && b.phase === 'peek') { if ((b.aimT -= dt) <= 0 && b.burstLeft > 0) { aiShoot(b); b._attackT = 0.32; b.burstLeft--; b.shotT = (b.isHuman ? 0.13 : 0.24) / fireMult; } }
    else if (!atCover && (!b.isHuman || b.role === 'pusher' || !b.cover)) { aiShoot(b); b._attackT = 0.32; b.shotT = (b.role === 'sniper' ? 1.7 : b.isHuman ? 0.9 : (b.role === 'suppressor' ? 0.55 : 0.8)) / fireMult; }
    else if (!b.isHuman && b.role === 'suppressor') { aiShoot(b); b._attackT = 0.32; b.shotT = 0.6 / fireMult; }
  }
  // physics + anim
  const botFloor = getGroundHeightAt(b.x, b.z, b.y); b.y += b.vy * dt; b.vy -= STATE.gravity * dt; if (b.y <= botFloor) { b.y = botFloor; b.vy = 0; }
  b.rig.root.position.set(b.x, b.y, b.z);
  const planar = Math.hypot(mvx, mvz);
  const aim = (b.aiState === 'combat' && b.los) ? 1 : 0;
  b._aim = (b._aim || 0) + (aim - (b._aim || 0)) * Math.min(1, dt * 6);
  if (b.clips && window.RC && RC.rigs) {
    const travel = Math.atan2(mvx, mvz);
    const fwd = mvx * Math.sin(b.yaw) + mvz * Math.cos(b.yaw);
    const lat = mvx * Math.cos(b.yaw) - mvz * Math.sin(b.yaw);
    const strafing = b.moving && Math.abs(lat) > 0.45 && Math.abs(lat) > Math.abs(fwd) * 0.75;
    let twist = 0;
    if (strafing) {
      twist = Math.atan2(Math.sin(b.yaw - travel), Math.cos(b.yaw - travel));
      twist = Math.max(-1.05, Math.min(1.05, twist));
    }
    RC.rigs.tick(b, dt, { moved: b._moved || 0, attack: b._attackT > 0, twist, faceYaw: strafing ? travel : b.yaw });
  } else if (b.mixer) {
    if (b.action) b.action.timeScale = planar > 0.4 ? Math.min(1.5, planar / 3.2) : 0;
    b.mixer.update(planar > 0.25 ? dt : 0);
  } else if (b.rig.leftLeg && b.rig.leftLeg !== b.rig.root) {
    /* Pose blend: idle, walk scaled to speed, and an aim pose. Legs stop when the body stops. */
    const swingAmp = Math.min(0.65, planar * 0.14);
    b.walkPhase += dt * (3.2 + planar * 1.15);
    const swing = Math.sin(b.walkPhase) * swingAmp;
    b.rig.leftLeg.rotation.x = swing;
    b.rig.rightLeg.rotation.x = -swing;
    if (b.rig.leftArm && b.rig.leftArm !== b.rig.root) b.rig.leftArm.rotation.x = -swing * 0.4 * (1 - b._aim);
    if (b.rig.rightArm && b.rig.rightArm !== b.rig.root) b.rig.rightArm.rotation.x = -0.25 * (1 - b._aim) + (-1.05) * b._aim;
    if (b.rig.torso && b.rig.torso !== b.rig.root) b.rig.torso.rotation.x = -0.12 * b._aim + (b.flinchTimer > 0 ? -0.2 : 0);
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

function spawnBotFromArchetype(spec, levelMult = 1.0) {
  const isHumanGuard = spec.role === 'human_guard';
  const isHuman = spec.role === 'human';
  const heavy = !isHumanGuard && !isHuman;
  let rig, procHuman = false;
  if (window.RC && RC.rigs && RC.rigs.ready()) {
    rig = RC.rigs.build(heavy ? 'heavy' : 'guard', spec.name);
  } else if (isHuman) {
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
  if (window.RC && RC.realism && RC.realism.dressRig) RC.realism.dressRig(rig.root, heavy ? 'heavy' : (isHuman ? 'human' : 'guard'));
  const maxHp = Math.round(spec.maxHealth * levelMult);
  rig.hb.update(maxHp, maxHp);
  BOTS.push({
    id: spec.id, name: spec.name, isBoss: false, isHumanGuard, isHuman, procHuman, heavy, role: spec.aiRole || 'pusher', squad: spec.squad || 0,
    patrolType: spec.patrolType || 'ground', homeX: spec.x, homeZ: spec.z,
    rig, mixer: rig.mixer || null, clips: rig.clips || null,
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


function rcEnemyStep(dt, now) {
  if (STATE.menderCueAt && STATE.combatActive && performance.now() >= STATE.menderCueAt) { STATE.menderCueAt = 0; menderDispatchCue(); }
  BOTS.forEach(b => {
    if (b.isMender && !b.dying && STATE.combatActive) { updateMender(b, dt, now); return; }
    if (b.dying) {
      b.deathTimer -= dt;
      if (b.rig.root) {
        if (b.clips && window.RC && RC.rigs) RC.rigs.tick(b, dt, { moved: 0, faceYaw: b.rig.root.rotation.y });
        else b.rig.root.rotation.x = Math.min(1.2, b.rig.root.rotation.x + dt * 2.2);
        b.rig.root.position.y = Math.max(b.y - 0.15, b.rig.root.position.y - dt * 0.8);
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
}
window.RC = window.RC || {};
RC.core = RC.core || {};
RC.core.enemies = { step: rcEnemyStep, damageBot: damageBot, spawn: spawnBotFromArchetype };
