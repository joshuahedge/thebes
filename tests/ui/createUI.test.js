import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire, key } from '../helpers/dom.js';
import { buildingAt } from '../../src/sim/world.js';
import { tickDay } from '../../src/sim/clock.js';
import { settle } from '../../src/sim/settle.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { createSettings } from '../../src/ui/settings.js';
import { createStore } from '../../src/ui/store.js';

describe('ui createUI', () => {
  it('places a well from the dock: card, ghost, tap, tick, building, then Undo from the toast', async () => {
    const r = await rigUI();
    settle(r.world);                                                          // the rig's city already meets four goals: pay them now
    const start = r.world.gold;
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
    expect(r.store.get().mode).toBe('placing');                               // a click (no touch press) keeps placing repeatedly until the x
    const toast = r.root.querySelector('#toasts .toast');
    expect(toast.textContent).toContain('Well placed');
    fire(toast.querySelector('button'), 'click');                             // Undo
    expect(buildingAt(r.world, 5, 9)).toBe(null);
    expect(r.world.gold).toBe(start);
    fire(r.root.querySelector('#confirm .cancel'), 'click');
    expect(r.store.get().mode).toBe('browse');
    expect(r.root.querySelector('#confirm').hidden).toBe(true);
    r.cleanup();
  });
  describe('the tick on a touch or pen press (placement review P6)', () => {
    async function onTheTick(pointerType, build = { category: 'services', index: 0 }) {
      const r = await rigUI();
      fire(r.root.querySelector(`#dock .cat[data-category="${build.category}"]`), 'click');
      fire(r.root.querySelectorAll('#dock .tray .card')[build.index], 'click');
      r.frame(0);
      r.tap(5, 9);
      const ok = r.root.querySelector('#confirm .ok');
      if (pointerType) fire(ok, 'pointerdown', { pointerType });
      fire(ok, 'click');
      return r;
    }
    it('ends the tool after a touch tick: the well stands, the map is in Browse, the tray is back and the overlay stays on', async () => {
      const r = await onTheTick('touch');
      expect(buildingAt(r.world, 5, 9).type).toBe('well');
      const s = r.store.get();
      expect([s.mode, s.tool, s.ghost, s.overlay, s.dock, s.category]).toEqual(['browse', null, null, 'water', 'tray', 'services']);
      expect(r.root.querySelector('#confirm').hidden).toBe(true);
      expect(r.root.querySelector('#dock .tray .card .name').textContent).toBe('Well');   // the same card is one tap away
      expect(r.root.querySelector('#toasts .toast').textContent).toContain('Well placed');
      r.cleanup();
    });
    it('does the same for a pen, and the Undo toast still undoes it', async () => {
      const r = await onTheTick('pen');
      expect(r.store.get().mode).toBe('browse');
      fire(r.root.querySelector('#toasts .toast button'), 'click');
      expect(buildingAt(r.world, 5, 9)).toBe(null);
      r.cleanup();
    });
    it('keeps placing for a mouse or keyboard tick, and for the Enter key', async () => {
      const mouse = await onTheTick('mouse');
      expect(mouse.store.get().mode).toBe('placing');
      mouse.cleanup();
      const plain = await onTheTick(null);                                       // a click with no press before it is the keyboard's
      expect(plain.store.get().mode).toBe('placing');
      plain.cleanup();
      const r = await onTheTick('mouse');
      r.store.set({ inputType: 'touch' });                                       // the last map press being a touch does not matter: Enter is the keyboard's
      r.ui.placement.moveGhost(7, 9);
      key(r.root, 'Enter');
      expect(buildingAt(r.world, 7, 9) && buildingAt(r.world, 7, 9).type).toBe('well');
      expect(r.store.get().mode).toBe('placing');
      r.cleanup();
    });
    it('stays in the tool when the tick is refused', async () => {
      const r = await rigUI();
      fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');
      fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');
      r.ui.placement.moveGhost(12, 9);                                           // a hut stands here
      const ok = r.root.querySelector('#confirm .ok');
      fire(ok, 'pointerdown', { pointerType: 'touch' }); fire(ok, 'click');
      expect(r.store.get().mode).toBe('placing');
      r.cleanup();
    });
    it('pans the least that keeps the new building above the tray when it stood where the tray comes back', async () => {
      const r = await rigUI();
      fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');
      fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');
      r.frame(0);
      while (r.screenOf(5.5, 9.5).y < 650) { r.cam.x -= 1; r.cam.y -= 1; }       // tile (5, 9) now sits low on the map, where the tray will cover it
      r.tap(5, 9);
      expect(r.store.get().ghost).toEqual({ x: 5, y: 9 });
      expect(r.screenOf(5.5, 9.5).y > 600).toBe(true);
      const ok = r.root.querySelector('#confirm .ok');
      fire(ok, 'pointerdown', { pointerType: 'touch' }); fire(ok, 'click');
      r.ui.cameraControl.tick(1e6);                                              // let the pan finish
      const tray = r.root.querySelector('#dock').getBoundingClientRect().top;
      expect(r.screenOf(5.5, 9.5).y < tray).toBe(true);
      r.cleanup();
    });
    it('puts the toast just above the bar while a tool is on', async () => {
      const r = await rigUI();
      fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');
      fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');
      r.frame(0);
      r.tap(5, 9);
      const ok = r.root.querySelector('#confirm .ok');
      fire(ok, 'pointerdown', { pointerType: 'mouse' }); fire(ok, 'click');       // the mouse keeps the tool on, the bar stays up
      expect(r.store.get().dock).toBe('tray');                                    // the tray is hidden behind the bar: the toast must not float at the tray's height
      const toast = r.root.querySelector('#toasts .toast').getBoundingClientRect(), bar = r.root.querySelector('#confirm').getBoundingClientRect();
      expect(toast.bottom <= bar.top && bar.top - toast.bottom < 100).toBe(true);   // just above the corner row on the bar
      r.cleanup();
    });
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
    expect(r.root.querySelector('#rail .bottom')).toBe(null);                  // the rail repeats no x and tick: the confirm bar beside it has them (ruling 173)
    expect(r.root.querySelector('#confirm .cancel') !== null && r.root.querySelector('#confirm .ok') !== null).toBe(true);
    r.resize(1280, 800);                                                      // laptop
    expect(document.body.dataset.layout).toBe('wide');
    expect([shown('dock'), shown('panel'), shown('rail')]).toEqual([false, true, false]);
    expect(r.root.querySelectorAll('#topbar .speed button').length).toBe(4);
    expect(r.root.querySelectorAll('#panel .cards .card').length).toBe(5);    // the services grid, the booth locked until Town
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
  it('leaves no store or settings subscription behind when destroyed: the help watch and the guide go with it', async () => {
    const real = createSettings({ storage: { getItem: () => null, setItem: () => {} }, root: document.body });
    let live = 0;                                                             // subscriptions the interface holds on the shared settings
    const settings = { ...real, subscribe(fn) { live++; const off = real.subscribe(fn); let on = true; return () => { if (on) { on = false; live--; } off(); }; } };
    const r = await rigUI({ settings });
    try {
      expect(live).toBe(1);                                                   // the settings watch (help, text size)
      expect(r.store.subscribers()).toBeGreaterThan(5);                       // the components and the guide
      expect(r.world.guide.on).toBe(true);
      r.store.set(openSheet(r.store.get(), 'summary'));
      r.ui.destroy();
      expect(live).toBe(0);
      expect(r.store.subscribers()).toBe(0);
      settings.set({ help: 'off' });                                          // the next city's settings change: this world is left alone
      expect(r.world.guide.on).toBe(true);
      const dock = document.body.dataset.dock;
      r.store.set({ dock: dock === 'tray' ? 'slim' : 'tray', category: 'food', sheet: null });   // a stray late set reaches nothing
      expect(document.body.dataset.dock).toBe(dock);
      expect(document.body.classList.contains('guide-on')).toBe(false);
      expect(document.querySelectorAll('.suggested, .dimmed').length).toBe(0);
      expect(r.root.querySelector('#sheet').hidden).toBe(true);
      expect(typeof createStore({}).dispose).toBe('function');
    } finally { r.cleanup(); }
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
