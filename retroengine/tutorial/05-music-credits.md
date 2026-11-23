# Lesson 5 — Music, sounds, textures, and credits

**Time:** about 8 minutes
**Payoff:** a new track in the Pause menu music player, with a legal credit line.

## Music files

Put the audio file here:

```
assets/music/my_track.mp3
```

Then add one object to the real `MUSIC_TRACKS` list in `app.js`. This list is also what the Level tab and the in-game music player use.

```javascript
const MUSIC_TRACKS = [
  // id is what a level stores in props.track. file is relative to the app folder.
  { id: 'metalmania', file: 'assets/music/metalmania.mp3', title: 'Metalmania', artist: 'Kevin MacLeod', genre: 'Metal', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700023' },
  { id: 'seismic', file: 'assets/music/seismic.mp3', title: 'Seismic', artist: 'Shane Ivers', genre: 'Trap', license: 'CC BY 4.0', url: 'https://www.silvermansound.com/free-music/seismic' },
  { id: 'aggressor', file: 'assets/music/aggressor.mp3', title: 'Aggressor', artist: 'Kevin MacLeod', genre: 'Orchestral metal', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700051' },
  { id: 'lewis_and_dekalb', file: 'assets/music/lewis_and_dekalb.mp3', title: 'Lewis and Dekalb', artist: 'Kevin MacLeod', genre: 'Trap', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600027' },
  { id: 'griphop', file: 'assets/music/griphop.mp3', title: 'Griphop', artist: 'Kevin MacLeod', genre: 'Hip-hop', license: 'CC BY 4.0', url: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100413' }
  // Add your track as one more object, then pick its id in the Level tab.
];
```

A new line looks like this:

```javascript
// id must be unique. The Level tab will show title — artist (genre).
{ id: 'my_track', file: 'assets/music/my_track.mp3', title: 'My Track', artist: 'Artist Name', genre: 'Trap', license: 'CC BY 4.0', url: 'https://example.com/the-track-page' },
```

The player does `TP.audio.src = assetBase + t.file`. If the MP3 is missing, that track fails and RetroEngine can fall back to **Synth ambient**, which is generated in code and works offline.

Only add music you have the rights to. CC BY 4.0 requires a credit. CC0 does not require one, but credit the author anyway.

## Sound effects are not files

Gunshots, doors, pickups, and so on are synthesized with the Web Audio API inside the `Sound` object in `app.js`. There is no `assets/sfx/` folder. `api.sound(name)` in a level script (Lesson 13) can play those named effects: `pistol`, `pulse`, `rifle`, `shotgun`, `rocket`, `plasma`, `wrench`, `hit`, `explode`, `bolt`, `alert`, `pain`, `edie`, `hurt`, `pickup`, `weapon`, `key`, `door`, `locked`, `empty`, `step`, `reload`, `reload2`, `jump`, `win`, `ui`.

## Textures are not image files either

The 20 wall, floor, and ceiling looks are painted in code when the game starts (`TEX_DEFS`, then `paintTexture`). Names you will see in the Build tab include Concrete, Bunker Concrete, Grimy Brick, Steel Panels, Tech Wall, Rusted Steel, Floor Grate, Hazard Stripes, Ceramic Tile, Industrial Tile, Tread Plate, Asphalt, Wood Planks, Ceiling Panels, Ceiling Lights, Server Racks, Blast Door, and the Red, Blue and Yellow Key Doors. Sky scenes (Night City, Red Dusk, Overcast, Toxic Haze, Black Void) are also generated. There is nothing to drop into an `assets/textures/` folder.

## How to add a credit to CREDITS.md

Open `CREDITS.md` in the source folder and add a row next to the others, in the right section.

For a **CC0** model:

```markdown
| In game | Original title | File | Source (license shown on page) |
|---|---|---|---|
| My Soldier | Original Name | `assets/models/my_soldier.glb` | https://the-source-page (CC0 1.0) |
```

For **CC BY** music, copy the existing table shape and include the attribution line the artist asked for, for example:

```markdown
| "My Track" | Artist Name | Trap | `assets/music/my_track.mp3` | https://the-source-page |
```

And under the attribution list:

```markdown
- "My Track": Artist Name, https://the-source-page. Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/
```

Menu → **About & credits** reads the in-game `MUSIC_TRACKS` list (and the built-in model credits). Keep `CREDITS.md` in sync so the shipped folder is honest.

> **Do this now.** Open `CREDITS.md` and Menu → About & credits, and match one music row in both places (for example "Seismic" by Shane Ivers). If you are not adding a file today, just confirm you know where the next credit would go.

> **Payoff:** you will not ship a track or model without a license line. That is the badge of a real release.
