// Version 8.1 integration: the release entry, the version constant, and 8.0 carrying its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v81 i release: Version 8.1 "The vizier"', () => {
  it('is the fourth entry with its merge commit (8.3, 8.2.1 and 8.2 are newer), and 8.0 carries its own', () => {
    expect([APP_VERSION, RELEASES[3].version, RELEASES[3].date, RELEASES[3].title, RELEASES[3].build]).toEqual(['8.3', '8.1', '2026-10-26', 'The vizier', 'ad57f92']);   // Version 8.3: three newer entries
    expect([RELEASES[4].version, RELEASES[4].build]).toEqual(['8.0', '702481b']);
  });
  it('names what changed in the words a player would look for, each note one plain sentence', () => {
    const notes = [...RELEASES[3].new, ...RELEASES[3].fixed];
    const text = notes.join(' ').toLowerCase();
    for (const word of ['vizier', 'great temple', 'ipi', 'seven short chapters', 'top bar', 'city page', 'drag a card', 'more', 'nilometer', 'pinching', 'cancelling a road']) expect([word, text.includes(word)]).toEqual([word, true]);
    for (const line of notes) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
    expect([RELEASES[3].new.length, RELEASES[3].fixed.length]).toEqual([7, 3]);
  });
  it('says nothing about rulings or tracks', () => {
    const text = [...RELEASES[3].new, ...RELEASES[3].fixed].join(' ').toLowerCase();
    expect([/ruling|track [a-z]\b|\b1[0-9]{3}\b/.test(text)]).toEqual([false]);
  });
});
