# Lesson 10 — Change engine code safely

**Time:** about 10 minutes
**Payoff:** one small, visible change (Titan health or walk speed) that you can feel in Playtest, then undo if you want.

`dmbtech1.js` is the **DMB Tech 1** engine (the editor in `app.js` only imports it). The tunables live near the top of `createRuntime()` and in a few tables. Change one number, save, refresh the preview, and Play. Keep a copy of the original line (or export a project first) so you can go back.

Do not edit `dmbtech1.js` in two tools at once. Change a line you can clearly see, and re-read that line before you ship.

## Where the knobs are

All of these are real names in `dmbtech1.js` (the editor version string lives in `app.js`).

| What | Where | Current value in source |
|---|---|---|
| Engine version | `const VERSION` in `dmbtech1.js` | `'1.0.0'`. The editor version is `const VERSION = '1.1.1'` in `app.js` (About and exports). |
| Eye height | `EYE` | `0.62` |
| Player radius | `PLAYER_R` | `0.22` cells |
| Max walk-up height | `STEP_H` | `0.36` |
| Gravity | `GRAV` | `11` |
| Walk / run speed | `updatePlayer`: `const sp = 3.1 * (running ? 1.6 : 1)` | walk `3.1`, run `× 1.6` |
| Start/stop snap | `1 - Math.exp(-dt * (G.onGround ? 28 : 8))` | 28 on ground, 8 in air |
| Jump | `G.vz = 3.6` | `3.6` |
| Look sensitivity | `const sens = 0.0022 * S.sens` | default `S.sens` is `1.25` |
| Pitch limits | `clamp(..., -1.35, 1.35)` | about ±77° |
| Arrow-key turn | `2.8 * dt` | radians per second-ish |
| Touch look | `tMove`: multiply drag by `2.0` | `2.0` |
| Joystick | dead zone `8` px, max `56` px, auto-run if `joyY < -0.72` | — |
| Enemy stats | `ENEMY_DEFS` | hp, speed, range, dmg, cd, shots… |
| Weapon stats | `WEAPON_DEFS` | cd, dmg, spread, ammo type… |
| Magazines | `MAG_SIZE`, `RELOAD_TIME` | parallel arrays, one entry per weapon index |
| Ammo caps | `AMMO_MAX` | bullets 300, shells 60, cells 300, rockets 30 |
| Difficulty | `DIFF` inside `play()` | easy / normal / hard multipliers |
| Graphics tiers | `QUALITY` | low / medium / high |

Settings the player can move in **Menu → Game settings** (saved in `retroengine.settings.v1`): look sensitivity, field of view, volumes, quality, invert Y, **Aim assist**, **Also use aim assist with mouse**, show FPS, and on touch also button size. Those are `DEFAULT_SETTINGS` / `S`.

## Aim assist and movement settings

The starting firearm is `WEAPON_DEFS[1]`, the **Pulse Cannon** (Lesson 4 has the full row and the procedural mesh in `buildWeaponMesh`).

**Aim assist** is light shot magnetism, not sticky look. When you fire, `aimAssistDir` (called from `shoot()`) steers the shot toward the nearest unblocked enemy already near the crosshair.

| What | Where | Default |
|---|---|---|
| Aim assist strength | `S.aimAssist` in `DEFAULT_SETTINGS`; slider in Game settings | `0.80` (0–1, shown as 0–100%) |
| Also use with mouse | `S.aimAssistMouse` | `false` (checkbox off) |
| When it engages | slider > 0, and (a touch has been used in this play session, or the mouse checkbox is on) | **on for touch** by default |
| Cone / range | `0.08 * S.aimAssist` radians, 28 cells, needs `los(...)` | about 3.7° at 80% |

To make assist stronger, raise the slider, or change the default in `DEFAULT_SETTINGS`. To turn it off, set the slider to 0.

Movement and turning are RetroEngine’s own knobs, retuned in 1.1.0 so the feel is freer (quicker turning, less stiffness when you start, stop, or strafe). The current values are the walk/run, start/stop snap, look sensitivity, pitch limits, arrow-key turn, touch look, and joystick rows in the table above. Change **one** of those at a time if you are tuning feel.

## A small example edit

Make the Titan tougher. In `ENEMY_DEFS`, find the `titan` row and change `hp`.

```javascript
// Before: a Normal-difficulty Titan has 650 health (Hard multiplies this by 1.3).
titan:  { name: 'Titan (Boss)',  hp: 650, speed: 1.0, range: 14, dmg: 22, cd: 1.9, shots: 2, h: 1.3,  r: 0.45, score: 2000, proj: 'rocket' }

// After: 800 HP. Only this one number needs to change for the test.
titan:  { name: 'Titan (Boss)',  hp: 800, speed: 1.0, range: 14, dmg: 22, cd: 1.9, shots: 2, h: 1.3,  r: 0.45, score: 2000, proj: 'rocket' }
```

Or make walking feel quicker, if that is the feel you want to try:

```javascript
// Walk speed. running is true when Shift, the RUN button, or auto-run is on.
const sp = 3.4 * (running ? 1.6 : 1);  // was 3.1
```

Change **one** of those, not both, so you can tell what you felt.

## How to test it

1. Save `dmbtech1.js` in Spck or Acode.
2. Refresh the preview (a hard refresh if the old script is cached).
3. Play a map with a Titan, or your Lesson 7 map. Use Normal difficulty first.
4. Confirm the change (the Titan takes more rockets, or you cross the room faster).
5. If something feels wrong, put the old number back and refresh again.
6. After you edit source, run `python3 build.py` if you are testing the built `../retroengine/` copy (that folder gets its own `dmbtech1.js`).

Avoid drive-by edits in the middle of `updatePlayer` or `shoot` unless you are chasing a specific bug. Tables at the top are the safe knobs.

> **Do this now.** Change Titan `hp` from `650` to `800`, refresh, fight one Titan, then set it back (or keep it and note it in CHANGELOG when you ship).

> **Payoff:** you have a safe loop: change a named tunable, play, judge, revert or keep. That is how engine feel gets tuned.
