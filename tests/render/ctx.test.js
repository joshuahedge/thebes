import { describe, it, expect } from '../harness.js';
import { makeDraw, rgba } from '../../src/render/art/ctx.js';
import { WASH, TERRAIN, UI } from '../../src/render/art/palette.js';
import { makeCanvas, pixelAt, nearColour } from '../helpers/canvas.js';

const square = [[0, 0], [20, 0], [20, 20], [0, 20]];

describe('draw helper', () => {
  it('fills a polygon in art px scaled to device px', () => {
    const c = makeCanvas(100, 100);
    const g = makeDraw(c.getContext('2d'), 2);
    g.poly(square, '#2F6FA8');
    expect(nearColour(pixelAt(c, 20, 20), '#2F6FA8', 4)).toBe(true);
    expect(pixelAt(c, 60, 60)[3]).toBe(0);
  });
  it('honours fill alpha and the standard outline', () => {
    const c = makeCanvas(60, 60);
    const g = makeDraw(c.getContext('2d'), 1);
    g.poly(square, '#000000', { alpha: 0.5, outline: true });
    const a = pixelAt(c, 10, 10)[3];
    expect(a).toBeGreaterThan(100);
    expect(a).toBeLessThan(160);
    expect(pixelAt(c, 20, 10)[3]).toBeGreaterThan(0);
  });
  it('draws lines, circles, ellipses and quadratic paths', () => {
    const c = makeCanvas(60, 60);
    const g = makeDraw(c.getContext('2d'), 1);
    g.line([0, 30], [60, 30], '#C4473A', 2);
    g.circ([10, 10], 5, '#5E9E4A');
    g.ell([40, 10], 8, 4, '#E2B13C');
    g.path([['M', [0, 50]], ['Q', [30, 40], [60, 50]], ['L', [60, 60]], ['L', [0, 60]], ['Z']], '#7A5AA0');
    expect(nearColour(pixelAt(c, 30, 30), '#C4473A', 30)).toBe(true);
    expect(nearColour(pixelAt(c, 10, 10), '#5E9E4A', 4)).toBe(true);
    expect(nearColour(pixelAt(c, 40, 10), '#E2B13C', 4)).toBe(true);
    expect(nearColour(pixelAt(c, 30, 57), '#7A5AA0', 4)).toBe(true);
  });
  it('shades a face with the gradient and a soft radial blob', () => {
    const c = makeCanvas(60, 60);
    const g = makeDraw(c.getContext('2d'), 1);
    g.poly(square, WASH[1]);
    g.faceGrad(square);
    const top = pixelAt(c, 10, 1), bottom = pixelAt(c, 10, 19);
    expect(top[0] + top[1] + top[2]).toBeGreaterThan(bottom[0] + bottom[1] + bottom[2]);
    g.radial([40, 40], 15, 8, TERRAIN.plot);
    expect(pixelAt(c, 40, 40)[3]).toBe(255);
    expect(pixelAt(c, 54, 40)[3]).toBeLessThan(120);
  });
  it('draws text, domes and clips', () => {
    const c = makeCanvas(80, 80);
    const g = makeDraw(c.getContext('2d'), 2);
    g.text([20, 20], '✓', { size: 12, color: UI.ok });
    let inked = 0;
    for (let x = 20; x < 60; x += 2) for (let y = 20; y < 60; y += 2) if (pixelAt(c, x, y)[3] > 0) inked++;
    expect(inked).toBeGreaterThan(3);
    g.dome([30, 30], 8, 8.5, 4);
    expect(pixelAt(c, 60, 56)[3]).toBe(255);
    g.save();
    g.clip([[0, 0], [10, 0], [10, 10], [0, 10]]);
    g.poly(square, '#000000');
    g.restore();
    expect(pixelAt(c, 10, 10)[3]).toBe(255);
    expect(nearColour(pixelAt(c, 5, 5), '#000000', 4)).toBe(true);
  });
  it('converts hex to rgba', () => {
    expect(rgba('#2F6FA8', 0.5)).toBe('rgba(47,111,168,0.5)');
  });
});
