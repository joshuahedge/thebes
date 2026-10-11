// Spec 6.2: portrait = taller than wide and under 900 px wide; wide = at least 900 x 520; compact = the rest.
// Below NARROW_PX wide the root also carries the class "narrow": a phone held sideways is too narrow there for the
// corner buttons' words beside the card drawer at larger text (css/ui.css).
export const NARROW_PX = 700;

export function pickLayout(width, height) {
  if (height > width && width < 900) return 'portrait';
  if (width >= 900 && height >= 520) return 'wide';
  return 'compact';
}

export function applyLayout(root, layout) {
  root.dataset.layout = layout;
  return layout;
}

const windowSize = () => ({ width: window.innerWidth, height: window.innerHeight });

function windowSubscribe(fn) {
  window.addEventListener('resize', fn);
  window.addEventListener('orientationchange', fn);
  return () => { window.removeEventListener('resize', fn); window.removeEventListener('orientationchange', fn); };
}

// Calls onChange with the layout now and whenever the size source crosses a breakpoint. Rotation keeps the
// camera and any placement in progress because nothing here touches them (spec 6.2).
export function watchLayout({ root, getSize = windowSize, subscribe = windowSubscribe, onChange = null }) {
  let current = null;
  const check = () => {
    const { width, height } = getSize();
    root.classList.toggle('narrow', width < NARROW_PX);
    const next = pickLayout(width, height);
    if (next === current) return;
    current = next;
    applyLayout(root, next);
    if (onChange) onChange(next);
  };
  check();
  const off = subscribe(check);
  return () => { off(); root.classList.remove('narrow'); };
}
