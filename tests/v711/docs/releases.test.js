// Version 7.1.1 docs: 7.1.1 "Clearer first steps" is the second entry in What's new (Version 8.0 is newest), with its merge commit, 7.1 has its merge commit (e032f2c), and the entry names what changed in the words a
// player would look for.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v711 docs releases', () => {
  it('7.1.1 carries its merge commit (8.0 is newest), and 7.1 carries its own', () => {
    expect([RELEASES[1].version, RELEASES[1].date, RELEASES[1].title, RELEASES[1].build, APP_VERSION]).toEqual(['7.1.1', '2026-10-24', 'Clearer first steps', 'a6eae26', '8.0']);
    expect([RELEASES[2].version, RELEASES[2].build]).toEqual(['7.1', 'e032f2c']);
  });
  it('names what changed, including the skip and the goal', () => {
    const notes = [...RELEASES[1].new, ...RELEASES[1].fixed].join(' ').toLowerCase();
    for (const word of ['seat of the two lands', 'great temple', "skip, i've played before", 'how to play', 'undo', 'close button', 'middle']) expect([word, notes.includes(word)]).toEqual([word, true]);
  });
  it('every note is one plain sentence of a sensible length', () => {
    for (const line of [...RELEASES[1].new, ...RELEASES[1].fixed]) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
  });
});
