// Version 9.3 Track R (rulings 1962, 1963): the decree's end on day 2,160, commands refused after it, and the two month counts.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { tickDay, advanceDays } from '../../../src/sim/clock.js';
import { place, setSpeed, setPaused } from '../../../src/sim/commands.js';
import { countDynastyMonth } from '../../../src/sim/dynasty.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { packSave, unpackSave } from '../../../src/save/serialize.js';
import { DECREE } from '../../../src/data/decrees.js';

describe('v93 r the end', () => {
  it('ends on day 2,160 and not before, then does nothing and refuses every command', () => {
    const w = createWorld({ seed: 5, decree: { week: '2026-47', ids: ['low_nile'] } });
    w.speed = 2;
    advanceDays(w, DECREE.endDay - 1);
    expect([w.day, w.decree.ended]).toEqual([2159, false]);
    tickDay(w);
    expect([w.day, w.decree.ended, w.speed]).toEqual([2160, true, 0]);
    const gold = w.gold;
    tickDay(w); tickDay(w);
    expect([w.day, w.gold]).toEqual([2160, gold]);
    expect(place(w, 'well', 3, 3)).toEqual({ ok: false, reason: 'decree_ended' });
    expect(setSpeed(w, 2)).toEqual({ ok: false, reason: 'decree_ended' });
    expect(w.speed).toBe(0);
    expect(setPaused(w, 1, true)).toEqual({ ok: false, reason: 'decree_ended' });
  });
  it('never ends a main-game world', () => {
    const w = createWorld({ seed: 5 });
    advanceDays(w, DECREE.endDay + 30);
    expect(w.decree).toBe(undefined);
    expect(w.day).toBe(DECREE.endDay + 30);
  });
});

describe('v93 r the tallies', () => {
  const town = () => { const w = makeTestWorld(); w.milestone = 'town'; return w; };
  it('counts a month with no sick home and one with no fire, and misses a sick or burned one', () => {
    const w = town(); w.day = 300;
    countDynastyMonth(w);
    expect([w.tally.wellMonths, w.tally.fireSafeMonths]).toEqual([1, 1]);
    const h = addRaw(w, 'house', 3, 3, { tier: 2, residents: 4, illness: { start: 0, days: 9, left: 9, lost: 0, cap: 0 } });
    w.danger.burnDays.push(w.day - 5);
    countDynastyMonth(w);
    expect([w.tally.wellMonths, w.tally.fireSafeMonths]).toEqual([1, 1]);
    h.illness = null; w.danger.burnDays.length = 0; w.danger.burnDays.push(w.day - 40);
    countDynastyMonth(w);
    expect([w.tally.wellMonths, w.tally.fireSafeMonths]).toEqual([2, 2]);
  });
  it('opens a save without the two counts and reads them as 0', () => {
    const w = town();
    delete w.tally.wellMonths; delete w.tally.fireSafeMonths;
    const back = unpackSave(packSave(w)).world;
    expect(back.tally.wellMonths).toBe(undefined);
    back.milestone = 'town'; back.day = 300;
    countDynastyMonth(back);
    expect([back.tally.wellMonths, back.tally.fireSafeMonths]).toEqual([1, 1]);
    expect([createWorld({ seed: 1 }).tally.wellMonths, createWorld({ seed: 1 }).tally.fireSafeMonths]).toEqual([0, 0]);
  });
});
