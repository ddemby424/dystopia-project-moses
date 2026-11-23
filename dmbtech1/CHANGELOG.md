# Changelog

## 1.0.1 (2026-11-23)

Outdoor textures for yards, aprons, and secured compounds (procedural, so they ship with the engine):

- `sidewalk` — worn concrete slabs with seams, cracks, and oil stains
- `curb` — a concrete lip with a faded painted edge (raise the cell to `0.15`)
- `fence` — chain-link with razor wire, see-through via an alpha-tested material
- `brick_weathered` — outdoor red brick, chipped mortar, dirt streaks
- `asphalt_lines` — asphalt with worn white and yellow painted lines

These ids are available as wall and/or floor textures in the editor palette and in the `.retro` format. The older `brick` and `asphalt` textures are unchanged.


## 1.0.0 (2026-11-23)

First standalone release of **DMB Tech 1**.

The 3D first-person runtime that already powered RetroEngine 1.1.0 (map loading, renderer, movement, weapons, enemies, pickups, keys and doors, exit pads, level scripts, audio, touch controls, and aim assist) is now a documented ES module that other developers can use without the RetroEngine editor.

- `dmbtech1.js` exports `VERSION` (`'1.0.0'`), `createEngine()`, `createRuntime()`, and the `DMBTech1` namespace.
- Three.js r128 is a peer dependency, loaded from a pinned CDN import map. It is not bundled.
- Works in a plain browser with no build step (Spck / Acode friendly).
- Examples: minimal playable game, custom weapon, and level-script events/api.
- License: MIT, copyright Darcy D. Demby / DembySoftwareSystems.

RetroEngine 1.1.1 now imports this library for play mode instead of keeping a private copy of the runtime.
