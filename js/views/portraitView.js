/* VIEW — Hero portraits (portraitArt.js, made by tools-src/prepare_portraits.py) and their faces.
   A portrait look is { cls, portrait, tint }: cls = the deck you play, portrait = which hero, tint = 'orig' | 'red' | 'green' | 'blue'
   (the colour of his cape, hat or scarf). The strip holds the frames base, half, blink, grin, laugh, hurt.
   Recolouring happens on a canvas once per hero and colour (the mask strip says which part): the colour is laid over that
   part with the 'color' blend, so its folds and shading stay, then darkened a little so red stays red, not pink.
   Faces: G.heroFace('grin' | 'laugh' | 'hurt') shows one for a moment; between those the hero blinks every few seconds. */
(function () {
  const A = () => G.PORTRAIT_ART;
  const imgs = {}, strips = {};
  G.TINTS = { red: { c: '#e0302a', dark: '#c8bcbc', name: 'Red' }, green: { c: '#2fa83a', dark: '#c4cbc4', name: 'Green' },
    blue: { c: '#2f6ae8', dark: '#c6c8d6', name: 'Blue' } };
  const FACE_MS = { grin: 900, laugh: 1600, hurt: 650 };

  function load(src) {
    if (!imgs[src]) { const i = new Image(); i.onload = () => { i.ready = true; G.redrawHeroes && G.redrawHeroes(); }; i.src = src; imgs[src] = i; }
    return imgs[src];
  }
  G.loadPortraits = function () { const a = A(); if (!a) return; for (const id in a.heroes) { load(a.heroes[id].src); load(a.heroes[id].mask); } };
  G.hasPortrait = (id) => !!(A() && A().heroes[id]);
  G.portraitsOf = (deck) => (A() ? Object.keys(A().heroes).filter((id) => A().heroes[id].deck === deck) : []);
  /* the colour shown for a look: its tint, or the hero's own colour */
  G.lookColour = function (look) {
    if (look && look.portrait && G.hasPortrait(look.portrait)) return look.tint && G.TINTS[look.tint] ? G.TINTS[look.tint].c : A().heroes[look.portrait].swatch;
    return G.HERO_COLOURS[(look && look.colour) || 'red'][0];
  };

  /* the strip of frames in a colour (a canvas, made once) */
  function strip(id, tint) {
    const key = id + ':' + tint; if (strips[key]) return strips[key];
    const h = A().heroes[id], s = load(h.src), m = load(h.mask);
    if (!s.ready || (tint !== 'orig' && !m.ready)) return null;
    const c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
    const x = c.getContext('2d'); x.drawImage(s, 0, 0);
    const T = G.TINTS[tint];
    if (T) {
      const p = document.createElement('canvas'); p.width = s.width; p.height = s.height;
      const px = p.getContext('2d');
      const layer = (fill, mode) => {                    // the colour part, filled with one colour, laid over the picture
        px.globalCompositeOperation = 'source-over'; px.clearRect(0, 0, p.width, p.height); px.drawImage(m, 0, 0);
        px.globalCompositeOperation = 'source-in'; px.fillStyle = fill; px.fillRect(0, 0, p.width, p.height);
        x.globalCompositeOperation = mode; x.drawImage(p, 0, 0);
      };
      layer(T.c, 'color'); layer(T.dark, 'multiply');
      x.globalCompositeOperation = 'destination-in'; x.drawImage(s, 0, 0);   // keep the picture's own outline
      x.globalCompositeOperation = 'source-over';
    }
    return (strips[key] = c);
  }

  /* draw a portrait look: view 'portrait' (on a coloured background, filling the frame), 'tile' (a picker button),
     'bust' (no background); frame = one of the strip's frames */
  G.drawPortrait = function (canvas, look, view = 'portrait', frame = 'base') {
    const a = A(), x = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    x.clearRect(0, 0, W, H);
    if (!a || !a.heroes[look.portrait]) return;
    if (view !== 'bust') {
      const col = G.lookColour(look), g = x.createRadialGradient(W / 2, H * 0.42, W * 0.08, W / 2, H / 2, W * 0.8);
      g.addColorStop(0, shade(col, 0.55)); g.addColorStop(1, shade(col, -0.55)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
    const s = strip(look.portrait, look.tint || 'orig'); if (!s) return;
    const S = a.size, k = Math.max(0, a.frames.indexOf(frame));
    // cover the frame: the full width, the top of the picture kept (helmets, hats and plumes)
    const sc = Math.max(W / S, H / S), w = S * sc, h = S * sc;
    x.imageSmoothingEnabled = true;
    x.drawImage(s, k * S, 0, S, S, (W - w) / 2, view === 'tile' ? 0 : -(h - H) * 0.25, w, h);
  };
  function shade(hex, t) {                               // lighter (t > 0) or darker (t < 0)
    const n = parseInt(hex.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const f = (v) => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t));
    return `rgb(${c.map(f).join(',')})`;
  }

  /* ---------- faces: blinking, and a grin / laugh / ouch for a moment ---------- */
  const face = { frame: 'base', until: 0, timer: 0, blinkAt: 0 };
  G.faceFrame = () => face.frame;
  function show(frame) { face.frame = frame; G.redrawFaces && G.redrawFaces(); }
  G.heroFace = function (kind) {
    const look = G.screen === 'classSelect' ? { portrait: 1 } : G.heroLook && G.state && G.heroLook();
    if (!look || !look.portrait || !FACE_MS[kind]) return;
    if (face.frame === 'hurt' && kind !== 'hurt' && performance.now() < face.until) return;   // an ouch is not cut short by a grin
    clearTimeout(face.timer); show(kind);
    face.until = performance.now() + FACE_MS[kind];
    face.timer = setTimeout(() => show('base'), FACE_MS[kind]);
    face.blinkAt = performance.now() + FACE_MS[kind] + 1500;
  };
  function blink() {
    if (face.frame !== 'base') return;
    const seq = [['half', 0], ['blink', 55], ['half', 165], ['base', 220]];
    for (const [f, t] of seq) setTimeout(() => { if (face.frame === 'base' || face.frame === 'half' || face.frame === 'blink') show(f); }, t);
  }
  G.blinkTick = function (now) {                         // main loop: blink every 3 to 6 seconds
    if (!face.blinkAt) face.blinkAt = now + 3000;
    if (now < face.blinkAt) return;
    face.blinkAt = now + 3000 + Math.random() * 3000;
    if (Math.random() < 0.18) setTimeout(blink, 330);    // now and then a double blink
    blink();
  };
})();
