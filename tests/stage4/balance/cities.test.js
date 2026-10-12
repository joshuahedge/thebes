import { describe, it, expect } from '../../harness.js';
import { buildSampleCity, buildStressCity, SHOWCASE_STYLE } from '../../../src/dev/sampleCity.js';
import { createWorld, allBuildings, isFinished, isSite } from '../../../src/sim/world.js';
import { isWorking } from '../../../src/sim/labour.js';
import { touchesRoad } from '../../../src/sim/reach.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { PALACE_STYLES } from '../../../src/data/palace.js';
import { TITLE_SEED } from '../../../src/data/ui.js';
import { driftPoints } from '../../../src/ui/titleCard.js';
import { createCamera, tileToScreen } from '../../../src/render/camera.js';

const of = (w, type) => allBuildings(w).filter((b) => b.type === type);
// Where a building's middle lands on a screen of a size, with the camera on a tile at zoom 1.
const screenAt = (b, [x, y], width, height) => tileToScreen(createCamera({ x, y, zoom: 1 }), { width, height }, b.x + b.w / 2, b.y + b.d / 2);
const STALL_CODES = ['site_stalled', 'understaffed', 'no_road'];

describe('s4 balance cities', () => {
  it('gives the sample city a finished small obelisk, a colossus under way with its crews at work and a palace in its third style, under the title card where the backdrop first looks', () => {
    expect(PALACE_STYLES[SHOWCASE_STYLE].id).toBe('pylons');
    for (const seed of [TITLE_SEED, 1, 7]) {
      const w = buildSampleCity(createWorld({ seed }));
      const [ob] = of(w, 'obelisk_small'), [co] = of(w, 'colossus'), [pal] = of(w, 'palace');
      expect([seed, isFinished(ob), isSite(co), co.site.course, pal.style]).toEqual([seed, true, true, 3, SHOWCASE_STYLE]);
      expect([seed, ob.site.done < w.day - 30]).toEqual([seed, true]);          // finished months ago: no dedication walking
      expect([seed, co.site.crews.length, co.site.crews.every((id) => isWorking(w, w.buildings[id]))]).toEqual([seed, 2, true]);
      expect([seed, [ob, co, pal].every((b) => touchesRoad(w, b))]).toEqual([seed, true]);
      const first = driftPoints(w)[0];                                           // under the title card (its foot is at about 80%)
      for (const [width, height] of [[1280, 800], [390, 844]]) {
        for (const b of [ob, co, pal]) {
          const [sx, sy] = screenAt(b, first, width, height);
          expect([seed, width, b.type, sx > 0 && sx < width && sy > 0.8 * height && sy < height]).toEqual([seed, width, b.type, true]);
        }
      }
      expect([seed, alertsFor(w).filter((a) => STALL_CODES.includes(a.code))]).toEqual([seed, []]);
    }
    const village = buildSampleCity(createWorld({ seed: 1 }), { stageTwoDays: 0 });
    expect(['obelisk_small', 'colossus', 'palace'].map((t) => of(village, t).length)).toEqual([0, 0, 0]);   // a Stage 1 village has none
  });

  it('builds the title backdrop, monuments and palace included, well inside a second', () => {
    const started = performance.now();
    buildSampleCity(createWorld({ seed: TITLE_SEED }));
    expect(performance.now() - started).toBeLessThan(1000);                     // about 300-450 ms on a laptop
  });

  it('puts three monument sites, part way up with their crews at work, in the middle of the stress city', () => {
    const w = buildStressCity(createWorld({ seed: 3 }));
    const sites = allBuildings(w).filter(isSite);
    expect(sites.map((b) => b.type).sort()).toEqual(['colossus', 'mastaba_large', 'pyramid_great']);
    for (const b of sites) {
      expect([b.type, b.site.course > 0, b.site.crews.length > 0, b.site.crews.every((id) => isWorking(w, w.buildings[id])), touchesRoad(w, b)]).toEqual([b.type, true, true, true, true]);
    }
    expect(of(w, 'builders_guild').length).toBe(6);
  });
});
