#!/usr/bin/env node
/* Capture the in-engine epilogue (not the startup trailer) into release/media/victory.webm. */
const { chromium } = require('/tmp/pwtest/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const FR = path.join('/tmp', 'rc-victory-frames');
fs.rmSync(FR, { recursive: true, force: true });
fs.mkdirSync(FR, { recursive: true });
const OUT = '/opt/cursor/artifacts/rc';
fs.mkdirSync(OUT, { recursive: true });

function serve() {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.vtt': 'text/vtt', '.webmanifest': 'application/manifest+json' };
  return new Promise((res) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    });
    s.listen(0, '127.0.0.1', () => res([s, `http://127.0.0.1:${s.address().port}/release/index.html?notrailer=1`]));
  });
}

(async () => {
  const [server, URL] = await serve();
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--disable-dev-shm-usage']
  });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.RC && RC.yard && RC.yard.upgraded && RC.fence && RC.fence.group, null, { timeout: 30000 });
  await page.evaluate(() => {
    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('game-modal').classList.add('hidden');
    STATE.running = true;
    document.body.classList.add('playing', 'rc-filming');
    RC.victory.filming = true;
    if (viewModelGroup) viewModelGroup.visible = false;
    renderer.setPixelRatio(1);
    renderer.setSize(640, 360, false);
    const c = renderer.domElement;
    c.style.width = '1280px';
    c.style.height = '720px';
    const cap = document.createElement('div');
    cap.id = 'rc-burn';
    cap.style.cssText = "position:fixed;left:0;right:0;bottom:48px;text-align:center;z-index:80;font:700 28px/1.35 sans-serif;color:#f8f3ea;text-shadow:0 2px 0 #000,0 0 12px #000;padding:0 48px";
    document.body.appendChild(cap);
  });
  // vista proof, west of the yard
  await page.evaluate(() => {
    STATE.player.x = -8; STATE.player.z = 130; STATE.player.yaw = -1.35; STATE.player.pitch = -0.12;
    camera.position.set(-8, 2.2, 130); camera.rotation.order = 'YXZ'; camera.rotation.y = -1.35; camera.rotation.x = -0.12;
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'vista_west.jpg') });
  await page.evaluate(() => {
    STATE.player.x = 6; STATE.player.z = 148; STATE.player.yaw = 0.4; STATE.player.pitch = -0.2;
    camera.position.set(6, 2.4, 148); camera.rotation.y = 0.4; camera.rotation.x = -0.2;
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'vista_gate.jpg') });

  const N = 32;
  const frames = await page.evaluate(async (N) => {
    const out = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      RC.fence.setLive(t < 0.32);
      RC.victory._cam(t);
      const cap = document.getElementById('rc-burn');
      if (cap) cap.textContent = RC.victory.lineAt(t * 8);
      renderFrame();
      out.push(renderer.domElement.toDataURL('image/jpeg', 0.72));
      await new Promise((r) => requestAnimationFrame(r));
    }
    return out;
  }, N);
  frames.forEach((url, i) => {
    const buf = Buffer.from(url.split(',')[1], 'base64');
    const name = path.join(FR, 'f' + String(i).padStart(3, '0') + '.jpg');
    fs.writeFileSync(name, buf);
    if (i === 10) fs.copyFileSync(name, path.join(ROOT, 'release/media/victory_poster.jpg'));
  });
  console.log('frames', frames.length);
  const ff = spawnSync('ffmpeg', ['-y', '-framerate', '4', '-i', path.join(FR, 'f%03d.jpg'), '-c:v', 'libvpx-vp9', '-b:v', '280k', '-pix_fmt', 'yuv420p', '-an', path.join(ROOT, 'release/media/victory.webm')], { stdio: 'inherit' });
  if (ff.status !== 0) process.exit(ff.status || 1);
  const st = fs.statSync(path.join(ROOT, 'release/media/victory.webm'));
  console.log('victory.webm', st.size);
  fs.copyFileSync(path.join(ROOT, 'release/media/victory.webm'), path.join(OUT, 'victory.webm'));
  fs.copyFileSync(path.join(ROOT, 'release/media/victory_poster.jpg'), path.join(OUT, 'victory_poster.jpg'));
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(2); });
