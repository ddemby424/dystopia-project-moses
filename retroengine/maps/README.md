# RetroEngine Trial Map Pack 1

Three full-size escape-pad maps for early trial users of RetroEngine.

| Map | File | Theme |
| --- | --- | --- |
| Plant 4: Lockdown | `plant4-lockdown.retro` | Factory at dusk. Keycards through yard, warehouse and assembly, Titan on the loading-dock pad. |
| Drainworks: Overflow | `drainworks-overflow.retro` | Sewer tunnels and a toxic cistern. Three gate keys, Titan in the settling tank. |
| Nightwatch: Helipad | `nightwatch-helipad.retro` | Night city roofs and a skybridge. Climb the block, take the helipad from the Titan. |

Each map is beatable: the exit pad is reachable from the start once you have the keys, stairs are stepable, and ammo, health and a rocket launcher sit in front of the boss.

## Play

Open `index.html` in this folder (or Menu → Trial map pack in the editor). Tap **Play** to load the map in RetroEngine. On a phone, after the DMB TECH splash, tap again to start.

You can also download a `.retro` file and import it with **Menu → Import level**.

Pack links look like `../index.html#pack=maps/plant4-lockdown.retro`. Those hashes only load files from the `maps/` or `packs/` folder on the same site.

## Rebuild

From the RetroEngine source folder:

```
python3 tools/build_trial_maps.py
```

Darcy D. Demby, Chief Software Architect — DembySoftwareSystems — Making cool tools with AI...
Created November 23, 2026.
