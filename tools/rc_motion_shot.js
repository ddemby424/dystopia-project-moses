#!/usr/bin/env node
/* Short clip and stills: a guard walking, then the Floor G closet opening.
   Headless. Not a phone. */
const { chromium } = require('/tmp/pwtest/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.RC_OUT || '/opt/cursor/artifacts/realism';
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';

function serve() {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' };
  return new Promise((res) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('no'); }
      r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    });
    s.listen(0, '127.0.0.1', () => res([s, `http://127.0.0.1:${s.address().port}/release/index.html?notrailer=1`]));
  });
}

(async () => {
  const [server, URL] = await serve();
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--no-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } }
  });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.RC && RC.yard && RC.yard.built && RC.rigs, null, { timeout: 30000 });
  await page.waitForFunction(() => RC.rigs.ready(), null, { timeout: 20000 });
  await page.evaluate(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hidden');
    const modal = document.getElementById('game-modal');
    if (modal) modal.classList.add('hidden');
    viewModelGroup.visible = false;
    if (!BOTS.some((o) => !o.dying && !o.isBoss)) {
      spawnBotFromArchetype({ id: 'shot-guard', name: 'Triage', role: 'human_guard', aiRole: 'pusher', x: 8, y: 0, z: 16, maxHealth: 100, patrolType: 'ground' }, 1);
    }
    const b = BOTS.find((o) => !o.dying && !o.isBoss);
    window.__shotBot = b;
    RC.rigs.adopt(b);
    b.x = 4; b.z = 8; b.y = 0; b.yaw = Math.atan2(1, 0);
    b.aiState = 'alert'; b.thinkT = 30; b.los = false; b.cover = null; b.role = 'pusher';
    b.goal = { x: 16, z: 8 }; b.path = [{ x: 16, z: 8 }]; b.pathI = 0; b.stuck = 0; b.stuckN = 0;
    if (RC.realism && RC.realism.ready) RC.rigs.paint(b.rig.root, b.heavy ? 'heavy' : 'guard');
    BOTS.forEach((o) => { if (o !== b) o.dying = true; });
    STATE.player.x = 4; STATE.player.z = 12.4; STATE.player.y = 0;
    STATE.player.yaw = Math.atan2(-(b.x - STATE.player.x), -(b.z - STATE.player.z));
    STATE.player.pitch = -0.08;
    STATE.combatActive = true;
    if (b.rig && b.rig.root) b.rig.root.position.set(b.x, b.y, b.z);
  });
  for (let i = 0; i < 18; i++) {
    await page.evaluate((i) => {
      const b = window.__shotBot;
      updateBotAI(b, 0.05, performance.now());
      STATE.player.x = b.x;
      STATE.player.z = b.z + 3.6;
      STATE.player.yaw = Math.atan2(-(b.x - STATE.player.x), -(b.z - STATE.player.z));
      STATE.player.pitch = -0.12;
      rcPlayerStep(0.016, performance.now());
      renderFrame();
      if (i === 10) window.__mid = { x: b.x, z: b.z, clip: b.clips && b.clips.current };
    }, i);
  }
  await page.screenshot({ path: path.join(OUT, 'after_enemy_walk.jpg') });

  await page.evaluate(() => {
    STATE.floor = 0; STATE.level = 1;
    const lay = genFloorLayout(1, 0);
    MAP_OBJECTS = lay.objects; FLOOR_INFO = lay.info;
    buildArenaMap();
    const d = (window.RC_SECRET_DOORS || [])[0];
    window.__door = d;
    STATE.player.x = d.ax; STATE.player.z = d.az; STATE.player.y = 0;
    STATE.player.yaw = Math.atan2(-(d.obj.x - d.ax), -(d.obj.z - d.az));
    STATE.player.pitch = -0.05;
    rcPlayerStep(0.016, performance.now());
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'after_secret_closed.jpg') });
  await page.evaluate(() => {
    const d = window.__door;
    RC.secrets.open(d, 'shot');
    for (let i = 0; i < 20; i++) RC.secrets.update(0.05);
    STATE.player.x = d.ax + (d.obj.x - d.ax) * 0.55;
    STATE.player.z = d.az + (d.obj.z - d.az) * 0.55;
    STATE.player.yaw = Math.atan2(-(d.rx - STATE.player.x), -(d.rz - STATE.player.z));
    STATE.player.pitch = -0.2;
    rcPlayerStep(0.016, performance.now());
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'after_secret_open.jpg') });
  const info = await page.evaluate(() => {
    const d = window.__door;
    const b = window.__shotBot;
    return {
      errs: [],
      clip: b && b.clips && b.clips.current,
      mid: window.__mid,
      secret: d && { x: d.obj.x, z: d.obj.z, where: d.where, tell: d.tell, open: d.open, room: d.room },
      mat: (function () {
        const rows = [];
        const b = window.__shotBot;
        if (b && b.rig) b.rig.root.traverse((o) => {
          if (!o.isMesh || rows.length > 4) return;
          const m = Array.isArray(o.material) ? o.material[0] : o.material;
          rows.push({ t: m && m.type, map: !!(m && m.map), painted: !!o.userData.rcPainted });
        });
        return rows;
      })(),
      rigBytes: RC.rigs.bytes,
      texBytes: RC.realism && RC.realism.bytes,
      texFailed: RC.realism && RC.realism.failed
    };
  });
  fs.writeFileSync(path.join(OUT, 'motion_shot.json'), JSON.stringify({ ...info, errs }, null, 2));
  await context.close();
  await browser.close();
  server.close();
  console.log(JSON.stringify({ ...info, errs }, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
