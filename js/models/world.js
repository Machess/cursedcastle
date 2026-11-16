/* MODEL — Castle grid (cells, rooms, themes, doors) and the things standing in it. */
(function () {
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  G.DIRS = DIRS;
  /* ---------- world grid ---------- */
  G.buildWorld = function () {
    const W = G.MAP_W, H = G.MAP_H, n = W * H;
    const w = { w: W, h: H, cells: new Uint8Array(n).fill(1), region: new Array(n).fill(null), theme: new Array(n).fill(null), doorType: new Array(n).fill(''), doorOpen: new Float32Array(n), doorTarget: {} };
    for (const [r, x0, y0, x1, y1] of G.LAYOUT.rects)
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * W + x; w.cells[i] = 0; w.region[i] = r; }
    for (const [x, y] of (G.LAYOUT.walls || [])) { const i = y * W + x; w.cells[i] = 1; w.region[i] = null; }   // wall squares inside rooms: shelf rows, cut corners
    for (const [x, y, r] of (G.LAYOUT.trees || [])) { const i = y * W + x; w.cells[i] = 3; w.region[i] = r; }   // tree squares (forest.js): blocked, but you see through them
    w.doorStyle = new Array(n).fill('');
    const ds = G.LAYOUT.doorStyles || {};
    for (const [t, x, y, r] of G.LAYOUT.doors) { const i = y * W + x; w.cells[i] = 2; w.doorType[i] = t; w.region[i] = r; w.doorStyle[i] = ds[x + ',' + y] || t; }
    if (G.applySecrets) G.applySecrets(w);               // secret walls: hidden (wall) or found (an open gap), controllers/secrets.js
    for (let i = 0; i < n; i++) if (w.region[i]) w.theme[i] = G.TEX[G.ROOMS[w.region[i]].theme];
    w.floorOv = new Array(n).fill(null);                 // special floor tiles (a carpet) over the room's floor
    for (const [name, x0, y0, x1, y1] of (G.LAYOUT.floors || []))
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * W + x, th = w.theme[i]; if (G.floorTex && th) w.floorOv[i] = G.floorTex(name, th.floor);
      }
    if (G.forestWorld) G.forestWorld(w);                 // paths, trees and found bush paths (forestView.js)
    if (G.buildRugs) G.buildRugs(w);                     // rugs over several squares (blocks.js)
    if (G.buildBlocks) G.buildBlocks(w);
    if (G.wallPicFaces) G.wallPicFaces(w);              // the fireplace, the moonlit window (blocks.js)
    if (G.messFloors) G.messFloors(w);                  // goo and paw prints on the floor (cleaning.js)                 // furniture you walk round: pillars, the bed, the feast table (blocks.js)
    w.spiral = !!(G.MAPS[G.mapId()] || {}).spiral;
    G.world = w;
    G.portalFloors();
  };
  /* trap doors are floor tiles too: closed until the first trip down, open after */
  G.portalFloors = function () {
    const w = G.world; if (!w || !G.PORTALS || !G.state) return;
    for (const p of G.PORTALS) {
      if (p.map !== G.mapId() || p.kind !== 'hatch' || !p.show()) continue;
      const i = p.y * w.w + p.x, th = w.theme[i];
      if (G.floorTex && th) w.floorOv[i] = G.floorTex(G.state.flags[p.id + '_open'] ? 'hatch-open' : 'hatch-closed', th.floor);
    }
    G.dirty = true;
  };
  G.idx = (x, y) => y * G.MAP_W + x;

  /* ---------- things (monsters, objects, props) ---------- */
  G.buildThings = function () {
    G.things = G.THINGS.map((d) => Object.assign({}, d));
    const sparks = [];
    for (const t of G.things) {
      if (t.kind === 'monster') t.spr = G.SPR['mon_' + t.id];
      else if (t.kind === 'npc') t.spr = G.SPR[t.sprite];
      else t.spr = G.SPR[t.sprite];
      if (t.kind === 'object') sparks.push({ kind: 'spark', x: t.x, y: t.y, spr: G.SPR.sparkle, owner: t, noFog: true });
    }
    G.things.push(...sparks);
    if (G.addPickups) G.addPickups();               // things lying on the floor to pick up (poke.js)
    if (G.addWallLights) G.addWallLights();
    if (G.addHanging) G.addHanging();               // chandeliers, lanterns, bats... hanging from the ceiling (ceilings.js)         // torches and lanterns standing out from the walls (wallAnim.js)
    if (G.addMesses) G.addMesses();                   // the Witch's mess, and Mildred (cleaning.js)
    if (G.liftOntoBlocks) G.liftOntoBlocks();          // things standing on furniture stand on its top
    G.refreshThings();
  };
  G.refreshThings = function () {
    const f = G.state ? G.state.flags : {};
    for (const t of G.things) {
      if (t.kind === 'monster') {
        const freed = !!f['freed_' + t.id], friend = G.SPR['free_' + t.id] && ((G.MONSTER_ART && G.MONSTER_ART[t.id]) || G.MONSTERS[t.id].friendArt);
        t.hidden = freed && !friend;
        const at = G.MONSTERS[t.id].freedAt; if (at) { t.home = t.home || { x: t.x, y: t.y }; const p = freed && friend ? at : t.home; t.x = p.x; t.y = p.y; }
        const rp = G.MONSTERS[t.id].roomPose, roomSpr = rp && G.SPR['mon_' + t.id + '_' + rp];   // e.g. asleep in his bed
        t.spr = freed && friend ? G.SPR['free_' + t.id] : (roomSpr || G.SPR['mon_' + t.id]);
        const art = G.MONSTER_ART && G.MONSTER_ART[t.id];
        t.hover = art && art.hover && !freed ? art.hover : 0;   // the Witch flies around on her broom
        t.scale = 1; t.alpha = 1; t.lift = 0;
      }
      if (t.kind === 'spark') t.hidden = !!f['done_' + t.owner.id] || !G.objectReady(t.owner.id);
    }
  };
  G.thingAt = function (x, y) {
    for (const t of G.things) if (!t.hidden && !t.walk && t.x === x && t.y === y && t.kind !== 'deco' && t.kind !== 'spark' && t.kind !== 'pickup' && t.kind !== 'light') return t;   // walk: you can step there (Mildred, a dust bunny)
    return null;
  };

})();
