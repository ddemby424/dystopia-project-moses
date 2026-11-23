# Lesson 1 — Tour the project folders

**Time:** about 5 minutes
**Payoff:** you can point at every important file and say what it does.

RetroEngine has two folders that matter. Think of them like a TI-89 program you edit, and the "compiled" copy you actually run.

- **Source** (the folder you edit): the directory that contains `app.js`, `build.py`, and `assets/`. In this workspace that is `/workspace/dfide/re/`.
- **Built copy** (what you publish): running `python3 build.py` writes a playable site to the sibling folder `../retroengine/`. The live site is that built copy, hosted at [ddemby424.github.io/dystopia-project-moses/retroengine/](https://ddemby424.github.io/dystopia-project-moses/retroengine/).

`index.html` is the shell. `app.js` is almost the whole product: the **DMB Tech 1** runtime (the function `DFRuntime`) plus the 2D editor. There is not a separate `dmbtech1.js` file yet. three.js r128 is the 3D library loaded from a CDN, the way a TI-89 program might call built-in graph commands instead of drawing every pixel itself.

## Source files

| Path | What it does |
|---|---|
| `index.html` | Open this to start. It loads the font, three.js r128, `GLTFLoader.js`, `SkeletonUtils.js`, `styles.css`, and `app.js`. It also draws the **DMB TECH 1** splash (title, stamp, credits, TAP TO BOOT). |
| `app.js` | The engine and the editor. Section 1 is `DFRuntime` (the game). Section 2 is room templates and starter levels. Section 3 is the editor UI. |
| `styles.css` | Editor look (the in-game HUD CSS is also generated from inside `app.js`). |
| `build.py` | Copies sources into `../retroengine/`, inlines help text into `app.js`, and builds the single-file `retroengine.html`. |
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
| `../retroengine/app.js` | Same engine, with the help manual baked in. |
| `../retroengine/retroengine.html` | The whole app as **one file**, handy to send or open offline. |
| `../retroengine/retroengine.txt` | A copy of that single file, same content. |
| `../retroengine/help.html` | Standalone manual page. |
| `../retroengine/assets/` and `maps/` | Copied across (Python caches and `.py` files in `maps/` are skipped). |

> **Note:** `build.py` currently copies `styles.css`, `index.html`, `README.md`, `CHANGELOG.md`, `CREDITS.md`, `assets/`, and `maps/`. It does **not** yet copy `docs/tutorial/`. To put this tutorial on the live site, copy this folder into the published `retroengine/docs/tutorial/` directory (or add that copy step to `build.py` later).

## Models and music already in the pack

**Models** (`assets/models/`): `soldier_swat.glb`, `robot_flying_gun.glb`, `robot_legs_gun.glb`, `robot_large_gun.glb`, `gun_shotgun.glb`, `gun_rifle.glb`, `gun_scifi_rifle.glb`, `gun_rocket.glb`, and `gun_pistol.glb`. The pistol file is still in the folder; the default starting firearm is the procedural **Pulse Cannon** built in `buildWeaponMesh`, not loaded from that file. See Lesson 4.

**Music** (`assets/music/`): `metalmania.mp3`, `aggressor.mp3`, `lewis_and_dekalb.mp3`, `griphop.mp3`, `seismic.mp3`.

## 3D coordinates, in one breath

DMB Tech 1 stores the map as a 2D grid: `x` across, `y` depth. When it builds the 3D scene, map `x` becomes three.js `x`, map `y` becomes three.js `z`, and three.js `y` is **up** (height). One grid cell is 1 unit, about 2 meters. Eye height is the constant `EYE` (`0.62`) above the floor.

> **Do this now.** In Spck or Acode, open the source folder and tap `index.html`, `app.js`, `assets/models/`, and `maps/`. Confirm you can see those names. You do not need to edit anything yet.

> **Payoff:** the project is no longer a mystery pile of files. Next lesson, you actually boot it.
