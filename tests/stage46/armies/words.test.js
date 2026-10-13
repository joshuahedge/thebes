// Stage 4.6, the Armies track's words: every sentence from the data or the sim, each checked with the world set up both ways.
import { describe, it, expect } from '../../harness.js';
import { alertText, S46_ARMY_TEXT as A, DANGER_UI_TEXT as D, TIP_TEXT, FIRST_TEXT, T, scoreReasonText } from '../../../src/ui/text.js';
import { counterParts, buildingParts, arrivalText } from '../../../src/ui/dangerSheets.js';
import { armyRowsModel, createArmiesUi } from '../../../src/ui/s46/armies.js';
import { MATCHUPS, ENEMY_TYPES, UNIT_TYPES, ARMY, footMix } from '../../../src/data/armies.js';
import { armyAlerts } from '../../../src/sim/armies.js';
import { trainSoldiers } from '../../../src/sim/combat.js';
import { DEFENCE } from '../../../src/data/raids.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';

const EAST = { x: 31, y: 16 };
function warned(mix) {
  const w = makeTestWorld({ raiderEntries: [EAST] });
  const size = Object.values(mix).reduce((s, n) => s + n, 0);
  w.raid.warning = { index: 6, entry: { ...EAST }, dir: 'east', size, tribute: 200, target: 'building', day: 900, arrives: 1000, first: false, mix };
  return w;
}

describe('s46 armies words: the warning and the raid sheet', () => {
  it('names a mixed raid\'s kinds in the warning, and an all-foot raid as before', () => {
    const mixed = warned({ foot: 8, archer: 4, chariot: 2, boat: 0 });
    const alert = { code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 1000 };
    expect(alertText(alert, mixed).title).toBe('14 raiders from the east are after your buildings');
    expect(alertText(alert, mixed).fix.startsWith('8 on foot, 4 archers, 2 chariots. ')).toBe(true);
    expect(A.mixLine(14, 'the east', mixed.raid.warning.mix)).toBe('14 raiders from the east: 8 on foot, 4 archers, 2 chariots');
    expect(alertText(alert, warned(footMix(6))).title).toBe('Raiders from the east are after your buildings');
    expect(alertText(alert, warned(footMix(6))).fix.includes('on foot')).toBe(false);
    expect(A.mixText({ foot: 1, archer: 1, chariot: 1, boat: 3 })).toBe('1 on foot, 1 archer, 1 chariot, 3 by boat');
  });
  it('lists what helps against each kind on the raid sheet, read from the matchup table and the enemy rows', () => {
    const lines = A.counters({ foot: 8, archer: 4, chariot: 2, boat: 3 });
    expect(lines).toEqual([
      '8 on foot: Your archers on a wall or tower deal 2x; chariots in the open 2x; soldiers holding a gate or breach 1.5x. But archers in melee deal half; chariots within 3 tiles of a wall deal half.',
      `4 archers: They shoot towers from ${ENEMY_TYPES.archer.range} tiles, then your units; a wall turns them back once no raider on foot is with them. Your chariots in the open deal 2x; soldiers holding a gate or breach 1.5x. But chariots within 3 tiles of a wall deal half.`,
      `2 chariots: They ride ${ENEMY_TYPES.chariot.speed} tiles a day alone, but keep pace with the slower raiders beside them (${ENEMY_TYPES.foot.speed} a day); a wall or rocky ground turns them back once no raider on foot is with them. Your soldiers holding a gate or breach deal 1.5x.`,
      `3 by boat: They land on a river bank within ${ENEMY_TYPES.boat.landWithin} tiles of the city. Your archers on a wall or tower deal 2x; chariots in the open 2x; soldiers holding a gate or breach 1.5x. But archers in melee deal half; chariots within 3 tiles of a wall deal half.`,
    ]);
    // The other way: change the table and the enemy's row, and the words follow.
    const keep = MATCHUPS.chariot.chariot, range = ENEMY_TYPES.archer.range;
    MATCHUPS.chariot.chariot = { open: 3 };
    ENEMY_TYPES.archer.range = 6;
    try {
      const again = A.counters({ foot: 0, archer: 1, chariot: 1, boat: 0 });
      expect(again[0].startsWith('1 archer: They shoot towers from 6 tiles')).toBe(true);
      expect(again[1]).toBe(`1 chariot: They ride ${ENEMY_TYPES.chariot.speed} tiles a day alone, but keep pace with the slower raiders beside them (${ENEMY_TYPES.archer.speed} a day); a wall or rocky ground turns them back once no raider on foot is with them. Your chariots in the open deal 3x; soldiers holding a gate or breach 1.5x.`);
    } finally {
      if (keep === undefined) delete MATCHUPS.chariot.chariot; else MATCHUPS.chariot.chariot = keep;
      ENEMY_TYPES.archer.range = range;
    }
  });
  it("says the chariots' pace from ENEMY_TYPES speeds as a band moves (ruling 383): fast alone, foot pace beside foot", () => {
    const only = (mix) => A.counters(mix).find((l) => l.includes('chariot:') || l.includes('chariots:'));
    expect(only({ foot: 0, archer: 0, chariot: 2, boat: 0 }).startsWith(`2 chariots: They ride ${ENEMY_TYPES.chariot.speed} tiles a day, faster than raiders on foot (${ENEMY_TYPES.foot.speed}); `)).toBe(true);
    const keep = ENEMY_TYPES.chariot.speed;
    try {
      ENEMY_TYPES.chariot.speed = ENEMY_TYPES.foot.speed;        // the other way: no faster than foot, so nothing said about pace
      expect(only({ foot: 4, archer: 0, chariot: 2, boat: 0 })).toBe('2 chariots: A wall or rocky ground turns them back once no raider on foot is with them. Your soldiers holding a gate or breach deal 1.5x.');
      ENEMY_TYPES.chariot.speed = 3;
      expect(only({ foot: 4, archer: 0, chariot: 2, boat: 0 }).startsWith(`2 chariots: They ride 3 tiles a day alone, but keep pace with the slower raiders beside them (${ENEMY_TYPES.foot.speed} a day)`)).toBe(true);
    } finally { ENEMY_TYPES.chariot.speed = keep; }
  });
  it('puts the counters on the raid sheet for a mixed raid only', () => {
    const parts = counterParts(warned({ foot: 3, archer: 2, chariot: 0, boat: 0 }).raid.warning);
    expect([parts.length, parts[0].textContent, parts[1].querySelectorAll('li').length]).toEqual([2, A.countersHead, 2]);
    expect(counterParts(warned(footMix(5)).raid.warning)).toEqual([]);
    expect(counterParts(null)).toEqual([]);
  });
  it("names a mixed raid's kinds once, in the sheet's arrival line, and an all-foot raid's line as before", () => {
    const mixed = warned({ foot: 8, archer: 3, chariot: 3, boat: 0 }), alert = { code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 1000 };
    const title = alertText(alert, mixed).title;
    expect(arrivalText(mixed.raid.warning, title, 60, true)).toBe(`14 raiders from the east are after your buildings: 8 on foot, 3 archers, 3 chariots. ${D.arrivesIn(60)}.`);
    expect(arrivalText(mixed.raid.warning, title, 60, false)).toBe(`14 raiders from the east: 8 on foot, 3 archers, 3 chariots. ${D.arrivesIn(60)}.`);
    const foot = warned(footMix(6)), footTitle = alertText(alert, foot).title;
    expect(arrivalText(foot.raid.warning, footTitle, 60, true)).toBe(D.withArrival(footTitle, 60));
    expect(arrivalText(foot.raid.warning, footTitle, 60, false)).toBe(D.arrivalLine(60));
  });
  it('words the raid report with what archers and chariots stopped and the towers that fell, only when there are any', () => {
    const base = { index: 6, dir: 'east', size: 9, won: true, byTowers: 2, bySoldiers: 1, towers: 1, burned: 0, stolen: 0, day: 1000 };
    expect(D.raidReport({ ...base, byArchers: 3, byChariots: 2, towersLost: 1 })).toBe('Raid from the east beaten: 1 tower stopped 2 of 9, soldiers stopped 1, archers stopped 3, chariots stopped 2; 1 tower fell.');
    expect(D.raidReport(base)).toBe('Raid from the east beaten: 1 tower stopped 2 of 9, soldiers stopped 1; nothing lost.');
  });
});

describe('s46 armies words: the building sheets', () => {
  it('says how many units a building holds, whether it trains and why not, its pay and what its units do', () => {
    const w = makeTestWorld();
    const range = addRaw(w, 'archery_range', 2, 2), stab = addRaw(w, 'stables', 6, 2), bar = addRaw(w, 'barracks', 10, 2);
    expect(armyRowsModel(w, range)).toEqual({ kind: 'archer', n: 0, cap: UNIT_TYPES.archer.perBuilding, away: [], status: 'short', short: 2 });
    range.staff = 6;
    expect(armyRowsModel(w, range).status).toBe('training');
    range.paused = true;
    expect(armyRowsModel(w, range).status).toBe('paused');
    for (let k = 0; k < UNIT_TYPES.archer.perBuilding; k++) w.soldiers.push({ id: w.nextUnitId++, kind: 'archer', barracks: range.id, x: 3, y: 3, hp: 8, hit: false, task: 'wait' });
    expect(armyRowsModel(w, range).status).toBe('full');
    w.army.away.push({ id: 99, kind: 'archer', barracks: range.id, back: w.day + 65 });
    expect(armyRowsModel(w, range).away).toEqual([{ n: 1, days: 65 }]);
    expect(A.away('archer', 1, 65)).toBe('1 archer away at the capital, back in 2 months');
    expect(armyRowsModel(w, addRaw(w, 'granary', 20, 20))).toBe(null);
    expect(armyRowsModel(w, bar).kind).toBe('soldier');
    expect(A.trains('chariot')).toBe(`Trains one chariot every ${UNIT_TYPES.chariot.trainDays} days at full staff, slower when short of workers`);
    expect(A.pay('archer')).toBe(`Each archer is paid ${UNIT_TYPES.archer.pay} gold a month at home, in peace too`);
    expect(A.archerDoes).toBe(`Shoots a raider up to ${UNIT_TYPES.archer.range} tiles away; on a wall or tower it deals 2x to raiders on foot, half in melee`);
    expect(A.chariotDoes).toBe(`Deals 2x in the open (no wall within ${ARMY.wallNear} tiles), half nearer a wall; it cannot pass a gate`);
    // The stables: the horses' grain, and the hungry line only after a month found the stores short.
    w.soldiers.push({ id: w.nextUnitId++, kind: 'chariot', barracks: stab.id, x: 7, y: 3, hp: 16, hit: false, task: 'wait' });
    const gran = addRaw(w, 'granary', 14, 14);
    gran.store = { grain: 40 };
    expect(armyRowsModel(w, stab).horses).toEqual({ each: UNIT_TYPES.chariot.grain, now: UNIT_TYPES.chariot.grain, held: 40, hungry: false });
    w.army.fed = false;
    expect(armyRowsModel(w, stab).horses.hungry).toBe(true);
    expect(alertText(armyAlerts(w)[0], w)).toEqual({ title: 'Chariot horses went hungry', fix: `Keep ${UNIT_TYPES.chariot.grain} grain a month in a granary; until then chariots fight at ${Math.round(ARMY.hungry * 100)}%` });
    expect(A.horses(UNIT_TYPES.chariot.grain, 6)).toBe(`Horses eat ${UNIT_TYPES.chariot.grain} grain a chariot a month (6 now), from granaries`);
  });
  it('builds the rows on the sheet: the range and stables in full, the barracks its away line only', () => {
    const w = makeTestWorld();
    const ui = createArmiesUi({ world: w });
    const range = addRaw(w, 'archery_range', 2, 2, { staff: 6 }), stab = addRaw(w, 'stables', 6, 2, { staff: 6 }), bar = addRaw(w, 'barracks', 10, 2);
    const text = (b) => ui.sheetParts.building(b).map((n) => n.textContent);
    expect(text(range)).toEqual([`Archers0 of ${UNIT_TYPES.archer.perBuilding}`, `Patrol${UNIT_TYPES.archer.patrol} tiles`, A.trains('archer'), A.archerDoes, A.pay('archer')]);
    expect(text(stab)).toEqual([`Chariots0 of ${UNIT_TYPES.chariot.perBuilding}`, `Patrol${UNIT_TYPES.chariot.patrol} tiles`, A.trains('chariot'), A.chariotDoes, A.pay('chariot'), A.horses(UNIT_TYPES.chariot.grain, 0), A.grainHeld(0)]);
    expect(text(bar)).toEqual([]);
    w.army.away.push({ id: 7, kind: 'soldier', barracks: bar.id, back: w.day + 30 });
    expect(text(bar)).toEqual(['1 soldier away at the capital, back in 1 month']);
    expect(ui.sheetParts.building(null)).toEqual([]);
  });
});

describe('s46 armies words: the barracks with soldiers away', () => {
  // Ruling 381: units away at the capital count toward their building's cap, in trainSoldiers and on the sheet alike.
  const rows = (w, b) => buildingParts({ world: w }, b).map((n) => n.textContent);
  const soldier = (w, bar) => w.soldiers.push({ id: w.nextUnitId++, kind: 'soldier', barracks: bar.id, x: 11, y: 3, hp: UNIT_TYPES.soldier.hp, hit: false, task: 'wait' });
  it('says full, and trains none, when the soldiers here and away fill it', () => {
    const w = makeTestWorld();
    const bar = addRaw(w, 'barracks', 10, 2, { staff: BUILDINGS.barracks.workers }), cap = DEFENCE.soldiersPerBarracks;
    for (let k = 0; k < cap - 2; k++) soldier(w, bar);
    for (let k = 0; k < 2; k++) w.army.away.push({ id: 900 + k, kind: 'soldier', barracks: bar.id, back: w.day + 60 });
    const t = rows(w, bar);
    expect(t).toContain(`Soldiers${cap - 2} here, 2 away, of ${cap}`);
    expect(t).toContain(`Full: ${cap - 2} here and 2 away, of ${cap} soldiers; it trains another when one is wounded`);
    expect(t.some((x) => x.startsWith('Trains one soldier'))).toBe(false);
    for (let d = 0; d < 3 * DEFENCE.trainDays; d++) trainSoldiers(w);
    expect(w.soldiers.filter((s) => s.barracks === bar.id).length).toBe(cap - 2);
  });
  it('the other way: with one away back home and one lost, it says it trains, and it does', () => {
    const w = makeTestWorld();
    const bar = addRaw(w, 'barracks', 10, 2, { staff: BUILDINGS.barracks.workers }), cap = DEFENCE.soldiersPerBarracks;
    for (let k = 0; k < cap - 2; k++) soldier(w, bar);
    w.army.away.push({ id: 900, kind: 'soldier', barracks: bar.id, back: w.day + 60 });
    const t = rows(w, bar);
    expect(t).toContain(`Soldiers${cap - 2} here, 1 away, of ${cap}`);
    expect(t).toContain(D.trains(DEFENCE.trainDays));
    expect(t.some((x) => x.startsWith('Full:'))).toBe(false);
    for (let d = 0; d < DEFENCE.trainDays; d++) trainSoldiers(w);
    expect(w.soldiers.filter((s) => s.barracks === bar.id).length).toBe(cap - 1);
    expect(rows(w, bar)).toContain(`Full: ${cap - 1} here and 1 away, of ${cap} soldiers; it trains another when one is wounded`);
  });
  it('reads as before with none away', () => {
    const w = makeTestWorld();
    const bar = addRaw(w, 'barracks', 10, 2, { staff: BUILDINGS.barracks.workers }), cap = DEFENCE.soldiersPerBarracks;
    for (let k = 0; k < cap; k++) soldier(w, bar);
    expect(rows(w, bar)).toContain(`Full: ${cap} of ${cap} soldiers; it trains another when one is wounded`);
    expect(rows(w, bar)).toContain(`Soldiers${cap} of ${cap}`);
  });
});

describe('s46 armies words: the raid under way, pay and the score line', () => {
  it("names each kind's patrol in the raid alert with archers or chariots at home, and the soldiers' alone without", () => {
    const w = makeTestWorld();
    const bar = addRaw(w, 'barracks', 10, 2), range = addRaw(w, 'archery_range', 2, 2);
    w.raid.active = { phase: 'attack', dir: 'east', raiders: [] };
    const alert = { code: 'raid', dirs: ['east'], left: 5, phase: 'attack' };
    w.soldiers.push({ id: w.nextUnitId++, kind: 'soldier', barracks: bar.id, x: 11, y: 3, hp: 10, hit: false, task: 'wait' });
    expect(alertText(alert, w).fix).toBe(`Towers hit raiders within ${DEFENCE.towerRange} tiles; soldiers fight within ${DEFENCE.patrol} tiles of their barracks`);
    w.soldiers.push({ id: w.nextUnitId++, kind: 'archer', barracks: range.id, x: 3, y: 3, hp: 8, hit: false, task: 'wait' });
    expect(alertText(alert, w).fix).toBe(`Towers hit raiders within ${DEFENCE.towerRange} tiles; your units go out within ${DEFENCE.patrol} to ${UNIT_TYPES.archer.patrol} tiles`);
    expect(alertText({ ...alert, phase: 'retreat' }, w).fix).toBe('Towers keep shooting as they go');
    w.soldiers = w.soldiers.filter((u) => u.kind === 'archer');
    expect(alertText(alert, w).fix).toBe(`Towers hit raiders within ${DEFENCE.towerRange} tiles; your archers go out within ${UNIT_TYPES.archer.patrol} tiles`);
  });
  it("keeps every raid fix within the soldiers' line, so the wide banner keeps View beside the side panel", () => {
    const w = makeTestWorld();
    const bar = addRaw(w, 'barracks', 10, 2), range = addRaw(w, 'archery_range', 2, 2), stab = addRaw(w, 'stables', 6, 6);
    const home = { soldier: bar, archer: range, chariot: stab };
    w.raid.active = { phase: 'attack', dir: 'east', raiders: [] };
    const alert = { code: 'raid', dirs: ['east', 'south'], left: 99, phase: 'attack' };
    const budget = `Towers hit raiders within ${DEFENCE.towerRange} tiles; soldiers fight within ${DEFENCE.patrol} tiles of their barracks`.length;
    const fixes = [];
    for (let m = 1; m < 8; m++) {
      w.soldiers = Object.keys(home).filter((k, i) => m & (1 << i)).map((k) => ({ id: w.nextUnitId++, kind: k, barracks: home[k].id, x: 3, y: 3, hp: 8, hit: false, task: 'wait' }));
      for (const phase of ['attack', 'leave']) fixes.push(alertText({ ...alert, phase }, w).fix);
    }
    expect(fixes.length).toBe(14);
    expect(fixes.filter((f) => f.length > budget)).toEqual([]);
    expect(fixes.some((f) => f.includes(`${DEFENCE.patrol} to ${UNIT_TYPES.chariot.patrol} tiles`))).toBe(true);
  });
  it("labels unit pay as the army's, and counts every kind as army units in the score line", () => {
    expect(T.soldiersPay).toBe('Army pay');
    expect(scoreReasonText({ code: 'towers', need: 2, towers: 1, soldiers: 3 })).toBe('A raid this size needs 2 towers; you have 1 working and 3 army units');
  });
});

describe('s46 armies words: firsts and tips', () => {
  it('fires each building\'s tip when it is placed, and the mixed-raid tip only for a mixed warning', () => {
    const w = warned({ foot: 3, archer: 2, chariot: 0, boat: 0 });
    const fired = [];
    const ui = createArmiesUi({ world: w, fireTip: (t) => fired.push(t) });
    const range = addRaw(w, 'archery_range', 2, 2), stab = addRaw(w, 'stables', 6, 2), well = addRaw(w, 'well', 12, 2);
    for (const b of [range, stab, well]) ui.onCommand({ kind: 'building', result: { ok: true, id: b.id } });
    ui.onEvents([{ type: 'raid_warning' }]);
    expect(fired).toEqual(['archeryRangePlaced', 'stablesPlaced', 'mixedRaidWarned']);
    const foot = warned(footMix(5)), none = [];
    createArmiesUi({ world: foot, fireTip: (t) => none.push(t) }).onEvents([{ type: 'raid_warning' }]);
    expect(none).toEqual([]);
  });
  it('words the firsts and tips from the data', () => {
    expect(FIRST_TEXT.first_archery_range.why).toBe(`Its archers shoot raiders up to ${UNIT_TYPES.archer.range} tiles away, 2x from a wall or tower.`);
    expect(FIRST_TEXT.first_stables.why).toBe(`Its chariots deal 2x in the open; their horses eat ${UNIT_TYPES.chariot.grain} grain each a month.`);
    expect(TIP_TEXT.chariots_in_open.includes(`no wall within ${ARMY.wallNear} tiles`)).toBe(true);   // the sim's open is a wall more than wallNear tiles away: see s46 wave1
    expect(TIP_TEXT.chariots_in_open.endsWith('but cannot pass walls or gates: put stables beside it.')).toBe(true);
  });
});
