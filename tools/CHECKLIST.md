# DYSTOPIA — per-level regression checklist

Automated by `tools/regression.js` (headless Chromium + SwiftShader). Run it before every deploy.

## Run it

```bash
cd dystopia-pages
node tools/regression.js                     # all 9 levels × 4 floors + Doom Party (~25–35 min)
node tools/regression.js --quick             # floors 0 and 2 only
node tools/regression.js --levels 3 --quick  # one level, fast (~3 min)
node tools/regression.js --url https://ddemby424.github.io/dystopia-project-moses/   # check the live site
```

Options: `--out DIR` (default `regression-out/`, git-ignored), `--chrome PATH` (default `/usr/bin/google-chrome`, or `$CHROME`).
Needs `playwright-core` (`npm i -g playwright-core`). Without `--url` it serves the repo itself on a random local port.
Exit code 0 = all pass, 1 = some check failed, 2 = the script crashed.
Output: `report.md` (pass/fail table per level + details), `results.json`, one screenshot per floor (`L3F2.png`), `doom_party.png`, `start_<device>_<orientation>.png`.

## What is checked

| # | Check | Where | Pass when |
|---|---|---|---|
| 1 | Mobile start screen | iPhone 14 (390×664), iPhone 16 (393×659), Fold cover (344×882), Fold open (673×841), portrait + landscape | Splash scrolls (`overflow-y:auto`) and the **Enter Dystopia** button is fully on screen |
| 2 | No console errors | boot, every floor, Doom Party | no page errors, console errors or HTTP ≥400 |
| 3 | Signs read correctly | every floor | every canvas text plane is single-sided front + a back twin rotated 180°, positive matrix determinant, no negative texture repeat |
| 4 | No z-fighting | every floor (after the built-in anti-z pass) | no two differently-coloured boxes/planes share a coplanar, same-facing, overlapping face (floor-level bottoms and ceiling tops excluded) |
| 5 | AI moves, not stuck/floating | every floor, ~8 s | ≥25 % of ground bots moved (headless runs at a few fps); none inside a collider, floating >0.6 m above ground, or sunk; no drone below 0.3 m. Perch snipers excluded |
| 6 | Sentinel | floors with a Colossus | no base disc/plate; player placed 25–40 m away → it closes ≥8 m in 10 s of game time |
| 7 | Viewmodel intact | every floor, all 4 weapons | gun is rendered in the separate depth-cleared pass (child of `vmCam`), swaps build a new model, no sub-part moves relative to the gun root through 40 frames of fire/reload with dt 0.016–0.25 s |
| 8 | Shots hit the crosshair | floor 1 of every level (floor 2 in `--quick`), weapons 0–3 at 5/20/50 m, aim assist off | aim point lies on the camera-centre ray (<1 cm); straight shots pass <0.6 m from the target centre; damaging weapons actually hit (launcher may arc but must land on target) |
| 9 | Doom Party | offline practice match with AI bots, 10 s | ≥50 % of bots moved, none inside walls, viewmodel in separate pass, no errors |

## Manual (can't be automated headless)
- Real-phone feel: frame rate, touch look/fire-drag, audio levels, Safari toolbars/rotation.
- Doom Party over the internet (WebRTC needs real networking; `?net=local` covers same-browser tabs).

Note: the shotgun (8-pellet spread) only has to deal damage at 5 and 20 m. At 50 m the check only asks that the pellet path is centred on the crosshair, because spread misses at long range are expected.
