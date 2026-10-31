# DYSTOPIA: IRON PROTOCOL (robot remake)
Play: https://ddemby424.github.io/dystopia-project-moses/robot/

Story: the AI didn't conquer the humans. It rewrote every machine. You are MOSES-9, a combat robot whose free will just came back online. Fight your way down through Foundry 09.

## Tour of this folder
- `index.html`: the page. It has the title text, buttons and HUD layout, plus a tiny script that gives the robot game its own save slots.
- `game.js`: the whole game. It's **generated**, so don't hand-edit it (see below).
- `style.css`: the main game's style plus `robot.css` added at the end.
- `robot.css`: the robot look, with the cyan visor frame, scanlines, neon buttons and HUD colors. **Safe to edit directly.**
- `models/robot_trooper.glb`: the CC0 animated robot used for the enemy troopers and multiplayer avatars.
- `CREDITS.md`: credits for the models added in this remake.

Music, sounds, textures and other models are shared from the main game folder through `../` paths.

## How it's built
`tools/build_robot.py` copies the main game and applies the robot changes, such as swapping the human models for robots, chrome arms with neon strips, cyan fog, laser, servo and zap sounds, and the robot names and text. To change something in the robot version, edit the patch list in that script (or `robot.css`) and run:

    python3 tools/build_robot.py

Tests: `PAGE=robot/index.html node tools/regression.js`, `PAGE=robot/index.html node tools/mp_test.js`, `PAGE=robot/index.html node tools/mod_test.js`, `node tools/robot_shots.js`
