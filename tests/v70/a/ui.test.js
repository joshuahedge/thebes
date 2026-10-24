// Version 7.0, Track A (rulings 960-974): the interface of the Advice fixes and the words, on the real shell: Show me for a tower's spot or road and for a store by the bazaar, the
// buttons' accessible names, the Keep at least item opening the Trade sheet, the two new tips and their triggers, and How to play. (The wave 1 words made exact are
// words.test.js.)
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { raidCity, street, tradeCity } from './helpers.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { towerSpotsFor, sensibleMonthly } from '../../../src/sim/adviceFixes.js';
import { setTradeOrder, setKeepAtLeast } from '../../../src/sim/trade.js';
import { openSheet } from '../../../src/ui/modes.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { createAdviceFixUi } from '../../../src/ui/v70/adviceFixes.js';
import { TIP_TEXT, TIP_HELP_TEXT, V70_HELP } from '../../../src/ui/text.js';
import { TIPS } from '../../../src/data/tips.js';
import { V70_TIPS } from '../../../src/data/v70.js';
import { ADVICE_FIX_TIPS } from '../../../src/data/adviceFixes.js';
import { DEFENCE } from '../../../src/data/raids.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { QUAY_TYPE, TRADE_REACH } from '../../../src/data/trade.js';

const ofKind = (w, kind) => cityAdvice(w).filter((a) => a.kind === kind);
const itemBtn = (r, kind) => [...r.root.querySelectorAll('#sheet .advice-item')].find((x) => x.dataset.kind === kind).querySelector('button');
const openAdvice = (r) => { r.ui.refresh(); r.store.set(openSheet(r.store.get(), 'advice')); };
const sized = (b) => { const box = b.getBoundingClientRect(); return [box.width >= 44, box.height >= 44]; };

describe('v70 a ui: Show me for the fixes', () => {
  it('a tower with a spot starts the tower card with its ghost on that tile; with no road in range the road tool starts, at the road\'s end', async () => {
    const { w, post } = raidCity();
    const r = await rigUI({ world: w });
    try {
      openAdvice(r);
      const spot = towerSpotsFor(w, post)[0];
      const btn = itemBtn(r, 'raid_towers');
      expect([btn.textContent, btn.getAttribute('aria-label'), ...sized(btn)]).toEqual(['Show me', `Show me: ${adviceWords(ofKind(w, 'raid_towers')[0], w).what}`, true, true]);
      fire(btn, 'click');
      const s = r.store.get();
      expect([s.sheet, s.tool, s.ghost.x, s.ghost.y]).toEqual([null, { kind: 'building', type: 'tower' }, spot.x, spot.y]);
    } finally { r.cleanup(); }
    const far = raidCity(22);
    const r2 = await rigUI({ world: far.w });
    try {
      openAdvice(r2);
      const a = ofKind(far.w, 'raid_towers')[0];
      const li = r2.root.querySelector('#sheet .advice-item[data-kind="raid_towers"]');
      expect(li.querySelector('.fix-words').textContent.startsWith(`Lay a road to the spot Show me marks (${a.data.road.tiles} tiles), then build`)).toBe(true);
      expect(li.querySelector('.cost').textContent).toBe(`Road: ${a.cost} gold a tile`);
      fire(li.querySelector('button'), 'click');
      expect([r2.store.get().sheet, r2.store.get().tool.kind]).toEqual([null, 'road']);
    } finally { r2.cleanup(); }
  });

  it('a store by the bazaar starts the storehouse card on the spot the sim named', async () => {
    const { w } = street();
    const r = await rigUI({ world: w });
    try {
      openAdvice(r);
      const a = ofKind(w, 'stranded')[0];
      const li = r.root.querySelector('#sheet .advice-item[data-kind="stranded"]');
      expect(li.querySelector('.fix-words').textContent).toBe(adviceWords(a, w).fix);
      expect(li.querySelector('.cost').textContent).toBe(`Storehouse: ${a.cost} gold`);
      fire(li.querySelector('button'), 'click');
      const s = r.store.get();
      expect([s.sheet, s.tool, s.ghost.x + 1, s.ghost.y + 1]).toEqual([null, { kind: 'building', type: 'storehouse' }, a.fix.target.x, a.fix.target.y]);
    } finally { r.cleanup(); }
  });

  it('a Quay missing for an open river route starts the Quay card where the placing rule takes it', async () => {
    const { w } = tradeCity();
    w.trade.routes.nubia = { since: 0, gifted: true };
    const r = await rigUI({ world: w });
    try {
      openAdvice(r);
      const a = ofKind(w, 'quay')[0];
      fire(itemBtn(r, 'quay'), 'click');
      const s = r.store.get();
      expect([s.sheet, s.tool.type, Math.abs(s.ghost.x + 1 - a.fix.target.x) <= 1.5 && Math.abs(s.ghost.y + 1 - a.fix.target.y) <= 1.5]).toEqual([null, QUAY_TYPE, true]);
    } finally { r.cleanup(); }
  });

  it('the Keep at least item\'s View opens the Trade sheet itself, named by what it says', async () => {
    const { w } = tradeCity();
    w.trade.routes.memphis = { since: 0, gifted: true };
    setTradeOrder(w, 'pottery', 'sell', 100);
    setKeepAtLeast(w, 'pottery', 100);
    w.gold = 0;
    const r = await rigUI({ world: w });
    try {
      openAdvice(r);
      const a = ofKind(w, 'trade_floor')[0];
      const btn = itemBtn(r, 'trade_floor');
      expect([btn.textContent, btn.getAttribute('aria-label'), ...sized(btn)]).toEqual(['View', `View: ${adviceWords(a, w).what}`, true, true]);
      fire(btn, 'click');
      expect(r.store.get().sheet.kind).toBe('trade');
    } finally { r.cleanup(); }
  });
});

describe('v70 a tips: the Quay and the first route', () => {
  it('are in the tips list after the other tracks\', each with words and a trigger the seam fires', () => {
    expect(ADVICE_FIX_TIPS.map((t) => [t.id, t.trigger])).toEqual([['quay_boats', 'quayPlaced'], ['trade_levels', 'routeOpened']]);
    for (const t of ADVICE_FIX_TIPS) expect([t.id, V70_TIPS.includes(t), TIPS.includes(t), typeof TIP_TEXT[t.id], TIP_TEXT[t.id].length > 20]).toEqual([t.id, true, true, 'string', true]);
    for (const t of ADVICE_FIX_TIPS) expect([t.id, (TIP_HELP_TEXT[t.id] || TIP_TEXT[t.id]).split(/\s+/).length <= 20]).toEqual([t.id, true]);
    expect(TIP_TEXT.quay_boats).toContain('on the river, beside a road');
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length);
  });

  it('fire from the seam: the first Quay placed, and a route opened (never a refused one)', () => {
    const fired = [];
    let tool = null;
    const ctx = { world: { trade: { routes: {} } }, store: { get: () => ({ tool }) }, fireTip: (k) => fired.push(k), root: null };
    const ui = createAdviceFixUi(ctx);
    tool = { kind: 'building', type: 'well' };
    ui.onCommand({ kind: 'building', undoable: true });
    tool = { kind: 'building', type: QUAY_TYPE };
    ui.onCommand({ kind: 'building', undoable: true });
    ui.onCommand({ kind: 'route', result: { ok: false, reason: 'no_gold' }, undoable: false });
    ui.onCommand({ kind: 'route', result: { ok: true }, undoable: false });
    ui.onCommand({ kind: 'trade', result: { ok: true }, undoable: false });
    expect(fired).toEqual(['quayPlaced', 'routeOpened']);
    expect(Object.keys(createAdviceFixUi()).sort()).toEqual(['destroy', 'onAlertAction', 'onCommand', 'onEvents', 'refresh', 'sheetParts', 'sheets']);   // no game: the empty seam
  });

  it('a Quay placed and a route opened show the tips on the real shell', async () => {
    const { w } = tradeCity();
    w.speed = 1;
    let t = 0;
    const r = await rigUI({ world: w, now: () => t });
    try {
      t = 10 * 60 * 1000;                                                     // past the first-tip delay on the wall clock
      r.store.set({ ...r.store.get(), tool: { kind: 'building', type: QUAY_TYPE } });
      r.ui.afterCommand({ kind: 'building', result: { ok: true }, undoable: true });
      expect(r.ui.tips.current()).toBe('quay_boats');
    } finally { r.cleanup(); }
  });
});

describe('v70 a how to play: the Quay, the fixes in City advice, and trade and events in City advice', () => {
  it('has three entries after the other tracks\', from the data, and the sheet prints them', async () => {
    expect(V70_HELP.a.map((h) => h.head)).toEqual(['The Quay', 'Towers and storehouses in City advice', 'Trade and events in City advice']);
    const [quay, fixes, trade] = V70_HELP.a.map((h) => h.text);
    expect(quay).toContain(`${BUILDINGS[QUAY_TYPE].workers} workers`);
    expect(quay).toContain(`${TRADE_REACH} road tiles`);
    expect(quay).toContain('2 by 1');
    expect(fixes).toContain(`within ${DEFENCE.towerRange} tiles of the building the raiders strike first`);
    expect(fixes).toContain(`less than ${sensibleMonthly()} a month`);
    expect(trade).toContain('an event waiting for your answer');
    expect(trade).toContain('Keep at least');
    const r = await rigUI({});
    try {
      r.store.set(openSheet(r.store.get(), 'help'));
      const heads = [...r.root.querySelectorAll('#sheet h3')].map((h) => h.textContent);
      const at = (h) => heads.indexOf(h);
      expect(heads.filter((h) => V70_HELP.a.some((p) => p.head === h)).length).toBe(3);
      expect([at('The Quay') > at('The Trade sheet'), at('Towers and storehouses in City advice') > at('City events'), at('Trade and events in City advice') > at('Seasons, day and night, and sound')]).toEqual([true, true, true]);
      for (const p of V70_HELP.a) expect(r.root.querySelector('#sheet').textContent).toContain(p.text);
    } finally { r.cleanup(); }
  });
});
