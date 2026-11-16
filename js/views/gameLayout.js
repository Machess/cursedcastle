/* VIEW — Puts every live part of the game screen where the design drew it (G.GAME_UI from gameUiArt.js).
   Positions are screen pixels (x, y, w, h); the background picture already has the frames, labels and buttons. */
(function () {
  const ui = G.ui, $ = ui.$;
  const place = (e, [x, y, w, h], ox = 0, oy = 0) => { Object.assign(e.style, { left: x - ox + 'px', top: y - oy + 'px', width: w + 'px', height: h + 'px' }); return e; };
  /* text that must fit on one line in a fixed space (room ribbon, hero name): shrink the font until it does */
  ui.fitText = function (e, text, max, min = 12) {
    e.textContent = text; let f = max; e.style.fontSize = f + 'px';
    while (e.scrollWidth > e.clientWidth + 1 && f > min) e.style.fontSize = --f + 'px';
  };
  ui.setRoomName = (name) => ui.fitText($('roomName'), name, 19);
  G.layoutGame = function () {
    const L = G.GAME_UI; if (!L) return;
    const S = L.spots;
    $('game').style.backgroundImage = `url('${L.bg}')`;
    // 3D view, with the frame (and the banners hanging over it) on top
    place($('viewport'), S.view);
    const f = $('vpFrame'); f.src = L.viewFrame; place(f, S.viewCrop, S.view[0], S.view[1]);
    // text box: the parchment; title in the ribbon, speaker portrait in its frame
    const P = S.parchment; place($('textbox'), P);
    place($('cardsPanel'), [273, 441, 691, 331]);   // the battle's "Your Cards" panel (cards-panel.webp) over the text area
    place($('tbTitle'), S.title, P[0], P[1]); place($('tbSpeaker'), S.portrait, P[0], P[1]);
    // bag slots are made by hud.js at G.GAME_UI.slots; the map and its ribbon
    place($('inventory'), [0, 0, 260, 520]);
    place($('minimapWrap'), S.map); const mm = $('minimap'); mm.width = Math.round(S.map[2]); mm.height = Math.round(S.map[3]);
    place($('roomName'), S.roomName);
    // hero card
    place($('hcName'), S.heroName); place($('hcCls'), S.heroCls); place($('hcImg'), S.portraitIn);
    $('hcImg').width = Math.round(S.portraitIn[2] * 1.5); $('hcImg').height = Math.round(S.portraitIn[3] * 1.5);
    place($('hcHp'), S.hp); place($('btnDeck'), S.deckBtn); place($('hcDeckCount'), S.deckN, S.deckBtn[0], S.deckBtn[1]);
    place($('hcEnergy'), S.deckBtn);
    const pi = S.portraitIn; place($('hcBuffs'), [pi[0], pi[1] + pi[3] - 34, pi[2], 30]);
    place($('hcBlock'), [pi[0] + pi[2] - 60, pi[1] - 8, 70, 72]);   // top-right corner of the portrait
    // move pad (tap areas over the pictured buttons), menu buttons, the battle pad over the arrows
    document.querySelectorAll('#navPad .nav').forEach((b) => place(b, S[b.dataset.act]));
    for (const id of ['btnMap', 'btnJournal', 'btnDeck2', 'btnPause']) place($(id), S[id]);
    const m0 = S.btnMap, m3 = S.btnPause; place($('mbtnDim'), [m0[0], m0[1], m3[0] + m3[2] - m0[0], m0[3]]);
    place($('combatPad'), S.padArea);
  };
})();
