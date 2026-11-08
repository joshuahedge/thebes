// Version 7.1.1 (rulings 1111-1112): "Skip, I've played before" on the title card (under Start the lesson) and on the lesson's first step card. Josh's decision over ruling 617: the lesson
// is no longer the only way in. A skip leaves the device as a finished lesson does (lessonDone, lessonStep at the end, the picture cards seen), and the tips stay unspent.
import { describe, it, expect } from '../../harness.js';
import { createSaveStore } from '../../../src/save/store.js';
import { packSave } from '../../../src/save/serialize.js';
import { createWorld } from '../../../src/sim/world.js';
import { LESSON_LENGTH } from '../../../src/sim/lesson.js';
import { V711_TEXT } from '../../../src/ui/text.js';
import { DIFFICULTY_ORDER } from '../../../src/data/difficulty.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { fire, key, startNewCity } from '../../helpers/dom.js';
import { pageAt, cardOf, rect, frame } from '../lessonPage.js';

const SKIP = "I've played before";   // Version 8.0 (Track U): it lost its "Skip,"; the button and its behaviour are as 7.1.1 had them
const saved = (s) => JSON.parse(s.storage.data['thebes.settings']);
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('v711 skip: the title card', () => {
  it('offers it under Start the lesson as a secondary button with the exact words, 44 px tall, and it still fits at 375x667 and 150% text', async () => {
    for (const [w, h, size] of [[390, 844, 100], [375, 667, 150], [1280, 800, 100]]) {
      const s = await pageAt(null, { width: w, height: h, textSize: size, settings: { cardsSeen: false } });
      try {
        const title = s.root.querySelector('#title');
        const start = title.querySelector('.lesson-start'), skip = title.querySelector('.lesson-skip');
        expect([skip.textContent, V711_TEXT.skip]).toEqual([SKIP, SKIP]);
        expect([w, skip.classList.contains('primary'), start.classList.contains('primary'), rect(skip).top > rect(start).bottom, rect(skip).height >= 44]).toEqual([w, false, true, true, true]);
        const card = title.querySelector('.title-card');
        expect([w, size, card.scrollHeight <= card.clientHeight + 1, rect(skip).bottom <= rect(card).bottom + 1]).toEqual([w, size, true, true]);
        const mid = (r) => (r.left + r.right) / 2;
        expect(Math.abs(mid(rect(skip)) - mid(rect(card))) <= 2).toBe(true);
      } finally { s.cleanup(); }
    }
  });

  // Version 9.1 (Track F, ruling 1669, over 1111's title again): it marks the lesson done and starts a city at once, in one tap, on the new-city card's choices (the classic
  // river at Normal for a device's first city, ruling 1660); the title then offers New city with its level and size choices, and Lesson still plays it.
  it('marks the lesson done as a finished one does and starts a city at once; back on the title, New city has its level and size choices and Lesson still plays it', async () => {
    const s = await pageAt(null, { settings: { cardsSeen: false } });
    try {
      const title = s.root.querySelector('#title');
      expect([Boolean(title.querySelector('.new-city')), Boolean(title.querySelector('.title-difficulty'))]).toEqual([false, false]);   // the lesson alone, as ruling 617 had it
      fire(title.querySelector('.lesson-skip'), 'click');
      await flush();
      expect(saved(s)).toEqual({ ...saved(s), lessonDone: true, lessonStep: LESSON_LENGTH, cardsSeen: true });
      expect([s.api.phase(), s.g().lesson, s.g().world.mapVariant]).toEqual(['game', false, 'classic']);   // the picture cards are marked seen: no cards first
      expect(await s.api.hooks.home()).toBe(true);
      await flush();
      const now = s.root.querySelector('#title');
      expect([Boolean(now.querySelector('.new-city')), now.querySelector('.lesson-skip'), Boolean(now.querySelector('.lesson'))]).toEqual([true, null, true]);
      fire(now.querySelector('.new-city'), 'click');
      expect([now.querySelectorAll('.title-difficulty .choice.difficulty').length, now.querySelectorAll('.title-size .choice.mapsize').length]).toEqual([DIFFICULTY_ORDER.length, 4]);
      expect(s.root.querySelector('#title .goal-line').textContent).toBe(V711_TEXT.goal());
    } finally { s.cleanup(); }
  });

  it('spends no tips: seenTips is left as it was', async () => {
    const s = await pageAt(null, { settings: { cardsSeen: false, seenTips: ['press_play'] } });
    try {
      fire(s.root.querySelector('#title .lesson-skip'), 'click');
      expect(saved(s).seenTips).toEqual(['press_play']);
    } finally { s.cleanup(); }
  });
});

describe('v711 skip: the lesson\'s first card', () => {
  it('shows it on the first step\'s card only, named, 44 px, reachable by Tab after Show me (Version 8.0: Leave the lesson is in the menu)', async () => {
    const s = await pageAt('road');
    try {
      const card = cardOf(s), skip = card.querySelector('.lc-skip');
      expect([skip.hidden, skip.textContent, skip.getAttribute('aria-label'), rect(skip).height >= 44]).toEqual([false, SKIP, null, true]);
      const go = card.querySelector('.lc-go');
      go.focus();
      key(go, 'Tab');
      expect(document.activeElement).toBe(skip);
      key(skip, 'Tab');
      expect(document.activeElement).toBe(go);
    } finally { s.cleanup(); }
    const t = await pageAt('homes');
    try { expect(cardOf(t).querySelector('.lc-skip').hidden).toBe(true); } finally { t.cleanup(); }
  });

  it('asks its own question; No keeps the card with focus on Skip; Yes marks the lesson done and goes straight to a new city of the player\'s own', async () => {
    const s = await pageAt(null, { settings: { cardsSeen: false } });
    try {
      fire(s.root.querySelector('#title .lesson-start'), 'click');
      await frame();
      expect([s.api.phase(), s.g().lesson]).toEqual(['game', true]);
      const skip = cardOf(s).querySelector('.lc-skip');
      fire(skip, 'click');
      const dialog = s.root.querySelector('#dialog');
      expect([dialog.hidden, dialog.querySelector('#dialog-text').textContent, dialog.querySelector('.ok').textContent]).toEqual([false, V711_TEXT.skipConfirm, SKIP]);
      fire(dialog.querySelector('.cancel'), 'click');
      expect([Boolean(cardOf(s)), document.activeElement === skip, s.g().lesson, saved(s).lessonDone === true]).toEqual([true, true, true, false]);   // nothing changed
      fire(skip, 'click');
      fire(s.root.querySelector('#dialog .ok'), 'click');
      await flush(); await flush();
      expect([s.api.phase(), s.g().lesson, Boolean(cardOf(s))]).toEqual(['game', false, false]);   // a normal city, not the title
      expect(saved(s)).toEqual({ ...saved(s), lessonDone: true, lessonStep: LESSON_LENGTH, cardsSeen: true });
      expect(s.g().world.seed === 7 && s.g().world.size === 48).toBe(false);                  // not the lesson's map
    } finally { s.cleanup(); }
  });

  it('with a saved city it goes to the title instead (a fresh city would take its place), and says so in its question', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    await store.save(packSave(createWorld({ seed: 4 }), { savedAt: 1760000000000 - 3600000, lastSpeed: 1 }));
    const s = await pageAt(null, { store, settings: { lessonDone: true } });
    try {
      fire(s.root.querySelector('#title .lesson'), 'click');
      await frame();
      expect(s.g().lesson).toBe(true);
      fire(cardOf(s).querySelector('.lc-skip'), 'click');
      expect(s.root.querySelector('#dialog #dialog-text').textContent).toBe(V711_TEXT.skipConfirmTitle);
      fire(s.root.querySelector('#dialog .ok'), 'click');
      await flush(); await flush(); await flush();
      expect(s.api.phase()).toBe('title');
      expect(Boolean(s.root.querySelector('#title .continue'))).toBe(true);                    // the saved city is still there
    } finally { s.cleanup(); }
  });
});
