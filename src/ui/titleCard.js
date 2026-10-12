// The title card (spec 4.1): Continue, New city with its difficulty under it (spec 4.18), Play with sound / Play muted
// and Install over a paused, slowly drifting sample city. The backdrop only moves the camera; the sim behind it never ticks.
import { TITLE_DRIFT_MS } from '../data/ui.js';
import { DIFFICULTY_ORDER } from '../data/difficulty.js';
import { el, button, clear } from './components.js';
import { T, DIFFICULTY_NAMES, difficultyHint, CARDS4_TEXT } from './text.js';

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

// decorate (Stage 3): called once with (element, { buttonBox, newCity }) after the card is built, so the score interface
// adds the records, stamps, This week's Nile and a shared score (src/ui/scoreUi.js titleDecor) without editing this file.
// onHowToPlay (Stage 4, Track G, spec 4.1): How to play, before Play with sound, shows the picture cards (boot.js passes
// hooks.pictureCards); no button without it.
export function createTitleCard({ container, hasSave, canInstall = false, canBring = false, sound = false, difficulty = 'normal', message = null, onContinue, onNewCity, onSound, onDifficulty = () => {}, onInstall = () => {}, onBring = () => {}, decorate = null, onHowToPlay = null }) {
  let on = Boolean(sound);
  const soundButton = button(on ? T.playMuted : T.playWithSound, { class: 'sound' });
  soundButton.addEventListener('click', () => { on = !on; soundButton.textContent = on ? T.playMuted : T.playWithSound; onSound(on); });
  const install = button(T.install, { class: 'install', hidden: !canInstall, onClick: onInstall });
  const newCity = button(T.newCity, { class: hasSave ? 'new-city' : 'new-city primary', onClick: onNewCity });
  const buttons = [];
  if (hasSave) buttons.push(button(T.continueGame, { class: 'continue primary', onClick: onContinue }));
  buttons.push(newCity);
  if (canBring) buttons.push(button(T.bringCity, { class: 'bring', onClick: onBring }));
  if (typeof onHowToPlay === 'function') buttons.push(button(CARDS4_TEXT.howToPlay, { class: 'how-to-play', onClick: () => onHowToPlay() }));
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
  if (typeof decorate === 'function') decorate(element, { buttonBox, newCity });
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

// Stage 4 (spec 5.4, ruling 247, Track E): the backdrop drifts under Full only. reducedMotion() is boot's
// settings.reducedMotion ("anything but Full"), so under Gentle and Still the view holds still, and a drift under way when
// the level leaves Full (the device's setting changed, read live) stops where it is at once; it starts again from the
// next point when Full comes back.
export function createBackdrop({ world, cam, cameraControl, reducedMotion = () => false, driftMs = TITLE_DRIFT_MS }) {
  const points = driftPoints(world);
  let i = 0, nextAt = null, stopped = false;
  cameraControl.jumpTo(points[0][0], points[0][1]);
  return {
    points,
    tick(now) {
      if (stopped) return;
      if (reducedMotion()) {                           // Gentle or Still: the view stays still (spec 5.4)
        if (nextAt !== null) { cameraControl.cancel(); nextAt = null; }
        return;
      }
      if (nextAt !== null && now < nextAt) return;
      i = (i + 1) % points.length;
      cameraControl.panTo(points[i][0], points[i][1], driftMs);
      nextAt = now + driftMs;
    },
    stop() { stopped = true; cameraControl.cancel(); },
  };
}
