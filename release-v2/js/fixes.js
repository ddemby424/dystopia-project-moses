/* DYSTOPIA release candidate — weak points follow the skeleton.
   The legacy marker added a slice of the Colossus height in front of the
   mesh, so the glow floated ahead of the body. This version uses the bone
   (or the cannon) world position and only pulls the marker back when it is
   wildly off the whole creature. Limb swing is left alone. */
(function () {
  const RC = (window.RC = window.RC || {});
  const q = new THREE.Quaternion();
  const nudge = new THREE.Vector3();

  function absurdLimit(C) {
    return Math.max((C.rad || 1.6) * 2.2, C.height * 0.55);
  }

  /* Safety net for a broken bone, not a disk that pins every marker to the root. */
  function clampToHull(C, out) {
    const dx = out.x - C.root.position.x;
    const dz = out.z - C.root.position.z;
    const dist = Math.hypot(dx, dz);
    const limit = absurdLimit(C);
    if (dist > limit) {
      const k = limit / dist;
      out.x = C.root.position.x + dx * k;
      out.z = C.root.position.z + dz * k;
    }
    const minY = C.root.position.y + 0.12;
    const maxY = C.root.position.y + C.height * 1.08;
    if (out.y < minY) out.y = minY;
    if (out.y > maxY) out.y = maxY;
    return out;
  }

  function softSpotWorld(C, sp, out) {
    const d = sp.def;
    const H = C.height;
    if (d.cannon && C.cannon) {
      C.cannon.updateMatrixWorld(true);
      out.set(0, 0.02, 0.12).applyMatrix4(C.cannon.matrixWorld);
    } else if (sp.bone) {
      sp.bone.updateMatrixWorld(true);
      sp.bone.getWorldPosition(out);
      const o = d.off || [0, 0, 0];
      sp.bone.getWorldQuaternion(q);
      nudge.set(o[0], o[1], o[2]).applyQuaternion(q).multiplyScalar(0.12);
      out.add(nudge);
    } else {
      const yaw = C.root.rotation.y, cs = Math.cos(yaw), sn = Math.sin(yaw);
      const lx = d.frac[0] * H;
      const ly = d.frac[1] * H;
      const lz = d.frac[2] * H * 0.25;
      out.set(
        C.root.position.x + lx * cs + lz * sn,
        C.root.position.y + ly,
        C.root.position.z - lx * sn + lz * cs
      );
    }
    return clampToHull(C, out);
  }

  function install() {
    if (typeof window.softSpotWorld === 'function' || typeof softSpotWorld === 'function') {
      try { RC._softSpotWorld = softSpotWorld; } catch (e) {}
    }
    window.softSpotWorld = softSpotWorld;
    try { window.softSpotWorld = softSpotWorld; } catch (e) {}
    /* The legacy function binding is `function softSpotWorld`. Reassign it. */
    try {
      // eslint-disable-next-line no-global-assign
      window.softSpotWorld = softSpotWorld;
    } catch (e) {}
  }

  /* install() below assigns the script-level binding created by game.js. */
  RC.fixes = { softSpotWorld, clampToHull, install, absurdLimit };
})();
