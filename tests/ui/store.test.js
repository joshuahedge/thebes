import { describe, it, expect } from '../harness.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';

describe('ui store', () => {
  it('starts from the initial state and merges patches', () => {
    const s = createStore(INITIAL_UI_STATE);
    expect(s.get().mode).toBe('browse');
    s.set({ overlay: 'water' });
    expect(s.get().overlay).toBe('water');
    expect(s.get().mode).toBe('browse');
    s.set((state) => ({ dock: state.dock === 'slim' ? 'tray' : 'slim' }));
    expect(s.get().dock).toBe('tray');
  });
  it('notifies subscribers only when something changed', () => {
    const s = createStore(INITIAL_UI_STATE);
    const seen = [];
    const off = s.subscribe((state) => seen.push(state.overlay));
    s.set({ overlay: 'food' });
    s.set({ overlay: 'food' });
    s.set({});
    expect(seen).toEqual(['food']);
    off();
    s.set({ overlay: null });
    expect(seen).toEqual(['food']);
  });
  it('has every field the conventions list', () => {
    const keys = Object.keys(INITIAL_UI_STATE).sort();
    expect(keys).toEqual(['area', 'category', 'confirmDialog', 'dock', 'ghost', 'hoverId', 'inputType', 'lastSpeed', 'layout', 'line', 'mode', 'overlay', 'panelFolded', 'screenshot', 'selectedId', 'sheet', 'tool']);
  });
});
