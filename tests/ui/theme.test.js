import { describe, it, expect } from '../harness.js';
import { TOKENS, contrastRatio, TEXT_PAIRS, cssName } from '../../src/ui/theme.js';

describe('ui theme', () => {
  it('computes WCAG contrast', () => {
    expect(Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 0.01).toBe(true);
    expect(Math.abs(contrastRatio('#FFFFFF', '#FFFFFF') - 1) < 0.01).toBe(true);
  });
  it('keeps every text pair at 4.5:1 or better (spec 6.1)', () => {
    const failing = TEXT_PAIRS
      .filter(([fg, bg]) => contrastRatio(TOKENS[fg], TOKENS[bg]) < 4.5)
      .map(([fg, bg]) => `${fg} on ${bg} = ${contrastRatio(TOKENS[fg], TOKENS[bg]).toFixed(2)}`);
    expect(failing).toEqual([]);
  });
  it('matches the stylesheet tokens', async () => {
    const css = (await (await fetch('/css/ui.css')).text()).toUpperCase();
    const missing = Object.entries(TOKENS).filter(([name, hex]) => !css.includes(`${cssName(name).toUpperCase()}: ${hex.toUpperCase()}`)).map(([n]) => n);
    expect(missing).toEqual([]);
  });
});
