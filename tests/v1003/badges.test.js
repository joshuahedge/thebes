// Version 10.0.3 (ruling 2469, Josh): the key badges show on a desktop (the wide layout) only; on a phone they are hidden even
// with a fine pointer, while the keys themselves still work.
import { describe, it, expect } from '../harness.js';
import { key } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';
import { CATEGORIES } from '../../src/data/ui.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const shown = (el) => getComputedStyle(el).display !== 'none';

describe('v1003 key badges: desktop only', () => {
  it('hides every badge on a phone held upright, and the digit keys still open a tab (390 x 844)', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.renderer.renderFrame = () => {};
      r.ui.keyBadges.decorate();
      key(r.root, '1');
      await tick();
      expect(r.store.get().category).toBe(CATEGORIES[0].id);
      const badges = [...r.root.querySelectorAll('.key-badge')];
      expect(badges.filter(shown).length).toBe(0);
    } finally { r.cleanup(); }
  });
  it('hides every badge on a phone held sideways (844 x 390)', async () => {
    const r = await rigUI({ width: 844, height: 390 });
    try {
      r.renderer.renderFrame = () => {};
      r.ui.keyBadges.decorate();
      expect([...r.root.querySelectorAll('.key-badge')].filter(shown).length).toBe(0);
    } finally { r.cleanup(); }
  });
  it('still shows the tab badges on a desktop (1280 x 800)', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.renderer.renderFrame = () => {};
      r.ui.keyBadges.decorate();
      const badges = [...r.root.querySelectorAll('.key-badge.tab-key')];
      expect(badges.length > 2).toBe(true);
      expect(badges.every(shown)).toBe(true);
    } finally { r.cleanup(); }
  });
});
