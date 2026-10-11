// Tips (early-game pass 3.4): ten short lessons, each tied to one trigger the interface fires (src/ui/createUI.js).
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
];

export const TIP_GAP_MS = 180000;          // at least 3 minutes between two tips
export const TIP_HOURLY_MAX = 5;           // and at most five in any hour
export const TIP_FIRST_DELAY_MS = 10000;   // none in the first 10 s of a session
export const TIP_HELD_MAX_MS = 60000;      // a tip held while a tool was active is dropped if it is older than this when the tool closes
export const TIP_AUTO_CLOSE_MS = 15000;    // on a phone at 125% or 150% text a tip closes itself after this long (it stays seen)
