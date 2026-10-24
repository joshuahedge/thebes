// Spec 6.2: portrait = taller than wide and under 900 px wide; wide = at least 900 x 520; compact = the rest.
// Below NARROW_PX wide the root also carries the class "narrow": a phone held sideways is too narrow there for the
// corner buttons' words beside the card drawer at larger text (css/ui.css).
export const NARROW_PX = 700;

export const TOPBAR_PX = 51;           // --topbar-h at 100% text size (48 and the 3 px under the buttons that the band, 6 px since 8.0, shows in)

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

// The top of the map the interface leaves free, in CSS px from the map's top (spec 6.3, ruling 168). A wide screen keeps
// the top bar's fixed height. On a phone (portrait or compact) the rows under the top bar run across the map (the notice,
// the banner, the legend, the goals strip, a tip, a caption: #under-bar's children), and their height follows their
// words and the text size, so it is measured off the page: the lowest of the top bar and every row that shows, never
// less than the fixed bar. root holds the shell (#topbar, #under-bar, #corners); map is the map's canvas.
export function freeTop(root, map, layout) {
  if (layout === 'wide' || !measurable(root, map)) return TOPBAR_PX;
  const under = root.querySelector('#under-bar');
  const shown = boxes([root.querySelector('#topbar'), ...(under ? under.children : [])]);
  return Math.max(TOPBAR_PX, ...shown.map((r) => r.bottom - map.getBoundingClientRect().top));
}

// How far up from the bottom of a map `height` px tall the corner buttons reach, in CSS px (0 when none show): in
// compact they sit on the map's bottom edge in every mode, left of the rail and any drawer or sheet.
export function cornersHeight(root, map, height) {
  if (!measurable(root, map)) return 0;
  const shown = boxes([...root.querySelectorAll('#corners .group')]);
  if (!shown.length) return 0;
  return Math.max(0, height - (Math.min(...shown.map((r) => r.top)) - map.getBoundingClientRect().top));
}

// Where the corner buttons end, in CSS px from the map's top (0 when none show): the free map between them and the dock.
export function cornersBottom(root, map) {
  if (!measurable(root, map)) return 0;
  const shown = boxes([...root.querySelectorAll('#corners .group')]);
  if (!shown.length) return 0;
  return Math.max(0, Math.max(...shown.map((r) => r.bottom)) - map.getBoundingClientRect().top);
}

const measurable = (root, map) => Boolean(root && map && typeof map.getBoundingClientRect === 'function');

// The boxes of the nodes that show (an empty caption or tip row is a 1 px dot; hidden corners keep their box).
function boxes(nodes) {
  return nodes.filter((n) => n && getComputedStyle(n).visibility !== 'hidden')
    .map((n) => n.getBoundingClientRect()).filter((r) => r.width > 2 && r.height > 2);
}
