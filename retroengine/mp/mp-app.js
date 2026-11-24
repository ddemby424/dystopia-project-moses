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

// Multiplayer spawn. 'fixed' = join order (player 1 at spawn 1, player 2 at
// spawn 2, wrapping if the room is bigger than the pad list). Flip
// mpSettings.spawnMode to 'random' later to pick a pad at random on each join.
export const mpSettings = { spawnMode: 'fixed' };

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
      onShot: function (shot) {
        const h = api.getPlayHandle && api.getPlayHandle();
        if (h && h.playRemoteShot) h.playRemoteShot(shot);
      },
      onHit: function (hit) {
        const h = api.getPlayHandle && api.getPlayHandle();
        const my = mp && mp.id;
        if (!h || !hit || !my || hit.targetId !== my) return;
        if (h.damagePlayer) h.damagePlayer(hit.dmg || 10, hit.x, hit.y);
      }
    });
    mpSession = session;
    try { window.RETROENGINE_MP = session; } catch (e) { /* ignore */ }
    return session;
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
    const spawnIndex = pickSpawnIndex(welcome, level, mpSettings.spawnMode);
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
        const extra = { autoPlay: true, spawnIndex: spawnIndex, skipEnemies: true };
        if (override) extra.levelOverride = override;
        let handle = api.getPlayHandle && api.getPlayHandle();
        if (!handle) {
          api.playtest(idx, extra);
          handle = api.getPlayHandle && api.getPlayHandle();
        } else {
          try { handle.loadLevel(idx, false); } catch (e) { /* ignore */ }
          try { handle.begin(); } catch (e) { /* ignore */ }
          if (api.applySpawnIndex) api.applySpawnIndex(handle, spawnIndex);
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
    get session() { return mpSession; },
    get spawnMode() { return mpSettings.spawnMode; },
    set spawnMode(v) { if (v === 'fixed' || v === 'random') mpSettings.spawnMode = v; },
    pickSpawnIndex: pickSpawnIndex,
    spawnList: spawnList,
    mpSettings: mpSettings,
    canonicalLevelId: canonicalLevelId,
    resolveRoomLevel: resolveRoomLevel,
    starterLevelSlug: starterLevelSlug
  };
}

export default { installMultiplayer, defaultMpUrl, mpSettings, pickSpawnIndex, spawnList, canonicalLevelId, resolveRoomLevel, starterLevelSlug };
