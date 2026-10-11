// Records on the device (spec 4.19): localStorage RECORDS_KEY ('thebes.records'), separate from the save and read and
// written inside try/catch, so private browsing never breaks the game. Stage 3 contract: Track 0 fixed the API and the
// top-level shape; Track E implements the STUBs and the rows' fields.
//   { version: 1, cities: [ { id, seed, difficulty, scoreVersion, best, splits, updated } ],
//     chronicle: [ { id, cityId, seed, difficulty, day, score, parts, splits, medal, feats, version, date } ] }
// Each list keeps at most RECORDS_MAX (the oldest go first, never a best). boot.js writes a city row on every save,
// export carries the records beside the world (packSave's records) and import merges them by id.
import { RECORDS_KEY } from '../data/scoring.js';

export const RECORDS_VERSION = 1;
export const emptyRecords = () => ({ version: RECORDS_VERSION, cities: [], chronicle: [] });

function defaultStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}

// A new city's id (spec 4.19: given by the interface, never by the sim): the time in base 36 and a random tail.
export function newCityId(now = Date.now(), rand = Math.random) {
  return `${Math.floor(now).toString(36)}-${Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0')}`;
}

// STUB. Two records merged by id (a city row keeps its better best and earlier splits; chronicle entries are unique).
export function mergeRecords(a, b) {
  return a || emptyRecords();
}

export function createRecords({ storage = defaultStorage(), key = RECORDS_KEY } = {}) {
  return {
    // STUB. What the device holds, or emptyRecords() when nothing, unreadable or blocked.
    load() { return emptyRecords(); },
    // STUB. After every save: updates this city's row (seed, difficulty, score version, best month-end score, splits).
    noteCity(world, now) {},
    // STUB. After Seal this reign: adds a chronicle entry for the seal (sealReign's seal), with the device's date.
    addSeal(world, seal, now) {},
    // STUB. Import: merges records from an exported file into the device's own.
    merge(other) {},
    // STUB. The three highest bests per seed and difficulty, for the title card.
    bests(n = 3) { return []; },
  };
}
