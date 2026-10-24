// Version 7.1, Track M (rulings 1020-1039): the words for the new river layouts. How to play shows MAPS_HELP after Version 7.0's
// paragraphs (src/ui/menu.js). Every number comes from the map's own data (src/data/map.js), so the words follow the generator.
import { MAP, MAP_VARIANTS, MAP_VARIANTS_71 } from '../../data/map.js';

// Each layout's name, as a player reads it (the six older ones first).
export const LAYOUT_NAMES = {
  classic: 'Classic', east: 'East bank', middle: 'Middle', 'wide-bends': 'Wide bends', island: 'Island', oasis: 'Oasis',
  delta: 'Delta', confluence: 'Confluence', twin: 'Twin rivers', 'wide-nile': 'Wide Nile', cataract: 'Cataract', 'lake-fed': 'Lake-fed',
};

const C = MAP.courses;
const range = ([a, b]) => (a === b ? `${a}` : `${a} or ${b}`);
const tiles = ([lo, hi]) => `${Math.round(lo * 2)} to ${Math.round(hi * 2)} tiles`;   // a half-width range as tiles of water across

// One line for each new layout, in MAP_VARIANTS_71's order.
export const LAYOUT_LINES = {
  delta: `the river splits into ${range(C.delta.arms)} arms (${C.delta.smallArms} on a Small map) that each widen to ${tiles(C.delta.mouth)} at the map's edge, with farmland between them and sandbars in the wider arms`,
  confluence: 'two rivers meet in a Y, and your city starts in the fork between them',
  twin: 'a second, smaller river crosses the map beside the main one, and never joins it',
  'wide-nile': `one river ${tiles(C['wide-nile'].hw)} wide all the way, too wide for any bridge: its far bank has farmland of its own`,
  cataract: 'the river squeezes through a rocky gorge, with stone on both banks, then spreads wide round a chain of small rocky islands',
  'lake-fed': 'the river flows out of a large lake on one edge of the map',
};

export const MAPS_HELP = [{
  head: 'Maps',
  text: `A new city's river comes from its seed, in one of ${MAP_VARIANTS.length} layouts. The river may run north to south or east to west. `
    + MAP_VARIANTS_71.map((v) => `${LAYOUT_NAMES[v]}: ${LAYOUT_LINES[v]}.`).join(' ')
    + ` On every map your start, the trade road and the raiders' way in share one stretch of land, with clay and farmland near the start.`
    + ` A bridge crosses at most ${MAP.bridgeMax} tiles of water in a straight line.`,
}];
