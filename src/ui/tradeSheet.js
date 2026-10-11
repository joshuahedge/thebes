// The trading post's sheet (spec 4.15), one step at a time: first the routes, each with Open route and its cost or
// why it cannot open yet; once a route is open, a row per good an open partner trades (what they pay or ask, Buy,
// Sell or Ignore, and the level to keep, in steps of TRADE_KEEP_STEP), then the next caravan's date, or why none will
// come. What it offers is what the sim will honour: it reads routeBlocker, caravanBlocker and tradeStock. It reads the
// world and changes it only through openRoute and setTradeOrder (src/sim/trade.js); createUI registers it as the
// custom sheet 'trade', opened by the Trade button on a trading post's sheet. A command re-renders it (afterCommand).
import { PARTNERS } from '../data/trade.js';
import { GOODS } from '../data/goods.js';
import { TRADE_KEEP_STEP } from '../data/ui.js';
import { openRoute, routeBlocker, setTradeOrder, tradePrices, tradePost, tradeStock, caravanBlocker, nextCaravanDay } from '../sim/trade.js';
import { routeCostOf } from '../sim/costs.js';
import { dateParts } from '../sim/clock.js';
import { el, button } from './components.js';
import {
  T, TRADE_MODE_NAMES, partnerName, goodName, dateText, showMeLabel, openRouteText, routeBlockText, noCaravanText, paysText, asksText,
  inStorageText, keepText, keepHelpText, keepStepText, keepStepLabel, tradeChoiceLabel, tradeReasonText,
} from './text.js';

const isOpen = (world, id) => Boolean(world.trade.routes[id]);
const openPartners = (world) => Object.keys(PARTNERS).filter((id) => isOpen(world, id));

// Why a route cannot open now, or null: the sim's own rule (routeBlocker), so the button is enabled exactly when
// Open route would work.
export const routeBlock = routeBlocker;

// The goods any open partner buys or sells, in the data's order.
export function tradedGoods(world) {
  const traded = new Set(openPartners(world).flatMap((id) => [...Object.keys(PARTNERS[id].buys), ...Object.keys(PARTNERS[id].sells)]));
  return Object.keys(GOODS).filter((g) => traded.has(g));
}

export const orderOf = (world, good) => world.trade.orders[good] || { mode: 'ignore', keep: 0 };

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
      block ? el('p', { class: 'reason small muted', text: routeBlockText(id, block) }) : null,
    ]);
  }

  // One good: its name and the stock near the trading post (what a caravan counts), each open partner's price, the
  // choices those partners allow, and the keep level.
  function goodRow(good, post) {
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
      el('div', { class: 'row' }, [el('strong', { text: name }), el('span', { class: 'small muted', text: inStorageText(tradeStock(world, good, post)) })]),
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
    const blocker = caravanBlocker(world);
    body.append(el('h3', { text: T.routes }), el('ul', { class: 'routes' }, Object.keys(PARTNERS).map(routeRow)));
    if (blocker === 'not_connected') {
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
    const post = tradePost(world);
    body.append(el('h3', { text: T.tradeGoods }), el('p', { class: 'small muted', text: T.tradeHelp }), el('ul', { class: 'trade-goods' }, goods.map((g) => goodRow(g, post))));
    // A date only when a caravan will come (a working post joined by road); the reason otherwise, once: the warning
    // above already says a post no road joins.
    if (blocker === null) body.append(el('div', { class: 'row next-caravan' }, [el('span', { class: 'muted', text: T.nextCaravan }), el('span', { text: dateText(dateParts({ day: nextCaravanDay(world) })) })]));
    else if (blocker !== 'not_connected') body.append(el('p', { class: 'no-caravan coral', text: noCaravanText(blocker) }));
  };
}
