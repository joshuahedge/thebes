// The confirm bar for placing, drawing and demolishing (spec 6.4-6.5): name, cost, the reason when blocked,
// rotate (nothing rotates yet), Flip for roads, Undo, x and the tick. It never tucks away.
import { isToolMode } from './modes.js';
import { buildingName, T } from './text.js';
import { el, button, iconButton, clear } from './components.js';

const titleOf = (tool) => (tool.kind === 'building' ? buildingName(tool.type) : tool.kind === 'road' ? buildingName('road') : tool.kind === 'houses' ? T.housingPlots : T.demolish);

export function createConfirmBar({ container, store, placement, onCancel, onConfirm, onUndo }) {
  const element = el('div', { id: 'confirm', hidden: true });
  container.append(element);

  function render() {
    const s = store.get();
    clear(element);
    if (!isToolMode(s.mode) || !s.tool) { element.hidden = true; return; }
    element.hidden = false;
    const p = placement.preview();
    const demolish = s.tool.kind === 'demolish';
    const costText = demolish ? (p.refund ? `${T.refund} ${p.refund}` : '') : (p.cost ? `${p.cost} gold` : '');
    const info = el('div', { class: 'info' }, [
      el('div', { class: 'title', text: titleOf(s.tool) }),
      el('div', { class: 'cost small muted', text: costText }),
      el('div', { class: `reason small ${p.state === 'bad' ? 'coral' : p.state === 'warn' ? 'amber' : 'muted'}`, text: p.text }),
    ]);
    const controls = [iconButton(T.rotate, '⟳', { class: 'rotate', disabled: true })];
    if (s.tool.kind === 'road' && s.line && s.line.x1 !== null) controls.push(button(T.flip, { class: 'flip', onClick: () => placement.flip() }));
    controls.push(button(T.undo, { class: 'undo', disabled: !placement.canUndo(), onClick: onUndo }));
    controls.push(iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel }));
    controls.push(iconButton(T.confirm, '✓', { class: `ok ${demolish ? 'danger' : 'primary'}`, disabled: p.state === 'bad' || p.state === 'idle', onClick: onConfirm }));
    element.append(el('div', { class: `confirm${demolish ? ' demolish' : ''}` }, [info, ...controls]));
  }
  render();
  store.subscribe(render);
  return { render, element };
}
