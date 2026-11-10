// Version 9.0 "Dynasty", Track D (rulings 1565-1584): where the heir and the title show in a game. The score interface (src/ui/scoreUi.js) makes one
// with its own context and adds what it gives:
//   summary()     the score section's head lines: "Heir of the Builder" with the trait's two lines (a city that has a heir), and from City "Remembered
//                 as: the Builder", why, and the next title with how far it is (titleOf), so a player can steer;
//   onEvents(e)   the one-time caption at City ("You may now pass the throne"), and the heir_trait tip at a heir's city's first month end;
//   opening()     the heir's first-screen line: a caption in the guidance row (the goal strip's place on a phone, ruling 1571) when a heir's city
//                 opens in its first HEIR_LINE_DAYS days;
//   sheets        Pass the throne's sheet and the heir's new-city card (src/ui/v90/passSheet.js).
// Never in the lesson: its city is the Steady, never reaches City and has no Pass.
import { el } from '../components.js';
import { titleOf, canPassThrone } from '../../sim/dynasty.js';
import { atLeast } from '../../sim/progression.js';
import { HEIR_LINE_DAYS, PASS_FROM } from '../../data/dynasty.js';
import { V90_D_TEXT, D92_D_TEXT } from '../text.js';
import { createPassSheets } from './passSheet.js';
import { mountScribe, unmountScribe, say } from '../v81/scribe.js';

const HEIR_IPI_MS = 9000;   // long enough to read the trait's two sides once on a phone

export function createDynastyUi(ctx) {
  const { world } = ctx;
  const W = V90_D_TEXT;
  const real = () => Boolean(world) && !world.lesson;
  const heir = () => (world && world.heir) || 'steady';

  function summary() {
    if (!real()) return [];
    const out = [];
    if (heir() !== 'steady') out.push(el('p', { class: 'heir-head' }, [el('strong', { text: W.heirOf(heir()) }), ' ', el('span', { class: 'small muted', text: W.traitLine(heir()) })]));
    if (atLeast(world, PASS_FROM)) {
      const t = titleOf(world);
      const runner = t.runnerUp ? t.rows.find((r) => r.id === t.runnerUp) : null;
      out.push(el('div', { class: 'remembered' }, [
        el('p', { class: 'remembered-as' }, [el('strong', { text: W.rememberedAs(t.id) })]),
        el('p', { class: 'remembered-why small', text: W.whyLine(t.id, t.rows) }),
        runner ? el('p', { class: 'remembered-next small muted', text: W.closeBehindFull(runner) }) : null,
        el('p', { class: 'remembered-note small muted', text: W.rememberedNote }),
      ]));
    }
    return out;
  }

  function onEvents(events) {
    if (!real()) return;
    for (const e of events) {
      if (e.type === 'milestone' && e.id === PASS_FROM && canPassThrone(world).ok && ctx.celebrations) ctx.celebrations.show({ tier: 'first', text: W.cityCaption, why: W.cityCaptionWhy });
      if (e.type === 'month' && heir() !== 'steady' && typeof ctx.fireTip === 'function') ctx.fireTip('heirCity');
    }
  }

  // Version 9.2 (Track D, ruling 1817): the heir's first line is Ipi's, in his bubble under the top bar (src/ui/v81/scribe.js), and the only thing the first screen
  // says (the Pass no longer toasts, boot.js no longer asks to install in the first month). Without an interface root (a test of the line alone) it stays the caption.
  let mounted = false;
  function opening() {
    if (!real() || heir() === 'steady' || world.day >= HEIR_LINE_DAYS) return;
    if (ctx.root) {
      mountScribe(ctx.root); mounted = true;
      say(D92_D_TEXT.heirIpi(heir()), { ms: HEIR_IPI_MS });
      return;
    }
    if (!ctx.celebrations) return;
    ctx.celebrations.show({ tier: 'info', text: W.heirCaption(heir()), why: W.heirCaptionWhy(heir()) });
  }
  function destroy() { if (mounted) { mounted = false; unmountScribe(); } }

  return { summary, onEvents, opening, destroy, sheets: world ? createPassSheets(ctx) : {} };
}
