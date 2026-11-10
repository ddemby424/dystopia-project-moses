/* Serious armor on the CC0 RobotExpressive skeleton.
   The toy mesh stays in the file so Idle / Walking / Running / Punch / Death
   still crossfade. It is not drawn. Plates hang on the bones instead. */
(function () {
  const RC = (window.RC = window.RC || {});
  const URL = 'robot/models/robot_trooper.glb';
  const rigs = { template: null, bytes: 0, failed: false, pending: [] };
  const GEO = {};

  function geo(key, w, h, d) {
    if (!GEO[key]) GEO[key] = new THREE.BoxGeometry(w, h, d);
    return GEO[key];
  }

  function ready() { return !!(rigs.template && THREE.SkeletonUtils); }

  function plateMat(kind) {
    const src = RC.realism && RC.realism.ready && RC.realism.mats
      ? (kind === 'heavy' ? RC.realism.mats.plate : RC.realism.mats.rust)
      : null;
    const m = src ? src.clone() : new THREE.MeshStandardMaterial({ color: kind === 'heavy' ? 0x8a929c : 0x6e5a48, roughness: 0.48, metalness: 0.72 });
    m.roughness = kind === 'heavy' ? 0.4 : 0.55;
    m.metalness = kind === 'heavy' ? 0.78 : 0.62;
    m.envMapIntensity = 0.55;
    m.userData._bright = true;
    return m;
  }

  function paint(root, kind) {
    if (!root) return;
    const mat = plateMat(kind);
    root.traverse((o) => {
      if (!o.isMesh || o.userData.rcGlow || o.isSprite || !o.userData.v2Armor) return;
      o.material = mat;
    });
  }

  function part(bone, key, w, h, d, x, y, z, mat, glow) {
    if (!bone) return null;
    const mesh = new THREE.Mesh(geo(key, w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.v2Armor = true;
    if (glow) mesh.userData.rcGlow = true;
    bone.add(mesh);
    return mesh;
  }

  function build(kind, label) {
    const tpl = rigs.template;
    const clone = THREE.SkeletonUtils.clone(tpl.scene);
    const root = new THREE.Group();
    root.userData.rcRobot = true;
    root.userData.v2Armor = true;
    root.userData.boneH = 0;
    root.add(clone);
    clone.updateMatrixWorld(true);
    const probe = new THREE.Vector3();
    let minBone = Infinity;
    let maxBone = -Infinity;
    clone.traverse((o) => {
      if (!o.isBone) return;
      o.getWorldPosition(probe);
      if (probe.y < minBone) minBone = probe.y;
      if (probe.y > maxBone) maxBone = probe.y;
    });
    const boneH = Math.max(0.5, maxBone - minBone);
    root.userData.boneH = boneH;
    root.userData.boneMin = minBone;
    root.userData.boneMax = maxBone;
    const target = kind === 'heavy' ? 2.2 : 1.95;
    clone.traverse((o) => {
      if (!o.isMesh) return;
      o.visible = false;
      o.castShadow = false;
      o.userData.rcPainted = true;
    });
    const bones = {};
    clone.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    const pick = (re) => {
      const name = Object.keys(bones).find((n) => re.test(n));
      return name ? bones[name] : null;
    };
    const B = {
      hips: pick(/^Hips$/),
      torso: pick(/Torso/),
      head: pick(/^Head/),
      shL: pick(/ShoulderL/),
      shR: pick(/ShoulderR/),
      uaL: pick(/UpperArmL/),
      uaR: pick(/UpperArmR/),
      laL: pick(/LowerArmL/),
      laR: pick(/LowerArmR/),
      ulL: pick(/UpperLegL/),
      ulR: pick(/UpperLegR/),
      llL: pick(/LowerLegL/),
      llR: pick(/LowerLegR/)
    };
    const plate = plateMat(kind);
    const dark = plate.clone();
    dark.color = new THREE.Color(0x2a3038);
    dark.metalness = 0.8;
    dark.roughness = 0.42;
    const eye = new THREE.MeshStandardMaterial({
      color: 0x1a0000, emissive: 0xff2200, emissiveIntensity: 2.4, roughness: 0.25, metalness: 0.15
    });
    eye.userData._bright = true;
    const bulk = kind === 'heavy' ? 1.12 : 1;
    clone.scale.setScalar(0.01);
    const puppet = new THREE.Group();
    root.add(puppet);
    const hipsG = new THREE.Group(); hipsG.position.y = 0.98; puppet.add(hipsG);
    const torsoG = new THREE.Group(); torsoG.position.y = 0.22; hipsG.add(torsoG);
    const headG = new THREE.Group(); headG.position.y = 0.48; torsoG.add(headG);
    const armL = new THREE.Group(); armL.position.set(-0.34 * bulk, 0.28, 0); torsoG.add(armL);
    const armR = new THREE.Group(); armR.position.set(0.34 * bulk, 0.28, 0); torsoG.add(armR);
    const legL = new THREE.Group(); legL.position.set(-0.14, -0.08, 0); hipsG.add(legL);
    const legR = new THREE.Group(); legR.position.set(0.14, -0.08, 0); hipsG.add(legR);
    function box(parent, w, h, d, x, y, z, mat, glow) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.userData.v2Armor = true;
      mesh.castShadow = false;
      if (glow) mesh.userData.rcGlow = true;
      parent.add(mesh);
    }
    box(hipsG, 0.42 * bulk, 0.24, 0.28, 0, 0, 0, dark);
    box(torsoG, 0.56 * bulk, 0.46, 0.32, 0, 0.16, 0.02, plate);
    box(torsoG, 0.14, 0.14, 0.06, 0, 0.18, 0.18, eye, true);
    box(headG, 0.3, 0.28, 0.3, 0, 0.12, 0, dark);
    box(headG, 0.22, 0.06, 0.06, 0, 0.12, 0.16, eye, true);
    box(armL, 0.16, 0.5, 0.16, 0, -0.22, 0, plate);
    box(armR, 0.16, 0.5, 0.16, 0, -0.22, 0, plate);
    box(armR, 0.1, 0.1, 0.42, 0, -0.42, 0.12, eye, true);
    box(legL, 0.2 * bulk, 0.78, 0.2, 0, -0.4, 0, dark);
    box(legR, 0.2 * bulk, 0.78, 0.2, 0, -0.4, 0, dark);
    root.userData.puppet = { hipsG, torsoG, headG, armL, armR, legL, legR, bones: B };
    const hb = createHealthBarSprite(label || 'Sentinel', false);
    hb.sprite.position.set(0, target + 0.45, 0);
    root.add(hb.sprite);
    const mixer = new THREE.AnimationMixer(clone);
    const actions = {};
    ['Idle', 'Walking', 'Running', 'Punch', 'Death'].forEach((n) => {
      const clip = (tpl.animations || []).find((a) => a.name === n);
      if (!clip) return;
      const act = mixer.clipAction(clip);
      if (n === 'Death' || n === 'Punch') {
        act.setLoop(THREE.LoopOnce, 1);
        act.clampWhenFinished = true;
      }
      actions[n] = act;
    });
    if (actions.Idle) actions.Idle.play();
    const spine = B.torso || bones.Abdomen || B.hips || null;
    return {
      root, mixer, hb, heavy: kind === 'heavy', scale: 1,
      hitRadius: kind === 'heavy' ? 1.05 : 0.85,
      hitHeight: target,
      torso: spine || root,
      leftLeg: legL,
      rightLeg: legR,
      leftArm: armL,
      rightArm: armR,
      clips: { actions, current: actions.Idle ? 'Idle' : '', spine, head: B.head }
    };
  }

  function adopt(b) {
    if (!ready() || !b || b.dying || b.isBoss || (b.clips && b.rig && b.rig.root && b.rig.root.userData.rcRobot)) return;
    const built = build(b.heavy ? 'heavy' : 'guard', b.name);
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
      if (prev && prev !== next) prev.crossFadeTo(next, name === 'Death' ? 0.1 : 0.16, false);
      A.current = name;
    }
    const act = A.actions[A.current];
    if (act && A.current === 'Walking') act.timeScale = Math.max(0.7, Math.min(1.35, moved / 1.55));
    if (act && A.current === 'Running') act.timeScale = Math.max(0.75, Math.min(1.4, moved / 3.5));
    if (act && A.current === 'Idle') act.timeScale = 1;
    b.mixer.update(dt);
    const P = b.rig && b.rig.root && b.rig.root.userData.puppet;
    if (P && P.bones) {
      const copy = (bone, group) => { if (bone && group) group.quaternion.copy(bone.quaternion); };
      copy(P.bones.torso, P.torsoG);
      copy(P.bones.head, P.headG);
      copy(P.bones.uaL, P.armL);
      copy(P.bones.uaR, P.armR);
      copy(P.bones.ulL, P.legL);
      copy(P.bones.ulR, P.legR);
    }
    if (A.spine) {
      const twist = o.twist || 0;
      const hit = b.flinchTimer > 0 ? -0.45 : 0;
      A.spine.rotation.y += twist;
      A.spine.rotation.x += hit * Math.min(1, dt * 10 + 0.35);
    }
    if (o.faceYaw != null && !b.dying) {
      let dy = o.faceYaw - b.rig.root.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      b.rig.root.rotation.y += dy * Math.min(1, dt * 8);
    }
    return { clip: A.current, twist: o.twist || 0 };
  }

  function load() {
    if (rigs.template) return Promise.resolve(rigs);
    return fetch(URL).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.blob();
    }).then((blob) => {
      rigs.bytes = blob.size;
      return blob.arrayBuffer();
    }).then((buf) => new Promise((resolve) => {
      if (typeof THREE.GLTFLoader !== 'function') { rigs.failed = true; resolve(rigs); return; }
      const loader = new THREE.GLTFLoader();
      loader.parse(buf, '', (gltf) => {
        rigs.template = { scene: gltf.scene || gltf.scenes[0], animations: gltf.animations || [] };
        (window.BOTS || []).forEach(adopt);
        resolve(rigs);
      }, () => { rigs.failed = true; resolve(rigs); });
    })).catch(() => { rigs.failed = true; return rigs; });
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
