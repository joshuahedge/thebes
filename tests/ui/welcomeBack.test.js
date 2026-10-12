import { describe, it, expect } from '../harness.js';
import { elapsedText, trendText, trendDirection, closestAchievement } from '../../src/ui/welcomeBack.js';
import { T, alertText, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, closestAchievementText, progressText } from '../../src/ui/text.js';
import { GOALS, GUIDE_GOALS } from '../../src/data/goals.js';
import { startDaily, dailyProgress } from '../../src/sim/daily.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
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
    expect(sheet.querySelector('.alert-list .view').getAttribute('aria-label')).toBe(`${T.view}: ${alertText({ code: 'debt' }, r.world).title}`);
    // On a phone the card is a sheet: only the alert row stays above it; the goals strip waits (ruling 168).
    expect([getComputedStyle(r.root.querySelector('#goals')).display, getComputedStyle(r.root.querySelector('#banner')).display === 'none']).toEqual(['none', false]);
    fire(sheet.querySelector('.alert-list .view'), 'click');
    expect(r.store.get().sheet.kind).toBe('summary');
    r.store.set({ sheet: { kind: 'welcome', id: null } });
    fire(r.root.querySelector('#sheet .carry-on'), 'click');
    expect(r.world.speed).toBe(2);
    expect(r.store.get().lastSpeed).toBe(2);
    expect(r.store.get().sheet).toBe(null);
    expect(getComputedStyle(r.root.querySelector('#goals')).display === 'none').toBe(false);   // the strip is back once the card has gone
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
  it('compares with the row three months back however long the history is, and says which way it went', () => {
    const rows = [100, 110, 120, 130, 140, 150].map((people, i) => ({ day: 30 * (i + 1), people, gold: 0, mood: 60 }));
    expect(trendText('People', 160, rows, 'people')).toBe('People 160, up from 120');
    expect(trendDirection(160, rows, 'people')).toBe('up');
    expect(trendDirection(100, rows, 'people')).toBe('down');
    expect(trendDirection(120, rows, 'people')).toBe('steady');
    expect(trendDirection(5, [], 'people')).toBe(null);
  });
  it('picks the unfinished achievement nearest to done', () => {
    const w = makeTestWorld();
    w.achievements = [];
    expect(closestAchievement(w)).toBe(null);                                   // nothing started
    for (let i = 0; i < 8; i++) addRaw(w, 'house', 10 + i, 5);
    const c = closestAchievement(w);
    expect([c.def.id, c.n, c.of]).toEqual(['neighbours', 8, 10]);
    addRaw(w, 'house', 18, 5); addRaw(w, 'house', 19, 5);
    expect(closestAchievement(w).def.id).toBe('street');                        // 10 of 10 is finished, recorded or not
    w.achievements = ['neighbours'];
    expect(closestAchievement(w).def.id).toBe('street');
  });
  it('marks trends with ▲ and ▼ beside the words, lists today\'s goals and names the closest achievement', async () => {
    const r = await rigUI({ welcome: { savedAt: Date.now() - H, lastSpeed: 1 } });
    try {
      r.world.history = [{ day: 30, people: 4, gold: r.world.gold + 500, mood: r.world.mood }];
      r.ui.refresh();
      const sheet = r.root.querySelector('#sheet');
      const rows = [...sheet.querySelectorAll('.trends li')];
      expect(rows[0].querySelector('.trend.up').textContent).toBe('▲');
      expect(rows[0].querySelector('.trend').getAttribute('aria-hidden')).toBe('true');
      expect(rows[0].textContent).toContain(`${T.people} 8, ${T.upFrom} 4`);
      expect(rows[1].querySelector('.trend.down').textContent).toBe('▼');
      expect(rows[2].querySelector('.trend')).toBe(null);                        // steady: the words only
      expect(rows[2].textContent).toContain(T.steadyAt);
      expect(sheet.querySelector('.today')).toBe(null);                          // no daily goals before the opening chain is done
      expect(sheet.querySelector('.closest')).toBe(null);                        // achievements stay hidden while the guide runs
      for (const id of GUIDE_GOALS) if (!r.world.goals.completed.includes(id)) r.world.goals.completed.push(id);
      expect(startDaily(r.world, '2026-10-11')).toBe(true);
      r.world.achievements = [];
      r.ui.refresh();
      const today = sheet.querySelector('.today');
      expect(today.previousElementSibling.textContent).toBe(T.today);
      expect(today.querySelectorAll('li').length).toBe(3);
      const first = r.world.daily.picks[0];
      const p = dailyProgress(r.world, first);
      expect(today.querySelector('li').textContent).toContain(DAILY_TEXT[first]);
      expect(today.querySelector('li').textContent).toContain(progressText(p.n, p.of));
      const c = closestAchievement(r.world);
      expect(c === null).toBe(false);
      expect(sheet.querySelector('.closest').textContent).toBe(closestAchievementText(ACHIEVEMENT_NAMES[c.def.id], c.n, c.of, ACHIEVEMENT_TEXT[c.def.id]));
      expect(sheet.querySelector('.closest').textContent).toContain(ACHIEVEMENT_TEXT[c.def.id]);   // what it takes, not only how far along
      expect(closestAchievementText('Neighbours', 7, 10, 'Have 10 homes')).toBe('Closest achievement: Neighbours, 7 of 10. Have 10 homes');
    } finally { r.cleanup(); }
  });
  it('still opens when a saved daily goal is no longer in the pool, showing its row without a count', async () => {
    const r = await rigUI({ welcome: { savedAt: Date.now() - H, lastSpeed: 1 } });
    try {
      for (const id of GUIDE_GOALS) if (!r.world.goals.completed.includes(id)) r.world.goals.completed.push(id);
      expect(startDaily(r.world, '2026-10-11')).toBe(true);
      r.world.daily.picks[1] = 'retired_goal';                                  // a pick a later version dropped from DAILY_POOL
      expect(dailyProgress(r.world, 'retired_goal')).toBe(null);
      r.ui.refresh();
      const items = [...r.root.querySelectorAll('#sheet .today li')];
      expect(items.length).toBe(3);
      expect(items[1].textContent).toBe('retired_goal');
      expect(items[1].querySelector('.status')).toBe(null);
      expect(r.root.querySelector('#sheet .carry-on')).toBeTruthy();            // the rest of the card is there
    } finally { r.cleanup(); }
  });
  it('shows a finished daily goal as Done in words and an unfinished one as its count in words', async () => {
    const r = await rigUI({ welcome: { savedAt: Date.now() - H, lastSpeed: 1 } });
    try {
      for (const id of GUIDE_GOALS) if (!r.world.goals.completed.includes(id)) r.world.goals.completed.push(id);
      expect(startDaily(r.world, '2026-10-11')).toBe(true);
      const [done, open] = r.world.daily.picks;
      r.world.daily.done.push(done);
      r.ui.refresh();
      const items = [...r.root.querySelectorAll('#sheet .today li')];
      expect(items[0].classList.contains('done')).toBe(true);
      expect(items[0].textContent).toContain(T.done);
      expect(items[0].querySelector('[aria-hidden="true"]').textContent).toContain(T.doneMark);   // the tick is decoration; Done says it
      const p = dailyProgress(r.world, open);
      expect(items[1].classList.contains('done')).toBe(false);
      expect(items[1].textContent).toContain(DAILY_TEXT[open]);
      expect(items[1].textContent).toContain(progressText(p.n, p.of));
      expect(items[1].textContent.includes(T.done)).toBe(false);
    } finally { r.cleanup(); }
  });
});
