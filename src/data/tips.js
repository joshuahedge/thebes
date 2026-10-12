// Tips (early-game pass 3.4): twenty short lessons, each tied to one trigger the interface fires (src/ui/createUI.js, and
// from Stage 3 the score interface, src/ui/scoreUi.js, for danger's six).
// Each shows at most once per device. The priority tip (only Press Play) ignores the first delay, the gap
// and an active tool, and replaces a tip already showing. The words live in src/ui/text.js (TIP_TEXT).
export const TIPS = [
  { id: 'press_play', trigger: 'plotsPaused', priority: true },          // plots placed while paused
  { id: 'arrivals', trigger: 'arrivals', priority: false },              // families arrived
  { id: 'house_needs', trigger: 'houseSheet', priority: false },         // a house sheet opened
  { id: 'service_reach', trigger: 'servicePlaced', priority: false },    // a well, bazaar or temple placed
  { id: 'problem_marker', trigger: 'problemMarker', priority: false },   // problem markers appeared on the map
  { id: 'month_summary', trigger: 'monthEnd', priority: false },         // a month ended
  { id: 'more_workers', trigger: 'labourShortage', priority: false },    // a labour shortage began
  { id: 'undo_demolish', trigger: 'demolished', priority: false },       // something was demolished
  { id: 'goals_list', trigger: 'goalDone', priority: false },            // a goal was done
  { id: 'overlay_keys', trigger: 'overlayOn', priority: false },         // an overlay turned on by hand
  { id: 'nicer_streets', trigger: 'desirabilityShown', priority: false },     // a sheet opened for a home whose next tier wants a pleasant street
  { id: 'storehouse_choices', trigger: 'storehousePlaced', priority: false },  // a storehouse placed
  { id: 'trade_orders', trigger: 'tradingPostPlaced', priority: false },       // a trading post placed
  { id: 'merging_homes', trigger: 'townhouseSheet', priority: false },         // a Townhouse's sheet opened
  // Stage 3 (spec 4.19): danger's six.
  { id: 'fire_risk', trigger: 'fireRisk', priority: false },                   // the city became a Town, or a firehouse was placed
  { id: 'firebreaks', trigger: 'fireGrew', priority: false },                  // a blaze grew into a fire
  { id: 'clearing_rubble', trigger: 'rubbleLeft', priority: false },           // a building burned down to rubble
  { id: 'raider_targets', trigger: 'raidWarned', priority: false },            // a raid warning appeared
  { id: 'tribute_once', trigger: 'tributeOffered', priority: false },          // a raid warning that can be paid off appeared
  { id: 'wall_ring', trigger: 'wallDrawn', priority: false },                  // a wall was drawn
];

export const TIP_GAP_MS = 180000;          // at least 3 minutes between two tips
export const TIP_HOURLY_MAX = 5;           // and at most five in any hour
export const TIP_FIRST_DELAY_MS = 10000;   // none in the first 10 s of a session
export const TIP_HELD_MAX_MS = 60000;      // a tip held while a tool was active is dropped if it is older than this when the tool closes
export const TIP_AUTO_CLOSE_MS = 20000;    // on a phone a tip closes itself after this much unpaused play with it on screen (it stays seen; ruling 171)
// Citizen remarks (spec 4.19, ruling 130): a short line in the caption row at a month end whose index is a multiple of
// REMARK_EVERY_MONTHS, when the row is free and Help is not Off, chosen by hash2(seed, month index, REMARK_SALT) from the
// season's remarks whose building the city has (the pool and its words: CITIZEN_REMARKS in src/ui/text.js).
export const REMARK_EVERY_MONTHS = 3;
export const REMARK_SALT = 9301;
// The seasons by month of the year (1-12): Akhet, the flood, months 1-4; Peret, the growing, 5-8; Shemu, the harvest, 9-12.
export const SEASONS = ['akhet', 'akhet', 'akhet', 'akhet', 'peret', 'peret', 'peret', 'peret', 'shemu', 'shemu', 'shemu', 'shemu'];
