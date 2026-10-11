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
import { T, NEED_NAMES, CAUSE_TEXT, MOOD_NAMES, causeText, buildingName } from '../../src/ui/text.js';
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
  const shown = [], selected = [];
  const sheets = createSheets({
    container: root, store, world, placement: createPlacement({ world, store }),
    cameraControl: createCameraControl({ cam, view, reducedMotion: () => true }),
    minimap: createMinimap({ world, cam, view, size: 100 }), getAlerts: () => alertsFor(world), onShowMe: (t) => shown.push(t), onSelect: (id) => selected.push(id),
  });
  return { root, world, store, sheets, shown, selected, cleanup };
}
const rowFor = (root, need) => [...root.querySelectorAll('.checklist li')].find((li) => li.querySelector('.name').textContent === NEED_NAMES[need]);

describe('ui house sheet why', () => {
  it('words every cause in plain English with the reach the sim uses, and names the mood rows', () => {
    expect(CAUSE_TEXT.no_road.cause).toBe('No road beside it');
    expect(CAUSE_TEXT.no_well.cause).toBe('No well within 5 road tiles');
    expect(CAUSE_TEXT.no_bazaar.cause).toBe('No bazaar within 10 road tiles');
    expect(CAUSE_TEXT.no_temple.cause).toBe('No temple within 10 road tiles');
    expect(CAUSE_TEXT.bazaar_empty.cause).toBe('The bazaar has no grain');
    expect(CAUSE_TEXT.next_delivery.cause).toBe('Food arrives at the next delivery');
    for (const code of ['no_road', 'no_well', 'no_bazaar', 'bazaar_empty', 'next_delivery', 'no_temple']) expect(CAUSE_TEXT[code].cause.length).toBeGreaterThan(0);
    for (const code of ['no_road', 'no_well', 'no_bazaar', 'bazaar_empty', 'no_temple']) expect(CAUSE_TEXT[code].fix.length).toBeGreaterThan(0);
    expect(CAUSE_TEXT.bazaar_empty.fix).toBe('Build a granary within 16 road tiles of it');
    expect(CAUSE_TEXT.granary_empty).toEqual({ cause: 'Its granary is empty', fix: 'Grain farms fill granaries' });
    const world = makeTestWorld();
    const bazaar = addRaw(world, 'bazaar', 9, 11);
    expect(causeText({ code: 'bazaar_idle', id: bazaar.id }, world)).toEqual({ cause: 'The bazaar is short of workers', fix: 'More homes bring more workers' });
    bazaar.paused = true;
    expect(causeText({ code: 'bazaar_idle', id: bazaar.id }, world)).toEqual({ cause: 'The bazaar is paused', fix: 'Resume it' });
    expect(causeText({ code: 'no_road', id: null }, world)).toBe(CAUSE_TEXT.no_road);
    expect([MOOD_NAMES.base, MOOD_NAMES.food, MOOD_NAMES.jobs, MOOD_NAMES.debt]).toEqual(['Starting mood', 'Food', 'Jobs', 'Debt']);   // Stage 3 adds its danger rows
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
      expect(water.textContent).toContain('No well within 5 road tiles');
      expect(water.textContent).toContain(CAUSE_TEXT.no_well.fix);
      fire(water.querySelector('.show-me'), 'click');
      expect(r.shown).toEqual([{ category: 'services', item: 'well', x: 28.5, y: 9.5 }]);
      expect(r.root.querySelector('.residents .meter').getAttribute('aria-hidden')).toBe('true');   // the visible "4 of 5" carries it
      expect(r.root.querySelector('.residents [role="img"]')).toBe(null);
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
  it("names a provider that is in reach but not working, and offers View on it instead of building another", () => {
    const r = rig();
    try {
      addRaw(r.world, 'well', 15, 11);
      const bazaar = addRaw(r.world, 'bazaar', 9, 11);                  // in reach, no staff yet
      const shack = addRaw(r.world, 'house', 12, 9, { tier: 2, residents: 8 });
      r.store.set(select(r.store.get(), shack.id));
      let food = rowFor(r.root, 'food');
      expect(food.textContent).toContain('The bazaar is short of workers');
      expect(food.textContent).toContain('More homes bring more workers');
      expect(food.querySelector('.show-me')).toBe(null);
      const view = food.querySelector('.view');
      expect(view.textContent).toBe(T.view);
      expect(view.getAttribute('aria-label')).toBe(`${T.view}: ${buildingName('bazaar')}`);
      fire(view, 'click');
      expect(r.selected).toEqual([bazaar.id]);
      expect(r.shown).toEqual([]);
      bazaar.paused = true;
      r.sheets.render();
      food = rowFor(r.root, 'food');
      expect(food.textContent).toContain('The bazaar is paused');
      expect(food.textContent).toContain('Resume it');
    } finally { r.cleanup(); }
  });
  it('names a well, bazaar or temple beside the home that has no road, and offers View on it instead of building another', () => {
    expect(CAUSE_TEXT.well_no_road).toEqual({ cause: 'The well has no road', fix: 'Lay a road beside it' });
    expect(CAUSE_TEXT.bazaar_no_road).toEqual({ cause: 'The bazaar has no road', fix: 'Lay a road beside it' });
    expect(CAUSE_TEXT.temple_no_road).toEqual({ cause: 'The temple has no road', fix: 'Lay a road beside it' });
    const r = rig();
    try {
      const well = addRaw(r.world, 'well', 12, 7);                     // just above the home, nothing beside it but sand
      const bazaar = addRaw(r.world, 'bazaar', 14, 6);
      const shack = addRaw(r.world, 'house', 12, 9, { tier: 2, residents: 8 });
      r.store.set(select(r.store.get(), shack.id));
      const water = rowFor(r.root, 'water');
      expect(water.textContent).toContain('The well has no road');
      expect(water.textContent).toContain('Lay a road beside it');
      expect(water.querySelector('.show-me')).toBe(null);
      const view = water.querySelector('.view');
      expect(view.getAttribute('aria-label')).toBe(`${T.view}: ${buildingName('well')}`);
      fire(view, 'click');
      expect(r.selected).toEqual([well.id]);
      const food = rowFor(r.root, 'food');
      expect(food.textContent).toContain('The bazaar has no road');
      fire(food.querySelector('.view'), 'click');
      expect(r.selected).toEqual([well.id, bazaar.id]);
      expect(r.shown).toEqual([]);
    } finally { r.cleanup(); }
  });
  it('a paused well is named as paused, with Resume it and View', () => {
    const r = rig();
    try {
      const well = addRaw(r.world, 'well', 15, 11);
      well.paused = true;
      const shack = addRaw(r.world, 'house', 12, 9, { tier: 2, residents: 8 });
      r.store.set(select(r.store.get(), shack.id));
      const water = rowFor(r.root, 'water');
      expect(water.textContent).toContain('The well is paused');
      expect(water.textContent).toContain('Resume it');
      expect(water.querySelector('.show-me')).toBe(null);
      fire(water.querySelector('.view'), 'click');
      expect(r.selected).toEqual([well.id]);
    } finally { r.cleanup(); }
  });
  it("points an empty granary's Show me at a grain farm beside that granary", () => {
    const r = rig();
    try {
      addRaw(r.world, 'well', 15, 11);
      addRaw(r.world, 'bazaar', 9, 11);
      const granary = addRaw(r.world, 'granary', 4, 11);
      staffAll(r.world);
      const shack = addRaw(r.world, 'house', 12, 9, { tier: 2, residents: 8 });
      r.store.set(select(r.store.get(), shack.id));
      const food = rowFor(r.root, 'food');
      expect(food.textContent).toContain(CAUSE_TEXT.granary_empty.cause);
      expect(food.textContent).toContain(CAUSE_TEXT.granary_empty.fix);
      fire(food.querySelector('.show-me'), 'click');
      expect(r.shown).toEqual([{ category: 'food', item: 'farm_grain', x: granary.x + 1, y: granary.y + 1 }]);
    } finally { r.cleanup(); }
  });
  it('an empty granary that is paused or short of workers gets View, not a farm Show me', () => {
    const r = rig();
    try {
      addRaw(r.world, 'well', 15, 11);
      addRaw(r.world, 'bazaar', 9, 11);
      const granary = addRaw(r.world, 'granary', 4, 11);
      staffAll(r.world);
      const shack = addRaw(r.world, 'house', 12, 9, { tier: 2, residents: 8 });
      r.store.set(select(r.store.get(), shack.id));
      granary.paused = true;
      r.sheets.render();
      let food = rowFor(r.root, 'food');
      expect(food.textContent).toContain('The granary is paused');
      expect(food.textContent).toContain('Resume it');
      expect(food.querySelector('.show-me')).toBe(null);
      expect(food.querySelector('.view').getAttribute('aria-label')).toBe(`${T.view}: ${buildingName('granary')}`);
      fire(food.querySelector('.view'), 'click');
      expect(r.selected).toEqual([granary.id]);
      granary.paused = false;
      granary.staff = 0;
      r.sheets.render();
      food = rowFor(r.root, 'food');
      expect(food.textContent).toContain('The granary is short of workers');
      expect(food.textContent).toContain('More homes bring more workers');
      expect(food.querySelector('.show-me')).toBe(null);
    } finally { r.cleanup(); }
  });
  it('gives every Show me and View its own name for a screen reader, starting with the words it shows', () => {
    const r = rig();
    try {
      const lost = addRaw(r.world, 'house', 12, 5, { tier: 2, residents: 8 });   // no road: every row blames the road
      r.store.set(select(r.store.get(), lost.id));
      const labels = [...r.root.querySelectorAll('.checklist .show-me')].map((b) => b.getAttribute('aria-label'));
      expect(labels.length).toBeGreaterThan(1);
      for (const label of labels) expect(label).toBe(`${T.showMe}: ${CAUSE_TEXT.no_road.fix}`);   // each says what it does, not just "Show me"
      const away = addRaw(r.world, 'house', 28, 9, { tier: 2, residents: 8 });    // on the road, but no well or bazaar
      r.store.set(select(r.store.get(), away.id));
      const own = [...r.root.querySelectorAll('.checklist .show-me')].map((b) => b.getAttribute('aria-label'));
      expect(own).toEqual([`${T.showMe}: ${CAUSE_TEXT.no_well.fix}`, `${T.showMe}: ${CAUSE_TEXT.no_bazaar.fix}`]);   // and different fixes read differently
      for (const b of r.root.querySelectorAll('.checklist button')) expect(b.getAttribute('aria-label').startsWith(b.textContent)).toBe(true);
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
      expect(water.textContent).toContain('No well within 5 road tiles');
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
  it("in the game, the house sheet's View on a paused well selects that well and opens its sheet", async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const well = Object.values(r.world.buildings).find((b) => b.type === 'well');
      well.paused = true;
      const home = Object.values(r.world.buildings).find((b) => b.type === 'house');
      r.store.set(select(r.store.get(), home.id));
      const water = [...r.root.querySelectorAll('#sheet .checklist li')].find((li) => li.textContent.includes(NEED_NAMES.water));
      expect(water.textContent).toContain('The well is paused');
      fire(water.querySelector('.view'), 'click');
      const s = r.store.get();
      expect(s.selectedId).toBe(well.id);
      expect(s.sheet).toEqual({ kind: 'info', id: well.id });
      expect(r.root.querySelector('#sheet h2').textContent).toBe(buildingName('well'));
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
  // View (an alert's or a house sheet's) selects a building and pans to it. A portrait sheet may reach 60% of the
  // height (css/ui.css), so the building must end up in the map above that, not centred under it. The test page's
  // own viewport caps the mounted sheet lower than a phone would, so the check is against the tallest sheet.
  it('View keeps the building in the map above the tallest portrait sheet at 150% text', async () => {
    for (const motion of ['reduced', 'tween']) {
      const r = await rigUI({ width: 390, height: 844 });
      try {
        r.ui.settings.set({ textSize: 150, reducedMotion: motion === 'tween' ? 'off' : 'on' });
        const bazaar = addRaw(r.world, 'bazaar', 20, 5);                         // off the road: a sheet with problems to read
        r.ui.refresh();
        r.store.set(openSheet(r.store.get(), 'minimap'));
        const i = r.ui.alerts.list().findIndex((a) => a.id === bazaar.id);
        const view = r.root.querySelectorAll('#sheet .alert-list .view')[i];
        fire(view, 'click');
        if (motion === 'tween') { expect(r.ui.cameraControl.animating).toBe(true); r.ui.cameraControl.tick(1e6); }
        expect(r.store.get().sheet).toEqual({ kind: 'info', id: bazaar.id });
        const topBar = r.root.querySelector('#topbar').getBoundingClientRect().bottom;
        const sheetTop = Math.min(r.root.querySelector('#sheet').getBoundingClientRect().top, 844 * 0.4);
        for (const [x, y] of [[20, 5], [22, 5], [20, 7], [22, 7]]) {                // the footprint's four corners
          const p = r.screenOf(x, y);
          expect([motion, x, y, p.x >= 0 && p.x <= 390, p.y > topBar && p.y < sheetTop]).toEqual([motion, x, y, true, true]);
        }
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
