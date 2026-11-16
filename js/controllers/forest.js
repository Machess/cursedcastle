/* CONTROLLER — Chapter 2, the Whispering Wood (models/forest.js, views/forestView.js).
   The trip there and back (the world map), freeing the spirits (three puzzles of each spirit's own kind of maths), the card
   each one gives, the gates a freed spirit clears, hidden paths through the bushes, your partner spirit, and the ending.
   State: flags spirit_<id>, done_spirit_<id>, gateopen_<gate>, bush@<map>_<x>_<y>, forest (been there), witch2_beaten;
   state.partner = the spirit travelling with you. Battle rules for the partner and the forest friends: combat.js. */
(function () {
  const ui = G.ui, ri = G.ri, shuffle = G.shuffle;
  const fl = () => G.state.flags;
  G.spiritFree = (id) => !!(G.state && fl()['spirit_' + id]);
  G.spiritsFreed = () => G.SIX.filter(G.spiritFree).length;
  G.partnerIs = (id) => !!(G.state && G.state.partner === id);
  const inForest = () => G.zoneOf() === 'forest';

  /* ---------- there and back ---------- */
  function go(from, to, map, at, flag) {
    ui.closeModal(); ui.say('', '', []);
    G.worldTrip(from, to, () => {
      const s = G.state; if (flag) s.flags[flag] = 1;
      G.switchMap(map, at.x, at.y, at.dir); G.lastRegion = null; s.hp = G.maxHp(); G.save(); G.renderPartner(); G.arrived();
    });
  }
  G.toForest = () => go('castle', 'forest', 'forest', G.MAPS.forest.layout.start, 'forest');
  G.toCastle = () => go('forest', 'castle', 'castle', G.MAPS.castle.layout.respawn);

  /* ---------- things in the forest: gates, spirit objects, the cave's light ---------- */
  const baseRefresh = G.refreshThings;
  G.refreshThings = function () {
    baseRefresh.apply(this, arguments);
    if (!G.state) return;
    for (const t of G.things) if (t.kind === 'gate') t.hidden = !!fl()['gateopen_' + t.gate];
    G.LIGHT_LOOK.mood.cavern = G.spiritFree('ember') || fl().tool_lantern ? 1.1 : 0.85;   // Ember (or the Tinder Lantern) lights the caves
    if (G.renderPartner) G.renderPartner();
  };
  const names = (ids) => ids.map((k) => G.SPIRITS[k].name + ' the ' + G.SPIRITS[k].element.toLowerCase() + ' spirit');
  G.gatePrompt = function (th) {
    const g = G.GATES[th.gate], missing = g.needs.filter((k) => !G.spiritFree(k));
    if (missing.length) {
      const hint = th.gate === 'barrier' ? ` Spirits freed: ${G.spiritsFreed()} of 6.` : ` You need ${names(missing)[0]}.`;
      return ui.say(g.name, g.text + hint, [{ label: 'Step back', fn: () => G.act('back') }]);
    }
    G.lockInput = true; G.audio.sparkle();
    ui.say(g.name, g.gone, []);
    G.addFx(900, (k) => { th.alpha = 1 - k; th.lift = k * 0.15; G.dirty = true; }, () => {
      fl()['gateopen_' + th.gate] = 1; th.hidden = true; th.alpha = 1; th.lift = 0; G.lockInput = false; G.save(); G.dirty = true;
    });
  };

  /* ---------- hidden paths through the bushes ---------- */
  G.bushesFound = () => (G.MAPS.forest.layout.bush || []).filter(([x, y]) => fl()[`bush@forest_${x}_${y}`]).length;
  G.bushPath = function (x, y, a) {
    const w = G.world, i = G.idx(x, y); if (a !== 'fwd' || !w.bush || !w.bush[i]) return false;
    fl()[G.bushKey(x, y)] = 1; w.cells[i] = 0; delete w.bush[i]; w.treeAt[i] = null;
    if (w.theme[i] && w.theme[i].pathFloor) w.floorOv[i] = w.theme[i].pathFloor;
    if (G.audio.sweep) G.audio.sweep(); G.audio.sparkle(); G.heroFace('grin');
    const all = G.MAPS.forest.layout.bush.length, n = G.bushesFound();
    ui.sayNow(`Rustle, rustle... the bush was hiding a path! Hidden paths found: ${n} of ${all}.` + (n >= all ? ' That is all of them! Something shimmers at the Moon Pool...' : ''));
    G.save(); G.dirty = true;
    return true;
  };

  /* ---------- the spirits' puzzles: each has its own kind of maths, at the hero's level ---------- */
  function options(ans, spread) {
    const set = new Set([ans]); let guard = 0;
    while (set.size < 4 && guard++ < 60) { const v = ans + ri(-spread, spread); if (v >= 0 && v !== ans) set.add(v); }
    for (let v = ans + 1; set.size < 4; v++) set.add(v);
    return shuffle([...set]);
  }
  const Q = (sub, ans, spread) => ({ sub, answer: ans, options: options(ans, spread || Math.max(3, Math.round(ans / 4))) });
  const ASK = {
    sprig(L) {                                               // growing: doubling and times
      if (L === 1) { const n = ri(1, 6); return Q(`Sprig doubles everything! A plant has ${n} leaves. Double it: how many leaves now?`, n * 2); }
      if (L === 2) { const n = ri(6, 25); return Q(`A vine has ${n} flowers. Sprig DOUBLES them. How many flowers now?`, n * 2); }
      const a = ri(3, 9), b = ri(3, 9); return Q(`${a} branches grow ${b} acorns each. How many acorns altogether?`, a * b);
    },
    ember(L) {                                               // adding: counting embers
      if (L === 1) { const a = ri(2, 7), b = ri(1, 5); return Q(`The stove has ${a} embers. Add ${b} more. How many embers glow?`, a + b); }
      if (L === 2) { const a = ri(12, 30), b = ri(6, 19); return Q(`${a} sparks and ${b} more sparks fly up the chimney. How many sparks?`, a + b); }
      const a = ri(15, 40), b = ri(10, 30), c = ri(5, 20); return Q(`${a} sparks, then ${b}, then ${c} more. How many sparks altogether?`, a + b + c);
    },
    ripple(L) {                                              // pouring: taking away, and jugs
      if (L === 1) { const a = ri(5, 10), b = ri(1, 4); return Q(`A jug holds ${a} cups of water. You pour out ${b}. How many cups are left?`, a - b); }
      if (L === 2) { const a = ri(20, 40), b = ri(5, 18); return Q(`The well holds ${a} buckets. You pull up ${b}. How many buckets are left?`, a - b); }
      const j = ri(3, 6), c = ri(3, 6), o = ri(2, 9); return Q(`You pour in ${j} jugs of ${c} cups each, then pour ${o} cups out. How many cups are in the well?`, j * c - o);
    },
    whirl(L) {                                               // patterns: what comes next
      const step = L === 1 ? ri(1, 2) : L === 2 ? ri(3, 5) : ri(4, 9), down = L > 1 && Math.random() < 0.4;
      const s0 = down ? ri(40, 60) : ri(1, 12), seq = [0, 1, 2, 3].map((k) => s0 + (down ? -1 : 1) * step * k);
      return Q(`The wind chimes ring a pattern: ${seq.join(', ')}, ... What comes next?`, s0 + (down ? -1 : 1) * step * 4, step * 2 + 1);
    },
    pebble(L) {                                              // balance: the missing weight
      if (L === 1) { const a = ri(1, 5), b = a + ri(1, 5); return Q(`The scales must balance. One side has ${b} stones. The other has ${a}. How many more stones does it need?`, b - a); }
      if (L === 2) { const a = ri(6, 15), b = a + ri(4, 15); return Q(`${a} + ? = ${b}. Which weight makes the scales balance?`, b - a); }
      const n = ri(2, 6), w = ri(3, 9); return Q(`${n} stones that all weigh the same balance a ${n * w} kilo rock. How heavy is ONE stone?`, w);
    },
    fizz(L) {                                                // a number path: follow the steps
      if (L === 1) { const a = ri(2, 6), b = ri(1, 4), c = ri(1, 3); return Q(`Follow the spark: start at ${a}, hop +${b}, then hop back ${c}. Where does it land?`, a + b - c); }
      if (L === 2) { const a = ri(8, 20), b = ri(5, 12), c = ri(3, 9); return Q(`Follow the spark: start at ${a}, +${b}, then -${c}. Where does it land?`, a + b - c); }
      const a = ri(2, 6), b = ri(2, 5), c = ri(3, 12); return Q(`Follow the spark: start at ${a}, times ${b}, then +${c}. Where does it land?`, a * b + c);
    },
    luna(L) {                                                // fractions: halves and quarters, like the moon
      if (L === 1) { const n = ri(1, 6) * 2; return Q(`A half moon! What is HALF of ${n}?`, n / 2); }
      if (L === 2) { if (Math.random() < 0.5) { const n = ri(5, 20) * 2; return Q(`A half moon! What is HALF of ${n}?`, n / 2); } const n = ri(1, 8) * 4; return Q(`A quarter moon! What is a QUARTER of ${n}?`, n / 4); }
      const n = ri(2, 10) * 4; return Math.random() < 0.5 ? Q(`A quarter moon! What is a QUARTER of ${n}?`, n / 4) : Q(`The moon is three quarters full. What is THREE QUARTERS of ${n}?`, n / 4 * 3);
    },
  };
  G.SPIRIT_ASK = ASK;
  function release(id) {
    const S = G.SPIRITS[id]; let right = 0;
    const next = () => {
      if (right >= 3) return freed(id);
      const q = ASK[id](G.state.level);
      G.quiz({ title: `Free ${S.name}! Puzzle ${right + 1} of 3`, sub: q.sub, options: q.options, answer: q.answer, onDone: (ok) => { if (ok) right++; next(); } });
    };
    next();
  }
  function freed(id) {
    const s = G.state, S = G.SPIRITS[id], th = G.things.find((t) => t.spirit === id), card = G.CARDS[S.card];
    s.flags['spirit_' + id] = 1; s.flags['done_spirit_' + id] = 1;
    s.deck.push({ id: S.card, up: 0 });
    if (id === 'luna') { const m = s.seenBy.forest; if (m) m.fill(1); }
    G.audio.win(); G.heroFace('laugh'); ui.burst && ui.burst('sparkle', 358, 200, 12);
    if (th) { th.spr = G.SPR['fo_spirit_' + id]; G.addFx(1400, (k) => { th.lift = Math.sin(k * Math.PI) * 0.2; G.dirty = true; }, () => { th.spr = G.SPR[th.sprite]; th.lift = 0; G.dirty = true; }); }
    G.refreshThings(); G.save(); G.dirty = true;
    const n = G.spiritsFreed();
    const tail = id === 'luna' ? ' The whole forest is on your map now.' : n >= 6 ? " That is all six! The Witch's barrier cannot hold now." : ` Spirits freed: ${n} of 6.`;
    const partner = () => {
      if (!s.partner) { s.partner = id; G.save(); G.renderPartner(); return ui.say('Pip', `Hoo-hoo! ${S.name} wants to travel with you as your partner! ${S.partner} You can swap partners at the Spirit Stone in the camp.`, []); }
      const cur = G.SPIRITS[s.partner];
      ui.say('Pip', `${S.name} would love to be your partner. ${S.partner} (${cur.name} is with you now.)`, [
        { label: `Travel with ${S.name}`, fn: () => { G.setPartner(id); G.arrived(true); } }, { label: `Keep ${cur.name}`, fn: () => G.arrived(true) }]);
    };
    ui.say(S.name, S.free, [{ label: 'Next', fn: () => ui.say(S.name, `${S.name} gives you a card: ${card.name}! (${card.text.replace('?', card.min + ' to ' + card.max)}) ${S.does}${tail}`, [{ label: 'Next', fn: partner }]) }]);
  }
  G.freeSpirit = freed;                                      // (tests and dev tools)
  G.setPartner = function (id) { G.state.partner = id; G.save(); G.renderPartner(); G.audio.sparkle(); ui.toast(`${G.SPIRITS[id].name} is your partner now!`); };

  /* ---------- the Spirit Stone (choose a partner) and the signpost home ---------- */
  function stone() {
    const got = G.SPIRIT_ORDER.filter(G.spiritFree), box = ui.el('div', 'spirit-pick');
    if (!got.length) return ui.say('The Spirit Stone', 'An old stone with seven little hollows. None of them glows yet. Free a spirit and it can travel with you!', []);
    box.appendChild(ui.el('div', 'sub', 'Your partner floats along with you and helps in every battle.'));
    for (const id of got) {
      const S = G.SPIRITS[id], b = ui.el('button', 'sp-row' + (G.partnerIs(id) ? ' sel' : ''));
      const c = document.createElement('canvas'); c.width = c.height = 96; const p = G.SPR['fo_spirit_' + id]; if (p) c.getContext('2d').drawImage(p.c, 0, 0, 96, 96);
      b.append(c, ui.el('b', '', `${S.name} · ${S.element}`), ui.el('span', '', S.partner));
      b.style.setProperty('--pc', S.colour);
      ui.tap(b, () => { ui.closeModal(); G.setPartner(id); });
      box.appendChild(b);
    }
    ui.modal(box, { frame: 'Choose Your Partner', width: 760 });
  }
  const O = G.OBJECTS;
  for (const id in G.SPIRITS) {
    const S = G.SPIRITS[id];
    O['spirit_' + id] = { name: S.obj.replace(/^(a|an|her) /, (m) => m[0].toUpperCase() + m.slice(1)), verb: `Help ${id === 'luna' ? 'her' : 'it'}`,
      text: `${S.obj[0].toUpperCase() + S.obj.slice(1)}... and it is wobbling! A tiny voice squeaks: "Help! The Witch stuck me in here!" Solve three puzzles to break the spell.`,
      doneText: `Just ${S.obj.replace('her reflection in ', '')} now. ${S.name} is free!`, play: () => release(id) };
  }
  O.spirit_luna.ready = () => G.bushesFound() >= G.MAPS.forest.layout.bush.length || G.spiritsFreed() >= 6;
  O.spirit_luna.notReady = 'A round, silver pool. Only the moon looks back at you... for now. (They say it shows its secret to someone who has found every hidden path, or freed all six spirits.)';
  O.spirit_luna.text = 'The moon in the pool is... blinking at you! A soft voice whispers: "You found me. Three moon riddles, and I am free."';
  O.spiritstone = { name: 'The Spirit Stone', text: 'An old stone with seven little hollows, one for each spirit of the wood.', verb: 'Choose a partner', doneText: '', play: stone };
  O.signpost = { name: 'A Signpost', text: 'It points down the path behind you: "Moonstone Castle". Your friends there would love a visit. You can come back to the forest any time.', verb: 'Walk to the castle', doneText: '', play: () => G.toCastle() };
  for (const t of G.MAPS.forest.things) if (t.berries) O[t.id] = { name: 'A Berry Bush', verb: 'Pick the berries', doneText: 'You picked these already. More will grow one day!',
    text: 'A bush full of fat, shiny forest berries at the end of the path. Nobody has found these yet!',
    play: () => { fl()['done_' + t.id] = 1; G.giveItem('cheese', 1); G.audio.sparkle(); G.heroFace('grin'); G.refreshThings(); G.save();
      ui.say('A Berry Bush', 'Yum! You pick a handful of sweet forest berries. (They fill your tummy just like Royal Cheese: +1 Royal Cheese.)', []); } };
  const basePrompt = G.objectPrompt;
  G.objectPrompt = function (th) { if (th.id === 'spiritstone') return stone(); return basePrompt.apply(this, arguments); };

  /* ---------- hints, the journal, and the ending ---------- */
  const baseHint = G.hintText;
  G.hintText = function () {
    if (!inForest()) return baseHint.apply(this, arguments);
    const n = G.spiritsFreed(), f = G.facing(), tree = G.world.bush && G.world.bush[G.idx(f.x, f.y)];
    ui.sayNow(tree ? 'This bush is rustling... and it has flowers on it. Try walking into it!'
      : fl().witch2_beaten ? 'The wood is peaceful again. The spirits dance between the trees.' : whereNext(n));
  };
  /* a hint that points somewhere: the nearest thing worth walking to from here (a bound spirit, else a way into the
     hut or the caves that still hold one, else the way out, else the gate in the way), and which way to set off */
  const WAY = ['north', 'east', 'south', 'west'], STEP = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function whereNext(n) {
    const w = G.world, s = G.state, map = G.mapId(), N = w.cells.length, from = new Int32Array(N).fill(-1), dist = new Int32Array(N).fill(-1);
    const stop = new Set(G.things.filter((t) => t.kind === 'gate' && !(G.GATES[t.gate] && G.GATES[t.gate].needs.every(G.spiritFree))).map((t) => G.idx(t.x, t.y)));
    const start = G.idx(s.x, s.y), q = [start]; dist[start] = 0; const edge = [];       // gates the walk ran into
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % w.w, y = (i / w.w) | 0;
      for (let d = 0; d < 4; d++) { const u = x + STEP[d][0], v = y + STEP[d][1]; if (u < 0 || v < 0 || u >= w.w || v >= w.h) continue;
        const j = v * w.w + u; if (dist[j] >= 0) continue; if (stop.has(j)) { dist[j] = dist[i] + 1; from[j] = i; edge.push(j); continue; }
        const c = w.cells[j]; if (c !== 0 && c !== 2) continue; dist[j] = dist[i] + 1; from[j] = i; q.push(j); } }
    const leg = (j) => { let i = j; while (from[i] !== start && from[i] >= 0) i = from[i]; const dx = (i % w.w) - s.x, dy = ((i / w.w) | 0) - s.y; return WAY[STEP.findIndex(([a, b]) => a === dx && b === dy)] || 'on'; };
    const near = (list) => list.filter((t) => dist[G.idx(t.x, t.y)] > 0).sort((a, b) => dist[G.idx(a.x, a.y)] - dist[G.idx(b.x, b.y)])[0];
    const area = (t) => { const r = G.ROOMS[w.region[G.idx(t.x, t.y)]]; return r && r.name ? ' It is in ' + (/^the /i.test(r.name) ? r.name : 'the ' + r.name) + '.' : ''; };
    const bound = (m) => G.SPIRIT_ORDER.filter((id) => !G.SPIRITS[id].hidden && !G.spiritFree(id) && (G.MAPS[m].things || []).some((t) => t.spirit === id));
    if (n >= 6) { const g = near(G.things.filter((t) => t.kind === 'gate' && t.gate === 'barrier')) || near(G.things.filter((t) => t.kind === 'monster' && t.id === 'witch2'));
      return "All six spirits are free! The Witch's barrier is north of the Old Ruins, up the Mushroom Path." + (g ? ` Set off to the ${leg(G.idx(g.x, g.y))}.` : ''); }
    const sp = near(G.things.filter((t) => t.spirit && !G.spiritFree(t.spirit) && !G.SPIRITS[t.spirit].hidden));
    if (sp) { const S = G.SPIRITS[sp.spirit]; return `Spirits freed: ${n} of 6. ${S.name} is bound to ${S.obj}.${area(sp)} Set off to the ${leg(G.idx(sp.x, sp.y))}.`; }
    const ports = G.PORTALS.filter((p) => p.map === map && (!p.show || p.show()) && dist[G.idx(p.x, p.y)] > 0);
    const inn = ports.filter((p) => p.to && p.to.map !== 'forest' && bound(p.to.map).length).sort((a, b) => dist[G.idx(a.x, a.y)] - dist[G.idx(b.x, b.y)])[0];
    if (inn) { const S = G.SPIRITS[bound(inn.to.map)[0]]; return `Spirits freed: ${n} of 6. ${S.name} is bound to ${S.obj} ${inn.to.map === 'hut' ? 'inside the Honey Hut' : 'down in the Glowcap Caves'}. Set off to the ${leg(G.idx(inn.x, inn.y))}.`; }
    if (map !== 'forest') { const out = ports.filter((p) => p.to && p.to.map === 'forest').sort((a, b) => dist[G.idx(a.x, a.y)] - dist[G.idx(b.x, b.y)])[0];
      if (out) return `Nothing more to free in here. The way back out is to the ${leg(G.idx(out.x, out.y))}.`; }
    const gate = edge.map((j) => G.things.find((t) => t.kind === 'gate' && G.idx(t.x, t.y) === j)).filter((t) => t && G.GATES[t.gate] && G.GATES[t.gate].needs.length === 1)[0];
    if (gate) { const need = G.SPIRITS[G.GATES[gate.gate].needs[0]]; return `Spirits freed: ${n} of 6. ${G.GATES[gate.gate].name.replace(/^A /, 'A ')} is in the way. ${need.name}, the ${need.element.toLowerCase()} spirit, could clear it.`; }
    return `Spirits freed: ${n} of 6. Look for things that sparkle: the Witch bound the spirits to them.`;
  }
  G.forestJournal = function () {
    const s = G.state; if (!s || !s.flags.forest) return '';
    const row = (id) => { const S = G.SPIRITS[id], ok = G.spiritFree(id); if (S.hidden && !ok) return `<li class="todo">${ui.svg.todo || ''} ??? · a hidden spirit</li>`;
      return `<li class="${ok ? 'done' : 'todo'}">${ok ? ui.svg.tick : ui.svg.todo || ''} ${S.name} · ${S.element}${ok ? (G.partnerIs(id) ? ' (your partner)' : '') : ': bound to ' + S.obj}</li>`; };
    return `<h3>The Whispering Wood</h3><div class="sub">Free the six spirits to break the Witch's barrier. Spirits freed: ${G.spiritsFreed()} of 6 · Hidden paths: ${G.bushesFound()} of ${G.MAPS.forest.layout.bush.length}</div>
      <ul class="quest clean-book">${G.SPIRIT_ORDER.map(row).join('')}</ul>`;
  };
  G.ending2 = function () {
    if (G.voice && G.voice.has('witch2-freed')) G.voice.say('witch2-freed');   // Wanda: "My portal! NOOO!" as she zooms off
    const s = G.state, box = ui.el('div');
    box.innerHTML = `<h2>You saved the Whispering Wood!</h2>
      <div class="sub">The ring of mushrooms stops glowing and the portal fizzles out. The spirits dance round you in a circle!<br>
      But Wanda escaped again, over the treetops... to the Dragon's mountain.<br><br><b style="color:#f2c94c">To be continued...</b></div>
      <div class="sub">Spirits freed: ${G.SPIRIT_ORDER.filter(G.spiritFree).length} of 7 • Puzzles solved: ${s.solved || 0} • Friends freed: ${s.wins || 0}</div>`;
    const row = ui.el('div', 'row');
    const a = ui.el('button', 'btn', 'Keep exploring'); ui.tap(a, () => { ui.closeModal(); G.refreshThings(); ui.say('Mushroom Circle', 'The circle is quiet now. Only a few purple sparkles drift between the mushrooms.', []); });
    const b = ui.el('button', 'btn gold', 'Back to the title'); ui.tap(b, () => { ui.closeModal(); G.toMenu(); });
    row.append(a, b); box.appendChild(row);
    ui.modal(box, { close: false, width: 820 });
  };
})();
