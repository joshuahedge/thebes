import { ECONOMY } from '../data/economy.js';

export const canAfford = (world, cost) => world.gold - cost >= ECONOMY.debtFloor;

export function spend(world, amount) { world.gold -= amount; }

export function refund(world, amount) { world.gold += amount; }
