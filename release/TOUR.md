# Editing the yard on a phone

You only need this folder. The big game stays in the parent directory and is shared, not copied.

1. Serve the repo (`python3 -m http.server`) and open `release/index.html`. Do not use a `file://` link.
2. Open `maps/yard.json`.
   - `spawn` is where a new visit to Floor G stands.
   - `routes[0]` is the wide west dock. Its walk line is x = -12.5. It has no shutter.
   - `routes[1]` is the narrow east airlock. Its walk line is x = 14. `shutter` blocks that line until the player stands on `scanner`.
   - `mouth` is the gap in the factory's south wall. `inner` is the gap in the hall wall at z ≈ 47.
   - `fence.gate` is the south exit. It stays shut until the campaign win.
   - `props` is the kit. `block: true` means you bump it. `vista: true` means it is scenery outside the fence and has no collision.
3. A prop row looks like `{ "kit": "factory", "id": "box-large", "x": -24, "z": 124, "rot": 0.2, "scale": 2.3, "block": true }`.
   - `kit` is `factory` or `city`.
   - `id` is the file name in `assets/kenney-factory/` or `assets/kenney-city/` without `.glb`.
   - Do not park a blocking prop on x = -12.5 or x = 14 between z = 42 and z = 130, or you seal a route.
4. Reload the page. If a GLB 404s, that spot becomes a plain box and the route still exists.
5. Logic, if you need it:
   - `js/yard.js` carves the gaps and spawns the two wardens.
   - `js/fence.js` is the shock fence and the gate.
   - `js/campaign.js` is save / win / reset.
   - `js/victory.js` is the epilogue, not the startup trailer.
   - `js/boot.js` is the only place that reaches into `game.js`.

Licenses: `licenses/ATTRIBUTION.md`. Both kits are Kenney, CC0.
