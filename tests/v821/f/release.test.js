// Version 8.2.1 "Easier ferries": What's new names the change in the game's own words; 8.2 keeps its merge commit. Version 8.3: 8.2.1 is the second entry and keeps its own (87b5ec3).
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';

describe('v821 f release: What\'s new for 8.2.1', () => {
  it('is the second entry with its merge commit, and says pick a crossing, the road it brings and the forgiving drag', () => {
    const r = RELEASES[1], text = [...r.new, ...r.fixed].join(' ');
    expect([RELEASES[0].version, r.version, r.title, r.build, RELEASES[2].version, RELEASES[2].build]).toEqual(['8.3', '8.2.1', 'Easier ferries', '87b5ec3', '8.2', 'c4bff18']);
    for (const words of ['shows the best crossings near your roads', 'tap one, then ✓', 'short road', 'snaps to the nearest crossing', 'Show me', 'bazaar no longer says it has no food'])expect([words, text.includes(words)]).toEqual([words, true]);
  });
});
