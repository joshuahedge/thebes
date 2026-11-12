// Version 10.0, Track L (L.3, spec 5b, rulings 2206-2209): the bazaar's crowd follows its state and the hour; L.8 (spec 5g, ruling 2241): on a festival
// day it goes to line the procession's road.
import { describe, it, expect } from '../../harness.js';
import { crowdAt, busyAt, festivalLineAt, workingTemples, TEMPLES_FRESH_MS, CROWD } from '../../../src/render/v100/crowd.js';
import { LIFE } from '../../../src/data/ambient.js';
import { LIFE_IDS } from '../../../src/render/v100/life.js';
import { allBuildings, insertBuilding, removeBuilding } from '../../../src/sim/world.js';
import { lifeContract, bazaarCity, DAY, NOON, NIGHT } from './helpers.js';

const fn = (day) => (w, t, n, r, m) => crowdAt(w, t, n, r, m, { day });
const make = () => { const { w, range } = bazaarCity(8); return { world: w, range, timeDays: 40.3, nowMs: 50000 }; };
const mine = (b) => (e) => e.id >= LIFE_IDS.crowd + (b.id % 11000) * 16 && e.id < LIFE_IDS.crowd + (b.id % 11000) * 16 + 16;
const shown = (list) => list.filter((e) => e.alpha > 0.02);

describe('v100 l crowd: the contract', () => {
  lifeContract(fn(DAY), make, LIFE.crowdCap * CROWD.bazaars);
});

describe('v100 l crowd: the bazaar draws a crowd by its state and the hour', () => {
  it('draws 3 + 5 x busy(hour) standing about a staffed bazaar with food: busy in the morning, thin at noon, gone at night', () => {
    const { w, b, range } = bazaarCity(8);
    for (const o of allBuildings(w)) if (o.type === 'plaza' || o.type === 'garden') { o.x = -50; o.y = -50; }   // no seats, for the count
    const count = (day) => shown(fn(day)(w, 40.3, 0, range, 'full').filter(mine(b))).length;
    expect([busyAt(DAY), busyAt(NIGHT)]).toEqual([1, 0]);
    expect(Math.abs(busyAt({ phase: 'day', u: 0.52 * 0.5, dark: 0 }) - 0.3) < 1e-9).toBe(true);
    expect(count(DAY)).toBe(8);
    expect(count({ phase: 'day', u: 0.52 * 0.5, dark: 0 })).toBe(3 + Math.floor(5 * 0.3));
    expect(count(NIGHT)).toBe(0);
  });
  it('shows one figure at a bazaar short of food, none at one not working, and two sitting at a plaza near it', () => {
    const { w, b, range } = bazaarCity(8);
    for (const g of Object.keys(b.store)) b.store[g] = 0;
    expect(shown(fn(DAY)(w, 40, 0, range, 'full').filter(mine(b))).length).toBe(1);
    b.staff = 0;
    expect(fn(DAY)(w, 40, 0, range, 'full').filter(mine(b)).length).toBe(0);
    const c = bazaarCity(8);
    const seat = allBuildings(c.w).find((o) => o.type === 'plaza' || o.type === 'garden');
    seat.x = c.b.x + c.b.w; seat.y = c.b.y;
    const list = fn(DAY)(c.w, 40, 0, c.range, 'full').filter(mine(c.b));
    expect(list.filter((e) => e.kind === 'citizen_sit').length).toBe(2);
    expect(list.length <= LIFE.crowdCap).toBe(true);
  });
  it('moves each figure on to another stall every 6 to 10 game days, holding while paused', () => {
    const { w, b, range } = bazaarCity(8);
    const at = (t) => fn(DAY)(w, t, 0, range, 'full').filter(mine(b)).map((e) => `${e.x.toFixed(3)},${e.y.toFixed(3)}`);
    expect(at(40.3)).toEqual(at(40.3));
    const a = at(40.3), c = at(52.3);
    expect(a.some((s, i) => s !== c[i])).toBe(true);
  });
});

describe('v100 l crowd: the festival line keeps the contract', () => {
  const makeFest = () => { const { w, range } = bazaarCity(14); w.danger.festivalDay = w.day; return { world: w, range, timeDays: w.day, nowMs: 0 }; };
  lifeContract(festivalLineAt, makeFest, LIFE.lineCap);
});

describe('v100 l crowd: the working temples are kept, not found again every frame', () => {
  it('gives the same list for the same world and a later frame, a new one when a building is added or after TEMPLES_FRESH_MS', () => {
    const { w } = bazaarCity(8);
    const a = workingTemples(w, 1000);
    expect(workingTemples(w, 1016)).toBe(a);
    expect(workingTemples(w, 1000 + TEMPLES_FRESH_MS - 1)).toBe(a);
    expect(workingTemples(w, 1000 + TEMPLES_FRESH_MS + 1) === a).toBe(false);
    const b = workingTemples(w, 5000);
    w.nextId += 1;
    expect(workingTemples(w, 5016) === b).toBe(false);
    expect(a.every((t) => t.type === 'temple')).toBe(true);
  });
  it('a plaza within reach of a bazaar seats two, one beyond it none (the seat is found by range, not by scanning every building)', () => {
    const { w, b, range } = bazaarCity(12);
    const seats = () => crowdAt(w, 40.3, 50000, range, 'full', { day: DAY }).filter((e) => e.kind === 'citizen_sit').length;
    for (const o of allBuildings(w)) if (o.type === 'plaza' || o.type === 'garden') removeBuilding(w, o.id);
    expect(seats()).toBe(0);
    const cx = Math.round(b.x + b.w / 2), cy = Math.round(b.y + b.d / 2);
    const near = insertBuilding(w, { id: w.nextId++, type: 'plaza', x: cx, y: cy - 2, w: 1, d: 1 });
    expect(seats()).toBe(2);
    removeBuilding(w, near.id);
    insertBuilding(w, { ...near, x: cx + 11 });
    expect(seats()).toBe(0);
  });
});

describe('v100 l crowd: a festival\'s onlookers', () => {
  it('lines the procession\'s road on a festival day, standing, facing it, at most LIFE.lineCap, and the bazaar\'s crowd joins them', () => {
    const { w, range } = bazaarCity(14);
    expect(festivalLineAt(w, w.day, 0, range, 'full')).toEqual([]);
    w.danger.festivalDay = w.day;
    const line = festivalLineAt(w, w.day, 0, range, 'full');
    expect(line.length).toBeGreaterThan(0);
    expect(line.length <= LIFE.lineCap).toBe(true);
    for (const e of line) expect([e.stand, e.id >= LIFE_IDS.crowd + 180000]).toEqual([true, true]);
    expect(fn(DAY)(w, w.day, 0, range, 'full')).toEqual([]);                    // gone to watch
    expect(festivalLineAt(w, w.day, 0, range, 'still')).toEqual([]);
  });
});
