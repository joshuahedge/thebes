// Stage 4.6 (rulings 401-403): the version line and the What's new panel on the title card. The version is APP_VERSION (src/data/ui.js);
// the notes are RELEASES (src/data/releases.js), newest first, each split into New and Fixed. The title card (src/ui/titleCard.js) shows
// the line small under its tagline and a What's new button that opens this as its one panel (the buttons give way to it, with Back).
import { APP_VERSION } from '../../data/ui.js';
import { RELEASES, releaseDateText } from '../../data/releases.js';
import { el, button } from '../components.js';
import { T, S46_UX_TEXT, V711_TEXT } from '../text.js';

// The short build stamp: the first seven characters of the cache's build (sw-files.js, which tools/sw-files.ps1 writes and the offline cache
// is named by), or null when the text holds none.
export function buildStampOf(text) {
  const m = /THEBES_BUILD\s*=\s*'([0-9a-f]{12})'/.exec(String(text || ''));
  return m ? m[1].slice(0, 7) : null;
}

// Reads the stamp off the page's own sw-files.js. Anything that goes wrong (offline with no cache, a test page, a blocked fetch) is no
// stamp, never an error: the version line then shows the version alone.
export async function readBuildStamp(fetchFn = typeof fetch === 'function' ? fetch : null, url = new URL('../../../sw-files.js', import.meta.url).href) {
  if (typeof fetchFn !== 'function') return null;
  try {
    const r = await fetchFn(url, { cache: 'no-store' });
    if (!r || !r.ok) return null;
    return buildStampOf(await r.text());
  } catch (e) { return null; }
}

// The small version line ("Version 4.6 · build 989a650"); the stamp arrives a moment after the card.
export function versionLine({ version = APP_VERSION, stamp = null, read = readBuildStamp } = {}) {
  const node = el('p', { class: 'version small muted', id: 'title-version', text: S46_UX_TEXT.versionLine(version, stamp) });
  if (!stamp && typeof read === 'function') {
    Promise.resolve(read()).then((s) => { if (s && node.isConnected !== false) node.textContent = S46_UX_TEXT.versionLine(version, s); }).catch(() => {});
  }
  return node;
}

const notes = (head, list) => (list && list.length
  ? [el('h4', { text: head }), el('ul', { class: 'notes' }, list.map((t) => el('li', { text: t })))]
  : []);

// The panel: render(body, back) as the title card's showPanel gives them. Every release in RELEASES order (newest first), each as a heading
// with its date and title, then New and Fixed lists (a list with nothing in it is left out). Back is at the top and the foot of a long list.
// Each heading carries its build (final review, Josh's ask): a past version its merge commit, the newest ('live') the running build's stamp,
// read like the version line's (stamp, or read() a moment later; none when it cannot be read).
export function renderWhatsNew(body, back, releases = RELEASES, { stamp = null, read = readBuildStamp } = {}) {
  const top = button(T.back, { class: 'guide-back whats-new-back', onClick: back });
  const foot = button(V711_TEXT.continueLabel, { class: 'guide-back whats-new-back', onClick: back });   // Version 7.1.1 (ruling 1106): the foot of a page read through says Continue
  const live = [];
  const headText = (r, s) => S46_UX_TEXT.releaseHead(r.version, releaseDateText(r.date), r.build === 'live' ? s : r.build || null);
  const head = (r) => {
    const text = document.createTextNode(headText(r, stamp));
    if (r.build === 'live') live.push([text, r]);
    return text;
  };
  const list = el('div', { class: 'releases' }, releases.map((r, i) => el('section', { class: 'release', 'aria-labelledby': `release-${r.version}` }, [
    el('h3', { id: `release-${r.version}` }, [head(r), i === 0 ? el('span', { class: 'newest small', text: ` ${S46_UX_TEXT.newestTag}` }) : null]),
    el('p', { class: 'release-title', text: r.title }),
    ...notes(S46_UX_TEXT.newHead, r.new),
    ...notes(S46_UX_TEXT.fixedHead, r.fixed),
  ])));
  const scroller = el('div', { class: 'whats-new', tabindex: '-1' }, [el('div', { class: 'whats-new-head' }, [top, el('h2', { text: S46_UX_TEXT.whatsNewTitle })]), list, el('div', { class: 'actions' }, [foot])]);
  scroller.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); back(); } });
  body.append(scroller);
  if (live.length && !stamp && typeof read === 'function') {
    Promise.resolve(read()).then((s) => { if (s) for (const [text, r] of live) text.textContent = headText(r, s); }).catch(() => {});
  }
  return { scroller, top };
}
