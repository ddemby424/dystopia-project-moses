# Lesson 3 — Add a 3D model with no code

**Time:** about 5 minutes
**Payoff:** a soldier or crate that uses *your* `.glb` after one Playtest.

You do not have to touch `app.js` to try a custom model. The editor has slots for this.

## Where the slots live

1. In the editor, open the **Project** tab (the right-hand panel, or the Panel button on a phone).
2. Find **Custom 3D models (.glb)**.

These are the real slot names in `MODEL_SLOTS` inside `app.js`:

| Slot key | What you see in the UI |
|---|---|
| `enemy_grunt` | Soldier |
| `enemy_drone` | Gun Drone |
| `enemy_heavy` | Heavy Walker |
| `enemy_turret` | Sentry Turret |
| `enemy_titan` | Titan boss |
| `prop_crate` | Crate |
| `prop_barrel` | Barrel |
| `prop_server` | Server rack |
| `prop_desk` | Desk |
| `prop_terminal` | Terminal |
| `prop_pillar` | Pillar |
| `prop_generator` | Generator |

Each row has **File**, **URL**, and a clear button if a custom model is already set. There is also **Use Dystopia pack (online)** (fills several slots with models from the hosted DYSTOPIA folder) and **All built-in** (clears them).

## Rules the code actually enforces

- Uploads are stored *inside the project* (as a data URL), so they count against browser storage.
- The UI note says keep files small, **under about 2 MB**.
- The file picker **rejects files over 6 MB** (`if (f.size > 6e6)`).
- A URL must start with `http://` or `https://`.
- When the game loads the slot, DMB Tech 1 auto-sizes the model and stands it on the floor. Animated enemies look for clips named roughly Idle, Walk/Run, Shoot/Attack, HitReact, and Death (`ENEMY_CLIPS` in `app.js`).
- Use only models whose license allows it (CC0 or CC BY are the usual safe choices), and credit the author in `CREDITS.md` (Lesson 5).

> **Do this now.** Pick **Soldier** → **File**, choose a small `.glb` (or tap **Use Dystopia pack (online)** if you just want to see a swap). Press **Play**. Find a Soldier in the level, or drop one with the Things tab first.

> **Payoff:** the procedural robot is hidden and your model is in its place. If it fails to load, the built-in mesh stays visible, and the console shows `RetroEngine: model failed to load`.
