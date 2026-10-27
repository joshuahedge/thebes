// The Keep stocked part of a store's sheet (Stage 4.7, Task 6, ruling 467, as Version 8.3 Track K reworked it, rulings 1410-1420). A storehouse's or granary's
// sheet has Keeps stocked open near its top, right under how full the store is (hidden until any store stands, cartsUnlocked); the storehouse's switches for
// what producers may deliver follow under Takes in (src/ui/sheets.js). Version 8.3 (ruling 1383): "Fetch" is Keep stocked in every word.
//   an order       one row, read left to right: the good's icon and name · Keep stocked [On] · up to [− 100 +] · from [Nearest granary, 34 tiles ▸], the live
//                  line under it (fetchStatus) with Show me to the store the goods come from. "from" opens the pick on the map (src/ui/s47/sourcePick.js). A
//                  chosen store with none to spare is said in amber with Nearest instead? (setSource null); a chosen store that went says so until the month ends.
//   another good   the same switch and stepper, with the exact consequence before the tap (fetchPreview through S47_CARTS_TEXT.consequenceRow) and what the
//                  source gives (sourceNote) with Show me; a good no store can spare is one muted line, with the store that holds it all the same (holderOf).
//                  With no order yet every good is listed; once the store keeps one stocked the others fold under "Keep another good stocked (n)" (ruling 1420).
//   a refusal      why (setFetch's reason), and Show me to the store that holds the good (holderOf), or to the Takes in switch of a refused good.
// Seam shape: src/ui/s46/seam.js, with the sheet part `store(b)` that sheets.js calls under a store's "Stored n of m" row. Nothing here floats over the map
// (UX rule 1): the panel is the sheet. Goods on the road are shown by the sheet's stock rows (src/ui/sheets.js, roadGoods).
import { seamBase } from '../s46/seam.js';
import { BUILDINGS } from '../../data/buildings.js';
import { CARTS } from '../../data/s47.js';
import { FOOD_GOODS } from '../../data/goods.js';
import { cartsUnlocked, isStore, ordersOf, setFetch, clearFetch, setSource, fetchPreview, fetchStatus, fetchSourceId, holderOf, orderSource, storesOf } from '../../sim/carts.js';
import { NEED_ICONS } from '../../render/layers.js';
import { iconPath } from '../../render/spots.js';
import { el, button } from '../components.js';
import { S47_CARTS_TEXT as W, KEEP_TEXT as K, goodName } from '../text.js';

const stepOf = CARTS.perTrip;
// The stepper's moves: one cart load (20) at a time up to 200, then 100 at a time up to the store's capacity (a store holds hundreds); never below one load.
export const FINE_TO = 200, COARSE_STEP = 100;
export function stepAmount(amount, dir, cap) {
  if (dir > 0) return Math.min(cap, amount >= FINE_TO ? amount + COARSE_STEP : Math.min(FINE_TO, amount + stepOf));
  return Math.max(stepOf, amount > FINE_TO ? Math.max(FINE_TO, amount - COARSE_STEP) : amount - stepOf);
}

// The good's icon (decoration: the name beside it says the good): a need's icon from the layers (pottery, beer, linen, jewellery; a bowl for every food),
// a crate for the rest.
const NS = 'http://www.w3.org/2000/svg';
const CRATE = { segs: [['M', [1, 3]], ['L', [5, 1]], ['L', [9, 3]], ['L', [9, 8]], ['L', [5, 9.8]], ['L', [1, 8]], ['Z'], ['M', [1, 3]], ['L', [5, 5]], ['L', [9, 3]], ['M', [5, 5]], ['L', [5, 9.8]]], fill: '#C9A46A' };
export function goodIcon(good) {
  const ic = NEED_ICONS[good] || (FOOD_GOODS.includes(good) ? NEED_ICONS.food : CRATE);
  const svg = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries({ class: 'good-icon', viewBox: '0 0 10 10', width: 18, height: 18, 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(k, String(v));
  const path = document.createElementNS(NS, 'path');
  for (const [k, v] of Object.entries({ d: iconPath(ic.segs), fill: ic.fill, stroke: '#3A2E5A', 'stroke-width': 0.6, 'stroke-linejoin': 'round' })) path.setAttribute(k, String(v));
  svg.append(path);
  return svg;
}

// Version 8.3 (ruling 1421): Advice's and an alert's Show me for a Keep stocked fix open a store's sheet at Keeps stocked for one good. The caller names the
// store and the good here, then selects the store; the sheet's next build unfolds that good's row and focuses its switch. One aim at a time.
let pendingAim = null;
export function aimKeepStocked(id, good) { pendingAim = id === null || id === undefined ? null : { id, good }; }

export function createCartsUi(ctx) {
  const { world } = ctx;
  const open = new Set();          // store ids whose other goods are unfolded (kept here so a day's rebuild of the sheet does not fold them)
  const drafts = new Map();        // `${store}|${good}` -> the amount a toggle would set (before an order exists)
  const refused = new Map();       // `${store}|${good}` -> { result, day } the last refusal, shown the rest of that game day
  let refocus = null;              // `${store}|${good}` whose "from" button takes focus again when the pick ends
  const keyOf = (b, good) => `${b.id}|${good}`;
  const draftOf = (b, good) => drafts.get(keyOf(b, good)) || Math.min(CARTS.defaultFetch, BUILDINGS[b.type].capacity);
  const refresh = () => ctx.refresh();

  function showMeButton(label, id) {
    return button(W.showMe, { class: 'show-me quiet', 'aria-label': label, dataset: { target: id }, onClick: () => ctx.selectBuilding(id) });
  }

  // The Takes in switch of a refused good is on this very sheet: Show me takes focus there.
  function acceptShowMe(good) {
    return button(W.showMe, { class: 'show-me quiet accept-show', 'aria-label': `${W.showMe}: ${goodName(good)}`, onClick: (ev) => {
      const sw = ev.currentTarget.closest('#sheet') && ev.currentTarget.closest('#sheet').querySelector(`.switch.accept[data-good="${good}"]`);
      if (sw) { sw.scrollIntoView({ block: 'nearest' }); sw.focus(); }
    } });
  }

  // One good's row (an order's, or another good's that is not kept stocked). Returns a list item.
  function goodRow(b, good) {
    const key = keyOf(b, good), order = b.orders && b.orders[good] ? b.orders[good] : null;
    const cap = BUILDINGS[b.type].capacity;
    const amount = order ? order.fetch : draftOf(b, good);
    const name = goodName(good);
    const on = Boolean(order);
    const sw = el('button', { type: 'button', role: 'switch', class: 'switch fetch-switch', 'aria-checked': String(on), 'aria-label': W.setLabel(good), dataset: { good } }, [
      el('span', { class: 'good' }, [goodIcon(good), el('span', { class: 'name', text: name })]),
      el('span', { class: 'state small' }, [el('span', { class: 'word', text: W.switchWord }), ' ', el('span', { class: 'onoff', text: on ? W.on : W.off })]),
    ]);
    sw.addEventListener('click', () => {
      if (on) {
        drafts.set(key, order.fetch);                                                // switched off: the amount it had comes back as the draft
        const r = clearFetch(world, b.id, good);
        refused.delete(key);
        ctx.afterCommand({ kind: 'fetch', result: r, undoable: false });
        return;
      }
      const r = setFetch(world, b.id, good, amount);
      if (r.ok) refused.delete(key); else refused.set(key, { result: r, day: world.day });
      ctx.afterCommand({ kind: 'fetch', result: r, undoable: false });
    });
    const move = (delta) => {
      const next = stepAmount(amount, delta, cap);
      if (next === amount) return;
      if (on) {
        const r = setFetch(world, b.id, good, next);
        if (!r.ok) refused.set(key, { result: r, day: world.day });
        ctx.afterCommand({ kind: 'fetch', result: r, undoable: false });
      } else { drafts.set(key, next); refresh(); }
    };
    const less = button('−', { class: 'step less', 'aria-label': W.less(good), disabled: amount <= stepOf, onClick: () => move(-1) });
    const more = button('+', { class: 'step more', 'aria-label': W.more(good), disabled: amount >= cap, onClick: () => move(1) });
    const value = el('output', { class: 'value', 'aria-live': 'polite', text: String(amount) });
    const stepper = el('span', { class: 'stepper', role: 'group', 'aria-label': W.amountLabel(good) }, [less, value, more]);
    const second = [el('span', { class: 'word small muted', text: W.upToWord }), stepper];
    // "from [Nearest granary, 34 tiles ▸]": where the goods come from now; the pick on the map changes it.
    const src = on ? orderSource(world, b.id, good) : null;
    if (src) {
      const from = button('', { class: `from-pick${src.chosen ? ' chosen' : ''}`, dataset: { good }, 'aria-label': K.fromAria(good, src), onClick: () => { refocus = key; if (typeof ctx.pickSource === 'function') ctx.pickSource(b.id, good); } });
      from.append(el('span', { class: 'label', text: K.fromLabel(src) }), el('span', { class: 'chev', 'aria-hidden': 'true', text: ' ▸' }));
      second.push(el('span', { class: 'from-group' }, [el('span', { class: 'word small muted', text: K.fromWord }), from]));
      if (refocus === key) { refocus = null; queueMicrotask(() => { if (from.isConnected) from.focus({ preventScroll: false }); }); }
    }
    const li = el('li', { class: `fetch-good${on ? ' order' : ''}`, dataset: { good } }, [el('div', { class: 'fetch-row' }, [sw]), el('div', { class: 'fetch-row fetch-second' }, second)]);
    // What it would do (before the tap) or what it is doing (an order).
    const note = (text, cls = 'small muted') => li.append(el('p', { class: `fetch-line ${cls}`, text }));
    const status = fetchStatus(world, b.id, good);
    // A note with its Show me beside it on one row, so a good costs one line more, not a line and a button.
    const noteWith = (text, cls, show) => li.append(el('div', { class: 'fetch-note' }, [el('p', { class: `fetch-line small ${cls}`, text }), show]));
    const sourceId = fetchSourceId(world, b.id, good);
    const sourceStore = sourceId !== null ? world.buildings[sourceId] : null;
    const toSource = sourceStore ? showMeButton(W.showSourceLabel(good, sourceStore.type), sourceId) : null;
    if (status) {
      if (status.gone) note(K.gone, 'small amber-text fetch-gone');
      if (status.state === 'dry') {
        // Version 8.3 (ruling 1384): a chosen store with none to spare: the cart waits, said in amber, with the way back to today's rule.
        const instead = button(K.nearestInstead, { class: 'nearest-instead', 'aria-label': K.nearestInsteadAria(good), onClick: () => {
          const r = setSource(world, b.id, good, null);
          ctx.afterCommand({ kind: 'source', result: r, undoable: false });
        } });
        li.append(el('div', { class: 'fetch-note fetch-dry' }, [el('p', { class: 'fetch-line small amber-text fetch-status', text: W.status(status) }), instead]));
        if (toSource) li.append(el('div', { class: 'fetch-note' }, [toSource]));
      } else {
        note(W.status(status), 'small fetch-status');
        if (toSource) li.append(el('div', { class: 'fetch-note' }, [toSource]));
      }
    } else {
      const pv = fetchPreview(world, b.id, good, amount);
      note(W.consequenceRow(pv), pv.source ? 'small fetch-consequence' : 'small muted fetch-consequence');
      if (pv.source) noteWith(W.sourceNote(good, pv.source), 'muted fetch-source', toSource);
      else {
        // No store can be drawn on: when one holds the good all the same, say why it cannot and where it is, before any tap.
        const h = holderOf(world, b.id, good);
        if (h) noteWith(W.holderNote(good, h), 'muted fetch-holder', showMeButton(W.showHolderLabel(good, h.type), h.id));
      }
    }
    // A refusal says why, and where to look.
    const ref = refused.get(key);
    if (ref && ref.day === world.day) {
      li.append(el('p', { class: 'fetch-line small coral fetch-refusal', role: 'status', text: W.refusal(ref.result) }));
      if (ref.result.reason === 'refuses') li.append(acceptShowMe(good));
    }
    return li;
  }

  function keepSection(b) {
    const orders = ordersOf(b);
    const others = BUILDINGS[b.type].stores.filter((g) => !orders.some((o) => o.good === g));
    const out = [el('h3', { class: 'keeps-head' }, [el('span', { class: 'label', text: W.head }), ' ', el('span', { class: 'small muted summary', text: orders.length ? W.count(orders.length) : W.none })])];
    if (!orders.length) out.push(el('p', { class: 'small muted fetch-help', text: W.help }));   // once a store has an order the help is spent (How to play keeps it)
    if (orders.length) out.push(el('ul', { class: 'fetch-goods orders' }, orders.map((o) => goodRow(b, o.good))));
    if (!others.length) return out;
    // With an order, the other goods fold under one button (a storehouse holds a dozen); with none they are all there to start one.
    const unfolded = !orders.length || open.has(b.id);
    if (orders.length) {
      const more = el('button', { type: 'button', class: 'fetch-more', 'aria-expanded': String(unfolded), dataset: { store: b.id } }, [
        el('span', { class: 'label', text: K.more(others.length) }), el('span', { class: 'chev', 'aria-hidden': 'true', text: unfolded ? ' ▴' : ' ▾' }),
      ]);
      more.addEventListener('click', () => { if (open.has(b.id)) open.delete(b.id); else open.add(b.id); refresh(); });
      out.push(more);
    }
    if (unfolded) out.push(el('ul', { class: 'fetch-goods others' }, others.map((g) => goodRow(b, g))));
    return out;
  }

  // The sheet of the store a Show me aimed at (aimKeepStocked): its row is unfolded, scrolled to and focused once the sheet is built.
  function aimed(b, panel) {
    if (!pendingAim || pendingAim.id !== b.id) return panel;
    const { good } = pendingAim;
    pendingAim = null;
    queueMicrotask(() => {
      const row = panel.querySelector(`.fetch-good[data-good="${good}"]`);
      if (row && row.isConnected) { row.scrollIntoView({ block: 'nearest' }); const sw = row.querySelector('.fetch-switch'); if (sw) sw.focus({ preventScroll: true }); }
    });
    return panel;
  }
  function panelOf(b) {
    if (pendingAim && pendingAim.id === b.id && !(b.orders && b.orders[pendingAim.good])) open.add(b.id);
    return aimed(b, el('div', { class: 'fetch-panel' }, keepSection(b)));
  }

  return {
    ...seamBase(),
    // The tip (ruling 1422): the first time the city has two stores, after any command (a store placed, or a city loaded with two and played on).
    // Asked again after each command until it has shown (the tips module says no while one was shown lately, and once it is seen).
    onCommand() { if (typeof ctx.fireTip === 'function' && storesOf(world).length >= 2) ctx.fireTip('twoStores'); },
    sheetParts: { ...seamBase().sheetParts, store: (b) => (b && world.buildings[b.id] === b && isStore(b) && cartsUnlocked(world) ? [panelOf(b)] : []) },
  };
}
