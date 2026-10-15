// Stage 4.7: the interface seams Stage 4.7 adds, made in order once a game by createUI (src/ui/createUI.js), after the Stage 4.6 tracks' seams. Each has the shape of
// src/ui/s46/seam.js.
import { createCartsUi } from './carts.js';
import { createPressureUi } from './pressure.js';

export const createS47Seams = (ctx) => [createCartsUi(ctx), createPressureUi(ctx)];   // Task 7: the late-game pressure's captions, tips and house row
