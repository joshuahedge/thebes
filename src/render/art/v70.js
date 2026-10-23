// Version 7.0 (Track 0): the tracks' art joined for the registry (src/render/art/registry.js spreads V70_ART into ART and asks v70Slot after
// Stage 4.6's in slotFor). A track edits only its own art file (trade.js: T; seasons.js: S), never this one or registry.js.
import { TRADE_ART, tradeSlot } from './trade.js';
import { SEASON_ART, seasonSlot } from './seasons.js';

export const V70_ART = { ...TRADE_ART, ...SEASON_ART };

// The slot a Version 7.0 building shows (Track T's Quay, then a season's state), or null to let slotFor go on as before.
export const v70Slot = (b, world) => tradeSlot(b, world) || seasonSlot(b, world);
