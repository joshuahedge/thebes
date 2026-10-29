// Version 8.4 Track R, old saves (design section 5): an 8.3 (version 10) city has no raid.spoils and its scheduled warning keeps its day; the pay is whole, the scouts are read from the
// state it already has, and a saved city with weapons, a Victory row or scouts up reloads as it was.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildSampleCity } from '../../../src/dev/sampleCity.js';
import { advanceDays, tickDay } from '../../../src/sim/clock.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { raidMood, raidDay } from '../../../src/sim/raids.js';
import { soldiersPayOf } from '../../../src/sim/costs.js';
import { soldiersPayFull, spoilsSaving } from '../../../src/sim/spoils.js';
import { scoutsAt } from '../../../src/sim/scouts.js';
import { SCOUTS } from '../../../src/data/raids.js';
import { STAGE84_TALLY } from '../../../src/sim/world.js';

// The seed-11 sample Capital after 90 days, as a version 10 save text (none of the version 11 fields), with `edit` applied to its plain object first.
function v10Text(edit = () => {}) {
  const w = createWorld({ seed: 11 });
  buildSampleCity(w);
  advanceDays(w, 90);
  const o = JSON.parse(serialize(w));
  delete o.luxuryFrom;
  for (const k of STAGE84_TALLY) delete o.tally[k];
  o.version = 10;
  edit(o);
  return { w, text: JSON.stringify(o) };
}

describe('v84 r old saves', () => {
  it('loads an 8.3 city with no spoils: whole pay, nothing to say, and a spoils-free raid state', () => {
    const { text } = v10Text((o) => { o.soldiers = [{ id: 900, kind: 'soldier', barracks: 1, x: 3, y: 3, hp: 12, hit: false, task: 'wait' }]; });
    const w = deserialize(text);
    expect([w.raid.spoils, soldiersPayOf(w), soldiersPayFull(w), spoilsSaving(w)]).toEqual([undefined, 8, 8, null]);
    expect(w.tally.spoilsGold).toBe(0);
  });
  it('keeps a scheduled warning on its day, with the scouts read from it: they stand for the 30 days before it and never move it', () => {
    const { text } = v10Text((o) => { o.raid.clockDay = 10; o.raid.nextWarnDay = o.day + 100; o.raid.index = 0; });
    const w = deserialize(text);
    const due = w.raid.nextWarnDay;
    expect(due).toBe(deserialize(text).raid.nextWarnDay);
    expect(scoutsAt(w)).toBe(null);
    w.day = due - SCOUTS.days;
    expect(scoutsAt(w).days).toBe(SCOUTS.days);
    const events = [];
    w.day = due - 1;
    raidDay(w, events);
    expect(w.raid.warning).toBe(null);
    w.day = due;
    raidDay(w, events);
    expect([w.raid.warning && w.raid.warning.day, w.raid.nextWarnDay]).toEqual([due, due]);
  });
  it('shows a beaten raid of the 8.3 city as Victory for its first 90 days, and nothing after (it was -3 for 180)', () => {
    const { text } = v10Text((o) => { o.raid.last = { index: 0, dir: 'east', size: 3, won: true, byTowers: 3, bySoldiers: 0, towers: 1, burned: 0, stolen: 0, day: o.day - 20, burnedKinds: [], fires: [] }; });
    const w = deserialize(text);
    expect(raidMood(w)).toEqual({ victory: 4 });
    w.day += 80;
    expect(raidMood(w)).toEqual({});
  });
  it('reloads a city with captured weapons as it was, the discount and its days left included', () => {
    const w = createWorld({ seed: 11 });
    buildSampleCity(w);
    advanceDays(w, 40);
    w.soldiers = [{ id: 901, kind: 'soldier', barracks: 1, x: 3, y: 3, hp: 12, hit: false, task: 'wait' }, { id: 902, kind: 'archer', barracks: 1, x: 3, y: 3, hp: 8, hit: false, task: 'wait' }];
    w.raid.spoils = { until: w.day + 200 };
    const back = deserialize(serialize(w));
    expect(back.raid.spoils).toEqual({ until: w.day + 200 });
    expect([soldiersPayOf(back), soldiersPayOf(w), spoilsSaving(back)]).toEqual([11, 11, { less: 3, daysLeft: 200 }]);
    for (let k = 0; k < 30; k++) { tickDay(w); tickDay(back); }
    expect(back).toEqual(w);
  });
});
