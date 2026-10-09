import { describe, it, expect } from './harness.js';

describe('harness', () => {
  it('compares primitives with toBe', () => {
    expect(1 + 1).toBe(2);
  });
  it('compares structures with toEqual', () => {
    expect({ a: [1, 2], b: { c: 'x' } }).toEqual({ a: [1, 2], b: { c: 'x' } });
  });
  it('reports a failed expectation by throwing', () => {
    let threw = false;
    try { expect(1).toBe(2); } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });
  it('supports numeric comparisons and toContain', () => {
    expect(5).toBeGreaterThan(4);
    expect(5).toBeGreaterThanOrEqual(5);
    expect(3).toBeLessThan(4);
    expect(3).toBeLessThanOrEqual(3);
    expect([1, 2, 3]).toContain(2);
    expect('hello').toContain('ell');
  });
  it('supports toThrow', () => {
    expect(() => { throw new Error('boom'); }).toThrow();
  });
});
