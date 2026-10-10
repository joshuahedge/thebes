import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire } from '../helpers/dom.js';
import { advanceDays } from '../../src/sim/clock.js';
import { setSpeed } from '../../src/sim/commands.js';
import { alertText } from '../../src/ui/text.js';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('ui autosave', () => {
  it('saves at the end of a game month and when the page is hidden, pausing first', async () => {
    const calls = [];
    const r = await rigUI({ hooks: { save: async (reason) => { calls.push(reason); return true; } } });
    const events = [];
    advanceDays(r.world, 30, events);
    r.ui.onEvents(events);
    await flush();
    expect(calls).toEqual(['month']);
    setSpeed(r.world, 2);
    r.doc.hidden = true; r.doc.fireVisibility();
    await flush();
    expect(r.world.speed).toBe(0);
    expect(calls).toEqual(['month', 'hidden']);
    r.doc.hidden = false; r.doc.fireVisibility();
    await flush();
    expect(calls.length).toBe(2);                           // coming back saves nothing
    expect(document.body.classList.contains('has-banner')).toBe(false);
    const before = r.doc.listenerCount;
    r.cleanup();
    expect(r.doc.listenerCount).toBeLessThan(before);
  });
  it('raises the save-failing banner when a save fails, clears it when one succeeds, and View opens the menu', async () => {
    let ok = false;
    const r = await rigUI({ hooks: { save: async () => ok } });
    const badgeBefore = r.root.querySelector('#corners .badge').textContent;   // the rig's city has one ordinary alert already
    await r.ui.autosave('month');
    expect(document.body.classList.contains('has-banner')).toBe(true);
    const row = r.root.querySelector('#banner .critical');
    expect(row.textContent).toContain(alertText({ code: 'save_failed' }, r.world).title);
    expect(r.root.querySelector('#corners .badge').textContent).toBe(badgeBefore);   // critical, so not counted in the badge
    fire(row.querySelector('.view'), 'click');
    expect(r.store.get().sheet.kind).toBe('menu');
    ok = true;
    await r.ui.autosave('hidden');
    expect(document.body.classList.contains('has-banner')).toBe(false);
    const thrower = await (async () => { r.cleanup(); return rigUI({ hooks: { save: async () => { throw new Error('idb'); } } }); })();
    await thrower.ui.autosave('month');
    expect(document.body.classList.contains('has-banner')).toBe(true);
    thrower.cleanup();
  });
  it('does nothing without a save hook', async () => {
    const r = await rigUI();
    await r.ui.autosave('month');
    r.ui.onEvents([{ type: 'month' }]);
    expect(document.body.classList.contains('has-banner')).toBe(false);
    r.cleanup();
  });
});
