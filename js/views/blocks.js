/* VIEW + MODEL — Room furniture you walk round (castle.js LAYOUT.blocks): pillars, waist-high things you can see over
   (a counter, a planter, the stage) and big things that cover several squares (the giant bed, the feast table).
   Each block is a box standing on the floor: [kind, x0, y0, x1, y1] covers squares x0..x1, y0..y1, and G.BLOCK_KINDS
   says how tall it is, how far its sides sit in from the edges of the squares, and its pictures:
     side / end   the long sides and the short ends (an end picture is optional)
     top          what you see from above (only for things lower than your eyes)
     span         the pictures stretch over the whole thing (the bed's quilt, the table's food) instead of repeating
     edge         a thin board along one edge of the squares (the bed's headboard: 'n', 'e', 's', 'w')
   The renderer (renderer.js) draws them in 3D: things behind a low block show above it, and things standing on it
   (Big Barry in his bed, the music box on the stage) stand on its top. You cannot walk onto a block; walking into one
   that has someone or something on it talks to them (movement.js).
   Rugs (LAYOUT.rugs) are floor pictures over several squares, made here too.
   Their pictures come from art sheets (blockArt.js, made by tools-src/prepare_blocks.py) under the same names as the
   ones painted here in code (PAINT): a picture that has art uses it, the rest stay painted. */
(function () {
  const TW = 64;
  G.BLOCK_KINDS = {
    pillar:    { h: 1, inset: 0.3, pillar: 'stone', say: 'A big stone pillar.' },
    marble:    { h: 1, inset: 0.29, pillar: 'cream', say: 'A shiny marble pillar.' },
    plinth:    { h: 0.4, inset: 0.27, side: 'marble', top: 'marble-top', span: 'both', say: 'A marble stand. Do not touch the art!' },
    table:     { h: 0.31, inset: 0.1, side: 'cloth', end: 'cloth-end', top: 'feast', span: 'both', say: 'The long feast table. Walk round it!' },
    bed:       { h: 0.4, inset: 0.05, side: 'quilt', top: 'quilt-top', span: 'both', say: 'The giant bed. Shhh... tiptoe round it!' },
    headboard: { h: 0.95, inset: 0.03, edge: 'n', thick: 0.13, side: 'headboard', end: 'wood', span: 'side' },
    footboard: { h: 0.52, inset: 0.03, edge: 's', thick: 0.09, side: 'footboard', end: 'wood', span: 'side' },
    counter:   { h: 0.44, inset: 0.08, side: 'cupboard', rep: 2, top: 'butcher', say: 'The cooking island. Mind the hot pots!' },
    stage:     { h: 0.24, inset: 0, side: 'stage', rep: 3, top: 'boards', say: 'The little stage. No dancing on it, please!' },
    planter:   { h: 0.3, inset: 0.16, side: 'planter', rep: 2.5, top: 'soil', span: 'top', say: 'A planter full of flowers.' },
    pond:      { h: 0.07, inset: 0.06, side: 'rim', rep: 3, top: 'water', span: 'top', say: 'A lily pond. Frogs only!' },
    platform:  { h: 0.13, inset: 0.03, side: 'tiles', top: 'tiles-top', repTop: 0.5, say: 'The royal bath stands up on its own tiled step.' },
    halfwall:  { h: 0.46, inset: [0.36, 0, 0.36, 0], side: 'tiles-wall', top: 'tiles-top', repTop: 0.5, say: 'A little wall, so the royal potty is private!' },
    playtable: { h: 0.3, inset: 0.08, side: 'painted', rep: 1.5, top: 'felt', span: 'top', say: 'A play table with a toy castle on it.' },
    bench:     { h: 0.36, inset: 0.12, side: 'workbench', rep: 2, top: 'workbench-top', say: 'A workbench full of tools.' },
  };

  /* ---------- painting helpers ---------- */
  function rnd0(seed) { let s = seed >>> 0 || 1; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9 >>> 0) / 4294967296); }
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const sh = (c, k) => { const [r, g, b] = hex(c), f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); return `rgb(${f(r)},${f(g)},${f(b)})`; };
  function make(w, h, paint, seed) {
    const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false;
    const R = rnd0(seed || 7);
    const P = { x, w: c.width, h: c.height, r: R,
      rect: (X, Y, W, H, col) => { x.fillStyle = col; x.fillRect(X | 0, Y | 0, Math.max(1, W | 0), Math.max(1, H | 0)); },
      dot: (X, Y, col) => { x.fillStyle = col; x.fillRect(X | 0, Y | 0, 1, 1); },
      circ: (X, Y, rr, col) => { x.fillStyle = col; for (let dy = -rr; dy <= rr; dy++) { const dx = Math.round(Math.sqrt(rr * rr - dy * dy)); x.fillRect((X - dx) | 0, (Y + dy) | 0, dx * 2 + 1, 1); } },
      ell: (X, Y, rx, ry, col) => { x.fillStyle = col; for (let dy = -ry; dy <= ry; dy++) { const dx = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry))); x.fillRect((X - dx) | 0, (Y + dy) | 0, dx * 2 + 1, 1); } },
      speck: (col, n, X, Y, W, H) => { x.fillStyle = col; for (let i = 0; i < n; i++) x.fillRect(((X || 0) + R() * (W || c.width)) | 0, ((Y || 0) + R() * (H || c.height)) | 0, 1, 1); },
      clear: (X, Y, W, H) => x.clearRect(X, Y, W, H) };
    paint(P);
    return { px: new Uint32Array(x.getImageData(0, 0, c.width, c.height).data.buffer.slice(0)), w: c.width, h: c.height, canvas: c };
  }
  function planks(P, base, dir, step) {                       // wooden planks: along x (dir 0) or y (dir 1)
    const { w, h } = P;
    if (dir === 0) for (let y = 0; y < h; y += step) { P.rect(0, y, w, step, sh(base, (P.r() - 0.5) * 0.18)); P.rect(0, y + step - 1, w, 1, sh(base, -0.35)); for (let i = 0; i < w / 10; i++) P.rect(P.r() * w, y + 1 + P.r() * (step - 3), 3 + P.r() * 8, 1, sh(base, -0.12)); P.rect(P.r() * w, y, 1, step - 1, sh(base, -0.3)); }
    else for (let x = 0; x < w; x += step) { P.rect(x, 0, step, h, sh(base, (P.r() - 0.5) * 0.18)); P.rect(x + step - 1, 0, 1, h, sh(base, -0.35)); for (let i = 0; i < h / 10; i++) P.rect(x + 1 + P.r() * (step - 3), P.r() * h, 1, 3 + P.r() * 8, sh(base, -0.12)); }
  }
  function stones(P, base, bw, bh) {
    const { w, h } = P; P.rect(0, 0, w, h, sh(base, -0.35));
    for (let y = 0, row = 0; y < h; y += bh, row++) for (let x = -((row & 1) * bw >> 1); x < w; x += bw) {
      const c = sh(base, (P.r() - 0.5) * 0.22); P.rect(x + 1, y + 1, bw - 1, bh - 1, c); P.rect(x + 1, y + 1, bw - 1, 1, sh(c, 0.18)); P.rect(x + 1, y + bh - 1, bw - 1, 1, sh(c, -0.2));
    }
    P.speck(sh(base, -0.25), (w * h) / 40);
  }
  function tiles(P, a, b, n) {
    const { w, h } = P, s = Math.max(4, Math.round(TW / n));
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { const c = ((x / s + y / s) & 1) ? a : b; P.rect(x, y, s, s, c); P.rect(x, y, s, 1, sh(c, 0.25)); P.rect(x, y, 1, s, sh(c, 0.15)); P.rect(x + s - 1, y, 1, s, sh(c, -0.25)); P.rect(x, y + s - 1, s, 1, sh(c, -0.25)); }
  }

  /* each picture: paint(P) on a canvas w x h (side pictures: h is the block's height in pixels) */
  const PAINT = {
    cloth(P) {                                                // a deep red tablecloth down to the floor, folds and a gold hem
      const { w, h } = P, red = '#9a2630'; P.rect(0, 0, w, h, red);
      for (let x = 0; x < w; x += 8) { P.rect(x, 3, 2, h, sh(red, -0.28)); P.rect(x + 2, 3, 1, h, sh(red, 0.12)); }
      P.rect(0, 0, w, 3, sh(red, 0.22)); P.rect(0, 3, w, 1, sh(red, -0.4));
      const hy = h - 6; P.rect(0, hy, w, 3, '#d9a83a'); P.rect(0, hy, w, 1, '#f3d27a'); P.rect(0, hy + 3, w, 1, '#8a6018');
      for (let x = 0; x < w; x += 4) P.rect(x + 1, hy + 4, 2, 2, '#c08a28');
    },
    feast(P) {                                                // the top of the feast table: plates, pies, a roast, goblets
      const { w, h } = P, red = '#9a2630'; P.rect(0, 0, w, h, red); P.speck(sh(red, -0.2), w * h / 25);
      P.rect(2, 2, w - 4, 2, '#d9a83a'); P.rect(2, h - 4, w - 4, 2, '#d9a83a'); P.rect(2, 2, 2, h - 4, '#d9a83a'); P.rect(w - 4, 2, 2, h - 4, '#d9a83a');
      P.rect(10, h / 2 - 9, w - 20, 18, '#efe6d2'); for (let x = 12; x < w - 12; x += 6) P.rect(x, h / 2 - 9, 3, 1, '#d8ccb0'), P.rect(x, h / 2 + 8, 3, 1, '#d8ccb0');
      for (let x = 32; x < w - 20; x += 64) for (const y of [16, h - 16]) {
        P.circ(x, y, 9, '#c9c3b8'); P.circ(x, y, 8, '#f4f1ea'); P.circ(x, y, 5, '#e7e1d4');
        P.rect(x + 13, y - 5, 4, 5, '#e2b53e'); P.rect(x + 14, y, 2, 4, '#b8892a');            // a goblet
      }
      const food = [
        (x, y) => { P.circ(x, y, 10, '#8a5222'); P.circ(x, y, 9, '#c88a3e'); for (let i = -8; i <= 8; i += 4) { P.rect(x + i, y - 8, 1, 16, '#9a6228'); P.rect(x - 8, y + i, 16, 1, '#9a6228'); } },   // a pie
        (x, y) => { P.ell(x, y, 13, 9, '#7a3c16'); P.ell(x, y - 1, 12, 7, '#b8632a'); P.ell(x - 3, y - 3, 5, 3, '#d88a46'); P.rect(x + 11, y - 2, 6, 2, '#efe6d2'); P.rect(x + 11, y + 2, 6, 2, '#efe6d2'); },   // a roast
        (x, y) => { P.circ(x, y, 10, '#b0a080'); P.circ(x, y, 9, '#e8dcc0'); for (let i = 0; i < 9; i++) P.circ(x - 6 + P.r() * 12, y - 6 + P.r() * 12, 3, ['#c8323a', '#6aa03a', '#e8b030', '#8a3aa0'][i % 4]); },   // fruit
        (x, y) => { P.circ(x, y, 9, '#f4f1ea'); P.circ(x, y, 7, '#f8b8c8'); P.circ(x, y, 4, '#ffffff'); P.circ(x, y - 1, 2, '#d0283a'); },   // a cake
        (x, y) => { P.ell(x, y, 12, 6, '#a0662a'); P.ell(x, y - 1, 11, 5, '#d49a50'); for (let i = -8; i <= 8; i += 5) P.rect(x + i, y - 4, 1, 6, '#8a5222'); },   // bread
      ];
      let k = 0; for (let x = 44; x < w - 30; x += 46) food[(k++) % food.length](x, h / 2);
    },
    quilt(P) {                                                // the bed's patchwork quilt hanging down the sides
      const { w, h } = P, cols = ['#c44a4a', '#e2b440', '#4a78c2', '#5aa05a', '#d97ab0', '#e88a3a'];
      P.rect(0, 0, w, 3, '#f2ede2'); P.rect(0, 3, w, 1, '#bdb4a2');
      for (let x = 0, i = 0; x < w; x += 10, i++) for (let y = 4, j = 0; y < h - 3; y += 8, j++) {
        const c = cols[(i * 3 + j * 2) % cols.length]; P.rect(x, y, 10, 8, c); P.rect(x, y, 10, 1, sh(c, 0.3)); P.rect(x, y + 7, 10, 1, sh(c, -0.3)); P.rect(x + 9, y, 1, 8, sh(c, -0.2));
        for (let s = x + 2; s < x + 9; s += 3) P.dot(s, y + 3, sh(c, 0.45));
      }
      for (let x = 0; x < w; x += 4) { P.rect(x, h - 3, 3, 2, '#f2ede2'); P.rect(x, h - 1, 2, 1, '#bdb4a2'); }
    },
    'quilt-top'(P) {                                          // from above: pillows and sheet at the head, the quilt below
      const { w, h } = P, cols = ['#c44a4a', '#e2b440', '#4a78c2', '#5aa05a', '#d97ab0', '#e88a3a'];
      P.rect(0, 0, w, h, '#f2ede2'); P.speck('#ddd5c4', w * h / 12, 0, 0, w, 52);
      for (const px of [w * 0.27, w * 0.73]) { P.ell(px, 22, w * 0.21, 13, '#c9c0ae'); P.ell(px, 21, w * 0.2, 12, '#fbf8f1'); P.ell(px - 4, 18, w * 0.1, 5, '#ffffff'); }
      const q0 = 50; P.rect(0, q0, w, 7, '#fbf8f1'); P.rect(0, q0 + 7, w, 1, '#bdb4a2');
      for (let x = 0, i = 0; x < w; x += 16, i++) for (let y = q0 + 8, j = 0; y < h; y += 16, j++) {
        const c = cols[(i * 2 + j * 5) % cols.length]; P.rect(x, y, 16, 16, c); P.rect(x, y, 16, 1, sh(c, 0.3)); P.rect(x, y, 1, 16, sh(c, 0.2)); P.rect(x + 15, y, 1, 16, sh(c, -0.25));
        if ((i + j) & 1) { P.rect(x + 6, y + 6, 4, 4, sh(c, 0.35)); } else { P.rect(x + 3, y + 3, 10, 1, sh(c, 0.35)); P.rect(x + 3, y + 12, 10, 1, sh(c, 0.35)); }
      }
      P.rect(0, q0 + 8, 3, h, '#7a2a2a'); P.rect(w - 3, q0 + 8, 3, h, '#7a2a2a'); P.rect(0, h - 3, w, 3, '#7a2a2a');
    },
    headboard(P) {                                            // a tall carved headboard with a moon, round shoulders at the top
      const { w, h } = P, wd = '#6a3c1c';
      P.rect(0, 0, w, h, wd); planks(P, '#7a4622', 1, 12);
      P.rect(0, 0, 8, h, '#4e2a12'); P.rect(w - 8, 0, 8, h, '#4e2a12'); P.rect(1, 0, 2, h, '#6a3c1c'); P.rect(w - 7, 0, 2, h, '#6a3c1c');
      P.rect(8, 6, w - 16, 3, '#4e2a12'); P.rect(8, h - 8, w - 16, 3, '#4e2a12');
      const cx = w / 2, cy = h * 0.42; P.circ(cx, cy, 11, '#4e2a12'); P.circ(cx, cy, 9, '#e8c04a'); P.circ(cx + 4, cy - 3, 8, '#7a4622');
      for (const sx of [cx - w * 0.28, cx + w * 0.28]) { P.circ(sx, cy, 4, '#4e2a12'); P.circ(sx, cy, 3, '#e8c04a'); }
      const r = Math.min(14, w * 0.2); for (let y = 0; y < r; y++) { const dx = Math.round(r - Math.sqrt(r * r - (r - y) * (r - y))); P.clear(8, y, dx, 1); P.clear(w - 8 - dx, y, dx, 1); }   // round shoulders
      for (const px of [0, w - 8]) { P.rect(px, 0, 8, 4, '#e8c04a'); P.rect(px + 1, 1, 6, 2, '#f8dc80'); }   // gold knobs on the posts
    },
    footboard(P) {
      const { w, h } = P; planks(P, '#7a4622', 1, 12); P.rect(0, 0, 7, h, '#4e2a12'); P.rect(w - 7, 0, 7, h, '#4e2a12');
      P.rect(7, 4, w - 14, 3, '#4e2a12'); P.rect(0, 0, 7, 3, '#e8c04a'); P.rect(w - 7, 0, 7, 3, '#e8c04a');
    },
    wood(P) { planks(P, '#6a3c1c', 1, 6); },
    cupboard(P) {                                             // the kitchen island: cupboard doors with knobs, a worktop edge
      const { w, h } = P, wd = '#8a5a2e'; P.rect(0, 0, w, h, sh(wd, -0.3));
      for (let x = 0; x < w; x += 32) { P.rect(x + 2, 6, 28, h - 10, wd); P.rect(x + 5, 9, 22, h - 16, sh(wd, -0.12)); P.rect(x + 5, 9, 22, 1, sh(wd, -0.35)); P.rect(x + 2, 6, 28, 1, sh(wd, 0.25)); P.rect(x + 24, h / 2, 2, 3, '#e0b040'); }
      P.rect(0, 0, w, 5, '#c89a60'); P.rect(0, 0, w, 1, '#e8c088'); P.rect(0, 5, w, 1, '#5a3418'); P.rect(0, h - 3, w, 3, '#3a2210');
    },
    butcher(P) { planks(P, '#c8965a', 0, 8); },
    stage(P) {                                                // a red velvet skirt with gold fringe round the stage
      const { w, h } = P, red = '#8a1f2a'; P.rect(0, 0, w, h, red);
      for (let x = 0; x < w; x += 6) { P.rect(x, 2, 2, h, sh(red, -0.3)); P.rect(x + 2, 2, 1, h, sh(red, 0.15)); }
      P.rect(0, 0, w, 3, '#d9a83a'); P.rect(0, 0, w, 1, '#f3d27a'); for (let x = 0; x < w; x += 3) P.rect(x, 3, 1, 3, '#c08a28');
    },
    boards(P) { planks(P, '#a8743c', 0, 10); P.speck('#5a3418', 20); },
    planter(P) { stones(P, '#8d8272', 16, 8); P.rect(0, 0, P.w, 3, '#b0a690'); P.rect(0, 3, P.w, 1, '#5a5244'); P.speck('#4f8a3a', 30, 0, 4, P.w, 6); },
    soil(P) {                                                 // soil with leafy plants and little flowers
      const { w, h } = P; P.rect(0, 0, w, h, '#4a3020'); P.speck('#5e3e28', 300); P.speck('#3a2416', 200);
      for (let i = 0; i < 9; i++) { const x = 6 + P.r() * (w - 12), y = 6 + P.r() * (h - 12), g = ['#3a8a3a', '#5ab04a', '#2f7a34'][i % 3]; for (let k = 0; k < 7; k++) P.ell(x + (P.r() - 0.5) * 12, y + (P.r() - 0.5) * 12, 4, 2, g); P.ell(x, y, 3, 3, sh(g, 0.3)); }
      for (let i = 0; i < 7; i++) { const x = 4 + P.r() * (w - 8), y = 4 + P.r() * (h - 8), c = ['#f070a8', '#f8d040', '#ffffff', '#b070f0'][i % 4]; P.circ(x, y, 2, c); P.dot(x, y, '#f8e070'); }
    },
    rim(P) { stones(P, '#b8a48a', 12, 4); P.rect(0, 0, P.w, 1, '#ddd0b8'); P.speck('#6f9a3e', 6); },   // the same warm stone as the pond's rim art
    water(P) {                                                // the pond from above: a stone rim, water, lily pads, a frog
      const { w, h } = P; P.rect(0, 0, w, h, '#7f858d'); P.speck('#5c6168', w * h / 10);
      P.rect(5, 5, w - 10, h - 10, '#2a62a0'); P.rect(5, 5, w - 10, 2, '#1c4678');
      for (let i = 0; i < 30; i++) P.rect(8 + P.r() * (w - 20), 8 + P.r() * (h - 16), 4 + P.r() * 6, 1, '#4a8ad0');
      for (let i = 0; i < 6; i++) { const x = 12 + P.r() * (w - 24), y = 12 + P.r() * (h - 24); P.circ(x, y, 6, '#2f8a3a'); P.circ(x, y, 5, '#4fae4a'); P.rect(x, y - 5, 1, 5, '#2a62a0'); if (i % 3 === 0) { P.circ(x + 2, y + 1, 2, '#f8a8c8'); P.dot(x + 2, y + 1, '#ffe080'); } }
    },
    tiles(P) { tiles(P, '#e8eef4', '#7ab0d8', 4); P.rect(0, 0, P.w, 3, '#f8fbff'); P.rect(0, 3, P.w, 1, '#8aa0b8'); },
    'tiles-top'(P) { tiles(P, '#eef3f8', '#9cc4e4', 4); },
    painted(P) {                                              // the play table's painted sides: red with yellow stars
      const { w, h } = P; P.rect(0, 0, w, h, '#c8343a'); P.rect(0, 0, w, 3, '#e8c040'); P.rect(0, h - 2, w, 2, '#7a1c20');
      for (let x = 8; x < w; x += 16) { const y = h / 2 + 1; P.rect(x - 1, y - 3, 3, 7, '#f8d040'); P.rect(x - 3, y - 1, 7, 3, '#f8d040'); }
    },
    felt(P) {                                                 // green felt with a little road, trees and a pond for the toys
      const { w, h } = P; P.rect(0, 0, w, h, '#3e8a3e'); P.speck('#357a35', w * h / 6); P.speck('#4a9a48', w * h / 10);
      P.rect(0, 0, w, 3, '#e8c040'); P.rect(0, h - 3, w, 3, '#e8c040'); P.rect(0, 0, 3, h, '#e8c040'); P.rect(w - 3, 0, 3, h, '#e8c040');
      P.rect(10, h - 22, w - 20, 6, '#b89a6a'); P.rect(10, 16, 6, h - 32, '#b89a6a');
      for (let i = 0; i < 8; i++) { const x = 20 + P.r() * (w - 40), y = 20 + P.r() * (h - 50); P.circ(x, y, 4, '#1f5e24'); P.circ(x - 1, y - 1, 2, '#3fa04a'); }
      P.ell(w - 22, 22, 9, 6, '#3a7ac8'); P.ell(w - 24, 20, 3, 2, '#9ac8f0');
    },
    workbench(P) { planks(P, '#5e3a1e', 0, 6); const { w, h } = P; for (let x = 8; x < w; x += 30) { P.rect(x, 7, 2, h - 9, '#2a1a10'); P.rect(x - 3, 7, 8, 3, '#8a8f98'); } P.rect(0, 0, w, 3, '#7a5030'); },
    'workbench-top'(P) { planks(P, '#6e4626', 1, 9); P.speck('#2a1a10', 60); P.ell(20, 30, 8, 5, '#3a2a1e'); },
    marble(P) { const { w, h } = P; P.rect(0, 0, w, h, '#ece8e2'); for (let i = 0; i < 6; i++) { let x = P.r() * w; for (let y = 0; y < h; y++) { x += (P.r() - 0.5) * 2; P.dot(x, y, '#b8b2aa'); } } P.rect(0, 0, w, 3, '#d9a83a'); P.rect(0, h - 3, w, 3, '#c8c2b8'); },
    'marble-top'(P) { const { w, h } = P; P.rect(0, 0, w, h, '#f4f1ec'); P.speck('#cfc9c0', 80); },
  };

  /* ---------- rugs: floor pictures over several squares, laid over the room's own floor ---------- */
  const RUGS = {
    runner(P) {                                               // a long red runner with a gold border
      const { w, h } = P; P.clear(0, 0, w, h); const long = w > h, a = 12;
      const X = long ? 2 : a, Y = long ? a : 2, W = long ? w - 4 : w - 2 * a, H = long ? h - 2 * a : h - 4;
      P.rect(X, Y, W, H, '#8a1f2a'); P.rect(X + 3, Y + 3, W - 6, H - 6, '#d9a83a'); P.rect(X + 5, Y + 5, W - 10, H - 10, '#a8283a');
      for (let i = 0; i < (long ? W : H); i += 24) { const cx = long ? X + 12 + i : X + W / 2, cy = long ? Y + H / 2 : Y + 12 + i; P.rect(cx - 1, cy - 5, 3, 11, '#d9a83a'); P.rect(cx - 5, cy - 1, 11, 3, '#d9a83a'); }
      P.speck('#701824', (W * H) / 30, X, Y, W, H);
    },
    blue(P) {                                                 // a big soft blue rug with a border and fringe (under the giant bed)
      const { w, h } = P; P.clear(0, 0, w, h); const m = 10;
      P.rect(m, m, w - 2 * m, h - 2 * m, '#2f4f8a'); P.rect(m + 5, m + 5, w - 2 * m - 10, h - 2 * m - 10, '#e2b440'); P.rect(m + 8, m + 8, w - 2 * m - 16, h - 2 * m - 16, '#3e64a8');
      for (let y = m + 20; y < h - m - 20; y += 22) for (let x = m + 20; x < w - m - 20; x += 22) { P.rect(x - 1, y - 4, 3, 9, '#5a82c8'); P.rect(x - 4, y - 1, 9, 3, '#5a82c8'); }
      for (let x = m; x < w - m; x += 3) { P.rect(x, m - 6, 1, 6, '#e8dcc0'); P.rect(x, h - m, 1, 6, '#e8dcc0'); }
      P.speck('#27447a', w * h / 30, m, m, w - 2 * m, h - 2 * m);
    },
    dance(P) {                                                // a chequered marble dance floor with a gold edge
      const { w, h } = P, s = 32; P.rect(0, 0, w, h, '#d9a83a');
      for (let y = 4; y < h - 4; y += s) for (let x = 4; x < w - 4; x += s) { const c = ((x / s | 0) + (y / s | 0)) & 1 ? '#1e1a26' : '#efe9e0'; P.rect(x, y, Math.min(s, w - 4 - x), Math.min(s, h - 4 - y), c); P.rect(x, y, Math.min(s, w - 4 - x), 1, sh(c, 0.2)); }
      P.rect(0, 0, w, 2, '#f3d27a'); P.rect(0, h - 2, w, 2, '#8a6018');
    },
    track(P) {                                                // a toy train track round the play table
      const { w, h } = P; P.clear(0, 0, w, h); const m = 22, rr = 18;
      const loop = (col, off, wd) => {
        P.x.strokeStyle = col; P.x.lineWidth = wd; P.x.beginPath();
        const X0 = m + off, Y0 = m + off, X1 = w - m - off, Y1 = h - m - off, r = Math.max(4, rr - off);
        P.x.moveTo(X0 + r, Y0); P.x.lineTo(X1 - r, Y0); P.x.arcTo(X1, Y0, X1, Y0 + r, r); P.x.lineTo(X1, Y1 - r); P.x.arcTo(X1, Y1, X1 - r, Y1, r);
        P.x.lineTo(X0 + r, Y1); P.x.arcTo(X0, Y1, X0, Y1 - r, r); P.x.lineTo(X0, Y0 + r); P.x.arcTo(X0, Y0, X0 + r, Y0, r); P.x.stroke();
      };
      P.x.setLineDash([3, 4]); loop('#7a4a24', 0, 14); P.x.setLineDash([]);
      loop('#8a9098', -4, 2); loop('#8a9098', 4, 2);
    },
  };

  /* ---------- textures, made once per size ---------- */
  /* a picture `wu` x `hu` squares big: from the art (blockArt.js, 128 pixels per square) if there is one, else painted
     here (64 pixels per square) */
  const cache = {}, IMG = {};
  G.WALL_PIC_PX = {};                                  // pictures on one wall (LAYOUT.wallPics): name -> frames of a wall-sized layer
  const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  G.loadBlockArt = function () {
    const S = G.TEX_SIZE || 128;
    const pics = Object.keys(G.WALL_PICS || {}).map(async (n) => {
      const fr = await Promise.all(G.WALL_PICS[n].map(loadImg)); if (!fr.every(Boolean)) return;
      G.WALL_PIC_PX[n] = fr.map((img) => { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0, S, S); return new Uint32Array(x.getImageData(0, 0, S, S).data.buffer.slice(0)); });
    });
    return Promise.all([...pics, ...Object.keys(G.BLOCK_ART || {}).map(async (n) => { const i = await loadImg(G.BLOCK_ART[n]); if (i) IMG[n] = i; })]).then(() => {
      if (G.world) G.world.marks = null;                // the wall pictures go on with the marks (wallLook.js)
      for (const k in cache) delete cache[k]; if (G.world && G.world.blocks) G.buildBlocks(G.world); return Object.keys(IMG).length;
    });
  };
  function tex(name, wu, hu, rug) {
    if (!name) return null;
    const img = rug ? IMG['rug-' + name] : IMG[name], res = img ? 128 : TW, w = Math.max(4, Math.round(wu * res)), h = Math.max(4, Math.round(hu * res));
    const k = name + '|' + w + '|' + h + (rug ? '|r' : ''); if (cache[k]) return cache[k];
    if (img) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      if (rug && (h > w) !== (img.height > img.width)) { x.translate(w, 0); x.rotate(Math.PI / 2); x.drawImage(img, 0, 0, h, w); }   // a rug turned to run along its room
      else x.drawImage(img, 0, 0, w, h);
      return (cache[k] = { px: new Uint32Array(x.getImageData(0, 0, w, h).data.buffer.slice(0)), w, h, canvas: c });
    }
    const p = (rug ? RUGS : PAINT)[name]; if (!p) return null;
    let seed = 0; for (const ch of name) seed = seed * 31 + ch.charCodeAt(0);
    return (cache[k] = make(w, h, p, seed + w * 7 + h));
  }
  let pillarPx = {};
  G.setBlockPillars = (p) => { pillarPx = p || {}; if (G.world && G.world.blocks) G.buildBlocks(G.world); };   // the walls' pillar art (wallLook.js)

  /* ---------- the blocks of the current world ---------- */
  G.buildBlocks = function (w) {
    w.blocks = []; w.blkAt = new Array(w.w * w.h).fill(null);
    for (const [k, x0, y0, x1, y1, opt] of (G.LAYOUT.blocks || [])) {
      const K = Object.assign({}, G.BLOCK_KINDS[k], opt || {}); if (!K.h) continue;
      const ins = Array.isArray(K.inset) ? K.inset : [K.inset || 0, K.inset || 0, K.inset || 0, K.inset || 0];   // west, north, east, south
      let bx0 = x0 + ins[0], by0 = y0 + ins[1], bx1 = x1 + 1 - ins[2], by1 = y1 + 1 - ins[3];
      if (K.edge === 'n') by1 = by0 + K.thick; else if (K.edge === 's') by0 = by1 - K.thick;
      else if (K.edge === 'w') bx1 = bx0 + K.thick; else if (K.edge === 'e') bx0 = bx1 - K.thick;
      const g = { id: w.blocks.length, k, K, x0, y0, x1, y1, bx0, by0, bx1, by1, h: K.h, say: K.say, edge: !!K.edge, see: !!K.pillar, st: -1 };
      const lx = bx1 - bx0, ly = by1 - by0, spanSide = K.span === 'side' || K.span === 'both', spanTop = K.span === 'top' || K.span === 'both', rep = K.rep || 1;
      /* one face's picture, and how many of its pixels make one square along the face (k) */
      const face = (len, end) => {
        if (K.pillar) { const T = pillarPx[K.pillar] || tex('marble', len, 1); return { T, k: T.w / len }; }
        const name = end && K.end ? K.end : K.side;
        if (spanSide || (end && K.end)) { const T = tex(name, len, K.h); return { T, k: T && T.w / len }; }
        const T = tex(name, 1 / rep, K.h); return { T, k: T && T.w * rep };      // repeats `rep` times per square
      };
      // faces along x (north/south: side 1) are lx long, along y (east/west: side 0) are ly long; the shorter pair are the ends
      const f1 = face(lx, lx < ly), f0 = face(ly, ly <= lx && lx !== ly);
      g.tex1 = f1.T; g.k1 = f1.k; g.tex0 = f0.T; g.k0 = f0.k;
      if (K.top && K.h < 0.5) {
        if (spanTop) g.top = tex(K.top, lx, ly);
        else { const r = K.repTop || 1; g.top = tex(K.top, 1 / r, 1 / r); g.kt = g.top && g.top.w * r; }   // square, 64 or 128 wide: the renderer wraps it with a mask
      }
      g.topSpan = spanTop;
      w.blocks.push(g);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * w.w + x; (w.blkAt[i] = w.blkAt[i] || []).push(g); }
    }
    for (const a of w.blkAt) if (a) a.sort((p, q) => (p.edge - q.edge));   // the main block first, edge boards after
  };
  /* pictures on one wall (castle.js LAYOUT.wallPics: the fireplace, the moonlit window): which wall faces have one.
     That wall shows no other decoration; the picture goes on with the wall marks (G.placeWallPics) */
  const faceOf = (p) => (p.from[0] < p.x ? 1 : p.from[0] > p.x ? 0 : p.from[1] < p.y ? 3 : 2);
  G.wallPicFaces = function (w) {
    w.fixedPic = {};
    for (const p of (G.LAYOUT.wallPics || [])) w.fixedPic[(p.y * w.w + p.x) * 4 + faceOf(p)] = p;
    if (G.messFaces) G.messFaces(w);                    // the Witch's scribbles (cleaning.js)
  };
  G.placeWallPics = function (w, marks) {
    for (const k in (w.fixedPic || {})) { const P = G.WALL_PIC_PX[w.fixedPic[k].pic]; if (!P) continue; w.tellOv = w.tellOv || {}; w.tellOv[k] = P.length > 1 ? P : P[0]; marks[k] = 0; }
  };
  G.blockAt = function (x, y) { const w = G.world; if (!w || !w.blkAt || x < 0 || y < 0 || x >= w.w || y >= w.h) return null; const a = w.blkAt[y * w.w + x]; return a ? a[0] : null; };
  /* what stands on a block (Big Barry on his bed, the music box on the stage): walking into any part of it reaches them */
  G.thingOnBlock = function (g) {
    if (!g) return null;
    return G.things.find((t) => !t.hidden && (t.kind === 'monster' || t.kind === 'npc' || t.kind === 'object') && t.x >= g.x0 && t.x <= g.x1 && t.y >= g.y0 && t.y <= g.y1) || null;
  };
  /* things standing on a block stand on its top */
  G.liftOntoBlocks = function () {
    for (const t of G.things) { const g = G.blockAt(t.x, t.y); t.base = g && !t.inBed && t.kind !== 'light' && !/^prop_hang_/.test(t.sprite || '') ? g.h : 0; }   // inBed: lies in it, the quilt hides his legs
  };

  /* rugs over several squares (LAYOUT.rugs: [kind, x0, y0, x1, y1]): each square gets its piece over the room's floor */
  G.buildRugs = function (w) {
    const S = G.TEX_SIZE || 128;
    for (const [k, x0, y0, x1, y1] of (G.LAYOUT.rugs || [])) {
      const R = tex(k, x1 - x0 + 1, y1 - y0 + 1, true); if (!R) continue;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * w.w + x, th = w.theme[i]; if (!th) continue;
        const base = w.floorOv[i] || th.floor, c = document.createElement('canvas'); c.width = c.height = S;
        const cx = c.getContext('2d', { willReadFrequently: true }); cx.imageSmoothingEnabled = false;
        cx.putImageData(new ImageData(new Uint8ClampedArray(base.buffer.slice(0)), S, S), 0, 0);
        const pc = R.w / (x1 - x0 + 1); cx.drawImage(R.canvas, (x - x0) * pc, (y - y0) * pc, pc, pc, 0, 0, S, S);
        w.floorOv[i] = new Uint32Array(cx.getImageData(0, 0, S, S).data.buffer.slice(0));
      }
    }
  };
})();
