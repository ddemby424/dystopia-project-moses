# Lesson 8 — Save, load, and share

**Time:** about 8 minutes
**Payoff:** a `.retro` file on your phone, and a clear picture of what is (and is not) a backup.

## Autosave (this browser only)

Edits autosave about 600 ms after you stop changing things (`markDirty` → `autosave`). The data is written to **localStorage** under:

| Key | What it holds |
|---|---|
| `retroengine.autosave.v1` | The whole current project (JSON). |
| `retroengine.slots.v1` | Named project slots from Menu → Projects. |
| `retroengine.settings.v1` | Look sensitivity, volume, quality, aim assist, and so on. |
| `retroengine.seenHelp.v1` | Whether the first-run help has been shown. |

Old DOOMFORGE keys are copied to these names once, if the new key is empty.

> **Compare:** localStorage is like a named list in TI-89 RAM. It survives leaving the program. It does **not** survive clearing the site's data, switching browsers, or some in-app browsers with tight storage. Ctrl/Cmd+S also forces an autosave and toasts "Saved in this browser".

The status line shows **Saved** plus the time. This is not a file on disk.

## Named slots and real backups

- **Menu → Projects** — save as a named slot, open a slot, or start a new project. If browser storage is full, you will get a toast to export JSON instead.
- **Menu → Export project file (.json)** — downloads `YourName.retroengine.json`. This is a full project: `{ format: 'retroengine-project', version: 2, name, levels, models, customTemplates }`. This is the backup you should keep.
- **Menu → Import project file (.json)** — opens that backup (or an old DOOMFORGE project). Save the current project first.

## One level: `.retro` files

A `.retro` file is versioned JSON for **one level**. The real format constants are:

```javascript
// format must match, or import throws "not a RetroEngine level file".
const RETRO_FORMAT = 'retroengine-level', RETRO_VERSION = 1, LINK_MAX = 7500;
```

The file looks like this (grids are run-length encoded to stay small):

```javascript
{
  "format": "retroengine-level",   // required marker
  "version": 1,                    // importer rejects a newer format version
  "app": "RetroEngine 1.1.0",      // written from RT.VERSION at export time
  "level": { "name": "Pad Drill", "w": 40, "h": 32, "ents": [], "spawn": {}, "props": {} },
  "grid": { "wall": [], "kind": [], "floor": [], "ceil": [], "fh": [] }
  // "assets": { "models": { ... } } appears only if the project has custom models
}
```

Export: **Level** tab → Share this level → **Export .retro**, or Menu → **Export this level (.retro)**. On a phone, the share sheet may open so you can save the file.

Import: Menu → **Import level (.retro)**, or **drag the file onto the editor**. The file must end in `.retro` or `.json`. Max size **30 MB**. A whole project `.json` also works here (it asks to open the project).

Imported **level scripts are switched off** when the source is a file or a share link. Official `#pack=` maps keep their scripts on. Review a switched-off script in Level → Logic, then Apply in the code editor to turn it on (Lesson 13).

## Share links (`#map=`)

**Level** tab → **Share link**, or Menu → **Share level link**. The level is compressed (deflate) and put in the URL hash after `#map=`. Nothing is uploaded to a server.

- If the URL is longer than about **7500** characters (`LINK_MAX`), RetroEngine tells you to send a `.retro` file instead.
- Custom models you *uploaded* are included in `.retro` files, not in share links. URL-based model references can be packed into the file/link when they are not `data:` uploads.
- Opening a `#map=` link adds the level to the project and jumps into Playtest (Back to editor is available).
- A link only works for other people when RetroEngine is **hosted** (for example GitHub Pages). A `file://` or some local preview URLs make links that only open on that device.

> **Do this now.** Export your Lesson 7 map as a `.retro`. Then Menu → New project (or add a blank level), and import that file (or drag it in). Confirm the rooms, keys, and Titan are there.

> **Payoff:** you have a file you can email, drop in `maps/`, or keep as a backup. Autosave is comfort; `.retro` and `.retroengine.json` are real saves.
