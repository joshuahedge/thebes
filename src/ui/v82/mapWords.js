// Version 8.2 integration (ruling 1335): every word a city with no river shows says the great lake where it says the river. Track G swapped the words at the sheets
// that name the river most (ruling 1307); the rest (the gossip, the court's omen, the events, the tips, the explainers, a toast) reach the screen from many places,
// so on such a city one watcher over the interface applies the same swap list (oasisText.js forMap) to every text node and label as it is drawn. A part that
// names other maps on purpose (How to play's Maps note, the new-city card) carries MAP_WORDS_AS_WRITTEN and is left alone. A river city has no watcher at all.
import { forMap, riverless } from './oasisText.js';

export const MAP_WORDS_AS_WRITTEN = 'data-map-words';   // the attribute's presence: these words are said as written, whatever the map
const LABELS = ['aria-label', 'title'];

export function watchMapWords(world, root) {
  if (!riverless(world) || !root || typeof MutationObserver === 'undefined') return () => {};
  const kept = (n) => { const e = n.nodeType === 1 ? n : n.parentElement; return Boolean(e && e.closest(`[${MAP_WORDS_AS_WRITTEN}]`)); };
  const text = (t) => { if (kept(t)) return; const v = forMap(world, t.nodeValue); if (v !== t.nodeValue) t.nodeValue = v; };
  const label = (e, a) => { const v = e.getAttribute(a); if (v && !kept(e)) { const w = forMap(world, v); if (w !== v) e.setAttribute(a, w); } };
  const tree = (n) => {
    if (n.nodeType === 3) { text(n); return; }
    if (n.nodeType !== 1 || kept(n)) return;
    const walk = n.ownerDocument.createTreeWalker(n, 4);   // NodeFilter.SHOW_TEXT
    for (let t = walk.nextNode(); t; t = walk.nextNode()) text(t);
    for (const a of LABELS) { label(n, a); for (const e of n.querySelectorAll(`[${a}]`)) label(e, a); }
  };
  tree(root);
  const watcher = new MutationObserver((changes) => {
    for (const m of changes) {
      if (m.type === 'characterData') text(m.target);
      else if (m.type === 'attributes') label(m.target, m.attributeName);
      else for (const n of m.addedNodes) tree(n);
    }
  });
  watcher.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: LABELS });
  return () => watcher.disconnect();
}
