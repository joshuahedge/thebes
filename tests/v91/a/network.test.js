// Version 9.1 Track A (ruling 1704): the privacy line says Thebes sends nothing anywhere. This test reads every file src/ is made of (sw-files.js lists them), sw.js and
// index.html's inline scripts, with comments removed by a small tokenizer that skips '...', "...", `...` (and the code inside ${}) and regex literals. It fails on:
// XMLHttpRequest, a beacon, a socket, an event source, importScripts, a dynamic import of a web address; a fetch call outside the exact places listed below; fetch used
// as a value (but `typeof fetch`) or reached as window/self/globalThis.fetch; a string that is a web address or begins // (protocol-relative); a `new Image` or `.src =` outside the
// listed uses; and a web address in code other than the XML namespaces and the share link's base.
// What it cannot catch: an address built at run time from pieces; a tokenizer slip on an unusual regex literal (it would show as a false alarm or a gap in that file);
// a file with its own local variable called fetch (the value check skips it, the call check does not); and a request the browser makes itself, from a stylesheet, font or
// <link> (index.html's links and the stylesheets are not read).
import { describe, it, expect } from '../../harness.js';

// { code, strings }: `code` is the file with comments removed and each string's text left out (the quotes stay); `strings` is each string's static text.
export function tokenize(text) {
  let code = '';
  const strings = [];
  const stack = [];                    // a template literal being read, each entry the brace depth to come back to
  let i = 0, braces = 0, last = '';    // last: the last significant character of code, to tell a regex from a division
  const REGEX_AFTER = '(,=:[!&|?{};+-*%<>~^';
  const n = text.length;
  const readTemplate = () => {         // from just after a backtick, or after the } that closes a ${}: static text up to ${ or the closing backtick
    let s = '';
    while (i < n) {
      const c = text[i];
      if (c === '\\') { s += text[i + 1] || ''; i += 2; continue; }
      if (c === '`') { i++; strings.push(s); code += '``'; last = '`'; return; }
      if (c === '$' && text[i + 1] === '{') { i += 2; strings.push(s); stack.push(braces); braces = 0; code += '`${'; last = '{'; return; }
      s += c; i++;
    }
  };
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; code += ' '; continue; }
    if (c === '\'' || c === '"') {
      let s = ''; i++;
      while (i < n && text[i] !== c && text[i] !== '\n') { if (text[i] === '\\') { s += text[i + 1] || ''; i += 2; } else s += text[i++]; }
      i++; strings.push(s); code += c + c; last = c; continue;
    }
    if (c === '`') { i++; readTemplate(); continue; }
    if (c === '/' && (last === '' || REGEX_AFTER.includes(last) || /\b(return|typeof|case|of|in)$/.test(code.trimEnd().slice(-8)))) {
      let cls = false; i++;
      while (i < n && text[i] !== '\n' && (cls || text[i] !== '/')) { if (text[i] === '\\') i++; else if (text[i] === '[') cls = true; else if (text[i] === ']') cls = false; i++; }
      i++; while (/[a-z]/.test(text[i] || '')) i++;
      code += '/re/'; last = '/'; continue;
    }
    if (stack.length && c === '{') braces++;
    if (stack.length && c === '}') { if (braces === 0) { braces = stack.pop(); i++; code += '}'; readTemplate(); continue; } braces--; }
    code += c; if (!/\s/.test(c)) last = c;
    i++;
  }
  return { code, strings };
}

// fetch( calls: the tutorial's read of its marks beside its pictures, and the service worker's pass-through of a same-origin request that missed its cache.
const FETCH_CALLS = { 'src/ui/tutorial.js': 1, 'sw.js': 1 };
// fetch as a value: whatsNew.js gives the build stamp's reader `typeof fetch === 'function' ? fetch : null`, one bare use after the typeof.
const FETCH_VALUES = { 'src/ui/s46/whatsNew.js': 1 };
// `new Image` and `.src =`: the tutorial's two pictures (from `base`, TUTORIAL.dir, asserted relative below) and the sprite cache's loader (its src is the art registry's
// `png.src`, a path in the game's own files, which no art uses today).
const IMAGES = { 'src/ui/tutorial.js': { news: 1, srcs: 2 }, 'src/render/spriteCache.js': { news: 1, srcs: 1 } };
const NETWORK_APIS = [/\bXMLHttpRequest\b/, /\bsendBeacon\b/, /\bWebSocket\b/, /\bEventSource\b/, /\bimportScripts\b/, /\bnavigator\.connection\b/, /(^|[^.\w$])(window|self|globalThis)\.fetch\b/];
const URL_OK = [/^http:\/\/www\.w3\.org\/(2000\/svg|1999\/xlink)/, /^https:\/\/joshuahedge\.github\.io\/thebes\//];
const WEB = /^(https?:|wss?:)?\/\/[^\s]/i;       // a string that is a web address, or protocol-relative
const count = (re, text) => (text.match(re) || []).length;

// The problems in one file's text, as strings. sw.js's own importScripts('./sw-files.js') is a same-origin file beside it.
export function problems(file, text) {
  const { code, strings } = tokenize(text);
  const out = [];
  for (const re of NETWORK_APIS) if (re.test(code) && !(file === 'sw.js' && re.source === '\\bimportScripts\\b' && strings.includes('./sw-files.js'))) out.push(`${file}: ${re}`);
  const calls = count(/(^|[^.\w$])fetch\s*\(/g, code);
  if (calls !== (FETCH_CALLS[file] || 0)) out.push(`${file}: ${calls} fetch call(s), allowed ${FETCH_CALLS[file] || 0}`);
  if (!/\b(const|let|var)\s+fetch\b/.test(code)) {            // a file with its own variable called fetch (the cart orders) is not using the network function
    const asValue = count(/(^|[^.\w$])fetch\b(?!\s*\()/g, code) - count(/[{,]\s*fetch\s*:/g, code) - count(/\btypeof\s+fetch\b/g, code);   // not a call, not an object key, not after typeof
    if (asValue !== (FETCH_VALUES[file] || 0)) out.push(`${file}: fetch used as a value ${asValue} time(s), allowed ${FETCH_VALUES[file] || 0}`);
  }
  if (/\bimport\s*\(\s*['"`]/.test(code) && strings.some((s) => WEB.test(s))) out.push(`${file}: a dynamic import of a web address`);
  const want = IMAGES[file] || { news: 0, srcs: 0 };
  const news = count(/\bnew\s+Image\b/g, code), srcs = count(/\.src\s*=(?!=)/g, code);
  if (news !== want.news || srcs !== want.srcs) out.push(`${file}: new Image ${news}, .src = ${srcs}; allowed ${want.news}, ${want.srcs}`);
  for (const s of strings) {
    if (WEB.test(s) && !URL_OK.some((ok) => ok.test(s))) out.push(`${file}: ${s.slice(0, 60)}`);
    else for (const m of s.matchAll(/https?:\/\/[^\s'"`)<>]+/g)) if (!URL_OK.some((ok) => ok.test(m[0]))) out.push(`${file}: ${m[0]}`);
  }
  return out;
}

async function sources() {
  const list = await (await fetch('/sw-files.js')).text();
  const files = [...list.matchAll(/'\.\/(src\/[^']+\.js)'/g)].map((m) => m[1]);
  const out = [];
  for (const f of [...files, 'sw.js']) out.push([f, await (await fetch(`/${f}`)).text()]);
  const html = await (await fetch('/index.html')).text();
  // index.html: each inline script (no src) is read as code; a script with a src is a file of src/ unless its address is another origin, which is flagged
  [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].forEach((m, i) => {
    const src = /\bsrc\s*=\s*["']?([^"'\s>]+)/i.exec(m[1]);
    if (!src) out.push([`index.html inline script ${i + 1}`, m[2]]);
    else if (WEB.test(src[1])) out.push([`index.html script ${i + 1}`, `'${src[1]}'`]);
  });
  return out;
}

describe('v91 a network: nothing in src/ reaches another origin', () => {
  it('no network API, no fetch outside the listed places, no web address in code but the XML namespaces and the share base, in src/, sw.js and index.html\'s inline scripts', async () => {
    const all = await sources();
    expect(all.filter(([f]) => f.startsWith('src/')).length > 300).toBe(true);       // the whole of src/, not a stub of it
    expect(all.some(([f]) => f === 'sw.js')).toBe(true);
    const wrong = [];
    for (const [file, text] of all) wrong.push(...problems(file, text));
    expect(wrong).toEqual([]);
  });

  it('the tutorial reads its marks with exactly one fetch call, and its pictures from a path of the game\'s own', async () => {
    const all = Object.fromEntries(await sources());
    expect(count(/(^|[^.\w$])fetch\s*\(/g, tokenize(all['src/ui/tutorial.js']).code)).toBe(1);
    expect(/new URL\('\.\.\/\.\.\/\.\.\/sw-files\.js', import\.meta\.url\)/.test(all['src/ui/s46/whatsNew.js'])).toBe(true);   // the build stamp: beside the page, never an address
    const { TUTORIAL } = await import('../../../src/data/tutorial.js');
    expect(/^(\.\/|assets\/)/.test(TUTORIAL.dir)).toBe(true);     // relative: the same origin
  });

  it('the tokenizer skips strings and regex when it removes comments, and keeps a string\'s text apart from code', () => {
    const t = tokenize("const a = 'http://x.test/a'; // fetch(1)\nconst b = `//y ${f('//z')} q`; const r = /\\/\\/ x/; /* fetch( */ const c = \"//d\";");
    expect(t.strings).toEqual(['http://x.test/a', '//y ', '//z', ' q', '//d']);
    expect(/fetch/.test(t.code)).toBe(false);
    expect(/\/\/ x/.test(t.code)).toBe(false);
  });

  it('the checker catches each way out: a fetch call or value, window.fetch, a beacon, a socket, a web or protocol-relative address, an image from an address', () => {
    const bad = (src) => problems('src/x.js', src).length > 0;
    expect(bad("fetch('https://example.com/x');")).toBe(true);
    expect(bad('const f = fetch;')).toBe(true);
    expect(bad('const f = globalThis.fetch;')).toBe(true);
    expect(bad("navigator.sendBeacon('/x');")).toBe(true);
    expect(bad("new WebSocket('wss://x');")).toBe(true);
    expect(bad("const u = '//cdn.example.com/a.js';")).toBe(true);
    expect(bad("const i = new Image(); i.src = 'https://example.com/a.png';")).toBe(true);
    expect(bad('const u = `https://example.com/${x}`;')).toBe(true);
    expect(problems('src/x.js', "// fetch('https://example.com')\nconst a = typeof fetch === 'function';")).toEqual([]);
    expect(bad("const ns = 'http://www.w3.org/2000/svg';")).toBe(false);
  });
});
