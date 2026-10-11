import { describe, it, expect } from '../../harness.js';
import { alertsFor } from '../../../src/sim/alerts.js';
import { createRenderer, decorAt } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { createAmbient } from '../../../src/render/ambient.js';
import { openSheet } from '../../../src/ui/modes.js';
import { el } from '../../../src/ui/components.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { riverWorld } from '../../helpers/renderWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { rigUI } from '../../helpers/uiWorld.js';

const understaffed = (w, b) => alertsFor(w).filter((a) => a.code === 'understaffed' && a.id === b.id);

describe('s3 contract follow-ups: alerts', () => {
  it('does not call a burning workplace short of workers, but still does when it is not burning', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const staffed = addRaw(w, 'temple', 12, 8, { staff: 20 });
    const empty = addRaw(w, 'temple', 16, 8, { staff: 0 });
    expect(understaffed(w, staffed).length).toBe(0);
    expect(understaffed(w, empty).length).toBe(1);               // unstaffed and not burning: still short
    staffed.fire = { stage: 'fire', days: 1, left: 10 };
    empty.fire = { stage: 'fire', days: 1, left: 10 };
    expect(understaffed(w, staffed).length).toBe(0);
    expect(understaffed(w, empty).length).toBe(0);               // in the fire stage the building is out of the list
    empty.fire = { stage: 'smoulder', days: 1, left: 10 };
    expect(understaffed(w, empty).length).toBe(1);               // only the fire stage is excused
  });
});

describe('s3 contract follow-ups: tree sway seam', () => {
  it('calls opts.treeSlot for decor trees only, and draws the slot it returns', () => {
    const w = riverWorld();
    const canvas = makeCanvas(400, 300);
    const renderer = createRenderer({ canvas, dpr: 1 });
    const cam = createCamera({ x: 18, y: 14, zoom: 1 });
    const calls = [];
    const fetched = [];
    const realGet = renderer.spriteCache.get.bind(renderer.spriteCache);
    renderer.spriteCache.get = (slot, zoom, dpr) => { fetched.push(slot); return realGet(slot, zoom, dpr); };
    renderer.renderFrame(w, cam, {
      view: { width: 400, height: 300 },
      walkers: [{ id: 5, kind: 'worker', x: 17, y: 14 }],
      treeSlot: (o) => { calls.push(o); return 'acacia'; },
    });
    expect(calls.length).toBeGreaterThan(0);
    for (const o of calls) {
      expect(o.id >= 1e6 && o.id < 2e6).toBe(true);
      expect(['palm', 'acacia'].includes(o.slot)).toBe(true);
      expect(decorAt(w, o.x, o.y)).toBe(o.slot);
    }
    expect(fetched.includes('palm')).toBe(false);                // every palm went through the hook and came back as an acacia
    expect(fetched.includes('acacia')).toBe(true);
    expect(fetched.some((s) => s.startsWith('fig.') || s.startsWith('house') || s === 'temple')).toBe(true);   // buildings and walkers are not mapped
  });
  it('draws trees as before when there is no treeSlot', () => {
    const w = riverWorld();
    const renderer = createRenderer({ canvas: makeCanvas(400, 300), dpr: 1 });
    const stats = renderer.renderFrame(w, createCamera({ x: 18, y: 14, zoom: 1 }), { view: { width: 400, height: 300 } });
    expect(stats.sprites).toBeGreaterThan(0);
  });
  it('has a stub ambient treeSlot that returns the slot unchanged', () => {
    const a = createAmbient();
    expect(typeof a.treeSlot).toBe('function');
    expect(a.treeSlot(makeTestWorld(), 3, 4, 'palm', 1234)).toBe('palm');
    expect(a.treeSlot(makeTestWorld(), 3, 4, 'acacia', 0)).toBe('acacia');
  });
});

describe('s3 contract follow-ups: summary order', () => {
  it('shows the score section before the last raid report in the summary', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.danger.sheetParts.summary = () => [el('section', { class: 's3-raid-report', text: 'Last raid' })];
      r.ui.scoreUi.sheetParts.summary = () => [el('section', { class: 's3-score', text: 'Score 0' })];
      r.store.set(openSheet(r.store.get(), 'summary'));
      const sheet = r.root.querySelector('#sheet');
      const order = [...sheet.querySelectorAll('.s3-score, .s3-raid-report')].map((n) => n.className);
      expect(order).toEqual(['s3-score', 's3-raid-report']);
    } finally { r.cleanup(); }
  });
});
