// Stage 4.6, Wonders track (rulings 342-343): monument styles and the Wonders track's rows in the Stage 4.6 lists. The three new
// monument kinds themselves go into src/data/monuments.js (MONUMENT_KINDS and MONUMENTS, which the Wonders track owns for Stage 4.6),
// so BUILDINGS, the dock and the sheets pick them up as they pick up the seven. Track 0 laid out the shapes and the plan's decided
// numbers; the Wonders track owns this file. A leaf data file: see src/data/river.js for what it may import.

// The new kinds' ids (ruling 345): 'sphinx' is already the 1x1 statue on the Homes card, so the 3x2 monument is 'great_sphinx'
// ("Great sphinx"). The Wonders track adds each to MONUMENT_KINDS and MONUMENTS under these ids.
export const NEW_MONUMENT_KINDS = ['great_sphinx', 'sun_temple', 'step_pyramid'];

// ── Styles (ruling 343) ──
// Every monument building (a site or a finished monument) carries b.style, one of MONUMENT_STYLE_IDS. 'classic' is every monument from
// before Stage 4.6, drawn as before, and is never offered (pick: false). goldFactor multiplies the founding (and the Wonders track
// decides whether it multiplies work gold too, as a ruling); desirability is added at every distance the kind reaches.
export const MONUMENT_STYLES = {
  classic: { pick: false, goldFactor: 1, desirability: 0 },
  whitewashed: { pick: true, goldFactor: 1, desirability: 0 },
  painted: { pick: true, goldFactor: 1, desirability: 0 },
  gilded: { pick: true, goldFactor: 1.1, desirability: 1 },
};
export const MONUMENT_STYLE_IDS = Object.keys(MONUMENT_STYLES);
// The style makeBuilding gives a monument placed with no style named (place(world, type, x, y, { style })): 'classic', so a sample city, a
// dev scene or a test that founds one with no word about style gets the monument as it was drawn before Stage 4.6 (ruling 393). The
// placing bar always names one: PICK_DEFAULT is the style it starts on.
export const MONUMENT_STYLE_DEFAULT = 'classic';
export const MONUMENT_STYLE_PICK_DEFAULT = 'whitewashed';
// The styles the placing bar offers, in its order (classic is never offered).
export const PICKABLE_STYLES = MONUMENT_STYLE_IDS.filter((id) => MONUMENT_STYLES[id].pick);

// ── The Wonders track's rows in the Stage 4.6 lists (src/data/s46.js joins them) ──
// WONDER_UNLOCKS: milestone id -> the new kinds that unlock with it (a kind that also needs prestige says so in its MONUMENTS unlock,
// as the pyramids do, and stays out of this list). Ruling 392: the step pyramid comes with Capital and no prestige, because a prestige
// unlock is one more key in world.prestigeUnlocks and an older save has no such key (the migration is Track 0's).
export const WONDER_UNLOCKS = { great_city: ['great_sphinx'], capital: ['sun_temple', 'step_pyramid'] };
export const WONDER_TALLY = [];
// One first for each new kind: the first one founded (a road touches it, as every first of a building counts).
export const WONDER_FIRSTS = NEW_MONUMENT_KINDS.map((type) => ({ id: `first_${type}`, check: { kind: 'building', type } }));
export const WONDER_ACHIEVEMENTS = [];
// One tip for each new kind, shown once when its card unlocks (fired by the Wonders seam's refresh, src/ui/s46/wonders.js), and one on styles,
// shown once the first monument has been founded (a tip fired while a tool is active waits for it to end). Their words are TIP_TEXT and TIP_HELP_TEXT (src/ui/text.js, the s46 wonders section).
export const WONDER_TIPS = [
  ...NEW_MONUMENT_KINDS.map((type) => ({ id: `wonder_${type}`, trigger: `${type}Unlocked`, priority: false })),
  { id: 'monument_styles', trigger: 'monumentFounded', priority: false },
];
// Salts: render-only variation for the styles' paint (hash2(b.id, k, WONDER_SALT.paint)); the sim draws nothing for Wonders.
export const WONDER_SALT = { paint: 4681, spare1: 4682 };
