# Lesson 2 — Open RetroEngine on your phone

**Time:** about 5 minutes
**Payoff:** the DMB TECH 1 splash, then the editor, running on your phone.

Use **Spck Editor** or **Acode** on Android. Both can serve the folder so models and music load. Opening `index.html` straight from the Files app uses `file://`, and the browser then blocks those local asset files. RetroEngine has a fallback for that (it tries the hosted copy, or built-in robots and synth music), but a preview server is the honest way to work.

## In Spck Editor

1. Copy the RetroEngine folder (or `retroengine-release.zip`) onto the phone.
2. Create a new project, then **Import → from ZIP**, or unzip it and open the folder as a project.
3. Open `index.html`.
4. Tap **▶ Run / Preview**. Spck serves the files, so `assets/models/` and `assets/music/` load.
5. For a bigger view, use Spck's "open in browser" option.

## In Acode

1. Open the project folder (the one that contains `index.html`).
2. Use Acode's preview / browser preview so the page is served, not opened as a raw file.
3. Stay on `index.html` for editing. The single-file `retroengine.html` is for sending or offline play, not for day-to-day edits (changes in `app.js` would not be in it until you run `build.py`).

## First boot

1. You should see the splash: **RETROENGINE**, the **DMB TECH 1** stamp, and the credits (Darcy D. Demby, Chief Software Architect, DembySoftwareSystems, Making cool tools with AI...).
2. Tap once (**TAP TO BOOT**). The first tap is also what lets the phone play sound.
3. After the splash, you are in the editor. If this browser has never seen the help flag (`retroengine.seenHelp.v1`), the help / tutorial card may open.
4. Tap **Play** on a starter level, or open Menu → **Trial map pack**.

The very first launch needs the internet: three.js r128 and the font load from a CDN (`cdnjs`, `jsDelivr`, Google Fonts). After that, a lot still works offline, with synth music and procedural models as fallbacks.

> **Do this now.** Preview `index.html`, tap the splash, and press **Play** on any starter level (the level picker in the top bar). Walk with the left half of the screen, look with the right half, and fire.

> **Payoff:** you are in a 3D level you can also edit. If the screen stays black or you see "3D NOT AVAILABLE", jump to [Lesson 12](12-troubleshooting.md).
