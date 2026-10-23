// Version 6.0 Track B2: the moments of a raid the sim's events draw: a building struck, wrecked, looted. Full draws them moving, Gentle fades them in place,
// Still has none (a loot label, which only fades, is at every level and names what the event says was taken).
import { describe, it, expect } from '../../harness.js';
import { createEffects, EFFECT_MS, lootLabel } from '../../../src/render/effects.js';
import { RAID_FX } from '../../../src/data/battle.js';
import { GOODS } from '../../../src/data/goods.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { makeBuilding, insertBuilding, removeBuilding } from '../../../src/sim/world.js';
import { makeCanvas } from '../../helpers/canvas.js';

const kinds = (fx, now) => fx.active(now).map((e) => e.kind);
function drawn(fx, now, world) {
  const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1);
  const calls = [];
  for (const k of ['line', 'circ', 'ell', 'radial', 'poly', 'text']) { const f = g[k]; g[k] = (...a) => { calls.push({ k, a }); return f(...a); }; }
  fx.draw(g, now, world);
  return calls;
}

// A wrecked storehouse as strikes.js leaves it: the building gone, a rubble per tile that remembers it, and the events of the day.
function wrecked(w) {
  const b = addRaw(w, 'storehouse', 10, 10, { store: { grain: 30, pottery: 12 } });
  removeBuilding(w, b.id);
  const was = { type: 'storehouse', x: 10, y: 10, w: 2, d: 2, rot: 0, day: w.day, cause: 'wreck' };
  const to = [[10, 10], [11, 10], [10, 11], [11, 11]].map(([x, y]) => { const r = makeBuilding(w, 'rubble', x, y); r.was = { ...was }; return insertBuilding(w, r).id; });
  return { id: b.id, to };
}

describe('v60 b2 effects raid events', () => {
  it('draws a strike on the struck building: sparks and dust under Full, one ring under Gentle, nothing under Still', () => {
    const w = makeTestWorld({ fertile: [] });
    const b = addRaw(w, 'potter', 10, 10);
    for (const [motion, want] of [['full', ['strike']], ['gentle', ['strike']], ['still', []]]) {
      const fx = createEffects({ motionLevel: motion });
      fx.fromEvents(w, [{ type: 'raid_strike', id: b.id, stolen: 5 }], 1000);
      expect([motion, kinds(fx, 1000)]).toEqual([motion, want]);
    }
    const full = createEffects({ motionLevel: 'full' }), gentle = createEffects({ motionLevel: 'gentle' });
    for (const fx of [full, gentle]) fx.fromEvents(w, [{ type: 'raid_strike', id: b.id, stolen: 5 }], 1000);
    const lines = (fx) => drawn(fx, 1000 + RAID_FX.strike / 3, w).filter((c) => c.k === 'line').length;
    expect([lines(full) >= 9, lines(gentle)]).toEqual([true, 0]);                                  // strokes of sparks, against a ring
    expect(drawn(gentle, 1000 + RAID_FX.strike / 3, w).filter((c) => c.k === 'circ').length).toBe(1);
    expect(kinds(full, 1000 + RAID_FX.strike)).toEqual([]);                                        // over in under a second
    expect(EFFECT_MS.strike).toBe(RAID_FX.strike);
    const fx = createEffects({ motionLevel: 'full' });
    fx.fromEvents(w, [{ type: 'raid_strike', id: 999999 }], 0);                                    // a building no longer there: nothing
    expect(kinds(fx, 0)).toEqual([]);
  });

  it('draws a wreck as dust over the old footprint, found from the rubble that remembers it, and not under Still', () => {
    const w = makeTestWorld({ fertile: [] });
    const { id, to } = wrecked(w);
    for (const [motion, want] of [['full', ['wreck']], ['gentle', ['wreck']], ['still', []]]) {
      const fx = createEffects({ motionLevel: motion });
      fx.fromEvents(w, [{ type: 'raid_wreck', id, kind: 'storehouse', to }], 2000);
      expect([motion, kinds(fx, 2000)]).toEqual([motion, want]);
    }
    const full = createEffects({ motionLevel: 'full' });
    full.fromEvents(w, [{ type: 'raid_wreck', id, kind: 'storehouse', to }], 2000);
    expect([full.active(2000)[0].x, full.active(2000)[0].y, full.active(2000)[0].w]).toEqual([11, 11, 2]);   // the middle of the 2x2
    expect(drawn(full, 2000 + 500, w).filter((c) => c.k === 'circ').length).toBe(8);               // a ring of dust puffs
    const gentle = createEffects({ motionLevel: 'gentle' });
    gentle.fromEvents(w, [{ type: 'raid_wreck', id, kind: 'storehouse', to }], 2000);
    const g = drawn(gentle, 2000 + 500, w);
    expect([g.filter((c) => c.k === 'circ').length, g.filter((c) => c.k === 'radial').length]).toEqual([0, 1]);   // one soft disc, in place
    expect(kinds(full, 2000 + RAID_FX.wreck)).toEqual([]);
    const none = createEffects({ motionLevel: 'full' });
    none.fromEvents(w, [{ type: 'raid_wreck', id, kind: 'storehouse', to: [] }], 0);               // no rubble to find: nothing to draw
    expect(kinds(none, 0)).toEqual([]);
  });

  it('draws sacks lifting off a looted store and a label of what was taken, which is the event\'s own goods', () => {
    const w = makeTestWorld({ fertile: [] });
    const b = addRaw(w, 'storehouse', 10, 10, { store: {} });
    const goods = { pottery: 12, grain: 30, linen: 3 };
    for (const [motion, want] of [['full', ['loot', 'label']], ['gentle', ['loot', 'label']], ['still', ['label']]]) {
      const fx = createEffects({ motionLevel: motion });
      fx.fromEvents(w, [{ type: 'raid_loot', id: b.id, goods }], 3000);
      expect([motion, kinds(fx, 3000)]).toEqual([motion, want]);
    }
    expect(lootLabel(goods)).toBe(`−30 ${GOODS.grain.name.toLowerCase()}, −12 ${GOODS.pottery.name.toLowerCase()}`);   // the two largest, largest first
    expect(lootLabel({ clay: 5 })).toBe(`−5 ${GOODS.clay.name.toLowerCase()}`);
    expect(lootLabel({})).toBe('');
    const fx = createEffects({ motionLevel: 'full' });
    fx.fromEvents(w, [{ type: 'raid_loot', id: b.id, goods }], 3000);
    expect(fx.active(3000).find((e) => e.kind === 'label').text).toBe(lootLabel(goods));
    expect(fx.active(3000).find((e) => e.kind === 'loot').n).toBe(3);                              // a sack for each good, at most three
    const sacks = (now) => drawn(fx, now, w).filter((c) => c.k === 'ell' && c.a[3] === '#C9A66B');
    expect(sacks(3000).length).toBe(3);
    const rise = (now) => Math.min(...sacks(now).map((c) => c.a[0][1]));
    expect(rise(3000 + RAID_FX.loot * 0.6)).toBeLessThan(rise(3000) - 4);                          // Full: they lift
    const still = createEffects({ motionLevel: 'gentle' });
    still.fromEvents(w, [{ type: 'raid_loot', id: b.id, goods }], 3000);
    const at = (now) => drawn(still, now, w).filter((c) => c.k === 'ell' && c.a[3] === '#C9A66B').map((c) => c.a[0]);
    expect(at(3000 + RAID_FX.loot * 0.6)).toEqual(at(3000));                                       // Gentle: they stay where they are, and fade
    const nothing = createEffects({ motionLevel: 'full' });
    nothing.fromEvents(w, [{ type: 'raid_loot', id: b.id, goods: {} }], 0);
    expect(kinds(nothing, 0)).toEqual([]);
  });

  it('finds a looted store that the same strike wrecked from the wreck in the same batch', () => {
    const w = makeTestWorld({ fertile: [] });
    const { id, to } = wrecked(w);
    const fx = createEffects({ motionLevel: 'full' });
    fx.fromEvents(w, [{ type: 'raid_wreck', id, kind: 'storehouse', to }, { type: 'raid_loot', id, goods: { grain: 9 } }, { type: 'raid_strike', id }], 5000);
    expect(kinds(fx, 5000).sort()).toEqual(['label', 'loot', 'wreck']);                            // the strike on a building that is gone draws nothing of its own
    const label = fx.active(5000).find((e) => e.kind === 'label');
    expect([label.x, label.y]).toEqual([11, 11]);
  });
});
