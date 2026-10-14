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
//    nearest crossing (bridgeSpot from the tile under the middle of the view, worked out when it is pressed) while that tip is showing: createUI gives a Show me to one tip only (the treasury's),
//    so the seam adds this one to the row when it renders (a MutationObserver on #tip), and does nothing on a map with no crossing.
import { seamBase } from './seam.js';
import { toolPreview, fitTarget } from '../placement.js';
import { bridgeSpot } from '../../sim/bridges.js';
import { builtNearOasis } from '../../sim/oases.js';
import { S46_MAP_TEXT, TIP_TEXT, T, buildingName } from '../text.js';
import { button } from '../components.js';
import { isCut, writeMore } from '../expand.js';

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
    // The tip row's Show me. The place is worked out when the button is pressed, from the tile under the middle of the view (the
    // camera's centreTile), else the pick's ghost, else the city's focus: bridgeSpot takes a point on the map, not a pixel.
    const tipHost = host && host.querySelector ? host.querySelector('#tip') : null;
    const viewTile = () => {
      const cc = ctx.cameraControl;
      if (cc && typeof cc.centreTile === 'function') return cc.centreTile();
      const g = ctx.store.get().ghost;
      return g ? { x: g.x, y: g.y } : world.focus;
    };
    // The row is measured (More or no More) before this button is added, and the button narrows the words: measure again, the way tips.js does.
    const remeasure = (row) => {
      const words = row.querySelector('.text'), more = row.querySelector('.more');
      if (!words || !more) return;
      more.hidden = true;
      const open = row.classList.contains('open'), cut = !open && isCut(words);
      if (cut || open) { writeMore(more, open); more.hidden = false; }
    };
    const addTipShowMe = () => {
      const row = tipHost.querySelector('.tip-row');
      if (!row || row.querySelector('.tip-show-me')) return;
      const words = row.querySelector('.text');
      if (!words || words.textContent !== TIP_TEXT.bridges) return;
      if (!bridgeSpot(world, viewTile())) return;                                          // no crossing anywhere: the tip says its words and no more
      const go = button(T.showMe, { class: 'tip-show-me quiet', 'aria-label': `${T.showMe}: ${TIP_TEXT.bridges}`, onClick: () => {
        const spot = bridgeSpot(world, viewTile());                                        // the crossing nearest where the player is looking now
        const got = row.querySelector('.got-it');
        if (got) got.click();                                                              // the tip closes, as the treasury tip's Show me does
        if (spot) ctx.showMeAt({ category: 'roads', item: 'road', x: spot.x + 0.5, y: spot.y + 0.5 });
      } });
      row.insertBefore(go, row.querySelector('.got-it'));
      remeasure(row);
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
    // Stage 4.7 (Task 2): the first building within reach of an oasis fires the oasis tip (the first itself is the sim's, src/sim/firsts.js).
    onCommand(e) {
      if (e && e.kind === 'road' && e.result && e.result.ok && e.result.bridges && e.result.bridges.length) ctx.fireTip('roadMeetsWater');
      // a building, or the plots and plazas of one drawing (houses and plazas come back as a list of ids), as the sim's own tally counts them
      const ids = e && e.result && e.result.ok && ctx.world ? (e.kind === 'building' ? [e.result.id] : e.kind === 'houses' || e.kind === 'plazas' ? e.result.ids || [] : []) : [];
      if (ids.some((id) => ctx.world.buildings[id] && builtNearOasis(ctx.world, ctx.world.buildings[id]))) ctx.fireTip('oasisBuilt');
    },
    destroy() { for (const f of off) f(); off = []; },
  };
}
