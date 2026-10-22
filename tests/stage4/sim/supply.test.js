import { describe, it, expect } from '../../harness.js';
import { supplyNeeded, deliverySites, materialOf, guildsNear, monumentDay, hasMonumentWork } from '../../../src/sim/monuments.js';
import { produceDay } from '../../../src/sim/production.js';
import { assignLabour } from '../../../src/sim/labour.js';
import { monthlyEconomy, monthlyBill } from '../../../src/sim/economy.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { canPlace } from '../../../src/sim/commands.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { tradeMonth, setTradeOrder } from '../../../src/sim/trade.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A Capital with a road along y = 10 in the 32x32 test world (fertile land is x < 8; addRaw places anywhere).
function city() {
  const w = makeTestWorld({ gold: 100000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'capital';
  return w;
}
const near = (a, b) => Math.abs(a - b) < 1e-6;

describe('s4 sim deliveries', () => {
  it('sends a quarry\'s stone to the nearest site in reach that wants it, then to a storehouse that bridges to a site', () => {
    const w = city();
    const quarry = addRaw(w, 'quarry', 2, 11, { staff: 10 });                     // road (2..3, 10)
    const store = addRaw(w, 'storehouse', 12, 8, { staff: 6 });                   // 10 road tiles from the quarry
    const a = addRaw(w, 'obelisk_small', 8, 9);                                   // 6 from the quarry
    const b = addRaw(w, 'obelisk_small', 10, 9);                                  // 8 from the quarry
    const far = addRaw(w, 'obelisk_small', 26, 9);                                // 24 from the quarry, 14 from the storehouse
    expect([materialOf(quarry), deliverySites(w, quarry).map((s) => s.id)]).toEqual(['stone', [a.id, b.id]]);
    produceDay(w);
    expect([a.site.stock.stone, b.site.stock.stone, store.store.stone || 0, w.tally.stoneDelivered, w.tally.made.stone]).toEqual([1, 0, 0, 1, 1]);
    a.site.stock.stone = 40;                                                      // its pile is full (40 a crew, 1 crew)
    produceDay(w);
    expect([a.site.stock.stone, b.site.stock.stone]).toEqual([40, 1]);
    b.site.stock.stone = 40;
    produceDay(w);                                                                // no site in reach wants it: the storehouse
    expect([store.store.stone, w.tally.stoneDelivered, quarry.blocked]).toEqual([1, 2, null]);
    monumentDay(w);                                                               // the far site draws it within 16
    expect([store.store.stone, far.site.stock.stone, w.tally.stoneDelivered]).toEqual([0, 1, 3]);
    far.paused = true;                                                            // nothing wants stone now: the quarry idles
    produceDay(w);
    expect([supplyNeeded(w, quarry), quarry.blocked, store.store.stone, w.tally.made.stone]).toEqual([false, 'idle', 0, 3]);
    far.paused = false;
    store.accepts.stone = false;                                                  // a storehouse that refuses stone bridges nothing
    expect(supplyNeeded(w, quarry)).toBe(false);
    store.accepts.stone = true;
    expect(supplyNeeded(w, quarry)).toBe(true);
    quarry.paused = true;
    produceDay(w);
    expect(quarry.blocked).toBe('paused');
  });

  it('makes bricks from clay in storage and sends them to a site that wants bricks', () => {
    const w = city();
    const bw = addRaw(w, 'brickworks', 20, 11, { staff: 8 });
    const store = addRaw(w, 'storehouse', 24, 8, { staff: 6, store: { clay: 10 } });
    const obelisk = addRaw(w, 'obelisk_small', 17, 9);                            // stone only: wants no bricks
    expect([supplyNeeded(w, bw), (produceDay(w), bw.blocked), store.store.clay]).toEqual([false, 'idle', 10]);
    const m = addRaw(w, 'mastaba_small', 12, 8);                                  // brick courses; road (12..14, 10): 7 away
    produceDay(w);
    expect([bw.blocked, store.store.clay, m.site.stock.bricks, w.tally.bricksDelivered, obelisk.site.stock.bricks]).toEqual([null, 9, 1, 1, 0]);
    store.store.clay = 0;
    produceDay(w);
    expect([bw.blocked, m.site.stock.bricks]).toEqual(['no_input', 1]);
  });

  it('lets a site draw whole units from storehouses within 16 road tiles, nearest first, up to its room', () => {
    const w = city();
    const s1 = addRaw(w, 'storehouse', 14, 8, { store: { stone: 30 } });          // 5 road tiles from the site
    const s2 = addRaw(w, 'storehouse', 24, 8, { store: { stone: 30 } });          // 6 the other way
    const s3 = addRaw(w, 'storehouse', 2, 8, { store: { stone: 30 } });           // 17: out of reach
    const site = addRaw(w, 'obelisk_small', 19, 9);
    monumentDay(w);
    expect([site.site.stock.stone, s1.store.stone, s2.store.stone, s3.store.stone, w.tally.stoneDelivered]).toEqual([40, 0, 20, 30, 40]);
    Object.assign(site.site, { course: 2, laid: { stone: 15, bricks: 0 }, stock: { stone: 0, bricks: 0 } });
    monumentDay(w);                                                               // its courses need only 5 more
    expect([site.site.stock.stone, s2.store.stone]).toEqual([5, 15]);
    site.site.stock.stone = 0;
    site.paused = true;
    monumentDay(w);
    expect(site.site.stock.stone).toBe(0);                                        // a paused site draws nothing
  });

  it('runs the whole chain in the tick: the quarry and the guild are employed, the stone is delivered and laid', () => {
    const w = city();
    addRaw(w, 'house', 2, 12, { tier: 1, residents: 100 });                       // 40 workers
    const quarry = addRaw(w, 'quarry', 12, 11), g = addRaw(w, 'builders_guild', 16, 11);
    const site = addRaw(w, 'obelisk_small', 20, 9);
    advanceDays(w, 29);
    expect([quarry.staff, g.staff, w.tally.stoneDelivered, site.site.crews]).toEqual([10, 16, 29, [g.id]]);
    expect([near(w.tally.stoneLaid, 29 * 2 / 3), near(site.site.stock.stone, 29 / 3), site.site.course]).toEqual([true, true, 0]);
  });
});

describe('s4 sim idle supply buildings', () => {
  it('employs nobody and pays no wages at a quarry or brickworks no site needs, while its upkeep runs', () => {
    const w = city();
    addRaw(w, 'house', 2, 12, { tier: 1, residents: 200 });                       // 80 workers
    const quarry = addRaw(w, 'quarry', 16, 11), bw = addRaw(w, 'brickworks', 20, 11);
    assignLabour(w);
    monthlyEconomy(w);
    const upkeep = monthlyBill('quarry', w).upkeep + monthlyBill('brickworks', w).upkeep;   // 6 and 6 at the data's own; Version 6.0 (Track A): the rank's upkeep
    expect([quarry.staff, bw.staff, w.labour.jobs, w.stats.lastMonth.wages, w.stats.lastMonth.upkeep]).toEqual([0, 0, 0, 0, upkeep]);
    expect([hasMonumentWork(w, quarry), hasMonumentWork(w, bw)]).toEqual([false, false]);
    addRaw(w, 'obelisk_small', 24, 9);                                            // wants stone, 8 road tiles from the quarry
    assignLabour(w);
    monthlyEconomy(w);
    expect([quarry.staff, bw.staff, w.labour.jobs, w.stats.lastMonth.wages, w.stats.lastMonth.upkeep]).toEqual([10, 0, 10, monthlyBill('quarry', w).wages, upkeep]);
  });
});

describe('s4 sim stone from Memphis and guilds near', () => {
  it('brings Memphis\'s stone into the trading post\'s storehouses, from which a site draws it', () => {
    const w = city();
    w.milestone = 'city';
    setRoad(w, 31, 10, 31, 31);                                                   // to the trade entry
    const store = addRaw(w, 'storehouse', 16, 8, { staff: 6 });
    addRaw(w, 'trading_post', 20, 8, { staff: 6 });
    w.trade.routes.memphis = { since: 0, gifted: true };
    w.day = 90;
    setTradeOrder(w, 'stone', 'buy', 40);
    tradeMonth(w);
    expect(store.store.stone).toBe(40);
    const site = addRaw(w, 'obelisk_small', 24, 9);                               // 8 road tiles from the storehouse
    monumentDay(w);
    expect([site.site.stock.stone, store.store.stone, w.tally.stoneDelivered]).toEqual([40, 0, 40]);
  });

  it('counts only guilds with room for a crew as near: unpaused and not already at work on a site', () => {
    const w = city();
    const g = addRaw(w, 'builders_guild', 16, 11);
    const probe = { x: 22, y: 9, w: 1, d: 1 };
    expect(guildsNear(w, probe)).toEqual([g.id]);
    addRaw(w, 'obelisk_small', 20, 9);                                            // g's crew goes there
    expect(guildsNear(w, probe)).toEqual([]);
    expect(canPlace(w, 'obelisk_small', 22, 9).warnings).toContain('no_crew');
    const g2 = addRaw(w, 'builders_guild', 12, 11);                               // the obelisk is full: g2 is free
    expect(guildsNear(w, probe)).toEqual([g2.id]);
    g2.paused = true;
    expect(guildsNear(w, probe)).toEqual([]);
  });
});

describe('s4 sim idle supply buildings and the understaffed alert', () => {
  it('raises no understaffed warning for an idle quarry or brickworks, and does for one a site needs (ruling 2)', () => {
    const w = city();
    addRaw(w, 'house', 2, 12, { tier: 1, residents: 200 });
    const quarry = addRaw(w, 'quarry', 16, 11), bw = addRaw(w, 'brickworks', 20, 11);
    const short = (b) => alertsFor(w).some((a) => a.code === 'understaffed' && a.id === b.id);
    assignLabour(w);
    expect([short(quarry), short(bw)]).toEqual([false, false]);                   // no site: idle by design
    addRaw(w, 'obelisk_small', 24, 9);                                            // wants stone only
    w.labour.workers = 0;
    quarry.staff = 0;
    expect([hasMonumentWork(w, quarry), short(quarry), short(bw)]).toEqual([true, true, false]);
  });
});
