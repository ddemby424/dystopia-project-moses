#!/usr/bin/env node
// Two headless Chromiums: host via the PLAY WITH A FRIEND sheet, guest via the ?room= share link; checks movement + shots sync.
const { chromium } = require('playwright-core'); const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'); const OUT = process.argv[2] || path.join(ROOT, 'regression-out'); fs.mkdirSync(OUT, { recursive: true });
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const ok = (n, c, d) => { console.log(`${c ? 'PASS' : 'FAIL'}  mp ${n}${d ? '  — ' + JSON.stringify(d) : ''}`); if (!c) process.exitCode = 1; };
(async () => {
  const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}/index.html`;
  // one browser context = one BroadcastChannel space; real PeerJS/WebRTC is replaced by tools/fakepeer.js (box policy blocks WebRTC UDP)
  const B = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ARGS }); const CTX = await B.newContext({ viewport: { width: 393, height: 659 }, isMobile: true, hasTouch: true });
  await CTX.route(/peerjs/, r => r.abort()); await CTX.addInitScript({ path: path.join(__dirname, 'fakepeer.js') });
  const mk = async () => [B, await CTX.newPage()];
  const [b1, H] = await mk(), [b2, G] = await mk();
  await H.goto(BASE + '?notrailer', { waitUntil: 'domcontentloaded', timeout: 90000 }); await H.waitForTimeout(5000);
  await H.click('#btn-skip-splash'); await H.click('#tab-party-mode'); await H.click('#btn-host-party');
  await H.waitForFunction(() => /Room open/.test(document.getElementById('mp-status').textContent), null, { timeout: 30000 });
  const code = await H.evaluate(() => MP.code); ok('host shows code', /^[A-Z0-9]{4}$/.test(code), code);
  await H.screenshot({ path: path.join(OUT, 'mp_host.png') });
  await G.goto(BASE + '?room=' + code, { waitUntil: 'domcontentloaded', timeout: 90000 }); await G.waitForTimeout(1500);
  await G.screenshot({ path: path.join(OUT, 'mp_join_connecting.png') });
  await G.waitForFunction(() => /Connected/.test(document.getElementById('mp-status').textContent) || DM.on, null, { timeout: 40000 });
  ok('share link auto-joins', true);
  await Promise.all([H, G].map(p => p.waitForFunction(() => DM.on, null, { timeout: 20000 })));
  ok('match auto-starts on both', true);
  await H.evaluate(() => { STATE.player.x += 3; STATE.player.z += 2; }); await G.evaluate(() => { STATE.player.x -= 2; });
  await H.waitForTimeout(2500);
  const hp = await H.evaluate(() => [STATE.player.x, STATE.player.z]), gp = await G.evaluate(() => [STATE.player.x, STATE.player.z]);
  const gSeesH = await G.evaluate(() => { const e = DM.ents.host; return e ? [e.x, e.z] : null; });
  const hSeesG = await H.evaluate(() => { const e = Object.values(DM.ents).find(e => !e.bot); return e ? [e.x, e.z] : null; });
  const near = (a, b) => a && Math.hypot(a[0] - b[0], a[1] - b[1]) < 1;
  ok('guest sees host move', near(gSeesH, hp), { gSeesH, hp }); ok('host sees guest move', near(hSeesG, gp), { hSeesG, gp });
  await G.evaluate(() => { window.__shots = 0; const f = dmRemoteShot; window.dmRemoteShot = m => { __shots++; return f(m); }; });
  await H.evaluate(() => { const P = STATE.player; dmNetShot({ x: P.x, y: 1.5, z: P.z }, { x: P.x + 5, y: 1.5, z: P.z }, 0); });
  await H.evaluate(() => { window.__shots = 0; const f = dmRemoteShot; window.dmRemoteShot = m => { __shots++; return f(m); }; });
  await G.evaluate(() => { const P = STATE.player; dmNetShot({ x: P.x, y: 1.5, z: P.z }, { x: P.x + 5, y: 1.5, z: P.z }, 0); });
  await H.waitForTimeout(1500);
  ok('guest sees host shot', (await G.evaluate(() => __shots)) > 0); ok('host sees guest shot', (await H.evaluate(() => __shots)) > 0);
  await H.screenshot({ path: path.join(OUT, 'mp_host_ingame.png') }); await G.screenshot({ path: path.join(OUT, 'mp_guest_ingame.png') });
  // typed-code join + bad code message
  const [b3, J] = await mk(); await J.goto(BASE + '?notrailer', { waitUntil: 'domcontentloaded' }); await J.waitForTimeout(4000);
  await J.evaluate(() => MP.open()); await J.click('#mp-join'); await J.fill('#mp-input', 'zzzz'); await J.screenshot({ path: path.join(OUT, 'mp_join_typing.png') });
  await J.click('#mp-joingo'); await J.waitForFunction(() => /Failed/.test(document.getElementById('mp-status').textContent), null, { timeout: 40000 });
  ok('bad code shows Failed + Try again', await J.evaluate(() => !document.getElementById('mp-retry').classList.contains('hidden')), await J.evaluate(() => document.getElementById('mp-status').textContent));
  await J.screenshot({ path: path.join(OUT, 'mp_join_failed.png') });
  await J.fill('#mp-input', code.toLowerCase()); await J.click('#mp-joingo');
  await J.waitForFunction(() => DM.on, null, { timeout: 30000 }).then(() => ok('typed code joins running match', true), async () => ok('typed code joins running match', false, await J.evaluate(() => [document.getElementById('mp-status').textContent, MP.code, DM.on])));
  await B.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
