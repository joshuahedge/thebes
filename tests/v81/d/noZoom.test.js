// Version 8.1, Track D (ruling 1251): no page zoom on the interface. A pinch or a double tap on the tray, the bars, the sheets or the top bar must never zoom the page; the map's own pinch zoom keeps working.
// The viewport meta, touch-action on the chrome, iOS's gesture events and a double-tap guard. What only a real iPhone can confirm is in the rulings file.
import { describe, it, expect } from '../../harness.js';
import { installNoZoom, DOUBLE_TAP_GUARD_MS } from '../../../src/ui/v81/noZoom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { mount } from '../../helpers/dom.js';

const fakeDoc = () => {
  const on = {};
  return { on, addEventListener(type, fn, opts) { (on[type] = on[type] || []).push({ fn, opts }); }, removeEventListener(type, fn) { on[type] = (on[type] || []).filter((l) => l.fn !== fn); } };
};
const touchEnd = (target, touches = []) => { const e = { target, touches, cancelable: true, prevented: false, preventDefault() { this.prevented = true; } }; return e; };
const send = (doc, type, e) => { for (const l of [...(doc.on[type] || [])]) l.fn(e); return e; };

describe('v81 d no zoom: the handlers', () => {
  it('registers iOS gesturestart, gesturechange and gestureend (not passive, so they can cancel) and each cancels the gesture', () => {
    const doc = fakeDoc();
    const nz = installNoZoom({ doc, now: () => 0 });
    for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
      expect([type, (doc.on[type] || []).length, (doc.on[type] || [])[0] && doc.on[type][0].opts.passive]).toEqual([type, 1, false]);
      const e = { cancelable: true, prevented: false, preventDefault() { this.prevented = true; } };
      send(doc, type, e);
      expect([type, e.prevented]).toEqual([type, true]);
    }
    nz.detach();
    expect(['gesturestart', 'gesturechange', 'gestureend', 'touchend'].map((t) => (doc.on[t] || []).length)).toEqual([0, 0, 0, 0]);
  });

  it('refuses the second of two quick taps on bare chrome (a bar, a gap), never one on a button, card, field or the map, and never after the guard time', () => {
    const { root, cleanup } = mount('<div class="bare"><span class="gap"></span></div><button class="b">B</button><div class="card" data-item="well"><span class="inner">x</span></div><input class="f"><canvas class="c"></canvas>');
    try {
      const doc = fakeDoc();
      let t = 1000;
      installNoZoom({ doc, now: () => t });
      const gap = root.querySelector('.gap');
      expect(send(doc, 'touchend', touchEnd(gap)).prevented).toBe(false);          // the first tap is nothing
      t += 120;
      expect(send(doc, 'touchend', touchEnd(gap)).prevented).toBe(true);           // the second, quick one would be a double-tap zoom
      t += DOUBLE_TAP_GUARD_MS + 50;
      expect(send(doc, 'touchend', touchEnd(gap)).prevented).toBe(false);          // slow enough: a tap
      for (const sel of ['.b', '.card .inner', '.f', '.c']) {                       // two quick taps on something pressable both go through
        const n = root.querySelector(sel);
        t += 1000;
        send(doc, 'touchend', touchEnd(n));
        t += 100;
        expect([sel, send(doc, 'touchend', touchEnd(n)).prevented]).toEqual([sel, false]);
      }
      t += 1000;
      send(doc, 'touchend', touchEnd(gap));
      t += 100;
      expect(send(doc, 'touchend', touchEnd(gap, [{}])).prevented).toBe(false);    // a finger still down: a pinch's lift, left to the gesture handlers
    } finally { cleanup(); }
  });
});

describe('v81 d no zoom: the page', () => {
  it('has the viewport meta that stops page zoom, and the interface says no to a pinch while it runs and stops when it is gone', async () => {
    const html = await (await fetch('/index.html')).text();
    const content = new DOMParser().parseFromString(html, 'text/html').querySelector('meta[name="viewport"]').getAttribute('content');
    expect(['maximum-scale=1', 'user-scalable=no', 'initial-scale=1', 'viewport-fit=cover'].map((k) => content.includes(k))).toEqual([true, true, true, true]);
    const pinch = () => { const e = new Event('gesturestart', { bubbles: true, cancelable: true }); document.dispatchEvent(e); return e.defaultPrevented; };
    const r = await rigUI();
    try { expect(pinch()).toBe(true); } finally { r.cleanup(); }
    expect(pinch()).toBe(false);
  });

  it('gives every piece of chrome a touch-action with no pinch and no double-tap zoom, and the map its own', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const ta = (sel) => getComputedStyle(r.root.querySelector(sel)).touchAction;
      for (const sel of ['#topbar', '#dock', '#corners', '#sheet', '#dialog', '#under-bar']) expect([sel, ta(sel)]).toEqual([sel, 'pan-x pan-y']);
      expect(ta('#map')).toBe('none');                                              // the map's pinch and pan are its own (src/ui/input.js)
      r.root.querySelector('#dock .cat[data-category="services"]').click();
      expect(ta('#dock .tray .card')).toBe('pan-x');                                // the tray scrolls sideways; up is free to carry a card
    } finally { r.cleanup(); }
    const w = await rigUI({ width: 1280, height: 800 });
    try {
      expect([getComputedStyle(w.root.querySelector('#panel .cards .card')).touchAction, getComputedStyle(w.root.querySelector('#panel')).touchAction]).toEqual(['pan-y', 'pan-x pan-y']);
    } finally { w.cleanup(); }
  });
});
