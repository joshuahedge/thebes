// Version 6.0 docs: the newest entry in What's new is 6.0 "A harder Nile", it names what the game now does, and 5.0 has its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v60 docs releases', () => {
  it('the newest entry is 6.0 with the running build, and 5.0 carries its merge commit', () => {
    expect([RELEASES[0].version, RELEASES[0].title, RELEASES[0].build, APP_VERSION]).toEqual(['6.0', 'A harder Nile', 'live', '6.0']);
    expect([RELEASES[1].version, RELEASES[1].build]).toEqual(['5.0', '2653e92']);
  });
  it('names the features of the version', () => {
    const notes = RELEASES[0].new.join(' ');
    for (const word of ['court', 'demands', 'Great Capital', 'great work', 'chieftain', 'Plague', 'low Nile', 'warning', 'Large plots', 'guided first city', 'Huge', 'Desktop keys', 'Sound is on']) {
      expect([word, notes.includes(word)]).toEqual([word, true]);
    }
  });
});
