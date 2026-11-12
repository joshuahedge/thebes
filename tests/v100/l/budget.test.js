// Version 10.0, Track L (spec 5 "The budget", Q1, ruling 2251): life's layer within the LIFE budget, 1.5 ms a frame on a desktop and 1 ms on a phone, on the
// stress city (64) and the Huge map (the stress city on 112) at 1280x800 and at 390x844 DPR 2, every source on (the morning's crowds and townsfolk, and
// the night's doors and hearths in a second run). Each source's time is what the life seam itself measures (createLife's spend);
// the numbers print as a test's name (the harness prints names only, ruling 2104).
import { describe, it, expect } from '../../harness.js';
import { createLife } from '../../../src/render/v100/life.js';
import { townsfolkSource } from '../../../src/render/v100/townsfolk.js';
import { crowdSource } from '../../../src/render/v100/crowd.js';
import { riverSource } from '../../../src/render/v100/riverLife.js';
import { buildersSource } from '../../../src/render/v100/builders.js';
import { nightSource } from '../../../src/render/v100/night.js';
import { drawLight, setLightClock } from '../../../src/render/light.js';
import { LIFE } from '../../../src/data/ambient.js';
import { LIGHT } from '../../../src/data/seasons.js';
import { createCamera, visibleTileRange, artToScreen } from '../../../src/render/camera.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART_SCALE } from '../../../src/render/iso.js';
import { stressWorld } from '../../v60/b2/measure.js';
import { makeCanvas } from '../../helpers/canvas.js';

const FRAMES = 90;
const r2 = (v) => Math.round(v * 100) / 100;
let worlds = null;
const worldOf = (size) => { worlds = worlds || {}; if (!worlds[size]) worlds[size] = stressWorld(size); return worlds[size]; };

// LIFE ms a frame (the mean over FRAMES, after 10 to warm the caches) for a world at a size, at the morning or at night.
export function lifeMs(world, { width, height, dpr, kind, night = false }) {
  const view = { width, height }, cam = createCamera(world.size);
  cam.x = world.size / 2; cam.y = world.size / 2; cam.zoom = 1;
  const range = visibleTileRange(cam, view, world.size);
  const c = makeCanvas(width * dpr, height * dpr), ctx = c.getContext('2d');
  const [ox, oy] = artToScreen(cam, view, 0, 0);
  const g = makeDraw(ctx, ART_SCALE * cam.zoom * dpr, ART_SCALE * cam.zoom);
  let frame = 0;
  const life = createLife({ deviceKind: kind, level: () => 'full', now: () => frame });
  for (const s of [townsfolkSource({ deviceKind: kind }), buildersSource(), crowdSource(), riverSource(), nightSource({ deviceKind: kind })]) life.addSource(s);
  setLightClock(world, night ? LIGHT.cycleMs * (LIGHT.day + LIGHT.dusk + LIGHT.night / 2) : LIGHT.cycleMs * LIGHT.day * 0.1);
  ctx.setTransform(1, 0, 0, 1, ox * dpr, oy * dpr);
  drawLight(g, world, range, { ctx, W: c.width, H: c.height, ox: ox * dpr, oy: oy * dpr, dpr }, 0, 'full', null);   // the light the frame shows (lightShown), for the night's doors
  let spent = 0;
  for (let i = 0; i < FRAMES + 10; i++) {
    frame = i + 1;
    const before = life.stats().spentBy, now = 6000 + i * 16;
    life.walkers(world, world.day + i * 0.016, now, range, 'full');
    ctx.setTransform(1, 0, 0, 1, ox * dpr, oy * dpr);
    life.late(g, world, range, now, 'full');
    const after = life.stats().spentBy;
    if (i >= 10) for (const k of Object.keys(after)) spent += after[k] - (before[k] || 0);
  }
  setLightClock(world, 0);
  return spent / FRAMES;
}

const SIZES = [
  { name: '64 at 1280x800', size: 64, width: 1280, height: 800, dpr: 1, kind: 'desktop' },
  { name: '64 at 390x844 DPR 2', size: 64, width: 390, height: 844, dpr: 2, kind: 'phone' },
  { name: '112 at 1280x800', size: 112, width: 1280, height: 800, dpr: 1, kind: 'desktop' },
  { name: '112 at 390x844 DPR 2', size: 112, width: 390, height: 844, dpr: 2, kind: 'phone' },
];

describe('v100 l budget: life within the LIFE budget', () => {
  for (const s of SIZES) {
    it(`stays within ${LIFE.budgetMs[s.kind]} ms a frame on ${s.name}, by day and at night`, () => {
      const w = worldOf(s.size);
      const day = lifeMs(w, s), night = lifeMs(w, { ...s, night: true });
      it(`v100 l budget > measured: ${s.name}: day ${r2(day)} ms, night ${r2(night)} ms (budget ${LIFE.budgetMs[s.kind]})`, () => {});   // the numbers, as a test's name (ruling 2104)
      expect([s.name, day <= LIFE.budgetMs[s.kind], night <= LIFE.budgetMs[s.kind]]).toEqual([s.name, true, true]);
    });
  }
});
