// Version 7.0, Track S (rulings 930-959): the season the land shows, read from the flood calendar (ruling 851: looks only; farms work as in
// 6.0). Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left the season by month with no blend; Track S owns
// this file and adds the one-month blend. Pure and deterministic (world.day alone): the render, the top bar and the music may call it every
// frame; nothing in the sim reads it.
import { SEASONS } from '../data/tips.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';

// { season, next, blend }: season is the month's SEASONS id ('akhet' the flood, 'peret' the growing, 'shemu' the harvest); next the season
// the land is turning to; blend how far it has turned, 0 (all season) to 1 (all next). Track 0's: next is season and blend 0.
export function seasonAt(world) {
  const season = SEASONS[Math.floor(world.day / DAYS_PER_MONTH) % MONTHS_PER_YEAR];
  return { season, next: season, blend: 0 };
}
