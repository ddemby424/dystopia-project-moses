# Changelog

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
