// Version 7.1, Track F: the interface of a ferry landing's sheet (rulings 1040-1059), a seam (src/ui/s46/seam.js shape) createUI adds to the tracks' once a game.
//   sheetParts   building: where this landing's crossing goes and how long it takes as walkers and carts count it, or the sheet's own reason it is not
//                running (the sim's landingBlocker: the other landing gone, no road, paused, burning, no ferryman, or the same of the landing across);
//                actions: a button that shows the other landing on the map
// The words are src/ui/v71/ferryText.js, every number the sim's (src/sim/ferries.js ferryInfo).
import { seamBase } from '../s46/seam.js';
import { el, button } from '../components.js';
import { FERRY_LANDING, ferryInfo, landingBlocker } from '../../sim/ferries.js';
import { compass } from '../../sim/carts.js';
import { FERRY_TEXT } from './ferryText.js';

export function createFerryUi(ctx) {
  const base = seamBase();
  if (!ctx || !ctx.world) return base;
  const { world } = ctx;
  function building(b) {
    if (b.type !== FERRY_LANDING) return [];
    const info = ferryInfo(world, b);
    if (!info) return [];
    const why = landingBlocker(world, b);
    const out = [];
    if (info.mate) out.push(el('p', { class: 'ferry-line small', text: FERRY_TEXT.sheet.across(info.water, info.dx, info.dy, compass) }));
    out.push(why
      ? el('p', { class: 'ferry-line ferry-stopped small coral', text: FERRY_TEXT.sheet.stopped(FERRY_TEXT.sheet.why[why]) })
      : el('p', { class: 'ferry-line ferry-runs small teal', text: FERRY_TEXT.sheet.runs(info.tiles) }));
    return out;
  }
  function actions(b) {
    if (b.type !== FERRY_LANDING) return [];
    const info = ferryInfo(world, b);
    if (!info || !info.mate) return [];
    const m = info.mate;
    return [button(FERRY_TEXT.sheet.other, { class: 'ferry-other quiet', 'aria-label': FERRY_TEXT.sheet.otherLabel, onClick: () => { if (ctx.cameraControl) ctx.cameraControl.panTo(m.x + 0.5, m.y + 0.5); } })];
  }
  return { ...base, sheetParts: { ...base.sheetParts, building, actions } };
}
