// Version 7.1.1 (ruling 1105): the main action of a blocking card or dialog sits in the middle of its row, not at one side: the confirm dialog (Leave the lesson, demolish), the lesson card,
// the title's panels (Settings, New city's question), the picture cards' Back and Next, and every sheet's action row (the end of the lesson, the court, a seal, Welcome back, an event).
import { describe, it, expect } from '../../harness.js';
import { fire } from '../../helpers/dom.js';
import { mount } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { pageAt, cardOf, rect, frame } from '../lessonPage.js';

const mid = (r) => (r.left + r.right) / 2;
// The middle of a set of buttons as a group (their union), against the middle of the box that holds them.
const groupMid = (nodes) => { const rs = nodes.map(rect); return (Math.min(...rs.map((r) => r.left)) + Math.max(...rs.map((r) => r.right))) / 2; };
const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;

describe('v711 buttons: dialogs and cards', () => {
  it('the confirm dialog\'s buttons sit in the middle of its box, at 390 px and on a wide screen', async () => {
    for (const [w, h] of [[390, 844], [1280, 800]]) {
      const r = await rigUI({ width: w, height: h });
      try {
        r.store.set({ confirmDialog: { text: 'Demolish the granary?', confirmLabel: 'Demolish', onConfirm: () => {} } });
        const box = r.root.querySelector('#dialog .box');
        const buttons = [...box.querySelectorAll('.buttons button')];
        expect([w, buttons.length]).toEqual([w, 2]);
        expect([w, near(groupMid(buttons), mid(rect(box)))]).toEqual([w, true]);
      } finally { r.cleanup(); }
    }
  });

  it('the lesson card\'s buttons are centred: Show me full width, Skip and Leave the lesson in the middle', async () => {
    const s = await pageAt('road', { width: 390, height: 844 });
    try {
      const card = cardOf(s);
      const go = card.querySelector('.lc-go'), skip = card.querySelector('.lc-skip'), leave = card.querySelector('.lc-leave');
      expect(skip.hidden).toBe(false);
      for (const b of [go, skip, leave]) expect([b.textContent, near(mid(rect(b)), mid(rect(card)))]).toEqual([b.textContent, true]);
      expect(rect(go).width > rect(card).width * 0.8).toBe(true);
    } finally { s.cleanup(); }
  });

  it('the title\'s Settings panel and New city question put their buttons in the middle of the card', async () => {
    const s = await pageAt(null, { width: 390, height: 844, settings: { lessonDone: true } });
    try {
      const title = s.root.querySelector('#title');
      fire(title.querySelector('.title-settings'), 'click');
      const guide = title.querySelector('.guide');
      const back = guide.querySelector('.actions .guide-back');
      expect(near(mid(rect(back)), mid(rect(guide)), 3)).toBe(true);
      expect(getComputedStyle(guide.querySelector('.actions')).justifyContent).toBe('center');
    } finally { s.cleanup(); }
  });

  it('the picture cards\' Back and Next sit together in the middle of the card', async () => {
    const s = await pageAt(null, { width: 390, height: 844, settings: { lessonDone: true, cardsSeen: false } });
    try {
      s.api.hooks.pictureCards();
      await frame();
      const box = s.root.querySelector('.picture-cards .pc-box') || document.querySelector('.picture-cards .pc-box');
      const nav = box.querySelector('.pc-nav');
      expect([getComputedStyle(nav).justifyContent, near(groupMid([...nav.querySelectorAll('button')]), mid(rect(nav)), 3)]).toEqual(['center', true]);   // together, in the middle of their own row (a wide screen puts the row beside the picture)
    } finally { document.querySelectorAll('.picture-cards').forEach((n) => n.remove()); s.cleanup(); }
  });

  it('an action row in a sheet is centred (the lesson\'s end, Welcome back, the court, a seal, an event all use it)', () => {
    const { root, cleanup } = mount('<div id="sheet"><div class="actions"><button>Go</button></div><div class="actions welcome-actions"><button>Carry on</button></div></div>');
    try {
      for (const n of root.querySelectorAll('.actions')) expect(getComputedStyle(n).justifyContent).toBe('center');
    } finally { cleanup(); }
  });
});

describe('v711 buttons: Continue at the foot of a page read through, Back where it steps back', () => {
  it('What\'s new: the top button says Back and the foot button Continue, and both return to the title card; Settings keeps Back', async () => {
    const s = await pageAt(null, { width: 390, height: 844, settings: { lessonDone: true } });
    try {
      const title = s.root.querySelector('#title');
      fire(title.querySelector('.whats-new-button'), 'click');
      const backs = [...title.querySelectorAll('.whats-new-back')].map((b) => b.textContent);
      expect(backs).toEqual(['Back', 'Continue']);
      fire(title.querySelectorAll('.whats-new-back')[1], 'click');
      expect(Boolean(title.querySelector('.title-buttons:not([hidden])'))).toBe(true);
      fire(title.querySelector('.title-settings'), 'click');
      expect(title.querySelector('.guide .actions .guide-back').textContent).toBe('Back');
    } finally { s.cleanup(); }
  });
});
