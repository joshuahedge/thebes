import { describe, it, expect } from '../../harness.js';
import { fireAlerts, fireCause, fireMood, fireDay, burnBuilding, burning } from '../../../src/sim/fire.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { updateMood } from '../../../src/sim/mood.js';
import { runMonth, tickDay } from '../../../src/sim/clock.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { clearRubble } from '../../../src/sim/commands.js';
import { alertText, MOOD_NAMES } from '../../../src/ui/text.js';
import { DANGER_MOOD } from '../../../src/data/mood.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

// A Town with a road along y = 10 in the 32x32 test world.
function street() {
  const w = makeTestWorld({ gold: 1000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = 'town';
  return w;
}
const blaze = () => ({ stage: 'blaze', days: 1, need: 2, fought: 0 });
const fireFor = (left) => ({ stage: 'fire', days: 2, left });
const words = (w, code, b) => alertText({ code, id: b.id }, w);

describe('s3 fire alerts', () => {
  it('raises fire for a blaze or fire no staffed firehouse reaches, blaze for a covered one, and fire_risk from High up', () => {
    const w = street();
    addRaw(w, 'firehouse', 16, 9, { staff: 4 });                                     // reaches road tiles 9 to 23
    addRaw(w, 'firehouse', 28, 9, { staff: 1 });                                     // 25%: working, never staffed enough
    const farBlaze = addRaw(w, 'potter', 0, 11, { fire: blaze() });
    const farFire = addRaw(w, 'granary', 2, 11, { fire: fireFor(9) });
    const high = addRaw(w, 'bazaar', 4, 11, { risk: 60 });
    const rising = addRaw(w, 'booth', 6, 11, { risk: 59.9 });
    const garden = addRaw(w, 'garden', 7, 11, { risk: 300 });                        // never burns, whatever it holds
    const coveredBlaze = addRaw(w, 'potter', 12, 11, { fire: blaze() });
    const coveredFire = addRaw(w, 'granary', 14, 11, { fire: fireFor(4) });
    const coveredRisk = addRaw(w, 'potter', 18, 11, { risk: 150 });
    const thin = addRaw(w, 'booth', 29, 11, { risk: 70 });
    const thinBlaze = addRaw(w, 'booth', 30, 11, { fire: blaze() });
    const expected = [
      { code: 'fire', id: farBlaze.id }, { code: 'fire', id: farFire.id }, { code: 'fire_risk', id: high.id },
      { code: 'blaze', id: coveredBlaze.id }, { code: 'blaze', id: coveredFire.id }, { code: 'fire_risk', id: thin.id }, { code: 'fire', id: thinBlaze.id },
    ];
    expect(fireAlerts(w)).toEqual(expected);
    expect(alertsFor(w).filter((a) => ['fire', 'blaze', 'fire_risk'].includes(a.code))).toEqual(expected);
    expect([rising.fire, garden.fire, coveredRisk.fire]).toEqual([null, null, null]);
  });

  it('says why no staffed firehouse reaches a building: no road, none in reach, short of workers, burning or paused', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 12, 11);
    const loose = addRaw(w, 'house', 20, 20, { tier: 1, residents: 2 });            // no road beside it
    expect([fireCause(w, potter), fireCause(w, loose).cause]).toEqual([{ cause: 'none', cover: 0, firehouse: null }, 'no_road']);
    const fh = addRaw(w, 'firehouse', 16, 9, { staff: 1 });
    expect(fireCause(w, potter)).toEqual({ cause: 'short', cover: 0.25, firehouse: fh.id });
    fh.staff = 0;
    expect(fireCause(w, potter)).toEqual({ cause: 'short', cover: 0, firehouse: fh.id });   // below 25% it works not at all
    fh.paused = true; fh.staff = 4;
    expect(fireCause(w, potter).cause).toBe('paused');
    const other = addRaw(w, 'firehouse', 10, 9, { staff: 4, fire: fireFor(5) });
    expect(fireCause(w, potter)).toEqual({ cause: 'burning', cover: 0, firehouse: other.id });   // burning beats paused
    fh.paused = false;
    expect(fireCause(w, potter)).toEqual({ cause: 'covered', cover: 1, firehouse: fh.id });
  });

  it('words each alert as the sim has it: what is burning, the days it has left, and the reason', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 12, 11, { fire: blaze() });
    const hut = addRaw(w, 'house', 20, 20, { tier: 1, residents: 2, fire: fireFor(1) });
    expect(words(w, 'fire', potter)).toEqual({ title: 'Potter has caught fire', fix: 'No firehouse within 8 road tiles: build one near it' });
    expect(words(w, 'fire', hut)).toEqual({ title: 'Hut is burning: 1 day left', fix: 'No road beside it for a firehouse to reach: lay one' });
    potter.fire = fireFor(9);
    expect(words(w, 'fire', potter).title).toBe('Potter is burning: 9 days left');
    const fh = addRaw(w, 'firehouse', 16, 9, { staff: 1 });
    expect([fireAlerts(w)[0].code, words(w, 'fire', potter).fix]).toEqual(['fire', 'Its firehouse is short of workers: more homes bring more workers']);
    fh.staff = 4; fh.paused = true;
    expect(words(w, 'fire', potter).fix).toBe('Its firehouse is paused: resume it');
    fh.paused = false; fh.fire = fireFor(6);
    expect(words(w, 'fire', potter).fix).toBe('Its firehouse is burning: build another near it');
    fh.fire = null;
    expect([fireAlerts(w).find((a) => a.id === potter.id).code, words(w, 'blaze', potter).fix]).toEqual(['blaze', 'The firehouse is fighting it']);
    potter.fire = blaze();
    expect(words(w, 'blaze', potter)).toEqual({ title: 'Potter has caught fire', fix: 'The firehouse is putting it out' });   // 2 fought days in 2 left
    potter.fire = { stage: 'blaze', days: 2, need: 2, fought: 0 };                  // the firehouse came on its last day
    expect(words(w, 'blaze', potter).fix).toBe('The firehouse came too late: it grows into a fire in 1 day');
    fireDay(w, []);
    expect(potter.fire.stage).toBe('fire');                                          // and so it did
    const bazaar = addRaw(w, 'bazaar', 2, 11, { risk: 60 });
    expect(words(w, 'fire_risk', bazaar)).toEqual({ title: 'Bazaar has a high fire risk', fix: 'No firehouse within 8 road tiles: build one near it' });
    bazaar.risk = 100;
    expect(words(w, 'fire_risk', bazaar).title).toBe('Bazaar could catch fire');
  });
});

describe('s3 fire mood', () => {
  it('costs 4 for a fire in the last 30 days and 2 for each building burned in 180, at most 10, only while they apply', () => {
    const w = street();
    w.day = 600;
    expect(fireMood(w)).toEqual({});
    w.danger.lastFireDay = 570;
    expect(fireMood(w)).toEqual({ fire: DANGER_MOOD.fireLastMonth });
    w.danger.lastFireDay = 569;
    expect(fireMood(w)).toEqual({});
    w.danger.burnDays.push(419, 420, 500, 599);
    expect(fireMood(w)).toEqual({ burned: -6 });                                      // 419 is 181 days ago
    w.danger.burnDays.push(599, 599, 599);
    w.danger.lastFireDay = 599;
    expect(fireMood(w)).toEqual({ fire: -4, burned: -10 });
    updateMood(w);
    expect([w.moodBreakdown.fire, w.moodBreakdown.burned, w.mood]).toEqual([-4, -10, 60 + 20 - 14]);   // no homes: everyone fed
    expect([MOOD_NAMES.fire, MOOD_NAMES.burned]).toEqual(['A fire last month', 'Buildings burned, last 6 months']);
  });

  it('counts a fire, never a blaze put out in time, at the month end', () => {
    const w = street();
    addRaw(w, 'firehouse', 16, 9, { staff: 4 });
    const covered = addRaw(w, 'potter', 18, 11, { fire: { stage: 'blaze', days: 0, need: 1, fought: 0 } });
    w.day = 28;
    fireDay(w, []);
    expect([covered.fire, w.danger.lastFireDay]).toEqual([null, null]);
    w.day = 30;
    runMonth(w, []);
    expect('fire' in w.moodBreakdown).toBe(false);
    const far = addRaw(w, 'potter', 2, 11, { fire: { stage: 'blaze', days: 2, need: 1, fought: 0 } });
    w.day = 55;
    fireDay(w, []);
    expect([far.fire.stage, w.danger.lastFireDay]).toEqual(['fire', 55]);
    w.day = 60;
    runMonth(w, []);
    expect(w.moodBreakdown.fire).toBe(-4);
  });
});

describe('s3 fire spec 9 cases', () => {
  it('clears a burned building\'s rubble at 5 gold a tile times the level\'s cost, through Demolish\'s rules', () => {
    const w = street();
    const potter = addRaw(w, 'potter', 2, 11);
    const tiles = burnBuilding(w, potter.id, []);
    expect(tiles.length).toBe(4);
    const gold = w.gold;
    expect(clearRubble(w, 2, 11, 3, 12)).toEqual({ ok: true, warnings: [], count: 4, cost: 20 });
    expect([w.gold, w.tally.rubbleCleared]).toEqual([gold - 20, 4]);
    w.difficulty = 'hard';
    const granary = addRaw(w, 'granary', 6, 11);
    burnBuilding(w, granary.id, []);
    expect(clearRubble(w, 6, 11, 7, 12).cost).toBe(24);                              // 4 x round(5 x 1.25)
  });

  it('burns the same way twice from one seed, and a city saved and loaded mid-fire carries on identically', () => {
    const city = () => {
      const w = street();
      for (let x = 0; x < 24; x += 2) addRaw(w, 'potter', x, 11, { risk: 95 });
      for (let x = 0; x < 24; x++) addRaw(w, 'house', x, 13, { tier: 1, residents: 3, risk: 90 });
      addRaw(w, 'firehouse', 26, 9, { staff: 4 });
      return w;
    };
    const straight = city(), twin = city(), saved = city();
    let cut = 0;
    while (cut < 300 && !(burning(saved).length && saved.tally.burned > 0)) { tickDay(saved); cut++; }
    expect(burning(saved).length).toBeGreaterThan(0);                                 // saved while something burns
    const loaded = deserialize(serialize(saved));
    for (let d = 0; d < 60; d++) tickDay(loaded);
    for (let d = 0; d < cut + 60; d++) { tickDay(straight); tickDay(twin); }
    expect(serialize(straight)).toBe(serialize(twin));
    expect(serialize(loaded)).toBe(serialize(straight));
    expect([straight.tally.fires > 1, straight.tally.burned > 0]).toEqual([true, true]);
  });
});
