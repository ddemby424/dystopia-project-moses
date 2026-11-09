/* DYSTOPIA release candidate — electrified perimeter.
   The fence is the campaign seal. It is solid and live until the win flag
   is set, then the south gate slides up and the current dies. Side spans
   stay solid so the exit is the gate, not a hole in the corner.
   Cost cap: two instanced rail meshes, one post mesh, at most a handful of
   recycled spark sprites, one quiet oscillator while the player is close. */
(function () {
  const RC = (window.RC = window.RC || {});
  const fence = {
    group: null,
    segs: [],
    gate: null,
    live: true,
    open: 0,
    hurtT: 0,
    buzz: null,
    sparks: [],
    warned: 0,
    dressed: false
  };

  function spec() {
    return (RC.yard && RC.yard.layoutRef && RC.yard.layoutRef().fence) || {
      minX: -46, maxX: 46, minZ: 94, maxZ: 150, height: 3.15, postEvery: 4, gate: { side: 'maxZ', cx: 0, half: 3.2 }
    };
  }

  function buildSegments() {
    const f = spec();
    const gaps = (RC.yard.layoutRef().routes || []).map((r) => ({ x0: r.mouth.x0 - 0.4, x1: r.mouth.x1 + 0.4 }));
    const gate = f.gate;
    const segs = [];
    const push = (x0, z0, x1, z1, kind) => {
      if (Math.hypot(x1 - x0, z1 - z0) < 0.4) return;
      segs.push({ x0, z0, x1, z1, kind });
    };
    /* north span, broken for the two factory mouths */
    let cursor = f.minX;
    const cuts = gaps.slice().sort((a, b) => a.x0 - b.x0);
    cuts.forEach((g) => {
      push(cursor, f.minZ, Math.max(cursor, g.x0), f.minZ, 'span');
      cursor = Math.max(cursor, g.x1);
    });
    push(cursor, f.minZ, f.maxX, f.minZ, 'span');
    push(f.minX, f.minZ, f.minX, f.maxZ, 'span');
    push(f.maxX, f.minZ, f.maxX, f.maxZ, 'span');
    push(f.minX, f.maxZ, gate.cx - gate.half, f.maxZ, 'span');
    push(gate.cx + gate.half, f.maxZ, f.maxX, f.maxZ, 'span');
    segs.push({ x0: gate.cx - gate.half, z0: f.maxZ, x1: gate.cx + gate.half, z1: f.maxZ, kind: 'gate' });
    return segs;
  }

  const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 1, 6);
  const railGeo = new THREE.BoxGeometry(1, 0.045, 0.045);
  let postMat, railMat, deadMat;

  function mats() {
    if (postMat) return;
    postMat = new THREE.MeshStandardMaterial({ color: 0x1c1916, metalness: 0.7, roughness: 0.4 });
    railMat = new THREE.MeshBasicMaterial({ color: 0x9ff6ff, transparent: true, opacity: 0.9 });
    deadMat = new THREE.MeshBasicMaterial({ color: 0x3d4a48, transparent: true, opacity: 0.45 });
  }

  function build() {
    mats();
    if (fence.group) scene.remove(fence.group);
    const g = new THREE.Group();
    g.name = 'rc-fence';
    fence.group = g;
    fence.segs = buildSegments();
    const f = spec();
    const posts = [];
    const rails = [];
    fence.segs.forEach((s) => {
      const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0);
      // Box rails are authored along local +X. three.js yaw sends +X to (cos y, -sin y).
      const ang = Math.atan2(-(s.z1 - s.z0), (s.x1 - s.x0) || 1e-6);
      const n = Math.max(1, Math.round(len / f.postEvery));
      /* The gate opening gets jambs only. A post in the middle of the span is what the camera used to walk into. */
      const steps = s.kind === 'gate' ? [0, 1] : null;
      if (steps) steps.forEach((u) => posts.push([s.x0 + (s.x1 - s.x0) * u, s.z0 + (s.z1 - s.z0) * u]));
      else for (let i = 0; i <= n; i++) posts.push([s.x0 + (s.x1 - s.x0) * (i / n), s.z0 + (s.z1 - s.z0) * (i / n)]);
      s.len = len; s.ang = ang; s.rails = [];
      for (let k = 0; k < 3; k++) rails.push({ s, k, y: 0.7 + k * 0.85 });
    });
    /* unique-ish posts */
    const key = (p) => p[0].toFixed(1) + ',' + p[1].toFixed(1);
    const seen = new Set();
    const uniq = posts.filter((p) => { const k = key(p); if (seen.has(k)) return false; seen.add(k); return true; });
    const pMesh = new THREE.InstancedMesh(postGeo, postMat, uniq.length);
    const M = new THREE.Matrix4();
    const P = new THREE.Vector3();
    const Q = new THREE.Quaternion();
    const S = new THREE.Vector3(1, f.height, 1);
    uniq.forEach((p, i) => { P.set(p[0], f.height / 2, p[1]); M.compose(P, Q, S); pMesh.setMatrixAt(i, M); });
    pMesh.instanceMatrix.needsUpdate = true;
    pMesh.castShadow = !window.IS_COARSE;
    g.add(pMesh);
    fence.postMesh = pMesh;

    const rMesh = new THREE.InstancedMesh(railGeo, railMat, rails.length);
    rails.forEach((r, i) => {
      const s = r.s;
      P.set((s.x0 + s.x1) / 2, r.y, (s.z0 + s.z1) / 2);
      Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.ang);
      S.set(s.len, 1, 1);
      M.compose(P, Q, S);
      rMesh.setMatrixAt(i, M);
      r.index = i;
      s.rails.push(r);
    });
    rMesh.instanceMatrix.needsUpdate = true;
    rMesh.frustumCulled = false;
    g.add(rMesh);
    fence.railMesh = rMesh;
    fence.railList = rails;
    fence.gateRailIdx = rails.map((r, i) => r.s.kind === 'gate' ? i : -1).filter((i) => i >= 0);

    const gateSeg = fence.segs.find((s) => s.kind === 'gate');
    const gate = new THREE.Group();
    fence.liveTex = gateTexture('LIVE', true);
    fence.deadTex = gateTexture('', false);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(gateSeg.len, f.height * 0.92, 0.12), new THREE.MeshStandardMaterial({ color: 0xd7fbff, map: fence.liveTex, emissive: 0x22d3ee, emissiveMap: fence.liveTex, emissiveIntensity: 1.1, metalness: 0.35, roughness: 0.45 }));
    bar.position.y = f.height * 0.46;
    gate.add(bar);
    gate.position.set((gateSeg.x0 + gateSeg.x1) / 2, 0, gateSeg.z0);
    g.add(gate);
    fence.gate = gate;
    fence.gateBar = bar;
    fence.gateBaseY = 0;

    for (let i = 0; i < (window.IS_COARSE ? 4 : 8); i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), new THREE.MeshBasicMaterial({ color: 0xe0fbff }));
      s.visible = false;
      g.add(s);
      fence.sparks.push({ m: s, life: 0 });
    }
    scene.add(g);
    applyLiveVisual();
  }

  function gateTexture(word, bright) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bright ? '#0b1c22' : '#121418';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = bright ? '#9ff6ff' : '#3a4450';
  g.lineWidth = 10;
  for (let i = -4; i < 10; i++) {
    g.beginPath();
    g.moveTo(-20, i * 28);
    g.lineTo(280, i * 28 + 70);
    g.stroke();
  }
  if (word) {
    g.fillStyle = bright ? '#e7fbff' : '#9fb0b8';
    g.font = '700 42px sans-serif';
    g.textAlign = 'center';
    g.fillText(word, 128, 148);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function setOpen(amount) {
    const f = spec();
    const lift = Math.max(0, Math.min(1, amount));
    fence.open = lift;
    const rise = lift * (f.height + 0.9);
    if (fence.gate) fence.gate.position.y = rise;
    if (fence.railMesh && fence.gateRailIdx) {
      const M = new THREE.Matrix4();
      const P = new THREE.Vector3();
      const Q = new THREE.Quaternion();
      const S = new THREE.Vector3();
      fence.gateRailIdx.forEach((i) => {
        const r = fence.railList[i];
        const s = r.s;
        P.set((s.x0 + s.x1) / 2, r.y + rise, (s.z0 + s.z1) / 2);
        Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.ang);
        S.set(s.len, 1, 1);
        M.compose(P, Q, S);
        fence.railMesh.setMatrixAt(i, M);
      });
      fence.railMesh.instanceMatrix.needsUpdate = true;
    }
  }

  function setLive(on) {
    fence.live = !!on;
    if (!fence.live) fence.hurtT = 0;
    applyLiveVisual();
    if (!fence.live && fence.buzz) fence.buzz.stop();
    if (RC.yard && RC.yard.setGateCaption) {
      RC.yard.setGateCaption(fence.live ? 'SOUTH GATE' : 'SOUTH GATE', fence.live ? 'SEALED UNTIL THE CRADLE FALLS' : 'PERIMETER CLEAR', fence.live ? '#67e8f9' : '#86efac');
    }
  }

  function applyLiveVisual() {
    if (!fence.railMesh) return;
    fence.railMesh.material = fence.live ? railMat : deadMat;
    if (fence.gateBar && fence.gateBar.material) {
      const tex = fence.live ? fence.liveTex : fence.deadTex;
      if (tex) { fence.gateBar.material.map = tex; fence.gateBar.material.emissiveMap = tex; }
      fence.gateBar.material.emissive.setHex(fence.live ? 0x22d3ee : 0x1a1e24);
      fence.gateBar.material.emissiveIntensity = fence.live ? 0.9 : 0.04;
      fence.gateBar.material.needsUpdate = true;
    }
  }

  function segDist(s, x, z) {
    const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
    const L2 = dx * dx + dz * dz || 1e-6;
    let t = ((x - s.x0) * dx + (z - s.z0) * dz) / L2;
    t = Math.max(0, Math.min(1, t));
    const px = s.x0 + dx * t, pz = s.z0 + dz * t;
    return { d: Math.hypot(x - px, z - pz), x: px, z: pz, t };
  }

  function blocked(x, z, y, r) {
    r = r == null ? 0.65 : r;
    const h = spec().height;
    if (y != null && y > h - 0.2) return false;
    for (const s of fence.segs) {
      if (s.kind === 'gate' && !fence.live && fence.open > 0.85) continue;
      if (segDist(s, x, z).d < r + 0.12) return true;
    }
    return false;
  }

  function nearest(x, z) {
    let best = null;
    fence.segs.forEach((s) => {
      const q = segDist(s, x, z);
      if (!best || q.d < best.d) best = Object.assign({ seg: s }, q);
    });
    return best;
  }

  function ensureBuzz() {
    if (fence.buzz || !window.SFX || !SFX.ctx) return;
    try {
      const ctx = SFX.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = 72;
      g.gain.value = 0;
      o.connect(g);
      g.connect(SFX.master || ctx.destination);
      o.start();
      fence.buzz = { o, g, ctx, stop() { g.gain.value = 0; } };
    } catch (e) {}
  }

  function buzzTo(vol) {
    ensureBuzz();
    if (!fence.buzz) return;
    const t = fence.buzz.ctx.currentTime;
    fence.buzz.g.gain.cancelScheduledValues(t);
    fence.buzz.g.gain.setTargetAtTime(fence.live ? vol : 0, t, 0.08);
  }

  function sparkAt(x, z) {
    const s = fence.sparks.find((sp) => sp.life <= 0);
    if (!s) return;
    s.life = 0.18;
    s.m.visible = true;
    s.m.position.set(x + (Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 1.8, z);
  }

  function hitPlayer(dt) {
    const P = STATE.player;
    const n = nearest(P.x, P.z);
    if (!n) return;
    const close = n.d < 1.35;
    if (fence.live && close) buzzTo(n.d < 0.9 ? 0.045 : 0.02);
    else buzzTo(0);
    if (!fence.live || n.d > 0.85) return;
    if (window.IS_COARSE) { if (Math.random() < dt * 4) sparkAt(n.x, n.z); }
    else if (Math.random() < dt * 10) sparkAt(n.x, n.z);
    fence.hurtT -= dt;
    if (fence.hurtT > 0) return;
    fence.hurtT = 0.55;
    const push = 1.4;
    const dx = P.x - n.x, dz = P.z - n.z;
    const L = Math.hypot(dx, dz) || 1;
    P.x += (dx / L) * push;
    P.z += (dz / L) * push;
    if (typeof damagePlayer === 'function' && STATE.running && !STATE.dying) damagePlayer(8, { name: 'Perimeter fence', x: n.x, z: n.z });
    STATE.screenShake = Math.max(STATE.screenShake || 0, 0.4);
    const now = performance.now();
    if (now - fence.warned > 2200 && typeof showBanner === 'function') {
      fence.warned = now;
      showBanner('FENCE LIVE', 'The perimeter is sealed until Cradle 09 falls. Find a door, not a hole.', 2200);
    }
  }

  function update(dt) {
    if (!fence.group) return;
    if (!fence.holdPose) {
      const target = fence.live ? 0 : 1;
      setOpen(fence.open + (target - fence.open) * Math.min(1, dt * 1.6));
    }
    if (fence.live && railMat) railMat.opacity = 0.55 + 0.4 * Math.abs(Math.sin(performance.now() * 0.012));
    if (STATE.running && !STATE.pausedForStudio) hitPlayer(dt);
    else buzzTo(0);
    fence.sparks.forEach((s) => {
      if (s.life <= 0) return;
      s.life -= dt;
      s.m.position.y += dt * 1.5;
      if (s.life <= 0) s.m.visible = false;
    });
    /* Once the gate is open, stepping through it starts (or replays) the epilogue. */
    if (!fence.live && fence.open > 0.8 && STATE.running && RC.victory && !RC.victory.open) {
      const g = fence.segs.find((s) => s.kind === 'gate');
      if (g && Math.abs(STATE.player.x - (g.x0 + g.x1) / 2) < g.len * 0.45 && STATE.player.z > g.z0 - 0.2 && STATE.player.z < g.z0 + 2.4) {
        if (!fence._gateLatch) { fence._gateLatch = true; RC.victory.play('gate'); }
      } else if (STATE.player.z < g.z0 - 1) fence._gateLatch = false;
    }
  }

  function dress() { fence.dressed = true; }

  /* Posts and the cold rails take a shared metal. Live rails stay the cyan warning. */
  function applyMetal(mat) {
    if (!mat) return;
    mats();
    postMat = mat;
    if (fence.postMesh) fence.postMesh.material = mat;
    deadMat = mat;
    if (fence.railMesh && !fence.live) fence.railMesh.material = deadMat;
  }
  fence.applyMetal = applyMetal;

  RC.fence = fence;
  RC.fence.build = build;
  RC.fence.setLive = setLive;
  RC.fence.setOpen = setOpen;
  RC.fence.blocked = blocked;
  RC.fence.update = update;
  RC.fence.dress = dress;
  RC.fence.nearest = nearest;
})();
