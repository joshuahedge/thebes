// Records on the device (spec 4.19): localStorage RECORDS_KEY ('thebes.records'), separate from the save and read and
// written inside try/catch, so private browsing never breaks the game. Stage 3 contract: Track 0 fixed the API and the
// top-level shape; Track E implements it.
//   { version: 1, cities: [ { id, seed, difficulty, scoreVersion, best, bestDay, medal, splits, updated[, older] } ],
//     chronicle: [ { id, cityId, seed, difficulty, day, score, parts, splits, medal, feats, version, date[, built] } ] }
// A city row: the city's id, seed and level, its best month-end city score (null until its first month end) with the
// game day and medal of that month and the score version it was made under, the game day it first became each milestone
// (world.splits), and when the device last noted it (ms). A chronicle entry: one per Seal this reign, with the seal's day,
// score, parts and medal, the city's splits and feats earned then, the score version and the device's date (ms).
// Each list keeps at most RECORDS_MAX: the oldest go first (cities by updated, the chronicle by date), never a best (the
// row with the highest score per seed and level, and each milestone's earliest row; the chronicle's highest entry per
// seed and level). boot.js writes a city row on every save, export carries the records beside the world (packSave's
// records) and import merges them by id.
// Stage 4 (score v2, spec 4.19, Track D): a best keeps the score version it was made under, with its medal on that
// version's scale, and is never compared with a best of another version. A city row's own best is its newest version's;
// `older` ({ best, bestDay, medal, scoreVersion }, only when there is one) keeps its best from the version before, so a city
// begun under score v1 keeps its v1 best ("older scoring") beside its first v2 one. A month-end row without a `version` is
// a score v1 row. A chronicle entry keeps its own version's parts (a v1 seal has four), and `built` (only when there is
// one) lists the kinds of each finished mastaba and pyramid at the seal, for the stamp's glyphs (STAMP_KINDS).
import { RECORDS_KEY, RECORDS_MAX, SCORE_VERSION, SCORE_PARTS, PARTS_BY_VERSION, SPLITS, MEDALS, SCORE_FACTOR, STAMP_KINDS } from '../data/scoring.js';
import { MONUMENT_KINDS } from '../data/monuments.js';
import { MAP_VARIANTS, DEFAULT_MAP_SIZE, isMapSize } from '../data/map.js';
import { medalFor } from '../sim/score.js';
import { allBuildings, isFinished } from '../sim/world.js';

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
// The river layout a row's city had (Stage 4.5): a known one, else 'classic' (every record from before it was classic).
const variantOf = (v) => (MAP_VARIANTS.includes(v) ? v : 'classic');
// A personal best is per seed, level and river layout. A classic city keeps the key it always had (seed|level), so every record from
// before Stage 4.5 stays where it was; another layout adds its name (seed|level|east).
// Stage 4.6 (ruling 333): a map size other than Normal adds its size too (seed|level|layout|80), so a Normal city keeps the key it always had
// and every record from before stays where it was; a row carries `mapSize` only when it is not Normal.
const sizeOf = (n) => (isMapSize(n) ? n : DEFAULT_MAP_SIZE);
const sizeField = (n) => (sizeOf(n) === DEFAULT_MAP_SIZE ? {} : { mapSize: sizeOf(n) });
const keyOf = (r) => `${r.seed}|${r.difficulty}${variantOf(r.mapVariant) === 'classic' ? '' : `|${r.mapVariant}`}${sizeOf(r.mapSize) === DEFAULT_MAP_SIZE ? '' : `|${sizeOf(r.mapSize)}`}`;

// The split days of a splits object (Stage 4: all seven, SPLITS), whole days only, in that order.
function cleanSplits(s) {
  const out = {};
  if (isObj(s)) for (const id of SPLITS) if (isInt(s[id]) && s[id] >= 0) out[id] = s[id];
  return out;
}

// A city row as stored, or null when it is not one (an imported file can hold anything). Its `older` best stays only when
// it is a best of an earlier version than the row's own.
function cleanCity(c) {
  if (!isObj(c) || typeof c.id !== 'string' || !c.id || !isInt(c.seed) || !isLevel(c.difficulty)) return null;
  const best = isNum(c.best) ? c.best : null;
  const row = {
    id: c.id, seed: c.seed, difficulty: c.difficulty, mapVariant: variantOf(c.mapVariant), ...sizeField(c.mapSize), scoreVersion: isInt(c.scoreVersion) ? c.scoreVersion : SCORE_VERSION,
    best, bestDay: best !== null && isInt(c.bestDay) ? c.bestDay : null, medal: best !== null && isMedal(c.medal) ? c.medal : null,
    splits: cleanSplits(c.splits), updated: isNum(c.updated) ? c.updated : 0,
  };
  const o = c.older;
  if (best !== null && isObj(o) && isNum(o.best) && isInt(o.scoreVersion) && o.scoreVersion < row.scoreVersion) {
    row.older = { best: o.best, bestDay: isInt(o.bestDay) ? o.bestDay : null, medal: isMedal(o.medal) ? o.medal : null, scoreVersion: o.scoreVersion };
  }
  return row;
}

// The bests a city row holds, one per score version it has: [{ best, bestDay, medal, scoreVersion }].
const bestsOf = (c) => [c, c.older].filter((x) => x && x.best !== null).map((x) => ({ best: x.best, bestDay: x.bestDay, medal: x.medal, scoreVersion: x.scoreVersion }));
// A row with these bests: the highest of each version, the newest version's as the row's own and the one before it as
// `older`; a row with none keeps its version and has no best.
function withBests(row, list) {
  const top = new Map();
  for (const x of list) if (!top.has(x.scoreVersion) || x.best > top.get(x.scoreVersion).best) top.set(x.scoreVersion, x);
  const [main, prev] = [...top.values()].sort((a, b) => b.scoreVersion - a.scoreVersion);
  const out = { ...row, best: null, bestDay: null, medal: null };
  delete out.older;
  if (main) Object.assign(out, { scoreVersion: main.scoreVersion, best: main.best, bestDay: main.bestDay, medal: main.medal });
  if (prev) out.older = { ...prev };
  return out;
}

// A chronicle entry as stored, or null.
function cleanEntry(e) {
  if (!isObj(e) || typeof e.id !== 'string' || !e.id || typeof e.cityId !== 'string' || !isInt(e.seed) || !isLevel(e.difficulty) || !isNum(e.score)) return null;
  const version = isInt(e.version) ? e.version : SCORE_VERSION;
  const parts = {};
  for (const p of PARTS_BY_VERSION[version] || SCORE_PARTS) parts[p] = isObj(e.parts) && isNum(e.parts[p]) ? e.parts[p] : 0;   // a v1 seal has four
  const out = {
    id: e.id, cityId: e.cityId, seed: e.seed, difficulty: e.difficulty, mapVariant: variantOf(e.mapVariant), ...sizeField(e.mapSize), day: isInt(e.day) ? e.day : 0, score: e.score, parts,
    splits: cleanSplits(e.splits), medal: isMedal(e.medal) ? e.medal : null,
    feats: Array.isArray(e.feats) ? e.feats.filter((f) => typeof f === 'string') : [], version,
    date: isNum(e.date) ? e.date : 0,
  };
  const built = Array.isArray(e.built) ? e.built.filter((k) => STAMP_KINDS.includes(k)) : [];
  if (built.length) out.built = built;
  return out;
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

// One city's two rows made one: the better best of each score version (never a v1 score against a v2 one: withBests),
// each milestone's earlier day, the later note.
function mergeCity(a, b) {
  const splits = { ...a.splits };
  for (const [id, day] of Object.entries(b.splits)) if (!(id in splits) || day < splits[id]) splits[id] = day;
  const newer = b.updated > a.updated ? b : a;
  return withBests({ ...newer, splits: cleanSplits(splits), updated: Math.max(a.updated, b.updated) }, [...bestsOf(a), ...bestsOf(b)]);
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

// A month-end row's score version (a row without one is a score v1 row: MIGRATIONS[4] marks them, ruling 253).
const rowVersion = (row) => (isInt(row.version) ? row.version : 1);
// The parts' total of a month-end row (its raw score) over its own version's parts, for the medal.
const rawOf = (row) => (PARTS_BY_VERSION[rowVersion(row)] || SCORE_PARTS).reduce((s, p) => s + (isObj(row.parts) && isNum(row.parts[p]) ? row.parts[p] : 0), 0);
// The kinds of each finished mastaba and pyramid standing, in MONUMENT_KINDS order (the stamp's glyphs).
const builtKinds = (world) => allBuildings(world).filter((b) => STAMP_KINDS.includes(b.type) && isFinished(b))
  .map((b) => b.type).sort((x, y) => MONUMENT_KINDS.indexOf(x) - MONUMENT_KINDS.indexOf(y));

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
    // month-end rows, so the best is the higher of the row's and those rows' scores, version by version: each row counts
    // under its own score version, with that version's medal (Stage 4).
    noteCity(world, now) {
      if (!world || !world.cityId) return;
      const r = read();
      const bests = [];
      for (const row of world.history || []) {
        if (isNum(row.score)) bests.push({ best: row.score, bestDay: row.day, medal: medalFor(rawOf(row), rowVersion(row)), scoreVersion: rowVersion(row) });
      }
      const row = withBests({ id: world.cityId, seed: world.seed, difficulty: world.difficulty, mapVariant: variantOf(world.mapVariant), ...sizeField(world.mapSize), scoreVersion: SCORE_VERSION, splits: cleanSplits(world.splits), updated: now }, bests);
      const i = r.cities.findIndex((c) => c.id === row.id);
      if (i >= 0) r.cities[i] = mergeCity(r.cities[i], row); else r.cities.push(row);
      write(r);
    },
    // After Seal this reign: a chronicle entry for the seal (sealReign's seal), with the device's date; returns it.
    addSeal(world, seal, now) {
      const r = read();
      const entry = cleanEntry({
        id: `${world.cityId || 'city'}:${world.seals.length}:${seal.day}`, cityId: world.cityId || 'city', seed: world.seed, difficulty: world.difficulty, mapVariant: world.mapVariant, mapSize: world.mapSize,
        day: seal.day, score: seal.score, parts: seal.parts, splits: world.splits, medal: seal.medal, feats: [...world.feats.earned], version: seal.version, date: now,
        built: builtKinds(world),
      });
      if (!entry) return null;
      r.chronicle = r.chronicle.filter((e) => e.id !== entry.id);
      r.chronicle.push(entry);
      write(r);
      return entry;
    },
    // Import: merges records from an exported file into the device's own.
    merge(other) { write(mergeRecords(read(), other)); },
    // The n highest bests, one per seed, level and score version, highest first: { seed, difficulty, score, medal, version,
    // older } (older: made under an earlier score version, so labelled "older scoring"; Stage 4: a v1 best is listed as
    // itself, never folded into a v2 one).
    bests(n = 3) {
      const top = new Map();
      for (const c of read().cities) {
        for (const x of bestsOf(c)) {
          const k = `${keyOf(c)}|${x.scoreVersion}`;
          if (!top.has(k) || x.best > top.get(k).best) top.set(k, { ...x, seed: c.seed, difficulty: c.difficulty, mapVariant: variantOf(c.mapVariant), mapSize: sizeOf(c.mapSize) });
        }
      }
      return [...top.values()].sort((a, b) => b.best - a.best || a.seed - b.seed).slice(0, n)
        .map((c) => ({ seed: c.seed, difficulty: c.difficulty, ...(c.mapVariant !== 'classic' ? { mapVariant: c.mapVariant } : {}), ...sizeField(c.mapSize), score: c.best, medal: c.medal, version: c.scoreVersion, older: c.scoreVersion < SCORE_VERSION }));
    },
    // The personal best on one seed and level, leaving out one city (the one being played): { score, splits } with the
    // highest best made under score `version` (this version by default; Stage 4: a t1 link asks for 1, ruling 259), null
    // when none, and the earliest day of each milestone; null when no other city has that seed, level and river layout (variant,
    // 'classic' when not given: the layout of every record from before Stage 4.5).
    // Stage 4.6 (ruling 333): and map size (Normal when not given).
    bestFor(seed, difficulty, { except = null, version = SCORE_VERSION, variant = 'classic', size = DEFAULT_MAP_SIZE } = {}) {
      const rows = read().cities.filter((c) => c.seed === seed && c.difficulty === difficulty && variantOf(c.mapVariant) === variantOf(variant) && sizeOf(c.mapSize) === sizeOf(size) && c.id !== except);
      if (!rows.length) return null;
      let score = null;
      const splits = {};
      for (const c of rows) {
        for (const x of bestsOf(c)) if (x.scoreVersion === version && (score === null || x.best > score)) score = x.best;
        for (const [id, day] of Object.entries(c.splits)) if (!(id in splits) || day < splits[id]) splits[id] = day;
      }
      return { score, splits };
    },
    // The sealed reigns, newest first, for the title card's stamps.
    stamps() { return read().chronicle.slice().sort((a, b) => b.date - a.date); },
  };
}
