/* APP — Boot, screen scaling, screens, main render loop, small effects system. Loaded last. */
(function () {
  const ui = G.ui;
  G.VERSION = '2.30.0';
  ui.$('ver').textContent = G.VERSION;

  /* ---------- fit 1280x800 design onto any screen ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
    G.scale = s;
    const app = ui.$('app');
    app.style.transform = `scale(${s})`;
    app.style.left = (window.innerWidth - 1280 * s) / 2 + 'px';
    app.style.top = (window.innerHeight - 800 * s) / 2 + 'px';
  }
  window.addEventListener('resize', fit); fit();

  /* ---------- screens ---------- */
  G.screen = 'menu';
  G.setScreen = function (name) {
    G.screen = name;
    for (const id of ['menu', 'intro', 'classSelect', 'game']) ui.$(id).classList.toggle('hidden', id !== name);
    if (name === 'menu') G.menuStart(); else G.menuStop();
  };
  G.toMenu = function () {
    if (G.state) G.save();
    if (G.combat) { G.combat = null; }
    ui.closeModal();
    G.refreshTitle();
    G.setScreen('menu');
  };
  G.enterGame = function (fresh) {
    G.setScreen('game');
    G.lockInput = false; G.cam.look = 0; G.cam.bob = 0;          // never carry a half-finished trip into a game
    ui.$('stairFx').className = ''; ui.$('sfFade').style.opacity = 0;
    ui.$('game').classList.remove('battle'); G.ui.$('textbox').classList.remove('combat'); ui.$('hand').classList.add('hidden');
    ui.$('navPad').classList.remove('hidden'); ui.$('combatPad').classList.add('hidden'); ui.$('monHud').classList.add('hidden');
    G.dirty = true;
    if (fresh) {
      G.lastRegion = 'O'; G.state.visited.O = 1; ui.setRoomName(G.ROOMS.O.name);
      setTimeout(() => ui.roomBanner('O', true), 700);
      ui.say('Castle Gate', 'BOOM! Thunder rolls over Moonstone Castle. Wanda the Witch has cursed everyone inside! Walk up to the gate with the forward arrow and break its rune lock.', []);
      G.lightning(true);
    } else { G.lastRegion = null; G.arrived(); }
  };

  /* ---------- tiny effects system (sprite wobbles, pops) ---------- */
  const fx = [];
  G.addFx = function (dur, step, end) { fx.push({ t0: performance.now(), dur, step, end }); };
  function runFx(now) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i], k = Math.min(1, (now - f.t0) / f.dur); f.step(k);
      if (k >= 1) { fx.splice(i, 1); f.end && f.end(); }
    }
    return fx.length > 0;
  }

  /* ---------- Sir Sneezalot's sneeze ---------- */
  let nextIdleSneeze = performance.now() + 15000;
  G.sneeze = function () {
    const t = G.things && G.things.find((q) => q.id === 'sneezalot');
    const frames = G.SPR.sneeze; if (!t || !frames || frames.length < 4 || t.sneezing) return;
    t.sneezing = true;
    const steps = [[0, 0], [1, 260], [2, 600], [3, 1050], [-1, 1750]];   // [frame, start ms]; -1 = back to idle
    for (const [f, at] of steps) setTimeout(() => {
      t.spr = f < 0 ? G.SPR.armor : frames[f]; G.dirty = true;
      if (f === 2 && G.screen === 'game') {
        const sv = ['sneezalot-sneeze-1', 'sneezalot-sneeze-2', 'sneezalot-sneeze-4'].filter((v) => G.voice && G.voice.has(v));
        if (G.voice && G.voice.playing()) { /* he is talking: his lines have their own ACHOOs */ }
        else if (sv.length) G.voice.say(G.pick(sv)); else G.audio.sneeze();   // his recorded sneezes (when there are)
      }
      if (f < 0) t.sneezing = false;
    }, at);
  };
  function idleSneeze(now) {
    if (now < nextIdleSneeze) return;
    nextIdleSneeze = now + 18000 + Math.random() * 20000;
    if (G.world.region[G.idx(G.state.x, G.state.y)] === 'E' && !G.busy()) G.sneeze();
  }

  /* ---------- lightning outside the castle ---------- */
  let nextLightning = 0;
  G.lightning = function (now) {
    G.renderer.flash = 1; ui.flash(0.55); G.audio.thunder(0.3); G.dirty = true;
  };

  /* ---------- main loop ---------- */
  let lastIdle = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (G.screen !== 'game' || !G.world) return;
    let moving = G.updateAnim(now);
    moving = G.updateDoors(now) || moving;
    moving = runFx(now) || moving;
    moving = G.updateLean(now) || moving;
    const r = G.renderer;
    // outdoors: lightning from time to time
    idleSneeze(now);
    const reg = G.world.region[G.idx(G.state.x, G.state.y)];
    if (reg === 'O') { if (now > nextLightning) { nextLightning = now + 3500 + Math.random() * 5000; G.lightning(); } }
    if (r.flash > 0) { r.flash = Math.max(0, r.flash - 0.04); moving = true; }
    if (G.animLights) G.animLights(now);            // flickering torches (wallAnim.js)
    if (G.cleanTick && G.cleanTick(now)) moving = true;   // Mildred walking about, sparkles (cleaning.js)
    if (G.blinkTick) G.blinkTick(now);                    // the hero's portrait blinks now and then (portraitView.js)
    // gentle floating bob for curse bubbles
    const t = now / 1000;
    for (const th of G.things) { if (th.kind === 'monster' && !th.hidden) th.bob = (G.MONSTER_ART && G.MONSTER_ART[th.id] && G.MONSTER_ART[th.id].noBubble && !th.hover) ? 0 : Math.sin(t * 2 + th.x) * 0.04; if (th.kind === 'spark') th.bob = Math.sin(t * 3 + th.y) * 0.05; if (th.kind === 'pickup') th.bob = 0.03 + Math.sin(t * 3.5 + th.x) * 0.03; }
    if (moving || G.dirty || now - lastIdle > 66) {
      lastIdle = now; G.dirty = false;
      r.render(G.cam, G.things);
      ui.drawMinimap();
    }
  }


  /* ---------- boot ---------- */
  function loadImage(src) {
    // decode() unpacks the picture off the main thread, so drawing it later (buildSprites) does not freeze the start
    return new Promise((res) => { const i = new Image(); i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(() => res(i)); i.onerror = () => res(null); i.src = src; });
  }
  async function boot() {
    // everything loads at once; the bar on the title screen fills as pictures arrive
    let total = 0, done = 0;
    const bar = ui.$('mlFill'), tick = () => { done++; if (bar) bar.style.width = Math.max(3, Math.round(done / total * 100)) + '%'; };
    const imgs = {};
    const want = (key, src) => { total++; return loadImage(src).then((i) => { if (key) imgs[key] = i; tick(); }); };
    G.buildTextures();
    const jobs = [G.loadArtTextures()];
    for (const id in G.MONSTERS) jobs.push(want('mon_' + id, G.MONSTERS[id].img));
    for (const id in (G.MONSTER_ART || {})) { const fr = G.MONSTER_ART[id].frames; for (const k in fr) jobs.push(want('mart_' + id + '_' + k, fr[k])); }
    const sz = G.NPC_ART && G.NPC_ART.sneezalot;
    if (sz) { jobs.push(want('npc_sneezalot_idle', sz.idle)); sz.sneeze.forEach((src, k) => jobs.push(want('npc_sneezalot_s' + (k + 1), src))); }
    if (G.BAND_ART) for (const m in G.BAND_ART.members) for (const f in G.BAND_ART.members[m].frames) jobs.push(want('band_' + m + '-' + f, G.BAND_ART.members[m].frames[f]));
    for (const k in (G.ICON_ART || {})) jobs.push(want('icon_' + k, G.ICON_ART[k]));
    for (const k in (G.PROP_ART || {})) jobs.push(want('prop_' + k, G.PROP_ART[k].src));
    for (const k in (G.CARD_ART || {})) jobs.push(want(null, G.CARD_ART[k]));          // warm the cache so cards never pop in blank
    if (G.INTRO_ART) for (const k in G.INTRO_ART.pip) jobs.push(want(null, G.INTRO_ART.pip[k]));   // no blank Pip
    for (const k of ['plaque', 'hpbar', 'intent-red', 'intent-blue', 'pill', 'btn-gold', 'btn-purple', 'btn-red', 'btn-green', 'btn-gold-down', 'btn-purple-down', 'btn-red-down', 'btn-green-down',
      'num', 'num-right', 'num-wrong', 'close', 'strip', 'ribbon', 'badge', 'scroll', 'note', 'coin', 'coin-empty', 'shield', 'goldnote', 'treasure', 'star'])
      jobs.push(want(null, `assets/img/ui/kit/${k}.webp`));              // the UI kit (css/kit.css)
    await Promise.all(jobs);
    G.buildSprites(imgs);
    G.layoutGame();      // the game screen's parts go where the design drew them (views/gameLayout.js)
    G.renderer = new G.Renderer(ui.$('view'));
    G.audio.setOn(G.settings.sound);
    G.bindInput(); G.bindCombat(); G.bindMenu(); G.bindIntro();
    G.bindProfiles();     // New Adventure / Play + the hero chooser (controllers/profiles.js)
    ui.tap(ui.$('btnSettings'), () => G.menus.settingsFromTitle());
    const free = (fn) => () => { if (!G.lockInput) fn(); };   // no menus in the middle of a ladder / trap door trip
    ui.tap(ui.$('btnMap'), free(() => ui.bigMap()));
    ui.tap(ui.$('btnJournal'), free(() => G.menus.journal()));
    ui.tap(ui.$('btnDeck'), free(() => G.menus.deckView()));
    ui.tap(ui.$('btnDeck2'), free(() => G.menus.deckView()));
    ui.tap(ui.$('btnPause'), free(() => G.menus.pauseMenu()));
    ui.$('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && ui.modalCanClose) ui.closeModal(); });
    document.addEventListener('pointerdown', () => G.audio.unlock(), { once: true });
    ui.$('menuLoading').classList.add('hidden'); document.querySelector('.menu-buttons').classList.remove('hidden');   // ready: show the buttons
    G.setScreen('menu');
    requestAnimationFrame(loop);
    G.warmSprites();
    window.__ready = true;
  }
  boot();
})();
