/* DYSTOPIA release candidate — asset cache.
   One GLTFLoader, one promise per URL, shared geometry/materials via Object3D.clone.
   Bytes are counted from the loader progress callback so the splash can tell the truth.
   A failed file stays failed (no retry storm) and the caller drops in a box of the same job. */
(function () {
  const RC = (window.RC = window.RC || {});
  const pending = new Map();
  const done = new Map();
  const failed = new Map();
  const stats = { files: 0, bytes: 0, failed: 0, drawsNoted: 0 };

  function loader() {
    if (!RC._gltf) RC._gltf = new THREE.GLTFLoader();
    return RC._gltf;
  }

  function load(url) {
    if (done.has(url)) return Promise.resolve(done.get(url));
    if (failed.has(url)) return Promise.reject(failed.get(url));
    if (pending.has(url)) return pending.get(url);
    stats.files++;
    const p = new Promise((resolve, reject) => {
      loader().load(url, (gltf) => {
        done.set(url, gltf);
        resolve(gltf);
      }, (ev) => {
        if (ev && ev.loaded) stats.bytes = Math.max(stats.bytes, tally(url, ev.loaded));
      }, (err) => {
        if (done.has(url)) return;
        stats.failed++;
        failed.set(url, err || new Error(url));
        reject(err || new Error(url));
      });
    });
    pending.set(url, p);
    return p;
  }

  const partial = new Map();
  function tally(url, loaded) { partial.set(url, loaded); let s = 0; partial.forEach((n) => { s += n; }); return s; }

  /* Clone shares geometry and material in three r128 (Mesh.clone copies the references). */
  function clone(url) {
    const gltf = done.get(url);
    if (!gltf) return null;
    const root = gltf.scene.clone(true);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = !window.IS_COARSE; o.receiveShadow = true; o.frustumCulled = true; } });
    return root;
  }

  function ready(url) { return done.has(url); }

  RC.assets = { load, clone, ready, stats, done, failed };
})();
