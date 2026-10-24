import { describe, it, expect } from '../harness.js';
import { installGuide, noticeText, showNotice } from '../../src/ui/installUi.js';
import { createTitleCard } from '../../src/ui/titleCard.js';
import { detectEnvironment, createInstallFlow } from '../../src/save/installFlow.js';
import { T, V711_TEXT } from '../../src/ui/text.js';
import { mount, fire } from '../helpers/dom.js';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';
const flowFor = (input, hasSave = false) => createInstallFlow({ env: detectEnvironment(input), hasSave: () => hasSave, getPrompt: () => ({ prompt() {} }) });

describe('ui install guide', () => {
  it('renders the iOS steps, the Android button and the new-storage warning (no Bring a city any more)', () => {
    const { root, cleanup } = mount();
    const log = [];
    installGuide(flowFor({ ua: IOS }), {})(root);
    expect(root.querySelectorAll('ol.steps li').length).toBe(T.installIosSteps.length);
    expect(root.textContent).toContain(T.installIosSteps[1]);
    expect(root.textContent).toContain(T.installWhy);
    expect(root.textContent.includes(T.installExportFirst)).toBe(false);
    expect(root.querySelector('.install-now')).toBe(null);
    root.innerHTML = '';
    installGuide(flowFor({ ua: IOS }, true), { hasCity: true })(root);
    expect(root.textContent).toContain(T.installExportFirst);
    root.innerHTML = '';
    installGuide(flowFor({ ua: ANDROID }), { onPrompt: () => log.push('prompt') })(root);
    expect(root.querySelector('ol.steps')).toBe(null);
    fire(root.querySelector('.install-now'), 'click');
    expect(log).toEqual(['prompt']);
    expect(root.textContent).toContain(T.installNotOffered);
    root.innerHTML = '';
    installGuide(flowFor({ ua: IOS, standalone: true }), {})(root);
    expect([root.querySelector('.bring'), root.textContent.includes('Safari')]).toEqual([null, false]);   // Version 8.0: Bring a city from Safari is gone, in the app as anywhere
    expect(root.textContent).toContain(T.installWhy);
    expect(noticeText('safari')).toBe(T.openInSafari);
    expect(noticeText('chrome')).toBe(T.openInChrome);
    expect(noticeText(null)).toBe(null);
    const notice = document.createElement('div');
    notice.hidden = true;
    showNotice(notice, T.openInSafari);
    expect(notice.hidden).toBe(false);
    expect(notice.querySelector('.notice').textContent).toContain(T.openInSafari);
    showNotice(notice, null);
    expect(notice.hidden).toBe(true);
    expect(notice.children.length).toBe(0);
    cleanup();
  });
  it('title card: a late Install button, and the guide in place of the buttons', () => {
    const { root, cleanup } = mount('<div id="title" hidden></div>');
    const container = root.querySelector('#title');
    const log = [];
    const card = createTitleCard({ container, hasSave: false, canInstall: false, onContinue: () => {}, onNewCity: () => {}, onInstall: () => log.push('install') });
    expect(container.querySelector('.bring')).toBe(null);                                                   // Version 8.0: no Bring a city, on any card
    const install = container.querySelector('.install');
    expect(install.previousElementSibling.classList.contains('title-more')).toBe(true);                     // Play, the row of Options and What's new, then Install where offered
    expect(install.previousElementSibling.previousElementSibling.classList.contains('new-city')).toBe(true);
    expect(install.hidden).toBe(true);
    card.setCanInstall(true);
    expect(install.hidden).toBe(false);
    fire(install, 'click');
    expect(log).toEqual(['install']);
    card.showGuide((body) => body.append(Object.assign(document.createElement('p'), { textContent: 'guide here', className: 'probe' })));
    expect(container.querySelector('.title-buttons').hidden).toBe(true);
    expect(container.querySelector('.guide .probe').textContent).toBe('guide here');
    const back = container.querySelector('.guide-back');
    expect(back.textContent).toBe(V711_TEXT.continueLabel);   // Version 7.1.1 (ruling 1106): the install guide is read through, so its foot button says Continue
    expect(document.activeElement).toBe(back);
    fire(back, 'click');
    expect(container.querySelector('.guide')).toBe(null);
    expect(container.querySelector('.title-buttons').hidden).toBe(false);
    expect(document.activeElement).toBe(container.querySelector('.new-city'));
    card.destroy();
    cleanup();
  });
});
