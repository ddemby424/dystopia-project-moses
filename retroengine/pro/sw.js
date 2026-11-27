/* sw.js — Pro's service worker (1.6.5).
   1. Makes Pro installable as an app (Chrome / Edge / Samsung Internet need a service worker for that).
   2. 1.6.3: an offline copy. Every file Pro loads is kept as it arrives (network first, so a phone never gets stuck on
      an old version: the network answer always wins and refreshes the copy). With no connection, the saved copy is used.
      After one chapter has loaded online, the installed app opens and plays offline. Music streams (HTTP 206 ranges)
      are not kept, so offline the engine falls back to its built-in synth music.
   The page asks { type: 'status' } and gets back how many files are saved, for the "Offline ready" badge.
   3. 1.6.4: updates. version.json is never cached (the install sheet fetches it fresh to compare versions), and
      { type: 'skipWaiting' } lets a waiting new worker take over at once when you tap Update now. */
const VER = '1.6.5';
const SHELL = 'pro-shell-' + VER;                                   // the page itself (offline fallback for navigations)
const FILES = 'pro-files-' + VER;                                   // everything else Pro fetched
const KEEP_HOSTS = [self.location.host, 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];   // three.js + fonts too

// The game's code is saved at install time (each file on its own, so one miss never blocks the rest);
// the chapter maps right after; models and textures are saved as the game first loads them.
const V = '?v=' + VER, CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/';
const CORE = ['pro.js' + V, 'pro.css' + V, 'juice.js' + V, 'install.js' + V, 'viewer.js' + V, 'spray.js' + V, '../dmbtech1.js' + V,
  'campaign.json', 'manifest.webmanifest', 'assets/icon-192.png', 'assets/pro_splash.webp',
  CDN + 'build/three.module.js', CDN + 'examples/jsm/loaders/GLTFLoader.js', CDN + 'examples/jsm/utils/SkeletonUtils.js', CDN + 'examples/jsm/controls/OrbitControls.js'];
self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(SHELL).then(c => c.addAll(['./', 'index.html'])).catch(() => {}),
    caches.open(FILES).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))
      .then(() => c.match('campaign.json')).then(r => r ? r.json() : { levels: [] })              // then the 7 chapter maps (~170 KB)
      .then(cfg => Promise.all((cfg.levels || []).map(lv => c.add('../maps/' + lv.file).catch(() => {})))).catch(() => {}))
  ]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {                            // drop older versions' caches
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => /^pro-(shell|files)-/.test(k) && k !== SHELL && k !== FILES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;         // music streams and posts: browser default
  const url = new URL(r.url);
  if (!KEEP_HOSTS.includes(url.host)) return;                       // anything else: untouched
  if (/\/version\.json$/.test(url.pathname)) return;                // 1.6.4: the live version check always goes to the network
  if (r.mode === 'navigate') {                                      // the page: network first, saved page offline
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(SHELL).then(s => s.put('index.html', c)).catch(() => {}); return res; })
      .catch(() => caches.match('index.html', { ignoreSearch: true })));
    return;
  }
  e.respondWith(fetch(r).then(res => {                              // network first; keep a copy of good, whole answers
    if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) { const c = res.clone(); caches.open(FILES).then(s => s.put(r, c)).catch(() => {}); }
    return res;
  }).catch(() => caches.match(r).then(m => m || caches.match(r, { ignoreSearch: true })).then(m => m || Response.error())));
});
self.addEventListener('message', e => {                             // { type: 'status' } -> { type: 'status', files, version }
  if (e.data && e.data.type === 'skipWaiting') { self.skipWaiting(); return; }   // 1.6.4: Update now
  if (!e.data || e.data.type !== 'status') return;
  caches.open(FILES).then(c => c.keys()).then(keys => {
    const names = keys.map(k => k.url);
    const core = ['campaign.json', 'dmbtech1.js', 'pro.js', 'three.module.js'].every(n => names.some(u => u.indexOf(n) >= 0));
    const maps = names.filter(u => /\/maps\/.+\.retro/.test(u)).length;
    e.source && e.source.postMessage({ type: 'status', files: names.length, core, maps, version: VER });
  }).catch(() => {});
});
