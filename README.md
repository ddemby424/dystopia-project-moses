# DYSTOPIA — Project Moses (Strogg Sentinel Upgrade)

Upgraded single-file Three.js r128 FPS for Darcy D. Demby.

## Play

Open `dystopia-upgraded.html` in a desktop browser (or serve the folder so `./models/*.glb` can load):

```bash
cd /workspace/dystopia && python3 -m http.server 8765
# then visit http://localhost:8765/dystopia-upgraded.html
```

## What changed

- **Strogg biomechanical sentinels** (Quake-style flesh+gunmetal, cables into sinew, arm-cannon grafts, rust/brown-green, amber-red eyes) — two variants: Guard + Heavy. Roster/AI/patrols unchanged.
- **Death**: collapse + gib burst (not instant despawn).
- **Pulse Cannon** viewmodel: shroud, coils with fleshy wraps, amber cells, heat vents, scope rail, sway/bob/recoil/spin-up glow, muzzle flash + PointLight + sparks (player & enemies).
- **Environment**: grimy PBR-ish walls/floor, pipes/cables, hanging lights (PointLights + cones), puddles, barrels, debris, steam vents, flickering lights (extras gated on `IS_COARSE`).
- **FX**: hit sparks, impact decals, screen shake, glowing tracers, hit reactions, HUD polish.
- **Meshy**: silent auto-loader for `./models/{sentinel_guard,sentinel_heavy,pulse_cannon,crate,server_rack,barrel,pipe_vent}.glb`. Studio Tab 2 has Text-to-3D API panel (paste **your** key — never baked into HTML). Procedural fallbacks always work.

## Ready-to-use Meshy prompts

```
# sentinel_guard.glb
Quake Strogg-style biomechanical security sentinel, flesh fused with riveted gunmetal plates, cables and hydraulic tubes plugged into exposed sinew, arm-cannon surgical graft, grimy rust brown-green palette, glowing amber-red eye slits, humanoid bipedal, game-ready

# sentinel_heavy.glb
Heavy Quake Strogg biomechanical enforcer, oversized riveted pauldrons fused into muscle, stomper boots with exposed sinew, dual grafted arm cannons, glowing red eye slits, thick cables into the torso, hulking flesh-and-metal war machine, bipedal humanoid

# pulse_cannon.glb
Grimy industrial biomechanical pulse cannon FPS viewmodel, riveted barrel shroud, exposed energy coils with fleshy cable wraps, glowing amber power cells, heat vents, scope rail, oily gunmetal, single weapon prop only, no hands

# crate.glb / server_rack.glb / barrel.glb / pipe_vent.glb
Industrial sci-fi cargo crate with hazard markings
Data center server rack with LED strips
Industrial metal oil barrel with hazard labels
Industrial wall pipe and steam vent cluster
```

Generate offline with:

```bash
# Put a VALID key in .meshy_key (never commit / never embed in HTML)
python3 meshy_generate.py
```

API flow: `POST /openapi/v2/text-to-3d` preview → poll → optional refine → download `model_urls.glb`. Humanoids can then use `/openapi/v1/rigging` for walk GLBs.

## Files

| Path | Notes |
|------|--------|
| `dystopia-upgraded.html` | Playable upgraded build |
| `original.html` | Archive stub — full paste was chat t0u (~150KB); re-save from chat if byte-identical original needed |
| `models/` | Drop Meshy GLBs here |
| `meshy_generate.py` | Batch generator (reads `.meshy_key`) |
| `dystopia-upgraded.zip` | HTML + models + README |

## Meshy key status (this run)

The provided `.meshy_key` returned **HTTP 401 Invalid API key** on balance, list, and create. No credits were spent; no GLBs were generated. Procedural Strogg fallbacks are active. Paste a valid key in Studio → Meshy panel (or fix `.meshy_key` and re-run `meshy_generate.py`).

## Meshy generation (latest run)

| File | Size | Credits | Notes |
|------|------|---------|-------|
| sentinel_guard.glb | ~12.2 MB | 35 | preview+refine+rig (walk anim) |
| sentinel_heavy.glb | ~12.6 MB | 35 | preview+refine+rig (walk anim) |
| pulse_cannon.glb | ~10.1 MB | 30 | preview+refine |
| crate.glb | ~7.5 MB | 15 | lite preview+refine |
| server_rack.glb | ~4.7 MB | 15 | lite preview+refine |
| barrel.glb | ~5.6 MB | 15 | lite preview+refine |
| pipe_vent.glb | ~6.9 MB | 15 | lite preview+refine |

**Total credits used: 160** (balance 3139 → 2979). Models total ~59 MB — over 40 MB, so no base64 `dystopia-standalone.html`; use the zip + models folder instead.
