// Stage 4.7, Task 8 (ruling 473): a Fair flood gives x1.0 (was x0.9), so the average flood is a small gain. Low 0.6, Fair 1.0, Good 1.1, High 1.25. Every word
// that quotes a level reads the data (S46_RIVER_TEXT.pct and the data's rows), so the words follow; this checks the numbers and the sentences they make.
import { describe, it, expect } from '../../harness.js';
import { FLOOD_LEVELS, floodLevelRow } from '../../../src/data/river.js';
import { S46_RIVER_TEXT as R } from '../../../src/ui/text.js';

describe('s47 flood fair', () => {
  it('has the multipliers 0.6, 1.0, 1.1 and 1.25 and an average year that is a small gain, not a loss', () => {
    expect(FLOOD_LEVELS.map((l) => [l.id, l.harvest])).toEqual([['low', 0.6], ['fair', 1.0], ['good', 1.1], ['high', 1.25]]);
    expect(Math.abs(FLOOD_LEVELS.reduce((n, l) => n + l.chance, 0) - 1) < 1e-9).toBe(true);
    const average = FLOOD_LEVELS.reduce((n, l) => n + l.chance * l.harvest, 0);
    expect(Math.abs(average - 1.0125) < 1e-9).toBe(true);                                     // was 0.98
    expect(average).toBeGreaterThan(1);
  });

  it('says Fair gives 100% in every sentence that quotes a level, and 90% nowhere', () => {
    expect(R.levelsLine).toBe('Low 60%, Fair 100%, Good 110%, High 125%');
    expect(R.pct('fair')).toBe('100%');
    expect(R.forecastCaption('fair')).toBe('The flood will be Fair: farms on the floodplain grow 100%');
    expect(R.riseCaption('fair')).toBe('The Nile is rising: a Fair flood. Farms on the floodplain grow 100%');
    expect(R.farmRowNext('fair')).toContain('Fair flood coming: 100%');
    const row = R.farmRow({ applied: floodLevelRow('fair'), phase: 'risen' });
    expect(row).toContain('(Fair) gives 100%');
    const all = [R.levelsLine, R.forecastCaption('fair'), R.riseCaption('fair'), R.farmRowNext('fair'), row, R.farmRow({ applied: null, phase: 'wait' })].join(' | ');
    expect(all.includes('90%')).toBe(false);
    expect(R.farmRow({ applied: null, phase: 'wait' })).toContain('from 60% to 125%');
  });
});
