// Version 10.0, Track L (final review L-2, ruling 2328): the festival-crowd scene shows a real festival day: the doubled procession out and the
// onlookers lining its road, no card open, the camera on the first working temple's road at zoom 1.2.
import { describe, it, expect } from '../../harness.js';
import { devScene } from '../../../src/dev/scenes.js';
import { festivalOn } from '../../../src/render/walkers.js';
import { bootAt, SAMPLE_CITY } from '../m/helpers.js';

describe('v100 l festival scene: a festival day with a procession and onlookers', () => {
  it('returns 16 or more procession figures and onlookers above 0, with the festival on, no offer waiting and the camera zoom 1.2', async () => {
    const r = await bootAt(SAMPLE_CITY, 390, 844, 100);
    try {
      const said = await devScene(r.api, 'festival-crowd', { quick: true });
      const m = /(\d+) procession figures, (\d+) onlookers/.exec(said);
      expect(Boolean(m)).toBe(true);
      expect(Number(m[1]) >= 16 && Number(m[2]) > 0).toBe(true);
      const g = r.api.game();
      expect(festivalOn(g.world)).toBe(true);
      expect(g.world.cityEvents.waiting === null || g.world.cityEvents.waiting === undefined).toBe(true);
      expect(g.cam.zoom).toBe(1.2);
    } finally { r.cleanup(); }
  });
});
