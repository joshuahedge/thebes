// The Court track's interface tests (ruling 339): the letter in the alert row, the letter sheet (a request, a card), the summary's court
// row and the court sheet, on the real shell. Every number on a sheet is the sim's own: tests change the world and read the words again.
import { describe, it, expect } from '../../harness.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { addRaw } from '../../helpers/testWorld.js';
import { allBuildings } from '../../../src/sim/world.js';
import { openSheet } from '../../../src/ui/modes.js';
import { courtDay, courtMonth, addFavour, stockOf, cardChoices, favourBand, favourTributeFactor, favourRaidSize } from '../../../src/sim/court.js';
import { COURT, FAVOUR, REQUESTS } from '../../../src/data/court.js';
import { S46_COURT_TEXT as C, courtRuleLow, alertText } from '../../../src/ui/text.js';
import { createS46Seams } from '../../../src/ui/s46/index.js';
import { createCourtUi } from '../../../src/ui/s46/court.js';
import { COURT_SCENES } from '../../../src/dev/s46/court.js';
import { courtWorld, MONTH, YEAR } from './courtHelpers.js';

// A running city with the court open, favour 50 and an ordinary request of the given kind waiting (unread).
function courtCity({ kind = 'goods', amount = 60, good = 'pottery', guided = false } = {}) {
  const w = uiWorld();
  w.seed = 5;
  addRaw(w, 'storehouse', 18, 11, { store: { pottery: 200, gems: 40 } });
  for (const b of allBuildings(w)) if (b.type === 'granary') b.store = { grain: 300 };
  for (const b of allBuildings(w)) b.staff = 20;
  w.milestone = 'market_town';
  w.goals.completed.push(COURT.afterGoal);
  w.day = YEAR;
  w.speed = 0;
  courtDay(w);
  w.court.guided = guided ? 'issued' : 'answered';
  const id = w.court.nextId++;
  w.court.request = { id, kind, good: kind === 'gold' || kind === 'soldiers' ? null : good, amount, day: w.day, due: w.day + 8 * MONTH, gold: 120, met: 12, missed: 15, guided };
  w.court.letters.push({ id, kind: 'request', day: w.day, read: false });
  return w;
}
// Every rig is registered so a test that fails midway does not leave its shell mounted (the next test would draw into it).
const rigs = [];
async function track(r) { rigs.push(r); const done = r.cleanup; r.cleanup = () => { const i = rigs.indexOf(r); if (i >= 0) rigs.splice(i, 1); done(); }; return r; }
async function rig(opts = {}, rigOpts = {}) {
  const world = courtCity(opts);
  const r = await track(await rigUI({ world, ...rigOpts }));
  r.ui.refresh();
  return r;
}
const sweep = () => { for (const r of [...rigs]) r.cleanup(); };
const test = (name, fn) => it(name, async () => { try { await fn(); } finally { sweep(); } });
const sheetText = (r) => r.root.querySelector('#sheet').textContent;
const open = (r, kind) => { r.store.set(openSheet(r.store.get(), kind)); };

describe('s46 court ui: the alert row', () => {
  test('shows a letter from the court with its deadline in game months, and its View opens the letter, not the summary', async () => {
    const r = await rig();
    const row = r.root.querySelector('#banner .critical[data-code="court_letter"]');
    expect(Boolean(row)).toBe(true);
    expect(row.textContent).toContain('Court: 60 pottery in 8 months');
    r.world.day += 3 * MONTH;
    r.ui.refresh();
    expect(r.root.querySelector('#banner .critical').textContent).toContain('in 5 months');
    fire(r.root.querySelector('#banner .view'), 'click');
    expect(r.store.get().sheet.kind).toBe('letter');
    expect(sheetText(r)).toContain('Send 60 pottery');
    r.cleanup();
  });
  test('stops raising a letter once it is read, and raises it again within two months of the deadline', async () => {
    const r = await rig();
    fire(r.root.querySelector('#banner .view'), 'click');
    await Promise.resolve();
    await Promise.resolve();
    expect(r.root.querySelector('#banner .critical[data-code="court_letter"]')).toBe(null);
    expect(r.world.tally.lettersRead).toBe(1);
    r.world.day = r.world.court.request.due - 2 * MONTH;
    r.ui.refresh();
    const row = r.root.querySelector('#banner .critical[data-code="court_letter"]');
    expect(row.textContent).toContain(C.alertDue(r.world.court.request, 2));
    r.cleanup();
  });
  test('words a card letter by its title and the alert list by the same words', async () => {
    const w = courtCity();
    w.court.request = null;
    w.court.letters = [{ id: 40, kind: 'card', card: 'festival', day: w.day, read: false, args: {} }];
    const r = await track(await rigUI({ world: w }));
    r.ui.refresh();
    expect(r.root.querySelector('#banner .critical').textContent).toContain('Court: a festival for the capital');
    expect(alertText({ code: 'court_letter', letter: 40, count: 2 }, w).title).toBe('Court: a festival for the capital (+1 more)');
    r.cleanup();
  });
});

describe('s46 court ui: a request letter', () => {
  test('states the ask, the deadline, the reward and the cost of refusing, and what sending does, all from the sim', async () => {
    const r = await rig();
    open(r, 'letter');
    const q = r.world.court.request;
    const t = sheetText(r);
    for (const s of [C.requestTitle(q), C.deadlineText(q, 8), C.rewardText(q, r.world), C.refusedText(q, r.world), C.haveText(q, { have: 200 }), C.sendConsequence(q, r.world), C.refuseLabel(q, r.world), C.refuseConsequence(q, r.world)]) expect([s, t.includes(s)]).toEqual([s, true]);
    expect(r.root.querySelector('#sheet h2').textContent).toBe('A letter from the court');
    // Change the world: more asked, a different good, a nearer deadline: the sheet follows.
    q.amount = 90; q.good = 'gems'; q.met = 14; q.gold = 300;
    r.world.day += 2 * MONTH;
    r.ui.refresh();
    const u = sheetText(r);
    expect(u).toContain('Send 90 gems');
    expect(u).toContain('Favour +14 and 300 gold');
    expect(u).toContain('(6 months left)');
    expect(u).toContain('90 gems leave the stores');
    r.cleanup();
  });
  test('sends what is asked: the stores lose it, favour and the reward arrive, the sheet closes and a caption says so', async () => {
    const r = await rig();
    open(r, 'letter');
    const q = r.world.court.request;
    const gold = r.world.gold, stock = stockOf(r.world, 'pottery');
    fire(r.root.querySelector('#sheet .court-choice.send button'), 'click');
    expect([stockOf(r.world, 'pottery'), r.world.court.favour, r.world.court.request, r.store.get().sheet]).toEqual([stock - 60, FAVOUR.start + q.met, null, null]);
    expect(r.world.gold).toBeGreaterThanOrEqual(gold + q.gold);                  // the reward, and any goal the answer finished
    expect(r.root.querySelector('#cheer').textContent).toContain('Sent 60 pottery to the court');
    expect(r.root.querySelector('#banner .critical')).toBe(null);
    r.cleanup();
  });
  test('turns Send off and says why in one line when the stores hold too little, and on again when they do', async () => {
    const r = await rig({ amount: 260 });
    open(r, 'letter');
    const send = () => r.root.querySelector('#sheet .court-choice.send button');
    expect(send().disabled).toBe(true);
    expect(r.root.querySelector('#sheet .court-choice.send .why-not').textContent).toBe('Needs 260 pottery, and the stores hold 200');
    for (const b of allBuildings(r.world)) if (b.type === 'storehouse') b.store.pottery = 260;
    r.ui.refresh();
    expect(send().disabled).toBe(false);
    expect(r.root.querySelector('#sheet .court-choice.send .why-not')).toBe(null);
    r.cleanup();
  });
  test('asks for gold from the treasury and for units, and says why units cannot go during a raid', async () => {
    const g = await rig({ kind: 'gold', amount: 400 });
    open(g, 'letter');
    expect(sheetText(g)).toContain('Send 400 gold');
    expect(sheetText(g)).toContain('400 gold leave the treasury');
    g.world.gold = 399;
    g.ui.refresh();
    expect(g.root.querySelector('#sheet .court-choice.send button').disabled).toBe(true);
    expect(g.root.querySelector('#sheet .court-choice.send .why-not').textContent).toBe('Needs 400 gold, and the treasury holds 399');
    g.cleanup();
    const s = await rig({ kind: 'soldiers', amount: 2 });
    open(s, 'letter');
    expect(sheetText(s)).toContain('Lend 2 trained units');
    expect(sheetText(s)).toContain(C.soldiersNote);
    expect(s.root.querySelector('#sheet .court-choice.send .why-not').textContent).toBe('0 trained units are at home, and this needs 2');
    expect(C.problem('raid', { have: 5, need: 2 }, s.world)).toBe('Units cannot leave while a raid is under way');   // requestStatus gives 'raid' while one is active (courtSim)
    s.cleanup();
  });
  test('refuses at the cost the letter named, and Decide later closes the sheet and keeps the letter', async () => {
    const r = await rig();
    open(r, 'letter');
    fire(r.root.querySelector('#sheet .later'), 'click');
    expect([r.store.get().sheet, r.world.court.letters.length, r.world.court.request.id]).toEqual([null, 1, r.world.court.request.id]);
    open(r, 'letter');
    fire(r.root.querySelector('#sheet .court-choice.refuse button'), 'click');
    expect([r.world.court.favour, r.world.court.request, r.world.court.letters.length, r.world.tally.requestsMissed]).toEqual([FAVOUR.start - 15, null, 0, 1]);
    expect(r.root.querySelector('#cheer').textContent).toContain('Refused');
    r.cleanup();
  });
  test('words a change of favour as it will really happen at both ends of 0..100, and does that (ruling 376)', async () => {
    const r = await rig();
    r.world.court.favour = 95;
    open(r, 'letter');
    const q = r.world.court.request;                                               // met 12, missed 15
    expect(C.sendConsequence(q, r.world)).toContain('Favour +5 (to 100)');
    expect(sheetText(r)).toContain('Favour +5 (to 100) and 120 gold');
    expect(sheetText(r).includes('Favour +12')).toBe(false);
    r.world.court.favour = 100;
    r.ui.refresh();
    expect(sheetText(r)).toContain('Favour stays at 100');
    r.world.court.favour = 5;
    r.ui.refresh();
    expect(C.refuseConsequence(q, r.world)).toBe('Favour −5 (to 0). The request is closed.');
    expect(r.root.querySelector('#sheet .court-choice.refuse button').textContent).toBe('Refuse (favour −5)');
    fire(r.root.querySelector('#sheet .court-choice.refuse button'), 'click');
    expect(r.world.court.favour).toBe(0);
    expect(r.root.querySelector('#cheer').textContent).toContain('favour −5');
    // A card's favour line follows the same rule.
    const w = courtCity();
    w.court.favour = 2;
    expect(C.effect({ kind: 'favour', n: -3 }, w)).toBe('Favour −2 (to 0)');
    expect(C.effect({ kind: 'favour', n: 8 }, w)).toBe('Favour +8');
    w.court.favour = 0;
    expect(C.effect({ kind: 'favour', n: -3 }, w)).toBe('Favour stays at 0');
    r.cleanup();
  });
  test('says the first letter is small and easy, and the goal waits for it', async () => {
    const r = await rig({ guided: true });
    open(r, 'letter');
    expect(sheetText(r)).toContain(C.guidedNote);
    r.cleanup();
  });
  test('has buttons of at least 44 px with names, and nothing but the sheet over the map', async () => {
    const r = await rig();
    open(r, 'letter');
    for (const b of r.root.querySelectorAll('#sheet .body button')) {
      expect([b.textContent, b.getBoundingClientRect().height >= 43.5]).toEqual([b.textContent, true]);
      expect(Boolean(b.textContent.trim() || b.getAttribute('aria-label'))).toBe(true);
    }
    expect(r.root.querySelectorAll('#sheet').length).toBe(1);
    r.cleanup();
  });
  test('offers View on the store it names', async () => {
    const r = await rig();
    open(r, 'letter');
    const view = r.root.querySelector('#sheet .letter-foot .view');
    expect(Boolean(view)).toBe(true);
    fire(view, 'click');
    expect(r.store.get().sheet.kind).toBe('info');
    r.cleanup();
  });
});

describe('s46 court ui: a card letter', () => {
  const cardCity = async (card, args, tweak = () => {}) => {
    const w = courtCity();
    w.court.request = null;
    w.court.letters = [{ id: 41, kind: 'card', card, day: w.day, read: false, args }];
    tweak(w);
    const r = await track(await rigUI({ world: w }));
    r.ui.refresh();
    open(r, 'letter');
    return r;
  };
  test('lists two choices, each with its exact effect from the sim, and does what it says', async () => {
    const r = await cardCity('temple_gift', { good: 'grain', n: 100 });
    const choices = r.root.querySelectorAll('#sheet .court-choice');
    expect(choices.length).toBe(2);
    const letter = r.world.court.letters[0];
    const sim = cardChoices(r.world, letter);
    expect(choices[0].textContent).toContain(C.choiceLabel('temple_gift', 'donate'));
    expect(choices[0].textContent).toContain(C.consequence(sim[0].effects, r.world));
    expect(choices[0].textContent).toContain('100 grain leave the stores. Favour +8.');
    expect(choices[1].textContent).toContain('Nothing changes.');
    fire(choices[0].querySelector('button'), 'click');
    expect([stockOf(r.world, 'grain'), r.world.court.favour, r.world.court.letters.length, r.world.court.cards[0].choice]).toEqual([200, 58, 0, 'donate']);
    expect(r.root.querySelector('#cheer').textContent).toContain('An offering for the temple: donate the goods');
    r.cleanup();
  });
  test('turns a choice off with the sim\'s reason, leaving the other one live', async () => {
    const r = await cardCity('festival', {}, (w) => { w.gold = 50; });
    const [hold, decline] = r.root.querySelectorAll('#sheet .court-choice');
    expect(hold.querySelector('button').disabled).toBe(true);
    expect(/^Needs \d+ gold, and the treasury holds 50$/.test(hold.querySelector('.why-not').textContent)).toBe(true);
    expect(decline.querySelector('button').disabled).toBe(false);
    expect(decline.textContent).toContain('Favour −3');
    r.cleanup();
  });
  test('words the sickness card from the homes that are ill, and the dispute from the workshop', async () => {
    const r = await cardCity('craftsmen_dispute', { id: 0 }, (w) => { const shop = addRaw(w, 'potter', 20, 11); shop.staff = 8; w.court.letters[0].args.id = shop.id; });
    expect(sheetText(r)).toContain('The craftsmen at the potter want better pay.');
    expect(sheetText(r)).toContain('The potter stops work for 1 month');
    expect(sheetText(r)).toContain('Wages rise:');
    r.cleanup();
  });
});

describe('s46 court ui: the summary and the court sheet', () => {
  test('shows favour with an icon, its number and words in the summary, and opens the letter and the court', async () => {
    const r = await rig();
    open(r, 'summary');
    const body = r.root.querySelector('#sheet .body');
    expect(body.textContent).toContain('The court');
    expect(body.textContent).toContain(`${C.favourMark.steady} 50 · ${C.band.steady}`);
    expect(body.textContent).toContain('1 letter waits for you.');
    fire(body.querySelector('.read-letter'), 'click');
    expect(r.store.get().sheet.kind).toBe('letter');
    open(r, 'summary');
    fire(r.root.querySelector('#sheet .court-actions .open-court'), 'click');
    expect(r.store.get().sheet.kind).toBe('court');
    r.cleanup();
  });
  test('is not in the summary before the court opens', async () => {
    const w = uiWorld();
    const r = await track(await rigUI({ world: w }));
    open(r, 'summary');
    expect(r.root.querySelector('#sheet .body').textContent.includes('The court')).toBe(false);
    open(r, 'court');
    expect(sheetText(r)).toContain(C.closed());
    r.cleanup();
  });
  test('states favour in all three bands with the number, the words and what each does, from the data', async () => {
    const r = await rig();
    for (const [f, band] of [[20, 'low'], [50, 'steady'], [80, 'high']]) {
      r.world.court.favour = f;
      open(r, 'court');
      const t = sheetText(r);
      expect([f, favourBand(r.world), t.includes(C.band[band]), t.includes(String(f)), t.includes(C.bandNow[band]), t.includes(C.drift)]).toEqual([f, band, true, true, true, true]);
      // The band in effect is stated once (bandNow); the other bands' rules follow.
      expect([band, t.includes(C.ruleHigh), t.includes(C.ruleLow)]).toEqual([band, band !== 'high', band !== 'low']);
      const meter = r.root.querySelector('#sheet .favour-meter');
      expect(meter.getAttribute('aria-valuenow')).toBe(String(f));
      expect(meter.getAttribute('aria-label')).toContain(C.band[band]);
    }
    r.cleanup();
  });
  test('says when the next gift is due and that it needs favour at 70 or more then, and the sim pays it just so (ruling 375)', async () => {
    const r = await rig();
    r.world.day = 2 * YEAR;
    open(r, 'court');
    expect(sheetText(r).includes('gift is due') || sheetText(r).includes('Next gift')).toBe(false);   // no clock yet
    r.world.court.favour = 60;
    addFavour(r.world, 12);
    r.ui.refresh();
    expect(sheetText(r)).toContain(`${C.nextGift(FAVOUR.giftEveryMonths)}.`);
    expect(C.nextGift(6)).toBe("Next gift due in 6 months: it comes at the first month's end from then with favour at 70 or more");
    for (let m = 1; m <= FAVOUR.giftEveryMonths; m++) { r.world.day += MONTH; courtMonth(r.world); }   // drift to 66 by the due month
    r.ui.refresh();
    expect([r.world.court.favour, r.world.tally.gifts, sheetText(r).includes(`${C.giftWaiting}.`)]).toEqual([66, 0, true]);
    r.world.court.favour = FAVOUR.high + 1;
    r.world.day += MONTH; courtMonth(r.world);
    r.ui.refresh();
    expect([r.world.tally.gifts, sheetText(r).includes(`${C.nextGift(FAVOUR.giftEveryMonths)}.`)]).toEqual([1, true]);
    r.cleanup();
  });
  test('words the tribute and raid effects of favour as the sim applies them, both ways', async () => {
    const r = await rig();
    r.world.court.favour = FAVOUR.high;
    expect(C.bandNow.high).toContain(`${Math.round((1 - favourTributeFactor(r.world)) * 100)}% less`);
    r.world.court.favour = FAVOUR.low;
    expect(C.bandNow.low).toContain(`${Math.round((favourTributeFactor(r.world) - 1) * 100)}% more`);
    expect([favourRaidSize(r.world, 8) > 8, C.bandNow.low.includes('one size step bigger')]).toEqual([true, true]);
    r.world.court.favour = FAVOUR.low + 1;
    expect([favourRaidSize(r.world, 8), favourTributeFactor(r.world)]).toEqual([8, 1]);
    open(r, 'court');
    expect(sheetText(r)).toContain(C.bandNow.steady);
  });
  test('words the low-favour raid rule from the data: the percentage and the one-raider minimum, tested against the sim with the step changed (ruling 384)', async () => {
    const r = await rig();
    r.world.court.favour = FAVOUR.low;
    const grown = (size, step) => size + Math.max(1, Math.round(size * step));
    expect(favourRaidSize(r.world, 8)).toBe(grown(8, FAVOUR.raidStep));
    expect(C.ruleLow).toContain(`${Math.round(FAVOUR.raidStep * 100)}% more, at least 1 raider`);
    const saved = FAVOUR.raidStep;
    try {
      for (const step of [0.5, 0.1]) {
        FAVOUR.raidStep = step;                                                   // retuned: the sim moves, and the words built from a copy of the data move with it
        expect([step, favourRaidSize(r.world, 8)]).toEqual([step, grown(8, step)]);
        expect(courtRuleLow({ ...FAVOUR })).toContain(`${Math.round(step * 100)}% more, at least 1 raider`);
      }
    } finally { FAVOUR.raidStep = saved; }
    open(r, 'court');
    expect(C.bandNow.low).toContain(`${Math.round(FAVOUR.raidStep * 100)}% more, at least 1 raider`);   // in the low band the rule is stated once, as what holds now
    expect(sheetText(r)).toContain(C.bandNow.low);
    r.world.court.favour = FAVOUR.low + 1;
    r.ui.refresh();
    expect(sheetText(r)).toContain(C.ruleLow);
  });
  test('keeps the letter on show when another arrives while the sheet is open, so a tap on Send never lands on a card', async () => {
    const r = await rig();
    open(r, 'letter');
    expect(sheetText(r)).toContain('Send 60 pottery');
    const id = r.world.court.nextId++;
    r.world.court.letters.push({ id, kind: 'card', card: 'flood_omen', day: r.world.day, read: false, args: {} });
    r.world.day += 1;
    r.ui.refresh();
    expect(sheetText(r)).toContain('Send 60 pottery');
    expect(r.root.querySelector('#sheet .letter').getAttribute('data-letter') === String(id)).toBe(false);
    fire(r.root.querySelector('#sheet .next-letter'), 'click');                  // the player asks for the next one: now it shows
    expect(r.root.querySelector('#sheet .letter').getAttribute('data-letter')).toBe(String(id));
    r.cleanup();
  });
  test('lists the letters waiting, the units away and the past letters, newest first', async () => {
    const r = await rig();
    r.world.court.log.push({ day: 100, kind: 'request', result: 'met', request: { kind: 'gold', good: null, amount: 150 }, favour: 12, gold: 40 });
    r.world.court.log.push({ day: 200, kind: 'gift', gold: 120, good: null, n: 0 });
    r.world.army.away.push({ id: 7, kind: 'soldier', barracks: 1, back: r.world.day + 100 });
    open(r, 'court');
    const t = sheetText(r);
    expect(t).toContain('Send 60 pottery, Year 2, month 1 (8 months left)'.replace('Year 2, month 1', C.deadlineText(r.world.court.request, 8).split(' (')[0]));
    expect(t.indexOf('A gift from the court: 120 gold')).toBeLessThan(t.indexOf('Sent 150 gold: favour +12, 40 gold'));
    expect(t).toContain(C.awayHead);
    r.cleanup();
  });
});

describe('s46 court ui: captions, words and the seam', () => {
  test('words what the court did as captions: missed, gift, a letter that is no longer needed', async () => {
    const r = await rig();
    const q = { kind: 'gold', good: null, amount: 200 };
    r.ui.onEvents([{ type: 'court_request', result: 'missed', request: q, favour: -12, gold: 0 }]);
    expect(r.root.querySelector('#cheer').textContent).toContain('passed its deadline: favour −12');
    r.ui.celebrations.clear();
    r.ui.onEvents([{ type: 'court_gift', gold: 120, good: null, n: 0 }]);
    expect(r.root.querySelector('#cheer').textContent).toContain('A gift from the court: 120 gold');
    r.ui.celebrations.clear();
    r.ui.onEvents([{ type: 'court_letter_gone', id: 3, card: 'sickness' }]);
    expect(r.root.querySelector('#cheer').textContent).toContain('no longer needed');
    r.cleanup();
  });
  test('makes an empty seam when there is no city, so the contract\'s empty-seam shape holds', () => {
    const seam = createS46Seams({})[2];
    expect([seam.sheets, seam.sheetParts.summary()]).toEqual([{}, []]);
  });
  test('fires the tip when a letter arrives', () => {
    const w = courtWorld({ open: true });
    const fired = [];
    const ui = createCourtUi({ world: w, fireTip: (t) => fired.push(t), celebrations: { show() {} }, store: {}, alerts: {} });
    ui.onEvents([{ type: 'court_letter', id: 1, kind: 'request', card: null }]);
    expect(fired).toEqual(['courtLetter']);
    ui.destroy();
  });
  test('registers the letter and court sheets and fills in the dev scene', () => {
    expect(Object.keys(COURT_SCENES)).toEqual(['s46-court-letter', 's46-court-card', 's46-court']);
    expect(typeof COURT_SCENES['s46-court-letter']).toBe('function');
  });
  test('has the tip, the first and the achievement worded, with the numbers from the data', () => {
    expect(C.ruleHigh).toContain(`${FAVOUR.high}`);
    expect(C.ruleLow).toContain(`${FAVOUR.low}`);
    expect(REQUESTS.met[0]).toBe(10);
  });
});
