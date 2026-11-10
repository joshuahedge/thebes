// Version 9.3 S.2 (rulings 1965-1974): records version 3, decree rows and week rivals.
import { describe, it, expect } from '../../harness.js';
import { createRecords, normalizeRecords, mergeRecords, emptyRecords, RECORDS_VERSION } from '../../../src/save/records.js';
import { createWorld } from '../../../src/sim/world.js';
import { fakeLocal } from '../../helpers/fakeStorage.js';

const parts = (n) => ({ people: n, prosperity: n, culture: n, safety: n, monuments: n, bonus: n });
const world = () => { const w = createWorld({ seed: 202647, decree: { week: '2026-47', ids: ['sea_peoples'] } }); w.day = 2160; return w; };
const sc = (total, medal = null, n = 50) => ({ total, parts: parts(n), medal });

describe('v93 s records', () => {
  it('reads a version 2 blob with an empty decrees list and every old row as it was', () => {
    const v2 = { version: 2, cities: [], chronicle: [], rulers: [], rivals: [], dynasty: { name: 'Ramesses', heir: 'steady' } };
    const r = normalizeRecords(v2);
    expect(r.decrees).toEqual([]); expect(r.version).toBe(3); expect(RECORDS_VERSION).toBe(3);
    expect(r.dynasty).toEqual({ name: 'Ramesses', heir: 'steady' });
    expect(emptyRecords().decrees).toEqual([]);
    const l = fakeLocal(); l.setItem('thebes.records', JSON.stringify(v2));
    const rec = createRecords({ storage: l });
    expect(rec.decrees()).toEqual([]);
    expect(rec.load().dynasty.name).toBe('Ramesses');
  });
  it('keeps the best run of a week, counts every try, and drops bad rows', () => {
    const rec = createRecords({ storage: fakeLocal() });
    const a = rec.noteDecree(world(), { now: 10, score: sc(300, 'bronze'), mark: 'Sea Peoples, week 47' });
    expect([a.week, a.score, a.tries, a.date, a.mark, a.parts.bonus, a.ids]).toEqual(['2026-47', 300, 1, 10, 'Sea Peoples, week 47', 50, ['sea_peoples']]);
    const b = rec.noteDecree(world(), { now: 20, score: sc(250) });
    expect([b.score, b.tries, b.date]).toEqual([300, 2, 10]);
    const c = rec.noteDecree(world(), { now: 30, score: sc(400, 'silver') });
    expect([c.score, c.tries, c.date, c.medal]).toEqual([400, 3, 30, 'silver']);
    expect(rec.decrees().length).toBe(1);
    expect(rec.noteDecree(createWorld({ seed: 1 }), { now: 1, score: sc(1) })).toBe(null);          // no decree
    expect(rec.noteDecree(world(), { now: 1 })).toBe(null);                                          // no score
    expect(rec.noteDecree(world(), { now: 1, score: { total: 1, parts: { people: 1 }, medal: null } })).toBe(null);
    expect(normalizeRecords({ decrees: [{ week: '2026-99', score: 1, parts: parts(1) }, { week: '2026-47', score: 1, parts: { people: 1 } }] }).decrees).toEqual([]);
  });
  it('lists newest first', () => {
    const rec = createRecords({ storage: fakeLocal() });
    const w = world(); rec.noteDecree(w, { now: 5, score: sc(100) });
    w.decree.week = '2026-48'; rec.noteDecree(w, { now: 9, score: sc(100) });
    expect(rec.decrees().map((d) => d.week)).toEqual(['2026-48', '2026-47']);
  });
  it('merges by week: the higher score, this device on a tie, tries added', () => {
    const row = (week, score, name, tries) => ({ week, ids: [], mark: '', score, parts: parts(10), medal: null, day: 1, map: '', feats: [], title: '', name, tries, date: name === 'Mine' ? 1 : 2 });   // two devices: different first dates, so different ids
    const a = { decrees: [row('2026-47', 300, 'Mine', 2), row('2026-48', 200, 'Mine', 1)] };
    const b = { decrees: [row('2026-47', 350, 'Theirs', 3), row('2026-48', 200, 'Theirs', 1), row('2026-49', 100, 'Theirs', 1)] };
    const m = mergeRecords(a, b).decrees;
    const at = (w) => m.find((d) => d.week === w);
    expect([at('2026-47').score, at('2026-47').name, at('2026-47').tries]).toEqual([350, 'Theirs', 5]);
    expect([at('2026-48').name, at('2026-48').tries]).toEqual(['Mine', 2]);
    expect(m.length).toBe(3);
    const rec = createRecords({ storage: fakeLocal() });
    rec.merge(b);
    expect(rec.decrees().length).toBe(3);
  });
  it('re-importing your own export leaves tries as they were; two devices still sum', () => {
    const a = createRecords({ storage: fakeLocal() }), b = createRecords({ storage: fakeLocal() });
    a.noteDecree(world(), { now: 10, score: sc(300) }); a.noteDecree(world(), { now: 11, score: sc(200) });
    b.noteDecree(world(), { now: 99, score: sc(250) });
    const own = a.load();
    a.merge(own); a.merge(own);
    expect(a.decrees()[0].tries).toBe(2);
    a.merge(b.load());
    expect([a.decrees()[0].tries, a.decrees()[0].score]).toEqual([3, 300]);
  });
  it('keeps a friend on a week as a rival apart from the main game rivals', () => {
    const rec = createRecords({ storage: fakeLocal() });
    const link = { ok: true, kind: 'decree', week: '2026-47', parts: parts(60), splits: {}, name: 'Amun', heir: 'builder' };
    const row = rec.addRival(link, 5);
    expect([row.week, row.score, row.name, row.seed, row.difficulty]).toEqual(['2026-47', 360, 'Amun', 202647, 'normal']);
    expect(rec.addRival({ ...link, parts: parts(70) }, 6).score).toBe(420);                      // the same name and week: the newer replaces
    expect(rec.rivalsForWeek('2026-47').length).toBe(1);
    expect(rec.rivalsForWeek('2026-48').length).toBe(0);
    expect(rec.rivalsFor(202647, 'normal').length).toBe(0);                                       // not on the main map of that seed
    expect(rec.addRival({ ...link, name: '' }, 7)).toBe(null);
    expect(rec.addRival({ ...link, week: '2026-60' }, 7)).toBe(null);
    expect(rec.addRival({ ...link, parts: { people: 1 } }, 7)).toBe(null);
    expect(rec.addRival({ ...link, week: undefined }, 7, { week: '2026-48' }).week).toBe('2026-48');
    expect(rec.load().rivals.length).toBe(2);
  });
  it('a main-game rival is exactly as before', () => {
    const rec = createRecords({ storage: fakeLocal() });
    const row = rec.addRival({ ok: true, name: 'Ka', seed: 5, difficulty: 'normal', parts: { people: 10, prosperity: 10, culture: 10, safety: 10, monuments: 10 }, splits: {} }, 1);
    expect([row.id, row.score, 'week' in row]).toEqual(['Ka@5|normal', 50, false]);
    expect(rec.rivalsFor(5, 'normal').length).toBe(1);
  });
});
