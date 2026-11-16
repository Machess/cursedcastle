/* MODEL — Curse-breaking puzzles. The ANSWER of every number puzzle is the card's hidden value,
   so solving "4 + 3" really does make the card hit for 7. Difficulty: 1 = age 6-7, 2 = 8-9, 3 = 10+. */
(function () {
  const ri = G.ri, pick = G.pick, shuffle = G.shuffle;

  /* things to count: [icon (ui.ico), what they are called] */
  const COUNT_THINGS = [['gob-cookie', 'cookies'], ['star', 'stars'], ['cheese', 'cheeses'], ['duck', 'ducks'], ['coin', 'coins'],
    ['crown', 'crowns'], ['pepper', 'peppers'], ['bubble', 'potions'], ['moonkey', 'keys'], ['heart', 'hearts'], ['goldnote', 'golden notes']];
  const pic = (n) => G.ui.ico(n);

  /* four buttons: the answer plus wrong ones. With a card's range (min..max printed on it), wrong answers come
     from inside that range first, so the range can't be used to rule answers out. */
  function options(answer, extra, range) {
    const set = new Set([answer]);
    const cands = shuffle([answer + 1, answer - 1, answer + 2, answer - 2, answer + 3, ...(extra || [])]);
    let first = extra || [];
    if (range) {
      const inside = (v) => v >= range[0] && v <= range[1];
      const all = []; for (let v = range[0]; v <= range[1]; v++) all.push(v);
      first = [...shuffle(first.filter(inside)), ...shuffle(all)];
    }
    for (const c of [...first, ...cands]) { if (set.size >= 4) break; if (c >= 0 && c <= 99 && c !== answer) set.add(c); }
    let k = 4; while (set.size < 4) set.add(answer + k++);
    return shuffle([...set]);
  }

  /* every puzzle also says how to work it out (why): shown when the answer was wrong, so a mistake teaches something */
  const dots = (n, e = G.ui.dot('yellow')) => Array.from({ length: Math.ceil(n / 5) }, (_, i) => e.repeat(Math.min(5, n - i * 5))).join(' &nbsp;');
  const steps = (list, s, sign) => list.join(' → ') + `   (${sign}${s} each time)`;

  const L1 = [
    (t) => { const a = ri(0, t), b = t - a; return { q: `${a} + ${b} = ?`, say: `What is ${a} plus ${b}?`, x: [a + b + 1, Math.abs(a - b)],
      why: [`${dots(a) || '(none)'} &nbsp;+&nbsp; ${dots(b, G.ui.dot('blue')) || '(none)'}`, `Count them all: ${a} + ${b} = ${t}`] }; },
    (t) => { const d = ri(1, Math.min(8, 20 - t)), c = t + d; return { q: `${c} − ${d} = ?`, say: `What is ${c} take away ${d}?`, x: [c + d > 20 ? t + 1 : c + d, c],
      why: [`${dots(t)} &nbsp;${G.ui.dot('x').repeat(d)}`, `${c} take away ${d} leaves ${t}`] }; },
    (t) => { const [k, word] = pick(COUNT_THINGS), e = pic(k); return { q: 'How many?', grid: Array(t).fill(e), say: `Count the ${word}!`, x: [],
      why: [dots(t, e), t > 5 ? `Count in fives: ${Array.from({ length: Math.floor(t / 5) }, (_, i) => (i + 1) * 5).join(', ')}${t % 5 ? ` ... and ${t % 5} more = ${t}` : ''}` : `1, 2, 3... ${t}!`] }; },
    (t) => { const s = t >= 6 ? pick([1, 2]) : 1; if (t - 3 * s < 0) return null; return { q: `${t - 3 * s}, ${t - 2 * s}, ${t - s}, ?`, say: 'What number comes next?', x: [t + s],
      why: [steps([t - 3 * s, t - 2 * s, t - s, t], s, '+')] }; },
    (t) => { const a = ri(1, Math.max(1, 20 - t)); return { q: `${a} + ? = ${a + t}`, say: 'Which number is missing?', x: [a + t, a],
      why: [`Count up from ${a} to ${a + t}: that is ${t} steps`, `${a} + ${t} = ${a + t}`] }; },
  ];
  const L2 = [
    (t) => { const d = ri(8, 35), c = t + d; return { q: `${c} − ${d} = ?`, say: 'Take away!', x: [t + 10, t - 10],
      why: [`Count up from ${d} to ${c}: ${d} + ${t} = ${c}`, `So ${c} − ${d} = ${t}`] }; },
    (t) => { const a = ri(6, 40); return { q: `${a} + ? = ${a + t}`, say: 'Which number is missing?', x: [a + t + t, t + 10],
      why: [`Take ${a} away from ${a + t}`, `${a + t} − ${a} = ${t}`] }; },
    (t) => ({ q: `Half of ${t * 2} = ?`, say: 'Split it in two equal parts!', x: [t * 4, t * 2],
      why: [`${t} + ${t} = ${t * 2}`, `So half of ${t * 2} is ${t}`] }),
    (t) => { const k = ri(2, 5); return { q: `? × ${k} = ${k * t}`, say: 'Which number is missing?', x: [k * t - k, t + k],
      why: [`${k * t} shared into ${k} groups = ${t} each`, `${t} × ${k} = ${k * t}`] }; },
    (t) => { const s = ri(2, 5); return { q: `${t + 3 * s}, ${t + 2 * s}, ${t + s}, ?`, say: 'Counting down... what comes next?', x: [t + s + 1, t - s],
      why: [steps([t + 3 * s, t + 2 * s, t + s, t], s, '−')] }; },
    (t) => { const a = ri(1, Math.max(1, t - 2)), b = ri(0, t - a), c = t - a - b; return { q: `${a} + ${b} + ${c} = ?`, say: 'Add all three!', x: [],
      why: [`${a} + ${b} = ${a + b}`, `${a + b} + ${c} = ${t}`] }; },
  ];
  const L3 = [
    (t) => { const k = ri(2, 9); return { q: `${t * k} ÷ ${k} = ?`, say: 'Share it out equally!', x: [t * k - k, t + 1],
      why: [`Which number times ${k} makes ${t * k}?`, `${t} × ${k} = ${t * k}`] }; },
    (t) => { let a, b, tries = 0; do { a = ri(2, 9); b = ri(2, 9); } while (a * b <= t && tries++ < 30); if (a * b <= t) return null; return { q: `${a} × ${b} − ${a * b - t} = ?`, say: 'Times first, then take away!', x: [a * b, a + b],
      why: [`Times first: ${a} × ${b} = ${a * b}`, `Then take away: ${a * b} − ${a * b - t} = ${t}`] }; },
    (t) => { const k = ri(3, 9); return { q: `? × ${k} = ${k * t}`, say: 'Which number is missing?', x: [t + k, k * t - t],
      why: [`${k * t} ÷ ${k} = ${t}`, `Check: ${t} × ${k} = ${k * t}`] }; },
    (t) => { const k = ri(2, 5), sum = t * k, a = ri(1, sum - 1); return { q: `(${a} + ${sum - a}) ÷ ${k} = ?`, say: 'Brackets first!', x: [sum, t + k],
      why: [`Brackets first: ${a} + ${sum - a} = ${sum}`, `Then share: ${sum} ÷ ${k} = ${t}`] }; },
    (t) => { const a = ri(2, 6), b = t - a; if (b < 1 || a * b - t < 1) return null;   // (never 'take away' a negative number)
       return { q: `${a} × ${b} − ${a * b - t} = ?`, say: 'Times first, then take away!', x: [a * b],
      why: [`Times first: ${a} × ${b} = ${a * b}`, `Then take away: ${a * b} − ${a * b - t} = ${t}`] }; },
    (t) => { const s = ri(3, 9); return { q: `${t + 3 * s}, ${t + 2 * s}, ${t + s}, ?`, say: 'What comes next?', x: [t - s + 1, t + 4 * s],
      why: [steps([t + 3 * s, t + 2 * s, t + s, t], s, '−')] }; },
  ];

  G.numberPuzzle = function (target, level, range) {
    const pool = level >= 3 ? L3 : level === 2 ? L2 : L1;
    // a sprinkle of easier puzzles keeps it from feeling like a test
    let gen = Math.random() < 0.2 && level > 1 ? pick(level === 3 ? L2 : L1) : pick(pool);
    let p = gen(target), tries = 0;
    while (!p && tries++ < 10) p = pick(pool)(target);
    if (!p) p = L1[0](target);
    p.answer = target; G._ans = target;
    p.options = options(target, p.x, range);
    return p;
  };

  /* Logic patterns for the toy room: answer is a symbol, not a number. */
  const SHAPES = ['red', 'blue', 'yellow', 'green', 'purple', 'star', 'tri', 'square'];
  G.patternPuzzle = function (level) {
    const s = shuffle(SHAPES.map((k) => G.ui.shape(k)));
    const kinds = level === 1 ? ['AB', 'ABC', 'AAB'] : level === 2 ? ['ABC', 'AAB', 'ABB', 'ABCD'] : ['AABB', 'ABCD', 'ABBC', 'AABBC'];
    const k = pick(kinds);
    const unit = k.split('').map((ch) => s[ch.charCodeAt(0) - 65]);
    const len = unit.length * 2 + 1 + (level > 1 ? 1 : 0);
    const seq = []; for (let i = 0; i < len + 1; i++) seq.push(unit[i % unit.length]);
    const answer = seq.pop();
    const opts = shuffle([...new Set([answer, ...shuffle(unit.filter((u) => u !== answer)), s[6], s[7]])].slice(0, 4));
    if (!opts.includes(answer)) opts[0] = answer;
    return { seq, answer, options: shuffle(opts) };
  };
})();
