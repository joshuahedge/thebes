import { describe, it, expect } from '../harness.js';
import { elapsedText, trendText } from '../../src/ui/welcomeBack.js';
import { T, alertText } from '../../src/ui/text.js';
import { GOALS } from '../../src/data/goals.js';
import { fire } from '../helpers/dom.js';
import { rigUI } from '../helpers/uiWorld.js';

const H = 3600 * 1000;

describe('ui welcome back', () => {
  it('describes how long ago and which way the numbers moved', () => {
    const now = 1760000000000;
    expect(elapsedText(now - 20 * 1000, now)).toBe(T.justNow);
    expect(elapsedText(now - 5 * 60 * 1000, now)).toBe('5 minutes ago');
    expect(elapsedText(now - 1 * H, now)).toBe('1 hour ago');
    expect(elapsedText(now - 50 * H, now)).toBe('2 days ago');
    expect(elapsedText(null, now)).toBe(T.aWhileAgo);
    const history = [{ day: 30, people: 96, gold: 2000, mood: 60 }, { day: 60, people: 100, gold: 1900, mood: 58 }, { day: 90, people: 110, gold: 1800, mood: 55 }, { day: 120, people: 115, gold: 1700, mood: 52 }];
    expect(trendText('People', 120, history, 'people')).toBe('People 120, up from 96');
    expect(trendText('Gold', 1500, history, 'gold')).toBe('Gold 1500, down from 2000');
    expect(trendText('Mood', 60, history.slice(0, 1), 'mood')).toBe('Mood 60, steady at 60');
    expect(trendText('Mood', 60, [], 'mood')).toBe('Mood 60');
  });
  it('opens at boot with the date, trends, goals and alerts, and Carry on restores the speed', async () => {
    const r = await rigUI({ welcome: { savedAt: Date.now() - 2 * H, lastSpeed: 2 } });
    r.world.gold = -5;
    r.ui.alerts.refresh();
    r.ui.refresh();
    const s = r.store.get();
    expect(s.sheet.kind).toBe('welcome');
    const sheet = r.root.querySelector('#sheet');
    expect(sheet.querySelector('h2').textContent).toBe(T.welcome);
    expect(sheet.textContent).toContain('2 hours ago');
    expect(sheet.textContent).toContain('Year 1, month 1, day 1');
    expect(sheet.textContent).toContain(`${T.people} 8`);
    expect(sheet.textContent).toContain(GOALS[0].text);
    expect(sheet.textContent).toContain(alertText({ code: 'debt' }, r.world).title);
    fire(sheet.querySelector('.alert-list .view'), 'click');
    expect(r.store.get().sheet.kind).toBe('summary');
    r.store.set({ sheet: { kind: 'welcome', id: null } });
    fire(r.root.querySelector('#sheet .carry-on'), 'click');
    expect(r.world.speed).toBe(2);
    expect(r.store.get().lastSpeed).toBe(2);
    expect(r.store.get().sheet).toBe(null);
    r.cleanup();
    const stay = await rigUI({ welcome: { savedAt: null, lastSpeed: 3 } });
    expect(stay.root.querySelector('#sheet').textContent).toContain(T.aWhileAgo);
    expect(stay.store.get().lastSpeed).toBe(3);                                // the saved speed survives Stay paused and a later autosave
    fire(stay.root.querySelector('#sheet .stay-paused'), 'click');
    expect(stay.world.speed).toBe(0);
    expect(stay.store.get().sheet).toBe(null);
    stay.cleanup();
    const fresh = await rigUI();
    expect(fresh.store.get().sheet).toBe(null);
    fresh.cleanup();
  });
});
