// Version 8.3 (Track K, ruling 1413): the pick of a Keep stocked order's source. The store sheet's "from" starts it (src/ui/s47/carts.js, ctx.pickSource):
// the sheet steps aside (src/ui/modes.js startPick) and the map takes the screen with one bar at its foot (UX rule 1's exception: the map itself, with a bar).
//   On the map   every other store that can hold the good is lit with what it can spare, or dimmed with the reason (src/sim/carts.js sourceChoices), each with
//                its road route from the order's store (src/render/layers.js drawPickChoices). Pan and zoom work as ever.
//   The bar      "Pick the store to bring grain from, for this granary (To here)", or with the map panned away from it "..., for the granary 31 tiles
//                south of the view"; a button for each store the map lights (the keyboard's path: Tab, Enter or Space), Nearest and Cancel,
//                and a status line that says why a tap did not pick (a building that cannot hold the good, the store itself, no road).
//   A pick       setSource: the order keeps that store until the player changes it (ruling 1384); Nearest sets it back to today's rule. Either one, Cancel,
//                Back or Esc ends the pick on the store's sheet.
import { setSource, sourceChoices, isStore, orderOf, compass } from '../../sim/carts.js';
import { tileToScreen, screenToTile, MIN_ZOOM } from '../../render/camera.js';
import { drawPickChoices } from '../../render/layers.js';
import { isPicking, startPick, endPick } from '../modes.js';
import { el, button } from '../components.js';
import { PICK_TEXT as W, S47_CARTS_TEXT } from '../text.js';
import { ART_SCALE } from '../../render/iso.js';

const TOP_ROWS_PX = 104;   // the top bar and one row under it, for a stand-in with no measure of its own (createUI passes the real one)
const FRAME_MARGIN = 24, FRAME_CHOICES = 3;

// camera: () => ({ cam, view }) for the head's words about where the store being set lies (omitted: the head never says it is off the map).
// freeTop: () => px, the top of the map the top bar and the rows under it leave free (layout.js freeTop: at large text the court notice and the goal row
// reach far down a phone, ruling 1451); omitted: TOP_ROWS_PX.
export function createSourcePick({ world, store, container, cameraControl = null, afterCommand = () => {}, pickAt = () => null, camera = null, freeTop = () => TOP_ROWS_PX }) {
  const head = el('p', { class: 'pick-head', id: 'source-pick-head' });
  const status = el('p', { class: 'pick-status small muted', role: 'status', 'aria-live': 'polite' });
  const list = el('ul', { class: 'pick-choices' });
  const nearest = button(W.nearest, { class: 'pick-nearest primary', onClick: () => toNearest() });
  const cancel = button(W.cancel, { class: 'pick-cancel quiet', 'aria-label': W.cancelAria, onClick: () => leave() });
  const node = el('div', { id: 'source-pick', class: 'source-pick', role: 'group', 'aria-labelledby': 'source-pick-head', hidden: true }, [
    head, list, el('div', { class: 'pick-foot' }, [status, el('div', { class: 'pick-actions' }, [nearest, cancel])]),
  ]);
  container.append(node);
  let at = null, choices = [], sig = '', focusId = null, quiet = false;   // at: `${home}|${good}` of the pick on screen

  const pick = () => store.get().pick;
  const leave = () => { if (isPicking(store.get())) store.set(endPick(store.get())); };
  const say = (text) => { status.textContent = text; };

  // What the bar shows, from the sim's choices; rebuilt only when they change (a store built, a day's stocks), so a focused button keeps its focus.
  function fill(home, good) {
    choices = sourceChoices(world, home, good);
    const next = choices.map((c) => `${c.id}:${c.why}:${c.spare}:${c.len}:${c.chosen}:${c.nearest}`).join(',');
    if (next === sig) return false;
    sig = next;
    const active = document.activeElement;   // the page's own (createUI's doc may be a test's stand-in with no focus)
    const had = active && list.contains(active) ? Number(active.dataset.id) : null;
    list.replaceChildren(...choices.map((c) => el('li', {}, [button(W.choice(c, good), {   // a one-shot pick, so no pressed state: the words say which is chosen
      class: `pick-choice${c.why ? ' dim' : ''}${c.chosen ? ' chosen' : ''}`, dataset: { id: c.id }, 'aria-label': W.choiceAria(c, good),
      onClick: () => choose(c.id), onFocus: () => aim(c.id), onBlur: () => { if (focusId === c.id) focusId = null; },
    })])));
    if (!choices.length) list.append(el('li', { class: 'pick-none small muted', text: W.none(good) }));
    if (had !== null) { const b = list.querySelector(`[data-id="${had}"]`); if (b) b.focus({ preventScroll: true }); }
    return true;
  }

  // The map the bar leaves free: insets in CSS px (the bar across the foot on a phone held upright, in the side column otherwise; the rows under the top bar).
  function insets() {
    const r = node.getBoundingClientRect(), box = container.getBoundingClientRect();
    const vw = box.width || document.documentElement.clientWidth || 0;
    const side = r.width < vw * 0.6;   // the bar stands in the side column (wide and landscape layouts) rather than across the foot
    const vh = box.height || document.documentElement.clientHeight || 0;
    const bottom = side ? 0 : r.height;
    const top = Math.max(0, Math.min(freeTop(), vh - bottom - 2 * FRAME_MARGIN));   // never so far down that the frame has no room left over the bar
    return { view: { width: vw, height: vh }, at: side ? { top, left: 0, bottom, right: r.width } : { top, left: 0, right: 0, bottom } };
  }
  // A button focused by the keyboard: the map outlines its store and keeps it in sight beside the bar.
  function aim(id) {
    focusId = id;
    const b = world.buildings[id];
    if (quiet || !b || !cameraControl || typeof cameraControl.keepVisible !== 'function') return;
    cameraControl.keepVisible(b.x + b.w / 2, b.y + b.d / 2, insets().at);
  }
  // As the pick opens, the map frames the order's store and the nearest stores it could draw on (up to FRAME_CHOICES of them, linked by road), zooming out as
  // far as it may to show them together in the map the bar leaves free.
  function frame(home) {
    if (!cameraControl || typeof cameraControl.frameKeeping !== 'function') return;
    const pts = [home, ...choices.filter((c) => Number.isFinite(c.len)).slice(0, FRAME_CHOICES).map((c) => world.buildings[c.id])].filter(Boolean).map((b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 }));
    const cx = pts.reduce((s, q) => s + q.x, 0) / pts.length, cy = pts.reduce((s, q) => s + q.y, 0) / pts.length;
    const art = (q) => [(q.x - q.y) * 16, (q.x + q.y) * 8];   // src/render/iso.js p()
    const [mx, my] = art({ x: cx, y: cy });
    let side = 24, up = 24, down = 24;
    for (const q of pts) { const [ax, ay] = art(q); side = Math.max(side, Math.abs(ax - mx) + 24); up = Math.max(up, my - ay + 32); down = Math.max(down, ay - my + 24); }
    const { view, at } = insets();
    const freeW = view.width - at.left - at.right - 2 * FRAME_MARGIN, freeH = view.height - at.top - at.bottom - 2 * FRAME_MARGIN;
    const fit = Math.min(1, freeW / (2 * side * ART_SCALE), freeH / ((up + down) * ART_SCALE));
    if (fit >= MIN_ZOOM || pts.length < 2) { cameraControl.frameKeeping(cx, cy, cx, cy, at, FRAME_MARGIN, undefined, { up, down, side }, Math.max(MIN_ZOOM, fit)); return; }
    // Too far apart to show together: the nearest store it could draw on, its route leading off towards the order's own store.
    const q = pts[1];
    cameraControl.frameKeeping(q.x, q.y, q.x, q.y, at, FRAME_MARGIN, undefined, { up: 40, down: 24, side: 40 }, Math.max(MIN_ZOOM, Math.min(1, fit * 2)));
  }

  // Where the store being set lies from the map the bar leaves free: { type, off: null } while it is in sight, else off: { tiles, dir } (straight tiles from the
  // middle of the free map to the store's middle, and the compass word the sim uses for directions, src/sim/carts.js compass).
  function homeWhere(b) {
    const out = { type: b.type, off: null };
    const c = camera ? camera() : null;
    if (!c) return out;
    const { at } = insets(), v = c.view, x = b.x + b.w / 2, y = b.y + b.d / 2;
    const [sx, sy] = tileToScreen(c.cam, v, x, y);
    if (sx >= at.left && sx <= v.width - at.right && sy >= at.top && sy <= v.height - at.bottom) return out;
    const mid = screenToTile(c.cam, v, at.left + (v.width - at.left - at.right) / 2, at.top + (v.height - at.top - at.bottom) / 2);
    const dx = x - mid.x, dy = y - mid.y, dir = compass(dx, dy);
    return dir ? { ...out, off: { tiles: Math.round(Math.hypot(dx, dy)), dir } } : out;
  }

  function choose(id) {
    const p = pick();
    if (!p) return;
    const r = setSource(world, p.home, p.good, id);
    if (!r.ok) { say(S47_CARTS_TEXT.refusal(r)); return; }
    afterCommand({ kind: 'source', result: r, undoable: false });
    leave();
  }
  function toNearest() {
    const p = pick();
    if (!p) return;
    const r = setSource(world, p.home, p.good, null);
    if (r.ok) afterCommand({ kind: 'source', result: r, undoable: false });
    leave();
  }

  function render() {
    const s = store.get();
    if (!isPicking(s)) {
      if (at !== null) { at = null; sig = ''; focusId = null; node.hidden = true; }
      return;
    }
    const { home, good } = s.pick;
    const b = world.buildings[home];
    if (!isStore(b) || !orderOf(b, good)) { leave(); return; }   // the store or its order went while the bar was up
    const key = `${home}|${good}`;
    const fresh = key !== at;
    if (fresh) { at = key; sig = ''; say(W.hint); head.textContent = W.head(good, { type: b.type, off: null }); nearest.setAttribute('aria-label', W.nearestAria(good)); }
    fill(home, good);
    node.hidden = false;
    if (fresh) {
      frame(b);
      const first = list.querySelector('.pick-choice:not(.dim)') || nearest;
      quiet = true;                                       // the first focus is the pick's own: the framing above already shows that store
      first.focus({ preventScroll: true });
      quiet = false;
      focusId = first.dataset && first.dataset.id ? Number(first.dataset.id) : null;
    }
  }
  const stop = store.subscribe(render);
  render();

  return {
    node,
    start(home, good) {
      const b = world.buildings[home];
      if (!isStore(b) || !orderOf(b, good)) return false;
      store.set((s) => startPick(s, home, good));
      return true;
    },
    // A tap on the map while picking: a lit store picks it; anything else says why in the bar.
    tap(x, y) {
      const p = pick();
      if (!p) return;
      const b = pickAt(x, y);
      if (!b) return;
      if (b.id === p.home) { say(S47_CARTS_TEXT.refusal({ reason: 'same_store', good: p.good })); return; }
      if (choices.some((c) => c.id === b.id)) { choose(b.id); return; }
      say(W.notStore(b.type, p.good));
    },
    // The map's part, once a frame (createUI's overlay layer): the choices as they stand (a day's stocks change them), the bar following, and the head saying
    // where the store being set is when the map has been panned away from it.
    draw(g) {
      const p = pick();
      if (!p || !world.buildings[p.home]) return;
      fill(p.home, p.good);
      drawPickChoices(g, world, p.home, choices, (c) => W.label(c), focusId, W.homeLabel);
      const text = W.head(p.good, homeWhere(world.buildings[p.home]));
      if (head.textContent !== text) head.textContent = text;
    },
    choices: () => choices,
    destroy() { stop(); node.remove(); },
  };
}
