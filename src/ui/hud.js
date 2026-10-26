// The top bar (spec 6.3): gold, people, mood, date and the score, the papyrus (Messages and the City page) and the menu; wide screens add the speed buttons.
// Numbers refresh every frame.
// Version 8.1 (Track B, rulings 1220-1239): each stat is its own button with a drawn picture that has states (src/ui/v81/statIcons.js) and its number in one
// type size and weight; the words the bar used to mix in (labels, the forecast line under the gold, the season under the date, the score chip) are gone from
// it. A tap on a stat opens its explainer under it (src/ui/v81/stats.js): what it is, why it moves and one thing to do. The month's forecast lives there now.
import { population, housesOf, allBuildings } from '../sim/world.js';
import { dateParts } from '../sim/clock.js';
import { monthlyNeed } from '../sim/distribution.js';
import { wantedGoods } from '../sim/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { el, iconButton, setText } from './components.js';
import { T, TRAY_TEXT } from './text.js';
import { V81_B_TEXT as B } from './v81/bText.js';
import { STAT_KINDS, statState, explainStat, createExplainer, createScoreReader } from './v81/stats.js';
import { goldIcon, peopleIcon, moodIcon, floodIcon, scoreIcon } from './v81/statIcons.js';

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

// Each stat's picture for its state, and the key that says when it must be drawn again.
const PICTURES = {
  gold: (s) => [`${s.coins}${s.falling}`, () => goldIcon(s.coins, s.falling)],
  people: (s) => [String(s.figures), () => peopleIcon(s.figures)],
  mood: (s) => [s.face, () => moodIcon(s.face)],
  date: (s) => [`${s.season}${s.level}`, () => floodIcon(s.season, s.level)],
  score: () => ['score', () => scoreIcon()],
};

// shortDate() says when the wide bar's date reads "Y2 M1" rather than "Year 2, month 1, day 1" (createUI: under 1000 px wide or at 150% text); a phone's
// reads the month alone, "M1" (ruling 1227: its name and explainer say the whole date). explain: the explainers' hands ({ advice, openSummary, selectBuilding }: src/ui/v81/stats.js explainStat); score() the city's score
// (scoreOf's result) or null.
export function createHud({ world, store, container, speedBar = null, onOpenSummary = (section) => {}, onOpenMenu = () => {}, onOpenAdvice = () => {}, advice = () => ({ shown: false, dot: false }), shortDate = () => store.get().layout !== 'wide', explain = {}, score = createScoreReader(world), doc = document }) {
  const deps = { openSummary: onOpenSummary, ...explain, score };
  const explainer = createExplainer({ host: container, store, explain: (kind) => explainStat(world, kind, deps), doc });
  const stats = el('div', { class: 'stats', role: 'group', 'aria-label': B.statsGroup });
  const buttons = {};
  for (const kind of STAT_KINDS) {
    const picture = el('span', { class: 'glyph', 'aria-hidden': 'true' });
    const value = el('span', { class: 'value', 'aria-hidden': 'true' });
    const b = el('button', { type: 'button', class: `stat ${kind}`, 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-controls': 'stat-explainer', dataset: { lock: `stat-${kind}` } }, [picture, value]);
    b.addEventListener('click', (e) => explainer.toggle(kind, b, Boolean(e) && e.detail === 0));
    b._key = null;
    buttons[kind] = b;
    stats.append(b);
  }
  const menu = iconButton(T.menu, '☰', { class: 'menu', dataset: { lock: 'menu' } });
  menu.addEventListener('click', onOpenMenu);
  const bar = el('div', { class: 'speed wide-only' });
  if (speedBar) bar.append(speedBar);
  // Version 5.0 (Task 1): the papyrus, a scroll, between the numbers and the menu. It comes with the first home (hidden before), and a dot on it says something
  // new has appeared since the sheet was last open (advice(): { shown, dot }, from src/ui/adviceSheet.js). The dot is a shape and the name says it too, so
  // colour is never the only cue. Version 8.1 (ruling 1226): it opens Messages, with the City page as the sheet's second tab.
  const scroll = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of [['viewBox', '0 0 24 24'], ['width', '22'], ['height', '22'], ['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true'], ['class', 'icon scroll']]) scroll.setAttribute(k, v);
  for (const d of ['M19 17V5a2 2 0 0 0-2-2H4', 'M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3']) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    scroll.append(path);
  }
  const adviceDot = el('span', { class: 'advice-dot', 'aria-hidden': 'true', hidden: true });
  // Version 8.0 (Track N, ruling 1160): the message tray lives behind this same button, so it also shows how many messages have not been read (advice(): { shown, dot, count }); the number is a shape
  // and the name says it too. With nothing unread the button is as it was.
  const adviceCount = el('span', { class: 'advice-count', 'aria-hidden': 'true', hidden: true });
  const adviceButton = el('button', { type: 'button', class: 'advice', 'aria-label': T.advice, title: T.advice, hidden: true, dataset: { lock: 'papyrus' }, onClick: () => onOpenAdvice() }, [scroll, adviceDot, adviceCount]);
  container.append(stats, el('span', { class: 'spacer' }), bar, adviceButton, menu);

  let day = world.day;
  function render() {
    const r = score();
    const s = statState(world, { date: store.get().layout !== 'wide' ? 'month' : shortDate() ? 'short' : 'long', score: r ? r.total : null });
    for (const kind of STAT_KINDS) {
      const b = buttons[kind], st = s[kind];
      const [key, draw] = PICTURES[kind](st);
      if (b._key !== key) { b._key = key; b.firstChild.replaceChildren(draw()); }
      setText(b.lastChild, st.value);
      b.classList.toggle('falling', Boolean(st.falling));
      const name = B.statName(B.names[kind], kind === 'date' ? st.full : st.full === null ? '' : String(st.full), st.words);
      if (b.getAttribute('aria-label') !== name) { b.setAttribute('aria-label', name); b.title = name.replace(/\. Explain$/, ''); }
    }
    // The score shows once someone lives in the city and the score interface has measured it (mobile UX review, section 4 item 9).
    const scoreHidden = s.score.full === null || population(world) === 0;
    if (buttons.score.hidden !== scoreHidden) buttons.score.hidden = scoreHidden;
    const adv = advice();
    if (adviceButton.hidden === adv.shown) adviceButton.hidden = !adv.shown;
    if (adviceDot.hidden === adv.dot) adviceDot.hidden = !adv.dot;
    const count = adv.count || 0;
    if (adviceCount.hidden === count > 0) adviceCount.hidden = count <= 0;
    if (count > 0) setText(adviceCount, count > 9 ? '9+' : String(count));
    const name = count > 0 ? TRAY_TEXT.buttonName(count, adv.dot) : adv.dot ? T.adviceNew : T.advice;
    if (adviceButton.title !== name) { adviceButton.title = name; adviceButton.setAttribute('aria-label', name); }
    // An open explainer follows the city once a game day (its numbers are the sim's breakdown, read afresh).
    if (world.day !== day) { day = world.day; explainer.refresh(); }
    fit([...STAT_KINDS.map((k) => s[k].value), buttons.score.hidden, adviceButton.hidden, container.clientWidth, document.body.dataset.textSize, store.get().layout].join('|'));
  }
  // Ruling 1227: the numbers keep to one row. Where they would not fit (a narrow phone at large text with big numbers) the stats lose their own padding
  // ('squeeze'), then the score keeps its picture alone ('squeeze-more'), and last the score steps out of the bar to the City page ('squeeze-most').
  // Measured only when what is shown, or the room for it, changes.
  let fitKey = '';
  function fit(key) {
    if (key === fitKey) return;
    fitKey = stats.clientWidth ? key : '';            // not laid out yet (the bar is not on the page): measure again next time
    if (!fitKey) return;
    const over = () => {
      const edge = stats.getBoundingClientRect().right + 0.5;
      return stats.scrollWidth > stats.clientWidth + 1 || [...stats.children].some((b) => !b.hidden && b.getBoundingClientRect().right > edge);
    };
    stats.classList.remove('squeeze', 'squeeze-more', 'squeeze-most');
    if (over()) stats.classList.add('squeeze');
    if (over()) stats.classList.add('squeeze-more');
    if (over()) stats.classList.add('squeeze-most');   // the narrowest phone at 150% text with a late city's numbers: the score waits on the City page
  }
  render();
  return { render, explainer, destroy: () => explainer.destroy() };
}
