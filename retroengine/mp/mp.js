/*
 * mp.js — DMB Tech 1 multiplayer client. No dependencies.
 *
 * This is the "phone line" to the game server. If you've used a VB
 * Winsock control, the events map like this:
 *
 *   connect()          ≈  Winsock.Connect
 *   socket open        ≈  Winsock_Connect
 *   incoming message   ≈  Winsock_DataArrival
 *   send / setState    ≈  Winsock.SendData
 *   socket close       ≈  Winsock_Close
 *   disconnect()       ≈  Winsock.Close
 *
 * Usage (browser, as an ES module):
 *
 *   import { connect } from './mp.js';
 *   const mp = connect('ws://localhost:8080/ws', 'e1m1', { name: 'Darcy', modelId: 'ranger-blue' });
 *   mp.on('join',  peer => { ... });          // someone (or you, at start) is in the room
 *   mp.on('state', peer => { ... });          // raw update just arrived (also buffered)
 *   mp.on('leave', ({ id, reason }) => { ... });
 *   mp.on('shot',  shot => { ... });
 *   // Lobby (browse rooms without joining one):
 *   const mp = connect('ws://localhost:8080/ws', null, { name: 'Darcy' });
 *   mp.on('rooms', list => render(list));   // pushed whenever the list changes
 *   mp.listRooms();                        // ask for a fresh list (Refresh)
 *   mp.createRoom({ name: 'Night Shift', level: 'e1m1' });
 *   mp.joinRoom('r1');                     // or a code from the list
 *   // every animation frame (once you're in a game):
 *   mp.setState({ x, y, z, yaw, anim, modelId });  // sent ~20 Hz, and only if it changed
 *   mp.tick();                                     // interpolate remotes (~100 ms buffer)
 *   for (const p of mp.getPeers()) draw(p);        // p.x/y/z/yaw are smoothed
 *   mp.disconnect();
 *
 * In Node tests, pass { WebSocket } from the `ws` library as an option,
 * because Node has no built-in WebSocket until very recent versions.
 */

const DEFAULT_SEND_HZ = 20;       // how often we may send our pose (was 15)
const DEFAULT_INTERP_MS = 100;    // draw remotes this far in the past (smooth)
const POS_EPS = 0.001;            // ignore tiny position jitters
const ANG_EPS = 0.001;            // ignore tiny yaw jitters
const MAX_BACKOFF_MS = 10000;     // cap on reconnect wait
const START_BACKOFF_MS = 500;
// Doom-style remotes: a remote player is a real thing on the map, not a
// free-floating model. If two updates are far apart (a respawn, a long gap
// while they stood still) or the straight line between them crosses a wall,
// we snap to the newer spot instead of sliding through the wall.
const SNAP_DIST = 1.5;            // cells
// The public relay only forwards known message types (state/shot/hit), so
// the match countdown rides on a 'shot' with weapon 'match' and the seconds
// left in yaw. Receivers never treat it as a real shot.
const MATCH_TAG = 'match';
// Pre-match Ready rides the same way: weapon 'ready', yaw 1 = ready, 0 = not.
const READY_TAG = 'ready';
// 1.3.0 effects (rockets, grenades, blasts) ride the same way: weapon starts
// with 'fx:' and carries the effect; x/y/z is where it starts.
//   fx:p:<kind>:<dx>:<dy>:<dz>   projectile launched (rocket / LAW)
//   fx:g:<vx>:<vy>:<vz>          grenade thrown
//   fx:b:<radius>:<src>          blast went off (src r=rocket g=grenade b=barrel)
//   fx:w:<tx>:<ty>:<tz>         minotaur warp (origin in x,y,z; dest in tx,ty,tz)
//   fx:u                         minotaur awakens
//   fx:s:<hp>:<yaw>:<state>      minotaur pose (host, throttled)
//   fx:e:<enemy index>:<dmg>     1.6.3 co-op: my hit on enemy #i (your copy of that enemy takes it too)
const FX_TAG = 'fx:';

function decodeFx(msg) {
  const parts = String(msg.weapon).slice(FX_TAG.length).split(':');
  const n = i => Number(parts[i]) || 0;
  const base = { id: msg.id, x: Number(msg.x) || 0, y: Number(msg.y) || 0, z: Number(msg.z) || 0, t: parts[0] };
  if (parts[0] === 'p') return Object.assign(base, { kind: parts[1] || 'rocket', dx: n(2), dy: n(3), dz: n(4) });
  if (parts[0] === 'g') return Object.assign(base, { vx: n(1), vy: n(2), vz: n(3) });
  if (parts[0] === 'b') return Object.assign(base, { rad: n(1) || 2, src: parts[2] || 'r' });
  if (parts[0] === 'w') return Object.assign(base, { tx: n(1), ty: n(2), tz: n(3) });
  if (parts[0] === 'u') return base;
  if (parts[0] === 's') return Object.assign(base, { hp: n(1), yaw: n(2), state: parts[3] || '' });
  if (parts[0] === 'e') return Object.assign(base, { i: n(1) | 0, dmg: n(2) });
  return null;
}

function nowMs() {
  // performance.now() is steadier than Date.now() in a browser (doesn't jump
  // if the system clock changes). Falls back to Date in Node.
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Walk the short way around the circle when blending yaw (so we don't
// spin the long way from 359° to 1°).
function lerpAngle(a, b, t) {
  let d = b - a;
  const TAU = Math.PI * 2;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return a + d * t;
}

function yawNear(a, b) {
  let d = b - a;
  const TAU = Math.PI * 2;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return Math.abs(d) < ANG_EPS;
}

function posesEqual(a, b) {
  if (!a || !b) return false;
  return Math.abs(a.x - b.x) < POS_EPS
    && Math.abs(a.y - b.y) < POS_EPS
    && Math.abs(a.z - b.z) < POS_EPS
    && yawNear(a.yaw, b.yaw)
    && a.anim === b.anim
    && a.modelId === b.modelId;
}

/**
 * Open a connection to the relay and join a room.
 *
 * @param {string} url     WebSocket URL, e.g. 'ws://localhost:8080/ws'
 * @param {string} room    Room code to join right away, or null/'' to only
 *                         browse the lobby. Pass a code to keep the old
 *                         "connect and jump in" behavior.
 * @param {object} profile { name, modelId, x, y, z, yaw, anim }
 * @param {object} options { WebSocket, sendHz, interpDelay, autoReconnect, lobby }
 * @returns a session object (see the methods at the bottom of this function)
 */
export function connect(url, room, profile, options) {
  if (!url) throw new Error('mp.connect: url is required');
  profile = profile || {};
  options = options || {};
  // Empty / null room means "just the lobby, please." options.lobby
  // forces a lobby subscription even if you also auto-join a room.
  let currentRoom = (room == null || room === '') ? null : String(room);
  let watchingLobby = options.lobby === true || currentRoom == null;
  let cachedRooms = [];        // last room list the server sent us
  let lastMatch = null;        // { remaining (s), at (ms) } from the room host
  const readyById = new Map(); // peer id -> true/false (pre-match Ready button)
  let myReady = false;
  let joinOrder = [];          // ids in the order they entered the room (host first)
  let lineClear = null;        // optional (x1,y1,x2,y2) => true when no wall is in between

  const WSImpl = options.WebSocket || (typeof WebSocket !== 'undefined' ? WebSocket : null);
  if (!WSImpl) throw new Error('mp.connect: no WebSocket implementation (pass options.WebSocket in Node)');

  const sendHz = options.sendHz || DEFAULT_SEND_HZ;
  const interpDelay = options.interpDelay != null ? options.interpDelay : DEFAULT_INTERP_MS;
  const autoReconnect = options.autoReconnect !== false;  // default on

  let ws = null;              // the current socket (null while disconnected)
  let myId = null;            // filled in by the server's "welcome" message
  let manualClose = false;    // true after disconnect() — do not reconnect
  let backoff = START_BACKOFF_MS;
  let retryTimer = null;
  let sendTimer = null;
  let lastSent = null;        // last pose we actually put on the wire
  let pending = null;         // latest pose waiting to be sent
  let dirty = false;

  // Remote players, keyed by server id. Each has a snapshot buffer used
  // to interpolate a smooth pose ~100 ms behind live.
  const peers = new Map();
  const listeners = Object.create(null);

  function emit(type, payload) {
    const list = listeners[type];
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      try { list[i](payload); } catch (e) { console.error('mp.js listener error:', e); }
    }
  }

  // Subscribe to an event. Returns an unsubscribe function.
  // Events: join, leave, state, shot, hit, welcome, rooms, hello, parted,
  //          disconnect, reconnect, error, open
  function on(type, fn) {
    if (typeof fn !== 'function') throw new Error('mp.on: handler must be a function');
    (listeners[type] = listeners[type] || []).push(fn);
    return function off() {
      listeners[type] = (listeners[type] || []).filter(function (h) { return h !== fn; });
    };
  }

  function upsertPeer(info) {
    let p = peers.get(info.id);
    if (!p) {
      p = {
        id: info.id,
        name: info.name || 'Player',
        modelId: info.modelId || 'default',
        x: info.x || 0, y: info.y || 0, z: info.z || 0,
        yaw: info.yaw || 0, anim: info.anim || 'idle',
        live: false,        // true once we have a real pose (join messages carry 0,0)
        buf: []
      };
      peers.set(info.id, p);
    } else {
      if (info.name) p.name = info.name;
      if (info.modelId) p.modelId = info.modelId;
    }
    return p;
  }

  function pushSnapshot(p, info, recvT) {
    // Poses are only sent while they change. After a pause (they stood
    // still), hold the old pose until one send-tick before this update, so
    // the blend starts now instead of half-jumping across the gap.
    const prev = p.buf.length ? p.buf[p.buf.length - 1] : null;
    const tickMs = 1000 / sendHz;
    if (prev && recvT - prev.t > tickMs * 4) {
      p.buf.push(Object.assign({}, prev, { t: recvT - tickMs }));
    }
    p.buf.push({
      t: recvT,
      x: Number(info.x) || 0,
      y: Number(info.y) || 0,
      z: Number(info.z) || 0,
      yaw: Number(info.yaw) || 0,
      anim: info.anim || p.anim || 'idle',
      modelId: info.modelId || p.modelId
    });
    // Keep about one second of history; older poses are useless.
    const cutoff = recvT - 1000;
    while (p.buf.length > 2 && p.buf[0].t < cutoff) p.buf.shift();
  }

  function handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : String(raw));
    } catch (e) { return; }
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'ping') {
      // App-level heartbeat. Reply right away so the server (and any
      // proxy in the middle, like Cloudflare) sees traffic.
      sendRaw({ type: 'pong', t: msg.t });
      return;
    }

    if (msg.type === 'welcome') {
      myId = msg.id;
      if (msg.room) currentRoom = msg.room;
      // Drop stale remotes from a previous life (after a reconnect the
      // room membership may have changed).
      peers.clear();
      lastMatch = null;
      readyById.clear();
      myReady = false;
      emit('welcome', msg);
      const list = msg.peers || [];
      joinOrder = list.map(function (q) { return q.id; }).concat([msg.id]);
      for (let i = 0; i < list.length; i++) {
        const p = upsertPeer(list[i]);
        if (list[i].x || list[i].y) p.live = true;
        pushSnapshot(p, list[i], nowMs());
        emit('join', p);
      }
      // Send our pose immediately so late joiners aren't invisible.
      dirty = true;
      flush();
      return;
    }

    if (msg.type === 'join') {
      if (msg.id && msg.id !== myId && joinOrder.indexOf(msg.id) < 0) joinOrder.push(msg.id);
      // Tell the newcomer whether we already pressed Ready.
      if (myReady) sendReady(true);
      const p = upsertPeer(msg);
      pushSnapshot(p, msg, nowMs());
      emit('join', p);
      return;
    }

    if (msg.type === 'leave') {
      peers.delete(msg.id);
      readyById.delete(msg.id);
      joinOrder = joinOrder.filter(function (id) { return id !== msg.id; });
      emit('leave', { id: msg.id, reason: msg.reason || 'disconnect' });
      return;
    }

    if (msg.type === 'state') {
      if (!msg.id || msg.id === myId) return;
      const p = upsertPeer(msg);
      if (!p.live) p.buf.length = 0;   // drop the 0,0 placeholder from 'join'
      p.live = true;
      pushSnapshot(p, msg, nowMs());
      emit('state', msg);
      return;
    }

    if (msg.type === 'hello') {
      // Lobby subscribe ack — we now have an id even without joining a room.
      myId = msg.id;
      emit('hello', msg);
      return;
    }

    if (msg.type === 'rooms') {
      if (msg.id) myId = msg.id;
      cachedRooms = Array.isArray(msg.rooms) ? msg.rooms : [];
      emit('rooms', cachedRooms);
      return;
    }

    if (msg.type === 'parted') {
      currentRoom = null;
      peers.clear();
      emit('parted', msg);
      return;
    }

    if (msg.type === 'shot') {
      if (msg.weapon === READY_TAG) {
        readyById.set(msg.id, !!msg.yaw);
        emit('ready', { id: msg.id, ready: !!msg.yaw });
        return;
      }
      if (msg.weapon === MATCH_TAG) {
        lastMatch = { remaining: Number(msg.yaw) || 0, at: nowMs(), from: msg.id };
        emit('match', lastMatch);
        return;
      }
      if (typeof msg.weapon === 'string' && msg.weapon.indexOf(FX_TAG) === 0) {
        const fx = decodeFx(msg);
        if (fx) emit('fx', fx);
        return;
      }
      emit('shot', msg);
      return;
    }
    if (msg.type === 'hit')  { emit('hit', msg);  return; }
    if (msg.type === 'error') { emit('error', msg); return; }
    if (msg.type === 'pong')  { emit('pong', msg); return; }
  }

  function sendRaw(obj) {
    if (!ws || ws.readyState !== 1 /* OPEN */) return false;
    try { ws.send(JSON.stringify(obj)); return true; }
    catch (e) { return false; }
  }

  // If the pose changed since last time, put a "state" message on the wire.
  function flush() {
    if (!dirty || !pending) return false;
    if (!ws || ws.readyState !== 1 || !myId) return false;
    if (posesEqual(pending, lastSent)) { dirty = false; return false; }
    const ok = sendRaw({
      type: 'state',
      x: pending.x, y: pending.y, z: pending.z, yaw: pending.yaw,
      anim: pending.anim, modelId: pending.modelId
    });
    if (ok) {
      lastSent = Object.assign({}, pending);
      dirty = false;
    }
    return ok;
  }

  function bindSocket(socket) {
    // Browser sockets use addEventListener; the Node `ws` library uses .on().
    // The message shape also differs slightly, so we normalize to a string.
    function onOpen() {
      backoff = START_BACKOFF_MS;          // it worked — reset the wait
      emit('open', { url: url, room: currentRoom });
      // Re-subscribe / re-join after a reconnect, same as the first time.
      if (watchingLobby) sendRaw({ type: 'lobby' });
      if (currentRoom) sendJoin(currentRoom);
    }
    function onMessage(ev) {
      const data = (ev && ev.data !== undefined) ? ev.data : ev;
      handleMessage(data);
    }
    function onClose(ev) {
      const code = ev && ev.code;
      const reason = (ev && ev.reason) || 'closed';
      myId = null;
      emit('disconnect', { code: code, reason: reason, manual: manualClose });
      ws = null;
      scheduleReconnect();
    }
    function onError() {
      // The close event always follows an error; we reconnect from onClose.
      emit('error', { code: 'socket', message: 'WebSocket error' });
    }

    if (typeof socket.addEventListener === 'function') {
      socket.addEventListener('open', onOpen);
      socket.addEventListener('message', onMessage);
      socket.addEventListener('close', onClose);
      socket.addEventListener('error', onError);
    } else if (typeof socket.on === 'function') {
      socket.on('open', onOpen);
      socket.on('message', onMessage);
      socket.on('close', onClose);
      socket.on('error', onError);
    } else {
      socket.onopen = onOpen;
      socket.onmessage = onMessage;
      socket.onclose = onClose;
      socket.onerror = onError;
    }
  }

  function open() {
    if (manualClose) return;
    try { ws = new WSImpl(url); }
    catch (e) {
      emit('error', { code: 'open', message: String(e && e.message || e) });
      scheduleReconnect();
      return;
    }
    bindSocket(ws);
  }

  function scheduleReconnect() {
    if (manualClose || !autoReconnect) return;
    if (retryTimer) return;                 // already waiting
    const wait = backoff + Math.floor(Math.random() * 200);  // tiny jitter
    backoff = Math.min(MAX_BACKOFF_MS, backoff * 2);
    retryTimer = setTimeout(function () {
      retryTimer = null;
      emit('reconnect', { wait: wait });
      open();
    }, wait);
  }

  function sendJoin(roomCode) {
    return sendRaw({
      type: 'join',
      room: roomCode,
      name: profile.name,
      modelId: profile.modelId,
      x: profile.x || 0,
      y: profile.y || 0,
      z: profile.z || 0,
      yaw: profile.yaw || 0,
      anim: profile.anim || 'idle'
    });
  }

  // --- public methods -------------------------------------------------

  // Ask the server for the current public room list, and keep listening
  // for live updates. Returns the last list we already have (maybe empty
  // until the first 'rooms' event arrives). Like hitting Refresh.
  function listRooms() {
    watchingLobby = true;
    sendRaw({ type: 'lobby' });
    return cachedRooms.slice();
  }

  // Start a new room and join it as the host. The server picks a short
  // code and sends a normal 'welcome' back (with room = that code).
  // Set private: true to hide it from the lobby (friends join by code).
  function createRoom(opts) {
    opts = opts || {};
    if (opts.modelId) profile.modelId = opts.modelId;
    if (opts.playerName) profile.name = opts.playerName;
    return sendRaw({
      type: 'create',
      name: opts.name,
      level: opts.level,
      levelName: opts.levelName,
      private: !!opts.private,
      max: opts.max,
      playerName: profile.name,
      modelId: profile.modelId
    });
  }

  // Walk into an existing room (or start one by code, same as the old
  // auto-join path). extra can override name / modelId for this join.
  function joinRoom(roomCode, extra) {
    extra = extra || {};
    if (!roomCode) return false;
    if (extra.name) profile.name = extra.name;
    if (extra.modelId) profile.modelId = extra.modelId;
    currentRoom = String(roomCode);
    return sendJoin(currentRoom);
  }

  // Leave the current room but stay connected, so the lobby is still live.
  function leaveRoom() {
    currentRoom = null;
    peers.clear();
    return sendRaw({ type: 'leave' });
  }

  // Record our latest pose. A 20 Hz timer will send it if it changed.
  function setState(pose) {
    pending = {
      x: Number(pose.x) || 0,
      y: Number(pose.y) || 0,
      z: Number(pose.z) || 0,
      yaw: Number(pose.yaw) || 0,
      anim: pose.anim || 'idle',
      modelId: pose.modelId || profile.modelId || 'default'
    };
    dirty = true;
  }

  function sendShot(shot) {
    shot = shot || {};
    return sendRaw({
      type: 'shot',
      x: Number(shot.x) || 0,
      y: Number(shot.y) || 0,
      z: Number(shot.z) || 0,
      yaw: Number(shot.yaw) || 0,
      weapon: shot.weapon
    });
  }

  // Room host: tell everyone how many seconds are left before damage is on.
  function sendMatch(remainingSec) {
    return sendRaw({ type: 'shot', x: 0, y: 0, z: 0, yaw: Math.max(0, Number(remainingSec) || 0), weapon: MATCH_TAG });
  }

  // Pre-match Ready toggle (remembered so late joiners get it too).
  function sendReady(ready) {
    myReady = !!ready;
    return sendRaw({ type: 'shot', x: 0, y: 0, z: 0, yaw: myReady ? 1 : 0, weapon: READY_TAG });
  }

  // 1.3.0: send a visual effect to everyone else in the room.
  function sendFx(fx) {
    if (!fx || !fx.t) return false;
    const r = v => Math.round((Number(v) || 0) * 1000) / 1000;
    let tag;
    if (fx.t === 'p') tag = 'p:' + String(fx.kind || 'rocket').replace(/[^a-z0-9_]/gi, '') + ':' + r(fx.dx) + ':' + r(fx.dy) + ':' + r(fx.dz);
    else if (fx.t === 'g') tag = 'g:' + r(fx.vx) + ':' + r(fx.vy) + ':' + r(fx.vz);
    else if (fx.t === 'b') tag = 'b:' + r(fx.rad) + ':' + String(fx.src || 'r').charAt(0);
    else if (fx.t === 'w') tag = 'w:' + r(fx.tx) + ':' + r(fx.ty) + ':' + r(fx.tz);
    else if (fx.t === 'u') tag = 'u';
    else if (fx.t === 'e') tag = 'e:' + (fx.i | 0) + ':' + r(fx.dmg);
    else if (fx.t === 's') tag = 's:' + r(fx.hp) + ':' + r(fx.yaw) + ':' + String(fx.state || '').replace(/[^a-z_]/g, '').slice(0, 12);
    else return false;
    return sendRaw({ type: 'shot', x: r(fx.x), y: r(fx.y), z: r(fx.z), yaw: 0, weapon: FX_TAG + tag });
  }

  function sendHit(hit) {
    hit = hit || {};
    if (!hit.targetId) return false;
    return sendRaw({ type: 'hit', targetId: String(hit.targetId), dmg: Number(hit.dmg) || 0 });
  }

  // Call once per frame (or from the engine's tick). Walks each remote
  // player's snapshot buffer and fills in a smoothed x/y/z/yaw as they
  // looked INTERP_MS ago. That delay is why other players don't "teleport"
  // between the 15 updates we get each second.
  function tick(now) {
    if (now == null) now = nowMs();
    const renderAt = now - interpDelay;
    peers.forEach(function (p) {
      const buf = p.buf;
      if (!buf.length) return;
      if (buf.length === 1 || renderAt <= buf[0].t) {
        applySnap(p, buf[0]);
        return;
      }
      const last = buf[buf.length - 1];
      if (renderAt >= last.t) {
        applySnap(p, last);
        return;
      }
      let i = 0;
      for (let k = 0; k < buf.length - 1; k++) {
        if (buf[k].t <= renderAt && buf[k + 1].t >= renderAt) { i = k; break; }
      }
      const a = buf[i], b = buf[i + 1];
      const far = Math.hypot(b.x - a.x, b.y - a.y) > SNAP_DIST;
      if (far || (lineClear && !lineClear(a.x, a.y, b.x, b.y))) { applySnap(p, b); return; }
      const t = (renderAt - a.t) / Math.max(1, b.t - a.t);
      p.x = lerp(a.x, b.x, t);
      p.y = lerp(a.y, b.y, t);
      p.z = lerp(a.z, b.z, t);
      p.yaw = lerpAngle(a.yaw, b.yaw, t);
      p.anim = (t < 0.5) ? a.anim : b.anim;
      p.modelId = b.modelId || p.modelId;
    });
  }

  function applySnap(p, s) {
    p.x = s.x; p.y = s.y; p.z = s.z; p.yaw = s.yaw;
    p.anim = s.anim; p.modelId = s.modelId || p.modelId;
  }

  function getPeer(id) { return peers.get(id) || null; }
  function getPeers() { return Array.from(peers.values()); }

  // Hang up on purpose. Won't reconnect until you call connect() again.
  function disconnect() {
    manualClose = true;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (sendTimer) { clearInterval(sendTimer); sendTimer = null; }
    // Say goodbye first so the room roster updates right away (the relay
    // otherwise notices a closed socket about 2 s later).
    if (currentRoom) sendRaw({ type: 'leave' });
    if (ws) {
      try { ws.close(1000, 'bye'); } catch (e) { /* ignore */ }
      ws = null;
    }
    peers.clear();
    myId = null;
  }

  // Send-loop: ~20 times a second, ship the pose if it changed.
  sendTimer = setInterval(flush, Math.round(1000 / sendHz));

  open();

  return {
    on: on,
    setState: setState,
    flush: flush,             // send now if dirty (useful in tests)
    sendShot: sendShot,
    sendHit: sendHit,
    sendMatch: sendMatch,
    sendReady: sendReady,
    sendFx: sendFx,
    isReady: function (id) { return (id == null || id === myId) ? myReady : !!readyById.get(id); },
    get joinOrder() { return joinOrder.slice(); },
    setLineClear: function (fn) { lineClear = (typeof fn === 'function') ? fn : null; },
    get match() { return lastMatch; },
    tick: tick,
    getPeer: getPeer,
    getPeers: getPeers,
    listRooms: listRooms,
    createRoom: createRoom,
    joinRoom: joinRoom,
    leaveRoom: leaveRoom,
    disconnect: disconnect,
    get id() { return myId; },
    get room() { return currentRoom; },
    get rooms() { return cachedRooms.slice(); },
    get connected() { return !!(ws && ws.readyState === 1 && myId); }
  };
}

export default { connect };
