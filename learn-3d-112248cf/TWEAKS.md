# DYSTOPIA: what you can change, and where

Search with Ctrl+F using the `snippet`. Tags: easy / medium / risky.

## Flow chart

```mermaid
flowchart TD
  F0["Page loads<br/>index.html loads style.css + game.js"]
  F1["Load 3D models<br/>autoLoadMeshyAssets · L2116"]
  F2["Trailer, then menu<br/>playTrailer(manual) · L6210"]
  F3["Build level + floor<br/>startFloor(lvl, floor) · L1719"]
  F4["Main loop, every frame<br/>gameLoop(now) · L4448"]
  F0 --> F1 --> F2 --> F3 --> F4
  subgraph LOOP["every frame"]
    P0["1. Input (keys, joystick)<br/>L2661"]
    P1["2. Move player<br/>L4498"]
    P2["3. Shoot weapon<br/>L3441"]
    P3["4. Bullets fly / hit<br/>L4609"]
    P4["5. Enemy AI shoots<br/>L4738"]
    P5["6. Particles<br/>L3582"]
    P6["7. HUD<br/>L4419"]
    P7["8. Draw picture<br/>L271"]
    P0 --> P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7
  end
  F4 --> P0
  P7 -->|repeat| P0
  P7 -.-> B0["You die → K.I.A.<br/>damagePlayer(dmg, src) · L4251"]
  P7 -.-> B1["Floor cleared → next floor<br/>advanceFloor() · L1825"]
  P7 -.-> B2["Multiplayer host<br/>dmHost(code, onReady) · L6053"]
  P7 -.-> B3["Multiplayer join<br/>dmJoin(code) · L6066"]
```

## Try these 5 first

- **Walk speed**: `game.js` line 85, now 14, safe 8 – 22. Find: `walkSpeed: 14`
- **Pulse Cannon fire rate**: `game.js` line 89, now 0.13 s between shots, safe 0.05 – 0.4. Find: `fireRate: 0.13, spread: 0.008`
- **Fog thickness**: `game.js` line 251, now 0.0075, safe 0 – 0.03. Find: `scene.fog = new THREE.FogExp2(0x07090d, 0.0075)`
- **Debris chunk size**: `game.js` line 3571, now 0.06 – 0.22, safe 0.02 – 0.3. Find: `const sz = (0.06 + Math.random() * 0.16)`
- **Bullet color**: `game.js` line 90, now 0xffaa00 (orange), safe any 0xRRGGBB. Find: `color: 0xffaa00, speed: 88`

## Test
Edit one number → Ctrl+S → Spck ▶ preview (refresh) → look.

## Undo
Ctrl+Z; keep a duplicate of the file; Spck Git → Changes → Discard (= `git restore game.js`).

## Rules
Change numbers, colours, quoted text only. Keep commas and brackets. Don't rename functions. `IS_COARSE ? phone : PC`.

## Player

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Walk speed | game.js:85 | `walkSpeed: 14` | 14 | 8 – 22 | Bigger = you run faster. Over 22 you slide through doorways too fast to aim. | easy |
| Jump height | game.js:85 | `jumpVel: 8.5` | 8.5 | 6 – 13 | Bigger = higher jumps. Over 13 you can hop onto catwalks. | easy |
| Gravity | game.js:85 | `gravity: 22` | 22 | 12 – 30 | Smaller = floaty moon jumps. Also changes rocket and grenade arcs. | medium |
| Sprint multiplier | game.js:4497 | `? 1.45 : 1.0;` | 1.45 | 1.2 – 2.0 | How much faster Shift (or full joystick push) makes you. | easy |
| Starting health | game.js:87 | `health: 100, maxHealth: 100, armor: 50` | 100 HP / 50 armor | HP 50 – 300, armor 0 – 100 | More health = harder to die. Change both health and maxHealth to the same number. | easy |
| Look sensitivity (default) | game.js:84 | `sens: 1.25` | 1.25 | 0.5 – 2.5 | How fast the camera turns. The in-game slider overrides it after you move it. | easy |
| Aim assist (default) | game.js:84 | `aimAssist: 0.80` | 0.80 | 0 – 1 | 0 = no help, 1 = strong magnet to targets near the crosshair. | easy |
| Field of view (FOV) | game.js:255 | `new THREE.PerspectiveCamera(75, window.innerWidth` | 75 | 60 – 100 | Bigger = wider view (fish-eye). Smaller = zoomed in. | easy |

## Weapons

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Pulse Cannon damage | game.js:89 | `name: 'Pulse Cannon', ammo: Infinity, maxAmmo: Infinity, damage: 28` | 28 | 10 – 80 | Damage per shot of the starting gun. | easy |
| Pulse Cannon fire rate | game.js:89 | `fireRate: 0.13, spread: 0.008` | 0.13 s between shots | 0.05 – 0.4 | SMALLER = faster shooting. 0.05 is a laser hose. | easy |
| Shotgun pellets & spread | game.js:90 | `damage: 18, pellets: 8, fireRate: 0.56, spread: 0.062` | 8 pellets, spread 0.062 | pellets 4 – 16, spread 0.02 – 0.15 | More pellets = more hits per shot. Bigger spread = wider cone. | easy |
| Shotgun ammo | game.js:90 | `name: 'Combat Shotgun', ammo: 24, maxAmmo: 32` | 24 / 32 max | 0 – 200 | Shells at start and the most you can carry. | easy |
| Rocket damage & blast size | game.js:91 | `damage: 155, pellets: 1, fireRate: 0.80, spread: 0.002, color: 0xff4400, speed: 46, splash: 14.0` | 155 dmg, 14 splash | dmg 60 – 400, splash 4 – 25 | splash is the blast radius. Huge splash can hurt YOU too. | easy |
| Rocket ammo | game.js:91 | `name: 'Rocket Launcher', ammo: 12, maxAmmo: 15` | 12 / 15 | 0 – 99 | Rockets at start / max. | easy |
| Ion EMP ammo | game.js:92 | `name: 'Ion EMP', ammo: 6, maxAmmo: 10` | 6 / 10 | 1 – 30 | EMP is the only thing that breaks the Colossus shield. More = easier boss. | easy |
| Bullet speed | game.js:89 | `color: 0x38bdf8, speed: 92` | 92 | 40 – 200 | How fast Pulse shots fly. Each weapon has its own speed: value. | easy |
| Bullet color | game.js:90 | `color: 0xffaa00, speed: 88` | 0xffaa00 (orange) | any 0xRRGGBB | Colour of shotgun tracers. Try 0x00ff00 for green. | easy |
| Recoil strength | game.js:89 | `splash: 0, recoil: 0.14` | 0.14 | 0 – 0.5 | How much the gun kicks and the screen shakes. 0 = none. | easy |
| Recoil max clamp | game.js:3453 | `VM.recoilZ = Math.min(0.045` | 0.045 | 0.02 – 0.08 | Upper limit on how far the gun slides back. Too big = gun leaves your hands. | medium |
| Grenades at start | game.js:86 | `grenades: 3` | 3 | 0 – 20 | Number of grenades you start with. | easy |

## Enemies

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Enemies per floor | game.js:1738 | `const count = Math.min(IS_COARSE ? 11 : 14, 4 + floor * 2` | phones max 11, PC max 14; 4 + 2 per floor | max 4 – 20 | Change 11/14 for the cap, the 4 for the base number. More = slower on phones. | medium |
| Heavy unit share | game.js:1739 | `const heavyFrac = Math.min(0.75, 0.15` | start 15%, max 75% | 0 – 1 | Fraction of enemies that are big Heavy Sentinels. | medium |
| Enemy health growth | game.js:1740 | `const hpMult = (1 + 0.12 * (lvl - 1) + 0.12 * floor)` | +12% per level and per floor | 0 – 0.3 | How much tougher enemies get as you go deeper. | medium |
| Enemy damage growth | game.js:1741 | `STATE.diff = { dmg: 1 + 0.08 * (lvl - 1) + 0.06 * floor` | +8%/level, +6%/floor | 0 – 0.2 | How much harder enemies hit deeper down. | medium |
| Bot skill (all enemies) | game.js:84 | `botSkill: 1.0` | 1.0 | 0.5 – 2 | One knob for enemy health and fire speed. 0.5 = easy mode. | easy |
| Roster health | game.js:31 | `x: -32, y: 0, z: 38, maxHealth: 110` | 110 – 155 per unit | 50 – 400 | Each BOT_ROSTER line has its own maxHealth. | easy |
| Enemy names | game.js:31 | `name: 'Unit Vance [Doom Sentinel]'` | 'Unit Vance [Doom Sentinel]' | any text in quotes | Rename enemies shown on the kill feed. | easy |
| Warden (human) health | game.js:1751 | `x, y: 0, z, maxHealth: 70, patrolType: 'ground'` | 70 | 30 – 200 | Health of the human guards on each floor. | easy |
| Enemy fire delay | game.js:4738 | `b.fireCooldown = b.isBoss ? 0.95 : (1.15` | boss 0.95 s, others 1.15 s | 0.4 – 3 | SMALLER = enemies shoot more often (more aggressive). | medium |
| Enemy bullet damage | game.js:4745 | `damage: Math.round((b.isBoss ? 22 : 11)` | boss 22, others 11 | 3 – 40 | Damage each enemy orb does to you. | easy |
| Mender health | game.js:3244 | `const maxHp = Math.round(320 * hpMult)` | 320 | 100 – 800 | Health of the tread repair robots. | easy |
| Mender speed | game.js:3246 | `repathT: 0, path: null, pathI: 0, speed: 2.5` | 2.5 | 1 – 6 | How fast Menders roll to the wreck. | easy |
| Boss (Minotaur) health per level | game.js:26 | `bossHp: 420 + 160 * i` | 420 + 160 per level | base 200 – 1500 | Boss health on each level. | easy |
| Drone crash damage | game.js:4163 | `damagePlayer(Math.round(20 * (STATE.diff?.dmg \|\| 1))); scene.remove(g); DRONES.splice` | 20 | 5 – 50 | Damage when a kamikaze drone hits you. | easy |
| Wreck / Mender timing | game.js:3652 | `const WRECK_CFG = { burn:` | burn 18/28 s, repair 24/18 s | keep the 2 numbers per item | How long a fallen Colossus burns and how long Menders take to rebuild it. | medium |

## Colossus

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Colossus health | game.js:1437 | `C.maxHp = C.hp = isMini ? Math.round(240 + 50 * L + 30 * F) : Math.round(450 + 100 * L)` | mini 240+, big 450 + 100/level | base 150 – 1500 | More = longer boss fight. | easy |
| Colossus height (size) | game.js:1095 | `const g = buildColossus(o.h \|\| 24` | 24 m | 14 – 34 | Size of the giant. Bigger may poke through ceilings. | medium |
| Weak points list | game.js:3643 | `{ key: 'core', label: 'POWER CORE'` | core mult 4, hp 0.22, r 0.07 | mult 1 – 8, r 0.03 – 0.12 | mult = damage multiplier, r = orb size (fraction of height), hp = share of boss HP. Edit label to rename. | medium |
| Colossus voice lines | game.js:1134 | `t: 'YOU ARE SAFE. YOU ARE LOVED. RETURN TO YOUR POD.'` | subtitle text | any text | Changes the subtitle. The spoken mp3 stays the same. | easy |
| Colossus eye light | game.js:1434 | `C.eye = new RTLight(0xff3300` | red 0xff3300 | any 0xRRGGBB | Glow colour of its eye. | easy |
| Colossus walk animation speed | game.js:1420 | `a.timeScale = isMini ? 0.14 : 0.08` | 0.14 / 0.08 | 0.04 – 0.3 | How fast the legs animate. | easy |

## Particles

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Particle pool size | game.js:3529 | `const N = IS_COARSE ? 90 : 240` | phone 90, PC 240 | phone 40 – 200, PC 100 – 600 | Max fire/smoke/spark sprites alive at once. Bigger = denser explosions, slower phones. | medium |
| Debris pool size | game.js:3533 | `for (let i = 0; i < (IS_COARSE ? 18 : 48); i++) { const m = new THREE.Mesh(FX.debrisGeo` | phone 18, PC 48 | 0 – 120 | Max flying chunks at once. 0 = no debris. | medium |
| Fireball count per explosion | game.js:3561 | `const nf = Math.round((lite ? 6 : 12)` | phone 6, PC 12 | 2 – 30 | Fire puffs per blast. | easy |
| Smoke count per explosion | game.js:3564 | `const ns = Math.round((lite ? 4 : 9)` | phone 4, PC 9 | 0 – 25 | Smoke clouds per blast. | easy |
| Sparks/embers per explosion | game.js:3567 | `const ne = Math.round((lite ? 10 : 26)` | phone 10, PC 26 | 0 – 60 | Glowing sparks per blast. | easy |
| Debris chunks per explosion | game.js:3570 | `let nd = Math.round((lite ? 4 : 9)` | phone 4, PC 9 | 0 – 20 | Chunks thrown per blast. | easy |
| Debris chunk size | game.js:3571 | `const sz = (0.06 + Math.random() * 0.16)` | 0.06 – 0.22 | 0.02 – 0.3 | Size of flying debris. Smaller fixes the "big flat triangles" look. | easy |
| Scorch mark size & lifetime | game.js:3575 | `d.m.scale.setScalar(3.2 * S); d.m.rotation.z = Math.random() * 6.28; d.m.visible = true; d.life = d.max = 25` | size 3.2, 25 s | size 1 – 6, life 5 – 60 | Black burn mark left on the floor. | easy |
| Muzzle flash size | game.js:2041 | `fxEmit('fire', x, y, z, { life: 0.08, s0: fromPlayer ? 0.75 : 0.5` | you 0.75, enemies 0.5 | 0.3 – 1.5 | Size of the flash at the gun tip. | easy |
| Muzzle sparks | game.js:2042 | `for (let i = 0; i < (IS_COARSE ? 2 : 5); i++) fxEmit('dot', x, y, z` | phone 2, PC 5 | 0 – 12 | Little sparks per shot. | easy |
| Bullet impact sparks | game.js:2050 | `for (let i = 0; i < (IS_COARSE ? 4 : 10); i++) {` | phone 4, PC 10 | 0 – 25 | Sparks when a bullet hits a wall. | easy |
| Flame burst size | game.js:3390 | `function spawnVolumetricFlameBurst(x, y, z, count = 18, spread = 2.2)` | 18 flames, spread 2.2 | count 5 – 40 | Default napalm/fire burst. | medium |
| Explosive barrels per floor | game.js:1735 | `spawnExplosiveBarrels(IS_COARSE ? 3 : 5)` | phone 3, PC 5 | 0 – 12 | Red barrels you can shoot. | easy |

## Models & scale

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Model load list | game.js:2123 | `const jobs = [` | ~45 files | one line each | Each line: file, role, height (metres). Change height: to resize a model. Add a line to load a new one. | medium |
| Sentinel guard height | game.js:2124 | `{ file: 'models/sentinel_guard.glb', role: 'guard', height: 2.15 }` | 2.15 m | 1.6 – 3.2 | Size of standard Sentinels. | easy |
| Heavy Sentinel height | game.js:2125 | `{ file: 'models/sentinel_heavy.glb', role: 'bot', height: 2.55 }` | 2.55 m | 2 – 3.5 | Size of Heavy Sentinels. Hit box does not grow with it. | medium |
| Pulse Cannon viewmodel size | game.js:2132 | `{ file: 'models/pulse_cannon.glb', role: 'viewmodel', height: 0.55 }` | 0.55 | 0.35 – 0.8 | How big your gun looks on screen. | easy |
| Shotgun viewmodel size | game.js:2128 | `{ file: 'models/player_shotgun_scifi.glb', role: 'vm:shotgun', height: 0.3` | 0.3 | 0.2 – 0.5 | Size of the shotgun in your hands. | easy |
| Drone model size | game.js:2150 | `{ file: 'models/bot_drone.glb', role: 'prop:bot_drone', height: 0.9 }` | 0.9 m | 0.5 – 1.8 | Size of flying drones. | easy |
| Extinguisher size | game.js:2146 | `{ file: 'models/ph_extinguisher.glb', role: 'prop:ph_extinguisher', height: 0.62 }` | 0.62 m | 0.4 – 1 | A safe one to practise resizing. | easy |
| Prop placement (example) | game.js:1535 | `add('extinguisher', -3.9, 69, { rot: Math.PI / 2 })` | x -3.9, z 69, turned 90° | move x/z by ±5 | add('type', x, z, {rot}) places props. rot is in radians: Math.PI = 180°. | medium |
| Boss scale | game.js:85 | `bossScale: 1.75` | 1.75 | 1 – 3 | Size multiplier of the Minotaur boss. | easy |

## Levels

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Level names | game.js:22 | `const names = ['THE SPINE · INTAKE & DETENTION'` | 9 names | any text | Titles shown when a level starts. | easy |
| Floor names | game.js:888 | `const FLOOR_NAMES = ['G', 'B1', 'B2', 'B3'];` | 'G','B1','B2','B3' | text only, keep 4 | Labels for floors. | easy |
| Number of levels | game.js:84 | `maxLevels: 9` | 9 | 1 – 9 | Fewer = shorter campaign. Above 9 there are no configs. | medium |
| Level speed-up | game.js:26 | `speedMult: 1 + 0.06 * (i - 1)` | +6% per level | 0 – 0.15 | How much faster enemies move each level. | medium |
| Lore notes text | game.js:2519 | `const LORE_MEMOS = [` | memo text | any text, keep quotes | The notes you read. Use \' for an apostrophe. | medium |

## Lighting & fog

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Fog thickness | game.js:251 | `scene.fog = new THREE.FogExp2(0x07090d, 0.0075)` | 0.0075 | 0 – 0.03 | Bigger = thicker haze. 0 = crystal clear. | easy |
| Per-level fog colours | game.js:23 | `const fogs = [0x050911` | 9 colours | any 0xRRGGBB | Background/fog tint per level. | easy |
| Per-level sky light colour | game.js:24 | `const hemis = [0xddeeff` | 9 colours | any 0xRRGGBB | Main ambient light tint per level. | easy |
| Default brightness | game.js:238 | `if (!isFinite(BRIGHTNESS)) BRIGHTNESS = 1.0;` | 1.0 | 0.6 – 3 | Only used until the player moves the brightness slider. | easy |

## Graphics & speed

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Pixel ratio (sharpness) | game.js:225 | `renderer.setPixelRatio(Math.min(window.devicePixelRatio \|\| 1, IS_COARSE ? 1.1 : 2))` | phone 1.1, PC 2 | phone 0.7 – 2 | Lower = blurrier but much faster on phones. | easy |
| Shadow sharpness | game.js:233 | `const SHADOW_RES = IS_COARSE ? 1024 : 2048` | phone 1024, PC 2048 | 512, 1024, 2048, 4096 | Use powers of 2 only. Lower = faster. | medium |
| Draw distance | game.js:255 | `window.innerWidth / window.innerHeight, 0.1, 320)` | 320 m | 100 – 600 | Things farther than this are not drawn. | medium |

## Audio

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Default music volume | game.js:6137 | `localStorage.getItem('dys_music_vol') ?? '0.55'` | 0.55 | 0 – 1 | Starting music volume (slider overrides it). | easy |
| Music tracks | game.js:6124 | `const MUSIC_TRACKS = {` | Kevin MacLeod files | files in music/ | Swap file names to change songs. Credit any new music (CC BY). | medium |
| Guard callout volume | game.js:2291 | `c.volume = Math.max(0.15, Math.min(1, 1 - d / 70))` | fades over 70 m | 20 – 150 | Bigger = you hear guards shout from farther. | medium |
| Sentinel dispatch volume | game.js:3258 | `a.volume = 0.9; a.play()` | 0.9 | 0 – 1 | Loudness of the Mender dispatch line. | easy |

## Touch controls

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Joystick reach | game.js:4331 | `const JOY_RADIUS = 58, JOY_DEAD = 10` | radius 58 px, dead zone 10 | radius 40 – 90, dead 0 – 25 | Radius = how far to drag for full speed. Dead zone = ignore tiny wobbles. | easy |
| Joystick size | style.css:35 | `.joystick-base { position:absolute; width:128px; height:128px` | 128 px | 90 – 180 | Size of the joystick ring. Change width AND height. | easy |
| Fire button size & place | style.css:161 | `body.mtouch #btn-fire { width:20vmin; height:20vmin` | 20vmin | 14 – 28vmin | vmin = % of the short screen side. right/bottom move it. | easy |
| Jump button | style.css:162 | `body.mtouch #btn-jump    { width:12.5vmin` | 12.5vmin | 9 – 18vmin | Size of jump button. | easy |

## UI & fonts

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Theme colours | style.css:54 | `:root { --rust:#5a2e16;` | rust, ember #ff6a00, bone… | any #RRGGBB | Main HUD palette. Try --ember:#00e5ff for a blue theme. | easy |
| Main body font | style.css:55 | `body, button, select, input { font-family:'Chakra Petch'` | Chakra Petch | Black Ops One, Caveat, sans-serif | Font for most text. | easy |
| Title gradient | style.css:83 | `.q3-title { font-family:'Black Ops One',sans-serif; background:linear-gradient(180deg,#fff7c2` | yellow → red | any colours | The fiery DYSTOPIA title. | easy |
| Crosshair colour | style.css:119 | `#crosshair .absolute { background:rgba(255,183,3,.9)` | amber | any rgba | Colour of the aim cross. | easy |
| Floor banner colour | style.css:116 | `#banner-title { font-family:'Black Ops One',sans-serif !important; color:#ffb703` | #ffb703 | any #RRGGBB | Big floor-start title colour. | easy |

## Text

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Browser tab title | index.html:10 | `<title>DYSTOPIA` | DYSTOPIA — Project Moses (...) | any text | Name shown on the browser tab. | easy |
| Splash subtitle | index.html:31 | `>Project Moses</p>` | Project Moses | any text | Line under the big logo. | easy |
| Loading message | index.html:39 | `Initializing Triage systems…` | Initializing Triage systems… | any text | First loading line. | easy |
| Game title (code) | game.js:19 | `let GAME_BRAND_TITLE = "DYSTOPIA";` | DYSTOPIA | any text | Name used by the game code. | easy |

## Trailer

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Trailer file & seen key | game.js:6209 | `TRAILER_KEY = 'dys_trailer_seen_v4'` | media/dystopia_trailer_720p.mp4, key v4 | v5, v6… | Change v4 to v5 and everyone sees the trailer once more on startup. | easy |

## Multiplayer

| What | File:line | Find (Ctrl+F) | Now | Safe range | Effect | Tag |
|---|---|---|---|---|---|---|
| Room code length | game.js:5139 | `for (let i = 0; i < 5; i++) s += chars[` | 5 letters | 4 – 6 | Length of room codes. Also update the 4 in the join check (code.length < 4). | medium |
| Room code letters | game.js:5138 | `const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'` | no I, O, 0, 1 | letters/digits | Characters that can appear in codes. | easy |
| Relay (TURN) servers | game.js:6034 | `const DM_TURN = [];` | empty | Ask Grok Bot | Needed for different networks. Holds a login, so never paste secrets in chat. | risky |
| Deathmatch bot count | game.js:5837 | `DM.maxBots ?? 7` | 7 | 0 – 7 | Bots that fill empty deathmatch slots. | easy |

## File sizes

| File | MB |
|---|---|
| media/dystopia_trailer_720p.mp4 | 13.70 |
| music/boss_aggressor.mp3 | 2.66 |
| models/sentinel_colossus.glb | 2.36 |
| music/dm_burn_the_world_waltz.mp3 | 2.24 |
| music/explore_devastation.mp3 | 2.12 |
| music/combat_metalmania.mp3 | 2.12 |
| music/menu_dark_times.mp3 | 2.10 |
| music/credits_feral_angel_waltz.mp3 | 2.06 |
| music/combat_killers.mp3 | 1.68 |
| models/pulse_cannon.glb | 1.58 |
| models/human_guard.glb | 1.56 |
| music/title_rising_game.mp3 | 1.21 |
| models/char_recon.glb | 0.98 |
| models/mender_treads.glb | 0.97 |
| models/sentinel_guard.glb | 0.94 |
| models/char_viper.glb | 0.92 |
| models/sentinel_heavy.glb | 0.92 |
| models/char_mech.glb | 0.91 |
| models/player_ion_emp.glb | 0.88 |
| models/char_assault.glb | 0.85 |
| models/mender_unit.glb | 0.82 |
| models/char_specops.glb | 0.79 |
| models/char_valkyrie.glb | 0.76 |
| models/server_rack.glb | 0.45 |
| models/ph_extinguisher.glb | 0.44 |
| models/pipe_vent.glb | 0.42 |
| models/crate.glb | 0.41 |
| models/barrel.glb | 0.26 |
| models/ph_airduct.glb | 0.26 |
| models/office_chair.glb | 0.24 |
| models/sentinel_pulse_rifle.glb | 0.24 |
| models/ph_security_camera.glb | 0.22 |
| models/ph_power_box.glb | 0.21 |
| models/ups_cabinet.glb | 0.20 |
| models/cell_door.glb | 0.20 |
| models/security_desk.glb | 0.20 |
| models/desk_monitors.glb | 0.19 |
| models/filing_cabinet.glb | 0.18 |
| models/cell_bench.glb | 0.18 |
| models/guard_rifle.glb | 0.18 |
| models/wall_terminal.glb | 0.18 |
| models/cooling_unit.glb | 0.17 |
| models/guard_rifle_scifi.glb | 0.16 |
| models/player_rocket_scifi.glb | 0.16 |
| models/player_shotgun_scifi.glb | 0.15 |
| images/tex/metal_floor_1k.jpg | 0.14 |
| images/tex/metal_wall_bump_1k.jpg | 0.12 |
| models/bot_drone.glb | 0.10 |
| images/tex/metal_wall_1k.jpg | 0.07 |
| audio/colossus_voice.mp3 | 0.05 |
| images/tex/metal_floor_bump_1k.jpg | 0.05 |
| media/trailer_poster.jpg | 0.05 |
| fonts/Caveat-500.woff2 | 0.05 |
| audio/colossus_loved.mp3 | 0.04 |
| audio/mini_colossus_loved.mp3 | 0.04 |
| audio/colossus_distress.mp3 | 0.04 |
| audio/mini_colossus_distress.mp3 | 0.03 |
| audio/sentinel_dispatch.mp3 | 0.03 |
| fonts/BlackOpsOne-400.woff2 | 0.03 |
| models/char_specops_run.glb | 0.02 |
| models/char_recon_run.glb | 0.02 |
| models/char_mech_run.glb | 0.02 |
| models/char_assault_run.glb | 0.02 |
| models/char_valkyrie_run.glb | 0.02 |
| models/char_viper_run.glb | 0.02 |
| audio/colossus_sanitation.mp3 | 0.02 |
| audio/mini_colossus_sanitation.mp3 | 0.02 |
| audio/mini_colossus_voice.mp3 | 0.02 |
| audio/guard_lost.mp3 | 0.01 |
| audio/guard_contact.mp3 | 0.01 |
| audio/guard_mandown.mp3 | 0.01 |
| audio/guard_flanking.mp3 | 0.01 |
| fonts/ChakraPetch-600.woff2 | 0.01 |
| fonts/ChakraPetch-500.woff2 | 0.01 |
| fonts/ChakraPetch-700.woff2 | 0.01 |
| audio/guard_moving.mp3 | 0.01 |
| audio/guard_fragout.mp3 | 0.01 |
| audio/guard_reloading.mp3 | 0.01 |
| fonts/OFL-BlackOpsOne.txt | 0.00 |
| fonts/OFL-ChakraPetch.txt | 0.00 |
| fonts/OFL-Caveat.txt | 0.00 |
| media/TRAILER_SOURCES.md | 0.00 |
| game.js | 0.52 |
| style.css | 0.05 |
| index.html | 0.04 |
