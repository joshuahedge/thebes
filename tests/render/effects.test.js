import { describe, it, expect } from '../harness.js';
import { createEffects, EFFECT_MS, prefersReducedMotion } from '../../src/render/effects.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt } from '../helpers/canvas.js';

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

function scene() {
  const c = makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  ctx.translate(100, 100);
  return { c, g: makeDraw(ctx, 2) };
}

describe('effects', () => {
  it('adds a puff that expires', () => {
    const fx = createEffects({ reducedMotion: false });
    fx.puff(3, 4, 1000);
    expect(fx.count(1000)).toBe(1);
    expect(fx.count(1000 + EFFECT_MS.puff - 1)).toBe(1);
    expect(fx.count(1000 + EFFECT_MS.puff + 1)).toBe(0);
  });
  it('turns sim events into glows, pulses and labels', () => {
    const w = makeTestWorld();
    const h = addRaw(w, 'house', 5, 5, { tier: 2, residents: 8 });
    const milestones = [];
    const fx = createEffects({ reducedMotion: false, onMilestone: (id) => milestones.push(id) });
    fx.fromEvents(w, [
      { type: 'upgrade', id: h.id, from: 1, to: 2 },
      { type: 'downgrade', id: h.id, from: 3, to: 2 },
      { type: 'milestone', id: 'town' },
      { type: 'arrivals', count: 5 },
      { type: 'upgrade', id: 9999, from: 1, to: 2 },
    ], 0);
    const live = fx.active(0);
    expect(live.filter((e) => e.kind === 'glow').length).toBe(1);
    expect(live.filter((e) => e.kind === 'pulse').length).toBe(1);
    expect(live.filter((e) => e.kind === 'label').map((e) => e.text)).toEqual(['+Shack', '−Cottage']);
    expect(milestones).toEqual(['town']);
    expect(prefersReducedMotion() === true || prefersReducedMotion() === false).toBe(true);
  });
  it('keeps labels but drops puffs, glows and pulses under reduced motion', () => {
    const w = makeTestWorld();
    const h = addRaw(w, 'house', 0, 0, { tier: 2, residents: 8 });
    const fx = createEffects({ reducedMotion: true });
    fx.puff(1, 1, 0);
    fx.fromEvents(w, [{ type: 'upgrade', id: h.id, from: 1, to: 2 }], 0);
    const live = fx.active(0);
    expect(live.length).toBe(1);
    expect(live[0].kind).toBe('label');
    const { c, g } = scene();
    fx.draw(g, 100);
    const early = inked(c);
    const { c: c2, g: g2 } = scene();
    fx.draw(g2, 900);
    expect(early).toBeGreaterThan(0);
    expect(fx.labelLift(0.5)).toBe(0);
    expect(createEffects({ reducedMotion: false }).labelLift(0.5)).toBeGreaterThan(0);
    expect(inked(c2)).toBeGreaterThan(0);
  });
  it('draws puffs, glows and pulses with ink and prunes them afterwards', () => {
    const fx = createEffects({ reducedMotion: false });
    fx.puff(0, 0, 0);
    fx.glow(0, 0, 0);
    fx.pulse(0, 0, 0);
    const { c, g } = scene();
    fx.draw(g, 200);
    expect(inked(c)).toBeGreaterThan(20);
    fx.draw(g, 5000);
    expect(fx.count(5000)).toBe(0);
  });
});
