// Version 10.0, Track L (L.9, spec 5h and Q6, ruling 2250): the lesson's life. During every step only the townsfolk and the hearths may show (and the
// bazaar's crowd once its food step is done, so food reaching the bazaar shows as people arriving); no river life, builders or storm.
import { describe, it, expect } from '../../harness.js';
import { createLife, LIFE_IDS } from '../../../src/render/v100/life.js';
import { townsfolkSource } from '../../../src/render/v100/townsfolk.js';
import { crowdSource, lessonFoodDone } from '../../../src/render/v100/crowd.js';
import { riverSource } from '../../../src/render/v100/riverLife.js';
import { buildersSource } from '../../../src/render/v100/builders.js';
import { nightSource } from '../../../src/render/v100/night.js';
import { weatherSource } from '../../../src/render/v100/weather.js';
import { lessonWorld, lessonAt, LESSON_SCRIPT, LESSON_LENGTH } from '../../../src/sim/lesson.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { tickDay } from '../../../src/sim/clock.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeCanvas } from '../../helpers/canvas.js';

const kindOf = (id) => (id < LIFE_IDS.river ? 'townsfolk' : id < LIFE_IDS.builders ? 'river' : id < LIFE_IDS.crowd ? 'builders' : 'crowd');

describe('v100 l lesson: life under the lesson', () => {
  it('shows only townsfolk and hearths at each step, and the bazaar\'s crowd only once the food step is done', () => {
    const world = lessonWorld();
    const life = createLife({ deviceKind: 'desktop', level: () => 'full', now: () => 0, clock: () => 0 });
    const ran = new Set();
    const spy = (s) => { const out = { ...s }; for (const h of ['walkers', 'ground', 'late']) if (s[h]) out[h] = (...a) => { ran.add(s.name + (s.lessonOk ? '' : '!')); return s[h](...a); }; return out; };
    for (const s of [townsfolkSource(), buildersSource(), crowdSource(), riverSource(), nightSource(), weatherSource()]) life.addSource(spy(s));
    const range = { x0: 0, y0: 0, x1: world.size - 1, y1: world.size - 1 };
    const c = makeCanvas(64, 64), g = makeDraw(c.getContext('2d'), 1);
    const io = { tick: () => tickDay(world), did() {} };
    let at = lessonAt(world, 0), crowdBefore = 0, crowdAfter = 0, steps = 0;
    while (at < LESSON_LENGTH && steps < LESSON_LENGTH) {
      for (let k = 0; k < 6; k++) {
        const list = life.walkers(world, world.day + k * 0.37, 1000 + k * 7000, range, 'full');
        life.late(g, world, range, 1000 + k * 7000, 'full');
        for (const e of list) {
          const kind = kindOf(e.id);
          expect([LESSON_STEPS[at].id, kind === 'townsfolk' || kind === 'crowd']).toEqual([LESSON_STEPS[at].id, true]);
          if (kind === 'crowd') { if (lessonFoodDone(world)) crowdAfter++; else crowdBefore++; }
        }
      }
      LESSON_SCRIPT[LESSON_STEPS[at].id](world, io);
      at = lessonAt(world, at + 1);
      steps++;
    }
    expect(crowdBefore).toBe(0);
    expect(crowdAfter).toBeGreaterThan(0);
    expect([...ran].filter((n) => n.endsWith('!'))).toEqual([]);                  // no source that is not lessonOk ran
    expect(ran.has('idle') && ran.has('flicker')).toBe(true);
  });
});
