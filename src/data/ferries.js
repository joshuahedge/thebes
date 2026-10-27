// Version 7.1, Track F: ferries (rulings 1040-1059). Where water is too wide to bridge (more than MAP.bridgeMax = 4 tiles), a ferry
// links the two banks: two landings, one a bank, laid in one drag straight across FERRY.min to FERRY.max tiles of water. This file is a
// leaf (it imports nothing): the rule is src/sim/ferries.js, the words src/ui/v71/ferryText.js.
//
//   min, max       how many tiles of water a ferry may cross (a bridge takes up to 4, so a ferry starts at 5)
//   wait           road tiles' worth of waiting on the bank, for any crossing
//   waterPerTile   tiles of water that take as long as one road tile (the boat is quicker than a walker)
//   A crossing counts for walkers and carts as `wait + ceil(water / waterPerTile)` road tiles (src/sim/ferries.js crossingTiles).
export const FERRY = { min: 5, max: 12, wait: 3, waterPerTile: 3 };

export const FERRY_LANDING = 'ferry_landing';

// Version 8.2.1 "Easier ferries" (rulings 1340-1359): the Ferry tool shows the best crossings near the roads and lays the roads a crossing needs
// (src/sim/ferryFind.js is the rule):
//   nearStub   the most road tiles laid from the near landing to the road network, when no road is beside it (ruling 1342)
//   farStub    the road laid on from a landing that has no road beside it, away from the water, so buildings can join it (ruling 1343)
//   shown      how many crossings the map shows at once (ruling 1345)
//   apart      shown crossings are at least this many tiles apart (their middles, either way), so they are not one place twice (ruling 1345)
//   band       nearness counts in bands of this many tiles, so what a crossing opens can tell two about as near apart (ruling 1344)
//   opensR     the good ground a crossing opens: free fertile, clay and rocky tiles this many tiles about its far landing (ruling 1344)
//   snap       a dragged line snaps to a crossing whose water lies at most this many tiles from the water it was dragged over (ruling 1347)
export const FERRY_FIND = { nearStub: 3, farStub: 3, shown: 3, apart: 4, band: 8, opensR: 4, snap: 3 };

// The landing's row. A crossing's price is two landings (ruling 1041): the card and the bar read it through costOf like any building.
// Never a card of its own (buildable: false: the Ferry tool in the Roads tray lays both); one ferryman a landing, who must reach it by road.
export const FERRY_BUILDINGS = {
  [FERRY_LANDING]: {
    name: 'Ferry landing', w: 1, d: 1, cost: 80, upkeep: 4, workers: 1, priority: 'services', category: null, needsRoad: true, buildable: false, ferry: true,
  },
};

// The ferries tip (How to play lists every tip): the first time a road meets water too wide for a bridge in the road tool, fired by the Map seam
// (src/ui/s46/map.js) as 'roadTooWide'; its words are TIP_TEXT.ferries and TIP_HELP_TEXT.ferries (src/ui/v71/ferryText.js).
export const FERRY_TIPS = [{ id: 'ferries', trigger: 'roadTooWide', priority: false }];
