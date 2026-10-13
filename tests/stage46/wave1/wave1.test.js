// Stage 4.6 wave 1 integration: the fixes the wave's reviewers found after the Map, Court and Armies tracks merged (rulings 413, 414, 416
// and the UX-rule findings). Describe names start with 's46 wave1'.
import { describe, it, expect } from '../../harness.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';
import { mount } from '../../helpers/dom.js';
import { makeTestWorld, layClay, setRoad, addRaw } from '../../helpers/testWorld.js';
import { openSheet } from '../../../src/ui/modes.js';
import { courtDay } from '../../../src/sim/court.js';
import { raidsOn, soldiersPayOf } from '../../../src/sim/costs.js';
import { COURT } from '../../../src/data/court.js';
import { FIRE_RISK } from '../../../src/data/fire.js';
import { UNIT_TYPES, ARMY } from '../../../src/data/armies.js';
import { DEFENCE } from '../../../src/data/raids.js';
import { baseRiskOf } from '../../../src/sim/fire.js';
import { scoreOf } from '../../../src/sim/score.js';
import { situationsAt } from '../../../src/sim/combat.js';
import { idx } from '../../../src/sim/grid.js';
import { createAlerts, triage, CRITICAL_RANK } from '../../../src/ui/alerts.js';
import { S46_COURT_TEXT as C, TIP_TEXT, T, alertText } from '../../../src/ui/text.js';

const PIT = { kind: 'building', type: 'clay_pit' };
const YEAR = 360;

describe('s46 wave1 confirm bar', () => {
  it('keeps a clay pit bar, landed on a fit and then moved onto a refused spot, at most 48% of the screen at 375x667 (UX rule 2)', async () => {
    for (const [w, h, size] of [[375, 667, 150], [375, 667, 125], [375, 667, 100], [390, 844, 150]]) {
      const world = uiWorld();
      world.milestone = 'town';
      layClay(world, 20, 14, 3, 3);
      const r = await rigUI({ width: w, height: h, world });
      try {
        r.ui.settings.set({ textSize: size });
        r.ui.placement.start(PIT, { x: 20, y: 14 });            // landed on clay: a fit with its warnings
        r.frame(1);
        const bar = r.root.querySelector('#confirm');
        const tall = () => Math.round(bar.getBoundingClientRect().height);
        const landed = tall();
        r.ui.placement.moveGhost(4, 3);                         // fertile land, no clay: refused, with Show me
        r.frame(2);
        expect([size, Boolean(bar.querySelector('.show-fit')), bar.querySelector('.reason').textContent]).toEqual([size, true, 'Needs 2 of 4 tiles on clay (this spot has 0)']);
        for (const [what, px] of [['landed', landed], ['refused', tall()]]) expect([w, h, size, what, px <= 0.48 * h ? 'ok' : `too tall: ${px} px`]).toEqual([w, h, size, what, 'ok']);
      } finally { r.cleanup(); }
    }
  });
});

// ── The court sheet on Peaceful (review finding a) ──
function courtCity({ difficulty = 'normal' } = {}) {
  const w = uiWorld();
  w.seed = 5;
  w.difficulty = difficulty;
  w.milestone = 'market_town';
  w.goals.completed.push(COURT.afterGoal);
  w.day = YEAR;
  w.speed = 0;
  courtDay(w);
  return w;
}
describe('s46 wave1 court sheet on Peaceful', () => {
  it('states favour raid and tribute effects only where raids and tribute exist, from the sim own raidsOn, both ways', async () => {
    for (const difficulty of ['normal', 'peaceful']) {
      const w = courtCity({ difficulty });
      const raids = raidsOn(w);
      expect([difficulty, raids]).toEqual([difficulty, difficulty !== 'peaceful']);
      const r = await rigUI({ world: w });
      try {
        for (const [favour, band] of [[20, 'low'], [50, 'steady'], [80, 'high']]) {
          w.court.favour = favour;
          r.store.set(openSheet(r.store.get(), 'court'));
          r.ui.refresh();
          const t = r.root.querySelector('#sheet').textContent;
          expect([difficulty, band, /raid|tribute/i.test(t.replace(C.peacefulNote, ''))]).toEqual([difficulty, band, raids]);   // Peaceful says once that there are none, and nothing of their effects
          expect([difficulty, band, t.includes(C.band[band]), t.includes(C.bandNowOf(band, raids)), t.includes(C.drift)]).toEqual([difficulty, band, true, true, true]);
          // The gifts' rule is stated wherever it is not the band in effect, on every level.
          expect([difficulty, band, t.includes(C.ruleHighOf(raids))]).toEqual([difficulty, band, band !== 'high']);
          expect([difficulty, band, t.includes(C.ruleLowOf(true))]).toEqual([difficulty, band, raids && band !== 'low']);
          expect([difficulty, band, t.includes(C.peacefulNote)]).toEqual([difficulty, band, !raids]);
        }
      } finally { r.cleanup(); }
    }
    expect(C.bandNowOf('high', false)).toBe('Now: the court sends gifts');
    expect(C.bandNowOf('low', false)).toBe('Now: no gifts');
    expect(C.ruleLowOf(false)).toBe('');
  });
});

// ── A court letter is polite (ruling 413) ──
describe('s46 wave1 court letter in the alert row', () => {
  const letter = (extra = {}) => ({ code: 'court_letter', letter: 7, count: 1, ...extra });
  it('ranks below an active raid, an uncovered fire and a raid warning, and above debt', () => {
    const at = (c) => CRITICAL_RANK.indexOf(c);
    expect([at('raid'), at('fire'), at('raid_warning')].every((i) => i >= 0 && i < at('court_letter'))).toBe(true);
    expect(at('court_letter')).toBeLessThan(at('debt'));
    const w = makeTestWorld({ gold: 1000 });
    expect(triage(w, [{ code: 'debt' }, letter(), { code: 'raid_warning', x: 3, y: 3 }]).critical.map((a) => a.code)).toEqual(['raid_warning', 'court_letter', 'debt']);
  });
  it('sounds no chime and announces politely for a letter and its due reminder, and still urgently for a raid and debt', () => {
    const { root, cleanup } = mount('<div id="banner"></div><p id="live"></p>');
    try {
      const w = makeTestWorld({ gold: 1000 });
      let alerts = [], chimes = 0;
      const a = createAlerts({ world: w, banner: root.querySelector('#banner'), live: root.querySelector('#live'), root, onNewCritical: () => { chimes += 1; }, getAlerts: () => alerts });
      const live = () => root.querySelector('#live').getAttribute('aria-live');
      alerts = [letter()];
      a.refresh();
      expect([chimes, live(), root.querySelector('#live').textContent.includes(alertText(letter(), w).title)]).toEqual([0, 'polite', true]);
      alerts = [letter({ due: true })];                         // the reminder two months out: the same letter, due
      a.refresh();
      expect([chimes, live()]).toEqual([0, 'polite']);
      alerts = [letter({ count: 2 })];                          // a second letter joins it
      a.refresh();
      expect([chimes, live()]).toEqual([0, 'polite']);
      for (const [i, harm] of [{ code: 'debt' }, { code: 'raid', x: 3, y: 3 }].entries()) {
        alerts = [letter(), harm];
        a.refresh();
        expect([harm.code, chimes, live()]).toEqual([harm.code, i + 1, 'assertive']);
        alerts = [letter()];
        a.refresh();
      }
    } finally { cleanup(); }
  });
});

// ── The score does not count archers and chariots (ruling 414) ──
describe('s46 wave1 score defence', () => {
  it('counts only foot soldiers in the defence term, so archers and chariots change no score (ruling 344)', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    w.milestone = 'market_town';
    w.raid.clockDay = 0;
    const mk = (kind) => ({ id: w.nextUnitId++, kind, barracks: 1, x: 3, y: 3, hp: 8, hit: false, task: 'wait' });
    const base = scoreOf(w);
    expect(base.reasons.safety).toEqual({ code: 'towers', need: 1, towers: 0, soldiers: 0 });
    w.soldiers.push(mk('archer'), mk('archer'), mk('archer'), mk('chariot'), mk('chariot'));
    const withUnits = scoreOf(w);
    expect([withUnits.parts.safety, withUnits.reasons.safety, withUnits.raw]).toEqual([base.parts.safety, base.reasons.safety, base.raw]);
    w.soldiers.push(mk('soldier'), mk('soldier'));
    const withSoldiers = scoreOf(w);
    expect(withSoldiers.reasons.safety.soldiers).toBe(2);
    expect(withSoldiers.parts.safety).toBeGreaterThan(base.parts.safety);
    w.soldiers = w.soldiers.slice(5).map(({ kind, ...u }) => u);   // a soldier from before Stage 4.6 has no kind and still counts
    expect(scoreOf(w).reasons.safety.soldiers).toBe(2);
  });
  it('calls the money sheets pay row Army pay, and pays every unit at home by its kind', () => {
    expect(T.soldiersPay).toBe('Army pay');
    const w = makeTestWorld({ gold: 1000 });
    const mk = (kind) => ({ id: w.nextUnitId++, kind, barracks: 1, x: 3, y: 3, hp: 8, hit: false, task: 'wait' });
    w.soldiers.push(mk('soldier'), mk('archer'), mk('chariot'));
    expect(soldiersPayOf(w)).toBe(UNIT_TYPES.soldier.pay + UNIT_TYPES.archer.pay + UNIT_TYPES.chariot.pay);
  });
});

// ── Fire (ruling 416) ──
describe('s46 wave1 fire risk', () => {
  it('gives the archery range and the stables a fire risk, the stables higher (hay), and the sim burns them', () => {
    expect([FIRE_RISK.archery_range, FIRE_RISK.stables]).toEqual([0.3, 0.5]);
    expect(FIRE_RISK.stables).toBeGreaterThan(FIRE_RISK.archery_range);
    expect(FIRE_RISK.archery_range).toBe(FIRE_RISK.barracks);
    const w = makeTestWorld({ size: 32 });
    const range = addRaw(w, 'archery_range', 4, 4), stables = addRaw(w, 'stables', 10, 4);
    expect([baseRiskOf(range), baseRiskOf(stables)]).toEqual([0.3, 0.5]);
  });
});

// ── The tribute sheet puts its buttons first (UX rule 2) ──
describe('s46 wave1 tribute sheet', () => {
  it('shows Pay and Keep on the screen of a 390x844 phone, ahead of the list of what helps against a mixed raid', async () => {
    for (const size of [100, 150]) {
      const w = uiWorld();
      w.raid.warning = { index: 6, entry: { x: 31, y: 16 }, dir: 'east', size: 14, tribute: 200, target: 'building', day: w.day, arrives: w.day + 72, first: false, mix: { foot: 6, archer: 4, chariot: 2, boat: 2 } };
      const r = await rigUI({ width: 390, height: 844, world: w });
      try {
        r.ui.settings.set({ textSize: size });
        r.store.set(openSheet(r.store.get(), 'tribute'));
        r.ui.refresh();
        const sheet = r.root.querySelector('#sheet');
        const pay = sheet.querySelector('.tribute-actions .pay'), keep = sheet.querySelector('.tribute-actions .keep'), list = sheet.querySelector('.raid-counters');
        expect([size, Boolean(pay), Boolean(keep), Boolean(list)]).toEqual([size, true, true, true]);
        expect([size, Boolean(pay.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING)]).toEqual([size, true]);
        // On the screen of the phone: the sheet is 60% of the height (the test page's own vh is not the phone's), so the buttons' bottom edge,
        // measured from the sheet's top, must fall inside that share of 844 px. At 150% text the sheet scrolls, as it always did: only the order holds.
        const shown = sheet.getBoundingClientRect();
        for (const b of [pay, keep]) {
          const box = b.getBoundingClientRect();
          expect([size, b.textContent, box.height >= 44 - 0.5]).toEqual([size, b.textContent, true]);
          if (size === 100) expect([size, b.textContent, box.bottom - shown.top <= 0.6 * 844 ? 'on screen' : `${Math.round(box.bottom - shown.top)} px down the sheet`]).toEqual([size, b.textContent, 'on screen']);
        }
      } finally { r.cleanup(); }
    }
  });
});

// ── The chariot tip agrees with the sim (review finding h) ──
describe('s46 wave1 chariot tip', () => {
  it('says open as the sim reads it: no wall within ARMY.wallNear tiles, so a wall exactly that far is near', () => {
    expect(TIP_TEXT.chariots_in_open.includes(`with no wall within ${ARMY.wallNear} tiles`)).toBe(true);
    expect(TIP_TEXT.chariots_in_open.includes(`${ARMY.wallNear}+ tiles`)).toBe(false);
    const w = makeTestWorld({ size: 40 });
    w.wall[idx(w.size, 10, 10)] = DEFENCE.wallHp;
    w.wallVersion++;
    const at = (d) => situationsAt(w, { x: 10.5, y: 10.5 + d });
    expect([at(ARMY.wallNear).includes('nearWall'), at(ARMY.wallNear).includes('open')]).toEqual([true, false]);
    expect([at(ARMY.wallNear + 1).includes('nearWall'), at(ARMY.wallNear + 1).includes('open')]).toEqual([false, true]);
  });
});
