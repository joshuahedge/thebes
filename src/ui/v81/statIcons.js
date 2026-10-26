// Version 8.1 (Track B, ruling 1223): the top bar's stats as drawn pictures with states, in the game's line style (src/ui/hud.js shows them).
// Each is one 20 x 20 SVG, hidden from screen readers (the stat's name says its number and its state in words, so a picture is never the only cue);
// data-state names the state for tests and anyone reading the DOM. Shapes carry the state as well as colour: more coins, more figures, a face's mouth,
// the river's height and the flood gauge's fill.
const NS = 'http://www.w3.org/2000/svg';

function svg(kind, state) {
  const s = document.createElementNS(NS, 'svg');
  for (const [k, v] of [['viewBox', '0 0 20 20'], ['width', '20'], ['height', '20'], ['aria-hidden', 'true'], ['focusable', 'false'], ['class', `stat-icon ${kind}`]]) s.setAttribute(k, v);
  s.dataset.state = state;
  return s;
}
function add(parent, tag, attrs) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  parent.append(n);
  return n;
}

// Gold: a pile of 1 to 4 coins by the treasury (goldPile), amber with a falling mark when the month's balance is negative.
export const GOLD_PILE = [100, 1000, 5000];       // a coin more at each of these (the treasury's size, not a rule of the sim)
export const goldPile = (gold) => 1 + GOLD_PILE.filter((g) => gold >= g).length;
export function goldIcon(coins, falling) {
  const s = svg('gold', `${coins}${falling ? '-falling' : ''}`);
  if (falling) s.classList.add('falling');
  for (let i = 0; i < coins; i++) {
    const y = 16 - i * 3.4, x = falling ? 8.5 : 10;
    add(s, 'ellipse', { class: 'coin-edge', cx: x, cy: y + 1, rx: 6.2, ry: 2.3 });
    add(s, 'ellipse', { class: 'coin', cx: x, cy: y, rx: 6.2, ry: 2.3 });
  }
  if (falling) add(s, 'path', { class: 'mark', d: 'M17 4 V12 M14.2 9.4 L17 12.4 L19.8 9.4' });   // a down arrow: the balance falls
  return s;
}

// People: 1 to 3 figures by the population (peopleCrowd).
export const PEOPLE_CROWD = [50, 300];
export const peopleCrowd = (people) => 1 + PEOPLE_CROWD.filter((p) => people >= p).length;
export function peopleIcon(figures) {
  const s = svg('people', String(figures));
  const xs = figures === 1 ? [10] : figures === 2 ? [7, 13] : [4.5, 10, 15.5];
  xs.forEach((x, i) => {
    const back = figures === 3 && i !== 1;
    const top = back ? 4.4 : 3.6;
    add(s, 'circle', { class: 'figure', cx: x, cy: top + 2, r: 2.3 });
    add(s, 'path', { class: 'figure', d: `M${x - 3.4} ${back ? 17 : 18} Q${x - 3.4} ${top + 5.6} ${x} ${top + 5.6} Q${x + 3.4} ${top + 5.6} ${x + 3.4} ${back ? 17 : 18} Z` });
  });
  return s;
}

// Mood: a face with four states (moodFace in bText.js, from the sim's thresholds): the mouth turns from a frown to a wide smile.
const MOUTHS = { leaving: 'M6.5 14.2 Q10 11.2 13.5 14.2', uneasy: 'M6.8 13 H13.2', content: 'M6.6 12 Q10 14.8 13.4 12', joyful: 'M6 11.2 Q10 16.4 14 11.2 Z' };
export function moodIcon(face) {
  const s = svg('mood', face);
  add(s, 'circle', { class: 'face', cx: 10, cy: 10, r: 8 });
  add(s, 'circle', { class: 'eye', cx: 7.2, cy: 7.8, r: 1.1 });
  add(s, 'circle', { class: 'eye', cx: 12.8, cy: 7.8, r: 1.1 });
  add(s, 'path', { class: face === 'joyful' ? 'mouth open' : 'mouth', d: MOUTHS[face] || MOUTHS.content });
  if (face === 'leaving') add(s, 'path', { class: 'brow', d: 'M5.6 5.4 L8.4 6.4 M14.4 5.4 L11.6 6.4' });
  return s;
}

// Date and flood: the sun over the river. The season sets the river (high in the flood season, a sprout on the bank in the growing season, a big sun and
// a low river at harvest); level (a FLOOD_LEVELS index 0-3, or -1) fills a four-step gauge at the left: the next flood as a staffed Nilometer reads it.
export function floodIcon(season, level = -1) {
  const s = svg('date', `${season}${level >= 0 ? `-${level}` : ''}`);
  const harvest = season === 'shemu';
  const r = harvest ? 3.3 : 2.5, cx = 13, cy = 5.4;
  add(s, 'circle', { class: 'sun', cx, cy, r });
  for (let i = 0; i < 8; i++) {                                                 // the rays, longer at harvest
    const a = (i * Math.PI) / 4, r1 = r + 1, r2 = r + (harvest ? 2.6 : 1.8);
    add(s, 'line', { class: 'ray', x1: (cx + r1 * Math.cos(a)).toFixed(2), y1: (cy + r1 * Math.sin(a)).toFixed(2), x2: (cx + r2 * Math.cos(a)).toFixed(2), y2: (cy + r2 * Math.sin(a)).toFixed(2) });
  }
  const water = season === 'akhet' ? 12 : harvest ? 15.8 : 14.6;               // the flood's high water, the growing season's banks, the harvest's low river
  add(s, 'path', { class: 'river', d: `M4.8 ${water} q2.4 -1.5 4.8 0 t4.8 0 t4.8 0 V18.6 H4.8 Z` });
  if (season === 'peret') add(s, 'path', { class: 'sprout', d: 'M8.6 14.6 V10.4 M8.6 11.8 Q6.8 11.4 6.4 9.6 M8.6 11.2 Q10.4 10.6 10.6 9' });
  // The gauge: four steps, filled up to the level (Low 1 ... High 4); hollow when the level is not known.
  for (let i = 0; i < 4; i++) add(s, 'rect', { class: i <= level ? 'step on' : 'step', x: 0.6, y: 16.2 - i * 4, width: 2.6, height: 3 });
  return s;
}

// Score: a cartouche (the oval ring that held a king's name) with a sun disc inside.
export function scoreIcon() {
  const s = svg('score', 'cartouche');
  add(s, 'rect', { class: 'ring', x: 5, y: 1.6, width: 10, height: 14.6, rx: 5 });
  add(s, 'path', { class: 'ring', d: 'M4 18.4 H16' });
  add(s, 'circle', { class: 'disc', cx: 10, cy: 8.9, r: 2.4 });
  return s;
}
