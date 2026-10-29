#!/usr/bin/env node
// DYSTOPIA per-level regression checks (headless Chromium). See tools/CHECKLIST.md.
// Usage: node tools/regression.js [--url URL] [--levels 1,2,...,9] [--out DIR] [--chrome PATH] [--quick]
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), http = require('http');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes('--' + k);
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(arg('out', path.join(ROOT, 'regression-out')));
const LEVELS = arg('levels', '1,2,3,4,5,6,7,8,9').split(',').map(Number);
const QUICK = flag('quick'); // floor 0 + 2 only
const CHROME = arg('chrome', process.env.CHROME || '/usr/bin/google-chrome');
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; SM-F956U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
fs.mkdirSync(OUT, { recursive: true });

function serve() { // tiny static server for the repo when no --url is given
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
  return new Promise(res => { const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); s.listen(0, '127.0.0.1', () => res([s, `http://127.0.0.1:${s.address().port}/index.html`])); });
}
const results = []; const add = (scope, check, pass, detail) => { results.push({ scope, check, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${scope.padEnd(10)} ${check}${detail ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`); };

(async () => {
  let server = null, URL = arg('url'); if (!URL) [server, URL] = await serve();
  const br = await chromium.launch({ executablePath: CHROME, args: ARGS });

  // ---------- 1. mobile start screen: Enter + Deploy visible / reachable ----------
  for (const [name, w, h, ua] of [['iphone14', 390, 664, IOS], ['iphone16', 393, 659, IOS], ['fold_cover', 344, 882, AND], ['fold_open', 673, 841, AND]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, userAgent: ua }); const p = await ctx.newPage();
    await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await p.waitForTimeout(6000);
    for (const [o, vw, vh] of [['portrait', w, h], ['landscape', h, w]]) {
      await p.setViewportSize({ width: vw, height: vh }); await p.waitForTimeout(900);
      const r = await p.evaluate(() => { const vis = id => { const e = document.getElementById(id), s = document.getElementById('splash-screen'); if (!e) return { ok: false }; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return { ok: b.width > 0 && b.top >= 0 && b.bottom <= innerHeight, top: Math.round(b.top), bottom: Math.round(b.bottom), h: innerHeight, scrolls: s && getComputedStyle(s).overflowY }; }; return vis('btn-skip-splash'); });
      await p.screenshot({ path: path.join(OUT, `start_${name}_${o}.png`) });
      add(`mobile`, `${name} ${o}: Enter button reachable`, r.ok && r.scrolls === 'auto', r);
    }
    await ctx.close();
  }

  // ---------- 2. campaign levels ----------
  const ctx = await br.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, userAgent: IOS });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  p.on('response', r => { if (r.status() >= 400) errs.push(`http ${r.status()}: ${r.url().replace(URL.replace('index.html', ''), '')}`); });
  const ev = (f, a) => p.evaluate(f, a), W = ms => p.waitForTimeout(ms);
  await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 }); await W(8000);
  await ev(() => document.getElementById('btn-skip-splash').click()); await W(500); await ev(() => document.getElementById('btn-start').click()); await W(4000);
  add('boot', 'no console errors at boot', errs.length === 0, errs.splice(0));

  for (const L of LEVELS) for (const F of (QUICK ? [0, 2] : [0, 1, 2, 3])) {
    const S = `L${L}F${F}`; errs.length = 0;
    await ev(([L, F]) => { startFloor(L, F); }, [L, F]); await W(2600);
    await ev(() => { const P = STATE.player; P.health = P.maxHealth = 1e7; STATE.combatActive = true; try { openCellDoor('regression'); } catch (e) {} const c = document.getElementById('center-banner'); c && c.classList.add('hidden'); });
    // signs
    const sg = await ev(() => { arenaGroup.updateMatrixWorld(true); let n = 0; const bad = []; arenaGroup.traverse(o => { if (!o.isMesh || o.userData.signTwin || o.geometry?.type !== 'PlaneGeometry' || !o.material?.map || !(o.material.map.image instanceof HTMLCanvasElement)) return; const im = o.material.map.image; const text = im.width / im.height > 2 || (im.width === 256 && im.height === 360); if (!text) return; n++;
      const det = o.matrixWorld.determinant(); const twin = o.children.find(c => c.userData.signTwin); const ok = det > 0 && o.material.side === THREE.FrontSide && twin && Math.abs(Math.abs(twin.rotation.y) - Math.PI) < 1e-3 && (!o.material.map.repeat || o.material.map.repeat.x > 0); if (!ok) bad.push([+o.position.x.toFixed(1), +o.position.z.toFixed(1)]); }); return { n, bad }; });
    add(S, `signs read correctly (${sg.n} text planes, 2-sided, not mirrored)`, sg.bad.length === 0, sg.bad.length ? sg.bad.slice(0, 5) : '');
    // z-fighting: coplanar overlapping faces with different looks, after the floor's anti-z pass
    const zf = await ev(() => { arenaGroup.updateMatrixWorld(true); const B = []; arenaGroup.traverse(o => { if (!o.isMesh || !o.visible || o.userData.signTwin) return; const t = o.geometry.type; if (t !== 'BoxGeometry' && t !== 'PlaneGeometry') return; if (o.material.transparent && o.material.depthWrite === false) return; const b = new THREE.Box3().setFromObject(o); if (!b.isEmpty()) B.push([b, o]); });
      const key = o => (o.material.color ? o.material.color.getHex() : 0) + '|' + (o.material.map ? o.material.map.uuid : ''); const hits = [];
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const [a, oa] = B[i], [b, ob] = B[j]; if (key(oa) === key(ob)) continue;
        for (const ax of ['x', 'y', 'z']) { const o2 = ['x', 'y', 'z'].filter(k => k !== ax); let ar = 1; for (const k of o2) { const ov = Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]); if (ov <= 0.05) { ar = 0; break; } ar *= ov; } if (!ar) continue;
          for (const f of ['min', 'max']) { if (ar >= 0.02 && Math.abs(a[f][ax] - b[f][ax]) < 0.0015) { if (ax === 'y' && f === 'min' && Math.abs(a.min.y) < 0.01) continue; if (ax === 'y' && f === 'max' && a.max.y > 11.5) continue; hits.push(`${ax}${f}@${a[f][ax].toFixed(2)} (${a.min.x.toFixed(1)},${a.min.z.toFixed(1)}) area ${ar.toFixed(2)}`); } } } }
      return { hits: hits.length, ex: hits.slice(0, 4), zfix: STATE.zfix }; });
    add(S, 'no coplanar z-fighting faces', zf.hits === 0, zf.hits ? zf : '');
    // AI: run ~8 s of real time
    const a0 = await ev(() => BOTS.filter(b => !b.dying).map(b => ({ n: b.name, x: b.x, z: b.z })));
    // AI moves on the game's clamped dt (max 0.05 s/frame), so wait on simulated frames, not wall time:
    // at swiftshader's 1-3 fps, 8 s of real time can be <1 s of game time. Need >=60 frames (~3 s sim), cap 40 s.
    const fr = await ev(() => new Promise(res => { let n = 0; const t0 = performance.now(); const L = () => { n++; const el = performance.now() - t0; if ((n >= 60 && el >= 8000) || el > 40000) res({ n, ms: Math.round(el) }); else requestAnimationFrame(L); }; requestAnimationFrame(L); }));
    const ai = await ev(a0 => { const out = { moved: 0, mobile: 0, inWall: [], floating: [], sunk: [] }; BOTS.forEach(b => { if (b.dying) return; const s = a0.find(x => x.n === b.name); const sniper = b.role === 'sniper' || (b.y || 0) > 3; if (!sniper && s) { out.mobile++; if (Math.hypot(b.x - s.x, b.z - s.z) > 0.3) out.moved++; }
      if (!sniper && collidesAt(b.x, b.z, 0.2)) out.inWall.push(b.name); const g = typeof getGroundHeightAt === 'function' ? getGroundHeightAt(b.x, b.z, b.y || 0) /* same query the game's bot physics uses */ : 0; if (!sniper && !b.isMender && (b.y || 0) - g > 0.6) out.floating.push(b.name); if ((b.y || 0) < g - 0.3) out.sunk.push(b.name); });
      (typeof DRONES !== 'undefined' ? DRONES : []).forEach(d => { if (!d.dead && d.y < 0.3) out.sunk.push('drone'); }); return out; }, a0);
    add(S, `AI moves, not stuck/floating (${ai.moved}/${ai.mobile} ground bots moved)`, ai.inWall.length === 0 && ai.floating.length === 0 && ai.sunk.length === 0 && (ai.mobile === 0 || ai.moved >= Math.ceil(ai.mobile * 0.25)), ai.inWall.length + ai.floating.length + ai.sunk.length || ai.moved < Math.ceil(ai.mobile * 0.25) ? { ...ai, frames: fr } : '');
    // Sentinel
    const sn = await ev(() => { const C = COLOSSI.find(c => !c.dead); if (!C) return null; let disc = 0; C.root.traverse(o => { if (o.isMesh && o.geometry && /Cylinder|Circle|Ring/.test(o.geometry.type)) { const b = new THREE.Box3().setFromObject(o); if (b.max.y - b.min.y < 0.8 && b.min.y < 0.6 && (b.max.x - b.min.x) > C.rad * 1.5) disc++; } });
      const P = STATE.player, sx = P.x, sz = P.z; let spot = null; for (let a = 0; a < 6.28 && !spot; a += 0.2) for (const r of [40, 32, 25]) { const x = C.root.position.x + Math.sin(a) * r, z = C.root.position.z + Math.cos(a) * r; if (!collidesAt(x, z, 1)) { spot = [x, z]; break; } }
      if (!spot) return { disc, plate: !!C.plate, follow: 'no spot' }; P.x = spot[0]; P.z = spot[1]; const fz = FLOOR_INFO.activateZ; if (STATE.floor === 0) FLOOR_INFO.activateZ = 1e9;
      const d0 = Math.hypot(P.x - C.root.position.x, P.z - C.root.position.z); let now = performance.now(); for (let i = 0; i < 200; i++) { now += 50; updateColossi(0.05, now); }
      const d1 = Math.hypot(P.x - C.root.position.x, P.z - C.root.position.z); FLOOR_INFO.activateZ = fz; P.x = sx; P.z = sz; return { disc, plate: !!C.plate, d0: +d0.toFixed(1), d1: +d1.toFixed(1) }; });
    if (sn) add(S, `Sentinel: no disc, follows player (${sn.d0}→${sn.d1} m in 10 s)`, !sn.disc && !sn.plate && sn.d1 < sn.d0 - 8, sn);
    // viewmodel per weapon: separate pass, swaps change the model, parts rigid
    const vm = await ev(async () => { const out = []; let prev = null; for (const w of [0, 1, 2, 3]) { switchWeapon(w); await new Promise(r => setTimeout(r, 700));
      const g = gunMesh; let a = g; while (a && a !== vmCam) a = a.parent; const snap = () => { g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(); const m = []; g.traverse(o => { if (o.isMesh && !(o.userData.isArm)) m.push(new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))); }); return m; };
      const r0 = snap(); let now = performance.now(), dev = 0; for (let i = 0; i < 40; i++) { const dt = [0.016, 0.1, 0.25, 0.05][i % 4]; now += dt * 1000; STATE.fireCooldown = 0; try { STATE.weapons[w].ammo = Math.max(STATE.weapons[w].ammo, 5); firePlayerWeapon(); } catch (e) {} if (i === 20) startReloadAnim(); animateViewModel(dt, now); const r1 = snap(); r1.forEach((v, k) => { if (r0[k]) dev = Math.max(dev, v.distanceTo(r0[k])); }); }
      out.push({ w, kind: g.userData.kind, sep: !!a, parts: r0.length, dev: +dev.toFixed(5), changed: prev ? prev !== g.uuid : true }); prev = g.uuid; } switchWeapon(0); return out; });
    add(S, 'viewmodel intact in separate pass; swaps change model', vm.every(v => v.sep && v.dev < 1e-4 && v.changed && v.parts > 0), vm.filter(v => !(v.sep && v.dev < 1e-4 && v.changed)).length ? vm : '');
    // shots: each weapon at 5/20/50 m on the crosshair (floor 1 of each level; all floors in non-quick)
    if (F === 1 || (QUICK && F === 2)) {
      const shots = await ev(async () => { const res = []; const P = STATE.player; const b = BOTS.find(b => !b.dying && (b.y || 0) < 1 && !b.isBoss); if (!b) return [{ err: 'no bot' }];
        const keep = { x: P.x, z: P.z }; BOTS.forEach(o => { if (o !== b && !o.dying) { o.x += 400; } });
        for (const d of [5, 20, 50]) { let lane = null, base = null;
          for (let gx = -80; gx <= 80 && !lane; gx += 4) for (let gz = -75; gz <= 75 && !lane; gz += 4) for (let a = 0; a < 6.28 && !lane; a += 0.4) { let ok = !collidesAt(gx, gz, 1); for (let t = 0.5; ok && t <= d + 1.5; t += 0.5) if (collidesAt(gx + Math.sin(a) * t, gz + Math.cos(a) * t, 1.1)) ok = false; if (ok) { lane = a; base = [gx, gz]; } }
          if (lane === null) { res.push({ d, err: 'no clear lane' }); continue; }
          for (const w of [0, 1, 2, 3]) { P.x = base[0]; P.z = base[1]; P.y = 0; b.x = P.x + Math.sin(lane) * d; b.z = P.z + Math.cos(lane) * d; b.y = 0; b.speed = 0; b.path = null; b.goal = null; b.health = b.maxHealth = 1e6; b.dying = false;
            P.yaw = lane + Math.PI; P.pitch = Math.atan2((b.y + 1.1) - (P.y + 1.68), d); STATE.aimAssist = 0; switchWeapon(w); STATE.weapons[w].ammo = Math.max(1, STATE.weapons[w].ammo); await new Promise(r => setTimeout(r, 350));
            camera.position.set(P.x, P.y + 1.68, P.z); camera.rotation.order = 'YXZ'; camera.rotation.set(P.pitch, P.yaw, 0); STATE.screenShake = 0; camera.updateMatrixWorld(true); // same view the player would see this frame
            PROJECTILES.forEach(q => scene.remove(q.mesh)); PROJECTILES.length = 0; const h0 = b.health; STATE.fireCooldown = 0; firePlayerWeapon(); const A = STATE.lastAim; if (!A) { res.push({ d, w, err: 'no shot' }); continue; }
            const onRay = A.point.clone().sub(A.origin).cross(A.dir).length(); const centre = new THREE.Vector3(b.x, b.y + 1.1, b.z); const toC = centre.clone().sub(A.start); const pass = toC.clone().sub(A.fwd.clone().multiplyScalar(toC.dot(A.fwd))).length();
            const wep = STATE.weapons[w]; const t0 = performance.now(); let hit = false; while (performance.now() - t0 < (wep.splash > 0 ? 60000 : 40000) /* frame-rate independent: wait until the projectile resolves */) { await new Promise(r => setTimeout(r, 60)); if (b.health < h0) { hit = true; break; } if (!PROJECTILES.length) break; }
            const needDmg = wep.damage > 0 && !wep.emp && !(wep.pellets > 1 && d > 30); res.push({ d, w, onRay: +onRay.toFixed(4), pass: +pass.toFixed(3), hit, ok: onRay < 0.01 && (pass < 0.6 || (wep.splash > 0 && !wep.emp)) && (!needDmg || hit) }); } }
        BOTS.forEach(o => { if (o !== b && !o.dying && o.x > 200) o.x -= 400; }); P.x = keep.x; P.z = keep.z; return res; });
      for (const w of [0, 1, 2, 3]) { const r = shots.filter(s => s.w === w); add(S, `weapon ${w} shots hit crosshair at 5/20/50 m`, r.length === 3 && r.every(s => s.ok), r.every(s => s.ok) && r.length === 3 ? '' : (r.length ? r : shots)); }
    }
    await ev(() => { const c = document.getElementById('center-banner'); c && c.classList.add('hidden'); }); await p.screenshot({ path: path.join(OUT, `${S}.png`) });
    add(S, 'no console errors on this floor', errs.length === 0, errs.slice(0, 4));
  }

  // ---------- 3. Doom Party (offline practice with AI bots) ----------
  errs.length = 0;
  await ev(() => { DM.host = true; DM.net = false; DM.me = 'host'; DM.code = null; dmStartMatch({ host: true }); }); await W(3000);
  const d0 = await ev(() => Object.values(DM.ents).filter(e => e.bot).map(e => ({ id: e.id, x: e.x, z: e.z })));
  await W(10000);
  const dm = await ev(d0 => { const o = { bots: 0, moved: 0, inWall: [] }; Object.values(DM.ents).forEach(e => { if (!e.bot || !e.alive) return; o.bots++; const s = d0.find(x => x.id === e.id); if (s && Math.hypot(e.x - s.x, e.z - s.z) > 0.3) o.moved++; if (collidesAt(e.x, e.z, 0.3)) o.inWall.push(e.id); }); o.sep = (() => { let a = gunMesh; while (a && a !== vmCam) a = a.parent; return !!a; })(); return o; }, d0);
  await p.screenshot({ path: path.join(OUT, 'doom_party.png') });
  add('DM', `Doom Party bots move, none stuck in walls (${dm.moved}/${dm.bots})`, dm.bots > 0 && dm.inWall.length === 0 && dm.moved >= Math.ceil(dm.bots * 0.5), dm);
  add('DM', 'viewmodel in separate pass', dm.sep);
  add('DM', 'no console errors', errs.length === 0, errs.slice(0, 4));

  await br.close(); if (server) server.close();
  // ---------- report ----------
  const scopes = [...new Set(results.map(r => r.scope))];
  let md = `# DYSTOPIA regression report\n\n${new Date().toISOString()} · ${URL}\n\n| Scope | Result | Failed checks |\n|---|---|---|\n`;
  scopes.forEach(s => { const r = results.filter(x => x.scope === s); const f = r.filter(x => !x.pass); md += `| ${s} | ${f.length ? '❌ FAIL' : '✅ PASS'} (${r.length - f.length}/${r.length}) | ${f.map(x => x.check).join('; ')} |\n`; });
  md += `\n## Details\n\n` + results.map(r => `- ${r.pass ? '✅' : '❌'} **${r.scope}** ${r.check}${r.detail && (typeof r.detail !== 'object' || Object.keys(r.detail).length) ? ' — `' + JSON.stringify(r.detail).slice(0, 400) + '`' : ''}`).join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, 'report.md'), md); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
  const fails = results.filter(r => !r.pass).length; console.log(`\n${results.length - fails}/${results.length} checks passed · report: ${path.join(OUT, 'report.md')}`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
