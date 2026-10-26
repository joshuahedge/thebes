// Building cards (spec 6.3, early-game pass 2.5): the building's picture, its name and its cost with a coin;
// coral with a coin-slash when unaffordable; a lock and the unlock condition when locked; a "New" badge while a
// milestone's new building waits to be placed (spec 4.14). Shared by the dock tray, the side panel grid and the
// rail drawer.
import { BUILDINGS } from '../data/buildings.js';
import { MILESTONES } from '../data/progression.js';
import { MONUMENTS, PRESTIGE_UNLOCKS } from '../data/monuments.js';
import { prestigeOf } from '../sim/prestige.js';
import { palaceOf } from '../sim/palace.js';
import { isUnlocked, milestoneIndex } from '../sim/progression.js';
import { costOf, roadCostOf } from '../sim/costs.js';
import { monthlyBill } from '../sim/economy.js';
import { canAfford } from '../sim/money.js';
import { CATEGORIES } from '../data/ui.js';
import { LARGE_PLOT } from '../data/largePlots.js';
import { largePlotUnlocked } from '../sim/largePlots.js';
import { buildingName, unlockText, CONDITION_TEXT, T, UI4_TEXT, S45_TEXT, S46_MAP_TEXT } from './text.js';
import { MAP } from '../data/map.js';
import { el, clear } from './components.js';
import { drawThumb } from './thumbs.js';
import { ferryCost } from '../sim/ferries.js';
import { FERRY_TEXT } from './v71/ferryText.js';
import { TRAY_V81_TEXT } from './v81/trayText.js';

const deviceRatio = () => Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

// Which cards a tray shows (spec 4.14): everything unlocked, and what the next milestone unlocks (locked, with its
// condition); buildings of later milestones stay hidden, so the tray never fills with grey. Roads and demolish
// always show.
// Stage 4 (Track C, spec 4.14, ruling 243): a card that unlocks by prestige is a step of its own. The first (the small
// pyramid) shows, greyed, once its milestone is the next one or reached; each later one once the one before it has unlocked.
export function cardShown(world, item) {
  if (item === LARGE_PLOT.type) return largePlotUnlocked(world);   // Version 6.0 (Track C): the Large plot card comes with the first Townhouse, and is not a teaser before it
  if (!BUILDINGS[item] || isUnlocked(world, item)) return true;
  const step = PRESTIGE_UNLOCKS.indexOf(item);
  if (step > 0) return isUnlocked(world, PRESTIGE_UNLOCKS[step - 1]);
  if (step === 0) return milestoneIndex(world.milestone) + 1 >= milestoneIndex(MONUMENTS[item].unlock.milestone);
  const next = MILESTONES[milestoneIndex(world.milestone) + 1];
  return Boolean(next && next.unlocks.includes(item === 'gate' ? 'wall' : item));   // the Gate card shows with the Wall's
}

// A locked card's condition (spec 4.14): a prestige unlock says its count once its milestone is reached ("Needs 100 prestige
// (you have 60)"), else both ("Needs Capital and 100 prestige"); any other card its milestone.
export function lockTextOf(world, item) {
  if (!PRESTIGE_UNLOCKS.includes(item)) return unlockText(item);
  const u = MONUMENTS[item].unlock;
  if (milestoneIndex(world.milestone) >= milestoneIndex(u.milestone)) return UI4_TEXT.needsPrestige(u.prestige, prestigeOf(world));
  return UI4_TEXT.needsMilestoneAndPrestige(MILESTONES[milestoneIndex(u.milestone)].name, u.prestige);
}

export function shownItems(world, category) {
  const cat = CATEGORIES.find((c) => c.id === category);
  return cat ? cat.items.filter((item) => cardShown(world, item)) : [];
}

// A category shows when it has a card to show: one of its buildings is unlocked or comes with the next milestone.
export const shownCategories = (world) => CATEGORIES.filter((c) => shownItems(world, c.id).length > 0);

// Version 8.1 (Track D, ruling 1248): the tray hides what is locked until it unlocks. isCardLocked is the one test of "locked" (cardInfo's too); unlockedItems the cards a category can
// put in hand; trayCategories the categories with at least one. shownItems and cardShown keep the 8.0 rule (a next-milestone teaser), which the sim-facing tests and the Show me
// searches read; the dock, the panel and the rail read these.
export function isCardLocked(world, item) {
  return item === LARGE_PLOT.type ? !largePlotUnlocked(world) : Boolean(BUILDINGS[item]) && !isUnlocked(world, item) && !(item === 'palace' && palaceOf(world));
}
export const unlockedItems = (world, category) => shownItems(world, category).filter((item) => !isCardLocked(world, item));
export const trayCategories = (world) => CATEGORIES.filter((c) => unlockedItems(world, c.id).length > 0);

const isMonumentItem = (item) => Boolean(BUILDINGS[item] && BUILDINGS[item].monument);

// Costs are this city's (difficulty included: spec 4.18), the same the commands charge.
export function cardInfo(world, item) {
  let cost = 0, suffix = '', costText;
  if (item === 'road') { cost = roadCostOf(world); suffix = ' per tile'; }
  else if (item === 'house') { cost = costOf(world, 'house'); suffix = ' per plot'; }
  else if (item === LARGE_PLOT.type) { cost = costOf(world, item); suffix = ' per lot'; }
  else if (item === 'ferry') { cost = ferryCost(world); suffix = FERRY_TEXT.cardUnit; }   // Version 7.1 (Track F): the price of a whole crossing, two landings (src/sim/ferries.js)
  else if (item !== 'demolish') cost = costOf(world, item);
  costText = item === 'demolish' ? 'Refunds a quarter' : `${cost} gold${suffix}`;
  // Stage 4 (spec 4.20): while a palace stands its card is a way to it, not a price (picking it selects the palace).
  if (item === 'palace' && palaceOf(world)) return { item, name: buildingName(item), cost: 0, costText: UI4_TEXT.palaceStands, affordable: true, locked: false, lockText: '', isNew: false, terrainText: '' };
  const locked = isCardLocked(world, item);
  const isNew = !locked && (world.newItems || []).includes(item);
  // terrainText: "Fertile land" or "Rocky ground" for a building that needs it (placement review P15), "Not on the fields" for a monument (ruling 299)
  // (spec 4.4), else ''.
  // Stage 4.5 (Task 4b): what the building costs a month when fully staffed, from the sim (monthlyBill): "Costs 46 a month · 10 workers".
  const bill = BUILDINGS[item] && !locked ? monthlyBill(item, world) : null;
  const upkeep = bill && bill.bill > 0 ? { text: S45_TEXT.upkeepLine(bill), title: S45_TEXT.upkeepTitle(bill) } : { text: '', title: '' };
  // Stage 4.6 (rulings 331, 350): a terrain card's tooltip says its rule from the sim's row ("Needs 2 of 4 tiles on clay. Clay ground, along the
  // riverbanks."), and the road card says a road crosses water on a bridge, at the sim's price (costOf(world, 'bridge')) and the rule's reach.
  const terrainText = item === 'road' ? S46_MAP_TEXT.bridgeCard(costOf(world, 'bridge')) : item === 'ferry' ? FERRY_TEXT.card : isMonumentItem(item) ? UI4_TEXT.groundCard : CONDITION_TEXT.terrainLine(item, true);
  return { item, name: buildingName(item), cost, costText, affordable: canAfford(world, cost), locked, lockText: locked ? lockTextOf(world, item) : '', isNew, terrainText, upkeepText: upkeep.text, upkeepTitle: upkeep.title };
}

export function activeItemOf(tool) {
  if (!tool) return null;
  if (tool.kind === 'building') return tool.type;
  if (tool.kind === 'houses') return 'house';
  if (tool.kind === 'plazas') return 'plaza';   // Stage 4 (ruling 250)
  if (tool.kind === 'areas') return tool.type;   // Version 5.0 (Task 4): an area of farms, gardens or statues lights its own card
  if (tool.kind === 'road' && tool.gate) return 'gate';   // Stage 4.5 (ruling 309): the Gate card runs the road tool in gate mode
  return tool.kind;   // 'road', 'wall' or 'demolish'
}

// What a tray of cards shows: its category, the active card and each shown card's affordable, locked and new state.
// The dock, the side panel and the rail rebuild their cards (and so their pictures) only when this key changes, so
// a command that spends a little gold but leaves every card as it was rebuilds nothing.
// Version 8.1 (Track D): with `layers` (src/ui/v81/trayLayers.js) the cards are the layered tray's (the main ones, or all after More), and the key holds its state too.
export function cardsKey(world, category, activeItem, layers = null) {
  const view = layers ? layers.view(category, activeItem) : null;
  const states = (view ? view.items : shownItems(world, category)).map((item) => {
    const i = cardInfo(world, item);
    return `${item}:${i.affordable ? 'a' : 'u'}${i.locked ? 'l' : 'o'}${i.isNew ? 'n' : ''}${view && view.advised === item ? 's' : ''}${i.lockText}${i.costText}`;   // a prestige count moving, or a palace standing, rebuilds it
  });
  return `${category}|${activeItem}|${states.join(',')}${view ? `|${view.hidden}${view.open ? 'o' : ''}` : ''}`;
}

// The tooltip of a card's ground line (Stage 4.6, rulings 331, 350): the rule in full, from the sim's own row and price.
const terrainTitleOf = (world, item) => (item === 'road' ? S46_MAP_TEXT.bridgeCardTitle(costOf(world, 'bridge'), MAP.bridgeMax) : item === 'ferry' ? FERRY_TEXT.cardTitle(ferryCost(world)) : S46_MAP_TEXT.cardTitle(item));

// Locked and unaffordable cards keep their words and marks; an affordable cost gets a coin (decoration only).
function costLine(info) {
  if (info.locked) return [`\u{1F512} ${info.lockText}`];
  if (!info.affordable) return [`⊘ ${info.costText}`];
  return info.cost ? [el('span', { class: 'coin', 'aria-hidden': 'true' }), info.costText] : [info.costText];
}

// "Costs 46 a month" and, after it, " · 10 workers" in a span of its own (css hides that part from the eye at large text).
function upkeepSpan(world, item, info) {
  const bill = monthlyBill(item, world), crew = S45_TEXT.upkeepCrew(bill);
  return el('span', { class: 'upkeep', title: info.upkeepTitle }, [el('span', { class: 'bill', text: S45_TEXT.upkeepBill(bill) }), crew ? el('span', { class: 'crew', text: crew }) : null]);
}

// Version 8.1 (Track D): with `layers` (src/ui/v81/trayLayers.js) the one the Advice engine suggests glows and is tagged. Version 8.2 (Track L, ruling 1327): every unlocked card shows, the suggested
// one first, and the tray scrolls (8.1's More and Fewer card is gone). Every card carries its data-lock id (ruling 1240).
export function renderCards(container, { world, category, activeItem = null, onPick, grid = false, layers = null }) {
  const focusedItem = container.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.item : null;
  // A tray redrawn for a change in its cards (a price, the suggestion) keeps the place the player had scrolled to, as long as it is the same category.
  const sameCategory = container.dataset.shown === category, kept = { left: container.scrollLeft, top: container.scrollTop };
  container.dataset.shown = category;
  clear(container);
  container.classList.toggle('grid', grid);
  const view = layers ? layers.view(category, activeItem) : null;
  const items = view ? view.items : shownItems(world, category);
  if (!items.length) { container.append(el('p', { class: 'empty', text: T.comingLater })); return []; }
  const dpr = deviceRatio();
  const buttons = items.map((item) => {
    const info = cardInfo(world, item);
    const advised = Boolean(view) && view.advised === item && !info.locked;
    const cls = ['card', info.affordable ? '' : 'unaffordable', info.locked ? 'locked' : '', info.isNew ? 'new' : '', advised ? 'advised' : ''].filter(Boolean).join(' ');
    const thumb = drawThumb(el('canvas', { class: 'thumb', 'aria-hidden': 'true' }), item, dpr);
    // The badge is a word, part of the card's name for screen readers, so the colour never says it alone.
    const badge = info.isNew ? el('span', { class: 'new-badge', text: T.newBadge }) : null;
    // A monument's tooltip says where it stands (spec 4.4): "Small obelisk: on dry ground, not the fields".
    const b = el('button', { type: 'button', class: cls, dataset: { item }, 'data-lock': `tray-item-${item}`, 'aria-pressed': String(activeItem === item), 'aria-disabled': info.locked ? 'true' : null, title: isMonumentItem(item) ? `${info.name}: ${UI4_TEXT.groundTip}` : null }, [
      thumb, el('span', { class: 'name', text: info.name }), el('span', { class: 'cost' }, costLine(info)), info.upkeepText ? upkeepSpan(world, item, info) : null, info.terrainText ? el('span', { class: 'terrain', title: terrainTitleOf(world, item), text: info.terrainText }) : null, badge, advised ? el('span', { class: 'hint', text: TRAY_V81_TEXT.advised }) : null,
    ]);
    if (!info.locked) b.addEventListener('click', () => onPick(item));
    return b;
  });
  container.append(...buttons);
  if (sameCategory) { container.scrollLeft = kept.left; container.scrollTop = kept.top; }
  if (focusedItem) { const again = buttons.find((b) => b.dataset.item === focusedItem); if (again) again.focus(); }
  return buttons;
}
