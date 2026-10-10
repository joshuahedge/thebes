import { describe, it, expect } from '../harness.js';
import { detectEnvironment, createInstallFlow, readEnvironment } from '../../src/save/installFlow.js';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0';
const IN_APP_IOS = `${IOS} [FBAN/FBIOS;FBAV/400.0]`;
const INSTAGRAM = `${ANDROID} Instagram 300.0`;

describe('install flow', () => {
  it('tells iOS Safari, the home-screen app, in-app browsers, Android and desktop apart', () => {
    expect(detectEnvironment({ ua: IOS })).toEqual({ platform: 'ios', inApp: false, standalone: false, canPrompt: false });
    expect(detectEnvironment({ ua: IOS, standalone: true })).toEqual({ platform: 'ios', inApp: false, standalone: true, canPrompt: false });
    expect(detectEnvironment({ ua: IN_APP_IOS })).toEqual({ platform: 'ios', inApp: true, standalone: false, canPrompt: false });
    expect(detectEnvironment({ ua: INSTAGRAM })).toEqual({ platform: 'android', inApp: true, standalone: false, canPrompt: false });
    expect(detectEnvironment({ ua: `${ANDROID} FB_IAB/FB4A Messenger` }).inApp).toBe(true);
    expect(detectEnvironment({ ua: `${DESKTOP} LinkedInApp` }).inApp).toBe(true);
    expect(detectEnvironment({ ua: `${IOS} Twitter for iPhone` }).inApp).toBe(true);
    expect(detectEnvironment({ ua: ANDROID, hasBeforeInstallPrompt: true })).toEqual({ platform: 'android', inApp: false, standalone: false, canPrompt: true });
    expect(detectEnvironment({ ua: DESKTOP })).toEqual({ platform: 'desktop', inApp: false, standalone: false, canPrompt: false });
    expect(detectEnvironment({ ua: DESKTOP, standalone: true, hasBeforeInstallPrompt: true }).canPrompt).toBe(false);
    expect(detectEnvironment({})).toEqual({ platform: 'desktop', inApp: false, standalone: false, canPrompt: false });
    const read = readEnvironment({ navigator: { userAgent: IOS, standalone: true }, matchMedia: () => ({ matches: false }) });
    expect(read).toEqual({ ua: IOS, standalone: true, hasBeforeInstallPrompt: false });
    expect(readEnvironment({ navigator: { userAgent: DESKTOP }, matchMedia: () => ({ matches: true }), onbeforeinstallprompt: null })).toEqual({ ua: DESKTOP, standalone: true, hasBeforeInstallPrompt: true });
    expect(readEnvironment({ navigator: { userAgent: DESKTOP }, matchMedia: () => { throw new Error('x'); } }).standalone).toBe(false);
  });
  it('decides the guide, the install button, Bring a city and the notice from the environment', () => {
    const flow = (input, hasSave = false, prompt = null) => createInstallFlow({ env: detectEnvironment(input), hasSave: () => hasSave, getPrompt: () => prompt });
    const ios = flow({ ua: IOS });
    expect([ios.shouldShowGuide(), ios.canInstall(), ios.canBring(), ios.notice()]).toEqual([true, true, false, null]);
    expect(flow({ ua: IOS }, true).shouldShowGuide()).toBe(false);
    const home = flow({ ua: IOS, standalone: true });
    expect([home.shouldShowGuide(), home.canInstall(), home.canBring()]).toEqual([false, false, true]);
    expect(flow({ ua: IOS, standalone: true }, true).canBring()).toBe(false);
    const inApp = flow({ ua: IN_APP_IOS });
    expect([inApp.shouldShowGuide(), inApp.canInstall(), inApp.notice()]).toEqual([false, false, 'safari']);
    expect(flow({ ua: INSTAGRAM }).notice()).toBe('chrome');
    expect(flow({ ua: ANDROID }).canInstall()).toBe(false);
    expect(flow({ ua: ANDROID }, false, { prompt() {} }).canInstall()).toBe(true);     // the event arrived later
    expect(flow({ ua: DESKTOP, hasBeforeInstallPrompt: true }).canInstall()).toBe(true);
    expect(flow({ ua: DESKTOP }).shouldShowGuide()).toBe(false);
    expect(flow({ ua: DESKTOP, standalone: true }).canBring()).toBe(true);
  });
  it('prompts through the captured event, else falls back to the guide', async () => {
    const calls = [];
    const f = (prompt) => createInstallFlow({ env: detectEnvironment({ ua: ANDROID }), getPrompt: () => prompt });
    expect(await f({ prompt() { calls.push('prompt'); }, userChoice: Promise.resolve({ outcome: 'accepted' }) }).promptInstall()).toBe('accepted');
    expect(calls).toEqual(['prompt']);
    expect(await f({ prompt() {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) }).promptInstall()).toBe('dismissed');
    expect(await f({ prompt() { throw new Error('once only'); } }).promptInstall()).toBe('guide');
    expect(await f(null).promptInstall()).toBe('guide');
  });
});
