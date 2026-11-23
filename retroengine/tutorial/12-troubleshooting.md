# Lesson 12 — Troubleshooting

**Time:** about 5 minutes
**Payoff:** a short list you can actually use when something is blank, silent, or missing.

## Black screen, or "needs Three.js"

The 3D library (three.js r128) loads from a CDN on first launch. Go online once, then reload. If you are in an in-app browser (TikTok, Instagram, Facebook), open the link in Chrome, Samsung Internet, Firefox, or Safari instead.

## "3D NOT AVAILABLE" / WebGL

Playtest shows a panel: this browser could not start WebGL. The **editor still works**. Try a full browser (not an in-app one), turn off battery saver or "lite" mode, and enable hardware acceleration. Update the browser if it is very old.

## Enemies look like simple robots, music is synth

The asset pack did not load. That is normal when the page is opened as `file://` with no internet. Preview through Spck/Acode, or use the [hosted app](https://ddemby424.github.io/dystopia-project-moses/retroengine/). Check the console for `RetroEngine: model failed to load`.

## A new GLB never appears

- Path typo in `ASSET_PACK` (it is relative, like `assets/models/name.glb`).
- You edited `app.js` but are playing `retroengine.html` without running `build.py`.
- The hosted `assetBase` does not have the new file yet (you changed source but did not publish `assets/`).
- The file is huge or not a real `.glb`. Lights in the file are stripped; they will not "light up" the level.

## A custom upload vanished, or "storage is full"

Browser storage is about 5–10 MB per site. Uploaded models fill it quickly. Export a `.retroengine.json` or `.retro`, remove unused models (Project → Custom 3D models → ✕ or All built-in), and import again.

## Share link does nothing

Some in-app browsers block the share sheet and the clipboard. Select the URL in the box and copy it, or export a `.retro`. Remember the ~7 KB (`LINK_MAX` 7500) cap, and that `file://` links only work on that device.

## `#pack=` says the link is not valid, or the map does not load

The path must match `maps/name.retro` or `packs/name.retro` with a simple file name. It must be on the **same origin** as the app. A typo, a missing file on Pages, or a cross-site URL will toast an error.

## Mouse look will not lock

Some browsers block pointer lock. Drag to look instead. On a phone, drag the right half of the screen (or drag on FIRE to aim).

## Slow on a phone

Leave Graphics quality on **Auto**, or pick Low in Settings. Close other apps. Turn off battery saver (it caps frame rate). The known limit is that very old phones may stay under 60 fps even on Low.

## Playtest will not start

Menu → **Check level**. If the start is inside a wall or door, that is an error and Play is blocked. Other issues (no exit, unreachable pad, entity in a wall) are listed as warnings or errors.

## A level script does nothing

Imported file and share-link scripts are moved to `scriptPending` and cleared from `script` until you review and **Apply** them (Lesson 13). Pack scripts stay on. A syntax error toasts `Script syntax error` on Apply, or `Script error: ...` at run time.

## Sound is silent

Phones require a tap before audio. Tap the splash (**TAP TO BOOT**), and tap once in the game if you skipped that. Check Master / Effects / Music sliders in Settings.

## Autosave looks gone

You may be in a different browser, private mode, or the site data was cleared. This is why Lesson 8 tells you to export `.json` / `.retro` files.

> **Do this now.** Pick one thing you have actually seen go wrong (or open the app in a second browser and try a `#pack=` typo on purpose). Find the matching row above.

> **Payoff:** when the screen is black or a model is missing, you have a first place to look instead of starting over.
