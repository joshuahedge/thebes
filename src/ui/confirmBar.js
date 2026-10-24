// The confirm bar for placing, drawing and demolishing (spec 6.4-6.5). It never tucks away. It holds:
// - the name and cost, a building's conditions and the reason when blocked;
// - what a service will do from the ghost's spot (early-game pass 2.6);
// - rotate for buildings that rotate, and Flip for a mouse's road or wall (a touch plan has no L to flip, placement review P3);
// - Undo, x and the tick.
// A drawing tool's first line says how to draw (the preview's words: drag or tap tiles for a finger, a start and an end for a
// mouse). onConfirm gets the input type of the tick's press ('touch', 'pen', 'mouse' or 'keyboard', spec 6.7: decided when the
// press starts, forgotten when it ends off the tick) so a touch tick can end the tool.
import { BUILDINGS } from '../data/buildings.js';
import { DESIRABILITY } from '../data/desirability.js';
import { isToolMode } from './modes.js';
import { buildingName, T, DANGER_UI_TEXT, CONDITION_TEXT, S46_MAP_TEXT, S46_WONDER_TEXT, S46_UX_TEXT, S47_SPOTS_TEXT, P_TEXT } from './text.js';
import { AREA_TEXT } from './areaText.js';
import { FERRY_TEXT } from './v71/ferryText.js';
import { ROUTE_TEXT } from './routeText.js';
import { el, button, iconButton, clear } from './components.js';

const titleOf = (tool) => (tool.kind === 'building' ? buildingName(tool.type) : tool.kind === 'road' && tool.gate ? buildingName('gate') : tool.kind === 'road' || tool.kind === 'wall' || tool.kind === 'ferry' ? buildingName(tool.kind) : tool.kind === 'houses' ? T.housingPlots : tool.kind === 'plazas' ? buildingName('plaza') : tool.kind === 'areas' ? AREA_TEXT.title(tool.type) : T.demolish);
const NICER_TONE = { better: 'teal', worse: 'coral', mixed: 'muted', '': 'muted' };
const NARROW_BAR = 365;   // px: a bar this narrow at 150% text can need a chip row for each condition (css/ui.css .conds.tall.narrow)
const rotates = (tool) => tool.kind === 'building' && Boolean(BUILDINGS[tool.type].rotates);   // none in Stage 1 (mastabas come with monuments)

export function createConfirmBar({ container, store, placement, onCancel, onConfirm, onUndo, keys = () => true, deleteUndoes = keys, onArea = (type, on) => (on ? placement.startArea(type) : placement.start({ kind: 'building', type })) }) {
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
  // A press that ends off the tick never becomes its click: forget it when the pointer is lifted outside the button (a finger is
  // held to the button it pressed, so its up lands here wherever it is), or leaves the button still pressed (a pen or a mouse).
  const releasePress = (ev) => {
    const r = ev.currentTarget.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) pressType = null;
  };
  const leavePress = (ev) => { if (ev.buttons) pressType = null; };
  const confirmPressed = () => { const type = pressType || 'keyboard'; pressType = null; onConfirm(type); };

  function publishHeight() {
    const h = element.hidden ? 0 : Math.ceil(element.getBoundingClientRect().height);
    if (h > 0) document.body.style.setProperty('--confirm-h', `${h}px`);
    else document.body.style.removeProperty('--confirm-h');
  }

  function render() {
    const s = store.get();
    // The bar rebuilds on every change, so remember which control had focus and put it back (spec 6.8).
    const focusedClass = element.contains(document.activeElement) ? [...document.activeElement.classList].find((c) => ['rotate', 'flip', 'undo', 'cancel', 'done', 'ok', 'show-fit', 'area-toggle'].includes(c)) : null;
    const focusedStyle = element.contains(document.activeElement) ? document.activeElement.dataset.style || null : null;   // Stage 4.6: the style button that had focus
    const focusedShape = element.contains(document.activeElement) ? document.activeElement.dataset.shape || null : null;   // Version 5.0 (Task 5): the road shape button that had focus
    clear(element);
    if (!isToolMode(s.mode) || !s.tool) { element.hidden = true; heldKey = null; publishHeight(); return; }
    element.hidden = false;
    const p = placement.preview();
    const demolish = s.tool.kind === 'demolish';
    // Version 7.0 (Track P): see the reason line below. While everything is met the line says what the building needs, unless the effect line has the room (a service's "Gives
    // water to 6 homes"), so a met spot is never a taller bar than a refused one. Wave 3 (ruling 992): while the chips show, a refused or partial spot's line carries only what no chip says
    // (placementWhy), and is empty (hidden, with the older reason line) when the chips say it all.
    const why = s.tool.kind === 'building' ? (p.why || (p.effect || p.score ? '' : p.needs) || '') : '';
    // A demolish refunds, or (Stage 3) costs gold when it clears rubble: "Refund 7" or "20 gold", never a negative refund.
    const costText = demolish ? (p.refund > 0 ? `${T.refund} ${p.refund}` : p.refund < 0 ? DANGER_UI_TEXT.demolishCost(-p.refund) : '') : (p.costText || (p.cost ? `${p.cost} gold` : ''));
    // The words are the title, then `lines` (the cost, balance, reason, effect, nicer and monument lines): a portrait terrain bar lets the title sit
    // beside the buttons and the lines run the whole width under them (css/ui.css .has-fit), keeping the room three lines need.
    const info = el('div', { class: 'info' }, [
      el('div', { class: 'title', text: titleOf(s.tool) }),
      el('div', { class: 'lines' }, [
        el('div', { class: 'cost small muted', text: [costText, p.upkeep, p.note].filter(Boolean).join(' · ') }),   // Stage 4.6 (ruling 350): the road tool's note on bridges, while nothing is drawn yet
        // Stage 4.5 (Task 4b): what the month's balance becomes with it, from the sim's forecast (coral when it is below 0).
        p.upkeep ? el('div', { class: `balance small ${p.balance && p.balanceNet < 0 ? 'coral' : 'muted'}`, text: p.balance || ' ' }) : null,   // a blocked spot keeps the line's room, empty
        // A touch plan that skips tiles says how many in amber (placement review P5): what it lays is fine, the rest is passed over.
        // A refusal the conditions row already says word for word (a terrain building's "Needs 2 of 4 tiles on clay") is not said twice: the line
        // stays in the bar for tests and tools but takes no room (hidden), so the bar stays under half the screen on a small phone (UX rule 2).
        // Version 7.0 (Track P, ruling 1008): a building's reason line is the why line below (every rule that fails, with the counts, led by what the colour means; while everything
        // is met, what the building needs). The older line stays in the page, hidden, as the first reason alone (tests and tools read it).
        el('div', { class: `reason small ${p.state === 'bad' ? 'coral' : p.state === 'warn' || (p.skipped && p.skipped.length) ? 'amber' : 'muted'}`, text: p.text, hidden: Boolean(why) || Boolean(p.whyParts && p.whyParts.length) || (p.state === 'bad' && (p.conditions || []).some((c) => c.state === 'cant' && c.text === p.text)) }),
        why ? el('div', { class: `why small ${p.state === 'bad' ? 'coral' : p.state === 'warn' ? 'amber' : 'muted'}`, text: why }) : null,
        // The effect takes the empty reason line when there is nothing to warn about, so the bar never grows a line. Homes
        // served read in teal; "no homes in reach yet" is not a gain, so it reads muted.
        // Stage 3: the score parts it would change ride on the same line ("Gives water to 6 homes · +3 Culture", spec 4.19).
        p.state === 'ok' && !p.line && (p.effect || p.score) ? el('div', { class: `effect small ${(p.effect === T.noHomesInReach || p.effect === DANGER_UI_TEXT.firehouseCovers(0)) && !p.score ? 'muted' : 'teal'}`, text: [p.effect, p.score].filter(Boolean).join(' · ') }) : null,
        // What it does to the homes around it (spec 4.7), in words; teal when nicer, coral when less pleasant, ink when both.
        p.nicer ? el('div', { class: `nicer small ${NICER_TONE[p.nicerTone]}`, text: p.nicer }) : null,
        // Stage 4 (Track C, spec 6.5, ruling 251): a monument's line, placeable or waiting for its road: "+32 Monuments when finished ·
        // then 130 gold a crew a month · finished: 9 homes nicer". Two lines at most on a phone (css), every word in its name.
        p.line ? el('div', { class: 'monument-line small', title: p.line, 'aria-label': p.line, text: p.line }) : null,
        // Version 5.0 (Task 4, ruling 505): what Build another copies from the first building (its Fetch orders), said before the tick.
        p.copy ? el('div', { class: 'copy-line small teal', text: p.copy }) : null,
      ]),
    ]);
    const controls = [];
    // Version 5.0 (Task 4): a farm, garden or statue tool offers a drag area (a 44 px icon named for what it does); the area tool offers one at a time again.
    const areaType = typeof placement.areaType === 'function' ? placement.areaType() : null;
    if (areaType) {
      const on = s.tool.kind === 'areas';
      controls.push(iconButton(on ? AREA_TEXT.oneLabel(areaType) : AREA_TEXT.areaLabel(areaType), on ? '▢' : '▦', { class: 'area-toggle', 'aria-pressed': String(on), title: on ? AREA_TEXT.one : AREA_TEXT.area, onClick: () => onArea(areaType, !on) }));
    }
    if (rotates(s.tool)) controls.push(iconButton(T.rotate, '⟳', { class: 'rotate', title: keys() ? `${T.rotate} (R)` : T.rotate, 'aria-keyshortcuts': keys() ? 'r R' : null, onClick: () => placement.rotate() }));   // Stage 4: a mastaba turns (ruling 234)
    if ((s.tool.kind === 'road' || s.tool.kind === 'wall') && !s.tool.route && s.line && s.line.x1 !== null) controls.push(button(T.flip, { class: 'flip', onClick: () => placement.flip() }));
    // On a phone Undo is a small icon and only when there is something to undo (the toast after a placement keeps the word);
    // the wide layout keeps the word button, greyed out when there is nothing to undo.
    // Version 7.0 (Track P): its tooltip and aria-keyshortcuts name Ctrl+Z, and Delete while the single keys are on.
    // Wave 3 (ruling 986): Delete is named only while it would undo this: never when the last step was a demolish.
    const del = deleteUndoes();
    const undoHint = { title: P_TEXT.undoTitle(del), 'aria-keyshortcuts': del ? 'Control+Z Meta+Z Delete Backspace' : 'Control+Z Meta+Z' };
    if (s.layout === 'wide') controls.push(button(T.undo, { class: 'undo', ...undoHint, disabled: !placement.canUndo(), onClick: onUndo }));
    else if (placement.canUndo() || s.tool.kind === 'houses') controls.push(iconButton(T.undo, '↶', { class: 'undo', ...undoHint, disabled: !placement.canUndo(), onClick: onUndo }));   // Stage 4.7: the house tool stays on, so its Undo is always there (greyed with nothing to undo) and the bar does not widen when the first plot goes down
    // Stage 4.6 (ruling 400): Enter lays what is waiting and Esc takes it back whatever has focus (keyboard.js, createUI's placementPending), and where
    // there is a keyboard the tick says so: a small "Enter" on it (css, body[data-keyboard]), and the keys in the buttons' tooltips and keyshortcuts.
    // Stage 4.7 (Task 4, ruling 465): the house tool stays on after a plot is laid (by touch too), so with nothing waiting to be laid the way out is a clear Done
    // (a word, 44 px, named for what it ends); with plots waiting the x takes them back, as every tool's does.
    if (s.tool.kind === 'houses' && !s.plan && !s.area) controls.push(button(S47_SPOTS_TEXT.done, { class: 'done', 'aria-label': S47_SPOTS_TEXT.doneLabel, title: `${S47_SPOTS_TEXT.doneLabel} (${S46_UX_TEXT.keyEsc})`, 'aria-keyshortcuts': 'Escape', onClick: onCancel }));
    else controls.push(iconButton(T.cancel, '✕', { class: 'cancel', title: `${T.cancel} (${S46_UX_TEXT.keyEsc})`, 'aria-keyshortcuts': 'Escape', onClick: onCancel }));
    const ok = iconButton(T.confirm, '✓', { class: `ok ${demolish ? 'danger' : 'primary'}`, title: `${T.confirm} (${S46_UX_TEXT.keyEnter})`, 'aria-keyshortcuts': 'Enter', disabled: p.state === 'bad' || p.state === 'idle', onPointerDown: rememberPress, onPointerUp: releasePress, onPointerLeave: leavePress, onPointerCancel: forgetPress, onKeyDown: forgetPress, onClick: confirmPressed });
    ok.append(el('span', { class: 'keyhint', 'aria-hidden': 'true', text: S46_UX_TEXT.keyEnter }));
    controls.push(ok);
    // A building that changes desirability keeps a line for it (css: .confirm.desire), so the bar never grows as the ghost moves.
    const desire = s.tool.kind === 'building' && (DESIRABILITY[s.tool.type] || []).length > 0;
    // A building's conditions, each with its own mark and words (placement review P9): met, later (it can be placed but will not
    // work yet) or can't. The row is always there for a building tool, empty or not, so the bar keeps one height as the ghost moves;
    // it takes the whole width under the words and the buttons. A chip's words are its name for screen readers, with its state.
    // A terrain building's and (Stage 4, ruling 230) a monument's row keep room for two rows of chips from the start.
    const chips = s.tool.kind === 'building' ? el('div', { class: `conds${BUILDINGS[s.tool.type].terrain || BUILDINGS[s.tool.type].monument ? ` tall${element.getBoundingClientRect().width <= NARROW_BAR ? ' narrow' : ''}` : ''}`, role: 'group', 'aria-label': CONDITION_TEXT.group }, (p.conditions || []).map((c) =>
      el('span', { class: `cond ${c.state}`, role: 'img', 'aria-label': c.label }, [el('span', { class: 'mark', 'aria-hidden': 'true', text: c.mark }), ` ${c.text}`]))) : null;
    // Stage 4.6 (rulings 331, 350): a refused terrain or water spot, and a road that meets water too wide or crooked to bridge, offer Show me on a row of
    // its own under the bar's words and buttons (css/ui.css .show-fit): it asks the Map seam (src/ui/s46/map.js, on the 'thebes:show-fit' event) to go to
    // the nearest place that fits.
    const showFit = p.showFit ? button(S46_MAP_TEXT.showFit, { class: 'show-fit', 'aria-label': S46_MAP_TEXT.showFitLabel(p.reason === 'ferry_bridge' ? FERRY_TEXT.showFitWhat.bridge : p.reason === 'too_wide' || s.tool.kind === 'ferry' ? FERRY_TEXT.showFitWhat.ferry : s.tool.kind === 'road' ? 'a bridge' : `a ${titleOf(s.tool).toLowerCase()}`), onClick: () => element.dispatchEvent(new CustomEvent('thebes:show-fit', { bubbles: true })) }) : null;
    if (showFit && p.routed && p.at && p.reason !== 'too_wide') showFit.setAttribute('aria-label', ROUTE_TEXT.showMeLabel);   // Version 5.0 (Task 5): a routed road's refusal shows what is in the way, not a bridge
    // A building bound to its ground keeps the Show me row's room from the start (as its chips row does), empty until a refusal fills it, so the
    // bar keeps one height as the ghost moves onto a refused spot and the corner buttons on it do not jump (ruling 352).
    const bound = s.tool.kind === 'building' && Boolean(BUILDINGS[s.tool.type].terrain || BUILDINGS[s.tool.type].water);
    const fitRoom = bound && !showFit ? el('div', { class: 'show-fit-room', 'aria-hidden': 'true' }) : null;
    // Stage 4.6 (Wonders track, ruling 343): a monument's style picker, a row of its own under the conditions: each offered style is a button (the one
    // in force carries a tick and aria-checked, so it is never colour alone) and one line says what the style in force costs and does, from the sim.
    const choices = s.tool.kind === 'building' && typeof placement.styleChoices === 'function' ? placement.styleChoices() : null;
    const styleRow = choices ? el('div', { class: 'style-row' }, [
      el('div', { class: 'style-choices', role: 'group', 'aria-label': S46_WONDER_TEXT.styleGroup }, choices.map((c) => button(c.active ? `✓ ${c.name}` : c.name, {
        class: `style-pick${c.active ? ' on' : ''}`, 'aria-pressed': String(c.active), 'aria-label': S46_WONDER_TEXT.styleLabel(c.name, c.line), dataset: { style: c.id }, onClick: () => placement.setStyle(c.id),
      }))),
      el('div', { class: 'style-line small', text: (choices.find((c) => c.active) || choices[0]).line }),
    ]) : null;
    // Version 5.0 (Task 4): a garden or statue area asks how far apart: three buttons (the one in force ticked and aria-pressed), each named for what it would lay now.
    const spacing = typeof placement.spacingChoices === 'function' ? placement.spacingChoices() : null;
    const spacingRow = spacing ? el('div', { class: 'area-row' }, [el('div', { class: 'area-choices', role: 'group', 'aria-label': AREA_TEXT.spacingGroup }, spacing.map((c) => button(c.active ? `✓ ${c.name}` : c.name, {
      class: `area-pick${c.active ? ' on' : ''}`, 'aria-pressed': String(c.active), 'aria-label': c.label, dataset: { gap: String(c.gap) }, onClick: () => placement.setSpacing(c.gap),
    })))]) : null;
    // Version 5.0 (Task 5, rulings 560-569): the road tool asks its shape, Route or Straight: two buttons (the one in force ticked and aria-pressed), each named for what it does.
    const shape = typeof placement.routeMode === 'function' ? placement.routeMode() : null;
    const routeRow = shape ? el('div', { class: 'route-row' }, [el('div', { class: 'route-choices', role: 'group', 'aria-label': ROUTE_TEXT.group }, [['route', ROUTE_TEXT.route, ROUTE_TEXT.routeLabel], ['straight', ROUTE_TEXT.straight, ROUTE_TEXT.straightLabel]].map(([id, name, label]) => button(shape === id ? `✓ ${name}` : name, {
      class: `route-pick${shape === id ? ' on' : ''}`, 'aria-pressed': String(shape === id), 'aria-label': label, dataset: { shape: id }, onClick: () => placement.setRoute(id === 'route'),
    })))]) : null;
    const bar = el('div', { class: `confirm${demolish ? ' demolish' : ''}${desire ? ' desire' : ''}${chips ? ' has-conds' : ''}${p.upkeep ? ' bal' : ''}${showFit || fitRoom ? ' has-fit' : ''}${styleRow ? ' has-style' : ''}${spacingRow ? ' has-area' : ''}${routeRow ? ' has-route' : ''}` }, [info, ...controls, chips, showFit, fitRoom, styleRow, spacingRow, routeRow]);
    element.append(bar);
    keepTallest(bar, s);
    publishHeight();
    if (focusedClass) {
      const again = element.querySelector(`.${focusedClass}`);
      if (again && !again.disabled) again.focus();
    } else if (focusedStyle) {
      const again = element.querySelector(`[data-style="${focusedStyle}"]`);
      if (again) again.focus();
    } else if (focusedShape) {
      const again = element.querySelector(`[data-shape="${focusedShape}"]`);
      if (again) again.focus();
    }
  }
  render();
  store.subscribe(render);
  return { render, element };
}
