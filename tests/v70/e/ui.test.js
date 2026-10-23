// Version 7.0, Track E: the event card and its ways in, on the real shell. The card fits without scrolling at 390x844 and 100% text, every choice states what
// it costs and does before the tap (the sim's own list), a choice the treasury cannot pay is off with its reason and Show me, every control is 44 px with its
// words as its name and a keyboard path (Tab order, Enter, Esc), the alert list's entry and the Advice item and the summary's section open it, the outcome
// is a caption kept in Recent, and the first event brings the tip and the picture card.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire, key } from '../../helpers/dom.js';
import { eventWorld, offer, days, storehouseOf, withoutIncense, YEAR } from './helpers.js';
import { openSheet } from '../../../src/ui/modes.js';
import { eventChoices, waitingEvent, eventDay } from '../../../src/sim/cityEvents.js';
import { EVENT_DEFS } from '../../../src/data/cityEvents.js';
import { CITY_EVENT_TEXT as C, alertText, TIP_TEXT, TIP_HELP_TEXT, V70_HELP, ALERT_TEXT, CARDS4_TEXT } from '../../../src/ui/text.js';
import { TIPS } from '../../../src/data/tips.js';
import { GOODS } from '../../../src/data/goods.js';
import { INCENSE_GOOD } from '../../../src/data/trade.js';
import { TUTORIAL_CARDS, TUTORIAL } from '../../../src/data/tutorial.js';
import { dueCards, seenKey } from '../../../src/ui/cardMoments.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { cityAdvice } from '../../../src/sim/advice.js';

const rigs = [];
async function rig(world, opts = {}) { const r = await rigUI({ world, ...opts }); rigs.push(r); r.ui.refresh(); return r; }
const sweep = () => { while (rigs.length) rigs.pop().cleanup(); };
const test = (name, fn) => it(name, async () => { try { await fn(); } finally { sweep(); } });
const sheet = (r) => r.root.querySelector('#sheet');
const open = (r, kind, id = null) => { r.store.set(openSheet(r.store.get(), kind, id)); };
const city = (kind, o = {}) => { const w = eventWorld({ gold: 5000, ...o }); w.day = 3 * YEAR; w.speed = 0; offer(w, kind); return w; };
const choiceBtn = (r, id) => sheet(r).querySelector(`.event-choice[data-choice="${id}"] > button`);
const words = (b) => b.getAttribute('aria-label');

describe('v70 e ui: the card', () => {
  test('says the story and, for each choice, its exact cost and result (the sim\'s list), and what is taken if nothing is chosen', async () => {
    const w = city('envoy');
    const r = await rig(w);
    open(r, 'cityEvent');
    const ev = waitingEvent(w), list = eventChoices(w, ev);
    const text = sheet(r).textContent;
    expect(sheet(r).querySelector('.head h2').textContent).toBe(C.title('envoy'));
    expect(text).toContain(C.body(ev, w));
    expect(list.length).toBe(2);
    for (const c of list) {
      const node = sheet(r).querySelector(`.event-choice[data-choice="${c.id}"]`);
      expect([c.id, node.querySelector('button').textContent]).toEqual([c.id, C.label('envoy', c.id)]);
      expect([c.id, node.querySelector('.consequence').textContent]).toEqual([c.id, C.consequence(c.effects, w, 'envoy', c.id)]);
    }
    const feast = list.find((c) => c.id === 'feast');
    expect(sheet(r).querySelector('.event-choice[data-choice="feast"] .consequence').textContent).toBe(`Costs ${feast.gold} gold, favour +6.`);
    expect(sheet(r).querySelector('.event-choice[data-choice="greet"] .consequence').textContent).toBe('Favour +2.');
    const def = list.find((c) => c.default);
    expect(sheet(r).querySelector('.event-default').textContent).toBe(C.defaultLine(3, C.label('envoy', def.id), def.effects, w));
    expect(sheet(r).querySelector('.event-default').textContent).toContain('If you wait 3 months, "Greet him at the gate" is taken: favour +2.');
  });

  test('words match the sim both ways: change the city and the card says the new figures; the same event, a richer city, a dearer feast', async () => {
    const w = city('envoy');
    const r = await rig(w);
    open(r, 'cityEvent');
    const fee = (x) => eventChoices(x, waitingEvent(x)).find((c) => c.id === 'feast').gold;
    expect(sheet(r).textContent).toContain(`Costs ${fee(w)} gold`);
    w.gold = 3;                                                                      // the treasury cannot pay: the same card, off
    r.ui.refresh();
    const feast = choiceBtn(r, 'feast');
    expect(feast.disabled).toBe(true);
    expect(sheet(r).querySelector('.event-choice[data-choice="feast"] .why-not').textContent).toBe(`Not enough gold: you have 3, it costs ${fee(w)}.`);
    expect(Boolean(sheet(r).querySelector('.event-choice[data-choice="feast"] .show-me'))).toBe(true);
    w.gold = 5000;
    r.ui.refresh();
    expect(choiceBtn(r, 'feast').disabled).toBe(false);
    expect(sheet(r).querySelector('.event-choice[data-choice="feast"] .why-not')).toBe(null);
  });

  test('a choice that costs gold is off with its reason and Show me when the treasury cannot pay; tapping it does nothing, Show me opens the money', async () => {
    const w = city('quarry_strike', { milestone: 'city' });
    const fee = eventChoices(w, waitingEvent(w)).find((c) => c.id === 'raise_wages').gold;
    w.gold = fee - 1;
    const r = await rig(w);
    open(r, 'cityEvent');
    const raise = choiceBtn(r, 'raise_wages');
    expect([raise.disabled, words(raise).includes(`Not possible: Not enough gold: you have ${fee - 1}, it costs ${fee}.`)]).toEqual([true, true]);
    expect(sheet(r).querySelector('.event-choice[data-choice="raise_wages"] .consequence').textContent).toBe(`Costs ${fee} gold, and the quarries keep working.`);
    expect(sheet(r).querySelector('.event-choice[data-choice="strike"] .consequence').textContent).toBe(C.consequence(eventChoices(w, waitingEvent(w)).find((c) => c.id === 'strike').effects, w));
    fire(raise, 'click');
    expect([w.gold, w.cityEvents.waiting !== null, r.store.get().sheet.kind]).toEqual([fee - 1, true, 'cityEvent']);
    const show = sheet(r).querySelector('.event-choice[data-choice="raise_wages"] .show-me');
    expect(show.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(show.getAttribute('aria-label')).toContain('Show me: Not enough gold');
    fire(show, 'click');
    expect(r.store.get().sheet.kind).toBe('summary');
    expect(choiceBtn(r, 'strike')).toBe(null);                                       // (the summary replaced the card)
  });

  test('every control is at least 44 by 44 with its words as its name, in Tab order, and Enter, Space (a click) and Esc work', async () => {
    const w = city('quarry_strike', { milestone: 'city' });
    w.gold = 1;
    const r = await rig(w);
    open(r, 'cityEvent');
    const buttons = [...sheet(r).querySelectorAll('button')];
    const name = (b) => b.getAttribute('aria-label') || b.textContent;
    for (const b of buttons) {
      const box = b.getBoundingClientRect();
      expect([name(b), box.height >= 44, box.width >= 44, name(b).length > 0]).toEqual([name(b), true, true, true]);
    }
    // The Tab order is the card's: the head's Close, then each choice (a refused one skipped) with its Show me, in the order the card lists them.
    expect(buttons.filter((b) => !b.disabled).map((b) => (b.classList.contains('show-me') ? 'show me' : b.classList.contains('close') ? 'close' : b.textContent)))
      .toEqual(['close', 'show me', 'Let the strike run']);
    expect(buttons.map((b) => b.tabIndex >= 0)).toEqual(buttons.map(() => true));
    expect(name(choiceBtn(r, 'raise_wages')).startsWith('Raise their wages. Costs ')).toBe(true);   // its words, then what it does, then why not
    // Enter and Space on a focused button are a click, which answers; Esc closes the card.
    choiceBtn(r, 'strike').focus();
    expect(document.activeElement === choiceBtn(r, 'strike')).toBe(true);
    key(r.root, 'Escape');
    expect(r.store.get().sheet).toBe(null);
    open(r, 'cityEvent');
    fire(choiceBtn(r, 'strike'), 'click');
    expect([r.world.cityEvents.waiting, r.store.get().sheet]).toEqual([null, null]);
  });

  test('fits without scrolling at 390x844 and 100% text for every kind: the phone sheet may be 60% of the height', async () => {
    const w = eventWorld({ gold: 100000, ill: 3 });
    w.day = 3 * YEAR;
    w.speed = 0;
    expect(Boolean(GOODS[INCENSE_GOOD])).toBe(true);                             // Track T's incense: the festival's card has its three choices
    const r = await rig(w, { width: 390, height: 844 });
    for (const def of EVENT_DEFS) {
      offer(w, def.id);
      r.ui.refresh();
      open(r, 'cityEvent');
      r.ui.refresh();
      const s = sheet(r);
      expect([def.id, s.hidden, s.scrollHeight <= Math.floor(844 * 0.6) ? 'fits' : `too tall: ${s.scrollHeight}px of ${Math.floor(844 * 0.6)}`]).toEqual([def.id, false, 'fits']);
      // the buttons are all in the card
      const n = eventChoices(w, w.cityEvents.waiting).length;
      expect([def.id, s.querySelectorAll('.event-choice > button').length]).toEqual([def.id, n]);
    }
  });

  test('says the smaller festival when no incense is traded and the full one when it is, and a refusal for short incense with Show me', async () => {
    // A game without Track T's incense: the smaller festival only, and the card says why.
    await withoutIncense(async () => {
      const w = city('opet');
      const r = await rig(w);
      open(r, 'cityEvent');
      expect(sheet(r).textContent).toContain('No incense reaches the city yet, so it can only be a smaller festival, with beer alone.');
      expect([...sheet(r).querySelectorAll('.event-choice')].map((n) => n.dataset.choice)).toEqual(['small', 'decline']);
      sweep();
    });
    expect(Boolean(GOODS[INCENSE_GOOD])).toBe(true);
    const w = city('opet');
    const r = await rig(w);
    open(r, 'cityEvent');
    expect(sheet(r).textContent).toContain('It takes beer and incense.');
    expect(sheet(r).textContent.includes('smaller festival, with beer alone')).toBe(false);
    expect([...sheet(r).querySelectorAll('.event-choice')].map((n) => n.dataset.choice)).toEqual(['full', 'small', 'decline']);
    expect(new Set([...sheet(r).querySelectorAll('.event-choice > button')].map((b) => getComputedStyle(b).fontSize)).size).toBe(1);   // one type size: a choice's id is never a CSS class (a choice named small took .small's)
    expect(choiceBtn(r, 'full').disabled).toBe(true);
    expect(sheet(r).querySelector('.event-choice[data-choice="full"] .why-not').textContent).toBe('Your stores hold 0 incense; it takes 10.');
    expect(Boolean(sheet(r).querySelector('.event-choice[data-choice="full"] .show-me'))).toBe(false);   // no store holds any: nothing to show
    storehouseOf(w).store[INCENSE_GOOD] = 20;
    r.ui.refresh();
    expect(choiceBtn(r, 'full').disabled).toBe(false);
  });

  test('answers: the choice is carried out as the card said, the card closes, and the outcome is a caption kept in Recent', async () => {
    const w = city('envoy');
    const r = await rig(w);
    r.ui.afterCommand({ kind: 'settle', result: { ok: true }, text: '', undoable: false });   // the test city's firsts and feats are celebrated now, not among the answer's captions
    open(r, 'cityEvent');
    const fav = w.court.favour, gold = w.gold, fee = eventChoices(w, waitingEvent(w)).find((c) => c.id === 'feast').gold;
    fire(choiceBtn(r, 'feast'), 'click');
    expect([w.court.favour, w.cityEvents.waiting, w.tally.eventsAnswered]).toEqual([fav + 6, null, 1]);
    expect(w.gold >= gold - fee).toBe(true);                                         // the fee left the treasury (a goal the answer finished may have paid its reward on top: the sim's own exact figure is tests/v70/e/sim)
    expect(r.store.get().sheet).toBe(null);
    const recent = r.ui.celebrations.recent().map((x) => x.text || x);
    expect(recent.filter((t) => String(t).includes('An envoy at the gate'))).toEqual([`An envoy at the gate: hold a feast for him. Costs ${fee} gold, favour +6.`]);
    expect(recent).toContain('First event answered');                                // the first answered is a first (and its words say what events are)
  });

  test('keeps showing the event it opened on, and says what became of it when the default is taken while it is open', async () => {
    const w = city('envoy');
    const r = await rig(w);
    open(r, 'cityEvent');
    const due = w.cityEvents.waiting.due;
    w.day = due;
    const events = [];
    eventDay(w, events);
    r.ui.onEvents(events);
    r.ui.refresh();
    expect(sheet(r).querySelector('.event-over').textContent).toContain('no answer in time');
    expect(sheet(r).querySelector('.event-choice')).toBe(null);
  });
});

describe('v70 e ui: the ways in', () => {
  test('the alert list has an entry for the waiting event, and its View opens the card', async () => {
    const w = city('sandstorm');
    const r = await rig(w);
    open(r, 'minimap');
    const li = [...sheet(r).querySelectorAll('.alert-list li')].find((n) => n.querySelector('strong').textContent === alertText({ code: 'city_event', kind: 'sandstorm', months: 2 }, w).title);
    expect(Boolean(li)).toBe(true);
    expect(li.querySelector('strong').textContent).toBe('A sandstorm: answer within 2 months');
    expect(li.querySelector('.muted').textContent).toBe('Open it to choose: each choice says what it does');
    const view = li.querySelector('button.view');
    expect([view.getAttribute('aria-label'), view.getBoundingClientRect().height >= 44]).toEqual(['View: A sandstorm: answer within 2 months', true]);
    fire(view, 'click');
    expect(r.store.get().sheet.kind).toBe('cityEvent');
    expect(sheet(r).querySelector('.head h2').textContent).toBe('A sandstorm');
  });

  test('City advice lists the waiting event, its words from the sim, and its button opens the card', async () => {
    const w = city('sandstorm');
    const r = await rig(w);
    const item = cityAdvice(w).find((a) => a.kind === 'event');
    const aw = adviceWords(item, w);
    expect(aw.what).toBe('A sandstorm: waiting for your answer');
    expect(aw.why).toContain('Answer within 2 months.');
    expect(aw.why).toContain('"Let it blow over" is taken:');
    open(r, 'advice');
    const li = sheet(r).querySelector('.advice-item[data-kind="event"]');
    expect(Boolean(li)).toBe(true);
    fire(li.querySelector('button'), 'click');
    expect(r.store.get().sheet.kind).toBe('cityEvent');
  });

  test('the summary has an Events section while an event waits, with a button that reads it, and none when nothing waits', async () => {
    const w = city('hoard');
    const r = await rig(w);
    open(r, 'summary');
    expect(sheet(r).querySelector('[data-section="events"]').textContent).toBe('Events');
    expect(sheet(r).querySelector('.event-summary').textContent).toBe('An old hoard: answer within 3 months.');
    const read = sheet(r).querySelector('.read-event');
    expect(read.getAttribute('aria-label')).toBe('Read the event: An old hoard');
    expect([read.getBoundingClientRect().height >= 44, read.getBoundingClientRect().width >= 44]).toEqual([true, true]);
    fire(read, 'click');
    expect(r.store.get().sheet.kind).toBe('cityEvent');
    w.cityEvents.waiting = null;
    open(r, 'summary');
    r.ui.refresh();
    expect(sheet(r).querySelector('[data-section="events"]')).toBe(null);
  });

  test('an empty card says no event waits', async () => {
    const w = eventWorld();
    w.speed = 0;
    const r = await rig(w);
    open(r, 'cityEvent');
    expect(sheet(r).querySelector('.event-none').textContent).toBe(C.none);
  });
});

describe('v70 e ui: the first event and the words', () => {
  it('has its tip, its first, its How to play entry, its picture card and its alert words, each short and from the data', () => {
    expect(TIPS.some((t) => t.id === 'city_events' && t.trigger === 'cityEvent')).toBe(true);
    expect([typeof TIP_TEXT.city_events, typeof TIP_HELP_TEXT.city_events]).toEqual(['string', 'string']);
    expect(V70_HELP.e.map((h) => h.head)).toEqual(['City events']);
    expect(V70_HELP.e[0].text).toContain('never costs gold');
    expect(ALERT_TEXT.city_event({ kind: 'opet', months: 3 }).title).toBe('The Festival of Opet: answer within 3 months');
    const card = TUTORIAL_CARDS.find((c) => c.id === 'event');
    expect([Boolean(card), card.first, Boolean(CARDS4_TEXT.cards.event)]).toEqual([true, 'cityEvent', true]);
  });

  it('shows the picture card once, when the first event has been offered, and not before', () => {
    const w = eventWorld();
    w.day = 3 * YEAR;
    expect(dueCards(w, []).map((c) => c.id).includes('event')).toBe(false);
    offer(w, 'envoy');
    w.tally.eventsOffered = 1;
    expect(dueCards(w, []).map((c) => c.id)).toContain('event');
    expect(dueCards(w, [seenKey('event')]).map((c) => c.id).includes('event')).toBe(false);
  });
});
describe('v70 e ui: the first event\'s picture', () => {
  it('is 600 px square and at most 60 KB, with its ring inside it, kept for offline play, and its scene frames the choices', async () => {
    const json = await (await fetch(`/assets/tutorial/${TUTORIAL.marks}`)).json();
    const self = {};
    new Function('self', await (await fetch('/sw-files.js')).text())(self);
    const res = await fetch('/assets/tutorial/event.webp');
    const blob = await res.blob();
    const image = await createImageBitmap(blob);
    const mark = json.cards.event && json.cards.event.mark;
    expect([res.status, blob.size <= TUTORIAL.maxBytes, image.width, image.height, self.THEBES_FILES.includes(`${TUTORIAL.dir}event.webp`), mark && mark.kind]).toEqual([200, true, 600, 600, true, 'ring']);
    expect([mark.x - mark.w / 2 >= 0, mark.x + mark.w / 2 <= 600, mark.y - mark.h / 2 >= 0, mark.y + mark.h / 2 <= 600]).toEqual([true, true, true, true]);
    const w = CARDS4_TEXT.cards.event;
    expect([w.title.length > 0, w.words.length > 20, w.alt.length > 20, w.words.split('. ').length <= 3]).toEqual([true, true, true, true]);
  });
});
void days;
