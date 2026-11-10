/* DYSTOPIA release candidate — player-facing shell.
   Studio, the Meshy panel, and Doom Party stay in the DOM (game.js binds
   them at startup) but they are not part of this flow. The menu is
   New Campaign / Continue / Reset. */
(function () {
  const RC = (window.RC = window.RC || {});

  function hideDev() {
    document.body.classList.add('rc');
    ['btn-open-studio', 'studio-editor-modal'].forEach((id) => {
      const n = document.getElementById(id);
      if (n) n.setAttribute('hidden', 'hidden');
    });
    const tab = document.getElementById('tab-party-mode');
    const panel = document.getElementById('panel-party-config');
    if (tab) tab.style.display = 'none';
    if (panel) panel.style.display = 'none';
    const solo = document.getElementById('tab-solo-mode');
    if (solo) solo.textContent = 'SINGLE PLAYER';
  }

  function refreshMenu() {
    const cont = document.getElementById('btn-rc-continue');
    const save = RC.campaign && RC.campaign.readSave();
    if (cont) {
      cont.style.display = save ? '' : 'none';
      cont.textContent = save && save.win ? 'RETURN TO THE OPEN YARD' : (save ? `CONTINUE  ·  L${save.level} ${['G', 'B1', 'B2', 'B3'][save.floor] || ''}` : 'CONTINUE');
    }
    const note = document.getElementById('rc-menu-note');
    if (note) {
      note.textContent = (RC.campaign && RC.campaign.won())
        ? 'Campaign complete. The fence stays down until you start a new campaign.'
        : (save ? 'A save is ready. Continue keeps this run. New Campaign replaces it.' : '');
    }
  }

  function installMenu() {
    const desc = document.getElementById('modal-desc');
    if (desc) desc.textContent = 'Dana Ashby. The yard fence is live. The west dock is open. The east airlock opens if you hold at the scanner. Cradle 09 is the way out.';
    const tabs = document.getElementById('tab-solo-mode');
    if (tabs && tabs.parentElement) tabs.parentElement.id = 'rc-tabrow';
    const levelWrap = document.querySelector('#select-level') && document.querySelector('#select-level').parentElement;
    if (levelWrap) levelWrap.hidden = true;
    const panel = document.getElementById('panel-solo-config');
    if (!panel || document.getElementById('btn-rc-new')) return;
    const box = document.createElement('div');
    box.className = 'rc-menu';
    box.innerHTML = '<p id="rc-menu-note"></p><button type="button" id="btn-rc-new" class="q3-btn action-btn">NEW CAMPAIGN</button><button type="button" id="btn-rc-continue" class="q3-btn action-btn">CONTINUE</button>';
    panel.appendChild(box);
    const settings = document.createElement('details');
    settings.id = 'rc-settings';
    settings.innerHTML = '<summary>SETTINGS</summary>';
    const skill = document.getElementById('select-bot-diff');
    if (skill && skill.closest('.grid')) settings.appendChild(skill.closest('.grid'));
    const bright = document.getElementById('slider-bright');
    if (bright && bright.closest('.q3-inset')) settings.appendChild(bright.closest('.q3-inset'));
    const extra = document.createElement('div');
    extra.className = 'rc-toggles';
    extra.innerHTML = '<button type="button" id="btn-rc-reduced" style="display:block;width:100%;margin:0 0 8px">REDUCED EFFECTS: OFF</button><button type="button" id="btn-rc-contrast" style="display:block;width:100%;margin:0 0 8px">HIGH CONTRAST: OFF</button><button type="button" id="btn-rc-sfx" style="display:block;width:100%;margin:0 0 8px">SOUND EFFECTS: ON</button><button type="button" id="btn-rc-reset" class="danger" style="display:block;width:100%;margin:0">ERASE CAMPAIGN PROGRESS</button>';
    settings.appendChild(extra);
    panel.appendChild(settings);
    const cred = document.createElement('button');
    cred.type = 'button';
    cred.id = 'btn-rc-credits';
    cred.className = 'q3-btn steel action-btn';
    cred.textContent = 'CREDITS';
    cred.onclick = () => { if (typeof openCredits === 'function') openCredits(); };
    panel.appendChild(cred);
    document.getElementById('btn-rc-new').onclick = () => { RC.campaign.prepare('new'); document.getElementById('btn-start').click(); };
    document.getElementById('btn-rc-continue').onclick = () => { RC.campaign.prepare('continue'); document.getElementById('btn-start').click(); };
    document.getElementById('btn-rc-reset').onclick = () => {
      if (RC.campaign) RC.campaign.reset();
      refreshMenu();
    };
    document.getElementById('btn-rc-reduced').onclick = () => {
      const on = !(RC.settings.read().reduced);
      RC.settings.write({ reduced: on });
      RC.settings.apply();
      paintToggles();
    };
    document.getElementById('btn-rc-contrast').onclick = () => {
      const on = !(RC.settings.read().contrast);
      RC.settings.write({ contrast: on });
      RC.settings.apply();
      paintToggles();
    };
    document.getElementById('btn-rc-sfx').onclick = () => {
      const on = !(window.SFX && SFX.muted);
      if (window.SFX) SFX.muted = on;
      RC.settings.write({ sfx: !on });
      RC.settings.restoreLegacy();
      paintToggles();
    };
    const start = document.getElementById('btn-start');
    const prev = start.onclick;
    start.onclick = function (e) {
      if (!RC.campaign.pending) RC.campaign.prepare('new');
      const sel = document.getElementById('select-level');
      if (sel) sel.value = '1';
      return prev.call(this, e);
    };
    paintToggles();
    refreshMenu();
  }

  function paintToggles() {
    const s = RC.settings ? RC.settings.read() : {};
    const red = document.getElementById('btn-rc-reduced');
    const con = document.getElementById('btn-rc-contrast');
    const sfx = document.getElementById('btn-rc-sfx');
    if (red) red.textContent = 'REDUCED EFFECTS: ' + (s.reduced ? 'ON' : 'OFF');
    if (con) con.textContent = 'HIGH CONTRAST: ' + (s.contrast ? 'ON' : 'OFF');
    if (sfx) sfx.textContent = 'SOUND EFFECTS: ' + (s.sfx === false ? 'OFF' : 'ON');
  }

  function installObjective() {
    if (document.getElementById('rc-objective')) return;
    const el = document.createElement('div');
    el.id = 'rc-objective';
    document.body.appendChild(el);
  }

  function objectiveText() {
    const yard = (STATE.floor || 0) === 0 && STATE.player && STATE.player.z > 86;
    if (yard && RC.campaign && RC.campaign.won()) return 'South gate is open.';
    if (yard) return 'West dock is open. East airlock needs the scanner. The fence opens when Cradle 09 falls.';
    if (STATE.floorCleared) return 'Floor clear. Take the north exit.';
    return 'Clear this floor, then take the north exit.';
  }

  function installPause() {
    const qr = document.getElementById('mcs-qr');
    if (qr) {
      qr.hidden = true;
      if (qr.previousElementSibling) qr.previousElementSibling.hidden = true;
    }
    const sheet = document.querySelector('#mc-sheet .card');
    if (!sheet || document.getElementById('btn-rc-pause-reduced')) return;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<button type="button" id="btn-rc-pause-reduced">REDUCED EFFECTS</button><button type="button" id="btn-rc-pause-contrast">CONTRAST</button>';
    const main = document.getElementById('mcs-main');
    sheet.insertBefore(row, main);
    document.getElementById('btn-rc-pause-reduced').onclick = () => {
      const on = !RC.settings.read().reduced;
      RC.settings.write({ reduced: on });
      RC.settings.apply();
    };
    document.getElementById('btn-rc-pause-contrast').onclick = () => {
      const on = !RC.settings.read().contrast;
      RC.settings.write({ contrast: on });
      RC.settings.apply();
    };
  }

  function installEpilogueButton() {
    if (document.getElementById('btn-rc-epilogue')) return;
    const b = document.createElement('button');
    b.id = 'btn-rc-epilogue';
    b.type = 'button';
    b.textContent = 'WATCH EPILOGUE';
    b.onclick = () => { if (RC.victory) RC.victory.play('button'); };
    document.body.appendChild(b);
  }

  function installMinimap() {
    if (typeof drawMinimap !== 'function') return;
    const prev = drawMinimap;
    window.drawMinimap = drawMinimap = function () {
      if (STATE.player && STATE.player.z > 86 && (STATE.floor || 0) === 0) return drawYardMap();
      return prev.apply(this, arguments);
    };
  }

  function drawYardMap() {
    const mc = document.getElementById('minimap-canvas');
    if (!mc) return;
    const ctx = mc.getContext('2d');
    const y = RC.yard.layoutRef();
    const w = y.walk, f = y.fence;
    ctx.fillStyle = '#14110e';
    ctx.fillRect(0, 0, mc.width, mc.height);
    const sx = mc.width / (w.maxX - w.minX + 16);
    const sz = mc.height / (w.maxZ - w.minZ + 16);
    const X = (x) => (x - w.minX + 8) * sx;
    const Z = (z) => (z - w.minZ + 8) * sz;
    ctx.strokeStyle = RC.campaign.won() ? '#6ee7b7' : '#67e8f9';
    ctx.lineWidth = 2;
    ctx.strokeRect(X(f.minX), Z(f.minZ), (f.maxX - f.minX) * sx, (f.maxZ - f.minZ) * sz);
    ctx.fillStyle = '#f59e0b';
    y.routes.forEach((r) => { ctx.fillRect(X(r.walkX) - 2, Z(90), 4, (97 - 90) * sz); });
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(X(STATE.player.x), Z(STATE.player.z), 3.2, 0, Math.PI * 2);
    ctx.fill();
    const lab = document.getElementById('minimap-label');
    if (lab) lab.textContent = RC.campaign.won() ? 'Gate open' : 'Fence live';
  }

  function installHud() {
    if (typeof updateHUD !== 'function') return;
    const prev = updateHUD;
    window.updateHUD = updateHUD = function () {
      prev.apply(this, arguments);
      if (!STATE.player || (STATE.floor || 0) !== 0 || STATE.player.z < 86) return;
      const badge = document.getElementById('level-badge');
      if (badge) badge.textContent = 'YARD  ·  PERIMETER';
      const mf = document.getElementById('mh-floor');
      if (mf) mf.textContent = RC.campaign.won() ? 'GATE' : 'YARD';
      const ks = document.getElementById('keycard-status');
      if (!ks) return;
      if (RC.campaign.won()) { ks.textContent = 'FENCE DOWN  ·  SOUTH GATE OPEN'; ks.className = 'text-[10px] text-emerald-400 font-black block'; }
      else { ks.textContent = 'FENCE LIVE  ·  TWO WAYS IN'; ks.className = 'text-[10px] text-cyan-300 font-bold block'; }
      const epi = document.getElementById('btn-rc-epilogue');
      if (epi) epi.style.display = RC.campaign.won() ? 'block' : 'none';
    };
    const paint = () => {
      const el = document.getElementById('rc-objective');
      if (el && STATE.running) el.textContent = objectiveText();
    };
    const wrapped = updateHUD;
    window.updateHUD = updateHUD = function () { wrapped.apply(this, arguments); paint(); };
    setInterval(paint, 400);
  }

  function installCredits() {
    if (typeof openCredits !== 'function') return;
    const prev = openCredits;
    window.openCredits = openCredits = function () {
      prev.apply(this, arguments);
      const card = document.querySelector('#credits-screen .cr-card');
      if (!card || card.querySelector('.rc-cred')) return;
      const extra = document.createElement('div');
      extra.className = 'cr-sec rc-cred';
      extra.innerHTML = '<b>RELEASE V2</b><br>Industrial surfaces: Poly Haven, CC0, via the shared release-next texture set.<br>Guard motion: RobotExpressive by Tomás Laulhé / three.js, CC0. The toy mesh is hidden. Armor on that skeleton is original.<br>The Sentinel is an original rig. It speaks the campaign lines, including “You are safe. You are loved.”<br>Hidden yard collision still loads Kenney Factory Kit and City Kit (Industrial), CC0.<br>Ledger: release-v2/licenses/ATTRIBUTION.md';
      card.insertBefore(extra, card.querySelector('#cr-close'));
    };
  }

  function installDeath() {
    if (typeof uiDeath !== 'function' || uiDeath.__rc) return;
    const prev = uiDeath;
    uiDeath = function (who, done) {
      const ret = prev(who, done);
      const s = document.getElementById('kia-s');
      if (s) s.textContent = who ? 'Downed by ' + who + '. This floor will restart.' : 'You are down. This floor will restart.';
      return ret;
    };
    uiDeath.__rc = true;
    window.uiDeath = uiDeath;
  }

  function install() {
    hideDev();
    installMenu();
    installObjective();
    installPause();
    installEpilogueButton();
    installMinimap();
    installHud();
    installCredits();
    installDeath();
    if (RC.settings && RC.settings.bind) RC.settings.bind();
  }

  RC.hud = { install, refreshMenu, drawYardMap };
})();
