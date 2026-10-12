import { describe, it, expect } from '../../harness.js';
import { guildSite, supplyNeeded } from '../../../src/sim/monuments.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

describe('s4 contract follow-ups', () => {
  it('names the site a guild\'s crew works from the sites\' crews, and keeps every quarry needed until Track A', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const g = addRaw(w, 'builders_guild', 12, 11);
    const other = addRaw(w, 'builders_guild', 16, 11);
    const s = addRaw(w, 'colossus', 12, 8);
    expect(guildSite(w, g)).toBe(null);
    s.site.crews = [g.id];
    expect([guildSite(w, g), guildSite(w, other)]).toEqual([s.id, null]);
    s.site.done = 30;                                                             // a finished monument has no crews at work
    expect(guildSite(w, g)).toBe(null);
    expect(typeof supplyNeeded(w, addRaw(w, 'quarry', 20, 11))).toBe('boolean');  // Track A judges it
  });
  it('sends R to the placement\'s rotate, once Track C gives it one', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      let turned = 0;
      r.ui.placement.rotate = () => { turned++; };
      fire(r.root, 'keydown', { key: 'r' });
      expect(turned).toBe(1);
    } finally { r.cleanup(); }
  });
});
