/* CONTROLLER — Hero profiles: every play-through is its own hero, saved on the device (models/state.js).
   Title: no heroes yet -> "New Adventure" goes straight to the story. Heroes saved -> "Play" opens the hero chooser:
   tap a hero to carry on, the parchment card to start a new hero, the bin to say goodbye to one. */
(function () {
  const ui = G.ui, el = ui.el;
  const ago = (t) => {
    const d = Math.floor((Date.now() - t) / 86400000);
    return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
  };
  function heroCard(p, last) {
    const c = el('div', 'pf-card' + (p.id === last ? ' last' : ''));
    const cv = document.createElement('canvas'); cv.width = 216; cv.height = 168; cv.className = 'pf-pic';
    G.drawHero(cv, G.normLook(p.look || G.DEFAULT_LOOKS[p.cls]), 'portrait');
    const icon = G.CREATOR_UI && G.CREATOR_UI.icons[p.cls], key = G.ICON_ART && G.ICON_ART.moonkey;
    const info = el('div', 'pf-info');
    info.innerHTML = `<div class="pf-name">${p.name}</div>` +
      `<div class="pf-cls">${icon ? `<img src="${icon}" alt="">` : ''}${G.CLASSES[p.cls].name}</div>` +
      `<div class="pf-prog">${p.beaten ? `${ui.ico('crown')} Castle saved!` : `${key ? `<img src="${key}" alt="">` : ''} ${p.keys}/3 &nbsp; ${ui.ico('star')} ${p.freed} freed${p.secrets ? ` &nbsp; ${ui.ico('map')} ${p.secrets}/4` : ''}`}${p.hunter ? ` &nbsp; ${ui.ico('crown')} Treasure Hunter` : ''}</div>` +
      `<div class="pf-when">${p.where ? p.where + ' · ' : ''}${ago(p.played)}</div>`;
    c.append(cv, info);
    if (p.id === last) c.appendChild(el('div', 'pf-tag', 'Last played'));
    ui.tap(c, () => { G.audio.unlock(); ui.closeModal(); if (G.loadGame(p.id)) G.enterGame(false); });
    const bin = el('button', 'pf-bin', ui.svg.bin); bin.setAttribute('aria-label', 'Delete ' + p.name);
    ui.tap(bin, () => confirmDelete(p));
    c.appendChild(bin);
    return c;
  }
  function newCard(full) {
    const c = el('div', 'pf-card pf-new' + (full ? ' full' : ''));
    c.innerHTML = full ? `<div class="pf-plus">${ui.ico('badge')}</div><div class="pf-name">All full!</div><div class="pf-when">Say goodbye to a hero to make room.</div>`
      : '<div class="pf-plus">＋</div><div class="pf-name">New Hero</div><div class="pf-when">Start a brand new adventure</div>';
    if (!full) ui.tap(c, () => { G.audio.unlock(); ui.closeModal(); G.startNewHero(); });
    return c;
  }
  function confirmDelete(p) {
    const box = el('div');
    box.innerHTML = `<h2>Say goodbye to ${p.name}?</h2><div class="sub">This adventure will be gone forever.</div>`;
    const row = el('div', 'row');
    const keep = el('button', 'btn', 'Keep'); ui.tap(keep, () => G.showProfiles());
    const del = el('button', 'btn red', ui.svg.bin + ' Delete'); ui.tap(del, () => { G.deleteProfile(p.id); G.refreshTitle(); if (G.hasSave()) G.showProfiles(); else ui.closeModal(); });
    row.append(keep, del); box.appendChild(row);
    ui.modal(box, { note: true, close: false });
  }
  G.showProfiles = function () {
    const list = G.profiles(), last = G.lastProfile();
    const box = el('div', 'pf');
    box.appendChild(el('div', 'sub', 'Who is going on an adventure today?'));
    const grid = el('div', 'pf-grid');
    list.forEach((p) => grid.appendChild(heroCard(p, last)));
    grid.appendChild(newCard(list.length >= G.MAX_PROFILES));
    box.appendChild(grid);
    ui.modal(box, { frame: 'Choose Your Hero' });
  };
  G.startNewHero = () => G.playIntro(() => G.showClassSelect());
  /* title buttons: "New Adventure" with no heroes, "Play" (opens the chooser) once there is one */
  G.refreshTitle = function () {
    const any = G.hasSave();
    ui.$('btnNew').innerHTML = any ? 'Play' : 'New Adventure';
  };
  G.bindProfiles = function () {
    ui.tap(ui.$('btnNew'), () => { G.audio.unlock(); if (G.hasSave()) G.showProfiles(); else G.startNewHero(); });
    G.refreshTitle();
  };
})();
