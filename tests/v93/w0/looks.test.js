import { describe, it, expect } from '../../harness.js';
import { LOOKS, lookOfRank, lookCentre, lookAt, lookOfBuilding, REBUILD_DAYS } from '../../../src/render/looks.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeBuilding, insertBuilding } from '../../../src/sim/world.js';

const put = (w, type, x, y) => { const b = makeBuilding(w, type, x, y); insertBuilding(w, b); return b; };

describe('v93 w0 looks: a look for each rank, and a rebuild from the centre', () => {
  it('folds the eight ranks into four looks', () => {
    expect(LOOKS).toEqual(['village', 'town', 'city', 'capital']);
    expect(['village', 'town', 'market_town', 'city', 'great_city', 'capital', 'great_capital', 'seat'].map(lookOfRank)).toEqual([0, 1, 1, 2, 2, 3, 3, 3]);
  });
  it('centres on the palace when one stands, else on the built-up area', () => {
    const w = makeTestWorld();
    put(w, 'house', 10, 10); put(w, 'house', 20, 10);
    expect([lookCentre(w).cx, lookCentre(w).cy]).toEqual([15.5, 10.5]);
    const p = put(w, 'palace', 30, 30);
    const c = lookCentre(w);
    expect([c.cx, c.cy]).toEqual([p.x + p.w / 2, p.y + p.d / 2]);
  });
  it('a Village is all Village; a fresh Town is Town at the centre and Village at the edge', () => {
    const w = makeTestWorld();
    put(w, 'house', 10, 10); put(w, 'house', 20, 10); const far = put(w, 'house', 30, 10);   // centre (20.5, 10.5), dMax 10
    expect(lookAt(w, 20.5, 10.5)).toBe(0);
    w.milestone = 'town'; w.splits.town = w.day;
    expect(lookAt(w, 20.5, 10.5)).toBe(1);                  // the centre takes the look on the day
    expect(lookOfBuilding(w, far)).toBe(0);                 // the edge waits
    w.day += REBUILD_DAYS;
    expect(lookOfBuilding(w, far)).toBe(1);                 // 4 months on, the edge has it
  });
  it('a rank with no recorded day counts as fully rebuilt (a city from before Stage 3)', () => {
    const w = makeTestWorld();
    const far = put(w, 'house', 29, 29); put(w, 'house', 5, 5);
    w.milestone = 'city'; delete w.splits.town; delete w.splits.city;
    expect(lookOfBuilding(w, far)).toBe(2);
  });
  it('a building placed after the rank-up starts in the current look', () => {
    const w = makeTestWorld();
    put(w, 'house', 5, 5); put(w, 'house', 6, 5);
    w.milestone = 'town'; w.splits.town = w.day;
    w.day += 1;
    const late = put(w, 'house', 29, 29);
    expect(lookOfBuilding(w, late)).toBe(1);
  });
  it('a paused city does not move: the look depends on the day alone', () => {
    const w = makeTestWorld();
    put(w, 'house', 5, 5); const far = put(w, 'house', 28, 28);
    w.milestone = 'town'; w.splits.town = w.day;
    const a = lookOfBuilding(w, far), b = lookOfBuilding(w, far);
    expect(a).toBe(b);
  });
});
