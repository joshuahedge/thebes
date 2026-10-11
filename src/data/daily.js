// Daily goals (spec 3.7): three small goals per local day once the opening chain is done, each finishable in
// about five minutes. No streaks, no day counts, nothing missed. Measures are declarative and count from a
// snapshot taken when the day is drawn (src/sim/daily.js). The words live in src/ui/text.js (DAILY_TEXT).
export const DAILY_COUNT = 3;
export const DAILY_REWARD = 25;
export const DAILY_AFTER = 'temple';            // daily goals open once this goal is complete

// measure kinds: homes (housing plots), roads (tiles beyond the start road), buildings (of a type),
// people (the population now), tally (a running tally in world.tally), made (units of a good produced).
// A goal is drawn only when the city can do it: its building unlocked, and, where given, the milestone `from`
// reached and at least `routes` trade routes open. The Stage 2 goals all wait for Town, so a village's days
// draw exactly as before.
export const DAILY_POOL = [
  { id: 'plots4', measure: { kind: 'homes' }, n: 4 },
  { id: 'roads10', measure: { kind: 'roads' }, n: 10 },
  { id: 'upgrades3', measure: { kind: 'tally', key: 'upgrades' }, n: 3 },
  { id: 'well1', measure: { kind: 'buildings', type: 'well' }, n: 1 },
  { id: 'bazaar1', measure: { kind: 'buildings', type: 'bazaar' }, n: 1 },
  { id: 'temple1', measure: { kind: 'buildings', type: 'temple' }, n: 1 },
  { id: 'farm1', measure: { kind: 'buildings', type: 'farm_grain' }, n: 1 },
  { id: 'people20', measure: { kind: 'people' }, n: 20 },
  { id: 'profit1', measure: { kind: 'tally', key: 'profitMonths' }, n: 1 },
  { id: 'harvest100', measure: { kind: 'tally', key: 'harvested' }, n: 100 },
  { id: 'pottery30', measure: { kind: 'made', good: 'pottery' }, n: 30, from: 'town' },
  { id: 'gardens3', measure: { kind: 'buildings', type: 'garden' }, n: 3, from: 'town' },
  { id: 'sell20', measure: { kind: 'tally', key: 'sold' }, n: 20, routes: 1 },
  { id: 'statue1', measure: { kind: 'buildings', type: 'statue' }, n: 1, from: 'town' },
  { id: 'booth1', measure: { kind: 'buildings', type: 'booth' }, n: 1, from: 'town' },
];
