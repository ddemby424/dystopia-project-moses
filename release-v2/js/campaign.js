/* DYSTOPIA release candidate — single-player progression.
   The 9×4 floor campaign in game.js is unchanged. This file only decides
   when Floor G starts in the yard, when a clear of 9-B3 counts as the win,
   and how that win is saved, replayed, or wiped.
   Keys: dys_rc_win_v1, dys_rc_save_v1. Reset removes both. */
(function () {
  const RC = (window.RC = window.RC || {});
  const WIN_KEY = 'dys_rc_win_v1';
  const SAVE_KEY = 'dys_rc_save_v1';
  const camp = { pending: null, forceYard: false, inside: /[?&]inside=1/.test(location.search) };

  function won() { try { return localStorage.getItem(WIN_KEY) === '1'; } catch (e) { return false; } }
  function writeWin(on) { try { if (on) localStorage.setItem(WIN_KEY, '1'); else localStorage.removeItem(WIN_KEY); } catch (e) {} }
  function readSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
  function writeSave(data) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {} }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  function snapshot() {
    return {
      v: 1,
      level: STATE.level || 1,
      floor: STATE.floor || 0,
      score: STATE.score || 0,
      hp: Math.max(1, Math.round(STATE.player.health || 100)),
      ar: Math.round(STATE.player.armor || 0),
      grenades: STATE.grenades,
      weapons: (STATE.weapons || []).map((w) => ({ ammo: w.ammo === Infinity ? null : w.ammo })),
      win: won(),
      t: Date.now()
    };
  }

  function autosave() {
    if (camp.suppressSave) return;
    writeSave(snapshot());
    if (RC.hud) RC.hud.refreshMenu();
  }

  function restore(job) {
    if (!job) return;
    STATE.score = job.score || 0;
    const el = document.getElementById('score-val');
    if (el) el.textContent = String(STATE.score).padStart(6, '0');
    if (job.hp) STATE.player.health = job.hp;
    if (job.ar != null) STATE.player.armor = job.ar;
    if (job.grenades != null) STATE.grenades = job.grenades;
    (job.weapons || []).forEach((w, i) => {
      if (!STATE.weapons[i] || w.ammo == null) return;
      if (STATE.weapons[i].ammo === Infinity) return;
      STATE.weapons[i].ammo = w.ammo;
    });
    if (typeof updateHUD === 'function') updateHUD();
  }

  function applyWinReturn() {
    try { clearBots(); } catch (e) {}
    (window.COLOSSI || []).forEach((C) => {
      C.dead = true; C.hp = 0;
      if (C.root) C.root.visible = false;
      (C.spots || []).forEach((s) => { if (s.g) s.g.visible = false; });
    });
    STATE.combatActive = false;
    STATE.dying = false;
    STATE.player.health = 100;
    STATE.player.armor = 40;
    if (RC.yard) RC.yard.spawnPlayer();
    if (RC.fence) RC.fence.setLive(false);
  }

  function onVictory() {
    if (camp._winning) return;
    camp._winning = true;
    writeWin(true);
    camp.suppressSave = true;
    try { startFloor(1, 0); } catch (e) { console.warn('win floor', e); }
    applyWinReturn();
    camp.suppressSave = false;
    STATE.running = true;
    STATE.pausedForStudio = false;
    autosave();
    if (typeof showBanner === 'function') showBanner('PERIMETER OFFLINE', 'Moses Protocol terminated. The south gate is open.', 4200);
    camp._winning = false;
    if (RC.victory) RC.victory.play('win');
  }

  /* Test / debug entry. Same path the elevator takes after 9-B3. */
  function forceWin() { onVictory(); }

  function reset() {
    writeWin(false);
    clearSave();
    camp.pending = null;
    if (RC.fence) { RC.fence.setLive(true); RC.fence._gateLatch = false; }
    if (RC.victory && RC.victory.close) RC.victory.close('reset');
    if (STATE.running) {
      STATE.score = 0;
      const el = document.getElementById('score-val');
      if (el) el.textContent = '000000';
      startFloor(1, 0);
    }
    if (RC.hud) RC.hud.refreshMenu();
  }

  function prepare(mode) {
    const save = readSave();
    if (mode === 'continue' && save) {
      camp.pending = save.win ? Object.assign({ mode: 'winreturn' }, save) : Object.assign({ mode: 'continue' }, save);
    } else {
      writeWin(false);
      clearSave();
      camp.pending = { mode: 'new' };
    }
  }

  function consume() {
    const job = camp.pending;
    camp.pending = null;
    return job;
  }

  RC.campaign = camp;
  RC.campaign.won = won;
  RC.campaign.writeWin = writeWin;
  RC.campaign.readSave = readSave;
  RC.campaign.autosave = autosave;
  RC.campaign.restore = restore;
  RC.campaign.applyWinReturn = applyWinReturn;
  RC.campaign.onVictory = onVictory;
  RC.campaign.forceWin = forceWin;
  RC.campaign.reset = reset;
  RC.campaign.prepare = prepare;
  RC.campaign.consume = consume;
  RC.campaign.snapshot = snapshot;
})();
