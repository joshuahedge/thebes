// Feats (spec 4.19): named, optional style bonuses, per city; no gold, never gating. Stage 3 contract: Track E implements
// the STUB and fills FEATS (src/data/feats.js) with their words. State: world.feats = { earned, lost, counters }:
// earned and lost are feat ids (lost: can no longer be earned, e.g. Grain alone once a fig orchard stands before Market
// town), counters a record of whole numbers the checks keep (a streak of fed months, say). runMonth and settle call it.
//
// STUB. Records each feat newly earned (pushing { type: 'feat', id }) or ruled out; returns the ids earned by this call.
// Peaceful skips the raid feats (spec 4.18).
export function checkFeats(world, events = null) {
  return [];
}
