import { describe, it, expect } from '../../harness.js';
import { monumentDay, monumentAlerts, siteStatus } from '../../../src/sim/monuments.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { place, setPaused, canPlace } from '../../../src/sim/commands.js';
import { TERRAIN_BY_NAME } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { undo } from '../../../src/sim/undo.js';
import { palaceQuote, enlargePalace } from '../../../src/sim/palace.js';
import { reasonText, SIM4_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A Capital with a road along y = 10 in the 32x32 test world (fertile land is x < 8; addRaw places anywhere).
function city(gold = 100000) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  return w;
}
const guild = (w, x, extra = {}) => addRaw(w, 'builders_guild', x, 11, { staff: 16, ...extra });
function run(w, days, events = null) {
  for (let i = 0; i < days; i++) { monumentDay(w, events); w.day += 1; }
}
const stalled = (events) => events.filter((e) => e.type === 'site_stalled');

describe('s4 sim stalls', () => {
  it('stalls a site after 3 days in a row without work, once, as a warning that names the cause; a day of work clears it', () => {
    const w = city();
    const s = addRaw(w, 'obelisk_small', 20, 9);
    const events = [];
    run(w, MONUMENT.stallDays - 1, events);
    expect([s.site.idle, s.site.reason, monumentAlerts(w), stalled(events)]).toEqual([2, 'no_crew', [], []]);
    run(w, 1, events);
    expect([s.site.idle, stalled(events), siteStatus(w, s).stalled]).toEqual([3, [{ type: 'site_stalled', id: s.id, kind: 'obelisk_small', reason: 'no_crew' }], true]);
    expect(alertsFor(w).filter((a) => a.code === 'site_stalled')).toEqual([{ code: 'site_stalled', id: s.id, reason: 'no_crew' }]);
    run(w, 5, events);
    expect([s.site.idle, stalled(events).length]).toEqual([8, 1]);              // one event a stall
    guild(w, 16);
    s.site.stock.stone = 5;
    run(w, 1, events);
    expect([s.site.idle, s.site.reason, monumentAlerts(w), siteStatus(w, s).stalled]).toEqual([0, null, [], false]);
  });

  it('names each cause in ruling 245\'s order: no crew, short of workers, burning, no gold, then a material', () => {
    const w = city(0);
    const s = addRaw(w, 'pyramid_small', 12, 6);                                  // 816 stone and 144 bricks a course
    const reason = () => { run(w, 1); return [s.site.reason, siteStatus(w, s).reason]; };
    expect(reason()).toEqual(['no_crew', 'no_crew']);
    const g1 = guild(w, 16, { staff: 3 });                                        // under a quarter of 16
    const g2 = guild(w, 18, { fire: { stage: 'fire', days: 0, left: 10 } });
    expect(reason()).toEqual(['crew_short', 'crew_short']);                       // short comes before burning
    g1.staff = 16; g1.fire = { stage: 'fire', days: 0, left: 10 };
    expect(reason()).toEqual(['crew_burning', 'crew_burning']);
    g1.fire = null; g2.fire = null;
    expect(reason()).toEqual(['no_gold', 'no_gold']);                             // the treasury is at 0, and no stone either
    w.gold = 1000;
    expect(reason()).toEqual(['no_stone', 'no_stone']);
    s.site.stock.stone = 50;
    expect(reason()).toEqual(['no_bricks', 'no_bricks']);
    s.site.stock.bricks = 50;
    expect(reason()).toEqual([null, null]);
  });

  it('keeps a paused or road-less site idle at 0 with no stall warning; its reason is paused or no road', () => {
    const w = city();
    const s = addRaw(w, 'obelisk_small', 20, 9);
    const lone = addRaw(w, 'obelisk_small', 20, 3);
    run(w, 5);
    expect([s.site.idle, lone.site.idle, lone.site.reason, siteStatus(w, lone).reason]).toEqual([5, 0, 'no_road', 'no_road']);
    expect(setPaused(w, s.id, true).ok).toBe(true);
    run(w, 5);
    expect([s.site.idle, s.site.reason, siteStatus(w, s).reason, siteStatus(w, s).stalled, monumentAlerts(w)]).toEqual([0, 'paused', 'paused', false, []]);
    expect(alertsFor(w).filter((a) => a.id === lone.id).map((a) => a.code)).toEqual(['no_road']);
  });
});

describe('s4 sim the site sheet\'s supply facts', () => {
  it('lists the quarries and brickworks whose reach takes in the site, and the storehouses within 16 that hold its material', () => {
    const w = city();
    const s = addRaw(w, 'mastaba_small', 14, 8);                                  // road (14..16, 10)
    const q = addRaw(w, 'quarry', 20, 11);                                        // 5 road tiles away
    const bw = addRaw(w, 'brickworks', 26, 11);                                   // 11 away
    addRaw(w, 'brickworks', 30, 11);                                              // 15 away: out of its reach
    const st = addRaw(w, 'storehouse', 8, 8, { store: { bricks: 5 } });           // 6 away, bricks only
    const far = addRaw(w, 'storehouse', 30, 7, { store: { stone: 5 } });          // no road beside it
    const m = siteStatus(w, s).materials;
    expect([m.stone.makers, m.stone.stores, m.bricks.makers, m.bricks.stores]).toEqual([[q.id], [], [bw.id], [st.id]]);
    st.store.stone = 3;
    expect(siteStatus(w, s).materials.stone.stores).toEqual([st.id]);
    expect(far.store.stone).toBe(5);
    const lone = addRaw(w, 'obelisk_small', 20, 3);
    expect(siteStatus(w, lone).materials).toEqual({ stone: { onSite: 0, need: 60, makers: [], stores: [] } });
  });
});

describe('s4 sim placing a supply building', () => {
  it('counts a site that still needs its stone as somewhere for a quarry to send it, as the sim delivers', () => {
    const w = city();
    for (const [x, y] of [[20, 11], [21, 11], [20, 12], [21, 12]]) w.terrain[idx(w.size, x, y)] = TERRAIN_BY_NAME.rocky;
    expect(canPlace(w, 'quarry', 20, 11).warnings).toEqual(['no_storage']);       // nothing in reach takes stone
    const s = addRaw(w, 'obelisk_small', 24, 9);
    expect(canPlace(w, 'quarry', 20, 11).warnings).toEqual([]);
    Object.assign(s.site, { course: 3, done: 9 });                                // a finished one needs nothing
    expect(canPlace(w, 'quarry', 20, 11).warnings).toEqual(['no_storage']);
    addRaw(w, 'colossus', 14, 8);                                                 // needs stone, 6 road tiles away
    expect(canPlace(w, 'brickworks', 20, 11).warnings).toEqual(['no_storage']);   // but no bricks
    expect(canPlace(w, 'quarry', 20, 11).warnings).toEqual([]);
  });
});

describe('s4 sim the refusals\' words', () => {
  it('words every refusal the monument and palace commands return, from the commands themselves', () => {
    const w = city();
    const fields = place(w, 'obelisk_small', 4, 9);                               // fertile land
    expect([fields.reason, reasonText(fields.reason)]).toEqual(['not_on_fields', 'Monuments stand on the desert, not the fields']);
    expect(place(w, 'obelisk_small', 12, 9).ok).toBe(true);                       // on the desert it is founded
    expect(place(w, 'palace', 20, 7).ok).toBe(true);
    const second = place(w, 'palace', 24, 7);
    expect([second.reason, reasonText(second.reason)]).toEqual(['one_only', 'The city has its palace: there is only one']);
    const pal = Object.values(w.buildings).find((b) => b.type === 'palace');
    const done = addRaw(w, 'obelisk_small', 28, 9);
    Object.assign(done.site, { course: 3, done: 5 });
    const pause = setPaused(w, done.id, true);
    expect([pause.reason, reasonText(pause.reason)]).toEqual(['finished', 'A finished monument has nothing to pause']);
    expect(setPaused(w, addRaw(w, 'obelisk_small', 26, 9).id, true).ok).toBe(true);   // a site under way pauses
    expect(reasonText(palaceQuote(w, done.id).reason)).toBe('That is not the palace');
    expect(enlargePalace(w, pal.id).ok).toBe(true);
    expect(reasonText(palaceQuote(w, pal.id).reason)).toBe('The palace is already being enlarged');
    pal.works = null; pal.style = 4;
    expect(reasonText(palaceQuote(w, pal.id).reason)).toBe('The palace is as grand as it gets');
    const lone = addRaw(w, 'palace', 20, 2);
    expect(reasonText(palaceQuote(w, lone.id).reason)).toBe('Must touch a road');
  });

  it('names the site in Undo\'s refusal once work has begun, and undoes one with no work', () => {
    const w = city();
    const s = w.buildings[place(w, 'colossus', 20, 8).id];
    guild(w, 16);
    s.site.stock.stone = 10;
    run(w, 1);                                                                    // a block is laid
    const r = undo(w);
    expect([r.reason, SIM4_TEXT.workBegun(r.type), reasonText(r.reason)]).toEqual(['work_begun', 'Work has begun on the colossus: demolish it instead', 'Work has begun on it: demolish it instead']);
    const t = w.buildings[place(w, 'obelisk_small', 26, 9).id];
    t.site.stock.stone = 10;                                                      // stone delivered, but no work: it can go
    expect([undo(w).ok, Boolean(w.buildings[t.id])]).toEqual([true, false]);
  });
});
