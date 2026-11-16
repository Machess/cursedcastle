/* CONTROLLER — Room mini-games and interactive objects. All reuse the same modal + puzzle building blocks. */
(function () {
  const ui = G.ui, ri = G.ri, pick = G.pick, shuffle = G.shuffle;
  const lvl = () => G.state.level;

  /* ---------- generic multiple-choice round ---------- */
  G.quiz = (o) => quiz(o);                              // (forest.js: the spirits' puzzles)
  function quiz({ title, sub, body, options, answer, emoji, onDone, retry, voice }) {
    G._ans = answer;
    const box = ui.el('div');
    box.appendChild(ui.el('h2', '', title));
    if (sub) box.appendChild(ui.el('div', 'sub', sub));
    if (body) { const b = ui.el('div'); if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body); box.appendChild(b); }
    const opts = ui.el('div', 'pz-opts'); const fb = ui.el('div', 'pz-feedback');
    let done = false;
    options.forEach((o) => {
      const b = ui.el('button', 'pz-opt' + (emoji ? ' emo' : ''), String(o));
      b.addEventListener('click', () => {
        if (done) return; done = true;
        const ok = o === answer;
        b.classList.add(ok ? 'right' : 'wrong');
        const cheer = pick(['Correct!', 'Yes!', 'Brilliant!']);
        if (G.voice) G.voice.sayList(ok ? [G.voice.forText(cheer)] : retry ? ['pip-fb-not-quite'] : ['pip-fb-oops', ...(typeof answer === 'number' ? G.voice.num(answer) : [])]);
        if (ok) { G.audio.good(); G.heroFace('grin'); G.state.solved = (G.state.solved || 0) + 1; fb.className = 'pz-feedback good'; fb.innerHTML = cheer + ' ' + ui.ico('star'); }
        else { G.audio.bad(); fb.className = 'pz-feedback bad'; fb.textContent = retry ? 'Not quite! Try another one.' : `It was ${answer}.`; [...opts.children].forEach((x, k) => { if (!retry && options[k] === answer) x.classList.add('right'); }); }
        setTimeout(() => { ui.closeModal(); onDone(ok); }, ok ? 900 : 1500);
      });
      opts.appendChild(b);
    });
    box.appendChild(opts); box.appendChild(fb);
    ui.modal(box, { close: false, width: 820 });
    if (voice && G.voice && G.settings.readPuzzles !== false) G.voice.sayList(voice);   // Pip reads the question
  }
  function numOpts(ans) {
    const s = new Set([ans]); const c = shuffle([ans + 1, ans - 1, ans + 2, ans - 2, ans + 5, ans + 10]);
    for (const x of c) { if (s.size >= 4) break; if (x >= 0) s.add(x); }
    return shuffle([...s]);
  }
  function stars(n, of) { return `(${n + 1} of ${of})`; }      // which round this is, in the title
  /* run `n` successful rounds of `round(i, cb)`; failed rounds just retry */
  function rounds(n, round, onWin) {
    let i = 0;
    const next = () => { if (i >= n) return onWin(); round(i, (ok) => { if (ok) i++; next(); }); };
    next();
  }

  /* ---------- rune locks (gate, library) ---------- */
  G.runeLock = function (n, onOpen) {
    rounds(n, (i, cb) => G.puzzle({ target: ri(2, 12), title: `Rune Lock ${stars(i, n)}`, sub: 'Solve the rune! (a wrong answer just makes a new rune)', onDone: cb }), () => { G.audio.sparkle(); onOpen(); });
  };

  /* ---------- objects ---------- */
  function reward(items, text, card) {
    const got = [];
    for (const k in items) { G.giveItem(k, items[k]); got.push(G.ITEMS[k].name + (items[k] > 1 ? ' ×' + items[k] : '')); }
    G.audio.win(); G.refreshThings(); G.dirty = true; G.save();
    const fin = () => ui.say('Hooray!', `${text} You got: ${got.join(', ') || 'a new card'}.`, []);
    if (card) G.cardReward(fin); else fin();
  }
  function done(id) { G.state.flags['done_' + id] = 1; }

  G.OBJECTS = {
    cheesechest: {
      name: 'The Cheese Chest', verb: 'Open the lock', text: 'A treasure chest shaped like a wheel of cheese! The lock asks counting questions.',
      doneText: 'The cheese chest is empty now. It smells AMAZING.',
      play() { rounds(3, (i, cb) => countRound(['cheese', 'cheeses'], `Cheese Lock ${stars(i, 3)}`, cb), () => { done('cheesechest'); reward({ cheese: 2, pepper: 1 }, 'The chest pops open!'); }); },
    },
    easel: {
      name: 'The Magic Easel', verb: 'Match the paintings', text: 'The paintings have mixed up their faces! Help them find their twins.',
      doneText: 'The paintings are all smiling now. One of them winks at you.',
      play() { memoryGame(() => { done('easel'); reward({ portrait: 1 }, 'The paintings cheer!', true); }); },
    },
    tub: {
      name: 'Bathtub of Ducks', verb: 'Count the ducks', text: 'Hundreds of rubber ducks! The Golden Duck will only come out if you count its friends.',
      doneText: 'Quack! The ducks float happily.',
      play() { rounds(3, (i, cb) => countRound(['duck', 'ducks'], `Duck Count ${stars(i, 3)}`, cb), () => { done('tub'); reward({ duck: 1, bubble: 1 }, 'The Golden Duck pops up out of the bubbles!'); }); },
    },
    musicbox: {
      name: 'The Music Box', verb: 'Play the music box', text: 'Sir Rattlebones: "Listen to the bells and play them back in the same order!"',
      notReady: 'A music box... but a clattering skeleton keeps dancing in the way!', doneText: 'The music box plays a happy waltz.',
      ready: () => G.state.flags.freed_skeleton,
      play() { simonGame(() => { done('musicbox'); reward({ medal: 1 }, 'Sir Rattlebones dances a happy jig!', true); setTimeout(G.revealHatch, 600); }); },
    },
    toybox: {
      name: 'The Toy Box', verb: 'Finish the patterns', text: 'The toy soldiers are lined up in patterns, but some are missing! What comes next?',
      doneText: 'The toy soldiers salute you.',
      play() { rounds(3, (i, cb) => patternRound(i, cb), () => { done('toybox'); reward({ crown: 1 }, 'The toy box opens with a happy jingle!', true); }); },
    },
    anvil: {
      name: "Howl's Forge", verb: 'Upgrade a card', text: 'Sergeant Howl: "Pick a card and I will make it stronger! But you must help me with the sums."',
      notReady: 'The forge is guarded by a wolf in armour!', doneText: 'Sergeant Howl: "Come back when the Dragon is gone. I need a nap."',
      ready: () => G.state.flags.freed_wolf,
      play() { forgeGame(); },
    },
    cauldron: {
      name: 'The Bubbling Cauldron', verb: 'Mix potions', text: 'Grumbledore: "Help me mix the right colours and I will give you Bubble Potions!"',
      notReady: 'The cauldron bubbles... but the grumpy wizard will not let you touch it!', doneText: 'The cauldron burps happily. BLURP.',
      ready: () => G.state.flags.freed_wizard,
      play() { rounds(3, (i, cb) => potionRound(i, cb), () => { done('cauldron'); reward({ bubble: 2 }, 'Perfect potions!'); }); },
    },
    vaultchest: {
      name: 'The Royal Treasure Chest', verb: 'Share the gold', text: 'A chest with a music-note lock. The Bone Band: "Share it fairly between all of us and it opens!"',
      notReady: 'A golden treasure chest... but three grumpy skeleton musicians are guarding it!', doneText: 'The chest is empty. The band is still counting their coins.',
      ready: () => G.state.flags.freed_band,
      play() { rounds(3, (i, cb) => shareRound(i, cb), () => { done('vaultchest'); reward({ treasure: 1, bubble: 2 }, 'CLICK! The chest bursts open: GOLD!', true); }); },
    },
    feast: {
      name: 'The Feast Table', verb: 'Share the cookies', text: 'Gobbo the baker: "Help me share my cookies fairly with everyone!"',
      notReady: 'A feast table with cookies... that keep disappearing into a goblin\'s hat!', doneText: 'Everyone has the same number of cookies. Fair and yummy!',
      ready: () => G.state.flags.freed_goblin,
      play() { rounds(3, (i, cb) => shareRound(i, cb), () => { done('feast'); reward({ cheese: 1 }, 'Everyone munches happily!', true); }); },
    },
  };
  G.objectReady = (id) => { const o = G.OBJECTS[id]; return !o || !o.ready || !!o.ready(); };
  G.objectPrompt = function (th) {
    const o = G.OBJECTS[th.id]; const f = G.state.flags;
    if (f['done_' + th.id]) return ui.say(o.name, o.doneText, []);
    if (!G.objectReady(th.id)) return ui.say(o.name, o.notReady, []);
    ui.say(o.name, o.text, [{ label: o.verb, fn: () => o.play() }, { label: 'Later', fn: () => G.arrived(true) }]);
  };

  /* ---------- counting (cheese holes, ducks) ---------- */
  function countRound([k, word], title, cb) {
    const L = lvl(); let ans, body, sub; const e = ui.ico(k);
    if (L === 1) { ans = ri(4, 12); body = `<div class="pz-grid">${e.repeat(ans)}</div>`; sub = `How many ${word} can you count?`; }
    else {
      const rows = L === 2 ? ri(2, 4) : ri(3, 7), cols = L === 2 ? ri(2, 5) : ri(3, 6); ans = rows * cols;
      let g = ''; for (let r = 0; r < rows; r++) g += `<div>${e.repeat(cols)}</div>`;
      body = `<div class="pz-grid small" style="flex-direction:column;align-items:center">${g}</div>`;
      sub = L === 2 ? `${rows} rows of ${cols}. How many ${word} altogether?` : `How many ${word}? (Tip: rows × columns!)`;
    }
    quiz({ title, sub, body, options: numOpts(ans), answer: ans, onDone: cb, voice: ['pip-count-' + word.replace(' ', '-'), '|', 'pip-w-how-many'] });
  }

  /* ---------- sharing (division) ---------- */
  function shareRound(i, cb) {
    const L = lvl(); const friends = L === 1 ? 2 : L === 2 ? ri(2, 4) : ri(3, 6); const each = L === 1 ? ri(2, 5) : L === 2 ? ri(2, 6) : ri(3, 8);
    const total = friends * each;
    const pals = shuffle(['rat', 'goblin', 'spider', 'wolf', 'troll', 'archer', 'wizard', 'knight', 'skeleton']).slice(0, friends);
    const body = `<div class="pz-grid small">${ui.ico('gob-cookie').repeat(total)}</div><div class="pz-grid">${pals.map((m) => ui.mon(m)).join('')}</div>`;
    quiz({ title: `Fair Sharing ${stars(i, 3)}`, sub: `${total} cookies shared fairly by ${friends} friends. How many cookies does each friend get?`, body, options: numOpts(each), answer: each, onDone: cb });
  }

  /* ---------- patterns ---------- */
  function patternRound(i, cb) {
    const p = G.patternPuzzle(lvl());
    quiz({ title: `Toy Soldier Patterns ${stars(i, 3)}`, sub: 'What comes next in the line?', body: `<div class="pz-grid">${p.seq.join('')}${ui.shape('q')}</div>`, options: p.options, answer: p.answer, emoji: true, onDone: cb, voice: ['pip-w-what-next'] });
  }

  /* ---------- potion colour mixing ---------- */
  const COLORS = { red: '#e04040', blue: '#3a6ae0', yellow: '#f0d040', white: '#f4f4f4' };
  const MIXES = [
    { name: 'PURPLE', c: '#9040c0', mix: ['red', 'blue'] }, { name: 'GREEN', c: '#40b050', mix: ['blue', 'yellow'] },
    { name: 'ORANGE', c: '#f08a30', mix: ['red', 'yellow'] }, { name: 'PINK', c: '#f4a0c0', mix: ['red', 'white'] },
    { name: 'LIGHT BLUE', c: '#9ac8ff', mix: ['blue', 'white'] },
  ];
  function potionRound(i, cb) {
    const t = pick(MIXES); const box = ui.el('div');
    box.innerHTML = `<h2>Potion Mixing ${stars(i, 3)}</h2><div class="sub">Pick TWO colours to make <span class="target-pot" style="background:${t.c}"></span><b>${t.name}</b></div>`;
    const row = ui.el('div', 'flasks'); const fb = ui.el('div', 'pz-feedback'); const sel = [];
    for (const k in COLORS) {
      const f = ui.el('button', 'flask', `${ui.ico('bubble', 'f')}${k}`); f.style.background = COLORS[k]; if (k === 'white' || k === 'yellow') f.style.color = '#333';
      f.addEventListener('click', () => {
        if (sel.length >= 2 || sel.includes(k)) return; G.audio.click(); sel.push(k); f.classList.add('sel');
        if (sel.length === 2) {
          const ok = t.mix.every((m) => sel.includes(m));
          if (ok) { G.audio.good(); G.state.solved++; fb.className = 'pz-feedback good'; fb.textContent = `BLOOP! A perfect ${t.name} potion!`; }
          else { G.audio.bad(); fb.className = 'pz-feedback bad'; fb.textContent = 'Bleh! A muddy potion. Try again!'; }
          setTimeout(() => { ui.closeModal(); cb(ok); }, ok ? 1000 : 1400);
        }
      });
      row.appendChild(f);
    }
    box.appendChild(row); box.appendChild(fb);
    ui.modal(box, { close: false, width: 760 });
  }

  /* ---------- memory match ---------- */
  function memoryGame(onWin) {
    const faces = shuffle(['rat', 'spider', 'wolf', 'wizard', 'skeleton', 'archer', 'knight', 'troll', 'goblin']).slice(0, lvl() === 1 ? 4 : 6);   // the castle's friends' portraits
    const back = ui.ico('portrait', 'mem-back'), face = (f) => ui.mon(f, 'mem-face');
    const deck = shuffle([...faces, ...faces]);
    const box = ui.el('div'); box.innerHTML = '<h2>Match the Paintings</h2><div class="sub">Find the pairs! Tap two frames.</div>';
    const grid = ui.el('div', 'mem-grid'); let open = [], matched = 0, moves = 0, lock = false;
    const info = ui.el('div', 'pz-feedback');
    deck.forEach((f) => {
      const b = ui.el('button', 'mem', back); b.dataset.f = f;
      b.addEventListener('click', () => {
        if (lock || b.classList.contains('up') || b.classList.contains('done')) return;
        G.audio.card(); b.classList.add('up'); b.innerHTML = face(f); open.push(b);
        if (open.length === 2) {
          moves++; lock = true;
          const [a, c] = open;
          if (a.dataset.f === c.dataset.f) {
            setTimeout(() => { a.classList.add('done'); c.classList.add('done'); G.audio.good(); open = []; lock = false; matched++; info.textContent = `Pairs: ${matched} / ${faces.length}`;
              if (matched === faces.length) { info.className = 'pz-feedback good'; info.textContent = `All matched in ${moves} tries!`; G.state.solved++; setTimeout(() => { ui.closeModal(); onWin(); }, 1200); } }, 300);
          } else setTimeout(() => { a.classList.remove('up'); c.classList.remove('up'); a.innerHTML = c.innerHTML = back; open = []; lock = false; }, 800);
        }
      });
      grid.appendChild(b);
    });
    box.appendChild(grid); box.appendChild(info);
    ui.modal(box, { width: 640, onClose: null });
  }

  /* ---------- music box (Simon says) ---------- */
  function simonGame(onWin) {
    const lens = lvl() === 1 ? [3, 4] : lvl() === 2 ? [3, 4, 5] : [4, 5, 6];
    const cols = ['#e04848', '#3a7ae0', '#f0c030', '#40b050'];
    const box = ui.el('div'); box.innerHTML = '<h2>The Music Box</h2>';
    const sub = ui.el('div', 'sub', 'Listen...'); box.appendChild(sub);
    const grid = ui.el('div', 'simon'); const bells = [];
    cols.forEach((c, i) => { const b = ui.el('button', 'bell', ui.svg.bell); b.style.background = c; grid.appendChild(b); bells.push(b); });
    const fb = ui.el('div', 'pz-feedback'); box.appendChild(grid); box.appendChild(fb);
    ui.modal(box, { width: 560 });
    let round = 0, seq = [], pos = 0, listening = false;
    const light = (i) => { bells[i].classList.add('lit'); G.audio.note(i); setTimeout(() => bells[i].classList.remove('lit'), 380); };
    function play(newSeq) {
      if (newSeq) { seq = []; for (let i = 0; i < lens[round]; i++) seq.push(ri(0, 3)); }
      listening = false; pos = 0; sub.textContent = `Song ${round + 1} of ${lens.length}: listen...`;
      seq.forEach((n, k) => setTimeout(() => light(n), 700 + k * 620));
      setTimeout(() => { listening = true; sub.textContent = 'Your turn! Play it back.'; }, 700 + seq.length * 620);
    }
    bells.forEach((b, i) => b.addEventListener('click', () => {
      if (!listening) return; light(i);
      if (i !== seq[pos]) { listening = false; G.audio.bad(); fb.className = 'pz-feedback bad'; fb.textContent = 'Oops! Listen again...'; setTimeout(() => { fb.textContent = ''; play(false); }, 1200); return; }
      pos++;
      if (pos === seq.length) {
        listening = false; G.audio.good(); G.state.solved++; round++;
        fb.className = 'pz-feedback good'; fb.textContent = round >= lens.length ? 'Beautiful music!' : 'Lovely! Next song...';
        setTimeout(() => { fb.textContent = ''; if (round >= lens.length) { ui.closeModal(); onWin(); } else play(true); }, 1200);
      }
    }));
    play(true);
  }

  /* ---------- forge (card upgrade) ---------- */
  function forgeGame() {
    const s = G.state; const box = ui.el('div');
    const forgeIcon = G.ICON_ART && G.ICON_ART.forge ? `<img class="forge-img" src="${G.ICON_ART.forge}" alt="">` : '';
    box.innerHTML = forgeIcon + '<h2>Pick a card to upgrade</h2><div class="sub">Its power goes up by 2!</div>';
    const grid = ui.el('div', 'deck-grid');
    s.deck.forEach((inst) => {
      if (inst.up) return;
      const e = ui.cardEl(inst, { cursed: false, cls: 'mini' });
      ui.tap(e, () => {
        ui.closeModal();
        const up = () => G.puzzle({ target: ri(3, 12), title: 'Hammer time! CLANG!', sub: 'Solve it to strike the anvil', onDone: (ok) => {
          if (!ok) { ui.say("Howl's Forge", 'The hammer slipped! Sergeant Howl says: "Try again!"', [{ label: 'Try again', fn: up }]); return; }
          inst.up = 1; done('anvil'); G.audio.win(); G.refreshThings(); G.save();
          ui.say("Howl's Forge", `CLANG! CLANG! Your ${G.CARDS[inst.id].name} is now ${G.cardDef(inst).name} (power ${G.cardDef(inst).min}–${G.cardDef(inst).max})!`, []);
        } });
        up();
      });
      grid.appendChild(e);
    });
    box.appendChild(grid);
    ui.modal(box, { width: 1100 });
  }

  /* ---------- sneaking past the troll ---------- */
  G.sneakGame = function () {
    const L = lvl();
    const rule = L === 1 ? { t: 'Tap every board with a number BIGGER than 5', f: (n) => n > 5, r: [1, 10] }
      : L === 2 ? { t: 'Tap every board with an EVEN number', f: (n) => n % 2 === 0, r: [1, 30] }
        : { t: 'Tap every board in the 3 times table', f: (n) => n % 3 === 0, r: [2, 40] };
    let nums; do { nums = Array.from({ length: 12 }, () => ri(rule.r[0], rule.r[1])); } while (nums.filter(rule.f).length < 4 || nums.filter(rule.f).length > 8);
    const need = nums.filter(rule.f).length; let found = 0, oops = 0;
    const box = ui.el('div');
    const keyPic = G.ICON_ART && G.ICON_ART['troll-keypillow'] ? `<img class="forge-img" src="${G.ICON_ART['troll-keypillow']}" alt="">` : '';
    box.innerHTML = keyPic + `<h2>Shhh... Sneak!</h2><div class="sub">Creaky floorboards! ${rule.t}. Wrong boards CREAK and wake the troll.</div>`;
    const zz = (left) => 'Snore meter: ' + [0, 1, 2].map((k) => ui.ico('troll-snore', k < left ? 'snore' : 'snore off')).join('');
    const meter = ui.el('div', 'pz-feedback', zz(3));
    const grid = ui.el('div', 'boards');
    nums.forEach((n) => {
      const b = ui.el('button', 'board', String(n));
      b.addEventListener('click', () => {
        if (b.classList.contains('ok') || b.classList.contains('creak') || oops >= 3) return;
        if (rule.f(n)) {
          b.classList.add('ok'); G.audio.click(); found++;
          if (found === need) {
            G.audio.good(); G.state.solved++; meter.className = 'pz-feedback good'; meter.textContent = 'You tiptoe to the pillow...';
            setTimeout(() => {
              ui.closeModal(); G.state.flags.trollKey = 1; G.giveItem('moonkey', 1); G.save(); G.audio.sparkle();
              ui.say("Giant's Bedroom", 'You slide the Moon Key out from under the giant pillow. Big Barry just snores: "Mmm... cupcakes..." (He is still cursed, so you can still free him later!)', []);
            }, 1200);
          }
        } else {
          b.classList.add('creak'); oops++; G.audio.snore(); G.audio.bad();
          meter.innerHTML = zz(3 - oops);
          if (oops >= 3) {
            meter.className = 'pz-feedback bad'; meter.textContent = 'CREEEAK! Big Barry wakes up! "WHO IS THERE?!"';
            setTimeout(() => { ui.closeModal(); G.startCombat('troll'); }, 1600);
          }
        }
      });
      grid.appendChild(b);
    });
    box.appendChild(grid); box.appendChild(meter);
    ui.modal(box, { close: false, width: 680 });
  };
})();
