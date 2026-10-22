// Version 6.0, Track B2: the interface of battles you can see (the victory or defeat moment in the alert row, never over the middle of the
// map). The seam (src/ui/s46/seam.js shape); Track B2 owns this file.
import { seamBase } from '../s46/seam.js';

export const createBattleUi = (ctx) => seamBase();   // ctx: createUI's seam context (seamCtx), for the track to use
