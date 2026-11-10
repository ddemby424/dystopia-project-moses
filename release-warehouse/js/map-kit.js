/* DYSTOPIA release candidate — modular map kit.
   Kenney Factory Kit + City Kit (Industrial) are CC0 modular pieces, not a
   preassembled map. This file turns a placement record into a mesh (or a
   stand-in box) and an AABB. Repeated floor tiles go through one InstancedMesh.
   Hobbyists: add a row to release/maps/yard.json, keep the lane x values clear. */
(function () {
  const RC = (window.RC = window.RC || {});
  const URL = (kit, id) => `release-warehouse/assets/kenney-${kit}/${id}.glb`;

  function idsIn(layout) {
    const set = new Map();
    (layout.props || []).forEach((p) => set.set(URL(p.kit, p.id), p));
    if (layout.tiles) set.set(URL(layout.tiles.kit, layout.tiles.id), layout.tiles);
    return [...set.keys()];
  }

  function loadAll(layout, onProgress) {
    const urls = idsIn(layout);
    let n = 0;
    return Promise.all(urls.map((url) => RC.assets.load(url).then(() => {
      n++;
      if (onProgress) onProgress(n, urls.length, url);
    }).catch(() => {
      n++;
      if (onProgress) onProgress(n, urls.length, url);
    })));
  }

  function standIn(color, sx, sy, sz) {
    const geo = standIn.geo || (standIn.geo = new THREE.BoxGeometry(1, 1, 1));
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2 });
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    m.position.y = sy / 2;
    m.castShadow = !window.IS_COARSE;
    m.receiveShadow = true;
    return m;
  }

  function colorOf(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
    return new THREE.Color().setHSL((h % 360) / 360, 0.25, 0.35);
  }

  /* World AABB of an object already parented and transformed. */
  function worldBox(obj) {
    obj.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(obj);
  }

  function place(parent, spec) {
    const url = URL(spec.kit, spec.id);
    const scale = spec.scale || 1;
    const group = new THREE.Group();
    group.name = 'kit:' + spec.id;
    group.position.set(spec.x, spec.y || 0, spec.z);
    group.rotation.y = spec.rot || 0;
    let visual = RC.assets.clone(url);
    let fallback = false;
    if (!visual) {
      fallback = true;
      const s = scale;
      visual = standIn(colorOf(spec.id), s, s * 0.8, s);
    } else {
      visual.scale.setScalar(scale);
    }
    group.add(visual);
    group.userData.kit = { id: spec.id, kit: spec.kit, fallback, block: spec.block !== false && !spec.vista, vista: !!spec.vista };
    parent.add(group);
    const box = worldBox(group);
    return { group, box, fallback };
  }

  /* One draw call for the floor-tile run. Missing GLB → a handful of thin boxes. */
  function tileRun(parent, tiles) {
    if (!tiles || !tiles.points || !tiles.points.length) return null;
    const url = URL(tiles.kit, tiles.id);
    const gltf = RC.assets.done.get(url);
    const scale = tiles.scale || 1;
    let mesh = null;
    if (gltf) gltf.scene.traverse((o) => { if (!mesh && o.isMesh) mesh = o; });
    if (!mesh) {
      const g = new THREE.Group();
      tiles.points.forEach(([x, z]) => {
        const m = standIn(0x3a4048, scale, 0.08, scale);
        m.position.set(x, 0.05, z);
        g.add(m);
      });
      parent.add(g);
      return { fallback: true, count: tiles.points.length };
    }
    const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, tiles.points.length);
    inst.castShadow = false;
    inst.receiveShadow = true;
    inst.frustumCulled = true;
    const M = new THREE.Matrix4();
    const Q = new THREE.Quaternion();
    const S = new THREE.Vector3(scale, scale, scale);
    const P = new THREE.Vector3();
    tiles.points.forEach(([x, z], i) => {
      P.set(x, 0.045, z);
      M.compose(P, Q, S);
      inst.setMatrixAt(i, M);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.userData.kitTiles = tiles.points.length;
    parent.add(inst);
    return { fallback: false, count: tiles.points.length };
  }

  RC.kit = { URL, loadAll, place, tileRun, worldBox };
})();
