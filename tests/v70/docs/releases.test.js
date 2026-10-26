// Version 7.0 docs: What's new has 7.0 "A living world" and its entry names what the game now does in the words a player would look for.
// Version 7.1: 7.1 is the newest entry with the running build, 7.0 has its merge commit (16cda04) and 6.0.1 keeps its own (4502f53).
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v70 docs releases', () => {
  it('7.0 carries its merge commit (7.1.1 is newest), and 6.0.1 carries its own', () => {
    expect([RELEASES[4].version, RELEASES[4].title, RELEASES[4].build, APP_VERSION]).toEqual(['7.0', 'A living world', '16cda04', '8.1']);
    expect([RELEASES[5].version, RELEASES[5].build]).toEqual(['6.0.1', '4502f53']);
  });
  it('names the features of the version', () => {
    const notes = RELEASES[4].new.join(' ');
    for (const word of ['Nubia', 'Punt', 'Quay', 'Keep at least', 'Trade sheet', 'City events', 'default', 'Seasons', 'day and night', 'Sound', 'Advice', 'lesson card', 'Delete or Backspace', 'Keyboard', 'right or wrong', 'house plots']) {
      expect([word, notes.toLowerCase().includes(word.toLowerCase())]).toEqual([word, true]);
    }
  });
  it('lists what was fixed', () => {
    const fixed = RELEASES[4].fixed.join(' ');
    for (const word of ['five digits', 'Space', 'placing bar']) expect([word, fixed.includes(word)]).toEqual([word, true]);
  });
});
