// Version 10.0, Track L (L.5, spec 5d, rulings 2215-2218): builders on a rising building's scaffold (render/v90/scaffold.js: a building placed, a home
// going up a tier, a look changing). The monuments' builders are drawn with their gangs (render/monuments.js buildersLayout), inside drawMonument's
// own budget; these are walkers, one on each of the poles at the footprint's front corners and, on a building bigger than 2x2, one more carrying
// bricks to them: LIFE.buildersPerSite (2 or 4). They climb their pole and back on game time (so they hold while paused), hammering at the top, and
// fade with the poles over their last share. None on a paused building. Gentle: each stands half way up his pole; Still: none. Source 'idle' (the
// townsfolk's share), ids from LIFE_IDS.builders. Not in the lesson.
//   buildersAt(world, timeDays, nowMs, range, motion) -> walker entries
import { LIFE } from '../../data/ambient.js';
import { ART, slotFor } from '../art/registry.js';
import { scaffoldsAt, poleHeight, SCAFFOLD } from '../v90/scaffold.js';
import { LIFE_IDS } from './life.js';
import { clamp01 } from './lifeCommon.js';

export const RISING = { roundDays: 0.6, top: 0.8 };   // a climb up and down takes roundDays; he reaches top x the poles' height

export function buildersAt(world, timeDays, nowMs, range, motion) {
  if (motion === 'still' || !range || !world || !world.buildings || world.lesson) return [];
  const out = [];
  for (const site of scaffoldsAt(world, range)) {
    const { b, t } = site;
    if (!site.on || b.paused) continue;
    const def = ART[slotFor(b, world)], h = poleHeight(def ? def.height : 12) * RISING.top;
    const n = b.w * b.d <= 4 ? LIFE.buildersPerSite[0] : LIFE.buildersPerSite[1];
    const alpha = t > 1 - SCAFFOLD.fadeShare ? clamp01((1 - t) / SCAFFOLD.fadeShare) : 1;
    const corners = [[b.x + 0.06, b.y + b.d + 0.06], [b.x + b.w + 0.06, b.y + b.d + 0.06], [b.x + b.w + 0.06, b.y + 0.06]];
    for (let i = 0; i < n; i++) {
      const id = LIFE_IDS.builders + (b.id % 49999) * 4 + i;
      if (i >= 3) {                                                              // the fourth carries bricks from in front of the site to the middle pole
        const ph = motion === 'full' ? (((timeDays / RISING.roundDays) % 1) + 1) % 1 : 0.5, u = ph < 0.5 ? ph * 2 : 2 - ph * 2;
        const [cx, cy] = corners[1];
        out.push({ id, kind: 'builder', x: cx + 0.7 - 0.6 * u, y: cy + 0.2, dir: ph < 0.5 ? 3 : 1, stand: motion !== 'full', alpha });
        continue;
      }
      const [x, y] = corners[i === 1 ? 2 : i === 2 ? 1 : 0];                     // the left pole and the right, then the front
      const ph = motion === 'full' ? (((timeDays / RISING.roundDays + i * 0.37) % 1) + 1) % 1 : 0.25;
      const up = ph < 0.5 ? ph * 2 : 2 - ph * 2, atTop = up > 0.85 && motion === 'full';
      out.push({ id, kind: atTop ? 'builder_hammer' : 'builder_climb', x, y, dir: i === 1 ? 3 : 1, stand: true, lift: Math.round(h * up), alpha });
    }
  }
  return out;
}

// The life source (createUI registers it): in the townsfolk's share of the budget ('idle'), not in the lesson.
export function buildersSource() {
  return { name: 'idle', lessonOk: false, walkers: buildersAt };
}
