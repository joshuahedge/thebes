// Version 9.2 Track L (D15, ruling 1760): Swift Town is judged on day 300 and its line says the days, never "year 1.83".
import { describe, it, expect } from '../../harness.js';
import { FEATS } from '../../../src/data/feats.js';
import { FEAT_TEXT } from '../../../src/ui/text.js';
import { capital6World } from '../helpers/capital6.js';

describe('v92 l feats: Swift Town (D15)', () => {
  it('is day 300 in the data, the scripted city\'s Town split is inside it, and the copy names the days', () => {
    const f = FEATS.find((x) => x.id === 'swift_town');
    expect([f.check.kind, f.check.milestone, f.check.day]).toEqual(['before', 'town', 300]);
    expect(capital6World().splits.town).toBeLessThan(f.check.day);
    expect(FEAT_TEXT.swift_town.condition).toBe('Become a Town within 300 days');
    expect(/year\s*\d+\.\d+/.test(FEAT_TEXT.swift_town.condition)).toBe(false);
  });
});
