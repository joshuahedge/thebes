// Version 9.0 "Dynasty": Pass the throne's sheet (Track D owns the sheet). passSheetExtras is wave 0's seam (ruling 1563; Track L owns it):
// the sheet calls it once, after its own five parts, to draw the rival side by side into body. ctx is the sheet's context (the interface's seam
// context and the records). Wave 0's body draws nothing.
export function passSheetExtras(body, world, ctx) {}

// ── Track D (rulings 1565-1584): the sheet and the heir's new-city card ──
// createPassSheets(ctx) gives the two custom sheets, ctx being the interface's seam context (src/ui/createUI.js: world, store, toasts, hooks, clock):
//   passThrone  the sheet (design section 2): who the ruler will be remembered as and why, with the runner-up; what the heir gets; the score kept;
//               the dynasty's name; Pass the throne and Not yet (with the replace note and Export first); then passSheetExtras.
//   passHeir    8.2's new-city card (titleCard.js renderNewCityCard, its choices kept by boot's hooks.newCityChoices), headed "Your heir's city",
//               with the trait line above Start. Start passes the throne at once (ruling 1569): the seal (src/sim/dynasty.js passThrone), the
//               city's records row and chronicle stamp, the ruler row (records.addRuler), the dynasty's name and heir (records.setDynasty), then the
//               heir's city (boot's hooks.startHeir). Back, like Not yet, changes nothing.
// The title is worked out when the sheet opens and kept for the card, so the sheet and Start say the same title.
import { el, button } from '../components.js';
import { openSheet, closeSheet } from '../modes.js';
import { renderNewCityCard } from '../titleCard.js';
import { titleOf, passScore, passThrone, canPassThrone } from '../../sim/dynasty.js';
import { cleanName, RULER_NAME_MAX, RULER_NAME_DEFAULT } from '../../save/records.js';
import { V90_D_TEXT, T } from '../text.js';

// The game's new-city card's picture: 120 px on a short screen, else 160 (ruling 1311, as src/ui/menu.js has it).
const previewPx = () => (typeof window !== 'undefined' && window.innerHeight < 700 ? 120 : 160);

export function createPassSheets(ctx) {
  const { world, store } = ctx;
  const W = V90_D_TEXT;
  const records = () => (ctx.hooks && ctx.hooks.records) || null;
  const clock = () => (typeof ctx.clock === 'function' ? ctx.clock() : Date.now());
  const goTo = (kind) => store.set(openSheet(store.get(), kind));
  let title = null;        // titleOf's result when the sheet opened
  let name = null;         // the dynasty's name as typed (null until the sheet opens)

  const dynastyName = () => { try { return (records() && records().dynasty().name) || RULER_NAME_DEFAULT; } catch (e) { return RULER_NAME_DEFAULT; } };
  // The regnal number the game will add for this name: one more than the rulers already of that name (records.addRuler counts the same way).
  const regnalOf = (n) => { try { return (records() ? records().rulers().filter((r) => r.name === n).length : 0) + 1; } catch (e) { return 1; } };
  const nameNow = () => cleanName(name) || dynastyName();

  function sheet(body, { setTitle } = {}) {
    if (typeof setTitle === 'function') setTitle(W.menuPass);
    const can = canPassThrone(world);
    if (!can.ok) { body.append(el('p', { class: 'pass-refused', text: W.notYetPass(can.people) })); return; }
    title = titleOf(world);
    if (name === null) name = dynastyName();
    const kept = passScore(world);
    const head = el('strong', { class: 'pass-title-text', text: W.remembered(nameNow(), regnalOf(nameNow()), title.id) });
    const runner = title.runnerUp ? title.rows.find((r) => r.id === title.runnerUp) : null;
    // Styled as the share sheet's link field (css/ui.css .share-link-text), inline: css/v90.css is Track V's.
    const input = el('input', { id: 'pass-name', class: 'pass-name', type: 'text', maxlength: String(RULER_NAME_MAX), value: name, autocomplete: 'off', spellcheck: 'false', 'aria-describedby': 'pass-name-hint',
      style: { boxSizing: 'border-box', width: '100%', minHeight: 'var(--tap)', padding: '0 8px', font: 'inherit', color: 'var(--ink)', background: 'var(--parchment-2)', border: '1px solid var(--parchment-3)', borderRadius: 'var(--radius)' } });
    input.addEventListener('input', () => { name = input.value; head.textContent = W.remembered(nameNow(), regnalOf(nameNow()), title.id); });
    const exportFirst = ctx.hooks && typeof ctx.hooks.exportCity === 'function'
      ? button(T.exportFirst, { class: 'pass-export quiet', onClick: () => ctx.hooks.exportCity() }) : null;
    body.append(el('section', { class: 'pass-sheet' }, [
      // 1. The title, why, and the runner-up.
      el('p', { class: 'pass-title' }, [head]),
      el('p', { class: 'pass-why small', text: W.whyLine(title.id, title.rows) }),
      runner ? el('p', { class: 'pass-runner small muted', text: W.closeBehind(runner.id) }) : null,
      // 2. What the heir gets.
      el('h3', { class: 'pass-heir-head', text: W.heirGetsHead }),
      el('p', { class: 'pass-heir', text: W.heirCity(title.id) }),
      // 3. The score kept.
      el('h3', { class: 'pass-score-head', text: W.scoreHead }),
      el('p', { class: 'pass-score' }, [el('strong', { text: W.sealedScore(kept.score, kept.medal) })]),
      el('p', { class: 'pass-score-note small muted', text: kept.sealed ? W.sealedFrom(kept.day) : W.sealedToday }),
      // 4. The dynasty's name (16 characters, said so).
      el('label', { class: 'pass-name-label', for: 'pass-name', text: W.nameLabel, style: { display: 'block', fontWeight: '600', margin: '12px 0 4px' } }),
      input,
      el('p', { id: 'pass-name-hint', class: 'pass-name-hint small muted', text: W.nameHint(RULER_NAME_MAX) }),
      // 5. The consequence, then Pass the throne and Not yet.
      el('p', { class: 'pass-replace small', text: W.replaced }),
      el('div', { class: 'actions' }, [
        button(W.passButton, { class: 'pass-confirm primary', onClick: () => { name = input.value; goTo('passHeir'); } }),
        exportFirst,
        button(W.notYet, { class: 'pass-not-yet', onClick: () => store.set(closeSheet(store.get())) }),
      ]),
    ]));
    // Track L's side by side reads the rival from the records (ctx.records, else ctx.hooks.records) and the sealed score the sheet shows (ctx.score).
    passSheetExtras(body, world, { ...ctx, records: records(), score: kept.score, hooks: ctx.hooks });
  }

  function heirCard(body, { close, setTitle } = {}) {
    if (typeof setTitle === 'function') setTitle(W.heirCardHead);
    if (!title || !canPassThrone(world).ok) { sheet(body, { setTitle }); return; }   // opened on its own (no title yet): the sheet first
    const C = (ctx.hooks && ctx.hooks.newCityChoices) || { get: () => ({}), setSize() {}, setLayout() {}, setSeed() {} };
    const now = C.get();
    const settings = ctx.settings;
    const card = renderNewCityCard({
      difficulty: settings ? settings.get().difficulty : 'normal', onDifficulty: (level) => { if (settings) settings.set({ difficulty: level }); },
      mapSize: now.mapSize, onMapSize: C.setSize, layout: now.layout || 'auto', onLayout: C.setLayout, seed: now.seed, onSeed: C.setSeed,
      hasSave: true, head: false, previewPx: previewPx(),
      onBack: () => { if (close) close(); else store.set(closeSheet(store.get())); },
      onStart: () => pass(),
    });
    const actions = card.element.querySelector('.actions');
    card.element.insertBefore(el('p', { class: 'heir-trait-line', text: W.heirCity(title.id) }), actions);
    body.append(card.element);
    queueMicrotask(() => { if (card.element.isConnected) card.focus(); });
  }

  // Start: everything at once, in this order, so the ruler row reads the dynasty's name and the heir's city reads the new heir.
  function pass() {
    const id = title.id, ruler = nameNow(), r = records(), at = clock();
    try { if (r) r.setDynasty({ name: ruler }); } catch (e) { /* records never stop a Pass */ }
    const n = regnalOf(ruler);
    const res = passThrone(world, { title: id });
    if (!res.ok) { if (ctx.toasts) ctx.toasts.show(W.passFailed); return; }
    try {
      if (r) {
        r.noteCity(world, at);
        r.addSeal(world, res.seal, at);
        r.addRuler(world, res.seal, res.title, at);
        r.setDynasty({ heir: res.title });
      }
    } catch (e) { /* records never stop a Pass */ }
    title = null; name = null;
    if (ctx.hooks && typeof ctx.hooks.startHeir === 'function') ctx.hooks.startHeir({ notice: W.passedToast(ruler, n, res.title) });
  }

  return { passThrone: sheet, passHeir: heirCard };
}
