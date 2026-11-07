// Version 9.0 "Dynasty" (wave 0 seam, ruling 1563; Track D owns this file): the heir's trait, the title a reign earns and the month-end counts
// the titles read. Wave 0's bodies keep 8.4's behaviour: no lever is bent, every reign is the Steady, and nothing is counted.

// The factor the heir's trait puts on one lever (design section 4), read in that lever's one function; 1 when the lever is not the heir's.
// The score never reads it.
export function heirFactor(world, lever) {
  return 1;
}

// The title the reign would be remembered by if the throne passed today (design section 3): { id, fit }, id one of HEIRS (src/data/v90.js)
// and fit the measure over its bar; Track D adds measure and runnerUp. Here, the Steady, with no bar met.
export function titleOf(world) {
  return { id: 'steady', fit: 0 };
}

// The month-end counts (src/data/v90.js V90_TALLY). runMonth (src/sim/clock.js) calls it once at each month's end, after monthlyEconomy, the
// milestone's update and the goods' month record, so stats.lastMonth holds the month's trade income and bills and world.milestone is the month's.
export function countDynastyMonth(world) {}
