import { describe, it, expect } from '../harness.js';
import { boot } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { createWorld, removeBuilding } from '../../src/sim/world.js';
import { setGuide } from '../../src/sim/commands.js';
import { addRaw } from '../helpers/testWorld.js';
import { createSettings, DEFAULT_SETTINGS } from '../../src/ui/settings.js';
import { createMenuSheets } from '../../src/ui/menu.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { openSheet } from '../../src/ui/modes.js';
import { showMeTarget } from '../../src/ui/goalsList.js';
import { canResumeGuide } from '../../src/ui/guide.js';
import { guideGoal } from '../../src/sim/goals.js';
import { GUIDE_GOALS } from '../../src/data/goals.js';
import { drawGuideMarker } from '../../src/render/overlays.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { p } from '../../src/render/iso.js';
import { GUIDE_PULSES, GUIDE_PULSE_MS } from '../../src/data/ui.js';
import { T, HELP_NAMES } from '../../src/ui/text.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { contrastIn } from '../helpers/contrast.js';
import { rigUI, mountShell, fakeHistory } from '../helpers/uiWorld.js';
import { makeCanvas, canvasHash, pixelAt } from '../helpers/canvas.js';
import { mount, fire } from '../helpers/dom.js';

// The game booted straight into a new city (?skipTitle=1) with the given stored settings.
async function bootWith(stored) {
  const shell = await mountShell(1280, 800);
  const history = fakeHistory();
  const storage = { getItem: () => (stored ? JSON.stringify(stored) : null), setItem: () => {} };
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=8'),
    now: () => 0, clock: () => 1760000000000, storage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}

describe('ui guide', () => {
  it('stores the Help level and the seen tips, defaulting to Guide and tips', () => {
    const { root, cleanup } = mount();
    try {
      const data = {};
      const storage = { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
      const s = createSettings({ storage, root, systemReducedMotion: () => false });
      expect(DEFAULT_SETTINGS.help).toBe('full');
      expect(DEFAULT_SETTINGS.seenTips).toEqual([]);
      expect(s.get().help).toBe('full');
      s.set({ help: 'tips', seenTips: ['play'] });
      s.set({ help: 'never', seenTips: [1] });                       // invalid values are ignored
      expect(s.get().help).toBe('tips');
      expect(s.get().seenTips).toEqual(['play']);
      const again = createSettings({ storage, root, systemReducedMotion: () => false });
      expect(again.get().help).toBe('tips');
      expect(again.get().seenTips).toEqual(['play']);
      again.get().seenTips.push('x');
      expect(DEFAULT_SETTINGS.seenTips).toEqual([]);                  // the defaults never change
    } finally { cleanup(); }
  });
  it('offers the Help choice in settings', () => {
    const { root, cleanup } = mount('<div id="body"></div>');
    try {
      const settings = createSettings({ storage: { getItem: () => null, setItem: () => {} }, root, systemReducedMotion: () => false });
      const menus = createMenuSheets({ store: createStore(INITIAL_UI_STATE), settings, toasts: { show: () => {} } });
      const body = root.querySelector('#body');
      menus.settings(body, { close: () => {} });
      const choices = [...body.querySelectorAll('.choice.help')];
      expect(choices.map((b) => b.textContent)).toEqual([HELP_NAMES.full, HELP_NAMES.tips, HELP_NAMES.off]);
      expect(choices[0].getAttribute('aria-pressed')).toBe('true');
      fire(body.querySelector('.choice.help[data-value="off"]'), 'click');
      expect(settings.get().help).toBe('off');
      expect(body.querySelector('.choice.help[data-value="off"]').getAttribute('aria-pressed')).toBe('true');
    } finally { cleanup(); }
  });
  it('starts a new city with the guide on only under Guide and tips', async () => {
    let r = await bootWith(null);
    try {
      expect(r.api.game().world.guide.on).toBe(true);
      expect(document.body.classList.contains('guide-on')).toBe(true);
      r.api.game().ui.settings.set({ help: 'off' });
      r.api.hooks.newCity();
      expect(r.api.game().world.guide.on).toBe(false);
      expect(document.body.classList.contains('guide-on')).toBe(false);
    } finally { r.cleanup(); }
    r = await bootWith({ help: 'tips' });
    try {
      expect(r.api.game().world.guide.on).toBe(false);
    } finally { r.cleanup(); }
  });
  it('suggests the card the step needs, dims the rest and keeps them usable', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      expect(r.ui.guide.state()).toEqual({ active: true, goal: guideGoal(r.world), item: 'road', category: 'roads' });
      expect(document.body.classList.contains('guide-on')).toBe(true);
      const road = r.root.querySelector('#panel .card[data-item="road"]');
      expect(road.classList.contains('suggested')).toBe(true);
      expect(road.querySelector('.tag').textContent).toBe(T.suggested);
      const demolish = r.root.querySelector('#panel .card[data-item="demolish"]');
      expect(demolish.classList.contains('dimmed')).toBe(true);
      expect(demolish.querySelector('.tag')).toBe(null);
      expect(r.root.querySelector('#panel .tab[data-category="roads"]').classList.contains('suggested')).toBe(true);
      expect(r.root.querySelector('#panel .tab[data-category="homes"]').classList.contains('dimmed')).toBe(true);
      expect(r.root.querySelector('#dock .cat[data-category="roads"]').classList.contains('suggested')).toBe(true);
      fire(demolish, 'click');                                       // dimmed, still usable
      expect(r.store.get().mode).toBe('demolishing');
    } finally { r.cleanup(); }
  });
  it('moves the suggestion to the plots card once a road is drawn, with the dot on Homes', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.placement.start({ kind: 'road' });
      r.ui.placement.pointAt(5, 14); r.ui.placement.pointAt(8, 14);
      expect(r.ui.placement.confirm().ok).toBe(true);               // settles: road, well, food and temple are done
      r.ui.placement.cancel();
      expect(r.ui.guide.state().item).toBe('house');
      r.store.set({ category: 'homes' });
      expect(r.root.querySelector('#panel .card[data-item="house"]').classList.contains('suggested')).toBe(true);
      expect(r.root.querySelector('#panel .tab[data-category="homes"]').classList.contains('suggested')).toBe(true);
      expect(r.root.querySelector('#panel .tab[data-category="roads"]').classList.contains('dimmed')).toBe(true);
      expect(r.root.querySelector('#dock .cat[data-category="homes"]').classList.contains('suggested')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('Skip guide clears every mark; Resume guide in How to play brings them back', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      fire(r.root.querySelector('#goals .skip-guide'), 'click');
      expect(r.world.guide.on).toBe(false);
      expect(document.querySelectorAll('.suggested, .dimmed, .card .tag').length).toBe(0);
      expect(document.body.classList.contains('guide-on')).toBe(false);
      expect(r.ui.guide.marker(0)).toBe(null);
      expect(canResumeGuide(r.world)).toBe(true);
      r.store.set(openSheet(r.store.get(), 'help'));
      const resume = r.root.querySelector('#sheet .resume-guide');
      expect(resume.textContent).toBe(T.resumeGuide);
      fire(resume, 'click');
      expect(r.world.guide.on).toBe(true);
      expect(r.store.get().sheet).toBe(null);
      expect(r.root.querySelector('#panel .card[data-item="road"]').classList.contains('suggested')).toBe(true);
      r.store.set(openSheet(r.store.get(), 'help'));
      expect(r.root.querySelector('#sheet .resume-guide')).toBe(null);   // offered only while the guide is off
    } finally { r.cleanup(); }
  });
  it('offers Resume guide only under Help: Guide and tips, since a city loaded under the others turns its guide off', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const offered = () => {
        r.store.set(openSheet(r.store.get(), 'help'));
        const b = r.root.querySelector('#sheet .resume-guide');
        r.store.set({ sheet: null });
        return Boolean(b);
      };
      fire(r.root.querySelector('#goals .skip-guide'), 'click');       // off, with guide steps still open
      expect(offered()).toBe(true);
      for (const help of ['tips', 'off']) {
        r.ui.settings.set({ help });
        expect([help, canResumeGuide(r.world, help), offered()]).toEqual([help, false, false]);
      }
      r.ui.settings.set({ help: 'full' });
      expect(canResumeGuide(r.world, 'full')).toBe(true);
      expect(offered()).toBe(true);
    } finally { r.cleanup(); }
  });
  it('offers no Resume guide once every guide goal is done, since a resumed guide would pay its bonus late', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      fire(r.root.querySelector('#goals .skip-guide'), 'click');
      expect(canResumeGuide(r.world)).toBe(true);
      for (const id of GUIDE_GOALS) if (!r.world.goals.completed.includes(id)) r.world.goals.completed.push(id);
      r.ui.refresh();
      expect(canResumeGuide(r.world)).toBe(false);
      r.store.set(openSheet(r.store.get(), 'help'));
      expect(r.root.querySelector('#sheet .resume-guide')).toBe(null);
      expect(r.root.querySelector('#sheet').textContent).toContain(T.guideHelp);   // the explanation stays
    } finally { r.cleanup(); }
  });
  it('turns a running guide off when Help changes to Tips only or Off, and leaves it off when it changes back', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.settings.set({ sound: true });                            // another setting leaves the guide alone
      expect(r.world.guide.on).toBe(true);
      r.ui.settings.set({ help: 'tips' });
      expect(r.world.guide.on).toBe(false);
      expect(document.body.classList.contains('guide-on')).toBe(false);
      r.ui.settings.set({ help: 'full' });                           // Resume guide brings it back, not the setting
      expect(r.world.guide.on).toBe(false);
      expect(canResumeGuide(r.world)).toBe(true);
    } finally { r.cleanup(); }
  });
  it("rings the step's target on the map: two pulses when the step changes, then still, and still under reduced motion", async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.settings.set({ reducedMotion: 'off' });
      const first = r.ui.guide.marker(1000);
      expect({ x: first.x, y: first.y }).toEqual(showMeTarget(r.world, guideGoal(r.world)));
      expect(first.pulsing).toBe(true);
      expect(r.ui.guide.marker(1000 + GUIDE_PULSES * GUIDE_PULSE_MS - 1).pulsing).toBe(true);
      expect(r.ui.guide.marker(1000 + GUIDE_PULSES * GUIDE_PULSE_MS).pulsing).toBe(false);
      r.world.goals.completed.push('road');                          // the next step rings afresh
      r.ui.refresh();
      expect(r.ui.guide.marker(9000)).toEqual({ ...showMeTarget(r.world, guideGoal(r.world)), pulsing: true, age: 0 });
      expect(r.ui.guide.marker(9300).age).toBe(300);                 // the time since the step began
      r.ui.settings.set({ reducedMotion: 'on' });
      expect(r.ui.guide.marker(9001).pulsing).toBe(false);
      r.frame(9002);                                                 // the frame draws the ring without throwing
    } finally { r.cleanup(); }
  });
  it('starts the pulses at the step change: the first frame of a step draws the ring at the start of a pulse', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.settings.set({ reducedMotion: 'off' });
      // The ring's fill is the one filled poly the overlay draws here; its alpha falls as a pulse grows (0.12 at its start).
      const fills = [];
      const g = new Proxy({}, { get: (_, k) => (k === 'poly' ? (pts, fill, o) => { if (fill !== 'none' && o && o.alpha !== undefined) fills.push(o.alpha); } : () => {}) });
      r.renderer.renderFrame = (w, cam, opts) => { opts.drawOverlay(g, { x0: 0, y0: 0, x1: 31, y1: 31 }); };
      const alphaAt = (t) => { fills.length = 0; r.frame(t); return fills[0]; };
      expect(Math.abs(alphaAt(5000) - 0.12) < 1e-9).toBe(true);    // 5000 ms is not a whole number of pulses: the age is what counts
      expect(alphaAt(5000 + GUIDE_PULSE_MS / 2)).toBeLessThan(0.1);
      r.world.goals.completed.push('road');                          // the next step: a fresh pulse from its first frame
      r.ui.refresh();
      expect(Math.abs(alphaAt(7777) - 0.12) < 1e-9).toBe(true);
    } finally { r.cleanup(); }
  });
  it('sweeps the cards no more once the guide is off and its marks are gone', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      fire(r.root.querySelector('#goals .skip-guide'), 'click');
      expect(document.querySelectorAll('.suggested, .dimmed').length).toBe(0);
      let sweeps = 0;
      const real = document.body.querySelectorAll;
      document.body.querySelectorAll = function (sel) { if (String(sel).includes('.card[data-item]')) sweeps++; return real.call(this, sel); };
      try {
        r.store.set({ category: 'food' });                           // a store change rebuilds the panel's cards
        r.ui.refresh();
        expect(sweeps).toBe(0);
        setGuide(r.world, true);                                     // back on: the marks return at once
        r.ui.refresh();
        expect(sweeps).toBeGreaterThan(0);
        expect(r.root.querySelector('#panel .tab.suggested')).toBeTruthy();
      } finally { delete document.body.querySelectorAll; }
    } finally { r.cleanup(); }
  });
  it('walks the food step card by card: farm, then granary (dot on Food), then bazaar (dot on Services)', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.goals.completed.push('road', 'plots', 'well');
      for (const b of Object.values(r.world.buildings)) if (['farm_grain', 'granary', 'bazaar'].includes(b.type)) removeBuilding(r.world, b.id);
      r.ui.refresh();
      const dotOn = () => [...r.root.querySelectorAll('#panel .tab.suggested')].map((t) => t.dataset.category);
      const check = (item, category) => {
        expect(guideGoal(r.world).id).toBe('food');
        expect(r.ui.guide.state()).toEqual({ active: true, goal: guideGoal(r.world), item, category });
        expect([item, dotOn()]).toEqual([item, [category]]);
        expect([item, r.root.querySelector('#dock .cat.suggested').dataset.category]).toEqual([item, category]);
        r.store.set({ category });
        expect([...r.root.querySelectorAll('#panel .card.suggested')].map((c) => c.dataset.item)).toEqual([item]);
      };
      check('farm_grain', 'food');
      addRaw(r.world, 'farm_grain', 2, 11);
      r.ui.refresh();
      check('granary', 'food');
      addRaw(r.world, 'granary', 6, 11);
      r.ui.refresh();
      check('bazaar', 'services');                                   // the dot moves from Food to Services
    } finally { r.cleanup(); }
  });
  it('turns the guide off for a city imported under Help: Off, though it was exported mid-guide', async () => {
    const shell = await mountShell(1280, 800);
    const history = fakeHistory();
    let stored = { help: 'full' };
    const storage = { getItem: () => JSON.stringify(stored), setItem: (k, v) => { stored = JSON.parse(v); } };
    let shared = null;
    const platform = { share: async (d) => { shared = d.files[0]; }, canShare: () => true, pick: async () => shared };
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=8'),
      now: () => 0, clock: () => 1760000000000, storage, platform, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    const tick = () => new Promise((res) => setTimeout(res, 0));
    try {
      expect(api.game().world.guide.on).toBe(true);                  // a new city under Guide and tips, mid-guide
      await api.hooks.exportCity();
      expect(shared === null).toBe(false);
      api.game().ui.settings.set({ help: 'off' });                   // this device then turns Help off
      expect(api.game().world.guide.on).toBe(false);
      await api.hooks.importCity();
      for (let i = 0; i < 50 && !api.game().ui.store.get().confirmDialog; i++) await tick();
      fire(shell.root.querySelector('#dialog .ok'), 'click');
      const g = api.game();
      expect(g.ui.store.get().sheet.kind).toBe('welcome');           // the imported city
      expect(g.world.guide.on).toBe(false);                          // its saved guide.on gave way to this device's Help
      expect(document.body.classList.contains('guide-on')).toBe(false);
      expect(document.querySelectorAll('.suggested, .dimmed').length).toBe(0);
      expect(g.ui.guide.marker(0)).toBe(null);
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; }
  });
  it('keeps the guide of a city loaded under Guide and tips', async () => {
    const w = createWorld({ seed: 3 });
    expect(w.guide.on).toBe(true);
    const r = await rigUI({ width: 1280, height: 800, world: w, welcome: { savedAt: 0, lastSpeed: 1 } });
    try { expect(r.world.guide.on).toBe(true); } finally { r.cleanup(); }
  });
  it('draws the ring the same at rest whatever the time, and grows it while pulsing', () => {
    const shot = (pulsing, now) => {
      const c = makeCanvas(240, 160);
      const ctx = c.getContext('2d');
      const [ax, ay] = p(10.5, 10.5);
      ctx.translate(120 - 2 * ax, 80 - 2 * ay);
      drawGuideMarker(makeDraw(ctx, 2), 10.5, 10.5, pulsing, now);
      return c;
    };
    const still = shot(false, 0);
    expect(canvasHash(still)).toBe(canvasHash(shot(false, 300)));
    expect(canvasHash(shot(true, 0)) === canvasHash(shot(true, 300))).toBe(false);
    let inked = 0;
    for (let x = 0; x < 240; x += 2) for (let y = 0; y < 160; y += 2) if (pixelAt(still, x, y)[3] > 0) inked++;
    expect(inked).toBeGreaterThan(20);
  });
  it('keeps dimmed cards readable: their words at 4.5:1 or better, and the Suggested tag too', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const demolish = r.root.querySelector('#panel .card[data-item="demolish"]');
      expect(demolish.classList.contains('dimmed')).toBe(true);
      expect(getComputedStyle(demolish).opacity).toBe('1');          // only the picture fades
      for (const sel of ['.name', '.cost']) expect(contrastIn(demolish.querySelector(sel), demolish)).toBeGreaterThanOrEqual(4.5);
      const tag = r.root.querySelector('#panel .card.suggested .tag');
      expect(contrastIn(tag, tag)).toBeGreaterThanOrEqual(4.5);
    } finally { r.cleanup(); }
  });
});
