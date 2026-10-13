// Boot in two phases (spec 4.1, 4.17): the title card over a drifting sample city, then the game. Saves go
// through the save store; a loaded world is used as it is (never assigned into a live world) and the game
// always reopens paused. ?skipTitle=1 boots straight into a new city and ?welcome=1 shows the Welcome back card (development flags:
// they write nothing until the first autosave, which then replaces the saved city).
import { createWorld } from './sim/world.js';
import { MAP_VARIANTS } from './data/map.js';
import { setSpeed, setGuide, setCityId } from './sim/commands.js';
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
import { createRecords, newCityId } from './save/records.js';
import { titleDecor } from './ui/scoreUi.js';
import { devScene, setMotion } from './dev/scenes.js';
import { createMusic, musicMood } from './audio/music.js';
import { showPictureCards } from './ui/tutorial.js';
import { drawMonument } from './render/monuments.js';

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
  createMusic: makeMusic = createMusic, showPictureCards: showCards = showPictureCards,   // Stage 4: replaceable by tests
} = {}) {
  const canvas = root.querySelector('#map');
  const renderer = createRenderer({ canvas });
  const settings = createSettings({ storage, root });
  // Stage 3: the device's records (spec 4.19), and the development scenes hook, there before the title card shows
  // (tools/shots.ps1 -Stage3); startGame keeps it beside the game's own fields.
  const records = createRecords({ storage });
  let api = null;
  let current = null;        // { world, ui, loop, cam } while the game runs (declared before the music: its seed and mood read it)
  let title = null;          // { card, loop, backdrop } while the title shows
  win.__thebes = { devScene: (name, options) => devScene(api, name, options), setMotion: (motion) => setMotion(settings, motion) };   // setMotion: tools/shots.ps1 -Stage4
  // One audio context for the whole page: every game (New city, import) shares it.
  const sfx = createSfx({ enabled: () => settings.get().sound, canVibrate: () => settings.get().vibration });
  // Stage 4 (spec 5.5): one music for the page (the title card plays too), unlocked by the first gesture, quiet while the
  // page is hidden, following the settings; Track G implements src/audio/music.js.
  const music = makeMusic({
    enabled: () => settings.get().music, volume: () => settings.get().musicVolume / 100,
    seed: () => (current ? current.world.seed : TITLE_SEED), mood: () => musicMood(current ? current.world : null),
  });
  const MUSIC_GESTURES = ['pointerdown', 'pointerup', 'keydown'];
  const onMusicGesture = () => { if (music.unlock()) for (const t of MUSIC_GESTURES) root.removeEventListener(t, onMusicGesture); };
  for (const t of MUSIC_GESTURES) root.addEventListener(t, onMusicGesture);
  const onMusicVisibility = () => { if (doc.hidden) music.stop(); else music.start(); };
  doc.addEventListener('visibilitychange', onMusicVisibility);
  const stopMusicWatch = settings.subscribe(() => music.refresh());
  // Stage 4 (spec 4.1, ruling 262): the picture cards show before the first new city on this device (seen or skipped,
  // once), and any time through hooks.pictureCards. Track G implements src/ui/tutorial.js.
  // One set of cards at a time: a second New city while they show is ignored, and an onDone run at once leaves cards null.
  // Track G: a second hooks.pictureCards(onDone) while they show joins them: its onDone runs when they close.
  let cards = null, joined = [];
  function openCards(after, { join = false } = {}) {
    if (cards) { if (join) joined.push(after); return; }
    let done = false;
    // difficulty: the city's own level in a game, the level the next new city will start at on the title (the What lies ahead card's words).
    const shown = showCards({ root, doc, settings, difficulty: current ? current.world.difficulty : settings.get().difficulty, onDone: () => {
      done = true; cards = null; settings.set({ cardsSeen: true });
      const also = joined; joined = [];
      after();
      for (const fn of also) fn();
    } });
    if (!done) cards = shown;
  }
  function withCards(go) {
    if (settings.get().cardsSeen) { go(); return; }
    openCards(go);
  }
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
  let pendingUpdate = null;  // a waiting worker's restart, kept through the title and offered once the game runs
  const flow = createInstallFlow({ env: detectEnvironment(envInput), hasSave: () => loadedOk || Boolean(current), getPrompt: io.installPrompt });
  showNotice(root.querySelector('#notice'), noticeText(flow.notice()));
  const view = uiOptions.getSize || (() => ({ width: canvas.clientWidth || win.innerWidth, height: canvas.clientHeight || win.innerHeight }));
  const stress = params.get('stress') === '1', sample = params.get('sample') === '1';
  const seedOf = () => Number(params.get('seed')) || Math.floor(Math.random() * 1e9);

  // A new city starts with the guide on only under Help: Guide and tips (early-game pass 3.1), and at the difficulty
  // the settings hold for new cities (spec 4.18). The sample and stress cities of the development flags never guide.
  // seed: a chosen seed (This week's Nile, a shared score's Start this seed); otherwise the flag's or a random one. Each
  // new city gets its id for the records here (spec 4.19: the interface gives it, the sim never reads the clock).
  // Stage 4.5 (ruling 313): the river layout comes from the seed ('auto'), for New city, This week's Nile and a shared score's
  // seed alike; a seed chosen with ?seed=, and the sample and stress cities, stay classic, so the dev flags and the shots do not
  // move, unless ?variant= names one.
  const variantParam = params.get('variant');
  function freshWorld({ seed = null, variant = null } = {}) {
    const chosen = !Number.isInteger(seed) && params.has('seed');
    // variant: the layout a shared score's link names (Start this seed), which beats the seed's own pick.
    const mapVariant = MAP_VARIANTS.includes(variant) ? variant : MAP_VARIANTS.includes(variantParam) ? variantParam : chosen || stress || sample ? 'classic' : 'auto';
    const world = createWorld({ seed: Number.isInteger(seed) ? seed : seedOf(), difficulty: settings.get().difficulty, cityId: newCityId(clock()), mapVariant });
    if (stress) buildStressCity(world); else if (sample) buildSampleCity(world);
    if (params.has('speed')) setSpeed(world, Number(params.get('speed')));
    setGuide(world, settings.get().help === 'full' && !stress && !sample);
    return world;
  }

  let saveBlocked = false;   // a newer version's save sits in the slot: never overwrite it (spec 7.5)
  let persisted = false;

  const hooks = {
    records,                                            // Stage 3: the device's records, for Seal this reign (src/ui/scoreUi.js)
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
      if (r.ok) { try { records.noteCity(current.world, clock()); } catch (e) { /* records never stop a save */ } }   // spec 4.19
      if (r.ok && !persisted) {                         // spec 4.17: ask to keep the data once a city exists
        persisted = true;
        try { const s = win.navigator && win.navigator.storage; if (s && s.persist) s.persist().catch(() => {}); } catch (e) { /* not offered */ }
      }
      return r.ok;
    },
    newCity() { withCards(() => startGame(freshWorld())); },   // Stage 4: the picture cards first, once a device
    // Stage 4 (spec 4.1): the picture cards any time (How to play on the title card and in the menu, Track G); onDone after.
    // Track G: the game behind them is paused (spec 4.1); the player presses Play again when ready.
    pictureCards(onDone = () => {}) {
      if (current && current.world.speed > 0) current.ui.speedControl.set(0);
      openCards(onDone, { join: true });
    },
    async exportCity() {
      if (!current) return;
      const { ui, world } = current;
      const text = packSave(world, { savedAt: clock(), lastSpeed: ui.store.get().lastSpeed, records: records.load() });   // spec 4.17: the export carries the records
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
      const go = () => {
        if (save.records) { try { records.merge(save.records); } catch (e) { /* a bad records block never stops an import */ } }   // spec 4.17
        startGame(save.world, { fromSave: true, savedAt: save.savedAt, lastSpeed: save.lastSpeed, saveNow: true });
      };
      if (current) current.ui.store.set({ confirmDialog: { text: T.replaceCityConfirm, confirmLabel: T.importCity, onConfirm: go } });
      else go();                                        // the title phase has no city to replace
    },
  };

  function stopGame() { if (!current) return; current.loop.stop(); current.ui.destroy(); current = null; }

  function startGame(world, { fromSave = false, savedAt = null, lastSpeed = 1, notice = null, saveNow = !fromSave } = {}) {
    leaveTitle();
    stopGame();
    if (fromSave) setSpeed(world, 0);                   // the game always reopens paused (spec 4.17)
    if (!world.cityId) setCityId(world, newCityId(clock()));   // a city from before Stage 3 gets its records id at load
    const cam = createCamera({ x: stress ? 32 : world.focus.x, y: stress ? 32 : world.focus.y, zoom: 1 });
    const ui = createUI({ world, canvas, cam, renderer, root, doc, win, settings, hooks, now, clock, welcome: fromSave ? { savedAt, lastSpeed } : null,
      sfx, extraSheets: { install: installGuide(flow, { hasCity: true, onPrompt: () => hooks.install(), onBring: () => hooks.importCity() }) }, ...uiOptions });
    const loop = createGameLoop({ world, onEvents: (events) => { ui.effects.fromEvents(world, events, now()); ui.onEvents(events); }, render: (f) => { ui.render(f); music.tick(f.now); }, allowFrame: ui.allowFrame, ...loopOptions });
    current = { world, ui, loop, cam };
    if (notice) ui.toasts.show(notice);
    if (saveNow) ui.autosave(fromSave ? 'import' : 'new');   // the previous city becomes the backup at once
    loop.start();
    if (pendingUpdate) { ui.offerUpdate(pendingUpdate); pendingUpdate = null; }
    win.__thebes = { ...(win.__thebes || {}), world, cam, renderer, loop, ui };
    return current;
  }

  // A newer version's save in the slot must never be overwritten (spec 7.5), whichever way the game starts.
  function blockIfNewer(loaded) { saveBlocked = loaded.state === 'error' && loaded.code === 'newer_version'; }

  // Spec 4.17: with a saved city, a new one asks first and offers to export the old one. seed: a chosen seed (spec 4.19).
  function confirmNewCity(loaded, seed = null, variant = null) {
    if (!title) return;
    title.card.showPanel((body, back) => {
      const exportFirst = button(T.exportFirst, { class: 'export-first', onClick: async () => {
        try {
          const r = await exportSave(loaded.text, { share: io.share, canShare: io.canShare, download: io.download, date: new Date(clock()) });
          if (r === 'downloaded' && title) title.card.setMessage(T.exported);
        } catch (e) { if (title) title.card.setMessage(T.exportFailed); }
      } });
      const start = button(T.startNewCity, { class: 'start-new danger', onClick: () => withCards(() => startGame(freshWorld({ seed, variant }))) });
      body.append(el('p', { text: T.newCityConfirm }), el('div', { class: 'actions' }, [exportFirst, start, button(T.back, { class: 'panel-back', onClick: back })]));
    });
  }

  // The title card's box on the screen the map fills (CSS px from #title's corner, which covers it), or null before it shows.
  function titleCardBox() {
    const box = root.querySelector('#title');
    if (!title || !title.card || !box) return null;
    const c = title.card.element.getBoundingClientRect(), o = box.getBoundingClientRect();
    if (!c.width || !c.height) return null;
    return { left: c.left - o.left, right: c.right - o.left, top: c.top - o.top, bottom: c.bottom - o.top };
  }

  function showTitle(loaded) {
    loadedOk = loaded.state === 'ok';
    const world = buildSampleCity(createWorld({ seed: TITLE_SEED }));
    const cam = createCamera({ x: world.tradeEntry.x, y: world.size - 22, zoom: 1 });
    const cameraControl = createCameraControl({ cam, view, reducedMotion: settings.reducedMotion, now });
    // The showcase is framed beside the card (art-direction review 4): the backdrop reads the card's box once it shows.
    const backdrop = createBackdrop({ world, cam, cameraControl, reducedMotion: settings.reducedMotion, view, card: () => titleCardBox() });
    // Stage 4: the backdrop's monuments are drawn live as in the game (spec 5.7), still (it never ticks).
    const live = (g, o) => drawMonument(g, world, o.b, { now: now(), timeDays: world.day, motion: settings.motionLevel() });
    const loop = createGameLoop({ world, render: ({ now: t }) => { backdrop.tick(t); cameraControl.tick(t); renderer.renderFrame(world, cam, { view: view(), live }); music.tick(t); }, ...loopOptions });
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
      onNewCity: () => (loaded.state === 'ok' ? confirmNewCity(loaded) : withCards(() => startGame(freshWorld()))),
      onSound: (on) => settings.set({ sound: on, music: on }),   // Stage 4: Play muted turns the music off too, and is remembered (ruling 269)
      onHowToPlay: () => hooks.pictureCards(),                   // Stage 4, Track G: How to play shows the picture cards (spec 4.1)
      onInstall: async () => { if ((await flow.promptInstall()) === 'guide' && title) title.card.showGuide(guide); },
      onBring: () => hooks.importCity(),
      // Stage 3 (spec 4.19): records, stamps, This week's Nile and a shared score, from the score interface.
      decorate: titleDecor({
        records, shared: (win.location && win.location.hash) || '', clock,
        startSeed: (seed, variant = null) => (loaded.state === 'ok' ? confirmNewCity(loaded, seed, variant) : withCards(() => startGame(freshWorld({ seed, variant })))),
      }),
    });
    title = { card, loop, backdrop, world, cam };
    backdrop.frame();
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

  api = {
    phase: () => (title ? 'title' : 'game'),
    game: () => current,
    titleView: () => (title ? { world: title.world, cam: title.cam } : null),   // Stage 4 (Track F): the backdrop's city and camera, for the title scene
    startGame, hooks, records, music,
    destroy() {
      win.removeEventListener('beforeinstallprompt', onPrompt); showNotice(root.querySelector('#notice'), null); leaveTitle(); stopGame();
      if (cards) { cards.close(); cards = null; }
      for (const t of MUSIC_GESTURES) root.removeEventListener(t, onMusicGesture);
      doc.removeEventListener('visibilitychange', onMusicVisibility); stopMusicWatch(); music.destroy(); settings.destroy();
    },
  };
  return api;
}
