// Version 9.1 Track R (ruling 1676, design 5a): the loading screen in index.html's own head, its 15 s line (a fake clock), the nomodule line and the early error line. The two
// inline scripts are run here as the browser would run them, in a document of their own with a fake window and a fake clock.
import { describe, it, expect } from '../../harness.js';

const source = (path) => fetch(path).then((r) => r.text());
const between = (html, a, b) => html.slice(html.indexOf(a) + a.length, html.indexOf(b));
const scriptsOf = (block) => [...block.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1] || '', code: m[2] }));

// A document with a body, a fake window (reload, listeners) and a fake clock; the inline script run against them.
function page({ body = true } = {}) {
  const doc = document.implementation.createHTMLDocument('Thebes');
  if (!body) doc.documentElement.removeChild(doc.body);
  const timers = [], reloads = [], listeners = [], observers = [];
  const win = {
    location: { reload: () => reloads.push(1) },
    addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
    MutationObserver: function (cb) { this.observe = () => observers.push(cb); this.disconnect = () => { observers.length = 0; }; },
  };
  const clock = { now: 0, cleared: [] };
  const setTimeoutFake = (fn, ms) => { timers.push({ fn, at: clock.now + ms, ms }); return timers.length; };
  const clearTimeoutFake = (id) => { clock.cleared.push(id); const t = timers[id - 1]; if (t) t.dead = true; };
  const run = (code) => new Function('window', 'document', 'setTimeout', 'clearTimeout', code)(win, doc, setTimeoutFake, clearTimeoutFake);
  const advance = (ms) => { clock.now += ms; for (const t of timers) if (!t.dead && t.at <= clock.now) { t.dead = true; t.fn(); } };
  return { doc, win, run, advance, timers, reloads, listeners, observers, clock, node: () => doc.getElementById('v91-loading') };
}
const shown = (el) => !el.hidden;

describe('v91 r loading: index.html\'s loading block', () => {
  it('is in the head before the first stylesheet, with its own inline style (the parchment colour), the name, a quiet line, the slow line, Reload and the nomodule line', async () => {
    const html = await source('/index.html');
    const block = between(html, '<!-- v91 loading -->', '<!-- end v91 loading -->');
    expect(block.includes('<style>') && block.includes('#F3E7CB')).toBe(true);
    expect(html.indexOf('<!-- end v91 loading -->') < html.indexOf('<link rel="stylesheet"')).toBe(true);
    expect(html.indexOf('<!-- end v91 loading -->') < html.indexOf('<body')).toBe(true);
    for (const words of ['Thebes', 'Loading', 'Still loading. Slow connection?', 'Reload', 'too old to run Thebes']) expect([words, block.includes(words)]).toEqual([words, true]);
    expect(block.includes('<script nomodule>')).toBe(true);
    expect(block.includes('15000')).toBe(true);
    // no visible markup in the head (it would end the head early): the screen is built by the script
    expect(/<(div|p|button)[\s>]/.test(block.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, ''))).toBe(false);
    // inline, so nothing is fetched for it
    expect(/<script[^>]*\ssrc=/.test(block)).toBe(false);
  });
  it('paints the name and a quiet line at once, hides the slow line and Reload, and sets the fifteen second timer', async () => {
    const [main] = scriptsOf(between(await source('/index.html'), '<!-- v91 loading -->', '<!-- end v91 loading -->'));
    const p = page();
    p.run(main.code);
    const n = p.node();
    expect(n.parentNode).toBe(p.doc.body);
    const ps = n.getElementsByTagName('p'), button = n.getElementsByTagName('button')[0];
    expect(ps[0].textContent).toBe('Thebes');
    expect([ps[1].textContent, shown(ps[1])]).toEqual(['Loading', true]);
    expect([shown(ps[2]), shown(ps[3]), shown(ps[4]), shown(button)]).toEqual([false, false, false, false]);
    expect(p.timers.map((t) => t.ms)).toEqual([15000]);
    expect(n.getAttribute('role')).toBe('status');
  });
  it('after 15 s it says "Still loading. Slow connection?" and offers Reload, which reloads the page; not a moment sooner', async () => {
    const [main] = scriptsOf(between(await source('/index.html'), '<!-- v91 loading -->', '<!-- end v91 loading -->'));
    const p = page();
    p.run(main.code);
    p.advance(14999);
    const ps = p.node().getElementsByTagName('p'), button = p.node().getElementsByTagName('button')[0];
    expect([shown(ps[2]), shown(button)]).toEqual([false, false]);
    p.advance(1);
    expect([ps[2].textContent, shown(ps[2]), shown(button), button.textContent]).toEqual(['Still loading. Slow connection?', true, true, 'Reload']);
    button.onclick();
    expect(p.reloads.length).toBe(1);
  });
  it('done() removes the screen and the timer, and the timer firing late changes nothing; active() says so', async () => {
    const [main] = scriptsOf(between(await source('/index.html'), '<!-- v91 loading -->', '<!-- end v91 loading -->'));
    const p = page();
    p.run(main.code);
    const L = p.win.__v91Loading;
    expect(L.active()).toBe(true);
    L.done();
    expect([L.active(), p.node(), p.clock.cleared.length]).toEqual([false, null, 1]);
    p.advance(20000);
    L.slow();
    L.fail('late');
    expect(p.node()).toBe(null);
  });
  it('builds the screen when the body appears if the script runs before it (a head script does)', async () => {
    const [main] = scriptsOf(between(await source('/index.html'), '<!-- v91 loading -->', '<!-- end v91 loading -->'));
    const p = page({ body: false });
    p.run(main.code);
    expect(p.node()).toBe(null);
    expect(p.observers.length).toBe(1);
    p.doc.documentElement.appendChild(p.doc.createElement('body'));
    p.observers[0]();
    expect(p.node().parentNode).toBe(p.doc.body);
    expect(p.observers.length).toBe(0);
  });
  it('a browser that cannot run modules gets the too-old line and no Reload, and no "Loading" line', async () => {
    const block = between(await source('/index.html'), '<!-- v91 loading -->', '<!-- end v91 loading -->');
    const [main, old] = scriptsOf(block);
    expect(old.attrs.trim()).toBe('nomodule');
    const p = page();
    p.run(main.code);
    p.run(old.code);
    const ps = p.node().getElementsByTagName('p'), button = p.node().getElementsByTagName('button')[0];
    expect([ps[4].textContent, shown(ps[4]), shown(ps[1]), shown(button)]).toEqual(['This browser is too old to run Thebes. Try a current Safari, Chrome, Edge or Firefox.', true, false, false]);
    p.advance(20000);
    expect([shown(ps[2]), shown(button)]).toEqual([false, false]);   // the slow line adds nothing to it
  });
});

describe('v91 r loading: the early error line', () => {
  async function both() {
    const block = await source('/index.html');
    const [main] = scriptsOf(between(block, '<!-- v91 loading -->', '<!-- end v91 loading -->'));
    const [early] = scriptsOf(between(block, '<!-- v91 early-error -->', '<!-- end v91 early-error -->'));
    const p = page();
    p.run(main.code);
    p.run(early.code);
    const on = (type) => p.listeners.find((l) => l.type === type);
    return { p, on };
  }
  it('listens in the capture phase for errors (a failed script element\'s does not bubble) and for unhandled rejections', async () => {
    const { on } = await both();
    expect(on('error').capture).toBe(true);
    expect(typeof on('unhandledrejection').fn).toBe('function');
  });
  it('a script that fails to load, a syntax error and a start that throws are each said on the loading screen with Reload', async () => {
    const { p, on } = await both();
    const fail = () => p.node().getElementsByTagName('p')[3];
    const button = () => p.node().getElementsByTagName('button')[0];
    on('error').fn({ target: { tagName: 'SCRIPT' } });
    expect(fail().textContent).toBe('Thebes could not start (a file did not load). Check your connection, then Reload.');
    expect([shown(fail()), shown(button()), shown(p.node().getElementsByTagName('p')[1])]).toEqual([true, true, false]);
    button().onclick();
    expect(p.reloads.length).toBe(1);
    on('error').fn({ target: p.win, message: 'Unexpected token }' });
    expect(fail().textContent).toContain('Unexpected token }');
    on('unhandledrejection').fn({ reason: new Error('boot broke') });
    expect(fail().textContent).toContain('boot broke');
  });
  it('a failed picture or stylesheet is not a failed start, and after the title shows (done) it does nothing', async () => {
    const { p, on } = await both();
    on('error').fn({ target: { tagName: 'IMG' } });
    on('error').fn({ target: { tagName: 'LINK' } });
    expect(shown(p.node().getElementsByTagName('p')[3])).toBe(false);
    p.win.__v91Loading.done();
    on('error').fn({ target: { tagName: 'SCRIPT' } });
    on('unhandledrejection').fn({ reason: new Error('later') });
    expect(p.node()).toBe(null);
  });
  it('the browser\'s own notices are not a failed start: ResizeObserver, "Script error.", a cancelled share, a blocked sound, a rejection with no reason', async () => {
    const { p, on } = await both();
    const failShown = () => !p.node().getElementsByTagName('p')[3].hidden;
    on('error').fn({ target: p.win, message: 'ResizeObserver loop completed with undelivered notifications.' });
    on('error').fn({ target: p.win, message: 'Script error.' });
    on('unhandledrejection').fn({ reason: { name: 'AbortError', message: 'Share canceled' } });
    on('unhandledrejection').fn({ reason: { name: 'NotAllowedError', message: 'play() blocked' } });
    on('unhandledrejection').fn({ reason: undefined });
    expect(failShown()).toBe(false);
    on('error').fn({ target: p.win, message: 'Uncaught TypeError: x is not a function', error: new TypeError('x is not a function') });
    expect(failShown()).toBe(true);
  });
  it('a long message is cut, and the screen never shows more than the first 160 characters of it', async () => {
    const { p } = await both();
    p.win.__v91Loading.fail('x'.repeat(500));
    const line = p.node().getElementsByTagName('p')[3].textContent;
    expect(line.length).toBe('Thebes could not start (). Check your connection, then Reload.'.length + 160);
  });
});
