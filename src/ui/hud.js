// The top bar (spec 6.3): gold, people, mood, date and the menu; wide screens add income, jobless, months of
// food and the speed buttons. Tapping the numbers opens the city summary. Numbers refresh every frame.
import { population, housesOf, allBuildings } from '../sim/world.js';
import { dateParts } from '../sim/clock.js';
import { monthlyNeed } from '../sim/distribution.js';
import { wantedGoods } from '../sim/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { el, iconButton, setText } from './components.js';
import { T, dateText, shortDateText } from './text.js';

export function summaryData(world) {
  const last = world.stats.lastMonth || { taxes: 0, wages: 0, upkeep: 0, net: 0 };
  let foodStored = 0;
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (def.stores || def.sells) for (const g of FOOD_GOODS) foodStored += b.store[g] || 0;
  }
  let foodNeed = 0;
  for (const h of housesOf(world)) if (h.tier >= 1 && wantedGoods(h).length) foodNeed += monthlyNeed(h, FOOD_GOODS[0]);
  const L = world.labour;
  return {
    gold: world.gold, people: population(world), mood: world.mood, moodBreakdown: world.moodBreakdown, date: dateParts(world),
    taxes: last.taxes, wages: last.wages, upkeep: last.upkeep, net: last.net,
    foodStored, foodNeed, monthsOfFood: foodNeed > 0 ? Math.round((foodStored / foodNeed) * 10) / 10 : null,
    workforce: L.workforce, working: L.employed, jobless: L.workforce - L.employed, jobs: L.jobs,
  };
}

const stat = (label, cls) => el('span', { class: `stat ${cls}` }, [el('span', { class: 'label', text: label }), el('span', { class: 'value', text: '' })]);

// shortDate() says when the date reads "Y2 M1" rather than "Year 2, month 1, day 1": on a phone, and (createUI) in the
// wide layout at 150% text, where the long date would push the numbers to a third row on a 900 px screen.
export function createHud({ world, store, container, speedBar = null, onOpenSummary = () => {}, onOpenMenu = () => {}, shortDate = () => store.get().layout !== 'wide' }) {
  const gold = stat(T.gold, 'gold'), people = stat(T.people, 'people'), mood = stat(T.mood, 'mood'), date = stat(T.date, 'date');
  const income = stat(T.income, 'income wide-only'), jobless = stat(T.jobless, 'jobless wide-only'), food = stat(T.food, 'food wide-only');
  // No aria-label here: it would replace the visible numbers as the accessible name (spec 6.8). The hint is read as part of the name.
  const stats = el('button', { type: 'button', class: 'stats quiet', title: T.summary, onClick: onOpenSummary }, [gold, people, mood, date, income, jobless, food, el('span', { class: 'sr-only', text: T.openSummary })]);
  const menu = iconButton(T.menu, '☰', { class: 'menu' });
  menu.addEventListener('click', onOpenMenu);
  const bar = el('div', { class: 'speed wide-only' });
  if (speedBar) bar.append(speedBar);
  container.append(stats, el('span', { class: 'spacer' }), bar, menu);

  function render() {
    const d = summaryData(world);
    setText(gold.lastChild, String(d.gold));
    setText(people.lastChild, String(d.people));
    setText(mood.lastChild, String(d.mood));
    setText(date.lastChild, shortDate() ? shortDateText(d.date) : dateText(d.date));
    setText(income.lastChild, (d.net >= 0 ? '+' : '') + String(d.net));
    setText(jobless.lastChild, String(d.jobless));
    setText(food.lastChild, d.monthsOfFood === null ? '–' : `${d.monthsOfFood} mo`);
  }
  render();
  return { render };
}
