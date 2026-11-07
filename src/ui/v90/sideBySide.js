// Version 9.0 "Dynasty" (Track L, ruling 1592): a score and a friend's score side by side, for the Pass sheet and an opened ruler row. Two scores with each
// side's heir, then the five parts as two bars each with the number beside every bar and the side's name in words (never colour alone). A part the
// friend's older link does not carry (a t1 link has four parts) reads "not scored", with no bar.
import { SCORE_PARTS } from '../../data/scoring.js';
import { el } from '../components.js';
import { SCORE_TEXT, V90_L_TEXT, V90_D_TEXT } from '../text.js';

const clampPart = (n) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

// mine: { score, parts, heir }; rival: { name, score, parts, heir }. Returns the section's element.
export function sideBySide(mine, rival, { id = 'side-by-side' } = {}) {
  const L = V90_L_TEXT;
  const head = el('h3', { id: `${id}-head`, text: L.sideHead(rival.name) });
  const side = (who, row, cls) => el('p', { class: `sbs-side ${cls}` }, [
    el('strong', { class: 'sbs-who', text: who }), ' ', el('span', { class: 'sbs-score', text: String(row.score) }), ' ', el('small', { class: 'sbs-heir muted', text: V90_D_TEXT.heirOf(row.heir) }),
  ]);
  const line = (who, row, part, cls) => {
    const n = row.parts && Number.isFinite(row.parts[part]) ? row.parts[part] : null;
    return el('div', { class: `sbs-line ${cls}`, dataset: { part, side: cls } }, [
      el('span', { class: 'sbs-name', text: who }),
      n === null ? el('span', { class: 'sbs-bar none', 'aria-hidden': 'true' }) : el('span', { class: 'part-bar sbs-bar', 'aria-hidden': 'true' }, [el('span', { class: `fill ${cls}`, style: { width: `${clampPart(n)}%` } })]),
      el('strong', { class: 'sbs-number', text: n === null ? L.notScored : String(n) }),
    ]);
  };
  return el('section', { class: 'side-by-side', 'aria-labelledby': `${id}-head` }, [
    head,
    el('div', { class: 'sbs-heads' }, [side(L.you, mine, 'you'), side(rival.name, rival, 'rival')]),
    el('ul', { class: 'sbs-parts' }, SCORE_PARTS.map((p) => el('li', { class: 'sbs-part', dataset: { part: p } }, [
      el('span', { class: 'sbs-part-name', text: SCORE_TEXT.parts[p] }),
      line(L.you, mine, p, 'you'),
      line(rival.name, rival, p, 'rival'),
    ]))),
  ]);
}
