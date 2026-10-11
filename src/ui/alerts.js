// Alert triage (spec 6.3): critical alerts become a banner under the top bar; the rest feed the badge and
// the minimap sheet's list. Every change is announced once through the aria-live region (spec 6.8).
import { alertsFor } from '../sim/alerts.js';
import { summaryData } from './hud.js';
import { alertText, dateText, plural, viewLabel, T } from './text.js';
import { el, button, clear, setText } from './components.js';

// The sim has no severity field, so the UI decides (1a follow-up). Raids and fire join this set in Stage 3.
export const CRITICAL = new Set(['debt', 'save_failed']);

const keyOf = (a) => `${a.code}:${a.id === undefined ? '' : a.id}:${a.level || ''}`;

export function triage(world, alerts = alertsFor(world)) {
  const all = alerts.filter((a) => a.id === undefined || a.id === null || Boolean(world.buildings[a.id]));
  return { all, critical: all.filter((a) => CRITICAL.has(a.code)), ordinary: all.filter((a) => !CRITICAL.has(a.code)) };
}

export function mapSummaryText(world, alerts) {
  const d = summaryData(world);
  const head = `${T.gold} ${d.gold}. ${plural(d.people, 'person', 'people')}. ${T.mood} ${d.mood}. ${dateText(d.date)}.`;
  if (!alerts.length) return `${head} ${T.noAlerts}.`;
  return `${head} ${plural(alerts.length, 'alert', 'alerts')}: ${alerts.map((a) => alertText(a, world).title).join('. ')}.`;
}

export function createAlerts({ world, banner, live, onView = () => {}, onNewCritical = () => {}, root = document.body, getAlerts = () => alertsFor(world) }) {
  let current = { all: [], critical: [], ordinary: [] };
  let lastKeys = null;
  let lastCriticalKeys = null;

  function announce() {
    const keys = current.all.map(keyOf).sort().join('|');
    if (keys === lastKeys) return;
    lastKeys = keys;
    if (!current.all.length) { setText(live, T.noAlerts); return; }
    setText(live, `${plural(current.all.length, 'alert', 'alerts')}: ${current.all.map((a) => alertText(a, world).title).join('. ')}`);
  }

  function renderBanner() {
    clear(banner);
    for (const a of current.critical) {
      const t = alertText(a, world);
      banner.append(el('div', { class: 'critical' }, [
        el('span', { class: 'icon', 'aria-hidden': 'true', text: '⚠' }),
        el('span', { class: 'text' }, [el('strong', { text: t.title }), ' ', el('span', { class: 'small', text: t.fix })]),
        button(T.view, { class: 'view', 'aria-label': viewLabel(t.title), onClick: () => onView(a) }),
      ]));
    }
    root.classList.toggle('has-banner', current.critical.length > 0);
  }

  return {
    refresh() {
      current = triage(world, getAlerts());
      const criticalKeys = current.critical.map(keyOf).sort().join('|');
      if (criticalKeys !== lastCriticalKeys) {
        const before = new Set((lastCriticalKeys || '').split('|').filter(Boolean));
        if (current.critical.some((a) => !before.has(keyOf(a)))) onNewCritical();   // a fresh problem, not a cleared one
        lastCriticalKeys = criticalKeys;
        renderBanner();
      }
      announce();
    },
    count: () => current.ordinary.length,
    list: () => current.all,
    critical: () => current.critical,
  };
}
