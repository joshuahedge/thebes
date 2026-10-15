// Version 5.0 Task 3 (rulings 540-549): the Layers picker offers each new layer at its milestone, the legend row says what each shows (every key with its words), Goods supply's good
// picker offers the goods the city can make and sets the good the map draws, the O key skips what is not offered, and each new thing arrives with a tip that How to play lists.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { canvasHash } from '../../helpers/canvas.js';
import { createLayersPicker } from '../../../src/ui/layersPicker.js';
import { createOverlayLegend } from '../../../src/ui/overlayUi.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { openSheet } from '../../../src/ui/modes.js';
import { OVERLAYS, LAYER_OVERLAYS, availableOverlays } from '../../../src/render/overlays.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, TIP_TEXT, TIP_HELP_TEXT, V50_LAYERS_TEXT as W } from '../../../src/ui/text.js';
import { TIPS } from '../../../src/data/tips.js';
import { SUPPLY_GOODS, JOBLESS_BANDS } from '../../../src/data/layers.js';
import { MIN_STAFF_RATIO } from '../../../src/data/labour.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { mount } from '../../helpers/dom.js';

const shownIn = (node) => [...node.querySelectorAll('button.layer')].filter((b) => !b.hidden).map((b) => b.dataset.layer);

function pickerRig(world) {
  const { root, cleanup } = mount();
  const store = createStore(INITIAL_UI_STATE);
  const picker = createLayersPicker({ store, world, restoreFocus: () => {} });
  root.append(picker.node);
  return { root, store, picker, cleanup() { picker.destroy(); cleanup(); } };
}
const cityAt = (milestone, { homes = true } = {}) => {
  const w = makeTestWorld();
  w.milestone = milestone;
  setRoad(w, 0, 10, 31, 10);
  if (homes) addRaw(w, 'house', 12, 11, { tier: 1, residents: 4 });
  return w;
};

describe('v50 layers: the Layers picker', () => {
  it('offers Home progress from the first home, Goods supply and Workers from Town, and every older layer always', () => {
    for (const [what, world, want] of [
      ['no home yet', cityAt('village', { homes: false }), []],
      ['a first home', cityAt('village'), ['progress']],
      ['Town', cityAt('town'), ['progress', 'supply', 'workers']],
    ]) {
      const r = pickerRig(world);
      try {
        r.store.set({ layersOpen: true });
        const shown = shownIn(r.picker.node).filter((k) => k !== 'off');
        expect([what, shown.filter((k) => LAYER_OVERLAYS.includes(k))]).toEqual([what, want]);
        expect([what, shown.filter((k) => !LAYER_OVERLAYS.includes(k))]).toEqual([what, OVERLAYS.filter((k) => !LAYER_OVERLAYS.includes(k))]);
        for (const b of r.picker.node.querySelectorAll('button.layer.off, button.layer')) if (!b.hidden) expect([what, b.textContent.length > 0]).toEqual([what, true]);
      } finally { r.cleanup(); }
    }
  });
  it('a layer in use stays in the picker even when the city would not offer it, and picking one sets the overlay and closes the popover', () => {
    const r = pickerRig(cityAt('village'));
    try {
      r.store.set({ layersOpen: true, overlay: 'supply' });
      expect(shownIn(r.picker.node).includes('supply')).toBe(true);
      expect(r.picker.node.querySelector('[data-layer="supply"]').getAttribute('aria-pressed')).toBe('true');
      r.store.set({ overlay: null, layersOpen: true });
      expect(shownIn(r.picker.node).includes('supply')).toBe(false);
      fire(r.picker.node.querySelector('[data-layer="progress"]'), 'click');
      expect([r.store.get().overlay, r.store.get().layersOpen]).toEqual(['progress', false]);
    } finally { r.cleanup(); }
  });
  it('names each new layer, with words for every key it draws', () => {
    expect(['progress', 'supply', 'workers'].map((k) => OVERLAY_NAMES[k])).toEqual(['Home progress', 'Goods supply', 'Workers']);
    for (const k of LAYER_OVERLAYS) expect([k, OVERLAY_LEGEND[k].length]).toEqual([k, 3]);
    expect(W.stopped.words).toContain(`${Math.round(MIN_STAFF_RATIO * 100)}%`);                       // the sim's own staff line
    expect(W.jobless.words).toContain(JOBLESS_BANDS.map((b, i) => (JOBLESS_BANDS[i + 1] ? `${b.from} to ${JOBLESS_BANDS[i + 1].from - 1}` : `${b.from} or more`)).join(', '));
    expect(TIP_HELP_TEXT.layer_progress).toContain('first home');                                // How to play says when each comes
    expect(TIP_HELP_TEXT.layers_town).toContain('Town');
    expect(TIP_TEXT.layers_town).toContain('Town');
  });
  it('the O key cycles only what the city offers', () => {
    const store = createStore(INITIAL_UI_STATE);
    const { root, cleanup } = mount();
    try {
      const world = cityAt('village');
      const legend = createOverlayLegend({ container: root, store, world });
      const seen = [];
      for (let i = 0; i <= availableOverlays(world).length; i++) { legend.cycle(); seen.push(store.get().overlay); }
      expect(seen).toEqual([...availableOverlays(world), null]);
      expect(seen.includes('supply') || seen.includes('workers')).toBe(false);
      expect(seen.includes('progress')).toBe(true);
      world.milestone = 'town';
      expect(availableOverlays(world)).toEqual(OVERLAYS);
      expect(availableOverlays(null)).toEqual(OVERLAYS);                                           // no world: everything (the tests that have none)
    } finally { cleanup(); }
  });
});

describe('v50 layers: the legend row', () => {
  const legendFor = (kind, world, extra = {}) => {
    const store = createStore({ ...INITIAL_UI_STATE, overlay: kind, ...extra });
    const { root, cleanup } = mount();
    const legend = createOverlayLegend({ container: root, store, world });
    return { root, store, legend, strip: () => root.querySelector('.strip'), cleanup };
  };
  it('Home progress and Workers: a strip with the name, three keys each carrying its words, and an x that turns the layer off', () => {
    for (const [kind, words] of [['progress', [W.ready, W.one, W.many]], ['workers', [W.short, W.stopped, W.jobless]]]) {
      const r = legendFor(kind, cityAt('town'));
      try {
        const strip = r.strip();
        expect([kind, strip.classList.contains('layer'), strip.getAttribute('aria-label')]).toEqual([kind, true, `${OVERLAY_NAMES[kind]} overlay`]);
        expect([kind, strip.querySelector('strong').textContent]).toEqual([kind, OVERLAY_NAMES[kind]]);
        const keys = [...strip.querySelectorAll('.key')];
        expect([kind, keys.map((k) => k.getAttribute('aria-label'))]).toEqual([kind, words.map((x) => x.words)]);
        expect([kind, keys.map((k) => k.querySelector('.text').textContent)]).toEqual([kind, words.map((x) => x.label)]);   // the label is on screen, the words are for a screen reader
        expect([kind, keys.every((k) => k.querySelector('svg.layer-swatch'))]).toEqual([kind, true]);
        expect([kind, strip.querySelector('.goods-pick')]).toEqual([kind, null]);
        fire(strip.querySelector('.close'), 'click');
        expect([kind, r.store.get().overlay]).toEqual([kind, null]);
        expect(r.root.querySelector('.strip')).toBe(null);
      } finally { r.cleanup(); }
    }
  });
  it('Goods supply: a picker of the goods the city can make by its milestone, the picked one pressed, a tap picks it, and a good no longer offered falls back', () => {
    const want = { village: ['food'], town: ['pottery', 'food'], city: ['pottery', 'beer', 'food'], great_city: ['pottery', 'beer', 'linen', 'food'], capital: SUPPLY_GOODS };
    for (const [milestone, goods] of Object.entries(want)) {
      const world = cityAt(milestone);
      const r = legendFor('supply', world);
      try {
        const chips = () => [...r.root.querySelectorAll('.goods-pick .good')];
        expect([milestone, chips().map((c) => c.dataset.good)]).toEqual([milestone, goods]);
        expect([milestone, chips().map((c) => c.textContent)]).toEqual([milestone, goods.map(W.pickName)]);
        expect([milestone, chips().map((c) => c.getAttribute('aria-label'))]).toEqual([milestone, goods.map(W.pickAria)]);
        expect([milestone, chips().filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.good)]).toEqual([milestone, [goods[0]]]);   // the first until one is picked
        const last = goods[goods.length - 1];
        fire(chips()[chips().length - 1], 'click');
        expect([milestone, r.store.get().supplyGood]).toEqual([milestone, last]);
        expect([milestone, chips().filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.good)]).toEqual([milestone, [last]]);
        expect([milestone, r.root.querySelector('.goods-pick').getAttribute('role'), r.root.querySelector('.goods-pick').getAttribute('aria-label')]).toEqual([milestone, 'group', W.pick]);
      } finally { r.cleanup(); }
    }
    const young = cityAt('village');
    const r = legendFor('supply', young, { supplyGood: 'jewellery' });                              // picked in an older city: the picker offers only foods here
    try {
      expect([...r.root.querySelectorAll('.goods-pick .good[aria-pressed="true"]')].map((c) => c.dataset.good)).toEqual(['food']);
    } finally { r.cleanup(); }
  });
  it('the good picked decides what the map draws', async () => {
    const world = cityAt('capital');
    world.buildings[1].tier = 4;                                                                   // asks for pottery (and has grain in its own stock)
    world.buildings[1].stock = { grain: 30 };
    addRaw(world, 'bazaar', 9, 8).store = { grain: 100 };
    const r = await rigUI({ world });
    try {
      r.cam.x = 12; r.cam.y = 11;
      r.store.set({ overlay: 'supply', supplyGood: 'pottery' });
      r.frame();
      const pottery = canvasHash(r.canvas);
      r.store.set({ supplyGood: 'food' });
      r.frame();
      const food = canvasHash(r.canvas);
      expect(pottery === food).toBe(false);
      expect(r.root.querySelector('.goods-pick .good[aria-pressed="true"]').dataset.good).toBe('food');
    } finally { r.cleanup(); }
  });
});

describe('v50 layers: a tip for each new thing, listed in How to play', () => {
  it('has the two tips with their words (short), and How to play lists them', async () => {
    for (const id of ['layer_progress', 'layers_town']) {
      const tip = TIPS.find((t) => t.id === id);
      expect([id, Boolean(tip)]).toEqual([id, true]);
      expect([id, typeof TIP_TEXT[id], TIP_TEXT[id].split(/\s+/).length <= 20, TIP_HELP_TEXT[id].split(/\s+/).length <= 20]).toEqual([id, 'string', true, true]);
    }
    expect([TIPS.find((t) => t.id === 'layer_progress').trigger, TIPS.find((t) => t.id === 'layers_town').trigger]).toEqual(['layerProgress', 'layersTown']);
    const r = await rigUI();
    try {
      r.store.set(openSheet(r.store.get(), 'help'));
      const items = [...r.root.querySelectorAll('#sheet .tips-list li')].map((li) => li.textContent);
      expect(items.includes(TIP_HELP_TEXT.layer_progress) && items.includes(TIP_HELP_TEXT.layers_town)).toBe(true);
    } finally { r.cleanup(); }
  });
  it('the Home progress tip comes with the first plot and its Show me opens the Layers picker; the Town tip comes with the Town milestone and does the same; the overlay tip about dots and rings stays quiet for them', async () => {
    const w = cityAt('village', { homes: false });
    w.speed = 1;
    let now = 0;
    const r = await rigUI({ world: w, now: () => now });
    try {
      now = 20000;
      r.ui.settings.set({ seenTips: ['house_spots', 'city_advice'] });         // the plots' other tips come first with the first plot (the advice tip is fired ahead of this one); this one is what is left
      const house = addRaw(w, 'house', 12, 9, { tier: 0, residents: 0 });
      r.ui.afterCommand({ kind: 'houses', undoable: true, text: 'Placed 1 plot', result: { ids: [house.id] } });
      expect(r.ui.tips.current()).toBe('layer_progress');
      expect(r.root.querySelector('#tip').textContent).toContain(TIP_TEXT.layer_progress);
      fire(r.root.querySelector('#tip .tip-show-me'), 'click');
      expect(r.store.get().layersOpen).toBe(true);
      r.store.set({ layersOpen: false });
      expect((r.ui.settings.get().seenTips || []).includes('layer_progress')).toBe(true);
    } finally { r.cleanup(); }
    const w2 = cityAt('village');                                              // the Town tip, in a city of its own (a tip waits three minutes of play after another)
    w2.speed = 1;
    let now2 = 0;
    const r2 = await rigUI({ world: w2, now: () => now2 });
    try {
      now2 = 20000;                                                            // past the session's first ten seconds
      r2.ui.settings.set({ seenTips: ['layer_progress'] });
      w2.milestone = 'town';
      r2.ui.onEvents([{ type: 'milestone', id: 'town' }]);
      expect(r2.ui.tips.current()).toBe('layers_town');
      expect(r2.root.querySelector('#tip').textContent).toContain(TIP_TEXT.layers_town);
      fire(r2.root.querySelector('#tip .tip-show-me'), 'click');
      expect(r2.store.get().layersOpen).toBe(true);
      r2.store.set({ layersOpen: false, overlay: 'workers' });
      r2.ui.refresh();
      expect(r2.ui.tips.current() === 'overlay_keys').toBe(false);
    } finally { r2.cleanup(); }
  });
});
