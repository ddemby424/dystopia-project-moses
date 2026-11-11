/* CC0 surfaces for release v2. Albedo is a 1K WebP.
   Touch devices skip normal maps, roughness maps, and the HDRI so the
   Fold does not compile the stack that dropped meshes on Adreno. */
(function () {
  const RC = (window.RC = window.RC || {});
  const REAL = 'release-next/assets/real/';
  const SURF = 'release-v2/assets/surf/';
  const touch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
  const SETS = {
    floor: { map: SURF + 'hall_floor.webp', normal: touch ? null : REAL + 'concrete_floor_worn_001_nor.webp', rough: null, rx: 18, ry: 16, roughness: 0.88, metalness: 0.05, color: 0xffffff, normalScale: 0.28 },
    asphalt: { map: SURF + 'yard_asphalt.webp', normal: null, rough: null, rx: 12, ry: 10, roughness: 0.94, metalness: 0.02, color: 0xffffff, normalScale: 0 },
    wall: { map: SURF + 'hall_wall.webp', normal: touch ? null : REAL + 'corrugated_iron_nor.webp', rough: null, rx: 12, ry: 8, roughness: 0.56, metalness: 0.48, color: 0xffffff, normalScale: 0.35 },
    ceiling: { map: SURF + 'hall_wall.webp', normal: null, rough: null, rx: 8, ry: 5, roughness: 0.9, metalness: 0.22, color: 0x5c5954, normalScale: 0 },
    siding: { map: REAL + 'siding.webp', normal: touch ? null : REAL + 'corrugated_iron_nor.webp', rough: null, rx: 2, ry: 1.5, roughness: 0.5, metalness: 0.55, color: 0xc5c2ba, normalScale: 0.45 },
    rust: { map: REAL + 'rust.webp', normal: null, rough: null, rx: 1, ry: 1, roughness: 0.64, metalness: 0.48, color: 0xffffff, normalScale: 0 },
    plate: { map: REAL + 'plate.webp', normal: touch ? null : REAL + 'metal_plate_02_nor.webp', rough: null, rx: 1, ry: 1, roughness: 0.46, metalness: 0.62, color: 0xd0ccc4, normalScale: 0.3 }
  };
  const tex = {};
  const mats = {};
  const realism = { ready: false, bytes: 0, failed: [], hdri: false, files: 0 };

  function prep(t, rx, ry, srgb) {
    t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    t.repeat.set(rx || 1, ry || 1);
    return t;
  }

  function loadOne(file) {
    const url = file;
    return new Promise((resolve) => {
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      }).then((blob) => {
        realism.bytes += blob.size;
        realism.files += 1;
        const imgUrl = URL.createObjectURL(blob);
        new THREE.TextureLoader().load(imgUrl, (t) => { URL.revokeObjectURL(imgUrl); resolve(t); }, undefined, () => resolve(null));
      }).catch(() => { realism.failed.push(url); resolve(null); });
    });
  }

  function makeMat(spec) {
    const map = spec.map && tex[spec.map] ? prep(tex[spec.map].clone(), spec.rx, spec.ry, true) : null;
    const normal = !touch && spec.normal && tex[spec.normal] ? prep(tex[spec.normal].clone(), spec.rx, spec.ry, false) : null;
    const rough = !touch && spec.rough && tex[spec.rough] ? prep(tex[spec.rough].clone(), spec.rx, spec.ry, false) : null;
    if (map) map.needsUpdate = true;
    if (normal) normal.needsUpdate = true;
    if (rough) rough.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({
      map: map || null,
      normalMap: normal || null,
      roughnessMap: rough || null,
      roughness: spec.roughness,
      metalness: spec.metalness,
      color: spec.color,
      envMapIntensity: spec.metalness > 0.4 ? 1.05 : 0.72
    });
    if (normal) m.normalScale = new THREE.Vector2(spec.normalScale, spec.normalScale);
    return m;
  }

  function loadHDR() {
    return new Promise((resolve) => {
      if (typeof THREE.RGBELoader !== 'function' || typeof renderer === 'undefined') { resolve(null); return; }
      if (touch) { resolve(null); return; }
      const url = REAL + 'workshop.hdr';
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      }).then((blob) => {
        realism.bytes += blob.size;
        realism.files += 1;
        const hdrUrl = URL.createObjectURL(blob);
        new THREE.RGBELoader().load(hdrUrl, (hdr) => {
          URL.revokeObjectURL(hdrUrl);
          hdr.mapping = THREE.EquirectangularReflectionMapping;
          const pm = new THREE.PMREMGenerator(renderer);
          const env = pm.fromEquirectangular(hdr).texture;
          scene.environment = env;
          if (window.vmScene) vmScene.environment = env;
          hdr.dispose();
          pm.dispose();
          realism.hdri = true;
          resolve(env);
        }, undefined, () => resolve(null));
      }).catch(() => { realism.failed.push(url); resolve(null); });
    });
  }

  function paint(mesh, material) {
    if (!mesh || !material || !mesh.isMesh) return;
    mesh.material = material;
  }

  function addCeiling() {
    if (!arenaGroup || arenaGroup.getObjectByName('rc-ceiling') || !mats.ceiling) return;
    const high = (STATE.floor || 0) === 0;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(176, 164), mats.ceiling);
    ceil.name = 'rc-ceiling';
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 34.2;
    ceil.receiveShadow = true;
    ceil.userData.rcSurface = 'ceiling';
    arenaGroup.add(ceil);
  }

  function dressArena() {
    if (!realism.ready || typeof arenaGroup === 'undefined') return;
    arenaGroup.traverse((o) => {
      if (!o.isMesh || o.userData.secretDoor || o.userData.textPlane || o.userData.signTwin || o.name === 'rc-ceiling' || o.name === 'rc-center-floor' || (o.userData && o.userData.rcSurface === 'center')) return;
      const surf = o.userData.rcSurface;
      if (surf === 'floor' && mats.floor) paint(o, mats.floor);
      else if (surf === 'wall' && mats.wall) paint(o, mats.wall);
      else if (surf === 'steel' && mats.plate) paint(o, mats.plate);
      else if (surf === 'secret' && mats.wall && o.material && !(o.material.userData && o.material.userData.secretReady)) {
        if (typeof secretDoorMaterial === 'function') o.material = secretDoorMaterial();
      }
    });
    try { addCeiling(); } catch (e) {}
    try { if (RC.v2 && RC.v2.dressArena) RC.v2.dressArena(); } catch (e) { console.warn('v2 arena', e); }
    (window.COLOSSI || []).forEach((C) => C.root && dressRig(C.root, 'heavy'));
    (window.DRONES || []).forEach((d) => { if (d.m && d.m.g) dressRig(d.m.g, 'drone'); });
    (window.BOTS || []).forEach((b) => b.rig && dressRig(b.rig.root, b.heavy ? 'heavy' : 'guard'));
  }

  function dressYard() {
    if (!realism.ready || !RC.yard || !RC.yard.group) return;
    RC.yard.group.traverse((o) => {
      if (!o.isMesh) return;
      const vista = o.parent && o.parent.userData && o.parent.userData.kit && o.parent.userData.kit.vista;
      if (o.name === 'rc-yard-ground' || o.name === 'rc-apron') {
        if (mats.asphalt) paint(o, mats.asphalt);
        return;
      }
      if (o.parent && o.parent.userData && o.parent.userData.repaint) return;
      if (vista && mats.siding) paint(o, mats.siding);
      else if (mats.rust) paint(o, mats.rust);
    });
    if (RC.fence && RC.fence.applyMetal && mats.plate) RC.fence.applyMetal(mats.plate);
    try { if (RC.v2 && RC.v2.dressYard) RC.v2.dressYard(); } catch (e) { console.warn('v2 yard', e); }
  }

  function tuneTextured(m) {
    if (!m || !m.isMeshStandardMaterial) return;
    m.envMapIntensity = Math.max(m.envMapIntensity || 0, 0.85);
    if ((m.metalness || 0) < 0.25) m.metalness = 0.42;
    if ((m.roughness || 1) > 0.85) m.roughness = 0.48;
    m.needsUpdate = true;
  }

  function dressRig(root, kind) {
    if (!root || !realism.ready) return;
    if (root.userData && root.userData.rcRobot && RC.rigs && RC.rigs.paint) {
      RC.rigs.paint(root, kind);
      return;
    }
    const src = kind === 'heavy' || kind === 'drone' ? mats.plate : mats.rust;
    if (!src) return;
    root.traverse((o) => {
      if (!o.isMesh || !o.material || o.isSprite || o.userData.rcGlow || o.userData.v2Boss) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      let changed = false;
      const next = list.map((m) => {
        if (!m) return m;
        if (m.map) { tuneTextured(m); return m; }
        if (!m.isMeshStandardMaterial) return m;
        if ((m.emissiveIntensity || 0) > 0.55) return m;
        changed = true;
        const clone = src.clone();
        if (m.color) clone.color.multiply(m.color);
        return clone;
      });
      if (changed) o.material = Array.isArray(o.material) ? next : next[0];
    });
  }

  function install() {
    if (typeof buildArenaMap === 'function' && !buildArenaMap.__real) {
      const prev = buildArenaMap;
      buildArenaMap = function () {
        const ret = prev.apply(this, arguments);
        try { dressArena(); } catch (e) { console.warn('dress arena', e); }
        return ret;
      };
      buildArenaMap.__real = true;
    }
    if (typeof spawnDrones === 'function' && !spawnDrones.__real) {
      const prev = spawnDrones;
      spawnDrones = function () {
        const ret = prev.apply(this, arguments);
        try { (DRONES || []).forEach((d) => d.m && dressRig(d.m.g, 'drone')); } catch (e) {}
        return ret;
      };
      spawnDrones.__real = true;
    }
    const yardBuild = RC.yard && RC.yard.buildShell;
    if (yardBuild && !yardBuild.__real) {
      RC.yard.buildShell = function () {
        const ret = yardBuild.apply(this, arguments);
        try { dressYard(); } catch (e) { console.warn('dress yard', e); }
        return ret;
      };
      RC.yard.buildShell.__real = true;
    }
  }

  function load() {
    const files = [];
    Object.keys(SETS).forEach((k) => {
      ['map', 'normal', 'rough'].forEach((slot) => {
        const name = SETS[k][slot];
        if (!name || (touch && slot !== 'map')) return;
        if (files.indexOf(name) < 0) files.push(name);
      });
    });
    return Promise.all(files.map((name) => loadOne(name).then((t) => { tex[name] = t; }))).then(() => {
      Object.keys(SETS).forEach((k) => { mats[k] = makeMat(SETS[k]); });
      realism.ready = !!(mats.floor && mats.wall && mats.asphalt && mats.plate);
      return loadHDR();
    }).then(() => {
      install();
      try { dressArena(); dressYard(); } catch (e) { console.warn('dress', e); }
      return realism;
    });
  }

  realism.probe = function () {
    let floor = 0, walls = 0, err = '';
    try {
      arenaGroup.traverse((o) => {
        if (o.userData && o.userData.rcSurface === 'floor') floor++;
        if (o.userData && o.userData.rcSurface === 'wall') walls++;
      });
    } catch (e) { err = e.message; }
    return {
      floor, walls, err,
      ceil: !!(arenaGroup && arenaGroup.getObjectByName('rc-ceiling')),
      mats: Object.keys(mats),
      children: arenaGroup ? arenaGroup.children.length : -1
    };
  };
  realism.load = load;
  realism.dressArena = dressArena;
  realism.dressYard = dressYard;
  realism.dressRig = dressRig;
  realism.install = install;
  realism.mats = mats;
  RC.realism = realism;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => load());
  else load();
})();
