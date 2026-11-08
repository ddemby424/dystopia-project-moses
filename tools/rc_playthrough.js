#!/usr/bin/env node
/* End-to-end checks for the single-player release candidate.
   Headless Chromium is not a phone. A pass here is not device proof.
   Usage: node tools/rc_playthrough.js [--url http://127.0.0.1:PORT/release/index.html] */
const { chromium } = require('/tmp/pwtest/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.RC_OUT || '/opt/cursor/artifacts/rc';
fs.mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const CHROME = arg('chrome', process.env.CHROME || '/usr/bin/google-chrome');
const results = [];
const add = (check, pass, detail) => {
  results.push({ check, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${check}${detail ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
};

function serve() {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.vtt': 'text/vtt', '.webm': 'video/webm', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
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
  let server = null;
  let URL = arg('url', '');
  if (!URL) [server, URL] = await serve();
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--no-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
    hasTouch: true,
    isMobile: false
  });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 240)); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('victory_poster') && !r.url().includes('victory.webm')) errs.push('http ' + r.status() + ' ' + r.url().slice(0, 180)); });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.RC && RC.yard && RC.yard.built && RC.fence && RC.fence.group, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const boot = await page.evaluate(() => ({
    built: RC.yard.built,
    files: RC.assets.stats.files,
    failed: RC.assets.stats.failed,
    bytes: RC.assets.stats.bytes,
    props: RC.yard.group ? RC.yard.group.children.length : 0,
    segs: RC.fence.segs.length,
    live: RC.fence.live,
    release: IS_RELEASE_BUILD === true,
    soft: String(softSpotWorld).includes('clampToHull') || String(softSpotWorld).includes('maxAhead')
  }));
  add('candidate boots with yard + fence', boot.built && boot.segs > 4 && boot.live && boot.release, boot);
  add('modular kit loaded (some files, failures allowed only as fallback)', boot.files >= 10, boot);
  add('weak-point anchor replaced', boot.soft, boot.soft);

  await page.evaluate(() => { document.getElementById('btn-skip-splash').click(); });
  await page.waitForTimeout(300);
  const devHidden = await page.evaluate(() => {
    const studio = document.getElementById('btn-open-studio');
    const party = document.getElementById('tab-party-mode');
    const st = (el) => el ? getComputedStyle(el).display : 'missing';
    return { studio: st(studio), party: st(party), modal: !document.getElementById('game-modal').classList.contains('hidden') };
  });
  add('studio and party hidden on the candidate menu', devHidden.studio === 'none' && devHidden.party === 'none' && devHidden.modal, devHidden);

  await page.click('#btn-rc-new');
  await page.waitForFunction(() => STATE.running && STATE.player.z > 100, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  const spawned = await page.evaluate(() => ({ x: +STATE.player.x.toFixed(1), z: +STATE.player.z.toFixed(1), floor: STATE.floor, level: STATE.level }));
  add('new campaign starts in the yard on floor G', spawned.floor === 0 && spawned.z > 110 && Math.abs(spawned.x) < 2, spawned);

  const probes = await page.evaluate(() => RC.yard.layoutRef().routes.map((r) => RC.yard.probeRoute(r, 1.25)));
  probes.forEach((p) => add(`route ${p.id} is walkable into the hall`, p.clear, p));

  const fenceLocked = await page.evaluate(() => {
    const f = RC.yard.layoutRef().fence;
    const gateX = f.gate.cx, gateZ = f.maxZ;
    const side = playerCollidesAt(f.minX, (f.minZ + f.maxZ) / 2, 0);
    const gate = playerCollidesAt(gateX, gateZ, 0);
    const inside = playerCollidesAt(0, 120, 0);
    const hp0 = STATE.player.health;
    STATE.player.x = gateX; STATE.player.z = gateZ - 0.3; STATE.running = true;
    RC.fence.hurtT = 0;
    RC.fence.update(0.6);
    return { side, gate, inside, hp0, hp1: STATE.player.health, live: RC.fence.live, z: +STATE.player.z.toFixed(2) };
  });
  add('live fence blocks the gate and a side span', fenceLocked.gate === true && fenceLocked.side === true && fenceLocked.inside === false, fenceLocked);
  add('touching the live fence hurts and answers', fenceLocked.hp1 < fenceLocked.hp0, fenceLocked);

  // shots of the yard before the win
  await page.evaluate(() => {
    const s = RC.yard.layoutRef().spawn;
    STATE.player.x = s.x; STATE.player.z = s.z; STATE.player.yaw = 0; STATE.player.pitch = -0.18; STATE.player.health = 100;
    camera.position.set(s.x, 1.7, s.z); camera.rotation.order = 'YXZ'; camera.rotation.y = 0; camera.rotation.x = -0.18;
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'yard_spawn.jpg') });
  await page.evaluate(() => {
    STATE.player.x = -12.5; STATE.player.z = 102; STATE.player.yaw = 0; STATE.player.pitch = -0.05;
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'route_dock.jpg') });
  await page.evaluate(() => {
    STATE.player.x = 14; STATE.player.z = 100; STATE.player.yaw = 0; STATE.player.pitch = -0.04;
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'route_airlock.jpg') });
  await page.evaluate(() => {
    STATE.player.x = -12.5; STATE.player.z = 55; STATE.player.yaw = Math.PI; STATE.player.pitch = 0;
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'route_dock_inside.jpg') });
  await page.evaluate(() => {
    const f = RC.yard.layoutRef().fence;
    STATE.player.x = 0; STATE.player.z = f.maxZ - 6; STATE.player.yaw = Math.PI; STATE.player.pitch = -0.08;
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'fence_live.jpg') });

  // combat: stand on the dock lane inside, facing the warden
  await page.evaluate(() => {
    STATE.combatActive = true;
    STATE.player.x = -12.5; STATE.player.z = 68; STATE.player.yaw = 0; STATE.player.pitch = 0;
    STATE.player.health = 100;
    const g = BOTS.find((b) => b.id === 'rc-dock');
    if (g) { g.x = -12.5; g.z = 60; g.yaw = Math.PI; if (g.rig && g.rig.root) g.rig.root.position.set(-12.5, 0, 60); }
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => renderFrame());
  await page.screenshot({ path: path.join(OUT, 'combat_dock_guard.jpg') });
  await page.evaluate(() => {
    const C = COLOSSI.find((c) => !c.dead);
    if (!C) return;
    const p = C.root.position;
    STATE.player.x = p.x + 10;
    STATE.player.z = p.z + 16;
    STATE.player.yaw = Math.atan2(10, 16);
    STATE.player.pitch = 0.35;
    updateSoftSpots(0.016, performance.now());
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'colossus_weakpoints.jpg') });
  const combat = await page.evaluate(() => {
    const names = BOTS.filter((b) => !b.dying).map((b) => b.name);
    const C = COLOSSI.find((c) => !c.dead);
    let spots = null;
    if (C) {
      C.root.updateMatrixWorld(true);
      updateSoftSpots(0.016, performance.now());
      const f = RC.fixes;
      spots = (C.spots || []).map((sp) => {
        const dx = sp.pos.x - C.root.position.x, dz = sp.pos.z - C.root.position.z;
        const yaw = C.root.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
        const ahead = dx * fx + dz * fz;
        return { key: sp.key, ahead: +ahead.toFixed(2), y: +sp.pos.y.toFixed(2), max: +f.maxAhead(C).toFixed(2) };
      });
    }
    return { guards: names.filter((n) => /Warden|Dock|Airlock/i.test(n)), bots: names.length, spots };
  });
  add('both route wardens exist', combat.guards.length >= 2, combat.guards);
  add('weak points sit on the hull, not metres ahead', combat.spots && combat.spots.length >= 4 && combat.spots.every((s) => Math.abs(s.ahead) <= s.max + 0.05), combat.spots);

  const info = await page.evaluate(() => {
    renderFrame();
    const i = renderer.info.render;
    return { calls: i.calls, triangles: i.triangles, kitBytes: RC.assets.stats.bytes, kitFailed: RC.assets.stats.failed, children: RC.yard.group.children.length };
  });
  fs.writeFileSync(path.join(OUT, 'budget.json'), JSON.stringify(info, null, 2));
  add('draw calls stayed in a phone-sized budget', info.calls < 450, info);

  // victory
  await page.evaluate(() => { STATE.player.health = 100; RC.campaign.forceWin(); });
  await page.waitForSelector('#victory-overlay.on', { timeout: 8000 });
  const during = await page.evaluate(() => ({ live: RC.fence.live, open: RC.victory.open, win: RC.campaign.won(), running: STATE.running }));
  add('win powers the fence down and opens the epilogue', during.live === false && during.open && during.win, during);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'victory_overlay.jpg') });
  await page.click('#victory-skip');
  await page.waitForSelector('#victory-card:not([hidden])', { timeout: 4000 });
  const card = await page.evaluate(() => ({
    card: !document.getElementById('victory-card').hidden,
    stay: !!document.getElementById('victory-stay'),
    copy: document.getElementById('victory-card-copy').textContent.slice(0, 80)
  }));
  add('skip lands on the epilogue card (not a dead end)', card.card && card.stay, card);
  await page.screenshot({ path: path.join(OUT, 'victory_card.jpg') });
  await page.click('#victory-replay');
  await page.waitForTimeout(300);
  const replay = await page.evaluate(() => document.getElementById('victory-overlay').classList.contains('on') && document.getElementById('victory-card').hidden);
  add('epilogue can be replayed', replay, { replay });
  await page.click('#victory-skip');
  await page.click('#victory-stay');
  const stayed = await page.evaluate(() => ({
    on: document.getElementById('victory-overlay').classList.contains('on'),
    running: STATE.running,
    paused: STATE.pausedForStudio,
    z: STATE.player.z,
    live: RC.fence.live
  }));
  add('stay returns control in the open yard', !stayed.on && stayed.running && !stayed.paused && !stayed.live, stayed);

  // gate crossing after the win replays the epilogue
  await page.evaluate(() => {
    const f = RC.yard.layoutRef().fence;
    RC.fence.open = 1;
    RC.fence._gateLatch = false;
    STATE.player.x = f.gate.cx;
    STATE.player.z = f.maxZ + 0.4;
    RC.fence.update(0.2);
    return { open: RC.victory.open, z: STATE.player.z };
  });
  const gatePlay = await page.evaluate(() => RC.victory.open === true);
  add('walking the open gate starts the epilogue again', gatePlay, { gatePlay });
  await page.evaluate(() => RC.victory.finish('test'));
  await page.click('#victory-stay');

  // failed file must not strand
  await page.evaluate(() => RC.victory.play('missing'));
  const failed = await page.evaluate(() => ({
    card: !document.getElementById('victory-card').hidden,
    copy: document.getElementById('victory-card-copy').textContent,
    stay: !!document.getElementById('victory-stay')
  }));
  add('missing epilogue file shows the card and a way out', failed.card && /not stuck|did not play|fence is cold/i.test(failed.copy) && failed.stay, failed.copy.slice(0, 140));
  await page.click('#victory-stay');

  // save / reset
  const saved = await page.evaluate(() => {
    const before = RC.campaign.readSave();
    RC.campaign.reset();
    const after = RC.campaign.readSave();
    const win = RC.campaign.won();
    return { beforeWin: before && before.win, after, win, live: RC.fence.live, z: +STATE.player.z.toFixed(1) };
  });
  add('reset clears the win and locks the fence', saved.beforeWin === true && saved.after && saved.after.win === false && saved.win === false && saved.live === true && saved.z > 110, saved);

  // death / restart on floor G
  await page.evaluate(() => { STATE.player.health = 30; damagePlayer(80, { name: 'test sentry', x: 0, z: 0 }); });
  await page.waitForFunction(() => STATE.player.health >= 100 && !STATE.dying, null, { timeout: 8000 });
  const revived = await page.evaluate(() => ({ hp: STATE.player.health, z: +STATE.player.z.toFixed(1), floor: STATE.floor, kia: getComputedStyle(document.getElementById('kia')).display }));
  add('death restarts floor G back in the yard', revived.hp >= 100 && revived.floor === 0 && revived.z > 110, revived);

  // input cancel
  const inputs = await page.evaluate(() => {
    isFiringHeld = true;
    KEYS.KeyW = true;
    moveVec = { x: 0.5, y: -1 };
    moveTouchId = 3;
    LOOK.ptrs.set(9, { x: 1, y: 1 });
    LOOK.px = 12;
    RC.controls.release('test');
    return { fire: isFiringHeld, key: KEYS.KeyW, vec: moveVec.x, touch: moveTouchId, ptrs: LOOK.ptrs.size, px: LOOK.px, why: RC.controls.lastRelease };
  });
  add('pointer cancel / release drops stuck move, look, and fire', inputs.fire === false && !inputs.key && inputs.vec === 0 && inputs.touch == null && inputs.ptrs === 0, inputs);

  // resize
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const phone = await page.evaluate(() => {
    fitGameViewport();
    const c = document.getElementById('webgl-canvas');
    return { cssW: parseInt(c.style.width, 10), cssH: parseInt(c.style.height, 10), iw: innerWidth, ih: innerHeight };
  });
  await page.screenshot({ path: path.join(OUT, 'phone_portrait_yard.jpg') });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  await page.evaluate(() => fitGameViewport());
  await page.screenshot({ path: path.join(OUT, 'phone_landscape_hud.jpg') });
  add('canvas follows a phone-sized viewport', phone.iw === 390 && Math.abs(phone.cssW - phone.iw) < 8 && Math.abs(phone.cssH - phone.ih) < 8, phone);

  // fence after win already covered; one more post-reset live fence shot was earlier.
  // re-win fence dead shot
  await page.evaluate(() => { RC.campaign.forceWin(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { if (RC.victory.open) RC.victory.close('shot'); STATE.pausedForStudio = false; });
  await page.evaluate(() => {
    const f = RC.yard.layoutRef().fence;
    STATE.player.x = 0; STATE.player.z = f.maxZ - 6; STATE.player.yaw = Math.PI; STATE.player.pitch = -0.1;
    RC.fence.open = 1; RC.fence.setLive(false); RC.fence.update(1);
    if (viewModelGroup) viewModelGroup.visible = true;
    renderFrame();
  });
  await page.screenshot({ path: path.join(OUT, 'fence_open.jpg') });

  add('no unexpected page errors', errs.length === 0, errs.slice(0, 8));

  const video = page.video();
  await context.close();
  if (video) {
    const vp = await video.path();
    const dest = path.join(OUT, 'playthrough.webm');
    fs.copyFileSync(vp, dest);
    add('gameplay recording saved', fs.statSync(dest).size > 1000, dest);
  }
  await browser.close();
  if (server) server.close();
  const failedN = results.filter((r) => !r.pass).length;
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ url: URL, failed: failedN, results, errs }, null, 2));
  console.log(`\n${results.length - failedN}/${results.length} passed`);
  process.exit(failedN ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
