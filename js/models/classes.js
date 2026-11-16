/* MODEL — Hero classes: stats, perks, starter decks and reward pools. */
/* ---------- Hero classes ---------- */
G.CLASSES = {
  warrior: {
    name: 'Warrior', title: 'The Brave Shield', img: 'assets/img/heroes/warrior.webp', full: 'assets/img/heroes/warrior-full.webp', hp: 40, energy: 3, hand: 5,
    color: '#d0533f',
    perks: ['Biggest health', 'Strong blocks', 'Smash with Shield Bash'],
    weak: ['Needs Charge! to reach far foes', 'Only a little magic'],
    deck: ['w_slash', 'w_slash', 'w_mighty', 'w_shield', 'w_shield', 'w_shield', 'w_bash', 'w_cry', 'w_charge', 'w_torch'],
    pool: ['w_cry', 'w_wall', 'w_flame', 'w_spear', 'w_hammer', 'w_roar', 'w_slash', 'w_bash'],
  },
  rogue: {
    name: 'Rogue', title: 'The Sneaky Blade', img: 'assets/img/heroes/rogue.webp', full: 'assets/img/heroes/rogue-full.webp', hp: 32, energy: 3, hand: 6,
    color: '#4f9c6b',
    perks: ['Draws 6 cards', 'Throws knives from far away', 'Stabs knock off armour plates'],
    weak: ['Less health', 'Weak blocks'],
    deck: ['r_stab', 'r_stab', 'r_knife', 'r_knife', 'r_roll', 'r_roll', 'r_sneak', 'r_smoke', 'r_sling', 'r_lantern', 'r_sharpen'],
    pool: ['r_flurry', 'r_shadow', 'r_firearrow', 'r_banana', 'r_vanish', 'r_knife', 'r_sneak', 'r_sling'],
  },
  wizard: {
    name: 'Wizard', title: 'The Star Caster', img: 'assets/img/heroes/wizard.webp', full: 'assets/img/heroes/wizard-full.webp', hp: 30, energy: 3, hand: 5,
    color: '#5b6fd6',
    perks: ['Spells hit from far away', 'Fire, shock and frost', 'Focus makes spells huge'],
    weak: ['Least health', 'Magic bounces off mirrors'],
    deck: ['m_spark', 'm_spark', 'm_spark', 'm_fire', 'm_frost', 'm_frost', 'm_bonk', 'm_bonk', 'm_focus', 'm_mirror'],
    pool: ['m_meteor', 'm_chain', 'm_bubble', 'm_ice', 'm_bigbonk', 'm_star', 'm_spark', 'm_fire'],
  },
};
