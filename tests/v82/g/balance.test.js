// Version 8.2 Track G: the Great oasis is winnable. No balance run before 8.2 plays any map but its own fixed one, so ./layoutRun.js is a scripted city for any
// layout (the same streets from the map's own start, then the city's own advice), played on Great oasis maps and on river (classic) maps of the same seeds.
// The player is plain (it does not manage its treasury, so its cities later shrink on both kinds of map); what it measures is the comparison: the highest rank
// each city reaches in 8 years, and when. A Great oasis city reaches at least the rank of the weakest river city, less one.
import { describe, it, expect } from '../../harness.js';
import { runLayout } from './layoutRun.js';
import { MILESTONES } from '../../../src/data/progression.js';

const SEEDS = [3, 11, 27];
const rank = (id) => MILESTONES.findIndex((m) => m.id === id);
const peak = (r) => Math.max(0, ...Object.keys(r.first).map(rank));
let cache = null;
export function layoutRuns() {
  if (cache) return cache;
  cache = {};
  for (const layout of ['classic', 'great-oasis']) cache[layout] = SEEDS.map((seed) => ({ seed, ...runLayout({ seed, layout }) }));
  return cache;
}
const line = (r) => `#${r.seed} ${MILESTONES[peak(r)].id} (town m${r.first.town || '-'}, market m${r.first.market_town || '-'}, city m${r.first.city || '-'}) people ${r.people.join('/')}`;

describe('v82 g balance: the Great oasis is winnable', () => {
  it('a Great oasis city reaches the rank a river city of the same seeds does (the weakest, less one) within 8 years', () => {
    const runs = layoutRuns();
    const report = Object.entries(runs).map(([layout, rs]) => `${layout}: ${rs.map(line).join(' | ')}`);
    const weakest = Math.min(...runs.classic.map(peak));
    expect([report, runs['great-oasis'].every((r) => peak(r) >= weakest - 1)]).toEqual([report, true]);
  });
});
