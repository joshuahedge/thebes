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

const scaled = (world, base) => Math.max(1, Math.round(base * DIFFICULTIES[world.difficulty].cost));

export const costOf = (world, type) => scaled(world, BUILDINGS[type].cost);

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

// Soldiers' pay for a month (spec 4.11): per soldier, in peace too and from a paused barracks; never scaled.
export const soldiersPayOf = (world) => world.soldiers.length * DEFENCE.soldierPay;
