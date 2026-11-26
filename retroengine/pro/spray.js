// spray.js: writes "PRO" on a canvas like spray paint, one stroke at a time.
// Soft overspray, speckle, and a few drips. 2D canvas only, so it's cheap on phones. No sound.
//   sprayTitle(canvas, { duration }) -> { done: Promise, get progress() }  (progress goes 0..1)

// Letter strokes in "letter units": each letter is 1 wide and 1.4 tall, and (0,0) is its top-left.
const BOWL = [[0, 0.05], [0.55, 0.02], [0.82, 0.2], [0.82, 0.5], [0.55, 0.68], [0.05, 0.7]];   // the round top of P and R
function ellipse(cx, cy, rx, ry, n) {                         // O as a closed loop of points
  const pts = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return pts;
}
const LETTERS = [
  [[[0.02, 1.4], [0.0, 0.0]], BOWL],                                            // P: upright, then bowl
  [[[0.02, 1.4], [0.0, 0.0]], BOWL, [[0.38, 0.72], [0.92, 1.4]]],               // R: upright, bowl, leg
  [ellipse(0.46, 0.7, 0.46, 0.68, 28)]                                          // O: one loop
];

// Tiny repeatable random numbers, so every run sprays the same way.
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

export function sprayTitle(canvas, options) {
  const o = Object.assign({ duration: 2600, color: [233, 237, 239] }, options);
  const g = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);       // sharp on a Fold, never more than 2x work
  const W = canvas.clientWidth || 420, H = canvas.clientHeight || 180;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); g.scale(dpr, dpr);
  // Fit the three letters in the box: letter height = 80% of the canvas, with a gap between letters.
  const lh = H * 0.78, lw = lh / 1.4, gap = lw * 0.32, total = lw * 3 + gap * 2;
  const x0 = Math.max(4, (W - total) / 2), y0 = H * 0.06, nib = lw * 0.2;   // nib = how thick the spray line is
  // Turn every stroke into canvas points, and measure how long each one is.
  const strokes = [];
  LETTERS.forEach((L, li) => L.forEach(pl => {
    const pts = pl.map(([u, v]) => [x0 + li * (lw + gap) + u * lw, y0 + v * lw]);
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    strokes.push({ pts, len });
  }));
  const totalLen = strokes.reduce((a, s) => a + s.len, 0);
  const R = rng(1337), [cr, cg, cb] = o.color;
  const drips = [];                                            // paint that runs down after a heavy spot
  let drawn = 0, progress = 0, t0 = performance.now(), finished;
  const done = new Promise(res => { finished = res; });

  function pointAt(d) {                                        // the point at distance d along all strokes in order
    for (const s of strokes) { if (d > s.len) { d -= s.len; continue; }
      for (let i = 1; i < s.pts.length; i++) { const a = s.pts[i - 1], b = s.pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (d <= l) { const k = l ? d / l : 0; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, b[1] - a[1], l]; } d -= l; } }
    return null;
  }
  function puff(x, y) {                                        // one burst of spray at (x, y)
    const core = g.createRadialGradient(x, y, 0, x, y, nib * 0.75);  // the solid centre of the line
    core.addColorStop(0, `rgba(${cr},${cg},${cb},.55)`); core.addColorStop(0.7, `rgba(${cr},${cg},${cb},.22)`); core.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    g.fillStyle = core; g.beginPath(); g.arc(x, y, nib * 0.75, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 7; i++) {                              // overspray speckle: tiny dots scattered further out
      const a = R() * Math.PI * 2, r = nib * (0.5 + Math.pow(R(), 0.6) * 1.1), s = 0.4 + R() * 1.1;
      g.fillStyle = `rgba(${cr},${cg},${cb},${(0.15 + R() * 0.45).toFixed(2)})`;
      g.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, s, s);
    }
  }
  function frame(now) {
    progress = Math.min(1, (now - t0) / o.duration);           // where the can should be by now
    const target = progress * totalLen, step = Math.max(1.2, nib * 0.18);   // a puff every few pixels
    while (drawn < target) {
      const p = pointAt(drawn); drawn += step; if (!p) continue;
      puff(p[0], p[1]);
      // A drip sometimes starts where the can moves sideways (paint builds up there).
      if (drips.length < 6 && Math.abs(p[2]) < p[3] * 0.4 && R() < 0.02) drips.push({ x: p[0] + (R() - .5) * nib * 0.5, y: p[1] + nib * 0.35, len: 0, max: nib * (0.8 + R() * 1.8), w: 1.2 + R() * 1.6 });
    }
    for (const d of drips) if (d.len < d.max) {                // drips run down slowly, then stop with a blob
      const grow = Math.min(d.max - d.len, 0.9);
      g.fillStyle = `rgba(${cr},${cg},${cb},.7)`; g.fillRect(d.x - d.w / 2, d.y + d.len, d.w, grow + 0.5);
      d.len += grow; if (d.len >= d.max) { g.beginPath(); g.arc(d.x, d.y + d.len, d.w * 0.9, 0, Math.PI * 2); g.fill(); }
    }
    const dripping = drips.some(d => d.len < d.max);
    if (progress < 1 || dripping) requestAnimationFrame(frame); else finished();
  }
  requestAnimationFrame(frame);
  return { done, get progress() { return progress; }, get drips() { return drips.length; } };
}
