// Version 6.0 docs: What's new has 6.0 "A harder Nile" and names what the game now does. Version 6.0.1: the newest entry is 6.0.1 with the running build, 6.0 has its merge
// commit (01da086) and 5.0 its own.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v60 docs releases', () => {
  it('the newest entry is 6.0.1 with the running build, and 6.0 and 5.0 carry their merge commits', () => {
    expect([RELEASES[0].version, RELEASES[0].build, APP_VERSION]).toEqual(['6.0.1', 'live', '6.0.1']);
    expect([RELEASES[1].version, RELEASES[1].title, RELEASES[1].build]).toEqual(['6.0', 'A harder Nile', '01da086']);
    expect([RELEASES[2].version, RELEASES[2].build]).toEqual(['5.0', '486006a']);
  });
  it('names the features of the version', () => {
    const notes = RELEASES[1].new.join(' ');
    for (const word of ['court', 'demands', 'Great Capital', 'great work', 'chieftain', 'Plague', 'low Nile', 'warning', 'Large plots', 'guided first city', 'Huge', 'Desktop keys', 'Sound is on']) {
      expect([word, notes.includes(word)]).toEqual([word, true]);
    }
  });
  it('6.0.1 says the dangers ease while the great temple rises, and the offering fix', () => {
    const notes = [...RELEASES[0].new, ...RELEASES[0].fixed].join(' ');
    for (const word of ['great temple rises', 'no plague, low Nile, locusts or blight', 'Raids and fire', 'offering']) expect([word, notes.includes(word)]).toEqual([word, true]);
  });
});
