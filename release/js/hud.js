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
        : 'Start in the yard. Two doors lead in. The fence opens when Cradle 09 falls.';
    }
  }

  function installMenu() {
    const desc = document.getElementById('modal-desc');
    if (desc) desc.innerHTML = 'You are <b class="text-amber-400">Dana Ashby</b>. The yard is sealed by a live fence. Enter by the <b class="text-amber-300">loading dock</b> or the <b class="text-amber-300">personnel airlock</b>, descend Cradle 09, and the perimeter dies with the Protocol.';
    const levelWrap = document.querySelector('#select-level') && document.querySelector('#select-level').parentElement;
    if (levelWrap) levelWrap.style.display = 'none';
    const panel = document.getElementById('panel-solo-config');
    if (!panel || document.getElementById('btn-rc-new')) return;
    const box = document.createElement('div');
    box.className = 'rc-menu';
    box.innerHTML = '<p id="rc-menu-note"></p><button type="button" id="btn-rc-new" class="q3-btn action-btn">NEW CAMPAIGN</button><button type="button" id="btn-rc-continue" class="q3-btn action-btn">CONTINUE</button><button type="button" id="btn-rc-reset" class="q3-btn steel action-btn">RESET WIN &amp; SAVE</button>';
    panel.appendChild(box);
    document.getElementById('btn-rc-new').onclick = () => { RC.campaign.prepare('new'); document.getElementById('btn-start').click(); };
    document.getElementById('btn-rc-continue').onclick = () => { RC.campaign.prepare('continue'); document.getElementById('btn-start').click(); };
    document.getElementById('btn-rc-reset').onclick = () => RC.campaign.reset();
    const start = document.getElementById('btn-start');
    const prev = start.onclick;
    start.onclick = function (e) {
      if (!RC.campaign.pending) RC.campaign.prepare('new');
      const sel = document.getElementById('select-level');
      if (sel) sel.value = '1';
      return prev.call(this, e);
    };
    refreshMenu();
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
      extra.innerHTML = '<b>RELEASE CANDIDATE YARD</b><br>Factory Kit 3.0 and City Kit (Industrial) by Kenney (www.kenney.nl) — CC0. Modular pieces, not a ripped map. Full ledger: release/licenses/ATTRIBUTION.md';
      card.insertBefore(extra, card.querySelector('#cr-close'));
    };
  }

  function install() {
    hideDev();
    installMenu();
    installEpilogueButton();
    installMinimap();
    installHud();
    installCredits();
  }

  RC.hud = { install, refreshMenu, drawYardMap };
})();
