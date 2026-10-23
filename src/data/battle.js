// Version 6.0, Track B2 (rulings 720-739): battles you can see. Drawing only: nothing here is read by the sim. Track 0 (contract,
// docs/superpowers/notes/2026-10-22-version-6-0-contract.md) made the file; Track B2 owns it. A leaf data file: it imports nothing.

// Salts for the drawing's own draws (hash2 with (world.seed + BATTLE_SALT.x) | 0), Track B2's range 6061-6069; never used by the sim.
// Rename the spares as they are used; never reuse a number.
export const BATTLE_SALT = { clash: 6061, arrows: 6062, smoke: 6063, banner: 6064, rubbleLook: 6065, moment: 6066, spare2: 6067 };

// ── Fighting poses (src/render/art/armies.js, src/render/units.js) ──
// A soldier and a raider on foot standing within `reach` tiles of each other (the sim's own BESIDE is 1; a unit is still gliding up to
// its foe when it is drawn, so a little more) show a fighting pose, facing the foe: pose 'a' (weapon raised or guarding) then 'b' (the
// blow), facing 'r' or 'l' on screen. Full steps between the two every `period.full` ms (out of step by id); Gentle every `period.gentle`
// ms (one calm change at a time); Still holds pose 'a'. Colour is never the only cue: the soldier's spear and tall teal shield, the
// raider's axe and round shield, and the chieftain's crest, breastplate and banner are shapes.
export const FIGHTERS = ['soldier', 'raider', 'chief'];
export const POSES = ['a', 'b'];
export const FACES = ['r', 'l'];
export const FIGHT = { reach: 1.25, period: { full: 450, gentle: 1200 }, spread: 2.3 };
// The sim keeps every soldier of a company on one spot; the drawing stands each beside the next by its id, as a raid's band stands (src/sim/raids.js
// SLOTS: the first nineteen), spread FIGHT.spread times as wide, while the company is out. The offsets only move the drawing: pairs are judged
// by the sim's own spots.
export const SCRUM = [[0, 0], [0.25, 0.2], [-0.25, 0.2], [0.25, -0.2], [-0.25, -0.2], [0, 0.32], [0, -0.32], [0.32, 0], [-0.32, 0], [0.16, 0.34], [-0.16, -0.34],
  [0.34, -0.16], [-0.16, 0.34], [0.16, -0.34], [-0.34, 0.16], [-0.34, -0.16], [0.34, 0.16], [0.12, -0.1], [-0.12, 0.1]];
// The chieftain stands this much bigger than a raider on foot (UNIT_SCALE times).
export const CHIEF_SCALE = 1.16;
// A raider of a band that has struck and is leaving carries a sack (taken goods, gold or food).
export const SACK = { body: '#C9A66B', shade: '#9C7A48', tie: '#6B4A3A' };

// ── Blows, falls and arrows (src/render/units.js) ──
// A unit whose hit points dropped shows a spark where it stands: Full a burst of short strokes for `ms`, Gentle a still pale ring that
// fades in place over `ringMs`, Still none (its health bar shows the blow). A unit that vanishes in the middle of the field (not at its
// entry, not at its barracks) fell: Full a dust cloud and a lying figure for `ms`, Gentle the figure fading in place, Still none.
export const SPARK = { ms: 260, ringMs: 700, colour: '#FFF1C9', core: '#FFFFFF', edge: '#E2B13C' };
export const FALL = { ms: 2400, dustMs: 700, awayTiles: 1.8, body: '#3E3446', dust: '#D8C4A0' };
// An arrow's flight: its arc rises ARC of the shot's length (at most ARC_MAX art px); the arrow lands in a small puff (Full) or a ring
// that fades in place (Gentle) for LAND_MS; under Gentle and Still the whole arc shows as one line for STILL_MS (fading under Gentle).
export const ARROWS = { ms: 300, stillMs: 600, arc: 0.28, arcMax: 17, landMs: 360, colour: '#3E3040', fletch: '#F6ECD6', trail: '#6E5A52' };

// ── The chieftain's banner (src/render/units.js drawBanner) ──
// A tall pole behind the chieftain with a dark swallow-tailed cloth, a crimson band and a gold disc: shapes tell it from any of your
// flags (a pennant is short, square-ended and on a building). It streams to the right; Full ripples at `rippleMs`, Gentle cross-fades
// two still shapes, Still holds one. When the chieftain falls his banner lies on the ground for `fellMs`.
export const BANNER = { pole: 41, wide: 15, high: 10, rippleMs: 900, fellMs: 9000, cloth: '#3E3446', band: '#B8372D', gold: '#E2B13C', wood: '#6B4A3A' };

// ── Smoke and rubble (src/render/fire.js, src/render/art/defence.js) ──
// Rubble that remembers what stood there (was) smoulders: a thin smoke column for `fireDays` game days after a fire (the building burned
// down), a settling dust haze for `wreckDays` after a wreck. Full lifts the puffs, Gentle fades them in place, Still holds one still column.
export const SMOULDER = { fireDays: 45, wreckDays: 12, puffs: 3, still: 4 };
// A burning building's roof chars: soot on the roof, wider and darker as a blaze grows into a fire.
export const CHAR = { soot: '#241B1E', blaze: 0.3, fire: 0.5 };
// The shell a burned or wrecked building leaves: the height of its broken wall stubs follows how tall the building stood.
// A building 22 art px tall or more leaves tall stubs, 14 or more mid, else low (a test holds SHELL_CLASS to the art's own heights).
export const SHELL = { low: 5.5, mid: 8, tall: 11, midFrom: 14, tallFrom: 22 };
export const SHELL_VARIANTS = 2;
export const SHELL_CLASS = {
  well: 1, farm_grain: 0, granary: 2, bazaar: 1, temple: 2, garden: 1, statue: 2, farm_fig: 0, clay_pit: 0, potter: 2, storehouse: 1, booth: 1, trading_post: 2,
  farm_barley: 0, brewery: 1, farm_flax: 0, weaver: 0, gem_mine: 1, jeweller: 1, firehouse: 1, physician: 1, police_post: 2, tower: 2, barracks: 1, wall: 0,
  gate: 1, builders_guild: 1, quarry: 1, brickworks: 1, sphinx: 1, nilometer: 2, hunting_lodge: 1, fishing_wharf: 1, archery_range: 1, stables: 1, plaza: 0,
};
// The height class (0 low, 1 mid, 2 tall) of the shell of what stood there (a rubble's was): the table, else by footprint.
export const shellHeightClass = (was) => (was.type in SHELL_CLASS ? SHELL_CLASS[was.type] : was.w * was.d >= 6 ? 2 : was.w * was.d >= 2 ? 1 : 0);

// ── Effects from raid events (src/render/effects.js fromEvents) ──
// raid_strike: a burst of sparks and dust on the struck building (Full) or a still ring fading (Gentle); raid_wreck: a dust cloud that
// settles over the new rubble (Full), a pale disc fading in place (Gentle); raid_loot: sacks carried off the store (Full rise), or the
// same sacks fading in place (Gentle), with the goods named in a label at every level.
export const RAID_FX = { strike: 700, wreck: 1300, loot: 1600 };

// ── The moment in the alert row (src/ui/v60/battle.js) ──
// When a raid ends the alert row says so: Raid beaten or The raiders got through, with what the report says. It stays `days` game days
// or until Dismiss, and is gone when the next raid is warned.
export const MOMENT = { days: 6 };
