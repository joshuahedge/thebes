// Version 8.1 (Track D, rulings 1241-1245): drag to build. Press a card in the tray and drag it onto the map: the ghost follows the finger with 7.0's square-by-square fit and the 8.0 bar, and on release
// it builds at once when it fits and can be paid for (with the usual short Undo); otherwise the ghost stays where it is with its reason in the bar. A road, wall, ferry, plots, plazas or a farm area are
// dragged on from the card: the stroke starts where the finger first meets the map, and the release lays what it drew. Tapping a card still picks it; a mouse drags the same way.
//
// createCardDrag is the pointer side: it finds the card under a press, tells a drag from a tap and from the tray's own scroll, keeps the drag with the finger over the map with a clear layer, and calls
// the host. createDragHost is the game side: the tool, the ghost, the stroke and the build, on the interface's own placement and actions. The two are apart so each is tested alone.
import { el } from '../components.js';
import { GHOST_FINGER_OFFSET_PX } from '../../data/ui.js';

export const CARD_DRAG_PX = 10;          // a finger or pen must move this far before a press is a drag (the page's own tap slop is 8, so a tap stays a tap)
export const CARD_DRAG_MOUSE_PX = 6;     // a mouse has no scroll to tell apart, so it starts sooner
// What counts as the interface chrome, which a drop on cancels (the map is whatever lies under none of these). The bars are read as they are at each move; the tray the card came from
// (the dock, the panel, the rail) is read once as the drag starts, because the phone's tray gives way to the confirm bar at once and the place it was is where "put it back" lies. The confirm bar is not a
// cancel place, and neither are the corner buttons: both move under the finger as the ghost's state changes.
const CHROME = ['#topbar', '#under-bar', '#sheet:not([hidden])', '#dialog:not([hidden])'];
const TRAY = ['#dock', '#panel', '#rail'];

const pointerKind = (ev) => (ev.pointerType === 'pen' ? 'pen' : ev.pointerType === 'touch' ? 'touch' : 'mouse');

// The axis a tray scrolls on: 'x' for the phone's row of cards, 'y' for the wide panel's grid and the rail's drawer. Read from the cards' own container (what overflows), else from the layout.
function scrollAxisOf(card, layout) {
  const box = card.parentElement;
  if (box) {
    const sx = box.scrollWidth > box.clientWidth + 1, sy = box.scrollHeight > box.clientHeight + 1;
    if (sx && !sy) return 'x';
    if (sy && !sx) return 'y';
  }
  return layout === 'portrait' ? 'x' : 'y';
}

// A finger's first move decides: a drag away from the tray's scroll (up from the phone's row; sideways across the wide panel or the rail) carries the card; along the scroll it is the tray's, and the
// press is let go so the browser scrolls. 'start', 'scroll' or 'wait' (not far enough yet).
export function dragIntent({ dx, dy, kind, axis }) {
  const dist = Math.hypot(dx, dy);
  if (kind === 'mouse') return dist >= CARD_DRAG_MOUSE_PX ? 'start' : 'wait';
  if (dist < CARD_DRAG_PX) return 'wait';
  if (axis === 'x') return dy < 0 && Math.abs(dy) >= Math.abs(dx) ? 'start' : 'scroll';
  return Math.abs(dx) > Math.abs(dy) ? 'start' : 'scroll';
}

// createCardDrag({ root, doc, canvas, store, host, schedule }): root holds the cards (#ui); host is createDragHost's object (begin, move, end, cancel).
export function createCardDrag({ root, doc = document, canvas, store, host, schedule = (fn) => setTimeout(fn, 0) }) {
  let press = null;            // { id, item, kind, x0, y0, card, axis, active, surface }
  let swallow = false;         // the click a drag's release would have made on a card is not a pick
  const local = (ev) => { const r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  const rectsOf = (sels) => sels.flatMap((sel) => [...root.querySelectorAll(sel)].map((n) => n.getBoundingClientRect())).filter((r) => r.width > 0 && r.height > 0);
  const inside = (ev, r) => ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
  const overChrome = (ev) => (press && press.trayRects.some((r) => inside(ev, r))) || rectsOf(CHROME).some((r) => inside(ev, r));

  function finish() {
    if (!press) return;
    if (press.surface) press.surface.remove();
    doc.body.classList.remove('card-dragging');
    if (press.active) { swallow = true; schedule(() => { swallow = false; }); }
    for (const [type, fn] of listeners) doc.removeEventListener(type, fn, true);
    press = null;
  }
  const abort = () => { if (press && press.active) host.cancel(); finish(); };

  const onMove = (ev) => {
    if (!press || ev.pointerId !== press.id) return;
    if (!press.active) {
      const intent = dragIntent({ dx: ev.clientX - press.x0, dy: ev.clientY - press.y0, kind: press.kind, axis: press.axis });
      if (intent === 'wait') return;
      if (intent === 'scroll') { finish(); return; }
      press.trayRects = rectsOf(TRAY);
      if (!host.begin(press.item, { type: press.kind })) { finish(); return; }
      press.active = true;
      press.surface = el('div', { class: 'card-drag-surface', 'aria-hidden': 'true' });
      root.append(press.surface);
      try { press.surface.setPointerCapture(ev.pointerId); } catch { /* a synthetic pointer cannot be captured */ }
      doc.body.classList.add('card-dragging');
    }
    host.move(local(ev), { overMap: !overChrome(ev), type: press.kind });
  };
  const onUp = (ev) => {
    if (!press || ev.pointerId !== press.id) return;
    if (press.active) host.end(local(ev), { overMap: !overChrome(ev), type: press.kind });
    finish();
  };
  const onCancel = (ev) => { if (press && ev.pointerId === press.id) abort(); };
  // Esc puts a card in hand back, and is all that key press does (it must not go on to Back, which would close the tray too).
  const onKey = (ev) => {
    if (!press || ev.key !== 'Escape') return;
    if (press.active) { ev.stopPropagation(); ev.preventDefault(); }
    abort();
  };
  // A second finger down is a pinch or a pan, not a card: the drag is taken back.
  const onOther = (ev) => { if (press && ev.pointerId !== press.id) abort(); };
  const onClick = (ev) => {
    if (swallow && ev.target && ev.target.closest && ev.target.closest('.card')) { ev.stopPropagation(); ev.preventDefault(); }
  };
  const listeners = [['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onCancel], ['keydown', onKey], ['pointerdown', onOther]];

  const onDown = (ev) => {
    swallow = false;
    if (press || ev.button !== 0 || ev.isPrimary === false) return;
    const card = ev.target && ev.target.closest ? ev.target.closest('.card[data-item]') : null;
    if (!card || card.getAttribute('aria-disabled') === 'true' || card.hasAttribute('data-locked') || !root.contains(card)) return;
    press = { id: ev.pointerId, item: card.dataset.item, kind: pointerKind(ev), x0: ev.clientX, y0: ev.clientY, card, axis: scrollAxisOf(card, store.get().layout), active: false, surface: null, trayRects: [] };
    for (const [type, fn] of listeners) doc.addEventListener(type, fn, true);
  };
  root.addEventListener('pointerdown', onDown);
  doc.addEventListener('click', onClick, true);

  return {
    get dragging() { return Boolean(press && press.active); },
    detach() { abort(); root.removeEventListener('pointerdown', onDown); doc.removeEventListener('click', onClick, true); },
  };
}

// createDragHost({ store, placement, actions, tileUnder, confirm, toolForItem, standing }): what the drag does in the game.
//  placement.start / moveGhost / preview / cancel, actions.strokeDrag and actions.drawDrag (the map's own stroke wiring, so plots, routes and one-tile plots behave as a drag on the map does),
//  tileUnder(x, y) -> { x, y }, confirm(type) -> the interface's tick (the same toast, Undo and camera as the bar's), toolForItem(item), standing(item) -> true for a card that opens a sheet (the palace).
export function createDragHost({ store, placement, actions, tileUnder, confirm, toolForItem, standing = () => false }) {
  let item = null, strokeKind = null, stroking = false, last = null;
  const drawTool = (tool) => Boolean(tool) && tool.kind !== 'building';
  const fits = () => { const p = placement.preview(); return Boolean(p) && (p.state === 'ok' || p.state === 'warn'); };
  const drawn = () => {                                                        // the tiles the stroke has drawn: a touch plan's, a mouse line's or rectangle's
    const s = store.get();
    if (s.plan) return s.plan.tiles.length;
    if (s.line && s.line.x1 !== null) return s.line.x0 === s.line.x1 && s.line.y0 === s.line.y1 ? 1 : 2;
    if (s.area && s.area.x1 !== null) return s.area.x0 === s.area.x1 && s.area.y0 === s.area.y1 ? 1 : 2;
    return 0;
  };
  const stroke = (p, phase) => (strokeKind === 'mouse' ? actions.drawDrag({ ...p, phase }) : actions.strokeDrag({ ...p, phase }));

  return {
    // The card is pressed and dragged far enough: its tool starts, with no ghost yet and the camera where it is. false: this card is tapped, not dragged (Demolish takes a tap and the bar's tick, since
    // it takes things down; the palace's card opens its sheet).
    begin(card, { type }) {
      const tool = toolForItem(card);
      if (tool.kind === 'demolish' || standing(card)) return false;
      item = card; stroking = false; last = null; strokeKind = type;
      placement.start(tool, null);
      return Boolean(store.get().tool);
    },
    move(p, { overMap, type }) {
      const tool = store.get().tool;
      if (!tool || !overMap) return;
      last = p;
      if (!drawTool(tool)) { const t = tileUnder(p.x, type === 'mouse' ? p.y : p.y - GHOST_FINGER_OFFSET_PX); placement.moveGhost(t.x, t.y); return; }
      if (!stroking) { stroking = true; stroke(p, 'start'); return; }
      stroke(p, 'move');
    },
    // Released. Over the map: a building at a legal tile is built; a stroke that drew more than one tile (a plot: one) is laid when the sim says it fits. A ghost or stroke that cannot be built stays, and
    // the bar says why. Released over the tray or a bar (the finger went back): nothing is built and the tool is put away.
    end(p, { overMap, type }) {
      const tool = store.get().tool;
      if (!tool) return;
      if (!overMap || (drawTool(tool) && !stroking)) { placement.cancel(); return; }
      if (!drawTool(tool)) {
        const t = tileUnder(p.x, type === 'mouse' ? p.y : p.y - GHOST_FINGER_OFFSET_PX);
        placement.moveGhost(t.x, t.y);
        if (fits()) confirm(type);
        return;
      }
      stroke(p, 'end');                                                        // a one-tile drag of the Housing plot tool is laid by the stroke's own end (ruling 1167)
      const now = store.get().tool;
      if (now && (now.kind === 'houses' ? drawn() >= 1 : drawn() >= 2) && fits()) confirm(type);
    },
    // The finger was taken off the screen's business (a second finger, Esc, a lost pointer): nothing is built and the tool is put away.
    cancel() { if (store.get().tool) placement.cancel(); stroking = false; },
    get item() { return item; },
  };
}
