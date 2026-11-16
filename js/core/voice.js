/* Voices: recorded lines (voiceList.js, the audio in assets/voice/<id>.js, made by tools-src/prepare_voice.py).
   G.voice.say(id) -> a promise of the clip's length in seconds (0 when there is no voice: off, or not recorded yet).
   G.voice.sayList([ids]) plays clips one after the other as one sentence (puzzles: "What is" + 4 + "plus" + 3).
   G.voice.puzzleIds(p) = the clips that read a puzzle aloud; G.voice.num(n) = the clips that say a number (0 to 199).
   One line plays at a time; a new line or G.voice.stop() cuts the old one off. Played through the game's sound
   engine (core/audio.js), so it works offline from file:// on the tablet. Settings: G.settings.voice (and sound). */
(function () {
  const data = {}, buffers = {}, loading = {};
  let current = null, onEnd = null, extra = [];
  G.voiceData = (id, b64) => { data[id] = b64; if (loading[id]) loading[id].res(); };
  const PIECE = /^pip-(num|w)-/;
  const has = (id) => !!(id && G.VOICE_LIST && G.VOICE_LIST[id]);
  const on = () => G.settings && G.settings.sound !== false && G.settings.voice !== false;

  function loadScript(id) {                              // the clip's little data file
    if (data[id]) return Promise.resolve();
    if (!loading[id]) {
      let res; const p = new Promise((r) => { res = r; });
      loading[id] = { p, res };
      const s = document.createElement('script'); s.src = 'assets/voice/' + id + '.js';
      s.onerror = () => res(); document.head.appendChild(s);
    }
    return loading[id].p;
  }
  async function buffer(id) {
    if (buffers[id]) return buffers[id];
    await loadScript(id);
    const ac = G.audio.ctx(); if (!ac || !data[id]) return null;
    const bin = atob(data[id]), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    try { buffers[id] = await new Promise((ok, bad) => ac.decodeAudioData(u.buffer, ok, bad)); } catch (e) { return null; }
    return buffers[id];
  }
  G.voice = {
    has: (id) => has(id) && on(),
    /* load these ahead (e.g. the whole intro), so the first line starts straight away */
    preload(ids) { for (const id of ids) if (has(id)) loadScript(id); },
    async say(id, ended) {
      G.voice.stop();
      if (!has(id) || !on()) return 0;
      G.audio.unlock();
      const want = id; G.voice.want = id;
      const b = await buffer(id);
      if (!b || G.voice.want !== want) return 0;                // cut off while loading
      const ac = G.audio.ctx(); if (ac.state === 'suspended') ac.resume();
      const src = ac.createBufferSource(), g = ac.createGain();
      g.gain.value = 1; src.buffer = b; src.connect(g); g.connect(ac.destination);
      current = src; onEnd = ended || null;
      src.onended = () => { if (current === src) { current = null; const f = onEnd; onEnd = null; f && f(); } };
      src.start();
      return b.duration;
    },
    stop() {
      G.voice.want = null;
      if (current) { const c = current; current = null; onEnd = null; try { c.stop(); } catch (e) {} }
      for (const c of extra.splice(0)) try { c.stop(); } catch (e) {}
    },
    /* several clips as one sentence: scheduled back to back on the sound engine's clock (a little overlap for pieces) */
    async sayList(ids, ended) {
      G.voice.stop();
      ids = (ids || []).filter((id) => id === '|' || has(id)); if (!on() || !ids.some((id) => id !== '|')) return 0;
      G.audio.unlock();
      const want = ids.join(','); G.voice.want = want;
      const bufs = await Promise.all(ids.map((id) => (id === '|' ? null : buffer(id))));
      if (G.voice.want !== want) return 0;
      const ac = G.audio.ctx(); if (ac.state === 'suspended') ac.resume();
      let t = ac.currentTime + 0.03; const t0 = t; let last = null;
      ids.forEach((id, k) => {
        if (id === '|') { t += 0.22; return; }                    // a short pause (after a hint, before the sum)
        const b = bufs[k]; if (!b) return;
        const src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination); src.start(t);
        extra.push(src); last = src;
        t += b.duration - (PIECE.test(id) ? 0.04 : 0) + 0.02;
      });
      if (last) { current = last; onEnd = ended || null; last.onended = () => { if (current === last) { current = null; extra = []; const f = onEnd; onEnd = null; f && f(); } }; }
      return t - t0;
    },
    /* the clips that say a number: 0-20 and the tens are recorded; 47 = forty + seven, 105 = one hundred + and + five */
    num(n) {
      n = Math.round(n); if (n < 0 || n > 199) return [];
      if (n <= 20) return ['pip-num-' + n];
      if (n < 100) { const t = Math.floor(n / 10) * 10, o = n % 10; return o ? ['pip-num-' + t, 'pip-num-' + o] : ['pip-num-' + t]; }
      const r = n - 100; return r ? ['pip-num-100', 'pip-w-and', ...G.voice.num(r)] : ['pip-num-100'];
    },
    /* a curse puzzle (models/puzzles.js): its hint ("Brackets first!"), then the sum read out ("4 plus what equals 9?") */
    puzzleIds(p) {
      const say = p.say || '', ids = [], whatIs = /^What is /.test(say), hint = !whatIs && G.VOICE_TEXT && G.VOICE_TEXT[say];
      if (whatIs) ids.push('pip-w-what-is');
      else if (hint) ids.push(hint, '|');
      if (/^How many/.test(p.q)) { ids.push('pip-w-how-many'); return ids; }
      const tk = p.q.match(/\d+|Half of|[+−×÷=?(),-]/g) || [];
      for (let i = 0; i < tk.length; i++) {
        const t = tk[i], prev = tk[i - 1];
        if (/^\d+$/.test(t)) ids.push(...G.voice.num(+t));
        else if (t === '+') ids.push('pip-w-plus');
        else if (t === '−' || t === '-') ids.push('pip-w-take-away');
        else if (t === '×') ids.push('pip-w-times');
        else if (t === '÷') ids.push(prev === ')' ? 'pip-w-all-divided-by' : 'pip-w-divided-by');
        else if (t === 'Half of') ids.push('pip-w-half-of');
        else if (t === '=') { if (tk[i + 1] === '?') { if (!whatIs) ids.push('pip-w-equals-what'); i++; } else ids.push('pip-w-equals'); }
        else if (t === '?') { if (prev === ',') { if (!(hint && /next/i.test(say))) ids.push('pip-w-what-next'); } else ids.push('pip-w-what'); }
      }
      return ids;
    },
    /* the voice for a line of game text, if it has one */
    forText(text) {
      const T = G.VOICE_TEXT; if (!T || !text) return null;
      if (T[text]) return T[text];
      // a recorded line at the start of longer text: '"Squeak! Thank you!..."  You got: Royal Cheese.'
      const t = text.replace(/^"/, ''); let best = null;
      for (const k in T) if (k.length > 20 && (t.startsWith(k) || t.startsWith(k.replace(/^"/, ''))) && (!best || k.length > best.length)) best = k;
      return best ? T[best] : null;
    },
    playing: () => !!current,
  };
})();
