/* Warehouse preview. Nicholas-3D's hall is the metal bay.
   Arsen Ismailov's worn wall and roof materials cover the shell the yard looks at.
   Collision stays on the simple boxes the floor generator already built. */
(function () {
  const RC = (window.RC = window.RC || {});
  const warehouse = { ready: false, bytes: 0, failed: [] };
  let hallSrc = null;
  let facadeSrc = null;
  let floorMat = null;
  let wallMat = null;
  let roofMat = null;

  function tile(mat, rx, ry) {
    if (!mat) return null;
    const m = mat.clone();
    ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach((key) => {
      if (!m[key]) return;
      m[key] = m[key].clone();
      m[key].wrapS = m[key].wrapT = THREE.RepeatWrapping;
      m[key].repeat.set(rx, ry);
      m[key].needsUpdate = true;
    });
    m.envMapIntensity = 0.9;
    return m;
  }

  function take(root, test) {
    let found = null;
    root.traverse((o) => {
      if (found || !o.isMesh) return;
      const name = (o.name || '') + ' ' + ((o.material && o.material.name) || '');
      if (test.test(name)) found = o;
    });
    return found;
  }

  function loadOne(url) {
    return new Promise((resolve) => {
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      }).then((blob) => {
        warehouse.bytes += blob.size;
        const blobUrl = URL.createObjectURL(blob);
        new THREE.GLTFLoader().load(blobUrl, (gltf) => {
          URL.revokeObjectURL(blobUrl);
          resolve(gltf.scene || gltf.scenes[0]);
        }, undefined, () => { warehouse.failed.push(url); resolve(null); });
      }).catch(() => { warehouse.failed.push(url); resolve(null); });
    });
  }

  function placeHall() {
    if (!hallSrc) return;
    const old = arenaGroup.getObjectByName('rc-hall');
    if (old) arenaGroup.remove(old);
    const g = hallSrc.clone(true);
    g.name = 'rc-hall';
    const drop = [];
    g.traverse((o) => { if (o.isMesh && /WetConcrete/i.test(o.name || '')) drop.push(o); });
    drop.forEach((o) => o.parent && o.parent.remove(o));
    g.scale.set(3.2, 4.8, 2.7);
    g.position.set(0, 0, 0);
    g.updateMatrixWorld(true);
    let b = new THREE.Box3().setFromObject(g);
    g.position.x -= (b.min.x + b.max.x) / 2;
    g.position.y -= b.min.y;
    g.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(g);
    g.position.z += 40 - b.max.z;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
    arenaGroup.add(g);
  }

  function placeFacade() {
    if (!facadeSrc) return;
    const old = arenaGroup.getObjectByName('rc-facade');
    if (old) arenaGroup.remove(old);
    const g = facadeSrc.clone(true);
    g.name = 'rc-facade';
    g.position.set(0, 0, 0);
    g.rotation.set(0, 0, 0);
    g.scale.set(1, 1, 1);
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g);
    const size = new THREE.Vector3();
    b.getSize(size);
    /* A low worn roof sitting on the factory face, clear of the yard spawn at z=124. */
    const sx = 140 / Math.max(size.x, 0.01);
    const sy = 7 / Math.max(size.y, 0.01);
    const sz = 16 / Math.max(size.z, 0.01);
    g.scale.set(sx, sy, sz);
    g.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(g);
    g.position.x -= (b2.min.x + b2.max.x) / 2;
    g.position.y += 11.2 - b2.min.y;
    g.position.z += 86 - b2.max.z;
    g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
    arenaGroup.add(g);
  }

  function layWetFloor() {
    if (!floorMat) return;
    arenaGroup.traverse((o) => {
      if (o.isMesh && o.userData.rcSurface === 'floor') o.visible = false;
    });
    let floor = arenaGroup.getObjectByName('rc-wet-floor');
    if (!floor) {
      floor = new THREE.Mesh(new THREE.PlaneGeometry(176, 168), floorMat);
      floor.name = 'rc-wet-floor';
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.045;
      floor.receiveShadow = true;
      floor.material.side = THREE.DoubleSide;
      arenaGroup.add(floor);
    }
  }

  function retextureWalls() {
    if (!wallMat) return;
    arenaGroup.traverse((o) => {
      if (!o.isMesh || !o.geometry || o.geometry.type !== 'BoxGeometry') return;
      const h = o.geometry.parameters && o.geometry.parameters.height;
      if (!h || h < 8) return;
      o.material = wallMat;
      o.visible = true;
    });
  }

  function retextureCeiling() {
    if (!roofMat) return;
    const ceil = arenaGroup.getObjectByName('rc-ceiling');
    if (ceil) ceil.material = roofMat;
    arenaGroup.traverse((o) => {
      if (o.isMesh && o.userData.rcSurface === 'steel') o.visible = false;
    });
  }

  function debris() {
    if (arenaGroup.getObjectByName('rc-debris') || !wallMat) return;
    const group = new THREE.Group();
    group.name = 'rc-debris';
    const spots = [[46, -36, 1.4, 0.7, 0.55], [-48, 12, 0.8, 1.3, 0.4], [34, -58, 1.1, 0.5, 0.8], [-36, -42, 0.6, 0.9, 0.35]];
    spots.forEach(([x, z, w, d, h]) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      box.position.set(x, h / 2, z);
      box.rotation.y = x * 0.02;
      box.castShadow = true;
      group.add(box);
    });
    arenaGroup.add(group);
  }

  function fillLight() {
    if (warehouse.fill || typeof scene === 'undefined') return;
    const sun = new THREE.DirectionalLight(0xfff1dd, 0.42);
    sun.position.set(30, 40, 20);
    sun.castShadow = false;
    scene.add(sun);
    warehouse.fill = sun;
  }

  function flicker() {
    if (!window.ARENA_LIGHTS) return;
    ARENA_LIGHTS.forEach((L, i) => { if (i % 2 === 0) L.flicker = true; });
  }

  function dress() {
    if (typeof arenaGroup === 'undefined' || !arenaGroup) return;
    try {
      placeHall();
      placeFacade();
      layWetFloor();
      retextureWalls();
      retextureCeiling();
      debris();
      fillLight();
      flicker();
      warehouse.ready = !!(hallSrc && facadeSrc);
    } catch (e) { console.warn('warehouse dress', e); }
  }

  function load() {
    return Promise.all([
      loadOne('release-warehouse/assets/warehouse/hall.glb'),
      loadOne('release-warehouse/assets/warehouse/facade.glb')
    ]).then(([hall, facade]) => {
      hallSrc = hall;
      facadeSrc = facade;
      if (hall) {
        const wet = take(hall, /WetConcrete/i);
        if (wet && wet.material) {
          floorMat = tile(wet.material, 7, 6);
          floorMat.metalnessMap = null;
          floorMat.metalness = 0.04;
          floorMat.roughness = 0.9;
          floorMat.envMapIntensity = 0.12;
          if (floorMat.map) {
            floorMat.emissiveMap = floorMat.map;
            floorMat.emissive = new THREE.Color(0xffffff);
            floorMat.emissiveIntensity = 0.9;
          }
        }
      }
      if (facade) {
        const wall = take(facade, /factory_wall|WarehouseWalls/i);
        const roof = take(facade, /Roof|corrugat/i);
        if (wall && wall.material) wallMat = tile(wall.material, 8, 2);
        if (roof && roof.material) roofMat = tile(roof.material, 10, 6);
      }
      dress();
    });
  }

  warehouse.dress = dress;
  warehouse.load = load;
  RC.warehouse = warehouse;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => load());
  else load();
})();
