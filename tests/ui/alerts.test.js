import { describe, it, expect } from '../harness.js';
import { CRITICAL, triage, mapSummaryText, createAlerts, nearestOf } from '../../src/ui/alerts.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { alertText, T } from '../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

function rig() {
  const { root, cleanup } = mount('<div id="banner"></div><p id="live"></p>');
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  const farm = addRaw(world, 'farm_grain', 2, 11, { blocked: 'no_storage' });
  staffAll(world);
  return { root, world, farm, banner: root.querySelector('#banner'), live: root.querySelector('#live'), cleanup };
}

describe('ui alerts', () => {
  it('drops alerts for buildings that are gone and splits critical from ordinary', () => {
    const { world, farm, cleanup } = rig();
    world.gold = -1;
    const stale = [...alertsFor(world), { code: 'no_road', id: 999 }];
    const t = triage(world, stale);
    expect(t.all.map((a) => a.code)).toEqual(['no_storage', 'debt']);
    expect(t.critical.map((a) => a.code)).toEqual(['debt']);
    expect(t.ordinary.map((a) => a.code)).toEqual(['no_storage']);
    expect(t.ordinary[0].id).toBe(farm.id);
    expect(CRITICAL.has('debt')).toBe(true);
    expect(mapSummaryText(world, t.all)).toContain(alertText(t.all[0], world).title);
    expect(mapSummaryText(world, [])).toContain(T.noAlerts);
    cleanup();
  });
  it('renders the banner for critical alerts, counts the rest, and announces each change once', () => {
    const r = rig();
    let alerts = [{ code: 'no_storage', id: r.farm.id }];
    const seen = [];
    const a = createAlerts({ world: r.world, banner: r.banner, live: r.live, root: r.root, onView: (x) => seen.push(x.code), getAlerts: () => alerts });
    a.refresh();
    expect(a.count()).toBe(1);
    expect(a.critical().length).toBe(0);
    expect(r.root.classList.contains('has-banner')).toBe(false);
    expect(r.live.textContent).toContain(alertText(alerts[0], r.world).title);
    r.live.textContent = 'unchanged';
    a.refresh();
    expect(r.live.textContent).toBe('unchanged');           // same alerts: nothing new to announce
    alerts = [...alerts, { code: 'debt' }];
    a.refresh();
    expect(r.root.classList.contains('has-banner')).toBe(true);
    const row = r.banner.querySelector('.critical');
    expect(row.textContent).toContain(alertText({ code: 'debt' }, r.world).title);
    expect(a.count()).toBe(1);
    expect(a.list().length).toBe(2);
    expect(r.live.textContent).toContain('2 alerts');
    expect(row.querySelector('.view').getAttribute('aria-label')).toBe(`${T.view}: ${alertText({ code: 'debt' }, r.world).title}`);
    fire(row.querySelector('.view'), 'click');
    expect(seen).toEqual(['debt']);
    a.refresh();                                              // same critical set: the row is kept, not rebuilt
    expect(r.banner.querySelector('.critical') === row).toBe(true);
    expect(r.banner.querySelector('[role]')).toBe(null);       // #live is the one announcer; rows carry no role
    alerts = [{ code: 'no_storage', id: r.farm.id }];
    a.refresh();
    expect(row.isConnected).toBe(false);                       // debt left the critical set: the row is removed
    alerts = [{ code: 'debt' }];
    a.refresh();
    expect(r.banner.querySelector('.critical') !== row).toBe(true);   // debt came back: a fresh row
    alerts = [];
    a.refresh();
    expect(r.root.classList.contains('has-banner')).toBe(false);
    expect(r.banner.children.length).toBe(0);
    expect(r.live.textContent).toBe(T.noAlerts);
    r.cleanup();
  });
  it('keeps "N plots have no road" in the warning tier: it counts in the Map badge and never takes the banner (placement review P13)', () => {
    const r = rig();
    const a = addRaw(r.world, 'house', 20, 20), b = addRaw(r.world, 'house', 22, 20);
    let alerts = alertsFor(r.world);
    const found = alerts.filter((x) => x.code === 'plots_no_road');
    expect(found).toEqual([{ code: 'plots_no_road', count: 2, ids: [a.id, b.id] }]);
    expect(CRITICAL.has('plots_no_road')).toBe(false);
    expect(triage(r.world, alerts).ordinary.map((x) => x.code)).toEqual(['no_storage', 'plots_no_road']);
    let phone = false;
    const ui = createAlerts({ world: r.world, banner: r.banner, live: r.live, root: r.root, getAlerts: () => alerts, phone: () => phone });
    ui.refresh();
    expect([ui.count(), ui.critical().length, r.root.classList.contains('has-banner')]).toEqual([2, 0, false]);   // the farm's alert and the plots'
    phone = true;
    ui.refresh();
    expect(ui.count()).toBe(2);
    expect(r.live.textContent).toContain('2 plots have no road');
    r.live.textContent = 'unchanged';
    const c = addRaw(r.world, 'house', 24, 20);
    alerts = alertsFor(r.world);                                                       // one more plot: "3 plots", announced again
    ui.refresh();
    expect(r.live.textContent).toContain('3 plots have no road');
    expect(c.id).toBeGreaterThan(b.id);
    r.cleanup();
  });
  it('goes to the plot nearest a point (the middle of the view), not a fixed one', () => {
    const { world, cleanup } = rig();
    const a = addRaw(world, 'house', 2, 20), b = addRaw(world, 'house', 25, 25);
    const alert = { code: 'plots_no_road', count: 2, ids: [a.id, b.id] };
    expect(nearestOf(world, alert, { x: 0, y: 18 }).id).toBe(a.id);
    expect(nearestOf(world, alert, { x: 30, y: 30 }).id).toBe(b.id);
    expect(nearestOf(world, { ...alert, ids: [999] }, { x: 0, y: 0 })).toBe(null);     // a plot that has gone
    cleanup();
  });
});
