// Version 6.0, Track B1: the interface of the dangers (rulings 680-699), the seam (src/ui/s46/seam.js shape) createV60Seams makes once a game:
//   sheetParts.building(b)  rubble that remembers what stood there; a farm's yield (a drought, locusts or blight, a rest after Harvest now) and, while
//                           locusts or blight are warned for it, what Harvest now does or why it cannot; a workplace stopped by plague or quarantine
//   sheetParts.actions(b)   Harvest now on a farm of a warned band; Rebuild on rubble that remembers what stood there
//   sheetParts.house(h)     the plague: a home warned to be its first, a sick home's days and losses, and the district's quarantine (the fee, the
//                           months, what it holds and what it stops, said before the tap)
//   sheetParts.summary()    "Dangers": the plague, the Nile and the farms' locusts or blight, while any is warned or under way
//   onEvents(events)        captions for each warning and ending, the tips, a wrecked building's
// Every sentence is computed from the data (src/data/hazards.js) and the sim (src/sim/plague.js, crops.js, strikes.js, production.js harvestQuote)
// through the words in src/ui/text.js (B1_TEXT). Nothing floats over the map: new things arrive through the caption row and the sheets (UX rule 1).
import { seamBase } from '../s46/seam.js';
import { isPlagueHome, healthCause } from '../../sim/health.js';
import { sickHomes, quarantines, quarantineQuote, quarantineDistrict, haltReason, districtKey } from '../../sim/plague.js';
import { isFarm, yieldCause, warnedBand, foodOutlook } from '../../sim/crops.js';
import { harvestQuote, harvestNow } from '../../sim/production.js';
import { rebuildQuote, rebuild } from '../../sim/strikes.js';
import { isUnlocked } from '../../sim/progression.js';
import { BUILDINGS } from '../../data/buildings.js';
import { DROUGHT } from '../../data/hazards.js';
import { el, button } from '../components.js';
import { B1_TEXT as B1, T } from '../text.js';

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);
const line = (text, cls = 'small muted') => el('p', { class: cls, text });
const centre = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const real = (ctx, b) => Boolean(ctx.world && b && BUILDINGS[b.type] && ctx.world.buildings[b.id] === b);

// ── Plague ──
// The plague rows of a home's sheet, as nodes: pure of the DOM but el and button, so the tests can read their words. The quarantine group (its
// consequences first, then the button) shows on every home of a district with a sick home, and says why when it cannot be tapped.
export function plagueParts(ctx, h) {
  const world = ctx.world, p = world.hazards.plague, out = [];
  if (p.warning && p.warning.origin === h.id) {
    out.push(row(B1.plagueLabel, B1.plagueOrigin(Math.max(0, p.warning.strikes - world.day))));
    if (healthCause(world, h).cause === 'none' && isUnlocked(world, 'physician')) {
      out.push(el('div', { class: 'fix plague-fix' }, [button(T.showMe, { class: 'show-me primary', 'aria-label': `${T.showMe}: ${B1.physicianNote}`, onClick: () => ctx.showMeAt({ category: 'services', item: 'physician', ...centre(h) }) })]));
    }
  }
  if (!p.active) return out;
  if (isPlagueHome(h)) out.push(row(B1.plagueLabel, B1.plagueSick(h.illness, healthCause(world, h).cause === 'covered')));
  const q = quarantineQuote(world, h);
  const held = quarantines(world).get(q.key);
  if (held) { out.push(line(B1.quarantineHeld(held.until, world.day), 'small teal')); return out; }
  if (!q.sick) return out;
  const group = [line(B1.quarantineDoes(q))];
  const go = button(B1.quarantineButton(q.fee), {
    class: q.ok ? 'quarantine primary' : 'quarantine', disabled: !q.ok, 'aria-label': `${B1.quarantineButton(q.fee)}. ${B1.quarantineDoes(q)}`,
    onClick: () => {
      const r = quarantineDistrict(world, h.id);
      if (!r.ok) return;
      ctx.toasts.show(B1.quarantined(r.fee));
      ctx.afterCommand({ kind: 'quarantine', result: r, text: B1.quarantined(r.fee), undoable: false });
    },
  });
  group.unshift(go);
  if (!q.ok) group.push(line(typeof B1.quarantineRefusal[q.reason] === 'function' ? B1.quarantineRefusal[q.reason](q) : B1.quarantineRefusal[q.reason], 'small coral'));
  out.push(el('div', { class: 'festival-group quarantine-group' }, group));
  return out;
}

// ── Farms and stopped workplaces ──
// The rows of a building sheet after its reach row: why a workplace's work has stopped (plague, quarantine), a farm's yield and rest, and, for a
// farm of a warned band, what Harvest now does (or why it cannot). The button is actions'.
export function cropRows(ctx, b) {
  const world = ctx.world, out = [];
  const why = haltReason(world, b);
  if (why === 'plague') out.push(line(B1.haltedPlague, 'small coral'));
  else if (why === 'quarantine') out.push(line(B1.haltedQuarantine(quarantines(world).get(districtKey(b)).until, world.day), 'small coral'));
  if (!isFarm(b.type)) return out;
  const cause = yieldCause(world, b), h = world.hazards;
  if (cause === 'drought') out.push(line(B1.droughtRow(h.drought.active, world.day), 'small coral'));
  else if (cause) out.push(line(B1.cropRowActive(h.locusts.active, world.day, cause), 'small coral'));
  if (b.restUntil > world.day) out.push(line(B1.resting(b.restUntil - world.day), 'small'));
  const w = warnedBand(world, b.id);
  if (w) {
    out.push(line(B1.cropRowWarned(w, world.day), 'small coral'));
    const q = harvestQuote(world, b);
    out.push(line(q.ok ? B1.harvestDoes(q) : B1.harvestRefusal[q.reason], q.ok ? 'small' : 'small muted'));
  }
  return out;
}

// Buttons at the front of a building sheet's actions: Harvest now on a farm of a warned band, Rebuild on rubble that remembers what stood there.
export function actionButtons(ctx, b) {
  const world = ctx.world, out = [];
  if (isFarm(b.type) && warnedBand(world, b.id)) {
    const q = harvestQuote(world, b);
    out.push(button(B1.harvestButton, {
      class: q.ok ? 'harvest primary' : 'harvest', disabled: !q.ok, 'aria-label': q.ok ? `${B1.harvestButton}: ${B1.harvestDoes(q)}` : `${B1.harvestButton}: ${B1.harvestRefusal[q.reason]}`,
      onClick: () => {
        const r = harvestNow(world, b.id);
        if (!r.ok) return;
        ctx.toasts.show(B1.harvested(r.units, r.good));
        ctx.afterCommand({ kind: 'harvest', result: r, text: B1.harvested(r.units, r.good), undoable: false });
      },
    }));
  }
  if (b.type === 'rubble' && b.was) {
    const q = rebuildQuote(world, b.id);
    if (q.type) {
      const go = button(B1.rebuildLabel(q.type, q.cost), {
        class: q.ok ? 'rebuild primary' : 'rebuild', disabled: !q.ok, 'aria-label': `${B1.rebuildLabel(q.type, q.cost)}. ${B1.rebuildCosts(q)}`,
        onClick: () => {
          const r = rebuild(world, b.id);
          if (!r.ok) return;
          ctx.toasts.show(B1.rebuilt(r.type));
          ctx.afterCommand({ kind: 'rebuild', result: r, text: B1.rebuilt(r.type), undoable: false });
        },
      });
      out.push(el('div', { class: 'festival-group rebuild-group' }, [go, line(B1.rebuildCosts(q)), q.ok ? null : line(B1.rebuildRefusal(q), 'small coral')]));
    }
  }
  return out;
}

// ── The summary's section ──
export function dangerSummary(world) {
  const h = world.hazards, nodes = [];
  const day = world.day;
  if (h.plague.warning) nodes.push(line(B1.plagueWarnedLine(Math.max(0, h.plague.warning.strikes - day)), 'small'));
  if (h.plague.active) nodes.push(line(B1.plagueLine(sickHomes(world).length, h.plague.active.lost, quarantines(world).size), 'small'));
  if (h.drought.warning || h.drought.active) {
    const w = h.drought.warning, a = h.drought.active;
    const o = foodOutlook(world);
    nodes.push(line(B1.droughtLine({ warned: Boolean(w), strikes: w ? w.strikes : null, until: a ? a.until : null, day, months: DROUGHT.months, factor: o.factor }), 'small'), line(B1.droughtStores({ ...o, monthsShort: o.short > 0 && !o.carries ? Math.ceil((o.need - o.held) / o.short) : 0 }), 'small'));
  }
  const lw = h.locusts.warning, la = h.locusts.active;
  if (lw) nodes.push(line(B1.cropLine(lw, day), 'small'));
  if (la) nodes.push(line(B1.cropBandLine(la, day), 'small'));
  return nodes.length ? [el('h3', { text: B1.summaryHead, dataset: { section: 'dangers' } }), ...nodes] : [];
}

export function createHazardsUi(ctx) {
  const base = seamBase();
  if (!ctx || !ctx.world) return base;
  const world = ctx.world;
  const caption = (text) => ctx.celebrations.show({ tier: 'info', text });
  const tip = (trigger) => { if (typeof ctx.fireTip === 'function') ctx.fireTip(trigger); };
  const C = B1.captions;
  return {
    ...base,
    sheetParts: {
      ...base.sheetParts,
      building: (b) => (real(ctx, b) ? [...(b.type === 'rubble' && b.was ? [line(B1.rubbleWas(b.was), 'small')] : []), ...cropRows(ctx, b)] : []),
      actions: (b) => (real(ctx, b) ? actionButtons(ctx, b) : []),
      house: (h) => (real(ctx, h) ? plagueParts(ctx, h) : []),
      summary: () => dangerSummary(world),
    },
    onEvents(events) {
      for (const e of events || []) {
        if (e.type === 'plague_warning') { caption(C.plague_warning(world.buildings[e.id], e.strikes - world.day)); tip('plagueWarned'); }
        else if (e.type === 'plague_start') { caption(C.plague_start(world.buildings[e.id])); tip('plagueStruck'); }
        else if (e.type === 'plague_end') caption(C.plague_end(e));
        else if (e.type === 'quarantine_end') caption(C.quarantine_end);
        else if (e.type === 'drought_warning') { caption(C.drought_warning(e, world.day)); tip('droughtWarned'); }
        else if (e.type === 'drought_start') caption(C.drought_start(e));
        else if (e.type === 'drought_end') caption(C.drought_end);
        else if (e.type === 'locusts_warning') { caption(C.locusts_warning(e)); tip('locustsWarned'); }
        else if (e.type === 'locusts_strike') caption(C.locusts_strike(e));
        else if (e.type === 'locusts_end') caption(C.locusts_end(e));
        else if (e.type === 'raid_wreck') { caption(C.raid_wreck(e.kind)); tip('rubbleWrecked'); }
      }
    },
  };
}
