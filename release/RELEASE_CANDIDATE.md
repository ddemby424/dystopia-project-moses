# DYSTOPIA — single-player release candidate

This is a first-release candidate for one player. It is not a launch, and it has not been tried on a real phone.

The live site (`https://ddemby424.github.io/dystopia-project-moses/`) and the root `index.html` are unchanged. Studio, Doom Party, the robot remake, Godot, and the learn folders are still there. This candidate only adds `release/` plus two test scripts.

## How to preview

From the repo root (a normal web server, not `file://`):

```bash
python3 -m http.server 8765
```

Open **http://127.0.0.1:8765/release/index.html**

`release/index.html` sets `<base href="../">`, so it shares `game.js`, `style.css`, `models/`, `music/`, `audio/`, and `fonts/` with the legacy game. It does not copy those files.

Tap **Enter Dystopia**, then **New Campaign**. You start in the yard, facing the factory. The west lane is the wide loading dock. The east lane is the narrower personnel airlock. Both are open gaps in the wall, and both come out in Server Hall G. The fence is live until Cradle 09 is cleared (level 9, floor B3). The south gate then opens and the epilogue plays. Skip never leaves you without a button.

Direct link on a machine that is already serving the repo: `/release/index.html?notrailer=1` skips the startup trailer. That trailer is still the old one (`media/dystopia_trailer_720p.mp4`). The win movie is `release/media/victory.webm` (960×540, 24 fps, 6 seconds, about 467 KB, with a short bed from `music/credits_feral_angel_waltz.mp3`).

A smaller zip for a phone editor, without the Unity test, the learn pages, the robot remake, or the old trailer, is `dystopia-candidate-preview.zip` (about 33 MB) next to the review artifacts. Unzip it, serve that folder, and open `/release/index.html`. Instructions are in `release/PREVIEW.txt`.

The full branch archive, after this branch is on GitHub, is:

https://github.com/ddemby424/dystopia-project-moses/archive/refs/heads/cursor/single-player-release-de72.zip

That archive is the whole repo, including folders the candidate does not use.

## What is modular, and what is still `game.js`

This is not a rewrite. `game.js` is still the game. The candidate is a set of small scripts that run after it and replace a handful of functions.

Still entirely inside `game.js` (the candidate calls these, it does not own them):

- Rendering, lights, fog, the viewmodel, and the frame loop
- Player movement, jumping, weapons, projectiles, damage, and death
- Bot AI, drones, the Colossus brain, nav mesh, and floor generation for all 9 × 4 floors
- The elevator, cell door, music engine, and the startup trailer
- The HUD markup in `index.html` (the candidate page is a copy of that markup)

Owned by `release/js`, with data in `release/maps/yard.json`:

- The yard layout, the two door gaps, and the kit loader for the new GLBs only
- The fence, the shock, and the south gate
- When a campaign clear counts as a win, and the save/reset keys
- The epilogue player (file, live fallback, skip, replay, failure card)
- A replacement for `softSpotWorld` so weak points use bone positions
- Extra touch-cancel and portrait handling

`boot.js` is the seam. It wraps `playerCollidesAt`, `collidesAt`, `buildArenaMap`, `startFloor`, `advanceFloor`, and `updateFloorLogic`. Gameplay inside the factory is the original code.

## What you play

- The existing 9 levels × 4 floors, single player.
- A compact yard on the south side of Floor G.
- Two routes into the same Server Hall G, with different access:
  - **Loading dock (west, walk x = -12.5).** The mouth is wide and already open. Crates and a conveyor sit beside the lane so you can step off the center line into cover. The warden is a lighter flanker standing off the lane (x = -18).
  - **Personnel airlock (east, walk x = 14).** The mouth is narrower. A shutter blocks it until you stand on the scanner just east of the door for about 1.5 seconds. Pipes are the only cover, and they form a wall rather than a flank. The warden past the door is a heavy (150 hp) standing in the choke.
- An electrified fence that blocks, buzzes, and chips health until level 9 floor B3 is cleared through the normal `advanceFloor` path. The south gate then opens. The side spans stay solid.
- An epilogue that is not the startup trailer. Skip, replay, and a missing file all end on a card with Stay / New Campaign.
- Win and floor progress in `localStorage` (`dys_rc_win_v1`, `dys_rc_save_v1`). **Reset win & save** clears both and locks the fence again.

Studio and Doom Party stay in the DOM because `game.js` binds those buttons at startup. The candidate hides them. The root `index.html` does not load any `release/js` file.

## Folder tour (phone editors: Spck, Acode)

Edit these. You do not need to open `game.js` (about 540 KB) to change the yard.

| File | What you change |
|---|---|
| `release/index.html` | The page. It is the legacy HUD plus a `<base>` tag and the scripts below. |
| `release/css/candidate.css` | Hides studio/party, styles the epilogue, touch rules. |
| `release/maps/yard.json` | **The map.** Spawn, the two route gaps, fence rectangle, gate, and every placed kit piece. Keep walk x = **-12.5** (dock) and **14** (airlock) clear from z 42 to z 130. |
| `release/js/boot.js` | Hooks into `game.js`: collision, floor start, the win elevator, viewport fit. |
| `release/js/yard.js` | Builds the yard, carves the two door gaps, spawns the route wardens. |
| `release/js/fence.js` | Posts, rails, the gate, shock, buzz. Capped sparks. |
| `release/js/campaign.js` | Save, win, reset, return to the yard. |
| `release/js/victory.js` | Epilogue file, live fallback, skip, card. Not the startup trailer. |
| `release/js/map-kit.js` | Turns a JSON row into a mesh. Repeating floor tiles are one `InstancedMesh`. |
| `release/js/asset-cache.js` | One GLB load per URL. Clones share geometry and materials. |
| `release/js/controls.js` | Drops stuck move / look / fire when the page hides, blurs, or a pointer is cancelled. |
| `release/js/fixes.js` | Weak-point markers. Candidate only. |
| `release/js/hud.js` | Menu copy, continue, the yard minimap. |
| `release/assets/kenney-factory/` | CC0 modular factory pieces (walls, crane, conveyors, pipes, boxes). |
| `release/assets/kenney-city/` | CC0 exterior shells (buildings, containers, tank, chimney, water tower). |
| `release/licenses/` | License copies and the ledger. |
| `release/media/victory.webm` | The win movie. `victory.vtt` is the caption track. |

Pieces come from modular kits, not a downloaded finished level. See the ledger for why.

## License ledger

Full table, URLs, and the copied license texts: `release/licenses/ATTRIBUTION.md`.

- **Kenney Factory Kit 3.0** — CC0 — https://kenney.nl/assets/factory-kit — 27 GLBs plus `Textures/colormap.png`. No mesh edits. Scale and rotation are in `yard.json`.
- **Kenney City Kit (Industrial)** — CC0 — https://kenney.nl/assets/city-kit-industrial — 12 GLBs plus its colormap. Buildings, the tower, and the chimney sit outside the fence as the skyline.

CC0 does not require credit. Credit is recorded anyway. Music, fonts, and the old props stay as in `CREDITS.md`. No Meshy credits were spent. No new accounts.

## Budgets (measured)

Headless Chromium, SwiftShader, after the kit loaded and a frame of the yard was drawn (`tools/rc_playthrough.js`, `budget.json`):

| Measure | Result |
|---|---|
| Kit GLBs transferred (loader progress) | 1,079,996 bytes, 27 files, 0 failures |
| Colormaps | about 12 KB each (factory + city) |
| Draw calls with the factory also in the scene | 145 |
| Triangles that frame | 25,881 |

The yard does not load a second copy of the sentinels, music, or the 14 MB trailer. Fence posts and rails are instanced. Sparks are a pool of at most 8 (4 on a coarse pointer). Yard lights are 1 on a coarse pointer and 2 otherwise. The epilogue is a 6 second, 960×540, 24 fps capture. It starts already facing the closed south gate (bright LIVE panel, sign reading SEALED), the panel goes dark, the sign changes to PERIMETER CLEAR, the panel rises clear of the wires, and only then does the camera walk through. The last second looks back at the yard through that opening. A few seconds of the existing credits track sit under it. Captions are the page’s timed line plus `victory.vtt`, not burned into the picture. An earlier cut of this file did not show that opening; it has been replaced. It has not been signed off on a phone.

## Tests that were actually run

`node tools/rc_playthrough.js` (headless Chromium, touch enabled, not a phone) passed **29/29**. That run is `results.json` under the artifact folder. It checked:

- Yard spawn on floor G, studio and party hidden, kit load with no failures
- Dock lane clear the whole way into the hall
- Airlock lane blocked at the shutter, then clear after standing on the scanner
- Dock warden is a flanker; airlock warden is a 150 hp heavy
- Live fence blocks the gate and a side span, and contact drops health
- A weak-point marker followed a bone moved 1.2 m (spot stayed on the bone, distance 0) and followed a 3 m body slide
- Clearing floor G with `advanceFloor` goes to B1 and leaves the fence live
- Advancing 9-B2 goes to 9-B3 and leaves the fence live
- `advanceFloor` on 9-B3, the same call the elevator makes, is the win: fence dead, epilogue open
- Skip, replay, stay, and a missing file
- Reset locks the fence; death on G returns to the yard
- Stuck inputs clear; canvas matches a 390×844 viewport; no page errors

Portrait on the candidate does not show the legacy full-screen “rotate your phone” wall. The root game still does.

`node tools/rc_victory.js` writes the epilogue from the live yard: the camera turns to the gate, the gate rises, and the last frames are past the opening.

The root suite `node tools/regression.js` was re-run against `index.html` and passed **264/264**, including boot with no console errors, all 9 levels × 4 floors, weapon shots, and Doom Party. Shared `game.js`, models, and music still load on the original page. The report is `/tmp/root-regression/report.md` (also copied beside the review artifacts). That suite does not open `release/index.html`. A headless pass is not proof on a Galaxy Fold or an iPhone. Nothing here was played on those devices.

## Screenshots and recording

Written by the test and the capture script under `/opt/cursor/artifacts/rc/` (also copied beside the PR when the agent uploads them):

- `yard_spawn.jpg` — yard, crane, both door signs
- `route_dock.jpg` — wide west mouth, hall visible through it
- `route_airlock.jpg` — narrower east lane
- `route_dock_inside.jpg` — dock warden in the hall
- `combat_dock_guard.jpg` — warden plus the floor
- `colossus_weakpoints.jpg` — markers on the body
- `fence_live.jpg` — sealed gate
- `fence_open.jpg` — after the win
- `vista_west.jpg` / `vista_gate.jpg` — city-kit shells outside the fence
- `phone_landscape_hud.jpg` / `phone_portrait_yard.jpg` — resized canvas
- `victory_card.jpg` — skip / failure card
- `playthrough.webm` — the scripted headless pass
- `victory.webm` — the epilogue

## Known issues (do not call this launch-ready)

- No real-device pass. Touch, rotate, and audio were only exercised in headless Chromium.
- The epilogue is a 6 second capture at 24 fps with a short bed from an existing music track. Captions are on the page, not in the pixels. It has not been reviewed by watching it as a finished trailer.
- Floor G always starts in the yard, including after death. Continue of B1–B3 resumes that floor. There is no mid-corridor checkpoint.
- Weak points follow bones. They are still glowing discs. A bone the skeleton does not actually drive will not move.
- The fence is posts, rails, and a striped gate, not a chain-link model. Shock range is short. Side spans stay closed after the win.
- Same-WiFi multiplayer is unchanged and is not part of this flow. The old failure is not fixed here.
- Opening the candidate from `file://` will not load the JSON or the GLBs. Use a local server.

## Five minutes on your phone

1. Serve the branch and open `/release/index.html` on the phone (same Wi-Fi, or whatever host you use). Confirm the address is the candidate, not the live GitHub root.
2. Splash: Enter is reachable in portrait. Skip the startup trailer if it plays. You should not see Studio or Doom Party.
3. New Campaign. You are outdoors. Walk the west dock straight in. On the east, stand by the scanner until the shutter rises, then walk in. The east guard is the heavier one.
4. Walk into the south gate. It should stop you, tick health, and say the fence is live. Rotate or unfold once. The sticks and Fire should still match the screen, and letting go must stop you.
5. From the menu, Reset, then Continue if you had a save. After a real clear of 9-B3 (or don’t, if you are only checking the yard), the gate should open, the epilogue should play, Skip should land on the card, and Stay should put you back in the yard with the gate still open.
