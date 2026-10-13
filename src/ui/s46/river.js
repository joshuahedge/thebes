// Stage 4.6, the River track's interface seam (rulings 334-335, 360-369). createUI makes it once a game with the seam context
// (src/ui/danger.js lists ctx) through src/ui/s46/index.js, and calls it only through the seam's shape (src/ui/s46/seam.js):
//   sheetParts.building(b)  a farm's floodplain row (this year's flood and what it gives, from the sim), the Nilometer's forecast, the hunting
//                           lodge's herds and game, the fishing wharf's catch, and, on any workplace within the crocodiles' reach, their line
//   sheetParts.summary()    "The river": the flood (the next, the one up, the last), the floodplain farms' food forecast and the herds
//   onEvents(events)        captions when the forecast or the water arrives, a crocodile scares a workplace or a herd wanders in, and the tips
//   refresh()               a forecast bought from the priests (the Court's Flood omen card) has no event of its own: its caption is shown here
//   onCommand(e)            the tip for a placed Nilometer, hunting lodge or fishing wharf (one tip each, UX rule 5)
// Every sentence is computed from the data (src/data/river.js) and the sim (src/sim/flood.js, wildlife.js) through the words in src/ui/text.js
// (S46_RIVER_TEXT). Nothing floats over the map: new things arrive through the caption row and the sheets (UX rule 1).
import { seamBase } from './seam.js';
import { BUILDINGS } from '../../data/buildings.js';
import { floodLook, floodOutlook, isFloodFarm, onFloodplain, isFloodSeason } from '../../sim/flood.js';
import { huntingOutlook, crocsNear, scareable, scareOf } from '../../sim/wildlife.js';
import { isWorking } from '../../sim/labour.js';
import { el } from '../components.js';
import { S46_RIVER_TEXT as R, buildingName } from '../text.js';

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);
const line = (text, cls = 'small muted') => el('p', { class: cls, text });

// The rows of a building's sheet, as nodes: pure of the DOM but el, so the tests can read their words.
export function riverRows(world, b) {
  const out = [];
  const look = floodLook(world);
  if (isFloodFarm(b.type)) {
    if (look.on && onFloodplain(world, b)) {
      out.push(row(R.floodRowLabel, look.applied ? `${Math.round(look.applied.harvest * 100)}%` : '100%'), line(R.farmRow(look)));
      if (look.known && look.level && (look.phase === 'forecast')) out.push(line(R.farmRowNext(look.level.id)));
    } else if (look.on) out.push(line(R.farmOff));
  }
  if (b.type === 'nilometer') {
    const f = world.flood;
    const working = isWorking(world, b);
    let value;
    if (!working) value = R.nilometerIdle;
    else if (look.known && look.level) value = R.nilometerKnown(look.level.id);
    else if (!look.on) value = R.nilometerNone;
    else value = R.nilometerWaiting(look.monthsTo === null ? 0 : look.monthsTo);
    out.push(row(R.nilometerLabel, value), line(R.nilometerNote));
  }
  if (b.type === 'hunting_lodge') {
    const o = huntingOutlook(world, b);
    out.push(row(R.herdsLabel, R.herdsLine(o.herds, o.animals)));
    if (o.herds) out.push(row(R.gameLabel, R.gameLine(o.month)));
    else out.push(line(R.noHerds, 'small coral'));
    out.push(line(R.huntRule));
  }
  if (b.type === 'fishing_wharf') out.push(row(R.catchLabel, R.catchLine(isFloodSeason(world))), line(R.catchRule));
  if (BUILDINGS[b.type].workers && scareable(world, b) && crocsNear(world, b).length) {
    out.push(scareOf(world, b) ? line(R.crocNow, 'small coral') : line(R.crocNear));
  }
  return out;
}

// The summary's section: the flood, the floodplain farms' food forecast, the herds. Empty until the river floods in the city (Town).
export function riverSummary(world) {
  const look = floodLook(world);
  if (!look.on) return [];
  const nodes = [el('h3', { text: R.summaryHead, dataset: { section: 'river' } }), line(R.floodLine(look), 'small')];
  const coming = look.phase === 'forecast';
  const o = floodOutlook(world, coming && look.level ? look.level : null);
  if (o.farms) nodes.push(line(R.outlookLine(o, coming), 'small'));
  const herds = world.wildlife.herds;
  const hasRiver = Object.values(world.buildings).some((b) => b.type === 'hunting_lodge');
  if (herds.length || hasRiver) nodes.push(line(R.herdsLine2(herds.length, herds.reduce((s, h) => s + h.size, 0), world.tally.hunted), 'small'));
  return nodes;
}

export function createRiverUi(ctx) {
  const base = seamBase();
  if (!ctx || !ctx.world) return base;
  const world = ctx.world;
  const caption = (text) => ctx.celebrations.show({ tier: 'info', text });
  const tip = (trigger) => { if (typeof ctx.fireTip === 'function') ctx.fireTip(trigger); };
  // What the city has been told of the flood: this year's record and the level it knew. A saved city opens with it already told.
  let told = { year: world.flood.year, level: world.flood.forecast };
  const tell = (text, level) => { told = { year: world.flood.year, level }; caption(text); };
  const nameOf = (id) => { const b = world.buildings[id]; return b ? buildingName(b.type) : 'workplace'; };
  return {
    ...base,
    sheetParts: { ...base.sheetParts, building: (b) => (b && world.buildings[b.id] === b ? riverRows(world, b) : []), summary: () => riverSummary(world) },
    onEvents(events) {
      for (const e of events || []) {
        if (e.type === 'flood_forecast') tell(R.forecastCaption(e.level), e.level);
        else if (e.type === 'flood_rise') {
          tell(R.riseCaption(e.level), e.level);
          tip('floodRose');
        } else if (e.type === 'croc_scare') caption(R.scareCaption(nameOf(e.id), e.days));
        else if (e.type === 'herd_arrived') caption(R.herdCaption(e.kind, e.size));
      }
    },
    refresh() {
      const f = world.flood;
      if (f.forecast && !f.risen && (told.year !== f.year || told.level !== f.forecast)) tell(R.forecastCaption(f.forecast), f.forecast);   // the priests' forecast (the Court's card)
    },
    onCommand(e) {
      const built = e && e.kind === 'building' && e.result && world.buildings[e.result.id];
      if (!built) return;
      if (built.type === 'nilometer') tip('nilometerPlaced');
      else if (built.type === 'hunting_lodge') tip('huntingLodgePlaced');
      else if (built.type === 'fishing_wharf') tip('fishingWharfPlaced');
    },
  };
}
