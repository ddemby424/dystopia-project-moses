# Lesson 7 — Add keys, guards, and a boss

**Time:** about 10 minutes
**Payoff:** a locked door, a key, a few guards, and a Titan in front of the pad — and Check level says the exit is reachable.

## Doors and keycards

1. Leave a one-cell gap in a wall (or carve one with Floor / Erase).
2. Choose **Door** (D). In the Build tab, pick a door type: a plain door, or Red / Blue / Yellow keycard doors.
3. Tap the gap. The door texture follows the color (`door`, `door_red`, `door_blue`, `door_yellow`).

Plain doors open when you press **USE** / E, and enemies can open those too. Keycard doors need the matching key. The in-game message is `You need the RED keycard` (or BLUE / YELLOW). Enemies do **not** open keycard doors.

Place the key from Things → **Keys & goals**:

- `key_red` — Red Keycard
- `key_blue` — Blue Keycard
- `key_yellow` — Yellow Keycard

Put the key *before* the door on the path from the start. Menu → **Check level** flood-fills from the start, picks up keys as it reaches them, and errors if the exit is still unreachable (walls, missing keys, or stairs taller than `STEP_H`).

## Enemies (the real types)

Things → **Enemies**. The `s` value stored on the entity is the key in `ENEMY_DEFS`:

| Things name | Key (`s`) | Role (Normal difficulty) |
|---|---|---|
| Soldier | `grunt` | HP 45, speed 1.7, rifle-like bolt, flanks and calls allies. |
| Gun Drone | `drone` | HP 25, faster, hovers (`hover: 0.62`). |
| Heavy Walker | `heavy` | HP 120, slow, 3-shot bursts. |
| Sentry Turret | `turret` | HP 70, `speed: 0`, long range, rapid fire. Does not move. |
| Titan (Boss) | `titan` | HP 650, fires rockets, big radius, score 2000. Does not flank. |

Difficulty (Easy / Normal / Hard in Game settings) multiplies health, damage, speed, fire cooldown, reaction time, and the chance an enemy is a flanker (`DIFF` in `app.js`).

Place 2–3 Soldiers in the first room, not on top of the start. Face them by selecting the enemy and rotating it in the inspector (or place, then nudge). Leave cover: crates and sandbags (`PROP_DEFS`) block movement; barrels explode.

## A boss at the pad

1. At the end of the route, open a last room around the Exit pad.
2. Place **Titan (Boss)** on or just in front of the pad.
3. Put a **Rocket Launcher** (`w_rocket`) and **Rockets** (`ammo_rockets`) where the player will find them *before* the fight, plus a **Medkit** or **Heavy Armor**. This is how the trial maps are built.

The trial pack maps are good references: Plant 4: Lockdown (22 enemies, blue and red keys), Drainworks: Overflow (25 enemies, three keys), Nightwatch: Helipad (21 enemies). Play them from the [map pack page](https://ddemby424.github.io/dystopia-project-moses/retroengine/maps/), then Menu → the imported level sits in your project so you can inspect it. (Pack maps keep their scripts on. A `.retro` you import from a file has its script switched off until you review it — Lesson 8 and 13.)

> **Do this now.** On the map from Lesson 6, add a yellow door in the middle, a Yellow Keycard before it, two Soldiers, one Titan by the pad, and a rocket pickup just before the Titan. Menu → **Check level**. Fix any red errors. Then Play.

> **Payoff:** you can grab the key, open the door, fight, and step on the pad. That is a complete escape-pad map.
