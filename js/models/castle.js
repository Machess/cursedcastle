/* MODEL — Castle map (rooms, corridors, doors), things standing in it, NPC dialogue. */
/* ---------- Castle layout ----------
   Built from rectangles: everything that is not a room/corridor is wall.
   Doors: d = normal door (opens when you walk into it), r = rune door (puzzle lock),
          m = moon door (needs 3 Moon Keys), g = castle gate (rune lock). */
G.MAP_W = 35; G.MAP_H = 34;
G.LAYOUT_V = 2;   // layout version: saves from the old square castle (version 1) are moved over by state.js
G.LAYOUT = {
  rects: [
    // outside: a wide forecourt where the game starts, a short approach up to the gate
    ['O', 17, 28, 21, 29], ['O', 12, 30, 26, 32],
    // the Entrance Hall with its pillars, and the hallways (with nooks: little alcoves off the side)
    ['E', 16, 22, 22, 26], ['c', 19, 8, 19, 20], ['c', 18, 10, 18, 10], ['c', 20, 12, 20, 12], ['c', 18, 14, 18, 14], ['c', 20, 16, 20, 16], ['c', 18, 18, 18, 18],
    ['n', 7, 6, 31, 7],
    ['w', 7, 8, 7, 24], ['w', 8, 24, 14, 24], ['w', 8, 10, 8, 10], ['w', 8, 12, 8, 12], ['w', 8, 15, 8, 15], ['w', 8, 20, 8, 20],
    ['e', 29, 8, 29, 24], ['e', 24, 24, 28, 24], ['e', 30, 16, 30, 16], ['e', 30, 21, 30, 21],
    // the west wing
    ['H', 1, 1, 5, 4], ['L', 1, 6, 5, 12], ['P', 1, 14, 5, 17], ['K', 1, 19, 5, 23], ['C', 1, 25, 5, 28],
    // the middle: rooms off the North Hall and the hallways
    ['Q', 10, 1, 16, 4], ['S', 18, 3, 20, 4], ['S', 19, 5, 19, 5], ['Y', 22, 1, 27, 4], ['A', 29, 1, 33, 4],
    ['R', 10, 9, 16, 15], ['D', 10, 17, 16, 20], ['B', 22, 9, 27, 14], ['F', 22, 16, 27, 18], ['F', 22, 19, 23, 20],
    // secret rooms: only reachable once their secret wall is found (LAYOUT.secrets, controllers/secrets.js)
    ['Z', 31, 11, 33, 14], ['M', 7, 26, 10, 28], ['N', 7, 1, 8, 3], ['G', 23, 27, 26, 28],
  ],
  // wall squares inside rooms: the Library's two rows of bookshelves, the Lab's cut-off corners
  walls: [[2, 8], [3, 8], [4, 8], [2, 10], [3, 10], [4, 10], [29, 1], [33, 1], [29, 4], [33, 4]],
  /* secret walls: a wall square (x, y) that looks a little odd from the square in front of it (from). Tap the odd bit and
     it opens into the secret room: it stays an open gap after that. tell: the odd bit (a wall mark or a decoration),
     taps: how many taps it takes, open: how it opens (renderer: down = crumbles into the floor, side = pushed aside,
     part = parts like a curtain), need: what you need first. */
  secrets: [
    { id: 'armoury', x: 30, y: 13, from: [29, 13], room: 'Z', tell: { img: 'crack', mark: 'crack-3' }, taps: 3, open: 'down',
      hint: 'Brrr! A cold draught is blowing through the cracks in this wall...',
      tapLines: ['The cracks creak. Some dust falls out.', 'CRACK! The crack gets bigger. There is a room back there!'],
      found: 'CRUMBLE CRUMBLE CRASH! The bricks fall away... a secret room!' },
    { id: 'mice', x: 6, y: 27, from: [5, 27], room: 'M', tell: { img: 'mouse-shut', open: 'mouse-open', mark: 'mousehole' }, taps: 2, open: 'side',
      hint: 'Squeak squeak! Tiny voices are coming from that little mouse hole.',
      tapLines: ['You knock at the mouse hole. "Who is there?" squeaks a tiny voice.'],
      found: '"Oh! A friend of Nibbles!" Lots of little mice push and push... and the whole wall slides aside!' },
    { id: 'closet', x: 6, y: 2, from: [5, 2], room: 'N', tell: { img: 'vines', deco: 'purple-ivy' }, taps: 2, open: 'part',
      hint: 'Purple flowers in the vines... and is that a sleepy face in there?',
      tapLines: ['The purple vines wiggle. They are ticklish!'],
      found: 'The vines giggle and curl away to the sides, like curtains opening!' },
    { id: 'treasury', x: 22, y: 28, from: [21, 28], room: 'G', tell: { img: 'crest', full: 'crest-full', deco: 'crown-banner' }, taps: 1, open: 'down', need: 'maps',
      hint: 'A golden crest with a crown, and three empty paper-shaped slots. Something fits in there...',
      notYet: (n) => `A golden crest with three slots shaped like pieces of an old map. You have ${n} of 3 map pieces. Secret rooms hide them!`,
      found: 'The three map pieces slide into the slots... it is a map of THIS wall! CLUNK! The wall sinks into the floor!' },
  ],
  doors: [
    ['g', 19, 27, 'O'], ['d', 19, 21, 'c'], ['d', 15, 24, 'w'], ['d', 23, 24, 'e'],
    ['d', 3, 5, 'L'], ['r', 6, 9, 'L'], ['d', 6, 16, 'P'], ['d', 6, 20, 'K'], ['d', 3, 24, 'C'],
    ['d', 13, 5, 'Q'], ['m', 19, 2, 'S'], ['u', 19, 1, 'S'], ['d', 24, 5, 'Y'], ['d', 31, 5, 'A'],   // the Moon Door, and the stairs up behind it (u: a picture, you climb it as a portal)
    ['d', 13, 8, 'R'], ['d', 9, 12, 'R'], ['d', 13, 16, 'D'], ['d', 9, 20, 'D'], ['d', 23, 8, 'B'], ['d', 28, 11, 'B'], ['d', 28, 18, 'F'],
  ],
  /* how each door looks and opens (doorArt.js frames; how they move: renderer.js DOOR_MODES). Locked doors keep their own art. */
  doorStyles: {
    '19,21': 'hall', '15,24': 'plank', '23,24': 'plank', '3,5': 'glass', '6,16': 'hall', '6,20': 'plank', '3,24': 'portcullis',
    '13,5': 'curtain', '13,8': 'hall', '9,12': 'wheel', '13,16': 'hall', '9,20': 'hall', '24,5': 'toy', '23,8': 'curtain', '28,11': 'plank',
    '28,18': 'portcullis', '31,5': 'bookcase',
  },
  floors: [['carpet-red', 19, 22, 19, 26]],
  /* pictures on one wall (blocks.js, art: blockArt.js WALL_PICS): the wall square (x, y) seen from the square in front (from);
     light: it lights the room like a torch */
  wallPics: [{ x: 13, y: 21, from: [13, 20], pic: 'fireplace', light: 1.2 }, { x: 31, y: 16, from: [30, 16], pic: 'window' }],   // a red carpet from the gate to the Long Corridor
  /* rugs over several squares (blocks.js) */
  rugs: [['runner', 9, 6, 29, 6], ['runner', 19, 9, 19, 20], ['blue', 22, 10, 27, 12], ['track', 23, 1, 26, 4]],
  /* furniture you walk round (blocks.js): [kind, x0, y0, x1, y1] */
  blocks: [
    ['pillar', 10, 7, 10, 7], ['pillar', 16, 7, 16, 7], ['pillar', 22, 7, 22, 7], ['pillar', 27, 7, 27, 7],          // the North Hall's row of pillars
    ['marble', 17, 23, 17, 23], ['marble', 17, 25, 17, 25], ['marble', 21, 23, 21, 23], ['marble', 21, 25, 21, 25],  // the Entrance Hall
    ['marble', 11, 10, 11, 10], ['marble', 15, 10, 15, 10], ['marble', 11, 14, 11, 14], ['marble', 15, 14, 15, 14],  // round the dance floor
    ['stage', 16, 11, 16, 13],
    ['table', 11, 18, 15, 19],                                                                                       // the long feast table
    ['bed', 24, 10, 25, 12], ['headboard', 24, 10, 25, 12], ['footboard', 24, 10, 25, 12],                          // the giant bed
    ['counter', 2, 21, 3, 21],
    ['planter', 2, 2, 2, 3], ['planter', 4, 2, 4, 3], ['pond', 3, 2, 3, 3],
    ['platform', 12, 2, 14, 3], ['halfwall', 15, 1, 15, 1],
    ['playtable', 24, 2, 25, 3],
    ['plinth', 2, 15, 2, 15], ['plinth', 4, 15, 4, 15],
    ['bench', 26, 16, 27, 16],
  ],
  /* how the castle looks from outside (renderer.js storeys): every wall of the castle itself (rows up to maxY) is
     `height` walls tall (a wall is one storey), with battlements on top; `raise` makes parts taller (the gatehouse over
     the gate, the towers either side, the corner towers, the keep over the stairs). The walls round the forecourt are
     a low wall you can see the castle over (`low`). */
  outside: { maxY: 29, height: 2.4, low: 0.7,
    raise: [[16, 27, 22, 27, 3.1], [14, 28, 16, 29, 3.6], [22, 28, 24, 29, 3.6], [0, 0, 2, 2, 3.4], [32, 0, 34, 2, 3.4], [17, 0, 21, 2, 4.2]] },
  start: { x: 19, y: 32, dir: 0 },   // four steps from the gate // dir: 0 north, 1 east, 2 south, 3 west
  respawn: { x: 19, y: 25, dir: 0 },
};

/* the old square castle (layout version 1), for moving old saves over (state.js): each room's spot in the new castle */
G.OLD_CASTLE = {
  rects: [['O', 10, 21, 14, 23], ['O', 7, 24, 19, 26], ['E', 12, 16, 14, 19], ['c', 13, 6, 13, 14], ['n', 7, 5, 19, 5], ['w', 6, 5, 6, 18], ['w', 7, 18, 10, 18],
    ['e', 20, 2, 20, 18], ['e', 16, 18, 19, 18], ['H', 1, 1, 4, 3], ['L', 1, 5, 4, 9], ['P', 1, 11, 4, 13], ['K', 1, 15, 4, 17], ['C', 1, 19, 3, 21],
    ['Q', 8, 1, 10, 3], ['R', 8, 7, 10, 11], ['D', 8, 13, 10, 16], ['S', 12, 4, 14, 4], ['Y', 16, 1, 18, 3], ['B', 16, 7, 18, 11], ['F', 16, 13, 18, 16],
    ['A', 22, 1, 24, 4], ['Z', 22, 7, 24, 10], ['M', 5, 20, 8, 21], ['N', 6, 1, 6, 3], ['G', 16, 20, 19, 22]],
  spot: { O: [19, 32, 0], E: [19, 25, 0], c: [19, 19, 0], n: [19, 7, 0], w: [7, 22, 0], e: [29, 22, 0], H: [3, 4, 0], L: [5, 9, 3], P: [5, 16, 3],
    K: [5, 20, 3], C: [3, 25, 2], Q: [13, 4, 0], R: [13, 9, 2], D: [10, 20, 1], S: [19, 4, 0], Y: [24, 4, 0], B: [23, 9, 2], F: [27, 18, 3],
    A: [31, 4, 0], Z: [31, 13, 1], M: [7, 27, 1], N: [7, 2, 1], G: [23, 28, 1] },
  doors: { door_5_7: 'door_6_9', door_13_3: 'door_19_2', door_13_20: 'door_19_27' },   // unlocked doors (rune, Moon Door, gate)
};

/* The Witch's mess (controllers/cleaning.js). type: pile (witch trash, the broom), goo (a floor puddle, the mop), paws (Mildred's
   dusty paw prints, the mop), bunny (a dust bunny, the duster), broken (v: chair, table, chand(elier): the hammer; banner:
   silk thread; pane: a window, the hammer), plant (wilted, the watering can), torch (a cold sooty torch, the lantern),
   scribble (Wanda's purple scribbles on the wall square x, y seen from `from`, the sparkle wand).
   The cobwebs and cracks already on the walls, and some of the moving paintings (dusty), are messes too. */
G.MESSES = [
  { id: 'p1', type: 'pile', v: 'a', x: 4, y: 19, oy: -0.1 }, { id: 'p2', type: 'pile', v: 'b', x: 10, y: 18, ox: -0.1 }, { id: 'p3', type: 'pile', v: 'c', x: 16, y: 25, ox: -0.1 },
  { id: 'p4', type: 'pile', v: 'a', x: 31, y: 7, ox: 0.1 }, { id: 'p5', type: 'pile', v: 'b', x: 12, y: 15, oy: 0.1 }, { id: 'p6', type: 'pile', v: 'c', x: 5, y: 11, ox: 0.1 },
  { id: 'p7', type: 'pile', v: 'a', x: 26, y: 9, oy: -0.1 }, { id: 'p8', type: 'pile', v: 'b', x: 22, y: 19, ox: -0.1 }, { id: 'p9', type: 'pile', v: 'c', x: 2, y: 16 },
  { id: 'p10', type: 'pile', v: 'a', x: 26, y: 4, oy: 0.1 }, { id: 'p11', type: 'pile', v: 'b', x: 11, y: 4, oy: 0.1 }, { id: 'p12', type: 'pile', v: 'c', x: 5, y: 28, ox: 0.1 },
  { id: 'p13', type: 'pile', v: 'a', x: 23, y: 32 },
  { id: 'g1', type: 'goo', v: 'purple', x: 14, y: 11 }, { id: 'g2', type: 'goo', v: 'green', x: 4, y: 21 }, { id: 'g3', type: 'goo', v: 'orange', x: 14, y: 4 },
  { id: 'g4', type: 'goo', v: 'green', x: 32, y: 2 }, { id: 'g5', type: 'goo', v: 'purple', x: 21, y: 7 }, { id: 'g6', type: 'goo', v: 'orange', x: 19, y: 13 },
  { id: 'g7', type: 'goo', v: 'purple', x: 18, y: 24 }, { id: 'g8', type: 'goo', v: 'orange', x: 14, y: 17 }, { id: 'g9', type: 'goo', v: 'green', x: 2, y: 9 },
  { id: 'g10', type: 'goo', v: 'orange', x: 25, y: 18 }, { id: 'g11', type: 'goo', v: 'purple', x: 23, y: 3 }, { id: 'g12', type: 'goo', v: 'green', x: 3, y: 27 },
  { id: 'pw1', type: 'paws', x: 7, y: 14 }, { id: 'pw2', type: 'paws', x: 7, y: 19 }, { id: 'pw3', type: 'paws', x: 29, y: 10 }, { id: 'pw4', type: 'paws', x: 29, y: 19 },
  { id: 'pw5', type: 'paws', x: 19, y: 9 }, { id: 'pw6', type: 'paws', x: 25, y: 24 },
  { id: 'b1', type: 'bunny', x: 7, y: 12, ox: -0.25 }, { id: 'b2', type: 'bunny', x: 29, y: 17, ox: 0.25 }, { id: 'b3', type: 'bunny', x: 24, y: 13, oy: 0.25 },
  { id: 'b4', type: 'bunny', x: 3, y: 7, oy: -0.25 }, { id: 'b5', type: 'bunny', x: 12, y: 24, oy: 0.25 }, { id: 'b6', type: 'bunny', x: 24, y: 1, oy: -0.25 },
  { id: 'b7', type: 'bunny', x: 21, y: 24, ox: 0.25 }, { id: 'b8', type: 'bunny', x: 13, y: 6, oy: -0.25 },
  { id: 'r1', type: 'broken', v: 'chair', x: 1, y: 16, ox: -0.1 }, { id: 'r2', type: 'broken', v: 'table', x: 1, y: 11, ox: -0.1 },
  { id: 'r3', type: 'broken', v: 'banner', x: 14, y: 6, oy: -0.42 }, { id: 'r4', type: 'broken', v: 'banner', x: 7, y: 17, ox: -0.42 },
  { id: 'r5', type: 'broken', v: 'pane', x: 29, y: 14, ox: 0.42 }, { id: 'r6', type: 'broken', v: 'chand', x: 14, y: 14 },
  { id: 'r7', type: 'broken', v: 'chair', x: 22, y: 25, ox: 0.1 },
  { id: 'pl1', type: 'plant', x: 2, y: 4, oy: 0.1 }, { id: 'pl2', type: 'plant', x: 16, y: 2, ox: 0.15 }, { id: 'pl3', type: 'plant', x: 14, y: 30 },
  { id: 'pl4', type: 'plant', x: 18, y: 22, oy: -0.15 },
  { id: 't1', type: 'torch', x: 1, y: 25, ox: -0.42 }, { id: 't2', type: 'torch', x: 1, y: 9, ox: -0.42 }, { id: 't3', type: 'torch', x: 7, y: 23, ox: -0.42 },
  { id: 't4', type: 'torch', x: 29, y: 23, ox: 0.42 }, { id: 't5', type: 'torch', x: 19, y: 19, ox: 0.42 },
  { id: 's1', type: 'scribble', v: 0, x: 15, y: 23, from: [16, 23] }, { id: 's2', type: 'scribble', v: 1, x: 12, y: 5, from: [12, 6] },
  { id: 's3', type: 'scribble', v: 2, x: 20, y: 9, from: [19, 9] }, { id: 's4', type: 'scribble', v: 3, x: 6, y: 13, from: [7, 13] },
  { id: 's5', type: 'scribble', v: 4, x: 30, y: 10, from: [29, 10] }, { id: 's6', type: 'scribble', v: 5, x: 11, y: 8, from: [11, 9] },
  { id: 's7', type: 'scribble', v: 0, x: 6, y: 22, from: [5, 22] }, { id: 's8', type: 'scribble', v: 2, x: 21, y: 12, from: [22, 12] },
  { id: 's9', type: 'scribble', v: 1, x: 17, y: 19, from: [16, 19] },
];
/* where Mildred walks (hallways only: no doors to squeeze through), round and round */
G.MILDRED_ROUTE = [[7, 22], [7, 9], [12, 6], [19, 7], [19, 16], [19, 7], [25, 6], [29, 9], [29, 22], [26, 24], [29, 22], [29, 9], [25, 7], [19, 6], [12, 7], [7, 9]];

/* Things standing in the castle. kind: monster | npc | object | prop (decoration, blocks movement) | deco (walk-through).
   Things on furniture (blocks) stand on its top; ox/oy move a thing off the middle of its square. */
G.THINGS = [
  { id: 'sneezalot', kind: 'npc', x: 20, y: 23, sprite: 'armor', face: '' },
  { id: 'rat', kind: 'monster', x: 2, y: 20 },        // little Nibbles by the cooking island, in sight from the door
  { id: 'goblin', kind: 'monster', x: 16, y: 18 },
  { id: 'skeleton', kind: 'monster', x: 13, y: 11 },
  { id: 'spider', kind: 'monster', x: 3, y: 6 },
  { id: 'archer', kind: 'monster', x: 5, y: 1 },
  { id: 'wolf', kind: 'monster', x: 23, y: 17 },
  { id: 'troll', kind: 'monster', x: 25, y: 11, ox: -0.5, inBed: true },   // asleep in the middle of the giant bed, tucked in
  { id: 'wizard', kind: 'monster', x: 31, y: 1 },
  { id: 'knight', kind: 'monster', x: 19, y: 3 },
  { id: 'cheesechest', kind: 'object', x: 1, y: 28, sprite: 'prop_cheesechest' },
  // the secret rooms (art: secretArt.js)
  { id: 'sec_armoury', kind: 'object', x: 33, y: 12, sprite: 'prop_sec-armour' },
  { kind: 'prop', x: 31, y: 11, sprite: 'prop_sec-swords', oy: -0.15 }, { kind: 'prop', x: 33, y: 14, sprite: 'prop_sec-helmets', ox: 0.1 },
  { kind: 'prop', x: 31, y: 14, sprite: 'prop_guardstatue' }, { kind: 'deco', x: 33, y: 11, sprite: 'prop_sec-hanky', ox: 0.2, oy: -0.2 },
  { kind: 'deco', x: 32, y: 14, sprite: 'prop_weaponrack', oy: 0.3 },
  { id: 'sec_mice', kind: 'object', x: 10, y: 26, sprite: 'prop_sec-mayor' },
  { kind: 'deco', x: 9, y: 27, sprite: 'prop_sec-table', oy: 0.15 }, { kind: 'deco', x: 10, y: 28, sprite: 'prop_sec-houses', ox: 0.1, oy: 0.15 },
  { kind: 'deco', x: 7, y: 28, sprite: 'prop_sec-beds', oy: 0.2 }, { kind: 'deco', x: 9, y: 28, sprite: 'prop_waxcheeses', oy: 0.25 },
  { id: 'sec_closet', kind: 'object', x: 8, y: 1, sprite: 'prop_sec-plant' },
  { kind: 'deco', x: 8, y: 1, sprite: 'prop_sec-tools', ox: 0.32, oy: 0.1 }, { kind: 'deco', x: 7, y: 3, sprite: 'prop_sec-seeds', oy: 0.25 },
  { kind: 'deco', x: 8, y: 3, sprite: 'prop_sec-sacks', ox: 0.28, oy: 0.05 },
  { id: 'sec_treasury', kind: 'object', x: 26, y: 27, sprite: 'prop_sec-crown' },
  { kind: 'deco', x: 24, y: 28, sprite: 'prop_sec-coins', oy: 0.15 }, { kind: 'prop', x: 26, y: 28, sprite: 'prop_sec-jewels' },
  { kind: 'deco', x: 23, y: 27, sprite: 'prop_goldcandles' }, { kind: 'prop', x: 24, y: 27, sprite: 'prop_sec-duck' }, { kind: 'deco', x: 25, y: 28, sprite: 'prop_sec-coins', oy: 0.15 },
  // the things you can play with
  { id: 'easel', kind: 'object', x: 1, y: 14, sprite: 'prop_magiceasel' },
  { id: 'tub', kind: 'object', x: 13, y: 3, sprite: 'prop_ducktub', oy: -0.5 },        // in the middle of its tiled step
  { id: 'musicbox', kind: 'object', x: 16, y: 12, sprite: 'prop_musicbox' },              // on the stage
  { id: 'toybox', kind: 'object', x: 22, y: 1, sprite: 'prop_toybox' },
  { id: 'anvil', kind: 'object', x: 25, y: 17, sprite: 'prop_anvil' },
  { id: 'cauldron', kind: 'object', x: 31, y: 2, sprite: 'prop_mixcauldron' },
  { id: 'feast', kind: 'object', x: 13, y: 18, sprite: 'prop_cookiejar', oy: 0.5 },       // the cookie jar in the middle of the feast table

  // Entrance Hall (x 16-22, y 22-26): pillars, the red carpet from the gate to the Long Corridor; doors west and east at y 24
  { kind: 'prop', x: 16, y: 22, sprite: 'prop_clock', ox: -0.18, oy: -0.1 }, { kind: 'prop', x: 22, y: 22, sprite: 'prop_catking', ox: 0.12, oy: -0.1 },
  { kind: 'prop', x: 20, y: 22, sprite: 'prop_tissues', ox: 0.1, oy: -0.15 },   // next to Sir Sneezalot (20, 23)
  { kind: 'prop', x: 16, y: 26, sprite: 'prop_coatstand', ox: -0.15, oy: 0.1 }, { kind: 'prop', x: 22, y: 26, sprite: 'prop_halltable', ox: 0.12, oy: 0.1 },
  { kind: 'deco', x: 18, y: 26, sprite: 'prop_fern', ox: -0.2, oy: 0.36 }, { kind: 'deco', x: 20, y: 26, sprite: 'prop_topiary', ox: 0.2, oy: 0.36 },
  // Long Corridor (x 19, y 8-20): something in every nook
  { kind: 'prop', x: 18, y: 10, sprite: 'prop_guardstatue', ox: -0.1 }, { kind: 'prop', x: 20, y: 12, sprite: 'prop_armourstand2', ox: 0.1 },
  { kind: 'prop', x: 18, y: 14, sprite: 'prop_marblebust', ox: -0.1 }, { kind: 'prop', x: 20, y: 16, sprite: 'prop_purpleurn', ox: 0.1 },
  { kind: 'prop', x: 18, y: 18, sprite: 'prop_stonebench', ox: -0.1 },
  // West and East Hallways: a suit of armour, a statue, a window seat, flowers
  { kind: 'prop', x: 8, y: 10, sprite: 'prop_armourstand', ox: 0.1 }, { kind: 'prop', x: 8, y: 15, sprite: 'prop_guardstatue', ox: 0.1 },
  { kind: 'prop', x: 30, y: 21, sprite: 'prop_flowercolumn', ox: 0.1 },
  // North Hall (x 7-31, y 6-7): pillars along the south side, things against the north wall between the doors
  { kind: 'deco', x: 8, y: 6, sprite: 'prop_armourstand2', oy: -0.38 }, { kind: 'deco', x: 11, y: 6, sprite: 'prop_bannerpole', oy: -0.38 },
  { kind: 'deco', x: 16, y: 6, sprite: 'prop_purpleurn', oy: -0.38 }, { kind: 'deco', x: 22, y: 6, sprite: 'prop_bannerpole', oy: -0.38 },
  { kind: 'deco', x: 27, y: 6, sprite: 'prop_torchstand', oy: -0.38 }, { kind: 'deco', x: 29, y: 6, sprite: 'prop_guardstatue', oy: -0.38 },
  // Kitchen (x 1-5, y 19-23): the cooking island in the middle, Nibbles beside it; the door (5,20) and the cellar stairs (3,23) stay free
  { kind: 'prop', x: 1, y: 19, sprite: 'prop_dresser', ox: -0.12, oy: -0.15 }, { kind: 'prop', x: 2, y: 19, sprite: 'prop_breadoven', oy: -0.12 },
  { kind: 'prop', x: 3, y: 19, sprite: 'prop_spicecabinet', oy: -0.18 }, { kind: 'prop', x: 5, y: 19, sprite: 'prop_cauldron', ox: 0.08, oy: -0.08 },
  { kind: 'prop', x: 1, y: 20, sprite: 'prop_preptable', ox: -0.1 }, { kind: 'prop', x: 1, y: 23, sprite: 'prop_flourapples', ox: -0.12, oy: 0.1 },
  { kind: 'prop', x: 5, y: 23, sprite: 'prop_cheesecart', ox: 0.1, oy: 0.1 }, { kind: 'deco', x: 4, y: 23, sprite: 'prop_washtub', ox: 0.2, oy: 0.37 },
  // Cheese Cellar (x 1-5, y 25-28): a little maze of barrels and cheese; the chest at the end, the mouse hole in the east wall
  { kind: 'prop', x: 1, y: 26, sprite: 'prop_cheesebarrel', ox: -0.05 }, { kind: 'prop', x: 2, y: 26, sprite: 'prop_cheesestack' },
  { kind: 'prop', x: 4, y: 26, sprite: 'prop_cellarcrates' }, { kind: 'prop', x: 4, y: 27, sprite: 'prop_cheeserack' },
  { kind: 'prop', x: 2, y: 28, sprite: 'prop_cheesebarrel', oy: 0.1 }, { kind: 'deco', x: 3, y: 28, sprite: 'prop_waxcheeses', oy: 0.35 },
  // Portrait Gallery (x 1-5, y 14-17): busts on marble stands, a velvet rope in front of the best painting, the magic easel by its paints
  { kind: 'deco', x: 2, y: 15, sprite: 'prop_marblebust' }, { kind: 'deco', x: 4, y: 15, sprite: 'prop_marblebust' },
  { kind: 'prop', x: 2, y: 17, sprite: 'prop_velvetrope', oy: 0.1 }, { kind: 'prop', x: 3, y: 17, sprite: 'prop_velvetrope', oy: 0.1 }, { kind: 'prop', x: 4, y: 17, sprite: 'prop_velvetrope', oy: 0.1 },
  { kind: 'prop', x: 1, y: 17, sprite: 'prop_palm', ox: -0.15, oy: 0.15 }, { kind: 'prop', x: 5, y: 17, sprite: 'prop_palm', ox: 0.15, oy: 0.15 },
  { kind: 'prop', x: 1, y: 15, sprite: 'prop_painttable', ox: -0.12 }, { kind: 'prop', x: 5, y: 14, sprite: 'prop_paintarmour', ox: 0.15, oy: -0.15 },
  { kind: 'deco', x: 3, y: 16, sprite: 'prop_gallerybench', oy: 0.3 },
  // Library (x 1-5, y 6-12): two rows of bookshelves make aisles; Madame Webs guards the Greenhouse door (3,5) and moves to (1,6)
  // when freed; the rune door (6,9); a reading nook at the bottom
  { kind: 'prop', x: 5, y: 6, sprite: 'prop_globe', ox: 0.15, oy: -0.1 }, { kind: 'prop', x: 3, y: 9, sprite: 'prop_lectern' },
  { kind: 'deco', x: 2, y: 7, sprite: 'prop_ladder', oy: 0.36 }, { kind: 'deco', x: 4, y: 9, sprite: 'prop_bookpile', ox: 0.1, oy: 0.36 },
  { kind: 'prop', x: 1, y: 12, sprite: 'prop_armchair', ox: -0.15, oy: 0.1 }, { kind: 'deco', x: 2, y: 12, sprite: 'prop_yarnbasket', ox: -0.1, oy: 0.3 },
  { kind: 'prop', x: 5, y: 12, sprite: 'prop_bookpile', ox: 0.15, oy: 0.2 }, { kind: 'prop', x: 4, y: 12, sprite: 'prop_candelabra', oy: 0.25 },
  // Greenhouse (x 1-5, y 1-4): two planters and a pond in the middle; Robin at the far end (5,1), reached round the east path
  { kind: 'prop', x: 1, y: 1, sprite: 'prop_bigplant', ox: -0.15, oy: -0.15 }, { kind: 'prop', x: 3, y: 1, sprite: 'prop_lemontree', oy: -0.15 },
  { kind: 'prop', x: 1, y: 2, sprite: 'prop_pottingbench', ox: -0.2 }, { kind: 'prop', x: 1, y: 3, sprite: 'prop_cactus', ox: -0.15 },
  { kind: 'prop', x: 1, y: 4, sprite: 'prop_wheelbarrow', ox: -0.12, oy: 0.12 },
  { kind: 'deco', x: 2, y: 2, sprite: 'prop_sunflowers', oy: 0.1 }, { kind: 'deco', x: 4, y: 3, sprite: 'prop_rosebush', oy: -0.05 },
  // Royal Bathroom (x 10-16, y 1-4): the duck tub up on its tiled step in the middle; the potty behind a little wall
  { kind: 'prop', x: 10, y: 1, sprite: 'prop_washbasin', ox: -0.12, oy: -0.18 }, { kind: 'prop', x: 10, y: 2, sprite: 'prop_bubblebath', ox: -0.2 },
  { kind: 'prop', x: 10, y: 3, sprite: 'prop_towelstand', ox: -0.2 }, { kind: 'prop', x: 10, y: 4, sprite: 'prop_bathfern', ox: -0.15, oy: 0.15 },
  { kind: 'prop', x: 16, y: 1, sprite: 'prop_royalpotty', ox: 0.12, oy: -0.18 }, { kind: 'prop', x: 16, y: 4, sprite: 'prop_duckbasket', ox: 0.15, oy: 0.15 },
  { kind: 'deco', x: 13, y: 4, sprite: 'prop_bathmat', oy: 0.3 },
  // Ballroom (x 10-16, y 9-15): marble pillars round the dance floor, Rattlebones in the middle, the trap door (13,12) under the
  // chandelier, the music box on the stage; doors north (13,9), west (10,12) and south (13,15) stay free
  { kind: 'prop', x: 10, y: 9, sprite: 'prop_piano', ox: -0.1, oy: -0.15 }, { kind: 'prop', x: 16, y: 9, sprite: 'prop_harp', ox: 0.15, oy: -0.15 },
  { kind: 'prop', x: 16, y: 10, sprite: 'prop_flowercolumn', ox: 0.2 }, { kind: 'prop', x: 16, y: 14, sprite: 'prop_flowercolumn', ox: 0.2 },
  { kind: 'prop', x: 10, y: 14, sprite: 'prop_velvetsofa', ox: -0.24 }, { kind: 'prop', x: 10, y: 10, sprite: 'prop_dancemirror', ox: -0.2 },
  { kind: 'prop', x: 16, y: 15, sprite: 'prop_punchtable', ox: 0.15, oy: 0.15 }, { kind: 'prop', x: 10, y: 15, sprite: 'prop_bandstage', ox: -0.1, oy: 0.15 },
  // Dining Hall (x 10-16, y 17-20): the long feast table, chairs along it, Gobbo at its head (16,18)
  { kind: 'deco', x: 11, y: 17, sprite: 'prop_royalchair', oy: 0.3 }, { kind: 'deco', x: 15, y: 17, sprite: 'prop_royalchair', oy: 0.3 },
  { kind: 'deco', x: 12, y: 20, sprite: 'prop_royalchair', oy: -0.3 }, { kind: 'deco', x: 15, y: 20, sprite: 'prop_royalchair', oy: -0.3 },
  { kind: 'prop', x: 10, y: 19, sprite: 'prop_royalchair', ox: 0.2 },
  { kind: 'deco', x: 11, y: 18, sprite: 'prop_candelabra', ox: 0.1, oy: 0.5 }, { kind: 'deco', x: 15, y: 18, sprite: 'prop_candelabra', ox: -0.1, oy: 0.5 },
  { kind: 'prop', x: 10, y: 17, sprite: 'prop_teatrolley', ox: -0.1, oy: -0.15 }, { kind: 'prop', x: 16, y: 20, sprite: 'prop_juicebarrel', ox: 0.1, oy: 0.15 },
  // the food on the feast table (it stands on the table's top)
  { kind: 'deco', x: 11, y: 19, sprite: 'prop_food-pie', ox: 0.15, oy: -0.25 }, { kind: 'deco', x: 12, y: 18, sprite: 'prop_food-roast', oy: 0.3 },
  { kind: 'deco', x: 12, y: 19, sprite: 'prop_food-fruit', oy: -0.15 }, { kind: 'deco', x: 14, y: 18, sprite: 'prop_food-cake', oy: 0.35 },
  { kind: 'deco', x: 14, y: 19, sprite: 'prop_food-bread', oy: -0.2 }, { kind: 'deco', x: 15, y: 19, sprite: 'prop_food-jelly', ox: -0.15, oy: -0.25 },
  // Giant's Bedroom (x 22-27, y 9-14): the giant bed in the middle with Big Barry in it, everything giant round it;
  // the doors (23,9) and (27,11) and the way round the bed stay free
  { kind: 'prop', x: 22, y: 9, sprite: 'prop_wardrobe', ox: -0.15, oy: -0.22 }, { kind: 'prop', x: 27, y: 9, sprite: 'prop_toychest', ox: 0.15, oy: -0.18 },
  { kind: 'prop', x: 22, y: 11, sprite: 'prop_giantteddy', ox: -0.18 }, { kind: 'prop', x: 27, y: 10, sprite: 'prop_giantlamp', ox: 0.12 },
  { kind: 'prop', x: 27, y: 13, sprite: 'prop_giantmilk', ox: 0.18, oy: 0.1 }, { kind: 'prop', x: 22, y: 14, sprite: 'prop_cushionpile', ox: -0.12, oy: 0.12 },
  { kind: 'prop', x: 24, y: 14, sprite: 'prop_giantsock', oy: 0.15 }, { kind: 'deco', x: 26, y: 12, sprite: 'prop_bunnyslippers', ox: -0.2, oy: 0.1 },
  // Smithy (x 22-27, y 16-18 and the forge nook x 22-23, y 19-20): Howl by the anvil in the middle; the door (27,18)
  { kind: 'prop', x: 22, y: 20, sprite: 'prop_forge', ox: -0.1, oy: 0.1 }, { kind: 'prop', x: 23, y: 20, sprite: 'prop_quench', oy: 0.18 },
  { kind: 'prop', x: 22, y: 16, sprite: 'prop_coalcart', ox: -0.12, oy: -0.15 }, { kind: 'prop', x: 24, y: 16, sprite: 'prop_armourstand', oy: -0.2 },
  { kind: 'prop', x: 25, y: 16, sprite: 'prop_grindstone', oy: -0.15 }, { kind: 'prop', x: 22, y: 18, sprite: 'prop_weaponrack', ox: -0.22 },
  { kind: 'deco', x: 27, y: 16, sprite: 'prop_horseshoes', ox: -0.1 },
  // Toy Room (x 22-27, y 1-4): the play table with a toy castle in the middle, a train round it; the door (24,4)
  { kind: 'deco', x: 24, y: 2, sprite: 'prop_toycastle', ox: 0.5, oy: 0.4 }, { kind: 'deco', x: 25, y: 3, sprite: 'prop_toysoldiers', ox: -0.1, oy: 0.1 },
  { kind: 'prop', x: 27, y: 1, sprite: 'prop_rockinghorse', ox: 0.12, oy: -0.15 }, { kind: 'prop', x: 27, y: 4, sprite: 'prop_toyblocks', ox: 0.15, oy: 0.15 },
  { kind: 'prop', x: 22, y: 4, sprite: 'prop_toyteddy', ox: -0.15, oy: 0.15 }, { kind: 'prop', x: 27, y: 3, sprite: 'prop_fort', ox: 0.12 },   // the blanket fort
  { kind: 'deco', x: 23, y: 4, sprite: 'prop_spintop', ox: -0.2, oy: 0.3 }, { kind: 'deco', x: 26, y: 2, sprite: 'prop_toytrain', ox: 0.32, oy: 0.1 },
  // Spiral Stairs (x 18-20, y 3-4): the knight at (19,3) under the Moon Door (19,2) steps to (18,3) when freed
  { kind: 'prop', x: 20, y: 3, sprite: 'prop_spiralstairs', ox: 0.12, oy: -0.1 }, { kind: 'deco', x: 20, y: 4, sprite: 'prop_polishkit', ox: 0.3, oy: 0.3 },
  // Alchemy Lab (x 29-33, y 1-4, the corners cut off): the cauldron in the middle (31,2), Grumbledore behind it
  { kind: 'prop', x: 32, y: 1, sprite: 'prop_telescope', ox: 0.15, oy: -0.15 }, { kind: 'prop', x: 29, y: 2, sprite: 'prop_potionshelf', ox: -0.12 },
  { kind: 'prop', x: 29, y: 3, sprite: 'prop_alembic', ox: -0.12 }, { kind: 'prop', x: 33, y: 2, sprite: 'prop_spellbook', ox: 0.15 },
  { kind: 'prop', x: 33, y: 3, sprite: 'prop_terrarium', ox: 0.15 }, { kind: 'prop', x: 30, y: 4, sprite: 'prop_potioncrate', ox: -0.12, oy: 0.12 },
  { kind: 'prop', x: 32, y: 4, sprite: 'prop_mushrooms', ox: 0.12, oy: 0.12 },
  // the forecourt (x 12-26, y 30-32) and the approach to the gate (x 17-21, y 28-29): the middle (x 19) stays free
  { kind: 'deco', x: 18, y: 28, sprite: 'prop_lamppost', ox: -0.3, oy: -0.4 }, { kind: 'deco', x: 20, y: 28, sprite: 'prop_rosebush', ox: 0.3, oy: -0.38 },
  { kind: 'prop', x: 17, y: 29, sprite: 'prop_sentrybox', ox: -0.15 }, { kind: 'deco', x: 21, y: 29, sprite: 'prop_pumpkins', ox: 0.2, oy: 0.1 },
  { kind: 'prop', x: 13, y: 30, sprite: 'prop_well', ox: -0.1, oy: -0.1 }, { kind: 'deco', x: 16, y: 30, sprite: 'prop_lamppost', oy: -0.35 },
  { kind: 'deco', x: 22, y: 30, sprite: 'prop_lamppost', oy: -0.35 }, { kind: 'prop', x: 25, y: 30, sprite: 'prop_gargoyle', ox: 0.1, oy: -0.1 },
  { kind: 'prop', x: 25, y: 32, sprite: 'prop_haycart', ox: 0.15, oy: 0.15 }, { kind: 'deco', x: 13, y: 32, sprite: 'prop_pumpkins', ox: -0.15, oy: 0.2 },
  { kind: 'deco', x: 20, y: 31, sprite: 'prop_signpost', ox: 0.2, oy: -0.1 }, { kind: 'deco', x: 16, y: 32, sprite: 'prop_rosebush', oy: 0.3 },
  { kind: 'deco', x: 12, y: 31, sprite: 'prop_sunflowers', ox: -0.2 }, { kind: 'deco', x: 26, y: 31, sprite: 'prop_milkchurns', ox: 0.2 },
];

G.NPC_LINES = {
  sneezalot: [
    'ACHOO! Oh, a visitor! I am Sir Sneezalot, the castle guard. Well... my armour is. I am just a bit dusty.',
    'Wanda the Witch has CURSED everyone in the castle! They are trapped in purple curse bubbles and acting grumpy.',
    'She cursed your cards too! Tap a card in battle and solve the puzzle to break its curse. The answer is how strong the card is!',
    'Get it wrong and the curse makes the card weak. Take your time, there is no hurry!',
    'Find the THREE Moon Keys to open the Moon Door to her tower. Try the West Hallway first. ACHOO!',
  ],
};
