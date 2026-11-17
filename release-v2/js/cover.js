/* Destructible cover for the hall and yard.
   Three stages: intact, damaged at half health, destroyed.
   Stats follow the DISTRICT-04 staging list. The look is worn industrial, not that app. */
(function () {
  const RC = (window.RC = window.RC || {});
  const items = [];
  const SPECS = {
    barrier: { w: 2.6, h: 1.15, d: 0.85, hp: 120 },
    crate: { w: 1.45, h: 1.45, d: 1.45, hp: 65 },
    drum: { w: 0.95, h: 1.35, d: 0.95, hp: 45, boom: true },
    sandbag: { w: 2.8, h: 1.2, d: 0.95, hp: 100 },
    glass: { w: 2.2, h: 2.1, d: 0.18, hp: 75 }
  };

  function tex(paint, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    paint(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  const MAPS = {};
  function maps() {
    if (MAPS.ready) return MAPS;
    MAPS.concrete = tex((g, w, h) => {
      g.fillStyle = '#3e3c38'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 80; i++) {
        g.fillStyle = i % 3 ? 'rgba(30,28,26,0.35)' : 'rgba(120,116,108,0.25)';
        g.fillRect(Math.random() * w, Math.random() * h, 8 + Math.random() * 30, 2);
      }
    }, 128, 128);
    MAPS.crate = tex((g, w, h) => {
      g.fillStyle = '#241e18'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#1c1916'; g.lineWidth = 6;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = '#6a5a40'; g.fillRect(18, h * 0.42, w - 36, 10);
    }, 128, 128);
    MAPS.drum = tex((g, w, h) => {
      g.fillStyle = '#3a1612'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1a1a1a'; g.fillRect(0, h * 0.38, w, h * 0.18);
      g.fillStyle = '#c4a15a';
      for (let x = -20; x < w; x += 18) g.fillRect(x, h * 0.4, 8, h * 0.14);
      g.fillStyle = '#d6d0c4'; g.font = '700 18px sans-serif'; g.fillText('FLAMMABLE', 16, h * 0.72);
    }, 128, 128);
    MAPS.sand = tex((g, w, h) => {
      g.fillStyle = '#4a4634'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#3a3428'; g.lineWidth = 3;
      for (let y = 8; y < h; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 4); g.stroke(); }
    }, 128, 64);
    MAPS.hazard = tex((g, w, h) => {
      g.fillStyle = '#1a1610'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b8862a';
      for (let x = -16; x < w + 16; x += 16) g.fillRect(x, 0, 8, h);
    }, 64, 16);
    MAPS.ready = true;
    return MAPS;
  }

  function sharedLip() {
    if (!sharedLip.m) sharedLip.m = mat(null, 0x1a1816, 0.55, 0.62);
    return sharedLip.m;
  }
  function sharedStripe(M) {
    if (!sharedStripe.m) sharedStripe.m = mat(M.hazard, 0xffffff, 0.7, 0.12);
    return sharedStripe.m;
  }

  function mat(map, color, rough, metal) {
    const m = new THREE.MeshStandardMaterial({ map: map, color: color || 0xffffff, roughness: rough, metalness: metal });
    m.userData.v2Plain = true;
    m.userData._rim = true;
    return m;
  }

  function box(w, h, d, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  }

  function build(kind) {
    const s = SPECS[kind];
    const M = maps();
    const intact = new THREE.Group();
    const damaged = new THREE.Group();
    const rubble = new THREE.Group();
    const lip = sharedLip();
    const stripe = sharedStripe(M);
    if (kind === 'drum') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(s.w / 2, s.w / 2, s.h, 12), mat(M.drum, 0xffffff, 0.62, 0.35));
      body.position.y = s.h / 2;
      intact.add(body);
      [0.08, s.h - 0.08].forEach((y) => {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(s.w / 2, 0.035, 6, 12), lip);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = y;
        intact.add(rim);
      });
      const dent = body.clone();
      dent.scale.set(1, 0.82, 0.9);
      dent.position.y = s.h * 0.4;
      damaged.add(dent);
      const scrap = box(0.45, 0.2, 0.45, mat(M.drum, 0x888888, 0.8, 0.2));
      scrap.position.y = 0.1;
      rubble.add(scrap);
    } else if (kind === 'sandbag') {
      const bag = mat(M.sand, 0xffffff, 0.92, 0.02);
      for (let i = 0; i < 4; i++) {
        const b = box(s.w * 0.48, 0.28, s.d * 0.9, bag);
        b.position.set((i % 2 ? 0.55 : -0.55), 0.16 + Math.floor(i / 2) * 0.3, (i % 2 ? -0.05 : 0.05));
        intact.add(b);
      }
      intact.children.forEach((c, i) => { if (i < 3) damaged.add(c.clone()); });
      const pile = box(0.7, 0.22, 0.5, bag);
      pile.position.y = 0.11;
      rubble.add(pile);
    } else if (kind === 'glass') {
      const frame = mat(null, 0x2a2826, 0.45, 0.55);
      const pane = new THREE.MeshStandardMaterial({ color: 0x8aa0a8, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.28 });
      pane.userData.v2Plain = true;
      const sill = box(s.w, 0.08, s.d, frame);
      sill.position.y = 0.04;
      intact.add(sill);
      const glass = box(s.w - 0.16, s.h - 0.2, 0.04, pane);
      glass.position.y = s.h / 2;
      intact.add(glass);
      [-1, 1].forEach((side) => {
        const post = box(0.08, s.h, s.d, frame);
        post.position.set(side * (s.w / 2 - 0.04), s.h / 2, 0);
        intact.add(post);
      });
      const cracked = box(s.w * 0.55, s.h * 0.4, 0.04, pane);
      cracked.position.y = s.h * 0.35;
      damaged.add(cracked);
      rubble.add(box(0.3, 0.08, 0.12, frame));
    } else {
      const map = kind === 'crate' ? M.crate : M.concrete;
      const body = box(s.w, s.h, s.d, mat(map, 0xffffff, kind === 'crate' ? 0.8 : 0.92, 0.08));
      body.position.y = s.h / 2;
      intact.add(body);
      const cap = box(s.w + 0.04, 0.05, s.d + 0.04, lip);
      cap.position.y = s.h;
      intact.add(cap);
      const band = box(s.w + 0.02, 0.07, 0.04, stripe);
      band.position.set(0, s.h * 0.72, s.d / 2 + 0.01);
      intact.add(band);
      const chip = box(s.w * 0.72, s.h * 0.62, s.d * 0.9, mat(map, 0xcccccc, 0.9, 0.08));
      chip.position.set(s.w * 0.08, s.h * 0.32, 0);
      damaged.add(chip);
      const rock = box(s.w * 0.35, 0.22, s.d * 0.4, mat(map, 0xaaaaaa, 0.95, 0.05));
      rock.position.y = 0.11;
      rubble.add(rock);
    }
    damaged.visible = false;
    rubble.visible = false;
    return { intact, damaged, rubble };
  }

  function aabb(x, z, y, w, h, d, rot) {
    const swap = Math.abs(Math.sin(rot || 0)) > 0.7;
    const hw = (swap ? d : w) / 2;
    const hd = (swap ? w : d) / 2;
    return { minX: x - hw, maxX: x + hw, minY: y, maxY: y + h, minZ: z - hd, maxZ: z + hd, cover: true };
  }

  function placeOne(kind, x, y, z, rot) {
    const s = SPECS[kind];
    const parts = build(kind);
    const g = new THREE.Group();
    g.name = 'rc-cover';
    g.position.set(x, y, z);
    g.rotation.y = rot || 0;
    g.userData.v2Keep = true;
    g.add(parts.intact, parts.damaged, parts.rubble);
    (typeof arenaGroup !== 'undefined' ? arenaGroup : scene).add(g);
    const col = aabb(x, z, y, s.w, s.h, s.d, rot);
    colliders.push(col);
    const item = { kind, x, y, z, hp: s.hp, max: s.hp, stage: 0, g, col, boom: !!s.boom };
    Object.assign(item, parts);
    items.push(item);
    return item;
  }

  function setStage(it, stage) {
    it.stage = stage;
    it.intact.visible = stage === 0;
    it.damaged.visible = stage === 1;
    it.rubble.visible = stage === 2;
    if (stage === 2) {
      colliders = colliders.filter((c) => c !== it.col);
      try { buildNavGrid(); } catch (e) {}
    }
  }

  function hurt(it, dmg) {
    if (!it || it.stage === 2 || it._boom) return;
    it.hp -= dmg;
    if (it.hp <= 0) {
      if (it.boom) {
        it._boom = true;
        setStage(it, 2);
        triggerExplosion(it.x, it.y + 0.7, it.z, 6.5, 55);
      } else setStage(it, 2);
    } else if (it.hp <= it.max * 0.5 && it.stage === 0) setStage(it, 1);
  }

  function hit(x, y, z, dmg) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.stage === 2) continue;
      const c = it.col;
      if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && y >= c.minY - 0.2 && y <= c.maxY + 0.3) {
        hurt(it, dmg);
        return true;
      }
    }
    return false;
  }

  function blast(x, z, radius, dmg) {
    items.forEach((it) => {
      if (it.stage === 2) return;
      const d = Math.hypot(it.x - x, it.z - z);
      if (d < radius && d > 0.35) hurt(it, Math.round(dmg * (1 - d / radius)));
    });
  }

  function spawnFloor() {
    if ((STATE.floor || 0) !== 0 || items.length) return;
    /* Hall chokepoints and the approaches to the new doors. */
    placeOne('barrier', -22, 0, 56, 0.2);
    placeOne('crate', -20, 0, 58, 0.4);
    placeOne('drum', -18.2, 0, 59.4, 0);
    placeOne('sandbag', 30, 0, 66, 0.1);
    placeOne('crate', 33, 0, 64, 0);
    placeOne('drum', 31.2, 0, 67, 0);
    placeOne('barrier', -34, 0, 66, 0);
    placeOne('crate', 6, 0, 18, 0.3);
    placeOne('glass', -6, 0, 22, 0);
    /* Mezzanine sandbags on the west catwalk. */
    placeOne('sandbag', -84.2, 4.6, 8, 0);
    /* Yard, beside the exits, so a grenade outside still chains. */
    placeOne('crate', 30, 0, 100, 0.2);
    placeOne('drum', 32.2, 0, 101, 0);
    placeOne('barrier', -20, 0, 102, 1.2);
    placeOne('drum', -16, 0, 104, 0);
    try { buildNavGrid(); } catch (e) {}
  }

  RC.cover = { hit, blast, hurt, spawnFloor, items, placeOne };
})();
