// Version 7.0 Track E (ruling 913): the older balance runs (Stage 4 to Version 6.0.1) measure the game before the city events: their numbers are what the commit that
// wrote each of them calibrated, and a scripted player that never answers an event would see its defaults (a strike stops the quarries, a fever lays homes low) move
// them. They run with no event ever drawn, as tests/v60/b1/grace.js holds the new dangers off; the events' own tests (tests/v70/e) and the Version 7.0 balance pass (wave 3, tests/v70/balance:
// the late, careless and great-work runs and the dangers-on runs play with the events on, each event drawn and its choice recorded) measure the game with them on. The village, capital
// and dangers-off grand runs keep the hold (ruling 975); a run that plays with events passes an events player (tests/v70/balance/events.js) and takes its world out of the hold (releaseEvents).
export const NEVER = 1e9;
export const held = { on: true };
export function noCityEvents(world) {
  if (held.on) world.cityEvents.nextDay = NEVER;
  return world;
}
// Wave 3 (the balance pass): a run that plays with the city events on takes them back from the hold: a world made under the hold has its next event on day NEVER, and this
// sets it to today, so the first event comes when drawEvent's own rules (the city's rank, its first-event wait, the dangers and the court) let it. A world that never was held (one
// made with the events on) is left as it is. Returns the world.
export function releaseEvents(world) {
  if (world.cityEvents.nextDay >= NEVER) world.cityEvents.nextDay = world.day;
  return world;
}
