// Version 7.0, Track P (ruling 1005): the desktop's sheets get room. At 1280x800 and 1920x1080 the Trade sheet and the event card sat in the bottom 45% of the side panel under
// the minimap, Layers and the build tray. While a sheet is open on a wide screen the tray and Layers fold, and the sheet starts under the minimap and runs down the panel; closing it
// brings them back; a phone and a folded panel are unchanged. The event card's Show me is a button, and a choice the city cannot take stays plainly off with readable words.
import { describe, it, expect } from '../../harness.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { addRaw, staffAll } from '../../helpers/testWorld.js';
import { contrastIn } from '../../helpers/contrast.js';
import { eventWorld, offer, YEAR } from '../e/helpers.js';
import { openSheet, select } from '../../../src/ui/modes.js';

const rigs = [];
const sweep = () => { while (rigs.length) rigs.pop().cleanup(); };
async function rig(opts) { const r = await rigUI(opts); rigs.push(r); r.ui.refresh(); return r; }
const test = (name, fn) => it(name, async () => { try { await fn(); } finally { sweep(); } });
const shown = (n) => Boolean(n) && getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().height > 0;
const open = (r, kind, id = null) => r.store.set(openSheet(r.store.get(), kind, id));
const sheetOf = (r) => r.root.querySelector('#sheet');
const panelParts = (r) => ['.layers-row', '.tabs', '.cards'].map((q) => r.root.querySelector(`#panel ${q}`));
const SIZES = [[1280, 800], [1920, 1080]];

// uiWorld with a trading post (a Trade sheet to open) and the Capital's routes.
function tradeWorld() {
  const w = uiWorld();
  w.milestone = 'capital';
  w.gold = 5000;
  addRaw(w, 'trading_post', 16, 11);
  staffAll(w);
  for (const id of ['memphis', 'nubia']) w.trade.routes[id] = { since: 0, gifted: true };
  return w;
}

describe('v70 p the desktop\'s sheets fold the build tray and fill the panel', () => {
  for (const [width, height] of SIZES) {
    test(`at ${width}x${height}: the Trade sheet starts under the minimap and runs down the panel, and closing it brings the tray and Layers back`, async () => {
      const r = await rig({ width, height, world: tradeWorld() });
      expect([panelParts(r).every(shown), document.body.classList.contains('panel-sheet')]).toEqual([true, false]);
      open(r, 'trade');
      const sheet = sheetOf(r), mini = r.root.querySelector('#panel .minimap').getBoundingClientRect(), panel = r.root.querySelector('#panel').getBoundingClientRect(), box = r.root.getBoundingClientRect();
      expect([document.body.classList.contains('panel-sheet'), panelParts(r).some(shown), shown(r.root.querySelector('#panel .minimap'))]).toEqual([true, false, true]);
      const s = sheet.getBoundingClientRect();
      expect([s.top >= mini.bottom - 1, s.top <= mini.bottom + 4, s.right <= panel.right + 1, s.bottom <= box.bottom + 1]).toEqual([true, true, true, true]);
      // The room the sheet may use is the panel under the minimap, not 55% of it: its cap is as tall as that room (px), and it uses what its words need up to that.
      const room = box.bottom - mini.bottom;
      expect(s.height).toBeLessThan(room + 2);
      const spacer = document.createElement('div');                                    // a sheet with more to say than the panel holds takes the whole room, scrolling inside it
      spacer.style.height = '4000px';
      sheet.querySelector('.body').append(spacer);
      const tall = sheet.getBoundingClientRect();
      expect([Math.abs(tall.height - room) <= 2, tall.height > height * 0.55, Math.abs(tall.bottom - box.bottom) <= 2]).toEqual([true, true, true]);
      spacer.remove();
      r.store.set({ sheet: null, mode: 'browse', selectedId: null });
      expect([document.body.classList.contains('panel-sheet'), panelParts(r).every(shown)]).toEqual([false, true]);
    });
  }
  for (const [width, height] of SIZES) {
    test(`at ${width}x${height}: a building's sheet, the summary, the monument sheet, How to play and the menu all still read (inside the panel, under the minimap, nothing cut), and closing brings the tray back`, async () => {
      const w = tradeWorld();
      const mon = addRaw(w, 'mastaba_small', 20, 14);
      const r = await rig({ width, height, world: w });
      const mini = r.root.querySelector('#panel .minimap').getBoundingClientRect(), panel = r.root.querySelector('#panel').getBoundingClientRect(), box = r.root.getBoundingClientRect();
      const well = Object.values(w.buildings).find((b) => b.type === 'well');
      const cases = [['info well', () => r.store.set(select(r.store.get(), well.id))], ['info monument', () => r.store.set(select(r.store.get(), mon.id))], ['summary', () => open(r, 'summary')], ['help', () => open(r, 'help')], ['menu', () => open(r, 'menu')]];
      for (const [name, go] of cases) {
        go();
        const sheet = sheetOf(r), s = sheet.getBoundingClientRect();
        expect([name, document.body.classList.contains('panel-sheet'), panelParts(r).some(shown)]).toEqual([name, true, false]);
        expect([name, s.top >= mini.bottom - 1, s.left >= panel.left - 1, s.right <= panel.right + 1, s.bottom <= box.bottom + 1, s.height > 80]).toEqual([name, true, true, true, true, true]);
        const head = sheet.querySelector('.head h2');
        expect([name, Boolean(head && head.textContent.trim()), Boolean(sheet.querySelector('.head button'))]).toEqual([name, true, true]);
        r.store.set({ sheet: null, mode: 'browse', selectedId: null });
        expect([name, panelParts(r).every(shown)]).toEqual([name, true]);
      }
    });
  }
  test('a phone is unchanged (the tray is the dock and no sheet folds it), and a folded wide panel takes no class', async () => {
    const phone = await rig({ width: 390, height: 844, world: tradeWorld() });
    open(phone, 'trade');
    expect([document.body.classList.contains('panel-sheet'), shown(phone.root.querySelector('#dock'))]).toEqual([false, true]);
    sweep();
    const wide = await rig({ width: 1280, height: 800, world: tradeWorld() });
    wide.store.set({ panelFolded: true });
    open(wide, 'trade');
    expect(document.body.classList.contains('panel-sheet')).toBe(false);
  });
});

describe('v70 p the event card on a desktop', () => {
  for (const [width, height] of SIZES) {
    test(`at ${width}x${height} the card fits without scrolling, with Show me a 44 px button and the off choice's words at 4.5:1 or more`, async () => {
      const w = eventWorld({ gold: 5000 });
      w.day = 3 * YEAR;
      w.speed = 0;
      offer(w, 'envoy');
      const r = await rig({ world: w, width, height });
      open(r, 'cityEvent');
      w.gold = 3;                                                                      // the feast cannot be paid: that choice is off, with its reason and Show me
      r.ui.refresh();
      const sheet = sheetOf(r);
      expect([sheet.scrollHeight <= sheet.clientHeight + 1, document.body.classList.contains('panel-sheet')]).toEqual([true, true]);
      const feast = sheet.querySelector('.event-choice[data-choice="feast"]');
      const show = feast.querySelector('.show-me'), off = feast.querySelector('button:disabled');
      expect([Boolean(show), Boolean(off)]).toEqual([true, true]);
      const b = show.getBoundingClientRect();
      expect([b.width >= 44, b.height >= 44, show.classList.contains('quiet'), getComputedStyle(show).borderTopStyle !== 'none', show.getAttribute('aria-label').startsWith('Show me')]).toEqual([true, true, false, true, true]);
      expect([getComputedStyle(off).opacity, contrastIn(off, off) >= 4.5, getComputedStyle(off).borderTopStyle]).toEqual(['1', true, 'dashed']);
      const on = sheet.querySelector('.event-choice[data-choice="greet"] button');
      expect([on.disabled, contrastIn(on, on) >= 4.5]).toEqual([false, true]);
    });
  }
});
