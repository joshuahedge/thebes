// Dev-only controls for dev.html. Stage 1c builds the real input layer (gestures, mouse, keyboard) and
// deletes this file.
import { panBy, zoomAt } from '../render/camera.js';
import { setSpeed } from '../sim/commands.js';
import { OVERLAYS } from '../render/overlays.js';

export function attachDevControls({ canvas, cam, world, state, view }) {
  const step = 40;
  const centre = () => { const v = view(); return [v, v.width / 2, v.height / 2]; };
  const keys = (e) => {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': panBy(cam, step, 0); break;
      case 'ArrowRight': case 'd': case 'D': panBy(cam, -step, 0); break;
      case 'ArrowUp': case 'w': case 'W': panBy(cam, 0, step); break;
      case 'ArrowDown': case 's': case 'S': panBy(cam, 0, -step); break;
      case '+': case '=': { const [v, cx, cy] = centre(); zoomAt(cam, v, 1.25, cx, cy); break; }
      case '-': case '_': { const [v, cx, cy] = centre(); zoomAt(cam, v, 0.8, cx, cy); break; }
      case '0': case '1': case '2': case '3': setSpeed(world, Number(e.key)); break;
      case 'o': case 'O': {
        const i = OVERLAYS.indexOf(state.overlay);
        state.overlay = i + 1 < OVERLAYS.length ? OVERLAYS[i + 1] : null;
        break;
      }
      case 'g': case 'G': state.grid = !state.grid; break;
      case 'r': case 'R': {
        const url = new URL(location.href);
        url.searchParams.set('seed', String((world.seed % 100000) + 1));
        location.href = url.href;
        break;
      }
      default: return;
    }
    e.preventDefault();
  };
  let drag = null;
  const down = (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); };
  const move = (e) => {
    if (!drag) return;
    panBy(cam, e.clientX - drag.x, e.clientY - drag.y);
    drag = { x: e.clientX, y: e.clientY };
  };
  const up = () => { drag = null; };
  const wheel = (e) => { zoomAt(cam, view(), e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY); e.preventDefault(); };
  window.addEventListener('keydown', keys);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false });
  return () => {
    window.removeEventListener('keydown', keys);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('wheel', wheel);
  };
}
