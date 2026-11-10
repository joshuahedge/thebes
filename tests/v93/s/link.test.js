// Version 9.3 S.3, S.4 (rulings 1969-1974): the decree link and its text.
import { describe, it, expect } from '../../harness.js';
import { decreeLink, parseShareLink, shareLink, shareCheck, decreeShareText } from '../../../src/ui/share.js';
import { SHARE } from '../../../src/data/scoring.js';

const parts = { people: 80, prosperity: 60, culture: 40, safety: 90, monuments: 20, bonus: 100 };
const hashOf = (link) => link.slice(link.indexOf('#'));

describe('v93 s link', () => {
  it('builds #d1.<week>.<six parts>.<splits>.<check> and reads it back', () => {
    const link = decreeLink({ week: '2026-47', parts, splits: { town: 120 } });
    expect(link.startsWith(`${SHARE.base}#d1.2026-47.80-60-40-90-20-100.`)).toBe(true);
    const body = hashOf(link).slice(1).split('.').slice(0, 4).join('.');
    expect(hashOf(link).endsWith(`.${shareCheck(body)}`)).toBe(true);
    const back = parseShareLink(hashOf(link));
    expect(back.ok).toBe(true); expect(back.kind).toBe('decree'); expect(back.week).toBe('2026-47');
    expect(back.parts).toEqual(parts);
    expect(back.splits.town).toBe(120); expect(back.splits.pyramids).toBe(null);
    expect(back.name).toBe(undefined);
  });
  it('carries a name and heir outside the check', () => {
    const link = decreeLink({ week: '2026-47', parts, splits: {}, name: 'Hatshepsut', heir: 'builder' });
    expect(link.endsWith('&name=Hatshepsut&heir=b')).toBe(true);
    const back = parseShareLink(hashOf(link));
    expect([back.ok, back.name, back.heir]).toEqual([true, 'Hatshepsut', 'builder']);
    expect(decreeLink({ week: '2026-47', parts, splits: {}, name: '$$$' }).includes('&name')).toBe(false);
  });
  it('refuses a bad week, parts, check or format', () => {
    expect(decreeLink({ week: '2026-54', parts, splits: {} })).toBe('');
    expect(decreeLink({ week: '2026-47', parts: { ...parts, bonus: 101 }, splits: {} })).toBe('');
    expect(decreeLink({ week: '2026-47', parts: { people: 1 }, splits: {} })).toBe('');
    const good = hashOf(decreeLink({ week: '2026-47', parts, splits: {} }));
    expect(parseShareLink(good.replace('80-60', '81-60'))).toEqual({ ok: false, reason: 'bad_check' });
    expect(parseShareLink(good.replace('2026-47', '2026-60'))).toEqual({ ok: false, reason: 'malformed' });
    expect(parseShareLink('#d1.2026-47.1-2-3.x.abcd')).toEqual({ ok: false, reason: 'malformed' });
    expect(parseShareLink('#d2.2026-47.80-60-40-90-20-100.x-x-x-x-x-x-x.abcd')).toEqual({ ok: false, reason: 'newer_format' });
    expect(parseShareLink('#d0.2026-47.1.2.3')).toEqual({ ok: false, reason: 'malformed' });
  });
  it('leaves t links exactly as they were', () => {
    const t = shareLink({ seed: 5, difficulty: 'normal', parts: { people: 1, prosperity: 2, culture: 3, safety: 4, monuments: 5 }, splits: {} });
    const back = parseShareLink(hashOf(t));
    expect(back.ok).toBe(true); expect(back.kind).toBe(undefined); expect(back.seed).toBe(5);
    expect(parseShareLink('#nothing')).toBe(null);
  });
  it('writes the share text', () => {
    const text = decreeShareText({ mark: 'Sea Peoples, week 47', total: 412, medal: 'silver', parts });
    const lines = text.split('\n');
    expect(lines[0]).toBe('Sea Peoples, week 47: 412 of 600, silver');
    expect(lines.length).toBe(7);
    expect(lines[6].endsWith('🟩🟩🟩🟩🟩')).toBe(true);
    expect(decreeShareText({ mark: 'X, week 1', total: 100, medal: null, parts: null })).toBe('X, week 1: 100 of 600');
  });
});
