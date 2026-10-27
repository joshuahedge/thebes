import { describe, it, expect } from '../harness.js';
import { createLayersPicker } from '../../src/ui/layersPicker.js';
import { createBackStack } from '../../src/ui/backstack.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { back, openSheet, startTool } from '../../src/ui/modes.js';
import { OVERLAYS } from '../../src/render/overlays.js';
import { OVERLAY_NAMES, T } from '../../src/ui/text.js';
import { rigUI, fakeHistory } from '../helpers/uiWorld.js';
import { mount, fire, key } from '../helpers/dom.js';

function rig() {
  const { root, cleanup } = mount();
  const store = createStore(INITIAL_UI_STATE);
  let restored = 0;
  const picker = createLayersPicker({ store, restoreFocus: () => { restored++; } });
  root.append(picker.node);
  return { root, store, picker, restored: () => restored, cleanup() { picker.destroy(); cleanup(); } };
}

describe('ui layers picker (placement review P2)', () => {
  it('is hidden until opened, then offers every overlay by name and Off, the current one pressed', () => {
    const r = rig();
    expect(r.picker.node.hidden).toBe(true);
    r.store.set({ layersOpen: true, overlay: 'fire' });
    expect(r.picker.node.hidden).toBe(false);
    const buttons = [...r.picker.node.querySelectorAll('button.layer')];
    expect(buttons.map((b) => b.textContent)).toEqual([...OVERLAYS.map((k) => OVERLAY_NAMES[k]), T.layersOff]);
    expect(buttons.length).toBe(16);                                        // fifteen overlays (Version 5.0: Home progress, Goods supply and Workers; 8.3: Supply lines) and Off; with no world the picker offers all
    expect(buttons.map((b) => b.getAttribute('aria-pressed') === 'true')).toEqual(buttons.map((b) => b.dataset.layer === 'fire'));
    r.cleanup();
  });
  it('picks and closes with one tap, turns the current one off, and Off turns every one off', () => {
    const r = rig();
    const press = (layer) => fire(r.picker.node.querySelector(`[data-layer="${layer}"]`), 'click');
    r.store.set({ layersOpen: true });
    press('ground');
    expect([r.store.get().overlay, r.store.get().layersOpen]).toEqual(['ground', false]);
    r.store.set({ layersOpen: true });
    press('ground');                                                         // the current one again: off
    expect([r.store.get().overlay, r.store.get().layersOpen]).toEqual([null, false]);
    r.store.set({ layersOpen: true, overlay: 'water' });
    expect(r.picker.node.querySelector('[data-layer="off"]').getAttribute('aria-pressed')).toBe('false');
    press('off');
    expect([r.store.get().overlay, r.store.get().layersOpen]).toEqual([null, false]);
    r.store.set({ layersOpen: true });
    expect(r.picker.node.querySelector('[data-layer="off"]').getAttribute('aria-pressed')).toBe('true');
    r.cleanup();
  });
  it('closes on a press outside it, but not on one inside it or on a Layers button (which toggle it themselves)', () => {
    const r = rig();
    const layers = document.createElement('button');
    layers.className = 'overlay-button';
    r.root.append(layers);
    r.store.set({ layersOpen: true });
    fire(r.picker.node, 'pointerdown');
    fire(layers, 'pointerdown');
    expect(r.store.get().layersOpen).toBe(true);
    fire(r.root, 'pointerdown');
    expect(r.store.get().layersOpen).toBe(false);
    r.cleanup();
  });
  it('closes when a sheet opens, and opening or closing it does not touch a tool', () => {
    const r = rig();
    r.store.set(startTool(r.store.get(), { kind: 'road' }));
    r.store.set({ layersOpen: true });
    expect([r.store.get().mode, r.store.get().tool.kind]).toEqual(['drawing', 'road']);
    r.store.set({ layersOpen: false });
    expect(r.store.get().mode).toBe('drawing');
    r.store.set({ layersOpen: true });
    r.store.set({ sheet: { kind: 'menu', id: null } });
    expect(r.store.get().layersOpen).toBe(false);
    r.cleanup();
  });
  it('hands focus back to the Layers button when it closes with focus inside', () => {
    const r = rig();
    r.store.set({ layersOpen: true });
    r.picker.node.querySelector('[data-layer="water"]').focus();
    r.store.set({ layersOpen: false });
    expect(r.restored()).toBe(1);
    r.cleanup();
  });
  it('is one step for Back: modes.back closes it first, a sheet opening clears it, and the phone Back closes it too', () => {
    expect(back({ ...INITIAL_UI_STATE, layersOpen: true, guidanceOpen: true })).toEqual({ layersOpen: false });
    expect(openSheet({ ...INITIAL_UI_STATE, layersOpen: true }, 'menu').layersOpen).toBe(false);
    const store = createStore(INITIAL_UI_STATE);
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    store.set({ layersOpen: true });
    expect([h.length, bs.depth()]).toEqual([2, 1]);
    h.back();
    expect([store.get().layersOpen, bs.depth()]).toEqual([false, 0]);
    bs.stop();
  });
});

describe('ui layers picker in the interface', () => {
  it('opens from the corner button instead of cycling, picks one overlay in one tap, and leaves a tool running', async () => {
    const r = await rigUI();
    const button = r.root.querySelector('#corners .overlay-button');
    const picker = r.root.querySelector('#corners .layers-picker');
    expect(picker.hidden).toBe(true);
    fire(button, 'click');
    expect([r.store.get().overlay, r.store.get().layersOpen, picker.hidden, button.getAttribute('aria-expanded')]).toEqual([null, true, false, 'true']);
    fire(picker.querySelector('[data-layer="ground"]'), 'click');
    expect([r.store.get().overlay, r.store.get().layersOpen, picker.hidden, button.getAttribute('aria-expanded')]).toEqual(['ground', false, true, 'false']);
    expect(r.root.querySelector('#legend .strip').textContent).toContain(OVERLAY_NAMES.ground);
    fire(r.root.querySelector('#dock .cat[data-category="roads"]'), 'click');
    fire(r.root.querySelector('#dock .tray .card'), 'click');                  // the road tool
    expect(r.store.get().mode).toBe('drawing');
    fire(button, 'click');
    fire(picker.querySelector('[data-layer="water"]'), 'click');
    expect([r.store.get().overlay, r.store.get().mode]).toEqual(['water', 'drawing']);   // a popover, not a sheet: the tool stays
    r.cleanup();
  });
  it('closes on Esc before anything else, and the O key still cycles the overlays', async () => {
    const r = await rigUI();
    fire(r.root.querySelector('#dock .cat[data-category="roads"]'), 'click');
    fire(r.root.querySelector('#dock .tray .card'), 'click');
    fire(r.root.querySelector('#corners .overlay-button'), 'click');
    key(r.root, 'Escape');
    expect([r.store.get().layersOpen, r.store.get().mode]).toEqual([false, 'drawing']);
    key(r.root, 'o');
    expect(r.store.get().overlay).toBe('water');
    key(r.root, 'o');
    expect(r.store.get().overlay).toBe('food');
    r.cleanup();
  });
  it('is under the minimap on a wide screen, where the corner buttons are hidden, and opens its own popover', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    expect(r.store.get().layout).toBe('wide');
    const button = r.root.querySelector('#panel .layers-button');
    expect(button.textContent).toBe(T.layers);
    expect(r.root.querySelector('#panel .minimap').compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fire(button, 'click');
    const picker = r.root.querySelector('#panel .layers-picker');
    expect([picker.hidden, button.getAttribute('aria-expanded'), picker.getBoundingClientRect().height > 100]).toEqual([false, 'true', true]);
    fire(picker.querySelector('[data-layer="ground"]'), 'click');
    expect([r.store.get().overlay, button.textContent, button.getAttribute('aria-pressed')]).toEqual(['ground', `${T.layers}: ${OVERLAY_NAMES.ground}`, 'true']);
    r.cleanup();
  });
  it('lays out as three columns at 100% text and two at 125% and more, every button 44 px tall at least', async () => {
    const r = await rigUI();
    fire(r.root.querySelector('#corners .overlay-button'), 'click');
    const picker = r.root.querySelector('#corners .layers-picker');
    const columns = () => getComputedStyle(picker).gridTemplateColumns.split(' ').length;
    expect(columns()).toBe(3);
    const offered = () => [...picker.querySelectorAll('button.layer')].filter((b) => !b.hidden);   // Version 5.0: a layer the city has not reached is hidden
    for (const b of offered()) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    document.body.dataset.textSize = '125';
    expect(columns()).toBe(2);
    document.body.dataset.textSize = '150';
    expect(columns()).toBe(2);
    for (const b of offered()) expect(b.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    const box = picker.getBoundingClientRect(), root = r.root.getBoundingClientRect();
    expect([box.left >= root.left, box.right <= root.right, box.top >= root.top]).toEqual([true, true, true]);   // on the screen at the biggest text
    r.cleanup();
  });
  // Version 8.3 (Track K, ruling 1427): with Supply lines the popover holds sixteen choices, six rows of three at this size, more than the screen held sideways
  // has room for: it scrolls inside the room it has (the stylesheet's max-height, 100dvh less the top bar and the corner buttons), above the corner buttons, and
  // every choice is a scroll away. The rig's shell is the screen, but dvh is the test page's window, so the rule is applied here with the shell's height.
  it('stays on the screen held sideways at 150% text with a farm placed: beside the confirm bar, under the top bar, every choice reachable inside it', async () => {
    const r = await rigUI({ width: 667, height: 375 });
    try {
      r.ui.settings.set({ textSize: 150, reducedMotion: 'on' });
      r.ui.showMeAt({ category: 'food', item: 'farm_grain', x: r.world.focus.x, y: r.world.focus.y });
      expect([r.store.get().layout, r.store.get().mode, r.store.get().overlay, r.root.querySelector('#confirm').hidden]).toEqual(['compact', 'placing', 'ground', false]);
      fire(r.root.querySelector('#corners .overlay-button'), 'click');
      const picker = r.root.querySelector('#corners .layers-picker'), root = r.root.getBoundingClientRect();
      picker.style.maxHeight = 'calc(375px - var(--topbar-h) - var(--safe-top) - var(--safe-bottom) - 76px)';
      const box = picker.getBoundingClientRect(), bar = r.root.querySelector('#confirm').getBoundingClientRect(), top = r.root.querySelector('#topbar').getBoundingClientRect();
      const corners = r.root.querySelector('#corners .overlay-button').getBoundingClientRect();
      expect([box.left >= root.left, box.right <= bar.left + 1, box.top >= top.bottom - 1, box.bottom <= corners.top + 1]).toEqual([true, true, true, true]);   // not cut, not over the bar, not under the top bar, never over the Layers button
      for (const b of [...picker.querySelectorAll('button.layer')].filter((x) => !x.hidden)) {
        b.scrollIntoView({ block: 'nearest' });
        const q = b.getBoundingClientRect(), now = picker.getBoundingClientRect();
        expect([b.dataset.layer, q.left >= now.left - 1, q.right <= now.right + 1, q.top >= now.top - 1, q.bottom <= now.bottom + 1]).toEqual([b.dataset.layer, true, true, true, true]);
        expect(q.height).toBeGreaterThanOrEqual(44);
      }
    } finally { r.cleanup(); }
  });
  it('scrolls the current choice into view when it opens in a popover that scrolls', () => {
    const r = rig();
    r.picker.node.style.cssText = 'position:absolute;display:grid;grid-template-columns:1fr;max-height:120px;overflow-y:auto;width:200px';
    for (const b of r.picker.node.querySelectorAll('button.layer')) b.style.cssText = 'min-height:44px;display:block';
    r.store.set({ layersOpen: true, overlay: 'ground' });
    const ground = r.picker.node.querySelector('[data-layer="ground"]'), box = r.picker.node.getBoundingClientRect(), g = ground.getBoundingClientRect();
    expect(r.picker.node.scrollTop).toBeGreaterThan(0);
    expect([g.top >= box.top - 1, g.bottom <= box.bottom + 1]).toEqual([true, true]);
    r.cleanup();
  });
});
