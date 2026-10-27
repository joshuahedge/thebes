// Stage 4.7 Task 6 review round 1: the help shows only until the store has an order; a good no store can spare is one muted line, and a holder is named with Show me before any
// tap; the line before the tap respects what the store holds (as the live status does); the stepper's steps (20 up to 200, then 100); drafts for a good with no source, and
// after an order is switched off.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { select } from '../../../src/ui/modes.js';
import { fetchPreview, fetchStatus } from '../../../src/sim/carts.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { S47_CARTS_TEXT as W } from '../../../src/ui/text.js';
import { stepAmount } from '../../../src/ui/s47/carts.js';

const click = (node) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

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
// Version 8.3 (ruling 1420): Keeps stocked is open; with an order the other goods fold under .fetch-more, which expand unfolds. The stepper's value is the number
// ("up to" is the row's word before it), so the drafts below read W.upTo's number.
const more = (r) => r.root.querySelector('#sheet .fetch-more');
const row = (r, good) => r.root.querySelector(`#sheet .fetch-good[data-good="${good}"]`);
const lineOf = (li, cls) => { const n = li.querySelector(cls); return n ? n.textContent : null; };
const expand = (r) => { const m = more(r); if (m && m.getAttribute('aria-expanded') !== 'true') click(m); };
const sw = (r, good) => { expand(r); return row(r, good).querySelector('.fetch-switch'); };
const stepper = (r, good, cls) => { expand(r); return row(r, good).querySelector(`.stepper .${cls}`); };
const value = (r, good) => { expand(r); return W.upTo(row(r, good).querySelector('.stepper .value').textContent); };

describe('s47 carts ui review: fewer words per row', () => {
  it('shows the help only while the store has no order (How to play keeps it)', async () => {
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expand(r);
      expect(lineOf(r.root.querySelector('#sheet'), '.fetch-help')).toBe(W.help);
      click(sw(r, 'pottery'));
      expect(r.root.querySelector('#sheet .fetch-help')).toBe(null);
      click(sw(r, 'pottery'));
      expect(r.root.querySelector('#sheet .fetch-help') === null).toBe(false);           // no orders again: it is back
    } finally { r.cleanup(); }
  });

  it('a good no store can spare is one muted line; a store that holds it all the same is named, with Show me, before any tap', async () => {
    const { w, home, far } = world();
    far.store.beer = 40;
    w.road[10 * w.size + 16] = 0; w.roadVersion++;                                        // cut: the storehouse with beer has no road to this one
    addRaw(w, 'storehouse', 8, 11, { staff: 6, store: { clay: 30 }, orders: { clay: { fetch: 30 } } });   // clay is held by a store on this side of the cut, but kept for its own order
    const r = await open(w, home);
    try {
      expand(r);
      const beer = row(r, 'beer');
      expect(lineOf(beer, '.fetch-consequence')).toBe('No store with beer to spare is linked by road');
      expect(beer.querySelector('.fetch-consequence').className.includes('muted')).toBe(true);
      expect(lineOf(beer, '.fetch-holder')).toBe('A storehouse holds beer, but no road joins it to this store');
      expect(beer.querySelector('.fetch-refusal')).toBe(null);                            // nothing was tapped
      const show = beer.querySelector('.show-me');
      expect(show.getAttribute('aria-label')).toBe(W.showHolderLabel('beer', 'storehouse'));
      click(show);
      expect(r.store.get().selectedId).toBe(far.id);
      r.store.set(select(r.store.get(), home.id));
      expect(lineOf(row(r, 'clay'), '.fetch-holder')).toBe('A storehouse holds clay, but keeps it for its own order');
      expect(lineOf(row(r, 'barley'), '.fetch-holder')).toBe(null);                        // nobody holds barley: just the one muted line
      expect(row(r, 'barley').querySelector('.show-me')).toBe(null);
    } finally { r.cleanup(); }
  });

  it('a row with a source has its note and its Show me on one line', async () => {
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expand(r);
      const note = row(r, 'pottery').querySelector('.fetch-note');
      expect(note.querySelector('.fetch-source') === null).toBe(false);
      expect(note.querySelector('.show-me') === null).toBe(false);
      expect(note.parentNode).toBe(row(r, 'pottery'));
    } finally { r.cleanup(); }
  });
});

describe('s47 carts ui review: the line before the tap respects what the store holds', () => {
  it('a store already holding the amount says no cart is needed, as its status does once the order is set', async () => {
    const { w, home } = world();
    home.store.pottery = 100;
    const r = await open(w, home);
    try {
      expand(r);
      const pv = fetchPreview(w, home.id, 'pottery', 100);
      expect([pv.state, pv.held]).toEqual(['full', 100]);
      expect(lineOf(row(r, 'pottery'), '.fetch-consequence')).toBe('100 held of 100, no cart needed');
      expect(W.consequence(pv)).toBe('Keep pottery stocked up to 100: 100 held of 100, no cart needed');
      click(sw(r, 'pottery'));
      const st = fetchStatus(w, home.id, 'pottery');
      expect(st.state).toBe('full');
      expect(lineOf(row(r, 'pottery'), '.fetch-status')).toBe(W.status(st));
      expect(W.status(st)).toContain('100 held of 100, no cart needed');
      home.store.pottery = 40;                                                            // below the amount it is the one cart again
      expect(fetchPreview(w, home.id, 'pottery', 100).state).toBe(null);
      expect(fetchPreview(w, home.id, 'pottery', 40).state).toBe('full');
    } finally { r.cleanup(); }
  });

  it('a store with no room says no cart goes before the tap, as its status does after', async () => {
    const { w, home } = world();
    home.store.clay = BUILDINGS.storehouse.capacity;                                       // every shelf taken
    const r = await open(w, home);
    try {
      expand(r);
      const pv = fetchPreview(w, home.id, 'pottery', 100);
      expect(pv.state).toBe('no_room');
      expect(lineOf(row(r, 'pottery'), '.fetch-consequence')).toBe('No cart goes, the store is full');
      expect(W.consequence(pv)).toBe('Keep pottery stocked up to 100: no cart goes, the store is full');
      click(sw(r, 'pottery'));
      expect(fetchStatus(w, home.id, 'pottery').state).toBe('no_room');
      expect(lineOf(row(r, 'pottery'), '.fetch-status')).toBe('No cart goes, the store is full');
    } finally { r.cleanup(); }
  });
});

describe('s47 carts ui review: the stepper and its draft', () => {
  it('goes 20 at a time up to 200, then 100 at a time to the capacity, and back the same way', async () => {
    const cap = BUILDINGS.storehouse.capacity;
    const up = [20];
    while (up[up.length - 1] < cap) up.push(stepAmount(up[up.length - 1], 1, cap));
    expect(up).toEqual([20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 300, 400, 500, 600, 700, 800]);
    const down = [cap];
    while (down[down.length - 1] > 20) down.push(stepAmount(down[down.length - 1], -1, cap));
    expect(down).toEqual([...up].reverse());
    expect(stepAmount(cap, 1, cap)).toBe(cap);
    expect(stepAmount(20, -1, cap)).toBe(20);
    expect(stepAmount(250, -1, cap)).toBe(200);                                            // an amount off the grid lands on it
    expect(stepAmount(190, 1, cap)).toBe(200);
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expand(r);
      for (let i = 0; i < 5; i++) click(stepper(r, 'pottery', 'more'));                    // 100 -> 200
      expect(value(r, 'pottery')).toBe(W.upTo(200));
      click(stepper(r, 'pottery', 'more'));
      expect(value(r, 'pottery')).toBe(W.upTo(300));
      click(sw(r, 'pottery'));
      expect(home.orders.pottery.fetch).toBe(300);
      click(stepper(r, 'pottery', 'more'));
      expect(home.orders.pottery.fetch).toBe(400);                                         // the order itself, in the big steps
      for (let i = 0; i < 2; i++) click(stepper(r, 'pottery', 'less'));
      expect(home.orders.pottery.fetch).toBe(200);
      click(stepper(r, 'pottery', 'less'));
      expect(home.orders.pottery.fetch).toBe(180);
    } finally { r.cleanup(); }
  });

  it('a good with no source has a draft too: the stepper moves it, the tap is refused with the reason, and the draft is kept', async () => {
    const { w, home, far } = world();
    const r = await open(w, home);
    try {
      expand(r);
      click(stepper(r, 'beer', 'more'));
      expect(value(r, 'beer')).toBe(W.upTo(120));
      expect(lineOf(row(r, 'beer'), '.fetch-consequence')).toBe('No store with beer to spare is linked by road');
      click(sw(r, 'beer'));
      expect(home.orders || {}).toEqual({});
      expect(lineOf(row(r, 'beer'), '.fetch-refusal')).toBe('No store with beer to spare is linked by road');
      expect(value(r, 'beer')).toBe(W.upTo(120));                                          // still the draft
      far.store.beer = 50;                                                                 // now a store can spare some
      r.store.set(select(r.store.get(), home.id));
      click(sw(r, 'beer'));
      expect(home.orders.beer.fetch).toBe(120);
    } finally { r.cleanup(); }
  });

  it('when an order is switched off the draft goes back to the order\'s last amount', async () => {
    const { w, home } = world();
    const r = await open(w, home);
    try {
      expand(r);
      for (let i = 0; i < 3; i++) click(stepper(r, 'linen', 'more'));                      // 160
      click(sw(r, 'linen'));
      expect(home.orders.linen.fetch).toBe(160);
      click(stepper(r, 'linen', 'less'));                                                  // 140
      click(sw(r, 'linen'));                                                               // off
      expect(home.orders).toEqual({});
      expect(value(r, 'linen')).toBe(W.upTo(140));
      click(sw(r, 'linen'));
      expect(home.orders.linen.fetch).toBe(140);
    } finally { r.cleanup(); }
  });
});
