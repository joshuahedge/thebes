// Version 6.0 Track B2: soldiers and raiders you can see fighting: poses facing the foe, the chieftain and his banner, a raider's sack, blows, falls and
// arrows, at each Motion level. Drawn from the sim's state alone.
import { describe, it, expect } from '../../harness.js';
import { unitsAt, drawUnitMarks, drawBanner, setBattleHooks, resetBattleHooks, UNIT_ID_BASE, ARROW_MS, STILL_ARROW_MS, BAR } from '../../../src/render/units.js';
import { gentleShapes } from '../../../src/render/fire.js';
import { FIGHT, SPARK, FALL, ARROWS, BANNER, SCRUM } from '../../../src/data/battle.js';
import { CHIEFTAIN } from '../../../src/data/hazards.js';
import { ART } from '../../../src/render/art/registry.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';

// A raid under way (raiders [x, y, extra] at tiles, soldiers [x, y, extra] out in the field) in a city with one barracks.
function arena({ raiders = [], soldiers = [], active = {} } = {}) {
  const w = makeTestWorld({ fertile: [] });
  const bk = addRaw(w, 'barracks', 2, 2);
  w.raid.active = {
    index: 2, entry: { x: 31, y: 10 }, dir: 'east', size: raiders.length, target: 'storehouse', day: 0, phase: 'attack', targetId: null, struck: [], wait: 0, byTowers: 0, bySoldiers: 0, burned: 0, stolen: 0, shots: [],
    x: 20, y: 10, blocked: null, towerIds: [], fires: [], burnedKinds: [], ...active,
    raiders: raiders.map(([x, y, extra = {}], i) => ({ id: 1 + i, x, y, hp: 10, hit: false, ...extra })),
  };
  w.soldiers = soldiers.map(([x, y, extra = {}], i) => ({ id: 50 + i, kind: 'soldier', barracks: bk.id, x, y, hp: 12, hit: false, task: 'out', ...extra }));
  return w;
}
const FULL = { motion: 'full' }, GENTLE = { motion: 'gentle' }, STILL = { motion: 'still' };
const kinds = (w, now = 0, opts = FULL) => Object.fromEntries(unitsAt(w, 0, null, { ...opts, now }).map((u) => [u.id - UNIT_ID_BASE, u.kind]));

// drawUnitMarks with every call recorded: { line, poly, circ, ell, stroke, radial }.
function marks(w, now = 0, opts = FULL, timeDays = 0) {
  const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1);
  const calls = { line: [], poly: [], circ: [], ell: [], stroke: [], radial: [] };
  for (const k of Object.keys(calls)) { const f = g[k]; g[k] = (...a) => { calls[k].push(a); return f(...a); }; }
  drawUnitMarks(g, w, null, timeDays, now, opts);
  return calls;
}

describe('v60 b2 units fighting', () => {
  it('shows a soldier and a raider beside each other in fighting poses, each facing the other, and nothing of the kind apart', () => {
    const w = arena({ raiders: [[11, 10]], soldiers: [[10, 10]] });
    expect(kinds(w)).toEqual({ 1: 'raider_a_l', 50: 'soldier_a_r' });                                // a raider to the right of the soldier: he faces right, the raider left
    const flipped = arena({ raiders: [[10, 10]], soldiers: [[11, 10]] });
    expect(kinds(flipped)).toEqual({ 1: 'raider_a_r', 50: 'soldier_a_l' });
    const above = arena({ raiders: [[10, 9]], soldiers: [[10, 10]] });                               // up the map is up and to the right on screen
    expect(kinds(above)[50]).toBe('soldier_a_r');
    const apart = arena({ raiders: [[14, 10]], soldiers: [[10, 10]] });
    expect(kinds(apart)).toEqual({ 1: 'raider', 50: 'soldier' });
    const edge = arena({ raiders: [[10 + FIGHT.reach - 0.01, 10]], soldiers: [[10, 10]] });
    expect(kinds(edge)[50]).toBe('soldier_a_r');
    const past = arena({ raiders: [[10 + FIGHT.reach + 0.01, 10]], soldiers: [[10, 10]] });
    expect(kinds(past)[50]).toBe('soldier');
  });

  it('leaves archers, chariots and raiders who shoot or ride in their own figures, and a soldier waiting in the barracks yard', () => {
    const w = arena({ raiders: [[11, 10, { kind: 'archer' }], [11, 11, { kind: 'chariot' }]], soldiers: [[10, 10], [10, 11, { kind: 'archer' }]] });
    expect(kinds(w)).toEqual({ 1: 'raider_archer', 2: 'raider_chariot', 50: 'soldier', 51: 'archer' });
    const yard = arena({ raiders: [[2.2, 2.2]], soldiers: [[2.5, 2.5, { task: 'wait' }]] });          // on the barracks (2, 2): in its yard
    expect(kinds(yard)).toEqual({ 1: 'raider', 50: 'soldier' });
  });

  it('draws the band\'s chieftain as his own figure, fighting or not, and a raider leaving with the spoils with his sack', () => {
    const w = arena({ raiders: [[11, 10, { chief: true, hp: 20 }], [15, 10, { chief: true, hp: 20 }]], soldiers: [[10, 10]] });
    expect(kinds(w)).toEqual({ 1: 'chief_a_l', 2: 'chief', 50: 'soldier_a_r' });
    const taking = arena({ raiders: [[15, 10]], active: { phase: 'leave', stolen: 30 } });
    expect(kinds(taking)).toEqual({ 1: 'raider_sack' });
    expect(kinds(arena({ raiders: [[15, 10]], active: { phase: 'leave', taken: { clay: 5 } } }))).toEqual({ 1: 'raider_sack' });
    expect(kinds(arena({ raiders: [[15, 10]], active: { phase: 'leave', foodStolen: 4 } }))).toEqual({ 1: 'raider_sack' });
    expect(kinds(arena({ raiders: [[15, 10]], active: { phase: 'leave' } }))).toEqual({ 1: 'raider' });         // nothing taken: nothing carried
    expect(kinds(arena({ raiders: [[15, 10]], active: { phase: 'attack', stolen: 30 } }))).toEqual({ 1: 'raider' });
    expect(kinds(arena({ raiders: [[15, 10]], active: { phase: 'retreat', stolen: 30 } }))).toEqual({ 1: 'raider' });
    // the second band of a two-sided raid carries by its own phase
    const two = arena({ raiders: [[15, 10], [16, 10, { band: 1 }]], active: { phase: 'attack', stolen: 30, second: { entry: { x: 0, y: 5 }, phase: 'leave' } } });
    expect(kinds(two)).toEqual({ 1: 'raider', 2: 'raider_sack' });
  });

  it('steps between the two poses at the Motion level\'s pace, and holds the guard under Still', () => {
    const w = arena({ raiders: [[11, 10]], soldiers: [[10, 10]] });
    const pose = (now, opts) => kinds(w, now, opts)[50].split('_')[1];
    const f = FIGHT.period.full, g = FIGHT.period.gentle;
    expect([pose(0, FULL), pose(f * 0.7, FULL), pose(f * 1.7, FULL), pose(f * 2.7, FULL)]).toEqual(['a', 'b', 'a', 'b']);
    expect([pose(0, GENTLE), pose(g * 0.7, GENTLE), pose(g * 1.7, GENTLE)]).toEqual(['a', 'b', 'a']);
    expect(g).toBeGreaterThanOrEqual(1000);                                                          // calm: one change a second at most
    for (const now of [0, f * 0.7, g * 0.7, 5000, 123456]) expect(pose(now, STILL)).toBe('a');
    expect(Object.values(kinds(w, 7777, STILL)).every((k) => k.endsWith('_a_l') || k.endsWith('_a_r'))).toBe(true);
    // units of different ids change out of step
    const many = arena({ raiders: [[11, 10], [11, 12], [11, 14]], soldiers: [[10, 10], [10, 12], [10, 14]] });
    const poses = Object.values(kinds(many, f * 0.5, FULL)).map((k) => k.split('_')[1]);
    expect(new Set(poses).size).toBe(2);
  });

  it('takes the Motion level and the clock from the interface\'s hooks when a call does not give them, and a scene may hold the moment', () => {
    const w = arena({ raiders: [[11, 10]], soldiers: [[10, 10]] });
    try {
      setBattleHooks({ motion: () => 'still', now: () => FIGHT.period.full * 0.7 });
      expect(Object.values(unitsAt(w, 0)).map((u) => u.kind.split('_')[1])).toEqual(['a', 'a']);
      setBattleHooks({ motion: () => 'full', now: () => FIGHT.period.full * 0.7 });
      expect(Object.values(unitsAt(w, 0)).map((u) => u.kind.split('_')[1])).toEqual(['b', 'b']);
      const shot = arena({ raiders: [[20, 10]], active: { shots: [{ from: { x: 17, y: 10 }, to: { x: 20, y: 10 } }] } });
      setBattleHooks({ hold: 100 });
      expect(marks(shot, 99999, FULL).line.filter((l) => l[2] === ARROWS.colour).length).toBe(1);   // however late the clock, the arrow shows at age 100
    } finally { resetBattleHooks(); }
  });

  it('stands a company out in the field spread, and one waiting where it is as the sim has it', () => {
    const out = arena({ soldiers: [[10, 10], [10, 10], [10, 10], [10, 10]], raiders: [[20, 20]] });
    const spots = unitsAt(out, 0, null, { ...FULL, now: 0 }).filter((u) => u.id >= UNIT_ID_BASE + 50).map((u) => `${u.x.toFixed(2)},${u.y.toFixed(2)}`);
    expect(new Set(spots).size).toBe(4);                                                              // each on a spot of its own
    for (const u of unitsAt(out, 0, null, { ...FULL, now: 0 }).filter((u) => u.id >= UNIT_ID_BASE + 50)) {
      expect(Math.hypot(u.x - 10.5, u.y - 10.5)).toBeLessThan(0.6 * FIGHT.spread + 0.01);
    }
    expect(Math.max(...SCRUM.map(([a, b]) => Math.hypot(a, b))) * FIGHT.spread).toBeLessThan(1);      // within a tile of where the sim has them
    const wait = arena({ soldiers: [[10, 10, { task: 'wait' }], [10, 10, { task: 'wait' }]], raiders: [[20, 20]] });
    const stand = unitsAt(wait, 0, null, { ...FULL, now: 0 }).filter((u) => u.id >= UNIT_ID_BASE + 50);
    expect(stand.map((u) => [u.x, u.y])).toEqual([[10.5, 10.5], [10.5, 10.5]]);
  });
});

describe('v60 b2 units the chieftain\'s banner', () => {
  const cloth = (calls) => calls.poly.filter((p) => p[1] === BANNER.cloth);
  const pole = (calls) => calls.line.filter((l) => l[2] === BANNER.wood);
  const band = (calls) => calls.poly.filter((p) => p[1] === BANNER.band);

  it('flies one banner for each chieftain and none for anyone else, moving with him', () => {
    const w = arena({ raiders: [[10, 10, { chief: true, hp: 20 }], [12, 10]] });
    const a = marks(w, 0, FULL, 0);
    expect([cloth(a).length, pole(a).length, band(a).length]).toEqual([1, 1, 1]);
    const none = marks(arena({ raiders: [[10, 10], [12, 10]] }), 0, FULL, 0);
    expect([cloth(none).length, pole(none).length]).toEqual([0, 0]);
    const x0 = pole(a)[0][0][0];
    w.raid.active.raiders[0].x = 14;                                                                  // the band moves a tile each day: the banner glides with him
    w.day = 1;
    marks(w, 0, FULL, 1);                                                                             // the day's first frame sees him move: he starts from where he was drawn
    const mid = marks(w, 0, FULL, 1.5), done = marks(w, 0, FULL, 2);
    const dx = (c) => pole(c)[0][0][0] - x0;
    expect(dx(mid)).toBeGreaterThan(10);
    expect(dx(done)).toBeGreaterThan(dx(mid) + 10);
    expect(pole(done)[0][1][1]).toBeLessThan(pole(done)[0][0][1] - 20);                              // a tall pole, upward
  });

  it('ripples the cloth under Full, cross-fades two still shapes under Gentle, and holds one under Still', () => {
    const w = arena({ raiders: [[10, 10, { chief: true, hp: 20 }]] });
    const shape = (now, opts) => cloth(marks(w, now, opts, 0)).map((p) => p[0].map((q) => q.map((v) => v.toFixed(2)).join(',')).join(' '));
    expect(new Set([0, 150, 300, 450, 600].map((t) => shape(t, FULL)[0])).size).toBeGreaterThan(3);   // it ripples
    const base = (opts) => pole(marks(w, 777, opts, 0))[0].slice(0, 2).join('|');
    expect([base(FULL), base(GENTLE), base(STILL)].every((s) => s === base(FULL))).toBe(true);        // the pole is where he is at every level
    const gentleShapesSeen = new Set();
    for (let t = 0; t < 4000; t += 50) for (const s of shape(t, GENTLE)) gentleShapesSeen.add(s);
    expect(gentleShapesSeen.size).toBe(2);                                                            // two shapes in all, never a third
    let crossfading = 0;
    for (let t = 0; t < 4000; t += 50) if (cloth(marks(w, t, GENTLE, 0)).length === 2) crossfading++;
    expect(crossfading).toBeGreaterThan(0);
    expect(gentleShapes(0, 1).length).toBeGreaterThan(0);
    const held = new Set([0, 130, 999, 54321].map((t) => shape(t, STILL)[0]));
    expect(held.size).toBe(1);                                                                        // Still: the same banner whenever it is drawn
  });

  it('reads the chieftain\'s own hit points on his bar, more than a raider\'s', () => {
    const w = arena({ raiders: [[10, 10, { chief: true, hp: 10, hit: true }], [12, 10, { hp: 10, hit: true }]] });
    const bars = marks(w, 0, FULL).poly.filter((p) => p[1] === '#F08A70');
    expect(bars.length).toBe(2);
    const width = (b) => b[0][1][0] - b[0][0][0];
    const milli = (v) => Math.round(v * 1000);
    expect(milli(width(bars[0]))).toBe(milli(BAR.w * 10 / (10 * CHIEFTAIN.hpFactor)));                // 10 of 20: half the bar
    expect(milli(width(bars[1]))).toBe(milli(BAR.w));                                                 // 10 of 10: the whole bar
  });

  it('lays the banner on the ground where its chieftain fell, for a while, and not where he left with his band', () => {
    const w = arena({ raiders: [[10, 10, { chief: true, hp: 20 }], [12, 10]], active: { chiefs: [{ id: 1, band: 0 }] } });
    marks(w, 0, FULL, 0);                                                                             // the drawing has seen him standing
    w.raid.active.raiders = w.raid.active.raiders.slice(1);                                           // the sim: he fell
    w.raid.active.chiefs[0].fell = true;
    const lying = (now, opts) => marks(w, now, opts, 0).poly.filter((p) => p[1] === BANNER.cloth);
    expect(lying(100, FULL).length).toBe(1);
    expect(lying(100 + BANNER.fellMs - 1, FULL).length).toBe(1);
    expect(lying(100 + BANNER.fellMs, FULL).length).toBe(0);                                          // and gone
    // Still draws it too (a held pose), where a Full one drew it
    const w2 = arena({ raiders: [[10, 10, { chief: true, hp: 20 }], [12, 10]], active: { chiefs: [{ id: 1, band: 0 }] } });
    marks(w2, 0, STILL, 0);
    w2.raid.active.raiders = w2.raid.active.raiders.slice(1);
    expect(marks(w2, 50, STILL, 0).poly.filter((p) => p[1] === BANNER.cloth).length).toBe(1);
    // he left the map with his band: at the entry, no banner is left
    const w3 = arena({ raiders: [[31, 10, { chief: true, hp: 20 }], [12, 10]], active: { chiefs: [{ id: 1, band: 0 }] } });
    marks(w3, 0, FULL, 0);
    w3.raid.active.raiders = w3.raid.active.raiders.slice(1);
    w3.raid.active.chiefs[0].left = true;
    expect(marks(w3, 50, FULL, 0).poly.filter((p) => p[1] === BANNER.cloth).length).toBe(0);
  });

  it('draws a banner by itself at a point (the interface\'s helper for a lying or a standing one)', () => {
    const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1);
    const calls = [];
    const f = g.poly; g.poly = (...a) => { calls.push(a); return f(...a); };
    drawBanner(g, 4, 4, 0, 'full', 3);
    drawBanner(g, 4, 4, 0, 'still', 3, true);
    expect(calls.filter((c) => c[1] === BANNER.cloth).length).toBe(2);
  });
});

describe('v60 b2 units blows and falls', () => {
  const sparks = (calls) => ({ lines: calls.line.filter((l) => l[2] === SPARK.colour || l[2] === SPARK.edge), rings: calls.circ.filter((c) => c[3] && c[3].stroke === SPARK.edge) });

  it('shows a spark where a unit was hurt: a burst under Full, a ring fading in place under Gentle, none under Still', () => {
    const make = () => { const w = arena({ raiders: [[10, 10]], soldiers: [[10, 20]] }); marks(w, 0, FULL, 0); w.raid.active.raiders[0].hp = 7; return w; };   // apart: no clash mark to confuse the count
    const w = make();
    expect(sparks(marks(w, 100, FULL, 0)).lines.length).toBeGreaterThanOrEqual(6);                    // the day's blow lands: a burst, at once
    expect(sparks(marks(w, 100 + SPARK.ms - 1, FULL, 0)).lines.length).toBeGreaterThan(0);
    expect(sparks(marks(w, 100 + SPARK.ms, FULL, 0)).lines.length).toBe(0);                           // over in a moment
    const g = make();
    const gentle = sparks(marks(g, 100, GENTLE, 0));
    expect([gentle.lines.length, gentle.rings.length]).toEqual([0, 1]);
    expect(sparks(marks(g, 100 + SPARK.ringMs - 1, GENTLE, 0)).rings.length).toBe(1);
    expect(sparks(marks(g, 100 + SPARK.ringMs, GENTLE, 0)).rings.length).toBe(0);
    const s = make();
    const still = sparks(marks(s, 100, STILL, 0));
    expect([still.lines.length, still.rings.length]).toEqual([0, 0]);
    // a soldier hurt shows one too, and a unit standing in its yard (waiting) never does
    const sol = arena({ raiders: [[20, 20]], soldiers: [[10, 10]] });                                 // a soldier hurt by an archer's arrow, say
    marks(sol, 0, FULL, 0);
    sol.soldiers[0].hp = 9;
    expect(sparks(marks(sol, 50, FULL, 0)).lines.length).toBeGreaterThanOrEqual(6);
  });

  it('shows a fall where a unit vanishes in the field (dust and a lying figure under Full, the figure fading under Gentle), not one that left or went home', () => {
    const lying = (calls) => calls.ell.filter((e) => e[3] === FALL.body);
    const dust = (calls) => calls.circ.filter((c) => c[2] === FALL.dust);
    const w = arena({ raiders: [[10, 10], [12, 10]] });
    marks(w, 0, FULL, 0);
    w.raid.active.raiders = w.raid.active.raiders.slice(1);                                           // one fell
    const full = marks(w, 100, FULL, 0);
    expect([lying(full).length, dust(full).length]).toEqual([1, 4]);
    expect(dust(marks(w, 100 + FALL.dustMs, FULL, 0)).length).toBe(0);                                // the dust settles first
    expect(lying(marks(w, 100 + FALL.ms - 1, FULL, 0)).length).toBe(1);
    expect(lying(marks(w, 100 + FALL.ms, FULL, 0)).length).toBe(0);
    const g = arena({ raiders: [[10, 10], [12, 10]] });
    marks(g, 0, GENTLE, 0);
    g.raid.active.raiders = g.raid.active.raiders.slice(1);
    const gentle = marks(g, 100, GENTLE, 0);
    expect([lying(gentle).length, dust(gentle).length]).toEqual([1, 0]);
    const s = arena({ raiders: [[10, 10], [12, 10]] });
    marks(s, 0, STILL, 0);
    s.raid.active.raiders = s.raid.active.raiders.slice(1);
    expect(lying(marks(s, 100, STILL, 0)).length).toBe(0);                                            // Still shows no new movement
    // a raider that reached the entry and left the map did not fall
    const left = arena({ raiders: [[31, 10], [12, 10]] });
    marks(left, 0, FULL, 0);
    left.raid.active.raiders = left.raid.active.raiders.slice(1);
    expect(lying(marks(left, 100, FULL, 0)).length).toBe(0);
    // a soldier that fell away from its barracks fell; one that vanished at its barracks (sent away) did not
    const sold = arena({ raiders: [[20, 20]], soldiers: [[10, 10], [2.5, 2.5, { task: 'wait' }]] });
    marks(sold, 0, FULL, 0);
    sold.soldiers = [];
    expect(lying(marks(sold, 100, FULL, 0)).length).toBe(1);
  });

  it('shows the last raider\'s fall though the raid has ended on it', () => {
    const w = arena({ raiders: [[10, 10]] });
    marks(w, 0, FULL, 0);
    w.raid.active = null;                                                                             // the sim: the last raider fell and the raid ended
    const calls = marks(w, 100, FULL, 0);
    expect(calls.ell.filter((e) => e[3] === FALL.body).length).toBe(1);
  });
});

describe('v60 b2 units arrows', () => {
  const shotWorld = () => arena({ raiders: [[20, 10]], active: { shots: [{ from: { x: 17, y: 10 }, to: { x: 20, y: 10 } }] } });
  const flight = (calls) => calls.line.filter((l) => l[2] === ARROWS.colour);
  const landing = (calls) => calls.line.filter((l) => l[2] === ARROWS.trail);
  const arcs = (calls) => calls.stroke.filter((s) => s[1] === ARROWS.colour);

  it('flies an arrow along an arc for 0.3 s and lands it in a puff, under Full', () => {
    const w = shotWorld();
    expect([ARROW_MS, STILL_ARROW_MS]).toEqual([300, 600]);                                           // the Stage 3 constants stay as they were
    expect([ARROWS.ms, ARROWS.stillMs]).toEqual([300, 600]);
    const a = marks(w, 1000, FULL), b = marks(w, 1000 + ARROW_MS * 0.5, FULL);
    expect([flight(a).length, flight(b).length]).toEqual([1, 1]);
    expect(flight(b)[0][1][0]).toBeGreaterThan(flight(a)[0][1][0]);                                   // the head moves toward the target (east on screen)
    // an arc: the middle of the flight is above the straight line between its ends
    const from = flight(marks(w, 1000 + 1, FULL))[0][1], head = flight(b)[0][1], end = flight(marks(w, 1000 + ARROW_MS - 1, FULL))[0][1];
    const k = (head[0] - from[0]) / (end[0] - from[0]);
    expect(head[1]).toBeLessThan(from[1] + (end[1] - from[1]) * k - 1);                               // above the chord at its middle
    const landed = marks(w, 1000 + ARROW_MS + 10, FULL);
    expect([flight(landed).length, landing(landed).length]).toEqual([0, 5]);
    expect(landing(marks(w, 1000 + ARROW_MS + ARROWS.landMs, FULL)).length).toBe(0);
  });

  it('shows the whole arc as one line for a moment under Gentle (fading, with a ring where it lands) and Still (held), and a new day starts a new volley', () => {
    const w = shotWorld();
    const first = marks(w, 1000, GENTLE), late = marks(w, 1000 + STILL_ARROW_MS - 1, GENTLE);
    expect([arcs(first).length, arcs(late).length]).toEqual([1, 1]);
    expect(arcs(first)[0][3]).toBeGreaterThan(arcs(late)[0][3]);                                      // it fades
    expect(marks(w, 1000 + STILL_ARROW_MS, GENTLE).stroke.length).toBe(0);
    const seg = arcs(first)[0][0];
    const [from, ctrl, to] = [seg[0][1], seg[1][1], seg[1][2]];
    expect(ctrl[1]).toBeLessThan((from[1] + to[1]) / 2 - 4);                                          // it rises above the chord: an arc
    expect(first.circ.filter((c) => c[3] && c[3].stroke === ARROWS.trail).length).toBe(1);            // landing ring
    const w2 = shotWorld(), a = marks(w2, 9000, STILL), b = marks(w2, 9000 + STILL_ARROW_MS - 1, STILL);
    expect([arcs(a).length, arcs(b).length, marks(w2, 9000 + STILL_ARROW_MS, STILL).stroke.length]).toEqual([1, 1, 0]);
    expect(arcs(b)[0]).toEqual(arcs(a)[0]);                                                           // the same held line
    expect(a.circ.filter((c) => c[3] && c[3].stroke === ARROWS.trail).length).toBe(0);                // nothing lands under Still
    w2.day = 1;
    expect(arcs(marks(w2, 20000, STILL)).length).toBe(1);
  });
});
