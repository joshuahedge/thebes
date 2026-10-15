// Version 5.0 Task 2: the two Task 1 review minors. (1) Opening the advice sheet reads the advice afresh for the button too, so the dot never compares what the sheet
// just showed with keys cached days ago. (2) A fix whose words name two makers prices both (the sum of costOf), or names only what is priced: the advice sheet
// names the makers the city lacks and prices all of them; the house sheet's next step names only the first maker, which is the one priced.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { cityAdvice, nextStep } from '../../../src/sim/advice.js';
import { adviceWords, ADVICE_TEXT } from '../../../src/ui/adviceText.js';
import { stepWords } from '../../../src/ui/nextStepText.js';
import { costOf } from '../../../src/sim/costs.js';
import { canAfford } from '../../../src/sim/money.js';
import { TIERS } from '../../../src/data/housing.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { T } from '../../../src/ui/text.js';

const click = (n) => fire(n, 'click');

// The advice tests' street: a road along y = 10, a well, temple and bazaar in reach of a tier-4 House that has its food; its next tier asks for pottery.
function street({ milestone = 'town', clay = [] } = {}) {
  const w = makeTestWorld({ size: 64, clay });
  w.milestone = milestone;
  setRoad(w, 0, 10, 63, 10);
  addRaw(w, 'well', 14, 9);
  addRaw(w, 'temple', 20, 8);
  const bazaar = addRaw(w, 'bazaar', 9, 8);
  const home = addRaw(w, 'house', 12, 11, { tier: 4, residents: TIERS[4].capacity, stockedFor: TIERS[4].capacity, stock: { grain: 30 } });
  addRaw(w, 'storehouse', 4, 8);                   // a store in the bazaar's reach, holding nothing: pottery is unmade
  staffAll(w);
  return { w, home, bazaar };
}

describe('v50 step review: the advice dot after the sheet opens', () => {
  it('reads the advice again when the sheet opens, so a problem that came and went between two reads never lights the dot after closing', async () => {
    const { w, home } = street();
    home.tier = 3; home.residents = TIERS[3].capacity; home.stockedFor = TIERS[3].capacity;
    w.speed = 0;
    const r = await rigUI({ world: w });
    try {
      const btn = r.root.querySelector('#topbar .advice'), dot = () => !btn.querySelector('.advice-dot').hidden;
      r.ui.settings.set({ adviceSeen: [] });
      home.risk = 100000;                                                              // fire risk: the cache reads it at this command
      r.ui.afterCommand({ kind: 'speed', undoable: false });
      expect(cityAdvice(w).map((a) => a.kind)).toEqual(['fire']);
      expect(dot()).toBe(true);
      home.risk = 0;                                                                   // the fire is out; with no command and the same day the cache still says fire
      w.milestone = 'town';
      w.labour = { workforce: 100, employed: 50, jobs: 50, shortLevels: [] };          // ...and the city now has joblessness instead
      expect(cityAdvice(w).map((a) => a.kind)).toEqual(['jobless']);
      click(btn);                                                                      // the sheet opens: it shows jobless and marks it seen
      expect(r.ui.settings.get().adviceSeen).toEqual(['jobless']);
      click(btn);                                                                      // closed again
      expect(r.store.get().sheet).toBe(null);
      r.ui.refresh();
      expect([dot(), btn.getAttribute('aria-label')]).toEqual([false, T.advice]);       // before the fix: the cached 'fire' was not in seen, so the dot came back
      home.crime = 0;
      w.labour = { workforce: 100, employed: 100, jobs: 100, shortLevels: [] };        // a later change still lights it as before (a command reads again)
      home.risk = 100000;
      r.ui.afterCommand({ kind: 'speed', undoable: false });
      expect(dot()).toBe(true);
    } finally { r.cleanup(); }
  });
});

describe('v50 step review: a fix names what it prices', () => {
  it('the advice sheet: pottery with no clay pit and no potter names both and prices the sum; with the pit built, the potter alone at its own price', () => {
    const { w } = street({ clay: [[40, 20, 4, 4]] });
    w.gold = 100000;
    const a = cityAdvice(w).find((x) => x.kind === 'home_need' && x.data.need === 'pottery');
    expect([a.data.cause.code, a.fix.item]).toEqual(['good_unmade', 'clay_pit']);
    let t = adviceWords(a, w);
    expect(t.fix).toBe('Make pottery near it: a clay pit and a potter');
    expect(t.cost).toBe(ADVICE_TEXT.cost('Clay pit and potter', costOf(w, 'clay_pit') + costOf(w, 'potter')));
    expect(t.short).toBe(false);
    w.gold = ECONOMY.debtFloor + costOf(w, 'clay_pit') + costOf(w, 'potter') - 1;       // the placing rule's floor: enough for either, not for both
    expect(canAfford(w, costOf(w, 'clay_pit'))).toBe(true);
    const b = cityAdvice(w).find((x) => x.kind === 'home_need' && x.data.need === 'pottery');
    t = adviceWords(b, w);
    expect(t.short).toBe(true);
    expect(t.cost).toBe(ADVICE_TEXT.short(ADVICE_TEXT.cost('Clay pit and potter', costOf(w, 'clay_pit') + costOf(w, 'potter')), w.gold));
    w.gold = 100000;
    addRaw(w, 'clay_pit', 40, 20);
    staffAll(w);
    const c = cityAdvice(w).find((x) => x.kind === 'home_need' && x.data.need === 'pottery');
    t = adviceWords(c, w);
    expect([c.fix.item, t.fix, t.cost]).toEqual(['potter', 'Make pottery near it: a potter', ADVICE_TEXT.cost('Potter', costOf(w, 'potter'))]);
    addRaw(w, 'potter', 30, 20);
    staffAll(w);
    const d = cityAdvice(w).find((x) => x.kind === 'home_need' && x.data.need === 'pottery');
    t = adviceWords(d, w);
    expect([d.fix.item, t.fix, t.cost]).toEqual(['potter', 'Make pottery near it: another potter', ADVICE_TEXT.cost('Potter', costOf(w, 'potter'))]);   // both stand: the last again
  });

  it('the house sheet\'s next step names only the first maker, which is the one priced and the one Show me starts', () => {
    const { w, home } = street({ clay: [[40, 20, 4, 4]] });
    let step = nextStep(w, home);
    expect([step.cause.code, step.fix.item, step.cost]).toEqual(['good_unmade', 'clay_pit', costOf(w, 'clay_pit')]);
    let words = stepWords(w, home, step);
    expect(words.text).toBe(`Next step: a clay pit on clay ground (${costOf(w, 'clay_pit')} gold) starts pottery for this home`);
    expect(/\bpotter\b/.test(words.text)).toBe(false);                                // the potter comes after the pit: not named, not priced
    addRaw(w, 'clay_pit', 40, 20);
    staffAll(w);
    step = nextStep(w, home);
    words = stepWords(w, home, step);
    expect([step.fix.item, words.text]).toEqual(['potter', `Next step: a potter near the bazaar (${costOf(w, 'potter')} gold) gives this home pottery`]);
    expect(words.action.build.item).toBe('potter');
  });
});
