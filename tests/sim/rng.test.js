import { describe, it, expect } from '../harness.js';
import { createRng, hash2, valueNoise } from '../../src/sim/rng.js';

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42), b = createRng(42);
    const sa = [a.next(), a.next(), a.next()];
    const sb = [b.next(), b.next(), b.next()];
    expect(sa).toEqual(sb);
  });
  it('produces different sequences for different seeds', () => {
    expect(createRng(1).next() === createRng(2).next()).toBe(false);
  });
  it('keeps next() within [0,1) and int(n) within [0,n)', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(5);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(5);
      expect(Number.isInteger(n)).toBe(true);
    }
  });
  it('resumes exactly from a saved state', () => {
    const r = createRng(99);
    r.next(); r.next();
    const saved = r.getState();
    const expected = [r.next(), r.next()];
    const r2 = createRng(0);
    r2.setState(saved);
    expect([r2.next(), r2.next()]).toEqual(expected);
  });
  it('hash2 is deterministic and within [0,1)', () => {
    expect(hash2(3, 4, 5)).toBe(hash2(3, 4, 5));
    for (let x = 0; x < 20; x++) {
      const v = hash2(x, x * 3, 11);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('valueNoise is within [0,1] and smooth between neighbours', () => {
    for (let x = 0; x < 30; x++) {
      const a = valueNoise(x, 10, 3, 8), b = valueNoise(x + 1, 10, 3, 8);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      expect(Math.abs(a - b)).toBeLessThan(0.35);
    }
  });
});
