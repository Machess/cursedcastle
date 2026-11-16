/* VIEW — The Whispering Wood: how the forest is drawn.
   Tree squares: the renderer's rays pass through them (renderer.js, cell 3), and each one holds standing pictures (a tree
   and bushes) that are drawn like any other thing, so you see between the trunks into the forest behind. Far things fade
   into the area's mist colour (theme.fog), and a painted backdrop of far forest stands in for the sky (theme.skyTex).
   Open squares get the area's path floor. Also here: the pictures of the spirits, their objects and the gates, the trees
   on the map, the partner in the corner of the view, and the world map trip between the castle and the forest.

   ART TO MAP IN LATER: every picture in this file is a stand-in painted in code. To use real art, put the file in
   www/assets/img/forest/ and name it in G.FOREST_ART; a name left null keeps the stand-in.
     trees: up to 10 pictures (transparent PNG/WebP, trunk at the bottom middle)      bushes: up to 4
     backdrop: a wide strip of far forest that repeats sideways                       worldmap: the map for the trip (1280 x 800)
     spirits / objects / gates: one picture each, by id                                floors / walls: tiles, by theme
   Friends' portraits: MONSTERS.<id>.img (models/forest.js). */
(function () {
  const ui = G.ui;
  G.FOREST_ART = {
    trees: [], bushes: [], backdrop: null, worldmap: null,
    spirits: {}, objects: {}, gates: {}, floors: {}, walls: {}, things: {},
  };
  const TS = () => G.TEX_SIZE || 128;
  function rnd0(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9 >>> 0) / 4294967296); }
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function sil(src, col) { const c = cv(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col || '#000'; x.fillRect(0, 0, c.width, c.height); return c; }
  const spr = (c, w, h, z) => ({ c, sil: sil(c), w, h, z: z || 0 });
  G.fogSil = function (s, css) { if (!s.silF || s.silF.col !== css) s.silF = { col: css, c: sil(s.c, css) }; return s.silF.c; };
  const pixels = (c) => new Uint32Array(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.buffer.slice(0));
  function tile(base, paint, seed) {                          // a floor or wall tile, TEX_SIZE square
    const S = TS(), c = cv(S, S), x = c.getContext('2d'), R = rnd0(seed);
    x.fillStyle = base; x.fillRect(0, 0, S, S); paint(x, S, R);
    return pixels(c);
  }
  const speck = (x, S, R, cols, n, w = 2, h = 2) => { for (let i = 0; i < n; i++) { x.fillStyle = cols[(R() * cols.length) | 0]; x.fillRect((R() * S) | 0, (R() * S) | 0, w, h); } };
  const blades = (x, S, R, cols, n) => { for (let i = 0; i < n; i++) { x.fillStyle = cols[(R() * cols.length) | 0]; const a = (R() * S) | 0, b = (R() * S) | 0; x.fillRect(a, b, 1, 3); x.fillRect(a + 1, b + 1, 1, 2); } };

  /* ---------- themes: floor, path, walls, mist, backdrop ---------- */
  function backdrop() {                                       // far forest in three misty layers, 512 wide so it wraps round
    const w = 512, h = 112, c = cv(w, h), x = c.getContext('2d'), R = rnd0(77);
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfe6c8'); g.addColorStop(0.6, '#b4d4b0'); g.addColorStop(1, '#9fc8a8');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (const [col, top, tw] of [['#a9cfae', 4, 30], ['#8fbf9a', 14, 24], ['#74aa84', 30, 20]]) {
      x.fillStyle = col;
      for (let i = 0; i < w / tw * 2.2; i++) {
        const cx = (R() * w) | 0, tt = top + R() * 26, r = tw * (0.5 + R() * 0.5);
        for (const o of [-w, 0, w]) {
          x.fillRect(cx + o - 2, tt + r * 0.6, 4, h); x.beginPath(); x.ellipse(cx + o, tt + r * 0.5, r, r * (0.9 + R() * 0.5), 0, 0, 7); x.fill();
        }
      }
    }
    return { w, h, data: pixels(c) };
  }
  function addThemes() {
    const T = G.TEX, G1 = ['#3f8a3f', '#2f7434', '#57a34c'], sky = backdrop();
    const grass = tile('#35793a', (x, S, R) => { speck(x, S, R, ['#2c6a31', '#3f8a3f'], 900, 3, 3); blades(x, S, R, G1, 500); speck(x, S, R, ['#f0e070', '#f4f4f4'], 14, 2, 2); }, 3);
    const path = tile('#b08a58', (x, S, R) => { speck(x, S, R, ['#a07a4a', '#c09a66', '#96703f'], 1100, 3, 2); speck(x, S, R, ['#7c6240', '#d4b480'], 60, 3, 2); blades(x, S, R, G1, 26); }, 5);
    const mud = tile('#6a6a48', (x, S, R) => { speck(x, S, R, ['#5c5c3e', '#787852', '#4f5a44'], 1100, 3, 2); x.fillStyle = 'rgba(120,160,170,.5)'; for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(R() * S, R() * S, 8 + R() * 10, 4 + R() * 5, 0, 0, 7); x.fill(); } blades(x, S, R, ['#4a7a4a', '#5c8a52'], 120); }, 7);
    const marshGrass = tile('#3f6e4a', (x, S, R) => { speck(x, S, R, ['#356040', '#4a7a52'], 900, 3, 3); blades(x, S, R, ['#5c8a52', '#2f5a3a'], 500); }, 9);
    const flags = tile('#8f9488', (x, S, R) => { const n = 4, q = S / n; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = 130 + ((R() * 40) | 0); x.fillStyle = `rgb(${v},${v + 4},${v - 8})`; x.fillRect(i * q + 2, j * q + 2, q - 4, q - 4); }
      x.fillStyle = '#4a7a45'; for (let i = 0; i < 260; i++) x.fillRect(((R() * n) | 0) * q + (R() < 0.5 ? 0 : q - 2) + R() * 2, R() * S, 2, 3); blades(x, S, R, G1, 80); }, 11);
    const dusk = tile('#4a4a7a', (x, S, R) => { speck(x, S, R, ['#40406c', '#585890', '#3a5a5a'], 1000, 3, 3); blades(x, S, R, ['#6a6aa8', '#4a7a6a'], 300); speck(x, S, R, ['#e8a0f0', '#a0f0e0'], 30, 2, 2); }, 13);
    const glowPath = tile('#6a5a8a', (x, S, R) => { speck(x, S, R, ['#5c4e7c', '#7a6a9c'], 1000, 3, 2); speck(x, S, R, ['#f0b0ff', '#b0fff0'], 40, 2, 2); }, 15);
    const cliff = tile('#6a6e66', (x, S, R) => { for (let i = 0; i < 26; i++) { const v = 90 + ((R() * 50) | 0); x.fillStyle = `rgb(${v},${v + 4},${v - 4})`; const a = R() * S, b = R() * S, w = 14 + R() * 30, h = 10 + R() * 22; x.fillRect(a, b, w, h); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(a, b + h - 2, w, 2); }
      x.fillStyle = '#3f8a3f'; for (let i = 0; i < 40; i++) x.fillRect(R() * S, R() * 14, 3, 3 + R() * 8); x.fillStyle = '#2c6a31'; x.fillRect(0, S - 5, S, 5); blades(x, S, R, G1, 60); }, 17);
    const ruin = tile('#84887c', (x, S, R) => { const bw = S / 4, bh = S / 6; for (let j = 0; j < 6; j++) for (let i = -1; i < 4; i++) { const v = 118 + ((R() * 34) | 0); x.fillStyle = `rgb(${v},${v + 3},${v - 10})`; x.fillRect(i * bw + (j & 1) * bw / 2 + 1, j * bh + 1, bw - 2, bh - 2); }
      x.fillStyle = '#4a8a45'; for (let i = 0; i < 300; i++) x.fillRect(R() * S, R() * S * (R() < 0.6 ? 0.25 : 1), 3, 2); x.strokeStyle = '#3a3a34'; x.beginPath(); x.moveTo(S * 0.3, 0); x.lineTo(S * 0.42, S * 0.3); x.lineTo(S * 0.36, S * 0.55); x.stroke(); }, 19);
    const planks = tile('#8a5a30', (x, S, R) => { const pw = S / 6; for (let i = 0; i < 6; i++) { const v = (R() * 26) | 0; x.fillStyle = `rgb(${128 + v},${84 + v},${44 + v / 2})`; x.fillRect(i * pw, 0, pw - 2, S); x.fillStyle = 'rgba(40,20,5,.5)'; x.fillRect(i * pw + pw - 2, 0, 2, S); for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(60,30,10,.4)'; x.fillRect(i * pw + 3 + R() * (pw - 8), R() * S, 2, 8 + R() * 14); } }
      x.fillStyle = '#5a3418'; x.fillRect(0, 0, S, 8); x.fillRect(0, S - 10, S, 10); }, 21);
    const mk = (walls, floor, pathFloor, fog) => ({ walls: [walls, walls], floor, pathFloor, ceil: null, sky: true, skyTex: sky, fog });
    T.forest = mk(cliff, grass, path, 0x9fc8a8);
    T.foresthut = mk(planks, grass, path, 0xb6d4a8);
    T.marsh = mk(cliff, marshGrass, mud, 0xa9bcc4);
    T.ruins = mk(ruin, grass, flags, 0xa8c4a4);
    const sky2 = { w: sky.w, h: sky.h, data: sky.data };     // the circle's own twilight sky (poured in by loadForestArt)
    T.ruins.crumble = true;                                   // ruin walls end in broken tops (renderer.js)
    T.circle = mk(cliff, dusk, dusk, 0x8a7ac0);       // the whole circle glows (its path is the same magic floor)
    for (const k of ['forest', 'foresthut', 'marsh', 'ruins', 'circle']) T[k].key = k;
    const cave = tile('#4a4038', (x, S, R) => { speck(x, S, R, ['#3e3630', '#5a4e44', '#33302c'], 900, 4, 3); }, 23);
    const caveFloor = tile('#5a4030', (x, S, R) => { speck(x, S, R, ['#4a3426', '#6a4c38'], 700, 4, 3); }, 29);
    G.FOREST_TEX = { cavefloor: caveFloor, grass, path, marsh: mud, ruins: flags, circle: dusk, sky, sky2, hut: {}, walls: { cliff, ruins: ruin, hut: planks, cave } };   // the real tiles are poured into these (loadForestArt)
    loadForestArt();
    let cav = null;                                           // the caves: the cellar's stone for now, with its own mood (LIGHT_LOOK.mood.cavern)
    Object.defineProperty(T, 'cavern', { configurable: true, get: () => { const c = T.cellar, own = !!(G.FOREST_FILES && G.FOREST_FILES.walls && G.FOREST_FILES.walls.cave);   // its own walls once the picture is in
      if (!cav || cav.from !== c.walls || cav.cb !== c.cb || cav.look !== c.look || cav.own !== own) cav = Object.assign({}, c, { key: 'cavern', from: c.walls, own }, own ? { walls: [cave, cave], floor: caveFloor, ceil: cave, cb: null } : {}); return cav; } });
  }
  /* ---------- the real pictures (forestArt.js, made by tools-src/prepare_forest.py) replace the stand-ins in place ----------
     The tiles and the backdrop are poured into the same arrays the themes already point at, and each tree's picture
     replaces its stand-in's, so nothing that was built with the stand-ins has to be built again. */
  function img(src, then) { const i = new Image(); i.onload = () => { then(i); G.dirty = true; }; i.src = src; }
  function loadForestArt() {
    const A = G.FOREST_FILES, X = G.FOREST_TEX; if (!A || !X) return;
    for (const k in A.floors) img(A.floors[k], (i) => { const S = TS(), c = cv(S, S), x = c.getContext('2d'); x.drawImage(i, 0, 0, S, S); X[k].set(pixels(c)); });
    for (const k in A.walls || {}) img(A.walls[k], (i) => { const S = TS(), c = cv(S, S), x = c.getContext('2d'); x.drawImage(i, 0, 0, S, S); X.walls[k].set(pixels(c)); });
    if (A.worldmap) img(A.worldmap, (i) => { G.WORLD_PIC = i; });
    if (A.backdrop2) img(A.backdrop2, (i) => { const c = cv(i.width, i.height); c.getContext('2d').drawImage(i, 0, 0); X.sky2.w = i.width; X.sky2.h = i.height; X.sky2.data = pixels(c); G.TEX.circle.skyTex = X.sky2; G.TEX.circle.fog = A.fog2; });
    if (A.hut && A.hut.roof) img(A.hut.roof, (i) => { const S = TS(), c = cv(S, S); c.getContext('2d').drawImage(i, 0, 0, S, S); X.hut.roof = pixels(c); });
    for (const k of ['front', 'side', 'chimney', 'hive']) if (A.hut && A.hut[k]) img(A.hut[k].src, (i) => { const c = cv(i.width, i.height); c.getContext('2d').drawImage(i, 0, 0); X.hut[k] = { w: i.width, h: i.height, data: pixels(c), aspect: A.hut[k].aspect }; });
    img(A.backdrop, (i) => { const c = cv(i.width, i.height); c.getContext('2d').drawImage(i, 0, 0); X.sky.w = i.width; X.sky.h = i.height; X.sky.data = pixels(c);
      for (const k of ['forest', 'foresthut', 'ruins']) G.TEX[k].fog = A.fog; });
  }
  function artSprites() {
    const A = G.FOREST_FILES; if (!A) return;
    const swap = (old, f, maxW, maxH) => img(f.src, (i) => {     // as tall as maxH, unless that makes it wider than maxW
      const c = cv(i.width, i.height); c.getContext('2d').drawImage(i, 0, 0);
      const h = Math.min(maxH, maxW / f.aspect); Object.assign(old, spr(c, h * f.aspect, h, 0)); old.silF = null;
    });
    G.TREE_SPR = A.trees.map((f, k) => { const s = G.TREE_SPR[k % G.TREE_SPR.length]; const o = Object.assign({}, s); o.kind = f.kind || 'green'; swap(o, f, 1.9, 2.3); return o; });
    G.BUSH_SPR = A.bushes.map((f, k) => { const o = Object.assign({}, G.BUSH_SPR[k % G.BUSH_SPR.length]); swap(o, f, 1.35, 0.8); return o; });
    if (A.tell) swap(G.BUSH_TELL, A.tell, 1.35, 0.8);
    G.CBUSH_SPR = (A.cbush || []).map((f) => { const o = spr(cv(2, 2), 0.8, 0.5, 0); swap(o, f, 1.35, 0.8); return o; });   // the Mushroom Circle's twilight bushes
    G.VERGE_SPR = (A.verge || []).map((f, k) => { const o = spr(cv(2, 2), 0.5, 0.2, 0); swap(o, f, k < 4 ? 0.85 : k < 7 ? 0.75 : 0.8, k < 4 ? 0.26 : k < 7 ? 0.95 : 0.4); return o; });   // 0-3 edge plants, 4 bush, 5 ivy, 6 ruin end, 7 log
  }
  function artSpirits() {                                     // the seven spirits and the things they are bound to
    const A = G.FOREST_FILES, S = G.SPR; if (!A) return;
    for (const id in A.spirits || {}) img(A.spirits[id].src, (i) => { const c = cv(i.width, i.height); c.getContext('2d').drawImage(i, 0, 0); Object.assign(S['fo_spirit_' + id], spr(c, 0.62, 0.62, 0)); if (G.renderPartner && G.state) G.renderPartner(); });
    for (const id in A.objects || {}) { const f = A.objects[id]; img(f.src, (i) => { const c = cv(i.width, i.height); c.getContext('2d').drawImage(i, 0, 0); const h = Math.min(0.95, 0.9 / f.aspect); Object.assign(S['fo_obj_' + id], spr(c, h * f.aspect, h, 0)); }); }
  }
  function artThings() {                                      // spirit stone, signpost, berry bush, glowcaps
    const A = G.FOREST_FILES, S = G.SPR, H = { spiritstone: 0.9, signpost: 0.66, berries: 0.42, glowcap: 0.36 }; if (!A) return;
    for (const id in A.things || {}) { const f = A.things[id]; img(f.src, (i) => { const c = cv(i.width, i.height); c.getContext('2d').drawImage(i, 0, 0); if (S['fo_' + id]) Object.assign(S['fo_' + id], spr(c, H[id] * f.aspect, H[id], 0)); }); }
  }
  function artGates() {                                       // the things in the way: as wide as the path, up to a square tall
    const A = G.FOREST_FILES, S = G.SPR; if (!A) return;
    for (const id in A.gates || {}) { const f = A.gates[id]; img(f.src, (i) => { const c = cv(i.width, i.height); c.getContext('2d').drawImage(i, 0, 0); const h = Math.min(1.0, 1.16 / f.aspect); if (S['fo_gate_' + id]) Object.assign(S['fo_gate_' + id], spr(c, h * f.aspect, h, 0)); }); }
  }
  /* which trees grow where: [kind, share] per area; the rest are ordinary green trees */
  const TREE_MIX = {
    forest: [['bare', 0.06], ['gold', 0.08], ['pink', 0.03], ['willow', 0.04]],
    foresthut: [['pink', 0.3], ['gold', 0.15]],
    marsh: [['bare', 0.5], ['willow', 0.25]],
    ruins: [['bare', 0.3], ['gold', 0.15]],
    circle: [['circle', 1]],
  };
  function pickTree(key, h) {
    const by = G.TREE_KIND || (G.TREE_KIND = G.TREE_SPR.reduce((m, t) => { (m[t.kind || 'green'] = m[t.kind || 'green'] || []).push(t); return m; }, {}));
    let r = ((h >>> 8) & 1023) / 1024, kind = 'green';
    for (const [k, share] of TREE_MIX[key] || TREE_MIX.forest) { if (r < share) { kind = k; break; } r -= share; }
    const l = by[kind] || by.green || G.TREE_SPR; return l[h % l.length];
  }
  const baseTex = G.buildTextures;
  G.buildTextures = function () { baseTex.apply(this, arguments); addThemes(); };

  /* ---------- stand-in pictures ---------- */
  const blob = (x, cx, cy, rx, ry, col) => { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); };
  function leaves(x, R, cx, cy, rx, ry, cols, n) {
    for (let i = 0; i < n; i++) { const a = R() * 6.28, d = Math.sqrt(R()); blob(x, cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, rx * (0.28 + R() * 0.2), ry * (0.24 + R() * 0.18), cols[(R() * cols.length) | 0]); }
  }
  function tree(kind, seed) {
    const W = 160, H = 288, c = cv(W, H), x = c.getContext('2d'), R = rnd0(seed);
    const trunk = (col, w, top) => { x.fillStyle = col; x.beginPath(); x.moveTo(W / 2 - w, H); x.lineTo(W / 2 - w * 0.6, top); x.lineTo(W / 2 + w * 0.6, top); x.lineTo(W / 2 + w, H); x.fill(); x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(W / 2 + w * 0.15, top, w * 0.6, H - top); };
    blob(x, W / 2, H - 5, 46, 7, 'rgba(0,0,0,.3)');
    if (kind === 'oak') { trunk('#6a4424', 14, 120); leaves(x, R, W / 2, 92, 66, 78, ['#2f7434', '#3f8a3f', '#286a30', '#4c9c48'], 60); }
    else if (kind === 'dark') { trunk('#4e3420', 16, 110); leaves(x, R, W / 2, 84, 70, 76, ['#245a30', '#1f4e2a', '#2f6a38'], 60); }
    else if (kind === 'birch') { trunk('#e8e4d8', 9, 90); x.fillStyle = '#3a3630'; for (let i = 0; i < 12; i++) x.fillRect(W / 2 - 8 + R() * 10, 100 + R() * 180, 6 + R() * 6, 2); leaves(x, R, W / 2, 80, 58, 70, ['#e2c84a', '#d4b038', '#c8d05a', '#a8b840'], 55); }
    else if (kind === 'pine') { trunk('#5a3a22', 9, 60); for (let k = 0; k < 6; k++) { const y = 20 + k * 38, w = 26 + k * 9; x.fillStyle = k & 1 ? '#1f5a3a' : '#266a44'; x.beginPath(); x.moveTo(W / 2, y - 22); x.lineTo(W / 2 + w, y + 34); x.lineTo(W / 2 - w, y + 34); x.fill(); } }
    else if (kind === 'willow') { trunk('#5c4a2c', 13, 110); leaves(x, R, W / 2, 74, 64, 56, ['#6a9a4a', '#5a8a42'], 40); x.strokeStyle = '#6a9a4a'; x.lineWidth = 4; for (let i = 0; i < 16; i++) { const a = 14 + i * 9; x.beginPath(); x.moveTo(a, 80 + R() * 20); x.lineTo(a + (R() - 0.5) * 8, 170 + R() * 60); x.stroke(); } }
    else { trunk('#6e6258', 11, 70); x.strokeStyle = '#6e6258'; x.lineWidth = 7; for (const [a, b, d, e] of [[80, 120, 30, 70], [80, 100, 128, 50], [80, 150, 120, 110], [80, 80, 60, 30]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(d, e); x.stroke(); } }
    return spr(c, 1.25, 2.25, 0);
  }
  function bush(seed, flowers) {
    const W = 176, H = 96, c = cv(W, H), x = c.getContext('2d'), R = rnd0(seed);
    blob(x, W / 2, H - 4, 78, 6, 'rgba(0,0,0,.3)');
    leaves(x, R, W / 2, 56, 72, 30, ['#2f7434', '#3f8a3f', '#286a30', '#357a3a'], 46);
    if (flowers) for (let i = 0; i < 9; i++) { const a = 20 + R() * 136, b = 26 + R() * 50; blob(x, a, b, 4, 4, ['#f4f4f4', '#f0d050', '#f0a0c8'][i % 3]); blob(x, a, b, 1.5, 1.5, '#e08a20'); }
    return spr(c, 1.3, 0.7, 0);
  }
  function thing(w, h, paint, uw, uh, z) { const c = cv(w, h), x = c.getContext('2d'); blob(x, w / 2, h - 5, w * 0.36, 6, 'rgba(0,0,0,.3)'); paint(x, w, h); return spr(c, uw, uh, z); }
  /* a spirit: a little glowing creature (stand-in: a round body with ears or wings in its element's colour) */
  function spiritPic(id) {
    const S = G.SPIRITS[id], col = S.colour;
    return thing(128, 128, (x) => {
      const g = x.createRadialGradient(64, 66, 6, 64, 66, 60); g.addColorStop(0, col + 'cc'); g.addColorStop(1, col + '00'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      if (id === 'whirl' || id === 'luna') { blob(x, 30, 60, 24, 14, '#ffffffcc'); blob(x, 98, 60, 24, 14, '#ffffffcc'); }
      if (id === 'sprig' || id === 'ember' || id === 'fizz') { x.fillStyle = col; x.beginPath(); x.moveTo(40, 44); x.lineTo(34, 12); x.lineTo(58, 36); x.fill(); x.beginPath(); x.moveTo(88, 44); x.lineTo(94, 12); x.lineTo(70, 36); x.fill(); }
      blob(x, 64, 70, 32, 30, col); blob(x, 56, 60, 12, 10, 'rgba(255,255,255,.45)');
      if (id === 'pebble') { blob(x, 64, 60, 36, 22, '#7a8a5a'); blob(x, 64, 84, 30, 14, col); }
      blob(x, 53, 72, 6, 7, '#fff'); blob(x, 75, 72, 6, 7, '#fff'); blob(x, 54, 73, 3, 4, '#221a2a'); blob(x, 76, 73, 3, 4, '#221a2a');
      x.strokeStyle = '#221a2a'; x.lineWidth = 2.5; x.beginPath(); x.arc(64, 82, 7, 0.2, Math.PI - 0.2); x.stroke();
    }, 0.42, 0.42, 0.3);
  }
  const OBJ = {
    sprig(x) { blob(x, 64, 96, 30, 34, '#8a8e86'); x.fillStyle = '#6a6e68'; x.fillRect(34, 60, 60, 16); blob(x, 64, 60, 31, 12, '#7a7e76'); x.fillRect(60, 40, 8, 14); blob(x, 54, 92, 8, 12, 'rgba(255,255,255,.25)'); },
    ember(x) { x.fillStyle = '#3a3a44'; x.fillRect(28, 50, 72, 70); x.fillRect(52, 8, 14, 46); x.fillStyle = '#22222a'; x.fillRect(40, 74, 48, 30); x.fillStyle = '#5a5a68'; x.fillRect(28, 50, 72, 8); x.fillStyle = '#b8e0f0'; x.fillRect(46, 104, 6, 12); x.fillRect(74, 104, 5, 10); },
    ripple(x) { x.fillStyle = '#8a8478'; x.fillRect(22, 70, 84, 50); x.fillStyle = '#6a655c'; for (let i = 0; i < 4; i++) x.fillRect(22 + i * 21, 70, 2, 50); x.fillRect(22, 92, 84, 2); x.fillStyle = '#5a3a1c'; x.fillRect(26, 22, 6, 50); x.fillRect(96, 22, 6, 50); x.fillRect(22, 18, 84, 8); blob(x, 64, 58, 12, 16, '#9ad4e8'); x.fillStyle = '#b08a50'; x.fillRect(59, 36, 10, 8); },
    whirl(x) { x.fillStyle = '#6a4424'; x.fillRect(58, 40, 12, 84); blob(x, 64, 40, 44, 30, '#3f8a3f'); x.fillStyle = '#e04848'; x.beginPath(); x.moveTo(64, 14); x.lineTo(88, 40); x.lineTo(64, 70); x.lineTo(40, 40); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(64, 70); x.quadraticCurveTo(90, 90, 70, 112); x.stroke(); },
    pebble(x) { x.fillStyle = '#8a8e86'; x.fillRect(34, 104, 60, 18); blob(x, 64, 78, 30, 26, '#9a9e94'); blob(x, 64, 44, 18, 18, '#9a9e94'); blob(x, 58, 42, 3, 3, '#4a4e48'); blob(x, 70, 42, 3, 3, '#4a4e48'); x.fillStyle = '#4a8a45'; x.fillRect(40, 96, 14, 5); x.fillRect(76, 70, 10, 5); },
    fizz(x) { x.fillStyle = '#8a5a3a'; x.fillRect(60, 50, 8, 74); x.fillStyle = '#b8e8f8'; x.beginPath(); x.moveTo(64, 6); x.lineTo(84, 34); x.lineTo(64, 60); x.lineTo(44, 34); x.fill(); x.strokeStyle = '#3a6a8a'; x.lineWidth = 2; x.beginPath(); x.moveTo(60, 14); x.lineTo(70, 32); x.lineTo(60, 44); x.stroke(); x.fillStyle = '#f4e04a'; x.fillRect(90, 20, 4, 10); x.fillRect(34, 40, 4, 8); },
    luna(x) { blob(x, 64, 104, 52, 16, '#6a6e68'); blob(x, 64, 102, 44, 12, '#8ab0e0'); blob(x, 64, 102, 14, 6, '#f4f4ff'); blob(x, 70, 100, 12, 6, '#8ab0e0'); },
  };
  const GATE = {
    thorns(x, w, h) { x.strokeStyle = '#3a5a2a'; x.lineWidth = 9; for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(8 + i * 24, h); x.bezierCurveTo(40 + i * 10, h * 0.6, i * 30, h * 0.4, 20 + i * 22, 14); x.stroke(); } x.fillStyle = '#a03a5a'; for (let i = 0; i < 9; i++) blob(x, 14 + i * 19, 40 + (i * 37) % 90, 6, 6, '#c84a6a'); },
    web(x, w, h) { x.strokeStyle = 'rgba(240,240,250,.9)'; x.lineWidth = 3; for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(w / 2, h / 2); x.lineTo(w / 2 + Math.cos(i * 0.63) * w, h / 2 + Math.sin(i * 0.63) * h); x.stroke(); } for (let r = 16; r < 100; r += 18) { x.beginPath(); x.arc(w / 2, h / 2, r, 0, 7); x.stroke(); } },
    stream(x, w, h) { blob(x, w / 2, h - 16, w * 0.48, 16, '#5a4a34'); blob(x, w / 2, h - 16, w * 0.4, 10, '#3a2e20'); for (let i = 0; i < 6; i++) blob(x, 30 + i * 26, h - 22 + (i % 2) * 8, 8, 5, '#8a8478'); },
    boulder(x, w, h) { blob(x, w / 2, h * 0.58, w * 0.44, h * 0.4, '#7c8078'); blob(x, w * 0.4, h * 0.44, w * 0.2, h * 0.14, '#9a9e94'); x.fillStyle = '#4a8a45'; x.fillRect(w * 0.3, h * 0.8, 30, 6); },
    mist(x, w, h) { for (let i = 0; i < 16; i++) blob(x, 20 + (i * 53) % (w - 40), 30 + (i * 31) % (h - 50), 44, 26, 'rgba(236,240,244,.55)'); },
    rune(x, w, h) { x.fillStyle = '#6e7268'; x.fillRect(16, 10, w - 32, h - 14); x.fillStyle = '#585c54'; x.fillRect(16, 10, 10, h - 14); x.fillRect(w - 26, 10, 10, h - 14); x.strokeStyle = '#3a3e38'; x.lineWidth = 5; x.beginPath(); x.arc(w / 2, h * 0.45, 24, 0, 7); x.moveTo(w / 2, h * 0.45 - 24); x.lineTo(w / 2 - 10, h * 0.45); x.lineTo(w / 2 + 10, h * 0.45); x.lineTo(w / 2, h * 0.45 + 24); x.stroke(); },
    barrier(x, w, h) { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(170,80,240,.25)'); g.addColorStop(0.5, 'rgba(210,140,255,.75)'); g.addColorStop(1, 'rgba(170,80,240,.25)'); x.fillStyle = g; x.fillRect(4, 0, w - 8, h); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(20 + (i * 47) % (w - 40), 20 + (i * 61) % (h - 40), 8 + (i % 3) * 5, 0, 7); x.stroke(); } },
  };
  const baseSprites = G.buildSprites;
  G.buildSprites = function (images) {
    baseSprites.apply(this, arguments);
    const S = G.SPR;
    G.TREE_SPR = ['oak', 'birch', 'pine', 'dark', 'oak', 'willow', 'birch', 'pine', 'oak', 'bare'].map((k, i) => tree(k, 11 + i * 7));
    G.BUSH_SPR = [bush(3), bush(9), bush(21)]; G.BUSH_TELL = bush(5, true);
    artSprites(); G.TREE_KIND = null;
    for (const id in G.SPIRITS) {
      S['fo_spirit_' + id] = spiritPic(id);
      S['fo_obj_' + id] = thing(128, 128, OBJ[id], 0.6, 0.6, 0);
    }
    artSpirits();
    for (const k in GATE) S['fo_gate_' + k] = thing(176, 176, GATE[k], 1.0, k === 'stream' ? 0.5 : 1.0, 0);
    artGates();
    S.fo_spiritstone = thing(128, 160, (x) => { x.fillStyle = '#8a8e96'; x.beginPath(); x.moveTo(40, 154); x.lineTo(46, 30); x.lineTo(64, 10); x.lineTo(82, 30); x.lineTo(88, 154); x.fill(); const cols = G.SPIRIT_ORDER.map((k) => G.SPIRITS[k].colour); cols.forEach((c, i) => blob(x, 64, 36 + i * 16, 6, 6, c)); }, 0.5, 0.62, 0);
    S.fo_signpost = thing(128, 160, (x) => { x.fillStyle = '#6a4424'; x.fillRect(58, 40, 12, 114); x.fillStyle = '#b08a50'; x.beginPath(); x.moveTo(20, 30); x.lineTo(96, 30); x.lineTo(114, 46); x.lineTo(96, 62); x.lineTo(20, 62); x.fill(); x.fillStyle = '#5a3a1c'; x.fillRect(30, 40, 54, 4); x.fillRect(30, 50, 40, 4); }, 0.5, 0.62, 0);
    S.fo_glowcap = thing(96, 96, (x) => { const g = x.createRadialGradient(48, 50, 4, 48, 50, 46); g.addColorStop(0, 'rgba(120,255,220,.7)'); g.addColorStop(1, 'rgba(120,255,220,0)'); x.fillStyle = g; x.fillRect(0, 0, 96, 96); x.fillStyle = '#e8f8f0'; x.fillRect(44, 54, 8, 34); blob(x, 48, 52, 24, 14, '#58e8c0'); x.fillStyle = '#e8f8f0'; x.fillRect(22, 70, 5, 18); blob(x, 24, 68, 12, 8, '#58e8c0'); }, 0.34, 0.34, 0);
    S.fo_glowcap.glowing = true;
    S.fo_berries = thing(128, 110, (x) => { leaves(x, rnd0(41), 64, 62, 50, 34, ['#2f7434', '#3f8a3f', '#357a3a'], 34); for (let i = 0; i < 12; i++) { const a = 24 + (i * 37) % 84, b = 36 + (i * 23) % 50; blob(x, a, b, 6, 6, i % 3 ? '#c8283a' : '#7a2ad0'); blob(x, a - 2, b - 2, 2, 2, '#ffd0d8'); } }, 0.7, 0.6, 0);
    artThings();
  };
  if (G.MONSTER_ART && G.MONSTER_ART.witch) G.MONSTER_ART.witch2 = G.MONSTER_ART.witch;   // round two: the same Wanda

  /* ---------- the forest's squares: paths, trees, hidden bush paths ---------- */
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >> 13)) * 1274126177; return (h ^ (h >> 16)) >>> 0; }
  G.bushKey = (x, y) => `bush@${G.mapId()}_${x}_${y}`;
  /* where two different floors meet (path and grass), the renderer lets one run into the other along a wobbly line:
     edge[i]: bits 1 west, 2 east, 4 north, 8 south = a different floor on that side; 16 = this square is path */
  function softEdges(w) {
    const n = w.cells.length, E = new Uint8Array(n), T = new Array(n).fill(null), fl = (i) => (w.cells[i] === 0 || w.cells[i] === 3) && w.theme[i] ? w.floorOv[i] || w.theme[i].floor : null;
    for (let y = 1; y < w.h - 1; y++) for (let x = 1; x < w.w - 1; x++) {
      const i = y * w.w + x, own = fl(i); if (!own) continue;
      [[i - 1, 1], [i + 1, 2], [i - w.w, 4], [i + w.w, 8]].forEach(([j, bit]) => { const o = fl(j); if (o && o !== own) { E[i] |= bit; T[i] = o; } });
      if (E[i] && w.floorOv[i]) E[i] |= 16;
    }
    w.edge = E; w.edgeTex = T;
  }
  G.forestWorld = function (w) {
    const L = G.LAYOUT, f = (G.state && G.state.flags) || {};
    w.treeAt = null; w.bush = null;
    if (!L.trees) return;
    w.bush = {}; for (const [x, y] of (L.bush || [])) { const i = y * w.w + x; if (f[G.bushKey(x, y)]) w.cells[i] = 0; else w.bush[i] = 1; }
    for (let i = 0; i < w.cells.length; i++) if (w.cells[i] === 0 && w.theme[i] && w.theme[i].pathFloor) w.floorOv[i] = w.theme[i].pathFloor;
    softEdges(w);
    const door = G.FOREST_SPOTS && G.FOREST_SPOTS.doorh;      // the Honey Hut: its faces are whole pictures with a roof (renderer.js facade)
    if (door && w.cells[door.y * w.w + door.x] === 2 && w.w > 30) {
      w.hut = { x0: door.x - 1, y0: door.y - 2, x1: door.x + 1, y1: door.y, nx: 3, ny: 3 }; w.facade = new Uint8Array(w.cells.length);
      for (let y = w.hut.y0; y <= w.hut.y1; y++) for (let x = w.hut.x0; x <= w.hut.x1; x++) w.facade[y * w.w + x] = 1;
    }
    w.treeAt = new Array(w.cells.length).fill(null);
    if (!G.TREE_SPR) return;
    const dusk = new Uint8Array(w.cells.length).fill(99), dq = [];    // how far each square is from the Mushroom Circle: its twilight trees thin out over a few squares
    for (let i = 0; i < w.cells.length; i++) if (w.theme[i] && w.theme[i].key === 'circle') { dusk[i] = 0; dq.push(i); }
    for (let h = 0; h < dq.length; h++) { const i = dq[h]; if (dusk[i] >= 7) continue; for (const j of [i - 1, i + 1, i - w.w, i + w.w]) if (j >= 0 && j < dusk.length && dusk[j] === 99) { dusk[j] = dusk[i] + 1; dq.push(j); } }
    const V = G.VERGE_SPR || [], D4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
      const i = y * w.w + x; if (w.cells[i] !== 3) continue;
      const h = hash(x, y, 5), j = (k) => (((h >> k) & 255) / 255 - 0.5), tell = !!w.bush[i], list = [];
      let key = w.theme[i] && w.theme[i].key;                 // the area this tree stands beside
      for (let d = 1; d <= 2 && !TREE_MIX[key]; d++) for (let b = -d; b <= d && !TREE_MIX[key]; b++) for (let a = -d; a <= d; a++) {
        const u = x + a, v = y + b; if (u < 0 || v < 0 || u >= w.w || v >= w.h) continue;
        const t = w.theme[v * w.w + u]; if (t && TREE_MIX[t.key]) { key = t.key; break; }
      }
      const CB = key === 'circle' && G.CBUSH_SPR && G.CBUSH_SPR.length ? G.CBUSH_SPR : null, BU = CB || G.BUSH_SPR;
      // a square next to a path gets a full bush in front; deep forest gets by with the tree and one bush
      if (!tell) list.push({ kind: 'tree', x, y, ox: j(0) * 0.36, oy: j(8) * 0.36, spr: pickTree(key !== 'circle' && dusk[i] < 8 && ((h >>> 3) & 255) / 255 > (dusk[i] - 1) / 7 ? 'circle' : key, h), scale: 0.85 + ((h >> 16) & 255) / 255 * 0.4 });
      list.push({ kind: 'tree', x, y, ox: j(4) * 0.3, oy: j(12) * 0.3, spr: tell ? G.BUSH_TELL : BU[(h >> 3) % BU.length], scale: tell ? 1.05 : 0.9 + ((h >> 20) & 15) / 60, tell });
      if (!tell && (h & 3) === 0) list.push({ kind: 'tree', x, y, ox: j(16) * 0.7, oy: j(20) * 0.7, spr: BU[h % BU.length], scale: 0.7 });
      /* the edges: low plants where this square meets a path, and tall growth (or a broken ruin end) where it meets a
         wall's end, so neither a path nor a wall stops in a straight cut */
      if (V.length >= 8) for (let d = 0; d < 4; d++) {
        const u = x + D4[d][0], v = y + D4[d][1]; if (u < 0 || v < 0 || u >= w.w || v >= w.h) continue;
        const c = w.cells[v * w.w + u], hd = hash(x * 4 + d, y, 31), r = (hd & 1023) / 1024, side = (((hd >> 10) & 255) / 255 - 0.5) * 0.5;
        const at = (k, sp, sc) => list.push({ kind: 'tree', x, y, ox: D4[d][0] * k + (D4[d][0] ? 0 : side), oy: D4[d][1] * k + (D4[d][1] ? 0 : side), spr: sp, scale: sc });
        if (c === 0 && !tell) { if (r < 0.62) at(0.47, CB ? CB[(hd >> 18) & 3] : V[(hd >> 18) & 3], CB ? 0.42 : 0.9 + ((hd >> 20) & 7) / 20); else if (r < 0.68) at(0.4, V[7], 1); }
        else if (c === 1 && !(w.facade && w.facade[v * w.w + u]) && D4.some(([a, b]) => w.cells[(y + b) * w.w + x + a] === 0 || w.cells[(v + b) * w.w + u + a] === 0))
          at(0.4, key === 'ruins' ? V[6] : V[4 + ((hd >> 18) & 1)], 0.95 + ((hd >> 20) & 7) / 30);
      }
      w.treeAt[i] = list;
    }
  };
  const near = [];
  G.nearTrees = function (w, px, py) {
    near.length = 0;
    const cx = px | 0, cy = py | 0, R = 9, now = performance.now();
    for (let y = Math.max(0, cy - R); y <= Math.min(w.h - 1, cy + R); y++) for (let x = Math.max(0, cx - R); x <= Math.min(w.w - 1, cx + R); x++) {
      const l = w.treeAt[y * w.w + x]; if (!l) continue;
      for (const t of l) { if (t.tell) t.shakeX = Math.sin(now / 90 + x) * (Math.sin(now / 1300 + y) > 0.55 ? 2.2 : 0); near.push(t); }   // a hiding bush rustles now and then
    }
    return near;
  };

  /* ---------- the partner, floating in the corner of the view ---------- */
  G.renderPartner = function () {
    let box = ui.$('partner');
    if (!box) { box = ui.el('div'); box.id = 'partner'; box.innerHTML = '<canvas width="96" height="96"></canvas><span></span>'; ui.$('viewport').appendChild(box); }
    const s = G.state, id = s && s.partner, S = id && G.SPIRITS[id];
    box.classList.toggle('hidden', !S || G.screen !== 'game');
    if (!S) return;
    const c = box.querySelector('canvas'), x = c.getContext('2d'), p = G.SPR['fo_spirit_' + id];
    x.clearRect(0, 0, 96, 96); if (p) x.drawImage(p.c, 0, 0, 96, 96);
    box.querySelector('span').textContent = S.name; box.style.setProperty('--pc', S.colour);
  };

  /* ---------- the world map: the trip between the castle and the forest ---------- */
  const PLACES = { castle: { x: 381, y: 553, name: 'Moonstone Castle' }, forest: { x: 694, y: 329, name: 'The Whispering Wood' } };   // where they are on the map picture
  function drawStandIn(x, W, H, R) {                         // the map drawn in code, until the picture has loaded
    x.fillStyle = '#e9d6a8'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${150 + R() * 40},${110 + R() * 30},${60 + R() * 20},${0.05 + R() * 0.07})`; x.fillRect(R() * W, R() * H, 2 + R() * 28, 1 + R() * 3); }
    const e = x.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 760); e.addColorStop(0, 'rgba(120,80,30,0)'); e.addColorStop(1, 'rgba(90,55,20,.5)'); x.fillStyle = e; x.fillRect(0, 0, W, H);
    const ink = '#5a3a1c';
    x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 3; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(0, 690); x.bezierCurveTo(200, 640, 300, 720, 520, 690); x.bezierCurveTo(700, 660, 900, 730, 1280, 680); x.stroke();   // a river
    for (const [mx, my, s] of [[1110, 130, 1.5], [1030, 170, 1], [1190, 180, 1.1]]) {             // the Dragon's mountain, far away
      x.beginPath(); x.moveTo(mx - 70 * s, my + 70 * s); x.lineTo(mx, my - 50 * s); x.lineTo(mx + 70 * s, my + 70 * s); x.stroke();
      x.beginPath(); x.moveTo(mx - 20 * s, my - 14 * s); x.lineTo(mx - 6 * s, my - 4 * s); x.lineTo(mx + 6 * s, my - 16 * s); x.lineTo(mx + 20 * s, my - 14 * s); x.stroke();
    }
    x.font = '600 22px Fredoka, sans-serif'; x.textAlign = 'center';
    x.fillText("The Dragon's Mountain", 1110, 280);
    for (let i = 0; i < 70; i++) {                                                              // the forest: tree stamps
      const a = R() * 6.28, d = Math.sqrt(R()), tx = 700 + Math.cos(a) * 210 * d, ty = 330 + Math.sin(a) * 120 * d;
      if (Math.hypot(tx - 700, ty - 330) < 34) continue;
      x.fillStyle = '#7a9a5a'; x.beginPath(); x.arc(tx, ty - 8, 13, 0, 7); x.fill(); x.strokeStyle = ink; x.lineWidth = 2; x.stroke(); x.fillStyle = ink; x.fillRect(tx - 2, ty + 4, 4, 9);
    }
    const c = PLACES.castle;                                                                    // the castle
    x.fillStyle = '#cdb890'; x.strokeStyle = ink; x.lineWidth = 3;
    for (const [dx, w, h] of [[-52, 26, 70], [26, 26, 70], [-26, 52, 46], [-10, 20, 90]]) { x.fillRect(c.x + dx, c.y - h + 20, w, h); x.strokeRect(c.x + dx, c.y - h + 20, w, h); }
    for (const dx of [-39, 39, 0]) { x.beginPath(); x.moveTo(c.x + dx - 16, c.y - (dx ? 50 : 70)); x.lineTo(c.x + dx, c.y - (dx ? 78 : 100)); x.lineTo(c.x + dx + 16, c.y - (dx ? 50 : 70)); x.closePath(); x.fillStyle = '#8a5ab8'; x.fill(); x.stroke(); }
    x.fillStyle = ink; x.fillText(PLACES.castle.name, c.x, c.y + 54); x.fillText(PLACES.forest.name, 700, 492);
  }
  function drawWorld(x, k, from, to) {                        // k: how much of the dotted path is drawn (0..1)
    const W = 1280, H = 800, R = rnd0(4);
    const pic = G.WORLD_PIC, ink = '#5a3a1c', c = PLACES.castle;
    if (pic) {                                                 // the painted map: only the names are written on it
      x.imageSmoothingEnabled = false; x.drawImage(pic, 0, 0, W, H);
      x.font = '600 24px Fredoka, sans-serif'; x.textAlign = 'center'; x.lineJoin = 'round'; x.lineWidth = 5; x.strokeStyle = 'rgba(244,228,180,.9)'; x.fillStyle = ink;
      for (const [t, a, b] of [["The Dragon's Mountain", 1105, 292], [c.name, c.x - 26, c.y + 100], [PLACES.forest.name, 694, 486]]) { x.strokeText(t, a, b); x.fillText(t, a, b); }
    } else drawStandIn(x, W, H, R);
    const A = PLACES[from], B = PLACES[to], P = (t) => { const u = 1 - t, mx = (A.x + B.x) / 2 - 90, my = (A.y + B.y) / 2 - 40; return [u * u * A.x + 2 * u * t * mx + t * t * B.x, u * u * (A.y - 30) + 2 * u * t * my + t * t * B.y]; };
    const mark = (p, t) => { if (t <= 0) return; x.strokeStyle = '#c8322a'; x.lineWidth = 7 * Math.min(1, t * 2); x.lineCap = 'round'; x.beginPath(); x.moveTo(p[0] - 14, p[1] - 14); x.lineTo(p[0] + 14, p[1] + 14); x.moveTo(p[0] + 14, p[1] - 14); x.lineTo(p[0] - 14, p[1] + 14); x.stroke(); };
    mark(P(0), 1);
    x.fillStyle = '#c8322a'; for (let i = 1; i < 26; i++) { const t = i / 26; if (t > k) break; const p = P(t); x.beginPath(); x.arc(p[0], p[1], 4.5, 0, 7); x.fill(); }
    mark(P(1), (k - 0.96) * 25);
    return P(1);
  }
  G.worldTrip = function (from, to, done) {
    G.lockInput = true;
    let box = ui.$('worldMap');
    if (!box) { box = ui.el('div'); box.id = 'worldMap'; box.innerHTML = '<canvas width="1280" height="800"></canvas>'; ui.$('app').appendChild(box); }
    const c = box.querySelector('canvas'), x = c.getContext('2d'), t0 = performance.now(), DRAW = 2600, HOLD = 600, ZOOM = 1300;
    c.style.transition = 'none'; c.style.transform = 'none'; c.style.opacity = 1; box.className = 'show';
    let end = null, zoomed = false;
    (function step() {
      const t = performance.now() - t0, k = Math.min(1, t / DRAW);
      end = drawWorld(x, k < 0.15 ? 0 : (k - 0.15) / 0.85, from, to);
      if (k > 0.15 && k < 1 && ((t / 150) | 0) % 2 === 0 && G.audio.stepOn) { if (!step.last || t - step.last > 290) { step.last = t; G.audio.stepOn('grass'); } }
      if (t > DRAW + HOLD && !zoomed) {                       // zoom in onto the X, and through it into the place
        zoomed = true; if (G.audio.whoosh) G.audio.whoosh();
        c.style.transformOrigin = `${end[0]}px ${end[1]}px`; c.style.transition = `transform ${ZOOM}ms cubic-bezier(.5,0,.9,.5), opacity ${ZOOM}ms ease-in`;
        c.style.transform = 'scale(7)'; c.style.opacity = 0;
        setTimeout(() => { done(); box.className = ''; G.lockInput = false; }, ZOOM);
        return;
      }
      requestAnimationFrame(step);
    })();
  };
})();
