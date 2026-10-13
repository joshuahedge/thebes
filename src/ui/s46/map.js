// Stage 4.6, the Map track's interface seam (Track 0 made it empty; the Map track owns this file). createUI makes it once a game
// with the seam context (src/ui/danger.js lists ctx) through src/ui/s46/index.js, and calls it only through the seam's shape
// (src/ui/s46/seam.js): its sheets, its rows on building, home and summary sheets, and the event, refresh and alert-action hooks.
//
// What it does (rulings 331 and 350):
//  - Show me from a refused spot: the confirm bar's Show me (src/ui/confirmBar.js) raises 'thebes:show-fit'; this goes to the nearest place a
//    terrain or water building fits on the whole map, or, for a road that meets water it cannot bridge, the nearest crossing (bridgeSpot),
//    through createUI's showMeAt (the ghost lands there, the view follows it, the place pulses). With nowhere to go it says so in a toast.
//  - The bridge tip: the first time the road tool meets water (a refusal of water, too_wide or bridge_shape, or a preview that lays a
//    bridge, or a command that did) it fires 'roadMeetsWater' (MAP_TIPS), whose words are TIP_TEXT.bridges. The tip row carries a Show me to the
//    nearest crossing (bridgeSpot from the middle of the view) while that tip is showing: createUI gives a Show me to one tip only (the treasury's),
//    so the seam adds this one to the row when it renders (a MutationObserver on #tip), and does nothing on a map with no crossing.
import { seamBase } from './seam.js';
import { toolPreview, fitTarget } from '../placement.js';
import { bridgeSpot } from '../../sim/bridges.js';
import { S46_MAP_TEXT, TIP_TEXT, T, buildingName } from '../text.js';
import { button } from '../components.js';

const WATER_REFUSALS = ['water', 'too_wide', 'bridge_shape'];

export function createMapUi(ctx) {
  let off = [];
  const world = ctx.world;
  if (world && ctx.store) {
    // Show me from the confirm bar.
    const onShowFit = () => {
      const state = ctx.store.get();
      const target = fitTarget(world, state);
      if (!target) {
        ctx.toasts.show(state.tool && state.tool.kind === 'road' ? S46_MAP_TEXT.noBridge : S46_MAP_TEXT.noFit(`a ${buildingName(state.tool.type).toLowerCase()}`));
        return;
      }
      ctx.showMeAt({ category: target.kind === 'bridge' ? 'roads' : undefined, item: target.kind === 'bridge' ? 'road' : target.item, x: target.x, y: target.y });
    };
    const host = ctx.root || (ctx.doc && ctx.doc.body);
    if (host && host.addEventListener) { host.addEventListener('thebes:show-fit', onShowFit); off.push(() => host.removeEventListener('thebes:show-fit', onShowFit)); }
    // The tip: watched on the store, only while the road tool has a line or a plan to judge.
    let lastKey = '';
    const watch = () => {
      const s = ctx.store.get();
      if (!s.tool || s.tool.kind !== 'road' || s.tool.gate || !(s.line || s.plan)) { lastKey = ''; return; }
      const key = `${s.tool.kind}|${JSON.stringify(s.line)}|${JSON.stringify(s.plan)}`;
      if (key === lastKey) return;
      lastKey = key;
      const p = toolPreview(world, s);
      if ((p.state === 'bad' && WATER_REFUSALS.includes(p.reason)) || (p.bridges && p.bridges.length)) ctx.fireTip('roadMeetsWater');
    };
    if (ctx.store.subscribe) { const un = ctx.store.subscribe(watch); if (typeof un === 'function') off.push(un); }
    // The tip row's Show me.
    const tipHost = host && host.querySelector ? host.querySelector('#tip') : null;
    const addTipShowMe = () => {
      const row = tipHost.querySelector('.tip-row');
      if (!row || row.querySelector('.tip-show-me')) return;
      const words = row.querySelector('.text');
      if (!words || words.textContent !== TIP_TEXT.bridges) return;
      const c = ctx.cameraControl && ctx.cameraControl.centre ? ctx.cameraControl.centre() : world.focus;
      const spot = bridgeSpot(world, c);
      if (!spot) return;
      const go = button(T.showMe, { class: 'tip-show-me quiet', 'aria-label': `${T.showMe}: ${TIP_TEXT.bridges}`, onClick: () => {
        const got = row.querySelector('.got-it');
        if (got) got.click();                                                              // the tip closes, as the treasury tip's Show me does
        ctx.showMeAt({ category: 'roads', item: 'road', x: spot.x + 0.5, y: spot.y + 0.5 });
      } });
      row.insertBefore(go, row.querySelector('.got-it'));
    };
    if (tipHost && typeof MutationObserver === 'function') {
      const mo = new MutationObserver(addTipShowMe);
      mo.observe(tipHost, { childList: true });
      off.push(() => mo.disconnect());
      addTipShowMe();
    }
  }
  return {
    ...seamBase(),
    // A road command that laid a bridge: the tip too, for a road drawn some other way (the keyboard, a test).
    onCommand(e) {
      if (e && e.kind === 'road' && e.result && e.result.ok && e.result.bridges && e.result.bridges.length) ctx.fireTip('roadMeetsWater');
    },
    destroy() { for (const f of off) f(); off = []; },
  };
}
