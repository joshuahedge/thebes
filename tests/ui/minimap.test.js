import { describe, it, expect } from '../harness.js';
import { createMinimap } from '../../src/ui/minimap.js';
import { createCamera } from '../../src/render/camera.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { pixelAt } from '../helpers/canvas.js';

describe('ui minimap', () => {
  it('draws terrain, buildings, the view outline and alert pins on a square map', () => {
    const w = riverWorld();
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const mm = createMinimap({ world: w, cam, view: () => ({ width: 400, height: 300 }), size: 128, dpr: 1 });
    expect(mm.canvas.width).toBe(128);
    mm.render([{ code: 'no_road', id: Object.values(w.buildings).find((b) => b.type === 'well').id }]);
    const scale = 128 / 32;
    const water = pixelAt(mm.canvas, 4 * scale + 2, 8 * scale + 2);
    expect(water[2]).toBeGreaterThan(water[0]);
    const meadow = pixelAt(mm.canvas, 15 * scale + 2, 21 * scale + 2);
    expect(meadow[1]).toBeGreaterThan(meadow[0]);
    const road = pixelAt(mm.canvas, 25 * scale + 2, 12 * scale + 2);
    expect(road[0]).toBeGreaterThan(180);
    expect(mm.tileFromPoint(4 * scale + 1, 8 * scale + 1)).toEqual({ x: 4, y: 8 });
    expect(mm.tileFromPoint(-5, 999)).toEqual({ x: 0, y: 31 });
  });
});
