// Version 8.3, Track C (rulings 1436-1439): the workers' camp. Its price is a tenth of the site's founding price as this city pays it (difficulty, rank, style), it
// refuses with its reasons, it is not undoable, it clears when the monument is finished, and old saves (no camp) load and play as today.
import { describe, it, expect } from '../../harness.js';
import { campQuote, setCamp, monumentDay, crewPlan, guildsNear } from '../../../src/sim/monuments.js';
import { costOf } from '../../../src/sim/costs.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { place } from '../../../src/sim/commands.js';
import { undo } from '../../../src/sim/undo.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

function longCity(gold = 100000) {
  const w = makeTestWorld({ size: 128, gold });
  setRoad(w, 0, 10, 127, 10);
  w.milestone = 'capital';
  return w;
}
const guildAt = (w, x) => addRaw(w, 'builders_guild', x, 11, { staff: 16 });

describe('v83 c the camp\'s price', () => {
  it('is 10% of the site\'s founding price as this city pays it: the data, two difficulties and a later rank', () => {
    expect(MONUMENT.campShare).toBe(0.1);
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9);                                  // founding 150
    expect(campQuote(w, s.id)).toEqual({ price: 15, ok: true, reason: null });
    w.difficulty = 'hard';                                                       // 150 x 1.25 = 188: a tenth is 19
    expect([costOf(w, 'obelisk_small'), campQuote(w, s.id).price]).toEqual([188, 19]);
    w.difficulty = 'relaxed';                                                    // 150 x 0.8 = 120
    expect([costOf(w, 'obelisk_small'), campQuote(w, s.id).price]).toEqual([120, 12]);
    w.difficulty = 'normal';
    w.milestone = 'great_capital';                                               // monuments cost 10% more from this rank: 165
    expect([costOf(w, 'obelisk_small'), campQuote(w, s.id).price]).toEqual([165, 17]);
    w.difficulty = 'hard';                                                       // the growth is 1.25 times as strong on Hard
    expect([costOf(w, 'obelisk_small'), campQuote(w, s.id).price]).toEqual([211, 21]);
  });

  it('follows the site\'s style, and scales with the monument: a great pyramid\'s camp is worth thinking about', () => {
    const w = longCity();
    const s = addRaw(w, 'obelisk_small', 60, 9, { style: 'gilded' });             // Gilded costs 10% more
    expect([costOf(w, 'obelisk_small', { style: 'gilded' }), campQuote(w, s.id).price]).toEqual([165, 17]);
    const p = addRaw(w, 'pyramid_great', 80, 3);
    expect(campQuote(w, p.id).price).toBe(Math.round(0.1 * costOf(w, 'pyramid_great')));
    expect(campQuote(w, p.id).price > campQuote(w, s.id).price * 10).toBe(true);
  });
});

describe('v83 c setCamp', () => {
  it('takes the price, sets site.camp and changes nothing else', () => {
    const w = longCity(1000);
    const s = addRaw(w, 'obelisk_small', 60, 9);
    const before = JSON.stringify({ ...s.site, camp: undefined });
    expect(setCamp(w, s.id)).toEqual({ ok: true, price: 15 });
    expect([w.gold, s.site.camp]).toEqual([985, true]);
    expect(JSON.stringify({ ...s.site, camp: undefined })).toBe(before);
  });

  it('refuses with not_site, finished, has_camp and no_gold, each taking nothing', () => {
    const w = longCity(14);
    const s = addRaw(w, 'obelisk_small', 60, 9);
    const h = addRaw(w, 'house', 3, 8, { tier: 1, residents: 4 });
    expect([setCamp(w, 9999), setCamp(w, h.id)].map((r) => [r.ok, r.reason])).toEqual([[false, 'not_site'], [false, 'not_site']]);
    expect([setCamp(w, s.id).reason, w.gold, s.site.camp]).toEqual(['no_gold', 14, undefined]);   // 15 would take the treasury below 0
    w.gold = 15;
    expect(setCamp(w, s.id).ok).toBe(true);
    expect([w.gold, setCamp(w, s.id).reason, w.gold]).toEqual([0, 'has_camp', 0]);               // exactly 0 is allowed; a second camp is refused
    const done = addRaw(w, 'obelisk_small', 70, 9);
    Object.assign(done.site, { course: 3, done: 5 });
    w.gold = 1000;
    expect([setCamp(w, done.id).reason, w.gold, done.site.camp]).toEqual(['finished', 1000, undefined]);
  });

  it('is not undoable: it drops the site\'s own placing from the undo stack, so Undo cannot take the site and the camp\'s gold away', () => {
    const w = longCity();
    const r = place(w, 'obelisk_small', 60, 9);
    expect(r.ok).toBe(true);
    expect(w.undo.length).toBe(1);
    setCamp(w, r.id);
    expect(w.undo.length).toBe(0);
    expect(undo(w).ok).toBe(false);
  });

  it('clears when the monument is finished, and leaves nothing behind', () => {
    const w = longCity();
    const g = guildAt(w, 2);
    const s = addRaw(w, 'obelisk_small', 20, 9);
    Object.assign(s.site, { course: 2, stock: { stone: 40, bricks: 0 }, laid: { stone: 19.9, bricks: 0 } });
    setCamp(w, s.id);
    expect(s.site.camp).toBe(true);
    monumentDay(w);                                                              // a crew's day finishes the last unit
    w.day += 1;
    expect([s.site.done !== null, 'camp' in s.site, s.site.crews]).toEqual([true, false, []]);
    expect(crewPlan(w).has(g.id)).toBe(false);                                   // and no crew goes back to it
  });
});

describe('v83 c old saves and a saved camp', () => {
  it('plays a city saved before the camp (no site.camp) as today, and saves a camp and loads it back', () => {
    const w = longCity();
    const g = guildAt(w, 2);
    const s = addRaw(w, 'obelisk_small', 20, 9);
    s.site.stock.stone = 20;
    expect('camp' in s.site).toBe(false);                                        // an 8.2.1 site
    const old = deserialize(serialize(w));
    for (let i = 0; i < 40; i++) { monumentDay(old); old.day += 1; }
    const site = Object.values(old.buildings).find((b) => b.type === 'obelisk_small');
    expect(site.site.laid.stone > 0 || site.site.course > 0).toBe(true);        // it worked, at its walk's speed
    setCamp(w, s.id);
    const back = deserialize(serialize(w));
    const again = Object.values(back.buildings).find((b) => b.type === 'obelisk_small');
    expect([again.site.camp, back.gold]).toEqual([true, w.gold]);
    expect(guildsNear(back, { x: 30, y: 9, w: 1, d: 1 }).length).toBe(0);        // the guild is planned to the site
    expect(g.id).toBeGreaterThan(0);
  });
});
