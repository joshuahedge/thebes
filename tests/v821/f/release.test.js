// Version 8.2.1 "Easier ferries": What's new names the change in the game's own words; 8.2 keeps its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';

describe('v821 f release: What\'s new for 8.2.1', () => {
  it('is the newest entry, live, and says pick a crossing, the road it brings and the forgiving drag', () => {
    const r = RELEASES[0], text = [...r.new, ...r.fixed].join(' ');
    expect([APP_VERSION, r.version, r.title, r.build, RELEASES[1].version, RELEASES[1].build]).toEqual(['8.2.1', '8.2.1', 'Easier ferries', 'live', '8.2', 'c4bff18']);
    for (const words of ['shows the best crossings near your roads', 'tap one, then ✓', 'short road', 'snaps to the nearest crossing', 'Show me', 'bazaar no longer says it has no food'])expect([words, text.includes(words)]).toEqual([words, true]);
  });
});
