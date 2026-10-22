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
//    row, showing when it is free, so it never adds a row;
//  - fires the chieftain tip the first time a raid with a chieftain starts.
import { seamBase } from '../s46/seam.js';
import { setBattleHooks, resetBattleHooks } from '../../render/units.js';
import { MOMENT } from '../../data/battle.js';
import { openSheet } from '../modes.js';
import { POLITE } from '../alerts.js';
import { B2_TEXT } from '../text.js';
import { el, button, icon, iconButton } from '../components.js';

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
  // On a landscape phone only one row sits under the top bar (the mobile budget): the raid report's caption (danger.js, an info caption, shown first) has
  // it while it is up, so the result waits for it to go.
  const cheer = root && root.querySelector ? root.querySelector('#cheer') : null;
  const captionUp = () => ctx.store.get().layout === 'compact' && Boolean(cheer) && Boolean(cheer.querySelector('.cheer'));
  // A critical alert has the row when it is one that urges (a fire, a raid warning, debt): a polite one (a letter from the court) gives way to the result.
  const criticalShowing = () => Boolean(banner) && [...banner.querySelectorAll('.critical:not(.moment)')].some((n) => !POLITE.has(n.dataset.code));

  function build(report) {
    const won = Boolean(report.won), t = B2_TEXT.moment(report);
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
      const show = Boolean(moment) && !(phone() && criticalShowing()) && !captionUp();
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
    if (cheer) observer.observe(cheer, { childList: true });             // a caption coming or going may free the row
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
          const t = B2_TEXT.moment(e.report);
          announce(`${t.title}. ${t.detail}`);
          sync();
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
