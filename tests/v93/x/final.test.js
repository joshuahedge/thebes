// Version 9.3, the last fixes after the re-review: the score chip's popover in a decree run, a pair's bonus words, and the scribe's bubble after the end.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { explainStat, createScoreReader } from '../../../src/ui/v81/stats.js';
import { U93_TEXT } from '../../../src/ui/text.js';
import { V81_B_TEXT } from '../../../src/ui/v81/bText.js';

describe('v93 x final: the re-review fixes', () => {
  it('opens the score chip in a decree run on the decree score: its own words and a bonus line', () => {
    const w = createWorld({ seed: 202647, decree: { week: '2026-47', ids: ['sea_peoples'] } });
    const out = explainStat(w, 'score', { score: createScoreReader(w) });
    expect(out.what).toBe(U93_TEXT.chipWhat);
    expect(out.lines.some(([name]) => name === U93_TEXT.bonusPart)).toBe(true);
  });
  it('keeps the plain city chip as it was: five parts, no bonus line', () => {
    const w = createWorld({ seed: 7 });
    const out = explainStat(w, 'score', { score: createScoreReader(w) });
    expect(out.what).toBe(V81_B_TEXT.score.what);
    expect(out.lines.some(([name]) => name === U93_TEXT.bonusPart)).toBe(false);
  });
  it("writes a pair's second bonus mid-sentence, lower case", () => {
    const s = U93_TEXT.bonusOf(['plague', 'low_nile']);
    const second = s.split(' and ')[1];
    expect(second.charAt(0)).toBe(second.charAt(0).toLowerCase());
  });
});
