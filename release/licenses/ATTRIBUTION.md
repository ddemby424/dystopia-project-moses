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

## Already in the legacy game (unchanged, still used)

See `../CREDITS.md` for Kevin MacLeod music (CC BY 4.0), Poly Haven / ambientCG / Poly Pizza props, fonts, and the startup trailer. The candidate does not duplicate those files. The victory epilogue is a new capture; it is not `media/dystopia_trailer_720p.mp4`.
