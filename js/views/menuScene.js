/* VIEW — Animated start menu. The painted castle (assets/img/menu/menu-bg.webp) is the CSS background of #menu;
   this canvas only draws what moves on top of it: twinkling stars, lightning, bats, fireflies and the pulsing gate rune.
   Positions below are in the 1280x800 menu space and match the current background picture. */
(function () {
  const ui = G.ui;
  const cv = ui.$('menuCanvas'), ctx = cv.getContext('2d');
  const W = 1280, H = 800;
  const RUNE = { x: 646, y: 527 };                          // glowing rune on the castle gate
  const SKY_BOLT_ZONES = [[40, 400], [1215, 1260]];         // lightning stays beside the castle and clear of the moon
  let running = false, last = 0, nextBolt = 1800, bolt = null, flash = 0;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const twinkles = Array.from({ length: 22 }, () => ({ x: rnd(20, W - 20), y: rnd(10, 200), s: rnd(2, 4.5), p: rnd(0, 6), v: rnd(1.2, 2.6) }));
  const fireflies = Array.from({ length: 22 }, () => ({ x: rnd(40, W - 40), y: rnd(600, 790), p: rnd(0, 6), vx: rnd(-12, 12), vy: rnd(-6, 6) }));
  const bats = Array.from({ length: 3 }, (_, i) => ({ x: -60 - i * 400, y: rnd(110, 260), v: rnd(55, 85), ph: rnd(0, 6), s: rnd(0.8, 1.15) }));

  function makeBolt() {
    const [a, b] = SKY_BOLT_ZONES[Math.random() < 0.5 ? 0 : 1];
    const pts = []; let x = rnd(a, b), y = -10;
    while (y < 230) { pts.push([x, y]); x += rnd(-35, 35); y += rnd(25, 45); }
    pts.push([x, y]);
    const branch = pts.slice(2, 4).map(([px, py], i) => [px + (i + 1) * rnd(15, 30), py + (i + 1) * 25]);
    return { pts, branch: [pts[2], ...branch], t: 0 };
  }
  function star(x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y - s * 2); ctx.lineTo(x + s * 0.45, y - s * 0.45); ctx.lineTo(x + s * 2, y); ctx.lineTo(x + s * 0.45, y + s * 0.45);
    ctx.lineTo(x, y + s * 2); ctx.lineTo(x - s * 0.45, y + s * 0.45); ctx.lineTo(x - s * 2, y); ctx.lineTo(x - s * 0.45, y - s * 0.45); ctx.fill();
  }
  function bat(b, t) {
    const flap = Math.sin(t * 13 + b.ph) * 9 * b.s;
    ctx.fillStyle = '#3a2a5e';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y); ctx.quadraticCurveTo(b.x - 13 * b.s, b.y - 8 * b.s - flap, b.x - 26 * b.s, b.y - flap);
    ctx.quadraticCurveTo(b.x - 13 * b.s, b.y + 3, b.x, b.y + 7 * b.s);
    ctx.quadraticCurveTo(b.x + 13 * b.s, b.y + 3, b.x + 26 * b.s, b.y - flap);
    ctx.quadraticCurveTo(b.x + 13 * b.s, b.y - 8 * b.s - flap, b.x, b.y); ctx.fill();
    ctx.beginPath(); ctx.arc(b.x, b.y + 2, 6 * b.s, 0, Math.PI * 2); ctx.fill();                 // round body
    ctx.fillStyle = '#ffe070'; ctx.fillRect(b.x - 3.5 * b.s, b.y, 2, 2); ctx.fillRect(b.x + 1.5 * b.s, b.y, 2, 2);
  }
  function stroke(pts, width) { ctx.lineWidth = width; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; const t = now / 1000;
    ctx.clearRect(0, 0, W, H);

    // twinkling stars in the sky
    ctx.fillStyle = '#fff6d0';
    for (const s of twinkles) { const a = Math.max(0, Math.sin(t * s.v + s.p)); if (a < 0.05) continue; ctx.globalAlpha = a; star(s.x, s.y, s.s * (0.6 + a * 0.4)); }
    ctx.globalAlpha = 1;

    // lightning: a soft lilac flash and a short bolt beside the castle (friendly, not scary)
    nextBolt -= dt * 1000;
    if (nextBolt <= 0) { bolt = makeBolt(); flash = 1; nextBolt = rnd(4500, 9000); G.audio.thunder(0.2); }
    if (flash > 0) { ctx.fillStyle = `rgba(235,225,255,${flash * 0.28})`; ctx.fillRect(0, 0, W, H); }
    if (bolt && bolt.t < 0.4) {
      bolt.t += dt;
      ctx.globalAlpha = bolt.t < 0.08 || (bolt.t > 0.16 && bolt.t < 0.3) ? 1 : 0.35;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(200,170,255,0.55)'; stroke(bolt.pts, 12); stroke(bolt.branch, 7);
      ctx.strokeStyle = '#fffbe8'; stroke(bolt.pts, 4); stroke(bolt.branch, 2.5);
      ctx.globalAlpha = 1;
    }
    flash = Math.max(0, flash - dt * 2.2);

    // bats fluttering across now and then
    for (const b of bats) {
      b.x += b.v * dt; b.y += Math.sin(t * 2 + b.ph) * 0.5;
      if (b.x > W + 60) { b.x = -rnd(200, 900); b.y = rnd(110, 260); }
      if (b.x > -40) bat(b, t);
    }

    // gate rune pulse
    const pulse = 0.5 + Math.sin(t * 2.4) * 0.5;
    const g = ctx.createRadialGradient(RUNE.x, RUNE.y, 2, RUNE.x, RUNE.y, 46 + pulse * 10);
    g.addColorStop(0, `rgba(240,200,255,${0.55 + pulse * 0.35})`); g.addColorStop(0.35, `rgba(190,110,255,${0.3 + pulse * 0.25})`); g.addColorStop(1, 'rgba(160,80,240,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(RUNE.x, RUNE.y, 60, 0, Math.PI * 2); ctx.fill();

    // fireflies drifting over the grass
    for (const f of fireflies) {
      f.x += (f.vx + Math.sin(t + f.p) * 8) * dt; f.y += (f.vy + Math.cos(t * 1.3 + f.p) * 6) * dt;
      if (f.x < 0) f.x = W; if (f.x > W) f.x = 0; if (f.y < 590) f.vy = Math.abs(f.vy); if (f.y > 795) f.vy = -Math.abs(f.vy);
      const a = 0.35 + Math.max(0, Math.sin(t * 2.2 + f.p)) * 0.65;
      const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9);
      fg.addColorStop(0, `rgba(255,245,160,${a})`); fg.addColorStop(1, 'rgba(255,220,90,0)');
      ctx.fillStyle = fg; ctx.fillRect(f.x - 9, f.y - 9, 18, 18);
    }
    requestAnimationFrame(frame);
  }

  G.menuStart = function () { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  G.menuLightning = function () { nextBolt = 0; };   // for testing from the console
  G.menuStop = function () { running = false; ctx.clearRect(0, 0, W, H); };
})();
