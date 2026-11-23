# Lesson 14 — ADVANCED: Calling APIs from a script

**Time:** about 10 minutes
**Payoff:** a level that, on start, shows a real temperature from a free public weather API, with errors handled so a dead network does not break the map.

`api` has no `fetch` method. A level script is still ordinary JavaScript running in the page (`new Function('api', src)(api)`), so the browser's built-in `fetch` is visible as a global, the same way `Math` is. Use it only for **public** data, and only when the player has a network connection.

> **Compare:** `await fetch(...)` is like a TI-89 program that `Pause`s until another calc answers a `GetCalc`, or like VB `XMLHttpRequest` / `Await` a network call. The game keeps drawing while the reply is in flight, because we do not freeze the whole engine — we only wait inside our little async function.

## async / await in one breath

- `fetch(url)` returns a **Promise**: a value that will show up later.
- `await` means "pause *this* function until that Promise finishes."
- The function that uses `await` must be marked `async`.
- `api.on('start', () => { ... })` is not async by itself, so we start an inner `async` function and run it. The start event can return immediately; the message appears when the reply lands.

## CORS, in plain terms

Browsers block a page from reading another site's data unless that site says it is allowed. That rule is **CORS**. If the API does not send the right headers, `fetch` fails in the console even though the URL works in a new tab. The example below uses [Open-Meteo](https://open-meteo.com/), a free forecast API that allows browser calls and **needs no key**.

If a fetch fails with a CORS error, you cannot "fix" it from the level script. Pick an API that allows browsers, or have your own server talk to the other site. Do not look for a secret header hack in client code.

## Never put secret keys in game code

Anything in a level script, in `app.js`, or in a shipped `.html` file is **public**. Anyone can Save-As or open DevTools and read it.

- No API tokens, no passwords, no webhook secrets, no private X / Discord / database keys.
- If a service requires a key, it does not belong in RetroEngine client code.
- A `#pack=` map is especially public: the `.retro` file is just JSON, and the script is sitting in `level.props.script` in plain text.

This is also why imported scripts stay off until you review them (Lesson 13). A hostile script could call `fetch` too.

## A paste-ready example

This asks Open-Meteo for the current temperature near Chicago (change the numbers if you want a different city). Paste it into **script.js**, Apply, then Play while online. Hosted RetroEngine or a Spck preview both work; `file://` often cannot fetch other sites.

```javascript
// When the level starts, show a line, then ask a public weather API for the temperature.
api.on('start', () => {
  // Instant payoff so the player is not staring at a silent map while the net works.
  api.message('Checking outside conditions…');

  // Inner async function so we can use await. The () at the end starts it immediately.
  (async () => {
    try {
      // Open-Meteo: no key, CORS-friendly. latitude/longitude are Chicago.
      // current=temperature_2m asks for just the current temperature.
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=41.85&longitude=-87.65&current=temperature_2m&temperature_unit=fahrenheit';

      // fetch() is the browser's HTTP call. await waits for the headers/status.
      const res = await fetch(url);

      // res.ok is false for 404, 500, and other HTTP errors. Throw so catch can talk.
      if (!res.ok) throw new Error('HTTP ' + res.status);

      // Parse the JSON body. await again: the body streams in after the headers.
      const data = await res.json();

      // Defensive read: APIs change, so we never assume the shape blindly.
      const t = data && data.current && data.current.temperature_2m;

      if (typeof t === 'number') {
        // Math.round keeps the HUD line short. This is a message, not a game rule.
        api.message('Outside temp near Chicago: ' + Math.round(t) + ' F');
      } else {
        api.message('Weather data was incomplete.');
      }
    } catch (err) {
      // Offline, CORS, typo, or a dead API should never freeze or crash the level.
      api.message('Could not reach weather net.');
      // console.warn is for you in DevTools; players do not see it.
      console.warn('RetroEngine weather fetch', err);
    }
  })();
});
```

You can keep your Titan / key messages in the same script; just add more `api.on(...)` blocks.

## What "good" looks like

- A visible fallback message when the call fails.
- No key or cookie in the URL or in the script.
- No `await fetch` on every `tick` (that would hammer the API and stutter a phone). Once on `start`, or once on `use` of a terminal prop, is enough.
- The map still plays if the request never returns.

> **Do this now.** Paste the script, Apply, Play on a preview that is online, and wait a second for the temperature line. Then turn on airplane mode, Play again, and confirm you see "Could not reach weather net." instead of a frozen game.

> **Payoff:** your level talked to the public internet and used the result in-game, without putting a secret in the client and without breaking offline play.
