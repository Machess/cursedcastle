/* MODEL — Chapter 2: the Whispering Wood. Its maps (the forest, the Honey Hut, the Glowcap Caves), areas, cursed forest
   friends, the elemental spirits the Witch bound to objects, the cards they give, and the gates only a freed spirit clears.
   Everything here is data; controllers/forest.js plays it and views/forestView.js draws it.
   ART: nothing here needs art to be playable. Stand-in pictures are painted in code; G.FOREST_ART (forestView.js) is the
   one table where real pictures are mapped in later. */
(function () {
  /* ---------- the spirits ----------
     obj: what the Witch bound them to; maths: the kind of release puzzle; card: the card they give;
     does: what they clear in the forest; partner: what they do in battle when they travel with you */
  G.SPIRITS = {
    sprig:  { name: 'Sprig', element: 'Plant', colour: '#58b84a', animal: 'a leafy fawn', obj: 'a stone acorn', card: 'sp_bloom',
      free: 'POP! The stone acorn cracks open and a tiny leafy fawn tumbles out. "Sprig is FREE! Sprig makes things GROW!"',
      does: 'Sprig untangles the thorn hedges in the forest.', partner: 'Thorns: a foe that hits you gets pricked for 2.' },
    ember:  { name: 'Ember', element: 'Fire', colour: '#f0782a', animal: 'a little flame fox', obj: 'a cold iron stove', card: 'sp_ember',
      free: 'WHOOSH! The cold stove glows and a little flame fox hops out. "Brrr, that was COLD! Ember is warm again!"',
      does: 'Ember burns away sticky webs and lights up dark caves.', partner: 'Your FIRE cards get +2.' },
    ripple: { name: 'Ripple', element: 'Water', colour: '#3aa0e0', animal: 'a wobbly water otter', obj: 'a corked bottle in a dry well', card: 'sp_tide',
      free: 'SPLASH! The cork pops and a wobbly water otter swirls out. "Ripple is free! Glug glug, hello!"',
      does: 'Ripple fills the dry streams, so lily pads float up to walk on.', partner: 'Heals you 2 at the start of every turn.' },
    whirl:  { name: 'Whirl', element: 'Air', colour: '#b8e4f4', animal: 'a puffy cloud bird', obj: 'a kite tangled in a tree', card: 'sp_gust',
      free: 'WHEEE! The kite string snaps and a puffy cloud bird loops into the sky. "Whirl is free! Whoosh whoosh!"',
      does: 'Whirl blows away the thick mist.', partner: 'All your attacks reach far away foes.' },
    pebble: { name: 'Pebble', element: 'Earth', colour: '#a08a64', animal: 'a mossy stone tortoise', obj: 'a stone statue', card: 'sp_boulder',
      free: 'CRRRACK! The statue crumbles and a mossy stone tortoise blinks at you. "Pebble... is... free. Thank... you."',
      does: 'Pebble rolls big boulders out of the way.', partner: 'You get 3 block at the start of every turn.' },
    fizz:   { name: 'Fizz', element: 'Lightning', colour: '#f4e04a', animal: 'a crackly spark squirrel', obj: 'a cracked crystal on a rusty rod', card: 'sp_thunder',
      free: 'ZZZAP! The crystal flashes and a crackly spark squirrel zips round your head. "Fizz is free-free-FREE!"',
      does: 'Fizz powers the old rune gates.', partner: 'Your SHOCK cards get +2.' },
    luna:   { name: 'Luna', element: 'Moon', colour: '#c8b8f8', animal: 'a silver moon moth', obj: 'her reflection in the moon pool', card: 'sp_moon', hidden: true,
      free: 'The pool shimmers... and a silver moon moth rises out of her own reflection. "Luna thanks you, little hero. I was SO hard to find."',
      does: 'Luna shows you the whole forest on your map.', partner: 'Your first attack in every battle does DOUBLE.' },
  };
  G.SPIRIT_ORDER = ['sprig', 'ember', 'ripple', 'whirl', 'pebble', 'fizz', 'luna'];
  G.SIX = ['sprig', 'ember', 'ripple', 'whirl', 'pebble', 'fizz'];

  /* ---------- their cards (one each; never in the normal card rewards) ---------- */
  Object.assign(G.CARDS, {
    sp_bloom:   { name: 'Healing Bloom', type: 'skill', cost: 1, min: 3, max: 6, tags: ['BUFF'], fx: { heal: 1 }, spirit: 'sprig', text: 'Heal ? health.' },
    sp_ember:   { name: 'Ember Burst', type: 'attack', cost: 1, min: 5, max: 8, tags: ['FIRE', 'RANGED'], spirit: 'ember', text: 'Deal ? damage.' },
    sp_tide:    { name: 'Tidal Shield', type: 'block', cost: 1, min: 5, max: 9, tags: ['FROST'], fx: { chill: 1 }, spirit: 'ripple', text: 'Gain ? block. Chill: next hit -2.' },
    sp_gust:    { name: 'Lucky Gust', type: 'block', cost: 0, min: 2, max: 4, tags: ['TRICK'], fx: { draw: 2 }, spirit: 'whirl', text: 'Free! Gain ? block. Draw 2 cards.' },
    sp_boulder: { name: 'Boulder Toss', type: 'attack', cost: 1, min: 5, max: 8, tags: ['BASH', 'RANGED'], spirit: 'pebble', text: 'Deal ? damage.' },
    sp_thunder: { name: 'Thunder Clap', type: 'attack', cost: 1, min: 3, max: 5, tags: ['SHOCK', 'RANGED'], hits: 2, spirit: 'fizz', text: 'Deal ? damage 2 times!' },
    sp_moon:    { name: 'Moonbeam', type: 'attack', cost: 1, min: 8, max: 12, tags: ['RANGED'], gold: true, spirit: 'luna', text: 'Deal ? damage. It never misses the moon!' },
  });

  /* ---------- gates: something in the way until its spirit is free ---------- */
  G.GATES = {
    thorns:  { name: 'A Thorn Hedge', needs: ['sprig'], text: 'A tangle of prickly thorns blocks the path. Only a plant spirit could untangle this.', gone: 'Sprig wiggles her nose... and the thorns curl away!' },
    web:     { name: 'A Giant Web', needs: ['ember'], text: 'A huge sticky web hangs across the path. A fire spirit could burn it away.', gone: 'Ember puffs a little flame... and the web melts away!' },
    stream:  { name: 'A Dry Stream', needs: ['ripple'], text: 'A deep, dry streambed. Too wide to jump! A water spirit could fill it.', gone: 'Ripple dives in... the stream fills up, and lily pads float into a bridge!' },
    boulder: { name: 'A Big Boulder', needs: ['pebble'], text: 'A boulder as big as a cow blocks the way into the old ruins. An earth spirit could roll it.', gone: 'Pebble gives it one slow push... and the boulder rolls away!' },
    mist:    { name: 'Thick Mist', needs: ['whirl'], text: 'The mist here is as thick as porridge. You cannot see your own nose! A wind spirit could blow it away.', gone: 'Whirl loops round and round... and the mist blows away!' },
    rune:    { name: 'A Rune Gate', needs: ['fizz'], text: 'An old stone gate with a dead rune on it. It needs a spark of lightning.', gone: 'Fizz zaps the rune... it lights up, and the gate grinds open!' },
    barrier: { name: "The Witch's Barrier", needs: ['sprig', 'ember', 'ripple', 'whirl', 'pebble', 'fizz'], text: 'A shimmering purple wall of magic! The Witch is using the stolen spirits to power it.', gone: 'With all six spirits free, the barrier flickers... and POPS like a soap bubble!' },
  };

  /* ---------- areas (rooms). zone: 'forest' keeps them apart from the castle's rooms ---------- */
  const Z = { zone: 'forest' };
  Object.assign(G.ROOMS, {
    fA: Object.assign({ name: 'Forest Edge', theme: 'forest', intro: 'The Whispering Wood! Tall trees, soft moss, and paths that wander off in every direction. Somewhere to the west, a tiny voice is calling for help...' }, Z),
    fT: Object.assign({ name: 'Tangled Thicket', theme: 'forest', intro: 'The paths twist and turn between thick bushes. Some bushes rustle as if they are hiding something...' }, Z),
    fH: Object.assign({ name: 'Honey Hut Clearing', theme: 'foresthut', intro: 'A cosy wooden hut in a sunny clearing. It smells of honey. Someone inside is grumbling.' }, Z),
    fM: Object.assign({ name: 'Misty Marsh', theme: 'marsh', intro: 'Squelch, squelch. A foggy marsh with a dry old well. Something flutters high up in a tree.' }, Z),
    fR: Object.assign({ name: 'Old Ruins', theme: 'ruins', intro: 'Mossy walls and fallen pillars. A cracked crystal crackles on a rusty rod.' }, Z),
    fK: Object.assign({ name: 'Hollow Oak', theme: 'forest', intro: 'You climb out inside a giant hollow oak! The bushes to the east are rustling...' }, Z),
    fQ: Object.assign({ name: 'Mushroom Path', theme: 'circle', intro: 'Glowing mushrooms line the path. Purple magic hums in the air ahead.' }, Z),
    fC: Object.assign({ name: 'Mushroom Circle', theme: 'circle', intro: 'A ring of giant mushrooms! In the middle, Wanda the Witch is stirring a swirling purple portal.' }, Z),
    fP: Object.assign({ name: 'Moon Pool', theme: 'ruins', secret: true, intro: 'A hidden courtyard with a round, silver pool. The moon shines in it, even in the daytime.' }, Z),
    fJ: Object.assign({ name: 'Honey Hut', theme: 'dining', intro: 'Honey jars everywhere, three bowls on the table, and a cold iron stove. A very sticky bear glares at you.' }, Z),
    fV: Object.assign({ name: 'Glowcap Caves', theme: 'cavern', intro: 'It is dark down here! Glowing mushrooms light the tunnels. There must be a way out somewhere.' }, Z),
  });

  /* ---------- the maps, drawn with letters ----------
     . tree   # rock or wall   ~ a hidden path through the bushes   capital letter: an open square of that area
     other signs: see KEY (each stands on an open square of the area named there) */
  const AREA = { A: 'fA', T: 'fT', H: 'fH', M: 'fM', R: 'fR', K: 'fK', Q: 'fQ', C: 'fC', P: 'fP', J: 'fJ', V: 'fV' };
  const FOREST = [
    '..........................................',
    '.................CCCCC....................',
    '.................CCWCC..........PPP.......',
    '.................CCCCC..........PLP.......',
    '...................b............PPP.......',
    '...................Q.............r........',
    '...................f.............R........',
    '....###############m#############R####....',
    '....######RRRRRRR*#R#############R#6##....',
    '....######R########R##########RRRR#R##....',
    '....##RRRRR###RRR##R##########R####R##....',
    '....##R#######R####R##RRRRBRRRR####R##....',
    '....##R#######R####R##R#######R####R##....',
    '....##R#######R####R##R#######RRRRRR##....',
    '....##RRRRRRRRRRRRRRRRR###############....',
    '....########o#########################....',
    '.KKK........g..............###............',
    '.KlK~TTTTTTTTTTTTT.........###....MMMM*...',
    '.KKK....T.....T..T.........#h#....M.......',
    '........T..TTTT..T........HHHHH...M.MMMM3.',
    '........T..T..T..T....TTTTHHHHHeMMM....M..',
    '........T..T..T..~....T...........M....d..',
    '........*..T..T..T....T..........2M....M..',
    '...........T..TTTTpTTTTTT.........M....M..',
    '...........T.....TTT....T.........MMMMsM..',
    '.AAAAAA~A..T.......T....T.........M.......',
    '.A....A.*..T.......T....T.........M.......',
    '.A.AA.A............T....*......MMMM.......',
    '.A.A1.A............TTTT...................',
    '.A.AAAA...A...........t...................',
    '.A........A...........A...................',
    '.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA*.........',
    '....................AA@AA.................',
    '....................XAAAS.................',
    '..........................................',
  ];
  const HUT = ['#######', '#J7JJJ#', '#JJJEJ#', '#JJJJJ#', '###v###'];
  const CAVES = [
    '#######^#########',
    '#VVVVVVVVVVV#VVV#',
    '#V#####V###V#V#V#',
    '#V#VVV#V#5#VVV#V#',
    '#V#V#V#V#V###V#V#',
    '#VVV#VVV#VVVDV#V#',
    '###V#####V#####V#',
    '#VVVVVVVVVVVVVVV#',
    '#V###V#######V###',
    '#VVV#VVVVVVV#VVV#',
    '#################',
  ];
  /* sign: [area, what]. what = { spirit }, { gate }, { mon }, { obj }, { door: style, area }, 'start', 'spot:<name>' */
  const KEY = {
    '1': ['fA', { spirit: 'sprig' }], S: ['fA', { obj: 'spiritstone' }], X: ['fA', { obj: 'signpost' }], '@': ['fA', 'start'],
    t: ['fT', { gate: 'thorns' }], p: ['fT', 'spot:pit'], g: ['fT', { mon: 'hedgehog' }],
    h: ['fH', { door: 'd' }],
    e: ['fM', { gate: 'web' }], s: ['fM', { gate: 'stream' }], '2': ['fM', { spirit: 'ripple' }], '3': ['fM', { spirit: 'whirl' }], d: ['fM', { mon: 'stag' }],
    o: ['fR', { gate: 'boulder' }], '6': ['fR', { spirit: 'fizz' }], B: ['fR', { mon: 'beetle' }], r: ['fR', { gate: 'rune' }],
    m: ['fQ', { gate: 'mist' }], f: ['fQ', { mon: 'toadstool' }], b: ['fQ', { gate: 'barrier' }],
    W: ['fC', { mon: 'witch2' }], L: ['fP', { spirit: 'luna' }], l: ['fK', 'spot:oak'],
    '7': ['fJ', { spirit: 'ember' }], E: ['fJ', { mon: 'bear' }], v: ['fJ', { door: 'd' }],
    '5': ['fV', { spirit: 'pebble' }], D: ['fV', { mon: 'mole' }], '^': ['fV', { door: 'l' }],
  };
  function parse(rows) {
    const h = rows.length, w = rows[0].length, rects = [], doors = [], trees = [], bush = [], things = [], spots = {};
    const open = [];                                          // every open square, for giving the trees an area
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c === '.' || c === '#' || c === '~') continue;
      if (c === '*') {                                        // a berry bush at a dead end: it belongs to the path beside it
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (rows[y + dy] || '')[x + dx]).find((n) => AREA[n]);
        rects.push([AREA[nb], x, y, x, y]); open.push([x, y, AREA[nb]]);
        things.push({ id: 'berries_' + x + '_' + y, kind: 'object', x, y, sprite: 'fo_berries', berries: true }); continue;
      }
      const k = KEY[c], area = k ? k[0] : AREA[c], what = k ? k[1] : null;
      if (what && what.door) { doors.push([what.door, x, y, area]); spots['door' + c] = { x, y }; continue; }
      rects.push([area, x, y, x, y]); open.push([x, y, area]);
      if (!what) continue;
      if (what === 'start') spots.start = { x, y, dir: 0 };
      else if (typeof what === 'string') spots[what.slice(5)] = { x, y };
      else if (what.spirit) things.push({ id: 'spirit_' + what.spirit, kind: 'object', x, y, sprite: 'fo_obj_' + what.spirit, spirit: what.spirit });
      else if (what.obj) things.push({ id: what.obj, kind: 'object', x, y, sprite: 'fo_' + what.obj });
      else if (what.gate) things.push({ id: 'gate_' + what.gate, kind: 'gate', gate: what.gate, x, y, sprite: 'fo_gate_' + what.gate });
      else if (what.mon) things.push({ id: what.mon, kind: 'monster', x, y });
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = rows[y][x]; if (c !== '.' && c !== '~') continue;
      let best = null, bd = 1e9;                              // a tree belongs to the nearest open area (its floor and mist)
      for (const [ox, oy, a] of open) { const d = (ox - x) * (ox - x) + (oy - y) * (oy - y); if (d < bd) { bd = d; best = a; } }
      trees.push([x, y, best]); if (c === '~') bush.push([x, y]);
    }
    return { w, h, rects, doors, trees, bush, things, spots };
  }
  const F = parse(FOREST), HU = parse(HUT), CA = parse(CAVES);
  G.FOREST_V = 2;                                             // the forest's layout version (state.js moves old saves to the camp)
  G.MAPS.forest = { name: 'The Whispering Wood', w: F.w, h: F.h, zone: 'forest',
    layout: { rects: F.rects, doors: F.doors, trees: F.trees, bush: F.bush, start: F.spots.start, respawn: F.spots.start,
      outside: { maxY: -1, height: 1, low: 1 } },             // outdoors: lit by the sky (renderer.js), every wall one storey
    things: F.things };
  G.MAPS.hut = { name: 'The Honey Hut', w: HU.w, h: HU.h, zone: 'forest',
    layout: { rects: HU.rects, doors: HU.doors, start: { x: 3, y: 3, dir: 0 } }, things: HU.things };
  G.MAPS.caves = { name: 'The Glowcap Caves', w: CA.w, h: CA.h, zone: 'forest',
    layout: { rects: CA.rects, doors: CA.doors, start: { x: 8, y: 9, dir: 3 } }, things: CA.things };
  for (const [x, y, ox, oy] of [[8, 9, 0.32, 0.3], [5, 7, -0.3, 0.3], [1, 3, -0.3, 0], [7, 3, 0.3, 0], [11, 5, 0, -0.32], [15, 4, 0.3, 0], [9, 7, 0.3, -0.3], [14, 9, 0, 0.3], [2, 9, 0, 0.3]])
    CA.things.push({ kind: 'deco', x, y, sprite: 'fo_glowcap', ox, oy });
  G.REGIONS.forest = { name: 'The Whispering Wood', maps: ['forest', 'hut', 'caves'] };
  G.zoneOf = (map) => (G.MAPS[map || G.mapId()] || {}).zone || 'castle';
  G.FOREST_SPOTS = F.spots;

  /* ---------- how the maps join ---------- */
  const fl = () => G.state.flags;
  G.PORTALS.push(
    { id: 'hutIn', map: 'forest', x: F.spots.doorh.x, y: F.spots.doorh.y, kind: 'door', dir: 'in', show: () => true, to: { map: 'hut', x: 3, y: 3, dir: 0 }, where: 'the Honey Hut' },
    { id: 'hutOut', map: 'hut', x: 3, y: 4, kind: 'door', dir: 'out', show: () => true, to: { map: 'forest', x: F.spots.doorh.x, y: F.spots.doorh.y + 1, dir: 2 }, where: 'the clearing' },
    // the Leafy Pit: the first time the ground just gives way (auto); after that it is an open hole with a rope
    { id: 'pit', map: 'forest', x: F.spots.pit.x, y: F.spots.pit.y, kind: 'hatch', dir: 'down', auto: true, show: () => true,
      to: { map: 'caves', x: 8, y: 9, dir: 3 }, label: 'Climb down the rope', where: 'the Glowcap Caves',
      title: 'The Leafy Pit', again: 'The pit you fell into. A rope hangs down into the dark now.',
      land: 'WHOOOA... BUMP! The leaves were hiding a deep pit! You are in a dark cave under the forest. Glowing mushrooms show the tunnels: find the way out!' },
    { id: 'oakUp', map: 'caves', x: 7, y: 0, kind: 'ladder', dir: 'up', show: () => true, to: { map: 'forest', x: F.spots.oak.x, y: F.spots.oak.y, dir: 1 },
      label: 'Climb up the roots', where: 'the daylight', title: 'A Ladder of Roots', text: 'Thick tree roots hang down like a ladder. Fresh air blows down from above!', onUse: () => { fl().cavesOut = 1; } },
    { id: 'oakDown', map: 'forest', x: F.spots.oak.x, y: F.spots.oak.y, kind: 'hatch', dir: 'down', show: () => !!fl().cavesOut,
      to: { map: 'caves', x: 7, y: 1, dir: 2 }, label: 'Climb down the roots', where: 'the Glowcap Caves', title: 'The Hollow Oak', again: 'A hole between the roots of the hollow oak. The root ladder leads down to the caves.' },
  );

  /* ---------- the cursed forest friends, and Wanda again ---------- */
  function face(col, draw) {                                  // a stand-in portrait, painted here until the real art is mapped in
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#31463a'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = col; x.beginPath(); x.ellipse(128, 150, 84, 78, 0, 0, 7); x.fill();
    draw(x);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(100, 132, 15, 0, 7); x.arc(156, 132, 15, 0, 7); x.fill();
    x.fillStyle = '#1c1420'; x.beginPath(); x.arc(103, 135, 7, 0, 7); x.arc(153, 135, 7, 0, 7); x.fill();
    x.strokeStyle = '#1c1420'; x.lineWidth = 6; x.beginPath(); x.moveTo(80, 108); x.lineTo(116, 118); x.moveTo(176, 108); x.lineTo(140, 118); x.stroke();   // grumpy brows
    x.beginPath(); x.arc(128, 196, 22, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
    return c.toDataURL('image/png');
  }
  const ears = (x, col, r) => { x.fillStyle = col; x.beginPath(); x.arc(66, 86, r, 0, 7); x.arc(190, 86, r, 0, 7); x.fill(); };
  Object.assign(G.MONSTERS, {
    bear: {
      name: 'Bramble the Bear', freedName: 'Bramble the Honey Keeper', hp: 40, traits: ['sticky'], zone: 'forest',
      img: face('#8a5a30', (x) => { ears(x, '#8a5a30', 30); x.fillStyle = '#e8b030'; x.fillRect(60, 214, 136, 14); x.fillStyle = '#d8b890'; x.beginPath(); x.ellipse(128, 176, 34, 26, 0, 0, 7); x.fill(); }),
      intro: 'A big bear with honey all over his paws stomps round the hut. "WHO has been sitting in MY chair?" A purple curse bubble wobbles around him.',
      clue: 'STICKY HONEY: your first hit each turn is only HALF. FIRE melts the honey for the whole battle!',
      intents: [{ t: 'attack', v: 8, n: 'Sticky Swipe' }, { t: 'block', v: 6, n: 'Honey Shield' }, { t: 'attack', v: 11, n: 'Bear Hug' }],
      freed: 'Oh my! I was SO grumpy. I am the honey keeper of this wood. Have some honey cakes, little one!',
      chat: 'Mmm, honey! Did you know? The Witch tied the forest spirits to THINGS. A kite, a bottle, a statue... Look for things that sparkle!',
      reward: { items: { cheese: 2 }, card: true },
    },
    mole: {
      name: 'Digby the Mole', freedName: 'Digby the Miner', hp: 34, traits: ['dig'], zone: 'forest',
      img: face('#6a5a6a', (x) => { x.fillStyle = '#e8a0a8'; x.beginPath(); x.ellipse(128, 172, 20, 14, 0, 0, 7); x.fill(); x.fillStyle = '#e8c030'; x.fillRect(84, 60, 88, 26); x.fillStyle = '#fff8c0'; x.beginPath(); x.arc(128, 70, 12, 0, 7); x.fill(); }),
      intro: 'A mole in a miner\'s helmet pops out of the ground. "MY tunnels! MY rocks! Go away!" A curse bubble wobbles around him.',
      clue: 'DIG: when he digs down, your hits MISS. BASH or SHOCK shakes him back up!',
      intents: [{ t: 'attack', v: 7, n: 'Pickaxe Poke' }, { t: 'dig', v: 0, n: 'Dig down!' }, { t: 'attack', v: 10, n: 'Pop-up Bonk' }],
      freed: 'Oh, hello up there! I am the cave miner. That statue over there has been wobbling for days... there is someone inside it!',
      chat: 'Dig, dig, dig! The roots at the north end of my caves make a fine ladder. They come up inside the old hollow oak.',
      reward: { items: { bubble: 1 }, card: true },
    },
    hedgehog: {
      name: 'Prickles the Hedgehog', freedName: 'Prickles the Postman', hp: 30, traits: ['prickles'], zone: 'forest',
      img: face('#b08a5a', (x) => { x.fillStyle = '#5a4028'; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(40 + i * 22, 100); x.lineTo(52 + i * 22, 30 + (i % 2) * 14); x.lineTo(64 + i * 22, 100); x.fill(); } }),
      intro: 'A hedgehog with a postbag is rolled up in the middle of the path, spikes out. "NO letters today! Go AWAY!"',
      clue: 'PRICKLES: every hit that is not RANGED pricks you for 1. Hit from far away!',
      intents: [{ t: 'attack', v: 6, n: 'Spiky Roll' }, { t: 'block', v: 7, n: 'Curl Up' }, { t: 'attack', v: 8, n: 'Letter Storm' }],
      freed: 'Ooh, sorry about the prickles! I am the forest postman. A letter for you: "The boulder by the ruins needs an EARTH spirit."',
      chat: 'Post! Post! A tip: some bushes in this wood are not really bushes. If one rustles, walk right into it!',
      reward: { items: { pepper: 2 } },
    },
    stag: {
      name: 'Bracken the Stag', freedName: 'Bracken the Ranger', hp: 38, traits: [], zone: 'forest',
      img: face('#a8764a', (x) => { x.strokeStyle = '#e8dcc0'; x.lineWidth = 10; x.beginPath(); x.moveTo(84, 86); x.lineTo(60, 26); x.moveTo(70, 52); x.lineTo(40, 44); x.moveTo(172, 86); x.lineTo(196, 26); x.moveTo(186, 52); x.lineTo(216, 44); x.stroke(); }),
      intro: 'A stag with huge antlers stamps his hoof in the mud. "This marsh is CLOSED!" A curse bubble wobbles around him.',
      clue: 'BIG CHARGE: every third turn he charges for a LOT. Save your blocks for it!',
      intents: [{ t: 'attack', v: 5, n: 'Hoof Stamp' }, { t: 'block', v: 5, n: 'Antlers Down' }, { t: 'attack', v: 15, n: 'BIG CHARGE' }],
      freed: 'Goodness, where are my manners? I am the ranger of this wood. The kite in that tree has been wriggling all week!',
      chat: 'Welcome to the marsh! The stream is dry because the water spirit is stuck in a bottle. Try the old well.',
      reward: { items: { scarf: 1 }, card: true },
    },
    beetle: {
      name: 'Sir Beetle', freedName: 'Sir Beetle the Brave', hp: 36, traits: ['shell'], zone: 'forest',
      img: face('#3a6a8a', (x) => { x.fillStyle = '#28506e'; x.beginPath(); x.ellipse(128, 86, 70, 40, 0, Math.PI, 0); x.fill(); x.strokeStyle = '#1c1420'; x.lineWidth = 6; x.beginPath(); x.moveTo(110, 56); x.lineTo(96, 22); x.moveTo(146, 56); x.lineTo(160, 22); x.stroke(); }),
      intro: 'A beetle knight in a shiny blue shell marches up and down. "HALT! None shall pass my ruins!"',
      clue: 'SHELL: hits under 5 bounce off. Power up, or use a BASH card: BASH always cracks through!',
      intents: [{ t: 'attack', v: 8, n: 'Horn Jab' }, { t: 'block', v: 8, n: 'Shell Up' }, { t: 'attack', v: 9, n: 'Buzz Charge' }],
      freed: 'By my wings! I am Sir Beetle, guard of the old ruins. That crystal on the rod crackles all night. Somebody is in there!',
      chat: 'The Moon Pool lies behind the rune gate. They say a spirit hides in it, but only shows herself to someone who has found EVERY hidden path.',
      reward: { card: true },
    },
    toadstool: {
      name: 'The Toadstool Guard', freedName: 'Captain Cap', hp: 42, traits: ['spores'], zone: 'forest',
      img: face('#e8dcc8', (x) => { x.fillStyle = '#c8323a'; x.beginPath(); x.ellipse(128, 84, 104, 58, 0, Math.PI, 0); x.fill(); x.fillStyle = '#fff'; for (const [a, b, r] of [[80, 56, 12], [128, 44, 14], [178, 58, 11]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); } }),
      intro: 'A big mushroom with a spear blocks the path. "The Witch says NOBODY comes in. Puff!"',
      clue: 'SPORES: he puffs a cloud that makes his NEXT hit bigger. Block it, then hit back!',
      intents: [{ t: 'attack', v: 7, n: 'Spear Poke' }, { t: 'cackle', v: 0, n: 'Spore Puff (next hit +3)' }, { t: 'attack', v: 8, n: 'Cap Bash' }, { t: 'block', v: 7, n: 'Hide under cap' }],
      freed: 'Puff... oh! I never wanted to guard a witch. The Mushroom Circle is just ahead. She is in the middle of it, stirring a portal!',
      chat: 'Good luck in the circle! She flies at first. When she lands, pop her bubble.',
      reward: { card: true },
    },
    witch2: Object.assign({}, G.MONSTERS.witch, {
      hp: 90, zone: 'forest',
      intro: '"YOU again?! I only need ONE more minute to finish my portal!" The Witch jumps on her broom, above the ring of giant mushrooms.',
      clue: 'FLYING: only RANGED cards (or Charge!). BUBBLE: BASH or SHOCK pops it, then hit!',
      intents: [{ t: 'attack', v: 10, n: 'Broom Swoop' }, { t: 'cackle', v: 0, n: 'Cackle (next hit +3)' }, { t: 'attack', v: 11, n: 'Hex Bolt' }],
      intents2: [{ t: 'attack', v: 12, n: 'Curse Storm' }, { t: 'bubble', v: 0, n: 'New Bubble' }, { t: 'attack', v: 10, n: 'Toad Zap' }],
      freed: '"My portal! NOOO!" The ring of mushrooms stops glowing. The Witch zooms off over the treetops... to the Dragon\'s mountain!',
      reward: {},
    }),
  });
  G.FOREST_FRIENDS = ['bear', 'mole', 'hedgehog', 'stag', 'beetle', 'toadstool'];
})();
