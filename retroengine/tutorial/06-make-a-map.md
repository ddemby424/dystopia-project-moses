# Lesson 6 — Make an escape-pad map

**Time:** about 10 minutes
**Payoff:** a tiny level you can walk, with a start and an exit pad that ends the level.

An escape-pad map is a level whose goal is to reach an **Exit pad**. Standing on the pad (distance under `0.42` cells) calls `levelComplete()`. Every trial pack map works this way.

## Start a clean level

1. Menu → **Projects** → **New project** (save the current one first if you care about it).
2. You get one empty level named Level 1. Open the **Level** tab and name it something like `Pad Drill`.
3. Optional: set a sky (Night City, Red Dusk, Overcast, Toxic Haze, Black Void), a music track, and a par time.

Default new-level size is **40×32** cells. You can resize in the Project / Level size controls. The engine accepts **8 to 128** on each side (`normalizeLevel`).

## Draw a room

The tool bar is on the left (or the bottom on phones). These are the real tool ids and keys from `TOOLS` in `app.js`:

| Tool | Key | What it does |
|---|---|---|
| Select | V | Tap a thing to move it. Drag empty space to select an area. |
| Pan | H | Drag to move the view. Pinch or wheel to zoom. |
| Wall | B | Paint solid walls with the current texture. |
| Floor | F | Paint floor (also carves through walls). |
| Ceiling | C | Paint ceiling. Pick **Sky** for open air. |
| Height | U | Raise floors. |
| Rect | R | Drag a rectangle: room, solid block, carved floor, or outline. |
| Fill | G | Flood-fill a connected area of the same texture. |
| Erase | E | Things first, then walls, then floor details. |
| Door | D | Place doors. Keycard doors need the matching key. |
| Thing | T | Place the item chosen in the Things tab. |
| Start | S | Player start. Tap again to turn 90°. |
| Picker | I | Copy a cell's textures into your brushes. |
| Rooms | — | Opens the 22-room template library. |

On a phone: one finger uses the tool, two fingers pan and pinch-zoom. **Fit** frames the whole map. Undo is the top-bar button, or Ctrl/Cmd+Z.

**Floor height** (Build tab): steps of `0.15` make stairs you can climb (`STEP_H` is `0.36`, so two steps of 0.15 are fine; a jump of more than 0.36 is a ledge). `0.60` is a catwalk. `0.75` is a cover block the player cannot climb. Lesson 15 is the hands-on walkthrough (templates, jumping, and the outdoor sidewalk / curb / fence textures).

## Place the start and the exit

1. Choose **Start** (S). Tap a floor cell in your room. Tap it again if you want to face another way. The start must not sit inside a wall or door — Menu → **Check level** will error if it does.
2. Open the **Things** tab. Under **Keys & goals**, choose **Exit pad**.
3. The Thing tool stays selected. Tap a floor cell at the far end of the room.

A level with no exit can only be finished by a script calling `api.win()` (Lesson 13). Check level will *warn* if there is no pad.

> **Do this now.** Draw one rectangle room, place Start at one end and an Exit pad at the other, then press **Play**. Walk onto the pad.

> **Payoff:** the level-complete screen. You just made a finishable RetroEngine map. Next lesson we put a locked door and a Titan in the way.
