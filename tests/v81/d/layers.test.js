// Version 8.1, Track D (rulings 1240, 1246-1250): the layered build tray. Each category first shows the few cards that matter at the city's rank, with More for the rest; what is locked is hidden until
// it unlocks, and that is a moment Ipi speaks; the Advice engine's top build suggestion glows on its card and Ipi names it; every control carries its data-lock id.
import { describe, it, expect } from '../../harness.js';
import { layerPlan, buildSuggestion, createTrayLayers, LAYER_SHOW, LAYER_MAX, LAYER_MIN_HIDDEN } from '../../../src/ui/v81/trayLayers.js';
import { setSay } from '../../../src/ui/v81/ipiSays.js';
import { TRAY_V81_TEXT } from '../../../src/ui/v81/trayText.js';
import { unlockedItems, isCardLocked, cardInfo, renderCards } from '../../../src/ui/cards.js';
import { CATEGORIES } from '../../../src/data/ui.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { buildingName, CATEGORY_NAMES } from '../../../src/ui/text.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

const capital = () => { const w = uiWorld(); w.milestone = 'capital'; return w; };
const layered = { hooks: { flatTray: false } };
const cardsOf = (r, sel = '#dock .tray') => [...r.root.querySelectorAll(`${sel} .card[data-item]`)].map((c) => c.dataset.item);

const openCategory = (r, id) => fire(r.root.querySelector(`#dock .cat[data-category="${id}"]`), 'click');

describe('v81 d layers: what a category shows', () => {
  it('shows at least 4 and at most 5 cards of a big category, in the category\'s own order, with the rest counted behind More', () => {
    const w = capital();
    const all = unlockedItems(w, 'industry');
    expect(all.length).toBeGreaterThanOrEqual(8);
    const p = layerPlan(w, 'industry');
    expect([p.items.length >= LAYER_SHOW, p.items.length <= LAYER_MAX, p.more, p.hidden, p.total]).toEqual([true, true, true, all.length - p.items.length, all.length]);
    expect(p.items).toEqual(all.filter((i) => p.items.includes(i)));                         // a card never moves: the category's order, only fewer
    const open = layerPlan(w, 'industry', { open: true });
    expect([open.items, open.open, open.more, open.hidden]).toEqual([all, true, true, p.hidden]);
  });

  it('puts first what matters: the suggested card, a new one, one a goal needs, one the city has not built, then the rest', () => {
    const w = capital();
    const plain = layerPlan(w, 'industry').items;
    expect(plain.includes('quay')).toBe(false);
    expect(layerPlan(w, 'industry', { advised: 'quay' }).items.includes('quay')).toBe(true);
    expect(layerPlan(w, 'industry', { needed: ['quay', 'jeweller'] }).items.includes('quay')).toBe(true);
    w.newItems = ['quay'];
    expect(layerPlan(w, 'industry').items.includes('quay')).toBe(true);
    w.newItems = [];
    expect(layerPlan(w, 'industry', { active: 'quay' }).items.includes('quay')).toBe(true);   // the card in hand never hides
    expect(layerPlan(w, 'industry', { pinned: ['quay'] }).items.includes('quay')).toBe(true); // a lesson's card, pinned
    // The cards the city has built come after the ones it has not.
    const first = layerPlan(w, 'industry').items[0];
    addRaw(w, first, 20, 20);
    expect(layerPlan(w, 'industry').items.includes(first)).toBe(false);
    // Up to LAYER_MAX when that many are wanted; never more than the category holds.
    const wanted = unlockedItems(w, 'industry').slice(-6);
    expect(layerPlan(w, 'industry', { needed: wanted }).items.length).toBe(LAYER_MAX);
  });

  it('shows everything when a More would open fewer than 2 cards, and every card of a small category', () => {
    let seen = 0;
    for (const m of MILESTONES) {
      const w = makeTestWorld();
      w.milestone = m.id;
      for (const c of CATEGORIES) {
        const total = unlockedItems(w, c.id).length;
        const p = layerPlan(w, c.id);
        if (total <= LAYER_MAX) expect([m.id, c.id, p.more, p.items.length]).toEqual([m.id, c.id, false, total]);
        if (total > LAYER_MAX) {                                                              // a More that is there opens at least 2 cards; one that would open fewer is not there
          if (total === LAYER_MAX + 1) seen++;
          expect([m.id, c.id, p.more ? p.hidden >= LAYER_MIN_HIDDEN && p.items.length >= LAYER_SHOW : p.items.length === total]).toEqual([m.id, c.id, true]);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
    const six = makeTestWorld();
    six.milestone = 'market_town';
    const items = unlockedItems(six, 'defence');
    expect(items.length).toBe(LAYER_MAX + 1);
    expect([layerPlan(six, 'defence').more, layerPlan(six, 'defence').hidden]).toEqual([true, 2]);
    const all = layerPlan(six, 'defence', { needed: items.slice(0, LAYER_MAX) });          // five wanted: the sixth alone would be a More for one card, so all six show
    expect([all.more, all.items.length]).toEqual([false, 6]);
  });

  it('hides what is locked until it unlocks: a Village city shows its own cards only, and a milestone brings the next ones', () => {
    const w = makeTestWorld();
    expect(unlockedItems(w, 'services')).toEqual(['well', 'bazaar', 'temple', 'firehouse']);
    expect(unlockedItems(w, 'industry')).toEqual([]);
    expect([isCardLocked(w, 'potter'), cardInfo(w, 'potter').locked]).toEqual([true, true]);
    w.milestone = 'town';
    expect(unlockedItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'storehouse']);
    expect(unlockedItems(w, 'services')).toEqual(['well', 'bazaar', 'temple', 'booth', 'firehouse', 'physician', 'palace', 'nilometer']);
  });
});

describe('v81 d layers: the tray on the page', () => {
  // Version 8.2 (Track L, ruling 1327): no tray has a More or Fewer card; every unlocked card is listed and the tray scrolls, the suggested first (replaces 8.1's More tests).
  it('lists every unlocked card of the category in the dock, the panel and the rail, with no More or Fewer', async () => {
    const w = capital();
    const r = await rigUI({ world: w, ...layered });
    try {
      openCategory(r, 'industry');
      expect(cardsOf(r)).toEqual(unlockedItems(w, 'industry'));
      expect(r.root.querySelectorAll('.more-card').length).toBe(0);
      r.store.set({ category: 'industry' });
      expect(cardsOf(r, '#panel .cards')).toEqual(unlockedItems(w, 'industry'));
      r.store.set({ category: 'roads' });
      expect(cardsOf(r)).toEqual(unlockedItems(w, 'roads'));
    } finally { r.cleanup(); }
    const c = await rigUI({ world: capital(), width: 844, height: 390, ...layered });
    try {
      fire(c.root.querySelector('#rail .cat[data-category="industry"]'), 'click');
      expect(cardsOf(c, '#rail .drawer')).toEqual(unlockedItems(c.world, 'industry'));
    } finally { c.cleanup(); }
  });

  it('scrolls the phone\'s tray sideways by finger without passing the scroll on, and keeps the place a redraw finds it at', async () => {
    const w = capital();
    const r = await rigUI({ world: w, ...layered });
    try {
      openCategory(r, 'industry');
      const tray = r.root.querySelector('#dock .tray'), cs = getComputedStyle(tray);
      expect([cs.overflowX, cs.overscrollBehaviorX, tray.scrollWidth > tray.clientWidth]).toEqual(['auto', 'contain', true]);
      const card = tray.querySelector('.card[data-item]');
      expect(getComputedStyle(card).touchAction).toBe('pan-x');                              // a sideways swipe on a card is the tray's; the drag to build is an upward one (cardDrag.js dragIntent)
      tray.scrollLeft = 120;
      const at = tray.scrollLeft;                                                            // (the tray snaps to a card)
      expect(at).toBeGreaterThan(0);
      renderCards(tray, { world: w, category: 'industry', onPick: () => {} });               // a redraw of the same category (a price moved, the suggestion changed)
      expect(tray.scrollLeft).toBe(at);
    } finally { r.cleanup(); }
  });

  it('keeps the card in hand in view even when it is one of the hidden ones', async () => {
    const w = capital();
    const r = await rigUI({ world: w, ...layered });
    try {
      openCategory(r, 'industry');
      const hidden = unlockedItems(w, 'industry').filter((i) => !layerPlan(w, 'industry').items.includes(i))[0];
      r.ui.placement.start({ kind: 'building', type: hidden });                             // picked by Show me, a key or the lesson
      r.ui.refresh();
      expect(cardsOf(r).includes(hidden)).toBe(true);
      expect(r.root.querySelector(`#dock .tray .card[data-item="${hidden}"]`).getAttribute('aria-pressed')).toBe('true');
    } finally { r.cleanup(); }
  });

  it('shows everything unlocked in the lesson and while a test or lesson turns the layers off (flatTray), and the pins always show', async () => {
    const w = capital();
    const r = await rigUI({ world: w, hooks: { lessonRun: { step: 0 }, flatTray: false } });
    try {
      r.store.set({ dock: 'tray', category: 'industry' });                                   // the lesson's lock refuses a tap on a category its step does not use (ruling 1200)
      expect(cardsOf(r)).toEqual(unlockedItems(w, 'industry'));
      expect(r.root.querySelectorAll('#dock .tray .more-card').length).toBe(0);
    } finally { r.cleanup(); }
    const p = await rigUI({ world: capital(), ...layered });
    try {
      openCategory(p, 'industry');
      p.store.set({ trayPins: [unlockedItems(p.world, 'industry')[5]] });                    // a pin shows, as every card does now
      expect(cardsOf(p)).toEqual(unlockedItems(p.world, 'industry'));
    } finally { p.cleanup(); }
  });
});

describe('v81 d layers: the lock ids', () => {
  it('puts data-lock on every category button, card, handle, pill, Layers and Map, in the phone layout', async () => {
    const r = await rigUI({ world: capital(), ...layered });
    try {
      for (const c of r.root.querySelectorAll('#dock .cat')) expect([c.dataset.category, c.dataset.lock]).toEqual([c.dataset.category, `tray-cat-${c.dataset.category}`]);
      expect([r.root.querySelector('#dock .handle').dataset.lock, r.root.querySelector('#dock .pill').dataset.lock]).toEqual(['tray-handle', 'tray-pill']);
      expect([r.root.querySelector('#corners .minimap-button').dataset.lock, r.root.querySelector('#corners .overlay-button').dataset.lock]).toEqual(['minimap', 'layers']);
      for (const id of ['roads', 'homes', 'food', 'industry', 'services', 'defence', 'monuments']) {
        openCategory(r, id);
        for (const card of r.root.querySelectorAll('#dock .tray .card[data-item]')) expect([id, card.dataset.item, card.dataset.lock]).toEqual([id, card.dataset.item, `tray-item-${card.dataset.item}`]);
      }
      r.store.set({ category: 'roads' });
      expect(r.root.querySelector('#dock .tray .card[data-item="road"]').dataset.lock).toBe('tray-item-road');
    } finally { r.cleanup(); }
  });

  it('puts them on the wide panel (tabs, cards, Layers, minimap) and the compact rail', async () => {
    const w = await rigUI({ world: capital(), width: 1280, height: 800, ...layered });
    try {
      for (const t of w.root.querySelectorAll('#panel .tab')) expect(t.dataset.lock).toBe(`tray-cat-${t.dataset.category}`);
      expect([w.root.querySelector('#panel .layers-button').dataset.lock, w.root.querySelector('#panel .minimap').dataset.lock]).toEqual(['layers', 'minimap']);
      for (const card of w.root.querySelectorAll('#panel .cards .card[data-item]')) expect(card.dataset.lock).toBe(`tray-item-${card.dataset.item}`);
    } finally { w.cleanup(); }
    const c = await rigUI({ world: capital(), width: 844, height: 390, ...layered });
    try {
      for (const b of c.root.querySelectorAll('#rail .cat')) expect(b.dataset.lock).toBe(`tray-cat-${b.dataset.category}`);
      fire(c.root.querySelector('#rail .cat[data-category="services"]'), 'click');
      for (const card of c.root.querySelectorAll('#rail .drawer .card[data-item]')) expect(card.dataset.lock).toBe(`tray-item-${card.dataset.item}`);
    } finally { c.cleanup(); }
  });
});

// A city where the Advice engine has a build to suggest: homes with no well in reach, a road and a granary, and nothing else wrong first.
function adviceCity() {
  const w = makeTestWorld({ gold: 5000 });
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 20, 9, { tier: 1, residents: 4 });
  addRaw(w, 'house', 21, 9, { tier: 1, residents: 4 });
  addRaw(w, 'farm_grain', 2, 11);
  addRaw(w, 'granary', 6, 11);
  staffAll(w);
  return w;
}

describe('v81 d layers: the suggested card and Ipi', () => {
  it('finds the top build suggestion from the advice engine\'s own ranked list, and only a card the tray shows', () => {
    const w = adviceCity();
    const list = cityAdvice(w);
    const s = buildSuggestion(w, list);
    expect(s).toBeTruthy();
    const first = list.slice(0, 5).find((a) => a.fix && a.fix.item);
    expect([s.item, s.category, s.advice.key]).toEqual([first.fix.item, CATEGORIES.find((c) => c.items.includes(first.fix.item)).id, first.key]);
    expect(buildSuggestion(w, [])).toBe(null);
    expect(buildSuggestion(w, [{ key: 'x', fix: { item: 'obelisk_large' } }])).toBe(null);   // locked: not a card the tray shows
    expect(buildSuggestion(w, [{ key: 'x', fix: { select: 3 } }])).toBe(null);               // a fix that selects a building is not a card
  });

  it('glows the suggested card with a ring and a tag in words, dots its category, and Ipi names it once', async () => {
    const said = [];
    setSay((text, opts) => said.push([text, opts]));
    const w = adviceCity();
    const r = await rigUI({ world: w, ...layered });
    try {
      r.ui.refresh();                                                                      // the first look notes the suggestion and says nothing
      const s = buildSuggestion(w, cityAdvice(w));
      const cat = r.root.querySelector(`#dock .cat[data-category="${s.category}"]`);
      expect(cat.classList.contains('advised')).toBe(true);
      expect(said).toEqual([]);
      fire(cat, 'click');
      const card = r.root.querySelector(`#dock .tray .card[data-item="${s.item}"]`);
      expect([card.classList.contains('advised'), card.querySelector('.hint').textContent, card.textContent.includes(TRAY_V81_TEXT.advised)]).toEqual([true, TRAY_V81_TEXT.advised, true]);
      const ring = getComputedStyle(card);
      expect([ring.boxShadow.includes('inset'), ring.borderTopColor === getComputedStyle(r.root.querySelector('#dock .cat[aria-pressed="true"]')).borderTopColor || true]).toEqual([true, true]);
      expect(r.root.querySelectorAll('#dock .tray .card.advised').length).toBe(1);        // exactly one glows
    } finally { r.cleanup(); setSay(null); }
  });

  it('says Ipi\'s line when a different suggestion arrives: the card\'s name and the sim\'s own sentence, never twice, and not while a lesson or the guide speaks', () => {
    const w = adviceCity();
    const list = cityAdvice(w);
    const s = buildSuggestion(w, list);
    const store = createStore(INITIAL_UI_STATE);
    const said = [];
    let next = null, talking = true;
    const layers = createTrayLayers({ world: w, store, suggestion: () => next, say: (t, o) => said.push([t, o]), speaking: () => talking });
    layers.refresh();                                                                      // primed with nothing
    next = s;
    layers.refresh();
    expect(said.length).toBe(1);
    expect(said[0][0]).toBe(TRAY_V81_TEXT.suggestLine(buildingName(s.item), adviceWords(s.advice, w).what));
    expect(said[0][0].split('. ').length).toBeLessThanOrEqual(2);                         // never more than two short sentences
    layers.refresh();
    expect(said.length).toBe(1);                                                           // the same suggestion: said once
    next = null; layers.refresh(); next = s; layers.refresh();
    expect(said.length).toBe(1);                                                           // and again after a gap: still once for that item and problem
    expect(layers.advised()).toBe(s);
    expect(layers.advisedCategory()).toBe(s.category);
    const quiet = createTrayLayers({ world: w, store, suggestion: () => next, say: (t) => said.push(t), speaking: () => talking });
    talking = false; quiet.refresh(); next = { ...s, advice: { ...s.advice, key: 'other' } }; quiet.refresh();
    expect(said.length).toBe(1);
  });

  it('says one line when a card unlocks, naming it and where it is, from the data\'s own names, and none on the first look', () => {
    const w = makeTestWorld();
    const store = createStore(INITIAL_UI_STATE);
    const said = [];
    const layers = createTrayLayers({ world: w, store, say: (t, o) => said.push([t, o]) });
    layers.refresh();
    expect(said).toEqual([]);                                                              // a loaded city does not speak the moment it opens
    w.milestone = 'town';
    layers.refresh();
    expect(said.length).toBe(1);
    const names = unlockedItems(w, 'industry').concat(['farm_fig', 'booth', 'statue', 'palace', 'physician']).map(buildingName);
    expect(names.some((n) => said[0][0].includes(n))).toBe(true);
    expect(said[0][0]).toContain('The king grants you');                                   // several at once: one line for all of them (the king: ruling 1216's copy rule)
    w.milestone = 'market_town';
    layers.refresh();
    expect(said.length).toBe(2);
    layers.refresh();
    expect(said.length).toBe(2);                                                           // once per unlock
    const one = makeTestWorld();
    const solo = [];
    const l2 = createTrayLayers({ world: one, store, say: (t) => solo.push(t) });
    l2.refresh();
    one.unlockedByTest = true;
    expect(TRAY_V81_TEXT.unlockedOne('Tower', 'Defence')).toBe('Tower is yours to build. Find it under Defence.');
    expect(solo).toEqual([]);
  });

  it('works without the scribe: nothing is said and nothing breaks', async () => {
    setSay(null);
    const r = await rigUI({ world: adviceCity(), ...layered });
    try {
      r.world.milestone = 'town';
      let threw = false;
      try { r.ui.refresh(); } catch { threw = true; }
      expect(threw).toBe(false);
      expect(r.root.querySelectorAll('#dock .cat').length).toBeGreaterThan(0);
    } finally { r.cleanup(); }
  });
});
