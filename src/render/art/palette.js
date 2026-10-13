// Every colour the art and terrain use, copied from the approved mock-ups. Face palettes are
// [top, lit left face, shaded right face].
export const WASH = ['#FAF5EC', '#EFE6D9', '#C9BCCD'];
export const WASH2 = ['#F6EFE3', '#E9DED0', '#C1B3C6'];
export const MUD = ['#DCB57E', '#CB9F66', '#A08274'];
export const MUD2 = ['#E0BC88', '#CFA670', '#A68A78'];
export const STONE = ['#F4EDDF', '#E7DDCC', '#C3B8C6'];
export const SST = ['#ECD9AC', '#D9C495', '#B0A09E'];
export const ROCK = ['#D3B582', '#B99565', '#8E7470'];
export const GOLDC = ['#F6D46A', '#E2B13C', '#B98A4A'];
export const LIME = ['#F6EFDF', '#EBE1CE', '#CBBFCB'];
export const THATCH = ['#E9CB82', '#D8B366', '#AC9070'];

export const TEAL = '#2E8C83';
export const TEAL_DARK = '#22685F';
export const BLUE = '#2F6FA8';
export const RED = '#C4473A';
export const RED_DARK = '#9A3A30';
export const GOLD = '#E2B13C';
export const PINK = '#D9667A';
export const ORANGE = '#E07B39';
export const GREEN = '#5E9E4A';
export const GREEN_DARK = '#3E7A36';
export const PURP = '#7A5AA0';
export const WOOD = '#6B4A3A';
export const LEAF = '#4F8A2E';
export const LEAF2 = '#6AA83A';
export const LEAF3 = '#3F7526';
export const INDUSTRY_TINT = '#8E7470';   // the industry category's tint (CATEGORY_TINT.industry in data/ui.js), for its pennants

export const OUTLINE = '#5A4A6A';   // 32% opacity, 0.6 px, where a face meets another
export const SHADOW = '#3E3260';    // ground shadows, two layers at 12% and 8%
export const INK = '#3A2E5A';       // the dark line where a wall meets the ground
export const WINDOW = '#4A3C4E';
export const DOOR = '#3E3040';
export const PARAPET = '#ECE2D2';
export const POT = '#C9552F';
export const POT_LIGHT = '#F6B48A';
export const TRUNK = '#9A7448';
export const TRUNK_RING = '#6E5236';

// Terrain (early-game pass 2.1): calm sand whose blotches stay within about 3% lightness of it; fertile land as
// dark river loam with speckles and tufts; a saturated meadow; turquoise shallows along the river bank; and a
// darker, quieter sand past the map edge, with a soft umber band along the edge itself.
export const TERRAIN = {
  sand: '#EBD6A8', offMap: '#C8AE7C', sandOff: '#C8AE7C', edgeFade: '#A08458',   // sandOff is kept as an alias of offMap
  blotches: ['#E7D1A2', '#EFDBB0', '#E9D3A4', '#EEDAAE', '#E5CF9E'],
  dotLight: '#F8ECCF', dotDark: '#D4B987',
  grass: '#86B04A', grassAlt: '#86AE45', grassSoft: '#B3C272', grassSecond: '#74A03E',
  fertile: '#A8885C', fertileSecond: '#C2A274', fertileSoft: '#BC9C6E', fertileSpeck: '#6E5234', fertileTuft: '#5E8E32',
  bank: '#B9A978', bankSecond: '#C9B98A', mud: '#7A5E40', mudDark: '#5E4630',
  clay: '#B9825A', claySoft: '#CB9C74', claySecond: '#A36E48', clayCrack: '#7E5236',   // Stage 4.5: terracotta ground along the banks
  rocky: '#D3B582', rockySecond: '#C4A574', rockySoft: '#E0C898', pebble: '#B39C82', pebbleLight: '#D9C7A8',
  water: '#2E8C96', waterDeep: '#1E6A7C', waterLight: '#86CBC4', shallows: '#4DB6AE', foam: '#DDF4F1', ripple: '#B8E6E2',
  road: '#DCC08C', roadEdge: '#C2A274', roadPebble: '#B39466', roadPebbleLight: '#F2E2BC',
  plot: '#E3CFA0', field: '#7FAA45', fieldEdge: '#6A5A40', grid: '#3E3260',
};

export const UI = {
  ok: '#2F6FA8', warn: '#E0A030', bad: '#E2604C', label: '#3B2A14', halo: '#FFFFFF',
  water: '#2F6FA8', food: '#E2B13C', religion: '#7A5AA0', housing: '#2E8C83',
  problem: '#A33624',   // the map's problem badge (early-game pass 2.8): white "!" on it reads at 6.8:1
  // Stage 2 overlays (spec 6.3): goods in kiln orange, entertainment in a deep rose, desirability as one indigo graded light
  // to dark; and the placement preview's wash where homes would get nicer (spec 4.7).
  goods: '#B5562A', entertainment: '#A8436B', desirability: '#3D3A8C', nicer: '#2E8C83',
};
