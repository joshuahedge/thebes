// Settling (early-game pass 3.2): whatever the city has earned is paid out after every command, not only
// on game days, so steps finish while the game is paused. The interface calls settle after each command;
// the daily tick runs the same checks itself (src/sim/clock.js). Returns the events array it was given.
import { settleGoals } from './goals.js';

export function settle(world, events = null) {
  settleGoals(world, events);
  // Next, in this order: firsts and achievements (src/sim/firsts.js, src/sim/achievements.js),
  // then daily goals (src/sim/daily.js).
  return events;
}
