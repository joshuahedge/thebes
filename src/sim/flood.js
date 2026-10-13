// The Nile's yearly flood (Stage 4.6, River track, ruling 334). Track 0 wrote the floodplain mask and the stubs every other file calls;
// the River track owns this file and fills them in. No damage and no deaths: the flood is a rhythm, not a disaster.
//
// World state: world.flood (src/data/river.js newFloodState) and world.floodplain, one 0 or 1 per tile (floodplainOf). Draws are
// hash2(year, 0, (world.seed + RIVER_SALT.floodLevel) | 0) and the like (RIVER_SALT). Do not import world.js here: world.js imports
// this file for floodplainOf.
import { FLOOD } from '../data/river.js';
import { T } from './terrain.js';

// The floodplain (ruling 334): 1 for each fertile tile with water within FLOOD.reach tiles (in each direction, a square), else 0. Built
// from the terrain when a city is made and when an older city is migrated, and saved (world.floodplain); the terrain under it never
// changes in play.
export function floodplainOf(terrain, size) {
  const r = FLOOD.reach;
  const out = new Array(size * size).fill(0);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (terrain[y * size + x] !== T.FERTILE) continue;
      let wet = false;
      for (let dy = -r; dy <= r && !wet; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= size) continue;
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < size && terrain[ny * size + nx] === T.WATER) { wet = true; break; }
        }
      }
      if (wet) out[y * size + x] = 1;
    }
  }
  return out;
}

// STUB (River): one day of the flood (the season's start and end, the water's rise for the art).
export function floodDay(world, events = null) {}

// STUB (River): the month's flood work (this year's draw, the Nilometer's forecast, the captions' events).
export function floodMonth(world, events = null) {}

// STUB (River): the harvest multiplier for a farm this year (FLOOD_LEVELS[..].harvest on the floodplain, else 1). The River track
// wires it into production.js; until then nothing reads it.
export const floodHarvestFactor = (world, b) => 1;

// STUB (River, for the Court track's Flood omen card): pay for a forecast without a Nilometer. { ok, reason, level } (level: the
// forecast now known). Until the River track fills it in it refuses with 'not_yet'.
export const buyForecast = (world) => ({ ok: false, reason: 'not_yet', level: null });

// STUB (River): the alerts the flood raises (none expected: the flood speaks through captions, ruling 334).
export const floodAlerts = (world) => [];
