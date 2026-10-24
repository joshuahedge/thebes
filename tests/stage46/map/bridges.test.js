// Stage 4.6, Map track: bridge clarity (ruling 350). The road card and the road tool's bar say a road crosses water on a bridge at the sim's
// price, the guidance row's tip fires when a drawn road meets water, How to play says it, and Show me points at the nearest straight crossing.
import { describe, it, expect } from '../../harness.js';
import { bridgeSpot, BRIDGE_MAX } from '../../../src/sim/bridges.js';
import { costOf } from '../../../src/sim/costs.js';
import { MAP } from '../../../src/data/map.js';
import { TIPS } from '../../../src/data/tips.js';
import { DIFFICULTIES } from '../../../src/data/difficulty.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createPlacement } from '../../../src/ui/placement.js';
import { createMapUi } from '../../../src/ui/s46/map.js';
import { cardInfo, renderCards } from '../../../src/ui/cards.js';
import { S46_MAP_TEXT, TIP_TEXT, TIP_HELP_TEXT } from '../../../src/ui/text.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { mount, fire } from '../../helpers/dom.js';

// A city with a river down columns x0..x1 (every row), water on desert.
function riverWorld(x0 = 10, x1 = 12) {
  const w = makeTestWorld({ size: 32, fertile: [], gold: 5000 });
  for (let y = 0; y < 32; y++) for (let x = x0; x <= x1; x++) w.terrain[idx(32, x, y)] = T.WATER;
  return w;
}

describe('s46 map bridgeSpot: the nearest straight crossing (ruling 350)', () => {
  it('finds the nearest row (or column) with up to BRIDGE_MAX tiles of water and land at both ends, and says where', () => {
    const w = riverWorld(10, 12);
    const near = (y) => bridgeSpot(w, { x: 2, y });
    for (const y of [1, 8, 20, 29]) {
      const s = near(y);
      expect([s.vertical, s.water, s.from[0], s.to[0], s.x, Math.abs(s.y - y) <= 1]).toEqual([false, 3, 9, 13, 11, true]);
      expect([s.from[1], s.to[1]]).toEqual([s.y, s.y]);
    }
    expect(BRIDGE_MAX).toBe(MAP.bridgeMax);
  });
  it('refuses water wider than BRIDGE_MAX, a crossing with a building on an end, and a bridge already standing', () => {
    expect(bridgeSpot(riverWorld(10, 10 + BRIDGE_MAX), { x: 2, y: 5 })).toBe(null);          // BRIDGE_MAX + 1 tiles wide
    expect(bridgeSpot(riverWorld(10, 9 + BRIDGE_MAX), { x: 2, y: 5 }).water).toBe(BRIDGE_MAX);   // exactly BRIDGE_MAX
    const w = riverWorld(10, 12);
    for (let y = 0; y < 32; y++) addRaw(w, 'house', 13, y);                                  // the east end is taken on every row
    expect(bridgeSpot(w, { x: 2, y: 5 })).toBe(null);
    const v = riverWorld(10, 12);
    for (let y = 0; y < 6; y++) for (let x = 10; x <= 12; x++) v.road[idx(32, x, y)] = 1;     // rows 0-5 already bridged
    const s = bridgeSpot(v, { x: 2, y: 3 });
    expect(s.y).toBe(6);
    expect(s.from).toEqual([9, 6]);
  });
  it('turns to a column when the river runs along the rows, and keeps to the nearer of two rivers', () => {
    const w = makeTestWorld({ size: 32, fertile: [], gold: 5000 });
    for (let x = 0; x < 32; x++) for (let y = 14; y <= 16; y++) w.terrain[idx(32, x, y)] = T.WATER;   // a river across the map
    const s = bridgeSpot(w, { x: 20, y: 3 });
    expect([s.vertical, s.water, s.from[1], s.to[1], s.x >= 19 && s.x <= 21]).toEqual([true, 3, 13, 17, true]);
    for (let y = 0; y < 32; y++) w.terrain[idx(32, 28, y)] = T.WATER;                       // and a one-tile stream down x = 28
    const t = bridgeSpot(w, { x: 29, y: 3 });
    expect([t.vertical, t.water, t.x]).toEqual([false, 1, 28]);
    expect(bridgeSpot(makeTestWorld({ size: 32, fertile: [] }), { x: 5, y: 5 })).toBe(null);   // no water: no crossing
  });
});

describe('s46 map bridges in words: the card, the bar and the tip say it from the sim', () => {
  it('says on the road card that a road crosses water, at the bridge\'s price, and the price follows the difficulty', () => {
    const w = makeTestWorld({ gold: 1000 });
    const prices = new Set();
    for (const d of Object.keys(DIFFICULTIES)) {
      w.difficulty = d;
      const cost = costOf(w, 'bridge');
      prices.add(cost);
      expect(cardInfo(w, 'road').terrainText).toBe(`Bridges over water: ${cost} gold a tile`);
      expect(S46_MAP_TEXT.bridgeCardTitle(cost, MAP.bridgeMax)).toBe(`A road crosses water on a bridge: ${cost} gold a tile, straight across at most ${MAP.bridgeMax} tiles of water, with land at both ends.`);
    }
    expect(prices.size).toBeGreaterThan(1);                                                   // it is the sim's number, not a constant in the words
    const { root, cleanup } = mount('<div id="tray"></div>');
    try {
      w.difficulty = 'normal';
      renderCards(root.querySelector('#tray'), { world: w, category: 'roads', activeItem: null, onPick: () => {} });
      const line = root.querySelector('.card[data-item="road"] .terrain');
      expect([line.textContent, line.title.includes(`${MAP.bridgeMax} tiles of water`)]).toEqual(['Bridges over water: 25 gold a tile', true]);
    } finally { cleanup(); }
  });
  it('says it in the road tool\'s bar until a road is drawn, in the same price, and not for the gate tool', () => {
    const w = makeTestWorld({ gold: 1000 });
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world: w, store });
    pl.start({ kind: 'road' });
    const p = pl.preview();
    expect([p.state, p.note]).toEqual(['idle', S46_MAP_TEXT.bridgeBar(costOf(w, 'bridge'))]);
    expect(p.note).toBe('Water: a bridge, 25 gold a tile');
    w.difficulty = 'hard';
    expect(pl.preview().note).toBe(`Water: a bridge, ${costOf(w, 'bridge')} gold a tile`);
    w.difficulty = 'normal';
    pl.pointAt(3, 3); pl.pointAt(8, 3);
    expect(pl.preview().note).toBe('');                                                      // a road is drawn: the bar speaks of it
    pl.start({ kind: 'road', gate: true });
    expect(pl.preview().note).toBe('');                                                      // the gate card is for walls
  });
  it('words the tip and its How to play line from MAP.bridgeMax, short enough for the guidance row, listed beside every other tip', () => {
    expect(TIPS.find((t) => t.id === 'bridges')).toEqual({ id: 'bridges', trigger: 'roadMeetsWater', priority: false });
    expect(TIP_TEXT.bridges).toBe(S46_MAP_TEXT.bridgeTip(MAP.bridgeMax));
    expect(TIP_HELP_TEXT.bridges).toBe(S46_MAP_TEXT.bridgeHelp(MAP.bridgeMax));
    expect(S46_MAP_TEXT.bridgeTip(3)).toContain('up to 3 tiles of water');
    expect(TIP_TEXT.bridges.split(/\s+/).length).toBeLessThanOrEqual(20);
    expect(TIP_HELP_TEXT.bridges.split(/\s+/).length).toBeLessThanOrEqual(20);
  });
});

describe('s46 map seam: the tip fires when a road meets water, Show me finds a crossing', () => {
  function seam(world) {
    const store = createStore(INITIAL_UI_STATE), fired = [], shown = [], toasts = [];
    const root = document.createElement('div');
    document.body.append(root);
    const ui = createMapUi({ world, store, root, fireTip: (k) => { if (k !== 'roadRoute') fired.push(k); },   // Version 5.0 (Task 5): the seam also fires Route's tip (tests/v50/roads), which this test is not about
    showMeAt: (a) => shown.push(a), toasts: { show: (t) => toasts.push(t) } });
    const pl = createPlacement({ world, store });
    return { store, pl, ui, fired, shown, toasts, root, cleanup() { ui.destroy(); root.remove(); } };
  }
  it('fires for a line a bridge would cross, and for one the rule refuses for water, and for no other road', () => {
    const w = riverWorld(10, 12);
    const s = seam(w);
    try {
      s.pl.start({ kind: 'road' });
      s.pl.pointAt(2, 5); s.pl.pointAt(6, 5);                                                // dry land only
      expect(s.fired).toEqual([]);
      s.pl.pointAt(9, 7); s.pl.pointAt(13, 7);                                               // across 3 tiles of water: a bridge would be laid
      expect(s.fired).toEqual(['roadMeetsWater']);
      s.pl.pointAt(9, 9); s.pl.pointAt(11, 9);                                               // stops in the water: bridge_shape
      expect(s.fired.length).toBe(2);
      s.pl.start({ kind: 'road', gate: true });
      s.pl.pointAt(9, 11); s.pl.pointAt(13, 11);
      expect(s.fired.length).toBe(2);                                                        // the gate tool is not a road
      s.pl.start({ kind: 'building', type: 'well' }, { x: 11, y: 5 });
      expect(s.fired.length).toBe(2);
      const wide = riverWorld(10, 10 + BRIDGE_MAX + 2);
      const t = seam(wide);
      try { t.pl.start({ kind: 'road' }); t.pl.pointAt(9, 7); t.pl.pointAt(10 + BRIDGE_MAX + 3, 7); expect(t.fired).toEqual(['roadMeetsWater', 'roadTooWide']); } finally { t.cleanup(); }   // too_wide: and (Version 7.1, Track F) the ferries tip
      s.ui.onCommand({ kind: 'road', result: { ok: true, bridges: [] }, undoable: true });
      expect(s.fired.length).toBe(2);
      s.ui.onCommand({ kind: 'road', result: { ok: true, bridges: [idx(32, 11, 4)] }, undoable: true });
      expect(s.fired.length).toBe(3);                                                        // a bridge laid by a command
    } finally { s.cleanup(); }
  });
  it('Show me from a road the rule refuses goes to the nearest crossing, and says so when the map has none', () => {
    const w = riverWorld(10, 12);
    const s = seam(w);
    try {
      s.pl.start({ kind: 'road' });
      s.pl.pointAt(9, 20); s.pl.pointAt(11, 20);                                             // ends in the water
      expect(s.pl.preview().showFit).toBe(true);
      s.root.dispatchEvent(new CustomEvent('thebes:show-fit', { bubbles: true }));
      const spot = bridgeSpot(w, { x: 9, y: 20 });
      expect(s.shown).toEqual([{ category: 'roads', item: 'road', x: spot.x + 0.5, y: spot.y + 0.5 }]);
      expect(Math.abs(spot.y - 20)).toBeLessThanOrEqual(1);
    } finally { s.cleanup(); }
    const wide = riverWorld(10, 10 + BRIDGE_MAX);
    const t = seam(wide);
    try {
      t.pl.start({ kind: 'road' });
      t.pl.pointAt(9, 20); t.pl.pointAt(11, 20);
      t.root.dispatchEvent(new CustomEvent('thebes:show-fit', { bubbles: true }));
      expect([t.shown, t.toasts]).toEqual([[], [S46_MAP_TEXT.noBridge]]);
    } finally { t.cleanup(); }
  });
  it('lets go of its listener when it is destroyed', () => {
    const w = riverWorld(10, 12);
    const s = seam(w);
    s.pl.start({ kind: 'road' });
    s.pl.pointAt(9, 20); s.pl.pointAt(11, 20);
    const firedBefore = s.fired.length;
    s.ui.destroy();
    s.root.dispatchEvent(new CustomEvent('thebes:show-fit', { bubbles: true }));
    s.pl.pointAt(9, 22); s.pl.pointAt(13, 22);
    expect([s.shown, s.fired.length]).toEqual([[], firedBefore]);
    s.root.remove();
  });
  it('makes the seam of a game without a city as an empty one (the contract\'s seam shape)', () => {
    const ui = createMapUi({});
    expect(Object.keys(ui).sort()).toEqual(['destroy', 'onAlertAction', 'onCommand', 'onEvents', 'refresh', 'sheetParts', 'sheets']);
    ui.onCommand({ kind: 'road' }); ui.destroy();                                              // and does nothing without a city
  });
});

describe('s46 map bridges in the game: the confirm bar offers Show me to a refused road, and the tip waits for the road tool to end', () => {
  it('shows the note, then, for a line that stops in the water, the sim\'s reason and a Show me that moves the view to a crossing', async () => {
    const w = uiWorld();
    for (let y = 0; y < 32; y++) if (y !== 10) for (let x = 20; x <= 22; x++) w.terrain[idx(32, x, y)] = T.WATER;
    const r = await rigUI({ world: w });
    try {
      r.ui.placement.start({ kind: 'road' });
      r.frame(1);
      const bar = r.root.querySelector('#confirm');
      expect(bar.querySelector('.cost').textContent).toBe('Water: a bridge, 25 gold a tile');
      expect(bar.querySelector('.show-fit')).toBe(null);
      r.ui.placement.pointAt(18, 5); r.ui.placement.pointAt(21, 5);
      r.frame(2);
      expect(bar.querySelector('.reason').textContent).toBe('A bridge runs straight across, with land at both ends');
      const show = bar.querySelector('.show-fit');
      expect([Boolean(show), show && show.getAttribute('aria-label')]).toEqual([true, 'Show me where a bridge fits']);
      fire(show, 'click');
      expect([r.ui.store.get().tool.kind, r.ui.store.get().line]).toEqual(['road', { x0: 18, y0: 5, x1: 21, y1: 5, flip: false }]);   // Version 5.0 (final review): the road tool stays as it is, the player's start and end kept; the view moves to the crossing
      r.ui.placement.pointAt(19, 5); r.ui.placement.pointAt(23, 5);
      r.frame(3);
      expect(bar.querySelector('.reason').textContent).toBe('2 tiles · Bridge: 3 tiles, 75 gold');
      expect(bar.querySelector('.show-fit')).toBe(null);
    } finally { r.cleanup(); }
  });
});

describe('s46 map bridges in the guidance row: the tip carries a Show me to the nearest crossing', () => {
  it('shows the tip with a Show me that closes it and starts the road tool at a crossing, and shows none on a map with no crossing', async () => {
    const clock = { t: 0 };
    const w = uiWorld();
    for (let y = 0; y < 32; y++) if (y !== 10) for (let x = 20; x <= 22; x++) w.terrain[idx(32, x, y)] = T.WATER;
    w.speed = 1;
    const r = await rigUI({ world: w, now: () => clock.t });
    try {
      r.ui.settings.set({ seenTips: ['gentle_motion'] });                               // the device's own Gentle tip is not the one under test
      clock.t = 20000;                                                                  // past the first 10 s, when no tip shows
      if (r.ui.tips.current()) r.ui.tips.dismiss();
      const shown = r.ui.tips.trigger('roadMeetsWater');
      expect([shown, r.ui.tips.current(), clock.t]).toEqual([true, 'bridges', 20000]);
      await new Promise((resolve) => setTimeout(resolve, 0));                          // the seam adds its button as the row renders
      const row = r.root.querySelector('#tip .tip-row');
      expect(row.querySelector('.text').textContent).toBe(TIP_TEXT.bridges);
      const show = row.querySelector('.tip-show-me');
      expect([show.textContent, show.getAttribute('aria-label')]).toEqual(['Show me', `Show me: ${TIP_TEXT.bridges}`]);
      expect(row.querySelectorAll('.tip-show-me').length).toBe(1);
      fire(show, 'click');
      expect([r.ui.tips.current(), r.ui.store.get().tool.kind]).toEqual([null, 'road']);
    } finally { r.cleanup(); }
    const dry = uiWorld();
    dry.speed = 1;
    const q = await rigUI({ world: dry, now: () => clock.t });
    try {
      q.ui.settings.set({ seenTips: ['gentle_motion'] });
      clock.t = 40000;                                                                  // this city began at 20 s: past its own first 10 s
      if (q.ui.tips.current()) q.ui.tips.dismiss();
      const shownQ = q.ui.tips.trigger('roadMeetsWater');
      expect([shownQ, q.ui.tips.current()]).toEqual([true, 'bridges']);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(q.root.querySelector('#tip .tip-row .tip-show-me')).toBe(null);          // nowhere to cross: the tip says its words and no more
    } finally { q.cleanup(); }
  });
});

describe('s46 map bridges in the guidance row: the tip\'s Show me aims at the crossing nearest the view, not at a pixel', () => {
  // Two crossings far apart: the river is dry but for a 3-tile pool at rows 4 and 28.
  function twoCrossings() {
    const w = makeTestWorld({ size: 32, fertile: [], gold: 5000 });
    for (const y of [4, 28]) for (let x = 10; x <= 12; x++) w.terrain[idx(32, x, y)] = T.WATER;
    return w;
  }
  function tipSeam(w, centreTile) {
    const root = document.createElement('div');
    root.innerHTML = '<div id="tip"><div class="tip-row"><span class="body"><span class="text"></span><button class="more" hidden></button></span><button class="got-it">Got it</button></div></div>';
    root.querySelector('.text').textContent = TIP_TEXT.bridges;
    document.body.append(root);
    const shown = [], store = createStore(INITIAL_UI_STATE);
    const ui = createMapUi({ world: w, store, root, fireTip: () => {}, showMeAt: (a) => shown.push(a), toasts: { show: () => {} }, cameraControl: { centre: () => ({ x: 187, y: 333 }), centreTile: () => centreTile.at } });
    return { root, shown, ui, cleanup() { ui.destroy(); root.remove(); } };
  }
  it('goes to the crossing nearest the tile under the middle of the view, worked out when the button is pressed', () => {
    const w = twoCrossings();
    const centreTile = { at: { x: 11, y: 5 } };
    const t = tipSeam(w, centreTile);
    try {
      const button = t.root.querySelector('.tip-show-me');
      expect(Boolean(button)).toBe(true);
      fire(button, 'click');
      const north = bridgeSpot(w, { x: 11, y: 5 }), south = bridgeSpot(w, { x: 11, y: 27 });
      expect([Math.abs(north.y - 4) <= 1, Math.abs(south.y - 28) <= 1]).toEqual([true, true]);
      expect(t.shown).toEqual([{ category: 'roads', item: 'road', x: north.x + 0.5, y: north.y + 0.5 }]);
      centreTile.at = { x: 11, y: 27 };                                                   // the player looks south now; the tip's row is still up
      fire(button, 'click');
      expect(t.shown[1]).toEqual({ category: 'roads', item: 'road', x: south.x + 0.5, y: south.y + 0.5 });
      expect(t.shown[1].y).toBeGreaterThan(20);                                           // a pixel centre (187, 333) read as a tile would always pick the same end
    } finally { t.cleanup(); }
  });
  it('measures the tip\'s words again once the button has narrowed them: a cut row shows More', () => {
    const w = twoCrossings();
    const proto = HTMLElement.prototype, saved = Object.getOwnPropertyDescriptor(proto, 'scrollHeight');
    Object.defineProperty(proto, 'scrollHeight', { configurable: true, get() { return this.classList.contains('text') ? 60 : 0; } });
    Object.defineProperty(proto, 'clientHeight', { configurable: true, get() { return this.classList.contains('text') ? 30 : 0; } });
    const t = tipSeam(w, { at: { x: 11, y: 5 } });
    try {
      const more = t.root.querySelector('.more');
      expect([more.hidden, more.textContent.startsWith('More')]).toEqual([false, true]);
    } finally {
      t.cleanup();
      delete proto.clientHeight;
      if (saved) Object.defineProperty(proto, 'scrollHeight', saved); else delete proto.scrollHeight;
    }
  });
  it('gives the camera a centreTile that is the tile at the middle of the view, in tile coordinates (not the pixel centre)', async () => {
    const r = await rigUI({});
    try {
      const cc = r.ui.cameraControl;
      for (const [x, y] of [[12, 10], [20, 25], [5, 3]]) {
        cc.jumpTo(x, y);
        const c = cc.centreTile();
        expect([Math.abs(c.x - x) < 0.01, Math.abs(c.y - y) < 0.01]).toEqual([true, true]);
      }
      expect(cc.centre()).toEqual({ x: 195, y: 422 });                                    // the pixel centre, which is what bridgeSpot was being given
    } finally { r.cleanup(); }
  });
});
