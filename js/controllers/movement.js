/* CONTROLLER — Grid movement, doors, arriving in rooms, talking, interacting, items. */
(function () {
  const DIRS = G.DIRS;
  /* ---------- movement ---------- */
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  G.busy = () => !!G.anim || G.ui.modalOpen() || (G.combat && G.combat.active) || G.lockInput;

  G.act = function (a) {
    if (G.ui.modalOpen() || (G.combat && G.combat.active) || G.lockInput) return;
    if (G.anim) { G.queued = a; return; }
    const s = G.state;
    if (a === 'turnL' || a === 'turnR') {
      const d = a === 'turnL' ? -1 : 1;
      const from = G.cam.a; s.dir = (s.dir + 4 + d) % 4;
      G.audio.turn();
      G.anim = { type: 'turn', t0: performance.now(), dur: 190, fa: from, ta: from + d * Math.PI / 2 };
      return;
    }
    const off = { fwd: 0, right: 1, back: 2, left: 3 }[a];
    const [dx, dy] = DIRS[(s.dir + off) % 4];
    const nx = s.x + dx, ny = s.y + dy, i = G.idx(nx, ny), w = G.world;
    const cell = w.cells[i];
    const portal = G.portalAt(nx, ny);                     // a trap door or a ladder (models/maps.js)
    if (portal) { if (a === 'fwd') return G.usePortal(portal); if (portal.kind !== 'hatch') return bump(dx, dy); }
    if (cell === 2 && !G.standingIn(nx, ny)) {             // doors are always shut: walking through is one move (G.passDoor)
      if (a === 'fwd') return G.tryDoor(nx, ny);
      return bump(dx, dy);
    }
    if (G.mildredBump && G.mildredBump(nx, ny, a, () => bump(dx, dy))) return;   // say hello to Mildred (cleaning.js)
    const th = G.thingAt(nx, ny), blk = G.blockAt(nx, ny);
    if (cell === 3 && G.bushPath && G.bushPath(nx, ny, a)) return;   // a hidden path through the bushes (forest.js)
    if (cell === 1 || cell === 3 || th || blk) {
      bump(dx, dy);
      const on = th || G.thingOnBlock(blk);               // walking into the bed reaches Big Barry in it (blocks.js)
      if (on && a === 'fwd') setTimeout(() => G.interact(on), 230);
      else if (blk && a === 'fwd') G.ui.sayNow(blk.say || 'That is in the way. Walk around it!');
      return;
    }
    s.x = nx; s.y = ny; s.steps++;
    G.audio.stepOn(G.floorSound(nx, ny));
    const pk = G.pickupAt(nx, ny); if (pk) setTimeout(() => G.collect(pk), 200);   // walked onto something lying on the floor
    G.anim = { type: 'move', t0: performance.now(), dur: 230, fx: G.cam.x, fy: G.cam.y, tx: nx + 0.5, ty: ny + 0.5 };
  };
  function bump(dx, dy) {
    G.audio.bonk();
    G.anim = { type: 'bump', t0: performance.now(), dur: 220, fx: G.cam.x, fy: G.cam.y, dx, dy };
  }

  /* ---------- leaning in ----------
     Standing still in front of something you can use (a friend, a cursed monster, a chest, a locked door, a ladder),
     the view leans in a little, as if stepping up to look at it; walk or turn away and it eases back
     (renderer.js: cam.back). Battles and stairs move the camera themselves (combat.js, portals.js). */
  G.LEAN_BACK = 0.33;
  let leanT = 0;
  G.updateLean = function (now) {
    const dt = Math.min(0.1, (now - (leanT || now)) / 1000); leanT = now;
    const c = G.cam; if (!c || G.combat || G.lockInput) return false;
    const f = G.facing(), door = G.world.cells[G.idx(f.x, f.y)] === 2;
    const target = !G.anim && (G.facingSomething() || door) ? G.LEAN_BACK : G.VIEW_BACK;
    const cur = c.back != null ? c.back : G.VIEW_BACK;
    if (Math.abs(target - cur) < 0.002) { c.back = target === G.VIEW_BACK ? null : target; return false; }
    c.back = cur + (target - cur) * (1 - Math.exp(-dt / (target < cur ? 0.16 : 0.09)));   // lean in gently, back out a bit quicker
    return true;
  };

  // bump: walking into a wall is a small nudge (0.09 of a square), not a crash
  G.updateAnim = function (now) {
    const an = G.anim; if (!an) return false;
    let t = Math.min(1, (now - an.t0) / an.dur); const e = ease(t);
    if (an.type === 'turn') G.cam.a = an.fa + (an.ta - an.fa) * e;
    else if (an.type === 'move') { G.cam.x = an.fx + (an.tx - an.fx) * e; G.cam.y = an.fy + (an.ty - an.fy) * e; G.cam.bob = Math.sin(t * Math.PI) * 5; }
    else if (an.type === 'bump') { const k = Math.sin(t * Math.PI) * 0.09; G.cam.x = an.fx + an.dx * k; G.cam.y = an.fy + an.dy * k; }
    else if (an.type === 'pass') {                 // through a door: it opens, you glide through two squares, it shuts behind you
      const el = now - an.t0, OPEN = 330, MOVE = an.dur - OPEN;
      const k = el < OPEN ? 0 : ease((el - OPEN) / MOVE);
      G.cam.x = an.fx + (an.tx - an.fx) * k; G.cam.y = an.fy + (an.ty - an.fy) * k;
      G.cam.bob = Math.sin(k * Math.PI * 2) * 3.5;
      if (k > 0.3 && !an.step1) { an.step1 = true; G.audio.stepOn(G.floorSound(an.tx | 0, an.ty | 0)); }
      if (k > 0.72 && !an.shut) { an.shut = true; G.world.doorTarget[an.door] = 0; setTimeout(() => G.audio.doorShut(), 260); }
    }
    if (t >= 1) {
      G.cam.bob = 0;
      if (an.type === 'turn') { G.cam.a = ((G.state.dir * Math.PI / 2)); }
      if (an.type === 'bump') { G.cam.x = an.fx; G.cam.y = an.fy; }
      if (an.type === 'pass') { G.cam.x = an.tx; G.cam.y = an.ty; }
      const w = G.world; if (w.doorLeave != null && G.idx(G.state.x, G.state.y) !== w.doorLeave) { w.doorTarget[w.doorLeave] = 0; w.doorLeave = null; }
      G.anim = null;
      if (an.type !== 'bump') G.arrived();
      if (G.queued) { const q = G.queued; G.queued = null; G.act(q); }
    }
    return true;
  };

  /* ---------- doors ---------- */
  /* Doors stay shut. A locked door (rune, moon, gate) is unlocked once (a flag), then works like any other door:
     walking into it opens it, carries you through in one smooth move, and shuts it behind you. */
  const FLOOR = { outside: 'grass', greenhouse: 'grass', dining: 'wood', gallery: 'wood', tower: 'wood', library: 'carpet', toyroom: 'carpet',
    bedroom: 'carpet', forest: 'grass', marsh: 'grass', ruins: 'grass', circle: 'grass', foresthut: 'grass', hall: 'tile', kitchen: 'tile', bathroom: 'tile', ballroom: 'tile' };   // everything else: stone
  G.floorSound = (x, y) => { const r = G.world.region[G.idx(x, y)]; return (r && FLOOR[G.ROOMS[r].theme]) || 'stone'; };
  G.standingIn = (x, y) => G.state.x === x && G.state.y === y;          // old saves may stand in a doorway
  G.openDoor = function (x, y) {                    // unlock a door and go straight through
    G.state.flags[G.doorKey(x, y)] = true; G.save();
    const p = G.portalAt(x, y); if (p) return G.usePortal(p);   // the Moon Door opens onto the stairs: climb them
    G.passDoor(x, y);
  };
  G.passDoor = function (x, y) {
    const s = G.state, w = G.world, dx = x - s.x, dy = y - s.y, bx = x + dx, by = y + dy, i = G.idx(x, y);
    const beyond = w.cells[G.idx(bx, by)] === 0 && !G.thingAt(bx, by) && !G.blockAt(bx, by);
    w.doorTarget[i] = 1; G.audio.doorOpen(w.doorStyle[i] || w.doorType[i]);
    if (!beyond) {                                   // something stands right behind it: peek, then shut
      setTimeout(() => { w.doorTarget[i] = 0; G.audio.doorShut(); }, 900);
      const th = G.thingAt(bx, by); if (th) G.ui.sayNow('Something is standing right behind the door!');
      return;
    }
    s.x = bx; s.y = by; s.steps++;
    G.anim = { type: 'pass', t0: performance.now(), dur: 1000, fx: G.cam.x, fy: G.cam.y, tx: bx + 0.5, ty: by + 0.5, door: i };
  };
  let doorT = 0;
  G.updateDoors = function (now) {
    const w = G.world, dt = Math.min(0.1, (now - (doorT || now)) / 1000); doorT = now;
    let any = false;
    for (const k in w.doorTarget) {
      const to = w.doorTarget[k], cur = w.doorOpen[k], step = dt / 0.33;
      w.doorOpen[k] = to > cur ? Math.min(to, cur + step) : Math.max(to, cur - step);
      any = true;
      if (w.doorOpen[k] === to) delete w.doorTarget[k];
    }
    return any;
  };
  G.tryDoor = function (x, y) {
    const w = G.world, i = G.idx(x, y), type = w.doorType[i];
    if (type === 'd' || G.state.flags[G.doorKey(x, y)]) { G.passDoor(x, y); return; }   // a plain door, or one already unlocked
    if (type === 'g' || type === 'r') {
      const title = type === 'g' ? 'The Castle Gate' : 'Rune Door';
      G.ui.say(title, type === 'g'
        ? 'A glowing purple rune locks the gate. Solve the Witch\'s rune puzzle to break the lock!'
        : 'A purple rune glows on this door. It smells like old books on the other side.', [
        { label: 'Touch the rune', fn: () => G.runeLock(type === 'g' ? 2 : 3, () => { G.ui.say(title, 'The rune shatters into sparkles! The door creaks open.', []); setTimeout(() => G.openDoor(x, y), 700); }) },
        { label: 'Not yet', fn: () => G.arrived(true) },
      ]);
      return;
    }
    if (type === 'm') {
      const k = G.state.items.moonkey || 0;
      if (k >= 3) {
        G.ui.say('The Moon Door', 'Your three Moon Keys glow like little moons... CLICK, CLICK, CLICK! The door swings open.', []);
        G.audio.sparkle(); setTimeout(() => G.openDoor(x, y), 900);
      } else G.ui.say('The Moon Door', `A silver door with three moon-shaped keyholes. You have ${k} of 3 Moon Keys. Free the castle's cursed friends to find them!`, []);
    }
  };

  /* ---------- arriving & facing ---------- */
  G.facing = function () {
    const s = G.state, [dx, dy] = DIRS[s.dir];
    return { x: s.x + dx, y: s.y + dy };
  };
  G.arrived = function (quiet) {
    const s = G.state, w = G.world;
    const r = w.region[G.idx(s.x, s.y)];
    if (r && r !== G.lastRegion) {
      G.lastRegion = r;
      G.ui.setRoomName(G.ROOMS[r].name);
      const first = !s.visited[r];
      G.ui.roomBanner(r, first);                          // the room's name drops in like an announcement (ui.js)
      if (first) {
        s.visited[r] = 1;
        const ahead = G.facingSomething();
        G.ui.say(G.ROOMS[r].name, G.ROOMS[r].intro, ahead ? [{ label: 'Continue', fn: ahead }] : []);
        G.save();
        G.dirty = true;
        return;
      }
    }
    if (!quiet && meetNearby()) return;                    // next to Sir Sneezalot for the first time: turn to him (he starts talking)
    const ahead = G.facingSomething();
    if (ahead) { ahead(); return; }
    if (!quiet) {
      if (G.secretHint && G.secretHint()) return;           // in front of an odd-looking wall (secrets.js)
      G.shimmerHint();                                       // the first few times: sparkle on things you can poke (poke.js)
      if (s.steps % 25 === 0) G.save();
      G.ui.say(G.ROOMS[r] ? G.ROOMS[r].name : '', '', []);
      G.hintText();
    }
  };
  /* returns a function that opens whatever the hero is facing (monster, friend, object, locked door), or null */
  /* someone who wants to talk to you is right next to you (not just in the room): turn to face them; arriving at the
     end of the turn opens the talk, as walking up to them does */
  function meetNearby() {
    const s = G.state; if (s.flags.metSneezalot) return false;
    const t = G.things && G.things.find((q) => q.id === 'sneezalot' && !q.hidden); if (!t) return false;
    const d = DIRS.findIndex(([dx, dy]) => s.x + dx === t.x && s.y + dy === t.y);
    if (d < 0 || d === s.dir) return false;
    G.faceDir(d); return true;
  }
  G.faceDir = function (d) {
    const s = G.state; let k = (d - s.dir + 4) % 4; if (k === 3) k = -1;
    const from = G.cam.a; s.dir = d; G.audio.turn();
    G.anim = { type: 'turn', t0: performance.now(), dur: 190 * Math.abs(k), fa: from, ta: from + k * Math.PI / 2 };
  };
  G.facingSomething = function () {
    const w = G.world, f = G.facing(), fi = G.idx(f.x, f.y), th = G.thingAt(f.x, f.y) || G.thingOnBlock(G.blockAt(f.x, f.y));
    if (th && (th.kind === 'monster' || th.kind === 'npc' || th.kind === 'object' || th.kind === 'gate')) return () => G.interact(th);
    const p = G.portalAt(f.x, f.y); if (p && p.kind === 'ladder') return () => G.usePortal(p);
    if (w.cells[fi] === 2 && w.doorType[fi] !== 'd' && w.doorType[fi] !== 'l' && !G.state.flags[G.doorKey(f.x, f.y)]) return () => G.tryDoor(f.x, f.y);   // still locked
    return null;
  };
  G.hintText = function () {
    const s = G.state, w = G.world, f = G.facing(), fi = G.idx(f.x, f.y);
    let t = 'Use the arrows to explore. Swipe the picture to turn and walk.';
    if (w.cells[fi] === 2) t = 'A door! Walk forward to go through.';
    else if (s.visited.E && !s.flags.freed_rat) t = 'Sir Sneezalot said to try the West Hallway. Follow the smell of cheese!';
    else if ((s.items.moonkey || 0) >= 3) t = 'You have all 3 Moon Keys! The Moon Door is up the Spiral Stairs, north of the North Hall.';
    else if (Math.random() < 0.5) t = `Moon Keys found: ${s.items.moonkey || 0} of 3. Tap Quest to see what to do next.`;
    G.ui.sayNow(t);
  };

  G.interact = function (th) {
    if (!th) return;
    if (th.kind === 'monster') return G.monsterPrompt(th);
    if (th.kind === 'npc') return th.id === 'mildred' ? G.mildredTalk(th) : G.npcTalk(th);
    if (th.kind === 'object') return G.objectPrompt(th);
    if (th.kind === 'gate') return G.gatePrompt(th);     // something a freed spirit clears away (forest.js)
    if (th.kind === 'prop') G.ui.sayNow('That is in the way. Walk around it!');
  };

  G.monsterPrompt = function (th) {
    const m = G.MONSTERS[th.id], s = G.state;
    if (s.flags['freed_' + th.id]) { if (G.friendTool && G.friendTool(th.id)) return; G.ui.say(m.freedName || m.name, m.chat || 'Thank you for breaking my curse, hero!', []); return; }   // a cleaning tool first (cleaning.js)
    const ch = [{ label: 'Break the curse!', fn: () => G.startCombat(th.id) },
      { label: 'Look closer', fn: () => { G.ui.say(m.name, m.clue, [{ label: 'Break the curse!', fn: () => G.startCombat(th.id) }, { label: 'Step back', fn: () => G.act('back') }]); } }];
    if (th.id === 'troll' && !s.flags.trollKey) ch.splice(1, 0, { label: 'Sneak to the pillow', fn: () => G.sneakGame() });
    if (th.id === 'witch' && !s.flags.witchMet) s.flags.witchMet = 1;
    ch.push({ label: 'Step back', fn: () => G.act('back') });
    G.ui.say(m.name, m.intro, ch);
  };

  G.npcTalk = function (th) {
    const lines = G.NPC_LINES[th.id]; let i = 0;
    const s = G.state;
    if (s.flags.metSneezalot) {
      if (G.sneeze) G.sneeze();
      G.ui.say('Sir Sneezalot', s.flags.witch_beaten ? 'ACHOO! You did it! The castle is free... but the Witch flew over the Whispering Wood behind the castle. Shall I show you the way?' : `ACHOO! Moon Keys: ${s.items.moonkey || 0} of 3. Remember: read each monster's clue before you fight!`,
        (s.flags.witch_beaten ? [{ label: 'Go to the Whispering Wood', fn: () => G.toForest() }] : []).concat(
        [{ label: 'Tell me everything again', fn: () => { s.flags.metSneezalot = 0; G.npcTalk(th); } }, { label: 'Bye!', fn: () => G.arrived(true) }]));
      return;
    }
    const next = () => {
      if (i >= lines.length) {
        s.flags.metSneezalot = 1; s.items.pepper = (s.items.pepper || 0) + 1; G.ui.renderInventory(); G.save();
        G.ui.say('Sir Sneezalot', 'Take this Spicy Pepper for luck. Now go, brave hero! ACHOO!', []);
        setTimeout(() => G.sneeze && G.sneeze(), 900);
        G.ui.toast('Got a Spicy Pepper!');
        return;
      }
      G.ui.say('Sir Sneezalot', lines[i++], [{ label: i < lines.length ? 'Next' : 'Okay!', fn: next }]);
    };
    next();
  };

  G.giveItem = function (id, n = 1) {
    G.state.items[id] = (G.state.items[id] || 0) + n; G.ui.renderInventory(); G.ui.renderHero();
  };
  G.useItem = function (id) {
    const s = G.state, it = G.ITEMS[id];
    if (!s.items[id]) return;
    if (G.combat && G.combat.active) { G.combatUseItem(id); return; }
    if (it.use === 'heal') {
      if (s.hp >= G.maxHp()) { G.ui.toast('You are already full of health!'); return; }
      s.items[id]--; s.hp = Math.min(G.maxHp(), s.hp + it.v); G.audio.good();
      G.ui.toast(`${it.name}: +${it.v} health!`); G.ui.renderHero(); G.ui.renderInventory(); G.save();
    }
  };

})();
