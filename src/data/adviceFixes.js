// Version 7.0, Track A (wave 2, rulings 960-974): the two Advice fixes from 6.0 (raid towers only where they defend the first target;
// stranded goods answered with a storehouse near the bazaar) and the words for trade and events. Track 0 (contract,
// docs/superpowers/notes/2026-10-23-version-7-0-contract.md) laid out the lists; Track A owns this file. A leaf data file: it imports
// nothing (src/data/v70.js joins its tips).

// Salts, Track A's range 6161-6169 (tests/v70/contract keeps every salt unique), if it needs any.
export const ADVICE_FIX_SALT = { spare1: 6161 };

// Track A's tips (the Quay, the Trade sheet, events: words in Track A's text.js section).
export const ADVICE_FIX_TIPS = [];
