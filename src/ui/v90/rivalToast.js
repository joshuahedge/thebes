// Version 9.0 "Dynasty" (wave 0 seam, ruling 1563; Track L owns this file): the rival toast at a new split. The interface (src/ui/createUI.js)
// calls onSplit once for each split whose first day the city records (the five milestones, the pyramids, the great pyramid: SPLITS), with the
// split's id and the interface's seam context (records through ctx.hooks.records, toasts through ctx.toasts). A split already recorded when the
// interface opens (a loaded city) never calls it.
// Ruling 1590: on a city whose map has a rival, the newest one's toast compares the two in whole game months ("Town: 2 months ahead of Ana"); a rival
// whose link had not reached the split says so. The lesson never toasts, even on a device that keeps a rival on seed 7 (design section 10).
import { MILESTONES } from '../../data/progression.js';
import { splitMonths } from '../../sim/score.js';
import { SCORE4_TEXT, V90_L_TEXT } from '../text.js';

// The split's name in the toast: a milestone's own name, or the pyramids' ("Pyramids unlocked").
export const splitName = (id) => SCORE4_TEXT.splitNames[id] || (MILESTONES.find((m) => m.id === id) || { name: id }).name;

// The toast's words for one split against one rival, or null when the city has not recorded it. Both sides count whole game months; said from your side:
// the rival's month minus yours is how far ahead you are (their 9 against your 7 is "2 months ahead of Ana"; their 5 is "2 months behind Ana").
export function rivalSplitText(world, id, rival) {
  const mine = splitMonths(world)[id];
  if (!Number.isInteger(mine)) return null;
  const theirs = rival.splits ? rival.splits[id] : null;
  if (!Number.isInteger(theirs)) return V90_L_TEXT.rivalNotThere(rival.name, splitName(id));
  return V90_L_TEXT.rivalSplit(rival.name, splitName(id), theirs - mine);
}

export function onSplit(world, id, ctx) {
  if (!world || world.lesson || !ctx || !ctx.toasts) return;
  const records = ctx.hooks && ctx.hooks.records;
  let rival = null;
  try { rival = records ? records.rivalsFor(world.seed, world.difficulty, world.mapVariant, world.mapSize)[0] || null : null; } catch (e) { rival = null; }
  if (!rival) return;
  const text = rivalSplitText(world, id, rival);
  if (text) ctx.toasts.show(text);
}
