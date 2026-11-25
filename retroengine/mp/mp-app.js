/*
 * mp-app.js — wires the lobby into RetroEngine's start menu and playtest.
 *
 *   Menu → Multiplayer  opens the lobby (or "Server offline" if the
 *   relay isn't running). Start campaign / Playtest still work with no
 *   server — we only open a socket when you enter the lobby.
 *
 * Server URL, in this order:
 *   1. ?mp=ws://host/ws          (or wss://…)
 *   2. ws://localhost:8080/ws    when the page itself is on localhost
 *   3. wss://dembysoftwaresystems.com/ws   on https
 *   4. otherwise, same host as the page, path /ws
 */
import { mountLobby } from './lobby.js';
import { attachMultiplayer } from './mp-dmbtech1.js';

const NAME_KEY = 'retroengine.playerName';

// Multiplayer spawn.
//   'shared' (default for testing): everyone starts on the host's pad (pad 1,
//            or the map's single start), nudged apart so nobody stacks, then a
//            10-second countdown lets you spread out before damage turns on.
//   'fixed'  = join order (player 1 at pad 1, player 2 at pad 2, wrapping).
//   'random' = a random pad. LATER (not built yet): do it the Doom deathmatch
//            way: pick a random deathmatch start and skip any pad another
//            player is standing on (Doom's G_CheckSpot), so nobody telefrags.
export const mpSettings = { spawnMode: 'shared', countdownSec: 10 };

// Small offsets around the shared pad (cells). Slot 0 is the pad itself.
const SHARED_OFFSETS = [[0, 0], [0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8], [0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8], [1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]];

function cellOpen(level, x, y) {
  const cx = Math.floor(x), cy = Math.floor(y), w = level.w | 0, h = level.h | 0;
  if (!w || !h) return true;
  if (cx < 0 || cy < 0 || cx >= w || cy >= h) return false;
  const i = cy * w + cx;
  const wall = level.wall && level.wall[i], kind = level.kind && level.kind[i];
  return !wall || !!kind;
}

// Shared start for join slot N: the first pad plus a small open offset.
export function sharedSpawnPoint(level, slot) {
  const pad = spawnList(level)[0];
  if (!pad) return null;
  const n = SHARED_OFFSETS.length;
  const start = ((slot | 0) % n + n) % n;
  for (let k = 0; k < n; k++) {
    const o = SHARED_OFFSETS[(start + k) % n];
    const x = pad.x + o[0], y = pad.y + o[1];
    // Check the spot and a player-radius box around it for walls.
    if (cellOpen(level, x, y) && cellOpen(level, x - 0.25, y - 0.25) && cellOpen(level, x + 0.25, y - 0.25)
      && cellOpen(level, x - 0.25, y + 0.25) && cellOpen(level, x + 0.25, y + 0.25)) {
      return { x: x, y: y, r: pad.r || 0 };
    }
  }
  return { x: pad.x, y: pad.y, r: pad.r || 0 };
}

export function spawnList(level) {
  if (!level) return [];
  if (level.spawns && level.spawns.length) return level.spawns;
  if (level.spawn) return [level.spawn];
  return [];
}

export function pickSpawnIndex(welcome, level, mode) {
  const list = spawnList(level);
  const n = list.length || 1;
  const joinIndex = (welcome && welcome.peers && welcome.peers.length) || 0;
  const use = mode || mpSettings.spawnMode || 'fixed';
  if (use === 'shared') return 0;
  if (use === 'random') return Math.floor(Math.random() * n);
  return ((joinIndex % n) + n) % n;
}

export function defaultMpUrl() {
  try {
    const q = new URLSearchParams(location.search).get('mp');
    if (q && /^(ws|wss):\/\//i.test(q)) return q;
  } catch (e) { /* ignore */ }
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'ws://localhost:8080/ws';
  if (location.protocol === 'https:') return 'wss://dembysoftwaresystems.com/ws';
  return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
}

export function starterLevelSlug(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
}

// Prefer a stable id the joiner can resolve on a fresh editor (pack-… or
// starter-…), not l0/l1 which only mean "slot N of *this* client's project".
export function canonicalLevelId(selectedId, level, pack, starters) {
  if (typeof selectedId === 'string' && (selectedId.indexOf('pack-') === 0 || selectedId.indexOf('starter-') === 0)) {
    return selectedId;
  }
  const name = level && level.name;
  const packs = pack || [];
  if (name) {
    for (let i = 0; i < packs.length; i++) {
      if (packs[i] && packs[i].name === name && packs[i].id) return packs[i].id;
    }
  }
  const list = starters || [];
  if (name) {
    const want = 'starter-' + starterLevelSlug(name);
    for (let i = 0; i < list.length; i++) {
      if (list[i] && (list[i].name === name || list[i].id === want)) return list[i].id || want;
    }
    if (!packs.length && !list.length) return want;
  }
  return selectedId || 'l0';
}

function levelList(project, pack, starters) {
  const packs = pack || [];
  const starts = starters || [];
  const seen = {};
  const out = [];
  function add(id, name) {
    if (!id || seen[id]) return;
    seen[id] = true;
    out.push({ id: id, name: name || id });
  }
  const levels = (project && project.levels) || [];
  levels.forEach(function (lv, i) {
    add(canonicalLevelId('l' + i, lv, packs, starts), lv.name || ('Level ' + (i + 1)));
  });
  packs.forEach(function (p) { if (p) add(p.id, p.name); });
  return out;
}

function characterList(RT) {
  const models = (RT && RT.PLAYER_MODELS) || {};
  return Object.keys(models).map(function (id) {
    return { id: id, name: models[id].name || id };
  });
}

function parseLevelIndex(project, levelId, levelName) {
  const levels = (project && project.levels) || [];
  if (typeof levelId === 'string' && /^l\d+$/.test(levelId)) {
    const i = +levelId.slice(1);
    if (i >= 0 && i < levels.length) return i;
  }
  if (levelName) {
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].name === levelName) return i;
    }
  }
  const asNum = Number(levelId);
  if (Number.isInteger(asNum) && asNum >= 0 && asNum < levels.length) return asNum;
  return 0;
}

export async function resolveRoomLevel(welcome, api, rooms) {
  api = api || {};
  welcome = welcome || {};
  let id = welcome.level;
  let name = welcome.levelName;
  const list = rooms || [];
  if ((!name || !id) && list.length && welcome.room) {
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === welcome.room) {
        if (!name) name = list[i].levelName;
        if (!id) id = list[i].level;
        break;
      }
    }
  }
  const packOf = function (token) {
    if (typeof token === 'string' && token.indexOf('pack-') === 0) return token.slice(5);
    return null;
  };
  try {
    const slug = packOf(id);
    if (slug && api.loadPackLevel) {
      return { id: id, name: name, override: await api.loadPackLevel(slug), source: 'pack' };
    }
    if (typeof id === 'string' && id.indexOf('starter-') === 0 && api.loadStarterLevel) {
      return { id: id, name: name, override: api.loadStarterLevel(id), source: 'starter' };
    }
    if (name && api.getPackLevels) {
      const pack = await api.getPackLevels();
      for (let i = 0; i < (pack || []).length; i++) {
        if (pack[i] && pack[i].name === name && pack[i].id) {
          const s = packOf(pack[i].id);
          if (s && api.loadPackLevel) {
            return { id: pack[i].id, name: name, override: await api.loadPackLevel(s), source: 'pack-name' };
          }
        }
      }
    }
    if (name && api.loadStarterLevel) {
      try {
        const lv = api.loadStarterLevel(name);
        if (lv) return { id: 'starter-' + starterLevelSlug(name), name: name, override: lv, source: 'starter-name' };
      } catch (e) { /* not a starter */ }
    }
  } catch (e) {
    return { error: e };
  }
  const idx = parseLevelIndex(api.getProject && api.getProject(), id, name);
  return { id: id, name: name, idx: idx, source: 'project' };
}

/**
 * Hook Multiplayer into the editor. api:
 *   RT, getProject, playtest(index, extra), stopPlaytest(),
 *   getPlayHandle(), playHost, toast?
 * Returns { openLobby, teardown, defaultMpUrl, tick }.
 */
export function installMultiplayer(api) {
  const host = document.getElementById('mp-lobby-host');
  if (!host) {
    console.warn('RetroEngine: #mp-lobby-host missing, multiplayer lobby disabled');
    return { openLobby: function () {}, teardown: function () {}, defaultMpUrl: defaultMpUrl, tick: function () {} };
  }

  let lobbyUi = null;
  let mpSession = null;
  let entering = false;     // true while we start play after a join
  let mpTickFn = null;
  // Pre-match countdown (performance.now ms when damage turns on).
  let fightAt = 0, fightShownUntil = 0, isHost = false, cdEl = null, lastCdText = '';
  // Match phase: 'waiting' (pre-match roster + Ready) → 'countdown' → 'fight'.
  let waitShownAt = 0;
  let phase = 'waiting', hostId = null, waitEl = null, waitKey = '', curMp = null, offKeys = null;

  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }
  function countdownLeft() { return Math.max(0, (fightAt - now()) / 1000); }
  function canDamage() { return phase !== 'waiting' && countdownLeft() <= 0; }
  function setCountdown(sec) {
    const was = countdownLeft() > 0;
    fightAt = now() + Math.max(0, sec) * 1000;
    if (was && sec <= 0) fightShownUntil = now() + 1500;
  }
  function showCountdown() {
    const left = countdownLeft();
    let text = '';
    if (left > 0) text = 'Deathmatch begins in ' + Math.ceil(left) + '\u2026';
    else if (fightAt && now() < fightAt + 1500) text = 'FIGHT!';
    else if (now() < fightShownUntil) text = 'FIGHT!';
    if (text === lastCdText) return;
    lastCdText = text;
    if (!cdEl) {
      cdEl = document.createElement('div');
      cdEl.id = 'mp-countdown';
      cdEl.style.cssText = 'position:fixed;left:0;right:0;top:22%;text-align:center;z-index:9999;pointer-events:none;'
        + 'font:700 clamp(22px,6vw,48px)/1.2 system-ui,sans-serif;color:#ffd24a;text-shadow:0 2px 0 #000,0 0 12px #000;letter-spacing:1px;';
      document.body.appendChild(cdEl);
    }
    cdEl.textContent = text;
    cdEl.style.display = text ? 'block' : 'none';
  }
  function removeCountdown() {
    if (cdEl && cdEl.parentNode) cdEl.parentNode.removeChild(cdEl);
    cdEl = null; lastCdText = ''; fightAt = 0; fightShownUntil = 0;
    if (waitEl && waitEl.parentNode) waitEl.parentNode.removeChild(waitEl);
    waitEl = null; waitKey = ''; waitShownAt = 0; phase = 'waiting'; hostId = null; curMp = null;
    if (offKeys) { offKeys(); offKeys = null; }
  }

  /* ---------- pre-match: "Waiting for players" roster ---------- */
  function roster(mp) {
    const models = (api.RT && api.RT.PLAYER_MODELS) || {};
    const charName = function (id) { return (models[id] && models[id].name) || id || ''; };
    const me = { id: mp.id, name: playerName(), modelId: playerModel(), ready: mp.isReady(), me: true };
    const others = (mp.getPeers ? mp.getPeers() : []).map(function (p) {
      return { id: p.id, name: p.name || 'Player', modelId: p.modelId, ready: mp.isReady(p.id) };
    });
    const order = mp.joinOrder || [];
    const list = [me].concat(others).sort(function (a, b) {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    list.forEach(function (r) { r.char = charName(r.modelId); r.host = r.id === hostId; });
    return list;
  }
  function readyCount(list) { return list.filter(function (r) { return r.ready; }).length; }
  function toggleReady() { if (curMp && phase === 'waiting') { curMp.sendReady(!curMp.isReady()); waitKey = ''; } }
  function hostStart() {
    if (!curMp || !isHost || phase !== 'waiting') return false;
    if (roster(curMp).length < 2) return false;
    startCountdown();
    return true;
  }
  function startCountdown() {
    phase = 'countdown';
    setCountdown(mpSettings.countdownSec || 10);
    if (curMp && curMp.sendMatch) curMp.sendMatch(countdownLeft());
  }
  function showWaiting() {
    // Hide while the game's own pause/menu is up, so its Resume button is never covered.
    const ph = api.getPlayHandle && api.getPlayHandle();
    if (phase !== 'waiting' || !curMp || (ph && ph.state && ph.state !== 'playing')) {
      if (waitEl) waitEl.style.display = 'none';
      waitKey = '';
      return;
    }
    // Free the mouse so the buttons can be clicked: the game grabs it on start
    // (sometimes a moment after the panel appears), so keep letting go for 2 s.
    // Later the player may click the view to look around; we leave that alone.
    if (!waitShownAt) waitShownAt = now();
    if (now() - waitShownAt < 2000) { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ } }
    const list = roster(curMp), n = list.length, rc = readyCount(list);
    const key = JSON.stringify([list, isHost]);
    if (key === waitKey && waitEl) return;
    waitKey = key;
    if (!waitEl) {
      waitEl = document.createElement('div');
      waitEl.id = 'mp-waiting';
      waitEl.style.cssText = 'position:fixed;left:50%;top:8%;transform:translateX(-50%);width:min(92vw,420px);z-index:9999;'
        + 'background:rgba(8,10,14,.88);border:1px solid #3a4250;border-radius:10px;padding:14px;color:#dfe6ee;'
        + 'font:15px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.6);';
      document.body.appendChild(waitEl);
      waitEl.addEventListener('click', function (ev) {
        const b = ev.target && ev.target.closest && ev.target.closest('button[data-mp]');
        if (!b) return;
        ev.preventDefault(); ev.stopPropagation();
        if (b.dataset.mp === 'ready') toggleReady();
        if (b.dataset.mp === 'start') hostStart();
      });
    }
    const esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    const big = 'display:block;width:100%;min-height:56px;margin-top:10px;font:700 20px system-ui,sans-serif;border-radius:8px;border:0;cursor:pointer;touch-action:manipulation;';
    const meReady = curMp.isReady();
    waitEl.style.display = 'block';
    waitEl.innerHTML = '<div style="font:700 20px system-ui,sans-serif;color:#ffd24a">Waiting for players</div>'
      + '<div data-mp-count style="margin:4px 0 8px;color:#9fb0c2">' + rc + '/' + n + ' ready' + (n < 2 ? ' \u00b7 need 2 players' : '') + '</div>'
      + list.map(function (r) {
        return '<div data-mp-row style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #222a35">'
          + '<span>' + esc(r.name) + (r.me ? ' (you)' : '') + (r.host ? ' \u2605' : '') + ' <span style="color:#8a97a8">' + esc(r.char) + '</span></span>'
          + '<b style="color:' + (r.ready ? '#5be37a' : '#ff6a5a') + '">' + (r.ready ? 'Ready' : 'Not ready') + '</b></div>';
      }).join('')
      + '<button data-mp="ready" style="' + big + 'background:' + (meReady ? '#3a4250' : '#2fae5a') + ';color:#fff">' + (meReady ? 'Not ready' : 'Ready') + ' <small style="opacity:.6">(Y)</small></button>'
      + (isHost ? '<button data-mp="start" ' + (n < 2 ? 'disabled ' : '') + 'style="' + big + 'background:' + (n < 2 ? '#2a2f38;color:#667' : '#d9822b;color:#fff') + '">Start now <small style="opacity:.6">(G)</small></button>' : '')
      + '<div style="margin-top:8px;color:#7d8a9a;font-size:13px">Starts when everyone is Ready' + (isHost ? ', or press Start.' : ' or the host presses Start.') + ' No damage until FIGHT!</div>';
  }

  function playerName() {
    try { return localStorage.getItem(NAME_KEY) || 'Player'; } catch (e) { return 'Player'; }
  }
  function setPlayerName(n) {
    n = String(n || 'Player').trim() || 'Player';
    try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* ignore */ }
    return n;
  }
  function playerModel() {
    const RT = api.RT, S = RT && RT.S;
    const models = RT && RT.PLAYER_MODELS;
    const cur = S && S.playerModel;
    return (models && models[cur]) ? cur : 'george';
  }
  function setPlayerModel(id) {
    const RT = api.RT;
    if (!RT || !RT.PLAYER_MODELS || !RT.PLAYER_MODELS[id]) return;
    RT.S.playerModel = id;
    if (RT.saveSettings) RT.saveSettings();
    const handle = api.getPlayHandle && api.getPlayHandle();
    if (handle && handle.game) handle.game.playerModel = id;
  }

  function closeLobby(keepSocket) {
    if (!lobbyUi) { host.classList.remove('on'); return; }
    lobbyUi.destroy(!!keepSocket);
    lobbyUi = keepSocket ? null : null;
    if (!keepSocket) lobbyUi = null;
    // destroy() already removes the root. Always hide the host unless we
    // only wanted to hide — for keepSocket we still unmount the UI.
    host.classList.remove('on');
    host.innerHTML = '';
    lobbyUi = null;
  }

  function hideLobbyKeepSocket() {
    if (lobbyUi && lobbyUi.hide) lobbyUi.hide();
    host.classList.remove('on');
  }

  function teardown() {
    mpTickFn = null;
    removeCountdown();
    if (mpSession) {
      try { mpSession.disconnect(); } catch (e) { /* ignore */ }
      mpSession = null;
    }
    closeLobby(false);
  }

  function attachToHandle(handle, mp) {
    if (!handle) return null;
    const engine = {
      createRemotePlayer: function (id) { return handle.createRemotePlayer(id); },
      get game() { return handle.game; },
      on: function (ev, fn) {
        if (ev !== 'tick') return function () {};
        mpTickFn = fn;
        return function () { if (mpTickFn === fn) mpTickFn = null; };
      }
    };
    const G = handle.game;
    if (G) G.playerModel = playerModel();
    const session = attachMultiplayer(engine, {
      mp: mp,
      profile: { name: playerName(), modelId: playerModel() },
      weaponDamage: function (i) {
        const w = api.RT && api.RT.WEAPON_DEFS && api.RT.WEAPON_DEFS[i];
        return (w && w.dmg) || 10;
      },
      weaponMeleeRange: function (i) {
        const w = api.RT && api.RT.WEAPON_DEFS && api.RT.WEAPON_DEFS[i];
        return (w && w.melee) ? (w.range || 1.15) : 0;
      },
      weaponSplash: function (i) {
        const w = api.RT && api.RT.WEAPON_DEFS && api.RT.WEAPON_DEFS[i];
        return !!(w && w.splash);
      },
      onFx: function (fx) {
        // 1.3.0: another player's rocket / grenade / blast. Visual only;
        // their client sends the damage as a 'hit'.
        const h = api.getPlayHandle && api.getPlayHandle();
        if (h && h.remoteFx) { try { h.remoteFx(fx); } catch (e) { console.warn('remoteFx', e); } }
      },
      onShot: function (shot) {
        const h = api.getPlayHandle && api.getPlayHandle();
        if (h && h.playRemoteShot) h.playRemoteShot(shot);
      },
      canDamage: canDamage,
      lineClear: function (x1, y1, x2, y2) {
        const h = api.getPlayHandle && api.getPlayHandle();
        return !(h && h.lineClear) || h.lineClear(x1, y1, x2, y2);
      },
      onMatch: function (m) {
        // Only the room host's clock counts; it already subtracted elapsed time.
        if (isHost || !m) return;
        if (m.remaining > 0) { phase = 'countdown'; setCountdown(m.remaining); return; }
        // 0 = fight is on. Show FIGHT! only if we were counting down; a late
        // joiner (or a repeat of the host's 0) just carries on.
        if (phase === 'countdown') setCountdown(0);
        else if (phase === 'waiting') fightAt = now() - 5000;
        phase = 'fight';
      },
      onHit: function (hit) {
        const h = api.getPlayHandle && api.getPlayHandle();
        const my = mp && mp.id;
        if (!h || !hit || !my || hit.targetId !== my) return;
        if (!canDamage()) return;          // countdown: no PvP damage yet
        if (h.damagePlayer) h.damagePlayer(hit.dmg || 10, hit.x, hit.y);
      }
    });
    mpSession = session;
    // 1.2.5: no automatic start. Everyone waits on a roster with a Ready
    // button. The host (room creator; if they leave, the next oldest player)
    // starts the 10 s countdown when all players (2+) are Ready, or on Start.
    // A late joiner gets the host's time left (countdown) or 0 (fight already
    // on, so they just spawn in). Everyone else waits for the host's number.
    if (session && session.enabled && mp) {
      curMp = mp;
      phase = 'waiting';
      const known = !isHost && mp.match;
      if (known) {
        const left = known.remaining - (now() - known.at) / 1000;
        phase = left > 0 ? 'countdown' : 'fight';
        if (left > 0) setCountdown(left); else fightAt = now() - 5000;    // late joiner after FIGHT: no banner
      }
      if (mp.on) {
        mp.on('join', function () { if (isHost && phase !== 'waiting') mp.sendMatch(countdownLeft()); waitKey = ''; });
        mp.on('leave', function (ev) {
          if (ev && ev.id === hostId) {          // host left: next oldest player takes over
            const order = mp.joinOrder || [];
            hostId = order[0] || mp.id;
            isHost = hostId === mp.id;
          }
          waitKey = '';
        });
        mp.on('ready', function () { waitKey = ''; });
      }
      const onKey = function (ev) {
        if (phase !== 'waiting' || (ev.target && /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName))) return;
        if (ev.code === 'KeyY') toggleReady();
        if (ev.code === 'KeyG') hostStart();
      };
      window.addEventListener('keydown', onKey);
      offKeys = function () { window.removeEventListener('keydown', onKey); };
      // Host repeats the time left every 2 s during the countdown, so a
      // phone that was busy loading the map re-syncs to the host's clock.
      let resendAt = 0;
      const innerTick = mpTickFn;
      mpTickFn = function (dt) {
        if (innerTick) innerTick(dt);
        if (isHost && phase === 'waiting') {
          const list = roster(mp);
          if (list.length >= 2 && readyCount(list) === list.length) startCountdown();
        }
        if (isHost && phase !== 'waiting' && mp.sendMatch && fightAt && now() >= resendAt && now() < fightAt + 2000) {
          resendAt = now() + 2000;
          mp.sendMatch(countdownLeft());
        }
        if (phase === 'countdown' && countdownLeft() <= 0) phase = 'fight';
        showWaiting();
        showCountdown();
      };
    }
    try { window.RETROENGINE_MP = session; } catch (e) { /* ignore */ }
    return session;
  }

  /* ---------- 1.3.0: rockets, grenades and blasts ----------
     The engine fires 'proj' / 'grenade' / 'boom' for the local player. We
     forward the visuals to the room, and for a blast we work out who is in
     range (with a wall check) and send them a 'hit' — shooter-authoritative,
     same as bullets, and never before FIGHT. */
  function engineEvent(ev, arg) {
    const mp = curMp || (mpSession && mpSession.mp);
    if (!mp || !arg || !mp.sendFx) return;
    if (ev === 'proj') { mp.sendFx({ t: 'p', kind: arg.kind, x: arg.x, y: arg.y, z: arg.z, dx: arg.dx, dy: arg.dy, dz: arg.dz }); return; }
    if (ev === 'grenade') { mp.sendFx({ t: 'g', x: arg.x, y: arg.y, z: arg.z, vx: arg.vx, vy: arg.vy, vz: arg.vz }); return; }
    if (ev !== 'boom') return;
    mp.sendFx({ t: 'b', x: arg.x, y: arg.y, z: arg.z, rad: arg.rad, src: arg.src });
    if (!canDamage() || !(arg.dmg > 0)) return;
    const h = api.getPlayHandle && api.getPlayHandle();
    const peers = mp.getPeers ? mp.getPeers() : [];
    for (let i = 0; i < peers.length; i++) {
      const p = peers[i];
      if (!p || !p.id || p.live === false) continue;
      const d = Math.hypot((p.x || 0) - arg.x, (p.y || 0) - arg.y);
      if (d >= arg.rad || Math.abs((p.z || 0) + 0.4 - arg.z) > arg.rad) continue;
      if (h && h.lineClear && !h.lineClear(arg.x, arg.y, p.x, p.y)) continue;   // walls block blasts
      mp.sendHit({ targetId: p.id, dmg: Math.round(arg.dmg * (1 - d / arg.rad * 0.7)) });
    }
  }

  async function startGameForRoom(welcome, profile, mp) {
    if (entering || mpSession) return;
    entering = true;
    if (profile && profile.modelId) setPlayerModel(profile.modelId);
    if (profile && profile.name) setPlayerName(profile.name);
    const socket = mp;
    hideLobbyKeepSocket();
    if (lobbyUi) {
      lobbyUi.destroy(true);
      lobbyUi = null;
      host.classList.remove('on');
      host.innerHTML = '';
    }
    // Opened Multiplayer from the in-game Play screen? Close that single-player
    // game first, so the room starts fresh on the room's map without bots.
    if (api.getPlayHandle && api.getPlayHandle() && api.stopPlaytest) api.stopPlaytest();
    const project = api.getProject();
    let override = null;
    let idx = 0;
    const rooms = (socket && socket.rooms) || (api.getRooms && api.getRooms()) || [];
    const resolved = await resolveRoomLevel(welcome, api, rooms);
    if (resolved && resolved.error) {
      if (api.toast) api.toast('Could not load that map: ' + (resolved.error && resolved.error.message ? resolved.error.message : resolved.error), 'bad');
      entering = false;
      return;
    }
    if (resolved && resolved.override) {
      override = resolved.override;
      idx = 0;
    } else {
      idx = (resolved && resolved.idx != null) ? resolved.idx : parseLevelIndex(project, welcome && welcome.level, welcome && welcome.levelName);
    }
    const level = override || (project && project.levels && project.levels[idx]) || null;
    const slot = (welcome && welcome.peers && welcome.peers.length) || 0;
    isHost = slot === 0;
    hostId = isHost ? (socket && socket.id) : (welcome.peers[0] && welcome.peers[0].id);
    const spawnIndex = pickSpawnIndex(welcome, level, mpSettings.spawnMode);
    const spawnPoint = mpSettings.spawnMode === 'shared' ? sharedSpawnPoint(level, slot) : null;
    const loadedId = (resolved && resolved.id) || (welcome && welcome.level) || null;
    const loadedName = (level && level.name) || (resolved && resolved.name) || (welcome && welcome.levelName) || null;
    // Wait two frames so the lobby click (mousedown/mouseup) finishes
    // before the play canvas is shown. Otherwise that same click can
    // hold-fire and drag-look, kicking the camera into the ceiling.
    function go() {
      try {
        try { window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch (e) { /* ignore */ }
        // Enemies are simulated locally and are not sent over the relay, so a
        // room full of clients would each see a different fight. Skip them in
        // multiplayer rooms; single-player playtest is unchanged.
        const extra = { autoPlay: true, spawnIndex: spawnIndex, skipEnemies: true, multiplayer: true };
        if (spawnPoint) extra.spawnPoint = spawnPoint;
        if (override) extra.levelOverride = override;
        let handle = api.getPlayHandle && api.getPlayHandle();
        if (!handle) {
          api.playtest(idx, extra);
          handle = api.getPlayHandle && api.getPlayHandle();
        } else {
          try { handle.loadLevel(idx, false); } catch (e) { /* ignore */ }
          try { handle.begin(); } catch (e) { /* ignore */ }
          if (spawnPoint && api.applySpawnPoint) api.applySpawnPoint(handle, spawnPoint);
          else if (api.applySpawnIndex) api.applySpawnIndex(handle, spawnIndex);
        }
        attachToHandle(handle, socket);
        const info = {
          id: loadedId,
          name: (handle && handle.game && handle.game.L && handle.game.L.name) || loadedName
        };
        try { if (mpSession) mpSession.level = info; window.RETROENGINE_MP_LEVEL = info; } catch (e) { /* ignore */ }
      } finally {
        entering = false;
      }
    }
    requestAnimationFrame(function () { requestAnimationFrame(go); });
  }

  function openLobby() {
    // If we're already in a match, just show a note? Re-open browse only
    // after leaving. Tear down a leftover hidden UI first.
    if (mpSession && api.getPlayHandle && api.getPlayHandle()) {
      if (api.toast) api.toast('Already in a match. Quit to the menu first.', 'warn');
      return;
    }
    closeLobby(false);

    const RT = api.RT;
    const project = api.getProject();
    const characters = characterList(RT);
    const levelsP = api.getPackLevels ? api.getPackLevels() : Promise.resolve([]);
    const starters = api.getStarterLevels ? api.getStarterLevels() : [];
    Promise.resolve(levelsP).then(function (pack) {
      const levels = levelList(project, pack || [], starters);
      host.classList.add('on');
      lobbyUi = mountLobby(host, {
      url: defaultMpUrl(),
      playerName: playerName(),
      playerModel: playerModel(),
      levels: levels,
      characters: characters,
      onCharacterChange: setPlayerModel,
      onNameChange: setPlayerName,
      onClose: function () { closeLobby(false); },
      onJoin: function (welcome, profile) {
        startGameForRoom(welcome, profile, lobbyUi && lobbyUi.mp);
      }
    });
    }).catch(function () {
      const levels = levelList(project, [], starters);
      host.classList.add('on');
      lobbyUi = mountLobby(host, {
        url: defaultMpUrl(),
        playerName: playerName(),
        playerModel: playerModel(),
        levels: levels,
        characters: characters,
        onCharacterChange: setPlayerModel,
        onNameChange: setPlayerName,
        onClose: function () { closeLobby(false); },
        onJoin: function (welcome, profile) {
          startGameForRoom(welcome, profile, lobbyUi && lobbyUi.mp);
        }
      });
    });
  }

  return {
    openLobby: openLobby,
    teardown: teardown,
    defaultMpUrl: defaultMpUrl,
    tick: function (dt) { if (mpTickFn) mpTickFn(dt); },
    engineEvent: engineEvent,
    get session() { return mpSession; },
    get spawnMode() { return mpSettings.spawnMode; },
    set spawnMode(v) { if (v === 'shared' || v === 'fixed' || v === 'random') mpSettings.spawnMode = v; },
    pickSpawnIndex: pickSpawnIndex,
    sharedSpawnPoint: sharedSpawnPoint,
    // Test hook: enter a room with an already-open socket (the lobby does this on Join).
    startGameForRoom: startGameForRoom,
    get countdownLeft() { return countdownLeft(); },
    get phase() { return phase; },
    get isHost() { return isHost; },
    roster: function () { return curMp ? roster(curMp) : []; },
    toggleReady: toggleReady,
    hostStart: hostStart,
    canDamage: canDamage,
    spawnList: spawnList,
    mpSettings: mpSettings,
    canonicalLevelId: canonicalLevelId,
    resolveRoomLevel: resolveRoomLevel,
    starterLevelSlug: starterLevelSlug
  };
}

export default { installMultiplayer, defaultMpUrl, mpSettings, pickSpawnIndex, sharedSpawnPoint, spawnList, canonicalLevelId, resolveRoomLevel, starterLevelSlug };
