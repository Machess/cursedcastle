/* Billboard sprites: monster curse bubbles, objects and props (all drawn from the game art). */
(function () {
  const SPR = {};
  G.SPR = SPR;

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function silhouette(src) {
    const c = canvas(src.width, src.height), x = c.getContext('2d');
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function finish(c, w, h, z) { return { c, sil: silhouette(c), w, h, z }; }
  /* a sprite that is only drawn the first time something asks for it (keeps the start-up fast:
     battle poses and room props are made when that battle or room first needs them) */
  const waiting = [];
  function lazy(key, make) {
    waiting.push(key);
    const fix = (v) => { Object.defineProperty(SPR, key, { value: v, writable: true, configurable: true, enumerable: true }); return v; };
    Object.defineProperty(SPR, key, { configurable: true, enumerable: true, get: () => fix(make()), set: fix });
  }



  function chestSprite() {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(64, 118, 46, 8, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#7a4b25'; x.fillRect(22, 62, 84, 52); x.fillStyle = '#9a6235';
    x.beginPath(); x.moveTo(22, 64); x.quadraticCurveTo(64, 30, 106, 64); x.fill();
    x.fillStyle = '#e0b040'; x.fillRect(22, 70, 84, 6); x.fillRect(58, 66, 12, 18); x.fillRect(22, 108, 84, 5);
    x.fillStyle = '#5a3010'; x.fillRect(62, 74, 4, 6);
    return finish(c, 0.6, 0.6, 0);
  }

  function armorSprite() { // Sir Sneezalot, a friendly dusty suit of armour
    const c = canvas(128, 192), x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.ellipse(64, 184, 36, 7, 0, 0, Math.PI * 2); x.fill();
    const steel = '#a9b0bf', dark = '#6c7282';
    x.fillStyle = dark; x.fillRect(44, 132, 16, 50); x.fillRect(68, 132, 16, 50);
    x.fillStyle = steel; x.fillRect(40, 176, 22, 8); x.fillRect(66, 176, 22, 8);
    x.fillStyle = steel; x.fillRect(36, 70, 56, 68);
    x.fillStyle = dark; x.fillRect(36, 124, 56, 8);
    x.fillStyle = steel; x.fillRect(18, 76, 18, 50); x.fillRect(92, 76, 18, 50);
    x.beginPath(); x.arc(64, 44, 28, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#c0392b'; x.beginPath(); x.moveTo(60, 14); x.quadraticCurveTo(40, -2, 70, 4); x.quadraticCurveTo(76, 10, 66, 18); x.fill();
    x.fillStyle = '#20232b'; x.fillRect(42, 38, 44, 7); x.fillRect(42, 50, 44, 3);
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(54, 41, 3, 0, Math.PI * 2); x.arc(74, 41, 3, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#e0b040'; x.beginPath(); x.arc(64, 98, 9, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(200,190,160,0.5)'; for (let i = 0; i < 26; i++) x.fillRect(30 + Math.random() * 70, 20 + Math.random() * 150, 2, 2);
    return finish(c, 0.55, 0.85, 0);
  }

  function bubbleSprite(img, freed) {
    const s = 256, c = canvas(s, s), x = c.getContext('2d');
    const r = 104;
    x.save(); x.beginPath(); x.arc(128, 128, r, 0, Math.PI * 2); x.clip();
    x.drawImage(img, 128 - r, 128 - r, r * 2, r * 2);
    if (!freed) { x.fillStyle = 'rgba(150,60,220,0.28)'; x.fillRect(0, 0, s, s); }
    x.restore();
    if (!freed) {
      const g = x.createRadialGradient(128, 128, r * 0.7, 128, 128, r + 14);
      g.addColorStop(0, 'rgba(190,120,255,0)'); g.addColorStop(0.75, 'rgba(190,120,255,0.55)'); g.addColorStop(1, 'rgba(120,40,200,0)');
      x.fillStyle = g; x.beginPath(); x.arc(128, 128, r + 14, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(230,190,255,0.9)'; x.lineWidth = 4; x.beginPath(); x.arc(128, 128, r + 2, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 7; x.lineCap = 'round';
      x.beginPath(); x.arc(128, 128, r - 14, Math.PI * 1.1, Math.PI * 1.45); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(70, 96, 6, 0, Math.PI * 2); x.fill();
    } else {
      x.strokeStyle = '#f2c94c'; x.lineWidth = 6; x.beginPath(); x.arc(128, 128, r + 1, 0, Math.PI * 2); x.stroke();
    }
    return finish(c, 0.82, 0.82, 0.12);
  }

  /* a cursed monster standing inside its purple curse bubble (full-body art from monsterArt.js).
     Canvas = 1 x 1 world unit; the bubble rests on the floor with the monster at the bottom of it. */
  /* how tall each cursed friend is in the castle, compared with a wall (one storey): a mouse is knee-high, the troll's
     head touches the ceiling. Their bubble grows or shrinks to fit them. In a battle they are drawn at the size they
     always had (renderer.js: roomK), so the battle screen stays the same. */
  G.FRIEND_SIZE = { rat: 0.32, spider: 0.46, goblin: 0.56, wolf: 0.66, skeleton: 0.82, archer: 0.85, wizard: 0.84, knight: 0.88, troll: 1.0 };
  const sizeK = (id, art) => (G.FRIEND_SIZE[id] ? G.FRIEND_SIZE[id] / art.h : 1);
  function bubbleAround(img, art, k) {
    k = k || 1;
    const S = 512, c = canvas(S, S), x = c.getContext('2d');
    const cx = S / 2, cy = S / 2, r = S / 2 - 12, foot = S - 22;
    const fw = art.w * S, fh = art.h * S;
    const gx = x.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    gx.addColorStop(0, 'rgba(200,150,255,0.10)'); gx.addColorStop(1, 'rgba(160,90,240,0.30)');
    x.fillStyle = gx; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    x.drawImage(img, cx - fw / 2, foot - fh + art.groundGap * S, fw, fh);
    x.save(); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(150,70,230,0.16)'; x.fillRect(0, 0, S, S); x.restore();
    const rim = x.createRadialGradient(cx, cy, r * 0.82, cx, cy, r + 10);
    rim.addColorStop(0, 'rgba(190,120,255,0)'); rim.addColorStop(0.8, 'rgba(200,140,255,0.6)'); rim.addColorStop(1, 'rgba(120,40,200,0)');
    x.fillStyle = rim; x.beginPath(); x.arc(cx, cy, r + 10, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(235,200,255,0.95)'; x.lineWidth = 6; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 12; x.lineCap = 'round';
    x.beginPath(); x.arc(cx, cy, r - 30, Math.PI * 1.1, Math.PI * 1.42); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.9)'; x.beginPath(); x.arc(cx - r * 0.5, cy - r * 0.42, 11, 0, Math.PI * 2); x.fill();
    return Object.assign(finish(c, k, k, 0), { roomK: k });
  }
  function standing(img, art, k) {
    k = k || 1;
    const c = canvas(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0);
    return Object.assign(finish(c, art.w * k, art.h * k, -art.groundGap * k), { roomK: k });
  }


  /* the band on one canvas: Boney, Tibia, Ribs left to right; the one in the spotlight (front) a bit bigger,
     with a golden spotlight under him. While cursed each has a purple glow at his feet. */
  G.bandSprite = function (poses, front, freed) {
    const A = G.BAND_ART, ids = ['boney', 'tibia', 'ribs'], H = 340, gap = -10;
    const ws = ids.map((id) => A.members[id].w), W = ws.reduce((a, b) => a + b, 0) + gap * 2 + 40;
    const c = canvas(W, H), x = c.getContext('2d'); let px = 20;
    ids.forEach((id, i) => {
      const img = G.BAND_IMGS[id + '-' + poses[i]] || G.BAND_IMGS[id + '-idle'], w = ws[i], cx = px + w / 2;
      const s = i === front ? 1.08 : front >= 0 ? 0.9 : 1;
      const glow = x.createRadialGradient(cx, H - 18, 4, cx, H - 18, w * 0.55);
      if (i === front) { glow.addColorStop(0, 'rgba(255,225,120,0.75)'); glow.addColorStop(1, 'rgba(255,200,80,0)'); }
      else if (!freed) { glow.addColorStop(0, 'rgba(190,110,255,0.5)'); glow.addColorStop(1, 'rgba(150,60,230,0)'); }
      else { glow.addColorStop(0, 'rgba(0,0,0,0)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); }
      x.fillStyle = glow; x.beginPath(); x.ellipse(cx, H - 18, w * 0.55, 22, 0, 0, Math.PI * 2); x.fill();
      if (img) { const iw = img.width * s, ih = img.height * s; x.drawImage(img, cx - iw / 2, H - 8 - ih, iw, ih); }
      px += w + gap;
    });
    const k = 0.95 / H;                                  // world units per pixel
    return finish(c, W * k, H * k, 0);
  };

  /* after the title appears, make the rest a few at a time in the background */
  G.warmSprites = function () {
    const next = () => { const k = waiting.shift(); if (!k) return; void SPR[k]; setTimeout(next, 30); };
    setTimeout(next, 1500);
  };
  G.buildSprites = function (images) {
    SPR.chest = chestSprite();
    SPR.armor = armorSprite();
    // Sir Sneezalot art (js/views/npcArt.js): idle + 4 sneeze frames on one shared canvas
    const art = G.NPC_ART && G.NPC_ART.sneezalot;
    const fromImg = (img) => { const c = canvas(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); return finish(c, art.w, art.h, -art.groundGap); };
    if (art && images.npc_sneezalot_idle) {
      SPR.armor = fromImg(images.npc_sneezalot_idle);
      SPR.sneeze = [1, 2, 3, 4].map((i) => images['npc_sneezalot_s' + i]).filter(Boolean).map(fromImg);
    }
    for (const id in G.MONSTERS) {
      const img = images['mon_' + id];
      if (!img) continue;
      SPR['mon_' + id] = bubbleSprite(img, false);
      SPR['free_' + id] = bubbleSprite(img, true);
    }
    // monsters with full art: every battle frame inside the bubble, and the freed monster standing on its own
    for (const id in (G.MONSTER_ART || {})) {
      const art = G.MONSTER_ART[id], f = (k) => images['mart_' + id + '_' + k];
      if (!f('idle')) continue;
      const wrap = art.noBubble ? standing : bubbleAround;   // the Witch IS the curse: no bubble around her
      const sk = sizeK(id, art);                            // their own size (G.FRIEND_SIZE)
      lazy('mon_' + id, () => Object.assign(wrap(f('idle'), art, sk), { hasArt: true }));
      for (const k in art.frames) if (k !== 'idle' && k !== 'freed' && f(k)) lazy('mon_' + id + '_' + k, () => wrap(f(k), art, sk));
      if (f('freed')) lazy('free_' + id, () => standing(f('freed'), art, sk));
      else if (art.noBubble) delete SPR['free_' + id];      // never freed: she escapes instead
    }
    // room props (js/views/roomArt.js): pictures standing on the floor, sized in world units
    for (const k in (G.PROP_ART || {})) {
      const img = images['prop_' + k]; if (!img) continue;
      lazy('prop_' + k, () => {
        const pc = canvas(img.width, img.height); pc.getContext('2d').drawImage(img, 0, 0);
        return finish(pc, G.PROP_ART[k].w, G.PROP_ART[k].h, G.PROP_ART[k].z || 0);   // z > 0: hangs from the ceiling
      });
    }
    // things lying on the floor to pick up: their bag picture, small, with a soft glow under it
    for (const k of ['cheese', 'pepper', 'bubble', 'biscuit', 'ribbon', 'broombutton', 'tidypage']) {   // and the things a shaggy dog drops (cleaning.js)
      const img = images['icon_' + k]; if (!img) continue;
      const c2 = canvas(128, 128), x2 = c2.getContext('2d');
      const gl = x2.createRadialGradient(64, 108, 4, 64, 108, 50); gl.addColorStop(0, 'rgba(255,230,120,.75)'); gl.addColorStop(1, 'rgba(255,230,120,0)');
      x2.fillStyle = gl; x2.beginPath(); x2.ellipse(64, 110, 54, 16, 0, 0, Math.PI * 2); x2.fill();
      x2.drawImage(img, 22, 14, 84, 84);
      SPR['pick_' + k] = finish(c2, 0.3, 0.3, 0);
    }
    // the sparkle that floats over things you can use
    const c = canvas(64, 64), x = c.getContext('2d');
    if (images.icon_sparkle) x.drawImage(images.icon_sparkle, 0, 0, 64, 64);
    else { x.fillStyle = 'rgba(255,220,80,0.6)'; x.beginPath(); x.arc(32, 32, 20, 0, Math.PI * 2); x.fill(); }
    SPR.sparkle = finish(c, 0.22, 0.22, 0.75);
    // the Bone Band (vaultArt.js): three musicians drawn together, rebuilt whenever someone changes pose
    G.BAND_IMGS = {}; for (const k in images) if (k.startsWith('band_')) G.BAND_IMGS[k.slice(5)] = images[k];
    if (G.BAND_ART && G.BAND_IMGS['boney-idle']) {
      SPR.mon_band = G.bandSprite(['idle', 'idle', 'idle'], 0); SPR.mon_band.hasArt = true;
      SPR.free_band = G.bandSprite(['freed', 'freed', 'freed'], -1, true);
    }
  };
})();
