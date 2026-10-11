import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { openSheet } from '../../src/ui/modes.js';
import { setGuide } from '../../src/sim/commands.js';
import { guideActive } from '../../src/sim/goals.js';
import { achievementProgress } from '../../src/sim/achievements.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { T, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, achievementsHeading, progressText } from '../../src/ui/text.js';

const rowOf = (r, id) => r.root.querySelector(`#sheet .achievement[data-id="${id}"]`);
const lastHeading = (r) => r.root.querySelector('#sheet .body').lastElementChild.previousElementSibling.textContent;

describe('ui achievements sheet', () => {
  it('ends the city summary with every achievement, its exact condition and its progress', async () => {
    const r = await rigUI();
    try {
      setGuide(r.world, false);
      r.world.achievements = [];
      r.store.set(openSheet(r.store.get(), 'summary'));
      const body = r.root.querySelector('#sheet .body');
      expect(body.lastElementChild.classList.contains('achievements')).toBe(true);   // the last section
      expect(lastHeading(r)).toBe(achievementsHeading(0, ACHIEVEMENTS.length));
      expect(achievementsHeading(5, 24)).toBe('Achievements, 5 of 24');
      expect(body.querySelectorAll('.achievement').length).toBe(ACHIEVEMENTS.length);
      const neighbours = rowOf(r, 'neighbours');
      expect(neighbours.textContent).toContain(ACHIEVEMENT_NAMES.neighbours);
      expect(neighbours.textContent).toContain('Have 10 homes');
      expect(neighbours.textContent).toContain('2 of 10');                             // the test city's two huts
      const bar = neighbours.querySelector('[role="progressbar"]');
      expect([bar.getAttribute('aria-valuemin'), bar.getAttribute('aria-valuenow'), bar.getAttribute('aria-valuemax')]).toEqual(['0', '2', '10']);
      expect(bar.getAttribute('aria-label')).toBe(`${ACHIEVEMENT_NAMES.neighbours}: 2 of 10`);
      expect(bar.querySelector('.fill').style.width).toBe('20%');
      expect(rowOf(r, 'street').textContent).toContain(ACHIEVEMENT_TEXT.street);
      r.world.achievements = ['way_in'];
      r.ui.refresh();
      expect(lastHeading(r)).toBe(achievementsHeading(1, ACHIEVEMENTS.length));
      const wayIn = rowOf(r, 'way_in');
      expect(wayIn.classList.contains('done')).toBe(true);
      expect(wayIn.textContent).toContain(T.done);
      expect(wayIn.querySelector('[role="progressbar"]')).toBe(null);
    } finally { r.cleanup(); }
  });
  it('gives every counted achievement a named progress bar and the same count in words, so colour never carries it alone', async () => {
    const r = await rigUI();
    try {
      setGuide(r.world, false);
      r.world.achievements = [];
      r.store.set(openSheet(r.store.get(), 'summary'));
      const counted = ACHIEVEMENTS.filter((a) => !['fedAll', 'waterAll', 'jobs'].includes(a.measure.kind));
      expect(counted.length).toBe(ACHIEVEMENTS.length - 3);
      for (const a of counted) {
        const p = achievementProgress(r.world, a);
        const row = rowOf(r, a.id);
        const bar = row.querySelector('[role="progressbar"]');
        expect([bar.getAttribute('aria-valuemin'), bar.getAttribute('aria-valuenow'), bar.getAttribute('aria-valuemax')]).toEqual(['0', String(p.n), String(p.of)]);
        expect(bar.getAttribute('aria-label')).toBe(`${ACHIEVEMENT_NAMES[a.id]}: ${progressText(p.n, p.of)}`);
        expect(row.textContent).toContain(progressText(p.n, p.of));                    // the words, beside the bar
        expect(row.textContent).toContain(ACHIEVEMENT_TEXT[a.id]);
      }
      expect(r.root.querySelectorAll('#sheet [role="progressbar"]').length).toBe(counted.length);
    } finally { r.cleanup(); }
  });
  it('keeps achievements out of sight while the guide runs', async () => {
    const r = await rigUI();
    try {
      setGuide(r.world, true);
      expect(guideActive(r.world)).toBe(true);
      r.store.set(openSheet(r.store.get(), 'summary'));
      const sheet = r.root.querySelector('#sheet');
      expect(sheet.textContent).toContain(T.achievementsLater);
      expect(sheet.querySelectorAll('.achievement').length).toBe(0);
    } finally { r.cleanup(); }
  });
  it('shows Not yet, not a bar, for achievements that are met or not', async () => {
    const r = await rigUI();
    try {
      setGuide(r.world, false);
      r.world.achievements = [];
      r.store.set(openSheet(r.store.get(), 'summary'));
      for (const id of ['no_one_hungry', 'water_for_all', 'busy_hands']) {
        const row = rowOf(r, id);
        expect(row.textContent).toContain(T.notYetMet);
        expect(row.querySelector('[role="progressbar"]')).toBe(null);
      }
    } finally { r.cleanup(); }
  });
});
