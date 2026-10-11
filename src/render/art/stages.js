// Which drawing a building shows (early-game pass 2.2 and 2.3): granaries and bazaars by how full they are,
// grain farms by how far the crop has grown. Pure functions of the building (and, for farms, the game day);
// the renderer turns them into art slots through slotFor in registry.js.
import { BUILDINGS } from '../../data/buildings.js';

export const FARM_CYCLE_DAYS = 60;     // sprouting, green, golden: 20 game days each
export const FARM_ID_OFFSET = 17;      // days the cycle shifts per building id, so a district never grows in step

const stored = (b) => { let n = 0; for (const v of Object.values(b.store || {})) n += v; return n; };

// 0 empty, 1 under a third full, 2 under two thirds, 3 the rest.
export function granaryStage(b) {
  const n = stored(b), cap = BUILDINGS.granary.capacity;
  if (n <= 0) return 0;
  if (n * 3 < cap) return 1;
  if (n * 3 < cap * 2) return 2;
  return 3;
}

// 0 empty stalls, 1 under half full, 2 piled.
export function bazaarStage(b) {
  const n = stored(b);
  if (n <= 0) return 0;
  return n * 2 < BUILDINGS.bazaar.capacity ? 1 : 2;
}

// 0 fallow when the farm is not working (paused, unstaffed or blocked); otherwise 1 sprouting, 2 green,
// 3 golden, cycling over FARM_CYCLE_DAYS. The look only: production stays daily.
export function farmStage(world, b) {
  if (b.paused || !b.staff || b.blocked) return 0;
  const third = FARM_CYCLE_DAYS / 3;
  return 1 + Math.floor(((world.day + b.id * FARM_ID_OFFSET) % FARM_CYCLE_DAYS) / third);
}
