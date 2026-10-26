// Version 8.1 integration: the release entry, the version constant, and 8.0 carrying its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v81 i release: Version 8.1 "The vizier"', () => {
  it('is the second entry with its merge commit (8.2 is newest), and 8.0 carries its own', () => {
    expect([APP_VERSION, RELEASES[1].version, RELEASES[1].date, RELEASES[1].title, RELEASES[1].build]).toEqual(['8.2', '8.1', '2026-10-26', 'The vizier', 'ad57f92']);
    expect([RELEASES[2].version, RELEASES[2].build]).toEqual(['8.0', '702481b']);
  });
  it('names what changed in the words a player would look for, each note one plain sentence', () => {
    const notes = [...RELEASES[1].new, ...RELEASES[1].fixed];
    const text = notes.join(' ').toLowerCase();
    for (const word of ['vizier', 'great temple', 'ipi', 'seven short chapters', 'top bar', 'city page', 'drag a card', 'more', 'nilometer', 'pinching', 'cancelling a road']) expect([word, text.includes(word)]).toEqual([word, true]);
    for (const line of notes) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
    expect([RELEASES[1].new.length, RELEASES[1].fixed.length]).toEqual([7, 3]);
  });
  it('says nothing about rulings or tracks', () => {
    const text = [...RELEASES[1].new, ...RELEASES[1].fixed].join(' ').toLowerCase();
    expect([/ruling|track [a-z]\b|\b1[0-9]{3}\b/.test(text)]).toEqual([false]);
  });
});
