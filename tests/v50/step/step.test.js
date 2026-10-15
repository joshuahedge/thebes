// Version 5.0 Task 2 (next step on house sheets): the line at the top of a home's sheet, from the sim's nextStep, tested both ways for every cause code and every
// reason nextStep returns: the world set up so the cause is there (the line names the fix with the sim's own price, place and days) and then changed so it is
// gone (the line is not the same). Then the sheet: the line first, its Show me aiming exactly where the checklist row's does, a refusal that says why, the
// checklist still below. The mobile budget for the sheet is in tests/ui/mobileBudget.test.js.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { mount, fire } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { nextStep, daysToDelivery } from '../../../src/sim/advice.js';
import { houseStatus } from '../../../src/sim/housing.js';
import { houseDesirability } from '../../../src/sim/desirability.js';
import { costOf, roadCostOf } from '../../../src/sim/costs.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { createWorld, allBuildings } from '../../../src/sim/world.js';
import { TIERS, MAX_TIER } from '../../../src/data/housing.js';
import { HOUSEHOLD_GOODS, GOODS } from '../../../src/data/goods.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { stepWords, STEP_LABELS, STEP_TEXT } from '../../../src/ui/nextStepText.js';
import { createSheets } from '../../../src/ui/sheets.js';
import { createMinimap } from '../../../src/ui/minimap.js';
import { createPlacement } from '../../../src/ui/placement.js';
import { createCameraControl } from '../../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { select } from '../../../src/ui/modes.js';
import { createCamera } from '../../../src/render/camera.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { T, NEED_NAMES, buildingName, viewLabel, S47_PRESSURE_TEXT } from '../../../src/ui/text.js';
import { ADVICE_TEXT } from '../../../src/ui/adviceText.js';
import { showMeRefusal } from '../../../src/ui/adviceUi.js';

const gold = (n) => `${n} gold`;
const lineOf = (w, home) => { const step = nextStep(w, home); return { step, words: stepWords(w, home, step) }; };
const code = ({ step }) => (step.reason === null ? step.cause.code : step.reason);

// A road along y = 10, a home beside it at (12, 9); size 32, fertile west strip, a patch of clay at (24, 20).
function street({ tier = 2, milestone = 'capital', homeAt = [12, 9], stock } = {}) {
  const w = makeTestWorld({ clay: [[24, 20, 4, 4]] });
  w.milestone = milestone;
  setRoad(w, 0, 10, 31, 10);
  const home = addRaw(w, 'house', homeAt[0], homeAt[1], { tier, residents: tier ? TIERS[tier].capacity : 0, stockedFor: tier ? TIERS[tier].capacity : 0, stock: stock || {} });
  return { w, home };
}

// Everything a Townhouse (tier 5) needs but entertainment: well, temple, a bazaar with every food and household good, its own stock; the next tier is a Manor.
function townhouse({ booth = false, statues = false } = {}) {
  const { w, home } = street({ tier: 5, stock: { grain: 30, pottery: 60 } });
  addRaw(w, 'well', 14, 11);
  addRaw(w, 'temple', 20, 11);
  const bazaar = addRaw(w, 'bazaar', 9, 11);
  bazaar.store = Object.fromEntries([['grain', 300], ...HOUSEHOLD_GOODS.map((g) => [g, 300])]);
  home.stock = Object.fromEntries([['grain', 30], ...HOUSEHOLD_GOODS.map((g) => [g, Math.ceil(TIERS[5].capacity * GOODS[g].perResidentPerMonth * 2)])]);
  if (booth) addRaw(w, 'booth', 16, 11);
  staffAll(w);
  if (statues) {
    for (const [x, y] of [[11, 8], [13, 8], [10, 8], [14, 8], [12, 8], [12, 7], [11, 7], [13, 7], [15, 8], [15, 9], [16, 8], [16, 9], [11, 6], [12, 6], [13, 6]]) {
      if (houseDesirability(w, home) >= TIERS[6].desirability.rise) break;
      addRaw(w, 'statue', x, y);
    }
  }
  return { w, home, bazaar };
}

// The advice tests' tier-4 street: pottery is its next need, nothing makes or keeps it.
function pottery({ milestone = 'town' } = {}) {
  const { w, home } = street({ tier: 4, milestone, homeAt: [12, 11], stock: { grain: 30 } });
  addRaw(w, 'well', 14, 9);
  addRaw(w, 'temple', 20, 8);
  const bazaar = addRaw(w, 'bazaar', 9, 8);
  staffAll(w);
  return { w, home, bazaar };
}

// Every needCause code, each a world where it is the first unmet row's cause: { code, make() -> { w, home, ... }, text(w, home, ctx), action, after(w, home, ctx) }.
// `text` says the line from the sim's numbers; `action` is the button's label or null; `after` changes the city so the cause goes away.
const CAUSES = [
  { code: 'no_road', make: () => street({ tier: 2, homeAt: [12, 5] }),
    text: (w) => `Next step: a road beside this home (${gold(roadCostOf(w))} a tile) gives it road access`, action: T.showMe, after: (w) => setRoad(w, 12, 6, 12, 10) },
  { code: 'no_well', make: () => street(),
    text: (w) => `Next step: a well near here (${gold(costOf(w, 'well'))}) gives this home water`, action: T.showMe, after: (w) => { addRaw(w, 'well', 14, 11); staffAll(w); } },
  { code: 'no_bazaar', make: () => { const r = street(); addRaw(r.w, 'well', 14, 11); staffAll(r.w); return r; },
    text: (w) => `Next step: a bazaar near here (${gold(costOf(w, 'bazaar'))}) gives this home food`, action: T.showMe, after: (w) => { addRaw(w, 'bazaar', 9, 11); staffAll(w); } },
  { code: 'bazaar_empty', make: () => { const r = street(); addRaw(r.w, 'well', 14, 11); addRaw(r.w, 'bazaar', 9, 11); staffAll(r.w); return r; },
    text: (w) => `Next step: a granary near the bazaar (${gold(costOf(w, 'granary'))}) gives this home food`, action: T.showMe, after: (w) => { addRaw(w, 'granary', 4, 11); staffAll(w); } },
  { code: 'granary_empty', make: () => { const r = street(); addRaw(r.w, 'well', 14, 11); addRaw(r.w, 'bazaar', 9, 11); r.granary = addRaw(r.w, 'granary', 4, 11); staffAll(r.w); return r; },
    text: (w) => `Next step: a grain farm near the granary (${gold(costOf(w, 'farm_grain'))}) gives this home food`, action: T.showMe, after: (w, h, r) => { r.granary.store.grain = 50; } },
  { code: 'no_temple', make: () => { const r = street({ tier: 3, stock: { grain: 30 } }); addRaw(r.w, 'well', 14, 11); const b = addRaw(r.w, 'bazaar', 9, 11); b.store.grain = 40; staffAll(r.w); return r; },
    text: (w) => `Next step: a temple near here (${gold(costOf(w, 'temple'))}) gives this home a temple in reach`, action: T.showMe, after: (w) => { addRaw(w, 'temple', 20, 11); staffAll(w); } },
  { code: 'no_booth', make: () => townhouse(),
    text: (w) => `Next step: a booth near here (${gold(costOf(w, 'booth'))}) gives this home entertainment`, action: T.showMe, after: (w) => { addRaw(w, 'booth', 16, 11); staffAll(w); } },
  { code: 'low_desirability', make: () => townhouse({ booth: true }),
    // Version 5.0 (Task 7): the decoration that lifts the street most, beside the home (a sphinx at Capital; tests/v50/grand prove the pick), with the score before and after.
    text: (w) => `Next step: a sphinx beside this home (${gold(costOf(w, 'sphinx'))}) raises its desirability from −1 to 9 (it needs ${TIERS[6].desirability.rise})`, action: T.showMe, after: (w, h) => { for (let i = 0; i < 12 && houseDesirability(w, h) < TIERS[6].desirability.rise; i++) addRaw(w, 'statue', 8 + i, 8); } },
  { code: 'no_square', make: () => townhouse({ booth: true, statues: true }),
    text: (w) => `Next step: house plots beside this home (${gold(costOf(w, 'house'))} a plot) give it room to become a ${TIERS[6].name}`, action: T.showMe,
    after: (w, h) => { for (const [x, y] of [[13, 9], [12, 8], [13, 8]]) addRaw(w, 'house', x, y, { tier: 0 }); } },
  { code: 'no_good', make: () => pottery(),
    text: (w, h, r) => `Next step: a storehouse near the bazaar (${gold(costOf(w, 'storehouse'))}) gives this home pottery`, action: T.showMe, after: (w) => { addRaw(w, 'storehouse', 4, 8, { store: { pottery: 40 } }); staffAll(w); } },
  { code: 'good_unmade', make: () => { const r = pottery(); addRaw(r.w, 'storehouse', 4, 8); staffAll(r.w); return r; },
    text: (w) => `Next step: a clay pit on clay ground (${gold(costOf(w, 'clay_pit'))}) starts pottery for this home`, action: T.showMe, after: (w) => { Object.values(w.buildings).find((b) => b.type === 'storehouse').store.pottery = 40; } },
  { code: 'good_far', make: () => { const r = pottery(); addRaw(r.w, 'storehouse', 4, 8); r.far = addRaw(r.w, 'storehouse', 31, 8, { store: { pottery: 40 } }); staffAll(r.w); setRoad(r.w, 30, 10, 31, 10); return r; },
    text: (w, h, r) => `Next step: have the storehouse near the bazaar fetch pottery by cart (it is held ${nextStep(w, h).cause.len} road tiles from the bazaar)`, action: T.showMe, after: (w, h, r) => { r.far.store.pottery = 0; Object.values(w.buildings).find((b) => b.type === 'storehouse').store.pottery = 40; } },
];

describe('v50 step: every cause code, the line and the same city with the cause gone', () => {
  for (const c of CAUSES) {
    it(`${c.code}: the line names the fix, its place and its price from the sim; once fixed it says something else`, () => {
      const r = c.make();
      const { w, home } = r;
      const l = lineOf(w, home);
      expect(code(l)).toBe(c.code);
      expect(l.words.text).toBe(c.text(w, home, r));
      expect(l.words.label).toBe(STEP_LABELS.next);
      expect(l.words.action && l.words.action.label).toBe(c.action);
      expect(l.words.short).toBe(false);
      const target = l.words.action.build;
      if (target) {
        expect([target.item, target.category !== undefined]).toEqual([l.step.fix.item, true]);
        expect(Number.isFinite(target.x) && Number.isFinite(target.y)).toBe(true);
      } else expect(l.words.action.select).toBe(l.step.fix.select);
      c.after(w, home, r);
      const after = lineOf(w, home);
      expect(code(after) === c.code).toBe(false);
      expect(after.words.text === l.words.text).toBe(false);
    });
  }

  it('says when the treasury cannot pay: the price is followed by how much it has, in words', () => {
    const { w, home } = street();
    w.gold = -480;                                                         // the placing rule's debt floor: a well costs more than it will take
    const l = lineOf(w, home);
    expect([l.step.afford, l.words.short]).toEqual([false, true]);
    expect(l.words.text).toBe(`Next step: a well near here (${gold(costOf(w, 'well'))}, more than the -480 you have) gives this home water`);
    w.gold = 100000;
    expect(lineOf(w, home).words.short).toBe(false);
  });
});

describe('v50 step: the providers in reach that do not serve the home are viewed, not rebuilt', () => {
  const viewOf = (type) => viewLabel(buildingName(type));
  it('a paused or understaffed well, bazaar, temple or granary: View on that building, with what is wrong', () => {
    const cases = [
      ['well', 'well_idle', () => { const r = street(); r.b = addRaw(r.w, 'well', 14, 11); return r; }],
      ['bazaar', 'bazaar_idle', () => { const r = street(); addRaw(r.w, 'well', 14, 11); staffAll(r.w); r.b = addRaw(r.w, 'bazaar', 9, 11); return r; }],
      ['temple', 'temple_idle', () => { const r = street({ tier: 3, stock: { grain: 30 } }); addRaw(r.w, 'well', 14, 11); const bz = addRaw(r.w, 'bazaar', 9, 11); bz.store.grain = 40; staffAll(r.w); r.b = addRaw(r.w, 'temple', 20, 11); r.b.staff = 0; return r; }],
      ['granary', 'granary_idle', () => { const r = street(); addRaw(r.w, 'well', 14, 11); addRaw(r.w, 'bazaar', 9, 11); r.b = addRaw(r.w, 'granary', 4, 11); staffAll(r.w); r.b.staff = 0; return r; }],
    ];
    for (const [type, cause, make] of cases) {
      const r = make();
      let l;
      if (BUILDINGS[type].workers > 0) {                                   // a building with a crew can be short of it (a well has none to be short of)
        r.b.staff = 0;
        l = lineOf(r.w, r.home);
        expect([type, code(l)]).toEqual([type, cause]);
        expect(l.words.text).toBe(`Next step: the ${type} in reach is short of workers (more homes bring more workers)`);
        expect(l.words.action).toEqual({ label: T.view, aria: viewOf(type), select: r.b.id });
      }
      r.b.staff = BUILDINGS[type].workers; r.b.paused = true;              // paused, with its workers
      l = lineOf(r.w, r.home);
      expect([type, code(l)]).toEqual([type, cause]);
      expect(l.words.action).toEqual({ label: T.view, aria: viewOf(type), select: r.b.id });
      expect(l.words.text).toBe(`Next step: resume the ${type} in reach (it is paused)`);
      expect(l.words.action.select).toBe(r.b.id);
      r.b.paused = false;                                                  // working again: the cause is gone
      l = lineOf(r.w, r.home);
      expect(l.words.text === `Next step: resume the ${type} in reach (it is paused)`).toBe(false);
    }
  });

  it('a well, bazaar or temple beside the home with no road: lay one beside it, View on it', () => {
    const { w, home } = street({ tier: 3 });
    const well = addRaw(w, 'well', 12, 7);                                 // above the home, nothing beside it but sand
    let l = lineOf(w, home);
    expect([code(l), l.words.text, l.words.action.select]).toEqual(['well_no_road', 'Next step: lay a road beside the well', well.id]);
    addRaw(w, 'well', 15, 11);
    staffAll(w);
    const bazaar = addRaw(w, 'bazaar', 14, 6);
    l = lineOf(w, home);
    expect([code(l), l.words.text, l.words.action.select]).toEqual(['bazaar_no_road', 'Next step: lay a road beside the bazaar', bazaar.id]);
    const bz2 = addRaw(w, 'bazaar', 9, 11);                                // a bazaar on the street, with grain: the food is on its way
    bz2.store.grain = 40;
    home.stock = { grain: 30 };                                            // and the home has its own: only the temple is missing
    staffAll(w);
    const temple = addRaw(w, 'temple', 9, 6);
    l = lineOf(w, home);
    expect([code(l), l.words.text, l.words.action.select]).toEqual(['temple_no_road', 'Next step: lay a road beside the temple', temple.id]);
    setRoad(w, 11, 6, 11, 9);                                              // a spur beside the temple, joining the street
    expect(code(lineOf(w, home)) === 'temple_no_road').toBe(false);
  });

  it('a booth that is idle or has no road, at a Townhouse that is otherwise ready', () => {
    const { w, home } = townhouse();
    const booth = addRaw(w, 'booth', 16, 11);
    booth.staff = 0;
    let l = lineOf(w, home);
    expect([code(l), l.words.text, l.words.action.select]).toEqual(['booth_idle', 'Next step: the booth in reach is short of workers (more homes bring more workers)', booth.id]);
    booth.staff = 1;
    booth.paused = true;
    l = lineOf(w, home);
    expect([code(l), l.words.text]).toEqual(['booth_idle', 'Next step: resume the booth in reach (it is paused)']);
    const { w: w2, home: home2 } = townhouse();
    const roadless = addRaw(w2, 'booth', 12, 7);
    l = lineOf(w2, home2);
    expect([code(l), l.words.text, l.words.action.select]).toEqual(['booth_no_road', 'Next step: lay a road beside the booth', roadless.id]);
  });
});
