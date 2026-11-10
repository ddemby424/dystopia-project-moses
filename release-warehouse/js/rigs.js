/* CC0 RobotExpressive clips for the candidate's guards and heavies.
   Idle, walk, run, punch, and death crossfade. The root faces travel so the
   feet walk the way the body moves. A spine twist keeps the chest on the player
   while the legs strafe. Flat armor gets the CC0 metal maps. Textured meshes are left alone. */
(function () {
  const RC = (window.RC = window.RC || {});
  const URL = 'robot/models/robot_trooper.glb';
  const rigs = { template: null, bytes: 0, failed: false, pending: [] };

  function ready() { return !!(rigs.template && THREE.SkeletonUtils); }

  function paint(root, kind) {
    if (!root || !RC.realism || !RC.realism.ready) return;
    const src = kind === 'heavy' ? RC.realism.mats.plate : RC.realism.mats.rust;
    if (!src) return;
    root.traverse((o) => {
      if (!o.isMesh || o.userData.rcGlow || o.isSprite) return;
      if (o.userData.rcPainted) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m && (m.emissiveIntensity || 0) > 1.2) return;
      if (o.geometry && o.geometry.getAttribute && o.geometry.getAttribute('color')) o.geometry.deleteAttribute('color');
      const next = src.clone();
      next.vertexColors = false;
      next.roughness = kind === 'heavy' ? 0.42 : 0.55;
      next.metalness = kind === 'heavy' ? 0.78 : 0.62;
      o.material = next;
      o.userData.rcPainted = true;
    });
  }

  function build(kind, label) {
    const tpl = rigs.template;
    const clone = THREE.SkeletonUtils.clone(tpl.scene);
    const root = new THREE.Group();
    root.userData.rcRobot = true;
    root.add(clone);
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const h = Math.max(0.01, box.max.y - box.min.y);
    const target = kind === 'heavy' ? 2.45 : 2.05;
    clone.scale.setScalar(target / h);
    clone.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(clone);
    clone.position.y -= box2.min.y;
    paint(root, kind);
    let head = null;
    let spine = null;
    clone.traverse((o) => {
      if (!o.isBone) return;
      if (/head/i.test(o.name)) head = o;
      if (o.name === 'Spine1' || (o.name === 'Spine' && !spine)) spine = o;
    });
    if (head) {
      const vis = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.045, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xffc48a, emissive: 0xff6a1a, emissiveIntensity: 1.5 })
      );
      vis.position.set(0, 0.06, 0.14);
      vis.userData.rcGlow = true;
      head.add(vis);
    }
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
