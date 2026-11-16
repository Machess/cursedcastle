/* CONTROLLER — Touch buttons, swipes on the 3D view, keyboard. */
(function () {

  /* ---------- input ---------- */
  G.bindInput = function () {
    document.querySelectorAll('.nav').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); G.audio.unlock(); b.classList.add('on'); G.act(b.dataset.act); });
      const off = () => b.classList.remove('on'); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off);
    });
    const vp = G.ui.$('viewport'); let sx = 0, sy = 0, st = 0;
    vp.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); });
    vp.addEventListener('pointerup', (e) => {
      const sc = G.scale || 1; const dx = (e.clientX - sx) / sc, dy = (e.clientY - sy) / sc;
      if (performance.now() - st > 700) return;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) G.act(dx < 0 ? 'turnR' : 'turnL');
      else if (dy < -60) G.act('fwd');
      else if (dy > 60) G.act('back');
      else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !G.busy()) G.tapView(e.clientX, e.clientY);   // poke what you tapped (poke.js)
    });
    window.addEventListener('keydown', (e) => {
      if (G.screen !== 'game') return;
      const map = { ArrowUp: 'fwd', KeyW: 'fwd', ArrowDown: 'back', KeyS: 'back', KeyA: 'left', KeyD: 'right', ArrowLeft: 'turnL', KeyQ: 'turnL', ArrowRight: 'turnR', KeyE: 'turnR' };
      if (map[e.code]) { e.preventDefault(); G.act(map[e.code]); }
      if (e.code === 'Escape') G.onBack();
    });
  };
})();
