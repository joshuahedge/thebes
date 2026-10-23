import { describe, it, expect } from '../../harness.js';
import { showPictureCards, markSvg, loadMarks, forgetMarks } from '../../../src/ui/tutorial.js';
import { TUTORIAL_CARDS, INTRO_CARDS, TUTORIAL } from '../../../src/data/tutorial.js';
import { CARDS4_TEXT, cards4Ahead } from '../../../src/ui/text.js';
import { createSettings } from '../../../src/ui/settings.js';
import { mountShell } from '../../helpers/uiWorld.js';
import { fire, key } from '../../helpers/dom.js';

const MARKS = { road: { mark: { kind: 'ring', x: 300, y: 320, w: 40, h: 40 } }, farm: { mark: { kind: 'arrow', x: 560, y: 520, angle: 45 } } };

// The page's history and its capturing popstate listeners, as the cards use them.
function fakeHistory() {
  const h = { pushed: 0, backs: 0, state: null, pushState(s) { h.pushed++; h.state = s; }, back() { h.backs++; } };
  return h;
}
function fakeListeners() {
  const l = {
    fns: [],
    add: (type, fn) => l.fns.push([type, fn]),
    remove: (type, fn) => { l.fns = l.fns.filter((x) => x[1] !== fn); },
    pop() { const e = { stopped: false, stopImmediatePropagation() { e.stopped = true; } }; for (const [t, fn] of [...l.fns]) if (t === 'popstate') fn(e); return e; },
  };
  return l;
}

// The cards on the real shell at a phone's or a screen's size, opened from a button that had focus.
async function rig({ width = 390, height = 844, motion = 'still', text = 100, marks = MARKS, difficulty = undefined } = {}) {
  const shell = await mountShell(width, height);
  const settings = createSettings({ storage: { getItem: () => null, setItem() {} }, root: document.body, systemReducedMotion: () => false });
  settings.set({ motion, textSize: text });
  const opener = document.createElement('button');
  opener.textContent = 'How to play';
  shell.root.append(opener);
  opener.focus();
  const history = fakeHistory(), l = fakeListeners();
  let done = 0;
  const c = showPictureCards({ root: shell.root, doc: document, settings, cards: INTRO_CARDS, marks, difficulty, history, addListener: l.add, removeListener: l.remove, onDone: () => { done++; } });
  const d = c.element;
  return {
    shell, settings, opener, history, l, c, d, q: (sel) => d.querySelector(sel), done: () => done,
    cleanup() { c.close(); settings.destroy(); shell.cleanup(); delete document.body.dataset.motion; },
  };
}
const swipe = (node, dx, dy = 0) => {
  fire(node, 'pointerdown', { clientX: 200, clientY: 300, pointerId: 4 });
  fire(node, 'pointerup', { clientX: 200 + dx, clientY: 300 + dy, pointerId: 4 });
};

describe('s4 cards picture cards: the dialog', () => {
  it('gives every card a title, its words and its picture\'s alt text', () => {
    expect(INTRO_CARDS.map((c) => c.id)).toEqual(['road', 'homes', 'farm', 'food', 'gold', 'goals', 'ahead']);   // Stage 4.5 added Gold after Food; Version 6.0 (Track D2): these seven are read before a first city, six more follow at their first moments
    expect(TUTORIAL_CARDS.slice(7).map((c) => c.id)).toEqual(['large', 'demand', 'plague', 'drought', 'locusts', 'raid', 'event']);   // Version 7.0 (Track E): the first city event's card follows
    for (const c of TUTORIAL_CARDS) {
      const w = CARDS4_TEXT.cards[c.id];
      expect([c.id, w.title.length > 0, w.words.length > 0, w.alt.length > 0, w.words.split('. ').length <= 3]).toEqual([c.id, true, true, true, true]);
    }
  });

  it('shows seven cards, each a picture with its alt text and mark, a title and words, and moves by Next, Back, the dots, the arrow keys and a swipe', async () => {
    const r = await rig();
    try {
      const { d, q } = r;
      expect([d.getAttribute('role'), d.getAttribute('aria-modal'), d.getAttribute('aria-labelledby'), d.parentElement]).toEqual(['dialog', 'true', 'pc-title', r.shell.root]);
      const showing = (id, i) => {
        const w = CARDS4_TEXT.cards[id];
        const current = [...d.querySelectorAll('.pc-dot')].findIndex((b) => b.getAttribute('aria-current') === 'step');
        expect([q('.pc-count').textContent, q('.pc-picture').getAttribute('src'), q('.pc-picture').alt, q('#pc-title').textContent, q('#pc-words').textContent, r.c.index(), current])
          .toEqual([`${i + 1} of 7`, `${TUTORIAL.dir}${id}.webp`, w.alt, w.title, w.words, i, i]);
      };
      showing('road', 0);
      expect([q('.pc-back').disabled, document.activeElement === q('.pc-next'), q('.pc-next').textContent, d.querySelectorAll('.pc-dot').length]).toEqual([true, true, CARDS4_TEXT.next, 7]);
      expect(q('.pc-dot').getAttribute('aria-label')).toBe(CARDS4_TEXT.dot(1, 7));
      const ring = q('.pc-mark rect.line');                                     // a ring 10 px out from the 40 px box at (300, 320)
      expect([q('.pc-mark').dataset.kind, q('.pc-mark').getAttribute('aria-hidden'), d.querySelectorAll('.pc-mark .halo').length, ring.getAttribute('x'), ring.getAttribute('y'), ring.getAttribute('width'), ring.getAttribute('rx')])
        .toEqual(['ring', 'true', 1, '270', '290', '60', '30']);
      fire(q('.pc-next'), 'click');
      showing('homes', 1);
      expect([q('.pc-back').disabled, q('.pc-mark').childElementCount]).toEqual([false, 0]);   // no mark given for it: the picture alone
      key(d, 'ArrowRight');
      showing('farm', 2);
      expect([q('.pc-mark').dataset.kind, d.querySelectorAll('.pc-mark path').length]).toEqual(['arrow', 2]);
      key(d, 'ArrowLeft');
      showing('homes', 1);
      fire(d.querySelectorAll('.pc-dot')[5], 'click');
      showing('goals', 5);
      swipe(q('.pc-stage'), -80);
      showing('ahead', 6);
      expect(q('.pc-next').textContent).toBe(CARDS4_TEXT.start);
      swipe(q('.pc-stage'), -20);                                                // too short
      swipe(q('.pc-stage'), -60, 120);                                           // more up than across
      key(d, 'ArrowRight');                                                      // nothing after the last
      showing('ahead', 6);
      swipe(q('.pc-stage'), 80);
      showing('goals', 5);
      fire(q('.pc-back'), 'click');
      showing('gold', 4);
      let heard = 0;
      const listen = () => { heard++; };
      r.shell.root.addEventListener('keydown', listen);
      key(q('.pc-next'), 'p'); key(q('.pc-next'), ' '); key(d, 'ArrowRight');   // a modal: no key gets past it to the game
      r.shell.root.removeEventListener('keydown', listen);
      expect([heard, r.done()]).toEqual([0, 0]);
    } finally { r.cleanup(); }
  });

  it('ends on Start building, Skip, the X, Esc or the phone\'s Back, calling onDone once and handing focus back; close() calls nothing', async () => {
    for (const how of ['start', 'skip', 'close', 'esc', 'back']) {
      const r = await rig();
      try {
        expect([r.history.pushed, r.l.fns.length]).toEqual([1, 1]);           // one history entry of its own, while it shows
        if (how === 'start') {
          for (let i = 0; i < 6; i++) fire(r.q('.pc-next'), 'click');
          fire(r.q('.pc-next'), 'click');
        } else if (how === 'skip') fire(r.q('.pc-skip'), 'click');
        else if (how === 'close') fire(r.q('.pc-close'), 'click');
        else if (how === 'esc') key(r.q('.pc-next'), 'Escape');
        else expect(r.l.pop().stopped).toBe(true);                             // the phone's Back closes the cards and goes no further
        expect([how, r.done(), r.d.isConnected, document.activeElement === r.opener]).toEqual([how, 1, false, true]);
        if (how === 'back') expect([r.history.backs, r.l.fns.length]).toEqual([0, 0]);
        else {
          expect(r.history.backs).toBe(1);                                     // its entry taken back...
          const e = r.l.pop();                                                 // ...and that Back's popstate stops there too
          expect([e.stopped, r.l.fns.length]).toEqual([true, 0]);
        }
        fire(r.q('.pc-skip'), 'click');
        expect(r.done()).toBe(1);                                              // once only
      } finally { r.cleanup(); }
    }
    const r = await rig();
    try {
      r.c.close();
      expect([r.done(), r.d.isConnected, r.history.backs]).toEqual([0, false, 1]);
    } finally { r.cleanup(); }
  });

  it('keeps focus inside: Tab and Shift+Tab go round its buttons', async () => {
    const r = await rig();
    try {
      const next = r.q('.pc-next'), skip = r.q('.pc-skip');
      key(next, 'Tab');
      expect(document.activeElement).toBe(skip);                               // past the last, back to the first
      key(skip, 'Tab', { shiftKey: true });
      expect(document.activeElement).toBe(next);
      key(next, 'Tab', { shiftKey: true });
      expect(r.d.contains(document.activeElement)).toBe(true);
    } finally { r.cleanup(); }
  });

  it('keeps focus inside after a click on the picture, the words or the backdrop: its keys still work and none reaches the game', async () => {
    const r = await rig();
    try {
      let heard = 0;
      const listen = () => { heard++; };
      window.addEventListener('keydown', listen);                               // where the game listens (keyTarget is the window)
      try {
        expect(r.d.getAttribute('tabindex')).toBe('-1');                       // a click on a part that cannot take focus lands on the dialog
        r.d.focus();
        expect(document.activeElement).toBe(r.d);
        key(document.activeElement, 'ArrowRight');
        expect([r.c.index(), heard]).toEqual([1, 0]);
        key(document.activeElement, 'Tab');
        expect(document.activeElement).toBe(r.q('.pc-skip'));                  // Tab from the dialog goes to its first button
        r.q('.pc-next').focus();
        r.q('.pc-next').blur();                                                 // what a tap on the picture did before: focus on the body
        expect(document.activeElement).toBe(document.body);
        key(document.activeElement, 'p');                                       // the game's pause key
        key(document.activeElement, ' ');
        key(document.activeElement, 'ArrowRight');
        expect([r.c.index(), heard, r.done()]).toEqual([2, 0, 0]);
        key(document.activeElement, 'ArrowLeft');
        expect(r.c.index()).toBe(1);
        key(document.activeElement, 'Tab', { shiftKey: true });                 // from the body: round to the last button, inside the cards
        expect([r.d.contains(document.activeElement), document.activeElement === r.q('.pc-next')]).toEqual([true, true]);
        r.q('.pc-next').blur();
        const e = key(document.activeElement, 'Escape');
        expect([r.done(), r.d.isConnected, heard, e.defaultPrevented]).toEqual([1, false, 0, true]);
        key(document.body, 'p');                                                // closed: the keys are the page's again
        expect(heard).toBe(1);
      } finally { window.removeEventListener('keydown', listen); }
    } finally { r.cleanup(); }
  });

  it('words the last card for the city\'s level: raiders only where there are raids', async () => {
    for (const [difficulty, raids] of [['peaceful', false], ['relaxed', true], ['normal', true], ['hard', true], [undefined, true], ['nonsense', true]]) {
      const r = await rig({ difficulty });
      try {
        r.c.go(6);
        const words = r.q('#pc-words').textContent;
        expect([difficulty, words.includes('raiders'), words]).toEqual([difficulty, raids, cards4Ahead(raids)]);
        expect(words.endsWith('Pause any time: nothing happens while you plan.')).toBe(true);
        r.c.go(3);
        expect(r.q('#pc-words').textContent).toBe(CARDS4_TEXT.cards.food.words);       // no other card changes
      } finally { r.cleanup(); }
    }
  });

  it('slides a new card in under Full motion only', async () => {
    for (const motion of ['full', 'gentle', 'still']) {
      const r = await rig({ motion });
      try {
        fire(r.q('.pc-next'), 'click');
        const forward = [r.q('.pc-figure').classList.contains('pc-in-next'), r.q('.pc-text').classList.contains('pc-in-next')];
        fire(r.q('.pc-back'), 'click');
        const backward = r.q('.pc-figure').classList.contains('pc-in-back');
        expect([motion, ...forward, backward]).toEqual([motion, motion === 'full', motion === 'full', motion === 'full']);
      } finally { r.cleanup(); }
    }
  });

  it('fits a phone held either way at 100% and 150% text, and sits in a card of at most 560 px on a wide screen', async () => {
    for (const [w, h] of [[390, 844], [375, 667], [844, 390], [667, 375], [1280, 800], [1024, 768]]) {
      for (const text of [100, 150]) {
        const r = await rig({ width: w, height: h, text });
        try {
          const at = `${w}x${h} at ${text}%`;
          const frame = r.shell.root.getBoundingClientRect(), box = r.q('.pc-box').getBoundingClientRect();
          const inside = (b) => b.left >= box.left - 0.5 && b.right <= box.right + 0.5 && b.top >= box.top - 0.5 && b.bottom <= box.bottom + 0.5;
          const wide = w >= 900 && h >= 600, sideways = !wide && w > h;
          if (wide) expect([at, box.width <= 560, Math.abs(box.left + box.width / 2 - (frame.left + w / 2)) < 1, box.height <= h]).toEqual([at, true, true, true]);
          else expect([at, Math.round(box.width), Math.round(box.height)]).toEqual([at, w, h]);   // a full-screen sheet
          for (let i = 0; i < INTRO_CARDS.length; i++) {
            r.c.go(i);
            const fig = r.q('.pc-figure').getBoundingClientRect(), t = r.q('.pc-text'), tb = t.getBoundingClientRect();
            expect([at, i, Math.abs(fig.width - fig.height) < 1, fig.width >= 280, inside(fig)]).toEqual([at, i, true, true, true]);
            expect([at, sideways ? fig.right <= tb.left : fig.bottom <= tb.top]).toEqual([at, true]);   // beside the words sideways, above them otherwise
            for (const b of r.d.querySelectorAll('button')) {
              const rb = b.getBoundingClientRect();
              expect([at, b.className, rb.width >= 44, rb.height >= 44, inside(rb)]).toEqual([at, b.className, true, true, true]);
            }
            if (text === 100) expect([at, i, t.scrollHeight <= t.clientHeight + 1]).toEqual([at, i, true]);   // nothing scrolls at 100%
            else expect([at, i, t.clientHeight >= 60]).toEqual([at, i, true]);                                  // at 150% only the words may
          }
        } finally { r.cleanup(); }
      }
    }
  });
});

describe('s4 cards picture cards: the marks', () => {
  it('draws a ring as a rounded outline round its box and an arrow to its point, each a white halo under a line', () => {
    const ring = markSvg({ kind: 'ring', x: 100, y: 200, w: 80, h: 30 });
    const rect = ring.querySelector('rect.line');
    expect([ring.getAttribute('viewBox'), rect.getAttribute('x'), rect.getAttribute('y'), rect.getAttribute('width'), rect.getAttribute('height'), rect.getAttribute('rx')])
      .toEqual(['0 0 600 600', '50', '175', '100', '50', '25']);
    const arrow = markSvg({ kind: 'arrow', x: 300, y: 300, angle: 0 });         // pointing right: the tail to its left
    const d = arrow.querySelector('path.line').getAttribute('d');
    expect([d.startsWith(`M${300 - TUTORIAL.arrowLength} 300 L300 300`), arrow.querySelectorAll('.halo').length]).toEqual([true, 1]);
    expect([markSvg(null).childElementCount, markSvg({ kind: 'blob' }).childElementCount]).toEqual([0, 0]);
  });

  it('gives a ring its own corner radius when the mark has one (a pill otherwise), never more than half its short side', () => {
    const rx = (mark) => markSvg(mark).querySelector('rect.line').getAttribute('rx');
    const ring = { kind: 'ring', x: 100, y: 200, w: 80, h: 30 };                   // padded to 100 by 50: a pill is 25
    expect([rx(ring), rx({ ...ring, radius: 12 }), rx({ ...ring, radius: 0 }), rx({ ...ring, radius: 90 }), rx({ ...ring, radius: 'big' })]).toEqual(['25', '12', '0', '25', '25']);
    const rounded = markSvg({ ...ring, radius: 12 }).querySelector('rect.halo');
    expect([rounded.getAttribute('rx'), rounded.getAttribute('ry')]).toEqual(['12', '12']);
  });

  it('fetches the marks once a page from cards.json and draws them as they come; without them a card shows its picture alone', async () => {
    const shell = await mountShell(390, 844);
    forgetMarks();
    try {
      let fetched = 0, fail = false;
      const fetchMarks = async (url) => {
        fetched++;
        if (fail) throw new Error('offline');
        return { ok: url === `${TUTORIAL.dir}${TUTORIAL.marks}`, json: async () => ({ size: 600, cards: MARKS }) };
      };
      let c = showPictureCards({ root: shell.root, fetchMarks, history: null });
      expect(c.element.querySelector('.pc-mark').childElementCount).toBe(0);    // not yet
      await loadMarks(fetchMarks);
      await Promise.resolve();
      expect([fetched, c.element.querySelector('.pc-mark').dataset.kind]).toEqual([1, 'ring']);
      c.close();
      c = showPictureCards({ root: shell.root, fetchMarks, history: null });
      expect([fetched, c.element.querySelector('.pc-mark').dataset.kind]).toEqual([1, 'ring']);   // kept for the page
      c.close();
      forgetMarks();
      fail = true;
      expect(await loadMarks(fetchMarks)).toEqual({});                          // offline without them: no marks
      fail = false;
      expect(await loadMarks(fetchMarks)).toEqual(MARKS);                       // and tried again next time
      expect(fetched).toBe(3);
    } finally { forgetMarks(); shell.cleanup(); }
  });
});
