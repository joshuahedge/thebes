// Settling (early-game pass 3.2): whatever the city has earned is paid out after every command, not only
// on game days, so steps finish while the game is paused. The interface calls settle after each command;
// the daily tick runs the same checks itself (src/sim/clock.js). Returns the events array it was given.
import { settleGoals } from './goals.js';
import { checkFirsts } from './firsts.js';
import { checkAchievements } from './achievements.js';

export function settle(world, events = null) {
  settleGoals(world, events);
  checkFirsts(world, events);
  checkAchievements(world, events);
  // Daily goals (src/sim/daily.js) come last.
  return events;
}
