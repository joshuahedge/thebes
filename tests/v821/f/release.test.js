// Version 8.2.1 "Easier ferries": What's new names the change in the game's own words; 8.2 keeps its merge commit. Version 8.3: 8.2.1 is the third entry and keeps its own (87b5ec3); Version 8.4: 8.3 is the second.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';

describe('v821 f release: What\'s new for 8.2.1', () => {
  it('is the third entry with its merge commit, and says pick a crossing, the road it brings and the forgiving drag', () => {
    const r = RELEASES[6], text = [...r.new, ...r.fixed].join(' ');
    expect([RELEASES[5].version, r.version, r.title, r.build, RELEASES[7].version, RELEASES[7].build]).toEqual(['8.3', '8.2.1', 'Easier ferries', '87b5ec3', '8.2', 'c4bff18']);
    for (const words of ['shows the best crossings near your roads', 'tap one, then ✓', 'short road', 'snaps to the nearest crossing', 'Show me', 'bazaar no longer says it has no food'])expect([words, text.includes(words)]).toEqual([words, true]);
  });
});
