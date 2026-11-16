/* MODEL — Player state, settings, hero profiles, save/load (localStorage).
   Every play-through is a profile (a hero): its save is in 'cursedcastle.save.<id>', and the list of heroes with a
   short summary for the hero chooser (name, look, Moon Keys, friends freed, where, last played) is in PROF_KEY. */
(function () {
  const OLD_SAVE = 'cursedcastle.save.v1';            // the one save from before profiles
  const PROF_KEY = 'cursedcastle.profiles.v1';
  const SET_KEY = 'cursedcastle.settings.v1';
  G.MAX_PROFILES = 5;
  const key = (id) => 'cursedcastle.save.' + id;
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: (k) => { try { localStorage.removeItem(k); } catch (e) {} } };
  function readIndex() { try { return JSON.parse(ls.get(PROF_KEY)) || { list: [], last: null }; } catch (e) { return { list: [], last: null }; } }
  const writeIndex = (ix) => ls.set(PROF_KEY, JSON.stringify(ix));
  function summary(s, id, old) {
    const r = G.world && G.world.region && G.ROOMS[G.world.region[G.idx(s.x, s.y)]];
    return Object.assign({}, old, { id, name: s.name || G.CLASSES[s.cls].name, cls: s.cls, look: s.look, level: s.level,
      keys: (s.items && s.items.moonkey) || 0, freed: s.wins || 0, beaten: !!(s.flags && s.flags.witch_beaten),
      secrets: Object.keys(s.flags || {}).filter((k) => k.startsWith('secret_')).length, hunter: !!(s.flags && s.flags.treasure_hunter),
      where: r ? r.name : (old && old.where) || '', played: Date.now() });
  }
  // the save from before profiles becomes the first hero
  (function migrate() {
    const old = ls.get(OLD_SAVE); if (!old || ls.get(PROF_KEY)) return;
    try {
      const s = JSON.parse(old), id = 'p1';
      ls.set(key(id), old);
      writeIndex({ list: [summary(s, id, { created: Date.now() })], last: id });
      ls.del(OLD_SAVE);
    } catch (e) {}
  })();
  G.profiles = () => readIndex().list.slice().sort((a, b) => b.played - a.played);   // most recently played first
  G.lastProfile = () => readIndex().last;
  G.deleteProfile = function (id) {
    const ix = readIndex(); ix.list = ix.list.filter((p) => p.id !== id); if (ix.last === id) ix.last = ix.list[0] ? ix.list[0].id : null;
    writeIndex(ix); ls.del(key(id));
  };
  /* ---------- settings ---------- */
  G.settings = { sound: true, voice: true, readPuzzles: true, fastText: false };
  try { Object.assign(G.settings, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) {}
  G.saveSettings = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(G.settings)); } catch (e) {} };


  /* ---------- state ---------- */
  G.newGame = function (cls, level, look, name) {
    G.useMap('castle');
    const c = G.CLASSES[cls], st = G.LAYOUT.start;
    G.state = {
      v: 1, layout: G.LAYOUT_V, pid: 'p' + Date.now().toString(36), cls, level, look: look || null, name: name || '', x: st.x, y: st.y, dir: st.dir, hp: c.hp,
      deck: c.deck.map((id) => ({ id, up: 0 })), items: { cheese: 1 }, flags: {},
      map: 'castle', seenBy: { castle: new Uint8Array(G.MAP_W * G.MAP_H) }, steps: 0, visited: {}, wins: 0, solved: 0,
    };
    G.afterLoad();
    G.save();
  };
  G.passiveSum = function (key) {                    // added up from the treasures you carry (items.js passive)
    const s = G.state; let m = 0;
    for (const k in s.items) if (s.items[k] > 0 && G.ITEMS[k] && G.ITEMS[k].passive) m += G.ITEMS[k].passive[key] || 0;
    return m;
  };
  G.maxHp = function () {
    const s = G.state; let m = G.CLASSES[s.cls].hp;
    for (const k in s.items) if (s.items[k] > 0 && G.ITEMS[k].passive) m += G.ITEMS[k].passive.maxHp || 0;
    return m;
  };
  G.save = function () {
    const s = G.state; if (!s) return;
    const seenBy = {}; for (const k in s.seenBy) seenBy[k] = Array.from(s.seenBy[k]).join('');   // explored tiles, per map
    const out = Object.assign({}, s, { seenBy }); delete out.seen;
    if (!s.pid) s.pid = 'p' + Date.now().toString(36);
    ls.set(key(s.pid), JSON.stringify(out));
    const ix = readIndex(), i = ix.list.findIndex((p) => p.id === s.pid);    // a new hero gets its profile on its first save
    const sum = summary(s, s.pid, i >= 0 ? ix.list[i] : { created: Date.now() });
    if (i >= 0) ix.list[i] = sum; else ix.list.push(sum);
    ix.last = s.pid; writeIndex(ix);
  };
  G.hasSave = () => readIndex().list.length > 0;
  G.loadGame = function (id) {
    try {
      id = id || readIndex().last;
      const s = JSON.parse(ls.get(key(id))); s.pid = id;
      const parse = (str, id) => { const m = G.MAPS[id] || G.MAPS.castle, a = new Uint8Array(m.w * m.h);
        for (let i = 0; i < a.length; i++) a[i] = str.charCodeAt(i) === 49 ? 1 : 0; return a; };
      const by = {};
      if (s.seenBy) for (const k in s.seenBy) by[k] = parse(s.seenBy[k], k);
      else if (s.seen) by.castle = parse(s.seen, 'castle');               // saves from before maps
      s.seenBy = by; delete s.seen; s.map = s.map || 'castle';
      if (!s.layout) oldCastle(s);                        // a save from the old square castle
      s.layout = G.LAYOUT_V;
      if (G.MAPS[s.map] && G.MAPS[s.map].transit) Object.assign(s, { map: 'castle', x: 19, y: 3, dir: 2 });   // saved in the middle of the stairs
      delete by.stairwell;
      G.state = s; G.afterLoad(); return true;
    } catch (e) { console.warn(e); return false; }
  };
  /* the castle was rebuilt (layout version 2): a hero saved in the old castle goes to the door of the room they were in,
     unlocked doors keep their flags under their new places, and the castle map is explored again */
  function oldCastle(s) {
    const O = G.OLD_CASTLE;
    if (s.map === 'castle' && s.y <= 2 && s.x >= 12 && s.x <= 14) Object.assign(s, { map: 'tower', x: s.x - 11 });   // the tower used to be part of the castle map
    if (s.map === 'castle') {
      const r = O.rects.find(([, x0, y0, x1, y1]) => s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1), at = O.spot[r ? r[0] : 'E'] || O.spot.E;
      Object.assign(s, { x: at[0], y: at[1], dir: at[2] });
    }
    for (const k in O.doors) if (s.flags[k]) { s.flags[O.doors[k]] = s.flags[k]; delete s.flags[k]; }
    if (s.seenBy) delete s.seenBy.castle;
  }
  G.afterLoad = function () {
    const s = G.state;
    if (G.FOREST_V && s.forestV !== G.FOREST_V) {       // the forest was redrawn: its old map and hidden paths no longer fit
      if (s.seenBy) { delete s.seenBy.forest; delete s.seenBy.caves; }
      for (const k in s.flags) if (k.indexOf('bush@') === 0) delete s.flags[k];
      if (G.MAPS[s.map] && G.MAPS[s.map].zone === 'forest') { const st = G.MAPS.forest.layout.start; s.map = 'forest'; s.x = st.x; s.y = st.y; s.dir = st.dir; }
      s.forestV = G.FOREST_V;
    }
    G.useMap(s.map || 'castle');
    s.seenBy = s.seenBy || {};
    if (!s.seenBy[G.mapId()]) s.seenBy[G.mapId()] = new Uint8Array(G.MAP_W * G.MAP_H);
    s.seen = s.seenBy[G.mapId()];                       // this map's explored tiles
    G.buildWorld(); G.buildThings();
    const w = G.world;                                  // doors are shut (door_x_y flags only mean "unlocked"); a save made standing in a doorway keeps that one open
    if (w.cells[G.idx(s.x, s.y)] === 2) { w.doorOpen[G.idx(s.x, s.y)] = 1; w.doorLeave = G.idx(s.x, s.y); }
    G.cam = { x: s.x + 0.5, y: s.y + 0.5, a: s.dir * Math.PI / 2, bob: 0 };
    G.anim = null; G.queued = null; G.lastRegion = null;
    G.ui.renderHero(); G.ui.renderInventory();
    G.dirty = true;
  };

})();
