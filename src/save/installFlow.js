// Where the game runs and what that means for saved data (spec 4.17): iOS Safari (home-screen storage is
// separate, so the install guide comes first), the home-screen app, in-app browsers (cannot install, keep separate
// storage: say so), and Android or desktop (the install prompt). Version 8.0: no Bring-a-city offer in the app.
export const IN_APP = [/FBAN|FBAV|FB_IAB/, /Instagram/, /Messenger/, /LinkedInApp/, /Twitter/];

export function detectEnvironment({ ua = '', standalone = false, hasBeforeInstallPrompt = false } = {}) {
  const platform = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'desktop';
  return { platform, inApp: IN_APP.some((re) => re.test(ua)), standalone: Boolean(standalone), canPrompt: Boolean(hasBeforeInstallPrompt) && !standalone };
}

export function readEnvironment(win) {
  const nav = win.navigator || {};
  let standalone = nav.standalone === true;
  try { if (!standalone && typeof win.matchMedia === 'function') standalone = Boolean(win.matchMedia('(display-mode: standalone)').matches); } catch (e) { /* no media queries */ }
  return { ua: nav.userAgent || '', standalone, hasBeforeInstallPrompt: 'onbeforeinstallprompt' in win };
}

export function createInstallFlow({ env, hasSave = () => false, getPrompt = () => null }) {
  const installable = () => !env.standalone && !env.inApp;
  return {
    env,
    canInstall: () => installable() && (env.platform === 'ios' || env.canPrompt || Boolean(getPrompt())),
    // Version 9.3.1 (Track N, ruling 2021): never. An iPhone's first screen is the game's title; the guide opens from the title's Install button and from the install ask
    // after the first Pass, as Android's prompt does (it was this function's "an iOS device with no saved city" before).
    shouldShowGuide: () => false,
    notice: () => (env.inApp ? (env.platform === 'ios' ? 'safari' : 'chrome') : null),
    async promptInstall() {
      const ev = getPrompt();
      if (!ev || typeof ev.prompt !== 'function') return 'guide';
      try {
        ev.prompt();
        const choice = await ev.userChoice;
        return choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
      } catch (e) { return 'guide'; }
    },
  };
}

// Version 9.0 (Track L, ruling 1587): the install ask comes once, after the first Pass, on a device that is not installed. due({ rulers, asked }): true while a ruler
// is kept, the ask has not been made on this device (asked, boot's one-time flag) and the device can install (flow.canInstall()). The ruler list's top line shows
// while a ruler is kept and the device can install; the toast and navigator.storage.persist() at the first Pass use this.
export const INSTALL_ASK_KEY = 'thebes.installAsk';
export const installAskDue = (flow, { rulers = 0, asked = false } = {}) => rulers > 0 && !asked && flow.canInstall();
