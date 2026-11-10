// Every art slot the renderer and sprite cache can draw. An entry is
//   { w, d, height, bounds: [left, top, right, bottom], shadows: [[dx, dy, w, d, h], ...], draw(g, x, y) }
// with the footprint in tiles, height and bounds in art px relative to p(x, y) of the footprint origin,
// and shadows as ground-shadow blocks relative to the origin tile. A slot can later point at a PNG by
// replacing `draw` with `png: { src, ax, ay, scale }` (see spriteCache.js); nothing else changes.
import { HOUSE_ART, HOUSE_LOOKS } from './housing.js';
import { SERVICE_ART, SERVICE_LOOKS } from './services.js';
import { INDUSTRY_ART, INDUSTRY_LOOKS } from './industry.js';
import { NATURE_ART } from './nature.js';
import { FIGURE_ART } from './figures.js';
import { DEFENCE_ART, DEFENCE_LOOKS, RUBBLE_VARIANTS } from './defence.js';
import { MONUMENT_ART } from './monuments.js';
import { SUPPLY_ART, SUPPLY_LOOKS, SUPPLY_TYPES, supplyBase } from './supply.js';
import { PLAZA_ART, plazaEdges, sphinxFacing } from './plaza.js';
import { PALACE_ART } from './palace.js';
import { granaryStage, storehouseStage, bazaarStage, farmStage, FARM_TYPES } from './stages.js';
import { S46_ART, s46Slot } from './s46.js';
import { S47_ART } from './s47.js';
import { V70_ART, v70Slot } from './v70.js';
import { TRADE_LOOKS } from './trade.js';
import { FERRY_ART, FERRY_LOOKS } from './ferry.js';
import { BUILDINGS } from '../../data/buildings.js';
import { lookOfBuilding, lookOfBuildingFresh, LOOKS } from '../looks.js';

export { boundsFor } from '../iso.js';

export const ART = {
  ...HOUSE_ART, ...SERVICE_ART, ...INDUSTRY_ART, ...NATURE_ART, ...FIGURE_ART, ...DEFENCE_ART,
  ...SUPPLY_ART, ...PLAZA_ART, ...PALACE_ART, ...MONUMENT_ART,
  ...S46_ART,                                         // Stage 4.6: the River and Armies tracks' buildings and figures (art/s46.js)
  ...S47_ART,                                         // Stage 4.7: the carts (art/s47.js)
  ...V70_ART,                                         // Version 7.0: Track T's Quay, boats and caravans, Track S's season states (art/v70.js)
  ...FERRY_ART,                                       // Version 7.1: Track F's ferry landing and boat (art/ferry.js)
};

// The art slot a building shows: houses by tier, granaries, storehouses and bazaars by how full they are
// (stages.js), and farms by their crop's growth, which runs on the game day, so a farm needs the world (without
// one, its plain type slot). Rubble picks one of its heaps by id, so a burned 2x2 shows four different heaps.
// Stage 4 (Track B): the palace by its style, with scaffolding while it is enlarged (b.works); a builders' guild, quarry
// or brickworks nobody works at shows its idle look (supply.js supplySlot), the brickworks by its drying rows; a plaza by
// which of its neighbours are plazas (plaza.js plazaEdges) and a sphinx by the way it faces (sphinxFacing), both of which
// need the world (without one, their plain slots). Everything else is its type.
// Version 9.3 (Track H, ruling 1893): with { far: true } (the camera at 0.6 or under, FAR_ZOOM) a slot that has a far drawing (ex.far, set for homes below) gives that,
// house.t3.l2.far: one plain drawing per tier and look, no variant and no clutter.
export const FAR_ZOOM = 0.6;
export function slotFor(b, world = null, { far = false } = {}) {
  const base = baseSlotFor(b, world);
  const ex = EXPANDED.get(base);
  if (!ex) return base;                                // a slot no track has put through withLooks keeps today's key
  const look = ex.looks ? (world ? lookOfBuilding(world, b) : 0) : -1;
  if (far && ex.far) return keyOf(ex, base, -2, look, '');
  return keyOf(ex, base, ex.variants > 1 ? homeVariant(b) % ex.variants : -1, look, ex.states ? serviceState(b) : '');
}

// Version 9.3 speed fix (ruling 1940): an expanded key is built once per (base, variant, look, state) and handed back from a table after, so a frame of
// five thousand buildings builds no strings. The table sits on the base's EXPANDED entry; each string is the one expandedKey (or the far name) makes.
const STATE_INDEX = { '': 0, work: 1, short: 2, shut: 3 };
function keyOf(ex, base, variant, look, state) {
  const i = ((variant + 2) * 8 + look + 1) * 4 + STATE_INDEX[state];   // variant -2 is the far drawing's
  const keys = ex.keys || (ex.keys = []);
  return keys[i] || (keys[i] = variant === -2 ? `${base}.l${look}.far` : expandedKey(base, variant, look, state));
}

const HOUSE_BASES = [];
// The slot as it was before the tables above: every key built new and the look worked out new. The speed fix's test holds slotFor to it (tests/v93/x/speed.test.js).
export function slotForFresh(b, world = null, { far = false } = {}) {
  const base = baseSlotFor(b, world);
  const ex = EXPANDED.get(base);
  if (!ex) return base;
  const look = ex.looks ? (world ? lookOfBuildingFresh(world, b) : 0) : -1;
  if (far && ex.far) return `${base}.l${look}.far`;
  return expandedKey(base, ex.variants > 1 ? homeVariant(b) % ex.variants : -1, look, ex.states ? serviceState(b) : '');
}

function baseSlotFor(b, world) {
  const s46 = s46Slot(b, world);                       // Stage 4.6: a River or Armies building's own slot (art/s46.js), else on as before
  if (s46) return s46;
  const v70 = v70Slot(b, world);                       // Version 7.0: a Track T building's or a season's own slot (art/v70.js), else on as before
  if (v70) return v70;
  if (b.type === 'house') return b.large === true && b.tier === 0 ? 'house.lot' : (HOUSE_BASES[b.tier] || (HOUSE_BASES[b.tier] = `house.t${b.tier}`));   // 9.3 speed fix: one string a tier, not one a call   // Version 6.0 (Track C): an empty Large plot is drawn as a marked lot
  if (b.type === 'palace') return `palace.s${b.style || 0}${b.works ? '.w' : ''}`;   // spec 4.20; live monuments are their type
  if (SUPPLY_TYPES.includes(b.type)) return supplyBase(b);   // 9.3 Track B: idle is the shut state now, not a slot of its own
  if (b.type === 'plaza') return world ? `plaza.e${plazaEdges(world, b)}` : 'plaza';
  if (b.type === 'sphinx') return world ? `sphinx.f${sphinxFacing(world, b)}` : 'sphinx';
  if (b.type === 'rubble') return `rubble.v${b.id % RUBBLE_VARIANTS}`;
  if (b.type === 'granary') return `granary.s${granaryStage(b, world)}`;
  if (b.type === 'storehouse') return `storehouse.s${storehouseStage(b)}`;
  if (b.type === 'bazaar') return `bazaar.s${bazaarStage(b)}`;
  if (FARM_TYPES.includes(b.type)) return world ? `${b.type}.g${farmStage(world, b)}` : b.type;
  return b.type;
}

// ---- Version 9.3 (spec sections 2 and 4, ruling 1887): slots that carry a look, a variant and a state ----
// A track puts its table through withLooks, which expands each entry whose draw takes a fourth argument opt = { look, variant, state } into one
// slot per look (and per variant, and per state where asked), and records the base slot as expanded so slotFor appends the suffixes. Order of the
// suffixes: house.t3.v1.l2, bazaar.s1.l2.work. An entry may give boundsFor(look) (and heightFor(look)) where its look changes its size.
export const SERVICE_STATES = ['work', 'short', 'shut'];
export const EXPANDED = new Map();   // base slot -> { looks, variants, states }

const expandedKey = (base, variant, look, state) => `${base}${variant >= 0 ? `.v${variant}` : ''}${look >= 0 ? `.l${look}` : ''}${state ? `.${state}` : ''}`;

export function withLooks(table, { looks = true, variants = 1, states = false } = {}) {
  const out = {};
  for (const [slot, def] of Object.entries(table)) {
    EXPANDED.set(slot, { looks, variants, states });
    for (let v = 0; v < Math.max(1, variants); v++) {
      for (let l = 0; l < (looks ? LOOKS.length : 1); l++) {
        for (const st of states ? SERVICE_STATES : ['']) {
          const opt = { look: looks ? l : 0, variant: v, state: st || 'work' };
          const { boundsFor: bf, heightFor: hf, shadowsFor: sf, ...rest } = def;
          const entry = { ...rest, draw: (g, x, y) => def.draw(g, x, y, opt) };
          if (sf) entry.shadows = sf(opt);   // 9.3 fix wave (H1): shadow blocks that follow the variant's massing
          if (bf) entry.bounds = bf(opt.look);
          if (hf) entry.height = hf(opt.look);
          out[expandedKey(slot, variants > 1 ? v : -1, looks ? l : -1, st)] = entry;
        }
      }
    }
  }
  return out;
}

// A home's variant (0..2): a hash of its tile, so the same house always looks the same.
export const homeVariant = (b) => (((b.x * 73856093) ^ (b.y * 19349663)) >>> 0) % 3;

// A service's or workshop's state from the sim's own staffing: no workers or paused is shut, some but not all is short, full staff is working.
export function serviceState(b) {
  const workers = (BUILDINGS[b.type] && BUILDINGS[b.type].workers) || 0;
  if (workers === 0) return b.paused ? 'shut' : 'work';   // a building that needs nobody (a well) is never short
  if (b.paused || !(b.staff > 0) || b.blocked === 'idle') return 'shut';   // 9.3 Track B: a supply building no site needs (blocked 'idle') employs nobody and is shut
  return b.staff < workers ? 'short' : 'work';
}

// ---- Version 9.3, Track B: services and workshops in four looks and three states ----
// Each of these art files exports a table whose draws take opt = { look, state }; it is expanded here (after EXPANDED above exists: the art files cannot call
// withLooks themselves, they are imported before it) into '<base>.l<look>.<state>' slots, which slotFor then names. The old plain and stage keys ('granary.s2',
// 'storehouse.s1', 'potter', ...) stay as they were for cards and older callers; '<type>.idle' now resolves to the Town look shut.
for (const table of [SERVICE_LOOKS, INDUSTRY_LOOKS, DEFENCE_LOOKS, SUPPLY_LOOKS, TRADE_LOOKS, FERRY_LOOKS]) Object.assign(ART, withLooks(table, { states: true }));
for (const type of SUPPLY_TYPES) ART[`${type}.idle`] = ART[type === 'brickworks' ? 'brickworks.s1.l1.shut' : `${type}.l1.shut`];
// 9.3 fix wave (known item 2, ruling 2005): the plain keys the cards and older callers use (ui/thumbs.js) are the Town look working, so they reach the bar
// as every slot the map shows does. A plain key keeps its name, and now takes its entry (bounds, shadows, draw) from '<base>.l1.work'.
const PLAIN_LOOK = {
  granary: 'granary.s3', bazaar: 'bazaar.s2', storehouse: 'storehouse.s3', brickworks: 'brickworks.s3',
  // (the Quay's plain keys stay Track T's own entries, which the v70 contract test pins by identity; its drawing, quay() in trade.js, has the bar in every state)
  ...Object.fromEntries(['temple', 'physician', 'police_post', 'potter', 'brewery', 'weaver', 'jeweller', 'trading_post', 'firehouse', 'tower', 'barracks',
    'builders_guild', 'gem_mine'].map((k) => [k, k])),
  ...Object.fromEntries([['granary', 4], ['storehouse', 4]].flatMap(([k, n]) => Array.from({ length: n }, (_, s) => [`${k}.s${s}`, `${k}.s${s}`]))),
  ...Object.fromEntries(Array.from({ length: 3 }, (_, s) => [`bazaar.s${s}`, `bazaar.s${s}`])),
  ...Object.fromEntries(Array.from({ length: 3 }, (_, s) => [`brickworks.s${s + 1}`, `brickworks.s${s + 1}`])),
};
for (const [plain, base] of Object.entries(PLAIN_LOOK)) if (ART[`${base}.l1.work`]) ART[plain] = ART[`${base}.l1.work`];

// ---- Version 9.3, Track H: homes in four looks and three variants (rulings 1890-1899) ----
// housing.js exports HOUSE_LOOKS (draws take opt = { look, variant }) and expanded here the same way (Track B's fix for the import cycle) into
// 'house.t<n>.v<v>.l<look>'; its far drawings ('house.t<n>.l<look>.far') are in HOUSE_ART, and marking the base far lets slotFor name them.
// The plain 'house.t<n>' stays for cards (ui/thumbs.js) and older callers: the Village look, variant 0.
Object.assign(ART, withLooks(HOUSE_LOOKS, { variants: 3 }));
for (const base of Object.keys(HOUSE_LOOKS)) { EXPANDED.get(base).far = true; ART[base] = ART[`${base}.v0.l0`]; }
