// Version 8.2 integration (ruling 1330): Ipi's docked bubble is two short lines, the why and the do, and nothing more. The 7.0 detail line that followed them (ruling 1324 set it at
// full size) repeated the why on many steps (the farm: "the green land by the river" twice), so it is gone. Every step: at most two sentences, no line sharing more than half
// its words with the other, and at most two type sizes.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { dockCard } from '../../helpers/lesson.js';
import { pageAt, frame } from '../../v711/lessonPage.js';

const sentences = (s) => s.split(/(?<=[.!?])\s+/).filter((x) => x.trim());
const wordsOf = (s) => new Set(s.toLowerCase().match(/[a-z0-9']+/g) || []);
// The share of the shorter line's words that the other line also has.
export function overlap(a, b) {
  const A = wordsOf(a), B = wordsOf(b), small = A.size <= B.size ? A : B, big = small === A ? B : A;
  return small.size ? [...small].filter((w) => big.has(w)).length / small.size : 0;
}
const shown = (n) => n && !n.hidden && n.getClientRects().length > 0 && n.textContent.trim() !== '';

describe('v82 i bubble: Ipi keeps to two short lines', () => {
  it('overlap counts the shared words of the shorter line', () => {
    expect([overlap('Farms grow only on the green land by the river.', 'Farms grow only on the fertile ground by the river, and each needs a road beside it.') > 0.5,
      overlap('A granary keeps the farm\'s grain.', 'Build a granary beside the road.') <= 0.5]).toEqual([true, true]);
  });
  for (const [width, height] of [[1280, 800], [390, 844]]) {
    it(`at ${width}x${height}: every step's bubble says at most two sentences, its lines never repeat each other, in at most two sizes`, async () => {
      const wrong = [];
      for (const step of LESSON_STEPS) {
        const s = await pageAt(step.id, { width, height });
        try {
          dockCard(s.root);
          await frame();
          const row = s.root.querySelector('#lesson');
          const lines = [...row.querySelectorAll('.body > span')].filter((n) => shown(n) && !n.classList.contains('label') && !n.classList.contains('chip')).map((n) => n.textContent.trim());
          const all = lines.join(' ');
          const sizes = new Set([...row.querySelectorAll('.body > *')].filter(shown).map((n) => getComputedStyle(n).fontSize));
          if (row.querySelector('.why')) wrong.push(`${step.id}: a detail line`);
          if (lines.length !== 2 || sentences(all).length > 2) wrong.push(`${step.id}: ${lines.length} lines, ${sentences(all).length} sentences: ${all}`);
          if (lines.length === 2 && overlap(lines[0], lines[1]) > 0.5) wrong.push(`${step.id}: the lines repeat each other: ${all}`);
          if (sizes.size > 2) wrong.push(`${step.id}: ${[...sizes]}`);
        } finally { s.cleanup(); }
      }
      expect(wrong).toEqual([]);
    });
  }
});
