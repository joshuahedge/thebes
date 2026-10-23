// Version 6.0, Track D2's dev scene (src/dev/v60/index.js joins it): the guided first city at a step. Open any page (the lesson is its own city; ?nosw=1 on the
// title, or /?skipTitle=1&nosw=1&seed=11&sample=1 in a game). The scene starts the lesson through the page's own hook (hooks.lesson, which lays the steps before the
// one asked for with the scripted walk-through, src/sim/lesson.js replayTo), so what a shot shows is what a player resuming there sees.
// options:
//   step     a step's index or id (default: where the device's lesson stands, else the first); 'end' (or the number of steps) is the finished lesson with its sheet
//   warned   a day is run (the lesson's tower step stages the raid clock; the first warning is raised the next day), so the raid warning is up
//   motion   'gentle' | 'full' | 'still'
//   size     'phone' (default; nothing), or a note only
//   quick    no settling wait
import { LESSON_STEPS } from '../../data/lesson.js';
import { LESSON_LENGTH } from '../../sim/lesson.js';
import { lessonDue } from '../../ui/lesson.js';
import { tickDay } from '../../sim/clock.js';
import { wait } from './base.js';

const indexOf = (step) => {
  if (step === 'end') return LESSON_LENGTH;
  if (Number.isInteger(step)) return Math.max(0, Math.min(step, LESSON_LENGTH));
  const i = LESSON_STEPS.findIndex((s) => s.id === step);
  return i >= 0 ? i : null;
};

export async function lessonScene(api, options = {}) {
  if (!api || !api.hooks || typeof api.hooks.lesson !== 'function') throw new Error('devScene v60-lesson: this page has no lesson hook');
  const from = options.step === undefined ? null : indexOf(options.step);
  if (options.step !== undefined && from === null) throw new Error(`devScene v60-lesson: no step named ${options.step} (${LESSON_STEPS.map((s) => s.id).join(', ')})`);
  if (options.motion) {
    const t = typeof window !== 'undefined' ? window.__thebes : null;
    if (t && typeof t.setMotion === 'function') t.setMotion(options.motion);
  }
  api.hooks.lesson(from === null ? {} : { step: from });
  const g = api.game();
  if (!g || !g.ui) throw new Error('devScene v60-lesson: the lesson did not start');
  if (options.warned) {
    const events = [];
    tickDay(g.world, events);
    g.ui.onEvents(events);
    g.ui.refresh();
  }
  if (!options.quick) await wait(300);
  const s = g.ui.settings.get();
  const row = document.querySelector('#lesson');
  const at = row && row.dataset.step ? row.dataset.step : null;
  return `v60-lesson: ${s.lessonDone ? 'done' : `step ${s.lessonStep}`}, at ${at}, row "${row ? row.querySelector('.text').textContent : ''}", due on a fresh device: ${lessonDue({ lessonDone: false, lessonStep: 0 }, false)}`;
}
