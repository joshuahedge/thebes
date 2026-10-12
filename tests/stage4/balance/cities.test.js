import { describe, it, expect } from '../../harness.js';
import { buildSampleCity, buildStressCity, SHOWCASE_STYLE } from '../../../src/dev/sampleCity.js';
import { createWorld, allBuildings, isFinished, isSite } from '../../../src/sim/world.js';
import { isWorking } from '../../../src/sim/labour.js';
import { touchesRoad } from '../../../src/sim/reach.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { PALACE_STYLES } from '../../../src/data/palace.js';
import { TITLE_SEED } from '../../../src/data/ui.js';
import { driftPoints, showcaseFrame, showcaseBox } from '../../../src/ui/titleCard.js';
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

  it('frames the showcase in the band the title card leaves free, on short phones and laptops too, and drifts only round it', () => {
    const w = buildSampleCity(createWorld({ seed: TITLE_SEED }));
    const shown = ['obelisk_small', 'colossus', 'palace'].map((t) => of(w, t)[0]);
    // the card as the title's styles lay it out: at the top of a phone held upright, at the right of one held sideways,
    // in the middle of a wider screen (360 px wide, 440 sideways)
    const cardFor = (width, height) => {
      if (height < 480 && width > height) return { left: width - 12 - 440, right: width - 12, top: 8, bottom: height - 8 };
      if (height <= 900 && height > width) return { left: (width - Math.min(360, width - 32)) / 2, right: (width + Math.min(360, width - 32)) / 2, top: 12, bottom: Math.min(height - 16, 556) };
      return { left: (width - 360) / 2, right: (width + 360) / 2, top: (height - 540) / 2, bottom: (height + 540) / 2 };
    };
    for (const [width, height] of [[390, 844], [375, 667], [360, 640], [844, 390], [667, 375], [1024, 768], [1280, 800], [1366, 768]]) {
      const view = { width, height }, card = cardFor(width, height), frame = showcaseFrame(showcaseBox(w), view, card);
      const points = driftPoints(w, frame, view);
      for (const [x, y] of points) {
        for (const b of shown) {
          const [sx, sy] = tileToScreen(createCamera({ x, y, zoom: frame.zoom }), view, b.x + b.w / 2, b.y + b.d / 2);
          const clear = sx < card.left || sx > card.right || sy < card.top || sy > card.bottom;
          expect([width, height, b.type, sx > 0 && sx < width && sy > 0 && sy < height, clear]).toEqual([width, height, b.type, true, true]);
        }
      }
    }
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
