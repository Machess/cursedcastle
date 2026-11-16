/* CONTROLLER — Using trap doors and ladders (G.PORTALS in models/maps.js), and how the trip looks:
   down a ladder: step up to the hole and look down into it, climb (the ladder shaft scrolls past, clunk clunk),
     then look up from the bottom as the new room fades in.
   the very first trip down the trap door: the floor tips, you whizz down a twisty slide and land with a BUMP.
   up a ladder: look up at the light, climb (the shaft scrolls the other way), and rise out of the hatch. */
(function () {
  const ui = G.ui, $ = ui.$;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  /* animate the camera: look = up (+) / down (-) in screen pixels, fwd = how far toward the portal (cells) */
  function camTo(look, fwd, ms, back = 0) {      // back: where the eye ends up (0 = stepped right up to the hole)
    const c = G.cam, s = G.state, [dx, dy] = G.DIRS[s.dir];
    const b0 = c.back != null ? c.back : G.VIEW_BACK;
    const l0 = c.look || 0, x0 = c.x, y0 = c.y, bx = s.x + 0.5, by = s.y + 0.5;
    const f0 = Math.abs(dx) ? (x0 - bx) * dx : (y0 - by) * dy;
    return new Promise((res) => G.addFx(ms, (k) => {
      const e = ease(k), f = f0 + (fwd - f0) * e;
      c.look = l0 + (look - l0) * e; c.x = bx + dx * f; c.y = by + dy * f; c.back = b0 + (back - b0) * e; G.dirty = true;
    }, res));
  }
  function overlay(mode) {        // mode: 'down' | 'up' | 'slide' | null
    const o = $('stairFx'); o.className = mode ? 'on ' + mode : '';
  }
  function fade(on, ms = 300) { const f = $('sfFade'); f.style.transition = `opacity ${ms}ms`; f.style.opacity = on ? 1 : 0; return wait(ms); }

  /* the spiral stairs: through the door, into the stairwell, round and round (up or down), out at the other end */
  async function stairs(p) {
    const s = G.state, w = G.world, up = p.dir === 'up', di = G.idx(p.x, p.y);
    if (w.cells[di] === 2 && w.doorOpen[di] < 1) { w.doorTarget[di] = 1; G.audio.doorOpen(w.doorStyle[di] || w.doorType[di]); await wait(360); }
    await camTo(up ? 18 : -30, 0.9, 650, 0);             // step into the doorway, looking up (or down) the stairs
    await fade(true, 200);
    // the stairwell: a 1x1 well drawn by the renderer as a spiral (stairsArt.js, renderer.js world.spiral)
    const a0 = G.cam.a;
    G.useMap('stairwell'); G.buildWorld(); G.things = []; s.seen = new Uint8Array(9);
    Object.assign(G.cam, { x: 1.5, y: 1.5, a: a0, back: 0, look: up ? 26 : -26, rise: 0, bob: 0 });
    G.renderer.L = null; G.dirty = true;
    await fade(false, 200);
    const STEPS = 16, MS = 3000, turn = (up ? 1 : -1) * Math.PI * 2;
    let lastStep = -1;
    const roomFade = ui.$('roomFade');
    await new Promise((res) => G.addFx(MS, (k) => {
      const e = k < 0.12 ? k * k / 0.24 : k > 0.88 ? 1 - (1 - k) * (1 - k) / 0.24 : k - 0.06;   // ease in and out of the walk
      const kk = e / 0.94;
      G.cam.a = a0 + turn * kk; G.cam.rise = (up ? 1 : -1) * kk;
      const st = Math.floor(kk * STEPS);
      if (st !== lastStep) { lastStep = st; G.audio.stepOn('stone'); }
      G.cam.bob = -Math.abs(Math.sin(kk * STEPS * Math.PI)) * 5;
      roomFade.style.opacity = (0.55 * Math.sin(kk * Math.PI)).toFixed(3);     // darker in the middle of the climb
      G.dirty = true;
    }, () => { roomFade.style.opacity = ''; res(); }));
    await fade(true, 260);
    const t = p.to;
    G.cam.rise = 0; G.cam.bob = 0; G.cam.look = 0;
    G.switchMap(t.map, t.x, t.y, t.dir); G.cam.back = 0; G.renderer.L = null;
    G.lastRegion = null; G.anim = null;
    G.cam.look = up ? -24 : 24;
    await fade(false, 380);
    await camTo(0, 0, 600, G.VIEW_BACK);
    G.cam.look = 0; G.cam.back = null; G.lockInput = false; G.save();
    G.arrived();
  }

  async function travel(p) {
    const s = G.state, first = p.kind === 'hatch' && !s.flags[p.id + '_open'];
    G.lockInput = true; ui.say(G.ROOMS[G.world.region[G.idx(s.x, s.y)]].name, '', []);
    if (p.onUse) p.onUse();
    if (p.kind === 'stairs') return stairs(p);
    if (p.kind === 'door') return through(p);
    if (p.kind === 'hatch') {
      if (first) {                                    // the floor tips you in!
        G.audio.door(); s.flags[p.id + '_open'] = 1; G.portalFloors();
        await camTo(-70, 0.1, 450);                     // peek at the open hole...
        await wait(300);
        G.audio.whoosh(); ui.popNum('WHOOOA!', 358, 90, '#ffe9a0');
        await camTo(-115, 1.0, 320);                    // ...and tip in
        overlay('slide'); await wait(1700);
        G.audio.bonk();
      } else {
        await camTo(-70, 0.15, 420); G.audio.door();    // look down the hole at the ladder
        await wait(200);
        await camTo(-115, 0.9, 420);
        overlay('down'); await clunks(5);
      }
    } else {                                           // a ladder: look up at the light and climb
      await camTo(70, 0.3, 520);
      overlay('up'); await clunks(5);
    }
    await fade(true, 260);
    overlay(null);
    const t = p.to; G.cam.look = 0;
    G.switchMap(t.map, t.x, t.y, t.dir); G.cam.back = 0;
    G.lastRegion = null; G.anim = null;
    G.cam.look = p.dir === 'down' ? 70 : -70;          // arrive looking up (from the bottom) / down (out of the hatch)
    await fade(false, 380);
    if (first) {                                       // the landing
      G.audio.hit(); ui.popNum('BUMP!', 358, 150, '#ffd27a');
      G.addFx(420, (k) => { G.cam.bob = Math.sin(k * Math.PI * 3) * 14 * (1 - k); G.dirty = true; }, () => { G.cam.bob = 0; });
    }
    await camTo(0, 0, 560, G.VIEW_BACK);           // straighten up and step back to the normal view
    G.cam.look = 0; G.cam.back = null; G.lockInput = false; G.save();
    G.arrived();
    if (first) ui.say(G.ROOMS[G.world.region[G.idx(s.x, s.y)]].name, p.land ||
      'WHEEE... BUMP! You slid down a secret chute into a golden vault under the castle! A ladder behind you leads back up.', []);
  }
  /* a door from one map into another (the Honey Hut): it opens, the picture fades, you are inside */
  async function through(p) {
    const s = G.state, w = G.world, di = G.idx(p.x, p.y);
    if (w.cells[di] === 2) { w.doorTarget[di] = 1; G.audio.doorOpen(w.doorStyle[di] || w.doorType[di]); }
    await camTo(0, 0.7, 520, 0);
    await fade(true, 240);
    const t = p.to; G.cam.look = 0;
    G.switchMap(t.map, t.x, t.y, t.dir); G.cam.back = null; G.renderer.L = null;
    G.lastRegion = null; G.anim = null;
    await fade(false, 340);
    G.lockInput = false; G.save(); G.arrived();
  }
  async function clunks(n) {
    for (let i = 0; i < n; i++) { G.audio.clunk(); await wait(260); }
  }

  /* walking onto a trap door / into a ladder: ask first, so nobody falls in by accident */
  G.usePortal = function (p) {
    if (!p || G.lockInput) return;
    if (p.kind === 'stairs' || p.kind === 'door') return travel(p);        // stairs, a door: just walk on
    const first = p.kind === 'hatch' && !G.state.flags[p.id + '_open'];
    if (first && p.auto) return travel(p);            // the Leafy Pit: the ground gives way under you
    ui.say(p.title || (p.kind === 'hatch' ? 'A Trap Door' : 'A Ladder'),
      p.kind === 'hatch' && !first && p.again ? p.again : p.text ? p.text
        : first ? 'A wooden trap door in the dance floor. Music is coming from somewhere down there...'
        : p.kind === 'hatch' ? 'The open trap door. A ladder leads down into the golden glow.' : `A sturdy ladder up to ${p.where}.`,
      [{ label: first ? 'Open the trap door' : p.label, fn: () => travel(p) }, { label: 'Stay here', fn: () => G.arrived(true) }]);
  };

  /* the Ballroom's trap door appears after the music box is finished */
  G.revealHatch = function () {
    const s = G.state; if (s.flags.hatch) return;
    s.flags.hatch = 1; G.save();
    G.audio.thunder(0.05); G.audio.sparkle();
    G.addFx(900, (k) => { G.cam.bob = Math.sin(k * 40) * 4 * (1 - k); G.dirty = true; }, () => { G.cam.bob = 0; G.portalFloors(); G.audio.door(); });
    setTimeout(() => ui.say('Sir Rattlebones', '"Did you feel that? RUMBLE RUMBLE! The music box opened the old trap door in the dance floor! My old band is still down there... cursed, guarding the royal treasure. Please help them!"', []), 1000);
  };
})();
