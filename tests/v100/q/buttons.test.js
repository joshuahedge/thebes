// Version 10.0, Track Q (ruling 2140, Task Q.1): one button language. Each surface has the one filled action it should and no second;
// Layers' Off is never drawn as chosen; Demolish is outlined until the tool is live.
import { describe, it, expect } from '../../harness.js';
import { createTitleCard } from '../../../src/ui/titleCard.js';
import { createLessonCard } from '../../../src/ui/lessonCard.js';
import { createDock } from '../../../src/ui/dock.js';
import { createLayersPicker } from '../../../src/ui/layersPicker.js';
import { createConfirmBar } from '../../../src/ui/confirmBar.js';
import { createPlacement } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { mount, fire } from '../../helpers/dom.js';
import { useGameCss } from './cssHelper.js';

const primaries = (node) => node.querySelectorAll('button.primary, .primary').length;

describe('v100 q buttons: one primary to a surface', () => {
  it('the title card has one, whether or not there is a saved city or a lesson to take', () => {
    for (const opts of [{ hasSave: true }, { hasSave: false }, { hasSave: false, lesson: { due: true, partWay: false }, onLesson() {} }]) {
      const m = mount('<div id="title"></div>');
      try {
        const container = m.root.querySelector('#title');
        createTitleCard({ container, onContinue() {}, onNewCity() {}, onSound() {}, ...opts });
        expect(primaries(container)).toBe(1);
      } finally { m.cleanup(); }
    }
  });
  it('the lesson card has one: Show me, with the skip a plain link beneath', () => {
    const m = mount('<div id="ui"></div>');
    try {
      const card = createLessonCard({ root: m.root, doc: document, store: { get: () => ({}) }, onGo() {}, onLeave() {}, onSkip() {} });
      card.show({ label: 'Step 1 of 14', text: 'Lay a road.', goLabel: 'Show me', picture: null, skipOffered: true });
      expect(primaries(card.card)).toBe(1);
      expect(card.card.querySelector('.lc-skip').classList.contains('primary')).toBe(false);
    } finally { m.cleanup(); }
  });
  it('the dock has one (the Build pill), tucked or with its tray open', () => {
    const m = mount('<div id="dock"></div>');
    try {
      const container = m.root.querySelector('#dock');
      const store = createStore({ ...INITIAL_UI_STATE, layout: 'portrait', category: 'roads', dock: 'tray' });
      createDock({ container, store, world: makeTestWorld(), onPick() {} });
      expect(primaries(container)).toBe(1);
      store.set({ dock: 'tucked' });
      expect(primaries(container)).toBe(1);
    } finally { m.cleanup(); }
  });
  it('the Layers sheet has none of its own: Off has aria-pressed false when off, and when a layer is on', () => {
    const m = mount();
    const store = createStore(INITIAL_UI_STATE);
    const picker = createLayersPicker({ store, restoreFocus() {} });
    m.root.append(picker.node);
    try {
      store.set({ layersOpen: true });
      const off = picker.node.querySelector('[data-layer="off"]');
      expect(off.getAttribute('aria-pressed')).toBe('false');
      expect(primaries(picker.node)).toBe(0);
      store.set({ overlay: 'fire' });
      expect(off.getAttribute('aria-pressed')).toBe('false');
    } finally { picker.destroy(); m.cleanup(); }
  });
  it('the Demolish bar has no primary: its tick is the one filled red button', () => {
    const m = mount();
    try {
      const world = makeTestWorld({ gold: 1000 });
      const store = createStore(INITIAL_UI_STATE);
      const placement = createPlacement({ world, store });
      createConfirmBar({ container: m.root, store, placement, onCancel() {}, onConfirm() {}, onUndo() {} });
      placement.start({ kind: 'demolish' }, null);
      expect(primaries(m.root)).toBe(0);
      expect(m.root.querySelectorAll('button.ok.danger').length).toBe(1);
    } finally { m.cleanup(); }
  });
});

describe('v100 q buttons: Demolish is outlined until the tool is live', () => {
  const rgba = (c) => c.replace(/\s/g, '');
  const filled = (node) => { const c = rgba(getComputedStyle(node).backgroundColor); return c !== 'rgba(0,0,0,0)' && c !== 'transparent'; };
  it("the tray's Demolish card is outlined with a red edge, and filled red only while pressed", async () => {
    const off = await useGameCss();
    const m = mount('<div id="dock"></div>');
    try {
      const container = m.root.querySelector('#dock');
      const store = createStore({ ...INITIAL_UI_STATE, layout: 'portrait', category: 'roads', dock: 'tray' });
      createDock({ container, store, world: makeTestWorld(), onPick() {} });
      const card = container.querySelector('.card.demolish');
      expect(!!card).toBe(true);
      const red = getComputedStyle((() => { const b = document.createElement('button'); b.className = 'danger'; m.root.append(b); return b; })()).backgroundColor;
      expect(filled(card)).toBe(false);
      expect(getComputedStyle(card).borderTopColor).toBe(red);
      card.setAttribute('aria-pressed', 'true');
      expect(getComputedStyle(card).backgroundColor).toBe(red);
    } finally { m.cleanup(); off(); }
  });
  it("a building sheet's Demolish is outlined, never the strongest button of its row", async () => {
    const off = await useGameCss();
    const m = mount('<div id="sheet"><div class="actions"><button class="demolish danger">Demolish</button><button class="another">Build another</button></div></div>');
    try {
      expect(filled(m.root.querySelector('.demolish'))).toBe(false);
    } finally { m.cleanup(); off(); }
  });
});
