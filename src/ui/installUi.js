// The install guide (a sheet in the game, a panel on the title card), the Bring-a-city offer and the
// in-app browser notice (spec 4.17). Decisions come from src/save/installFlow.js; this file only draws them.
import { el, button, clear } from './components.js';
import { T } from './text.js';

export function installGuide(flow, { hasCity = false, onPrompt = () => {}, onBring = () => {} } = {}) {
  return (body) => {
    if (flow.canBring()) {
      body.append(el('p', { text: T.bringCityHelp }), el('div', { class: 'actions' }, [button(T.bringCity, { class: 'bring primary', onClick: onBring })]));
      return;
    }
    body.append(el('p', { text: T.installWhy }));
    if (flow.env.platform === 'ios') {
      if (hasCity) body.append(el('p', { class: 'amber', text: T.installExportFirst }));
      body.append(el('ol', { class: 'steps' }, T.installIosSteps.map((s) => el('li', { text: s }))));
    } else {
      body.append(el('div', { class: 'actions' }, [button(T.installNow, { class: 'install-now primary', onClick: onPrompt })]));
      body.append(el('p', { class: 'small muted', text: T.installNotOffered }));
    }
  };
}

export const noticeText = (kind) => (kind === 'safari' ? T.openInSafari : kind === 'chrome' ? T.openInChrome : null);

export function showNotice(container, text) {
  clear(container);
  if (!text) { container.hidden = true; return; }
  container.append(el('div', { class: 'notice', role: 'status' }, [el('span', { class: 'icon', 'aria-hidden': 'true', text: 'ⓘ' }), el('span', { class: 'text', text })]));
  container.hidden = false;
}
