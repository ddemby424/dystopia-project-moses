# Credits and licenses

Everything in RetroEngine is either original work or released under a license that allows use in games, including commercial use. Each license below was checked on the official source page on 2026-11-20.

## 3D models: enemies (CC0 1.0, public domain)
All by **Quaternius** (https://quaternius.com), downloaded from Poly Pizza. CC0 means no attribution is required, but we credit the author anyway. License: https://creativecommons.org/publicdomain/zero/1.0/

| In game | Original title | File | Source (license shown on page) |
|---|---|---|---|
| Soldier | SWAT | `assets/models/soldier_swat.glb` | https://poly.pizza/m/Btfn3G5Xv4 (CC0 1.0) |
| Gun Drone | Robot Enemy Flying Gun | `assets/models/robot_flying_gun.glb` | https://poly.pizza/m/UDTM6X1y9a (CC0 1.0) |
| Heavy Walker | Robot Enemy Legs Gun | `assets/models/robot_legs_gun.glb` | https://poly.pizza/m/lFZfDh2hzP (CC0 1.0) |
| Titan (boss) | Robot Enemy Large Gun | `assets/models/robot_large_gun.glb` | https://poly.pizza/m/mWojM4i2IH (CC0 1.0) |
| Minotaur (boss) and minotaur statues | Brazen Minotaur by Alice Liu | `assets/models/minotaur_brazen.glb` | https://gobkit.com/s/gyn4rhpenihc (CC0 1.0, Gobkit community). Attribution welcome, not required. 4190 tris, clips idle/move/attack. A procedural stand-in is used if the GLB fails to load. |

## Original procedural weapons
The default starting firearm is a **Pulse Cannon** built in-engine (no third-party model). It is a compact port of the early DYSTOPIA Version 2 default gun (first shipped in that project on 2026-11-10, git commit `16322b7`). The mesh, the cyan pulse projectile, and the synthesized pulse sound are original work and may be used freely (CC0 / public domain). The Quaternius pistol GLB below remains in the repo but is no longer loaded as the default starting weapon.

## 3D models: guns (CC0 1.0, public domain)
All by **Quaternius**, from Poly Pizza.

| In game | Original title | File | Source (license shown on page) |
|---|---|---|---|
| Pistol | Pistol | `assets/models/gun_pistol.glb` | https://poly.pizza/m/J3i9KDQ3kt (CC0 1.0) |
| Combat Shotgun | Shotgun | `assets/models/gun_shotgun.glb` | https://poly.pizza/m/ZmPTnh7njL (CC0 1.0) |
| Assault Rifle | Assault Rifle | `assets/models/gun_rifle.glb` | https://poly.pizza/m/Bgvuu4CUMV (CC0 1.0) |
| Plasma Caster | Scifi Assault Rifle | `assets/models/gun_scifi_rifle.glb` | https://poly.pizza/m/j40c8VDdAQ (CC0 1.0) |
| Rocket Launcher | Rocket Launcher | `assets/models/gun_rocket.glb` | https://poly.pizza/m/GCqUvqleqN (CC0 1.0) |
| Wrench (melee) | | built by RetroEngine's code | original |

Changes made: models are resized, re-coloured darker and rougher for the gritty look, and given a rim light at runtime. Lights and cameras embedded in the files are removed when they load.

## Music (CC BY 4.0, attribution required)
License: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/
The original five tracks were re-encoded to 112 kbps stereo MP3. The five tracks added in 1.2.0 were re-encoded to 40 kbps mono MP3 to keep the download small. Nothing else was changed.

| Track | Artist | Style | File | Source |
|---|---|---|---|---|
| "Metalmania" | Kevin MacLeod (incompetech.com) | Metal | `assets/music/metalmania.mp3` | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700023 |
| "Aggressor" | Kevin MacLeod (incompetech.com) | Orchestral metal | `assets/music/aggressor.mp3` | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700051 |
| "Lewis and Dekalb" | Kevin MacLeod (incompetech.com) | Trap | `assets/music/lewis_and_dekalb.mp3` | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600027 |
| "Griphop" | Kevin MacLeod (incompetech.com) | Hip-hop | `assets/music/griphop.mp3` | https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100413 |
| "Hitman" | Kevin MacLeod (incompetech.com) | Industrial | `assets/music/hitman.mp3` | https://incompetech.com/music/royalty-free/index.html?Search=Hitman |
| "Volatile Reaction" | Kevin MacLeod (incompetech.com) | Industrial rock | `assets/music/volatile_reaction.mp3` | https://incompetech.com/music/royalty-free/index.html?Search=Volatile+Reaction |
| "Industrial Revolution" | Kevin MacLeod (incompetech.com) | Industrial | `assets/music/industrial_revolution.mp3` | https://incompetech.com/music/royalty-free/index.html?Search=Industrial+Revolution |
| "Crypto" | Kevin MacLeod (incompetech.com) | Dark synth | `assets/music/crypto.mp3` | https://incompetech.com/music/royalty-free/index.html?Search=Crypto |
| "Danger Storm" | Kevin MacLeod (incompetech.com) | Action industrial | `assets/music/danger_storm.mp3` | https://incompetech.com/music/royalty-free/index.html?Search=Danger+Storm |
| "Seismic" | Shane Ivers (silvermansound.com) | Trap | `assets/music/seismic.mp3` | https://www.silvermansound.com/free-music/seismic |

Attribution text, as requested by the artists:
- "Metalmania", "Aggressor", "Lewis and Dekalb", "Griphop", "Hitman", "Volatile Reaction", "Industrial Revolution", "Crypto", "Danger Storm": Kevin MacLeod (incompetech.com). Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/
- "Seismic": Shane Ivers, https://www.silvermansound.com. Licensed under Creative Commons Attribution 4.0 International.

The game also has synthesized background music, generated live by RetroEngine's code (original). It plays when the tracks can't load.

## Textures: original (made by RetroEngine)
Procedural PBR materials, including the 1.4.0 white marble set (`marble`, `marble_veined`, `marble_stained`, `marble_dark`) and a cheap animated `water` plane for the shrine pool.
All wall, floor and ceiling materials are generated by code inside `dmbtech1.js` when the game starts. No image files or third-party textures are used. The sky scenes are generated the same way. Colour, normal (bump) and glow maps are drawn with procedural noise.

Industrial / dystopian set: Concrete, Bunker Concrete, Grimy Brick, Weathered Brick, Steel Panels, Tech Wall, Rusted Steel, Riveted Bulkhead, Vent Grille, Floor Grate, Hazard Stripes, Hazard Chevrons, Stained Concrete, Ceramic Tile, Industrial Tile, Tread Plate, Asphalt, Asphalt (Lines), Sidewalk, Curb, Wood Planks, Ceiling Panels, Ceiling Lights, Server Racks, Chain-Link Fence, Blast Door, and the Red, Blue and Yellow Key Doors.

Clean / well-lit set (1.2.0): Lab Wall Panels, Office Wall, Med-Bay Wall, Polished Tile, Brushed Aluminium, and Bright Ceiling Lights. These skip the usual grime pass so labs and offices stay bright.

## Environment props (1.2.0): Quaternius, CC0 1.0

Low-poly sci-fi / industrial props by **Quaternius**, from the free Standard versions of the Sci-Fi Essentials Kit and the Modular Sci-Fi MegaKit. License: CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/). Official pack pages and the OpenGameArt Standard zips we downloaded:

- Sci-Fi Essentials Kit: https://quaternius.com/packs/scifiessentialskit.html · https://opengameart.org/content/sci-fi-essentials-kit
- Modular Sci-Fi MegaKit: https://quaternius.com/packs/modularscifimegakit.html · https://opengameart.org/content/modular-sci-fi-megakit

Textures were resized to 256px JPEG and normal / ORM maps were dropped so the added files stay under 3 MB. Geometry is the original mesh. Fifteen placeable props use these GLBs. Each keeps a procedural fallback if the file fails to load.

| In-game prop | File | Source model | Pack |
|---|---|---|---|
| Supply Crate | `assets/models/prop_crate.glb` | Prop_Crate | Sci-Fi Essentials Kit (Standard) |
| Crate Stack | `assets/models/prop_crate_tall.glb` | Prop_Crate_Large | Sci-Fi Essentials Kit (Standard) |
| Explosive Barrel | `assets/models/prop_barrel.glb` | Prop_Barrel1 | Sci-Fi Essentials Kit (Standard) |
| Desk | `assets/models/prop_desk.glb` | Prop_Desk_Medium | Sci-Fi Essentials Kit (Standard) |
| Lab Bench | `assets/models/prop_lab_bench.glb` | Prop_Desk_L | Sci-Fi Essentials Kit (Standard) |
| Lockers | `assets/models/prop_locker.glb` | Prop_Locker | Sci-Fi Essentials Kit (Standard) |
| Server Rack | `assets/models/prop_server.glb` | Prop_Shelves_WideTall | Sci-Fi Essentials Kit (Standard) |
| Metal Shelves | `assets/models/prop_shelves.glb` | Prop_Shelves_WideShort | Sci-Fi Essentials Kit (Standard) |
| Steel Pillar | `assets/models/prop_pillar.glb` | Column_Simple | Modular Sci-Fi MegaKit (Standard) |
| Pipe Cluster | `assets/models/prop_pipes.glb` | Column_Pipes | Modular Sci-Fi MegaKit (Standard) |
| Terminal | `assets/models/prop_terminal.glb` | Prop_Computer | Modular Sci-Fi MegaKit (Standard) |
| Control Console | `assets/models/prop_console.glb` | Prop_AccessPoint | Modular Sci-Fi MegaKit (Standard) |
| Chem Vat | `assets/models/prop_vat.glb` | Prop_Barrel_Large | Modular Sci-Fi MegaKit (Standard) |
| Industrial Fan | `assets/models/prop_fan.glb` | Prop_Fan_Small | Modular Sci-Fi MegaKit (Standard) |
| Vent Grille | `assets/models/prop_vent.glb` | Prop_Vent_Big | Modular Sci-Fi MegaKit (Standard) |


## Player models (1.2.0)

Third-person / remote-player models. Each GLB is **lazy-loaded only when that model is used** (`RT.createRemotePlayer(modelId)` or the play handle). The in-game character picker does not prefetch them. A procedural fallback is used if a file fails to load. `setPose(x, y, z, yaw, anim)` plays Idle / Walk / Shoot / Hit / Death. Each model has a distinct team tint applied at runtime. Not ripped from Quake or any id Software game.

### Quaternius Animated Mech Pack — CC0 1.0

George, Leela, Mike and Stan. Official pack: https://quaternius.com/packs/animatedmech.html · OpenGameArt Standard zip: https://opengameart.org/content/animated-mech-pack (License.txt in the zip is CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/). Official albedo textures were attached, resized to 512px JPEG. Unused clips were dropped.

### SWAT — CC0 1.0

The same Quaternius SWAT already used as the enemy grunt, also offered as a player model. https://poly.pizza/m/Btfn3G5Xv4

### Sci Fi Character — CC-BY (attribution required)

By **Quaternius**, from Poly Pizza. License: Creative Commons Attribution (CC-BY). Please credit Quaternius when you use this model. Source: https://poly.pizza/m/4pUXv5V8kq · https://creativecommons.org/licenses/by/4.0/

| Player id | File | Source | License | Team tint |
|---|---|---|---|---|
| george | `assets/models/player_george.glb` | Animated Mech Pack · George | CC0 1.0 | cyan |
| leela | `assets/models/player_leela.glb` | Animated Mech Pack · Leela | CC0 1.0 | orange |
| mike | `assets/models/player_mike.glb` | Animated Mech Pack · Mike | CC0 1.0 | red |
| stan | `assets/models/player_stan.glb` | Animated Mech Pack · Stan | CC0 1.0 | lime |
| swat | `assets/models/soldier_swat.glb` (shared with the enemy grunt) | SWAT, Poly Pizza | CC0 1.0 | violet |
| scifi | `assets/models/player_scifi.glb` | Sci Fi Character, Poly Pizza | CC-BY | magenta |

## PRO campaign: Sgt. Protagonist's suit
| Asset | File | Source | License |
|---|---|---|---|
| Pro's armored suit (and the arm cannon cut from it) | `pro/assets/pro_suit.glb`, `pro/assets/pro_cannon.glb` | Generated by Darcy D. Demby with Meshy AI (image to 3D), then slimmed with glTF-Transform (MIT) | Darcy D. Demby's own asset |

The ring projectiles, story cards and broadcast screen are original work.

## Props, pickups, turret, effects and sound: original
The **med cabinet**, **extinguisher**, **generator**, **floor lamp**, traffic cone, debris and sandbags, plus every pickup, keycard, the Sentry Turret, the fallback enemy robots, particles and every sound effect, are built or synthesized by DMB Tech 1 (WebAudio for sound). Those procedural prop meshes also stay on screen if a GLB above fails to load. No sound files are used except the music above.

## Code and fonts
| Component | License | Source |
|---|---|---|
| Three.js r128 (3D engine, loaded from cdnjs) | MIT | https://github.com/mrdoob/three.js/blob/r128/LICENSE |
| GLTFLoader and SkeletonUtils (Three.js examples, from jsDelivr) | MIT | https://github.com/mrdoob/three.js/tree/r128/examples/js |
| Chakra Petch font (Cadson Demak, from Google Fonts) | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Chakra+Petch |
| RetroEngine editor, engine, starter levels, help and tests | Original work | |

## Your own content
If you add your own models in Project → Custom 3D models, or share levels that use them, use only assets whose license allows it (for example CC0 or CC BY), and credit their authors.
