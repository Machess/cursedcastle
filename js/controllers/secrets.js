/* CONTROLLER — Secret rooms. A secret wall (castle.js LAYOUT.secrets) looks a little odd: a crack, a mouse hole,
   purple vines, a golden crest. Standing in front of it gives a hint; tapping the odd bit (a few times) opens it with
   its own move (crumbles down, slides aside, parts like curtains) and it stays an open gap into the secret room.
   Each secret room has a treasure to find (G.OBJECTS sec_*), and three of them hold a piece of a map that opens the
   last one: the Royal Treasury. */
(function () {
  const ui = G.ui;
  const secrets = () => (G.LAYOUT && G.LAYOUT.secrets) || [];
  const taps = {};                                     // taps on each secret wall so far
  G.secretsFound = () => { const f = (G.state && G.state.flags) || {}; return ((G.MAPS.castle.layout.secrets) || []).filter((s) => f['secret_' + s.id]).length; };
  G.secretsTotal = () => ((G.MAPS.castle.layout.secrets) || []).length;
  const codeOf = (s) => { const dx = s.from[0] - s.x, dy = s.from[1] - s.y; return dx === -1 ? 1 : dx === 1 ? 0 : dy === -1 ? 3 : 2; };   // the wall face you see it from

  /* buildWorld: a found secret is an open gap into its room; a hidden one stays wall (world.secret marks it) */
  G.applySecrets = function (w) {
    w.secret = new Array(w.w * w.h).fill(null);
    const f = G.state ? G.state.flags : {};
    for (const s of secrets()) {
      const i = s.y * w.w + s.x;
      if (f['secret_' + s.id]) { w.cells[i] = 0; w.region[i] = s.room; } else { w.cells[i] = 1; w.secret[i] = s; }
    }
  };
  /* the odd bit on each hidden secret wall (wallLook.js calls this when it places the wall marks) */
  G.secretTells = function (w, marks) {
    w.tellOv = {};
    if (!w.secret) return;
    const markIdx = {}; G.MARKS.forEach((m, i) => { markIdx[m.name] = i; });
    for (const s of secrets()) {
      const i = s.y * w.w + s.x; if (!w.secret[i]) continue;
      const key = i * 4 + codeOf(s), S0 = G.TEX_SIZE || 128;
      const T = G.TELL_LAYERS || {}, maps = ['map1', 'map2', 'map3'].every((k) => G.state.items[k] > 0);
      const img = s.tell.full && maps ? s.tell.full : s.tell.open && taps[s.id] ? s.tell.open : s.tell.img;   // the mouse opens his door, the crest fills up
      if (img && T[img]) w.tellOv[key] = T[img];
      else if (s.tell.mark && markIdx[s.tell.mark] != null) {
        const mi = markIdx[s.tell.mark], M = G.MARKS[mi];
        const mx = Math.round((S0 - M.w) / 2), my = s.tell.mark === 'mousehole' ? S0 - M.h : Math.round(S0 * 0.32);
        marks[key] = (mi + 1) | (mx << 8) | (my << 16);
      } else if (s.tell.deco && G.TELL_LAYERS && G.TELL_LAYERS[s.tell.deco]) w.tellOv[key] = G.TELL_LAYERS[s.tell.deco];
    }
  };

  /* standing right in front of one: a hint (once each time you come by) */
  const hinted = {};
  G.secretHint = function () {
    const w = G.world, s = G.state, f = G.facing(); if (!w || !w.secret) return false;
    const sc = w.secret[G.idx(f.x, f.y)];
    if (!sc || sc.from[0] !== s.x || sc.from[1] !== s.y) return false;
    if (hinted[sc.id] === s.steps) return false; hinted[sc.id] = s.steps;
    ui.sayNow(sc.hint + ' (Tap it!)');
    return true;
  };

  /* tapping the 3D view: is it a hidden secret wall (near enough)? */
  G.secretTapAt = function (p) {
    const P = G.renderer && G.renderer.pk, w = G.world; if (!P || !w || !w.secret) return false;
    const col = Math.max(0, Math.min(P.perp.length - 1, p.x | 0)), idx = P.key[col] >> 2, sc = w.secret[idx];
    if (!sc || P.perp[col] > 2.6) return false;
    const n = sc.need === 'maps' ? ['map1', 'map2', 'map3'].filter((k) => G.state.items[k] > 0).length : 3;
    if (sc.need === 'maps' && n < 3) { G.audio.bonk(); ui.say('A Golden Crest', sc.notYet(n), []); return true; }
    taps[sc.id] = (taps[sc.id] || 0) + 1;
    shake(3); ui.burst('sparkle', p.sx, p.sy, 5);
    if (sc.id === 'mice') G.audio.squeak(); else if (sc.id === 'closet') G.audio.pop(); else G.audio.bonk();
    if (sc.tell.open && taps[sc.id] === 1) G.world.marks = null;    // the mouse opens his little door
    if (taps[sc.id] >= sc.taps) reveal(sc);
    else ui.sayNow(sc.tapLines[Math.min(taps[sc.id], sc.tapLines.length) - 1]);
    return true;
  };
  function shake(px) { G.addFx(260, (k) => { G.cam.bob = Math.sin(k * 30) * px * (1 - k); G.dirty = true; }, () => { G.cam.bob = 0; }); }

  /* the wall opens: the renderer draws world.sink (renderer.js column) */
  function reveal(sc) {
    const w = G.world, i = sc.y * w.w + sc.x;
    G.lockInput = true;
    G.audio.door(); if (sc.open === 'down') G.audio.thunder(0.04);
    w.sink = { idx: i, mode: sc.open, k: 0 };
    G.addFx(1500, (k) => {
      w.sink.k = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      G.cam.bob = sc.open === 'down' ? Math.sin(k * 60) * 3 * (1 - k) : 0; G.dirty = true;
    }, () => {
      G.cam.bob = 0; w.sink = null;
      G.state.flags['secret_' + sc.id] = 1;
      w.cells[i] = 0; w.region[i] = sc.room; w.theme[i] = G.TEX[G.ROOMS[sc.room].theme]; w.secret[i] = null;
      w.marks = null; w.beams = null; if (G.renderer) G.renderer.L = null;
      G.audio.sparkle(); G.audio.fanfare(true);
      G.save(); G.dirty = true; G.lockInput = false;
      ui.say('A Secret Room!', sc.found, []);
    });
  }

  /* ---------- the treasures inside ---------- */
  function give(items, cardId) {
    for (const k in items) G.giveItem(k, items[k]);
    if (cardId) G.state.deck.push({ id: cardId, up: 0 });
    G.audio.win(); G.refreshThings(); if (G.world) G.world.marks = null;   // (the crest fills up with the map pieces)
    G.dirty = true; G.save(); if (ui.renderHero) ui.renderHero();
  }
  const done = (id) => { G.state.flags['done_' + id] = 1; };
  const goldCard = () => ({ warrior: 'w_gold', rogue: 'r_gold', wizard: 'm_gold' }[G.state.cls] || 'w_gold');
  Object.assign(G.OBJECTS, {
    sec_armoury: {
      name: "Sir Sneezalot's Old Armour", verb: 'Look inside the helmet', secret: true,
      text: 'A dusty suit of armour. Something golden glints inside the helmet...',
      doneText: 'The old armour stands proudly. Sir Sneezalot will be so happy you found his things!',
      play() {
        done('sec_armoury'); give({ hanky: 1, map1: 1 }, goldCard());
        ui.say('Treasure!', `Inside the helmet: Sir Sneezalot's Lucky Hanky, a torn Map Piece, and a GOLDEN CARD: ${G.CARDS[goldCard()].name}! It is in your deck now.`, []);
      },
    },
    sec_mice: {
      name: 'The Mouse Party', verb: 'Join the party', secret: true,
      text: 'The mice are having a cheese party! The mouse mayor climbs onto the cheese and squeaks a speech about you.',
      doneText: 'The mice wave their tiny cheese cups at you. Squeak!',
      play() {
        done('sec_mice'); give({ goldcheese: 1, map2: 1 });
        ui.say('Treasure!', '"For the friend of Nibbles!" The mice give you their GOLDEN CHEESE (+5 max health) and an old Map Piece they found in the wall.', []);
      },
    },
    sec_closet: {
      name: 'The Glowing Plant', verb: 'Water the plant', secret: true,
      text: 'A little plant glows softly in a flower pot. Its soil is very dry.',
      doneText: 'The little plant glows happily.',
      play() {
        done('sec_closet'); give({ clover: 1, map3: 1 });
        ui.say('Treasure!', 'Glug glug... the plant grows a shiny LUCKY CLOVER! (Start every battle with 3 block.) Under the pot is a muddy Map Piece.', []);
      },
    },
    sec_treasury: {
      name: 'The Royal Crown', verb: 'Lift the crown', secret: true,
      text: 'On a velvet cushion sits the real crown of Moonstone Castle, lost for a hundred years.',
      doneText: 'The treasury sparkles. You found every secret in the castle!',
      play() {
        done('sec_treasury'); G.state.flags.treasure_hunter = 1; give({ royalcrown: 1 });
        ui.say('Pip', '"HOO HOO! The Royal Crown! You found every secret in the whole castle. You are a real Treasure Hunter!" (+10 max health)', []);
      },
    },
  });
  // golden cards use a picture of the hero's best move until they get their own
  if (G.CARD_ART) for (const [g, from] of [['w_gold', 'w_mighty'], ['r_gold', 'r_flurry'], ['m_gold', 'm_fire']]) if (!G.CARD_ART[g] && G.CARD_ART[from]) G.CARD_ART[g] = G.CARD_ART[from];
})();
