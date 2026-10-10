import { describe, it, expect } from '../harness.js';
import { createConfirmBar } from '../../src/ui/confirmBar.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { reasonText, T } from '../../src/ui/text.js';
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
    r.bar.render();
    expect(r.bar.element.hidden).toBe(false);
    expect(r.root.querySelector('.title').textContent).toBe('Well');
    expect(r.root.querySelector('.cost').textContent).toContain('30');
    expect(r.root.querySelector('.reason').textContent).toBe(reasonText('needs_road'));
    expect(r.root.querySelector('.reason').classList.contains('coral')).toBe(true);
    expect(r.root.querySelector('.ok').disabled).toBe(true);
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
    expect(r.root.querySelector('.undo').disabled).toBe(true);
    r.placement.pointAt(10, 12); r.placement.pointAt(14, 14);
    r.bar.render();
    fire(r.root.querySelector('.flip'), 'click');
    expect(r.store.get().line.flip).toBe(true);
    r.placement.confirm();
    r.bar.render();
    expect(r.root.querySelector('.undo').disabled).toBe(false);
    fire(r.root.querySelector('.undo'), 'click');
    expect(r.log).toEqual(['undo']);
    r.placement.start({ kind: 'demolish' });
    r.placement.pointAt(10, 12); r.placement.pointAt(10, 12);
    r.bar.render();
    expect(r.root.querySelector('.confirm').classList.contains('demolish')).toBe(true);
    expect(r.root.querySelector('.title').textContent).toBe(T.demolish);
    expect(r.root.querySelector('.reason').textContent).toContain('1 item');
    r.cleanup();
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
