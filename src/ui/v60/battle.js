// Version 6.0, Track B2: the interface of battles you can see (the victory or defeat moment in the alert row, never over the middle of the map).
// The seam (src/ui/s46/seam.js shape); Track B2 owns this file.
//
// What it does:
//  - gives the renderer the Motion level and the clock (setBattleHooks, src/render/units.js), so the fighting poses, the chieftain's banner and the
//    arrows follow Full, Gentle and Still;
//  - when a raid ends (the sim's raid_end event, with its report) puts the result in the alert row: "Raid beaten" or "The raiders got through", the
//    report's own numbers, and Report (the city summary, where the report is) and Dismiss. It is a row of #banner (so it is the alert row as far as
//    the rest of the interface, the height budget and has-banner are concerned), kept there against alerts.js clearing the banner by a MutationObserver.
//    It stays MOMENT.days game days, or until dismissed, or until the next raid starts. On a phone (portrait or compact) the alert row is one line: the
//    result takes it from a polite alert (a letter from the court waits behind it), and waits itself while an alert that urges (a fire, a debt) has the
//    row, showing when it is free, so it never adds a row. The report's own caption (danger.js, the same numbers in a longer line) is dropped when the
//    result goes up, so the two never stand one over the other saying the same;
//  - fires the chieftain tip the first time a raid with a chieftain starts.
import { seamBase } from '../s46/seam.js';
import { setBattleHooks, resetBattleHooks } from '../../render/units.js';
import { MOMENT } from '../../data/battle.js';
import { openSheet } from '../modes.js';
import { POLITE } from '../alerts.js';
import { B2_TEXT, B1_TEXT, DANGER_UI_TEXT, plural } from '../text.js';
import { el, button, icon, iconButton } from '../components.js';

// The result's words: B2_TEXT.moment's (src/ui/text.js) when the band brought no tower down and took no granary's food unlisted; with towers lost (the report's
// towersLost) or food stolen (foodStolen, a granary's food in the grace years, when `taken` does not list it; after them `taken` does, so it is not said twice) the same
// lines with them in what was lost, in the order the raid report (DANGER_UI_TEXT.raidReport) lists them. Written here because that section of text.js is another batch's file.
export function momentWords(r) {
  const food = r.foodStolen && !r.taken ? r.foodStolen : 0;
  if (!r.towersLost && !food) return B2_TEXT.moment(r);
  const stopped = (r.byTowers || 0) + (r.bySoldiers || 0) + (r.byArchers || 0) + (r.byChariots || 0);
  const lost = [r.burned ? plural(r.burned, 'building burned', 'buildings burned') : '', r.wrecked ? `${B1_TEXT.wrecked(r.wreckedKinds || [])} wrecked` : '', r.towersLost ? plural(r.towersLost, 'tower fell', 'towers fell') : '',
    r.taken ? `${B1_TEXT.taken(r.taken)} taken` : '', food ? `${food} food stolen` : '', r.stolen ? `${r.stolen} gold stolen` : '', r.fled ? `${plural(r.fled, 'resident', 'residents')} fled` : ''].filter(Boolean);
  const stoppedLine = stopped ? `${stopped} of ${r.size} raiders stopped.` : '', chief = r.chiefs ? B1_TEXT.chiefLine(r) : '';
  if (r.won) return { title: 'Raid beaten', detail: [stoppedLine || 'The band turned back.', chief, `Lost: ${lost.join(', ')}.`].filter(Boolean).join(' ') };
  const did = `${lost.join(', ')}.`;
  return { title: 'The raiders got through', detail: [did.charAt(0).toUpperCase() + did.slice(1), stoppedLine, chief].filter(Boolean).join(' ') };
}

export function createBattleUi(ctx) {
  const base = seamBase();
  if (!ctx || !ctx.world) return base;
  const world = ctx.world, root = ctx.root;
  resetBattleHooks();                                                    // a new game: nothing held over from a dev scene
  setBattleHooks({ motion: () => (ctx.effects && ctx.effects.motion) || 'full', now: () => ctx.now() });
  const banner = root && root.querySelector ? root.querySelector('#banner') : null;
  let moment = null;                  // { report, day, node } while a result is held
  let observer = null, syncing = false;

  const phone = () => { const l = ctx.store.get().layout; return l === 'portrait' || l === 'compact'; };
  // The raid report's caption (danger.js shows it on the same raid_end, an info caption with the report's longer words) is taken down when the result goes up:
  // the result row says the same, and on a landscape phone only one row sits under the top bar (the mobile budget). Only that caption, whether it is showing or
  // still waiting behind another (celebrations.drop): every other caption, showing or waiting, is left with its own timers, and one waiting behind the report
  // takes the row as it goes. Version 6.0.1: it used to empty the whole queue, and only when the report's caption was the one on screen.
  function dropReportCaption(report) {
    if (!ctx.celebrations || typeof ctx.celebrations.drop !== 'function') return;
    const words = DANGER_UI_TEXT.raidReport(report);
    ctx.celebrations.drop((c) => `${c.lead || ''}${c.text}`.trim() === words);
  }
  // A critical alert has the row when it is one that urges (a fire, a raid warning, debt): a polite one (a letter from the court) gives way to the result.
  const criticalShowing = () => Boolean(banner) && [...banner.querySelectorAll('.critical:not(.moment)')].some((n) => !POLITE.has(n.dataset.code));

  function build(report) {
    const won = Boolean(report.won), t = momentWords(report);
    const node = el('div', { class: 'critical moment', dataset: { code: won ? 'raid_beaten' : 'raid_lost' } }, [
      icon(won ? '✔' : '⚠'),
      el('span', { class: 'text' }, [el('strong', { text: t.title }), ' ', el('span', { class: 'small', text: t.detail })]),
      el('span', { class: 'buttons' }, [
        button(B2_TEXT.report, { class: 'report', 'aria-label': B2_TEXT.reportLabel, onClick: () => ctx.store.set(openSheet(ctx.store.get(), 'summary')) }),
        iconButton(B2_TEXT.dismissLabel, '✕', { class: 'dismiss quiet', onClick: () => clearMoment() }),     // an icon, so the words keep the phone's one line
      ]),
    ]);
    return node;
  }

  // Puts the held result in the banner, or takes it out, as the layout and the other alerts allow.
  function sync() {
    if (!banner || syncing) return;
    syncing = true;
    try {
      if (moment && world.day - moment.day >= MOMENT.days) { moment.node.remove(); moment = null; }
      if (moment) moment.node.classList.toggle('line', phone());            // the phone's one-line alert row
      const show = Boolean(moment) && !(phone() && criticalShowing());
      banner.classList.toggle('moment-up', show && phone());                // on a phone the result takes the one-line row: a letter waits behind it (CSS)
      if (show && moment.node.parentNode !== banner) banner.append(moment.node);
      else if (!show && moment && moment.node.parentNode === banner) moment.node.remove();
      if (show) root.classList.add('has-banner');
      else if (!banner.querySelector('.critical')) root.classList.remove('has-banner');
    } finally { syncing = false; }
  }

  function clearMoment() {
    if (moment) { moment.node.remove(); moment = null; }
    sync();
  }

  if (banner && typeof MutationObserver === 'function') {
    observer = new MutationObserver(() => { if (moment) sync(); });
    observer.observe(banner, { childList: true });
  }

  // The result is said once to a screen reader, politely (the alerts' own announcer, #live).
  const announce = (text) => {
    const live = root && root.querySelector ? root.querySelector('#live') : null;
    if (!live) return;
    live.setAttribute('aria-live', 'polite');
    live.textContent = text;
  };

  return {
    ...base,
    onEvents(events) {
      for (const e of events || []) {
        if (e.type === 'raid_start') {
          clearMoment();
          if (world.raid.active && world.raid.active.chiefs && typeof ctx.fireTip === 'function') ctx.fireTip('chiefBanner');
        } else if (e.type === 'raid_warning') clearMoment();
        else if (e.type === 'raid_end' && e.report) {
          if (moment) moment.node.remove();
          moment = { report: e.report, day: world.day, node: build(e.report) };
          const t = momentWords(e.report);
          announce(`${t.title}. ${t.detail}`);
          sync();
          if (moment.node.parentNode === banner) dropReportCaption(e.report);   // the result is up: the caption saying the same goes (while a fire holds a phone's row, the caption stays)
        }
      }
    },
    refresh() { sync(); },
    destroy() {
      if (observer) observer.disconnect();
      if (moment) moment.node.remove();
      if (banner) banner.classList.remove('moment-up');
      moment = null;
      resetBattleHooks();                                                // the Motion level and clock of a game that is gone are not the renderer's
    },
  };
}
