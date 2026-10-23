// Version 7.0 (Track 0): the interface seams Version 7.0 adds, made in track order once a game by createUI (src/ui/createUI.js), after
// Version 6.0's. Each has the shape of src/ui/s46/seam.js (sheets, sheetParts building/house/actions/summary, onEvents, refresh,
// onAlertAction, onCommand, destroy) and starts as seamBase(); a track fills in only its own file here, never this one or createUI.
import { createTradeUi } from './trade.js';
import { createCityEventsUi } from './cityEvents.js';
import { createSeasonsUi } from './seasons.js';
import { createAdviceFixUi } from './adviceFixes.js';

export const createV70Seams = (ctx) => [createTradeUi(ctx), createCityEventsUi(ctx), createSeasonsUi(ctx), createAdviceFixUi(ctx)];
