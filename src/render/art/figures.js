// Small people, ported from the mock-up's fig(). Walkers (walkers.js) pick a kind per service; the hauler
// carries a mud brick for the work gang that raises a new building (early-game pass 2.4) and, in Stage 4,
// the monument crews; the firefighter (Stage 3) walks the firehouse's reach with a leather bucket. Stage 4 (Track B)
// adds the mason (a mallet on his shoulder), and for the festival and dedication processions (spec 5.7, Track E's
// walkers) the musician (a harp), the dancer (arms raised, a red sash) and the shrine (two priests carrying a gilded
// shrine on poles; art-direction review 10: the bearers a fifth bigger than a walker, the shrine gold in a lapis frame),
// the standard (the priest who leads a procession, holding a pole half again a walker's height topped by a gold disc and
// two streamers, so the eye finds a festival in a crowd), and gang(): the monument gangs, many small figures in a handful of draws. Raiders and
// soldiers (Stage 3, spec 5.4) are drawn UNIT_SCALE times a citizen's size and told apart by shape: a raider is a dark
// silhouette with a crested helmet and a round shield; a soldier wears a white kilt and carries a tall spear and a tall,
// round-topped teal shield.
import { p, U } from './primitives.js';
import { SHADOW, TEAL, TEAL_DARK, BLUE, GOLD, ORANGE, WOOD, MUD, RED, STONE } from './palette.js';

export const FIGURE_KINDS = ['citizen', 'woman', 'water', 'porter', 'priest', 'farmer', 'noble', 'fisher', 'hauler', 'firefighter', 'mason', 'musician', 'dancer', 'shrine', 'standard'];
export const UNIT_KINDS = ['raider', 'soldier'];
export const UNIT_SCALE = 1.5;

// A small mud brick in the art's iso shading (lit left face, shaded right face, pale top), its bottom front
// corner at (cx, by).
function brick(g, cx, by, s) {
  const r = 2.6 * s, h = 1.8 * s, k = r * 0.5;
  g.poly([[cx - r, by - k], [cx, by], [cx, by - h], [cx - r, by - k - h]], MUD[1], { outline: true });
  g.poly([[cx, by], [cx + r, by - k], [cx + r, by - k - h], [cx, by - h]], MUD[2], { outline: true });
  g.poly([[cx - r, by - k - h], [cx, by - h], [cx + r, by - k - h], [cx, by - 2 * k - h]], MUD[0], { outline: true });
}

export function fig(g, gx, gy, kind, z = 0, sc = 1) {
  if (kind === 'shrine') { shrine(g, gx, gy, z, sc); return; }
  if (kind === 'standard') { standard(g, gx, gy, z, sc); return; }
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc, sk = '#A0663F', hair = '#1E150E';
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.25 });
  const long = kind === 'woman' || kind === 'priest' || kind === 'dancer';
  const cl = kind === 'priest' ? '#FFFFFF' : '#F7F2E8';
  if (!long) {
    g.line([X - 0.9 * s, Y], [X - 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
    g.line([X + 0.9 * s, Y], [X + 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
    g.poly([[X - 1.9 * s, Y - 2.8 * s], [X + 1.9 * s, Y - 2.8 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], cl);
    g.line([X - 1.5 * s, Y - 5.4 * s], [X + 1.5 * s, Y - 5.4 * s], kind === 'noble' ? GOLD : TEAL, 0.7 * s);
    g.poly([[X - 1.5 * s, Y - 5.6 * s], [X + 1.5 * s, Y - 5.6 * s], [X + 1.7 * s, Y - 8.7 * s], [X - 1.7 * s, Y - 8.7 * s]], sk);
  } else {
    g.poly([[X - 2 * s, Y], [X + 2 * s, Y], [X + 1.6 * s, Y - 8.7 * s], [X - 1.6 * s, Y - 8.7 * s]], cl, { outline: true });
  }
  const hand = kind === 'hauler' || kind === 'dancer' ? -13.2 : -5;   // a hauler holds both arms up to the brick on its head; a dancer raises hers
  g.line([X - 1.8 * s, Y - 8.4 * s], [X - 2.4 * s, Y + hand * s], sk, 0.9 * s);
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 2.4 * s, Y + hand * s], sk, 0.9 * s);
  const collar = { noble: GOLD, woman: TEAL, firefighter: RED, dancer: GOLD, musician: TEAL }[kind] || BLUE;
  g.line([X - 1.5 * s, Y - 8.5 * s], [X + 1.5 * s, Y - 8.5 * s], collar, 1 * s);
  if (kind === 'priest') g.line([X - 1.6 * s, Y - 8.2 * s], [X + 1.4 * s, Y - 5.5 * s], ORANGE, 1 * s);
  if (kind === 'woman' || kind === 'dancer') g.ell([X - 0.5 * s, Y - 9.6 * s], 1.7 * s, 2.4 * s, hair);
  if (kind === 'dancer') g.line([X - 1.8 * s, Y - 5.2 * s], [X + 1.8 * s, Y - 4.4 * s], RED, 1 * s);   // her sash
  if (kind === 'mason') {                                                       // the mallet on his shoulder
    g.line([X + 1.6 * s, Y - 8 * s], [X + 3.6 * s, Y - 12.4 * s], WOOD, 0.7 * s);
    g.poly([[X + 2.6 * s, Y - 13.4 * s], [X + 4.8 * s, Y - 12.6 * s], [X + 4.4 * s, Y - 11.2 * s], [X + 2.2 * s, Y - 12 * s]], '#B08A5A', { outline: true });
  }
  if (kind === 'musician') {                                                    // a harp held before him
    g.stroke([['M', [X + 1.6 * s, Y - 3 * s]], ['Q', [X + 5.4 * s, Y - 8 * s], [X + 2.2 * s, Y - 12.6 * s]]], WOOD, 0.9 * s);
    for (const k of [0.3, 0.55, 0.8]) g.line([X + (1.6 + 0.6 * k) * s, Y - (3 + 9.6 * k) * s], [X + (1.6 + 3 * k) * s, Y - 3 * s], '#EDE6D2', 0.3 * s, 0.9);
  }
  if (kind !== 'priest') g.circ([X - 0.2 * s, Y - 10.8 * s], 1.75 * s, hair);
  g.circ([X + 0.25 * s, Y - 10.3 * s], 1.4 * s, sk);
  if (kind === 'water') g.ell([X + 2.4 * s, Y - 9.4 * s], 1.5 * s, 1.8 * s, '#C9552F', { outline: true });
  if (kind === 'porter') g.ell([X, Y - 12.8 * s], 2.6 * s, 1.2 * s, '#D9B060', { outline: true });
  if (kind === 'farmer') g.line([X + 2.4 * s, Y - 5 * s], [X + 5 * s, Y + 0.8 * s], WOOD, 0.8 * s);
  if (kind === 'hauler') brick(g, X + 0.2 * s, Y - 12.4 * s, s);
  if (kind === 'firefighter') {                                   // a leather bucket of water in the right hand
    g.poly([[X + 1.2 * s, Y - 5.4 * s], [X + 3.8 * s, Y - 5.4 * s], [X + 3.4 * s, Y - 2.2 * s], [X + 1.6 * s, Y - 2.2 * s]], '#8A4A2A', { outline: true });
    g.ell([X + 2.5 * s, Y - 5.4 * s], 1.3 * s, 0.45 * s, '#4FB3B5');
  }
  if (kind === 'fisher') {
    g.line([X + 2.4 * s, Y - 6 * s], [X + 10 * s, Y - 15 * s], WOOD, 0.6);
    g.line([X + 10 * s, Y - 15 * s], [X + 12 * s, Y + 2 * s], '#EDE6D2', 0.3);
  }
}

// The shrine of a procession: two priests a fifth bigger than a walker carrying a gilded shrine in a lapis frame on two
// poles between them.
const LAPIS = '#2C4F9E', LAPIS_DARK = '#203C7A';
function shrine(g, gx, gy, z = 0, sc = 1) {
  const s = sc * 1.2;
  fig(g, gx - 0.12, gy + 0.12, 'priest', z, s * 0.9);
  const c = U(p(gx, gy), z), X = c[0], Y = c[1];
  g.line([X - 7 * s, Y - 7.4 * s], [X + 7 * s, Y - 9.4 * s], WOOD, 0.8 * s);
  g.poly([[X - 4.2 * s, Y - 9 * s], [X + 4.2 * s, Y - 10.2 * s], [X + 4.2 * s, Y - 16.6 * s], [X - 4.2 * s, Y - 15.4 * s]], LAPIS, { outline: true });   // the frame
  g.poly([[X - 3.2 * s, Y - 9.8 * s], [X + 3.2 * s, Y - 10.7 * s], [X + 3.2 * s, Y - 15.6 * s], [X - 3.2 * s, Y - 14.7 * s]], GOLD);
  g.poly([[X - 4.4 * s, Y - 15.4 * s], [X + 4.4 * s, Y - 16.6 * s], [X + 2.8 * s, Y - 18.8 * s], [X - 2.8 * s, Y - 17.8 * s]], '#F6D46A', { outline: true });
  g.line([X - 4.4 * s, Y - 15.4 * s], [X + 4.4 * s, Y - 16.6 * s], LAPIS_DARK, 0.6 * s);
  g.poly([[X - 1.2 * s, Y - 10.6 * s], [X + 1.2 * s, Y - 11 * s], [X + 1.2 * s, Y - 14.2 * s], [X - 1.2 * s, Y - 13.8 * s]], TEAL);
  fig(g, gx + 0.12, gy - 0.12, 'priest', z, s * 0.9);
}

// The procession's standard: a priest holding up a pole half again a walker's height, a gold disc at its top in a thin
// dark rim and two streamers, red and teal, hanging from under it.
function standard(g, gx, gy, z = 0, sc = 1) {
  const s = sc;
  fig(g, gx, gy, 'priest', z, s);
  const c = U(p(gx, gy), z), X = c[0] + 2.4 * s, Y = c[1], top = Y - 20 * s;
  g.line([X, Y - 1 * s], [X, top], WOOD, 0.9 * s);
  g.path([['M', [X + 0.3 * s, top + 3.4 * s]], ['Q', [X + 3 * s, top + 5 * s], [X + 4.4 * s, top + 9.4 * s]], ['L', [X + 0.3 * s, top + 6 * s]], ['Z']], RED, { outline: true });
  g.path([['M', [X - 0.3 * s, top + 3.4 * s]], ['Q', [X - 3 * s, top + 5 * s], [X - 4.2 * s, top + 9 * s]], ['L', [X - 0.3 * s, top + 6 * s]], ['Z']], TEAL, { outline: true });
  g.circ([X, top], 2.3 * s, GOLD, { stroke: '#8A6526', strokeWidth: 0.5 * s });
  g.circ([X - 0.6 * s, top - 0.6 * s], 0.8 * s, '#FFF4C8');
}

// A monument's gang (spec 5.7, rulings 182, 246): many small working figures in one go, each { q: [ax, ay] (its feet,
// art px), s (its scale), pose: 'pull' (leaning, arms forward to a rope) | 'mallet' (a mason, his mallet at `swing` 0..1)
// | 'rest' (standing by, arms down) }. Drawn as a few batched paths (shadows, legs, kilts, bodies, collars, arms, heads),
// so a site's dozen or more figures cost about what one walker does. Pass them back to front.
const SKIN = '#A0663F', HAIR = '#1E150E', KILT = '#F7F2E8';
export function gang(g, people) {
  if (!people.length) return;
  const shadows = [], legs = [], kilts = [], bodies = [], collars = [], arms = [], heads = [], mallets = [];
  for (const { q, s, pose = 'rest', swing = 0 } of people) {
    const [X, Y] = q, lean = pose === 'pull' ? 1.6 * s : 0;
    shadows.push([[X - 2.6 * s, Y], [X, Y - 1 * s], [X + 2.6 * s, Y], [X, Y + 1 * s]]);
    legs.push(['M', [X - 0.8 * s, Y]], ['L', [X - 0.8 * s + lean * 0.3, Y - 3.2 * s]], ['M', [X + 0.8 * s, Y]], ['L', [X + 0.8 * s + lean * 0.3, Y - 3.2 * s]]);
    kilts.push([[X - 1.8 * s + lean * 0.3, Y - 2.6 * s], [X + 1.8 * s + lean * 0.3, Y - 2.6 * s], [X + 1.4 * s + lean * 0.5, Y - 5.4 * s], [X - 1.4 * s + lean * 0.5, Y - 5.4 * s]]);
    bodies.push([[X - 1.4 * s + lean * 0.5, Y - 5.3 * s], [X + 1.4 * s + lean * 0.5, Y - 5.3 * s], [X + 1.6 * s + lean, Y - 8.2 * s], [X - 1.6 * s + lean, Y - 8.2 * s]]);
    collars.push(['M', [X - 1.4 * s + lean, Y - 8 * s]], ['L', [X + 1.4 * s + lean, Y - 8 * s]]);
    const hx = X + lean * 1.1, hy = Y - 9.8 * s;
    heads.push([[hx - 1.4 * s, hy], [hx - 1 * s, hy - 1.3 * s], [hx + 1 * s, hy - 1.3 * s], [hx + 1.4 * s, hy], [hx + 1 * s, hy + 1.3 * s], [hx - 1 * s, hy + 1.3 * s]]);
    if (pose === 'pull') arms.push(['M', [X + lean, Y - 7.6 * s]], ['L', [X + lean + 3.4 * s, Y - 5.6 * s]]);
    else if (pose === 'mallet') {
      const a = -0.9 + 1.5 * swing, hand = [X + 1.6 * s + Math.cos(a) * 2.4 * s, Y - 7.8 * s - Math.sin(a) * 2.4 * s];
      arms.push(['M', [X + 1.2 * s, Y - 7.6 * s]], ['L', hand]);
      mallets.push(['M', hand], ['L', [hand[0] + Math.cos(a + 0.6) * 3 * s, hand[1] - Math.sin(a + 0.6) * 3 * s]]);
    } else arms.push(['M', [X - 1.6 * s, Y - 7.8 * s]], ['L', [X - 2 * s, Y - 4.6 * s]], ['M', [X + 1.6 * s, Y - 7.8 * s]], ['L', [X + 2 * s, Y - 4.6 * s]]);
  }
  const s0 = people[0].s;
  g.polys(shadows, SHADOW, { alpha: 0.22 });
  g.stroke(legs, SKIN, 1 * s0);
  g.polys(kilts, KILT);
  g.polys(bodies, SKIN);
  g.stroke(collars, BLUE, 0.9 * s0);
  g.stroke(arms, SKIN, 0.8 * s0);
  if (mallets.length) g.stroke(mallets, WOOD, 1.1 * s0);
  g.polys(heads, HAIR);
}

// A hauler at tile point (gx, gy), bouncing one step per `phase` cycle (0..1).
export function hauler(g, gx, gy, phase = 0) {
  fig(g, gx, gy, 'hauler', Math.abs(Math.sin(phase * Math.PI)) * 1.4);
}

// A raider at tile point (gx, gy): a dark figure in a crested helmet with a round shield on the left arm and a short
// axe in the right hand.
const RAIDER = { body: '#3E3446', kilt: '#55465A', helm: '#6A5A4E', crest: '#8A2E26', shield: '#6E5A3E', rim: '#B39466' };
export function raider(g, gx, gy, z = 0, sc = UNIT_SCALE) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc;
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.3 });
  g.line([X - 0.9 * s, Y], [X - 1.1 * s, Y - 3.4 * s], RAIDER.body, 1.2 * s);          // legs astride
  g.line([X + 0.9 * s, Y], [X + 1.1 * s, Y - 3.4 * s], RAIDER.body, 1.2 * s);
  g.poly([[X - 2 * s, Y - 2.6 * s], [X + 2 * s, Y - 2.6 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], RAIDER.kilt);
  g.poly([[X - 1.6 * s, Y - 5.6 * s], [X + 1.6 * s, Y - 5.6 * s], [X + 1.9 * s, Y - 8.8 * s], [X - 1.9 * s, Y - 8.8 * s]], RAIDER.body);
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 3.2 * s, Y - 6 * s], RAIDER.body, 0.9 * s);   // the axe arm, raised
  g.line([X + 3.2 * s, Y - 6 * s], [X + 3.6 * s, Y - 12 * s], WOOD, 0.6 * s);
  g.poly([[X + 3.4 * s, Y - 12.4 * s], [X + 5.4 * s, Y - 11.6 * s], [X + 3.6 * s, Y - 10.2 * s]], STONE[2]);
  g.circ([X + 0.2 * s, Y - 10.4 * s], 1.5 * s, RAIDER.body);                            // the head
  g.path([['M', [X - 1.7 * s, Y - 10.6 * s]], ['Q', [X + 0.2 * s, Y - 13.6 * s], [X + 1.9 * s, Y - 10.6 * s]], ['Z']], RAIDER.helm);
  g.path([['M', [X - 2 * s, Y - 11 * s]], ['Q', [X - 0.6 * s, Y - 16.2 * s], [X + 2.4 * s, Y - 13.4 * s]],
    ['Q', [X + 0.4 * s, Y - 13.4 * s], [X - 2 * s, Y - 11 * s]], ['Z']], RAIDER.crest);   // the crest, sweeping back
  g.circ([X - 2.4 * s, Y - 6.4 * s], 2.6 * s, RAIDER.shield, { stroke: RAIDER.rim, strokeWidth: 0.6 * s });   // the round shield
  g.circ([X - 2.4 * s, Y - 6.4 * s], 0.7 * s, RAIDER.rim);
}

// A soldier at tile point (gx, gy): a white kilt and a teal collar, a tall spear held upright and a tall, round-topped
// teal shield in front.
export function soldier(g, gx, gy, z = 0, sc = UNIT_SCALE) {
  const c = U(p(gx, gy), z), X = c[0], Y = c[1], s = sc, sk = '#A0663F', hair = '#1E150E';
  g.ell([X, Y], 3 * s, 1.1 * s, SHADOW, { alpha: 0.25 });
  g.line([X + 3 * s, Y + 0.6 * s], [X + 3 * s, Y - 20 * s], WOOD, 0.6 * s);           // the spear, taller than the man
  g.poly([[X + 3 * s, Y - 22.4 * s], [X + 3.8 * s, Y - 19.6 * s], [X + 2.2 * s, Y - 19.6 * s]], GOLD);
  g.line([X - 0.9 * s, Y], [X - 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
  g.line([X + 0.9 * s, Y], [X + 0.9 * s, Y - 3.4 * s], sk, 1.1 * s);
  g.poly([[X - 2 * s, Y - 2.6 * s], [X + 2 * s, Y - 2.6 * s], [X + 1.5 * s, Y - 5.7 * s], [X - 1.5 * s, Y - 5.7 * s]], '#FAF6EC', { outline: true });
  g.poly([[X - 1.5 * s, Y - 5.6 * s], [X + 1.5 * s, Y - 5.6 * s], [X + 1.7 * s, Y - 8.7 * s], [X - 1.7 * s, Y - 8.7 * s]], sk);
  g.line([X - 1.5 * s, Y - 8.5 * s], [X + 1.5 * s, Y - 8.5 * s], TEAL, 1 * s);
  g.line([X + 1.8 * s, Y - 8.4 * s], [X + 3 * s, Y - 6.4 * s], sk, 0.9 * s);           // the hand on the spear
  g.circ([X - 0.2 * s, Y - 10.8 * s], 1.75 * s, hair);
  g.circ([X + 0.25 * s, Y - 10.3 * s], 1.4 * s, sk);
  g.line([X - 1.6 * s, Y - 11.4 * s], [X + 1.6 * s, Y - 11.4 * s], '#FAF6EC', 0.6 * s);   // a white headband
  g.path([['M', [X - 3.8 * s, Y - 1.4 * s]], ['L', [X - 3.8 * s, Y - 7.6 * s]], ['Q', [X - 2.3 * s, Y - 10.6 * s], [X - 0.8 * s, Y - 7.6 * s]],
    ['L', [X - 0.8 * s, Y - 1.4 * s]], ['Z']], TEAL, { stroke: TEAL_DARK, strokeWidth: 0.5 * s });   // the shield, round-topped
  g.line([X - 2.3 * s, Y - 2.4 * s], [X - 2.3 * s, Y - 8.2 * s], '#F6ECD6', 0.4 * s, 0.7);
}

export const FIGURE_ART = {};
for (const kind of FIGURE_KINDS) {
  FIGURE_ART[`fig.${kind}`] = { w: 0, d: 0, height: 14, bounds: [-14, -30, 14, 6], shadows: [], draw: (g, x, y) => fig(g, x, y, kind) };
}
// Units stand UNIT_SCALE times as tall, so their slots are that much bigger (the soldier's spear is the tallest point).
FIGURE_ART['fig.raider'] = { w: 0, d: 0, height: 26, bounds: [-21, -45, 21, 9], shadows: [], draw: (g, x, y) => raider(g, x, y) };
FIGURE_ART['fig.soldier'] = { w: 0, d: 0, height: 34, bounds: [-21, -45, 21, 9], shadows: [], draw: (g, x, y) => soldier(g, x, y) };
