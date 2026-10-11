// Boot in two phases (spec 4.1, 4.17): the title card over a drifting sample city, then the game. Saves go
// through the save store; a loaded world is used as it is (never assigned into a live world) and the game
// always reopens paused. ?skipTitle=1 boots straight into a new city and ?welcome=1 shows the Welcome back card (development flags:
// they write nothing until the first autosave, which then replaces the saved city).
import { createWorld } from './sim/world.js';
import { setSpeed, setGuide } from './sim/commands.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { createGameLoop } from './render/loop.js';
import { buildSampleCity, buildStressCity } from './dev/sampleCity.js';
import { createUI } from './ui/createUI.js';
import { createSettings } from './ui/settings.js';
import { createSfx } from './audio/sfx.js';
import { createCameraControl } from './ui/cameraControl.js';
import { createTitleCard, createBackdrop } from './ui/titleCard.js';
import { createSaveStore } from './save/store.js';
import { packSave, unpackSave } from './save/serialize.js';
import { TITLE_SEED } from './data/ui.js';
import { exportSave, downloadFile, pickFile, importSaveFile } from './save/exportImport.js';
import { T, importErrorText } from './ui/text.js';
import { el, button } from './ui/components.js';
import { detectEnvironment, readEnvironment, createInstallFlow } from './save/installFlow.js';
import { installGuide, noticeText, showNotice } from './ui/installUi.js';
import { openSheet } from './ui/modes.js';
import { registerServiceWorker, applyUpdate } from './pwa.js';

const HOUR = 3600 * 1000;

// What the slot holds, as the title card needs it. Load errors are reported, never repaired here.
export async function loadSave(store) {
  let loaded;
  try { loaded = await store.load(); } catch (e) { return { state: 'error', code: (e && e.message) || 'corrupt_save' }; }
  if (!loaded) return { state: 'none' };
  try { return { state: 'ok', text: loaded.text, ...unpackSave(loaded.text), usedBackup: Boolean(loaded.usedBackup) }; }
  catch (e) { return { state: 'error', code: (e && e.message) || 'corrupt_save' }; }
}

export async function boot(doc, win, {
  root = doc.body, store = createSaveStore(), params = new URLSearchParams(win.location.search),
  now = () => performance.now(), clock = () => Date.now(), storage = undefined, uiOptions = {}, loopOptions = {}, platform = {}, envInput = readEnvironment(win),
  sw = (win.navigator && win.navigator.serviceWorker) || null,
} = {}) {
  const canvas = root.querySelector('#map');
  const renderer = createRenderer({ canvas });
  const settings = createSettings({ storage, root });
  // One audio context for the whole page: every game (New city, import) shares it.
  const sfx = createSfx({ enabled: () => settings.get().sound, canVibrate: () => settings.get().vibration });
  // The share sheet, the download and the file picker, replaceable by tests.
  const nav = win.navigator || {};
  const io = {
    share: typeof nav.share === 'function' ? (d) => nav.share(d) : null,
    canShare: typeof nav.canShare === 'function' ? (d) => nav.canShare(d) : null,
    download: (file) => downloadFile(file, doc),
    pick: () => pickFile(doc),
    reload: () => win.location.reload(),
    ...platform,
  };
  // The install prompt arrives on its own time (Android, desktop Chrome and Edge): keep it for the button.
  let promptEvent = null;
  const onPrompt = (e) => { e.preventDefault(); promptEvent = e; if (title) title.card.setCanInstall(flow.canInstall()); };
  win.addEventListener('beforeinstallprompt', onPrompt);
  if (!io.installPrompt) io.installPrompt = () => promptEvent;
  let loadedOk = false;
  let current = null;        // { world, ui, loop, cam } while the game runs
  let title = null;          // { card, loop, backdrop } while the title shows
  let pendingUpdate = null;  // a waiting worker's restart, kept through the title and offered once the game runs
  const flow = createInstallFlow({ env: detectEnvironment(envInput), hasSave: () => loadedOk || Boolean(current), getPrompt: io.installPrompt });
  showNotice(root.querySelector('#notice'), noticeText(flow.notice()));
  const view = uiOptions.getSize || (() => ({ width: canvas.clientWidth || win.innerWidth, height: canvas.clientHeight || win.innerHeight }));
  const stress = params.get('stress') === '1', sample = params.get('sample') === '1';
  const seedOf = () => Number(params.get('seed')) || Math.floor(Math.random() * 1e9);

  // A new city starts with the guide on only under Help: Guide and tips (early-game pass 3.1), and at the difficulty
  // the settings hold for new cities (spec 4.18). The sample and stress cities of the development flags never guide.
  function freshWorld() {
    const world = createWorld({ seed: seedOf(), difficulty: settings.get().difficulty });
    if (stress) buildStressCity(world); else if (sample) buildSampleCity(world);
    if (params.has('speed')) setSpeed(world, Number(params.get('speed')));
    setGuide(world, settings.get().help === 'full' && !stress && !sample);
    return world;
  }

  let saveBlocked = false;   // a newer version's save sits in the slot: never overwrite it (spec 7.5)
  let persisted = false;

  const hooks = {
    canInstall: () => flow.canInstall(),
    async install() {
      const r = await flow.promptInstall();
      if (r !== 'guide' || !current) return;
      const s = current.ui.store.get();
      if (s.sheet && s.sheet.kind === 'install') current.ui.toasts.show(T.installNotOffered);
      else current.ui.store.set(openSheet(s, 'install'));
    },
    async save() {
      if (!current || saveBlocked) return false;
      const text = packSave(current.world, { savedAt: clock(), lastSpeed: current.ui.store.get().lastSpeed });
      const r = await store.save(text);
      if (r.ok && !persisted) {                         // spec 4.17: ask to keep the data once a city exists
        persisted = true;
        try { const s = win.navigator && win.navigator.storage; if (s && s.persist) s.persist().catch(() => {}); } catch (e) { /* not offered */ }
      }
      return r.ok;
    },
    newCity() { startGame(freshWorld()); },
    async exportCity() {
      if (!current) return;
      const { ui, world } = current;
      const text = packSave(world, { savedAt: clock(), lastSpeed: ui.store.get().lastSpeed });
      try {                                             // share first: the sheet needs the tap's activation window (iOS)
        const r = await exportSave(text, { share: io.share, canShare: io.canShare, download: io.download, date: new Date(clock()) });
        if (r === 'downloaded') ui.toasts.show(T.exported);
      } catch (e) { ui.toasts.show(T.exportFailed); }
      await ui.autosave('export');                      // then the slot is brought up to date
    },
    async importCity() {
      const file = await io.pick();
      if (!file) return;
      let save;
      try { save = await importSaveFile(file); } catch (e) {
        const text = importErrorText(e && e.message);
        if (current) current.ui.toasts.show(text); else if (title) title.card.setMessage(text);   // toasts are hidden on the title
        return;
      }
      const go = () => startGame(save.world, { fromSave: true, savedAt: save.savedAt, lastSpeed: save.lastSpeed, saveNow: true });
      if (current) current.ui.store.set({ confirmDialog: { text: T.replaceCityConfirm, confirmLabel: T.importCity, onConfirm: go } });
      else go();                                        // the title phase has no city to replace
    },
  };

  function stopGame() { if (!current) return; current.loop.stop(); current.ui.destroy(); current = null; }

  function startGame(world, { fromSave = false, savedAt = null, lastSpeed = 1, notice = null, saveNow = !fromSave } = {}) {
    leaveTitle();
    stopGame();
    if (fromSave) setSpeed(world, 0);                   // the game always reopens paused (spec 4.17)
    const cam = createCamera({ x: stress ? 32 : world.focus.x, y: stress ? 32 : world.focus.y, zoom: 1 });
    const ui = createUI({ world, canvas, cam, renderer, root, doc, win, settings, hooks, now, clock, welcome: fromSave ? { savedAt, lastSpeed } : null,
      sfx, extraSheets: { install: installGuide(flow, { hasCity: true, onPrompt: () => hooks.install(), onBring: () => hooks.importCity() }) }, ...uiOptions });
    const loop = createGameLoop({ world, onEvents: (events) => { ui.effects.fromEvents(world, events, now()); ui.onEvents(events); }, render: ui.render, ...loopOptions });
    current = { world, ui, loop, cam };
    if (notice) ui.toasts.show(notice);
    if (saveNow) ui.autosave(fromSave ? 'import' : 'new');   // the previous city becomes the backup at once
    loop.start();
    if (pendingUpdate) { ui.offerUpdate(pendingUpdate); pendingUpdate = null; }
    win.__thebes = { world, cam, renderer, loop, ui };
    return current;
  }

  // A newer version's save in the slot must never be overwritten (spec 7.5), whichever way the game starts.
  function blockIfNewer(loaded) { saveBlocked = loaded.state === 'error' && loaded.code === 'newer_version'; }

  // Spec 4.17: with a saved city, a new one asks first and offers to export the old one.
  function confirmNewCity(loaded) {
    if (!title) return;
    title.card.showPanel((body, back) => {
      const exportFirst = button(T.exportFirst, { class: 'export-first', onClick: async () => {
        try {
          const r = await exportSave(loaded.text, { share: io.share, canShare: io.canShare, download: io.download, date: new Date(clock()) });
          if (r === 'downloaded' && title) title.card.setMessage(T.exported);
        } catch (e) { if (title) title.card.setMessage(T.exportFailed); }
      } });
      const start = button(T.startNewCity, { class: 'start-new danger', onClick: () => startGame(freshWorld()) });
      body.append(el('p', { text: T.newCityConfirm }), el('div', { class: 'actions' }, [exportFirst, start, button(T.back, { class: 'panel-back', onClick: back })]));
    });
  }

  function showTitle(loaded) {
    loadedOk = loaded.state === 'ok';
    const world = buildSampleCity(createWorld({ seed: TITLE_SEED }));
    const cam = createCamera({ x: world.tradeEntry.x, y: world.size - 22, zoom: 1 });
    const cameraControl = createCameraControl({ cam, view, reducedMotion: settings.reducedMotion, now });
    const backdrop = createBackdrop({ world, cam, cameraControl, reducedMotion: settings.reducedMotion });
    const loop = createGameLoop({ world, render: ({ now: t }) => { backdrop.tick(t); cameraControl.tick(t); renderer.renderFrame(world, cam, { view: view() }); }, ...loopOptions });
    let message = null;
    blockIfNewer(loaded);
    if (loaded.state === 'error') {
      message = saveBlocked ? T.saveNewer : T.saveUnreadable;
      console.warn('Thebes: the saved city was not loaded:', loaded.code);
    }
    root.classList.add('on-title');
    const guide = installGuide(flow, { hasCity: loaded.state === 'ok', onPrompt: () => flow.promptInstall(), onBring: () => hooks.importCity() });
    const card = createTitleCard({
      container: root.querySelector('#title'), hasSave: loaded.state === 'ok', canInstall: flow.canInstall(), canBring: flow.canBring(), sound: settings.get().sound, message,
      difficulty: settings.get().difficulty, onDifficulty: (level) => settings.set({ difficulty: level }),   // spec 4.18: freshWorld reads it
      onContinue: () => startGame(loaded.world, { fromSave: true, savedAt: loaded.savedAt, lastSpeed: loaded.lastSpeed, notice: loaded.usedBackup ? T.restoredBackup : null }),
      onNewCity: () => (loaded.state === 'ok' ? confirmNewCity(loaded) : startGame(freshWorld())),
      onSound: (on) => settings.set({ sound: on }),
      onInstall: async () => { if ((await flow.promptInstall()) === 'guide' && title) title.card.showGuide(guide); },
      onBring: () => hooks.importCity(),
    });
    title = { card, loop, backdrop };
    if (flow.shouldShowGuide()) card.showGuide(guide);
    loop.start();
  }

  function leaveTitle() {
    if (!title) return;
    title.loop.stop(); title.backdrop.stop(); title.card.destroy();
    root.classList.remove('on-title');
    title = null;
  }

  // The offline cache (spec 7.1). ?nosw=1 drops it while developing, so edits show without a restart.
  if (params.get('nosw') === '1') { if (sw && sw.getRegistrations) sw.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {}); }
  else {
    registerServiceWorker({ sw, onWaiting: (worker) => {
      const apply = () => applyUpdate(worker, sw, { save: () => hooks.save('update'), reload: io.reload });
      if (current) current.ui.offerUpdate(apply); else pendingUpdate = apply;
    } });
  }

  // The development flags skip the title but still look in the slot, so a newer save is never overwritten;
  // nothing is written until a real autosave.
  if (params.get('skipTitle') === '1') { blockIfNewer(await loadSave(store)); startGame(freshWorld(), { saveNow: false }); }
  else if (params.get('welcome') === '1') {
    blockIfNewer(await loadSave(store));
    const world = freshWorld();
    if (!sample && !stress) { buildSampleCity(world); setGuide(world, false); }   // a built-up city is not a new one: no guide
    startGame(world, { fromSave: true, savedAt: clock() - 2 * HOUR, lastSpeed: 2, saveNow: false });
  } else showTitle(await loadSave(store));

  return {
    phase: () => (title ? 'title' : 'game'),
    game: () => current,
    startGame, hooks,
    destroy() { win.removeEventListener('beforeinstallprompt', onPrompt); showNotice(root.querySelector('#notice'), null); leaveTitle(); stopGame(); },
  };
}
