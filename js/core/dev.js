/* DEV — Console helpers for testing in Chrome (F12 → Console). Safe to delete for release.
   G.dev.rooms()          list room codes
   G.dev.go('B')          jump into a room (by code) and face something interesting
   G.dev.tp(13, 18, 0)    jump to x, y facing 0 N / 1 E / 2 S / 3 W
   G.dev.fight('troll')   start a battle with any monster
   G.dev.keys()           give the 3 Moon Keys
   G.dev.free('skeleton') mark a monster as freed (unlocks its mini-game)
   G.dev.heal()           full health
   G.dev.level(1..3)      puzzle level (age 6-7, 8-9, 10+)
   G.dev.answers(true)    show the puzzle answer in the console as each puzzle opens
   G.dev.reveal()         uncover the whole minimap */
(function () {
  const need = () => { if (!G.state) { console.warn('Start or continue a game first.'); return false; } G.ui.closeModal(); return true; };
  const place = (x, y, dir) => {
    const s = G.state; Object.assign(s, { x, y, dir });
    G.cam.x = x + 0.5; G.cam.y = y + 0.5; G.cam.a = dir * Math.PI / 2; G.anim = null;
    G.lastRegion = null; G.dirty = true; G.ui.renderHero(); G.arrived();
  };
  G.dev = {
    rooms() { const out = {}; for (const k in G.ROOMS) out[k] = G.ROOMS[k].name; console.table(out); return out; },
    tp(x, y, dir = 0) { if (need()) place(x, y, dir); },
    map(id) { if (!need()) return; const st = G.MAPS[id].layout.start; G.switchMap(id, st.x, st.y, st.dir); G.lastRegion = null; G.arrived(); },   // G.dev.map('vault')
    go(code) {
      if (!need()) return;
      const r = G.LAYOUT.rects.find((q) => q[0] === code); if (!r) return console.warn('Unknown room', code, '- try G.dev.rooms()');
      const [, x0, y0, x1, y1] = r;
      // prefer a free cell next to something you can interact with
      for (const t of G.things) {
        if (t.hidden || !['monster', 'object', 'npc'].includes(t.kind) || G.world.region[G.idx(t.x, t.y)] !== code) continue;
        for (let d = 0; d < 4; d++) {
          const [dx, dy] = G.DIRS[d], x = t.x - dx, y = t.y - dy;
          if (G.world.cells[G.idx(x, y)] === 0 && !G.thingAt(x, y)) return place(x, y, d);
        }
      }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (G.world.cells[G.idx(x, y)] === 0 && !G.thingAt(x, y)) return place(x, y, 0);
    },
    fight(id) { if (!G.MONSTERS[id]) return console.warn('Monsters:', Object.keys(G.MONSTERS).join(', ')); if (need()) G.startCombat(id); },
    keys() { if (need()) { G.state.items.moonkey = 3; G.ui.renderInventory(); } },
    free(id) { if (need()) { G.state.flags['freed_' + id] = true; G.refreshThings(); G.dirty = true; } },
    heal() { if (need()) { G.state.hp = G.maxHp(); G.ui.renderHero(); } },
    level(n) { if (need()) { G.state.level = Math.max(1, Math.min(3, n)); G.save(); } },
    answers(on = true) {
      if (!G._origPuzzle) G._origPuzzle = G.numberPuzzle;
      G.numberPuzzle = on ? (t, l) => { const p = G._origPuzzle(t, l); console.log('answer:', p.answer); return p; } : G._origPuzzle;
    },
    reveal() { if (need()) { G.state.seen.fill(1); G.dirty = true; } },
  };
})();
