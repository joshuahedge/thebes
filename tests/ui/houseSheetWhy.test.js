import { describe, it, expect } from '../harness.js';
import { createSheets } from '../../src/ui/sheets.js';
import { createMinimap } from '../../src/ui/minimap.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { showMeTarget } from '../../src/ui/goalsList.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { canPlace, demolishAt } from '../../src/sim/commands.js';
import { updateMood } from '../../src/sim/mood.js';
import { goalById, triggerEventGoals } from '../../src/sim/goals.js';
import { categoryOfItem } from '../../src/data/ui.js';
import { createCamera, tileToScreen } from '../../src/render/camera.js';
import { T, NEED_NAMES, CAUSE_TEXT, MOOD_NAMES, residentsLabel } from '../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

// The sheets on their own, with a road along y = 10 and Show me recorded instead of acted on.
function rig() {
  const { root, cleanup } = mount();
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  const store = createStore(INITIAL_UI_STATE);
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const shown = [];
  const sheets = createSheets({
    container: root, store, world, placement: createPlacement({ world, store }),
    cameraControl: createCameraControl({ cam, view, reducedMotion: () => true }),
    minimap: createMinimap({ world, cam, view, size: 100 }), getAlerts: () => alertsFor(world), onShowMe: (t) => shown.push(t),
  });
  return { root, world, store, sheets, shown, cleanup };
}
const rowFor = (root, need) => [...root.querySelectorAll('.checklist li')].find((li) => li.querySelector('.name').textContent === NEED_NAMES[need]);

describe('ui house sheet why', () => {
  it('words every cause in plain English with the reach the sim uses, and names the mood rows', () => {
    expect(CAUSE_TEXT.no_road.cause).toBe('No road beside it');
    expect(CAUSE_TEXT.no_well.cause).toBe('No working well within 5 road tiles');
    expect(CAUSE_TEXT.bazaar_empty.cause).toBe('The bazaar has no grain');
    expect(CAUSE_TEXT.next_delivery.cause).toBe('Food arrives at the next delivery');
    for (const code of ['no_road', 'no_well', 'no_bazaar', 'bazaar_empty', 'next_delivery', 'no_temple']) expect(CAUSE_TEXT[code].cause.length).toBeGreaterThan(0);
    for (const code of ['no_road', 'no_well', 'no_bazaar', 'bazaar_empty', 'no_temple']) expect(CAUSE_TEXT[code].fix.length).toBeGreaterThan(0);
    expect(MOOD_NAMES).toEqual({ base: 'Starting mood', food: 'Food', jobs: 'Jobs', debt: 'Debt' });
    expect(categoryOfItem('bazaar')).toBe('services');
    expect(categoryOfItem('granary')).toBe('food');
    expect(categoryOfItem('nothing')).toBe(null);
  });
  it('gives each checklist row a mark, the need and a status in words, and a missing need its cause, fix and Show me', () => {
    const r = rig();
    try {
      const hut = addRaw(r.world, 'house', 28, 9, { tier: 1, residents: 4 });   // no well anywhere
      r.store.set(select(r.store.get(), hut.id));
      const road = rowFor(r.root, 'road');
      expect(road.querySelector('.status').textContent).toBe(T.hasIt);
      expect(road.textContent).toContain('✓');
      expect(road.querySelector('.show-me')).toBe(null);
      const water = rowFor(r.root, 'water');
      expect(water.querySelector('.status').textContent).toBe(T.missing);
      expect(water.textContent).toContain('No working well within 5 road tiles');
      expect(water.textContent).toContain(CAUSE_TEXT.no_well.fix);
      fire(water.querySelector('.show-me'), 'click');
      expect(r.shown).toEqual([{ category: 'services', item: 'well', x: 28.5, y: 9.5 }]);
      const meter = r.root.querySelector('.residents [role="img"]');
      expect(meter.getAttribute('aria-label')).toBe(residentsLabel(4, 5));
      expect(r.root.textContent).toContain('4 of 5');
    } finally { r.cleanup(); }
  });
  it("points an empty bazaar's Show me at a granary beside that bazaar, and offers none while food is on its way", () => {
    const r = rig();
    try {
      addRaw(r.world, 'well', 15, 11);
      const bazaar = addRaw(r.world, 'bazaar', 9, 11);
      staffAll(r.world);
      const shack = addRaw(r.world, 'house', 12, 9, { tier: 2, residents: 8 });
      r.store.set(select(r.store.get(), shack.id));
      let food = rowFor(r.root, 'food');
      expect(food.textContent).toContain(CAUSE_TEXT.bazaar_empty.cause);
      fire(food.querySelector('.show-me'), 'click');
      expect(r.shown).toEqual([{ category: 'food', item: 'granary', x: 10, y: 12 }]);
      bazaar.store.grain = 40;
      r.sheets.render();
      food = rowFor(r.root, 'food');
      expect(food.textContent).toContain(CAUSE_TEXT.next_delivery.cause);
      expect(food.querySelector('.show-me')).toBe(null);
    } finally { r.cleanup(); }
  });
  it('reads the mood rows in plain English', () => {
    const r = rig();
    try {
      updateMood(r.world);
      r.store.set(openSheet(r.store.get(), 'summary'));
      const labels = [...r.root.querySelectorAll('.row')].map((row) => row.firstChild.textContent);
      expect(labels).toContain(MOOD_NAMES.base);
      expect(labels).toContain(MOOD_NAMES.food);
      expect(labels.includes('base')).toBe(false);
    } finally { r.cleanup(); }
  });
  it('aims an event goal at the building in trouble, and a goal with nowhere to point at the focus', () => {
    const world = makeTestWorld();
    setRoad(world, 0, 20, 31, 20);
    expect(showMeTarget(world, goalById('fix_bazaar'))).toEqual({ x: world.focus.x, y: world.focus.y });   // no empty bazaar yet
    addRaw(world, 'bazaar', 4, 21);
    staffAll(world);
    expect(showMeTarget(world, goalById('fix_bazaar'))).toEqual({ x: 5, y: 22 });
    expect(goalById('out_of_debt').showMe).toBe(null);
    expect(showMeTarget(world, goalById('out_of_debt'))).toEqual({ x: world.focus.x, y: world.focus.y });
  });
  it("in the game, the house sheet's Show me starts placing a well with its ghost on a free tile beside the home", async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const hut = addRaw(r.world, 'house', 28, 9, { tier: 1, residents: 4 });   // out of reach of the rig's well at (15, 11)
      r.store.set(select(r.store.get(), hut.id));
      const water = [...r.root.querySelectorAll('#sheet .checklist li')].find((li) => li.textContent.includes(NEED_NAMES.water));
      expect(water.textContent).toContain('No working well within 5 road tiles');
      fire(water.querySelector('.show-me'), 'click');
      const s = r.store.get();
      expect(s.sheet).toBe(null);
      expect(s.mode).toBe('placing');
      expect(s.tool).toEqual({ kind: 'building', type: 'well' });
      expect(s.category).toBe('services');
      expect(Math.abs(s.ghost.x - 28) <= 2 && Math.abs(s.ghost.y - 9) <= 2).toBe(true);
      expect(canPlace(r.world, 'well', s.ghost.x, s.ghost.y).ok).toBe(true);
    } finally { r.cleanup(); }
  });
  it("sends goal Show me the same way: the goal's next missing building, an event goal's building, the summary for debt", async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.goals.completed.push('road', 'plots', 'well');
      demolishAt(r.world, 6, 11);                                   // no granary: it is the food goal's next building
      r.ui.refresh();
      fire(r.root.querySelector('#goals .show-me'), 'click');
      expect(r.store.get().tool).toEqual({ kind: 'building', type: 'granary' });
      expect(r.store.get().category).toBe('food');
      r.ui.placement.cancel();
      triggerEventGoals(r.world);                                   // the rig's bazaar is staffed and empty
      expect(r.world.goals.triggered).toContain('fix_bazaar');
      r.ui.refresh();
      fire(r.root.querySelector('#goals .show-me'), 'click');
      const g = r.store.get().ghost;
      expect(r.store.get().tool.type).toBe('granary');
      expect(Math.abs(g.x - 9) <= 3 && Math.abs(g.y - 11) <= 3).toBe(true);   // beside the bazaar at (9, 11)
      expect(canPlace(r.world, 'granary', g.x, g.y).ok).toBe(true);
      r.ui.placement.cancel();
      r.world.goals.completed.push('fix_bazaar');
      r.world.gold = -30;
      triggerEventGoals(r.world);
      r.ui.refresh();
      fire(r.root.querySelector('#goals .show-me'), 'click');
      expect(r.store.get().sheet.kind).toBe('summary');
      expect(typeof r.ui.showMeAt).toBe('function');
    } finally { r.cleanup(); }
  });

  // Show me never leaves the ghost off screen (Task 8 review): the camera centres the place, then moves the least
  // that brings the ghost into the map the placing chrome leaves free. Here every plot beside the road is taken
  // from x = 7 to 18, so the nearest fit for a well at the homes is six tiles east, and a plain pan to the target
  // would put it past the right edge of a phone.
  function crowdAroundHomes(world) {
    for (const y of [9, 11]) for (let x = 7; x <= 18; x++) if (!world.occ[y * world.size + x]) addRaw(world, 'house', x, y);
  }
  const FREE = { left: 48, right: 390 - 48, top: 48 + 48, bottom: 844 - 240 - 48 };   // the phone's placing insets plus keepVisible's 48 px margin
  const inFree = (p) => p.x >= FREE.left && p.x <= FREE.right && p.y >= FREE.top && p.y <= FREE.bottom;
  it('Show me keeps its ghost inside the free map when the nearest fit is several tiles from the target', async () => {
    for (const motion of ['reduced', 'tween']) {
      const r = await rigUI({ width: 390, height: 844 });
      try {
        crowdAroundHomes(r.world);
        if (motion === 'tween') r.ui.settings.set({ reducedMotion: 'off' });
        const target = { category: 'services', item: 'well', x: 13, y: 9.5 };
        const plain = tileToScreen({ x: target.x, y: target.y, zoom: 1 }, { width: 390, height: 844 }, 19.5, 9.5);
        expect(plain[0] > 390).toBe(true);                                      // a pan to the target alone would leave the ghost's centre off the phone
        r.ui.showMeAt(target);
        if (motion === 'tween') { expect(r.ui.cameraControl.animating).toBe(true); r.ui.cameraControl.tick(1e6); }
        const g = r.store.get().ghost;
        expect(r.store.get().tool.type).toBe('well');
        expect(g).toEqual({ x: 19, y: 9 });
        expect(canPlace(r.world, 'well', g.x, g.y).ok).toBe(true);
        expect(inFree(r.screenOf(g.x + 0.5, g.y + 0.5))).toBe(true);            // the ghost is on screen, clear of the top bar and the confirm bar
        const t = r.screenOf(target.x, target.y);                               // and the target was not abandoned for it
        expect(t.x >= 0 && t.x <= 390 && t.y >= 48 && t.y <= 844 - 240).toBe(true);
      } finally { r.cleanup(); }
    }
  });
  it('Show me centres the target when the ghost is already in view', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.showMeAt({ category: 'services', item: 'well', x: 13, y: 9.5 });
      const centre = r.screenOf(13, 9.5);
      expect(Math.abs(centre.x - 195) < 1 && Math.abs(centre.y - 422) < 1).toBe(true);   // nothing needed nudging: the target sits mid-screen
    } finally { r.cleanup(); }
  });
});
