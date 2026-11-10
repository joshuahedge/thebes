// Version 9.3 (Track G, ruling 1914): the look of a tile and of a building, held per world for as long as nothing it depends on moves. The chunk signature asks for a look on every road
// and building tile of every shown chunk on every frame, so lookAt's work (a distance and a walk down the ranks) is done once a tile until the day turns, a rank is reached or a
// building is placed or lost (lookAt reads the day, the rank, the splits and the built-up area's centre, which moves only when the buildings do).
import { buildingsVersion } from '../sim/world.js';
import { lookAt, lookOfBuilding } from './looks.js';

const held = new WeakMap();   // world -> { day, milestone, version, t, c, k, tiles: Int8Array (-1 not yet worked out), buildings: Map id -> look }

function heldFor(world) {
  const version = buildingsVersion(world);
  let h = held.get(world);
  const sp = world.splits || {};
  if (!h || h.day !== world.day || h.milestone !== world.milestone || h.version !== version || h.t !== sp.town || h.c !== sp.city || h.k !== sp.capital || h.tiles.length !== world.size * world.size) {
    h = { day: world.day, milestone: world.milestone, version, t: sp.town, c: sp.city, k: sp.capital, tiles: new Int8Array(world.size * world.size).fill(-1), buildings: new Map() };
    held.set(world, h);
  }
  return h;
}

// The held looks as two readers over one lookup of the held state (a signature asks hundreds of times a call, so the state is found once): tile(x, y) is lookAt for the centre
// of the tile, building(b) is lookOfBuilding.
export function lookReader(world) {
  const h = heldFor(world), n = world.size;
  return {
    tile(x, y) {
      const i = y * n + x;
      let l = h.tiles[i];
      if (l < 0) { l = lookAt(world, x + 0.5, y + 0.5); h.tiles[i] = l; }
      return l;
    },
    building(b) {
      let l = h.buildings.get(b.id);
      if (l === undefined) { l = lookOfBuilding(world, b); h.buildings.set(b.id, l); }
      return l;
    },
  };
}
export const tileLook = (world, x, y) => lookReader(world).tile(x, y);
export const buildingLook = (world, b) => lookReader(world).building(b);
