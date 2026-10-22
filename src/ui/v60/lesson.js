// Version 6.0, Track D2: the lesson's in-game part (each step's light, dimming and instruction in the guidance row). The seam
// (src/ui/s46/seam.js shape); Track D2 owns this file (and src/ui/lesson.js, the title's offer).
import { seamBase } from '../s46/seam.js';

export const createLessonUi = (ctx) => seamBase();   // ctx: createUI's seam context (seamCtx), for the track to use
