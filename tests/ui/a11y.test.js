import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire, key } from '../helpers/dom.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { screenToTile } from '../../src/render/camera.js';
import { buildingAt } from '../../src/sim/world.js';

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
    for (const kind of ['summary', 'minimap', 'menu', 'settings', 'help', 'about']) {
      r.store.set(openSheet(r.store.get(), kind));
      expect(unnamed()).toEqual([]);
    }
    r.store.set(select(r.store.get(), buildingAt(r.world, 15, 11).id));
    expect(unnamed()).toEqual([]);
    r.resize(1280, 800);
    expect(unnamed()).toEqual([]);
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
