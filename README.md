# Cursed Castle — web version (2.30.0)

The same game as the Android APK, as a plain HTML/CSS/JS project. No build step, no dependencies.

## Run it
- **Easiest:** double-click `index.html` (Chrome or Edge).
- **Local server** (optional, closer to a real website): `npm start` then open http://localhost:8080
  (or `python -m http.server 8080` in this folder).
- Press **F12 → Toggle device toolbar** and pick a 1280×800 tablet to see it like the Lenovo.

Controls: arrows on screen, swipe/click the 3D view, or keyboard **W/S** forward/back, **A/D** step sideways,
**Q/E** turn, **Esc** menu.

## Structure (model / view / controller)
```
index.html                 page skeleton: menu, hero select, game panels, modal
css/
  base.css                 fonts, colours, reset, buttons, panels, toast, animations
  menu.css                 start menu + hero select
  layout.css               game screen: panels, 3D view overlays, text box, hero card, nav pad
  cards.css                card faces
  modals.css               puzzles, deck, map, journal, rewards
  minigames.css            memory, music box, potions, floorboards
assets/
  fonts/                   Pixelify Sans, Fredoka (woff2)
  img/menu/                start-menu background
  img/ending.webp          the ending picture (Wanda flies off to the Dragon's mountain)
  img/hero/                hero parts for the creator: body-<class>-<colour>, head-<face>-<skin>, top-<hair or hat>
  img/heroes/              the old fixed hero pictures (no longer used in the game)
  img/npcs/                Sir Sneezalot: idle, 4 sneeze frames, portrait
  img/cards/               card pictures (one per card id, e.g. w_slash.webp)
  img/props/               things standing in rooms (clock, statue, plants…)
  img/icons/               bag, HUD and effect icons (moon key, sneeze cloud…)
  img/monsters/            monster portraits; img/monsters/rat/, goblin/, skeleton/, spider/, archer/, wolf/, troll/, wizard/, knight/ and witch/ = full art (idle, freed, battle moves, portraits)
js/
  core/namespace.js        the global G object + random helpers (loaded first)
  core/audio.js            synthesized sound effects
  core/dev.js              console helpers for testing (see below)
  models/                  DATA + RULES STATE, no drawing
    classes.js cards.js monsters.js items.js rooms.js castle.js
    puzzles.js             puzzle generators (answer = card power), 3 age levels
    state.js               player state, settings, save/load
    world.js               castle grid, doors, things standing in it
  views/                   DRAWING + DOM
    textures.js sprites.js renderer.js   the first-person 3D view (code-drawn textures)
    artData.js             generated: the AI textures as data (do not edit)
    artTextures.js         which room uses which AI texture and wall decoration
    animArt.js, wallAnim.js  moving paintings and clocks (blink, tick, poked face) and the torches standing out from the walls
    wallLookArt.js, wallLook.js  natural walls: long wall strips, skirtings, pillars and marks (cracks, moss, cobwebs, soot)
    core/voice.js, voiceList.js  recorded voice lines (assets/voice/<id>.js), played through the sound engine
    controllers/secrets.js     secret walls (hint, tap to open) and the secret rooms' treasures
    ceilingArt.js, ceilings.js  ceiling pictures, 3D beams + wall braces, ceiling marks, things hanging from the ceiling
    secretArt.js               the secret walls' clues and the secret rooms' props
    npcArt.js              generated: Sir Sneezalot's sprite sizes and file names
    monsterArt.js          generated: monster frames, sizes, portraits and move-to-frame table
    cardArt.js             generated: which card has a picture (the rest show their emoji)
    roomArt.js             generated: room props, wall decorations, floor tiles (carpet) and icons
    ui.js                  text box, choices, toast, modal, effects
    cardView.js hud.js minimap.js puzzleView.js combatView.js menuScene.js
  controllers/             GAME LOGIC + INPUT
    movement.js            walking, turning, doors, rooms, talking, items
    input.js               buttons, swipes, keyboard
    combat.js              turns, cursed cards, monster rules, rewards, ending
    minigames.js           rune locks, counting, sharing, patterns, memory, music box, potions, forge, sneaking
    menu.js                character creator (class, armour colour, face, skin, hair or hat, name, puzzle level)
    intro.js               the story intro with Pip the owl (typewriter text, moods, story pictures)
    menus.js               deck, quest, pause, settings, back button
  main.js                  boot, screen scaling, main loop (loaded last)
```
Scripts are classic `<script>` tags sharing the `G` namespace (not ES modules) so the game also runs
from `file://` and inside the Android WebView. Load order is set in `index.html`.

Where to change things:
- New card / monster / room / item → `js/models/*.js`
- How a monster rule works → `js/controllers/combat.js` (`hit()` and the monster turn)
- Puzzle difficulty → `js/models/puzzles.js`
- Wall/floor art → `js/views/textures.js` (each room theme is `{ walls: [...], floor, ceil }` of 64×64 pixels)

## Testing from the console (F12 → Console)
```js
G.dev.rooms()            // list room codes
G.dev.go('B')            // jump to the Giant's Bedroom, facing the troll
G.dev.fight('witch')     // start any battle: rat goblin skeleton spider archer wolf troll wizard knight witch
G.dev.keys()             // 3 Moon Keys
G.dev.free('skeleton')   // unlock that room's mini-game
G.dev.answers(true)      // print each puzzle's answer
G.dev.level(3)           // puzzle level 1-3
G.dev.reveal()           // show the whole map
```
Saves live in the browser's localStorage, separate from the tablet.
