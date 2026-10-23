// Version 7.0, Track T: the interface of trade and the Quay (rulings 870-899), the seam (src/ui/s46/seam.js shape) createV70Seams makes once a
// game. Track T owns this file and src/ui/tradeSheet.js.
//   sheets       trade: the Trade sheet (src/ui/tradeSheet.js) with the layout, so a phone gets the one-route-at-a-time accordion and the
//                desktop side panel every route (ruling 877); it takes the place of createUI's own 'trade' registration (the seams' sheets
//                come after it), so the trading post's Trade button and the trade route goal's Show me open this one
//   sheetParts   building: the Quay's lines (who lands here, the next boat or why none will come); actions: the Quay's Trade button;
//                summary: the Trade row (how many routes are open, and the button that opens the sheet), once a trading post or a Quay stands
// Arrival captions stay createUI's ('caravan' events through caravanText, which says "boat" for a river partner: Track T's text section).
import { seamBase } from '../s46/seam.js';
import { el, button } from '../components.js';
import { openSheet } from '../modes.js';
import { tradeSheet } from '../tradeSheet.js';
import { PARTNERS, QUAY_TYPE } from '../../data/trade.js';
import { activeQuay, quayBlocker, byRiver, monthsToNextArrival, openRoutes, partnerUnlocked } from '../../sim/trade.js';
import { allBuildings } from '../../sim/world.js';
import { T, partnerName, V70_TRADE_TEXT as W } from '../text.js';

const riverPartners = () => Object.keys(PARTNERS).filter(byRiver);

export function createTradeUi(ctx) {
  const base = seamBase();
  if (!ctx || !ctx.world) return base;                // no game (the contract's shape check): nothing to show
  const { world, store } = ctx;
  const open = (id = null) => store.set(openSheet(store.get(), 'trade', id));
  const trade = tradeSheet({
    world, afterCommand: ctx.afterCommand, onShowMe: ctx.showMeAt, toast: (text) => ctx.toasts.show(text), layout: () => store.get().layout,
  });

  // The Quay's own lines: the river routes that land here (or why none will), and when the next boat comes.
  function building(b) {
    if (b.type !== QUAY_TYPE) return [];
    const rivers = riverPartners();
    const landing = rivers.filter((id) => world.trade.routes[id]);
    const out = [];
    if (!landing.length) {
      const next = rivers.find((id) => !partnerUnlocked(world, id));
      out.push(el('p', { class: 'quay-line small', text: W.quayIdle(rivers) }));
      if (next && !rivers.some((id) => partnerUnlocked(world, id))) out.push(el('p', { class: 'quay-line small muted', text: W.quayOpensAt(next) }));
      return out;
    }
    const block = quayBlocker(world);
    const here = activeQuay(world);
    if (block) out.push(el('p', { class: 'quay-line small coral', text: W.noBoat[block] }));
    else if (here && here.id !== b.id) out.push(el('p', { class: 'quay-line small muted', text: W.quayNotActive }));
    else out.push(el('p', { class: 'quay-line small', text: `${W.quayLands(landing.map(partnerName))}. ${W.nextIn(landing[0], monthsToNextArrival(world))}.` }));
    return out;
  }
  const actions = (b) => (b.type === QUAY_TYPE ? [button(T.trade, { class: 'trade primary', onClick: () => open(b.id) })] : []);
  // The summary's Trade row: from the first trading post or Quay.
  function summary() {
    if (!allBuildings(world).some((b) => b.type === 'trading_post' || b.type === QUAY_TYPE)) return [];
    const n = openRoutes(world);
    return [
      el('h3', { text: W.summaryHead, dataset: { section: 'trade' } }),
      el('div', { class: 'row trade-row' }, [
        el('span', { text: W.summaryRow(n) }),
        button(W.openTrade, { class: 'open-trade', 'aria-label': `${W.openTrade}: ${W.summaryRow(n)}`, onClick: () => open() }),
      ]),
    ];
  }
  return { ...base, sheets: { trade }, sheetParts: { ...base.sheetParts, building, actions, summary } };
}
