import { describe, it, expect } from '../harness.js';
import { registerServiceWorker, applyUpdate } from '../../src/pwa.js';
import { APP_VERSION } from '../../src/data/ui.js';
import { T } from '../../src/ui/text.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire } from '../helpers/dom.js';

// Evaluates the generated list the way the worker does: a classic script that assigns to `self`.
async function swFiles() {
  const src = await (await fetch('/sw-files.js')).text();
  const self = {};
  new Function('self', src)(self);
  return self;
}
const resolveImport = (from, spec) => { const parts = from.split('/'); parts.pop(); for (const p of spec.split('/')) { if (p === '..') parts.pop(); else if (p !== '.') parts.push(p); } return parts.join('/'); };

function fakeSw({ controlled = true } = {}) {
  const listeners = {};
  const reg = { waiting: null, installing: null, listeners: {}, addEventListener(t, fn) { (reg.listeners[t] = reg.listeners[t] || []).push(fn); } };
  const sw = {
    controller: controlled ? {} : null, registered: [],
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    async register(p, options) { sw.registered.push([p, options]); return reg; },
    fire(t) { for (const fn of listeners[t] || []) fn(); },
  };
  return { sw, reg, fireReg: (t) => { for (const fn of reg.listeners[t] || []) fn(); } };
}
const fakeWorker = () => { const w = { state: 'installing', posted: [], listeners: {}, addEventListener(t, fn) { (w.listeners[t] = w.listeners[t] || []).push(fn); }, postMessage(m) { w.posted.push(m); }, fire(t) { for (const fn of w.listeners[t] || []) fn(); } }; return w; };

describe('ui pwa', () => {
  it('lists every file the game needs, each one served, and every import inside src resolves to a listed file', async () => {
    const { THEBES_FILES: files, THEBES_VERSION: version, THEBES_BUILD: build } = await swFiles();
    expect(version).toBe(APP_VERSION);
    expect(/^[0-9a-f]{12}$/.test(build)).toBe(true);
    const chunks = [];
    for (const f of files.filter((x) => x !== './')) chunks.push(new Uint8Array(await (await fetch(f.slice(1))).arrayBuffer()));
    const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let at = 0;
    for (const c of chunks) { all.set(c, at); at += c.length; }
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-1', all))].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(digest.slice(0, 12)).toBe(build);                                   // a stale list fails: rerun tools/sw-files.ps1
    for (const must of ['./', './index.html', './manifest.webmanifest', './css/ui.css', './src/main.js', './src/boot.js', './src/ui/createUI.js', './icons/icon-192.png', './icons/icon-512-maskable.png']) expect(files).toContain(must);
    expect(files.includes('./sw.js')).toBe(false);
    expect(files.includes('./og-image.png')).toBe(false);
    expect(files.some((f) => f.startsWith('./tests/') || f.startsWith('./tools/'))).toBe(false);
    for (const f of files) {
      expect(f.startsWith('./')).toBe(true);
      expect((await fetch(f.slice(1))).status).toBe(200);
    }
    const listed = new Set(files);
    for (const f of files.filter((x) => x.startsWith('./src/') && x.endsWith('.js'))) {
      const src = await (await fetch(f.slice(1))).text();
      for (const m of src.matchAll(/from\s+'([^']+)'/g)) expect([f, m[1], listed.has(resolveImport(f, m[1]))]).toEqual([f, m[1], true]);
    }
  });
  it('ships a manifest, the head tags and a worker that caches the list and honours skipWaiting', async () => {
    const r = await fetch('/manifest.webmanifest');
    expect(r.status).toBe(200);
    const m = await r.json();
    expect([m.name, m.short_name, m.start_url, m.scope, m.display, m.background_color, m.theme_color]).toEqual(['Thebes', 'Thebes', './', './', 'standalone', '#DCC9A0', '#F3E7CB']);
    expect(m.icons.map((i) => [i.src, i.sizes, i.type, i.purpose || 'any'])).toEqual([['icons/icon-192.png', '192x192', 'image/png', 'any'], ['icons/icon-512.png', '512x512', 'image/png', 'any'], ['icons/icon-512-maskable.png', '512x512', 'image/png', 'maskable']]);
    for (const i of m.icons) expect((await fetch(`/${i.src}`)).status).toBe(200);
    const html = await (await fetch('/index.html')).text();
    for (const needle of ['rel="manifest" href="./manifest.webmanifest"', 'rel="apple-touch-icon" href="./icons/apple-touch-icon.png"', 'rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png"', 'name="theme-color" content="#F3E7CB"', 'property="og:title" content="Thebes"', 'property="og:description"', 'property="og:image" content="https://joshuahedge.github.io/thebes/og-image.png"', 'name="apple-mobile-web-app-capable" content="yes"', 'name="description"']) expect([needle, html.includes(needle)]).toEqual([needle, true]);
    expect(/href="\/|src="\//.test(html)).toBe(false);                          // every path relative, for /thebes/
    const sw = await (await fetch('/sw.js')).text();
    expect(sw).toContain("importScripts('./sw-files.js')");
    expect(sw).toContain('skipWaiting');
    expect(sw).toContain('THEBES_FILES');
    expect(sw).toContain('ignoreSearch');
    expect(sw).toContain("cache: 'reload'");                                    // the precache skips the HTTP cache (Pages max-age)
    expect(/clients\.claim\(\)/.test(sw)).toBe(true);
  });
  it('registers the worker, offers a waiting one only when the page is controlled, and the restart saves then reloads', async () => {
    const { sw, reg, fireReg } = fakeSw();
    const offered = [];
    expect(await registerServiceWorker({ sw, path: './sw.js', onWaiting: (w) => offered.push(w) })).toBe(reg);
    expect(sw.registered).toEqual([['./sw.js', { updateViaCache: 'none' }]]);
    expect(offered).toEqual([]);
    const worker = fakeWorker();
    reg.installing = worker;
    fireReg('updatefound');
    worker.state = 'installed'; reg.waiting = worker; reg.installing = null;
    worker.fire('statechange');
    expect(offered).toEqual([worker]);
    const log = [];
    await applyUpdate(worker, sw, { save: async () => { log.push('save'); return true; }, reload: () => log.push('reload') });
    expect(log).toEqual(['save']);
    expect(worker.posted).toEqual(['skipWaiting']);
    const waiting = fakeWorker();
    const failed = fakeSw();
    expect(await applyUpdate(waiting, failed.sw, { save: async () => false, reload: () => log.push('reload?') })).toBe(false);
    expect(waiting.posted).toEqual([]);                                        // a failed save keeps the update waiting
    failed.sw.fire('controllerchange');
    expect(log).toEqual(['save']);
    sw.fire('controllerchange'); sw.fire('controllerchange');
    expect(log).toEqual(['save', 'reload']);                                   // once
    const already = fakeSw();
    already.reg.waiting = fakeWorker();
    const got = [];
    await registerServiceWorker({ sw: already.sw, onWaiting: (w) => got.push(w) });
    expect(got).toEqual([already.reg.waiting]);                                // waiting since before this page loaded
    const first = fakeSw({ controlled: false });
    first.reg.waiting = fakeWorker();
    const none = [];
    await registerServiceWorker({ sw: first.sw, onWaiting: (w) => none.push(w) });
    expect(none).toEqual([]);                                                  // the first install is not an update
    expect(await registerServiceWorker({ sw: null })).toBe(null);
    expect(await registerServiceWorker({ sw: { register: async () => { throw new Error('insecure'); } } })).toBe(null);
  });
  it('shows the Update ready toast only when no tool is active, and Restart runs the update', async () => {
    const r = await rigUI();
    const applied = [];
    fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');
    fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');
    expect(r.store.get().mode).toBe('placing');
    r.ui.offerUpdate(() => applied.push(1));
    expect(r.root.querySelector('#toasts .toast')).toBe(null);                 // not during a placement (spec 6.3)
    fire(r.root.querySelector('#confirm .cancel'), 'click');
    const toast = r.root.querySelector('#toasts .toast');
    expect(toast.textContent).toContain(T.updateReady);
    expect(toast.querySelector('button').textContent).toBe(T.restart);
    fire(toast.querySelector('button'), 'click');
    expect(applied).toEqual([1]);
    expect(r.root.querySelector('#toasts .toast')).toBe(null);
    r.cleanup();
  });
  it('says so when Restart cannot save, and offers the update again at the next browse moment', async () => {
    const r = await rigUI();
    let ok = false, runs = 0;
    r.ui.offerUpdate(async () => { runs++; return ok; });
    fire(r.root.querySelector('#toasts .toast button'), 'click');
    await new Promise((res) => setTimeout(res, 0));
    expect(runs).toBe(1);
    expect(r.root.querySelector('#toasts .toast').textContent).toContain(T.updateSaveFailed);
    expect(r.root.querySelector('#toasts .toast button')).toBe(null);          // the failure line has no Restart
    fire(r.root.querySelector('#dock .cat[data-category="services"]'), 'click');  // a tool starts and ends: the offer returns
    fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');
    fire(r.root.querySelector('#confirm .cancel'), 'click');
    const again = [...r.root.querySelectorAll('#toasts .toast')].find((t) => t.textContent.includes(T.updateReady));
    expect(Boolean(again)).toBe(true);
    ok = true;
    fire(again.querySelector('button'), 'click');
    await new Promise((res) => setTimeout(res, 0));
    expect(runs).toBe(2);
    expect([...r.root.querySelectorAll('#toasts .toast')].some((t) => t.textContent.includes(T.updateReady))).toBe(false);
    r.cleanup();
  });
});
