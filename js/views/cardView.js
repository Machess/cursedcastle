/* VIEW — Card faces (cursed or revealed). */
(function () {
  const ui = G.ui, $ = ui.$, el = ui.el, tap = ui.tap;
  ui.cardEl = function (inst, o = {}) {
    const d = G.cardDef(inst);
    const c = el('div', `card ${d.type}${o.hand ? ' hand' : ''}${o.cursed ? ' cursed' : ''}${o.unplayable ? ' unplayable' : ''}${o.cls ? ' ' + o.cls : ''}${d.gold ? ' gold' : ''}`);
    const val = o.value != null ? o.value : '?';
    // in the hand the range goes into the text ("Deal 4–7 damage."); elsewhere the ? bubble shows it
    const txt = d.text.replace('?', o.value != null ? o.value : o.hand ? `${d.min}–${d.max}` : '?');
    const tags = d.tags.filter((t) => t !== 'BUFF' && t !== 'TRICK').map((t) => G.TAG_INFO[t]).join(' · ') || { attack: 'Attack', block: 'Block', skill: 'Skill' }[d.type];
    const art = G.CARD_ART && G.CARD_ART[inst.id];   // picture of the hero doing the move; emoji until a card has one
    const pic = art ? `<img src="${art}" alt="" draggable="false">` : G.ui.ico("sparkle", "ic");
    c.innerHTML = `<div class="cost">${d.cost}</div><div class="nm">${d.name}</div><div class="pic">${pic}</div>` +
      `<div class="valrow"><div class="val">${val}</div>${o.value != null || o.noRange ? '' : '<div class="rng">' + d.min + '–' + d.max + '</div>'}</div>` +
      `<div class="tx${txt.length > (o.hand ? 34 : 28) ? ' long' : ''}">${txt}</div><div class="tg${tags.length > 12 ? ' long' : ''}">${tags}</div>` + (o.lock ? `<div class="lock">${o.lock}</div>` : '');
    return c;
  };
  /* what the keywords on these cards do (the same words every time; see G.TAG_DOES in cards.js) */
  ui.keywordLegend = function (cardIds) {
    const has = new Set(); cardIds.forEach((id) => G.CARDS[id].tags.forEach((t) => has.add(t)));
    const rows = G.TAG_DOES.filter(([t]) => has.has(t));
    const box = el('div', 'kw-legend');
    box.innerHTML = rows.map(([t, l]) => `<span><b>${G.TAG_INFO[t]}</b> ${l}</span>`).join('');
    return box;
  };
})();
