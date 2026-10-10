import { describe, it, expect } from '../harness.js';
import { createSheets } from '../../src/ui/sheets.js';
import { createMinimap } from '../../src/ui/minimap.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { createCamera } from '../../src/render/camera.js';
import { T, alertText } from '../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

function rig() {
  const { root, cleanup } = mount();
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  const farm = addRaw(world, 'farm_grain', 2, 11, { blocked: 'no_storage' });   // as produceDay would mark it with no granary in reach
  const house = addRaw(world, 'house', 12, 11, { tier: 2, residents: 8 });
  addRaw(world, 'well', 13, 9);
  staffAll(world);
  const store = createStore(INITIAL_UI_STATE);
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: () => true });
  const log = [];
  const sheets = createSheets({
    container: root, store, world, placement: createPlacement({ world, store }), cameraControl,
    minimap: createMinimap({ world, cam, view, size: 100 }), getAlerts: () => alertsFor(world),
    onView: (a) => log.push(['view', a.code]), afterCommand: (e) => log.push(e.kind),
    custom: { menu: (body) => { body.textContent = 'menu here'; } },
  });
  return { root, world, farm, house, store, cam, sheets, log, cleanup };
}

describe('ui sheets', () => {
  it('shows a building with workers, reach, problems and View, and can pause or demolish it', () => {
    const r = rig();
    r.store.set(select(r.store.get(), r.farm.id));
    expect(r.root.hidden).toBe(false);
    expect(r.root.querySelector('h2').textContent).toBe('Grain farm');
    expect(r.root.textContent).toContain('10 of 10');
    expect(r.root.textContent).toContain('12 road tiles');
    const problem = alertText({ code: 'no_storage', id: r.farm.id }, r.world);
    expect(r.root.textContent).toContain(problem.title);
    fire(r.root.querySelector('.problem .view'), 'click');
    expect(r.log[0]).toEqual(['view', 'no_storage']);
    fire(r.root.querySelector('.pause'), 'click');
    expect(r.farm.paused).toBe(true);
    expect(r.root.querySelector('.pause').textContent).toBe(T.resume);
    fire(r.root.querySelector('.demolish'), 'click');
    expect(r.world.buildings[r.farm.id]).toBe(undefined);
    expect(r.store.get().sheet).toBe(null);
    expect(r.log.map((e) => (Array.isArray(e) ? e[0] : e))).toEqual(['view', 'pause', 'demolish']);
    r.cleanup();
  });
  it('shows a home with its checklist, timers and residents', () => {
    const r = rig();
    r.store.set(select(r.store.get(), r.house.id));
    expect(r.root.querySelector('h2').textContent).toBe('Shack');
    expect(r.root.textContent).toContain('8 of 8');
    const items = [...r.root.querySelectorAll('.checklist li')].map((li) => li.textContent);
    expect(items.some((t) => t.includes('Road access') && t.includes('✓'))).toBe(true);
    expect(items.some((t) => t.includes('Food') && t.includes('✕'))).toBe(true);
    r.house.downTimer = 1;
    r.house.residents = 0; r.house.tier = 0;
    r.sheets.render();
    expect(r.root.textContent).toContain(T.emptyPlot);
    r.cleanup();
  });
  it('shows the summary, the minimap with zoom buttons and alerts, and custom sheets', () => {
    const r = rig();
    r.store.set(openSheet(r.store.get(), 'summary'));
    expect(r.root.textContent).toContain(T.taxes);
    expect(r.root.textContent).toContain(T.goalsLater);
    r.store.set(openSheet(r.store.get(), 'minimap'));
    expect(r.root.querySelector('canvas')).toBeTruthy();
    fire(r.root.querySelector('.zoom-in'), 'click');
    expect(r.cam.zoom).toBeGreaterThan(1);
    expect(r.root.querySelectorAll('.alert-list .view').length).toBeGreaterThan(0);
    fire(r.root.querySelector('canvas'), 'click', { clientX: r.root.querySelector('canvas').getBoundingClientRect().left + 50, clientY: r.root.querySelector('canvas').getBoundingClientRect().top + 50 });
    expect(Math.abs(r.cam.x - 16.5) < 2 && Math.abs(r.cam.y - 16.5) < 2).toBe(true);
    r.store.set(openSheet(r.store.get(), 'menu'));
    expect(r.root.textContent).toContain('menu here');
    fire(r.root.querySelector('.close'), 'click');
    expect(r.store.get().sheet).toBe(null);
    expect(r.root.hidden).toBe(true);
    r.cleanup();
  });
});
