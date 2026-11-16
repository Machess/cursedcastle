/* CONTROLLER — Choosing your hero (2.18: the portrait picker; before that a creator that built a hero from parts).
   A row of hero portraits per deck (the class whose cards you play), a colour for his cape, hat or scarf, your name and
   the puzzle level. Layout and background come from the design (views/creatorArt.js, tools-src/prepare_creator.py);
   the portraits from views/portraitArt.js. A deck with no portraits yet shows its old part-built hero instead. */
(function () {
  const ui = G.ui;
  const LEVELS = [[1, 'Age 6–7', 'adding & counting'], [2, 'Age 8–9', 'bigger sums & halves'], [3, 'Age 10+', 'times & sharing']];
  const TINTS = ['orig', 'red', 'green', 'blue'];
  const SILLY = ['Sir Biscuit', 'Captain Wobble', 'Pickle', 'Sir Noodle', 'Tiny Thunder', 'Bean', 'Sparky', 'Muffin', 'Sir Sprout', 'Turbo', 'Waffles', 'Captain Crumb', 'Ziggy', 'Pebble', 'Sir Socks'];
  const DECKS = ['warrior', 'rogue', 'wizard'];
  let hero = null, tint = 'orig', level = 2, look = null;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const L = () => G.CREATOR_UI;
  const P = () => G.PORTRAIT_ART && G.PORTRAIT_ART.heroes;
  const place = (e, [x, y, w, h]) => { Object.assign(e.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); return e; };
  /* the heroes of a deck: its portraits, or its old part-built hero until they are drawn */
  const heroesOf = (deck) => { const p = G.portraitsOf(deck); return (p.length ? p : [null]).map((id) => ({ cls: deck, portrait: id })); };
  const allHeroes = () => DECKS.flatMap(heroesOf);
  const same = (a, b) => a && b && a.cls === b.cls && a.portrait === b.portrait;
  function lookFor(h, t) {
    if (h.portrait) return { cls: h.cls, portrait: h.portrait, tint: t };
    const d = G.DEFAULT_LOOKS[h.cls]; return Object.assign({}, d, { colour: t === 'orig' ? d.colour : t });
  }
  const swatchOf = (h) => (h.portrait ? P()[h.portrait].swatch : G.HERO_COLOURS[G.DEFAULT_LOOKS[h.cls].colour][0]);

  function build() {
    const box = ui.$('crOptions'); box.innerHTML = '';
    const K = L().pick;
    DECKS.forEach((deck, r) => {
      const c = G.CLASSES[deck];
      const lab = place(ui.el('div', 'cr-deck'), K.labels[r]); lab.innerHTML = `<img src="${L().icons[deck]}" alt=""><b>${c.name}</b><small>${c.title}</small>`; box.appendChild(lab);
      heroesOf(deck).slice(0, 6).forEach((h, i) => {
        const b = place(ui.el('button', 'cr-opt hero'), K.tiles[r][i]); b.dataset.deck = deck; b.dataset.id = h.portrait || '';
        const cv = document.createElement('canvas'); cv.width = cv.height = 150;
        b.append(cv, ui.el('span', 'lb', h.portrait ? P()[h.portrait].title : c.name));
        ui.tap(b, () => { hero = h; refresh(); G.heroFace('grin'); });
        box.appendChild(b);
      });
    });
    for (const rule of K.rules) box.appendChild(place(ui.el('div', 'cr-rule'), rule));
    const cl = place(ui.el('div', 'cr-deck row'), K.colourLabel);
    cl.innerHTML = `<img src="${L().icons['row-colour']}" alt=""><b>Colour</b>`; box.appendChild(cl);
    TINTS.forEach((t, i) => {
      const b = place(ui.el('button', 'cr-opt'), K.colour[i]); b.dataset.k = 'tint'; b.dataset.v = t;
      b.innerHTML = `<span class="sw"></span><span class="lb">${t === 'orig' ? 'His own' : G.TINTS[t].name}</span>`;
      ui.tap(b, () => { tint = t; refresh(); });
      box.appendChild(b);
    });
    LEVELS.forEach(([id, name, extra], i) => {
      const b = place(ui.el('button', 'cr-opt lvl'), L().rows.level[i]); b.dataset.k = 'level'; b.dataset.v = id;
      b.innerHTML = `<b>${name}</b><small>${extra}</small>`;
      ui.tap(b, () => { level = id; refresh(); });
      box.appendChild(b);
    });
    place(ui.$('crInfo'), K.info);
    for (const [id, spot] of [['crName', 'nameBox'], ['crClsName', 'clsName'], ['crStats', 'stats'], ['crPerks', 'perks'], ['crEmblem', 'emblem'],
      ['crPrev', 'prev'], ['crNext', 'next'], ['crDice', 'dice'], ['btnBackMenu', 'back'], ['btnStart', 'start']]) place(ui.$(id), L().spots[spot]);
  }
  function refresh() {
    look = lookFor(hero, tint);
    document.querySelectorAll('#creator .cr-opt').forEach((b) => {
      if (b.classList.contains('hero')) {
        const h = { cls: b.dataset.deck, portrait: b.dataset.id || null };
        b.classList.toggle('sel', same(h, hero));
        G.drawHero(b.querySelector('canvas'), lookFor(h, tint), h.portrait ? 'tile' : 'head');
        return;
      }
      const v = b.dataset.k === 'level' ? level : tint;
      b.classList.toggle('sel', String(v) === b.dataset.v);
      if (b.dataset.k === 'tint') b.querySelector('.sw').style.background = b.dataset.v === 'orig' ? swatchOf(hero) : G.TINTS[b.dataset.v].c;
    });
    const isP = !!look.portrait;
    ui.$('crBustBox').classList.toggle('hidden', !isP); ui.$('crPreview').classList.toggle('hidden', isP);
    if (isP) G.drawPortrait(ui.$('crBust'), look, 'portrait', G.faceFrame()); else G.drawHero(ui.$('crPreview'), look, 'full');
    const c = G.CLASSES[look.cls], I = G.ICON_ART || {};
    const title = isP ? P()[look.portrait].title : c.name;
    ui.$('crHeroTitle').textContent = isP ? title : '';
    ui.$('crInfo').innerHTML = `<b>${title}</b><span>Plays with the ${c.name} cards${isP ? ` · The colour is his ${P()[look.portrait].part}` : ''}</span>`;
    const ic = (k) => (I[k] ? `<img src="${I[k]}" alt="">` : '');
    ui.$('crClsName').innerHTML = `<img src="${L().icons[look.cls]}" alt="">${c.name}`;
    ui.$('crStats').innerHTML = `<span>${ic('heart')}${c.hp}</span><span>${ic('energy')}${c.energy}</span><span>${ic('deck')}${c.hand} cards</span>`;
    ui.$('crPerks').innerHTML = c.perks.map((p) => `<div class="good">${p}</div>`).join('') + c.weak.map((p) => `<div class="bad">${p}</div>`).join('');
    ui.$('crEmblem').src = L().icons[look.cls];
  }
  function step(d) { const all = allHeroes(), i = all.findIndex((h) => same(h, hero)); hero = all[(i + d + all.length) % all.length]; refresh(); }
  G.redrawHeroes = () => { if (G.screen === 'classSelect' && hero) refresh(); if (G.screen === 'game') ui.renderHero(); };
  G.redrawFaces = () => {                              // a blink or a grin: only the portrait is drawn again
    if (G.screen === 'classSelect' && look && look.portrait) G.drawPortrait(ui.$('crBust'), look, 'portrait', G.faceFrame());
    if (G.screen === 'game' && G.state) G.drawHero(ui.$('hcImg'), G.heroLook(), 'portrait', G.faceFrame());
  };
  let blinker = 0;
  G.showClassSelect = function () {
    G.setScreen('classSelect');
    hero = pick(allHeroes()); tint = 'orig';
    build();
    ui.$('crName').value = '';
    refresh();
    clearInterval(blinker); blinker = setInterval(() => { if (G.screen !== 'classSelect') clearInterval(blinker); else G.blinkTick(performance.now()); }, 50);
  };
  G.bindMenu = function () {
    G.loadHeroParts(); G.loadPortraits();
    ui.tap(ui.$('crDice'), () => { ui.$('crName').value = pick(SILLY); });
    ui.tap(ui.$('crPrev'), () => step(-1));
    ui.tap(ui.$('crNext'), () => step(1));
    ui.$('crName').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
    ui.tap(ui.$('btnStart'), () => {
      const name = ui.$('crName').value.replace(/[<>&"]/g, '').trim().slice(0, 14);
      G.newGame(look.cls, level, Object.assign({}, look), name);
      G.introGoodbye(() => G.zoomToGate(() => G.enterGame(true)));
    });
    ui.tap(ui.$('btnBackMenu'), () => G.toMenu());
  };
})();
