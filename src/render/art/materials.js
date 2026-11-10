// Version 9.3 (spec section 2, ruling 1888): the materials of the four looks, one table keyed by look (0 village, 1 town, 2 city, 3 capital).
// The look sets the materials, the tier sets the shape. Every colour is taken from palette.js (no new hex); face palettes are the palette's own
// [top, lit, shade] triples, so a wall drops straight into box() and tb(). Tracks read MATERIALS[lookOfBuilding(world, b)] and draw through the
// primitives; none of them picks a raw colour for a wall or a roof.
//   wall    [top, lit, shade]   the main walls
//   roof    [top, lit, shade]   roofs and roof terraces (thatch, reed, sandstone, dressed stone)
//   trim    a colour            door frames, lintels, posts
//   band    a colour            the painted band on a wall, and the awning's stripe
//   cornice [top, lit, shade]   the projecting top course (a Village has none: it is its roof edge)
//   ground  [packed, edge]      the trodden yard and the swept edge round it (spec section 5)
//   paving  a colour            a paved court or road surface
import {
  MUD, WASH, WASH2, SST, LIME, STONE, THATCH, TEAL, TEAL_DARK, BLUE, RED, GOLD, WOOD, TRUNK, TERRAIN,
} from './palette.js';

export const MATERIALS = [
  // Village: mud brick, reed and thatch; dirt tracks. Today's art, unchanged in kind.
  { wall: MUD, roof: THATCH, trim: WOOD, band: TRUNK, cornice: THATCH, ground: [TERRAIN.roadEdge, TERRAIN.road], paving: TERRAIN.road },
  // Town: whitewash over mud, painted door frames, reed awnings; gravel with a firm edge.
  { wall: WASH, roof: THATCH, trim: TEAL, band: TEAL, cornice: WASH2, ground: [TERRAIN.pebbleLight, TERRAIN.pebble], paving: TERRAIN.roadPebbleLight },
  // City: whitewash with painted bands (ochre and blue), sandstone terraces, timber balconies; stone kerbs and part-paved courts.
  { wall: WASH, roof: SST, trim: BLUE, band: GOLD, cornice: STONE, ground: [TERRAIN.plot, STONE[1]], paving: STONE[1] },
  // Capital: dressed limestone, coloured cornices, gilded caps; paved avenues.
  { wall: SST, roof: LIME, trim: TEAL_DARK, band: RED, cornice: [TEAL, TEAL, TEAL_DARK], ground: [STONE[1], STONE[2]], paving: STONE[0] },
];
// The second painted band of a City or a Capital (the first is `band`), so two stripes are never the same colour.
export const BAND2 = [TRUNK, TEAL_DARK, BLUE, GOLD];
