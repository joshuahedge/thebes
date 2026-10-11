import { describe, it, expect } from '../../harness.js';
import { fireRowModel, firehousesReaching } from '../../../src/ui/dangerSheets.js';
import { createDanger } from '../../../src/ui/danger.js';
import { rangeTiles } from '../../../src/render/overlays.js';
import { staffedCover, coverageOf, fireBand } from '../../../src/sim/fire.js';
import { tributeQuote } from '../../../src/sim/raids.js';
import { festivalStatus } from '../../../src/sim/festival.js';
import { openSheet, select } from '../../../src/ui/modes.js';
import { idx } from '../../../src/sim/grid.js';
import { DANGER_UI_TEXT as D, T } from '../../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { fire } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';

const click = (n) => fire(n, 'click');
function town() {
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  world.milestone = 'town';
  return world;
}
const texts = (root, sel) => [...root.querySelectorAll(sel)].map((n) => n.textContent);
// The rigged city's goals that are already met pay out at the first command's settle: settle them first, so a test's
// gold counts only what its own command spent.
const settleGoals = (r) => r.ui.afterCommand({ kind: 'test', result: { ok: true }, undoable: false });

describe('s3 ui fire row', () => {
  it('says why a building can or cannot burn, before Town and by its band, from the sim\'s coverage', () => {
    const w = town();
    const potter = addRaw(w, 'potter', 20, 11, { risk: 70 });
    const garden = addRaw(w, 'garden', 18, 11);
    expect(fireRowModel(w, garden).text).toBe('Never catches fire');
    w.milestone = 'village';
    expect(fireRowModel(w, potter).text).toBe('Fire risk starts at Town');
    w.milestone = 'town';
    let m = fireRowModel(w, potter);
    expect([fireBand(70), m.text, m.action]).toEqual([2, 'Fire risk: high, no firehouse within 8 road tiles', { kind: 'showMe' }]);
    const fh = addRaw(w, 'firehouse', 24, 11, { staff: 4 });
    m = fireRowModel(w, potter);
    expect([staffedCover(w, potter), m.text, m.action]).toEqual([true, 'Fire risk: high, a firehouse reaches it', null]);
    fh.staff = 1;                                                                       // 25%: it works, but covers 0.25 < 0.5
    m = fireRowModel(w, potter);
    expect([coverageOf(w, potter), staffedCover(w, potter), m.text, m.action]).toEqual([0.25, false, 'Fire risk: high, the firehouse is short of workers', { kind: 'view', id: fh.id }]);
    fh.staff = 0;                                                                       // not working at all: still the one in reach
    expect(fireRowModel(w, potter).text).toBe('Fire risk: high, the firehouse is short of workers');
    fh.staff = 4; fh.paused = true;
    expect(fireRowModel(w, potter).text).toBe('Fire risk: high, the firehouse is paused');
    fh.paused = false;
    potter.risk = 10;
    expect(fireRowModel(w, potter).text).toBe('Fire risk: low, a firehouse reaches it');
    potter.risk = 130;
    expect(fireRowModel(w, potter).text).toBe('Can catch fire, a firehouse reaches it');
    expect(firehousesReaching(w, garden).map((f) => f.id)).toEqual([fh.id]);
    const far = addRaw(w, 'potter', 2, 11, { risk: 30 });                              // 22 road tiles away
    expect([firehousesReaching(w, far), fireRowModel(w, far).text]).toEqual([[], 'Fire risk: rising, no firehouse within 8 road tiles']);
  });

  it('words a blaze and a fire by whether a staffed firehouse reaches it, with the days the fire has left', () => {
    const w = town();
    const potter = addRaw(w, 'potter', 20, 11, { fire: { stage: 'blaze', days: 1, need: 2, fought: 0 } });
    expect(fireRowModel(w, potter)).toEqual({ text: 'Blaze, no firehouse reaches it', burning: true, action: { kind: 'showMe' } });
    potter.fire = { stage: 'fire', days: 2, left: 9 };
    expect(fireRowModel(w, potter).text).toBe('Burning, 9 days left, no firehouse reaches it');
    const fh = addRaw(w, 'firehouse', 24, 11, { staff: 4 });
    expect(fireRowModel(w, potter).text).toBe('Burning, 9 days left, the firehouse is fighting it');
    potter.fire = { stage: 'blaze', days: 0, need: 1, fought: 0 };
    expect(fireRowModel(w, potter).text).toBe('Blaze, the firehouse is putting it out');
    fh.staff = 1;
    expect(fireRowModel(w, potter)).toEqual({ text: 'Blaze, the firehouse is short of workers', burning: true, action: { kind: 'view', id: fh.id } });
    potter.fire = { stage: 'fire', days: 0, left: 1 };
    expect(fireRowModel(w, potter).text).toBe('Burning, 1 day left, the firehouse is short of workers');
  });

  it('shows the row on building and home sheets, with Show me placing a firehouse by it and View selecting the firehouse', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.world.milestone = 'town';
      const potter = addRaw(r.world, 'potter', 20, 11, { risk: 70, staff: 2 });
      r.store.set(openSheet(r.store.get(), 'info', potter.id));
      const sheet = r.root.querySelector('#sheet');
      expect(sheet.querySelector('.fire-row').textContent).toBe(`${D.fireLabel}Fire risk: high, no firehouse within 8 road tiles`);
      click(sheet.querySelector('.fire-fix .show-me'));
      const s = r.store.get();
      expect([s.tool, s.sheet]).toEqual([{ kind: 'building', type: 'firehouse' }, null]);
      expect(Math.abs(s.ghost.x - 20) + Math.abs(s.ghost.y - 11)).toBeLessThan(6);
      r.ui.placement.cancel();
      const fh = addRaw(r.world, 'firehouse', 22, 11, { staff: 1 });
      const hut = Object.values(r.world.buildings).find((b) => b.type === 'house');
      r.store.set(select(r.store.get(), hut.id));
      expect(sheet.querySelector('.fire-row').textContent).toBe(`${D.fireLabel}Fire risk: low, no firehouse within 8 road tiles`);   // the huts are 9 road tiles off
      r.store.set(select(r.store.get(), potter.id));
      click(sheet.querySelector('.fire-fix .view'));
      expect(r.store.get().selectedId).toBe(fh.id);
    } finally { r.cleanup(); }
  });
});

describe('s3 ui danger buildings', () => {
  it('words the firehouse, tower, barracks and rubble from their state, and highlights a tower\'s range', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const w = r.world;
      w.milestone = 'market_town';
      const fh = addRaw(w, 'firehouse', 22, 11, { staff: 4 });
      const sheet = r.root.querySelector('#sheet');
      r.store.set(select(r.store.get(), fh.id));
      expect(texts(sheet, '.body p.small')).toContain('Covers 2 buildings that can burn');   // the temple at (24, 11) and itself
      fh.staff = 1; r.ui.refresh();
      expect(texts(sheet, '.body p.small')).toContain('Puts out blazes only with 2 of 4 workers or more');
      fh.staff = 0; r.ui.refresh();
      expect(texts(sheet, '.body p.small')).toContain('Covers nothing until it has 1 of 4 workers');
      fh.paused = true; r.ui.refresh();
      expect(texts(sheet, '.body p.small')).toContain('Covers nothing while it is paused');
      const tower = addRaw(w, 'tower', 26, 11, { staff: 4 });
      w.wall[idx(w.size, 26, 11)] = 64;
      w.raid.last = { index: 1, dir: 'east', size: 6, won: true, byTowers: 4, bySoldiers: 2, towers: 1, burned: 0, stolen: 12, day: 400 };
      r.store.set(select(r.store.get(), tower.id));
      expect(texts(sheet, '.row')).toContain(`${D.range}4 tiles`);
      // At peace the tile reads the hit points it fights with (ruling 8: raised to 80 when raiders arrive); "N of 80" in a raid.
      expect(texts(sheet, '.row')).toContain(`${D.onTheWall}80 hit points`);
      expect(texts(sheet, '.body p.small')).toEqual(['Shoots the nearest raider within 4 tiles once a day', 'Last raid: towers stopped 4 of 6']);
      w.raid.active = { index: 2, entry: { x: 31, y: 11 }, dir: 'east', size: 6, target: 'building', day: 500, raiders: [], phase: 'attack',
        targetId: null, struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [] };
      r.ui.refresh();
      expect(texts(sheet, '.row')).toContain(`${D.onTheWall}64 of 80 hit points`);
      w.raid.active = null;
      tower.staff = 0; r.ui.refresh();   // combatDay skips a tower that is not working: no shooting line
      expect(texts(sheet, '.body p.small')).toEqual(['Not shooting until it has 1 of 4 workers', 'Last raid: towers stopped 4 of 6']);
      tower.staff = 4; tower.paused = true; r.ui.refresh();
      expect(texts(sheet, '.body p.small')[0]).toBe('Not shooting while it is paused');
      tower.paused = false;
      const barracks = addRaw(w, 'barracks', 27, 11, { staff: 6 });
      w.soldiers = [{ id: 1, barracks: barracks.id, x: 28, y: 12, hp: 12, hit: false, task: 'wait' }, { id: 2, barracks: 999, x: 1, y: 1, hp: 12, hit: false, task: 'wait' }];
      r.store.set(select(r.store.get(), barracks.id));
      expect(texts(sheet, '.row')).toContain(`${D.soldiers}1 of 4`);
      expect(texts(sheet, '.body p.small')).toEqual(['Trains one soldier every 30 days at full staff, slower when short of workers', 'Each soldier is paid 8 gold a month, in peace too', 'Last raid: soldiers stopped 2 of 6']);
      barracks.staff = 1; r.ui.refresh();
      expect(texts(sheet, '.body p.small')[0]).toBe('Not training until it has 2 of 6 workers');
      barracks.staff = 6;   // a full barracks trains none (trainSoldiers skips it at soldiersPerBarracks)
      for (let id = 3; id <= 5; id++) w.soldiers.push({ id, barracks: barracks.id, x: 28, y: 12, hp: 12, hit: false, task: 'wait' });
      r.ui.refresh();
      expect(texts(sheet, '.row')).toContain(`${D.soldiers}4 of 4`);
      expect(texts(sheet, '.body p.small')).toEqual(['Full: 4 of 4 soldiers; it trains another when one is wounded', 'Each soldier is paid 8 gold a month, in peace too', 'Last raid: soldiers stopped 2 of 6']);
      const range = rangeTiles(w, tower);
      expect([range.includes(idx(w.size, 26, 15)), range.includes(idx(w.size, 26, 16)), range.includes(idx(w.size, 30, 11)), range.includes(idx(w.size, 31, 11))]).toEqual([true, false, true, false]);
      const rubble = addRaw(w, 'rubble', 20, 12);
      settleGoals(r);
      r.store.set(select(r.store.get(), rubble.id));
      expect(texts(sheet, '.body p.small')).toEqual(['Rubble: clear it for 5 gold a tile', 'Drag Demolish over rubble to clear many at once']);
      expect([sheet.querySelector('.demolish'), sheet.querySelector('.actions').firstElementChild.className]).toEqual([null, 'festival-group']);
      const gold = w.gold;
      click(sheet.querySelector('.clear'));
      expect([w.buildings[rubble.id], w.gold, w.tally.rubbleCleared, r.store.get().sheet]).toEqual([undefined, gold - 5, 1, null]);
      const more = addRaw(w, 'rubble', 21, 12);
      w.gold = -498;
      r.store.set(select(r.store.get(), more.id));
      expect([sheet.querySelector('.clear').disabled, texts(sheet, '.festival-group p')]).toEqual([true, ['Would put the treasury over 500 gold in debt']]);
    } finally { r.cleanup(); }
  });

  it('offers the temple\'s festival with its cost, or says when the next can be held and why not, from festivalStatus', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const w = r.world;
      const temple = Object.values(w.buildings).find((b) => b.type === 'temple');
      const sheet = r.root.querySelector('#sheet');
      r.store.set(select(r.store.get(), temple.id));
      expect(sheet.querySelector('.festival')).toBe(null);                              // before Town: none
      w.milestone = 'town';
      settleGoals(r);
      const hold = sheet.querySelector('.actions .festival');
      expect([hold.textContent, hold.disabled, festivalStatus(w).can]).toEqual(['Hold a festival, 200 gold', false, true]);
      expect(texts(sheet, '.festival-group p')).toEqual(['+6 mood for 3 months; the next can follow 12 months later']);
      const gold = w.gold;
      click(hold);
      expect([w.gold, w.danger.festivalDay, w.tally.festivals]).toEqual([gold - 200, w.day, 1]);
      expect(sheet.querySelector('.festival').disabled).toBe(true);
      expect(texts(sheet, '.festival-group p')).toEqual(['Festival: +6 mood for 3 months more', 'Next festival in 12 months']);
      w.day += 100;
      r.ui.refresh();
      expect(texts(sheet, '.festival-group p')).toEqual(['Next festival in 8 months 20 days']);
      w.day += 260;
      w.gold = -400;
      r.ui.refresh();
      expect([festivalStatus(w).reason, texts(sheet, '.festival-group p')]).toEqual(['no_gold', ['Would put the treasury over 500 gold in debt']]);
      w.gold = 1000; temple.paused = true;
      r.ui.refresh();
      expect(texts(sheet, '.festival-group p')).toEqual(['A festival needs a working temple']);
    } finally { r.cleanup(); }
  });
});

describe('s3 ui tribute and the last raid', () => {
  function warn(w, { first = false, size = 6, tribute = 240 } = {}) {
    w.raid.warning = { index: first ? 0 : 1, entry: { x: 31, y: 16 }, dir: 'east', size, tribute: first ? null : tribute, target: 'storehouse', day: w.day, arrives: w.day + 90, first };
  }

  it('confirms tribute with its cost, the gold afterwards, what it cancels and not, and two outcome buttons with no default', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const w = r.world;
      settleGoals(r);
      w.gold = 610;
      warn(w);
      r.ui.alerts.action({ code: 'raid_warning', x: 31, y: 16, dir: 'east', arrives: 90 }, 'tribute');
      const sheet = r.root.querySelector('#sheet');
      expect([r.store.get().sheet, sheet.querySelector('h2').textContent]).toEqual([{ kind: 'tribute', id: null }, T.tribute]);
      expect(sheet.querySelector('.tribute-cost').textContent).toBe('Pay 240 gold of tribute');
      expect(texts(sheet, '.row')).toEqual([`${D.goldNow}610`, `${D.goldAfter}370`]);
      expect(sheet.querySelector('.cancels').textContent).toBe('Cancels the raid from the east (6 raiders). The next raid still comes.');
      expect(texts(sheet, '.body p.small')).toEqual([D.capital(D.defenceLine(tributeQuote(w), 'east'))]);
      expect(texts(sheet, '.tribute-actions button')).toEqual(['Pay 240 gold', 'Keep gold, defend']);
      for (const b of sheet.querySelectorAll('.tribute-actions button')) expect([b.className.includes('primary'), b.className.includes('danger'), document.activeElement === b]).toEqual([false, false, false]);
      click(sheet.querySelector('.keep'));
      expect([r.store.get().sheet, w.raid.warning === null, w.gold]).toEqual([null, false, 610]);
      r.ui.alerts.action({ code: 'raid_warning' }, 'tribute');
      click(r.root.querySelector('#sheet .pay'));
      expect([r.store.get().sheet, w.raid.warning, w.gold, w.tally.tributes]).toEqual([null, null, 370, 1]);
    } finally { r.cleanup(); }
  });

  it('disables Pay in the rule\'s words below 0, hides tribute for the first raid, and says when there is none', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const w = r.world;
      w.gold = 180;
      warn(w);
      r.ui.alerts.action({ code: 'raid_warning' }, 'tribute');
      const sheet = r.root.querySelector('#sheet');
      expect([tributeQuote(w).reason, sheet.querySelector('.pay').disabled, sheet.querySelector('.why-not').textContent]).toEqual(['below_zero', true, "You have 180 gold. Tribute can't put the treasury below 0."]);
      w.gold = 240;
      r.ui.refresh();
      expect([sheet.querySelector('.pay').disabled, sheet.querySelector('.why-not')]).toEqual([false, null]);   // exactly 0 afterwards is allowed
      warn(w, { first: true, size: 3 });
      r.ui.refresh();
      expect([sheet.querySelector('.pay'), texts(sheet, '.body p')]).toEqual([null, ["The first raid can't be paid off.", 'Build 1 tower facing east (≈ 150 gold)']]);
      w.raid.warning = null;
      r.ui.refresh();
      expect(texts(sheet, '.body p')).toEqual(['Tribute can be paid only while a raid is on its way']);
    } finally { r.cleanup(); }
  });

  it('puts the last raid\'s report in the summary after the goals', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(r.root.querySelector('#sheet .raid-report')).toBe(null);
      r.world.raid.last = { index: 2, dir: 'north', size: 6, won: false, byTowers: 1, bySoldiers: 0, towers: 1, burned: 3, stolen: 120, day: 1234 };
      r.ui.refresh();
      const report = r.root.querySelector('#sheet .raid-report');
      expect(report.textContent).toBe('Raid from the north: raiders burned 3 buildings and took 120 gold. Towers stopped 1 of 6.');
      expect(report.previousElementSibling.textContent).toBe(D.lastRaid);
      expect(report.nextElementSibling.textContent).toBe('Ended Year 4, month 6, day 5');
      expect(createDanger({}).sheetParts.summary()).toEqual([]);
    } finally { r.cleanup(); }
  });
});
