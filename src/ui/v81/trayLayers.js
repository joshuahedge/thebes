// Version 8.1 (Track D, rulings 1246-1250): the layered build tray. Each category first shows the few cards that matter at the city's rank, with More for the rest; what is locked is not
// shown until it unlocks, and that is a moment Ipi speaks; the card the Advice engine's top build suggestion names glows. This file decides what shows (layerPlan, pure on the world);
// createTrayLayers is the interface's one object for it: the dock, the side panel and the rail ask it for each category's view, and createUI refreshes it after every command.
import { CATEGORIES, categoryOfItem } from '../../data/ui.js';
import { BUILDINGS } from '../../data/buildings.js';
import { allBuildings, buildingsVersion } from '../../sim/world.js';
import { unlockedItems, isCardLocked, cardShown } from '../cards.js';
import { buildingName, CATEGORY_NAMES } from '../text.js';
import { adviceWords } from '../adviceText.js';
import { TRAY_V81_TEXT } from './trayText.js';
import { ipiSay, loadScribe } from './ipiSays.js';

export const LAYER_SHOW = 4;          // cards a category shows at first, at least (when it holds that many)
export const LAYER_MAX = 5;           // and at most, unless the card in hand or one the guide needs lies outside them
export const LAYER_MIN_HIDDEN = 2;    // a More that opens a single card is not worth its tap: with fewer than this behind it, everything shows

// The building types standing in the city, by the buildings' version (the tray asks on every store change; the world only moves when a command does).
const builtMemo = new WeakMap();   // world -> { version, built }
function builtTypes(world) {
  const version = buildingsVersion(world), memo = builtMemo.get(world);
  if (memo && memo.version === version) return memo.built;
  const built = new Set(allBuildings(world).map((b) => b.type));
  builtMemo.set(world, { version, built });
  return built;
}
const roadStands = (world) => world.road.some((v) => v);
const isBuilt = (world, item) => (BUILDINGS[item] ? builtTypes(world).has(item) : item === 'road' ? roadStands(world) : true);

// What a category shows now: { items (in the category's own order), hidden (how many cards sit behind More), open (More is open), more (the More card is there), total, advised }.
// ctx: advised (the item the Advice engine suggests), needed (items an open goal or the guide wants), pinned (items that must show), active (the card in hand), open (More is open), all (no layering).
// Tiers, most first: the suggested item, a new one (a milestone's, not placed yet), one a goal needs, one the city has not built yet, the rest in the category's order. The first LAYER_SHOW
// (more, up to LAYER_MAX, when that many are suggested, new or needed) show, always in the category's own order so a card never moves under a finger.
export function layerPlan(world, category, ctx = {}) {
  const all = unlockedItems(world, category);
  const advised = ctx.advised && all.includes(ctx.advised) ? ctx.advised : null;
  const base = { advised, total: all.length };
  if (ctx.all || all.length <= LAYER_MAX) {
    // Version 8.2 (Track L, ruling 1325): the wide panel shows every card, the suggested one first and the rest in the category's own order (ctx.advisedFirst).
    const items = ctx.advisedFirst && advised ? [advised, ...all.filter((item) => item !== advised)] : all;
    return { ...base, items, hidden: 0, open: false, more: false };
  }
  const needed = new Set(ctx.needed || []), fresh = new Set(world.newItems || []);
  const tier = (item) => (item === advised ? 0 : fresh.has(item) ? 1 : needed.has(item) ? 2 : !isBuilt(world, item) ? 3 : 4);
  const ranked = all.map((item, i) => ({ item, i, t: tier(item) })).sort((a, b) => a.t - b.t || a.i - b.i);
  const count = Math.min(LAYER_MAX, Math.max(LAYER_SHOW, ranked.filter((r) => r.t <= 2).length));
  const keep = new Set(ranked.slice(0, count).map((r) => r.item));
  for (const item of [...(ctx.pinned || []), ctx.active]) if (item && all.includes(item)) keep.add(item);
  if (all.length - keep.size < LAYER_MIN_HIDDEN) return { ...base, items: all, hidden: 0, open: false, more: false };
  const open = Boolean(ctx.open);
  return { ...base, items: open ? all : all.filter((item) => keep.has(item)), hidden: all.length - keep.size, open, more: true };
}

// The Advice engine's top build suggestion: the first of its top items (src/sim/advice.js cityAdvice, ranked) whose fix is a card the tray shows. null when none is.
export function buildSuggestion(world, list, top = 5) {
  for (const a of list.slice(0, top)) {
    const item = a.fix && a.fix.item;
    if (item && categoryOfItem(item) && cardShown(world, item) && !isCardLocked(world, item)) return { item, category: categoryOfItem(item), advice: a };
  }
  return null;
}

// Every item a card of the tray can be (for the unlock moment), unlocked now.
const unlockedNow = (world) => new Set(CATEGORIES.flatMap((c) => unlockedItems(world, c.id)));

// createTrayLayers({ world, store, suggestion, needed, layered, speaking, say }).
//  suggestion() -> { item, category, advice } | null        the Advice engine's cached top build (createAdviceUi.suggestion)
//  needed() -> [item]                                       items an open goal or the guide needs (they always show)
//  layered() -> bool                                        false in the lesson: the tray shows everything unlocked, and the lesson's lock decides what is live (ruling 1249)
//  speaking() -> bool                                       false while another voice has the floor (the lesson, a card): Ipi stays quiet then
//  say(text, opts)                                          Ipi's bubble (default: src/ui/v81/ipiSays.js ipiSay)
export function createTrayLayers({ world, store, suggestion = () => null, needed = () => [], layered = () => true, speaking = () => true, say = ipiSay, lines = TRAY_V81_TEXT, wording = (a, w) => adviceWords(a, w).what }) {
  loadScribe();
  let advisedNow = null, neededNow = [], known = unlockedNow(world), told = new Set(), lastAdvised = null, primed = false;
  const pinned = () => (store.get().trayPins || []);
  const openOf = (category) => Boolean((store.get().trayMore || {})[category]);

  const api = {
    // What a category shows. Cheap enough for every store change: the plan is a few hundred item tests at most.
    view(category, activeItem = null) {
      return layerPlan(world, category, { advised: advisedNow && advisedNow.item, needed: neededNow, pinned: pinned(), active: activeItem, open: openOf(category), all: !layered() });
    },
    // The categories the tray's buttons show: those with a card in hand to pick (the locked are hidden, ruling 1248).
    categories: () => CATEGORIES.filter((c) => unlockedItems(world, c.id).length > 0),
    advised: () => advisedNow,
    // The category whose button carries the suggestion's dot: the suggested card's own.
    advisedCategory: () => (advisedNow ? advisedNow.category : null),
    toggle(category) {
      const more = { ...(store.get().trayMore || {}) };
      if (more[category]) delete more[category]; else more[category] = true;
      store.set({ trayMore: more });
    },
    // Reads the world again: after a command, at the day's turn. The suggestion and the needs are asked of the cached advice and the goals (never a fresh search here).
    refresh() {
      neededNow = needed();
      const next = suggestion();
      advisedNow = next;
      // Unlock moments: what is on the tray now and was not at the last look. The first look (a loaded city) says nothing.
      const now = unlockedNow(world);
      const fresh = [...now].filter((item) => !known.has(item));
      known = now;
      if (fresh.length && speaking()) {
        const names = fresh.map((item) => buildingName(item));
        const line = fresh.length === 1 ? lines.unlockedOne(names[0], CATEGORY_NAMES[categoryOfItem(fresh[0])]) : lines.unlockedMany(names.length > 3 ? `${names.slice(0, 3).join(', ')} and more` : names.length === 3 ? `${names[0]}, ${names[1]} and ${names[2]}` : names.join(' and '));
        say(line, { ms: 6000 });   // no anchor: docked under the top bar, Ipi's one place outside the lesson (integration, ruling 1262)
        return;
      }
      // The suggestion's moment (ruling 1250): a different item at the top says its name and the sim's sentence about what holds the city back, once for each (item, problem). The first look
      // after the game starts only notes it, so a loaded city does not speak the moment it opens.
      if (primed && next && speaking() && next.item !== lastAdvised) {
        const key = `${next.item}|${next.advice.key}`;
        if (!told.has(key)) {
          told.add(key);
          const what = wording(next.advice, world);
          if (what) say(lines.suggestLine(buildingName(next.item), what), { ms: 6000 });
        }
      }
      // While Ipi must stay quiet (a tool in hand, the guide, a card) the last suggestion said is kept, so a change made meanwhile is said once Ipi may speak (ruling 1262).
      if (!primed || speaking()) lastAdvised = next ? next.item : null;
      primed = true;
    },
  };
  // Version 8.2 (Track L, ruling 1325): the wide panel's own face of the same tray: no More or Fewer (its list scrolls instead), every unlocked card, the suggested one first (not in the lesson,
  // whose order is the category's own). The phone's dock and the rail keep view() and the layered More.
  api.wide = {
    ...api,
    view: (category, activeItem = null) => layerPlan(world, category, { advised: advisedNow && advisedNow.item, needed: neededNow, pinned: pinned(), active: activeItem, all: true, advisedFirst: layered() }),
    toggle() {},
  };
  return api;
}
