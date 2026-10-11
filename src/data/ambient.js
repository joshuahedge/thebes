// Ambient life (spec 5.6, ruling 133), all tunable. Drawn on the real clock over the baked terrain for visible tiles
// only (src/render/ambient.js); off under reduced motion or the Ambient motion setting. Times are real milliseconds.
export const AMBIENT = {
  glintDriftTilesPerSecond: 0.2,   // water glints drift downstream ...
  glintFadeMs: [4000, 7000],       // ... fading in and out over 4-7 s
  rippleShiftPx: 1,                // bank ripples shift about 1 px back and forth ...
  ripplePeriodMs: 5000,            // ... over 5 s
  reedSwayDeg: 3,                  // reeds sway +-3 degrees ...
  reedSwayPeriodMs: [3000, 6000],  // ... over 3-6 s
  treeSwayDeg: 2,                  // palms and acacias lean +-2 degrees from the base ...
  treeSwayPeriodMs: [4000, 6000],  // ... over 4-6 s
  cropBandEveryMs: 6000,           // a lighter band crosses a working farm in the wind direction
  smokeEveryMs: [2000, 3000],      // one puff every 2-3 s from kilns, the brewery and chimneys of Townhouses and up
  smokeRiseTiles: 1,
  rareEveryMs: [60000, 120000],    // a bird, a felucca, ducks: at most one of each on screen, each every 60-120 s
  rareKinds: ['bird', 'felucca', 'ducks'],
  maxChangeHz: 1,                  // nothing changes direction or brightness more than once a second
  budgetMs: 2,                     // a frame's ambient budget on a mid-range phone (the stress city)
  dropOrder: ['rare', 'smoke', 'sway'],   // over budget, drop these first, in this order; the water always stays
  idleFpsCap: 30,                  // paused, with no input for idleAfterMs: cap the frame rate
  idleAfterMs: 2000,
};
