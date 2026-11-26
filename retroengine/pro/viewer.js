// Pro suit viewer: a small turntable for Sgt. Protagonist's armor ("Pro") (used by preview.html and the story cards).
// It is a separate tiny Three.js scene, so it never touches the DMB Tech 1 game scene.
import * as THREE from 'three';                                          // Three.js r128 (same pin as the game)
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';        // loads the .glb model file
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // drag to spin, pinch to zoom

// mountPro(canvas, options) draws Pro inside a <canvas> and returns { ready, dispose }.
//   options.src        path to the .glb (default: the slim suit next to this file)
//   options.controls   true = let the player spin/zoom with touch or mouse
//   options.spin       turntable speed in radians per second (0 = still)
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
  let raf = 0, last = performance.now(), dead = false;
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
    if (controls) controls.update();
    size(); renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const ready = new Promise(res => {
    new GLTFLoader().load(o.src, g => {                                // success: centre him and scale to 2 units tall
      const m = g.scene, box = new THREE.Box3().setFromObject(m);
      const c = box.getCenter(new THREE.Vector3()), s = 2 / Math.max(box.getSize(new THREE.Vector3()).y, 1e-4);
      m.scale.setScalar(s); m.position.copy(c).multiplyScalar(-s);     // middle of his body sits on the pivot
      pivot.add(m); res(true);
    }, undefined, () => res(false));                                   // failure: resolve false so the page can say so
  });
  raf = requestAnimationFrame(frame);
  return { ready, renderer, camera, pivot, setSpin(v) { o.spin = v; }, dispose() { dead = true; cancelAnimationFrame(raf); if (controls) controls.dispose(); renderer.dispose(); } };
}
