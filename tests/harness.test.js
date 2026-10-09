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
  it('toEqual fails for different Sets', () => {
    let threw = false;
    try { expect(new Set([1])).toEqual(new Set([2])); } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });
  it('toEqual fails for different Maps', () => {
    let threw = false;
    try { expect(new Map([['a', 1]])).toEqual(new Map([['a', 2]])); } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });
  it('toEqual treats an undefined-valued key as a difference', () => {
    let threw = false;
    try { expect({ a: undefined }).toEqual({}); } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });
  it('toEqual tells NaN apart from null', () => {
    let threw = false;
    try { expect(NaN).toEqual(null); } catch (e) { threw = true; }
    expect(threw).toBe(true);
  });
  it('toEqual passes for equal Sets, Maps and nested structures', () => {
    expect(new Set([1, 2])).toEqual(new Set([2, 1]));
    expect(new Map([['a', { x: 1 }]])).toEqual(new Map([['a', { x: 1 }]]));
    expect({ s: new Set([{ id: 1 }]), m: new Map([[1, [2]]]) }).toEqual({ s: new Set([{ id: 1 }]), m: new Map([[1, [2]]]) });
  });
});
