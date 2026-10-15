// Sharing a score (spec 4.19): the weekly seed, the share link and its check, the emoji row and the picture card. Opt-in
// only, labelled "friends' honour". Stage 3 contract: Track 0 fixed the names; Track E implements them. The interface reads
// the date; the sim never does.
import { SHARE, SCORE_PARTS, SCORE_FACTOR } from '../data/scoring.js';
import { MAP_VARIANTS, MAP_SIZES, DEFAULT_MAP_SIZE } from '../data/map.js';
import { T as TER } from '../sim/terrain.js';
import { allBuildings } from '../sim/world.js';
import { hashKey } from '../sim/daily.js';
import { TERRAIN, UI } from '../render/art/palette.js';
import { hasNewLand } from '../data/s47.js';
import { SCORE_TEXT, SHARE_TEXT, medalText, DIFFICULTY_NAMES } from './text.js';

// The ISO week of a local date: { year, week }, the week-year being the year of that week's Thursday.
export function isoWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));                   // that week's Thursday
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const thursday1 = new Date(jan4);
  thursday1.setDate(jan4.getDate() + 3 - ((jan4.getDay() + 6) % 7));      // week 1's Thursday
  return { year: d.getFullYear(), week: 1 + Math.round((d - thursday1) / (7 * 86400000)) };
}

// This week's Nile: ISO week-year x 100 + ISO week number of the local date (week 41 of 2026 is 202641).
export function weeklySeed(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 0;
  const { year, week } = isoWeek(date);
  return year * 100 + week;
}

// The link's check: 4 base-36 characters of the FNV-1a hash of everything before it. It catches typos, not cheats.
export const shareCheck = (body) => (hashKey(body) % 36 ** SHARE.checkLength).toString(36).padStart(SHARE.checkLength, '0');

const LEVEL_OF = Object.fromEntries(Object.entries(SHARE.difficulty).map(([level, c]) => [c, level]));
const isPart = (n) => Number.isInteger(n) && n >= 0 && n <= 100;

// The share link for a score: SHARE.base + '#t2.<seed>.<p|r|n|h>.<parts joined by ->.<months to each split
// joined by -, x where not reached>.<4 base-36 check characters>'; '' for anything that is not a score. Stage 4: written
// in SHARE.format (t2: five parts, seven splits, SHARE.formats). Stage 4.5: a city on another river layout than the classic one
// adds '&variant=<name>' after the check (not part of it), so Start this seed builds the same map; classic adds nothing. Stage 4.6 (ruling 333):
// a city on a Small or Large map adds '&size=48' or '&size=80' the same way; Normal adds nothing, so every older link means the same map.
export function shareLink({ seed, difficulty, parts, splits, variant = 'classic', size = DEFAULT_MAP_SIZE } = {}) {
  const f = SHARE.formats[SHARE.format];
  if (!Number.isInteger(seed) || seed < 0 || !SHARE.difficulty[difficulty] || !parts || !f.parts.every((p) => isPart(parts[p]))) return '';
  const months = f.splits.map((id) => (splits && Number.isInteger(splits[id]) ? splits[id] : 'x')).join('-');
  const body = `${SHARE.format}.${seed}.${SHARE.difficulty[difficulty]}.${f.parts.map((p) => parts[p]).join('-')}.${months}`;
  const tail = MAP_VARIANTS.includes(variant) && variant !== 'classic' ? `&variant=${variant}` : '';   // classic is left out, so every older link means the same city it always did
  const sized = Object.values(MAP_SIZES).includes(size) && size !== DEFAULT_MAP_SIZE ? `&size=${size}` : '';
  return `${SHARE.base}#${body}.${shareCheck(body)}${tail}${sized}`;
}

// Reads a location hash: { ok: true, seed, difficulty, parts, splits, version, older, variant } for a good link (variant: the
// '&variant=' name, 'classic' when the link has none, as every older link; an unknown name reads as 'newer_format'; size: the '&size=' number,
// absent when the link has none (Normal, as every older link), and a size that is not Small, Normal or Large reads as 'newer_format' too. Stage 4: a t1 link
// still opens, with its four parts and five splits, version 1 and older: true; ruling 203), { ok: false, reason }
// ('bad_check', 'newer_format', 'malformed') otherwise, and null for a hash that is not a share link at all.
export function parseShareLink(hash) {
  const [text, ...extra] = String(hash || '').replace(/^#/, '').split('&');
  const head = /^t(\d+)\./.exec(text);
  if (!head) return null;
  const f = SHARE.formats[`t${head[1]}`];
  if (!f) return { ok: false, reason: Number(head[1]) > Number(SHARE.format.slice(1)) ? 'newer_format' : 'malformed' };
  const bits = text.split('.');
  const bad = { ok: false, reason: 'malformed' };
  if (bits.length !== 6) return bad;
  const [, seedText, level, partsText, splitsText, check] = bits;
  const parts = partsText.split('-'), months = splitsText.split('-');
  if (!/^\d{1,10}$/.test(seedText) || !LEVEL_OF[level] || parts.length !== f.parts.length || months.length !== f.splits.length) return bad;
  if (!parts.every((p) => /^\d{1,3}$/.test(p) && isPart(Number(p))) || !months.every((m) => m === 'x' || /^\d{1,5}$/.test(m))) return bad;
  if (!new RegExp(`^[0-9a-z]{${SHARE.checkLength}}$`).test(check)) return bad;
  if (check !== shareCheck(bits.slice(0, 5).join('.'))) return { ok: false, reason: 'bad_check' };
  const named = extra.find((e) => e.startsWith('variant='));
  const variant = named ? named.slice('variant='.length) : 'classic';
  if (!MAP_VARIANTS.includes(variant)) return { ok: false, reason: 'newer_format' };
  const sizeNamed = extra.find((e) => e.startsWith('size='));
  const size = sizeNamed ? Number(sizeNamed.slice('size='.length)) : DEFAULT_MAP_SIZE;
  if (!Object.values(MAP_SIZES).includes(size)) return { ok: false, reason: 'newer_format' };
  return {
    ok: true, seed: Number(seedText), difficulty: LEVEL_OF[level],
    parts: Object.fromEntries(f.parts.map((p, i) => [p, Number(parts[i])])),
    splits: Object.fromEntries(f.splits.map((id, i) => [id, months[i] === 'x' ? null : Number(months[i])])),
    version: f.version, older: f.version < SHARE.formats[SHARE.format].version, variant, ...(sizeNamed ? { size } : {}),   // size only when the link names one: a Normal link reads as it always did
  };
}

// A shared score's city score: its parts' total times its level's factor, rounded, as scoreOf counts it.
export const sharedTotal = (link) => Math.round(Object.values(link.parts).reduce((s, v) => s + v, 0) * SCORE_FACTOR[link.difficulty]);

// One line per part, a square per 20 points ("People 🟩🟩🟩⬜⬜"), joined with new lines; '' for anything else.
export function emojiRow(parts) {
  if (!parts || !SCORE_PARTS.every((p) => isPart(parts[p]))) return '';
  return SCORE_PARTS.map((p) => { const k = Math.floor(parts[p] / 20); return `${SCORE_TEXT.parts[p]} ${'🟩'.repeat(k)}${'⬜'.repeat(5 - k)}`; }).join('\n');
}

const TERRAIN_COLOURS = { [TER.DESERT]: TERRAIN.sand, [TER.FERTILE]: TERRAIN.fertile, [TER.ROCKY]: TERRAIN.rocky, [TER.WATER]: TERRAIN.water, [TER.BANK]: TERRAIN.bank, [TER.MEADOW]: TERRAIN.grass, [TER.CLAY]: TERRAIN.clay, [TER.HILLS]: TERRAIN.hills };

// A top-down map of the terrain (and, when given, the roads and buildings of a world) in the square (x, y, px):
// the title card's stamps and the picture card when no view of the city is at hand.
export function drawMapSquare(g, { size, terrain, road = null, buildings = [], land = false }, x, y, px) {   // land: a map with new land draws its rock in the belt's colour (Task 3b)
  const s = px / size;
  for (let ty = 0; ty < size; ty++) {
    for (let tx = 0; tx < size; tx++) {
      const t = terrain[ty * size + tx];
      g.fillStyle = (land && t === TER.ROCKY ? TERRAIN.beltRock : TERRAIN_COLOURS[t]) || TERRAIN.sand;
      g.fillRect(x + tx * s, y + ty * s, Math.ceil(s), Math.ceil(s));
    }
  }
  if (road) {
    g.fillStyle = TERRAIN.road;
    for (let i = 0; i < road.length; i++) if (road[i]) g.fillRect(x + (i % size) * s, y + Math.floor(i / size) * s, Math.ceil(s), Math.ceil(s));
  }
  for (const b of buildings) {
    g.fillStyle = b.type === 'house' ? (b.tier > 0 ? TERRAIN.roadPebble : TERRAIN.plot) : UI.housing;
    g.fillRect(x + b.x * s, y + b.y * s, Math.max(1, b.w * s), Math.max(1, b.d * s));
  }
}

const MEDAL_COLOURS = { bronze: '#B0703A', silver: '#A9A9A9', gold: '#E2B13C', none: '#DCC9A0' };
export const medalColour = (medal) => MEDAL_COLOURS[medal || 'none'];
const CARD = { w: 1200, h: 630, ink: '#2B1F0E', soft: '#5A4832', paper: '#F3E7CB', paper2: '#EADBB9', teal: '#1F6F66', font: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' };

// The 1200x630 picture card as a canvas (the city, the four bars, the medal, the seed and level, "friends' honour"), or
// null without a world and a score. view: a canvas showing the city (the game's own map, cropped to a square); without
// one the city is drawn top-down. createCanvas(w, h) makes the canvas (tests pass their own).
export function pictureCard(world, score, { createCanvas = null, view = null } = {}) {
  if (!world || !score) return null;
  const make = createCanvas || ((w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; });
  const c = make(CARD.w, CARD.h);
  const g = c.getContext('2d');
  g.fillStyle = CARD.paper;
  g.fillRect(0, 0, CARD.w, CARD.h);
  const side = CARD.h - 60;                                                    // the city in a square on the left
  if (view && view.width > 0 && view.height > 0) {
    const s = Math.min(view.width, view.height);
    g.drawImage(view, (view.width - s) / 2, (view.height - s) / 2, s, s, 30, 30, side, side);
  } else drawMapSquare(g, { size: world.size, terrain: world.terrain, road: world.road, buildings: allBuildings(world), land: hasNewLand(world) }, 30, 30, side);
  g.strokeStyle = CARD.paper2; g.lineWidth = 4; g.strokeRect(30, 30, side, side);
  const x = 30 + side + 50, right = CARD.w - 50;
  g.textBaseline = 'alphabetic';
  g.fillStyle = CARD.ink; g.font = `bold 44px ${CARD.font}`; g.fillText('Thebes', x, 90);
  g.fillStyle = CARD.soft; g.font = `28px ${CARD.font}`; g.fillText(SCORE_TEXT.cityScore, x, 145);
  g.fillStyle = CARD.ink; g.font = `bold 96px ${CARD.font}`; g.fillText(String(score.total), x, 235);
  const numberWidth = g.measureText(String(score.total)).width;
  g.fillStyle = medalColour(score.medal);
  g.beginPath(); g.arc(x + numberWidth + 44, 205, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = CARD.ink; g.font = `bold 30px ${CARD.font}`; g.fillText(medalText(score.medal), x + numberWidth + 80, 216);
  SCORE_PARTS.forEach((p, i) => {
    const y = 290 + i * 60, n = score.parts[p];
    g.fillStyle = CARD.ink; g.font = `26px ${CARD.font}`; g.fillText(SCORE_TEXT.parts[p], x, y);
    g.textAlign = 'right'; g.font = `bold 26px ${CARD.font}`; g.fillText(String(n), right, y); g.textAlign = 'left';
    g.fillStyle = CARD.paper2; g.fillRect(x, y + 10, right - x, 14);
    g.fillStyle = CARD.teal; g.fillRect(x, y + 10, ((right - x) * n) / 100, 14);
  });
  g.fillStyle = CARD.soft; g.font = `24px ${CARD.font}`;
  g.fillText(SHARE_TEXT.seedLine(world.seed, DIFFICULTY_NAMES[world.difficulty] || world.difficulty), x, 560);
  g.fillStyle = CARD.ink; g.font = `italic 24px ${CARD.font}`; g.fillText(SHARE_TEXT.honour, x, 598);
  return c;
}
