# DYSTOPIA release v2 — credits

This folder is the `/release-v2/` visual rewrite. It does not replace the root game, `/release/`, `/release-next/`, or `/release-warehouse/`.

Gameplay, controls, the yard routes, the electrified fence, the victory film, and the four secret rooms are the single-player campaign. The look is new.

## Surfaces

Poly Haven CC0 maps already shipped in `release-next/assets/real/` (concrete, asphalt, corrugated iron, rusted metal, metal plate, plus the abandoned-workshop HDRI used only as image-based light on desktop). License: https://polyhaven.com/license (CC0).

`release-v2/assets/surf/` bakes those albedos into 1024 WebP: hall floor (concrete, bay lines, hazard band, oil grime), hall wall (worn plate and corrugation, girts, rivets), and yard asphalt (cracks and oil). The painted marks are original. Touch devices load albedo only.

## Guards and the Sentinel

All three are CC BY 4.0. Textures are WebP at 1024. The two guards are unquantized so three.js r128 can skin them. The Sentinel file is the meshopt build.

| File | Work | Author | Triangles | Use |
| --- | --- | --- | --- | --- |
| `robot.glb` | [Robot](https://sketchfab.com/3d-models/robot-93c9ff1cac014cc382e8666c873cdd70) | DJMaesen | about 9.3k | Common guards. The single `Anims` clip is sliced into idle, walk, run, punch, and death. |
| `biped_robot.glb` | [Biped robot](https://sketchfab.com/3d-models/biped-robot-801d2a245e4a4405a0c2152b35b5e486) | Willy Decarpentrie | about 16.6k | Heavy guards. `Robot_Soldat` is one cycle, reused at different speeds. |
| `military_mech.glb` | [military Mech](https://sketchfab.com/3d-models/military-mech-49c464a639d34c97b20032a5018c6a04) | Doaa Sheha | about 27.5k | The Sentinel, scaled to about 28 m. The mesh is not rigged. A bone rig stomps, aims the attachment, and flashes a red eye. It still speaks “YOU ARE SAFE. YOU ARE LOVED. RETURN TO YOUR POD.” |

## Yard

Crate, crane, and skyline shapes are original boxes on the Poly Haven materials, with lit window strips on the skyline. Cover collision is a box on each former kit prop. The Kenney GLBs are not downloaded.

## Film and project

The epilogue still plays `release-next/media/victory.webm`. Project credits for Darcy D. Demby, the story, and the shared audio stay in the in-game credits screen.
