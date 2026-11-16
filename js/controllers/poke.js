/* CONTROLLER — Touching the world: tap anything in the 3D view.
   - wall decorations (paintings, torches, clocks...) and room props react with a funny line, a sound and a little effect
   - things lying on the floor (G.PICKUPS) fly into the bag (tap them, or walk onto them)
   - the cursed monster / friend / chest right in front opens as before
   The renderer remembers what it drew in each screen column (renderer.pk); this file turns a tap into "what was that". */
(function () {
  const ui = G.ui;
  const REACH = 3.2;                                  // how far away (squares) you can poke things

  /* ---------- things on the floor to pick up ---------- */
  G.PICKUPS = [
    { id: 'pk1', x: 4, y: 22, item: 'pepper' }, { id: 'pk2', x: 11, y: 20, item: 'cheese' }, { id: 'pk3', x: 4, y: 11, item: 'cheese' },
    { id: 'pk4', x: 12, y: 14, item: 'pepper' }, { id: 'pk5', x: 23, y: 13, item: 'cheese' }, { id: 'pk6', x: 24, y: 18, item: 'bubble' },
    { id: 'pk7', x: 32, y: 3, item: 'bubble' }, { id: 'pk8', x: 5, y: 15, item: 'cheese' },
  ];
  G.addPickups = function () {                       // called by buildThings (castle only)
    if (G.mapId() !== 'castle') return;
    const drops = (G.state.clean && G.state.clean.drops) || [];   // and what a shaggy dog dropped (cleaning.js)
    for (const p of [...G.PICKUPS, ...drops]) if (!G.state.flags['got_' + p.id] && G.SPR['pick_' + p.item])
      G.things.push({ kind: 'pickup', id: p.id, item: p.item, x: p.x, y: p.y, spr: G.SPR['pick_' + p.item], noFog: true });
  };
  G.pickupAt = (x, y) => G.things && G.things.find((t) => t.kind === 'pickup' && !t.hidden && t.x === x && t.y === y);
  G.collect = function (t, sx, sy) {
    G.heroFace && G.heroFace('grin');                    // a happy face for every find (portraitView.js)
    const s = G.state; if (!t || t.hidden) return;
    t.hidden = true; s.flags['got_' + t.id] = 1;
    const it = G.ITEMS[t.item];
    G.giveItem(t.item, 1); G.audio.sparkle();
    if (sx != null) ui.burst('sparkle', sx, sy, 6);
    ui.toast(`Found: ${it.name}!`); ui.sayNow(`You found ${it.name === 'Royal Cheese' ? 'some' : 'a'} ${it.name} on the floor! Into the bag it goes.`);
    G.save(); G.dirty = true;
  };

  /* ---------- reactions ----------
     Matched against the name of the decoration / prop: the first rule whose words appear wins.
     fx: 'wiggle' (props shake), 'flare' (torchlight flares), 'emoji' (little pictures pop out), 'notes' (music) */
  const R = (words, lines, sound, fx, emoji) => ({ re: new RegExp(words), lines, sound, fx, emoji });
  const RULES = [
    R('sock', ['Phew! This giant sock has NOT been washed in a hundred years.'], 'bonk', 'wiggle', ''),
    R('teddy', ['You give the teddy a squeeze. It squeaks happily!'], 'squeak', 'wiggle', ''),
    R('potty', ['A royal potty. Gold-plated. Even the king has to go sometimes!'], 'pop', 'wiggle', ''),
    R('slipper', ['Fluffy bunny slippers! One of them winks at you.'], 'squeak', 'wiggle', ''),
    R('catking|grumpy-king', ['The grumpy king frowns at you... then sticks out his tongue!'], 'pop', 'emoji', ''),
    R('laughing-queen', ['Ha ha ha! The queen is laughing at her own joke again.'], 'good', 'emoji', ''),
    R('side-eye', ['The lady in the painting slowly looks the other way...'], 'miss', 'emoji', ''),
    R('royal-dog', ['Woof! The painted dog wags its tail.'], 'squeak', 'emoji', ''),
    R('baby-prince', ['The baby prince blows you a raspberry. Pbbbt!'], 'pop', 'emoji', ''),
    R('wanted|witch-poster|wanda', ['WANTED: Wanda the Witch. For being VERY naughty.'], 'pop', 'emoji', ''),
    R('frog', ['The frog in the picture says "Ribbit!" Did that just happen?'], 'squeak', 'emoji', ''),
    R('owl', ['The owl painting blinks. Hoo-hoo!'], 'note', 'emoji', ''),
    // the moving pictures and clocks (their poked frame matches the line: wallAnim.js)
    R('wizard-portrait', ['The painted wizard wiggles his fingers. Sparkles everywhere!'], 'sparkle', 'emoji', ''),
    R('knight-portrait', ['The knight in the painting gives you a big thumbs up!'], 'good', 'emoji', ''),
    R('sheep-painting', ['Baaa! The sheep hops over the fence. One sheep... two sheep... zzz.'], 'squeak', 'emoji', ''),
    R('rat-portrait', ['The chef rat takes a big bite of his painted cheese. Nom nom!'], 'squeak', 'emoji', ''),
    R('pony-knight', ['The pony neighs and the knight nearly falls off!'], 'bonk', 'emoji', ''),
    R('fruit-face', ['The pear in the fruit bowl winks at you!'], 'pop', 'emoji', ''),
    R('royal-portrait', ['The royal cat in the family picture yawns. The king and queen pretend not to notice.'], 'squeak', 'emoji', ''),
    R('castle-sunset', ['The sun goes down in the painting... and the moon pops up and smiles!'], 'sparkle', 'emoji', ''),
    R('duck-painting', ['The painted duck goes QUACK! Splish splash!'], 'squeak', 'emoji', ''),
    R('cheese-clock', ['A little mouse peeks out of the cheese clock. Is it cheese o\'clock yet?'], 'squeak', 'emoji', ''),
    R('duck-clock', ['QUACK o\'clock! The duck clock laughs its head off.'], 'squeak', 'emoji', ''),
    R('moon-clock', ['The moon clock wakes up and gives you a sleepy smile. Twinkle!'], 'sparkle', 'emoji', ''),
    R('cuckoo', ['CUCKOO! CUCKOO! The little bird pops out to say hello.'], 'note', 'emoji', ''),
    R('portrait|painting|landscape|drawing|sunset|pony-knight|fruit-face|troll-family|crest', ['The painting winks at you!', 'Is that painting smiling? It was not smiling before...', 'The eyes in the painting follow you. Spooky... and a bit silly.'], 'sparkle', 'emoji', ''),
    R('torch|sconce|candle|candelabra|lantern|lamp|brazier|lamppost', ['Fwoosh! The flame dances.', 'The flame flickers and says hello.', 'Toasty! You warm your hands.'], 'whoosh', 'flare', ''),
    R('forge|oven|fire', ['Hot hot hot! Don\'t touch!'], 'whoosh', 'flare', ''),
    R('window|porthole', ['You peek outside. The moon is smiling at you!', 'A bat waves at you from outside. Hi, bat!'], 'sparkle', 'emoji', ''),
    R('clock|cuckoo', ['Cuckoo! Cuckoo!', 'Tick, tock, tick... the clock giggles.'], 'note', 'emoji', ''),
    R('cheese', ['It smells SO cheesy.', 'Nibbles would love this one.'], 'squeak', 'wiggle', ''),
    R('duck', ['Squeak!', 'A rubber duck! Squeak squeak!'], 'squeak', 'wiggle', ''),
    R('piano|harp|violin|trumpet|music|note|band|records|instrument|stand', ['Plink plonk!', 'A happy little tune!'], 'notes', 'emoji', ''),
    R('book|scroll|map|chart|spell|lectern', ['A book wiggles... it tickles!', 'You read a page: "How to Tickle a Dragon". Interesting!'], 'card', 'emoji', ''),
    R('plant|fern|flower|ivy|tree|tulip|strawberr|basket|topiary|palm|cactus|mushroom|garlic|herb|rose|pumpkin|lily|sunflower', ['Rustle rustle. A ladybug waves at you.', 'It smells like a summer garden.', 'Ouch, prickly!'], 'miss', 'wiggle', ''),
    R('armour|armor|helmet|shield|sword|lance|guard|weapon|hammer|anvil|horseshoe|tool', ['CLANK! Hello in there?', 'Clink clonk! Nobody home.'], 'block', 'wiggle', ''),
    R('cauldron|potion|bottle|alembic|jar|crystal|bubble|cursejar|toad', ['Blub blub! It burps a bubble.', 'Fizz! It smells like strawberries.'], 'pop', 'wiggle', ''),
    R('toy|block|train|soldier|kite|puppet|castle|spintop|rocking|crayon|plane', ['Choo choo! Wheee!', 'The toy soldiers stand up straight and salute!'], 'good', 'wiggle', ''),
    R('cookie|cake|cupcake|pie|bread|feast|apple|flour|milk|goblet|plate|tea|juice|sausage', ['Yum! It smells delicious.', 'Your tummy rumbles.'], 'good', 'wiggle', ''),
    R('chandelier', ['Tinkle tinkle! The crystals sparkle.'], 'sparkle', 'emoji', ''),
    R('banner|tapestry|drapes|curtain|bunting|garland', ['The banner flutters in a little breeze.'], 'miss', 'emoji', ''),
    R('cobweb', ['A tiny spider waves all eight hands at you.'], 'squeak', 'emoji', ''),
    R('gargoyle', ['The gargoyle pulls a face at you!'], 'bonk', 'emoji', ''),
    R('mousehole', ['A tiny voice: "Squeak! Go away, I am napping!"'], 'squeak', 'emoji', ''),
    R('treasure|coin|gold|crown', ['Shiny! So much gold!'], 'sparkle', 'emoji', ''),
    R('mirror', ['You make a funny face in the mirror. It makes one back!'], 'pop', 'emoji', ''),
    R('.', ['Hmm. Nothing happens.', 'You poke it. It does not poke back.', 'Boop!'], 'click', 'wiggle', ''),
  ];
  const ruleFor = (name) => RULES.find((r) => r.re.test(name));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function react(name, sx, sy, thing) {
    const r = ruleFor(name), a = G.audio;
    const n = () => Math.floor(Math.random() * 4);
    if (r.sound === 'notes') [0, 1, 2].forEach((i) => setTimeout(() => a.note(n()), i * 140));
    else if (r.sound === 'note') { a.note(n()); setTimeout(() => a.note(n()), 220); }
    else if (a[r.sound]) a[r.sound]();
    if (r.fx === 'flare' && G.renderer) G.renderer.boost = 0.9;
    if (r.fx === 'wiggle' && thing) G.addFx(420, (k) => { thing.shakeX = Math.sin(k * 26) * 6 * (1 - k); thing.lift = Math.sin(k * Math.PI) * 0.04; G.dirty = true; }, () => { thing.shakeX = 0; thing.lift = 0; });
    ui.burst(r.emoji, sx, sy, 4);
    ui.sayNow(pick(r.lines));
    const s = G.state; s.pokes = (s.pokes || 0) + 1;
  }

  /* ---------- a tap on the 3D view ---------- */
  function toView(clientX, clientY) {               // screen -> pixels of the 3D picture, and of the effects layer over it
    const v = ui.$('view'), r = v.getBoundingClientRect(), fx = ui.$('vpFx').getBoundingClientRect(), sc = G.scale || 1;
    return { x: (clientX - r.left) / r.width * v.width, y: (clientY - r.top) / r.height * v.height, sx: (clientX - fx.left) / sc, sy: (clientY - fx.top) / sc };
  }
  function whatIsAt(px, py) {
    const P = G.renderer && G.renderer.pk; if (!P) return null;
    const col = Math.max(0, Math.min(P.perp.length - 1, px | 0));
    // things standing in the room (front-most first)
    let best = null;
    for (const q of P.sprites) {
      const t = q.t; if (t.hidden || t.kind === 'spark' || q.tY > REACH + 0.5) continue;
      if (px < q.left || px > q.left + q.w || py < q.top || py > q.top + q.h || q.tY > P.perp[col] + 0.05) continue;
      if (!best || q.tY < best.tY) best = q;
    }
    if (best) return { thing: best.t };
    // a decoration on the wall
    const name = P.name[col];
    if (name && P.perp[col] < REACH && G.DECO_BOX && G.DECO_BOX[name]) {
      const v = (py - P.top[col]) / P.lh[col] * (G.TEX_SIZE || 128), u = P.tx[col], b = G.DECO_BOX[name];
      if (u >= b[0] - 4 && u <= b[2] + 4 && v >= b[1] - 4 && v <= b[3] + 4) return { deco: name, key: P.key[col] };
    }
    return null;
  }
  G.tapView = function (clientX, clientY) {
    if (G.busy()) return false;
    const p = toView(clientX, clientY), hit = whatIsAt(p.x, p.y);
    if (G.cleanTapAt && G.cleanTapAt(p, hit)) return true;  // the Witch's mess, and Mildred (cleaning.js)
    const ahead = G.facingSomething(), f = G.facing();
    if ((!hit || !hit.thing) && G.secretTapAt && G.secretTapAt(p)) return true;   // an odd-looking wall (secrets.js)
    if (hit && hit.thing) {
      const t = hit.thing;
      if (t.kind === 'pickup') { G.collect(t, p.sx, p.sy); return true; }
      if (t.x === f.x && t.y === f.y && ahead) { ahead(); return true; }      // the thing in front: open it as before
      if (t.kind === 'monster' && !G.state.flags['freed_' + t.id]) { G.audio.pop(); ui.burst('sparkle', p.sx, p.sy, 4); ui.sayNow('The curse bubble wobbles. Walk up to it to break the curse!'); return true; }
      if (t.kind === 'npc' || t.kind === 'monster') { G.audio.squeak(); ui.burst('sparkle', p.sx, p.sy, 3); ui.sayNow('They wave at you. Walk up to say hello!'); return true; }
      if (t.kind === 'object') { G.audio.sparkle(); ui.burst('sparkle', p.sx, p.sy, 4); ui.sayNow('Something to try! Walk up to it.'); return true; }
      react(t.sprite || '', p.sx, p.sy, t); return true;
    }
    if (hit && hit.deco) { if (G.ANIM_DECOS && G.ANIM_DECOS[hit.deco]) G.decoPoke(hit.key); react(hit.deco, p.sx, p.sy, null); return true; }   // a moving painting pulls its funny face
    if (ahead) { ahead(); return true; }
    return false;
  };

  /* ---------- a little shimmer on things you can poke, the first few times you stand still ---------- */
  let shimT = null;
  G.shimmerHint = function () {
    clearTimeout(shimT);
    if ((G.state.pokes || 0) >= 4) return;
    shimT = setTimeout(() => {
      if (G.busy() || G.screen !== 'game') return;
      const P = G.renderer.pk, v = ui.$('view'), sc = ui.$('vpFx').getBoundingClientRect().width / (G.scale || 1) / v.width, spots = [];
      for (const q of P.sprites) if ((q.t.kind === 'prop' || q.t.kind === 'pickup' || q.t.kind === 'light') && q.tY < REACH) spots.push([q.left + q.w / 2, q.top + q.h * 0.4]);
      for (let x = 4; x < P.name.length; x += 9) { const n = P.name[x]; if (n && P.perp[x] < REACH && G.DECO_BOX[n]) { const b = G.DECO_BOX[n]; spots.push([x, P.top[x] + (b[1] + b[3]) / 2 / (G.TEX_SIZE || 128) * P.lh[x]]); x += 30; } }
      spots.slice(0, 3).forEach(([x, y], i) => setTimeout(() => ui.burst('sparkle', x * sc, y * sc, 2), i * 220));
      if (spots.length && !G.state.flags.pokeTip) { G.state.flags.pokeTip = 1; ui.sayNow('Tip: tap things in the picture to poke them!'); }
    }, 1400);
  };
})();
