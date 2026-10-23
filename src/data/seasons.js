// Version 7.0, Track S (rulings 930-959): seasons (looks only), a gentle day and night, and sound polish. Track 0 (contract,
// docs/superpowers/notes/2026-10-23-version-7-0-contract.md) laid out the names; Track S owns this file and tunes it. Nothing here enters
// the sim or the save: the seasons are read from the flood calendar (src/sim/seasons.js seasonAt), the light from the real clock
// (src/render/light.js lightAt). A leaf data file: it imports nothing (src/data/v70.js joins its tips).

// The seasons are SEASONS' ids (src/data/tips.js, built from the flood's months): 'akhet' the flood, 'peret' the growing, 'shemu' the harvest.
// The player sees the friendly names (src/ui/text.js SEASON_TEXT: Flood, Growing, Harvest), never these ids (ruling 863).
export const SEASON_IDS = ['akhet', 'peret', 'shemu'];

// The light loop (ruling 852): about six minutes of real time a cycle, in the render layer only. In order from the loop's start (the loop begins
// at the start of the day): day, dusk, night, dawn, as shares of the cycle (they sum to 1); the night is the short one (72 s). `lampsFrom` is the
// share of the night's depth at which the lamps begin to light (they are full a little deeper in); `maxStepMs` is the most real time one frame may
// add to the loop (a hidden tab or a long hitch counts a quarter of a second at most, as the tips' clock does).
export const LIGHT = { cycleMs: 6 * 60 * 1000, day: 0.52, dusk: 0.12, night: 0.2, dawn: 0.16, lampsFrom: 0.3, lampsFull: 0.7, maxStepMs: 250 };
export const LIGHT_PHASES = ['dawn', 'day', 'dusk', 'night'];

// What night does to the picture (ruling 931): the light pass multiplies the sprites and ground by a soft blue that deepens with `dark` (0 none,
// 1 the deepest), and at dusk and dawn by a warm gold (`warm`, a bell over each of them). `rgb` is the deepest multiplier: the readability test
// (tests/v70/s/night.test.js) holds that no ground colour of the map, under it, falls below a 3:1 against the marks and rings drawn over the
// ground, and the top bar (the page, never the canvas) is not touched at all. The marks, the labels and the effects are drawn after the light
// pass, so they are never tinted (ruling 864).
export const NIGHT = { rgb: [118, 134, 196], warmRgb: [255, 206, 160], warmMax: 0.5, minRing: 3 };
// The lamps: a warm pool at a lit home's door and at a street lamp. `home` and `street` are the pools' radius in art px, `core` the bright
// point's; `street` lamps stand on a road tile where (x + y) is a multiple of `streetEvery`; `homeLift` is how high a home's lamp sits above its
// footprint's middle (art px). Each is a pool sprite; zoomed out below `farCss` CSS px per art px a pool is under a pixel, so every lamp is one
// warm dot in a single fill, and only one home in `farStride` shows (the stride for under half, under three quarters and under all of `farCss`: the nearer the
// view the more homes). `most` is the pools drawn a frame at the most.
export const LAMP = { rgb: [255, 196, 108], home: 11, street: 8, streetEvery: 4, farCss: 1.4, farStride: [4, 3, 2], most: 260, homeLift: 9 };

// The seasons' looks (ruling 932), all render-side. `wash` is the colour laid over the land and its alpha at full strength; `water` the colour
// and alpha over the river (flood: silted and high; growing: clear; harvest: low and green); `fields` the accent a field shows;
// `palms` the mark at a palm's foot. The grade blends over a season's last month (src/sim/seasons.js seasonAt).
export const SEASON_LOOK = {
  akhet: { wash: ['#4FA3B5', 0.12], water: ['#A08A4A', 0.46], fields: 'wet', palms: 'puddle' },
  peret: { wash: ['#7DBE4A', 0.13], water: ['#2E9C9C', 0.12], fields: 'green', palms: 'bloom' },
  shemu: { wash: ['#E8B24A', 0.16], water: ['#8FA24E', 0.24], fields: 'gold', palms: 'dates' },
};
// A palm's mark is shown only where it is large enough to see (CSS px per art px); under it the ground grade alone says the season.
export const SEASON_MARKS = { minCss: 0.7 };

// Music (ruling 936): a mood for each season, and a tense variant while danger is live. Each is applied to the bars the existing generator
// composes (src/audio/music.js composeBar): `keep` the share of the pluck's notes kept (1 all), `neyEvery` phrases between the flute's lines,
// `drone` the tonic and fifth drones' strength, `drum` extra teks (a share of the calm pattern's) and `pluck` / `tone` the pluck's level and the
// brightness of its filter. The first note of the music at a season is the same as before it: only the colour moves.
export const SEASON_MUSIC = {
  akhet: { keep: 0.78, neyEvery: 3, drone: [1.25, 1.2], drum: 0.55, pluck: 0.9, tone: 1500, wet: 1.35 },    // the river rising: wide, watery, the flute often
  peret: { keep: 1, neyEvery: 5, drone: [0.95, 0.9], drum: 1, pluck: 1.05, tone: 2400, wet: 0.9 },          // the growing: light and bright
  shemu: { keep: 1, neyEvery: 6, drone: [1.1, 1.3], drum: 1.35, pluck: 1.1, tone: 1900, wet: 0.75 },        // the harvest: warm, a fuller drum
};
// Danger live (ruling 937): the tension the music moves to (a quarter a bar, as for a raid; src/audio/music.js nextTension) for each mood. A
// raid keeps its own (1); another danger (a fire, a plague, a locust swarm, a drought) is tense, not a raid: below the raid drum's threshold.
export const MOOD_TENSION = { calm: 0, tense: 0.45, raid: 1 };

// The effects' extra voice (ruling 938): a bustle of the market no more often than this many game days, only while a bazaar is in the view.
export const MARKET_SOUND = { everyDays: 14, within: 12 };

// Salts for drawing only (render), Track S's range 6151-6159 (tests/v70/contract keeps every salt unique).
export const SEASON_SALT = { marks: 6151, sound: 6152, lamps: 6153 };

// Track S's tips (src/data/v70.js joins them; words in Track S's text.js section). `seasonTurns`: the first time the land turns to a new season in
// a game; `nightFalls`: the first night the player sees.
export const SEASON_TIPS = [
  { id: 'season_turns', trigger: 'seasonTurns', priority: false },
  { id: 'night_falls', trigger: 'nightFalls', priority: false },
];
