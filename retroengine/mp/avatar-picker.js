/*
 * avatar-picker.js — 1.6.0: the lobby's character picker with miniature previews.
 *
 *   Every model gets a card with a pre-rendered thumbnail (assets/thumbs/<id>.webp,
 *   ~6–12 KB each, so the grid costs almost nothing on a phone), and the selected
 *   one spins live in a small three.js turntable above the grid. Only the selected
 *   GLB is ever loaded, and the turntable stops when the lobby closes.
 *   The lobby's hidden <select data-hook="character"> stays the source of truth,
 *   so tests and onCharacterChange keep working unchanged.
 */
export function makeAvatarPicker(RT) {
  return function renderCharacterPicker(field, select) {
    const THREE = RT && RT.THREE, models = (RT && RT.PLAYER_MODELS) || {};
    const wrap = document.createElement('div');                    // whole picker
    wrap.className = 'mpl-avatars';
    const stage = document.createElement('div');                   // live preview box
    stage.className = 'mpl-av-stage';
    const cap = document.createElement('div');                     // name under the turntable
    cap.className = 'mpl-av-cap';
    const grid = document.createElement('div');                    // miniature cards
    grid.className = 'mpl-av-grid';
    select.style.display = 'none';                                 // keep it in the DOM for the hook
    wrap.appendChild(stage); wrap.appendChild(cap); wrap.appendChild(grid);
    field.appendChild(wrap); field.appendChild(select);

    // One card per selectable model.
    Array.from(select.options).forEach(function (o) {
      const d = models[o.value] || { name: o.textContent };
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mpl-av'; b.dataset.id = o.value;
      b.style.setProperty('--tint', d.tintColor || '#8aa');        // card border = team tint
      const img = document.createElement('img');
      img.alt = d.name || o.value; img.loading = 'lazy'; img.decoding = 'async';
      img.src = d.thumb || ('assets/thumbs/' + o.value + '.webp');  // pre-rendered 3/4 view
      img.onerror = function () { img.remove(); b.classList.add('noimg'); };   // fall back to a tint swatch
      const nm = document.createElement('b'); nm.textContent = d.name || o.value;
      b.appendChild(img); b.appendChild(nm);
      b.addEventListener('click', function () {
        if (select.value === o.value) return;
        select.value = o.value;
        select.dispatchEvent(new Event('change'));                 // lobby forwards to onCharacterChange
        mark();
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
        stage.appendChild(renderer.domElement);
        scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xb8c4d8, 0x2a2622, 0.9));      // soft fill
        const key = new THREE.DirectionalLight(0xfff1dc, 1.4); key.position.set(2, 3, 2.5); scene.add(key);
        const rim = new THREE.DirectionalLight(0x9fc4ff, 0.8); rim.position.set(-2, 1.5, -2.5); scene.add(rim);
        cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50); cam.position.set(0, 0.1, 4.9); cam.lookAt(0, 0, 0);
        pivot = new THREE.Group(); scene.add(pivot);
      } catch (e) { renderer = null; }
    }
    function load(id) {
      if (!renderer) return;
      const d = models[id]; if (!d || !d.src) return;
      const my = ++loadId;                                          // ignore late loads after a quick re-pick
      new THREE.GLTFLoader().load(d.src, function (g) {
        if (my !== loadId) return;
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
      }, undefined, function () { /* keep the thumbnail grid if the GLB fails */ });
    }
    function frame(t) {
      raf = 0;
      if (!wrap.isConnected) { dispose(); return; }                  // lobby closed: stop and free GL
      const w = stage.clientWidth | 0, h = stage.clientHeight | 0;
      if (w && h) {
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
    function mark() {
      const id = select.value;
      grid.querySelectorAll('.mpl-av').forEach(function (b) { b.classList.toggle('on', b.dataset.id === id); });
      const d = models[id] || {};
      cap.textContent = (d.name || id) + (d.license ? ' · ' + d.license : '');
      stage.style.setProperty('--tint', d.tintColor || '#8aa');
      if (!renderer) {                                               // no WebGL: show the big thumbnail instead
        stage.style.backgroundImage = 'url(' + (d.thumb || ('assets/thumbs/' + id + '.webp')) + ')';
      }
      load(id);
    }
    // The lobby sets select.value after this hook runs, so mark on the next tick too.
    mark(); setTimeout(mark, 0);
    if (renderer) raf = requestAnimationFrame(frame);
  };
}
