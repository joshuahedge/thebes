// The monuments interface (spec 4.14, 4.16, 4.20, 6.3, 6.5; rulings 207-212, 229-236, 251, 258, 280, 281): the site sheet,
// the finished monument's, the builders' guild's, quarry's, brickworks' and palace's sheets (with Enlarge the palace),
// the summary's Monuments section, the stall warnings' View and Show me, the placing camera fit at the pick, and the
// marker taps. Stage 4 contract: Track 0 fixed the seam; Track C implements it and owns this file (and sheets.js,
// placement.js, confirmBar.js, cards.js, welcomeBack.js, alerts.js beyond the seams).
//
// createUI makes one with the Stage 3 seam context (src/ui/createUI.js seamCtx: world, store, settings, sfx, toasts,
// celebrations, effects, cameraControl, speedControl, alerts, root, doc, now, clock, hooks, afterCommand, refresh, onView,
// showMeAt, selectBuilding, screenshotMode, fireTip) and treats it as it treats the danger and score interfaces:
//   sheets: custom sheet kinds (each needs a T entry, in Track C's text section)
//   sheetParts: { building(b), house(h), actions(b), summary() } -> arrays of nodes at the Stage 3 places (a monument's,
//     guild's, quarry's, brickworks' or palace's rows go in building(b) and actions(b); C may also route a monument's info
//     sheet to its own kind in sheets.js)
//   onEvents(events), refresh(), onAlertAction(alert, action), onCommand(e), destroy(): as Stage 3's
// and two Stage 4 hooks:
//   pickFit(type, ghost, insets) -> null, or { zoom, extent }: called by createUI's pick() once a monument's ghost has
//     landed (ghost: { x, y } with the tool's footprint); createUI then keeps the ghost in view with that zoom (never in,
//     never past the least zoom, an instant cut under Gentle and Still: cameraControl follows settings.reducedMotion()) and
//     that extent ({ up, down } art px: the silhouette). Ruling 231.
//   markerTap(marker) -> true when it handled a tap on a problem marker (src/render/markers.js); createUI otherwise selects
//     the marker's front building. A count badge zooming in one step is C's (ruling 281).
// Show me (createUI's showMeAt: a goal, a site's "No crew" row, a stall's alert row) asks pickFit too when it lands a
// monument's ghost. And one optional hook (Task 0.5; createUI checks it is a function):
//   grabExtent(type, rot) -> null, or { up }: how far a monument's ghost can be grabbed above its footprint (spec 6.5
//     "drag by the body"), in art px at zoom 1 (createUI scales it with the camera as it draws).
//
// Track C. The seam context has no camera: the fit reads the one the minimap was given (src/ui/minimap.js cameraOf).
// Every sheet row is a pure function of what the sim's own functions return (siteStatus, guildSite, supplyNeeded,
// palaceQuote, palaceMood, prestigeOfBuilding, holdsPrestige, demolishRefundFor), so the tests set the world up both ways and
// check the words follow (ruling 210, 252).
import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { MONUMENTS, MONUMENT, MATERIALS, MONUMENT_KINDS, PRESTIGE_UNLOCKS } from '../data/monuments.js';
import { PALACE_STYLES } from '../data/palace.js';
import { MILESTONES } from '../data/progression.js';
import { ART } from '../render/art/registry.js';
import { pxPerArt, MIN_ZOOM } from '../render/camera.js';
import { GOLD } from '../render/art/palette.js';
import { allBuildings, housesOf, isSite, isFinished, isMonument } from '../sim/world.js';
import * as monumentsSim from '../sim/monuments.js';
import { siteStatus, siteCrews, campQuote, setCamp, crewSpeedAt, crewDistance, guildSite, supplyNeeded, prestigeOf, prestigeOfBuilding, holdsPrestige, stalledGuild, guildBurning } from '../sim/monuments.js';
import { palaceQuote, enlargePalace, palaceMood } from '../sim/palace.js';
import { workGoldPerUnit, extraGoldOf } from '../sim/costs.js';
import { setPaused, demolishRefundFor } from '../sim/commands.js';
import { assignLabour } from '../sim/labour.js';
import { touchesRoad } from '../sim/reach.js';
import { siteKeepFix } from '../sim/adviceFixes.js';
import { aimKeepStocked } from './s47/carts.js';
import { desirabilityContributors } from '../sim/desirability.js';
import { milestoneIndex, atLeast, isUnlocked } from '../sim/progression.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../sim/time.js';
import { unitsAwayFrom } from '../sim/armies.js';
import { FRAME_MARGIN_PX } from './cameraControl.js';
import { cameraOf } from './minimap.js';
import { nearestTerrainTile } from './goalsList.js';
import { el, button } from './components.js';
import { buildingName, viewLabel, T, UI4_TEXT, UI4_PALACE_TEXT, ui4CauseText, S46_COURT_TEXT, V60_REIGN_TEXT, V83_C_TEXT } from './text.js';
import { setViewClock } from '../render/overlays.js';
import { ZOOM_STEP, categoryOfItem } from '../data/ui.js';

// ── The pick's fit (Task C1) ─────────────────────────────────────────────────────────────────────────────────────

// The art px a building of `type` in rotation `rot` reaches about its footprint's middle: up (its drawn height plus the back
// half of the footprint, iso.js p(): a tile is 32 x 16 art px), down (the front half) and across (the footprint's width).
export function footprintExtent(type, rot = 0) {
  const { w, d } = dimsOf(type, rot);
  const art = ART[type];
  return { up: (art ? art.height : 0) + 4 * (w + d), down: 4 * (w + d), across: 16 * (w + d) };
}

// The pick's one camera move for a monument (spec 6.5, ruling 231): { extent } when the footprint and the finished monument's
// silhouette already fit the free map (the view less the insets and the camera's margin) at the current zoom, else
// { zoom, extent } with the zoom that just fits them, never past MIN_ZOOM and never in (extent { up, down, side }: art px above,
// below and to each side of the footprint's middle, for the camera's keepVisible). Where even MIN_ZOOM cannot hold
// them, the extent's `up` shrinks to what fits (never below the footprint's back half): the footprint stays in view and the
// silhouette's top clips. view: { width, height } CSS px.
export function fitZoom(type, rot, zoom, view, insets, margin = FRAME_MARGIN_PX) {
  const e = footprintExtent(type, rot);
  const k = pxPerArt({ zoom: 1 });                                    // CSS px per art px at zoom 1
  const freeW = view.width - insets.left - insets.right - 2 * margin;
  const freeH = view.height - insets.top - insets.bottom - 2 * margin;
  const fits = Math.min(freeW / (e.across * k), freeH / ((e.up + e.down) * k));
  // side: half the footprint's width each way of its middle, so the camera keeps its corners in view too (ruling 300).
  const extent = { up: e.up, down: e.down, side: e.across / 2 };
  if (fits >= zoom) return { extent };
  if (fits >= MIN_ZOOM) return { zoom: fits, extent };
  // Even the least zoom cannot hold footprint and silhouette (a big text size, a short phone): keep the footprint, its badge and
  // the road-join ring in view and let the silhouette's top clip, so `up` is only the art px the free map holds at MIN_ZOOM
  // above the footprint's middle, never less than the footprint's back half.
  const { w, d } = dimsOf(type, rot);
  const room = freeH / (MIN_ZOOM * k);                                // art px the free map's height holds at the least zoom
  return { zoom: MIN_ZOOM, extent: { up: Math.min(e.up, Math.max(4 * (w + d), room - e.down)), down: e.down, side: e.across / 2 } };
}

// ── The sheets' rows (Task C2) ───────────────────────────────────────────────────────────────────────────────────

const centreOf = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
const MAKER = { stone: 'quarry', bricks: 'brickworks' };

// Where a stall's fix points (spec 4.16 Stalls): Show me opens a card with its ghost near the site (a quarry on the rocky
// ground nearest it), View selects the guild that is short of workers or burning. null when the cause has no fix to offer.
export function causeFix(world, b, reason, status = null) {
  const c = centreOf(b);
  if (reason === 'no_road') return { showMe: { category: 'roads', item: 'road', x: c.x, y: c.y } };
  if (reason === 'no_crew') return { showMe: { category: 'monuments', item: 'builders_guild', x: c.x, y: c.y } };
  if (reason === 'no_stone' || reason === 'no_bricks') {
    const item = MAKER[reason.slice(3)];
    const at = BUILDINGS[item].terrain ? nearestTerrainTile(world, BUILDINGS[item].terrain, c) || c : c;
    return { showMe: { category: 'monuments', item, x: at.x, y: at.y } };
  }
  if (reason === 'waiting_offering') {                       // Version 6.0 (Track A): the great temple's offering: View the store holding most of the good
    const o = monumentsSim.greatWorkStatus(world, b).offering;
    if (!o) return null;
    // (Wave 4 fix, with the Advice item of ruling 786: the sim's own offeringSource) none holds any: View the producer that stands (ruling 805), else Show me the card of
    // what makes it, on its own ground nearest the site (as no_stone and no_bricks aim), or near the site.
    const src = monumentsSim.offeringSource(world, o.good);
    if (src.store !== null) return { view: src.store };
    if (src.maker !== null) return { view: src.maker };
    if (!src.producer || !isUnlocked(world, src.producer)) return null;
    const at = BUILDINGS[src.producer].terrain ? nearestTerrainTile(world, BUILDINGS[src.producer].terrain, c) || c : c;
    return { showMe: { category: categoryOfItem(src.producer), item: src.producer, x: at.x, y: at.y } };
  }
  if (reason === 'crew_short' || reason === 'crew_burning') {
    // The guild the crew plan sends here whose crew cannot work for this reason (site.crews holds only the working ones,
    // so it is empty here, and guildsNear skips every planned guild): the sim's own stalledGuild.
    const id = stalledGuild(world, b, reason);
    return Number.isInteger(id) && world.buildings[id] ? { view: id } : null;
  }
  return null;
}

// A stall's cause in words (spec 4.16), the same on the sheet, in the alert list and on Welcome back; '' for none.
// status: the site's siteStatus (taken when not given): the material stall says what reaches the site, since the sim sets
// it whenever the course under way has none on site, a quarry's slow delivery included.
export function causeText(world, b, reason, status = null) {
  if (!reason) return '';
  if (reason === 'waiting_offering') {                       // Version 6.0 (Track A): what the stage's offering is and what the stores hold
    const o = monumentsSim.greatWorkStatus(world, b).offering;
    return o ? V60_REIGN_TEXT.causeOffering(o) : ui4CauseText(reason);
  }
  if (reason === 'no_stone' || reason === 'no_bricks') {
    const m = (status || siteStatus(world, b)).materials[reason.slice(3)];
    return ui4CauseText(reason, 0, m ? { makers: m.makers.length, stores: m.stores.length } : null);
  }
  return ui4CauseText(reason, extraGoldOf(world, b.type, b.style), null, b.type);
}

// The site sheet's keep rows (Version 8.3, rulings 1440, 1446, 1447): for each material the site is short of (still needs some, and no quarry, brickworks or
// storehouse holding some reaches it), what Track K's Advice would do (siteKeepFix, the sim's own): keep a storehouse in reach stocked from a store that can spare
// the good, or build one near the site first. A good with no fix (no store anywhere can spare it, no room, the storehouse locked) gets no row. Goods whose fix is
// the same store (or both a new storehouse) share a row: [{ key, goods, text, fix }], the first keyed 'keep-stocked'. The fix is { select, keep: { good } } (Show
// me aims the store's Keeps stocked at the good, then selects it, as Advice does) or { showMe } (the card and ghost of the storehouse to build).
export function keepRows(world, b, s = siteStatus(world, b)) {
  if (s.finished) return [];
  const short = MATERIALS.filter((g) => s.materials[g] && s.materials[g].need > 0 && !s.materials[g].makers.length && !s.materials[g].stores.length);
  const groups = [];
  for (const good of short) {
    const f = siteKeepFix(world, b, good);
    if (!f) continue;
    const id = f.build ? 'build' : f.store;
    let g = groups.find((o) => o.id === id);
    if (!g) groups.push(g = { id, goods: [], fix: f.build
      ? { showMe: { category: categoryOfItem('storehouse'), item: 'storehouse', x: f.build.x, y: f.build.y } }
      : { select: f.store, keep: { good } } });
    g.goods.push(good);
  }
  return groups.map((g, i) => ({
    key: i ? `keep-stocked-${g.goods[0]}` : 'keep-stocked', goods: g.goods, fix: g.fix,
    text: g.fix.showMe ? V83_C_TEXT.keepBuild(g.goods) : V83_C_TEXT.keepStocked(g.goods, MONUMENT.supplyReach),
  }));
}

// The workers' camp's offer on a site's sheet (ruling 1436): { show, ok, text, quote }. It shows once a crew walks far enough to be slowed, and stays,
// as a done line, once set up; the price and the effect are in its words.
export function campModel(world, b, crews = siteCrews(world, b)) {
  const quote = campQuote(world, b.id), W = V83_C_TEXT;
  if (b.site && b.site.camp) return { show: true, ok: false, done: true, text: W.campDone, quote };
  if (!crews.some((c) => c.walk < 1)) return { show: false, ok: false, text: '', quote };
  return { show: true, ok: quote.ok, text: quote.ok ? W.campButton(quote.price) : W.campNoGold(quote.price, world.gold), quote };
}

// The site sheet's rows (spec 6.3), from siteStatus: [{ key, text, share?, fix? }] in the spec's order: progress, crews (and the walk and speed
// of each slowed crew, Version 8.3), the cause of the last day without work (with its fix), each material (with the keep rows Advice's fix gives), pace, gold, prestige.
export function siteRows(world, b, s = siteStatus(world, b)) {
  const U = UI4_TEXT;
  const rows = [{ key: 'progress', text: U.progress(s.progress.course, s.progress.courses, s.progress.done), share: s.progress.done }];
  if (monumentsSim.isGreatWork(b)) rows.push({ key: 'stage', text: V60_REIGN_TEXT.stageLine(monumentsSim.greatWorkStatus(world, b)) });   // Version 6.0: the great work's stage
  rows.push({ key: 'crews', text: U.crews(s.crews.guilds.length, s.crews.max) });
  if (!s.finished) {
    const crews = siteCrews(world, b);
    for (const c of crews) if (c.speed < 1) rows.push({ key: `crew-${c.id}`, text: V83_C_TEXT.crewLine(c) });   // a crew at full speed is in the "Crews: n of m" line (ruling 1448)
    // The camp's offer sits right under the crews it speeds up (ruling 1436): a button while it can be paid, else its words (the price, and why not).
    const camp = campModel(world, b, crews);
    if (camp.show) rows.push({ key: 'camp', text: camp.text, camp: camp.ok ? camp : null });
  }
  const keep = keepRows(world, b, s);
  const cause = causeText(world, b, s.reason, s);
  // One stall shows one Show me (ruling 1449): a stall for stone or bricks that a keep row has a fix for leaves its Show me to that row (the fix Advice gives).
  const stalledGood = s.reason === 'no_stone' || s.reason === 'no_bricks' ? s.reason.slice(3) : null;
  const merged = stalledGood !== null && keep.some((k) => k.goods.includes(stalledGood));
  if (cause) rows.push({ key: 'cause', reason: s.reason, text: cause, fix: merged ? null : causeFix(world, b, s.reason, s) });
  for (const g of MATERIALS) {
    const m = s.materials[g];
    if (!m) continue;
    rows.push({ key: `material-${g}`, text: U.material(g, m.onSite, m.makers.length, m.stores.length) });
  }
  rows.push(...keep);   // what the site is short of and a store can spare: a storehouse kept stocked (Advice's own fix)
  if (!s.paused && s.road) {
    let pace = U.paceLater;
    if (s.stalled && s.reason) pace = U.notProgressing(s.reason);                         // stalled now: last month's pace is not what it is doing
    else if (s.pace !== null) pace = U.pace(s.pace);
    else if (s.last && !(s.last.units > 0) && s.reason) pace = U.notProgressing(s.reason);   // no reason: it works today (a crew that came this month)
    rows.push({ key: 'pace', text: pace });
  }
  rows.push({ key: 'gold', text: s.last ? U.lastMonth(s.last.gold, s.last.crews) : U.workGold(workGoldPerUnit(world, b.style) * MONUMENT.unitsPerCrewMonth) });
  rows.push({ key: 'prestige', text: s.prestige.holds ? U.prestige(s.prestige.now, s.prestige.more) : U.otherHolds(b.type) });
  return rows;
}

// How many homes a standing building makes nicer: the homes it adds desirability to (desirabilityContributors).
export function homesMadeNicer(world, b) {
  return housesOf(world).filter((h) => desirabilityContributors(world, h, Infinity).some((c) => c.id === b.id && c.value > 0)).length;
}

// A finished monument's rows (spec 6.3, ruling 258): the day it was finished, its prestige or which other of its kind holds it,
// and the homes it makes nicer.
export function finishedRows(world, b) {
  const U = UI4_TEXT;
  const month = Math.floor(b.site.done / DAYS_PER_MONTH);
  return [
    { key: 'finished', text: U.finishedOn(Math.floor(month / MONTHS_PER_YEAR) + 1, (month % MONTHS_PER_YEAR) + 1) },
    { key: 'prestige', text: holdsPrestige(world, b) ? U.countsFor(prestigeOfBuilding(b)) : U.otherCounts(b.type) },
    { key: 'nicer', text: U.homesNicer(homesMadeNicer(world, b)) },
  ];
}

// A builders' guild's, quarry's or brickworks' line (spec 6.3, ruling 258), or '' (a working quarry says what it makes on the
// Stage 1 work line). A guild is in the crew plan for an open site (working there, or short of workers or on fire) or idle; a
// quarry or brickworks that is needed (supplyNeeded) sends to the first site production.js delivers to (deliverySites, nearest
// first), else it is idle. sim: the sim functions it reads (Track A's crewPlan and deliverySites; a test hands in their contract
// shapes). Until Track A merges this branch has neither export: crewPlan then falls back to the guilds at work (guildSite) and
// deliverySites to no site.
const SUPPLY_SIM = {
  siteStatus, supplyNeeded, guildSite,
  crewPlan: monumentsSim.crewPlan || ((world) => new Map(allBuildings(world).filter((g) => g.type === 'builders_guild' && guildSite(world, g) !== null).map((g) => [g.id, guildSite(world, g)]))),
  deliverySites: monumentsSim.deliverySites || (() => []),
};
export function supplyLine(world, b, sim = SUPPLY_SIM) {
  const U = UI4_TEXT;
  if (b.type === 'builders_guild') {
    if (b.paused) return '';
    const id = sim.crewPlan(world).get(b.id);
    if (id === undefined || !world.buildings[id]) return U.guildIdle(MONUMENT.crewReach);
    const type = world.buildings[id].type;
    if (sim.guildSite(world, b) === id) {                                  // Version 8.3: a crew that walks far says how far and how slowly it works
      const speed = crewSpeedAt(world, b, world.buildings[id]);
      return U.crewAt(type) + (speed < 1 ? V83_C_TEXT.guildWalk({ dist: crewDistance(world, b, world.buildings[id]), speed }) : '');
    }
    return guildBurning(b) ? U.crewBurning(type) : U.crewShort(type);   // the sim's burning: the fire stage, not a blaze
  }
  const good = BUILDINGS[b.type].produces && BUILDINGS[b.type].produces.good;
  if (!good || !MATERIALS.includes(good) || b.paused) return '';
  if (b.blocked === 'idle' || !sim.supplyNeeded(world, b)) return U.supplyIdle(good);   // Track A marks an unneeded one blocked: 'idle'
  const to = sim.deliverySites(world, b)[0];
  return to ? U.sends(good, to.type) : '';
}

// The palace's rows (spec 6.3, 4.20): its style, then its desirability and mood while a road touches it (else that it needs
// one, with Show me), and the works' days left while it is enlarged.
export function palaceRows(world, b) {
  const U = UI4_TEXT;
  const style = PALACE_STYLES[b.style];
  const rows = [{ key: 'style', text: U.palaceStyle(UI4_PALACE_TEXT[style.id].name) }];
  if (touchesRoad(world, b)) rows.push({ key: 'nicer', text: U.palaceNicer(style.desirability) }, { key: 'mood', text: U.palaceMood(palaceMood(world)) });
  else rows.push({ key: 'road', text: U.palaceNoRoad, fix: causeFix(world, b, 'no_road') });
  if (b.works) rows.push({ key: 'works', text: U.palaceWorks(UI4_PALACE_TEXT[PALACE_STYLES[b.works.style].id].to, b.works.left) });
  return rows;
}

// Enlarge the palace (spec 4.20, ruling 273): { ok, text } from palaceQuote: the next style and its price, or why it waits.
export function enlargeModel(world, b) {
  const q = palaceQuote(world, b.id);
  const W = UI4_TEXT.enlargeWhy;
  const next = q.next === null ? null : UI4_PALACE_TEXT[PALACE_STYLES[q.next].id];
  if (q.ok) return { ok: true, text: UI4_TEXT.enlarge(next.to, q.price), quote: q, next };
  let text = W.last_style;
  if (q.reason === 'works') text = W.works(b.works.left);
  else if (q.reason === 'locked') text = W.locked(next.comes, MILESTONES[milestoneIndex(q.milestone)].name);
  else if (q.reason === 'no_road') text = W.no_road;
  else if (q.reason === 'no_gold') text = W.no_gold(world.gold);
  return { ok: false, text, quote: q, next };
}

// What the city's prestige loses if this monument goes: the city counts the best of each kind, so with a second of the kind
// standing it is only the difference (0 for one that does not hold it).
export function prestigeLoss(world, b) {
  let rest = 0;
  for (const k of MONUMENT_KINDS) rest += Math.max(0, ...allBuildings(world).filter((o) => o.type === k && o.id !== b.id).map(prestigeOfBuilding));
  return prestigeOf(world) - rest;
}

// Demolish's question for a monument or the palace (spec 4.16, 4.20): what is lost and the refund; Stage 4.6 (ruling 443): for a building
// units away at the capital come back to, that they leave service; null for anything else.
export function demolishQuestion(world, b) {
  const U = UI4_TEXT;
  const away = world.army ? unitsAwayFrom(world, b.id) : 0;
  if (away > 0) return S46_COURT_TEXT.demolishAway(b.type, away);
  const refund = demolishRefundFor(world, b);
  if (b.type === 'palace') return U.tearDownPalace(b.style + (b.works ? 1 : 0), refund);
  if (!isMonument(b)) return null;
  const lost = prestigeLoss(world, b);
  if (isFinished(b)) return U.tearDownFinished(b.type, lost, refund);
  return U.tearDownSite(b.type, b.site.course, MONUMENTS[b.type].courses.length, lost, refund);
}

// ── The summary and the markers (Task C3) ────────────────────────────────────────────────────────────────────────

// The city summary's Monuments section (spec 6.3), from City: each site with its course (and its share done, for the bar), each
// finished monument, then the city's prestige and what it unlocks next (the next prestige unlock not yet reached, with its
// milestone while that waits), or the prestige of all ten kinds once both are reached. [] before City.
export function summaryRows(world) {
  if (!atLeast(world, 'city')) return [];
  const U = UI4_TEXT;
  const rows = [];
  const mine = allBuildings(world).filter(isMonument).sort((a, b) => MONUMENT_KINDS.indexOf(a.type) - MONUMENT_KINDS.indexOf(b.type) || a.id - b.id);
  for (const b of mine) {
    if (isFinished(b)) rows.push({ key: 'finished', id: b.id, text: U.finishedLine(b.type) });
    else {
      const s = siteStatus(world, b);
      rows.push({ key: 'site', id: b.id, text: U.siteLine(b.type, s.progress.course, s.progress.courses), share: s.progress.done });
    }
  }
  if (!mine.length) rows.push({ key: 'none', text: U.noMonumentYet });
  const p = prestigeOf(world);
  const next = PRESTIGE_UNLOCKS.find((k) => !Number.isInteger(world.prestigeUnlocks[k]));
  if (next) {
    const u = MONUMENTS[next].unlock;
    rows.push({ key: 'prestige', text: U.prestigeNext(p, next, u.prestige, atLeast(world, u.milestone) ? '' : MILESTONES[milestoneIndex(u.milestone)].name) });
  } else rows.push({ key: 'prestige', text: U.prestigeAll(p, MONUMENT_KINDS.reduce((sum, k) => sum + MONUMENTS[k].prestige.courses + MONUMENTS[k].prestige.done, 0)) });   // Stage 4.6: of every kind's share (1,080 for ten), not the score's 700
  return rows;
}

// A count badge (more than one building on its stem) zooms in one step centred on its buildings (ruling 281): the camera's
// target { x, y, zoom }, or null for a single marker (createUI then selects its building).
export function countBadgeTarget(world, marker, zoom) {
  const ids = (marker && marker.ids || []).filter((id) => world.buildings[id]);
  if (ids.length < 2) return null;
  const bs = ids.map((id) => world.buildings[id]);
  const x = bs.reduce((s, b) => s + b.x + b.w / 2, 0) / bs.length, y = bs.reduce((s, b) => s + b.y + b.d / 2, 0) / bs.length;
  return { x, y, zoom: zoom * ZOOM_STEP };
}

// ── The interface ────────────────────────────────────────────────────────────────────────────────────────────────

export function createMonumentUi(ctx) {
  const { world, store } = ctx;
  const after = (e) => { if (typeof ctx.afterCommand === 'function') ctx.afterCommand(e); };
  const motion = () => (ctx.settings && typeof ctx.settings.motionLevel === 'function' ? ctx.settings.motionLevel() : 'still');
  // View's outline (render/overlays.js) reads the interface's clock and Motion level.
  if (world && typeof ctx.now === 'function') setViewClock(world, { now: ctx.now, motion });

  // A row with its fix: Show me opens the card and aims its ghost; View selects the building.
  function fixButton(row) {
    const f = row.fix;
    if (!f) return null;
    if (f.showMe) return button(T.showMe, { class: 'show-me quiet', 'aria-label': `${T.showMe}: ${row.text}`, onClick: () => ctx.showMeAt(f.showMe) });
    if (f.select !== undefined) return button(T.showMe, { class: 'show-me quiet', 'aria-label': `${T.showMe}: ${row.text}`, onClick: () => { aimKeepStocked(f.select, f.keep.good); ctx.selectBuilding(f.select); } });   // Version 8.3: as Advice's Show me: the store's sheet at that good's row
    const g = world.buildings[f.view];
    return button(T.view, { class: 'view quiet', 'aria-label': viewLabel(buildingName(g.type)), onClick: () => ctx.selectBuilding(f.view) });
  }
  const rowList = (cls, rows, site = null) => el('ul', { class: `s4-rows ${cls}` }, rows.map((r) => el('li', { class: `row-${r.key}`, dataset: { row: r.key } }, r.camp ? [button(r.text, { class: 'camp primary', style: { flex: '1 1 100%' }, onClick: () => camp(site, r.camp) })] : [
    el('span', { class: 'text', text: r.text }),
    Number.isFinite(r.share) ? el('span', { class: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.floor(r.share * 100)), 'aria-label': r.text }, [
      el('span', { class: 'fill', style: { width: `${Math.floor(r.share * 100)}%` } })]) : null,
    fixButton(r),
  ])));

  function buildingPart(b) {
    if (isSite(b)) return [rowList('site', siteRows(world, b), b)];
    if (isFinished(b)) return [rowList('finished', finishedRows(world, b))];
    if (b.type === 'palace') return [rowList('palace', palaceRows(world, b))];
    const line = ['builders_guild', 'quarry', 'brickworks'].includes(b.type) ? supplyLine(world, b) : '';
    return line ? [el('p', { class: 'work-status supply-line', text: line })] : [];
  }

  function enlarge(b, m) {
    store.set({ confirmDialog: { text: UI4_TEXT.enlargeAsk(m.next.to, m.quote.price), confirmLabel: UI4_TEXT.enlargeOk, destructive: false, onConfirm: () => {
      const r = enlargePalace(world, b.id);
      if (!r.ok) return;
      if (ctx.toasts) ctx.toasts.show(UI4_TEXT.enlarged(m.next.to, r.days));
      after({ kind: 'enlarge', result: r, undoable: false });
    } } });
  }

  // The workers' camp (Version 8.3, ruling 1436): asks first, with the price and the effect; not undoable.
  function camp(b, m) {
    store.set({ confirmDialog: { text: V83_C_TEXT.campAsk(b.type, m.quote.price), confirmLabel: V83_C_TEXT.campOk, destructive: false, onConfirm: () => {
      // The command judges and prices it again now (the city may have changed while the question was open): a refusal says why.
      const r = setCamp(world, b.id);
      if (!r.ok) { if (ctx.toasts) ctx.toasts.show(V83_C_TEXT.campRefused(r.reason)); return; }
      if (ctx.toasts) ctx.toasts.show(V83_C_TEXT.campSet(b.type, r.price));
      after({ kind: 'camp', result: r, undoable: false });
    } } });
  }

  function actionsPart(b) {
    if (isSite(b)) {
      return [
        button(b.paused ? T.resume : T.pause, { class: 'pause', onClick: () => {
          const r = setPaused(world, b.id, !b.paused);
          if (r.ok) { assignLabour(world); after({ kind: 'pause', result: r, text: b.paused ? T.paused : T.resumed, undoable: false }); }
        } }),
        button(T.view, { class: 'view', 'aria-label': viewLabel(buildingName(b.type)), onClick: () => ctx.selectBuilding(b.id) }),
      ];
    }
    if (b.type === 'palace') {
      const m = enlargeModel(world, b);
      return [button(m.text, { class: m.ok ? 'enlarge primary' : 'enlarge', disabled: !m.ok, onClick: () => enlarge(b, m) })];
    }
    return [];
  }

  function summaryPart() {
    const rows = summaryRows(world);
    return rows.length ? [el('h3', { text: UI4_TEXT.monuments }), rowList('summary-monuments', rows)] : [];
  }

  return {
    sheets: {},
    sheetParts: { building: buildingPart, actions: actionsPart, summary: summaryPart },
    onEvents(events) {
      for (const e of events) {
        if (e.type !== 'palace_done') continue;
        const b = world.buildings[e.id];
        // The caption is Track D's (monumentCaptions, ruling 5); only the sparkle is the sheet's.
        if (b && ctx.effects && motion() === 'full') ctx.effects.sparkle(b.x + b.w / 2, b.y + b.d / 2, GOLD, ctx.now());   // a small sparkle under Full only
      }
    },
    // The palace's tip (ruling 275), once, when the city first could enlarge it (the tips keep it to once a device).
    refresh() {
      if (!world || typeof ctx.fireTip !== 'function') return;
      const palace = allBuildings(world).find((b) => b.type === 'palace');
      if (palace && palaceQuote(world, palace.id).ok) ctx.fireTip('palaceCanGrow');
      // Version 8.3 (ruling 1442): the first time a crew walks far enough to be slowed on a site with no camp, the tip says what the camp is.
      const sites = allBuildings(world).filter((b) => isSite(b) && !b.site.camp);
      if (sites.length) { const plan = monumentsSim.crewPlan(world); if (sites.some((b) => siteCrews(world, b, plan).some((c) => c.walk < 1))) ctx.fireTip('farCrew'); }
    },
    onAlertAction(alert, action) {},
    // Undo refused once work has begun on a site (ruling 236): its own words, naming the site (placement.js passes it on).
    onCommand(e) {
      if (e.kind === 'undo_refused' && e.result && e.result.reason === 'work_begun' && ctx.toasts) ctx.toasts.show(UI4_TEXT.workBegun(e.result.type));
    },
    pickFit(type, ghost, insets) {
      const shown = cameraOf(world);
      if (!shown || !BUILDINGS[type] || !BUILDINGS[type].monument || !ghost) return null;
      const tool = store && store.get().tool;
      return fitZoom(type, tool && tool.rot ? 1 : 0, shown.cam.zoom, shown.view(), insets);
    },
    // The silhouette's drawn height in art px at zoom 1 (the art entry's height, not footprintExtent().up, which adds the back
    // half of the footprint); null for anything that is not a monument. Ruling 9 (controller).
    grabExtent(type, rot) {
      if (!BUILDINGS[type] || !BUILDINGS[type].monument) return null;
      const art = ART[type];
      return { up: art ? art.height : 0 };
    },
    markerTap(marker) {
      const shown = cameraOf(world);
      const t = shown && ctx.cameraControl ? countBadgeTarget(world, marker, shown.cam.zoom) : null;
      if (!t) return false;
      // Centred: the free map is a one-pixel box at the screen's middle, so the least pan puts the buildings there.
      const c = ctx.cameraControl.centre();
      ctx.cameraControl.keepVisible(t.x, t.y, { top: c.y - 1, bottom: c.y - 1, left: c.x - 1, right: c.x - 1 }, 0, undefined, null, t.zoom);
      return true;
    },
    destroy() {},
  };
}
