import { describe, it, expect } from '../harness.js';
import { pickLayout, applyLayout, watchLayout } from '../../src/ui/layout.js';
import { mount } from '../helpers/dom.js';

describe('ui layout', () => {
  it('picks the layout from the viewport size exactly as spec 6.2 says', () => {
    expect(pickLayout(390, 844)).toBe('portrait');
    expect(pickLayout(899, 1200)).toBe('portrait');
    expect(pickLayout(900, 1200)).toBe('wide');
    expect(pickLayout(1280, 800)).toBe('wide');
    expect(pickLayout(900, 520)).toBe('wide');
    expect(pickLayout(844, 390)).toBe('compact');
    expect(pickLayout(1000, 500)).toBe('compact');
    expect(pickLayout(768, 1024)).toBe('portrait');
  });
  it('writes the layout onto the root element', () => {
    const { root, cleanup } = mount();
    applyLayout(root, 'wide');
    expect(root.dataset.layout).toBe('wide');
    cleanup();
  });
  it('watches a size source and reports changes once each', () => {
    const { root, cleanup } = mount();
    let size = { width: 390, height: 844 };
    const listeners = [];
    const changes = [];
    const stop = watchLayout({
      root, getSize: () => size, onChange: (l) => changes.push(l),
      subscribe: (fn) => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); },
    });
    expect(changes).toEqual(['portrait']);
    listeners[0]();
    expect(changes).toEqual(['portrait']);
    size = { width: 1280, height: 800 };
    listeners[0]();
    expect(changes).toEqual(['portrait', 'wide']);
    expect(root.dataset.layout).toBe('wide');
    stop();
    expect(listeners.length).toBe(0);
    cleanup();
  });
});
