// The month's goods record for the city summary (spec 4.10: "each good as made against used last month"). Made is the
// month's rise in tally.made, against the totals kept at the last month end (stats.lastMonth.madeTotal). Used is what
// left homes' stock and the bazaars' stalls during the monthly housing check (homes eat and use their goods; a delivery
// only moves goods from a stall to a home), and, for a raw good, what the workshops took to make theirs, one for one.
// Trade income is the month's rise in tally.tradeIncome. runMonth (clock.js) stores it all in stats.lastMonth.
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS, HOUSEHOLD_GOODS } from '../data/goods.js';
import { allBuildings } from './world.js';

const HOME_GOODS = [...FOOD_GOODS, ...HOUSEHOLD_GOODS];

// What the record starts the month from: the made totals at the last month end, and trade income so far.
export function goodsMonthStart(world) {
  const last = world.stats.lastMonth;
  return { made: (last && last.madeTotal) || {}, tradeIncome: world.tally.tradeIncome || 0 };
}

// Food and household goods in homes' stock and on bazaar stalls, by good.
export function homeGoodsHeld(world) {
  const out = {};
  for (const g of HOME_GOODS) out[g] = 0;
  for (const b of allBuildings(world)) {
    const held = b.type === 'house' ? b.stock : BUILDINGS[b.type].sells ? b.store : null;
    if (held) for (const g of HOME_GOODS) out[g] += held[g] || 0;
  }
  return out;
}

// Writes made, used, madeTotal and tradeIncome into stats.lastMonth (set by monthlyEconomy earlier in the month's run).
export function recordGoodsMonth(world, start, heldBefore, heldAfter) {
  const totals = world.tally.made || {};
  const made = {};
  for (const [g, n] of Object.entries(totals)) if (n - (start.made[g] || 0) > 0) made[g] = n - (start.made[g] || 0);
  const used = {};
  for (const g of HOME_GOODS) if (heldBefore[g] - heldAfter[g] > 0) used[g] = heldBefore[g] - heldAfter[g];
  for (const def of Object.values(BUILDINGS)) {
    if (def.consumes && def.produces && made[def.produces.good]) used[def.consumes] = (used[def.consumes] || 0) + made[def.produces.good];
  }
  const record = world.stats.lastMonth || {};
  Object.assign(record, { made, used, madeTotal: { ...totals }, tradeIncome: (world.tally.tradeIncome || 0) - start.tradeIncome });
  world.stats.lastMonth = record;
}
