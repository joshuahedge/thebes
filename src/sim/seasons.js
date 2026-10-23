// Version 7.0, Track S (rulings 930-959): the season the land shows, read from the flood calendar (ruling 851: looks only; farms work as in
// 6.0). Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left the season by month with no blend; Track S owns
// this file and adds the one-month blend. Pure and deterministic (world.day alone): the render, the top bar and the music may call it every
// frame; nothing in the sim reads it.
import { SEASONS } from '../data/tips.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';

// { season, next, blend }: season is the month's SEASONS id ('akhet' the flood, 'peret' the growing, 'shemu' the harvest); next the season
// the land is turning to; blend how far it has turned, 0 (all season) to 1 (all next). The land turns over a season's last month (ruling
// 930): through it `blend` climbs a thirtieth a day from 0 to 29/30 and `next` is the season that follows, so at the month's end the new
// season starts at 0 looking as the old one finished (no jump). In every other month next is the season itself and blend 0.
export function seasonAt(world) {
  const month = Math.floor(world.day / DAYS_PER_MONTH) % MONTHS_PER_YEAR;
  const season = SEASONS[month], next = SEASONS[(month + 1) % MONTHS_PER_YEAR];
  if (next === season) return { season, next: season, blend: 0 };
  return { season, next, blend: (((world.day % DAYS_PER_MONTH) + DAYS_PER_MONTH) % DAYS_PER_MONTH) / DAYS_PER_MONTH };
}

// The season a day is in, for a caller that has only the day (the season the top bar and the music name).
export const seasonOfDay = (day) => seasonAt({ day }).season;
