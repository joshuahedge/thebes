// Pharaoh's court (Stage 4.6, Court track, rulings 336-339): favour, the capital's requests, the event cards and the letters that
// carry them. Track 0 wrote the stubs every other file calls; the Court track owns this file and fills them in. World state:
// world.court (src/data/court.js newCourtState). Draws: hash2(a, b, (world.seed + COURT_SALT.x) | 0).
//
// Two hooks are called from src/sim/raids.js (the Armies track's file): favour's effect on a raid's size and on its tribute. The
// Court track owns what they return; the Armies track owns the calls and keeps them (raidSize, tributeFor). Favour never changes a
// raid's mix by enemy kind: that is the Armies track's, drawn from the size these hooks give. Do not import raids.js here (raids.js
// imports this file); read world.raid directly.

// STUB (Court): one day of the court (a letter arriving, a request's deadline passing, a card drawn).
export function courtDay(world, events = null) {}

// STUB (Court): the month's court work (favour's drift, a gift at high favour).
export function courtMonth(world, events = null) {}

// STUB (Court): the court's alerts. A letter waiting to be read is { code: 'court_letter', letter: <id> }, ranked in the alert row
// below an active raid, an uncovered fire and a raid warning, and above debt (src/ui/alerts.js CRITICAL_RANK).
export const courtAlerts = (world) => [];

// Favour's effect on a raid (ruling 336), called by raids.js: the raid size a warning fixes now, after the usual rule and its caps
// (favourRaidSize: at FAVOUR.low or less one size step bigger), and the multiplier on its tribute (favourTributeFactor:
// FAVOUR.tributeHigh at FAVOUR.high or more, FAVOUR.tributeLow at FAVOUR.low or less). STUBS: no effect until the Court track fills
// them in.
export const favourRaidSize = (world, size) => size;
export const favourTributeFactor = (world) => 1;
