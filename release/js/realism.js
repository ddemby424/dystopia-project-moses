/* Photographic surfaces for the candidate.
   Poly Haven CC0 albedos, compressed to 1024 WebP. Shared materials, so the
   yard and the interior do not each carry their own texture set.
   Geometry is still the existing kit and the procedural halls. */
(function () {
  const RC = (window.RC = window.RC || {});
  const FILES = {
    concrete: 'release/assets/real/concrete.webp',
    asphalt: 'release/assets/real/asphalt.webp',
    wall: 'release/assets/real/wall.webp',
    siding: 'release/assets/real/siding.webp',
    rust: 'release/assets/real/rust.webp',
    plate: 'release/assets/real/plate.webp'
  };
  const tex = {};
  const mats = {};
  const realism = { ready: false, bytes: 0, failed: [] };

  function prep(t, repeatX, repeatY) {
    t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    t.repeat.set(repeatX || 1, repeatY || 1);
    return t;
  }

  function makeMat(map, opt) {
    const m = new THREE.MeshStandardMaterial(Object.assign({
      map, roughness: 0.78, metalness: 0.12, color: 0xffffff
    }, opt || {}));
    m.map = map;
    return m;
  }

  function loadOne(url) {
    return new Promise((resolve) => {
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      }).then((blob) => {
        realism.bytes += blob.size;
        const imgUrl = URL.createObjectURL(blob);
        const loader = new THREE.TextureLoader();
        loader.load(imgUrl, (t) => { URL.revokeObjectURL(imgUrl); resolve(t); }, undefined, () => resolve(null));
      }).catch(() => { realism.failed.push(url); resolve(null); });
    });
  }

  function load() {
    const keys = Object.keys(FILES);
    return Promise.all(keys.map((k) => loadOne(FILES[k]).then((t) => { tex[k] = t; }))).then(() => {
      if (tex.concrete) mats.floor = makeMat(prep(tex.concrete, 22, 18), { roughness: 0.8, metalness: 0.04, color: 0xffffff });
      if (tex.asphalt) mats.asphalt = makeMat(prep(tex.asphalt, 14, 16), { roughness: 0.88, metalness: 0.02, color: 0xffffff });
      if (tex.wall) mats.wall = makeMat(prep(tex.wall, 8, 3), { roughness: 0.78, metalness: 0.06, color: 0xffffff });
      if (tex.siding) mats.siding = makeMat(prep(tex.siding, 3, 2), { roughness: 0.62, metalness: 0.35, color: 0xb7b1a8 });
      if (tex.rust) mats.rust = makeMat(prep(tex.rust, 2, 2), { roughness: 0.55, metalness: 0.62, color: 0xa89078 });
      if (tex.plate) mats.plate = makeMat(prep(tex.plate, 2, 2), { roughness: 0.42, metalness: 0.74, color: 0x9a9590 });
      realism.ready = !!(mats.floor && mats.wall && mats.asphalt);
      return realism;
    });
  }

  function paint(mesh, material) {
    if (!mesh || !material || !mesh.isMesh) return;
    mesh.material = material;
  }

  function dressArena() {
    if (!realism.ready || typeof arenaGroup === 'undefined') return;
    arenaGroup.traverse((o) => {
      if (!o.isMesh || o.userData.secretDoor || o.userData.textPlane || o.userData.signTwin) return;
      const surf = o.userData.rcSurface;
      if (surf === 'floor' && mats.floor) paint(o, mats.floor);
      else if (surf === 'wall' && mats.wall) paint(o, mats.wall);
      else if (surf === 'steel' && mats.plate) paint(o, mats.plate);
      else if (surf === 'secret' && mats.wall && o.material && !(o.material.userData && o.material.userData.secretReady)) {
        if (typeof secretDoorMaterial === 'function') o.material = secretDoorMaterial();
      }
    });
    (window.COLOSSI || []).forEach((C) => C.root && dressRig(C.root, 'heavy'));
    (window.DRONES || []).forEach((d) => { if (d.m && d.m.g) dressRig(d.m.g, 'drone'); });
    (window.BOTS || []).forEach((b) => b.rig && dressRig(b.rig.root, b.heavy ? 'heavy' : 'guard'));
  }

  function dressYard() {
    if (!realism.ready || !RC.yard || !RC.yard.group) return;
    RC.yard.group.traverse((o) => {
      if (!o.isMesh) return;
      const vista = o.parent && o.parent.userData && o.parent.userData.kit && o.parent.userData.kit.vista;
      if (o.geometry && o.geometry.type === 'PlaneGeometry') {
        if (mats.asphalt && !o.userData.signTwin && !(o.parent && o.parent.userData && o.parent.userData.repaint)) paint(o, mats.asphalt);
        return;
      }
      if (o.parent && o.parent.userData && o.parent.userData.repaint) return;
      if (vista && mats.siding) paint(o, mats.siding);
      else if (mats.rust) paint(o, mats.rust);
    });
    if (RC.fence && RC.fence.postMesh && mats.plate) RC.fence.postMesh.material = mats.plate;
  }

  function dressRig(root, kind) {
    if (!root || !realism.ready) return;
    if (root.userData && root.userData.rcRobot && window.RC && RC.rigs && RC.rigs.paint) {
      RC.rigs.paint(root, kind);
      return;
    }
    const src = kind === 'heavy' ? mats.plate : (kind === 'drone' ? mats.plate : mats.rust);
    if (!src) return;
    root.traverse((o) => {
      if (!o.isMesh || !o.material || o.isSprite || o.userData.rcGlow) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      let changed = false;
      const next = list.map((m) => {
        if (!m || !m.isMeshStandardMaterial) return m;
        if (m.map) return m;
        if ((m.emissiveIntensity || 0) > 0.55) return m;
        changed = true;
        const clone = src.clone();
        clone.color.multiply(m.color || new THREE.Color(0xffffff));
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

  realism.load = load;
  realism.dressArena = dressArena;
  realism.dressYard = dressYard;
  realism.dressRig = dressRig;
  realism.install = install;
  realism.mats = mats;
  RC.realism = realism;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => load().then(install));
  else load().then(() => { install(); try { dressArena(); dressYard(); } catch (e) {} });
})();
