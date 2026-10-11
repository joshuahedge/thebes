// Difficulty (spec 4.18): chosen when a city starts and fixed for its life. cost multiplies building, road and
// route costs (never upkeep or wages: spec 4.11); risk multiplies fire and raid risk, which arrive in Stage 3,
// so Stage 2 only stores it. Goals, workers and desirability are the same at every level.
export const DIFFICULTIES = {
  relaxed: { cost: 0.8, risk: 0.5 },
  normal: { cost: 1, risk: 1 },
  hard: { cost: 1.25, risk: 1.5 },
};

// The order the title card and the settings sheet list them in.
export const DIFFICULTY_ORDER = ['relaxed', 'normal', 'hard'];
