// Version 6.0 (Track 0): the interface seams Version 6.0 adds, made in track order once a game by createUI (src/ui/createUI.js), after
// the Stage 4.6 and 4.7 seams. Each has the shape of src/ui/s46/seam.js (sheets, sheetParts, onEvents, refresh, onAlertAction, onCommand,
// destroy) and starts as seamBase(); a track fills in only its own file here, never this one or createUI.
import { createReignUi } from './reign.js';
import { createHazardsUi } from './hazards.js';
import { createLargePlotUi } from './largePlot.js';
import { createBattleUi } from './battle.js';
import { createLessonUi } from './lesson.js';

export const createV60Seams = (ctx) => [createReignUi(ctx), createHazardsUi(ctx), createLargePlotUi(ctx), createBattleUi(ctx), createLessonUi(ctx)];
