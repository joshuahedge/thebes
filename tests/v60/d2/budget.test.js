// Version 6.0 Track D2 (rulings 760-779): the lesson's row on a phone and a screen. It is the one guidance row of a lesson game, so the phone's height budget holds with it
// (the rows end by 30% of the height upright at 100% text and 40% at larger text, and by 40% held sideways), nothing is under 44 px, every control has a name, the words are
// cut at three lines with More and open in place, and the lit target (the ring and the dimming) never takes a tap. Its look at 1920x1080 is held too.
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { dockPlain } from '../../helpers/lesson.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
const index = (id) => LESSON_STEPS.findIndex((s) => s.id === id);

async function lessonAt(step, { width, height, text = 100 }) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, cardsSeen: true, textSize: text, motion: 'still', motionRig: true }) });
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams('nosw=1'), now: () => performance.now(), clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  api.hooks.lesson({ step: index(step) });
  const g = api.game();
  dockPlain(api);                                                                    // Version 7.0 (Track P): the step's card first; this file measures the row it docks to
  if (step === 'tower') { g.world.speed = 1; const { tickDay } = await import('../../../src/sim/clock.js'); const ev = []; tickDay(g.world, ev); g.ui.onEvents(ev); g.ui.refresh(); }
  await frame();
  return { api, g, root: shell.root, frameBox: shell.root.getBoundingClientRect(), cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title', 'lesson-on'); delete window.__thebes; } };
}

describe('v60 d2 the lesson\'s row fits a phone', () => {
  const SIZES = [[375, 667], [390, 844], [844, 390], [667, 375]];
  for (const text of [100, 125, 150]) {
    it(`ends inside the height budget on every phone at ${text}% text, for the longest steps (with a raid alert above it too)`, async () => {
      for (const [w, h] of SIZES) {
        for (const step of ['workers', 'tower', 'largeplot']) {
          const s = await lessonAt(step, { width: w, height: h, text });
          try {
            const row = s.root.querySelector('#lesson');
            const at = `${w}x${h} at ${text}% on ${step}`;
            const r = row.getBoundingClientRect();
            const compact = w > h;
            const limit = compact ? 0.4 : text === 100 ? 0.3 : 0.4;
            // ruling 172: the one row is the alert's; but not in the steps that are the alert's own (the tower step: the row carries the raid warning and its line goes, ruling 797)
            const names = document.body.classList.contains('lesson-names-alert');
            const hiddenForTheAlert = compact && text >= 125 && document.body.classList.contains('has-banner') && !names;
            if (hiddenForTheAlert) { expect([at, row.offsetParent]).toEqual([at, null]); continue; }
            if (names) for (const line of s.root.querySelectorAll('#banner > .critical[data-code="raid_warning"]')) expect([at, 'the warning line gives way to the row', getComputedStyle(line).display]).toEqual([at, 'the warning line gives way to the row', 'none']);
            expect([at, r.width > 0, (r.bottom - s.frameBox.top) / h <= limit]).toEqual([at, true, true]);
            const banner = s.root.querySelector('#banner');
            if (banner && banner.offsetParent !== null && banner.children.length) { const b = banner.getBoundingClientRect(); expect([at, 'no overlap with the alert row', b.bottom <= r.top + 1 || r.bottom <= b.top + 1]).toEqual([at, 'no overlap with the alert row', true]); }
            expect([at, r.right <= s.frameBox.right + 0.5, r.left >= s.frameBox.left - 0.5]).toEqual([at, true, true]);
            for (const b of row.querySelectorAll('button:not(.more)')) {
              if (b.hidden || b.offsetParent === null) continue;   // a phone's row has no x: the menu leaves the lesson
              const rb = b.getBoundingClientRect();
              expect([at, b.className, rb.width >= 44, rb.height >= 44, Boolean(b.getAttribute('aria-label') || b.textContent.trim())]).toEqual([at, b.className, true, true, true]);
            }
          } finally { s.cleanup(); }
        }
      }
    });
  }
  it('cuts the words at three lines on a phone with More, opens them in place and closes them again; nothing is cut on a wide screen', async () => {
    const s = await lessonAt('tower', { width: 375, height: 667, text: 150 });
    try {
      const row = s.root.querySelector('#lesson'), text = row.querySelector('.text'), more = row.querySelector('.more');
      const lines = (n) => Math.round(n.getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight));
      expect([lines(row.querySelector('.body')) <= 3, more.hidden]).toEqual([true, false]);
      expect([more.getAttribute('aria-expanded'), row.classList.contains('open')]).toEqual(['false', false]);
      more.click();
      const body = row.querySelector('.body');
      expect([more.getAttribute('aria-expanded'), row.classList.contains('open'), body.scrollHeight <= body.clientHeight + 1, row.querySelector('.why')]).toEqual(['true', true, true, null]);   // Version 8.2 (ruling 1330): no detail line
      row.querySelector('.body').click();
      expect([row.classList.contains('open'), more.getAttribute('aria-expanded')]).toEqual([false, 'false']);
    } finally { s.cleanup(); }
    const w = await lessonAt('tower', { width: 1280, height: 800, text: 100 });
    try {
      const row = w.root.querySelector('#lesson'), text = row.querySelector('.text');
      const body = row.querySelector('.body');
      expect([body.scrollHeight <= body.clientHeight + 1, row.querySelector('.why'), row.querySelector('.more').hidden]).toEqual([true, null, true]);   // Version 8.2 (ruling 1330): Ipi's two lines, no detail under them
    } finally { w.cleanup(); }
  });
  it('lays the row, the ring and the dimming out on a laptop and a 1920 x 1080 screen, with the ring and dimming taking no taps', async () => {
    for (const [w, h] of [[1280, 800], [1920, 1080]]) {
      const s = await lessonAt('bazaar', { width: w, height: h });
      try {
        const at = `${w}x${h}`;
        const row = s.root.querySelector('#lesson'), r = row.getBoundingClientRect();
        expect([at, r.width <= 560 + 1, r.left >= s.frameBox.left]).toEqual([at, true, true]);
        const scrim = s.root.querySelector('.lesson-scrim'), ring = s.root.querySelector('.lesson-ring');
        expect([at, scrim.hidden, ring.hidden, getComputedStyle(scrim).pointerEvents, getComputedStyle(ring).pointerEvents, scrim.getAttribute('aria-hidden')]).toEqual([at, false, false, 'none', 'none', 'true']);
        const rb = ring.getBoundingClientRect();
        expect([at, rb.width > 40, rb.height > 20, rb.right > s.frameBox.left && rb.left < s.frameBox.left + w, rb.bottom > s.frameBox.top && rb.top < s.frameBox.top + h]).toEqual([at, true, true, true, true]);
        const spot = s.root.querySelector('#lesson').dataset.step;
        expect([at, spot]).toEqual([at, 'bazaar']);
      } finally { s.cleanup(); }
    }
  });
  it('rings the control a step points at (the speed buttons, the gold chip) and no other step\'s', async () => {
    const s = await lessonAt('families', { width: 390, height: 844 });
    try {
      const lit = [...s.root.querySelectorAll('.lesson-lit')];
      expect([lit.length >= 1, lit.every((n) => n.matches('#topbar .speed-bar'))]).toEqual([true, true]);
    } finally { s.cleanup(); }
    const t = await lessonAt('farm', { width: 390, height: 844 });
    try { expect(t.root.querySelectorAll('.lesson-lit').length).toBe(0); } finally { t.cleanup(); }
  });
});
