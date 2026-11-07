// Version 9.0, Track V: the frame's game time for the effects that run on game days (a building's scaffold, the beaten raid's moment, the units'
// glide). The game loop (src/render/loop.js) notes world.day plus the frame's fraction once a frame, before it draws; renderFrame's options do
// not carry it. Kept per world, outside it (never saved). A world no loop has noted (a test, a screenshot's bare frame) reads world.day.
const times = new WeakMap();

export function noteFrameTime(world, timeDays) { if (world) times.set(world, timeDays); }

export function frameTimeOf(world) {
  const t = times.get(world);
  // a noted time from another day (a load, a test that moved the day by hand) is stale: the world's own day stands
  return t !== undefined && Math.floor(t) === world.day ? t : world.day;
}
