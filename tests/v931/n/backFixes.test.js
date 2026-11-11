import { describe, it, expect } from '../../harness.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createBackStack } from '../../../src/ui/backstack.js';
import { setDock } from '../../../src/ui/modes.js';
import { createSpeedControl } from '../../../src/ui/speed.js';
import { createExplainer } from '../../../src/ui/v81/stats.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { installGuide } from '../../../src/ui/installUi.js';
import { V931_N_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { mount, fire } from '../../helpers/dom.js';

function fakeHistory() {
  const entries = [{ state: null }];
  let index = 0;
  const listeners = [];
  return {
    get length() { return entries.length; },
    get state() { return entries[index].state; },
    get index() { return index; },
    pushState(state) { entries.splice(index + 1); entries.push({ state }); index = entries.length - 1; },
    back() { if (index > 0) { index--; for (const fn of listeners) fn({ state: entries[index].state }); } },
    addListener(type, fn) { if (type === 'popstate') listeners.push(fn); },
    removeListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
  };
}
const rig = () => {
  const store = createStore(INITIAL_UI_STATE);
  const h = fakeHistory();
  const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
  bs.start();
  return { store, h, bs };
};

describe('v931 n back', () => {
  it('counts the build tray on a phone, and Back closes it to the slim bar', () => {
    const { store, h, bs } = rig();
    store.set(setDock(store.get(), 'tray'));
    expect([h.length, bs.depth()]).toEqual([2, 1]);
    h.back();
    expect([store.get().dock, bs.depth(), h.index]).toEqual(['slim', 0, 0]);
  });
  it("leaves the wide layout's tray alone: a panel, not a step", () => {
    const { store, h } = rig();
    store.set({ layout: 'wide' });
    store.set({ dock: 'tray' });
    expect(h.length).toBe(1);
  });
  it('a tray closed by its own handle takes its entry back, so no Back press does nothing later', () => {
    const { store, h, bs } = rig();
    store.set({ dock: 'tray' });
    store.set({ dock: 'slim' });
    expect([bs.depth(), h.index]).toEqual([0, 0]);
  });
  it('counts the Speed popup: Back closes it and its closing follows the store', () => {
    const world = makeTestWorld({ gold: 100 });
    const { store, h, bs } = rig();
    const { root, cleanup } = mount('<div id="c"></div>');
    try {
      const speed = createSpeedControl({ world, store });
      speed.mountCorner(root.querySelector('#c'));
      const chevron = root.querySelector('.speed-chevron'), options = root.querySelector('.speed-options');
      fire(chevron, 'click');
      expect([options.hidden, store.get().speedOpen, bs.depth()]).toEqual([false, true, 1]);
      h.back();
      expect([options.hidden, store.get().speedOpen, chevron.getAttribute('aria-expanded')]).toEqual([true, false, 'false']);
      fire(chevron, 'click');
      fire(options.querySelector('button'), 'click');   // a speed picked closes it, and takes its entry back
      expect([options.hidden, store.get().speedOpen, bs.depth(), h.index]).toEqual([true, false, 0, 0]);
    } finally { cleanup(); }
  });
  it("counts a stat's explainer: Back closes it, a second tap takes its entry back", () => {
    const { store, h, bs } = rig();
    const { root, cleanup } = mount('<div id="bar"><button id="gold" aria-controls="stat-explainer"></button></div>');
    try {
      const host = root.querySelector('#bar'), anchor = root.querySelector('#gold');
      const explain = () => ({ name: 'Gold', title: 'Gold', what: 'Coins.', lines: [], notes: [], action: null });
      const ex = createExplainer({ host, store, explain });
      ex.toggle('gold', anchor);
      expect([store.get().explainerOpen, bs.depth(), ex.openKind()]).toEqual([true, 1, 'gold']);
      h.back();
      expect([store.get().explainerOpen, ex.openKind(), host.querySelector('.stat-explainer').hidden]).toEqual([false, null, true]);
      ex.toggle('gold', anchor);
      ex.toggle('gold', anchor);
      expect([store.get().explainerOpen, bs.depth(), h.index]).toEqual([false, 0, 0]);
      ex.destroy();
    } finally { cleanup(); }
  });
  it("counts the lesson's chapter card: Back clears its step", () => {
    const { store, h, bs } = rig();
    store.set({ lessonCardUp: true });
    expect(bs.depth()).toBe(1);
    h.back();
    expect([store.get().lessonCardUp, bs.depth()]).toEqual([false, 0]);
  });
  it('closes one thing at a time: a sheet over a tray closes first, then the tray', () => {
    const { store, h } = rig();
    store.set({ dock: 'tray' });
    store.set({ sheet: { kind: 'menu', id: null } });
    h.back();
    expect([store.get().sheet, store.get().dock]).toEqual([null, 'tray']);
    h.back();
    expect(store.get().dock).toBe('slim');
  });
});

describe('v931 n title back', () => {
  const make = (extra = {}) => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    const h = fakeHistory();
    // the card listens on the window: the fake history's back() also dispatches the popstate there
    const hist = { pushState: (s) => h.pushState(s), back: () => { if (h.index > 0) { h.back(); window.dispatchEvent(new Event('popstate')); } }, get state() { return h.state; } };
    const card = createTitleCard({ container: root.querySelector('#title'), hasSave: false, canInstall: true, history: hist, ...extra });
    return { root, cleanup, h, card, hist, container: root.querySelector('#title') };
  };
  it('the New city card is one Back step: Back shows the buttons again and stays on the title', () => {
    const r = make();
    try {
      r.card.showNewCity();
      expect([r.h.length, r.container.querySelector('.guide') !== null]).toEqual([2, true]);
      r.hist.back();   // the phone's Back
      expect([r.container.querySelector('.guide'), r.container.querySelector('.title-buttons').hidden, r.h.index]).toEqual([null, false, 0]);
      r.card.showNewCity();
      r.card.showCard();                              // its own Back button takes its entry back
      expect(r.h.index).toBe(0);
    } finally { r.card.destroy(); r.cleanup(); }
  });
  it('a panel swapped for another keeps its one entry', () => {
    const r = make();
    try {
      r.card.showNewCity();
      r.card.showPanel((body) => body.append(document.createElement('p')));
      expect(r.h.length).toBe(2);
    } finally { r.card.destroy(); r.cleanup(); }
  });
  it("the install guide closes with Not now, and its iPhone line is for a player with a city only", () => {
    const r = make();
    try {
      const flow = { env: { platform: 'ios' } };
      r.card.showGuide(installGuide(flow, { hasCity: false }));
      expect(r.container.querySelector('.guide-back').textContent).toBe(V931_N_TEXT.notNow);
      expect(r.container.querySelector('.install-bring')).toBe(null);
      expect(r.container.textContent.includes('Export first')).toBe(false);
    } finally { r.card.destroy(); r.cleanup(); }
  });
});
