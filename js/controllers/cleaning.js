/* CONTROLLER — Cleaning up the Witch's mess, with Mildred.
   Mildred was Wanda's apprentice until she tidied up the Witch's potion shelf; Wanda turned her into a mop dog. She roams
   the hallways (G.MILDRED_ROUTE), running off when you come close and dropping her things as she goes (biscuits, her
   ribbon, an apron button, a spell book page). Once you have freed your first friend she sits and waits for you: she gives
   you her feather duster and asks you to dust three things. Then the curse washes off, she turns back into a girl, takes
   her things back (with a prize for each) and roams the hallways sweeping. Bump into her to trade witch trash for prizes.
   The mess (castle.js G.MESSES, and the cobwebs and cracks on the walls, and some dusty moving paintings): tap it and the
   right tool is used by itself, if you have it. Each tool comes from a freed friend (G.CLEAN_TOOLS: talk to them after
   meeting Mildred). Most things take a few taps (a pile gets smaller, goo shrinks, scribbles fade). Every room has a
   sparkle meter: clean everything in it and it is SPOTLESS (a prize, and the room gets a little brighter for good).
   State: G.state.clean { stage, done, drops, tut, idx (mess -> room) }, flags milMet / milHuman / tool_* / spotless_*. */
(function () {
  const ui = G.ui;
  const REACH = 3.2;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  /* ---------- the tools, and who gives them ---------- */
  G.CLEAN_TOOLS = {
    duster:  { name: 'Feather Duster', short: 'feather duster', from: 'mildred', sound: 'miss' },
    broom:   { name: 'Little Broom', short: 'broom', from: 'rat', who: 'Nibbles', sound: 'sweep',
      line: "Squeak! You're cleaning up the castle? I swept the cheese cellar every single day! Take my little broom. It's tiny, but it's magic: it grows!" },
    mop:     { name: 'Mop and Bucket', short: 'mop', from: 'skeleton', who: 'Sir Rattlebones', sound: 'splash',
      line: 'A ballroom must SHINE! I could see my skull in a clean floor. Take my mop and bucket, and mop up all that goo!' },
    thread:  { name: 'Silk Thread', short: 'silk thread', from: 'spider', who: 'Madame Webs', sound: 'card',
      line: 'Oh dear, are those MY old cobwebs everywhere? How embarrassing! Take my silk thread. It mends anything that is torn.' },
    hammer:  { name: 'Hammer', short: 'hammer', from: 'wolf', who: 'Howl', sound: 'block',
      line: 'A smith fixes things! Take my hammer. Bang, bang, and the broken furniture is as good as new.' },
    trowel:  { name: 'Trowel', short: 'trowel', from: 'troll', who: 'Big Barry', sound: 'bonk',
      line: 'Trolls fix bridges. Walls are just bridges standing up! Take my trowel and fill in those cracks.' },
    wand:    { name: 'Sparkle Wand', short: 'sparkle wand', from: 'wizard', who: 'Grumbledore', sound: 'sparkle',
      line: "Wanda's scribbles? Hmph! One wave of this sparkle wand and they are gone. It only does that ONE spell, mind you." },
    can:     { name: 'Watering Can', short: 'watering can', from: 'archer', who: 'Robin', sound: 'splash',
      line: 'Those poor wilted plants! Take my watering can. One splash each and they will bloom again.' },
    lantern: { name: 'Tinder Lantern', short: 'lantern', from: 'knight', who: 'the Iron Knight', sound: 'whoosh',
      line: "A knight's lantern never goes out. Take it, and light those cold old torches!" },
  };
  /* each kind of mess: the tool, how many taps, what is said */
  const TYPES = {
    pile:     { tool: 'broom', taps: 3, mid: ['Swish swish!', 'Swoosh! Nearly gone...'], end: null },
    goo:      { tool: 'mop', taps: 3, mid: ['Squelch! Mop mop mop...', 'Slurp! Almost clean...'], end: 'The goo is gone! The floor shines.' },
    paws:     { tool: 'mop', taps: 1, end: 'The dusty paw prints are mopped away.' },
    bunny:    { tool: 'duster', taps: 1, end: 'The dust bunny sneezes... and POOF! Gone!' },
    web:      { tool: 'duster', taps: 1, end: 'Swish! The cobweb is gone. A tiny spider waves goodbye and scuttles off.' },
    dust:     { tool: 'duster', taps: 3, mid: ['Swish! The dust flies off.', 'Swish swish! Is that a face under there?'], end: 'Clean! The painting can breathe again... and it winks at you!' },
    crack:    { tool: 'trowel', taps: 1, end: 'Scrape, pat, pat! The crack is filled in.' },
    scribble: { tool: 'wand', taps: 3, mid: ['Sparkle! The scribble fades...', 'Sparkle sparkle! Nearly gone...'], end: 'POOF! The Witch\'s scribble sparkles away.' },
    broken:   { taps: 2, mid: ['Bang! Bang!', 'Nearly fixed...'], end: null },
    plant:    { tool: 'can', taps: 1, end: 'Splash! The flower stretches up and blooms. It looks so happy!' },
    torch:    { tool: 'lantern', taps: 1, end: 'Fwoosh! The old torch is burning again.' },
  };
  const FIXED_LINE = { chair: 'Bang bang! The chair stands on four legs again.', table: 'Bang bang! The table has all its legs again.',
    banner: 'Stitch, stitch! The banner is mended, good as new.', pane: 'Tap tap! The window is fixed and the moon shines in.',
    chand: 'Bang bang... up it goes! The chandelier hangs from the ceiling and lights up again!' };
  const toolOf = (m) => (m.type === 'broken' ? (m.v === 'banner' ? 'thread' : 'hammer') : TYPES[m.type].tool);
  const TRASH = [['sock', 'a stinky striped sock'], ['peel', 'a slippery banana peel'], ['scroll', 'a burnt spell scroll'], ['brokenwand', 'a broken wand'], ['hairball', 'a fluffy cat-hair ball']];
  /* every line said while cleaning, in one place: tools-src/voice_script.py reads it to make the voice script, so
     a line recorded for it (art-src/voice) plays by itself when it shows up in the game */
  const TXT = G.CLEAN_TEXT = {
    types: TYPES, fixed: FIXED_LINE, trash: TRASH,
    need: (k) => `You need a ${G.CLEAN_TOOLS[k].short} for this. ${cap(G.CLEAN_TOOLS[k].who)} has one!`,
    tip: (k) => `Psst! ${cap(G.CLEAN_TOOLS[k].who)} has a ${G.CLEAN_TOOLS[k].short}. Break the curse if you haven't yet, then ask!`,
    swept: (what) => `Swoosh! All swept up. You found ${what}! Into the witch trash bag it goes.`,
    wait: (n) => `Dust three things with the feather duster: cobwebs, dusty paintings or dust bunnies. You have done ${n} of 3. I'll wait right here!`,
    biscuits: (n) => `My dog biscuits! I won't be needing those now. Here's a Royal Cheese for ${n > 1 ? 'each one' : 'it'}!`,
    pip: {
      noToolPile: 'Eww! A heap of witch trash. You would need something to clean that with...',
      noTool: 'What a mess! The Witch did this. You would need something to clean it with...',
      stitch: 'Stitch, stitch...',
      dogRuns: 'A shaggy dog! It barks, wags its tail... and runs off!',
      dogFar: 'A shaggy dog! Walk up to it.',
      girlFar: 'Mildred waves her broom at you. Walk up to say hello!',
      dogLick: 'Woof! Woof! The shaggy dog licks your hand, wags its whole stringy body... and scampers off!',
      tapHint: 'Tap a cobweb, a dusty painting or a dust bunny to dust it!',
      threeDusted: 'Three things dusted! Go back to the shaggy dog... something is happening to her!',
      spotless: "Hoo-hoo! This room is SPOTLESS! Everything sparkles. Here's a Royal Cheese for all that hard work!",
    },
    mil: {
      hello: 'Woof! I mean... HELLO! Oh, thank goodness, you are not the Witch!',
      whoAmI: 'I\'m Mildred. I was Wanda\'s apprentice, until I tidied up her potion shelf. She was SO cross, she turned me into a MOP! Look at me! I\'m all strings!',
      picked: 'Have you been picking up my things? Sorry! A dog just can\'t stop digging in the witch trash.',
      duster: 'Wanda left her mess all over the castle. Cobwebs! Goo! Stinky socks! Here, take my feather duster. Dust three things for me: cobwebs, dusty paintings or dust bunnies. Maybe a bit of tidying will wash this silly curse off!',
      tingle: 'You did it! I can feel it... my strings are TINGLING!',
      me: 'I\'m ME again! Look, hands! Thank you, thank you, THANK YOU!',
      ribbon: 'My hair ribbon! A bit furry, but it\'s mine. Take this Bubble Potion.',
      button: 'And my apron button! Here, a Spicy Pepper for finding it.',
      page: 'My spell book page: How to Tidy Up! You keep it. It\'s now your Cleaning Book: look for it in your Quest journal.',
      friends: 'There is still SO much mess. My friends in the castle have more cleaning tools: Nibbles swept the cheese cellar every day, so he has a broom! Free your friends and ask them.',
      sweeping: 'I\'ll keep sweeping the hallways. Bring me any witch trash you sweep up, and I\'ll swap it for prizes!',
      allTools: 'You have every tool! Look in your Cleaning Book to see which rooms still need a good tidy.',
      sparkles: 'The whole castle sparkles! You are the best cleaner in the kingdom!',
      trade: 'Ooh, lovely witch trash! Just what my bins need. Here you go:',
    },
  };
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  G.cleanState = function () {
    const s = G.state; if (!s.clean) s.clean = { stage: {}, done: {}, drops: [], tut: 0, idx: {} };
    return s.clean;
  };
  const C = () => G.cleanState();
  const isDone = (id) => !!(G.state && G.state.clean && G.state.clean.done[id]);
  const stageOf = (id) => (G.state && G.state.clean && G.state.clean.stage[id]) || 0;
  const hasTool = (k) => !!G.state.flags['tool_' + k];
  const inCastle = () => G.mapId && G.mapId() === 'castle';

  /* ---------- the floor and wall layers (cleanArt.js), as pixels ---------- */
  G.CLEAN_PX = null;
  G.loadCleanArt = async function () {
    const A = G.CLEAN_ART; if (!A) return 0;
    const S = G.TEX_SIZE || 128;
    const px = (src) => new Promise((res) => {
      const i = new Image(); i.onerror = () => res(null);
      i.onload = () => { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(i, 0, 0, S, S); res(new Uint32Array(x.getImageData(0, 0, S, S).data.buffer.slice(0))); };
      i.src = src;
    });
    const P = { goo: {}, paws: await px(A.paws), dust: await px(A.dust), scribbles: await Promise.all(A.scribbles.map(px)) };
    for (const c in A.goo) P.goo[c] = await Promise.all(A.goo[c].map(px));
    G.CLEAN_PX = P;
    return 1;
  };
  const fades = new Map();
  function faded(L, a) {                                // a wall layer at a: scribbles and dust fade as you clean them
    if (a >= 1) return L;
    let m = fades.get(L); if (!m) fades.set(L, (m = {}));
    if (m[a]) return m[a];
    const o = new Uint32Array(L.length);
    for (let i = 0; i < L.length; i++) { const c = L[i]; o[i] = ((c & 0xffffff) | (((c >>> 24) * a) << 24)) >>> 0; }
    return (m[a] = o);
  }
  function over(base, L) {                              // a floor picture with a see-through layer on top
    const o = new Uint32Array(base.length);
    for (let i = 0; i < base.length; i++) {
      const c = L[i], a = c >>> 24; if (!a) { o[i] = base[i]; continue; }
      const b = base[i], k = a / 255, j = 1 - k;
      o[i] = (0xff000000 | (((b >>> 16 & 255) * j + (c >>> 16 & 255) * k) << 16) | (((b >>> 8 & 255) * j + (c >>> 8 & 255) * k) << 8) | ((b & 255) * j + (c & 255) * k)) >>> 0;
    }
    return o;
  }
  const FADE = [1, 0.6, 0.32];
  /* a dusty painting: a grey veil over just the painting (its box on the wall, DECO_BOX), the dust and cobwebs on top */
  const dustCache = {};
  function dustLayer(box) {
    const S = G.TEX_SIZE || 128, D = G.CLEAN_PX.dust, b = box || [8, 8, S - 8, S - 8], k = b.join(',');
    if (dustCache[k]) return dustCache[k];
    const o = new Uint32Array(S * S), x0 = Math.max(0, Math.floor(b[0] - 4)), y0 = Math.max(0, Math.floor(b[1] - 4)), x1 = Math.min(S, Math.ceil(b[2] + 4)), y1 = Math.min(S, Math.ceil(b[3] + 4));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const u = (((x - x0) / (x1 - x0)) * S) | 0, v = (((y - y0) / (y1 - y0)) * S) | 0, c = D[v * S + u], a = (c >>> 24) / 255;
      const A = Math.min(1, 0.5 + a * 0.9), mix = a * 0.9 / A;                       // the veil, with the dust art over it
      const r = 176 * (1 - mix) + (c & 255) * mix, g = 170 * (1 - mix) + (c >>> 8 & 255) * mix, bl = 160 * (1 - mix) + (c >>> 16 & 255) * mix;
      o[y * S + x] = ((((A * 255) | 0) << 24) | ((bl | 0) << 16) | ((g | 0) << 8) | (r | 0)) >>> 0;
    }
    return (dustCache[k] = o);
  }

  /* ---------- floor messes (goo, paw prints) ---------- */
  function floorLayer(m) { const P = G.CLEAN_PX; if (!P) return null; return m.type === 'paws' ? P.paws : P.goo[m.v] && P.goo[m.v][Math.min(2, stageOf(m.id))]; }
  function floorMess(w, m) {
    const i = m.y * w.w + m.x, th = w.theme[i]; if (!th) return;
    if (!(i in w.mfBase)) w.mfBase[i] = w.floorOv[i] || null;
    const base = w.mfBase[i] || th.floor, L = floorLayer(m);
    w.floorOv[i] = isDone(m.id) || !L ? w.mfBase[i] : over(base, L);
    G.dirty = true;
  }
  G.messFloors = function (w) {                         // world.js, when the castle is built
    w.mfBase = {}; if (G.mapId() !== 'castle' || !G.state) return;
    for (const m of G.MESSES) if ((m.type === 'goo' || m.type === 'paws') && !isDone(m.id)) floorMess(w, m);
  };
  const floorMessAt = (x, y) => G.MESSES.find((m) => (m.type === 'goo' || m.type === 'paws') && m.x === x && m.y === y && !isDone(m.id));

  /* ---------- wall messes: scribbles, dusty paintings, cobwebs and cracks ---------- */
  const N4 = [[-1, 0, 1], [1, 0, 0], [0, -1, 3], [0, 1, 2]];
  const DELTA = [[1, 0], [-1, 0], [0, 1], [0, -1]];    // face code -> the open square in front of it
  const faceKey = (w, m) => (m.y * w.w + m.x) * 4 + (m.from[0] < m.x ? 1 : m.from[0] > m.x ? 0 : m.from[1] < m.y ? 3 : 2);
  function hsh(k) { k = Math.imul(k ^ (k >>> 16), 0x45d9f3b); k = Math.imul(k ^ (k >>> 16), 0x45d9f3b); return (k ^ (k >>> 16)) >>> 0; }
  G.messFaces = function (w) {                          // blocks.js wallPicFaces: a scribbled wall has no other decoration
    if (G.mapId() !== 'castle') return;
    for (const m of G.MESSES) if (m.type === 'scribble') w.fixedPic[faceKey(w, m)] = { pic: null };
  };
  function wallLayer(w, k) {
    const m = w.wallMess[k], P = G.CLEAN_PX; if (!m || !P) return;
    if (isDone(m.id)) { delete w.tellOv[k]; delete w.wallMess[k]; if (w.dusty) delete w.dusty[k]; return; }
    if (m.type === 'scribble') w.tellOv[k] = faded(P.scribbles[m.v], FADE[Math.min(2, stageOf(m.id))]);
    if (m.type === 'dust') w.tellOv[k] = faded(dustLayer(m.box), FADE[Math.min(2, stageOf(m.id))]);
  }
  G.placeWallMesses = function (w, marks) {             // wallLook.js buildWallMarks, after the secrets and wall pictures
    w.wallMess = {}; w.dusty = {}; w.allWall = [];
    if (G.mapId() !== 'castle' || !G.state || !G.CLEAN_PX) return;
    w.tellOv = w.tellOv || {};
    const reg = (k) => { const c = k >> 2, d = DELTA[k & 3]; return w.region[((c / w.w) | 0) * w.w + d[1] * w.w + (c % w.w) + d[0]]; };
    for (const m of G.MESSES) if (m.type === 'scribble') {
      const k = faceKey(w, m); w.allWall.push({ id: m.id, r: reg(k) });
      if (!isDone(m.id)) { w.wallMess[k] = m; marks[k] = 0; wallLayer(w, k); }
    }
    for (let k = 0; k < marks.length; k++) {           // the cobwebs and cracks already on the walls
      const v = marks[k]; if (!v || w.tellOv[k]) continue;
      const M = G.MARKS[(v & 255) - 1]; if (!M) continue;
      const type = M.name === 'cobweb' ? 'web' : /^crack/.test(M.name) ? 'crack' : null; if (!type) continue;
      const id = type + ':' + k; w.allWall.push({ id, r: reg(k) });
      if (isDone(id)) marks[k] = 0; else w.wallMess[k] = { id, type, key: k, mark: v };
    }
    for (let wy = 0; wy < w.h; wy++) for (let wx = 0; wx < w.w; wx++) {   // every second or third moving painting is dusty
      if (w.cells[wy * w.w + wx] !== 1) continue;
      for (const [dx, dy, code] of N4) {
        const nx = wx + dx, ny = wy + dy; if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h || w.cells[ny * w.w + nx] !== 0) continue;
        const th = w.theme[ny * w.w + nx]; if (!th || !th.overFrames) continue;
        const k = (wy * w.w + wx) * 4 + code, vi = G.wallVariant(w, wx, wy, code, th);
        if (!th.overFrames[vi] || w.tellOv[k] || hsh(k) % 5 > 2) continue;
        const id = 'dust:' + k; w.allWall.push({ id, r: w.region[ny * w.w + nx] });
        if (!isDone(id)) { w.wallMess[k] = { id, type: 'dust', key: k, box: (G.DECO_BOX || {})[th.variants[vi]] }; w.dusty[k] = 1; wallLayer(w, k); }
      }
    }
    indexMesses(w);
  };
  /* which room each mess is in (saved, so the meters work from anywhere) */
  function indexMesses(w) {
    const I = C().idx = {};
    for (const m of G.MESSES) I[m.id] = m.type === 'scribble' ? w.region[m.from[1] * w.w + m.from[0]] : w.region[m.y * w.w + m.x];
    for (const a of w.allWall) if (!(a.id in I)) I[a.id] = a.r;
  }

  /* ---------- messes standing in rooms ---------- */
  const SPRITE = {
    pile: (m) => 'prop_trash-' + m.v + Math.min(3, stageOf(m.id) + 1),
    bunny: () => 'prop_dustbunny2',
    broken: (m) => (isDone(m.id) ? (m.v === 'chand' ? 'prop_fix-chandelier' : 'prop_fix-' + m.v) : 'prop_broken-' + m.v),
    plant: (m) => (isDone(m.id) ? 'prop_bloom-plant' : 'prop_wilted-plant'),
    torch: () => 'prop_bracket-sooty',
  };
  function messThing(m) {
    const done = isDone(m.id);
    if (done && (m.type === 'pile' || m.type === 'bunny')) return null;
    const sprite = SPRITE[m.type](m), wallHung = m.type === 'torch' || (m.type === 'broken' && (m.v === 'banner' || m.v === 'pane'));
    if (m.type === 'torch' && done) return null;        // a lit torch is a wall light (relight)
    const kind = !done ? 'mess' : wallHung || m.v === 'chand' ? 'deco' : 'prop';
    return { kind, id: 'mess_' + m.id, mess: m, x: m.x, y: m.y, ox: m.ox || 0, oy: m.oy || 0, sprite, spr: G.SPR[sprite], walk: kind === 'mess' && (wallHung || m.type === 'bunny') };
  }
  function relight(m) {                                  // a lit torch: a flickering wall light, and an unseen 'torch' that lights the room
    if (!G.lightFrames) return;
    const fr = G.lightFrames('torch', 'torch'); if (!fr) return;
    G.things.push({ kind: 'light', sprite: 'torch', x: m.x, y: m.y, ox: m.ox || 0, oy: m.oy || 0, frames: fr, fi: 0, spr: fr[0], glow: G.LIGHT_ART.torch.flames, phase: Math.random() * 4, noFog: true });
    G.things.push({ kind: 'deco', sprite: 'torch', x: m.x, y: m.y, ox: m.ox || 0, oy: m.oy || 0, spr: null });
  }
  G.addMesses = function () {                           // world.js buildThings (castle only)
    if (!inCastle() || !G.state) return;
    for (const m of G.MESSES) {
      if (m.type === 'goo' || m.type === 'paws' || m.type === 'scribble') continue;
      if (m.type === 'torch' && isDone(m.id)) { relight(m); continue; }
      const t = messThing(m); if (t) G.things.push(t);
    }
    addMildred();
  };

  /* ---------- tapping the mess ---------- */
  function floorAt(px, py) {                            // which floor square is under this point of the 3D picture
    const r = G.renderer, v = r && r.view; if (!v || py <= v.horizon + 1) return null;
    const camX = 2 * px / v.W - 1, rdx = v.dirX + v.plX * camX, rdy = v.dirY + v.plY * camX, d = (v.K * 0.5) / (py - v.horizon);
    return { x: v.posX + rdx * d, y: v.posY + rdy * d, d };
  }
  function wallHit(m, P, col, py) {                     // tapped on the mark itself (cobwebs, cracks), or anywhere on the wall
    if (m.type !== 'web' && m.type !== 'crack') return true;
    const M = G.MARKS[(m.mark & 255) - 1], mx = (m.mark >> 8) & 255, my = (m.mark >> 16) & 255, S = G.TEX_SIZE || 128;
    const v = (py - P.top[col]) / P.lh[col] * S, u = P.tx[col];
    return u >= mx - 14 && u <= mx + M.w + 14 && v >= my - 14 && v <= my + M.h + 14;
  }
  const far = (t) => Math.hypot(t.x + (t.ox || 0) - G.state.x, t.y + (t.oy || 0) - G.state.y);
  G.cleanTapAt = function (p, hit) {                    // poke.js tapView, before anything else
    if (!inCastle() || !G.state) return false;
    const w = G.world;
    if (hit && hit.thing) {
      const t = hit.thing;
      if (t.kind === 'mess') { G.cleanMess(t.mess, p, t); return true; }
      if (t.id === 'mildred') { if (far(t) <= 2.6) G.mildredTalk(t); else { G.audio.squeak(); ui.sayNow(G.state.flags.milHuman ? TXT.pip.girlFar : TXT.pip.dogFar); } return true; }
      return false;
    }
    const P = G.renderer && G.renderer.pk, col = Math.max(0, Math.min(P.perp.length - 1, p.x | 0));
    if (P && w.wallMess && P.perp[col] < REACH && p.y >= P.top[col] && p.y <= P.top[col] + P.lh[col]) {
      const m = w.wallMess[P.key[col]];
      if (m && wallHit(m, P, col, p.y)) { G.cleanMess(m, p); return true; }
    }
    const f = floorAt(p.x, p.y);
    if (f && f.d < REACH + 0.5 && f.d < P.perp[col]) { const m = floorMessAt(f.x | 0, f.y | 0); if (m) { G.cleanMess(m, p); return true; } }
    return false;
  };

  function needLine(tool) { return G.CLEAN_TOOLS[tool].who ? TXT.need(tool) : 'You need something to clean this with.'; }
  function whereOf(m) {                                 // the middle of a mess, for the sparkle (floor squares, or just off the wall)
    if (m.key != null || m.type === 'scribble') {
      const w = G.world, k = m.key != null ? m.key : faceKey(w, m), c = k >> 2, d = DELTA[k & 3], wx = c % w.w, wy = (c / w.w) | 0;
      return { x: wx + d[0], y: wy + d[1], ox: -d[0] * 0.42, oy: -d[1] * 0.42, lift: 0.3 };
    }
    return { x: m.x, y: m.y, ox: m.ox || 0, oy: m.oy || 0, lift: m.type === 'torch' || (m.type === 'broken' && /banner|pane/.test(m.v)) ? 0.3 : 0 };
  }
  G.cleanMess = function (m, p, thing) {
    const s = G.state, c = C(), T = TYPES[m.type], tool = toolOf(m), sx = p && p.sx, sy = p && p.sy;
    if (c.done[m.id]) return;
    if (!s.flags.milMet) { G.audio.miss(); ui.sayNow(m.type === 'pile' ? TXT.pip.noToolPile : TXT.pip.noTool); return; }
    if (!hasTool(tool)) { G.audio.miss(); ui.sayNow(needLine(tool)); return; }
    const snd = G.CLEAN_TOOLS[tool].sound; if (G.audio[snd]) G.audio[snd]();
    if (sx != null) ui.burst('tool-' + tool, sx, sy, 2);
    const n = (c.stage[m.id] || 0) + 1;
    if (n < T.taps) {                                   // one step cleaner
      c.stage[m.id] = n;
      if (thing && m.type === 'pile') { thing.sprite = SPRITE.pile(m); thing.spr = G.SPR[thing.sprite]; }
      if (thing) G.addFx(300, (k) => { thing.shakeX = Math.sin(k * 30) * 4 * (1 - k); G.dirty = true; }, () => { thing.shakeX = 0; });
      refresh(m);
      ui.sayNow(m.type === 'broken' && tool === 'thread' ? TXT.pip.stitch : pick(T.mid)); G.save(); G.dirty = true;
      return;
    }
    c.done[m.id] = 1; delete c.stage[m.id];
    const at = whereOf(m); poof(at);
    let line = T.end;
    if (m.type === 'pile') {                            // swept up: witch trash for Mildred, and now and then a surprise
      const [, what] = pick(TRASH); G.giveItem('witchtrash', 1);
      line = TXT.swept(what);
      if (Math.random() < 0.3) { const k = pick(['cheese', 'pepper', 'bubble']); G.giveItem(k, 1); line += ` And under it... a ${G.ITEMS[k].name}!`; }
    }
    if (m.type === 'broken') line = FIXED_LINE[m.v];
    if (thing) { const i = G.things.indexOf(thing); if (i >= 0) G.things.splice(i, 1); }
    const nt = SPRITE[m.type] && messThing(m); if (nt) { G.things.push(nt); if (G.liftOntoBlocks) G.liftOntoBlocks(); }   // mended: the fixed chair, the blooming plant...
    if (m.type === 'torch') relight(m);
    if (m.type === 'torch' || (m.type === 'broken' && m.v === 'chand')) G.renderer.L = null;   // more light in the room
    refresh(m);
    if (m.type === 'dust' && m.key != null) setTimeout(() => G.decoPoke && G.decoPoke(m.key), 300);   // the clean painting pulls its funny face
    ui.sayNow(line);
    if (tool === 'duster' && s.flags.milMet && !s.flags.milHuman && c.tut < 3) {   // Mildred's lesson
      c.tut++;
      if (c.tut >= 3) setTimeout(() => { G.audio.good(); ui.toast('Three things dusted! Go back to the shaggy dog.'); ui.sayNow(TXT.pip.threeDusted); }, 1300);
      else ui.toast(`Dusted: ${c.tut} of 3`);
    } else meter(m);
    G.save(); G.dirty = true;
  };
  function refresh(m) {                                 // the mess as it looks now: on the floor or on the wall
    const w = G.world; if (!w) return;
    if (m.type === 'goo' || m.type === 'paws') floorMess(w, m);
    if (m.type === 'scribble' || m.key != null) {
      const k = m.key != null ? m.key : faceKey(w, m);
      if (isDone(m.id) && w.marks && (m.type === 'web' || m.type === 'crack')) w.marks[k] = 0;
      wallLayer(w, k);
    }
    G.dirty = true;
  }

  /* ---------- the sparkle meter of every room ---------- */
  function roomCounts(r) {
    const I = C().idx; let n = 0, d = 0;
    for (const id in I) if (I[id] === r) { n++; if (isDone(id)) d++; }
    return [d, n];
  }
  function meter(m) {
    const r = C().idx[m.id]; if (!r) return;
    const [d, n] = roomCounts(r), R = G.ROOMS[r], name = R ? R.name : 'This room';
    if (d < n) { ui.toast(`${name}: ${d} of ${n} clean`); return; }
    const f = G.state.flags; if (f['spotless_' + r]) return;
    f['spotless_' + r] = 1;
    setTimeout(() => {                                  // a little party
      G.audio.fanfare(true); G.giveItem('cheese', 1);
      ui.toast(`${name} is SPOTLESS!`);
      ui.say('Pip', TXT.pip.spotless, []);
      const v = ui.$('vpFx').getBoundingClientRect(), sc = G.scale || 1;
      for (let i = 0; i < 6; i++) setTimeout(() => ui.burst('sparkle', (v.width / sc) * (0.2 + Math.random() * 0.6), (v.height / sc) * (0.2 + Math.random() * 0.5), 3), i * 160);
      G.renderer.L = null; G.dirty = true; G.save();
    }, 900);
  }
  G.isSpotless = (r) => !!(G.state && G.state.flags['spotless_' + r]);
  /* the Cleaning Book: a part of the quest journal (menus.js) */
  G.cleanJournal = function () {
    const f = G.state.flags; if (!f.milMet) return '';
    const I = C().idx, rooms = [...new Set(Object.values(I))].filter((r) => G.ROOMS[r] && G.state.visited[r]);   // rooms you have been in (no secret-room spoilers)
    const tools = Object.keys(G.CLEAN_TOOLS).map((k) => `<img class="ico tool${hasTool(k) ? '' : ' missing'}" src="${ui.picSrc('tool-' + k)}" alt="" title="${G.CLEAN_TOOLS[k].name}">`).join('');
    const list = rooms.map((r) => { const [d, n] = roomCounts(r); return `<li class="${d >= n ? 'done' : 'todo'}">${d >= n ? ui.svg.tick : ui.svg.todo} ${G.ROOMS[r].name}: ${d} / ${n}</li>`; }).join('');
    return `<div class="clean-book"><div class="cb-title">Cleaning Book</div><div class="cb-tools">${tools}</div><ul class="journal cb-rooms">${list}</ul></div>`;
  };

  /* ---------- the sparkle when something is clean, and the dust bunnies snoozing ---------- */
  const fx = [];
  function poof(at) {
    const t = { kind: 'deco', x: at.x, y: at.y, ox: at.ox, oy: at.oy, lift: at.lift || 0, spr: G.SPR['prop_fx-poof1'], noFog: true, t0: performance.now() };
    G.things.push(t); fx.push(t); G.dirty = true;
  }
  function tickFx(now) {
    let busy = false;
    for (let i = fx.length - 1; i >= 0; i--) {
      const t = fx[i], f = ((now - t.t0) / 85) | 0;
      if (f >= 6) { fx.splice(i, 1); const j = G.things.indexOf(t); if (j >= 0) G.things.splice(j, 1); busy = true; continue; }
      const s = G.SPR['prop_fx-poof' + (f + 1)]; if (s !== t.spr) { t.spr = s; busy = true; }
    }
    for (const t of G.things) if (t.kind === 'mess' && t.mess.type === 'bunny') {   // a dust bunny snoozes, now and then rolls over
      const k = (now / 1000 + hsh(t.x * 31 + t.y) % 7) % 7, sp = G.SPR[k < 5 ? 'prop_dustbunny2' : k < 6 ? 'prop_dustbunny1' : 'prop_dustbunny3'];
      if (t.spr !== sp) { t.spr = sp; busy = true; }
    }
    return busy;
  }

  /* ---------- the tools from the friends (movement.js monsterPrompt, a freed friend) ---------- */
  G.friendTool = function (id) {
    const s = G.state; if (!s.flags.milMet) return false;
    const k = Object.keys(G.CLEAN_TOOLS).find((t) => G.CLEAN_TOOLS[t].from === id); if (!k || hasTool(k)) return false;
    const m = G.MONSTERS[id], T = G.CLEAN_TOOLS[k];
    s.flags['tool_' + k] = 1; G.save(); G.audio.good();
    ui.toast(`Got the ${T.name}!`);
    ui.say(m.freedName || m.name, T.line, [{ label: 'Thank you!', fn: () => G.arrived && G.arrived(true) }]);
    return true;
  };

  /* ---------- Mildred ---------- */
  const DROPS = ['biscuit', 'ribbon', 'biscuit', 'broombutton', 'biscuit', 'tidypage'];
  const SPEED = { walk: 1.9, run: 3.4, girl: 1.25 };
  const M = { wp: 0, to: null, p: 0, mode: 'roam', until: 0, last: 0, change: 0, bumped: null };
  let mood = 'happy';
  function mil() { return G.things && G.things.find((t) => t.id === 'mildred'); }
  function addMildred() {
    const s = G.state, c = C(), at = c.milAt || G.MILDRED_ROUTE[0];
    G.things.push({ kind: 'npc', id: 'mildred', name: s.flags.milHuman ? 'Mildred' : s.flags.milMet ? 'Mildred' : 'Shaggy Dog', x: at[0], y: at[1], ox: 0, oy: 0, walk: true, sprite: 'mildred', spr: frame('sit') });
    M.to = null; M.p = 0; M.mode = s.flags.milMet && !s.flags.milHuman ? 'sit' : 'roam';
    if (c.milWp != null) M.wp = c.milWp;
  }
  /* her picture: art faces left, so walking to the right on screen she is turned round */
  function mirror(spr) {
    if (!spr) return spr; if (spr.mirror) return spr.mirror;
    const flip = (src) => { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; };
    spr.mirror = Object.assign({}, spr, { c: flip(spr.c), sil: flip(spr.sil) }); spr.mirror.mirror = spr;
    return spr.mirror;
  }
  function frame(n) { return G.SPR[(G.state && G.state.flags.milHuman ? 'prop_mil-' : 'prop_mil-dog-') + n]; }
  G.speakerArt = function (title) {                     // ui.js: her portrait beside the text
    if (title !== 'Mildred' && title !== 'Shaggy Dog') return null;
    const g = G.state && G.state.flags.milHuman;
    return ui.picSrc('mildred-' + (g ? { happy: 'girl-smile', talk: 'girl-talk', worried: 'girl-surprised', surprised: 'girl-surprised' }[mood] : { happy: 'dog-happy', talk: 'dog-talk', worried: 'dog-worried', surprised: 'dog-worried' }[mood]));
  };
  const free = (x, y) => { const w = G.world; return x >= 0 && y >= 0 && x < w.w && y < w.h && w.cells[y * w.w + x] === 0 && !G.thingAt(x, y) && !G.blockAt(x, y) && !G.portalAt(x, y); };
  function nextStep(t, goal) {                          // the first square on the way to goal (walking the hallways)
    const w = G.world, start = t.y * w.w + t.x, g = goal[1] * w.w + goal[0]; if (start === g) return null;
    const prev = new Map([[start, -1]]), q = [start];
    while (q.length) {
      const i = q.shift(); if (i === g) break;
      const x = i % w.w, y = (i / w.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * w.w + x + dx; if (!prev.has(j) && free(x + dx, y + dy)) { prev.set(j, i); q.push(j); } }
    }
    if (!prev.has(g)) return null;
    let i = g; while (prev.get(i) !== start) i = prev.get(i);
    return [i % w.w, (i / w.w) | 0];
  }
  function tickMildred(now) {
    const t = mil(); if (!t || !inCastle()) return false;
    const s = G.state, f = s.flags, c = C(), dt = Math.min(0.1, (now - (M.last || now)) / 1000); M.last = now;
    const human = !!f.milHuman, d = Math.hypot(t.x + t.ox - s.x, t.y + t.oy - s.y);
    let busy = false;
    if (M.mode === 'change') {                          // turning back into a girl
      const k = Math.min(5, ((now - M.change) / 420) | 0), sp = G.SPR['prop_mil-change' + (k + 1)];
      if (t.spr !== sp) { t.spr = sp; busy = true; if (k === 3) G.audio.fanfare(true); }
      if (now - M.change > 6 * 420 + 300) { M.mode = 'idle'; busy = true; M.after && M.after(); }
      return busy;
    }
    // what she does now
    if (!human && !f.milMet) {
      if (!f.freed_rat) { if (d <= 2.2 && M.mode !== 'run') { M.mode = 'run'; G.audio.bark && G.audio.bark(); if (!f.milSeen) { f.milSeen = 1; ui.sayNow(TXT.pip.dogRuns); } } }
      else if (d <= 3 && !M.to) M.mode = 'sit';
      else if (M.mode === 'sit' && d > 5) M.mode = 'roam';
    } else if (!human) M.mode = 'sit';
    else if (d <= 1.6) M.mode = 'idle';
    else if (M.mode === 'idle') M.mode = 'roam';
    if (now < M.talkUntil) { if (!M.to) M.mode = human ? 'idle' : 'sit'; }
    // walking
    const speed = human ? SPEED.girl : M.mode === 'run' ? SPEED.run : SPEED.walk;
    if (M.to) {
      M.p += speed * dt;
      if (M.p >= 1) { t.x = M.to[0]; t.y = M.to[1]; t.ox = t.oy = 0; M.to = null; M.p = 0; c.milAt = [t.x, t.y]; arrived(t); }
      else { t.ox = (M.to[0] - t.x) * M.p; t.oy = (M.to[1] - t.y) * M.p; }
      busy = true;
    } else if ((M.mode === 'roam' || M.mode === 'run') && now >= M.until) {
      const goal = G.MILDRED_ROUTE[M.wp % G.MILDRED_ROUTE.length];
      if (t.x === goal[0] && t.y === goal[1]) { M.wp = (M.wp + 1) % G.MILDRED_ROUTE.length; c.milWp = M.wp; if (M.mode === 'run') M.mode = 'roam'; else M.until = now + 1500 + Math.random() * 3000; }
      else {
        const nx = nextStep(t, goal);
        if (nx && !(nx[0] === s.x && nx[1] === s.y)) { M.to = nx; M.p = 0; M.dir = [nx[0] - t.x, nx[1] - t.y]; }
        else M.until = now + 600;
      }
    }
    // her picture
    let sp;
    const moving = !!M.to;
    if (!human) sp = moving ? (M.mode === 'run' ? (((now / 110) | 0) & 1 ? frame('run') : frame('walk2')) : frame('walk' + (1 + (((now / 120) | 0) % 3)))) : M.mode === 'sit' && now < M.talkUntil ? frame('bark') : frame('sit');
    else sp = moving ? frame('idle') : M.mode === 'idle' ? (now < M.talkUntil ? frame('talk') : frame('wave')) : frame('sweep' + (1 + (((now / 170) | 0) % 3)));
    t.lift = human && moving ? Math.abs(Math.sin(now / 110)) * 0.025 : 0;
    if (moving && M.dir) { const a = G.cam.a, right = M.dir[0] * Math.cos(a) + M.dir[1] * Math.sin(a); if (right > 0.1) sp = mirror(sp); }
    if (sp && t.spr !== sp) { t.spr = sp; busy = true; }
    return busy;
  }
  function arrived(t) {                                 // a shaggy dog drops her things as she goes
    const s = G.state, c = C();
    if (s.flags.milMet || c.drops.length >= DROPS.length) return;
    const wp = G.MILDRED_ROUTE.some(([x, y]) => x === t.x && y === t.y);
    if (!wp || Math.random() > 0.8 || (t.x === s.x && t.y === s.y) || (G.pickupAt && G.pickupAt(t.x, t.y))) return;
    const d = { id: 'md' + (c.drops.length + 1), item: DROPS[c.drops.length], x: t.x, y: t.y };
    c.drops.push(d);
    if (G.SPR['pick_' + d.item]) G.things.push({ kind: 'pickup', id: d.id, item: d.item, x: d.x, y: d.y, spr: G.SPR['pick_' + d.item], noFog: true });
    G.save();
  }
  G.cleanTick = function (now) { return tickFx(now) | tickMildred(now); };

  /* walking into her: the first bump says hello, the next one squeezes past (she swaps places with you) */
  G.mildredBump = function (nx, ny, a, bump) {
    const t = mil(); if (!t || t.x !== nx || t.y !== ny || M.to) return false;
    if (a === 'fwd' && !(M.bumped && M.bumped[0] === nx && M.bumped[1] === ny)) { M.bumped = [nx, ny]; bump(); G.mildredTalk(t); return true; }
    t.x = G.state.x; t.y = G.state.y; M.bumped = null; C().milAt = [t.x, t.y];
    return false;
  };

  const say = (m, text, choices) => { mood = m; ui.say('Mildred', text, choices); M.talkUntil = performance.now() + 6000; };
  G.mildredTalk = function (t) {
    const s = G.state, f = s.flags, c = C();
    M.talkUntil = performance.now() + 6000;
    if (!f.milMet && !f.freed_rat) {                    // too shy (and too waggy) to stop yet
      G.audio.bark && G.audio.bark(); mood = 'happy';
      ui.say('Shaggy Dog', TXT.pip.dogLick, []);
      M.mode = 'run'; M.until = 0; M.talkUntil = 0; return;
    }
    if (!f.milMet) {                                    // meeting her
      const lines = [['happy', TXT.mil.hello], ['talk', TXT.mil.whoAmI]];
      if (DROPS.some((k) => s.items[k] > 0)) lines.push(['worried', TXT.mil.picked]);
      lines.push(['talk', TXT.mil.duster]);
      let i = 0;
      const next = () => {
        if (i < lines.length) { const [md, tx] = lines[i++]; say(md, tx, [{ label: i < lines.length ? 'Next' : 'Let\'s clean!', fn: next }]); if (i === 1) G.audio.bark && G.audio.bark(); return; }
        f.milMet = 1; f.tool_duster = 1; t.name = 'Mildred'; c.tut = 0; G.save(); G.audio.good();
        ui.toast('Got the Feather Duster!');
        ui.sayNow(TXT.pip.tapHint);
      };
      next(); return;
    }
    if (!f.milHuman && c.tut < 3) { say('talk', TXT.wait(c.tut), []); return; }
    if (!f.milHuman) {                                  // the curse washes off
      say('surprised', TXT.mil.tingle, [{ label: 'Whoa!', fn: () => {
        ui.choices([]); M.mode = 'change'; M.change = performance.now(); G.audio.sparkle(); G.lockInput = true;
        M.after = () => { G.lockInput = false; f.milHuman = 1; t.name = 'Mildred'; G.save(); girlHello(t); };
      } }]);
      return;
    }
    // later: tips, and witch trash for prizes
    const trash = s.items.witchtrash || 0, ch = [];
    if (trash >= 3) ch.push({ label: `Give her the witch trash (${trash})`, fn: () => trade(t) });
    ch.push({ label: 'Bye!', fn: () => G.arrived && G.arrived(true) });
    say('talk', tip() + (trash > 0 && trash < 3 ? ` You have ${trash} witch trash. Bring me 3 and I'll swap them for a prize!` : ''), ch);
  };
  function tip() {
    const f = G.state.flags;
    for (const k in G.CLEAN_TOOLS) {
      const T = G.CLEAN_TOOLS[k], m = G.MONSTERS[T.from]; if (hasTool(k) || !m) continue;
      return TXT.tip(k);
    }
    const left = Object.values(C().idx).filter((r, i, a) => a.indexOf(r) === i && G.ROOMS[r] && !G.isSpotless(r));
    return left.length ? TXT.mil.allTools : TXT.mil.sparkles;
  }
  function trade(t) {
    const s = G.state, n = Math.floor((s.items.witchtrash || 0) / 3), got = {};
    for (let i = 0; i < n; i++) { const k = pick(['cheese', 'cheese', 'pepper', 'bubble']); got[k] = (got[k] || 0) + 1; G.giveItem(k, 1); }
    s.items.witchtrash -= n * 3; G.ui.renderInventory(); G.audio.good(); G.save();
    say('happy', `${TXT.mil.trade} ${Object.keys(got).map((k) => G.ITEMS[k].name + (got[k] > 1 ? ' ×' + got[k] : '')).join(', ')}!`, [{ label: 'Thanks, Mildred!', fn: () => G.arrived && G.arrived(true) }]);
  }
  function girlHello(t) {
    const s = G.state, lines = [['surprised', TXT.mil.me]];
    const give = [];
    const has = (k) => s.items[k] > 0;
    if (has('biscuit')) { const n = s.items.biscuit; give.push(() => { s.items.biscuit = 0; G.giveItem('cheese', n); }); lines.push(['happy', TXT.biscuits(n)]); }
    if (has('ribbon')) { give.push(() => { s.items.ribbon = 0; G.giveItem('bubble', 1); }); lines.push(['happy', TXT.mil.ribbon]); }
    if (has('broombutton')) { give.push(() => { s.items.broombutton = 0; G.giveItem('pepper', 1); }); lines.push(['talk', TXT.mil.button]); }
    if (has('tidypage')) { give.push(() => { s.items.tidypage = 0; }); lines.push(['talk', TXT.mil.page]); }
    lines.push(['talk', TXT.mil.friends]);
    lines.push(['happy', TXT.mil.sweeping]);
    for (const g of give) g();
    G.ui.renderInventory(); G.save();
    let i = 0;
    const next = () => { if (i < lines.length) { const [md, tx] = lines[i++]; say(md, tx, [{ label: i < lines.length ? 'Next' : 'Bye, Mildred!', fn: next }]); return; } M.mode = 'roam'; M.talkUntil = 0; G.arrived && G.arrived(true); };
    next();
  }
})();
