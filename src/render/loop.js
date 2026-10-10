// requestAnimationFrame driver with a fixed timestep of whole game-days (spec 7.4). The sim only ever
// sees tickDay, so the rules behave the same on every device; rendering gets a fractional day for motion.
import { tickDay, daysForSeconds } from '../sim/clock.js';

export const MAX_FRAME_SECONDS = 0.25; // a hidden tab or a hitch never becomes a burst of days
export const MAX_DAYS_PER_FRAME = 12;

export function createGameLoop({ world, render, onEvents = null, raf = (fn) => requestAnimationFrame(fn), caf = (id) => cancelAnimationFrame(id) }) {
  let last = null, acc = 0, handle = null, running = false;
  const events = [];

  function frame(t) {
    if (running) handle = raf(frame);   // queue the next frame first so an exception below cannot stall the loop
    const dt = last === null ? 0 : Math.min(MAX_FRAME_SECONDS, Math.max(0, (t - last) / 1000));
    last = t;
    acc += daysForSeconds(world.speed, dt);
    let steps = 0;
    while (acc >= 1 && steps < MAX_DAYS_PER_FRAME) {
      tickDay(world, events);
      acc -= 1;
      steps++;
    }
    if (acc >= 1) acc %= 1;          // the cap left a backlog: drop it instead of spiralling
    if (events.length) {
      if (onEvents) onEvents(events.slice());
      events.length = 0;
    }
    render({ timeDays: world.day + acc, dt, steps, now: t });
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = null;
      handle = raf(frame);
    },
    stop() {
      running = false;
      if (handle !== null) caf(handle);
      handle = null;
      last = null;
    },
    tick(t) { frame(t); },
    get running() { return running; },
    get accumulator() { return acc; },
  };
}
