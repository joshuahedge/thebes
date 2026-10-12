import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire, key } from '../helpers/dom.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { screenToTile } from '../../src/render/camera.js';
import { buildingAt } from '../../src/sim/world.js';
import { T } from '../../src/ui/text.js';
import { TIP_FIRST_DELAY_MS } from '../../src/data/tips.js';

// A control's name is its aria-label, else its visible text with aria-hidden glyphs removed (an icon-only button
// whose only text is a hidden glyph has no name). Scans buttons and role=button; there are no bare inputs, selects
// or textareas in the shell today (settings use buttons), so those are left out.
const nameOf = (b) => {
  const label = b.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();
  const clone = b.cloneNode(true);
  for (const n of clone.querySelectorAll('[aria-hidden="true"]')) n.remove();
  return clone.textContent.trim();
};

describe('ui accessibility', () => {
  it('gives every control a name, in every layout and sheet (spec 6.8)', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    const unnamed = () => [...r.root.querySelectorAll('button, [role="button"]')].filter((b) => !nameOf(b)).map((b) => b.className);
    expect(unnamed()).toEqual([]);
    // A raid warning: the phone's one-line chip and View, then (below, wide) the full banner's buttons.
    r.world.raid.warning = { index: 1, entry: { x: 31, y: 16 }, dir: 'east', size: 6, tribute: 240, target: 'storehouse', day: r.world.day, arrives: r.world.day + 72, first: false };
    r.world.gold = -5;
    r.ui.refresh();
    expect([r.root.querySelectorAll('#banner button').length, unnamed()]).toEqual([2, []]);
    for (const kind of ['summary', 'minimap', 'menu', 'settings', 'help', 'about']) {
      r.store.set(openSheet(r.store.get(), kind));
      expect(unnamed()).toEqual([]);
    }
    r.store.set(select(r.store.get(), buildingAt(r.world, 15, 11).id));
    expect(unnamed()).toEqual([]);
    r.resize(1280, 800);
    expect([r.root.querySelectorAll('#banner button').length, unnamed()]).toEqual([4, []]);   // View, Pay tribute, Shrink, +1 more
    expect(r.canvas.getAttribute('aria-describedby')).toBe('map-summary');
    expect(r.root.querySelector('#map-summary').textContent.length).toBeGreaterThan(0);
    r.cleanup();
  });
  it('places a building with the keyboard alone and leaves with Esc (spec 9: keyboard-only play)', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    // The ghost appears under the point (width / 2, height * 0.4). Aim the camera so that point is tile (5, 9),
    // beside the road: camera tile coordinates shift every screen point by the same amount.
    const c = screenToTile(r.cam, { width: 1280, height: 800 }, 640, 320);
    r.cam.x += 5.2 - c.x; r.cam.y += 9.2 - c.y;
    key(r.root, '5');                                                         // Services tab (wide layout: no tray)
    expect(r.store.get().category).toBe('services');
    const card = r.root.querySelector('#panel .cards .card');                 // Tab reaches it; Enter clicks a focused button
    card.focus();
    fire(card, 'click');
    expect(r.store.get().mode).toBe('placing');
    expect(r.store.get().ghost).toEqual({ x: 5, y: 9 });
    const x0 = r.cam.x;
    key(r.root, 'ArrowLeft');                                                 // arrows move the view, not the ghost
    expect(r.cam.x === x0).toBe(false);
    expect(r.store.get().ghost).toEqual({ x: 5, y: 9 });
    key(r.root, 'Enter');
    expect(buildingAt(r.world, 5, 9).type).toBe('well');
    key(r.root, 'z', { ctrlKey: true });
    expect(buildingAt(r.world, 5, 9)).toBe(null);
    key(r.root, 'Escape');
    expect(r.store.get().mode).toBe('browse');
    key(r.root, ' ');
    expect(r.world.speed).toBe(1);
    key(r.root, ' ');
    expect(r.world.speed).toBe(0);
    r.cleanup();
  });
  it('names the More, Less and All goals controls, says whether a row is open, and keeps the tip and caption rows live regions (P8)', async () => {
    let t = 0;
    const r = await rigUI({ width: 360, height: 640, now: () => t });
    r.renderer.renderFrame = () => {};
    try {
      r.ui.settings.set({ textSize: 150, reducedMotion: 'on' });
      const unnamed = () => [...r.root.querySelectorAll('button, [role="button"]')].filter((b) => !b.hidden && !nameOf(b)).map((b) => b.className);
      const live = (id) => [r.root.querySelector(`#${id}`).getAttribute('role'), r.root.querySelector(`#${id}`).getAttribute('aria-live')];
      expect([live('tip'), live('cheer')]).toEqual([['status', 'polite'], ['status', 'polite']]);
      t = TIP_FIRST_DELAY_MS;
      r.world.speed = 1;
      expect(r.ui.tips.trigger('goalDone')).toBe(true);                // cut at two lines at 150% on a 360 px phone
      r.frame(1000);
      const more = r.root.querySelector('#tip .more');
      expect([more.hidden, nameOf(more), more.getAttribute('aria-expanded')]).toEqual([false, T.more, 'false']);
      fire(more, 'click');
      expect([nameOf(more), more.getAttribute('aria-expanded'), unnamed()]).toEqual([T.less, 'true', []]);   // the arrow is decoration: the name is the word
      expect(r.root.querySelector('#tip').getAttribute('aria-live')).toBe('polite');
      fire(r.root, 'keydown', { key: 'Escape' });
      r.ui.tips.dismiss();
      const words = r.root.querySelector('#goals .open-goals');
      expect([words.getAttribute('aria-expanded'), nameOf(words).includes(T.goal)]).toEqual(['false', true]);
      fire(words, 'click');
      const all = r.root.querySelector('#goals .all-goals');
      expect([words.getAttribute('aria-expanded'), nameOf(all), unnamed()]).toEqual(['true', T.allGoals, []]);   // the › is decoration
      expect([...r.root.querySelectorAll('#goals button')].filter((b) => !b.hidden).every((b) => b.getBoundingClientRect().height >= 44)).toBe(true);
    } finally { r.cleanup(); }
  });
  it('jumps instead of panning under reduced motion (spec 5.4)', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    r.ui.settings.set({ reducedMotion: 'on' });
    expect(document.body.classList.contains('reduce-motion')).toBe(true);
    const temple = buildingAt(r.world, 24, 11);                                // off the right edge of a phone view
    r.store.set(select(r.store.get(), temple.id));
    expect(r.ui.cameraControl.animating).toBe(false);
    expect(r.cam.x === 12 && r.cam.y === 10).toBe(false);                     // it moved, at once
    r.ui.settings.set({ reducedMotion: 'off' });
    r.store.set(select(r.store.get(), buildingAt(r.world, 2, 11).id));        // the farm, off the left edge
    expect(r.ui.cameraControl.animating).toBe(true);                          // now it tweens
    r.cleanup();
  });
});
