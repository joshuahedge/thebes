// Version 8.2 "Song of the Nile": the release entry, the version constant, and 8.1 carrying its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { PIECES } from '../../../src/data/pieces.js';
import { MUSIC } from '../../../src/audio/music.js';

describe('v82 m release: Version 8.2 "Song of the Nile"', () => {
  it('is the newest entry with the running build, and 8.1 carries its merge commit', () => {
    expect([APP_VERSION, RELEASES[0].version, RELEASES[0].date, RELEASES[0].title, RELEASES[0].build]).toEqual(['8.2', '8.2', '2026-10-26', 'Song of the Nile', 'live']);
    expect([RELEASES[1].version, RELEASES[1].build]).toEqual(['8.1', 'ad57f92']);
  });
  it('says what changed in the words a player would look for, as the music has it, each note one plain sentence', () => {
    const notes = [...RELEASES[0].new, ...RELEASES[0].fixed];
    const text = notes.join(' ').toLowerCase();
    for (const word of ['seven short pieces', 'harp', 'low flute', 'warm pad', 'one to four minutes', 'differently every time', 'season', 'danger music', 'softer and lower', 'high plucked note']) expect([word, text.includes(word)]).toEqual([word, true]);
    // The words match the music: seven pieces, each named, and gaps of one to four minutes.
    expect([PIECES.length, MUSIC.gap[0], MUSIC.gap[1]]).toEqual([7, 60, 240]);
    for (const p of PIECES) expect([p.name, text.includes(p.name.toLowerCase().replace('lullaby for the workers\' village', 'lullaby'))]).toEqual([p.name, true]);
    for (const line of notes) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
    expect([RELEASES[0].new.length, RELEASES[0].fixed.length]).toEqual([6, 6]);   // the integration added the Oasis, the preview and the fixes (tests/v82/i/release.test.js)
  });
  it('says nothing about rulings or tracks', () => {
    const text = [...RELEASES[0].new, ...RELEASES[0].fixed].join(' ').toLowerCase();
    expect([/ruling|track [a-z]\b|\b1[0-9]{3}\b/.test(text)]).toEqual([false]);
  });
});
