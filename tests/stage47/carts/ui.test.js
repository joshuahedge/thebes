// Stage 4.7 Task 6 (ruling 467): the Fetch control on a store's sheet, and the goods on the road in its stock rows. Every sentence is checked against the sim's own function and
// the words (S47_CARTS_TEXT), set up both ways: with and without a source, a source with an order of its own and one without, a refusal with a store that holds the good
// and without, an order on and off. Toggle and stepper call setFetch and clearFetch; the controls have accessible names.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { select } from '../../../src/ui/modes.js';
import { cartDay, setFetch, fetchPreview, fetchStatus, roadGoods, holderOf, cartOf } from '../../../src/sim/carts.js';
import { demolishAt, setAccept } from '../../../src/sim/commands.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { CARTS } from '../../../src/data/s47.js';
import { S47_CARTS_TEXT as W } from '../../../src/ui/text.js';
import { createCartsUi } from '../../../src/ui/s47/carts.js';
import { devScene } from '../../../src/dev/scenes.js';
import { cartsAt } from '../../../src/render/carts.js';

const step = (w, n = 1) => { for (let i = 0; i < n; i++) { cartDay(w); w.day += 1; } };
const click = (node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

// A street (y = 10) with a home storehouse at x 2 and a source at x 30 holding 80 pottery and 60 linen, both staffed.
function world() {
  const w = makeTestWorld({ size: 64, fertile: [], gold: 1000 });
  setRoad(w, 0, 10, 63, 10);
  const home = addRaw(w, 'storehouse', 2, 11, { staff: 6, store: {} });
  const far = addRaw(w, 'storehouse', 30, 11, { staff: 6, store: { pottery: 80, linen: 60 } });
  return { w, home, far };
}
const open = async (w, home) => {
  const r = await rigUI({ world: w, width: 390, height: 844 });
  r.store.set(select(r.store.get(), home.id));
  return r;
};
const panel = (r) => r.root.querySelector('#sheet .fetch-panel');
const head = (r) => r.root.querySelector('#sheet .fetch-head');
const row = (r, good) => r.root.querySelector(`#sheet .fetch-good[data-good="${good}"]`);
const lineOf = (li, cls) => { const n = li.querySelector(cls); return n ? n.textContent : null; };
const expand = (r) => { if (head(r).getAttribute('aria-expanded') !== 'true') click(head(r)); };

describe('s47 carts ui: the Fetch row', () => {
  it('is one collapsed row under "Stored", with the order count, and opens to a row for each good the store may hold', async () => {
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expect(panel(r) === null).toBe(false);
      expect(head(r).getAttribute('aria-expanded')).toBe('false');
      expect(head(r).textContent).toContain(W.head);
      expect(head(r).textContent).toContain(W.none);
      expect(r.root.querySelector('#sheet .fetch-goods')).toBe(null);
      const body = r.root.querySelector('#sheet .body');
      const stored = [...body.children].findIndex((n) => n.textContent.startsWith('Stored'));
      expect([...body.children][stored + 1]).toBe(panel(r));                             // right under how full the store is, not under the stock rows
      expand(r);
      expect(head(r).getAttribute('aria-expanded')).toBe('true');
      const goods = [...r.root.querySelectorAll('#sheet .fetch-good')].map((li) => li.dataset.good);
      expect(goods).toEqual(BUILDINGS.storehouse.stores);
      expect(r.root.querySelector('#sheet .fetch-help').textContent).toBe(W.help);
    } finally { r.cleanup(); }
  });

  it('stays open for a store while the player looks at another store and comes back', async () => {
    const { w, home, far } = world();
    const r = await open(w, home);
    try {
      expand(r);
      r.store.set(select(r.store.get(), far.id));
      expect(head(r).getAttribute('aria-expanded')).toBe('false');                       // each store has its own
      r.store.set(select(r.store.get(), home.id));
      expect(head(r).getAttribute('aria-expanded')).toBe('true');
    } finally { r.cleanup(); }
  });

  it('is on a granary (foods only) and not on a farm, a house or a well', async () => {
    const { w, home } = world();
    const granary = addRaw(w, 'granary', 12, 11, { staff: 6, store: { grain: 50 } });
    const farm = addRaw(w, 'farm_grain', 40, 11);
    const r = await open(w, home);
    try {
      r.store.set(select(r.store.get(), granary.id));
      expect(panel(r) === null).toBe(false);
      expand(r);
      expect([...r.root.querySelectorAll('#sheet .fetch-good')].map((li) => li.dataset.good)).toEqual(BUILDINGS.granary.stores);
      r.store.set(select(r.store.get(), farm.id));
      expect(panel(r)).toBe(null);
    } finally { r.cleanup(); }
  });

  it('gives the part nothing for a building that is not the one it was handed (a stale sheet)', () => {
    const { w, home } = world();
    const seam = createCartsUi({ world: w, refresh() {}, afterCommand() {}, selectBuilding() {} });
    expect(seam.sheetParts.store({ ...home })).toEqual([]);
    expect(seam.sheetParts.store(null)).toEqual([]);
    expect(seam.sheetParts.store(home).length).toBe(1);
    expect(seam.sheetParts.building(home)).toEqual([]);
  });
});

describe('s47 carts ui: the toggle and the stepper call the sim', () => {
  it('the switch sets the order (default 100) with setFetch and takes it off with clearFetch, and says so in words', async () => {
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expand(r);
      let sw = row(r, 'pottery').querySelector('.fetch-switch');
      expect([sw.getAttribute('role'), sw.getAttribute('aria-checked'), sw.getAttribute('aria-label')]).toEqual(['switch', 'false', 'Fetch pottery']);
      expect(sw.textContent).toContain(W.off);
      click(sw);
      expect(home.orders).toEqual({ pottery: { fetch: CARTS.defaultFetch } });
      sw = row(r, 'pottery').querySelector('.fetch-switch');
      expect([sw.getAttribute('aria-checked'), sw.textContent.includes(W.on)]).toEqual(['true', true]);
      expect(head(r).textContent).toContain(W.count(1));
      click(sw);
      expect(home.orders).toEqual({});
      expect(row(r, 'pottery').querySelector('.fetch-switch').getAttribute('aria-checked')).toBe('false');
      expect(head(r).textContent).toContain(W.none);
    } finally { r.cleanup(); }
  });

  it('the stepper moves the amount by one cart load: before the order it is the draft the toggle will set, after it the order itself', async () => {
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expand(r);
      const btn = (cls) => row(r, 'pottery').querySelector(`.stepper .${cls}`);
      const value = () => row(r, 'pottery').querySelector('.stepper .value').textContent;
      expect(value()).toBe(W.upTo(100));
      click(btn('more'));
      expect(value()).toBe(W.upTo(100 + CARTS.perTrip));
      expect(home.orders || {}).toEqual({});                                             // nothing is set by a draft
      click(btn('more')); click(btn('less'));
      expect(value()).toBe(W.upTo(120));
      click(row(r, 'pottery').querySelector('.fetch-switch'));
      expect(home.orders.pottery.fetch).toBe(120);
      click(btn('more'));
      expect(home.orders.pottery.fetch).toBe(140);                                       // with an order the stepper changes it at once (setFetch)
      click(btn('less')); click(btn('less'));
      expect(home.orders.pottery.fetch).toBe(100);
      expect(value()).toBe(W.upTo(100));
      for (let i = 0; i < 6; i++) click(btn('less'));
      expect(home.orders.pottery.fetch).toBe(CARTS.perTrip);                              // not below one load
      expect(btn('less').disabled).toBe(true);
    } finally { r.cleanup(); }
  });

  it('stops at the store\'s capacity, with the plus disabled', async () => {
    const { w, home } = world();
    setFetch(w, home.id, 'pottery', BUILDINGS.storehouse.capacity - CARTS.perTrip);
    const r = await open(w, home);
    try {
      expand(r);
      const more = row(r, 'pottery').querySelector('.stepper .more');
      click(more);
      expect(home.orders.pottery.fetch).toBe(BUILDINGS.storehouse.capacity);
      expect(row(r, 'pottery').querySelector('.stepper .more').disabled).toBe(true);
    } finally { r.cleanup(); }
  });

  it('names every control for a screen reader, and the stepper as a group', async () => {
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expand(r);
      for (const good of BUILDINGS.storehouse.stores) {
        const li = row(r, good);
        const g = good.toLowerCase();
        expect(li.querySelector('.fetch-switch').getAttribute('aria-label')).toBe(W.setLabel(good));
        expect(li.querySelector('.stepper').getAttribute('role')).toBe('group');
        expect(li.querySelector('.stepper').getAttribute('aria-label')).toBe(W.amountLabel(good));
        expect(li.querySelector('.stepper .less').getAttribute('aria-label')).toBe(W.less(good));
        expect(li.querySelector('.stepper .more').getAttribute('aria-label')).toBe(W.more(good));
        expect(g.length).toBeGreaterThan(2);
      }
      expect(head(r).getAttribute('aria-expanded')).toBe('true');
    } finally { r.cleanup(); }
  });
});

describe('s47 carts ui: the words are the sim\'s', () => {
  it('before the tap the consequence is fetchPreview\'s, and the source note says whether that store can be emptied', async () => {
    const { w, home, far } = world();
    const r = await open(w, home);
    try {
      expand(r);
      const pv = fetchPreview(w, home.id, 'pottery', 100);
      expect(lineOf(row(r, 'pottery'), '.fetch-consequence')).toBe(W.consequence(pv));
      expect(lineOf(row(r, 'pottery'), '.fetch-consequence')).toContain('a round trip takes 7 days');
      expect(lineOf(row(r, 'pottery'), '.fetch-source')).toBe('That storehouse has no order for pottery of its own, so it can be emptied (80 to spare)');
      far.orders = { pottery: { fetch: 50 } };                                           // now the source keeps 50 for itself
      r.store.set(select(r.store.get(), far.id)); r.store.set(select(r.store.get(), home.id));
      expect(lineOf(row(r, 'pottery'), '.fetch-source')).toBe('That storehouse keeps 50 pottery for its own order and gives only the rest (30 to spare)');
      expect(W.sourceNote('pottery', fetchPreview(w, home.id, 'pottery', 100).source)).toBe(lineOf(row(r, 'pottery'), '.fetch-source'));
      // a good no store holds to spare: the consequence says so, and there is no source line and no Show me
      expect(lineOf(row(r, 'beer'), '.fetch-consequence')).toBe('Fetch beer: no store with beer to spare is linked by road');
      expect(row(r, 'beer').querySelector('.fetch-source')).toBe(null);
      expect(row(r, 'beer').querySelector('.show-me')).toBe(null);
      // the amount in the consequence follows the stepper
      click(row(r, 'linen').querySelector('.stepper .more'));
      expect(lineOf(row(r, 'linen'), '.fetch-consequence')).toBe(W.consequence(fetchPreview(w, home.id, 'linen', 120)));
      expect(lineOf(row(r, 'linen'), '.fetch-consequence')).toContain('up to 120');
    } finally { r.cleanup(); }
  });

  it('with an order the live line is fetchStatus\'s through the same words: a cart waiting to set out, on the road, and an order with nothing to fetch', async () => {
    const { w, home } = world();
    setFetch(w, home.id, 'pottery');
    const r = await open(w, home);
    try {
      expand(r);
      expect(lineOf(row(r, 'pottery'), '.fetch-status')).toBe(W.status(fetchStatus(w, home.id, 'pottery')));
      expect(lineOf(row(r, 'pottery'), '.fetch-status')).toContain('a cart sets out next for 20');
      step(w);                                                                          // a cart sets out
      r.store.set(select(r.store.get(), home.id));
      const st = fetchStatus(w, home.id, 'pottery');
      expect(st.state).toBe('out');
      expect(lineOf(row(r, 'pottery'), '.fetch-status')).toBe(W.status(st));
      expect(lineOf(row(r, 'pottery'), '.fetch-status')).toContain('20 on the way');
      expect(row(r, 'pottery').querySelector('.fetch-consequence')).toBe(null);          // the consequence is for before the tap
    } finally { r.cleanup(); }
  });

  it('closed, each order keeps its live line under the row; with no orders there are none', async () => {
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expect(r.root.querySelectorAll('#sheet .fetch-panel .fetch-status').length).toBe(0);
      setFetch(w, home.id, 'pottery'); setFetch(w, home.id, 'linen', 40);
      r.store.set(select(r.store.get(), home.id)); r.store.set(select(r.store.get(), r.store.get().selectedId));
      r.ui.refresh && r.ui.refresh();
      const lines = [...r.root.querySelectorAll('#sheet .fetch-panel .fetch-status')];
      expect(lines.length).toBe(2);
      expect(lines.map((n) => n.textContent)).toEqual([W.status(fetchStatus(w, home.id, 'pottery')), W.status(fetchStatus(w, home.id, 'linen'))].sort((a, b) => 0 * a.length));
    } finally { r.cleanup(); }
  });

  it('Show me goes to the source store (fetchSourceId): before the order and with one', async () => {
    const { w, home, far } = world();
    const r = await open(w, home);
    try {
      expand(r);
      const show = row(r, 'pottery').querySelector('.show-me');
      expect(show.getAttribute('aria-label')).toBe(W.showSourceLabel('pottery', 'storehouse'));
      click(show);
      expect(r.store.get().selectedId).toBe(far.id);
      r.store.set(select(r.store.get(), home.id));
      setFetch(w, home.id, 'pottery'); step(w);
      r.store.set(select(r.store.get(), far.id)); r.store.set(select(r.store.get(), home.id));
      click(row(r, 'pottery').querySelector('.show-me'));
      expect(r.store.get().selectedId).toBe(far.id);
    } finally { r.cleanup(); }
  });
});

describe('s47 carts ui: a refusal says why, with Show me where there is somewhere to look', () => {
  it('no store to spare: the refusal is setFetch\'s reason in words, and with no store holding the good there is no Show me', async () => {
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expand(r);
      click(row(r, 'beer').querySelector('.fetch-switch'));
      expect(home.orders || {}).toEqual({});
      expect(lineOf(row(r, 'beer'), '.fetch-refusal')).toBe(W.refusal({ ok: false, reason: 'no_source', good: 'beer' }));
      expect(lineOf(row(r, 'beer'), '.fetch-refusal')).toBe('No store with beer to spare is linked by road');
      expect(row(r, 'beer').querySelector('.fetch-holder')).toBe(null);
      expect(row(r, 'beer').querySelector('.show-me')).toBe(null);
    } finally { r.cleanup(); }
  });

  it('a store that holds the good but no road joins it: the refusal says so and Show me goes to that store', async () => {
    const { w, home, far } = world();
    far.store.beer = 40;
    w.road[10 * w.size + 16] = 0; w.roadVersion++;                                       // the street is cut between them
    const r = await open(w, home);
    try {
      expand(r);
      click(row(r, 'beer').querySelector('.fetch-switch'));
      expect(holderOf(w, home.id, 'beer')).toEqual({ id: far.id, type: 'storehouse', why: 'unlinked' });
      expect(lineOf(row(r, 'beer'), '.fetch-holder')).toBe(W.holderNote('beer', holderOf(w, home.id, 'beer')));
      expect(lineOf(row(r, 'beer'), '.fetch-holder')).toBe('A storehouse holds beer, but no road joins it to this store');
      const show = row(r, 'beer').querySelector('.show-me');
      expect(show.getAttribute('aria-label')).toBe(W.showHolderLabel('beer', 'storehouse'));
      click(show);
      expect(r.store.get().selectedId).toBe(far.id);
    } finally { r.cleanup(); }
  });

  it('a store that holds the good but keeps it for its own order: the refusal says that', async () => {
    const { w, home, far } = world();
    far.store.beer = 40; far.orders = { beer: { fetch: 40 } };
    const r = await open(w, home);
    try {
      expand(r);
      click(row(r, 'beer').querySelector('.fetch-switch'));
      expect(holderOf(w, home.id, 'beer').why).toBe('kept');
      expect(lineOf(row(r, 'beer'), '.fetch-holder')).toBe('A storehouse holds beer, but keeps it for its own order');
    } finally { r.cleanup(); }
  });

  it('a good the storehouse refuses: the refusal says to let it accept the good first, and Show me goes to its accept switch on the same sheet', async () => {
    const { w, home } = world();
    setAccept(w, home.id, 'pottery', false);
    const r = await open(w, home);
    try {
      expand(r);
      click(row(r, 'pottery').querySelector('.fetch-switch'));
      expect(lineOf(row(r, 'pottery'), '.fetch-refusal')).toBe('This store refuses pottery: let it accept pottery first');
      const show = row(r, 'pottery').querySelector('.accept-show');
      expect(Boolean(show)).toBe(true);
      click(show);
      expect(document.activeElement.classList.contains('accept')).toBe(true);
      expect(document.activeElement.dataset.good).toBe('pottery');
    } finally { r.cleanup(); }
  });

  it('a refusal lasts the game day: the next day it is gone', async () => {
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expand(r);
      click(row(r, 'beer').querySelector('.fetch-switch'));
      expect(row(r, 'beer').querySelector('.fetch-refusal') === null).toBe(false);
      w.day += 1;
      r.store.set(select(r.store.get(), home.id));
      click(head(r)); click(head(r));                                                    // a rebuild of the sheet
      expect(row(r, 'beer').querySelector('.fetch-refusal')).toBe(null);
    } finally { r.cleanup(); }
  });
});

describe('s47 carts ui: goods on the road in the stock rows', () => {
  it('a cart on the road shows its goods under the source\'s row ("to the storehouse") and the home\'s ("to here"), and nothing once they are home', async () => {
    const { w, home, far } = world();
    setFetch(w, home.id, 'pottery', 20);                                                  // one load: once it is home nothing more is fetched
    step(w);
    expect(roadGoods(w, far.id).leaving).toEqual([{ good: 'pottery', amount: 20, to: home.id, type: 'storehouse' }]);
    expect(roadGoods(w, home.id).arriving).toEqual([{ good: 'pottery', amount: 20, from: far.id, type: 'storehouse', back: false }]);
    const r = await open(w, home);
    try {
      const road = (good) => [...r.root.querySelectorAll(`#sheet .store-goods li[data-good="${good}"] .road-line`)].map((n) => n.textContent);
      expect(road('pottery')).toEqual(['20 pottery on the road to here']);
      expect(road('linen')).toEqual([]);
      r.store.set(select(r.store.get(), far.id));
      expect(road('pottery')).toEqual(['20 pottery on the road to the storehouse']);
      expect(r.root.querySelector('#sheet .store-goods li[data-good="pottery"]').textContent).toContain('60');   // 80 on the shelf less the 20 on the cart
      step(w, 8);                                                                         // home on day 7
      expect(w.carts.length).toBe(0);
      r.store.set(select(r.store.get(), home.id)); r.store.set(select(r.store.get(), far.id));
      expect(road('pottery')).toEqual([]);
    } finally { r.cleanup(); }
  });

  it('a cart that turned back with its goods says "back here" on the source, and one turned on the way out says nothing', () => {
    const { w, home, far } = world();
    setFetch(w, home.id, 'pottery');
    step(w, 6);                                                                           // on the way back
    w.road[10 * w.size + 20] = 0; w.roadVersion++;
    cartDay(w);
    const c = cartOf(w, home.id);
    expect([c.state, c.dest]).toEqual(['return', 'source']);
    expect(roadGoods(w, far.id).arriving).toEqual([{ good: 'pottery', amount: 20, from: null, type: null, back: true }]);
    expect(roadGoods(w, far.id).leaving).toEqual([]);
    expect(roadGoods(w, home.id)).toEqual({ leaving: [], arriving: [] });
    expect(W.road(roadGoods(w, far.id).arriving[0], 'arriving')).toBe('20 pottery on the road back here');
    const { w: w2, home: h2 } = world();
    setFetch(w2, h2.id, 'pottery');
    step(w2, 3);
    w2.road[10 * w2.size + 20] = 0; w2.roadVersion++;
    cartDay(w2);
    expect(cartOf(w2, h2.id).dest).toBe('home');
    for (const b of Object.values(w2.buildings)) expect(roadGoods(w2, b.id)).toEqual({ leaving: [], arriving: [] });   // the goods are on the shelf again
  });

  it('a home demolished with a cart out leaves nothing on the road after the day\'s work', () => {
    const { w, home, far } = world();
    setFetch(w, home.id, 'pottery');
    step(w);
    demolishAt(w, 2, 11);
    cartDay(w);
    expect(w.carts.length).toBe(0);
    expect(roadGoods(w, far.id)).toEqual({ leaving: [], arriving: [] });
    expect(far.store.pottery).toBe(80);
  });
});

describe('s47 carts ui: the sim helpers behind the words', () => {
  it('holderOf: none when a store can be drawn on or none holds the good; the nearest holder otherwise', () => {
    const { w, home, far } = world();
    expect(holderOf(w, home.id, 'pottery')).toBe(null);                                   // a source exists: not a refusal
    expect(holderOf(w, home.id, 'beer')).toBe(null);                                      // no store holds beer
    expect(holderOf(w, far.id, 'beer')).toBe(null);
    expect(holderOf(w, 99999, 'beer')).toBe(null);
    far.store.beer = 5;
    expect(holderOf(w, home.id, 'beer')).toBe(null);                                      // it has 5 and no order: a source, so no refusal to explain
    far.orders = { beer: { fetch: 5 } };
    expect(holderOf(w, home.id, 'beer')).toEqual({ id: far.id, type: 'storehouse', why: 'kept' });
  });

  it('fetchPreview carries what the source gives and what it keeps', () => {
    const { w, home, far } = world();
    expect(fetchPreview(w, home.id, 'pottery', 100).source).toEqual({ id: far.id, type: 'storehouse', len: 28, days: 4, roundTrip: 7, dir: 'east', spare: 80, keeps: 0 });
    far.orders = { pottery: { fetch: 50 } };
    const s = fetchPreview(w, home.id, 'pottery', 100).source;
    expect([s.spare, s.keeps]).toEqual([30, 50]);
  });
});

describe('s47 carts ui: the carts on screen with the whole interface, and the dev scene', () => {
  it('a frame with a cart on the road draws without error', async () => {
    const { w, home } = world();
    setFetch(w, home.id, 'pottery');
    step(w, 2);
    const r = await open(w, home);
    try {
      r.cam.zoom = 1;
      r.frame(100);
      expect(cartsAt(w, 2.5, { x0: 0, y0: 0, x1: 63, y1: 63 }, 'full').length).toBe(1);
      fire(r.canvas, 'pointermove', { clientX: 10, clientY: 10, pointerId: 1, pointerType: 'mouse' });
      r.frame(200);
    } finally { r.cleanup(); }
  });

  it('s47-carts opens the near storehouse\'s sheet with the Fetch list open and a cart on the road', async () => {
    const { boot } = await import('../../../src/boot.js');
    const { createSaveStore } = await import('../../../src/save/store.js');
    const { fakeIndexedDB } = await import('../../helpers/fakeStorage.js');
    const { mountShell, fakeHistory } = await import('../../helpers/uiWorld.js');
    const shell = await mountShell(390, 844);
    const history = fakeHistory(), noStorage = { getItem: () => null, setItem: () => {} };
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('skipTitle=1&seed=11&sample=1'),
      clock: () => 1760000000000, storage: noStorage, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 390, height: 844 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      const said = await devScene(api, 's47-carts', { sheet: true });
      expect(said.includes('cart out, 20 pottery')).toBe(true);
      const g = api.game();
      expect(g.ui.store.get().sheet.kind).toBe('info');
      const p = document.querySelector('#sheet .fetch-panel');
      expect(p.querySelector('.fetch-head').getAttribute('aria-expanded')).toBe('true');
      expect(p.querySelector('.fetch-good[data-good="pottery"] .fetch-switch').getAttribute('aria-checked')).toBe('true');
      expect(cartsAt(g.world, g.world.day + 0.5, null, 'full').length).toBe(1);
      expect(document.querySelector('#sheet .store-goods li[data-good="pottery"] .road-line').textContent).toBe('20 pottery on the road to here');
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; }
  });
});
