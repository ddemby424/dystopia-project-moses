# DMB Tech 1

**DMB Tech 1** is a standalone 3D first-person engine that runs in the browser. Other developers can load a `.retro` map, move, shoot, and hook events without using the RetroEngine editor.

Version **1.0.2**. Plain browser, no build step — works in Spck, Acode, and a local static server.

DMB Tech 1 — Darcy D. Demby, Chief Software Architect, DembySoftwareSystems. Making cool tools with AI...

## Quick start

Serve this folder over HTTP (modules will not load from `file://`). Then open a page like this:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/"
    }
  }
  </script>
  <style>html,body,#game{margin:0;height:100%;background:#000}</style>
</head>
<body>
  <div id="game"></div>
  <script type="module">
    import { createEngine } from './dmbtech1.js';
    const engine = createEngine('#game', { assets: false });
    await engine.loadMap('./maps/tiny-arena.retro');
    engine.start();
  </script>
</body>
</html>
```

`assets: false` uses the built-in procedural meshes and synthesized sounds, so you do not need a model pack to try the engine. To use the official CC0 character and gun models, point `assetBase` at a folder that contains `assets/models/` and `assets/music/` (the RetroEngine asset pack) and omit `assets: false`.

## Import map (required)

Three.js r128 is a **peer dependency**. Do not bundle it. Pin this import map in every page that loads `dmbtech1.js`:

```json
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/"
  }
}
```

The trailing slash on `three/addons/` is required. Keep r128 — later Three.js releases change material and color APIs this engine still uses.

## Public API

```js
import { createEngine, createRuntime, VERSION, DMBTech1 } from './dmbtech1.js';
```

`VERSION` is `'1.0.0'`. `DMBTech1` is a namespace object with the same functions.

### `createEngine(container, options)` → engine

`container` is a DOM element, a CSS selector, or a `<canvas>` (the engine wraps a canvas in a div). Options:

| Option | Meaning |
|---|---|
| `assets` | `false` to skip `.glb` / music fetches and use procedural fallbacks. Default true. |
| `assetBase` | Prefix for `assets/models/...` and `assets/music/...` (a URL or relative path). |
| `settings` | Object merged into saved settings (`sens`, `aimAssist`, `volume`, …). |
| `difficulty` | `'easy'`, `'normal'`, or `'hard'`. |
| `sens`, `aimAssist`, `aimAssistMouse`, `volume` | Shorthand for common settings. |

Returned methods:

| Method | What it does |
|---|---|
| `loadMap(jsonOrUrl)` | `await` this. Accepts a `.retro` URL/path, a JSON string, or a parsed object. |
| `start()` | Begin play (skips the start menu). |
| `pause()` / `resume()` | Pause or resume the simulation. |
| `stop()` / `dispose()` | Tear down the running game and free WebGL. |
| `on(event, fn)` | Listen for level events. Returns an unsubscribe function. Register listeners before `loadMap` so you do not miss `start`. |
| `setOption(key, value)` | Set a setting (`sens`, `aimAssist`, `volume`, …). Also accepts an object. |
| `registerWeapon(def)` | Add or update a weapon. Returns its slot index. Call this before `loadMap`. |
| `registerEnemy(def)` | Add or update an enemy type (`def.id` is required). Call this before `loadMap`. |
| `shoot()` | Fire the current weapon (useful in tests). |
| `packLevel(level)` / `unpackLevel(obj)` | `.retro` helpers. |

Useful getters: `engine.state`, `engine.game` (live world after `start`), `engine.api` (the same object a level script receives), `engine.VERSION`.

### `createRuntime()`

Low-level factory used by RetroEngine's editor. Returns the internal runtime (`play`, `boot`, `WEAPON_DEFS`, `newLevel`, `validateLevel`, …). Most third-party apps should use `createEngine` instead.

## Events

Fired on both the map's `props.script` (`api.on`) and `engine.on`:

| Event | Argument |
|---|---|
| `start` | — when the level begins |
| `tick` | `dt` in seconds, every frame |
| `kill` | enemy type string (for example `'grunt'`) |
| `pickup` | pickup type string |
| `door` | — a door opened |
| `use` | `{ x, y }` of the used cell |
| `exit` | — the player reached an exit pad |

## Level-script `api`

A map may include JavaScript in `props.script`. It receives one argument, `api`:

- `api.on(event, fn)`
- `api.message(text)` — on-screen note
- `api.player` — `{ x, y, hp, armor, keys }`
- `api.heal(n)` / `api.giveArmor(n)` / `api.giveAmmo(type, n)`
- `api.openDoor(x, y)`
- `api.enemiesLeft()` / `api.kills()` / `api.time()`
- `api.win()` / `api.sound(name)`

Treat a script you did not write as untrusted. RetroEngine's editor turns imported scripts off until you review them; `createEngine` runs scripts that are already on the map you loaded.

## `.retro` map format

A `.retro` file is JSON:

```json
{
  "format": "retroengine-level",
  "version": 1,
  "app": "DMB Tech 1 1.0.0",
  "level": {
    "name": "Tiny Arena",
    "w": 16, "h": 16,
    "ents": [ { "t": "enemy", "s": "grunt", "x": 10.5, "y": 8.5 } ],
    "spawn": { "x": 3.5, "y": 3.5, "r": 0 },
    "props": { "sky": "night", "wallH": 1.5, "script": "" }
  },
  "grid": {
    "wall":  [ ],
    "kind":  [],
    "floor": [],
    "ceil":  [],
    "fh":    []
  }
}
```

- Map size is 8–128 cells on each side.
- `grid.*` arrays are run-length encoded as `[value]` or `[value, count]`, in row-major order, length `w * h`.
- `wall` is a texture name or `""` (open). `kind` holds door types (`door`, `red`, `blue`, `yellow`). `fh` is floor height.
- Entity `t` is one of `enemy`, `pickup`, `prop`, `light`, `exit`. `s` is the subtype (`grunt`, `medkit`, …). Positions are in cells, often `x + 0.5`.
- `props.script`, if present, is the level-script source.

You can also pass a project-shaped object `{ name, levels: [ rawLevel, ... ], models }` to `loadMap`.

## Weapon and enemy definitions

`registerWeapon(def)` fields (defaults in parentheses):

`id`, `name`, `ammo` (`null` = infinite, or `'bullets'|'shells'|'cells'|'rockets'`), `cd` (0.2), `dmg` (12), `pellets` (1), `spread` (0.02), `auto` (false), `proj` (omit for hitscan, or `'pulse'|'plasma'|'rocket'`), `speed`, `splash`, `recoil`, `snd` (sound name), `mag`, `reload`.

Custom slots get a simple procedural viewmodel. Call `registerWeapon` before `loadMap` so the HUD and meshes include the new slot.

`registerEnemy(def)` fields: `id` (required), `name`, `hp`, `speed`, `range`, `dmg`, `cd`, `shots`, `h` (height), `r` (radius), `score`, `proj`, `hover`.

## Controls and aim assist

| | Keyboard / mouse | Touch |
|---|---|---|
| Move | WASD (Shift = run) | Left-side joystick |
| Look | Mouse (click to lock) | Drag on the right side |
| Jump | Space | JUMP button |
| Fire | Mouse button | FIRE button (drag on it to look) |
| Use | E | USE |

Settings (`setOption` or `options.settings`):

- `sens` — look sensitivity (default 1.25)
- `aimAssist` — 0–1, default 0.80. Light shot magnetism toward the nearest visible enemy in a tight cone (`0.08 × strength` radians, 28-cell range). **On for touch** when the value is above 0.
- `aimAssistMouse` — also apply assist on mouse; default `false`
- `invertY`, `fov`, `volume`, `music`, `showFps`, `difficulty`

## Examples

- [examples/minimal/](examples/minimal/) — smallest playable game
- [examples/custom-weapon/](examples/custom-weapon/) — `registerWeapon`
- [examples/level-script/](examples/level-script/) — map script + `engine.on`


## Outdoor textures (1.0.1)

Procedural, included in the engine (no extra files). Gritty yard / apron / compound surfaces:

| Id | Use as | Notes |
|---|---|---|
| `sidewalk` | Floor or wall | Concrete slabs, seams, cracks, oil stains |
| `curb` | Floor or wall | Concrete lip. Raise the cell (`fh = 0.15`) so it reads as a curb |
| `asphalt_lines` | Floor | Asphalt with worn painted lines |
| `fence` | Wall | Chain-link and razor wire. See-through (alpha-tested, double-sided) |
| `brick_weathered` | Wall or floor | Outdoor red brick, distinct from the older `brick` ("Grimy Brick") |

The older `brick` and `asphalt` ids are unchanged. Listings live in `WALL_TEXTURES` and `FLOOR_TEXTURES` inside `dmbtech1.js`.

## License and credits

Engine code is **MIT**. Copyright (c) 2026 Darcy D. Demby / DembySoftwareSystems. See [LICENSE](LICENSE).

Bundled 3D characters and guns (when you use the official asset pack) are by **Quaternius**, CC0. Music in that pack is CC BY 4.0 (Kevin MacLeod, Shane Ivers). Procedural textures, props, and synthesized sound effects are original.

DMB Tech 1 — Darcy D. Demby, Chief Software Architect, DembySoftwareSystems. Making cool tools with AI...
