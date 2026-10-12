// The confirm bar for placing, drawing and demolishing (spec 6.4-6.5): name, cost, the reason when blocked,
// what a service will do from the ghost's spot (early-game pass 2.6), rotate for buildings that rotate, Flip
// for roads, Undo, x and the tick. It never tucks away. onConfirm gets the input type of the tick's press
// ('touch', 'pen', 'mouse' or 'keyboard', spec 6.7: decided when the press starts) so a touch tick can end the tool.
import { BUILDINGS } from '../data/buildings.js';
import { DESIRABILITY } from '../data/desirability.js';
import { isToolMode } from './modes.js';
import { buildingName, T, DANGER_UI_TEXT } from './text.js';
import { el, button, iconButton, clear } from './components.js';

const titleOf = (tool) => (tool.kind === 'building' ? buildingName(tool.type) : tool.kind === 'road' || tool.kind === 'wall' ? buildingName(tool.kind) : tool.kind === 'houses' ? T.housingPlots : T.demolish);
const NICER_TONE = { better: 'teal', worse: 'coral', mixed: 'muted', '': 'muted' };
const rotates = (tool) => tool.kind === 'building' && Boolean(BUILDINGS[tool.type].rotates);   // none in Stage 1 (mastabas come with monuments)

export function createConfirmBar({ container, store, placement, onCancel, onConfirm, onUndo }) {
  const element = el('div', { id: 'confirm', hidden: true });
  container.append(element);

  // Portrait stacks the corner buttons on top of the bar, and the bar's words can wrap at large text sizes, so
  // its real height goes to --confirm-h on the body (css/ui.css). Hidden, it takes nothing.
  // While one tool stays active the bar keeps the tallest height it has reached (a narrow phone at 150% text wraps a
  // warning to more lines, and "Housing plots" to two), so it and the corner buttons on it never bob back down as the
  // ghost moves. A new tool, layout or text size starts afresh.
  let heldKey = null, tallest = 0;
  function keepTallest(bar, s) {
    const key = `${s.layout}|${document.body.dataset.textSize}|${s.tool.kind}|${s.tool.type || ''}`;
    if (key !== heldKey) { heldKey = key; tallest = 0; }
    tallest = Math.max(tallest, bar.getBoundingClientRect().height);
    bar.style.minHeight = `${tallest}px`;
  }

  // The press type of the tick: its pointerdown names it, and a click with no pointerdown before it (Enter or Space on
  // the focused button, a screen reader's activate) is the keyboard's. A press that never became a click is forgotten.
  let pressType = null;
  const forgetPress = () => { pressType = null; };
  const rememberPress = (ev) => { pressType = ev.pointerType === 'pen' ? 'pen' : ev.pointerType === 'touch' ? 'touch' : 'mouse'; };
  const confirmPressed = () => { const type = pressType || 'keyboard'; pressType = null; onConfirm(type); };

  function publishHeight() {
    const h = element.hidden ? 0 : Math.ceil(element.getBoundingClientRect().height);
    if (h > 0) document.body.style.setProperty('--confirm-h', `${h}px`);
    else document.body.style.removeProperty('--confirm-h');
  }

  function render() {
    const s = store.get();
    // The bar rebuilds on every change, so remember which control had focus and put it back (spec 6.8).
    const focusedClass = element.contains(document.activeElement) ? [...document.activeElement.classList].find((c) => ['rotate', 'flip', 'undo', 'cancel', 'ok'].includes(c)) : null;
    clear(element);
    if (!isToolMode(s.mode) || !s.tool) { element.hidden = true; heldKey = null; publishHeight(); return; }
    element.hidden = false;
    const p = placement.preview();
    const demolish = s.tool.kind === 'demolish';
    // A demolish refunds, or (Stage 3) costs gold when it clears rubble: "Refund 7" or "20 gold", never a negative refund.
    const costText = demolish ? (p.refund > 0 ? `${T.refund} ${p.refund}` : p.refund < 0 ? DANGER_UI_TEXT.demolishCost(-p.refund) : '') : (p.cost ? `${p.cost} gold` : '');
    const info = el('div', { class: 'info' }, [
      el('div', { class: 'title', text: titleOf(s.tool) }),
      el('div', { class: 'cost small muted', text: costText }),
      el('div', { class: `reason small ${p.state === 'bad' ? 'coral' : p.state === 'warn' ? 'amber' : 'muted'}`, text: p.text }),
      // The effect takes the empty reason line when there is nothing to warn about, so the bar never grows a line. Homes
      // served read in teal; "no homes in reach yet" is not a gain, so it reads muted.
      // Stage 3: the score parts it would change ride on the same line ("Gives water to 6 homes · +3 Culture", spec 4.19).
      p.state === 'ok' && (p.effect || p.score) ? el('div', { class: `effect small ${(p.effect === T.noHomesInReach || p.effect === DANGER_UI_TEXT.firehouseCovers(0)) && !p.score ? 'muted' : 'teal'}`, text: [p.effect, p.score].filter(Boolean).join(' · ') }) : null,
      // What it does to the homes around it (spec 4.7), in words; teal when nicer, coral when less pleasant, ink when both.
      p.nicer ? el('div', { class: `nicer small ${NICER_TONE[p.nicerTone]}`, text: p.nicer }) : null,
    ]);
    const controls = [];
    if (rotates(s.tool)) controls.push(iconButton(T.rotate, '⟳', { class: 'rotate', disabled: true }));
    if ((s.tool.kind === 'road' || s.tool.kind === 'wall') && s.line && s.line.x1 !== null) controls.push(button(T.flip, { class: 'flip', onClick: () => placement.flip() }));
    // On a phone Undo is a small icon and only when there is something to undo (the toast after a placement keeps the word);
    // the wide layout keeps the word button, greyed out when there is nothing to undo.
    if (s.layout === 'wide') controls.push(button(T.undo, { class: 'undo', disabled: !placement.canUndo(), onClick: onUndo }));
    else if (placement.canUndo()) controls.push(iconButton(T.undo, '↶', { class: 'undo', onClick: onUndo }));
    controls.push(iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel }));
    controls.push(iconButton(T.confirm, '✓', { class: `ok ${demolish ? 'danger' : 'primary'}`, disabled: p.state === 'bad' || p.state === 'idle', onPointerDown: rememberPress, onPointerCancel: forgetPress, onKeyDown: forgetPress, onClick: confirmPressed }));
    // A building that changes desirability keeps a line for it (css: .confirm.desire), so the bar never grows as the ghost moves.
    const desire = s.tool.kind === 'building' && (DESIRABILITY[s.tool.type] || []).length > 0;
    const bar = el('div', { class: `confirm${demolish ? ' demolish' : ''}${desire ? ' desire' : ''}` }, [info, ...controls]);
    element.append(bar);
    keepTallest(bar, s);
    publishHeight();
    if (focusedClass) {
      const again = element.querySelector(`.${focusedClass}`);
      if (again && !again.disabled) again.focus();
    }
  }
  render();
  store.subscribe(render);
  return { render, element };
}
