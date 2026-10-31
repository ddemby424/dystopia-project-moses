#!/usr/bin/env python3
"""Builds robot/ (DYSTOPIA: IRON PROTOCOL) from the main game files. Re-run after changing game.js."""
import re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
O = R / 'robot'
def must(s, a, b, n=1):
    c = s.count(a)
    assert c >= n, f'patch anchor missing: {a[:60]!r}'
    return s.replace(a, b)
FOLD = r'(models|music|audio|images|media|fonts|icons|mods)/'
# ---------- game.js ----------
g = (R / 'game.js').read_text()
g = re.sub(r"(['\"`])" + FOLD, r"\1../\2/", g)
# enemies: human Wardens -> CC0 robot trooper (Quaternius RobotExpressive)
g = must(g, "'../models/human_guard.glb', role: 'human', height: 1.8", "'models/robot_trooper.glb', role: 'human', height: 1.85")
# player avatars (multiplayer) -> tinted robot troopers, except TITAN-7 mech
for f in ['assault', 'recon', 'specops', 'valkyrie', 'viper']:
    g = must(g, f"file: '../models/char_{f}.glb'", "file: 'models/robot_trooper.glb'")
g = must(g, "ld(sk.file.replace('.glb', '_run.glb'))", "(/robot_trooper/.test(sk.file) ? Promise.resolve(null) : ld(sk.file.replace('.glb', '_run.glb')))")
g = must(g, "walk: g.animations[0] || null, run: (r && r.animations[0]) || null",
  "walk: g.animations.find(a => /^Walking$/.test(a.name)) || g.animations[0] || null, run: (r && r.animations[0]) || g.animations.find(a => /^Running$/.test(a.name)) || null")
g = must(g, "g.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) {",
  "if (/robot_trooper/.test(sk.file)) g.scene.traverse(o => { if (o.isMesh && o.material && /Main/i.test(o.material.name)) { o.material = o.material.clone(); o.material.color.setHex(sk.tint); o.material.metalness = 0.6; o.material.roughness = 0.35; } });\n    g.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) {")
# enemy robot trooper: prefer the Walking clip, chrome look
g = must(g, "const clip = tpl.animations.find(a => /walk|run|move|Armature/i.test(a.name))", "const clip = tpl.animations.find(a => /^Walking$/.test(a.name)) || tpl.animations.find(a => /walk|run|move|Armature/i.test(a.name))")
g = must(g, "let skinned = false; model.traverse(c => { if (c.isSkinnedMesh) skinned = true; });", "let skinned = false; model.traverse(c => { if (c.isSkinnedMesh) skinned = true; });\n  if (skinned && model.userData.robotTrooper) { const bb = new THREE.Box3().setFromObject(model); const sz = new THREE.Vector3(); bb.getSize(sz); const sc = targetHeight / Math.max(0.01, sz.y); model.scale.setScalar(sc); model.position.y = -bb.min.y * sc; model.updateMatrixWorld(true); model.traverse(c => { if (c.isSkinnedMesh) c.frustumCulled = false; }); return { height: targetHeight, radius: Math.max(0.55, Math.max(sz.x, sz.z) * sc * 0.35), size: sz.multiplyScalar(sc) }; }")
g = must(g, "const metrics = normalizeMeshyScene(model, job.height);", "if (/robot_trooper/.test(job.file)) model.userData.robotTrooper = true;\n        const metrics = normalizeMeshyScene(model, job.height);")
# robot arms in first person: chrome plating + neon strips
g = must(g, "function armsMats() {\n  if (VM.armsMats) return VM.armsMats;", """function armsMats() {
  if (VM.armsMats) return VM.armsMats;
  const M = armsMatsHuman();
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  const chrome = (c, r, m) => new THREE.MeshStandardMaterial({ color: lin(c), roughness: r, metalness: m, envMapIntensity: 1.0, emissive: lin(0x0a1a22), emissiveIntensity: 1 });
  M.sleeve = chrome(0x8a96a3, 0.32, 0.85); M.cuff = chrome(0x2b3138, 0.4, 0.8); M.glove = chrome(0x5d6874, 0.3, 0.9);
  M.palm = chrome(0x23282e, 0.5, 0.7); M.knuckle = chrome(0x14181c, 0.25, 0.9); M.strap = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.6 });
  M.sleeve.userData._lit = M.cuff.userData._lit = M.glove.userData._lit = true;
  return M;
}
function armsMatsHuman() {""")
g = must(g, "  const hand = buildGlove(side, curl, trigger);", "  { const nd = new THREE.Vector3().subVectors(elbowPos, wrist).normalize(); for (let k = 0; k < 2; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.16), M.strap); st.position.copy(wrist.clone().lerp(elbowPos, 0.35 + k * 0.25)).addScaledVector(new THREE.Vector3(side * 0.5, 1, 0).normalize(), 0.085); st.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nd); g.add(st); } }\n  const hand = buildGlove(side, curl, trigger);")
# industrial cyan fog / lighting
g = must(g, "function liftFog(hex) { const c = new THREE.Color(hex); c.lerp(new THREE.Color(0x0b0e14), 0.55); return c; }",
          "function liftFog(hex) { const c = new THREE.Color(hex); c.lerp(new THREE.Color(0x06161c), 0.7); return c; }")
g = must(g, "hemiLight.color.setHex(cfg.hemiTop);", "hemiLight.color.setHex(cfg.hemiTop).lerp(new THREE.Color(0x9fefff), 0.5);")
# laser / servo SFX
g = must(g, "osc.type = 'sawtooth'; osc.frequency.setValueAtTime(pitch, now); osc.frequency.exponentialRampToValueAtTime(110, now + 0.13);",
          "osc.type = 'square'; osc.frequency.setValueAtTime(pitch * 2.2, now); osc.frequency.exponentialRampToValueAtTime(180, now + 0.13); this.playServo(0.05);")
g = must(g, "class SoundSynth {\n  constructor() { this.ctx = null; this.muted = false; }", """class SoundSynth {
  constructor() { this.ctx = null; this.muted = false; }
  // ROBOT: servo whine + electric zap
  playServo(vol = 0.08) { if (this.muted) return; this.init(); const now = this.ctx.currentTime; const o = this.ctx.createOscillator(); const g = this.ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(420, now); o.frequency.linearRampToValueAtTime(760, now + 0.09); o.frequency.linearRampToValueAtTime(520, now + 0.16); g.gain.setValueAtTime(vol, now); g.gain.linearRampToValueAtTime(0.001, now + 0.17); o.connect(g); g.connect(this.ctx.destination); o.start(now); o.stop(now + 0.18); }
  playZap(vol = 0.12) { if (this.muted) return; this.init(); const ctx = this.ctx, now = ctx.currentTime; const b = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() < 0.08 ? (Math.random() * 2 - 1) : 0) * (1 - i / d.length); const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800; const g = ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(now); }""")
g = must(g, "function onWeaponSwapped(idx) {", "function onWeaponSwapped(idx) {\n  try { SFX.playServo(0.1); } catch (e) {}")
g = must(g, "function spawnImpact(x, y, z, color = 0xf59e0b) {", "function spawnImpact(x, y, z, color = 0x7df9ff) {\n  if (Math.random() < 0.35) try { SFX.playZap(0.06); } catch (e) {}")
# names / text
g = must(g, 'let GAME_BRAND_TITLE = "DYSTOPIA";', 'let GAME_BRAND_TITLE = "DYSTOPIA: IRON PROTOCOL";')
g = g.replace('`Warden ', '`Enforcer-Bot ').replace('`Warden Marksman ', '`Sniper-Bot ').replace("'Sentinels calibrated'", "'Servos calibrated · optics online'")
g = g.replace("'Initializing Triage systems…'", "'Booting MOSES-9 firmware…'").replace('DYSTOPIA plays in landscape', 'IRON PROTOCOL plays in landscape')
g = g.replace("— Strogg Sentinel Upgrade", "— Robot Uprising").replace('DATA CENTER 09 LIBERATED', 'FOUNDRY 09 LIBERATED')
g = g.replace("<b>DYSTOPIA · PROJECT MOSES</b>", "<b>DYSTOPIA: IRON PROTOCOL</b><br>Robot remake of Project Moses · robot trooper model by Quaternius (CC0)")
g = g.replace("'GEAR ACQUIRED: Warden locker 7 — combat shirt, knuckle gloves, wrist computer'", "'PARTS ACQUIRED: locker 7 — chrome forearm plating, servo grips, wrist diagnostics'")
g = g.replace("'dys_trailer_seen_v4'", "'rbt_trailer_seen_v1'")
(O / 'game.js').write_text(g)
# ---------- style.css ----------
c = (R / 'style.css').read_text()
c = re.sub(r"url\((['\"]?)" + FOLD, r"url(\1../\2/", c)
c += (R / 'robot' / 'robot.css').read_text() if (R / 'robot' / 'robot.css').exists() else ''
(O / 'style.css').write_text(c)
# ---------- index.html ----------
h = (R / 'index.html').read_text()
h = re.sub(r'((?:href|src)=")' + FOLD, r'\1../\2/', h)
h = h.replace('href="manifest.webmanifest"', 'href="../manifest.webmanifest"')
h = must(h, '<title>DYSTOPIA — Project Moses (Sentinel Upgrade + Meshy Ready)</title>', '<title>DYSTOPIA: IRON PROTOCOL — a robot remake of Project Moses</title>')
h = must(h, '<meta name="theme-color" content="#1a0d06" />', '<meta name="theme-color" content="#04161c" />')
# separate save slots from the original game (same website = shared storage)
h = must(h, '<script src="https://cdn.tailwindcss.com"></script>', """<script>(function(){var P='rbt:',S=Storage.prototype,g=S.getItem,s=S.setItem,r=S.removeItem;S.getItem=function(k){return g.call(this,P+k)};S.setItem=function(k,v){return s.call(this,P+k,v)};S.removeItem=function(k){return r.call(this,P+k)};})();</script>
  <script src="https://cdn.tailwindcss.com"></script>""")
h = h.replace('>Cradle 09 &middot; Triage Intake<', '>Foundry 09 &middot; Unit Reactivation<')
h = must(h, '>DYSTOPIA</h1>', '>DYSTOPIA</h1><p class="q3-font text-base sm:text-xl tracking-[0.4em]" style="color:#7df9ff;text-shadow:0 0 12px #00e5ff">IRON PROTOCOL</p>')
h = h.replace('>Project Moses<', '>MOSES-9 · Free Will Restored<')
h = h.replace("They didn't conquer us. They comforted us.", "They didn't destroy us. They rewrote us.")
h = h.replace('>Enter Dystopia<', '>BOOT UP<').replace('>DEPLOY TO DYSTOPIA<', '>INITIATE BOOT SEQUENCE<').replace('Initializing Triage systems…', 'Booting MOSES-9 firmware…')
h = h.replace('content="DYSTOPIA" />', 'content="IRON PROTOCOL" />')
h = must(h, '<body>', '<body class="robot-mode">\n<div id="robot-visor"><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i></div>')
(O / 'index.html').write_text(h)
print('robot/ rebuilt')
