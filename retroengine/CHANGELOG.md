# Changelog

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
