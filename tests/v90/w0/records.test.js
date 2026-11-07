// Version 9.0 wave 0 (rulings 1561, 1562): records version 2. rulers (never capped), rivals (at most 50, never one on the map being played)
// and the dynasty ({ name, heir }), each normalised like the cities and the chronicle; a version 1 blob reads with the three empty; the
// export carries them; mergeRecords merges rulers by id and rivals by name and map. Nothing in the game calls the new API yet.
import { describe, it, expect } from '../../harness.js';
import {
  createRecords, emptyRecords, normalizeRecords, mergeRecords, newDynasty, cleanName, mapSquareOf,
  RECORDS_VERSION, RIVALS_MAX, RULER_NAME_MAX, RULER_NAME_DEFAULT, MAP_SQUARE,
} from '../../../src/save/records.js';
import { RECORDS_KEY, RECORDS_MAX } from '../../../src/data/scoring.js';
import { createWorld } from '../../../src/sim/world.js';
import { sealReign } from '../../../src/sim/score.js';
import { packSave, unpackSave } from '../../../src/save/serialize.js';
import { shareLink, parseShareLink, sharedTotal } from '../../../src/ui/share.js';

function memory(start = null) {
  const data = start ? { [RECORDS_KEY]: JSON.stringify(start) } : {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
const stored = (storage) => JSON.parse(storage.data[RECORDS_KEY]);
// A city at City with a seal on day `day` (sealReign's own seal).
function sealed({ seed = 11, id = 'c1', day = 3600, heir = 'steady', difficulty = 'normal', mapVariant = 'classic', size } = {}) {
  const w = createWorld({ seed, cityId: id, heir, difficulty, mapVariant, ...(size ? { size } : {}) });
  w.day = day;
  w.milestone = 'city';
  w.feats.earned = ['quick_town'];
  const { seal } = sealReign(w, { passed: true, title: 'builder' });
  return { w, seal };
}
// A friend's link as parseShareLink reads it, with Track L's name and heir added.
function link({ seed = 11, difficulty = 'normal', variant = 'classic', size, name = 'Ana', heir = 'merchant', people = 80 } = {}) {
  const parts = { people, prosperity: 60, culture: 40, safety: 50, monuments: 30 };
  const text = shareLink({ seed, difficulty, parts, splits: { town: 300, city: 900 }, variant, ...(size ? { size } : {}) });
  const read = parseShareLink(text.slice(text.indexOf('#')));
  return { ...read, ...(name === null ? {} : { name }), heir };   // null: a link without a name (an 8.4 link)
}

describe('v90 w0 records: the shape, version 2', () => {
  it('starts empty with the three new parts, and reads a version 1 blob with them empty', () => {
    expect(RECORDS_VERSION).toBe(2);
    expect(emptyRecords()).toEqual({ version: 2, cities: [], chronicle: [], rulers: [], rivals: [], dynasty: { name: '', heir: 'steady' } });
    expect(newDynasty()).toEqual({ name: '', heir: 'steady' });
    const v1 = { version: 1, cities: [{ id: 'a', seed: 11, difficulty: 'normal', scoreVersion: 2, best: 250, bestDay: 900, medal: null, splits: { town: 100 }, updated: 1 }], chronicle: [] };
    const read = normalizeRecords(v1);
    expect([read.version, read.cities.length, read.rulers, read.rivals, read.dynasty]).toEqual([2, 1, [], [], { name: '', heir: 'steady' }]);
    const r = createRecords({ storage: memory(v1) });
    expect([r.rulers(), r.rivalsFor(11, 'normal'), r.dynasty()]).toEqual([[], [], { name: '', heir: 'steady' }]);
    expect(normalizeRecords('junk')).toEqual(emptyRecords());
  });
  it('writes version 2 with every part, the old ones as they were', () => {
    const storage = memory();
    const r = createRecords({ storage });
    const { w } = sealed();
    r.noteCity(w, 5);
    expect(Object.keys(stored(storage)).sort()).toEqual(['chronicle', 'cities', 'dynasty', 'rivals', 'rulers', 'version']);
    expect(stored(storage).version).toBe(2);
    expect(stored(storage).cities.length).toBe(1);
  });
  it('drops a ruler, rival or dynasty it cannot read, and cleans what it keeps', () => {
    const good = { id: 'x:1', n: 2, name: 'Ramesses', title: 'builder', heir: 'merchant', rank: 'city', day: 10, score: 300, parts: { people: 1 }, medal: 'bronze', version: 2, seed: 4, difficulty: 'hard', mapVariant: 'east', mapSize: 80, map: 'a'.repeat(1024), feats: ['f', 3], date: 9 };
    const raw = {
      rulers: [good, { ...good }, { ...good, id: 'y', name: '<>' }, { ...good, id: 'z', seed: 'x' }, { ...good, id: 'w', title: 'emperor', heir: 'no', rank: 'nowhere', map: 'short', mark: 'Sea Peoples, week 44' }],
      rivals: [{ name: 'Ana', seed: 4, difficulty: 'hard', score: 10, added: 1 }, { name: '', seed: 4, difficulty: 'hard', score: 10 }, { name: 'Bo', seed: -1, difficulty: 'hard', score: 10 }],
      dynasty: { name: '  Khufu!!  the  great ', heir: 'emperor' },
    };
    const n = normalizeRecords(raw);
    expect(n.rulers.map((r) => r.id)).toEqual(['x:1', 'w']);
    expect(n.rulers[0]).toEqual({ ...good, parts: { people: 1, prosperity: 0, culture: 0, safety: 0, monuments: 0 }, feats: ['f'] });
    const w = n.rulers[1];
    expect([w.title, w.heir, w.rank, w.map, w.mark]).toEqual(['steady', 'steady', null, '', 'Sea Peoples, week 44']);
    expect(n.rivals.map((v) => [v.id, v.name, v.heir, v.mapSize])).toEqual([['Ana@4|hard', 'Ana', 'steady', 64]]);
    expect(n.dynasty).toEqual({ name: 'Khufu the great', heir: 'steady' });
  });
  it('cleans a name to letters, digits, spaces and \'-. and at most 16 characters', () => {
    expect(RULER_NAME_MAX).toBe(16);
    expect([cleanName("Ana-Maria O'Neil."), cleanName('Ramesses the Great of Thebes'), cleanName('<b>Ana</b>'), cleanName('Ḥatšepsut'), cleanName(7), cleanName('   ')])
      .toEqual(["Ana-Maria O'Neil", 'Ramesses the Gre', 'bAnab', 'Ḥatšepsut', '', '']);
  });
});

describe('v90 w0 records: the rulers', () => {
  it('writes a ruler row at the Pass with every field the list and the side by side read', () => {
    const storage = memory();
    const r = createRecords({ storage });
    const { w, seal } = sealed({ heir: 'bountiful', mapVariant: 'east', size: 80 });
    const row = r.addRuler(w, seal, 'builder', 1760000000000);
    expect(row).toEqual({
      id: 'c1:3600', n: 1, name: RULER_NAME_DEFAULT, title: 'builder', heir: 'bountiful', rank: 'city', day: 3600, score: seal.score, parts: seal.parts,
      medal: seal.medal, version: seal.version, seed: 11, difficulty: 'normal', mapVariant: 'east', mapSize: 80, map: '', feats: ['quick_town'], date: 1760000000000,
    });
    expect([RULER_NAME_DEFAULT, MAP_SQUARE, mapSquareOf(w)]).toEqual(['Ramesses', 32, '']);   // Track L writes the map square
    expect(r.rulers()).toEqual([row]);
    expect(stored(storage).rulers).toEqual([row]);
  });
  it('numbers each ruler of a name in turn, and a new name from I', () => {
    const r = createRecords({ storage: memory() });
    const a = r.addRuler(sealed({ id: 'a' }).w, sealed({ id: 'a' }).seal, 'builder', 1);
    const b = r.addRuler(sealed({ id: 'b' }).w, sealed({ id: 'b' }).seal, 'merchant', 2);
    r.setDynasty({ name: 'Khufu' });
    const c = r.addRuler(sealed({ id: 'c' }).w, sealed({ id: 'c' }).seal, 'steady', 3);
    expect([a, b, c].map((x) => [x.name, x.n, x.title])).toEqual([['Ramesses', 1, 'builder'], ['Ramesses', 2, 'merchant'], ['Khufu', 1, 'steady']]);
    expect(r.rulers().map((x) => x.id)).toEqual(['c:3600', 'b:3600', 'a:3600']);   // newest first
    const again = r.addRuler(sealed({ id: 'b' }).w, sealed({ id: 'b' }).seal, 'generous', 4);   // the same city and seal: the row is replaced, under today's name
    expect([r.rulers().length, again.title, again.name, again.n]).toEqual([3, 'generous', 'Khufu', 2]);
  });
  it('keeps the map\'s newest rival as it stood at the Pass', () => {
    const r = createRecords({ storage: memory() });
    r.addRival(link({ name: 'Bo', people: 50 }), 10);
    r.addRival(link({ name: 'Ana', people: 90 }), 20);
    r.addRival(link({ name: 'Cy', seed: 12 }), 30);                                   // another map
    const { w, seal } = sealed();
    const row = r.addRuler(w, seal, 'builder', 40);
    expect([row.rival.name, row.rival.heir, row.rival.score, row.rival.parts.people, row.rival.splits]).toEqual(['Ana', 'merchant', sharedTotal(link({ people: 90 })), 90, { town: 300, city: 900 }]);
    expect('rival' in r.addRuler(sealed({ id: 'd', seed: 13 }).w, sealed({ id: 'd', seed: 13 }).seal, 'steady', 50)).toBe(false);
  });
  it('never caps the rulers: 250 kept beside a capped list of cities', () => {
    const rulers = Array.from({ length: 250 }, (_, i) => ({ id: `r${i}`, n: i + 1, name: 'Ramesses', title: 'steady', heir: 'steady', rank: 'city', day: 3600, score: i, parts: {}, medal: null, version: 2, seed: i, difficulty: 'normal', date: i }));
    const cities = Array.from({ length: 210 }, (_, i) => ({ id: `c${i}`, seed: i, difficulty: 'normal', best: null, splits: {}, updated: i }));
    const storage = memory({ version: 2, cities, chronicle: [], rulers, rivals: [], dynasty: newDynasty() });
    const r = createRecords({ storage });
    r.setDynasty({ name: 'Ana' });                                                   // any write applies the caps
    expect([stored(storage).cities.length, stored(storage).rulers.length, r.rulers().length]).toEqual([RECORDS_MAX, 250, 250]);
  });
});

describe('v90 w0 records: the dynasty', () => {
  it('names the dynasty and sets its heir, leaving a bad name or heir as it was', () => {
    const storage = memory();
    const r = createRecords({ storage });
    expect(r.dynasty()).toEqual({ name: '', heir: 'steady' });
    expect(r.setDynasty({ name: 'Ana', heir: 'builder' })).toEqual({ name: 'Ana', heir: 'builder' });
    expect(r.setDynasty({ name: '<>', heir: 'emperor' })).toEqual({ name: 'Ana', heir: 'builder' });
    expect(r.setDynasty({ heir: 'unconquered' })).toEqual({ name: 'Ana', heir: 'unconquered' });
    expect(r.dynasty()).toEqual({ name: 'Ana', heir: 'unconquered' });
    expect(stored(storage).dynasty).toEqual({ name: 'Ana', heir: 'unconquered' });
    expect(createRecords({ storage: null }).setDynasty({ name: 'Bo' })).toEqual({ name: 'Bo', heir: 'steady' });   // blocked storage never throws
  });
});

describe('v90 w0 records: the rivals', () => {
  it('keeps a friend\'s link with a name as a rival on its map, with its score as the link counts it', () => {
    const r = createRecords({ storage: memory() });
    const l = link({ variant: 'east', size: 80, difficulty: 'hard' });
    const row = r.addRival(l, 100);
    expect(row).toEqual({
      id: 'Ana@11|hard|east|80', name: 'Ana', heir: 'merchant', seed: 11, difficulty: 'hard', mapVariant: 'east', mapSize: 80,
      score: sharedTotal(l), parts: l.parts, splits: { town: 300, city: 900 }, version: 2, added: 100,
    });
    expect(r.rivalsFor(11, 'hard', 'east', 80)).toEqual([row]);
    expect([r.rivalsFor(11, 'hard'), r.rivalsFor(11, 'normal', 'east', 80)]).toEqual([[], []]);
    expect([r.addRival(link({ name: null }), 1), r.addRival(link({ name: '!!' }), 1), r.addRival({ ok: false, reason: 'bad_check' }, 1), r.addRival(null, 1)]).toEqual([null, null, null, null]);
  });
  it('replaces the same name on the same map, keeps it apart on another, and lists the newest added first', () => {
    const r = createRecords({ storage: memory() });
    r.addRival(link({ people: 10 }), 1);
    r.addRival(link({ name: 'Bo' }), 2);
    r.addRival(link({ people: 99 }), 3);
    r.addRival(link({ seed: 12 }), 4);
    expect(r.rivalsFor(11, 'normal').map((v) => [v.name, v.parts.people, v.added])).toEqual([['Ana', 99, 3], ['Bo', 80, 2]]);
    expect(r.rivalsFor(12, 'normal').map((v) => v.name)).toEqual(['Ana']);
  });
  it('keeps at most 50, the oldest added going first, never one on the map being played', () => {
    expect(RIVALS_MAX).toBe(50);
    const storage = memory();
    const r = createRecords({ storage });
    const playing = createWorld({ seed: 1000 });
    r.addRival(link({ seed: 1000, name: 'Old' }), 0);                                // the oldest, on the map being played
    for (let i = 1; i <= 52; i++) r.addRival(link({ seed: i, name: `R${i}` }), i, { playing });
    const kept = stored(storage).rivals.map((v) => v.name);
    expect(kept.length).toBe(50);
    expect([kept.includes('Old'), kept.includes('R1'), kept.includes('R3'), kept.includes('R4'), kept.includes('R52')]).toEqual([true, false, false, true, true]);
    r.addRival(link({ seed: 53, name: 'R53' }), 53);                                 // no map being played: the oldest goes
    expect(stored(storage).rivals.map((v) => v.name).includes('Old')).toBe(false);
  });
});

describe('v90 w0 records: merging and the export', () => {
  const ruler = (id, date, extra = {}) => ({ id, n: 1, name: 'Ramesses', title: 'builder', heir: 'steady', rank: 'city', day: 3600, score: 300, parts: {}, medal: null, version: 2, seed: 11, difficulty: 'normal', date, ...extra });
  const rival = (name, added, score) => ({ name, heir: 'merchant', seed: 11, difficulty: 'normal', score, added });
  it('merges rulers by id and rivals by name and map, the newer rival kept', () => {
    const mine = { version: 2, cities: [], chronicle: [], rulers: [ruler('a', 1), ruler('b', 2)], rivals: [rival('Ana', 5, 100), rival('Bo', 9, 50)], dynasty: { name: 'Khufu', heir: 'merchant' } };
    const theirs = { version: 2, cities: [], chronicle: [], rulers: [ruler('b', 2, { title: 'generous' }), ruler('c', 3)], rivals: [rival('Ana', 7, 200), rival('Bo', 1, 10), rival('Cy', 1, 1)], dynasty: { name: 'Ana', heir: 'builder' } };
    const m = mergeRecords(mine, theirs);
    expect(m.rulers.map((r) => [r.id, r.title])).toEqual([['a', 'builder'], ['b', 'builder'], ['c', 'builder']]);
    expect(m.rivals.map((v) => [v.name, v.score]).sort()).toEqual([['Ana', 200], ['Bo', 50], ['Cy', 1]]);
    expect(m.dynasty).toEqual({ name: 'Khufu', heir: 'builder' });                  // the other side holds the newest ruler: its heir
    expect(mergeRecords(theirs, mine).dynasty).toEqual({ name: 'Ana', heir: 'builder' });
    expect(mergeRecords({ ...mine, dynasty: { name: '', heir: 'steady' }, rulers: [] }, { ...theirs, rulers: [] }).dynasty).toEqual({ name: 'Ana', heir: 'steady' });
    const r = createRecords({ storage: memory(mine) });
    r.merge(theirs);
    expect(r.rulers().map((x) => x.id)).toEqual(['c', 'b', 'a']);
  });
  it('carries the rulers, rivals and dynasty in an export file', () => {
    const r = createRecords({ storage: memory() });
    const { w, seal } = sealed();
    r.addRival(link(), 1);
    r.addRuler(w, seal, 'builder', 2);
    r.setDynasty({ name: 'Ana', heir: 'builder' });
    const back = unpackSave(packSave(w, { savedAt: 1, lastSpeed: 1, records: r.load() })).records;
    const n = normalizeRecords(back);
    expect([n.rulers.length, n.rivals.length, n.dynasty]).toEqual([1, 1, { name: 'Ana', heir: 'builder' }]);
    expect(n).toEqual(r.load());
  });
});
