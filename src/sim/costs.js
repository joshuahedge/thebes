// What things cost in this city (spec 4.11, 4.18): the data's base cost times the city's difficulty, rounded to
// whole gold and never below 1. Every command, preview and card reads costs through here, so a Hard city's well
// costs the same on its card, in the confirm bar, in the treasury and in its undo. Trade routes too, and from Stage 3
// wall and gate tiles (costOf(world, 'wall'), costOf(world, 'gate')), rubble clearing and festivals. Tribute is
// priced from the tower's cost here (src/sim/raids.js tributeQuote).
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { DIFFICULTIES } from '../data/difficulty.js';
import { PARTNERS } from '../data/trade.js';
import { FIRE } from '../data/fire.js';
import { FESTIVAL, DEFENCE } from '../data/raids.js';
import { MONUMENTS, MONUMENT } from '../data/monuments.js';
import { PALACE_STYLES } from '../data/palace.js';
import { UNIT_TYPES } from '../data/armies.js';
import { MONUMENT_STYLES } from '../data/wonders.js';
import { COST_SCALE_NONE } from '../data/reign.js';

const scaled = (world, base) => Math.max(1, Math.round(base * DIFFICULTIES[world.difficulty].cost));

// Version 6.0 (Track 0 seam, Track A fills it; ruling 622): what grows with the city on top of the difficulty's cost, as multipliers
// { wages, upkeep, monuments, court } (src/data/reign.js COST_SCALE_NONE: all 1). Already applied where each is paid, so no other track
// touches a cost: wages and upkeep in src/sim/economy.js (monthFigures, monthlyBill with a world, balanceWith, biggestCost); monuments
// here (a monument's founding in costOf, workGoldPerUnit, extraGoldOf); court in src/sim/raids.js tributeFor (Track A applies it to what
// the court asks in its own files). STUB: today's costs, at every rank.
export const costScale = (world) => COST_SCALE_NONE;

// Stage 4.6 (Wonders track, rulings 343, 394): a monument's style multiplies all the gold it takes (MONUMENT_STYLES[style].goldFactor: Gilded
// 1.1): its founding here, its work gold (workGoldPerUnit) and its gilding or capstone (extraGoldOf). A style the data does not know, or no
// style, is 1, and so is anything that is not a monument.
export const styleGoldFactor = (style) => (MONUMENT_STYLES[style] ? MONUMENT_STYLES[style].goldFactor : 1);
export const costOf = (world, type, options = {}) => scaled(world, BUILDINGS[type].cost * (BUILDINGS[type].monument ? styleGoldFactor(options.style) * costScale(world).monuments : 1));

export const roadCostOf = (world) => scaled(world, ECONOMY.roadCost);

export const routeCostOf = (world, partnerId) => scaled(world, PARTNERS[partnerId].routeCost);

// Clearing one rubble tile (spec 4.12): 5 gold times the difficulty's cost, rounded per tile.
export const rubbleCostOf = (world) => scaled(world, FIRE.rubbleCost);

// Holding a festival (spec 4.13): 200 gold times the difficulty's cost.
export const festivalCostOf = (world) => scaled(world, FESTIVAL.cost);

// The difficulty's risk multiplier (spec 4.18): fire risk build-up and raid size. Never raid timing, the first raid's
// size, upkeep or wages.
export const riskOf = (world) => DIFFICULTIES[world.difficulty].risk;

// Whether this city has raids at all: every level but Peaceful (spec 4.18).
export const raidsOn = (world) => DIFFICULTIES[world.difficulty].raids !== false;

// Whether this city has disease and crime (Stage 4.5, ruling 320): the same levels as raids, so Peaceful has neither.
export const threatsOn = (world) => raidsOn(world);

// Soldiers' pay for a month (spec 4.11): per soldier, in peace too and from a paused barracks; never scaled.
// Stage 4.6 (Armies track, ruling 386): every unit at home by its kind's pay (UNIT_TYPES[kind].pay; a soldier's is DEFENCE.soldierPay);
// units away at the capital are not in world.soldiers, so they are not paid.
export const soldiersPayOf = (world) => world.soldiers.reduce((s, u) => s + (UNIT_TYPES[u.kind] || UNIT_TYPES.soldier).pay, 0);

// Stage 4 (spec 4.11, 4.16, 4.20). A monument's founding is costOf(world, type) (its BUILDINGS cost). Work gold is
// MONUMENT.goldPerUnit for each unit laid times the difficulty's cost, NOT rounded here: the site pays whole gold and
// carries the fraction (ruling 240). The gilding and the capstone, and each palace style's price, are rounded like any cost.
export const workGoldPerUnit = (world, style = null) => MONUMENT.goldPerUnit * DIFFICULTIES[world.difficulty].cost * styleGoldFactor(style) * costScale(world).monuments;
export const extraGoldOf = (world, type, style = null) => {
  const m = MONUMENTS[type];
  return m && m.extra ? scaled(world, m.extra.gold * styleGoldFactor(style) * costScale(world).monuments) : 0;
};
export const palacePriceOf = (world, style) => (style > 0 && PALACE_STYLES[style] ? scaled(world, PALACE_STYLES[style].price) : 0);

// Gold that must never take the treasury below 0 (founding, work gold, gilding, the capstone, enlarging the palace;
// tribute's own rule is the same): true when paying `cost` keeps it at 0 or above.
export const canPayNoDebt = (world, cost) => world.gold - cost >= 0;
