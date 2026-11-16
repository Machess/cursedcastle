/* VIEW — Ceilings (art from ceilingArt.js, made by tools-src/prepare_ceilings.py). Each room gets:
   - its own ceiling picture (tile: which picture, span: how many squares one picture covers)
   - 3D beams hanging under the ceiling on the lines between squares (renderer.js drawBeams): 'rows' = across the room's
     short way (in a corridor: one every square, like walking through timber frames), 'grid' = both ways
     (coffered halls). every: a beam on every n-th line. bh: how deep the beam hangs (a wall is 1 tall)
   - a corner brace on the wall where each beam meets it (renderer.js lookColumn)
   - small marks on the ceiling now and then (cobwebs, damp, cracks...)
   - things hanging from the ceiling: HANGING below (room props 'hang_*'; chandeliers and lanterns give light) */
(function () {
  G.CEIL_LOOK = {
    hallway:  { tile: 'hallway', span: 2, beam: 'stone', beams: 'rows', every: 1, bh: 0.13, marks: ['cobweb-1', 'cobweb-2', 'damp-1', 'crack-1', 'crack-2'] },
    hall:     { tile: 'hall', span: 2, beam: 'oak-gold', beams: 'grid', every: 1, bh: 0.15, marks: ['cobweb-2'] },
    kitchen:  { tile: 'kitchen', span: 2, beam: 'smoky', beams: 'rows', every: 1, bh: 0.15, marks: ['soot', 'crack-1'] },
    dining:   { tile: 'dining', span: 2, beam: 'honey', beams: 'grid', every: 1, bh: 0.13, marks: ['cobweb-1'] },
    library:  { tile: 'library', span: 2, beam: 'darkwood', beams: 'grid', every: 1, bh: 0.13, marks: ['cobweb-1', 'cobweb-2'] },
    gallery:  { tile: 'gallery', span: 2, beam: 'plaster-gold', beams: 'rows', every: 1, bh: 0.12, marks: ['crack-2'] },
    ballroom: { tile: 'ballroom', span: 3, beam: 'blue-gold', beams: 'rows', every: 2, bh: 0.13, marks: [] },
    bedroom:  { tile: 'bedroom', span: 3, beam: 'starry', beams: 'rows', every: 2, bh: 0.13, marks: [] },
    toyroom:  { tile: 'toyroom', span: 2, beam: 'candy', beams: 'rows', every: 1, bh: 0.1, marks: [] },
    bathroom: { tile: 'bathroom', span: 2, beam: 'tiles', beams: 'rows', every: 1, bh: 0.16, marks: ['damp-2'] },
    vault:    { tile: 'vault', span: 2, beam: 'gold-arch', beams: 'rows', every: 1, bh: 0.18, marks: ['crack-1'] },
    tower:    { tile: 'tower', span: 3, beam: 'rafter', beams: 'rows', every: 1, bh: 0.13, marks: ['cobweb-1', 'cobweb-2'] },
    // no ceiling picture yet (sheet 3 is still to come): their old ceiling, but the beams already
    cellar:   { beam: 'rough', beams: 'rows', every: 1, bh: 0.15, marks: ['cobweb-1', 'damp-1', 'damp-2', 'light-hole'] },
    smithy:   { beam: 'iron', beams: 'rows', every: 1, bh: 0.15, marks: ['soot'] },
    greenhouse: { beam: 'iron-white', beams: 'grid', every: 1, bh: 0.16, marks: [] },
    lab:      { beam: 'copper', beams: 'rows', every: 1, bh: 0.11, marks: ['damp-2'] },
  };
  const MARK_CHANCE = 0.3;
  /* things hanging from the ceiling, per map: [prop name (without hang_), x, y, ox, oy] */
  G.HANGING = {
    castle: [
      ['chandelier-gold', 19, 24], ['chandelier-gold', 12, 18, 0, 0.5], ['chandelier-gold', 14, 18, 0, 0.5],            // the Entrance Hall, over the feast table
      ['chandelier-crystal', 13, 12], ['disco-ball', 13, 10],                                                          // the Ballroom
      ['chandelier-iron', 3, 7, 0.2], ['lantern', 3, 11], ['spider', 3, 9, 0.2], ['chandelier-gold', 3, 16],             // Library, Gallery
      ['flower-basket', 2, 1, 0.3], ['flower-basket', 4, 4], ['copper-pot', 2, 21, 0.3], ['copper-pot', 3, 21, -0.2],
      ['herbs', 1, 19, -0.2], ['sausages', 4, 22, 0.2], ['sausages', 3, 26, 0.2], ['roots-1', 1, 25, -0.1],
      ['star-mobile', 25, 3, -0.5, -0.5], ['star-mobile', 25, 11, -0.5], ['birdcage', 11, 2, -0.15],
      ['herbs', 30, 1, -0.1], ['roots-glow', 32, 3], ['lantern', 30, 3, 0.2, 0.2], ['chandelier-iron', 24, 18, 0, -0.2],
      ['lantern', 7, 11], ['lantern', 7, 18], ['lantern', 29, 11], ['lantern', 29, 20], ['lantern', 12, 6], ['lantern', 25, 7],
      ['lantern', 19, 11], ['lantern', 19, 17], ['lantern', 19, 4], ['lantern', 11, 24], ['lantern', 26, 24],
      ['bat', 7, 15, 0.1], ['bat', 29, 15, -0.1], ['spider', 19, 14, 0.15], ['moss-1', 7, 22], ['roots-2', 18, 18],
      ['lantern', 32, 12], ['mushrooms', 8, 27], ['chandelier-gold', 25, 27],                                         // the secret rooms
    ],
    vault: [['chandelier-gold', 5, 5], ['chandelier-gold', 3, 2], ['chandelier-gold', 7, 2], ['lantern', 5, 8]],
    tower: [['bat', 1, 1, 0.1], ['roots-glow', 3, 2], ['spider', 2, 2, 0.2]],
  };
  G.addHanging = function () {
    for (const [n, x, y, ox, oy] of (G.HANGING[G.mapId()] || [])) {
      const spr = G.SPR['prop_hang_' + n]; if (!spr) continue;
      G.things.push({ kind: 'deco', sprite: 'prop_hang_' + n, x, y, ox: ox || 0, oy: oy || 0, spr });
    }
  };

  const S = () => G.TEX_SIZE || 128;
  function load(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  function toPx(img, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    return { px: new Uint32Array(x.getImageData(0, 0, w, h).data.buffer.slice(0)), w, h };
  }
  G.BEAMS = [];                                        // [{ px, w, h, solid, bh, brace }]
  G.CMARKS = [];                                       // [{ name, px, w, h }]
  G.loadCeilings = async function () {
    if (!G.CEIL_TILES) return 0;
    const k = S() / 128, tiles = {}, beams = {}, braces = {}, marks = {};
    const get = async (A, w, h) => { const img = await load(A.src || A); return img ? toPx(img, w || Math.round(A.w * k), h || Math.round(A.h * k)) : null; };
    await Promise.all([
      ...Object.keys(G.CEIL_TILES).map(async (n) => { tiles[n] = await get(G.CEIL_TILES[n], 256, 256); }),
      ...Object.keys(G.BEAM_ART).map(async (n) => { beams[n] = await get(G.BEAM_ART[n]); }),
      ...Object.keys(G.BRACE_ART).map(async (n) => { braces[n] = await get(G.BRACE_ART[n]); }),
      ...Object.keys(G.CEIL_MARKS).map(async (n) => { marks[n] = await get(G.CEIL_MARKS[n]); }),
    ]);
    G.CMARKS = Object.keys(marks).filter((n) => marks[n]).map((n) => Object.assign({ name: n }, marks[n]));
    const mId = {}; G.CMARKS.forEach((m, i) => { mId[m.name] = i; });
    const bId = {};
    let n = 0;
    for (const theme in G.CEIL_LOOK) {
      const cfg = G.CEIL_LOOK[theme], th = G.TEX[theme]; if (!th) continue;
      const t = cfg.tile && tiles[cfg.tile];
      if (t) th.cb = { px: t.px, n: t.w, span: cfg.span || 2 };
      const b = cfg.beam && beams[cfg.beam];
      let beam = 0;
      if (b) {
        if (bId[cfg.beam + cfg.bh] == null) {
          let solid = 0; while (solid < b.h && [...Array(b.w).keys()].every((x) => b.px[solid * b.w + x] >>> 24 > 100)) solid++;   // the top band that is solid all the way along (arches hang lower in places)
          G.BEAMS.push(Object.assign({}, b, { solid: Math.max(0.25, solid / b.h), bh: cfg.bh || 0.13, brace: braces[cfg.beam] || null }));
          bId[cfg.beam + cfg.bh] = G.BEAMS.length;
        }
        beam = bId[cfg.beam + cfg.bh];
      }
      th.ceilCfg = { beam, beams: cfg.beams, every: cfg.every || 1, marks: (cfg.marks || []).map((m) => mId[m]).filter((i) => i != null) };
      n++;
    }
    if (G.world) G.world.beams = null;
    return n;
  };

  /* where the beams and ceiling marks go in one world:
     w.vBeam[y * W + x] = beam on the line x (between squares (x-1, y) and (x, y)), w.hBeam[y * W + x] = on the line y
     (between (x, y-1) and (x, y)); the value is G.BEAMS index + 1. w.cmarks[cell] = mark + 1 | x << 8 | y << 16 */
  function hsh(a, b, c) { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
  G.buildCeiling = function (w) {
    const W = w.w, Hh = w.h, n = W * Hh;
    w.vBeam = new Uint8Array(n); w.hBeam = new Uint8Array(n); w.cmarks = new Int32Array(n); w.beams = true;
    if (w.spiral) return;
    const open = (x, y) => x >= 0 && y >= 0 && x < W && y < Hh && w.cells[y * W + x] === 0;
    // how far each square's room runs left-right and up-down (to tell a corridor's short way)
    const xr = new Uint8Array(n), yr = new Uint8Array(n);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!open(x, y)) continue; const r = w.region[i];
      let a = x, b = x; while (open(a - 1, y) && w.region[i - (x - a) - 1] === r) a--; while (open(b + 1, y) && w.region[y * W + b + 1] === r) b++;
      let c = y, d = y; while (open(x, c - 1) && w.region[(c - 1) * W + x] === r) c--; while (open(x, d + 1) && w.region[(d + 1) * W + x] === r) d++;
      xr[i] = b - a + 1; yr[i] = d - c + 1;
    }
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!open(x, y)) continue;
      const th = w.theme[i], C = th && th.ceilCfg; if (!C || !C.beam || th.sky) continue;
      // the line on the left (x) and the line above (y) of this square
      if (open(x - 1, y) && w.region[i - 1] === w.region[i] && x % C.every === 0) {
        const ok = C.beams === 'grid' || (yr[i] < xr[i] && yr[i - 1] < xr[i - 1]);
        if (ok) w.vBeam[i] = C.beam;
      }
      if (open(x, y - 1) && w.region[i - W] === w.region[i] && y % C.every === 0) {
        const ok = C.beams === 'grid' || (xr[i] <= yr[i] && xr[i - W] <= yr[i - W]);
        if (ok) w.hBeam[i] = C.beam;
      }
      if (C.marks.length) {
        const h = hsh(x, y, 77); if ((h % 1000) / 1000 > MARK_CHANCE) continue;
        const m = C.marks[(h >>> 10) % C.marks.length], M = G.CMARKS[m], S0 = 128;
        const mx = 10 + (((h >>> 3) & 255) / 255) * Math.max(0, S0 - M.w - 20), my = 10 + (((h >>> 17) & 255) / 255) * Math.max(0, S0 - M.h - 20);
        w.cmarks[i] = (m + 1) | ((mx | 0) << 8) | ((my | 0) << 16);
      }
    }
  };
})();
