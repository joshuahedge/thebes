import { describe, it, expect } from '../harness.js';
import { boot } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
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

// Contrast as shown: the text colour with its alpha and every opacity up to `stop`, over `stop`'s background.
const rgba = (s) => { const m = s.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
function backdrop(node) {
  for (let n = node; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) return c; }
  return [255, 255, 255, 1];
}
const lum = (c) => { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
function contrastIn(node, stop) {
  const fg = rgba(getComputedStyle(node).color);
  let alpha = fg[3];
  for (let n = node; n; n = n.parentElement) { alpha *= Number(getComputedStyle(n).opacity); if (n === stop) break; }
  const bg = backdrop(stop);
  const shown = [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha));
  const [hi, lo] = [lum(shown), lum(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
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
      expect(r.ui.guide.marker(9000)).toEqual({ ...showMeTarget(r.world, guideGoal(r.world)), pulsing: true });
      r.ui.settings.set({ reducedMotion: 'on' });
      expect(r.ui.guide.marker(9001).pulsing).toBe(false);
      r.frame(9002);                                                 // the frame draws the ring without throwing
    } finally { r.cleanup(); }
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
