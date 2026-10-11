import { describe, it, expect } from '../harness.js';
import { createSpeedControl } from '../../src/ui/speed.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { SPEED_LABELS, T } from '../../src/ui/text.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

function fakeDoc(hidden = false) {
  const listeners = [];
  return { get hidden() { return hidden; }, set hidden(v) { hidden = v; }, addEventListener: (t, fn) => listeners.push([t, fn]), removeEventListener: (t, fn) => listeners.splice(listeners.findIndex((l) => l[1] === fn), 1), fireVisibility() { for (const [t, fn] of listeners) if (t === 'visibilitychange') fn(); }, listeners };
}

describe('ui speed', () => {
  it('sets, toggles and steps the speed through the command and remembers the last speed', () => {
    const w = makeTestWorld();
    const store = createStore(INITIAL_UI_STATE);
    const log = [];
    const ctl = createSpeedControl({ world: w, store, afterCommand: (e) => log.push(e.kind) });
    expect(ctl.set(2).ok).toBe(true);
    expect(w.speed).toBe(2);
    expect(store.get().lastSpeed).toBe(2);
    ctl.toggle();
    expect(w.speed).toBe(0);
    ctl.toggle();
    expect(w.speed).toBe(2);
    ctl.faster(); ctl.faster();
    expect(w.speed).toBe(3);
    ctl.slower(); ctl.slower(); ctl.slower(); ctl.slower();
    expect(w.speed).toBe(0);
    expect(ctl.set(7).ok).toBe(false);
    expect(log.length).toBe(9);
  });
  it('pauses when the page is hidden and says so when it comes back', () => {
    const w = makeTestWorld();
    w.speed = 1;
    const doc = fakeDoc();
    const said = [];
    const ctl = createSpeedControl({ world: w, store: createStore(INITIAL_UI_STATE), doc, onPausedHidden: () => said.push('paused') });
    const stop = ctl.watchVisibility();
    doc.hidden = true; doc.fireVisibility();
    expect(w.speed).toBe(0);
    doc.hidden = false; doc.fireVisibility();
    expect(w.speed).toBe(0);
    expect(said).toEqual(['paused']);
    doc.hidden = true; doc.fireVisibility();
    doc.hidden = false; doc.fireVisibility();
    expect(said).toEqual(['paused']);          // nothing to say when it was already paused
    stop();
    expect(doc.listeners.length).toBe(0);
  });
  it('keeps the paused-while-hidden report when the page is hidden twice before it comes back', () => {
    const w = makeTestWorld();
    w.speed = 1;
    const doc = fakeDoc();
    const said = [];
    const ctl = createSpeedControl({ world: w, store: createStore(INITIAL_UI_STATE), doc, onPausedHidden: () => said.push('paused') });
    ctl.watchVisibility();
    doc.hidden = true; doc.fireVisibility();
    doc.fireVisibility();                      // a second hidden event: already paused, so nothing new to pause
    doc.hidden = false; doc.fireVisibility();
    expect(said).toEqual(['paused']);
  });
  it('mounts the corner button and the wide bar as labelled buttons', () => {
    const { root, cleanup } = mount('<div id="c"></div><div id="b"></div>');
    const w = makeTestWorld();
    const ctl = createSpeedControl({ world: w, store: createStore(INITIAL_UI_STATE) });
    ctl.mountCorner(root.querySelector('#c'));
    ctl.mountBar(root.querySelector('#b'));
    const main = root.querySelector('#c .speed-main');
    const face = main.querySelector('.face');                     // what shows; the hidden sizers only hold its width
    expect(face.textContent).toContain(T.play);                  // "▶ Play" when paused (early-game pass 2.9)
    fire(main, 'click');
    expect(w.speed).toBe(1);
    ctl.render();
    expect(face.textContent).toContain(SPEED_LABELS[1]);
    expect(face.textContent.includes(T.play)).toBe(false);
    for (const s of main.querySelectorAll('.sizer')) expect(s.getAttribute('aria-hidden')).toBe('true');
    fire(root.querySelector('#c .speed-chevron'), 'click');
    const options = root.querySelectorAll('#c .speed-options button');
    expect(options.length).toBe(3);
    fire(options[2], 'click');
    expect(w.speed).toBe(3);
    const bar = root.querySelectorAll('#b button');
    expect(bar.length).toBe(4);
    ctl.render();
    expect(bar[3].getAttribute('aria-pressed')).toBe('true');
    fire(bar[0], 'click');
    expect(w.speed).toBe(0);
    cleanup();
  });
});
