// CLAY (Stage 4.5, ruling 312): dry, buildable ground along the banks where a clay pit must stand; not fertile.
// HILLS (Stage 4.7, ruling 464): rocky hills nothing crosses and nothing is built on. Old maps have none (world version 8).
export const T = { DESERT: 0, FERTILE: 1, ROCKY: 2, WATER: 3, BANK: 4, MEADOW: 5, CLAY: 6, HILLS: 7 };

export const TERRAIN_BY_NAME = { fertile: T.FERTILE, rocky: T.ROCKY, clay: T.CLAY };

// Stage 4.7 (Task 0 contract): the one ground rule for building and the one for walking. Both look at the ground only (the terrain,
// and for passable a bridge's road); whether a building, wall or road already stands there is each caller's own check.
//
// buildable: the tile's ground is open land a building, road, wall or plot may take: neither water nor hills. It is also the test for
// "dry land a figure may stand on off the road net" where a bridge must not count (a boat's landing, a herd animal's footing).
export const buildable = (world, i) => {
  const t = world.terrain[i];
  return t !== T.WATER && t !== T.HILLS;
};

// passable: a walker, raider, chariot, herd, hunter, newcomer or cart may cross the tile: open land, or a bridge (a road on water,
// ruling 314). Hills are never passable, and no road can be laid on them (buildable), so a road tile is always passable.
export const passable = (world, i) => buildable(world, i) || (world.terrain[i] === T.WATER && Boolean(world.road[i]));

// Why a tile's ground refuses a building, wall or road, else null: 'water' or 'hills' (the refusal codes, src/ui/text.js REASONS).
export const groundRefusal = (world, i) => (buildable(world, i) ? null : world.terrain[i] === T.HILLS ? 'hills' : 'water');
