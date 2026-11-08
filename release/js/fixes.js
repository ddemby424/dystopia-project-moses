/* DYSTOPIA release candidate — release blockers that must not change
   the legacy entry. The weak-point markers used to add a fraction of the
   Colossus height along the facing axis, so the glows sat in front of the
   mesh ("floated ahead"). Bone position is the anchor; the facing component
   is then clamped to a few tenths of a metre. */
(function () {
  const RC = (window.RC = window.RC || {});
  const q = new THREE.Quaternion();
  const nudge = new THREE.Vector3();

  function facing(C) {
    const yaw = C.root.rotation.y;
    return { fx: Math.sin(yaw), fz: Math.cos(yaw) };
  }

  function clampToHull(C, out) {
    const f = facing(C);
    const rx = f.fz, rz = -f.fx;
    const dx = out.x - C.root.position.x;
    const dz = out.z - C.root.position.z;
    let ahead = dx * f.fx + dz * f.fz;
    let side = dx * rx + dz * rz;
    const maxAhead = Math.min(0.42, Math.max(0.22, (C.rad || 1.6) * 0.28));
    const maxSide = Math.max(C.rad || 1.6, C.height * 0.16);
    if (ahead > maxAhead) ahead = maxAhead;
    if (ahead < -maxAhead * 0.65) ahead = -maxAhead * 0.65;
    if (side > maxSide) side = maxSide;
    if (side < -maxSide) side = -maxSide;
    out.x = C.root.position.x + f.fx * ahead + rx * side;
    out.z = C.root.position.z + f.fz * ahead + rz * side;
    const minY = C.root.position.y + Math.max(0.35, (C.rad || 1) * 0.25);
    const maxY = C.root.position.y + C.height * 0.96;
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
      nudge.set(o[0], o[1], o[2]).applyQuaternion(q).multiplyScalar(0.22);
      out.add(nudge);
    } else {
      const yaw = C.root.rotation.y, cs = Math.cos(yaw), sn = Math.sin(yaw);
      const lx = d.frac[0] * H * 0.55;
      const ly = d.frac[1] * H;
      const lz = d.frac[2] * Math.min(0.35, H * 0.02);
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
  RC.fixes = { softSpotWorld, clampToHull, install, maxAhead(C) { return Math.min(0.42, Math.max(0.22, (C.rad || 1.6) * 0.28)); } };
})();
