// The title card (spec 4.1): Continue, New city, Play with sound / Play muted and Install over a paused,
// slowly drifting sample city. The backdrop only moves the camera; the sim behind it never ticks.
import { TITLE_DRIFT_MS } from '../data/ui.js';
import { el, button, clear } from './components.js';
import { T } from './text.js';

export function createTitleCard({ container, hasSave, canInstall = false, sound = false, message = null, onContinue, onNewCity, onSound, onInstall = () => {} }) {
  let on = Boolean(sound);
  const soundButton = button(on ? T.playMuted : T.playWithSound, { class: 'sound' });
  soundButton.addEventListener('click', () => { on = !on; soundButton.textContent = on ? T.playMuted : T.playWithSound; onSound(on); });
  const buttons = [];
  if (hasSave) buttons.push(button(T.continueGame, { class: 'continue primary', onClick: onContinue }));
  buttons.push(button(T.newCity, { class: hasSave ? 'new-city' : 'new-city primary', onClick: onNewCity }));
  buttons.push(soundButton);
  if (canInstall) buttons.push(button(T.install, { class: 'install', onClick: onInstall }));
  const element = el('div', { class: 'title-card', role: 'dialog', 'aria-labelledby': 'title-name' }, [
    el('h1', { id: 'title-name', text: 'Thebes' }),
    el('p', { class: 'tagline muted', text: T.tagline }),
    message ? el('p', { class: 'message coral', text: message }) : null,
    el('div', { class: 'title-buttons' }, buttons),
  ]);
  clear(container);
  container.append(element);
  container.hidden = false;
  buttons[0].focus();
  return { element, destroy() { clear(container); container.hidden = true; } };
}

// Four points around the sample city's centre; the camera drifts from one to the next.
export function driftPoints(world) {
  const cx = world.tradeEntry.x, cy = world.size - 22;
  const clamp = (v) => Math.max(0, Math.min(world.size - 1, v));
  return [[cx - 4, cy - 3], [cx + 4, cy], [cx, cy + 4], [cx - 3, cy + 1]].map(([x, y]) => [clamp(x), clamp(y)]);
}

export function createBackdrop({ world, cam, cameraControl, reducedMotion = () => false, driftMs = TITLE_DRIFT_MS }) {
  const points = driftPoints(world);
  let i = 0, nextAt = null, stopped = false;
  cameraControl.jumpTo(points[0][0], points[0][1]);
  return {
    points,
    tick(now) {
      if (stopped || reducedMotion()) return;          // reduced motion: the view stays still (spec 5.4)
      if (nextAt !== null && now < nextAt) return;
      i = (i + 1) % points.length;
      cameraControl.panTo(points[i][0], points[i][1], driftMs);
      nextAt = now + driftMs;
    },
    stop() { stopped = true; cameraControl.cancel(); },
  };
}
