// Tiny DOM helpers. Every control is a real <button> with a label (spec 6.8).
import { categoryIconUrl } from '../render/art/icons.js';
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const icon = (glyph) => el('span', { class: 'icon', 'aria-hidden': 'true', text: glyph });
// Version 10.0 (Track Q, ruling 2141): a category's drawn icon (src/render/art/icons.js), an image so no font is involved; ink, or teal when its category is the chosen one.
export const CATEGORY_ICON_SIZE = 20;
export const CATEGORY_ICON_TONES = { ink: '#2B1F0E', chosen: '#1A5F57', onFill: '#FFFFFF' };   // the wide panel's chosen tab is filled teal, so its icon turns white
export const categoryIcon = (id) => el('img', { class: 'icon cat-icon', alt: '', 'aria-hidden': 'true', width: CATEGORY_ICON_SIZE, height: CATEGORY_ICON_SIZE, draggable: 'false', src: categoryIconUrl(id, CATEGORY_ICON_SIZE, CATEGORY_ICON_TONES.ink), dataset: { icon: id } });
export function setCategoryIconTone(node, chosen, onFill = false) {
  const img = node.querySelector ? node.querySelector('img.cat-icon') : null;
  if (!img) return;
  const src = categoryIconUrl(img.dataset.icon, CATEGORY_ICON_SIZE, chosen ? (onFill ? CATEGORY_ICON_TONES.onFill : CATEGORY_ICON_TONES.chosen) : CATEGORY_ICON_TONES.ink);
  if (img.getAttribute('src') !== src) img.setAttribute('src', src);
}
export const button = (label, props = {}) => el('button', { type: 'button', ...props }, [label]);
export const iconButton = (label, glyph, props = {}) => el('button', { type: 'button', 'aria-label': label, title: label, ...props }, [icon(glyph)]);

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
