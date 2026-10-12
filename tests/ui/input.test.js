import { describe, it, expect } from '../harness.js';
import { createMapInput } from '../../src/ui/input.js';
import { createCamera } from '../../src/render/camera.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { DRAG_THRESHOLD_PX, ZOOM_STEP, GHOST_FINGER_OFFSET_PX } from '../../src/data/ui.js';
import { mount, fire } from '../helpers/dom.js';

function rig({ mode = 'browse', ghost = false } = {}) {
  const { root, cleanup } = mount('<canvas id="c" width="400" height="300" style="width:400px;height:300px;display:block"></canvas>');
  const canvas = root.querySelector('canvas');
  const rect = canvas.getBoundingClientRect();
  const at = (x, y) => ({ clientX: rect.left + x, clientY: rect.top + y });
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: () => true });
  const store = createStore({ ...INITIAL_UI_STATE, mode });
  const log = [];
  const actions = {
    tap: (e) => log.push(['tap', Math.round(e.x), Math.round(e.y), e.type, e.button]),
    secondary: () => log.push(['secondary']),
    hover: (e) => log.push(['hover', e ? Math.round(e.x) : null]),
    ghostDragStart: () => { log.push(['ghostDragStart']); return ghost; },
    ghostDrag: (e) => log.push(['ghostDrag', Math.round(e.x), Math.round(e.y)]),
    ghostDragEnd: () => log.push(['ghostDragEnd']),
    drawDrag: (e) => log.push(['drawDrag', e.phase, Math.round(e.x), Math.round(e.y)]),
    strokeDrag: (e) => log.push(e.phase === 'cancel' ? ['strokeDrag', 'cancel'] : ['strokeDrag', e.phase, Math.round(e.x), Math.round(e.y)]),
    panStarted: () => log.push(['panStarted']),
  };
  const input = createMapInput({ canvas, cam, view, cameraControl, store, actions, root });
  return { canvas, at, cam, store, log, input, cleanup, root };
}

describe('ui map input', () => {
  it('taps and records the input type per press', () => {
    const r = rig();
    fire(r.canvas, 'pointerdown', { ...r.at(100, 80), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(100, 80), pointerId: 1, pointerType: 'touch' });
    expect(r.log).toEqual([['tap', 100, 80, 'touch', 0]]);
    expect(r.store.get().inputType).toBe('touch');
    expect(r.root.dataset.input).toBe('touch');
    fire(r.canvas, 'pointerdown', { ...r.at(10, 10), pointerId: 2, pointerType: 'mouse' });
    expect(r.store.get().inputType).toBe('mouse');
    r.input.detach(); r.cleanup();
  });
  it('pans the camera on a one-finger drag and tells the UI once', () => {
    const r = rig();
    const before = { x: r.cam.x, y: r.cam.y };
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(100 + DRAG_THRESHOLD_PX + 40, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(100 + DRAG_THRESHOLD_PX + 80, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(100 + DRAG_THRESHOLD_PX + 80, 100), pointerId: 1, pointerType: 'touch' });
    expect(r.cam.x < before.x && r.cam.y > before.y).toBe(true);     // the world slid right, so the camera moved up-left in tile space
    expect(r.log.filter((e) => e[0] === 'panStarted').length).toBe(1);
    expect(r.log.some((e) => e[0] === 'tap')).toBe(false);
    r.input.detach(); r.cleanup();
  });
  it('draws a stroke instead of panning on a one-finger drag in a drawing tool, and a pen does too (placement review P3)', () => {
    for (const [mode, type] of [['drawing', 'touch'], ['demolishing', 'pen']]) {
      const r = rig({ mode });
      const before = { x: r.cam.x, y: r.cam.y };
      fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 1, pointerType: type });
      fire(r.canvas, 'pointermove', { ...r.at(140, 100), pointerId: 1, pointerType: type });
      fire(r.canvas, 'pointermove', { ...r.at(180, 120), pointerId: 1, pointerType: type });
      fire(r.canvas, 'pointerup', { ...r.at(180, 120), pointerId: 1, pointerType: type });
      expect([mode, r.log]).toEqual([mode, [['strokeDrag', 'start', 100, 100], ['strokeDrag', 'move', 140, 100], ['strokeDrag', 'move', 180, 120], ['strokeDrag', 'end', 180, 120]]]);
      expect([r.cam.x, r.cam.y]).toEqual([before.x, before.y]);
      r.input.detach(); r.cleanup();
    }
  });
  it('takes a stroke back when a second finger arrives, and pans and zooms with two fingers', () => {
    const r = rig({ mode: 'drawing' });
    const before = { x: r.cam.x, zoom: r.cam.zoom };
    fire(r.canvas, 'pointerdown', { ...r.at(100, 150), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(120, 150), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerdown', { ...r.at(200, 150), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(260, 150), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(260, 150), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(120, 150), pointerId: 1, pointerType: 'touch' });
    expect(r.log.filter((e) => e[0] === 'strokeDrag')).toEqual([['strokeDrag', 'start', 100, 150], ['strokeDrag', 'move', 120, 150], ['strokeDrag', 'cancel']]);
    expect(r.cam.zoom > before.zoom && r.cam.x !== before.x).toBe(true);
    expect(r.log.some((e) => e[0] === 'tap')).toBe(false);
    r.input.detach(); r.cleanup();
  });
  it('takes a stroke back when the browser cancels the touch', () => {
    const r = rig({ mode: 'drawing' });
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(140, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointercancel', { pointerId: 1, pointerType: 'touch' });
    expect(r.log).toEqual([['strokeDrag', 'start', 100, 100], ['strokeDrag', 'move', 140, 100], ['strokeDrag', 'cancel']]);
    r.input.detach(); r.cleanup();
  });
  it('gives two quick taps as two taps while a tool is open, so neighbouring tiles can be tapped (placement review P4)', () => {
    for (const mode of ['drawing', 'placing']) {
      const r = rig({ mode });
      fire(r.canvas, 'pointerdown', { ...r.at(200, 150), pointerId: 1, pointerType: 'touch' });
      fire(r.canvas, 'pointerup', { ...r.at(200, 150), pointerId: 1, pointerType: 'touch' });
      fire(r.canvas, 'pointerdown', { ...r.at(210, 150), pointerId: 2, pointerType: 'touch' });
      fire(r.canvas, 'pointerup', { ...r.at(210, 150), pointerId: 2, pointerType: 'touch' });
      expect([mode, r.cam.zoom, r.log]).toEqual([mode, 1, [['tap', 200, 150, 'touch', 0], ['tap', 210, 150, 'touch', 0]]]);
      r.input.detach(); r.cleanup();
    }
  });
  it('moves the ghost instead of panning when the drag starts on it', () => {
    const r = rig({ mode: 'placing', ghost: true });
    const before = r.cam.x;
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(140, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(140, 100), pointerId: 1, pointerType: 'touch' });
    expect(r.cam.x).toBe(before);
    expect(r.log).toEqual([['ghostDragStart'], ['ghostDrag', 140, 100 - GHOST_FINGER_OFFSET_PX], ['ghostDragEnd']]);
    r.input.detach(); r.cleanup();
  });
  it('zooms with the wheel towards the cursor and in on a double tap', () => {
    const r = rig();
    fire(r.canvas, 'wheel', { ...r.at(50, 50), deltaY: -100 });
    expect(r.cam.zoom).toBeGreaterThan(1);
    fire(r.canvas, 'wheel', { ...r.at(50, 50), deltaY: 100 });
    expect(Math.abs(r.cam.zoom - 1) < 1e-9).toBe(true);
    fire(r.canvas, 'pointerdown', { ...r.at(200, 150), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(200, 150), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerdown', { ...r.at(202, 150), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(202, 150), pointerId: 2, pointerType: 'touch' });
    expect(Math.abs(r.cam.zoom - ZOOM_STEP) < 1e-9).toBe(true);
    r.input.detach(); r.cleanup();
  });
  it('pinches to zoom and pan', () => {
    const r = rig();
    fire(r.canvas, 'pointerdown', { ...r.at(100, 150), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerdown', { ...r.at(200, 150), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(260, 150), pointerId: 2, pointerType: 'touch' });
    expect(r.cam.zoom).toBeGreaterThan(1.5);
    fire(r.canvas, 'pointerup', { ...r.at(260, 150), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(100, 150), pointerId: 1, pointerType: 'touch' });
    expect(r.log.some((e) => e[0] === 'tap')).toBe(false);
    r.input.detach(); r.cleanup();
  });
  it('hovers with the mouse, goes back on a right-button press and release, and drags a line while drawing', () => {
    const r = rig({ mode: 'drawing' });
    fire(r.canvas, 'pointermove', { ...r.at(30, 40), pointerId: 1, pointerType: 'mouse', buttons: 0 });
    fire(r.canvas, 'pointerleave', { pointerId: 1, pointerType: 'mouse' });
    expect(r.log).toEqual([['hover', 30], ['hover', null]]);
    // A real right-click presses the button first (which also records the input type as mouse).
    fire(r.canvas, 'pointerdown', { ...r.at(30, 40), pointerId: 5, pointerType: 'mouse', button: 2, buttons: 2 });
    fire(r.canvas, 'pointerup', { ...r.at(30, 40), pointerId: 5, pointerType: 'mouse', button: 2 });
    expect(r.log[2]).toEqual(['secondary']);
    expect(r.log.length).toBe(3);
    const ctx = fire(r.canvas, 'contextmenu', r.at(30, 40));                  // the context menu event alone is only suppressed
    expect(ctx.defaultPrevented).toBe(true);
    expect(r.log.length).toBe(3);
    const before = r.cam.x;
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 3, pointerType: 'mouse', button: 0 });
    fire(r.canvas, 'pointermove', { ...r.at(160, 100), pointerId: 3, pointerType: 'mouse', buttons: 1 });
    fire(r.canvas, 'pointerup', { ...r.at(160, 100), pointerId: 3, pointerType: 'mouse', button: 0 });
    expect(r.log.slice(3)).toEqual([['drawDrag', 'start', 100, 100], ['drawDrag', 'move', 160, 100], ['drawDrag', 'end', 160, 100]]);
    expect(r.cam.x).toBe(before);
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 4, pointerType: 'mouse', button: 2, buttons: 2 });
    fire(r.canvas, 'pointermove', { ...r.at(160, 100), pointerId: 4, pointerType: 'mouse', buttons: 2 });
    fire(r.canvas, 'pointerup', { ...r.at(160, 100), pointerId: 4, pointerType: 'mouse', button: 2 });
    expect(r.cam.x === before).toBe(false);
    r.input.detach(); r.cleanup();
  });
  it('ignores a touch long-press context menu, and a context menu on its own', () => {
    const r = rig();
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointercancel', { pointerId: 1, pointerType: 'touch' });   // Android cancels the touch when it opens the menu
    fire(r.canvas, 'contextmenu', r.at(100, 100));
    expect(r.log.some((e) => e[0] === 'secondary')).toBe(false);
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(100, 100), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'contextmenu', r.at(100, 100));
    expect(r.log.some((e) => e[0] === 'secondary')).toBe(false);
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 3, pointerType: 'mouse', button: 2, buttons: 2 });
    fire(r.canvas, 'pointerup', { ...r.at(100, 100), pointerId: 3, pointerType: 'mouse', button: 2 });
    expect(r.log.filter((e) => e[0] === 'secondary').length).toBe(1);
    r.input.detach(); r.cleanup();
  });
  it('does not go back when a right-button drag pans, even though the browser then fires contextmenu', () => {
    const r = rig();
    const before = { x: r.cam.x, y: r.cam.y };
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 1, pointerType: 'mouse', button: 2, buttons: 2 });
    fire(r.canvas, 'pointermove', { ...r.at(100 + DRAG_THRESHOLD_PX + 40, 100), pointerId: 1, pointerType: 'mouse', buttons: 2 });
    fire(r.canvas, 'pointerup', { ...r.at(100 + DRAG_THRESHOLD_PX + 40, 100), pointerId: 1, pointerType: 'mouse', button: 2 });
    fire(r.canvas, 'contextmenu', r.at(100 + DRAG_THRESHOLD_PX + 40, 100));
    expect(r.log.some((e) => e[0] === 'secondary')).toBe(false);
    expect(r.cam.x === before.x && r.cam.y === before.y).toBe(false);
    r.input.detach(); r.cleanup();
  });
  it('ignores a wheel with no vertical delta', () => {
    const r = rig();
    const before = r.cam.zoom;
    const ev = fire(r.canvas, 'wheel', { ...r.at(50, 50), deltaY: 0, deltaX: 120 });
    expect(r.cam.zoom).toBe(before);
    expect(ev.defaultPrevented).toBe(true);
    r.input.detach(); r.cleanup();
  });
  it('does not treat a middle click as a tap', () => {
    const r = rig();
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 1, pointerType: 'mouse', button: 1, buttons: 4 });
    fire(r.canvas, 'pointerup', { ...r.at(100, 100), pointerId: 1, pointerType: 'mouse', button: 1, buttons: 0 });
    expect(r.log.some((e) => e[0] === 'tap')).toBe(false);
    r.input.detach(); r.cleanup();
  });
  it('does not commit a drawn line when the drag is cancelled', () => {
    const r = rig({ mode: 'drawing' });
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 3, pointerType: 'mouse', button: 0 });
    fire(r.canvas, 'pointermove', { ...r.at(160, 100), pointerId: 3, pointerType: 'mouse', buttons: 1 });
    fire(r.canvas, 'pointercancel', { pointerId: 3, pointerType: 'mouse' });
    expect(r.log).toEqual([['drawDrag', 'start', 100, 100], ['drawDrag', 'move', 160, 100]]);
    r.input.detach(); r.cleanup();
  });
});
