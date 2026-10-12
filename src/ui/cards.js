// Building cards (spec 6.3, early-game pass 2.5): the building's picture, its name and its cost with a coin;
// coral with a coin-slash when unaffordable; a lock and the unlock condition when locked; a "New" badge while a
// milestone's new building waits to be placed (spec 4.14). Shared by the dock tray, the side panel grid and the
// rail drawer.
import { BUILDINGS } from '../data/buildings.js';
import { MILESTONES } from '../data/progression.js';
import { isUnlocked, milestoneIndex } from '../sim/progression.js';
import { costOf, roadCostOf } from '../sim/costs.js';
import { canAfford } from '../sim/money.js';
import { CATEGORIES } from '../data/ui.js';
import { buildingName, unlockText, CONDITION_TEXT, T } from './text.js';
import { el, clear } from './components.js';
import { drawThumb } from './thumbs.js';

const deviceRatio = () => Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

// Which cards a tray shows (spec 4.14): everything unlocked, and what the next milestone unlocks (locked, with its
// condition); buildings of later milestones stay hidden, so the tray never fills with grey. Roads and demolish
// always show.
export function cardShown(world, item) {
  if (!BUILDINGS[item] || isUnlocked(world, item)) return true;
  const next = MILESTONES[milestoneIndex(world.milestone) + 1];
  return Boolean(next && next.unlocks.includes(item));
}

export function shownItems(world, category) {
  const cat = CATEGORIES.find((c) => c.id === category);
  return cat ? cat.items.filter((item) => cardShown(world, item)) : [];
}

// A category shows when it has a card to show: one of its buildings is unlocked or comes with the next milestone.
export const shownCategories = (world) => CATEGORIES.filter((c) => shownItems(world, c.id).length > 0);

// Costs are this city's (difficulty included: spec 4.18), the same the commands charge.
export function cardInfo(world, item) {
  let cost = 0, suffix = '', costText;
  if (item === 'road') { cost = roadCostOf(world); suffix = ' per tile'; }
  else if (item === 'house') { cost = costOf(world, 'house'); suffix = ' per plot'; }
  else if (item !== 'demolish') cost = costOf(world, item);
  costText = item === 'demolish' ? 'Refunds a quarter' : `${cost} gold${suffix}`;
  const locked = Boolean(BUILDINGS[item]) && !isUnlocked(world, item);
  const isNew = !locked && (world.newItems || []).includes(item);
  // terrainText: "Fertile land" or "Rocky ground" for a building that needs it (placement review P15), else ''.
  return { item, name: buildingName(item), cost, costText, affordable: canAfford(world, cost), locked, lockText: locked ? unlockText(item) : '', isNew, terrainText: CONDITION_TEXT.terrainLine(item, true) };
}

export function activeItemOf(tool) {
  if (!tool) return null;
  if (tool.kind === 'building') return tool.type;
  if (tool.kind === 'houses') return 'house';
  if (tool.kind === 'plazas') return 'plaza';   // Stage 4 (ruling 250)
  return tool.kind;   // 'road' or 'demolish'
}

// What a tray of cards shows: its category, the active card and each shown card's affordable, locked and new state.
// The dock, the side panel and the rail rebuild their cards (and so their pictures) only when this key changes, so
// a command that spends a little gold but leaves every card as it was rebuilds nothing.
export function cardsKey(world, category, activeItem) {
  const states = shownItems(world, category).map((item) => {
    const i = cardInfo(world, item);
    return `${item}:${i.affordable ? 'a' : 'u'}${i.locked ? 'l' : 'o'}${i.isNew ? 'n' : ''}`;
  });
  return `${category}|${activeItem}|${states.join(',')}`;
}

// Locked and unaffordable cards keep their words and marks; an affordable cost gets a coin (decoration only).
function costLine(info) {
  if (info.locked) return [`\u{1F512} ${info.lockText}`];
  if (!info.affordable) return [`⊘ ${info.costText}`];
  return info.cost ? [el('span', { class: 'coin', 'aria-hidden': 'true' }), info.costText] : [info.costText];
}

export function renderCards(container, { world, category, activeItem = null, onPick, grid = false }) {
  const focusedItem = container.contains(document.activeElement) && document.activeElement.dataset ? document.activeElement.dataset.item : null;
  clear(container);
  container.classList.toggle('grid', grid);
  const items = shownItems(world, category);
  if (!items.length) { container.append(el('p', { class: 'empty', text: T.comingLater })); return []; }
  const dpr = deviceRatio();
  const buttons = items.map((item) => {
    const info = cardInfo(world, item);
    const cls = ['card', info.affordable ? '' : 'unaffordable', info.locked ? 'locked' : '', info.isNew ? 'new' : ''].filter(Boolean).join(' ');
    const thumb = drawThumb(el('canvas', { class: 'thumb', 'aria-hidden': 'true' }), item, dpr);
    // The badge is a word, part of the card's name for screen readers, so the colour never says it alone.
    const badge = info.isNew ? el('span', { class: 'new-badge', text: T.newBadge }) : null;
    const b = el('button', { type: 'button', class: cls, dataset: { item }, 'aria-pressed': String(activeItem === item), 'aria-disabled': info.locked ? 'true' : null }, [
      thumb, el('span', { class: 'name', text: info.name }), el('span', { class: 'cost' }, costLine(info)), info.terrainText ? el('span', { class: 'terrain', text: info.terrainText }) : null, badge,
    ]);
    if (!info.locked) b.addEventListener('click', () => onPick(item));
    return b;
  });
  container.append(...buttons);
  if (focusedItem) { const again = buttons.find((b) => b.dataset.item === focusedItem); if (again) again.focus(); }
  return buttons;
}
