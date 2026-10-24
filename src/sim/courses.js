// Version 7.1 (Track M, rulings 1020-1039): the six new river layouts (MAP_VARIANTS_71). generateMap (src/sim/mapgen.js) calls drawCourse
// for them in place of the older layouts' river, island and lake, then lays everything else the same way (clay, oases, rock belts, hills,
// the meadow, the resource repair, dunes and wadis). The draws are one createRng stream keyed by the seed with MAP_SALT.courses, so a map is
// still a function of (seed, size, layout) alone and the six older layouts never move.
//
// Each layout draws its own orientation from the seed (params.course): 'ns', the river runs north-south down the west or the east side of
// the map with the start area on its wide side, or 'ew', it runs east-west across the map north of the start (the trade road always comes
// in at the south edge, as on every other map). A river is a line of points half a tile apart, each with its half-width (which varies along
// the river); a lake is an ellipse. Every tile takes its distance past the nearest water's edge (e): water at e <= 0, the bank within a
// tile of it, the fertile band out to (MAP.fertileBase - MAP.waterHalfWidth) plus the noise, as on the older layouts, then desert.
//   delta       the river fans out towards one edge (north, or east or west) into 2-3 arms, each 6-10 tiles wide at its mouth, with sandbar
//               islands in the wide mouths and fertile ground between the arms
//   confluence  two rivers meet in a Y and run on as one to the north (or the upper west or east) edge; the start sits in the fork, which
//               opens to the south edge, so the trade road and the start share one piece of land
//   twin        the main river and a second, smaller one across the map, never joining it; the start lies between them (or, east-west,
//               south of both)
//   wide-nile   one river 6-8 tiles wide its whole length: too wide for any bridge (MAP.bridgeMax); its far bank holds fertile land of its own
//   cataract    the river narrows to 2 tiles through a rocky gorge (rocky ground on both banks), then spreads over rapids round a chain of
//               small islands (sand with a rocky core)
//   lake-fed    the river flows out of a large lake on one edge of the map
// The raider entries (landEntries) are edge tiles on the start's own land: a raid and the first caravan never need a bridge.
import { createRng, valueNoise, hash2 } from './rng.js';
import { idx, inBounds, NEIGHBOURS4 } from './grid.js';
import { T } from './terrain.js';
import { MAP, MAP_SALT, MAP_VARIANTS_71, areaScale } from '../data/map.js';
import { repairResources } from './resources.js';

const smooth = (t) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };
const lerp = (a, b, t) => a + (b - a) * t;
const bezier = (a, c, b) => (t) => [lerp(lerp(a[0], c[0], t), lerp(c[0], b[0], t), t), lerp(lerp(a[1], c[1], t), lerp(c[1], b[1], t), t)];

// A river's points [x, y, hw, tag], at most MAP.courses.step tiles apart, along spine(t) (t from 0 to 1, in tiles) pushed sideways by
// wave(s, t) (s: tiles along the spine) and hw(t, s) wide either side.
function trace(spine, hw, wave, tag) {
  let len = 0, prev = spine(0);
  for (let k = 1; k <= 64; k++) { const p = spine(k / 64); len += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; }
  const n = Math.ceil((len * 1.6) / MAP.courses.step) + 1, out = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, s = t * len, p = spine(t), a = spine(Math.max(0, t - 1e-3)), b = spine(Math.min(1, t + 1e-3));
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, off = wave(s, t);
    out.push([p[0] - (dy / d) * off, p[1] + (dx / d) * off, hw(t, s), typeof tag === 'function' ? tag(t) : tag]);
  }
  return out;
}

// Draws the layout's water, banks, fertile band, islands and (cataract) gorge rock on `terrain` (all desert before) and returns where the
// trade road comes in (ex, on the south edge), the start area's centre (focus), the x ranges rock belts may use and params.course.
export function drawCourse(terrain, size, seed, layout) {
  const K = MAP.courses, L = K[layout], S = size - 1;
  // the shapes from one stream, the orientation from two hash2 draws (the stream's first draws follow the seed too closely); each layout
  // keyed apart, so one seed runs its rivers differently on each
  const key = (MAP_SALT.courses + MAP_VARIANTS_71.indexOf(layout) * 7919) | 0;
  const rng = createRng((seed ^ key) >>> 0);
  const at = (n) => (size === MAP.size ? n : Math.round((n * size) / MAP.size));
  const pick = ([a, b]) => rng.range(a, b);
  const axes = L.nsFrom && size < L.nsFrom ? L.axes.filter((a) => a !== 'ns') : L.axes;   // a twin's two rivers and a city between them need a Normal map's width
  const axis = axes[Math.floor(hash2(seed, 1, key) * axes.length)];
  const west = hash2(seed, 2, key) < 0.5;   // ns: the river down the west side (the start east of it); ew: the river flows east (and the delta's mouths, the lake's far end)
  const xy = axis === 'ns' ? (u, v) => [v, u] : (u, v) => [u, v];   // u runs along the river, v across it
  const fy = size + MAP.focusOffset.y;                                 // the start area's row, as on every map
  const nsV = (v64) => (west ? at(v64) : S - at(v64));
  const ewV = (north = 0) => fy - Math.min(K.ewFromStart, at(K.ewFromStart) + 1) - north;   // a Small map keeps its river within the resource reach
  const waveOf = ([lo, hi]) => {
    const a = rng.range(lo, hi), p = rng.range(8, 12), ph = rng.range(0, Math.PI * 2);
    return (s) => a * Math.sin(s / p + ph) + a * 0.45 * Math.sin(s / 4.3 + ph * 2);
  };
  const widthOf = ([lo, hi]) => {
    const p = rng.range(6, 10), ph = rng.range(0, Math.PI * 2);
    return (s) => lo + (hi - lo) * (0.5 + 0.5 * Math.sin(s / p + ph));
  };
  const straight = (v, u0 = -3, u1 = S + 3) => (t) => xy(lerp(u0, u1, t), v);
  const rivers = [], blobs = [], islands = [];
  let focusX = null, ex = null;

  if (layout === 'delta') {
    const v0 = axis === 'ns' ? nsV(pick(L.v)) : ewV(L.ewNorth);
    const uSrc = axis === 'ns' ? S + 3 : west ? -3 : S + 3, uEnd = axis === 'ns' ? -3 : west ? S + 3 : -3;   // ns: it flows north, as the Nile does
    const uFork = lerp(uSrc, uEnd, pick(L.fork)), stemW = widthOf(L.hw), stemWave = waveOf(L.amp);
    const stem = trace(straight(v0, uSrc, uFork), (t, s) => stemW(s), (s) => stemWave(s), 'river');
    rivers.push(stem);
    const end = stem[stem.length - 1], vF = axis === 'ns' ? end[0] : end[1];
    const edgeT = Math.abs((uEnd < 0 ? 0 : S) - uFork) / Math.abs(uEnd - uFork);   // where along an arm (0 at the fork, 1 past the edge) the map's edge is
    const n = Math.min(size < MAP.size ? L.smallArms : Infinity, L.arms[0] + rng.int(L.arms[1] - L.arms[0] + 1)), gap = pick(L.armGap);
    // the mouths, `gap` apart round the fork's line (or farther, so L.mouthLand tiles of land part two wide mouths), the fan then shifted
    // (and, at worst, narrowed) to fit: off the map's edges, and for an east-west delta far enough north of the start area
    const lo = at(5), hi = axis === 'ns' ? S - at(5) : fy - 3 - 6 - L.mouth[1];
    let wides = Array.from({ length: n }, () => pick(L.mouth));
    let steps = wides.slice(1).map((w, k) => Math.max(gap, wides[k] + w + L.mouthLand));
    const span = steps.reduce((a, b) => a + b, 0);
    if (span > hi - lo) { const f = (hi - lo) / span; steps = steps.map((s) => s * f); wides = wides.map((w) => w * f); }
    let mouths = [vF - steps.reduce((a, b) => a + b, 0) / 2];
    for (const s of steps) mouths.push(mouths[mouths.length - 1] + s);
    const shift = Math.max(0, lo - mouths[0]) - Math.max(0, mouths[n - 1] - hi);
    mouths = mouths.map((m) => Math.min(hi, Math.max(lo, m + shift)));
    for (let k = 0; k < n; k++) {
      const off = mouths[k] - vF, wide = wides[k], wave = waveOf([0.5, 1.2]);
      const arm = trace((t) => xy(lerp(uFork, uEnd, t), vF + off * (1 - (1 - t) ** 2)), (t) => lerp(L.forkHw, wide, Math.min(1, t / edgeT) ** 1.5), (s, t) => wave(s) * smooth(t * 4), 'river');   // full width by the map's edge
      rivers.push(arm);
      if (wide < 3.5) continue;
      const bars = L.sandbars[0] + rng.int(L.sandbars[1] - L.sandbars[0] + 1);
      for (let b = 0; b < bars; b++) {
        const p = arm[Math.round((0.45 + 0.25 * rng.next()) * edgeT * (arm.length - 1))], along = rng.range(1.6, 2.6), across = Math.min(p[2] * 0.45, rng.range(0.9, 1.4));   // short of the edge, so each mouth meets it as open water
        islands.push({ x: p[0], y: p[1], rx: axis === 'ns' ? across : along, ry: axis === 'ns' ? along : across, core: 0, rock: false });
      }
    }
  } else if (layout === 'confluence') {
    const J = [S / 2 + rng.range(-1, 1) * at(L.jx), fy - at(pick(L.jy))];
    const side = rng.chance(L.stemSide);
    const stemEnd = side ? [west ? -3 : S + 3, Math.min(at(pick(L.stemSideY)), J[1] - 6)] : [J[0] + rng.range(-8, 8), -3];
    const stemW = widthOf(L.hw), stemWave = waveOf(L.amp);
    rivers.push(trace(bezier(J, [J[0], lerp(J[1], stemEnd[1], 0.5)], stemEnd), (t, s) => stemW(s), (s) => stemWave(s) * smooth(s / 4), 'river'));
    for (const dir of [-1, 1]) {
      const endY = fy - at(pick(L.armEnd)), armW = widthOf(L.armHw), armWave = waveOf(L.amp);
      const tip = [dir < 0 ? -3 : S + 3, endY], ctl = [J[0] + dir * L.ctl[0], J[1] + L.ctl[1]];
      rivers.push(trace(bezier(J, ctl, tip), (t, s) => armW(s), (s) => armWave(s) * smooth(s / 4), 'river'));
    }
    ex = Math.round(J[0] + rng.range(-3, 3));
    focusX = ex + (west ? -K.focusOff : K.focusOff);
  } else if (layout === 'twin') {
    const v0 = axis === 'ns' ? nsV(pick(L.v)) : ewV();
    const vs = axis === 'ns' ? Math.min(S - 1, Math.max(1, v0 + (west ? 1 : -1) * pick(L.small.apart))) : at(pick(L.small.v));
    const mainW = widthOf(L.hw), mainWave = waveOf(L.amp), smallW = widthOf(L.small.hw), smallWave = waveOf(L.small.amp);
    rivers.push(trace(straight(v0), (t, s) => mainW(s), (s) => mainWave(s), 'river'));
    rivers.push(trace(straight(vs), (t, s) => smallW(s), (s) => smallWave(s), 'river'));
  } else if (layout === 'wide-nile') {
    const v0 = axis === 'ns' ? nsV(pick(L.v)) : ewV(L.ewNorth), w = widthOf(L.hw), wave = waveOf(L.amp);
    rivers.push(trace(straight(v0), (t, s) => w(s), (s) => wave(s), 'river'));
  } else if (layout === 'cataract') {
    const v0 = axis === 'ns' ? nsV(pick(L.v)) : ewV();
    const down = axis === 'ns' || west;   // ns: it flows south; ew: east when `west`
    const u0 = down ? -3 : S + 3, u1 = down ? S + 3 : -3, span = S + 6;
    const from = axis === 'ns' ? pick(L.at) : rng.range(0.3, 0.55);   // the gorge's middle, as a share of the way from the upstream edge
    const g = 3 + from * (S + 6 - 6), gl = pick(L.gorge) / 2, rl = pick(L.rapids), rHw = pick(L.rapidsHw), w = widthOf(L.hw), wave = waveOf(L.amp);
    const along = (t) => t * span;   // tiles from the upstream end
    const ease = (d) => smooth(1 - d / L.ease);   // 1 inside a stretch, easing to 0 over L.ease tiles beyond it
    const gorgeF = (a) => ease(Math.max(0, Math.abs(a - g) - gl)), rapidsF = (a) => ease(Math.max(0, Math.abs(a - (g + gl + L.ease + rl / 2)) - rl / 2));
    const hw = (t, s) => { const a = along(t), base = w(s); return lerp(lerp(base, L.gorgeHw, gorgeF(a)), rHw, rapidsF(a)); };
    const tag = (t) => (Math.abs(along(t) - g) <= gl ? 'gorge' : 'river');
    const line = trace(straight(v0, u0, u1), hw, (s) => wave(s), tag);
    rivers.push(line);
    // islands L.isletGap apart along the rapids (so they never touch), as many as the stretch holds up to the draw
    const n = Math.min(L.islets[0] + rng.int(L.islets[1] - L.islets[0] + 1), Math.floor((rl - 3) / L.isletGap) + 1), r0 = g + gl + L.ease + 1.5, step = L.isletGap;
    for (let k = 0; k < n; k++) {
      const p = line[Math.min(line.length - 1, Math.round(((r0 + k * step) / span) * (line.length - 1)))];
      const a = rng.range(0.9, 1.4), c = rng.range(0.7, 1.1), o = rng.range(-0.6, 0.6);
      islands.push({ x: p[0] + (axis === 'ns' ? o : 0), y: p[1] + (axis === 'ns' ? 0 : o), rx: axis === 'ns' ? c : a, ry: axis === 'ns' ? a : c, core: 0.35, rock: true });
    }
  } else if (layout === 'lake-fed') {
    const v0 = axis === 'ns' ? nsV(pick(L.v)) : ewV(L.lake.ewNorth), across = pick(axis === 'ns' ? L.lake.r : L.lake.ry), alongR = pick(L.lake.r) * (axis === 'ns' ? L.lake.nsDeep : 1);   // east-west: shallow across, to keep off the start
    const uLake = axis === 'ns' ? rng.range(1, 3) : west ? rng.range(1, 3) : S - rng.range(1, 3);   // ns: the lake on the north edge; ew: on the west edge when the river flows east
    const uFar = axis === 'ns' ? S + 3 : west ? S + 3 : -3, vLake = axis === 'ns' ? v0 + rng.range(-2, 2) : v0 - rng.range(0, 2);   // east-west: never nearer the start than the river
    const [lx, ly] = xy(uLake, vLake);
    blobs.push({ x: lx, y: ly, rx: axis === 'ns' ? across : alongR, ry: axis === 'ns' ? alongR : across, wobble: L.lake.wobble });
    const w = widthOf(L.hw), wave = waveOf(L.amp);
    rivers.push(trace(straight(v0, uLake, uFar), (t, s) => w(s), (s, t) => wave(s) * smooth(s / 6), 'river'));
  }

  // The ground: each tile's distance past the nearest water's edge, and that water's tag.
  const e = new Float32Array(size * size).fill(99), tagOf = new Array(size * size).fill(null);
  for (const line of rivers) {
    for (const [px, py, hw, tag] of line) {
      const R = hw + K.reach;
      for (let y = Math.max(0, Math.ceil(py - R)); y <= Math.min(S, Math.floor(py + R)); y++) {
        for (let x = Math.max(0, Math.ceil(px - R)); x <= Math.min(S, Math.floor(px + R)); x++) {
          const d = Math.hypot(x - px, y - py) - hw, i = idx(size, x, y);
          if (d < e[i]) { e[i] = d; tagOf[i] = tag; }
        }
      }
    }
  }
  for (const b of blobs) {
    const r = Math.min(b.rx, b.ry), R = Math.max(b.rx, b.ry) + K.reach;
    for (let y = Math.max(0, Math.ceil(b.y - R)); y <= Math.min(S, Math.floor(b.y + R)); y++) {
      for (let x = Math.max(0, Math.ceil(b.x - R)); x <= Math.min(S, Math.floor(b.x + R)); x++) {
        const d = (Math.hypot((x - b.x) / b.rx, (y - b.y) / b.ry) - 1) * r + (valueNoise(x, y, seed + 71, 3) - 0.5) * b.wobble, i = idx(size, x, y);
        if (d < e[i]) { e[i] = d; tagOf[i] = 'lake'; }
      }
    }
  }
  const fertile = MAP.fertileBase - MAP.waterHalfWidth;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = idx(size, x, y), d = e[i];
      let t = T.DESERT;
      if (d <= 0) t = T.WATER;
      else if (tagOf[i] === 'gorge' && d <= L.wall[0] + valueNoise(x, y, seed + 73, 2) * L.wall[1]) t = T.ROCKY;   // the gorge's rocky walls
      else if (d <= 1) t = T.BANK;
      else if (d <= fertile + valueNoise(x, y, seed, MAP.fertileNoiseScale) * MAP.fertileNoise) t = T.FERTILE;
      terrain[i] = t;
    }
  }
  for (const s of islands) {
    for (let y = Math.max(0, Math.floor(s.y - s.ry) - 1); y <= Math.min(S, Math.ceil(s.y + s.ry) + 1); y++) {
      for (let x = Math.max(0, Math.floor(s.x - s.rx) - 1); x <= Math.min(S, Math.ceil(s.x + s.rx) + 1); x++) {
        const q = ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2;
        if (q <= 1) terrain[idx(size, x, y)] = s.rock && q <= s.core ? T.ROCKY : T.BANK;
      }
    }
  }

  // Where the trade road comes in and the start area: a north-south river's start lies K.roadGap tiles off its water over the last rows
  // (MAP.clearStartRows), on its wide side; an east-west river's, near the middle of the south edge; a confluence's, in the fork.
  if (ex === null) {
    if (axis === 'ns') {
      let edge = west ? -1 : size;
      for (let y = size - MAP.clearStartRows; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (terrain[idx(size, x, y)] !== T.WATER || (west ? x >= size / 2 : x < size / 2)) continue;
          edge = west ? Math.max(edge, x) : Math.min(edge, x);
        }
      }
      ex = west ? edge + K.roadGap : edge - K.roadGap;
      focusX = ex + (west ? -K.focusOff : K.focusOff);
    } else {
      ex = Math.round(S / 2 + rng.range(-1, 1) * at(K.ewRoad));
      focusX = ex + (rng.chance(0.5) ? -K.focusOff : K.focusOff);
    }
  }
  return { ex, focus: { x: focusX, y: fy }, ranges: [[at(3), S - at(3)]], course: { axis, side: axis === 'ns' ? (west ? 'west' : 'east') : west ? 'east' : 'west' } };
}

// The resource repair (src/sim/resources.js repairResources, ruling 461) on the start's own land (ruling 1023): a fit across water the start
// cannot reach without a bridge (or, on a wide Nile, at all) does not count. The repair runs on a copy whose other land reads as water, so
// it counts and mends only the start's side, and its edits are copied back; a map that already holds the fits there is untouched. Called
// as the generator's last edit, as repairResources is.
export function repairOwnLand(map, seed, ranges, opts) {
  const { size, terrain, focus } = map;
  const own = new Uint8Array(size * size), queue = [idx(size, focus.x, focus.y)];
  own[queue[0]] = 1;
  for (let k = 0; k < queue.length; k++) {
    const x = queue[k] % size, y = (queue[k] - x) / size;
    for (const [dx, dy] of NEIGHBOURS4) {
      if (!inBounds(size, x + dx, y + dy)) continue;
      const j = idx(size, x + dx, y + dy);
      if (!own[j] && terrain[j] !== T.WATER && terrain[j] !== T.HILLS) { own[j] = 1; queue.push(j); }
    }
  }
  const masked = terrain.map((t, i) => (own[i] || t === T.HILLS ? t : T.WATER));
  const done = repairResources({ ...map, terrain: masked }, seed, ranges, opts);
  for (let i = 0; i < terrain.length; i++) if (own[i]) terrain[i] = masked[i];
  return done;
}

// The raiders' entries on a new layout (two; three on a Large or bigger map, as entriesFor counts them): edge tiles on the start area's own
// land (4-linked over anything but water and hills), so a raid never needs a bridge. Tried in order from the middle of the east, north and
// west edges, then nearer the corners and on the south edge, each sliding along its edge to the nearest such tile; an entry keeps 0.4 of the
// map's side from the start area and 0.25 from another entry and the trade road (relaxed only when a map has too little edge for that).
export function landEntries(terrain, size, focus, tradeEntry) {
  const want = Math.round(2 * areaScale(size)) > 2 ? 3 : 2, S = size - 1, mid = Math.floor(size / 2);
  const own = new Uint8Array(size * size), queue = [idx(size, focus.x, focus.y)];
  own[queue[0]] = 1;
  for (let k = 0; k < queue.length; k++) {
    const x = queue[k] % size, y = (queue[k] - x) / size;
    for (const [dx, dy] of NEIGHBOURS4) {
      if (!inBounds(size, x + dx, y + dy)) continue;
      const j = idx(size, x + dx, y + dy);
      if (!own[j] && terrain[j] !== T.WATER && terrain[j] !== T.HILLS) { own[j] = 1; queue.push(j); }
    }
  }
  const tile = (edge, k) => (edge === 'east' ? { x: S, y: k } : edge === 'west' ? { x: 0, y: k } : edge === 'north' ? { x: k, y: 0 } : { x: k, y: S });
  const anchors = [['east', mid], ['north', mid], ['west', mid], ['north', Math.round(size * 0.25)], ['north', Math.round(size * 0.75)],
    ['east', Math.round(size * 0.8)], ['west', Math.round(size * 0.8)], ['south', Math.round(size * 0.1)], ['south', Math.round(size * 0.9)]];
  const slide = (edge, a) => {
    for (let d = 0; d < size; d++) for (const k of d ? [a - d, a + d] : [a]) if (k >= 0 && k < size && own[idx(size, tile(edge, k).x, tile(edge, k).y)]) return tile(edge, k);
    return null;
  };
  const far = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const out = [];
  for (const [away, apart] of [[0.4, 0.25], [0.25, 0.2], [0, 0.1]]) {
    for (const [edge, a] of anchors) {
      if (out.length >= want) break;
      const e = slide(edge, a);
      if (e && far(e, focus) >= away * size && far(e, tradeEntry) >= apart * size && out.every((o) => far(o, e) >= apart * size)) out.push(e);
    }
  }
  return out;
}
