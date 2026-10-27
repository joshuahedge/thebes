// Version 8.2 integration (ruling 1338): What's new for 8.2 says the Oasis, the map preview and the fixes in the game's own words; 8.1's entry keeps its merge commit and its
// history (its build groups did show More then).
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { hasRiver, MAP_VARIANTS_OFFERED } from '../../../src/data/map.js';
import { LAYOUT_NAMES } from '../../../src/ui/v71/mapsText.js';
import { PREVIEW_TEXT } from '../../../src/ui/v82/oasisText.js';
import { shownItems } from '../../../src/ui/cards.js';
import { createWorld } from '../../../src/sim/world.js';

describe('v82 i release: What\'s new for 8.2', () => {
  it('names the Oasis and the preview as the game does, and lists the fixes', () => {
    const r = RELEASES[2], text = [...r.new, ...r.fixed].join(' ');
    expect([APP_VERSION, r.version, r.build, RELEASES[3].version, RELEASES[3].build]).toEqual(['8.3', '8.2', 'c4bff18', '8.1', 'ad57f92']);   // Version 8.3: two newer entries
    expect([LAYOUT_NAMES['great-oasis'], MAP_VARIANTS_OFFERED.includes('great-oasis'), hasRiver('great-oasis'), text.includes(`the ${LAYOUT_NAMES['great-oasis']}, with no river`)]).toEqual(['Oasis', true, false, true]);
    expect([text.includes(`Press ${PREVIEW_TEXT.another}`), shownItems(createWorld({ seed: 3, mapVariant: 'great-oasis' }), 'roads').includes('ferry')]).toEqual([true, false]);
    for (const words of ['caravan', 'New city in the game\'s menu', 'wide, readable panel', 'what the raiders are after', 'no More button', 'first road in view']) expect([words, text.includes(words)]).toEqual([words, true]);
    expect(RELEASES[3].new.some((l) => l.includes('with More for the rest'))).toBe(true);   // 8.1's history stands as it was
  });
});
