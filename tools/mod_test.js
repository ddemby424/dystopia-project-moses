#!/usr/bin/env node
// Checks mods/starter_mod.js loads after game.js in headless Chromium (does not change index.html on disk).
const { chromium } = require('playwright-core'); const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, res) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  let body = fs.readFileSync(f); if (p === '/index.html') body = body.toString().replace(/(<script src="game\.js[^"]*"><\/script>)/, '$1\n<script src="mods/starter_mod.js?v=1"></script>');
  res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); res.end(body); }).listen(0, async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const logs = [], errs = [];
  p.on('console', m => logs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('dys_trailer_seen_v4', '1'); } catch (e) {} });
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(9000);
  await p.evaluate(() => { document.getElementById('btn-skip-splash')?.click(); }); await p.waitForTimeout(500); await p.evaluate(() => document.getElementById('btn-start').click()); await p.waitForTimeout(5000);
  const r0 = await p.evaluate(() => ({ inScene: scene.children.includes(MOD_CUBE), rot: MOD_CUBE.rotation.y, fog: !!scene.fog }));
  await p.keyboard.press('KeyM'); await p.waitForTimeout(800);
  const r1 = await p.evaluate(() => { const b = BOTS.find(b => !b.dying); if (b) { b.health = 0; finishBotKill(b); } return { rot: MOD_CUBE.rotation.y, fog: !!scene.fog }; });
  await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/mod_test.png' });
  const ok = r0.inScene && r1.rot > r0.rot && r0.fog && !r1.fog && logs.some(l => l.startsWith('[mod] killed:')) && logs.includes('[mod] starter mod loaded');
  console.log(JSON.stringify({ r0, r1, modLogs: logs.filter(l => l.startsWith('[mod]')), errs: errs.slice(0, 5) })); console.log(ok ? 'MOD TEST PASS' : 'MOD TEST FAIL');
  await br.close(); srv.close(); process.exit(ok ? 0 : 1); });
