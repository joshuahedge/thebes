// Version 6.0 Track B1 (rulings 684-686): the plague. Warned two months ahead in the worst-placed home, it spreads day by day to the homes near a
// sick one (a physician, a well and room slow it), takes people until the homes mend, and stops the work near the sick homes no physician
// reaches; a quarantine holds a district for a fee. None of it in the first three game years or on Peaceful.
import { describe, it, expect } from '../../harness.js';
import { plagueMonth, plagueDay, startPlague, pickOrigin, catchChance, plagueContext, sickHomes, plagueHalted, haltReason, quarantineQuote, quarantineDistrict, quarantines, districtKey, homesNear } from '../../../src/sim/plague.js';
import { hazardMonth, hazardDay, hazardAlerts } from '../../../src/sim/hazards.js';
import { produceDay } from '../../../src/sim/production.js';
import { healthDay, isPlagueHome, healthAlerts } from '../../../src/sim/health.js';
import { PLAGUE, GRACE_DAYS } from '../../../src/data/hazards.js';
import { HEALTH } from '../../../src/data/health.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

const OPEN = GRACE_DAYS + 30;

// A Town with a road along y = 13 and `n` homes along y = 14 from x = 2 (each of `residents` people), the grace over.
function town({ n = 20, residents = 12, day = OPEN, difficulty = 'normal' } = {}) {
  const w = makeTestWorld();
  w.difficulty = difficulty;
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'town';
  w.day = day;
  const homes = [];
  for (let k = 0; k < n; k++) homes.push(addRaw(w, 'house', 2 + k, 14, { tier: 3, residents }));
  return { w, homes };
}
const same = (a, b) => expect(a.toFixed(6)).toBe(b.toFixed(6));
const run = (w, days, events = []) => { for (let k = 0; k < days; k++) { plagueDay(w, events); w.day += 1; } return events; };

describe('v60 b1 plague the draw and the warning', () => {
  it('draws nothing in the grace; after it the first month fixes the draw day and the next due month warns the worst-placed home', () => {
    const { w, homes } = town({ day: GRACE_DAYS - 30 });
    plagueMonth(w, []);
    expect([w.hazards.plague.nextDay, w.hazards.plague.warning]).toEqual([null, null]);
    w.day = GRACE_DAYS;
    plagueMonth(w, []);
    const due = w.hazards.plague.nextDay;
    expect(due).toBeGreaterThan(GRACE_DAYS);
    expect(due).toBeLessThanOrEqual(GRACE_DAYS + PLAGUE.first[1]);
    expect(w.hazards.plague.warning).toBe(null);
    w.day = due - 1;
    plagueMonth(w, []);
    expect(w.hazards.plague.warning).toBe(null);
    w.day = due;
    const events = [];
    plagueMonth(w, events);
    const warn = w.hazards.plague.warning;
    expect([warn.day, warn.strikes, warn.origin]).toEqual([due, due + PLAGUE.warnDays, pickOrigin(w).id]);
    expect(homes.some((h) => h.id === warn.origin)).toBe(true);
    expect(events).toEqual([{ type: 'plague_warning', id: warn.origin, strikes: due + PLAGUE.warnDays }]);
    expect(hazardAlerts(w)).toEqual([{ code: 'plague_warning', id: warn.origin, arrives: due + PLAGUE.warnDays }]);
  });

  it('waits a month when fewer than PLAGUE.minHomes homes have people, on Peaceful, and while another danger is warned', () => {
    const small = town({ n: PLAGUE.minHomes - 1 });
    small.w.hazards.plague.nextDay = small.w.day;
    plagueMonth(small.w, []);
    expect([small.w.hazards.plague.warning, small.w.hazards.plague.nextDay]).toEqual([null, small.w.day + 30]);
    const calm = town({ difficulty: 'peaceful' });
    calm.w.hazards.plague.nextDay = calm.w.day;
    plagueMonth(calm.w, []);
    expect([calm.w.hazards.plague.warning, calm.w.hazards.plague.nextDay]).toEqual([null, calm.w.day]);
    const busy = town();
    busy.w.hazards.plague.nextDay = busy.w.day;
    busy.w.hazards.locusts.warning = { day: busy.w.day, strikes: busy.w.day + 30, kind: 'locusts', farms: [] };
    plagueMonth(busy.w, []);
    expect([busy.w.hazards.plague.warning, busy.w.hazards.plague.nextDay]).toEqual([null, busy.w.day + 30]);
  });

  it('picks the crowded home no physician and no well reaches over homes that are served', () => {
    const { w, homes } = town({ n: 10, residents: 10 });
    const last = homes[homes.length - 1];
    last.residents = 25;                                      // crowded: more than HEALTH.crowdedPerTile on its one tile
    const well = addRaw(w, 'well', 3, 12);
    const doc = addRaw(w, 'physician', 5, 12);
    staffAll(w);
    w.roadVersion++;
    expect(pickOrigin(w).id).toBe(last.id);
    // the same crowding next to the physician and well is no longer the worst
    const near = homes[1];
    near.residents = 25;
    last.residents = 10;
    const pick = pickOrigin(w);
    expect([pick.id, doc.id > 0, well.id > 0]).toEqual([pick.id, true, true]);
    expect(typeof pick.id).toBe('number');
  });

  it('begins in the warned home when the day comes (another when it is gone), and not before', () => {
    const { w, homes } = town();
    w.hazards.plague.warning = { day: w.day, strikes: w.day + 60, origin: homes[4].id };
    const events = [];
    run(w, 60, events);                                       // days 0 to 59 of the warning
    expect([w.hazards.plague.active, sickHomes(w).length]).toEqual([null, 0]);
    run(w, 1, events);                                        // its 60th day: it strikes
    const a = w.hazards.plague.active;
    expect([a.origin, a.homes, w.hazards.plague.warning, isPlagueHome(homes[4]), w.tally.plagues, w.tally.plagueHomes]).toEqual([homes[4].id, [homes[4].id], null, true, 1, 1]);
    expect(events.filter((e) => e.type === 'plague_start')).toEqual([{ type: 'plague_start', id: homes[4].id }]);
    const gone = town();
    gone.w.hazards.plague.warning = { day: gone.w.day, strikes: gone.w.day, origin: 987654 };
    plagueDay(gone.w, []);
    expect(gone.w.hazards.plague.active.origin).toBe(pickOrigin(town().w).id);
  });
});

describe('v60 b1 plague the spread', () => {
  it('cuts the chance by a physician, a well and room, and to nothing across a quarantined district\'s edge', () => {
    const { w, homes } = town({ n: 4, residents: 25 });
    const [from, to] = homes;
    to.residents = 25;
    const base = PLAGUE.spread;
    const ctx = plagueContext(w);
    ctx.cover = new Map(ctx.cover);                                                     // the coverage map is the sim's cached one: change a copy
    same(catchChance(w, from, to, ctx), base);
    to.residents = 10;                                                                  // room: not crowded
    same(catchChance(w, from, to, plagueContext(w)), base * PLAGUE.roomFactor);
    to.residents = 25;
    ctx.watered.add(to.id);
    same(catchChance(w, from, to, ctx), base * PLAGUE.wellFactor);
    ctx.cover.set(to.id, 1);
    same(catchChance(w, from, to, ctx), base * PLAGUE.wellFactor * (1 - PLAGUE.coverCut));
    const q = { key: districtKey(from), from: 0, until: w.day + 60, fee: 0, homes: 0 };
    w.hazards.plague.active = { day: w.day, origin: from.id, homes: [], lost: 0, quarantines: [q] };
    const held = plagueContext(w);
    same(catchChance(w, from, to, held), base * PLAGUE.quarantine.insideFactor);
    const far = addRaw(w, 'house', 14, 14, { tier: 3, residents: 25 });
    expect(catchChance(w, from, far, held)).toBe(0);
    expect(catchChance(w, far, from, held)).toBe(0);
  });

  it('passes day by day to the homes near a sick one, reaching across a road, and says so', () => {
    const { w, homes } = town({ n: 12, residents: 25 });
    expect(homesNear(w, homes[3]).map((h) => h.id)).toEqual([homes[1], homes[2], homes[4], homes[5]].map((h) => h.id));
    startPlague(w, homes[0].id, []);
    const events = run(w, 40);
    const spreads = events.filter((e) => e.type === 'plague_spread');
    expect(spreads.length).toBeGreaterThan(1);
    for (const e of spreads) expect(['spread']).toContain(e.cause);
    expect(w.tally.plagueHomes).toBe(1 + spreads.length);
    expect(w.hazards.plague.active.homes.length).toBe(1 + spreads.length);
    // only homes within two tiles of a sick one catch it: the third home along catches it only after the second
    const order = spreads.map((e) => w.buildings[e.id].x);
    expect(Math.min(...order)).toBeLessThanOrEqual(homes[0].x + PLAGUE.reach + 1);
  });

  it('keeps a quarantined district\'s plague inside it for the months it holds', () => {
    const { w, homes } = town({ n: 20, residents: 25 });
    startPlague(w, homes[0].id, []);
    const r = quarantineDistrict(w, homes[0].id);
    expect(r.ok).toBe(true);
    run(w, 55);
    const reached = homes.filter((h) => h.x >= 12 && w.hazards.plague.active.homes.includes(h.id));
    expect(reached).toEqual([]);                                                       // districts are 12 tiles wide: x 12 on is the next one
    const open = town({ n: 20, residents: 25 });
    startPlague(open.w, open.homes[0].id, []);
    run(open.w, 400);
    expect(open.w.tally.plagueHomes).toBeGreaterThan(w.tally.plagueHomes);
  });
});

describe('v60 b1 plague the sick', () => {
  it('takes one person a day up to a share of the home, mends in its days, and ends with a report and the next draw', () => {
    const { w, homes } = town({ n: 3, residents: 20 });
    const h = homes[0];
    startPlague(w, h.id, []);
    const rec = { ...h.illness };
    expect([rec.plague, rec.cap, rec.lost]).toEqual([true, Math.floor(20 * PLAGUE.lossShare), 0]);
    expect(rec.days).toBeGreaterThanOrEqual(PLAGUE.days[0]);
    expect(rec.days).toBeLessThanOrEqual(PLAGUE.days[1]);
    const events = [];
    run(w, rec.cap, events);
    expect([h.residents, h.illness.lost]).toEqual([20 - rec.cap, rec.cap]);
    run(w, rec.days, events);
    expect([h.illness, w.hazards.plague.active]).toEqual([null, null]);
    const last = w.hazards.plague.last;
    expect([last.origin, last.homes >= 1, last.lost >= rec.cap, last.quarantines]).toEqual([h.id, true, true, 0]);
    expect(w.hazards.plague.nextDay).toBeGreaterThan(w.day);
    expect(events.some((e) => e.type === 'plague_end')).toBe(true);
  });

  it('is cured by a remedy that clears the homes: the plague ends with nothing left to follow', () => {
    const { w, homes } = town({ n: 3 });
    startPlague(w, homes[0].id, []);
    homes[0].illness = null;                                                           // the court's cure
    plagueDay(w, []);
    expect([w.hazards.plague.active, w.hazards.plague.last.homes]).toEqual([null, 1]);
  });

  it('mends twice as fast under a staffed physician, and Relaxed takes fewer people', () => {
    const { w, homes } = town({ n: 3, residents: 20 });
    addRaw(w, 'physician', 2, 12);
    staffAll(w);
    w.roadVersion++;
    startPlague(w, homes[0].id, []);
    const days = homes[0].illness.days;
    run(w, Math.ceil(days / PLAGUE.coverFactor));
    expect(homes[0].illness).toBe(null);
    const relaxed = town({ n: 3, residents: 20, difficulty: 'relaxed' });
    startPlague(relaxed.w, relaxed.homes[0].id, []);
    expect(relaxed.homes[0].illness.cap).toBeLessThan(Math.floor(20 * PLAGUE.lossShare));
  });

  it('is the plague\'s own: the ordinary illness step leaves a plague home alone and its alerts skip it', () => {
    const { w, homes } = town({ n: 3, residents: 20 });
    startPlague(w, homes[0].id, []);
    const rec = JSON.stringify(homes[0].illness);
    for (let k = 0; k < 20; k++) { healthDay(w, []); w.day += 1; }
    expect(JSON.stringify(homes[0].illness)).toBe(rec);
    expect(healthAlerts(w)).toEqual([]);
    expect(hazardAlerts(w).map((a) => [a.code, a.count])).toEqual([['plague', 1]]);
  });
});

describe('v60 b1 plague work stops', () => {
  it('stops a workplace near a sick home no physician reaches, and not one a physician covers', () => {
    const { w, homes } = town({ n: 4, residents: 20 });
    const farm = addRaw(w, 'farm_grain', 3, 16, { staff: BUILDINGS.farm_grain.workers });
    const far = addRaw(w, 'farm_fig', 25, 24, { staff: BUILDINGS.farm_fig.workers });
    startPlague(w, homes[0].id, []);
    const halted = plagueHalted(w);
    expect([halted.has(farm.id), halted.has(far.id)]).toEqual([true, false]);
    expect(haltReason(w, farm)).toBe('plague');
    produceDay(w);
    expect(farm.blocked).toBe('plague');
    expect(far.blocked === 'plague').toBe(false);
    addRaw(w, 'physician', 2, 12);
    staffAll(w);
    w.roadVersion++;
    expect(plagueHalted(w).has(farm.id)).toBe(false);
    produceDay(w);
    expect(farm.blocked === 'plague').toBe(false);
    expect(plagueHalted(town().w)).toBe(null);                                         // no plague, no halting (and no cost)
  });

  it('stops every workplace in a quarantined district for as long as it holds, and lets them go after', () => {
    const { w, homes } = town({ n: 4, residents: 20 });
    addRaw(w, 'physician', 2, 12);
    staffAll(w);
    w.roadVersion++;
    const farm = addRaw(w, 'farm_grain', 3, 16, { staff: BUILDINGS.farm_grain.workers });
    const outside = addRaw(w, 'farm_fig', 25, 24, { staff: BUILDINGS.farm_fig.workers });
    startPlague(w, homes[0].id, []);
    expect(plagueHalted(w).has(farm.id)).toBe(false);                                  // covered
    expect(quarantineDistrict(w, homes[0].id).ok).toBe(true);
    const halted = plagueHalted(w);
    expect([halted.has(farm.id), halted.has(outside.id), haltReason(w, farm)]).toEqual([true, false, 'quarantine']);
    w.day += PLAGUE.quarantine.months * 30;
    expect(quarantines(w).size).toBe(0);
    expect(plagueHalted(w).has(farm.id)).toBe(false);
  });
});

describe('v60 b1 plague quarantine', () => {
  it('quotes the fee (a price for each home with people, at least the minimum), the months and the workplaces it stops, and pays it', () => {
    const { w, homes } = town({ n: 8, residents: 12 });
    addRaw(w, 'farm_grain', 3, 16, { staff: 3 });
    expect(quarantineQuote(w, homes[0]).reason).toBe('no_plague');
    startPlague(w, homes[0].id, []);
    const q = quarantineQuote(w, homes[0]);
    expect([q.ok, q.homes, q.sick, q.workplaces, q.months, q.fee]).toEqual([true, 8, 1, 1, PLAGUE.quarantine.months, Math.max(PLAGUE.quarantine.feeMin, 8 * PLAGUE.quarantine.feePerHome)]);
    expect(q.until).toBe(w.day + PLAGUE.quarantine.months * 30);
    const gold = w.gold;
    const r = quarantineDistrict(w, homes[3].id);                                       // any home of the district names it
    expect([r.ok, w.gold, w.tally.quarantines, [...quarantines(w).keys()]]).toEqual([true, gold - q.fee, 1, [districtKey(homes[0])]]);
    expect(quarantineQuote(w, homes[0]).reason).toBe('already');
    expect(quarantineDistrict(w, homes[0].id).reason).toBe('already');
    expect(w.gold).toBe(gold - q.fee);
  });

  it('refuses where no home is sick or the fee would pass the debt floor, and costs more on Hard\'s prices', () => {
    const { w, homes } = town({ n: 20, residents: 12 });
    startPlague(w, homes[0].id, []);
    const other = addRaw(w, 'house', 14, 14, { tier: 3, residents: 12 });                // the next district: nobody sick there
    expect(quarantineQuote(w, other).reason).toBe('none_sick');
    w.gold = -400;
    const poor = quarantineQuote(w, homes[0]);
    expect([poor.ok, poor.reason]).toEqual([false, 'no_gold']);
    expect(quarantineDistrict(w, homes[0].id).reason).toBe('no_gold');
    expect(w.tally.quarantines).toBe(0);
    const fee = (difficulty) => {
      const t = town({ n: 20, residents: 12, difficulty });
      startPlague(t.w, t.homes[0].id, []);
      return quarantineQuote(t.w, t.homes[0]).fee;
    };
    expect(fee('hard')).toBeGreaterThan(fee('normal'));
    expect(fee('relaxed')).toBeLessThan(fee('normal'));
  });
});

describe('v60 b1 plague the hub', () => {
  it('runs its day and month through hazardDay and hazardMonth, as the clock does', () => {
    const { w, homes } = town();
    w.hazards.plague.nextDay = w.day;
    hazardMonth(w, []);
    expect(w.hazards.plague.warning).toBeTruthy();
    w.hazards.plague.warning.strikes = w.day;
    w.hazards.plague.warning.origin = homes[0].id;
    hazardDay(w, []);
    expect(w.hazards.plague.active.origin).toBe(homes[0].id);
    expect(HEALTH.staffedAt).toBeGreaterThan(0);
  });
});
