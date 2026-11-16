/* CONTROLLER — The story intro: Pip the messenger owl explains what happened, with typewriter text.
   New Adventure -> G.playIntro -> hero select -> G.introGoodbye -> the game. Tap/Space: finish the line, then next line. */
(function () {
  const ui = G.ui;
  // mood = Pip's picture (introArt.js), bg = story picture behind him (null = the stormy castle from the title screen)
  const STORY = [
    { voice: 'pip-story-1', mood: 'happy', bg: null, text: 'Hoo-hoo! A hero, at last! I am Pip, the royal messenger owl.' },
    { voice: 'pip-story-2', mood: 'worried', bg: 'witch', text: 'Last night, Wanda the Witch zoomed over Moonstone Castle on her broom... and ZAP! She cursed everyone inside!' },
    { voice: 'pip-story-3', mood: 'sad', bg: 'bubbles', text: 'The chef, the baker, the gardener... all grumpy, all stuck in purple curse bubbles!' },
    { voice: 'pip-story-4', mood: 'surprised', bg: null, text: 'Even your cards are cursed! The only way to break a curse is to solve its puzzle.' },
    { voice: 'pip-story-5', mood: 'determined', bg: 'keys', text: 'Find the three Moon Keys, open the Moon Door, and stop Wanda before she reaches the Dragon\'s mountain!' },
    { voice: 'pip-story-6', mood: 'curious', bg: null, text: 'But wait... who ARE you, brave hero?' },
  ];
  const SPEED = 28;                                  // ms per letter

  let lines = [], i = 0, shown = 0, typing = null, talk = null, done = null, flashT = null;
  const $ = (id) => ui.$(id);
  const art = () => (G.INTRO_ART && G.INTRO_ART.pip) || {};

  function setBg(name) {
    const src = name && G.INTRO_ART && G.INTRO_ART.story[name] ? G.INTRO_ART.story[name] : 'assets/img/menu/menu-bg.webp';
    const a = $('introBgA'), b = $('introBgB');            // cross-fade between two layers
    const front = a.classList.contains('on') ? a : b, back = front === a ? b : a;
    if (front.dataset.src === src) return;
    back.style.backgroundImage = `url('${src}')`; back.dataset.src = src;
    back.classList.add('on'); front.classList.remove('on');
    $('intro').classList.toggle('story', !!name);
  }
  function setPip(mood, open) {
    const a = art(), src = (open && a[mood + '-talk']) || a[mood] || a.happy;
    if (src && $('introPip').getAttribute('src') !== src) $('introPip').src = src;
  }
  function show(k) {
    const L = lines[k]; i = k; shown = 0;
    clearInterval(typing); clearInterval(talk);
    setBg(L.bg); setPip(L.mood, false);
    const pip = $('introPip'); pip.classList.remove('pop'); void pip.offsetWidth; pip.classList.add('pop');
    $('introText').textContent = ''; $('introNext').classList.add('hidden');
    $('intro').classList.add('talking');
    let open = false;
    talk = setInterval(() => { open = !open; setPip(L.mood, open); }, 130);   // beak open/closed (when there are talking frames)
    typing = -1;                                        // (waiting for the voice to load)
    const startTyping = (dur) => {
      if (i !== k || typing === null) return;
      voiced = dur > 0;
      // with a voice: the words appear along with Pip's speech (all shown a little before he finishes); no typing blips
      const ms = voiced ? Math.max(18, Math.min(110, dur * 1000 * 0.85 / L.text.length)) : SPEED;
      typing = setInterval(() => {
        shown++; $('introText').textContent = L.text.slice(0, shown);
        if (!voiced && shown % 2 === 0 && /[a-z]/i.test(L.text[shown - 1])) G.audio.blip();
        if (shown >= L.text.length) finishLine();
      }, ms);
    };
    const v = G.voice && L.voice ? G.voice.say(L.voice, () => { if (i === k) stopBeak(); }) : Promise.resolve(0);
    v.then(startTyping, () => startTyping(0));
  }
  let voiced = false;
  function stopBeak() { clearInterval(talk); const L = lines[i]; if (L) setPip(L.mood, false); $('intro').classList.remove('talking'); }
  function finishLine() {
    clearInterval(typing); typing = null;
    const L = lines[i]; $('introText').textContent = L.text;
    if (!(voiced && G.voice.playing())) stopBeak();      // the beak keeps going while Pip is still talking
    $('introNext').classList.remove('hidden');
  }
  function next() {
    if (G.screen !== 'intro') return;
    if (typing) { finishLine(); return; }
    G.audio.click();
    if (G.voice) G.voice.stop();
    if (i + 1 < lines.length) show(i + 1); else end();
  }
  function end() {
    clearInterval(typing); clearInterval(talk); clearTimeout(flashT); typing = null;
    if (G.voice) G.voice.stop();
    const cb = done; done = null; cb && cb();
  }
  function lightning() {                               // flashes over the stormy castle, now and then
    clearTimeout(flashT);
    flashT = setTimeout(() => {
      if (G.screen !== 'intro') return;
      if (!$('intro').classList.contains('story')) { const f = $('introFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); G.audio.thunder(0.1); }
      lightning();
    }, 4000 + Math.random() * 4000);
  }
  function play(list, then) {
    lines = list; done = then;
    if (G.voice) G.voice.preload(list.map((l) => l.voice).filter(Boolean));
    G.setScreen('intro');
    $('btnSkipIntro').classList.toggle('hidden', list.length < 2);
    show(0); lightning();
  }

  /* the story before hero select */
  G.playIntro = (then) => play(STORY, then);
  /* Pip's goodbye after hero select */
  G.introGoodbye = (then) => {
    const s = G.state, who = (s && s.name) || ('brave ' + G.CLASSES[s.cls].name);   // the name from the creator
    play([{ voice: 'pip-goodbye', mood: 'hello', bg: null, text: `Good luck, ${who}! I will watch from the tower window. Hoo-hoo!` }], then);
  };

  G.bindIntro = function () {
    $('intro').addEventListener('click', () => { G.audio.unlock(); next(); });
    ui.tap($('btnSkipIntro'), () => end());                // ui.tap stops the click reaching the intro
    window.addEventListener('keydown', (e) => {
      if (G.screen !== 'intro') return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.code === 'Escape') end();
    });
  };
  G.introSkip = end;

  /* after the creator: rush toward the castle gate in the title picture (lightning on the way), then the game */
  G.zoomToGate = function (then) {
    const z = $('gateZoom'); G.screen = 'zoom';               // taps do nothing while we rush in
    z.classList.remove('hidden', 'go', 'out'); void z.offsetWidth; z.classList.add('go');
    setTimeout(() => G.audio.thunder(), 650);
    setTimeout(() => {
      then && then();
      z.classList.add('out');                              // fade the black away over the first view of the gate
      setTimeout(() => z.classList.add('hidden'), 600);
    }, 1750);
  };
})();
