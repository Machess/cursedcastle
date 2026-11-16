/* VIEW — Puts the hand-made (AI) textures from artData.js into the rooms, replacing the code-drawn ones.
   A room theme lists its wall, floor and ceiling art, plus wall variants: the same wall with a decoration
   (torch, banner…) placed on it. Anything not listed here keeps its code-drawn texture. */
(function () {
  G.ART_THEMES = {
    outside: { wall: 'outside-wall', floor: 'outside-floor', variants: [null, 'gate-banner', 'gate-ivy', 'gate-lantern', 'witch-wanted', 'lit-window', 'gargoyle-head', 'torch'] },   // Castle Gate
    hall:    { wall: 'hall-wall', floor: 'hall-floor', ceil: 'hall-ceiling',   // the Entrance Hall
               variants: [null, 'royal-portrait', 'swords-sun', 'stained-glass', 'tapestry', 'sconce', 'torch', 'landscape', 'trophy-shelf', 'swords-plain', 'banner-purple'] },
    hallway: { wall: 'hallway-wall', floor: 'hallway-floor', ceil: 'hallway-ceiling',   // all four hallways
               variants: [null, 'torch', 'banner-purple', null, 'grumpy-king', 'window', 'moon-banner', 'crossed-lances', 'iron-sconce', 'witch-poster', 'arrow-slit'] },
    kitchen: { wall: 'kitchen-wall', floor: 'kitchen-floor', ceil: 'hallway-ceiling',   // Nibbles' kitchen
               variants: [null, 'copper-pans', 'onion-garlic', 'spice-shelf', 'plate-rack', 'kitchen-window', 'herb-bundles', 'cheese-clock', 'cake-painting', 'torch'] },
    toyroom: { base: 0, variants: [null, 'toy-shelf', 'rainbow-kite', 'crayon-castle', 'puppets', 'toy-stars', 'soldier-painting', 'toy-cuckoo', 'paper-planes'] },   // Toy Room
    bathroom: { variants: [null, 'crown-mirror', 'towel-hooks', 'duck-painting', 'soap-shelf', 'bubble-porthole', 'shower-head', 'seashells', 'duck-clock'] },   // Royal Bathroom
    gallery: { base: 4, variants: [null, 'grumpy-king', 'laughing-queen', 'royal-dog', 'side-eye-lady', 'baby-prince', 'castle-sunset', 'pony-knight', 'fruit-face'] },   // Portrait Gallery: the funny paintings
    cellar: { variants: [null, 'cheese-chart', 'sausages', 'cellar-window', 'cheese-shelf', 'cellar-lantern', 'rat-portrait', 'grater-rack'] },   // Cheese Cellar
    vault: { wall: 'vault-wall', floor: 'vault-floor', ceil: 'vault-ceiling',   // the Bone Vault under the Ballroom
             variants: [null, 'band-poster', 'gold-note', 'crown-banner', 'gold-torch', 'gold-records', 'vault-map', 'crossed-trumpets', 'jewel-window'] },
    tower: { floor: 'tower-floor', variants: [null, 'wanda-selfie', 'storm-window', 'witch-hats', 'bat-bunting', 'moon-clock', 'curse-shelf', 'curse-map'] },   // Wanda's tower (the rune circle is too close to the background colour to cut out)
    stairs: { variants: [null, 'knight-portrait', 'tower-map', 'purple-ivy', 'arrow-slit', 'iron-sconce', 'moon-banner'] },   // Spiral Stairs
    lab: { base: 1, variants: [null, 'colour-wheel', 'bottle-shelf', 'lab-herbs', 'moon-phases', 'wizard-portrait', 'star-scroll', 'bubble-lamp', 'crystal-window'] },   // Grumbledore's Alchemy Lab
    bedroom: { variants: [null, 'night-window', 'sheep-painting', 'troll-family', 'star-garland', 'cuckoo-clock', 'nightcap', 'moon-mobile', 'cupcake-drawing'] },   // Big Barry's bedroom
    smithy: { variants: [null, 'tool-board', 'horseshoe-row', 'shield-display', 'hammer-plaque', 'iron-lantern', 'helmet-shelf', 'sword-drawing', 'bellows', 'torch'] },   // Howl's Smithy
    greenhouse: { variants: [null, 'climbing-ivy', 'hanging-basket', 'garden-tools', 'butterfly-frame', 'birdhouse', 'tulip-box', 'strawberry-pots', 'frog-portrait'] },   // Robin's Greenhouse
    library: { variants: [null, 'wall-bookshelf', 'castle-map', 'owl-painting', 'hanging-scarves', 'cute-cobweb', 'reading-lamp', 'star-chart', 'moonlit-window'] },   // Madame Webs' Library
    ballroom: { variants: [null, 'dance-painting', 'violin', 'music-plaque', 'crystal-sconce', 'velvet-drapes', 'music-window', 'party-bunting', 'sun-mirror'] },   // Rattlebones' Ballroom
    dining:  { variants: [null, 'feast-painting', 'goblet-shelf', 'cookie-tapestry', 'brass-candelabra', 'curtain-window', 'baker-crest', 'fruit-painting', 'castle-plate'] },   // Gobbo's Dining Hall
  };
  G.ART_DOORS = { d: 'door-wood', g: 'door-gate', r: 'door-rune', m: 'door-moon', l: 'ladder-up' };

  /* floor tiles laid on single cells (castle.js LAYOUT.floors), e.g. a carpet: drawn over that room's own floor,
     so a carpet runner shows the room's stone at its sides */
  const floorImgs = {}, floorCache = {};
  G.floorTex = function (name, base) {
    const img = floorImgs[name]; if (!img) return null;
    const key = name + '|' + G.TEX_SIZE; if (floorCache[key] && floorCache[key].base === base) return floorCache[key].px;
    const c = document.createElement('canvas'); c.width = c.height = S();
    const x = c.getContext('2d', { willReadFrequently: true });
    if (base) x.putImageData(new ImageData(new Uint8ClampedArray(base.buffer.slice(0)), S(), S()), 0, 0);
    x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, S(), S());
    const px = new Uint32Array(x.getImageData(0, 0, S(), S()).data.buffer.slice(0));
    floorCache[key] = { base, px };
    return px;
  };

  const S = () => G.TEX_SIZE;
  function load(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  function pixels(img, deco) {
    const c = document.createElement('canvas'); c.width = c.height = S();
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = false;
    x.drawImage(img, 0, 0, S(), S());
    if (deco) x.drawImage(deco.img, Math.round((S() - deco.img.width) / 2), deco.top);
    return new Uint32Array(x.getImageData(0, 0, S(), S()).data.buffer.slice(0));
  }

  function overBase(base, deco) {                    // a decoration drawn onto an existing texture's pixels
    const c = document.createElement('canvas'); c.width = c.height = S();
    const x = c.getContext('2d', { willReadFrequently: true });
    x.putImageData(new ImageData(new Uint8ClampedArray(base.buffer.slice(0)), S(), S()), 0, 0);
    x.drawImage(deco.img, Math.round((S() - deco.img.width) / 2), deco.top);
    return new Uint32Array(x.getImageData(0, 0, S(), S()).data.buffer.slice(0));
  }

  /* moving wall art (animArt.js, wallAnim.js): every wall picture with a moving painting or clock gets one picture per
     frame (th.wallFrames[vi], th.animMode[vi]); a wall with a torch / lantern / sconce is drawn plain (th.lightKind[vi])
     and the light stands out from it as a billboard */
  async function animWalls() {
    const AD = G.ANIM_DECOS || {}, LA = G.LIGHT_ART || {}, tiles = {};
    await Promise.all(Object.keys(AD).map(async (k) => { const f = await Promise.all(AD[k].frames.map(load)); if (f.every(Boolean)) tiles[k] = f; }));
    await Promise.all(Object.keys(LA).map(async (k) => { const f = await Promise.all(LA[k].frames.map(load)); if (f.every(Boolean)) G.LIGHT_IMGS[k] = f; }));
    const over = (base, img) => {
      const c = document.createElement('canvas'); c.width = c.height = S();
      const x = c.getContext('2d', { willReadFrequently: true });
      x.putImageData(new ImageData(new Uint8ClampedArray(base.buffer.slice(0)), S(), S()), 0, 0);
      x.drawImage(img, 0, 0, S(), S());
      return new Uint32Array(x.getImageData(0, 0, S(), S()).data.buffer.slice(0));
    };
    let n = 0;
    for (const theme in G.TEX) {
      const th = G.TEX[theme]; if (!th.variants || !th.walls) continue;
      const plain = th.walls[th.variants.indexOf(null)] || th.walls[0];
      th.variants.forEach((d, vi) => {
        if (!d) return;
        if (tiles[d]) {
          (th.wallFrames = th.wallFrames || [])[vi] = tiles[d].map((img) => over(plain, img));
          (th.animMode = th.animMode || [])[vi] = AD[d].mode;
          th.walls[vi] = th.wallFrames[vi][0]; n++;
        } else if (G.LIGHT_KIND && G.LIGHT_IMGS[G.LIGHT_KIND[d]]) {
          (th.lightKind = th.lightKind || [])[vi] = G.LIGHT_KIND[d]; th.walls[vi] = plain; n++;
        }
      });
    }
    return n;
  }

  G.loadArtTextures = async function () {
    const A = G.ART_DATA; if (!A) return 0;
    const imgs = {}, decos = {};
    const allTex = Object.assign({}, A.textures, G.VAULT_TEX || {});   // texture sheets + the vault's (vaultArt.js)
    await Promise.all(Object.keys(allTex).map(async (k) => { imgs[k] = await load(allTex[k]); }));
    const allDecos = Object.assign({}, A.decos, G.DECO_ART || {});   // texture-sheet decorations + room-set ones
    await Promise.all(Object.keys(allDecos).map(async (k) => { const img = await load(allDecos[k].src); if (img) decos[k] = { img, top: allDecos[k].top }; }));
    G.DECO_BOX = {};                                   // where each wall decoration sits on its wall picture (for tapping it)
    for (const k in decos) { const d = decos[k], w = d.img.width, h = d.img.height; G.DECO_BOX[k] = [(S() - w) / 2, d.top, (S() + w) / 2, d.top + h]; }
    const allFloors = Object.assign({}, G.FLOOR_ART || {}, G.VAULT_TEX || {});   // carpet, stage, trap doors
    await Promise.all(Object.keys(allFloors).map(async (k) => { const img = await load(allFloors[k]); if (img) floorImgs[k] = img; }));
    let n = 0;
    for (const theme in G.ART_THEMES) {
      const cfg = G.ART_THEMES[theme], th = G.TEX[theme]; if (!th) continue;
      try {
        th.variants = (cfg.variants || [null]).map((d) => (d && decos[d] ? d : null));   // the decoration on each wall picture (renderer: lights, mirroring)
        if (cfg.wall && imgs[cfg.wall]) { th.walls = (cfg.variants || [null]).map((d) => pixels(imgs[cfg.wall], d && decos[d])); n++; }
        else if (cfg.variants && th.walls) {             // no painted wall yet: decorate the code-drawn one
          const base = th.walls[cfg.base || 0]; th.walls = cfg.variants.map((d) => (d && decos[d] ? overBase(base, decos[d]) : base)); n++;   // base: which code-drawn wall is plain
        }
        if (cfg.floor && imgs[cfg.floor]) { th.floor = pixels(imgs[cfg.floor]); n++; }
        if (cfg.ceil && imgs[cfg.ceil]) { th.ceil = pixels(imgs[cfg.ceil]); n++; }
      } catch (e) { console.warn('art texture skipped for', theme, e); }
    }
    if (G.SKY_ART) {                                   // the painted stormy sky over the castle gate
      const img = await load(G.SKY_ART);
      if (img) {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
        G.SKY = { data: new Uint32Array(x.getImageData(0, 0, c.width, c.height).data.buffer.slice(0)), w: c.width, h: c.height }; n++;
      }
    }
    for (const t in G.ART_DOORS) { const img = imgs[G.ART_DOORS[t]]; if (img) { G.DOOR_TEX[t] = pixels(img); n++; } }
    /* door styles: frame + door + where the opening is (doorArt.js). The locked doors (gate, rune, moon) are their own
       whole picture with no frame: they open with the move in DOOR_LOOK. */
    G.DOOR_STYLES = {};
    const DOOR_LOOK = { hall: 'swing2', plank: 'swing1', portcullis: 'rise', bookcase: 'slide', glass: 'split', curtain: 'curtain', toy: 'swing1', wheel: 'roll',
      g: 'rise', r: 'swing2', m: 'split' };
    for (const k in (G.DOOR_ART || {})) {
      const A = G.DOOR_ART[k], [fi, li] = await Promise.all([load(A.frame), load(A.leaf)]); if (!fi || !li) continue;
      const h = A.hole.map((v) => Math.round(v * S()));
      G.DOOR_STYLES[k] = { frame: pixels(fi), leaf: pixels(li), hole: h, mode: DOOR_LOOK[k] }; n++;
    }
    for (const t of ['g', 'r', 'm']) if (G.DOOR_TEX[t]) G.DOOR_STYLES[t] = { frame: null, leaf: G.DOOR_TEX[t], hole: [0, 0, S(), S()], mode: DOOR_LOOK[t] };
    n += await animWalls();
    if (G.loadWallLook) n += await G.loadWallLook(decos);
    if (G.loadBlockArt) n += await G.loadBlockArt();
    if (G.loadCleanArt) n += await G.loadCleanArt();      // the Witch's mess (controllers/cleaning.js)      // furniture pictures (blocks.js)
    if (G.loadCeilings) n += await G.loadCeilings();      // ceiling pictures, beams, braces, marks (ceilings.js)   // long wall strips, trims, marks and pillars (wallLook.js)
    if (G.makeStairArt) G.makeStairArt();             // stairs up / down and the spiral stairwell (stairsArt.js)
    return n;
  };
})();
