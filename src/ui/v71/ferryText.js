// Version 7.1, Track F: the words of ferries (rulings 1040-1059). Every number and rule here comes from the sim's own function or data: the
// widths (FERRY, BRIDGE_MAX), the price (ferryCost, costOf), the road tiles a crossing counts for (crossingTiles), the monthly bill (monthlyBill)
// and the landing's own reason for not working (landingBlocker): src/sim/ferries.js, with a test that sets each up both ways.
// Importing this file registers How to play's Ferries entry and the ferries tip, so menu.js and the placing code import it.
import { plural, S45_TEXT, TIP_TEXT, TIP_HELP_TEXT } from '../text.js';
import { FERRY, FERRY_LANDING, FERRY_FIND } from '../../data/ferries.js';
import { BRIDGE_MAX } from '../../sim/bridges.js';
import { monthlyBill } from '../../sim/economy.js';

const DIRECTION = { north: 'north', north_east: 'north-east', east: 'east', south_east: 'south-east', south: 'south', south_west: 'south-west', west: 'west', north_west: 'north-west' };

// The two landings' monthly bill in the bar's own words ("Costs 10 a month · 2 workers"): twice one landing's (monthlyBill), the sim's number.
const crossingBill = (world) => { const b = monthlyBill(FERRY_LANDING, world); return { upkeep: 2 * b.upkeep, wages: 2 * b.wages, workers: 2 * b.workers, bill: 2 * b.bill }; };

export const FERRY_TEXT = {
  name: 'Ferry',
  // The bar before a line is drawn: how to draw one, and what a ferry is for.
  // Version 8.2.1 (rulings 1348, 1350): the map shows the crossings near the roads; a tap picks one, and a drag still works.
  idleTouch: 'Tap a crossing, then ✓ · or drag across',   // ruling 1086: the idle bar is held at its tallest, so these three lines are short to keep a phone's bar low
  idleMouse: 'Click a crossing, then ✓ · or click both banks',
  note: `Wide water: ${FERRY.min} to ${FERRY.max} tiles across`,
  // The Roads tray's card: its ground line and tooltip (the price is the sim's, ferryCost).
  card: `Pick a crossing: ${FERRY.min} to ${FERRY.max} tiles of water`,
  cardUnit: ' per crossing',
  cardTitle: (cost) => `A ferry crosses water too wide for a bridge (more than ${BRIDGE_MAX} tiles): ${FERRY.min} to ${FERRY.max} tiles of water. Pick one of the crossings the map shows near your roads, or drag across; a landing with no road gets a short road with it. ${cost} gold for the two landings, a little more for any road, and a ferryman at each landing.`,
  // The bar's line for a crossing the sim accepts: one short line, the water and what the two ferrymen cost a month (ruling 1086: on a phone a longer line wrapped to seven lines beside the
  // four buttons). What it counts as for walkers and carts is in the landing's sheet (sheet.runs) and How to play.
  summary: (world, r) => [`${plural(r.water, 'tile', 'tiles')} of water`, r.roads && r.roads.length ? plural(r.roads.length, 'road tile', 'road tiles') : '', S45_TEXT.upkeepBill(crossingBill(world))].filter(Boolean).join(' · '),   // 8.2.1: and the road it lays
  // What Show me is named for: a ferry, or (after a ferry_bridge refusal) a bridge, which is where it goes.
  showFitWhat: { ferry: 'a ferry', bridge: 'a bridge' },
  // A refusal says why, with the number that decided it.
  refusal(r) {
    switch (r.reason) {
      case 'ferry_no_water': return 'No water on this line: a ferry crosses water';
      case 'ferry_bent': return 'A ferry runs straight across one stretch of water: drag along one row or column';
      case 'ferry_bridge': return `Only ${plural(r.water, 'tile', 'tiles')} of water: a bridge does this (the road tool)`;
      case 'ferry_too_wide': return `Too wide for a ferry (${plural(r.water, 'tile', 'tiles')} of water; the most is ${FERRY.max})`;
      case 'ferry_no_land': return 'No free dry land to land on here: the water runs on, or the bank is built on';
      case 'ferry_no_road': return `No road can reach a landing here: lay a road within ${FERRY_FIND.nearStub} tiles of the bank`;
      default: return null;
    }
  },
  laid: 'Ferry laid: it runs once both landings have a ferryman',
  // Version 8.2.1 (rulings 1348-1350): the shown crossings' words: the bar's buttons (name: what it shows; label: what a screen reader says), the price on the map's
  // ghost boat, and the plain words when the roads reach no water a ferry can cross (with Show me: the nearest place a ferry could go).
  choiceName: (water, cost) => `${water} tiles · ${cost}`,
  choiceLabel: (water, cost, roads = 0) => `Ferry crossing, ${plural(water, 'tile', 'tiles')} of water, ${cost} gold${roads ? `, with ${plural(roads, 'road tile', 'road tiles')}` : ''}`,
  choicesGroup: 'Ferry crossings near your roads',
  mapLabel: (cost) => `${cost} gold`,
  noneNear: 'No river here is narrow enough for a ferry near your roads: extend a road along the bank',
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
  // How to play's entry and the tip.
  help: { head: 'Ferries', text: `A bridge crosses up to ${BRIDGE_MAX} tiles of water. Wider water, from ${FERRY.min} up to ${FERRY.max} tiles, takes a ferry: pick Ferry in the Roads tray, and the map shows the best crossings near your roads: tap one, then ✓ (or drag across the water). It lays a landing on each bank, and a short road to any landing that has none, and costs gold for the crossing and a monthly bill for its two ferrymen. Once both have a ferryman, walkers and carts cross as if it were a few road tiles (a landing's sheet says how many), and a small boat carries people and carts across; with motion still it waits at a landing. A landing's sheet says why a crossing is not running. Raiders and armies never use a ferry.` },
  tip: `Water too wide for a bridge? Pick Ferry in the Roads tray and tap a crossing: ${FERRY.min} to ${FERRY.max} tiles.`,
};

// Registered where How to play and the tips list read them: menu.js lists V71_HELP's paragraphs, and the tip joins TIP_TEXT and TIP_HELP_TEXT.
export const V71_HELP = { f: [FERRY_TEXT.help] };   // How to play's Version 7.1 paragraphs, by track (menu.js lists them after Version 7.0's)
TIP_TEXT.ferries = FERRY_TEXT.tip;
TIP_HELP_TEXT.ferries = FERRY_TEXT.tip;
