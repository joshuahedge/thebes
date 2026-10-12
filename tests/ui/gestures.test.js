import { describe, it, expect } from '../harness.js';
import { createGestures } from '../../src/ui/gestures.js';
import { DRAG_THRESHOLD_PX, DOUBLE_TAP_MS } from '../../src/data/ui.js';

function rig({ doubleTap } = {}) {
  const log = [];
  let t = 0;
  const g = createGestures({
    onTap: (e) => log.push(['tap', e.x, e.y, e.type]),
    onDoubleTap: (e) => log.push(['double', e.x, e.y]),
    onDragStart: (e) => log.push(['dragStart', e.x, e.y, e.button]),
    onDrag: (e) => log.push(['drag', e.dx, e.dy]),
    onDragEnd: (e) => log.push(e.pinch ? ['dragEnd', 'pinch'] : ['dragEnd']),
    onPinchStart: (e) => log.push(['pinchStart', Math.round(e.cx), Math.round(e.cy)]),
    onPinch: (e) => log.push(['pinch', Math.round(e.scale * 100) / 100, Math.round(e.dx), Math.round(e.dy)]),
    onPinchEnd: () => log.push(['pinchEnd']),
  }, { now: () => t, ...(doubleTap ? { doubleTap } : {}) });
  return { g, log, setTime: (v) => { t = v; } };
}

describe('ui gestures', () => {
  it('fires a tap for a press and release without movement', () => {
    const { g, log } = rig();
    g.pointerDown(1, 10, 10, 'touch');
    g.pointerMove(1, 12, 11);
    g.pointerUp(1, 12, 11);
    expect(log).toEqual([['tap', 12, 11, 'touch']]);
    expect(g.pointerCount).toBe(0);
  });
  it('starts a drag past the threshold and reports deltas per move', () => {
    const { g, log } = rig();
    g.pointerDown(1, 0, 0, 'mouse', 0);
    g.pointerMove(1, DRAG_THRESHOLD_PX - 1, 0);
    expect(log).toEqual([]);
    g.pointerMove(1, DRAG_THRESHOLD_PX + 2, 0);
    expect(g.dragging).toBe(true);
    g.pointerMove(1, DRAG_THRESHOLD_PX + 7, 3);
    g.pointerUp(1, DRAG_THRESHOLD_PX + 7, 3);
    expect(log[0]).toEqual(['dragStart', 0, 0, 0]);
    expect(log[1]).toEqual(['drag', DRAG_THRESHOLD_PX + 2, 0]);
    expect(log[2]).toEqual(['drag', 5, 3]);
    expect(log[3]).toEqual(['dragEnd']);
    expect(log.length).toBe(4);
  });
  it('turns two quick touch taps into a double tap, but not for a mouse', () => {
    const { g, log, setTime } = rig();
    g.pointerDown(1, 50, 50, 'touch'); g.pointerUp(1, 50, 50);
    setTime(DOUBLE_TAP_MS - 50);
    g.pointerDown(2, 54, 52, 'touch'); g.pointerUp(2, 54, 52);
    expect(log).toEqual([['tap', 50, 50, 'touch'], ['double', 54, 52]]);
    setTime(DOUBLE_TAP_MS * 3);
    g.pointerDown(3, 50, 50, 'mouse'); g.pointerUp(3, 50, 50);
    setTime(DOUBLE_TAP_MS * 3 + 50);
    g.pointerDown(4, 50, 50, 'mouse'); g.pointerUp(4, 50, 50);
    expect(log.slice(2)).toEqual([['tap', 50, 50, 'mouse'], ['tap', 50, 50, 'mouse']]);
  });
  it('gives two quick taps as two taps while the double tap is switched off (placement review P4)', () => {
    let on = false;
    const { g, log, setTime } = rig({ doubleTap: () => on });
    g.pointerDown(1, 50, 50, 'touch'); g.pointerUp(1, 50, 50);
    setTime(DOUBLE_TAP_MS - 50);
    g.pointerDown(2, 54, 52, 'touch'); g.pointerUp(2, 54, 52);
    expect(log).toEqual([['tap', 50, 50, 'touch'], ['tap', 54, 52, 'touch']]);
    on = true;
    setTime(DOUBLE_TAP_MS - 20);
    g.pointerDown(3, 54, 52, 'touch'); g.pointerUp(3, 54, 52);
    expect(log[2]).toEqual(['double', 54, 52]);
  });
  it('treats two fingers as a pinch and never as taps', () => {
    const { g, log } = rig();
    g.pointerDown(1, 100, 100, 'touch');
    g.pointerDown(2, 200, 100, 'touch');
    g.pointerMove(2, 300, 100);
    g.pointerUp(2, 300, 100);
    g.pointerUp(1, 100, 100);
    expect(log[0]).toEqual(['pinchStart', 150, 100]);
    expect(log[1]).toEqual(['pinch', 2, 50, 0]);
    expect(log[2]).toEqual(['pinchEnd']);
    expect(log.length).toBe(3);
  });
  it('ends a drag when a second finger arrives and cancels cleanly', () => {
    const { g, log } = rig();
    g.pointerDown(1, 0, 0, 'touch');
    g.pointerMove(1, 20, 0);
    g.pointerDown(2, 60, 0, 'touch');
    expect(log.map((e) => e[0])).toEqual(['dragStart', 'drag', 'dragEnd', 'pinchStart']);
    expect(log[2]).toEqual(['dragEnd', 'pinch']);                     // the drag says a second finger ended it, so a stroke can be taken back
    g.cancel(2);
    g.cancel(1);
    expect(log[log.length - 1]).toEqual(['pinchEnd']);
    expect(g.pointerCount).toBe(0);
    expect(g.dragging).toBe(false);
  });
});
