export const ECONOMY = {
  startGold: 2000,
  roadCost: 2,
  wagePerWorker: 4,      // gold per employed worker per month
  debtFloor: -500,       // nothing new can be built once gold would drop below this
  demolishRefund: 0.25,  // share of cost refunded on demolish (roads and plots refund nothing)
  workerShare: 0.4,      // share of residents who work
};

// Stage 4.5 (Task 4b, ruling 316): the forecast's two looks ahead (src/sim/economy.js monthForecast), in months. The top bar's
// gold chip turns amber when the treasury would run out within amberMonths at this month's balance; the one-time warning tip
// fires the first time it would go below 0 within warnMonths. The Town unemployment penalty (src/sim/mood.js) is phased in
// over phaseMonths after the city first reaches Town (ruling 325).
export const FORECAST = { amberMonths: 6, warnMonths: 3, phaseMonths: 6 };
