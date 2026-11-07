// Version 9.0 "Dynasty": Pass the throne's sheet (Track D owns the sheet). passSheetExtras is wave 0's seam (ruling 1563; Track L owns it):
// the sheet calls it once, after its own five parts, to draw the rival side by side into body. ctx is the sheet's context (the interface's seam
// context and the records). Track L's body (ruling 1592) draws sideBySide.js's section: it reads the records from ctx.records, else ctx.hooks.records, and
// the map's newest rival from them (ctx.rival, when the sheet already holds one, wins); the score is ctx.score ({ total, parts }) or the city's own, measured now.
// A map with no rival draws nothing.
import { scoreOf } from '../../sim/score.js';
import { sideBySide } from './sideBySide.js';

export function passSheetExtras(body, world, ctx = {}) {
  let rival = ctx && ctx.rival ? ctx.rival : null;
  if (!rival) {
    const records = (ctx && (ctx.records || (ctx.hooks && ctx.hooks.records))) || null;
    try { rival = records ? records.rivalsFor(world.seed, world.difficulty, world.mapVariant, world.mapSize)[0] || null : null; } catch (e) { rival = null; }
  }
  if (!rival) return;
  const score = ctx && ctx.score ? ctx.score : scoreOf(world);
  body.append(sideBySide({ score: score.total, parts: score.parts, heir: world.heir }, rival, { id: 'pass-side-by-side' }));
}
