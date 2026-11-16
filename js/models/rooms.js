/* MODEL — The 20 castle nodes: name, texture theme, intro text. */
/* ---------- Rooms (the 20 castle nodes) ---------- */
G.ROOMS = {
  // the Bone Vault (map 'vault', under the Ballroom)
  U: { name: 'Vault Ladder',     theme: 'vault',      intro: 'A warm, golden hall under the castle. You can hear a drum... a trumpet... and a xylophone?' },
  V: { name: 'The Bone Vault',   theme: 'vault',      intro: 'Gold everywhere! On a little stage, three skeleton musicians guard the royal treasure.' },
  X: { name: 'Spiral Stairs',    theme: 'stairwell', transit: true, intro: '' },   // inside the stairwell, while climbing (maps.js)
  O: { name: 'Castle Gate',      theme: 'outside',    intro: 'The castle gate looms in the storm. Lightning flashes! A glowing purple rune locks the gate.' },
  E: { name: 'Entrance Hall',    theme: 'hall',       intro: 'A grand hall with dusty banners. A suit of armour by the wall... is it moving?' },
  w: { name: 'West Hallway',     theme: 'hallway',    intro: 'A long hallway. Torches flicker. You smell cookies and cheese to the west.' },
  e: { name: 'East Hallway',     theme: 'hallway',    intro: 'A chilly hallway. You hear snoring, clanking and bubbling.' },
  n: { name: 'North Hall',       theme: 'hallway',    intro: 'The North Hall. Somewhere above, the Witch is cackling.' },
  c: { name: 'Long Corridor',    theme: 'hallway',    intro: 'A long, long corridor. Paintings of grumpy kings stare at you.' },
  K: { name: 'Kitchen',          theme: 'kitchen',    intro: 'Pots bubble and pans clatter. Something squeaks behind the cheese!' },
  C: { name: 'Cheese Cellar',    theme: 'cellar',     intro: 'A cool cellar full of cheese wheels. So. Much. Cheese.' },
  D: { name: 'Dining Hall',      theme: 'dining',     intro: 'A long table set for a feast, but all the cookies are disappearing!' },
  P: { name: 'Portrait Gallery', theme: 'gallery',    intro: 'Paintings line the walls. Their eyes follow you around the room. Creepy... and a bit silly.' },
  L: { name: 'Library',          theme: 'library',    intro: 'Towering bookshelves, all covered in sticky cobwebs.' },
  H: { name: 'Greenhouse',       theme: 'greenhouse', intro: 'Giant plants reach for the moonlight. Something rustles in the leaves.' },
  Q: { name: 'Royal Bathroom',   theme: 'bathroom',   intro: 'A sparkly bathroom with a bathtub FULL of rubber ducks.' },
  R: { name: 'Ballroom',         theme: 'ballroom',   intro: 'A shiny dance floor. Someone is clattering around to music that is not playing.' },
  Y: { name: 'Toy Room',         theme: 'toyroom',    intro: 'Toys everywhere! The toy soldiers are lined up in a funny pattern.' },
  B: { name: "Giant's Bedroom",  theme: 'bedroom',    intro: 'Everything is GIANT here: a giant bed, giant socks, a giant snoring sound...' },
  F: { name: 'Smithy',           theme: 'smithy',     intro: 'The forge glows orange. Hammers, horseshoes and a growl...' },
  A: { name: 'Alchemy Lab',      theme: 'lab',        intro: 'Bubbling potions in every colour! Green smoke curls from a cauldron.' },
  S: { name: 'Spiral Stairs',    theme: 'stairs',     intro: 'Stone stairs spiral up to the tower. Something big and metal stands in the way.' },
  // secret rooms (castle.js LAYOUT.secrets): not counted with the other rooms until found
  Z: { name: 'The Secret Armoury', theme: 'smithy', secret: true, intro: 'A hidden armoury! Old shields and shiny armour, all covered in dust. These are Sir Sneezalot\'s lost things!' },
  M: { name: 'The Mouse Hideout', theme: 'cellar', secret: true, intro: 'A tiny town of mice behind the wall! Furniture made of cheese crumbs, and a very small party going on.' },
  N: { name: "The Gardener's Closet", theme: 'greenhouse', secret: true, intro: 'A secret closet full of seeds and flower pots. One little plant glows in the dark.' },
  G: { name: 'The Royal Treasury', theme: 'vault', secret: true, intro: 'GOLD! Piles of coins, golden candles, and a crown on a cushion. The castle\'s lost treasure!' },
  T: { name: "Witch's Tower",    theme: 'tower',      intro: 'The top of the tower. Purple magic swirls everywhere!' },
};
