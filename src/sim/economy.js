import { ECONOMY } from '../data/economy.js';
import { TIERS } from '../data/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from './world.js';

export function monthlyEconomy(world) {
  let taxes = 0;
  for (const h of housesOf(world)) if (h.tier >= 1) taxes += h.residents * TIERS[h.tier].tax;
  let wages = 0;
  let upkeep = 0;
  for (const b of allBuildings(world)) {
    if (b.paused) continue;
    upkeep += BUILDINGS[b.type].upkeep;
    wages += b.staff * ECONOMY.wagePerWorker;
  }
  const net = taxes - wages - upkeep;
  world.gold += net;
  world.stats.lastMonth = { taxes, wages, upkeep, net };
  if (net > 0) world.tally.profitMonths += 1;
}
