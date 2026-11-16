/* Tiny synth sound effects (no audio files needed). */
(function () {
  let ac = null, master = null, noiseBuf = null;
  const A = { on: true };
  G.audio = A;

  A.unlock = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    ac = new C(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  };
  A.ctx = () => ac;                                  // the sound engine (voice.js plays the recorded lines through it)
  A.setOn = function (v) { A.on = v; if (master) master.gain.value = v ? 0.5 : 0; };

  function tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0) {
    if (!ac || !A.on) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.2, freq = 800, type = 'lowpass', delay = 0) {
    if (!ac || !A.on) return;
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  A.step = () => noise(0.09, 0.18, 500 + Math.random() * 200);
  A.turn = () => noise(0.12, 0.06, 2400, 'bandpass');
  A.bonk = () => { tone(140, 0.18, 'sine', 0.35, -60); noise(0.06, 0.2, 300); };
  A.door = () => { tone(180, 0.5, 'sawtooth', 0.05, 140); tone(260, 0.4, 'sawtooth', 0.03, -90, 0.15); };
  /* doors: each kind opens with its own sound, all shut with a soft thud */
  A.doorOpen = (t) => {
    if (t === 'glass') { [1400, 1700, 2100].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, 0, i * 0.06)); noise(0.3, 0.06, 3000, 'bandpass'); return; }   // tinkle + slide
    if (t === 'curtain') { noise(0.45, 0.14, 1800, 'bandpass'); return; }                                                                  // swish
    if (t === 'toy') { [523, 659, 784, 988].forEach((f, i) => tone(f, 0.08, 'square', 0.05, 60, i * 0.07)); return; }                     // a giggle
    if (t === 'wheel') { noise(0.9, 0.2, 180); tone(70, 0.8, 'sawtooth', 0.05, -20); return; }                                            // rumble
    if (t === 'bookcase') { noise(0.6, 0.14, 600); tone(130, 0.5, 'sawtooth', 0.03, 40); return; }                                        // scrape
    if (t === 'portcullis') t = 'g';
    if (t === 'g' || t === 'm') { tone(90, 0.7, 'sawtooth', 0.05, 30); noise(0.6, 0.12, 400); for (let i = 0; i < 5; i++) tone(300 + i * 40, 0.05, 'square', 0.03, 0, i * 0.11); }   // heavy, clanking
    else if (t === 'r') { A.sparkle(); tone(200, 0.6, 'sawtooth', 0.04, 160, 0.1); }
    else { tone(180, 0.5, 'sawtooth', 0.05, 140); tone(260, 0.4, 'sawtooth', 0.03, -90, 0.15); }   // creak
  };
  A.doorShut = () => { tone(95, 0.22, 'sine', 0.3, -40); noise(0.1, 0.25, 350); };
  /* a short fanfare when you walk into a room (bigger the first time) */
  A.fanfare = (big) => { (big ? [523, 659, 784, 1047] : [659, 988]).forEach((f, i) => tone(f, big && i === 3 ? 0.45 : 0.15, 'triangle', 0.12, 0, i * 0.11)); };
  /* footsteps that sound like the floor: stone, wood, carpet, grass, tile */
  A.stepOn = (k) => {
    const r = Math.random();
    if (k === 'wood') { tone(110 + r * 30, 0.07, 'sine', 0.22, -30); noise(0.05, 0.1, 500); }
    else if (k === 'carpet') noise(0.08, 0.09, 280 + r * 80);
    else if (k === 'grass') noise(0.12, 0.08, 2600 + r * 600, 'bandpass');
    else if (k === 'tile') { tone(1500 + r * 300, 0.025, 'square', 0.025); noise(0.06, 0.12, 900); }
    else noise(0.09, 0.18, 500 + r * 200);
  };
  A.thunder = (d = 0) => { noise(1.6, 0.5, 220, 'lowpass', d); noise(0.5, 0.35, 900, 'lowpass', d); };
  A.click = () => tone(660, 0.05, 'square', 0.06);
  A.whoosh = () => { noise(0.9, 0.3, 700, 'bandpass'); tone(500, 0.8, 'sine', 0.06, -380); };   // down the slide
  A.clunk = () => { tone(150 + Math.random() * 30, 0.09, 'square', 0.08, -40); noise(0.06, 0.16, 600); };   // a ladder rung
  A.blip = () => tone(520 + Math.random() * 160, 0.035, 'square', 0.035);   // typewriter letters
  A.card = () => { noise(0.08, 0.1, 3000, 'highpass'); tone(520, 0.06, 'triangle', 0.08); };
  A.good = () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.14, 0, i * 0.07)); };
  A.bad = () => { tone(300, 0.35, 'sawtooth', 0.09, -180); tone(200, 0.4, 'square', 0.05, -100, 0.1); };
  A.hit = () => { noise(0.15, 0.35, 1200); tone(110, 0.12, 'square', 0.15, -40); };
  A.hurt = () => { tone(240, 0.25, 'square', 0.12, -120); noise(0.12, 0.2, 700); };
  A.block = () => { tone(880, 0.08, 'square', 0.07); tone(1320, 0.12, 'triangle', 0.06, 0, 0.04); };
  A.miss = () => noise(0.25, 0.12, 3000, 'bandpass');
  A.pop = () => { tone(900, 0.12, 'sine', 0.2, 900); noise(0.08, 0.2, 4000, 'highpass'); };
  A.sparkle = () => { for (let i = 0; i < 6; i++) tone(1200 + i * 220, 0.12, 'triangle', 0.06, 0, i * 0.05); };
  A.win = () => { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, 0, i * 0.12)); };
  A.snore = () => { tone(90, 0.8, 'sawtooth', 0.06, 40); };
  A.note = (i) => tone([330, 392, 494, 587][i % 4], 0.35, 'triangle', 0.18);
  A.squeak = () => tone(1400, 0.15, 'sine', 0.12, 600);
  A.sweep = () => { noise(0.22, 0.16, 2600, 'highpass'); noise(0.18, 0.12, 1800, 'bandpass', 0.16); };   // the broom
  A.splash = () => { noise(0.3, 0.2, 900, 'bandpass'); tone(700, 0.12, 'sine', 0.06, -300, 0.05); };     // the mop, the watering can
  A.bark = () => { tone(430, 0.09, 'square', 0.07, -160); tone(400, 0.11, 'square', 0.07, -170, 0.16); };   // a shaggy dog
  A.sneeze = () => { tone(420, 0.18, 'triangle', 0.07, 160); tone(520, 0.2, 'triangle', 0.07, 200, 0.2);
    noise(0.35, 0.4, 2600, 'bandpass', 0.42); tone(220, 0.25, 'square', 0.06, -120, 0.42); noise(0.5, 0.12, 900, 'lowpass', 0.5); };
})();
