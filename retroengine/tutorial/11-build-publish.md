# Lesson 11 — Build and publish

**Time:** about 10 minutes
**Payoff:** a fresh `../retroengine/` folder and a checklist for GitHub Pages, the changelog, and a version tag.

## What build.py does

From the **source** folder (the one that contains `build.py`):

```
python3 build.py
```

On a phone, Acode and some Termux setups can run that if Python is installed. If not, run it on a computer that has the source.

The script (this is the real behavior, not a guess):

1. Reads `app.js`, `styles.css`, `index.html`, and `help_content.html`.
2. Inlines the help HTML into `app.js` where the marker `/*@@HELP@@*/''` sits, then writes `../retroengine/app.js`.
3. Copies `dmbtech1.js` (from `../dmbtech1/dmbtech1.js` or a copy next to the sources) into `../retroengine/dmbtech1.js`.
4. Copies `styles.css`, `index.html`, `README.md`, `CHANGELOG.md`, `CREDITS.md`.
5. Replaces `../retroengine/assets/` with a fresh copy of `assets/`.
6. Copies `maps/`, skipping `.py` files and `__pycache__`.
7. Copies `docs/tutorial/` into `../retroengine/tutorial/` (skipping the builder `.py`), and writes `tutorial/index.html`.
8. Writes `../retroengine/retroengine.html` as a copy of `index.html` (a module launcher; it is not a fully inlined single file) and copies it to `retroengine.txt`.
9. Builds `../retroengine/help.html` from `help_template.html`.
10. Prints the JS line count and the `dmbtech1.js` size.

## Version bumps

When the release is real, update every place the version is stated:

1. `const VERSION = '1.2.1';` at the top of `app.js` (this is what About and exports show). The engine library has its own `VERSION = '1.1.0'` in `dmbtech1.js`.
2. A new `## 1.1.x (date):` section at the **top** of `CHANGELOG.md`.
3. `README.md` if the title still says an old major version.
4. `maps/manifest.json` `"version"` if the pack changed.
5. Any pack page copy in `maps/index.html` / `maps/README.md` if needed.

The previous shipped tag was `retroengine-v1.0.2`. Keep that pattern: `retroengine-vMAJOR.MINOR.PATCH`.

## GitHub Pages

The live app is the built `retroengine/` folder of the GitHub repo `ddemby424/dystopia-project-moses`:

- App: `https://ddemby424.github.io/dystopia-project-moses/retroengine/`
- Pack: `https://ddemby424.github.io/dystopia-project-moses/retroengine/maps/`

After `build.py`, the contents of `../retroengine/` are what should be committed to that `retroengine/` path on `main` (or whatever branch Pages is serving). Keep `assets/` next to `index.html`. Then:

1. Commit the built files plus the source changes and the changelog.
2. Push to GitHub.
3. Create an annotated tag, for example `retroengine-v1.2.1` (and `dmbtech1-v1.1.0` when the engine library ships on its own), and a GitHub Release with notes (see `CHANGELOG.md`).
4. Open the live URLs in a phone browser (not only the preview) and tap a `#pack=` link.

GitHub Pages can take a short time to update. Hard-refresh if you still see the old version in Menu → About & credits.

## Exporting a whole game without Pages

Menu → **Export playable game (.html)** builds an HTML file with all of the current project's levels. The page imports the standalone DMB Tech 1 library (`dmbtech1.js`) and Three.js r128. Models and music still load from wherever the editor is hosted (`assetBase`), with procedural / synth fallbacks offline. Keep `dmbtech1.js` reachable at the baked-in URL, or place a copy next to the HTML. The official site still wants the full `retroengine/` folder so the map pack and assets stay together.

> **Do this now.** Run `python3 build.py` (when you can) and confirm `../retroengine/app.js`, `maps/`, and `retroengine.html` have fresh timestamps. Open the built `index.html` in a preview and check the version on the About screen.

> **Payoff:** you have a publishable folder and a version ritual. Shipping is a checklist, not a mystery.
