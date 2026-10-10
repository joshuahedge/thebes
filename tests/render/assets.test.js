import { describe, it, expect } from '../harness.js';
import { ASSETS, renderIcon, renderOgImage, renderAsset } from '../../tools/assets.js';

const px = (c, x, y) => [...c.getContext('2d').getImageData(x, y, 1, 1).data];
const distinct = (c, points) => new Set(points.map(([x, y]) => px(c, x, y).join(','))).size;

describe('render assets', () => {
  it('draws the icons with the temple in the middle, maskable ones full-bleed, and the 1200x630 preview', () => {
    expect(ASSETS.map((a) => a.name)).toEqual(['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'og-image.png']);
    const icon = renderIcon({ size: 192 });
    expect([icon.width, icon.height]).toEqual([192, 192]);
    expect(px(icon, 96, 96)[3]).toBe(255);
    expect(px(icon, 1, 1)[3]).toBe(0);                                       // rounded corners are clear
    expect(distinct(icon, [[96, 60], [96, 96], [96, 130], [40, 96], [150, 96]])).toBeGreaterThan(2);
    // the temple is framed by its measured ink, so its ink fills most of the icon's width
    const data = icon.getContext('2d').getImageData(0, 0, 192, 192).data;
    let x0 = 192, x1 = -1;
    for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) {
      const k = (y * 192 + x) * 4, rgb = `${data[k]},${data[k + 1]},${data[k + 2]}`;
      if (data[k + 3] > 0 && rgb !== '243,231,203' && rgb !== '220,201,160') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }   // not parchment, not the ground band
    }
    expect(x1 - x0 + 1).toBeGreaterThan(0.6 * 192);
    const mask = renderIcon({ size: 512, maskable: true });
    expect(px(mask, 1, 1)[3]).toBe(255);                                      // full-bleed for the mask
    expect(px(mask, 1, 1).slice(0, 3)).toEqual(px(mask, 510, 1).slice(0, 3));   // the same ground right across the top edge
    const apple = renderAsset(ASSETS[3]);
    expect([apple.width, apple.height]).toEqual([180, 180]);
    expect(px(apple, 1, 1)[3]).toBe(255);                                     // iOS wants an opaque square
    const og = renderOgImage();
    expect([og.width, og.height]).toEqual([1200, 630]);
    expect(distinct(og, [[100, 100], [600, 300], [1100, 500], [300, 400], [900, 150]])).toBeGreaterThan(3);
    expect(px(og, 2, 2)[3]).toBe(255);
  });
  it('serves the committed files at their sizes', async () => {
    for (const a of ASSETS) {
      const r = await fetch(`/${a.name}`);
      expect(r.status).toBe(200);
      const bmp = await createImageBitmap(await r.blob());
      expect([a.name, bmp.width, bmp.height]).toEqual([a.name, a.width, a.height]);
    }
  });
});
