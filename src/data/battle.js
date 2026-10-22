// Version 6.0, Track B2 (rulings 720-739): battles you can see. Drawing only: nothing here is read by the sim. Track 0 (contract,
// docs/superpowers/notes/2026-10-22-version-6-0-contract.md) made the file; Track B2 owns it. A leaf data file: it imports nothing.

// Salts for the drawing's own draws (hash2 with (world.seed + BATTLE_SALT.x) | 0), Track B2's range 6061-6069; never used by the sim.
// Rename the spares as they are used; never reuse a number.
export const BATTLE_SALT = { clash: 6061, arrows: 6062, smoke: 6063, banner: 6064, rubbleLook: 6065, spare1: 6066, spare2: 6067 };
