import { migrate } from './migrate.js';
import { BUILDINGS } from '../data/buildings.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { STAGE3_TALLY } from '../sim/world.js';

// Every top-level field createWorld produces (src/sim/world.js).
export const REQUIRED = [
  'version', 'seed', 'size', 'day', 'speed', 'gold', 'terrain', 'road', 'occ', 'buildings', 'nextId',
  'mood', 'moodBreakdown', 'milestone', 'labour', 'alerts', 'undo', 'roadVersion', 'tradeEntry',
  'raiderEntries', 'focus', 'stats', 'startRoad', 'goals', 'history',
  'firsts', 'achievements', 'daily', 'guide', 'tally',
  'difficulty', 'trade', 'newItems',
  'wall', 'wallVersion', 'raid', 'soldiers', 'nextUnitId', 'danger', 'splits', 'seals', 'feats', 'cityId',
];

export const TALLY_KEYS = ['harvested', 'profitMonths', 'peakPeople', 'upgrades', 'dailyDone', 'sold', 'bought', 'tradeIncome', 'caravans', ...STAGE3_TALLY];
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isCounts = (v) => isRecord(v) && Object.values(v).every(Number.isFinite);       // tally.made: good -> units
const isStrings = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string');
// The trade state's shape (version 3); what each map holds is the trade code's business.
const isTrade = (t) => isRecord(t) && ['routes', 'orders', 'drift', 'used'].every((k) => isRecord(t[k])) && Number.isInteger(t.year) && t.year >= 1;
// Firsts and achievements: ids, or null for "mark what is already true without celebrating" (a v1 save).
const isIdList = (v) => v === null || (Array.isArray(v) && v.every((id) => typeof id === 'string'));
const isDaily = (d) => d === null || (isRecord(d) && typeof d.date === 'string' && Array.isArray(d.picks)
  && Array.isArray(d.done) && isRecord(d.base) && typeof d.swapped === 'boolean');
// Stage 3 (version 4): the shapes the save must have; what each record holds inside is its module's business.
const isDay = (v) => v === null || Number.isInteger(v);
const isFire = (f) => f === null || (isRecord(f) && (f.stage === 'blaze' || f.stage === 'fire'));
const isRaid = (r) => isRecord(r) && isDay(r.clockDay) && isDay(r.nextWarnDay) && Number.isInteger(r.index) && r.index >= 0
  && (r.warning === null || isRecord(r.warning)) && (r.active === null || isRecord(r.active)) && (r.last === null || isRecord(r.last))
  && Number.isFinite(r.adaptation);
const isDanger = (d) => isRecord(d) && Array.isArray(d.burnDays) && d.burnDays.every(Number.isInteger) && isDay(d.lastFireDay)
  && isDay(d.festivalDay) && typeof d.firePaused === 'boolean';
const isFeats = (f) => isRecord(f) && isStrings(f.earned) && isStrings(f.lost) && isCounts(f.counters);

// The save envelope (spec 4.17): wall-clock fields sit beside the world, never inside it.
export const SAVE_VERSION = 1;

export function serialize(world) {
  return JSON.stringify(world);
}

export function validateWorld(w) {
  for (const k of REQUIRED) if (!(k in w)) return false;
  if (!Number.isInteger(w.size) || w.size <= 0) return false;
  const cells = w.size * w.size;
  for (const k of ['terrain', 'road', 'occ']) if (!Array.isArray(w[k]) || w[k].length !== cells) return false;
  if (!w.buildings || typeof w.buildings !== 'object') return false;
  if (!Number.isInteger(w.day) || !Number.isInteger(w.nextId) || !Number.isFinite(w.gold)) return false;
  for (const b of Object.values(w.buildings)) if (!b || !Object.hasOwn(BUILDINGS, b.type)) return false;   // 1a note: unknown types
  for (const id of w.occ) if (id !== 0 && !Object.hasOwn(w.buildings, id)) return false;                   // 1a note: stray occupancy
  if (!Array.isArray(w.startRoad) || !w.goals || !Array.isArray(w.goals.completed) || !Array.isArray(w.history)) return false;
  if (!Array.isArray(w.goals.triggered) || !isIdList(w.firsts) || !isIdList(w.achievements) || !isDaily(w.daily)) return false;
  if (!isRecord(w.guide) || typeof w.guide.on !== 'boolean' || typeof w.guide.done !== 'boolean') return false;
  if (!isRecord(w.tally) || !TALLY_KEYS.every((k) => Number.isFinite(w.tally[k])) || !isCounts(w.tally.made)) return false;
  if (typeof w.difficulty !== 'string' || !Object.hasOwn(DIFFICULTIES, w.difficulty)) return false;
  if (!isTrade(w.trade) || !isStrings(w.newItems)) return false;
  for (const b of Object.values(w.buildings)) if (!Number.isFinite(b.risk) || !isFire(b.fire)) return false;
  if (!Array.isArray(w.wall) || w.wall.length !== cells || !w.wall.every((v) => Number.isInteger(v) && v >= -1)) return false;
  if (!Number.isInteger(w.wallVersion) || !Number.isInteger(w.nextUnitId) || w.nextUnitId < 1) return false;
  if (!isRaid(w.raid) || !Array.isArray(w.soldiers) || !w.soldiers.every(isRecord) || !isDanger(w.danger)) return false;
  if (!isRecord(w.splits) || !Object.values(w.splits).every(Number.isInteger) || !Array.isArray(w.seals) || !w.seals.every(isRecord)) return false;
  if (!isFeats(w.feats) || !(w.cityId === null || (typeof w.cityId === 'string' && w.cityId.length > 0))) return false;
  return true;
}

function finishLoad(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('corrupt_save');
  const w = migrate(obj);
  if (!validateWorld(w)) throw new Error('corrupt_save');
  return w;
}

// Version is checked before shape, so a newer or older save is reported as such and not as corrupt.
export function deserialize(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('corrupt_save'); }
  return finishLoad(obj);
}

export function packSave(world, { savedAt = null, lastSpeed = 1 } = {}) {
  return JSON.stringify({ version: SAVE_VERSION, savedAt, lastSpeed, world });
}

// A bare world (an early export) is accepted as an envelope with no wall-clock data.
export function unpackSave(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('corrupt_save'); }
  if (!obj || typeof obj !== 'object') throw new Error('corrupt_save');
  const bare = !('world' in obj);
  if (!bare && Number.isInteger(obj.version) && obj.version > SAVE_VERSION) throw new Error('newer_version');
  const world = finishLoad(bare ? obj : obj.world);
  return {
    savedAt: !bare && Number.isFinite(obj.savedAt) ? obj.savedAt : null,
    lastSpeed: !bare && [1, 2, 3].includes(obj.lastSpeed) ? obj.lastSpeed : 1,
    world,
  };
}
