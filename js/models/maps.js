/* MODEL — Maps, regions and the portals (trap doors, ladders, stairs) that join them.
   Every map is its own grid (layout + things). Only one map is loaded at a time: G.useMap() points G.MAP_W/H,
   G.LAYOUT and G.THINGS at it, so the rest of the game works the same on every map.
   A region is a group of maps with one story (Moonstone Castle now; the Enchanted Forest next).
   To add a map: put its layout and things in G.MAPS, its rooms in rooms.js, and join it with a portal. */
(function () {
  G.MAPS = {
    castle: { name: 'Moonstone Castle', w: G.MAP_W, h: G.MAP_H, layout: G.LAYOUT, things: G.THINGS },

    /* the Bone Vault under the Ballroom: a ladder hall, a short passage and the treasure vault with the band's stage */
    vault: {
      name: 'The Bone Vault', w: 11, h: 13,
      layout: {
        rects: [['V', 2, 1, 8, 6], ['U', 5, 7, 5, 8], ['U', 4, 9, 6, 11]],
        doors: [['l', 5, 12, 'U']],                        // l = ladder up (a wall you climb, see PORTALS)
        floors: [['stage-floor', 4, 1, 6, 3]],             // the band's wooden stage
        start: { x: 5, y: 11, dir: 0 },
      },
      things: [
        { id: 'band', kind: 'monster', x: 5, y: 3 },        // on the stage, in front of the treasure
        { id: 'vaultchest', kind: 'object', x: 5, y: 1, sprite: 'prop_vaultchest' },
        // the treasure alcove: (5,2) can only be reached past the band
        { kind: 'prop', x: 4, y: 1, sprite: 'prop_crowncushion', oy: -0.15 }, { kind: 'prop', x: 6, y: 1, sprite: 'prop_treasureurn', oy: -0.15 },
        { kind: 'prop', x: 4, y: 2, sprite: 'prop_musicstands', ox: -0.1 }, { kind: 'prop', x: 6, y: 2, sprite: 'prop_musicstands', ox: 0.1 },
        { kind: 'prop', x: 2, y: 1, sprite: 'prop_coinpiles', ox: -0.15, oy: -0.15 }, { kind: 'prop', x: 8, y: 1, sprite: 'prop_coinpiles', ox: 0.15, oy: -0.15 },
        { kind: 'prop', x: 2, y: 3, sprite: 'prop_instrumentrack', ox: -0.2 }, { kind: 'prop', x: 8, y: 3, sprite: 'prop_bandstage', ox: 0.18 },
        { kind: 'prop', x: 2, y: 6, sprite: 'prop_goldcandles', ox: -0.15, oy: 0.15 }, { kind: 'prop', x: 8, y: 6, sprite: 'prop_goldcandles', ox: 0.15, oy: 0.15 },
        { kind: 'deco', x: 4, y: 9, sprite: 'prop_goldcandles', ox: -0.35, oy: -0.35 }, { kind: 'deco', x: 6, y: 9, sprite: 'prop_goldcandles', ox: 0.35, oy: -0.35 },
        { kind: 'deco', x: 4, y: 11, sprite: 'prop_coinpiles', ox: -0.35, oy: 0.3 },
      ],
    },
    /* the Witch's Tower, at the top of the spiral stairs behind the Moon Door */
    tower: {
      name: "The Witch's Tower", w: 5, h: 6,
      layout: {
        rects: [['T', 1, 1, 3, 2], ['T', 2, 3, 2, 3]],
        doors: [['v', 2, 4, 'T']],                         // v = stairs going down (a picture you walk into, see PORTALS)
        start: { x: 2, y: 3, dir: 0 },
      },
      things: [
        { id: 'witch', kind: 'monster', x: 2, y: 1 },
        { kind: 'prop', x: 1, y: 1, sprite: 'prop_witchcauldron', ox: -0.1, oy: -0.15 }, { kind: 'prop', x: 3, y: 1, sprite: 'prop_crystalball', ox: 0.15, oy: -0.1 },
        { kind: 'prop', x: 1, y: 2, sprite: 'prop_broomrack', ox: -0.2, oy: 0.1 }, { kind: 'prop', x: 3, y: 2, sprite: 'prop_witchchair', ox: 0.2, oy: 0.1 },
        { kind: 'deco', x: 2, y: 1, sprite: 'prop_toadcage', ox: -0.38, oy: -0.38 }, { kind: 'deco', x: 2, y: 1, sprite: 'prop_cursejars', ox: 0.38, oy: -0.38 },
        { kind: 'deco', x: 1, y: 2, sprite: 'prop_spellstack', ox: 0.3, oy: 0.38 }, { kind: 'deco', x: 3, y: 2, sprite: 'prop_dragonboard', ox: -0.3, oy: 0.38 },
      ],
    },
    /* the inside of the spiral stairwell: only seen while climbing (portals.js). spiral: the renderer draws the steps */
    stairwell: { name: 'Spiral Stairs', w: 3, h: 3, spiral: true, transit: true,
      layout: { rects: [['X', 1, 1, 1, 1]], doors: [], start: { x: 1, y: 1, dir: 0 } }, things: [] },
  };
  G.REGIONS = {
    castle: { name: 'Moonstone Castle', maps: ['castle', 'vault', 'tower'] },
    // forest: { name: 'The Enchanted Forest', maps: ['forest'] },   (next region)
  };

  /* portals: kind 'hatch' = a trap door in the floor (walk onto it), 'ladder' = a ladder wall (walk into it).
     show(): when it is there at all. firstTime: the flag that is set after the first trip (the first trip down is a slide). */
  G.PORTALS = [
    { id: 'hatch', map: 'castle', x: 13, y: 12, kind: 'hatch', dir: 'down', show: () => !!G.state.flags.hatch,
      to: { map: 'vault', x: 5, y: 11, dir: 0 }, label: 'Climb down to the Bone Vault', where: 'the Bone Vault' },
    { id: 'ladder', map: 'vault', x: 5, y: 12, kind: 'ladder', dir: 'up', show: () => true,
      to: { map: 'castle', x: 13, y: 12, dir: 0 }, label: 'Climb up to the Ballroom', where: 'the Ballroom' },
    // kind 'stairs': walk into it and you climb (no question asked). The Moon Door opens onto the stairs up.
    { id: 'towerUp', map: 'castle', x: 19, y: 2, kind: 'stairs', dir: 'up', show: () => !!G.state.flags.door_19_2,
      to: { map: 'tower', x: 2, y: 3, dir: 0 }, where: "the Witch's Tower" },
    { id: 'towerDown', map: 'tower', x: 2, y: 4, kind: 'stairs', dir: 'down', show: () => true,
      to: { map: 'castle', x: 19, y: 3, dir: 2 }, where: 'the Spiral Stairs' },
  ];

  G.mapId = () => (G.state && G.state.map) || 'castle';
  G.useMap = function (id) {
    const m = G.MAPS[id] || G.MAPS.castle;
    G.MAP_W = m.w; G.MAP_H = m.h; G.LAYOUT = m.layout; G.THINGS = m.things;
  };
  G.portalAt = function (x, y) {
    const map = G.mapId();
    return G.PORTALS.find((p) => p.map === map && p.x === x && p.y === y && p.show()) || null;
  };
  /* which map a thing (monster, object) lives on */
  G.mapOfThing = function (id) { for (const k in G.MAPS) if (G.MAPS[k].things.some((t) => t.id === id)) return k; return null; };
  /* the flag that remembers an opened door; the castle keeps its old names so old saves still work */
  G.doorKey = (x, y) => (G.mapId() === 'castle' ? `door_${x}_${y}` : `door@${G.mapId()}_${x}_${y}`);

  /* go to another map (used by portals; also by the dev tools) */
  G.switchMap = function (id, x, y, dir) {
    const s = G.state; s.map = id; Object.assign(s, { x, y, dir });
    G.afterLoad();
  };
})();
