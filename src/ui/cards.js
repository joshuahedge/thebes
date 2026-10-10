// Building cards (spec 6.3): name and cost; coral with a coin-slash when unaffordable; a lock and the
// unlock condition when locked. Shared by the dock tray, the side panel grid and the rail drawer.
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { isUnlocked } from '../sim/progression.js';
import { canAfford } from '../sim/money.js';
import { CATEGORIES } from '../data/ui.js';
import { buildingName, unlockText, T } from './text.js';
import { el, clear } from './components.js';

export function cardInfo(world, item) {
  let cost = 0, suffix = '', costText;
  if (item === 'road') { cost = ECONOMY.roadCost; suffix = ' per tile'; }
  else if (item === 'house') { cost = BUILDINGS.house.cost; suffix = ' per plot'; }
  else if (item !== 'demolish') cost = BUILDINGS[item].cost;
  costText = item === 'demolish' ? 'Refunds a quarter' : `${cost} gold${suffix}`;
  const locked = Boolean(BUILDINGS[item]) && !isUnlocked(world, item);
  return { item, name: buildingName(item), cost, costText, affordable: canAfford(world, cost), locked, lockText: locked ? unlockText(item) : '' };
}

export function activeItemOf(tool) {
  if (!tool) return null;
  if (tool.kind === 'building') return tool.type;
  if (tool.kind === 'houses') return 'house';
  return tool.kind;   // 'road' or 'demolish'
}

export function renderCards(container, { world, category, activeItem = null, onPick, grid = false }) {
  clear(container);
  container.classList.toggle('grid', grid);
  const cat = CATEGORIES.find((c) => c.id === category);
  const items = cat ? cat.items : [];
  if (!items.length) { container.append(el('p', { class: 'empty', text: T.comingLater })); return []; }
  const buttons = items.map((item) => {
    const info = cardInfo(world, item);
    const cls = ['card', info.affordable ? '' : 'unaffordable', info.locked ? 'locked' : ''].filter(Boolean).join(' ');
    const costLine = info.locked ? `\u{1F512} ${info.lockText}` : (info.affordable ? info.costText : `⊘ ${info.costText}`);
    const b = el('button', { type: 'button', class: cls, 'aria-pressed': String(activeItem === item), 'aria-disabled': info.locked ? 'true' : null }, [
      el('span', { class: 'name', text: info.name }), el('span', { class: 'cost', text: costLine }),
    ]);
    if (!info.locked) b.addEventListener('click', () => onPick(item));
    return b;
  });
  container.append(...buttons);
  return buttons;
}
