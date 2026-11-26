// Pro suit viewer: a small turntable for Sgt. Protagonist's armor ("Pro") (used by preview.html and the story cards).
// It is a separate tiny Three.js scene, so it never touches the DMB Tech 1 game scene.
import * as THREE from 'three';                                          // Three.js r128 (same pin as the game)
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';        // loads the .glb model file
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // drag to spin, pinch to zoom

// mountPro(canvas, options) draws Pro inside a <canvas> and returns { ready, dispose }.
//   options.src        path to the .glb (default: the slim suit next to this file)
//   options.controls   true = let the player spin/zoom with touch or mouse
//   options.spin       turntable speed in radians per second (0 = still)
//   options.charge     true = a blue ion charge keeps building in his arm cannon (splash screen)
export function mountPro(canvas, options) {
  const o = Object.assign({ src: new URL('assets/pro_suit.glb', import.meta.url).href, controls: false, spin: 0.45 }, options);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });  // alpha: the page colour shows behind him
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));  // cap at 2x so a Fold screen stays smooth
  renderer.outputEncoding = THREE.sRGBEncoding;                       // correct colours for the JPEG textures
  renderer.toneMapping = THREE.ACESFilmicToneMapping;                 // film-style contrast (gritty, not toy-bright)
  renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 50);        // narrow lens = less distortion on a tall figure
  camera.position.set(0.6, 0.15, 5.4);                          // far enough back that the cannon arm never leaves the frame
  // Lights: cold sky fill, warm ground bounce, a hard key light and a cyan rim to match his cannon coils.
  scene.add(new THREE.HemisphereLight(0x9fb0c8, 0x2a2218, 0.65));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.6); key.position.set(2, 3, 2.5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x4fd8ff, 0.9); rim.position.set(-2.5, 1.2, -2.5); scene.add(rim);
  const pivot = new THREE.Group(); scene.add(pivot);                  // we spin this group, not the camera
  let controls = null;
  if (o.controls) {
    controls = new OrbitControls(camera, canvas);                     // touch: one finger spins, two fingers zoom
    controls.enableDamping = true; controls.enablePan = false;        // no panning, so he can never get lost off-screen
    controls.minDistance = 1.6; controls.maxDistance = 8;
    controls.target.set(0, 0, 0);
  }
  let raf = 0, last = performance.now(), dead = false, clock = 0;
  let charge = null;
  const chev = [];                                                    // glowing Sgt. chevron materials (unlit)                                                  // the ion-charge effect (built after the model loads)
  function size() {                                                   // match the canvas's on-screen size
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 300;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!controls) {                                                  // story cards: back the camera off until he fits
      const fit = 1.2 / Math.tan(camera.fov * Math.PI / 360);         // distance that fits his 2-unit height (+ margin)
      camera.position.setLength(fit * Math.max(1, 1 / camera.aspect)); // a narrow box needs more distance to fit his arms
      camera.lookAt(0, 0, 0);
    }
  }
  function frame(t) {
    if (dead) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;           // seconds since the last frame (capped)
    if (o.spin) pivot.rotation.y += o.spin * dt;                       // slow turntable
    clock += dt; if (charge) charge.update(clock);                     // pulse the cannon charge
    const g = 0.82 + 0.18 * Math.sin(clock * 2.6);                     // slow ion-blue breathing on the chevrons
    for (const cm of chev) { if (!cm.userData.c0) cm.userData.c0 = cm.color.clone(); cm.color.copy(cm.userData.c0).multiplyScalar(cm.name === 'chevron_halo' ? g * g : 0.85 + 0.25 * g); }
    if (controls) controls.update();
    size(); renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const ready = new Promise(res => {
    new GLTFLoader().load(o.src, g => {                                // success: centre him and scale to 2 units tall
      const m = g.scene, box = new THREE.Box3().setFromObject(m);
      const c = box.getCenter(new THREE.Vector3()), s = 2 / Math.max(box.getSize(new THREE.Vector3()).y, 1e-4);
      m.scale.setScalar(s); m.position.copy(c).multiplyScalar(-s);     // middle of his body sits on the pivot
      pivot.add(m);
      if (o.charge) charge = buildCharge(m);                           // glow lives inside the model, so it spins with him
      m.traverse(c => { if (c.isMesh && /^chevron_/.test(c.material.name)) { c.material.toneMapped = false; chev.push(c.material); } });  // no tone mapping: keep the blue saturated   // 1.6.0: Sgt. chevrons glow and pulse
      res(true);
    }, undefined, () => res(false));                                   // failure: resolve false so the page can say so
  });
  raf = requestAnimationFrame(frame);
  return { ready, renderer, camera, pivot, get charge() { return charge; }, get chevrons() { return chev; }, setSpin(v) { o.spin = v; }, dispose() { dead = true; cancelAnimationFrame(raf); if (controls) controls.dispose(); renderer.dispose(); } };
}

/* ---------- ion charge in the arm cannon (splash screen) ----------
   Everything is additive-blended and tiny: 1 glow sprite, 1 core sprite, 1 point light, 24 particles. */
// Centre of the cannon muzzle in the slim suit's own coordinates (measured from pro_suit.glb).
const MUZZLE = [-0.768, -0.183, 0.429];                                   // just past the muzzle face, so the glow sits in front of it
const AXIS = [-0.288, -0.567, 0.772];                                     // direction the barrel points
function glowTexture() {                                                  // soft round spot drawn on a small canvas
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(120,230,255,.85)');
  r.addColorStop(0.6, 'rgba(30,120,255,.25)'); r.addColorStop(1, 'rgba(0,40,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
function buildCharge(model) {
  const tex = glowTexture(), at = new THREE.Vector3(...MUZZLE);
  const add = (color, opacity) => new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const halo = new THREE.Sprite(add(0x2a7dff, 0.8)); halo.position.copy(at); model.add(halo);   // big blue halo
  const core = new THREE.Sprite(add(0xbff6ff, 1)); core.position.copy(at); model.add(core);     // hot cyan-white core
  const light = new THREE.PointLight(0x4fd8ff, 0, 0.9, 2); light.position.copy(at); model.add(light); // lights up the barrel
  // Particles: 24 sparks that drift in toward the muzzle while it charges.
  const N = 24, pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) { const v = new THREE.Vector3().randomDirection ? new THREE.Vector3().randomDirection() : new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize(); seeds.push({ dir: v, ph: Math.random() }); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex, color: 0x7fe6ff, size: 0.05, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  model.add(sparks);
  const CYCLE = 2.4;                                                      // seconds for one charge-up
  return {
    level: 0,                                                             // 0..1 how charged it is right now (test hook)
    update(t) {
      const k = (t % CYCLE) / CYCLE;                                      // 0 -> 1 over each cycle
      const flick = 0.85 + 0.15 * Math.sin(t * 37);                       // fast shimmer so it feels alive
      const c = k * k * flick;                                            // ramps up slowly, then fast
      this.level = c;
      halo.scale.setScalar(0.16 + 0.5 * c); halo.material.opacity = 0.45 + 0.55 * c;
      core.scale.setScalar(0.06 + 0.16 * c);
      light.intensity = 0.8 + 4 * c;
      for (let i = 0; i < N; i++) {                                       // each spark: start far out, fall into the muzzle
        const s = seeds[i], f = (k + s.ph) % 1, r = 0.28 * (1 - f) + 0.02;
        pos[i * 3] = at.x + s.dir.x * r + AXIS[0] * 0.02; pos[i * 3 + 1] = at.y + s.dir.y * r; pos[i * 3 + 2] = at.z + s.dir.z * r;
      }
      geo.attributes.position.needsUpdate = true;
      sparks.material.opacity = 0.5 + 0.5 * c;
    }
  };
}
