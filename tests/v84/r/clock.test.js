// Version 8.4 Track R (rulings 1485, 1486): the raid clock's rules, each tested at 8.4's numbers (set by the test, through at84, and put back) and at today's.
import { describe, it, expect } from '../../harness.js';
import { RAIDS, RAID_SALT } from '../../../src/data/raids.js';
import { SEASONS } from '../../../src/data/tips.js';
import { laterWarnDay, leanWait, raidDay, payTribute } from '../../../src/sim/raids.js';
import { hash2 } from '../../../src/sim/rng.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { footMix } from '../../../src/data/armies.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { at84, NUMBERS_84, raidCity, arriveNow, runRaid, EAST } from './helpers.js';

const YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const inShemu = (day) => SEASONS[Math.floor((day % YEAR) / DAYS_PER_MONTH)] === 'shemu';
// The warning day laterWarnDay would give with no lean: the draw alone.
const drawn = (w, from) => from + RAIDS.laterMin + Math.floor(hash2(w.seed, w.raid.index, RAID_SALT.gap) * (RAIDS.laterMax - RAIDS.laterMin + 1));
const withSeed = (seed, index) => { const w = makeTestWorld(); w.seed = seed; w.raid.index = index; return w; };

describe('v84 r the clock: the first warning and the later gap', () => {
  it('keeps today\'s numbers in data (wave 2 sets 300, 360-600 and 60) and the lean off', () => {
    expect([RAIDS.firstWarnAfter, RAIDS.laterMin, RAIDS.laterMax, RAIDS.leanDays]).toEqual([720, 720, 1440, 0]);
  });
  it('comes exactly firstWarnAfter days after the clock starts, and the first raid never leans', () => {
    for (const numbers of [NUMBERS_84, {}]) {
      at84(() => {
        // The clock starts on day 700: at 8.4's 300 the raid arrives on day 1090, year-day 10, inside the lean's 60 days before Shemu (a later raid would wait for it).
        const w = raidCity();
        w.tally.peakPeople = RAIDS.clockPeople;
        w.day = 700;
        raidDay(w, []);
        expect([w.raid.clockDay, w.raid.nextWarnDay]).toEqual([700, 700 + RAIDS.firstWarnAfter]);
        const events = [];
        for (let k = 0; k < RAIDS.firstWarnAfter + 5 && !w.raid.warning; k++) { w.day += 1; raidDay(w, events); }
        const warn = events.find((e) => e.type === 'raid_warning');
        expect([warn.first, w.raid.warning.day, w.raid.warning.arrives]).toEqual([true, 700 + RAIDS.firstWarnAfter, 700 + RAIDS.firstWarnAfter + RAIDS.warningDays]);
        if (RAIDS.leanDays > 0) expect(w.raid.warning.arrives % YEAR).toBe(10);
      }, numbers);
    }
  });
  it('at 8.4\'s numbers every later warning comes 360 to 660 days after the last arrival, and a raid is never earlier than drawn', () => {
    at84(() => {
      let lo = Infinity, hi = 0, earlier = 0, moved = 0, tooLate = 0;
      for (let seed = 1; seed <= 40; seed++) {
        for (let index = 1; index <= 25; index++) {
          const w = withSeed(seed, index), from = 1000 + 37 * seed + index;
          const day = laterWarnDay(w, from), base = drawn(w, from);
          lo = Math.min(lo, day - from);
          hi = Math.max(hi, day - from);
          if (day < base) earlier += 1;
          if (day > base) moved += 1;
          if (day - base > RAIDS.leanDays) tooLate += 1;
        }
      }
      expect([lo >= 360, hi <= 660, earlier, tooLate]).toEqual([true, true, 0, 0]);
      expect(moved).toBeGreaterThan(0);                                       // some did lean
    });
  });
  it('moves an arrival within the 60 days before Shemu to its first day, and no other', () => {
    at84(() => {
      expect(SEASONS.slice(0, 6)).toEqual(['peret', 'peret', 'shemu', 'shemu', 'shemu', 'shemu']);   // Shemu starts on month 3 (the day 60 of the year): read from SEASONS, never typed in the sim
      expect([0, 1, 30, 59].map((d) => leanWait(YEAR * 3 + d))).toEqual([60, 59, 30, 1]);              // months 1 and 2: wait for Shemu's first day
      expect([60, 61, 179, 180, 300, 359].map((d) => leanWait(YEAR * 3 + d))).toEqual([0, 0, 0, 0, 0, 0]);   // Shemu, and the months after it, and the day before the window
      for (let d = 0; d < 60; d++) expect((YEAR * 2 + d + leanWait(YEAR * 2 + d)) % YEAR).toBe(60);
    });
    at84(() => expect([0, 30, 59].map((d) => leanWait(d))).toEqual([0, 0, 0]), { leanDays: 0 });       // the data's own 0: no lean at all
  });
  it('lands 45-55% of 1,000 seeded arrivals in Shemu at 8.4\'s numbers, against about a third today', () => {
    const share = () => {
      let n = 0;
      for (let k = 0; k < 1000; k++) {
        const w = withSeed(1 + (k % 97), 1 + (k % 13));
        const from = 500 + 53 * k;
        if (inShemu(laterWarnDay(w, from) + RAIDS.warningDays)) n += 1;
      }
      return n / 1000;
    };
    const now = at84(share, {}), later = at84(share);
    expect([later >= 0.45, later <= 0.55]).toEqual([true, true]);
    expect([now >= 0.28, now <= 0.38]).toEqual([true, true]);
  });
  it('is exactly the old draw at today\'s numbers: the lean is off', () => {
    for (let seed = 1; seed <= 20; seed++) for (let index = 1; index <= 10; index++) {
      const w = withSeed(seed, index);
      expect(laterWarnDay(w, 2000)).toBe(drawn(w, 2000));
    }
  });
  it('gives a tribute the same lean: the next warning after one paid is laterWarnDay of the arrival day', () => {
    at84(() => {
      let leaned = 0;
      for (let arrives = 1000; arrives < 1000 + YEAR && leaned < 3; arrives += 7) {
        const w = raidCity();
        w.raid.index = 2;
        w.raid.warning = { index: 1, entry: { ...EAST }, dir: 'east', size: 5, tribute: 100, target: 'storehouse', day: arrives - 90, arrives, first: false, mix: footMix(5) };
        const expected = laterWarnDay(w, arrives);
        if (expected > drawn(w, arrives)) leaned += 1;
        expect(payTribute(w).ok).toBe(true);
        expect(w.raid.nextWarnDay).toBe(expected);
      }
      expect(leaned).toBeGreaterThan(0);
    });
  });
  it('schedules the next warning at a raid\'s end by the same lean, from the arrival day', () => {
    at84(() => {
      const w = raidCity();
      arriveNow(w, 3, { day: 1000 });
      runRaid(w);
      expect(w.raid.last !== null).toBe(true);
      expect(w.raid.nextWarnDay).toBe(laterWarnDay(w, 1000));
      expect(w.raid.nextWarnDay - 1000 >= 360 && w.raid.nextWarnDay - 1000 <= 660).toBe(true);
    });
  });
  it('keeps a saved city\'s scheduled warning on its day whichever numbers load it', () => {
    const w = raidCity();
    w.raid.clockDay = 100;
    w.raid.nextWarnDay = 820;
    const text = serialize(w);
    for (const numbers of [{}, undefined]) at84(() => expect(deserialize(text).raid.nextWarnDay).toBe(820), numbers);
  });
});
