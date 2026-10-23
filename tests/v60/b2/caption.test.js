// Version 6.0.1: the raid's result row takes down only the report's own caption (src/ui/v60/battle.js dropReportCaption, src/ui/celebrate.js drop), whether
// it is on screen or still waiting, and never another caption: 6.0 emptied the whole caption queue, and only when the report's caption was the one showing.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { footMix } from '../../../src/data/armies.js';
import { DANGER_UI_TEXT } from '../../../src/ui/text.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const LOST = { index: 2, dir: 'east', size: 9, mix: footMix(9), won: false, byTowers: 2, bySoldiers: 0, towers: 1, burned: 1, burnedKinds: ['potter'], stolen: 40, day: 100, fires: [] };
const OTHER = 'The potter has its first clay.';
const shownCaption = (rig) => { const n = rig.root.querySelector('#cheer .cheer .text'); return n ? n.textContent.trim() : null; };
const resultUp = (rig) => Boolean(rig.root.querySelector('#banner .moment'));

describe('v60 b2 the result row takes down the report caption alone', () => {
  it('takes down the report caption on screen, and the caption waiting behind it shows', async () => {
    const rig = await rigUI({ width: 1280, height: 800 });
    try {
      const words = DANGER_UI_TEXT.raidReport(LOST);
      rig.ui.celebrations.show({ tier: 'info', text: words });         // the report's caption, on screen
      rig.ui.celebrations.show({ tier: 'info', text: OTHER });         // another caption, waiting behind it
      expect([shownCaption(rig), rig.ui.celebrations.pending()]).toEqual([words, 1]);
      rig.ui.onEvents([{ type: 'raid_end', won: false, report: LOST }]);   // the danger interface adds the report's caption again; the result goes up
      await tick();
      expect([resultUp(rig), shownCaption(rig), rig.ui.celebrations.pending()]).toEqual([true, OTHER, 0]);
    } finally { rig.cleanup(); }
  });
  it('takes down a report caption still waiting behind another caption, and leaves the one on screen with its timers', async () => {
    const rig = await rigUI({ width: 1280, height: 800 });
    try {
      rig.ui.celebrations.show({ tier: 'info', text: OTHER });         // on screen first
      rig.ui.onEvents([{ type: 'raid_end', won: false, report: LOST }]);   // the report's caption waits behind it
      await tick();
      expect([resultUp(rig), shownCaption(rig), rig.ui.celebrations.pending()]).toEqual([true, OTHER, 0]);
      expect(rig.ui.celebrations.recent().some((c) => c.text === DANGER_UI_TEXT.raidReport(LOST))).toBe(true);   // Recent still has it
    } finally { rig.cleanup(); }
  });
});
