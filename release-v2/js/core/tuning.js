/* DYSTOPIA candidate — campaign, roster, and weapon numbers.
   Edit this file. It runs after the engine creates STATE and overwrites
   those values before the first map build. The legacy page does not load it.
   Floor geometry and enemy behavior are in levels.js and enemies.js. */
(function () {
  const names = ['THE SPINE · INTAKE & DETENTION', 'THE SPINE · COLD AISLES', 'THE SPINE · EXHAUST WORKS', 'THE NURSERY · LULLABY PODS', 'THE NURSERY · THE COMMONS', 'THE NURSERY · TRIAGE WARD', 'DEEP CORE · THE BLACK ARCHIVE', 'DEEP CORE · THE COOLING SPINE', 'THE GARDEN'];
  const fogs = [0x050911, 0x04111d, 0x0a0f0a, 0x0b0716, 0x120c04, 0x04121a, 0x100508, 0x0c0c12, 0x160509];
  const hemis = [0xddeeff, 0xbfe3ff, 0xd9f99d, 0xddd6fe, 0xfde68a, 0xa5f3fc, 0xfecaca, 0xe5e7eb, 0xfca5a5];
  for (let i = 1; i <= 9; i++) {
    LEVEL_CONFIGS[i] = {
      name: 'CRADLE 09 · ' + names[i - 1],
      sub: 'Escape the cell, then descend G → B1 → B2 → B3.',
      botCount: 8,
      bossHp: 420 + 160 * i,
      fogColor: fogs[i - 1],
      hemiTop: hemis[i - 1],
      speedMult: 1 + 0.06 * (i - 1)
    };
  }

  STATE.walkSpeed = 14;
  STATE.jumpVel = 8.5;
  STATE.gravity = 22;
  STATE.sens = 1.25;
  STATE.aimAssist = 0.80;
  STATE.bossScale = 1.75;
  STATE.bossSpeedMult = 1.0;
  STATE.maxLevels = 9;

  STATE.weapons = [
    { name: 'Pulse Cannon', ammo: Infinity, maxAmmo: Infinity, damage: 28, pellets: 1, fireRate: 0.13, spread: 0.008, color: 0x38bdf8, speed: 92, splash: 0, recoil: 0.14 },
    { name: 'Combat Shotgun', ammo: 24, maxAmmo: 32, damage: 18, pellets: 8, fireRate: 0.56, spread: 0.062, color: 0xffaa00, speed: 88, splash: 0, recoil: 0.25 },
    { name: 'Rocket Launcher', ammo: 12, maxAmmo: 15, damage: 155, pellets: 1, fireRate: 0.80, spread: 0.002, color: 0xff4400, speed: 46, splash: 14.0, recoil: 0.36 },
    { name: 'Ion EMP', ammo: 6, maxAmmo: 10, damage: 0, pellets: 1, fireRate: 0.9, spread: 0.003, color: 0x38bdf8, speed: 48, splash: 0, recoil: 0.3, emp: true }
  ];

  BOT_ROSTER = [
    { id: 'guard-1', name: 'Unit Vance [Doom Sentinel]', role: 'human_guard', armorColor: 0x1e293b, tint: 0xfacc15, weapon: 0, x: -32, y: 0, z: 38, maxHealth: 110, patrolType: 'ground' },
    { id: 'guard-2', name: 'Unit Miller [Tower Sentinel]', role: 'human_guard', armorColor: 0x172554, tint: 0x38bdf8, weapon: 0, x: -34, y: 4.6, z: 12, maxHealth: 115, patrolType: 'tower' },
    { id: 'guard-3', name: 'Unit Mercer [Catwalk Sentinel]', role: 'human_guard', armorColor: 0x1e293b, tint: 0xfacc15, weapon: 1, x: 0, y: 4.6, z: 0, maxHealth: 115, patrolType: 'catwalk' },
    { id: 'guard-4', name: 'Unit Reyes [Tower Sentinel]', role: 'human_guard', armorColor: 0x172554, tint: 0x38bdf8, weapon: 0, x: 34, y: 4.6, z: 12, maxHealth: 120, patrolType: 'tower' },
    { id: 'bot-1', name: 'Sarge [Heavy Sentinel]', role: 'bot', armorColor: 0x1e3a8a, tint: 0x00f0ff, weapon: 0, x: -55, y: 0, z: 42, maxHealth: 125, patrolType: 'ground' },
    { id: 'bot-2', name: 'Phobos [Heavy Sentinel]', role: 'bot', armorColor: 0x3b0764, tint: 0xc084fc, weapon: 1, x: 55, y: 0, z: 42, maxHealth: 130, patrolType: 'ground' },
    { id: 'guard-5', name: 'Unit Cross [Catwalk Sentinel]', role: 'human_guard', armorColor: 0x0f172a, tint: 0xf97316, weapon: 0, x: 0, y: 4.6, z: -28, maxHealth: 125, patrolType: 'catwalk' },
    { id: 'bot-3', name: 'Viper [Heavy Hunter]', role: 'bot', armorColor: 0x064e3b, tint: 0x22c55e, weapon: 0, x: -52, y: 0, z: -38, maxHealth: 135, patrolType: 'ground' },
    { id: 'bot-4', name: 'Razor [Heavy Shock]', role: 'bot', armorColor: 0x7c2d12, tint: 0xf97316, weapon: 1, x: 52, y: 0, z: -38, maxHealth: 140, patrolType: 'ground' },
    { id: 'bot-5', name: 'Krieg [Heavy Overlord]', role: 'bot', armorColor: 0x7f1d1d, tint: 0xef4444, weapon: 2, x: 0, y: 0, z: -48, maxHealth: 155, patrolType: 'ground' }
  ];

  window.RC = window.RC || {};
  RC.core = RC.core || {};
  RC.core.tuning = { levels: LEVEL_CONFIGS, roster: BOT_ROSTER, weapons: STATE.weapons };
})();
