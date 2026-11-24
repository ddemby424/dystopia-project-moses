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

function levelList(project) {
  const levels = (project && project.levels) || [];
  return levels.map(function (lv, i) {
    return { id: 'l' + i, name: lv.name || ('Level ' + (i + 1)) };
  });
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
      profile: { name: playerName(), modelId: playerModel() }
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
    const levelId = welcome && welcome.level;
    if (typeof levelId === 'string' && levelId.indexOf('pack-') === 0 && api.loadPackLevel) {
      try {
        override = await api.loadPackLevel(levelId.slice(5));
      } catch (e) {
        if (api.toast) api.toast('Could not load that trial map: ' + (e && e.message ? e.message : e), 'bad');
        entering = false;
        return;
      }
      idx = 0;
    } else {
      idx = parseLevelIndex(project, levelId, welcome && welcome.levelName);
    }
    const spawnIndex = (welcome && welcome.peers && welcome.peers.length) || 0;
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
    Promise.resolve(levelsP).then(function (pack) {
      const levels = levelList(project).concat(pack || []);
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
      const levels = levelList(project);
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
    get session() { return mpSession; }
  };
}

export default { installMultiplayer, defaultMpUrl };
