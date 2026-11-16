/* VIEW — Curse-breaking puzzle pop-up (shared by cards, rune locks and the forge). */
(function () {
  const ui = G.ui;
  /* ---------- shared puzzle modal ---------- */
  G.puzzle = function ({ target, title, inst, sub, onDone }) {
    const s = G.state; const fb = ui.el('div', 'pz-feedback');
    const d = inst && G.cardDef(inst);
    const p = G.numberPuzzle(target, s.level, d ? [d.min, d.max] : null);
    const box = ui.el('div', 'pz' + (inst ? ' with-card' : ''));
    const wrap = ui.el('div', 'pz-wrap');
    let cardHolder = null;
    if (inst) { cardHolder = ui.el('div', 'pz-card'); cardHolder.appendChild(ui.cardEl(inst, { cursed: true, cls: 'big', noRange: true })); wrap.appendChild(cardHolder); }
    const right = ui.el('div', 'pz-parch');
    right.appendChild(ui.el('div', 'pz-say', sub || p.say));
    if (p.grid) {
      const g = ui.el('div', 'pz-grid' + (p.grid.length > 10 ? ' small' : ''));
      p.grid.forEach((e) => g.appendChild(ui.el('span', '', e))); right.appendChild(g);
    }
    const qb = ui.el('div', 'pz-qbox'); qb.appendChild(ui.el('div', 'pz-q', p.q)); right.appendChild(qb);
    const read = () => { if (G.voice && G.settings.readPuzzles !== false) G.voice.sayList(G.voice.puzzleIds(p)); };   // Pip reads it out (core/voice.js)
    qb.addEventListener('click', read); qb.title = 'Tap to hear it again';
    right.appendChild(fb);
    wrap.appendChild(right);
    box.appendChild(wrap);
    const opts = ui.el('div', 'pz-opts');
    let done = false;
    p.options.forEach((o) => {
      const b = ui.el('button', 'pz-opt', String(o));
      b.addEventListener('click', () => {
        if (done) return; done = true;
        const ok = o === p.answer;
        if (ok) {
          b.classList.add('right'); G.audio.good(); s.solved = (s.solved || 0) + 1; G.heroFace('grin');
          const cheer = G.pick(['Curse broken!', 'Brilliant!', 'Correct!', 'Super smart!']);
          if (G.voice) G.voice.sayList([G.voice.forText(cheer)]);
          fb.className = 'pz-feedback good'; fb.innerHTML = cheer + ' ' + ui.ico('star') + (inst ? ` &nbsp;Power: ${p.answer}` : '');
          if (cardHolder) { cardHolder.innerHTML = ''; cardHolder.appendChild(ui.cardEl(inst, { value: p.answer, cls: 'big reveal' })); }
        } else {
          b.classList.add('wrong'); G.audio.bad();
          [...opts.children].forEach((x) => { if (x.textContent === String(p.answer)) x.classList.add('right'); });
          if (G.voice) G.voice.sayList(['pip-fb-oops', ...G.voice.num(p.answer), ...(p.why ? ['|', 'pip-fb-here-how'] : [])]);
          fb.className = 'pz-feedback bad'; fb.textContent = `Oops! It was ${p.answer}.` + (inst ? ' The curse makes this card weak: 1' : '');
          if (cardHolder) { cardHolder.innerHTML = ''; cardHolder.appendChild(ui.cardEl(inst, { value: 1, cls: 'big weak' })); }
          // show how to work it out, and wait for "Got it" so there is time to look
          if (p.why) {
            const w = ui.el('div', 'pz-why'); w.appendChild(ui.el('div', 'pz-why-h', 'Here is how:'));
            p.why.forEach((line) => w.appendChild(ui.el('div', 'pz-why-l', line)));
            const ok2 = ui.el('button', 'btn gold', 'Got it!');
            ui.tap(ok2, () => { ui.closeModal(); onDone(false, p.answer); });
            w.appendChild(ok2); opts.replaceWith(w);       // the working takes the place of the number buttons
            return;
          }
        }
        setTimeout(() => { ui.closeModal(); onDone(ok, p.answer); }, ok ? 1000 : 1900);
      });
      opts.appendChild(b);
    });
    box.appendChild(opts);
    ui.modal(box, { close: false, frame: title || 'Break the curse!' });
    read();
  };

})();
