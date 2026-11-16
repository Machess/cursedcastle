/* VIEW — Moving wall art (animArt.js, made by tools-src/prepare_anim.py):
   - paintings and clocks: each has 3 wall pictures [normal, blink/tick, poked]. The renderer asks G.decoFrame which one
     a wall shows right now: portraits blink now and then (each on its own clock), cuckoo clocks swing their weights,
     and a poke (G.decoPoke) shows the funny face for a moment.
   - torches, lanterns and sconces: the wall itself is drawn plain and the light stands out from it as a billboard
     with 4 flickering flame frames and a soft glow over the flames (renderer.js sprites). Their light pools still come
     from the wall's decoration name (renderer.js buildLight). */
(function () {
  // which light art each wall-light decoration becomes, its height (world units; a wall is 1 tall)
  G.LIGHT_KIND = { torch: 'torch', 'gold-torch': 'gold', 'iron-lantern': 'lantern', 'cellar-lantern': 'lantern', 'gate-lantern': 'lantern',
    sconce: 'iron', 'iron-sconce': 'iron', 'crystal-sconce': 'crystal' };
  const LIGHT_H = { torch: 0.5, gold: 0.47, lantern: 0.46, iron: 0.42, crystal: 0.42 };
  const FROM_WALL = 0.4;                               // how far out of its square's middle toward the wall (0.5 = on the wall)
  const FPS = 8;

  function hsh(k) { k = Math.imul(k ^ (k >>> 16), 0x45d9f3b); k = Math.imul(k ^ (k >>> 16), 0x45d9f3b); return (k ^ (k >>> 16)) >>> 0; }

  /* ---------- paintings and clocks ---------- */
  const pokes = {};
  G.decoFrame = function (key, mode, now) {           // key = one wall face (renderer: cell index * 4 + face)
    const p = pokes[key]; if (p && p > now) return 2;
    if (G.world && G.world.dusty && G.world.dusty[key]) return 0;   // a dusty painting stays still until you dust it (cleaning.js)
    const h = hsh(key);
    if ((now + h * 13) % (9000 + h % 6000) < 1300) return 2;      // now and then they pull their funny face all by themselves
    if (mode === 'tick') return ((now / 650 + (h & 7)) | 0) & 1;
    if (mode === 'blink') return (now + h) % (2600 + h % 2400) < 220 ? 1 : 0;
    return 0;
  };
  G.decoPoke = function (key) { pokes[key] = performance.now() + 1700; G.dirty = true; };

  /* ---------- the lights ---------- */
  G.LIGHT_IMGS = {};                                   // kind -> 4 loaded frames (artTextures.js loads them)
  const sprCache = {};
  function canvasOf(img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); return c; }
  function lightSprites(kind, name) {
    const key = kind + '|' + name; if (sprCache[key]) return sprCache[key];
    const imgs = G.LIGHT_IMGS[kind], A = G.LIGHT_ART[kind]; if (!imgs) return null;
    const h = LIGHT_H[kind], w = h * A.w / A.h, b = (G.DECO_BOX || {})[name], S = G.TEX_SIZE || 128;
    const mid = b ? 1 - (b[1] + b[3]) / 2 / S : 0.6;   // as high on the wall as the old painted one
    const cs = imgs.map(canvasOf);
    return (sprCache[key] = cs.map((c) => ({ c, sil: c, w, h, z: mid - h / 2 })));
  }
  G.lightFrames = lightSprites;                       // a torch relit by hand (cleaning.js)
  /* one light thing for every wall face that shows a light (castle, vault, tower...): called by buildThings */
  G.addWallLights = function () {
    const w = G.world; if (!w || !G.LIGHT_ART) return;
    const N4 = [[-1, 0, 1], [1, 0, 0], [0, -1, 3], [0, 1, 2]];    // same faces as renderer.js buildLight
    for (let wy = 0; wy < w.h; wy++) for (let wx = 0; wx < w.w; wx++) {
      if (w.cells[wy * w.w + wx] !== 1) continue;
      for (const [dx, dy, code] of N4) {
        const nx = wx + dx, ny = wy + dy; if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) continue;
        const ni = ny * w.w + nx, th = w.theme[ni]; if (w.cells[ni] !== 0 || !th || !th.lightKind) continue;
        const vi = G.wallVariant(w, wx, wy, code, th), kind = th.lightKind[vi]; if (!kind) continue;
        const frames = lightSprites(kind, th.variants[vi]); if (!frames) continue;
        G.things.push({ kind: 'light', sprite: th.variants[vi], x: nx, y: ny, ox: -dx * FROM_WALL, oy: -dy * FROM_WALL, frames, fi: 0,
          spr: frames[0], glow: G.LIGHT_ART[kind].flames, phase: (hsh(wx * 977 + wy * 131 + code) % 1000) / 1000 * 4, noFog: true });
      }
    }
  };
  /* main loop: flicker the flames */
  G.animLights = function (now) {
    const t = now / 1000 * FPS;
    for (const q of G.things) if (q.kind === 'light') { const f = ((t + q.phase) | 0) % q.frames.length; if (f !== q.fi) { q.fi = f; q.spr = q.frames[f]; } }
  };
  /* the soft glow drawn over a flame (renderer.js, added light) */
  let glowC = null;
  G.flameGlow = function () {
    if (glowC) return glowC;
    glowC = document.createElement('canvas'); glowC.width = glowC.height = 64;
    const x = glowC.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,214,120,0.85)'); g.addColorStop(0.35, 'rgba(255,170,60,0.35)'); g.addColorStop(1, 'rgba(255,140,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return glowC;
  };
})();
