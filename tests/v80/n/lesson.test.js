// Version 8.0 (Track N, rulings 1170-1172): the lesson fixes. (a) The view and the ring follow each step's own target (the friend's view stayed on the bazaar through the tower step); (b) the tray card
// and category a step asks for pulse with the same ring the map wears; (c) Leave the lesson is in the menu while a lesson runs, no longer on the card or the docked row, and Skip stays on the first
// card as a tertiary text button.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { LESSON_SCRIPT, stepSpot } from '../../../src/sim/lesson.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { V711_TEXT, D2_TEXT } from '../../../src/ui/text.js';
import { fire } from '../../helpers/dom.js';
import { pageAt, cardOf, rect, frame, stepIndex } from '../../v711/lessonPage.js';

const W = 390, H = 844;
// The middle of the map a phone held upright leaves free (src/ui/v60/lesson.js freeInsets): 30% under the top, 34% above the bottom.
const FREE = { x: W / 2, y: H * 0.3 + (H - H * 0.3 - H * 0.34) / 2 };
const centreOf = (spot) => ({ x: spot.x + spot.w / 2, y: spot.y + spot.d / 2 });

describe('v80 n lesson: the view follows each step\'s own target', () => {
  it('every step that points at a place is framed in the middle of the free map when it begins', async () => {
    const wrong = [];
    for (const step of LESSON_STEPS) {
      const s = await pageAt(step.id, { width: W, height: H });
      try {
        const g = s.g();
        const spot = stepSpot(g.world, step);
        if (!spot) continue;
        const c = centreOf(spot);
        const [sx, sy] = tileToScreen(g.cam, { width: W, height: H }, c.x, c.y);
        if (Math.abs(sx - FREE.x) > 2 || Math.abs(sy - FREE.y) > 2) wrong.push(`${step.id}: at ${Math.round(sx)},${Math.round(sy)} not ${FREE.x},${Math.round(FREE.y)}`);
      } finally { s.cleanup(); }
    }
    expect(wrong).toEqual([]);
  });

  it('after the fire step (which aims at the bazaar) the tower step moves the view to the tower\'s own tile', async () => {
    const s = await pageAt('fire', { width: W, height: H });
    try {
      const g = s.g();
      const at = (step) => { const c = centreOf(stepSpot(g.world, LESSON_STEPS[stepIndex(step)])); return tileToScreen(g.cam, { width: W, height: H }, c.x, c.y); };
      const [fx, fy] = at('fire');
      expect([Math.abs(fx - FREE.x) <= 2, Math.abs(fy - FREE.y) <= 2]).toEqual([true, true]);   // the bazaar is in the middle during the fire step
      s.root.querySelector('.lesson-card .lc-go').click();
      LESSON_SCRIPT.fire(g.world, s.io);                                                         // the fire is put out: the tower step begins
      await frame();
      expect(s.root.querySelector('#lesson').dataset.step).toBe('tower');
      const [tx, ty] = at('tower');
      expect([Math.abs(tx - FREE.x) <= 2, Math.abs(ty - FREE.y) <= 2]).toEqual([true, true]);   // and now the tower's tile is
      const bazaar = stepSpot(g.world, LESSON_STEPS[stepIndex('fire')]);
      const [bx, by] = tileToScreen(g.cam, { width: W, height: H }, centreOf(bazaar).x, centreOf(bazaar).y);
      expect(Math.abs(by - FREE.y) > 2 || Math.abs(bx - FREE.x) > 2).toBe(true);                // the bazaar is no longer where the view's focus sits
    } finally { s.cleanup(); }
  });

  it('the ring follows the step\'s target while the card is down: the tower step rings the tower\'s tile, not the bazaar', async () => {
    const s = await pageAt('tower', { width: W, height: H });
    try {
      s.root.querySelector('.lesson-card .lc-go').click();
      await frame();
      const ring = s.root.querySelector('.lesson-ring');
      expect(ring.hidden).toBe(false);
      const c = centreOf(stepSpot(s.g().world, LESSON_STEPS[stepIndex('tower')]));
      const [sx, sy] = tileToScreen(s.g().cam, { width: W, height: H }, c.x, c.y);
      const q = rect(ring), mid = { x: (q.left + q.right) / 2 - rect(s.root).left, y: (q.top + q.bottom) / 2 - rect(s.root).top };
      expect([Math.abs(mid.x - sx) <= 2, Math.abs(mid.y - sy) <= 2]).toEqual([true, true]);
    } finally { s.cleanup(); }
  });
});

describe('v80 n lesson: the tray card and category the step needs pulse with the map\'s ring', () => {
  it('the well step: the services category and the well card carry the lesson-pulse ring, and nothing else does', async () => {
    const s = await pageAt('well', { width: W, height: H });
    try {
      s.root.querySelector('.lesson-card .lc-go').click();
      await frame();
      const cat = s.root.querySelector('#dock .cat[data-category="services"]');
      expect(cat.classList.contains('lesson-pulse')).toBe(true);
      expect([...s.root.querySelectorAll('#dock .cat.lesson-pulse')].length).toBe(1);
      fire(cat, 'click');
      await frame();
      const pulsing = [...s.root.querySelectorAll('#dock .tray .card.lesson-pulse')].map((c) => c.dataset.item);
      expect(pulsing).toEqual(['well']);
      const outline = getComputedStyle(s.root.querySelector('#dock .tray .card.lesson-pulse')).outlineStyle;
      const ringOutline = getComputedStyle(s.root.querySelector('.lesson-ring')).borderTopStyle;
      expect([outline, ringOutline]).toEqual(['solid', 'solid']);                                // the same ring style: a solid teal line
      expect(getComputedStyle(s.root.querySelector('#dock .tray .card.lesson-pulse')).outlineColor).toBe(getComputedStyle(s.root.querySelector('.lesson-ring')).borderTopColor);
    } finally { s.cleanup(); }
  });
});

describe('v80 n lesson: Leave the lesson moves to the menu', () => {
  it('the step card has one button (and Skip on the first), the docked row has no Leave, and the menu has Leave the lesson while a lesson runs', async () => {
    const s = await pageAt('road', { width: W, height: H });
    try {
      const card = cardOf(s);
      expect([card.querySelector('.lc-leave'), card.querySelectorAll('.lc-actions button').length]).toEqual([null, 2]);
      const skip = card.querySelector('.lc-skip');
      expect([skip.hidden, skip.textContent, skip.classList.contains('tertiary'), skip.classList.contains('primary'), rect(skip).height >= 44]).toEqual([false, V711_TEXT.skip, true, false, true]);
      s.root.querySelector('.lesson-card .lc-go').click();
      await frame();
      expect([s.root.querySelector('#lesson .leave'), s.root.querySelector('#lesson button.leave')]).toEqual([null, null]);
      expect(s.root.textContent.includes(D2_TEXT.leave) && Boolean(s.root.querySelector('.lesson-card:not([hidden]) .lc-leave'))).toBe(false);
      fire(s.root.querySelector('#topbar .menu'), 'click');
      await frame();
      const leave = s.root.querySelector('#sheet .leave-lesson');
      expect([Boolean(leave), leave && leave.textContent, leave && rect(leave).height >= 44]).toEqual([true, D2_TEXT.menuLeave, true]);
      fire(leave, 'click');
      await frame();
      expect(s.g().ui.store.get().confirmDialog.text).toBe(D2_TEXT.leaveConfirm);              // it still asks first
    } finally { s.cleanup(); }
  });

  it('on a later step the card has just its one button, and Tab stays on it', async () => {
    const s = await pageAt('homes', { width: W, height: H });
    try {
      const card = cardOf(s);
      expect([card.querySelectorAll('.lc-actions button:not([hidden])').length, card.querySelector('.lc-skip').hidden]).toEqual([1, true]);
    } finally { s.cleanup(); }
  });
});
