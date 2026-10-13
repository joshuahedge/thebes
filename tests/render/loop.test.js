import { describe, it, expect } from '../harness.js';
import { createGameLoop, MAX_FRAME_SECONDS, MAX_DAYS_PER_FRAME } from '../../src/render/loop.js';
import { DAYS_PER_SECOND } from '../../src/sim/time.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

function harness(speed) {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 5, 11);
  w.speed = speed;
  const frames = [];
  const batches = [];
  const loop = createGameLoop({ world: w, render: (f) => frames.push(f), onEvents: (e) => batches.push(e), raf: () => 1, caf: () => {} });
  return { w, loop, frames, batches };
}

// A frame's dt is capped at MAX_FRAME_SECONDS (0.25 s), so a longer span is fed as several frames of exactly the cap.
function advance(loop, fromMs, toMs, stepMs = 250) {
  for (let t = fromMs + stepMs; t <= toMs; t += stepMs) loop.tick(t);
}

describe('game loop', () => {
  it('steps whole game-days on a fixed timestep', () => {
    const { w, loop, frames } = harness(1);
    loop.tick(0);
    expect(w.day).toBe(0);
    advance(loop, 0, 1000);
    expect(w.day).toBe(1);
    expect(Math.abs(frames[frames.length - 1].timeDays - 1) < 1e-9).toBe(true);
    advance(loop, 1000, 2000);
    expect(w.day).toBe(2);
    expect(frames.length).toBe(9);
  });
  it('does nothing while paused and scales with speed', () => {
    const paused = harness(0);
    paused.loop.tick(0);
    advance(paused.loop, 0, 5000);
    expect(paused.w.day).toBe(0);
    expect(paused.frames[paused.frames.length - 1].timeDays).toBe(0);
    const fast = harness(3);
    fast.loop.tick(0);
    advance(fast.loop, 0, 1000);
    expect(fast.w.day).toBe(3);
  });
  it('caps a long gap so a background tab never spirals', () => {
    const { w, loop } = harness(3);
    loop.tick(0);
    loop.tick(120000);
    expect(w.day).toBeLessThanOrEqual(Math.ceil(MAX_FRAME_SECONDS * DAYS_PER_SECOND * 3));
    expect(w.day).toBeLessThanOrEqual(MAX_DAYS_PER_FRAME);
  });
  it('caps the days stepped in one frame', () => {
    const { w, loop } = harness(1);
    w.speed = 100;
    loop.tick(0);
    loop.tick(250);
    expect(w.day).toBe(MAX_DAYS_PER_FRAME);
    expect(loop.accumulator < 1).toBe(true);
  });
  it('hands sim events to onEvents and never keeps them', () => {
    const { w, loop, batches } = harness(3);
    let t = 0;
    while (w.day < 10) { t += 250; loop.tick(t); }
    expect(batches.length).toBeGreaterThan(0);
    expect(batches[batches.length - 1].some((e) => e.type === 'arrivals')).toBe(true);
    expect(JSON.stringify(w).includes('arrivals')).toBe(false);
  });
  it('starts and stops through the injected frame scheduler', () => {
    let scheduled = 0, cancelled = 0;
    const w = makeTestWorld();
    const loop = createGameLoop({ world: w, render: () => {}, raf: () => { scheduled++; return 7; }, caf: () => { cancelled++; } });
    loop.start();
    loop.start();
    expect(scheduled).toBe(1);
    expect(loop.running).toBe(true);
    loop.stop();
    expect(cancelled).toBe(1);
    expect(loop.running).toBe(false);
  });
  it('keeps scheduling frames after render throws', () => {
    const w = makeTestWorld();
    let fn = null, calls = 0, survived = 0;
    const render = () => { calls++; if (calls === 1) throw new Error('boom'); survived++; };
    const loop = createGameLoop({ world: w, render, raf: (f) => { fn = f; return 1; }, caf: () => {} });
    loop.start();
    let threw = false;
    try { fn(0); } catch { threw = true; }
    expect(threw).toBe(true);
    fn(250);
    expect(survived).toBe(1);
    expect(loop.running).toBe(true);
  });
});
