// Version 9.3 D0 (ruling 1954): the main game's golden fingerprint. Each month end of the six-year Capital (runCapital(72, { dangers: true })) is
// reduced to { day, gold, people, milestone, parts, raids, tally }; tests/v93/d0/golden.json holds the recorded list and every 9.3 track must keep
// matching it. tally holds only the keys that existed before 9.3 (a literal copy of TALLY_KEYS at this commit (the first 9.3 commit)), so keys 9.3 adds never move it.
import { population } from '../../../src/sim/world.js';
import { scoreOf } from '../../../src/sim/score.js';

export const GOLDEN_TALLY_KEYS = ["harvested","profitMonths","peakPeople","upgrades","dailyDone","sold","bought","tradeIncome","caravans","fires","blazesOut","firesOut","burned","rubbleCleared","raids","raidsBeaten","raidsLost","tributes","raidersByTowers","raidersBySoldiers","soldiersWounded","goldStolen","festivals","wallTiles","stoneLaid","bricksLaid","stoneDelivered","bricksDelivered","courses","monumentsDone","enlargements","illnesses","illnessesCured","thefts","theftGold","hunted","fished","floods","crocScares","requestsMet","requestsMissed","gifts","lettersRead","cardsPlayed","archersTrained","chariotsTrained","raidersByArchers","raidersByChariots","unitsSent","oasisBuilds","cartTrips","cartGoods","quotasMet","quotasMissed","plotsLaid","goodSpotPlots","demandsMet","demandsFailed","greatWorkStages","plagues","plagueHomes","quarantines","droughts","swarms","blights","harvestsEarly","wrecked","looted","rebuilt","largePlots","largeUnlocked","eventsOffered","eventsAnswered","eventsLapsed","taxLowMonths","taxHighMonths","coursesRushed","rushGold","luxuryBought","elephantsMet","elephantsFelled","elephantsStampeded","ivoryTaken","spoilsGold","townMonths","fedMonths","tradeGold","billsPaid","lowMonths","highMonths"];

// One month end's row, from the world as runCapital's onMonth sees it (raids: the raids warned so far, world.raid.index).
export function monthRow(w, tallyKeys = GOLDEN_TALLY_KEYS) {
  const tally = {};
  for (const k of tallyKeys) tally[k] = w.tally[k];
  return { day: w.day, gold: Math.round(w.gold), people: population(w), milestone: w.milestone, parts: scoreOf(w).parts, raids: w.raid.index, tally };
}

// The rows of a run's months (the plain list, as JSON would give it back).
export const fingerprint = (rows) => JSON.parse(JSON.stringify(rows));

// The first difference between two fingerprints as 'month N: <key> was A, now B', or null when they match.
export function firstDifference(recorded, fresh) {
  const n = Math.max(recorded.length, fresh.length);
  for (let i = 0; i < n; i++) {
    const a = recorded[i], b = fresh[i];
    if (!a || !b) return `month ${i + 1}: ${a ? 'run ended early' : 'extra month'}`;
    for (const k of Object.keys(a)) {
      const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
      if (x !== y) return `month ${i + 1}: ${k} was ${x}, now ${y}`;
    }
  }
  return null;
}
