// The Fetch control on a store's sheet (Stage 4.7, Task 6, ruling 467). One panel: a storehouse's or granary's sheet gains a "Fetch goods" row (hidden until any
// store stands, cartsUnlocked) that opens the list of goods the store may hold. Each good has a toggle (a switch: Fetching / Off), a stepper for how much to
// fetch up to (steps of one cart's load), and the words under it, every one from the sim:
//   before the tap   the exact consequence in one short line (fetchPreview through S47_CARTS_TEXT.consequenceRow: it respects what the store already holds, as the
//                    live status does) and what the source store gives (sourceNote: a store with no order of its own for the good can be emptied, one with an
//                    order keeps it), with Show me to that store (fetchSourceId); a good no store can spare is one muted line, and when a store holds it all the
//                    same (holderOf) the reason and Show me to that store are there before any tap
//   with an order    the live status line (fetchStatus)
//   a refusal        why (setFetch's reason), and Show me to the store that holds the good when there is one (holderOf), or to the accept switch of a refused good
// Seam shape: src/ui/s46/seam.js, with one more sheet part, `store(b)`, which sheets.js calls under a store's "Stored n of m" row. Nothing here floats over the map (UX rule 1): the panel is the sheet. Goods on the road are shown by the sheet's stock rows
// (src/ui/sheets.js, roadGoods).
import { seamBase } from '../s46/seam.js';
import { BUILDINGS } from '../../data/buildings.js';
import { CARTS } from '../../data/s47.js';
import { cartsUnlocked, isStore, ordersOf, setFetch, clearFetch, fetchPreview, fetchStatus, fetchSourceId, holderOf } from '../../sim/carts.js';
import { el, button } from '../components.js';
import { S47_CARTS_TEXT as W, goodName } from '../text.js';

const stepOf = CARTS.perTrip;
// The stepper's moves: one cart load (20) at a time up to 200, then 100 at a time up to the store's capacity (a store holds hundreds); never below one load.
export const FINE_TO = 200, COARSE_STEP = 100;
export function stepAmount(amount, dir, cap) {
  if (dir > 0) return Math.min(cap, amount >= FINE_TO ? amount + COARSE_STEP : Math.min(FINE_TO, amount + stepOf));
  return Math.max(stepOf, amount > FINE_TO ? Math.max(FINE_TO, amount - COARSE_STEP) : amount - stepOf);
}

export function createCartsUi(ctx) {
  const { world } = ctx;
  const open = new Set();          // store ids whose Fetch list is open (kept here so a day's rebuild of the sheet does not close it)
  const drafts = new Map();        // `${store}|${good}` -> the amount a toggle would set (before an order exists)
  const refused = new Map();       // `${store}|${good}` -> { result, day } the last refusal, shown the rest of that game day
  const keyOf = (b, good) => `${b.id}|${good}`;
  const draftOf = (b, good) => drafts.get(keyOf(b, good)) || Math.min(CARTS.defaultFetch, BUILDINGS[b.type].capacity);
  const refresh = () => ctx.refresh();

  function showMeButton(label, id) {
    return button(W.showMe, { class: 'show-me quiet', 'aria-label': label, dataset: { target: id }, onClick: () => ctx.selectBuilding(id) });
  }

  // The accept switch of a refused good is on this very sheet: Show me takes focus there.
  function acceptShowMe(good) {
    return button(W.showMe, { class: 'show-me quiet accept-show', 'aria-label': `${W.showMe}: ${goodName(good)}`, onClick: (ev) => {
      const sw = ev.currentTarget.closest('#sheet') && ev.currentTarget.closest('#sheet').querySelector(`.switch.accept[data-good="${good}"]`);
      if (sw) { sw.scrollIntoView({ block: 'nearest' }); sw.focus(); }
    } });
  }

  // One good's row. Returns a list item.
  function goodRow(b, good) {
    const key = keyOf(b, good), order = b.orders && b.orders[good] ? b.orders[good] : null;
    const cap = BUILDINGS[b.type].capacity;
    const amount = order ? order.fetch : draftOf(b, good);
    const name = goodName(good);
    const on = Boolean(order);
    const sw = el('button', { type: 'button', role: 'switch', class: 'switch fetch-switch', 'aria-checked': String(on), 'aria-label': W.setLabel(good), dataset: { good } }, [
      el('span', { class: 'good', text: name }),
      el('span', { class: 'state small', text: on ? W.on : W.off }),
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
    const value = el('output', { class: 'value', 'aria-live': 'polite', text: W.upTo(amount) });
    const stepper = el('span', { class: 'stepper', role: 'group', 'aria-label': W.amountLabel(good) }, [less, value, more]);
    const li = el('li', { class: 'fetch-good', dataset: { good } }, [el('div', { class: 'fetch-row' }, [sw, stepper])]);
    // What it would do (before the tap) or what it is doing (an order).
    const note = (text, cls = 'small muted') => li.append(el('p', { class: `fetch-line ${cls}`, text }));
    const status = fetchStatus(world, b.id, good);
    // A note with its Show me beside it on one row, so a good costs one line more, not a line and a button.
    const noteWith = (text, cls, show) => li.append(el('div', { class: 'fetch-note' }, [el('p', { class: `fetch-line small ${cls}`, text }), show]));
    const sourceId = fetchSourceId(world, b.id, good);
    const sourceStore = sourceId !== null ? world.buildings[sourceId] : null;
    const toSource = sourceStore ? showMeButton(W.showSourceLabel(good, sourceStore.type), sourceId) : null;
    if (status) {
      note(W.status(status), 'small fetch-status');
      if (toSource) li.append(el('div', { class: 'fetch-note' }, [toSource]));
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

  function fetchSection(b) {
    const orders = ordersOf(b);
    const isOpen = open.has(b.id);
    const toggle = el('button', { type: 'button', class: 'fetch-head', 'aria-expanded': String(isOpen), dataset: { store: b.id } }, [
      el('span', { class: 'label', text: W.head }),
      el('span', { class: 'small muted summary', text: orders.length ? W.count(orders.length) : W.none }),
      el('span', { class: 'chev', 'aria-hidden': 'true', text: isOpen ? '▴' : '▾' }),
    ]);
    toggle.addEventListener('click', () => { if (open.has(b.id)) open.delete(b.id); else open.add(b.id); refresh(); });
    const out = [toggle];
    if (!isOpen) {
      // Closed: the live line of each order stays under the row, so an order is never out of sight.
      for (const o of orders) {
        const st = fetchStatus(world, b.id, o.good);
        if (st) out.push(el('p', { class: 'fetch-line small fetch-status', dataset: { good: o.good }, text: W.status(st) }));
      }
      return out;
    }
    if (!orders.length) out.push(el('p', { class: 'small muted fetch-help', text: W.help }));   // once a store has an order the help is spent (How to play keeps it)
    out.push(el('ul', { class: 'fetch-goods' }, BUILDINGS[b.type].stores.map((good) => goodRow(b, good))));
    return out;
  }

  return {
    ...seamBase(),
    sheetParts: { ...seamBase().sheetParts, store: (b) => (b && world.buildings[b.id] === b && isStore(b) && cartsUnlocked(world) ? [el('div', { class: 'fetch-panel' }, fetchSection(b))] : []) },
  };
}
