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

Direct link on a machine that is already serving the repo: `/release/index.html?notrailer=1` skips the startup trailer. That trailer is still the old one (`media/dystopia_trailer_720p.mp4`). The win movie is `release/media/victory.webm`.

## What this candidate is

- The existing 9 levels × 4 floors, single player only.
- A compact yard on the south side of Floor G, not an open world.
- Two real routes in, each with its own width, dressing, and a warden.
- An electrified fence that blocks, buzzes, and chips health until the win. After the win only the south gate opens. The side spans stay solid so the exit is the gate.
- A separate epilogue (captured in-engine from this yard) with on-screen captions, a WebVTT track, skip, replay, and a card if the file fails.
- Win and floor progress in `localStorage` (`dys_rc_win_v1`, `dys_rc_save_v1`). **Reset win & save** clears both and locks the fence again.

Studio, the Meshy panel, and Doom Party stay in the DOM because `game.js` binds those buttons at startup. The candidate hides them and sets `IS_RELEASE_BUILD` so Tab does not open the studio. The root `index.html` does not load any `release/js` file, so those features still work there.

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
| Kit GLBs transferred (loader progress) | 1,176,272 bytes, 34 files, 0 failures |
| Colormaps | about 12 KB each (factory + city) |
| Whole `release/` folder | about 1.7 MB including the 138 KB epilogue |
| Draw calls with the factory also in the scene | 145 |
| Triangles that frame | 25,881 |

The yard does not load a second copy of the sentinels, music, or the 14 MB trailer. Floor tiles and fence posts/rails are instanced. Sparks are a pool of at most 8 (4 on a coarse pointer). Yard lights are 1 on a coarse pointer and 2 otherwise. The epilogue file is 640×360, 8 seconds, 4 frames/s, silent, about 138 KB. Captions are drawn by the page from `victory.vtt` and a timed line, not burned into the pixels.

## Tests that were actually run

`node tools/rc_playthrough.js` (headless Chromium, touch enabled, not a phone):

Passed, in one run before the movie file existed: boot, kit load, studio and party hidden, yard spawn, both routes clear into the hall (sampled every 1.25 m), live fence blocks the gate and a side, fence contact drops health, both wardens exist, weak points within 0.42 m on the facing axis, draw-call budget, win clears the fence and opens the epilogue, skip reaches the card, replay, stay returns control, the open gate starts the epilogue again, a missing file still shows the card, reset clears the win and locks the fence, death on G returns you to the yard at full health, stuck inputs clear, canvas matches a 390×844 viewport.

A second run, after `release/media/victory.webm` was in place, passed **24/24**, including no page errors. Skip then landed on the normal epilogue card (“The fence is cold…”), which means the file played. `results.json` in the artifact folder is that run. Portrait no longer puts up the legacy full-screen “rotate your phone” wall; that wall blocks touches, and a Fold cover is portrait. The candidate hides `#mc-rotate` only. The root game still shows it.

`node tools/rc_victory.js` writes `release/media/victory.webm` from the live yard (gate rises, captions timed to 8 s).

The legacy suite in `tools/regression.js` (the long per-level pass described in `tools/CHECKLIST.md`) was **not** re-run. `index.html`, `game.js`, and `style.css` are unmodified on this branch, so that suite still describes the root game, not this page. Re-run it before anyone deploys the root. A headless pass is not proof on a Galaxy Fold or an iPhone. Nothing here was played on those devices.

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
- The epilogue is a short, low-rate, silent capture. The page supplies captions, skip, replay, and a fallback card. It is not a scored trailer.
- Floor G always starts in the yard, including after death. Continue of B1–B3 resumes that floor. There is no mid-corridor checkpoint.
- Weak points are clamped onto the hull instead of pushed out in front of it. They are still glowing discs, and a fast animation can leave one a few tenths of a metre off a bone.
- The fence is posts, rails, and a striped gate, not a chain-link model. Shock range is short. Side spans stay closed after the win.
- Same-WiFi multiplayer is unchanged and is not part of this flow. The old failure is not fixed here.
- Opening the candidate from `file://` will not load the JSON or the GLBs. Use a local server.

## Five minutes on your phone

1. Serve the branch and open `/release/index.html` on the phone (same Wi-Fi, or whatever host you use). Confirm the address is the candidate, not the live GitHub root.
2. Splash: Enter is reachable in portrait. Skip the startup trailer if it plays. You should not see Studio or Doom Party.
3. New Campaign. You are outdoors. Walk the west dock into the building, then the east airlock. Both should let you through.
4. Walk into the south gate. It should stop you, tick health, and say the fence is live. Rotate or unfold once. The sticks and Fire should still match the screen, and letting go must stop you.
5. From the menu, Reset, then Continue if you had a save. After a real clear of 9-B3 (or don’t, if you are only checking the yard), the gate should open, the epilogue should play, Skip should land on the card, and Stay should put you back in the yard with the gate still open.
