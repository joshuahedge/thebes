import { describe, it, expect } from '../harness.js';
import { createConfirmBar } from '../../src/ui/confirmBar.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { reasonText, T, CONDITION_TEXT } from '../../src/ui/text.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

function rig() {
  const { root, cleanup } = mount();
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  const store = createStore(INITIAL_UI_STATE);
  const placement = createPlacement({ world, store });
  const log = [];
  const bar = createConfirmBar({ container: root, store, placement, onCancel: () => log.push('cancel'), onConfirm: () => log.push('confirm'), onUndo: () => log.push('undo') });
  return { root, world, store, placement, bar, log, cleanup };
}

describe('ui confirm bar', () => {
  it('is hidden outside tool modes and shows title, cost and reason inside them', () => {
    const r = rig();
    expect(r.bar.element.hidden).toBe(true);
    r.placement.start({ kind: 'building', type: 'well' }, { x: 5, y: 20 });
    r.placement.moveGhost(12, 10);                                 // the start lands on the nearest fit; put the ghost back on the road, where nothing fits
    r.bar.render();
    expect(r.bar.element.hidden).toBe(false);
    expect(r.root.querySelector('.title').textContent).toBe('Well');
    expect(r.root.querySelector('.cost').textContent).toContain('30');
    expect(r.root.querySelector('.reason').textContent).toBe(reasonText('occupied'));
    expect(r.root.querySelector('.reason').classList.contains('coral')).toBe(true);
    expect(r.root.querySelector('.ok').disabled).toBe(true);
    expect([...r.root.querySelectorAll('.conds .cond')].map((c) => `${c.className}|${c.textContent}`)).toEqual(['cond cant|✕ Ground taken', 'cond met|✓ Road beside it']);
    r.placement.moveGhost(5, 20);                                  // off the road: it can be placed, in amber, and waits for one (P10)
    r.bar.render();
    expect(r.root.querySelector('.reason').textContent).toBe(CONDITION_TEXT.roadHint);
    expect(r.root.querySelector('.reason').classList.contains('amber')).toBe(true);
    expect(r.root.querySelector('.ok').disabled).toBe(false);
    expect([...r.root.querySelectorAll('.conds .cond')].map((c) => `${c.className}|${c.textContent}|${c.getAttribute('aria-label')}`)).toEqual([
      'cond met|✓ Free ground|Met: Free ground', 'cond later|! No road yet|Not yet: No road yet']);
    r.placement.moveGhost(5, 9);
    r.bar.render();
    expect(r.root.querySelector('.ok').disabled).toBe(false);
    fire(r.root.querySelector('.ok'), 'click');
    expect(r.log).toEqual(['confirm']);
    fire(r.root.querySelector('.cancel'), 'click');
    expect(r.log).toEqual(['confirm', 'cancel']);
    r.cleanup();
  });
  it('offers Flip for a finished road, Undo when there is history, and the red demolish variant', () => {
    const r = rig();
    r.placement.start({ kind: 'road' });
    r.bar.render();
    expect(r.root.querySelector('.flip')).toBe(null);
    expect(r.root.querySelector('.undo')).toBe(null);               // a phone shows Undo only when there is something to undo
    r.placement.pointAt(10, 12); r.placement.pointAt(14, 14);
    r.bar.render();
    fire(r.root.querySelector('.flip'), 'click');
    expect(r.store.get().line.flip).toBe(true);
    r.placement.confirm();
    r.bar.render();
    const undo = r.root.querySelector('.undo');
    expect(undo.disabled).toBe(false);
    expect([undo.getAttribute('aria-label'), undo.textContent]).toEqual([T.undo, '↶']);   // an icon button named Undo on a phone
    fire(undo, 'click');
    expect(r.log).toEqual(['undo']);
    r.placement.start({ kind: 'demolish' });
    r.placement.pointAt(10, 12); r.placement.pointAt(10, 12);
    r.bar.render();
    expect(r.root.querySelector('.confirm').classList.contains('demolish')).toBe(true);
    expect(r.root.querySelector('.title').textContent).toBe(T.demolish);
    expect(r.root.querySelector('.reason').textContent).toContain('1 item');
    r.cleanup();
  });
  it('keeps the word Undo on the wide layout, greyed out with nothing to undo', () => {
    const r = rig();
    r.store.set({ layout: 'wide' });
    r.placement.start({ kind: 'road' });
    r.bar.render();
    const undo = r.root.querySelector('.undo');
    expect([undo.textContent, undo.disabled]).toEqual([T.undo, true]);
    r.cleanup();
  });
  it('tells onConfirm which input pressed the tick: touch, pen, mouse, or the keyboard', () => {
    const types = [];
    const { root, cleanup } = mount();
    const world = makeTestWorld({ gold: 1000 });
    setRoad(world, 0, 10, 31, 10);
    const store = createStore(INITIAL_UI_STATE);
    const placement = createPlacement({ world, store });
    createConfirmBar({ container: root, store, placement, onCancel() {}, onConfirm: (type) => types.push(type), onUndo() {} });
    placement.start({ kind: 'building', type: 'well' }, { x: 5, y: 9 });
    placement.moveGhost(5, 9);
    const press = (pointerType) => {
      const ok = root.querySelector('.ok');
      if (pointerType) fire(ok, 'pointerdown', { pointerType });
      fire(ok, 'click');
    };
    press('touch'); press('pen'); press('mouse'); press(null);           // no pointerdown before the click: Enter or Space on the button
    press('touch'); fire(root.querySelector('.ok'), 'pointercancel'); press(null);   // a press that never became a click is forgotten
    expect(types).toEqual(['touch', 'pen', 'mouse', 'keyboard', 'touch', 'keyboard']);
    // A press that ends off the tick never clicks it, so it is forgotten too: the next click with no press of its own (a screen
    // reader's activate) counts as the keyboard (final review 10).
    types.length = 0;
    const ok = root.querySelector('.ok'), box = ok.getBoundingClientRect();
    const inside = { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
    fire(ok, 'pointerdown', { pointerType: 'touch', ...inside });
    fire(ok, 'pointerup', { pointerType: 'touch', buttons: 0, clientX: box.right + 60, clientY: box.top - 60 });   // the finger slid off
    press(null);
    fire(ok, 'pointerdown', { pointerType: 'pen', ...inside });
    fire(ok, 'pointerleave', { pointerType: 'pen', buttons: 1 });       // dragged off while still pressed
    press(null);
    fire(ok, 'pointerdown', { pointerType: 'touch', ...inside });
    fire(ok, 'pointerup', { pointerType: 'touch', buttons: 0, ...inside });
    fire(ok, 'pointerleave', { pointerType: 'touch', buttons: 0 });     // a lifted finger leaves after its up: the click still follows
    fire(ok, 'click');
    expect(types).toEqual(['keyboard', 'keyboard', 'touch']);
    cleanup();
  });
  it('keeps keyboard focus on the same control when the bar rebuilds', () => {
    const r = rig();
    r.placement.start({ kind: 'road' });
    r.placement.pointAt(10, 12); r.placement.pointAt(14, 14);
    r.bar.render();
    r.root.querySelector('.flip').focus();
    r.placement.flip();
    expect(document.activeElement.classList.contains('flip')).toBe(true);
    r.cleanup();
  });
});
