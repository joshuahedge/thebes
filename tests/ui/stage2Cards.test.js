import { describe, it, expect } from '../harness.js';
import { cardInfo, renderCards, cardShown, shownItems, shownCategories } from '../../src/ui/cards.js';
import { CATEGORIES } from '../../src/data/ui.js';
import { MILESTONES } from '../../src/data/progression.js';
import { BUILDINGS, BUILDABLE } from '../../src/data/buildings.js';
import { GOODS } from '../../src/data/goods.js';
import { TIPS, TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';
import { updateMilestone } from '../../src/sim/progression.js';
import { produceDay, storeAccepts } from '../../src/sim/production.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { settle } from '../../src/sim/settle.js';
import { buildingAt } from '../../src/sim/world.js';
import { problemMarkers } from '../../src/render/overlays.js';
import { alertText, warningText, effectText, goodLine, goodName, workingText, waitingText, TIP_TEXT, T } from '../../src/ui/text.js';
import { select } from '../../src/ui/modes.js';
import { nudgeLineText } from '../../src/ui/nudge.js';
import { toolPreview } from '../../src/ui/placement.js';
import { setAccept } from '../../src/sim/commands.js';
import { costOf } from '../../src/sim/costs.js';
import { makeTestWorld, setRoad, addRaw, staffAll, layClay } from '../helpers/testWorld.js';
import { mount, fire, key } from '../helpers/dom.js';
import { rigUI, uiWorld, runningUiWorld } from '../helpers/uiWorld.js';
import { contrastIn } from '../helpers/contrast.js';

const ids = (list) => list.map((c) => c.id);
const catsOf = (r, sel) => [...r.root.querySelectorAll(sel)].map((b) => b.dataset.category);
const SHOWN = ['roads', 'homes', 'food', 'industry', 'services'];

describe('ui stage 2 cards', () => {
  it('shows what is unlocked and what the next milestone brings, locked, and hides the rest', () => {
    const w = makeTestWorld();
    expect(ids(shownCategories(w))).toEqual(SHOWN);                                 // Industry shows at Village: its Town cards, locked
    expect(shownItems(w, 'homes')).toEqual(['house', 'garden', 'statue']);
    expect(shownItems(w, 'food')).toEqual(['farm_grain', 'farm_fig', 'granary', 'hunting_lodge', 'fishing_wharf']);   // Stage 4.6: the River track's two, locked until Town
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'storehouse']);
    expect(shownItems(w, 'services')).toEqual(['well', 'bazaar', 'temple', 'booth', 'firehouse', 'physician', 'palace', 'nilometer']);   // Stage 4: the palace comes with Town; Stage 4.5: the physician too; Stage 4.6: the Nilometer
    expect(shownItems(w, 'defence')).toEqual([]);                                     // Market town's cards: hidden until Town
    expect([cardInfo(w, 'garden').locked, cardInfo(w, 'statue').locked, cardInfo(w, 'potter').lockText]).toEqual([false, true, 'Unlocks at Town']);
    w.milestone = 'town';
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'storehouse', 'trading_post']);
    expect(cardInfo(w, 'trading_post').lockText).toBe('Unlocks at Market town');
    expect(shownItems(w, 'defence').map((i) => [i, cardInfo(w, i).locked])).toEqual([['wall', true], ['gate', true], ['tower', true], ['barracks', true], ['archery_range', true], ['stables', true]]);   // Stage 4.5: the Gate card comes after the Wall; Stage 4.6: the Armies track's two
    w.milestone = 'market_town';
    expect(shownItems(w, 'industry')).toEqual(['clay_pit', 'potter', 'farm_barley', 'brewery', 'storehouse', 'trading_post']);
    w.milestone = 'city';
    expect(shownItems(w, 'industry').filter((i) => cardInfo(w, i).locked)).toEqual(['farm_flax', 'weaver']);
    expect(shownItems(w, 'industry').includes('gem_mine')).toBe(false);              // Capital's cards stay hidden until Great city
    w.milestone = 'capital';
    for (const c of CATEGORIES) {
      // Stage 4: the pyramids also need prestige; the small one shows locked with its count, the great one once that unlocks.
      const items = c.items.filter((i) => i !== 'pyramid_great' && i !== 'large_plot');   // Version 6.0: the Large plot card shows from the first Townhouse, not with a milestone
      expect([c.id, shownItems(w, c.id)]).toEqual([c.id, items]);
      for (const item of items) expect([item, cardInfo(w, item).locked]).toEqual([item, item === 'pyramid_small']);
    }
    expect(cardShown(w, 'road') && cardShown(w, 'demolish')).toBe(true);
  });
  it('puts every building in exactly one category and unlocks each at a milestone', () => {
    for (const type of BUILDABLE) {                                                    // gates and rubble have no card
      expect([type, CATEGORIES.filter((c) => c.items.includes(type)).length]).toEqual([type, 1]);
      if (!['pyramid_small', 'pyramid_great'].includes(type)) expect([type, MILESTONES.some((m) => m.unlocks.includes(type))]).toEqual([type, true]);   // Stage 4: the pyramids unlock by prestige
    }
  });
  it('adds a category button in the dock, rail and panel when a milestone gives it a card, and its number key follows', async () => {
    const defence = CATEGORIES.find((c) => c.id === 'defence');
    const r = await rigUI({ width: 390, height: 844 });
    try {
      defence.items.push('trading_post');                                            // stands in for Stage 3: a defence card that comes with Market town
      r.ui.refresh();
      for (const sel of ['#dock .cat', '#rail .cat', '#panel .tab']) expect([sel, catsOf(r, sel)]).toEqual([sel, SHOWN]);
      key(r.root, '6');
      expect(r.store.get().category).toBe('roads');                                  // nothing to show there yet: ignored
      r.world.milestone = 'town';                                                    // Market town is next: its card shows, locked
      r.ui.refresh();
      for (const sel of ['#dock .cat', '#rail .cat', '#panel .tab']) expect([sel, catsOf(r, sel)]).toEqual([sel, [...SHOWN, 'defence']]);
      expect(r.root.querySelector('#rail .drawer').previousElementSibling.dataset.category).toBe('defence');   // the rail's categories come before its drawer
      key(r.root, '6');
      expect(r.store.get().category).toBe('defence');
      expect(r.root.querySelector('#dock .tray [data-item="trading_post"]').getAttribute('aria-disabled')).toBe('true');
    } finally { defence.items.pop(); r.cleanup(); }
  });
  it("marks a milestone's new buildings New, in words, until one is placed", async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      buildingAt(r.world, 12, 9).residents = MILESTONES.find((m) => m.id === 'town').population;
      updateMilestone(r.world);
      r.ui.refresh();
      fire(r.root.querySelector('#dock .cat[data-category="industry"]'), 'click');
      const card = (item) => r.root.querySelector(`#dock .tray [data-item="${item}"]`);
      expect(card('clay_pit').querySelector('.new-badge').textContent).toBe(T.newBadge);
      expect(card('clay_pit').textContent).toContain(T.newBadge);                    // part of the card's name, so not colour alone
      expect(card('trading_post').querySelector('.new-badge')).toBe(null);           // locked: next milestone, not new
      expect(cardInfo(r.world, 'potter').isNew).toBe(true);
      layClay(r.world, 17, 11);
      r.ui.placement.start({ kind: 'building', type: 'clay_pit' }, { x: 17, y: 11 });
      expect(r.ui.placement.confirm().ok).toBe(true);
      expect(r.world.newItems.includes('clay_pit')).toBe(false);
      expect(card('clay_pit').querySelector('.new-badge')).toBe(null);
      expect(card('potter').querySelector('.new-badge')).toBeTruthy();
    } finally { r.cleanup(); }
  });
  it('shows a New badge only on an unlocked card', () => {
    const { root, cleanup } = mount();
    try {
      const w = makeTestWorld();
      w.newItems = ['statue'];
      renderCards(root, { world: w, category: 'homes', onPick: () => {} });
      expect(root.querySelector('[data-item="statue"] .new-badge')).toBe(null);      // a Village city has not unlocked it
      w.milestone = 'town';
      renderCards(root, { world: w, category: 'homes', onPick: () => {} });
      expect(root.querySelector('[data-item="statue"]').classList.contains('new')).toBe(true);
      expect(root.querySelector('[data-item="garden"] .new-badge')).toBe(null);
    } finally { cleanup(); }
  });
  it('says what a workshop is doing, names its input when it waits, and flags it on the map', async () => {
    const w = makeTestWorld();
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const store = addRaw(w, 'storehouse', 12, 11, { store: { clay: 3 } });
    const potter = addRaw(w, 'potter', 16, 11);
    staffAll(w);
    produceDay(w);
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), potter.id));
      expect(r.root.querySelector('#sheet .work-status').textContent).toBe('Making pottery from clay');
      store.store.clay = 0;
      produceDay(w);
      r.ui.refresh();
      expect(potter.blocked).toBe('no_input');
      expect(r.root.querySelector('#sheet .work-status').textContent).toBe(waitingText('clay'));
      const problem = r.root.querySelector('#sheet .problem');
      expect(problem.textContent).toContain('Potter has no clay in reach');
      expect(problem.textContent).toContain(`Store clay within ${BUILDINGS.potter.producerReach} road tiles: a clay pit fills a storehouse`);
      expect(problemMarkers(w, alertsFor(w)).some((m) => m.id === potter.id && m.kind === 'problem')).toBe(true);
      potter.paused = true;
      r.ui.refresh();
      expect(r.root.querySelector('#sheet .work-status').textContent).toBe(T.notWorking);
      r.store.set(select(r.store.get(), store.id));
      expect(r.root.querySelector('#sheet .work-status')).toBe(null);                // storage makes nothing
    } finally { r.cleanup(); }
  });
  it("lists a storehouse's goods as switches that accept or refuse each one through the sim, and a granary's as rows", async () => {
    const w = uiWorld();
    w.milestone = 'town';
    const sh = addRaw(w, 'storehouse', 17, 11, { store: { pottery: 12 } });
    staffAll(w);
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), sh.id));
      const switches = [...r.root.querySelectorAll('#sheet .store-goods .switch')];
      expect(switches.map((s) => s.dataset.good)).toEqual(BUILDINGS.storehouse.stores);
      const pottery = r.root.querySelector('#sheet .switch[data-good="pottery"]');
      expect([pottery.getAttribute('role'), pottery.getAttribute('aria-checked'), pottery.querySelector('.state').textContent]).toEqual(['switch', 'true', T.accepted]);
      expect(pottery.textContent.startsWith(`${goodName('pottery')} 12`)).toBe(true);
      expect(pottery.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(pottery.closest('li').querySelector('.good-line').textContent).toBe(goodLine('pottery'));
      expect([...r.root.querySelectorAll('#sheet .row')].some((row) => row.textContent === `${T.stored}12 of ${BUILDINGS.storehouse.capacity}`)).toBe(true);
      pottery.focus();
      fire(pottery, 'click');
      expect(sh.accepts.pottery).toBe(false);
      const again = r.root.querySelector('#sheet .switch[data-good="pottery"]');
      expect([again.getAttribute('aria-checked'), again.querySelector('.state').textContent]).toEqual(['false', T.refused]);
      expect(document.activeElement).toBe(again);                                    // the rebuilt sheet keeps keyboard focus
      fire(again, 'click');
      expect(storeAccepts(sh, 'pottery')).toBe(true);                                // accepting takes the refusal away: the entry goes
      r.store.set(select(r.store.get(), buildingAt(w, 6, 11).id));                    // the granary
      expect(r.root.querySelectorAll('#sheet .store-goods .switch').length).toBe(0);
      expect([...r.root.querySelectorAll('#sheet .store-goods li')].map((li) => li.dataset.good)).toEqual(BUILDINGS.granary.stores);
    } finally { r.cleanup(); }
  });
  it("words storage and input problems, and a producer's warnings, by its own goods", () => {
    const w = makeTestWorld();
    const farm = addRaw(w, 'farm_grain', 0, 0), fig = addRaw(w, 'farm_fig', 0, 4), potter = addRaw(w, 'potter', 10, 0), sh = addRaw(w, 'storehouse', 14, 0);
    const reach = BUILDINGS.potter.producerReach;
    expect(alertText({ code: 'no_storage', id: farm.id }, w)).toEqual({ title: 'Grain farm has nowhere to store its grain', fix: `Build a granary within ${BUILDINGS.farm_grain.producerReach} road tiles` });
    expect(alertText({ code: 'no_storage', id: potter.id }, w)).toEqual({ title: 'Potter has nowhere to store its pottery', fix: `Build a storehouse within ${reach} road tiles` });
    expect(alertText({ code: 'no_storage', id: fig.id }, w).title).toBe('Fig orchard has nowhere to store its figs');
    expect(alertText({ code: 'storage_full', id: farm.id }, w).fix).toBe('Build another granary nearby');
    expect(alertText({ code: 'storage_full', id: potter.id }, w).fix).toBe('Build another storehouse nearby');
    expect(alertText({ code: 'storage_full', id: sh.id }, w)).toEqual({ title: 'Storehouse is full', fix: 'Build another storehouse nearby' });
    expect(alertText({ code: 'no_input', id: potter.id }, w)).toEqual({ title: 'Potter has no clay in reach', fix: `Store clay within ${reach} road tiles: a clay pit fills a storehouse` });
    for (const [type, title, maker] of [['brewery', 'Brewery has no barley in reach', 'a barley farm'], ['weaver', 'Weaver has no flax in reach', 'a flax farm'], ['jeweller', 'Jeweller has no gems in reach', 'a gem mine']]) {
      const b = addRaw(w, type, 20, 20);
      const t = alertText({ code: 'no_input', id: b.id }, w);
      expect([type, t.title, t.fix.includes(maker)]).toEqual([type, title, true]);
    }
    expect(warningText('no_storage', 'potter')).toBe('No storehouse within reach');
    expect(warningText('no_storage', 'farm_grain')).toBe('No granary within reach');
    expect(warningText('no_storage')).toBe('No granary within reach');
    expect(warningText('no_input', 'weaver')).toBe('No flax in reach yet');
    expect(effectText('booth', 3)).toBe('Entertains 3 homes');
  });
  it("prices the nudge's fix for a store or an input by the building that fixes it", () => {
    const w = makeTestWorld();
    w.milestone = 'town';
    const sh = addRaw(w, 'storehouse', 14, 0), potter = addRaw(w, 'potter', 10, 0), farm = addRaw(w, 'farm_grain', 0, 0);
    const line = (a) => nudgeLineText(w, [a], null);
    const said = (a) => { const t = alertText(a, w); return `${T.next}: ${t.title}. ${t.fix}`; };
    w.gold = costOf(w, 'storehouse');                                               // less than a granary costs
    expect(costOf(w, 'storehouse')).toBeLessThan(costOf(w, 'granary'));
    for (const a of [{ code: 'storage_full', id: sh.id }, { code: 'no_storage', id: potter.id }]) expect(line(a)).toBe(said(a));
    expect(line({ code: 'no_storage', id: farm.id })).toBe('');                      // a granary is out of reach
    w.gold = costOf(w, 'clay_pit') - 1;
    expect(line({ code: 'no_input', id: potter.id })).toBe('');
    w.gold = costOf(w, 'clay_pit');
    expect(line({ code: 'no_input', id: potter.id })).toBe(said({ code: 'no_input', id: potter.id }));
  });
  it("says so when a storehouse in reach refuses a producer's good, in the ghost line, the alert, the nudge and the help", () => {
    const w = makeTestWorld();
    w.milestone = 'town';
    setRoad(w, 0, 10, 31, 10);
    const sh = addRaw(w, 'storehouse', 14, 11);
    const pit = addRaw(w, 'clay_pit', 10, 11);
    staffAll(w);
    layClay(w, 20, 11);
    const ghost = (world, x, y) => toolPreview(world, { tool: { kind: 'building', type: 'clay_pit' }, ghost: { x, y } });
    const alert = { code: 'no_storage', id: pit.id };
    expect(ghost(w, 20, 11).warnings).toEqual([]);                                   // the storehouse takes clay
    expect(setAccept(w, sh.id, 'clay', false).ok).toBe(true);
    const refused = ghost(w, 20, 11);
    expect([refused.state, refused.warnings, refused.text]).toEqual(['warn', ['no_storage'], 'No storehouse in reach accepts clay']);
    produceDay(w);
    expect(pit.blocked).toBe('no_storage');
    expect(alertText(alert, w)).toEqual({ title: 'Clay pit has nowhere to store its clay', fix: 'Let a storehouse in reach accept clay, or build another' });
    w.gold = 0;
    expect(nudgeLineText(w, [alert], null)).toBe(`${T.next}: Clay pit has nowhere to store its clay. Let a storehouse in reach accept clay, or build another`);   // a switch costs nothing
    // A refusing storehouse out of reach is not the cause: the plain words stay, and building one still costs gold.
    const far = makeTestWorld();
    far.milestone = 'town';
    setRoad(far, 0, 10, 31, 10);
    const distant = addRaw(far, 'storehouse', 28, 11);
    const lone = addRaw(far, 'clay_pit', 2, 11);
    layClay(far, 6, 11);
    setAccept(far, distant.id, 'clay', false);
    expect(ghost(far, 6, 11).text).toBe('No storehouse within reach');
    expect(alertText({ code: 'no_storage', id: lone.id }, far).fix).toBe(`Build a storehouse within ${BUILDINGS.clay_pit.producerReach} road tiles`);
    far.gold = 0;
    expect(nudgeLineText(far, [{ code: 'no_storage', id: lone.id }], null)).toBe('');
    expect(T.acceptHelp).toContain('or production stops');
    expect(TIP_TEXT.storehouse_choices).toContain('production stops');
  });
  it('keeps a locked card readable: only its picture fades, its words stay at 4.5:1 in the panel and the rail drawer', async () => {
    for (const [width, height] of [[1280, 800], [844, 390]]) {
      const r = await rigUI({ width, height });
      try {
        if (width === 1280) r.store.set({ category: 'industry' });
        else fire(r.root.querySelector('#rail .cat[data-category="industry"]'), 'click');
        const card = r.root.querySelector(`${width === 1280 ? '#panel' : '#rail .drawer'} .card[data-item="potter"]`);
        expect([width, card.classList.contains('locked'), card.getAttribute('aria-disabled')]).toEqual([width, true, 'true']);
        expect(card.querySelector('.cost').textContent).toContain('Unlocks at Town');           // the lock says it in words
        expect([width, getComputedStyle(card).opacity]).toEqual([width, '1']);
        expect(Number(getComputedStyle(card.querySelector('.thumb')).opacity)).toBeLessThan(1);
        for (const sel of ['.name', '.cost']) expect([width, sel, contrastIn(card.querySelector(sel), card) >= 4.5]).toEqual([width, sel, true]);
      } finally { r.cleanup(); }
    }
  });
  it('gives every good its name and a line saying what makes it, what uses it and who trades it', () => {
    expect(goodLine('pottery')).toBe('Pottery: made by potters from clay; used by Townhouses and up; sold to Memphis and Byblos');
    expect(goodLine('clay')).toBe('Clay: made by clay pits; used by potters and brickworks; bought from Memphis');
    expect(goodLine('grain')).toBe('Grain: made by grain farms; used by Cottages and up; sold to Memphis');
    expect(goodLine('beer')).toBe('Beer: made by breweries from barley; used by Fine manors and up; sold to Memphis; bought from Byblos');
    for (const g of Object.keys(GOODS)) {
      expect([g, goodName(g)]).toEqual([g, GOODS[g].name]);
      expect([g, goodLine(g).startsWith(`${GOODS[g].name}: made by `), goodLine(g).includes('used by')]).toEqual([g, true, true]);
    }
    expect([workingText('farm_fig'), workingText('clay_pit'), workingText('gem_mine'), workingText('weaver')]).toEqual(['Growing figs', 'Digging clay', 'Mining gems', 'Making linen from flax']);
  });
  it('brings the storehouse tip once one is placed and the tool closes', async () => {
    let t = 0;
    const r = await rigUI({ now: () => t, world: runningUiWorld() });
    try {
      settle(r.world, []);
      r.world.milestone = 'town';
      t = TIP_FIRST_DELAY_MS;
      r.ui.placement.start({ kind: 'building', type: 'storehouse' }, { x: 17, y: 11 });
      expect(r.ui.placement.confirm().ok).toBe(true);
      r.ui.placement.cancel();
      const tip = TIPS.find((x) => x.trigger === 'storehousePlaced');
      expect(r.ui.tips.current()).toBe(tip.id);
      expect(r.root.querySelector('#tip .text').textContent).toBe(TIP_TEXT[tip.id]);
    } finally { r.cleanup(); }
  });
});
