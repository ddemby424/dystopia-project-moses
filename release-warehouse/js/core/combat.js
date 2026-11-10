/* DYSTOPIA candidate — combat.
   This file is what the release page runs. The legacy page still uses game.js.
   Firing, player damage, projectiles, grenades, and napalm tick here. Weapon numbers are in tuning.js.
*/
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


function rcCombatTriggers(dt, now) {
  if (STATE.fireCooldown > 0) STATE.fireCooldown -= dt;
  if (isFiringHeld) firePlayerWeapon();
  STATE.spinUp = Math.max(0, STATE.spinUp - dt * 0.8);
  weaponGlowMats.forEach(m => { m.emissiveIntensity = 1.6 + STATE.spinUp * 2.2 + Math.sin(now * 0.02) * 0.3; });

  if (STATE.quadTimer > 0) {
    STATE.quadTimer -= dt;
    document.getElementById('powerup-glow').style.opacity = STATE.quadTimer > 0 ? '1' : '0';
    document.getElementById('active-powerup-label').classList.toggle('hidden', STATE.quadTimer <= 0);
  }
}
function rcCombatStep(dt, now) {
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
}
window.RC = window.RC || {};
RC.core = RC.core || {};
RC.core.combat = { triggers: rcCombatTriggers, step: rcCombatStep, fire: firePlayerWeapon, damagePlayer: damagePlayer };
