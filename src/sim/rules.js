// src/sim/rules.js
// Version 9.3, the weekly decree (spec section 5, rulings 1952-1954): every twist a decree puts on the sim, read in its lever's one function. With no
// world.decree each function gives exactly what the game read before 9.3 (ruleFactor is heirFactor), so the main game plays as it did (the golden test).
// world.js and the files it imports may not import this file (dynasty.js imports world.js through score.js): they read src/data/decrees.js helpers.
import { DECREES } from '../data/decrees.js';
import { BUILDINGS } from '../data/buildings.js';
import { heirFactor } from './dynasty.js';

const decreesOf = (world) => (world && world.decree && Array.isArray(world.decree.ids) ? world.decree.ids.map((id) => DECREES[id]).filter(Boolean) : []);
const product = (world, key, name) => decreesOf(world).reduce((f, d) => (d[key] && typeof d[key][name] === 'number' ? f * d[key][name] : f), 1);

export const ruleFactor = (world, lever) => heirFactor(world, lever) * product(world, 'factors', lever);
export const ruleCost = (world, type) => product(world, 'cost', type);
export const ruleRate = (world, type) => product(world, 'rate', type);
export const ruleUnitPay = (world, kind) => product(world, 'unitPay', kind);
export function ruleReach(world, type, base) {
  return decreesOf(world).reduce((r, d) => (d.reach && Number.isFinite(d.reach[type]) ? Math.max(r, d.reach[type]) : r), base);
}
export const ruleElephantsFrom = (world, base) => decreesOf(world).reduce((r, d) => (Number.isInteger(d.elephantsFrom) ? Math.min(r, d.elephantsFrom) : r), base);
export const ruleBoatShare = (world, base) => decreesOf(world).reduce((r, d) => (Number.isFinite(d.boatShare) ? Math.max(r, d.boatShare) : r), base);
export const ruleForbids = (world, type) => decreesOf(world).some((d) => Array.isArray(d.forbid) && d.forbid.includes(type));
export const isDecreeRun = (world) => decreesOf(world).length > 0;
export const decreeEnded = (world) => Boolean(world && world.decree && world.decree.ended);

// A store's capacity: the data's, times the decree's granaryHold for a granary (1 with none). world may be omitted (the data's number).
export const capacityOf = (world, type) => BUILDINGS[type].capacity * (type === 'granary' ? ruleFactor(world, 'granaryHold') : 1);
// What every command gives once the decree has ended (spec section 2): refused, with this reason.
export const endedFail = () => ({ ok: false, reason: 'decree_ended' });
