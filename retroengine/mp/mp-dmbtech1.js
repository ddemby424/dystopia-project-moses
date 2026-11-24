/*
 * mp-dmbtech1.js — thin adapter between mp.js and DMB Tech 1.
 *
 * This file is the only place that knows about both sides:
 *
 *   engine.game           →  G.px, G.py, G.pz, G.yaw, G.playerModel, …
 *   engine.on('tick')     →  once per frame, we send our pose and
 *                            slide the other players to their new spots
 *   RT.createRemotePlayer(modelId)
 *                         →  returns an object with setPose(x,y,z,yaw,anim)
 *                            (and optionally dispose/destroy)
 *
 * FEATURE DETECT: if createRemotePlayer is not on the runtime yet,
 * attachMultiplayer() returns a harmless no-op. That way this file can
 * ship before (or alongside) the 1.2 player-model work, and nothing
 * crashes if the function is missing.
 *
 * Hook it up later, after a map is loaded (do not do this until Darcy
 * says to publish — this folder is local-only):
 *
 *   import { attachMultiplayer } from './mp-dmbtech1.js';
 *   const session = attachMultiplayer(engine, {
 *     url: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws',
 *     room: 'e1m1',
 *     profile: { name: 'Darcy', modelId: engine.game.playerModel }
 *   });
 *   // later:
 *   session.disconnect();
 */

import { connect } from './mp.js';

function findCreate(engine) {
  if (!engine) return null;
  // The 1.2 runtime is expected to hang this off the runtime object
  // (engine.runtime.createRemotePlayer) or, in some stubs, off engine itself.
  const candidates = [
    engine.runtime,
    engine.RT,
    engine.handle && engine.handle.runtime,
    engine
  ];
  for (let i = 0; i < candidates.length; i++) {
    const obj = candidates[i];
    if (obj && typeof obj.createRemotePlayer === 'function') {
      return function (modelId) { return obj.createRemotePlayer(modelId); };
    }
  }
  return null;
}

function findGame(engine) {
  if (!engine) return null;
  return engine.game
    || (engine.handle && engine.handle.game)
    || null;
}

/**
 * Wire mp.js to a DMB Tech 1 engine instance.
 * Returns { enabled, mp, remotes, tick, disconnect }.
 * When the engine has no createRemotePlayer, enabled is false and
 * every method is a no-op.
 */
export function attachMultiplayer(engine, opts) {
  opts = opts || {};
  const create = findCreate(engine);

  if (!create) {
    // Feature detect miss: stay silent aside from a one-time flag.
    // Nothing to disconnect, no remotes, no socket.
    const noop = function () {};
    return {
      enabled: false,
      mp: null,
      remotes: new Map(),
      tick: noop,
      disconnect: noop
    };
  }

  const url = opts.url;
  const room = opts.room || 'lobby';
  const profile = opts.profile || {};
  // Reuse a lobby connection when one is already open, so joining a room
  // doesn't create a second socket for the same player.
  const mp = opts.mp || connect(url, room, profile, opts);
  const remotes = new Map();          // playerId → remote player object

  function destroyRemote(id) {
    const rp = remotes.get(id);
    if (!rp) return;
    try {
      if (typeof rp.dispose === 'function') rp.dispose();
      else if (typeof rp.destroy === 'function') rp.destroy();
    } catch (e) { /* the mesh may already be gone */ }
    remotes.delete(id);
  }

  function ensureRemote(peer) {
    if (!peer || !peer.id) return null;
    if (remotes.has(peer.id)) return remotes.get(peer.id);
    let rp = null;
    try { rp = create(peer.modelId || profile.modelId || 'default'); }
    catch (e) { console.error('createRemotePlayer failed:', e); }
    if (rp) remotes.set(peer.id, rp);
    return rp;
  }

  // 'join' also fires for people who were already in the room (mp.js
  // turns the welcome list into join events), so one handler covers both.
  mp.on('join', function (peer) { ensureRemote(peer); });
  mp.on('leave', function (ev) { destroyRemote(ev.id); });
  // If we attached after welcome already arrived (lobby → play), seed
  // remotes for people who are already in the room.
  (mp.getPeers ? mp.getPeers() : []).forEach(function (peer) { ensureRemote(peer); });
  mp.on('shot', function (shot) { if (typeof opts.onShot === 'function') opts.onShot(shot); });
  mp.on('hit',  function (hit)  { if (typeof opts.onHit  === 'function') opts.onHit(hit); });

  let prevCd = 0;    // previous weapon cooldown, used to spot a new shot

  function onTick() {
    const G = findGame(engine);
    if (G) {
      const vx = G.vx || 0, vy = G.vy || 0;
      const speed = Math.hypot(vx, vy);
      // DMB Tech 1 clips are named idle / move / shoot / death (not walk/run).
      let anim = 'idle';
      if ((G.hp != null && G.hp <= 0) || G.dead) anim = 'death';
      else if (G.cd > prevCd + 0.01) anim = 'shoot';
      else if (speed > 0.4) anim = 'move';

      // A rising cooldown means the local player just fired. Tell the
      // room. (We can't wrap engine.shoot(), because the game loop also
      // fires from mouse / keyboard inside DMB Tech 1 itself.)
      if (G.cd > prevCd + 0.01) {
        mp.sendShot({ x: G.px, y: G.py, z: G.pz, yaw: G.yaw, weapon: G.cur });
      }
      prevCd = G.cd || 0;

      mp.setState({
        x: G.px, y: G.py, z: G.pz, yaw: G.yaw,
        anim: anim,
        modelId: G.playerModel || profile.modelId || 'default'
      });
    }

    // Blend remote poses, then push them onto the 3D models.
    mp.tick();
    remotes.forEach(function (rp, id) {
      const p = mp.getPeer(id);
      if (p && rp && typeof rp.setPose === 'function') {
        rp.setPose(p.x, p.y, p.z, p.yaw, p.anim);
      }
    });
  }

  // Prefer the engine's own tick event (fires every frame while playing).
  // If that isn't available (tests, or an older engine), the caller can
  // call session.tick() themselves. We do NOT start a rAF loop in Node,
  // so tests won't hang.
  let offTick = null;
  if (engine && typeof engine.on === 'function') {
    offTick = engine.on('tick', onTick);
  }

  function disconnect() {
    if (typeof offTick === 'function') {
      try { offTick(); } catch (e) { /* ignore */ }
      offTick = null;
    }
    Array.from(remotes.keys()).forEach(destroyRemote);
    mp.disconnect();
  }

  return {
    enabled: true,
    mp: mp,
    remotes: remotes,
    tick: onTick,
    disconnect: disconnect
  };
}

export default { attachMultiplayer };
