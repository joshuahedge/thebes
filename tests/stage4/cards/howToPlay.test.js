import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { openSheet } from '../../../src/ui/modes.js';
import { CARDS4_TEXT } from '../../../src/ui/text.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory, fakeDoc } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } });
const storedSettings = (storage) => JSON.parse(storage.getItem('thebes.settings') || '{}');

// boot on the real shell, the picture cards real unless a stand-in is given (tests/stage4/contract/uiSeams.test.js rigs it
// the same way). Frames are never run.
async function bootWith({ showPictureCards = undefined, storage = memory() } = {}) {
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
  it('offers How to play on the title card before Play with sound; a second call while the cards show joins them', async () => {
    let shown = 0, held = null;
    const cards = ({ onDone }) => { shown++; held = onDone; return { close() {} }; };
    const b = await bootWith({ showPictureCards: cards });
    try {
      const how = b.root.querySelector('#title .how-to-play');
      expect([how.textContent, how.nextElementSibling.classList.contains('sound')]).toEqual([CARDS4_TEXT.howToPlay, true]);
      fire(how, 'click');
      expect([shown, b.api.phase()]).toEqual([1, 'title']);
      let a = 0, z = 0;
      b.api.hooks.pictureCards(() => { a++; });
      b.api.hooks.pictureCards(() => { z++; });
      fire(b.root.querySelector('#title .new-city'), 'click');                 // New city while they show: ignored
      expect([shown, a, z, b.api.phase()]).toEqual([1, 0, 0, 'title']);
      held();
      expect([a, z, storedSettings(b.storage).cardsSeen, b.api.phase()]).toEqual([1, 1, true, 'title']);   // seen; the title stays
      fire(b.root.querySelector('#title .new-city'), 'click');
      expect([b.api.phase(), shown]).toEqual(['game', 1]);                      // seen once: New city starts at once
    } finally { b.cleanup(); }
  });

  it('puts Show the picture cards at the top of How to play in the game, pauses the game behind them, and leaves the sheet open', async () => {
    const b = await bootWith({ storage: memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true }) }) });
    try {
      fire(b.root.querySelector('#title .new-city'), 'click');
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

  it('shows the real cards over the title before the first city on a device, and starts the city from Start building', async () => {
    const b = await bootWith();
    try {
      fire(b.root.querySelector('#title .new-city'), 'click');
      const d = document.querySelector('.picture-cards');
      expect([b.api.phase(), Boolean(d), document.activeElement === d.querySelector('.pc-next'), storedSettings(b.storage).cardsSeen === true]).toEqual(['title', true, true, false]);
      for (let i = 0; i < 6; i++) fire(d.querySelector('.pc-next'), 'click');
      expect([b.api.phase(), document.querySelector('.picture-cards'), storedSettings(b.storage).cardsSeen]).toEqual(['game', null, true]);
    } finally { b.cleanup(); }
  });

  it('closes the real cards with the page, without starting a city', async () => {
    const b = await bootWith();
    fire(b.root.querySelector('#title .new-city'), 'click');
    expect(Boolean(document.querySelector('.picture-cards'))).toBe(true);
    b.cleanup();
    expect([document.querySelector('.picture-cards'), b.api.game()]).toEqual([null, null]);
  });
});
