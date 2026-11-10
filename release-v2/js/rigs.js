/* CC BY 4.0 guards.
   Common: Robot by DJMaesen. Heavy: Biped robot by Willy Decarpentrie.
   Both files are meshopt + WebP. Clips are slices of one timeline, named so
   the campaign still crossfades Idle, Walking, Running, Punch, and Death. */
(function () {
  const RC = (window.RC = window.RC || {});
  const URLS = {
    guard: 'release-v2/assets/units/robot.glb',
    heavy: 'release-v2/assets/units/biped_robot.glb'
  };
  const RANGES = {
    guard: { Idle: [0, 1.4], Walking: [1.5, 4.1], Running: [4.1, 7.9], Punch: [9.15, 10.7], Death: [12.35, 14.16] },
    heavy: { Idle: [0, 0.35], Walking: [0, 3.33], Running: [0, 3.33], Punch: [1.35, 2.2], Death: [2.55, 3.33] }
  };
  const rigs = { guard: null, heavy: null, bytes: 0, failed: false };

  function ready() {
    return !!(rigs.guard && rigs.heavy && THREE.SkeletonUtils);
  }

  function sliceTrack(tr, t0, t1) {
    const times = tr.times;
    const size = tr.getValueSize();
    const nt = [];
    const nv = [];
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      if (t < t0 - 1e-3 || t > t1 + 1e-3) continue;
      nt.push(Math.max(0, t - t0));
      for (let k = 0; k < size; k++) nv.push(tr.values[i * size + k]);
    }
    const dur = Math.max(0.25, t1 - t0);
    if (!nt.length) return null;
    if (nt.length === 1) {
      nt.push(dur);
      for (let k = 0; k < size; k++) nv.push(nv[k]);
    }
    return new tr.constructor(tr.name, new Float32Array(nt), new Float32Array(nv));
  }

  function sliceClip(src, name, t0, t1) {
    const tracks = [];
    (src.tracks || []).forEach((tr) => {
      const next = sliceTrack(tr, t0, t1);
      if (next) tracks.push(next);
    });
    return new THREE.AnimationClip(name, Math.max(0.25, t1 - t0), tracks);
  }

  function quantFix(root) {
    let factor = 1;
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!o.isSkinnedMesh || !o.skeleton) return;
      let m = 0;
      o.skeleton.boneInverses.forEach((mat) => {
        const e = mat.elements;
        m = Math.max(m, Math.abs(e[12]), Math.abs(e[13]), Math.abs(e[14]));
      });
      if (m > 5) factor = m / 1.15;
    });
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      ['position', 'normal'].forEach((name) => {
        const attr = o.geometry.attributes[name];
        if (!attr || !attr.normalized) return;
        const src = attr.array;
        let max = 1;
        if (src instanceof Int8Array) max = 127;
        else if (src instanceof Uint8Array) max = 255;
        else if (src instanceof Int16Array) max = 32767;
        else if (src instanceof Uint16Array) max = 65535;
        else return;
        const mul = name === 'position' ? factor : 1;
        const dst = new Float32Array(src.length);
        for (let i = 0; i < src.length; i++) dst[i] = (src[i] / max) * mul;
        o.geometry.setAttribute(name, new THREE.BufferAttribute(dst, attr.itemSize, false));
      });
      o.geometry.computeBoundingBox();
      o.geometry.computeBoundingSphere();
    });
  }

  function hideHelpers(root) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (/ground|plane|shadow/i.test(o.name || '')) o.visible = false;
    });
  }

  function bindShape(root, factor) {
    const found = [];
    root.traverse((o) => { if (o.isSkinnedMesh) found.push(o); });
    found.forEach((skinned) => {
      const geo = skinned.geometry.clone();
      const src = skinned.geometry.attributes.position;
      const pos = src.clone();
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, src.getX(i) / factor, src.getY(i) / factor, src.getZ(i) / factor);
      geo.setAttribute('position', pos);
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      const mats = Array.isArray(skinned.material) ? skinned.material : [skinned.material];
      mats.forEach((m) => { if (m) m.skinning = false; });
      const mesh = new THREE.Mesh(geo, skinned.material);
      mesh.name = 'v2-bind';
      mesh.castShadow = false;
      mesh.frustumCulled = false;
      mesh.userData.v2Bind = true;
      skinned.visible = false;
      skinned.parent.add(mesh);
    });
  }

  function fit(root, target) {
    hideHelpers(root);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    root.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes.position) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 10) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
    });
    const h = box.max.y - box.min.y;
    if (!(h > 0.05)) return;
    root.scale.multiplyScalar(target / h);
    root.updateMatrixWorld(true);
    box.makeEmpty();
    root.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes.position) return;
      const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 10) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
    });
    if (isFinite(box.min.y)) root.position.y -= box.min.y;
  }

  function accent(root) {
    let bone = null;
    root.traverse((o) => {
      if (!o.isBone) return;
      if (/head/i.test(o.name)) bone = o;
      else if (!bone && /chest|neck/i.test(o.name)) bone = o;
    });
    if (!bone) return;
    const eye = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.035, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x1a0000, emissive: 0xff2200, emissiveIntensity: 2.2, roughness: 0.25 })
    );
    eye.userData.rcGlow = true;
    eye.position.set(0, 0.08, 0.12);
    eye.castShadow = false;
    bone.add(eye);
    root.traverse((o) => {
      if (!o.isMesh || !o.material || o.userData.rcGlow) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => {
        if (!m || !m.emissive) return;
        if ((m.emissiveIntensity || 0) > 0.2) {
          m.emissive.setHex(0xff4420);
          m.emissiveIntensity = Math.max(m.emissiveIntensity, 0.8);
        }
      });
    });
  }

  function prepare(kind, gltf) {
    const scene = gltf.scene || gltf.scenes[0];
    scene.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    bindShape(scene, kind === 'heavy' ? 71.39 : 230.43);
    fit(scene, kind === 'heavy' ? 2.35 : 2.05);
    const src = (gltf.animations || [])[0];
    const ranges = RANGES[kind];
    const clips = {};
    if (src) {
      Object.keys(ranges).forEach((name) => {
        clips[name] = sliceClip(src, name, ranges[name][0], ranges[name][1]);
      });
    }
    scene.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = true; } });
    return { scene, clips };
  }

  function build(kind, label) {
    const tpl = kind === 'heavy' ? rigs.heavy : rigs.guard;
    if (!tpl) return null;
    const clone = THREE.SkeletonUtils.clone(tpl.scene);
    const root = new THREE.Group();
    root.userData.rcRobot = true;
    root.userData.v2Unit = kind;
    root.add(clone);
    const mixer = new THREE.AnimationMixer(clone);
    const actions = {};
    ['Idle', 'Walking', 'Running', 'Punch', 'Death'].forEach((n) => {
      const clip = tpl.clips[n];
      if (!clip) return;
      const act = mixer.clipAction(clip);
      if (n === 'Death' || n === 'Punch') {
        act.setLoop(THREE.LoopOnce, 1);
        act.clampWhenFinished = true;
      }
      actions[n] = act;
    });
    if (actions.Idle) actions.Idle.play();
    let spine = null;
    let head = null;
    clone.traverse((o) => {
      if (!o.isBone) return;
      if (/chest|spine|torso/i.test(o.name) && !spine) spine = o;
      if (/head/i.test(o.name)) head = o;
    });
    const target = kind === 'heavy' ? 2.35 : 2.05;
    const hb = createHealthBarSprite(label || 'Sentinel', false);
    hb.sprite.position.set(0, target + 0.42, 0);
    root.add(hb.sprite);
    return {
      root, mixer, hb, heavy: kind === 'heavy', scale: 1,
      hitRadius: kind === 'heavy' ? 1.05 : 0.85,
      hitHeight: target,
      torso: spine || root,
      leftLeg: null, rightLeg: null, leftArm: null, rightArm: null,
      clips: { actions, current: actions.Idle ? 'Idle' : '', spine, head }
    };
  }

  function paint(root) {
    if (!root) return;
    root.traverse((o) => {
      if (!o.isMesh || !o.material || o.userData.rcGlow) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => {
        if (!m) return;
        if (m.envMapIntensity != null) m.envMapIntensity = Math.min(m.envMapIntensity || 0.8, 0.55);
        m.needsUpdate = true;
      });
    });
  }

  function adopt(b) {
    if (!ready() || !b || b.dying || b.isBoss) return;
    if (b.clips && b.rig && b.rig.root && b.rig.root.userData.v2Unit) return;
    const built = build(b.heavy ? 'heavy' : 'guard', b.name);
    if (!built) return;
    if (b.rig && b.rig.root) {
      built.root.position.copy(b.rig.root.position);
      built.root.rotation.copy(b.rig.root.rotation);
      scene.remove(b.rig.root);
    }
    scene.add(built.root);
    b.rig = built;
    b.mixer = built.mixer;
    b.clips = built.clips;
    b.action = null;
    b.hitRadius = built.hitRadius;
    b.hitHeight = built.hitHeight;
    try { equipEnemyWeapon(b); } catch (e) {}
  }

  function tick(b, dt, o) {
    const A = b.clips;
    if (!A || !b.mixer) return { clip: '' };
    if (b._attackT > 0) b._attackT = Math.max(0, b._attackT - dt);
    const moved = o.moved || 0;
    let name = 'Idle';
    if (b.dying && A.actions.Death) name = 'Death';
    else if ((o.attack || b._attackT > 0) && A.actions.Punch) name = 'Punch';
    else if (moved > 3.05 && A.actions.Running) name = 'Running';
    else if (moved > 0.32 && A.actions.Walking) name = 'Walking';
    if (name !== A.current && A.actions[name]) {
      const next = A.actions[name];
      const prev = A.actions[A.current];
      next.enabled = true;
      next.setEffectiveWeight(1);
      next.reset();
      next.play();
      if (prev && prev !== next) prev.crossFadeTo(next, name === 'Death' ? 0.12 : 0.18, false);
      A.current = name;
    }
    const act = A.actions[A.current];
    if (act && A.current === 'Walking') act.timeScale = Math.max(0.7, Math.min(1.35, moved / 1.55));
    if (act && A.current === 'Running') act.timeScale = Math.max(0.85, Math.min(1.45, moved / 3.4));
    if (act && A.current === 'Idle') act.timeScale = 1;
    b.mixer.update(dt);
    if (A.spine) {
      const twist = o.twist || 0;
      A.spine.rotation.y += twist * 0.15;
    }
    if (o.faceYaw != null && !b.dying && b.rig && b.rig.root) {
      let dy = o.faceYaw - b.rig.root.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      b.rig.root.rotation.y += dy * Math.min(1, dt * 8);
    }
    return { clip: A.current, twist: o.twist || 0 };
  }

  function decode(url, kind) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.blob();
    }).then((blob) => {
      rigs.bytes += blob.size;
      return blob.arrayBuffer();
    }).then((buf) => new Promise((resolve, reject) => {
      const loader = new THREE.GLTFLoader();
      rigs.stage = 'decode ' + kind;
      const readyDec = (typeof MeshoptDecoder !== 'undefined' && MeshoptDecoder.ready) ? MeshoptDecoder.ready : Promise.resolve();
      readyDec.then(() => {
        if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder);
        loader.parse(buf, '', (gltf) => {
          try {
            rigs.stage = 'prepare ' + kind;
            if (kind === 'heavy') rigs.heavy = prepare('heavy', gltf);
            else rigs.guard = prepare('guard', gltf);
            rigs.stage = 'done ' + kind;
            resolve();
          } catch (err) { rigs.err = String(err && err.stack || err); rigs.stage = 'err ' + kind; reject(err); }
        }, (e) => { rigs.stage = 'parsefail ' + kind; reject(e); });
      }).catch(reject);
    }));
  }

  function load() {
    if (rigs._p) return rigs._p;
    if (ready()) return Promise.resolve(rigs);
    rigs._p = Promise.all([
      rigs.guard ? null : decode(URLS.guard, 'guard'),
      rigs.heavy ? null : decode(URLS.heavy, 'heavy')
    ]).then(() => {
      (window.BOTS || []).forEach((b) => { try { adopt(b); } catch (e) {} });
      if (typeof BOTS !== 'undefined') BOTS.forEach((b) => { try { adopt(b); } catch (e) {} });
      return rigs;
    }).catch((e) => { console.warn('rigs', e); rigs.failed = true; return rigs; });
    return rigs._p;
  }

  rigs.ready = ready;
  rigs.build = build;
  rigs.paint = paint;
  rigs.adopt = adopt;
  rigs.tick = tick;
  rigs.load = load;
  RC.rigs = rigs;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => load());
  else load();
})();
