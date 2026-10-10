import { describe, it, expect } from '../harness.js';
import { INITIAL_UI_STATE } from '../../src/ui/store.js';
import { startTool, cancelTool, select, deselect, openSheet, closeSheet, back, toggleOverlay, cycleOverlay, pickCategory, isToolMode, toolMode } from '../../src/ui/modes.js';

const apply = (state, patch) => (patch ? { ...state, ...patch } : state);
const S0 = { ...INITIAL_UI_STATE, layout: 'portrait' };

describe('ui modes', () => {
  it('maps tools to the modes table', () => {
    expect(toolMode({ kind: 'building', type: 'well' })).toBe('placing');
    expect(toolMode({ kind: 'road' })).toBe('drawing');
    expect(toolMode({ kind: 'houses' })).toBe('drawing');
    expect(toolMode({ kind: 'demolish' })).toBe('demolishing');
    expect(isToolMode('placing') && isToolMode('drawing') && isToolMode('demolishing')).toBe(true);
    expect(isToolMode('browse') || isToolMode('selected')).toBe(false);
  });
  it('starting a tool leaves selection and sheets, keeps the overlay, untucks the dock', () => {
    let s = apply(S0, select(S0, 4));
    s = apply(s, toggleOverlay(s, 'water'));
    s = apply(s, { dock: 'tucked' });
    s = apply(s, startTool(s, { kind: 'building', type: 'well' }));
    expect(s.mode).toBe('placing');
    expect(s.tool).toEqual({ kind: 'building', type: 'well' });
    expect(s.selectedId).toBe(null);
    expect(s.sheet).toBe(null);
    expect(s.overlay).toBe('water');
    expect(s.dock).toBe('slim');
  });
  it('selecting opens the info sheet and clears any tool', () => {
    let s = apply(S0, startTool(S0, { kind: 'road' }));
    s = apply(s, { line: { x0: 1, y0: 1, x1: null, y1: null, flip: false } });
    s = apply(s, select(s, 9));
    expect(s.mode).toBe('selected');
    expect(s.selectedId).toBe(9);
    expect(s.sheet).toEqual({ kind: 'info', id: 9 });
    expect(s.tool).toBe(null);
    expect(s.line).toBe(null);
    s = apply(s, deselect(s));
    expect(s.mode).toBe('browse');
    expect(s.sheet).toBe(null);
  });
  it('keeps one panel open at a time', () => {
    let s = apply(S0, startTool(S0, { kind: 'building', type: 'well' }));
    s = apply(s, openSheet(s, 'menu'));
    expect(s.sheet).toEqual({ kind: 'menu', id: null });
    expect(s.mode).toBe('browse');
    expect(s.tool).toBe(null);
    s = apply(S0, select(S0, 2));
    s = apply(s, openSheet(s, 'minimap'));
    expect(s.sheet.kind).toBe('minimap');
    expect(s.mode).toBe('selected');
    s = apply(s, closeSheet(s));
    expect(s.sheet).toEqual({ kind: 'info', id: 2 });                       // the info sheet comes back under a closed panel
    expect(s.mode).toBe('selected');
    s = apply(s, openSheet(s, 'minimap'));
    s = apply(s, back(s));
    expect(s.sheet).toEqual({ kind: 'info', id: 2 });
    expect(s.mode).toBe('selected');
    s = apply(s, closeSheet(s));                                            // closing the info sheet itself still deselects
    expect(s.mode).toBe('browse');
    expect(s.sheet).toBe(null);
    s = apply(s, openSheet(s, 'menu'));
    s = apply(s, closeSheet(s));
    expect(s.sheet).toBe(null);
    s = apply(s, select(s, 2));
    s = apply(s, closeSheet(s));
    expect(s.mode).toBe('browse');
    expect(s.selectedId).toBe(null);
  });
  it('goes back one step at a time, in order', () => {
    let s = apply(S0, select(S0, 3));
    s = apply(s, startTool(s, { kind: 'demolish' }));
    s = apply(s, openSheet(s, 'settings'));
    s = apply(s, { confirmDialog: { text: 'Sure?', confirmLabel: 'Yes', onConfirm: () => {} } });
    s = apply(s, back(s));
    expect(s.confirmDialog).toBe(null);
    expect(s.sheet.kind).toBe('settings');
    s = apply(s, back(s));
    expect(s.sheet).toBe(null);
    s = apply(s, startTool(s, { kind: 'houses' }));
    s = apply(s, back(s));
    expect(s.mode).toBe('browse');
    expect(s.tool).toBe(null);
    s = apply(s, select(s, 5));
    s = apply(s, back(s));
    expect(s.mode).toBe('browse');
    expect(back(s)).toBe(null);
  });
  it('toggles and cycles overlays', () => {
    const list = ['water', 'food', 'religion', 'housing'];
    let s = apply(S0, toggleOverlay(S0, 'food'));
    expect(s.overlay).toBe('food');
    s = apply(s, toggleOverlay(s, 'food'));
    expect(s.overlay).toBe(null);
    const seen = [];
    for (let i = 0; i < 5; i++) { s = apply(s, cycleOverlay(s, list)); seen.push(s.overlay); }
    expect(seen).toEqual(['water', 'food', 'religion', 'housing', null]);
  });
  it('opens the tray when a category is picked in portrait only', () => {
    expect(pickCategory(S0, 'food')).toEqual({ category: 'food', dock: 'tray' });
    expect(pickCategory({ ...S0, layout: 'wide', dock: 'slim' }, 'food')).toEqual({ category: 'food', dock: 'slim' });
    expect(pickCategory({ ...S0, layout: 'compact', dock: 'slim' }, 'food')).toEqual({ category: 'food', dock: 'tray' });
  });
  it('never has a tool and a selection at once', () => {
    const steps = [(s) => select(s, 1), (s) => startTool(s, { kind: 'road' }), (s) => openSheet(s, 'summary'), (s) => back(s), (s) => select(s, 2), (s) => cancelTool(s), (s) => startTool(s, { kind: 'demolish' }), (s) => back(s), (s) => back(s)];
    let s = S0;
    for (const step of steps) {
      s = apply(s, step(s));
      expect(s.tool !== null && s.selectedId !== null).toBe(false);
      expect(isToolMode(s.mode) === (s.tool !== null)).toBe(true);
      expect((s.mode === 'selected') === (s.selectedId !== null)).toBe(true);
    }
  });
});
