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
import { visibleTileRange } from '../../../src/render/camera.js';
import { walkersAt } from '../../../src/render/walkers.js';

// Fix wave (ruling 2296): life's added cost at night, measured against the light alone on ONE warm renderer. The night frame's extra cost is the light
// pass's software raster (drawLight, 5 to 9 ms), which life does not make; an absolute bound set on a frame without the light fails on the light. So two
// layers (light alone; light and every source) take turns drawing the same camera path in blocks of `per` frames (A B B A A B ...: counterbalanced, so
// a slow stretch of the machine falls on both), and life's cost is the difference of the two medians, which the machine's load moves together.
// -> { lightP50, lifeP50, added, jsP50, lifeMs } (lifeMs: LIFE's own mean a frame over the with-life blocks).
export function pairedLifeCost({ world, kind, renderer, flush, view, cam, at = () => 0, blocks = 6, per = 100, warm = 40 }) {
  const lightLayer = lifeLayer(world, kind, true, { lightOnly: true }), fullLayer = lifeLayer(world, kind, true);
  const x0 = cam.x;
  let n = 0;
  const frame = (layer) => {
    const i = n++; cam.x = x0 + at(i);
    const t = world.day + i / 60, now = 1000 + i * 17, range = visibleTileRange(cam, view, world.size);
    return renderer.renderFrame(world, cam, { view, now, ...layer.hooks(t, now, range, walkersAt(world, t, range)) });
  };
  for (let i = 0; i < warm; i++) { frame(i % 2 ? fullLayer : lightLayer); flush(); }
  const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const r1 = (v) => Math.round(v * 10) / 10;
  const order = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0];   // 0: light alone, 1: light and life
  const all = [[], []], js = [[], []]; let lifeSum = 0, lifeFrames = 0;
  for (let b = 0; b < blocks; b++) {
    const which = order[b % order.length], layer = which ? fullLayer : lightLayer;
    for (let i = 0; i < per; i++) {
      const l0 = layer.ms(), t0 = performance.now();
      frame(layer);
      const t1 = performance.now();
      flush();
      const t2 = performance.now();
      js[which].push(t1 - t0); all[which].push(t2 - t0);
      if (which) { lifeSum += layer.ms() - l0; lifeFrames++; }
    }
  }
  lightLayer.done(); fullLayer.done();
  const lightP50 = q(all[0], 0.5), lifeP50 = q(all[1], 0.5);
  return { lightP50: r1(lightP50), lifeP50: r1(lifeP50), added: r1(lifeP50 - lightP50), jsP50: r1(q(js[1], 0.5)), lifeMs: Math.round(lifeSum / lifeFrames * 100) / 100 };
}

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
