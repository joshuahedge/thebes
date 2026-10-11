// The score interface (spec 4.1, 4.17, 4.19): the summary's score section with Seal this reign and Share score, the
// score chip on the summary button, the next-threshold bar, the "+N" score preview in the confirm bar, feats, citizen
// remarks, and the title card's records, stamps, weekly seed and shared score. Stage 3 contract: Track E implements the
// STUBs; createUI makes one per game exactly as it makes the danger interface (src/ui/danger.js: the same ctx, the same
// returned shape), and boot.js decorates the title card through titleDecor.
//
// STUB. Returns { sheets, sheetParts: { building, house, actions, summary }, onEvents, refresh, onAlertAction, onCommand,
// destroy } (danger.js). Share score's screenshot button calls ctx.screenshotMode().
export function createScoreUi(ctx) {
  return {
    sheets: {},
    sheetParts: { building: () => [], house: () => [], actions: () => [], summary: () => [] },
    onEvents() {},
    refresh() {},
    onAlertAction() {},
    onCommand() {},
    destroy() {},
  };
}

// STUB. The confirm bar's score line for a building ghost that can be placed at (x, y): the parts it would change by 1
// point or more, counting it as staffed ("+3 Culture"), or '' for none. placement.js calls it for every preview, so it
// memoises on the ghost tile and the city's state, as nicerFor does.
export function scoreLineFor(world, type, x, y) {
  return '';
}

// STUB. The title card's decoration (spec 4.1, 4.19): the three highest bests and a stamp per sealed reign under
// Continue, This week's Nile, and a shared score link's "Beat N?" with Start this seed. boot.js calls titleDecor once per
// title card and passes the result to createTitleCard as decorate, which calls it with (element, { buttonBox, newCity }).
// opts: { records (src/save/records.js), shared (the page's location hash, '' for none), startSeed(seed) (starts a
// city on that seed, asking first when a city is saved, as New city does), clock }.
export function titleDecor(opts) {
  return () => {};
}
