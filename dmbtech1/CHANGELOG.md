# Changelog

## 1.0.0 (2026-11-23)

First standalone release of **DMB Tech 1**.

The 3D first-person runtime that already powered RetroEngine 1.1.0 (map loading, renderer, movement, weapons, enemies, pickups, keys and doors, exit pads, level scripts, audio, touch controls, and aim assist) is now a documented ES module that other developers can use without the RetroEngine editor.

- `dmbtech1.js` exports `VERSION` (`'1.0.0'`), `createEngine()`, `createRuntime()`, and the `DMBTech1` namespace.
- Three.js r128 is a peer dependency, loaded from a pinned CDN import map. It is not bundled.
- Works in a plain browser with no build step (Spck / Acode friendly).
- Examples: minimal playable game, custom weapon, and level-script events/api.
- License: MIT, copyright Darcy D. Demby / DembySoftwareSystems.

RetroEngine 1.1.1 now imports this library for play mode instead of keeping a private copy of the runtime.
