// The River track's fix round 1 (ruling 369): the Nilometer names the flood it reads, the food forecast counts food, a lodge that has had its
// share says why it rests, and the small words follow the sim.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { FLOOD, FLOOD_LEVELS, HUNTING, WILDLIFE, floodLevelRow } from '../../../src/data/river.js';
import { CITIZEN_REMARKS, S46_RIVER_TEXT as R } from '../../../src/ui/text.js';
import { riverRows, riverSummary } from '../../../src/ui/s46/river.js';
import { floodLook, floodOutlook, seasonDays, nextFlood, levelOfYear } from '../../../src/sim/flood.js';
import { huntRest } from '../../../src/sim/wildlife.js';
import { produceDay } from '../../../src/sim/production.js';
import { select } from '../../../src/ui/modes.js';
import { riverWorld, addFarm, addGranary, addRaw, stepRiver, dayOf } from './riverHelpers.js';

const text = (nodes) => nodes.map((n) => n.textContent).join(' | ');
const pct = (id) => `${Math.round(floodLevelRow(id).harvest * 100)}%`;
const lvlName = (id) => `${id[0].toUpperCase()}${id.slice(1)}`;
const setFlood = (w, level, o = {}) => { const s = seasonDays(2); w.flood = { year: 2, level, forecast: level, from: s.from, to: s.to, applied: level, risen: true, ...o }; };
const herd = (w, o = {}) => {
  const h = { id: w.wildlife.nextId++, kind: 'gazelle', x: 32, y: 20, size: 6, max: 6, regrow: null, hx: 32, hy: 20, px: 32, py: 20, moved: 0, hunted: 0, dir: 1, ...o };
  w.wildlife.herds.push(h);
  return h;
};
function lodgeWorld() {
  const w = riverWorld();
  w.wildlife.seeded = true;
  const lodge = addRaw(w, 'hunting_lodge', 32, 11);
  lodge.staff = 3;
  addGranary(w, 28, 11);
  return { w, lodge };
}

// Version 8.1 (Track B, ruling 1222): a staffed Nilometer names the next flood all year (nextFlood), so the "known from month 4" wait is gone for it: outside the
// water's months its row is the next flood's; in them it names this flood (now, or the last) and adds the next as its own row.
describe('s46 river fix 1: the Nilometer names the flood it reads', () => {
  it('says "Next flood" with a level before the rise, then the flood now and the last flood with the next beside them, and the next year\'s after', () => {
    const w = riverWorld();
    const n = addRaw(w, 'nilometer', 19, 12);
    n.staff = 2;
    w.day = dayOf(2, 4);
    stepRiver(w, 2);
    const level = w.flood.level;
    const known = R.nilometerKnown(level);
    expect([floodLook(w).phase, text(riverRows(w, n)).includes(`${R.nilometerLabel}${known}`)]).toEqual(['forecast', true]);
    // The water rises (month 7), is high (8-9), drains (10): the row names this flood, and the next flood (next year's) has its own row.
    w.day = dayOf(2, 7);
    stepRiver(w, 1);
    expect(w.flood.risen).toBe(true);
    for (const [day, label] of [[dayOf(2, 7) + 1, R.nilometerLabelNow], [dayOf(2, 8) + 5, R.nilometerLabelNow], [dayOf(2, 10) + 3, R.nilometerLabelLast]]) {
      w.day = day;
      const t = text(riverRows(w, n));
      expect([day, floodLook(w).phase !== 'forecast', t.includes(`${label}${known}`), t.includes(`${R.nilometerLabel}${R.nilometerNext(nextFlood(w))}`), nextFlood(w).year]).toEqual([day, true, true, true, 3]);
    }
    // Months 11-12 of the same year: the next flood is next year's, named now (no wait for month 4).
    for (const month of [11, 12]) {
      w.day = dayOf(2, month) + 2;
      const t = text(riverRows(w, n));
      expect([month, t.includes(`${R.nilometerLabel}${R.nilometerNext(nextFlood(w))}`), nextFlood(w).level.id, t.includes('Known from month')]).toEqual([month, true, levelOfYear(w, 3), false]);
    }
  });
  it('says it for every level', () => {
    for (const l of FLOOD_LEVELS) {
      const w = riverWorld();
      const n = addRaw(w, 'nilometer', 19, 12);
      n.staff = 2;
      w.day = dayOf(2, 11);
      setFlood(w, l.id);
      const t = text(riverRows(w, n));
      expect([l.id, t.includes(`${R.nilometerLabel}${R.nilometerNext(nextFlood(w))}`), nextFlood(w).level.id]).toEqual([l.id, true, levelOfYear(w, 3)]);
    }
  });
});

describe('s46 river fix 1: the food forecast counts food only', () => {
  it('leaves a barley and a flax farm out of the floodplain food total', () => {
    const w = riverWorld();
    addFarm(w, 22, 11, 'farm_grain');
    w.day = dayOf(2, 8);
    setFlood(w, 'good');
    const grainOnly = floodOutlook(w);
    addFarm(w, 14, 11, 'farm_barley');
    addFarm(w, 17, 14, 'farm_flax');
    const o = floodOutlook(w);
    expect([o.farms, o.plain, o.now]).toEqual([grainOnly.farms, grainOnly.plain, grainOnly.now]);
    expect([o.farms, o.plain]).toEqual([1, 30]);
    expect(text(riverSummary(w))).toContain('1 floodplain farm makes about 33 food a month (30 without the flood)');
    addFarm(w, 23, 15, 'farm_fig');                                        // figs are food: they count
    expect(floodOutlook(w).farms).toBe(2);
  });
});

describe('s46 river fix 1: a lodge that has had its share says why it rests', () => {
  it('says the herds have given their share, in the River rows, and the sheet does not call the lodge "Not working"', async () => {
    const { w, lodge } = lodgeWorld();
    herd(w, { size: 8, max: 8 });
    expect(huntRest(w, lodge)).toBe(null);
    for (let i = 0; i < 12; i++) produceDay(w);
    expect([lodge.blocked, huntRest(w, lodge)]).toEqual(['no_game', 'herds']);
    expect(text(riverRows(w, lodge))).toContain(R.huntRest('herds'));
    expect(R.huntRest('herds')).toContain(`their ${HUNTING.perHerdMonth} this month`);
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), lodge.id));
      const status = r.root.querySelector('#sheet .work-status');
      expect(status === null || status.textContent !== 'Not working').toBe(true);
      expect(r.root.querySelector('#sheet').textContent).toContain(R.huntRest('herds'));
    } finally { r.cleanup(); }
  });
  it("says the lodge has taken the month's most, and says nothing once the month turns or when no herd is in reach", () => {
    const { w, lodge } = lodgeWorld();
    for (let i = 0; i < 5; i++) herd(w, { x: 24 + i * 2, y: 17, size: 8, max: 8 });
    lodge.hunted = HUNTING.maxMonth;
    expect(huntRest(w, lodge)).toBe('month');
    expect(text(riverRows(w, lodge))).toContain(`its ${HUNTING.maxMonth} this month`);
    lodge.hunted = 0;
    expect([huntRest(w, lodge), text(riverRows(w, lodge)).includes('hunting resumes')]).toEqual([null, false]);
    w.wildlife.herds = [];
    expect([huntRest(w, lodge), text(riverRows(w, lodge)).includes('hunting resumes'), text(riverRows(w, lodge)).includes(R.noHerds)]).toEqual([null, false, true]);
    herd(w, { hunted: HUNTING.perHerdMonth });
    lodge.staff = 0;
    expect(text(riverRows(w, lodge)).includes('hunting resumes')).toBe(false);          // an unstaffed lodge is not resting: it is short of workers
  });
});

describe('s46 river fix 1: the small words follow the sim', () => {
  it('words the crocodile scare from scareDays, and the farm row by which flood it is', () => {
    expect(R.crocNow).toContain(`${WILDLIFE.scareDays} day`);
    const w = riverWorld();
    const farm = addFarm(w, 22, 11);
    setFlood(w, 'good');
    w.day = dayOf(2, 8);
    expect(text(riverRows(w, farm))).toContain("This year's flood");
    w.day = dayOf(2, 12);
    expect(text(riverRows(w, farm))).toContain("This year's flood");                    // the rise was this year until the year turns
    const s = seasonDays(3);
    w.flood = { year: 3, level: 'low', forecast: null, from: s.from, to: s.to, applied: 'good', risen: false };
    w.day = dayOf(3, 3);
    const t = text(riverRows(w, farm));
    expect([t.includes('The last flood (Good)'), t.includes("This year's")]).toEqual([true, false]);
    expect(t).toContain(pct('good'));
  });
  it('hears the house remark about the fields under water only in a Fair or better year', () => {
    const r = CITIZEN_REMARKS.find((x) => x.type === 'house' && x.text.includes('under water'));
    expect(r.flood).toBe('fair');
  });
});
