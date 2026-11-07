// Version 8.4 wave 2, escalation by years (rulings 1530-1533): 8.4's clock brings raids about twice as often as 8.3's, so what grew by the raid (the mix's
// shares, which kinds may come, the elephants' start, two bands, the adaptation's climb) grows by the raid's stage instead: the index 8.3's clock would have
// reached on the raid's warning day (src/sim/raids.js raidStage, RAIDS.stagePace). The seeded draws keep the index. Each rule is set up both ways.
import { describe, it, expect } from '../../harness.js';
import { RAIDS, RAID_SALT } from '../../../src/data/raids.js';
import { ENEMY_TYPES, ENEMY_KINDS, MIX, ELEPHANTS, footMix } from '../../../src/data/armies.js';
import { raidStage, stageAt, stageFrom, stageYears, stageCycle, raidDay, payTribute } from '../../../src/sim/raids.js';
import { drawMix, elephantRaid, enemyMayCome } from '../../../src/sim/armies.js';
import { scoutsAt } from '../../../src/sim/scouts.js';
import { newRaidState, WORLD_VERSION } from '../../../src/sim/world.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { riskOf } from '../../../src/sim/costs.js';
import { hash2 } from '../../../src/sim/rng.js';
import { idx } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';
import { TIP_HELP_TEXT, CARDS4_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { raidCity, arriveNow, runRaid, at84, NUMBERS_83, EAST } from '../r/helpers.js';

const WEST = { x: 0, y: 16 };
// The clock day that puts a warning due on `day` at exactly `stage` (the first day of it).
const clockFor = (day, stage) => day - stageFrom(stage);
// A raid at `index` due today (nextWarnDay), its clock started so that its stage is `stage` (or no clock: null).
function dueAt(w, index, stage, day = 1000) {
  w.day = day;
  w.raid.index = index;
  w.raid.nextWarnDay = day;
  w.raid.warning = null;
  w.raid.active = null;
  w.raid.clockDay = stage === null ? null : clockFor(day, stage);
  return w;
}
const firstIndex = (from, test) => { for (let i = from; i < from + 500; i++) if (test(i)) return i; return -1; };

describe('v84 balance escalation: the stage', () => {
  it('holds 8.3\'s pace as data: the first warning 720 days after the clock, then a mean 1,080 after each arrival, 90 after its warning', () => {
    expect(RAIDS.stagePace).toEqual({ first: 720, gap: 1080, warning: 90 });
    expect([stageCycle(), stageFrom(0), stageFrom(3), stageYears(3)]).toEqual([1170, 720, 4230, 11.75]);
    // 8.4's own clock is not moved by it (B4, B5).
    expect([RAIDS.firstWarnAfter, RAIDS.laterMin, RAIDS.laterMax, RAIDS.leanDays, RAIDS.warningDays]).toEqual([300, 360, 600, 60, 90]);
  });
  it('is 0 for the first raid, and at 8.3\'s mean pace equals the index, as 8.3 counted', () => {
    const w = makeTestWorld();
    const clock = 210;
    for (let k = 0; k < 14; k++) {
      dueAt(w, k, 0);
      w.raid.clockDay = clock;
      w.raid.nextWarnDay = clock + RAIDS.stagePace.first + k * stageCycle();
      expect([k, raidStage(w, k)]).toEqual([k, k]);
    }
    w.raid.nextWarnDay = clock + 9000;
    expect(raidStage(w, 0)).toBe(0);                                             // the first raid keeps every first-raid rule, whenever it comes
  });
  it('lags the index at 8.4\'s pace: about one stage for every two raids', () => {
    const w = makeTestWorld();
    const clock = 210, mean84 = (RAIDS.laterMin + RAIDS.laterMax) / 2 + RAIDS.warningDays;   // 570 days from one warning to the next
    const stages = [];
    for (let k = 0; k < 14; k++) {
      dueAt(w, k, 0);
      w.raid.clockDay = clock;
      w.raid.nextWarnDay = clock + RAIDS.firstWarnAfter + k * mean84;
      stages.push(raidStage(w, k));
    }
    expect(stages).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5]);
    // The capital and great-work runs' own warning days (clock day 210; the balance check's probe): 13 raids by year 20 reach stage 5, as 8.3's 7 raids reached index 6.
    const days = [510, 1050, 1538, 2130, 2619, 3241, 3722, 4187, 4684, 5234, 5832, 6382, 6911];
    expect(days.map((d, k) => Math.min(k, stageAt(clock, d)))).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
  });
  it('is never more than the index, never below 0, and the index itself for a city whose clock has not started', () => {
    const w = dueAt(makeTestWorld(), 2, 9);
    expect(raidStage(w, 2)).toBe(2);
    dueAt(w, 5, 0);
    w.raid.clockDay = w.day;                                                       // the clock started today: 8.3 had warned nothing yet
    expect(raidStage(w, 5)).toBe(0);
    dueAt(w, 6, null);
    expect(raidStage(w, 6)).toBe(6);
  });
  it('reads the warning\'s own day once it is up, and the day the raid is due before (so the scouts and the warning agree)', () => {
    const w = dueAt(makeTestWorld({ raiderEntries: [EAST] }), 4, 3, 5000);
    w.day = 4980;                                                                 // the scouts' days: the stage is the due day's, not today's
    expect([stageAt(w.raid.clockDay, w.day), raidStage(w, 4)]).toEqual([2, 3]);
    w.raid.warning = { index: 4, day: 4000 };
    expect(raidStage(w, 4)).toBe(stageAt(w.raid.clockDay, 4000));
  });
});

describe('v84 balance escalation: the kinds, the shares, elephants and two bands wait for the stage', () => {
  it('brings archers from stage 2 and chariots from stage 5 (8.3\'s 3rd and 6th raids), whatever the index', () => {
    expect([ENEMY_TYPES.archer.fromRaid, ENEMY_TYPES.boat.fromRaid, ENEMY_TYPES.chariot.fromRaid, ENEMY_TYPES.elephant.fromRaid]).toEqual([3, 5, 6, 4]);
    const w = makeTestWorld();
    dueAt(w, 9, 1);
    expect(drawMix(w, 9, 12)).toEqual(footMix(12));                               // the 10th raid, 8.3's 2nd: all on foot
    dueAt(w, 9, 2);
    const m = drawMix(w, 9, 12);
    expect([m.archer > 0, m.chariot]).toEqual([true, 0]);
    dueAt(w, 9, 5);
    expect(drawMix(w, 9, 12).chariot > 0).toBe(true);
    expect([enemyMayCome('archer', 1), enemyMayCome('archer', 2), enemyMayCome('elephant', 2), enemyMayCome('elephant', 3)]).toEqual([false, true, false, true]);
  });
  it('grows a kind\'s share by the stages since it came, with the index\'s own jitter', () => {
    const w = makeTestWorld();
    const share = (index, stage, k, size) => {
      const m = MIX[k], factor = MIX.riskFactor[0] + MIX.riskFactor[1] * riskOf(w);
      const jitter = 1 - MIX.jitter + 2 * MIX.jitter * hash2(w.seed, index * 4 + ENEMY_KINDS.indexOf(k), RAID_SALT.mix);
      return Math.max(1, Math.round(size * Math.min(m.max, m.base + m.perRaid * (stage - (ENEMY_TYPES[k].fromRaid - 1))) * factor * jitter));
    };
    for (const [index, stage] of [[6, 2], [9, 3], [11, 4], [12, 5]]) {
      dueAt(w, index, stage);
      expect([index, stage, drawMix(w, index, 18).archer]).toEqual([index, stage, share(index, stage, 'archer', 18)]);
    }
  });
  it('at 8.3\'s pace (the stage equal to the index) draws exactly the mix 8.3 drew', () => {
    const w = makeTestWorld(), plain = makeTestWorld();
    for (let i = 1; i < 14; i++) {
      dueAt(w, i, i);
      dueAt(plain, i, null);
      expect([i, drawMix(w, i, 15)]).toEqual([i, drawMix(plain, i, 15)]);
    }
  });
  it('brings elephants from stage 3 only, about 12 years after the clock starts; the draw stays the index\'s', () => {
    const w = makeTestWorld();
    const e = firstIndex(4, (i) => hash2(w.seed, i, RAID_SALT.elephant) < ELEPHANTS.chance);
    dueAt(w, e, 2);
    expect([e, elephantRaid(w, e), 'elephant' in drawMix(w, e, 16)]).toEqual([e, false, false]);
    dueAt(w, e, 3);
    expect([elephantRaid(w, e), drawMix(w, e, 16).elephant]).toEqual([true, 2]);
    const plain = firstIndex(4, (i) => hash2(w.seed, i, RAID_SALT.elephant) >= ELEPHANTS.chance);
    dueAt(w, plain, 5);
    expect(elephantRaid(w, plain)).toBe(false);
    expect(Math.round(stageYears(ENEMY_TYPES.elephant.fromRaid - 1))).toBe(12);
  });
  it('has the scouts stand at the elephant raid\'s entry before a warning whose stage today has not reached', () => {
    const w = raidCity({ entries: [EAST, { x: 16, y: 31 }] });
    for (let x = 20; x <= 22; x++) for (let y = 20; y < 32; y++) w.terrain[idx(w.size, x, y)] = T.WATER;   // a river reaching the south edge
    const e = firstIndex(4, (i) => hash2(w.seed, i, RAID_SALT.elephant) < ELEPHANTS.chance);
    dueAt(w, e, 3, 5000);
    w.day = 4990;
    expect([stageAt(w.raid.clockDay, w.day), elephantRaid(w, e)]).toEqual([2, true]);
    const s = scoutsAt(w);
    w.day = 5000;
    raidDay(w, []);
    expect([s.entry, w.raid.warning.entry]).toEqual([{ x: 16, y: 31 }, { x: 16, y: 31 }]);
  });
  it('comes as two bands only from stage 3 (8.3\'s 4th raid), the draw the index\'s', () => {
    const w = raidCity({ entries: [EAST, WEST] });
    const i = firstIndex(4, (k) => hash2(w.seed, k, RAID_SALT.two) < RAIDS.twoSidedChance && hash2(w.seed, k, RAID_SALT.elephant) >= ELEPHANTS.chance);
    dueAt(w, i, 2);
    raidDay(w, []);
    expect([i, Boolean(w.raid.warning), Boolean(w.raid.warning.second)]).toEqual([i, true, false]);
    dueAt(w, i, 3);
    raidDay(w, []);
    expect([w.raid.warning.second && w.raid.warning.second.dir, w.raid.warning.dir]).toEqual(['west', 'east']);
  });
});

describe('v84 balance escalation: the adaptation climbs by the years to the next raid', () => {
  // A raid of 3 beaten by 3 staffed towers after a loss (adaptation at RAIDS.adaptLost); returns the world.
  const beatenAfterLoss = () => {
    const w = raidCity({ towers: 3 });
    w.raid.clockDay = 0;
    w.raid.adaptation = RAIDS.adaptLost;
    arriveNow(w, 3);
    runRaid(w);
    return w;
  };
  it('adds adaptStep for 8.3\'s mean 1,170 days to the next arrival, as 8.3 added it a raid', () => {
    const w = at84(beatenAfterLoss, { ...NUMBERS_83, laterMin: 1080, laterMax: 1080 });
    expect([w.raid.last.won, w.raid.nextWarnDay - 1000, w.raid.adaptation]).toEqual([true, 1080, RAIDS.adaptLost + RAIDS.adaptStep]);
  });
  it('adds it by the days at 8.4\'s pace: about half a step a raid, so the climb back to 1 takes 8.3\'s years', () => {
    const w = beatenAfterLoss();
    const days = w.raid.nextWarnDay + RAIDS.warningDays - 1000;
    expect(w.raid.last.won).toBe(true);
    expect(w.raid.adaptation).toBe(Math.min(1, RAIDS.adaptLost + (RAIDS.adaptStep * days) / 1170));
    expect([days >= 450 && days <= 750, w.raid.adaptation < RAIDS.adaptLost + RAIDS.adaptStep * 0.65]).toEqual([true, true]);
  });
  it('still sets RAIDS.adaptLost after a lost raid, and never climbs above 1', () => {
    const lost = raidCity();
    lost.raid.clockDay = 0;
    arriveNow(lost, 3);
    runRaid(lost);
    expect([lost.raid.last.won, lost.raid.adaptation]).toEqual([false, RAIDS.adaptLost]);
    const w = raidCity({ towers: 3 });
    w.raid.adaptation = 0.95;
    arriveNow(w, 3);
    runRaid(w);
    expect(w.raid.adaptation).toBe(1);
  });
  it('climbs the same way when a tribute is paid', () => {
    const w = raidCity({ gold: 5000 });
    w.raid.adaptation = RAIDS.adaptLost;
    w.raid.index = 3;
    w.raid.warning = { index: 2, entry: { ...EAST }, dir: 'east', size: 6, tribute: 200, target: 'storehouse', day: 910, arrives: 1000, first: false, mix: footMix(6) };
    w.day = 950;
    expect(payTribute(w).ok).toBe(true);
    const days = w.raid.nextWarnDay + RAIDS.warningDays - 1000;
    expect(w.raid.adaptation).toBe(RAIDS.adaptLost + (RAIDS.adaptStep * days) / 1170);
  });
});

describe('v84 balance escalation: saves and words', () => {
  it('keeps no new state: the raid\'s shape and the world version are 8.4\'s, and a warning up keeps its mix through a reload', () => {
    expect([Object.keys(newRaidState()), WORLD_VERSION]).toEqual([['clockDay', 'nextWarnDay', 'index', 'warning', 'active', 'adaptation', 'last'], 12]);   // 9.0 wave 0 made the world version 12 (the heir, ruling 1560); the raid's shape is still 8.4's
    const w = raidCity({ entries: [EAST, WEST] });
    for (let k = 0; k < 4; k++) addRaw(w, 'house', 2 + 2 * k, 2, { tier: 3, residents: 120 });
    dueAt(w, 9, 3);
    raidDay(w, []);
    const warned = JSON.parse(JSON.stringify(w.raid.warning));
    const back = deserialize(serialize(w));
    expect(back.raid.warning).toEqual(warned);
    // A later load with its clock moved (as if the stage were read again) still arrives with the mix the warning fixed.
    back.raid.clockDay = w.raid.clockDay + 3000;
    back.day = warned.arrives;
    raidDay(back, []);
    expect([back.raid.active.mix, back.raid.active.size]).toEqual([warned.mix, warned.size]);
  });
  it('says when elephants first come in years after the raid clock starts, from the sim\'s own stage', () => {
    const years = Math.round(stageYears(ENEMY_TYPES.elephant.fromRaid - 1));
    expect(CARDS4_TEXT.cards.elephants.words.startsWith(`From about ${years} years after the raid clock starts`)).toBe(true);
    expect(TIP_HELP_TEXT.war_elephants.startsWith(`About ${years} years into raids`)).toBe(true);   // the tip's help keeps to 20 words
    for (const words of [TIP_HELP_TEXT.war_elephants, CARDS4_TEXT.cards.elephants.words]) expect(/\d+(st|nd|rd|th) raid/.test(words)).toBe(false);
    expect(years).toBe(12);
  });
});
