// PRO — a standalone game powered by DMB Tech 1 (seven chapters, Lab -> Marble Shrine -> broadcast).
// 1.6.1: every local import carries ?v=1.6.1 so phones never mix a cached old module with new ones.
// This page only *hosts* DMB Tech 1: it loads the seven chapter maps, adds story cards between them,
// seals each exit until that level's goal is met, and saves how far you got in localStorage.
import { createRuntime } from '../dmbtech1.js?v=1.6.1';          // the DMB Tech 1 engine (same file the editor uses)
import { mountPro } from './viewer.js?v=1.6.1';                  // Pro's turntable for the intro and ending cards
import { sprayTitle } from './spray.js?v=1.6.1';                 // spray-paints the PRO title on the splash
import { installJuice } from './juice.js?v=1.6.1';
import { initInstall, onInstallChange, isInstalled, canPrompt, installSteps, promptInstall } from './install.js?v=1.6.1';   // 1.6.1: Play Online / Install App               // 1.6.0: hitmarkers, dash, streaks, orbs, Pro HUD, Web Audio SFX

initInstall();                                           // 1.6.1: catch beforeinstallprompt early + register sw.js
const RT = createRuntime();                              // one engine instance for the whole campaign
const JUICE = installJuice(RT, { levels: () => (CFG ? CFG.levels : []) });   // modern-feel layer (pro/juice.js)
const $ = id => document.getElementById(id);             // tiny helper: element by id
const card = $('card'), host = $('game');
let CFG = null, LEVELS = [], handle = null, viewer = null;

/* ---------- saved progress ---------- */
// 1.6.1 save shape: { version: 2, slug: '<map file without .retro>', done: <true after the ending> }.
// The old 1.5.x / 1.6.0 save stored a raw chapter index ({ level: 2 }). Chapters were re-ordered when the campaign
// grew from 4 to 7, so an old index pointed at the wrong map (old "2" = Factory, new "2" = The Drains).
// Saving the map's slug instead means a re-ordered campaign can never drop you into the wrong chapter again,
// and anything that is not a version-2 save (old key, old shape, unknown map) simply starts fresh at Chapter 1.
const SAVE_VERSION = 2;                                                      // bump when the save shape changes
function slugOf(i) { const lv = CFG.levels[i]; return lv ? lv.file.replace(/\.retro$/, '') : ''; }   // 'site12-dataworks'
function indexOfSlug(slug) { return CFG.levels.findIndex(lv => lv.file.replace(/\.retro$/, '') === slug); }  // -1 = unknown
function loadSave() {
  const fresh = { level: 0, done: false };                                   // Chapter 1, not finished
  try {
    const s = JSON.parse(localStorage.getItem(CFG.saveKey));                 // null when there is no save yet
    if (!s || s.version !== SAVE_VERSION) return fresh;                      // missing or an older shape: start over
    const i = indexOfSlug(s.slug);                                           // look the chapter up by map name
    return i < 0 ? fresh : { level: i, done: !!s.done };                    // a map that left the campaign: start over
  } catch (e) { return fresh; }                                              // broken JSON or private mode
}
function writeSave(s) {                                                      // s = { level: index, done }
  try { localStorage.setItem(CFG.saveKey, JSON.stringify({ version: SAVE_VERSION, slug: slugOf(s.level), done: !!s.done })); } catch (e) {}   // private mode: just don't save
}
function dropOldSaves() {                                                    // 1.6.1: clear pre-1.6.1 keys so they can never come back
  (CFG.legacySaveKeys || []).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
}
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
  if (handle) { JUICE.detach(); try { handle.destroy(); } catch (e) {} handle = null; }
  const vm = CFG.viewModel;                                   // Pro's own arm cannon as the first-person Pulse Cannon
  const project = { name: CFG.name, levels: LEVELS, models: vm ? { [vm.slot]: Object.assign({}, vm, { src: new URL(vm.src, import.meta.url).href }) } : {} };  // src made absolute; len/flip/off size and aim it
  handle = RT.play(host, project, {
    level: index,                                             // chapter to open
    assetBase: '../',                                         // shared enemy/prop models + music live one folder up
    gameName: 'Pro',                                          // 1.5.1: engine screens say Pro / DMB Tech 1, never the editor's name
    exitGate,                                                 // our per-level seal (see above)
    ringShots: true,                                          // Pro's cannon fires glowing cyan energy rings
    quitLabel: 'Campaign menu',
    onQuit: () => { if (handle) { JUICE.detach(); handle.destroy(); handle = null; } titleCard(); },
    onEvent: (ev, arg) => { JUICE.onEvent(ev, arg); if (ev === 'won') levelDone(arg); }  // 'won' fires when you step on an open exit pad
  });
  JUICE.attach(handle, host.querySelector('.dfg-root') || host);   // Pro HUD + feel layer for this run
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
    } }, { id: 'menu', label: 'Campaign menu', go: () => { if (handle) { JUICE.detach(); handle.destroy(); handle = null; } titleCard(); } }] });
}
function endingCard() {
  const e = CFG.ending;
  showCard({ kind: 'ending', kicker: e.kicker, title: e.title, lines: e.lines, hero: true, broadcast: true,
    buttons: [{ id: 'again', label: 'Play again', pri: true, go: () => { writeSave({ level: 0, done: false }); startAt(0); } },
              { id: 'menu', label: 'Campaign menu', go: () => { if (handle) { JUICE.detach(); handle.destroy(); handle = null; } titleCard(); } }] });
}
function titleCard() {
  const s = loadSave(), at = clampLevel(s.level), i = CFG.intro, btns = [];
  const resume = at > 0 && !s.done;                                          // a real save mid-campaign
  // 1.6.1: the opening choice. "Play Online" plays right here in the browser (continuing your save if there is one);
  // "Download / Install App" installs Pro to the home screen / desktop. Start Chapter 1 + Chapter Select sit below.
  if (resume) btns.push({ id: 'resume', label: 'Play Online · Continue ' + CFG.levels[at].name.replace(/^\d+ · /, ''), pri: true, go: () => briefCard(at) });
  else btns.push({ id: 'new', label: 'Play Online · Chapter 1', pri: true, go: () => { writeSave({ level: 0, done: false }); briefCard(0); } });
  if (!isInstalled()) btns.push({ id: 'install', label: 'Download / Install App', go: installClick });
  if (resume) btns.push({ id: 'new', label: 'Start Chapter 1', go: () => { writeSave({ level: 0, done: false }); briefCard(0); } });
  if (s.done) btns.push({ id: 'ending', label: 'Watch the broadcast', go: endingCard });
  btns.push({ id: 'preview', label: 'Inspect the suit', go: () => { location.href = 'preview.html'; } });
  showCard({ kind: 'title', kicker: i.kicker, title: i.title, lines: i.lines, hero: true, buttons: btns });
  chapterSelect(resume ? at : 0);                                            // 1.6.1: pick any chapter 1–7
}
// 1.6.1 Install button: the browser's one-tap dialog when it offered one, otherwise a two-line tip with the steps.
async function installClick() {
  const r = await promptInstall();
  if (r === 'accepted') { installTip(['Installing Pro…', 'It will appear on your home screen / desktop.']); return; }
  if (r === 'dismissed') return;                                             // they said no: leave it
  installTip(installSteps());                                                // Safari / iOS / Firefox / already offered
}
function installTip(lines) {
  let tip = $('install-tip');
  if (!tip) {                                                                // small inline popover under the buttons
    tip = document.createElement('div'); tip.id = 'install-tip'; tip.className = 'install-tip'; tip.setAttribute('role', 'status');
    const x = document.createElement('button'); x.className = 'install-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
    x.addEventListener('click', () => tip.remove());
    tip.appendChild(document.createElement('b')); tip.appendChild(document.createElement('span')); tip.appendChild(x);
    const inst = $('cbtns').querySelector('[data-btn="install"]');
    $('cbtns').insertBefore(tip, inst ? inst.nextSibling : null);            // right below the Install button's row
  }
  tip.children[0].textContent = lines[0]; tip.children[1].textContent = lines[1] || '';
}
// Title card is on screen and install state changed (prompt became available / app got installed): redraw it.
onInstallChange(() => { if (card.dataset.kind === 'title') titleCard(); });
// 1.6.1: Chapter Select. A styled native <select> (so Android shows its own picker) plus a Play button.
// It defaults to Chapter 1 on a fresh save, or to the chapter you reached.
function chapterSelect(def) {
  const row = document.createElement('div'); row.className = 'chsel';        // label + dropdown + button on one line
  const lab = document.createElement('label'); lab.htmlFor = 'chsel'; lab.textContent = 'Chapter select';
  const wrap = document.createElement('span'); wrap.className = 'chsel-box';  // holds the chevron icon
  const sel = document.createElement('select'); sel.id = 'chsel'; sel.setAttribute('aria-label', 'Chapter select');  // label is hidden on short screens
  CFG.levels.forEach((lv, k) => {                                            // "Chapter 1 · The Lab" … "Chapter 7 · The Marble Shrine"
    const o = document.createElement('option'); o.value = k;
    o.textContent = 'Chapter ' + (k + 1) + ' · ' + lv.name.replace(/^\d+ · /, ''); sel.appendChild(o);
  });
  sel.value = String(def);
  const play = document.createElement('button'); play.dataset.btn = 'chapter'; play.textContent = 'Play chapter';
  play.addEventListener('click', () => briefCard(+sel.value));               // brief card first, like every chapter
  wrap.appendChild(sel); row.appendChild(lab); row.appendChild(wrap); row.appendChild(play);
  $('cbtns').appendChild(row);
}
function briefCard(index) {                                  // short mission text right before a chapter loads
  const lv = CFG.levels[index];
  showCard({ kind: 'brief', kicker: 'CHAPTER ' + (index + 1) + ' OF ' + LEVELS.length, title: lv.name.toUpperCase(), lines: [lv.brief],
    buttons: [{ id: 'go', label: 'Deploy', pri: true, go: () => startAt(index) }, { id: 'menu', label: 'Back', go: titleCard }] });
}

/* ---------- 1.6.0: Pro's own enemies (only this page's DMB Tech 1 runtime knows them) ---------- */
function registerProEnemies() {
  for (const [id, d] of Object.entries(CFG.enemies || {})) {
    const def = Object.assign({}, d); delete def.model;      // stats only; the model goes in the asset pack
    RT.registerEnemy(Object.assign({ id }, def));             // e.g. trooper: lift 0.42 = floats, proj 'redring' = crimson rings
    if (d.model) RT.ASSET_PACK['enemy_' + id] = Object.assign({}, d.model);  // src is relative to assetBase '../'
  }
  if (!RT.PROP_DEFS.pro_prop) RT.PROP_DEFS.pro_prop = { name: 'Community model', solid: 0.3 };  // slot used by chapter 6
  // Darcy's own tracks join this runtime's music player (the editor's list is untouched).
  ((CFG.music && CFG.music.tracks) || []).forEach(t => { if (!RT.MUSIC_TRACKS.some(x => x.id === t.id)) RT.MUSIC_TRACKS.push(Object.assign({}, t)); });
}
// Swap stock enemies for Pro's: every Nth one, plus the N nearest the start (so you meet them right away).
function swapEnemies(level, rules) {
  const sp = level.spawn || { x: 0, y: 0 };
  for (const r of rules) {
    const list = level.ents.filter(e => e.t === 'enemy' && e.s === r.from)
      .sort((a, b) => Math.hypot(a.x - sp.x, a.y - sp.y) - Math.hypot(b.x - sp.x, b.y - sp.y));   // nearest first
    list.forEach((e, i) => { if (i < (r.nearest || 0) || i % (r.every || 1) === (r.every > 1 ? r.every - 1 : 0)) e.s = r.to; });
  }
}
// Asset hooks: if a file exists in pro/assets/, use it for that slot (e.g. pro_minotaur.glb for the shrine boss).
async function applyAssetHooks() {
  const hooks = Object.entries(CFG.assetHooks || {}).filter(([k]) => k[0] !== '_');
  await Promise.all(hooks.map(async ([slot, spec]) => {
    try { const r = await fetch('../' + spec.src, { method: 'HEAD' }); if (!r.ok) return; } catch (e) { return; }   // not dropped in yet
    RT.ASSET_PACK[slot] = Object.assign({}, RT.ASSET_PACK[slot] || {}, spec);
    (window.PRO_HOOKS = window.PRO_HOOKS || []).push(slot);   // test hook: which drop-ins are live
  }));
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
    dropOldSaves();                                           // 1.6.1: forget the pre-1.6.1 save (wrong chapter index)
    registerProEnemies();                                     // 1.6.0: troopers + Dystopia drones, Pro's runtime only
    await applyAssetHooks();                                  // 1.6.0: drop-in Meshy models (minotaur, community prop)
    total = 1 + CFG.levels.length + 2;                        // campaign.json + each map + suit + cannon
    tick('campaign');
    LEVELS = await Promise.all(CFG.levels.map(async lv => {
      const r = await fetch('../maps/' + lv.file);            // the same .retro map files the game ships with
      if (!r.ok) throw new Error(lv.file + ' (' + r.status + ')');
      const level = RT.unpackLevel(await r.json()).level;     // DMB Tech 1's own .retro reader
      level.name = lv.name;                                   // show the chapter name in the HUD
      if (lv.swap) swapEnemies(level, lv.swap);               // put Pro's enemies into the stock maps
      if (lv.track) level.props = Object.assign({}, level.props, { track: lv.track });   // e.g. Jungle Slap for the Minotaur
      (lv.nudge || []).forEach(n => level.ents.forEach(e => {  // move an entity a little, e.g. the tall Minotaur steps off his throne
        if (e.t === 'enemy' && e.s === n.s) { e.x += n.dx || 0; e.y += n.dy || 0; }
      }));
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
window.PRO_CAMPAIGN = { installClick, canPrompt, juice: JUICE, get handle() { return handle; }, get cfg() { return CFG; }, get levels() { return LEVELS; }, loadSave: () => loadSave(), startAt, titleCard, exitGate };
boot();
