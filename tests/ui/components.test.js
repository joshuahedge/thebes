import { describe, it, expect } from '../harness.js';
import { el, button, iconButton, clear, setText } from '../../src/ui/components.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui components', () => {
  it('builds elements with classes, attributes, data, handlers and children', () => {
    let clicks = 0;
    const node = el('div', { class: 'box', 'aria-label': 'Box', dataset: { id: '7' }, onClick: () => clicks++ }, ['hi', el('b', { text: '!' })]);
    expect(node.className).toBe('box');
    expect(node.getAttribute('aria-label')).toBe('Box');
    expect(node.dataset.id).toBe('7');
    expect(node.textContent).toBe('hi!');
    fire(node, 'click');
    expect(clicks).toBe(1);
  });
  it('makes real buttons with labels', () => {
    const b = button('Place', { class: 'primary' });
    expect(b.tagName).toBe('BUTTON');
    expect(b.type).toBe('button');
    expect(b.textContent).toBe('Place');
    const i = iconButton('Minimap', '▣');
    expect(i.getAttribute('aria-label')).toBe('Minimap');
    expect(i.querySelector('.icon').getAttribute('aria-hidden')).toBe('true');
  });
  it('clears and sets text', () => {
    const { root, cleanup } = mount('<p>a</p><p>b</p>');
    clear(root);
    expect(root.childNodes.length).toBe(0);
    const p = el('p', { text: 'x' });
    setText(p, 'y');
    expect(p.textContent).toBe('y');
    cleanup();
  });
});
