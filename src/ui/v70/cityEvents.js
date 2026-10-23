// Version 7.0, Track E: the interface of city events (rulings 900-929), the seam (src/ui/s46/seam.js shape) createV70Seams makes once a
// game. Track E fills it: the event card (sheets: a bottom sheet on a phone, the side panel on desktop; at most three choices, each with its
// exact consequence before the tap; fits without scrolling at 390x844 and 100% text), opened from the alert row's entry (onAlertAction);
// the outcome's caption (onEvents); the first-moment picture card. Track E owns this file.
import { seamBase } from '../s46/seam.js';

export const createCityEventsUi = () => seamBase();
