// Version 9.1 Track A (ruling 1704): the privacy line says Thebes sends nothing anywhere, so a test reads every file src/ is made of (sw-files.js lists them)
// and fails on any way to reach another origin: a network API, a fetch call outside the tutorial's same-origin read, a script or image set from an absolute URL, or a web address in
// code other than an XML namespace and the share link's base (a link the player sends; it is never requested).
import { describe, it, expect } from '../../harness.js';

// Comments out (a // after a space or at a line's start, and /* */), so a note that names a URL is not read as code.
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '$1')).join('\n');

// The only file that calls fetch( outright is the tutorial's, which reads the marks beside its pictures. whatsNew.js reads the build stamp off sw-files.js through
// a passed-in fetch (a call spelled fetchFn(, so none here); the second test pins that its address is beside the page.
const FETCHERS = { 'src/ui/tutorial.js': 1 };
const NETWORK_APIS = [/\bXMLHttpRequest\b/, /\bsendBeacon\b/, /\bWebSocket\b/, /\bEventSource\b/, /\bimportScripts\b/, /\bimport\s*\(\s*['"`]https?:/, /\bnavigator\.connection\b/];
const URL_OK = [/^http:\/\/www\.w3\.org\/(2000\/svg|1999\/xlink)/, /^https:\/\/joshuahedge\.github\.io\/thebes\//];

async function sources() {
  const list = await (await fetch('/sw-files.js')).text();
  const files = [...list.matchAll(/'\.\/(src\/[^']+\.js)'/g)].map((m) => m[1]);
  const out = [];
  for (const f of files) out.push([f, code(await (await fetch(`/${f}`)).text())]);
  return out;
}

describe('v91 a network: nothing in src/ reaches another origin', () => {
  it('no network API, no fetch call but the tutorial\'s same-origin read, and no absolute web address in code but the XML namespaces and the share base', async () => {
    const all = await sources();
    expect(all.length > 300).toBe(true);                       // the whole of src/, not a stub of it
    const wrong = [];
    for (const [file, text] of all) {
      for (const re of NETWORK_APIS) if (re.test(text)) wrong.push(`${file}: ${re}`);
      const fetches = (text.match(/(^|[^.\w$])fetch\s*\(/g) || []).length;
      if (fetches !== (FETCHERS[file] || 0)) wrong.push(`${file}: ${fetches} fetch call(s), allowed ${FETCHERS[file] || 0}`);
      for (const m of text.matchAll(/https?:\/\/[^\s'"`)<>]+/g)) if (!URL_OK.some((ok) => ok.test(m[0]))) wrong.push(`${file}: ${m[0]}`);
    }
    expect(wrong).toEqual([]);
  });

  it('the two fetching files read a path of the game\'s own', async () => {
    const all = Object.fromEntries(await sources());
    expect(/new URL\('\.\.\/\.\.\/\.\.\/sw-files\.js', import\.meta\.url\)/.test(all['src/ui/s46/whatsNew.js'])).toBe(true);   // beside the page, never an address
    const { TUTORIAL } = await import('../../../src/data/tutorial.js');
    expect(/^(\.\/|assets\/)/.test(TUTORIAL.dir)).toBe(true);     // relative: the same origin
  });

  it('the checker itself catches an offender (a fetch of another origin, a beacon, a socket)', () => {
    const bad = code("export const f = () => fetch('https://example.com/x');\nnavigator.sendBeacon('/x');\nnew WebSocket('wss://x');");
    expect([/https?:\/\/[^\s'"`)<>]+/.test(bad), NETWORK_APIS[1].test(bad), NETWORK_APIS[2].test(bad), (bad.match(/(^|[^.\w$])fetch\s*\(/g) || []).length]).toEqual([true, true, true, 1]);
    expect(code('// see https://example.com\nconst a = 1; /* http://x */').includes('http')).toBe(false);
  });
});
