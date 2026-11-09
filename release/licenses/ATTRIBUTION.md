# Yard kit — license ledger

These files are used by the single-player release candidate (`release/`).
They are modular pieces we placed ourselves. They are not a preassembled
game map, and nothing here was ripped from a commercial title.

| Kit | Author | License | Source page | What we ship | Modifications |
|---|---|---|---|---|---|
| Factory Kit 3.0 | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/factory-kit | `release/assets/kenney-factory/*.glb` (27 of the pack's GLBs: floors, walls, doorways, boxes, conveyors, pipes, crane, machines, warnings, screens) | No mesh edits. Uniform scale and rotation at placement time in `release/maps/yard.json`. |
| City Kit (Industrial) | Kenney (www.kenney.nl) | CC0 1.0 | https://kenney.nl/assets/city-kit-industrial | `release/assets/kenney-city/*.glb` (5 buildings, 3 containers, tank, chimney, water tower, solar panel) | No mesh edits. Buildings and the tower are scaled up as distant vista outside the fence. |

Full license texts copied from the packs:

- `kenney-factory-kit-license.txt`
- `kenney-city-kit-industrial-license.txt`
- CC0 legal text: https://creativecommons.org/publicdomain/zero/1.0/

CC0 does not require credit. Credit is recorded because the project keeps a ledger.

## Not a finished map download

Kenney's Factory Kit is a **modular environment kit** (walls, door frames, conveyors, pipes, crates). City Kit (Industrial) is a **set of exterior building shells**, not a playable level. The yard layout — two door lanes, the fence rectangle, the gate — is authored in `release/maps/yard.json`. A giant preassembled map was rejected: the ones that fit the fiction were either the wrong license, too heavy for a phone, or both.

## Realistic surface pass (CC0 photographs)

These are tiled color maps on the existing hall geometry, the yard ground, the fence posts, and the enemy armor. They are not a new level mesh. Normals were left off so the set stays small on a phone. Each file is a 1024² WebP made from the Poly Haven 1K JPG.

| File | Poly Haven id | License | Page | Bytes (webp) |
|---|---|---|---|---|
| `release/assets/real/concrete.webp` | concrete_floor_worn_001 | CC0 | https://polyhaven.com/a/concrete_floor_worn_001 | interior floors |
| `release/assets/real/asphalt.webp` | asphalt_02 | CC0 | https://polyhaven.com/a/asphalt_02 | yard ground and south apron |
| `release/assets/real/wall.webp` | concrete_wall_004 | CC0 | https://polyhaven.com/a/concrete_wall_004 | interior walls and the factory shell |
| `release/assets/real/siding.webp` | corrugated_iron | CC0 | https://polyhaven.com/a/corrugated_iron | distant yard buildings |
| `release/assets/real/rust.webp` | rusty_metal_02 | CC0 | https://polyhaven.com/a/rusty_metal_02 | yard props, guards |
| `release/assets/real/plate.webp` | metal_plate_02 | CC0 | https://polyhaven.com/a/metal_plate_02 | fence posts, heavies, Colossus, drones |

Poly Haven license: https://polyhaven.com/license (CC0). No account, no Meshy, no paid scan.

 The secret-panel crack is drawn in code. It is not a downloaded texture.

## Guard and heavy motion (CC0)

Guards and heavies in the candidate use one shared rig, cloned per bot. It is the three.js example robot `RobotExpressive` (already in this repo as `robot/models/robot_trooper.glb`). Clips used: Idle, Walking, Running, Punch, Death. The file is 463,988 bytes. No extra download.

| File | Asset | Author | License | Source |
|---|---|---|---|---|
| `robot/models/robot_trooper.glb` | RobotExpressive | Tomás Laulhé / Quaternius, glTF edits by Don McCurdy | CC0 1.0 | https://github.com/mrdoob/three.js/tree/r128/examples/models/gltf/RobotExpressive |

CC0 does not require credit. The armor color is the Poly Haven rust or plate map above, applied only to meshes that had no texture of their own. The Colossus keeps its existing skeleton so the weak points stay on the bones. Its walk clip pauses when the body is still. Drones keep the CC BY Bot Drone shell already credited in `CREDITS.md`.

## Already in the legacy game (unchanged, still used)

See `../CREDITS.md` for Kevin MacLeod music (CC BY 4.0), Poly Haven / ambientCG / Poly Pizza props, fonts, and the startup trailer. The candidate does not duplicate those files. The victory epilogue is a new capture; it is not `media/dystopia_trailer_720p.mp4`.
