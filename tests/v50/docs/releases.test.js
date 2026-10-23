// Version 5.0 docs: the newest entry in What's new is 5.0 "Know your city", it names what the game now does, and 4.7 has its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v50 releases', () => {
  it('5.0 is the second entry with its merge commit (Version 6.0 is the newest), and 4.7 carries its own', () => {
    expect([RELEASES[1].version, RELEASES[1].title, RELEASES[1].build, APP_VERSION]).toEqual(['5.0', 'Know your city', '2653e92', '6.0']);
    expect([RELEASES[2].version, RELEASES[2].build]).toEqual(['4.7', 'eef5ccb']);
  });
  it('names the features of the version', () => {
    const notes = RELEASES[1].new.join(' ');
    for (const word of ['City advice', 'next step', 'Home progress', 'Goods supply', 'Workers', 'Build another', 'Drag areas', 'Route', 'bridge', 'fling', 'two-finger double tap', 'third kind of food', 'Large maps']) {
      expect([word, notes.includes(word)]).toEqual([word, true]);
    }
  });
});
