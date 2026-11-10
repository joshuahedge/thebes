// Version 9.2 Track L (design 2.1, 2.2; rulings 1755, 1756; targets T1, T3): the raid step's frame follows the band and lights the tower; the fire step plays at 1x until the
// camera has settled; the month step counts its two months from the month it began in.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS } from '../../../src/data/lesson.js';
import { lessonWorld, lessonAt, replayTo, stepDone, stepProgress, stepFrame, stepTower, raidTarget, monthsSinceEntry, LESSON_SCRIPT } from '../../../src/sim/lesson.js';
import { LESSON_RAID_ENTRY } from '../../../src/data/lesson.js';
import { tickDay, monthIndex } from '../../../src/sim/clock.js';
import { setSpeed } from '../../../src/sim/commands.js';
import { tileToScreen } from '../../../src/render/camera.js';
import { dockCard } from '../../helpers/lesson.js';
import { pageAt, frame } from '../../v711/lessonPage.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, ms = 4000) { for (let t = 0; t < ms; t += 50) { if (fn()) return true; await wait(50); } return fn(); }
const stepIdx = (id) => LESSON_STEPS.findIndex((s) => s.id === id);
const step = (id) => LESSON_STEPS[stepIdx(id)];

describe('v92 l month: the step counts two months from its own entry (T3, ruling 1756)', () => {
  it('entered at month 4, it waits to month 6, and its chip and Ipi\'s count run from there', () => {
    const w = lessonWorld();
    const at = replayTo(w, stepIdx('workers'));
    expect(at).toBe(stepIdx('workers'));
    LESSON_SCRIPT.workers(w, { tick: () => tickDay(w), did() {} });
    setSpeed(w, 1);
    while (monthIndex(w) < 4) tickDay(w);
    expect(lessonAt(w, stepIdx('workers') + 1)).toBe(stepIdx('month'));              // entered now: the step stages its month
    expect([w.lessonMonth0, monthsSinceEntry(w), stepDone(w, step('month')), stepProgress(w, step('month'))]).toEqual([4, 0, false, { n: 0, of: 2 }]);
    while (monthIndex(w) < 5) tickDay(w);
    expect([stepDone(w, step('month')), stepProgress(w, step('month')).n]).toEqual([false, 1]);
    while (monthIndex(w) < 6) tickDay(w);
    expect([stepDone(w, step('month')), stepProgress(w, step('month')).n]).toEqual([true, 2]);
  });

  it('a later entry keeps the first month it began in (entering twice does no harm)', () => {
    const w = lessonWorld();
    replayTo(w, stepIdx('month'));
    const m0 = w.lessonMonth0;
    setSpeed(w, 1);
    while (monthIndex(w) < m0 + 1) tickDay(w);
    lessonAt(w, stepIdx('month'));
    expect(w.lessonMonth0).toBe(m0);
  });
});

describe('v92 l raid: the frame holds the band and the tower is lit (T1, design 2.1)', () => {
  it('the step\'s frame takes in the raiders once they are on the map; only the raid step has a tower ring', () => {
    const w = lessonWorld();
    replayTo(w, stepIdx('raid'));
    const raid = step('raid');
    expect(stepTower(w, step('tower'))).toBe(null);
    const tw = stepTower(w, raid);
    expect([tw.x, tw.y]).toEqual([21, 39]);
    const before = stepFrame(w, raid);
    w.raid.active = { raiders: [{ id: 1, x: 44, y: 41, hp: 3 }, { id: 2, x: 45, y: 42, hp: 3 }] };
    const after = stepFrame(w, raid);
    expect(after.x + after.w).toBeGreaterThanOrEqual(45);
    expect(after.w).toBeGreaterThan(before.w);
    w.raid.active = null;
  });

  // Fix wave (ruling 1870, B1): the band comes in by the lesson's own south entry, so the tower, the target and the band are in one frame from the arrival on a 375 px screen too.
  for (const [width, height] of [[375, 667], [390, 844], [1280, 800]]) {
    it(`at ${width}x${height} a raider is on the screen at the arrival, the tower's ring is drawn and its hole is lit, and the camera follows the band in`, async () => {
      const s = await pageAt('tower', { width, height });
      try {
        const g = s.g();
        dockCard(s.root);
        await frame();
        g.ui.placement.cancel();
        LESSON_SCRIPT.tower(g.world, s.io);
        await frame();
        for (let d = 0; d < 200 && !g.world.raid.active && !g.world.raid.last; d++) s.io.tick();
        expect(Boolean(g.world.raid.active)).toBe(true);
        await waitFor(() => !s.root.querySelector('#lesson').classList.contains('beat-on'), 4000);   // Ipi's reaction to the tower is over (it lights its own spot while it lasts)
        g.ui.refresh();
        g.ui.cameraControl.tick(1e9);
        await frame();
        const o = s.root.getBoundingClientRect(), v = g.ui.cameraControl.centre(), view = { width: v.x * 2, height: v.y * 2 };
        const inView = (px, py) => px > 0 && py > 0 && px < view.width && py < view.height;
        const raiders = g.world.raid.active.raiders.map((r) => tileToScreen(g.cam, view, r.x, r.y));
        const tower = stepTower(g.world, step('raid'));
        const [tx, ty] = tileToScreen(g.cam, view, tower.x + tower.w / 2, tower.y + tower.d / 2);
        const ring = s.root.querySelector('.lesson-ring-tower'), scrim = s.root.querySelector('.lesson-scrim');
        const rr = ring.getBoundingClientRect();
        // At every size the band, the tower and the target (the bazaar the ring is on) are on the screen at the arrival.
        const target = g.world.buildings[g.world.raid.active.targetId] || raidTarget(g.world).building;
        const [bx, by] = tileToScreen(g.cam, view, target.x + target.w / 2, target.y + target.d / 2);
        expect([raiders.every(([x, y]) => inView(x, y)), inView(tx, ty), inView(bx, by), ring.hidden, scrim.classList.contains('two'), rr.width > 0]).toEqual([true, true, true, false, true, true]);
        expect([g.world.raid.active.entry.x, g.world.raid.active.entry.y, g.world.raid.active.dir]).toEqual([LESSON_RAID_ENTRY.x, LESSON_RAID_ENTRY.y, 'south']);
        // the camera follows: after the band has marched on, the frame has moved with it
        const meanTo = (rs) => rs.reduce((a, r) => a + Math.hypot(r.x - target.x, r.y - target.y), 0) / rs.length;
        const first = meanTo(g.world.raid.active.raiders);
        for (let d = 0; d < 6 && g.world.raid.active; d++) s.io.tick();
        g.ui.cameraControl.tick(1e9);
        await frame();
        if (g.world.raid.active) {
          const rs = g.world.raid.active.raiders;
          expect(meanTo(rs)).toBeLessThan(first);
          expect(rs.some((r) => { const [x, y] = tileToScreen(g.cam, view, r.x, r.y); return inView(x, y); })).toBe(true);
          const [ux, uy] = tileToScreen(g.cam, view, tower.x + tower.w / 2, tower.y + tower.d / 2);
          expect(inView(ux, uy)).toBe(true);   // the tower stays in the frame as the band closes in
        }
        // the lesson's lock (rulings 1200, 1204): the tower fights and the step ends: the raid is over and the step is done, never waiting
        for (let d = 0; d < 400 && g.world.raid.active; d++) s.io.tick();
        expect([Boolean(g.world.raid.active), Boolean(g.world.raid.last), stepDone(g.world, step('raid'))]).toEqual([false, true, true]);
        void o;
      } finally { s.cleanup(); }
    });
  }
});

describe('v92 l row: the count is not clipped with the words (M12)', () => {
  it('the "n of m" chip comes before the step\'s words inside the row\'s clamped body, so a phone\'s three-line cut takes words and never the count', async () => {
    const s = await pageAt('road', { width: 390, height: 844 });
    try {
      dockCard(s.root);
      await frame();
      const kids = [...s.root.querySelector('#lesson .body').children].map((n) => n.className.split(' ')[0]);
      expect(kids.indexOf('chip')).toBeGreaterThan(-1);
      expect(kids.indexOf('chip')).toBeLessThan(kids.indexOf('text'));
    } finally { s.cleanup(); }
  });
});

describe('v92 l fire: the step plays at 1x until the camera has settled (design 2.1)', () => {
  it('a 3x game is cut to 1x as the fire step begins and goes back to 3x once the glide has ended', async () => {
    const s = await pageAt('firehouse', { width: 390, height: 844 });
    try {
      const g = s.g();
      dockCard(s.root);
      await frame();
      g.ui.placement.cancel();
      LESSON_SCRIPT.firehouse(g.world, { tick: () => tickDay(g.world), did() {} });   // the firehouse stands and is crewed; the fire step is entered at the next look
      g.ui.speedControl.set(3);
      g.ui.refresh();
      expect(g.world.tally.fires).toBeGreaterThanOrEqual(1);
      expect(g.world.speed).toBe(1);                                                   // held while the camera glides
      g.ui.cameraControl.tick(1e9);
      await frame(); await frame();
      expect([g.world.speed, g.ui.cameraControl.animating]).toEqual([3, false]);
    } finally { s.cleanup(); }
  });
});
