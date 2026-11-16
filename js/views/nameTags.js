/* VIEW — Names over the cursed friends (and Sir Sneezalot) once you come close: the renderer lists who is near and in
   sight (renderer.js sprites: this.tags, from NAME_FAR squares away), and each gets a little label over their head on
   top of the game picture. Freed friends show their freed name (Gobbo the Baker). Hidden during battles. */
(function () {
  let box = null; const tags = {};
  function nameOf(t) {
    if (t.kind === 'npc') return t.id === 'sneezalot' ? 'Sir Sneezalot' : t.name || '';   // Mildred: Shaggy Dog, then her name
    const m = G.MONSTERS[t.id]; if (!m) return '';
    return (G.state && G.state.flags['freed_' + t.id] && m.freedName) || m.name;
  }
  G.showNameTags = function (list) {
    if (!box) { const v = document.getElementById('view'); if (!v) return; box = document.createElement('div'); box.id = 'nameTags'; v.after(box); }
    const seen = {};
    for (const g of list) {
      const id = g.t.id || g.t.x + ',' + g.t.y; seen[id] = 1;
      let el = tags[id];
      if (!el) { el = tags[id] = document.createElement('div'); el.className = 'nameTag'; box.appendChild(el); }
      const name = nameOf(g.t); if (el.textContent !== name) el.textContent = name;
      const L = (g.x * 100).toFixed(1) + '%', T = (g.y * 100).toFixed(1) + '%', O = g.a.toFixed(2);
      if (el.style.left !== L) el.style.left = L;
      if (el.style.top !== T) el.style.top = T;
      if (el.style.opacity !== O) el.style.opacity = O;
      el.hidden = !name;
    }
    for (const id in tags) if (!seen[id]) { tags[id].remove(); delete tags[id]; }
  };
})();
