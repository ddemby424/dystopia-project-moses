# Lesson 1 — Tour the project folders

**Time:** about 5 minutes
**Payoff:** you can point at every important file and say what it does.

RetroEngine has two folders that matter. Think of them like a TI-89 program you edit, and the "compiled" copy you actually run.

- **Source** (the folder you edit): the directory that contains `app.js`, `dmbtech1.js`, `build.py`, and `assets/`. In this workspace that is `/workspace/dfide/re/`. The standalone engine library also lives at `/workspace/dfide/dmbtech1/` (published at `/dystopia-project-moses/dmbtech1/`).
- **Built copy** (what you publish): running `python3 build.py` writes a playable site to the sibling folder `../retroengine/`. The live site is that built copy, hosted at [ddemby424.github.io/dystopia-project-moses/retroengine/](https://ddemby424.github.io/dystopia-project-moses/retroengine/).

`index.html` is the shell. Play mode is the standalone **DMB Tech 1** library in `dmbtech1.js` (`createEngine` / `createRuntime`). `app.js` is the 2D editor plus room templates and starter levels; it imports `dmbtech1.js`. three.js r128 is a peer dependency, loaded from a pinned CDN import map, the way a TI-89 program might call built-in graph commands instead of drawing every pixel itself.

## Source files

| Path | What it does |
|---|---|
| `index.html` | Open this to start. It sets the Three.js r128 import map, loads `styles.css` and `app.js` as a module, and draws the **DMB TECH 1** splash (title, stamp, credits, TAP TO BOOT). |
| `dmbtech1.js` | The **DMB Tech 1** engine: map loading, renderer, movement, weapons, enemies, pickups, doors, scripts, audio, touch, and aim assist. |
| `app.js` | The editor: room templates, starter levels, and the 2D map UI. It imports `createRuntime` from `./dmbtech1.js`. |
| `styles.css` | Editor look (the in-game HUD CSS is generated from inside `dmbtech1.js`). |
| `build.py` | Copies sources (including `dmbtech1.js` and `docs/tutorial/`) into `../retroengine/`, inlines help text into `app.js`, and writes the module launcher `retroengine.html`. |
| `help_content.html` | The manual chapters. Built into the app (Menu → Help) and into `help.html`. |
| `help_template.html` | The wrapper page used to make `help.html`. |
| `README.md` | User-facing overview. |
| `CHANGELOG.md` | Version history. Add a note here when you ship. |
| `CREDITS.md` | Licenses and author credits for models, music, code, and fonts. |
| `assets/models/` | Enemy and gun `.glb` files (CC0, by Quaternius). |
| `assets/music/` | Five `.mp3` tracks (CC BY 4.0). |
| `maps/` | Trial map pack: `.retro` files, `manifest.json`, `index.html`, and `shots/`. |
| `maps/README.md` | How to play the pack and how to rebuild the maps. |
| `tools/build_trial_maps.py` | Authoring script that rebuilds the three trial `.retro` files. Not copied to the published site. |
| `docs/tutorial/` | This tutorial. |

## Built files (after `build.py`)

| Path | What it does |
|---|---|
| `../retroengine/index.html` | Same starter page, ready to host. |
| `../retroengine/dmbtech1.js` | The standalone engine, same file the editor imports. |
| `../retroengine/app.js` | The editor, with the help manual baked in. |
| `../retroengine/retroengine.html` | A copy of `index.html` (a module launcher; it is no longer a fully inlined single file). |
| `../retroengine/retroengine.txt` | A copy of that launcher, same content. |
| `../retroengine/tutorial/` | This tutorial, copied from `docs/tutorial/`. |
| `../retroengine/help.html` | Standalone manual page. |
| `../retroengine/assets/` and `maps/` | Copied across (Python caches and `.py` files in `maps/` are skipped). |


## Models and music already in the pack

**Models** (`assets/models/`): `soldier_swat.glb`, `robot_flying_gun.glb`, `robot_legs_gun.glb`, `robot_large_gun.glb`, `gun_shotgun.glb`, `gun_rifle.glb`, `gun_scifi_rifle.glb`, `gun_rocket.glb`, and `gun_pistol.glb`. The pistol file is still in the folder; the default starting firearm is the procedural **Pulse Cannon** built in `buildWeaponMesh`, not loaded from that file. See Lesson 4.

**Music** (`assets/music/`): `metalmania.mp3`, `aggressor.mp3`, `lewis_and_dekalb.mp3`, `griphop.mp3`, `seismic.mp3`.

## 3D coordinates, in one breath

DMB Tech 1 stores the map as a 2D grid: `x` across, `y` depth. When it builds the 3D scene, map `x` becomes three.js `x`, map `y` becomes three.js `z`, and three.js `y` is **up** (height). One grid cell is 1 unit, about 2 meters. Eye height is the constant `EYE` (`0.62`) in `dmbtech1.js`, measured above the floor.

> **Do this now.** In Spck or Acode, open the source folder and tap `index.html`, `dmbtech1.js`, `app.js`, `assets/models/`, and `maps/`. Confirm you can see those names. You do not need to edit anything yet.

> **Payoff:** the project is no longer a mystery pile of files. Next lesson, you actually boot it.
