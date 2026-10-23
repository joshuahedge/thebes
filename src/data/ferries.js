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
