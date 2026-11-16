/* MODEL — Items in the bag. */
/* ---------- Items ---------- */
G.ITEMS = {
  cheese:  { name: 'Royal Cheese', art: 'cheese', cat: 'snack',    text: 'Heals 8 health. Yum!', use: 'heal', v: 8 },
  pepper:  { name: 'Spicy Pepper', art: 'pepper', cat: 'snack',    text: 'Throw it in a battle: 6 FIRE damage. Burns webs!', use: 'pepper', v: 6, combatOnly: true },
  bubble:  { name: 'Bubble Potion', art: 'bubble', cat: 'snack',    text: 'Drink in a battle: gain 8 block.', use: 'block', v: 8, combatOnly: true },
  moonkey: { name: 'Moon Key', art: 'moonkey', cat: 'gear',     text: 'One of three keys for the Witch\'s Moon Door.' },
  scarf:   { name: 'Cozy Scarf', art: 'scarf', cat: 'gear',     text: 'Knitted by Madame Webs. +6 max health.', passive: { maxHp: 6 } },
  duck:    { name: 'Golden Duck', art: 'duck', cat: 'treasure', text: 'A golden rubber duck. +4 max health!', passive: { maxHp: 4 } },
  crown:   { name: 'Toy Crown', art: 'crown', cat: 'treasure', text: 'A crown from the toy box. You feel royal.' },
  portrait:{ name: 'Tiny Portrait', art: 'portrait', cat: 'treasure', text: 'A painting of the castle before the curse.' },
  goldnote:{ name: 'Golden Note', img: 'assets/img/ui/kit/goldnote.webp', cat: 'treasure', text: 'The Bone Band\'s lucky golden note. +5 max health!', passive: { maxHp: 5 } },
  treasure:{ name: 'Royal Treasure', img: 'assets/img/ui/kit/treasure.webp', cat: 'treasure', text: 'A bag of royal gold from the Bone Vault. +5 max health!', passive: { maxHp: 5 } },
  medal:   { name: 'Dance Medal', art: 'medal', cat: 'treasure', text: 'Sir Rattlebones says you dance like a feather.' },
};
// found in the secret rooms (controllers/secrets.js)
Object.assign(G.ITEMS, {
  map1:      { name: 'Map Piece 1', art: 'map', cat: 'gear', text: 'A torn piece of an old map. It shows part of a hallway.' },
  map2:      { name: 'Map Piece 2', art: 'map', cat: 'gear', text: 'A torn piece of an old map, with a nibble mark.' },
  map3:      { name: 'Map Piece 3', art: 'map', cat: 'gear', text: 'A torn piece of an old map, a bit muddy.' },
  hanky:     { name: 'Lucky Hanky', art: 'sneeze', cat: 'treasure', text: 'Sir Sneezalot\'s lucky hanky, lost for years. +3 max health!', passive: { maxHp: 3 } },
  goldcheese:{ name: 'Golden Cheese', art: 'cheese', cat: 'treasure', text: 'The mice\'s greatest treasure, given to you! +5 max health!', passive: { maxHp: 5 } },
  clover:    { name: 'Lucky Clover', art: 'sparkle', cat: 'treasure', text: 'A glowing clover from the secret closet. Start every battle with 3 block!', passive: { block: 3 } },
  royalcrown:{ name: 'Royal Crown', art: 'crown', cat: 'treasure', text: 'The real crown of Moonstone Castle! +10 max health. You found every secret!', passive: { maxHp: 10 } },
});
// the cleaning (controllers/cleaning.js): things a shaggy dog keeps dropping, and the witch trash you sweep up
Object.assign(G.ITEMS, {
  biscuit:     { name: 'Soggy Dog Biscuit', img: 'assets/img/clean/biscuit.webp', cat: 'gear', text: 'Someone dropped this. Someone with VERY shaggy fur...' },
  ribbon:      { name: 'Furry Hair Ribbon', img: 'assets/img/clean/ribbon.webp', cat: 'gear', text: 'A purple hair ribbon covered in white fur. A dog that wears ribbons? Strange!' },
  broombutton: { name: 'Broom Button', img: 'assets/img/clean/broombutton.webp', cat: 'gear', text: 'A wooden button shaped like a little broom. It fell off somebody\'s apron.' },
  tidypage:    { name: 'Spell Book Page', img: 'assets/img/clean/tidypage.webp', cat: 'gear', text: '"How to Tidy Up, by M. Mopsley." Who is M. Mopsley?' },
  witchtrash:  { name: 'Witch Trash', img: 'assets/img/clean/sock.webp', cat: 'gear', text: 'Stinky socks, banana peels and broken wands swept up from the castle. Mildred trades it for prizes!' },
});
G.ITEM_CATS = [['gear', 'Gear & Keys'], ['snack', 'Snacks & Potions'], ['treasure', 'Treasures']];
