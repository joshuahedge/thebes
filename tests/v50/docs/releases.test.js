// Version 5.0 docs: the newest entry in What's new is 5.0 "Know your city", it names what the game now does, and 4.7 has its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v50 releases', () => {
  it('5.0 is the fifth entry with its merge commit (Version 6.0, 6.0.1, 7.0 and 7.1 are newer), and 4.7 carries its own', () => {
    expect([RELEASES[4].version, RELEASES[4].title, RELEASES[4].build, APP_VERSION]).toEqual(['5.0', 'Know your city', '486006a', '7.1']);
    expect([RELEASES[5].version, RELEASES[5].build]).toEqual(['4.7', 'b541f9e']);
  });
  it('names the features of the version', () => {
    const notes = RELEASES[4].new.join(' ');
    for (const word of ['City advice', 'next step', 'Home progress', 'Goods supply', 'Workers', 'Build another', 'Drag areas', 'Route', 'bridge', 'fling', 'two-finger double tap', 'third kind of food', 'Large maps']) {
      expect([word, notes.includes(word)]).toEqual([word, true]);
    }
  });
});
