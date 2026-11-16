/* VIEW — Natural walls (art from wallLookArt.js, made by tools-src/prepare_walls.py). A room's wall is built in layers,
   bottom to top, by the renderer (renderer.js column):
     1. the long wall strip: one picture several squares long that carries on from square to square along a wall, so
        the bricks join up and only repeat every 7-8 squares (each wall line starts at its own place in the strip)
     2. trims: a skirting along the bottom and an edge along the top
     3. a small mark now and then: a crack, moss, a cobweb in a corner, a chalk doodle... (soot above every torch)
     4. the decoration (painting, shelf...) as before
     5. pillars: in inside corners, at the ends of walls, and every few squares along long walls
   A room without a strip keeps its old wall picture but still gets the pillars and marks. */
(function () {
  const CRACKS = ['crack-1', 'crack-2', 'crack-3'], DOODLES = ['chalk-knight', 'chalk-cat', 'chalk-game'];
  G.WALL_LOOK = {
    hallway: { strip: 'hallway', pillar: 'stone', skirt: 'skirt-stone', top: 'top-stone', every: 4, soot: 1,
               marks: [...CRACKS, 'moss-1', 'cobweb', 'damp-1', 'damp-2', 'scuffs', ...DOODLES] },
    hall:    { strip: 'hall', pillar: 'cream', skirt: 'skirt-cream', top: 'top-wood', every: 3, soot: 1,
               marks: ['crack-1', 'crack-2', 'hole-1', 'hole-2', 'cobweb', 'scuffs', 'chalk-cat'] },
    gallery: { strip: 'gallery', pillar: 'darkwood', top: 'top-wood', every: 4, marks: ['cobweb'] },
    library: { strip: 'library', pillar: 'darkwood', skirt: 'skirt-wood', top: 'top-wood', every: 0, marks: ['cobweb'] },   // the shelves have their own sides: pillars only in corners
    kitchen: { strip: 'kitchen', pillar: 'brick', skirt: 'skirt-tile', every: 4, soot: 1, marks: ['crack-1', 'crack-2', 'scuffs', 'cobweb'] },
    dining:  { strip: 'dining', pillar: 'post', skirt: 'skirt-wood', top: 'top-wood', every: 3, soot: 1, marks: ['scuffs', 'cobweb'] },
    cellar:  { pillar: 'mossy', every: 3, soot: 1, marks: ['moss-1', 'moss-2', 'damp-1', 'damp-2', 'cobweb', 'crack-2', 'crack-3'] },
    stairs:  { pillar: 'stone', every: 0, marks: ['crack-1', 'crack-3', 'moss-1', 'cobweb'] },
    smithy:  { soot: 1, marks: ['crack-1', 'scuffs', 'crack-2'] },
    outside: { soot: 1, marks: ['moss-1', 'moss-2', 'crack-3', 'damp-1'] },
    toyroom: { marks: DOODLES },
    tower:   { marks: ['crack-2', 'cobweb'] },
    greenhouse: { marks: [] }, bathroom: { marks: [] },
    bedroom: { marks: ['cobweb'] }, ballroom: { marks: ['cobweb'] }, lab: { marks: ['cobweb', 'scuffs'] }, vault: { marks: ['cobweb'] },
  };
  const CHANCE = 0.42;                                  // how many plain walls get a mark

  const S = () => G.TEX_SIZE || 128;
  function load(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  function toPx(img, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    return { px: new Uint32Array(x.getImageData(0, 0, w, h).data.buffer.slice(0)), w, h };
  }
  function layer(draw) {                               // a see-through wall-sized picture
    const c = document.createElement('canvas'); c.width = c.height = S();
    const x = c.getContext('2d', { willReadFrequently: true }); draw(x);
    return new Uint32Array(x.getImageData(0, 0, S(), S()).data.buffer.slice(0));
  }

  G.MARKS = [];                                        // [{ name, px, w, h }]
  /* artTextures.js calls this once the rooms' textures are built (decos: the loaded wall decorations) */
  G.loadWallLook = async function (decos) {
    if (!G.WALL_STRIPS) return 0;
    const k = S() / 128, get = async (A) => { const img = await load(A.src); return img ? toPx(img, Math.max(1, Math.round(A.w * k)), Math.max(1, Math.round((A.h || 128) * k))) : null; };
    const strips = {}, pillars = {}, trims = {}, marks = {};
    await Promise.all([
      ...Object.keys(G.WALL_STRIPS).map(async (n) => { strips[n] = await get(G.WALL_STRIPS[n]); }),
      ...Object.keys(G.WALL_PILLARS).map(async (n) => { pillars[n] = await get(G.WALL_PILLARS[n]); }),
      ...Object.keys(G.WALL_TRIMS).map(async (n) => { trims[n] = await get(G.WALL_TRIMS[n]); }),
      ...Object.keys(G.WALL_MARKS).map(async (n) => { marks[n] = await get(G.WALL_MARKS[n]); }),
    ]);
    if (G.setBlockPillars) G.setBlockPillars(pillars);   // pillars standing in rooms use the same art (blocks.js)
    G.MARKS = Object.keys(marks).filter((n) => marks[n]).map((n) => Object.assign({ name: n }, marks[n]));
    const markId = {}; G.MARKS.forEach((m, i) => { markId[m.name] = i; });
    const anim = {};
    await Promise.all(Object.keys(G.ANIM_DECOS || {}).map(async (d) => {
      const f = await Promise.all(G.ANIM_DECOS[d].frames.map(load));
      if (f.every(Boolean)) anim[d] = f.map((img) => layer((x) => x.drawImage(img, 0, 0, S(), S())));
    }));
    let n = 0;
    for (const theme in G.WALL_LOOK) {
      const cfg = G.WALL_LOOK[theme], th = G.TEX[theme]; if (!th || !th.walls) continue;
      const st = cfg.strip && strips[cfg.strip];
      th.look = { strip: st ? st.px : null, sw: st ? st.w : 0, pillar: cfg.pillar && pillars[cfg.pillar], skirt: cfg.skirt && trims[cfg.skirt],
        top: cfg.top && trims[cfg.top], every: cfg.every || 0, soot: cfg.soot ? markId.soot : undefined,
        marks: (cfg.marks || []).map((m) => markId[m]).filter((i) => i != null) };
      if (th.variants) {                                // decorations go over the wall as their own layer: always the moving
        th.over = []; th.overFrames = [];              // pictures (so they can hop when they pull a face), and every one on a strip wall
        th.animPlain = th.walls[Math.max(0, th.variants.indexOf(null))];
        th.variants.forEach((d, vi) => {
          if (!d || (th.lightKind && th.lightKind[vi])) return;
          if (anim[d]) th.overFrames[vi] = anim[d];
          else if (st && decos[d]) { const D = decos[d]; th.over[vi] = layer((x) => x.drawImage(D.img, Math.round((S() - D.img.width) / 2), D.top)); }
        });
      }
      n++;
    }
    G.TELL_LAYERS = {};                                // a secret wall's odd bit (secrets.js): its own pictures, or a decoration
    await Promise.all(Object.keys(G.SECRET_TELLS || {}).map(async (k) => {
      const img = await load(G.SECRET_TELLS[k]); if (img) G.TELL_LAYERS[k] = layer((x) => x.drawImage(img, 0, 0, S(), S()));
    }));
    for (const m in G.MAPS) for (const sc of (G.MAPS[m].layout.secrets || [])) {
      const D = sc.tell.deco && decos[sc.tell.deco];
      if (D) G.TELL_LAYERS[sc.tell.deco] = layer((x) => x.drawImage(D.img, Math.round((S() - D.img.width) / 2), D.top));
    }
    if (G.world) G.world.marks = null;                // placed again with the marks loaded
    return n;
  };

  /* where the marks go in one world: world.marks[cell * 4 + face] = mark + 1 | x << 8 | y << 16 | mirrored << 24
     (x, y: the mark's top-left corner on the wall picture, in the renderer's texture columns) */
  function hsh(a, b, c) { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
  G.buildWallMarks = function (w) {
    const out = new Int32Array(w.w * w.h * 4); w.marks = out;
    if (!G.MARKS.length) return out;
    const S0 = S(), N4 = [[-1, 0, 1], [1, 0, 0], [0, -1, 3], [0, 1, 2]], cell = (x, y) => (x < 0 || y < 0 || x >= w.w || y >= w.h ? 1 : w.cells[y * w.w + x]);
    for (let wy = 0; wy < w.h; wy++) for (let wx = 0; wx < w.w; wx++) {
      const idx = wy * w.w + wx; if (w.cells[idx] !== 1) continue;
      for (const [dx, dy, code] of N4) {
        const nx = wx + dx, ny = wy + dy; if (cell(nx, ny) !== 0) continue;
        const th = w.theme[ny * w.w + nx], L = th && th.look; if (!L) continue;
        const vi = G.wallVariant(w, wx, wy, code, th), deco = th.variants && th.variants[vi], h = hsh(wx, wy, code + 11);
        const flip = code === 1 || code === 2;                   // the renderer draws these faces' pictures right to left
        let m = -1, mx = 0, my = 0, mir = 0;
        if (deco && th.lightKind && th.lightKind[vi]) {            // soot above a torch
          if (L.soot == null) continue;
          m = L.soot; const M = G.MARKS[m], b = (G.DECO_BOX || {})[deco];
          const mid = b ? (b[1] + b[3]) / 2 : S0 * 0.45;
          mx = Math.round((S0 - M.w) / 2); my = Math.max(L.top ? L.top.h - 4 : 0, Math.round(mid - S0 * 0.25 + 12 - M.h));   // just above the flame
        } else {
          if (deco || !L.marks.length || (h % 1000) / 1000 > CHANCE) continue;
          const near = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([ax, ay]) => cell(wx + ax, wy + ay) === 2);
          if (near) continue;
          m = L.marks[(h >>> 10) % L.marks.length]; const M = G.MARKS[m], name = M.name;
          const r1 = ((h >>> 3) & 255) / 255, r2 = ((h >>> 17) & 255) / 255;
          const topY = L.top ? L.top.h : 0, botY = S0 - (L.skirt ? L.skirt.h : 0);
          mx = Math.round(8 + r1 * Math.max(0, S0 - M.w - 16));
          if (name === 'cobweb') {                                  // only up in an inside corner
            const sa = dx ? [0, 1] : [1, 0];                         // along the wall
            const lowSolid = cell(nx - sa[0], ny - sa[1]) !== 0, highSolid = cell(nx + sa[0], ny + sa[1]) !== 0;
            if (!lowSolid && !highSolid) continue;
            const low = lowSolid && (!highSolid || r2 < 0.5);          // the corner at the low end along the wall
            const left = low !== flip;                                // ...is it on the picture's left?
            mx = left ? 0 : S0 - M.w; mir = left ? 0 : 1; my = topY;
          } else if (name.startsWith('moss') || name === 'mousehole') my = S0 - M.h;
          else if (name.startsWith('damp')) my = topY;
          else if (name.startsWith('chalk')) my = Math.round(botY - M.h - 6 - r2 * 18);
          else if (name === 'scuffs') my = Math.round(S0 * 0.4 + r2 * (S0 * 0.3));
          else my = Math.round(topY + 6 + r2 * Math.max(0, S0 * 0.55 - M.h));
        }
        out[idx * 4 + code] = (m + 1) | (mx << 8) | (my << 16) | (mir << 24);
      }
    }
    if (G.secretTells) G.secretTells(w, out);
    if (G.placeWallPics) G.placeWallPics(w, out);       // pictures on one wall: the fireplace, the window (blocks.js)
    if (G.placeWallMesses) G.placeWallMesses(w, out);   // scribbles, dusty paintings, cobwebs and cracks to clean (cleaning.js)
    return out;
  };
})();
