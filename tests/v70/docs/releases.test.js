// Version 7.0 docs: What's new has 7.0 "A living world" and its entry names what the game now does in the words a player would look for.
// Version 7.1: 7.1 is the newest entry with the running build, 7.0 has its merge commit (16cda04) and 6.0.1 keeps its own (4502f53).
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v70 docs releases', () => {
  it('7.0 carries its merge commit (every version since is newer), and 6.0.1 carries its own', () => {
    expect([RELEASES[7].version, RELEASES[7].title, RELEASES[7].build, APP_VERSION]).toEqual(['7.0', 'A living world', '16cda04', '8.3']);
    expect([RELEASES[8].version, RELEASES[8].build]).toEqual(['6.0.1', '4502f53']);
  });
  it('names the features of the version', () => {
    const notes = RELEASES[7].new.join(' ');
    for (const word of ['Nubia', 'Punt', 'Quay', 'Keep at least', 'Trade sheet', 'City events', 'default', 'Seasons', 'day and night', 'Sound', 'Advice', 'lesson card', 'Delete or Backspace', 'Keyboard', 'right or wrong', 'house plots']) {
      expect([word, notes.toLowerCase().includes(word.toLowerCase())]).toEqual([word, true]);
    }
  });
  it('lists what was fixed', () => {
    const fixed = RELEASES[7].fixed.join(' ');
    for (const word of ['five digits', 'Space', 'placing bar']) expect([word, fixed.includes(word)]).toEqual([word, true]);
  });
});
