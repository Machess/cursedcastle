/* VIEW — Parchment minimap and the big castle map. */
(function () {
  const ui = G.ui, $ = ui.$, el = ui.el, tap = ui.tap;
  /* ---------- minimap ---------- */
  const MM = $('minimap').getContext('2d');
  ui.drawMinimap = function (bigCtx, cell) {
    const w = G.world, s = G.state; if (!w || !s) return;
    const ctx = bigCtx || MM;
    const CS = cell || 20, R = bigCtx ? 0 : 5;
    const SW = bigCtx ? 0 : ctx.canvas.width, SH = bigCtx ? 0 : ctx.canvas.height;
    if (bigCtx) ctx.clearRect(0, 0, w.w * CS, w.h * CS);   // drawn straight onto the big scroll
    else ctx.clearRect(0, 0, SW, SH);                    // the small map is drawn straight onto the parchment in the background
    const px = Math.round(G.cam.x - 0.5), py = Math.round(G.cam.y - 0.5);
    const ox = bigCtx ? 0 : SW / 2 - (px + 0.5) * CS, oy = bigCtx ? 0 : SH / 2 - (py + 0.5) * CS;
    const x0 = bigCtx ? 0 : px - R - 1, x1 = bigCtx ? w.w - 1 : px + R + 1, y0 = bigCtx ? 0 : py - R - 1, y1 = bigCtx ? w.h - 1 : py + R + 1;
    /* drawn like an old adventurer's map (2.20): the explored part is a darker wash on the parchment, open squares are
       marked off with dotted lines, walls are inked lines along the edge of the floor (not filled squares), doors are
       coloured bars across the doorway, and forest squares get a little tree stamp */
    const INK = '#4a2c12', seenAt = (x, y) => x >= 0 && y >= 0 && x < w.w && y < w.h && s.seen[y * w.w + x];
    const cellAt = (x, y) => (x < 0 || y < 0 || x >= w.w || y >= w.h ? 1 : w.cells[y * w.w + x]);
    const each = (fn) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if (!seenAt(x, y)) continue; const c = w.cells[y * w.w + x]; if (c !== 1) fn(x, y, c, ox + x * CS, oy + y * CS, y * w.w + x); } };
    ctx.fillStyle = 'rgba(150,110,55,.16)'; each((x, y, c, X, Y) => ctx.fillRect(X - 3, Y - 3, CS + 6, CS + 6));   // the wash's soft edge
    ctx.fillStyle = '#dcc693'; each((x, y, c, X, Y) => ctx.fillRect(X, Y, CS, CS));
    ctx.strokeStyle = 'rgba(90,58,28,.5)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);                              // dotted squares
    ctx.beginPath(); each((x, y, c, X, Y) => { if (c === 3) return; ctx.moveTo(X + CS - 0.5, Y); ctx.lineTo(X + CS - 0.5, Y + CS); ctx.moveTo(X, Y + CS - 0.5); ctx.lineTo(X + CS, Y + CS - 0.5); }); ctx.stroke();
    ctx.setLineDash([]);
    each((x, y, c, X, Y, i) => {
      if (c === 3) {                                       // a tree square: a little tree stamp
        const r = CS * (0.27 + ((x * 7 + y * 13) % 3) * 0.04);
        ctx.fillStyle = INK; ctx.fillRect(X + CS / 2 - 1, Y + CS * 0.6, 2, CS * 0.28);
        ctx.fillStyle = (x * 5 + y * 3) % 4 ? '#7d9a58' : '#93a862'; ctx.beginPath(); ctx.arc(X + CS / 2, Y + CS * 0.43, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
        return;
      }
      if (c === 2) {                                       // a door: a coloured bar across the doorway
        const col = ({ d: '#a0642a', r: '#9a50d0', m: '#6a8ad0', g: '#9a50d0', l: '#c08a3a', u: '#c08a3a', v: '#c08a3a' })[w.doorType[i]] || '#a0642a';
        const across = cellAt(x - 1, y) === 1 || cellAt(x + 1, y) === 1;   // walls left and right: you walk through it up or down
        ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        const bx = across ? X + 1 : X + CS * 0.3, by = across ? Y + CS * 0.3 : Y + 1, bw = across ? CS - 2 : CS * 0.4, bh = across ? CS * 0.4 : CS - 2;
        ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
      }
      const bk = w.blkAt && w.blkAt[i] && w.blkAt[i][0];   // furniture you walk round (blocks.js): a pillar is a dot, the rest a box
      if (bk) {
        ctx.fillStyle = bk.see ? '#8a7258' : '#c4a274'; ctx.strokeStyle = 'rgba(74,44,18,.7)'; ctx.lineWidth = 1;
        if (bk.see) { ctx.beginPath(); ctx.arc(X + CS / 2, Y + CS / 2, CS * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        else ctx.fillRect(ox + bk.bx0 * CS > X ? ox + bk.bx0 * CS : X, oy + bk.by0 * CS > Y ? oy + bk.by0 * CS : Y,
          Math.min(X + CS, ox + bk.bx1 * CS) - Math.max(X, ox + bk.bx0 * CS), Math.min(Y + CS, oy + bk.by1 * CS) - Math.max(Y, oy + bk.by0 * CS));
      }
    });
    ctx.strokeStyle = INK; ctx.lineWidth = bigCtx ? 3.5 : 3; ctx.lineCap = 'round'; ctx.beginPath();                 // the walls: ink along the floor's edge
    each((x, y, c, X, Y) => {
      if (cellAt(x, y - 1) === 1) { ctx.moveTo(X, Y); ctx.lineTo(X + CS, Y); }
      if (cellAt(x, y + 1) === 1) { ctx.moveTo(X, Y + CS); ctx.lineTo(X + CS, Y + CS); }
      if (cellAt(x - 1, y) === 1) { ctx.moveTo(X, Y); ctx.lineTo(X, Y + CS); }
      if (cellAt(x + 1, y) === 1) { ctx.moveTo(X + CS, Y); ctx.lineTo(X + CS, Y + CS); }
    });
    ctx.stroke(); ctx.lineCap = 'butt';
    for (const t of G.things) {
      if (t.hidden || !s.seen[t.y * w.w + t.x] || t.kind === 'deco' || t.kind === 'prop' || t.kind === 'light') continue;
      if (!bigCtx && (Math.abs(t.x - px) > R + 1 || Math.abs(t.y - py) > R + 1)) continue;
      const X = ox + (t.x + 0.5) * CS, Y = oy + (t.y + 0.5) * CS;
      if (t.kind === 'gate') {                              // something in the way: a little barred square
        ctx.fillStyle = '#8a8478'; ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 1.5; ctx.fillRect(X - CS * 0.3, Y - CS * 0.3, CS * 0.6, CS * 0.6); ctx.strokeRect(X - CS * 0.3, Y - CS * 0.3, CS * 0.6, CS * 0.6);
        ctx.beginPath(); ctx.moveTo(X - CS * 0.3, Y - CS * 0.3); ctx.lineTo(X + CS * 0.3, Y + CS * 0.3); ctx.moveTo(X + CS * 0.3, Y - CS * 0.3); ctx.lineTo(X - CS * 0.3, Y + CS * 0.3); ctx.stroke(); continue;
      }
      if (t.spirit) {                                       // a spirit's object: its own colour while bound, gone from the map once free
        if (G.spiritFree(t.spirit)) continue;
        ctx.fillStyle = G.SPIRITS[t.spirit].colour; ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 1.5;
        ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = CS * (k % 2 ? 0.18 : 0.42); ctx.lineTo(X + Math.sin(a) * r, Y - Math.cos(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); continue;
      }
      if (t.kind === 'object' && G.state.flags['done_' + t.id]) continue;   // picked, used: nothing left to try
      ctx.fillStyle = t.kind === 'monster' ? (G.state.flags['freed_' + t.id] ? '#4fa35a' : '#8a3ad0') : t.kind === 'npc' ? '#3a6fc0' : '#e0a020';
      ctx.beginPath(); ctx.arc(X, Y, CS * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    // trap doors, ladders and stairs: a triangle pointing down / up
    for (const p of G.PORTALS || []) {
      if (p.map !== G.mapId() || !p.show() || !s.seen[p.y * w.w + p.x]) continue;
      const X = ox + (p.x + 0.5) * CS, Y = oy + (p.y + 0.5) * CS;
      const r = CS * 0.34, d = p.dir === 'down' ? 1 : -1;   // a little triangle pointing the way the portal goes
      ctx.fillStyle = '#3a2408'; ctx.beginPath(); ctx.moveTo(X - r, Y - d * r * 0.7); ctx.lineTo(X + r, Y - d * r * 0.7); ctx.lineTo(X, Y + d * r * 0.8); ctx.closePath(); ctx.fill();
    }
    if (!bigCtx) ui.compass(ctx, SW - 20, 22, 13);          // north, in the corner of the small map
    // player arrow
    const X = ox + G.cam.x * CS, Y = oy + G.cam.y * CS;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(G.cam.a);
    ctx.fillStyle = '#d0302a'; ctx.strokeStyle = '#3a1008'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -CS * 0.45); ctx.lineTo(CS * 0.36, CS * 0.36); ctx.lineTo(0, CS * 0.18); ctx.lineTo(-CS * 0.36, CS * 0.36); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  };
  /* a compass rose with N (the small map's corner, the big map's side) */
  ui.compass = function (ctx, cx, cy, r) {
    const INK = '#4a2c12';
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = 'rgba(236,220,176,.85)'; ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, r / 12); ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 4; k++) {                          // four points; north is the red one
      ctx.save(); ctx.rotate(k * Math.PI / 2);
      ctx.fillStyle = k === 0 ? '#c8322a' : INK; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.2, 0); ctx.lineTo(-r * 0.2, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = INK; ctx.font = `700 ${Math.round(r * 1.05)}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('N', 0, -r * 1.22);
    ctx.restore();
  };
  ui.bigMap = function () {
    const w = G.world; const CS = 26;
    const cv = el('canvas', 'big-map'); cv.width = w.w * CS; cv.height = w.h * CS;
    cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px';
    const box = el('div', 'map-view');
    box.appendChild(cv);
    const rose = el('canvas', 'map-rose'); rose.width = rose.height = 132; box.appendChild(rose);   // which way is north
    ui.compass(rose.getContext('2d'), 66, 80, 40);
    const forest = G.zoneOf && G.zoneOf() === 'forest';      // each place has its own key: no Sir Sneezalot in the forest
    box.appendChild(el('div', 'sub', `${ui.dot('purple')} cursed friend &nbsp; ${ui.dot('green')} freed friend &nbsp; ${ui.dot('yellow')} something to try &nbsp; `
      + (forest ? '<i class="key-spirit"></i> a bound spirit &nbsp; <i class="key-gate"></i> something in the way' : `${ui.dot('blue')} Sir Sneezalot`)));
    ui.modal(box, { scroll: (G.MAPS[G.mapId()] || {}).name || 'Castle Map' });
    ui.drawMinimap(cv.getContext('2d'), CS);
  };
})();
