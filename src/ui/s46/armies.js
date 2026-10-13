// Stage 4.6, the Armies track's interface seam (rulings 340-341, 385-388). createUI makes it once a game with the seam context
// (src/ui/danger.js lists ctx) through src/ui/s46/index.js, and calls it only through the seam's shape (src/ui/s46/seam.js):
//   sheetParts.building(b)  the archery range's and the stables' rows (units of how many, training, pay, what they do, and for the
//                           stables the horses' grain), and on any unit building the units away at the capital
//   onCommand(e)            the tip for a placed archery range or stables (one tip each, UX rule 5)
//   onEvents(events)        the tip for the first raid warned with more than raiders on foot
// The raid sheet's counters are in src/ui/dangerSheets.js (counterParts), the warning's mix in its title (text.js). Every sentence
// is computed from the data (src/data/armies.js) and the sim (src/sim/armies.js).
import { seamBase } from './seam.js';
import { BUILDINGS } from '../../data/buildings.js';
import { UNIT_TYPES, UNIT_OF_BUILDING } from '../../data/armies.js';
import { MIN_STAFF_RATIO } from '../../data/labour.js';
import { isWorking } from '../../sim/labour.js';
import { horseGrainOf, grainHeld, isMixed } from '../../sim/armies.js';
import { el } from '../components.js';
import { S46_ARMY_TEXT as A, DANGER_UI_TEXT as D } from '../text.js';

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);
const line = (text, cls = 'small muted') => el('p', { class: cls, text });
const needed = (type) => Math.ceil(BUILDINGS[type].workers * MIN_STAFF_RATIO);

// The rows' model, pure for the tests: { kind, n, cap, away: [{ n, days }], status: 'full' | 'burning' | 'paused' | 'short' | 'training',
// short: workers needed, horses: { each, now, held, hungry } (stables only) }; null for a building that trains no units.
export function armyRowsModel(world, b) {
  const kind = b && UNIT_OF_BUILDING[b.type];
  if (!kind) return null;
  const def = UNIT_TYPES[kind];
  const n = world.soldiers.filter((s) => s.barracks === b.id).length;
  const groups = new Map();
  for (const u of world.army.away) if (u.barracks === b.id) groups.set(u.back, (groups.get(u.back) || 0) + 1);
  const away = [...groups.entries()].sort((p, q) => p[0] - q[0]).map(([back, k]) => ({ n: k, days: Math.max(0, back - world.day) }));
  const held = n + away.reduce((s, g) => s + g.n, 0);
  const status = held >= def.perBuilding ? 'full' : b.fire && b.fire.stage === 'fire' ? 'burning' : b.paused ? 'paused' : !isWorking(world, b) ? 'short' : 'training';
  const out = { kind, n, cap: def.perBuilding, away, status, short: needed(b.type) };
  if (kind === 'chariot') out.horses = { each: def.grain, now: horseGrainOf(world), held: grainHeld(world), hungry: world.army.fed === false && n > 0 };
  return out;
}

function unitRows(world, b) {
  const m = armyRowsModel(world, b);
  if (!m) return [];
  const out = [];
  if (b.type !== 'barracks') {            // the barracks' own rows are Stage 3's (dangerSheets.js); it gets the away line only
    const awayN = m.away.reduce((s, g) => s + g.n, 0);
    out.push(row(A.unitsLabel[m.kind], A.ofCap(m.n, m.cap, awayN)), row(D.patrol, D.tiles(UNIT_TYPES[m.kind].patrol)));
    if (m.status === 'full') out.push(line(A.full(m.kind, m.n, m.cap, awayN)));
    else if (m.status === 'burning') out.push(line(D.notTrainingBurning));
    else if (m.status === 'paused') out.push(line(D.notTrainingPaused));
    else if (m.status === 'short') out.push(line(D.notTrainingUntil(m.short, BUILDINGS[b.type].workers)));
    else out.push(line(A.trains(m.kind)));
    out.push(line(m.kind === 'archer' ? A.archerDoes : A.chariotDoes, 'small'));
    out.push(line(A.pay(m.kind)));
    if (m.horses) {
      out.push(line(A.horses(m.horses.each, m.horses.now), 'small'), line(A.grainHeld(m.horses.held)));
      if (m.horses.hungry) out.push(line(A.hungry, 'small coral'));
    }
    const last = world.raid.last, by = m.kind === 'archer' ? 'byArchers' : 'byChariots';
    if (last && last[by]) out.push(line(A.lastRaid(m.kind, last[by], last.size)));
  }
  for (const g of m.away) out.push(line(A.away(m.kind, g.n, g.days)));
  return out;
}

export function createArmiesUi(ctx) {
  const base = seamBase();
  const tip = (trigger) => { if (typeof ctx.fireTip === 'function') ctx.fireTip(trigger); };
  return {
    ...base,
    sheetParts: { ...base.sheetParts, building: (b) => (b && ctx.world ? unitRows(ctx.world, b) : []) },
    onCommand(e) {
      const built = e && e.kind === 'building' && e.result && ctx.world && ctx.world.buildings[e.result.id];
      if (built && built.type === 'archery_range') tip('archeryRangePlaced');
      if (built && built.type === 'stables') tip('stablesPlaced');
    },
    onEvents(events) {
      const w = ctx.world && ctx.world.raid.warning;
      for (const e of events || []) if (e.type === 'raid_warning' && w && isMixed(w.mix)) tip('mixedRaidWarned');
    },
  };
}
