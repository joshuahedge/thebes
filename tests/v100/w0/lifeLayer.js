// The merge of Track L (ruling 2253): life's layer on a world as createUI wires it, Full motion, for the frame tests (tests/v100/w0/phoneFrame.test.js,
// tests/v90/v/budget.test.js's Huge frame): createLife with the device's kind and its six sources (townsfolk and night with the device's caps), the
// light drawn (night's doors and hearths read the light the frame shows), its loop's clock set to the morning (the crowds and townsfolk out) or the
// middle of the night. hooks(t, now, range, walkers) -> the renderFrame opts the game passes (life's walkers after the rest, the ground and late
// hooks, the light, a storm's lean); ms() the LIFE time spent so far (createLife's own measure); done() puts the world's light clock back.
// shed: false (the default) holds every source on, the strict case: createLife's frame clock stands still, so its dropper never accounts a frame and
// never sheds a source (a lone slow frame, a collection or the machine's load, would shed the crowd for the rest of the run and leave it out of the
// measure); true runs the dropper as the game does, on the frame's own clock.
import { createLife } from '../../../src/render/v100/life.js';
import { townsfolkSource } from '../../../src/render/v100/townsfolk.js';
import { crowdSource } from '../../../src/render/v100/crowd.js';
import { riverSource } from '../../../src/render/v100/riverLife.js';
import { buildersSource } from '../../../src/render/v100/builders.js';
import { nightSource } from '../../../src/render/v100/night.js';
import { weatherSource, stormLean } from '../../../src/render/v100/weather.js';
import { drawLight, setLightClock } from '../../../src/render/light.js';
import { LIGHT } from '../../../src/data/seasons.js';

// lightOnly: no source registered (the light alone, the control that tells life's share of the night frame from the light's).
export function lifeLayer(world, kind, night = false, { shed = false, lightOnly = false } = {}) {
  let frameNow = 0;
  const life = createLife({ deviceKind: kind, level: () => 'full', now: () => (shed ? frameNow : 0) });
  if (!lightOnly) for (const s of [townsfolkSource({ deviceKind: kind }), buildersSource(), crowdSource(), riverSource(), nightSource({ deviceKind: kind }), weatherSource()]) life.addSource(s);
  setLightClock(world, night ? LIGHT.cycleMs * (LIGHT.day + LIGHT.dusk + LIGHT.night / 2) : LIGHT.cycleMs * LIGHT.day * 0.1);
  return {
    life,
    hooks(t, now, range, walkers) {
      frameNow = now;
      return {
        walkers: [...walkers, ...life.walkers(world, t, now, range, 'full')], motion: 'full', lean: stormLean(world, now, 'full'),
        ambient: (g, r) => life.ground(g, world, r, now, 'full'),
        light: (g, r, fr) => drawLight(g, world, r, fr, now, 'full', null),
        fire: (g, r) => life.late(g, world, r, now, 'full'),
      };
    },
    ms: () => Object.values(life.stats().spentBy).reduce((a, b) => a + b, 0),
    done: () => setLightClock(world, 0),
  };
}
