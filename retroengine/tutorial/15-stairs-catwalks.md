# Lesson 15 — Stairs, catwalks and jumping

**Time:** about 10 minutes
**Payoff:** a watchtower you can walk up, plus a jump you can feel, using the real height tools.

DMB Tech 1 already has floor heights. You do not need a new engine feature to build stairs, a catwalk, or a prison-yard wall. This lesson shows where the knobs are, then you stamp a tower and play it.

## Floor heights

Every cell has a number in `fh` (floor height), in world units. The ground is `0`. The engine stores the grid in row-major order, so the index of cell `(x, y)` is `y * width + x`.

| Height | What it is for | Can you walk up to it? |
|---|---|---|
| `0` | Ground | — |
| `0.15` | One stair step, or a curb | Yes |
| `0.30` | Second step | Yes, from `0.15` or from `0` (`0.30` is under the max climb) |
| `0.45` | Third step | Yes, from `0.30` (not in one step from `0`) |
| `0.60` | Catwalk / tower deck | Yes, from `0.45` or `0.30` |
| `0.75` | Cover block (sandbags-high) | No. This is waist-high cover. |

The max you can **walk** up in one step is `STEP_H` in `dmbtech1.js`, which is `0.36`. Two `0.15` steps are fine. A jump of more than `0.36` is a ledge: the flood-fill in Menu → **Check level** will say the exit cannot be reached if you skipped a stair.

Jumping does **not** replace stairs. Space (or the JUMP button) sets `G.vz = 3.6`. Against gravity `11`, that peaks a little under `0.60`, so you still want stairs to get onto a catwalk. You cannot jump onto a `0.75` cover block from the ground.

## Height tool and Floor height buttons

1. Select **Height** (key **U**) in the tool bar. The hint reads: "Raise floors: 0.15 steps = stairs, 0.6 = catwalk, 0.75 = cover block (can't climb)."
2. Open the **Build** tab. Under **Floor height** are the buttons `0`, `.15`, `.30`, `.45`, `.60`, and **Block** (`0.75`). They set `ED.brush.fh`.
3. Paint on floor cells (not walls). The 2D map tints raised cells blue, or orange when the height is above `STEP_H * 2`.
4. Turn **Floor heights** on in Project → Map layers if you want to see the tint.

The Floor tool (F) paints a texture and carves through walls. Height never places a wall. If you need a texture *and* a height (a curb, a grate catwalk), paint the floor first, then paint the height on top.

## Ready-made stairs and a tower

The Rooms library already has stamps that use these heights. Open **Rooms**:

- **Stairs Up** (`id: 'stairs'`, category Halls): a short run that rises to `0.6`, ready to lead onto a catwalk. The rows look like this (the `1`–`4` characters are heights, not walls):

```
%...%
%444%
%333%
%222%
%111%
%.L.%
%...%
```

- **Guard Tower** (`id: 'tower'`, category Buildings): a two-level tower with a catwalk ring at `0.6` and stairs on the south side (`hrows` is the height layer). Stamp it, press **Play**, and walk up.

While a stamp is hovering, **R** rotates it 90°.

## Heights in text templates

When you write a room as text (or edit `TEMPLATES` in `app.js`), these characters set `fh`. They are the real `HEIGHT_CHARS` table:

```javascript
// In app.js, next to the template legend.
// A character "1" on a floor cell means fh = 0.15, "5" means 0.75 cover.
const HEIGHT_CHARS = { '1': 0.15, '2': 0.3, '3': 0.45, '4': 0.6, '5': 0.75 };
```

A template can also ship a separate `hrows` array (the Guard Tower does this) so the floor letters stay readable.

## Jumping

| | Keyboard / mouse | Touch |
|---|---|---|
| Jump | **Space** | **JUMP** button |

The jump only happens when you are on the ground (`G.onGround`). A short press is enough; the code latches the tap so a quick poke is not missed. After you land, you can jump again.

Try this after you have a 0.15 curb or a 0.30 step: walk up the low edge, then jump back down so you can feel the height.

## Editing `fh` in code

You can set heights in a `.retro` file, in the code editor (Menu → Code editor → `level.json`), or in a small script you are writing for yourself. This is the real layout:

```javascript
// Floor height is one number per cell, row-major.
// Index of cell (x, y) is y * width + x. Width is level.w.
const x = 10;                 // cell column
const y = 4;                  // cell row
const i = y * level.w + x;    // 4 * width + 10

level.fh[i] = 0.15;           // one stair step (or a curb)
// level.fh[i] = 0.30;        // second step
// level.fh[i] = 0.45;        // third step
// level.fh[i] = 0.6;         // catwalk — only walk onto this from 0.30 or 0.45
// level.fh[i] = 0.75;        // cover block; the player cannot climb it
```

A short stair run in a loop:

```javascript
// Build a 4-step stair going +y, two cells wide, starting at (x, y).
// 0.15, 0.30, 0.45, then 0.60 (the catwalk landing).
const steps = [0.15, 0.30, 0.45, 0.60];
for (let s = 0; s < steps.length; s++) {
  for (let t = 0; t < 2; t++) {          // width of 2
    const i = (y + s) * level.w + (x + t);
    level.fh[i] = steps[s];
  }
}
```

Menu → **Check level** uses the same `0.36` climb rule, and it picks up keys as it walks, so a catwalk that is missing a step will show as unreachable.

## Outdoor textures (sidewalks, curbs, fence, brick)

DMB Tech 1 1.0.1 adds procedural outdoor textures, meant for a prison yard, an airport apron, or any secured compound. They are regular `.retro` texture ids, listed in the Build tab swatches.

| Id | Palette | What it looks like |
|---|---|---|
| `sidewalk` | Floor (and wall) | Worn concrete slabs with seams, cracks, and oil stains |
| `curb` | Floor (and wall) | A concrete lip with a faded painted edge. Raise the cell to `0.15` so it reads as a curb |
| `asphalt_lines` | Floor | Asphalt with worn white and yellow painted lines |
| `fence` | Wall | Chain-link with razor wire on top. See-through (alpha-tested) |
| `brick_weathered` | Wall (and floor) | Outdoor red brick, chipped mortar, dirt streaks |

The older `brick` and `asphalt` swatches are still there. Use `ceil: "sky"` on outdoor cells so the yard is open to the sky.

The trial pack map **Cellblock Yard** (`maps/cellblock-yard.retro`) uses all of these: a sidewalk yard, curb rings, chain-link pens, weathered brick walls, guard towers, a sniper catwalk, and a Titan in the sally port. Play it from the [map pack page](../maps/) after you finish the stamp below.

## Build a watchtower in 2 minutes

1. Menu → **Projects** → **New project** (save first if you care about the current one), or carve a empty floor in a corner of the Lesson 6 map.
2. Optional: paint the ground around the tower with **Floor** (F) and the `sidewalk` or `asphalt_lines` swatch. Set the ceiling to **Sky**.
3. Open **Rooms**. Pick **Guard Tower**. Tap to stamp it. (Or pick **Stairs Up** and then paint a `0.60` ring yourself with Height → `.60`.)
4. Put **Start** (S) on the ground just outside the tower door, facing in.
5. Press **Play**. Walk in, climb the stairs, stand on the catwalk (`fh` is `0.6`). Jump with Space or JUMP, then walk back down.
6. If you want a curb around the pad: Floor → `curb`, then Height → `.15`, and paint a one-cell strip.

> **Do this now.** Stamp a Guard Tower (or Stairs Up onto a `0.60` deck), Play, climb it, and jump from the top. If Check level complains about a ledge, you skipped a step — add the missing `0.15` / `0.30` / `0.45`.

> **Payoff:** you can raise a floor, walk it, and jump off it. That is enough to build a yard with towers, a catwalk, and cover.
