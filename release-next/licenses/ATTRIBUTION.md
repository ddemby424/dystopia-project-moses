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

Kenney's Factory Kit is a **modular environment kit** (walls, door frames, conveyors, pipes, crates). City Kit (Industrial) is a **set of exterior building shells**, not a playable level. The yard layout — two door lanes, the fence rectangle, the gate — is authored in `release-next/maps/yard.json`. A giant preassembled map was rejected: the ones that fit the fiction were either the wrong license, too heavy for a phone, or both.

## Realistic surface pass (CC0 PBR + HDRI)

Used only by the preview at `release-next/`. Tiled Poly Haven 1K maps, compressed to WebP. Color is sRGB. Normal and roughness stay linear. The ceiling reuses the concrete-wall maps, tinted darker, so it does not add another download. The HDRI is image-based light only. It is not the skybox. Poly Haven license: https://polyhaven.com/license (CC0).

| File | Poly Haven id | Maps | Where |
|---|---|---|---|
| `concrete.webp` + `concrete_floor_worn_001_nor.webp` + `concrete_floor_worn_001_rough.webp` | concrete_floor_worn_001 | color, normal, roughness | interior floors, every floor |
| `asphalt.webp` + `asphalt_02_nor.webp` + `asphalt_02_rough.webp` | asphalt_02 | color, normal, roughness | yard ground |
| `wall.webp` + `concrete_wall_004_nor.webp` + `concrete_wall_004_rough.webp` | concrete_wall_004 | color, normal, roughness | interior walls, corridors, Server Hall G, the factory shell, and the ceiling |
| `siding.webp` + `corrugated_iron_nor.webp` + `corrugated_iron_rough.webp` | corrugated_iron | color, normal, roughness | distant yard buildings and the factory facade shells |
| `rust.webp` + `rusty_metal_02_nor.webp` + `rusty_metal_02_rough.webp` | rusty_metal_02 | color, normal, roughness | yard kit pieces, guard armor |
| `plate.webp` + `metal_plate_02_nor.webp` + `metal_plate_02_rough.webp` | metal_plate_02 | color, normal, roughness | fence posts, cold fence rails, heavies, drones, Colossus flat parts |
| `workshop.hdr` | abandoned_workshop (1k) | HDRI | https://polyhaven.com/a/abandoned_workshop — lighting only |

Source pages: https://polyhaven.com/a/concrete_floor_worn_001 , https://polyhaven.com/a/asphalt_02 , https://polyhaven.com/a/concrete_wall_004 , https://polyhaven.com/a/corrugated_iron , https://polyhaven.com/a/rusty_metal_02 , https://polyhaven.com/a/metal_plate_02 , https://polyhaven.com/a/abandoned_workshop .

Live fence rails stay the cyan warning so the hazard is still readable. Textured Colossus and Bot Drone meshes keep their own color maps and pick up the HDRI through roughness and metalness. The Bot Drone credit stays in `../CREDITS.md` (Dave404, CC BY 3.0).

The secret-panel crack is drawn in code. It is not a downloaded texture.

## Enemies

Guards and heavies use RobotExpressive (below). A more realistic CC0 infantry rig was checked and not shipped: Grab3D "Soldier" (https://grab3d.com/models/characters/soldier/, CC0) is about 13 MB and 400,000 triangles for the light rigged file, which is larger than the whole current factory frame. Quaternius's CC0 soldier (https://poly.pizza/m/PpLF4rt4ah) is a stylized low-poly figure, not a realistic person. Mixamo files were not downloaded: that site needs an Adobe login, and this pass does not ship assets that could not be fetched and checked. Sketchfab soldier listings that look realistic were either low-poly, missing a redistribution license on the page, or both.

## Guard and heavy motion (CC0)

Guards and heavies in the candidate use one shared rig, cloned per bot. It is the three.js example robot `RobotExpressive` (already in this repo as `robot/models/robot_trooper.glb`). Clips used: Idle, Walking, Running, Punch, Death. The file is 463,988 bytes. No extra download.

| File | Asset | Author | License | Source |
|---|---|---|---|---|
| `robot/models/robot_trooper.glb` | RobotExpressive | Tomás Laulhé / Quaternius, glTF edits by Don McCurdy | CC0 1.0 | https://github.com/mrdoob/three.js/tree/r128/examples/models/gltf/RobotExpressive |

CC0 does not require credit. The armor color is the Poly Haven rust or plate map above, applied only to meshes that had no texture of their own. The Colossus keeps its existing skeleton so the weak points stay on the bones. Its walk clip pauses when the body is still. Drones keep the CC BY Bot Drone shell already credited in `CREDITS.md`.

## Already in the legacy game (unchanged, still used)

See `../CREDITS.md` for Kevin MacLeod music (CC BY 4.0), Poly Haven / ambientCG / Poly Pizza props, fonts, and the startup trailer. The candidate does not duplicate those files. The victory epilogue is a new capture; it is not `media/dystopia_trailer_720p.mp4`.
