/* Release v2 visual layer.
   Tall hall, shared PBR, merged static kit, zone visibility, and the Sentinel. */
(function () {
  const RC = (window.RC = window.RC || {});
  const v2 = { ready: true };
  let sentinel = null;
  let rackMat = null;
  let glowMat = null;
  let fill = null;

  function bone(name, parent, x, y, z) {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  }

  function sentinelTemplate() {
    if (sentinel) return sentinel;
    const root = new THREE.Group();
    root.name = 'v2-sentinel';
    const hips = bone('Hips', root, 0, 1.2, 0);
    const spine = bone('Spine', hips, 0, 0.16, 0);
    const spine1 = bone('Spine1', spine, 0, 0.28, 0);
    const spine2 = bone('Spine2', spine1, 0, 0.34, 0);
    bone('Head', spine2, 0, 0.42, 0.04);
    bone('LeftLeg', hips, -0.28, -0.06, 0);
    bone('RightLeg', hips, 0.28, -0.06, 0);
    bone('LeftForeArm', spine2, -0.78, -0.08, 0);
    bone('RightForeArm', spine2, 0.78, -0.08, 0.08);
    const plate = new THREE.MeshStandardMaterial({ color: 0x8e99a3, metalness: 0.74, roughness: 0.42, envMapIntensity: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23282e, metalness: 0.82, roughness: 0.5 });
    const eye = new THREE.MeshStandardMaterial({ color: 0x140000, emissive: 0xff1a1a, emissiveIntensity: 2.8, roughness: 0.2, metalness: 0.1 });
    eye.userData._bright = true;
    plate.userData._bright = true;
    dark.userData._bright = true;
    const found = {};
    root.traverse((o) => { if (o.isBone) found[o.name] = o; });
    function box(bname, w, h, d, x, y, z, mat, glow) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      if (glow) mesh.userData.rcGlow = true;
      found[bname].add(mesh);
    }
    box('Hips', 0.9, 0.36, 0.55, 0, 0.02, 0, dark);
    box('Spine2', 1.35, 0.85, 0.7, 0, -0.05, 0.02, plate);
    box('Spine2', 0.28, 0.28, 0.08, 0, 0.05, 0.4, eye, true);
    box('Head', 0.46, 0.38, 0.48, 0, 0.06, 0, dark);
    box('Head', 0.4, 0.1, 0.08, 0, 0.08, 0.28, eye, true);
    box('LeftLeg', 0.34, 1.05, 0.38, 0, -0.55, 0, plate);
    box('RightLeg', 0.34, 1.05, 0.38, 0, -0.55, 0, plate);
    box('LeftForeArm', 0.28, 0.95, 0.32, 0, -0.55, 0, dark);
    box('RightForeArm', 0.32, 0.9, 0.36, 0, -0.5, 0.05, plate);
    box('RightForeArm', 0.16, 0.16, 0.85, 0.08, -0.95, 0.35, eye, true);
    const times = [0, 0.45, 0.9];
    const clip = new THREE.AnimationClip('Stomp', 0.9, [
      new THREE.NumberKeyframeTrack('LeftLeg.rotation[x]', times, [0.55, -0.5, 0.55]),
      new THREE.NumberKeyframeTrack('RightLeg.rotation[x]', times, [-0.5, 0.55, -0.5]),
      new THREE.NumberKeyframeTrack('LeftForeArm.rotation[x]', times, [0.35, -0.25, 0.35]),
      new THREE.NumberKeyframeTrack('RightForeArm.rotation[x]', times, [-0.2, 0.25, -0.2]),
      new THREE.NumberKeyframeTrack('Spine1.rotation[z]', times, [-0.04, 0.04, -0.04]),
      new THREE.NumberKeyframeTrack('Hips.position[y]', times, [1.2, 1.08, 1.2])
    ]);
    sentinel = { scene: root, animations: [clip], targetHeight: 2.7 };
    return sentinel;
  }

  function tuneMats() {
    const mats = RC.realism && RC.realism.mats;
    if (!mats) return;
    if (mats.floor) {
      mats.floor.color.setRGB(1.65, 1.55, 1.42);
      mats.floor.roughness = 0.62;
      mats.floor.metalness = 0.16;
      mats.floor.envMapIntensity = 0.28;
      mats.floor.emissive = new THREE.Color(0x4a4036);
      mats.floor.emissiveIntensity = 0.28;
      if (mats.floor.map) mats.floor.emissiveMap = mats.floor.map;
      mats.floor.needsUpdate = true;
    }
    if (mats.wall && mats.wall.map) {
      mats.wall.color.setRGB(1.25, 1.2, 1.12);
      mats.wall.roughness = 0.88;
      mats.wall.metalness = 0.04;
      mats.wall.map.repeat.set(4, 8);
      if (mats.wall.normalMap) mats.wall.normalMap.repeat.set(4, 8);
      if (mats.wall.roughnessMap) mats.wall.roughnessMap.repeat.set(4, 8);
    }
    if (mats.ceiling) {
      mats.ceiling.color.setRGB(0.72, 0.7, 0.66);
      mats.ceiling.roughness = 0.9;
    }
    if (mats.asphalt) {
      mats.asphalt.color.setRGB(1.15, 1.12, 1.08);
      mats.asphalt.emissive = new THREE.Color(0x2a2824);
      mats.asphalt.emissiveIntensity = 0.18;
      if (mats.asphalt.map) mats.asphalt.emissiveMap = mats.asphalt.map;
    }
  }

  function lighting() {
    if (typeof hemiLight !== 'undefined') {
      hemiLight.color.setHex(0xc5d0dc);
      hemiLight.groundColor.setHex(0x4a4034);
      hemiLight.intensity = 0.55;
    }
    if (typeof dirLight !== 'undefined') {
      dirLight.color.setHex(0xffe6c4);
      dirLight.intensity = 0.72;
      dirLight.castShadow = false;
    }
    if (typeof renderer !== 'undefined') renderer.shadowMap.enabled = false;
    if (typeof scene !== 'undefined' && scene.fog) {
      scene.fog.color.setHex(0x1a212b);
      scene.fog.density = 0.0042;
      scene.background.setHex(0x121820);
    }
    if (!fill && typeof scene !== 'undefined') {
      fill = new THREE.DirectionalLight(0xfff3e4, 0.38);
      fill.position.set(-18, 28, 24);
      fill.castShadow = false;
      scene.add(fill);
    }
    if (typeof arenaGroup !== 'undefined') {
      arenaGroup.traverse((o) => {
        if (o.isLight) o.castShadow = false;
        if (o.isMesh) o.castShadow = false;
      });
    }
  }

  function sharedRack() {
    if (rackMat) return rackMat;
    let tex = null;
    if (typeof RACK_TEX !== 'undefined' && RACK_TEX) {
      tex = RACK_TEX.clone();
      tex.needsUpdate = true;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 0.5);
    }
    rackMat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, color: 0xc5ccd4, emissive: 0xfff0e0, emissiveIntensity: 0.4,
      roughness: 0.5, metalness: 0.35
    });
    if (tex && typeof BLINK_MATS !== 'undefined') BLINK_MATS.push({ tex, phase: 0, rate: 1.1 });
    return rackMat;
  }

  function sharedGlow() {
    if (!glowMat) {
      glowMat = new THREE.MeshStandardMaterial({ color: 0x221408, emissive: 0xffb060, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.2 });
    }
    return glowMat;
  }

  function kept(o) {
    let p = o;
    while (p) {
      if (p.userData && (p.userData.v2Keep || p.userData.noMerge || p.userData.secretDoor || p.userData.textPlane || p.userData.signTwin)) return true;
      p = p.parent;
    }
    if (typeof sirenBeaconMeshes !== 'undefined' && sirenBeaconMeshes.indexOf(o) >= 0) return true;
    return false;
  }

  function classify(mesh) {
    if (kept(mesh)) return null;
    const src = Array.isArray(mesh.material) ? mesh.material.find(Boolean) : mesh.material;
    if (!src || !src.isMeshStandardMaterial && !src.isMeshLambertMaterial && !src.isMeshPhongMaterial) {
      if (src && src.isMeshBasicMaterial) return null;
    }
    const mats = RC.realism && RC.realism.mats;
    const surf = mesh.userData.rcSurface;
    if (surf === 'floor' && mats && mats.floor) return mats.floor;
    if (surf === 'wall' && mats && mats.wall) return mats.wall;
    if (surf === 'ceiling' && mats && mats.ceiling) return mats.ceiling;
    if (surf === 'steel' && mats && mats.plate) return mats.plate;
    if (src && (src.emissiveMap || (src.map && (src.emissiveIntensity || 0) > 0.35))) return sharedRack();
    if (src && src.map) return null;
    if (src && (src.emissiveIntensity || 0) > 0.8) return sharedGlow();
    if (mats && mats.plate) return mats.plate;
    return null;
  }

  function mergeStatic() {
    if (typeof arenaGroup === 'undefined' || !THREE.BufferGeometryUtils) return 0;
    if (arenaGroup.getObjectByName('rc-v2-merged')) return 0;
    const buckets = {};
    const members = {};
    const meshes = [];
    arenaGroup.traverse((o) => { if (o.isMesh) meshes.push(o); });
    meshes.forEach((mesh) => {
      if (!mesh.geometry || !mesh.geometry.attributes || !mesh.geometry.attributes.position) return;
      if (mesh.isSkinnedMesh || mesh.geometry.attributes.skinIndex || mesh.geometry.attributes.color) return;
      const mat = classify(mesh);
      if (!mat) return;
      const srcGeo = mesh.geometry;
      const g = new THREE.BufferGeometry();
      const copyAttr = (attr) => {
        const n = attr.itemSize;
        const data = new Float32Array(attr.count * n);
        for (let i = 0; i < attr.count; i++) {
          data[i * n] = attr.getX(i);
          if (n > 1) data[i * n + 1] = attr.getY(i);
          if (n > 2) data[i * n + 2] = attr.getZ(i);
          if (n > 3) data[i * n + 3] = attr.getW(i);
        }
        return new THREE.BufferAttribute(data, n);
      };
      if (!srcGeo.attributes.position) return;
      g.setAttribute('position', copyAttr(srcGeo.attributes.position));
      if (srcGeo.attributes.normal) g.setAttribute('normal', copyAttr(srcGeo.attributes.normal));
      const hasUv = !!srcGeo.attributes.uv;
      if (hasUv) g.setAttribute('uv', copyAttr(srcGeo.attributes.uv));
      if (srcGeo.index) {
        const idx = srcGeo.index.array;
        const copy = new idx.constructor(idx);
        g.setIndex(new THREE.BufferAttribute(copy, 1));
      }
      mesh.updateWorldMatrix(true, false);
      g.applyMatrix4(mesh.matrixWorld);
      const key = mat.uuid + (g.index ? ':i' : ':ni') + (hasUv ? ':uv' : ':nuv') + (srcGeo.attributes.normal ? ':vn' : ':nn');
      if (!buckets[key]) { buckets[key] = { mat, geos: [] }; members[key] = []; }
      buckets[key].geos.push(g);
      members[key].push(mesh);
    });
    let made = 0;
    Object.keys(buckets).forEach((key) => {
      const b = buckets[key];
      if (b.geos.length < 2) return;
      let merged = null;
      try { merged = THREE.BufferGeometryUtils.mergeBufferGeometries(b.geos, false); } catch (e) { merged = null; }
      if (!merged) return;
      const mesh = new THREE.Mesh(merged, b.mat);
      mesh.name = 'rc-v2-merged';
      mesh.userData.noMerge = true;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      arenaGroup.add(mesh);
      members[key].forEach((src) => { if (src.parent) src.parent.remove(src); });
      made++;
    });
    return made;
  }

  function instanced(geo, mat, places) {
    if (!places.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, places.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    places.forEach((it, i) => {
      p.set(it.x, it.y, it.z);
      s.set(it.sx || 1, it.sy || 1, it.sz || 1);
      if (it.rot) q.setFromAxisAngle(up, it.rot); else q.identity();
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
    });
    im.castShadow = false;
    im.receiveShadow = true;
    im.userData.noMerge = true;
    return im;
  }

  function addShell() {
    if (typeof arenaGroup === 'undefined' || arenaGroup.getObjectByName('rc-v2-shell')) return;
    const shell = new THREE.Group();
    shell.name = 'rc-v2-shell';
    shell.userData.noMerge = true;
    shell.userData.v2Shell = true;
    const mats = (RC.realism && RC.realism.mats) || {};
    const plate = mats.plate || new THREE.MeshStandardMaterial({ color: 0x8d969e, metalness: 0.7, roughness: 0.4 });
    const rust = mats.rust || plate;
    const cols = [];
    for (let z = -70; z <= 70; z += 16) cols.push({ x: -78, y: 16, z, sy: 32, sx: 0.7, sz: 0.7 });
    for (let z = -70; z <= 70; z += 16) cols.push({ x: 78, y: 16, z, sy: 32, sx: 0.7, sz: 0.7 });
    const col = instanced(new THREE.BoxGeometry(1, 1, 1), plate, cols);
    if (col) shell.add(col);
    const pipes = [];
    for (let z = -60; z <= 60; z += 8) {
      pipes.push({ x: -16, y: 31.5, z, sx: 0.35, sy: 0.35, sz: 6 });
      pipes.push({ x: 16, y: 31.5, z, sx: 0.35, sy: 0.35, sz: 6 });
    }
    const pipe = instanced(new THREE.BoxGeometry(1, 1, 1), rust, pipes);
    if (pipe) shell.add(pipe);
    const lamps = [];
    for (let x = -48; x <= 48; x += 24) {
      for (let z = -48; z <= 60; z += 24) lamps.push({ x, y: 33.2, z, sx: 3.2, sy: 0.12, sz: 1.1 });
    }
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff1dd, emissive: 0xffd7a0, emissiveIntensity: 0.85, roughness: 0.4, metalness: 0.05 });
    const lamp = instanced(new THREE.BoxGeometry(1, 1, 1), lampMat, lamps);
    if (lamp) shell.add(lamp);
    const lanes = [];
    for (let z = -70; z <= 70; z += 14) lanes.push({ x: 0, y: 0.06, z, sx: 3.2, sy: 0.04, sz: 8 });
    const laneMat = new THREE.MeshStandardMaterial({ color: 0x6e675c, roughness: 0.8, metalness: 0.05 });
    const lane = instanced(new THREE.BoxGeometry(1, 1, 1), laneMat, lanes);
    if (lane) shell.add(lane);
    arenaGroup.add(shell);
  }

  function dressArena() {
    lighting();
    tuneMats();
    addShell();
    mergeStatic();
    const ceil = arenaGroup && arenaGroup.getObjectByName('rc-ceiling');
    if (ceil) ceil.position.y = 34.2;
  }

  function hideKit() {
    const g = RC.yard && RC.yard.group;
    if (!g) return;
    g.traverse((ch) => {
      if (RC.yard.shutter && (ch === RC.yard.shutter || RC.yard.shutter.children.indexOf(ch) >= 0)) return;
      if ((ch.name && ch.name.indexOf('kit:') === 0) || (ch.userData && ch.userData.kit)) {
        ch.visible = false;
        ch.traverse((m) => { if (m.isMesh) m.visible = false; });
      }
    });
  }

  function dressYard() {
    lighting();
    tuneMats();
    hideKit();
    const g = RC.yard && RC.yard.group;
    if (!g || g.getObjectByName('rc-v2-yard') || !RC.yard.layoutRef) return;
    const layout = RC.yard.layoutRef();
    if (!layout) return;
    const root = new THREE.Group();
    root.name = 'rc-v2-yard';
    root.userData.noMerge = true;
    const mats = (RC.realism && RC.realism.mats) || {};
    const rust = mats.rust || new THREE.MeshStandardMaterial({ color: 0x7a5a42, metalness: 0.55, roughness: 0.6 });
    const plate = mats.plate || rust;
    const siding = mats.siding || plate;
    const crates = [];
    const towers = [];
    (layout.props || []).forEach((p) => {
      if (p.vista) towers.push(p);
      else if (/box|container|hopper|tank|machine|piston/.test(p.id)) crates.push(p);
    });
    const crateMesh = instanced(new THREE.BoxGeometry(1.5, 1.15, 2.2), rust, crates.map((p) => ({
      x: p.x, y: 0.55 * (p.scale || 1), z: p.z, rot: p.rot || 0, sx: p.scale || 1, sy: (p.scale || 1) * 0.9, sz: p.scale || 1
    })));
    if (crateMesh) root.add(crateMesh);
    const towerMesh = instanced(new THREE.BoxGeometry(4, 1, 4), siding, towers.map((p, i) => {
      const h = 16 + (i % 5) * 6;
      return { x: p.x, y: h / 2, z: p.z, rot: p.rot || 0, sx: 1.2 + (i % 3) * 0.35, sy: h, sz: 1.2 + (i % 2) * 0.4 };
    }));
    if (towerMesh) root.add(towerMesh);
    if (THREE.BufferGeometryUtils) {
      const bits = [];
      function put(w, h, d, x, y, z) {
        const geo = new THREE.BoxGeometry(w, h, d);
        geo.translate(x, y, z);
        bits.push(geo);
      }
      put(1.1, 9, 1.1, -7, 4.5, 0);
      put(1.1, 9, 1.1, 7, 4.5, 0);
      put(16, 0.55, 1.2, 0, 9.1, 0);
      put(0.35, 7, 0.35, 0, 5.4, 1.2);
      put(2.4, 0.4, 2.4, 0, 1.6, 1.2);
      put(0.8, 0.25, 3.5, 0, 8.4, 1.4);
      const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(bits, false);
      const crane = new THREE.Mesh(merged, plate);
      crane.position.set(0, 0, 112);
      crane.castShadow = false;
      root.add(crane);
    }
    const railMat = plate.clone();
    railMat.color = new THREE.Color(0x8d6a48);
    const rails = instanced(new THREE.BoxGeometry(1, 0.18, 0.18), railMat, [
      { x: -46, y: 1.4, z: 122, sx: 0.2, sy: 1, sz: 56 },
      { x: 46, y: 1.4, z: 122, sx: 0.2, sy: 1, sz: 56 }
    ]);
    if (rails) root.add(rails);
    g.add(root);
  }

  function showRig(obj, on) {
    if (obj) obj.visible = on;
  }

  function zone() {
    if (typeof arenaGroup === 'undefined' || typeof STATE === 'undefined') return;
    const victory = RC.victory && RC.victory.open;
    const z = STATE.player.z;
    const floor = STATE.floor || 0;
    const outside = !victory && floor === 0 && z > 100;
    const inside = !victory && (floor > 0 || z < 86);
    /* Keep the shell up from the yard so the factory reads. Hide the boss and the guards instead. */
    arenaGroup.visible = true;
    if (RC.yard && RC.yard.group) {
      RC.yard.group.visible = victory ? true : !inside;
      RC.yard.group.traverse((ch) => {
        if ((ch.name && ch.name.indexOf('kit:') === 0) || (ch.userData && ch.userData.kit)) ch.visible = false;
      });
    }
    if (RC.fence && RC.fence.group) RC.fence.group.visible = victory ? true : !inside;
    const px = STATE.player.x, pz = STATE.player.z;
    (typeof BOTS !== 'undefined' ? BOTS : []).forEach((b) => {
      if (!b.rig || !b.rig.root) return;
      const far = (b.x - px) * (b.x - px) + (b.z - pz) * (b.z - pz) > 36 * 36;
      const show = !outside && !far;
      showRig(b.rig.root, show);
      if (b.weapon) b.weapon.visible = show;
      if (b.rig.root.userData.rcRobot) {
        b.rig.root.traverse((o) => {
          if (o.isMesh && !o.userData.v2Armor && !o.isSprite) o.visible = false;
        });
      }
    });
    (typeof COLOSSI !== 'undefined' ? COLOSSI : []).forEach((C) => {
      if (C.root) C.root.visible = !outside;
      (C.spots || []).forEach((sp) => { if (sp.g) sp.g.visible = !outside && !sp.dead && !C.dead; });
    });
    (typeof DRONES !== 'undefined' ? DRONES : []).forEach((d) => {
      if (!d.m || !d.m.g) return;
      const far = (d.x - px) * (d.x - px) + (d.z - pz) * (d.z - pz) > 36 * 36;
      showRig(d.m.g, !outside && !far);
    });
    if (outside) {
      arenaGroup.children.forEach((ch) => {
        const keep = ch.name === 'rc-v2-merged' || ch.name === 'rc-v2-shell' || ch.name === 'rc-ceiling' || (ch.userData && (ch.userData.rcSurface === 'wall' || ch.userData.rcSurface === 'floor'));
        ch.visible = !!keep && !(ch.userData && ch.userData.v2Keep);
      });
    } else if (arenaGroup.visible) {
      arenaGroup.children.forEach((ch) => {
        if (ch.name === 'rc-v2-shell' || ch.name === 'rc-v2-merged' || ch.name === 'rc-ceiling' || (ch.userData && (ch.userData.v2Keep || ch.userData.v2Shell || ch.userData.rcSurface === 'wall' || ch.userData.rcSurface === 'floor'))) {
          ch.visible = true;
          return;
        }
        const dx = (ch.position.x || 0) - px;
        const dz = (ch.position.z || 0) - pz;
        ch.visible = dx * dx + dz * dz < 64 * 64;
      });
    }
  }

  v2.sentinelTemplate = sentinelTemplate;
  v2.dressArena = dressArena;
  v2.dressYard = dressYard;
  v2.zone = zone;
  RC.v2 = v2;
})();
