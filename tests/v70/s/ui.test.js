// Version 7.0 Track S (rulings 930-959, 933, 935): the interface of seasons, light and sound. The top bar's date adds the season's name (fits at 375 px
// and 150% text, and at the sizes of the UX rules); Settings has Day and night, an Effects volume and the Sound switch's note, each a real control with an
// accessible name, a 44 px target and a keyboard path; the two tips fire once, on their moment; How to play has the words.
import { describe, it, expect } from '../../harness.js';
import { rigUI, runningUiWorld } from '../../helpers/uiWorld.js';
import { fire, key, flush } from '../../helpers/dom.js';
import { openSheet } from '../../../src/ui/modes.js';
import { createMenuSheets } from '../../../src/ui/menu.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { createSettings } from '../../../src/ui/settings.js';
import { SEASON_TEXT, V70_HELP, TIP_TEXT, T, seasonMonths } from '../../../src/ui/text.js';
import { SEASON_IDS, LIGHT, SEASON_TIPS } from '../../../src/data/seasons.js';
import { TIPS, SEASONS } from '../../../src/data/tips.js';
import { dayIn } from '../../../src/dev/v70/seasons.js';
import { setLightClock } from '../../../src/render/light.js';
import { seasonAt } from '../../../src/sim/seasons.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { mountShell } from '../../helpers/uiWorld.js';

const NIGHT_MS = (LIGHT.day + LIGHT.dusk + LIGHT.night / 2) * LIGHT.cycleMs;
const within = (inner, outer, slack = 0.5) => inner.left >= outer.left - slack && inner.right <= outer.right + slack && inner.top >= outer.top - slack && inner.bottom <= outer.bottom + slack;
const textBox = (node) => { const range = document.createRange(); range.selectNodeContents(node); return range.getBoundingClientRect(); };

describe('v70 s ui: the top bar names the season', () => {
  const SIZES = [[375, 667], [390, 844], [667, 375], [844, 390], [1280, 800], [1920, 1080]];
  it('shows Flood, Growing or Harvest under the date, the date\'s own season, in every layout at 100%, 125% and 150% text, whole inside the bar', async () => {
    for (const [w, h] of SIZES) {
      for (const size of [100, 125, 150]) {
        const r = await rigUI({ width: w, height: h });
        try {
          r.ui.settings.set({ textSize: size });
          const bar = r.root.querySelector('#topbar').getBoundingClientRect();
          for (const id of SEASON_IDS) {
            r.world.day = dayIn(r.world, id);
            r.ui.refresh();
            const season = r.root.querySelector('#topbar .stat.date .season');
            const at = `${w}x${h} at ${size}%, ${id}`;
            expect([at, season.textContent, season.dataset.season]).toEqual([at, SEASON_TEXT.names[id], id]);
            const stats = r.root.querySelector('#topbar .stats');
            if (!stats.classList.contains('tight')) {
              await flush(); await flush();                                             // the chip's width reaches the stylesheet in the frame after the one that draws it
              const box = textBox(season), date = r.root.querySelector('#topbar .stat.date').getBoundingClientRect();
              const chip = r.root.querySelector('#topbar .score-chip'), chipBox = chip.hidden ? null : chip.getBoundingClientRect();
              expect([at, 'inside the bar', within(box, bar)]).toEqual([at, 'inside the bar', true]);
              expect([at, 'on the date\'s second line', box.top >= date.top, box.top < date.top + 2 * date.height]).toEqual([at, 'on the date\'s second line', true, true]);
              const clear = !chipBox || box.right <= chipBox.left + 1 || box.left >= chipBox.right - 1 || box.bottom <= chipBox.top + 1 || box.top >= chipBox.bottom - 1;
              expect([at, 'clear of the score chip', clear]).toEqual([at, 'clear of the score chip', true]);
              expect([at, 'adds no width', season.getBoundingClientRect().width <= 1 || season.style.position === '' && getComputedStyle(season).position === 'absolute']).toEqual([at, 'adds no width', true]);
            }
          }
        } finally { r.cleanup(); }
      }
    }
  });
  it('names the date\'s season through the whole of a season\'s last month, while the land turns to the next', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      const m = SEASONS.findIndex((_, i) => SEASONS[(i + 1) % MONTHS_PER_YEAR] !== SEASONS[i]);
      for (const d of [0, 14, 29]) {
        r.world.day = m * DAYS_PER_MONTH + d;
        r.ui.refresh();
        expect([d, r.root.querySelector('#topbar .season').textContent]).toEqual([d, SEASON_TEXT.names[SEASONS[m]]]);
        expect(seasonAt(r.world).next === undefined).toBe(false);
      }
    } finally { r.cleanup(); }
  });
  it('keeps the phone\'s numbers on one row at 375 px and 150% text with the season there, a real city\'s numbers', async () => {
    const r = await rigUI({ width: 375, height: 667 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.world.gold = 2493; r.world.day = 360 + 3 * 30 + 7;
      r.ui.refresh();
      const stats = r.root.querySelector('#topbar .stats'), box = stats.getBoundingClientRect();
      const shown = [...stats.querySelectorAll('.stat')].filter((st) => getComputedStyle(st).display !== 'none');
      expect(new Set(shown.map((st) => Math.round(st.getBoundingClientRect().top))).size).toBe(1);
      for (const st of shown) expect([st.className, within(st.getBoundingClientRect(), box)]).toEqual([st.className, true]);
      expect(stats.scrollWidth > stats.clientWidth).toBe(false);
      expect(r.root.querySelector('#topbar .season').getBoundingClientRect().height > 0).toBe(true);   // the line is there (not tight)
    } finally { r.cleanup(); }
  });
  it('keeps the season for a screen reader when the numbers have wrapped to two rows and the line is hidden from the eye', async () => {
    const r = await rigUI({ width: 360, height: 640 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.world.gold = 123456; r.world.day = 11 * 360 + 300;
      r.ui.refresh();
      const stats = r.root.querySelector('#topbar .stats'), season = r.root.querySelector('#topbar .season');
      expect(stats.classList.contains('tight')).toBe(true);
      expect([season.textContent !== '', getComputedStyle(season).display !== 'none', season.getBoundingClientRect().width <= 1]).toEqual([true, true, true]);
      expect(stats.textContent).toContain(season.textContent);                        // read with the date
    } finally { r.cleanup(); }
  });
  it('says the season and its months in the summary a tap on the bar opens, in each season, for the phone whose numbers wrap', async () => {
    const r = await rigUI({ width: 360, height: 640 });
    try {
      r.ui.settings.set({ textSize: 150 });
      r.world.gold = 123456;
      for (const id of SEASON_IDS) {
        r.world.day = dayIn(r.world, id);
        r.ui.refresh();
        r.store.set(openSheet(r.store.get(), 'summary'));
        const rows = [...r.root.querySelectorAll('#sheet .row')].map((x) => x.textContent);
        expect([id, rows.some((t) => t.includes(SEASON_TEXT.row) && t.includes(SEASON_TEXT.rowValue(SEASON_TEXT.names[id], seasonMonths(id))))]).toEqual([id, true]);
      }
    } finally { r.cleanup(); }
  });
});

describe('v70 s ui: the Settings rows', () => {
  async function settingsRig(hooks = {}) {
    const shell = await mountShell(390, 844);
    shell.root.querySelector('#sheet').hidden = false;
    shell.root.querySelector('#sheet').append(Object.assign(document.createElement('div'), { id: 'body' }));
    const store = createStore(INITIAL_UI_STATE);
    const settings = createSettings({ storage: { getItem: () => null, setItem: () => {} }, root: shell.root, systemReducedMotion: () => false });
    const body = shell.root.querySelector('#body');
    createMenuSheets({ store, settings, toasts: { show() {} }, hooks }).settings(body, { close() {} });
    return { body, settings, cleanup() { settings.destroy(); shell.cleanup(); } };
  }
  it('has the Effects volume right under the Music volume: a named − and + at 44 px, a value, each disabled at its end, and one effect played at each step', async () => {
    const played = [];
    const r = await settingsRig({ sfx: { play: (n) => { played.push(n); return true; } } });
    try {
      const rows = [...r.body.children];
      const sound = rows.findIndex((x) => x.querySelector('.switch.sound'));
      expect([rows[sound + 1].querySelector('.switch.music') !== null, rows[sound + 2].classList.contains('music-volume'), rows[sound + 3].classList.contains('effects-volume')]).toEqual([true, true, true]);
      expect(rows[sound + 4].textContent).toBe(SEASON_TEXT.soundNote);
      const row = r.body.querySelector('.effects-volume'), value = row.querySelector('.value');
      const quieter = row.querySelector('.quieter'), louder = row.querySelector('.louder');
      expect([row.textContent.includes(SEASON_TEXT.effectsVolume), quieter.getAttribute('aria-label'), louder.getAttribute('aria-label'), value.textContent]).toEqual([true, SEASON_TEXT.effectsQuieter, SEASON_TEXT.effectsLouder, '100']);
      expect(row.querySelector('.stepper').getAttribute('aria-label')).toBe(SEASON_TEXT.effectsVolume);
      for (const b of [quieter, louder]) { const q = b.getBoundingClientRect(); expect([b.getAttribute('aria-label'), q.width >= 44, q.height >= 44, b.tagName]).toEqual([b.getAttribute('aria-label'), true, true, 'BUTTON']); }
      expect([louder.disabled, quieter.disabled]).toEqual([true, false]);              // 100 is the loudest
      fire(quieter, 'click');
      expect([r.settings.get().effectsVolume, value.textContent, louder.disabled, played]).toEqual([90, '90', false, ['coin']]);
      for (let i = 0; i < 12; i++) fire(quieter, 'click');
      expect([r.settings.get().effectsVolume, quieter.disabled, value.textContent]).toEqual([0, true, '0']);
      for (let i = 0; i < 12; i++) fire(louder, 'click');
      expect([r.settings.get().effectsVolume, louder.disabled]).toEqual([100, true]);
      expect(r.settings.get().musicVolume).toBe(30);                                    // the Music volume is its own
      expect(r.body.querySelector('.music-volume .value').textContent).toBe('30');
    } finally { r.cleanup(); }
  });
  it('dims the Music and Effects rows while Sound is Off and brings them back when it is on, the controls staying real', async () => {
    const r = await settingsRig();
    try {
      const rows = () => [r.body.querySelector('.switch.music').closest('.row'), r.body.querySelector('.music-volume:not(.effects-volume)'), r.body.querySelector('.effects-volume')];
      expect(rows().map((x) => x.classList.contains('silenced'))).toEqual([false, false, false]);
      fire(r.body.querySelector('.switch.sound'), 'click');
      expect(rows().map((x) => x.classList.contains('silenced'))).toEqual([true, true, true]);
      expect([r.settings.get().music, r.body.querySelector('.effects-volume .louder').tagName]).toEqual([true, 'BUTTON']);
      fire(r.body.querySelector('.switch.sound'), 'click');
      expect(rows().map((x) => x.classList.contains('silenced'))).toEqual([false, false, false]);
    } finally { r.cleanup(); }
  });
  it('has Day and night as a switch after Motion: named, 44 px, on by default, and it says what it does and that Still keeps daylight', async () => {
    const r = await settingsRig();
    try {
      const sw = r.body.querySelector('.switch.dayNight');
      expect([sw.getAttribute('role'), sw.tagName, sw.getAttribute('aria-checked'), sw.textContent.includes(SEASON_TEXT.dayNight), sw.textContent.includes(T.on)]).toEqual(['switch', 'BUTTON', 'true', true, true]);
      const q = sw.getBoundingClientRect();
      expect([q.width >= 44, q.height >= 44]).toEqual([true, true]);
      fire(sw, 'click');
      expect([r.settings.get().dayNight, sw.getAttribute('aria-checked'), sw.textContent.includes(T.off)]).toEqual([false, 'false', true]);
      fire(sw, 'click');
      expect(r.settings.get().dayNight).toBe(true);
      const rows = [...r.body.children];
      expect(rows.findIndex((x) => x.querySelector('.switch.dayNight')) > rows.findIndex((x) => x.classList.contains('motion-row'))).toBe(true);
      expect(r.body.querySelector('.daynight-note').textContent).toBe(SEASON_TEXT.dayNightNote);
      expect(SEASON_TEXT.dayNightNote).toContain('Still');
      expect(SEASON_TEXT.dayNightNote).toContain(String(LIGHT.cycleMs / 60000));
    } finally { r.cleanup(); }
  });
  it('puts the new controls in a sensible Tab order, all real buttons: Sound, Music, Music volume, Effects volume, Vibration ... Motion, Day and night', async () => {
    const r = await settingsRig();
    try {
      const order = [...r.body.querySelectorAll('button')];
      const at = (sel) => order.indexOf(r.body.querySelector(sel));
      const seq = ['.switch.sound', '.switch.music', '.music-volume:not(.effects-volume) .quieter', '.music-volume:not(.effects-volume) .louder', '.effects-volume .quieter', '.effects-volume .louder', '.switch.vibration', '.choice.motion', '.switch.dayNight'].map(at);
      expect(seq.every((i) => i >= 0)).toBe(true);
      expect([...seq].sort((a, b) => a - b)).toEqual(seq);
      for (const b of order) expect([b.className, b.tabIndex >= 0, b.getAttribute('type')]).toEqual([b.className, true, 'button']);   // native buttons: Enter and Space press them
    } finally { r.cleanup(); }
  });
  it('closes the Settings sheet on Esc as every sheet does, and the same rows are in the title\'s Settings', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set(openSheet(r.store.get(), 'settings'));
      expect(r.root.querySelector('#sheet .effects-volume') !== null && r.root.querySelector('#sheet .switch.dayNight') !== null).toBe(true);
      key(r.root, 'Escape');
      expect(r.store.get().sheet).toBe(null);
    } finally { r.cleanup(); }
  });
  it('writes How to play\'s paragraph with the rest of the Version 7.0 words, after Track T\'s and E\'s, in the sheet', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set(openSheet(r.store.get(), 'help'));
      const text = r.root.querySelector('#sheet').textContent;
      expect(text.includes(V70_HELP.s[0].head) && text.includes(V70_HELP.s[0].text)).toBe(true);
    } finally { r.cleanup(); }
  });
});

describe('v70 s ui: the tips', () => {
  const quiet = (r) => r.ui.settings.set({ motion: 'gentle', seenTips: TIPS.map((t) => t.id).filter((id) => id !== 'season_turns' && id !== 'night_falls') });
  it('has two tips with words of twenty words or fewer, each a trigger the seam fires', () => {
    expect(SEASON_TIPS.map((t) => t.id)).toEqual(['season_turns', 'night_falls']);
    for (const t of SEASON_TIPS) { expect(TIPS).toContain(t); expect([t.id, TIP_TEXT[t.id].split(/\s+/).length <= 20]).toEqual([t.id, true]); }
    expect(TIP_TEXT.night_falls).toContain('Day and night');
  });
  it('tells of the season turning once, on the month it changes (not on a month that changes nothing)', async () => {
    let clock = 0;
    const r = await rigUI({ world: runningUiWorld(), now: () => clock });
    clock = 20000;                                                                    // past the session's first ten seconds, when no tip shows
    try {
      quiet(r);
      r.renderer.renderFrame = () => {};
      r.world.day = 20;
      r.ui.onEvents([{ type: 'month' }]);
      expect(r.ui.tips.current()).toBe(null);                                           // same season: nothing
      r.world.day = dayIn(r.world, 'shemu');
      r.ui.onEvents([{ type: 'month' }]);
      expect(r.ui.tips.current()).toBe('season_turns');
      expect(r.ui.settings.get().seenTips).toContain('season_turns');
    } finally { r.cleanup(); }
  });
  it('tells of the night once, the first time the light a frame drew was night', async () => {
    let clock = 0;
    const r = await rigUI({ world: runningUiWorld(), now: () => clock });
    clock = 20000;                                                                    // past the session's first ten seconds, when no tip shows
    try {
      quiet(r);
      r.world.speed = 0;
      setLightClock(r.world, 0, 0);
      r.frame(0);
      r.ui.refresh();
      expect(r.ui.tips.current()).toBe(null);                                           // day
      setLightClock(r.world, NIGHT_MS, 0);
      r.frame(0);
      r.world.speed = 1;                                                                // a phone holds a tip while the game is paused: it shows once play is on
      r.ui.refresh();
      expect(r.ui.tips.current()).toBe('night_falls');
    } finally { r.cleanup(); }
  });
});
