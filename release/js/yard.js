/* DYSTOPIA release candidate — exterior yard.
   The factory interior (game.js) stays the campaign. This module hangs a
   compact yard on the south side of Floor G and cuts two real holes:
   a wide west loading dock and a narrower east personnel airlock.
   Both line up with the open centre of Server Hall G (rack rows start at |x|=24).
   Collision for the yard lives here so the factory's hard ±88/±83 bound
   can stay untouched for the legacy game. */
(function () {
  const RC = (window.RC = window.RC || {});
  const FALLBACK = {
    spawn: { x: 0, z: 126, yaw: 0 },
    walk: { minX: -48, maxX: 48, minZ: 90, maxZ: 156 },
    routes: [
      { id: 'dock', name: 'West loading dock', walkX: -12.5, mouth: { x0: -17, x1: -8, z0: 78, z1: 93 }, inner: { x0: -17, x1: -8, z0: 46.15, z1: 47.95 }, guard: { x: -12.5, z: 60 }, guardName: 'Dock Warden' },
      { id: 'airlock', name: 'East personnel airlock', walkX: 14, mouth: { x0: 11.2, x1: 16.8, z0: 78, z1: 93 }, inner: { x0: 11.2, x1: 16.8, z0: 46.15, z1: 47.95 }, guard: { x: 14, z: 60 }, guardName: 'Airlock Warden' }
    ],
    fence: { minX: -46, maxX: 46, minZ: 94, maxZ: 150, height: 3.15, postEvery: 4, gate: { side: 'maxZ', cx: 0, half: 3.2 } },
    props: [],
    tiles: null
  };

  const yard = {
    layout: FALLBACK,
    group: null,
    blockers: [],
    built: false,
    upgraded: false,
    lights: []
  };

  function layout() { return yard.layout; }

  function inRect(x, z, r, a) {
    return x + (r || 0) > a.x0 && x - (r || 0) < a.x1 && z > a.z0 && z < a.z1;
  }

  function mouths() {
    const out = [];
    (layout().routes || []).forEach((route) => { out.push(route.mouth, route.inner); });
    return out;
  }

  function inMouth(x, z, r) {
    r = r || 0;
    return mouths().some((a) => x > a.x0 - r && x < a.x1 + r && z > a.z0 && z < a.z1);
  }

  function inWalk(x, z, r) {
    const w = layout().walk;
    r = r || 0;
    return x > w.minX + r && x < w.maxX - r && z > w.minZ && z < w.maxZ - r;
  }

  /* True when the factory's hard bound must not apply. */
  function isExterior(x, z) {
    const inside = x >= -88 && x <= 88 && z >= -83 && z <= 83;
    if (inside && !inMouth(x, z, 0.2)) return false;
    return inWalk(x, z, 0) || inMouth(x, z, 0.2);
  }

  function boxHit(b, x, z, y, r) {
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) return false;
    if (y != null) {
      if (b.max.y <= y + 0.45) return false;
      if (b.min.y >= y + 1.85) return false;
    }
    return true;
  }

  function exteriorBlocked(x, z, y, r) {
    r = r == null ? 0.65 : r;
    if (!inWalk(x, z, 0) && !inMouth(x, z, r)) return true;
    for (const b of yard.blockers) if (boxHit(b, x, z, y, r)) return true;
    if (RC.fence && RC.fence.blocked(x, z, y, r)) return true;
    return false;
  }

  function ensureGroup() {
    if (yard.group) return yard.group;
    const g = new THREE.Group();
    g.name = 'rc-yard';
    scene.add(g);
    yard.group = g;
    return g;
  }

  function clearGroup() {
    if (!yard.group) return;
    while (yard.group.children.length) yard.group.remove(yard.group.children[0]);
    yard.blockers = [];
    yard.lights.forEach((L) => { scene.remove(L); });
    yard.lights = [];
  }

  function addGround() {
    const w = layout().walk;
    const geo = new THREE.PlaneGeometry((w.maxX - w.minX) + 28, (w.maxZ - w.minZ) + 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.92, metalness: 0.08 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((w.minX + w.maxX) / 2, 0.03, (w.minZ + w.maxZ) / 2 + 2);
    mesh.receiveShadow = true;
    yard.group.add(mesh);
  }

  function addSigns() {
    (layout().routes || []).forEach((route) => {
      const sign = makeSign(route.name.toUpperCase(), route.id === 'dock' ? 'FREIGHT LANE  ·  WIDE' : 'STAFF LANE  ·  NARROW', route.id === 'dock' ? '#f59e0b' : '#38bdf8');
      const x = route.walkX;
      sign.position.set(x, 3.4, 97.2);
      sign.rotation.y = Math.PI;
      yard.group.add(sign);
    });
    const gate = makeSign('PERIMETER GATE', 'LIVE UNTIL THE CRADLE FALLS', '#67e8f9');
    gate.position.set(0, 3.6, layout().fence.maxZ - 1.2);
    yard.group.add(gate);
    yard.gateSign = gate;
  }

  function makeSign(title, sub, accent) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#14110e'; g.fillRect(0, 0, 512, 160);
    g.strokeStyle = accent; g.lineWidth = 8; g.strokeRect(6, 6, 500, 148);
    g.fillStyle = accent; g.font = '700 42px sans-serif'; g.textAlign = 'center';
    g.fillText(title, 256, 68);
    g.fillStyle = '#e7e0d6'; g.font = '600 24px sans-serif';
    g.fillText(sub, 256, 112);
    const tex = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.3), new THREE.MeshBasicMaterial({ map: tex }));
    const back = m.clone(); back.rotation.y = Math.PI; back.position.z = -0.02;
    const root = new THREE.Group(); root.add(m, back);
    return root;
  }

  function addLight(x, z) {
    if (yard.lights.length >= (window.IS_COARSE ? 1 : 2)) return;
    const L = new THREE.PointLight(0xffc48a, window.IS_COARSE ? 0.7 : 1.15, 26, 1.4);
    L.position.set(x, 6.5, z);
    scene.add(L);
    yard.lights.push(L);
  }

  function buildShell() {
    ensureGroup();
    clearGroup();
    addGround();
    addSigns();
    addLight(-12.5, 104);
    addLight(14, 104);
    /* Stand-ins first so a slow GLB never leaves the lane without cover or the vista empty. */
    (layout().props || []).forEach((spec) => {
      const placed = RC.kit.place(yard.group, spec);
      if (placed && spec.block && !spec.vista) yard.blockers.push(placed.box);
    });
    RC.kit.tileRun(yard.group, layout().tiles);
    yard.built = true;
    yard.upgraded = false;
  }

  function upgradeVisuals() {
    if (!yard.built) return;
    buildShell();
    yard.upgraded = true;
    if (RC.fence) RC.fence.dress();
  }

  /* Split factory wall colliders and box meshes so the two mouths are real gaps. */
  function carve() {
    if ((STATE.floor || 0) !== 0) return { carved: 0 };
    const vols = mouths();
    let carved = 0;
    vols.forEach((vol) => {
      const next = [];
      colliders.forEach((c) => {
        if (c.minY !== undefined && c.maxY !== undefined && c.maxY < 1.2) { next.push(c); return; }
        const overlap = c.minX < vol.x1 - 0.2 && c.maxX > vol.x0 + 0.2 && c.minZ < vol.z1 - 0.02 && c.maxZ > vol.z0 + 0.02 && (c.maxY || 9) > 1.5;
        if (!overlap) { next.push(c); return; }
        carved++;
        if (c.minX < vol.x0 - 0.05) next.push(Object.assign({}, c, { maxX: Math.min(c.maxX, vol.x0) }));
        if (c.maxX > vol.x1 + 0.05) next.push(Object.assign({}, c, { minX: Math.max(c.minX, vol.x1) }));
      });
      colliders = next;
      const doomed = [];
      arenaGroup.updateMatrixWorld(true);
      arenaGroup.traverse((o) => {
        if (!o.isMesh || o.userData.rcSplit || !o.geometry || o.geometry.type !== 'BoxGeometry') return;
        const b = new THREE.Box3().setFromObject(o);
        if (b.max.y - b.min.y < 2) return;
        if (b.min.x < vol.x1 - 0.15 && b.max.x > vol.x0 + 0.15 && b.min.z < vol.z1 - 0.02 && b.max.z > vol.z0 + 0.02) doomed.push(o);
      });
      doomed.forEach((mesh) => { splitMeshX(mesh, vol); carved++; });
    });
    try { markDoors(); } catch (e) {}
    if (typeof buildNavGrid === 'function') try { buildNavGrid(); } catch (e) {}
    return { carved };
  }

  function splitMeshX(mesh, vol) {
    const b = new THREE.Box3().setFromObject(mesh);
    const parent = mesh.parent;
    const h = b.max.y - b.min.y, d = b.max.z - b.min.z;
    const y = (b.min.y + b.max.y) / 2, z = (b.min.z + b.max.z) / 2;
    const parts = [];
    if (b.min.x < vol.x0 - 0.08) parts.push([b.min.x, Math.min(b.max.x, vol.x0)]);
    if (b.max.x > vol.x1 + 0.08) parts.push([Math.max(b.min.x, vol.x1), b.max.x]);
    parts.forEach(([x0, x1]) => {
      const w = x1 - x0;
      if (w < 0.2) return;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mesh.material);
      m.position.set((x0 + x1) / 2, y, z);
      m.castShadow = mesh.castShadow;
      m.receiveShadow = mesh.receiveShadow;
      m.userData.rcSplit = true;
      parent.add(m);
    });
    parent.remove(mesh);
    if (mesh.geometry && !mesh.geometry.userData.shared) mesh.geometry.dispose();
  }

  function markDoors() {
    (layout().routes || []).forEach((route) => {
      if (typeof addSign !== 'function') return;
      const accent = route.id === 'dock' ? '#f59e0b' : '#38bdf8';
      addSign(route.walkX, 5.2, 89.4, Math.PI, route.id === 'dock' ? 'LOADING DOCK' : 'PERSONNEL AIRLOCK', route.id === 'dock' ? 'WEST ROUTE  ·  FREIGHT' : 'EAST ROUTE  ·  STAFF', accent, 5.5);
    });
  }

  function spawnPlayer() {
    const s = layout().spawn;
    STATE.player.x = s.x; STATE.player.y = 0; STATE.player.z = s.z;
    STATE.player.yaw = s.yaw || 0; STATE.player.pitch = -0.08; STATE.player.vy = 0;
  }

  function spawnGuards() {
    if ((STATE.floor || 0) !== 0) return;
    if (typeof spawnBotFromArchetype !== 'function') return;
    (layout().routes || []).forEach((route) => {
      if (BOTS.some((b) => b.id === 'rc-' + route.id)) return;
      try {
        spawnBotFromArchetype({
          id: 'rc-' + route.id,
          name: route.guardName || route.name,
          role: 'human_guard',
          aiRole: 'suppressor',
          squad: 3,
          x: route.guard.x,
          y: 0,
          z: route.guard.z,
          maxHealth: 90,
          patrolType: 'ground',
          armorColor: 0x3f2a1a,
          tint: route.id === 'dock' ? 0xf59e0b : 0x38bdf8
        }, STATE.botSkill || 1);
      } catch (e) { console.warn('rc guard', e); }
    });
  }

  function loadLayout() {
    return fetch('release/maps/yard.json').then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then((data) => {
      yard.layout = data;
      return data;
    }).catch((e) => { console.warn('yard.json', e); yard.layout = FALLBACK; return FALLBACK; });
  }

  /* Sample a route from the yard spawn through the mouth and into the hall. */
  function probeRoute(route, step) {
    step = step || 1.5;
    const x = route.walkX;
    const blockedAt = [];
    for (let z = layout().spawn.z; z >= 42; z -= step) {
      const ext = isExterior(x, z);
      let hit = false;
      if (ext) hit = exteriorBlocked(x, z, 0, 0.65);
      else if (typeof playerCollidesAt === 'function') {
        /* probe uses the raw factory test only outside our wrapper's exterior branch */
        hit = RC._playerCollidesAt ? RC._playerCollidesAt(x, z, 0) : playerCollidesAt(x, z, 0);
      }
      if (hit) blockedAt.push(+z.toFixed(1));
    }
    return { id: route.id, x, clear: blockedAt.length === 0, blockedAt: blockedAt.slice(0, 8) };
  }

  RC.yard = yard;
  RC.world = { isExterior, exteriorBlocked, inMouth, inWalk };
  RC.yard.buildShell = buildShell;
  RC.yard.upgradeVisuals = upgradeVisuals;
  RC.yard.carve = carve;
  RC.yard.spawnPlayer = spawnPlayer;
  RC.yard.spawnGuards = spawnGuards;
  RC.yard.loadLayout = loadLayout;
  RC.yard.probeRoute = probeRoute;
  RC.yard.layoutRef = layout;
})();
