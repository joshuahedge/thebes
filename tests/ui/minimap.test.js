import { describe, it, expect } from '../harness.js';
import { createMinimap } from '../../src/ui/minimap.js';
import { createCamera } from '../../src/render/camera.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { pixelAt } from '../helpers/canvas.js';
import { createSheets, criticalFirst } from '../../src/ui/sheets.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { openSheet } from '../../src/ui/modes.js';
import { alertText } from '../../src/ui/text.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { mount } from '../helpers/dom.js';

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

  it('lists the alerts first on phones, criticals first in the banner\'s rank, and keeps the map first on wide screens (ruling 167)', () => {
    const { root, cleanup } = mount('<section id="sheet"></section>');
    try {
      const world = makeTestWorld();
      const farm = addRaw(world, 'farm_grain', 2, 8, { blocked: 'no_storage' });
      const potter = addRaw(world, 'potter', 4, 8);
      const list = [{ code: 'no_storage', id: farm.id }, { code: 'debt' }, { code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 90 }, { code: 'fire', id: potter.id }, { code: 'fire_risk', id: potter.id }];
      expect(criticalFirst(list).map((a) => a.code)).toEqual(['fire', 'raid_warning', 'debt', 'no_storage', 'fire_risk']);   // the rest keep their order
      const store = createStore({ ...INITIAL_UI_STATE, layout: 'portrait' });
      const minimap = { canvas: document.createElement('canvas'), render() {}, tileFromPoint: () => ({ x: 0, y: 0 }) };
      const cameraControl = { panTo() {}, zoomStep() {}, centre: () => ({ x: 0, y: 0 }) };
      createSheets({ container: root.querySelector('#sheet'), store, world, placement: null, cameraControl, minimap, getAlerts: () => list });
      store.set(openSheet(store.get(), 'minimap'));
      const order = () => [...root.querySelectorAll('#sheet .body > *')].map((n) => n.className || n.tagName.toLowerCase());
      const titles = () => [...root.querySelectorAll('#sheet .alert-list strong')].map((n) => n.textContent);
      expect(order()).toEqual(['h3', 'alert-list', 'minimap-wrap', 'actions']);
      expect(titles()).toEqual(criticalFirst(list).map((a) => alertText(a, world).title));
      store.set({ layout: 'wide' });
      expect(order()).toEqual(['minimap-wrap', 'actions', 'h3', 'alert-list']);
      expect(titles()).toEqual(list.map((a) => alertText(a, world).title));
    } finally { cleanup(); }
  });
});
