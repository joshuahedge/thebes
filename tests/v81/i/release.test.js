// Version 8.1 integration: the release entry, the version constant, and 8.0 carrying its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v81 i release: Version 8.1 "The vizier"', () => {
  it('is the newest entry with the running build, and 8.0 carries its merge commit', () => {
    expect([APP_VERSION, RELEASES[0].version, RELEASES[0].date, RELEASES[0].title, RELEASES[0].build]).toEqual(['8.1', '8.1', '2026-10-26', 'The vizier', 'live']);
    expect([RELEASES[1].version, RELEASES[1].build]).toEqual(['8.0', '702481b']);
  });
  it('names what changed in the words a player would look for, each note one plain sentence', () => {
    const notes = [...RELEASES[0].new, ...RELEASES[0].fixed];
    const text = notes.join(' ').toLowerCase();
    for (const word of ['vizier', 'great temple', 'ipi', 'seven short chapters', 'top bar', 'city page', 'drag a card', 'more', 'nilometer', 'pinching', 'cancelling a road']) expect([word, text.includes(word)]).toEqual([word, true]);
    for (const line of notes) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
    expect([RELEASES[0].new.length, RELEASES[0].fixed.length]).toEqual([7, 3]);
  });
  it('says nothing about rulings or tracks', () => {
    const text = [...RELEASES[0].new, ...RELEASES[0].fixed].join(' ').toLowerCase();
    expect([/ruling|track [a-z]\b|\b1[0-9]{3}\b/.test(text)]).toEqual([false]);
  });
});
