import { describe, it, expect } from '../../harness.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeBuilding } from '../../../src/sim/world.js';
import { withLooks, homeVariant, serviceState, slotFor, EXPANDED } from '../../../src/render/art/registry.js';
import { boundsFor } from '../../../src/render/iso.js';

describe('v93 w0 slots: the look, the variant and the state in a slot key', () => {
  it('expands one entry into look x variant x state keys, each drawing with its own opt', () => {
    const seen = [];
    const table = { 'fake.a': { w: 1, d: 1, height: 10, bounds: boundsFor(1, 1, 10), shadows: [], draw: (g, x, y, opt) => seen.push(opt) } };
    const out = withLooks(table, { variants: 3, states: true });
    EXPANDED.delete('fake.a');
    const keys = Object.keys(out);
    expect(keys.length).toBe(36);
    expect(keys).toContain('fake.a.v1.l2.shut');
    out['fake.a.v2.l3.short'].draw(null, 0, 0);
    expect(seen).toEqual([{ look: 3, variant: 2, state: 'short' }]);
  });
  it('lets an entry give its own bounds for each look', () => {
    const table = { 'fake.b': { w: 1, d: 1, height: 10, bounds: [0, 0, 1, 1], boundsFor: (look) => [0, 0, 10 + look, 1], shadows: [], draw() {} } };
    const out = withLooks(table);
    EXPANDED.delete('fake.b');
    expect(Object.keys(out)).toEqual(['fake.b.l0', 'fake.b.l1', 'fake.b.l2', 'fake.b.l3']);
    expect(out['fake.b.l3'].bounds).toEqual([0, 0, 13, 1]);
  });
  it('gives a home a stable variant that spreads over 0..2', () => {
    const w = makeTestWorld({ size: 64 });
    const counts = [0, 0, 0];
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
      const b = makeBuilding(w, 'house', x, y);
      expect(homeVariant(b)).toBe(homeVariant(b));
      counts[homeVariant(b)]++;
    }
    for (const c of counts) expect(c >= 20).toBe(true);
  });
  it('reads a service state off its staffing', () => {
    const w = makeTestWorld();
    const k = makeBuilding(w, 'bazaar', 3, 3);   // a bazaar has workers
    k.staff = 0; expect(serviceState(k)).toBe('shut');
    k.staff = 1; expect(serviceState(k)).toBe('short');
    k.staff = 99; expect(serviceState(k)).toBe('work');
    k.paused = true; expect(serviceState(k)).toBe('shut');
  });
  it('keeps today\'s key for a type no track has expanded, and adds suffixes once it is', () => {
    const w = makeTestWorld(); w.milestone = 'capital'; w.splits.capital = 0; w.day = 1000;
    const h = makeBuilding(w, 'house', 5, 5); h.tier = 3;
    // Version 9.3 (Track H): homes are expanded now, so the test borrows a made-up type for the unexpanded half
    const fake = { type: 'fake_unexpanded', x: 5, y: 5, w: 1, d: 1 };
    expect(slotFor(fake, w)).toBe('fake_unexpanded');
    EXPANDED.set('fake_unexpanded', { looks: true, variants: 3, states: false });
    const v = homeVariant(fake);
    expect(slotFor(fake, w)).toBe(`fake_unexpanded.v${v}.l3`);
    EXPANDED.delete('fake_unexpanded');
    expect(slotFor(fake, w)).toBe('fake_unexpanded');
    expect(slotFor(h, w)).toBe(`house.t3.v${homeVariant(h)}.l3`);
  });
});
