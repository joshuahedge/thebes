// Stage 3, Track F, task F0: the loose ends found when the five tracks met (controller ruling 13 and Track D's D2 concern).
import { describe, it, expect } from '../../harness.js';
import { rigUI, uiWorld } from '../../helpers/uiWorld.js';
import { mount } from '../../helpers/dom.js';
import { setGuide } from '../../../src/sim/commands.js';
import { openSheet } from '../../../src/ui/modes.js';
import { createCelebrations } from '../../../src/ui/celebrate.js';
import { CHEER_MS } from '../../../src/data/ui.js';
import { ACHIEVEMENTS } from '../../../src/data/achievements.js';
import { achievementsFor } from '../../../src/sim/achievements.js';
import { ACHIEVEMENT_NAMES, achievementsHeading } from '../../../src/ui/text.js';

const rowOf = (r, id) => r.root.querySelector(`#sheet .achievement[data-id="${id}"]`);

async function summaryOf(difficulty) {
  const world = uiWorld();
  world.difficulty = difficulty;
  const r = await rigUI({ world });
  setGuide(r.world, false);
  r.world.achievements = [];
  r.store.set(openSheet(r.store.get(), 'summary'));
  return r;
}

describe('s3 balance integration', () => {
  it('shows a Peaceful city only the achievements it can earn, and a Normal city all of them', async () => {
    const calm = await summaryOf('peaceful');
    try {
      const rows = [...calm.root.querySelectorAll('#sheet .achievement')].map((li) => li.dataset.id);
      expect(rows).toEqual(achievementsFor(calm.world).map((a) => a.id));
      expect(rowOf(calm, 'raid_breaker')).toBe(null);
      expect(rows.length).toBeLessThan(ACHIEVEMENTS.length);
      expect(calm.root.querySelector('#sheet .body').textContent.includes(ACHIEVEMENT_NAMES.raid_breaker)).toBe(false);
      expect(calm.root.querySelector('#sheet .body').textContent.includes(achievementsHeading(0, rows.length))).toBe(true);
    } finally { calm.cleanup(); }
    const normal = await summaryOf('normal');
    try {
      expect(rowOf(normal, 'raid_breaker') !== null).toBe(true);
      expect(normal.root.querySelectorAll('#sheet .achievement').length).toBe(ACHIEVEMENTS.length);
      expect(normal.root.querySelector('#sheet .body').textContent.includes(achievementsHeading(0, ACHIEVEMENTS.length))).toBe(true);
    } finally { normal.cleanup(); }
  });

  it('keeps an info caption up for CHEER_MS.info, at least 5 seconds', () => {
    const { root, cleanup } = mount();
    try {
      let t = 0;
      const timers = [];
      const cheers = createCelebrations({ container: root, setTimer: (fn, ms) => { timers.push({ fn, at: t + ms }); return timers.length; }, clearTimer: () => {} });
      const advance = (ms) => { t += ms; for (const x of timers) if (!x.done && x.at <= t) { x.done = true; x.fn(); } };
      expect(CHEER_MS.info >= 5000).toBe(true);
      expect(CHEER_MS.info >= Math.max(CHEER_MS.first, CHEER_MS.milestone)).toBe(true);
      cheers.show({ tier: 'info', text: 'Raid from the east beaten: 2 towers stopped 9 of 12, soldiers stopped 3; 1 building burned, 40 gold stolen.' });
      advance(CHEER_MS.info - 1);
      expect(root.querySelectorAll('.cheer.info').length).toBe(1);
      advance(1);
      expect(root.querySelectorAll('.cheer.info').length).toBe(0);
    } finally { cleanup(); }
  });
});
