// Version 9.2 (after the release): Options > Display's Screenshot mode row had no layout of its own, so on a phone its button sat squeezed beside its note and
// wrapped to two lines ("Screenshot / mode"). It now stacks like the Export row: the button the row's full width on one line, the note under it.
import { describe, it, expect } from '../../harness.js';
import { openSheet } from '../../../src/ui/modes.js';
import { rigUI } from '../../helpers/uiWorld.js';

describe('v92 q screenshot row: Options > Display on a phone and a desktop', () => {
  for (const [width, height, scale] of [[375, 667, 100], [390, 844, 150], [1280, 800, 100]]) {
    it(`at ${width}x${height} and ${scale}% the button is one line the row's width, with its note under it`, async () => {
      const r = await rigUI({ width, height });
      try {
        if (scale !== 100) r.ui.settings.set({ textSize: scale });
        r.store.set(openSheet(r.store.get(), 'settings'));
        const row = r.root.querySelector('#sheet .options-group.display .screenshot-row');
        expect(Boolean(row)).toBe(true);
        const b = row.querySelector('.screenshot-mode').getBoundingClientRect();
        const note = row.querySelector('.screenshot-note').getBoundingClientRect();
        const box = row.getBoundingClientRect();
        expect(b.width >= box.width - 2).toBe(true);           // the row's full width, as the switches above it
        const line = parseFloat(getComputedStyle(row.querySelector('.screenshot-mode')).lineHeight) || 20;
        expect(b.height < 44 + line).toBe(true);                // one line of words: no "Screenshot / mode"
        expect(note.top >= b.bottom - 1).toBe(true);            // the note under the button, not beside it
      } finally { r.cleanup(); }
    });
  }
});
