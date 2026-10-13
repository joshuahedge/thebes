// The score interface (spec 4.1, 4.17, 4.19): the summary's score section with Seal this reign and Share score, the
// score chip on the summary button, the next-threshold bar, the "+N" score preview in the confirm bar, feats, citizen
// remarks, and the title card's records, stamps, weekly seed and shared score. Stage 3 contract: createUI makes one per
// game exactly as it makes the danger interface (src/ui/danger.js: the same ctx, the same returned shape), and boot.js
// decorates the title card through titleDecor.
//
// The score is measured, never stored by the interface: current() asks scoreOf (src/sim/score.js) at most once per
// refresh, game day and command. The sim changes the city only on a day's tick or through a command, and createUI calls
// refresh after both (onCommand and onEvents also see each command), so the section and the chip read the same score.
import { SCORE_PARTS, SPLITS, STAMP_GLYPHS_MAX } from '../data/scoring.js';
import { BUILDINGS } from '../data/buildings.js';
import { scoreOf, scorePreview, monumentPreview, sealReign, splitMonths } from '../sim/score.js';
import { featsFor, featStatus } from '../sim/feats.js';
import { population } from '../sim/world.js';
import { remarkFor, monumentCaptions } from './celebrate.js';
import { isMonument, isSite } from '../sim/world.js';
import { downloadFile } from '../save/exportImport.js';
import { openSheet } from './modes.js';
import { shareLink, parseShareLink, sharedTotal, emojiRow, pictureCard, weeklySeed, drawMapSquare, medalColour } from './share.js';
import { generateMap } from '../sim/mapgen.js';
import { el, button, setText } from './components.js';
import {
  SCORE_TEXT, SHARE_TEXT, TITLE_SCORE_TEXT, FEAT_TEXT, featsHeading, sealFeatsText, scoreReasonText, scoreChipText, medalText, nextMedalText, partBarLabel, factorText, scoreLineText, splitCompareText,
  sealQuestion, sealedText, T, SCORE4_TEXT, score4ReasonText, score4MonumentLine, score4SplitText, score4YourBest, score4StampLabel,
} from './text.js';

// Returns { sheets, sheetParts: { building, house, actions, summary }, onEvents, refresh, onAlertAction, onCommand,
// destroy } (danger.js). Share score's screenshot button calls ctx.screenshotMode().
export function createScoreUi(ctx) {
  const { world, root, store } = ctx;
  const records = () => (ctx.hooks && ctx.hooks.records) || null;
  const clock = () => (typeof ctx.clock === 'function' ? ctx.clock() : Date.now());
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
      s.reasons[part] ? el('p', { class: 'reason small muted', text: score4ReasonText(s.reasons[part]) }) : null,   // Stage 4: the Monuments part's next step too
    ]);
  }

  // The milestone splits as game dates, in order, each against the personal best on this seed and level (the earliest
  // day any other city on the device reached it); the ones not reached are left out. Stage 4: score v2's seven, the
  // pyramids unlocked and the great pyramid finished after the five milestones.
  function splitsBlock() {
    const reached = SPLITS.filter((id) => Number.isInteger(world.splits[id]));
    let best = null;
    try { best = records() ? records().bestFor(world.seed, world.difficulty, { except: world.cityId }) : null; } catch (e) { best = null; }
    const bestDay = (id) => (best && Number.isInteger(best.splits[id]) ? best.splits[id] : null);
    return [
      el('h4', { class: 'splits-heading', text: SCORE_TEXT.splits }),
      reached.length
        ? el('ul', { class: 'splits' }, reached.map((id) => el('li', { class: 'split', dataset: { id }, text: score4SplitText(id, world.splits[id], bestDay(id)) })))
        : el('p', { class: 'small muted', text: SCORE_TEXT.noSplits }),
    ];
  }

  const goTo = (kind) => store.set(openSheet(store.get(), kind));
  // Seal this reign, Share score and Screenshot mode (spec 4.19: screenshot mode sits beside Share score).
  const scoreActions = () => el('div', { class: 'actions score-actions' }, [
    button(SCORE_TEXT.sealReign, { class: 'seal-reign', onClick: () => goTo('sealReign') }),
    button(SCORE_TEXT.shareScore, { class: 'share-score', onClick: () => goTo('shareScore') }),
    button(T.screenshotMode, { class: 'screenshot-mode quiet', onClick: () => ctx.screenshotMode() }),
  ]);

  // Feats (spec 4.19): their own group, after the score and just above the achievements, each with its exact condition
  // and its state in words (Earned with a tick that is decoration, Missed, Open). None about raids on Peaceful.
  const FEAT_STATUS = { earned: SCORE_TEXT.featEarned, lost: SCORE_TEXT.featMissed, open: SCORE_TEXT.featOpen };
  function featsSection() {
    const list = featsFor(world);
    const earned = list.filter((d) => featStatus(world, d) === 'earned').length;
    return el('section', { class: 'feats-section' }, [
      el('h3', { class: 'feats-heading', text: featsHeading(earned, list.length) }),
      el('p', { class: 'small muted', text: SCORE_TEXT.featsHelp }),
      el('ul', { class: 'feats' }, list.map((d) => {
        const st = featStatus(world, d);
        return el('li', { class: `feat ${st}`, dataset: { id: d.id } }, [
          el('span', { class: 'what' }, [el('strong', { text: FEAT_TEXT[d.id].name }), el('span', { class: 'small muted', text: FEAT_TEXT[d.id].condition })]),
          el('span', { class: 'status small' }, [st === 'earned' ? el('span', { class: 'tick', 'aria-hidden': 'true', text: `${T.doneMark} ` }) : null, FEAT_STATUS[st]]),
        ]);
      })),
    ]);
  }
  const earnedNames = () => featsFor(world).filter((d) => world.feats.earned.includes(d.id)).map((d) => FEAT_TEXT[d.id].name);

  // Seal this reign (spec 4.19): what happens, in words, then "Seal reign" and "Not yet". sealReign records the day and the
  // score in the world; the device's chronicle gets an entry (records.addSeal), which the title card shows as a stamp.
  function sealSheet(body) {
    const s = current();
    body.append(
      el('p', { class: 'seal-question', text: sealQuestion(s.total, s.medal) }),
      el('p', { class: 'seal-feats', text: sealFeatsText(earnedNames()) }),     // spec 4.19: feats show when sealing
      el('p', { class: 'small muted', text: SCORE_TEXT.stampNote }),
      el('div', { class: 'actions' }, [
        button(SCORE_TEXT.sealConfirm, { class: 'seal-confirm primary', onClick: seal }),
        button(SCORE_TEXT.notYet, { class: 'seal-not-yet', onClick: () => goTo('summary') }),
      ]),
    );
  }
  function seal() {
    const r = sealReign(world);
    try { if (records()) records().addSeal(world, r.seal, clock()); } catch (e) { /* records never stop a seal */ }
    version++;
    goTo('summary');
    ctx.toasts.show(sealedText(r.seal));
    ctx.afterCommand({ kind: 'seal', result: r, undoable: false });
  }

  // Share score (spec 4.19): the link, the emoji row and the picture card, each opt-in. The picture is made when the sheet
  // opens (kept while the score stays the same), so a tap on Share picture still has its gesture when the share sheet opens.
  let picture = null;                                  // { key, file } once made; file null while it is being made
  function preparePicture(s) {
    const key = `${s.total}|${SCORE_PARTS.map((p) => s.parts[p]).join('-')}|${world.seed}`;
    if (picture && picture.key === key) return picture;
    const mine = { key, file: null };
    picture = mine;
    const canvas = pictureCard(world, s, { view: root.querySelector('#map') });
    if (canvas && canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (picture !== mine || !blob) return;
        mine.file = new File([blob], SHARE_TEXT.fileName, { type: 'image/png' });
        const b = root.querySelector('#sheet .share-picture');
        if (b) { b.disabled = false; b.textContent = SHARE_TEXT.sharePicture; }
      }, 'image/png');
    }
    return mine;
  }
  // The share sheet, the file download and the clipboard: the browser's, or the ones handed in through ctx.hooks (a hook
  // given as null means there is none).
  const nav = () => (typeof navigator !== 'undefined' ? navigator : {});
  const given = (name, fallback) => (ctx.hooks && name in ctx.hooks ? ctx.hooks[name] : fallback());
  const shareFn = () => given('share', () => (typeof nav().share === 'function' ? (d) => nav().share(d) : null));
  const canShare = (d) => { const f = given('canShare', () => (typeof nav().canShare === 'function' ? (x) => nav().canShare(x) : null)); return f ? f(d) : true; };
  const download = (file) => given('download', () => (f) => downloadFile(f, document))(file);
  const clipboard = () => given('clipboard', () => nav().clipboard || null);
  function shareSheet(body) {
    const s = current();
    const link = shareLink({ seed: world.seed, difficulty: world.difficulty, parts: s.parts, splits: splitMonths(world) });
    const rows = emojiRow(s.parts);
    const text = SHARE_TEXT.text(s.total, rows, link);
    const pic = preparePicture(s);
    const input = el('input', { class: 'share-link-text', type: 'text', readonly: true, value: link, 'aria-label': SHARE_TEXT.linkLabel });
    const sharePicture = button(pic.file ? SHARE_TEXT.sharePicture : SHARE_TEXT.making, { class: 'share-picture primary', disabled: !pic.file, onClick: () => {
      if (!pic.file) return;
      const share = shareFn(), data = { files: [pic.file], text };
      if (share && canShare(data)) Promise.resolve().then(() => share(data)).catch(() => {});
      else { download(pic.file); ctx.toasts.show(SHARE_TEXT.pictureSaved); }
    } });
    const shareText = button(SHARE_TEXT.shareLink, { class: 'share-link', onClick: () => {
      const share = shareFn();
      if (share) { Promise.resolve().then(() => share({ text })).catch(() => {}); return; }
      const clip = clipboard();
      const pickIt = () => { input.focus(); input.select(); };
      if (clip && clip.writeText) clip.writeText(text).then(() => ctx.toasts.show(SHARE_TEXT.copied), pickIt); else pickIt();
    } });
    body.append(
      el('p', { class: 'honour', text: SHARE_TEXT.honourHelp }),
      el('pre', { class: 'emoji-row', text: rows }),
      input,
      el('div', { class: 'actions' }, [sharePicture, shareText, button(T.screenshotMode, { class: 'screenshot-mode quiet', onClick: () => ctx.screenshotMode() })]),
    );
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
      scoreActions(),
    ]);
  }

  // Danger's six tips (spec 4.19, src/data/tips.js), each asked for when its lesson becomes news. The tips row decides
  // whether one shows (once per device, the gaps, Help: Off).
  const tip = (key) => { if (typeof ctx.fireTip === 'function') ctx.fireTip(key); };
  // A feat earned: a caption in the caption row, as an achievement has, with its condition beneath.
  function featCaptions(events) {
    for (const e of events) {
      if (e.type !== 'feat' || !FEAT_TEXT[e.id]) continue;
      ctx.celebrations.show({ tier: 'first', text: `${SCORE_TEXT.feat}: ${FEAT_TEXT[e.id].name}`, why: FEAT_TEXT[e.id].condition, onShow: () => ctx.sfx.play('goal') });
    }
  }
  // A citizen remark (spec 4.19): at a month end, only when the caption row is free (createUI has already queued the
  // batch's own captions) and Help is not Off; remarkFor says whether this month has one.
  function remark(events) {
    if (!events.some((e) => e.type === 'month') || !ctx.celebrations || ctx.celebrations.busy()) return;
    if (ctx.settings && ctx.settings.get().help === 'off') return;
    const text = remarkFor(world);
    if (text) ctx.celebrations.show({ tier: 'remark', text, icon: '❝' });
  }
  // Stage 4: the course, finish and palace captions (monumentCaptions), each with its sound as it shows.
  function monumentCheers(events) {
    for (const c of monumentCaptions(world, events)) ctx.celebrations.show({ tier: c.tier, text: c.text, why: c.why, onShow: () => ctx.sfx.play(c.sound) });
  }
  function tipsFor(events) {
    for (const e of events) {
      if (e.type === 'site_stalled' && (e.reason === 'no_stone' || e.reason === 'no_bricks')) tip('siteStarved');   // Stage 4: a storehouse can bridge
      if (e.type === 'month' && allBuildingsOf('storehouse').some((s) => (s.store.stone || 0) > 0 && (s.store.clay || 0) > 0)) tip('stoneStored');
      if (e.type === 'milestone' && e.id === 'town') tip('fireRisk');                // fire risk builds from Town
      else if (e.type === 'fire_grow') tip('fireGrew');                               // a fire can spread
      else if (e.type === 'burned' && e.kind !== 'house') tip('rubbleLeft');          // a burned home leaves empty plots, the rest rubble
      else if (e.type === 'raid_warning') { tip('raidWarned'); if (!e.first) tip('tributeOffered'); }   // the first raid cannot be paid off
    }
  }
  function tipsForCommand(e) {
    const built = e.kind === 'building' && e.result && world.buildings[e.result.id];
    if (built && built.type === 'firehouse') tip('fireRisk');
    if (e.kind === 'wall') tip('wallDrawn');
    // Stage 4: the Monuments tips, each when its lesson becomes news.
    if (built && built.type === 'builders_guild') tip('guildPlaced');
    if (built && (built.type === 'quarry' || built.type === 'brickworks')) tip('supplyPlaced');
    if (built && isMonument(built)) {
      const others = Object.values(world.buildings).filter((b) => isMonument(b) && b.id !== built.id);
      if (others.some((b) => b.type === built.type)) tip('secondOfKind');
      if (others.some(isSite)) tip('secondSite');
    }
  }
  const allBuildingsOf = (type) => Object.values(world.buildings).filter((b) => b.type === type);

  // The chip on the summary button (hud.js makes the empty node): the live total, refreshed with the chrome. It stays
  // hidden while nobody lives in the city (mobile UX review, section 4 item 9): a new city has no score to show yet.
  function renderChip() {
    const chip = root.querySelector('#topbar .score-chip');
    if (!chip) return;
    setText(chip, scoreChipText(current().total));
    chip.hidden = population(world) === 0;
  }

  return {
    sheets: { sealReign: sealSheet, shareScore: shareSheet },
    // Made without a world (the contract's shape test), it has no parts.
    sheetParts: { building: () => [], house: () => [], actions: () => [], summary: () => (world ? [summarySection(), featsSection()] : []) },
    onEvents(events) { if (!events.length) return; version++; if (world) { featCaptions(events); monumentCheers(events); tipsFor(events); remark(events); } },
    refresh() { if (world) { version++; renderChip(); } },
    onAlertAction() {},
    onCommand(e) { version++; if (world && e) tipsForCommand(e); },
    destroy() { picture = null; cached = null; },       // a picture still being made never touches a later interface's sheet
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
  // Stage 4 (spec 4.19): a monument's line is the Monuments part once it is finished ("+32 Monuments when finished"), and
  // nothing for a second of a kind; its site counts for nothing until then.
  const value = BUILDINGS[type] && BUILDINGS[type].monument ? score4MonumentLine(monumentPreview(world, type)) : scoreLineText(scorePreview(world, type, x, y));
  lineMemo.set(world, { key, value });
  return value;
}

// A stamp (spec 4.19): the sealed seed's map, top-down, in a disc ringed in the medal's colour. Cosmetic; the label says it.
// Stage 4: a small glyph along its foot for each mastaba (a stepped bench) and pyramid (a triangle) finished at the seal
// (the entry's `built`, at most STAMP_GLYPHS_MAX), ink with a pale halo.
const STAMP_PX = 40, STAMP_MAX = 8;
const GLYPH = { ink: '#2B1F0E', halo: '#F3E7CB' };
function drawGlyph(g, kind, cx, base, s) {
  g.beginPath();
  if (kind.startsWith('pyramid')) { g.moveTo(cx - s / 2, base); g.lineTo(cx, base - s * 0.8); g.lineTo(cx + s / 2, base); }
  else { g.moveTo(cx - s / 2, base); g.lineTo(cx - s / 2, base - s * 0.3); g.lineTo(cx - s / 4, base - s * 0.3); g.lineTo(cx - s / 4, base - s * 0.55); g.lineTo(cx + s / 4, base - s * 0.55); g.lineTo(cx + s / 4, base - s * 0.3); g.lineTo(cx + s / 2, base - s * 0.3); g.lineTo(cx + s / 2, base); }
  g.closePath();
  g.stroke();
  g.fill();
}
const stampMaps = new Map();   // 'seed|variant' -> its generated map: a stamp row often repeats a seed (at most STAMP_MAX kept)
// A stamp draws the map its city really had: the entry's mapVariant ('classic' for a record from before Stage 4.5).
export function stampMap(seed, variant = 'classic') {
  const key = `${seed}|${variant}`;
  if (!stampMaps.has(key)) {
    if (stampMaps.size >= STAMP_MAX) stampMaps.delete(stampMaps.keys().next().value);
    stampMaps.set(key, generateMap(seed, undefined, variant));
  }
  return stampMaps.get(key);
}
function stampFor(entry, dpr) {
  const map = stampMap(entry.seed, entry.mapVariant || 'classic');
  const px = Math.round(STAMP_PX * dpr);
  const c = el('canvas', { class: 'stamp', role: 'img', 'aria-label': score4StampLabel(entry), width: px, height: px });
  c.style.width = `${STAMP_PX}px`; c.style.height = `${STAMP_PX}px`;
  const g = c.getContext('2d');
  if (!g) return c;
  const r = px / 2, ring = 3 * dpr;
  g.save();
  g.beginPath(); g.arc(r, r, r - ring, 0, Math.PI * 2); g.clip();
  drawMapSquare(g, { size: map.size, terrain: map.terrain }, 0, 0, px);
  g.restore();
  g.strokeStyle = medalColour(entry.medal); g.lineWidth = ring;
  g.beginPath(); g.arc(r, r, r - ring / 2, 0, Math.PI * 2); g.stroke();
  const glyphs = (entry.built || []).slice(0, STAMP_GLYPHS_MAX);
  if (glyphs.length) {
    const s = 9 * dpr, gap = 1.5 * dpr, base = px - ring - 3 * dpr, left = r - (glyphs.length * (s + gap) - gap) / 2;
    g.fillStyle = GLYPH.ink; g.strokeStyle = GLYPH.halo; g.lineWidth = 2 * dpr; g.lineJoin = 'round';
    glyphs.forEach((k, i) => drawGlyph(g, k, left + i * (s + gap) + s / 2, base, s));
  }
  return c;
}

// The title card's decoration (spec 4.1, 4.19): the three highest bests and a stamp per sealed reign under Continue (the
// newest STAMP_MAX, then "+N more"), This week's Nile under the difficulty choice, and a shared score link's friend score
// with "Beat N?" and Start this seed above the buttons. boot.js calls titleDecor once per title card and passes the result
// to createTitleCard as decorate, which calls it with (element, { buttonBox, newCity }).
// opts: { records (src/save/records.js), shared (the page's location hash, '' for none), startSeed(seed) (starts a city on
// that seed, asking first when a city is saved, as New city does), clock, dpr (the stamps' pixel ratio) }.
export function titleDecor({ records = null, shared = '', startSeed = () => {}, clock = () => Date.now(), dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1 } = {}) {
  return (element, { buttonBox, newCity } = {}) => {
    if (!element || !buttonBox) return;
    const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };

    // The device's records: up to three bests, then the stamps (records read blocked storage as none).
    const bests = records ? safe(() => records.bests(3), []) : [];
    const stamps = records ? safe(() => records.stamps(), []) : [];
    if (bests.length || stamps.length) {
      const box = el('div', { class: 'title-records', role: 'group', 'aria-label': TITLE_SCORE_TEXT.records }, [
        ...bests.map((b) => el('p', { class: 'best-line small', text: TITLE_SCORE_TEXT.bestLine(b) })),
        stamps.length ? el('div', { class: 'stamps' }, [
          ...stamps.slice(0, STAMP_MAX).map((e) => stampFor(e, dpr)),
          stamps.length > STAMP_MAX ? el('span', { class: 'more-stamps small muted', text: TITLE_SCORE_TEXT.moreStamps(stamps.length - STAMP_MAX) }) : null,
        ]) : null,
      ]);
      const cont = buttonBox.querySelector('.continue');
      if (cont) cont.after(box); else buttonBox.prepend(box);
    }

    // This week's Nile: the seed of the device's ISO week, at the level chosen above it.
    const seed = weeklySeed(new Date(clock()));
    const levels = buttonBox.querySelector('.title-difficulty');
    const weekly = el('div', { class: 'title-weekly' }, [
      button(TITLE_SCORE_TEXT.weekly, { class: 'weekly', 'aria-describedby': 'title-weekly-hint', onClick: () => startSeed(seed) }),
      el('p', { class: 'weekly-hint small muted', id: 'title-weekly-hint', text: TITLE_SCORE_TEXT.weeklyHint(seed) }),
    ]);
    if (levels) levels.after(weekly); else if (newCity) newCity.after(weekly); else buttonBox.append(weekly);

    // A shared score link: the friend's score and parts beside the best on that seed and level, "Beat N?" and Start this
    // seed, which picks the link's level in the difficulty choice first. A bad or newer link says so; the card works as
    // usual. Any other hash (or none) adds nothing.
    const link = parseShareLink(shared);
    if (!link) return;
    if (!link.ok) {
      element.insertBefore(el('p', { class: 'shared-bad small coral', text: link.reason === 'newer_format' ? TITLE_SCORE_TEXT.newerLink : TITLE_SCORE_TEXT.badLink }), buttonBox);
      return;
    }
    const total = sharedTotal(link);
    // Stage 4 (ruling 259): a t1 link (older scoring) is compared only with your best made under its own score version.
    const best = records ? safe(() => records.bestFor(link.seed, link.difficulty, { version: link.version }), null) : null;
    const start = button(TITLE_SCORE_TEXT.startSeed, { class: 'start-seed primary', onClick: () => {
      const choice = buttonBox.querySelector(`.choice.difficulty[data-value="${link.difficulty}"]`);
      if (choice && choice.getAttribute('aria-pressed') !== 'true') choice.click();
      startSeed(link.seed);
    } });
    element.insertBefore(el('section', { class: 'shared-score', 'aria-labelledby': 'shared-score-heading' }, [
      el('h2', { id: 'shared-score-heading', class: 'small', text: TITLE_SCORE_TEXT.friend }),
      el('p', { class: 'friend-line', text: TITLE_SCORE_TEXT.friendLine(total, link.seed, link.difficulty) }),
      el('p', { class: 'friend-parts small muted', text: TITLE_SCORE_TEXT.partsLine(link.parts) }),
      link.older ? el('p', { class: 'friend-older small muted', text: SCORE4_TEXT.olderLink }) : null,
      el('p', { class: 'your-best small', text: score4YourBest(best ? best.score : null, link.older) }),
      el('p', { class: 'beat', text: TITLE_SCORE_TEXT.beat(total) }),
      el('p', { class: 'start-on small muted', text: TITLE_SCORE_TEXT.startOn(link.difficulty) }),
      start,
    ]), buttonBox);
  };
}
