/* DYSTOPIA candidate — frame loop.
   This file is what the release page runs. The legacy page still uses game.js.
   Order of one frame. Each call is a seam in a sibling file. Do not put new gameplay inline if it belongs to player, combat, enemies, levels, or render.
*/
let lastTime = performance.now();
function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(0.05, (now - lastTime) / 1000); lastTime = now;
  if (LORE_OPEN) { renderFrame(); return; }
  if (STATE.dm) dmUpdate(dt);
  if (STATE.turnAnim) turnAnimUpdate(dt);
  if (STATE.running) lookApply(dt);
  musicUpdate(dt);
  RC.core.render.atmosphere(dt, now);
  if (!STATE.running || STATE.pausedForStudio) { renderFrame(); return; }
  RC.core.combat.triggers(dt, now);
  RC.core.player.step(dt, now);
  RC.core.levels.elevator(dt, now);
  RC.core.player.pickups(dt, now);
  RC.core.render.fx(dt, now);
  RC.core.combat.step(dt, now);
  RC.core.enemies.step(dt, now);
  updateLore(dt, now);
  updateFloorLogic(dt, now);
  updateSoftSpots(dt, now);
  if ((drawMinimap._acc = (drawMinimap._acc || 0) + dt) >= 0.2) { drawMinimap._acc = 0; drawMinimap(); }
  if (typeof IS_COARSE !== 'undefined' && IS_COARSE && typeof renderer !== 'undefined') {
    const ft = (RC._ft = RC._ft || { slow: 0, fast: 0, px: renderer.getPixelRatio() });
    const ms = dt * 1000;
    if (ms > 28) { ft.slow++; ft.fast = 0; } else if (ms < 18) { ft.fast++; ft.slow = Math.max(0, ft.slow - 1); }
    if (ft.slow >= 10 && ft.px > 1.01) {
      ft.px = 1; ft.slow = 0;
      try { renderer.setPixelRatio(1); } catch (e) {}
    } else if (ft.fast >= 120 && ft.px < 1.2) {
      ft.px = Math.min(1.25, window.devicePixelRatio || 1); ft.fast = 0;
      try { renderer.setPixelRatio(ft.px); } catch (e) {}
    }
  }
  renderFrame();
}
window.RC = window.RC || {};
RC.core = RC.core || {};
RC.core.loop = gameLoop;
