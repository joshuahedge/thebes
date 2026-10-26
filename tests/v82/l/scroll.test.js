// Version 8.2, Track L (ruling 1328): every in-game panel that can overflow on a phone scrolls by finger, and the page behind never moves. At 375x667 and 150% text (the tightest phone) each sheet, filled
// with long content, is taller than its box and scrolls (overflow-y auto, the overscroll kept inside it), with the sheet's heading staying put; so do the confirm dialog, the event cards and the lesson's
// chapter card. The phone's tray scrolls sideways, and a sideways swipe that starts on a card is the tray's, never a drag to build.
import { describe, it, expect } from '../../harness.js';
import { openSheet } from '../../../src/ui/modes.js';
import { dragIntent } from '../../../src/ui/v81/cardDrag.js';
import { installNoZoom } from '../../../src/ui/v81/noZoom.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';
import { addRaw } from '../../helpers/testWorld.js';
import { stepCard } from '../../helpers/lesson.js';
import { pageAt, frame } from '../../v711/lessonPage.js';

const scrolls = (n) => ['auto', 'scroll'].includes(getComputedStyle(n).overflowY);
const filler = (n, k = 60) => { for (let i = 0; i < k; i++) { const p = document.createElement('p'); p.textContent = `Long content line ${i}: enough words to run past the edge of a small screen when the text is large.`; n.append(p); } };
const KINDS = ['summary', 'goals', 'trade', 'advice', 'menu', 'settings', 'help', 'about', 'tribute', 'letter', 'court', 'sealReign', 'shareScore', 'minimap'];

describe('v82 l scroll: sheets scroll by finger on a phone at 150% text', () => {
  it('every sheet that opens (a building, the summary and its explainers, Goals, Trade, Advice, the menu, Options, How to play, About, the court and its letter...) scrolls, with its heading kept in view', async () => {
    const w = uiWorld(); w.milestone = 'capital';
    const house = addRaw(w, 'house', 10, 10);
    const r = await rigUI({ world: w, width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.frame();
      const sheet = r.root.querySelector('#sheet'), opened = [], wrong = [];
      const check = (name, id = null, kind = name) => {
        r.store.set(openSheet(r.store.get(), kind, id));
        r.frame();
        if (sheet.hidden) return;
        opened.push(name);
        const body = sheet.querySelector('.body') || sheet;
        filler(body);
        const head = sheet.querySelector('.head');
        const cs = getComputedStyle(sheet);
        const before = document.scrollingElement.scrollTop;
        sheet.scrollTop = 400;
        const okHead = !head || getComputedStyle(head).position === 'sticky';
        const row = [scrolls(sheet), sheet.scrollHeight > sheet.clientHeight, cs.overscrollBehaviorY === 'contain', okHead, sheet.scrollTop > 0, document.scrollingElement.scrollTop === before];
        if (row.some((x) => !x)) wrong.push(`${name}: ${row.join(',')}`);
        if (head) { const hb = head.getBoundingClientRect(), sb = sheet.getBoundingClientRect(); if (hb.top < sb.top - 1 || hb.top > sb.top + 2) wrong.push(`${name}: heading moved ${hb.top} vs ${sb.top}`); }
        r.store.set({ sheet: null });
      };
      check('info', house.id);
      for (const kind of KINDS) check(kind);
      check('summary#forecast', 'forecast', 'summary');
      check('summary#mood', 'mood', 'summary');
      expect(wrong).toEqual([]);
      expect(opened.length).toBeGreaterThanOrEqual(8);                                         // the sheets a bare city can open
      for (const must of ['info', 'summary', 'goals', 'trade', 'advice', 'menu', 'settings', 'help']) expect([must, opened.includes(must)]).toEqual([must, true]);
    } finally { r.cleanup(); }
  });

  it('the confirm dialog, the lesson\'s chapter card and the picture cards scroll when their words overrun at 150% text, and the page never scrolls', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.store.set({ confirmDialog: { text: 'A long question. '.repeat(120), confirmLabel: 'Yes' } });
      r.frame();
      const box = r.root.querySelector('#dialog .box') || r.root.querySelector('#dialog');
      expect([scrolls(box), getComputedStyle(box).overscrollBehaviorY]).toEqual([true, 'contain']);
      expect(box.scrollHeight > box.clientHeight).toBe(true);
      expect(document.scrollingElement.scrollTop).toBe(0);
    } finally { r.cleanup(); }
    const s = await pageAt('well', { width: 375, height: 667, textSize: 150 });
    try {
      const card = stepCard(s.root);
      filler(card.querySelector('.lc-words'), 30);
      expect([scrolls(card), card.scrollHeight > card.clientHeight, getComputedStyle(card).overscrollBehaviorY]).toEqual([true, true, 'contain']);
      expect(document.scrollingElement.scrollTop).toBe(0);
    } finally { s.cleanup(); }
  });

  it('the picture cards (a first moment, an event) keep their words scrollable under a fixed picture and button', () => {
    const css = [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch { return []; } }).map((x) => x.cssText).join('\n');
    expect(/\.picture-cards \.pc-text \{[^}]*overflow-y: auto/.test(css)).toBe(true);
  });
});

describe('v82 l scroll: the phone\'s tray swipes sideways and a card still builds on an upward drag', () => {
  it('a sideways swipe that starts on a card is the tray\'s, an upward one carries the card, and the double-tap guard leaves a card\'s touches alone', () => {
    expect(dragIntent({ dx: 40, dy: 4, kind: 'touch', axis: 'x' })).toBe('scroll');
    expect(dragIntent({ dx: -40, dy: -10, kind: 'touch', axis: 'x' })).toBe('scroll');
    expect(dragIntent({ dx: 3, dy: -30, kind: 'touch', axis: 'x' })).toBe('start');
    expect(dragIntent({ dx: 30, dy: 3, kind: 'touch', axis: 'y' })).toBe('start');             // the wide panel's list scrolls up and down: sideways carries the card there
    let t = 0;
    const guard = installNoZoom({ now: () => t });
    const card = document.createElement('button'); card.className = 'card'; document.body.append(card);
    const end = () => { const ev = new Event('touchend', { bubbles: true, cancelable: true }); card.dispatchEvent(ev); return ev.defaultPrevented; };
    t = 1000; end(); t = 1100;
    expect(end()).toBe(false);                                                                 // two quick taps on a card are not swallowed
    guard.detach(); card.remove();
  });
});
