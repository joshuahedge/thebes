// Version 7.0 Track E (ruling 913): the older balance runs (Stage 4 to Version 6.0.1) measure the game before the city events: their numbers are what the commit that
// wrote each of them calibrated, and a scripted player that never answers an event would see its defaults (a strike stops the quarries, a fever lays homes low) move
// them. They run with no event ever drawn, as tests/v60/b1/grace.js holds the new dangers off; the events' own tests (tests/v70/e) and the Version 7.0 balance pass
// (wave 3: the late and great-work runs with events on, each event drawn and its default recorded) measure the game with them on: that pass sets held.on to false.
export const NEVER = 1e9;
export const held = { on: true };
export function noCityEvents(world) {
  if (held.on) world.cityEvents.nextDay = NEVER;
  return world;
}
