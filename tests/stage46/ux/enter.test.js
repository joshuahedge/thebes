// Ruling 400: Enter lays what is waiting and Esc takes it back, whatever has focus. The case Josh hit on a desktop: a click on the map
// leaves the card that started the tool focused, and that card used to keep Enter, so the road just drawn was wiped, not laid.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { key, fire, mount } from '../../helpers/dom.js';
import { createKeyboard } from '../../../src/ui/keyboard.js';
import { createCamera } from '../../../src/render/camera.js';
import { reasonText } from '../../../src/ui/text.js';

async function rigWithRoad() {
  const r = await rigUI({ width: 1280, height: 800 });
  r.renderer.renderFrame = () => {};
  r.store.set({ category: 'roads' });
  const card = [...r.root.querySelectorAll('#panel .cards .card')].find((c) => /road/i.test(c.textContent));
  fire(card, 'click');                                                       // the card starts the tool, and (a click on the map after it changes nothing) keeps focus
  const again = [...r.root.querySelectorAll('#panel .cards .card')].find((c) => /road/i.test(c.textContent));   // the panel redraws its cards: the one now on the page
  again.focus();
  r.ui.placement.pointAt(3, 14);                                             // a mouse sets a start, then an end
  r.ui.placement.pointAt(8, 14);
  return { r, card: again };
}

describe('s46 ux enter confirms a placement', () => {
  it('lays the road when the card that started the tool still has focus (the case Josh hit)', async () => {
    const { r, card } = await rigWithRoad();
    try {
      expect([document.activeElement === card, r.ui.placement.preview().state, r.store.get().mode]).toEqual([true, 'ok', 'drawing']);
      const ev = key(card, 'Enter');
      expect(ev.defaultPrevented).toBe(true);                                // the card did not get its own Enter: it would have started the tool again and wiped the line
      expect(r.store.get().line).toBe(null);                                 // laid: the line is spent
      expect(r.store.get().mode).toBe('drawing');                            // and the tool stays, as it does for a click on the tick
      expect(r.ui.placement.canUndo()).toBe(true);                           // a road was laid: there is something to undo
    } finally { r.cleanup(); }
  });
  it('lays it whichever other button has focus: the speed button, a category tab', async () => {
    for (const sel of ['#topbar .speed-bar button', '#panel .tab']) {
      const { r } = await rigWithRoad();
      try {
        const b = r.root.querySelector(sel);
        b.focus();
        const speed = r.world.speed;
        key(b, 'Enter');
        expect([sel, r.store.get().line, r.world.speed, r.ui.placement.canUndo()]).toEqual([sel, null, speed, true]);   // laid, and the focused button did not run
      } finally { r.cleanup(); }
    }
  });
  it('leaves a focused card its own Enter when nothing is waiting, so a keyboard user can still pick one', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const card = r.root.querySelector('#panel .cards .card');
      card.focus();
      const ev = key(card, 'Enter');
      expect(ev.defaultPrevented).toBe(false);
    } finally { r.cleanup(); }
  });
  it('leaves the confirm bar\'s own buttons their Enter: Cancel cancels, it does not lay', async () => {
    const { r } = await rigWithRoad();
    try {
      const cancel = r.root.querySelector('#confirm .cancel');
      cancel.focus();
      const ev = key(cancel, 'Enter');
      expect(ev.defaultPrevented).toBe(false);                               // native Enter on the button: its click cancels
      expect(r.ui.placement.canUndo()).toBe(false);
      fire(cancel, 'click');
      expect(r.store.get().mode).toBe('browse');
    } finally { r.cleanup(); }
  });
  it('says why when the spot is refused, and changes nothing', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    r.renderer.renderFrame = () => {};
    try {
      r.store.set({ category: 'services' });
      const card = [...r.root.querySelectorAll('#panel .cards .card')].find((c) => /well/i.test(c.textContent));
      fire(card, 'click');
      const again = [...r.root.querySelectorAll('#panel .cards .card')].find((c) => /well/i.test(c.textContent));
      again.focus();
      r.ui.placement.moveGhost(12, 9);                                       // a hut stands here
      expect(r.ui.placement.preview().state).toBe('bad');
      const gold = r.world.gold;
      key(again, 'Enter');
      expect(r.root.querySelector('#toasts .toast').textContent).toContain(reasonText('occupied'));
      expect(r.world.gold).toBe(gold);
    } finally { r.cleanup(); }
  });
  it('does nothing while a dialog is up, a sheet is open or a text field has focus, and lays once they are gone', async () => {
    const { r, card } = await rigWithRoad();
    try {
      r.store.set({ confirmDialog: { text: 'Sure?', confirmLabel: 'Yes', onConfirm: () => {} } });
      key(card, 'Enter');
      expect(r.ui.placement.canUndo()).toBe(false);
      r.store.set({ confirmDialog: null });
      const field = document.createElement('input');
      r.root.append(field);
      field.focus();
      key(field, 'Enter');
      expect(r.ui.placement.canUndo()).toBe(false);
      field.remove();
      key(card, 'Enter');                                                    // and with no obstacle it lays
      expect(r.ui.placement.canUndo()).toBe(true);
    } finally { r.cleanup(); }
  });
  it('Esc takes back what is drawn and leaves the tool, whichever button has focus', async () => {
    const { r, card } = await rigWithRoad();
    try {
      key(card, 'Escape');
      expect([r.store.get().line, r.store.get().mode]).toEqual([null, 'browse']);
      expect(r.ui.placement.canUndo()).toBe(false);                          // nothing was laid
    } finally { r.cleanup(); }
  });
  it('shows the Enter key on the tick where there is a keyboard, and names it for assistive technology', async () => {
    const { r } = await rigWithRoad();
    try {
      const ok = r.root.querySelector('#confirm .ok');
      expect(ok.getAttribute('aria-keyshortcuts')).toBe('Enter');
      expect(r.root.querySelector('#confirm .cancel').getAttribute('aria-keyshortcuts')).toBe('Escape');
      const hint = ok.querySelector('.keyhint');
      expect(hint.textContent).toBe('Enter');
      expect(hint.getAttribute('aria-hidden')).toBe('true');
      expect(ok.getAttribute('aria-label')).toBe('Confirm');                // the name is still Confirm: the hint is a picture for the eye
      document.body.dataset.keyboard = 'fine';
      expect(getComputedStyle(hint).display !== 'none').toBe(true);              // a mouse is attached and the layout is wide: shown
      expect(ok.getBoundingClientRect().height >= 43.5 && ok.getBoundingClientRect().width >= 43.5).toBe(true);
      delete document.body.dataset.keyboard;
      expect(getComputedStyle(hint).display).toBe('none');                   // no keyboard seen: nothing extra on the tick
    } finally { delete document.body.dataset.keyboard; r.cleanup(); }
  });
  it('keyboard.js: pending() hands Enter to the game even from a button; a synthetic key press leaves no body mark', () => {
    const { root, cleanup } = mount('<div id="t" tabindex="0"><button id="b">Go</button></div>');
    const target = root.querySelector('#t'), button = root.querySelector('#b');
    const log = [];
    let pending = false;
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const kb = createKeyboard({ target, cam, cameraControl: null, actions: { confirm: () => log.push('confirm'), pause: () => log.push('pause') }, pending: () => pending });
    try {
      expect(key(button, 'Enter').defaultPrevented).toBe(false);
      pending = true;
      expect(key(button, 'Enter').defaultPrevented).toBe(true);
      expect(log).toEqual(['confirm']);
      key(button, ' ');                                                       // Space on a button stays the button's (pause is not Enter)
      expect(log).toEqual(['confirm']);
      expect(document.body.dataset.keyboard === 'used').toBe(false);          // only a real (trusted) key press says a keyboard is in use
    } finally { kb.detach(); cleanup(); }
  });
});
