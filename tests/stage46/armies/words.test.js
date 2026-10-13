// Stage 4.6, the Armies track's words: every sentence from the data or the sim, each checked with the world set up both ways.
import { describe, it, expect } from '../../harness.js';
import { alertText, S46_ARMY_TEXT as A, DANGER_UI_TEXT as D, TIP_TEXT, FIRST_TEXT } from '../../../src/ui/text.js';
import { counterParts } from '../../../src/ui/dangerSheets.js';
import { armyRowsModel, createArmiesUi } from '../../../src/ui/s46/armies.js';
import { MATCHUPS, ENEMY_TYPES, UNIT_TYPES, ARMY, footMix } from '../../../src/data/armies.js';
import { armyAlerts } from '../../../src/sim/armies.js';
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
      '2 chariots: Fast; a wall or rocky ground turns them back once no raider on foot is with them. Your soldiers holding a gate or breach deal 1.5x.',
      `3 by boat: They land on a river bank within ${ENEMY_TYPES.boat.landWithin} tiles of the city. Your archers on a wall or tower deal 2x; chariots in the open 2x; soldiers holding a gate or breach 1.5x. But archers in melee deal half; chariots within 3 tiles of a wall deal half.`,
    ]);
    // The other way: change the table and the enemy's row, and the words follow.
    const keep = MATCHUPS.chariot.chariot, range = ENEMY_TYPES.archer.range;
    MATCHUPS.chariot.chariot = { open: 3 };
    ENEMY_TYPES.archer.range = 6;
    try {
      const again = A.counters({ foot: 0, archer: 1, chariot: 1, boat: 0 });
      expect(again[0].startsWith('1 archer: They shoot towers from 6 tiles')).toBe(true);
      expect(again[1]).toBe('1 chariot: Fast; a wall or rocky ground turns them back once no raider on foot is with them. Your chariots in the open deal 3x; soldiers holding a gate or breach 1.5x.');
    } finally {
      if (keep === undefined) delete MATCHUPS.chariot.chariot; else MATCHUPS.chariot.chariot = keep;
      ENEMY_TYPES.archer.range = range;
    }
  });
  it('puts the counters on the raid sheet for a mixed raid only', () => {
    const parts = counterParts(warned({ foot: 3, archer: 2, chariot: 0, boat: 0 }).raid.warning);
    expect([parts.length, parts[0].textContent, parts[1].textContent, parts[2].querySelectorAll('li').length]).toEqual([3, '5 raiders from the east: 3 on foot, 2 archers.', A.countersHead, 2]);
    expect(counterParts(warned(footMix(5)).raid.warning)).toEqual([]);
    expect(counterParts(null)).toEqual([]);
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
    expect(alertText(armyAlerts(w)[0], w)).toEqual({ title: 'Chariot horses went hungry', fix: `Keep ${UNIT_TYPES.chariot.grain} grain a month in a granary or storehouse; until then chariots fight at ${Math.round(ARMY.hungry * 100)}%` });
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
    expect(TIP_TEXT.chariots_in_open.includes(`${ARMY.wallNear}+ tiles`)).toBe(true);
  });
});
