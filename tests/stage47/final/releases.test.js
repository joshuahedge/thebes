// Stage 4.7 docs: the Version 4.7 entry in What's new says what the game does, and 4.7 and 4.6 have their merge commits as their builds (ruling 459's method).
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { FLOOD_LEVELS } from '../../../src/data/river.js';

describe('s47 releases', () => {
  it('4.7 is the second entry with its merge commit, and 4.6 carries its own', () => {
    const at = RELEASES.findIndex((r) => r.version === '4.7');
    expect([at, RELEASES[at].build, APP_VERSION]).toEqual([8, 'b541f9e', '8.1']);   // Version 8.1: eight newer entries now
    expect([RELEASES[at + 1].version, RELEASES[at + 1].build]).toEqual(['4.6', '5bb08e5']);
  });
  it('says the Fair flood as the data has it and names the old homes\' two months', () => {
    const fair = FLOOD_LEVELS.find((l) => l.id === 'fair').harvest;
    expect(fair).toBe(1);
    const r47 = RELEASES.find((r) => r.version === '4.7');
    const fixed = r47.fixed.join(' ');
    expect([fixed.includes('x1.0'), fixed.includes('two months')]).toEqual([true, true]);
    const notes = r47.new.join(' ');
    for (const word of ['Fetch', 'oases', 'tribute', 'year 8', 'year 10', 'third kind of food']) expect([word, notes.includes(word)]).toEqual([word, true]);
  });
});
