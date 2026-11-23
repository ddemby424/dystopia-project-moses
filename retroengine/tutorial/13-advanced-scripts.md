# Lesson 13 — ADVANCED: Level scripts

**Time:** about 10 minutes
**Payoff:** a message when the level starts, and a heal plus a line of text when the Titan dies — the same pattern the trial maps use.

RetroEngine already has a real level-script system. You do not need a new `.js` module or a hook into the engine game loop for map logic. Each level stores a JavaScript string in `level.props.script`. When the level starts, DMB Tech 1 runs it once and lets it subscribe to events.

> **Compare:** this is like a TI-89 program that sits in a loop and waits for keys, except you *register* a small function for each event. In VB, it is closer to `WithEvents` than to a big `Do` loop.

## Where to type the script

Either:

- **Level** tab → Logic → **Edit level script**, or
- **Menu → Code editor** → the **script.js** tab.

Paste or write the script, then press **Apply**. Apply first compiles it with `new Function('api', text)`. If the syntax is bad, you get `Script syntax error: ...` and nothing is saved. If it is fine, the text is stored on the level, any `scriptPending` flag is cleared, and a toast says to Playtest.

The starter example already in the editor (`SCRIPT_EXAMPLE`) is:

```javascript
// Level script — runs when the level starts.
// Events: 'start', 'tick'(dt), 'kill'(enemyType), 'pickup'(itemType),
//         'door'({x,y}), 'use'({x,y}), 'exit'
// api: message, heal, giveArmor, giveAmmo, openDoor, enemiesLeft,
//      kills, time, win, sound, player
api.on('start', () => api.message('Find the exit. Stay alive.'));
api.on('kill', () => {
  if (api.enemiesLeft() === 0) api.message('Sector clear!');
});
```

## The real api object

This is the object the engine actually builds in `runScript()` and passes in as `api`:

| Call | What it does |
|---|---|
| `api.on(event, fn)` | Register a function for an event. You can call this more than once. |
| `api.message(text)` | Show a line on screen (up to four at a time; they wait if a menu is open). |
| `api.heal(n)` | Add `n` to health, clamped 0–200. |
| `api.giveArmor(n)` | Add `n` to armor, clamped 0–200. |
| `api.giveAmmo(type, n)` | Add ammo. `type` must already be a key of `AMMO_MAX`: `bullets`, `shells`, `cells`, or `rockets`. |
| `api.openDoor(x, y)` | Open the door in cell `(x, y)` even without a key (`force`). |
| `api.enemiesLeft()` | How many enemies are not dead. |
| `api.kills()` | Kill count so far. |
| `api.time()` | Seconds since the level started. |
| `api.win()` | Finish the level (same as stepping on an exit pad). |
| `api.sound(name)` | Play a built-in synthesized sound (see Lesson 5 for names). |
| `api.player` | A snapshot: `{ x, y, hp, armor, keys }`. `keys` is an array of key color names you hold. |

There is no `api.spawnEnemy` or `api.fetch`. Anything else you call must already exist as a browser global (Lesson 14 talks about `fetch`).

## Events the engine really fires

| Event | When | Argument |
|---|---|---|
| `start` | After the level is built and the script has been installed | none |
| `tick` | Every frame while state is `playing` | `dt` (seconds since last frame) |
| `kill` | An enemy has just died | the enemy type string, such as `'titan'` or `'grunt'` |
| `pickup` | You just picked something up | the pickup key, such as `'key_red'` or `'w_rocket'` |
| `door` | A door started opening | `{ x, y }` of the door cell |
| `use` | You pressed USE / E toward a cell | `{ x, y }` of that cell |
| `exit` | The level-complete path has begun | none |

`tick` is the official "game loop" hook for a map. Use it sparingly (for example a timed message). Do not do heavy work every frame on a phone.

## A script you can paste (trial-pack style)

This is the same idea as Plant 4: Lockdown's real script, written for your Lesson 7 map. Open script.js, paste, Apply, Play.

```javascript
// Runs once, when this level finishes loading.
api.on('start', () => {
  // message() is the on-screen line the player sees after the splash.
  api.message('PAD DRILL — grab the key, drop the Titan, reach the pad');
});

// t is the pickup type, for example 'key_yellow' or 'w_rocket'.
api.on('pickup', t => {
  // Only talk when it is the key this map cares about.
  if (t === 'key_yellow') api.message('Yellow keycard — the inner door is open');
  // Remind the player not to waste rockets on Soldiers.
  if (t === 'w_rocket') api.message('Rocket launcher: save it for the Titan');
});

// t is the enemy kind that just died ('grunt', 'drone', 'heavy', 'turret', 'titan').
api.on('kill', t => {
  // When the boss falls, heal a little and tell the player to run to the pad.
  if (t === 'titan') {
    api.message('TITAN DOWN — get to the escape pad');
    api.heal(25);            // +25 HP, same reward Plant 4 uses
    api.sound('win');        // short victory tones (does not end the level)
  }
  // When the room is empty, say so. enemiesLeft() counts living enemies.
  if (api.enemiesLeft() === 0) api.message('Sector clear!');
});
```

A door-unlock pattern (coordinates must match *your* door cell; Check the door in the editor):

```javascript
// When the last enemy dies, force-open the door at cell (10, 4).
api.on('kill', () => {
  if (api.enemiesLeft() === 0) {
    api.message('Vault unlocked');
    api.openDoor(10, 4);    // x and y are integers, the cell you painted the door on
  }
});
```

A USE trigger, from the built-in help example:

```javascript
// When the player presses USE on cell (5, 9), give two rockets.
api.on('use', c => {
  if (c.x === 5 && c.y === 9) api.giveAmmo('rockets', 2);
});
```

## Pack scripts stay on; shared scripts are reviewed

This is a safety rule in `importMapObject`:

- Official same-origin `#pack=maps/name.retro` loads with `how === 'pack'`. The script **stays on** and Playtest starts.
- A share link (`#map=`) or a dropped / imported `.retro` moves a non-empty script into `props.scriptPending` and clears `props.script`. The Level tab shows that it is switched off. You read it, then Apply to turn it on.

Treat other people's scripts like a program you did not write: read every line before Apply. A script can call `api.win()`, change ammo, and (because it is ordinary page JavaScript) also call browser APIs. That is why the switch-off exists.

## If you ever need a separate JS file

Maps should keep using `props.script`. A new engine-wide module would mean adding a `<script src="my-module.js"></script>` next to `app.js` in `index.html`, and teaching `build.py` to include it in `retroengine.html`. There is no plug-in hook for that today. Prefer a level script, or a careful change inside `DFRuntime`, over inventing a side file.

> **Do this now.** Paste the Pad Drill script into script.js, press Apply, and Play. You should see the start message, a line when you pick up the yellow key, and "TITAN DOWN" plus a heal when the boss dies.

> **Payoff:** your map talks back. That is real DMB Tech 1 scripting, the same system the trial pack uses.
