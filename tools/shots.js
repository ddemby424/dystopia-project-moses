#!/usr/bin/env node
// Screenshot every screen at phone sizes. Usage: node tools/shots.js --out DIR [--url URL]
const { chromium } = require('playwright-core'); const fs = require('fs'), path = require('path'), http = require('http');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(__dirname, '..'); const OUT = path.resolve(arg('out', path.join(ROOT, 'regression-out/shots'))); fs.mkdirSync(OUT, { recursive: true });
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
function serve() { const T = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.json': 'application/json' };
  return new Promise(r => { const s = http.createServer((q, res) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0, () => r([s, `http://127.0.0.1:${s.address().port}/index.html`])); }); }
(async () => {
  let server, URL = arg('url'); if (!URL) [server, URL] = await serve();
  const br = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  for (const [dev, w, h] of [['iphone14', 390, 664], ['fold_cover', 344, 882]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, userAgent: IOS }); const p = await ctx.newPage();
    const ev = f => p.evaluate(f), W = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: path.join(OUT, `${dev}_${n}.png`) });
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await W(1500); await shot('0_loading_portrait'); await W(6000);
    for (const [o, vw, vh] of [['portrait', w, h], ['landscape', h, w]]) {
      await p.setViewportSize({ width: vw, height: vh }); await W(800); await shot(`1_title_${o}`);
    }
    await ev(() => document.getElementById('btn-skip-splash').click()); await W(1200);
    for (const [o, vw, vh] of [['landscape', h, w], ['portrait', w, h]]) { await p.setViewportSize({ width: vw, height: vh }); await W(800); await shot(`2_menu_${o}`); }
    await p.setViewportSize({ width: h, height: w }); await W(400);
    await ev(() => window.openCheatBox && openCheatBox()); await W(700); await shot('3_cheat_landscape'); await ev(() => { document.querySelectorAll('#cheat-box,.cheat-box,#cheat-wrap').forEach(e => e.remove()); });
    await ev(() => document.getElementById('btn-start').click()); await W(5000);
    for (const [o, vw, vh] of [['landscape', h, w], ['portrait', w, h]]) { await p.setViewportSize({ width: vw, height: vh }); await W(1500); await shot(`4_hud_${o}`); }
    await p.setViewportSize({ width: h, height: w }); await W(800);
    await ev(() => { addKillFeed('YOU ⟶ Sentinel'); addKillFeed('YOU ⟶ Guard · HEADSHOT'); window.showHitMarker ? showHitMarker(true) : 0; if (window.showDamageDir) showDamageDir(Math.PI / 2); }); await W(150); await shot('5_combat_fx_landscape');
    await ev(() => document.getElementById('mc-menu')?.click()); await W(800); await shot('6_pause_landscape'); await ev(() => document.getElementById('mcs-resume')?.click()); await W(400);
    await ev(() => showBanner('FLOOR B1 CLEARED', 'SCORE 004200 · Stairwell unlocked — descend', 9000)); await W(600); await shot('7_floor_clear_landscape');
    await ev(() => { if (window.showDeathScreen) showDeathScreen('Sentinel'); }); await W(900); await shot('8_death_landscape'); await W(3500);
    await ev(() => window.openCredits && openCredits()); await W(900); await shot('9_credits_landscape'); await ev(() => document.getElementById('cr-close')?.click());
    await ev(() => { STATE.running = false; dmStartMatch({ host: true }); }); await W(4000); await ev(() => { STATE.running = true; }); await W(2500); await shot('10_doom_party_landscape');
    await ev(() => dmBoard(true)); await W(600); await shot('11_dm_board_landscape');
    await ctx.close();
  }
  await br.close(); server && server.close(); console.log('shots in', OUT);
})().catch(e => { console.error(e); process.exit(2); });
