import { MOOD } from '../data/mood.js';
import { housesOf, population } from './world.js';
import { touchesRoad } from './reach.js';
import { removeResidents, leaveCap, lotReady, stockLot, capacityOf } from './housing.js';
import { splitHouse } from './merge.js';
import { LARGE_PLOT } from '../data/largePlots.js';
import { isLot } from './largePlots.js';

export function vacancies(world) {
  const out = [];
  for (const h of housesOf(world)) {
    if (!touchesRoad(world, h)) continue;
    // Version 6.0 (Track C, ruling 702): an empty Large plot takes nobody as a Hut: people move in as a Manor once its needs are met (lotReady), else it waits.
    if (isLot(h) && !lotReady(world, h)) continue;
    const cap = capacityOf(h);
    const free = cap - h.residents;
    if (free > 0) out.push({ h, free });
  }
  return out;
}

export function monthlyArrivals(world) {
  if (world.mood < MOOD.arrivalsMin) return 0;
  return Math.round(((MOOD.arrivalBase + MOOD.arrivalPerPop * population(world)) * world.mood) / MOOD.arrivalMoodDivisor);
}

export function arrivalsBatch(world) {
  const total = monthlyArrivals(world);
  if (total <= 0) return 0;
  let n = Math.ceil(total / MOOD.arrivalBatchesPerMonth);
  let arrived = 0;
  for (const { h, free } of vacancies(world)) {
    if (n <= 0) break;
    const k = Math.min(n, free);
    const opens = isLot(h);
    if (h.tier === 0) h.tier = opens ? LARGE_PLOT.opensTier : 1;   // a lot opens as a Manor, any other empty plot as a Hut
    h.residents += k;
    if (opens) stockLot(world, h);
    n -= k;
    arrived += k;
  }
  return arrived;
}

export function departures(world) {
  if (world.mood >= MOOD.departuresBelow) return 0;
  let n = Math.ceil(population(world) * MOOD.departureShare);
  let left = 0;
  const houses = housesOf(world).filter((h) => h.residents > 0).sort((a, b) => a.tier - b.tier || a.id - b.id);
  for (const h of houses) {
    if (n <= 0) break;
    const allowed = Math.max(0, leaveCap(h) - h.leftThisMonth);
    const k = Math.min(n, allowed);
    if (k > 0) { removeResidents(h, k); n -= k; left += k; }
    if (h.residents === 0 && h.w > 1) splitHouse(world, h);   // an emptied 2x2 home becomes four empty plots
  }
  return left;
}
