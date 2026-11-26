# Changelog

## 1.6.0 (2026-11-26): Pro grows to seven chapters, with new enemies and a new boss

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.6.0**), powered by DMB Tech 1 **1.3.0**.

- **Sgt. chevrons on Pro's suit.** Both shoulder plates now carry classic three-stripe sergeant chevrons in glowing ion blue, the same blue as his visor and cannon charge. They are real geometry fitted to the armor (`pro/assets/pro_suit.glb`, now 31,232 triangles and 1.83 MB) and they breathe slowly on the splash screen, the story cards and the preview.
- **Modern feel in Pro** (`pro/juice.js`, Pro only, nothing to download):
  - **Gun feel.** A hitmarker tick and flash on every hit, red when it kills. The arm cannon kicks harder, impacts throw bright sparks, and a red wedge on the edge of the screen shows which way a hit came from.
  - **Thruster dash.** Press **Shift** or **Q**, or tap the **DASH** button on a phone. You get a 0.18 s burst with a 0.9 s cooldown and a speed-line flash, which is enough to sidestep twin-cannon fire. Holding Shift still runs.
  - **Combo rush.** DOUBLE KILL, TRIPLE KILL, QUAD KILL and RAMPAGE callouts, a kill feed, a crimson shatter burst when an enemy dies, and glowing health and shield orbs (+10) that pop out of the fallen. Orbs don't count toward the map's item total.
  - **Pro HUD.** Slim health and shield bars, ammo pips under the crosshair (a recharge bar for the endless cannon), and a compass bar at the top with an objective marker. Under it, a waypoint arrow shows the distance to the next key, target, boss or exit. The engine's light, map, full-screen and pause buttons move to a row under the minimap.
  - **Audio punch.** Web Audio sounds made in code: ring-cannon fire and recharge, a thruster hum when hovering enemies are close, the hitmarker tick, a dash whoosh, and a low thump on heavy hits. They follow your volume and SFX settings.
- DMB Tech 1 1.3.0 host hooks for this: `'hit'`, `'hurt'`, `'shot'` and `'dash'` events, and `handle.dash()`, `handle.spawnPickup()` and `handle.sparks()`. Nothing changes unless a host uses them.
- **Seven chapters.** The Lab → The Yard → The Drains → The Factory → The Roof → **Catacomb Relay** (new) → The Marble Shrine, each with its own brief and between-chapter card.
- **New map: Catacomb Relay** (`maps/catacomb-relay.retro`, 64×64). A start crypt, a bone corridor, an ossuary hall with pillars, a relay room full of servers and vats, and a marble antechamber that leads to the Shrine. The exit stays sealed until every twin-cannon trooper is dead. It is used by Pro only and isn't added to the editor's map pack.
- **Twin-cannon troopers** (`pro/assets/pro_enemy.glb`, 19,865 triangles, 1.08 MB). Built from Pro's own suit in red and black. They hover on a glowing thruster under the down-pointing cannon, bob as they float, and fire crimson rings from the raised cannon.
- **Dystopia drones** (`pro/assets/bot_drone.glb`, 104 KB, the site's "Bot Drone" by Dave404, CC BY 3.0). They fly at mid height, weave and fire plasma, and replace the gun drones in every chapter.
- **Ballisticus sentinels** ("Ballisticus, the Living Armory" by Andfx, CC0, Meshy community; `pro/assets/pro_sentinel.glb`, 14,986 triangles, 1.16 MB, cut down from 3.1 M faces and 169 MB). They take over from the heavy walkers, with more of them in the Lab, the Factory and the Relay. The Warden in the Lab and the Factory's titan are now a big Ballisticus too.
- **The Minotaur is AntiLegend's avatar** (`pro/assets/pro_minotaur.glb`, 21,708 triangles, 1.06 MB, cut down from 1.36 M faces and 53 MB). He stands 2.8 m tall in front of his throne in the Marble Shrine.
- **Drop-in model slots.** Add `pro/assets/pro_prop.glb` and it shows up as the community model in the Relay. If the file isn't there, the slot is skipped.
- Pro's enemies are registered on Pro's own runtime, and campaign.json decides which stock enemies get swapped out in each map. The editor's enemy list and maps don't change.
- **DMB Tech 1 1.3.0.** Enemy defs can set `lift` (float above the floor with a full-height hitbox) and `bob`. A `jet_anchor` node in an enemy GLB gets a flickering thruster flame. Emissive textures in GLBs glow instead of being switched off. There is a new `redring` projectile.
- **Multiplayer character picker previews.** Each model in the lobby now has a miniature card with a pre-rendered thumbnail (`assets/thumbs/*.webp`, about 6–12 KB each). The one you pick spins live in a small turntable, and only that model's GLB is loaded. The turntable stops when the lobby closes. If WebGL is off, a large thumbnail is shown instead.
- `pro/preview.html?part=enemy|drone|minotaur|sentinel` shows each new model.

## 1.5.1 (2026-11-25): Pro stands on its own, powered by DMB Tech 1

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.5.1**), powered by DMB Tech 1 **1.2.4**.

- **Pro has its own splash screen.** The title **PRO** is spray-painted on screen one stroke at a time, with soft overspray, speckle and a few paint drips (`pro/spray.js`, a 2D canvas, no sound). Next to it, the slim Sgt. Protagonist suit spins while a **blue ion charge** keeps building in his arm cannon: a pulsing cyan glow, a light on the barrel and 24 sparks pulled into the muzzle. A still image shows first while the 3D model loads. A cyan loading bar fills as the campaign, the four maps, the suit and the cannon load. When the paint is done, the **Powered by DMB Tech 1** engine badge and a small Darcy D. Demby · DembySoftwareSystems credit appear, then **TAP TO CONTINUE** takes you to the campaign menu.
- **Pro loads as a standalone game.** The page title is just "Pro", and the menu's RetroEngine button is gone. The game's own screens (pause, quit, music player, no-WebGL notice) name Pro and DMB Tech 1, never the editor.
- **Add to Home screen.** `pro/manifest.webmanifest` and icons open it full screen in landscape as **Pro**.
- DMB Tech 1 1.2.4 adds `opts.gameName`. When a host sets it, the engine's built-in screens use that name and "DMB Tech 1" instead of "RetroEngine". The editor doesn't set it and looks the same.
- The editor, map pack, multiplayer and the Marble Shrine are unchanged.


## 1.5.0 (2026-11-25): PRO, the first story campaign

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.5.0**), powered by DMB Tech 1 **1.2.3**.

- **New campaign: PRO** (`pro/`). You are Sgt. Protagonist (nicknames: "Protag", "Pro", "Sgt Taggs"), an elite weapons specialist and mechatronics engineer. You're breaking out of Pandemonium Inc. HQ, where New Age cultists want your brain to seed a self-growing AI soldier chip and plan to sacrifice the rest of you to their horned god AntiLegend. Four linked chapters use the pack maps: **The Lab** (Site 12: Dataworks) → **The Yard** (Cellblock Yard) → **The Factory** (Plant 4: Lockdown) → **The Marble Shrine** (the minotaur is AntiLegend's avatar). The campaign ends with a pirate-TV **ending broadcast**.
- **Story cards.** An intro card, a mission brief before each chapter, a short card between chapters, and the ending broadcast. All the text is in `pro/campaign.json`.
- **Exits stay sealed until each chapter's goal is met.** Lab: kill the Warden (Titan). Yard: get the red sally-port key. Factory: get the red keycard. Shrine: kill the minotaur (the 1.4.2 rule). Stepping on a sealed pad tells you what is missing.
- **Saved progress.** Your chapter is saved in this browser (`localStorage`, key `retroengine.pro.campaign.v1`). If you reload, you get **Continue** at the chapter you reached. Your guns and ammo carry over inside one session. After a reload, the chapter starts with the default loadout.
- **Pro's suit.** Darcy's Meshy model, slimmed on the box for phones: 30,656 triangles and 1.8 MB, down from 1.58 M faces and 57 MB, with 1024 JPEG textures. It spins on the intro and ending cards. Inspect it at `pro/preview.html`, and see just the cannon at `?part=cannon`.
- **Pro's arm cannon is your first-person gun.** The right forearm cannon was cut out of the same model (5,034 triangles, 390 KB) and aimed down the barrel. It replaces the Pulse Cannon view model in the lower right, in the campaign only. It **fires glowing cyan energy rings** (a shared 216-triangle torus), with a ring-shaped muzzle flash, a cyan barrel light, a short coil glow and the usual recoil kick. Damage, speed and hits are the same as the Pulse Cannon.
- DMB Tech 1 1.2.3 adds three small host hooks, and the editor and other modes don't use them. `opts.exitGate(G)` returns a reason the exit is sealed, or ''. `opts.ringShots` turns on ring projectiles for the player's Pulse Cannon. `opts.quitLabel` renames the quit button. A project model can now be an object `{ src, len, flip, off }`, so a host can size a view model.
- The editor, trial map pack, multiplayer and the Marble Shrine are unchanged.


## 1.4.2 (2026-11-25): Shrine exit stays sealed until the minotaur falls

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.4.2**), powered by DMB Tech 1 **1.2.2**.

- **The Marble Shrine exit pad stays locked** until the minotaur boss is dead. A seated or rising boss still counts as alive, so clearing the minions (or loading a multiplayer room, where minion bots are skipped) no longer opens the portal. Stepping on the pad early shows "THE EXIT IS SEALED — the minotaur still lives." The beam stays dim until the boss falls, then you can walk out. Maps with no boss are unchanged.


## 1.4.1 (2026-11-25): Marble Shrine white-lab lighting

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.4.1**), powered by DMB Tech 1 **1.2.1**.

- **The Marble Shrine is brighter**, in a clean white-lab look: pale marble (no grime pass), high ambient light, a new **White Lab** sky (no night city), light far-away fog, and extra fill lights at the top of the stair. Gold trim and the glowing sigils stay readable. Other maps are unchanged — these are per-level settings (`lightPreset: lab`, `sky: lab`) plus marble textures that only this map uses.
- Editor: **White lab** lighting preset and **White Lab** sky in the Level tab. Optional level keys `exposure`, `hemiI`, `sunI`, and `hemiGround` if you want to fine-tune one map.


## 1.4.0 (2026-11-25): The Marble Shrine, minotaur boss, warp and palm shot

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.4.0**), powered by DMB Tech 1 **1.2.0**.

- **New map: The Marble Shrine** (`maps/marble-shrine.retro`, 80×96). A larger, gritty white-marble shrine under a night sky: a tall stair (16 steps, 2.4 units) up to a high plaza, then steps down into a sunken ankle-deep pool with a border walkway, a throne at the back, occult sigils, dim flickering braziers, and fog. Marble is procedural (veined, stained, dark). Single-player: clear 19 stock minions (grunts, drones, heavies, turrets), then the boss rises from the throne. The exit pad is behind the throne. Music: Crypto (Kevin MacLeod, CC BY 4.0).
- **Minotaur boss.** A realistic minotaur (Brazen Minotaur by Alice Liu, CC0, Gobkit — see CREDITS) sits on the throne until every minion is dead, then rises and attacks. Big health bar, melee, a **warp** (fades out and reappears near a player with a telegraph ring and pillar), and a glowing **palm projectile** aimed at the nearest player, slow enough to dodge. If the GLB fails to load, a procedural stand-in is used. Statues around the shrine use the same model, stone-tinted and unanimated.
- **Victory.** When the minotaur falls, the game shows "THE MINOTAUR FALLS — the shrine is quiet" (the level script also notes that the way behind the throne is open). Walk to the exit pad to finish.
- **Multiplayer sync (host-driven, no new relay messages).** Shared rooms still skip minion bots so they cannot desync. The minotaur still spawns. Only the **host** runs its AI (`driveBoss`). The boss stays seated until **FIGHT!** (`setCombat`). Warp, rise, pose and the palm bolt ride on the existing `shot` message as `fx:` tags (`p:palm`, `w`, `u`, `s`); pose is throttled to about 4 Hz. Damage the boss deals to players is shooter-authoritative on the existing `hit` message, the same as other weapons. The host targets the nearest player (any peer). Joiner machines apply the visuals and do not run combat AI.
- **Outdoor shots.** Projectiles over a sky ceiling can travel up to height 12, so a palm bolt on the 2.4 plaza is not clipped by the old wall-height cap.
- **Gold trim and columns.** The shrine hall has worn, slightly metallic gold trim on baseboards, cornices, stair edges, the pool border and the throne, plus rows of instanced white-marble columns with a carved, faintly glowing occult sigil. Shared geometry and materials, so it stays light on a phone.
- **Floors taller than 1.** `normalizeLevel` now allows floor height up to 6, so grand stairs and raised plazas stay intact.
- Editor: minotaur enemy (`!`), minotaur statue, throne, brazier and sigil props; marble and water textures; height presets 1.2 / 1.8 / 2.4.
- Memory: pool and dispose stay in line with 1.3.0 (water planes and materials are disposed when a level unloads).


## 1.3.0 (2026-11-24): map, LAW launcher, big explosions, grenades, signs

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.3.0**), powered by DMB Tech 1 **1.1.0**.

- **In-game map.** Press **M** (or **Tab**), or tap the big **MAP** button on a phone. An overhead map shows the walls, you (orange arrow, pointing where you face) and, in multiplayer, the other players. It is see-through and the game keeps running, so you can still move and shoot. Press or tap again to close.
- **LAW rocket launcher** (weapon **7**, or Q to cycle). Uses rockets. Pickups on maps (two on Site 12). The rocket flies with a sidewinder smoke trail (a spiraling, wobbling smoke line with a flame glow) that hangs in the air for about 4 seconds and fades out, so it reads in long hallways and open yards.
- **Bigger explosions.** Bigger fireball, rolling fire, a slow column of dark smoke, a light flash, camera shake for anyone nearby, and a burn mark on the floor or wall. Damage falls off with distance and walls block it. Barrels set each other off.
- **Grenades.** Press **T**, or tap **NADE** on a phone. They arc, bounce off walls, floors and players, and go off after about 2.5 seconds. You start with 2, carry up to 5, and find more in pickups (three on Site 12). The count shows next to your ammo (◆).
- **Multiplayer.** Rockets, grenades and blasts show up on every player's screen. The player who fired works out who is in the blast and sends the damage, the same as bullets. No blast damage before **FIGHT!**. Your own blasts still hurt you at half strength. The server is unchanged (the effects ride on the existing shot message).
- **Signs.** A few sector markers ("SECTOR 7-B" with arrows), glowing green running-man fire exit signs, and weathered plates for made-up companies, drawn by the game itself. Every player sees the same signs in the same places.
- Editor: **w_law** (map key 9) and **grenades** (map key 7) pickups in the palette.
- Fixed: rockets kicked their own aim upward (the recoil was applied before the rocket left), so they climbed into the ceiling in long halls.

## 1.2.6 (2026-11-24): host can see the joiner

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.2.6**), powered by DMB Tech 1 **1.1.0**.

- **Fixed: the host couldn't see the other player** (but the other player could see the host). Multiplayer only ran while the game was in its "playing" state. When the host's game paused (the Waiting panel released the mouse, which pauses on PC; on a phone, switching apps to send the room code pauses too), the host stopped drawing other players, so a friend who joined then stayed stuck, hidden in the map's corner wall. Multiplayer now keeps sending your position and drawing other players while paused or on a menu.
- In a multiplayer room, letting go of the mouse no longer pauses the game (a network match can't pause anyway), so freeing the mouse for the Ready/Start buttons is safe. If the game does pause (Esc, or a phone switching apps), the Waiting panel steps aside so **Resume** is never covered. The Y (Ready) and G (Start) keys still work.
- A late joiner after FIGHT no longer gets a stray FIGHT! banner.
- Opening Multiplayer from the in-game Play screen now closes that single-player game first, so the room starts on the room's map with no bots (before, the host kept the old game with 38 enemies).
- A new remote player stays hidden until it is placed at its real position.

## 1.2.5 (2026-11-24): see if everyone is in before the match

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.2.5**), powered by DMB Tech 1 **1.1.0**.

- **No automatic start.** After joining a room you get a **Waiting for players** panel: everyone in the room with their character, **Ready** or **Not ready**, and a count like "1/2 ready". If someone leaves, the list updates.
- **Big Ready button** (phone-sized; **Y** on a keyboard). The host (★, the room creator; if they leave, the next player in) also gets **Start now** (**G**), which works once at least 2 players are in.
- When every player (2 or more) is Ready, or the host presses Start, the host sends the 10-second countdown and the usual **FIGHT!** flow runs. No PvP damage while waiting or counting down.
- Late joiners during the countdown join it; after FIGHT they just spawn in.
- Ready rides on the relay's existing shot message (weapon "ready"), like the countdown, so the server is unchanged. Leaving a match now tells the room right away instead of after the relay's ~2 s timeout.

## 1.2.4 (2026-11-24): multiplayer shared start, countdown, true remote positions

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.2.4**), powered by DMB Tech 1 **1.1.0**.

- **Everyone starts together.** In a multiplayer room every player now spawns on the host's pad (Site 12: 20.5, 8.5; one-start maps use that start), nudged a step apart so nobody stacks. The old join-order pads (which put a friend 40+ cells away) stay in code as `spawnMode: 'fixed'`; `'random'` is kept for later and will pick an unoccupied pad, Doom deathmatch style.
- **10-second countdown.** "Deathmatch begins in 10…" shows on screen; you can move and spread out, but PvP hits are ignored until **FIGHT!**. The room host owns the clock and re-sends the time left whenever someone joins, so late joiners land in the same countdown. It rides on the relay's existing shot message, so the server is unchanged.
- **Remote players sit where the player really is.** Other players are drawn at real player size (body height matched to the first-person eye height; they were twice too big, so they poked through walls). A remote never slides across a wall between updates: if two updates are far apart or a wall is between them, the model snaps, like Doom. Remotes stay hidden until their first real position arrives (the join message said 0,0, the corner wall).

## 1.2.1 (2026-11-24): Site 12 stock enemy bots

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.2.1**), powered by DMB Tech 1 **1.1.0**.

- **Site 12: Dataworks now has a single-player fight.** The 128×128 compound keeps its eight multiplayer spawns and exit pad, and is stocked with the engine's existing CC0 Quaternius enemies (no new downloads): Heavy Walkers and Gun Drones featured throughout, plus Soldiers, Sentry Turrets, and a Titan guarding the clean lab annex. Hostiles are spread in groups through the yard, data halls, factory, warehouse, catwalks and lab, kept off the eight spawns. Extra rifle, rocket and ammo/health pickups support the fight. The HUD Hostiles counter and the south-yard exit pad are the win condition, same as the other trial maps.
- **Enemies stay single-player.** Bots are simulated locally and are not sent over the multiplayer relay, so they would desync in a shared room. Multiplayer rooms skip enemy spawns (`skipEnemies` on `RT.play` / `playtest`); everyone still loads the same map, spawns and pickups. Single-player Play and `#pack=` links are unchanged.

## 1.2.0 (2026-11-24): editor IDE layout, properties, assets and lighting

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

Editor (RetroEngine **1.2.0**), powered by DMB Tech 1 **1.1.0**.

- **Status readout:** the bottom status bar (and a floating readout on phones) shows the grid coordinates under the cursor or finger plus what is on that cell: wall or floor texture, ceiling, height, door type, thing name (Soldier, Exit pad, and so on), light level and the current map layer.
- **Property dropdowns:** a Properties inspector at the top of the right panel edits wall, floor, ceiling, height, door type and light level. A Select-tool rectangle applies the same change to every cell in the selection.
- **IDE-style layout** on PC and tablets: left Explorer (project, levels, models, scripts), centre map, right inspector and tabs, bottom status bar, dark gritty chrome. On phones (including a Galaxy Z Fold folded or unfolded) the explorer and panel still collapse to sheets.
- **More textures and props** in a retro sci-fi / industrial FPS style: riveted bulkheads, vent grilles, stained concrete, hazard chevrons, plus a **clean well-lit set** (lab wall panels, office wall, med-bay wall, polished tile, brushed aluminium, bright ceiling lights). Fifteen placeable props now use real CC0 GLBs by Quaternius (Sci-Fi Essentials Kit and Modular Sci-Fi MegaKit, Standard), with procedural fallbacks: crates, barrels, desks, lab benches, lockers, server racks, shelves, pillars, pipes, terminals, consoles, vats, fans and vents. Med cabinets, extinguishers, generators and floor lamps stay procedural (no fitting CC0 model in those packs).
- **Lighting presets** on the Level tab: Gritty, Clean bright, and Emergency red. Clean bright is tuned so labs stay well-lit without washing out. Stamp **Clean Lab** or **Med Bay** from the Rooms tab for a ready well-lit room.
- **Five more music tracks** (Kevin MacLeod, CC BY 4.0): Hitman, Volatile Reaction, Industrial Revolution, Crypto, Danger Storm. Re-encoded to 40 kbps mono to keep the download small. Never uses Darcy's own songs.
- **Remote player models** for third-person multiplayer, with an in-game / settings character picker of six models: George, Leela, Mike, Stan (Animated Mech Pack, CC0), SWAT (CC0), and Sci Fi Character (CC-BY, credit Quaternius). Each has a distinct team tint. GLBs lazy-load only when that model is used. `RT.createRemotePlayer(modelId)` (also on the play handle) returns `setPose(x, y, z, yaw, anim)` and plays Idle / Walk / Shoot / Hit / Death. A procedural fallback is used if a GLB fails to load.
- **Multiplayer lobby** (local / optional relay): Menu → Multiplayer opens a room browser. Character dropdown lists all six player models (shared with the Settings picker). Level picker lists the project's levels plus official trial pack maps. Joining a room loads that level and attaches the WebSocket layer (`mp/`). If the relay is unreachable, the lobby shows **Server offline** and single-player is unchanged. Default server: `wss://dembysoftwaresystems.com/ws` on https, `ws://localhost:8080/ws` on localhost, overridable with `?mp=URL`. Not published until you say go.
- **Site 12: Dataworks** (`maps/site12-dataworks.retro`): a 128×128 factory and data-center compound for multiplayer — outdoor yard, indoor halls, raised catwalks, a clean bright lab wing (Clean Lab / Med Bay rooms), cover blocks, the 15 CC0 Quaternius props, and eight spread-out spawns. Music: "Industrial Revolution" by Kevin MacLeod (CC BY 4.0). Listed on the trial pack page, in the editor Explorer, and in the lobby room-creation list. Gritty areas are slightly brightened so props stay readable.



## 1.1.3 (2026-11-23): Pulse Cannon projectile spawn

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

- Fix: Pulse Cannon (and other projectile) shots no longer spawn a large white box over the first-person gun. Projectiles start 0.85 units ahead of the camera, and projectile meshes (player pulses and incoming enemy bolts) stay small or hidden until they leave the near field. The world muzzle light sits further down the barrel so it does not bleach the near floor into a white card. DMB Tech 1 **1.0.2**.



## 1.1.2 (2026-11-23): stairs lesson, Cellblock Yard, outdoor assets

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

- New tutorial **Lesson 15 — Stairs, catwalks and jumping**: floor heights (`fh`, `STEP_H` 0.36), the Height tool (U), Floor height buttons, Stairs Up / Guard Tower templates, `HEIGHT_CHARS`, jumping, and a two-minute watchtower build. Also covers the new outdoor textures.
- New trial map **Cellblock Yard** (`maps/cellblock-yard.retro`): a 52×40 outdoor prison-yard / secured compound with sidewalks, curbs, chain-link and weathered brick, guard towers, a sniper catwalk, keys, about twenty enemies, and a Titan on the sally-port exit pad. Music: "Aggressor" by Kevin MacLeod (CC BY 4.0).
- DMB Tech 1 **1.0.1** adds procedural outdoor textures: `sidewalk`, `curb`, `fence` (see-through chain-link with razor wire), `brick_weathered`, and `asphalt_lines`.


## 1.1.1 (2026-11-23): powered by standalone DMB Tech 1

RetroEngine play mode now imports the standalone **DMB Tech 1** library (`dmbtech1.js`) instead of keeping a private copy of the runtime. The editor, trial maps, and tutorial are unchanged in gameplay.

- One engine: map loading, renderer, movement, weapons, enemies, pickups, keys/doors, exit pads, level scripts, audio, touch, and aim assist live in DMB Tech 1 1.0.0.
- `index.html` loads Three.js r128 through a pinned import map and runs `app.js` as an ES module.
- `build.py` copies `dmbtech1.js` into the published `retroengine/` folder. `retroengine.html` is a module launcher (no longer a fully inlined single file).
- Tutorial lessons that pointed at engine tables in `app.js` now point at `dmbtech1.js`.
- Standalone HTML export imports `dmbtech1.js` rather than inlining `DFRuntime.toString()`.


## 1.1.0 (2026-11-23): Tutorial & Tinkerer release

Darcy D. Demby, Chief Software Architect, DembySoftwareSystems.

This is the tutorial and tinkerer release. It emphasizes code, simple coding techniques, and modding: how to add assets, make and pack maps, save and share files, change engine code, and — in the advanced lessons — write level scripts and call APIs.

- New **Tutorial** (Menu → Tutorial, also linked from Help and the map pack page) at `tutorial/`. Fourteen lessons with copyable example code and where to put it, plus an advanced section on scripts and APIs.
- Default starting firearm is the **Pulse Cannon**, a compact procedural port of the early DYSTOPIA Version 2 default gun (commit 16322b7; original mesh and synthesized pulse sound, CC0). Infinite ammo, automatic, tight cyan pulses. Pickup slots and map format are unchanged.
- Light **aim assist** (shot magnetism in a tight cone) is on by default for touch. Strength is a slider in Game settings; an optional checkbox also enables it for mouse.
- RetroEngine **movement and turning** were retuned to feel freer: higher default look sensitivity (1.25), slightly wider pitch, faster touch-drag turning, a small joystick deadzone, and snappier ground/air acceleration (less friction and stiffness, freer strafing). This is a tune of RetroEngine’s own controls, not a copy of DYSTOPIA’s control code.


## 1.0.2 (2026-11-23): trial map pack
- Added three full-size escape-pad trial maps (Plant 4: Lockdown, Drainworks: Overflow, Nightwatch: Helipad). Each has multiple rooms, guards along the route, a Titan boss, pickups, and an exit pad.
- New Map Pack page (`maps/`) so a visitor can tap a map and play it in RetroEngine. Maps also download as `.retro` files.
- Official pack links use `#pack=maps/name.retro` (same-origin files only). Their level scripts stay on. Share links and dropped files are unchanged: scripts stay off until you review them.
- Menu → Trial map pack opens the pack page.


## 1.0.1 (2026-11-21): tutorial fix
- Fixed the tutorial seeming to freeze on phones. After you picked the right tool, nothing showed the next action (drag on the map, pick a room, tap a wall), and "Next" stayed greyed out with no way forward.
- New pointer: a white arrow cursor bobs next to the exact button or map spot to touch at every step, including the drag for drawing a room. It follows the screen when you rotate, never blocks taps, and pulses bigger if you sit idle for about 6 seconds.
- A "Skip step" button appears if you are stuck on a step for a while.
- On wide screens (unfolded Fold, tablets) the tutorial card no longer covers the side-panel tabs. In landscape on phones it moves to the side so the map stays visible.
- Added the DMB TECH splash screen to the source build.

## 1.0.0 (2026-11-20): first RetroEngine release
RetroEngine is the release-ready successor of DOOMFORGE IDE 2.0.

**New name and data**
- Renamed everything to RetroEngine. Old DOOMFORGE saves, settings, project slots and project files carry over automatically.
- New loading splash screen and About & credits page.

**Characters and weapons**
- Rigged, animated CC0 enemies (soldier, gun drone, heavy walker, Titan boss) with smooth cross-faded animations (idle, run, shoot, hit, death). Animation detail drops for far-away enemies to keep phones fast.
- First-person guns from CC0 models: per-weapon magazines, reload animation, recoil, sway, bob, muzzle flash and ejected shell casings. The HUD shows *loaded / reserve* ammo.
- A rim light helps enemies stand out from dark walls.

**Smarter bots**
- They alert nearby squadmates, even ones who can't see you.
- They strafe while reloading, and flankers circle round to your side.
- Hurt bots take cover out of your line of fire, then pop back out.
- *Easy / Normal / Hard* difficulty scales health, speed, damage, reaction time, fire rate and the share of flankers (15% / 40% / 65%).

**Look and sound**
- New gritty lighting:
  - Filmic tone mapping with capped lights, so close walls no longer blow out to white.
  - Shadowed corners (floors darken next to walls, and walls darken at the base and top).
  - Dimmer ceiling panels and less shiny steel and tile.
- Music player with 5 CC BY 4.0 tracks (metal, trap, hip-hop). Each level can pick a track, you can skip tracks in game, and synth music plays as an offline fallback.

**Sharing**
- **Share link:** the level is compressed into the URL (`#map=…`). The native share sheet opens on phones. Opening a link starts the level in Playtest, with *Back to editor*.
- **.retro level files** (versioned JSON, including custom models). Import with the file picker or drag and drop. Files are checked for size, map dimensions and entities.
- Imported level scripts stay switched off until reviewed.

**Mobile and browsers**
- Works in Chrome, Samsung Internet, Firefox, Safari on iOS and in-app webviews.
- Screen fit: safe areas for notches and home bars, dynamic viewport sizing, and handling for rotation and address-bar changes.
- Touch: pinch and double-tap zoom blocked on the game, tap-to-fire never missed, and a compact HUD on short landscape screens.
- Sound unlocks on the first tap (iOS, and Firefox's asynchronous start).
- Fullscreen (with landscape lock on Android), vibration, Web Share and the clipboard are used only when available.
- Saving files on phones uses the share sheet, which also works in webviews.
- WebGL1 fallback, and a friendly message when WebGL is missing.
- New **Auto** graphics quality with live resolution scaling.

**Help**
- Tabbed in-app help: Quick start, an interactive tutorial ("build your first level"), and the Manual.
- `help.html` manual, with new sections on sharing maps and on phones and tablets.

**Fixed**
- Lights hidden inside the downloaded 3D models made every level glaringly bright. They are now stripped on load.
- Flankers' flank route was overwritten by pathfinding, so they rarely flanked.
- Cover spots could still be visible from the player, so hurt bots left cover instantly. Cover is now checked a body-width around the spot.
- A quick tap on FIRE did nothing if it began and ended within one frame.
- Short landscape phone screens: the HUD overlapped the RUN and USE buttons. Narrow screens: the top buttons overlapped the level title.
- A script error could appear when closing Playtest.

**Tests**
- Automated suites:
  - `tests/test_retroengine.py`: editor, game, models, weapons, music, help and export (71 checks).
  - `tests/test_mobile_share.py`: Chromium, WebKit and Firefox phone, foldable and tablet profiles, plus sharing (321 checks).
  - `tests/test_ai.py`: bot behaviors and difficulty (16 checks).

## 2.0.0 (DOOMFORGE IDE, 2026-11-20)
The full editor and engine rework that RetroEngine builds on: responsive editor for desktop, tablet and Galaxy Fold, Rooms library, multi-level projects, standalone HTML export, 20 procedural textures, 6 weapons, 5 enemy types, touch controls, synth sound and three starter levels.
