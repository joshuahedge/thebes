// Version 6.0, Track D2's dev scene (src/dev/v60/index.js joins it): the guided first city. Track 0 left a minimal one (the open city
// and the device's lesson state); Track D2 owns this file and replaces it with the lesson at a step (options.step).
import { lessonDue } from '../../ui/lesson.js';
import { inGame, wait } from './base.js';

export async function lessonScene(api, options = {}) {
  const g = inGame(api, 'v60-lesson');
  if (!options.quick) await wait(100);
  const s = g.ui.settings.get();
  return `v60-lesson: lesson ${s.lessonDone ? 'done' : `at step ${s.lessonStep}`}, due on a device without a city: ${lessonDue(s, false)}`;
}
