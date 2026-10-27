// Version 6.0 docs: What's new has 6.0 "A harder Nile" and names what the game now does. Version 6.0.1: 6.0 has its merge
// commit (01da086) and 5.0 its own. Version 7.0: 7.0 was the newest entry and 6.0.1 has its merge commit (4502f53). Version 7.1: the newest entry is 7.1 with the running build, and 7.0 has its merge commit (16cda04).
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v60 docs releases', () => {
  it('6.0.1, 6.0 and 5.0 carry their merge commits (Versions 7.0, 7.1 and 7.1.1 are newer)', () => {
    expect([RELEASES[0].version, RELEASES[0].build, APP_VERSION]).toEqual(['8.3', 'live', '8.3']);
    expect([RELEASES[8].version, RELEASES[8].build]).toEqual(['6.0.1', '4502f53']);
    expect([RELEASES[9].version, RELEASES[9].title, RELEASES[9].build]).toEqual(['6.0', 'A harder Nile', '01da086']);
    expect([RELEASES[10].version, RELEASES[10].build]).toEqual(['5.0', '486006a']);
  });
  it('names the features of the version', () => {
    const notes = RELEASES[9].new.join(' ');
    for (const word of ['court', 'demands', 'Great Capital', 'great work', 'chieftain', 'Plague', 'low Nile', 'warning', 'Large plots', 'guided first city', 'Huge', 'Desktop keys', 'Sound is on']) {
      expect([word, notes.includes(word)]).toEqual([word, true]);
    }
  });
  it('6.0.1 says the dangers ease while the great temple rises, and the offering fix', () => {
    const notes = [...RELEASES[8].new, ...RELEASES[8].fixed].join(' ');
    for (const word of ['great temple rises', 'no plague, low Nile, locusts or blight', 'Raids and fire', 'offering']) expect([word, notes.includes(word)]).toEqual([word, true]);
  });
});
