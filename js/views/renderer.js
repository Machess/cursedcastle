/* First-person grid raycaster (Eye of the Beholder look, smooth Grimrock-style motion).
   Walls/floors/ceilings are textured per room theme; things are billboards depth-tested per column. */
(function () {
  const W = 384, H = 219, TS = G.TEX_SIZE || 128, TM = TS - 1;   // the view in the game screen design is 690 x 393
  /* "standing back": the eye sits BACK of the middle of its square (looking ahead), and the view is zoomed out by ZOOM,
     so the wall or door in front is a step away with floor and side walls round it, as if you are looking at it,
     not bumping into it. cam.back (0..) overrides BACK: battles step in closer (controllers/combat.js). */
  G.VIEW_BACK = 0.45; G.VIEW_ZOOM = 0.8;
  let PLANE = 0.724 / G.VIEW_ZOOM, K = H * G.VIEW_ZOOM;   // K = how tall a wall 1 square away is on screen
  G.VIEW_W = W; G.VIEW_H = H;

  function Renderer(canvas) {
    this.cv = canvas; canvas.width = W; canvas.height = H;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.img = this.ctx.createImageData(W, H);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.zbuf = new Float32Array(W);
    this.flash = 0; this.boost = 0;                // boost: a short burst of extra torchlight (poking a torch)
    // what is drawn in each screen column, for tapping things in the picture (controllers/poke.js)
    this.bcB = new Uint8Array(24); this.bcL = new Int16Array(24); this.bcS = new Uint8Array(24);   // beams crossed by one column's ray
    this.bclipD = new Float32Array(W); this.bclipY = new Float32Array(W);   // the nearest beam in each column (hides hanging things behind it)
    // blocks (blocks.js) one column's ray passed over: group, near and far distance, which side it entered (sorted when drawn)
    this.lg = new Array(12); this.lt = new Float32Array(12); this.lf = new Float32Array(12); this.ls = new Uint8Array(12); this.colSt = 0;
    // the low blocks in each column (for hiding the bottom of things behind them): near, far, height
    this.lowN = new Uint8Array(W); this.lowD = new Float32Array(W * 8); this.lowE = new Float32Array(W * 8); this.lowH = new Float32Array(W * 8);
    this.pk = { name: new Array(W).fill(null), idx: new Int32Array(W), tx: new Int16Array(W), top: new Float32Array(W), lh: new Float32Array(W), perp: new Float32Array(W), key: new Int32Array(W), sprites: [] };
  }

  /* How light works (G.LIGHT_LOOK): everything near you is lit, as if you carry a little lantern. That light fades with
     distance (indoors faster, so a room shows itself as you walk in), down to a warm glow that never goes pitch black.
     The light pools round torches, chandeliers and fires do not fade like that: you see a fire glowing from across the
     room, but what stands in the dark corner next to it only shows once you come close. */
  G.LIGHT_LOOK = { fade: 0.21, least: 0.23, poolFade: 0.04, poolLeast: 0.62,     // indoors: per square, the lowest it goes; pools a little
                   outFade: 0.15, outLeast: 0.1,                                 // outside: the sky lights everything, it fades gently
                   ambient: 0.5, ambientDark: 0.72,                              // a room's own light: with lights in it, without any
                   radius: 2.3, pool: 0.95, spotless: 1.14,                      // spotless: a room you cleaned up (cleaning.js)                                      // how far each light's pool reaches (squares), how bright its middle
                   mood: { cellar: 0.78, library: 0.86, hallway: 0.9, stairs: 0.86, vault: 0.8, tower: 0.9, smithy: 0.9, lab: 0.9,
                           greenhouse: 1.18, ballroom: 1.06, toyroom: 1.08, bathroom: 1.06, gallery: 1.02 } };
  const NAME_FAR = 2.6;                                 // a friend's name shows from this far (in squares, from the eye) and fades in just before
  let FADE = 0.21, LEAST = 0.23;                         // set for each picture (indoors or out)
  function lightAt(d) { const l = 1.12 - (d - G.VIEW_BACK) * FADE; return l < LEAST ? LEAST : l > 1 ? 1 : l; }   // the light you carry, from where you stand
  function poolAt(d) { const L = G.LIGHT_LOOK, l = 1.04 - (d - G.VIEW_BACK) * L.poolFade; return l < L.poolLeast ? L.poolLeast : l > 1 ? 1 : l; }
  function shadePx(c, li) {
    const r = ((c & 255) * li) >> 8, g = (((c >> 8) & 255) * li) >> 8, b = (((c >> 16) & 255) * li) >> 8;
    return (0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r)) >>> 0;
  }
  /* warm light: red and green get a bit more than blue (torchlight); li and warm are 256-based */
  function shadeWarm(c, li, warm) {
    const lr = li + (warm >> 2), lg = li + ((warm * 3) >> 4), lb = li - (warm >> 2);   // golden, not pink
    const r = ((c & 255) * lr) >> 8, g = (((c >> 8) & 255) * lg) >> 8, b = (((c >> 16) & 255) * (lb > 0 ? lb : 0)) >> 8;
    return (0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r)) >>> 0;
  }
  /* a see-through pixel o laid over c (natural walls: marks and decorations over the long wall strip) */
  function mix(c, o) {
    const a = o >>> 24; if (a > 245) return o; if (a < 8) return c; const b = 255 - a;
    return (0xff000000 | ((((o >>> 16) & 255) * a + ((c >>> 16) & 255) * b) >> 8) << 16 | ((((o >>> 8) & 255) * a + ((c >>> 8) & 255) * b) >> 8) << 8 | (((o & 255) * a + (c & 255) * b) >> 8)) >>> 0;
  }
  /* where along the long wall strip a wall column is (wallLook.js): the strip runs on from square to square along a
     wall line; each line starts at its own place in it */
  function along(idx, side, face, tx, Wm) {
    const flip = face === 1 || face === 2;              // these faces' pictures run right to left
    const a = side === 0 ? (idx / Wm) | 0 : idx % Wm, line = side === 0 ? idx % Wm : (idx / Wm) | 0;
    return (flip ? -a : a) * TS + tx + (hash(line, face, 5) & 63) * TS;
  }
  const md = (v, m) => ((v % m) + m) % m;
  /* soft shadow along the top and bottom of every wall (where it meets the ceiling and the floor) */
  const AOY = new Float32Array(TS);
  for (let y = 0; y < TS; y++) AOY[y] = 1 - 0.3 * Math.max(0, 1 - y / (TS * 0.12)) - 0.45 * Math.max(0, 1 - (TS - 1 - y) / (TS * 0.17));

  /* ---------- light: each room has a little ambient light, and torches, lamps, candles, windows and fires
     light pools around them that flicker (three flicker groups so they don't all pulse together).
     Kept per room (light does not shine through walls). LS samples per square. ---------- */
  const LS = 6, LIGHT_WORDS = /torch|sconce|lantern|lamp|candle|candelabra|chandelier|fire|forge|oven|window|lamppost|brazier/;
  function hash0(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >> 13)) * 1274126177; return (h ^ (h >> 16)) >>> 0; }
  G.wallVariant = function (world, wx, wy, code, th) {            // which wall picture a wall face shows (same pick as the renderer)
    if (world.secret && world.secret[wy * world.w + wx]) return 0;   // a hidden secret wall is plain (its odd bit is drawn by itself)
    if (world.fixedPic && world.fixedPic[(wy * world.w + wx) * 4 + code]) return 0;   // so is a wall with its own picture (blocks.js)
    const n = th.walls.length, v = hash0(wx, wy, code) % (n + 3); return v >= n ? 0 : v;
  };
  function buildLight(world, things) {
    for (const k in G.TEX) if (G.TEX[k]) G.TEX[k].key = k;   // each room look knows its own name (for its mood)
    const Wd = world.w, Hd = world.h, LW = Wd * LS, LH = Hd * LS;
    const amb = new Float32Array(LW * LH), T = [new Float32Array(LW * LH), new Float32Array(LW * LH), new Float32Array(LW * LH)];
    const lights = [], lit = {};
    const add = (x, y, r, k) => { if (!r) return; lights.push({ x, y, r, s: k, g: lights.length % 3 }); lit[r] = 1; };
    // lights painted on walls
    const N4 = [[-1, 0, 1], [1, 0, 0], [0, -1, 3], [0, 1, 2]];          // neighbour dx, dy and the wall-face code the renderer uses
    for (let wy = 0; wy < Hd; wy++) for (let wx = 0; wx < Wd; wx++) {
      if (world.cells[wy * Wd + wx] !== 1) continue;
      for (const [dx, dy, code] of N4) {
        const nx = wx + dx, ny = wy + dy; if (nx < 0 || ny < 0 || nx >= Wd || ny >= Hd) continue;
        const ni = ny * Wd + nx, th = world.theme[ni]; if (world.cells[ni] !== 0 || !th || !th.variants) continue;
        const name = th.variants[G.wallVariant(world, wx, wy, code, th)];
        if (name && LIGHT_WORDS.test(name)) add(nx + 0.5 - dx * 0.42, ny + 0.5 - dy * 0.42, world.region[ni], /window/.test(name) ? 0.6 : 1);
      }
    }
    for (const p of (G.LAYOUT.wallPics || [])) if (p.light && world.fixedPic) add(p.from[0] + 0.5 + (p.x - p.from[0]) * 0.42, p.from[1] + 0.5 + (p.y - p.from[1]) * 0.42, world.region[p.from[1] * Wd + p.from[0]], p.light);
    for (const L of lights.splice(0)) if (!(world.theme[(L.y | 0) * Wd + (L.x | 0)] || {}).sky) lights.push(L);   // outside is lit by the sky already
    for (const t of things || []) if ((t.kind === 'prop' || t.kind === 'deco') && t.sprite && LIGHT_WORDS.test(t.sprite))
      add(t.x + 0.5 + (t.ox || 0), t.y + 0.5 + (t.oy || 0), world.region[t.y * Wd + t.x], 1.1);
    for (let i = 0; i < LW * LH; i++) {
      const cx = (i % LW) / LS | 0, cy = (i / LW / LS) | 0, ci = cy * Wd + cx, r = world.region[ci], th = world.theme[ci];
      const LL = G.LIGHT_LOOK, mood = th ? LL.mood[th.key] || 1 : 1;
      amb[i] = !r ? 0.8 : th && th.sky ? 1 : (lit[r] ? LL.ambient : LL.ambientDark) * mood * (G.isSpotless && G.isSpotless(r) ? LL.spotless : 1);   // a spotless room glows a little
    }
    for (const g of world.blocks || []) {                 // a soft shadow on the floor round furniture standing in the room
      if (g.edge) continue; const m = 0.24;
      for (let y = Math.max(0, ((g.by0 - m) * LS) | 0); y <= Math.min(LH - 1, ((g.by1 + m) * LS) | 0); y++)
        for (let x = Math.max(0, ((g.bx0 - m) * LS) | 0); x <= Math.min(LW - 1, ((g.bx1 + m) * LS) | 0); x++) {
          const px = (x + 0.5) / LS, py = (y + 0.5) / LS, dx = Math.max(g.bx0 - px, 0, px - g.bx1), dy = Math.max(g.by0 - py, 0, py - g.by1), d = Math.hypot(dx, dy);
          if (d > 0 && d < m) amb[y * LW + x] *= 0.62 + 0.38 * d / m;
        }
    }
    const R = G.LIGHT_LOOK.radius, PS = G.LIGHT_LOOK.pool;
    for (const L of lights) {
      const x0 = Math.max(0, ((L.x - R) * LS) | 0), x1 = Math.min(LW - 1, ((L.x + R) * LS) | 0);
      const y0 = Math.max(0, ((L.y - R) * LS) | 0), y1 = Math.min(LH - 1, ((L.y + R) * LS) | 0);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const ci = ((y / LS) | 0) * Wd + ((x / LS) | 0), r = world.region[ci];
        if (r !== L.r) continue;
        const d = Math.hypot((x + 0.5) / LS - L.x, (y + 0.5) / LS - L.y); if (d >= R) continue;
        const f = 1 - d / R; T[L.g][y * LW + x] += PS * L.s * f * f;
      }
    }
    // the mask of walls round each square, for the soft shadows along the floor next to walls (bits: 1 W, 2 E, 4 N, 8 S)
    const mask = new Uint8Array(Wd * Hd);
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const solid = (a, b) => a < 0 || b < 0 || a >= Wd || b >= Hd || world.cells[b * Wd + a] !== 0;
      mask[y * Wd + x] = (solid(x - 1, y) ? 1 : 0) | (solid(x + 1, y) ? 2 : 0) | (solid(x, y - 1) ? 4 : 0) | (solid(x, y + 1) ? 8 : 0);
    }
    return { world, LW, LH, amb, T, mask, n: lights.length };
  }
  const soft = (v) => (v > 1 ? Math.min(1.28, 1 + (v - 1) * 0.4) : v);   // lights stack up: the bright end is squeezed so pools don't burn out
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >> 13)) * 1274126177; return (h ^ (h >> 16)) >>> 0; }

  Renderer.prototype.render = function (cam, things) {
    const world = G.world, buf = this.buf, zb = this.zbuf;
    const dirX = Math.sin(cam.a), dirY = -Math.cos(cam.a);
    PLANE = 0.724 / G.VIEW_ZOOM; K = H * G.VIEW_ZOOM;
    const back = cam.back != null ? cam.back : G.VIEW_BACK;
    const posX = cam.x - dirX * back, posY = cam.y - dirY * back;      // the eye, behind the middle of the square
    const plX = Math.cos(cam.a) * PLANE, plY = Math.sin(cam.a) * PLANE;
    const horizon = (H / 2 + (cam.bob || 0) + (cam.look || 0)) | 0;   // look: + up, - down (stairs and trap doors)
    this.view = { posX, posY, dirX, dirY, plX, plY, horizon, K, W };   // where the eye was (cleaning.js: which floor square a tap is on)
    const flash = this.flash;
    const seen = G.state ? G.state.seen : null;
    let sky = G.SKY;
    if (!this.L || this.L.world !== world) this.L = buildLight(world, G.things);
    if (!world.beams && G.buildCeiling) G.buildCeiling(world);   // beams and ceiling marks (ceilings.js)
    // outside: the castle is several storeys tall (storeys()); the sky fills everything above the walls
    const camTh = world.theme[(posY | 0) * world.w + (posX | 0)], outdoor = !!(camTh && camTh.sky && G.LAYOUT.outside);
    if (outdoor && !world.wallH) buildHeights(world, G.LAYOUT.outside);
    const WH = outdoor ? world.wallH : null;
    /* the forest (forestView.js): its own backdrop instead of the stormy sky, and far things fade into coloured mist
       (theme.fog = 0xRRGGBB) instead of into the dark */
    if (camTh && camTh.skyTex) sky = camTh.skyTex;
    const FOG = camTh && camTh.fog != null ? camTh.fog : -1, fogBGR = FOG < 0 ? 0 : ((FOG & 255) << 16) | (FOG & 0xff00) | ((FOG >> 16) & 255);
    this.fogBGR = FOG < 0 ? -1 : fogBGR; this.fogCss = FOG < 0 ? null : '#' + ('00000' + FOG.toString(16)).slice(-6);
    const EDG = world.edge || null, ET = world.edgeTex, FACD = world.facade || null;   // forest: soft path edges, the hut's picture faces
    const CM = world.cmarks, VB = world.vBeam, HB = world.hBeam, CELLS = world.cells, BLK = world.blkAt;
    const Lm = this.L, LW = Lm.LW, LH = Lm.LH, AMB = Lm.amb, T0 = Lm.T[0], T1 = Lm.T[1], T2 = Lm.T[2], MASK = Lm.mask;
    const tt = performance.now() / 1000; this.now = tt * 1000;
    const fl = [0, 1, 2].map((k) => 1 + 0.2 * (Math.sin(tt * (5.1 + k * 1.7) + k * 2) * 0.6 + Math.sin(tt * (13.3 + k * 2.9) + k) * 0.4));
    this.boost *= 0.9; const F0 = fl[0] + this.boost, F1 = fl[1] + this.boost, F2 = fl[2] + this.boost;
    { const LL = G.LIGHT_LOOK; FADE = outdoor ? LL.outFade : LL.fade; LEAST = outdoor ? LL.outLeast : LL.least; }
    this.lightAtPoint = (x, y) => { const lx = (x * LS) | 0, ly = (y * LS) | 0; if (lx < 0 || ly < 0 || lx >= LW || ly >= LH) { this.la = 1; this.lp = 0; return 1; }
      const i = ly * LW + lx; this.la = AMB[i]; this.lp = T0[i] * F0 + T1[i] * F1 + T2[i] * F2; return soft(this.la + this.lp); };
    this.lit = (d) => Math.min(1.3, soft(lightAt(d) * this.la + this.lp * poolAt(d)));   // the last lightAtPoint, seen from d away

    /* --- floor & ceiling --- */
    const rdx0 = dirX - plX, rdy0 = dirY - plY, rdx1 = dirX + plX, rdy1 = dirY + plY;
    const skyOff = ((cam.a / (Math.PI * 2)) * sky.w * 2) | 0;
    for (let y = 0; y < H; y++) {
      const p = y > horizon ? y - horizon : horizon - y;
      const floor = y > horizon;
      if (p === 0) { const hc = FOG >= 0 ? (0xff000000 | fogBGR) >>> 0 : 0xff100c14; for (let x = 0; x < W; x++) buf[y * W + x] = hc; continue; }   // (in the mist the horizon is mist)
      const rowDist = (K * 0.5) / p;
      const sx = rowDist * (rdx1 - rdx0) / W, sy = rowDist * (rdy1 - rdy0) / W;
      let fx = posX + rowDist * rdx0, fy = posY + rowDist * rdy0;
      const dk = lightAt(rowDist), pf = poolAt(rowDist), ff = (floor ? 1 : 0.85) * 256;
      let li = (dk * ff) | 0;
      let row = y * W;
      const fogPx = FOG >= 0 && floor ? ((((1 - dk) * 250) | 0) << 24 | fogBGR) >>> 0 : 0, fogFar = (0xff000000 | fogBGR) >>> 0;
      for (let x = 0; x < W; x++, fx += sx, fy += sy) {
        const cx = fx | 0, cy = fy | 0;
        let col = FOG >= 0 && floor ? fogFar : 0xff0a080e;
        if (cx >= 0 && cy >= 0 && cx < world.w && cy < world.h || (outdoor && !floor)) {
          const th = world.theme[cy * world.w + cx] || (outdoor && !floor ? camTh : null);
          if (th) {
            if (!floor && (th.sky || outdoor)) {
              const syy = Math.min(sky.h - 1, (y * sky.h / (horizon > 1 ? horizon : 1)) | 0);
              const sxx = (((x * 1.2 + skyOff) | 0) % sky.w + sky.w) % sky.w;
              col = sky.data[syy * sky.w + sxx];
              if (flash > 0) col = shadePx(col, 256 + flash * 500);
            } else {
              let t, tx, ty, tw = TS;
              const ffx = fx - cx, ffy = fy - cy;
              if (!floor && th.cb) { const cb = th.cb, k = cb.n / cb.span; t = cb.px; tw = cb.n; tx = ((fx * k) | 0) % tw; ty = ((fy * k) | 0) % tw; }   // the room's ceiling picture (ceilings.js)
              else { t = floor ? (world.floorOv && world.floorOv[cy * world.w + cx]) || th.floor : th.ceil; tx = (ffx * TS) & TM; ty = (ffy * TS) & TM; }
              let lip = 0;
              if (floor && EDG) {                                  // path meets grass: a wobbly edge with a darker lip
                const ei = cy * world.w + cx, eg = EDG[ei];
                if (eg) {
                  let e = 1, u = 0;
                  if (eg & 1 && ffx < e) { e = ffx; u = fy + cx * 3.7; }
                  if (eg & 2 && 1 - ffx < e) { e = 1 - ffx; u = fy + (cx + 1) * 3.7; }
                  if (eg & 4 && ffy < e) { e = ffy; u = fx + cy * 5.3; }
                  if (eg & 8 && 1 - ffy < e) { e = 1 - ffy; u = fx + (cy + 1) * 5.3; }
                  if (e < 0.22) { const d = WOB[(u * 64) & 511], b = eg & 16 ? -d : d, g = e - b; if (g < 0) t = ET[ei]; if (g > -0.03 && g < 0.03) lip = 1; }
                }
              }
              if (t) {
                let c0 = t[ty * tw + tx];
                if (lip) c0 = ((((c0 >> 1) & 0x7f7f7f) + ((c0 >> 2) & 0x3f3f3f)) | 0xff000000) >>> 0;
                const cm = !floor && CM ? CM[cy * world.w + cx] : 0;
                if (cm) {                                              // a mark on the ceiling (cobweb, damp, crack...)
                  const M = G.CMARKS[(cm & 255) - 1], lx = (ffx * 128) | 0, ly = (ffy * 128) | 0, mx = (cm >> 8) & 255, my = (cm >> 16) & 255;
                  if (lx >= mx && ly >= my && lx < mx + M.w && ly < my + M.h) c0 = mix(c0, M.px[(ly - my) * M.w + lx - mx]);
                }
                // light at this spot, and a soft shadow close to the walls
                const li2 = ((fy * LS) | 0) * LW + ((fx * LS) | 0), torch = T0[li2] * F0 + T1[li2] * F1 + T2[li2] * F2;
                const m = MASK[cy * world.w + cx]; let e = 1;
                if (m) { if (m & 1 && ffx < e) e = ffx; if (m & 2 && 1 - ffx < e) e = 1 - ffx; if (m & 4 && ffy < e) e = ffy; if (m & 8 && 1 - ffy < e) e = 1 - ffy; }
                const ao = e < 0.26 ? 0.56 + 1.7 * e : 1;
                const lv = (ff * soft(dk * AMB[li2] + torch * pf) * ao) | 0;
                col = th.sky && flash > 0 ? shadePx(c0, li + flash * 300) : shadeWarm(c0, lv, (torch * 256) | 0);
                if (fogPx) col = (mix(col, fogPx) | 0xff000000) >>> 0;
              }
            }
          }
        }
        buf[row + x] = col;
      }
    }

    /* --- walls --- */
    for (let x = 0; x < W; x++) {
      const camX = 2 * x / W - 1;
      const rdx = dirX + plX * camX, rdy = dirY + plY * camX;
      let mx = posX | 0, my = posY | 0;
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
      let stepX, stepY, sdx, sdy;
      if (rdx < 0) { stepX = -1; sdx = (posX - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - posX) * ddx; }
      if (rdy < 0) { stepY = -1; sdy = (posY - my) * ddy; } else { stepY = 1; sdy = (my + 1 - posY) * ddy; }
      let side = 0, hit = 0, prevIdx = my * world.w + mx, guard = 0;
      let doorHit = null;
      let perp = 30, hitIdx = -1, hitPrev = prevIdx, hitSide = 0, nb = 0, nl = 0;
      const stamp = ++this.colSt, LG = this.lg;
      while (!hit && guard++ < 64) {
        prevIdx = my * world.w + mx;
        if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
        if (mx < 0 || my < 0 || mx >= world.w || my >= world.h) break;
        const idx = my * world.w + mx;
        const cell = world.cells[idx];
        if (FOG >= 0) {                                          // in the mist you only see (and map) what is close
          const far = side === 0 ? sdx - ddx : sdy - ddy;
          if (far > 13) break;
          if (seen && far < 5.5) seen[idx] = 1;
        } else if (seen) seen[idx] = 1;
        if (cell === 0 || cell === 3) {                          // 3: a tree square (forest): you cannot walk in, but you see through
          if (VB && CELLS[prevIdx] === 0 && nb < 24) {           // crossed the line between two open squares: a beam on it?
            const ei = side === 0 ? (stepX > 0 ? idx : prevIdx) : (stepY > 0 ? idx : prevIdx), b = side === 0 ? VB[ei] : HB[ei];
            if (b) { this.bcB[nb] = b; this.bcL[nb] = side === 0 ? ei % world.w : (ei / world.w) | 0; this.bcS[nb] = side; nb++; }
          }
          const BL = BLK && BLK[idx];
          if (BL) for (let q = 0; q < BL.length; q++) {          // furniture standing here (blocks.js): where the ray meets its box
            const g = BL[q]; if (g.st === stamp) continue; g.st = stamp;
            const ix = 1 / (rdx || 1e-9), iy = 1 / (rdy || 1e-9);
            let ax = (g.bx0 - posX) * ix, bx = (g.bx1 - posX) * ix; if (ax > bx) { const t = ax; ax = bx; bx = t; }
            let ay = (g.by0 - posY) * iy, by = (g.by1 - posY) * iy; if (ay > by) { const t = ay; ay = by; by = t; }
            const tn = ax > ay ? ax : ay, tf = bx < by ? bx : by;
            if (tf <= tn || tn < 0.05 || nl >= 12) continue;
            LG[nl] = g; this.lt[nl] = tn; this.lf[nl] = tf; this.ls[nl] = ax > ay ? 0 : 1; nl++;
          }
          continue;
        }
        if (cell === 2 && !(FACD && FACD[idx])) { // door (the hut's door is painted on its picture)
          const open = world.doorOpen[idx];
          if (open >= 1) continue;
          const pd = side === 0 ? sdx - ddx : sdy - ddy;
          if (open > 0) { if (!doorHit) doorHit = { pd, idx, prev: prevIdx, side, open, rdx, rdy }; continue; }
        }
        if (WH && WH[idx] < 1) {                                  // a low wall: you see over it (the castle behind is drawn first)
          if (hitIdx < 0) { hitIdx = idx; hitPrev = prevIdx; hitSide = side; perp = side === 0 ? sdx - ddx : sdy - ddy; }
          continue;
        }
        if (WH && hitIdx >= 0) { this.storeys(x, side === 0 ? sdx - ddx : sdy - ddy, idx, side, rdx, rdy, posX, posY, horizon, WH[idx], true, flash); break; }
        hit = 1; hitIdx = idx; hitPrev = prevIdx; hitSide = side;
        perp = side === 0 ? sdx - ddx : sdy - ddy;
      }
      if (perp < 0.05) perp = 0.05;
      zb[x] = perp;
      this.pk.name[x] = null; this.pk.perp[x] = perp; this.pk.idx[x] = hitIdx;
      if (hitIdx >= 0) {
        const h = WH ? WH[hitIdx] : 1;
        const isHut = FACD && FACD[hitIdx] && G.FOREST_TEX && G.FOREST_TEX.hut.front;
        if (isHut) this.column(x, perp, hitIdx, hitPrev, hitSide, rdx, rdy, posX, posY, horizon, 0, flash);   // plain logs under the picture: solid corners
        const fac = isHut && this.facade(x, perp, hitIdx, hitSide, rdx, rdy, posX, posY, horizon);
        let crumb = 0;                                          // ruins: the wall's top is broken off in whole rows of stone
        if (!fac && FOG >= 0 && h === 1) { const pt = world.theme[hitPrev];
          if (pt && pt.crumble) { const wx = hitSide === 0 ? posY + perp * rdy : posX + perp * rdx, line = hitSide === 0 ? hitIdx % world.w : (hitIdx / world.w) | 0;
            const q = Math.floor(wx * 6) / 6, v = Math.sin(q * 1.7 + line * 2.1) + 0.6 * Math.sin(q * 4.3 + line) + 0.35 * Math.sin(q * 9.1 + hitSide);   // long slopes with small steps
            crumb = Math.max(0, Math.min(3, Math.round(v * 1.25) + (CRUMB[hash(Math.floor(wx * 6), line * 2 + hitSide, 91) & 15] > 1 ? 1 : 0))) / 6; } }
        if (!fac) {
        this.cut = h < 1 ? 1 - h : crumb;                     // a low wall: only its lower part
        this.column(x, perp, hitIdx, hitPrev, hitSide, rdx, rdy, posX, posY, horizon, 0, flash);
        this.cut = 0;
        if (h > 1) this.storeys(x, perp, hitIdx, hitSide, rdx, rdy, posX, posY, horizon, h, false, flash);   // the floors above
        }
        if (FOG >= 0 && !fac) {                                          // far cliffs and ruin walls fade into the mist too
          const k = 1 - lightAt(perp);
          if (k > 0.03) { const fp = (((k * 250) | 0) << 24 | fogBGR) >>> 0, lh = K / perp, t0 = Math.max(0, (horizon - lh / 2 + crumb * lh) | 0), t1 = Math.min(H, (horizon + lh / 2) | 0);
            for (let y = t0; y < t1; y++) buf[y * W + x] = (mix(buf[y * W + x], fp) | 0xff000000) >>> 0; }
        }
      }
      if (world.hut && FACD) { this.roof(x, rdx, rdy, posX, posY, horizon, perp); this.roofBits(x, rdx, rdy, posX, posY, horizon, perp, FACD[hitIdx]); }
      this.lowN[x] = 0;
      const dpd = doorHit ? doorHit.pd : 0;
      if (nl) this.blocks(x, nl, perp, dpd, true, rdx, rdy, posX, posY, horizon);       // furniture behind an opening door
      if (doorHit) { this.column(x, doorHit.pd < 0.05 ? 0.05 : doorHit.pd, doorHit.idx, doorHit.prev, doorHit.side, doorHit.rdx, doorHit.rdy, posX, posY, horizon, doorHit.open, flash); zb[x] = Math.min(zb[x], perp); }
      if (nl && doorHit) this.blocks(x, nl, perp, dpd, false, rdx, rdy, posX, posY, horizon);
      this.beamColumn(x, nb, posX, posY, rdx, rdy, horizon, zb[x]);
    }
    this.ctx.putImageData(this.img, 0, 0);

    /* --- billboards --- */
    this.tags = [];
    const all = world.treeAt && G.nearTrees ? things.concat(G.nearTrees(world, posX, posY)) : things;   // the forest's trees stand in their own list (forestView.js)
    if (all && all.length) this.sprites(all, posX, posY, dirX, dirY, plX, plY, horizon);
    if (G.showNameTags) G.showNameTags(G.combat && G.combat.active ? [] : this.tags);
  };

  /* how a door opens, for a pixel at (u, v) inside its opening (0..1) when it is `o` open (0..1):
     returns where to read the door picture (DU, DV) and how lit that bit is (DS), or false where you see through */
  let DU = 0, DV = 0, DS = 1;
  const DOOR_MODES = {
    swing2(u, v, o) { const c = Math.cos(o * 1.35), hw = 0.5 * c; DV = v; DS = 0.55 + 0.45 * c;          // double doors swing away from the middle
      if (u < hw) { DU = u / hw * 0.5; return true; } if (u > 1 - hw) { DU = 0.5 + (u - (1 - hw)) / hw * 0.5; return true; } return false; },
    swing1(u, v, o) { const c = Math.cos(o * 1.35); DV = v; DS = 0.55 + 0.45 * c; if (u < c) { DU = u / c; return true; } return false; },   // hinge on the left
    rise(u, v, o) { DU = u; DV = v + o; DS = 1; return DV < 1; },                                         // portcullis: up into the arch
    slide(u, v, o) { DU = u - o; DV = v; DS = 1 - 0.3 * o; return DU >= 0; },                             // bookcase: sideways into the wall
    split(u, v, o) { DV = v; DS = 1; if (u < 0.5) { DU = u + 0.5 * o; return DU < 0.5; } DU = u - 0.5 * o; return DU >= 0.5; },   // glass doors slide apart
    curtain(u, v, o) { const hw = 0.5 * (1 - 0.8 * o); DV = v; DS = 1 - 0.15 * o;                        // curtains gather to the sides
      const w = Math.sin(v * 9 + o * 6) * 0.03 * o; u += w;
      if (u < hw) { DU = u / hw * 0.5; return DU >= 0; } if (u > 1 - hw) { DU = 0.5 + (u - (1 - hw)) / hw * 0.5; return DU < 1; } return false; },
    roll(u, v, o) { const off = o * 1.05, a = -off * 2, cu = u - 0.5 - off, cv = v - 0.5, ca = Math.cos(a), sa = Math.sin(a);   // stone wheel rolls aside
      DU = ca * cu - sa * cv + 0.5; DV = sa * cu + ca * cv + 0.5; DS = 1; return DU >= 0 && DU < 1 && DV >= 0 && DV < 1; },
  };
  const WOB = new Float32Array(512); for (let i = 0; i < 512; i++) { const a = i / 512 * Math.PI * 2; WOB[i] = 0.085 * Math.sin(a * 3) + 0.05 * Math.sin(a * 11 + 1) + 0.03 * Math.sin(a * 23 + 2); }
  const CRUMB = [0, 0, 0, 1, 1, 0, 2, 1, 0, 0, 1, 2, 0, 1, 3, 0];     // rows of stone missing from a ruin wall's top
  /* one column of the Honey Hut: a whole picture (front with the door, or a side) laid across the three squares of that
     face, as tall as the picture makes it, so the roof stands above the wall. Clear parts of the picture show the sky. */
  Renderer.prototype.facade = function (x, perp, idx, side, rdx, rdy, posX, posY, horizon) {
    const world = G.world, hu = world.hut, P = G.FOREST_TEX && G.FOREST_TEX.hut; if (!hu || !P || !P.front || !P.side) return false;
    const cx = idx % world.w, cy = (idx / world.w) | 0; let s, pic = P.side, n = hu.ny;
    if (side === 1) { const f = posX + perp * rdx - cx; n = hu.nx; if (rdy < 0) { s = (cx - hu.x0 + f) / n; pic = P.front; } else s = (hu.x1 - cx + 1 - f) / n; }
    else { const f = posY + perp * rdy - cy; s = rdx > 0 ? (cy - hu.y0 + f) / n : (hu.y1 - cy + 1 - f) / n; }
    const hgt = hu.nx / P.front.aspect, lh = K / perp, bottom = horizon + lh / 2, top = bottom - hgt * lh;
    const px = Math.min(pic.w - 1, Math.max(0, (s * pic.w) | 0));
    this.lightAtPoint(posX + rdx * (perp - 0.06), posY + rdy * (perp - 0.06));
    const lii = (Math.min(1.1, this.lit(perp) * (side ? 0.86 : 1)) * 256) | 0;
    const k = 1 - lightAt(perp), fp = this.fogBGR >= 0 && k > 0.03 ? ((((k * 250) | 0) << 24) | this.fogBGR) >>> 0 : 0;
    const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H, bottom | 0), buf = this.buf, d = pic.data, step = pic.h / (hgt * lh);
    for (let y = y0; y < y1; y++) {
      const c = d[(((y - top) * step) | 0) * pic.w + px]; if ((c >>> 24) < 128) continue;
      let o = shadePx(c, lii); if (fp) o = (mix(o, fp) | 0xff000000) >>> 0;
      buf[y * W + x] = o;
    }
    return true;
  };
  /* the Honey Hut's roof, built in the round so it joins at the corners from every side: a ridge running back from
     the front door, two shingled slopes that overhang the walls, and a log gable above the front and the back.
     One screen column: walk along the ray across the roof, nearest first; each step fills what is still empty. */
  const RMASK = new Uint8Array(1024), ROOF_RISE = 0.9, ROOF_OUT = 0.16, ROOF_FRONT = 0.05;   // how far the roof overhangs the side walls / the front and back
  Renderer.prototype.roof = function (x, rdx, rdy, posX, posY, horizon, wallD) {
    const world = G.world, hu = world.hut, P = G.FOREST_TEX && G.FOREST_TEX.hut; if (!P || !P.front || !P.side || !P.roof) return;
    const X0 = hu.x0, X1 = hu.x1 + 1, Y0 = hu.y0, Y1 = hu.y1 + 1, o = ROOF_OUT, ix = 1 / (rdx || 1e-9), iy = 1 / (rdy || 1e-9);
    let ax = (X0 - o - posX) * ix, bx = (X1 + o - posX) * ix; if (ax > bx) { const t = ax; ax = bx; bx = t; }
    let ay = (Y0 - ROOF_FRONT - posY) * iy, by = (Y1 + ROOF_FRONT - posY) * iy; if (ay > by) { const t = ay; ay = by; by = t; }
    let tn = ax > ay ? ax : ay; const tf = bx < by ? bx : by;
    if (tn < 0.08) tn = 0.08; if (tf <= tn || tn > wallD + 0.02) return;
    const cx = (X0 + X1) / 2, half = (X1 - X0) / 2, wallH = hu.nx / P.front.aspect, buf = this.buf, sh = P.roof, logs = G.FOREST_TEX.walls.hut;
    const n = Math.max(10, Math.min(70, ((tf - tn) * 22) | 0)), dt = (tf - tn) / n;
    RMASK.fill(0, 0, H); let was = false, lim = H;
    this.lightAtPoint(posX + rdx * tn, posY + rdy * tn);
    for (let s = 0; s <= n; s++) {
      const t = tn + dt * s + 0.001, px = posX + rdx * t, py = posY + rdy * t, off = Math.abs(px - cx);
      const hTop = wallH + (1 - off / half) * ROOF_RISE, inside = px >= X0 && px <= X1 && py >= Y0 && py <= Y1;
      const gable = inside && !was && (py - Y0 < 0.12 || Y1 - py < 0.12); was = inside;
      const hLow = inside ? wallH - 0.02 : hTop - 0.09;
      const lh = K / t, bottom = horizon + lh / 2, yT = bottom - hTop * lh, yL = bottom - hLow * lh;
      const y0 = yT < 0 ? 0 : Math.ceil(yT); let y1 = yL > H ? H : yL | 0;
      if (y1 > lim) y1 = lim; if (inside && lim === H) lim = y1;      // behind the wall you came in through, nothing shows below its top
      if (y1 <= y0) continue;
      const li = Math.min(1.1, this.lit(t)) * (px < cx ? 1 : 0.84), k = 1 - lightAt(t), fp = this.fogBGR >= 0 && k > 0.03 ? ((((k * 250) | 0) << 24) | this.fogBGR) >>> 0 : 0;
      const u = ((py - Y0 + 1) * TS * 0.9) & TM, v = (off / (half + o) * TS * 1.6) & TM, gu = ((px - X0) * TS) & TM;
      for (let y = y0; y < y1; y++) {
        if (RMASK[y]) continue; RMASK[y] = 1;
        const hp = (bottom - y) / lh; let c, l = li;
        if (gable) { c = logs[(((1 - (hp - Math.floor(hp))) * TS) & TM) * TS + gu]; if (hTop - hp < 0.07) { c = sh[v * TS + u]; l *= 0.7; } }   // logs, with the roof's edge along the top
        else { c = sh[v * TS + u]; l *= !inside && hTop - hp > 0.035 ? 0.5 : 0.82; }                                  // shingles; under the eaves it is dark
        let q = shadePx(c, (l * 256) | 0); if (fp) q = (mix(q, fp) | 0xff000000) >>> 0;
        buf[y * W + x] = q;
      }
    }
  };
  /* the stone chimney on the hut's roof and the beehive under its eave: two small pictures that always face you.
     The chimney stands on the right-hand slope; from the other side of the ridge only what rises above the ridge shows. */
  Renderer.prototype.roofBits = function (x, rdx, rdy, posX, posY, horizon, wallD, onHut) {
    const hu = G.world.hut, P = G.FOREST_TEX && G.FOREST_TEX.hut; if (!P || !P.front || !P.chimney || !P.hive) return;
    const X0 = hu.x0, X1 = hu.x1 + 1, Y0 = hu.y0, Y1 = hu.y1 + 1, cx = (X0 + X1) / 2, half = (X1 - X0) / 2, wallH = hu.nx / P.front.aspect, buf = this.buf;
    const V = this.view, inv = 1 / (V.plX * V.dirY - V.dirX * V.plY);
    for (let b = 0; b < 2; b++) {
      const pic = b ? P.hive : P.chimney, wx = b ? X0 - 0.07 : cx + half * 0.55, wy = b ? Y1 + 0.02 : Y1 - 0.75;
      const hh = b ? 0.32 : 0.95, ww = hh * pic.aspect, z0 = b ? wallH - 0.06 - hh : wallH + 0.45 * ROOF_RISE - 0.1;
      const dx = wx - posX, dy = wy - posY, d = inv * (-V.plY * dx + V.plX * dy); if (d < 0.2) continue;
      if (!onHut && wallD < d - 0.3) continue;                 // something nearer than the hut is in the way
      if (b && onHut && wallD < d - 0.25) continue;            // the hive hangs in front of the wall: from behind, the hut hides it
      const sx = W / 2 * (1 + inv * (V.dirY * dx - V.dirX * dy) / d);
      const lh = K / d, wpx = ww * lh, u = (x - sx) / wpx + 0.5; if (u < 0 || u >= 1) continue;
      const bottom = horizon + lh / 2; let yB = bottom - z0 * lh; const yT = bottom - (z0 + hh) * lh;
      if (!b && (posX - cx) * (wx - cx) < 0) {                 // seen across the ridge
        const dr = Math.abs(cx - posX), dc = Math.abs(wx - posX), hid = 0.5 + (wallH + ROOF_RISE - 0.5) * dc / dr; yB = Math.min(yB, bottom - hid * lh); }
      if (!b && (posY > Y1 || posY < Y0) && rdy) {             // seen over a gable: where this column's ray crosses the gable, only what rises above its edge shows
        const g = posY > Y1 ? Y1 : Y0, gx = posX + (g - posY) / rdy * rdx, off = Math.abs(gx - cx);
        if (off < half) { const hid = 0.5 + (wallH + (1 - off / half) * ROOF_RISE - 0.5) * Math.abs(wy - posY) / Math.abs(g - posY); yB = Math.min(yB, bottom - hid * lh); } }
      const y0 = Math.max(0, Math.ceil(yT)), y1 = Math.min(H, yB | 0); if (y1 <= y0) continue;
      const li = (Math.min(1.1, Math.max(0.7, this.lit(d))) * 256) | 0, k = 1 - lightAt(d), fp = this.fogBGR >= 0 && k > 0.03 ? ((((k * 250) | 0) << 24) | this.fogBGR) >>> 0 : 0;
      const px = (u * pic.w) | 0, dat = pic.data, step = pic.h / (hh * lh);
      for (let y = y0; y < y1; y++) { const c = dat[(((y - yT) * step) | 0) * pic.w + px]; if ((c >>> 24) < 128) continue;
        let q = shadePx(c, li); if (fp) q = (mix(q, fp) | 0xff000000) >>> 0; buf[y * W + x] = q; }
    }
  };
  Renderer.prototype.doorColumn = function (x, perp, idx, prevIdx, side, rdx, rdy, posX, posY, horizon, open, D) {
    const world = G.world, buf = this.buf, th = world.theme[prevIdx] || G.TEX.hall, base = th.walls[0], mode = DOOR_MODES[D.mode];
    const LK = th.look && th.look.strip ? th.look : null;     // the wall round the frame carries on the room's long wall strip
    let wallX = side === 0 ? posY + perp * rdy : posX + perp * rdx;
    wallX -= Math.floor(wallX);
    let tx = (wallX * TS) | 0;
    if (side === 0 && rdx > 0) tx = TS - 1 - tx;
    if (side === 1 && rdy < 0) tx = TS - 1 - tx;
    const L = this.lightAtPoint(posX + rdx * (perp - 0.06), posY + rdy * (perp - 0.06));
    const lh = K / perp, top = horizon - lh / 2, li = this.lit(perp) * (side ? 0.8 : 1);
    const lii = (li * 256) | 0, warm = (Math.max(0, L - 0.8) * 300) | 0;
    const y0 = Math.max(0, top | 0), y1 = Math.min(H, (top + lh) | 0), vScale = TS / lh;
    const [h0, hv0, h1, hv1] = D.hole, inU = tx >= h0 && tx < h1, fr = D.frame;
    const u = (tx - h0) / (h1 - h0);
    const sx = LK ? md(along(idx, side, side * 2 + (side ? (rdy > 0 ? 1 : 0) : (rdx > 0 ? 1 : 0)), tx, world.w), LK.sw) : 0;
    for (let y = y0; y < y1; y++) {
      const ty = ((y - top) * vScale) & TM;
      let col, sh = 1;
      const fp = fr ? fr[ty * TS + tx] : 0;
      if (fp >>> 24 > 127) col = fp;                                    // the frame
      else if (inU && ty >= hv0 && ty < hv1) {                          // the opening: the door, or (open) what is behind it
        const ok = mode(u, (ty - hv0) / (hv1 - hv0), open);
        const dp = ok ? D.leaf[((DV * TS) | 0) * TS + ((DU * TS) | 0)] : 0;
        if (ok && dp >>> 24 > 127) { col = dp; sh = DS; }
        else if (open > 0) continue; else col = 0xff140c18;             // see through / a dark gap round a closed door
      } else col = LK ? LK.strip[ty * LK.sw + sx] : base[ty * TS + tx];   // the room's wall round the frame
      buf[y * W + x] = shadeWarm(col, (lii * AOY[ty] * sh) | 0, warm);
    }
  };

  Renderer.prototype.column = function (x, perp, idx, prevIdx, side, rdx, rdy, posX, posY, horizon, open, flash) {
    const world = G.world, buf = this.buf;
    if (world.cells[idx] === 2 && G.DOOR_STYLES) { const D = G.DOOR_STYLES[world.doorStyle[idx]]; if (D) return this.doorColumn(x, perp, idx, prevIdx, side, rdx, rdy, posX, posY, horizon, open, D); }
    let tex;
    const cell = world.cells[idx];
    if (cell === 2) tex = G.DOOR_TEX[world.doorType[idx]];
    else {
      const th = world.theme[prevIdx] || G.TEX.hall;
      const walls = th.walls;
      const face = side * 2 + (side ? (rdy > 0 ? 1 : 0) : (rdx > 0 ? 1 : 0)), hv = hash(idx % world.w, (idx / world.w) | 0, face);
      let vi = hv % (walls.length + 3); if (vi >= walls.length || (world.secret && world.secret[idx])) vi = 0;
      tex = walls[vi];
      var key = idx * 4 + face;
      if (th.wallFrames && th.wallFrames[vi]) { var fr = G.decoFrame(key, th.animMode[vi], this.now); tex = th.wallFrames[vi][fr]; }   // a moving painting or clock (wallAnim.js)
      var look = world.spiral ? null : th.look, lookTh = th, lookVi = vi, lookFace = face;    // natural walls (wallLook.js)
      const Wm = world.w, nearDoor = world.cells[idx - 1] === 2 || world.cells[idx + 1] === 2 || world.cells[idx - Wm] === 2 || world.cells[idx + Wm] === 2;
      var pickName = th.variants && !(th.lightKind && th.lightKind[vi]) ? th.variants[vi] || null : null;   // a light stands out from the wall: tap the light itself
      var plain = th.variants && !th.variants[vi], mirror = !look && plain && !nearDoor && (hv >> 7) & 1;   // plain walls are mirrored now and then: less repeating
    }
    let wallX = side === 0 ? posY + perp * rdy : posX + perp * rdx;
    wallX -= Math.floor(wallX);
    let tx = (wallX * TS) | 0;
    if (side === 0 && rdx > 0) tx = TS - 1 - tx;
    if (side === 1 && rdy < 0) tx = TS - 1 - tx;
    if (mirror) tx = TS - 1 - tx;
    if (!open) { const P = this.pk; P.name[x] = pickName || null; P.tx[x] = tx; P.top[x] = horizon - K / perp / 2; P.lh[x] = K / perp; P.key[x] = key || 0; }
    // light at the wall (just in front of it), and a soft shadow in inside corners
    const L = this.lightAtPoint(posX + rdx * (perp - 0.06), posY + rdy * (perp - 0.06));
    let corner = 1;
    if (cell !== 2) {
      const W2 = world.w, ppx = prevIdx % W2, ppy = (prevIdx / W2) | 0, solid = (a, b) => world.cells[b * W2 + a] !== 0;
      const c0 = side === 0 ? solid(ppx, ppy - 1) : solid(ppx - 1, ppy), c1 = side === 0 ? solid(ppx, ppy + 1) : solid(ppx + 1, ppy);
      if (c0 && wallX < 0.2) corner = 0.6 + 2 * wallX; else if (c1 && wallX > 0.8) corner = 0.6 + 2 * (1 - wallX);
    }
    const lh = K / perp;
    const top = horizon - lh / 2;
    let li = this.lit(perp) * (side ? 0.8 : 1) * corner;
    if (flash > 0 && world.theme[prevIdx] && world.theme[prevIdx].sky) li += flash * 1.2;
    const lii = (li * 256) | 0, warm = (Math.max(0, L - 0.8) * 300) | 0;
    // a door that is opening slides upward: only its top part (texture rows open..1) is drawn
    const visH = lh * (1 - open);
    const y0 = Math.max(0, (top + (this.cut || 0) * lh) | 0), y1 = Math.min(H, (top + visH) | 0);
    let vStart = open * TS; const vScale = TS / lh; var stepEdge = false;
    if (world.spiral && cell !== 2) {                // the stairwell: each quarter-wall is one step higher than the last, round and round
      const hx = posX + perp * rdx - 1, hy = posY + perp * rdy - 1;   // where on the 1x1 well the ray hits (0..1)
      const tq = hy <= 0.001 ? hx : hx >= 0.999 ? 1 + hy : hy >= 0.999 ? 3 - hx : 4 - hy;   // round the well: north, east, south, west
      vStart += ((tq * 4) | 0) * (TS / 32) - (G.cam.rise || 0) * TS / 2;   // two ledges a storey: a step is 1/32 of a picture
      var stepEdge = (tq * 4) % 1 < 0.06;                                      // the side of each step: a dark line
    }
    let sinkOff = 0;
    if (world.sink && world.sink.idx === idx && cell !== 2) {   // a secret wall opening (secrets.js): crumbles down, slides aside or parts
      const SK = world.sink, k = SK.k, dark = shadeWarm(0xff120a16, lii, 0);
      let gone = false;
      if (SK.mode === 'down') sinkOff = k * TS;
      else if (SK.mode === 'side') { tx = (tx - k * TS) | 0; gone = tx < 0; }
      else { const hw = (k * TS / 2) | 0, h2 = TS >> 1; if (tx >= h2 - hw && tx < h2 + hw) gone = true; else tx = tx < h2 ? tx + hw : tx - hw; }
      if (gone) { for (let y = y0; y < y1; y++) buf[y * W + x] = dark; return; }
    }
    if (look) return this.lookColumn(x, y0, y1, top, vScale, lii, warm, idx, prevIdx, side, lookFace, tx, wallX, tex, lookTh, lookVi, fr || 0, key, sinkOff);
    for (let y = y0; y < y1; y++) {
      const ty = (vStart + (y - top) * vScale) | 0;
      const t2 = ty & TM, ledge = stepEdge && ((t2 & 63) >= 32 && (t2 & 63) < 54);
      buf[y * W + x] = shadeWarm(tex[t2 * TS + tx], world.spiral ? (ledge ? lii >> 1 : lii) : (lii * AOY[t2]) | 0, warm);
    }
  };

  /* one column of a natural wall: strip (or the old picture), trims, a mark, the decoration, a pillar (wallLook.js) */
  Renderer.prototype.lookColumn = function (x, y0, y1, top, vScale, lii, warm, idx, prevIdx, side, face, tx, wallX, tex, th, vi, fr, key, sinkOff) {
    const world = G.world, buf = this.buf, L = th.look, Wm = world.w, cells = world.cells;
    const al = along(idx, side, face, tx, Wm);
    const strip = L.strip, sw = L.sw, sx = strip ? md(al, sw) : 0;
    const ovF = th.overFrames && th.overFrames[vi];
    const ov = ovF ? ovF[fr] : strip ? th.over && th.over[vi] : null;
    if (ovF && !strip) tex = th.animPlain;                   // a moving picture on a plain wall: the wall without it, the picture on top
    // pulling its funny face, a picture hops and wiggles on the wall so you can see it from across the room
    const hop = ovF && fr === 2 ? -((Math.abs(Math.sin(this.now / 85)) * TS * 0.035) | 0) : 0, wig = ovF && fr === 2 ? (Math.sin(this.now / 47) * TS * 0.02) | 0 : 0;
    let tov = world.tellOv && world.tellOv[key];        // the odd bit on a hidden secret wall (secrets.js), or a wall's own picture (blocks.js)
    if (tov && tov.length < 9) tov = tov[((this.now / 130) | 0) % tov.length];   // frames: the fireplace's flames
    const dark = sinkOff ? shadeWarm(0xff120a16, lii, 0) : 0;
    const sk = L.skirt, tp = L.top, skx = sk ? md(al, sk.w) : 0, tpx = tp ? md(al, tp.w) : 0, sk0 = sk ? TS - sk.h : TS, tp1 = tp ? tp.h : 0;
    // a mark on this wall?
    const MK = world.marks || (G.buildWallMarks ? G.buildWallMarks(world) : null), mk = MK ? MK[key] : 0;
    let M = null, mcol = -1, my = 0;
    if (mk) {
      M = G.MARKS[(mk & 255) - 1]; const mx = (mk >> 8) & 255; my = (mk >> 16) & 255;
      mcol = mk >>> 24 ? M.w - 1 - (tx - mx) : tx - mx; if (mcol < 0 || mcol >= M.w || tx < mx || tx >= mx + M.w) M = null;
    }
    // a pillar at this end of the wall?
    let P = L.pillar, pcol = -1;
    if (P) {
      const half = P.w >> 1, u = wallX * TS, step = side === 0 ? Wm : 1;
      const a = side === 0 ? (idx / Wm) | 0 : idx % Wm, line = side === 0 ? idx % Wm : (idx / Wm) | 0;
      const edge = (d) => {
        const cw = cells[idx + d * step], cf = cells[prevIdx + d * step];
        if (cw === 2 || cf === 2) return false;               // a door has its own frame
        if (cf !== 0 || cw === 0) return true;                // an inside corner, or the end of the wall
        if (!L.every) return false;
        return (((d < 0 ? a : a + 1) + (hash(line, face, 9) % L.every)) % L.every) === 0;   // every few squares along the wall
      };
      if (u < half) { if (edge(-1)) pcol = (half + u) | 0; } else if (u >= TS - half && edge(1)) pcol = (u - (TS - half)) | 0;
      if (pcol >= P.w) pcol = P.w - 1;
    }
    // a corner brace where a ceiling beam meets this wall (ceilings.js), at either end of the wall square
    let BR = null, bcol = 0;
    if (world.hBeam) {
      const u = wallX * TS, lo = side === 0 ? world.hBeam[prevIdx] : world.vBeam[prevIdx], hi = side === 0 ? world.hBeam[prevIdx + Wm] : world.vBeam[prevIdx + 1];
      const bl = lo && G.BEAMS[lo - 1].brace, bh = hi && G.BEAMS[hi - 1].brace;
      if (bl && u < bl.w) { BR = bl; bcol = u | 0; } else if (bh && u >= TS - bh.w) { BR = bh; bcol = (TS - 1 - u) | 0; }
    }
    for (let y = y0; y < y1; y++) {
      const tf = (y - top) * vScale - (sinkOff || 0);
      if (tf < 0) { buf[y * W + x] = dark; continue; }      // above a sinking secret wall: the dark room behind
      const t2 = tf & TM;
      let c, p;
      if (pcol >= 0 && (p = P.px[t2 * P.w + pcol]) >>> 24 > 127) c = p;
      else {
        c = strip ? strip[t2 * sw + sx] : tex[t2 * TS + tx];
        if (t2 >= sk0) c = mix(c, sk.px[(t2 - sk0) * sk.w + skx]);
        else if (t2 < tp1) c = mix(c, tp.px[t2 * tp.w + tpx]);
        if (M && t2 >= my && t2 < my + M.h) c = mix(c, M.px[(t2 - my) * M.w + mcol]);
        if (ov) c = mix(c, ov[((t2 - hop) & TM) * TS + ((tx - wig) & TM)]);
        if (tov) c = mix(c, tov[t2 * TS + tx]);
        if (BR && t2 < BR.h) { const q = BR.px[t2 * BR.w + bcol]; if (q >>> 24 > 127) c = q; }   // a brace under a ceiling beam
      }
      buf[y * W + x] = shadeWarm(c, (lii * AOY[t2]) | 0, warm);
    }
  };

  /* ---------- furniture (blocks.js): the blocks this column's ray passed over, far to near, over the wall behind ---------- */
  Renderer.prototype.blocks = function (x, nl, wallD, doorD, far, rdx, rdy, posX, posY, horizon) {
    const O = this.lo || (this.lo = new Int8Array(12)), lt = this.lt; let n = 0;
    for (let k = 0; k < nl; k++) {                         // far to near (a few at most: insertion sort)
      const t = lt[k]; if (!(t < wallD && (far ? t >= doorD : t < doorD))) continue;
      let j = n++; while (j > 0 && lt[O[j - 1]] < t) { O[j] = O[j - 1]; j--; } O[j] = k;
    }
    for (let i = 0; i < n; i++) { const k = O[i]; this.blockFace(x, this.lg[k], lt[k], this.lf[k], this.ls[k], rdx, rdy, posX, posY, horizon); }
  };
  Renderer.prototype.blockFace = function (x, g, tn, tf, side, rdx, rdy, posX, posY, horizon) {
    const buf = this.buf, lh = K / tn, yBot = horizon + 0.5 * lh, yTop = horizon + (0.5 - g.h) * lh;
    const hx = posX + rdx * tn, hy = posY + rdy * tn;
    const len = side === 0 ? g.by1 - g.by0 : g.bx1 - g.bx0;
    let u = side === 0 ? hy - g.by0 : hx - g.bx0;
    if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) u = len - u;
    const T = side === 0 ? g.tex0 : g.tex1; if (!T) return;
    let tu = ((u * (side === 0 ? g.k0 : g.k1)) | 0) % T.w; if (tu < 0) tu += T.w;     // k: the picture's pixels per square along this face
    const L = this.lightAtPoint(hx - rdx * 0.05, hy - rdy * 0.05);
    let li = this.lit(tn) * (side ? 0.8 : 1);
    if (g.see) li *= 0.7 + 0.32 * Math.sin(Math.PI * Math.min(1, Math.max(0, u / len)));   // a pillar is round: darker at its edges
    const lii = (li * 256) | 0, warm = (Math.max(0, L - 0.8) * 300) | 0;
    const y0 = Math.max(0, Math.ceil(yTop)), y1 = Math.min(H, Math.ceil(yBot)), fh = yBot - yTop;
    const vs = T.h / fh, TP = T.px, Tw = T.w, Th = T.h, see = g.see, lo = (lii * 0.66) | 0;
    for (let y = y0; y < y1; y++) {
      let v = ((y - yTop) * vs) | 0; if (v >= Th) v = Th - 1;
      const c = TP[v * Tw + tu]; if (c >>> 24 < 128) continue;
      buf[y * W + x] = shadeWarm(c, see ? (lii * AOY[((v * TS) / Th) | 0]) | 0 : v >= Th - 2 ? lo : lii, warm);
    }
    if (g.top) {                                            // its top, seen from above: from the far edge to the near one
      const a = (0.5 - g.h) * K, T2 = g.top, lw = g.bx1 - g.bx0, lz = g.by1 - g.by0;
      const t0 = Math.max(0, Math.ceil(horizon + a / tf)), t1 = Math.min(H, Math.ceil(yTop));
      const Lt = this.lightAtPoint(hx + rdx * (tf - tn) * 0.5, hy + rdy * (tf - tn) * 0.5), lt = (this.lit(tn) * 1.04 * 256) | 0, wt = (Math.max(0, Lt - 0.8) * 300) | 0;
      const P2 = T2.px, w2 = T2.w, h2 = T2.h, ox = posX - g.bx0, oy = posY - g.by0;
      const ku = g.topSpan ? w2 / lw : g.kt, kv = g.topSpan ? h2 / lz : g.kt, mu = w2 - 1, mv = h2 - 1, span = g.topSpan;
      for (let y = t0; y < t1; y++) {
        const d = a / (y - horizon);
        let tu2 = ((ox + rdx * d) * ku) | 0, tv2 = ((oy + rdy * d) * kv) | 0;
        if (span) { if (tu2 < 0) tu2 = 0; else if (tu2 > mu) tu2 = mu; if (tv2 < 0) tv2 = 0; else if (tv2 > mv) tv2 = mv; }
        else { tu2 &= mu; tv2 &= mv; }                       // repeating tops are square, 64 or 128 wide: wrap with a mask
        buf[y * W + x] = shadeWarm(P2[tv2 * w2 + tu2], lt, wt);
      }
    }
    if (g.see) { if (T.px[((T.h * 0.55) | 0) * T.w + tu] >>> 24 > 127 && tn < this.zbuf[x]) this.zbuf[x] = tn; }   // a pillar hides what is behind it
    else if (this.lowN[x] < 8) { const k = x * 8 + this.lowN[x]++; this.lowD[k] = tn; this.lowE[k] = tf; this.lowH[k] = g.h; }
  };
  /* where furniture in front starts hiding a thing tY away, in column x (screen y; big = nothing hidden) */
  Renderer.prototype.clipBelow = function (x, tY, horizon) {
    let cb = 1e9; const n = this.lowN[x];
    for (let k = x * 8, e = k + n; k < e; k++) {
      const D = this.lowD[k]; if (tY <= D + 0.02) continue;
      const h = this.lowH[k], y = h < 0.5 ? horizon + (0.5 - h) * K / Math.min(tY, this.lowE[k]) : horizon - (h - 0.5) * K / D;
      if (y < cb) cb = y;
    }
    return cb;
  };

  /* the ceiling beams one column's ray passed under (far to near): the beam's front face and its underside (ceilings.js) */
  Renderer.prototype.beamColumn = function (x, n, posX, posY, rdx, rdy, horizon, wallD) {
    const buf = this.buf; let nearD = 1e9, nearY = -1;
    for (let k = n - 1; k >= 0; k--) {
      const B = G.BEAMS[this.bcB[k] - 1], L = this.bcL[k], sd = this.bcS[k], bt = 0.15;
      const p0 = sd === 0 ? posX : posY, r = sd === 0 ? rdx : rdy, st = r > 0 ? 1 : -1;
      let tn = (L - st * bt / 2 - p0) / r, tf = (L + st * bt / 2 - p0) / r;
      if (tf <= 0.08 || tn >= wallD) continue;
      if (tn < 0.08) tn = 0.08; if (tf > wallD) tf = wallD;
      const ao = sd === 0 ? posY : posX, ar = sd === 0 ? rdy : rdx;
      let u = ((ao + tn * ar) * 128) | 0; u %= B.w; if (u < 0) u += B.w;
      const bh = B.bh, bhs = bh * B.solid;
      const yTop = horizon - 0.5 * K / tn, yBot = horizon - (0.5 - bh) * K / tn, yS0 = horizon - (0.5 - bhs) * K / tn, yS1 = horizon - (0.5 - bhs) * K / tf;
      const Lp = this.lightAtPoint(posX + rdx * tn, posY + rdy * tn), li = this.lit(tn);
      const lii = (li * 256) | 0, low = (li * 150) | 0, warm = (Math.max(0, Lp - 0.8) * 300) | 0;
      // the underside (seen from below), then the front face over it
      const u0 = Math.max(0, Math.ceil(yS0)), u1 = Math.min(H, yS1 | 0);
      for (let y = u0; y < u1; y++) {
        const dy = horizon - y; if (dy <= 0) break;
        const t = (0.5 - bhs) * K / dy, a = (t - tn) / (tf - tn);
        let uu = ((ao + t * ar) * 128) | 0; uu %= B.w; if (uu < 0) uu += B.w;
        const row = (B.h * (0.3 + 0.4 * (a < 0 ? 0 : a > 1 ? 1 : a))) | 0;
        const c = B.px[row * B.w + uu]; if (c >>> 24 > 127) buf[y * W + x] = shadeWarm(c, low, warm);
      }
      const f0 = Math.max(0, yTop | 0), f1 = Math.min(H, Math.ceil(yBot)), fh = yBot - yTop;
      for (let y = f0; y < f1; y++) {
        let v = (((y - yTop) / fh) * B.h) | 0; if (v >= B.h) v = B.h - 1; if (v < 0) v = 0;
        const c = B.px[v * B.w + u]; if (c >>> 24 > 127) buf[y * W + x] = shadeWarm(c, (lii * (1 - 0.25 * v / B.h)) | 0, warm);
      }
      if (tn < nearD) { nearD = tn; nearY = Math.max(yBot, yS1); }
    }
    this.bclipD[x] = nearD; this.bclipY[x] = nearY;
  };

  /* ---------- the castle seen from outside: storeys ----------
     heights per wall square (LAYOUT.outside): castle walls are `height` storeys, `raise` parts taller, the rest low */
  function buildHeights(world, O) {
    const n = world.w * world.h, a = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (world.cells[i] === 0) continue;
      const x = i % world.w, y = (i / world.w) | 0;
      let h = y <= O.maxY ? O.height : O.low;
      for (const [x0, y0, x1, y1, hh] of O.raise || []) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) h = hh;
      a[i] = h;
    }
    world.wallH = a;
  }
  /* the castle's floors above the ground floor (or all of it, far away behind a low wall): windows, ivy, banners on the
     upper floors, and battlements along the top against the sky */
  let upTex = null;
  Renderer.prototype.storeys = function (x, perp, idx, side, rdx, rdy, posX, posY, horizon, h, fromGround, flash) {
    const th = G.TEX.outside; if (!th || !th.walls) return;
    if (!upTex) {
      const v = th.variants || [], at = (n) => Math.max(0, v.indexOf(n)), W0 = th.walls;
      upTex = [W0[0], W0[at('lit-window')], W0[0], W0[at('gate-ivy')], W0[at('lit-window')], W0[0], W0[at('gate-banner')], W0[at('lit-window')]];
    }
    if (perp < 0.05) perp = 0.05;
    const buf = this.buf, lh = K / perp, bottom = horizon + lh / 2, yTop = bottom - h * lh;
    let wallX = side === 0 ? posY + perp * rdy : posX + perp * rdx; wallX -= Math.floor(wallX);
    let tx = (wallX * TS) | 0;
    if (side === 0 && rdx > 0) tx = TS - 1 - tx;
    if (side === 1 && rdy < 0) tx = TS - 1 - tx;
    const L = this.lightAtPoint(posX + rdx * (perp - 0.06), posY + rdy * (perp - 0.06));
    let li = this.lit(perp) * (side ? 0.8 : 1) * 0.95; if (flash > 0) li += flash * 1.2;
    const lii = (li * 256) | 0, warm0 = Math.max(0, L - 0.8) * 300;   // the same torchlight as the ground floor, fading upward
    const y0 = Math.max(0, Math.ceil(yTop)), y1 = Math.min(H, (fromGround ? bottom : bottom - lh) | 0);
    const crenel = ((tx + (idx * 37) % 32) >> 4) & 1;          // battlements: every other bit of the top is a gap
    for (let y = y0; y < y1; y++) {
      const hy = (bottom - y) / lh, s = hy | 0, fromTop = h - hy;
      if (fromTop < 0.16 && crenel) continue;                  // a gap between battlements: the sky shows through
      let ty = ((1 - (hy - s)) * TS) | 0; if (ty > TM) ty = TM;
      const tex = s === 0 ? th.walls[0] : upTex[(hash(idx, s, side) >> 3) % upTex.length];
      let c = tex[ty * TS + tx];
      let k = lii;
      if (fromTop < 0.2) k = (lii * (fromTop < 0.035 || (fromTop > 0.15 && fromTop < 0.175) ? 0.62 : 1.05)) | 0;   // the battlement's top edges
      buf[y * W + x] = shadeWarm(c, k, (warm0 / (1 + (hy - 1) * 1.5)) | 0);
    }
  };

  Renderer.prototype.sprites = function (things, posX, posY, dirX, dirY, plX, plY, horizon) {
    const ctx = this.ctx, zb = this.zbuf;
    const inv = 1 / (plX * dirY - dirX * plY);
    const list = [];
    for (const t of things) {
      if (!t.spr || t.hidden) continue;
      const sx = t.x + 0.5 + (t.ox || 0) - posX, sy = t.y + 0.5 + (t.oy || 0) - posY;
      const tX = inv * (dirY * sx - dirX * sy);
      const tY = inv * (-plY * sx + plX * sy);
      if (tY < 0.35 || tY > 12) continue;          // too close: it is in your own square, behind the eye's view
      list.push({ t, tX, tY });
    }
    list.sort((a, b) => b.tY - a.tY);
    ctx.imageSmoothingEnabled = true;
    const picks = this.pk.sprites; picks.length = 0;
    this.tags = [];
    for (const { t, tX, tY } of list) {
      const spr = t.spr, fight = t === G.monThing && G.combat && G.combat.active && spr.roomK;   // a battle shows a friend at battle size
      const sc = (t.scale || 1) * (fight ? 1 / spr.roomK : 1);
      const screenX = (W / 2) * (1 + tX / tY) + (t.shakeX || 0);
      const unit = K / tY;
      const sh = unit * spr.h * sc, sw = unit * spr.w * sc;
      const zBottom = spr.z + (t.base || 0) + (t.lift || 0) + (t.bob || 0) + (t.hover || 0);   // base: standing on furniture (blocks.js)
      const bottomY = horizon + (0.5 - zBottom) * unit;
      const topY = bottomY - sh;
      const left = screenX - sw / 2;
      let x0 = Math.max(0, Math.floor(left)), x1 = Math.min(W - 1, Math.ceil(left + sw));
      if (x0 <= x1) picks.push({ t, left, top: topY, w: sw, h: sh, tY });
      if ((t.kind === 'monster' || t.kind === 'npc') && tY < NAME_FAR + 0.6) {   // close enough to read their name (nameTags.js)
        const cx = Math.round(screenX); if (cx >= 0 && cx < W && tY < zb[cx]) this.tags.push({ t, x: screenX / W, y: Math.max(0, topY) / H, a: Math.min(1, (NAME_FAR + 0.6 - tY) / 0.6) });
      }
      this.lightAtPoint(t.x + 0.5 + (t.ox || 0), t.y + 0.5 + (t.oy || 0));
      const fog = Math.max(0, 1 - Math.min(1, this.lit(tY) + 0.08));
      const a = t.alpha == null ? 1 : t.alpha;
      const sil = this.fogCss && G.fogSil ? G.fogSil(spr, this.fogCss) : spr.sil;   // in the forest things fade into the mist's colour
      let run = -1, rcb = 0;
      const flush = (x) => {
        const srcX = (run - left) / sw * spr.c.width, srcW = (x - run) / sw * spr.c.width;
        if (srcW <= 0) return;
        let cy = topY;                                         // a ceiling beam in front hides the top of it (ceilings.js)
        for (let q = run; q < x; q++) if (this.bclipD[q] < tY && this.bclipY[q] > cy) cy = this.bclipY[q];
        const by = Math.min(bottomY, rcb);                    // furniture in front hides the bottom of it (blocks.js)
        if (by - cy < 0.5) return;
        const sy = (cy - topY) / sh * spr.c.height, sH = (by - cy) / sh * spr.c.height;
        ctx.globalAlpha = a;
        ctx.drawImage(spr.c, srcX, sy, srcW, sH, run, cy, x - run, by - cy);
        if (fog > 0.02 && !t.noFog) { ctx.globalAlpha = a * fog; ctx.drawImage(sil, srcX, sy, srcW, sH, run, cy, x - run, by - cy); }
      };
      for (let x = x0; x <= x1 + 1; x++) {
        const vis = x <= x1 && tY < zb[x], cb = vis && this.lowN[x] ? this.clipBelow(x, tY, horizon) : 1e9;
        if (run >= 0 && (!vis || Math.abs(Math.min(cb, H) - Math.min(rcb, H)) > 1)) { flush(x); run = -1; }
        if (vis && run < 0) { run = x; rcb = cb; }
      }
      ctx.globalAlpha = 1;
      if (t.glow && t.glow[t.fi]) {                    // the glow over a light's flames (added light, wallAnim.js)
        const gc = G.flameGlow(), fk = 0.85 + 0.15 * Math.sin(this.now / 90 + t.phase * 3), r = unit * 0.2 * fk;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * fk;
        for (const [fx, fy] of t.glow[t.fi]) {
          const gx = left + fx * sw, gy = topY + fy * sh, gi = gx | 0;
          if (gi < 0 || gi >= W || tY >= zb[gi]) continue;  // the flame is behind a wall
          ctx.drawImage(gc, gx - r, gy - r, r * 2, r * 2);
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
    }
  };

  G.Renderer = Renderer;
})();
