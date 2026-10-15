// Stage 4.7 docs: the Version 4.7 entry in What's new says what the game does, and 4.6 has its merge commit as its build (ruling 459's method).
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { FLOOD_LEVELS } from '../../../src/data/river.js';

describe('s47 releases', () => {
  it('the newest entry is 4.7 with the running build, and 4.6 carries its merge commit', () => {
    expect([RELEASES[0].version, RELEASES[0].build, APP_VERSION]).toEqual(['4.7', 'live', '4.7']);
    expect([RELEASES[1].version, RELEASES[1].build]).toEqual(['4.6', 'ed005c5']);
  });
  it('says the Fair flood as the data has it and names the old homes\' two months', () => {
    const fair = FLOOD_LEVELS.find((l) => l.id === 'fair').harvest;
    expect(fair).toBe(1);
    const fixed = RELEASES[0].fixed.join(' ');
    expect([fixed.includes('x1.0'), fixed.includes('two months')]).toEqual([true, true]);
    const notes = RELEASES[0].new.join(' ');
    for (const word of ['Fetch', 'oases', 'tribute', 'year 8', 'year 10', 'third kind of food']) expect([word, notes.includes(word)]).toEqual([word, true]);
  });
});
