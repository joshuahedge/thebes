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
  it('keeps the portrait confirm bar one height, and the corner buttons put, as the preview flips between ok, warning and blocked', async () => {
    for (const size of [100, 125, 150]) {
      const r = await rigUI({ width: 390, height: 844 });
      try {
        r.ui.settings.set({ textSize: size });
        const granary = Object.values(r.world.buildings).find((b) => b.type === 'granary');
        const read = () => {
          const bar = r.root.querySelector('#confirm').getBoundingClientRect();
          return { top: bar.top, height: bar.height, corner: r.root.querySelector('#corners .minimap-button').getBoundingClientRect().bottom };
        };
        const stateOf = () => r.ui.placement.preview().state;
        r.ui.placement.start(FARM, { x: 0, y: 8 });
        expect([size, 'ok', stateOf()]).toEqual([size, 'ok', 'ok']);              // a farm beside the road with a granary in reach: nothing to say
        const ok = read();
        removeBuilding(r.world, granary.id);
        r.ui.placement.moveGhost(1, 8);
        expect([size, 'warn', stateOf()]).toEqual([size, 'warn', 'warn']);         // its grain has nowhere to go: one line of warning
        expect(r.root.querySelector('#confirm .reason').textContent).toBe(warningText('no_storage'));
        const warn = read();
        r.ui.placement.moveGhost(0, 2);
        expect([size, 'bad', stateOf()]).toEqual([size, 'bad', 'bad']);           // no road: one line of reason
        const bad = read();
        r.ui.placement.start(WELL, { x: 14, y: 9 });
        expect(r.root.querySelector('#confirm .effect').textContent).toBe('Gives water to 2 homes');
        const effect = read();                                                      // a service with its effect line
        for (const [name, m] of [['warn', warn], ['bad', bad], ['effect', effect]]) {
          expect([size, name, m.height, m.corner]).toEqual([size, name, ok.height, ok.corner]);
        }
        expect(ok.height).toBeGreaterThan(0);
      } finally { r.cleanup(); }
    }
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
