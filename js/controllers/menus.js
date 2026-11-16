/* CONTROLLER — In-game menus: deck, quest journal, pause, settings, Android back button. */
(function () {
  const ui = G.ui;
  /* ---------- menus ---------- */
  function deckView() {
    const s = G.state; const box = ui.el('div');
    box.appendChild(ui.el('div', 'sub', 'Every card is cursed by the Witch. In battle, solve the puzzle to reveal its real power!'));
    const grid = ui.el('div', 'deck-grid');
    [...s.deck].sort((a, b) => a.id.localeCompare(b.id)).forEach((inst) => grid.appendChild(ui.cardEl(inst, { cursed: true })));
    box.appendChild(grid);
    box.appendChild(ui.keywordLegend(s.deck.map((c) => c.id)));
    box.className = 'deck-view';
    ui.modal(box, { frame: `Your Deck (${s.deck.length} cards)` });
  }
  function journal() {
    const s = G.state, f = s.flags, k = s.items.moonkey || 0;
    const q = [
      [!!f.door_19_27, 'Break the rune lock on the castle gate'],
      [!!f.metSneezalot, 'Talk to Sir Sneezalot in the Entrance Hall'],
      [!!f.freed_rat, 'Free the rat in the Kitchen (West Hallway)'],
      [!!f.freed_goblin, 'Free the cookie thief in the Dining Hall'],
      [!!f.freed_skeleton, 'Free the dancing skeleton in the Ballroom'],
      [!!f.freed_spider, 'Free the spider in the Library (rune door). Tip: FIRE!'],
      [!!f.freed_archer, 'Free the archer in the Greenhouse → Moon Key'],
      [!!f.trollKey, "Get the Moon Key from the Giant's Bedroom (fight or sneak!)"],
      [!!f.freed_wizard, 'Free the wizard in the Alchemy Lab → Moon Key'],
      [!!f.freed_wolf, 'Free the wolf in the Smithy, then use his forge'],
      [!!f.freed_knight, 'Get past the Iron Knight on the Spiral Stairs'],
      [!!f.door_19_2, `Open the Moon Door (${k}/3 Moon Keys)`],
      [!!f.witch_beaten, "Break the Witch's curse!"],
    ];
    const extra = [['done_cheesechest', 'Cheese Cellar chest'], ['done_easel', 'Portrait Gallery easel'], ['done_tub', 'Royal Bathroom ducks'], ['done_toybox', 'Toy Room patterns'], ['done_musicbox', 'Ballroom music box'], ['done_cauldron', 'Alchemy Lab potions'], ['done_feast', 'Dining Hall cookies'], ['done_anvil', 'Smithy forge']];
    const box = ui.el('div');
    box.innerHTML = `<ul class="journal">${q.map(([d, t]) => `<li class="${d ? 'done' : 'todo'}">${d ? ui.svg.tick : ui.svg.todo} ${t}</li>`).join('')}</ul>
      <div class="sub">Bonus fun: ${extra.map(([k2, t]) => (f[k2] ? ui.svg.tick : ui.svg.todo) + ' ' + t).join(' • ')}</div>
      <div class="sub">Secret rooms found: ${G.secretsFound ? G.secretsFound() : 0} / ${G.secretsTotal ? G.secretsTotal() : 4}${(G.secretsFound && G.secretsFound()) ? '' : ' (look for walls that look a little odd!)'}</div>
      ${G.forestJournal ? G.forestJournal() : ''}
      ${G.cleanJournal ? G.cleanJournal() : ''}
      <div class="sub">Steps: ${s.steps} • Puzzles solved: ${s.solved || 0} • Friends freed: ${s.wins || 0}</div>`;
    ui.modal(box, { scroll: 'Quest' });
  }
  function pauseMenu() {
    const box = ui.el('div');
    const col = ui.el('div'); col.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center';
    const mk = (label, cls, fn) => { const b = ui.el('button', 'btn ' + cls, label); b.style.minWidth = '420px'; ui.tap(b, fn); col.appendChild(b); return b; };
    mk('Keep playing', 'gold', () => ui.closeModal());
    const snd = mk(`Sound: ${G.settings.sound ? 'ON' : 'OFF'}`, '', () => { G.settings.sound = !G.settings.sound; G.audio.setOn(G.settings.sound); G.saveSettings(); snd.textContent = `Sound: ${G.settings.sound ? 'ON' : 'OFF'}`; });
    const vo = mk(`Voices: ${G.settings.voice !== false ? 'ON' : 'OFF'}`, '', () => { G.settings.voice = G.settings.voice === false; if (!G.settings.voice && G.voice) G.voice.stop(); G.saveSettings(); vo.textContent = `Voices: ${G.settings.voice ? 'ON' : 'OFF'}`; });
    const rp = mk(`Read puzzles aloud: ${G.settings.readPuzzles !== false ? 'ON' : 'OFF'}`, '', () => { G.settings.readPuzzles = G.settings.readPuzzles === false; G.saveSettings(); rp.textContent = `Read puzzles aloud: ${G.settings.readPuzzles ? 'ON' : 'OFF'}`; });
    const txt = mk(`Text: ${G.settings.fastText ? 'instant' : 'typing'}`, '', () => { G.settings.fastText = !G.settings.fastText; G.saveSettings(); txt.textContent = `Text: ${G.settings.fastText ? 'instant' : 'typing'}`; });
    const lv = ['', 'Age 6–7', 'Age 8–9', 'Age 10+'];
    const lvb = mk(`Puzzle level: ${lv[G.state.level]}`, '', () => { G.state.level = G.state.level % 3 + 1; G.save(); lvb.textContent = `Puzzle level: ${lv[G.state.level]}`; });
    mk('Save & switch hero', '', () => { G.save(); G.toMenu(); G.showProfiles(); });
    box.appendChild(col);
    ui.modal(box, { frame: 'Menu' });
  }
  function settingsFromTitle() {
    const box = ui.el('div');
    const col = ui.el('div'); col.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center';
    const snd = ui.el('button', 'btn', `Sound: ${G.settings.sound ? 'ON' : 'OFF'}`); snd.style.minWidth = '420px';
    ui.tap(snd, () => { G.settings.sound = !G.settings.sound; G.audio.setOn(G.settings.sound); G.saveSettings(); snd.textContent = `Sound: ${G.settings.sound ? 'ON' : 'OFF'}`; });
    const vo = ui.el('button', 'btn', `Voices: ${G.settings.voice !== false ? 'ON' : 'OFF'}`); vo.style.minWidth = '420px';
    ui.tap(vo, () => { G.settings.voice = G.settings.voice === false; if (!G.settings.voice && G.voice) G.voice.stop(); G.saveSettings(); vo.textContent = `Voices: ${G.settings.voice ? 'ON' : 'OFF'}`; });
    const rp = ui.el('button', 'btn', `Read puzzles aloud: ${G.settings.readPuzzles !== false ? 'ON' : 'OFF'}`); rp.style.minWidth = '420px';
    ui.tap(rp, () => { G.settings.readPuzzles = G.settings.readPuzzles === false; G.saveSettings(); rp.textContent = `Read puzzles aloud: ${G.settings.readPuzzles ? 'ON' : 'OFF'}`; });
    const txt = ui.el('button', 'btn', `Text: ${G.settings.fastText ? 'instant' : 'typing'}`); txt.style.minWidth = '420px';
    ui.tap(txt, () => { G.settings.fastText = !G.settings.fastText; G.saveSettings(); txt.textContent = `Text: ${G.settings.fastText ? 'instant' : 'typing'}`; });
    col.append(snd, vo, rp, txt, ui.el('div', 'sub', 'To delete a hero: tap Play, then the bin on their card.')); box.appendChild(col);
    ui.modal(box, { frame: 'Settings' });
  }

  /* Android back button (called from the APK shell) and Escape */
  G.onBack = window.onAndroidBack = function () {
    if (G.lockInput) return;                       // wait for the ladder / trap door trip to finish
    if (ui.modalOpen()) { if (ui.modalCanClose) ui.closeModal(); return; }
    if (G.screen === 'game') { if (!(G.combat && G.combat.active)) pauseMenu(); return; }
    if (G.screen === 'classSelect') G.toMenu();
    if (G.screen === 'intro') G.introSkip();
  };

  G.menus = { deckView, journal, pauseMenu, settingsFromTitle };
})();
