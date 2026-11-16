/* CONTROLLER — Turn-based card battles: turns, cursed card resolution, monster rules, rewards, ending. */
(function () {
  const ui = G.ui;
  const has = (d, tag) => d.tags.indexOf(tag) >= 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- combat lifecycle ---------- */
  G.startCombat = function (id) {
    const s = G.state, cls = G.CLASSES[s.cls], m = G.MONSTERS[id];
    const st = { web: has0(m, 'web'), mirror: has0(m, 'magicMirror'), plates: has0(m, 'armorPlates') ? 3 : 0, cracked: 0, close: 0,
      far: has0(m, 'farAway') || has0(m, 'witch'), dodged: false, chill: 0, blind: false, slip: false, cackle: 0,
      honey: has0(m, 'sticky'), under: false };   // forest friends: the bear's sticky honey, the mole underground
    if (has0(m, 'band')) { st.band = m.members.map((b) => Object.assign({}, b, { max: b.hp, down: false, pose: 'idle' })); st.front = 0; }
    G.combat = {
      active: true, id, m, hp: m.hp, maxHp: m.hp, mBlock: 0, intentI: 0, phase: 1, st,
      hand: [], draw: G.shuffle(s.deck.map((c) => Object.assign({}, c))), discard: [],
      energy: cls.energy, maxEnergy: cls.energy, handSize: cls.hand, block: 0, power: 0, streak: 0, turn: 0, busy: false,
    };
    G.monThing = G.things.find((t) => t.id === id && t.kind === 'monster');
    if (G.monThing) {
      G.monThing.basePose = restPose(); setPose(G.monThing.basePose);
      if (m.roomPose && G.SPR['mon_' + id + '_wake']) pose('wake', 1300);   // e.g. the troll wakes up grumpy
    }
    ui.$('game').classList.add('battle'); ui.$('textbox').classList.add('combat'); ui.$('hand').classList.remove('hidden'); ui.choices([]);
    ui.$('navPad').classList.add('hidden'); ui.$('combatPad').classList.remove('hidden'); ui.$('monHud').classList.remove('hidden');
    ui.$('tbTitle').textContent = m.name;
    G.audio.hit();
    stepCam(G.BATTLE_BACK, 450);                    // step in close for the battle (the view stands back while exploring)
    log(`Battle! ${m.clue}`);
    startTurn();
  };
  function has0(m, t) { return m.traits.indexOf(t) >= 0; }
  const P = (id) => !!(G.partnerIs && G.partnerIs(id));   // is this spirit your partner?
  function log(t) { ui.sayNow(t); }
  G.clog = log;
  function intent() { const c = G.combat, list = c.phase === 2 ? c.m.intents2 : c.m.intents; return list[c.intentI % list.length]; }

  function startTurn() {
    const c = G.combat; c.turn++; c.block = 0; c.energy = c.maxEnergy; c.st.dodged = false; c.busy = false;
    if (c.turn === 1 && G.passiveSum) c.block = G.passiveSum('block');    // the Lucky Clover (secret closet)
    // your partner spirit (forest.js): Pebble gives block, Ripple heals a little, every turn
    if (P('pebble')) { c.block += 3; if (c.turn === 1) log('Pebble shields you: 3 block every turn.'); }
    if (P('ripple') && c.turn > 1 && G.state.hp < G.maxHp()) { G.state.hp = Math.min(G.maxHp(), G.state.hp + 2); ui.popNum('+2', 150, 300, '#9ad4e8'); ui.renderHero(); }
    drawCards(c.handSize);
    renderAll();
  }
  function drawCards(n) {
    const c = G.combat;
    for (let i = 0; i < n; i++) {
      if (!c.draw.length) { c.draw = G.shuffle(c.discard); c.discard = []; }
      if (!c.draw.length) break;
      c.hand.push(c.draw.pop());
    }
  }

  function lockReason(d) {
    const c = G.combat; if (!c) return null;
    if (d.type === 'attack' && c.st.far && c.st.close <= 0 && !has(d, 'RANGED') && !(d.fx && d.fx.close) && !P('whirl')) return 'Too far!';   // Whirl carries every attack far
    return null;
  }
  const renderAll = () => G.combatView.renderAll();
  const renderHud = () => G.combatView.renderHud();


  /* ---------- playing cards ---------- */
  function playCard(i) {
    const c = G.combat; if (!c || c.busy) return;
    const inst = c.hand[i], d = G.cardDef(inst);
    if (d.cost > c.energy) { ui.toast('Not enough energy'); return; }
    const lock = lockReason(d);
    if (lock) { ui.toast(lock + ' Use a RANGED card' + (G.state.cls === 'warrior' ? ' or Charge!' : '')); log('' + c.m.name + ' is far away! Only RANGED cards can reach.'); return; }
    c.busy = true;
    const target = G.ri(d.min, d.max);
    G.puzzle({
      target, inst, title: `Break the Curse on ${d.name}!`,
      onDone: async (ok) => {
        c.streak = ok ? c.streak + 1 : 0;
        let v = ok ? target : 1;
        if (ok && c.streak >= 3 && d.type !== 'skill') { v += 1; ui.toast('3 in a row! +1 bonus'); }
        c.energy -= d.cost;
        c.hand.splice(i, 1); c.discard.push(inst);
        await resolve(d, v);
        if (!G.combat || !G.combat.active) return;
        c.busy = false;
        renderAll();
      },
    });
  }

  async function resolve(d, v) {
    const c = G.combat, st = c.st, fx = d.fx || {};
    if (fx.power) { c.power += v; log(`Power up! Your next attack gets +${v}.`); G.audio.sparkle(); }
    if (d.type === 'block') { c.block += v; G.audio.block(); log(`You gain ${v} block.`); ui.popNum(ui.ico('block') + ' ' + v, 140, 300, '#a8c8ff'); }
    if (fx.chill) { st.chill = 1; log(`${v} block, and ${c.m.name} is chilled!`); }
    if (fx.blind) { st.blind = true; log(`${v} block, and ${c.m.name} can't see well!`); }
    if (fx.slip) { c.block += v; st.slip = true; log(`${v} block, and a banana peel is on the floor...`); }
    if (fx.heal) { const s = G.state; s.hp = Math.min(G.maxHp(), s.hp + v); G.audio.good(); ui.popNum('+' + v, 150, 300, '#8fe08a'); log(`You heal ${v} health.`); ui.renderHero(); }
    if (fx.draw) drawCards(fx.draw);
    if (d.type === 'attack') await attack(d, v);
    renderAll();
  }

  async function attack(d, v) {
    const c = G.combat, st = c.st, fx = d.fx || {};
    if (fx.close) {
      const wasFar = st.far && st.close <= 0;
      st.close = 2; log('CHARGE! You rush in close!');
      if (G.monThing) { G.monThing.basePose = restPose(); if (wasFar && G.SPR['mon_' + c.id + '_caught']) pose('caught', 1000); }
      await wait(350);
    }
    let dmg = v + c.power; if (c.power) c.power = 0;
    if (P('ember') && has(d, 'FIRE')) dmg += 2;
    if (P('fizz') && has(d, 'SHOCK')) dmg += 2;
    if (P('luna') && !c.moon) { c.moon = 1; dmg *= 2; log("Luna's moonlight: your first attack does DOUBLE!"); await wait(400); }
    const it = intent();
    if (fx.sneak && (it.t !== 'attack' || st.blind)) { dmg *= 2; log('Sneak attack: DOUBLE damage!'); await wait(400); }
    const hits = d.hits || 1;
    for (let h = 0; h < hits; h++) {
      if (!G.combat || !G.combat.active || c.hp <= 0) break;
      await hit(d.tags, dmg, d.name);
      if (hits > 1) await wait(260);
    }
  }

  async function hit(tags, dmg, what) {
    const c = G.combat, st = c.st, m = c.m, T = (t) => m.traits.indexOf(t) >= 0, H = (t) => tags.indexOf(t) >= 0;
    const it = intent(); const msgs = [];
    if (T('band')) return bandHit(dmg, what);      // three musicians: see the Bone Band below
    let reaction = 'hit';                          // which picture the monster shows after this hit
    if (st.far && st.close <= 0 && !H('RANGED') && !P('whirl')) { log('Too far away to reach!'); return; }
    if (T('dig') && st.under) {                    // the mole is underground
      if (H('BASH') || H('SHOCK')) { st.under = false; msgs.push('RUMBLE! He pops back up!'); }
      else { G.audio.miss(); ui.popNum('MISS', 358, 190, '#cfc'); log('He is underground! Your hit misses. BASH or SHOCK shakes him back up!'); return; }
    }
    if (T('sticky') && st.honey) {                 // the bear's honey
      if (H('FIRE')) { st.honey = false; msgs.push('SIZZLE! The honey melts away!'); }
      else if (!st.dodged) { st.dodged = true; dmg = Math.ceil(dmg / 2); msgs.push('Sticky honey! Your first hit is only half. FIRE melts honey.'); }
    }
    if (T('shell') && dmg < 5 && !H('BASH')) { dmg = 0; msgs.push('Tink! Too small for his shell. Hit for 5 or more, or use BASH!'); }
    if (T('dodgy') && !st.dodged) { st.dodged = true; G.audio.miss(); log(`Whoosh! ${m.name} dodged the first attack! Now hit again!`); ui.popNum('MISS', 358, 190, '#cfc'); (G.SPR['mon_' + c.id + '_dodge'] ? pose('dodge', 800) : monShake()); return; }
    if (st.mirror && H('MAGIC')) {
      G.audio.miss(); log('BOING! The Magic Mirror bounced your spell back at you! Smash it with a BASH card!');
      ui.popNum('BOING!', 358, 190, '#e0c0ff');
      const t = G.monThing; if (t) G.addFx(400, (k) => { t.shakeX = Math.sin(k * 30) * 8 * (1 - k); }, () => { t.shakeX = 0; });
      await wait(300); hurtPlayer(dmg); return;
    }
    if (H('BASH') && st.mirror) { st.mirror = false; msgs.push('SMASH! The mirror shatters!'); G.audio.pop(); reaction = 'smash'; if (G.monThing) G.monThing.basePose = 'idle'; }
    if (T('counterGuard') && it.t === 'guard') { dmg = 0; reaction = 'bounce'; msgs.push('He was guarding! Your hit bounces off and he bites back!'); if (G.ICON_ART && G.ICON_ART['wolf-bounce']) ui.popImg(G.ICON_ART['wolf-bounce'], 358, 130, 120); setTimeout(() => G.combat && hurtPlayer(3), 350); }
    if (T('counterGuard') && it.t === 'tired') { dmg *= 2; msgs.push('He is tired: DOUBLE damage!'); }
    if (st.plates > 0) {
      if (H('PIERCE') || H('BASH')) {
        st.plates--; reaction = 'pop'; G.audio.block();
        if (G.ICON_ART && G.ICON_ART['kn-pop']) ui.popImg(G.ICON_ART['kn-pop'], 430, 110, 110);
        msgs.push(st.plates ? `CLANG! A plate falls off! ${st.plates} left.` : 'CLANG! His LAST plate falls off! Every hit counts in full now!');
        if (G.monThing && !st.plates && G.monThing.basePose !== 'wall') G.monThing.basePose = 'bare';   // no plates: his padded vest shows
      }
      const before = dmg; dmg = Math.max(0, dmg - st.plates * 2); if (st.plates && before !== dmg) msgs.push(`Plates block ${before - dmg}.`);
    }
    const armored = T('boneArmor') || (T('witch') && c.phase === 2);
    if (armored) {
      if (H('BASH') || H('SHOCK')) {
        if (st.cracked <= 0) { msgs.push(T('witch') ? 'POP! Her bubble bursts! Hit her now!' : 'CRACK! The armour breaks open! Hit him now!'); reaction = 'cracked'; }
        st.cracked = 1;
        if (G.monThing) G.monThing.basePose = T('witch') ? 'ground' : 'cracked';   // stays open for the rest of this turn
      }
      if (st.cracked <= 0) { dmg = Math.min(dmg, 1); msgs.push('Clonk! Only 1 damage. Crack it with BASH or SHOCK!'); reaction = 'clonk'; }
    }
    if (T('web') && st.web) {
      if (H('FIRE')) { st.web = false; msgs.push('WHOOSH! The web burns away!'); reaction = 'burn'; if (G.monThing) G.monThing.basePose = 'idle'; }
      else { dmg = Math.max(1, Math.floor(dmg / 4)); msgs.push('Sticky web! Your hit gets stuck. Fire burns webs.'); reaction = 'web'; }
    }
    if (T('thickSkin') && dmg < 6) { dmg = 0; reaction = 'boing'; msgs.push('Boing! Too small for his thick skin. Power up and make a hit of 6 or more!'); }
    else if (T('thickSkin') && G.ICON_ART && G.ICON_ART['troll-bighit']) { msgs.push('A BIG hit gets through!'); ui.popImg(G.ICON_ART['troll-bighit'], 358, 120, 130); }
    if (c.mBlock > 0 && dmg > 0) { const b = Math.min(c.mBlock, dmg); c.mBlock -= b; dmg -= b; msgs.push(`His block soaks ${b}.`); }
    c.hp -= dmg;
    G.audio.hit(); if (dmg > 0) G.heroFace('grin');
    if (T('prickles') && !H('RANGED') && !P('whirl')) { msgs.push(`Ouch, prickles! You take ${hurtPlayer(1)}.`); }
    if (reaction !== 'hit' && G.SPR['mon_' + c.id + '_' + reaction]) {
      pose(reaction, reaction === 'cracked' || reaction === 'burn' || reaction === 'smash' || reaction === 'pop' ? 1100 : 800);
      if (reaction === 'bounce' || reaction === 'boing') G.audio.block();
      const t = G.monThing; if (t) G.addFx(300, (k) => { t.shakeX = Math.sin(k * 30) * 8 * (1 - k); }, () => { t.shakeX = 0; });
    } else if (reaction === 'clonk') {                 // bounced off her bubble: a wobble, no ouch face
      const t = G.monThing; if (t) G.addFx(300, (k) => { t.shakeX = Math.sin(k * 30) * 6 * (1 - k); }, () => { t.shakeX = 0; });
    } else monShake();
    ui.popNum(dmg > 0 ? '-' + dmg : '0', 358, 170, dmg > 0 ? '#ffd27a' : '#ccc');
    log(`${what ? '' + what + ': ' : ''}${dmg} damage! ${msgs.join(' ')}`);
    if (T('witch') && c.phase === 1 && c.hp <= c.maxHp / 2 && c.hp > 0) {
      await wait(700); c.phase = 2; c.intentI = 0; st.far = false; st.close = 0; st.cracked = 0;
      const t = G.monThing;
      if (t && G.SPR['mon_witch_crash']) { t.hover = 0; t.basePose = restPose(); pose('crash', 1700); }
      log('The Witch crash-lands! "Grr! Try THIS!" She puts up a bubble shield. Crack it with BASH or SHOCK!');
      G.audio.pop();
    }
    renderHud();
    if (c.hp <= 0) await win();
  }

  /* switch the monster's picture to a battle frame (only monsters with full art have frames) */
  function setPose(name) {
    const c = G.combat, t = G.monThing; if (!c || !t) return;
    if (c.st.band) return drawBand();
    const spr = G.SPR['mon_' + c.id + (name && name !== 'idle' ? '_' + name : '')] || G.SPR['mon_' + c.id];
    t.spr = spr; G.dirty = true;
  }
  let poseTimer = null;
  function pose(name, ms) {
    const t = G.monThing; if (!t) return;
    clearTimeout(poseTimer); setPose(name);
    if (ms) poseTimer = setTimeout(() => setPose(t.basePose || 'idle'), ms);
  }
  G.monPose = pose;
  /* resting picture between moves: behind the web while it is up, otherwise the normal cursed look */
  function restPose() {
    const c = G.combat; if (!c) return 'idle';
    if (c.st.web && c.m.traits.indexOf('web') >= 0 && G.SPR['mon_' + c.id + '_web']) return 'web';
    if (c.st.far && c.st.close <= 0 && G.SPR['mon_' + c.id + '_far']) return 'far';   // hiding out of reach
    if (c.st.mirror && G.SPR['mon_' + c.id + '_mirror']) return 'mirror';             // behind his magic mirror
    if (c.m.traits.indexOf('witch') >= 0 && c.phase === 2 && G.SPR['mon_' + c.id + '_bubble'])   // landed: in her bubble,
      return c.st.cracked > 0 ? 'ground' : 'bubble';                                  // or standing once it pops
    if (c.m.traits.indexOf('armorPlates') >= 0 && c.st.plates <= 0 && G.SPR['mon_' + c.id + '_bare']) return 'bare';   // all plates knocked off
    if (c.m.traits.indexOf('counterGuard') >= 0) {                                      // his stance shows his next move
      const nx = intent(), k = nx.t === 'guard' ? 'guard' : nx.t === 'tired' ? 'tired' : 'ready';
      if (G.SPR['mon_' + c.id + '_' + k]) return k;
    }
    return 'idle';
  }
  function monShake() {
    const t = G.monThing; if (!t) return;
    const c = G.combat, two = c && c.phase === 2 && G.SPR['mon_' + c.id + '_hit2'];
    pose(two ? 'hit2' : 'hit', 500);
    G.addFx(300, (k) => { t.shakeX = Math.sin(k * 30) * 10 * (1 - k); }, () => { t.shakeX = 0; });
  }
  function monLunge() {
    const t = G.monThing; if (!t) return;
    G.addFx(360, (k) => { t.scale = 1 + Math.sin(k * Math.PI) * 0.25; }, () => { t.scale = 1; });
  }

  function hurtPlayer(n) {
    const c = G.combat, s = G.state;
    let dmg = n;
    if (c.block > 0) { const b = Math.min(c.block, dmg); c.block -= b; dmg -= b; if (b) { G.audio.block(); ui.popNum(ui.ico('block') + ' -' + b, 150, 280, '#a8c8ff', true); } }
    if (dmg > 0) { s.hp -= dmg; G.audio.hurt(); ui.hurt(); ui.popNum('-' + dmg, 150, 320, '#ff8a7a'); }
    ui.renderHero();
    return dmg;
  }

  /* ---------- the Bone Band: three musicians in one battle ----------
     Hits land on the one in the spotlight until he falls apart; then the next one still standing steps in
     (a big hit carries on into him).
     A knocked-down musician is a pile of bones. ENCORE: at the start of the band's turn, anyone still standing
     rebuilds the piles (a third of their health; they are too wobbly to play that turn). So all three must be knocked down in the same turn. */
  const sum = (B) => B.reduce((a, b) => a + b.hp, 0);
  const bandPop = (name, x, y, size) => { if (G.ICON_ART && G.ICON_ART[name]) ui.popImg(G.ICON_ART[name], x, y, size); };
  function drawBand() {
    const c = G.combat, t = G.monThing; if (!c || !t || !c.st.band || !G.bandSprite) return;
    t.spr = G.bandSprite(c.st.band.map((b) => (b.down ? 'pile' : b.pose)), c.st.front); G.dirty = true;
  }
  async function bandHit(dmg, what) {
    const c = G.combat, st = c.st, B = st.band, msgs = [], hitWho = [];
    if (c.mBlock > 0 && dmg > 0) { const k = Math.min(c.mBlock, dmg); c.mBlock -= k; dmg -= k; msgs.push(`The drum beat soaks ${k}.`); }
    G.audio.hit();
    if (dmg > 0) G.heroFace('grin');
    let left = dmg;
    do {                                              // a knock-down hit carries on into the next musician
      const i = st.front, b = B[i], k = Math.min(b.hp, left);
      b.hp -= k; left -= k; hitWho.push(`${k} to ${b.short}`);
      ui.popNum(k > 0 ? '-' + k : '0', 358 + (i - 1) * 120, 160, k > 0 ? '#ffd27a' : '#ccc');
      if (b.hp > 0) {
        if (k > 0) { b.pose = 'hit'; setTimeout(() => { if (G.combat && !b.down && b.pose === 'hit') { b.pose = 'idle'; drawBand(); } }, 500); }
        break;
      }
      b.down = true; msgs.push(`${b.name} falls apart into a pile of bones!`); G.audio.pop(); bandPop('band-down', 358 + (i - 1) * 120, 120, 100);
      if (B.every((x) => x.down)) break;
      let n = i; do { n = (n + 1) % B.length; } while (B[n].down);   // the next one steps into the spotlight
      st.front = n; msgs.push(`${B[n].short} steps into the spotlight.`);
    } while (left > 0);
    c.hp = sum(B);
    const head = `${what ? '' + what + ': ' : ''}${hitWho.join(', ')}! `;
    if (B.every((x) => x.down)) {
      drawBand(); log(head + msgs.join(' ') + ' ALL THREE are down at once! No encore this time!'); renderHud();
      setTimeout(() => bandPop('band-allthree', 358, 100, 170), 250);
      await wait(600); return win();
    }
    drawBand(); log(head + msgs.join(' ')); renderHud();
  }

  async function bandTurn() {
    const c = G.combat, st = c.st, B = st.band;
    const down = B.filter((b) => b.down);
    B.forEach((b) => { b.dazed = b.down; });               // rebuilt musicians are too wobbly to play this turn
    if (down.length && down.length < B.length) {
      for (const b of down) { b.down = false; b.hp = Math.ceil(b.max / 3); b.pose = 'rebuild'; }
      drawBand(); G.audio.sparkle(); bandPop('band-encore', 358, 110, 140);
      log(`"ENCORE!" The band rebuilds ${down.map((b) => b.short).join(' and ')}! (Too wobbly to play this turn.) Knock ALL THREE down in the same turn!`);
      c.hp = sum(B); renderHud(); await wait(1200);
      for (const b of down) b.pose = 'idle';
      drawBand();
    }
    for (const b of B) {
      if (b.down || b.dazed || !G.combat) continue;
      b.pose = 'move'; drawBand();
      bandPop({ boney: 'band-drum', tibia: 'band-trumpet', ribs: 'band-tune' }[b.id], 358 + (B.indexOf(b) - 1) * 120, 110, 110);
      if (b.id === 'boney') { c.mBlock += 3; G.audio.block(); log('Drum Beat! BOOM-BOOM! The whole band gets 3 block.'); }
      else if (b.id === 'tibia') {
        let dmg = 6; const notes = [];
        if (st.slip) { dmg = 0; st.slip = false; notes.push('He slipped on the banana peel!'); }
        if (st.chill && dmg) { dmg = Math.max(0, dmg - 2); st.chill = 0; notes.push('Chilled: -2.'); }
        if (st.blind && dmg) { dmg = Math.floor(dmg / 2); st.blind = false; notes.push("He can't see: half damage!"); }
        log(`Trumpet Blast! TOOT-TOOOT! ${notes.join(' ')} You take ${hurtPlayer(dmg)}.`);
      } else {
        const hurt = B.filter((x) => !x.down && x.hp < x.max).sort((p, q) => p.hp / p.max - q.hp / q.max)[0];
        if (hurt) { const k = Math.min(3, hurt.max - hurt.hp); hurt.hp += k; log(`Healing Tune! Plink-plonk! ${hurt.short} gets +${k} health.`); }
        else log('Healing Tune! Plink-plonk! (Everyone is already full.)');
        G.audio.note(2);
      }
      c.hp = sum(B); renderHud(); await wait(900);
      b.pose = 'idle'; drawBand();
      if (G.state.hp <= 0) return;
    }
  }

  /* ---------- monster turn ---------- */
  async function endTurn() {
    const c = G.combat; if (!c || c.busy) return;
    c.busy = true;
    c.discard.push(...c.hand); c.hand = []; renderAll(); c.busy = true;
    await wait(350);
    const st = c.st, it = intent(), m = c.m;
    c.mBlock = 0;
    if (st.under && it.t !== 'dig') st.under = false;   // the mole pops back up to make his move
    const art = G.MONSTER_ART && G.MONSTER_ART[c.id], mv = art && art.moves[it.n];
    const stay = it.t === 'block' || it.t === 'dig';        // a pose he keeps until his next move (shield up, dug in)
    if (G.monThing) G.monThing.basePose = mv && stay ? mv : 'idle';
    if (mv) pose(mv, stay ? 0 : 900); else pose('idle');
    if (it.t === 'attack') {
      let dmg = it.v + (st.cackle || 0); st.cackle = 0;
      monLunge(); await wait(200);
      const notes = [];
      if (st.slip) { dmg = 0; st.slip = false; notes.push('He slipped on the banana peel!'); }
      if (st.chill && dmg) { dmg = Math.max(0, dmg - 2); st.chill = 0; notes.push('Chilled: -2.'); }
      if (st.blind && dmg) { dmg = Math.floor(dmg / 2); st.blind = false; notes.push("He can't see: half damage!"); }
      const taken = hurtPlayer(dmg);
      if (P('sprig') && c.hp > 1) { c.hp = Math.max(1, c.hp - 2); notes.push("Sprig's thorns prick back for 2!"); }
      log(`${m.name}: ${it.n}! ${notes.join(' ')} You take ${taken}.`);
    } else if (it.t === 'band') await bandTurn();
    else if (it.t === 'block') { c.mBlock = it.v; log(`${m.name}: ${it.n}. (+${it.v} block)`); G.audio.block(); }
    else if (it.t === 'heal') { c.hp = Math.min(c.maxHp, c.hp + it.v); log(`${m.name}: ${it.n}. Zzz... (+${it.v} health)`); G.audio.snore(); }
    else if (it.t === 'spin') { st.web = true; log(`${m.name} spins a new sticky web!`); }
    else if (it.t === 'hop') { st.close = 0; c.mBlock = it.v; log(`${m.name} hops back into the leaves! He is far away again.`); }
    else if (it.t === 'guard') log(`${m.name} stays in his guard stance... watch out, he is getting ready!`);
    else if (it.t === 'tired') log(`${m.name} yawns. He is getting his breath back.`);
    else if (it.t === 'mirror') { st.mirror = true; log(`${m.name} conjures a NEW Magic Mirror!`); G.audio.sparkle(); }
    else if (it.t === 'polish') { st.plates = Math.min(4, st.plates + 1); log(`${m.name} polishes his armour. +1 plate!`); }
    else if (it.t === 'cackle') { st.cackle = 3; if (G.ICON_ART && G.ICON_ART['witch-cackle']) ui.popImg(G.ICON_ART['witch-cackle'], 358, 110, 140); log(`"Hee hee hee!" ${m.name} is powering up! Her next attack +3.`); }
    else if (it.t === 'dig') { st.under = true; log(`${m.name} digs down into the ground! Your hits will miss... unless you BASH or SHOCK.`); }
    else if (it.t === 'bubble') {
      if (c.id === 'witch2' && G.spiritFree('luna')) { st.cracked = 2; log(`${m.name} blows a fresh bubble... and Luna's moonlight POPS it at once!`); G.audio.pop(); }
      else { st.cracked = 0; log(`${m.name} blows a fresh bubble shield!`); }
    }
    // timers tick down after the monster acts
    if (st.cracked > 0) st.cracked--;
    if (st.close > 0) st.close--;
    st.blind = st.blind && it.t !== 'attack' ? st.blind : false;
    c.intentI++;
    if (G.monThing) {                                // what the monster looks like until its next move
      G.monThing.basePose = mv && it.t === 'block' ? mv : restPose();
      if (!mv) setPose(G.monThing.basePose);
    }
    renderAll();
    if (G.state.hp <= 0) { await wait(700); return lose(); }
    await wait(700);
    c.discard.push(...c.hand); c.hand = [];
    startTurn();
  }

  /* ---------- items in battle ---------- */
  G.combatUseItem = async function (id) {
    const c = G.combat, s = G.state, it = G.ITEMS[id]; if (!c || c.busy) return;
    s.items[id]--; ui.renderInventory();
    if (it.use === 'heal') { s.hp = Math.min(G.maxHp(), s.hp + it.v); G.audio.good(); log(`${it.name}: Yum! +${it.v} health.`); }
    else if (it.use === 'block') { c.block += it.v; G.audio.block(); log(`${it.name}: Glug glug! +${it.v} block.`); }
    else if (it.use === 'pepper') { c.busy = true; await hit(['FIRE', 'RANGED'], it.v, 'Spicy Pepper'); if (G.combat && G.combat.active) c.busy = false; }
    renderAll();
  };

  /* ---------- win / lose ---------- */
  async function win() {
    const c = G.combat, s = G.state, id = c.id, m = c.m, t = G.monThing;
    c.active = false; c.busy = true;
    G.audio.pop(); ui.burst('sparkle', 358, 200, 10); G.heroFace('laugh');
    clearTimeout(poseTimer);
    const friend = ((G.MONSTER_ART && G.MONSTER_ART[id]) || m.friendArt) && G.SPR['free_' + id];
    if (t && G.SPR['mon_' + id + '_getaway']) {   // the Witch zooms off up and away, shrinking out of sight
      t.basePose = null; t.spr = G.SPR['mon_' + id + '_getaway']; t.shakeX = 0; G.dirty = true;
      await new Promise((res) => G.addFx(1600, (k) => {
        t.lift = k * k * 0.9; t.scale = 1 - k * 0.65; t.alpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4; G.dirty = true;
      }, () => { t.hidden = true; t.alpha = 1; t.scale = 1; t.lift = 0; res(); }));
    } else if (t && friend) {          // bubble pops, the freed monster stays as a friend and does a happy hop
      t.basePose = null; t.spr = friend; t.shakeX = 0; G.dirty = true;
      G.addFx(700, (k) => { t.lift = Math.sin(k * Math.PI) * 0.12; }, () => { t.lift = 0; });
    } else if (t) {
      t.spr = G.SPR['free_' + id];
      G.addFx(1200, (k) => { t.lift = k * 0.1; t.alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; }, () => { t.hidden = true; t.alpha = 1; t.lift = 0; });
    }
    await wait(500);
    if (t && friend && m.freedAt) {   // steps aside so the way on stays open (the knight leaves the stairs free)
      const dx = m.freedAt.x - t.x, dy = m.freedAt.y - t.y;
      await new Promise((res) => G.addFx(700, (k) => { t.ox = dx * k; t.oy = dy * k; t.lift = Math.abs(Math.sin(k * Math.PI * 3)) * 0.06; G.dirty = true; },
        () => { t.x += dx; t.y += dy; t.ox = t.oy = 0; t.lift = 0; res(); }));
    }
    G.audio.win();
    s.flags['freed_' + id] = true; s.wins = (s.wins || 0) + 1;
    endCombatUi();
    s.hp = G.maxHp();
    const r = m.reward || {}; const got = [];
    if (r.items) for (const k in r.items) {
      if (k === 'moonkey' && id === 'troll' && s.flags.trollKey) continue;
      if (k === 'moonkey' && id === 'troll') s.flags.trollKey = 1;
      G.giveItem(k, r.items[k]); got.push(G.ITEMS[k].name + (r.items[k] > 1 ? ' ×' + r.items[k] : ''));
    }
    ui.renderHero(); G.save();
    if (id === 'witch') { s.flags.witch_beaten = 1; G.save(); return G.ending(); }
    if (id === 'witch2') { s.flags.witch2_beaten = 1; G.save(); return G.ending2(); }
    const after = () => { ui.say(m.freedName || m.name, `"${m.freed}"` + (got.length ? `  You got: ${got.join(', ')}.` : '') + ' Your health is full again!', []); G.refreshThings(); G.dirty = true; };
    if (r.card) G.cardReward(after); else after();
  }

  function lose() {
    const s = G.state;
    clearTimeout(poseTimer); if (G.monThing) G.monThing.basePose = null;
    endCombatUi(); G.refreshThings(); G.dirty = true;
    const forest = G.zoneOf && G.zoneOf() === 'forest', home = forest ? 'forest' : 'castle';
    const box = ui.el('div');
    box.innerHTML = `<img class="dizzy-big" src="${ui.picSrc('dizzy')}" alt=""><h2>Whoops! You got too dizzy!</h2>
      <div class="sub">${forest ? 'Pip carried you back to the camp at the Forest Edge for a rest.' : 'Sir Sneezalot carried you back to the Entrance Hall for a rest.'}<br>Read the monster's clue and try a new plan!</div>`;
    const b = ui.el('button', 'btn gold', 'Try again');
    ui.tap(b, () => {
      ui.closeModal();
      const r = G.MAPS[home].layout.respawn;
      if (G.mapId() !== home) G.switchMap(home, r.x, r.y, r.dir);   // carried back up to the castle (or the forest camp)
      Object.assign(s, { x: r.x, y: r.y, dir: r.dir, hp: G.maxHp() });
      G.cam.x = r.x + 0.5; G.cam.y = r.y + 0.5; G.cam.a = r.dir * Math.PI / 2; G.lastRegion = null; G.dirty = true;
      ui.renderHero(); G.save(); G.arrived(true);
      ui.say(forest ? 'Forest Edge' : 'Entrance Hall', forest ? 'Hoo-hoo! There you are. Rest by the fire, hero. You can do it!' : 'ACHOO! There you are. Rest up, hero. You can do it!', []);
    });
    box.appendChild(b);
    ui.modal(box, { close: false, width: 640 });
  }

  /* the camera's step in / out (renderer.js: cam.back = how far behind the middle of the square the eye is) */
  G.BATTLE_BACK = -0.12;
  function stepCam(to, ms) {
    const c = G.cam, from = c.back != null ? c.back : G.VIEW_BACK, ease = (k) => 1 - Math.pow(1 - k, 3);
    G.addFx(ms, (k) => { c.back = from + (to - from) * ease(k); G.dirty = true; }, () => { c.back = to === G.VIEW_BACK ? null : to; G.dirty = true; });
  }
  function endCombatUi() {
    const c = G.combat; if (c) c.active = false;
                                                     // stepping back out is done by movement.js (G.updateLean) once the battle is over
    ui.$('game').classList.remove('battle'); ui.$('textbox').classList.remove('combat'); ui.$('hand').classList.add('hidden'); ui.$('hand').innerHTML = '';
    ui.$('navPad').classList.remove('hidden'); ui.$('combatPad').classList.add('hidden'); ui.$('monHud').classList.add('hidden');
    G.combat = null; ui.renderHero(); ui.renderInventory();
  }

  /* ---------- card rewards ---------- */
  G.cardReward = function (then, title) {
    const s = G.state, pool = G.shuffle([...new Set(G.CLASSES[s.cls].pool)]).slice(0, 3);
    const box = ui.el('div', 'reward');
    box.appendChild(ui.el('div', 'sub', 'It joins your deck. (It will be cursed too, of course!)'));
    const row = ui.el('div', 'reward-cards');
    pool.forEach((id) => {
      const e = ui.cardEl({ id, up: 0 }, { cursed: true });
      ui.tap(e, () => { s.deck.push({ id, up: 0 }); G.save(); ui.closeModal(); ui.toast(`${G.CARDS[id].name} added to your deck!`); ui.renderHero(); then && then(); });
      row.appendChild(e);
    });
    box.appendChild(row);
    box.appendChild(ui.keywordLegend(pool));
    const skip = ui.el('button', 'btn purple', 'Skip'); ui.tap(skip, () => { ui.closeModal(); then && then(); });
    box.appendChild(skip);
    ui.modal(box, { close: false, frame: title || 'Choose a New Card!' });
  };

  /* ---------- ending ---------- */
  G.ending = function () {
    const s = G.state; const box = ui.el('div');
    if (G.voice) G.voice.say('witch-freed');            // Wanda: "NOOO! My curse! You broke it!" as she flies off
    box.innerHTML = `<img class="ending-art" src="assets/img/ending.webp" alt="Wanda zooms away to the Dragon's mountain while the freed friends wave from the tower"><h2>You broke the Witch's curse!</h2>
      <div class="sub">Every bubble in the castle goes POP! The cursed friends are free again.<br>
      But Wanda escaped on her broom... to the Dragon's mountain. The Dragon is still under her spell!<br><br>
      <b style="color:#f2c94c">She flew over the Whispering Wood behind the castle. After her!</b></div>
      <div class="sub">Steps walked: ${s.steps} • Puzzles solved: ${s.solved || 0} • Friends freed: ${s.wins || 0}</div>`;
    const row = ui.el('div', 'row');
    const a = ui.el('button', 'btn', 'Stay in the castle'); ui.tap(a, () => { ui.closeModal(); ui.say("Witch's Tower", 'The tower is quiet now. Only a few purple sparkles remain. (Sir Sneezalot can show you the way to the forest.)', []); });
    const b = ui.el('button', 'btn gold', 'Follow her to the forest!'); ui.tap(b, () => { ui.closeModal(); G.toForest(); });
    row.appendChild(a); row.appendChild(b); box.appendChild(row);
    ui.modal(box, { close: false, width: 820 });
  };

  /* ---------- buttons ---------- */
  G.bindCombat = function () {
    ui.tap(ui.$('btnEndTurn'), () => endTurn());
    ui.tap(ui.$('btnClue'), () => { if (G.combat) log('' + G.combat.m.clue); });
  };
  G.combatRender = () => { if (G.combat && G.combat.active) renderAll(); };

  G.combatCtl = { intent, lockReason, playCard, log };
})();
