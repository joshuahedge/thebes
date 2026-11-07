// Version 8.2 "Song of the Nile": the release entry, the version constant, and 8.1 carrying its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { PIECES } from '../../../src/data/pieces.js';
import { MUSIC } from '../../../src/audio/music.js';

describe('v82 m release: Version 8.2 "Song of the Nile"', () => {
  it('is the fourth entry with its merge commit (8.4, 8.3 and 8.2.1 are newer), and 8.1 carries its own', () => {
    expect([APP_VERSION, RELEASES[3].version, RELEASES[3].date, RELEASES[3].title, RELEASES[3].build]).toEqual(['8.4', '8.2', '2026-10-26', 'Song of the Nile', 'c4bff18']);   // Version 8.4: 8.2 keeps its merge commit
    expect([RELEASES[4].version, RELEASES[4].build]).toEqual(['8.1', 'ad57f92']);
  });
  it('says what changed in the words a player would look for, as the music has it, each note one plain sentence', () => {
    const notes = [...RELEASES[3].new, ...RELEASES[3].fixed];
    const text = notes.join(' ').toLowerCase();
    for (const word of ['seven short pieces', 'harp', 'low flute', 'warm pad', 'one to four minutes', 'differently every time', 'season', 'danger music', 'softer and lower', 'high plucked note']) expect([word, text.includes(word)]).toEqual([word, true]);
    // The words match the music: seven pieces, each named, and gaps of one to four minutes.
    expect([PIECES.length, MUSIC.gap[0], MUSIC.gap[1]]).toEqual([7, 60, 240]);
    for (const p of PIECES) expect([p.name, text.includes(p.name.toLowerCase().replace('lullaby for the workers\' village', 'lullaby'))]).toEqual([p.name, true]);
    for (const line of notes) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
    expect([RELEASES[3].new.length, RELEASES[3].fixed.length]).toEqual([6, 6]);   // the integration added the Oasis, the preview and the fixes (tests/v82/i/release.test.js)
  });
  it('says nothing about rulings or tracks', () => {
    const text = [...RELEASES[3].new, ...RELEASES[3].fixed].join(' ').toLowerCase();
    expect([/ruling|track [a-z]\b|\b1[0-9]{3}\b/.test(text)]).toEqual([false]);
  });
});
