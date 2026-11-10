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
// Version 9.0 (records version 2, rulings 1561 and 1562; wave 0 wrote the shape, Track D's Pass and Track L's list call it):
//   rulers: [ { id, n, name, title, heir, rank, day, score, parts, medal, version, seed, difficulty, mapVariant, mapSize, map, feats, date[, rival][, mark] } ]
//   rivals: [ { id, name, heir, seed, difficulty, mapVariant, mapSize, score, parts, splits, version, added } ]
//   dynasty: { name, heir }
// A ruler row: one per Pass the throne, never capped. n is the regnal number (1 + the rulers before it of the same name), name the dynasty's
// name then, title the title the reign earned (one of HEIRS), heir the trait the reign played under, rank its milestone at the Pass; map the
// 32 x 32 map square (one base-36 character a cell, '' when none: Track L writes mapSquareOf); rival, when the map had one kept, the newest
// rival as it stood at the Pass; mark is 9.1's. A rival: a friend's score kept from a link with a name, one per name and map (the newer
// replaces the older), at most RIVALS_MAX, the oldest added going first and never one on the map being played. dynasty: the name chosen at
// the first Pass ('' until then) and the heir a new city takes (the Steady on a new device). A version 1 blob reads with the three empty.
import { RECORDS_KEY, RECORDS_MAX, SCORE_VERSION, SCORE_PARTS, PARTS_BY_VERSION, SPLITS, MEDALS, SCORE_FACTOR, STAMP_KINDS } from '../data/scoring.js';
import { MONUMENT_KINDS } from '../data/monuments.js';
import { MAP_VARIANTS, DEFAULT_MAP_SIZE, isMapSize } from '../data/map.js';
import { MILESTONES } from '../data/progression.js';
import { HEIR_DEFAULT, isHeir } from '../data/v90.js';
import { medalFor } from '../sim/score.js';
import { allBuildings, isFinished } from '../sim/world.js';
import { hasNewLand } from '../data/s47.js';
import { isWeekKey, decreeMapOf } from '../data/week.js';

// Version 9.3 (Track S, rulings 1965-1974; records version 3): `decrees` beside the rulers:
//   decrees: [ { id, week, ids, mark, score, parts, medal, day, map, feats, title, name, tries, date } ]
// One row per week (the best ended run of that week, kept for good): week an ISO week key ('2026-47'), ids the decree ids, mark its name ("Sea Peoples, week 47"), score out of
// 600, parts the six parts (the five and the bonus, each 0-100), medal, day the run's end, map the 32 x 32 map square, name the dynasty's name then, tries every ended run of
// that week. A rival row takes an optional `week` (a friend's decree score, kept apart from the main-game rivals). A version 2 blob reads with `decrees: []`.
export const DECREE_PARTS = [...SCORE_PARTS, 'bonus'];
export const RECORDS_VERSION = 3;
export const RIVALS_MAX = 50;                 // rulers are never capped; rivals at most this many (ruling 1561)
export const RULER_NAME_MAX = 16;             // a ruler's name, here and on a link: letters, digits, spaces and '-. (design section 6)
export const RULER_NAME_DEFAULT = 'Ramesses'; // the name a ruler takes before the dynasty has one (the first Pass asks, prefilled with it)
export const MAP_SQUARE = 32;                 // a ruler row's map square: MAP_SQUARE x MAP_SQUARE cells
export const newDynasty = () => ({ name: '', heir: HEIR_DEFAULT });
export const emptyRecords = () => ({ version: RECORDS_VERSION, cities: [], chronicle: [], rulers: [], rivals: [], dynasty: newDynasty(), decrees: [] });

// A ruler's or a rival's name as kept: letters and digits of any script, spaces and '-. only, spaces run together, at most RULER_NAME_MAX; ''
// when nothing is left.
export function cleanName(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/[^\p{L}\p{N} '\-.]/gu, '').replace(/\s+/g, ' ').trim().slice(0, RULER_NAME_MAX).trim();
}

// The map square a ruler row keeps, a MAP_SQUARE * MAP_SQUARE string of base-36 cells (row by row), or '' for none. Version 9.0 Track L (ruling 1591):
// a cell is one character that names the colour share.js drawMapSquare would paint there: 0-7 the eight grounds (src/sim/terrain.js T: desert,
// fertile, rocky, water, bank, meadow, clay, hills), 8 a rock belt's rock on a map with new land, 9 a road, a a house not yet built up (a plot), b a
// built-up house, c any other building. share.js mapSquareColour turns a code into its colour; decodeMapSquare gives the codes back.
export const MAP_CELL = { belt: '8', road: '9', plot: 'a', house: 'b', building: 'c' };
const ROCKY = 2;                                     // terrain.js T.ROCKY (the belt's colour replaces it on a map with new land)
export function mapSquareOf(world) {
  if (!world || !Number.isInteger(world.size) || world.size < 1 || !world.terrain) return '';
  const n = world.size, m = MAP_SQUARE, land = hasNewLand(world);
  const over = new Uint8Array(n * n);                // what stands on each tile: 0 nothing, 1 a plot, 2 a house, 3 another building
  for (const b of allBuildings(world)) {
    const kind = b.type === 'house' ? (b.tier > 0 ? 2 : 1) : 3;
    for (let y = Math.max(0, b.y); y < Math.min(n, b.y + b.d); y++) for (let x = Math.max(0, b.x); x < Math.min(n, b.x + b.w); x++) over[y * n + x] = Math.max(over[y * n + x], kind);
  }
  let out = '';
  for (let cy = 0; cy < m; cy++) {
    for (let cx = 0; cx < m; cx++) {
      const x0 = Math.floor((cx * n) / m), x1 = Math.max(x0 + 1, Math.floor(((cx + 1) * n) / m));   // the tiles this cell covers (a map under 32 wide gives some cells a tile each)
      const y0 = Math.floor((cy * n) / m), y1 = Math.max(y0 + 1, Math.floor(((cy + 1) * n) / m));
      let most = 0, road = false;
      for (let y = y0; y < Math.min(n, y1); y++) {
        for (let x = x0; x < Math.min(n, x1); x++) {
          most = Math.max(most, over[y * n + x]);
          if (world.road && world.road[y * n + x]) road = true;
        }
      }
      if (most === 3) out += MAP_CELL.building;
      else if (most === 2) out += MAP_CELL.house;
      else if (most === 1) out += MAP_CELL.plot;
      else if (road) out += MAP_CELL.road;
      else {
        const t = world.terrain[Math.min(n - 1, (y0 + y1 - 1) >> 1) * n + Math.min(n - 1, (x0 + x1 - 1) >> 1)];
        out += land && t === ROCKY ? MAP_CELL.belt : Number.isInteger(t) && t >= 0 && t <= 7 ? String(t) : '0';
      }
    }
  }
  return out;
}
const MAP_RE = new RegExp(`^[0-9a-z]{${MAP_SQUARE * MAP_SQUARE}}$`);
// A map square as its cell codes, MAP_SQUARE * MAP_SQUARE numbers (0 to 35, row by row), or null when the string is not one (not 1,024 base-36 characters).
export function decodeMapSquare(text) {
  if (typeof text !== 'string' || !MAP_RE.test(text)) return null;
  return Array.from(text, (c) => parseInt(c, 36));
}

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

// A score's parts under its own version's list (a v1 score has four), each a number, 0 when missing.
function cleanParts(parts, version) {
  const out = {};
  for (const p of PARTS_BY_VERSION[version] || SCORE_PARTS) out[p] = isObj(parts) && isNum(parts[p]) ? parts[p] : 0;
  return out;
}
const MILESTONE_IDS = MILESTONES.map((m) => m.id);
// A rival's id: its name and its map's key, so the same name on the same map is the same rival (ruling 1561).
const rivalId = (r) => (r.week ? `${r.name}@decree.${r.week}` : `${r.name}@${keyOf(r)}`);   // a decree rival is one per name and week

// A decree's six parts as stored (each a whole number 0-100), or null when any is missing or out of range.
function cleanDecreeParts(parts) {
  if (!isObj(parts)) return null;
  const out = {};
  for (const p of DECREE_PARTS) { if (!isInt(parts[p]) || parts[p] < 0 || parts[p] > 100) return null; out[p] = parts[p]; }
  return out;
}

// A decree row as stored, or null (a bad week, bad parts or no score). The id is always the week's.
function cleanDecree(x) {
  if (!isObj(x) || !isWeekKey(x.week) || !isNum(x.score)) return null;
  const parts = cleanDecreeParts(x.parts);
  if (!parts) return null;
  return {
    id: typeof x.id === 'string' && x.id.startsWith(`decree:${x.week}:`) ? x.id : `decree:${x.week}:${isNum(x.date) ? x.date : 0}`, week: x.week, ids: Array.isArray(x.ids) ? x.ids.filter((i) => typeof i === 'string') : [], mark: typeof x.mark === 'string' ? x.mark.slice(0, 60) : '',
    score: x.score, parts, medal: isMedal(x.medal) ? x.medal : null, day: isInt(x.day) && x.day >= 0 ? x.day : 0, map: typeof x.map === 'string' && MAP_RE.test(x.map) ? x.map : '',
    feats: Array.isArray(x.feats) ? x.feats.filter((f) => typeof f === 'string') : [], title: typeof x.title === 'string' ? x.title.slice(0, 40) : '', name: cleanName(x.name),
    tries: isInt(x.tries) && x.tries >= 1 ? x.tries : 1, date: isNum(x.date) ? x.date : 0,
  };
}
// Two rows of one week made one: the higher score's row, a tie to `a` (this device's), the tries added.
// Same id (this device's own row, re-imported from its export): the larger tries; different ids (two devices): the tries added. The kept row keeps a's id.
const mergeDecree = (a, b) => ({ ...(b.score > a.score ? b : a), id: a.id, tries: a.id === b.id ? Math.max(a.tries, b.tries) : a.tries + b.tries });
// The fallback mark when the caller gives none: the decree ids as words, then the week ("Sea peoples, week 47").
const markOf = (ids, week) => `${ids.map((i) => i.replace(/_/g, ' ')).join(' and ').replace(/^./, (c) => c.toUpperCase())}, week ${Number(week.slice(5))}`;

// The rival a ruler row keeps (the newest on its map at the Pass), or null.
function cleanRivalSnap(v) {
  if (!isObj(v)) return null;
  const name = cleanName(v.name);
  if (!name || !isNum(v.score)) return null;
  const version = isInt(v.version) ? v.version : SCORE_VERSION;
  return { id: typeof v.id === 'string' ? v.id : name, name, heir: isHeir(v.heir) ? v.heir : HEIR_DEFAULT, score: v.score, parts: cleanParts(v.parts, version), splits: cleanSplits(v.splits), version };
}

// A ruler row as stored, or null when it is not one.
function cleanRuler(r) {
  if (!isObj(r) || typeof r.id !== 'string' || !r.id || !isInt(r.seed) || !isLevel(r.difficulty) || !isNum(r.score)) return null;
  const name = cleanName(r.name);
  if (!name) return null;
  const version = isInt(r.version) ? r.version : SCORE_VERSION;
  const out = {
    id: r.id, n: isInt(r.n) && r.n >= 1 ? r.n : 1, name, title: isHeir(r.title) ? r.title : HEIR_DEFAULT, heir: isHeir(r.heir) ? r.heir : HEIR_DEFAULT,
    rank: MILESTONE_IDS.includes(r.rank) ? r.rank : null, day: isInt(r.day) && r.day >= 0 ? r.day : 0, score: r.score, parts: cleanParts(r.parts, version),
    medal: isMedal(r.medal) ? r.medal : null, version, seed: r.seed, difficulty: r.difficulty, mapVariant: variantOf(r.mapVariant), mapSize: sizeOf(r.mapSize),
    map: typeof r.map === 'string' && MAP_RE.test(r.map) ? r.map : '', feats: Array.isArray(r.feats) ? r.feats.filter((f) => typeof f === 'string') : [],
    date: isNum(r.date) ? r.date : 0,
  };
  const rival = cleanRivalSnap(r.rival);
  if (rival) out.rival = rival;
  if (typeof r.mark === 'string' && r.mark) out.mark = r.mark.slice(0, 60);   // 9.1's ("Sea Peoples, week 44"); absent in 9.0
  return out;
}

// A rival as stored, or null. Its id is always its name and map's.
function cleanRival(v) {
  if (isObj(v) && isWeekKey(v.week)) {     // Version 9.3: a friend's decree score; the seed is the week's, Normal, and the parts are the six
    const name = cleanName(v.name), parts = cleanDecreeParts(v.parts);
    if (!name || !parts || !isNum(v.score)) return null;
    const out = { name, heir: isHeir(v.heir) ? v.heir : HEIR_DEFAULT, ...decreeMapOf(v.week), difficulty: 'normal', mapSize: DEFAULT_MAP_SIZE, score: v.score, parts, splits: cleanSplits(v.splits), version: SCORE_VERSION, added: isNum(v.added) ? v.added : 0, week: v.week };
    return { id: rivalId(out), ...out };
  }
  if (!isObj(v) || !isInt(v.seed) || v.seed < 0 || !isLevel(v.difficulty) || !isNum(v.score)) return null;
  const name = cleanName(v.name);
  if (!name) return null;
  const version = isInt(v.version) ? v.version : SCORE_VERSION;
  const out = {
    name, heir: isHeir(v.heir) ? v.heir : HEIR_DEFAULT, seed: v.seed, difficulty: v.difficulty, mapVariant: variantOf(v.mapVariant), mapSize: sizeOf(v.mapSize),
    score: v.score, parts: cleanParts(v.parts, version), splits: cleanSplits(v.splits), version, added: isNum(v.added) ? v.added : 0,
  };
  return { id: rivalId(out), ...out };
}

function cleanDynasty(d) {
  const out = newDynasty();
  if (!isObj(d)) return out;
  return { name: cleanName(d.name), heir: isHeir(d.heir) ? d.heir : out.heir };
}

// Rivals by id, the newer added winning a tie of ids.
function addRivalTo(map, v) { if (!map.has(v.id) || v.added >= map.get(v.id).added) map.set(v.id, v); }

// Any value read back as records: the well-formed rows and entries, the rest dropped. A version 1 blob has no rulers, rivals or dynasty, and
// reads with the three empty.
export function normalizeRecords(raw) {
  const out = emptyRecords();
  if (!isObj(raw)) return out;
  const ids = new Set();
  for (const c of Array.isArray(raw.cities) ? raw.cities : []) { const r = cleanCity(c); if (r && !ids.has(r.id)) { ids.add(r.id); out.cities.push(r); } }
  const entries = new Set();
  for (const e of Array.isArray(raw.chronicle) ? raw.chronicle : []) { const r = cleanEntry(e); if (r && !entries.has(r.id)) { entries.add(r.id); out.chronicle.push(r); } }
  const rulers = new Set();
  for (const x of Array.isArray(raw.rulers) ? raw.rulers : []) { const r = cleanRuler(x); if (r && !rulers.has(r.id)) { rulers.add(r.id); out.rulers.push(r); } }
  const rivals = new Map();
  for (const x of Array.isArray(raw.rivals) ? raw.rivals : []) { const r = cleanRival(x); if (r) addRivalTo(rivals, r); }
  out.rivals = [...rivals.values()];
  out.dynasty = cleanDynasty(raw.dynasty);
  const weeks = new Map();
  for (const x of Array.isArray(raw.decrees) ? raw.decrees : []) { const r = cleanDecree(x); if (r) weeks.set(r.week, weeks.has(r.week) ? mergeDecree(weeks.get(r.week), r) : r); }
  out.decrees = [...weeks.values()];
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
// The rivals on one map (a world, or anything with seed, difficulty, mapVariant and mapSize): their ids, which no cap drops.
const rivalsOnMap = (rivals, map) => new Set(map ? rivals.filter((v) => !v.week && keyOf(v) === keyOf(map)).map((v) => v.id) : []);
// playing: the map being played, whose rivals the rivals' cap never drops (ruling 1561). Rulers are never capped.
function capped(r, max = RECORDS_MAX, playing = null) {
  const rivals = r.rivals || [];
  return {
    version: RECORDS_VERSION,
    cities: cap(r.cities, max, keptCities(r.cities), (c) => c.updated),
    chronicle: cap(r.chronicle, max, keptEntries(r.chronicle), (e) => e.date),
    rulers: r.rulers || [],
    rivals: cap(rivals, RIVALS_MAX, rivalsOnMap(rivals, playing), (v) => v.added),
    dynasty: r.dynasty || newDynasty(),
    decrees: r.decrees || [],
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
// Version 9.0 (ruling 1561): rulers by id (the first records' row kept when both have it: it is the same Pass), rivals by name and map (the
// newer added kept). The dynasty: see mergedDynasty.
// Version 9.0 (fix wave, ruling 1634): the dynasty after merging b into a. A device that has rulers keeps its own dynasty (a file never changes the heir or the
// name; only a name the device lacks is filled). A device with no rulers (a new device restoring) takes the file's dynasty, its heir too when the file has rulers.
export function mergedDynasty(a, b) {
  const x = normalizeRecords(a), y = normalizeRecords(b);
  if (x.rulers.length) return { name: x.dynasty.name || y.dynasty.name, heir: x.dynasty.heir };
  return { name: y.dynasty.name || x.dynasty.name, heir: y.rulers.length ? y.dynasty.heir : x.dynasty.heir };
}
export function mergeRecords(a, b) {
  const x = normalizeRecords(a), y = normalizeRecords(b);
  const cities = new Map(x.cities.map((c) => [c.id, c]));
  for (const c of y.cities) cities.set(c.id, cities.has(c.id) ? mergeCity(cities.get(c.id), c) : c);
  const chronicle = [...x.chronicle];
  const seen = new Set(chronicle.map((e) => e.id));
  for (const e of y.chronicle) if (!seen.has(e.id)) { seen.add(e.id); chronicle.push(e); }
  const rulers = [...x.rulers];
  const known = new Set(rulers.map((r) => r.id));
  for (const r of y.rulers) if (!known.has(r.id)) { known.add(r.id); rulers.push(r); }
  const rivals = new Map(x.rivals.map((v) => [v.id, v]));
  for (const v of y.rivals) addRivalTo(rivals, v);
  const dynasty = mergedDynasty(x, y);
  const weeks = new Map(x.decrees.map((d) => [d.week, d]));   // by week: the higher score, this device's row on a tie, the tries added
  for (const d of y.decrees) weeks.set(d.week, weeks.has(d.week) ? mergeDecree(weeks.get(d.week), d) : d);
  return capped({ cities: [...cities.values()], chronicle, rulers, rivals: [...rivals.values()], dynasty, decrees: [...weeks.values()] });
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
  function write(r, playing = null) {
    try { if (storage) storage.setItem(key, JSON.stringify(capped(r, max, playing))); return true; } catch (e) { return false; }
  }
  // A map's kept rivals, newest added first.
  const rivalsOf = (r, map) => r.rivals.filter((v) => !v.week && keyOf(v) === keyOf(map)).sort((p, q) => q.added - p.added);
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

    // Version 9.0 (wave 0, ruling 1562): the rulers, the rivals and the dynasty. Track D's Pass calls addRuler and setDynasty; Track L's list,
    // links and toast call the rest.
    // Pass the throne: the ruler row for this city (seal: the seal the Pass made, sealReign's; title: the title it earned, one of HEIRS), with
    // the dynasty's name ('Ramesses' before it has one) and the next regnal number for that name, the map's newest rival as it stands now, and
    // the device's date; returns it, or null when it is not one. The row's id is the city's and the seal's day, so a second call replaces it.
    addRuler(world, seal, title, now) {
      const r = read();
      const name = r.dynasty.name || RULER_NAME_DEFAULT;
      const id = `${world.cityId || 'city'}:${seal.day}`;
      const others = r.rulers.filter((x) => x.id !== id);
      const rival = rivalsOf(r, world)[0] || null;
      const row = cleanRuler({
        id, n: others.filter((x) => x.name === name).length + 1, name, title, heir: world.heir, rank: world.milestone, day: seal.day,
        score: seal.score, parts: seal.parts, medal: seal.medal, version: seal.version,
        seed: world.seed, difficulty: world.difficulty, mapVariant: world.mapVariant, mapSize: world.mapSize, map: mapSquareOf(world),
        feats: [...world.feats.earned], date: now, rival,
      });
      if (!row) return null;
      r.rulers = [...others, row];
      write(r, world);
      return row;
    },
    // Every ruler, newest first (the later Pass first; the higher regnal number on the same date).
    rulers() { return read().rulers.sort((a, b) => b.date - a.date || b.n - a.n); },
    // The dynasty: { name ('' until the first Pass names it), heir (the trait a new city takes) }.
    dynasty() { return read().dynasty; },
    // Changes the dynasty's name or heir (a name that cleans to nothing, or an heir not in HEIRS, leaves that one as it was); returns it.
    setDynasty(patch = {}) {
      const r = read();
      const name = isObj(patch) && 'name' in patch ? cleanName(patch.name) : '';
      r.dynasty = { name: name || r.dynasty.name, heir: isObj(patch) && isHeir(patch.heir) ? patch.heir : r.dynasty.heir };
      write(r);
      return { ...r.dynasty };
    },
    // A friend's link opened (parseShareLink's reading, with Track L's name and heir): kept as a rival on its map, replacing the same name's
    // older row there; returns the row, or null when the link has no name or is not a good one. playing: the map being played (a world), whose
    // rivals the cap of RIVALS_MAX never drops. The score is the link's own when it has one, else its parts' total times its level's factor
    // (share.js sharedTotal's sum).
    addRival(link, now, { playing = null, week = null } = {}) {
      const wk = isWeekKey(week) ? week : isObj(link) && isWeekKey(link.week) ? link.week : null;   // Version 9.3: a decree link (or the week given) keeps the rival on that week
      if (wk) {
        if (!isObj(link) || link.ok === false) return null;
        const six = cleanDecreeParts(link.parts);
        if (!six) return null;
        const score = isNum(link.score) ? link.score : Object.values(six).reduce((s, n) => s + n, 0);
        const row = cleanRival({ ...link, week: wk, score, added: now });
        if (!row) return null;
        const r = read();
        r.rivals = [...r.rivals.filter((v) => v.id !== row.id), row];
        write(r, playing);
        return row;
      }
      if (!isObj(link) || link.ok === false || !isObj(link.parts) || !isLevel(link.difficulty)) return null;
      const score = isNum(link.score) ? link.score : Math.round(Object.values(link.parts).reduce((s, v) => s + (isNum(v) ? v : 0), 0) * SCORE_FACTOR[link.difficulty]);
      const row = cleanRival({ ...link, mapVariant: link.mapVariant || link.variant, mapSize: link.mapSize || link.size, score, added: now });
      if (!row) return null;
      const r = read();
      r.rivals = [...r.rivals.filter((v) => v.id !== row.id), row];
      write(r, playing);
      return row;
    },
    // The rivals kept on one map (seed, level, river layout and size, as bestFor), newest added first.
    rivalsFor(seed, difficulty, variant = 'classic', size = DEFAULT_MAP_SIZE) {
      return rivalsOf(read(), { seed, difficulty, mapVariant: variant, mapSize: size });
    },

    // Version 9.3 (Track S, rulings 1965-1974): the decree's rows and rivals.
    // At a decree run's end: the week's row, replaced when this score is higher, with `tries` always one more. world: the ended decree world (world.decree has week and ids).
    // score: decreeScore(world)'s { total, parts (six), medal } (the caller passes it: the sim's score is track R's); mark: the week's name when the caller has the words ("Sea Peoples, week 47"),
    // title: the heir's title. Returns the stored row, or null when this is no decree world or the score is not a good one.
    noteDecree(world, { now = 0, score = null, mark = '', title = '' } = {}) {
      const d = world && world.decree;
      if (!d || !isWeekKey(d.week) || !isObj(score)) return null;
      const r = read();
      const old = r.decrees.find((x) => x.week === d.week);
      const ids = Array.isArray(d.ids) ? d.ids : [];
      const row = cleanDecree({
        week: d.week, ids, mark: mark || markOf(ids, d.week), score: score.total, parts: score.parts, medal: score.medal, day: world.day, map: mapSquareOf(world),
        feats: world.feats && world.feats.earned ? [...world.feats.earned] : [], title, name: r.dynasty.name, tries: 1, date: now,
      });
      if (!row) return null;
      const next = old ? { ...(row.score > old.score ? row : old), id: old.id, tries: old.tries + 1 } : row;
      r.decrees = [...r.decrees.filter((x) => x.week !== d.week), next];
      write(r);
      return next;
    },
    // Every decree row, newest date first (the later week first on the same date).
    decrees() { return read().decrees.sort((a, b) => b.date - a.date || (a.week < b.week ? 1 : -1)); },
    // One week's row, or null.
    decreeOf(week) { return read().decrees.find((x) => x.week === week) || null; },
    // The rivals kept on one week, best score first.
    rivalsForWeek(week) { return read().rivals.filter((v) => v.week === week).sort((p, q) => q.score - p.score || q.added - p.added); },
  };
}
