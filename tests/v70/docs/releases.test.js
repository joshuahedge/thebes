// Version 7.0 docs: the newest entry in What's new is 7.0 "A living world" with the running build, 6.0.1 has its merge commit (4502f53), and the
// entry names what the game now does in the words a player would look for.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v70 docs releases', () => {
  it('7.0 is the newest entry with the running build, and 6.0.1 carries its merge commit', () => {
    expect([RELEASES[0].version, RELEASES[0].title, RELEASES[0].build, APP_VERSION]).toEqual(['7.0', 'A living world', 'live', '7.0']);
    expect([RELEASES[1].version, RELEASES[1].build]).toEqual(['6.0.1', '4502f53']);
  });
  it('names the features of the version', () => {
    const notes = RELEASES[0].new.join(' ');
    for (const word of ['Nubia', 'Punt', 'Quay', 'Keep at least', 'Trade sheet', 'City events', 'default', 'Seasons', 'day and night', 'Sound', 'Advice', 'lesson card', 'Delete or Backspace', 'Keyboard', 'right or wrong', 'house plots']) {
      expect([word, notes.toLowerCase().includes(word.toLowerCase())]).toEqual([word, true]);
    }
  });
  it('lists what was fixed', () => {
    const fixed = RELEASES[0].fixed.join(' ');
    for (const word of ['five digits', 'Space', 'placing bar']) expect([word, fixed.includes(word)]).toEqual([word, true]);
  });
});
