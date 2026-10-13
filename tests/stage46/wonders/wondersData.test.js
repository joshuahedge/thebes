// Stage 4.6, Wonders track (rulings 342, 345, 390-392, 396): the three new monument kinds in the 4.16 table pattern, between their neighbours in cost and
// time, unlocking at a stated milestone, with their first, their tip and their How to play line.
import { describe, it, expect } from '../../harness.js';
import { MONUMENTS, MONUMENT_KINDS, MONUMENT, PRESTIGE, PRESTIGE_UNLOCKS } from '../../../src/data/monuments.js';
import { NEW_MONUMENT_KINDS, WONDER_UNLOCKS, WONDER_FIRSTS, WONDER_TIPS, WONDER_ACHIEVEMENTS } from '../../../src/data/wonders.js';
import { BUILDINGS, BUILDABLE, dimsOf } from '../../../src/data/buildings.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { DESIRABILITY } from '../../../src/data/desirability.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { TIPS } from '../../../src/data/tips.js';
import { ACHIEVEMENTS } from '../../../src/data/achievements.js';
import { ART } from '../../../src/render/art/registry.js';
import { DAYS_PER_MONTH, DAYS_PER_SECOND } from '../../../src/sim/time.js';
import { FIRST_TEXT, TIP_TEXT, TIP_HELP_TEXT, ACHIEVEMENT_TEXT, S46_WONDER_TEXT, wondFacts } from '../../../src/ui/text.js';

const units = (m) => m.courses.reduce((s, c) => s + c.stone + c.bricks, 0);
const months = (k) => MONUMENTS[k].crewMonths / MONUMENTS[k].crews;
const prestige = (k) => MONUMENTS[k].prestige.courses + MONUMENTS[k].prestige.done;
const between = (v, lo, hi) => v > lo && v < hi;
// Each new kind with the two kinds the plan puts it between (ruling 342).
const NEIGHBOURS = { great_sphinx: ['obelisk_large', 'colossus'], sun_temple: ['mastaba_large', 'pyramid_small'], step_pyramid: ['pyramid_small', 'pyramid_great'] };

describe('s46 wonders data', () => {
  it('lists ten kinds in the order of their cost, the three new ones in their places (ruling 345: the great sphinx, not the statue)', () => {
    expect(NEW_MONUMENT_KINDS).toEqual(['great_sphinx', 'sun_temple', 'step_pyramid']);
    expect(MONUMENT_KINDS).toEqual(['obelisk_small', 'obelisk_large', 'great_sphinx', 'colossus', 'mastaba_small', 'mastaba_large', 'sun_temple', 'pyramid_small', 'step_pyramid', 'pyramid_great']);
    const gold = MONUMENT_KINDS.map((k) => MONUMENTS[k].founding);
    expect(gold).toEqual([...gold].sort((a, b) => a - b));
    expect(BUILDINGS.sphinx.w * BUILDINGS.sphinx.d).toBe(1);                       // the statue on the Homes card is untouched
    expect(BUILDINGS.great_sphinx.category).toBe('monuments');
  });

  it('puts each new kind between its neighbours in gold, materials, work and time, with the footprints the plan names', () => {
    for (const [k, [lo, hi]] of Object.entries(NEIGHBOURS)) {
      const row = { gold: MONUMENTS[k].founding, units: units(MONUMENTS[k]), work: MONUMENTS[k].crewMonths, months: months(k), prestige: prestige(k) };
      const L = { gold: MONUMENTS[lo].founding, units: units(MONUMENTS[lo]), work: MONUMENTS[lo].crewMonths, months: months(lo), prestige: prestige(lo) };
      const H = { gold: MONUMENTS[hi].founding, units: units(MONUMENTS[hi]), work: MONUMENTS[hi].crewMonths, months: months(hi), prestige: prestige(hi) };
      for (const key of Object.keys(row)) expect([k, key, between(row[key], L[key], H[key])]).toEqual([k, key, true]);
    }
    expect(['great_sphinx', 'sun_temple', 'step_pyramid'].map((k) => [MONUMENTS[k].w, MONUMENTS[k].d])).toEqual([[3, 2], [3, 3], [4, 4]]);
  });

  it('follows the 4.16 table pattern: gold, materials, crews, game time, and the real times at 1x and 3x', () => {
    const rows = NEW_MONUMENT_KINDS.map((k) => {
      const m = MONUMENTS[k], f = wondFacts(k);
      expect(units(m)).toBe(m.crewMonths * MONUMENT.unitsPerCrewMonth);           // the work and the courses agree (as every kind's do)
      return [k, f.gold, f.stone, f.bricks, f.crews, f.months, f.at1x, f.at3x];
    });
    expect(rows).toEqual([
      ['great_sphinx', 500, 720, 0, 2, 18, '9 min', '3 min'],
      ['sun_temple', 2500, 3000, 3000, 4, 75, '37 min 30 s', '12 min 30 s'],
      ['step_pyramid', 4500, 9180, 1620, 4, 135, '67 min 30 s', '22 min 30 s'],
    ]);
    expect(MONUMENTS.great_sphinx.courses.map((c) => c.stone)).toEqual([120, 120, 120, 120, 120, 120]);
    expect(MONUMENTS.sun_temple.courses.map((c) => (c.stone ? 'stone' : 'bricks'))).toEqual(['bricks', 'bricks', 'bricks', 'stone', 'stone', 'stone']);
    for (const c of MONUMENTS.step_pyramid.courses) expect(c.bricks / (c.stone + c.bricks)).toBe(0.15);   // the ramp's bricks, as the pyramids'
    for (const k of NEW_MONUMENT_KINDS) expect([k, MONUMENTS[k].prestige.courses]).toEqual([k, MONUMENTS[k].prestige.done]);   // half by course, half on completion
  });

  it('gives the sphinx the colossus\'s desirability, the temple the widest high reach, the step pyramid a place between the pyramids', () => {
    expect(MONUMENTS.great_sphinx.desirability).toEqual(MONUMENTS.colossus.desirability);
    const at = (k) => MONUMENTS[k].desirability;
    expect(at('sun_temple').length).toBe(6);
    at('sun_temple').forEach((v, i) => expect(v >= at('mastaba_large')[i] && v <= at('pyramid_small')[i]).toBe(true));
    at('step_pyramid').forEach((v, i) => expect(between(v, at('pyramid_small')[i], at('pyramid_great')[i])).toBe(true));
    for (const k of NEW_MONUMENT_KINDS) expect(DESIRABILITY[k]).toEqual(MONUMENTS[k].desirability);
  });

  it('unlocks each at a stated milestone and lists it there; none waits on prestige (ruling 392), so an older save still validates', () => {
    expect(WONDER_UNLOCKS).toEqual({ great_city: ['great_sphinx'], capital: ['sun_temple', 'step_pyramid'] });
    for (const k of NEW_MONUMENT_KINDS) {
      const at = MILESTONES.filter((m) => m.unlocks.includes(k)).map((m) => m.id);
      expect([k, at]).toEqual([k, [MONUMENTS[k].unlock.milestone]]);
      expect(MONUMENTS[k].unlock.prestige).toBe(undefined);
    }
    expect(PRESTIGE_UNLOCKS).toEqual(['pyramid_small', 'pyramid_great']);
  });

  it('makes each a monument building in the Monuments tab, in the order of cost, with a live art slot and the prestige one-of-each-kind rule', () => {
    expect(CATEGORIES.find((c) => c.id === 'monuments').items).toEqual(['builders_guild', 'quarry', 'brickworks', ...MONUMENT_KINDS]);
    for (const k of NEW_MONUMENT_KINDS) {
      expect([k, BUILDINGS[k].monument, BUILDINGS[k].needsRoad, BUILDINGS[k].cost, BUILDINGS[k].rotates, BUILDABLE.includes(k), ART[k].live, typeof ART[k].draw]).toEqual([k, true, true, MONUMENTS[k].founding, false, true, true, 'function']);
      expect(dimsOf(k, 1)).toEqual({ w: MONUMENTS[k].w, d: MONUMENTS[k].d, rot: 0 });
    }
    expect(MONUMENT_KINDS.reduce((s, k) => s + prestige(k), 0)).toBe(PRESTIGE.scoreFull + NEW_MONUMENT_KINDS.reduce((s, k) => s + prestige(k), 0));   // the seven still make the score's 700
  });

  it('brings each with one first, one tip and a How to play line, every number from the data (and says "seven of ten" for Seven wonders, ruling 396)', () => {
    expect(WONDER_FIRSTS.map((f) => f.id)).toEqual(NEW_MONUMENT_KINDS.map((k) => `first_${k}`));
    for (const f of WONDER_FIRSTS) expect([FIRSTS.some((x) => x.id === f.id), Boolean(FIRST_TEXT[f.id] && FIRST_TEXT[f.id].head)]).toEqual([true, true]);
    for (const k of NEW_MONUMENT_KINDS) {
      const tip = WONDER_TIPS.find((t) => t.id === `wonder_${k}`), f = wondFacts(k);
      expect([TIPS.some((t) => t.id === tip.id), tip.trigger]).toEqual([true, `${k}Unlocked`]);
      for (const text of [TIP_TEXT[tip.id], TIP_HELP_TEXT[tip.id]]) {
        for (const part of [`${f.gold.toLocaleString('en-GB')} gold`, `${f.crews} crews`, `${f.at1x} at 1x`, `${f.reach} tiles`]) expect([k, part, text.includes(part)]).toEqual([k, part, true]);
        expect([k, text.split(/\s+/).length <= 20]).toEqual([k, true]);                  // a tip keeps to 20 words
      }
      expect([TIP_TEXT[tip.id].includes('unlocked'), TIP_HELP_TEXT[tip.id].includes(`(${f.milestone})`)]).toEqual([true, true]);   // the tip says it is ready; How to play says what it comes with
      // the whole table, from the data, comes with the first: prestige, crews, game time and both real times
      const why = FIRST_TEXT[`first_${k}`].why;
      for (const part of [`${prestige(k)} prestige`, `${f.crews} crews`, `${f.months} game months`, f.at1x, f.at3x]) expect([k, part, why.includes(part)]).toEqual([k, part, true]);
      const line = S46_WONDER_TEXT.kindLine(k);
      for (const part of [`${f.size} tiles`, `${f.gold.toLocaleString('en-GB')} gold`, f.stone ? `${f.stone.toLocaleString('en-GB')} stone` : '', f.bricks ? `${f.bricks.toLocaleString('en-GB')} bricks` : '']) expect([k, part, line.includes(part)]).toEqual([k, part, true]);
    }
    expect(WONDER_TIPS.map((t) => t.id)).toEqual(['wonder_great_sphinx', 'wonder_sun_temple', 'wonder_step_pyramid', 'monument_styles']);
    expect(WONDER_ACHIEVEMENTS).toEqual([]);                                       // Seven wonders stays as it was (ruling 396)
    const seven = ACHIEVEMENTS.find((a) => a.id === 'seven_wonders');
    expect(seven.measure).toEqual({ kind: 'kinds', n: 7 });
    expect(ACHIEVEMENT_TEXT.seven_wonders).toBe(`Finish 7 different kinds of monument (there are ${MONUMENT_KINDS.length})`);
  });

  it('computes the words from the data: change a kind\'s work and its line follows', () => {
    const k = 'sun_temple', was = MONUMENTS[k].crewMonths;
    try {
      MONUMENTS[k].crewMonths = was + 40;                                          // 85 months with four crews: 42 min 30 s at 1x
      expect(S46_WONDER_TEXT.kindLine(k).includes('85 game months')).toBe(true);
      expect(S46_WONDER_TEXT.kindLine(k).includes('42 min 30 s')).toBe(true);
    } finally { MONUMENTS[k].crewMonths = was; }
    expect(S46_WONDER_TEXT.kindLine(k).includes('75 game months')).toBe(true);
  });
});
