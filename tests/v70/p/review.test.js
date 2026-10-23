// Version 7.0, wave 3 (fix Batch 1, from the final review; rulings 985, 986, 991-994, 998): Delete acts on what the player is looking at and never undoes a demolish; a click on a speed
// step lets go of it so Space pauses; the placing ghost is framed above the measured bar and corner buttons; the why line carries only what no chip says; the lesson card hands focus
// back; a phone's top bar that overflows wears the small pictures; dimmed sound rows and a refused route keep readable words.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';
import { fire, key, mount } from '../../helpers/dom.js';
import { contrastIn } from '../../helpers/contrast.js';
import { buildingAt } from '../../../src/sim/world.js';
import { openSheet } from '../../../src/ui/modes.js';
import { createLessonCard } from '../../../src/ui/lessonCard.js';
import { createPlacement } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { dimsOf } from '../../../src/data/buildings.js';
import { P_TEXT } from '../../../src/ui/text.js';

const W = P_TEXT.place;
const wellCard = (r) => { fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click'); fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click'); r.frame(0); };
const placeWell = (r, x, y) => { wellCard(r); r.tap(x, y); fire(r.root.querySelector('#confirm .ok'), 'click'); fire(r.root.querySelector('#confirm .cancel'), 'click'); };   // laid, the tool put away: the toast's Undo is on offer
const toastOf = (r) => r.root.querySelector('#toasts .toast');

describe('v70 p review: Delete acts on what the player is looking at (rulings 985, 986)', () => {
  it('with a toast up and another building\'s sheet open, Delete demolishes that building, not the earlier placement', async () => {
    const r = await rigUI();
    try {
      placeWell(r, 5, 9);
      const toast = toastOf(r);
      expect(Boolean(toast) && buildingAt(r.world, 5, 9).type === 'well').toBe(true);
      addRaw(r.world, 'granary', 20, 12);
      r.tap(20, 12);
      expect([r.store.get().mode, r.store.get().sheet.kind]).toEqual(['selected', 'info']);
      key(r.root, 'Delete');
      expect([buildingAt(r.world, 20, 12), buildingAt(r.world, 5, 9).type]).toEqual([null, 'well']);
    } finally { r.cleanup(); }
  });
  it('does nothing behind Settings, the event card or Advice, over a dialog, a lesson card, a text field or screenshot mode, and the well is still there', async () => {
    const r = await rigUI();
    try {
      placeWell(r, 5, 9);
      const toast = toastOf(r);
      for (const kind of ['settings', 'cityEvent', 'advice']) {
        r.store.set(openSheet(r.store.get(), kind));
        key(r.root, 'Delete');
        key(r.root, 'Backspace');
        expect([kind, Boolean(buildingAt(r.world, 5, 9)), toast.isConnected]).toEqual([kind, true, true]);
        r.store.set({ sheet: null });
      }
      r.store.set({ confirmDialog: { text: 'Sure?', confirmLabel: 'Yes', onConfirm: () => {} } });
      key(r.root, 'Delete');
      r.store.set({ confirmDialog: null });
      document.body.classList.add('lesson-card-up');
      key(r.root, 'Delete');
      document.body.classList.remove('lesson-card-up');
      r.store.set({ screenshot: true });
      key(r.root, 'Delete');
      r.store.set({ screenshot: false });
      const field = document.createElement('input');
      document.body.append(field);
      field.focus();
      key(r.root, 'Delete');                                                           // (the key layer leaves a key typed in a field alone itself; with focus in one, the action does too)
      field.remove();
      expect([Boolean(buildingAt(r.world, 5, 9)), toast.isConnected]).toEqual([true, true]);
    } finally { r.cleanup(); }
  });
  it('with no sheet open, Delete undoes the placement whose toast is up, and the toast goes with it', async () => {
    const r = await rigUI();
    try {
      placeWell(r, 5, 9);
      key(r.root, 'Delete');
      expect([buildingAt(r.world, 5, 9), toastOf(r) && toastOf(r).querySelector('.action')]).toEqual([null, null]);
    } finally { r.cleanup(); }
  });
  it('deleting buildings in turn never brings the first back, and Delete never undoes a demolish', async () => {
    const r = await rigUI();
    try {
      const a = addRaw(r.world, 'granary', 20, 12), b = addRaw(r.world, 'bazaar', 26, 12);
      r.tap(20, 12);
      key(r.root, 'Delete');
      expect(r.world.buildings[a.id]).toBe(undefined);
      r.tap(26, 12);
      key(r.root, 'Delete');
      expect([r.world.buildings[a.id], r.world.buildings[b.id]]).toEqual([undefined, undefined]);
      key(r.root, 'Delete');                                                           // no sheet, the last step a demolish: nothing is brought back
      expect([r.world.buildings[a.id], r.world.buildings[b.id], r.store.get().sheet]).toEqual([undefined, undefined, null]);
      r.ui.placement.undo();                                                           // Ctrl+Z and the Undo button still do
      expect(Boolean(r.world.buildings[b.id])).toBe(true);
    } finally { r.cleanup(); }
  });
  it('the toast after a demolish names Ctrl+Z but not Delete; after a placement it names both', async () => {
    const r = await rigUI();
    try {
      addRaw(r.world, 'granary', 20, 12);
      r.tap(20, 12);
      key(r.root, 'Delete');
      const after = toastOf(r).querySelector('.action');
      expect([after.getAttribute('aria-keyshortcuts'), after.title]).toEqual(['Control+Z Meta+Z', P_TEXT.undoTitle(false)]);
      placeWell(r, 5, 9);
      const placed = toastOf(r).querySelector('.action');
      expect([placed.getAttribute('aria-keyshortcuts'), placed.title]).toEqual(['Control+Z Meta+Z Delete Backspace', P_TEXT.undoTitle(true)]);
    } finally { r.cleanup(); }
  });
  it('the placing bar\'s Undo does not name Delete while the last step is a demolish', async () => {
    const r = await rigUI();
    try {
      addRaw(r.world, 'granary', 20, 12);
      r.tap(20, 12);
      key(r.root, 'Delete');
      r.ui.placement.start({ kind: 'demolish' });
      expect(r.root.querySelector('#confirm .undo').getAttribute('aria-keyshortcuts')).toBe('Control+Z Meta+Z');
      r.ui.placement.cancel();
      wellCard(r);
      r.tap(5, 9);
      fire(r.root.querySelector('#confirm .ok'), 'click');
      expect(r.root.querySelector('#confirm .undo').getAttribute('aria-keyshortcuts')).toBe('Control+Z Meta+Z Delete Backspace');
    } finally { r.cleanup(); }
  });
  it('cancelling the question before undoing a settled plot leaves the toast up', async () => {
    const r = await rigUI();
    try {
      const pl = r.ui.placement;
      pl.start({ kind: 'houses' });
      pl.pointAt(20, 8); pl.pointAt(21, 8);
      pl.confirm();
      const toast = toastOf(r);
      expect(Boolean(toast)).toBe(true);
      const homes = Object.values(r.world.buildings).filter((b) => b.type === 'house' && b.x >= 20);
      expect(homes.length).toBeGreaterThan(0);
      homes[0].residents = 5; homes[0].tier = 1;
      key(r.root, 'Delete');
      expect([Boolean(r.store.get().confirmDialog), toast.isConnected]).toEqual([true, true]);
      r.store.set({ confirmDialog: null });                                            // Cancel
      expect([toast.isConnected, Object.values(r.world.buildings).filter((b) => b.type === 'house' && b.x >= 20).length]).toEqual([true, homes.length]);
      key(r.root, 'Delete');
      r.store.get().confirmDialog.onConfirm();                                         // and answering it takes the plot back and the toast with it
      expect([toast.isConnected, Object.values(r.world.buildings).filter((b) => b.type === 'house' && b.x >= 20).length]).toEqual([false, 0]);
    } finally { r.cleanup(); }
  });
});

describe('v70 p review: a click on a speed step lets go of it (ruling 991)', () => {
  it('after a pointer click on a step, Space pauses; after a keyboard press on it, Space stays with the focused button', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const step = (s) => r.root.querySelector(`.speed-step.step-${s}`);
      const space = () => key(r.root.contains(document.activeElement) ? document.activeElement : r.root, ' ');
      step(2).focus();
      fire(step(2), 'click', { detail: 1 });
      expect([r.world.speed, document.activeElement === step(2)]).toEqual([2, false]);
      space();
      expect(r.world.speed).toBe(0);
      step(2).focus();
      fire(step(2), 'click', { detail: 0 });                                           // Enter or Space on the button: a click with no pointer
      expect([r.world.speed, document.activeElement === step(2)]).toEqual([2, true]);
      space();
      expect(r.world.speed).toBe(2);                                                   // Space belongs to the focused button
    } finally { r.cleanup(); }
  });
});

describe('v70 p review: the ghost is framed above the bar and the corner buttons (ruling 993)', () => {
  // extra: px of row added under the legend a farm turns on: the goal's strip (about 67 px) the review's shots had at 375x667 and 150% text, where the rows ran to about 226 and the corner buttons began at 293.
  for (const [width, height, text, extra] of [[375, 667, 150, 110], [375, 667, 100, 0], [390, 844, 150, 0]]) {
    it(`a farm picked at ${width}x${height} and ${text}% text${extra ? ` under a tall goal row` : ''}: its footprint is above the top of the corner buttons and the bar, and clear of the rows`, async () => {
      const r = await rigUI({ width, height });
      try {
        r.ui.settings.set({ textSize: text, reducedMotion: 'on', help: 'off' });
        r.world.milestone = 'capital';
        r.ui.refresh();
        if (extra) {
          const filler = document.createElement('div');
          filler.style.cssText = `height:${extra}px;width:10px;pointer-events:none`;
          filler.append(document.createTextNode(' '));                                   // (an empty row is display: none)
          r.root.querySelector('#under-bar').append(filler);
        }
        fire(r.root.querySelector('#dock .cat[data-category="food"]'), 'click');
        fire(r.root.querySelector('#dock .tray .card[data-item="farm_grain"]'), 'click');
        r.frame(0);
        const s = r.store.get();
        expect([document.body.dataset.layout, s.mode, Boolean(s.ghost)]).toEqual(['portrait', 'placing', true]);
        const { w, d } = dimsOf('farm_grain', s.tool.rot || 0);
        const ys = [[0, 0], [w, 0], [0, d], [w, d]].map(([dx, dy]) => tileToScreen(r.cam, { width, height }, s.ghost.x + dx, s.ghost.y + dy)[1]);
        const lowest = Math.max(...ys), highest = Math.min(...ys);
        const corners = [...r.root.querySelectorAll('#corners .group')].filter((n) => n.getBoundingClientRect().height > 0).map((n) => n.getBoundingClientRect().top);
        const bar = r.root.querySelector('#confirm .confirm').getBoundingClientRect().top;
        expect(corners.length).toBeGreaterThan(0);
        const rowsEnd = r.root.querySelector('#under-bar').getBoundingClientRect().bottom;
        expect([highest >= rowsEnd - 2, lowest <= Math.min(...corners), lowest <= bar]).toEqual([true, true, true]);
      } finally { r.cleanup(); }
    });
  }
  it('Show me for a farm far down the screen at 375x667 and 150% text brings the whole ghost up above the corner buttons, and below the rows', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150, motion: 'still', help: 'off' });
      r.world.milestone = 'capital';
      r.ui.refresh();
      const filler = document.createElement('div');
      filler.style.cssText = 'height:110px;width:10px;pointer-events:none';
      filler.append(document.createTextNode(' '));
      r.root.querySelector('#under-bar').append(filler);
      r.ui.showMeAt({ category: 'food', item: 'farm_grain', x: 5, y: 27 });           // the fertile land's far south, low on the screen
      r.frame(0);
      const s = r.store.get();
      expect([s.mode, Boolean(s.ghost)]).toEqual(['placing', true]);
      const { w, d } = dimsOf('farm_grain', s.tool.rot || 0);
      const ys = [[0, 0], [w, 0], [0, d], [w, d]].map(([dx, dy]) => tileToScreen(r.cam, { width: 375, height: 667 }, s.ghost.x + dx, s.ghost.y + dy)[1]);
      const corners = Math.min(...[...r.root.querySelectorAll('#corners .group')].filter((n) => n.getBoundingClientRect().height > 0).map((n) => n.getBoundingClientRect().top));
      const rowsEnd = r.root.querySelector('#under-bar').getBoundingClientRect().bottom;
      expect([Math.max(...ys) <= corners, Math.min(...ys) >= rowsEnd - 2]).toEqual([true, true]);
    } finally { r.cleanup(); }
  });
});

// A 32 x 32 test city: fertile land on x < 8; a road along y = 10 unless asked otherwise, no granary.
function whyRig({ road = false } = {}) {
  const world = makeTestWorld({ gold: 5000 });
  world.milestone = 'capital';
  if (road) setRoad(world, 0, 10, 31, 10);
  const store = createStore({ ...INITIAL_UI_STATE, inputType: 'mouse' });
  const pl = createPlacement({ world, store, afterCommand: () => {}, effects: { puff() {}, rise() {} }, now: () => 0 });
  return { world, store, pl };
}
const previewAt = (r, type, x, y) => { r.pl.start({ kind: 'building', type }, { x, y }); r.pl.moveGhost(x, y); return r.pl.preview(); };

describe('v70 p review: the placing bar\'s why line says only what no chip says (ruling 992)', () => {
  it('a farm with 2 of 4 squares fertile and no road shows no why line: the chips say both', () => {
    const r = whyRig();
    const p = previewAt(r, 'farm_grain', 7, 20);
    expect([p.state, p.conditions.some((c) => c.key === 'ground' && c.state === 'cant'), p.why, p.needs]).toEqual(['bad', true, '', '']);
  });
  it('adding one taken square: only the count of squares taken is said', () => {
    const r = whyRig();
    addRaw(r.world, 'well', 7, 21);
    const p = previewAt(r, 'farm_grain', 7, 20);
    expect([p.state, p.why]).toEqual(['bad', `${W.leadCant}: ${W.taken(1, 4)}`]);
  });
  it('a road one tile away shows the clause the chip does not say: one tile away does not count', () => {
    const r = whyRig({ road: true });
    const p = previewAt(r, 'farm_grain', 2, 7);
    expect([p.state, p.why]).toEqual(['warn', `${W.leadLater}: ${W.road.near}`]);
    expect(p.why.includes('one tile away does not count')).toBe(true);
    const far = previewAt(r, 'farm_grain', 2, 4);                                      // no road near at all: the chip's "No road yet" is the whole of it
    expect([far.state, far.why]).toEqual(['warn', '']);
  });
  it('the met state keeps its Needs line', () => {
    const r = whyRig({ road: true });
    addRaw(r.world, 'granary', 4, 11);
    const p = previewAt(r, 'farm_grain', 2, 8);
    expect([p.state, p.why, p.needs.startsWith(W.needsHead)]).toEqual(['ok', '', true]);
  });
  it('in the bar: a refused farm with the chips saying it all has no why line, and the older reason line is hidden with it; a taken square brings the line back', async () => {
    const r = await rigUI();
    try {
      r.world.milestone = 'capital';
      r.ui.placement.start({ kind: 'building', type: 'farm_grain' }, { x: 7, y: 20 });
      r.ui.placement.moveGhost(7, 20);
      r.ui.refresh();
      const bar = r.root.querySelector('#confirm .confirm');
      const reason = bar.querySelector('.reason');
      expect([bar.querySelector('.why'), reason && getComputedStyle(reason).display, bar.querySelectorAll('.conds .cond.cant').length > 0]).toEqual([null, 'none', true]);
      addRaw(r.world, 'well', 7, 21);
      r.ui.placement.moveGhost(7, 20);
      r.ui.refresh();
      expect(r.root.querySelector('#confirm .why').textContent).toBe(`${W.leadCant}: ${W.taken(1, 4)}`);
    } finally { r.cleanup(); }
  });
});

describe('v70 p review: the lesson card hands focus back (aria-modal)', () => {
  function cardRig() {
    const m = mount('<div id="ui"><button id="a">A</button><button id="b">B</button><div id="lesson"><button class="show-me">Show me</button></div></div>');
    const card = createLessonCard({ root: m.root, doc: document, store: { get: () => ({}) }, onGo: () => card.hide(), onLeave: () => {} });
    return { m, card, a: m.root.querySelector('#a'), b: m.root.querySelector('#b'), docked: m.root.querySelector('#lesson .show-me') };
  }
  const up = (r) => r.card.show({ label: 'Step 1 of 14', text: 'Lay a road.', goLabel: 'Show me', picture: null });
  it('is a modal dialog, and Enter on its button puts focus back on the button that had it', () => {
    const r = cardRig();
    try {
      r.a.focus();
      up(r);
      expect([r.card.card.getAttribute('role'), r.card.card.getAttribute('aria-modal'), document.activeElement === r.card.go]).toEqual(['dialog', 'true', true]);
      fire(r.card.go, 'click');                                                          // Enter on the focused button
      expect([r.card.isUp(), document.activeElement === r.a]).toEqual([false, true]);
    } finally { r.card.destroy(); r.m.cleanup(); }
  });
  it('goes to the docked row\'s Show me when what had focus is gone, and leaves focus alone when none was inside the card', () => {
    const r = cardRig();
    try {
      r.b.focus();
      up(r);
      r.b.remove();
      fire(r.card.go, 'click');
      expect(document.activeElement === r.docked).toBe(true);
      r.a.focus();
      up(r);
      r.a.focus();                                                                       // focus left the card before it closed
      r.card.hide();
      expect(document.activeElement === r.a).toBe(true);
    } finally { r.card.destroy(); r.m.cleanup(); }
  });
});

describe('v70 p review: a phone\'s top bar that overflows wears the small pictures (ruling 994)', () => {
  for (const gold of [19322, 99999]) {
    it(`at 375x667 and 100% text with ${gold} gold, the date is not clipped, clear of the score chip and left of the Advice button`, async () => {
      const w = uiWorld();
      w.milestone = 'capital';
      w.gold = gold;
      w.day = 2 * 360 + 8 * 30;
      Object.values(w.buildings).find((b) => b.type === 'house').residents = 1057;     // a real city's four-digit people, as in the review's shot
      const r = await rigUI({ width: 375, height: 667, world: w });
      try {
        r.ui.settings.set({ textSize: 100, reducedMotion: 'on', help: 'off' });
        r.world.gold = gold;                                                           // (the start's goals may have paid a little more)
        r.ui.refresh();
        const stats = r.root.querySelector('#topbar .stats'), date = r.root.querySelector('#topbar .stat.date .value').getBoundingClientRect();
        const chip = r.root.querySelector('#topbar .score-chip'), advice = r.root.querySelector('#topbar .advice');
        const seen = (n) => Boolean(n) && !n.hidden && n.getBoundingClientRect().width > 0;
        const rows = new Set([...stats.querySelectorAll('.stat')].filter((st) => st.offsetParent !== null).map((st) => st.offsetTop));
        expect([rows.size, stats.scrollWidth <= stats.clientWidth + 1, r.root.querySelector('#topbar .stat.gold .value').textContent]).toEqual([1, true, String(gold)]);
        expect(date.right <= stats.getBoundingClientRect().right + 0.5).toBe(true);
        if (seen(chip)) { const c = chip.getBoundingClientRect(); expect(date.right <= c.left || date.left >= c.right || date.bottom <= c.top || date.top >= c.bottom).toBe(true); }
        if (seen(advice)) expect(date.right <= advice.getBoundingClientRect().left + 0.5).toBe(true);
        expect([seen(chip), seen(advice)]).toEqual([true, true]);                      // (both are on the bar, so the two checks above ran)
      } finally { r.cleanup(); }
    });
  }
  it('goes back to words when the numbers shrink again, and a short number never wears the pictures', async () => {
    const w = uiWorld();
    w.milestone = 'capital';
    w.gold = 99999;
    const r = await rigUI({ width: 375, height: 667, world: w });
    try {
      r.ui.refresh();
      const stats = r.root.querySelector('#topbar .stats');
      w.gold = 120;
      r.ui.refresh();
      expect(stats.classList.contains('iconic')).toBe(false);
    } finally { r.cleanup(); }
  });
});

describe('v70 p review: words that stay readable on dimmed and refused controls (rulings 998)', () => {
  it('with Sound Off the Music label is ink-soft at 4.5:1 or more, with no opacity, and the row has a dashed edge', async () => {
    const r = await rigUI();
    try {
      r.ui.settings.set({ sound: false });
      r.store.set(openSheet(r.store.get(), 'settings'));
      const sheet = r.root.querySelector('#sheet');
      const row = sheet.querySelector('.row.silenced');
      const label = row.querySelector('span');
      expect([getComputedStyle(row).opacity, getComputedStyle(row).borderBottomStyle, contrastIn(label, sheet) >= 4.5]).toEqual(['1', 'dashed', true]);
      for (const b of row.querySelectorAll('button')) expect([b.textContent, contrastIn(b, b) >= 4.5]).toEqual([b.textContent, true]);
    } finally { r.cleanup(); }
  });
  it('a route the city cannot open reads at 4.5:1 or more, flat, with a dashed edge', async () => {
    const w = uiWorld();
    w.milestone = 'capital';
    w.gold = 10;
    addRaw(w, 'trading_post', 16, 11);
    staffAll(w);
    const r = await rigUI({ world: w, width: 390, height: 844 });
    try {
      r.world.gold = 10;                                                               // (the start's goals may have paid a little more)
      r.store.set(openSheet(r.store.get(), 'trade'));
      const open = r.root.querySelector('#sheet .open-route:disabled');                // Byblos: 600 gold would put the treasury more than 500 in debt
      expect([Boolean(open), open && open.disabled]).toEqual([true, true]);
      expect([getComputedStyle(open).opacity, getComputedStyle(open).borderTopStyle, contrastIn(open, open) >= 4.5]).toEqual(['1', 'dashed', true]);
    } finally { r.cleanup(); }
  });
});
