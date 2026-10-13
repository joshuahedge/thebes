// Stage 4.6, the Wonders track's interface seam (rulings 342-343). createUI makes it once a game with the seam context (src/ui/danger.js lists
// ctx) through src/ui/s46/index.js, and calls it only through the seam's shape (src/ui/s46/seam.js). It gives:
//   - the style picker's choices for the placing bar (styleChoices: each style's name and its exact consequence, from MONUMENT_STYLES and the
//     sim's own price), which confirmBar.js draws through placement.styleChoices();
//   - a "Style: ..." row on a monument's sheet (sheetParts.building), for a monument founded in a style (a classic one says nothing);
//   - the tips: one for each new kind when its card unlocks, and the styles' once the first monument has been founded.
import { seamBase } from './seam.js';
import { PICKABLE_STYLES, MONUMENT_STYLES, NEW_MONUMENT_KINDS } from '../../data/wonders.js';
import { costOf } from '../../sim/costs.js';
import { isUnlocked } from '../../sim/progression.js';
import { isMonument } from '../../sim/world.js';
import { el } from '../components.js';
import { S46_WONDER_TEXT } from '../text.js';

// The picker's choices for a monument `type` with `current` in force: [{ id, name, active, line }], in the data's order. line is the style's
// consequence in words (its price here included), so the bar says what the tap does before it is made.
export function styleChoices(world, type, current) {
  return PICKABLE_STYLES.map((id) => ({ id, name: S46_WONDER_TEXT.styleNames[id], active: id === current, line: S46_WONDER_TEXT.styleLine(id, costOf(world, type, { style: id })) }));
}

// A monument's style row in words, or '' (a classic monument, or anything that is not one).
export function styleRowText(world, b) {
  if (!isMonument(b) || !MONUMENT_STYLES[b.style] || b.style === 'classic') return '';
  return S46_WONDER_TEXT.styleRow(b.style, costOf(world, b.type, { style: b.style }));
}

export function createWondersUi(ctx) {
  const { world } = ctx;
  const base = seamBase();
  return {
    ...base,
    sheetParts: {
      ...base.sheetParts,
      building: (b) => {
        const text = styleRowText(world, b);
        return text ? [el('p', { class: 'work-status style-row-text', text })] : [];
      },
    },
    // Each new kind's tip, once, the first time its card is unlocked (the tips keep it to once a device).
    refresh() {
      if (!world || typeof ctx.fireTip !== 'function') return;
      for (const type of NEW_MONUMENT_KINDS) if (isUnlocked(world, type)) ctx.fireTip(`${type}Unlocked`);
    },
    // The styles' tip, once the first monument has been founded (a tip fired while a tool is active waits for it to end).
    onCommand(e) {
      if (e && e.kind === 'building' && e.result && e.result.ok && typeof ctx.fireTip === 'function') {
        const b = world.buildings[e.result.id];
        if (b && isMonument(b)) ctx.fireTip('monumentFounded');
      }
    },
  };
}
