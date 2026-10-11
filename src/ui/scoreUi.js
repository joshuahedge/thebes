// The score interface (spec 4.1, 4.17, 4.19): the summary's score section with Seal this reign and Share score, the
// score chip on the summary button, the next-threshold bar, the "+N" score preview in the confirm bar, feats, citizen
// remarks, and the title card's records, stamps, weekly seed and shared score. Stage 3 contract: createUI makes one per
// game exactly as it makes the danger interface (src/ui/danger.js: the same ctx, the same returned shape), and boot.js
// decorates the title card through titleDecor.
//
// The score is measured, never stored by the interface: current() asks scoreOf (src/sim/score.js) at most once per
// refresh, game day and command. The sim changes the city only on a day's tick or through a command, and createUI calls
// refresh after both (onCommand and onEvents also see each command), so the section and the chip read the same score.
import { SCORE_PARTS, SPLIT_MILESTONES } from '../data/scoring.js';
import { scoreOf, scorePreview } from '../sim/score.js';
import { el, setText } from './components.js';
import { SCORE_TEXT, scoreReasonText, scoreChipText, medalText, nextMedalText, partBarLabel, factorText, scoreLineText, splitDateText } from './text.js';

// Returns { sheets, sheetParts: { building, house, actions, summary }, onEvents, refresh, onAlertAction, onCommand,
// destroy } (danger.js). Share score's screenshot button calls ctx.screenshotMode().
export function createScoreUi(ctx) {
  const { world, root } = ctx;
  let version = 0, cached = null;
  // The score now, measured once per refresh, game day and command.
  function current() {
    const key = `${world.day}|${version}`;
    if (!cached || cached.key !== key) cached = { key, score: scoreOf(world) };
    return cached.score;
  }

  // One part: its name and number, a bar (the number again, for sight; never alone) and its reason line.
  function partRow(part, s) {
    const n = s.parts[part];
    return el('li', { class: 'score-part', dataset: { part } }, [
      el('div', { class: 'row' }, [el('span', { text: SCORE_TEXT.parts[part] }), el('strong', { class: 'part-number', text: String(n) })]),
      el('span', { class: 'part-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(n), 'aria-label': partBarLabel(part, n) }, [
        el('span', { class: 'fill', style: { width: `${n}%` } }),
      ]),
      s.reasons[part] ? el('p', { class: 'reason small muted', text: scoreReasonText(s.reasons[part]) }) : null,
    ]);
  }

  // The milestone splits as game dates, in order; the ones not reached are left out.
  function splitsBlock() {
    const reached = SPLIT_MILESTONES.filter((id) => Number.isInteger(world.splits[id]));
    return [
      el('h4', { class: 'splits-heading', text: SCORE_TEXT.splits }),
      reached.length
        ? el('ul', { class: 'splits' }, reached.map((id) => el('li', { class: 'split', dataset: { id }, text: splitDateText(id, world.splits[id]) })))
        : el('p', { class: 'small muted', text: SCORE_TEXT.noSplits }),
    ];
  }

  // The summary's score section (spec 4.19): the city score, its medal and the points to the next one, each part with
  // its bar and reason, and the milestone splits.
  function summarySection() {
    const s = current();
    return el('section', { class: 'score-section' }, [
      el('h3', { text: SCORE_TEXT.cityScore }),
      el('p', { class: 'score-total' }, [
        el('strong', { class: 'score-number', text: String(s.total) }), ' ',
        el('span', { class: `medal ${s.medal || 'none'}`, text: medalText(s.medal) }),
      ]),
      el('p', { class: 'next-medal small muted', text: nextMedalText(s.next) }),
      s.factor !== 1 ? el('p', { class: 'factor small muted', text: factorText(s.raw, s.factor, world.difficulty) }) : null,
      el('ul', { class: 'score-parts' }, SCORE_PARTS.map((p) => partRow(p, s))),
      ...splitsBlock(),
    ]);
  }

  // The chip on the summary button (hud.js makes the empty node): the live total, refreshed with the chrome.
  function renderChip() {
    const chip = root.querySelector('#topbar .score-chip');
    if (!chip) return;
    setText(chip, scoreChipText(current().total));
    chip.hidden = false;
  }

  return {
    sheets: {},
    // Made without a world (the contract's shape test), it has no parts.
    sheetParts: { building: () => [], house: () => [], actions: () => [], summary: () => (world ? [summarySection()] : []) },
    onEvents(events) { if (events.length) version++; },
    refresh() { if (world) { version++; renderChip(); } },
    onAlertAction() {},
    onCommand() { version++; },
    destroy() {},
  };
}

// The confirm bar's score line for a building ghost that can be placed at (x, y): the parts it would change by 1 point
// or more, counting it as staffed ("+3 Culture"), or '' for none. placement.js calls it for every preview, so it
// memoises on the ghost tile and the city's state (the day, the buildings, the roads and the labour), as nicerFor does.
const lineMemo = new WeakMap();   // world -> { key, value }
export function scoreLineFor(world, type, x, y) {
  const L = world.labour;
  const key = `${type}|${x}|${y}|${world.day}|${world.nextId}|${Object.keys(world.buildings).length}|${world.roadVersion}|${L.employed}|${L.jobs}|${world.gold}`;
  const m = lineMemo.get(world);
  if (m && m.key === key) return m.value;
  const value = scoreLineText(scorePreview(world, type, x, y));
  lineMemo.set(world, { key, value });
  return value;
}

// STUB. The title card's decoration (spec 4.1, 4.19): the three highest bests and a stamp per sealed reign under
// Continue, This week's Nile, and a shared score link's "Beat N?" with Start this seed. boot.js calls titleDecor once per
// title card and passes the result to createTitleCard as decorate, which calls it with (element, { buttonBox, newCity }).
// opts: { records (src/save/records.js), shared (the page's location hash, '' for none), startSeed(seed) (starts a
// city on that seed, asking first when a city is saved, as New city does), clock }.
export function titleDecor(opts) {
  return () => {};
}
