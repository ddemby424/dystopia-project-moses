#!/usr/bin/env python3
"""Builds learn-3d-112248cf/tweaks.html + TWEAKS.md. Every snippet must appear exactly once-first in its file; line numbers are computed and verified."""
import os, html, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = {f: open(os.path.join(R, f), encoding='utf-8').read().split('\n') for f in ['game.js', 'style.css', 'index.html']}
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
]
QUICK = ['Walk speed', 'Pulse Cannon fire rate', 'Fog thickness', 'Debris chunk size', 'Bullet color']
CATS = list(dict.fromkeys(t[0] for t in T))
rows = []
for c, title, f, s, cur, rng, eff, tag in T:
    ln, n = find(f, s); rows.append(dict(c=c, t=title, f=f, s=s, ln=ln, cur=cur, rng=rng, eff=eff, tag=tag))
byt = {r['t']: r for r in rows}
assert all(q in byt for q in QUICK)
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
toc = ['<a href="#flow">Flow chart</a>', '<a href="#quick">Try these 5 first</a>', '<a href="#test">Test</a>', '<a href="#undo">Undo</a>', '<a href="#rules">Rules</a>'] + [f'<a href="#c{i}">{e(c)}</a>' for i, c in enumerate(CATS)] + ['<a href="#sizes">File sizes</a>']
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
