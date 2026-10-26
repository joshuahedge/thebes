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
import { T as T47 } from '../../sim/terrain.js';
import { S46_MAP_TEXT, TIP_TEXT, T, buildingName } from '../text.js';
import { button } from '../components.js';
import { isCut, writeMore } from '../expand.js';
import { FERRY_TEXT } from '../v71/ferryText.js';
import { riverless } from '../v82/oasisText.js';

const WATER_REFUSALS = ['water', 'too_wide', 'bridge_shape'];
const ROUTE_TIP_REFUSALS = ['blocked', 'hills', 'water', 'too_wide', 'bridge_shape'];

export function createMapUi(ctx) {
  let off = [];
  const world = ctx.world;
  if (world && ctx.store) {
    // Show me from the confirm bar.
    const onShowFit = () => {
      const state = ctx.store.get();
      const target = fitTarget(world, state);
      if (!target) {
        const ferryTool = state.tool && state.tool.kind === 'ferry';   // Version 7.1 (Track F): the Ferry tool's, or a road's too-wide refusal, has no crossing to show
        const tooWide = !riverless(world) && state.tool && state.tool.kind === 'road' && toolPreview(world, state).reason === 'too_wide';   // Version 8.2 (ruling 1333): no ferry words with no river
        ctx.toasts.show(ferryTool || tooWide ? FERRY_TEXT.noFit : state.tool && state.tool.kind === 'road' ? S46_MAP_TEXT.noBridge : S46_MAP_TEXT.noFit(`a ${buildingName(state.tool.type).toLowerCase()}`));
        return;
      }
      ctx.showMeAt({ category: target.kind === 'building' ? undefined : 'roads', item: target.kind === 'building' ? target.item : target.kind === 'ferry' ? 'ferry' : 'road', x: target.x, y: target.y });   // a bridge's place, a ferry's (Version 7.1, Track F), or (Version 5.0, Task 5) the spot a routed road is blocked at
    };
    const host = ctx.root || (ctx.doc && ctx.doc.body);
    if (host && host.addEventListener) { host.addEventListener('thebes:show-fit', onShowFit); off.push(() => host.removeEventListener('thebes:show-fit', onShowFit)); }
    // The tip: watched on the store, only while the road tool has a line or a plan to judge.
    // Stage 4.7 (ruling 464): the hills tip too, the first time a building's ghost or a road's line is refused for hills (on a map that has any).
    let lastKey = '';
    const hasHills = world.terrain.includes(T47.HILLS);
    const watch = () => {
      const s = ctx.store.get();
      const road = s.tool && s.tool.kind === 'road' && !s.tool.gate && (s.line || s.plan), ghost = hasHills && s.tool && s.tool.kind === 'building' && s.ghost;
      if (!road && !ghost) { lastKey = ''; return; }
      const key = road ? `${s.tool.kind}|${JSON.stringify(s.line)}|${JSON.stringify(s.plan)}` : `${s.tool.type}|${s.ghost.x},${s.ghost.y}|${s.rot || 0}`;
      if (key === lastKey) return;
      lastKey = key;
      const p = toolPreview(world, s);
      // Version 7.1 (Track F, ruling 1083): a too-wide refusal fires the ferries tip first, so the bridges tip does not take the 3-minute slot ahead of it
      if (road && p.state === 'bad' && p.reason === 'too_wide' && !riverless(world)) ctx.fireTip('roadTooWide');   // Version 8.2 (ruling 1333): the ferries tip is for maps with a river
      if (road && ((p.state === 'bad' && WATER_REFUSALS.includes(p.reason)) || (p.bridges && p.bridges.length))) ctx.fireTip('roadMeetsWater');
      if (hasHills && p.state === 'bad' && p.reason === 'hills') ctx.fireTip('hillsMet');
      if (road && !s.tool.route && p.state === 'bad' && ROUTE_TIP_REFUSALS.includes(p.reason)) ctx.fireTip('roadRoute');   // Version 5.0 (Task 5): the straight road met something Route goes round
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
      const ids = e && e.result && e.result.ok && ctx.world ? (e.kind === 'building' ? [e.result.id] : e.kind === 'houses' || e.kind === 'plazas' || e.kind === 'areas' ? e.result.ids || [] : []) : [];
      if (ids.some((id) => ctx.world.buildings[id] && builtNearOasis(ctx.world, ctx.world.buildings[id]))) ctx.fireTip('oasisBuilt');
    },
    destroy() { for (const f of off) f(); off = []; },
  };
}
