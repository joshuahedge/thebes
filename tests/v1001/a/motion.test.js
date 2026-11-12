// Version 10.0.1, Track A (the motion; rulings 2375-2389): a steady walk for raiders and soldiers (A.1), walking animals, take-offs, flicks, sways and
// slides (A.2), all baked once (A.3).
import { describe, it, expect } from '../../harness.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { riverWorld } from '../../stage46/river/riverHelpers.js';
import { unitsAt, UNIT_ID_BASE, GLIDE_DAYS } from '../../../src/render/units.js';
import { herdAnimals, animalsAt, hopAt, HOP, GRAZE } from '../../../src/render/wildlife.js';
import { riverLifeAt, RIVER, HERON_FLAP_MS, CROC_SWAY_MS, HIPPO_FLICK_MS, HIPPO_FLICK_HOLD_MS } from '../../../src/render/v100/riverLife.js';
import { riverRows, FLAP_FRAMES, BIRD_FLAP_MS } from '../../../src/render/ambient.js';
import { WALK_CYCLE, RIVER_ART, RIVER_ART_PARTS, ibis } from '../../../src/render/art/river.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART } from '../../../src/render/art/registry.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { createSpriteCache } from '../../../src/render/spriteCache.js';
import { T } from '../../../src/sim/terrain.js';
import { LIFE } from '../../../src/data/ambient.js';
import { sampleCity, copyWorld, DAY } from '../../v100/l/helpers.js';

const RIVER_ONE_MINUTE = RIVER.hippoEveryMs;
const bakes = (kind) => typeof (ART[`fig.${kind}`] && ART[`fig.${kind}`].draw) === 'function';

// A raid with one raider the test moves by hand.
function raidWorld(x, y) {
  const w = makeTestWorld({ fertile: [] });
  w.raid.active = {
    index: 0, entry: { x: 31, y: 10 }, dir: 'east', size: 1, target: 'storehouse', day: 0, phase: 'attack', targetId: null,
    struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [], raiders: [{ id: 1, x, y, hp: 10, hit: false }],
  };
  return w;
}

describe('v1001 a steady walk (A.1, ruling 2375)', () => {
  it('glides across the whole day: a raider that steps every day advances at every sample, never standing, at the pace of its step length', () => {
    expect(GLIDE_DAYS).toBe(1);
    const w = raidWorld(10, 10), r = w.raid.active.raiders[0];
    const xs = [], stands = [];
    const steps = [1.5, 1.5, 1.5, 1.5, 1, 2, 1.5];                                    // Track S's 1.5 a day (and a day of a whole step either side)
    for (let day = 5; day < 5 + steps.length; day++) {
      if (day > 5) r.x += steps[day - 5];
      for (let k = 0; k < 20; k++) {
        const u = unitsAt(w, day + k / 20, null, { now: 0, motion: 'full' })[0];
        if (day > 5) { xs.push(u.x); stands.push(Boolean(u.stand)); }
      }
    }
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1] - 1e-9);   // monotone
    expect(stands.some(Boolean)).toBe(false);                                           // no 40% stand between steps
    let flat = 0;
    for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - xs[i - 1]) < 1e-9) flat++;
    expect(flat).toBe(0);                                                               // not one flat sample while the sim keeps stepping
    // within one 1.5-tile day the 20 samples are evenly spaced: the interpolation covers the step's real duration
    const day9 = xs.slice(xs.length - 20);
    const gaps = day9.slice(1).map((v, i) => v - day9[i]);
    for (const g of gaps) expect(Math.abs(g - 1.5 / 20)).toBeLessThan(1e-6);
  });
  it('stands only when the sim has not moved it: a looting raider stands from the day after its last step', () => {
    const w = raidWorld(10, 10), r = w.raid.active.raiders[0];
    unitsAt(w, 4.5, null, { now: 0, motion: 'full' });
    r.x = 11;
    expect(unitsAt(w, 5.2, null, { now: 0, motion: 'full' })[0].stand).toBe(undefined);   // walking
    expect(unitsAt(w, 5.9, null, { now: 0, motion: 'full' })[0].stand).toBe(undefined);
    for (const t of [6.05, 6.5, 7.2, 8]) expect(unitsAt(w, t, null, { now: 0, motion: 'full' })[0].stand).toBe(true);   // looting: no new step
    expect(unitsAt(w, 8, null, { now: 0, motion: 'full' })[0].x).toBe(11.5);
    expect(unitsAt(w, 8, null, { now: 0, motion: 'full' })[0].id).toBe(UNIT_ID_BASE + 1);
  });
});

// A river world with a herd the test places and moves.
function herdWorld() {
  const w = riverWorld();
  return w;
}
const herd = (extra = {}) => ({ id: 3, kind: 'gazelle', x: 40, y: 20, px: 36, py: 20, moved: 100, size: 4, max: 4, dir: 1, ...extra });
const frameOf = (a) => Number(/_w(\d)/.exec(a.pose)[1]);

describe('v1001 a walking animals (A.2, rulings 2377)', () => {
  it('a moving herd shows its walk frames (all four), a resting herd grazes or stands, Gentle glides standing, Still stands', () => {
    const w = herdWorld(), h = herd();
    const poses = new Set();
    for (let t = 100; t < 103; t += 0.05) for (const a of herdAnimals(w, h, t, 'full')) poses.add(a.pose);
    for (const k of ['_w0', '_w1', '_w2', '_w3']) expect(poses.has(k)).toBe(true);
    const rest = new Set();
    for (let t = 110; t < 150; t += 0.5) for (const a of herdAnimals(w, h, t, 'full')) rest.add(a.pose);
    expect([...rest].sort()).toEqual(['', '_g']);
    for (let t = 100; t < 103; t += 0.1) for (const a of herdAnimals(w, h, t, 'gentle')) expect(a.pose === '' || a.pose === '_g').toBe(true);
    expect(GRAZE.share).toBeGreaterThan(0);
    for (let t = 100; t < 150; t += 0.3) for (const a of herdAnimals(w, h, t, 'still')) expect(a.pose).toBe('');
  });
  it('steps its frames by the ground covered (a cycle of WALK_CYCLE tiles), so the feet keep pace with the ground', () => {
    const w = herdWorld(), h = herd({ x: 40, y: 20, px: 36, py: 20 });           // 4 tiles in 3 days
    let last = null, changes = 0;
    for (let t = 100; t < 103; t += 0.01) {
      const f = frameOf(herdAnimals(w, h, t, 'full')[0]);
      if (last !== null && f !== last) changes++;
      last = f;
    }
    const expected = (4 / WALK_CYCLE.gazelle) * 4;                                  // four frames a cycle
    expect(Math.abs(changes - expected)).toBeLessThanOrEqual(2);
    // a walking herd all faces the way it is heading
    for (const a of herdAnimals(w, h, 101, 'full')) expect(a.left).toBe(false);
    for (const a of herdAnimals(w, herd({ dir: -1 }), 101, 'full')) expect(a.left).toBe(true);
  });
  it('every animal pose the herds, birds, hippos and crocodiles can show is a drawn slot', () => {
    const w = herdWorld();
    for (const kind of ['gazelle', 'ostrich']) for (let t = 100; t < 160; t += 0.4) for (const a of herdAnimals(w, herd({ kind }), t, 'full')) {
      expect(bakes(`${a.kind}${a.pose}`)).toBe(true);
      expect(bakes(`${a.kind}${a.pose}_l`)).toBe(true);
    }
    for (const base of ['heron', 'ibis']) for (const m of ['o', 'fu', 'fd', 'f']) { expect(bakes(`${base}_${m}`)).toBe(true); expect(bakes(`${base}_${m}_l`)).toBe(true); }
    for (const k of ['hippo_e', 'hippo_e_l', 'croc_t1', 'croc_t2', 'croc_t1_l', 'croc_t2_l', 'crocodile_t1', 'crocodile_t2', 'crocodile_t1_l', 'crocodile_t2_l',
      'crocodile_slide2', 'crocodile_slide3', 'crocodile_slide2_l', 'crocodile_slide3_l']) expect(bakes(k)).toBe(true);
  });
});

describe('v1001 a take-off, flick, sway (A.2, rulings 2378-2380)', () => {
  it('a bank bird hops: wings open, two flap frames, lifts off the ground and comes down, open and folded; pure in the day', () => {
    const seen = new Set(), lifts = [];
    for (let t = 0; t < 400; t += 0.05) {
      const hop = hopAt(t, 0.37);
      if (!hop) continue;
      seen.add(hop.mode); lifts.push(hop.lift);
    }
    expect([...seen].sort()).toEqual(['f', 'fd', 'fu', 'o']);
    expect(Math.min(...lifts)).toBe(0);
    expect(Math.max(...lifts)).toBeGreaterThan(HOP.lift * 0.9);
    expect(Math.max(...lifts)).toBeLessThanOrEqual(HOP.lift + 1e-9);
    expect(hopAt(5, 0.2)).toEqual(hopAt(5, 0.2));
    expect(hopAt(HOP.days + 0.01, 0)).toBe(null);       // out of the window: standing
  });
  it('wildlife birds hop under Full only; hippos bob and flick under Full only; crocodiles sway under Full only', () => {
    const w = riverWorld(), all = { x0: 0, y0: 0, x1: w.size, y1: w.size };
    for (let y = 0; y < w.size; y++) for (let x = 14; x <= 27; x++) w.terrain[y * w.size + x] = x >= 17 && x <= 24 ? T.WATER : T.DESERT;   // a wide river between desert banks: deep water for hippos, banks for birds and crocodiles
    const kinds = (motion) => {
      const s = new Set(), lift = new Set();
      for (let t = 50; t < 130; t += 0.2) for (const e of animalsAt(w, t, all, motion)) { s.add(e.kind); if (e.lift) lift.add(Math.round(e.lift * 10)); }
      return { s, lift };
    };
    const full = kinds('full'), gentle = kinds('gentle'), still = kinds('still');
    const any = (set, re) => [...set].some((k) => re.test(k));
    expect(any(full.s, /^(heron|ibis)_(o|fu|fd|f)(_l)?$/)).toBe(true);
    expect(any(full.s, /^hippo_e/)).toBe(true);
    expect(any(full.s, /^croc_t/)).toBe(true);
    for (const re of [/^(heron|ibis)_(o|fu|fd|f)/, /^hippo_e/, /^croc_t/, /_w\d/]) { expect(any(gentle.s, re)).toBe(false); expect(any(still.s, re)).toBe(false); }
    expect(gentle.lift.size).toBe(0);
    expect(still.lift.size).toBe(0);
  });
  it('river life: a heron rises in frames as a boat nears and lands folding; the crocodile sways basking and slides in three stages; the hippo flicks and bobs', () => {
    const w0 = sampleCity(), rows = [...riverRows(w0, 0, w0.size - 1).entries()].filter(([, r]) => r.right - r.left >= RIVER.minWidth);
    const [y, r] = rows[Math.floor(rows.length / 2)];
    const range = { x0: Math.floor(r.left) - 8, y0: y - 8, x1: Math.ceil(r.right) + 8, y1: y + 8 };
    const w = copyWorld(w0);
    const poses = new Set();
    for (let t = 0; t < 2 * (RIVER.crossMs + RIVER.restMs); t += 100) for (const e of riverLifeAt(w, 40, t, range, 'full', { day: DAY })) if (/^heron/.test(e.kind)) poses.add(e.kind.replace(/_l$/, ''));
    for (const k of ['heron_fu', 'heron_fd', 'heron_o', 'heron_f']) expect(poses.has(k)).toBe(true);   // the landing's fold (_f) too (ruling 2385)
    expect(HERON_FLAP_MS).toBeLessThan(400);
    for (const k of poses) expect(bakes(k) || bakes(`${k}_l`)).toBe(true);
    // the crocodile and the hippo
    w.day = 5 * 30 + 5;                                                                // Shemu (as the existing river life test finds it)
    const sway = new Set(), hippo = new Set(), lifts = new Set();
    for (let t = 0; t < 8 * CROC_SWAY_MS; t += 100) for (const e of riverLifeAt(w, 40, t, range, 'full', { day: DAY })) if (/^crocodile/.test(e.kind)) sway.add(e.kind.replace(/_l$/, ''));
    for (let m = 0; m < 3; m++) for (let t = 0; t < RIVER_ONE_MINUTE; t += 100) for (const e of riverLifeAt(w, 40, t, range, 'full', { day: DAY })) if (/^hippo/.test(e.kind)) { hippo.add(e.kind); if (e.lift) lifts.add(Math.sign(e.lift)); }
    expect(sway.size).toBeGreaterThanOrEqual(2);
    for (const k of sway) expect(bakes(k) || bakes(`${k}_l`)).toBe(true);
    expect(hippo.has('hippo_e')).toBe(true);
    expect(lifts.has(1) && lifts.has(-1)).toBe(true);
    expect(HIPPO_FLICK_HOLD_MS).toBeLessThan(HIPPO_FLICK_MS);
    // slides, by the dusk's darkness
    const slide = (dark, motion) => riverLifeAt(w, 40, 3000, range, motion, { day: { phase: 'dusk', u: 0.6, dark, warm: 0.5, lamps: 0.4 } }).map((e) => e.kind.replace(/_l$/, '')).filter((k) => /^crocodile/.test(k));
    expect([slide(0.2, 'full'), slide(0.5, 'full'), slide(0.8, 'full')]).toEqual([['crocodile_slide'], ['crocodile_slide2'], ['crocodile_slide3']]);
    expect(slide(0.8, 'gentle')).toEqual(['crocodile_slide']);
    expect(riverLifeAt(w, 40, 3000, range, 'still', { day: DAY })).toEqual([]);
    expect(LIFE.riverCap).toBeGreaterThan(0);
  });
  it('the flying bird flaps through at least three wing frames', () => {
    expect(new Set(FLAP_FRAMES.map((f) => f.join())).size).toBeGreaterThanOrEqual(3);
    expect(BIRD_FLAP_MS).toBeLessThan(250);
  });
});

describe('v1001 a review fixes (ruling 2384)', () => {
  it('the feeding ibis is still the head-down ibis (the flap frames no longer overwrite fig.ibis_d), and no river slot is defined twice', () => {
    const feeding = (left) => { const c = makeCanvas(60, 60), x = c.getContext('2d'); x.translate(30, 40); ART[left ? 'fig.ibis_dl' : 'fig.ibis_d'].draw(makeDraw(x, 3), 0, 0); return Array.from(x.getImageData(0, 0, 60, 60).data).join(); };
    const plain = (g) => { const c = makeCanvas(60, 60), x = c.getContext('2d'); x.translate(30, 40); ibis(makeDraw(x, 3), 0, 0, false, g); return Array.from(x.getImageData(0, 0, 60, 60).data).join(); };
    expect(feeding(false)).toBe(plain(true));
    expect(feeding(false)).toBe(feeding(false));
    const seen = new Map();
    for (const part of RIVER_ART_PARTS) for (const k of Object.keys(part)) seen.set(k, (seen.get(k) || 0) + 1);
    expect([...seen].filter(([, n]) => n > 1)).toEqual([]);
    expect(Object.keys(RIVER_ART).length).toBe(seen.size);
  });
  it('river life stays pose-free under Gentle: herons stand, the crocodile is the one slide frame, the hippo is plain', () => {
    const w0 = sampleCity(), rows = [...riverRows(w0, 0, w0.size - 1).entries()].filter(([, r]) => r.right - r.left >= RIVER.minWidth);
    const [y, r] = rows[Math.floor(rows.length / 2)];
    const range = { x0: Math.floor(r.left) - 8, y0: y - 8, x1: Math.ceil(r.right) + 8, y1: y + 8 };
    const w = copyWorld(w0);
    w.day = 5 * 30 + 5;
    const kinds = new Set();
    for (const day of [DAY, { phase: 'dusk', u: 0.6, dark: 0.8, warm: 0.5, lamps: 0.4 }]) for (let t = 0; t < 2 * (RIVER.crossMs + RIVER.restMs); t += 250) for (const e of riverLifeAt(w, 40, t, range, 'gentle', { day })) kinds.add(e.kind);
    for (const k of kinds) expect(/^(heron|hippo|crocodile)/.test(k) ? /^(heron|heron_l|hippo|hippo_l|crocodile|crocodile_l|crocodile_slide)$/.test(k) : true).toBe(true);
    expect([...kinds].some((k) => /^heron/.test(k))).toBe(true);
  });
});

describe('v1001 a cost (A.3, ruling 2381)', () => {
  it('the new frames are sprites baked once: drawing them again over a new frame adds no bake', () => {
    const counter = {}, cache = createSpriteCache({ counter });
    const world = makeTestWorld();
    const r = createRenderer({ canvas: makeCanvas(10, 10), dpr: 1, spriteCache: cache, maxBakesPerFrame: Infinity });
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const walkers = ['gazelle_w1', 'gazelle_w3_l', 'gazelle_g', 'ostrich_w2', 'heron_fu', 'heron_fd_l', 'ibis_o', 'hippo_e', 'croc_t1', 'crocodile_slide3'].map((kind, i) => ({ id: i + 1, kind, x: 14.5 + i * 0.3, y: 15.5, dir: 1 }));
    r.renderFrame(world, cam, { view: { width: 300, height: 200 }, walkers });
    const misses = counter.misses;
    expect(misses).toBeGreaterThan(0);
    r.renderFrame(world, cam, { view: { width: 300, height: 200 }, walkers: walkers.map((k) => ({ ...k, x: k.x + 0.2 })) });
    expect(counter.misses).toBe(misses);
  });
});
