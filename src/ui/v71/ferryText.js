// Version 7.1, Track F: the words of ferries (rulings 1040-1059). Every number and rule here comes from the sim's own function or data: the
// widths (FERRY, BRIDGE_MAX), the price (ferryCost, costOf), the road tiles a crossing counts for (crossingTiles), the monthly bill (monthlyBill)
// and the landing's own reason for not working (landingBlocker): src/sim/ferries.js, with a test that sets each up both ways.
// Importing this file registers How to play's Ferries entry and the ferries tip, so menu.js and the placing code import it.
// Version 8.3 "Lines", Track X (rulings 1390-1409): the road tool lays a bridge or a ferry, and the Ferry card is the Crossing card. CROSSING_TEXT below is
// the road bar's crossing words (src/sim/bridges.js crossingRuns is the rule they say); FERRY_TEXT's card, help and tip say both limits.
import { plural, S45_TEXT, TIP_TEXT, TIP_HELP_TEXT } from '../text.js';
import { FERRY, FERRY_LANDING, FERRY_FIND } from '../../data/ferries.js';
import { BRIDGE_MAX } from '../../sim/bridges.js';
import { monthlyBill } from '../../sim/economy.js';

const DIRECTION = { north: 'north', north_east: 'north-east', east: 'east', south_east: 'south-east', south: 'south', south_west: 'south-west', west: 'west', north_west: 'north-west' };

// The two landings' monthly bill in the bar's own words ("Costs 10 a month · 2 workers"): twice one landing's (monthlyBill), the sim's number; n ferries, n times.
export const crossingBill = (world, n = 1) => { const b = monthlyBill(FERRY_LANDING, world); return { upkeep: 2 * n * b.upkeep, wages: 2 * n * b.wages, workers: 2 * n * b.workers, bill: 2 * n * b.bill }; };

export const FERRY_TEXT = {
  name: 'Crossing',   // Version 8.3 (ruling 1396): the card's name (buildingName('ferry'), src/ui/text.js Track X's section)
  // The bar before a line is drawn: how to draw one, and what a ferry is for.
  // Version 8.2.1 (rulings 1348, 1350): the map shows the crossings near the roads; a tap picks one, and a drag still works.
  idleTouch: 'Tap a crossing, then ✓ · or drag across',   // ruling 1086: the idle bar is held at its tallest, so these three lines are short to keep a phone's bar low
  idleMouse: 'Click a crossing, then ✓ · or click both banks',
  note: `Bridges up to ${BRIDGE_MAX} tiles of water, ferries ${FERRY.min} to ${FERRY.max}`,
  // The Roads tray's card: its ground line and tooltip (the price is the sim's, ferryCost: a ferry's two landings).
  card: `Cross water: bridges up to ${BRIDGE_MAX} tiles, ferries ${FERRY.min} to ${FERRY.max}`,
  cardUnit: ' a ferry',
  cardTitle: (cost) => `Cross water: a bridge over up to ${BRIDGE_MAX} tiles of water, a ferry over ${FERRY.min} to ${FERRY.max}. Pick one of the crossings the map shows near your roads, or drag across; it lays the short road it needs. A road dragged straight across the water lays them too. A ferry is ${cost} gold for its two landings and a ferryman at each.`,
  // The bar's line for a crossing the sim accepts: one short line, the water and what the two ferrymen cost a month (ruling 1086: on a phone a longer line wrapped to seven lines beside the
  // four buttons). What it counts as for walkers and carts is in the landing's sheet (sheet.runs) and How to play. Version 8.3: it leads with its kind, as a bridge's does.
  summary: (world, r) => [`Ferry: ${plural(r.water, 'tile', 'tiles')} of water`, r.roads && r.roads.length ? plural(r.roads.length, 'road tile', 'road tiles') : '', S45_TEXT.upkeepBill(crossingBill(world))].filter(Boolean).join(' · '),   // 8.2.1: and the road it lays
  // What Show me is named for: a ferry, or (after a ferry_bridge refusal) a bridge, which is where it goes; Version 8.3: a crossing (the Crossing card opens there).
  showFitWhat: { ferry: 'a ferry', bridge: 'a bridge', crossing: 'a crossing' },
  // A refusal says why, with the number that decided it.
  refusal(r) {
    switch (r.reason) {
      case 'ferry_no_water': return 'No water on this line: a crossing crosses water';
      case 'ferry_bent': return 'A ferry runs straight across one stretch of water: drag along one row or column';
      case 'ferry_bridge': return `Only ${plural(r.water, 'tile', 'tiles')} of water: a bridge does this (the road tool)`;
      case 'ferry_too_wide': return CROSSING_TEXT.tooWide(r.water);
      case 'ferry_no_land': return 'No free dry land at the water\'s edge here: the water runs on, or the bank is built on';
      case 'ferry_no_road': return `No road can reach this crossing: lay a road within ${FERRY_FIND.nearStub} tiles of the bank`;
      default: return null;
    }
  },
  laid: 'Ferry laid: it runs once both landings have a ferryman',
  // Version 8.2.1 (rulings 1348-1350): the shown crossings' words: the bar's buttons (name: what it shows; label: what a screen reader says), the price on the map's
  // ghost boat, and the plain words when the roads reach no water a ferry can cross (with Show me: the nearest place a ferry could go).
  // Version 8.3 (ruling 1400): a button names its kind as well as its water and price ("Bridge 3 · 60", "Ferry 7 · 172"), so a bridge and a ferry never differ by colour alone.
  choiceName: (water, cost, kind = 'ferry') => `${kind === 'bridge' ? 'Bridge' : 'Ferry'} ${water} · ${cost}`,
  choiceLabel: (water, cost, roads = 0, kind = 'ferry') => `${kind === 'bridge' ? 'Bridge' : 'Ferry crossing'}, ${plural(water, 'tile', 'tiles')} of water, ${cost} gold${roads ? `, with ${plural(roads, 'road tile', 'road tiles')}` : ''}`,
  choicesGroup: 'Crossings near your roads',
  mapLabel: (cost) => `${cost} gold`,
  noneNear: 'No water near your roads that a bridge or a ferry can cross: extend a road along the bank',
  noFit: 'No place on this map where a ferry fits',
  // The landing's sheet.
  sheet: {
    across: (water, dx, dy, compass) => `Ferry across ${plural(water, 'tile', 'tiles')} of water, to the ${DIRECTION[compass(dx, dy)] || 'other bank'}`,
    runs: (tiles) => `Running: walkers and carts cross as if it were ${plural(tiles, 'road tile', 'road tiles')}`,
    stopped: (why) => `Not running: ${why}`,
    why: {
      no_mate: 'the landing across the water is gone. Lay a new ferry, or demolish this landing',
      no_road: 'no road reaches this landing, so no ferryman can come',
      paused: 'this landing is paused. Resume it',
      burning: 'this landing is on fire',
      no_ferryman: 'no ferryman: there are not enough people for the jobs',
      mate_no_road: 'no road reaches the landing across the water',
      mate_paused: 'the landing across the water is paused',
      mate_burning: 'the landing across the water is on fire',
      mate_no_ferryman: 'the landing across the water has no ferryman',
    },
    other: 'Show the other landing',
    otherLabel: 'Show the other landing of this ferry on the map',
  },
  // How to play's entry and the tip (Version 8.3, ruling 1401: the crossings tip, both limits in one line).
  help: { head: 'Crossings', text: `A road crosses water. Drag it straight across, from bank to bank: over up to ${BRIDGE_MAX} tiles of water it lays a bridge; over ${FERRY.min} to ${FERRY.max} tiles, a ferry, with a landing on each bank and the road going on from the far one. Wider water, or a bent line, is refused, and the bar says why. While you drag, the water is tinted: teal for a bridge, blue for a ferry, coral when it cannot be crossed there. The Crossing card in the Roads tray shows the best crossings near your roads: tap one, then ✓. A ferry costs gold for its two landings and a monthly bill for its two ferrymen. Once both have a ferryman, walkers and carts cross as if it were a few road tiles (a landing's sheet says how many), and a small boat carries people and carts across; with motion still it waits at a landing. A landing's sheet says why a crossing is not running. Raiders and armies never use a ferry.` },
  tip: `Roads cross water: a bridge up to ${BRIDGE_MAX} tiles, a ferry ${FERRY.min} to ${FERRY.max}. Drag straight across, bank to bank.`,
};

// Version 8.3 (Track X, rulings 1393-1395): the road bar's words for the water a stroke crosses, one line each, in the sim's numbers (crossingRuns,
// previewRoadTiles: the run's water, its kind, the look-ahead of a drag still on its way across). The tint on the map says the same in colour.
export const CROSSING_TEXT = {
  bridge: (n) => `Bridge: ${plural(n, 'tile', 'tiles')} of water`,
  ferry: (n) => `Ferry: ${plural(n, 'tile', 'tiles')} of water, walkers wait at the bank`,
  // Too wide: both limits (ruling 1395); a map with no river has bridges only (ruling 1333).
  tooWide: (n, ferries = true) => (ferries ? `Too wide: ${plural(n, 'tile', 'tiles')} (a bridge crosses up to ${BRIDGE_MAX}, a ferry up to ${FERRY.max})` : `Too wide: ${plural(n, 'tile', 'tiles')} (a bridge crosses up to ${BRIDGE_MAX})`),
  bent: 'A crossing must go straight across',
  // A drag still on its way across: what the water ahead takes, and that it must reach the far bank.
  ahead: (kind, n) => `${kind === 'bridge' ? 'Bridge' : 'Ferry'}: ${plural(n, 'tile', 'tiles')} of water · drag on to the far bank`,
  // A touch plan that stops in the water: ✓ still lays its dry part, as in 8.2.1, and the bar says so.
  aheadOrLay: (kind, n) => `${kind === 'bridge' ? 'Bridge' : 'Ferry'}: ${plural(n, 'tile', 'tiles')} of water · drag on to the far bank, or ✓ lays the road to the bank`,
  noFarBank: 'No far bank: the water runs on to the map\'s edge',
  // A ferry's landing tile (ruling 1393): why it cannot take one. A plain road there is no bar (ruling 1406): the landing takes its tile (lifted).
  landingTaken: (block) => (block === 'taken' ? 'A ferry needs a bank tile of its own: this strip of land is too narrow to share between two crossings'
    : `A ferry lands on a free bank tile: this one ${{ built: 'is built on', wall: 'has a wall or a gate on it', ground: 'is not open ground' }[block] || 'is taken'}`),
  lifted: (n) => `the landing takes ${plural(n, 'road tile', 'road tiles')} at the bank`,
  landingNoRoad: 'A ferry landing needs a road beside it: carry the road on past the bank',
  // The bar's line for a stroke that lays a ferry: the crossing, the road it lays and the ferrymen's bill.
  bill: (world, n) => S45_TEXT.upkeepBill(crossingBill(world, n)),
  roadTiles: (n) => plural(n, 'road tile', 'road tiles'),
  // The tool's toast once a stroke has laid them.
  laidFerry: 'Road laid · ferry: it runs once both landings have a ferryman',
  laidBridge: 'Bridge laid',
  // The idle road bar's note (ruling 1395: the limits are said before the first drag), with the bridge's price a tile.
  roadNote: (cost, ferries = true) => (ferries ? `Water: bridge up to ${BRIDGE_MAX} tiles (${cost} a tile), ferry ${FERRY.min} to ${FERRY.max}` : `Water: a bridge, ${cost} gold a tile`),
};

// Registered where How to play and the tips list read them: menu.js lists V71_HELP's paragraphs, and the tip joins TIP_TEXT and TIP_HELP_TEXT.
export const V71_HELP = { f: [FERRY_TEXT.help] };   // How to play's Version 7.1 paragraphs, by track (menu.js lists them after Version 7.0's)
TIP_TEXT.ferries = FERRY_TEXT.tip;
TIP_HELP_TEXT.ferries = FERRY_TEXT.tip;
