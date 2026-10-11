// Combat and soldiers (spec 4.13). Stage 3 contract: Track B implements the STUBs; raidDay (raids.js) calls them.
//
// world.soldiers: one entry per trained soldier, ascending id: { id, barracks, x, y, hp, hit, task }
//   barracks: the id of the barracks that trained it; x, y: tile coordinates (may be fractional); hp: UNITS.soldier.hp
//   down to 1 (a soldier at 0 is wounded and leaves the list); hit: hurt at least once; task: 'wait' | 'out' | 'back'.
// A barracks keeps its training progress in its own b.progress (days of training at full staff towards
// DEFENCE.trainDays). Raiders live in world.raid.active.raiders.
//
// STUB. Trains soldiers for the day: each barracks at 25% staff or more adds its staffing ratio to b.progress and, at
// DEFENCE.trainDays, trains one soldier (up to DEFENCE.soldiersPerBarracks of its own), placed at the barracks.
export function trainSoldiers(world, events = null) {}

// STUB. One day of fighting while a raid is under way: towers shoot (DEFENCE.towerDamage x staffing, the nearest raider
// within DEFENCE.towerRange), soldiers walk out to raiders within DEFENCE.patrol of their barracks and fight, raiders hit
// the wall tile in their way or a soldier beside them. Records raid.active.shots and the tallies.
export function combatDay(world, events = null) {}
