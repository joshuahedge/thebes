// The title card (spec 4.1): Continue, New city with its difficulty under it (spec 4.18), Play with sound / Play muted
// and Install over a paused, slowly drifting sample city. The backdrop only moves the camera; the sim behind it never ticks.
import { TITLE_DRIFT_MS } from '../data/ui.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
import { el, button, clear } from './components.js';
import { T, DIFFICULTY_NAMES, difficultyHint } from './text.js';

// Relaxed, Normal or Hard for the next new city: three pressed-state buttons with the chosen level's line under them.
// Choosing one tells onChoose (boot.js keeps it in settings.difficulty), so the last one used is chosen next time.
function difficultyRow(initial, onChoose) {
  let level = DIFFICULTY_ORDER.includes(initial) ? initial : 'normal';
  const hint = el('p', { class: 'difficulty-hint small muted', id: 'title-difficulty-hint' });
  const choices = DIFFICULTY_ORDER.map((d) => button(DIFFICULTY_NAMES[d], { class: 'choice difficulty', dataset: { value: d }, 'aria-describedby': 'title-difficulty-hint' }));
  const sync = () => { for (const b of choices) b.setAttribute('aria-pressed', String(b.dataset.value === level)); hint.textContent = difficultyHint(level); };
  for (const b of choices) b.addEventListener('click', () => { level = b.dataset.value; sync(); onChoose(level); });
  sync();
  return el('div', { class: 'title-difficulty' }, [
    el('span', { class: 'label small', 'aria-hidden': 'true', text: T.difficulty }),
    el('div', { class: 'choices', role: 'group', 'aria-label': T.difficultyForNewCities }, choices),
    hint,
  ]);
}

export function createTitleCard({ container, hasSave, canInstall = false, canBring = false, sound = false, difficulty = 'normal', message = null, onContinue, onNewCity, onSound, onDifficulty = () => {}, onInstall = () => {}, onBring = () => {} }) {
  let on = Boolean(sound);
  const soundButton = button(on ? T.playMuted : T.playWithSound, { class: 'sound' });
  soundButton.addEventListener('click', () => { on = !on; soundButton.textContent = on ? T.playMuted : T.playWithSound; onSound(on); });
  const install = button(T.install, { class: 'install', hidden: !canInstall, onClick: onInstall });
  const newCity = button(T.newCity, { class: hasSave ? 'new-city' : 'new-city primary', onClick: onNewCity });
  const buttons = [];
  if (hasSave) buttons.push(button(T.continueGame, { class: 'continue primary', onClick: onContinue }));
  buttons.push(newCity);
  if (canBring) buttons.push(button(T.bringCity, { class: 'bring', onClick: onBring }));
  buttons.push(soundButton, install);
  const levels = difficultyRow(difficulty, onDifficulty);
  const buttonBox = el('div', { class: 'title-buttons' }, buttons.flatMap((b) => (b === newCity ? [b, levels] : [b])));   // the choice sits under New city
  const element = el('div', { class: 'title-card', role: 'dialog', 'aria-labelledby': 'title-name' }, [
    el('h1', { id: 'title-name', text: 'Thebes' }),
    el('p', { class: 'tagline muted', text: T.tagline }),
    message ? el('p', { class: 'message coral', text: message }) : null,
    buttonBox,
  ]);
  let guide = null;
  const showPanelNode = (children) => { guide = el('div', { class: 'guide' }, children); buttonBox.hidden = true; element.append(guide); };
  const showCard = () => { if (guide) { guide.remove(); guide = null; } buttonBox.hidden = false; buttons[0].focus(); };
  clear(container);
  container.append(element);
  container.hidden = false;
  buttons[0].focus();
  return {
    element,
    setCanInstall(flag) { install.hidden = !flag; },
    // The install guide takes the buttons' place until Back (iOS, or a browser without the install prompt).
    showGuide(render) {
      showCard();
      const body = el('div', { class: 'guide-body' });
      render(body);
      const back = button(T.back, { class: 'guide-back', onClick: showCard });
      showPanelNode([body, el('div', { class: 'actions' }, [back])]);
      back.focus();
    },
    // A panel with its own buttons (the new-city confirmation): render(body, back) fills it and wires Back itself.
    showPanel(render) {
      showCard();
      const body = el('div', { class: 'guide-body' });
      render(body, showCard);
      showPanelNode([body]);
      const first = body.querySelector('button');
      if (first) first.focus();
    },
    // The line under the tagline: save and import problems the player needs to see on the title.
    setMessage(text) {
      let node = element.querySelector('.message');
      if (!node) { node = el('p', { class: 'message coral' }); element.insertBefore(node, buttonBox); }
      node.textContent = text || '';
      node.hidden = !text;
    },
    showCard,
    destroy() { clear(container); container.hidden = true; },
  };
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
