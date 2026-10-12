import { describe, it, expect } from '../harness.js';
import { monthlyEconomy } from '../../src/sim/economy.js';
import { computeAlerts } from '../../src/sim/alerts.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

function street(gold = 1000) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('economy', () => {
  it('collects taxes and pays wages and upkeep', () => {
    const w = street();
    addRaw(w, 'house', 2, 11, { tier: 2, residents: 8 });
    addRaw(w, 'house', 3, 11, { tier: 4, residents: 16 });
    addRaw(w, 'temple', 12, 8, { staff: 6 });
    addRaw(w, 'well', 20, 9);
    monthlyEconomy(w);
    expect(w.stats.lastMonth).toEqual({ taxes: 40, wages: 24, upkeep: 13, soldiers: 0, net: 3 });   // no soldiers: no pay (spec 4.11)
    expect(w.gold).toBe(1003);
  });
  it('charges nothing for paused buildings', () => {
    const w = street();
    addRaw(w, 'temple', 12, 8, { paused: true, staff: 0 });
    monthlyEconomy(w);
    expect(w.stats.lastMonth.upkeep).toBe(0);
  });
  it('charges no upkeep or wages for a building no road touches, until one does (ruling P11)', () => {
    const w = street();
    addRaw(w, 'well', 20, 21);
    addRaw(w, 'temple', 12, 20, { staff: 6 });                   // staff left over from before its road went
    addRaw(w, 'garden', 25, 25);                                 // needs no road, costs nothing either way
    monthlyEconomy(w);
    expect(w.stats.lastMonth).toEqual({ taxes: 0, wages: 0, upkeep: 0, soldiers: 0, net: 0 });
    expect(w.gold).toBe(1000);
    setRoad(w, 10, 22, 21, 22);                                  // now both touch a road
    monthlyEconomy(w);
    expect(w.stats.lastMonth).toEqual({ taxes: 0, wages: 24, upkeep: 13, soldiers: 0, net: -37 });
  });
});

describe('alerts', () => {
  it('flags stuck, empty and understaffed buildings', () => {
    const w = street();
    const farm = addRaw(w, 'farm_grain', 2, 8, { staff: 10, blocked: 'no_storage' });
    const temple = addRaw(w, 'temple', 12, 8, { staff: 0 });
    const bz = addRaw(w, 'bazaar', 16, 8, { staff: 6 });
    const lonely = addRaw(w, 'well', 20, 20);
    addRaw(w, 'house', 25, 25, { tier: 1, residents: 3 });
    w.labour = { workforce: 10, employed: 10, jobs: 22, shortLevels: ['services'] };
    const codes = computeAlerts(w).map((a) => a.code + (a.id ? ':' + a.id : '') + (a.level ? ':' + a.level : ''));
    expect(codes).toContain('no_storage:' + farm.id);
    expect(codes).toContain('understaffed:' + temple.id);
    expect(codes).toContain('bazaar_empty:' + bz.id);
    expect(codes).toContain('no_road:' + lonely.id);
    expect(codes).toContain('labour_shortage:services');
    expect(codes.some((c) => c.startsWith('no_road:') && c !== 'no_road:' + lonely.id)).toBe(false);
  });
  it('flags debt, and unemployment only from Town', () => {
    const w = street(-10);
    w.labour = { workforce: 100, employed: 10, jobs: 10, shortLevels: [] };
    expect(computeAlerts(w).map((a) => a.code)).toEqual(['debt']);
    w.milestone = 'town';
    expect(computeAlerts(w).map((a) => a.code)).toEqual(['unemployment', 'debt']);
  });
});
