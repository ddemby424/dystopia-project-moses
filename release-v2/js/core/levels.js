/* DYSTOPIA candidate — levels and progression.
   This file is what the release page runs. The legacy page still uses game.js.
   Floor generation, the map build, floor start, the elevator, and advanceFloor live here. Edit the campaign table in tuning.js.
*/
function genFloorLayout(level, floor) {
  const rnd = seededRng(level * 97 + floor * 13 + 7);
  const O = []; let id = 0;
  const add = (type, x, z, extra = {}) => O.push({ id: `${type}-${id++}`, type, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, rot: 0, color: '#facc15', ...extra });
  const info = { start: { x: 0, z: 70, yaw: 0 }, exit: { x: 0, z: -76 }, spawnZone: { minX: -80, maxX: 80, minZ: -68, maxZ: 30 }, activateZ: null };
  const mirror = level % 2 === 0 ? -1 : 1;
  const fl = FLOOR_NAMES[floor];
  const miniH = Math.min(11.5, 8 + 0.5 * floor + 0.3 * (level - 1));
  if (floor === 0) {
    info.start = { x: 0, z: 79, yaw: 0 }; info.activateZ = 46; info.spawnZone = { minX: -78, maxX: 78, minZ: -66, maxZ: 26 };
    // holding cell
    add('wall', -5.5, 77, { w: 1, d: 10, h: 5, color: '#64748b' }); add('wall', 5.5, 77, { w: 1, d: 10, h: 5, color: '#64748b' });
    add('wall', 0, 82.5, { w: 12, d: 1, h: 5, color: '#64748b' });
    add('celldoor', 0, 72, { w: 10, d: 0.4, h: 4.2 });
    add('bench', -3.9, 78.5, { rot: Math.PI / 2 }); add('lamp', 0, 77, { color: 0xff4a3a });
    add('terminal', 4.9, 75.5, { rot: -Math.PI / 2, color: '#22d3ee', hack: true });
    add('sign', 0, 81.9, { y: 3.4, rot: Math.PI, title: 'HOLDING CELL 3', sub: 'DETAINEE · DC-09 INTAKE', color: '#ef4444', w: 5 });
    add('sign', 0, 71.6, { y: 4.7, rot: Math.PI, title: 'HOLDING CELL 3', sub: '', color: '#ef4444', w: 3.5 });
    // aisle to main warehouse
    add('wall', -4.5, 59.5, { w: 1, d: 25, h: 6, color: '#475569' }); add('wall', 4.5, 59.5, { w: 1, d: 25, h: 6, color: '#475569' });
    add('wall', -46.25, 47, { w: 83.5, d: 1, h: 10, color: '#475569' }); add('wall', 46.25, 47, { w: 83.5, d: 1, h: 10, color: '#475569' });
    add('sign', 3.95, 64, { y: 3.2, rot: -Math.PI / 2, title: 'DATA CENTER 09', sub: '▲ SERVER HALL G · SECURITY', color: '#38bdf8', w: 4.5 });
    add('sign', -3.95, 56, { y: 3.2, rot: Math.PI / 2, title: 'RESTRICTED', sub: 'AUTHORIZED PERSONNEL ONLY', color: '#ef4444', w: 4.5 });
    add('sign', 0, 47.6, { y: 5.3, rot: 0, title: 'SERVER HALL G', sub: 'DATA CENTER 09 · LEVEL ' + level, color: '#facc15', w: 7 });
    add('celldoorprop', -4.0, 62, { rot: Math.PI / 2 }); add('celldoorprop', 4.0, 57, { rot: -Math.PI / 2 });
    add('sign', -3.95, 66.5, { y: 4.2, rot: Math.PI / 2, title: 'CELL 2', sub: '', color: '#ef4444', w: 2.4 }); add('sign', 3.95, 52.5, { y: 4.2, rot: -Math.PI / 2, title: 'CELL 4', sub: '', color: '#ef4444', w: 2.4 });
    add('extinguisher', -3.9, 69, { rot: Math.PI / 2 }); add('extinguisher', 3.9, 52, { rot: -Math.PI / 2 });
    add('seccam', 3.95, 70.5, { rot: -Math.PI / 2, camY: 4.2 }); add('seccam', -3.95, 49, { rot: Math.PI / 2, camY: 4.2 });
    add('powerbox', 3.95, 60.5, { rot: -Math.PI / 2 }); add('airduct', 2.6, 59.5, { len: 23, ductY: 5.6 });
    // security checkpoint
    add('desk', -9, 39, { rot: 0 }); add('monitors', -9, 38.9, { y: 1.1, rot: 0 }); add('chair', -9, 37.2, { rot: Math.PI });
    add('desk', 9, 39, { rot: 0 }); add('monitors', 9, 38.9, { y: 1.1, rot: 0 }); add('chair', 9, 37.2, { rot: Math.PI });
    add('cabinet', -16, 45.5, { rot: Math.PI }); add('cabinet', -17.2, 45.5, { rot: Math.PI }); add('cabinet', 16, 45.5, { rot: Math.PI });
    add('terminal', 5.2, 46.4, { rot: Math.PI, color: '#a3e635' });
    add('sign', -9, 46.4, { y: 4.2, rot: Math.PI, title: 'SECURITY DESK', sub: 'ALL VISITORS MUST SIGN IN', color: '#38bdf8', w: 5 });
    add('sign', 30, 46.4, { y: 5, rot: Math.PI, title: 'DATA CENTER 09', sub: 'PROJECT MOSES · TIER IV', color: '#facc15', w: 8 });
    // server rack rows west/east of the colossus
    for (let r = 0; r < 7; r++) {
      const z = 28 - r * 12 + (rnd() - 0.5) * 2;
      [-1, 1].forEach(s => {
        const gap = 6 + rnd() * 10;
        const segA = 20 + rnd() * 10;
        add('rackrow', s * (24 + segA / 2), z, { w: segA, d: 1.2, h: 2.4, tray: true });
        const segB = 60 - segA - gap; if (segB > 6) add('rackrow', s * (24 + segA + gap + segB / 2), z, { w: segB, d: 1.2, h: 2.4, tray: true });
      });
    }
    add('colossus', 0, -6, { h: 28 });
    add('sign', 0, -83.4, { y: 8, rot: 0, title: 'STAIRWELL ▼ B1', sub: 'CLEAR FLOOR TO UNLOCK', color: '#22c55e', w: 8 });
    add('ups', -10, -72); add('ups', -12, -72); add('ups', 10, -72); add('ups', 12, -72);
    add('crac', -87, 0, { rot: Math.PI / 2 }); add('crac', 87, 0, { rot: -Math.PI / 2 }); add('crac', -87, -30, { rot: Math.PI / 2 }); add('crac', 87, -30, { rot: -Math.PI / 2 });
  } else if (floor === 1) {
    // dense server farm: rows along Z with cross-aisles
    const cross = [44 + (rnd() - 0.5) * 8, 4 + (rnd() - 0.5) * 10, -40 + (rnd() - 0.5) * 8];
    const pitch = 7 + Math.floor(rnd() * 3);
    for (let x = -80; x <= 80; x += pitch) {
      if (Math.abs(x) < 6) continue;
      let zs = [64, ...cross.flatMap(c => [c + 3.5, c - 3.5]), -66];
      for (let i = 0; i < zs.length; i += 2) {
        const a = zs[i], b = zs[i + 1]; const len = a - b; if (len < 5) continue;
        add('rackrow', x, (a + b) / 2, { w: len, d: 1.2, h: 2.6, rot: Math.PI / 2, tray: rnd() < 0.6 });
      }
    }
    add('colossus', 0, -20, { h: miniH, mini: true });
    cross.forEach((c, i) => add('sign', -6.2, c, { y: 3.6, rot: Math.PI / 2, title: 'SERVER HALL B1', sub: `AISLE ${String.fromCharCode(65 + i)} · HOT/COLD`, color: '#38bdf8', w: 5 }));
    add('sign', 0, -83.4, { y: 6, rot: 0, title: 'STAIRWELL ▼ B2', sub: 'COOLING PLANT', color: '#22c55e', w: 7 });
    add('sign', 0, 83.4, { y: 6, rot: Math.PI, title: 'FLOOR B1', sub: 'SERVER FARM · LEVEL ' + level, color: '#facc15', w: 7 });
    for (let i = 0; i < 6; i++) add('extinguisher', mirror * (-5.8), 60 - i * 24, { rot: Math.PI / 2 });
    for (let i = 0; i < 3; i++) { add('powerbox', mirror * (-5.8), 48 - i * 48, { rot: Math.PI / 2 }); add('seccam', mirror * (-5.8), 36 - i * 48, { rot: Math.PI / 2, camY: 4.4 }); }
    for (let i = 0; i < 4; i++) add('crac', (i % 2 ? 87 : -87), -60 + i * 38, { rot: i % 2 ? -Math.PI / 2 : Math.PI / 2 });
  } else if (floor === 2) {
    // cooling / generator plant
    const gx = [-58, -30, 30, 58], gz = [40, 6, -30];
    gx.forEach(x => gz.forEach(z => { if (rnd() < 0.8) add('generator', x * mirror + (rnd() - 0.5) * 6, z + (rnd() - 0.5) * 6, { w: 6 + rnd() * 3, h: 3.5 + rnd() * 2, rot: rnd() < 0.5 ? 0 : Math.PI / 2 }); }));
    for (let i = 0; i < 9; i++) { add('crac', -86.5, 70 - i * 17, { rot: Math.PI / 2 }); add('crac', 86.5, 70 - i * 17, { rot: -Math.PI / 2 }); }
    for (let r = 0; r < 3; r++) { const z = 58 - r * 44 + (rnd() - 0.5) * 6; for (let i = 0; i < 6; i++) add('ups', -14 + i * 1.4 + (r - 1) * 4 * mirror, z); }
    for (let i = 0; i < 8; i++) add('pillar', (i % 2 ? 16 : -16), 66 - i * 18, { w: 1.6, d: 1.6, h: 32, color: '#facc15' });
    add('colossus', 0, -12, { h: miniH, mini: true });
    for (let i = 0; i < 5; i++) add('pipevent', (rnd() - 0.5) * 140, (rnd() - 0.5) * 130);
    add('sign', 0, -83.4, { y: 6, rot: 0, title: 'STAIRWELL ▼ B3', sub: 'ARCHIVE VAULT · CORE', color: '#22c55e', w: 7 });
    add('sign', -86, 20, { y: 5, rot: Math.PI / 2, title: '⚠ HIGH VOLTAGE', sub: 'GENERATOR PLANT B2', color: '#f97316', w: 7 });
    add('sign', 86, -20, { y: 5, rot: -Math.PI / 2, title: 'COOLING LOOP', sub: 'CRAC UNITS 1-18', color: '#38bdf8', w: 7 });
  } else {
    // archive vault + core: cabinet stacks + vault walls with door gaps
    for (let r = 0; r < 5; r++) {
      const z = 60 - r * 11;
      for (let s = -1; s <= 1; s += 2) {
        const gap = 4 + rnd() * 8; const len = 22 + rnd() * 18;
        add('cabinetrow', s * (8 + gap + len / 2), z, { w: len, d: 0.9, h: 2.2 });
      }
    }
    // vault walls around core with 3 doorways
    [[-30, 0, 1, 34], [30, 0, 1, 34]].forEach(([x, z, w, d]) => add('wall', x, z, { w, d, h: 8, color: '#7f1d1d' }));
    add('wall', -19, 17, { w: 22, d: 1, h: 8, color: '#7f1d1d' }); add('wall', 19, 17, { w: 22, d: 1, h: 8, color: '#7f1d1d' });
    add('emp', 0, 0, { w: 5, d: 5, h: 9, color: '#ef4444' });
    add('colossus', 40 * mirror, -35, { h: miniH, mini: true });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add('cryo', Math.cos(a) * 11, Math.sin(a) * 11, { w: 2.4, d: 2.4, h: 4.6, color: '#22c55e' }); }
    for (let i = 0; i < 4; i++) add('cabinet', -60 + i * 1.1, -40, { rot: 0 });
    add('sign', 0, 17.6, { y: 6, rot: 0, title: 'CORE VAULT', sub: '⚠ RESTRICTED · LEVEL 5 CLEARANCE', color: '#ef4444', w: 8 });
    add('sign', 0, 83.4, { y: 6, rot: Math.PI, title: 'FLOOR B3', sub: 'ARCHIVE · LEVEL ' + level, color: '#facc15', w: 7 });
    add('sign', 0, -83.4, { y: 6, rot: 0, title: level < 9 ? 'EXIT ▲ LEVEL ' + (level + 1) : 'EXIT', sub: 'MINOTAUR KEYCARD REQUIRED', color: '#22c55e', w: 7 });
  }
  addElevatedStructures(O, add, info, level, floor, rnd);
  /* One maintenance closet per floor, tucked against the perimeter so it reads as a wall.
     The door stays solid until it is shot or used. The locker is inside, on the far wall. */
  const sp = pickSecret(floor, O);
  add('secretwall', sp.x, sp.z, {
    w: sp.axis === 'x' ? 0.28 : sp.width,
    d: sp.axis === 'x' ? sp.width : 0.28,
    h: 2.75,
    axis: sp.axis,
    approach: sp.approach,
    depth: sp.depth,
    width: sp.width,
    rx: sp.rx, rz: sp.rz, ax: sp.ax, az: sp.az,
    where: sp.where, tell: sp.tell,
    floor
  });
  return { objects: O, info, secret: { x: sp.x, z: sp.z, ax: sp.ax, az: sp.az, rx: sp.rx, rz: sp.rz, floor, where: sp.where, tell: sp.tell, fallback: !!sp.fallback } };
}

function secretCandidates(floor) {
  const names = ['G', 'B1', 'B2', 'B3'];
  const name = names[floor] || 'G';
  const where = 'Any level, Floor ' + name;
  /* Door sits just inside the perimeter (inner face is about 88.5). Room extends inward. */
  const west = (z, tell) => ({ x: -85.2, z, axis: 'x', approach: 1, where, tell });
  const east = (z, tell) => ({ x: 85.2, z, axis: 'x', approach: -1, where, tell });
  const north = (x, tell) => ({ x, z: 80.6, axis: 'z', approach: -1, where, tell });
  if (floor === 0) return [
    west(21, 'West wall of Server Hall G, south of the checkpoint (z = 21). A lighter concrete panel, a hairline crack, and a bulb that cannot stay lit. Face it from the east.'),
    west(-45, 'West wall of Server Hall G, deeper in the hall (z = -45). Same lighter panel and stuttering bulb. Face it from the east.'),
    east(21, 'East wall of Server Hall G (z = 21). Lighter panel, crack, stuttering bulb. Face it from the west.'),
    east(-45, 'East wall of Server Hall G, deeper in (z = -45). Face it from the west.')
  ];
  if (floor === 1) return [
    east(71, 'East wall of the server farm, near the north end (z = 71). Lighter than the concrete around it, with a crack and a bulb that flickers. Face it from the west.'),
    west(71, 'West wall of the server farm, near the north end (z = 71). Face it from the east.'),
    east(-61, 'East wall of the server farm, south end (z = -61). Face it from the west.'),
    north(19, 'North wall of Floor B1, right of center. Face it from the south.')
  ];
  if (floor === 2) return [
    west(45, 'West wall of the generator plant, between the cooling units (z = 45). Lighter panel, crack, stuttering bulb. Face it from the east.'),
    east(45, 'East wall of the generator plant (z = 45). Face it from the west.'),
    west(-57, 'West wall of the generator plant, south of the rows (z = -57). Face it from the east.'),
    north(-21, 'North wall of Floor B2, left of center. Face it from the south.')
  ];
  return [
    east(-17, 'East wall of the archive, past the cabinet rows (z = -17). Lighter panel, crack, stuttering bulb. Face it from the west.'),
    west(-17, 'West wall of the archive (z = -17). Face it from the east.'),
    east(9, 'East wall of the archive, just north of the vault gap (z = 9). Face it from the west.'),
    north(47, 'North wall of Floor B3, right of center. Face it from the south.')
  ];
}

function footprintHits(objects, x, z, w, d) {
  for (const o of objects) {
    if (o.type === 'sign' || o.type === 'lamp' || o.type === 'seccam' || o.type === 'secretwall') continue;
    const ow = o.w || (o.type === 'colossus' ? 8 : 2.4);
    const od = o.d || (o.type === 'colossus' ? 8 : 2.4);
    if (Math.abs(x - o.x) * 2 < w + ow && Math.abs(z - o.z) * 2 < d + od) return true;
  }
  return false;
}

function pickSecret(floor) {
  const list = secretCandidates(floor);
  const objects = arguments[1] || [];
  const depth = 2.05;
  const width = 4.4;
  for (const sp of list) {
    const sign = -sp.approach;
    const cx = sp.x + (sp.axis === 'x' ? sign * depth * 0.5 : 0);
    const cz = sp.z + (sp.axis === 'z' ? sign * depth * 0.5 : 0);
    const fw = sp.axis === 'x' ? depth + 0.4 : width + 0.4;
    const fd = sp.axis === 'x' ? width + 0.4 : depth + 0.4;
    if (Math.abs(cx) > 88.2 || Math.abs(cz) > 83.2) continue;
    if (footprintHits(objects, cx, cz, fw, fd)) continue;
    const ax = sp.x + (sp.axis === 'x' ? sp.approach * 2.3 : 0);
    const az = sp.z + (sp.axis === 'z' ? sp.approach * 2.3 : 0);
    if (Math.abs(ax) > 84 || Math.abs(az) > 80) continue;
    if (footprintHits(objects, ax, az, 1.3, 1.3)) continue;
    const rx = sp.x + (sp.axis === 'x' ? sign * 1.05 : 0);
    const rz = sp.z + (sp.axis === 'z' ? sign * 1.05 : 0);
    return Object.assign({ depth, width, ax, az, rx, rz }, sp);
  }
  const sp = list[0];
  const sign = -sp.approach;
  return Object.assign({
    depth, width, fallback: true,
    ax: sp.x + (sp.axis === 'x' ? sp.approach * 2.3 : 0),
    az: sp.z + (sp.axis === 'z' ? sp.approach * 2.3 : 0),
    rx: sp.x + (sp.axis === 'x' ? sign * 1.05 : 0),
    rz: sp.z + (sp.axis === 'z' ? sign * 1.05 : 0)
  }, sp);
}

function secretSpot(floor) {
  return pickSecret(floor, []);
}

function secretCrackTexture() {
  if (secretCrackTexture.tex) return secretCrackTexture.tex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(28, 22, 16, 0.92)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(30, 18); g.lineTo(78, 90); g.lineTo(54, 150); g.lineTo(96, 230);
  g.moveTo(150, 12); g.lineTo(138, 80); g.lineTo(188, 140); g.lineTo(170, 220);
  g.moveTo(90, 40); g.lineTo(120, 70);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  secretCrackTexture.tex = tex;
  return tex;
}

function secretDoorMaterial() {
  const src = window.RC && RC.realism && RC.realism.mats && RC.realism.mats.wall;
  const m = src ? src.clone() : new THREE.MeshStandardMaterial({ color: 0xd9cbb6, roughness: 0.9, metalness: 0.05 });
  if (src) m.color.setHex(0xe4d7c4);
  m.roughness = 0.92;
  m.metalness = 0.04;
  m.userData.secretReady = true;
  return m;
}

function buildSecretWall(obj) {
  const h = obj.h || 2.75;
  const depth = obj.depth || 2.15;
  const width = obj.width || 2.55;
  const t = 0.2;
  const approach = obj.approach || 1;
  const axis = obj.axis || 'x';
  const sign = -approach;
  const group = new THREE.Group();
  group.position.set(obj.x, 0, obj.z);
  const wallMat = (window.RC && RC.realism && RC.realism.mats && RC.realism.mats.wall)
    ? RC.realism.mats.wall
    : new THREE.MeshStandardMaterial({ color: 0xb8a090, roughness: 0.78, metalness: 0.06 });
  const plateSrc = window.RC && RC.realism && RC.realism.mats && RC.realism.mats.plate;
  const plateMat = plateSrc ? plateSrc.clone() : new THREE.MeshStandardMaterial({ color: 0x6e675f, roughness: 0.45, metalness: 0.72 });
  const addBox = (w, hh, d, mat, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.rcSurface = mat === plateMat ? 'steel' : 'wall';
    group.add(mesh);
    return mesh;
  };
  const lx = (localX, localZ) => axis === 'x' ? localX : localZ;
  const lz = (localX, localZ) => axis === 'x' ? localZ : localX;
  /* Local X is "into the room" along the door normal before axis swap.
     For an X-axis door, localX maps to world X. For a Z-axis door, localX maps to world Z. */
  const place = (w, hh, d, mat, localX, y, localZ) => addBox(
    axis === 'x' ? w : d, hh, axis === 'x' ? d : w, mat, lx(localX, localZ), y, lz(localX, localZ)
  );
  place(depth, 0.06, width, plateMat, sign * depth * 0.5, 0.03, 0);
  place(depth, h, t, wallMat, sign * depth * 0.5, h / 2, width / 2);
  place(depth, h, t, wallMat, sign * depth * 0.5, h / 2, -width / 2);
  place(t, h, width, wallMat, sign * (depth - t * 0.5), h / 2, 0);
  const worldCol = (localX, localZ, w, d) => {
    const x = obj.x + lx(localX, localZ);
    const z = obj.z + lz(localX, localZ);
    const ww = axis === 'x' ? w : d;
    const dd = axis === 'x' ? d : w;
    registerCollider(x - ww / 2, x + ww / 2, 0, h, z - dd / 2, z + dd / 2);
  };
  worldCol(sign * depth * 0.5, width / 2, depth, t);
  worldCol(sign * depth * 0.5, -width / 2, depth, t);
  worldCol(sign * (depth - t * 0.5), 0, t, width);
  arenaGroup.add(group);

  const door = new THREE.Mesh(new THREE.BoxGeometry(axis === 'x' ? 0.28 : width * 0.82, h * 0.96, axis === 'x' ? width * 0.82 : 0.28), secretDoorMaterial());
  door.position.set(obj.x, h * 0.48, obj.z);
  door.userData.secretDoor = true;
  door.userData.rcSurface = 'secret';
  door.castShadow = true;
  arenaGroup.add(door);
  const dw = axis === 'x' ? 0.28 : width * 0.82;
  const dd = axis === 'x' ? width * 0.82 : 0.28;
  registerCollider(obj.x - dw / 2, obj.x + dw / 2, 0, h, obj.z - dd / 2, obj.z + dd / 2);
  const col = colliders[colliders.length - 1];

  const crack = new THREE.Mesh(new THREE.PlaneGeometry((axis === 'x' ? width : 0.28) * 0.9, h * 0.9), new THREE.MeshBasicMaterial({
    map: secretCrackTexture(), transparent: true, depthWrite: false
  }));
  crack.position.set(
    axis === 'x' ? approach * 0.16 : 0,
    0,
    axis === 'z' ? approach * 0.16 : 0
  );
  if (axis === 'x') crack.rotation.y = approach > 0 ? Math.PI / 2 : -Math.PI / 2;
  else crack.rotation.y = approach > 0 ? 0 : Math.PI;
  crack.userData.secretDoor = true;
  door.add(crack);

  const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshStandardMaterial({
    color: 0xffd7a1, emissive: 0xffa040, emissiveIntensity: 0.9
  }));
  bulbMesh.position.set(
    obj.x + (axis === 'x' ? approach * 0.35 : 0),
    h - 0.05,
    obj.z + (axis === 'z' ? approach * 0.35 : 0)
  );
  bulbMesh.userData.rcGlow = true;
  arenaGroup.add(bulbMesh);
  const bulb = new THREE.PointLight(0xffb060, 0.55, 6.5, 2);
  bulb.position.copy(bulbMesh.position);
  arenaGroup.add(bulb);

  const locker = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.42), plateMat.clone());
  const into = axis === 'x' ? Math.sign(obj.rx - obj.x) || -1 : Math.sign(obj.rz - obj.z) || -1;
  locker.position.set(axis === 'x' ? obj.x + into * 1.55 : obj.x, 0.5, axis === 'z' ? obj.z + into * 1.55 : obj.z);
  locker.userData.rcSurface = 'steel';
  locker.castShadow = true;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.05), new THREE.MeshStandardMaterial({ color: 0xc7b299, metalness: 0.8, roughness: 0.3 }));
  handle.position.set(axis === 'x' ? approach * 0.22 : 0.16, 0.05, axis === 'z' ? approach * 0.22 : 0.16);
  locker.add(handle);
  arenaGroup.add(locker);

  window.RC_SECRET_DOORS.push({
    obj, mesh: door, col, bulb, bulbMesh, reward: locker, room: true, open: false, looted: false,
    ax: obj.ax, az: obj.az, rx: obj.rx, rz: obj.rz,
    where: obj.where, tell: obj.tell
  });
}

function buildArenaMap() {
  window.RC_SECRET_DOORS = [];
  while (arenaGroup.children.length > 0) arenaGroup.remove(arenaGroup.children[0]);
  colliders = []; walkableSurfaces = []; sirenBeaconMeshes = []; PICKUPS = []; ARENA_LIGHTS = []; STEAM_PARTICLES = []; BLINK_MATS = []; CELL_DOOR = null; COLOSSUS = null;
  COLOSSUS_BOLTS.forEach(b => scene.remove(b.mesh)); COLOSSUS_BOLTS = [];
  COLOSSI.forEach(C => { if (C.voice && C.voice.isPlaying) C.voice.stop(); if (C.laser) scene.remove(C.laser); if (C.cannon) scene.remove(C.cannon); (C.spots || []).forEach(sp => { scene.remove(sp.g); (sp.plates || []).forEach(p => scene.remove(p.m)); }); /* Round 21: soft-spot orbs leaked into the next floor */ }); COLOSSI = []; EMP_ARCS.forEach(a => scene.remove(a.mesh)); EMP_ARCS = []; colossusHud(null);
  const floor = STATE.floor || 0; const theme = FLOOR_THEMES[floor];
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.42, metalness: 0.78, bumpMap: WALL_PBR.bumpMap, bumpScale: 0.04 });
  const floorColors = [0xa8a49a, 0x8f9aa8, 0x9a8f80, 0x8a8078];
  const fm = new THREE.Mesh(new THREE.PlaneGeometry(220, 190), new THREE.MeshStandardMaterial({ map: FLOOR_PBR.map, bumpMap: FLOOR_PBR.bumpMap, bumpScale: 0.06, color: floorColors[floor], roughness: 0.58, metalness: 0.32, envMapIntensity: 0.45 }));
  fm.userData.rcSurface = 'floor';
  fm.material.userData._bright = true;
  fm.rotation.x = -Math.PI / 2; fm.receiveShadow = true; arenaGroup.add(fm);
  // raised-floor tile lines for server floors
  if (floor === 1) { const grid = new THREE.GridHelper(180, 90, 0x64748b, 0x475569); grid.position.y = 0.02; grid.material.opacity = 0.35; grid.material.transparent = true; arenaGroup.add(grid); }
  createWall(0, -85, 180, 3, 36); createWall(0, 85, 180, 3, 36);
  createWall(-90, 0, 3, 170, 36); createWall(90, 0, 3, 170, 36);
  // ceiling trusses sit above the Sentinel (centre of G stays open)
  for (let tz = -72; tz <= 72; tz += 24) {
    const segs = floor === 0 ? [[-56, 64], [56, 64]] : [[0, 176]];
    segs.forEach(([cx, len]) => { const t = new THREE.Mesh(new THREE.BoxGeometry(len, 0.8, 0.9), steelMat); t.userData.rcSurface = 'steel'; t.position.set(cx, 33.4, tz); arenaGroup.add(t); });
    [-36, 36].forEach(bx => { const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.5, 10), new THREE.MeshBasicMaterial({ color: 0x330a0a })); beacon.position.set(bx, 32.6, tz); arenaGroup.add(beacon); sirenBeaconMeshes.push(beacon); });
  }
  createSecurityElevator(FLOOR_INFO.exit.x, FLOOR_INFO.exit.z - 1.2);
  // lighting per theme
  const lh = floor === 0 ? 11 : 11.5;
  const spots = [[-50, 50], [0, 60], [50, 50], [-50, 10], [0, 20], [50, 10], [-50, -30], [0, -40], [50, -30], [0, -70]];
  RAILS = []; SOLIDS = [];
  LIGHT_COUNT = 0; const PAL = [0xffa24a, 0x4aa8ff, theme.light, 0xff5a3a];
  spots.forEach(([x, z], i) => addHangingLight(x, lh, z, i % 3 === 0 ? theme.light : PAL[(i + floor) % PAL.length], 2.2, 22));
  addLightStrips(floor);
  // key shadow-casting spotlights (security desk on G, entry zone below ground)
  const keySpots = floor === 0 ? [[0, 40, 0, 34], [0, 14, 0, -6]] : [[0, 60, 0, 50]];
  keySpots.slice(0, IS_COARSE ? 1 : 2).forEach(([x, z, tx, tz]) => {
    const sp = new THREE.SpotLight(0xfff1dd, 1.4, 60, 0.75, 0.5, 1.5); sp.position.set(x, floor === 0 ? 13 : 12.5, z);
    sp.target.position.set(tx, 0, tz); sp.castShadow = true; sp.shadow.mapSize.set(IS_COARSE ? 512 : 1024, IS_COARSE ? 512 : 1024);
    sp.shadow.bias = -0.0006; sp.shadow.normalBias = 0.05; sp.shadow.camera.near = 1; sp.shadow.camera.far = 60;
    arenaGroup.add(sp, sp.target);
  });
  let OFF_PLAN = []; try { OFF_PLAN = planOffices(floor); } catch (e) { console.warn('office plan', e); }
  MAP_OBJECTS.forEach(obj => {
    if (OFF_PLAN.length && officeSkip(obj, OFF_PLAN)) return;
    if (obj.type === 'celldoor') { buildCellDoor(obj); return; }
    if (obj.type === 'catwalk2' || obj.type === 'tower2') { buildElevated(obj); return; }
    if (obj.type === 'lamp') { addHangingLight(obj.x, 4.8, obj.z, obj.color || 0xffaa66, 1.2, 12); return; }
    if (obj.type === 'sign') { addSign(obj.x, obj.y || 5.2, obj.z, obj.rot || 0, obj.title || 'SECTOR', obj.sub || '', obj.color || '#f59e0b', obj.w || 7); return; }
    if (obj.type === 'secretwall') { buildSecretWall(obj); return; }
    if (renderMapObject(obj)) return;
    renderLegacyObject(obj, steelMat);
  });
  COLOSSUS = COLOSSI[0] || null;
  addLoreForFloor(STATE.level || 1, floor);
  try { buildOffices(OFF_PLAN, floor); } catch (e) { console.warn('offices', e); }
  // pickups at free spots
  const rnd = seededRng(STATE.level * 31 + floor);
  const types = [['health', 0x22c55e], ['armor', 0x00f0ff], ['ammo', 0xfacc15], ['health', 0x22c55e], ['quad', 0xa855f7], ['emp', 0x38bdf8], ['emp', 0x38bdf8], ['emp', 0x38bdf8]];
  types.forEach(([type, color]) => {
    for (let t = 0; t < 30; t++) {
      const x = (rnd() - 0.5) * 150, z = FLOOR_INFO.spawnZone.minZ + rnd() * (FLOOR_INFO.spawnZone.maxZ - FLOOR_INFO.spawnZone.minZ);
      if (collidesAt(x, z, 1.2)) continue;
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.8 }));
      mesh.position.set(x, 1.2, z); arenaGroup.add(mesh); PICKUPS.push({ type, x, z, color, mesh, active: true, respawnTimer: 0 }); break;
    }
  });
  ENEMY_GRENADES.forEach(g => { scene.remove(g.mesh); if (g.ring) scene.remove(g.ring); }); ENEMY_GRENADES = [];
  buildNavGrid();
}

function startFloor(lvl, floor) {
  setTimeout(() => { try { STATE.zfix = fixCoplanarSurfaces(); } catch (e) { console.warn('zfix', e); } }, 1200);
  if (STATE.dm) { STATE.dm = false; try { DM.on = false; document.body.classList.remove('dm'); dmBoard(false); } catch (e) {} }
  STATE.level = lvl; STATE.floor = floor; STATE.bossSpawned = false; STATE.hasAccessKey = false; STATE.combatActive = false; HACK_TIMER = 0;
  STATE.floorCleared = false;
  if (STATE.weapons[3] && STATE.weapons[3].ammo < 4) STATE.weapons[3].ammo = 4;
  if (ACCESS_KEY) { arenaGroup.remove(ACCESS_KEY.group); ACCESS_KEY = null; }
  PROJECTILES.forEach(p => scene.remove(p.mesh)); PROJECTILES = [];
  document.getElementById('boss-hud').classList.add('hidden');
  const ks = document.getElementById('keycard-status');
  ks.textContent = floor === 0 ? '🔒 ESCAPE THE HOLDING CELL' : '🔒 STAIRWELL LOCKED · CLEAR FLOOR';
  ks.className = 'text-[10px] text-amber-300 font-bold block';
  const cfg = LEVEL_CONFIGS[lvl] || LEVEL_CONFIGS[1];
  { const fc = liftFog(cfg.fogColor); scene.background.copy(fc); scene.fog.color.copy(fc); } hemiLight.color.setHex(cfg.hemiTop);
  const layout = genFloorLayout(lvl, floor);
  MAP_OBJECTS = layout.objects; FLOOR_INFO = layout.info;
  buildArenaMap(); clearBots(); spawnExplosiveBarrels(IS_COARSE ? 3 : 5);
  STATE.player.x = FLOOR_INFO.start.x; STATE.player.y = 0; STATE.player.z = FLOOR_INFO.start.z; STATE.player.yaw = FLOOR_INFO.start.yaw; STATE.player.pitch = 0; STATE.player.vy = 0;
  // difficulty curve
  const count = Math.min(IS_COARSE ? 11 : 14, 4 + floor * 2 + Math.floor((lvl - 1) / 2));
  const heavyFrac = Math.min(0.75, 0.15 + floor * 0.15 + lvl * 0.03);
  const hpMult = (1 + 0.12 * (lvl - 1) + 0.12 * floor) * STATE.botSkill;
  STATE.diff = { dmg: 1 + 0.08 * (lvl - 1) + 0.06 * floor, fire: 1 + 0.06 * (lvl - 1) + 0.05 * floor };
  const rnd = seededRng(lvl * 7 + floor * 3 + 1); const Z = FLOOR_INFO.spawnZone;
  for (let i = 0; i < count; i++) {
    const tpl = BOT_ROSTER[i % BOT_ROSTER.length] || {};
    const humanFrac = Math.max(0.12, [0.5, 0.4, 0.3, 0.25][floor] - 0.01 * (lvl - 1));
    const human = (i % 4 === 1 || i % 4 === 3) ? rnd() < humanFrac * 2 * 0.95 : rnd() < humanFrac * 0.1;
    const heavy = !human && rnd() < heavyFrac;
    const squad = Math.floor(i / 4); const aiRole = ['suppressor', 'flanker', 'pusher', 'flanker'][i % 4];
    let x = 0, z = 0;
    for (let t = 0; t < 40; t++) { x = Z.minX + rnd() * (Z.maxX - Z.minX); z = Z.minZ + rnd() * (Z.maxZ - Z.minZ); if (!collidesAt(x, z, 1.1) && Math.hypot(x - STATE.player.x, z - STATE.player.z) > 28) break; }
    if (human) spawnBotFromArchetype({ ...tpl, id: `f${floor}-h${i}`, name: `Warden ${FLOOR_NAMES[floor]}-${i + 1}`, role: 'human', aiRole, squad, x, y: 0, z, maxHealth: 70, patrolType: 'ground' }, hpMult);
    else spawnBotFromArchetype({ ...tpl, id: `f${floor}-b${i}`, name: heavy ? `Heavy Triage Unit ${FLOOR_NAMES[floor]}-${i + 1}` : `Triage Unit ${FLOOR_NAMES[floor]}-${i + 1}`, role: heavy ? 'bot' : 'human_guard', aiRole, squad, x, y: 0, z, maxHealth: heavy ? 165 : 115, patrolType: 'ground' }, hpMult);
  }
  spawnDrones(lvl, floor);
  setTimeout(prewarmShaders, 50);
  // snipers posted on towers / catwalks
  const perches = (FLOOR_INFO.perches || []).slice();
  const nSnipers = Math.min(perches.length, [1, 2, 2, 3][floor] + (lvl >= 5 ? 1 : 0));
  for (let i = 0; i < nSnipers; i++) {
    const pc = perches[i]; const tpl = BOT_ROSTER[i % BOT_ROSTER.length] || {};
    const human = i % 2 === 0;
    spawnBotFromArchetype({ ...tpl, id: `f${floor}-s${i}`, name: human ? `Warden Marksman ${FLOOR_NAMES[floor]}-${i + 1}` : `Triage Overwatch ${FLOOR_NAMES[floor]}-${i + 1}`, role: human ? 'human' : 'human_guard', aiRole: 'sniper', squad: 9, x: pc.x, y: pc.y, z: pc.z, maxHealth: human ? 60 : 95, patrolType: 'ground' }, hpMult);
    const sb = BOTS[BOTS.length - 1]; sb.perch = pc; sb.y = pc.y; sb.yaw = Math.atan2(-pc.x, -pc.z);
  }
  // maintenance units (Menders) — basements only, more deeper + later
  if (floor >= 1) {
    const nM = Math.min(IS_COARSE ? 3 : 4, floor + Math.floor((lvl - 1) / 3));
    const bays = [[-70, -70], [70, -70], [-74, 0], [74, 0], [0, -66]];
    for (let i = 0; i < nM; i++) { let [mx, mz] = bays[(i + lvl) % bays.length]; for (let t = 0; t < 20 && collidesAt(mx, mz, 1.6); t++) { mx += (rnd() - 0.5) * 10; mz += rnd() * 6; } spawnMender(mx, mz, i, hpMult); }
    STATE.menderCueAt = performance.now() + 3600;
  } else STATE.menderCueAt = 0;
  const theme = FLOOR_THEMES[floor];
  if (floor === 0 && STATE.levelClearScore && STATE.levelClearScore.lvl === lvl - 1) { const lc = STATE.levelClearScore; STATE.levelClearScore = null; showBanner(`LEVEL ${lc.lvl} CLEARED`, `SCORE ${String(lc.score).padStart(6, '0')} · Next: Level ${lvl} — ${cfg.name}`, 4000); }
  else if (floor === 0) showBanner(`LEVEL ${lvl} · ${cfg.name}`, 'You are locked in a holding cell. Shoot the red lock, press E at the door, or stand at the cyan wall terminal to hack it.', 6500);
  else { showBanner(`LEVEL ${lvl} · FLOOR ${FLOOR_NAMES[floor]}`, theme.title + ' — MINI COLOSSUS DETECTED: only EMP [4] can breach its shielding.' + (floor === 3 ? ' Then kill the Minotaur for the exit keycard.' : ' Destroy it and all sentinels to unlock the stairwell.'), 6000); setTimeout(() => { if (STATE.floor === floor) STATE.combatActive = true; }, 1800); }
  updateHUD();
}

function startCampaignLevel(lvl) { if (lvl <= 1) { STATE.score = 0; const el = document.getElementById('score-val'); if (el) el.textContent = '000000'; } startFloor(lvl, 0); }

function advanceFloor() {
  if (STATE.floor < 3) return startFloor(STATE.level, STATE.floor + 1);
  if (STATE.level < STATE.maxLevels) { STATE.levelClearScore = { lvl: STATE.level, score: STATE.score || 0 }; return startFloor(STATE.level + 1, 0); }
  STATE.running = false; document.exitPointerLock?.();
  document.getElementById('modal-title').textContent = `⚡ ${GAME_BRAND_TITLE}: DATA CENTER 09 LIBERATED ⚡`;
  document.getElementById('modal-desc').innerHTML = `<b class="text-emerald-400">All 9 levels and 36 floors cleared.</b> Moses Protocol terminated.`;
  document.getElementById('game-modal').classList.remove('hidden');
}

function updateFloorLogic(dt, now) {
  // blinking rack LEDs
  BLINK_MATS.forEach(b => { b.phase += dt * b.rate; b.tex.offset.y = (Math.floor(b.phase) % 2) * 0.5; });
  updateColossus(dt, now);
  if (false) {
    gunMesh.updateMatrixWorld(true);
    const n = new THREE.Vector3(0, 0, -1).transformDirection(gunMesh.matrixWorld);
    const pt = new THREE.Vector3(0, 0, gunMesh.userData.clipZ).applyMatrix4(gunMesh.matrixWorld);
    GUN_CLIP.setFromNormalAndCoplanarPoint(n, pt);
  }
  updateShadowCamera();
  if (CELL_DOOR) {
    if (CELL_DOOR.open && CELL_DOOR.lift < 1) { CELL_DOOR.lift = Math.min(1, CELL_DOOR.lift + dt * 0.8); CELL_DOOR.bars.position.y = CELL_DOOR.lift * 4.4; }
    if (!CELL_DOOR.open) {
      const term = MAP_OBJECTS.find(o => o.hack);
      if (term && Math.hypot(STATE.player.x - term.x, STATE.player.z - term.z) < 2.2) {
        HACK_TIMER += dt;
        const ks = document.getElementById('keycard-status'); ks.textContent = `💻 HACKING LOCK ${Math.min(100, Math.round(HACK_TIMER / 1.5 * 100))}%`;
        if (HACK_TIMER >= 1.5) openCellDoor('Lock terminal hacked');
      } else HACK_TIMER = 0;
      if (KEYS['KeyE'] && Math.hypot(STATE.player.x - CELL_DOOR.x, STATE.player.z - CELL_DOOR.z) < 4) openCellDoor('Door forced open');
    }
  }
  if (!STATE.combatActive && FLOOR_INFO.activateZ != null && STATE.player.z < FLOOR_INFO.activateZ) {
    STATE.combatActive = true;
    const ks = document.getElementById('keycard-status'); ks.textContent = '🔒 STAIRWELL LOCKED · CLEAR FLOOR'; ks.className = 'text-[10px] text-amber-300 font-bold block';
    sirenActiveTimer = 4; SFX.playSiren && SFX.playSiren(3);
    showBanner('⚠ INTRUDER ALERT', 'COLOSSUS UNIT DETECTED — ONLY EMP CAN BREACH ITS SHIELDING. Switch to Ion EMP [4], destroy it and the sentinels to unlock the stairwell.', 5500);
    SFX.playRadioChatter('Detainee escaped holding! All Strogg units converge on Server Hall G!', 'SECTOR COMMAND');
  }
  if (window.RC && RC.secrets) RC.secrets.update(dt);
}


function rcLevelElevator(dt, now) {
  if (ACCESS_KEY && !STATE.hasAccessKey) {
    ACCESS_KEY.card.rotation.y += 2.5 * dt;
    if (Math.hypot(STATE.player.x - ACCESS_KEY.x, STATE.player.z - ACCESS_KEY.z) < 2.8) {
      STATE.hasAccessKey = true; SFX.playKeyPickup();
      SFX.playRadioChatter("The intruder has seized the Minotaur's elevator keycard!", 'CENTRAL AI COMMAND');
      arenaGroup.remove(ACCESS_KEY.group); ELEVATOR_STATE.doorsOpen = true; ELEVATOR_STATE.doorMat.color.setHex(0x10b981);
      document.getElementById('keycard-status').textContent = '🔑 KEY ACQUIRED — ENTER NORTH ELEVATOR';
      document.getElementById('keycard-status').className = 'text-[10px] text-emerald-400 font-black block animate-pulse';
      showBanner('🔓 ELEVATOR UNLOCKED!', 'Proceed to the North Core Elevator!', 4500);
    }
  }
  if (ELEVATOR_STATE.doorsOpen) {
    ELEVATOR_STATE.progress = Math.min(1, ELEVATOR_STATE.progress + dt * 1.4);
    ELEVATOR_STATE.doorLeft.position.x = ELEVATOR_STATE.x - 1.6 - ELEVATOR_STATE.progress * 2.2;
    ELEVATOR_STATE.doorRight.position.x = ELEVATOR_STATE.x + 1.6 + ELEVATOR_STATE.progress * 2.2;
    if (Math.hypot(STATE.player.x - ELEVATOR_STATE.x, STATE.player.z - ELEVATOR_STATE.z) < 3.4) {
      SFX.playKeyPickup();
      advanceFloor();
    }
  }
}
window.RC = window.RC || {};
RC.core = RC.core || {};
RC.core.levels = { elevator: rcLevelElevator, build: buildArenaMap, start: startFloor, advance: advanceFloor, update: updateFloorLogic, layout: genFloorLayout };
