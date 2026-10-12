// Alert triage (spec 6.3): critical alerts share one banner under the top bar; the rest feed the badge and the
// minimap sheet's list. Every change is announced once through the aria-live region (spec 6.8).
// Stage 3 (Track D): three tiers and one banner. The banner holds the highest-ranked critical, ranked by how soon harm
// lands (an active raid, a fire no staffed firehouse reaches, a raid warning, debt, save failing; ruling 166); the others
// wait behind "+N more", which opens the minimap sheet's list. Repeated fires roll into one line whose View steps through
// them. A raid warning carries Pay tribute (not on the first raid) beside the defence it could buy, and collapses to a
// countdown chip in the same slot.
// Phones (the portrait and compact layouts, ruling 167): the banner is the alert row, always one line: icon, words, View.
// A raid warning is its countdown chip from the start, and the chip's words open the raid sheet (the tribute sheet), which
// holds the arrival, the defence and Pay tribute; there is no Shrink and no "+N more", and the Map badge counts every alert
// the banner is not showing, criticals included. Wide screens keep the full banner.
import { alertsFor } from '../sim/alerts.js';
import { tributeQuote } from '../sim/raids.js';
import { summaryData } from './hud.js';
import { alertText, dateText, plural, viewLabel, T, DANGER_UI_TEXT } from './text.js';
import { el, button, clear, setText } from './components.js';

// The sim has no severity field, so the UI decides (1a follow-up). CRITICAL_RANK is the banner's order (spec 6.3): how
// soon harm lands. A fire no staffed firehouse reaches burns out in 7-10 s at 1x, a warning gives about 60 s, so the fire
// is never hidden behind raiders who are months away (ruling 166).
export const CRITICAL_RANK = ['raid', 'fire', 'raid_warning', 'debt', 'save_failed'];
export const CRITICAL = new Set(CRITICAL_RANK);

const keyOf = (a) => `${a.code}:${a.id === undefined ? '' : a.id}:${a.level || ''}`;
const rankOf = (a) => CRITICAL_RANK.indexOf(a.code);
// A raid's alerts sit at a map point (the entry, or the band's centre), not on a building.
export const isPointAlert = (a) => (a.id === undefined || a.id === null) && Number.isFinite(a.x) && Number.isFinite(a.y);

export function triage(world, alerts = alertsFor(world)) {
  const all = alerts.filter((a) => a.id === undefined || a.id === null || Boolean(world.buildings[a.id]));
  const critical = all.filter((a) => CRITICAL.has(a.code)).sort((a, b) => rankOf(a) - rankOf(b));   // stable: ascending id within a code
  return { all, critical, ordinary: all.filter((a) => !CRITICAL.has(a.code)) };
}

export function mapSummaryText(world, alerts) {
  const d = summaryData(world);
  const head = `${T.gold} ${d.gold}. ${plural(d.people, 'person', 'people')}. ${T.mood} ${d.mood}. ${dateText(d.date)}.`;
  if (!alerts.length) return `${head} ${T.noAlerts}.`;
  return `${head} ${plural(alerts.length, 'alert', 'alerts')}: ${alerts.map((a) => alertText(a, world).title).join('. ')}.`;
}

// What the one banner shows for a critical list (ranked), or null: the alerts its row stands for (every fire when the top
// one is a fire), its words (a raid warning's with its arrival), the defence line and tribute for a raid warning, the
// countdown chip's words, and how many other criticals wait behind "+N more". Pure, so the banner and the tests share it.
export function bannerModel(world, critical) {
  if (!critical.length) return null;
  const top = critical[0];
  const group = top.code === 'fire' ? critical.filter((a) => a.code === 'fire') : [top];
  const D = DANGER_UI_TEXT;
  const words = group.length > 1 ? { title: D.firesTitle(group.length), fix: D.firesFix } : alertText(top, world);
  const m = { code: top.code, group, title: words.title, fix: words.fix, more: critical.length - group.length, defence: '', tribute: false, chip: '' };
  if (top.code === 'raid_warning') {
    const q = tributeQuote(world);
    // Track B's raid_warning fix words the same towers the defence line does (ruling 6: D words the banner's defence),
    // so with a quote the row carries the title and the defence line only, never the defence twice.
    if (q) { m.defence = D.defenceLine(q, top.dir); m.tribute = !q.hidden; m.fix = ''; }
    // Spec 6.3: the title carries the countdown ("… storehouses. They arrive in 2 months 12 days."), so it stays at
    // every text size; the chip abbreviates it. raidDay brings the raiders in on the arrives day (src/sim/raids.js).
    const left = Math.max(0, top.arrives - world.day);
    m.title = D.withArrival(m.title, left);
    m.chip = D.chip(top.dir, left);
  }
  return m;
}

// onAction (Stage 3): a button on an alert other than View, as onAction(alert, kind): 'tribute' (Pay tribute), 'more' (+N
// more: the alert list), 'warning' (a phone chip's words: the raid sheet) and 'view' for an alert at a map point (the
// danger interface moves the camera there). phone() says whether the layout is a phone's (portrait or compact).
export function createAlerts({ world, banner, live, onView = () => {}, onAction = () => {}, onNewCritical = () => {}, root = document.body, getAlerts = () => alertsFor(world), phone = () => false }) {
  let current = { all: [], critical: [], ordinary: [] };
  let lastKeys = null;
  let lastCriticalKeys = null;
  let lastSig = null;
  let step = 0;                     // the rolled-up fire row's View: which fire it shows next
  let shown = 0;                    // how many alerts the banner stands for (every fire when it is the fires' row)
  const collapsed = new Set();      // raid warnings (by arrival day) the player shrank to the chip

  // Ruling 9: one announcer (#live, no role="alert" on the rows); a change that brings a new critical is announced at
  // once (assertive), every other change politely.
  function announce(urgent) {
    const keys = current.all.map(keyOf).sort().join('|');
    if (keys === lastKeys) return;
    lastKeys = keys;
    live.setAttribute('aria-live', urgent ? 'assertive' : 'polite');
    if (!current.all.length) { setText(live, T.noAlerts); return; }
    setText(live, `${plural(current.all.length, 'alert', 'alerts')}: ${current.all.map((a) => alertText(a, world).title).join('. ')}`);
  }

  function view(m) {
    const a = m.group[step % m.group.length];
    step += 1;
    if (isPointAlert(a)) onAction(a, 'view');
    else onView(a);
  }

  // The phone's alert row (ruling 167): one line, the icon, the words and View. A raid warning's words are its countdown
  // chip, a button that opens the raid sheet; any other critical's words are its title (the fix is in the alert list).
  function phoneRow(m, viewButton) {
    const D = DANGER_UI_TEXT;
    const top = m.group[0];
    const words = m.chip
      ? button(m.chip, { class: 'warning quiet', 'aria-label': D.chipOpenLabel(m.chip), onClick: () => onAction(top, 'warning') })
      : el('strong', { text: m.title });
    return el('div', { class: m.chip ? 'critical line chip' : 'critical line', dataset: { code: m.code } }, [
      el('span', { class: 'icon', 'aria-hidden': 'true', text: m.chip ? '⚑' : '⚠' }),
      el('span', { class: 'text' }, [words]),
      el('span', { class: 'buttons' }, [viewButton]),
    ]);
  }

  function renderBanner(m) {
    const focused = banner.contains(document.activeElement) ? [...document.activeElement.classList].find((c) => ['view', 'tribute', 'collapse', 'expand', 'more', 'warning'].includes(c)) : null;
    clear(banner);
    root.classList.toggle('has-banner', Boolean(m));
    if (!m) return;
    const D = DANGER_UI_TEXT;
    const top = m.group[0];
    if (phone()) {
      banner.append(phoneRow(m, button(T.view, { class: 'view', 'aria-label': viewLabel(m.chip || m.title), onClick: () => view(m) })));
      if (focused) { const again = banner.querySelector(`.${focused}`) || banner.querySelector('.view'); if (again) again.focus(); }
      return;
    }
    const viewButton = button(T.view, { class: 'view', 'aria-label': viewLabel(m.chip && collapsed.has(top.arrives) ? m.chip : m.title), onClick: () => view(m) });
    const more = m.more > 0 ? button(D.more(m.more), { class: 'more quiet', 'aria-label': D.moreLabel(m.more), onClick: () => onAction(top, 'more') }) : null;
    if (m.chip && collapsed.has(top.arrives)) {
      // The chip is one line: its words are the button that shows the whole warning again, then View.
      banner.append(el('div', { class: 'critical chip', dataset: { code: m.code } }, [
        el('span', { class: 'icon', 'aria-hidden': 'true', text: '⚑' }),
        el('span', { class: 'text' }, [
          button(m.chip, { class: 'expand quiet', 'aria-expanded': 'false', title: D.expand, onClick: () => { collapsed.delete(top.arrives); refresh(true); } }),
        ]),
        el('span', { class: 'buttons' }, [viewButton, more]),
      ]));
    } else {
      banner.append(el('div', { class: 'critical', dataset: { code: m.code } }, [
        el('span', { class: 'icon', 'aria-hidden': 'true', text: m.chip ? '⚑' : '⚠' }),
        el('span', { class: 'text' }, [
          el('strong', { text: m.title }), m.fix ? ' ' : null, m.fix ? el('span', { class: 'small', text: m.fix }) : null,
          m.defence ? el('span', { class: 'defence small' }, [m.defence]) : null,
        ]),
        el('span', { class: 'buttons' }, [
          viewButton,
          m.tribute ? button(D.payTribute, { class: 'tribute', onClick: () => onAction(top, 'tribute') }) : null,
          m.chip ? button(D.collapse, { class: 'collapse quiet', 'aria-expanded': 'true', 'aria-label': D.collapseLabel, onClick: () => { collapsed.add(top.arrives); refresh(true); } }) : null,
          more,
        ]),
      ]));
    }
    if (focused) {
      // Shrink and the chip's Show the whole warning swap places, so focus goes to the one that undoes the press.
      const swapped = { collapse: 'expand', expand: 'collapse' }[focused] || focused;
      const again = banner.querySelector(`.${swapped}`) || banner.querySelector('.view');
      if (again) again.focus();
    }
  }

  function refresh(force = false) {
    current = triage(world, getAlerts());
    const criticalKeys = current.critical.map(keyOf).sort().join('|');
    let fresh = false;
    if (criticalKeys !== lastCriticalKeys) {
      const before = new Set((lastCriticalKeys || '').split('|').filter(Boolean));
      fresh = current.critical.some((a) => !before.has(keyOf(a)));
      if (fresh) onNewCritical();   // a fresh problem, not a cleared one
      lastCriticalKeys = criticalKeys;
      step = 0;
    }
    // The row is rebuilt only when what it says changes (a new top alert, the countdown's day, a collapse), so a
    // daily refresh keeps the same row and its focus.
    const m = bannerModel(world, current.critical);
    shown = m ? m.group.length : 0;
    const sig = m ? JSON.stringify([criticalKeys, m.title, m.fix, m.defence, m.tribute, m.chip, m.more, m.chip ? collapsed.has(m.group[0].arrives) : false, phone()]) : '';
    if (force || sig !== lastSig) { lastSig = sig; renderBanner(m); }
    announce(fresh);
  }

  return {
    refresh: () => refresh(false),
    // The Map badge's count: on wide screens the warnings (the banner's "+N more" counts the other criticals); on phones
    // every alert the banner is not showing, criticals included (ruling 167).
    count: () => (phone() ? current.all.length - shown : current.ordinary.length),
    list: () => current.all,
    critical: () => current.critical,
    action: (alert, kind) => onAction(alert, kind),
  };
}
