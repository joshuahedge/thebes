// The Trade sheet (spec 4.15; Version 7.0, Track T, rulings 870-899). One card per route, then the city-wide Keep at least list:
//   routes      every partner in PARTNERS order. A route not open yet is one row: Open route and its cost, or why it cannot open yet (a river
//               route without a Quay says so, with Show me). An open route is a card: its next caravan or boat in game months (or why none
//               will come), last year's profit from the sim's ledger, and a switch for each good it buys and sells, with its price
//   keep        one row per good an open route trades: what is near the trading post and the Quay (what a caravan or boat counts), Buy,
//               Sell or Ignore, the Keep at least level in steps of FLOOR_STEP, and what is held for the temple or the court
// On a phone (the portrait and compact layouts) the open routes are an accordion, one open at a time; on a wide screen the side panel shows
// every card open (ruling 877). What it offers is what the sim will honour: it reads routeBlocker, arrivalBlocker, tradeAllowed, heldBack,
// sellAbove and keepAtLeast, and changes the world only through openRoute, setTradeSwitch, setTradeOrder and setKeepAtLeast
// (src/sim/trade.js). createUI registers it as the custom sheet 'trade'; Track T's seam (src/ui/v70/trade.js) registers it again with the
// layout and the store, opened by the Trade button on a trading post's or a Quay's sheet and the summary's Trade row. A command re-renders it
// (afterCommand); opening or closing a card re-renders it in place, focus kept on the card's head.
import { PARTNERS, FLOOR_STEP, QUAY_TYPE } from '../data/trade.js';
import { GOODS } from '../data/goods.js';
import {
  openRoute, routeBlocker, setTradeOrder, setTradeSwitch, setKeepAtLeast, keepAtLeast, sellAbove, tradePrices, tradePost, tradeStock, caravanBlocker,
  arrivalBlocker, activeQuay, quays, byRiver, lastYearOf, monthsToNextArrival,
} from '../sim/trade.js';
import { tradeAllowed, heldBack } from '../sim/tradeRules.js';
import { routeCostOf } from '../sim/costs.js';
import { T as TERRAIN } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';
import { inOasisPool } from '../sim/oases.js';
import { el, button, clear } from './components.js';
import {
  T, TRADE_MODE_NAMES, partnerName, goodName, showMeLabel, openRouteText, routeBlockText, noCaravanText, tradeChoiceLabel, tradeReasonText,
  V70_TRADE_TEXT as W,
} from './text.js';

const isOpen = (world, id) => Boolean(world.trade.routes[id]);
const openPartners = (world) => Object.keys(PARTNERS).filter((id) => isOpen(world, id));

// Why a route cannot open now, or null: the sim's own rule (routeBlocker), so the button is enabled exactly when
// Open route would work.
export const routeBlock = routeBlocker;

// The goods any open partner buys or sells, in the data's order.
export function tradedGoods(world) {
  const traded = new Set(openPartners(world).flatMap((id) => { const p = tradePrices(world, id); return [...Object.keys(p.buys), ...Object.keys(p.sells)]; }));   // Stage 4: listed goods only
  return Object.keys(GOODS).filter((g) => traded.has(g));
}

// Where a caravan or boat counts the stock when it trades this good on this side ('buys': the city sells it; 'sells': the city buys it): the trading post for an open
// road route that lists it, the Quay for an open river one (src/sim/trade.js stockNear), the post first. The Keep at least words say "near" these.
export function placesFor(world, good, side) {
  const kinds = openPartners(world).filter((id) => tradePrices(world, id)[side][good] !== undefined).map((id) => (byRiver(id) ? 'quay' : 'post'));
  const out = ['post', 'quay'].filter((k) => kinds.includes(k));
  return out.length ? out : ['post'];
}

export const orderOf = (world, good) => world.trade.orders[good] || { mode: 'ignore', keep: 0 };

// Why this route's next caravan or boat will not come, in words, or null when it will.
export const arrivalBlockText = (world, id) => {
  const b = arrivalBlocker(world, id);
  if (b === null) return null;
  return byRiver(id) ? W.noBoat[b] : b === 'not_connected' ? T.postNotJoined : noCaravanText(b);
};

// Where Show me points for a missing Quay: the river tile nearest the trading post (an oasis pool is water but not a river: the placing rule refuses a Quay
// there, src/sim/fit.js), else the middle of the map's start (the river by the city).
export function quayHint(world) {
  const post = tradePost(world);
  const from = post ? { x: post.x + 1, y: post.y + 1 } : world.focus || { x: world.size / 2, y: world.size / 2 };
  let best = null, bestD = Infinity;
  for (let y = 0; y < world.size; y++) for (let x = 0; x < world.size; x++) {
    if (world.terrain[idx(world.size, x, y)] !== TERRAIN.WATER || inOasisPool(world, x, y)) continue;
    const d = Math.hypot(x - from.x, y - from.y);
    if (d < bestD) { bestD = d; best = { x: x + 0.5, y: y + 0.5 }; }
  }
  return best || { x: from.x, y: from.y };
}

export function tradeSheet({ world, afterCommand = () => {}, onShowMe = () => {}, toast = () => {}, layout = () => 'wide' }) {
  let expanded = null;          // the open route card on a phone (one at a time); null: the first open route
  const done = (r, kind) => {
    if (r.ok) afterCommand({ kind, result: r, undoable: false });
    else toast(tradeReasonText(r.reason));
  };
  const accordion = () => layout() !== 'wide';

  function closedRow(id) {
    const block = routeBlock(world, id);
    const words = openRouteText(routeCostOf(world, id));
    const name = el('span', { class: 'name' }, [partnerName(id), ' ', el('span', { class: 'by small muted', text: byRiver(id) ? W.byRiver : W.byRoad })]);
    const open = button(words, { class: 'open-route primary', 'aria-label': `${words}: ${partnerName(id)}`, disabled: Boolean(block), onClick: () => done(openRoute(world, id), 'route') });
    const li = el('li', { class: 'route', dataset: { partner: id } }, [el('div', { class: 'row' }, [name, open])]);
    if (block) li.append(el('p', { class: 'reason small muted', text: routeBlockText(id, block) }));
    if (block === 'no_quay') {
      li.append(el('div', { class: 'fix' }, [
        el('span', { class: 'small muted', text: W.buildQuay }),
        button(T.showMe, { class: 'show-me', 'aria-label': showMeLabel(W.buildQuay), onClick: () => { const at = quayHint(world); onShowMe({ category: 'industry', item: QUAY_TYPE, x: at.x, y: at.y }); } }),
      ]));
    }
    return li;
  }

  // One good on one side of a route: a switch whose state is a word (never colour alone), with the price.
  function switchRow(id, side, good, price) {
    const on = tradeAllowed(world, id, good, side);
    const sw = el('button', {
      type: 'button', role: 'switch', class: 'switch trade-switch', 'aria-checked': String(on), 'aria-label': W.switchLabel(side, good, id, on),
      dataset: { side, good },
    }, [
      el('span', { class: 'good' }, [goodName(good), ' ', el('span', { class: 'price small muted', text: side === 'buys' ? W.pays(price) : W.asks(price) })]),
      el('span', { class: 'state small', text: on ? W.on : W.off }),
    ]);
    sw.addEventListener('click', () => done(setTradeSwitch(world, id, side, good, !on), 'trade'));
    return el('li', { dataset: { side, good } }, [sw]);
  }

  function card(id, body) {
    const shut = accordion() && expanded !== id;
    const status = arrivalBlockText(world, id);
    const summary = [status || W.nextIn(id, monthsToNextArrival(world)), W.lastYear(lastYearOf(world, id))].join(' · ');
    const title = [el('span', { class: 'name' }, [partnerName(id), ' ', el('span', { class: 'by small muted', text: byRiver(id) ? W.byRiver : W.byRoad })]),
      el('span', { class: `summary small ${status ? 'coral' : 'muted'}`, text: summary })];
    const panelId = `trade-route-${id}`;
    // aria-controls names the panel only while it is in the page: a closed head points at nothing.
    const head = accordion()
      ? el('button', { type: 'button', class: 'route-head', 'aria-expanded': String(!shut), ...(shut ? {} : { 'aria-controls': panelId }), dataset: { partner: id } }, [...title, el('span', { class: 'chevron', 'aria-hidden': 'true', text: shut ? '▾' : '▴' })])
      : el('div', { class: 'route-head' }, title);
    if (accordion()) {
      head.addEventListener('click', () => {
        expanded = shut ? id : '';
        clear(body);
        render(body);
        const again = body.querySelector(`.route-head[data-partner="${id}"]`);
        if (again) again.focus();
      });
    }
    const li = el('li', { class: 'route open', dataset: { partner: id } }, [head]);
    if (shut) return li;
    const p = tradePrices(world, id);
    li.append(el('div', { class: 'route-body', id: panelId }, [
      el('p', { class: 'ledger small muted', text: W.lastYearLong(lastYearOf(world, id)) }),
      el('p', { class: 'switch-help small muted', text: W.switchHelp }),
      Object.keys(p.buys).length ? el('h4', { text: W.theyBuy(id) }) : null,
      el('ul', { class: 'switches' }, Object.entries(p.buys).map(([g, n]) => switchRow(id, 'buys', g, n))),
      Object.keys(p.sells).length ? el('h4', { text: W.theySell(id) }) : null,
      el('ul', { class: 'switches' }, Object.entries(p.sells).map(([g, n]) => switchRow(id, 'sells', g, n))),
    ]));
    return li;
  }

  // One good: what the caravans and boats can count near the post and the Quay, the choices the open routes allow, Keep at least, and what
  // is held back for the temple and the court (the sim's heldBack; the sell line is the caravan's own sellAbove).
  function goodRow(good, where) {
    const name = goodName(good);
    const order = orderOf(world, good);
    const prices = openPartners(world).map((id) => tradePrices(world, id));
    const modes = [prices.some((p) => p.sells[good] !== undefined) ? 'buy' : null, prices.some((p) => p.buys[good] !== undefined) ? 'sell' : null, 'ignore'].filter(Boolean);
    const level = keepAtLeast(world, good);
    const choices = modes.map((m) => button(TRADE_MODE_NAMES[m], {
      class: `choice mode ${m}`, dataset: { mode: m }, 'aria-pressed': String(order.mode === m), onClick: () => done(setTradeOrder(world, good, m, level), 'trade'),
    }));
    const stock = where.map(({ kind, b }) => W.near(tradeStock(world, good, b), kind)).join(' · ');
    const li = el('li', { class: 'trade-good', dataset: { good } }, [
      el('div', { class: 'row' }, [el('strong', { text: name }), el('span', { class: 'stock small muted', text: stock })]),
      el('span', { class: 'choices', role: 'group', 'aria-label': tradeChoiceLabel(name) }, choices),
    ]);
    const held = heldBack(world, good);
    const heldWords = [held.temple ? W.heldTemple(held.temple) : null, held.court ? W.heldCourt(held.court) : null].filter(Boolean);
    if (order.mode !== 'ignore') {
      const set = (n) => done(setKeepAtLeast(world, good, n), 'trade');
      const less = button(`−${FLOOR_STEP}`, { class: 'keep-less', 'aria-label': W.keepLabel(-1, name), disabled: level <= 0, onClick: () => set(Math.max(0, level - FLOOR_STEP)) });
      const more = button(`+${FLOOR_STEP}`, { class: 'keep-more', 'aria-label': W.keepLabel(1, name), onClick: () => set(level + FLOOR_STEP) });
      li.append(
        el('div', { class: 'keep' }, [less, el('span', { class: 'keep-value', text: W.keep(level) }), more]),
        el('p', { class: 'keep-help small muted', text: order.mode === 'buy' ? W.buyHelp(order.keep, placesFor(world, good, 'sells')) : W.sellHelp(sellAbove(world, good), placesFor(world, good, 'buys')) }),
      );
    }
    if (heldWords.length) li.append(el('p', { class: 'held small amber', text: heldWords.join(' · ') }));
    return li;
  }

  function render(body) {
    const open = openPartners(world);
    if (expanded === null || (expanded && !open.includes(expanded))) expanded = open[0] || null;
    body.classList.add('trade-body');
    body.append(el('h3', { text: T.routes }), el('ul', { class: 'routes' }, Object.keys(PARTNERS).map((id) => (isOpen(world, id) ? card(id, body) : closedRow(id)))));
    // A trading post no road joins to the trade entry: the one fix, with Show me (a road partner's card says the same in one line).
    if (open.some((id) => !byRiver(id)) && caravanBlocker(world) === 'not_connected') {
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
    // Where trade counts its stock: the trading post's stores for road routes, the Quay's for river ones (only those with a route open).
    const where = [];
    const post = tradePost(world), quay = activeQuay(world) || quays(world)[0] || null;
    if (post && open.some((id) => !byRiver(id))) where.push({ kind: 'post', b: post });
    if (quay && open.some(byRiver)) where.push({ kind: 'quay', b: quay });
    body.append(el('h3', { text: W.keepHead }), el('p', { class: 'small muted', text: W.keepHelp }), el('ul', { class: 'trade-goods' }, goods.map((g) => goodRow(g, where))));
  }
  return render;
}
