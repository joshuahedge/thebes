// Version 8.1, Track D (rulings 1241-1245): drag to build. Press a card and drag it onto the map: the ghost follows the finger, and on release it builds at once when it fits and is paid for (with the
// usual Undo); otherwise the ghost stays with its reason. Roads and plots are dragged on from the card and drawn by the same drag. Tap-to-select still works. A tray's own sideways scroll is not a drag.
import { describe, it, expect } from '../../harness.js';
import { dragIntent, createCardDrag, createDragHost, CARD_DRAG_PX, CARD_DRAG_MOUSE_PX } from '../../../src/ui/v81/cardDrag.js';
import { GHOST_FINGER_OFFSET_PX } from '../../../src/data/ui.js';
import { ECONOMY } from '../../../src/data/economy.js';
import { buildingAt, housesOf } from '../../../src/sim/world.js';
import { idx } from '../../../src/sim/grid.js';
import { uiWorld, rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

const ID = 7;
// A drag in the rig: the press on a card, moves in map pixels, the lift. Points are { x, y } in canvas pixels (the rig's `at` makes client coordinates).
function dragger(r, type = 'touch') {
  const base = { pointerId: ID, pointerType: type, button: 0, isPrimary: true };
  const target = () => document;
  const cardCentre = (card) => { const b = card.getBoundingClientRect(); return { clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 }; };
  // A tile's centre as a finger would be over it: a touch drag carries the ghost GHOST_FINGER_OFFSET_PX above the finger.
  // (A drawing tool's stroke follows the finger itself, with no offset.)
  const finger = (tx, ty, draw = false) => { const p = r.screenOf(tx + 0.5, ty + 0.5); return r.at(p.x, type === 'mouse' || draw ? p.y : p.y + GHOST_FINGER_OFFSET_PX); };
  const lastEvent = {};
  return {
    finger,
    press(card) { const c = cardCentre(card); lastEvent.at = c; fire(card, 'pointerdown', { ...base, ...c, buttons: 1 }); },
    to(point) { lastEvent.at = point; fire(document.querySelector('.card-drag-surface') || target(), 'pointermove', { ...base, ...point, buttons: 1 }); },
    lift() { fire(document.querySelector('.card-drag-surface') || target(), 'pointerup', { ...base, ...lastEvent.at, buttons: 0 }); },
    cancel() { fire(document.querySelector('.card-drag-surface') || target(), 'pointercancel', { ...base, ...lastEvent.at, buttons: 0 }); },
    // A finger starts a few pixels at a time: the first move decides whether it is a drag (up from the phone's row, across the wide panel), so lead with 14 px that way, then go to the tile.
    tile(tx, ty, { lead = 'up', draw = false } = {}) {
      if (!document.querySelector('.card-drag-surface') && type !== 'mouse') {
        const a = lastEvent.at;
        fire(document, 'pointermove', { ...base, clientX: a.clientX + (lead === 'left' ? -14 : 0), clientY: a.clientY + (lead === 'up' ? -14 : 0), buttons: 1 });
      }
      this.to(finger(tx, ty, draw));
    },
  };
}
const card = (r, item) => r.root.querySelector(`#dock .tray .card[data-item="${item}"]`);
const open = (r, category) => fire(r.root.querySelector(`#dock .cat[data-category="${category}"]`), 'click');
const surfaces = () => document.querySelectorAll('.card-drag-surface').length;
const wellAt = (r, x, y) => { const b = buildingAt(r.world, x, y); return b ? b.type : null; };

describe('v81 d drag: telling a drag from a tap and from the tray\'s scroll', () => {
  it('waits for 10 px of a finger (6 of a mouse), carries up from the phone\'s row, carries across the wide panel, and lets the tray\'s own scroll go', () => {
    const t = (dx, dy, axis, kind = 'touch') => dragIntent({ dx, dy, kind, axis });
    expect([CARD_DRAG_PX, CARD_DRAG_MOUSE_PX]).toEqual([10, 6]);
    expect([t(0, -5, 'x'), t(3, -9, 'x'), t(0, -10, 'x')]).toEqual(['wait', 'wait', 'start']);
    expect([t(2, -14, 'x'), t(12, -12, 'x')]).toEqual(['start', 'start']);                 // up, or up and across at 45 degrees
    expect([t(20, -3, 'x'), t(-20, 0, 'x'), t(0, 20, 'x')]).toEqual(['scroll', 'scroll', 'scroll']);   // along the row, or down (off the screen): not a drag
    expect([t(14, 2, 'y'), t(-14, 3, 'y'), t(1, 20, 'y')]).toEqual(['start', 'start', 'scroll']);    // across a vertical tray carries; along it scrolls
    expect([t(4, 3, 'x', 'mouse'), t(6, 3, 'y', 'mouse'), t(0, 7, 'x', 'mouse'), t(0, 20, 'y', 'mouse')]).toEqual(['wait', 'start', 'start', 'start']);   // a mouse has no scroll to tell apart
    expect(t(0, 0, 'x', 'pen')).toBe('wait');
  });
});

describe('v81 d drag: a building', () => {
  it('builds at once on release when it fits: the ghost followed the finger, the toast has Undo, and the touch tool is done', async () => {
    const r = await rigUI();
    try {
      open(r, 'services');
      const gold = r.world.gold;
      const d = dragger(r);
      d.press(card(r, 'well'));
      expect([surfaces(), r.store.get().tool]).toEqual([0, null]);                          // a press alone is not a drag
      d.tile(18, 12);
      expect([surfaces(), document.body.classList.contains('card-dragging'), r.store.get().tool.type, r.store.get().mode]).toEqual([1, true, 'well', 'placing']);
      expect(r.store.get().ghost).toEqual({ x: 18, y: 12 });                                // the ghost is under the finger, a ghost's height above it
      d.tile(19, 12);
      expect(r.store.get().ghost).toEqual({ x: 19, y: 12 });                                // and follows it
      expect(r.world.gold).toBe(gold);                                                      // nothing built while it moves
      d.lift();
      expect(wellAt(r, 19, 12)).toBe('well');
      expect([surfaces(), document.body.classList.contains('card-dragging'), r.store.get().tool, r.store.get().mode]).toEqual([0, false, null, 'browse']);
      expect(r.ui.placement.canUndo()).toBe(true);
      expect(r.root.querySelector('#toasts').textContent).toContain('Undo');                // the usual short Undo (8.0's last-action rule)
      r.ui.placement.undo();
      expect(wellAt(r, 19, 12)).toBe(null);
    } finally { r.cleanup(); }
  });

  it('leaves the ghost where it is, with its reason, when it does not fit: nothing is built and the tool stays open', async () => {
    const r = await rigUI();
    try {
      open(r, 'services');
      const gold = r.world.gold;
      const d = dragger(r);
      d.press(card(r, 'well'));
      d.tile(12, 9);                                                                        // on a home
      d.lift();
      const s = r.store.get();
      expect([s.tool && s.tool.type, s.mode, s.ghost]).toEqual(['well', 'placing', { x: 12, y: 9 }]);
      expect([r.world.gold, r.ui.placement.preview().state, Boolean(r.ui.placement.preview().reason)]).toEqual([gold, 'bad', true]);
      expect(r.root.querySelector('#confirm').textContent.length).toBeGreaterThan(0);       // the bar says why
      expect(surfaces()).toBe(0);
      d.press(card(r, 'well'));                                                             // a second drag from the same card moves the same tool
      d.tile(20, 12);
      d.lift();
      expect(wellAt(r, 20, 12)).toBe('well');
    } finally { r.cleanup(); }
  });

  it('does not build what cannot be paid for: the ghost stays with its reason', async () => {
    const r = await rigUI();
    try {
      open(r, 'services');
      r.world.gold = ECONOMY.debtFloor;                                                     // the treasury at the debt floor: a well's price would cross it
      r.ui.refresh();
      const d = dragger(r);
      d.press(card(r, 'well'));
      d.tile(18, 12);
      d.lift();
      expect([wellAt(r, 18, 12), r.store.get().tool && r.store.get().tool.type, r.ui.placement.preview().state, r.ui.placement.preview().reason]).toEqual([null, 'well', 'bad', 'no_gold']);
      expect(r.world.gold).toBe(ECONOMY.debtFloor);
    } finally { r.cleanup(); }
  });

  it('puts the tool away when the finger goes back to the tray or a bar and lifts there, and builds nothing', async () => {
    const r = await rigUI();
    try {
      open(r, 'services');
      const gold = r.world.gold;
      const d = dragger(r);
      const tray = r.root.querySelector('#dock').getBoundingClientRect();
      d.press(card(r, 'well'));
      d.tile(18, 12);
      expect(r.store.get().tool.type).toBe('well');
      d.to({ clientX: tray.left + tray.width / 2, clientY: tray.top + 40 });                  // back where the card came from (the tray gives way to the bar, but its place is where "put it back" lies)
      d.lift();
      expect([r.store.get().tool, r.world.gold, surfaces()]).toEqual([null, gold, 0]);
      open(r, 'services');
      d.press(card(r, 'well'));
      d.tile(18, 12);
      const bar = r.root.querySelector('#topbar').getBoundingClientRect();
      d.to({ clientX: bar.left + 40, clientY: bar.top + bar.height / 2 });
      d.lift();
      expect([r.store.get().tool, wellAt(r, 18, 12)]).toEqual([null, null]);
    } finally { r.cleanup(); }
  });

  it('is taken back by Esc, a pointercancel and a second finger; none builds', async () => {
    const r = await rigUI();
    try {
      const d = dragger(r);
      for (const how of ['esc', 'cancel', 'second']) {
        open(r, 'services');
        d.press(card(r, 'well'));
        d.tile(18, 12);
        expect([how, r.store.get().tool && r.store.get().tool.type]).toEqual([how, 'well']);
        if (how === 'esc') {
          const esc = fire(r.root, 'keydown', { key: 'Escape' });
          expect([esc.defaultPrevented, r.store.get().dock]).toEqual([true, 'tray']);       // Esc is spent on the card in hand: it does not go on to close the tray as well
        }
        else if (how === 'cancel') d.cancel();
        else fire(r.root.querySelector('#map'), 'pointerdown', { pointerId: 99, pointerType: 'touch', isPrimary: false, button: 0, ...d.finger(10, 10) });
        expect([how, r.store.get().tool, surfaces(), document.body.classList.contains('card-dragging'), wellAt(r, 18, 12)]).toEqual([how, null, 0, false, null]);
        d.lift();
        expect([how, wellAt(r, 18, 12)]).toEqual([how, null]);
      }
    } finally { r.cleanup(); }
  });

  it('does not start when the finger goes along the tray (its scroll), and a tap on the card still picks it', async () => {
    const r = await rigUI();
    try {
      open(r, 'services');
      const d = dragger(r);
      const c = card(r, 'well');
      d.press(c);
      const b = c.getBoundingClientRect();
      fire(document, 'pointermove', { pointerId: ID, pointerType: 'touch', button: 0, buttons: 1, clientX: b.left + b.width / 2 - 40, clientY: b.top + b.height / 2 - 3 });
      d.lift();
      expect([surfaces(), r.store.get().tool, r.store.get().mode]).toEqual([0, null, 'browse']);
      fire(c, 'pointerdown', { pointerId: ID, pointerType: 'touch', button: 0, isPrimary: true, buttons: 1 });   // a tap: down, up, click
      fire(c, 'pointerup', { pointerId: ID, pointerType: 'touch', button: 0, isPrimary: true, buttons: 0 });
      fire(c, 'click');
      expect([r.store.get().tool && r.store.get().tool.type, r.store.get().mode]).toEqual(['well', 'placing']);
    } finally { r.cleanup(); }
  });

  it('swallows the click a drag\'s release makes on a card, and not a later one', async () => {
    const r = await rigUI();
    try {
      open(r, 'services');
      const d = dragger(r);
      d.press(card(r, 'well'));
      d.tile(18, 12);
      d.lift();
      expect(r.store.get().tool).toBe(null);                                                // built and done
      fire(card(r, 'well'), 'click');                                                       // the click the release would make: not a pick
      expect(r.store.get().tool).toBe(null);
      await new Promise((resolve) => setTimeout(resolve, 20));
      fire(r.root.querySelector('#dock .tray .card[data-item="well"]'), 'click');          // a real tap later picks
      expect(r.store.get().tool && r.store.get().tool.type).toBe('well');
    } finally { r.cleanup(); }
  });

  it('does not drag a card the lesson has locked, and does not drag Demolish, which takes things down and waits for a tap and a tick', async () => {
    const r = await rigUI();
    try {
      open(r, 'services');
      const c = card(r, 'well');
      c.setAttribute('data-locked', '');
      const d = dragger(r);
      d.press(c);
      d.tile(18, 12);
      d.lift();
      expect([surfaces(), r.store.get().tool]).toEqual([0, null]);
      c.removeAttribute('data-locked');
      open(r, 'roads');
      const demolish = card(r, 'demolish');
      d.press(demolish);
      d.tile(18, 12);
      expect([surfaces(), r.store.get().tool]).toEqual([0, null]);
      d.lift();
      fire(demolish, 'click');
      expect(r.store.get().tool && r.store.get().tool.kind).toBe('demolish');              // a tap picks it as before
    } finally { r.cleanup(); }
  });

  it('works the same with a mouse: it builds on release, and the tool stays for the next one as a click does', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.store.set({ category: 'services' });
      const d = dragger(r, 'mouse');
      const well = r.root.querySelector('#panel .cards .card[data-item="well"]');
      d.press(well);
      d.tile(18, 12);                                                                       // a mouse has no offset: the ghost is under the pointer
      expect(r.store.get().ghost).toEqual({ x: 18, y: 12 });
      d.lift();
      expect([wellAt(r, 18, 12), r.store.get().tool && r.store.get().tool.type]).toEqual(['well', 'well']);
      expect(surfaces()).toBe(0);
    } finally { r.cleanup(); }
  });
});

describe('v81 d drag: the wide panel and the rail', () => {
  it('carries a card sideways from the wide panel\'s grid onto the map, and leaves a finger moving along the grid to scroll it', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.store.set({ category: 'services' });
      const d = dragger(r);
      const grid = () => r.root.querySelector('#panel .cards .card[data-item="well"]');
      d.press(grid());
      const b = grid().getBoundingClientRect();
      fire(document, 'pointermove', { pointerId: ID, pointerType: 'touch', button: 0, buttons: 1, clientX: b.left + b.width / 2 + 1, clientY: b.top + b.height / 2 + 30 });   // down the grid: its scroll
      d.lift();
      expect([surfaces(), r.store.get().tool]).toEqual([0, null]);
      d.press(grid());
      d.tile(18, 12, { lead: 'left' });
      expect(r.store.get().ghost).toEqual({ x: 18, y: 12 });
      d.lift();
      expect([wellAt(r, 18, 12), r.store.get().tool]).toEqual(['well', null]);
    } finally { r.cleanup(); }
  });

  it('carries a card from the compact rail\'s drawer too', async () => {
    const r = await rigUI({ width: 844, height: 390 });
    try {
      fire(r.root.querySelector('#rail .cat[data-category="services"]'), 'click');
      const d = dragger(r);
      d.press(r.root.querySelector('#rail .drawer .card[data-item="well"]'));
      d.tile(18, 12, { lead: 'left' });
      d.lift();
      expect(wellAt(r, 18, 12)).toBe('well');
    } finally { r.cleanup(); }
  });
});

describe('v81 d drag: roads and plots', () => {
  it('draws a road from the card: the stroke starts where the finger meets the map, and the release lays it', async () => {
    const r = await rigUI();
    try {
      open(r, 'roads');
      const d = dragger(r);
      d.press(card(r, 'road'));
      d.tile(17, 13, { draw: true });
      expect([r.store.get().tool.kind, r.store.get().plan.tiles.length]).toEqual(['road', 1]);
      d.tile(17, 12, { draw: true });
      d.tile(20, 12, { draw: true });
      expect(r.store.get().plan.tiles.length).toBeGreaterThan(3);
      const gold = r.world.gold;
      d.lift();
      const laid = [[17, 13], [17, 12], [18, 12], [19, 12], [20, 12]].map(([x, y]) => r.world.road[idx(r.world.size, x, y)]);
      expect([laid, r.store.get().tool, r.ui.placement.canUndo()]).toEqual([[1, 1, 1, 1, 1], null, true]);
    } finally { r.cleanup(); }
  });

  it('draws plots from the card: a rectangle is laid on release, and a one-tile drag is one plot, as a drag on the map is', async () => {
    const r = await rigUI();
    try {
      open(r, 'homes');
      const d = dragger(r);
      const homes = housesOf(r.world).length;
      d.press(card(r, 'house'));
      d.tile(17, 11, { draw: true });
      d.tile(19, 12, { draw: true });
      expect(r.store.get().plan.tiles.length).toBe(6);
      d.lift();
      expect(housesOf(r.world).length).toBe(homes + 6);
      expect(r.store.get().tool.kind).toBe('houses');                                       // the house tool is the one a touch tick does not end (ruling 465): the bar has Done
      r.ui.placement.cancel();
      d.press(card(r, 'house'));
      d.tile(22, 12, { draw: true });
      d.lift();
      expect(housesOf(r.world).length).toBe(homes + 7);                                     // one tile, one plot, at once
    } finally { r.cleanup(); }
  });

  it('keeps a one-tile road stroke drawn for the tick instead of laying it, and puts the tool away when the finger never reached the map', async () => {
    const r = await rigUI();
    try {
      open(r, 'roads');
      const d = dragger(r);
      d.press(card(r, 'road'));
      d.tile(17, 13, { draw: true });
      d.lift();
      expect([r.world.road[idx(r.world.size, 17, 13)], r.store.get().tool && r.store.get().tool.kind, r.store.get().plan && r.store.get().plan.tiles.length]).toEqual([0, 'road', 1]);
      r.ui.placement.cancel();
      const c = card(r, 'road').getBoundingClientRect();
      d.press(card(r, 'road'));
      d.to({ clientX: c.left + c.width / 2, clientY: c.top + c.height / 2 - 14 });         // up, but still over the bar the tray gives way to
      d.lift();
      expect([r.store.get().tool, surfaces()]).toEqual([null, 0]);
    } finally { r.cleanup(); }
  });

  it('draws a road with a mouse by dragging from the card and builds it on release', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.store.set({ category: 'roads' });
      const d = dragger(r, 'mouse');
      d.press(r.root.querySelector('#panel .cards .card[data-item="road"]'));
      d.tile(17, 13);
      d.tile(21, 13);
      d.lift();
      expect([17, 19, 21].map((x) => r.world.road[idx(r.world.size, x, 13)])).toEqual([1, 1, 1]);
    } finally { r.cleanup(); }
  });
});

describe('v81 d drag: the parts', () => {
  it('createDragHost: a building follows the finger with the touch offset, builds only when the sim says it fits, and cancels when released off the map', () => {
    const calls = [];
    const state = { tool: null, ghost: null, plan: null, line: null, area: null };
    const store = { get: () => state };
    let state2 = 'ok';
    const placement = {
      start(tool) { state.tool = tool; calls.push(['start', tool.kind]); },
      moveGhost(x, y) { state.ghost = { x, y }; calls.push(['ghost', x, y]); },
      preview: () => ({ state: state2 }),
      cancel() { state.tool = null; calls.push(['cancel']); },
    };
    const host = createDragHost({ store, placement, actions: {}, tileUnder: (x, y) => ({ x: Math.floor(x / 10), y: Math.floor(y / 10) }), confirm: (t) => calls.push(['confirm', t]), toolForItem: (i) => (i === 'demolish' ? { kind: 'demolish' } : { kind: 'building', type: i }) });
    expect(host.begin('demolish', { type: 'touch' })).toBe(false);
    expect(host.begin('well', { type: 'touch' })).toBe(true);
    host.move({ x: 50, y: 100 }, { overMap: true, type: 'touch' });
    expect(state.ghost).toEqual({ x: 5, y: Math.floor((100 - GHOST_FINGER_OFFSET_PX) / 10) });
    host.move({ x: 90, y: 100 }, { overMap: false, type: 'touch' });                         // over a bar: the ghost stays
    expect(state.ghost.x).toBe(5);
    host.end({ x: 50, y: 100 }, { overMap: true, type: 'touch' });
    expect(calls.filter((c) => c[0] === 'confirm')).toEqual([['confirm', 'touch']]);
    state2 = 'bad';
    host.end({ x: 50, y: 100 }, { overMap: true, type: 'touch' });
    expect(calls.filter((c) => c[0] === 'confirm').length).toBe(1);                         // does not fit: nothing more
    host.end({ x: 50, y: 100 }, { overMap: false, type: 'touch' });
    expect(calls[calls.length - 1]).toEqual(['cancel']);
    expect(createDragHost({ store, placement, actions: {}, tileUnder: () => ({ x: 0, y: 0 }), confirm() {}, toolForItem: () => ({ kind: 'building', type: 'palace' }), standing: () => true }).begin('palace', { type: 'touch' })).toBe(false);
  });

  it('createCardDrag: ignores a press that is not a primary button on a card, and detaches cleanly', async () => {
    const r = await rigUI();
    try {
      open(r, 'services');
      const seen = [];
      const root = r.root.querySelector('#ui');
      const drag = createCardDrag({ root, doc: document, canvas: r.root.querySelector('#map'), store: r.store, host: { begin: (i) => { seen.push(i); return false; }, move() {}, end() {}, cancel() {} } });
      const c = card(r, 'bazaar');
      const b = c.getBoundingClientRect();
      fire(c, 'pointerdown', { pointerId: 3, pointerType: 'mouse', button: 2, isPrimary: true, clientX: b.left + 5, clientY: b.top + 5 });
      fire(document, 'pointermove', { pointerId: 3, pointerType: 'mouse', clientX: b.left + 50, clientY: b.top + 50 });
      expect(seen).toEqual([]);                                                              // a right button is no drag
      fire(c, 'pointerdown', { pointerId: 4, pointerType: 'mouse', button: 0, isPrimary: true, clientX: b.left + 5, clientY: b.top + 5 });
      fire(document, 'pointermove', { pointerId: 4, pointerType: 'mouse', clientX: b.left + 30, clientY: b.top + 30 });
      expect(seen).toEqual(['bazaar']);                                                      // the host was asked, said no: nothing begins
      expect(drag.dragging).toBe(false);
      drag.detach();
      fire(c, 'pointerdown', { pointerId: 5, pointerType: 'mouse', button: 0, isPrimary: true, clientX: b.left + 5, clientY: b.top + 5 });
      fire(document, 'pointermove', { pointerId: 5, pointerType: 'mouse', clientX: b.left + 30, clientY: b.top + 30 });
      expect(seen).toEqual(['bazaar']);
    } finally { r.cleanup(); }
  });

  it('leaves no listener, layer or class behind when the interface is destroyed mid-drag', async () => {
    const r = await rigUI();
    open(r, 'services');
    const d = dragger(r);
    d.press(card(r, 'well'));
    d.tile(18, 12);
    expect(surfaces()).toBe(1);
    r.cleanup();
    expect([surfaces(), document.body.classList.contains('card-dragging')]).toEqual([0, false]);
  });
});
