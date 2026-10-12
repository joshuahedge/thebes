// Track H, task H2 (the controller's note on the base): the interface's transitions and animations follow the Motion
// setting (spec 5.4, ruling 247), not the device. settings.js writes data-motion ('full' | 'gentle' | 'still') on the root;
// Full keeps the chrome's transitions even on a device that asks for less motion, Gentle and Still make them instant. Only
// before the settings apply (no data-motion yet) does the device's request decide.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { createSettings } from '../../../src/ui/settings.js';

describe('s4 look motion follows the setting', () => {
  it('keeps transitions and animations under Full on a device that asks for less motion, and stops them under Gentle and Still', async () => {
    const settings = createSettings({ storage: null, root: document.body, systemReducedMotion: () => true, watchSystem: () => () => {} });
    const r = await rigUI({ width: 390, height: 844, settings });
    try {
      const probe = document.createElement('div');
      probe.style.cssText = 'transition: opacity 200ms ease; animation: cheer-in 200ms ease-out;';
      r.root.querySelector('#ui').append(probe);
      const moving = () => { const cs = getComputedStyle(probe); return [document.body.dataset.motion, cs.transitionDuration, cs.animationName]; };
      expect(moving()).toEqual(['gentle', '0s', 'none']);                    // following a device that asks for less: Gentle
      settings.set({ motion: 'full' });
      expect(moving()).toEqual(['full', '0.2s', 'cheer-in']);                // the player's choice wins over the device
      settings.set({ motion: 'still' });
      expect(moving()).toEqual(['still', '0s', 'none']);
      settings.set({ motion: 'gentle' });
      expect(moving()).toEqual(['gentle', '0s', 'none']);
      // Before the settings apply there is no data-motion: the device's request is the default.
      delete document.body.dataset.motion;
      const asks = matchMedia('(prefers-reduced-motion: reduce)').matches;
      expect(getComputedStyle(probe).transitionDuration).toBe(asks ? '0s' : '0.2s');
      settings.set({ motion: 'system' });
      probe.remove();
    } finally { r.cleanup(); settings.destroy(); delete document.body.dataset.motion; document.body.classList.remove('reduce-motion'); }
  });
});
