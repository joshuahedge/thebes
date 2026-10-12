import { describe, it, expect } from '../../harness.js';
import { weeklySeed, isoWeek, shareLink, parseShareLink, shareCheck, sharedTotal, emojiRow, pictureCard } from '../../../src/ui/share.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };   // Stage 4: score v2's five parts
const SPLITS = { town: 14, market_town: 20, city: null, great_city: null, capital: null, pyramids: null, great_pyramid: null };
const V1 = { people: 72, prosperity: 65, culture: 58, safety: 40 };
const V1_SPLITS = { town: 14, market_town: 20, city: null, great_city: null, capital: null };

describe('s3 score sharing', () => {
  it('draws This week\'s Nile from the local date: ISO week-year x 100 + ISO week', () => {
    expect(weeklySeed(new Date(2026, 9, 11))).toBe(202641);                   // the spec's example, a Sunday
    expect(weeklySeed(new Date(2026, 9, 5))).toBe(202641);                    // that week's Monday
    expect(weeklySeed(new Date(2026, 9, 12))).toBe(202642);
    expect(weeklySeed(new Date(2026, 0, 1))).toBe(202601);                    // a Thursday: week 1
    expect(weeklySeed(new Date(2027, 0, 1))).toBe(202653);                    // still 2026's last week
    expect(weeklySeed(new Date(2024, 11, 30))).toBe(202501);                  // already 2025's first week
    expect(isoWeek(new Date(2026, 2, 30))).toEqual({ year: 2026, week: 14 }); // the Monday after the clocks change
    expect([weeklySeed(new Date('nonsense')), weeklySeed(null)]).toEqual([0, 0]);
  });
  it('makes the t2 link with its check, and reads it back; a t1 link still opens as older scoring (Stage 4)', () => {
    const link = shareLink({ seed: 202641, difficulty: 'normal', parts: PARTS, splits: SPLITS });
    const body = 't2.202641.n.72-65-58-40-36.14-20-x-x-x-x-x';
    expect(link).toBe(`https://joshuahedge.github.io/thebes/#${body}.${shareCheck(body)}`);
    expect(/^[0-9a-z]{4}$/.test(shareCheck(body))).toBe(true);
    expect(parseShareLink(new URL(link).hash)).toEqual({ ok: true, seed: 202641, difficulty: 'normal', parts: PARTS, splits: SPLITS, version: 2, older: false });
    expect(sharedTotal(parseShareLink(new URL(link).hash))).toBe(271);
    const hard = parseShareLink(new URL(shareLink({ seed: 7, difficulty: 'hard', parts: PARTS, splits: {} })).hash);
    expect([hard.difficulty, hard.splits.town, sharedTotal(hard)]).toEqual(['hard', null, Math.round(271 * 1.25)]);
    expect([shareLink({}), shareLink({ seed: 1, difficulty: 'easy', parts: PARTS }), shareLink({ seed: 1, difficulty: 'normal', parts: { ...PARTS, safety: 101 } }), shareLink({ seed: 1, difficulty: 'normal', parts: V1 })]).toEqual(['', '', '', '']);
    const old = 't1.202641.n.72-65-58-40.14-20-x-x-x';
    expect(parseShareLink(`#${old}.${shareCheck(old)}`)).toEqual({ ok: true, seed: 202641, difficulty: 'normal', parts: V1, splits: V1_SPLITS, version: 1, older: true });
    expect(sharedTotal(parseShareLink(`#${old}.${shareCheck(old)}`))).toBe(235);
  });
  it('says a typo, a newer link and a broken one apart, and ignores a hash that is no share link', () => {
    const link = shareLink({ seed: 202641, difficulty: 'normal', parts: PARTS, splits: SPLITS });
    const hash = new URL(link).hash;
    expect([parseShareLink(''), parseShareLink('#x'), parseShareLink('#welcome'), parseShareLink(null)]).toEqual([null, null, null, null]);
    expect(parseShareLink(hash.replace('72-65', '73-65'))).toEqual({ ok: false, reason: 'bad_check' });
    expect(parseShareLink(hash.replace('#t2', '#t3'))).toEqual({ ok: false, reason: 'newer_format' });
    expect(parseShareLink('#t2.202641.n.72-65-58-40.14-20-x-x-x-x-x.abcd')).toEqual({ ok: false, reason: 'malformed' });   // four parts in a t2 link
    expect(parseShareLink('#t1.202641.n.72-65-58-40-36.14-20-x-x-x.abcd')).toEqual({ ok: false, reason: 'malformed' });  // five parts in a t1 link
    expect(parseShareLink('#t2.202641.e.72-65-58-40-36.14-20-x-x-x-x-x.abcd')).toEqual({ ok: false, reason: 'malformed' });
    expect(parseShareLink('#t2.202641.n.72-65-58-400-36.14-20-x-x-x-x-x.abcd')).toEqual({ ok: false, reason: 'malformed' });
    expect(parseShareLink('#t2.202641.n.72-65-58-40-36.14-20-x-x-x-x-x')).toEqual({ ok: false, reason: 'malformed' });
  });
  it('writes the emoji row: one line per part, a square per 20 points', () => {
    expect(emojiRow(PARTS)).toBe('People 🟩🟩🟩⬜⬜\nProsperity 🟩🟩🟩⬜⬜\nCulture 🟩🟩⬜⬜⬜\nSafety 🟩🟩⬜⬜⬜\nMonuments 🟩⬜⬜⬜⬜');
    expect(emojiRow({ people: 100, prosperity: 0, culture: 19, safety: 20, monuments: 0 })).toBe('People 🟩🟩🟩🟩🟩\nProsperity ⬜⬜⬜⬜⬜\nCulture ⬜⬜⬜⬜⬜\nSafety 🟩⬜⬜⬜⬜\nMonuments ⬜⬜⬜⬜⬜');
    expect([emojiRow({}), emojiRow(null), emojiRow(V1)]).toEqual(['', '', '']);
  });
  it('paints the 1200x630 picture card: the city on the left, the four bars to scale on the right', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'temple', 4, 11);
    const c = pictureCard(w, { total: 235, raw: 235, factor: 1, parts: PARTS, medal: 'bronze' });
    expect([c.width, c.height]).toEqual([1200, 630]);
    const g = c.getContext('2d');
    const px = (x, y) => [...g.getImageData(x, y, 1, 1).data].slice(0, 3);
    expect(JSON.stringify(px(40, 40)) === JSON.stringify([0xF3, 0xE7, 0xCB])).toBe(false);   // the map, not the card's paper
    const teal = [0x1F, 0x6F, 0x66], paper2 = [0xEA, 0xDB, 0xB9];
    // People 72: its bar (x 650-1150, y 300-314) is teal to 72% of the way and paper beyond.
    expect([px(655, 307), px(650 + 355, 307), px(650 + 365, 307), px(1140, 307)]).toEqual([teal, teal, paper2, paper2]);
    // Safety 40 (the fourth bar, y 480-494).
    expect([px(650 + 195, 487), px(650 + 205, 487)]).toEqual([teal, paper2]);
    expect(pictureCard(null, null)).toBe(null);
  });
});
