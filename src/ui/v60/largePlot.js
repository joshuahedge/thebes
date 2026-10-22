// Version 6.0, Track C: the interface of the Large plot. The seam (src/ui/s46/seam.js shape); Track C owns this file. The card, the bar and the sheet are the
// building tools' and the house sheet's own (src/ui/cards.js, placement.js, sheets.js); this seam only brings the two tips: the card (the first Townhouse unlocks it,
// said once at the month's end it has) and an empty lot's sheet ("Opens when": said the first time one opens).
import { seamBase } from '../s46/seam.js';
import { largePlotUnlocked, isLot } from '../../sim/largePlots.js';

export function createLargePlotUi(ctx) {
  const { world, store, fireTip } = ctx;
  const card = () => { if (largePlotUnlocked(world)) fireTip('largePlotCard'); };
  let seenSheet = store.get().sheet;
  const stop = store.subscribe((s) => {
    if (s.sheet !== seenSheet) {
      seenSheet = s.sheet;
      const b = s.sheet && s.sheet.kind === 'info' ? world.buildings[s.sheet.id] : null;
      if (b && isLot(b)) fireTip('largePlotSheet');
    }
  });
  return {
    ...seamBase(),
    onEvents(events) { if (events.some((e) => e.type === 'month')) card(); },
    refresh() { card(); },
    destroy() { stop(); },
  };
}
