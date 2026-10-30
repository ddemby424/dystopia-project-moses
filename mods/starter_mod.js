// ===== DYSTOPIA starter mod =====
// Load it by adding this line in index.html, right AFTER the game.js line:
//   <script src="mods/starter_mod.js?v=1"></script>
// game.js runs first, so everything it made (scene, camera, STATE, BOTS, THREE) already exists here.

// 1) A spinning glowing cube that floats in front of you.
const MOD_CUBE = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 0.6, 0.6),
  new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.5 })  // try 0x00ff00
);
scene.add(MOD_CUBE);

// 2) Press M to turn the fog on and off.
let MOD_FOG = scene.fog;
window.addEventListener('keydown', e => {
  if (e.code === 'KeyM') { scene.fog = scene.fog ? null : MOD_FOG; console.log('[mod] fog', scene.fog ? 'ON' : 'OFF'); }
});

// 3) Say something every time an enemy dies. (We wrap the game's own function, then call the original.)
const MOD_OLD_KILL = finishBotKill;
finishBotKill = function (b) {
  console.log('[mod] killed:', b && b.name);
  return MOD_OLD_KILL.apply(this, arguments);
};

// 4) Our own little loop, every frame: keep the cube 3 m in front of the player and spin it.
function modLoop() {
  requestAnimationFrame(modLoop);
  const P = STATE.player;
  MOD_CUBE.position.set(P.x - Math.sin(P.yaw) * 3, (P.y || 0) + 1.6, P.z - Math.cos(P.yaw) * 3);
  MOD_CUBE.rotation.x += 0.02; MOD_CUBE.rotation.y += 0.03;   // spin speed
}
modLoop();
console.log('[mod] starter mod loaded');
