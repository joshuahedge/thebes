// Boot in two phases (spec 4.1, 4.17): the title card over a drifting sample city, then the game. Saves go
// through the save store; a loaded world is used as it is (never assigned into a live world) and the game
// always reopens paused. ?skipTitle=1 boots straight into a new city and ?welcome=1 shows the Welcome back card (development flags:
// they write nothing until the first autosave, which then replaces the saved city).
import { createWorld } from './sim/world.js';
import { MAP_VARIANTS, MAP_SIZES, MAP_SIZE_IDS, DEFAULT_MAP_SIZE, isMapSize } from './data/map.js';
import { setSpeed, setGuide, setCityId } from './sim/commands.js';
import { settleGoals, guideGoal } from './sim/goals.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { createGameLoop } from './render/loop.js';
import { buildSampleCity, buildStressCity, capitalBackdrop } from './dev/sampleCity.js';
import { createUI } from './ui/createUI.js';
import { createSettings } from './ui/settings.js';
import { createSfx } from './audio/sfx.js';
import { createCameraControl } from './ui/cameraControl.js';
import { createMenuSheets } from './ui/menu.js';
import { createTitleCard, createBackdrop, firstCityLayout } from './ui/titleCard.js';
import { createSaveStore } from './save/store.js';
import { packSave, unpackSave } from './save/serialize.js';
import { TITLE_SEED } from './data/ui.js';
import { exportSave, downloadFile, pickTextFile } from './save/exportImport.js';
import { T, D2_TEXT, V711_TEXT, V90_L_TEXT, U93_TEXT } from './ui/text.js';
import { el, button } from './ui/components.js';
import { detectEnvironment, readEnvironment, createInstallFlow, installAskDue, INSTALL_ASK_KEY } from './save/installFlow.js';
import { renderRulers } from './ui/v90/rulers.js';   // Version 9.0 (Track L): the ruler list
import { installGuide, noticeText, showNotice } from './ui/installUi.js';
import { openSheet } from './ui/modes.js';
import { registerServiceWorker, applyUpdate } from './pwa.js';
import { createRecords, newCityId } from './save/records.js';
import { titleDecor } from './ui/scoreUi.js';
import { devScene, setMotion } from './dev/scenes.js';
import { createMusic, musicMood } from './audio/music.js';
import { seasonOfDay } from './sim/seasons.js';
import { showPictureCards } from './ui/tutorial.js';
import { drawMonument } from './render/monuments.js';
// Version 6.0 (Track D2): the guided first city, and the picture cards' first moments.
import { TUTORIAL_CARDS, INTRO_CARDS } from './data/tutorial.js';
import { TIPS } from './data/tips.js';
import { lessonDue, lessonStartStep, lessonPartWay, sayHandOver, lessonTaughtTips } from './ui/lesson.js';
import { lessonWorld, replayTo, LESSON_LENGTH, handOverWorld } from './sim/lesson.js';
import { seenKey, dueCards } from './ui/cardMoments.js';
import { canPassThrone, titleOf } from './sim/dynasty.js';   // Version 9.0 (Track D): Pass the throne, from City
import { installRescue } from './ui/v91/rescue.js';   // Version 9.1 (Track R): the error handler and its card
import { decreesOfWeek, weekKey, isWeekKey, decreeMapOf } from './data/week.js';   // Version 9.3 (Track U): the week's decree
import { decreeTitleCard, decreeUnlocked, weekBest, weekRivals, decreeResult } from './ui/v93/decree.js';
import { parseShareLink } from './ui/share.js';

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
  root = doc.body, store = createSaveStore(), decreeStore = null, params = new URLSearchParams(win.location.search),
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
  // Version 9.3 (Track U, ruling 1976): the decree run's own slot (Track S's createSaveStore slot option). A test may hand one in.
  const decreeSlot = decreeStore || createSaveStore({ slot: 'decree' });   // 'decree.current' and its backup; the main slot's keys are never touched (Track S, ruling 1965)
  let api = null;
  let current = null;        // { world, ui, loop, cam } while the game runs (declared before the music: its seed and mood read it)
  let title = null;          // { card, loop, backdrop } while the title shows
  win.__thebes = { devScene: (name, options) => devScene(api, name, options), setMotion: (motion) => setMotion(settings, motion) };   // setMotion: tools/shots.ps1 -Stage4
  // Version 9.1 (wave 0 seam, ruling 1651): the canvas caches' bytes for the profile, from the one renderer the title and every game share (Track P fills
  // renderer.cacheBytes in src/render/renderer.js).
  win.__thebes.caches = () => renderer.cacheBytes();
  // One audio context for the whole page: every game (New city, import) shares it.
  // Version 7.0 (Track S, ruling 935): the Sound switch is the master of both the effects and the music; each has its own volume (Effects volume
  // and Music volume in Settings; 100 effects is the loudness every effect had before 7.0).
  const sfx = createSfx({ enabled: () => settings.get().sound, volume: () => settings.get().effectsVolume / 100, canVibrate: () => settings.get().vibration });
  // Stage 4 (spec 5.5): one music for the page (the title card plays too), unlocked by the first gesture, quiet while the
  // page is hidden, following the settings; Track G implements src/audio/music.js. Version 7.0: its colour follows the city's season, and its
  // tense variant any live danger (musicMood).
  const music = makeMusic({
    enabled: () => settings.get().sound && settings.get().music, volume: () => settings.get().musicVolume / 100,
    seed: () => (current ? current.world.seed : TITLE_SEED), mood: () => musicMood(current ? current.world : null),
    season: () => (current ? seasonOfDay(current.world.day) : null),
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
  // Version 6.0 (Track D2): the cards read before a first city are the intro ones (INTRO_CARDS); How to play shows them all; a first moment's card
  // (hooks.pictureCard) is one alone, and seen-or-skipped (cardsSeen) is about the intro set only. Returns false when other cards are already open.
  function openCards(after, { join = false, set = null, finishLabel = null, single = false } = {}) {
    if (cards) { if (join) joined.push(after); return false; }
    let done = false;
    // difficulty: the city's own level in a game, the level the next new city will start at on the title (the What lies ahead card's words).
    const shown = showCards({ root, doc, settings, difficulty: current ? current.world.difficulty : settings.get().difficulty, ...(set ? { cards: set, finishLabel } : {}), onDone: () => {
      done = true; cards = null; if (!single) settings.set({ cardsSeen: true });
      const also = joined; joined = [];
      after();
      for (const fn of also) fn();
    } });
    if (!done) cards = shown;
    return true;
  }
  function withCards(go) {
    if (settings.get().cardsSeen) { go(); return; }
    openCards(go, { set: INTRO_CARDS });
  }
  // The share sheet and the download, replaceable by tests. Version 8.0 (Track U): no file picker, the import is gone.
  const nav = win.navigator || {};
  const io = {
    share: typeof nav.share === 'function' ? (d) => nav.share(d) : null,
    canShare: typeof nav.canShare === 'function' ? (d) => nav.canShare(d) : null,
    download: (file) => downloadFile(file, doc),
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
  // seed: a chosen seed (a shared score's Start this seed); otherwise the flag's or a random one. Each
  // new city gets its id for the records here (spec 4.19: the interface gives it, the sim never reads the clock).
  // Stage 4.5 (ruling 313): the river layout comes from the seed ('auto'), for New city and a shared score's
  // seed alike; a seed chosen with ?seed=, and the sample and stress cities, stay classic, so the dev flags and the shots do not
  // move, unless ?variant= names one.
  const variantParam = params.get('variant');
  // Stage 4.6 (ruling 333): the map's size. size: what New city's picker, a shared link or a record names (the Map track passes it);
  // else ?size=48|64|80 (the dev flag, for the shots and the Large measurement); else Normal.
  const sizeParam = Number(params.get('size'));
  // The size the title card's picker last chose for the next new city (it starts as the dev flag's size, else Normal); a chosen seed (a
  // shared link) takes its own size, never this.
  let newCitySize = isMapSize(sizeParam) ? sizeParam : DEFAULT_MAP_SIZE;
  // Version 8.0 (Track U, ruling 1151): the layout the new-city card's More choices last chose, 'auto' (Surprise me: the seed picks) until the player picks one; like the
  // size it is for New city only (a shared link names its own, and ?variant= still works while nothing is picked).
  // Version 9.1 (Track F, ruling 1660): null until the player picks one, and the card then starts on firstCityLayout (the classic river while the device's records hold
  // no city, Surprise me after); a ?variant= flag keeps Surprise me's place, so the flag still names the map.
  let newCityLayout = null;
  const layoutNow = () => newCityLayout || (variantParam ? 'auto' : firstCityLayout(records, settings.get().lessonCityId));
  // Version 8.2 (Track G, ruling 1310): the seed the new-city card's map preview shows (null until the card draws one), kept through Back and size or layout
  // changes until Another draws a new one or a city starts with it; the city that starts is that seed's map, at that size and layout.
  let newCitySeed = null;
  const newCityPick = () => ({ seed: newCitySeed, size: newCitySize, variant: layoutNow() === 'auto' ? null : layoutNow() });
  // Version 9.0 (fix wave, ruling 1635): Play this map applies its row's level, size, layout and seed to the card at once, so Back must give them back: what was
  // there before is kept here until a city starts (startGame clears it) or the card is backed out of (restorePlayMap).
  let playUndo = null;
  function restorePlayMap() {
    const u = playUndo;
    playUndo = null;
    if (!u) return;
    settings.set({ difficulty: u.difficulty });
    newCitySize = u.size; newCityLayout = u.layout; newCitySeed = u.seed;
    if (title) title.card.setChoices({ mapSize: sizeIdOf(newCitySize), layout: layoutNow(), seed: newCitySeed });
  }
  // A ?seed= flag (development) keeps its own seed and its classic map, as the flags always did; only then may the preview differ from the city.
  const startPicked = () => { const pick = newCityPick(); newCitySeed = null; return freshWorld(params.has('seed') ? { ...pick, seed: null } : pick); };
  const sizeIdOf = (n) => MAP_SIZE_IDS.find((k) => MAP_SIZES[k] === n) || 'normal';
  function freshWorld({ seed = null, variant = null, size = null } = {}) {
    const chosen = !Number.isInteger(seed) && params.has('seed');
    // variant: the layout a shared score's link names (Start this seed), which beats the seed's own pick.
    const mapVariant = MAP_VARIANTS.includes(variant) ? variant : MAP_VARIANTS.includes(variantParam) ? variantParam : chosen || stress || sample ? 'classic' : 'auto';
    const mapSize = isMapSize(size) ? size : isMapSize(sizeParam) ? sizeParam : DEFAULT_MAP_SIZE;
    // Version 9.0 (ruling 1564): the city plays under the dynasty's heir (the newest ruler's title; the Steady on a new device). The sample and stress
    // cities of the development flags stay the Steady, so the shots and the budgets do not move with what the device holds.
    const heir = stress || sample ? 'steady' : records.dynasty().heir;
    const world = createWorld({ seed: Number.isInteger(seed) ? seed : seedOf(), size: mapSize, difficulty: settings.get().difficulty, cityId: newCityId(clock()), mapVariant, heir });
    if (stress) buildStressCity(world); else if (sample) buildSampleCity(world);
    if (params.has('speed')) setSpeed(world, Number(params.get('speed')));
    // Version 9.2 (Track D, ruling 1816): an heir's city (the dynasty has a ruler kept, or a trait to play) has no beginner's guide: its player has played a whole reign.
    let kept = 0;
    try { kept = records.rulers().length; } catch (e) { kept = 0; }
    setGuide(world, settings.get().help === 'full' && !stress && !sample && heir === 'steady' && !kept);
    return world;
  }

  let saveBlocked = false;   // a newer version's save sits in the slot: never overwrite it (spec 7.5)
  let persisted = false;

  const hooks = {
    sfx,                                                // Version 7.0 (Track S): Settings' Effects volume plays one effect at each step (src/ui/menu.js)
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
      if (current && current.decree) return saveDecree();   // Version 9.3 (Track U, ruling 1976): a decree run is saved to its own slot, never over the city
      if (current && current.lesson) return true;      // Version 6.0 (Track D2, ruling 626): the lesson's city is never saved; a saved city is never written over by it
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
    newCity() { if (current && (current.lesson || current.decree)) return; withCards(() => startGame(startPicked())); },
    // Version 9.0 (Track L, rulings 1585, 1586): the game menu's Rulers opens the list as a sheet; Bring rulers from a file (Options > Saves) picks a file and answers its
    // text (null when none is picked); Play this map keeps the row's seed, level, layout and size as the next new city's choices and opens New city's card, whose
    // Start asks the replace question as always. The lesson has none of the three (its game's hooks drop them).
    rulers() { if (current && !current.lesson && !current.decree) current.ui.store.set(openSheet(current.ui.store.get(), 'rulers')); },
    bringRulers: () => pickTextFile(doc),
    playMap(row) {
      if (!playUndo) playUndo = { difficulty: settings.get().difficulty, size: newCitySize, layout: newCityLayout, seed: newCitySeed };   // Back (or Esc) puts these back
      settings.set({ difficulty: row.difficulty });
      newCitySize = isMapSize(row.mapSize) ? row.mapSize : DEFAULT_MAP_SIZE;
      newCityLayout = MAP_VARIANTS.includes(row.mapVariant) ? row.mapVariant : 'auto';
      newCitySeed = row.seed;
      if (current && !current.lesson && !current.decree) {
        if (current.world.speed > 0) current.ui.speedControl.set(0);   // the card opens over a paused game, as the menu's New city does
        const store = current.ui.store;
        store.set(openSheet(store.get(), 'newCity'));
        const off = store.subscribe(() => {   // the card closed without Start (Back, Esc): the choices Play this map set go back
          if (!playUndo) { off(); return; }
          const s = store.get();
          if (!(s.sheet && s.sheet.kind === 'newCity')) { off(); restorePlayMap(); }
        });
      } else if (title) { title.card.setChoices({ mapSize: sizeIdOf(newCitySize), layout: newCityLayout, seed: newCitySeed }); title.card.showNewCity(); }
    },
    // After 8.3 (ruling 1454): the game menu's Home: the city is saved, then the title shows with Continue; false (and the game stays) when the save fails.
    async home() {
      if (!current || current.lesson || current.decree) return false;
      if (!(await hooks.save())) return false;
      stopGame();
      showTitle(await loadForTitle());
      return true;
    },   // Stage 4: the picture cards first, once a device
    // Version 8.2 (Track G, rulings 1308-1310): the game menu's New city card keeps its choices here, as the title's does (size, layout, the preview's seed);
    // the difficulty is the device's setting (settings.difficulty), the same one Options > Saves shows.
    newCityChoices: {
      get: () => ({ mapSize: sizeIdOf(newCitySize), layout: layoutNow(), seed: newCitySeed }),
      setSize: (id) => { newCitySize = MAP_SIZES[id] || newCitySize; },
      setLayout: (id) => { newCityLayout = id; },
      setSeed: (s) => { newCitySeed = s; },
    },
    // Version 9.0 (Track D, rulings 1569, 1573): the game menu's Pass the throne opens its sheet over the paused city (src/ui/v90/passSheet.js), offered from
    // City (canPassThrone, which the menu reads) and never in the lesson. The heir's card's Start writes the seal and the records, then calls startHeir: the
    // heir's city on the card's choices (newCityChoices), whose heir is the dynasty's new one (freshWorld reads records.dynasty().heir); notice says so.
    passThrone() {
      if (!current || current.lesson || current.decree || !canPassThrone(current.world).ok) return;
      if (current.world.speed > 0) current.ui.speedControl.set(0);
      current.ui.store.set(openSheet(current.ui.store.get(), 'passThrone'));
    },
    canPassThrone: () => Boolean(current && !current.lesson && !current.decree && canPassThrone(current.world).ok),
    startHeir({ notice = null } = {}) { if (current && (current.lesson || current.decree)) return; withCards(() => startGame(startPicked(), { notice, heirStart: true })); },   // Version 9.2 (Track D, ruling 1817): heirStart holds the install ask back for the heir's first game month
    // Stage 4 (spec 4.1): the picture cards any time (How to play on the title card and in the menu, Track G); onDone after.
    // Track G: the game behind them is paused (spec 4.1); the player presses Play again when ready.
    pictureCards(onDone = () => {}) {
      if (current && current.world.speed > 0) current.ui.speedControl.set(0);
      openCards(onDone, { join: true });
    },
    // Fix wave (ruling 1738): the error card takes the screen alone; the picture cards mount outside #ui, so it closes them, without their onDone (that may start a city).
    closeCards() { if (cards) { const open = cards; cards = null; joined = []; open.close(); } },
    // Version 6.0 (Track D2, rulings 760-779): one picture card on its own at its first moment (src/ui/cardMoments.js), the game paused behind it. false when
    // other cards are already open (the moment is tried again), or the card is not one.
    pictureCard(id) {
      const card = TUTORIAL_CARDS.find((c) => c.id === id);
      if (!card || cards) return false;
      if (current && current.world.speed > 0) current.ui.speedControl.set(0);
      return openCards(() => {}, { set: [card], finishLabel: T.gotIt, single: true });
    },
    // The guided first city (ruling 617): from the step a lesson left part-way reached, else the first. { step }: a given step (0 starts again).
    lesson({ step = null } = {}) { startLesson(step === null ? lessonStartStep(settings.get()) : step); },
    async exportCity() {
      if (!current || current.lesson || current.decree) return;
      const { ui, world } = current;
      const text = packSave(world, { savedAt: clock(), lastSpeed: ui.store.get().lastSpeed, records: records.load() });   // spec 4.17: the export carries the records
      try {                                             // share first: the sheet needs the tap's activation window (iOS)
        const r = await exportSave(text, { share: io.share, canShare: io.canShare, download: io.download, date: new Date(clock()) });
        if (r === 'downloaded') ui.toasts.show(T.exported);
      } catch (e) { ui.toasts.show(T.exportFailed); }
      await ui.autosave('export');                      // then the slot is brought up to date
    },
  };

  function stopGame() { if (!current) return; current.loop.stop(); current.ui.destroy(); current = null; }

  // Version 6.0 (Track D2, ruling 626): the lesson's game keeps the device's settings as they are, but says every tip and picture card has been seen, so
  // the lesson's own row is the one guidance (and its tips are still fresh for the first real city). Reads through to the real settings.
  function lessonSettings() {
    const seenAll = [...TIPS.map((t) => t.id), ...TUTORIAL_CARDS.map((c) => seenKey(c.id))];
    let from = null, shown = null;
    return { ...settings, get() { const v = settings.get(); if (v !== from) { from = v; shown = { ...v, seenTips: seenAll }; } return shown; } };
  }

  // Version 9.0 (Track L, ruling 1587): what the ruler list needs: the records, Play this map, and the install ask while it is due (a ruler is kept and the device can install).
  const rulersDeps = ({ onBack = null, onInstall }) => ({ records, onPlay: (row) => hooks.playMap(row), installAsk: flow.canInstall(), ios: flow.env.platform === 'ios', onInstall, onBack });
  // The install ask, once, at the first start of a city after the first Pass (a ruler is kept and the device has not been asked): the storage is asked to persist again,
  // and a device that can install gets one toast with Install. The device remembers it was asked, installed or not.
  const askStore = (() => { try { return storage || win.localStorage || null; } catch (e) { return null; } })();
  // Version 9.2 (Track D, ruling 1817): wait: the heir's own first start. The ask is held and returned as a function the game calls at the first month end, so the
  // heir's first screen has one voice (Ipi's line); the Rulers list's top line asks at any time.
  function noteFirstPass(ui, { wait = false } = {}) {
    let rulers = 0, asked = false;
    try { rulers = records.rulers().length; } catch (e) { rulers = 0; }
    try { asked = Boolean(askStore && askStore.getItem(INSTALL_ASK_KEY)); } catch (e) { asked = false; }
    if (!rulers || asked) return;
    const remember = () => { try { if (askStore) askStore.setItem(INSTALL_ASK_KEY, '1'); } catch (e) { /* not kept: it may be asked again next time */ } };
    if (!persistAsked) {                                // storage is asked once a page, at the first start after a ruler
      persistAsked = true;
      try { const st = win.navigator && win.navigator.storage; if (st && st.persist) st.persist().catch(() => {}); } catch (e) { /* not offered */ }
    }
    // The flag is written only when the toast is shown, or the device is installed already: Chrome says canInstall() only once its prompt event has fired, so an early
    // start must not use the ask up (a start later in the session, or the next visit, shows it).
    const ask = () => {
      if (installAskDue(flow, { rulers, asked })) { remember(); ui.toasts.show(V90_L_TEXT.installAsk(flow.env.platform === 'ios'), { action: V90_L_TEXT.installButton, onAction: () => hooks.install(), ms: 12000, group: 'welcome', waits: true }); }
      else if (flow.env.standalone) remember();
    };
    if (wait) return ask;
    ask();
    return null;
  }
  let persistAsked = false;

  // startGame's `lesson` ({ step }): the guided first city. It is never saved (hooks.save says so, and the game's own hooks do too), has no New city,
  // Export or Import in its menu, and ends back on the title (leaveLesson).
  function startGame(world, { fromSave = false, savedAt = null, lastSpeed = 1, notice = null, saveNow = !fromSave, lesson = null, heirStart = false, decree = false } = {}) {
    playUndo = null;                                    // a city starting keeps the choices Play this map made
    let lateAsk = null;                                 // Version 9.2 (Track D): the install ask held for an heir's first game month
    leaveTitle();
    stopGame();
    if (fromSave) setSpeed(world, 0);                   // the game always reopens paused (spec 4.17)
    if (!world.cityId) setCityId(world, newCityId(clock()));   // a city from before Stage 3 gets its records id at load
    const cam = createCamera({ x: stress ? world.size / 2 : world.focus.x, y: stress ? world.size / 2 : world.focus.y, zoom: 1, size: world.size });   // the stress city fills the map: its middle; size: the Huge map's zoom floor (ruling 741)
    const gameHooks = lesson
      ? { ...hooks, save: async () => true, exportCity: undefined, install: undefined, newCity: undefined, lesson: undefined, passThrone: undefined, canPassThrone: undefined, startHeir: undefined, rulers: undefined, bringRulers: undefined, playMap: undefined, lessonRun: { step: lesson.step, cam, leave: () => leaveLesson(), finish: () => leaveLesson(true), skip: () => skipLesson(), skipTo: () => (hasSavedCity() ? 'title' : 'city'), adopt: (force) => adoptLesson(force === true), canAdopt: () => !hasSavedCity(), exportSaved: async () => { exportLoaded(await loadSave(store)); } } }
      // Version 9.3 (Track U, ruling 1976): the decree's game drops what is the city's (Pass the throne, the heir picker, a new city, Export, the ruler list and the records, which only a city writes)
      // the way the lesson's does, saves to its own slot, and says how to leave (decreeRun, src/ui/v93/decree.js).
      : decree
        ? { ...hooks, records: undefined, save: () => saveDecree(), home: undefined, exportCity: undefined, newCity: undefined, lesson: undefined, passThrone: undefined, canPassThrone: undefined, startHeir: undefined, rulers: undefined, bringRulers: undefined, playMap: undefined, decreeRun: decreeRunFor(world) }
        : hooks;
    const ui = createUI({ world, canvas, cam, renderer, root, doc, win, settings: lesson ? lessonSettings() : settings, hooks: gameHooks, now, clock, welcome: fromSave && !decree ? { savedAt, lastSpeed } : null,
      sfx, extraSheets: { install: installGuide(flow, { hasCity: true, onPrompt: () => hooks.install() }), ...(lesson || decree ? {} : { rulers: (body, { setTitle }) => { setTitle(V90_L_TEXT.sheetTitle); renderRulers(body, rulersDeps({ onInstall: () => hooks.install() })); } }) }, ...uiOptions });
    const loop = createGameLoop({ world, onEvents: (events) => { ui.effects.fromEvents(world, events, now()); ui.onEvents(events); if (lateAsk && events.some((e) => e.type === 'month')) { const ask = lateAsk; lateAsk = null; ask(); } }, render: (f) => { ui.render(f); music.tick(f.now); rescue.frameOk(); }, allowFrame: ui.allowFrame,
      onError: (e) => rescue.loopError(e), ...loopOptions });   // Version 9.1 (Track R, ruling 1675): a throw in a day's tick or in the draw goes to the rescue
    current = { world, ui, loop, cam, lesson: Boolean(lesson), decree: Boolean(decree) };
    rescue.attach(current);                             // the ?crash= dev hook (once a page)
    if (!lesson && !decree) lateAsk = noteFirstPass(ui, { wait: heirStart });
    if (notice) ui.toasts.show(notice);
    if (saveNow) ui.autosave(fromSave ? 'import' : 'new');   // the previous city becomes the backup at once
    loop.start();
    if (pendingUpdate) { ui.offerUpdate(pendingUpdate); pendingUpdate = null; }
    win.__thebes = { ...(win.__thebes || {}), world, cam, renderer, loop, ui };
    rescue.loadingDone();                               // a development flag's game has no title: the loading screen goes here too
    return current;
  }

  // The guided first city (Track D2): its own fixed map, from `step` (the steps before it laid by the scripted walk-through, src/sim/lesson.js replayTo; 0
  // starts it again, and a lesson not yet done keeps its place in the settings from then on). Leaving it, or finishing it, is back to the title.
  // A walk-through that fails (replayTo throws when a step does not finish) starts the lesson again from the first step and says so in a toast.
  function startLesson(step = 0) {
    let world = lessonWorld(), at = 0, notice = null;
    if (step > 0) {
      try { at = replayTo(world, step); } catch (e) {
        console.warn('Thebes: the lesson could not be rebuilt to step', step, e && e.message);
        world = lessonWorld(); at = 0; notice = D2_TEXT.resumeFailed;
      }
    }
    if (at === 0 && !settings.get().lessonDone) settings.set({ lessonStep: 0 });
    return startGame(world, { lesson: { step: at }, saveNow: false, notice });
  }
  // ---- Version 9.3 (Track U, rulings 1975-1984): the decree's game ----
  // A decree run is the lesson's shape: its own game (current.decree), its own slot (decreeSlot), hooks that drop what is the city's, and no row written to the city records.
  // It starts from the title's card or a d1 link, plays 6 years (Track R ends it), writes its best to the records once (records.noteDecree), and goes Back to your city.
  const thisWeek = () => weekKey(new Date(clock()));
  let decreeRunCache = null, decreeLoadedCache = null;   // what the decree slot holds, read before the title shows: { week, ended } and the loaded save
  const linkedDecree = () => {
    const link = parseShareLink((win.location && win.location.hash) || '');
    return link && link.ok && link.kind === 'decree' && isWeekKey(link.week) ? link : null;
  };
  async function refreshDecreeRun() {
    decreeRunCache = null; decreeLoadedCache = null;
    if (!decreeUnlocked(records) && !linkedDecree()) return;
    const loaded = await loadSave(decreeSlot);
    if (loaded.state === 'ok' && loaded.world && loaded.world.decree) { decreeLoadedCache = loaded; decreeRunCache = { week: loaded.world.decree.week, ended: Boolean(loaded.world.decree.ended) }; }
  }
  const loadForTitle = async () => { await refreshDecreeRun(); return loadSave(store); };   // the title reads the decree slot first, so showTitle stays synchronous
  async function saveDecree() {
    if (!current || !current.decree) return false;
    try {
      const r = await decreeSlot.save(packSave(current.world, { savedAt: clock(), lastSpeed: current.ui.store.get().lastSpeed }));
      return Boolean(r && r.ok);
    } catch (e) { return false; }
  }
  // A new run of `week` (or the slot's run, loaded): the Steady heir at Normal on the week's map, no guide; held on its first screen (the decree card) until Begin.
  function startDecree(week = thisWeek(), { loaded = null } = {}) {
    const ids = decreesOfWeek(week);
    if (!ids.length) return null;
    let world;
    if (loaded && loaded.state === 'ok' && loaded.world && loaded.world.decree) world = loaded.world;
    else {
      world = createWorld({ ...decreeMapOf(week), size: DEFAULT_MAP_SIZE, cityId: newCityId(clock()), decree: { week, ids } });
      setGuide(world, false);
    }
    return startGame(world, { decree: true, fromSave: Boolean(loaded) });
  }
  // Back to your city: the run is saved in its slot, then the main slot loads (or the title shows when there is none).
  async function leaveDecree() {
    if (!current || !current.decree) return;
    // U1 belt: an ended run is noted when it ended (the end card's seam); this covers one that somehow was not.
    if (current.world.decree.ended && !current.world.decree.noted) noteDecreeEnd(current.world, decreeResult(current.world));
    await saveDecree();
    const loaded = await loadSave(store);
    blockIfNewer(loaded);
    if (loaded.state === 'ok') { loadedOk = true; startGame(loaded.world, { fromSave: true, savedAt: loaded.savedAt, lastSpeed: loaded.lastSpeed, notice: loaded.usedBackup ? T.restoredBackup : null }); return; }
    stopGame();
    await refreshDecreeRun();
    showTitle(loaded);
  }
  // The run's end, once: the best goes to the records (Track S's records.noteDecree, which keeps the higher score and counts the try), then the slot keeps the ended run.
  function noteDecreeEnd(world, result) {
    const week = world.decree.week;
    const before = weekBest(records, week);
    const fresh = !world.decree.noted;
    if (fresh) {
      // Track S's noteDecree takes the score from its caller (the end card has read Track R's decreeScore) and the mark's words.
      try { records.noteDecree(world, { now: clock(), score: result, mark: U93_TEXT.markOf(world.decree.ids, week), title: titleOf(world).id }); } catch (e) { /* records never stop the end card */ }   // S2: the row's title is the heir's, as a ruler's row has
      world.decree.noted = true;
      saveDecree();
    }
    return { best: weekBest(records, week), isBest: fresh && (!before || result.total > before.score) };
  }
  function decreeRunFor(world) {
    const week = world.decree.week;
    return { week, ids: world.decree.ids, records, again: () => { if (world.decree.ended && !world.decree.noted) noteDecreeEnd(world, decreeResult(world)); startDecree(week); }, back: () => leaveDecree(), rivals: () => weekRivals(records, week), noteEnd: (result) => noteDecreeEnd(world, result) };
  }
  // The title's button: a fresh run of `week`. A slot holding another week's unfinished run asks first (it holds one run).
  function askStartDecree(week) {
    const other = decreeRunCache && !decreeRunCache.ended && decreeRunCache.week !== week ? decreeRunCache : null;
    if (!other || !title) { startDecree(week); return; }
    title.card.showPanel((body, back) => {
      body.append(el('p', { text: U93_TEXT.replaceQuestion(other.week) }), el('div', { class: 'actions' }, [
        button(U93_TEXT.replaceYes, { class: 'start-new danger', onClick: () => startDecree(week) }),
        button(T.back, { class: 'panel-back', onClick: back }),
      ]));
    });
  }

  // Version 7.1.1 (ruling 1111): what finishing the lesson marks on the device (the lesson done, the picture cards seen: src/ui/v60/lesson.js sets the same three keys at its end),
  // so skipping it, from the title or from the first card, leaves the device exactly as a finished lesson does. Tips are not marked: the lesson's own city never spends them.
  const markLessonDone = () => settings.set({ lessonDone: true, lessonStep: LESSON_LENGTH, cardsSeen: true });
  const hasSavedCity = () => loadedOk || persisted;   // a city is in the slot (read by the title) or was saved this session
  // The first card's Skip, I've played before (after its own question): straight to a new city of the player's own at the chosen level and size, or to the title when a saved
  // city is there (a fresh city would take its place: the title's New city asks that question first).
  async function skipLesson() {
    if (!current || !current.lesson) return;
    markLessonDone();
    if (hasSavedCity()) { stopGame(); showTitle(await loadForTitle()); return; }
    withCards(() => startGame(startPicked()));
  }
  // Version 8.1 (Track T, ruling 1208): the lesson's end is no stop: its city becomes the player's own. It is no longer the lesson's (world.lesson goes, so it saves and the court
  // writes to it), the guide follows Help as a new city's does, the device counts the lesson done, and the game goes on in a normal interface with Ipi's hand-over. Only on a
  // device with no saved city (ruling 1209: the one slot is never written over by the lesson).
  // Version 9.1 (Track F, ruling 1655): what the lesson staged for its raid goes back first (src/sim/lesson.js handOverWorld): the rank the people earned, no staged splits,
  // the raid clock stopped until a real city's 250 people, the lesson's cards kept in world.lessonCards.
  // Version 9.2 (Track L, ruling 1755): `force` is the end card's own Replace it, said after its question on a device with a saved city (the card asks first and offers Export).
  function adoptLesson(force = false) {
    if (!current || !current.lesson || (hasSavedCity() && !force)) return;
    const { world } = current;
    handOverWorld(world);
    delete world.lesson;
    setGuide(world, settings.get().help === 'full');
    settleGoals(world);                                 // Fix wave (ruling 1737): goals the city already meets complete quietly here, so none shows a toast or counts in Messages
    { const g = guideGoal(world); if (g) world.handOverGoal = g.id; }   // Version 9.2 (design 2.7): the goal in view at the hand-over, which holds the tips until it is done (src/ui/lesson.js handOverHold)
    markLessonDone();
    // Fix wave (ruling 1735): the adopted city's records id is kept, so the new-city card does not count it as a city the player started (firstCityLayout).
    if (!world.cityId) setCityId(world, newCityId(clock()));
    settings.set({ lessonCityId: world.cityId });
    // Version 9.1 (Track F, ruling 1663): the picture cards whose moment the lesson itself taught (the Large plot, the raid) are seen, so none opens over the hand-over.
    const seen = Array.isArray(settings.get().seenTips) ? settings.get().seenTips : [];
    const taught = dueCards(world, seen).map((c) => seenKey(c.id));
    // Version 9.2 (Track L, design 2.4): and the tips about what the lesson itself had the player place or meet (the Large plot, the firehouse, the raid and its tower) are seen: the
    // Large plot's tip came up in the first month after the hand-over, about a plot the player had just laid.
    for (const id of lessonTaughtTips(world)) if (!seen.includes(id) && !taught.includes(id)) taught.push(id);
    if (taught.length) settings.set({ seenTips: [...seen, ...taught] });
    if (world.speed === 0) setSpeed(world, 1);          // the end card held the game; the city plays on as the player's own
    startGame(world, { lastSpeed: world.speed || 1 });
    sayHandOver();
  }
  async function leaveLesson(finished = false) {
    if (!current || !current.lesson) return;
    stopGame();
    showTitle(await loadForTitle(), { note: finished ? D2_TEXT.standsNote : null });
    // Version 9.2 (Track L, fix wave, ruling 1871): the end card's Start my own city goes on to the New city card, on the classic river (ruling 1672), not to the title's front card;
    // Back there is the title. With a saved city the card's Start still asks the replace question first.
    if (finished && title) { newCityLayout = 'classic'; title.card.setChoices({ layout: 'classic' }); title.card.showNewCity(); }
  }

  // A newer version's save in the slot must never be overwritten (spec 7.5), whichever way the game starts.
  function blockIfNewer(loaded) { saveBlocked = loaded.state === 'error' && loaded.code === 'newer_version'; }

  // The saved city, exported as the title shows it (the New city question's Export first, and Options > Saves on the title); the result is said on the card.
  async function exportLoaded(loaded) {
    try {
      const r = await exportSave(loaded.text, { share: io.share, canShare: io.canShare, download: io.download, date: new Date(clock()) });
      if (r === 'downloaded' && title) title.card.setMessage(T.exported);
    } catch (e) { if (title) title.card.setMessage(T.exportFailed); }
  }

  // Spec 4.17: with a saved city, a new one asks first and offers to export the old one. seed: a chosen seed (spec 4.19).
  function confirmNewCity(loaded, seed = null, variant = null, size = null) {
    if (!title) return;
    title.card.showPanel((body, back) => {
      const exportFirst = button(T.exportFirst, { class: 'export-first', onClick: () => exportLoaded(loaded) });
      const start = button(T.startNewCity, { class: 'start-new danger', onClick: () => withCards(() => startGame(seed === null ? startPicked() : freshWorld({ seed, variant, size }))) });
      body.append(el('p', { text: T.newCityConfirm }), el('div', { class: 'actions' }, [exportFirst, start, button(T.back, { class: 'panel-back', onClick: () => { restorePlayMap(); back(); } })]));
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

  function showTitle(loaded, { note = null } = {}) {
    loadedOk = loaded.state === 'ok';
    const world = capitalBackdrop(buildSampleCity(createWorld({ seed: TITLE_SEED })));   // Version 10.0 (Track Q, ruling 2147): the backdrop is the Capital, with a procession out
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
    const guide = installGuide(flow, { hasCity: loaded.state === 'ok', onPrompt: () => flow.promptInstall() });
    const card = createTitleCard({
      container: root.querySelector('#title'), hasSave: loaded.state === 'ok', canInstall: flow.canInstall(), message, screen: view, history: win.history,
      difficulty: () => settings.get().difficulty, onDifficulty: (level) => settings.set({ difficulty: level }),   // spec 4.18: freshWorld reads it
      onContinue: () => startGame(loaded.world, { fromSave: true, savedAt: loaded.savedAt, lastSpeed: loaded.lastSpeed, notice: loaded.usedBackup ? T.restoredBackup : null }),
      onNewCity: () => (loaded.state === 'ok' ? confirmNewCity(loaded) : withCards(() => startGame(startPicked()))),
      mapSize: sizeIdOf(newCitySize), onMapSize: (id) => { newCitySize = MAP_SIZES[id]; },   // Stage 4.6 (ruling 333): the size picker (under More choices from Version 8.0)
      seed: newCitySeed, onSeed: (s) => { newCitySeed = s; },   // Version 8.2 (ruling 1310): the preview's seed
      onNewCityBack: restorePlayMap,
      layout: layoutNow(), onLayout: (id) => { newCityLayout = id; },   // Version 8.0 (ruling 1151): the layout picker; Version 9.1 (ruling 1660): firstCityLayout until one is picked
      // Version 6.0 (Track D1, rulings 742, 746): no Play with sound (sound and music are on by default; Settings, here and in the game, mutes them).
      // The third button is Lesson once the guided first city gives hooks.lesson (Track D2), until then How to play, the picture cards (Stage 4, Track G, spec 4.1).
      // Version 6.0 (Track D2, ruling 617): on a device that has not done the lesson and has no saved city the card offers only the lesson (lesson.due); a slot
      // holding something unreadable or from a newer version is not "no saved city" (the card keeps New city and its message).
      onLesson: typeof hooks.lesson === 'function' ? () => hooks.lesson() : null,
      lesson: { due: lessonDue(settings.get(), loaded.state !== 'none'), partWay: lessonPartWay(settings.get()), note, onAgain: () => hooks.lesson({ step: 0 }),
        // Version 9.1 (Track F, ruling 1669, over ruling 1111's title again): I've played before starts a city at once, on the new-city card's choices (the classic
        // river at Normal for a device's first city, ruling 1660), so it is one tap, not three; New city in the menu offers the rest.
        onSkip: () => { markLessonDone(); withCards(() => startGame(startPicked())); } },
      onHowToPlay: () => hooks.pictureCards(),
      // Version 9.3 (Track U, ruling 1977): this week's decree card, once a city has reached Town or a ruler is kept; a d1 link opens it on that link's week (even before then),
      // and keeps its sender as a rival on that week (records.addRival, never your own name).
      decree: decreeUnlocked(records) || linkedDecree() ? () => {
        const link = linkedDecree();
        if (link && link.name) {
          try { if (records.dynasty().name !== link.name) records.addRival(link, clock()); } catch (e) { /* records never stop the card */ }
        }
        const week = link ? link.week : thisWeek();
        return decreeTitleCard({ week, ids: decreesOfWeek(week), records, slot: decreeRunCache, onStart: () => askStartDecree(week), onContinue: (slot) => startDecree(slot.week, { loaded: decreeLoadedCache }) });
      } : null,
      // The game's Options rows with no city behind them; Saves > Export city exports the city in the slot (none: no button).
      renderSettings: (body) => createMenuSheets({ store: { get: () => ({}), set() {}, subscribe: () => () => {} }, settings, toasts: { show() {} }, hooks: { ...hooks, exportCity: loaded.state === 'ok' ? () => exportLoaded(loaded) : undefined } }).settings(body),
      onInstall: async () => { if ((await flow.promptInstall()) === 'guide' && title) title.card.showGuide(guide); },
      // Stage 3 (spec 4.19): records, stamps and a shared score, from the score interface. Version 6.0 (ruling 793): a shared score's Start this seed
      // plays the link's level even on the lesson-only card (setDifficulty), and says where the lesson is while this device has not finished it.
      decorate: titleDecor({
        records, shared: (win.location && win.location.hash) || '', clock,
        // Version 9.0 (Track L, ruling 1585): the records box's Rulers button opens the list as the card's one panel, with Back.
        onRulers: () => title && title.card.showPanel((body, back) => renderRulers(body, rulersDeps({ onBack: back, onInstall: async () => { if ((await flow.promptInstall()) === 'guide' && title) title.card.showGuide(guide); } }))),
        setDifficulty: (level) => settings.set({ difficulty: level }), lessonPending: settings.get().lessonDone !== true,
        startSeed: (seed, variant = null, size = null) => (loaded.state === 'ok' ? confirmNewCity(loaded, seed, variant, size || DEFAULT_MAP_SIZE) : withCards(() => startGame(freshWorld({ seed, variant, size: size || DEFAULT_MAP_SIZE })))),
      }),
    });
    title = { card, loop, backdrop, world, cam };
    backdrop.frame();
    loop.start();
    rescue.loadingDone();                               // Version 9.1 (Track R, ruling 1676): the title shows, so the loading screen goes and the page's ready mark is set
  }

  function leaveTitle() {
    if (!title) return;
    title.loop.stop(); title.backdrop.stop(); title.card.destroy();
    root.classList.remove('on-title');
    title = null;
  }

  // Version 9.1 (wave 0 seam, ruling 1651): the error handler and its card, once, before the title or a development flag's game opens (Track R,
  // src/ui/v91/rescue.js).
  const rescue = installRescue({ win, doc, root, store, settings, records, io, hooks, params, game: () => current });

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
  } else showTitle(await loadForTitle());

  api = {
    phase: () => (title ? 'title' : 'game'),
    game: () => current,
    titleView: () => (title ? { world: title.world, cam: title.cam } : null),   // Stage 4 (Track F): the backdrop's city and camera, for the title scene
    startGame, startDecree, hooks, records, music, rescue,   // startDecree (Version 9.3, Track U): a decree run of a week, for the tests and the shots; rescue (Version 9.1, Track R): the error handler's pieces, for the tests
    freshWorld,                                         // Stage 4.6: a new world as New city makes it ({ seed, variant, size }), for the dev scenes
    destroy() {
      win.removeEventListener('beforeinstallprompt', onPrompt); showNotice(root.querySelector('#notice'), null); leaveTitle(); stopGame(); rescue.destroy();
      if (cards) { cards.close(); cards = null; }
      for (const t of MUSIC_GESTURES) root.removeEventListener(t, onMusicGesture);
      doc.removeEventListener('visibilitychange', onMusicVisibility); stopMusicWatch(); music.destroy(); settings.destroy();
    },
  };
  return api;
}
