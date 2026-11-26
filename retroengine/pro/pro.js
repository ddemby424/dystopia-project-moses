// PRO — a standalone game powered by DMB Tech 1 (Lab -> Yard -> Factory -> Marble Shrine -> broadcast).
// This page only *hosts* DMB Tech 1: it loads the four pack maps, adds story cards between them,
// seals each exit until that level's goal is met, and saves how far you got in localStorage.
import { createRuntime } from '../dmbtech1.js';          // the DMB Tech 1 engine (same file the editor uses)
import { mountPro } from './viewer.js';                  // Pro's turntable for the intro and ending cards
import { sprayTitle } from './spray.js';                 // spray-paints the PRO title on the splash

const RT = createRuntime();                              // one engine instance for the whole campaign
const $ = id => document.getElementById(id);             // tiny helper: element by id
const card = $('card'), host = $('game');
let CFG = null, LEVELS = [], handle = null, viewer = null;

/* ---------- saved progress ---------- */
// Save shape: { level: <index of the chapter you reached>, done: <true after the ending> }
function loadSave() { try { return JSON.parse(localStorage.getItem(CFG.saveKey)) || { level: 0, done: false }; } catch (e) { return { level: 0, done: false }; } }
function writeSave(s) { try { localStorage.setItem(CFG.saveKey, JSON.stringify(s)); } catch (e) {} }   // private mode: just don't save
function clampLevel(i) { return Math.max(0, Math.min(LEVELS.length - 1, i | 0)); }                    // never point past the last map

/* ---------- story cards ---------- */
// showCard({ kicker, title, lines, buttons: [{ label, pri, go }], hero, broadcast })
function showCard(o) {
  $('kicker').textContent = o.kicker || '';
  $('ctitle').textContent = o.title || '';
  const body = $('cbody'); body.innerHTML = '';
  (o.lines || []).forEach(t => { const p = document.createElement('p'); p.textContent = t; body.appendChild(p); }); // textContent = no HTML injection
  const btns = $('cbtns'); btns.innerHTML = '';
  (o.buttons || []).forEach(b => {
    const el = document.createElement('button'); el.textContent = b.label; if (b.pri) el.className = 'pri';
    el.dataset.btn = b.id || ''; el.addEventListener('click', b.go); btns.appendChild(el);   // data-btn = test hook
  });
  card.classList.toggle('hero', !!o.hero);               // hero = show the spinning Pro model
  card.classList.toggle('broadcast', !!o.broadcast);     // broadcast = red "pirate TV" look
  card.classList.add('on'); card.dataset.kind = o.kind || '';
  if (o.hero && !viewer) viewer = mountPro($('pro3d'), { spin: 0.5 });   // start the turntable only when needed
  if (!o.hero && viewer) { viewer.dispose(); viewer = null; }            // free the GPU when it is not on screen
}
function hideCard() { card.classList.remove('on'); card.dataset.kind = ''; if (viewer) { viewer.dispose(); viewer = null; } }

/* ---------- each level's goal (seals the exit pad until it is met) ---------- */
function exitGate(G) {
  const lv = CFG.levels[G.index], g = lv && lv.goal;     // G.index = which campaign chapter is running
  if (!g) return '';
  if (g.type === 'kill') return G.enemies.some(e => e.sub === g.enemy && e.state !== 'dead') ? g.msg : ''; // a living target seals it
  if (g.type === 'key') return G.keys[g.key] ? '' : g.msg;  // no key yet: sealed
  return '';                                                // 'boss': DMB Tech 1 already seals it while the minotaur lives
}

/* ---------- starting and leaving the game ---------- */
function startAt(index) {
  hideCard();
  if (handle) { try { handle.destroy(); } catch (e) {} handle = null; }
  const vm = CFG.viewModel;                                   // Pro's own arm cannon as the first-person Pulse Cannon
  const project = { name: CFG.name, levels: LEVELS, models: vm ? { [vm.slot]: Object.assign({}, vm, { src: new URL(vm.src, import.meta.url).href }) } : {} };  // src made absolute; len/flip/off size and aim it
  handle = RT.play(host, project, {
    level: index,                                             // chapter to open
    assetBase: '../',                                         // shared enemy/prop models + music live one folder up
    gameName: 'Pro',                                          // 1.5.1: engine screens say Pro / DMB Tech 1, never the editor's name
    exitGate,                                                 // our per-level seal (see above)
    ringShots: true,                                          // Pro's cannon fires glowing cyan energy rings
    quitLabel: 'Campaign menu',
    onQuit: () => { if (handle) { handle.destroy(); handle = null; } titleCard(); },
    onEvent: (ev, arg) => { if (ev === 'won') levelDone(arg); }  // fires when you step on an open exit pad
  });
  writeSave({ level: index, done: false });                   // remember the chapter you are on
}
function levelDone(i) {
  const next = i + 1;
  if (next >= LEVELS.length) { writeSave({ level: i, done: true }); return endingCard(); }
  writeSave({ level: next, done: false });                    // a reload now resumes at the next chapter
  const lv = CFG.levels[i], nx = CFG.levels[next];
  showCard({ kind: 'between', kicker: 'CHAPTER ' + (i + 1) + ' CLEARED', title: nx.name.toUpperCase(), lines: [lv.after, nx.brief],
    buttons: [{ id: 'continue', label: 'Continue', pri: true, go: () => {
      hideCard();
      const b = host.querySelector('[data-a="next"]');         // the engine's own "Next level" button keeps your guns and ammo
      if (b) b.click(); else startAt(next);                    // fallback: open the next map fresh
    } }, { id: 'menu', label: 'Campaign menu', go: () => { if (handle) { handle.destroy(); handle = null; } titleCard(); } }] });
}
function endingCard() {
  const e = CFG.ending;
  showCard({ kind: 'ending', kicker: e.kicker, title: e.title, lines: e.lines, hero: true, broadcast: true,
    buttons: [{ id: 'again', label: 'Play again', pri: true, go: () => { writeSave({ level: 0, done: false }); startAt(0); } },
              { id: 'menu', label: 'Campaign menu', go: () => { if (handle) { handle.destroy(); handle = null; } titleCard(); } }] });
}
function titleCard() {
  const s = loadSave(), at = clampLevel(s.level), i = CFG.intro, btns = [];
  if (s.done) btns.push({ id: 'ending', label: 'Watch the broadcast', go: endingCard });
  if (at > 0 && !s.done) btns.push({ id: 'resume', label: 'Continue · ' + CFG.levels[at].name, pri: true, go: () => briefCard(at) });
  btns.push({ id: 'new', label: at > 0 || s.done ? 'New campaign' : 'Begin', pri: !(at > 0 && !s.done), go: () => { writeSave({ level: 0, done: false }); briefCard(0); } });
  btns.push({ id: 'preview', label: 'Inspect the suit', go: () => { location.href = 'preview.html'; } });
  showCard({ kind: 'title', kicker: i.kicker, title: i.title, lines: i.lines, hero: true, buttons: btns });
}
function briefCard(index) {                                  // short mission text right before a chapter loads
  const lv = CFG.levels[index];
  showCard({ kind: 'brief', kicker: 'CHAPTER ' + (index + 1) + ' OF ' + LEVELS.length, title: lv.name.toUpperCase(), lines: [lv.brief],
    buttons: [{ id: 'go', label: 'Deploy', pri: true, go: () => startAt(index) }, { id: 'menu', label: 'Back', go: titleCard }] });
}

/* ---------- splash screen + boot: read campaign.json, fetch each map, warm Pro's models ---------- */
const splash = $('splash');
let loaded = 0, total = 1;                                    // loading-bar counters (total grows once we know the maps)
let filesReady = false, sprayed = false;                      // "tap to continue" needs both
// Splash part 1: spray-paint the title right away, then show the engine badge.
const spray = sprayTitle($('sp-spray'), { duration: 2600 });
spray.done.then(() => { sprayed = true; splash.classList.add('sprayed'); maybeReady(); });
// Splash part 2: swap the still image for the live spinning suit with the ion charge in his cannon.
const splashViewer = mountPro($('sp-3d'), { spin: 0.55, charge: true });
splashViewer.ready.then(ok => { if (ok) splash.classList.add('live'); });   // if the GLB fails, the still image stays
function tick(label) {                                        // one file finished: move the bar and say what loaded
  loaded++; $('sp-fill').style.width = Math.round(100 * loaded / total) + '%';
  if (label) $('sp-status').textContent = 'LOADING ' + label.toUpperCase() + '…';
}
function maybeReady() { if (filesReady && sprayed) splashReady(); }  // paint done AND files loaded
function splashReady() {                                      // everything loaded: wait for a tap
  if (splash.classList.contains('ready')) return;             // only once
  splash.classList.add('ready'); $('sp-fill').style.width = '100%';
  $('sp-status').textContent = 'TAP TO CONTINUE';
  splash.addEventListener('click', () => {                    // the tap also unlocks sound on phones
    splash.classList.add('gone');                             // fade out (CSS), then remove it from view
    setTimeout(() => { splash.style.display = 'none'; splashViewer.dispose(); }, 450);  // free the splash's 3D view
    titleCard();                                              // straight to the campaign menu
  }, { once: true });
  window.PRO_SPLASH_READY = true;                             // test hook
}
async function boot() {
  try {
    CFG = await (await fetch('campaign.json', { cache: 'no-cache' })).json();
    total = 1 + CFG.levels.length + 2;                        // campaign.json + each map + suit + cannon
    tick('campaign');
    LEVELS = await Promise.all(CFG.levels.map(async lv => {
      const r = await fetch('../maps/' + lv.file);            // the same .retro map files the game ships with
      if (!r.ok) throw new Error(lv.file + ' (' + r.status + ')');
      const level = RT.unpackLevel(await r.json()).level;     // DMB Tech 1's own .retro reader
      level.name = lv.name;                                   // show the chapter name in the HUD
      tick(lv.name.replace(/^\d+ · /, ''));                  // e.g. "LOADING THE YARD…"
      return level;
    }));
    // Warm the browser cache with Pro's suit and cannon so the menu and first chapter open fast.
    await Promise.all(['assets/pro_suit.glb', CFG.viewModel.src].map(src =>
      fetch(src).then(r => r.arrayBuffer()).catch(() => null).then(() => tick(src.indexOf('cannon') >= 0 ? 'arm cannon' : 'suit'))));
    filesReady = true; $('sp-fill').style.width = '100%';
    if (!sprayed) $('sp-status').textContent = 'READY';      // still painting: wait for the last stroke
    maybeReady();
  } catch (e) {
    splash.style.display = 'none';
    showCard({ kind: 'error', title: 'COULD NOT LOAD', lines: ['The game files did not load: ' + e.message, 'Check your connection and reload.'] });
  }
}
// Test hook for the automated checks (the game never reads it).
window.PRO_SPLASH = { spray, viewer: splashViewer };          // test hook: spray progress + charge level
window.PRO_CAMPAIGN = { get handle() { return handle; }, get cfg() { return CFG; }, get levels() { return LEVELS; }, loadSave: () => loadSave(), startAt, titleCard, exitGate };
boot();
