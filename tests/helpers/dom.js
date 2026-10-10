// A fresh container per test, parked off-screen so layout still runs but nothing covers the results.
export function mount(html = '') {
  const root = document.createElement('div');
  root.className = 'test-mount';
  root.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;';
  if (html) root.innerHTML = html;
  document.body.appendChild(root);
  return { root, cleanup() { root.remove(); } };
}

export function fire(target, type, init = {}) {
  const base = { bubbles: true, cancelable: true, composed: true, ...init };
  let ev;
  if (type.startsWith('pointer')) ev = new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, ...base });
  else if (type.startsWith('key')) ev = new KeyboardEvent(type, base);
  else if (type === 'wheel') ev = new WheelEvent(type, base);
  else if (type === 'click' || type.startsWith('mouse')) ev = new MouseEvent(type, base);
  else ev = new Event(type, base);
  target.dispatchEvent(ev);
  return ev;
}

export const key = (target, k, init = {}) => fire(target, 'keydown', { key: k, ...init });

export const flush = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
