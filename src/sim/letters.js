// Version 9.2 (Track Q, ruling 1776): the court's one gate over the four letter streams ('event': city events, 'demand': demands, 'request' and 'card': the
// court's). Each scheduler asks letterMayCome before it issues its next letter and calls noteLetter after one is issued; each stream keeps its own content, order
// and schedule, and the gate only holds a letter back.
//   A letter waits while another is open: a city event waiting for its answer, a demand offered and not yet taken up, a court card, or a court request not yet read
//   (each for at most LETTER_STALE_MONTHS from the day it came).
//   And none comes within LETTER_GAP months of the last: noteLetter draws the gap (5 to 8 months) from the sim's own seeded stream.
// The gate lives on an optional world field, world.letterGate = { lastDay, nextDay, n }: absent (every city until its first letter on this build) it is open and
// the four schedules are as 9.1 had them, so an old save loads with its letters as they were and no world-version bump is needed (ruling 1777).
import { DAYS_PER_MONTH } from './time.js';
import { hash2 } from './rng.js';

export const LETTER_KINDS = ['event', 'demand', 'request', 'card'];
export const LETTER_GAP = [5, 8];            // months between one letter and the next (ruling 1776)
const GATE_SALT = 0x1e77e5;

// Whether a letter is open (waiting on the player) in any of the four streams. A letter ignored for LETTER_STALE_MONTHS stops holding the court's door shut: an
// unanswered card must not silence every other letter for the rest of the game (the quiet is the pace, never neglect).
export const LETTER_STALE_MONTHS = 6;
export function letterOpen(world) {
  const fresh = (day) => !(Number.isFinite(day)) || world.day - day < LETTER_STALE_MONTHS * DAYS_PER_MONTH;
  const e = world.cityEvents;
  if (e && e.waiting && fresh(e.waiting.day)) return true;
  const d = world.demands;
  if (d && Array.isArray(d.open) && d.open.some((x) => !x.accepted && fresh(x.day))) return true;
  const c = world.court;
  if (c && Array.isArray(c.letters) && c.letters.some((l) => fresh(l.day) && (l.kind === 'card' || (!l.read && c.request && c.request.id === l.id)))) return true;
  return false;
}

// Whose turn it is (the gate lets one stream through at a time, so none may starve behind another that is always due first): a stream that asks is a candidate
// (g.want[kind] = { last, tries }) while it has asked within ASK_FRESH_DAYS; when the gate is open the candidate served longest ago goes (g.served[kind]: the day its
// last letter was sent, 0 for none yet), the order of LETTER_KINDS breaking a tie. A stream let through on several days that sent nothing (its pool was empty) is
// counted as served, so the next in line goes.
const ASK_FRESH_DAYS = 40, TRIES_BEFORE_BACK = 3;
export function letterMayCome(world, kind) {
  const g = world.letterGate;
  if (!g) return true;                          // absent: today's schedules
  const day = world.day, want = g.want || (g.want = {}), served = g.served || (g.served = {});
  const e = want[kind] || (want[kind] = { last: day, tries: 0 });
  if (day - e.last > ASK_FRESH_DAYS) e.tries = 0;
  e.last = day;
  if (day < g.nextDay || letterOpen(world)) return false;
  let head = null;
  for (const k of LETTER_KINDS) {
    const w = want[k];
    if (!w || day - w.last > ASK_FRESH_DAYS) continue;
    if (!head || (served[k] || 0) < (served[head] || 0)) head = k;
  }
  if (head !== kind) return false;
  if (e.granted !== day) { e.granted = day; e.tries += 1; }
  if (e.tries > TRIES_BEFORE_BACK) { served[kind] = day; e.tries = 0; return false; }   // let through again and again with nothing to send: the next in line goes
  return true;
}

export function noteLetter(world, kind) {
  const g = world.letterGate || (world.letterGate = { lastDay: 0, nextDay: 0, n: 0 });
  const [lo, hi] = LETTER_GAP;
  const u = hash2(g.n, world.day, (world.seed + GATE_SALT) | 0);
  const months = lo + Math.min(hi - lo, Math.floor(u * (hi - lo + 1)));
  g.lastDay = world.day;
  g.nextDay = world.day + months * DAYS_PER_MONTH;
  g.n += 1;
  (g.served || (g.served = {}))[kind] = world.day;
  if (g.want && g.want[kind]) g.want[kind].tries = 0;
}
