// Records on the device (spec 4.19): localStorage RECORDS_KEY ('thebes.records'), separate from the save and read and
// written inside try/catch, so private browsing never breaks the game. Stage 3 contract: Track 0 fixed the API and the
// top-level shape; Track E implements it.
//   { version: 1, cities: [ { id, seed, difficulty, scoreVersion, best, bestDay, medal, splits, updated } ],
//     chronicle: [ { id, cityId, seed, difficulty, day, score, parts, splits, medal, feats, version, date } ] }
// A city row: the city's id, seed and level, its best month-end city score (null until its first month end) with the
// game day and medal of that month and the score version it was made under, the game day it first became each milestone
// (world.splits), and when the device last noted it (ms). A chronicle entry: one per Seal this reign, with the seal's day,
// score, parts and medal, the city's splits and feats earned then, the score version and the device's date (ms).
// Each list keeps at most RECORDS_MAX: the oldest go first (cities by updated, the chronicle by date), never a best (the
// row with the highest score per seed and level, and each milestone's earliest row; the chronicle's highest entry per
// seed and level). boot.js writes a city row on every save, export carries the records beside the world (packSave's
// records) and import merges them by id.
import { RECORDS_KEY, RECORDS_MAX, SCORE_VERSION, SCORE_PARTS, SPLITS, MEDALS, SCORE_FACTOR } from '../data/scoring.js';
import { medalFor } from '../sim/score.js';

export const RECORDS_VERSION = 1;
export const emptyRecords = () => ({ version: RECORDS_VERSION, cities: [], chronicle: [] });

function defaultStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}

// A new city's id (spec 4.19: given by the interface, never by the sim): the time in base 36 and a random tail.
export function newCityId(now = Date.now(), rand = Math.random) {
  return `${Math.floor(now).toString(36)}-${Math.floor(rand() * 36 ** 4).toString(36).padStart(4, '0')}`;
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v) => Number.isInteger(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isLevel = (d) => typeof d === 'string' && Object.hasOwn(SCORE_FACTOR, d);
const isMedal = (m) => m === null || MEDALS.some((x) => x.id === m);
const keyOf = (r) => `${r.seed}|${r.difficulty}`;

// The split days of a splits object (Stage 4: all seven, SPLITS), whole days only, in that order.
function cleanSplits(s) {
  const out = {};
  if (isObj(s)) for (const id of SPLITS) if (isInt(s[id]) && s[id] >= 0) out[id] = s[id];
  return out;
}

// A city row as stored, or null when it is not one (an imported file can hold anything).
function cleanCity(c) {
  if (!isObj(c) || typeof c.id !== 'string' || !c.id || !isInt(c.seed) || !isLevel(c.difficulty)) return null;
  const best = isNum(c.best) ? c.best : null;
  return {
    id: c.id, seed: c.seed, difficulty: c.difficulty, scoreVersion: isInt(c.scoreVersion) ? c.scoreVersion : SCORE_VERSION,
    best, bestDay: best !== null && isInt(c.bestDay) ? c.bestDay : null, medal: best !== null && isMedal(c.medal) ? c.medal : null,
    splits: cleanSplits(c.splits), updated: isNum(c.updated) ? c.updated : 0,
  };
}

// A chronicle entry as stored, or null.
function cleanEntry(e) {
  if (!isObj(e) || typeof e.id !== 'string' || !e.id || typeof e.cityId !== 'string' || !isInt(e.seed) || !isLevel(e.difficulty) || !isNum(e.score)) return null;
  const parts = {};
  for (const p of SCORE_PARTS) parts[p] = isObj(e.parts) && isNum(e.parts[p]) ? e.parts[p] : 0;
  return {
    id: e.id, cityId: e.cityId, seed: e.seed, difficulty: e.difficulty, day: isInt(e.day) ? e.day : 0, score: e.score, parts,
    splits: cleanSplits(e.splits), medal: isMedal(e.medal) ? e.medal : null,
    feats: Array.isArray(e.feats) ? e.feats.filter((f) => typeof f === 'string') : [], version: isInt(e.version) ? e.version : SCORE_VERSION,
    date: isNum(e.date) ? e.date : 0,
  };
}

// Any value read back as records: the well-formed rows and entries, the rest dropped.
export function normalizeRecords(raw) {
  const out = emptyRecords();
  if (!isObj(raw)) return out;
  const ids = new Set();
  for (const c of Array.isArray(raw.cities) ? raw.cities : []) { const r = cleanCity(c); if (r && !ids.has(r.id)) { ids.add(r.id); out.cities.push(r); } }
  const entries = new Set();
  for (const e of Array.isArray(raw.chronicle) ? raw.chronicle : []) { const r = cleanEntry(e); if (r && !entries.has(r.id)) { entries.add(r.id); out.chronicle.push(r); } }
  return out;
}

// The rows no cap may drop: per seed and level the row with the highest best and, per milestone, the row with the
// earliest day; and the chronicle's highest entry per seed and level.
function keptCities(cities) {
  const keep = new Set(), top = new Map(), first = new Map();
  for (const c of cities) {
    const k = keyOf(c);
    if (c.best !== null && (!top.has(k) || c.best > top.get(k).best)) top.set(k, c);
    for (const id of Object.keys(c.splits)) {
      const fk = `${k}|${id}`;
      if (!first.has(fk) || c.splits[id] < first.get(fk).splits[id]) first.set(fk, c);
    }
  }
  for (const c of [...top.values(), ...first.values()]) keep.add(c.id);
  return keep;
}
function keptEntries(chronicle) {
  const top = new Map();
  for (const e of chronicle) { const k = keyOf(e); if (!top.has(k) || e.score > top.get(k).score) top.set(k, e); }
  return new Set([...top.values()].map((e) => e.id));
}
// At most `max` items: the oldest by `age` go first, never a kept one.
function cap(list, max, kept, age) {
  if (list.length <= max) return list;
  const drop = new Set(list.filter((x) => !kept.has(x.id)).sort((a, b) => age(a) - age(b)).slice(0, list.length - max).map((x) => x.id));
  return list.filter((x) => !drop.has(x.id));
}
function capped(r, max = RECORDS_MAX) {
  return {
    version: RECORDS_VERSION,
    cities: cap(r.cities, max, keptCities(r.cities), (c) => c.updated),
    chronicle: cap(r.chronicle, max, keptEntries(r.chronicle), (e) => e.date),
  };
}

// One city's two rows made one: the better best (with its day, medal and version), each milestone's earlier day, the
// later note.
function mergeCity(a, b) {
  const better = b.best !== null && (a.best === null || b.best > a.best) ? b : a;
  const splits = { ...a.splits };
  for (const [id, day] of Object.entries(b.splits)) if (!(id in splits) || day < splits[id]) splits[id] = day;
  const newer = b.updated > a.updated ? b : a;
  return { ...newer, best: better.best, bestDay: better.bestDay, medal: better.medal, scoreVersion: better.scoreVersion, splits: cleanSplits(splits), updated: Math.max(a.updated, b.updated) };
}

// Two records merged by id (a city row keeps its better best and earlier splits; chronicle entries are unique), capped.
export function mergeRecords(a, b) {
  const x = normalizeRecords(a), y = normalizeRecords(b);
  const cities = new Map(x.cities.map((c) => [c.id, c]));
  for (const c of y.cities) cities.set(c.id, cities.has(c.id) ? mergeCity(cities.get(c.id), c) : c);
  const chronicle = [...x.chronicle];
  const seen = new Set(chronicle.map((e) => e.id));
  for (const e of y.chronicle) if (!seen.has(e.id)) { seen.add(e.id); chronicle.push(e); }
  return capped({ cities: [...cities.values()], chronicle });
}

// The parts' total of a month-end row (its raw score), for the medal.
const rawOf = (row) => SCORE_PARTS.reduce((s, p) => s + (isObj(row.parts) && isNum(row.parts[p]) ? row.parts[p] : 0), 0);

export function createRecords({ storage = defaultStorage(), key = RECORDS_KEY, max = RECORDS_MAX } = {}) {
  function read() {
    try {
      const text = storage ? storage.getItem(key) : null;
      return text ? normalizeRecords(JSON.parse(text)) : emptyRecords();
    } catch (e) { return emptyRecords(); }
  }
  function write(r) {
    try { if (storage) storage.setItem(key, JSON.stringify(capped(r, max))); return true; } catch (e) { return false; }
  }
  return {
    // What the device holds, or emptyRecords() when nothing, unreadable or blocked.
    load: read,
    // After every save: this city's row (seed, level, score version, best month-end score, splits). The world keeps 12
    // month-end rows, so the best is the higher of the row's and those rows' scores.
    noteCity(world, now) {
      if (!world || !world.cityId) return;
      const r = read();
      let best = null, bestDay = null, medal = null;
      for (const row of world.history || []) {
        if (isNum(row.score) && (best === null || row.score > best)) { best = row.score; bestDay = row.day; medal = medalFor(rawOf(row)); }
      }
      const row = { id: world.cityId, seed: world.seed, difficulty: world.difficulty, scoreVersion: SCORE_VERSION, best, bestDay, medal, splits: cleanSplits(world.splits), updated: now };
      const i = r.cities.findIndex((c) => c.id === row.id);
      if (i >= 0) r.cities[i] = mergeCity(r.cities[i], row); else r.cities.push(row);
      write(r);
    },
    // After Seal this reign: a chronicle entry for the seal (sealReign's seal), with the device's date; returns it.
    addSeal(world, seal, now) {
      const r = read();
      const entry = cleanEntry({
        id: `${world.cityId || 'city'}:${world.seals.length}:${seal.day}`, cityId: world.cityId || 'city', seed: world.seed, difficulty: world.difficulty,
        day: seal.day, score: seal.score, parts: seal.parts, splits: world.splits, medal: seal.medal, feats: [...world.feats.earned], version: seal.version, date: now,
      });
      if (!entry) return null;
      r.chronicle = r.chronicle.filter((e) => e.id !== entry.id);
      r.chronicle.push(entry);
      write(r);
      return entry;
    },
    // Import: merges records from an exported file into the device's own.
    merge(other) { write(mergeRecords(read(), other)); },
    // The n highest bests, one per seed and level, highest first: { seed, difficulty, score, medal, version, older }
    // (older: made under an earlier score version, so labelled "older scoring").
    bests(n = 3) {
      const top = new Map();
      for (const c of read().cities) {
        if (c.best === null) continue;
        const k = keyOf(c);
        if (!top.has(k) || c.best > top.get(k).best) top.set(k, c);
      }
      return [...top.values()].sort((a, b) => b.best - a.best || a.seed - b.seed).slice(0, n)
        .map((c) => ({ seed: c.seed, difficulty: c.difficulty, score: c.best, medal: c.medal, version: c.scoreVersion, older: c.scoreVersion < SCORE_VERSION }));
    },
    // The personal best on one seed and level, leaving out one city (the one being played): { score, splits } with the
    // highest best (null when none) and the earliest day of each milestone; null when no other city has that seed and level.
    bestFor(seed, difficulty, { except = null } = {}) {
      const rows = read().cities.filter((c) => c.seed === seed && c.difficulty === difficulty && c.id !== except);
      if (!rows.length) return null;
      let score = null;
      const splits = {};
      for (const c of rows) {
        if (c.best !== null && (score === null || c.best > score)) score = c.best;
        for (const [id, day] of Object.entries(c.splits)) if (!(id in splits) || day < splits[id]) splits[id] = day;
      }
      return { score, splits };
    },
    // The sealed reigns, newest first, for the title card's stamps.
    stamps() { return read().chronicle.slice().sort((a, b) => b.date - a.date); },
  };
}
