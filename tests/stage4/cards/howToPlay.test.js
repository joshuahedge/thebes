import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { openSheet } from '../../../src/ui/modes.js';
import { CARDS4_TEXT, cards4Ahead } from '../../../src/ui/text.js';
import { TUTORIAL_CARDS } from '../../../src/data/tutorial.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory, fakeDoc } from '../../helpers/uiWorld.js';
import { fire, key, startNewCity } from '../../helpers/dom.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } });
const storedSettings = (storage) => JSON.parse(storage.getItem('thebes.settings') || '{}');

// boot on the real shell, the picture cards real unless a stand-in is given (tests/stage4/contract/uiSeams.test.js rigs it
// the same way). Frames are never run.
async function bootWith({ showPictureCards = undefined, storage = memory({ 'thebes.settings': JSON.stringify({ lessonDone: true }) }) } = {}) {   // Version 6.0 (Track D2): a device that has done the lesson, so its title offers New city
  const shell = await mountShell(1280, 800);
  const history = fakeHistory();
  const api = await boot(fakeDoc(), window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width: 1280, height: 800 }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
    ...(showPictureCards ? { showPictureCards } : {}),
  });
  const cleanup = () => { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; };
  return { api, root: shell.root, storage, cleanup };
}

describe('s4 cards how to play', () => {
  it('puts Lesson in the third place on the title card (Version 6.0: the picture cards are reached in the game and through the hook), before Settings; a second call while the cards show joins them', async () => {
    let shown = 0, held = null;
    const cards = ({ onDone }) => { shown++; held = onDone; return { close() {} }; };
    const b = await bootWith({ showPictureCards: cards });
    try {
      const lesson = b.root.querySelector('#title .lesson');
      expect([lesson.textContent, lesson.nextElementSibling.classList.contains('title-settings'), b.root.querySelector('#title .how-to-play')]).toEqual(['Lesson', true, null]);
      b.api.hooks.pictureCards();
      expect([shown, b.api.phase()]).toEqual([1, 'title']);
      let a = 0, z = 0;
      b.api.hooks.pictureCards(() => { a++; });
      b.api.hooks.pictureCards(() => { z++; });
      startNewCity(b.root);                 // New city while they show: ignored
      expect([shown, a, z, b.api.phase()]).toEqual([1, 0, 0, 'title']);
      held();
      expect([a, z, storedSettings(b.storage).cardsSeen, b.api.phase()]).toEqual([1, 1, true, 'title']);   // seen; the title stays
      startNewCity(b.root);
      expect([b.api.phase(), shown]).toEqual(['game', 1]);                      // seen once: New city starts at once
    } finally { b.cleanup(); }
  });

  it('puts Show the picture cards at the top of How to play in the game, pauses the game behind them, and leaves the sheet open', async () => {
    const b = await bootWith({ storage: memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, cardsSeen: true }) }) });
    try {
      startNewCity(b.root);
      const g = b.api.game();
      g.ui.speedControl.set(2);
      g.ui.store.set(openSheet(g.ui.store.get(), 'help'));
      const show = b.root.querySelector('#sheet .body button.show-cards');
      expect([show.textContent, b.root.querySelector('#sheet .body').firstElementChild.contains(show)]).toEqual([CARDS4_TEXT.showCards, true]);
      show.focus();
      fire(show, 'click');
      const d = document.querySelector('.picture-cards');
      expect([Boolean(d), g.world.speed, g.ui.store.get().sheet.kind, document.activeElement === d.querySelector('.pc-next')]).toEqual([true, 0, 'help', true]);
      fire(d.querySelector('.pc-skip'), 'click');
      expect([document.querySelector('.picture-cards'), g.ui.store.get().sheet.kind, document.activeElement === b.root.querySelector('#sheet .body button.show-cards')]).toEqual([null, 'help', true]);
    } finally { b.cleanup(); }
  });

  it('keeps the game\'s keys from acting behind the real cards even when focus is not on them', async () => {
    const b = await bootWith({ storage: memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, cardsSeen: true }) }) });
    try {
      startNewCity(b.root);
      const g = b.api.game();
      g.ui.speedControl.set(2);
      b.api.hooks.pictureCards();
      const d = document.querySelector('.picture-cards');
      expect(g.world.speed).toBe(0);
      d.querySelector('.pc-next').blur();                                          // a tap on the picture
      for (const k of ['p', ' ', '+', '1', '2', '3']) key(b.root, k);                    // keys at the page behind (the game listens on the window)
      expect([g.world.speed, d.isConnected]).toEqual([0, true]);
      key(b.root, 'ArrowRight');
      expect(document.activeElement === d.querySelector('.pc-next') || d.querySelector('.pc-count').textContent === `2 of ${TUTORIAL_CARDS.length}`).toBe(true);
      key(b.root, 'Escape');
      expect([document.querySelector('.picture-cards'), g.world.speed]).toEqual([null, 0]);
      key(b.root, ' ');                                                             // the cards closed: the keys are the game's again (Space pauses and plays)
      expect(g.world.speed).toBeGreaterThan(0);
    } finally { b.cleanup(); }
  });

  it('words the last card for the level: on the title the level the next city starts at, in a game its own', async () => {
    const lastCard = () => { const d = document.querySelector('.picture-cards'); for (let i = 0; i < 6; i++) fire(d.querySelector('.pc-next'), 'click'); return d.querySelector('#pc-words').textContent; };
    for (const level of ['peaceful', 'normal']) {
      const b = await bootWith({ storage: memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, difficulty: level }) }) });
      try {
        startNewCity(b.root);                  // the first city on a device: the cards on the title
        expect([level, lastCard()]).toEqual([level, cards4Ahead(level !== 'peaceful')]);
      } finally { b.cleanup(); }
      const c = await bootWith({ storage: memory({ 'thebes.settings': JSON.stringify({ lessonDone: true, difficulty: level, cardsSeen: true }) }) });
      try {
        startNewCity(c.root);
        expect(c.api.game().world.difficulty).toBe(level);
        c.api.hooks.pictureCards();
        expect([level, lastCard()]).toEqual([level, cards4Ahead(level !== 'peaceful')]);
      } finally { c.cleanup(); }
    }
  });

  it('shows the real cards over the title before the first city on a device, and starts the city from Start building', async () => {
    const b = await bootWith();
    try {
      startNewCity(b.root);
      const d = document.querySelector('.picture-cards');
      expect([b.api.phase(), Boolean(d), document.activeElement === d.querySelector('.pc-next'), storedSettings(b.storage).cardsSeen === true]).toEqual(['title', true, true, false]);
      for (let i = 0; i < 7; i++) fire(d.querySelector('.pc-next'), 'click');   // six Nexts to the last card, then Start building
      expect([b.api.phase(), document.querySelector('.picture-cards'), storedSettings(b.storage).cardsSeen]).toEqual(['game', null, true]);
    } finally { b.cleanup(); }
  });

  it('closes the real cards with the page, without starting a city', async () => {
    const b = await bootWith();
    startNewCity(b.root);
    expect(Boolean(document.querySelector('.picture-cards'))).toBe(true);
    b.cleanup();
    expect([document.querySelector('.picture-cards'), b.api.game()]).toEqual([null, null]);
  });

  it('keeps every title button inside the card on a phone held sideways (844x390 and 667x375), Start the lesson with them', async () => {
    for (const [w, h] of [[844, 390], [667, 375]]) {
      const frame = document.createElement('iframe');
      frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${w}px;height:${h}px;border:0;`;
      frame.src = '/index.html?nosw=1';
      document.body.append(frame);
      try {
        let card = null;
        for (let i = 0; i < 100 && !(card && card.querySelector('.lesson-start')); i++) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          card = frame.contentDocument && frame.contentDocument.querySelector('#title .title-card');
        }
        expect([w, h, Boolean(card)]).toEqual([w, h, true]);
        const box = card.getBoundingClientRect();
        const shown = [...card.querySelectorAll('.title-buttons button')].filter((b) => b.offsetParent !== null);
        const names = shown.map((b) => b.className.split(' ')[0]);
        expect([w, h, names.includes('lesson-start'), names.includes('title-settings'), names.includes('whats-new-button')]).toEqual([w, h, true, true, true]);   // Version 6.0: a fresh device is offered the lesson alone, with Settings and What's new
        for (const b of shown) {
          const r = b.getBoundingClientRect();
          expect([w, h, b.className, r.top >= box.top - 0.5, r.bottom <= box.bottom + 0.5, r.height >= 44 - 0.5]).toEqual([w, h, b.className, true, true, true]);
        }
        expect([w, h, card.scrollHeight <= card.clientHeight + 1]).toEqual([w, h, true]);   // nothing scrolls
      } finally { frame.remove(); }
    }
  });
});
