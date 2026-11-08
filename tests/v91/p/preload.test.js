// Version 9.1 Track P (ruling 1685): index.html's module preload block, written by tools/sw-files.ps1: every module src/main.js imports, directly or
// not (static import and export-from lines; a dynamic import() stays lazy), once each, main.js first, each a file the service worker caches.
import { describe, it, expect } from '../../harness.js';

const source = (path) => fetch(path).then((r) => r.text());
const OPEN = '<!-- v91 preload -->', CLOSE = '<!-- end v91 preload -->';

// The static imports of one module, resolved against its own URL (the same lines tools/sw-files.ps1 follows). A line comment is skipped (the
// keyword must start a statement); a bare import line inside a /* block comment */ would still count (a known gap: no module has one).
const IMPORT = /(?:^|[;\n}])\s*(?:import|export)\s+(?:[^;'"`()]*?\s+from\s+)?['"](\.{1,2}\/[^'"]+\.js)['"]/g;
// The tree in the order the script writes it: depth first from main.js, each module before the ones it imports, in its import order.
async function importTree() {
  const order = [], seen = new Set();
  async function add(path) {
    if (seen.has(path)) return;
    seen.add(path); order.push(path);
    const text = await source(path);
    for (const m of [...text.matchAll(IMPORT)]) await add(new URL(m[1], `http://x${path}`).pathname);
  }
  await add('/src/main.js');
  return order;
}

describe('v91 p preload: index.html\'s module preload block', () => {
  it('sits in its marked block after the last stylesheet and lists only modulepreload links, each once, main.js first', async () => {
    const html = await source('/index.html');
    const a = html.indexOf(OPEN), b = html.indexOf(CLOSE);
    expect(a > html.lastIndexOf('<link rel="stylesheet"') && b > a && b < html.indexOf('</head>')).toBe(true);
    const lines = html.slice(a + OPEN.length, b).trim().split('\n');
    const hrefs = lines.map((l) => (l.match(/^<link rel="modulepreload" href="\.\/([^"]+)">$/) || [])[1]);
    expect(hrefs.filter((h) => !h)).toEqual([]);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs[0]).toBe('src/main.js');
    expect(html.split('rel="modulepreload"').length - 1).toBe(hrefs.length);   // no preload outside the block
  });
  it('lists exactly the modules main.js imports, directly or not, in the order the browser meets them, and each is a file the service worker caches', async () => {
    const html = await source('/index.html');
    const hrefs = [...html.slice(html.indexOf(OPEN), html.indexOf(CLOSE)).matchAll(/href="\.\/([^"]+)"/g)].map((m) => `/${m[1]}`);
    const tree = await importTree();
    expect(hrefs.filter((h) => !tree.includes(h))).toEqual([]);
    expect(tree.filter((h) => !hrefs.includes(h))).toEqual([]);
    expect(hrefs).toEqual(tree);                                      // the same walk: a stale block (an import added or moved) fails here
    const sw = await source('/sw-files.js');
    expect(hrefs.filter((h) => !sw.includes(`'.${h}'`))).toEqual([]);
    for (const h of hrefs) expect([h, (await fetch(h, { method: 'HEAD' })).status]).toEqual([h, 200]);
  });
  it('follows import and export-from lines, multi-line ones too, and leaves a dynamic import() and a commented line out', () => {
    const text = "import { a,\n  b } from './one.js';\nexport { c } from '../two.js';\nimport './three.js';\n// import x from './no.js';\nconst m = () => import('./lazy.js');\nexport * from './four.js';";
    expect([...text.matchAll(IMPORT)].map((m) => m[1])).toEqual(['./one.js', '../two.js', './three.js', './four.js']);
  });
});
