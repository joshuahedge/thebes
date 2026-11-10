// Version 9.3 Track K, the weekly decree's balance (spec section 7, rulings 1985-1989): the six-year Capital (runCapital(72, { dangers: true })) played under
// each decree and each pair. Each run records the bonus measure, the total out of 600, the rank at the end of year 2 and the raids beaten and lost; the
// bars and medals in src/data/decrees.js were set from these runs (ruling 1986). Fourteen six-year runs (about a minute here), so this file is outside the default suite (tests/v93/k/all.js).
import { describe, it, expect } from '../../harness.js';
import { runCapital } from '../../stage4/balance/capitalRun.js';
import { DECREES, DECREE_ORDER, DECREE_PAIRS, PAIR_MEDALS } from '../../../src/data/decrees.js';
import { decreeMeasure, decreeScore, bonusPart } from '../../../src/sim/score.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { canPlace, place } from '../../../src/sim/commands.js';
import { costOf } from '../../../src/sim/costs.js';
import { nearestFit } from '../../../src/ui/placement.js';
import { answerCourt } from '../../v60/a/answer.js';
import { meetWarning, bandAims } from '../../stage47/pressure/lateRun.js';

const rankOf = (id) => MILESTONES.findIndex((m) => m.id === id);
const runs = new Map();
const RESERVE = 400, RANGES = 2;
// The Host's archers: at each raid warned after the first, an archery range (the decree's half price) by the building each band strikes first, two at
// most, while the treasury keeps RESERVE. Archers deal elephants double at range; towers and soldiers bring few down (measured: none of four).
function hostRanges(w, ranges) {
  const warn = w.raid.warning;
  if (!warn || warn.first || ranges.length >= RANGES) return;
  for (const { aim } of bandAims(w, warn)) {
    if (ranges.length >= RANGES || ranges.some((r) => Math.hypot(r.x - aim.x, r.y - aim.y) <= 8)) continue;
    if (w.gold - costOf(w, 'archery_range') < RESERVE) return;
    const g = nearestFit(w, { kind: 'building', type: 'archery_range' }, Math.round(aim.x), Math.round(aim.y), null, w.size);
    if (!g || !canPlace(w, 'archery_range', g.x, g.y).ok) continue;
    if (place(w, 'archery_range', g.x, g.y).ok) ranges.push({ x: g.x, y: g.y, day: w.day });
  }
}
// The answers a decree's measure needs, at each month end after the script's own (ruling 1986): the plain script answers no letter, builds no tower and
// raises no archer, so The Vizier's Levy and The Southern Host would measure 0. The Levy's run answers the court as the balance runs' steady player does
// (tests/v60/a/answer.js); the Host's meets each warned raid with the towers its sheet asks for (the late run's meetWarning) and two archery ranges
// (hostRanges). Every other decree plays the plain script.
const ANSWERS = {
  vizier_levy: () => (w) => answerCourt(w),
  southern_host: () => { const built = [], ranges = []; return (w) => { hostRanges(w, ranges); meetWarning(w, built); }; },
};
// One run per decree or pair, run the first time a test asks for it.
export function decreeRun(ids) {
  const key = ids.join('+');
  if (runs.has(key)) return runs.get(key);
  let year2 = null;
  const answers = ids.filter((id) => ANSWERS[id]).map((id) => ANSWERS[id]());
  const onMonth = (w, ev, m) => { if (m === 24) year2 = w.milestone; for (const a of answers) a(w); };
  const r = runCapital(72, { dangers: true, decree: { week: '2026-47', ids }, onMonth });
  const w = r.w, t = w.tally, score = decreeScore(w);
  const row = {
    key, ids, year2, day: w.day, insane: r.insane, answered: answers.length,
    measures: ids.map((id) => decreeMeasure(w, id)),
    bonus: bonusPart(w), total: score.total, medal: score.medal, parts: score.parts,
    raids: t.raids || 0, beaten: t.raidsBeaten || 0, lost: t.raidsLost || 0, tributes: t.tributes || 0, elephants: t.elephantsMet || 0,
    seconds: Math.round(r.elapsed / 1000),
  };
  runs.set(key, row);
  return row;
}

const RAIDED = ['sea_peoples', 'open_city', 'southern_host'];
const medalsOf = (ids) => (ids.length === 1 ? DECREES[ids[0]].medals : PAIR_MEDALS[DECREE_PAIRS.findIndex((p) => p.join('+') === ids.join('+'))]);

describe('v93 k balance', () => {
  for (const ids of [...DECREE_ORDER.map((id) => [id]), ...DECREE_PAIRS]) {
    const key = ids.join('+');
    it(`${key}: reaches Town by year 2, sound, and the scripted run earns bronze (not silver)${ids.length === 1 ? ', its bonus part 70-90 (the bar 1.25 x its measure)' : ''}`, () => {
      const r = decreeRun(ids);
      expect(r.insane).toEqual([]);
      expect(rankOf(r.year2) >= rankOf('town')).toBe(true);
      if (ids.length === 1) expect(r.bonus >= 70 && r.bonus <= 90).toBe(true);
      const medals = medalsOf(ids);
      expect(medals[1] - medals[0]).toBe(60);
      expect(medals[2] - medals[0]).toBe(120);
      expect(r.medal).toBe('bronze');
    });
    if (ids.some((id) => RAIDED.includes(id))) {
      it(`${key}: loses no more than half its raids`, () => {
        const r = decreeRun(ids);
        expect(r.raids > 0).toBe(true);
        expect(r.lost * 2 <= r.raids).toBe(true);
      });
    }
  }
  it('the hardest week (The Southern Host and Open city) still gives the scripted run a bronze', () => {
    const r = decreeRun(['southern_host', 'open_city']);
    expect(r.total >= PAIR_MEDALS[3][0]).toBe(true);
  });
});
