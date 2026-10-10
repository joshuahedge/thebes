// Service worker registration and the update flow (spec 6.3, 7.1). A new worker that finishes installing
// while an old one controls the page is "waiting": the interface offers a restart, which saves (and stops if that fails), tells
// the worker to take over, and reloads once it has.
import { SW_PATH } from './data/ui.js';

export async function registerServiceWorker({ sw, path = SW_PATH, onWaiting = () => {} }) {
  if (!sw || typeof sw.register !== 'function') return null;
  let reg;
  try { reg = await sw.register(path, { updateViaCache: 'none' }); } catch (e) { console.warn('Thebes: the service worker was not registered:', e); return null; }
  const offer = () => { if (reg.waiting && sw.controller) onWaiting(reg.waiting); };   // no controller: a first install, not an update
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => { if (worker.state === 'installed') offer(); });
  });
  offer();
  return reg;
}

export async function applyUpdate(worker, sw, { save = async () => true, reload = () => location.reload() } = {}) {
  if ((await save()) === false) return false;          // a failed save keeps the update waiting
  let done = false;
  sw.addEventListener('controllerchange', () => { if (!done) { done = true; reload(); } });
  worker.postMessage('skipWaiting');
  return true;
}
