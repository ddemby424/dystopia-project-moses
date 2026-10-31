// Gameplay screenshots of robot/ in headless Chromium. Usage: node tools/robot_shots.js [OUTDIR]
const { chromium } = require('playwright-core'); const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..'); const OUT = process.argv[2] || '/workspace/robot-shots'; fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await br.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  const W = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: path.join(OUT, n) }), ev = f => p.evaluate(f);
  await p.goto(`http://127.0.0.1:${srv.address().port}/robot/index.html`); await W(9000); await shot('1_title.png');
  await ev(() => document.getElementById('btn-skip-splash').click()); await W(1200);
  await ev(() => document.getElementById('btn-start').click()); await W(7000);
  await ev(() => { const P = STATE.player; P.health = P.maxHealth = 1e7; try { openCellDoor('shots'); } catch (e) {} document.getElementById('center-banner')?.classList.add('hidden'); }); await W(2500); await shot('2_gameplay_arms.png');
  const info = await ev(() => { const b = BOTS.find(b => b.isHuman && !b.dead) || BOTS.find(b => !b.dead); if (!b) return 'no bot'; const r = b.rig.root.position; const P = STATE.player; P.yaw = 0; P.pitch = 0; window.__shotBot = () => { STATE.combatActive = false; b.x = P.x + 0.4; b.y = P.y; b.z = P.z - 3.2; b.rig.root.position.set(b.x, b.y, b.z); b.rig.root.rotation.y = 0; if (b.position) b.position.set(P.x + 0.4, P.y, P.z - 3.2); }; window.__shotBot(); return b.name + ' human=' + !!b.isHuman; });
  for (let i = 0; i < 8; i++) { await ev(() => window.__shotBot()); await W(50); } await shot('3_robot_enemy.png');
  await ev(() => { try { startFloor(1, 3); } catch (e) {} }); await W(6000); await ev(() => { STATE.player.health = 1e7; }); await shot('4_deep_floor.png');
  console.log(JSON.stringify({ info, errs: errs.slice(0, 10) })); await br.close(); srv.close();
});
