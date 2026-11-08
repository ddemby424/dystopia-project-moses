/* DYSTOPIA release candidate — boot.
   Loads after game.js. Hooks stay thin: collision, floor start, the win
   elevator, and the weak-point anchor. The legacy index never loads this file. */
(function () {
  const RC = (window.RC = window.RC || {});

  function installHooks() {
    IS_RELEASE_BUILD = true;
    RC._playerCollidesAt = playerCollidesAt;
    RC._collidesAt = collidesAt;
    RC._collidesAt3 = collidesAt3;
    RC._buildArenaMap = buildArenaMap;
    RC._startFloor = startFloor;
    RC._startCampaign = startCampaignLevel;
    RC._advance = advanceFloor;
    RC._updateFloor = updateFloorLogic;

    playerCollidesAt = function (x, z, y) {
      if (RC.world.isExterior(x, z)) return RC.world.exteriorBlocked(x, z, y, 0.65);
      return RC._playerCollidesAt(x, z, y);
    };
    collidesAt = function (x, z, r) {
      if (RC.world.isExterior(x, z)) return RC.world.exteriorBlocked(x, z, null, r == null ? 0.65 : r);
      return RC._collidesAt(x, z, r);
    };
    collidesAt3 = function (x, y, z, r) {
      if (RC.world.isExterior(x, z)) return RC.world.exteriorBlocked(x, z, y, r == null ? 0.15 : r);
      return RC._collidesAt3(x, y, z, r);
    };
    buildArenaMap = function () {
      const ret = RC._buildArenaMap.apply(this, arguments);
      try { if ((STATE.floor || 0) === 0) RC.yard.carve(); } catch (e) { console.warn('carve', e); }
      return ret;
    };
    startFloor = function (lvl, floor) {
      const ret = RC._startFloor.apply(this, arguments);
      try {
        if ((floor || 0) === 0 && !RC.campaign.inside) {
          RC.yard.spawnPlayer();
          if (!RC.campaign.won()) RC.yard.spawnGuards();
          else RC.campaign.applyWinReturn();
        }
        if (RC.fence) RC.fence.setLive(!RC.campaign.won());
        const job = RC.campaign._restore;
        if (job) { RC.campaign.restore(job); RC.campaign._restore = null; }
        RC.campaign.autosave();
      } catch (e) { console.warn('rc floor', e); }
      return ret;
    };
    startCampaignLevel = function (lvl) {
      const job = RC.campaign.consume();
      if (job && job.mode === 'continue') {
        RC.campaign._restore = job;
        return startFloor(job.level || 1, job.floor || 0);
      }
      if (job && job.mode === 'winreturn') {
        RC.campaign.writeWin(true);
        startFloor(1, 0);
        return;
      }
      return RC._startCampaign.apply(this, arguments);
    };
    advanceFloor = function () {
      if ((STATE.floor || 0) < 3 || (STATE.level || 1) < (STATE.maxLevels || 9)) return RC._advance.apply(this, arguments);
      RC.campaign.onVictory();
    };
    updateFloorLogic = function (dt, now) {
      const ret = RC._updateFloor.apply(this, arguments);
      if (RC.fence) RC.fence.update(dt);
      /* The visible pill is rewritten from FLOOR_NAMES on a timer inside game.js. */
      const inYard = (STATE.floor || 0) === 0 && STATE.player.z > 86;
      FLOOR_NAMES[0] = inYard ? (RC.campaign.won() ? 'GATE' : 'YARD') : 'G';
      return ret;
    };
    /* A rotate / unfold can leave visualViewport stale for a frame. If it disagrees
       with the layout viewport, fit to the layout size so the canvas is not letterboxed. */
    const fit0 = fitGameViewport;
    fitGameViewport = function () {
      fit0();
      const vv = window.visualViewport;
      if (!vv) return;
      if (Math.abs(vv.width - innerWidth) < 48 && Math.abs(vv.height - innerHeight) < 48) return;
      const w = Math.max(1, Math.floor(innerWidth));
      const h = Math.max(1, Math.floor(innerHeight));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      const px = typeof gfxPixelRatio === 'function' ? gfxPixelRatio() : Math.min(window.devicePixelRatio || 1, IS_COARSE ? 1.1 : 2);
      renderer.setPixelRatio(px);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
    };
  }

  function installSoftSpots() {
    const fn = RC.fixes.softSpotWorld;
    // `softSpotWorld` is a function binding from game.js, visible here, and mutable.
    softSpotWorld = fn;
  }

  function splashStatus(text) {
    const s = document.getElementById('splash-status');
    if (s && text) s.textContent = text;
  }

  function boot() {
    document.title = 'DYSTOPIA — single-player release candidate';
    installHooks();
    installSoftSpots();
    RC.controls.bind();
    RC.hud.install();
    const params = new URLSearchParams(location.search);
    RC.yard.loadLayout().then(() => {
      RC.yard.buildShell();
      RC.fence.build();
      try { RC.yard.carve(); } catch (e) { console.warn('carve', e); }
      splashStatus('Yard shell ready — loading modular kit…');
      return RC.kit.loadAll(RC.yard.layoutRef(), (n, total) => {
        splashStatus('Modular kit ' + n + '/' + total);
        if (window.uiLoad) uiLoad(0.2 + 0.5 * n / Math.max(1, total), 'Modular kit ' + n + '/' + total);
      });
    }).then(() => {
      RC.yard.upgradeVisuals();
      RC.fence.build();
      const st = RC.assets.stats;
      RC.budget = {
        kitFiles: st.files,
        kitFailed: st.failed,
        kitBytes: st.bytes,
        when: new Date().toISOString()
      };
      splashStatus(st.failed ? 'Kit loaded with ' + st.failed + ' fallback(s)' : 'Yard kit ready');
      if (params.get('capture') === 'victory') runCapture();
    }).catch((e) => { console.warn('rc boot', e); splashStatus('Yard fallback (kit failed)'); });
  }

  function runCapture() {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hidden');
    document.getElementById('game-modal').classList.add('hidden');
    STATE.running = true;
    document.body.classList.add('playing', 'in-game');
    RC.fence.setLive(true);
    const frames = [];
    const total = 96;
    let i = 0;
    const step = () => {
      const t = i / (total - 1);
      RC.victory._cam(t);
      frames.push(renderer.domElement.toDataURL('image/jpeg', 0.7));
      i++;
      if (i < total) requestAnimationFrame(step);
      else window.__RC_FRAMES = frames;
    };
    requestAnimationFrame(step);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  RC.boot = boot;
})();
