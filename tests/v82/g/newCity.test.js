// Version 8.2 Track G (rulings 1308-1312): the map preview on the new-city card (the city that starts is the map shown; Another; Surprise me names the seed's layout;
// fast; accessible), New city from the game (the title's card over the paused game; Back keeps the city; Start asks first; the lesson has none), one difficulty
// setting, and the title on a tablet or a computer (a panel opens wide beside the buttons; the phone is as it was).
import { describe, it, expect } from '../../harness.js';
import { boot } from '../../../src/boot.js';
import { createSaveStore } from '../../../src/save/store.js';
import { createTitleCard, renderNewCityCard } from '../../../src/ui/titleCard.js';
import { variantFor, generateMap } from '../../../src/sim/mapgen.js';
import { MAP_SIZES } from '../../../src/data/map.js';
import { openSheet } from '../../../src/ui/modes.js';
import { V80_U_TEXT, T, DIFFICULTY_NAMES } from '../../../src/ui/text.js';
import { LAYOUT_NAMES } from '../../../src/ui/v71/mapsText.js';
import { PREVIEW_TEXT } from '../../../src/ui/v82/oasisText.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { mountShell, fakeHistory } from '../../helpers/uiWorld.js';
import { fire, openNewCity } from '../../helpers/dom.js';

const memory = (data = {}) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data });
const frame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

async function bootAt({ width = 390, height = 844, settings = {} } = {}) {
  const shell = await mountShell(width, height);
  const history = fakeHistory();
  const storage = memory({ 'thebes.settings': JSON.stringify({ cardsSeen: true, lessonDone: true, ...settings }) });
  const api = await boot(document, window, {
    root: document.body, store: createSaveStore({ idb: fakeIndexedDB(), local: null }), params: new URLSearchParams(''), now: () => 0, clock: () => 1760000000000, storage,
    envInput: { ua: 'Mozilla/5.0 (Windows NT 10.0) Chrome/124.0' }, sw: null,
    uiOptions: { getSize: () => ({ width, height }), subscribeResize: () => () => {}, history, addListener: history.addListener, removeListener: history.removeListener, keyTarget: shell.root, storage },
    loopOptions: { raf: () => 0, caf: () => {} },
  });
  return { api, root: shell.root, storage, cleanup() { api.destroy(); shell.cleanup(); document.body.classList.remove('on-title'); delete window.__thebes; } };
}
const title = (r) => r.root.querySelector('#title');
const preview = (scope) => scope.querySelector('.map-preview');
const pickLayout = (scope, id) => { const s = scope.querySelector('.layout-select'); s.value = id; fire(s, 'change'); };
// From the title, a city of its own (no saved city: Start goes straight in)
async function intoGame(r) { openNewCity(r.root); fire(title(r).querySelector('.start-city'), 'click'); await frame(); return r.api.game(); }
function openMenuNewCity(r) {
  const g = r.api.game();
  g.ui.store.set(openSheet(g.ui.store.get(), 'menu'));
  fire(r.root.querySelector('#sheet .menu-new-city'), 'click');
  return r.root.querySelector('#sheet');
}

describe('v82 g map preview (rulings 1310-1311)', () => {
  it('starts exactly the map shown: the same seed, size and layout, and the same ground', async () => {
    const r = await bootAt();
    try {
      openNewCity(r.root);
      fire(title(r).querySelector('.more-choices-toggle'), 'click');
      pickLayout(title(r), 'great-oasis');
      fire(title(r).querySelector('.choice.mapsize[data-value="small"]'), 'click');
      await frame();
      const p = preview(title(r)), seed = Number(p.dataset.seed);
      expect([p.dataset.layout, p.dataset.size, p.classList.contains('pending')]).toEqual(['great-oasis', String(MAP_SIZES.small), false]);
      fire(title(r).querySelector('.start-city'), 'click');
      const w = r.api.game().world;
      expect([w.seed, w.mapVariant, w.size, w.terrain.join('') === generateMap(seed, MAP_SIZES.small, 'great-oasis').terrain.join('')]).toEqual([seed, 'great-oasis', MAP_SIZES.small, true]);
    } finally { r.cleanup(); }
  });
  it('Another draws a new seed; size and layout redraw the same seed; Surprise me names the layout the seed picks', async () => {
    const box = document.createElement('div');
    document.body.append(box);
    const seeds = [];
    try {
      const card = renderNewCityCard({ seed: 12345, onSeed: (s) => seeds.push(s), defer: (fn) => fn() });
      box.append(card.element);
      const p = card.element.querySelector('.map-preview');
      const name = (v) => LAYOUT_NAMES[v];
      expect([p.dataset.seed, p.dataset.layout, card.element.querySelector('.map-preview-name').textContent]).toEqual(['12345', variantFor(12345), PREVIEW_TEXT.caption(name(variantFor(12345)), 'Normal', true)]);
      fire(card.element.querySelector('.choice.mapsize[data-value="large"]'), 'click');
      pickLayout(card.element, 'delta');
      expect([p.dataset.seed, p.dataset.size, p.dataset.layout, card.preview.drawn().key]).toEqual(['12345', '80', 'delta', '12345:80:delta']);
      fire(card.element.querySelector('.another-map'), 'click');
      expect([seeds.length, p.dataset.seed === String(seeds[0]), seeds[0] !== 12345]).toEqual([1, true, true]);
    } finally { box.remove(); }
  });
  it('is fast: a Huge map is drawn after a frame over a soft placeholder, and its generation is timed', async () => {
    const box = document.createElement('div');
    document.body.append(box);
    try {
      const later = [];
      const card = renderNewCityCard({ seed: 7, mapSize: 'huge', defer: (fn) => later.push(fn) });
      box.append(card.element);
      expect([card.element.querySelector('.map-preview').classList.contains('pending'), card.preview.drawn()]).toEqual([true, null]);   // the card is there before the map
      const t0 = performance.now();
      later.forEach((fn) => fn());
      const ms = performance.now() - t0;
      expect([card.element.querySelector('.map-preview').classList.contains('pending'), ms < 2500]).toEqual([false, true]);
      console.log(`v82 g: a Huge map preview took ${Math.round(ms)} ms`);
    } finally { box.remove(); }
  });
  it('names the picture (layout and size) and gives Another 44 px, a name and the keyboard, on a phone at 150% text and on a computer', async () => {
    for (const [w, h, size] of [[375, 667, 150], [390, 844, 100], [1280, 800, 100]]) {
      const shell = await mountShell(w, h);
      document.body.dataset.textSize = String(size);
      const tc = createTitleCard({ container: shell.root.querySelector('#title'), hasSave: true, onContinue() {}, onNewCity() {}, renderSettings() {}, screen: () => ({ width: w, height: h }), seed: 9 });
      try {
        fire(shell.root.querySelector('.title-card .new-city'), 'click');
        const canvas = shell.root.querySelector('.map-preview-canvas'), another = shell.root.querySelector('.another-map'), r = another.getBoundingClientRect();
        expect([w, canvas.getAttribute('role'), canvas.getAttribute('aria-label').includes(`${LAYOUT_NAMES[variantFor(9)]} layout, Normal map`)]).toEqual([w, 'img', true]);
        expect([w, another.getAttribute('aria-label'), r.width >= 43.5, r.height >= 43.5, another.tabIndex >= 0]).toEqual([w, PREVIEW_TEXT.anotherLabel, true, true, true]);
        const cardEl = shell.root.querySelector('.title-card'), box = cardEl.getBoundingClientRect(), outer = shell.root.getBoundingClientRect();
        expect([w, box.bottom <= outer.bottom + 0.5, cardEl.scrollWidth <= cardEl.clientWidth + 1, canvas.getBoundingClientRect().width <= box.width]).toEqual([w, true, true, true]);
      } finally { tc.destroy(); shell.cleanup(); delete document.body.dataset.textSize; }
    }
  });
});

describe('v82 g New city from the game (rulings 1308-1309)', () => {
  it('opens the new-city card over the paused game; Back keeps the city; the lesson\'s menu has none', async () => {
    const r = await bootAt();
    try {
      const g = await intoGame(r);
      const before = g.world;
      g.ui.speedControl.set(2);
      const sheet = openMenuNewCity(r);
      expect([Boolean(sheet.querySelector('.new-city-body .title-difficulty')), Boolean(sheet.querySelector('.map-preview')), Boolean(sheet.querySelector('.layout-select')), before.speed, Boolean(r.root.querySelector('#dialog:not([hidden])'))])
        .toEqual([true, true, true, 0, false]);
      fire(sheet.querySelector('.guide-back'), 'click');
      expect([r.api.game().world === before, r.api.game().ui.store.get().sheet]).toEqual([true, null]);
    } finally { r.cleanup(); }
    const l = await bootAt();
    try {
      l.api.hooks.lesson({ step: 0 });
      const g = l.api.game();
      g.ui.store.set(openSheet(g.ui.store.get(), 'menu'));
      expect([Boolean(l.root.querySelector('#sheet .menu-new-city')), [...l.root.querySelectorAll('#sheet button')].some((b) => b.textContent.trim() === T.newCity)]).toEqual([false, false]);
    } finally { l.cleanup(); }
  });
  it('a layout, size and level chosen there start the next city, after the replace question; the level is the one Options shows', async () => {
    const r = await bootAt();
    try {
      const g = await intoGame(r);
      const sheet = openMenuNewCity(r);
      fire(sheet.querySelector('.more-choices-toggle'), 'click');
      pickLayout(sheet, 'great-oasis');
      fire(r.root.querySelector('#sheet .choice.mapsize[data-value="large"]'), 'click');
      fire(r.root.querySelector('#sheet .choice.difficulty[data-value="hard"]'), 'click');
      const seed = Number(r.root.querySelector('#sheet .map-preview').dataset.seed);
      fire(r.root.querySelector('#sheet .start-city'), 'click');
      const dialog = r.root.querySelector('#dialog');
      expect([dialog.hidden, dialog.textContent.includes(T.newCityConfirm), Boolean(dialog.querySelector('.extra')), r.api.game().world === g.world]).toEqual([false, true, true, true]);
      fire(dialog.querySelector('.ok'), 'click');
      const n = r.api.game(), w = n.world;
      expect([w !== g.world, w.mapVariant, w.size, w.difficulty, w.seed]).toEqual([true, 'great-oasis', MAP_SIZES.large, 'hard', seed]);
      // Options > Saves shows the level the card chose: one setting
      n.ui.store.set(openSheet(n.ui.store.get(), 'settings'));
      expect(r.root.querySelector('#sheet .choice.difficulty[aria-pressed="true"]').textContent).toBe(DIFFICULTY_NAMES.hard);
    } finally { r.cleanup(); }
  });
});

describe('v82 g title panels scroll on a phone (ruling 1315)', () => {
  it('What\'s new, Options and the new-city card (More choices open) scroll inside the card at 375x667 and 150% text; the page never scrolls; Back stays in sight', async () => {
    const r = await bootAt({ width: 375, height: 667, settings: { textSize: 150 } });
    try {
      const card = () => title(r).querySelector('.title-card');
      const open = {
        whatsNew: () => fire(card().querySelector('.whats-new-button'), 'click'),
        options: () => fire(card().querySelector('.title-settings'), 'click'),
        newCity: () => { fire(card().querySelector('.new-city'), 'click'); fire(card().querySelector('.more-choices-toggle'), 'click'); },
      };
      for (const [name, go] of Object.entries(open)) {
        go();
        const c = card(), inner = c.querySelector('.whats-new'), scroller = inner && inner.scrollHeight > inner.clientHeight + 1 ? inner : c;
        const cs = getComputedStyle(scroller);
        expect([name, scroller.scrollHeight > scroller.clientHeight + 1, ['auto', 'scroll'].includes(cs.overflowY), cs.overscrollBehaviorY]).toEqual([name, true, true, 'contain']);
        const page = document.scrollingElement.scrollTop;
        scroller.scrollTop = scroller.scrollHeight;
        expect([name, document.scrollingElement.scrollTop]).toEqual([name, page]);
        // Back: the panel's own, in sight at the top and at the foot of the scroll
        const back = c.querySelector('.guide .guide-back, .guide .panel-back');
        for (const at of [0, c.scrollHeight]) {
          c.scrollTop = at;
          const b = back.getBoundingClientRect(), box = c.getBoundingClientRect();
          expect([name, at > 0, b.top >= box.top - 1 && b.bottom <= box.bottom + 1]).toEqual([name, at > 0, true]);
        }
        fire(back, 'click');
      }
    } finally { r.cleanup(); }
  });
});

describe('v82 g title on a tablet or a computer (ruling 1312)', () => {
  it('opens What\'s new, Options and the new-city card wide beside the buttons at 1280x800 and 1024x768; a phone keeps the one column; Esc closes a panel', async () => {
    for (const [w, h, wide] of [[1280, 800, true], [1024, 768, true], [768, 1024, true], [390, 844, false], [375, 667, false]]) {
      const shell = await mountShell(w, h);
      const tc = createTitleCard({ container: shell.root.querySelector('#title'), hasSave: true, onContinue() {}, onNewCity() {}, renderSettings: (b) => b.append(document.createElement('p')), screen: () => ({ width: w, height: h }) });
      try {
        const card = shell.root.querySelector('.title-card');
        fire(card.querySelector('.whats-new-button'), 'click');
        const panel = card.querySelector('.guide'), buttons = card.querySelector('.title-buttons');
        expect([w, card.classList.contains('wide'), buttons.hidden]).toEqual([w, wide, !wide]);
        if (w === 1280) expect([card.getBoundingClientRect().width >= 760, card.querySelector('.guide .whats-new').getBoundingClientRect().width >= 520]).toEqual([true, true]);
        if (wide) {
          const a = buttons.getBoundingClientRect(), b = panel.getBoundingClientRect();
          expect([w, a.right <= b.left + 1, card.scrollWidth <= card.clientWidth + 1]).toEqual([w, true, true]);   // side by side, nothing cut off
        }
        fire(card, 'keydown', { key: 'Escape' });
        expect([w, Boolean(card.querySelector('.guide')), buttons.hidden, card.classList.contains('panel-open')]).toEqual([w, false, false, false]);
        fire(card.querySelector('.new-city'), 'click');
        const body = card.querySelector('.new-city-body');
        expect([w, body.classList.contains('wide')]).toEqual([w, wide]);
        if (w === 1280) expect(card.querySelector('.map-preview-canvas').getBoundingClientRect().width >= 240).toBe(true);
      } finally { tc.destroy(); shell.cleanup(); }
    }
  });
});
