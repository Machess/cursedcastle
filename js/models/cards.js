/* MODEL — Card definitions. type, cost, hidden value range (min..max), tags and effects. */
/* ---------- Cards ----------
   type: attack | block | skill.  min/max: range of the hidden value (the puzzle answer).
   tags: SLASH BASH PIERCE FIRE SHOCK FROST MAGIC RANGED BUFF TRICK
   fx: extra effects (see combat.js) */
G.CARDS = {
  // Warrior
  w_slash:  { name: 'Sword Slash', type: 'attack', cost: 1, min: 4, max: 7, tags: ['SLASH'], text: 'Deal ? damage.' },
  w_shield: { name: 'Shield Up', type: 'block',  cost: 1, min: 4, max: 8, tags: [], text: 'Gain ? block.' },
  w_bash:   { name: 'Shield Bash', type: 'attack', cost: 1, min: 2, max: 5, tags: ['BASH'], text: 'Deal ? damage.' },
  w_cry:    { name: 'Battle Cry', type: 'skill',  cost: 1, min: 2, max: 4, tags: ['BUFF'], fx: { power: 1 }, text: 'Your next attack gets +?.' },
  w_charge: { name: 'Charge!', type: 'attack', cost: 1, min: 3, max: 6, tags: ['SLASH'], fx: { close: 1 }, text: 'Rush in close and deal ? damage. Reaches far foes!' },
  w_torch:  { name: 'Torch Swipe', type: 'attack', cost: 1, min: 3, max: 5, tags: ['FIRE'], text: 'Deal ? damage.' },
  w_mighty: { name: 'Mighty Swing', type: 'attack', cost: 2, min: 8, max: 12, tags: ['SLASH'], text: 'Deal ? damage. A huge hit!' },
  w_wall:   { name: 'Castle Wall', type: 'block',  cost: 2, min: 9, max: 14, tags: [], text: 'Gain ? block.' },
  w_flame:  { name: 'Flaming Sword', type: 'attack', cost: 1, min: 4, max: 7, tags: ['SLASH', 'FIRE'], text: 'Deal ? damage.' },
  w_spear:  { name: 'Spear Poke', type: 'attack', cost: 1, min: 3, max: 6, tags: ['PIERCE', 'RANGED'], text: 'Deal ? damage.' },
  w_hammer: { name: 'Hammer Time', type: 'attack', cost: 2, min: 6, max: 9, tags: ['BASH'], text: 'Deal ? damage.' },
  w_roar:   { name: 'Lion Roar', type: 'block',  cost: 1, min: 3, max: 6, tags: ['TRICK'], fx: { blind: 1 }, text: 'Gain ? block. Scary roar: next hit halved.' },
  // Rogue
  r_stab:    { name: 'Quick Stab', type: 'attack', cost: 1, min: 2, max: 5, tags: ['PIERCE'], text: 'Deal ? damage.' },
  r_knife:   { name: 'Throwing Knife', type: 'attack', cost: 1, min: 2, max: 5, tags: ['PIERCE', 'RANGED'], text: 'Deal ? damage.' },
  r_roll:    { name: 'Dodge Roll', type: 'block',  cost: 1, min: 3, max: 6, tags: [], fx: { draw: 1 }, text: 'Gain ? block. Draw 1 card.' },
  r_sneak:   { name: 'Sneak Attack', type: 'attack', cost: 1, min: 3, max: 6, tags: ['PIERCE'], fx: { sneak: 1 }, text: 'Deal ? damage. DOUBLE if he is not attacking!' },
  r_smoke:   { name: 'Smoke Bomb', type: 'block',  cost: 1, min: 2, max: 4, tags: ['TRICK'], fx: { blind: 1 }, text: 'Gain ? block. Blinds: next hit halved.' },
  r_sling:   { name: 'Pebble Sling', type: 'attack', cost: 1, min: 2, max: 4, tags: ['BASH', 'RANGED'], text: 'Deal ? damage.' },
  r_lantern: { name: 'Lantern Toss', type: 'attack', cost: 1, min: 3, max: 5, tags: ['FIRE', 'RANGED'], text: 'Deal ? damage.' },
  r_sharpen: { name: 'Sharpen', type: 'skill',  cost: 0, min: 2, max: 4, tags: ['BUFF'], fx: { power: 1 }, text: 'Free! Your next attack gets +?.' },
  r_flurry:  { name: 'Knife Flurry', type: 'attack', cost: 2, min: 2, max: 4, tags: ['PIERCE', 'RANGED'], hits: 3, text: 'Deal ? damage 3 times!' },
  r_shadow:  { name: 'Shadow Strike', type: 'attack', cost: 2, min: 6, max: 10, tags: ['PIERCE'], text: 'Deal ? damage.' },
  r_firearrow:{ name: 'Fire Arrow', type: 'attack', cost: 1, min: 4, max: 7, tags: ['FIRE', 'RANGED'], text: 'Deal ? damage.' },
  r_banana:  { name: 'Banana Peel', type: 'skill',  cost: 1, min: 2, max: 4, tags: ['TRICK'], fx: { slip: 1 }, text: 'Gain ? block. His next hit misses!' },
  r_vanish:  { name: 'Vanish', type: 'block',  cost: 1, min: 5, max: 9, tags: [], text: 'Gain ? block.' },
  // Wizard
  m_spark:   { name: 'Spark Bolt', type: 'attack', cost: 1, min: 3, max: 6, tags: ['SHOCK', 'MAGIC', 'RANGED'], text: 'Deal ? damage.' },
  m_fire:    { name: 'Fireball', type: 'attack', cost: 2, min: 6, max: 10, tags: ['FIRE', 'MAGIC', 'RANGED'], text: 'Deal ? damage.' },
  m_frost:   { name: 'Frost Shield', type: 'block',  cost: 1, min: 4, max: 8, tags: ['FROST'], fx: { chill: 1 }, text: 'Gain ? block. Chill: next hit -2.' },
  m_bonk:    { name: 'Staff Bonk', type: 'attack', cost: 1, min: 2, max: 5, tags: ['BASH'], text: 'Deal ? damage.' },
  m_focus:   { name: 'Focus', type: 'skill',  cost: 0, min: 2, max: 4, tags: ['BUFF'], fx: { power: 1 }, text: 'Free! Your next attack gets +?.' },
  m_mirror:  { name: 'Mirror Image', type: 'block',  cost: 1, min: 3, max: 6, tags: [], fx: { draw: 1 }, text: 'Gain ? block. Draw 1 card.' },
  m_meteor:  { name: 'Meteor', type: 'attack', cost: 2, min: 9, max: 13, tags: ['FIRE', 'MAGIC', 'RANGED'], text: 'Deal ? damage. BOOM!' },
  m_chain:   { name: 'Chain Zap', type: 'attack', cost: 2, min: 3, max: 5, tags: ['SHOCK', 'MAGIC', 'RANGED'], hits: 2, text: 'Deal ? damage 2 times!' },
  m_bubble:  { name: 'Bubble Shield', type: 'block',  cost: 1, min: 6, max: 10, tags: [], text: 'Gain ? block.' },
  m_ice:     { name: 'Ice Spike', type: 'attack', cost: 1, min: 4, max: 7, tags: ['PIERCE', 'FROST', 'MAGIC', 'RANGED'], text: 'Deal ? damage.' },
  m_bigbonk: { name: 'Big Bonk', type: 'attack', cost: 2, min: 6, max: 9, tags: ['BASH'], text: 'Deal ? damage.' },
  m_star:    { name: 'Star Wand', type: 'attack', cost: 1, min: 3, max: 6, tags: ['RANGED'], fx: { draw: 1 }, text: 'Deal ? damage. Draw 1 card.' },
  // golden cards: one per hero, found in the Secret Armoury (controllers/secrets.js); never in the card rewards
  w_gold:    { name: 'Golden Sword', type: 'attack', cost: 1, min: 7, max: 11, tags: ['SLASH', 'RANGED'], gold: true, text: 'Deal ? damage. It reaches far!' },
  r_gold:    { name: 'Golden Daggers', type: 'attack', cost: 1, min: 3, max: 6, tags: ['PIERCE', 'RANGED'], hits: 2, gold: true, text: 'Deal ? damage 2 times!' },
  m_gold:    { name: 'Golden Staff', type: 'attack', cost: 1, min: 6, max: 10, tags: ['MAGIC', 'FIRE', 'RANGED'], gold: true, text: 'Deal ? damage.' },
};

/* what each keyword does: shown under the deck and the card rewards (ui.keywordLegend), and the monster
   clues use the same words. Cards themselves only list the keywords, so their text stays short. */
G.TAG_DOES = [
  ['BASH', 'Smashes armour, mirrors and plates.'],
  ['SHOCK', 'Cracks armour.'],
  ['PIERCE', 'Knocks off plates.'],
  ['FIRE', 'Burns webs.'],
  ['RANGED', 'Reaches far.'],
  ['MAGIC', 'Bounces off mirrors!'],
];
G.TAG_INFO = {
  SLASH: 'Slash', BASH: 'Bash', PIERCE: 'Pierce', FIRE: 'Fire', SHOCK: 'Shock', FROST: 'Frost',
  MAGIC: 'Magic', RANGED: 'Ranged', BUFF: 'Power-up', TRICK: 'Trick',
};


/* Card stats after forge upgrades (+2 to the range per upgrade). */
G.cardDef = function (inst) {
  const base = G.CARDS[inst.id]; const up = inst.up || 0;
  if (!up) return base;
  return Object.assign({}, base, { name: base.name + '+', min: base.min + 2 * up, max: base.max + 2 * up, upgraded: up });
};
