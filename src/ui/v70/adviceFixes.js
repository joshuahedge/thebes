// Version 7.0, Track A (wave 2): the interface of the Advice fixes and the words for trade and events (rulings 960-974), the seam (src/ui/s46/seam.js
// shape) createV70Seams makes once a game.
//   onCommand   the tips: the first Quay placed ('quayPlaced') and the first trade route opened ('routeOpened'), each a tip held until a tool or a phone's sheet is done
//   root click  the Keep at least item's View opens the Trade sheet itself, not the summary (a click taken at the root, as the event item's is: Track E's seam)
// Everything else of the fixes is src/sim/adviceFixes.js and the words (src/ui/text.js, Track A's section): a tower's or a store's Show me is City advice's own.
import { seamBase } from '../s46/seam.js';
import { openSheet } from '../modes.js';
import { QUAY_TYPE } from '../../data/trade.js';

export function createAdviceFixUi(ctx) {
  const base = seamBase();
  if (!ctx || !ctx.world) return base;               // no game (the contract's shape check): nothing to do
  const fire = (trigger) => { if (typeof ctx.fireTip === 'function') ctx.fireTip(trigger); };
  const open = () => ctx.store.set(openSheet(ctx.store.get(), 'trade'));

  function onCommand(e) {
    if (!e) return;
    const tool = ctx.store.get().tool;
    if (e.undoable && e.kind === 'building' && tool && tool.type === QUAY_TYPE) fire('quayPlaced');
    if (e.kind === 'route' && e.result && e.result.ok) fire('routeOpened');
  }

  const onClick = (ev) => {
    const t = ev.target && ev.target.closest ? ev.target.closest('button') : null;
    if (t && t.closest('.advice-item[data-kind="trade_floor"]')) { ev.stopPropagation(); open(); }
  };
  if (ctx.root && ctx.root.addEventListener) ctx.root.addEventListener('click', onClick, true);

  return { ...base, onCommand, destroy() { if (ctx.root && ctx.root.removeEventListener) ctx.root.removeEventListener('click', onClick, true); } };
}
