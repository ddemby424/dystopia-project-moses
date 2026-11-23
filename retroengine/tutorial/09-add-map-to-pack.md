# Lesson 9 — Add a map to the site pack

**Time:** about 10 minutes
**Payoff:** a Play link of the form `#pack=maps/your-name.retro` that loads your map in the hosted app.

The trial pack is just files in `maps/`. Visitors open `maps/index.html`, tap Play, and RetroEngine fetches the `.retro` from the same site.

## 1. Name the file carefully

The loader only accepts a tight path. This is the real check in `app.js`:

```javascript
// Official trial maps: #pack=maps/name.retro (same origin only).
// Also allowed: packs/name.retro. Letters, numbers, dot, underscore, hyphen.
const PACK_PATH = /^(?:maps|packs)\/[A-Za-z0-9][A-Za-z0-9._-]*\.retro$/;
```

Good: `maps/pad-drill.retro`. Bad: spaces, folders deeper than one level, or a path that starts with `/` or `https://`. The hash is loaded with `fetch` and is rejected if the file is on a different origin.

## 2. Put the file in maps/

1. Export your level as a `.retro` (Lesson 8).
2. Copy it to the source folder as `maps/pad-drill.retro` (use your real slug).
3. Optional: add a screenshot at `maps/shots/pad-drill.png`.

## 3. Add a row to manifest.json

`maps/manifest.json` is the pack catalog. It is not what the game loads at Play time (Play loads the `.retro` directly), but it is the record of the pack. Open it and append one object to the `maps` array. Copy the shape of an existing entry:

```javascript
{
  "slug": "pad-drill",                 // short id, usually matches the file name
  "name": "Pad Drill",                 // title shown to people
  "file": "pad-drill.retro",           // file name inside maps/
  "blurb": "A tiny escape-pad drill with a yellow door and a Titan.",
  "w": 40,                             // map width in cells
  "h": 32,                             // map height in cells
  "par": 180,                          // par time in seconds (Level tab)
  "sky": "night",                      // one of: night, dusk, overcast, toxic, void
  "track": "metalmania"                // a MUSIC_TRACKS id, or omit
  // The trial entries also store ents / enemies / pickups counts from the build script.
}
```

Bump the pack `"version"` at the top of the file if you are shipping a new pack release (the 1.0.2 pack uses `"1.0.2"`).

## 4. Add a card to maps/index.html

Copy one of the three `<article>` blocks and change:

- the shot `src` and `alt`
- the `<h2>` title and the blurb
- the Play href
- the Download href

The Play link must be relative to the app root:

```html
<!-- From maps/index.html, ../index.html is the editor. The hash is the pack path. -->
<a class="btn play" href="../index.html#pack=maps/pad-drill.retro">Play</a>
<a class="btn dl" href="pad-drill.retro" download>Download</a>
```

On the live site that becomes:

```
https://ddemby424.github.io/dystopia-project-moses/retroengine/index.html#pack=maps/pad-drill.retro
```

When the editor sees `#pack=...` at boot (or on `hashchange`), `openFromPack` fetches that file, imports it, and starts Playtest. Because `how === 'pack'`, **the level script stays on**.

Menu → **Trial map pack** simply goes to `maps/` next to the current page.

## 5. Build and check

Run `python3 build.py` from the source folder so `../retroengine/maps/` gets the new file (Lesson 11). Preview the built `maps/index.html`, tap Play, and confirm your map starts.

`tools/build_trial_maps.py` is how the *original three* maps were authored in Python. You do not have to use it for a map you already exported from the editor.

> **Do this now.** Drop your `.retro` into `maps/`, add the Play link on a local copy of `maps/index.html`, preview, and tap Play. You should land in your level after the splash.

> **Payoff:** that `#pack=` URL is what you can put in a TikTok bio or on the pack page, the same way Plant 4 / Drainworks / Nightwatch already work.
