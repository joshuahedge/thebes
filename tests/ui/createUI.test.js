import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire, key } from '../helpers/dom.js';
import { buildingAt } from '../../src/sim/world.js';
import { tickDay } from '../../src/sim/clock.js';
import { select } from '../../src/ui/modes.js';

describe('ui createUI', () => {
  it('places a well from the dock: card, ghost, tap, tick, building, then Undo from the toast', async () => {
    const r = await rigUI();
    expect(r.store.get().layout).toBe('portrait');
    fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');  // Services
    const cards = r.root.querySelectorAll('#dock .tray .card');
    expect(cards[0].querySelector('.name').textContent).toBe('Well');
    fire(cards[0], 'click');
    const s = r.store.get();
    expect(s.mode).toBe('placing');
    expect(s.overlay).toBe('water');                                          // spec 4.5: the service's overlay comes on
    expect(s.ghost).toBeTruthy();
    expect(document.body.dataset.mode).toBe('placing');
    expect(r.root.querySelector('#confirm').hidden).toBe(false);
    r.frame(0);                                                               // draws the ghost, the grid and the overlay
    r.tap(5, 9);                                                              // touch: moves the ghost, builds nothing
    expect(r.store.get().ghost).toEqual({ x: 5, y: 9 });
    expect(buildingAt(r.world, 5, 9)).toBe(null);
    fire(r.root.querySelector('#confirm .ok'), 'click');
    expect(buildingAt(r.world, 5, 9).type).toBe('well');
    expect(r.store.get().mode).toBe('placing');                               // placing repeats until the x
    const toast = r.root.querySelector('#toasts .toast');
    expect(toast.textContent).toContain('Well placed');
    fire(toast.querySelector('button'), 'click');                             // Undo
    expect(buildingAt(r.world, 5, 9)).toBe(null);
    expect(r.world.gold).toBe(1000);
    fire(r.root.querySelector('#confirm .cancel'), 'click');
    expect(r.store.get().mode).toBe('browse');
    expect(r.root.querySelector('#confirm').hidden).toBe(true);
    r.cleanup();
  });
  it('switches chrome with the viewport and keeps the camera and a placement through a rotation', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    const shown = (id) => getComputedStyle(r.root.querySelector(`#${id}`)).display !== 'none';
    expect([shown('dock'), shown('panel'), shown('rail')]).toEqual([true, false, false]);
    fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');
    fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');
    r.tap(5, 9);
    r.cam.x = 7;
    r.resize(844, 390);                                                       // phone held sideways
    expect(document.body.dataset.layout).toBe('compact');
    expect([shown('dock'), shown('panel'), shown('rail')]).toEqual([false, false, true]);
    expect(r.store.get().mode).toBe('placing');
    expect(r.store.get().ghost).toEqual({ x: 5, y: 9 });
    expect(r.cam.x).toBe(7);
    expect(r.root.querySelector('#rail .bottom').hidden).toBe(false);          // x and tick on the rail
    r.resize(1280, 800);                                                      // laptop
    expect(document.body.dataset.layout).toBe('wide');
    expect([shown('dock'), shown('panel'), shown('rail')]).toEqual([false, true, false]);
    expect(r.root.querySelectorAll('#topbar .speed button').length).toBe(4);
    expect(r.root.querySelectorAll('#panel .cards .card').length).toBe(3);    // the services grid
    expect(r.root.querySelector('#panel .minimap canvas')).toBeTruthy();
    r.cleanup();
  });
  it('keeps one mode at a time, and Back, Esc and right-click close one thing each', async () => {
    const r = await rigUI();
    const h = r.history;
    r.tap(15, 11, 'mouse');                                                   // the well
    let s = r.store.get();
    expect(s.mode).toBe('selected');
    expect(s.sheet).toEqual({ kind: 'info', id: buildingAt(r.world, 15, 11).id });
    expect(r.root.querySelector('#sheet h2').textContent).toBe('Well');
    key(r.root, 'm');
    s = r.store.get();
    expect(s.sheet.kind).toBe('minimap');
    expect(s.mode).toBe('selected');
    expect(h.length).toBe(3);                                                 // one entry per open step
    h.back();                                                                 // the phone's Back gesture
    s = r.store.get();
    expect(s.sheet.kind).toBe('info');                                        // the info sheet is restored under the closed panel
    expect(s.mode).toBe('selected');
    expect(h.length).toBe(3);                                                 // restoring it pushes nothing: an info sheet is not a step
    h.back();                                                                 // the next Back leaves the selection
    s = r.store.get();
    expect(s.mode).toBe('browse');
    expect(s.sheet).toBe(null);
    r.tap(15, 11, 'mouse');                                                   // select the well again so a tool can start from a selection
    expect(r.store.get().mode).toBe('selected');
    key(r.root, '1');                                                         // Roads
    expect(r.store.get().dock).toBe('tray');
    fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');          // Road
    s = r.store.get();
    expect(s.mode).toBe('drawing');
    expect(s.selectedId).toBe(null);
    expect(s.sheet).toBe(null);
    r.tap(20, 12, 'mouse'); r.tap(20, 14, 'mouse');
    expect(r.store.get().line.x1).toBe(20);
    key(r.root, 'Enter');
    expect(r.world.road[14 * r.world.size + 20]).toBe(1);
    expect(r.store.get().mode).toBe('drawing');
    const right = { ...r.at(60, 60), pointerId: 11, pointerType: 'mouse', button: 2, buttons: 2 };
    fire(r.canvas, 'pointerdown', right);                                     // right-click: back one step
    fire(r.canvas, 'pointerup', { ...right, buttons: 0 });
    expect(r.store.get().mode).toBe('browse');
    key(r.root, 'Escape');                                                    // nothing open: nothing changes
    expect(r.store.get().mode).toBe('browse');
    key(r.root, '?');
    expect(r.store.get().sheet.kind).toBe('help');
    key(r.root, 'Escape');
    expect(r.store.get().sheet).toBe(null);
    r.cleanup();
  });
  it('refreshes alerts, the banner, the badge and the canvas summary when the day changes', async () => {
    const r = await rigUI();
    r.frame(0);
    expect(r.root.querySelector('#map-summary').textContent).toContain('Gold 1000');
    r.world.gold = -50;   // the road goal (25) and the first family (10) pay on the same day, so -30 would be out of debt by the tick
    r.frame(16);
    expect(document.body.classList.contains('has-banner')).toBe(false);     // not until a day passes
    tickDay(r.world);
    r.frame(32);
    expect(document.body.classList.contains('has-banner')).toBe(true);
    expect(r.root.querySelector('#banner .critical').textContent).toContain('debt');
    expect(r.root.querySelector('#map-summary').textContent).toContain('alert');
    expect(r.root.querySelector('#live').textContent).toContain('alert');
    fire(r.root.querySelector('#banner .view'), 'click');                     // View: the summary sheet for city-wide alerts
    expect(r.store.get().sheet.kind).toBe('summary');
    // An open sheet keeps up with the game: the next day's frame rebuilds it (nothing inside has focus).
    const granary = Object.values(r.world.buildings).find((b) => b.type === 'granary');
    const before = r.root.querySelector('#sheet').textContent;
    granary.store.grain = 4242;
    tickDay(r.world);
    r.frame(48);
    const after = r.root.querySelector('#sheet').textContent;
    expect(after === before).toBe(false);
    expect(after).toContain('4242');
    r.cleanup();
  });
  it('pans a selection into view, tucks the dock on a pan, places on a mouse click, and detaches on destroy', async () => {
    const r = await rigUI();
    const temple = buildingAt(r.world, 24, 11);
    expect(r.screenOf(24.5, 11.5).x).toBeGreaterThan(390);                    // off the right edge of a phone view
    r.ui.settings.set({ reducedMotion: 'off' });                              // the test browser may ask for reduced motion
    expect(r.ui.cameraControl.animating).toBe(false);
    r.store.set(select(r.store.get(), temple.id));
    expect(r.ui.cameraControl.animating).toBe(true);                          // a tween to bring it into view began
    r.store.set({ mode: 'browse', selectedId: null, sheet: null });
    expect(r.store.get().dock).toBe('slim');
    r.ui.actions.panStarted();
    expect(r.store.get().dock).toBe('tucked');
    expect(document.body.dataset.dock).toBe('tucked');
    fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');  // Services (a tucked dock reopens as a tray)
    fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');           // Well
    expect(r.store.get().mode).toBe('placing');
    r.ui.cameraControl.cancel(); r.cam.x = 12; r.cam.y = 10;                  // no frame ran the tween; put the view back
    r.tap(5, 9, 'mouse');                                                     // a mouse click places at once
    expect(buildingAt(r.world, 5, 9).type).toBe('well');
    expect(r.store.get().mode).toBe('placing');
    r.store.set({ mode: 'browse', tool: null, ghost: null });
    r.ui.destroy();
    key(r.root, ' ');
    expect(r.world.speed).toBe(0);                                            // the key is no longer listened to
    const before = r.store.get();
    fire(r.canvas, 'pointerdown', { ...r.at(100, 300), pointerType: 'mouse', button: 0, buttons: 1 });
    fire(r.canvas, 'pointerup', { ...r.at(100, 300), pointerType: 'mouse', button: 0, buttons: 0 });
    expect(r.store.get()).toBe(before);
    r.cleanup();                                                              // destroy again: idempotent
  });
});
