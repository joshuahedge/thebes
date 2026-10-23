// Version 6.0, Track A's interface (rulings 644-658): the demand sheet (offered: the reward, the failure cost and the refusal cost before
// Accept; accepted: Send or what to build, with why not), the court sheet's due and demand, the great work's sheet, the closing scene in a sheet,
// the advice's words, on the real shell. Every number on a sheet is the sim's own: the tests change the world and read the words again.
import { describe, it, expect } from '../../harness.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { addRaw } from '../../helpers/testWorld.js';
import { openSheet } from '../../../src/ui/modes.js';
import { courtDay, stockOf } from '../../../src/sim/court.js';
import { courtDue } from '../../../src/sim/pressure.js';
import { demandFavour, courtDemands, demandDay } from '../../../src/sim/demands.js';
import { offeringOf } from '../../../src/sim/monuments.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { V60_REIGN_TEXT as R, V60_HELP, TIP_TEXT, TIP_HELP_TEXT, ALERT_TEXT } from '../../../src/ui/text.js';
import { COURT } from '../../../src/data/court.js';
import { DEMANDS, GREAT_WORK, REIGN_TIPS } from '../../../src/data/reign.js';
import { QUOTA } from '../../../src/data/s47.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';

const MONTH = DAYS_PER_MONTH, YEAR = 12 * MONTH;
// A Capital whose court is open, with 200 pottery in store and one demand for pottery offered.
function city({ amount = 150, accept = false } = {}) {
  const w = uiWorld();
  w.gold = 20000;
  w.speed = 0;
  addRaw(w, 'storehouse', 18, 11, { store: { pottery: 200 } });
  w.milestone = 'capital';
  w.goals.completed.push(COURT.afterGoal);
  w.day = (QUOTA.fromYear - 2) * YEAR + 6 * MONTH;
  courtDay(w);
  w.court.guided = 'answered';
  w.court.favour = 50;
  w.demands.nextDay = w.day + YEAR;
  w.demands.open.push({ id: w.demands.nextId++, kind: 'goods', good: 'pottery', type: null, amount, reward: 900, day: w.day, accepted: accept, offerDue: w.day + 3 * MONTH, due: w.day + (accept ? 9 : 3) * MONTH, months: 9, met: 11, failed: 17, declined: DEMANDS.favour.declined, had: null });
  return w;
}
const rigs = [];
async function rig(world) { const r = await rigUI({ world }); rigs.push(r); r.ui.refresh(); return r; }
const sweep = () => { while (rigs.length) rigs.pop().cleanup(); };
const test = (name, fn) => it(name, async () => { try { await fn(); } finally { sweep(); } });
const sheet = (r) => r.root.querySelector('#sheet');
const open = (r, kind) => { r.store.set(openSheet(r.store.get(), kind)); };
const click = (r, sel) => { const b = sheet(r).querySelector(sel); fire(b, 'click'); };

describe('v60 a ui: the demand sheet', () => {
  test('says the reward, the failure cost and the refusal cost before Accept, each from the record, and Accept starts the deadline', async () => {
    const r = await rig(city());
    open(r, 'demand');
    const d = courtDemands(r.world)[0], f = demandFavour(r.world, d);
    const text = sheet(r).textContent;
    expect(text).toContain(R.demandTitle(d));
    expect(text).toContain('150 pottery');
    for (const s of [R.answerBy(3), R.deadlineIf(d), R.reward(d, f), R.failed(f), R.declined(f)]) expect([s, text.includes(s)]).toEqual([s, true]);
    expect(text).toContain('favour +11 and 900 gold');
    expect(text).toContain('favour −17');
    expect(text).toContain(`favour −${DEMANDS.favour.declined}`);
    const accept = sheet(r).querySelector('.accept button');
    expect(accept.textContent).toBe(R.accept);
    expect(accept.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    fire(accept, 'click');
    expect(r.world.demands.open[0].accepted).toBe(true);
    expect(r.world.demands.open[0].due).toBe(r.world.day + 9 * MONTH);
    expect(sheet(r).textContent).toContain(R.dueIn(courtDemands(r.world)[0]));
  });

  test('offers Send once accepted, off with why while the stores hold less, on when they hold it; Send takes the goods and pays', async () => {
    const r = await rig(city({ amount: 300, accept: true }));
    open(r, 'demand');
    const send = () => sheet(r).querySelector('.send button');
    expect(send().disabled).toBe(true);
    expect(sheet(r).querySelector('.send .why-not').textContent).toBe('Your stores hold 200 of 300 pottery');
    r.world.demands.open[0].amount = 150;
    r.ui.refresh();
    expect(send().disabled).toBe(false);
    const gold = r.world.gold;
    fire(send(), 'click');
    expect([r.world.demands.open.length, stockOf(r.world, 'pottery'), r.world.demands.log[0].gold, r.world.tally.demandsMet]).toEqual([0, 50, 900, 1]);
    expect(r.world.gold).toBeGreaterThanOrEqual(gold + 900);                        // the reward (and any goal the answer finished)
  });

  test('declines from the sheet at the refusal cost it named', async () => {
    const r = await rig(city());
    open(r, 'demand');
    const before = r.world.court.favour;
    click(r, '.decline button');
    expect([r.world.demands.open.length, r.world.court.favour]).toEqual([0, before - DEMANDS.favour.declined]);
  });

  test('a building demand says what to build and has Show me, no Send', async () => {
    const w = city();
    w.demands.open[0] = { ...w.demands.open[0], kind: 'building', good: null, type: 'obelisk_large', amount: 1, accepted: true, had: 0, due: w.day + 12 * MONTH };
    const r = await rig(w);
    open(r, 'demand');
    expect(sheet(r).querySelector('.send')).toBe(null);
    expect(sheet(r).textContent).toContain(R.buildIt(courtDemands(r.world)[0]));
    expect(Boolean(sheet(r).querySelector('.build .show-me'))).toBe(true);
  });
});

describe('v60 a ui: the court sheet and the summary', () => {
  test('shows the court\'s due with the sim\'s figure, its rule and the rank\'s costs, and the demand with Open', async () => {
    const r = await rig(city());
    open(r, 'court');
    const due = courtDue(r.world);
    const text = sheet(r).textContent;
    expect(text).toContain(R.dueHead);
    expect(text).toContain(R.dueNow(due, QUOTA.fromYear));
    expect(text).toContain(R.dueRule(due));
    expect(text).toContain(R.demandTitle(courtDemands(r.world)[0]));
    r.world.gold = 10;                                                               // short: the sheet says it will go into debt
    r.ui.refresh();
    expect(sheet(r).textContent).toContain(R.dueShort(courtDue(r.world), 10));
    fire(sheet(r).querySelector('.open-demand'), 'click');
    expect(r.store.get().sheet.kind).toBe('demand');
  });

  test('lists the demand in the summary\'s court row with its Open button, and the reign\'s row from Capital', async () => {
    const r = await rig(city());
    open(r, 'summary');
    const text = sheet(r).textContent;
    expect(text).toContain(R.demandHead);
    expect(text).toContain(R.reignHead);
    expect(text).toContain('Next: Great Capital');
    fire(sheet(r).querySelector('.open-great-work'), 'click');
    expect(r.store.get().sheet.kind).toBe('greatWork');
  });
});

describe('v60 a ui: the great work and the closing scene', () => {
  test('tells a Capital the great temple comes with the Seat, and the Seat what it costs, its five offerings and Found it', async () => {
    const r = await rig(city());
    open(r, 'greatWork');
    expect(sheet(r).textContent).toContain(R.greatLocked);
    r.world.milestone = 'seat';
    r.ui.refresh();
    const text = sheet(r).textContent;
    expect(text).toContain(R.greatReady);
    for (let i = 0; i < GREAT_WORK.stages.length; i++) { const o = offeringOf(r.world, i); expect([i, text.includes(`${o.n} ${o.good}`)]).toEqual([i, true]); }
    expect(Boolean(sheet(r).querySelector('.found'))).toBe(true);
  });

  test('shows the stage under way and the offering it waits for while the temple rises, from the sim', async () => {
    const w = city();
    w.milestone = 'seat';
    const gw = addRaw(w, GREAT_WORK.type, 20, 4);
    gw.site.course = 4;
    w.reign.greatWork = gw.id;
    w.reign.offered = 2;
    const r = await rig(w);
    open(r, 'greatWork');
    const text = sheet(r).textContent;
    expect(text).toContain('Stage 3 of 5');
    const o = offeringOf(w, 2);
    expect(text).toContain(R.offeringLine({ ...o, have: 0 }));
  });

  test('opens the closing scene in a sheet when the reign is won: the day, the sealed score, Play on; seen once', async () => {
    const w = city();
    w.milestone = 'seat';
    const gw = addRaw(w, GREAT_WORK.type, 20, 4);
    gw.site.course = MONUMENTS.great_temple.courses.length;
    gw.site.done = w.day;
    const events = [];
    demandDay(w, events);
    expect(w.reign.won).toBe(w.day);
    const r = await rig(w);
    r.ui.onEvents(events);
    expect(r.store.get().sheet.kind).toBe('reignWon');
    const text = sheet(r).textContent;
    expect(text).toContain(R.wonTitle);
    expect(text).toContain(R.wonSeal(w.reign.seal));
    expect(w.reign.closed).toBe(true);
    fire(sheet(r).querySelector('.play-on'), 'click');
    expect(r.store.get().sheet).toBe(null);
    r.ui.refresh();
    expect(r.store.get().sheet).toBe(null);                                           // seen: it does not come back
  });
});

describe('v60 a ui: advice, alerts, tips and How to play', () => {
  it('words a demand item from its record, the due from its figures, and the alerts', () => {
    const w = city();
    const d = courtDemands(w)[0];
    const item = { key: `demand:${d.id}`, kind: 'demand', weight: 12, count: 1, id: null, data: { demand: d.id, kind: d.kind, good: d.good, type: d.type, amount: d.amount, accepted: false, monthsLeft: 3 }, fix: null, cost: null, afford: null };
    expect(adviceWords(item, w).what).toBe(R.demandTitle(d));
    const due = { ...item, key: 'court_due', data: { due: true, gold: 9000, monthsLeft: 2, have: 400 } };
    expect(adviceWords(due, w).what).toBe("The court's due of 9,000 gold comes in 2 months");
    expect(ALERT_TEXT.court_due({ gold: 9000, months: 2, short: 8600 }).fix).toBe('It comes in 2 months: 8,600 short');
    expect(ALERT_TEXT.demand_due({ months: 1 }).title).toBe("The court's demand is due in 1 month");
  });

  it('has words for every tip of the track, short, and four How to play paragraphs', () => {
    for (const t of REIGN_TIPS) {
      expect([t.id, typeof TIP_TEXT[t.id], typeof TIP_HELP_TEXT[t.id]]).toEqual([t.id, 'string', 'string']);
      expect([t.id, TIP_TEXT[t.id].split(' ').length <= 20]).toEqual([t.id, true]);
    }
    expect(V60_HELP.a.map((h) => h.head)).toEqual(['Costs grow with the city', "The court's due", "The court's demands", 'The reign']);
  });
});
