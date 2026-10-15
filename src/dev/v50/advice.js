// Version 5.0 Task 1: the dev scene for City advice (src/dev/v50/index.js joins it). Opens the seed-11 sample city (a Capital with a food shortfall, homes
// short of a garden, a bazaar, a temple and police, jobless workers) with the City advice sheet open over it, the treasury at 300 gold (options.gold: -470 goes deep enough into debt that the
// dearest fixes are marked as more than it can pay). options: seed (11), variant ('classic'), size (64), gold (300), sheet (true; false leaves the sheet shut, to
// see the top bar), dot (true: the dot shows, nothing has been seen; false: the sheet's items are marked seen), quick (no settling wait: the mobile budget test).
import { buildSampleCity } from '../sampleCity.js';
import { setGuide } from '../../sim/commands.js';
import { cityAdvice } from '../../sim/advice.js';
import { ADVICE } from '../../data/advice.js';
import { openSheet } from '../../ui/modes.js';
import { wait, inGame } from '../s46/base.js';

export const adviceScene = async (api, options = {}) => {
  inGame(api, 'v50-advice');
  const o = { seed: 11, variant: 'classic', size: 64, gold: 300, sheet: true, dot: true, ...options };
  const world = api.freshWorld({ seed: o.seed, variant: o.variant, size: o.size });
  buildSampleCity(world);
  setGuide(world, false);
  world.gold = o.gold;
  api.startGame(world, { saveNow: false });
  const g = api.game();
  const top = cityAdvice(world).slice(0, ADVICE.top);
  g.ui.settings.set({ adviceSeen: o.dot ? [] : top.map((a) => a.key) });
  g.ui.refresh();
  if (o.sheet) g.ui.store.set(openSheet(g.ui.store.get(), 'advice'));
  if (!o.quick) await wait(400);
  g.ui.refresh();
  return `v50-advice: ${o.variant} ${world.size} seed ${o.seed}, gold ${world.gold}, ${top.length} shown (${top.map((a) => a.kind).join(', ')}), ${o.sheet ? 'sheet open' : 'sheet shut'}, ${o.dot ? 'dot on' : 'dot off'}`;
};
