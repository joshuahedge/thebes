// Version 6.0 Track B1 (ruling 689): the older balance runs and rule tests (Stage 4 to Version 5.0) measure the game before the new dangers: their
// numbers are what the commit that wrote each of them calibrated. They run with the grace never ending, as a Peaceful-from-the-start city of the old
// game would; the dangers' own tests (tests/v60/b1) and the Version 6.0 balance pass (Wave 4) measure the game with them on.
export const NEVER = 1e9;
export function noNewDangers(world) {
  world.hazards.graceUntil = NEVER;
  return world;
}
