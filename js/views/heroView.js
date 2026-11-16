/* VIEW — Draws the player's hero from its parts (heroArt.js): head, body, the head's front (face + neck above the collar), then hair or hat.
   A "look" is { cls, colour, face, skin, top }. Drawn on canvases (not turned into image files), so it also works
   when the game is opened straight from the disk. */
(function () {
  const A = () => G.HERO_ART;
  const imgs = {};
  const COLOURS = { red: ['#e0604a', '#7a1f1a'], green: ['#5fb06a', '#1f5a2a'], blue: ['#6a86e6', '#1f2f7a'] };
  G.HERO_COLOURS = COLOURS;
  // old saves (made before the creator) get a look that matches their class
  G.DEFAULT_LOOKS = {
    warrior: { cls: 'warrior', colour: 'red', face: 'happy', skin: 'fair', hair: 'spiky', hat: 'none' },
    rogue: { cls: 'rogue', colour: 'green', face: 'bold', skin: 'brown', hair: 'swoop', hat: 'hood' },
    wizard: { cls: 'wizard', colour: 'blue', face: 'cute', skin: 'dark', hair: 'curly', hat: 'wizardhat' },
  };
  G.HAIRS = ['spiky', 'curly', 'swoop', 'ponytail'];
  G.HATS = ['none', 'helm', 'wizardhat', 'hood', 'cap'];
  /* hair and hat are chosen separately now; looks saved before that had one "top" (a hairstyle OR a hat) */
  G.normLook = function (l) {
    if (!l || l.hair || l.portrait) return l;
    const top = l.top || 'spiky', isHair = G.HAIRS.includes(top);
    return Object.assign({}, l, { hair: isHair ? top : 'swoop', hat: isHair ? 'none' : top });
  };
  G.heroLook = () => { const s = G.state; return G.normLook((s && s.look) || G.DEFAULT_LOOKS[(s && s.cls) || 'warrior']); };

  function load(src) {
    if (!imgs[src]) { const i = new Image(); i.onload = () => { i.ready = true; G.redrawHeroes && G.redrawHeroes(); }; i.src = src; imgs[src] = i; }
    return imgs[src];
  }
  G.loadHeroParts = function () {
    const a = A(); if (!a) return;
    for (const g of ['body', 'head', 'top', 'neck']) for (const k in (a[g] || {})) load(a[g][k]);
    if (a.headclip) load(a.headclip);
  };
  function parts(look) {
    const a = A(); look = G.normLook(look);
    const hat = look.hat && look.hat !== 'none' ? a.top[look.hat] : null;
    return { head: a.head[look.face + '-' + look.skin], body: a.body[look.cls + '-' + look.colour],
      neck: a.neck && a.neck[look.cls], hair: look.hair ? a.top[look.hair] : null, hat, clip: hat && a.headclip };
  }
  let tmp = null;   // scratch canvas for layers that get cut to a shape
  function scratch(W, H) { tmp = tmp || document.createElement('canvas'); tmp.width = W; tmp.height = H; const t = tmp.getContext('2d'); t.clearRect(0, 0, W, H); return t; }
  /* draw a look on a canvas. view: 'full' (whole hero), 'portrait' (head and shoulders on a coloured background),
     'head' (just the head, for the face/hair buttons) */
  G.drawHero = function (canvas, look, view = 'full', frame) {
    if (look && look.portrait && G.hasPortrait && G.hasPortrait(look.portrait))   // a hero from the portrait picker (portraitView.js)
      return G.drawPortrait(canvas, look, view === 'full' ? 'bust' : view === 'head' ? 'tile' : view, frame);
    const a = A(), x = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    x.clearRect(0, 0, W, H);
    if (!a) return;
    let sx = 0, sy = 0, sw = a.w, sh = a.h;
    if (view === 'portrait') {
      const [c1, c2] = COLOURS[look.colour] || COLOURS.red;
      const g = x.createRadialGradient(W / 2, H * 0.45, W * 0.1, W / 2, H / 2, W * 0.75);
      g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, W, H);
      sx = a.w / 2 - 160; sy = (a.pad || 0) - 22; sw = 320; sh = 320 * H / W;   // fits any frame shape (wider = less body)
    } else if (view === 'head' || view === 'tile') {   // tile: a closer crop for the creator's face / hair / hat buttons
      const [l, t, r, b] = a.faceBox, side = (r - l) * (view === 'tile' ? 1.2 : 1.45);
      sx = (l + r) / 2 - side / 2; sy = t - side * (view === 'tile' ? 0.24 : 0.3); sw = sh = side;
    }
    x.imageSmoothingEnabled = true;
    const p = parts(look), img = (src) => { const i = src && load(src); return i && i.ready ? i : null; };
    const draw = (ctx, i) => i && ctx.drawImage(i, sx, sy, sw, sh, 0, 0, W, H);
    const head = img(p.head), neck = img(p.neck);
    draw(x, head); draw(x, img(p.body));                 // the head under the body (its neck goes down behind the collar)...
    const cut = (layer, shape) => {                      // draw a layer cut to a shape (destination-in)
      const t = scratch(W, H); draw(t, layer);
      t.globalCompositeOperation = 'destination-in'; draw(t, shape); t.globalCompositeOperation = 'source-over';
      x.drawImage(tmp, 0, 0);
    };
    if (head && neck) cut(head, neck);                   // ...and again on top, cut to the face and the bit of neck above the collar's front
    const hair = img(p.hair), clip = img(p.clip);
    if (hair) { if (p.hat && clip) cut(hair, clip); else draw(x, hair); }   // under a hat, hair stays inside the head's outline
    draw(x, img(p.hat));
  };
})();
