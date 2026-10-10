import { describe, it, expect } from '../harness.js';
import { createSettings, DEFAULT_SETTINGS } from '../../src/ui/settings.js';
import { mount } from '../helpers/dom.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

describe('ui settings', () => {
  it('starts from defaults, persists changes and applies them to the root', () => {
    const { root, cleanup } = mount();
    const storage = fakeStorage();
    const s = createSettings({ storage, root, systemReducedMotion: () => false });
    expect(s.get()).toEqual(DEFAULT_SETTINGS);
    s.set({ textSize: 150, leftHanded: true });
    expect(root.dataset.textSize).toBe('150');
    expect(root.dataset.hand).toBe('left');
    expect(JSON.parse(storage.data['thebes.settings']).textSize).toBe(150);
    const again = createSettings({ storage, root, systemReducedMotion: () => false });
    expect(again.get().textSize).toBe(150);
    expect(again.get().leftHanded).toBe(true);
    cleanup();
  });
  it('ignores malformed storage and storage errors', () => {
    const { root, cleanup } = mount();
    const broken = { getItem: () => '{not json', setItem: () => { throw new Error('quota'); } };
    const s = createSettings({ storage: broken, root, systemReducedMotion: () => false });
    expect(s.get()).toEqual(DEFAULT_SETTINGS);
    s.set({ sound: true });
    expect(s.get().sound).toBe(true);
    const odd = fakeStorage({ 'thebes.settings': JSON.stringify({ textSize: 999, reducedMotion: 'maybe', sound: 'yes' }) });
    expect(createSettings({ storage: odd, root, systemReducedMotion: () => false }).get()).toEqual(DEFAULT_SETTINGS);
    cleanup();
  });
  it('resolves reduced motion from the system unless overridden', () => {
    const { root, cleanup } = mount();
    const s = createSettings({ storage: fakeStorage(), root, systemReducedMotion: () => true });
    expect(s.reducedMotion()).toBe(true);
    expect(root.classList.contains('reduce-motion')).toBe(true);
    s.set({ reducedMotion: 'off' });
    expect(s.reducedMotion()).toBe(false);
    expect(root.classList.contains('reduce-motion')).toBe(false);
    s.set({ reducedMotion: 'on' });
    expect(s.reducedMotion()).toBe(true);
    let seen = 0;
    s.subscribe(() => seen++);
    s.set({ vibration: false });
    expect(seen).toBe(1);
    cleanup();
  });
});
