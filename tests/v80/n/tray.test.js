// Version 8.0 (Track N, rulings 1160-1164): the message tray. Every toast shows for about 4 seconds and folds into a tray behind the scroll button at the top right, which counts what has not
// been read; the tray lists the last 30 messages, newest first, each opening its place on the map where it has one; raids, fires and events that need a decision stay pinned at the top until
// they are dealt with; no new top-bar button; 7.1.1's rules (no toast over a lesson card, the close button) hold.
import { describe, it, expect } from '../../harness.js';
import { createTray, TRAY_MAX, PINNED_CODES } from '../../../src/ui/tray.js';
import { createToasts } from '../../../src/ui/toasts.js';
import { TOAST_MS } from '../../../src/data/ui.js';
import { TRAY_TEXT } from '../../../src/ui/text.js';
import { igniteBuilding } from '../../../src/sim/fire.js';
import { housesOf, allBuildings } from '../../../src/sim/world.js';
import { mount, fire, key } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { contrastIn } from '../../helpers/contrast.js';
import { pageAt, cardOf, frame } from '../../v711/lessonPage.js';
import { eventWorld, offer, YEAR } from '../../v70/e/helpers.js';

const bar = (r) => r.root.querySelector('#topbar');
const scroll = (r) => r.root.querySelector('#topbar .advice');
const sheetItems = (r) => [...r.root.querySelectorAll('#sheet .tray-item')];
const lay = (r, x, y) => { r.ui.placement.start({ kind: 'houses' }); r.ui.placement.toggleTile(x, y); return r.ui.placement.confirm(); };

describe('v80 n tray: the tray itself', () => {
  it('keeps the last 30 messages, newest first, counts the unread and drops one on request', () => {
    const t = createTray();
    const seen = [];
    t.subscribe((why) => seen.push(why));
    for (let i = 1; i <= TRAY_MAX + 5; i++) t.add(`Message ${i}`, { at: i % 2 ? { x: i, y: 2 } : null });
    const list = t.list();
    expect([TRAY_MAX, list.length, list[0].text, list[list.length - 1].text]).toEqual([30, 30, 'Message 35', 'Message 6']);
    expect([t.unread(), list[0].at, list[1].at]).toEqual([30, { x: 35, y: 2 }, null]);
    t.markRead();
    expect([t.unread(), seen[seen.length - 1]]).toEqual([0, 'read']);
    const id = t.add('One more');
    expect(t.unread()).toBe(1);
    t.drop(id);
    expect([t.list()[0].text, t.unread(), t.add('   ')]).toEqual(['Message 35', 0, null]);   // blank words are not kept
  });
  it('pins the alerts that need a decision, and only those', () => {
    expect([...PINNED_CODES].sort()).toEqual(['city_event', 'court_letter', 'debt', 'fire', 'raid', 'raid_warning', 'save_failed']);
  });
});

describe('v80 n tray: toasts fold into it', () => {
  it('a toast shows for TOAST_MS (about 4 seconds), is kept in the tray as it shows, and one held back by a card is kept too', () => {
    const { root, cleanup } = mount();
    const tray = createTray();
    const timers = [];
    let held = false;
    const toasts = createToasts({ container: root, setTimer: (fn, ms) => { timers.push(ms); return timers.length; }, clearTimer: () => {}, held: () => held, record: (text, o) => tray.add(text, o), forget: (id) => tray.drop(id) });
    toasts.show('Road laid', { at: { x: 3, y: 4 } });
    expect([TOAST_MS, timers]).toEqual([4000, [4000]]);
    held = true;
    expect(toasts.show('Well placed')).toBe(null);                                         // no toast over a lesson card (7.1.1), but the message is not lost
    toasts.show('Update ready', { keep: true, close: 'Close' });
    toasts.show('Quiet', { tray: false });
    expect(tray.list().map((m) => m.text)).toEqual(['Well placed', 'Road laid']);          // a kept toast and one marked tray: false stay out
    expect(tray.list()[1].at).toEqual({ x: 3, y: 4 });
    cleanup();
  });
  it('an Undo that is used takes its message out of the tray', () => {
    const { root, cleanup } = mount();
    const tray = createTray();
    const toasts = createToasts({ container: root, setTimer: () => 1, clearTimer: () => {}, record: (text, o) => tray.add(text, o), forget: (id) => tray.drop(id) });
    toasts.show('Well placed', { action: 'Undo', onAction: () => {} });
    expect(tray.list().length).toBe(1);
    fire(root.querySelector('.action'), 'click');
    expect(tray.list().length).toBe(0);
    cleanup();
  });
});

describe('v80 n tray: behind the scroll button', () => {
  it('adds no top-bar button: the bar holds the numbers, the scroll button and the menu, as in 7.1.1', async () => {
    const r = await rigUI();
    try {
      lay(r, 20, 9);
      const buttons = [...bar(r).querySelectorAll(':scope > button, :scope > .speed button')].filter((b) => !b.hidden).map((b) => b.className.split(' ')[0]);
      expect(buttons.filter((c) => c === 'advice').length).toBe(1);
      // Version 8.1 (Track B): the numbers are a group of their own buttons (one per stat), so the bar's own buttons are the scroll and the menu.
      expect([bar(r).querySelectorAll(':scope > button').length, bar(r).querySelectorAll(':scope > .stats > button.stat').length]).toEqual([2, 5]);
    } finally { r.cleanup(); }
  });

  it('a placement shows a toast, the scroll button counts it and says so in its name, and opening it lists the message with a Show that goes to the place and rings it', async () => {
    const r = await rigUI();
    try {
      expect([scroll(r).querySelector('.advice-count').hidden, scroll(r).getAttribute('aria-label')]).toEqual([true, 'City advice']);
      lay(r, 20, 9);
      const n = scroll(r).querySelector('.advice-count'), count = Number(n.textContent), dot = !scroll(r).querySelector('.advice-dot').hidden;
      // the plot's own toast, and the captions the first plot brings (a first, a goal): each is a message
      expect([n.hidden, count >= 1, count === r.ui.tray.unread(), scroll(r).getAttribute('aria-label')]).toEqual([false, true, true, TRAY_TEXT.buttonName(count, dot)]);
      expect(r.root.querySelectorAll('#toasts .toast').length).toBe(1);
      fire(scroll(r), 'click');
      expect([r.store.get().sheet.kind, r.root.querySelector('#sheet h2').textContent]).toEqual(['advice', TRAY_TEXT.sheetTitle]);
      const first = sheetItems(r).find((row) => row.querySelector('.tray-go') && row.querySelector('.text').textContent.toLowerCase().includes('plot'));
      expect(first.querySelector('.text').textContent.toLowerCase().includes('plot')).toBe(true);
      expect([scroll(r).querySelector('.advice-count').hidden, scroll(r).getAttribute('aria-label')]).toEqual([true, 'City advice']);   // opened: read
      const go = first.querySelector('.tray-go');
      const box = go.getBoundingClientRect();
      expect([go.getAttribute('aria-label'), Math.round(box.width) >= 44, Math.round(box.height) >= 44]).toEqual([TRAY_TEXT.showLabel(first.querySelector('.text').textContent), true, true]);
      r.cam.x = 2; r.cam.y = 2;
      fire(go, 'click');
      r.ui.cameraControl.tick(1e9);                                                         // (the rig's clock stands still: let the glide end)
      expect(r.store.get().sheet).toBe(null);                                               // one panel at a time: the sheet goes and the map shows
      expect([Math.round(r.cam.x * 2) / 2, Math.round(r.cam.y * 2) / 2]).toEqual([20.5, 9.5]);
    } finally { r.cleanup(); }
  });

  it('with five or more messages the tray lists them newest first (the last 30 at most), and a message with no place has no Show', async () => {
    const r = await rigUI();
    try {
      for (let i = 0; i < 6; i++) lay(r, 16 + i, 9);
      r.ui.toasts.show('A message with no place');
      fire(scroll(r), 'click');
      const rows = sheetItems(r);
      expect(rows.length >= 7).toBe(true);
      expect([rows[0].querySelector('.text').textContent, rows[0].querySelector('.tray-go')]).toEqual(['A message with no place', null]);
      expect(rows[1].querySelector('.text').textContent.toLowerCase().includes('plot') && Boolean(rows[1].querySelector('.tray-go'))).toBe(true);   // newest first: the last plot's message is next
      for (let i = 0; i < 40; i++) r.ui.toasts.show(`Note ${i}`);
      fire(scroll(r), 'click');                                                              // closed
      fire(scroll(r), 'click');
      const all = sheetItems(r).filter((x) => !x.classList.contains('pinned'));
      expect([all.length, all[0].querySelector('.text').textContent, all[29].querySelector('.text').textContent]).toEqual([30, 'Note 39', 'Note 10']);
    } finally { r.cleanup(); }
  });

  it('a message arriving while the tray is open appears at the top at once', async () => {
    const r = await rigUI();
    try {
      lay(r, 20, 9);
      fire(scroll(r), 'click');
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // (focus inside the sheet keeps it from being rebuilt under the player)
      r.ui.toasts.show('Caravan arrived');
      expect(sheetItems(r)[0].querySelector('.text').textContent).toBe('Caravan arrived');
    } finally { r.cleanup(); }
  });

  it('captions (a goal done, a first, a caravan) are kept in the tray too', async () => {
    const r = await rigUI();
    try {
      r.ui.celebrations.show({ tier: 'first', lead: 'Goal done: ', text: 'Lay a road', why: 'Roads carry people', at: { x: 7, y: 10 } });
      fire(scroll(r), 'click');
      const [row] = sheetItems(r);
      expect([row.querySelector('.text').textContent, Boolean(row.querySelector('.tray-go'))]).toEqual(['Goal done: Lay a roadRoads carry people', true]);
    } finally { r.cleanup(); }
  });

  it('a fire is pinned at the top of the tray, above the messages, with its mark in words, and goes when the fire is out', async () => {
    const r = await rigUI();
    try {
      lay(r, 20, 9);
      const house = housesOf(r.world)[0];
      expect(igniteBuilding(r.world, house.id)).toBeTruthy();
      r.ui.refresh();
      expect(Number(scroll(r).querySelector('.advice-count').textContent) >= 2).toBe(true);   // the messages not yet read, and the pinned alert
      fire(scroll(r), 'click');
      const rows = sheetItems(r);
      expect(rows[0].classList.contains('pinned')).toBe(true);
      expect(rows[0].querySelector('.pin').textContent).toContain(TRAY_TEXT.pinnedMark);
      expect([rows.filter((x) => x.classList.contains('pinned')).length, rows[1].classList.contains('pinned')]).toEqual([1, false]);
      const go = rows[0].querySelector('.tray-go');
      expect(go.textContent).toBe(TRAY_TEXT.showMe);
      const weak = [[rows[0].querySelector('.pin'), rows[0]], [rows[0].querySelector('strong'), rows[0]], [go, rows[0]], [rows[1].querySelector('.text span'), rows[1]], [scroll(r).querySelector('.advice-count'), scroll(r).querySelector('.advice-count')]].filter(([n, stop]) => contrastIn(n, stop) < 4.5);
      expect(weak.map(([n]) => n.className)).toEqual([]);                                  // 4.5:1 for the pinned mark, its words, the Show button, a message and the number on the button
      go.focus();
      expect(document.activeElement).toBe(go);                                             // a real button, in the tab order: Enter or Space on it is its click
      fire(go, 'click');
      expect(r.store.get().sheet.kind).toBe('info');                                         // a fire's Show selects the burning building, as the banner's View does
      r.world.buildings[house.id].fire = null;
      r.ui.refresh();
      fire(scroll(r), 'click');
      expect(r.store.get().sheet.kind === 'advice' ? sheetItems(r).some((x) => x.classList.contains('pinned')) : null).toBe(false);
    } finally { r.cleanup(); }
  });

  it('an event that waits for an answer is pinned (the sim\'s own alert), Open takes the player to its card, and answering it unpins it', async () => {
    const w = eventWorld({ gold: 5000 });
    w.day = 3 * YEAR; w.speed = 0;
    offer(w, 'envoy');
    const r = await rigUI({ world: w });
    try {
      r.ui.refresh();
      r.ui.celebrations.show({ tier: 'info', text: 'Something happened' });
      fire(scroll(r), 'click');
      const rows = sheetItems(r);
      expect([rows[0].classList.contains('pinned'), rows[0].dataset.code, rows[1].classList.contains('pinned')]).toEqual([true, 'city_event', false]);
      const go = rows[0].querySelector('.tray-go');
      expect(go.textContent).toBe(TRAY_TEXT.open);
      fire(go, 'click');
      expect(r.store.get().sheet.kind).toBe('cityEvent');
      w.cityEvents.waiting = null;
      r.ui.refresh();
      fire(scroll(r), 'click');
      fire(scroll(r), 'click');
      expect(sheetItems(r).some((x) => x.classList.contains('pinned'))).toBe(false);
    } finally { r.cleanup(); }
  });

  it('the sheet is the City advice it was while there is no message and nothing pinned', async () => {
    const r = await rigUI();
    try {
      r.ui.refresh();
      fire(scroll(r), 'click');
      expect([r.root.querySelector('#sheet h2').textContent, r.root.querySelectorAll('#sheet .tray').length]).toEqual(['City advice', 0]);
    } finally { r.cleanup(); }
  });

  it('keeps 7.1.1\'s rules: no toast over a lesson card (the message is still in the tray), and the Undo toast has its close button', async () => {
    const s = await pageAt('workers');
    try {
      expect(Boolean(cardOf(s))).toBe(true);
      expect(s.g().ui.toasts.show('Well placed', { at: { x: 5, y: 5 } })).toBe(null);
      expect(s.root.querySelectorAll('#toasts .toast').length).toBe(0);
      s.root.querySelector('.lesson-card .lc-go').click();
      await frame();
      s.g().ui.afterCommand({ kind: 'building', result: { ok: true }, text: 'Plots placed', undoable: true });
      const t = s.root.querySelector('#toasts .toast');
      expect([Boolean(t.querySelector('.close')), t.querySelector('.action').textContent]).toEqual([true, 'Undo']);
      fire(s.root.querySelector('#topbar .advice'), 'click');
      const texts = [...s.root.querySelectorAll('#sheet .tray-item .text')].map((n) => n.textContent);
      expect(texts.includes('Well placed') && texts.includes('Plots placed')).toBe(true);
    } finally { s.cleanup(); }
  });

  it('the scroll button stays 44 px and inside the bar with a number on it, at 375x667 and 150% text', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150 });
      lay(r, 20, 9);
      for (let i = 0; i < 12; i++) r.ui.toasts.show(`Note ${i}`);
      const q = scroll(r).getBoundingClientRect(), b = bar(r).getBoundingClientRect(), menu = r.root.querySelector('#topbar .menu').getBoundingClientRect();
      expect([scroll(r).querySelector('.advice-count').textContent, Math.round(q.width) >= 44, Math.round(q.height) >= 44, q.right <= b.right + 0.5, q.right <= menu.left + 0.5]).toEqual(['9+', true, true, true, true]);
      key(r.root, 'Escape');
    } finally { r.cleanup(); }
  });
});
