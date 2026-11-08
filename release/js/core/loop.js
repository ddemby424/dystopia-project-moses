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
  drawMinimap();
  renderFrame();
}
window.RC = window.RC || {};
RC.core = RC.core || {};
RC.core.loop = gameLoop;
