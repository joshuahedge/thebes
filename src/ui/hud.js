// The top bar (spec 6.3): gold, people, mood, date and the menu; wide screens add income, jobless, months of
// food and the speed buttons. Tapping the numbers opens the city summary. Numbers refresh every frame.
import { population, housesOf, allBuildings } from '../sim/world.js';
import { dateParts } from '../sim/clock.js';
import { monthlyNeed } from '../sim/distribution.js';
import { monthForecast } from '../sim/economy.js';
import { wantedGoods } from '../sim/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { el, iconButton, setText } from './components.js';
import { T, S45_TEXT, dateText, shortDateText } from './text.js';

export function summaryData(world) {
  const last = world.stats.lastMonth || { taxes: 0, wages: 0, upkeep: 0, net: 0 };
  let foodStored = 0;
  const foodByGood = Object.fromEntries(FOOD_GOODS.map((g) => [g, 0]));
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (def.stores || def.sells) for (const g of FOOD_GOODS) { foodStored += b.store[g] || 0; foodByGood[g] += b.store[g] || 0; }
  }
  let foodNeed = 0;
  for (const h of housesOf(world)) if (h.tier >= 1 && wantedGoods(h).length) foodNeed += monthlyNeed(h, FOOD_GOODS[0]);
  const L = world.labour;
  return {
    gold: world.gold, people: population(world), mood: world.mood, moodBreakdown: world.moodBreakdown, date: dateParts(world),
    taxes: last.taxes, wages: last.wages, upkeep: last.upkeep, soldiers: last.soldiers || 0, net: last.net,
    tradeIncome: last.tradeIncome || 0, tradeSpent: last.tradeSpent || 0, made: last.made || {}, used: last.used || {}, difficulty: world.difficulty,   // the economy (spec 4.10, 4.18)
    foodStored, foodByGood, foodNeed, monthsOfFood: foodNeed > 0 ? Math.round((foodStored / foodNeed) * 10) / 10 : null,
    workforce: L.workforce, working: L.employed, jobless: L.workforce - L.employed, jobs: L.jobs,
  };
}

// A number with its word before it. The four a phone shows also carry a small picture (mobile UX review, section 4 item
// 8): at 150% text a phone shows it in place of the word, which stays for screen readers (css/ui.css), so the numbers
// keep to one row. The picture is decoration, hidden from screen readers: the gold coin (drawn in CSS), an ankh for the
// people, a smile for the mood and the sun for the date.
const GLYPHS = { gold: '', people: '☥', mood: '☺', date: '☼' };
const stat = (label, cls) => {
  const key = cls.split(' ')[0];
  const glyph = key in GLYPHS ? el('span', { class: key === 'gold' ? 'glyph coin' : 'glyph', 'aria-hidden': 'true', text: GLYPHS[key] }) : null;
  return el('span', { class: `stat ${cls}` }, [glyph, el('span', { class: 'label', text: label }), el('span', { class: 'value', text: '' })]);
};

// shortDate() says when the date reads "Y2 M1" rather than "Year 2, month 1, day 1": on a phone, and (createUI) in the
// wide layout under 1000 px wide or at 150% text, where the long date would push the numbers onto another row.
export function createHud({ world, store, container, speedBar = null, onOpenSummary = (section) => {}, onOpenMenu = () => {}, onOpenAdvice = () => {}, advice = () => ({ shown: false, dot: false }), shortDate = () => store.get().layout !== 'wide' }) {
  const gold = stat(T.gold, 'gold'), people = stat(T.people, 'people'), mood = stat(T.mood, 'mood'), date = stat(T.date, 'date');
  const income = stat(T.income, 'income wide-only'), jobless = stat(T.jobless, 'jobless wide-only'), food = stat(T.food, 'food wide-only');
  // Stage 3 (spec 4.19): the score chip, a small "Score 247" on the summary button. It starts empty and hidden; the score
  // interface fills it after every command and game day (src/ui/scoreUi.js), so the top bar's numbers are unchanged.
  const scoreChip = el('span', { class: 'score-chip small', hidden: true });
  // Stage 4.5 (Task 4b, ruling 316): the month's forecast in the gold chip, "+120 a month", on phones too. It turns amber (with a
  // mark, so colour is never alone) only when the sim says the treasury runs out within FORECAST.amberMonths; a tap on it opens the
  // summary at its forecast section. Hidden until the city has anything to forecast.
  // The words for the eye ("+120" then " a month", which a phone shortens to "/mo": css) and the sentence for a screen reader.
  const forecastNum = el('span'), forecastText = el('span', { 'aria-hidden': 'true' }, [forecastNum, el('span', { class: 'long', text: ' a month' }), el('span', { class: 'short', text: '/mo' })]), forecastWords = el('span', { class: 'sr-only' });
  const forecast = el('span', { class: 'forecast', hidden: true }, [forecastText, forecastWords]);
  gold.append(forecast);
  // No aria-label here: it would replace the visible numbers as the accessible name (spec 6.8). The hint is read as part of the name.
  const stats = el('button', { type: 'button', class: 'stats quiet', title: T.summary, onClick: (ev) => onOpenSummary(ev && ev.target && ev.target.closest && ev.target.closest('.forecast') ? 'forecast' : null) }, [gold, people, mood, date, income, jobless, food, scoreChip, el('span', { class: 'sr-only', text: T.openSummary })]);
  const menu = iconButton(T.menu, '☰', { class: 'menu' });
  menu.addEventListener('click', onOpenMenu);
  const bar = el('div', { class: 'speed wide-only' });
  if (speedBar) bar.append(speedBar);
  // Version 5.0 (Task 1): the City advice button, a scroll, between the numbers and the menu. It comes with the first home (hidden before), and a dot on
  // it says something new has appeared since the sheet was last open (advice(): { shown, dot }, from src/ui/adviceSheet.js). The dot is a shape and the
  // name says it too, so colour is never the only cue.
  const scroll = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of [['viewBox', '0 0 24 24'], ['width', '22'], ['height', '22'], ['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true'], ['class', 'icon scroll']]) scroll.setAttribute(k, v);
  for (const d of ['M19 17V5a2 2 0 0 0-2-2H4', 'M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3']) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    scroll.append(path);
  }
  const adviceDot = el('span', { class: 'advice-dot', 'aria-hidden': 'true', hidden: true });
  const adviceButton = el('button', { type: 'button', class: 'advice', 'aria-label': T.advice, title: T.advice, hidden: true, onClick: () => onOpenAdvice() }, [scroll, adviceDot]);
  container.append(stats, el('span', { class: 'spacer' }), bar, adviceButton, menu);

  function renderNumbers() {
    const d = summaryData(world);
    setText(gold.querySelector('.value'), String(d.gold));
    const f = monthForecast(world);
    forecast.hidden = !f.active;
    if (f.active) {
      forecast.classList.toggle('warn', f.runsOut);
      setText(forecastNum, `${f.runsOut ? '⚠ ' : ''}${S45_TEXT.signed(f.net)}`);
      setText(forecastWords, S45_TEXT.chipLabel(f));
      forecast.title = S45_TEXT.chipLabel(f);
    }
    setText(people.lastChild, String(d.people));
    setText(mood.lastChild, String(d.mood));
    setText(date.lastChild, shortDate() ? shortDateText(d.date) : dateText(d.date));
    setText(income.lastChild, (d.net >= 0 ? '+' : '') + String(d.net));
    setText(jobless.lastChild, String(d.jobless));
    setText(food.lastChild, d.monthsOfFood === null ? '–' : `${d.monthsOfFood} mo`);
    const adv = advice();
    if (adviceButton.hidden === adv.shown) adviceButton.hidden = !adv.shown;
    if (adviceDot.hidden === adv.dot) adviceDot.hidden = !adv.dot;
    const name = adv.dot ? T.adviceNew : T.advice;
    if (adviceButton.title !== name) { adviceButton.title = name; adviceButton.setAttribute('aria-label', name); }
  }
  // The forecast is a second line under the gold; where the numbers have already wrapped to two rows the bar has no room for a third
  // line, so it hides (css .tight). Measured only when what is shown, or the room for it, changes.
  let lastKey = '';
  function fitForecast(key) {
    if (key === lastKey) return;
    const tops = new Set([...stats.querySelectorAll('.stat')].filter((st) => st.offsetParent !== null).map((st) => st.offsetTop));
    lastKey = tops.size ? key : '';                    // not laid out yet (the bar is not on the page): measure again next time
    if (tops.size) stats.classList.toggle('tight', tops.size > 1);
  }
  const textOf = (n) => n.querySelector('.value').textContent;
  function render() {
    renderNumbers();
    fitForecast([textOf(gold), textOf(people), textOf(mood), textOf(date), textOf(income), textOf(jobless), textOf(food), container.clientWidth, document.body.dataset.textSize, store.get().layout, adviceButton.hidden].join('|'));
  }
  render();
  return { render };
}
