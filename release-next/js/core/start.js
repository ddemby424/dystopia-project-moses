/* DYSTOPIA candidate — start the extracted loop.
   The legacy page boots from the bottom of game.js. This page boots here,
   after player, combat, enemies, levels, render, and loop have defined
   the functions the first map build calls. */
(function () {
  const L0 = genFloorLayout(1, 0);
  MAP_OBJECTS = L0.objects;
  FLOOR_INFO = L0.info;
  buildArenaMap();
  buildViewModel();
  renderWeaponBar();
  fitGameViewport();
  if (typeof startFloor === 'function' && !startFloor.__fadeWrapped) {
    const sf = startFloor;
    startFloor = function () {
      if (typeof uiFade === 'function') uiFade();
      document.body.classList.add('in-game');
      return sf.apply(this, arguments);
    };
    startFloor.__fadeWrapped = true;
  }
  requestAnimationFrame(gameLoop);
  autoLoadMeshyAssets().then(() => {
    if (!STATE.running) buildArenaMap();
    buildViewModel();
    window.uiLoad && uiLoad(1, 'All systems online');
  });
  window.RC = window.RC || {};
  RC.core = RC.core || {};
  RC.core.ready = true;
})();
