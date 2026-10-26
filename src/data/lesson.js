// Version 6.0, Track D2 (rulings 760-779): the guided first city (the lesson). Track 0 (contract,
// docs/superpowers/notes/2026-10-22-version-6-0-contract.md) made the file; Track D2 owns it. A leaf data file: it imports nothing.
//
// The lesson's state is the device's, never a city's (ruling 626): two settings keys (src/ui/settings.js), lessonDone (true once the
// lesson has ended "Your first city stands") and lessonStep (the step reached, 0 before it starts, for a lesson left part-way), and
// src/ui/lesson.js lessonDue reads them. Nothing about the lesson is in the world, so no save changes with it, and the lesson's own
// city is never saved (src/boot.js).
//
// The map is fixed: seed 7 at 48 tiles on the classic river, a Normal city (raids on, so the lesson can meet one). The start road
// comes in from the south edge at x 20 and ends at (20, 39); the river runs down the west side with fertile land beside it, so
// the road turns west along y 39 to the green. Everything the steps point at sits on that ground (LESSON_PLACES); the scripted
// walk-through (tests/v60/d2) and the resume (src/sim/lesson.js replayTo) lay the same places.
export const LESSON = { seed: 7, size: 48, variant: 'classic', difficulty: 'normal' };

// Places on the lesson's map, in tiles ([x, y] is a building's north-west tile). Each one is checked against the sim's own placing rules by
// tests/v60/d2/steps.test.js.
export const LESSON_PLACES = {
  road: { from: [20, 39], to: [11, 39] },   // west from the start road's end to the fertile land: 9 new tiles
  homes: [19, 41, 19, 46],                   // x0, y0, x1, y1: six plots down the west side of the start road
  moreHomes: [21, 40, 21, 42],               // three more on the east side, for the workers the farm, granary and bazaar want
  well: [19, 40],
  farm: [11, 40],                            // a 2x2 on fertile ground, touching the new road
  granary: [14, 40],
  bazaar: [21, 43],
  largePlot: [17, 37],                       // a 2x2 on the road's north side
  firehouse: [21, 45],
  tower: [21, 39],
};

// The steps, in order. Each is { id, check, at?, dom?, show?, stage? }:
//   check  what the sim must show for the step to be done (src/sim/lesson.js stepDone): roadTiles { n } (road laid beyond the start road), homesOnRoad { n },
//          served { type, homes } (a building of the type reaches that many homes along the roads), people { n }, building { type }, working { types },
//          months { n }, tally { key, n }, tallyAny { keys, n }, covered { type } (a staffed firehouse reaches the building of that type), towers (enough
//          staffed towers for the raid warned, or the raiders have come), raidOver.
//   at     what the map lights and dims the rest round, in tiles: { x, y, w, d } (a footprint) or { of: type } (the first building of the type, whose own
//          footprint it is), or { of: 'raidTarget' } (the building the warned raid is after, Version 8.2). Nothing for a step about the whole city. Whatever a step lights, its words name (tests/v82/l/targets.test.js).
//   dom    a selector for the control the step points at (the speed control, the gold chip), lit with a ring.
//   show   Show me's card: { category, item }; it opens the card and puts the ghost where it fits round `at`.
//   stage  what the lesson sets up when the step begins (src/sim/lesson.js STAGES): 'largePlot' (the card, which a Townhouse opens in a real city),
//          'fire' (a small blaze in the bazaar), 'raid' (the Market town's cards and the raid clock).
//   play   Version 7.0 (Track P, ruling 1002): how a step's card and the game's clock go together. Every step opens as a card in the middle of the screen
//          and pauses the game (src/ui/v60/lesson.js). 'card': the step only waits on the game, so dismissing its card plays again, at the speed the player
//          had before the card paused it; 'warning': the same until the raid warning is up (the sim pauses the game itself then, and the step turns into 'act');
//          'act': the player builds first, so the game stays paused behind the docked row until `act` is done, then plays again by itself; no `play`: the
//          step is done the moment the player has built what it asks (the next step's card then pauses again).
//   act    what the player's own part of an 'act' step is (src/sim/lesson.js actionDone): plots { more } painted since the step began, building { type } stands,
//          towers (as many as the raid warned needs, built: their crews come with time).
//   lock   Version 8.1 (Track T, ruling 1204): the controls the step leaves live besides its own card and category (src/ui/v81/lessonLock.js ids): the speed control for a step
//          about time (every step with a `play`), the gold for the months. Everything else is dimmed while the step runs.
// Version 8.1 (Track T, ruling 1202): the Large plot comes straight after the homes, in the Homes chapter, where its idea belongs (it was after the months).
export const LESSON_STEPS = [
  { id: 'road', check: { kind: 'roadTiles', n: 9 }, at: { x: 11, y: 39, w: 9, d: 1 }, show: { category: 'roads', item: 'road' } },
  { id: 'homes', check: { kind: 'homesOnRoad', n: 6 }, at: { x: 19, y: 41, w: 1, d: 6 }, show: { category: 'homes', item: 'house' } },
  { id: 'largeplot', stage: 'largePlot', check: { kind: 'tally', key: 'largePlots', n: 1 }, at: { x: 17, y: 37, w: 2, d: 2 }, show: { category: 'homes', item: 'large_plot' } },
  { id: 'well', check: { kind: 'served', type: 'well', homes: 3 }, at: { x: 19, y: 40, w: 1, d: 1 }, show: { category: 'services', item: 'well' } },
  { id: 'families', check: { kind: 'people', n: 12 }, dom: '#topbar .speed-bar', play: 'card' },
  { id: 'farm', check: { kind: 'building', type: 'farm_grain' }, at: { x: 11, y: 40, w: 2, d: 2 }, show: { category: 'food', item: 'farm_grain' } },
  { id: 'granary', check: { kind: 'building', type: 'granary' }, at: { x: 14, y: 40, w: 2, d: 2 }, show: { category: 'food', item: 'granary' } },
  { id: 'bazaar', check: { kind: 'served', type: 'bazaar', homes: 3 }, at: { x: 21, y: 43, w: 2, d: 2 }, show: { category: 'services', item: 'bazaar' } },
  { id: 'workers', check: { kind: 'working', types: ['farm_grain', 'granary', 'bazaar'] }, at: { x: 21, y: 40, w: 1, d: 3 }, show: { category: 'homes', item: 'house' }, play: 'act', act: { kind: 'plots' } },
  { id: 'month', check: { kind: 'months', n: 2 }, dom: '#topbar .stat.gold', play: 'card', lock: ['stat-gold'] },   // Version 8.1 (Track B): the gold itself (its forecast is its explainer)
  { id: 'firehouse', check: { kind: 'covered', type: 'bazaar' }, at: { x: 21, y: 45, w: 1, d: 1 }, show: { category: 'services', item: 'firehouse' }, play: 'act', act: { kind: 'building', type: 'firehouse' } },
  { id: 'fire', stage: 'fire', check: { kind: 'tallyAny', keys: ['blazesOut', 'firesOut'], n: 1 }, at: { of: 'bazaar' }, play: 'card' },
  { id: 'tower', stage: 'raid', check: { kind: 'towers' }, at: { x: 21, y: 39, w: 1, d: 1 }, show: { category: 'defence', item: 'tower' }, play: 'warning', act: { kind: 'towers' } },
  { id: 'raid', check: { kind: 'raidOver' }, at: { of: 'raidTarget' }, play: 'card' },   // Version 8.2 (Track L, ruling 1320): the building the raid is after (src/sim/lesson.js raidTarget), named in the step's words
];

// Version 8.2 (integration, ruling 1331): the build category a step opens on the wide panel and the phone's tray as it begins: its own card's (show.category), else that of
// the step before it in its chapter that has one (the raid: the tower's Defence; the months: the homes the workers wanted; the fire: the firehouse's Services). Never Roads
// by default.
export function stepCategory(i) {
  const step = LESSON_STEPS[i];
  if (!step) return null;
  if (step.show) return step.show.category;
  const chapter = LESSON_CHAPTERS.find((c) => c.steps.includes(step.id));
  const before = chapter.steps.slice(0, chapter.steps.indexOf(step.id)).reverse().map((id) => LESSON_STEPS.find((s) => s.id === id));
  const own = before.find((s) => s.show);
  return own ? own.show.category : null;
}

// Version 8.1 "The vizier" (Track T, rulings 1202-1203): the lesson in chapters, one idea each (design 7b): roads, homes, water, food, work and trade, fire, defence.
// A chapter opens with its card in the middle of the screen, the game paused behind it; the steps inside it (micro-steps) are said by Ipi in the docked bubble and
// do not pause. Each chapter is a run of LESSON_STEPS in order (tests/v81/t holds it), so the steps, their checks and the walk-through are unchanged.
export const LESSON_CHAPTERS = [
  { id: 'roads', steps: ['road'] },
  { id: 'homes', steps: ['homes', 'largeplot'] },
  { id: 'water', steps: ['well', 'families'] },
  { id: 'food', steps: ['farm', 'granary'] },
  { id: 'work', steps: ['bazaar', 'workers', 'month'] },
  { id: 'fire', steps: ['firehouse', 'fire'] },
  { id: 'defence', steps: ['tower', 'raid'] },
];
