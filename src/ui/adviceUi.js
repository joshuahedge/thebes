// Version 5.0 (Task 1): the City advice wiring createUI shares between the top-bar button, its sheet, the summary's link and the first-home tip:
// what the button shows (shown, dot), the sheet's Show me and View, and when the advice is read (never per frame: at a command and every
// ADVICE_EVERY_DAYS game days, because it asks every home for its next step). The sheet and its words are src/ui/adviceSheet.js and adviceText.js.
import { BUILDINGS } from '../data/buildings.js';
import { toolForItem, categoryOfItem } from '../data/ui.js';
import { canPlace } from '../sim/commands.js';
import { adviceSheet, adviceUnlocked, adviceTopKeys, adviceHasNew } from './adviceSheet.js';
import { ADVICE_TEXT } from './adviceText.js';
import { nearestFit } from './placement.js';
import { nearestTerrainTile } from './goalsList.js';
import { reasonText } from './text.js';
import { GROUND } from './nextStepText.js';       // what a building bound to ground needs when no tile of it has room (the sim's own refusal for a tile says "Needs fertile land")

export const ADVICE_EVERY_DAYS = 5;

// Why a build fix has nowhere to go, or null when a tile near `at` takes it (a price the treasury cannot pay is not a refusal: the confirm bar says it).
// The same search Show me runs (nearestFit over the whole map) and the sim's own placing rule (canPlace), so Show me is refused exactly when its ghost
// would have no legal tile. Roads, plots and the other drawn tools always start.
export function showMeRefusal(world, item, at) {
  const tool = toolForItem(item);
  if (tool.kind !== 'building') return null;
  const def = BUILDINGS[tool.type];
  const spot = nearestFit(world, tool, at.x - def.w / 2, at.y - def.d / 2, null, world.size);
  const r = canPlace(world, tool.type, spot.x, spot.y, { roadLater: true, rot: spot.rot === undefined ? 0 : spot.rot });
  if (r.ok || r.reason === 'no_gold') return null;
  return def.terrain ? `no ${GROUND[def.terrain] || 'ground'} with room for it` : reasonText(r.reason);
}

export function createAdviceUi({ world, settings, showMeAt, selectBuilding, openSummary, toast, tray = null }) {
  let shown = false, keys = [], day = null, stale = true;
  const seen = () => settings.get().adviceSeen || [];

  // Reads the top items when something changed (a command) or ADVICE_EVERY_DAYS game days have passed; the button reads the result every frame.
  function refresh() {
    if (!shown) shown = adviceUnlocked(world);
    if (!shown) { keys = []; return; }
    if (!stale && day !== null && world.day >= day && world.day - day < ADVICE_EVERY_DAYS) return;
    stale = false; day = world.day; keys = adviceTopKeys(world);
  }

  // The item's Show me or View: a building to select, a summary section, or a build card with its ghost near the fix's target (the nearest free tile of
  // its ground for a farm or a mine). With no legal tile Show me says why instead of doing nothing.
  function fix(a) {
    const f = a.fix;
    if (!f) return;
    if (f.select !== undefined) { selectBuilding(f.select); return; }
    if (f.view) { openSummary(f.section); return; }
    const def = BUILDINGS[f.item];
    const at = f.at === 'terrain' && def && def.terrain ? nearestTerrainTile(world, def.terrain, f.target) || f.target : f.target;
    showMe({ category: categoryOfItem(f.item), item: f.item, x: at.x, y: at.y });
  }

  // A Show me for a build ({ category, item, x, y }: the advice's, a house sheet's next step and its checklist rows): refused with why in a toast when no tile near
  // it takes the building, else its card and ghost.
  function showMe(target) {
    const why = showMeRefusal(world, target.item, target);
    if (why) { toast(ADVICE_TEXT.noRoom(target.item, why)); return; }
    showMeAt(target);
  }

  return {
    refresh,
    showMe,
    markStale: () => { stale = true; },
    state: () => ({ shown, dot: shown && adviceHasNew(keys, seen()) }),
    // Opening or redrawing the sheet reads the advice afresh: the button's cached keys become the ones the sheet just marked seen.
    sheet: adviceSheet({ world, settings, onFix: fix, tray, onRead: (k) => { keys = k; stale = false; day = world.day; }, onCity: () => openSummary(null) }),
    on: () => shown,
    fix,
  };
}
