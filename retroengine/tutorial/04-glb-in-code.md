# Lesson 4 — Load and scale a GLB in code

**Time:** about 10 minutes
**Payoff:** you know the exact functions DMB Tech 1 uses, and you can point a slot at a new file.

A `.glb` is a 3D model in one file: the shape, the colors, and sometimes bones plus animations. DMB Tech 1 does not have a `registerModel()` function. It has **slots**. If a slot has a file, `loadGlb` fetches it, `normalizeModel` sizes it, and `attachModel` (or `buildGunFromGlb` for guns) swaps it in.

> **Compare:** on a TI-89 this is like loading a picture variable and then scaling it so it fits a window. In VB, think `LoadPicture` plus setting `Width` and `Top` so the graphic sits on a floor line.

## 1. Put the file in the right folder

Copy your `.glb` into the source folder:

```
assets/models/my_soldier.glb
```

Keep the name simple: letters, numbers, underscores. After you run `build.py`, the same file must exist in `../retroengine/assets/models/` or the hosted site will 404.

## 2. How DMB Tech 1 actually loads a GLB

These are the real functions from `dmbtech1.js`. Comments were added for this tutorial. Do not paste this block back into `dmbtech1.js` as a second copy — it is already there.

```javascript
// Cache: if two soldiers share one file, download it only once.
const glbCache = {};

// src is a path, a full URL, or a data: URL from an upload.
function loadGlb(src) {
  // No loader (or no path) → give back null, and the built-in mesh stays.
  if (!THREE.GLTFLoader || !src) return Promise.resolve(null);
  // First time we see this src, start a load and remember the Promise.
  if (!glbCache[src]) glbCache[src] = new Promise(res => {
    // Blender often embeds a sun light and a camera. If we kept them,
    // every enemy copy would add a bright light and blow the scene out.
    const strip = g => {
      const rm = [];
      g.scene.traverse(o => { if (o.isLight || o.isCamera) rm.push(o); });
      rm.forEach(o => o.parent && o.parent.remove(o));
      return g;
    };
    try {
      // GLTFLoader is three.js's reader for .glb / .gltf files.
      new THREE.GLTFLoader().load(
        src,
        g => res(strip(g)),               // success: strip lights, then keep it
        undefined,                        // no progress callback
        err => {                          // failure: warn, but do not crash
          console.warn('RetroEngine: model failed to load', String(src).slice(0, 80), err && err.message);
          res(null);
        }
      );
    } catch (e) { res(null); }
  });
  return glbCache[src];
}
```

## 3. How it is scaled and stood on the floor

`normalizeModel` uses a bounding box (`Box3`) — the smallest box that fits the mesh. It scales the model so its height matches the slot, centers it on X and Z, and lifts the lowest point to `y = 0` (the floor). Hovering enemies pass `centered = true` so they sit around their mid-point instead.

```javascript
function normalizeModel(scene, height, centered) {
  // holder is the object we add to the world; model is a clone of the file.
  const holder = new THREE.Group(), model = cloneSkinned(scene);
  holder.add(model);
  model.updateMatrixWorld(true);                 // bake current transforms
  const b = new THREE.Box3().setFromObject(model);
  if (b.isEmpty()) return null;                  // nothing to measure
  const size = b.getSize(new THREE.Vector3());
  const c = b.getCenter(new THREE.Vector3());
  // Scale so the model's height equals the slot height (spec.h or the enemy def).
  const s = height / Math.max(size.y, 1e-4);
  model.scale.multiplyScalar(s);
  // Center X/Z. If centered, also mid Y; otherwise sit the feet on y = 0.
  model.position.set(-c.x * s, centered ? -c.y * s : -b.min.y * s, -c.z * s);
  model.traverse(o => {
    if (o.isMesh) {
      o.frustumCulled = false;                   // never pop out at the screen edge
      if (o.material && o.material.map) o.material.map.encoding = THREE.sRGBEncoding;
    }
  });
  return holder;
}
```

Skinned (rigged) models must be cloned with `THREE.SkeletonUtils.clone`. A plain `.clone()` would make every soldier share one skeleton, so animating one would twitch all of them.

## 4. Point a built-in slot at your file

The built-in pack is the `ASSET_PACK` table in `dmbtech1.js`. Each key is a slot. `h` is the target height. `tint` darkens the colors. Guns use `len` (barrel length in world units), and sometimes `flip` or `off`.

```javascript
const ASSET_PACK = {
  // Soldiers use this file and are scaled to height 1.12.
  enemy_grunt: { src: 'assets/models/soldier_swat.glb', h: 1.12, tint: 0.72 },
  enemy_drone: { src: 'assets/models/robot_flying_gun.glb', h: 0.46, tint: 0.7 },
  enemy_heavy: { src: 'assets/models/robot_legs_gun.glb', h: 1.3, tint: 0.62 },
  enemy_titan: { src: 'assets/models/robot_large_gun.glb', h: 1.45, tint: 0.55 },
  // Weapons 2–5 (shotgun, rifle, plasma, rocket). Index matches WEAPON_DEFS.
  weapon_2: { src: 'assets/models/gun_shotgun.glb', len: 0.66 },
  weapon_3: { src: 'assets/models/gun_rifle.glb', len: 0.64 },
  weapon_4: { src: 'assets/models/gun_scifi_rifle.glb', len: 0.58 },
  weapon_5: { src: 'assets/models/gun_rocket.glb', len: 0.5, flip: true, off: [0.06, -0.05, 0.02] }
};
```

To use your soldier instead of the default one, change only the `src` (and `h` if the new mesh is taller or shorter than you want):

```javascript
// Was soldier_swat.glb. Now load your file from the same models folder.
enemy_grunt: { src: 'assets/models/my_soldier.glb', h: 1.12, tint: 0.72 },
```

The game builds the path as `assetBase + p.src`. When you open the app from a real web server, `assetBase` is usually `''`, so the path is just `assets/models/my_soldier.glb` next to `index.html`. If you open the page as `file://`, `assetBase` becomes `HOSTED_BASE` (the live GitHub Pages URL) so models can still load from the hosted copy.

## 5. Guns, and the default starting firearm

First-person guns that have an `ASSET_PACK` entry go through `buildGunFromGlb`: the longest axis is lined up with `-Z` (barrel away from the camera), then the gun is scaled to `spec.len`.

The default starting firearm is **not** a GLB. It is weapon index `1` (the second slot, after the wrench at index `0`). `WEAPON_DEFS[1]` is the **Pulse Cannon**. Its `id` is still `'pistol'` so existing maps and pickups stay compatible. There is no `weapon_1` entry in `ASSET_PACK`, so the first-person mesh comes from `buildWeaponMesh` — a compact procedural model (amber coils, rusted shroud, cyan muzzle flash) scaled with `inner.scale.setScalar(0.62)`. `assets/models/gun_pistol.glb` is still in the folder but is not loaded as the default.

```javascript
// WEAPON_DEFS[1] — the gun you start with. id stays 'pistol' for map compatibility.
{ id: 'pistol',  name: 'Pulse Cannon',    ammo: null,    cd: 0.13, dmg: 28, pellets: 1, spread: 0.008, auto: true, proj: 'pulse', speed: 22, recoil: 0.14, snd: 'pulse' },
```

`ammo: null` means infinite ammo (the HUD shows ∞). `proj: 'pulse'` fires a cyan bolt at speed 22. The fire sound is the synthesized `play('pulse')` sting (square 220→55 Hz plus saw 880→140 Hz). To put a GLB on this slot later, add a `weapon_1` row to `ASSET_PACK` and the loader will replace the procedural mesh. To retune the feel, change the numbers on that `WEAPON_DEFS` row (keep `MAG_SIZE[1]` at `0` while ammo is infinite).

Aim assist, look sensitivity, and movement knobs are in Lesson 10.

## 6. Registering a new enemy, weapon, or prop

There is no `registerEnemy()` API. The editor Things tab is built from the real tables:

- **Enemies:** add a key to `ENEMY_DEFS`. The Things tab lists `Object.keys(RT.ENEMY_DEFS)`. `buildEnemyMesh` already has shapes for `drone`, `titan`, `turret`; anything else uses the soldier / heavy body. Add `ASSET_PACK.enemy_yourkey` if you have a GLB. You may also add a row to `MODEL_SLOTS` if you want it in the Custom 3D models UI.
- **Props:** add a key to `PROP_DEFS`. `buildPropMesh` has a `switch` of named cases and a default crate-like box. Optional: `ASSET_PACK` is not used for every prop; custom props use the `prop_<key>` slot on the project (`attachModel(mesh, 'prop_' + e.s, ...)`).
- **Weapons:** `WEAPON_DEFS` ships with six entries, and the default HUD / number keys are built around those six. `MAG_SIZE` and `RELOAD_TIME` are parallel arrays. Pickup items such as `w_shotgun` give a weapon *index* (`give: { weapon: 2, shells: 8 }`). A third-party page can call `registerWeapon(def)` on the DMB Tech 1 engine (before `loadMap`) to append a slot. The safe first step inside the editor is still to retune an existing slot.

Unknown enemy types in a map file fall back to `grunt` (`e.s in ENEMY_DEFS ? e.s : 'grunt'`).

> **Do this now.** Add a dummy change you can see: set `enemy_titan` `tint` from `0.55` to `0.2` (much darker), save `dmbtech1.js`, refresh the preview, and Play a map that has a Titan (Nightwatch or Plant 4). Then change it back, or keep it if you like the look.

> **Payoff:** you have walked the real load path: file on disk → `ASSET_PACK` → `loadGlb` → `normalizeModel` → the 3D scene. That is how DMB Tech 1 brings a model into the world.
