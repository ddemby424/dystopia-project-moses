# RetroEngine Trial Map Pack 1

Six maps for early trial users of RetroEngine: four escape-pad campaigns, one 128×128 multiplayer compound, and a marble minotaur shrine.

| Map | File | Theme |
| --- | --- | --- |
| Plant 4: Lockdown | `plant4-lockdown.retro` | Factory at dusk. Keycards through yard, warehouse and assembly, Titan on the loading-dock pad. |
| Drainworks: Overflow | `drainworks-overflow.retro` | Sewer tunnels and a toxic cistern. Three gate keys, Titan in the settling tank. |
| Nightwatch: Helipad | `nightwatch-helipad.retro` | Night city roofs and a skybridge. Climb the block, take the helipad from the Titan. |
| Cellblock Yard | `cellblock-yard.retro` | Outdoor prison yard / secured compound. Sidewalks, curbs, chain-link and brick, towers and a sniper catwalk, Titan in the sally port. |
| Site 12: Dataworks | `site12-dataworks.retro` | 128×128 factory and data-center compound. Outdoor yard, indoor halls, raised catwalks, clean bright lab wing, eight spread-out spawns, and a single-player fight with stock Heavy Walkers, Gun Drones and other built-in enemies (disabled in multiplayer rooms). Music: Industrial Revolution (Kevin MacLeod, CC BY 4.0). |
| The Marble Shrine | `marble-shrine.retro` | 80×96 white-marble shrine. Tall stair to a high plaza, sunken pool and throne. Single-player: clear stock minions, then a minotaur boss rises from the throne (warp and palm shot). Eight spawns; in shared rooms minion bots stay off and the host drives the boss. Music: Crypto (Kevin MacLeod, CC BY 4.0). |

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
