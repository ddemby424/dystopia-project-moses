#!/usr/bin/env node
/* Before shots are the live candidate (/release/). After shots are /release-next/. */
const { chromium } = require('/tmp/pwtest/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.RC_OUT || '/opt/cursor/artifacts/realism';
fs.mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';

function serve() {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.hdr': 'application/octet-stream', '.json': 'application/json', '.woff2': 'font/woff2' };
  return new Promise((res) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('no'); }
      r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    });
    s.listen(0, '127.0.0.1', () => res([s, `http://127.0.0.1:${s.address().port}`]));
  });
}

async function frame(page, where) {
  return page.evaluate((where) => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hidden');
    const modal = document.getElementById('game-modal');
    if (modal) modal.classList.add('hidden');
    if (window.viewModelGroup) viewModelGroup.visible = false;
    if (window.gunMesh) gunMesh.visible = false;
    if (window.RC && RC.realism && RC.realism.ready) {
      try { RC.realism.dressArena(); RC.realism.dressYard(); } catch (e) {}
    }
    if (where === 'yard') {
      STATE.player.x = 0; STATE.player.y = 0; STATE.player.z = 128; STATE.player.pitch = -0.12; STATE.player.yaw = 0;
    } else if (where === 'hall') {
      STATE.player.x = 0; STATE.player.y = 0; STATE.player.z = 36; STATE.player.pitch = -0.08; STATE.player.yaw = 0;
    } else {
      STATE.player.x = -20; STATE.player.y = 0; STATE.player.z = 20; STATE.player.pitch = -1.05; STATE.player.yaw = 0.4;
    }
    if (window.RC && RC.core && RC.core.player) RC.core.player.step(0.016, performance.now());
    renderFrame();
    const i = renderer.info.render;
    return {
      calls: i.calls, triangles: i.triangles,
      pbr: window.RC && RC.realism ? { ready: RC.realism.ready, hdri: RC.realism.hdri, bytes: RC.realism.bytes, failed: RC.realism.failed, files: RC.realism.files } : null,
      ceil: !!(window.arenaGroup && arenaGroup.getObjectByName('rc-ceiling')),
      floorMap: (function () {
        let hit = null;
        if (window.arenaGroup) arenaGroup.traverse((o) => {
          if (hit || !o.isMesh || o.userData.rcSurface !== 'floor') return;
          hit = { map: !!(o.material && o.material.map), normal: !!(o.material && o.material.normalMap), rough: !!(o.material && o.material.roughnessMap) };
        });
        return hit;
      })(),
      probe: (window.RC && RC.realism && RC.realism.probe) ? RC.realism.probe() : null,
      yardMap: (function () {
        const g = window.RC && RC.yard && RC.yard.group && RC.yard.group.getObjectByName('rc-yard-ground');
        return g ? { map: !!(g.material && g.material.map), normal: !!(g.material && g.material.normalMap) } : null;
      })()
    };
  }, where);
}

(async () => {
  const [server, origin] = await serve();
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  const shots = {};
  async function pass(prefix, href, waitPbr) {
    errs.length = 0;
    await page.goto(origin + href, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.RC && RC.yard && RC.yard.built && RC.fence && RC.fence.group, null, { timeout: 30000 });
    await page.evaluate(() => {
      const skip = document.getElementById('btn-skip-splash');
      if (skip) skip.click();
      const neu = document.getElementById('btn-rc-new');
      if (neu) neu.click();
    });
    await page.waitForFunction(() => STATE.running && STATE.player.z > 100, null, { timeout: 20000 });
    if (waitPbr) await page.waitForFunction(() => RC.realism && RC.realism.ready && RC.realism.hdri && !(RC.realism.failed && RC.realism.failed.length), null, { timeout: 25000 });
    await page.waitForTimeout(400);
    shots[prefix + '_yard'] = await frame(page, 'yard');
    await page.screenshot({ path: path.join(OUT, prefix + '_yard.jpg') });
    shots[prefix + '_hall'] = await frame(page, 'hall');
    await page.screenshot({ path: path.join(OUT, prefix + '_hall.jpg') });
    if (waitPbr) {
      shots[prefix + '_ceiling'] = await frame(page, 'ceiling');
      await page.screenshot({ path: path.join(OUT, prefix + '_ceiling.jpg') });
    }
    shots[prefix + '_errors'] = errs.slice();
  }
  await pass('before', '/release/index.html?notrailer=1', false);
  await pass('after', '/release-next/index.html?notrailer=1', true);
  fs.writeFileSync(path.join(OUT, 'pbr_budget.json'), JSON.stringify(shots, null, 2));
  console.log(JSON.stringify(shots, null, 2));
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
