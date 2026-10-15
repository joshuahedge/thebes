// Version 5.0 (Task 2): the words of a house sheet's top line, from the sim's nextStep (src/sim/advice.js): the one thing to do next with its price and a
// Show me, or why there is nothing to do (waiting on a delivery, locked behind a milestone, ready to grow, kept, an empty plot). Every number and name
// is nextStep's own (its fix, its cost, its days, its locked milestone), and a building is named only when the cost line prices it: a good nothing makes
// names the first maker the city lacks (the one the price and Show me are for), never "a clay pit and a potter" beside the price of one.
import { BUILDINGS } from '../data/buildings.js';
import { MILESTONES } from '../data/progression.js';
import { TIERS } from '../data/housing.js';
import { categoryOfItem } from '../data/ui.js';
import { allBuildings } from '../sim/world.js';
import { goodMakers } from '../sim/advice.js';
import { NEED_NAMES, buildingName, goodName, plural, T, viewLabel, S47_PRESSURE_TEXT } from './text.js';
import { nearestTerrainTile } from './goalsList.js';

// The ground words for a building bound to one (Show me's refusal says "no fertile land with room for it").
export const GROUND = { fertile: 'fertile land', rocky: 'rocky ground', clay: 'clay ground' };

// What a need is, said as what the home gets ("gives this home water").
const GIVES = {
  road: 'road access', water: 'water', food: 'food', religion: 'a temple in reach', pottery: 'pottery', entertainment: 'entertainment', beer: 'beer',
  twoFoods: 'a second kind of food', linen: 'linen', jewellery: 'jewellery', desirability: 'a pleasanter street', merge: `room to become a ${TIERS[6].name}`,
};
const needWord = (need) => (NEED_NAMES[need] || need).toLowerCase();
const gives = (need) => GIVES[need] || needWord(need);
const an = (word) => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;
const milestoneName = (id) => (MILESTONES.find((m) => m.id === id) || { name: 'a later milestone' }).name;
const days = (n) => plural(n, 'day', 'days');

// The label that opens the line, and the words that follow it when there is nothing to build.
export const STEP_LABELS = { next: 'Next step:', waiting: 'Waiting:', locked: 'Locked:', ready: 'Ready:', kept: 'Kept:', empty: 'Empty:' };
export const STEP_TEXT = {
  kept: 'nothing more to do',
  empty: 'people move in as the city draws them',
  decides: (n) => `the month's check decides (${days(n)})`,
  arriving: (what, n) => `${what} on its way (${days(n)})`,
  ready: (name, n) => `this home grows to ${an(name)} at the month's end (${days(n)})`,
  locked: (item, milestone, need) => `the ${buildingName(item).toLowerCase()} comes with ${milestoneName(milestone)}; this home's ${need} waits for it`,
  // The price in the parentheses: "30 gold", "5 gold a tile", and when the treasury cannot pay it, how much it has (colour is never the only cue).
  price: (gold, unit, have, short) => `${gold} gold${unit ? ` a ${unit}` : ''}${short ? `, more than the ${have} you have` : ''}`,
};

// The makers the city lacks for a good, first to build first (src/sim/advice.js unmadeFix builds the first).
const lacking = (world, good) => goodMakers(good).filter((t) => !allBuildings(world).some((b) => b.type === t));

// What the button does, the way a checklist row's Show me does: { category, item, x, y } for a building, road or plots (a farm or mine at the nearest
// free tile of its ground), or { select: id }.
export function stepTarget(world, fix) {
  if (!fix) return null;
  if (fix.select !== undefined) return { select: fix.select };
  const def = BUILDINGS[fix.item];
  const at = fix.at === 'terrain' && def && def.terrain ? nearestTerrainTile(world, def.terrain, fix.target) || fix.target : fix.target;
  return { category: categoryOfItem(fix.item), item: fix.item, x: at.x, y: at.y };
}

// The line for a house's nextStep: { reason, label, rest, text, action, short }
//   label   'Next step:', 'Waiting:', 'Locked:', 'Ready:', 'Kept:' or 'Empty:' (the word is the cue, never a colour)
//   rest    the words after it; text = `${label} ${rest}`
//   action  { label: Show me | View, aria, build: {category,item,x,y} } or { ..., select: id }; null when there is nothing the player can do
//   short   true when the fix's price is more than the treasury can pay (the words say so too)
export function stepWords(world, home, step) {
  const out = { reason: step.reason, label: '', rest: '', text: '', action: null, short: false };
  const done = (label, rest) => { out.label = label; out.rest = rest; out.text = `${label} ${rest}`; return out; };
  const c = step.cause;
  switch (step.reason) {
    case 'waiting': {
      if (!c || c.code !== 'next_delivery') return done(STEP_LABELS.waiting, STEP_TEXT.decides(step.days));
      const what = step.need === 'twoFoods' ? 'the second kind of food' : needWord(step.need);
      return done(STEP_LABELS.waiting, STEP_TEXT.arriving(what, step.days));
    }
    case 'locked': return done(STEP_LABELS.locked, STEP_TEXT.locked(step.locked.item, step.locked.milestone, needWord(step.need)));
    case 'ready': return done(STEP_LABELS.ready, STEP_TEXT.ready(step.next.name, step.days));
    case 'kept': return done(STEP_LABELS.kept, STEP_TEXT.kept);
    case 'empty': return done(STEP_LABELS.empty, STEP_TEXT.empty);
    default: break;
  }
  const f = step.fix;
  const b = c && c.id !== null && c.id !== undefined ? world.buildings[c.id] || null : null;
  if (f.select !== undefined) {
    // A building in reach that is not serving the home (its own sheet says how to fix it), or the far store that holds a good (Fetch).
    const n = b ? buildingName(b.type).toLowerCase() : 'building';
    if (f.why === 'good_far') {
      out.action = { label: T.showMe, aria: S47_PRESSURE_TEXT.showFar(c, world), select: f.select };
      return done(STEP_LABELS.next, `have a store near the bazaar fetch ${goodName(c.good).toLowerCase()} by cart (it is held ${plural(c.len, 'road tile', 'road tiles')} from the bazaar)`);
    }
    out.action = { label: T.view, aria: viewLabel(buildingName(b ? b.type : 'building')), select: f.select };
    const rest = /no_road$/.test(c.code) ? `lay a road beside the ${n}`
      : b && b.paused ? `resume the ${n} in reach (it is paused)`
        : `the ${n} in reach is short of workers (more homes bring more workers)`;
    return done(STEP_LABELS.next, rest);
  }
  // A build: "a well near here (30 gold) gives this home water".
  const price = (unit) => { out.short = step.afford === false; return `(${STEP_TEXT.price(step.cost, unit, world.gold, out.short)})`; };
  let rest;
  if (f.item === 'road') rest = `a road beside this home ${price('tile')} gives it ${gives(step.need)}`;
  else if (f.item === 'house') rest = `house plots beside this home ${price('plot')} give it ${gives(step.need)}`;
  else {
    const def = BUILDINGS[f.item];
    const nearHome = !b || f.target.x === home.x + home.w / 2 && f.target.y === home.y + home.d / 2;
    const place = f.at === 'terrain' && def.terrain ? `on ${GROUND[def.terrain] || 'the right ground'}` : nearHome ? 'near here' : `near the ${buildingName(b.type).toLowerCase()}`;
    const first = c.code === 'good_unmade' && lacking(world, c.good || step.need).length > 1;   // a clay pit now, a potter after it: the first only starts the good
    const result = first ? `starts ${gives(step.need)} for this home` : `gives this home ${gives(step.need)}`;
    rest = `${an(buildingName(f.item).toLowerCase())} ${place} ${price()} ${result}`;
  }
  out.action = { label: T.showMe, aria: `${T.showMe}: ${rest}`, build: stepTarget(world, f) };
  return done(STEP_LABELS.next, rest);
}
