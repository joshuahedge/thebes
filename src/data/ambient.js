// Ambient life (spec 5.6, ruling 133), all tunable. Drawn on the real clock over the baked terrain for visible tiles
// only (src/render/ambient.js); all of it under Motion Full, its fades in place under Gentle, none under Still. Times are
// real milliseconds. Stage 4 (ruling 219, Track E): a notch more visible within the same budget: a third more glints and a
// third brighter, larger and longer-lived smoke puffs (one always in the air over a working kiln), rare life every
// 45-90 s, and the brickworks' kiln smokes.
export const AMBIENT = {
  glintShare: 0.93,                // the share of river tiles with a glint (Stage 3: 0.7; a third more)
  glintAlpha: 1,                   // a glint's peak opacity (Stage 3: 0.75; a third brighter)
  glintDriftTilesPerSecond: 0.2,   // water glints drift downstream ...
  glintFadeMs: [4000, 7000],       // ... fading in and out over 4-7 s
  rippleShiftPx: 1,                // bank ripples shift about 1 px back and forth ...
  ripplePeriodMs: 5000,            // ... over 5 s
  reedSwayDeg: 3,                  // reeds sway +-3 degrees ...
  reedSwayPeriodMs: [3000, 6000],  // ... over 3-6 s
  treeSwayDeg: 2,                  // palms and acacias lean +-2 degrees from the base ...
  treeSwayPeriodMs: [4000, 6000],  // ... over 4-6 s
  treeLeanSteps: 4,                // lean slots each side of upright (palm.l-4 ... palm.l4): half a degree a step
  cropBandEveryMs: 6000,           // a lighter band crosses a working farm in the wind direction
  smokeEveryMs: [2000, 3000],      // one puff every 2-3 s from kilns (potter, brewery, brickworks) and chimneys of Townhouses and up
  smokeRiseTiles: 1,
  smokeLifePeriods: 3,             // each puff lives this many of those periods, so three are in the air at once (Stage 3: 2)
  smokeRadius: [2.2, 3.8],         // a puff's radius in art px as it starts, and how much it grows over its life (Stage 3: 1.6, 2.6)
  smokeAlpha: 0.5,                 // a puff's peak opacity (Stage 3: 0.42)
  rareEveryMs: [45000, 90000],     // a bird, a felucca, ducks: at most one of each on screen, each every 45-90 s (Stage 3: 60-120)
  rareKinds: ['bird', 'felucca', 'ducks'],
  maxChangeHz: 1,                  // nothing changes direction or brightness more than once a second
  budgetMs: 2,                     // a frame's ambient budget on a mid-range phone (the stress city)
  dropOrder: ['rare', 'smoke', 'sway'],   // over budget, drop these first, in this order; the water always stays
  idleFpsCap: 30,                  // paused, with no input for idleAfterMs: cap the frame rate
  idleAfterMs: 2000,
};

// Processions (spec 5.7 items 3 and 4, rulings 214, 257), drawn as walkers (src/render/walkers.js), Track E. A festival's
// procession walks the roads in each working temple's reach while the festival lasts (FESTIVAL.days), starting at `start`
// figures and gaining one for each temple, booth and finished monument, up to `max`. A dedication walks from the nearest
// temple whose reach meets the new monument's road to it (or along the monument's own road, ownReach tiles, when none
// does) for dedicationDays after it is finished, with dedicationFigures figures. At most maxOnScreen processions, the
// nearest the middle of the view; they drop once the ambient budget has dropped all it can (render/walkers.js).
export const PROCESSION = {
  start: 4,
  max: 12,
  tilesPerDay: 1,                  // half a walker's pace: a stately walk
  spacing: 0.85,                   // tiles between one figure and the next along the road
  // The figures in walking order (Track B's walker kinds, src/render/art/figures.js): the first four already show a
  // priest holding up the standard (art-direction review 10: the eye finds the festival by it), the carried shrine, a
  // musician and a dancer.
  order: ['standard', 'shrine', 'musician', 'dancer', 'priest', 'musician', 'dancer', 'musician', 'dancer', 'priest', 'dancer', 'musician'],
  dedicationDays: 30,
  dedicationFigures: 6,
  ownReach: 4,
  maxOnScreen: 3,
  flutterMs: 1000,                 // the temple's streamers change shape once a second, under Full only
};
