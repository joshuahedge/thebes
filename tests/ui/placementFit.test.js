import { describe, it, expect } from '../harness.js';
import { nearestFit, createPlacement } from '../../src/ui/placement.js';
import { createConfirmBar } from '../../src/ui/confirmBar.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { homesServedFrom } from '../../src/sim/housing.js';
import { canPlace } from '../../src/sim/commands.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { NEAREST_FIT_RADIUS } from '../../src/data/ui.js';
import { screenToTile, tileToScreen } from '../../src/render/camera.js';
import { effectText, warningText, T } from '../../src/ui/text.js';
import { removeBuilding } from '../../src/sim/world.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
import { uiWorld, rigUI } from '../helpers/uiWorld.js';
import { mount, fire } from '../helpers/dom.js';

const WELL = { kind: 'building', type: 'well' };
const FARM = { kind: 'building', type: 'farm_grain' };
const TEMPLE = { kind: 'building', type: 'temple' };

// A road along y = 10 across a 32 x 32 map; fertile land on x < 8 (makeTestWorld's default).
function street() {
  const w = makeTestWorld({ gold: 1000 });
  setRoad(w, 0, 10, 31, 10);
  return w;
}

describe('ui placement fit', () => {
  it('lands a ghost on the nearest free tile beside a road, ten tiles out at most', () => {
    const w = street();
    expect(NEAREST_FIT_RADIUS).toBe(10);
    expect(nearestFit(w, WELL, 12, 9)).toEqual({ x: 12, y: 9 });               // it fits where it is: it stays
    expect(nearestFit(w, WELL, 12.4, 2.2)).toEqual({ x: 12, y: 9 });           // seven rows above the road: straight down to it
    addRaw(w, 'well', 12, 9);
    expect(nearestFit(w, WELL, 12, 9)).toEqual({ x: 11, y: 9 });               // taken: the nearest free tile (ties go up, then left)
    expect(nearestFit(w, WELL, 30, 30, 3)).toEqual({ x: 30, y: 30 });          // nothing within three tiles: the snapped point, so the bar says why
    expect(nearestFit(w, WELL, 40, -2, 2)).toEqual({ x: 31, y: 0 });           // snapped onto the map first
    expect(nearestFit(w, { kind: 'road' }, 4.6, 7.2)).toEqual({ x: 5, y: 7 }); // line and area tools only snap
  });
  it('keeps the whole footprint free and on the map', () => {
    const w = street();
    addRaw(w, 'house', 20, 11);
    addRaw(w, 'house', 21, 11);
    const at = nearestFit(w, TEMPLE, 20, 11);
    expect(at).toEqual({ x: 18, y: 11 });                                       // two tiles left: clear of both plots, still on the road
    expect(canPlace(w, 'temple', at.x, at.y).ok).toBe(true);
    const edge = nearestFit(w, TEMPLE, 31, 11);
    expect(edge).toEqual({ x: 30, y: 11 });                                     // a 2 x 2 never hangs off the right edge
  });
  it('prefers a clean fit to one with a warning, and takes a warned fit when nothing is clean', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);                                                  // road A
    setRoad(w, 0, 20, 31, 20);                                                  // road B, not joined to road A
    expect(nearestFit(w, FARM, 3, 18)).toEqual({ x: 3, y: 18 });               // no granary anywhere: the warned fit right here
    addRaw(w, 'granary', 10, 11);                                               // on road A
    expect(canPlace(w, 'farm_grain', 3, 18).warnings).toEqual(['no_storage']);
    expect(nearestFit(w, FARM, 3, 18)).toEqual({ x: 3, y: 11 });               // seven rows up on road A, where its grain has somewhere to go
  });
  it('counts the homes a service would reach from a spot, by the coverage rule', () => {
    const w = street();
    addRaw(w, 'house', 5, 9);                                                   // an empty plot counts
    addRaw(w, 'house', 8, 9, { tier: 1, residents: 4 });                        // five road tiles from a well at (4, 11)
    addRaw(w, 'house', 9, 9, { tier: 1, residents: 4 });                        // six: one too far for a well
    addRaw(w, 'house', 6, 20);                                                  // no road at all
    expect(homesServedFrom(w, 'well', 4, 11)).toBe(2);
    expect(homesServedFrom(w, 'temple', 4, 11)).toBe(3);
    expect(homesServedFrom(w, 'bazaar', 4, 11)).toBe(3);
    expect(homesServedFrom(w, 'granary', 4, 11)).toBe(0);                       // no reach of its own
    expect(homesServedFrom(w, 'well', 4, 14)).toBe(0);                          // touches no road
  });
  it('says what a service will do from the ghost, in plain words', () => {
    expect(effectText('well', 6)).toBe('Gives water to 6 homes');
    expect(effectText('bazaar', 1)).toBe('Feeds 1 home');
    expect(effectText('temple', 2)).toBe('Serves 2 homes');
    expect(effectText('well', 0)).toBe(T.noHomesInReach);
    expect(effectText('farm_grain', 3)).toBe('');
    const world = uiWorld();                                                    // huts at (12, 9) and (13, 9) on the road at y = 10
    const store = createStore(INITIAL_UI_STATE);
    const pl = createPlacement({ world, store });
    pl.start(WELL, { x: 14, y: 9 });
    expect(store.get().ghost).toEqual({ x: 14, y: 9 });
    expect(pl.preview().effect).toBe('Gives water to 2 homes');
    pl.start(TEMPLE, { x: 16, y: 8 });
    expect(store.get().ghost).toEqual({ x: 16, y: 8 });
    expect(pl.preview().effect).toBe('Serves 2 homes');
    pl.start({ kind: 'road' });
    expect(pl.preview().effect).toBe('');
    pl.start(WELL, { x: 14, y: 9 });
    pl.moveGhost(14, 20);                                                       // no road there: blocked
    expect(pl.preview().state).toBe('bad');
    expect(pl.preview().effect).toBe('');
  });
  it('puts the effect in the bar in teal, and shows rotate only for buildings that rotate', () => {
    const { root, cleanup } = mount();
    try {
      const world = uiWorld();
      const store = createStore(INITIAL_UI_STATE);
      const placement = createPlacement({ world, store });
      const bar = createConfirmBar({ container: root, store, placement, onCancel() {}, onConfirm() {}, onUndo() {} });
      placement.start(WELL, { x: 14, y: 9 });
      const effect = root.querySelector('.confirm .effect');
      expect(effect.textContent).toBe('Gives water to 2 homes');
      expect(effect.classList.contains('teal')).toBe(true);
      expect(root.querySelector('.rotate')).toBe(null);                         // nothing rotates in Stage 1
      placement.moveGhost(14, 20);                                              // no road: the reason takes the line
      expect(root.querySelector('.confirm .effect')).toBe(null);
      expect(root.querySelector('.reason').classList.contains('coral')).toBe(true);
      BUILDINGS.well.rotates = true;                                            // borrow the well to see the button come back
      try { bar.render(); expect(root.querySelector('.rotate')).toBeTruthy(); } finally { delete BUILDINGS.well.rotates; }
      bar.render();
      expect(root.querySelector('.rotate')).toBe(null);
      placement.cancel();
    } finally { cleanup(); }
  });
  it('brings a ghost that landed off screen into view', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.settings.set({ reducedMotion: 'on' });                               // the view jumps, so the test can read it at once
      const v = { width: 390, height: 844 };
      const c = screenToTile(r.cam, v, v.width / 2, v.height * 0.4);          // where a picked card's ghost starts
      r.cam.x += 20.2 - c.x; r.cam.y += 1.2 - c.y;                              // aim that point at (20, 1): eight rows above the road
      const before = { x: r.cam.x, y: r.cam.y };
      r.store.set({ category: 'services', dock: 'tray' });
      fire(r.root.querySelector('#dock .tray .card[data-item="well"]'), 'click');
      expect(r.store.get().ghost).toEqual({ x: 20, y: 9 });
      expect(r.cam.x === before.x && r.cam.y === before.y).toBe(false);
      const [sx, sy] = tileToScreen(r.cam, v, 20.5, 9.5);
      expect(sx >= 0 && sx <= v.width && sy >= 0 && sy <= v.height).toBe(true);
    } finally { r.cleanup(); }
  });
  it('gives the bar its own row for words in compact, and stacks the corners above it in portrait at 100% and 150%', async () => {
    const compact = await rigUI({ width: 844, height: 390 });
    try {
      compact.ui.placement.start(WELL, { x: 14, y: 9 });
      const info = compact.root.querySelector('#confirm .info').getBoundingClientRect();
      const ok = compact.root.querySelector('#confirm .ok').getBoundingClientRect();
      expect(info.width).toBeGreaterThanOrEqual(200);
      expect(ok.top).toBeGreaterThanOrEqual(info.bottom - 0.5);                // the buttons sit on a row of their own
    } finally { compact.cleanup(); }
    for (const size of [100, 150]) {
      const r = await rigUI({ width: 390, height: 844 });
      try {
        r.ui.settings.set({ textSize: size });
        r.ui.placement.start(WELL, { x: 14, y: 9 });
        expect(r.root.querySelector('#confirm .effect').textContent).toBe('Gives water to 2 homes');
        const bar = r.root.querySelector('#confirm').getBoundingClientRect();
        const corners = r.root.querySelector('#corners').getBoundingClientRect();
        expect(corners.height).toBeGreaterThan(0);
        expect([size, corners.bottom <= bar.top + 0.5]).toEqual([size, true]);
      } finally { r.cleanup(); }
    }
  });
  // The corner buttons sit on the portrait confirm bar, so the bar must not bob as the ghost moves. The min-height in
  // css/ui.css covers a title, a cost and two lines of reason; where that is not enough (a 360 px phone at 150% text,
  // "Housing plots" on two lines), the bar keeps the tallest height it reached until the tool changes.
  it('keeps the portrait confirm bar one height, and the corner buttons put, as the preview flips between ok, warning and blocked', async () => {
    for (const [w, h] of [[390, 844], [360, 640]]) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          const at = `${w}x${h} at ${size}%`;
          const granary = Object.values(r.world.buildings).find((b) => b.type === 'granary');
          const read = () => {
            const bar = r.root.querySelector('#confirm').getBoundingClientRect();
            const corner = r.root.querySelector('#corners .minimap-button').getBoundingClientRect().bottom;
            expect([at, corner <= bar.top + 0.5]).toEqual([at, true]);                 // the corners sit on the bar
            return { height: bar.height, corner };
          };
          const stateOf = () => r.ui.placement.preview().state;
          // One tool: the farm flips between ok, warning and blocked, then back.
          r.ui.placement.start(FARM, { x: 0, y: 8 });
          expect([at, stateOf()]).toEqual([at, 'ok']);                                 // beside the road with a granary in reach: nothing to say
          const farm = [read()];
          removeBuilding(r.world, granary.id);
          r.ui.placement.moveGhost(1, 8);
          expect([at, stateOf()]).toEqual([at, 'warn']);                               // its grain has nowhere to go
          expect(r.root.querySelector('#confirm .reason').textContent).toBe(warningText('no_storage'));
          farm.push(read());
          r.ui.placement.moveGhost(0, 2);
          expect([at, stateOf()]).toEqual([at, 'bad']);                                // no road
          farm.push(read());
          r.ui.placement.moveGhost(1, 8);
          farm.push(read());
          r.ui.placement.moveGhost(0, 8);
          farm.push(read());
          const tallest = Math.max(...farm.map((m) => m.height));
          // From its first move on the bar is as tall as it will get: it never shrinks, so the corners never drop back.
          for (const [i, m] of farm.entries()) {
            if (i === 0) continue;
            expect([at, i, m.height, m.corner]).toEqual([at, i, tallest, farm[farm.length - 1].corner]);
          }
          if (!(w === 360 && size === 150)) expect([at, farm[0].height]).toEqual([at, tallest]);   // and where the min-height covers it, one height from the start
          r.ui.placement.start(WELL, { x: 14, y: 9 });                                 // a new tool starts afresh
          expect(r.root.querySelector('#confirm .effect').textContent).toBe('Gives water to 2 homes');
          const well = read();
          expect([at, well.height <= tallest]).toEqual([at, true]);
          // Housing plots: "Tap where it starts", a painted area with its warning, then ready for the next one.
          r.ui.placement.start({ kind: 'houses' });
          const plots = [read()];
          r.ui.placement.pointAt(16, 13);
          plots.push(read());
          r.ui.placement.pointAt(21, 14);
          expect([at, stateOf()]).toEqual([at, 'warn']);                               // no road touches the far plots
          plots.push(read());
          expect(r.ui.placement.confirm().ok).toBe(true);
          expect(r.ui.placement.preview().text).toBe(T.tapStart);                      // the tool stays, back to its first prompt
          plots.push(read());
          const plotsTallest = Math.max(...plots.map((m) => m.height));
          for (const [i, m] of plots.entries()) if (i >= 2) expect([at, 'plots', i, m.height]).toEqual([at, 'plots', i, plotsTallest]);
          for (let i = 1; i < plots.length; i++) expect([at, 'plots', i, plots[i].height >= plots[i - 1].height]).toEqual([at, 'plots', i, true]);
          r.ui.placement.cancel();
          expect(document.body.style.getPropertyValue('--confirm-h')).toBe('');        // gone with the tool
        } finally { r.cleanup(); }
      }
    }
  });
  it('words a service with no homes in reach in muted ink, not in the teal of a gain', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.placement.start(WELL, { x: 28, y: 9 });                               // on the road, far from the homes
      expect(r.ui.placement.preview().state).toBe('ok');
      const none = r.root.querySelector('#confirm .effect');
      expect(none.textContent).toBe(T.noHomesInReach);
      expect([none.classList.contains('muted'), none.classList.contains('teal')]).toEqual([true, false]);
      expect(getComputedStyle(none).color).toBe('rgb(90, 72, 50)');               // ink-soft, as the cost line
      r.ui.placement.start(WELL, { x: 14, y: 9 });
      const some = r.root.querySelector('#confirm .effect');
      expect(some.textContent).toBe('Gives water to 2 homes');
      expect([some.classList.contains('muted'), some.classList.contains('teal')]).toEqual([false, true]);
    } finally { r.cleanup(); }
  });
  it('lets the confirm dialog buttons wrap at large text', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.store.set({ confirmDialog: { text: T.newCityConfirm, confirmLabel: T.startNewCity, extraLabel: T.exportFirst, onConfirm() {}, onExtra() {} } });
      expect(getComputedStyle(r.root.querySelector('#dialog .buttons')).flexWrap).toBe('wrap');
      const box = r.root.querySelector('#dialog .box').getBoundingClientRect();
      for (const b of r.root.querySelectorAll('#dialog .buttons button')) {
        const rc = b.getBoundingClientRect();
        expect([b.textContent, rc.right <= box.right + 0.5, rc.height < 60]).toEqual([b.textContent, true, true]);   // one line each, inside the box
      }
    } finally { r.cleanup(); }
  });
});
