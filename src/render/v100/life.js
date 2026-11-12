// Version 10.0 (Track 0, rulings 2057-2059, 2101, 2102): the life layer's seam. Track L registers its sources here (townsfolk, the bazaar's crowd,
// river life, builders, lamps' flicker, the weather), each { name, walkers?, ground?, late? } with name one of LIFE.dropOrder's; createUI calls
// the three hooks once a frame: walkers(...) joins the walkers list after v70Walkers, ground(...) runs after the ambient ground layer, late(...)
// after the fire and late ambient layer. Every hook a source has is timed into the LIFE budget (LIFE.budgetMs by device), and over it the v90
// dropper (src/render/v90/dropper.js: a running average, a level held 2 s, one restored after 10 s under half the budget) drops the sources in
// LIFE.dropOrder. Under Still nothing is drawn and no walker is added. Nothing here writes the world: a source is a pure function of the world,
// the time and a hash.
//   createLife({ deviceKind, level, now, clock }) -> { sources, addSource, walkers, ground, late, spend, dropped, stats }
//     deviceKind 'desktop' | 'phone' (spriteCache.js DEVICE_KIND by default); level() the Motion level; now() the frame's clock in ms (a frame
//     is every call with the same now(): createUI passes its frame time); clock() the real clock, for timing the hooks.
import { LIFE } from '../../data/ambient.js';
import { createDropper } from '../v90/dropper.js';
import { DEVICE_KIND } from '../spriteCache.js';

// The life figures' ids (ruling 2101): the free band between wildlife (1400000 + below 600000) and the carts (3000000), 200000 each.
export const LIFE_IDS = { townsfolk: 2000000, river: 2200000, builders: 2400000, crowd: 2600000 };

export function createLife({ deviceKind = DEVICE_KIND, level = () => 'full', now = () => performance.now(), clock = () => performance.now() } = {}) {
  const sources = [];
  const budgetMs = LIFE.budgetMs[deviceKind] || LIFE.budgetMs.desktop;
  const dropper = createDropper({ budgetMs, order: LIFE.dropOrder });
  const spentBy = {};
  let frameAt = null, pending = 0;

  // A new frame (now() moved on) accounts the last one's total, so the dropper sees one figure a frame, whatever the number of hooks.
  function roll() {
    const t = now();
    if (frameAt === t) return;
    if (frameAt !== null) dropper.account(pending, frameAt);
    frameAt = t; pending = 0;
  }
  const still = (motion) => level() === 'still' || motion === 'still';
  function spend(name, ms) {
    roll();
    pending += ms;
    spentBy[name] = (spentBy[name] || 0) + ms;
  }
  // Runs one hook of every source that has it and is not dropped, each timed into the budget under its own name.
  // Version 10.0, Track L (L.9, spec 5h, ruling 2250): in the lesson only the sources that say lessonOk run (townsfolk, hearths, and the crowd behind its
  // own food-step gate), so the camera's subject stays the step.
  function each(hook, args, out = null) {
    roll();
    const world = hook === 'walkers' ? args[0] : args[1], lesson = Boolean(world && world.lesson);
    for (const s of sources) {
      if (typeof s[hook] !== 'function' || dropper.off(s.name) || (lesson && !s.lessonOk)) continue;
      const t0 = clock();
      const r = s[hook](...args);
      if (out && Array.isArray(r)) for (const e of r) out.push(e);
      spend(s.name, clock() - t0);
    }
    return out;
  }

  return {
    sources,
    // addSource({ name, walkers?, ground?, late? }), or addSource(name, { walkers?, ground?, late? }).
    addSource(source, hooks = null) {
      const s = typeof source === 'string' ? { name: source, ...(hooks || {}) } : source;
      if (!s || !LIFE.dropOrder.includes(s.name)) throw new Error(`life: a source's name is one of ${LIFE.dropOrder.join(', ')}, not ${s && s.name}`);
      sources.push(s);
      return s;
    },
    walkers(world, timeDays, nowMs, range, motion) {
      if (still(motion) || !sources.length) { roll(); return []; }
      return each('walkers', [world, timeDays, nowMs, range, motion], []);
    },
    ground(g, world, range, nowMs, motion) {
      if (still(motion) || !sources.length) { roll(); return; }
      each('ground', [g, world, range, nowMs, motion]);
    },
    late(g, world, range, nowMs, motion) {
      if (still(motion) || !sources.length) { roll(); return; }
      each('late', [g, world, range, nowMs, motion]);
    },
    spend,
    dropped(name) { roll(); return dropper.off(name); },
    stats: () => ({ sources: sources.length, budgetMs, ms: dropper.stats.ms, avg: dropper.stats.avg, dropped: dropper.stats.dropped.slice(), spentBy: { ...spentBy } }),
  };
}
