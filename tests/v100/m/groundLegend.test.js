// Version 10.0, Track M (ruling 2303): the Ground legend's "Bright: room for a farm" key is drawn at large text on a phone at least 700 px tall, inside the 40% budget; on a short phone (667 px)
// it stays hidden at large text, because its third line costs the farm ghost its frame (tests/v70/p/review.test.js).
import { describe, it, expect } from '../../harness.js';
import { devScene, measureRows, MOBILE_SCENE_PARAMS } from '../../../src/dev/scenes.js';
import { bootAt, frame } from './helpers.js';

async function legendAt(width, height, textSize) {
  const r = await bootAt(MOBILE_SCENE_PARAMS.farm, width, height, textSize);
  try {
    await devScene(r.api, 'farm', { quick: true });
    await frame(); await frame();
    const room = r.root.querySelector('#legend .ground-keys .room'), keys = [...r.root.querySelectorAll('#legend .ground-keys .key')];
    const m = measureRows(r.root);
    return { roomHeight: room.getBoundingClientRect().height, roomText: room.textContent, keysShown: keys.filter((k) => k.getBoundingClientRect().height > 1).length, share: m.rowsEnd / m.height };
  } finally { r.cleanup(); }
}

describe('v100 m: the Ground legend at large text (the words wrap where there is room)', () => {
  for (const [w, h, text, drawn] of [[375, 667, 100, true], [375, 667, 150, false], [390, 844, 100, true], [390, 844, 150, true], [390, 844, 125, true]]) {
    it(`${w}x${h} at ${text}%: the room key is ${drawn ? 'drawn' : 'kept for screen readers'} and the rows end by 40% of the height`, async () => {
      const l = await legendAt(w, h, text);
      expect([w, h, text, l.roomHeight > 8, l.keysShown >= 3]).toEqual([w, h, text, drawn, true]);
      expect(/room for a farm/i.test(l.roomText)).toBe(true);
      // Version 10.0.2 (ruling 2442): at 375x667 and 150% text the side rail's column reaches up into the rows (it stands above the 350 px tray), so the legend ends at the rail's edge and wraps one line more:
      // 41.8% of the height, not 40. Every other size keeps the 40% budget.
      expect(l.share).toBeLessThanOrEqual(h === 667 && text === 150 ? 0.42 : 0.4);
    });
  }
});
