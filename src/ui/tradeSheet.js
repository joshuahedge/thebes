// The trading post's sheet (spec 4.15), one step at a time: first the routes, each with Open route and its cost or
// why it cannot open yet; once a route is open, a row per good an open partner trades (what they pay or ask, Buy,
// Sell or Ignore, and the level to keep, in steps of TRADE_KEEP_STEP), then the next caravan's date. It reads the
// world and changes it only through openRoute and setTradeOrder (src/sim/trade.js); createUI registers it as the
// custom sheet 'trade', opened by the Trade button on a trading post's sheet. A command re-renders it (afterCommand).
import { PARTNERS } from '../data/trade.js';
import { GOODS } from '../data/goods.js';
import { BUILDINGS } from '../data/buildings.js';
import { TRADE_KEEP_STEP } from '../data/ui.js';
import { openRoute, setTradeOrder, tradePrices, nextCaravanDay, postConnected } from '../sim/trade.js';
import { routeCostOf } from '../sim/costs.js';
import { atLeast } from '../sim/progression.js';
import { allBuildings } from '../sim/world.js';
import { dateParts } from '../sim/clock.js';
import { el, button } from './components.js';
import {
  T, TRADE_MODE_NAMES, partnerName, goodName, dateText, showMeLabel, openRouteText, routeBlockText, paysText, asksText,
  inStorageText, keepText, keepHelpText, keepStepText, keepStepLabel, tradeChoiceLabel, tradeReasonText,
} from './text.js';

const isOpen = (world, id) => Boolean(world.trade.routes[id]);
const hasPost = (world) => allBuildings(world).some((b) => b.type === 'trading_post');
const openPartners = (world) => Object.keys(PARTNERS).filter((id) => isOpen(world, id));

// Why a route cannot open now, or null, by openRoute's rules: the partner's milestone, a trading post, the gold.
export function routeBlock(world, id) {
  if (!atLeast(world, PARTNERS[id].milestone)) return 'locked';
  if (!hasPost(world)) return 'no_post';
  if (world.gold < routeCostOf(world, id)) return 'no_gold';
  return null;
}

// The goods any open partner buys or sells, in the data's order.
export function tradedGoods(world) {
  const traded = new Set(openPartners(world).flatMap((id) => [...Object.keys(PARTNERS[id].buys), ...Object.keys(PARTNERS[id].sells)]));
  return Object.keys(GOODS).filter((g) => traded.has(g));
}

export const orderOf = (world, good) => world.trade.orders[good] || { mode: 'ignore', keep: 0 };
const inStorage = (world, good) => allBuildings(world).reduce((n, b) => n + ((BUILDINGS[b.type].stores || []).includes(good) ? (b.store[good] || 0) : 0), 0);

export function tradeSheet({ world, afterCommand = () => {}, onShowMe = () => {}, toast = () => {} }) {
  const done = (r, kind) => {
    if (r.ok) afterCommand({ kind, result: r, undoable: false });
    else toast(tradeReasonText(r.reason));
  };

  function routeRow(id) {
    const name = el('span', { class: 'name', text: partnerName(id) });
    if (isOpen(world, id)) return el('li', { class: 'route open', dataset: { partner: id } }, [name, el('span', { class: 'status small', text: T.routeOpen })]);
    const block = routeBlock(world, id);
    const words = openRouteText(routeCostOf(world, id));
    const open = button(words, { class: 'open-route primary', 'aria-label': `${words}: ${partnerName(id)}`, disabled: Boolean(block), onClick: () => done(openRoute(world, id), 'route') });
    return el('li', { class: 'route', dataset: { partner: id } }, [
      el('div', { class: 'row' }, [name, open]),
      block ? el('p', { class: 'reason small muted', text: routeBlockText(id, block, routeCostOf(world, id)) }) : null,
    ]);
  }

  // One good: its name and stock, each open partner's price, the choices those partners allow, and the keep level.
  function goodRow(good) {
    const name = goodName(good);
    const order = orderOf(world, good);
    const prices = openPartners(world).map((id) => ({ id, p: tradePrices(world, id) }));
    const words = [];
    for (const { id, p } of prices) {
      if (p.buys[good] !== undefined) words.push(paysText(partnerName(id), p.buys[good]));
      if (p.sells[good] !== undefined) words.push(asksText(partnerName(id), p.sells[good]));
    }
    const modes = [
      prices.some(({ p }) => p.sells[good] !== undefined) ? 'buy' : null,
      prices.some(({ p }) => p.buys[good] !== undefined) ? 'sell' : null,
      'ignore',
    ].filter(Boolean);
    const set = (mode, keep) => done(setTradeOrder(world, good, mode, keep), 'trade');
    const choices = modes.map((m) => button(TRADE_MODE_NAMES[m], { class: `choice mode ${m}`, dataset: { mode: m }, 'aria-pressed': String(order.mode === m), onClick: () => set(m, order.keep) }));
    const li = el('li', { class: 'trade-good', dataset: { good } }, [
      el('div', { class: 'row' }, [el('strong', { text: name }), el('span', { class: 'small muted', text: inStorageText(inStorage(world, good)) })]),
      el('p', { class: 'prices small', text: words.join(' · ') }),
      el('span', { class: 'choices', role: 'group', 'aria-label': tradeChoiceLabel(name) }, choices),
    ]);
    if (order.mode !== 'ignore') {
      const less = button(keepStepText(-1), { class: 'keep-less', 'aria-label': keepStepLabel(-1, name), disabled: order.keep <= 0, onClick: () => set(order.mode, Math.max(0, order.keep - TRADE_KEEP_STEP)) });
      const more = button(keepStepText(1), { class: 'keep-more', 'aria-label': keepStepLabel(1, name), onClick: () => set(order.mode, order.keep + TRADE_KEEP_STEP) });
      li.append(
        el('div', { class: 'keep' }, [less, el('span', { class: 'keep-value', text: keepText(order.keep) }), more]),
        el('p', { class: 'keep-help small muted', text: keepHelpText(order.mode, order.keep) }),
      );
    }
    return li;
  }

  return function render(body) {
    body.append(el('h3', { text: T.routes }), el('ul', { class: 'routes' }, Object.keys(PARTNERS).map(routeRow)));
    if (hasPost(world) && !postConnected(world)) {
      const at = world.tradeEntry;
      body.append(el('div', { class: 'trade-warning' }, [
        el('p', { class: 'coral', text: T.postNotJoined }),
        el('div', { class: 'fix' }, [
          el('span', { class: 'small muted', text: T.postNotJoinedFix }),
          button(T.showMe, { class: 'show-me primary', 'aria-label': showMeLabel(T.postNotJoinedFix), onClick: () => onShowMe({ category: 'roads', item: 'road', x: at.x + 0.5, y: at.y + 0.5 }) }),
        ]),
      ]));
    }
    const goods = tradedGoods(world);
    if (!goods.length) { body.append(el('p', { class: 'muted', text: T.openRouteFirst })); return; }
    body.append(el('h3', { text: T.tradeGoods }), el('p', { class: 'small muted', text: T.tradeHelp }), el('ul', { class: 'trade-goods' }, goods.map(goodRow)));
    const day = nextCaravanDay(world);
    if (Number.isFinite(day)) body.append(el('div', { class: 'row next-caravan' }, [el('span', { class: 'muted', text: T.nextCaravan }), el('span', { text: dateText(dateParts({ day })) })]));
  };
}
