/* CC BY 4.0 guards.
   Common: Robot by DJMaesen. Heavy: Biped robot by Willy Decarpentrie.
   Unquantized WebP glbs. Clips are slices of one timeline, named so the
   campaign still crossfades Idle, Walking, Running, Punch, and Death. */
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

  function hideHelpers(root) {
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const name = ((o.name || '') + ' ' + ((o.parent && o.parent.name) || '')).toLowerCase();
      if (/ground|plane|shadow|disc|circle/.test(name)) { o.visible = false; return; }
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      if (!b) return;
      const dims = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].sort((a, c) => a - c);
      /* Sketchfab rigs ship a flat yellow catch-disc under the pose. */
      if (dims[2] > 0.8 && dims[0] < dims[2] * 0.08) o.visible = false;
    });
  }

  function plainStandard(m) {
    if (!m || !m.isGLTFSpecularGlossinessMaterial) return m;
    const metal = /metal/i.test(m.name || '');
    const std = new THREE.MeshStandardMaterial({
      name: m.name || 'standard',
      color: m.color ? m.color.clone() : new THREE.Color(0xb8b2a6),
      map: m.map || null,
      normalMap: m.normalMap || null,
      roughness: metal ? 0.42 : 0.58,
      metalness: metal ? 0.7 : 0.16,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 1,
      aoMap: m.aoMap || null,
      skinning: true,
      side: m.side
    });
    if (m.normalScale) std.normalScale.copy(m.normalScale);
    return std;
  }

  function menace(root) {
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      list.forEach((m) => {
        if (!m || !m.color || !m.isMeshStandardMaterial) return;
        if (m.isGLTFSpecularGlossinessMaterial) {
          m.color.multiply(new THREE.Color(0.82, 0.74, 0.62));
          return;
        }
        const named = /visor|eye|glow|light|emissive|lamp|screen/i.test(m.name || '');
        const warm = m.color.r > 0.55 && m.color.g > 0.35 && m.color.r > m.color.b + 0.15;
        if (warm || named) {
          m.emissive.setHex(0xff2a12);
          m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, 1.8);
          m.color.multiply(new THREE.Color(1.1, 0.45, 0.2));
        } else {
          m.color.multiply(new THREE.Color(0.62, 0.58, 0.54));
          if (m.metalness != null) m.metalness = Math.min(0.88, Math.max(m.metalness || 0, 0.42));
          if (m.roughness != null) m.roughness = Math.min(0.72, Math.max(m.roughness || 0.5, 0.38));
        }
        m.envMapIntensity = Math.min(m.envMapIntensity || 0.5, 0.45);
        m.needsUpdate = true;
      });
    });
  }

  function addVisor(root) {
    let bone = null;
    root.traverse((o) => {
      if (!o.isBone) return;
      if (/head/i.test(o.name)) bone = o;
      else if (!bone && /chest|neck/i.test(o.name)) bone = o;
    });
    if (!bone) return;
    const k = 1 / Math.max(1e-4, root.scale.x);
    const eye = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.045, 0.025),
      new THREE.MeshStandardMaterial({ color: 0x1a0000, emissive: 0xff2200, emissiveIntensity: 2.6, roughness: 0.22 })
    );
    eye.userData.rcGlow = true;
    eye.name = 'v2-visor';
    eye.scale.setScalar(k);
    eye.position.set(0, 0.04 * k, 0.12 * k);
    eye.castShadow = false;
    eye.frustumCulled = false;
    bone.add(eye);
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

  function note(msg) {
    try { if (RC.v2 && RC.v2.debug) RC.v2.debug(msg); } catch (e) {}
  }

  function boneBudget() {
    try {
      const cap = renderer.capabilities;
      if (cap.floatVertexTextures) return 56;
      const n = cap.maxVertexUniforms || 128;
      return Math.max(12, Math.min(28, Math.floor((n - 24) / 4)));
    } catch (e) { return 24; }
  }

  function read4(attr, i) {
    return [attr.getX(i), attr.getY(i), attr.getZ(i), attr.getW(i)];
  }

  function write4(attr, i, v) {
    attr.setX(i, v[0]); attr.setY(i, v[1]); attr.setZ(i, v[2]); attr.setW(i, v[3]);
  }

  function remapInfluence(mesh, removeAt, parentAt) {
    const si = mesh.geometry.attributes.skinIndex;
    const sw = mesh.geometry.attributes.skinWeight;
    if (!si || !sw) return;
    const parent = parentAt > removeAt ? parentAt - 1 : parentAt;
    for (let i = 0; i < si.count; i++) {
      const idx = read4(si, i);
      const w = read4(sw, i);
      for (let k = 0; k < 4; k++) {
        if (idx[k] === removeAt) idx[k] = parent;
        else if (idx[k] > removeAt) idx[k] -= 1;
      }
      const acc = [0, 0, 0, 0];
      const map = {};
      for (let k = 0; k < 4; k++) {
        if (!w[k]) continue;
        map[idx[k]] = (map[idx[k]] || 0) + w[k];
      }
      const keys = Object.keys(map);
      for (let k = 0; k < 4; k++) {
        if (k < keys.length) { idx[k] = +keys[k]; acc[k] = map[keys[k]]; }
        else { idx[k] = 0; acc[k] = 0; }
      }
      write4(si, i, idx);
      write4(sw, i, acc);
    }
    si.needsUpdate = true;
    sw.needsUpdate = true;
  }

  function fitBones(root) {
    const budget = boneBudget();
    const meshes = [];
    let skeleton = null;
    root.traverse((o) => { if (o.isSkinnedMesh && o.skeleton) { meshes.push(o); skeleton = o.skeleton; } });
    if (!skeleton) return { bones: 0, budget, dropped: 0, fallback: false };
    let dropped = 0;
    const prefer = /finger|thumb|toe|pole|goal|helper|end$/i;
    while (skeleton.bones.length > budget) {
      let idx = -1;
      const bones = skeleton.bones;
      for (let i = bones.length - 1; i >= 1; i--) {
        const b = bones[i];
        if (b.children.some((c) => c.isBone)) continue;
        if (prefer.test(b.name || '')) { idx = i; break; }
        if (idx < 0) idx = i;
      }
      if (idx < 1) break;
      const bone = bones[idx];
      const pidx = bones.indexOf(bone.parent);
      if (pidx < 0) break;
      meshes.forEach((m) => remapInfluence(m, idx, pidx));
      bone.parent.remove(bone);
      bones.splice(idx, 1);
      if (skeleton.boneInverses) skeleton.boneInverses.splice(idx, 1);
      dropped++;
    }
    let fallback = false;
    if (skeleton.bones.length > budget) {
      meshes.forEach((o) => {
        const mat = Array.isArray(o.material) ? o.material[0].clone() : o.material.clone();
        mat.skinning = false;
        const mesh = new THREE.Mesh(o.geometry, mat);
        mesh.name = 'v2-body-fallback';
        mesh.frustumCulled = false;
        mesh.castShadow = false;
        o.parent.add(mesh);
        o.visible = false;
      });
      fallback = true;
    }
    return { bones: skeleton.bones.length, budget, dropped, fallback };
  }

  function prepare(kind, gltf) {
    const scene = gltf.scene || gltf.scenes[0];
    hideHelpers(scene);
    scene.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (Array.isArray(o.material)) o.material = o.material.map(plainStandard);
      else o.material = plainStandard(o.material);
    });
    const bones = fitBones(scene);
    note(kind + ' bones ' + bones.bones + '/' + bones.budget + ' dropped ' + bones.dropped + (bones.fallback ? ' FALLBACK' : ''));
    menace(scene);
    fit(scene, kind === 'heavy' ? 2.35 : 2.05);
    addVisor(scene);
    const src = (gltf.animations || [])[0];
    const ranges = RANGES[kind];
    const clips = {};
    if (src) {
      Object.keys(ranges).forEach((name) => {
        clips[name] = sliceClip(src, name, ranges[name][0], ranges[name][1]);
      });
    }
    scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.frustumCulled = !o.isSkinnedMesh;
    });
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
    }).catch((e) => { console.warn('rigs', e); rigs.failed = true; note('rig load failed ' + (e && e.message ? e.message : e)); return rigs; });
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
