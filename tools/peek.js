#!/usr/bin/env node
// Screenshot views: node tools/peek.js OUTDIR 'L,F,x,z,yaw,pitch,name[,js]' ...  (landscape 1280x720, desktop UA)
const { chromium } = require('playwright-core'); const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..'); const [OUT, ...views] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.json': 'application/json', '.mp4': 'video/mp4' };
const serve = () => new Promise(r => { const s = http.createServer((q, res) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0, () => r([s, `http://127.0.0.1:${s.address().port}/index.html`])); });
(async () => {
  const [srv, URL] = await serve();
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await (await br.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('dys_trailer_seen', '1'); } catch (e) {} });
  await p.goto(URL, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(9000);
  await p.evaluate(() => { document.getElementById('btn-skip-splash')?.click(); }); await p.waitForTimeout(500); await p.evaluate(() => document.getElementById('btn-start').click()); await p.waitForTimeout(4000);
  let cur = '';
  for (const v of views) { const [L, F, x, z, yaw, pitch, name, js] = v.split(',');
    if (cur !== L + F) { await p.evaluate(([L, F]) => startFloor(+L, +F), [L, F]); await p.waitForTimeout(3000); cur = L + F; }
    await p.evaluate(([x, z, yaw, pitch, js]) => { const P = STATE.player; P.health = P.maxHealth = 1e7; P.x = +x; P.z = +z; P.yaw = +yaw; P.pitch = +pitch; document.getElementById('center-banner')?.classList.add('hidden'); if (js) eval(js); }, [x, z, yaw, pitch, js]);
    await p.waitForTimeout(1500); await p.screenshot({ path: path.join(OUT, name + '.png') }); }
  console.log('errors:', errs.slice(0, 5)); await br.close(); srv.close();
})();
