/* Procedural 64x64 textures for walls, floors, ceilings and doors.
   Replace any of these later with artist PNGs by loading them into the same Uint32Array format. */
(function () {
  const S = 64;
  G.TEX_SIZE = 128;   // what the renderer draws; procedural textures are made at S=64 and doubled
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
  const pack = (r, g, b) => (0xff000000 | (clamp(b) << 16) | (clamp(g) << 8) | clamp(r)) >>> 0;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  function tex() { return new Uint32Array(S * S); }
  function fill(t, c, n = 10) {
    for (let i = 0; i < S * S; i++) { const k = (rnd() - 0.5) * n; t[i] = pack(c[0] + k, c[1] + k, c[2] + k); }
    return t;
  }
  function px(t, x, y, c, n = 0) {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const k = n ? (rnd() - 0.5) * n : 0;
    t[(y | 0) * S + (x | 0)] = pack(c[0] + k, c[1] + k, c[2] + k);
  }
  function rect(t, x0, y0, w, h, c, n = 0) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(t, x, y, c, n); }
  function circle(t, cx, cy, r, c, n = 0) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) px(t, cx + x, cy + y, c, n);
  }
  function shade(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }

  /* --- base patterns --- */
  function bricks(base, mortar, bh = 8, bw = 16, n = 14) {
    const t = tex(); const b = hex(base), m = hex(mortar);
    for (let row = 0; row < S / bh; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < S / bw + 1; col++) {
        const v = 0.85 + rnd() * 0.3; const c = shade(b, v);
        rect(t, col * bw + off, row * bh, bw, bh, c, n);
      }
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const row = (y / bh) | 0, off = row % 2 ? bw / 2 : 0;
      if (y % bh === 0 || ((x + off) % bw) === 0) px(t, x, y, m, 8);
      else if (y % bh === 1) { const i = y * S + x; t[i] = blend(t[i], [255, 255, 255], 0.12); }
    }
    return t;
  }
  function stones(base, mortar) {
    const t = tex(); const b = hex(base), m = hex(mortar);
    fill(t, m, 8);
    const rows = [0, 14, 30, 46, 64];
    for (let r = 0; r < 4; r++) {
      let x = (r % 2) * -10;
      while (x < S) {
        const w = 14 + ((rnd() * 14) | 0); const c = shade(b, 0.8 + rnd() * 0.35);
        rect(t, x + 1, rows[r] + 1, w - 2, rows[r + 1] - rows[r] - 2, c, 16);
        for (let i = 0; i < w - 3; i++) px(t, x + 2 + i, rows[r] + 1, shade(c, 1.25), 6);
        x += w;
      }
    }
    return t;
  }
  function tiles(c1, c2, size = 16, grout = '#2a2a2a', checker = true) {
    const t = tex(); const a = hex(c1), b = hex(c2), g = hex(grout);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const odd = checker ? (((x / size) | 0) + ((y / size) | 0)) % 2 : 0;
      const c = odd ? b : a;
      if (x % size === 0 || y % size === 0) px(t, x, y, g, 6); else px(t, x, y, c, 8);
    }
    return t;
  }
  function planks(base, dark, vertical = false, pw = 11) {
    const t = tex(); const b = hex(base), d = hex(dark);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = vertical ? x : y, v = vertical ? y : x;
      const plank = (u / pw) | 0;
      const grain = Math.sin(v * 0.35 + plank * 7) * 8 + Math.sin(v * 1.7 + plank) * 4;
      if (u % pw === 0) px(t, x, y, d, 6);
      else px(t, x, y, [b[0] + grain, b[1] + grain * 0.8, b[2] + grain * 0.6], 6);
    }
    for (let p = 0; p < 6; p++) { const u = ((rnd() * S) | 0), v = ((rnd() * S) | 0); vertical ? px(t, u, v, d) : px(t, v, u, d); }
    return t;
  }
  function wallpaper(base, accent, motif = 'stripe') {
    const t = fill(tex(), hex(base), 6); const a = hex(accent);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (motif === 'stripe' && (x % 16 < 3)) px(t, x, y, a, 6);
      if (motif === 'diamond' && (Math.abs((x % 16) - 8) + Math.abs((y % 16) - 8) === 6)) px(t, x, y, a, 6);
      if (motif === 'dots' && ((x + ((y / 16 | 0) % 2) * 8) % 16 - 8) ** 2 + ((y % 16) - 8) ** 2 < 6) px(t, x, y, a, 6);
    }
    if (motif === 'stars') for (let i = 0; i < 6; i++) star(t, 8 + (i % 3) * 22, 12 + ((i / 3) | 0) * 32, 4, a);
    rect(t, 0, 52, S, 2, shade(a, 0.7)); rect(t, 0, 54, S, 10, shade(hex(base), 0.6), 8);
    return t;
  }
  function star(t, cx, cy, r, c) {
    for (let i = -r; i <= r; i++) { px(t, cx + i, cy, c); px(t, cx, cy + i, c); }
    px(t, cx - 1, cy - 1, c); px(t, cx + 1, cy + 1, c); px(t, cx - 1, cy + 1, c); px(t, cx + 1, cy - 1, c);
  }
  function noise(base, n = 30, specks = null) {
    const t = fill(tex(), hex(base), n);
    if (specks) for (let i = 0; i < 90; i++) px(t, rnd() * S, rnd() * S, hex(specks[(rnd() * specks.length) | 0]), 20);
    return t;
  }
  function grass() {
    const t = noise('#2f6b34', 34, ['#3f8a3f', '#245627', '#4c9c48']);
    for (let i = 0; i < 40; i++) { const x = rnd() * S, y = rnd() * S; px(t, x, y, [80, 160, 70]); px(t, x, y - 1, [90, 175, 80]); }
    return t;
  }
  function carpet(base, border) {
    const t = noise(base, 14); const b = hex(border);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (((x + y) % 16 === 0) || ((x - y + 64) % 16 === 0)) px(t, x, y, shade(hex(base), 1.25), 8);
    }
    rect(t, 0, 0, S, 3, b, 8); rect(t, 0, 61, S, 3, b, 8);
    return t;
  }
  function blend(c32, rgb, a) {
    const r = c32 & 255, g = (c32 >> 8) & 255, b = (c32 >> 16) & 255;
    return pack(r + (rgb[0] - r) * a, g + (rgb[1] - g) * a, b + (rgb[2] - b) * a);
  }
  function copy(t) { return new Uint32Array(t); }

  /* --- decorations painted on top of a base wall --- */
  function torch(t) {
    const out = copy(t);
    rect(out, 29, 30, 6, 16, [70, 45, 25], 10); rect(out, 26, 28, 12, 3, [110, 110, 120], 6);
    circle(out, 32, 22, 6, [255, 150, 40], 20); circle(out, 32, 20, 4, [255, 220, 90], 10); circle(out, 32, 19, 2, [255, 255, 200]);
    for (let y = 8; y < 44; y++) for (let x = 14; x < 50; x++) {
      const d = Math.hypot(x - 32, y - 22); if (d < 18) { const i = y * S + x; out[i] = blend(out[i], [255, 190, 90], (1 - d / 18) * 0.3); }
    }
    return out;
  }
  function banner(t, col, emblem) {
    const out = copy(t); const c = hex(col);
    rect(out, 20, 4, 24, 3, [90, 70, 40]);
    for (let y = 7; y < 50; y++) for (let x = 22; x < 42; x++) {
      const cut = y > 42 && Math.abs(x - 32) < (y - 42) * 1.3; if (!cut) px(out, x, y, shade(c, 0.85 + 0.15 * Math.sin(x * 0.6)), 8);
    }
    const e = hex(emblem); circle(out, 32, 22, 5, e, 6); star(out, 32, 33, 3, e);
    return out;
  }
  function painting(t, frame, sky, thing) {
    const out = copy(t); const f = hex(frame);
    rect(out, 12, 10, 40, 32, f, 10); rect(out, 15, 13, 34, 26, hex(sky), 10);
    rect(out, 15, 30, 34, 9, [70, 110, 60], 10);
    if (thing === 'face') { circle(out, 32, 24, 7, [240, 200, 160]); px(out, 29, 23, [0, 0, 0]); px(out, 35, 23, [0, 0, 0]); rect(out, 29, 27, 7, 1, [150, 40, 40]); rect(out, 26, 15, 13, 3, [230, 200, 60]); }
    else if (thing === 'castle') { rect(out, 24, 20, 16, 12, [120, 120, 140]); rect(out, 22, 16, 4, 16, [100, 100, 120]); rect(out, 38, 16, 4, 16, [100, 100, 120]); }
    else { circle(out, 40, 20, 4, [255, 240, 160]); }
    return out;
  }
  function windowTex(t) {
    const out = copy(t);
    rect(out, 18, 8, 28, 36, [60, 50, 40]); rect(out, 20, 10, 24, 32, [30, 40, 90], 10);
    circle(out, 38, 18, 4, [255, 245, 190]); for (let i = 0; i < 5; i++) px(out, 22 + rnd() * 20, 12 + rnd() * 26, [255, 255, 220]);
    rect(out, 31, 10, 2, 32, [60, 50, 40]); rect(out, 20, 25, 24, 2, [60, 50, 40]);
    return out;
  }
  function shelf(t, items) {
    const out = copy(t);
    for (const sy of [22, 44]) {
      rect(out, 6, sy, 52, 3, [100, 65, 35], 8);
      let x = 8;
      while (x < 54) {
        const it = items[(rnd() * items.length) | 0]; const c = hex(it.c);
        if (it.k === 'jar') { rect(out, x, sy - 9, 6, 9, c, 10); rect(out, x + 1, sy - 11, 4, 2, [200, 200, 200]); x += 9; }
        else if (it.k === 'round') { circle(out, x + 4, sy - 5, 4, c, 10); x += 10; }
        else { rect(out, x, sy - 6, 9, 6, c, 10); x += 12; }
      }
    }
    return out;
  }
  function bookshelf() {
    const t = planks('#6b4426', '#3b2412', true, 32); const cols = ['#b0413e', '#3e6db0', '#4fa35a', '#c9a13b', '#7d4fb0', '#d07a3a', '#e6e0c8'];
    for (const sy of [2, 23, 44]) {
      let x = 3;
      while (x < 61) {
        const w = 2 + ((rnd() * 3) | 0), h = 13 + ((rnd() * 5) | 0); const c = hex(cols[(rnd() * cols.length) | 0]);
        rect(t, x, sy + 18 - h, w, h, c, 14); px(t, x, sy + 20 - h, [240, 230, 180]); x += w + 1;
      }
      rect(t, 0, sy + 18, S, 3, [60, 35, 16], 8);
    }
    // cobwebs in corners
    for (let i = 0; i < 14; i++) { px(t, i, i, [220, 220, 230]); px(t, i, 0, [220, 220, 230]); px(t, 0, i, [220, 220, 230]); px(t, S - 1 - i, i, [220, 220, 230]); }
    return t;
  }
  function glass() {
    const t = tex();
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const frame = x % 21 < 2 || y % 21 < 2;
      if (frame) px(t, x, y, [60, 80, 60], 8);
      else px(t, x, y, [40 + y * 0.4, 70 + y * 0.6, 90 + y * 0.3], 8);
    }
    for (let i = 0; i < 26; i++) { const x = rnd() * S, y = 30 + rnd() * 34; circle(t, x, y, 2 + ((rnd() * 3) | 0), [50 + rnd() * 40, 130 + rnd() * 60, 50], 14); }
    for (let i = 0; i < 8; i++) px(t, rnd() * S, rnd() * 25, [255, 255, 230]);
    return t;
  }
  function door(kind) {
    let t;
    if (kind === 'wood') {
      t = planks('#7a4b25', '#3e230e', true, 10);
      rect(t, 0, 0, 4, S, [60, 60, 66], 6); rect(t, 60, 0, 4, S, [60, 60, 66], 6); rect(t, 0, 0, S, 4, [60, 60, 66], 6);
      for (const y of [14, 46]) rect(t, 4, y, 56, 4, [40, 40, 44], 6);
      circle(t, 50, 32, 3, [210, 180, 60]);
    } else if (kind === 'rune') {
      t = stones('#4b3d6b', '#2a2040');
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = Math.hypot(x - 32, y - 32); if (Math.abs(d - 18) < 1.5 || Math.abs(d - 10) < 1) px(t, x, y, [200, 120, 255], 20);
      }
      star(t, 32, 32, 6, [255, 200, 255]); star(t, 32, 14, 2, [220, 150, 255]); star(t, 50, 32, 2, [220, 150, 255]); star(t, 14, 32, 2, [220, 150, 255]); star(t, 32, 50, 2, [220, 150, 255]);
    } else if (kind === 'moon') {
      t = tiles('#5a6a9a', '#4a5a8a', 32, '#2a3050');
      circle(t, 32, 26, 12, [235, 235, 255], 10); circle(t, 37, 23, 11, [74, 90, 138], 6);
      for (let i = 0; i < 3; i++) { circle(t, 16 + i * 16, 50, 4, [30, 30, 50]); rect(t, 15 + i * 16, 50, 3, 7, [30, 30, 50]); }
    } else { // gate
      t = planks('#5a3518', '#2e1a0a', true, 9);
      for (let x = 4; x < S; x += 12) rect(t, x, 0, 3, S, [70, 70, 80], 10);
      for (let y = 6; y < S; y += 14) rect(t, 0, y, S, 3, [70, 70, 80], 10);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = Math.hypot(x - 32, y - 32); if (d < 7) px(t, x, y, [180, 80, 240], 30); if (d < 3) px(t, x, y, [250, 200, 255]);
      }
    }
    return t;
  }
  function skyTex() { // 512x64 panorama for outdoor ceilings
    const w = 512, h = 112, t = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const f = y / h; t[y * w + x] = pack(20 + 40 * f, 16 + 22 * f, 48 + 50 * f);
    }
    for (let i = 0; i < 160; i++) { const x = (rnd() * w) | 0, y = (rnd() * h * 0.8) | 0; const b = 160 + rnd() * 95; t[y * w + x] = pack(b, b, b + 20); }
    for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) {
      const d = Math.hypot(x, y); if (d < 9) t[(30 + y) * w + 200 + x] = pack(255, 245, 200); else if (d < 11) t[(30 + y) * w + 200 + x] = pack(150, 140, 120);
    }
    return { data: t, w, h };
  }

  /* --- themes: walls[0] is the plain wall, others are variants placed around the room --- */
  function build() {
    const T = {};
    const hallBase = bricks('#77738a', '#3e3b4a');
    T.hallway = { walls: [hallBase, torch(hallBase), banner(hallBase, '#7a2f8f', '#f2c94c'), hallBase, painting(hallBase, '#b8913a', '#7aa7d6', 'face')], floor: tiles('#6f6a75', '#625d6a', 16, '#3f3b45'), ceil: planks('#3a2a1c', '#22160c', false, 16) };
    const hb = stones('#8a8496', '#3e3a48');
    T.hall = { walls: [hb, torch(hb), banner(hb, '#2f6a8f', '#f2c94c'), banner(hb, '#8f2f3a', '#f2e6c0'), windowTex(hb)], floor: tiles('#9a8f7a', '#6a604e', 16, '#3d362b'), ceil: planks('#3a2a1c', '#22160c', false, 16) };
    const ob = stones('#6e6a80', '#2f2c3a');
    T.outside = { walls: [ob, ob, torch(ob)], floor: grass(), ceil: null, sky: true };
    const kb = bricks('#b5683f', '#5a2f1a', 8, 16);
    T.kitchen = { walls: [kb, shelf(kb, [{ k: 'round', c: '#9a9aa8' }, { k: 'jar', c: '#e0b040' }, { k: 'box', c: '#7a4b25' }]), torch(kb), shelf(kb, [{ k: 'round', c: '#e8c547' }, { k: 'jar', c: '#c04040' }])], floor: tiles('#e8e2d0', '#b8423a', 16, '#5a4a3a'), ceil: planks('#4a3220', '#2a1a0c', false, 16) };
    const cb = stones('#5e5648', '#2c271e');
    T.cellar = { walls: [cb, shelf(cb, [{ k: 'round', c: '#f2c94c' }, { k: 'round', c: '#e8b030' }]), torch(cb)], floor: noise('#5a4a36', 24, ['#4a3a26', '#6a5a46']), ceil: stones('#3e3a30', '#221e16') };
    const db = planks('#8a5a32', '#4a2c14', true, 16);
    T.dining = { walls: [db, banner(db, '#a03030', '#f2c94c'), torch(db), painting(db, '#c9a13b', '#d6a77a', 'castle')], floor: planks('#a0703e', '#5a3a1a', false, 12), ceil: planks('#3a2a1c', '#22160c', false, 16) };
    const gb = wallpaper('#3f5e4a', '#2f4a3a', 'diamond');
    T.gallery = { walls: [painting(gb, '#c9a13b', '#7aa7d6', 'face'), painting(gb, '#8a5a32', '#d6c07a', 'castle'), painting(gb, '#c9a13b', '#a07ad6', 'face'), painting(gb, '#c0c0c0', '#304070', 'moon'), gb], floor: planks('#7a4b25', '#3e230e', false, 10), ceil: planks('#3a2a1c', '#22160c', false, 16) };
    const lb = bookshelf();
    T.library = { walls: [lb, lb, torch(stones('#6a5a4a', '#2e261c'))], floor: carpet('#7a2626', '#c9a13b'), ceil: planks('#3a2a1c', '#22160c', false, 16) };
    const gl = glass();
    T.greenhouse = { walls: [gl, gl], floor: noise('#4a3a22', 26, ['#3a6a2a', '#5a8a3a', '#2e2214']), ceil: glass() };
    const bt = tiles('#7ec4e0', '#5aa8cc', 8, '#e8f4f8');
    T.bathroom = { walls: [bt, windowTex(bt), bt], floor: tiles('#f4f4f8', '#d8e8f0', 16, '#9ab0c0'), ceil: tiles('#d0e8f0', '#c0d8e8', 32, '#a0b8c8') };
    const bw = wallpaper('#4a2c6a', '#d4af37', 'diamond');
    T.ballroom = { walls: [bw, torch(bw), windowTex(bw), banner(bw, '#d4af37', '#4a2c6a')], floor: tiles('#f0f0f0', '#202028', 16, '#808080'), ceil: tiles('#3a2450', '#30203f', 32, '#d4af37') };
    const yb = wallpaper('#f2b8c6', '#8fd0f0', 'dots');
    T.toyroom = { walls: [yb, shelf(yb, [{ k: 'box', c: '#e04040' }, { k: 'round', c: '#40a0e0' }, { k: 'box', c: '#f0c040' }]), yb], floor: tiles('#f0c040', '#60b0e0', 16, '#e06080'), ceil: tiles('#f8e0f0', '#f0d0e8', 32, '#e0b0d0') };
    const bb = wallpaper('#24305a', '#f2e08a', 'stars');
    T.bedroom = { walls: [bb, windowTex(bb), bb, painting(bb, '#c9a13b', '#7aa7d6', 'castle')], floor: carpet('#5a3a7a', '#f2e08a'), ceil: wallpaper('#1c2448', '#f2e08a', 'stars') };
    const sb = bricks('#4a3a34', '#1e1410', 8, 16);
    T.smithy = { walls: [sb, shelf(sb, [{ k: 'round', c: '#8a8a90' }, { k: 'box', c: '#5a5a60' }]), torch(sb)], floor: stones('#4a4440', '#1e1a18'), ceil: stones('#2e2622', '#141010') };
    const ab = stones('#3e6a5a', '#1e3a30');
    T.lab = { walls: [shelf(ab, [{ k: 'jar', c: '#40e080' }, { k: 'jar', c: '#e040c0' }, { k: 'jar', c: '#40a0ff' }, { k: 'round', c: '#f0e040' }]), ab, torch(ab), shelf(ab, [{ k: 'jar', c: '#ff8040' }, { k: 'jar', c: '#80ff40' }])], floor: tiles('#3a4a44', '#2e3e38', 16, '#1a2622'), ceil: stones('#2a3a34', '#121c18') };
    const st = stones('#6a6a7a', '#2e2e3a');
    T.stairs = { walls: [st, torch(st)], floor: stones('#5a5a68', '#2a2a34'), ceil: stones('#3a3a46', '#1a1a22') };
    const tw = stones('#5a3a7a', '#241434');
    T.vault = { walls: [stones('#b8905a', '#6a4a2a')], floor: tiles('#c09a68', '#a8865a', 16, '#6a4a2a'), ceil: stones('#2e2622', '#141010') };   // painted art replaces this
    T.tower = { walls: [tw, windowTex(tw), torch(tw)], floor: tiles('#4a2a6a', '#3a1a5a', 16, '#c080ff'), ceil: stones('#3a2050', '#1a0c28') };

    // the engine draws 128x128 textures; these code-drawn ones are 64x64, so double them (crisp, nearest neighbour)
    const up = (t) => { const o = new Uint32Array(G.TEX_SIZE * G.TEX_SIZE);
      for (let y = 0; y < G.TEX_SIZE; y++) for (let x = 0; x < G.TEX_SIZE; x++) o[y * G.TEX_SIZE + x] = t[(y >> 1) * S + (x >> 1)]; return o; };
    for (const k in T) { const th = T[k]; th.walls = th.walls.map(up); if (th.floor) th.floor = up(th.floor); if (th.ceil) th.ceil = up(th.ceil); }
    G.TEX = T;
    G.DOOR_TEX = { d: up(door('wood')), r: up(door('rune')), m: up(door('moon')), g: up(door('gate')) };
    G.DOOR_TEX.l = G.DOOR_TEX.d;                          // ladder up: replaced by the painted ladder wall (vaultArt.js)
    G.SKY = skyTex();
  }
  G.buildTextures = build;
})();
