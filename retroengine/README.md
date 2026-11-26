# RetroEngine 1.1: make your own retro 3D shooter in the browser

RetroEngine is a free game maker for old-school first-person shooters in the style of Doom, Duke Nukem 3D and Quake. You draw a level on a grid, drop in enemies, weapons and doors, and press **Play** to run around in it straight away. It works on phones (including foldables), tablets and computers. No install and no account are needed.

Version **1.2.1** is powered by the standalone [DMB Tech 1](../dmbtech1/) library (1.1.0). Other developers can use that engine without this editor.

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | Open this to start RetroEngine (uses `styles.css`, `app.js`, and `dmbtech1.js`) |
| `dmbtech1.js` | The standalone **DMB Tech 1** engine that powers play mode |
| `mp/` | Optional multiplayer lobby and WebSocket client (Menu → Multiplayer) |
| `retroengine.html` | A module launcher (same as `index.html`); keep `dmbtech1.js` next to it |
| `help.html` | The full manual as a web page (it is also built into the app: Menu → Help) |
| `tutorial/` | Tinkerer tutorial: adding maps, assets, and code (Menu → Tutorial) |
| `maps/` | Trial map pack page and five official `.retro` maps |
| `assets/models/` | The 3D enemies and guns (`.glb`, CC0) |
| `assets/music/` | Ten music tracks (`.mp3`, CC BY 4.0) |
| `README.md`, `CHANGELOG.md`, `CREDITS.md` | This file, the version history, and who made what |

## Features
- **Level editor:** walls, floors, ceilings, raised floors and stairs, doors and keycard doors. Includes rectangle and fill tools, select/move, copy/paste, undo/redo, and pinch-zoom on phones.
- **Rooms library:** 22 ready-made rooms and buildings you can stamp in and rotate. You can save your own.
- **3 polished starter levels:** *Outpost Breach*, *Server Hall G* and *Foundry Core*.
- **Enemies:** soldiers, gun drones, heavy walkers, sentry turrets and a Titan boss. They are animated, rigged 3D models with smooth blending between idle, run, shoot, hit and death.
- **Smart bots:**
  - They warn their squadmates when they spot you.
  - They side-step while reloading, and some flank you.
  - They duck behind cover when hurt, then pop back out.
- **Difficulty:** *Easy*, *Normal* and *Hard* change enemy health, speed, damage, reaction time, fire rate and how many flank.
- **Six weapons:** wrench, Pulse Cannon (default starting gun, infinite ammo), shotgun, assault rifle, plasma caster and rocket launcher. Guns have reload animations, recoil, sway, bob and shell casings.
- **Pickups and props:** health, armour, ammo, keycards, secrets, explosive barrels and over twenty kinds of props, most of them CC0 Quaternius models with a procedural fallback.
- **Multiplayer:** Menu → Multiplayer opens a lobby to create or join a room. All six player models are in the character list. If the server is offline, the lobby says so and single-player still works. From 1.6.0, each model gets a miniature preview card, and the one you pick spins live. In 1.6.1 the lobby was redesigned: a Play pane (live preview, miniature grid, name, a Character dropdown with miniatures, and a New room form with a Map dropdown) and an Open rooms pane, side by side on wide screens and as tabs on phones.
- **Look:** 20 gritty textures with lighting, shadowed corners, fog, sky scenes, coloured lights and a flashlight.
- **Music player:** 5 rap/trap and metal tracks. You can pick one per level or skip tracks in the pause menu.
- **Level scripts (optional):** short scripts for messages, triggers and rewards, for example "open this door when all enemies are dead".
- **Sharing:**
  - Send a level as a **link** or as a **.retro file** (see below).
  - Export your whole game as a **playable .html file** (it loads the DMB Tech 1 library).
- **Built-in help:** a quick start, an interactive first-level tutorial, a full manual, and the Tinkerer **Tutorial** (Menu → Tutorial) that teaches maps, assets, saving files, and changing code, including scripts and APIs.

## Controls

| | Keyboard and mouse | Touch |
|---|---|---|
| Move | WASD (Shift = run) | Drag on the left half of the screen |
| Look | Mouse (click to lock the pointer; drag if your browser blocks that) | Drag on the right half |
| Shoot | Left click | FIRE (hold it and drag to aim) |
| Reload | R (also automatic when empty) | RLD |
| Use / open doors | E | USE |
| Jump | Space | JUMP |
| Change weapon | 1–6, Q or mouse wheel | SWAP |
| Map, flashlight, pause | M, F, Esc | Buttons at the top |

**Editor:** with one finger (or the mouse) you use the selected tool. Two fingers (or the middle mouse button / Space+drag) pan and zoom. Most tools have a keyboard shortcut, such as B for wall, R for rectangle and T for things.

## How to open it in Spck Editor (Android)
1. Copy `retroengine-release.zip` to your phone.
2. In **Spck Editor**, create a new project, then choose **Import → from ZIP** and pick the zip. Alternatively, unzip it with the Files app and open the folder as a project.
3. Open `index.html` and tap the **▶ Run / Preview** button. Spck serves the files through its own preview server, so the 3D models and music load properly.
4. For the full-screen experience, tap Spck's "open in browser" option, or put the folder online (see "Publishing").

Without Spck you can also simply open `retroengine.html` in Chrome, Samsung Internet, Firefox or Safari. When a file is opened straight from storage (`file://`), the browser blocks loading the models and music from the `assets` folder. RetroEngine then fetches them from the hosted copy, or falls back to built-in robots and synth music, so it always works.

Your work **autosaves** in the browser. Use **Menu → Projects** for named save slots and **Menu → Export project file (.json)** for real backups.

## Sharing your levels
- **Share link:** open the **Level** tab → *Share this level* → **Share link**.
  - The whole level is packed into the link itself, so no server or account is needed.
  - On phones the share sheet opens (WhatsApp, Messages, Discord…). On computers the link is copied.
  - Whoever opens the link lands straight in the game with your level. *Back to editor* shows how it was built.
- **.retro file:** **Export .retro** saves a small file with the level and any custom models. Use it when a level is too big for a link (over about 7 KB; RetroEngine tells you).
  - Friends open it with **Menu → Import level (.retro)** or by dragging it onto the editor.
- **Whole game:** **Export** makes one `.html` file containing all your levels that anyone can play.
- **Safety:** level scripts from other people are switched **off** when you import them. You can read the script in the Level tab and turn it on only if you trust it.

## PRO campaign (1.5.0, standalone from 1.5.1)

Open `retroengine/pro/` (for example `http://localhost:8765/retroengine/pro/`).
From 1.5.1, Pro is its own game. It has a splash screen with a spray-painted PRO title, Sgt. Protagonist spinning with an ion charge building in his cannon, a loading bar and a **Powered by DMB Tech 1** badge (tap to continue), and none of the editor's branding. From 1.6.1, the title card offers **Play Online** or **Download / Install App**. The install button opens the browser's own install dialog on Chrome, Edge and Android, and shows the exact steps on Safari/iOS and Firefox. `pro/sw.js` is a network-first service worker that exists only to make Pro installable.
You play Sgt. Protagonist (nicknamed Protag, Pro or Sgt Taggs) through seven linked chapters (from 1.6.0): Lab → Yard → Drains → Factory → Roof → Catacomb Relay → Marble Shrine. After that comes the ending broadcast.
You fight hovering red-and-black twin-cannon troopers, Dystopia drones, Ballisticus sentinels, and AntiLegend's Minotaur at the end.
Each exit pad stays sealed until that chapter's goal is met. Your progress is saved in the browser by chapter name (1.6.1 save format, so older saves start fresh on Chapter 1). A reload offers **Continue**, and the **Chapter Select** dropdown opens any of the seven chapters.
Pro's arm cannon is your gun, and it fires cyan energy rings.
From 1.6.0 you can **dash** with Shift or Q, or the DASH button on a phone. Pro also has its own HUD with a compass, a waypoint arrow and distance, hitmarkers, kill streaks, health and shield orbs, and Web Audio sound effects (`pro/juice.js`).
You can spin the slim suit at `retroengine/pro/preview.html`.

| File | What it is |
|---|---|
| `pro/campaign.json` | chapter order, story text, exit goals, view-model sizing |
| `pro/pro.js` | campaign host: loads the maps, story cards, exit seals, save/resume |
| `pro/juice.js` | 1.6.0 feel layer: Pro HUD, compass + waypoint, hitmarkers, dash, streaks, orbs, Web Audio SFX |
| `pro/install.js`, `pro/sw.js` | 1.6.1 Install App button (`beforeinstallprompt` or per-browser steps) + the install-only service worker |
| `pro/viewer.js` | small turntable for Pro's model (cards + preview) |
| `pro/assets/pro_suit.glb` | Pro's suit with glowing Sgt. chevrons on both shoulders, 31,232 triangles, 1.83 MB |
| `pro/manifest.webmanifest`, `pro/assets/icon-*.png` | home-screen install as "Pro" |
| `pro/spray.js` | spray-paint title animation (overspray, speckle, drips) |
| `pro/assets/pro_splash.webp` | still render of the slim suit, shown while the 3D model loads |
| `pro/assets/pro_cannon.glb` | his right-arm cannon, 5,034 triangles, 390 KB (first-person gun) |
| `pro/assets/pro_enemy.glb` | twin-cannon trooper, 19,865 triangles, 1.08 MB (1.6.0) |
| `pro/assets/bot_drone.glb` | Dystopia drone, 104 KB (1.6.0) |
| `pro/assets/pro_sentinel.glb` | Ballisticus sentinel / Warden, 14,986 triangles, 1.16 MB (1.6.0) |
| `pro/assets/pro_minotaur.glb` | the Minotaur (AntiLegend), 21,708 triangles, 1.06 MB (1.6.0) |
| `pro/assets/pro_prop.glb` | optional: drop a model here and it appears in the Catacomb Relay |
| `maps/catacomb-relay.retro` | chapter 6 map, 64×64 (1.6.0) |

## Trial map pack
Five official maps are in the `maps/` folder, with a phone-friendly list at `maps/index.html`. Tap **Play** to load a map in RetroEngine, or download the `.retro` file and import it. The first four are escape-pad trials (guards, a Titan, and an exit pad). **Site 12: Dataworks** is a 128×128 multiplayer compound with eight spread-out spawns, an outdoor yard, indoor halls, catwalks, and a clean bright lab wing. **The Marble Shrine** is a white-marble temple with a minotaur boss; the exit pad behind the throne unlocks only after that boss is defeated.

- Links only work for other people when RetroEngine is hosted online. A copy opened from your own device makes links that only open on that device.

## Publishing
Upload the contents of this folder (keep `assets/` next to `index.html`) to any static web host, for example GitHub Pages, Netlify or itch.io (HTML5 game). Then share the address.

## Phones and browsers
Tested in Chromium (Chrome, Samsung Internet and Android webview engine), WebKit (Safari on iPhone/iPad) and Gecko (Firefox), on phone, foldable (folded and unfolded), tablet and desktop screen sizes:
- **Controls:** touch-first, with no need for a mouse, keyboard or pointer lock.
- **Screen fit:** respects notches and home bars, and adapts when you rotate the phone or the address bar shows or hides.
- **Graphics quality "Auto"** (the default) picks settings for your device and lowers the resolution on the fly to stay smooth. *Low/Medium/High* are in Settings.
- **Optional features:** fullscreen, vibration and the share sheet are used only where the browser supports them.
- **Sound** starts on your first tap (a phone rule).
- **Without WebGL:** if a browser can't run 3D, Playtest explains what to do and the editor keeps working.

## Known limits
- **Internet on first launch:** the 3D engine (Three.js) and the font load from the internet, so the very first launch needs a connection.
- **One floor per spot:** you can have stairs, catwalks and raised platforms, but no room directly above another room.
- **No real-time shadows** (corners are darkened instead), and enemies don't open keycard doors. Multiplayer is an optional relay (open Menu → Multiplayer); it is not an authoritative simulation, and rooms live in the server's memory.
- **Browser storage** is about 5–10 MB per site. Uploaded models fill it quickly, so export backups.
- **Share links** are limited to about 7 KB (larger levels use .retro files). Links made from a copy on your own device only open there.
- **iPhone fullscreen:** iPhones don't allow web pages to go full screen, so use landscape for more room. Some in-app browsers (Instagram, Facebook…) block the share sheet and downloads. RetroEngine then shows the link to copy by hand.
- **Phone speed:** on very old or low-end phones the game may run below 60 fps even on Low.
- **Exported .html games** load the 3D models and music from the hosted RetroEngine copy, with built-in fallbacks when offline.

## Credits
3D enemies, guns, arena player mechs (Animated Mech Pack: George, Leela, Mike, Stan, all CC0), SWAT (CC0), Sci Fi Character (**CC-BY**, credit Quaternius) and environment props are by **Quaternius**. The 1.4.0 shrine minotaur and statues use **Brazen Minotaur** by Alice Liu (CC0, [Gobkit](https://gobkit.com/s/gyn4rhpenihc)) (props from the Sci-Fi Essentials Kit and Modular Sci-Fi MegaKit, CC0). Music is by **Kevin MacLeod** and **Shane Ivers** (CC BY 4.0). Textures, fallback props, sound effects and the synth music are generated by RetroEngine's own code. Full list with licenses and links: [CREDITS.md](CREDITS.md). In the app: Menu → About & credits.

RetroEngine was formerly called DOOMFORGE IDE. Old projects and saves are imported automatically.
