/* Secret caches. The floor generator places one cracked panel per floor.
   It stays a solid wall until the player shoots it or presses Use.
   There is no label on the wall. A stuttering bulb and a quiet tick are the tell. */
(function () {
  const RC = (window.RC = window.RC || {});
  const secrets = { near: null, found: 0 };

  function doors() { return window.RC_SECRET_DOORS || []; }

  function distTo(d) {
    return Math.hypot(STATE.player.x - d.obj.x, STATE.player.z - d.obj.z);
  }

  function ensureButton() {
    let b = document.getElementById('btn-rc-use');
    if (b) return b;
    b = document.createElement('button');
    b.id = 'btn-rc-use';
    b.type = 'button';
    b.textContent = 'USE';
    b.hidden = true;
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (secrets.near) open(secrets.near, 'touch'); });
    document.body.appendChild(b);
    return b;
  }

  function open(d, how) {
    if (!d || d.open) return;
    d.open = true;
    d.how = how;
    colliders = colliders.filter((c) => c !== d.col);
    d.mesh.userData.opening = true;
    if (d.bulb) d.bulb.intensity = 1.2;
    if (d.bulbMesh && d.bulbMesh.material && d.bulbMesh.material.emissiveIntensity != null) d.bulbMesh.material.emissiveIntensity = 1.6;
    if (!d.reward) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.4), new THREE.MeshStandardMaterial({ color: 0x8a8d92, roughness: 0.45, metalness: 0.7 }));
      box.position.set(d.rx, 0.48, d.rz);
      arenaGroup.add(box);
      d.reward = box;
    }
    secrets.found++;
    if (typeof showBanner === 'function') showBanner('CACHE', 'The panel lifts. A locker is inside.', 2200);
    try { if (window.SFX) SFX.playKeyPickup(); } catch (e) {}
    try { if (typeof buildNavGrid === 'function') buildNavGrid(); } catch (e) {}
  }

  function update(dt) {
    const list = doors();
    const btn = ensureButton();
    let near = null;
    list.forEach((d) => {
      if (d.bulb && !d.open) {
        const flick = Math.sin(performance.now() * 0.02 + d.obj.x) > 0.35 ? 0.85 : 0.04;
        d.bulb.intensity = flick;
        if (d.bulbMesh && d.bulbMesh.material) d.bulbMesh.material.emissiveIntensity = flick > 0.4 ? 1.3 : 0.05;
      }
      if (!d.open && d.mesh && d.mesh.userData.opening) { /* opened this frame */ }
      if (d.open && d.mesh) {
        const target = (d.obj.h || 3.2) + 0.4;
        d.mesh.position.y += (target - d.mesh.position.y) * Math.min(1, dt * 3);
      }
      if (!d.open) {
        const dd = distTo(d);
        if (dd < 2.5) near = d;
        if (dd < 9 && (d._beep = (d._beep || 0) - dt) <= 0) {
          d._beep = 2.4;
          try { if (window.SFX && SFX.playBeep) SFX.playBeep(420); } catch (e) {}
        }
        (window.PROJECTILES || []).forEach((p) => {
          if (!p.fromPlayer || d.open) return;
          if (Math.hypot(p.x - d.obj.x, p.z - d.obj.z) < 1.15 && p.y < 3.2) open(d, 'shot');
        });
      }
      if (d.open && d.reward && !d.looted) {
        if (Math.hypot(STATE.player.x - d.rx, STATE.player.z - d.rz) < 1.4) {
          d.looted = true;
          if (d.reward && d.reward.material && d.reward.material.emissive) {
            d.reward.material.emissive.setHex(0x14301c);
            d.reward.material.emissiveIntensity = 0.4;
          }
          STATE.player.armor = Math.min(STATE.player.maxArmor || 100, (STATE.player.armor || 0) + 35);
          if (typeof addScore === 'function') addScore(250, 'CACHE', null);
          if (typeof updateHUD === 'function') updateHUD();
          if (typeof showBanner === 'function') showBanner('ARMOR', '+35 from the locker.', 1600);
        }
      }
    });
    if (!near && KEYS && KEYS.KeyE) {
      list.forEach((d) => { if (!d.open && distTo(d) < 2.5) near = d; });
    }
    secrets.near = near && !near.open ? near : null;
    if (secrets.near && KEYS && KEYS.KeyE) open(secrets.near, 'key');
    btn.hidden = !secrets.near;
  }

  function install() {
    if (typeof drawMinimap === 'function' && !drawMinimap.__secret) {
      const prev = drawMinimap;
      drawMinimap = function () {
        const ret = prev.apply(this, arguments);
        try {
          const mc = document.getElementById('minimap-canvas');
          if (!mc) return ret;
          const ctx = mc.getContext('2d');
          doors().forEach((d) => {
            if (d.open) return;
            if (Math.hypot(STATE.player.x - d.obj.x, STATE.player.z - d.obj.z) > 16) return;
            const scale = 0.48, cx = mc.width / 2, cy = mc.height / 2;
            ctx.fillStyle = 'rgba(250, 204, 21, 0.45)';
            ctx.fillRect(cx + d.obj.x * scale - 2, cy + d.obj.z * scale - 2, 4, 4);
          });
        } catch (e) {}
        return ret;
      };
      drawMinimap.__secret = true;
      window.drawMinimap = drawMinimap;
    }
  }

  function catalog() {
    const out = [];
    for (let f = 0; f < 4; f++) {
      const lay = genFloorLayout(1, f);
      const s = lay.secret || {};
      out.push({
        floor: f,
        name: ['G', 'B1', 'B2', 'B3'][f],
        x: s.x, z: s.z, ax: s.ax, az: s.az, rx: s.rx, rz: s.rz,
        where: s.where, tell: s.tell, fallback: !!s.fallback
      });
    }
    return out;
  }

  secrets.update = update;
  secrets.open = open;
  secrets.install = install;
  secrets.catalog = catalog;
  secrets.spot = secretSpot;
  RC.secrets = secrets;
  install();
})();
