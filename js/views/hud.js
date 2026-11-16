/* VIEW — Hero card, bag (inventory) and item pop-up. */
(function () {
  const ui = G.ui, $ = ui.$, el = ui.el, tap = ui.tap;
  /* ---------- hero panel ---------- */
  ui.renderHero = function () {
    const s = G.state; if (!s) return;
    const cls = G.CLASSES[s.cls];
    const look = G.heroLook();
    $('heroCard').style.setProperty('--hc', G.lookColour ? G.lookColour(look) : cls.color);
    ui.fitText($('hcName'), s.name || cls.name, 30);
    const icon = G.CREATOR_UI && G.CREATOR_UI.icons[s.cls];
    $('hcCls').innerHTML = (icon ? `<img src="${icon}" alt="">` : '') + `<span>${s.name ? cls.name : cls.title}</span>`;
    G.drawHero($('hcImg'), look, 'portrait', G.faceFrame && G.faceFrame());   // the hero you chose, with his face of the moment (portraitView.js)
    const max = G.maxHp();
    const pct = Math.max(0, s.hp / max * 100);
    $('hcHpFill').style.width = pct + '%'; $('hcHpFill').classList.toggle('low', pct < 35);
    const heart = G.ICON_ART && G.ICON_ART.heart ? `<img class="hp-img" src="${G.ICON_ART.heart}" alt="">` : '';
    $('hcHpTxt').innerHTML = `${heart} ${s.hp} / ${max}`;
    $('hcDeckCount').textContent = `(${s.deck.length})`;
    $('btnDeck').classList.toggle('hidden', !!(G.combat && G.combat.active));   // in a battle the energy coins sit there
    const cb = G.combat && G.combat.active ? G.combat : null;
    $('hcBlock').classList.toggle('hidden', !cb || !cb.block);
    if (!$('hcBlock').dataset.art) { $('hcBlock').dataset.art = 1; $('hcBlock').innerHTML = '<span></span>'; }   // the blue shield badge is its background
    if (cb) $('hcBlock').querySelector('span').textContent = cb.block;
    $('hcEnergy').classList.toggle('hidden', !cb);
    if (cb) {
      let h = ''; for (let i = 0; i < Math.max(cb.maxEnergy, cb.energy); i++)   // the energy coins (ui/kit): gold = ready, grey = spent
        h += `<img class="coin" src="assets/img/ui/kit/${i < cb.energy ? 'coin' : 'coin-empty'}.webp" alt="">`;
      $('hcEnergy').innerHTML = h;
      $('hcPiles').textContent = `${cb.draw.length} cards left to draw`;
    } else $('hcPiles').textContent = '';
    const buffs = $('hcBuffs'); buffs.innerHTML = '';
    if (cb) {
      if (cb.power) buffs.appendChild(el('span', 'status good', `${G.ICON_ART && G.ICON_ART.power ? `<img class="chip-img" src="${G.ICON_ART.power}" alt="">` : ''} Next hit +${cb.power}`));
      if (cb.streak >= 2) buffs.appendChild(el('span', 'status good', `<img class="chip-img" src="assets/img/ui/kit/star.webp" alt=""> ${cb.streak} in a row!`));
    }
  };

  /* ---------- inventory ---------- */
  ui.renderInventory = function () {
    const s = G.state; const box = $('invList'); box.innerHTML = '';
    // the slots are pictured in the background (two rows of four per kind); only the items are drawn here
    const SL = G.GAME_UI.slots;
    G.ITEM_CATS.forEach(([cat], ci) => {
      const ids = Object.keys(s.items).filter((k) => s.items[k] > 0 && G.ITEMS[k].cat === cat).slice(0, 8);
      ids.forEach((id, i) => {
        const sl = el('div', 'slot has');
        Object.assign(sl.style, { left: SL.x[i % 4] + 'px', top: SL.y[ci * 2 + (i >> 2)] + 'px', width: SL.w + 'px', height: SL.h + 'px' });
        sl.innerHTML = ui.itemIcon(id) + (s.items[id] > 1 ? `<span class="n">${s.items[id]}</span>` : '');
        tap(sl, () => ui.itemInfo(id));
        box.appendChild(sl);
      });
    });
  };
  /* an item's picture (icons from roomArt.js), or its emoji until it has one */
  ui.itemIcon = function (id) {
    const it = G.ITEMS[id], src = it.img || (it.art && G.ICON_ART && G.ICON_ART[it.art]);
    return src ? `<img class="item-img" src="${src}" alt="${it.name}" draggable="false">` : "";
  };
  ui.itemInfo = function (id) {
    const it = G.ITEMS[id]; const box = el('div');
    box.innerHTML = `<div class="item-big">${ui.itemIcon(id)}</div><h2>${it.name}</h2><div class="sub">${it.text}</div>`;
    const row = el('div', 'row');
    const inCombat = G.combat && G.combat.active;
    if (it.use && (!it.combatOnly || inCombat)) {
      const b = el('button', 'btn green', 'Use it'); tap(b, () => { ui.closeModal(); G.useItem(id); }); row.appendChild(b);
    } else if (it.combatOnly) row.appendChild(el('div', 'sub', 'You can use this during a battle.'));
    const c = el('button', 'btn', 'Close'); tap(c, () => ui.closeModal()); row.appendChild(c);
    box.appendChild(row);
    ui.modal(box, { note: true });
  };

})();
