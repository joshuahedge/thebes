import { migrate } from './migrate.js';
import { BUILDINGS } from '../data/buildings.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { PALACE_STYLES } from '../data/palace.js';
import { PRESTIGE_UNLOCKS } from '../data/monuments.js';
import { STAGE3_TALLY, STAGE4_TALLY, STAGE45_TALLY } from '../sim/world.js';
import { MAP_VARIANTS } from '../data/map.js';

// Every top-level field createWorld produces (src/sim/world.js).
export const REQUIRED = [
  'version', 'seed', 'size', 'day', 'speed', 'gold', 'terrain', 'road', 'occ', 'buildings', 'nextId',
  'mood', 'moodBreakdown', 'milestone', 'labour', 'alerts', 'undo', 'roadVersion', 'tradeEntry',
  'raiderEntries', 'focus', 'stats', 'startRoad', 'goals', 'history',
  'firsts', 'achievements', 'daily', 'guide', 'tally',
  'difficulty', 'trade', 'newItems',
  'wall', 'wallVersion', 'raid', 'soldiers', 'nextUnitId', 'danger', 'splits', 'seals', 'feats', 'cityId',
  'prestigeUnlocks', 'mapVariant',
];

export const TALLY_KEYS = ['harvested', 'profitMonths', 'peakPeople', 'upgrades', 'dailyDone', 'sold', 'bought', 'tradeIncome', 'caravans', ...STAGE3_TALLY, ...STAGE4_TALLY, ...STAGE45_TALLY];
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
  && isDay(d.festivalDay) && typeof d.firePaused === 'boolean' && (d.theftDays === undefined || (Array.isArray(d.theftDays) && d.theftDays.every(Number.isInteger)));
const isFeats = (f) => isRecord(f) && isStrings(f.earned) && isStrings(f.lost) && isCounts(f.counters);
// Stage 4 (version 5): every building's rotation; a monument's site (src/sim/world.js newSite: Track A may add fields
// inside it, never remove these); the palace's style and works; the prestige unlock days.
const isMaterials = (m) => isRecord(m) && Number.isFinite(m.stone) && m.stone >= 0 && Number.isFinite(m.bricks) && m.bricks >= 0;
const isSiteRecord = (s) => isRecord(s) && Number.isInteger(s.course) && s.course >= 0 && isMaterials(s.laid) && isMaterials(s.stock)
  && Number.isFinite(s.carry) && typeof s.extraPaid === 'boolean' && Array.isArray(s.crews) && s.crews.every(Number.isInteger)
  && Number.isInteger(s.idle) && s.idle >= 0 && (s.reason === null || typeof s.reason === 'string') && isCounts(s.month)
  && (s.last === null || isCounts(s.last)) && typeof s.starved === 'boolean' && isDay(s.done);
const isWorks = (k) => k === null || (isRecord(k) && Number.isInteger(k.style) && k.style > 0 && k.style < PALACE_STYLES.length && Number.isInteger(k.left) && k.left >= 0);
function isStage4Building(b) {
  if (b.rot !== 0 && b.rot !== 1) return false;
  const def = BUILDINGS[b.type];
  if (def.monument && !isSiteRecord(b.site)) return false;
  if (def.palace && !(Number.isInteger(b.style) && b.style >= 0 && b.style < PALACE_STYLES.length && isWorks(b.works))) return false;
  return true;
}
// Stage 4.5 (version 6): a home's health and crime risk points and its illness (null or a record; Task 5 owns what is inside).
const isStage45Building = (b) => b.type !== 'house' || (Number.isFinite(b.health) && Number.isFinite(b.crime) && (b.illness === null || isRecord(b.illness)));
const isUnlockDays = (u) => isRecord(u) && PRESTIGE_UNLOCKS.every((k) => isDay(u[k]));

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
  if (!Object.values(w.buildings).every(isStage4Building) || !isUnlockDays(w.prestigeUnlocks)) return false;
  if (typeof w.mapVariant !== 'string' || !MAP_VARIANTS.includes(w.mapVariant) || !Object.values(w.buildings).every(isStage45Building)) return false;
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

// records (Stage 3, spec 4.17): the device's records (src/save/records.js), carried by an export beside the world and
// merged on import; autosaves leave them out.
export function packSave(world, { savedAt = null, lastSpeed = 1, records = null } = {}) {
  return JSON.stringify(records ? { version: SAVE_VERSION, savedAt, lastSpeed, world, records } : { version: SAVE_VERSION, savedAt, lastSpeed, world });
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
    records: !bare && isRecord(obj.records) ? obj.records : null,
  };
}
