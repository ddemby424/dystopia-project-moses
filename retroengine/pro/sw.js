/* sw.js — Pro's service worker (1.6.1). Its job is to make Pro installable as an app, NOT to cache the game:
   every request goes to the network as usual, so a phone can never get stuck on an old version.
   The only thing kept offline is the page itself, so an installed Pro opened without a connection shows
   its own splash instead of the browser's "no internet" page. */
const SHELL = 'pro-shell-1.6.1';                                    // bump with each release; old copies are deleted

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', 'index.html'])).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('pro-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate') return;          // assets, maps, music: browser default, untouched
  e.respondWith(fetch(r).catch(() => caches.match('index.html')));  // network first; offline -> the saved page
});
