#!/usr/bin/env python3
"""Builds learn-3d-112248cf/tweaks.html + TWEAKS.md. Every snippet must appear exactly once-first in its file; line numbers are computed and verified."""
import os, html, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = {f: open(os.path.join(R, f), encoding='utf-8').read().split('\n') for f in ['game.js', 'style.css', 'index.html', 'mods/starter_mod.js']}
def find(f, s):
    hits = [i + 1 for i, l in enumerate(FILES[f]) if s in l]
    if not hits: sys.exit(f'NOT FOUND in {f}: {s}')
    return hits[0], len(hits)
E, M, X = 'easy', 'medium', 'risky'
# (category, title, file, search snippet, current, safe range, what happens, tag)
T = [
# Player
('Player', 'Walk speed', 'game.js', 'walkSpeed: 14', '14', '8 – 22', 'Bigger = you run faster. Over 22 you slide through doorways too fast to aim.', E),
('Player', 'Jump height', 'game.js', 'jumpVel: 8.5', '8.5', '6 – 13', 'Bigger = higher jumps. Over 13 you can hop onto catwalks.', E),
('Player', 'Gravity', 'game.js', 'gravity: 22', '22', '12 – 30', 'Smaller = floaty moon jumps. Also changes rocket and grenade arcs.', M),
('Player', 'Sprint multiplier', 'game.js', "? 1.45 : 1.0;", '1.45', '1.2 – 2.0', 'How much faster Shift (or full joystick push) makes you.', E),
('Player', 'Starting health', 'game.js', 'health: 100, maxHealth: 100, armor: 50', '100 HP / 50 armor', 'HP 50 – 300, armor 0 – 100', 'More health = harder to die. Change both health and maxHealth to the same number.', E),
('Player', 'Look sensitivity (default)', 'game.js', 'sens: 1.25', '1.25', '0.5 – 2.5', 'How fast the camera turns. The in-game slider overrides it after you move it.', E),
('Player', 'Aim assist (default)', 'game.js', 'aimAssist: 0.80', '0.80', '0 – 1', '0 = no help, 1 = strong magnet to targets near the crosshair.', E),
('Player', 'Field of view (FOV)', 'game.js', 'new THREE.PerspectiveCamera(75, window.innerWidth', '75', '60 – 100', 'Bigger = wider view (fish-eye). Smaller = zoomed in.', E),
# Weapons
('Weapons', 'Pulse Cannon damage', 'game.js', "name: 'Pulse Cannon', ammo: Infinity, maxAmmo: Infinity, damage: 28", '28', '10 – 80', 'Damage per shot of the starting gun.', E),
('Weapons', 'Pulse Cannon fire rate', 'game.js', 'fireRate: 0.13, spread: 0.008', '0.13 s between shots', '0.05 – 0.4', 'SMALLER = faster shooting. 0.05 is a laser hose.', E),
('Weapons', 'Shotgun pellets & spread', 'game.js', 'damage: 18, pellets: 8, fireRate: 0.56, spread: 0.062', '8 pellets, spread 0.062', 'pellets 4 – 16, spread 0.02 – 0.15', 'More pellets = more hits per shot. Bigger spread = wider cone.', E),
('Weapons', 'Shotgun ammo', 'game.js', "name: 'Combat Shotgun', ammo: 24, maxAmmo: 32", '24 / 32 max', '0 – 200', 'Shells at start and the most you can carry.', E),
('Weapons', 'Rocket damage & blast size', 'game.js', 'damage: 155, pellets: 1, fireRate: 0.80, spread: 0.002, color: 0xff4400, speed: 46, splash: 14.0', '155 dmg, 14 splash', 'dmg 60 – 400, splash 4 – 25', 'splash is the blast radius. Huge splash can hurt YOU too.', E),
('Weapons', 'Rocket ammo', 'game.js', "name: 'Rocket Launcher', ammo: 12, maxAmmo: 15", '12 / 15', '0 – 99', 'Rockets at start / max.', E),
('Weapons', 'Ion EMP ammo', 'game.js', "name: 'Ion EMP', ammo: 6, maxAmmo: 10", '6 / 10', '1 – 30', 'EMP is the only thing that breaks the Colossus shield. More = easier boss.', E),
('Weapons', 'Bullet speed', 'game.js', 'color: 0x38bdf8, speed: 92', '92', '40 – 200', 'How fast Pulse shots fly. Each weapon has its own speed: value.', E),
('Weapons', 'Bullet color', 'game.js', 'color: 0xffaa00, speed: 88', '0xffaa00 (orange)', 'any 0xRRGGBB', 'Colour of shotgun tracers. Try 0x00ff00 for green.', E),
('Weapons', 'Recoil strength', 'game.js', 'splash: 0, recoil: 0.14', '0.14', '0 – 0.5', 'How much the gun kicks and the screen shakes. 0 = none.', E),
('Weapons', 'Recoil max clamp', 'game.js', 'VM.recoilZ = Math.min(0.045', '0.045', '0.02 – 0.08', 'Upper limit on how far the gun slides back. Too big = gun leaves your hands.', M),
('Weapons', 'Grenades at start', 'game.js', 'grenades: 3', '3', '0 – 20', 'Number of grenades you start with.', E),
# Enemies
('Enemies', 'Enemies per floor', 'game.js', 'const count = Math.min(IS_COARSE ? 11 : 14, 4 + floor * 2', 'phones max 11, PC max 14; 4 + 2 per floor', 'max 4 – 20', 'Change 11/14 for the cap, the 4 for the base number. More = slower on phones.', M),
('Enemies', 'Heavy unit share', 'game.js', 'const heavyFrac = Math.min(0.75, 0.15', 'start 15%, max 75%', '0 – 1', 'Fraction of enemies that are big Heavy Sentinels.', M),
('Enemies', 'Enemy health growth', 'game.js', 'const hpMult = (1 + 0.12 * (lvl - 1) + 0.12 * floor)', '+12% per level and per floor', '0 – 0.3', 'How much tougher enemies get as you go deeper.', M),
('Enemies', 'Enemy damage growth', 'game.js', 'STATE.diff = { dmg: 1 + 0.08 * (lvl - 1) + 0.06 * floor', '+8%/level, +6%/floor', '0 – 0.2', 'How much harder enemies hit deeper down.', M),
('Enemies', 'Bot skill (all enemies)', 'game.js', 'botSkill: 1.0', '1.0', '0.5 – 2', 'One knob for enemy health and fire speed. 0.5 = easy mode.', E),
('Enemies', 'Roster health', 'game.js', "x: -32, y: 0, z: 38, maxHealth: 110", '110 – 155 per unit', '50 – 400', 'Each BOT_ROSTER line has its own maxHealth.', E),
('Enemies', 'Enemy names', 'game.js', "name: 'Unit Vance [Doom Sentinel]'", "'Unit Vance [Doom Sentinel]'", 'any text in quotes', 'Rename enemies shown on the kill feed.', E),
('Enemies', 'Warden (human) health', 'game.js', "x, y: 0, z, maxHealth: 70, patrolType: 'ground'", '70', '30 – 200', 'Health of the human guards on each floor.', E),
('Enemies', 'Enemy fire delay', 'game.js', 'b.fireCooldown = b.isBoss ? 0.95 : (1.15', 'boss 0.95 s, others 1.15 s', '0.4 – 3', 'SMALLER = enemies shoot more often (more aggressive).', M),
('Enemies', 'Enemy bullet damage', 'game.js', 'damage: Math.round((b.isBoss ? 22 : 11)', 'boss 22, others 11', '3 – 40', 'Damage each enemy orb does to you.', E),
('Enemies', 'Mender health', 'game.js', 'const maxHp = Math.round(320 * hpMult)', '320', '100 – 800', 'Health of the tread repair robots.', E),
('Enemies', 'Mender speed', 'game.js', 'repathT: 0, path: null, pathI: 0, speed: 2.5', '2.5', '1 – 6', 'How fast Menders roll to the wreck.', E),
('Enemies', 'Boss (Minotaur) health per level', 'game.js', 'bossHp: 420 + 160 * i', '420 + 160 per level', 'base 200 – 1500', 'Boss health on each level.', E),
('Enemies', 'Drone crash damage', 'game.js', 'damagePlayer(Math.round(20 * (STATE.diff?.dmg || 1))); scene.remove(g); DRONES.splice', '20', '5 – 50', 'Damage when a kamikaze drone hits you.', E),
('Enemies', 'Wreck / Mender timing', 'game.js', 'const WRECK_CFG = { burn:', 'burn 18/28 s, repair 24/18 s', 'keep the 2 numbers per item', 'How long a fallen Colossus burns and how long Menders take to rebuild it.', M),
# Colossus
('Colossus', 'Colossus health', 'game.js', 'C.maxHp = C.hp = isMini ? Math.round(240 + 50 * L + 30 * F) : Math.round(450 + 100 * L)', 'mini 240+, big 450 + 100/level', 'base 150 – 1500', 'More = longer boss fight.', E),
('Colossus', 'Colossus height (size)', 'game.js', 'const g = buildColossus(o.h || 24', '24 m', '14 – 34', 'Size of the giant. Bigger may poke through ceilings.', M),
('Colossus', 'Weak points list', 'game.js', "{ key: 'core', label: 'POWER CORE'", 'core mult 4, hp 0.22, r 0.07', 'mult 1 – 8, r 0.03 – 0.12', 'mult = damage multiplier, r = orb size (fraction of height), hp = share of boss HP. Edit label to rename.', M),
('Colossus', 'Colossus voice lines', 'game.js', "t: 'YOU ARE SAFE. YOU ARE LOVED. RETURN TO YOUR POD.'", 'subtitle text', 'any text', 'Changes the subtitle. The spoken mp3 stays the same.', E),
('Colossus', 'Colossus eye light', 'game.js', 'C.eye = new RTLight(0xff3300', 'red 0xff3300', 'any 0xRRGGBB', 'Glow colour of its eye.', E),
('Colossus', 'Colossus walk animation speed', 'game.js', 'a.timeScale = isMini ? 0.14 : 0.08', '0.14 / 0.08', '0.04 – 0.3', 'How fast the legs animate.', E),
# Particles
('Particles', 'Particle pool size', 'game.js', 'const N = IS_COARSE ? 90 : 240', 'phone 90, PC 240', 'phone 40 – 200, PC 100 – 600', 'Max fire/smoke/spark sprites alive at once. Bigger = denser explosions, slower phones.', M),
('Particles', 'Debris pool size', 'game.js', 'for (let i = 0; i < (IS_COARSE ? 18 : 48); i++) { const m = new THREE.Mesh(FX.debrisGeo', 'phone 18, PC 48', '0 – 120', 'Max flying chunks at once. 0 = no debris.', M),
('Particles', 'Fireball count per explosion', 'game.js', 'const nf = Math.round((lite ? 6 : 12)', 'phone 6, PC 12', '2 – 30', 'Fire puffs per blast.', E),
('Particles', 'Smoke count per explosion', 'game.js', 'const ns = Math.round((lite ? 4 : 9)', 'phone 4, PC 9', '0 – 25', 'Smoke clouds per blast.', E),
('Particles', 'Sparks/embers per explosion', 'game.js', 'const ne = Math.round((lite ? 10 : 26)', 'phone 10, PC 26', '0 – 60', 'Glowing sparks per blast.', E),
('Particles', 'Debris chunks per explosion', 'game.js', 'let nd = Math.round((lite ? 4 : 9)', 'phone 4, PC 9', '0 – 20', 'Chunks thrown per blast.', E),
('Particles', 'Debris chunk size', 'game.js', 'const sz = (0.06 + Math.random() * 0.16)', '0.06 – 0.22', '0.02 – 0.3', 'Size of flying debris. Smaller fixes the "big flat triangles" look.', E),
('Particles', 'Scorch mark size & lifetime', 'game.js', 'd.m.scale.setScalar(3.2 * S); d.m.rotation.z = Math.random() * 6.28; d.m.visible = true; d.life = d.max = 25', 'size 3.2, 25 s', 'size 1 – 6, life 5 – 60', 'Black burn mark left on the floor.', E),
('Particles', 'Muzzle flash size', 'game.js', "fxEmit('fire', x, y, z, { life: 0.08, s0: fromPlayer ? 0.75 : 0.5", 'you 0.75, enemies 0.5', '0.3 – 1.5', 'Size of the flash at the gun tip.', E),
('Particles', 'Muzzle sparks', 'game.js', "for (let i = 0; i < (IS_COARSE ? 2 : 5); i++) fxEmit('dot', x, y, z", 'phone 2, PC 5', '0 – 12', 'Little sparks per shot.', E),
('Particles', 'Bullet impact sparks', 'game.js', 'for (let i = 0; i < (IS_COARSE ? 4 : 10); i++) {', 'phone 4, PC 10', '0 – 25', 'Sparks when a bullet hits a wall.', E),
('Particles', 'Flame burst size', 'game.js', 'function spawnVolumetricFlameBurst(x, y, z, count = 18, spread = 2.2)', '18 flames, spread 2.2', 'count 5 – 40', 'Default napalm/fire burst.', M),
('Particles', 'Explosive barrels per floor', 'game.js', 'spawnExplosiveBarrels(IS_COARSE ? 3 : 5)', 'phone 3, PC 5', '0 – 12', 'Red barrels you can shoot.', E),
# Models
('Models & scale', 'Model load list', 'game.js', 'const jobs = [', '~45 files', 'one line each', "Each line: file, role, height (metres). Change height: to resize a model. Add a line to load a new one.", M),
('Models & scale', 'Sentinel guard height', 'game.js', "{ file: 'models/sentinel_guard.glb', role: 'guard', height: 2.15 }", '2.15 m', '1.6 – 3.2', 'Size of standard Sentinels.', E),
('Models & scale', 'Heavy Sentinel height', 'game.js', "{ file: 'models/sentinel_heavy.glb', role: 'bot', height: 2.55 }", '2.55 m', '2 – 3.5', 'Size of Heavy Sentinels. Hit box does not grow with it.', M),
('Models & scale', 'Pulse Cannon viewmodel size', 'game.js', "{ file: 'models/pulse_cannon.glb', role: 'viewmodel', height: 0.55 }", '0.55', '0.35 – 0.8', 'How big your gun looks on screen.', E),
('Models & scale', 'Shotgun viewmodel size', 'game.js', "{ file: 'models/player_shotgun_scifi.glb', role: 'vm:shotgun', height: 0.3", '0.3', '0.2 – 0.5', 'Size of the shotgun in your hands.', E),
('Models & scale', 'Drone model size', 'game.js', "{ file: 'models/bot_drone.glb', role: 'prop:bot_drone', height: 0.9 }", '0.9 m', '0.5 – 1.8', 'Size of flying drones.', E),
('Models & scale', 'Extinguisher size', 'game.js', "{ file: 'models/ph_extinguisher.glb', role: 'prop:ph_extinguisher', height: 0.62 }", '0.62 m', '0.4 – 1', 'A safe one to practise resizing.', E),
('Models & scale', 'Prop placement (example)', 'game.js', "add('extinguisher', -3.9, 69, { rot: Math.PI / 2 })", 'x -3.9, z 69, turned 90°', 'move x/z by ±5', "add('type', x, z, {rot}) places props. rot is in radians: Math.PI = 180°.", M),
('Models & scale', 'Boss scale', 'game.js', 'bossScale: 1.75', '1.75', '1 – 3', 'Size multiplier of the Minotaur boss.', E),
# Levels
('Levels', 'Level names', 'game.js', "const names = ['THE SPINE · INTAKE & DETENTION'", '9 names', 'any text', 'Titles shown when a level starts.', E),
('Levels', 'Floor names', 'game.js', "const FLOOR_NAMES = ['G', 'B1', 'B2', 'B3'];", "'G','B1','B2','B3'", 'text only, keep 4', 'Labels for floors.', E),
('Levels', 'Number of levels', 'game.js', 'maxLevels: 9', '9', '1 – 9', 'Fewer = shorter campaign. Above 9 there are no configs.', M),
('Levels', 'Level speed-up', 'game.js', 'speedMult: 1 + 0.06 * (i - 1)', '+6% per level', '0 – 0.15', 'How much faster enemies move each level.', M),
('Levels', 'Lore notes text', 'game.js', 'const LORE_MEMOS = [', 'memo text', 'any text, keep quotes', "The notes you read. Use \\' for an apostrophe.", M),
# Lighting
('Lighting & fog', 'Fog thickness', 'game.js', 'scene.fog = new THREE.FogExp2(0x07090d, 0.0075)', '0.0075', '0 – 0.03', 'Bigger = thicker haze. 0 = crystal clear.', E),
('Lighting & fog', 'Per-level fog colours', 'game.js', 'const fogs = [0x050911', '9 colours', 'any 0xRRGGBB', 'Background/fog tint per level.', E),
('Lighting & fog', 'Per-level sky light colour', 'game.js', 'const hemis = [0xddeeff', '9 colours', 'any 0xRRGGBB', 'Main ambient light tint per level.', E),
('Lighting & fog', 'Default brightness', 'game.js', 'if (!isFinite(BRIGHTNESS)) BRIGHTNESS = 1.0;', '1.0', '0.6 – 3', 'Only used until the player moves the brightness slider.', E),
# Graphics
('Graphics & speed', 'Pixel ratio (sharpness)', 'game.js', 'renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_COARSE ? 1.1 : 2))', 'phone 1.1, PC 2', 'phone 0.7 – 2', 'Lower = blurrier but much faster on phones.', E),
('Graphics & speed', 'Shadow sharpness', 'game.js', 'const SHADOW_RES = IS_COARSE ? 1024 : 2048', 'phone 1024, PC 2048', '512, 1024, 2048, 4096', 'Use powers of 2 only. Lower = faster.', M),
('Graphics & speed', 'Draw distance', 'game.js', 'window.innerWidth / window.innerHeight, 0.1, 320)', '320 m', '100 – 600', 'Things farther than this are not drawn.', M),
# Audio
('Audio', 'Default music volume', 'game.js', "localStorage.getItem('dys_music_vol') ?? '0.55'", '0.55', '0 – 1', 'Starting music volume (slider overrides it).', E),
('Audio', 'Music tracks', 'game.js', 'const MUSIC_TRACKS = {', 'Kevin MacLeod files', 'files in music/', 'Swap file names to change songs. Credit any new music (CC BY).', M),
('Audio', 'Guard callout volume', 'game.js', 'c.volume = Math.max(0.15, Math.min(1, 1 - d / 70))', 'fades over 70 m', '20 – 150', 'Bigger = you hear guards shout from farther.', M),
('Audio', 'Sentinel dispatch volume', 'game.js', "a.volume = 0.9; a.play()", '0.9', '0 – 1', 'Loudness of the Mender dispatch line.', E),
# Touch
('Touch controls', 'Joystick reach', 'game.js', 'const JOY_RADIUS = 58, JOY_DEAD = 10', 'radius 58 px, dead zone 10', 'radius 40 – 90, dead 0 – 25', 'Radius = how far to drag for full speed. Dead zone = ignore tiny wobbles.', E),
('Touch controls', 'Joystick size', 'style.css', '.joystick-base { position:absolute; width:128px; height:128px', '128 px', '90 – 180', 'Size of the joystick ring. Change width AND height.', E),
('Touch controls', 'Fire button size & place', 'style.css', 'body.mtouch #btn-fire { width:20vmin; height:20vmin', '20vmin', '14 – 28vmin', 'vmin = % of the short screen side. right/bottom move it.', E),
('Touch controls', 'Jump button', 'style.css', 'body.mtouch #btn-jump    { width:12.5vmin', '12.5vmin', '9 – 18vmin', 'Size of jump button.', E),
# UI
('UI & fonts', 'Theme colours', 'style.css', ':root { --rust:#5a2e16;', 'rust, ember #ff6a00, bone…', 'any #RRGGBB', 'Main HUD palette. Try --ember:#00e5ff for a blue theme.', E),
('UI & fonts', 'Main body font', 'style.css', "body, button, select, input { font-family:'Chakra Petch'", 'Chakra Petch', 'Black Ops One, Caveat, sans-serif', 'Font for most text.', E),
('UI & fonts', 'Title gradient', 'style.css', '.q3-title { font-family:\'Black Ops One\',sans-serif; background:linear-gradient(180deg,#fff7c2', 'yellow → red', 'any colours', 'The fiery DYSTOPIA title.', E),
('UI & fonts', 'Crosshair colour', 'style.css', '#crosshair .absolute { background:rgba(255,183,3,.9)', 'amber', 'any rgba', 'Colour of the aim cross.', E),
('UI & fonts', 'Floor banner colour', 'style.css', "#banner-title { font-family:'Black Ops One',sans-serif !important; color:#ffb703", '#ffb703', 'any #RRGGBB', 'Big floor-start title colour.', E),
# Text
('Text', 'Browser tab title', 'index.html', '<title>DYSTOPIA', 'DYSTOPIA — Project Moses (...)', 'any text', 'Name shown on the browser tab.', E),
('Text', 'Splash subtitle', 'index.html', '>Project Moses</p>', 'Project Moses', 'any text', 'Line under the big logo.', E),
('Text', 'Loading message', 'index.html', 'Initializing Triage systems…', 'Initializing Triage systems…', 'any text', 'First loading line.', E),
('Text', 'Game title (code)', 'game.js', 'let GAME_BRAND_TITLE = "DYSTOPIA";', 'DYSTOPIA', 'any text', 'Name used by the game code.', E),
# Trailer
('Trailer', 'Trailer file & seen key', 'game.js', "TRAILER_KEY = 'dys_trailer_seen_v4'", "media/dystopia_trailer_720p.mp4, key v4", 'v5, v6…', 'Change v4 to v5 and everyone sees the trailer once more on startup.', E),
# Multiplayer
('Multiplayer', 'Room code length', 'game.js', 'for (let i = 0; i < 5; i++) s += chars[', '5 letters', '4 – 6', 'Length of room codes. Also update the 4 in the join check (code.length < 4).', M),
('Multiplayer', 'Room code letters', 'game.js', "const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'", 'no I, O, 0, 1', 'letters/digits', 'Characters that can appear in codes.', E),
('Multiplayer', 'Relay (TURN) servers', 'game.js', 'const DM_TURN = [];', 'empty', 'Ask Grok Bot', 'Needed for different networks. Holds a login, so never paste secrets in chat.', X),
('Multiplayer', 'Deathmatch bot count', 'game.js', 'DM.maxBots ?? 7', '7', '0 – 7', 'Bots that fill empty deathmatch slots.', E),

# Shadows
('Shadows', 'Shadows on/off (default)', 'game.js', "let SHADOWS_ON = localStorage.getItem(SHADOW_KEY) !== '0';", 'on (unless the menu turned it off)', "change !== '0' to === '1' for default off", 'Biggest single speed win on phones. The in-game Shadows toggle also sets it.', M),
('Shadows', 'Shadow softness type', 'game.js', 'renderer.shadowMap.type = THREE.PCFSoftShadowMap;', 'PCFSoftShadowMap', 'BasicShadowMap, PCFShadowMap, PCFSoftShadowMap', 'Basic = hard, pixely, fastest. PCFSoft = smooth, slowest.', E),
('Shadows', 'Main sun light casts shadow', 'game.js', 'dirLight.castShadow = true;', 'true', 'true / false', 'false = the big overhead light stops making shadows. Much faster.', E),
('Shadows', 'Sun shadow resolution', 'game.js', 'dirLight.shadow.mapSize.set(SHADOW_RES, SHADOW_RES);', 'SHADOW_RES (1024 phone / 2048 PC)', 'see Graphics: Shadow sharpness', 'Uses the SHADOW_RES number. Change that one instead.', E),
('Shadows', 'Sun shadow box size', 'game.js', 'sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45;', '±45 m', '25 – 90', 'Area that gets shadows. Smaller = sharper shadows but they stop at the edge. Change all four.', M),
('Shadows', 'Sun shadow acne fix (bias)', 'game.js', 'dirLight.shadow.bias = -0.0004; dirLight.shadow.normalBias = 0.04; dirLight.shadow.radius = 3;', 'bias -0.0004, normalBias 0.04, radius 3', 'bias -0.002 – 0, radius 1 – 6', 'Stripes on walls ("acne")? Make bias more negative. radius = blur.', M),
('Shadows', 'Spotlight shadow resolution', 'game.js', 'sp.castShadow = true; sp.shadow.mapSize.set(IS_COARSE ? 512 : 1024', 'phone 512, PC 1024', '256 – 2048 (powers of 2)', 'Shadows from the hanging key spotlights.', M),
('Shadows', 'How many shadow spotlights', 'game.js', 'keySpots.slice(0, IS_COARSE ? 1 : 2)', 'phone 1, PC 2', '0 – 2', 'Each shadow spotlight costs a full extra render. 0 on phones = smoother.', M),
('Shadows', 'Catwalks cast shadow', 'game.js', 'deck.castShadow = !IS_COARSE;', 'PC only', 'true / false / !IS_COARSE', 'Catwalk decks throw shadows on the floor.', E),
('Shadows', 'Enemies cast/receive shadows', 'game.js', "rig.root.traverse(o => { if (o.isMesh && !o.isSprite) { o.castShadow = true; o.receiveShadow = !IS_COARSE; } });", 'cast yes, receive PC only', 'true / false', 'castShadow = makes a shadow. receiveShadow = gets darkened by others.', E),
('Shadows', 'Props cast/receive shadows', 'game.js', 'c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });', 'both on', 'true / false', 'Applies to every loaded prop model (crates, racks…).', E),
# Lighting
('Lighting & fog', 'Tone mapping style', 'game.js', 'renderer.toneMapping = THREE.ACESFilmicToneMapping;', 'ACESFilmic', 'ACESFilmicToneMapping, ReinhardToneMapping, LinearToneMapping, NoToneMapping', 'Overall "film look". ACES = punchy, Reinhard = soft.', E),
('Lighting & fog', 'Background colour (start)', 'game.js', 'scene.background = new THREE.Color(0x07090d);', '0x07090d', 'any 0xRRGGBB', 'Colour behind everything. Each level then tints it from its fog colour.', E),
('Lighting & fog', 'Hemisphere (sky/ground) light', 'game.js', 'const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x1a1e26, 0.05);', 'sky 0xddeeff, ground 0x1a1e26, 0.05', 'intensity 0 – 0.6', 'Soft light from everywhere. Raise to 0.3 to light up dark corners.', E),
('Lighting & fog', 'Ambient light', 'game.js', 'const ambientLight = new THREE.AmbientLight(0x8090a8, 0.03);', '0.03', '0 – 0.5', 'Flat even light. Too high = everything looks flat and grey.', E),
('Lighting & fog', 'Blue fill light', 'game.js', 'const fillLight = new THREE.DirectionalLight(0x6f9cff, 0.06);', '0.06', '0 – 0.5', 'Cool moonlight from one side.', E),
('Lighting & fog', 'Sun/key light', 'game.js', 'const dirLight = new THREE.DirectionalLight(0xffe6c8, 0.12);', '0xffe6c8, 0.12', '0 – 1.5', 'Main shadow-casting light from above.', E),
('Lighting & fog', 'Sun position', 'game.js', 'dirLight.position.set(45, 85, 35);', 'x 45, y 85, z 35', 'y 30 – 150', 'Where the sun sits. Lower y = long dramatic shadows.', M),
('Lighting & fog', 'Player lantern (around you)', 'game.js', 'const camFill = new THREE.PointLight(0xffe2c0, 0.12, 10, 1.6);', '0.12, reach 10 m', 'intensity 0 – 1, reach 5 – 25', 'A small light that follows you. Raise it if the game feels too dark.', E),
('Lighting & fog', 'Gun/hands light', 'game.js', 'const vmLight = new THREE.PointLight(0xfff0dc, 1.7, 3.0, 1.5);', '1.7', '0.5 – 3', 'Lights up the weapon in your hands.', E),
('Lighting & fog', 'Hanging ceiling lights', 'game.js', "addHangingLight(x, lh, z, i % 3 === 0 ? theme.light : PAL[(i + floor) % PAL.length], 2.2, 22)", 'intensity 2.2, reach 22 m', 'intensity 0.5 – 5, reach 10 – 40', 'The lamps in every room. Last two numbers.', E),
('Lighting & fog', 'Ceiling light colour palette', 'game.js', 'const PAL = [0xffa24a, 0x4aa8ff, theme.light, 0xff5a3a];', 'orange, blue, theme, red', 'any 0xRRGGBB', 'Colours the ceiling lamps cycle through.', E),
('Lighting & fog', 'Real lamps on phones', 'game.js', 'const realOK = !IS_COARSE || LIGHT_COUNT < 4;', 'first 4 lamps', '2 – 8', 'Phones fake the rest with glowing floor circles. More real lamps = slower.', M),
('Lighting & fog', 'Per-floor light tint', 'game.js', "{ key: 'farm', title: 'B1 · SERVER FARM', light: 0x9fd8ff }", 'B1 icy blue', 'any 0xRRGGBB', 'Each floor (G, B1, B2, B3) has a light colour and title in FLOOR_THEMES.', E),
('Lighting & fog', 'Key spotlights', 'game.js', 'const sp = new THREE.SpotLight(0xfff1dd, 1.4, 60, 0.75, 0.5, 1.5);', 'colour, 1.4, 60 m, angle 0.75', 'intensity 0.5 – 4, angle 0.3 – 1.2', 'The bright cones over the security desk.', E),
('Lighting & fog', 'Exit door green light', 'game.js', 'const dl = new THREE.PointLight(0x3dff9a, 2.2, 22, 1.6);', 'green, 2.2', 'any colour, 0.5 – 5', 'The glow that shows you where the exit is.', E),
('Lighting & fog', 'Alarm beacon flash colour', 'game.js', 'sirenBeaconMeshes.forEach(b => b.material.color.setHex(flashOn ? 0xff0000 : 0x2a0505));', 'red / dark red', 'any 0xRRGGBB', 'Siren lights when the alarm goes off.', E),
('Lighting & fog', 'Alarm length', 'game.js', 'sirenActiveTimer = 4; SFX.playSiren && SFX.playSiren(3);', '4 s, 3 wails', '1 – 15', 'How long the alarm flashes.', E),
('Lighting & fog', 'Gun-flash light pool', 'game.js', 'const n = IS_COARSE ? 4 : 8; for (let i = 0; i < n; i++) { const L = new THREE.PointLight(0xffffff, 0, 10, 2)', 'phone 4, PC 8', '2 – 12', 'How many short flashes (shots, explosions) can light the room at once.', M),
('Lighting & fog', 'Pickup glow', 'game.js', 'new THREE.OctahedronGeometry(0.65, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.8 })', 'size 0.65, glow 1.8', 'size 0.3 – 1.2, glow 0 – 4', 'Emissive = glows without a light. Bigger = easier to spot pickups.', E),
('Lighting & fog', 'Enemy neon glow', 'game.js', 'const glowMat = new THREE.MeshStandardMaterial({ color: neonHex, emissive: neonHex, emissiveIntensity: 2.8 });', '2.8', '0.5 – 5', 'How bright the Sentinels\' neon trims glow.', E),
# Camera / effects
('Camera & effects', 'Screen shake strength', 'game.js', 'camera.position.x += (Math.random() - 0.5) * STATE.screenShake * 0.35;', '0.35 (x), 0.25 (y next line)', '0 – 0.8', '0 = no shake from explosions and recoil.', E),
('Camera & effects', 'Muzzle vignette flash time', 'game.js', "setTimeout(() => { vig.style.opacity = '0'; }, 50);", '50 ms', '0 – 150', 'How long the screen edges flash when you fire.', E),
('Camera & effects', '180° quick-turn key', 'game.js', "if (e.code === 'KeyX') STATE.player.yaw += Math.PI;", 'X', 'any key code', 'Spin around instantly.', E),
# Controls
('Controls', 'Weapon keys', 'game.js', "if (e.code === 'Digit1') switchWeapon(0);", '1 2 3 4', "'KeyZ' etc.", "Key names look like 'KeyA', 'Digit1', 'ShiftLeft'.", E),
('Controls', 'Grenade key', 'game.js', "if (e.code === 'KeyG' || e.code === 'KeyQ') throwFragGrenade();", 'G or Q', 'any key code', 'Throw a grenade.', E),
('Controls', 'Sprint key', 'game.js', "const sprint = (KEYS['ShiftLeft']", 'Left Shift', 'any key code', 'Hold to run.', E),
# HUD
('HUD layout', 'Minimap size', 'index.html', '<canvas id="minimap-canvas" width="98" height="98"', '98 × 98 px', '70 – 160', 'Change both numbers the same.', E),
('HUD layout', 'Minimap label', 'index.html', 'Dystopia Radar</div>', 'Dystopia Radar', 'any text', 'Text under the minimap.', E),
('HUD layout', 'Health number', 'index.html', '<span id="hud-health"', 'green HP', 'Tailwind classes like text-red-400', 'Swap text-… classes to recolour. Never change the id.', M),
('HUD layout', 'Weapon name style', 'index.html', '<span id="hud-wep-name" class="text-[9px]', '9 px amber', 'text-[8px] – text-[16px]', 'Size of the weapon name on the HUD.', E),
# Loot
('Loot & pickups', 'Which pickups spawn', 'game.js', "const types = [['health', 0x22c55e], ['armor', 0x00f0ff]", '2 health, 1 armor, 1 ammo, 1 quad, 3 EMP', 'add or remove entries', 'Copy an entry like [\'health\', 0x22c55e], to add another pickup per floor.', M),
('Loot & pickups', 'Health pickup amount', 'game.js', "if (p.type === 'health') STATE.player.health = Math.min(100, STATE.player.health + 35);", '+35 (max 100)', '10 – 100', 'If you raised max health, raise the 100 here too.', E),
('Loot & pickups', 'Armor pickup amount', 'game.js', "if (p.type === 'armor') STATE.player.armor = Math.min(100, STATE.player.armor + 40);", '+40', '10 – 100', 'Armor per pickup.', E),
('Loot & pickups', 'Quad damage time', 'game.js', "if (p.type === 'quad') STATE.quadTimer = 12;", '12 s', '3 – 30', 'Length of the purple power-up.', E),
('Loot & pickups', 'Pickup respawn time', 'game.js', 'p.respawnTimer = 15; SFX.playKeyPickup();', '15 s', '5 – 120', 'How soon a used pickup comes back.', E),
# Save data
('Save data', 'Brightness save key', 'game.js', "const BRIGHTNESS_KEY = 'dystopia_brightness';", "'dystopia_brightness'", 'rename to reset everyone', 'Saved in the browser (localStorage). Other keys: dystopia_shadows, dys_music_on, dys_music_vol, dys_look, dys_gfx, dys_name, dys_skin, dys_trailer_seen_v4.', M),
('Save data', 'Touch look speed save', 'game.js', "sens: parseFloat(localStorage.getItem('dys_look') || '') || 1.0", '1.0 default', '0.5 – 2', 'Default touch look speed if nothing is saved.', E),
]

GUIDE = [
 ('A1. Which folder', 'Put files here (lowercase names, no spaces): <code>models/</code> 3D (.glb) · <code>images/tex/</code> textures (.jpg/.png) · <code>audio/</code> short sounds (.mp3) · <code>music/</code> songs (.mp3) · <code>media/</code> video (.mp4) · <code>fonts/</code> (.woff2).', []),
 ('A2. Formats + phone budget', 'Use <b>.glb</b> (one file; .gltf needs its extra files too). Textures .jpg (photos) or .png (see-through), 1024×1024 max. Sounds .mp3 (works on iPhone; .ogg does NOT play on iPhone Safari). Budget per model: <b>under 1.5 MB and under ~15,000 triangles</b>. Characters up to ~25k. Shrink big ones (see the Android tutorial, A4).', []),
 ('A3. Load a model: one line in the jobs list', 'Add a line inside <code>const jobs = [</code>. Format: <code>{ file: \'models/NAME.glb\', role: \'prop:NAME\', height: METRES },</code>. The game resizes the model so it is exactly that tall. Copy the extinguisher line as your template:', [('game.js', 'const jobs = ['), ('game.js', "{ file: 'models/ph_extinguisher.glb', role: 'prop:ph_extinguisher', height: 0.62 },")]),
 ('A4. Worked example: a traffic cone', '1) Import <code>cone.glb</code> into <code>models/</code>. 2) Under the extinguisher line add <code>{ file: \'models/cone.glb\', role: \'prop:cone\', height: 0.7 },</code> 3) Teach the map what a "cone" is: inside <code>PROP_BUILDERS = {</code>, copy the <code>extinguisher(o) {</code> block, rename it <code>cone(o) {</code> and change <code>cloneProp(\'ph_extinguisher\')</code> to <code>cloneProp(\'cone\')</code>. 4) Place it (A5). The prop key after <code>prop:</code> must match the name in cloneProp.', [('game.js', 'const PROP_BUILDERS = {'), ('game.js', '  extinguisher(o) {'), ('game.js', 'function cloneProp(key) {')]),
 ('A5. Place it on a floor', 'Placements live in <code>genFloorLayout</code>, one block per floor. <code>if (floor === 0)</code> is G, <code>floor === 1</code> is B1, <code>floor === 2</code> is B2, the last <code>else</code> is B3. Add <code>add(\'cone\', 2, 60, { rot: 0 });</code> inside a block. x = left/right (-88 to 88), z = front/back (start is near z 70 on G). <code>rot</code> is radians: <code>Math.PI / 2</code> = 90°. Size: add <code>h: 1.2</code> in the {…} for builders that read <code>o.h</code>, or change height in jobs.', [('game.js', 'function genFloorLayout(level, floor) {'), ('game.js', "const add = (type, x, z, extra = {}) =>"), ('game.js', "add('extinguisher', -3.9, 69, { rot: Math.PI / 2 });")]),
 ('A6. Swap or add a texture', 'Easiest: replace <code>images/tex/metal_wall_1k.jpg</code> with your own picture of the <b>same name</b>. To use a new name, edit the path in the line below. For a single material: <code>map: new THREE.TextureLoader().load(\'images/tex/my.jpg\')</code> inside its <code>MeshStandardMaterial({ … })</code>.', [('game.js', "swap(WALL_PBR.map, 'images/tex/metal_wall_1k.jpg'")]),
 ('A7. Add a sound effect', 'Copy how the Mender dispatch line plays: <code>const a = new Audio(\'audio/my_sound.mp3\'); a.volume = 0.8; a.play().catch(() => {});</code> Put it where the event happens (e.g. inside <code>firePlayerWeapon</code>).', [('game.js', "const a = new Audio('audio/sentinel_dispatch.mp3'); a.volume = 0.9;"), ('game.js', 'function firePlayerWeapon')]),
 ('A8. Add or swap music', 'Each slot in MUSIC_TRACKS is a song. Change the <code>url:</code> to your file in <code>music/</code>, and update <code>name</code>/<code>by</code> for the credits. Only use music you have the rights to (CC0/CC BY), and never your own songs in builds.', [('game.js', "title: { url: 'music/title_rising_game.mp3'")]),
 ('A9. New enemy type', '<b>Risky, ask Grok Bot for the first one.</b> Short version: load the model with <code>role: \'guard\'</code>-style line in jobs, then add an entry to BOT_ROSTER (copy a line, change id, name, maxHealth, tint). Enemies on floors are spawned in startFloor from BOT_ROSTER.', [('game.js', 'let BOT_ROSTER = ['), ('game.js', 'function startFloor(lvl, floor) {')]),
 ('A10. Upload the file in Spck', 'Spck file tree → long-press the <code>models</code> folder → <b>Import / Upload file</b> → pick from Downloads. Then Git → Changes → tick the new file + game.js → Commit with a message → <b>Push</b>. Live in ~1 minute.', []),
 ('A11. Common mistakes', '<ul><li><b>Case matters</b> online: <code>Cone.glb</code> ≠ <code>cone.glb</code>. Works in preview, breaks live.</li><li>Path is relative to index.html: <code>models/cone.glb</code>, never <code>/sdcard/…</code> or <code>C:\\</code>.</li><li>Opening index.html from the Files app (file://) blocks model loading (CORS). Use Spck preview.</li><li>Forgot the comma at the end of the jobs line → black screen.</li><li>Big file (10 MB+) → slow load, phone crashes. Shrink first.</li><li>Model is sideways? add <code>yaw: Math.PI / 2</code> to its jobs line.</li></ul>', []),
]

MODS = [
 ('M1. Make a new JS file', 'In Spck long-press the <code>mods</code> folder → New file → <code>mymod.js</code>. Start by copying <code>mods/starter_mod.js</code> (it is in the repo, tested in headless Chrome: cube spins, M toggles fog, kills print to the console).', [('mods/starter_mod.js', 'const MOD_CUBE = new THREE.Mesh(')]),
 ('M2. Load it after game.js', 'In index.html, add your line <b>under</b> the game.js line. The <code>?v=1</code> is a cache-buster: bump it to <code>?v=2</code> each time you push so phones grab the new copy.', [('index.html', '<script src="game.js?v=')]),
 ('M3. Starter mod: what each part does', '1) a glowing cube added to <code>scene</code> · 2) <kbd>M</kbd> toggles <code>scene.fog</code> · 3) wraps <code>finishBotKill</code> to log each kill · 4) its own <code>requestAnimationFrame</code> loop keeps the cube in front of you. 👀 Instant win: change <code>0xff00ff</code> to <code>0x00ff00</code> and the cube turns green.', [('mods/starter_mod.js', 'finishBotKill = function (b) {'), ('mods/starter_mod.js', 'function modLoop() {')]),
 ('M4. Safe hook points (globals you can use)', '<code>THREE</code> (3D library) · <code>scene</code> (add/remove things) · <code>camera</code> · <code>renderer</code> · <code>STATE</code> (player, weapons, level, floor) · <code>STATE.player</code> (x, y, z, yaw, health) · <code>BOTS</code> (enemy list) · <code>PICKUPS</code> · <code>SFX</code> (sounds) · functions you can call or wrap: <code>startFloor(lvl, floor)</code>, <code>finishBotKill(b)</code>, <code>damagePlayer(dmg, src)</code>, <code>explode(x, y, z, {scale})</code>, <code>addKillFeed(msg)</code>. <b>Wrap</b> = save the old one, replace it, call the old one inside (like M3).', [('game.js', 'const STATE = {'), ('game.js', 'let BOTS = [];'), ('game.js', 'function explode(x, y, z, opt = {}) {'), ('game.js', 'function addKillFeed(msg) {')]),
 ('M5. Try in the console first', 'Easiest experiment of all: wrap a line, e.g. <code>explode(STATE.player.x, 1, STATE.player.z - 6, { scale: 2 })</code> in a mod, or in Chrome DevTools/Eruda console. Boom in front of you.', []),
 ('M6. Your own CSS file', 'Make <code>mymod.css</code> and add <code>&lt;link rel="stylesheet" href="mymod.css?v=1"&gt;</code> in index.html <b>under</b> the style.css line. Later rules win, so <code>#crosshair .absolute { background:lime !important; }</code> overrides the game.', [('index.html', '<link rel="stylesheet" href="style.css?v=')]),
 ('M7. Your own level data file', 'Make <code>mods/mylevel.js</code> that changes data before you play, e.g. <code>LEVEL_CONFIGS[1].name = \'MY LEVEL\'; LEVEL_CONFIGS[1].fogColor = 0x220000;</code>, or pushes props in a wrapped <code>genFloorLayout</code> (call the old one, then <code>out.objects.push({ id: \'my-1\', type: \'crate\', x: 0, z: 60, w: 3, d: 3, h: 3, rot: 0, color: \'#f00\' })</code> and return it). Load it after game.js.', [('game.js', 'const LEVEL_CONFIGS = (() => {'), ('game.js', 'function genFloorLayout(level, floor) {')]),
 ('M8. New HTML pages', 'Any <code>.html</code> you add is a web page at <code>…/dystopia-project-moses/yourpage.html</code>. Copy <code>learn-3d-112248cf/step1.html</code> as a template. Link to it from anywhere with <code>&lt;a href="yourpage.html"&gt;</code>.', []),
 ('M9. What NOT to touch', '<ul><li>Don\'t rename game.js functions or top-level names (STATE, BOTS…) — other code calls them.</li><li>Don\'t delete or rename an <code>id="…"</code> in index.html — game.js looks them up.</li><li>Don\'t edit <code>tools/</code> or <code>regression-out/</code> from Spck.</li><li>Never paste tokens or API keys into a file (the Meshy key lives only in the browser).</li><li>Mods can\'t change <code>const</code> numbers inside functions — for those, edit game.js (see the tweak cards).</li></ul>', []),
]
TOUR_FILES = [
 ('index.html', 'The page: HUD, menus and buttons (HTML). Loads style.css then game.js.'),
 ('style.css', 'All the looks: fonts, colours, touch button sizes.'),
 ('game.js', 'The whole game (~6,400 lines). Map below.'),
 ('mods/starter_mod.js', 'Example mod (not loaded until you add its script line).'),
 ('models/', '3D .glb files (enemies, guns, props).'), ('images/', 'Textures (images/tex/) and the title background.'),
 ('audio/', 'Voice lines and short sounds.'), ('music/', 'Kevin MacLeod songs (CC BY 4.0).'), ('media/', 'Trailer video + poster + TRAILER_SOURCES.md credits.'),
 ('fonts/', 'Black Ops One, Chakra Petch, Caveat (.woff2).'), ('icons/, manifest.webmanifest', 'Home-screen app icon and install info.'),
 ('CREDITS.md', 'Who made each asset. Add a line whenever you add one.'), ('STORY_BIBLE.md', 'The lore: Moses, the Accord, the Sentinels.'), ('README.md', 'Project summary.'),
 ('learn-3d-112248cf/', 'Tutorials: step1–10, android.html, vscode.html, this page.'),
 ('dystopia-upgraded.html', 'Old single-file version (history only, not the live game).'),
 ('unity-test-2f894cad/', 'An old Unity experiment + Android APK. Not used by the web game.'),
 ('regression-out/', 'Screenshots from the last test run. Safe to ignore.'),
 ('tools/regression.js', 'Plays every level in headless Chrome and checks 264 things (bots move, doors open…). <b>Computer + Node only, not Spck.</b> Ask Grok Bot to run it.'),
 ('tools/CHECKLIST.md', 'The list of what regression.js checks.'),
 ('tools/shots.js', 'Screenshots of every screen at phone sizes. Node only.'),
 ('tools/peek.js', 'Screenshots of chosen spots in a level. Node only.'),
 ('tools/trailer_capture.js', 'Records trailer gameplay frame-by-frame at 30 fps. Node only.'),
 ('tools/mp_test.js + fakepeer.js', 'Tests multiplayer with two fake players. Node only.'),
 ('tools/mod_test.js', 'Checks the starter mod works. Node only.'),
 ('tools/build_tweaks.py', 'Builds this page and TWEAKS.md, and checks every line number. Python only.'),
]
SECTIONS = [('Header, settings, level data, player/weapons (STATE)', 'let IS_RELEASE_BUILD = false;'), ('Sound synth (SFX)', 'class SoundSynth'), ('Renderer, camera, lights, textures', 'const IS_COARSE ='),
 ('Enemy bodies (procedural Sentinels)', 'const sinewMat = new THREE.MeshStandardMaterial'), ('World pieces (walls, lights, signs, props)', 'let BOTS = [];'),
 ('Floor system: Colossus, floor layouts, startFloor', 'const FLOOR_NAMES ='), ('Model loading (jobs list)', 'function normalizeMeshyScene'), ('Squad AI: nav grid, cover, A*', 'const NAV = {'),
 ('Lore notes and posters', 'const LORE_POSTERS = ['), ('Enemy weapons', 'const ENEMY_WEAPON_TPL ='), ('FPS arms + viewmodel', '// FPS ARMS'), ('Spawning, Menders, firing', '// SPAWN / COMBAT / DEATH GIB'),
 ('Explosions & particles', 'const FX = { ready: false };'), ('Score, Colossus weak points, wreck', '// SCORE + popups'), ('Barrels and drones', '// EXPLOSIVE BARRELS'),
 ('Controls + the main game loop', '// CONTROLS + GAME LOOP'), ('Studio, Meshy panel, party, startup', '// STUDIO, MESHY API PANEL'), ('Weapons detail, offices, mobile UI', '// ======================= Round 11: distinct'),
 ('Cheats, skins, deathmatch multiplayer', '// ROUND 12: CHEAT CODES'), ('Music, trailer, final UI', 'const MUSIC_TRACKS = {')]
READ_FIRST = [('updateHUD()', 'function updateHUD()', 'Short. Shows how numbers in STATE become text on screen.'),
 ('firePlayerWeapon()', 'function firePlayerWeapon', 'What happens when you pull the trigger: ammo, recoil, bullets.'),
 ('explode()', 'function explode(x, y, z, opt = {})', 'Numbered steps 1–7: flash, fire, smoke, sparks, debris. Very readable.'),
 ('damagePlayer()', 'function damagePlayer(dmg, src)', 'Armor, health, death screen: simple if/else logic.'),
 ('partyCode()', 'function partyCode()', '3 lines. A loop that builds a random code. Perfect first read.'),
 ('startFloor()', 'function startFloor(lvl, floor)', 'How a level is built and enemies are spawned.'),
 ('gameLoop()', 'function gameLoop(now)', 'The heartbeat: runs every frame. Read the first 30 lines.')]
LEARN = [('1. Turbo legs', 'Change <code>walkSpeed: 14</code> to <code>30</code>. Save, refresh. 👀 you zoom.'),
 ('2. Paint the bullets', 'Pulse Cannon <code>color: 0x38bdf8</code> → <code>0xff00ff</code>. 👀 pink shots.'),
 ('3. Load the starter mod', 'Add the script line from M2. 👀 a pink cube floats in front of you.'),
 ('4. Your first wrap', 'In your mod, add <code>addKillFeed(\'HELLO FROM MY MOD\')</code> inside the finishBotKill wrapper. 👀 your words in the kill feed on every kill.'),
 ('5. Read and tweak a function', 'Read partyCode(), change <code>i < 5</code> to <code>i < 3</code>. Host a game. 👀 a 3-letter code.')]
QUICK = ['Walk speed', 'Pulse Cannon fire rate', 'Fog thickness', 'Debris chunk size', 'Bullet color']
CATS = list(dict.fromkeys(t[0] for t in T))
rows = []
for c, title, f, s, cur, rng, eff, tag in T:
    ln, n = find(f, s); rows.append(dict(c=c, t=title, f=f, s=s, ln=ln, cur=cur, rng=rng, eff=eff, tag=tag))
byt = {r['t']: r for r in rows}
NEWQ = ['Main sun light casts shadow', 'Player lantern (around you)', 'Health pickup amount']
assert all(q in byt for q in QUICK + NEWQ)
# flow chart nodes (label, func or snippet, file)
FLOW = [('Page loads', 'index.html loads style.css + game.js', None),
 ('Load 3D models', 'function autoLoadMeshyAssets', 'const jobs = ['),
 ('Trailer, then menu', 'function playTrailer(manual)', None),
 ('Build level + floor', 'function startFloor(lvl, floor)', None),
 ('Main loop, every frame', 'function gameLoop(now)', None)]
LOOP = [('Input (keys, joystick)', "window.addEventListener('keydown', e => {", 'game.js'),
 ('Move player', 'const spd = STATE.walkSpeed * sprint;', 'game.js'),
 ('Shoot weapon', 'function firePlayerWeapon', 'game.js'),
 ('Bullets fly / hit', "if (p.fromPlayer && !p.emp && weakPointHit(", 'game.js'),
 ('Enemy AI shoots', 'b.fireCooldown = b.isBoss ? 0.95', 'game.js'),
 ('Particles', 'function fxUpdate(dt)', 'game.js'),
 ('HUD', 'function updateHUD()', 'game.js'),
 ('Draw picture', 'function renderFrame()', 'game.js')]
BR = [('You die → K.I.A.', 'function damagePlayer(dmg, src)'), ('Floor cleared → next floor', 'function advanceFloor()'), ('Multiplayer host', 'function dmHost(code, onReady)'), ('Multiplayer join', 'function dmJoin(code)')]
def L(s, f='game.js'): return find(f, s)[0]
fl = [(a, b, L(b) if 'function' in b else None) for a, b, _ in FLOW]
lp = [(a, s, L(s)) for a, s, _ in LOOP]
br = [(a, s, L(s)) for a, s in BR]
jobs_ln = L('const jobs = [')
# ---------- file sizes ----------
sizes = []
for d in ['models', 'media', 'music', 'audio', 'images/tex', 'fonts']:
    p = os.path.join(R, d)
    for fn in sorted(os.listdir(p)):
        fp = os.path.join(p, fn)
        if os.path.isfile(fp): sizes.append((f'{d}/{fn}', os.path.getsize(fp)))
sizes.sort(key=lambda x: -x[1])
for f in FILES: sizes.append((f, os.path.getsize(os.path.join(R, f))))
mb = lambda b: f'{b/1048576:.2f}'
e = html.escape
TAGC = {E: '#3c6', M: '#fc3', X: '#f55'}
# ---------- HTML ----------
H = []
H.append('''<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DYSTOPIA: what you can change, and where</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#111;color:#eee;max-width:900px;margin:auto;padding:14px}pre{background:#000;color:#9f9;padding:10px;overflow:auto;font-size:13px;border-radius:6px;white-space:pre-wrap;word-break:break-all;margin:4px 0}a{color:#7cf}.step{border-left:4px solid #f60;padding-left:12px;margin:22px 0}.s0{border-left-color:#6c6}.see{color:#fc6}code{background:#222;padding:1px 4px}.lib{background:#1b2333;border-radius:6px;padding:6px 12px;font-size:14px}kbd{background:#333;border:1px solid #555;border-radius:4px;padding:0 5px;font-size:13px}details{background:#181818;border:1px solid #333;border-radius:8px;margin:10px 0;padding:6px 10px}summary{cursor:pointer;font-weight:700;font-size:18px;padding:4px 0}.tw{border-top:1px solid #333;padding:8px 0}.tw h3{margin:2px 0;font-size:16px}.tag{font-size:12px;padding:1px 7px;border-radius:10px;color:#000;font-weight:700}.meta{font-size:14px;color:#ccc}.cp{float:right;background:#333;color:#fff;border:1px solid #666;border-radius:4px;font-size:12px;padding:2px 8px}table.sz{border-collapse:collapse;font-size:13px;width:100%}table.sz td{border-bottom:1px solid #333;padding:2px 6px}.fc{display:flex;flex-direction:column;align-items:center;gap:4px}.bx{background:#1b2333;border:2px solid #7cf;border-radius:8px;padding:6px 10px;text-align:center;min-width:220px;font-size:14px}.bx small{color:#fc6;display:block}.ar{color:#7cf;font-size:20px;line-height:1}.loop{border:2px dashed #f60;border-radius:10px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:640px}.loop .bx{min-width:130px;border-color:#f60}.brs{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.brs .bx{border-color:#c6f;min-width:150px}</style></head><body>
<h1>DYSTOPIA: what you can change, and where</h1>
<p>Every knob in the game, with the file, the line, and the exact text to find. Tags: <span class="tag" style="background:#3c6">easy</span> just a number · <span class="tag" style="background:#fc3">medium</span> read the note first · <span class="tag" style="background:#f55">risky</span> ask Grok Bot.</p>
<p>Back to <a href="android.html">the Android tutorial</a>. Line numbers match the game as of the commit that made this page. They drift a little once you add lines, so <b>always search with <kbd>Ctrl</kbd>+<kbd>F</kbd></b> using the green text.</p>
''')
toc = ['<a href="#flow">Flow chart</a>', '<a href="#quick">Try these 5 first</a>', '<a href="#newq">New quick wins</a>', '<a href="#assets">Adding assets</a>', '<a href="#mods">Your own files & scripts</a>', '<a href="#tour">Project tour</a>', '<a href="#learn">Learning path</a>', '<a href="#test">Test</a>', '<a href="#undo">Undo</a>', '<a href="#rules">Rules</a>'] + [f'<a href="#c{i}">{e(c)}</a>' for i, c in enumerate(CATS)] + ['<a href="#sizes">File sizes</a>']
H.append('<p class="lib"><b>Contents:</b> ' + ' · '.join(toc) + '</p>')
# flow
H.append('<div class="step s0" id="flow"><h2>🗺️ How the game runs (flow chart)</h2><p>Read top to bottom. Each box shows the real function name and line in <code>game.js</code>. Press <kbd>Ctrl</kbd>+<kbd>F</kbd> and type the name to jump there.</p><div class="fc">')
for i, (a, b, ln) in enumerate(fl):
    sub = e(b.replace('function ', '')) + (f' · line {ln}' if ln else '')
    if a == 'Load 3D models': sub += f'<br>list: const jobs = [ · line {jobs_ln}'
    H.append(f'<div class="bx"><b>{e(a)}</b><small>{sub}</small></div><div class="ar">▼</div>')
H.pop(); H.append('<div class="ar">▼ repeats ~60 times a second ↻</div><div class="loop">')
H.append(' '.join(f'<div class="bx"><b>{i+1}. {e(a)}</b><small>{e(s.replace("function ","")[:38])} · line {ln}</small></div>' for i, (a, s, ln) in enumerate(lp)))
H.append('</div><div class="ar">▼ sometimes branches to…</div><div class="brs">')
H.append(' '.join(f'<div class="bx"><b>{e(a)}</b><small>{e(s.replace("function ",""))} · line {ln}</small></div>' for a, s, ln in br))
H.append('</div></div><p class="see">👀 Win: you know which part of the file to look in.</p></div>')
def card(r):
    return (f'<div class="tw"><h3>{e(r["t"])} <span class="tag" style="background:{TAGC[r["tag"]]}">{r["tag"]}</span></h3>'
      f'<div class="meta">📄 <b>{r["f"]}</b> · line <b>{r["ln"]}</b> · now: <b>{e(r["cur"])}</b> · safe: <b>{e(r["rng"])}</b></div>'
      f'<button class="cp">copy</button><pre>{e(r["s"])}</pre><div>{e(r["eff"])}</div></div>')
H.append('<div class="step" id="quick"><h2>⚡ Try these 5 first</h2><p>One number each. Change it, save, refresh, see the difference right away.</p>')
for q in QUICK: H.append(card(byt[q]))
H.append('</div>')
H.append('''<div class="step" id="test"><h2>🧪 How to test a change</h2><ol><li>Open the file, press <kbd>Ctrl</kbd>+<kbd>F</kbd>, paste the green text.</li><li>Change <b>only the number</b>.</li><li><kbd>Ctrl</kbd>+<kbd>S</kbd> to save.</li><li>Spck: tap ▶ preview (or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>). Already open? Pull down to refresh, or close and reopen preview.</li><li>Skip the trailer, start, look for the change.</li></ol><p>Black screen or stuck loading? You broke a comma or bracket. Undo (below) and try again.</p><p class="see">👀 Win: you see your change in the game.</p></div>
<div class="step" id="undo"><h2>↩️ How to undo</h2><ul><li><b>Right away:</b> <kbd>Ctrl</kbd>+<kbd>Z</kbd> until it's back, then save.</li><li><b>Write the old value down</b> (or put it in a comment: <code>walkSpeed: 20, // was 14</code>... careful, only after the comma).</li><li><b>Keep a copy:</b> long-press <code>game.js</code> → Duplicate before big edits.</li><li><b>Reset a file to GitHub's version:</b> Spck Git menu → Changes → tap the file → <b>Discard/Revert</b>. That is the same as <code>git restore game.js</code>.</li><li>Already pushed something bad? Ask Grok Bot to roll it back.</li></ul></div>
<div class="step" id="rules"><h2>⚠️ Rules so nothing breaks</h2><ul><li>Change <b>numbers, colours and text in quotes</b>. Don't rename functions or names before a <code>:</code>.</li><li>Keep every <code>,</code> <code>;</code> <code>{ }</code> <code>[ ]</code> <code>( )</code> and quote mark.</li><li>Colours in game.js look like <code>0xff4400</code>. In style.css they look like <code>#ff4400</code>.</li><li>Text with an apostrophe inside <code>'...'</code> needs <code>\\'</code>.</li><li><code>IS_COARSE ? A : B</code> means "phone/tablet uses A, PC uses B". Your Fold uses the first number.</li><li>One change at a time. Test. Then the next one.</li></ul></div>''')
H.append('<div class="step" id="newq"><h2>⚡ New quick wins</h2>')
for q in NEWQ: H.append(card(byt[q]))
H.append('</div><details id="assets"><summary>📦 Adding assets, step by step</summary>')
for h, txt, refs in GUIDE:
    H.append(f'<div class="tw"><h3>{e(h)}</h3><div>{txt}</div>' + ''.join(f'<div class="meta">📄 <b>{f}</b> · line <b>{find(f, sn)[0]}</b></div><button class="cp">copy</button><pre>{e(sn)}</pre>' for f, sn in refs) + '</div>')
H.append('</details>')
def gl(h, txt, refs): return f'<div class="tw"><h3>{e(h)}</h3><div>{txt}</div>' + ''.join(f'<div class="meta">📄 <b>{f}</b> · line <b>{find(f, sn)[0]}</b></div><button class="cp">copy</button><pre>{e(sn)}</pre>' for f, sn in refs) + '</div>'
H.append('<details id="mods"><summary>🧩 Add your own files & scripts</summary>' + ''.join(gl(*m) for m in MODS) + '</details>')
SEC = [(n, find('game.js', sn)[0]) for n, sn in SECTIONS]; NL = len(FILES['game.js'])
SECR = [(n, a, (SEC[i+1][1]-1 if i+1 < len(SEC) else NL)) for i, (n, a) in enumerate(SEC)]
assert all(a <= b for _, a, b in SECR), SECR
H.append('<details id="tour"><summary>🗺️ Project tour / code map</summary><h3>Every file and folder</h3><table class="sz">' + ''.join(f'<tr><td><code>{e(a)}</code></td><td>{b}</td></tr>' for a, b in TOUR_FILES) + '</table><p class="lib">tools/ scripts need a computer with Node (or Python) and a headless Chrome. They do not run in Spck. Just ask Grok Bot to run them.</p><h3>game.js in reading order</h3><table class="sz">' + ''.join(f'<tr><td>{a}–{b}</td><td>{e(n)}</td></tr>' for n, a, b in SECR) + '</table><p>Jump there in Acode with <kbd>Ctrl</kbd>+<kbd>G</kbd>, or search the function name in Spck.</p><h3>Good functions to read first</h3>' + ''.join(f'<div class="tw"><b>{e(n)}</b> · line {find("game.js", sn)[0]}<div>{e(w)}</div></div>' for n, sn, w in READ_FIRST) + '</details>')
H.append('<div class="step" id="learn"><h2>🎓 Learning path: 5 tiny exercises</h2><ol>' + ''.join(f'<li><b>{e(a)}</b>: {b}</li>' for a, b in LEARN) + '</ol></div>')
for i, c in enumerate(CATS):
    rs = [r for r in rows if r['c'] == c]
    H.append(f'<details id="c{i}"{" open" if i==0 else ""}><summary>{e(c)} ({len(rs)})</summary>' + ''.join(card(r) for r in rs) + '</details>')
H.append('<details id="sizes"><summary>📦 File sizes on disk</summary><p>Phone budget: keep a single model under ~1.5 MB and the whole game under ~60 MB. The trailer and music stream, so they only cost loading time.</p><table class="sz"><tr><td><b>File</b></td><td><b>MB</b></td></tr>' + ''.join(f'<tr><td>{e(n)}</td><td>{mb(b)}</td></tr>' for n, b in sizes) + '</table></details>')
H.append('''<script>document.querySelectorAll('.cp').forEach(b=>b.onclick=()=>{const t=b.nextElementSibling.textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>{b.textContent='copied ✓';setTimeout(()=>b.textContent='copy',1200)}).catch(()=>{const r=document.createRange();r.selectNodeContents(b.nextElementSibling);const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='selected, Ctrl+C';});});
if(location.hash){const d=document.querySelector(location.hash);if(d&&d.tagName==='DETAILS')d.open=true;}document.querySelectorAll('a[href^="#c"],a[href="#sizes"]').forEach(a=>a.addEventListener('click',()=>{const d=document.querySelector(a.getAttribute('href'));if(d)d.open=true;}));</script></body></html>''')
open(os.path.join(R, 'learn-3d-112248cf/tweaks.html'), 'w', encoding='utf-8').write('\n'.join(H))
# ---------- Markdown ----------
md = ['# DYSTOPIA: what you can change, and where', '', 'Search with Ctrl+F using the `snippet`. Tags: easy / medium / risky.', '', '## Flow chart', '', '```mermaid', 'flowchart TD']
ids = []
for i, (a, b, ln) in enumerate(fl):
    sub = b.replace('function ', '').replace('"', "'") + (f' · L{ln}' if ln else '')
    md.append(f'  F{i}["{a}<br/>{sub}"]'); ids.append(f'F{i}')
md.append('  ' + ' --> '.join(ids))
md.append('  subgraph LOOP["every frame"]')
for i, (a, s, ln) in enumerate(lp): md.append(f'    P{i}["{i+1}. {a}<br/>L{ln}"]')
md.append('    ' + ' --> '.join(f'P{i}' for i in range(len(lp)))); md.append('  end'); md.append(f'  {ids[-1]} --> P0'); md.append(f'  P{len(lp)-1} -->|repeat| P0')
for i, (a, s, ln) in enumerate(br): md.append(f'  P{len(lp)-1} -.-> B{i}["{a}<br/>{s.replace("function ","")} · L{ln}"]')
md += ['```', '', '## Try these 5 first', '']
for q in QUICK: r = byt[q]; md.append(f'- **{q}**: `{r["f"]}` line {r["ln"]}, now {r["cur"]}, safe {r["rng"]}. Find: `{r["s"]}`')
md += ['', '## New quick wins', ''] + [f'- **{q}**: `{byt[q]["f"]}` line {byt[q]["ln"]}. Find: `{byt[q]["s"]}`' for q in NEWQ]
md += ['', '## Adding assets, step by step', '']
import re
for h, txt, refs in GUIDE:
    md += [f'### {h}', re.sub(r'<[^>]+>', '', txt).replace('&lt;','<'), ''] + [f'- `{f}` line {find(f, sn)[0]}: `{sn}`' for f, sn in refs] + ['']
md += ['## Add your own files & scripts', '']
for h, txt, refs in MODS: md += [f'### {h}', re.sub(r'<[^>]+>', '', txt).replace('&lt;','<').replace('&gt;','>'), ''] + [f'- `{f}` line {find(f, sn)[0]}: `{sn}`' for f, sn in refs] + ['']
md += ['## Project tour', '', '| File | What |', '|---|---|'] + [f'| `{a}` | {re.sub(r"<[^>]+>", "", b)} |' for a, b in TOUR_FILES]
md += ['', '### game.js sections', '', '| Lines | Section |', '|---|---|'] + [f'| {a}–{b} | {n} |' for n, a, b in SECR]
md += ['', '### Read these first', ''] + [f'- **{n}** (line {find("game.js", sn)[0]}): {w}' for n, sn, w in READ_FIRST]
md += ['', '## Learning path', ''] + [f'{i+1}. **{a[3:]}**: {re.sub(r"<[^>]+>", "", b)}' for i, (a, b) in enumerate(LEARN)]
md += ['', '## Test', 'Edit one number → Ctrl+S → Spck ▶ preview (refresh) → look.', '', '## Undo', 'Ctrl+Z; keep a duplicate of the file; Spck Git → Changes → Discard (= `git restore game.js`).', '', '## Rules', "Change numbers, colours, quoted text only. Keep commas and brackets. Don't rename functions. `IS_COARSE ? phone : PC`.", '']
for c in CATS:
    md += [f'## {c}', '', '| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |', '|---|---|---|---|---|---|---|']
    for r in rows:
        if r['c'] == c: md.append(f'| {r["t"]} | {r["f"]}:{r["ln"]} | `{r["s"].replace("|", "\\|")}` | {r["cur"]} | {r["rng"]} | {r["eff"]} | {r["tag"]} |')
    md.append('')
md += ['## File sizes', '', '| File | MB |', '|---|---|'] + [f'| {n} | {mb(b)} |' for n, b in sizes]
open(os.path.join(R, 'learn-3d-112248cf/TWEAKS.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
print(f'OK {len(rows)} tweakables, all snippets verified')
for r in rows:
    if find(r['f'], r['s'])[1] > 1: print('  note: multiple matches (first used):', r['t'])
