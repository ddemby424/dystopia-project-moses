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
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.hdr': 'application/octet-stream', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.vtt': 'text/vtt', '.webm': 'video/webm', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
  return new Promise((res) => {
    const s = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('no'); }
      r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    });
    s.listen(0, '127.0.0.1', () => res([s, `http://127.0.0.1:${s.address().port}/release-warehouse/index.html?notrailer=1`]));
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
  const seams = await page.evaluate(() => {
    const srcs = [...document.scripts].map((s) => s.getAttribute('src') || '');
    const kit = RC.yard.group.children.find((c) => c.name === 'kit:building-o');
    RC.victory._cam(0.7);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(-0.05, 0.08), camera);
    const seen = ray.intersectObjects(scene.children, true).slice(0, 4).map((h) => {
      let p = h.object;
      const names = [];
      while (p && names.length < 4) { names.push(p.name || p.type); p = p.parent; }
      return names.join('<');
    });
    return {
      engine: srcs.some((s) => s.includes('core/engine.js')),
      legacy: srcs.some((s) => /(^|\/)game\.js/.test(s)),
      loop: String(gameLoop).includes('RC.core.player.step') && String(gameLoop).includes('RC.core.enemies.step'),
      player: typeof RC.core.player.step === 'function',
      combat: typeof RC.core.combat.step === 'function' && typeof firePlayerWeapon === 'function',
      enemies: typeof RC.core.enemies.step === 'function' && typeof aiThink === 'function',
      levels: typeof buildArenaMap === 'function' && typeof RC.core.levels.elevator === 'function',
      tuning: STATE.walkSpeed === 14 && STATE.weapons.length === 4 && BOT_ROSTER.length === 10,
      buildingX: kit ? kit.position.x : null,
      sight: seen
    };
  });
  add('candidate runs extracted core, not root game.js', seams.engine && !seams.legacy && seams.loop && seams.player && seams.combat && seams.enemies && seams.levels && seams.tuning, seams);
  add('gate sightline is clear of the south vista block', Math.abs(seams.buildingX) > 24 && !seams.sight.some((s) => s.includes('building-o')), seams);
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
  const presentation = await page.evaluate(() => {
    const show = (id) => {
      const el = document.getElementById(id);
      if (!el) return 'missing';
      return getComputedStyle(el).display;
    };
    const obj = document.getElementById('rc-objective');
    const snap = window.__RC_LEGACY_SNAP || {};
    setBrightness(1.35);
    const legacy = localStorage.getItem('dystopia_brightness');
    const rc = JSON.parse(localStorage.getItem('dys_rc_settings_v1') || '{}');
    STATE.screenShake = 1;
    STATE.rcReduced = true;
    RC.core.player.step(0.016, performance.now());
    return {
      deploy: show('btn-start'),
      party: show('tab-party-mode'),
      qr: show('mcs-qr'),
      settings: show('rc-settings'),
      studio: show('btn-open-studio'),
      objective: obj ? obj.textContent : '',
      objDisplay: obj ? getComputedStyle(obj).display : 'missing',
      legacyBright: legacy,
      snapBright: snap.dystopia_brightness,
      rcBright: rc.bright,
      shake: STATE.screenShake,
      saveKey: !!localStorage.getItem('dys_rc_save_v1')
    };
  });
  add('menu hides deploy, party, and the phone QR', presentation.deploy === 'none' && presentation.party === 'none' && presentation.qr === 'none' && presentation.studio === 'none' && presentation.settings !== 'none', presentation);
  add('objective line is visible in the yard', presentation.objDisplay !== 'none' && /dock/i.test(presentation.objective) && /scanner/i.test(presentation.objective), presentation);
  add('settings stay in the candidate key and leave legacy brightness alone', presentation.rcBright > 1.2 && presentation.legacyBright === presentation.snapBright && presentation.shake === 0, presentation);

  /* Headless Chromium often blurs the page between Playwright calls, and the
     candidate drops keys on blur so a finger cannot stick. Drive the same
     movement function the frame loop calls, for about two thirds of a second. */
  const walked = await page.evaluate(() => {
    const z0 = STATE.player.z;
    const x0 = STATE.player.x;
    KEYS.KeyW = true;
    let now = performance.now();
    for (let i = 0; i < 40; i++) { now += 16; RC.core.player.step(0.016, now); }
    renderFrame();
    KEYS.KeyW = false;
    return { z0: +z0.toFixed(2), x0: +x0.toFixed(2), z1: +STATE.player.z.toFixed(2), x1: +STATE.player.x.toFixed(2), moved: +(z0 - STATE.player.z).toFixed(2) };
  });
  add('holding forward walks through collision for a stretch of the yard', walked.moved > 2, walked);
  await page.evaluate(() => { RC.settings.write({ bright: 1, reduced: false }); RC.settings.apply(); });

  const probes = await page.evaluate(() => {
    const dock = RC.yard.probeRoute(RC.yard.layoutRef().routes.find((r) => r.id === 'dock'), 1.25);
    const shut = RC.yard.probeRoute(RC.yard.layoutRef().routes.find((r) => r.id === 'airlock'), 1.25);
    STATE.player.x = 21; STATE.player.z = 100;
    for (let i = 0; i < 20; i++) RC.yard.update(0.1);
    const open = RC.yard.probeRoute(RC.yard.layoutRef().routes.find((r) => r.id === 'airlock'), 1.25);
    const guards = BOTS.filter((b) => /^rc-/.test(b.id)).map((b) => ({ id: b.id, ai: b.role, guard: !!b.isHumanGuard, heavy: !!b.heavy, hp: b.maxHealth, x: +b.x.toFixed(1), z: +b.z.toFixed(1) }));
    return { dock, shut, open, airlockOpen: RC.yard.airlockOpen, guards };
  });
  add('dock route is open freight into the hall', probes.dock.clear, probes.dock);
  add('airlock shutter blocks the staff lane before the scan', !probes.shut.clear, probes.shut);
  add('standing on the scanner opens the airlock', probes.airlockOpen && probes.open.clear, { open: probes.open, flag: probes.airlockOpen });
  add('routes use different guards', probes.guards.some((g) => g.id === 'rc-dock' && g.guard && g.ai === 'flanker') && probes.guards.some((g) => g.id === 'rc-airlock' && g.heavy && g.hp >= 140), probes.guards);

  const gatePose = await page.evaluate(() => {
    const f = RC.yard.layoutRef().fence;
    const gz = f.maxZ, gx = f.gate.cx;
    RC.fence.holdPose = true;
    RC.fence.setLive(true); RC.fence.setOpen(0);
    const closed = playerCollidesAt(gx, gz, 0);
    const sealed = RC.yard.gateCaption;
    RC.fence.setLive(false); RC.fence.setOpen(0);
    const deadShut = playerCollidesAt(gx, gz, 0);
    const clear = RC.yard.gateCaption;
    RC.fence.setOpen(1);
    const gap = playerCollidesAt(gx, gz, 0);
    const side = playerCollidesAt(f.minX, (f.minZ + gz) / 2, 0);
    const barY = RC.fence.gate.position.y;
    const bad = [];
    for (let i = 0; i <= 24; i++) {
      const s = RC.victory.shotAt(i / 24);
      RC.fence.setLive(s.live); RC.fence.setOpen(s.lift);
      const hit = playerCollidesAt(s.x, s.z, 0);
      if (hit || (s.z > s.gateZ - 0.15 && s.lift < 0.98)) bad.push({ i, z: +s.z.toFixed(1), hit, lift: s.lift });
    }
    RC.fence.setLive(true); RC.fence.setOpen(0); RC.fence.holdPose = false;
    return { closed, deadShut, gap, side, sealed, clear, barY: +barY.toFixed(2), bad };
  });
  add('sealed gate blocks and the sign says SEALED', gatePose.closed === true && /SEALED/.test(gatePose.sealed), gatePose);
  add('power-down leaves the gate shut until it rises', gatePose.deadShut === true && /CLEAR/.test(gatePose.clear), gatePose);
  add('fully open gate is a gap; the side fence stays solid', gatePose.gap === false && gatePose.side === true && gatePose.barY > 3.5, gatePose);
  add('epilogue walk never crosses a closed gate', gatePose.bad.length === 0, gatePose.bad);

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
    STATE.player.x = 14; STATE.player.z = 108; STATE.player.yaw = 0; STATE.player.pitch = -0.02;
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
    let track = null;
    if (C) {
      const sp = (C.spots || []).find((s) => s.bone) || (C.spots || [])[0];
      C.root.updateMatrixWorld(true);
      updateSoftSpots(0.016, performance.now());
      const bone0 = new THREE.Vector3();
      if (sp.bone) sp.bone.getWorldPosition(bone0); else bone0.copy(sp.pos);
      const spot0 = sp.pos.clone();
      const saved = sp.bone ? sp.bone.position.clone() : null;
      if (sp.bone && sp.bone.parent) {
        const desired = bone0.clone(); desired.x += 1.2;
        sp.bone.parent.updateMatrixWorld(true);
        sp.bone.position.copy(sp.bone.parent.worldToLocal(desired.clone()));
      }
      C.root.updateMatrixWorld(true);
      updateSoftSpots(0.016, performance.now() + 50);
      const bone1 = new THREE.Vector3();
      if (sp.bone) sp.bone.getWorldPosition(bone1);
      const boneMove = bone1.distanceTo(bone0);
      const spotMove = sp.pos.distanceTo(spot0);
      const follow = sp.pos.distanceTo(bone1);
      if (sp.bone && saved) sp.bone.position.copy(saved);
      const root0 = C.root.position.clone();
      C.root.position.x += 3;
      C.root.updateMatrixWorld(true);
      if (sp.bone) sp.bone.updateMatrixWorld(true);
      updateSoftSpots(0.016, performance.now() + 80);
      const rootMove = C.root.position.x - root0.x;
      const spotSlide = sp.pos.x - spot0.x;
      C.root.position.copy(root0);
      track = { key: sp.key, boneMove: +boneMove.toFixed(2), spotMove: +spotMove.toFixed(2), follow: +follow.toFixed(2), rootMove: +rootMove.toFixed(2), spotSlide: +spotSlide.toFixed(2) };
    }
    return { guards: names.filter((n) => /Warden|Dock|Airlock|Heavy/i.test(n)), bots: names.length, track };
  });
  add('both route wardens exist', combat.guards.length >= 2, combat.guards);
  add('weak points follow the skeleton when a bone and the body move', combat.track && combat.track.boneMove > 0.5 && combat.track.follow < 0.35 && Math.abs(combat.track.spotSlide - combat.track.rootMove) < 0.45, combat.track);

  const info = await page.evaluate(() => {
    renderFrame();
    const i = renderer.info.render;
    return { calls: i.calls, triangles: i.triangles, kitBytes: RC.assets.stats.bytes, kitFailed: RC.assets.stats.failed, children: RC.yard.group.children.length };
  });
  fs.writeFileSync(path.join(OUT, 'budget.json'), JSON.stringify(info, null, 2));
  add('draw calls stayed in a phone-sized budget', info.calls < 450, info);
  const ai = await page.evaluate(() => {
    const b = BOTS.find((o) => !o.dying && !o.isBoss);
    if (!b) return { missing: true };
    const saved = { x: b.x, z: b.z, y: b.y, ai: b.aiState, goal: b.goal, path: b.path, cover: b.cover, stuckN: b.stuckN || 0 };
    const crowd = BOTS.filter((o) => o !== b);
    crowd.forEach((o) => { o._dy = o.dying; o.dying = true; });
    b.x = -84; b.z = 8; b.y = 0; b.aiState = 'alert'; b.los = false; b.goal = { x: -96, z: 8 }; b.path = [{ x: -96, z: 8 }]; b.pathI = 0; b.cover = null; b.stuck = 0; b.stuckN = 0; b.role = 'pusher';
    for (let i = 0; i < 40; i++) updateBotAI(b, 0.05, performance.now() + i * 50);
    crowd.forEach((o) => { o.dying = o._dy; });
    const blocked = { x: +b.x.toFixed(2), stuckN: b.stuckN || 0, tunneled: b.x < -89 };
    b.x = 10; b.z = 10; b.y = 0; b.goal = { x: 18, z: 10 }; b.path = [{ x: 18, z: 10 }]; b.pathI = 0; b.stuck = 0; b.stuckN = 0; b.cover = null; b.aiState = 'alert'; b.thinkT = 30; b.lastKnown = null; b.los = false; b.yaw = Math.atan2(1, 0); b.role = 'pusher';
    const x0 = b.x;
    for (let i = 0; i < 40; i++) updateBotAI(b, 0.05, performance.now() + i * 50);
    const walked = Math.abs(b.x - x0);
    b.x = saved.x; b.z = saved.z; b.y = saved.y; b.aiState = saved.ai; b.goal = saved.goal; b.path = saved.path; b.cover = saved.cover; b.stuckN = saved.stuckN;
    if (b.rig && b.rig.root) b.rig.root.position.set(b.x, b.y, b.z);
    return { blocked, walked: +walked.toFixed(2) };
  });
  add('a blocked bot repaths instead of tunnelling the wall', ai.blocked && ai.blocked.tunneled === false && ai.blocked.stuckN >= 1, ai);
  add('an open-floor bot actually moves toward its goal', ai.walked > 1.5, ai);
  const motion = await page.evaluate(async () => {
    if (RC.rigs && RC.rigs.load) await RC.rigs.load();
    const b = BOTS.find((o) => !o.dying && !o.isBoss) || null;
    if (b && RC.rigs && RC.rigs.ready()) RC.rigs.adopt(b);
    if (!b || !b.clips) return { missing: true, ready: !!(RC.rigs && RC.rigs.ready()), bytes: RC.rigs && RC.rigs.bytes };
    const samples = {};
    const run = (key, moved, extra) => {
      for (let i = 0; i < 12; i++) RC.rigs.tick(b, 0.05, Object.assign({ moved, twist: 0, faceYaw: b.yaw || 0, attack: false }, extra || {}));
      const act = b.clips.actions[b.clips.current];
      samples[key] = { clip: b.clips.current, scale: act ? +act.timeScale.toFixed(2) : 0, twist: +((b.clips.spine && b.clips.spine.rotation.y) || 0).toFixed(2) };
    };
    b.dying = false; b.flinchTimer = 0; b._attackT = 0;
    run('idle', 0);
    run('walk', 1.4);
    run('run', 4.2);
    b._attackT = 0.4; run('attack', 0, { attack: true });
    b._attackT = 0; b.dying = true; run('death', 0);
    b.dying = false; b.flinchTimer = 0.2; run('hit', 0);
    b.flinchTimer = 0;
    const idleStill = samples.idle && samples.idle.clip === 'Idle';
    return { samples, idleStill, bytes: RC.rigs.bytes, failed: RC.rigs.failed };
  });
  add('guard clips blend idle, walk, run, attack, and death', motion.samples && motion.idleStill && motion.samples.walk.clip === 'Walking' && motion.samples.run.clip === 'Running' && motion.samples.attack.clip === 'Punch' && motion.samples.death.clip === 'Death', motion);
  const stuckUnits = await page.evaluate(() => {
    const C = (COLOSSI || []).find((c) => !c.dead && c.root);
    let col = null;
    if (C) {
      const px = STATE.player.x, pz = STATE.player.z, pyaw = STATE.player.yaw;
      const ox = C.root.position.x, oz = C.root.position.z;
      C.root.position.set(-84, 0, 10);
      C.moving = false; C.charge = -1; C.path = null; C.stuckN = 0; C.stuckT = 0;
      STATE.player.x = -84; STATE.player.z = 10;
      colossusLocomotion(C, 0.05, 1);
      const idleScale = C.mixer ? C.mixer.timeScale : 0;
      STATE.player.x = -120; STATE.player.z = 10;
      C.root.rotation.y = Math.PI / 2;
      const x0 = C.root.position.x;
      for (let i = 0; i < 30; i++) colossusLocomotion(C, 0.05, 40);
      col = { idleScale, x: +C.root.position.x.toFixed(2), stuckN: C.stuckN || 0, tunneled: C.root.position.x < -86.2 };
      C.root.position.set(ox, 0, oz); colossusSyncCol(C);
      STATE.player.x = px; STATE.player.z = pz; STATE.player.yaw = pyaw;
    }
    const d = (DRONES || [])[0];
    let drone = null;
    if (d) {
      const saved = { x: d.x, y: d.y, z: d.z, state: d.state, vx: d.vx, vz: d.vz };
      d.state = 'hunt'; d.x = -86; d.z = 0; d.y = 10; d.vx = -6; d.vz = 0; d.vy = 0; d.stuckT = 0.7; d.stuckN = 0; d.wp = null;
      updateDrones(0.05, performance.now());
      drone = { stuckN: d.stuckN || 0, x: +d.x.toFixed(2) };
      Object.assign(d, saved);
    }
    return { col, drone };
  });
  add('a stopped Colossus freezes its walk and does not tunnel the wall', !stuckUnits.col || (stuckUnits.col.idleScale === 0 && stuckUnits.col.tunneled === false), stuckUnits.col);
  add('a drone pinned on the boundary counts as stuck and shoves free', !stuckUnits.drone || stuckUnits.drone.stuckN >= 1, stuckUnits.drone);
  add('idle clip is not a sliding walk', motion.samples && motion.samples.idle.clip === 'Idle', motion.samples && motion.samples.idle);
  const crowdMove = await page.evaluate(() => {
    const live = BOTS.filter((o) => !o.dying && !o.isBoss);
    if (live.length < 2) return { n: live.length };
    const a = live[0], c = live[1];
    const saved = live.map((o) => ({ o, x: o.x, z: o.z, dying: o.dying }));
    a.x = 4; a.z = 4; c.x = 4.4; c.z = 4.1;
    a.dying = false; c.dying = false;
    const d0 = Math.hypot(a.x - c.x, a.z - c.z);
    a.aiState = 'combat'; a.los = true; a.role = 'pusher'; a.cover = null; a.path = null; a.goal = null;
    updateBotAI(a, 0.2, performance.now());
    const d1 = Math.hypot(a.x - c.x, a.z - c.z);
    saved.forEach((s) => { s.o.x = s.x; s.o.z = s.z; s.o.dying = s.dying; if (s.o.rig && s.o.rig.root) s.o.rig.root.position.set(s.o.x, s.o.y || 0, s.o.z); });
    return { d0: +d0.toFixed(2), d1: +d1.toFixed(2) };
  });
  add('packed guards separate instead of staying stacked', crowdMove.d1 > crowdMove.d0 + 0.15, crowdMove);
  const secretReport = await page.evaluate(() => {
    const rows = [];
    for (let f = 0; f < 4; f++) {
      STATE.floor = f;
      const lay = genFloorLayout(1, f);
      MAP_OBJECTS = lay.objects;
      FLOOR_INFO = lay.info;
      buildArenaMap();
      const d = (window.RC_SECRET_DOORS || [])[0];
      const approachBlocked = d ? playerCollidesAt(d.ax, d.az, 0) : true;
      const doorBlocked = d ? playerCollidesAt(d.obj.x, d.obj.z, 0) : false;
      const anchors = [[0, 30], [0, 0], [0, -40], [20, 10], [-20, 10]];
      let path = null;
      if (d && typeof aStar === 'function') {
        for (const [x, z] of anchors) {
          const p = aStar(x, z, d.ax, d.az);
          if (p && p.length) { path = p.length; break; }
        }
      }
      if (d) RC.secrets.open(d, 'test');
      const doorAfter = d ? playerCollidesAt(d.obj.x, d.obj.z, 0) : true;
      let walkIn = false;
      if (d) {
        walkIn = true;
        for (let i = 0; i <= 8; i++) {
          const x = d.ax + (d.rx - d.ax) * (i / 8);
          const z = d.az + (d.rz - d.az) * (i / 8);
          if (playerCollidesAt(x, z, 0)) walkIn = false;
        }
      }
      rows.push({
        floor: ['G', 'B1', 'B2', 'B3'][f],
        where: d && d.where,
        tell: d && d.tell,
        x: d && +d.obj.x.toFixed(1), z: d && +d.obj.z.toFixed(1),
        ax: d && d.ax, az: d && d.az, rx: d && d.rx, rz: d && d.rz,
        room: !!(d && d.room),
        approachBlocked, doorBlocked, doorAfter, opened: !!(d && d.open),
        path, walkIn
      });
    }
    STATE.level = 1;
    STATE.floor = 0;
    return rows;
  });
  add('each floor generates a secret room that blocks, then opens', secretReport.length === 4 && secretReport.every((r) => r.room && r.opened && r.doorBlocked === true && r.doorAfter === false && r.approachBlocked === false), secretReport);
  add('each secret room is reachable from the hall and walkable once open', secretReport.every((r) => r.path > 0 && r.walkIn), secretReport);
  fs.writeFileSync(path.join(OUT, 'secrets.json'), JSON.stringify(secretReport, null, 2));

  // Campaign progression uses advanceFloor, the same call the elevator makes.
  // Clearing an early floor must not open the fence. Only 9-B3 does.
  const progress = await page.evaluate(() => {
    const liveBefore = RC.fence.live;
    const lvl = STATE.level, fl = STATE.floor;
    advanceFloor();
    const afterFirst = { level: STATE.level, floor: STATE.floor, win: RC.campaign.won(), live: RC.fence.live };
    STATE.level = 9; STATE.floor = 2; STATE.floorCleared = true;
    advanceFloor();
    const afterB2 = { level: STATE.level, floor: STATE.floor, win: RC.campaign.won(), live: RC.fence.live };
    STATE.level = 9; STATE.floor = 3;
    advanceFloor();
    return { liveBefore, from: { lvl, fl }, afterFirst, afterB2, win: RC.campaign.won(), live: RC.fence.live, overlay: RC.victory.open };
  });
  add('clearing floor G advances inside the factory and the fence stays live', progress.afterFirst.level === 1 && progress.afterFirst.floor === 1 && progress.afterFirst.win === false && progress.afterFirst.live === true, progress.afterFirst);
  add('level 9 floor B2 still does not open the fence', progress.afterB2.level === 9 && progress.afterB2.floor === 3 && progress.afterB2.win === false && progress.afterB2.live === true, progress.afterB2);
  add('the real 9-B3 advanceFloor is the win', progress.win === true && progress.live === false && progress.overlay === true, progress);
  await page.waitForSelector('#victory-overlay.on', { timeout: 8000 });
  const during = await page.evaluate(() => ({ live: RC.fence.live, open: RC.victory.open, win: RC.campaign.won(), running: STATE.running }));
  add('win powers the fence down and opens the epilogue', during.live === false && during.open && during.win, during);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'victory_overlay.jpg') });
  await page.click('#victory-skip');
  await page.waitForFunction(() => { const c = document.getElementById('victory-card'); return c && !c.hidden; }, null, { timeout: 8000 });
  const card = await page.evaluate(() => ({
    card: !document.getElementById('victory-card').hidden,
    stay: !!document.getElementById('victory-stay'),
    copy: document.getElementById('victory-card-copy').textContent.slice(0, 80)
  }));
  add('skip lands on the epilogue card (not a dead end)', card.card && card.stay, card);
  await page.screenshot({ path: path.join(OUT, 'victory_card.jpg') });
  await page.click('#victory-replay');
  await page.waitForFunction(() => {
    const overlay = document.getElementById('victory-overlay');
    const card = document.getElementById('victory-card');
    return overlay && overlay.classList.contains('on') && card && card.hidden;
  }, null, { timeout: 4000 });
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
  await page.evaluate(() => { STATE.level = 9; STATE.floor = 3; advanceFloor(); });
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
