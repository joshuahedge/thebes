import { describe, it, expect } from '../../harness.js';
import { updateMood } from '../../../src/sim/mood.js';
import { openSheet } from '../../../src/ui/modes.js';
import { MOOD_NAMES, FIRE_TEXT } from '../../../src/ui/text.js';
import { addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';

describe('s3 fire words on screen', () => {
  it('lists a burning building\'s alert on its sheet, and the summary\'s fire mood rows with the sim\'s numbers', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      const w = r.world;
      w.milestone = 'town';
      const potter = addRaw(w, 'potter', 18, 11, { fire: { stage: 'fire', days: 3, left: 9 } });   // on the road; the city has no firehouse
      r.ui.refresh();
      r.store.set(openSheet(r.store.get(), 'info', potter.id));
      const sheet = r.root.querySelector('#sheet').textContent;
      expect(sheet).toContain(FIRE_TEXT.burning('Potter', 9));
      expect(sheet).toContain(FIRE_TEXT.cause.none);
      w.day = 300;
      w.danger.lastFireDay = 290;
      w.danger.burnDays.push(200, 250);
      updateMood(w);
      r.store.set(openSheet(r.store.get(), 'summary'));
      const rows = [...r.root.querySelectorAll('#sheet .row')].map((x) => x.textContent);
      expect(rows).toContain(`${MOOD_NAMES.fire}-4`);
      expect(rows).toContain(`${MOOD_NAMES.burned}-4`);
    } finally { r.cleanup(); }
  });
});
