// Version 8.2, Track L (rulings 1320-1323): whatever a lesson step lights (the ring on the map, the camera, a control's ring), the step's own words name. Josh's playtest of 8.1: "Why is the market
// highlighted during the raid scenario?" The raid step's ring was on the bazaar, which the raiders aim at, and its words never said so. The raid step now lights the building the warned raid is
// after and says it, from the sim's own warning; the camera frames it with the towers and the side the raiders come from; and one test walks every step so no step can point at something unnamed.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { lessonWorld, replayTo, stepSpot, stepFrame, raidTarget, RAID_FRAME_REACH, firstOf } from '../../../src/sim/lesson.js';
import { setSpeed } from '../../../src/sim/commands.js';
import { tickDay } from '../../../src/sim/clock.js';
import { allBuildings } from '../../../src/sim/world.js';
import { lessonFacts } from '../../../src/ui/lesson.js';
import { V81T_TEXT } from '../../../src/ui/v81/lessonText.js';
import { buildingName } from '../../../src/ui/text.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { addRaw } from '../../helpers/testWorld.js';
import { dockCard } from '../../helpers/lesson.js';
import { pageAt, frame } from '../../v711/lessonPage.js';

const index = (id) => LESSON_STEPS.findIndex((s) => s.id === id);
const atStep = (id) => { const w = lessonWorld(); replayTo(w, index(id)); return w; };
const stepOf = (id) => LESSON_STEPS[index(id)];
const sentences = (s) => s.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);

// What the words must say for each thing a step can point at: any one of the words (lower case) in the step's why or do. A step pointing at something not listed here fails the walk below, so a
// new step must say what it lights.
const TARGET_WORDS = {
  road: ['road'], house: ['plot', 'home'], large_plot: ['large plot'], well: ['well'], farm_grain: ['farm'], granary: ['granary'], bazaar: ['bazaar'], firehouse: ['firehouse'], tower: ['tower'],
  '#topbar .speed-bar': ['play', 'time'], '#topbar .stat.gold': ['gold'],
};
// The thing a step points at: its control (dom), the building its ring is on (at.of; for the raid the building the sim says the raid is after), or the card it opens (show.item, for a footprint).
function targetOf(world, step) {
  if (step.dom) return step.dom;
  if (step.at && step.at.of === 'raidTarget') { const t = raidTarget(world); return t.building ? t.building.type : t.kind; }
  if (step.at && step.at.of) return step.at.of;
  return step.show ? step.show.item : null;
}
const sayOf = (id, f) => { const x = V81T_TEXT.steps[id](f); return `${x.why} ${x.do}`.toLowerCase(); };

describe('v82 l targets: every step names what it lights', () => {
  it('walks every step: wherever its ring, camera or control points, its why or do says what it is (paused and playing)', () => {
    const wrong = [], unknown = [];
    for (const step of LESSON_STEPS) {
      if (!step.at && !step.dom) continue;
      const w = atStep(step.id), target = targetOf(w, step);
      const words = TARGET_WORDS[target];
      if (!words) { unknown.push(`${step.id}: ${target}`); continue; }
      for (const speed of [0, 1]) {
        setSpeed(w, speed);
        const line = sayOf(step.id, lessonFacts(w, step));
        if (!words.some((x) => line.includes(x))) wrong.push(`${step.id} @${speed} (${target}): ${line}`);
      }
    }
    expect([unknown, wrong]).toEqual([[], []]);
  });

  it('the raid step lights the bazaar the warning names and says so, with the time the sim gives', () => {
    const w = atStep('raid');
    expect(w.raid.warning && w.raid.warning.target).toBe('bazaar');
    const step = stepOf('raid'), bazaar = firstOf(w, 'bazaar');
    expect(stepSpot(w, step)).toEqual({ x: bazaar.x, y: bazaar.y, w: bazaar.w, d: bazaar.d });
    setSpeed(w, 1);
    const f = lessonFacts(w, step), words = V81T_TEXT.steps.raid(f);
    expect(f.target).toBe('bazaar');
    expect(words.why).toBe('The raiders are making for your bazaar, the first place they strike.');
    const left = w.raid.warning.arrives - w.day;
    expect(words.do.startsWith('They arrive in ')).toBe(true);
    expect([words.do.includes('tower'), sentences(words.why).length, sentences(words.do).length]).toEqual([true, 1, 1]);
    expect(left).toBeGreaterThan(0);
  });

  it('follows the warning\'s own target when it is not the bazaar: the ring and the words both move to it', () => {
    const w = atStep('raid');
    const post = addRaw(w, 'storehouse', 30, 30);
    w.raid.warning.target = 'storehouse';
    const step = stepOf('raid'), spot = stepSpot(w, step);
    expect(spot).toEqual({ x: post.x, y: post.y, w: post.w, d: post.d });
    setSpeed(w, 1);
    const words = V81T_TEXT.steps.raid(lessonFacts(w, step));
    expect([words.why, words.do.includes('bazaar')]).toEqual([`The raiders are making for your ${buildingName('storehouse').toLowerCase()}, the first place they strike.`, false]);
    expect(V81T_TEXT.steps.tower(lessonFacts(w, stepOf('tower'))).do).toContain(`near the ${buildingName('storehouse').toLowerCase()}`);
    // and the audit's own rule holds for it
    expect(targetOf(w, step)).toBe('storehouse');
  });

  it('says it again once the raiders are on the map, and says whether a staffed tower stands in their way', () => {
    const w = atStep('raid');
    setSpeed(w, 1);
    const noTower = { ...lessonFacts(w, stepOf('raid')), towers: 0 };
    expect(/^They arrive in .+; no staffed tower stands in their way\.$/.test(V81T_TEXT.steps.raid(noTower).do)).toBe(true);
    let on = false;
    for (let d = 0; d < 140 && !on; d++) { tickDay(w); on = Boolean(w.raid.active && w.raid.active.raiders && w.raid.active.raiders.length); }
    expect(on).toBe(true);
    const f = lessonFacts(w, stepOf('raid')), words = V81T_TEXT.steps.raid(f);
    expect([f.raidOn.left > 0, words.why.includes('on the map'), words.why.includes('your bazaar')]).toEqual([true, true, true]);
  });
});

describe('v82 l targets: the raid step\'s camera frames the target, the towers and the raiders\' side', () => {
  it('the frame holds the target, every tower and a point towards the entry (at most the reach away), and the target\'s own spot is inside it', () => {
    const w = atStep('raid');
    const step = stepOf('raid'), spot = stepSpot(w, step), fr = stepFrame(w, step), t = raidTarget(w);
    const inside = (x, y) => x >= fr.x - 1e-6 && x <= fr.x + fr.w + 1e-6 && y >= fr.y - 1e-6 && y <= fr.y + fr.d + 1e-6;
    expect([inside(spot.x, spot.y), inside(spot.x + spot.w, spot.y + spot.d)]).toEqual([true, true]);
    const towers = allBuildings(w).filter((b) => b.type === 'tower');
    expect(towers.length).toBeGreaterThan(0);
    for (const b of towers) expect([b.id, inside(b.x, b.y), inside(b.x + b.w, b.y + b.d)]).toEqual([b.id, true, true]);
    const cx = spot.x + spot.w / 2, cy = spot.y + spot.d / 2, dx = t.entry.x - cx, dy = t.entry.y - cy, len = Math.hypot(dx, dy), k = Math.min(RAID_FRAME_REACH, len) / len;
    expect(inside(cx + dx * k, cy + dy * k)).toBe(true);
    expect(stepFrame(w, stepOf('fire'))).toBe(null);                                         // every other step frames its own spot
  });

  for (const [width, height] of [[1280, 800], [390, 844]]) {
    it(`at ${width}x${height} the ring and the tower are both on the screen when the step begins`, async () => {
      const s = await pageAt('raid', { width, height });
      try {
        dockCard(s.root);                                                                    // the step's card is down: the ring shows
        await frame(); await frame();
        const g = s.g(), v = { width, height };
        const ring = s.root.querySelector('.lesson-ring').getBoundingClientRect(), root = s.root.getBoundingClientRect();
        const spot = stepSpot(g.world, stepOf('raid'));
        const on = (x, y) => x >= 0 && x <= width && y >= 0 && y <= height;
        const [bx, by] = tileToScreen(g.cam, v, spot.x + spot.w / 2, spot.y + spot.d / 2);
        expect([ring.width > 0, on(bx, by), on((ring.left + ring.right) / 2 - root.left, (ring.top + ring.bottom) / 2 - root.top)]).toEqual([true, true, true]);
        for (const b of allBuildings(g.world).filter((x) => x.type === 'tower')) {
          const [tx, ty] = tileToScreen(g.cam, v, b.x + b.w / 2, b.y + b.d / 2);
          expect([b.id, on(tx, ty)]).toEqual([b.id, true]);
        }
      } finally { s.cleanup(); }
    });
  }
});
