/* DYSTOPIA candidate — render orchestration.
   This file is what the release page runs. The legacy page still uses game.js.
   What the frame loop updates before it draws: sirens, arena lights, steam, and the short-lived fx lists. The WebGLRenderer, lights, and renderFrame() are still created in engine.js.
*/
function rcRenderAtmosphere(dt, now) {
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
  if (!IS_COARSE && !STATE.rcReduced) {
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

}
function rcRenderFx(dt, now) {
  fxUpdate(dt); rtLightsUpdate(); adsUpdate(dt); updateArcPreview(); updateDrones(dt, now); updateScorePopups(dt); /* Round 22: updateSoftSpots moved after updateFloorLogic (Colossus moves there) */
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
}
window.RC = window.RC || {};
RC.core = RC.core || {};
RC.core.render = { atmosphere: rcRenderAtmosphere, fx: rcRenderFx, draw: renderFrame };
