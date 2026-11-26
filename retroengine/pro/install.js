/* install.js — 1.6.1: "Play Online" or "Download / Install App" for Pro.
   - Registers sw.js (a tiny network-first service worker) so Chrome / Edge / Samsung Internet treat Pro as
     an installable app and fire `beforeinstallprompt`.
   - Catches that event early, so the Install button can open the browser's own one-tap install dialog.
   - Where the browser never fires it (Safari / iOS, Firefox, or a prompt that was dismissed), the button shows
     a short two-line tip with the exact steps for that browser instead.
   - Already running as an installed app? The button is not shown at all. */
let deferred = null;                                               // the saved beforeinstallprompt event
const listeners = new Set();                                       // title card re-renders when install state changes

export function initInstall() {
  window.addEventListener('beforeinstallprompt', e => {            // Chrome/Edge/Android: install is possible
    e.preventDefault();                                            // keep the mini-infobar away; we have our own button
    deferred = e; listeners.forEach(f => f());
  });
  window.addEventListener('appinstalled', () => {                  // installed (from our button or the browser menu)
    deferred = null; try { localStorage.setItem('pro.installed', '1'); } catch (e) {}
    listeners.forEach(f => f());
  });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {   // file:// pages cannot have one
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {}); });
  }
}
export function onInstallChange(f) { listeners.add(f); return () => listeners.delete(f); }

// True when Pro is already running as an installed app (home-screen icon / desktop window).
export function isInstalled() {
  return ['standalone', 'fullscreen', 'minimal-ui'].some(m => window.matchMedia && matchMedia('(display-mode: ' + m + ')').matches)
    || navigator.standalone === true;                              // iOS Safari's own flag
}
export function canPrompt() { return !!deferred; }                 // one-tap install dialog is ready

// Exact steps for browsers that do not offer the one-tap dialog. Two short lines.
export function installSteps() {
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);   // iPadOS says "Mac"
  if (ios) return ['On iPhone / iPad (Safari): tap Share ⬆︎', 'then “Add to Home Screen”.'];
  if (/SamsungBrowser/.test(ua)) return ['Samsung Internet: tap the menu ≡', 'then “Add page to” → “Home screen”.'];
  if (/Firefox|FxiOS/.test(ua)) return ['Firefox cannot install web apps:', 'open this page in Chrome or Edge, then Install.'];
  if (/Android/.test(ua)) return ['Chrome on Android: tap the menu ⋮', 'then “Install app” (or “Add to Home screen”).'];
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return ['Safari on Mac: File menu', 'then “Add to Dock…”.'];
  return ['Chrome / Edge: the install icon in the address bar,', 'or menu ⋮ → “Install Pro”.'];
}

// Open the browser's install dialog. Resolves 'accepted', 'dismissed', or 'unavailable' (show the steps).
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const e = deferred; deferred = null;                             // the event can only be used once
  try { await e.prompt(); const c = await e.userChoice; listeners.forEach(f => f()); return c && c.outcome === 'accepted' ? 'accepted' : 'dismissed'; }
  catch (err) { return 'unavailable'; }
}

// Test hook: lets the automated checks fake a beforeinstallprompt event.
window.PRO_INSTALL = { get deferred() { return deferred; }, set deferred(v) { deferred = v; listeners.forEach(f => f()); }, installSteps, isInstalled };
