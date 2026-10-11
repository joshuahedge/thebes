import { ECONOMY } from '../data/economy.js';
import { TIERS } from '../data/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from './world.js';
import { soldiersPayOf } from './costs.js';

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
  const soldiers = soldiersPayOf(world);               // spec 4.11: every soldier, in peace too, a paused barracks' as well
  const net = taxes - wages - upkeep - soldiers;
  world.gold += net;
  world.stats.lastMonth = { taxes, wages, upkeep, soldiers, net };
  if (net > 0) world.tally.profitMonths += 1;
}
