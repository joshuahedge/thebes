// Version 10.0, Track M (ruling 2305, S14): iOS Safari ignores maximum-scale, so a two-finger touch that starts on a bar is cancelled (the gesture events and the second finger's touch), and the
// bars' touch-action has no pinch-zoom. A sheet and the rest of the page keep the deliberate pinch (ruling 1829).
import { describe, it, expect } from '../../harness.js';
import { installNoZoom } from '../../../src/ui/v81/noZoom.js';
import { mount } from '../../helpers/dom.js';
import { bootAt, SAMPLE_CITY } from './helpers.js';

const fakeDoc = () => {
  const on = {};
  return { on, addEventListener(type, fn, opts) { (on[type] = on[type] || []).push({ fn, opts }); }, removeEventListener(type, fn) { on[type] = (on[type] || []).filter((l) => l.fn !== fn); } };
};
const ev = (target, touches = []) => ({ target, touches, cancelable: true, prevented: false, preventDefault() { this.prevented = true; } });
const send = (doc, type, e) => { for (const l of [...(doc.on[type] || [])]) l.fn(e); return e; };

describe('v100 m: a pinch that starts on a bar does not zoom the page (S14)', () => {
  it('cancels iOS gesture events and a second finger that land on a bar, and leaves a sheet, a plain page and a single finger alone', () => {
    const { root, cleanup } = mount('<header id="topbar"><button class="b">b</button></header><nav id="dock"><span class="in"></span></nav><div id="sheet"><p class="p">x</p></div><div class="page"></div>');
    try {
      const doc = fakeDoc();
      const nz = installNoZoom({ doc, now: () => 0 });
      const two = [{}, {}];
      for (const sel of ['#topbar .b', '#dock .in', '#topbar']) {
        const n = root.querySelector(sel);
        for (const type of ['gesturestart', 'gesturechange', 'gestureend']) expect([sel, type, send(doc, type, ev(n)).prevented]).toEqual([sel, type, true]);
        expect([sel, 'touchstart', send(doc, 'touchstart', ev(n, two)).prevented]).toEqual([sel, 'touchstart', true]);
        expect([sel, 'touchmove', send(doc, 'touchmove', ev(n, two)).prevented]).toEqual([sel, 'touchmove', true]);
        expect([sel, 'one finger', send(doc, 'touchstart', ev(n, [{}])).prevented]).toEqual([sel, 'one finger', false]);
      }
      for (const sel of ['#sheet .p', '.page']) {
        const n = root.querySelector(sel);
        expect([sel, send(doc, 'gesturestart', ev(n)).prevented, send(doc, 'touchstart', ev(n, two)).prevented]).toEqual([sel, false, false]);
      }
      nz.detach();
      expect(['touchstart', 'touchmove'].map((t) => (doc.on[t] || []).length)).toEqual([0, 0]);
    } finally { cleanup(); }
  });

  for (const [w, h] of [[375, 667], [390, 844]]) {
    for (const text of [100, 150]) {
      it(`${w}x${h} at ${text}%: the bars' touch-action has no pinch-zoom and the sheet's keeps it`, async () => {
        const r = await bootAt(SAMPLE_CITY, w, h, text);
        try {
          const ta = (sel) => getComputedStyle(r.root.querySelector(sel)).touchAction;
          for (const sel of ['#topbar', '#dock', '#corners', '#under-bar']) expect([w, text, sel, ta(sel)]).toEqual([w, text, sel, 'pan-x pan-y']);
          expect([w, text, ta('#sheet')]).toEqual([w, text, 'manipulation']);
        } finally { r.cleanup(); }
      });
    }
  }
});
