// Version 7.1, fix batch A (rulings 1060-1066), the event card: the fever's answer closes the card, a refusal always has its Show me, a strike's hold line does not point at a choice that
// is gone, the line saying what is taken if the player waits comes before the choices, and the story, the choices and the default say the same thing in the same words.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { eventWorld, offer, idsOf, YEAR } from '../../v70/e/helpers.js';
import { openSheet, select } from '../../../src/ui/modes.js';
import { eventChoices, waitingEvent, eventDay } from '../../../src/sim/cityEvents.js';
import { housesOf, allBuildings } from '../../../src/sim/world.js';
import { fallIll } from '../../../src/sim/health.js';
import { CITY_EVENT_TEXT as C } from '../../../src/ui/text.js';

const rigs = [];
async function rig(world, opts = {}) { const r = await rigUI({ world, ...opts }); rigs.push(r); r.ui.refresh(); return r; }
const sweep = () => { while (rigs.length) rigs.pop().cleanup(); };
const test = (name, fn) => it(name, async () => { try { await fn(); } finally { sweep(); } });
const sheet = (r) => r.root.querySelector('#sheet');
const open = (r) => { r.store.set(openSheet(r.store.get(), 'cityEvent')); };
const city = (kind, o = {}) => { const w = eventWorld({ gold: 100000, ...o }); w.day = 3 * YEAR; w.speed = 0; offer(w, kind); return w; };
const node = (r, id) => sheet(r).querySelector(`.event-choice[data-choice="${id}"]`);
const illCount = (w) => housesOf(w).filter((b) => b.illness).length;

describe('v71 fa events ui: the fever\'s answer', () => {
  test('letting him in closes the card with the outcome\'s caption and lays 2 or 3 homes low (the illnesses are pushed before the outcome)', async () => {
    const w = city('fever', { ill: 0 });
    const r = await rig(w);
    r.ui.afterCommand({ kind: 'settle', result: { ok: true }, text: '', undoable: false });
    open(r);
    const n = w.cityEvents.waiting.figs.ids.length, before = illCount(w), effects = eventChoices(w, waitingEvent(w)).find((c) => c.id === 'let_in').effects;
    fire(node(r, 'let_in').querySelector('button'), 'click');
    expect(r.store.get().sheet).toBe(null);                                         // the card closed: nothing threw before close()
    expect([w.cityEvents.waiting, illCount(w) - before]).toEqual([null, n]);
    expect(n === 2 || n === 3).toBe(true);
    const recent = r.ui.celebrations.recent().map((x) => x.text || x);
    expect(recent.filter((t) => String(t).startsWith('A fever at the gate'))).toEqual([`A fever at the gate: let him in. ${C.consequence(effects, w)}`]);   // the outcome's caption, once
  });
});

describe('v71 fa events ui: a strike\'s hold line', () => {
  test('says the day and that work starts again by itself; no choice is named, since none is left', async () => {
    const w = city('quarry_strike');
    w.day = w.cityEvents.waiting.due;
    eventDay(w);
    const id = idsOf(w, 'quarry')[0], until = w.court.effects.find((e) => e.event === true).until;
    const r = await rig(w);
    r.store.set(select(r.store.get(), id));
    r.ui.refresh();
    const line = r.root.querySelector('#sheet .event-hold');
    expect(line.textContent).toBe(`${C.hold(until, 'quarry')}.`);
    expect(/^On strike until year \d+, month \d+; work starts again by itself\.$/.test(line.textContent)).toBe(true);
    expect(line.textContent.includes("event's choice")).toBe(false);
  });
});

describe('v71 fa events ui: every refusal has a Show me, 44 px tall', () => {
  // [name, kind, how the city is set up so a choice is refused, the choice, the reason expected]
  const SCENES = [
    ['no gold', 'envoy', (w) => { w.gold = 1; }, 'feast', 'no_gold'],
    ['short, a store holds the good', 'opet', (w) => { w.trade.routes.punt = {}; for (const b of allBuildings(w)) if (b.store) b.store.beer = 1; }, 'small', 'short'],
    ['short, no store holds the good (full Opet, Punt open, no incense)', 'opet', (w) => { w.trade.routes.punt = {}; }, 'full', 'short'],
    ['no room for people', 'craftsman', (w) => { for (const b of housesOf(w)) b.residents = 9999; }, 'settle', 'no_room'],
    ['too soon', 'opet', (w) => { w.danger.festivalDay = w.day - 10; }, 'small', 'too_soon'],
    ['none, the quarries are paused', 'quarry_strike', (w) => { for (const id of idsOf(w, 'quarry')) w.buildings[id].paused = true; }, 'raise_wages', 'none'],
    ['none, the quarries are gone', 'quarry_strike', (w) => { for (const id of idsOf(w, 'quarry')) delete w.buildings[id]; }, 'raise_wages', 'none'],
    ['none, every home is already ill', 'fever', (w) => { for (const id of w.cityEvents.waiting.figs.ids) fallIll(w, id); }, 'gate', 'none'],
    ['none, the stock is gone', 'lost_caravan', (w) => { for (const b of allBuildings(w)) if (b.store) delete b.store[w.cityEvents.waiting.figs.good]; }, 'search', 'none'],
    ['none, no home is ill', 'healer', (w) => { for (const b of housesOf(w)) delete b.illness; }, 'cure', 'none'],
  ];
  for (const [name, kind, setUp, id, reason] of SCENES) {
    test(`${name}: ${id} is refused (${reason}) with a Show me that opens a building`, async () => {
      const w = city(kind, { ill: 3 });
      setUp(w);
      const r = await rig(w);
      open(r);
      const c = eventChoices(w, waitingEvent(w)).find((x) => x.id === id);
      expect([c.ok, c.reason]).toEqual([false, reason]);
      const go = node(r, id).querySelector('.show-me');
      expect([name, Boolean(go)]).toEqual([name, true]);
      expect([name, go.getBoundingClientRect().height >= 44, go.getBoundingClientRect().width >= 44]).toEqual([name, true, true]);
      expect(go.getAttribute('aria-label').startsWith('Show me: ')).toBe(true);
      fire(go, 'click');
      if (reason === 'no_gold') expect(r.store.get().selectedId).toBe(null);          // the money, not a building (the alert's own view)
      else expect([name, w.buildings[r.store.get().selectedId] !== undefined]).toEqual([name, true]);
    });
  }
});

describe('v71 fa events ui: the words after a refusal and in the story', () => {
  test('a paid choice with nothing to spare says what it would cost and why not, and the story does not count workplaces that are gone', async () => {
    const w = city('workshop_quarrel');
    const f = w.cityEvents.waiting.figs;
    for (const id of f.ids) w.buildings[id].paused = true;
    const r = await rig(w);
    open(r);
    const settle = node(r, 'settle_it');
    expect(settle.querySelector('.consequence').textContent).toBe(`Costs ${f.fee} gold.`);          // not "... and the workshops keep working"
    expect(settle.querySelector('.why-not').textContent).toBe('No workplace is left for it to keep working.');
    expect(sheet(r).querySelector('.event-body').textContent.includes('stop work for')).toBe(false);
    expect(sheet(r).querySelector('.event-body').textContent).toContain('Nothing is left to stop now');
    expect(node(r, 'settle_it').querySelector('button').disabled).toBe(true);
  });

  for (const kind of ['quarry_strike', 'workshop_quarrel']) {
    test(`${kind}: the story, the choice and the default line name what stops in the same words`, async () => {
      const w = city(kind);
      const r = await rig(w);
      open(r);
      const ev = waitingEvent(w), list = eventChoices(w, ev), free = list.find((c) => c.default);
      const said = C.consequence(free.effects, w, kind, free.id).replace(/\.$/, '').replace(/^./, (x) => x.toLowerCase());   // "3 quarries stop work for 2 months"
      expect(/stops? work for \d+ months?$/.test(said)).toBe(true);
      expect(sheet(r).querySelector('.event-body').textContent).toContain(said);
      expect(sheet(r).querySelector('.event-default').textContent).toContain(said);
      expect(node(r, free.id).querySelector('.consequence').textContent.toLowerCase()).toContain(said);
    });
  }
});

describe('v71 fa events ui: what is taken if the player waits comes first', () => {
  // envoy: a short story and two choices, the card the line must be wholly in view on; opet: the longest story and three choices, where it must at least begin in view.
  for (const [width, height] of [[375, 667], [1280, 800]]) {
    for (const kind of ['envoy', 'opet']) {
      test(`${kind} at ${width}x${height} and 150% text: the default line comes right after the story, before the choices, and is in view without scrolling`, async () => {
        const w = city(kind, { ill: 3 });
        w.trade.routes.punt = {};
        const r = await rig(w, { width, height });
        r.ui.settings.set({ textSize: 150 });
        open(r);
        r.ui.refresh();
        const s = sheet(r), body = s.querySelector('.event-body'), def = s.querySelector('.event-default'), choices = s.querySelector('.event-choices');
        expect(Boolean(body.compareDocumentPosition(def) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
        expect(Boolean(def.compareDocumentPosition(choices) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
        const box = s.getBoundingClientRect(), d = def.getBoundingClientRect();
        // The test shell's phone sheet is 44% of the height (292 px at 375x667): the line has to begin in view with a line's worth of room under it (it was below both choices, 300 px down,
        // before); on a wide screen it is in view whole.
        const room = box.bottom - d.top;
        expect([kind, d.top >= box.top - 0.5, width >= 1000 ? d.bottom <= box.bottom + 0.5 : room >= 24]).toEqual([kind, true, true]);
        expect(s.scrollTop).toBe(0);
      });
    }
  }
});
