// Version 7.1.1 docs: the newest entry in What's new is 7.1.1 "Clearer first steps" with the running build, 7.1 has its merge commit (e032f2c), and the entry names what changed in the words a
// player would look for.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v711 docs releases', () => {
  it('7.1.1 is the newest entry with the running build, and 7.1 carries its merge commit', () => {
    expect([RELEASES[0].version, RELEASES[0].date, RELEASES[0].title, RELEASES[0].build, APP_VERSION]).toEqual(['7.1.1', '2026-10-24', 'Clearer first steps', 'live', '7.1.1']);
    expect([RELEASES[1].version, RELEASES[1].build]).toEqual(['7.1', 'e032f2c']);
  });
  it('names what changed, including the skip and the goal', () => {
    const notes = [...RELEASES[0].new, ...RELEASES[0].fixed].join(' ').toLowerCase();
    for (const word of ['seat of the two lands', 'great temple', "skip, i've played before", 'how to play', 'undo', 'close button', 'middle']) expect([word, notes.includes(word)]).toEqual([word, true]);
  });
  it('every note is one plain sentence of a sensible length', () => {
    for (const line of [...RELEASES[0].new, ...RELEASES[0].fixed]) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
  });
});
