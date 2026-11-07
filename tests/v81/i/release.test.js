// Version 8.1 integration: the release entry, the version constant, and 8.0 carrying its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v81 i release: Version 8.1 "The vizier"', () => {
  it('is the fifth entry with its merge commit (8.4, 8.3, 8.2.1 and 8.2 are newer), and 8.0 carries its own', () => {
    expect([APP_VERSION, RELEASES[4].version, RELEASES[4].date, RELEASES[4].title, RELEASES[4].build]).toEqual(['8.4', '8.1', '2026-10-26', 'The vizier', 'ad57f92']);   // Version 8.4: four newer entries
    expect([RELEASES[5].version, RELEASES[5].build]).toEqual(['8.0', '702481b']);
  });
  it('names what changed in the words a player would look for, each note one plain sentence', () => {
    const notes = [...RELEASES[4].new, ...RELEASES[4].fixed];
    const text = notes.join(' ').toLowerCase();
    for (const word of ['vizier', 'great temple', 'ipi', 'seven short chapters', 'top bar', 'city page', 'drag a card', 'more', 'nilometer', 'pinching', 'cancelling a road']) expect([word, text.includes(word)]).toEqual([word, true]);
    for (const line of notes) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
    expect([RELEASES[4].new.length, RELEASES[4].fixed.length]).toEqual([7, 3]);
  });
  it('says nothing about rulings or tracks', () => {
    const text = [...RELEASES[4].new, ...RELEASES[4].fixed].join(' ').toLowerCase();
    expect([/ruling|track [a-z]\b|\b1[0-9]{3}\b/.test(text)]).toEqual([false]);
  });
});
