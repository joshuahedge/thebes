// Feats (spec 4.19): named, optional style bonuses, per city. They pay nothing, gate nothing and can be missed; they
// list under achievements in their own group and show when a reign is sealed. Track E fills this list with the ten
// feats of spec 4.19 and their words (FEAT_TEXT in src/ui/text.js) in one commit; src/sim/feats.js judges them and
// keeps its running state in world.feats ({ earned, lost, counters }).
export const FEATS = [];
