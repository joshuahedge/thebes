import { ECONOMY, FORECAST } from '../data/economy.js';
import { TIERS } from '../data/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from './world.js';
import { soldiersPayOf } from './costs.js';
import { lacksRoad } from './reach.js';

// The month's figures as the city stands now: taxes from the homes' residents, wages for the staff in post, the buildings'
// upkeep and the soldiers' pay. monthlyEconomy pays exactly these at the month's end, and monthForecast shows them ahead.
export function monthFigures(world) {
  let taxes = 0;
  for (const h of housesOf(world)) if (h.tier >= 1) taxes += h.residents * TIERS[h.tier].tax;
  let wages = 0;
  let upkeep = 0;
  for (const b of allBuildings(world)) {
    if (b.paused || lacksRoad(world, b)) continue;     // ruling P11: a building no road touches does nothing and costs nothing
    upkeep += BUILDINGS[b.type].upkeep;
    wages += b.staff * ECONOMY.wagePerWorker;
  }
  const soldiers = soldiersPayOf(world);               // spec 4.11: every soldier, in peace too, a paused barracks' as well
  return { taxes, wages, upkeep, soldiers, net: taxes - wages - upkeep - soldiers };
}

export function monthlyEconomy(world) {
  const { taxes, wages, upkeep, soldiers, net } = monthFigures(world);
  world.gold += net;
  world.stats.lastMonth = { taxes, wages, upkeep, soldiers, net, monuments: 0 };   // Stage 4: monumentMonth fills monuments (it is not in net: it was paid daily)
  if (net > 0) world.tally.profitMonths += 1;
}

// Stage 4.5 (Task 4b, ruling 316): the forecast, pure from the state. { taxes, wages, upkeep, soldiers, net } are this month's
// figures as the city stands (monthFigures); monthsLeft is how many months the treasury lasts at that balance (null when it is
// not shrinking; 0 once it is below 0); runsOut (amber on the top bar) is true when it would be gone within
// FORECAST.amberMonths, and goesBelow (the warning tip) when it would be below 0 within FORECAST.warnMonths. A balance that is
// negative while the treasury is deep is neither: the best opening runs -60 to -113 for months with 1,300 in the bank.
export function monthForecast(world) {
  const f = monthFigures(world);
  const monthsLeft = f.net >= 0 ? null : world.gold <= 0 ? 0 : world.gold / -f.net;
  const within = (months) => f.net < 0 && world.gold + f.net * months < 0;
  const active = f.taxes + f.wages + f.upkeep + f.soldiers > 0;   // an empty city has nothing to forecast
  return { ...f, gold: world.gold, monthsLeft, active, runsOut: within(FORECAST.amberMonths), goesBelow: within(FORECAST.warnMonths) };
}

// What one building costs a month when it is fully staffed: its upkeep plus ECONOMY.wagePerWorker for each of its workers
// (the card's "Upkeep 46 a month · 10 workers" for a farm).
export function monthlyBill(type) {
  const def = BUILDINGS[type];
  return { upkeep: def.upkeep, workers: def.workers, wages: def.workers * ECONOMY.wagePerWorker, bill: def.upkeep + def.workers * ECONOMY.wagePerWorker };
}

// The month's balance if a building of this type were added now: this month's net less its upkeep and the wages of the workers
// the city could give it. Labour fills jobs from the workforce, so the wages grow by the jobs the workforce can still fill.
export function balanceWith(world, type) {
  const f = monthFigures(world);
  const def = BUILDINGS[type], L = world.labour;
  const filled = (jobs) => Math.min(L.workforce, jobs);
  const more = filled(L.jobs + def.workers) - filled(L.jobs);
  return f.net - def.upkeep - more * ECONOMY.wagePerWorker;
}

// The building costing the most a month now (upkeep plus the wages of its staff): { id, type, cost }, the lowest id on a tie,
// or null when none costs anything. Paused buildings and those no road touches cost nothing (monthFigures).
export function biggestCost(world) {
  let best = null;
  for (const b of allBuildings(world)) {
    if (b.paused || lacksRoad(world, b)) continue;
    const cost = BUILDINGS[b.type].upkeep + b.staff * ECONOMY.wagePerWorker;
    if (cost > 0 && (!best || cost > best.cost)) best = { id: b.id, type: b.type, cost };
  }
  return best;
}
