// Version 6.0, Track C: the Large plot in the interface, each thing set up both ways: the card (hidden until the first Townhouse, then with its price and a New badge until
// one is laid), the placing bar and what it says before the tap, the sheet, the step line and the City advice (every number and name from the sim), Home progress, Build
// another, the tips, and the first and How to play words.
import { describe, it, expect } from '../../harness.js';
import { TIERS } from '../../../src/data/housing.js';
import { LARGE_PLOT } from '../../../src/data/largePlots.js';
import { ADVICE } from '../../../src/data/advice.js';
import { TIPS } from '../../../src/data/tips.js';
import { FIRSTS } from '../../../src/data/firsts.js';
import { cardInfo, cardShown, shownItems, renderCards } from '../../../src/ui/cards.js';
import { toolPreview, ghostsFor } from '../../../src/ui/placement.js';
import { drawThumb } from '../../../src/ui/thumbs.js';
import { anotherFor } from '../../../src/ui/another.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { stepWords } from '../../../src/ui/nextStepText.js';
import { LARGE_TEXT, TIP_TEXT, TIP_HELP_TEXT, FIRST_TEXT, V60_HELP, T } from '../../../src/ui/text.js';
import { createLargePlotUi } from '../../../src/ui/v60/largePlot.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { openSheet, select } from '../../../src/ui/modes.js';
import { cityAdvice, nextStep } from '../../../src/sim/advice.js';
import { homeProgress } from '../../../src/sim/layers.js';
import { monthlyHousing } from '../../../src/sim/housing.js';
import { noteLargePlotUnlock } from '../../../src/sim/largePlots.js';
import { costOf } from '../../../src/sim/costs.js';
import { place } from '../../../src/sim/commands.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { mount, fire } from '../../helpers/dom.js';

const CARD = { kind: 'building', type: LARGE_PLOT.type };
const withTownhouse = (w) => addRaw(w, 'house', 20, 9, { tier: 5, residents: 22, stockedFor: 22, stock: { grain: 6, pottery: 2 } });

describe('v60 c large plot card', () => {
  it('is hidden until the city has a Townhouse, then shows after the plot card with its price per lot and a New badge until one is laid', async () => {
    const w = uiWorld();
    expect([cardShown(w, LARGE_PLOT.type), shownItems(w, 'homes').includes(LARGE_PLOT.type), cardInfo(w, LARGE_PLOT.type).locked]).toEqual([false, false, true]);
    withTownhouse(w);
    noteLargePlotUnlock(w);
    expect(shownItems(w, 'homes').slice(0, 2)).toEqual(['house', LARGE_PLOT.type]);
    const info = cardInfo(w, LARGE_PLOT.type);
    expect([info.name, info.cost, info.costText, info.affordable, info.locked, info.isNew]).toEqual(['Large plot', costOf(w, LARGE_PLOT.type), `${costOf(w, LARGE_PLOT.type)} gold per lot`, true, false, true]);
    const { root, cleanup } = mount();
    try {
      renderCards(root, { world: w, category: 'homes', onPick: () => {} });
      const card = root.querySelector(`[data-item="${LARGE_PLOT.type}"]`);
      expect([Boolean(card), card.querySelector('.new-badge').textContent]).toEqual([true, T.newBadge]);
      expect(card.textContent).toContain('Large plot');
    } finally { cleanup(); }
    const c = drawThumb(document.createElement('canvas'), LARGE_PLOT.type, 1);   // the card's picture is the marked lot
    let ink = 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 40) ink++;
    expect(ink).toBeGreaterThan(150);
    w.gold = -490;                                                                  // the debt floor is near: the card says it cannot be paid
    expect(cardInfo(w, LARGE_PLOT.type).affordable).toBe(false);
  });
  it('is used up by the first lot laid: no New badge after it, and the first words say what a Large plot is', () => {
    const w = uiWorld();
    withTownhouse(w);
    monthlyHousing(w);
    expect(w.newItems.includes(LARGE_PLOT.type)).toBe(true);
    expect(place(w, LARGE_PLOT.type, 20, 11).ok).toBe(true);
    expect([w.newItems.includes(LARGE_PLOT.type), cardInfo(w, LARGE_PLOT.type).isNew]).toEqual([false, false]);
    const first = FIRSTS.find((f) => f.id === 'first_large_plot');
    expect(first.check).toEqual({ kind: 'tally', key: 'largePlots', n: 1 });
    expect(FIRST_TEXT.first_large_plot.why).toContain(TIERS[LARGE_PLOT.opensTier].name);
    expect(FIRST_TEXT.first_manor.why.includes('Four homes')).toBe(false);          // the old words said four homes became one
  });
});

describe('v60 c large plot placing bar', () => {
  it('says before the tap what it will do, shows the 2x2 footprint and no street or score line, and a refusal says why', async () => {
    const w = uiWorld();
    withTownhouse(w);
    noteLargePlotUnlock(w);
    const r = await rigUI({ world: w });
    try {
      r.ui.placement.start(CARD, { x: 18, y: 11 });
      const s = r.store.get();
      expect(s.tool).toEqual(CARD);
      const p = toolPreview(w, s);
      expect([p.state, p.text, p.cost, p.count, p.nicer, p.score, p.upkeep, p.footprint.length]).toEqual(['ok', LARGE_TEXT.bar, 20, 1, '', '', '', 4]);
      expect(ghostsFor(w, s).map((g) => [g.w, g.d])).toEqual([[2, 2]]);
      expect(p.conditions.map((c) => c.key)).toEqual(['ground', 'road']);          // the road chip is in the bar as a plot's is; the gold chip only when short
      r.ui.placement.pointAt(12, 10);                                             // on the road: refused, with the sim's own word
      const bad = toolPreview(w, r.store.get());
      expect([bad.state, bad.reason]).toEqual(['bad', 'occupied']);
      r.ui.placement.pointAt(20, 2);                                              // no road touches it: let through with the plot's own hint
      const warn = toolPreview(w, r.store.get());
      expect([warn.state, warn.warnings]).toEqual(['warn', ['needs_road']]);
      r.ui.placement.pointAt(18, 11);
      const done = r.ui.placement.confirm();
      expect([done.ok, w.buildings[done.id].large, w.buildings[done.id].w, w.tally.largePlots]).toEqual([true, true, 2, 1]);
    } finally { r.cleanup(); }
  });
  it('is refused as locked before the first Townhouse, with the sim\'s reason', async () => {
    const w = uiWorld();
    const r = await rigUI({ world: w });
    try {
      r.ui.placement.start(CARD, { x: 18, y: 11 });
      const p = toolPreview(w, r.store.get());
      expect([p.state, p.reason]).toEqual(['bad', 'locked']);
      expect(r.ui.placement.confirm().ok).toBe(false);
      expect(w.tally.largePlots).toBe(0);
    } finally { r.cleanup(); }
  });
});

describe('v60 c large plot sheet and step', () => {
  // A road along y = 10; a lot at (12, 11); a well, a temple and a bazaar (grain and pottery on its stall) beside it. entertainment is the one thing missing.
  function lotStreet() {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    withTownhouse(w);
    const lot = addRaw(w, 'house', 12, 11, { tier: 0, w: 2, d: 2, large: true });
    addRaw(w, 'well', 12, 9);
    addRaw(w, 'temple', 14, 8);
    addRaw(w, 'bazaar', 9, 11, { store: { grain: 100, pottery: 100 } });
    staffAll(w);
    return { w, lot };
  }
  it('says "Opens when" with its note and every Manor row, and the step line names the first missing one with its price', async () => {
    const { w, lot } = lotStreet();
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), lot.id));
      expect(r.root.querySelector('#sheet h2').textContent).toBe('Large plot');
      expect(r.root.querySelector('#sheet .opens-head').textContent).toBe(LARGE_TEXT.opensHead);
      expect(r.root.querySelector('#sheet .muted:not(.opens-note)').textContent).toBe(LARGE_TEXT.waiting);
      const rows = [...r.root.querySelectorAll('#sheet .opens-list li')].map((li) => [li.dataset.need, li.classList.contains('met')]);
      expect(rows).toEqual([['road', true], ['water', true], ['food', true], ['religion', true], ['pottery', true], ['entertainment', false], ['desirability', false]]);
      const step = nextStep(w, lot);
      const words = stepWords(w, lot, step);
      expect([step.reason, step.need, step.fix.item, words.text.startsWith('Next step: a booth near here')]).toEqual([null, 'entertainment', 'booth', true]);
      expect(r.root.querySelector('#sheet .step-line .step-text').textContent).toBe(words.text);
    } finally { r.cleanup(); }
  });
  it('says people move in as a Manor once every row is met, and a Townhouse beside a lot is simply kept', () => {
    const { w, lot } = lotStreet();
    addRaw(w, 'booth', 16, 11);
    for (const [x, y] of [[11, 11], [11, 12], [14, 11], [14, 12]]) addRaw(w, 'statue', x, y);
    staffAll(w);
    const step = nextStep(w, lot);
    expect([step.reason, stepWords(w, lot, step).text]).toEqual(['empty', `Empty: ${LARGE_TEXT.ready}`]);
    const town = Object.values(w.buildings).find((b) => b.type === 'house' && b.tier === 5);
    addRaw(w, 'well', 21, 11);
    addRaw(w, 'temple', 23, 11);
    staffAll(w);
    town.stock = { grain: 6, pottery: 2 };
    const kept = nextStep(w, town);
    expect([kept.reason, stepWords(w, town, kept).text]).toEqual(['kept', `Kept: ${LARGE_TEXT.kept}`]);
  });
  it('builds another Large plot from a lot\'s sheet: the card in hand at the nearest free tile, at its own price', () => {
    const { w, lot } = lotStreet();
    const r = anotherFor(w, lot);
    expect([r.ok, r.tool, r.item, r.cost]).toEqual([true, CARD, LARGE_PLOT.type, costOf(w, LARGE_PLOT.type)]);
    w.gold = -490;
    const no = anotherFor(w, lot);
    expect([no.ok, no.reason]).toEqual([false, 'no_gold']);
  });
});

describe('v60 c large plot advice and Home progress', () => {
  it('names a Large plot once Townhouses have every need met and none stands: one item, a Manor\'s weight, the price and Show me, gone when one is laid', () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'well', 14, 11);
    addRaw(w, 'temple', 20, 11);
    const bazaar = addRaw(w, 'bazaar', 9, 11);
    bazaar.store = { grain: 300, pottery: 300 };
    const homes = [12, 13].map((x) => addRaw(w, 'house', x, 9, { tier: 5, residents: 22, stockedFor: 22, stock: { grain: 6, pottery: 2 } }));
    staffAll(w);
    const [a] = cityAdvice(w).filter((x) => x.data && x.data.need === 'large');
    expect([a.kind, a.count, a.weight, a.fix.item, a.cost, a.afford, a.data.homes]).toEqual(['home_need', 2, ADVICE.largePlot, LARGE_PLOT.type, costOf(w, LARGE_PLOT.type), true, homes.map((h) => h.id)]);
    const t = adviceWords(a, w);
    expect([t.what, t.why, t.fix, t.cost, t.short, t.action.label]).toEqual([LARGE_TEXT.adviceWhat(2), LARGE_TEXT.adviceWhy, LARGE_TEXT.adviceFix, `Large plot: ${a.cost} gold`, false, 'Show me']);
    expect(nextStep(w, homes[0]).fix).toEqual({ item: LARGE_PLOT.type, at: 'near', target: { x: 12.5, y: 9.5 } });
    w.gold = -490;
    expect(adviceWords(cityAdvice(w).find((x) => x.data && x.data.need === 'large'), w).short).toBe(true);   // the price says what the treasury has
    w.gold = 5000;
    expect(place(w, LARGE_PLOT.type, 20, 13).ok).toBe(true);
    expect(cityAdvice(w).some((x) => x.data && x.data.need === 'large')).toBe(false);
    expect(nextStep(w, homes[0]).reason).toBe('kept');
  });
  it('shows an empty lot in Home progress like a home: the first missing need, a number for more, a tick when every row is met', () => {
    const w = makeTestWorld({ gold: 5000 });
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const lot = addRaw(w, 'house', 12, 11, { tier: 0, w: 2, d: 2, large: true });
    const empty = addRaw(w, 'house', 20, 11);                                      // an ordinary empty plot beside a road: nothing to show
    let marks = homeProgress(w);
    const m = marks.find((x) => x.id === lot.id);
    expect([m.state, m.first, m.missing.includes('water')]).toEqual(['many', 'water', true]);
    expect(marks.some((x) => x.id === empty.id)).toBe(false);
  });
});

describe('v60 c large plot seam, tips and words', () => {
  it('says the card\'s tip once the city has it, and the sheet\'s tip when an empty lot\'s sheet opens', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const store = createStore(INITIAL_UI_STATE);
    const fired = [];
    const ui = createLargePlotUi({ world: w, store, fireTip: (k) => fired.push(k) });
    ui.refresh();
    expect(fired).toEqual([]);                                                    // no Townhouse: no card, no tip
    withTownhouse(w);
    ui.refresh();
    ui.onEvents([{ type: 'month' }]);
    expect(fired).toEqual(['largePlotCard', 'largePlotCard']);
    const lot = addRaw(w, 'house', 12, 11, { tier: 0, w: 2, d: 2, large: true });
    const plain = addRaw(w, 'house', 16, 11);
    store.set(select(store.get(), plain.id));
    store.set(select(store.get(), lot.id));
    expect(fired.filter((k) => k === 'largePlotSheet').length).toBe(1);
    ui.destroy();
    store.set(openSheet(store.get(), 'summary'));
    expect(fired.filter((k) => k === 'largePlotSheet').length).toBe(1);           // destroyed: it stops listening
  });
  it('has both tips with their words in How to play, the old merging tip reworded, and a How to play paragraph', () => {
    for (const id of ['large_plot_card', 'large_plot_lot']) {
      expect([id, Boolean(TIPS.find((t) => t.id === id)), TIP_TEXT[id].split(/\s+/).length <= 20, TIP_HELP_TEXT[id].split(/\s+/).length <= 20]).toEqual([id, true, true, true]);
    }
    expect(TIPS.find((t) => t.id === 'large_plot_lot').waits).toBe(false);          // its words are about the sheet on screen
    expect(TIP_TEXT.merging_homes.includes('three plots')).toBe(false);
    expect(TIP_TEXT.merging_homes).toContain('Large plot');
    expect(V60_HELP.c.length).toBe(1);
    expect(V60_HELP.c[0].text).toContain(LARGE_TEXT.opensHead);
  });
});
