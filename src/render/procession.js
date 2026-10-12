// The festival temple's streamers (spec 5.7 item 3), Track E: a tall painted pole at each of a festival temple's two
// front corners with three pennants, drawn as walker slots so they sort in depth with the temple (src/render/walkers.js
// places them): fig.streamer hangs still; fig.streamer2 is the same blown out the other way (the flutter, Full only).
// The procession's figures themselves (priest, musician, dancer, shrine) are Track B's (src/render/art/figures.js).
// Contract note (Track E): the streamers are art, which the ownership table gives to Track B; Track E draws them here and
// adds each slot to the registry only when the registry has none of that name, so a drawing of B's wins.
import { ART } from './art/registry.js';
import { p, U } from './art/primitives.js';
import { SHADOW, GOLD, TEAL, RED, ORANGE, WOOD } from './art/palette.js';

// A streamer pole at tile point (gx, gy): a tall painted pole with three pennants, hanging one way (step 0) or blown
// out the other (step 1).
const PENNANTS = [RED, TEAL, GOLD];
export function streamer(g, gx, gy, step = 0) {
  const [X, Y] = U(p(gx, gy), 0);
  g.ell([X, Y], 1.6, 0.6, SHADOW, { alpha: 0.25 });
  g.line([X, Y], [X, Y - 38], WOOD, 1.1);
  for (let i = 0; i < 3; i++) g.line([X - 0.5, Y - 8 - i * 9], [X + 0.5, Y - 8 - i * 9], ORANGE, 0.7);   // painted bands
  g.circ([X, Y - 38.6], 1, GOLD);
  PENNANTS.forEach((c, i) => {
    const top = Y - 37 + i * 4.2, len = 9 - i * 1.2, sag = step ? -1.6 : 1.4;
    g.path([['M', [X + 0.5, top]], ['Q', [X + len * 0.55, top + sag], [X + len, top + 1.2 + sag]], ['L', [X + 0.5, top + 3]], ['Z']], c, { outline: true });
  });
}

const slot = (draw) => ({ w: 0, d: 0, height: 40, bounds: [-6, -46, 14, 4], shadows: [], draw });
export const STREAMER_ART = {
  'fig.streamer': slot((g, x, y) => streamer(g, x, y, 0)),
  'fig.streamer2': slot((g, x, y) => streamer(g, x, y, 1)),
};
// Registered when the walkers first load; a slot the registry already has (Track B's) is kept.
for (const [name, def] of Object.entries(STREAMER_ART)) if (!(name in ART)) ART[name] = def;
