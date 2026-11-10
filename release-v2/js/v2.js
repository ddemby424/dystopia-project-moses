/* Release v2 visual layer.
   Tall hall, shared PBR, merged static kit, zone visibility, and the Sentinel. */
(function () {
  const RC = (window.RC = window.RC || {});
  const v2 = { ready: true };
  let sentinel = null;
  let rackMat = null;
  let glowMat = null;
  let fill = null;

  function dequantizeGeo(geo) {
    if (!geo || geo.userData.deq) return;
    geo.userData.deq = true;
    Object.keys(geo.attributes).forEach((name) => {
      const attr = geo.attributes[name];
      if (!attr || !attr.normalized) return;
      const src = attr.array;
      let max = 1;
      if (src instanceof Int8Array) max = 127;
      else if (src instanceof Uint8Array) max = 255;
      else if (src instanceof Int16Array) max = 32767;
      else if (src instanceof Uint16Array) max = 65535;
      else return;
      const dst = new Float32Array(src.length);
      for (let i = 0; i < src.length; i++) dst[i] = src[i] / max;
      geo.setAttribute(name, new THREE.BufferAttribute(dst, attr.itemSize, false));
    });
  }

  function bone(name, parent, x, y, z) {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  }

  function stompClip() {
    const times = [0, 0.45, 0.9];
    return new THREE.AnimationClip('Stomp', 0.9, [
      new THREE.NumberKeyframeTrack('LeftLeg.rotation[x]', times, [0.5, -0.45, 0.5]),
      new THREE.NumberKeyframeTrack('RightLeg.rotation[x]', times, [-0.45, 0.5, -0.45]),
      new THREE.NumberKeyframeTrack('Spine2.rotation[x]', times, [0.06, -0.04, 0.06]),
      new THREE.NumberKeyframeTrack('RightForeArm.rotation[x]', times, [-0.2, 0.15, -0.2]),
      new THREE.NumberKeyframeTrack('Hips.position[y]', times, [1.05, 0.92, 1.05])
    ]);
  }

  function boneRig() {
    const root = new THREE.Group();
    root.name = 'v2-sentinel';
    root.userData.v2Mech = true;
    const hips = bone('Hips', root, 0, 1.05, 0);
    const spine2 = bone('Spine2', hips, 0, 0.35, 0);
    bone('Head', spine2, 0, 0.7, 0.05);
    bone('LeftLeg', hips, -0.32, -0.08, 0);
    bone('RightLeg', hips, 0.32, -0.08, 0);
    bone('LeftForeArm', spine2, -0.7, 0.15, 0);
    bone('RightForeArm', spine2, 0.7, 0.15, 0.1);
    return root;
  }

  function reparent(mesh, parent) {
    mesh.updateWorldMatrix(true, false);
    const wm = mesh.matrixWorld.clone();
    parent.add(mesh);
    parent.updateWorldMatrix(true, false);
    const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    mesh.matrix.copy(wm.premultiply(inv));
    mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    mesh.matrixAutoUpdate = true;
  }

  /* Phone GPUs drop this mesh when the glTF keeps tangent + normal + AO +
     emissive maps and the rim shader rewrites the fragment program.
     One albedo map and constant roughness/metalness is enough to read the boss. */
  function plainMechMat(src) {
    const map = src && src.map ? src.map : null;
    const m = new THREE.MeshStandardMaterial({
      name: 'v2-sentinel-body',
      color: map ? 0xffffff : 0x8d5a40,
      map: map,
      roughness: 0.55,
      metalness: 0.18,
      emissive: 0x4a2a18,
      emissiveIntensity: map ? 0.22 : 0.4,
      envMapIntensity: 0.15,
      side: THREE.DoubleSide
    });
    m.userData.v2Plain = true;
    m.userData._bright = true;
    m.userData._rim = true;
    return m;
  }

  function hardenMechMesh(mesh) {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.userData.v2Boss = true;
    if (mesh.geometry) {
      if (mesh.geometry.attributes && mesh.geometry.attributes.tangent) mesh.geometry.deleteAttribute('tangent');
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    }
    if (/plane/i.test(mesh.name || '')) {
      mesh.visible = false;
      return;
    }
    const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    mesh.material = plainMechMat(src);
  }

  function blockPart(mat, w, h, d, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.name = 'v2-sentinel-block';
    hardenMechMesh(m);
    m.material = mat;
    return m;
  }

  function addBlockBody(root) {
    const mat = plainMechMat(null);
    const found = {};
    root.traverse((o) => { if (o.isBone) found[o.name] = o; });
    if (found.Spine2) found.Spine2.add(blockPart(mat, 1.2, 1.4, 0.72, 0, 0.2, 0));
    if (found.Head) found.Head.add(blockPart(mat, 0.58, 0.42, 0.52, 0, 0.12, 0.06));
    if (found.LeftLeg) found.LeftLeg.add(blockPart(mat, 0.36, 1.2, 0.4, 0, -0.72, 0));
    if (found.RightLeg) found.RightLeg.add(blockPart(mat, 0.36, 1.2, 0.4, 0, -0.72, 0));
    if (found.RightForeArm) found.RightForeArm.add(blockPart(mat, 0.28, 0.28, 1.25, 0.05, -0.05, 0.55));
    if (found.LeftForeArm) found.LeftForeArm.add(blockPart(mat, 0.22, 0.7, 0.22, 0, -0.2, 0));
  }

  function sentinelFromMech(gltf) {
    const root = boneRig();
    const found = {};
    root.traverse((o) => { if (o.isBone) found[o.name] = o; });
    const holder = new THREE.Group();
    found.Spine2.add(holder);
    const src = gltf.scene || gltf.scenes[0];
    const meshes = [];
    src.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const attached = [];
    meshes.forEach((mesh) => {
      hardenMechMesh(mesh);
      holder.add(mesh);
      if (mesh.visible && /attach/i.test(mesh.name || '')) attached.push(mesh);
    });
    if (!meshes.some((mesh) => mesh.visible)) addBlockBody(root);
    holder.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(holder);
    const h = Math.max(0.01, box.max.y - box.min.y);
    holder.scale.setScalar(2.35 / h);
    holder.updateWorldMatrix(true, true);
    const box2 = new THREE.Box3().setFromObject(holder);
    holder.position.y -= box2.min.y;
    holder.position.y += 0.05;
    attached.forEach((mesh) => { if (mesh.visible) reparent(mesh, found.RightForeArm); });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x200000, emissive: 0xff1a1a, emissiveIntensity: 3.2, roughness: 0.2 });
    eyeMat.userData._bright = true;
    eyeMat.userData._rim = true;
    eyeMat.userData.v2Plain = true;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.06), eyeMat);
    eye.userData.rcGlow = true;
    eye.userData.v2Boss = true;
    eye.frustumCulled = false;
    eye.name = 'v2-eye';
    eye.position.set(0, 0.05, 0.2);
    found.Head.add(eye);
    root.userData.eye = eye;
    root.updateMatrixWorld(true);
    const full = new THREE.Box3().setFromObject(root);
    const th = Math.max(0.8, full.max.y - full.min.y);
    sentinel = { scene: root, animations: [stompClip()], targetHeight: th };
    v2.mechBytes = v2._mechBlob || 0;
    v2.mechReady = true;
    return sentinel;
  }

  function sentinelTemplate() {
    if (sentinel) return sentinel;
    const root = boneRig();
    addBlockBody(root);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x200000, emissive: 0xff1a1a, emissiveIntensity: 2.4, roughness: 0.2 });
    eyeMat.userData._bright = true;
    eyeMat.userData._rim = true;
    eyeMat.userData.v2Plain = true;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.05), eyeMat);
    eye.userData.rcGlow = true;
    eye.frustumCulled = false;
    let head = null;
    root.traverse((o) => { if (o.name === 'Head') head = o; });
    if (head) head.add(eye);
    sentinel = { scene: root, animations: [stompClip()], targetHeight: 2.7 };
    return sentinel;
  }

  function loadMech() {
    if (v2._mechPromise) return v2._mechPromise;
    v2._mechPromise = fetch('release-v2/assets/units/military_mech.glb').then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.blob();
    }).then((blob) => {
      v2._mechBlob = blob.size;
      v2.mechBytes = blob.size;
      return blob.arrayBuffer();
    }).then((buf) => new Promise((resolve, reject) => {
      const loader = new THREE.GLTFLoader();
      const readyDec = (typeof MeshoptDecoder !== 'undefined' && MeshoptDecoder.ready) ? MeshoptDecoder.ready : Promise.resolve();
      readyDec.then(() => {
        if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder);
        loader.parse(buf, '', (gltf) => {
          sentinel = null;
          sentinelFromMech(gltf);
          resolve(sentinel);
        }, reject);
      }).catch(reject);
    })).catch((e) => { console.warn('mech', e); v2.mechFailed = true; if (v2.debug) v2.debug('mech load failed ' + (e && e.message ? e.message : e)); return sentinelTemplate(); });
    return v2._mechPromise;
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
      const srcCount = mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count;
      if (srcCount / 3 > 280) return;
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
    const windows = [];
    const roofs = [];
    towers.forEach((p, i) => {
      const h = 16 + (i % 5) * 6;
      const sx = 1.2 + (i % 3) * 0.35;
      const sz = 1.2 + (i % 2) * 0.4;
      const rot = p.rot || 0;
      const half = 2 * sz + 0.06;
      const ox = Math.sin(rot) * half;
      const oz = Math.cos(rot) * half;
      const floors = Math.max(3, Math.floor(h / 3.4));
      for (let f = 1; f < floors; f++) {
        if ((f + i) % 4 === 0) continue;
        windows.push({
          x: p.x + ox, y: 2.2 + f * 3.15, z: p.z + oz, rot: rot,
          sx: sx * 1.15, sy: 0.28, sz: 0.05
        });
      }
      roofs.push({ x: p.x, y: h + 0.35, z: p.z, rot: rot, sx: sx * 1.08, sy: 0.7, sz: sz * 1.08 });
    });
    const winMat = new THREE.MeshStandardMaterial({ color: 0x141a20, emissive: 0xffb060, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.15 });
    const roofMat = siding.clone ? siding.clone() : siding;
    if (roofMat !== siding && roofMat.color) roofMat.color.multiplyScalar(0.45);
    const winMesh = instanced(new THREE.BoxGeometry(4, 1, 4), winMat, windows);
    const roofMesh = instanced(new THREE.BoxGeometry(4, 1, 4), roofMat, roofs);
    if (winMesh) root.add(winMesh);
    if (roofMesh) root.add(roofMesh);
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
    const stain = document.createElement('canvas');
    stain.width = 512; stain.height = 512;
    const sg = stain.getContext('2d');
    sg.clearRect(0, 0, 512, 512);
    for (let i = 0; i < 36; i++) {
      const shade = 12 + Math.floor(Math.random() * 28);
      sg.fillStyle = 'rgba(' + shade + ',' + (shade - 4) + ',' + (shade - 6) + ',' + (0.35 + Math.random() * 0.4) + ')';
      sg.beginPath();
      sg.ellipse(Math.random() * 512, Math.random() * 512, 18 + Math.random() * 80, 8 + Math.random() * 36, Math.random() * 6, 0, Math.PI * 2);
      sg.fill();
    }
    const stainTex = new THREE.CanvasTexture(stain);
    const stainMat = new THREE.MeshBasicMaterial({ map: stainTex, transparent: true, opacity: 0.55, depthWrite: false });
    const spots = [];
    for (let i = 0; i < 18; i++) {
      spots.push({
        x: -30 + Math.random() * 60,
        y: 0.045,
        z: 98 + Math.random() * 46,
        rot: Math.random() * 6,
        sx: 2.5 + Math.random() * 5,
        sy: 1,
        sz: 1.6 + Math.random() * 3.5
      });
    }
    const stainMesh = instanced(new THREE.BoxGeometry(1, 0.02, 1), stainMat, spots);
    if (stainMesh) root.add(stainMesh);
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
      if (b.weapon) b.weapon.visible = show && !b.dying;
    });
    (typeof COLOSSI !== 'undefined' ? COLOSSI : []).forEach((C) => {
      showBoss(C, !outside);
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
        if (isBossNode(ch) || ch.name === 'rc-v2-shell' || ch.name === 'rc-v2-merged' || ch.name === 'rc-ceiling' || (ch.userData && (ch.userData.v2Keep || ch.userData.v2Shell || ch.userData.rcSurface === 'wall' || ch.userData.rcSurface === 'floor'))) {
          if (!isBossNode(ch)) ch.visible = true;
          return;
        }
        const dx = (ch.position.x || 0) - px;
        const dz = (ch.position.z || 0) - pz;
        let lim = 38;
        if (ch.isMesh && ch.geometry) {
          const g = ch.geometry;
          const n = g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
          if (n > 2000) lim = 24;
        }
        ch.visible = dx * dx + dz * dz < lim * lim;
      });
    }
    if (typeof COLOSSI !== 'undefined') {
      const now = performance.now() * 0.001;
      COLOSSI.forEach((C) => {
        const mech = C.root.getObjectByName && C.root.getObjectByName('v2-sentinel');
        if (!mech || C.dead) return;
        const step = Math.sin(now * (C.moving ? 7.5 : 1.4));
        if (C.moving && step > 0.94 && !C._stepped) {
          C._stepped = true;
          const d = Math.hypot(STATE.player.x - C.root.position.x, STATE.player.z - C.root.position.z);
          if (d < 22) STATE.screenShake = Math.max(STATE.screenShake || 0, 0.35 * (1 - d / 22));
        }
        if (step < 0.15) C._stepped = false;
        const eye = mech.getObjectByName('v2-eye');
        if (eye && eye.material) eye.material.emissiveIntensity = 2.4 + 0.8 * (0.5 + 0.5 * Math.sin(now * 6));
        if (v2.debug && C.v2Sentinel && !C._dbgAt) {
          C._dbgAt = now;
          v2.debug('sentinel alert=' + !!C.alerted + ' move=' + !!C.moving + ' stuck=' + (C.stuckN || 0) + ' pos=' + C.root.position.x.toFixed(1) + ',' + C.root.position.z.toFixed(1));
        } else if (v2.debug && C.v2Sentinel && now - C._dbgAt > 2) C._dbgAt = 0;
        if (v2.debugStatus && C.v2Sentinel) v2.debugStatus(sentinelLine(C));
      });
    }
  }

  function isBossNode(ch) {
    if (!ch) return false;
    if (ch.userData && (ch.userData.v2Boss || ch.userData.v2Mech)) return true;
    if (ch.name === 'v2-sentinel') return true;
    if (ch.getObjectByName && ch.getObjectByName('v2-sentinel')) return true;
    return false;
  }

  function showBoss(C, on) {
    if (!C || !C.root) return;
    C.root.visible = on;
    C.root.userData.v2Boss = true;
    C.root.userData.v2Keep = true;
    C.root.frustumCulled = false;
    C.root.traverse((o) => {
      o.frustumCulled = false;
      if (!o.isMesh) return;
      o.userData.v2Boss = true;
      if (/plane/i.test(o.name || '')) { o.visible = false; return; }
      o.visible = on;
    });
  }

  function sentinelLine(C) {
    let meshes = 0;
    let drawn = 0;
    let tris = 0;
    let mat = 'none';
    let maps = 'none';
    C.root.traverse((o) => {
      if (!o.isMesh || /plane/i.test(o.name || '')) return;
      meshes++;
      const g = o.geometry;
      const n = g && g.index ? g.index.count / 3 : (g && g.attributes.position ? g.attributes.position.count / 3 : 0);
      if (o.visible && C.root.visible) {
        drawn++;
        tris += n;
      }
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m) return;
      mat = m.type || mat;
      const bits = [];
      if (m.map) bits.push('albedo');
      if (m.normalMap) bits.push('normal');
      if (m.aoMap) bits.push('ao');
      if (m.emissiveMap) bits.push('emissive');
      if (m.onBeforeCompile && String(m.onBeforeCompile).length > 40) bits.push('rim');
      maps = bits.length ? bits.join('+') : 'flat';
    });
    const d = Math.hypot(STATE.player.x - C.root.position.x, STATE.player.z - C.root.position.z);
    const hidden = !C.root.visible || drawn === 0;
    const cull = hidden ? 'HIDDEN' : 'exempt';
    const would = d > 24 ? 'would-hide-24m' : 'in-range';
    const line = 'sentinel vis=' + (C.root.visible ? 1 : 0) + ' scene=' + (C.root.parent ? 1 : 0) + ' drawn=' + drawn + '/' + meshes + ' tris=' + Math.round(tris) + ' mat=' + mat + ' maps=' + maps + ' dist=' + d.toFixed(1) + ' cull=' + cull + ' ' + would + ' frustum=off';
    v2.sentinelReport = { visible: !!C.root.visible, drawn, meshes, tris: Math.round(tris), mat, maps, dist: d, cull, would };
    return line;
  }

  function mobileBudget() {
    const touch = (navigator.maxTouchPoints || 0) > 0 || (typeof IS_COARSE !== 'undefined' && IS_COARSE);
    return touch;
  }

  function installDebug() {
    if (!/[?&]debug=1(?:&|$)/.test(location.search)) return;
    const el = document.createElement('pre');
    el.id = 'rc-debug';
    el.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:100000;max-width:92vw;max-height:42vh;overflow:auto;margin:0;padding:8px;background:rgba(0,0,0,.78);color:#d1fae5;font:11px/1.35 ui-monospace,monospace;pointer-events:none;white-space:pre-wrap';
    document.body.appendChild(el);
    const lines = [];
    let status = '';
    function paint() {
      el.textContent = (status ? status + '\n' : '') + lines.join('\n');
    }
    v2.debug = function (line) {
      lines.push(String(line));
      if (lines.length > 12) lines.shift();
      paint();
    };
    v2.debugStatus = function (line) {
      status = String(line);
      paint();
    };
    v2.debug('debug overlay on');
  }

  function installBloom() {
    if (mobileBudget()) {
      if (v2.debug) v2.debug('bloom off (mobile)');
      return;
    }
    if (v2._bloom || typeof THREE.EffectComposer !== 'function' || typeof THREE.UnrealBloomPass !== 'function') return;
    if (typeof renderFrame !== 'function' || typeof renderer === 'undefined') return;
    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.18, 0.32, 0.9);
    composer.addPass(bloom);
    v2.bloom = bloom;
    renderFrame = function () {
      const reduced = typeof STATE !== 'undefined' && STATE.rcReduced;
      if (reduced) {
        renderer.render(scene, camera);
      } else {
        const c = renderer.domElement;
        const rw = Math.max(2, c.width || 2);
        const rh = Math.max(2, c.height || 2);
        if (composer._lw !== rw || composer._lh !== rh) {
          composer.setSize(rw, rh);
          composer._lw = rw;
          composer._lh = rh;
        }
        composer.render();
      }
      if (!gunMesh || !viewModelGroup.visible) return;
      syncVmCam();
      if (vmFlash.intensity > 0) vmFlash.intensity = Math.max(0, vmFlash.intensity - 0.35);
      const ac = renderer.autoClear;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(vmScene, vmCam);
      renderer.autoClear = ac;
    };
    v2._bloom = true;
  }

  v2.sentinelTemplate = sentinelTemplate;
  v2.dressArena = dressArena;
  v2.dressYard = dressYard;
  v2.zone = zone;
  v2.load = loadMech;
  v2.mechBytes = 0;
  RC.v2 = v2;
  installDebug();
  installBloom();
  if (mobileBudget() && typeof renderer !== 'undefined') {
    try { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25)); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => loadMech());
  else loadMech();
})();
