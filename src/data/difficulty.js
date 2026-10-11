// Difficulty (spec 4.18): chosen when a city starts and fixed for its life. cost multiplies building, road, wall,
// route, rubble-clearing and festival costs, and so tribute, which is priced from towers (never upkeep, wages or
// soldiers' pay: spec 4.11); risk multiplies fire risk build-up and raid size (never raid timing or the first raid's
// size); raids: false is Peaceful, whose city never starts a raid clock. Goals, workers and desirability are the
// same at every level. Each level's score factor lives with the score (src/data/scoring.js).
export const DIFFICULTIES = {
  peaceful: { cost: 0.8, risk: 0.5, raids: false },
  relaxed: { cost: 0.8, risk: 0.5, raids: true },
  normal: { cost: 1, risk: 1, raids: true },
  hard: { cost: 1.25, risk: 1.5, raids: true },
};

// The order the title card and the settings sheet list them in.
export const DIFFICULTY_ORDER = ['peaceful', 'relaxed', 'normal', 'hard'];
