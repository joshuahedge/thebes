// Version 8.4, Track G and the lesson (design section 8, items 4 and 5; rules84 rule 12). The tax rate changes no step's need, and nothing Track G adds can
// leave a step waiting: the tax rate, Rush and the luxuries sit only on the palace's, a site's and a Villa's sheets, and the lesson's city has none of them,
// at any step; nor does City advice ever name gold piling up there (it needs a palace).
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { TAX_RATES } from '../../../src/data/palace.js';
import { TIERS } from '../../../src/data/housing.js';
import { lessonWorld, lessonAt, stepDone, LESSON_SCRIPT, LESSON_LENGTH } from '../../../src/sim/lesson.js';
import { tickDay } from '../../../src/sim/clock.js';
import { allBuildings, housesOf, isSite } from '../../../src/sim/world.js';
import { taxRateOf } from '../../../src/sim/palace.js';
import { wantedNeeds } from '../../../src/sim/housing.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { isUnlocked } from '../../../src/sim/progression.js';

// The lesson played end to end by its own script (src/sim/lesson.js replayTo's loop), with `check(world, step)` after each step: [{ id, day }].
function walk(check = () => {}) {
  const world = lessonWorld();
  const io = { tick: () => tickDay(world), did() {} };
  const days = [];
  let at = lessonAt(world, 0);
  while (at < LESSON_LENGTH) {
    const step = LESSON_STEPS[at];
    LESSON_SCRIPT[step.id](world, io);
    if (!stepDone(world, step)) throw new Error(`lesson walk: ${step.id} not done`);
    days.push({ id: step.id, day: world.day });
    check(world, step);
    at = lessonAt(world, at + 1);
  }
  return { world, days };
}

describe('v84 g the lesson', () => {
  // Ruling 1479: the lesson's city has no palace, so its rate is always Normal and no step can wait on it. Forced to Low (as if it could be), every step
  // comes on the same day; forced to High, every step is still reached (no step reads the taxes), though High's -8 mood draws families more slowly, so
  // the workers step (homes filled) comes later: the rate reaches a step only through mood, as it reaches any city.
  it('reaches every step with the rate forced Low or High, Low on the same days (item 4: the tax rate changes no step\'s need)', () => {
    const plain = walk().days;
    expect(plain.length).toBe(LESSON_LENGTH);
    const normal = { ...TAX_RATES.normal };
    try {
      Object.assign(TAX_RATES.normal, TAX_RATES.low);                  // the rate the lesson's city is at (it has no palace: Normal) forced to Low's
      expect(walk().days).toEqual(plain);
      Object.assign(TAX_RATES.normal, TAX_RATES.high);
      const high = walk();                                              // throws if a step's script runs out of days
      expect([high.days[high.days.length - 1].id, lessonAt(high.world, LESSON_LENGTH - 1)]).toEqual(['raid', LESSON_LENGTH]);   // every step reached (a step already done is passed)
    } finally {
      Object.assign(TAX_RATES.normal, normal);
    }
    expect(TAX_RATES.normal).toEqual({ factor: 1, mood: 0 });
  });

  it('never has a palace, a monument site or a home that wants a luxury, so no step can wait on taxes, Rush or a luxury (item 5)', () => {
    const seen = [];
    walk((world, step) => {
      const palace = allBuildings(world).some((b) => b.type === 'palace');
      const site = allBuildings(world).some(isSite);
      const luxury = housesOf(world).some((h) => wantedNeeds(h).includes('luxury'));
      const spare = cityAdvice(world).some((a) => a.kind === 'gold_spare');
      seen.push([step.id, palace, site, luxury, spare, taxRateOf(world)]);
    });
    expect(seen).toEqual(LESSON_STEPS.map((s) => [s.id, false, false, false, false, 'normal']));
    expect(TIERS.findIndex((t) => t && t.needs.includes('luxury'))).toBe(8);
  });

  it('never offers a step the palace, a monument or a trade route: none is on any step\'s card', () => {
    const shown = LESSON_STEPS.filter((s) => s.show).map((s) => s.show.item);
    for (const item of ['palace', 'trading_post', 'quay', 'builders_guild']) expect([item, shown.includes(item)]).toEqual([item, false]);
    const { world } = walk();
    expect(isUnlocked(world, 'builders_guild')).toBe(false);          // no monument can even be founded in the lesson's city
  });
});
