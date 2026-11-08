// Version 9.2 Track L (ruling 1772): the month step plays at its own speed (2x) and its row says so; its wait is under the 30 s bar for one wait.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { lessonWorld, stepSpeed } from '../../../src/sim/lesson.js';
import { lessonFacts, stepWords } from '../../../src/ui/lesson.js';
import { walkLesson } from '../../v91/f/lesson.test.js';

describe('v92 l month: two months at double speed', () => {
  const month = LESSON_STEPS.find((s) => s.id === 'month');
  it('plays at 2x, its row says double speed (one sentence), and the walk-through waits under 30 s', () => {
    const w = lessonWorld();
    expect([month.speed, stepSpeed(w, month)]).toEqual([2, 2]);
    const words = stepWords(month, lessonFacts(w, month));
    expect(words.do.includes('at double speed')).toBe(true);
    expect((words.do.match(/[.!?]/g) || []).length).toBe(1);
    const walked = walkLesson().steps.find((s) => s.id === 'month');
    expect(walked.secs < 30).toBe(true);
  });
});
