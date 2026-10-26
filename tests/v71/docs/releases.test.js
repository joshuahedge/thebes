// Version 7.1 docs: the newest entry in What's new is 7.1 "Rivers of the world" with the running build, 7.0 has its merge commit (16cda04),
// and the entry names what the game now does in the words a player would look for. The notes stay short enough for the sheet.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v71 docs releases', () => {
  it('7.1 carries its merge commit (7.1.1 is newest), and 7.0 carries its own', () => {
    expect([RELEASES[4].version, RELEASES[4].date, RELEASES[4].title, RELEASES[4].build, APP_VERSION]).toEqual(['7.1', '2026-10-24', 'Rivers of the world', 'e032f2c', '8.2']);
    expect([RELEASES[5].version, RELEASES[5].build]).toEqual(['7.0', '16cda04']);
  });
  it('names the features of the version', () => {
    const notes = RELEASES[4].new.join(' ').toLowerCase();
    for (const word of ['delta', 'confluence', 'twin rivers', 'wide nile', 'cataract', 'lake', 'two new cities in three', 'ferry', '5 to 12 tiles', 'road tool', 'saved cities']) {
      expect([word, notes.includes(word)]).toEqual([word, true]);
    }
  });
  it('lists what the bug review fixed', () => {
    const fixed = RELEASES[4].fixed.join(' ').toLowerCase();
    for (const word of ['fever', 'lesson card', 'paid event choices', 'strike', 'buy', 'keep at least', 'by 50', 'how to play', 'focus', 'sound off', 'delta maps', 'ferry']) {
      expect([word, fixed.includes(word)]).toEqual([word, true]);
    }
  });
  it('every note is one plain sentence of a sensible length', () => {
    for (const line of [...RELEASES[4].new, ...RELEASES[4].fixed]) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
  });
});
