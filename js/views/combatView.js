/* VIEW — Battle screen: hand of cursed cards, monster HUD (health, statuses, next move). */
(function () {
  const ui = G.ui;
  const intent = () => G.combatCtl.intent();
  const lockReason = (d) => G.combatCtl.lockReason(d);
  const playCard = (i) => G.combatCtl.playCard(i);
  const log = (t) => ui.sayNow(t);

  function renderAll() {
    const c = G.combat; if (!c) return;
    const hand = ui.$('hand'); hand.innerHTML = '';
    c.hand.forEach((inst, i) => {
      const d = G.cardDef(inst);
      const lock = lockReason(d);
      const e = ui.cardEl(inst, { cursed: true, hand: true, unplayable: d.cost > c.energy || !!lock, lock });
      e.addEventListener('click', () => { G.audio.card(); playCard(i); });
      hand.appendChild(e);
    });
    const n = c.hand.length, k = Math.min(1, 654 / (n * 126 + (n - 1) * 5));   // more than five cards: make them a little smaller
    hand.style.setProperty('--k', k);
    renderHud();
    ui.renderHero();
    ui.$('cpInfo').textContent = c.energy > 0 && c.hand.some((x) => G.cardDef(x).cost <= c.energy) ? 'Tap a card to break its curse.' : 'Out of moves. Tap End Turn!';
  }

  function renderHud() {
    const c = G.combat, st = c.st, m = c.m, it = intent();
    ui.$('mhName').textContent = m.name;
    ui.$('mhHpFill').style.width = Math.max(0, c.hp / c.maxHp * 100) + '%';
    ui.$('mhHpTxt').textContent = `${Math.max(0, c.hp)} / ${c.maxHp}` + '';
    ui.$('mhHpTxt').innerHTML += c.mBlock ? `&nbsp;&nbsp;${G.ICON_ART && G.ICON_ART.block ? `<img class="chip-img" src="${G.ICON_ART.block}" alt="">` : ''}${c.mBlock}` : '';
    const chips = [];
    const T = (t) => m.traits.indexOf(t) >= 0;
    const ico = (name) => (G.ICON_ART && G.ICON_ART[name] ? `<img class="chip-img" src="${G.ICON_ART[name]}" alt="">` : '');   // a monster's own status picture
    if (T('dodgy')) chips.push(st.dodged ? ['good', ico('gob-dodge-used') + ' Dodge used up!'] : ['', ico('gob-dodgy') + ' Dodgy: first hit misses']);
    if (T('boneArmor')) chips.push(st.cracked > 0 ? ['good', ico('skel-cracked') + ' Armour cracked: hit now!'] : ['', ico('skel-armour') + ' Bone armour: hits do 1']);
    if (T('web')) chips.push(st.web ? ['', ico('spider-web') + ' Web: hits 4× weaker'] : ['good', ico('spider-burnt') + ' Web burned away!']);
    if ((T('farAway') || (T('witch') && c.phase === 1))) {   // Robin and the Witch each have their own pictures
      const frog = T('farAway');
      chips.push(st.close > 0 ? ['good', ico(frog ? 'arch-close' : 'gob-rush') + ` You are close! (${st.close})`]
        : ['', (frog ? ico('arch-far') : ico('witch-fly')) + (frog ? ' Far away: RANGED only' : ' Flying high: RANGED only')]);
    }
    if (T('counterGuard')) chips.push(it.t === 'guard' ? ['', ico('wolf-guard') + ' Guarding: hits bounce off!'] : it.t === 'tired' ? ['good', ico('wolf-tired') + ' Tired: DOUBLE damage!'] : ['', ico('wolf-chomp') + ' Big Chomp next: BLOCK!']);
    if (T('thickSkin')) chips.push(['', ico('troll-skin') + ' Thick skin: hits under 6 do 0']);
    if (T('magicMirror')) chips.push(st.mirror ? ['', ico('wiz-mirror') + ' Mirror: magic bounces!'] : ['good', ico('wiz-smashed') + ' Mirror smashed!']);
    if (T('armorPlates')) chips.push(st.plates > 0 ? ['', ico('kn-plates') + ` ${st.plates} plates: -${st.plates * 2} per hit`] : ['good', ico('kn-pop') + ' No plates left!']);
    if (T('witch') && c.phase === 2) chips.push(st.cracked > 0 ? ['good', ico('witch-popped') + ' Bubble popped: hit now!'] : ['', ico('witch-bubble') + ' Bubble: hits do 1']);
    if (st.chill) chips.push(['good', ico('chill') + ' Chilled: -2']);
    if (st.blind) chips.push(['good', ico('dizzy') + ' Blinded: half']);
    if (st.slip) chips.push(['good', ico('slip') + ' Will slip!']);
    if (st.band) for (let i = 0; i < st.band.length; i++) {   // the Bone Band: who is up, who is a pile of bones
      const b = st.band[i];
      const art = G.BAND_ART && G.BAND_ART.members[b.id], face = art && art.head ? `<img class="chip-img" src="${art.head}" alt="">` : ico({ boney: 'band-drum', tibia: 'band-trumpet', ribs: 'band-tune' }[b.id]);
      chips.push([b.down ? 'good' : '', `${i === st.front ? ui.ico('star', 'chip-img') + ' ' : ''}${b.down ? ico('band-down') : face} ${b.short} ${b.down ? 'down!' : b.hp + '/' + b.max}`]);
    }
    const box = ui.$('mhStatus'); box.innerHTML = '';
    for (const [k, t] of chips) { const e = ui.el('div', 'status ' + k, t); e.addEventListener('click', () => log(m.clue)); box.appendChild(e); }
    const ib = ui.$('mhIntent');
    const own = m.moveIcons && m.moveIcons[it.n], src = own && G.ICON_ART && G.ICON_ART[own];   // the monster's own picture for this move
    const icon = src ? `<img class="intent-img" src="${src}" alt="">`
      : ui.ico({ attack: 'kn-swing', block: 'block', heal: 'heart' }[it.t] || 'sparkle', 'intent-img');   // (every monster has its own move pictures)
    if (it.t === 'band') {
      const enc = st.band.some((b) => b.down) && st.band.some((b) => !b.down);
      ib.className = '';
      const up = (id) => !st.band.find((b) => b.id === id).down;   // knocked-down musicians are rebuilt but skip their turn
      const pic = (name, cls) => ui.ico(name, cls);
      const small = (name) => pic(name, 'band-img');
      const rest = ui.ico('troll-snore', 'band-img');   // a musician who was knocked down skips his turn
      ib.innerHTML = `<span style="font-size:14px;color:#b9adc9">Next move</span><span class="big">${pic('band-trumpet', 'intent-img')} ${up('tibia') ? 6 : rest}</span>` +
        `${enc ? small('band-encore') + ' Encore! ' : ''}${small('band-drum')}${up('boney') ? '+3' : rest} ${small('band-tune')}${up('ribs') ? '+3' : rest}`;
      return;
    }
    const atk = it.t === 'attack';
    const v = atk ? it.v + (st.cackle || 0) : it.v;
    ib.className = atk ? '' : 'calm';
    ib.innerHTML = `<span style="font-size:14px;color:#b9adc9">Next move</span><span class="big">${icon}${atk || it.t === 'block' || it.t === 'heal' ? ' ' + v : ''}</span>${it.n}`;
  }

  G.combatView = { renderAll, renderHud };
})();
