import { describe, it, expect } from '../../harness.js';
import { MONUMENTS, MONUMENT } from '../../../src/data/monuments.js';
import { PALACE_STYLES } from '../../../src/data/palace.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { place, canPlace, conditionsFor, setPaused, demolishAt, previewPlazaTiles, paintPlazaTiles } from '../../../src/sim/commands.js';
import { undo } from '../../../src/sim/undo.js';
import { isUnlocked } from '../../../src/sim/progression.js';
import {
  prestigeOf, prestigeByKind, prestigeOfBuilding, monumentMood, monumentsPart, courseOf, siteProgress, remainingNeed, stockRoom, paceOf,
  crewsFor, siteStatus, monumentMonth, monumentAlerts, updatePrestigeUnlocks, monumentDay,
} from '../../../src/sim/monuments.js';
import { palaceOf, palaceQuote, enlargePalace, palaceDay, palaceMood } from '../../../src/sim/palace.js';
import { scoreOf } from '../../../src/sim/score.js';
import { updateMood } from '../../../src/sim/mood.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { tradePrices } from '../../../src/sim/trade.js';
import { desirabilityAt, desirabilityPreview } from '../../../src/sim/desirability.js';
import { advanceDays, runMonth } from '../../../src/sim/clock.js';
import { monthlyEconomy } from '../../../src/sim/economy.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A city with a road along y = 10 (fertile land is x < 8), at the given milestone.
function city(milestone = 'capital', gold = 100000) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = milestone;
  return w;
}
// A monument set by hand to the contract's shapes: courses done, finished or not.
function monument(w, type, x, y, { course = 0, done = null } = {}) {
  const b = addRaw(w, type, x, y);
  Object.assign(b.site, { course, done });
  return b;
}

describe('s4 contract placing monuments', () => {
  it('founds a site with its founding cost, an empty site and the rotation kept', () => {
    const w = city();
    const r = place(w, 'mastaba_small', 12, 7, { rot: 1 });
    expect(r.ok).toBe(true);
    const b = w.buildings[r.id];
    expect([b.w, b.d, b.rot, b.site.course, b.site.done, w.gold]).toEqual([2, 3, 1, 0, null, 100000 - 1000]);
    expect(w.undo[w.undo.length - 1]).toEqual({ kind: 'place', ids: [b.id], cost: 1000, walls: [] });
    const p = place(w, 'colossus', 20, 8, { rot: 1 });                          // a colossus does not turn
    expect([w.buildings[p.id].w, w.buildings[p.id].d, w.buildings[p.id].rot]).toEqual([2, 2, 0]);
  });
  it('refuses a monument on the fields, before its unlock, and when founding would take the treasury below 0', () => {
    const w = city();
    expect(canPlace(w, 'obelisk_small', 5, 9).reason).toBe('not_on_fields');
    expect(canPlace(w, 'obelisk_small', 12, 9).ok).toBe(true);
    w.milestone = 'town';
    expect(canPlace(w, 'obelisk_small', 12, 9).reason).toBe('locked');
    w.milestone = 'capital';
    expect(canPlace(w, 'pyramid_small', 12, 6).reason).toBe('locked');          // Capital alone is not enough: 100 prestige
    w.prestigeUnlocks.pyramid_small = 10;
    expect(canPlace(w, 'pyramid_small', 12, 6).ok).toBe(true);
    w.gold = 149;
    expect(canPlace(w, 'obelisk_small', 12, 9).reason).toBe('no_gold');          // 150 gold: never below 0 (ruling 227)
    expect(canPlace(w, 'well', 12, 9).ok).toBe(true);                             // other buildings may still go into debt
    w.gold = 150;
    expect(canPlace(w, 'obelisk_small', 12, 9).ok).toBe(true);
  });
  it('lets a site wait for its road, and judges crew and supply once a road touches it', () => {
    const w = city();
    const away = conditionsFor(w, 'obelisk_small', 20, 4, { roadLater: true });
    expect([away.state, away.conditions.map((c) => c.key)]).toEqual(['later', ['ground', 'road', 'gold']]);
    const near = conditionsFor(w, 'obelisk_small', 20, 9, { roadLater: true });
    expect(near.conditions.map((c) => [c.key, c.state, c.reason])).toEqual([['ground', 'met', null], ['road', 'met', null], ['crew', 'later', 'no_crew'], ['supply', 'later', 'no_stone'], ['gold', 'met', null]]);
    expect(canPlace(w, 'obelisk_small', 20, 9, { roadLater: true }).warnings).toEqual(near.warnings);
    addRaw(w, 'builders_guild', 22, 11);
    addRaw(w, 'quarry', 26, 11);
    const served = conditionsFor(w, 'obelisk_small', 20, 9, { roadLater: true });
    expect([served.state, served.conditions.find((c) => c.key === 'crew').n]).toEqual(['ok', 1]);
    const fields = conditionsFor(w, 'mastaba_large', 5, 6);
    expect(fields.conditions[0]).toEqual({ key: 'ground', state: 'cant', reason: 'not_on_fields', fertile: 9, of: 12 });
    expect(conditionsFor(w, 'obelisk_small', 12, 9).conditions.find((c) => c.key === 'gold').floor).toBe(0);
    expect(conditionsFor(w, 'well', 12, 9).conditions.find((c) => c.key === 'gold').floor).toBe(undefined);
  });
  it('allows one palace a city', () => {
    const w = city('town');
    expect(place(w, 'palace', 12, 7).ok).toBe(true);
    expect(canPlace(w, 'palace', 20, 7).reason).toBe('one_only');
    expect(palaceOf(w).style).toBe(0);
  });
  it('pauses a site like any building, never a finished monument, and undoes a site only before any work', () => {
    const w = city();
    const s = w.buildings[place(w, 'colossus', 12, 8).id];
    expect(setPaused(w, s.id, true).ok).toBe(true);
    expect(s.paused).toBe(true);
    expect(setPaused(w, s.id, false).ok).toBe(true);
    s.site.laid.stone = 0.67;                                                     // one crew-day of work
    expect(undo(w)).toEqual({ ok: false, reason: 'work_begun', id: s.id, type: 'colossus' });
    expect([Boolean(w.buildings[s.id]), w.undo.length]).toEqual([true, 0]);       // refused and dropped
    const f = monument(w, 'obelisk_small', 20, 9, { course: 3, done: 40 });
    expect(setPaused(w, f.id, true).reason).toBe('finished');
    const t = w.buildings[place(w, 'obelisk_large', 24, 9).id];
    expect(undo(w).ok).toBe(true);                                                // no work: undone with a full refund
    expect(w.buildings[t.id]).toBe(undefined);
  });
  it('refunds a quarter of the founding on demolish, and undo of that demolish puts the courses back', () => {
    const w = city();
    const s = monument(w, 'pyramid_small', 12, 5, { course: 7 });
    const gold = w.gold;
    expect(demolishAt(w, 12, 5).refund).toBe(750);                                // spec 4.16 (ruling 256)
    expect([w.gold - gold, prestigeOf(w)]).toEqual([750, 0]);
    expect(undo(w).ok).toBe(true);
    expect([w.buildings[s.id].site.course, prestigeOf(w), w.gold]).toEqual([7, 70, gold]);
  });
  it('paints plazas like plots from City, one undo step, skipping taken tiles', () => {
    const w = city('market_town');
    expect(previewPlazaTiles(w, [[12, 9]]).reason).toBe('locked');
    w.milestone = 'city';
    addRaw(w, 'well', 13, 9);
    const r = paintPlazaTiles(w, [[12, 9], [13, 9], [14, 9], [14, 9]]);
    expect([r.ok, r.ids.length, r.cost, r.skipped]).toEqual([true, 2, 16, [{ x: 13, y: 9, reason: 'occupied' }]]);
    expect(undo(w).ok).toBe(true);
    expect(r.ids.map((id) => Boolean(w.buildings[id]))).toEqual([false, false]);
    expect(previewPlazaTiles(w, [[13, 9]]).reason).toBe('nothing_to_place');
  });
});

describe('s4 contract prestige, its unlocks, mood and the Monuments part', () => {
  it('measures prestige from the monuments standing: courses rounded down, the completion share, one of each kind', () => {
    const w = city();
    expect(prestigeOf(w)).toBe(0);
    const a = monument(w, 'mastaba_small', 12, 7, { course: 1 });                 // 35 x 1/4 = 8.75 -> 8
    expect([prestigeOfBuilding(a), prestigeOf(w)]).toEqual([8, 8]);
    const b = monument(w, 'mastaba_small', 20, 7, { course: 4, done: 90 });      // finished: 70; the other counts no longer
    expect([prestigeOf(w), prestigeByKind(w).mastaba_small]).toEqual([70, { prestige: 70, id: b.id }]);
    monument(w, 'obelisk_small', 25, 9, { course: 3, done: 30 });
    expect(prestigeOf(w)).toBe(80);
    expect([monumentMood(w), monumentsPart(0), monumentsPart(10), monumentsPart(700), monumentsPart(900)]).toEqual([1, 0, 12, 100, 100]);
    expect(scoreOf(w).parts.monuments).toBe(monumentsPart(80));
    const ladder = [10, 90, 160, 270, 430, 700].map(monumentsPart);
    expect(ladder).toEqual([12, 36, 48, 62, 78, 100]);                            // spec 4.19's curve
    w.buildings[b.id].site.done = null; w.buildings[b.id].site.course = 2;
    expect(prestigeOf(w)).toBe(27);                                               // 17 for two courses, and the obelisk's 10
  });
  it('adds the Monuments and Palace mood rows only while they are not 0', () => {
    const w = city();
    updateMood(w);
    expect(['monuments', 'palace'].map((k) => k in w.moodBreakdown)).toEqual([false, false]);
    for (const [i, t] of [[0, 'obelisk_small'], [1, 'obelisk_large'], [2, 'colossus'], [3, 'mastaba_small'], [4, 'mastaba_large']]) monument(w, t, 12 + 3 * i, 7, { course: MONUMENTS[t].courses.length, done: 1 });
    const pal = addRaw(w, 'palace', 12, 11, { style: 2 });
    updateMood(w);
    expect([w.moodBreakdown.monuments, w.moodBreakdown.palace]).toEqual([3, 2]);  // 270 prestige: +3; pylons: +2
    expect(palaceMood(w)).toBe(PALACE_STYLES[2].mood);
    pal.style = 0;
    expect(palaceMood(w)).toBe(0);
  });
  it('records the prestige unlocks once, with the pyramids split, New badges and an event, and they stay', () => {
    const w = city('great_city');
    for (const [i, t] of [[0, 'colossus'], [1, 'mastaba_small']]) monument(w, t, 12 + 4 * i, 7, { course: MONUMENTS[t].courses.length, done: 1 });
    w.day = 500;
    const events = [];
    updatePrestigeUnlocks(w, events);
    expect(w.prestigeUnlocks.pyramid_small).toBe(null);                          // 120 prestige, but not yet Capital
    w.milestone = 'capital';
    updatePrestigeUnlocks(w, events);
    expect([w.prestigeUnlocks, w.splits.pyramids, w.newItems, events]).toEqual([{ pyramid_small: 500, pyramid_great: null }, 500, ['pyramid_small'], [{ type: 'prestige_unlock', id: 'pyramid_small', day: 500 }]]);
    expect([isUnlocked(w, 'pyramid_small'), isUnlocked(w, 'pyramid_great')]).toEqual([true, false]);
    for (const id of Object.keys(w.buildings)) demolishAt(w, w.buildings[id].x, w.buildings[id].y);
    w.day = 600;
    updatePrestigeUnlocks(w, events);
    expect([prestigeOf(w), w.prestigeUnlocks.pyramid_small, isUnlocked(w, 'pyramid_small'), events.length]).toEqual([0, 500, true, 1]);
    monument(w, 'pyramid_great', 2, 0, { course: 12, done: 590 });
    updatePrestigeUnlocks(w, events);
    expect([w.splits.great_pyramid, w.prestigeUnlocks.pyramid_great]).toEqual([590, null]);   // its own 270 prestige is under 300
  });
});

describe('s4 contract site facts and the monthly roll', () => {
  it('reads a site\'s course, progress, remaining need, stockpile room and pace from its state', () => {
    const w = city();
    const s = monument(w, 'pyramid_small', 12, 5, { course: 2 });
    Object.assign(s.site, { laid: { stone: 408, bricks: 72 }, stock: { stone: 100, bricks: 30 } });
    expect(courseOf(s)).toEqual({ stone: 816, bricks: 144 });
    expect(siteProgress(s)).toEqual({ course: 2, courses: 8, inCourse: 0.5, done: 2.5 / 8 });
    expect(remainingNeed(s)).toEqual({ stone: 816 * 6 - 408, bricks: 144 * 6 - 72 });
    expect(stockRoom(s)).toEqual({ stone: 30, bricks: 30 });                      // 160 at most in all (40 x 4 crews), 130 held
    expect(paceOf(w, s)).toBe(null);                                             // no month yet
    s.site.last = { units: 80, gold: 400, crews: 4 };
    expect(paceOf(w, s)).toBe(Math.ceil(((816 + 144) * 5.5 / 80) * 30));
    s.site.last.units = 0;
    expect(paceOf(w, s)).toBe(null);
    const o = monument(w, 'obelisk_small', 25, 9, { course: 2 });
    o.site.stock.stone = 15;
    expect(stockRoom(o)).toEqual({ stone: 5, bricks: 0 });                        // never more than the courses still need
    expect(crewsFor(w, s)).toEqual({ guilds: [], max: 4 });
  });
  it('gives the site sheet its facts, with the road and pause first among the reasons', () => {
    const w = city();
    const s = monument(w, 'mastaba_small', 12, 8, { course: 1 });
    s.site.reason = 'no_bricks'; s.site.idle = 3;
    const st = siteStatus(w, s);
    expect([st.finished, st.road, st.paused, st.stalled, st.reason, Object.keys(st.materials)]).toEqual([false, true, false, true, 'no_bricks', ['stone', 'bricks']]);
    expect(st.prestige).toEqual({ now: 8, more: 62, holds: true });
    expect(alertsFor(w).filter((a) => a.code === 'site_stalled')).toEqual([{ code: 'site_stalled', id: s.id, reason: 'no_bricks' }]);
    s.paused = true;
    expect([siteStatus(w, s).reason, monumentAlerts(w)]).toEqual(['paused', []]);
    const far = monument(w, 'obelisk_small', 20, 3);
    far.site.idle = 9;
    expect([siteStatus(w, far).reason, monumentAlerts(w)]).toEqual(['no_road', []]);
    expect(Object.keys(siteStatus(w, far).materials)).toEqual(['stone']);
    expect(siteStatus(w, addRaw(w, 'well', 25, 9))).toBe(null);                     // not a monument: no site facts
  });
  it('warns of no road for a site, never for a finished monument (ruling 228)', () => {
    const w = city();
    const s = monument(w, 'obelisk_small', 20, 3);                                // no road beside it
    const noRoad = () => alertsFor(w).filter((a) => a.code === 'no_road' && a.id === s.id).length;
    expect(noRoad()).toBe(1);
    Object.assign(s.site, { course: 3, done: 40 });
    expect(noRoad()).toBe(0);
    const well = addRaw(w, 'well', 26, 3);                                        // other buildings keep the warning
    expect(alertsFor(w).filter((a) => a.code === 'no_road' && a.id === well.id).length).toBe(1);
  });
  it('rolls each site\'s month into last month, marks a starved month and puts the gold in last month\'s stats', () => {
    const w = city();
    const s = monument(w, 'colossus', 12, 8, { course: 1 });
    Object.assign(s.site.month, { units: 40, gold: 200, crews: 2, crewDays: 60, starvedDays: 3 });
    const f = monument(w, 'obelisk_small', 20, 9, { course: 3, done: 5 });
    f.site.last = { units: 7, gold: 35, crews: 1 };
    monthlyEconomy(w);
    monumentMonth(w);
    expect([s.site.last, s.site.starved, s.site.month, f.site.last, w.stats.lastMonth.monuments]).toEqual([
      { units: 40, gold: 200, crews: 2 }, true, { units: 0, gold: 0, crews: 0, crewDays: 0, starvedDays: 0 }, { units: 7, gold: 35, crews: 1 }, 200]);
  });
  it('runs the monument and palace steps in the tick: a site with no guild lays nothing, the palace works count down', () => {
    const w = city('city');
    const s = monument(w, 'obelisk_small', 20, 3);                               // no road, no guild, no stone
    const gold = w.gold;
    monumentDay(w, []);
    expect([s.site.course, s.site.done, w.gold]).toEqual([0, null, gold]);
    const pal = addRaw(w, 'palace', 12, 11, { style: 1, works: { style: 2, left: 2 } });
    const events = [];
    advanceDays(w, 2, events);
    expect([pal.style, pal.works, events.filter((e) => e.type === 'palace_done')]).toEqual([2, null, [{ type: 'palace_done', id: pal.id, style: 2 }]]);
    w.day = 29;
    runMonth(w);
    expect(w.stats.lastMonth.monuments).toBe(0);
  });
});

describe('s4 contract the palace, desirability and stone', () => {
  it('quotes and enlarges the palace one style at a time, by milestone, with a road, never below 0', () => {
    const w = city('town', 700);
    const pal = w.buildings[place(w, 'palace', 12, 7).id];
    expect(palaceQuote(w, pal.id)).toEqual({ next: 1, price: 600, days: 30, milestone: 'market_town', ok: false, reason: 'locked' });
    w.milestone = 'market_town';
    w.gold = 599;
    expect(enlargePalace(w, pal.id).reason).toBe('no_gold');
    w.gold = 600;
    expect(enlargePalace(w, pal.id)).toEqual({ ok: true, warnings: [], style: 1, price: 600, days: 30 });
    expect([w.gold, pal.works, w.tally.enlargements, w.undo.length]).toEqual([0, { style: 1, left: 30 }, 1, 0]);   // the placing is no longer undoable
    expect(undo(w).ok).toBe(false);                                               // so Undo cannot take the palace and its works
    expect([Boolean(w.buildings[pal.id]), pal.works]).toEqual([true, { style: 1, left: 30 }]);
    expect(palaceQuote(w, pal.id).reason).toBe('works');
    for (let i = 0; i < 30; i++) palaceDay(w);
    expect([pal.style, pal.works]).toEqual([1, null]);
    pal.style = 4;
    expect(palaceQuote(w, pal.id).reason).toBe('last_style');
    expect(palaceQuote(w, 999)).toEqual({ next: null, price: 0, days: 0, milestone: null, ok: false, reason: 'not_palace' });
    const lone = addRaw(w, 'palace', 20, 3);
    w.milestone = 'capital'; w.gold = 1e6;
    expect(palaceQuote(w, lone.id).reason).toBe('no_road');
  });
  it('gives a site dust and noise, a finished monument its values with no road, and the palace its style\'s', () => {
    const w = city();
    const s = monument(w, 'obelisk_small', 20, 9);
    expect(desirabilityAt(w, 21, 9)).toBe(-3);
    s.site.done = 1; s.site.course = 3;
    expect(desirabilityAt(w, 21, 9)).toBe(6);
    const lone = monument(w, 'obelisk_small', 28, 2, { course: 3, done: 2 });       // no road: still gives its values
    expect(desirabilityAt(w, 29, 2)).toBe(6);
    lone.site.done = null;
    expect(desirabilityAt(w, 29, 2)).toBe(0);                                     // a road-less site gives nothing
    const pal = addRaw(w, 'palace', 4, 11, { style: 4 });
    expect(desirabilityAt(w, 7, 11)).toBe(14);
    pal.style = 0;
    expect(desirabilityAt(w, 7, 11)).toBe(4);
    expect(desirabilityPreview(w, 'mastaba_small', 12, 4, { rot: 1, site: true }).tiles.find((t) => t.x === 14 && t.y === 4).v).toBe(-3);
  });
  it('lists Memphis\'s stone only from City', () => {
    const w = city('market_town');
    expect('stone' in tradePrices(w, 'memphis').sells).toBe(false);
    w.milestone = 'city';
    expect(tradePrices(w, 'memphis').sells.stone).toBe(6);
  });
});
