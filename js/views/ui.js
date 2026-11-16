/* DOM UI: text box with choices, bag, hero card, minimap, modals, card faces, effects. */
(function () {
  const $ = (id) => document.getElementById(id);
  const ui = { $ };
  G.ui = ui;

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  ui.el = el;
  function tap(e, fn) { e.addEventListener('click', (ev) => { ev.stopPropagation(); G.audio.click(); fn(ev); }); return e; }
  ui.tap = tap;

  /* ---------- pictures instead of emoji ----------
     ui.ico('cheese')  a small picture in a line of text: an icon (assets/img/icons, roomArt.js ICON_ART) or a UI kit piece
     ui.mon('wolf')    a monster's round portrait
     ui.dot('yellow')  a coloured counting dot (also 'x': a crossed-out one); ui.shape(...) the toy room's pattern shapes
     ui.svg.bin etc.   little drawn symbols (delete, bell, tick, cross) in the kit's colours */
  const KIT = { star: 1, coin: 1, 'coin-empty': 1, shield: 1, goldnote: 1, treasure: 1, badge: 1, close: 1 };
  ui.picSrc = (n) => (KIT[n] ? `assets/img/ui/kit/${n}.webp` : (G.ICON_ART && G.ICON_ART[n]) || `assets/img/icons/${n}.webp`);
  ui.ico = (n, cls) => `<img class="ico${cls ? ' ' + cls : ''}" src="${ui.picSrc(n)}" alt="" draggable="false">`;
  ui.mon = (id, cls) => `<img class="ico mon${cls ? ' ' + cls : ''}" src="assets/img/monsters/${id}.webp" alt="" draggable="false">`;
  ui.dot = (c) => `<span class="dot dot-${c}"></span>`;
  ui.shape = (k) => (k === 'star' ? ui.ico('star', 'shape') : `<span class="shape sh-${k}"></span>`);
  ui.svg = {
    bin: '<svg class="svg-ic" viewBox="0 0 24 24"><path d="M5 7h14l-1.2 13.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" fill="#fff4e0" stroke="#5a1020" stroke-width="1.6"/><path d="M3.5 5.5h17M9 5.5V3.6h6v1.9M9.5 10v8M14.5 10v8" stroke="#5a1020" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>',
    bell: '<svg class="svg-ic bell-svg" viewBox="0 0 24 24"><path d="M12 2.5a1.6 1.6 0 0 1 1.6 1.6v.6A6.5 6.5 0 0 1 18.5 11v4.2l2 2.6v1.2h-17v-1.2l2-2.6V11a6.5 6.5 0 0 1 4.9-6.3v-.6A1.6 1.6 0 0 1 12 2.5z" fill="#fff6d0" stroke="#3a2410" stroke-width="1.4"/><circle cx="12" cy="21" r="2" fill="#f2c94c" stroke="#3a2410" stroke-width="1.2"/><path d="M8 9.5a4 4 0 0 1 2.4-3" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    tick: '<svg class="svg-ic" viewBox="0 0 24 24"><rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="#3f9a48" stroke="#1d4a22" stroke-width="1.6"/><path d="M7 12.5l3.2 3.2L17.5 8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    todo: '<svg class="svg-ic" viewBox="0 0 24 24"><rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="#fff4dc" stroke="#7a5a3a" stroke-width="1.8"/></svg>',
    good: '<svg class="svg-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#3f9a48" stroke="#1d4a22" stroke-width="1.4"/><path d="M7 12.5l3.2 3.2L17.5 8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bad: '<svg class="svg-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#c0283a" stroke="#5a1020" stroke-width="1.4"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
  };

  /* ---------- text box ---------- */
  let typeTimer = null;
  /* who is talking -> portrait beside the text (Sir Sneezalot, or a monster by its name) */
  function speakerImg(title) {
    if (!title) return null;
    const own = G.speakerArt && G.speakerArt(title); if (own) return own;   // Mildred (cleaning.js)
    if (title === 'Sir Sneezalot' && G.NPC_ART && G.NPC_ART.sneezalot) return G.NPC_ART.sneezalot.portrait;
    for (const id in (G.MONSTERS || {})) if (G.MONSTERS[id].name === title || G.MONSTERS[id].freedName === title) {
      const art = G.MONSTER_ART && G.MONSTER_ART[id];
      if (art) return G.state && G.state.flags['freed_' + id] ? art.portrait.freed : art.portrait.cursed;
      return G.MONSTERS[id].img;
    }
    return null;
  }
  ui.say = function (title, text, choices) {
    $('tbTitle').textContent = title || '';
    const src = speakerImg(title), box = $('textbox'), img = $('tbSpeaker');
    box.classList.toggle('speaking', !!src);
    if (src && img.getAttribute('src') !== src) img.src = src;
    const t = $('tbText');
    clearInterval(typeTimer);
    t.textContent = '';
    const full = text || '';
    let i = 0;
    // a recorded line (voiceList.js) plays by itself; the words then appear along with the voice
    const vid = G.voice && G.voice.forText(full), voiced = vid && G.voice.has(vid);
    img.classList.remove('talking');
    if (G.voice) { if (voiced) { G.voice.say(vid, () => img.classList.remove('talking')); if (src && !/^pip-/.test(vid)) img.classList.add('talking'); } else G.voice.stop(); }   // the portrait bobs while they talk
    const step = voiced ? Math.max(16, Math.min(160, (G.VOICE_LIST[vid] * 1000 * 0.8) / Math.max(1, full.length) * 2)) : 16;
    if (G.settings && G.settings.fastText) t.textContent = full;
    else typeTimer = setInterval(() => { i += 2; t.textContent = full.slice(0, i); if (i >= full.length) clearInterval(typeTimer); }, step);
    ui.choices(choices || []);
  };
  ui.sayNow = function (text) {      // in a battle the messages go to the strip at the bottom of the 3D view
    clearInterval(typeTimer);
    if ($('game').classList.contains('battle')) { const b = $('battleLog'); b.textContent = text; b.classList.remove('new'); void b.offsetWidth; b.classList.add('new'); }
    else {
      $('tbText').textContent = text;
      const vid = G.voice && G.voice.forText(text);      // a recorded line (the cleaning lines, say) plays here too
      if (vid && G.voice.has(vid)) G.voice.say(vid);
    }
  };
  ui.choices = function (choices) {
    const box = $('tbChoices'); box.innerHTML = '';
    for (const c of choices) {
      const b = el('button', 'choice', c.label);
      tap(b, () => { if (!c.keep) ui.choices([]); c.fn && c.fn(); });
      box.appendChild(b);
    }
  };

  /* ---------- walking into a room: a banner with its name drops in (and the first time the room lights up) ---------- */
  let bannerT = null;
  ui.roomBanner = function (r, first) {
    const R = G.ROOMS[r]; if (!R) return;
    const b = $('roomBanner'), s = G.state;
    const real = Object.keys(G.ROOMS).filter((k) => !G.ROOMS[k].transit && !G.ROOMS[k].secret && (G.ROOMS[k].zone || 'castle') === (R.zone || 'castle')), found = real.filter((k) => s.visited[k]).length, total = real.length;
    b.querySelector('.rb-name').textContent = R.name;
    b.querySelector('.rb-sub').innerHTML = !first ? '' : R.secret ? `${ui.ico('star')} Secret room found! &nbsp;${G.secretsFound()} / ${G.secretsTotal()}`
      : `${ui.ico('sparkle')} New room discovered! &nbsp;${found} / ${total}`;
    b.className = first ? 'first' : 'small';
    void b.offsetWidth; b.classList.add('show');
    if (ui.fitText) ui.fitText(b.querySelector('.rb-name'), R.name, first ? 36 : 26, 16);
    clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), first ? 2600 : 1500);
    G.audio.fanfare(first);
    if (first) { const f = $('roomFade'); f.classList.remove('lightup'); void f.offsetWidth; f.classList.add('lightup'); }
  };

  /* ---------- toast & effects ---------- */
  let toastT = null;
  ui.toast = function (msg, ms = 1800) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
  };
  ui.popNum = function (text, x, y, color, small) {
    const p = el('div', 'pop-num' + (small ? ' small' : ''), text);
    p.style.left = x + 'px'; p.style.top = y + 'px'; if (color) p.style.color = color;
    $('vpFx').appendChild(p); setTimeout(() => p.remove(), 1000);
  };
  ui.popImg = function (src, x, y, size) {     // a picture that pops up and floats away (e.g. the sneeze cloud)
    const p = el('img', 'pop-img'); p.src = src; p.style.left = x + 'px'; p.style.top = y + 'px'; if (size) p.style.width = size + 'px';
    $('vpFx').appendChild(p); setTimeout(() => p.remove(), 1100);
  };
  /* a burst of little pictures flying out: ui.burst('sparkle' | an icon name, x, y, n) */
  ui.burst = function (kind, x, y, n = 8) {
    const src = ui.picSrc(kind && /^[a-z-]+$/.test(kind) ? kind : 'sparkle');
    for (let i = 0; i < n; i++) {
      const b = el('img', 'burst burst-img'); b.src = src;
      const a = (Math.PI * 2 * i) / n;
      b.style.left = x + 'px'; b.style.top = y + 'px';
      b.style.setProperty('--dx', Math.cos(a) * 140 + 'px'); b.style.setProperty('--dy', Math.sin(a) * 110 + 'px');
      $('vpFx').appendChild(b); setTimeout(() => b.remove(), 900);
    }
  };
  ui.shake = function (e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); };
  ui.hurt = function () { const v = $('vpGlow'); v.classList.remove('hurt-flash'); void v.offsetWidth; v.classList.add('hurt-flash'); ui.shake($('heroCard')); G.heroFace && G.heroFace('hurt'); };
  ui.flash = function (strength = 0.8) {
    const f = $('flash'); f.style.transition = 'none'; f.style.opacity = strength;
    requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = 0; });
  };

  /* ---------- modal ---------- */
  let onCloseFn = null;
  ui.modal = function (content, opts = {}) {
    const box = $('modalBox'); box.innerHTML = '';
    /* looks: frame = the stone frame with the title on its ribbon (modal-frame.webp); scroll = the big parchment scroll
       with a purple ribbon title (journal, map); note = the small pinned parchment (item info) */
    const look = opts.frame ? 'framed' : opts.scroll ? 'scrolled' : opts.note ? 'noted' : '';
    box.className = look;
    const title = opts.frame || opts.scroll;
    if (look) {
      if (title) box.appendChild(el('div', opts.frame ? 'fr-title' : 'sc-title', title));
      const inner = el('div', opts.frame ? 'fr-inner' : 'sc-inner'); if (typeof content === 'string') inner.innerHTML = content; else inner.appendChild(content);
      box.appendChild(inner);
    } else if (typeof content === 'string') box.innerHTML = content; else box.appendChild(content);
    if (opts.close !== false) { const x = el('button', 'modal-close', ''); tap(x, () => ui.closeModal()); box.appendChild(x); }
    box.style.width = opts.width && !look ? opts.width + 'px' : '';
    $('modal').classList.remove('hidden');
    if (title && ui.fitText) ui.fitText(box.querySelector('.fr-title, .sc-title'), title, opts.frame ? 38 : 32, 18);   // long titles shrink to fit the ribbon
    onCloseFn = opts.onClose || null;
    ui.modalCanClose = opts.close !== false;
    return box;
  };
  ui.closeModal = function () {
    $('modal').classList.add('hidden'); $('modalBox').innerHTML = '';
    const f = onCloseFn; onCloseFn = null; if (f) f();
  };
  ui.modalOpen = () => !$('modal').classList.contains('hidden');
})();
