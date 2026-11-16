/* VIEW — Stair pictures, drawn from the Spiral Stairs room's own stone (no image files needed):
   - DOOR_TEX.u: stairs going UP, seen through a stone arch (behind the Moon Door)
   - DOOR_TEX.v: stairs going DOWN into the dark (the top of the tower)
   - TEX.stairwell: the inside of the spiral stairwell; one stone ledge per picture. The renderer shifts it step by step
     round the well (renderer.js, world.spiral), so the ledges make a spiral, and scrolls it as you climb. */
(function () {
  const S = () => G.TEX_SIZE || 128;
  function canvasFrom(px) {
    const c = document.createElement('canvas'); c.width = c.height = S();
    const x = c.getContext('2d', { willReadFrequently: true });
    x.putImageData(new ImageData(new Uint8ClampedArray(px.buffer.slice(0)), S(), S()), 0, 0);
    return [c, x];
  }
  const out = (x) => new Uint32Array(x.getImageData(0, 0, S(), S()).data.buffer.slice(0));
  const sc = (v) => Math.round(v * S() / 128);          // drawn on a 128 grid

  function arch(x, inner) {                             // a stone arch with a dark opening; inner() draws inside it
    x.save();
    x.beginPath(); x.moveTo(sc(26), sc(128)); x.lineTo(sc(26), sc(52)); x.arc(sc(64), sc(52), sc(38), Math.PI, 0); x.lineTo(sc(102), sc(128)); x.closePath();
    x.clip(); inner(); x.restore();
    x.lineWidth = sc(7); x.strokeStyle = '#4a4250';
    x.beginPath(); x.moveTo(sc(26), sc(128)); x.lineTo(sc(26), sc(52)); x.arc(sc(64), sc(52), sc(38), Math.PI, 0); x.lineTo(sc(102), sc(128)); x.stroke();
    x.lineWidth = sc(2); x.strokeStyle = '#8a7f96';
    x.beginPath(); x.moveTo(sc(22), sc(128)); x.lineTo(sc(22), sc(52)); x.arc(sc(64), sc(52), sc(42), Math.PI, 0); x.lineTo(sc(106), sc(128)); x.stroke();
    for (let i = 0; i < 7; i++) {                         // the arch's stones
      const a = Math.PI + (i + 0.5) * Math.PI / 7;
      x.beginPath(); x.moveTo(sc(64) + Math.cos(a) * sc(35), sc(52) + Math.sin(a) * sc(35)); x.lineTo(sc(64) + Math.cos(a) * sc(42), sc(52) + Math.sin(a) * sc(42)); x.stroke();
    }
  }

  G.makeStairArt = function () {
    const st = G.TEX.stairs; if (!st || !st.walls) return;
    const base = st.walls[0];
    // stairs going up: steps climbing away and curving right, warm light from above
    let [c, x] = canvasFrom(base);
    arch(x, () => {
      const g = x.createLinearGradient(0, sc(14), 0, sc(128)); g.addColorStop(0, '#f2c45a'); g.addColorStop(0.35, '#3a2c3a'); g.addColorStop(1, '#16101c');
      x.fillStyle = g; x.fillRect(0, 0, S(), S());
      for (let i = 0; i < 9; i++) {
        const y = sc(124 - i * 11), w = sc(76 - i * 5), cx = sc(64 + i * 2.2), h = sc(11);
        x.fillStyle = `rgb(${70 + i * 9},${62 + i * 8},${80 + i * 6})`; x.fillRect(cx - w / 2, y - h, w, h);           // riser
        x.fillStyle = `rgb(${130 + i * 10},${120 + i * 9},${135 + i * 7})`; x.fillRect(cx - w / 2, y - h, w, sc(3));    // tread edge
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(cx + w / 2 - sc(6), y - h, sc(6), h);
      }
    });
    G.DOOR_TEX.u = out(x);
    // stairs going down: treads dropping away into darkness
    [c, x] = canvasFrom(base);
    arch(x, () => {
      x.fillStyle = '#07040a'; x.fillRect(0, 0, S(), S());
      for (let i = 0; i < 8; i++) {
        const y = sc(126 - i * 7), w = sc(78 - i * 6), cx = sc(64 - i * 1.8), h = sc(7 - i * 0.4), k = 1 - i * 0.12;
        x.fillStyle = `rgb(${Math.round(150 * k)},${Math.round(138 * k)},${Math.round(150 * k)})`; x.fillRect(cx - w / 2, y - h, w, h);
        x.fillStyle = `rgba(0,0,0,${0.2 + i * 0.08})`; x.fillRect(cx - w / 2, y - h, w, sc(1.5));
      }
      const g = x.createLinearGradient(0, sc(60), 0, sc(128)); g.addColorStop(0, 'rgba(5,3,8,1)'); g.addColorStop(0.7, 'rgba(5,3,8,0)');
      x.fillStyle = g; x.fillRect(0, 0, S(), S());
    });
    G.DOOR_TEX.v = out(x);
    // the stairwell wall: the stone, with one ledge (tread + riser + shadow) near the bottom of the picture
    [c, x] = canvasFrom(base);
    for (const y0 of [36, 100]) {                       // two ledges per storey
      x.fillStyle = 'rgba(10,6,16,.45)'; x.fillRect(0, sc(y0 - 4), S(), sc(4));         // the shadow of the step above
      x.fillStyle = 'rgba(225,212,232,.95)'; x.fillRect(0, sc(y0), S(), sc(5));          // tread (lit edge)
      x.fillStyle = 'rgba(132,118,142,.96)'; x.fillRect(0, sc(y0 + 5), S(), sc(14));     // riser
      x.fillStyle = 'rgba(60,50,70,.9)'; x.fillRect(0, sc(y0 + 19), S(), sc(3));
      x.fillStyle = 'rgba(10,6,16,.5)'; x.fillRect(0, sc(y0 + 22), S(), sc(8));          // shadow under the ledge
    }
    G.TEX.stairwell = { walls: [out(x)], variants: [null], floor: st.floor, ceil: st.ceil || st.floor };
  };
})();
