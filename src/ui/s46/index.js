// Stage 4.6 (Track 0): every track's interface seam, made in track order. createUI (src/ui/createUI.js) calls createS46Seams once a
// game, after the Stage 3 and 4 seams, and treats each like danger, scoreUi and monumentUi: their sheets join the custom sheets, their
// sheet parts the sheets' parts, and every event, refresh, alert action, command and destroy reaches each. A track edits only its own
// file here, never this one or createUI.
import { createMapUi } from './map.js';
import { createRiverUi } from './river.js';
import { createCourtUi } from './court.js';
import { createArmiesUi } from './armies.js';
import { createWondersUi } from './wonders.js';
import { createUxUi } from './ux.js';

export const createS46Seams = (ctx) => [createMapUi(ctx), createRiverUi(ctx), createCourtUi(ctx), createArmiesUi(ctx), createWondersUi(ctx), createUxUi(ctx)];
