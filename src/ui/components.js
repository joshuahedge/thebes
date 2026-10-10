// Tiny DOM helpers. Every control is a real <button> with a label (spec 6.8).
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
export const button = (label, props = {}) => el('button', { type: 'button', ...props }, [label]);
export const iconButton = (label, glyph, props = {}) => el('button', { type: 'button', 'aria-label': label, title: label, ...props }, [icon(glyph)]);

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
