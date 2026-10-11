import { describe, it, expect } from '../harness.js';
import { rigUI, uiWorld } from '../helpers/uiWorld.js';
import { FIRSTS } from '../../src/data/firsts.js';
import { firstMet } from '../../src/sim/firsts.js';
import { openSheet } from '../../src/ui/modes.js';
import { setGuide } from '../../src/sim/commands.js';
import { guideActive } from '../../src/sim/goals.js';
import { achievementProgress } from '../../src/sim/achievements.js';
import { ACHIEVEMENTS } from '../../src/data/achievements.js';
import { T, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, achievementsHeading, progressText } from '../../src/ui/text.js';

const rowOf = (r, id) => r.root.querySelector(`#sheet .achievement[data-id="${id}"]`);
const lastHeading = (r) => r.root.querySelector('#sheet .body').lastElementChild.previousElementSibling.textContent;

describe('ui achievements sheet', () => {
  it('marks a migrated city\'s firsts and achievements silently when the interface is built, before Welcome back reads them', async () => {
    const world = uiWorld();
    world.firsts = null;                                                         // as MIGRATIONS[1] leaves a version 1 city
    world.achievements = null;
    world.guide.on = false;                                                      // an old city: no guide
    const gold = world.gold;
    const r = await rigUI({ world, welcome: { savedAt: Date.now() - 60000, lastSpeed: 1 } });
    try {
      const met = ACHIEVEMENTS.filter((a) => { const p = achievementProgress(world, a); return p.n >= p.of; }).map((a) => a.id);
      expect(met.length).toBeGreaterThan(0);                                     // the test city already meets some
      expect(world.achievements).toEqual(met);
      expect(world.firsts).toEqual(FIRSTS.filter((f) => firstMet(world, f)).map((f) => f.id));
      expect(world.gold).toBe(gold);                                             // silently: no gold
      expect(r.ui.celebrations.pending()).toBe(0);                               // and no captions
      expect(r.root.querySelectorAll('#cheer .cheer').length).toBe(0);
      expect(r.store.get().sheet.kind).toBe('welcome');
      const closest = r.root.querySelector('#sheet .closest');                    // Welcome back names an unmet one, not a met one
      if (closest) for (const id of met) expect(closest.textContent.includes(`${ACHIEVEMENT_NAMES[id]},`)).toBe(false);
      r.store.set(openSheet(r.store.get(), 'summary'));
      expect(lastHeading(r)).toBe(achievementsHeading(met.length, ACHIEVEMENTS.length));
      for (const id of met) expect(rowOf(r, id).classList.contains('done')).toBe(true);
    } finally { r.cleanup(); }
  });
  it('shows Not yet for any achievement out of 1, whatever its kind, and a count for the rest', async () => {
    const extra = { id: 'test_one_well', measure: { kind: 'buildings', type: 'well', n: 1 } };   // a kind that is usually counted, out of 1
    const r = await rigUI();
    try {
      setGuide(r.world, false);
      r.world.achievements = [];
      for (const b of Object.values(r.world.buildings)) if (b.type === 'well') delete r.world.buildings[b.id];
      ACHIEVEMENTS.push(extra);
      r.store.set(openSheet(r.store.get(), 'summary'));
      for (const a of ACHIEVEMENTS) {
        const row = rowOf(r, a.id);
        const outOfOne = achievementProgress(r.world, a).of === 1;
        expect([a.id, row.querySelector('.status').textContent === T.notYetMet, row.querySelector('[role="progressbar"]') === null]).toEqual([a.id, outOfOne, outOfOne]);
      }
      expect(rowOf(r, extra.id).querySelector('.status').textContent).toBe(T.notYetMet);
    } finally {
      const i = ACHIEVEMENTS.indexOf(extra);
      if (i >= 0) ACHIEVEMENTS.splice(i, 1);
      r.cleanup();
    }
  });
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
      const counted = ACHIEVEMENTS.filter((a) => !['fedAll', 'waterAll', 'jobs'].includes(a.measure.kind) && a.measure.n > 1);   // a count of one (an Estate) reads as yes or no
      expect(counted.length).toBe(ACHIEVEMENTS.length - 5);                 // and Stage 3's safe streets, a yes or no
      for (const a of counted) {
        const p = achievementProgress(r.world, a);
        const row = rowOf(r, a.id);
        const bar = row.querySelector('[role="progressbar"]');
        expect([bar.getAttribute('aria-valuemin'), bar.getAttribute('aria-valuenow'), bar.getAttribute('aria-valuemax')]).toEqual(['0', String(p.n), String(p.of)]);
        expect(bar.getAttribute('aria-label')).toBe(`${ACHIEVEMENT_NAMES[a.id]}: ${progressText(p.n, p.of)}`);
        expect(row.textContent).toContain(progressText(p.n, p.of));                    // the words, beside the bar
        expect(row.textContent).toContain(ACHIEVEMENT_TEXT[a.id]);
      }
      expect(r.root.querySelectorAll('#sheet .achievements [role="progressbar"]').length).toBe(counted.length);   // the score's part bars are not achievements
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
