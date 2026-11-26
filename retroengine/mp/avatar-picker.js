/*
 * avatar-picker.js — the lobby's character picker with miniature previews.
 *
 *   1.6.0: every model gets a card with a pre-rendered thumbnail (assets/thumbs/<id>.webp,
 *   ~6–12 KB each), and the selected one spins live in a small three.js turntable.
 *   1.6.1 (fresh redesign + "I don't see miniatures" fix):
 *     - thumbnail and model paths resolve from THIS file (import.meta.url), not from the page,
 *       so they load no matter which page opens the lobby;
 *     - thumbnails load eagerly (lazy images inside a hidden tab never loaded on some phones);
 *     - the stage shows the selected miniature instantly as a poster, then the live 3D model fades in;
 *     - a 'change' on the <select> from anywhere (the Character dropdown) re-marks the grid and preview.
 *   Only the selected GLB is ever loaded, and the turntable stops when the lobby closes.
 *   The lobby's hidden <select data-hook="character"> stays the source of truth.
 */
const ROOT = new URL('../', import.meta.url);                           // retroengine/ (this file lives in retroengine/mp/)

// Miniature URL for a character id: its own thumb if the model lists one, else assets/thumbs/<id>.webp.
export function thumbFor(id, def) {
  return new URL((def && def.thumb) || ('assets/thumbs/' + id + '.webp'), ROOT).href;
}
function modelUrl(src) { return new URL(src, ROOT).href; }              // 'assets/models/x.glb' -> absolute URL

export function makeAvatarPicker(RT) {
  return function renderCharacterPicker(field, select) {
    const THREE = RT && RT.THREE, models = (RT && RT.PLAYER_MODELS) || {};
    const wrap = document.createElement('div');                    // whole picker
    wrap.className = 'mpl-avatars';
    const stage = document.createElement('div');                   // live preview box
    stage.className = 'mpl-av-stage';
    const poster = document.createElement('img');                  // instant miniature while the GLB loads
    poster.className = 'mpl-av-poster'; poster.alt = '';
    const cap = document.createElement('div');                     // name + licence, sits on the stage
    cap.className = 'mpl-av-cap';
    const grid = document.createElement('div');                    // miniature cards
    grid.className = 'mpl-av-grid';
    grid.setAttribute('role', 'radiogroup'); grid.setAttribute('aria-label', 'Character');
    select.style.display = 'none';                                 // keep it in the DOM for the hook
    stage.appendChild(poster); stage.appendChild(cap);
    wrap.appendChild(stage); wrap.appendChild(grid);
    field.appendChild(wrap); field.appendChild(select);

    // One miniature card per selectable model.
    Array.from(select.options).forEach(function (o) {
      const d = models[o.value] || { name: o.textContent };
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mpl-av'; b.dataset.id = o.value;
      b.setAttribute('role', 'radio'); b.title = d.name || o.value;
      b.style.setProperty('--tint', d.tintColor || '#8aa');        // a small team-colour bar under the name
      const img = document.createElement('img');
      img.alt = d.name || o.value; img.decoding = 'async';         // eager on purpose (see 1.6.1 note above)
      img.src = thumbFor(o.value, d);                              // pre-rendered 3/4 view
      img.onerror = function () { img.remove(); b.classList.add('noimg'); };   // fall back to a tint swatch
      const nm = document.createElement('b'); nm.textContent = d.name || o.value;
      b.appendChild(img); b.appendChild(nm);
      b.addEventListener('click', function () {
        if (select.value === o.value) return;
        select.value = o.value;
        select.dispatchEvent(new Event('change'));                 // lobby forwards to onCharacterChange (and calls mark)
      });
      grid.appendChild(b);
    });

    // ---- live turntable for the selected model (skipped if WebGL is unavailable) ----
    let renderer = null, scene, cam, pivot, raf = 0, loadId = 0;
    if (THREE && THREE.GLTFLoader) {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));   // crisp, but cap the cost on a Fold
        renderer.outputEncoding = THREE.sRGBEncoding;
        stage.insertBefore(renderer.domElement, cap);              // canvas above the poster, under the caption
        scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xdfe6f0, 0x2a2622, 0.95));     // soft studio fill
        const key = new THREE.DirectionalLight(0xfff4e6, 1.35); key.position.set(2, 3, 2.5); scene.add(key);
        const rim = new THREE.DirectionalLight(0xbcd4ff, 0.9); rim.position.set(-2, 1.5, -2.5); scene.add(rim);
        cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50); cam.position.set(0, 0.1, 4.9); cam.lookAt(0, 0, 0);
        pivot = new THREE.Group(); scene.add(pivot);
      } catch (e) { renderer = null; }
    }
    function load(id) {
      if (!renderer) return;
      const d = models[id]; if (!d || !d.src) return;
      const my = ++loadId;                                          // ignore late loads after a quick re-pick
      stage.classList.remove('live');                               // poster shows until the model is in
      new THREE.GLTFLoader().load(modelUrl(d.src), function (g) {
        if (my !== loadId || !renderer) return;
        pivot.clear();
        const m = g.scene, team = new THREE.Color(d.tintColor || '#ffffff');
        m.traverse(function (o) {                                    // same team tint other players see
          if (o.isLight) o.visible = false;
          if (!o.isMesh || !o.material) return;
          o.material = o.material.clone();
          if (o.material.color) o.material.color.lerp(team, 0.32);
          if (o.material.emissive) o.material.emissive.copy(team).multiplyScalar(0.08);
        });
        const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3());
        const s = 2 / Math.max(0.01, box.getSize(new THREE.Vector3()).y);    // normalise to 2 units tall
        m.scale.multiplyScalar(s); m.position.copy(c).multiplyScalar(-s);
        pivot.add(m);
        stage.classList.add('live');                                // fade the 3D model in over the poster
      }, undefined, function () { /* keep the poster + grid if the GLB fails */ });
    }
    function frame(t) {
      raf = 0;
      if (!wrap.isConnected) { dispose(); return; }                  // lobby closed: stop and free GL
      const w = stage.clientWidth | 0, h = stage.clientHeight | 0;
      if (w && h) {                                                  // 0 while its tab is hidden: skip the draw
        const cv = renderer.domElement;
        if (cv.width !== Math.round(w * renderer.getPixelRatio()) || cv.height !== Math.round(h * renderer.getPixelRatio())) {
          renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
        }
        pivot.rotation.y = t * 0.0009;                               // slow spin
        renderer.render(scene, cam);
      }
      raf = requestAnimationFrame(frame);
    }
    function dispose() {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (renderer) { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); renderer = null; }
    }
    let shown = null;                                                // id currently on the stage
    function mark() {
      const id = select.value;
      grid.querySelectorAll('.mpl-av').forEach(function (b) {
        const on = b.dataset.id === id;
        b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      if (id === shown) return;                                      // same pick: nothing to reload
      shown = id;
      const d = models[id] || {};
      cap.innerHTML = '';
      const nm = document.createElement('b'); nm.textContent = d.name || id;
      cap.appendChild(nm);
      if (d.license) { const l = document.createElement('small'); l.textContent = d.license; cap.appendChild(l); }
      stage.style.setProperty('--tint', d.tintColor || '#8aa');
      poster.src = thumbFor(id, d);                                  // instant picture, also the no-WebGL view
      load(id);
    }
    select.addEventListener('change', mark);                         // dropdown or grid picked something
    // The lobby may set select.value after this hook runs, so mark on the next tick too.
    mark(); setTimeout(mark, 0);
    if (renderer) raf = requestAnimationFrame(frame);
  };
}
