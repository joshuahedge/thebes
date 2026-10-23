// Stage 4.5 review fix: the map variant travels with a score. A share link names a non-classic layout ('&variant=east' after the
// check; classic adds nothing, so every older link keeps meaning what it did), Start this seed builds that layout, and a personal
// best belongs to a seed, a level and a layout (the classic key stays seed|level, so old records are untouched).
import { describe, it, expect } from '../harness.js';
import { shareLink, parseShareLink } from '../../src/ui/share.js';
import { titleDecor } from '../../src/ui/scoreUi.js';
import { createTitleCard } from '../../src/ui/titleCard.js';
import { createRecords } from '../../src/save/records.js';
import { MAP_VARIANTS } from '../../src/data/map.js';
import { RECORDS_KEY } from '../../src/data/scoring.js';
import { createWorld } from '../../src/sim/world.js';
import { boot } from '../../src/boot.js';
import { createSaveStore } from '../../src/save/store.js';
import { fakeIndexedDB } from '../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../helpers/uiWorld.js';
import { mount, fire } from '../helpers/dom.js';

const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };
const memory = () => { const data = {}; return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } }; };
const hashOf = (link) => link.slice(link.indexOf('#'));

describe('s45 share links carry the map variant', () => {
  it('writes nothing extra for classic (the link every older game wrote) and the layout\'s name for the others, and reads both back', () => {
    const base = shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {} });
    expect(shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {}, variant: 'classic' })).toBe(base);
    expect(base.includes('&')).toBe(false);
    expect(parseShareLink(hashOf(base)).variant).toBe('classic');                              // an old link: classic
    for (const v of MAP_VARIANTS.filter((x) => x !== 'classic')) {
      const link = shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {}, variant: v });
      expect(link).toBe(`${base}&variant=${v}`);
      const read = parseShareLink(hashOf(link));
      expect([read.ok, read.seed, read.variant]).toEqual([true, 7, v]);
    }
    expect(shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {}, variant: 'swamp' })).toBe(base);   // not a layout: no tail
  });
  it('still checks the link, and calls a layout it does not know a newer link', () => {
    const base = hashOf(shareLink({ seed: 7, difficulty: 'normal', parts: PARTS, splits: {} }));
    expect(parseShareLink(`${base}&variant=swamp`)).toEqual({ ok: false, reason: 'newer_format' });
    expect(parseShareLink(`${base.replace('.n.', '.h.')}&variant=east`)).toEqual({ ok: false, reason: 'bad_check' });
    expect(parseShareLink(`${base}&variant=wide-bends`).variant).toBe('wide-bends');
  });
});

describe('s45 Start this seed builds the link\'s layout', () => {
  function card(shared) {
    const m = mount('<div id="title" hidden></div>');
    const started = [];
    createTitleCard({ container: m.root.querySelector('#title'), hasSave: false, onContinue() {}, onNewCity() {}, onSound() {}, onDifficulty() {},
      decorate: titleDecor({ records: null, shared, startSeed: (s, v) => started.push([s, v]), clock: () => 0, dpr: 1 }) });
    return { container: m.root.querySelector('#title'), started, cleanup: m.cleanup };
  }
  it('asks for the named layout, and for classic from a link that names none', () => {
    for (const [variant, expected] of [['island', 'island'], [undefined, 'classic']]) {
      const c = card(hashOf(shareLink({ seed: 9, difficulty: 'normal', parts: PARTS, splits: {}, variant })));
      try {
        fire(c.container.querySelector('.start-seed'), 'click');
        expect(c.started).toEqual([[9, expected]]);
      } finally { c.cleanup(); }
    }
  });
  it('starts a real city on that layout and seed, in the booted game', async () => {
    const link = shareLink({ seed: 4242, difficulty: 'normal', parts: PARTS, splits: {}, variant: 'oasis' });
    const was = window.location.hash;
    window.location.hash = hashOf(link);
    const shell = await mountShell(1280, 800);
    const history = fakeHistory();
    const noStorage = { getItem: (k) => (k === 'thebes.settings' ? '{"cardsSeen":true,"lessonDone":true}' : null), setItem: () => {} };   // Version 6.0 (Track D2): the picture cards were seen and the lesson done, so the title offers New city
    const api = await boot(document, window, {
      root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage: noStorage, platform: {}, envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
      uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage: noStorage },
      loopOptions: { raf: () => 0, caf: () => {} },
    });
    try {
      fire(shell.root.querySelector('#title .start-seed'), 'click');
      const w = api.game().world;
      expect([w.seed, w.mapVariant]).toEqual([4242, 'oasis']);
    } finally { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; window.location.hash = was; }
  });
});

describe('s45 personal bests are kept per layout', () => {
  const rowsOf = (variant, id, score) => {
    const w = createWorld({ seed: 11, difficulty: 'normal', cityId: id, mapVariant: variant });
    w.history = [{ day: 30, people: 0, gold: 0, mood: 60, score, parts: { people: score / 5, prosperity: score / 5, culture: score / 5, safety: score / 5, monuments: score / 5 } }];
    w.splits = { town: variant === 'classic' ? 300 : 200 };
    return w;
  };
  it('compares a city only with bests on its own seed, level and layout; classic keeps its old key', () => {
    const r = createRecords({ storage: memory() });
    r.noteCity(rowsOf('classic', 'a', 200), 1);
    r.noteCity(rowsOf('east', 'b', 300), 2);
    const classic = r.bestFor(11, 'normal', { version: 1 }), east = r.bestFor(11, 'normal', { variant: 'east', version: 1 });   // these test rows are score v1 rows
    expect(r.bestFor(11, 'normal', { variant: 'classic', version: 1 })).toEqual(classic);
    expect([classic.splits.town, east.splits.town]).toEqual([300, 200]);                       // each its own earliest day
    expect([classic.score, east.score]).toEqual([200, 300]);
    expect(r.bestFor(11, 'normal', { variant: 'island' })).toBe(null);                          // nobody on that layout yet
    expect(r.bestFor(11, 'normal', { except: 'b', variant: 'east' })).toBe(null);               // the city being played is left out
    const list = r.bests(5);
    expect(list.length).toBe(2);                                                                // one per layout, not one for the seed
    expect(list.map((x) => x.mapVariant)).toEqual(['east', undefined]);                         // classic's entry has no new field
  });
  it('treats a record from before Stage 4.5 (no layout) as classic', () => {
    const storage = memory();
    storage.data[RECORDS_KEY] = JSON.stringify({ version: 1, cities: [{ id: 'old', seed: 11, difficulty: 'normal', scoreVersion: 2, best: 250, bestDay: 900, medal: null, splits: { town: 100 }, updated: 1 }], chronicle: [] });
    const r = createRecords({ storage });
    expect(r.bestFor(11, 'normal').score).toBe(250);
    expect(r.bestFor(11, 'normal', { variant: 'east' })).toBe(null);
    expect(r.bests(3).map((x) => [x.seed, x.mapVariant])).toEqual([[11, undefined]]);
  });
});
