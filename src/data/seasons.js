// Version 7.0, Track S (rulings 930-959): seasons (looks only), a gentle day and night, and sound polish. Track 0 (contract,
// docs/superpowers/notes/2026-10-23-version-7-0-contract.md) laid out the names; Track S owns this file and tunes it. Nothing here enters
// the sim or the save: the seasons are read from the flood calendar (src/sim/seasons.js seasonAt), the light from the real clock
// (src/render/light.js lightAt). A leaf data file: it imports nothing (src/data/v70.js joins its tips).

// The seasons are SEASONS' ids (src/data/tips.js, built from the flood's months): 'akhet' the flood, 'peret' the growing, 'shemu' the harvest.
export const SEASON_IDS = ['akhet', 'peret', 'shemu'];

// The light loop (ruling 852): about six minutes of real time a cycle, in the render layer only. Track S sets the phases.
export const LIGHT = { cycleMs: 6 * 60 * 1000 };
export const LIGHT_PHASES = ['dawn', 'day', 'dusk', 'night'];

// Salts for drawing only (render), Track S's range 6151-6159 (tests/v70/contract keeps every salt unique).
export const SEASON_SALT = { spare1: 6151, spare2: 6152 };

// Track S's tips (src/data/v70.js joins them; words in Track S's text.js section).
export const SEASON_TIPS = [];
