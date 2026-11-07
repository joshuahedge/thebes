// Version 8.4, wave 2 (design section 7, rulings 1520-1529): the spending player. The existing balance runs keep today's habits (Normal taxes, no Rush);
// this player uses gold's new jobs, as the design's two spending variants ask, each month end after the run's own play (the runs' onMonth hook):
//   - taxes: the palace sheet's Low once the treasury holds 12 months of Normal-rate taxes, back to Normal below 6 months. A city with no palace lays one
//     (300 gold, the courtyard) the first month it wants Low, on the open spot with a road farthest from any home, so its desirability moves no home;
//   - Rush: the site under way with the most crews at work is rushed (the site sheet's Rush this course) while the treasury stays above 6 months of
//     Normal-rate taxes plus 30 days of the rush (the quote's dayGold), and cancelled below it. A rush ends with its course; the next month end rushes again;
//   - luxuries: bought wherever a Villa or Estate wants one. The capital and late runs have none (their grand homes stop at Manor); the grand district
//     run's luxury habit (tests/v50/grand/grandRun.js actTrade) already buys them.
// The record: each month's Normal-rate taxes, the taxes given up, the Rush premium and the luxuries (stats.lastMonth), what the player did, and the palace.
import { place, canPlace } from '../../../src/sim/commands.js';
import { allBuildings, housesOf, isSite } from '../../../src/sim/world.js';
import { palaceOf, setTaxRate, taxRateOf } from '../../../src/sim/palace.js';
import { rushQuote, setRush } from '../../../src/sim/monuments.js';
import { costOf } from '../../../src/sim/costs.js';
import { PALACE } from '../../../src/data/palace.js';

export const SPEND = { lowAt: 12, normalBelow: 6, rushAbove: 6, rushDays: 30 };   // months of Normal-rate taxes; days of the rush

// The open palace spot touching a road that lies farthest from any home (ties: the first found, scanning rows from the north), or null.
export function palaceSpot(w) {
  const homes = housesOf(w).map((h) => ({ x: h.x + h.w / 2, y: h.y + h.d / 2 }));
  let best = null;
  for (let y = 0; y < w.size; y++) for (let x = 0; x < w.size; x++) {
    if (!canPlace(w, PALACE.type, x, y).ok) continue;
    const far = homes.reduce((n, h) => Math.min(n, Math.hypot(h.x - x - 1.5, h.y - y - 1.5)), Infinity);
    if (!best || far > best.far) best = { x, y, far };
  }
  return best;
}

// The site under way with the most crews at work today (ties: the lower id), or null.
function busiestSite(w) {
  let best = null;
  for (const b of allBuildings(w)) {
    if (!isSite(b) || b.site.done !== null || !b.site.crews.length) continue;
    if (!best || b.site.crews.length > best.site.crews.length) best = b;
  }
  return best;
}

export function spender({ rush = true, taxes = true } = {}) {
  const rec = { months: [], palace: null, low: 0, normal: 0, rushes: 0, cancels: 0 };
  const onMonth = (w) => {
    const m = w.stats.lastMonth;
    rec.months.push({ day: w.day, gold: Math.round(w.gold), taxesNormal: m.taxesNormal, taxes: m.taxes, givenUp: m.taxesNormal - m.taxes, rush: m.rush || 0, luxuries: m.luxuries || 0,
      wages: m.wages, upkeep: m.upkeep, soldiers: m.soldiers, monuments: m.monuments || 0, net: m.net, rate: taxRateOf(w) });
    const month = m.taxesNormal;
    if (taxes) {
      const rate = taxRateOf(w);
      if (rate !== 'low' && w.gold >= SPEND.lowAt * month) {
        let p = palaceOf(w);
        if (!p && w.gold - costOf(w, PALACE.type) >= SPEND.lowAt * month) {
          const s = palaceSpot(w);
          const r = s ? place(w, PALACE.type, s.x, s.y) : null;
          if (r && r.ok) { p = w.buildings[r.id]; rec.palace = { day: w.day, x: s.x, y: s.y }; }
        }
        if (p && setTaxRate(w, p.id, 'low').ok) rec.low++;
      } else if (rate === 'low' && w.gold < SPEND.normalBelow * month) {
        if (setTaxRate(w, palaceOf(w).id, 'normal').ok) rec.normal++;
      }
    }
    if (rush) {
      const rushed = allBuildings(w).find((b) => isSite(b) && b.site.rush);
      if (rushed) {
        const q = rushQuote(w, rushed.id);
        if (w.gold < SPEND.rushAbove * month + SPEND.rushDays * q.dayGold && setRush(w, rushed.id, false).ok) rec.cancels++;
      } else {
        const b = busiestSite(w);
        const q = b ? rushQuote(w, b.id) : null;
        if (q && q.ok && w.gold >= SPEND.rushAbove * month + SPEND.rushDays * q.dayGold && setRush(w, b.id, true).ok) rec.rushes++;
      }
    }
  };
  return { onMonth, rec };
}

// Over the last `n` months of a record: the Normal-rate taxes, the share of them spent on the new jobs (taxes given up, the Rush premium and luxuries) and
// the share spent in all (wages, upkeep, soldiers' pay and monument work, the premium among them, plus the taxes given up and the luxuries).
export function spendShares(months, n = 24) {
  const last = months.slice(-n);
  const sum = (f) => last.reduce((t, m) => t + f(m), 0);
  const normal = sum((m) => m.taxesNormal);
  const newJobs = sum((m) => m.givenUp + m.rush + m.luxuries);
  const all = sum((m) => m.wages + m.upkeep + m.soldiers + m.monuments + m.givenUp + m.luxuries);
  return { normal, newJobs: newJobs / normal, all: all / normal };
}
