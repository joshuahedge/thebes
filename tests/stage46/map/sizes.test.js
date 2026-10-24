// Stage 4.6, Map track: map sizes (ruling 333). New city offers Small 48, Normal 64 (the default), Large 80 and (Version 6.0) Huge 112 with one line each;
// share links, personal bests and the stamps carry the size, and Normal keeps today's links and keys.
import { describe, it, expect } from '../../harness.js';
import { MAP_SIZES, MAP_SIZE_IDS, DEFAULT_MAP_SIZE } from '../../../src/data/map.js';
import { shareLink, parseShareLink } from '../../../src/ui/share.js';
import { titleDecor, stampMap } from '../../../src/ui/scoreUi.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { createRecords, normalizeRecords } from '../../../src/save/records.js';
import { RECORDS_KEY } from '../../../src/data/scoring.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { createWorld } from '../../../src/sim/world.js';
import { S46_MAP_TEXT, TITLE_SCORE_TEXT, score4StampLabel } from '../../../src/ui/text.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { mount, fire, startNewCity, openNewCity } from '../../helpers/dom.js';

const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const hashOf = (link) => link.slice(link.indexOf('#'));
const same = (a, b) => a.size === b.size && a.terrain.every((t, i) => t === b.terrain[i]);

describe('s46 map sizes: the picker on the title card (ruling 333)', () => {
  function card(extra = {}) {
    const m = mount('<div id="title" hidden></div>');
    const chosen = [];
    createTitleCard({ container: m.root.querySelector('#title'), hasSave: false, onContinue() {}, onNewCity() {}, onSound() {}, onDifficulty() {}, onMapSize: (id) => chosen.push(id), screen: () => ({ width: 1280, height: 800 }), ...extra });
    openNewCity(m.root);   // Version 8.0: the size picker is on the new-city card, under More choices
    return { root: m.root.querySelector('#title'), chosen, cleanup: m.cleanup };
  }
  it('offers Small, Normal, Large and Huge, Normal pressed, with a line for each from the sim\'s sizes, and tells what is chosen', () => {
    const c = card();
    try {
      const buttons = [...c.root.querySelectorAll('.choice.mapsize')];
      expect(buttons.map((b) => [b.textContent, b.dataset.value, b.getAttribute('aria-pressed')])).toEqual([['Small', 'small', 'false'], ['Normal', 'normal', 'true'], ['Large', 'large', 'false'], ['Huge', 'huge', 'false']]);
      expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(MAP_SIZE_IDS.map((id) => `${S46_MAP_TEXT.sizeNames[id]}, ${MAP_SIZES[id]} by ${MAP_SIZES[id]} tiles`));
      const hint = c.root.querySelector('#title-size-hint');
      expect(hint.textContent).toBe('Normal: the usual map');
      fire(buttons[0], 'click');
      expect([hint.textContent, buttons.map((b) => b.getAttribute('aria-pressed'))]).toEqual(['Small: a quick city', ['true', 'false', 'false', 'false']]);
      fire(buttons[2], 'click');
      expect([hint.textContent, c.chosen]).toEqual(['Large: room for every monument', ['small', 'large']]);
      expect(Boolean(c.root.querySelector('.choice.difficulty'))).toBe(true);                  // the difficulty row is still there, with the size beneath it
      for (const b of buttons) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(0);
    } finally { c.cleanup(); }
  });
  it('starts as the id it is given (the dev flag\'s size), else Normal', () => {
    const c = card({ mapSize: 'large' });
    try { expect(c.root.querySelector('.choice.mapsize[aria-pressed="true"]').dataset.value).toBe('large'); } finally { c.cleanup(); }
    const d = card({ mapSize: 'nowhere' });
    try { expect(d.root.querySelector('.choice.mapsize[aria-pressed="true"]').dataset.value).toBe('normal'); } finally { d.cleanup(); }
  });
  it('gives each button 44 px to tap', async () => {
    const shell = await mountShell(390, 844);
    const c = card();
    try {
      for (const b of c.root.querySelectorAll('.choice.mapsize')) expect(getComputedStyle(b).minHeight).toBe('44px');
    } finally { c.cleanup(); shell.cleanup(); }
  });
});

describe('s46 map sizes: a new city starts at the size chosen', () => {
  const noStorage = { getItem: (k) => (k === 'thebes.settings' ? '{"cardsSeen":true,"lessonDone":true}' : null), setItem: () => {} };   // Version 6.0 (Track D2): the picture cards were seen and the lesson done, so the title offers New city
  async function open(params = '') {
    const shell = await mountShell(1280, 800);
    const history = fakeHistory();
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(params), now: () => 0, clock: () => 1760000000000, storage: noStorage,
      platform: {}, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    await new Promise((r) => setTimeout(r, 0));
    return { api, shell, close() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
  }
  it('starts a city of the size chosen on the card, Normal when none is', async () => {
    for (const [pick, want] of [[null, 64], ['small', 48], ['large', 80], ['huge', 112], ['normal', 64]]) {
      const g = await open();
      try {
        openNewCity(g.shell.root);
        if (pick) fire(g.shell.root.querySelector(`#title .choice.mapsize[data-value="${pick}"]`), 'click');
        fire(g.shell.root.querySelector('#title .start-city'), 'click');
        const w = g.api.game().world;
        expect([pick, w.size, w.mapSize, w.terrain.length]).toEqual([pick, want, want, want * want]);
      } finally { g.close(); }
    }
  });
  it('asks the title card to start a shared link\'s seed at the link\'s size (Version 6.0: the weekly seed button is gone)', () => {
    const m = mount('<div id="title" hidden></div>');
    const started = [];
    const link = (size) => hashOf(shareLink({ seed: 9, difficulty: 'normal', parts: PARTS, splits: {}, size }));
    try {
      createTitleCard({ container: m.root.querySelector('#title'), hasSave: false, onContinue() {}, onNewCity() {}, onDifficulty() {},
        decorate: titleDecor({ records: null, shared: link(80), startSeed: (...a) => started.push(a), clock: () => 1760000000000, dpr: 1 }) });
      expect(m.root.querySelector('.weekly')).toBe(null);
      fire(m.root.querySelector('.start-seed'), 'click');
      expect(started).toEqual([[9, 'classic', 80]]);   // a link that names no size starts Normal (boot: size || DEFAULT)
    } finally { m.cleanup(); }
  });
});

describe('s46 map sizes: share links, personal bests and stamps carry the size', () => {
  it('adds &size= for Small and Large only, so every Normal link stays what it was, and reads it back', () => {
    const base = shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {} });
    expect(shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {}, size: 64 })).toBe(base);
    expect(base.includes('&')).toBe(false);
    expect(parseShareLink(hashOf(base)).size).toBe(undefined);                               // an older link names none: Normal, and it reads as it always did
    for (const size of [48, 80]) {
      const link = shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {}, size });
      expect(link).toBe(`${base}&size=${size}`);
      const read = parseShareLink(hashOf(link));
      expect([read.ok, read.seed, read.size, read.variant]).toEqual([true, 7, size, 'classic']);
    }
    const both = shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {}, variant: 'east', size: 80 });
    expect(both).toBe(`${base}&variant=east&size=80`);
    expect(parseShareLink(hashOf(both))).toEqual({ ...parseShareLink(hashOf(both)), variant: 'east', size: 80 });
    expect(shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {}, size: 72 })).toBe(base);   // not a size: no tail
  });
  it('still checks the link, and calls a size it does not know a newer link', () => {
    const base = hashOf(shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {} }));
    expect(parseShareLink(`${base}&size=72`)).toEqual({ ok: false, reason: 'newer_format' });
    expect(parseShareLink(`${base}&size=abc`)).toEqual({ ok: false, reason: 'newer_format' });
    expect(parseShareLink(`${base.replace('.n.', '.h.')}&size=80`)).toEqual({ ok: false, reason: 'bad_check' });
  });
  it('keeps a best for each size: Normal keeps its key and its rows, Small and Large their own', () => {
    const row = (size, id, score) => {
      const w = createWorld({ seed: 11, difficulty: 'normal', cityId: id, size, mapVariant: 'classic' });
      w.history = [{ day: 30, people: 0, gold: 0, mood: 60, score, parts: { people: score / 5, prosperity: score / 5, culture: score / 5, safety: score / 5, monuments: score / 5 } }];
      w.splits = { town: size === 64 ? 300 : 100 };
      return w;
    };
    const storage = memory();
    const r = createRecords({ storage });
    r.noteCity(row(64, 'a', 200), 1);
    r.noteCity(row(80, 'b', 300), 2);
    r.noteCity(row(48, 'c', 150), 3);
    const stored = JSON.parse(storage.getItem(RECORDS_KEY)).cities;
    expect(stored.map((c) => c.mapSize)).toEqual([undefined, 80, 48]);                      // a Normal row carries no new field
    expect([r.bestFor(11, 'normal', { version: 1 }).score, r.bestFor(11, 'normal', { version: 1, size: 80 }).score, r.bestFor(11, 'normal', { version: 1, size: 48 }).score]).toEqual([200, 300, 150]);
    expect(r.bestFor(11, 'normal', { version: 1, size: 64 })).toEqual(r.bestFor(11, 'normal', { version: 1 }));
    expect(r.bestFor(11, 'normal', { version: 1, size: 72 })).toEqual(r.bestFor(11, 'normal', { version: 1 }));   // not a size: Normal
    expect(r.bestFor(11, 'normal', { version: 1, size: 80, variant: 'east' })).toBe(null);
    const list = r.bests(5);
    expect(list.length).toBe(3);                                                              // one per size
    expect(list.map((x) => x.mapSize)).toEqual([80, undefined, 48]);
  });
  it('reads a record with no size (every record from before) as Normal, and an unknown size as Normal', () => {
    const storage = memory();
    storage.setItem(RECORDS_KEY, JSON.stringify({ version: 1, cities: [
      { id: 'old', seed: 11, difficulty: 'normal', scoreVersion: 2, best: 250, bestDay: 900, medal: null, splits: { town: 100 }, updated: 1 },
      { id: 'odd', seed: 12, difficulty: 'normal', mapSize: 99, scoreVersion: 2, best: 100, bestDay: 900, medal: null, splits: {}, updated: 1 },
    ], chronicle: [{ id: 'e1', cityId: 'old', seed: 11, difficulty: 'normal', score: 10, mapSize: 80 }] }));
    const r = createRecords({ storage });
    expect(r.bestFor(11, 'normal').score).toBe(250);
    expect(r.bestFor(11, 'normal', { size: 80 })).toBe(null);
    expect(r.bestFor(12, 'normal').score).toBe(100);
    const n = normalizeRecords(JSON.parse(storage.getItem(RECORDS_KEY)));
    expect([n.cities[0].mapSize, n.cities[1].mapSize, n.chronicle[0].mapSize]).toEqual([undefined, undefined, 80]);
  });
  it('records the size on a seal, and draws a Large record\'s stamp from a Large map (not a 64 one)', () => {
    const records = createRecords({ storage: memory() });
    const w = createWorld({ seed: 5, cityId: 'big', size: 80, mapVariant: 'island' });
    w.seals = []; w.feats = { earned: [] };
    const entry = records.addSeal(w, { day: 5, score: 100, parts: {}, medal: null, version: 2 }, 2);
    expect(entry.mapSize).toBe(80);
    expect(records.stamps()[0].mapSize).toBe(80);
    const stamp = stampMap(5, 'island', 80);
    expect([stamp.size, same(stamp, generateMap(5, 80, 'island'))]).toEqual([80, true]);
    expect(stampMap(5, 'island').size).toBe(64);                                              // no size: Normal, as a record from before
    expect(same(stampMap(5, 'island', 48), generateMap(5, 48, 'island'))).toBe(true);
  });
});

describe('s46 map sizes: a best and a stamp say their map size when it is not Normal', () => {
  it('adds "80 x 80 map" to a Large best and a Small stamp, from the size itself, and nothing for Normal or a record from before', () => {
    const best = { score: 900, medal: 'gold', seed: 5, difficulty: 'normal' };
    const normal = TITLE_SCORE_TEXT.bestLine(best);
    const large = TITLE_SCORE_TEXT.bestLine({ ...best, mapSize: 80 });
    expect([large.includes('80 x 80 map'), normal.includes(' map')]).toEqual([true, false]);
    expect(TITLE_SCORE_TEXT.bestLine({ ...best, mapSize: 48 }).includes(S46_MAP_TEXT.sizeNote(48))).toBe(true);
    expect(TITLE_SCORE_TEXT.bestLine({ ...best, mapSize: DEFAULT_MAP_SIZE })).toBe(normal);
    const stamp = { seed: 5, score: 700, medal: null, built: [] };
    expect(score4StampLabel({ ...stamp, mapSize: 48 }).includes('48 x 48 map')).toBe(true);
    expect(score4StampLabel(stamp).includes(' map')).toBe(false);
  });
});
