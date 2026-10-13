// Wildlife on screen (Stage 4.6, River track, rulings 335, 367): the herds (world.wildlife) and the render-only ibis, herons, hippos,
// crocodiles and jumping fish, at most WILDLIFE.ambientCap animals drawn at once (the herds' animals first, then the rest nearest the
// middle of the view); under Gentle they move slowly, under Still they stand. Hunters and the wharf's boat are figures too, outside the
// cap. The River track owns this file. Called through src/render/s46.js s46Walkers.
//
// Nothing here is saved or drawn from a sim draw: positions are hash2 of a herd's id or a tile (RIVER_SALT.ambient), so the same
// city shows the same life every time. Figure ids: WILDLIFE_ID_BASE + a number below 600000 (units 100000+, processions 200000+,
// dedications 600000+, streamers 900000+, newcomers 1200000+), in three ranges that never meet (wildlifeIds; the final
// review found a lodge with id 5000 took the boat id of building 0): herd animals, then tile animals, then lodge and wharf figures.
import { BUILDINGS } from '../data/buildings.js';
import { WILDLIFE, HUNTING, RIVER_SALT } from '../data/river.js';
import { hash2 } from '../sim/rng.js';
import { idx, inBounds } from '../sim/grid.js';
import { T } from '../sim/terrain.js';
import { crocSpots, herdsInReach, wildlifeOn } from '../sim/wildlife.js';
import { wharfSide } from './art/river.js';
import { MIN_STAFF_RATIO } from '../data/labour.js';

export const WILDLIFE_ID_BASE = 1400000;
// The three ranges, each its own: a herd animal herd id x 16 + i (i below 16; herd ids below 12500), a tile animal 200000 + tile x 4 + slot (a
// bird 0, hippo 1, crocodile 2, leap 3; maps up to 158 tiles a side), a lodge or wharf figure 300000 + building id x 3 + slot (hunters 0 and 1,
// the boat 2; building ids below 100000). A building owns its three slots, so a hunter and a boat can never share an id.
export const TILE_SLOT = { bird: 0, hippo: 1, croc: 2, leap: 3 };
export const wildlifeIds = {
  herd: (herdId, i) => WILDLIFE_ID_BASE + herdId * 16 + i,
  tile: (slot, tile) => WILDLIFE_ID_BASE + 200000 + tile * 4 + TILE_SLOT[slot],
  hunter: (buildingId, k) => WILDLIFE_ID_BASE + 300000 + buildingId * 3 + k,
  boat: (buildingId) => WILDLIFE_ID_BASE + 300000 + buildingId * 3 + 2,
};

const SALT = RIVER_SALT.ambient;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wet = (world, x, y) => inBounds(world.size, x, y) && world.terrain[idx(world.size, x, y)] === T.WATER;

// How much a motion level moves things: Full a calm drift, Gentle half that pace and reach, Still none.
const MOVE = { full: { amp: 0.35, pace: 0.22, walk: 1.5 }, gentle: { amp: 0.2, pace: 0.11, walk: 0.9 }, still: { amp: 0, pace: 0, walk: 0 } };
const moveOf = (motion) => MOVE[motion] || MOVE.full;

// ── Render-only spots, worked out once from the terrain ──
// birds: dry tiles beside water (a share of them), hippos: water tiles with water all round, leaps: water tiles. Cached on the terrain.
const spotCache = new WeakMap();
export function ambientSpots(world) {
  const hit = spotCache.get(world.terrain);
  if (hit && hit.seed === world.seed) return hit;
  const n = world.size, birds = [], hippos = [], leaps = [];
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      const i = idx(n, x, y), h = hash2(x, y, (world.seed + SALT) | 0);
      if (world.terrain[i] === T.WATER) {
        const deep = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].every(([dx, dy]) => wet(world, x + dx, y + dy));
        if (deep && h < 0.02) hippos.push({ i, x, y, h: hash2(x, y, (world.seed + SALT + 1) | 0) });
        else if (h > 0.9) leaps.push({ i, x, y, h: hash2(x, y, (world.seed + SALT + 2) | 0) });
      } else if (world.terrain[i] !== T.FERTILE && h < 0.12 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => wet(world, x + dx, y + dy))) {
        birds.push({ i, x, y, h: hash2(x, y, (world.seed + SALT + 3) | 0) });
      }
    }
  }
  const out = { seed: world.seed, birds, hippos, leaps };
  spotCache.set(world.terrain, out);
  return out;
}

const inRange = (range, x, y, m = 2) => x >= range.x0 - m && x <= range.x1 + m && y >= range.y0 - m && y <= range.y1 + m;
const viewMid = (range) => ({ x: (range.x0 + range.x1) / 2, y: (range.y0 + range.y1) / 2 });

// ── Herds ──
// The animals of one herd: [{ x, y, kind }] positions in tiles; the herd walks from where it stood to where it stands over moveEvery days
// (px, py, moved), and each animal keeps its own place about the centre and drifts a little about it.
export function herdAnimals(world, h, timeDays, motion) {
  const m = moveOf(motion);
  const f = motion === 'still' ? 1 : clamp((timeDays - (h.moved ?? -1e9)) / WILDLIFE.moveEvery, 0, 1);
  const cx = (h.px ?? h.x) + (h.x - (h.px ?? h.x)) * f + 0.5, cy = (h.py ?? h.y) + (h.y - (h.py ?? h.y)) * f + 0.5;
  const out = [];
  for (let i = 0; i < h.size; i++) {
    const a = hash2(h.id, i, (world.seed + SALT + 10) | 0) * Math.PI * 2, r = 0.25 + hash2(h.id, i + 40, (world.seed + SALT + 11) | 0) * 0.95;
    const phase = timeDays * m.pace + hash2(h.id, i + 80, (world.seed + SALT + 12) | 0) * Math.PI * 2;
    let x = cx + Math.cos(a) * r + Math.sin(phase) * m.amp, y = cy + Math.sin(a) * r + Math.cos(phase * 0.8) * m.amp;
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!inBounds(world.size, tx, ty) || world.terrain[idx(world.size, tx, ty)] === T.WATER || world.occ[idx(world.size, tx, ty)]) { x = cx; y = cy; }
    const flip = hash2(h.id, i + 120, (world.seed + SALT + 13) | 0) > 0.8;
    out.push({ x, y, kind: h.kind, left: (h.dir === -1) !== flip, i });
  }
  return out;
}

// ── Hunters and boats ──
const working = (b) => !b.paused && !(b.fire && b.fire.stage === 'fire') && b.staff / BUILDINGS[b.type].workers >= MIN_STAFF_RATIO;
// A lodge's hunters: two walkers going out to the nearest herd in reach and back (standing at the door when none is in reach or under Still).
export function huntersOf(world, b, timeDays, motion) {
  const m = moveOf(motion), out = [];
  const herds = herdsInReach(world, b);
  const home = { x: b.x + b.w / 2, y: b.y + b.d + 0.35 };
  for (let k = 0; k < 2; k++) {
    const target = herds[0] ? { x: herds[0].x + 0.5 - 1.2 * Math.sign(herds[0].x + 0.5 - home.x), y: herds[0].y + 0.5 - 1.2 * Math.sign(herds[0].y + 0.5 - home.y) } : null;
    let x = home.x + 0.4 * k, y = home.y, left = false;
    if (target && m.walk > 0) {
      const L = Math.max(0.5, Math.min(HUNTING.reach, Math.hypot(target.x - home.x, target.y - home.y)));
      const cycle = 2 * L + 6;                                                  // out, a rest at the herd, back, a rest at the door
      const s = (timeDays * m.walk + k * 5 + hash2(b.id, k, (world.seed + SALT + 20) | 0) * cycle) % cycle;
      const out1 = s < L, back = s >= L + 3 && s < 2 * L + 3;
      const fr = out1 ? s / L : back ? 1 - (s - L - 3) / L : s < L + 3 ? 1 : 0;
      x = home.x + (target.x - home.x) * fr + 0.3 * k; y = home.y + (target.y - home.y) * fr;
      const eastward = (target.x - target.y) >= (home.x - home.y);              // on screen, out is to the right when the herd lies that way
      left = back ? eastward : out1 ? !eastward : false;
    }
    out.push({ id: wildlifeIds.hunter(b.id, k), kind: left ? 'hunter_l' : 'hunter', x, y, dir: left ? 3 : 1 });
  }
  return out;
}
// A wharf's boat: out on the water off the end of its pier, drifting along the shore a little (a fixed place under Still).
export function boatOf(world, b, timeDays, motion) {
  const m = moveOf(motion), side = wharfSide(world, b);
  const long = side === 's' || side === 'n';
  const sx = side === 'e' ? 1 : side === 'w' ? -1 : 0, sy = side === 's' ? 1 : side === 'n' ? -1 : 0;
  const cx = b.x + b.w / 2, cy = b.y + b.d / 2;
  // Off the end of the pier: the first water tile out from the wharf's water side (1 to 5 tiles), keeping to the pier's end of the long side.
  let base = null;
  for (let k = 1; k <= 5 && !base; k++) {
    for (const off of [0.5, -0.5, 1.2, -1.2]) {
      const x = cx + sx * (k + (b.w / 2)) + (long ? off : 0), y = cy + sy * (k + (b.d / 2)) + (long ? 0 : off);
      if (wet(world, Math.floor(x), Math.floor(y)) && wet(world, Math.floor(x + sx), Math.floor(y + sy))) { base = { x, y }; break; }
    }
  }
  if (!base) return null;
  const drift = m.amp ? Math.sin(timeDays * m.pace * 0.7 + b.id) * 2.2 : 0;
  let x = base.x + (long ? drift : 0), y = base.y + (long ? 0 : drift);
  if (!wet(world, Math.floor(x), Math.floor(y))) { x = base.x; y = base.y; }
  const left = long ? Math.cos(timeDays * m.pace * 0.7 + b.id) < 0 : false;
  return { id: wildlifeIds.boat(b.id), kind: left ? 'boat_l' : 'boat', x, y, dir: left ? 3 : 1 };
}

// ── The animals in range ──
// Walker entries [{ id, kind, x, y, dir }]; kind names the art slot fig.<kind> (render/art/river.js).
export function animalsAt(world, timeDays, range, motion) {
  if (!wildlifeOn(world)) return [];
  const out = [];
  const mid = viewMid(range);
  const near = (x, y) => Math.abs(x - mid.x) + Math.abs(y - mid.y);
  const cap = WILDLIFE.ambientCap;
  let drawn = 0;
  // The herds, nearest the middle of the view first, so the cap keeps the ones the player looks at.
  const herds = world.wildlife.herds.filter((h) => inRange(range, h.x, h.y, 3)).sort((p, q) => near(p.x, p.y) - near(q.x, q.y) || p.id - q.id);
  for (const h of herds) {
    for (const a of herdAnimals(world, h, timeDays, motion)) {
      if (drawn >= cap) break;
      out.push({ id: wildlifeIds.herd(h.id, a.i), kind: a.left ? `${a.kind}_l` : a.kind, x: a.x, y: a.y, dir: a.left ? 3 : 1 });
      drawn += 1;
    }
  }
  // The ambient animals, nearest the middle first, a few of each kind: birds on the banks, hippos in deep water, the crocodile spots, leaps.
  const sp = ambientSpots(world), still = motion === 'still';
  const room = () => cap - drawn;
  const pick = (list, max, make) => {
    const here = list.filter((s) => inRange(range, s.x, s.y, 1)).sort((p, q) => near(p.x, p.y) - near(q.x, q.y) || p.i - q.i);
    let k = 0;
    for (const s of here) {
      if (k >= max || room() <= 0) break;
      const e = make(s);
      if (e) { out.push(e); drawn += 1; k += 1; }
    }
  };
  pick(sp.birds, 14, (s) => {
    const heron = s.h < 0.3, left = s.h > 0.5;
    const down = !heron && motion === 'full' && (Math.floor(timeDays / 5 + s.h * 7) % 3 === 0);
    return { id: wildlifeIds.tile('bird', s.i), kind: `${heron ? 'heron' : down ? 'ibis_d' : 'ibis'}${left ? '_l' : ''}`.replace('ibis_d_l', 'ibis_dl'), x: s.x + 0.5, y: s.y + 0.5, dir: left ? 3 : 1 };
  });
  pick(sp.hippos, 4, (s) => {
    const under = motion === 'full' && ((timeDays / 4 + s.h * 9) % 3) > 2.2;                      // dives for a few days of every twelve
    return { id: wildlifeIds.tile('hippo', s.i), kind: under ? 'splash0' : s.h > 0.5 ? 'hippo_l' : 'hippo', x: s.x + 0.5, y: s.y + 0.5, dir: 1 };
  });
  const crocs = crocSpots(world).map(([x, y]) => ({ i: idx(world.size, x, y), x, y, h: hash2(x, y, (world.seed + SALT + 4) | 0) }));
  pick(crocs, 4, (s) => {
    const sx = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => !wet(world, s.x + dx, s.y + dy)) || [0, 0];
    return { id: wildlifeIds.tile('croc', s.i), kind: s.h > 0.5 ? 'croc_l' : 'croc', x: s.x + 0.5 + sx[0] * 0.3, y: s.y + 0.5 + sx[1] * 0.3, dir: 1 };
  });
  if (!still) {
    pick(sp.leaps, 3, (s) => {
      const t = (timeDays + s.h * 31) % 11;                                                      // one leap every eleven days, each a day or so long
      const step = Math.floor(t * 1.3);
      let kind = null;
      if (motion === 'full') kind = step === 0 ? 'leap0' : step === 1 ? 'leap1' : step === 2 ? 'splash0' : step === 3 ? 'splash1' : null;
      else kind = step <= 2 ? `splash${step}` : null;                                           // Gentle: a ring of ripples spreading in place
      return kind ? { id: wildlifeIds.tile('leap', s.i), kind, x: s.x + 0.5, y: s.y + 0.5, dir: 1 } : null;
    });
  }
  // Hunters and boats at the working lodges and wharves in view.
  for (const b of Object.values(world.buildings)) {
    if (b.type !== 'hunting_lodge' && b.type !== 'fishing_wharf') continue;
    if (!inRange(range, b.x, b.y, 14) || !working(b)) continue;
    if (b.type === 'hunting_lodge') out.push(...huntersOf(world, b, timeDays, motion));
    else { const boat = boatOf(world, b, timeDays, motion); if (boat) out.push(boat); }
  }
  return out;
}
